#!/usr/bin/env python3
"""
Minimal Web UI for LLM-Driven CV Generator

Serves a single-page web app with endpoints to:
- Submit a job description
- Send chat messages to the assistant
- View current state
- Save session

Run:
    python scripts/web_app.py --llm-provider github

Then open http://localhost:5000
"""

import argparse
import sys
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

from flask import Flask, jsonify, request, send_file
import requests
from urllib.parse import urlparse
import re
from bs4 import BeautifulSoup

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Ensure scripts are importable
sys.path.insert(0, str(Path(__file__).parent))

from utils.config import get_config
from utils.llm_client import get_llm_provider
from utils.cv_orchestrator import CVOrchestrator
from utils.conversation_manager import ConversationManager
from utils.copilot_auth import CopilotAuthManager


def create_app(args) -> Flask:
    app = Flask(__name__, static_folder=None)

    # Copilot OAuth auth manager (shared across all requests)
    auth_manager = CopilotAuthManager()
    _auth_poll: dict = {"polling": False, "error": None, "device_code": None, "interval": 5}

    # Initialize dependencies
    llm_client = get_llm_provider(provider=args.llm_provider, model=args.model, auth_manager=auth_manager)
    orchestrator = CVOrchestrator(
        master_data_path=args.master_data,
        publications_path=args.publications,
        output_dir=args.output_dir,
        llm_client=llm_client,
    )
    conversation = ConversationManager(orchestrator=orchestrator, llm_client=llm_client)

    # Preload job description if provided
    if args.job_file:
        job_file_path = Path(args.job_file)
        if job_file_path.exists():
            job_text = job_file_path.read_text(encoding="utf-8")
            conversation.add_job_description(job_text)
            # Extract position name from filename (remove date suffix and extension)
            position_name = job_file_path.stem
            # Remove date pattern like _2026-01-14 from end
            import re
            position_name = re.sub(r'_\d{4}-\d{2}-\d{2}$', '', position_name)
            conversation.state["position_name"] = position_name
            print(f"✓ Position name set to: {position_name}")
            
            # Try to load the most recent session for this position
            try:
                loaded = conversation._load_latest_session_for_position(position_name)
                if loaded:
                    print(f"✓ Restored previous session for: {position_name}")
                else:
                    # No existing session, add placeholder to conversation history
                    conversation.conversation_history.append({
                        "role": "system",
                        "content": f"Job description loaded: {job_text.split(chr(10))[0]} at {job_text.split(chr(10))[1] if len(job_text.split(chr(10))) > 1 else 'Company'}",
                    })
            except Exception as e:
                print(f"⚠ Could not load previous session: {e}")
                # Add placeholder to conversation history
                conversation.conversation_history.append({
                    "role": "system",
                    "content": f"Job description loaded: {job_text.split(chr(10))[0]} at {job_text.split(chr(10))[1] if len(job_text.split(chr(10))) > 1 else 'Company'}",
                })

    @app.get("/")
    def index():
        page_path = Path(__file__).parent.parent / "web" / "index.html"
        return send_file(page_path)

    @app.get("/logo")
    def logo():
        # Serve white on transparent logo from web/media
        logo_path = Path(__file__).parent.parent / "web" / "media" / "logo_white_transparent.png"
        if logo_path.exists():
            return send_file(logo_path)
        else:
            # Return 404 if logo not found
            return "", 404

    @app.get("/api/status")
    def status():
        # Get all experience IDs from master data
        all_experience_ids = []
        all_skills = []
        if orchestrator and orchestrator.master_data:
            experiences = orchestrator.master_data.get('experience', [])
            all_experience_ids = [exp.get('id') for exp in experiences if exp.get('id')]
            
            # Get all skills - handle both list and dict formats
            skills_data = orchestrator.master_data.get('skills', [])
            if isinstance(skills_data, dict):
                # If skills is a dict with categories, extract skills from each category
                for category_data in skills_data.values():
                    if isinstance(category_data, dict) and 'skills' in category_data:
                        # Each category has {'category': name, 'skills': [list of skills]}
                        category_skills = category_data.get('skills', [])
                        if isinstance(category_skills, list):
                            all_skills.extend(category_skills)
                    elif isinstance(category_data, list):
                        # Handle legacy format where category_data is directly a list
                        all_skills.extend(category_data)
            elif isinstance(skills_data, list):
                all_skills = skills_data
        return jsonify({
            "position_name": conversation.state.get("position_name"),
            "phase": conversation.state.get("phase"),
            "job_description": bool(conversation.state.get("job_description")),
            "job_description_text": conversation.state.get("job_description"),
            "job_analysis": conversation.state.get("job_analysis"),  # Return full data, not just bool
            "customizations": conversation.state.get("customizations"),  # Return full data, not just bool
            "generated_files": conversation.state.get("generated_files"),
            "all_experience_ids": all_experience_ids,  # Add all experience IDs
            "all_skills": all_skills,  # Add all skills
            "copilot_auth": auth_manager.status,
        })

    # ── Copilot OAuth endpoints ──────────────────────────────────────────────

    @app.post("/api/copilot-auth/start")
    def copilot_auth_start():
        """Begin Device Flow: returns user_code + verification_uri for the user to open."""
        try:
            flow = auth_manager.start_device_flow()
            _auth_poll["device_code"] = flow["device_code"]
            _auth_poll["interval"]    = flow.get("interval", 5)
            _auth_poll["error"]       = None
            return jsonify({
                "user_code":        flow["user_code"],
                "verification_uri": flow["verification_uri"],
                "interval":         flow.get("interval", 5),
                "expires_in":       flow.get("expires_in", 900),
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/copilot-auth/poll")
    def copilot_auth_poll():
        """Start a background thread that polls GitHub until the user approves the device flow."""
        import threading
        if _auth_poll["polling"]:
            return jsonify({"ok": True, "message": "Already polling"})
        device_code = _auth_poll.get("device_code")
        interval    = _auth_poll.get("interval", 5)
        if not device_code:
            return jsonify({"error": "No device flow in progress — call /start first"}), 400

        def _do_poll():
            _auth_poll["polling"] = True
            _auth_poll["error"]   = None
            try:
                auth_manager.complete_device_flow(device_code, interval)
            except Exception as exc:
                _auth_poll["error"] = str(exc)
            finally:
                _auth_poll["polling"] = False

        threading.Thread(target=_do_poll, daemon=True).start()
        return jsonify({"ok": True})

    @app.get("/api/copilot-auth/status")
    def copilot_auth_status():
        """Return current auth state (authenticated, polling, error)."""
        return jsonify({
            **auth_manager.status,
            "polling": _auth_poll["polling"],
            "error":   _auth_poll["error"],
        })

    @app.post("/api/copilot-auth/logout")
    def copilot_auth_logout():
        """Clear stored credentials."""
        auth_manager.logout()
        return jsonify({"ok": True})

    # ── Job / chat endpoints ──────────────────────────────────────────────────

    @app.post("/api/job")
    def submit_job():
        data = request.get_json(silent=True) or {}
        job_text: Optional[str] = data.get("job_text")
        if not job_text:
            return jsonify({"error": "Missing job_text"}), 400
        # Store job description in state and also add to conversation history
        conversation.add_job_description(job_text)
        conversation.conversation_history.append({
            "role": "user",
            "content": job_text,
        })
        return jsonify({"ok": True, "message": "Job description added."})
    
    @app.post("/api/fetch-job-url")
    def fetch_job_url():
        """Fetch job description from URL with enhanced error handling"""
        data = request.get_json(silent=True) or {}
        url = data.get("url")
        
        if not url:
            return jsonify({"error": "Missing URL"}), 400
        
        try:
            # Validate URL format
            parsed = urlparse(url)
            if not all([parsed.scheme, parsed.netloc]):
                return jsonify({"error": "Invalid URL format"}), 400
            
            domain = parsed.netloc.lower()
            
            # Check for protected job boards that require special handling
            protected_sites = {
                'linkedin.com': {
                    'name': 'LinkedIn',
                    'message': 'LinkedIn requires login to view job descriptions. Please copy the job text manually from your browser.',
                    'instructions': [
                        '1. Open the LinkedIn job posting in your browser',
                        '2. Log in if needed and scroll to view the full job description', 
                        '3. Select and copy the job description text',
                        '4. Use the "Paste Text" tab to submit it directly'
                    ]
                },
                'indeed.com': {
                    'name': 'Indeed', 
                    'message': 'Indeed has anti-bot protection. Please copy the job text manually.',
                    'instructions': [
                        '1. Open the Indeed job posting in your browser',
                        '2. Copy the job description text',
                        '3. Use the "Paste Text" tab to submit it'
                    ]
                },
                'glassdoor.com': {
                    'name': 'Glassdoor',
                    'message': 'Glassdoor requires authentication. Please copy the job text manually.',
                    'instructions': ['Copy job text from browser and use "Paste Text" tab']
                }
            }
            
            # Check if this is a protected site
            for site_domain, site_info in protected_sites.items():
                if site_domain in domain:
                    return jsonify({
                        "error": f"{site_info['name']} Protection Detected",
                        "message": site_info['message'],
                        "instructions": site_info['instructions'],
                        "site_name": site_info['name'],
                        "protected_site": True
                    }), 400
            
            # Enhanced headers to mimic real browser
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0',
                'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
            
            # Fetch the URL with timeout and proper error handling
            print(f"📡 Fetching URL: {url}")
            response = requests.get(url, timeout=30, headers=headers, allow_redirects=True)
            
            # Check response status
            if response.status_code != 200:
                if response.status_code == 403:
                    return jsonify({
                        "error": "Access Forbidden (403)",
                        "message": "The website is blocking automated access. Please try copying the job description manually.",
                        "instructions": [
                            "1. Open the URL in your browser",
                            "2. Copy the job description text", 
                            "3. Use the 'Paste Text' tab to submit it"
                        ],
                        "status_code": response.status_code
                    }), 400
                elif response.status_code == 404:
                    return jsonify({
                        "error": "Page Not Found (404)",
                        "message": "The job posting may have been removed or the URL is incorrect.",
                        "status_code": response.status_code
                    }), 400
                else:
                    response.raise_for_status()
            
            # Extract text content
            content_type = response.headers.get('content-type', '').lower()
            print(f"📄 Content type: {content_type}")
            
            if 'text/plain' in content_type:
                job_text = response.text
            elif 'text/html' in content_type or 'html' in content_type:
                # Parse HTML and extract text
                soup = BeautifulSoup(response.text, 'html.parser')

                # ── Pre-extract structured data BEFORE stripping script tags ──
                # JS-rendered SPAs (e.g. Workday) have an empty body but rich
                # JSON-LD structured data and og:description meta tags in <head>.
                import json as _json
                json_ld_text = None
                for script_tag in soup.find_all('script', type='application/ld+json'):
                    try:
                        ld_data = _json.loads(script_tag.string or '')
                        desc = ld_data.get('description') if isinstance(ld_data, dict) else None
                        if desc and len(desc) > 100:
                            json_ld_text = desc
                            print(f"📋 Found JSON-LD job description ({len(json_ld_text)} chars)")
                            break
                    except Exception:
                        pass

                meta_desc_text = None
                for meta in soup.find_all('meta'):
                    prop = meta.get('property', '') or meta.get('name', '')
                    if prop in ('og:description', 'description'):
                        content = meta.get('content', '')
                        if len(content) > 100:
                            meta_desc_text = content
                            print(f"📋 Found meta description ({len(meta_desc_text)} chars)")
                            break

                # Remove script and style elements
                for script in soup(["script", "style", "nav", "header", "footer"]):
                    script.decompose()
                
                # Try to find job-specific content first
                job_selectors = [
                    '.job-description',
                    '.job-content', 
                    '.posting-description',
                    '.description',
                    '[data-testid="job-description"]',
                    '.job-details'
                ]
                
                job_content = None
                for selector in job_selectors:
                    elements = soup.select(selector)
                    if elements:
                        job_content = elements[0]
                        break
                
                # If no specific job content found, get main content or body
                if not job_content:
                    job_content = soup.find('main') or soup.find('article') or soup.find('body') or soup
                
                # Get text content
                job_text = job_content.get_text()
                
                # Clean up whitespace
                lines = (line.strip() for line in job_text.splitlines())
                job_text = '\n'.join(line for line in lines if line)

                # For JS-rendered SPAs body text may be nearly empty — fall back
                # to structured data extracted before stripping script tags.
                if len(job_text.strip()) < 200:
                    if json_ld_text:
                        job_text = json_ld_text
                        print(f"ℹ️ Using JSON-LD structured data (body text was too short)")
                    elif meta_desc_text:
                        job_text = meta_desc_text
                        print(f"ℹ️ Using meta description (body text was too short)")

                # Basic validation - check if we got meaningful content
                if len(job_text.strip()) < 100:
                    return jsonify({
                        "error": "Insufficient Content",
                        "message": "The fetched content appears to be too short or may not contain the job description.",
                        "instructions": [
                            "1. Check if the URL is correct",
                            "2. Try opening the URL in your browser first",
                            "3. Copy the job description manually and use 'Paste Text' tab"
                        ],
                        "content_length": len(job_text)
                    }), 400
            else:
                return jsonify({
                    "error": f"Unsupported content type: {content_type}",
                    "message": "The URL does not contain text or HTML content that can be processed."
                }), 400
            
            # Store job description in state
            conversation.add_job_description(job_text)
            
            print(f"✅ Successfully fetched {len(job_text)} characters from {domain}")
            
            return jsonify({
                "ok": True,
                "job_text": job_text,
                "message": f"Job description fetched from {domain}",
                "source_url": url,
                "content_length": len(job_text)
            })
            
        except requests.Timeout:
            return jsonify({
                "error": "Request Timeout",
                "message": "The website took too long to respond. Please try again or use manual text input.",
                "instructions": ["Try copying the job description manually and use the 'Paste Text' tab"]
            }), 500
        except requests.ConnectionError:
            return jsonify({
                "error": "Connection Error", 
                "message": "Unable to connect to the website. Please check the URL or your internet connection.",
                "instructions": ["Verify the URL is correct and accessible in your browser"]
            }), 500
        except requests.RequestException as e:
            return jsonify({
                "error": "Network Error",
                "message": f"Failed to fetch URL: {str(e)}",
                "instructions": ["Try copying the job description manually and use the 'Paste Text' tab"],
                "technical_details": str(e)
            }), 500
        except Exception as e:
            print(f"❌ Error processing URL {url}: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "error": "Processing Error",
                "message": f"Error processing content: {str(e)}",
                "instructions": ["Try copying the job description manually and use the 'Paste Text' tab"],
                "technical_details": str(e)
            }), 500
    
    @app.post("/api/upload-file")
    def upload_file():
        """Extract text from an uploaded file (txt, md, html, pdf, docx, etc.)."""
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        f = request.files['file']
        if not f.filename:
            return jsonify({"error": "Empty filename"}), 400

        filename_lower = f.filename.lower()
        raw = f.read()

        try:
            # ── Plain text / Markdown ─────────────────────────────────────────
            if any(filename_lower.endswith(ext) for ext in ('.txt', '.md', '.rst', '.text')):
                text = raw.decode('utf-8', errors='replace')

            # ── HTML ──────────────────────────────────────────────────────────
            elif any(filename_lower.endswith(ext) for ext in ('.html', '.htm')):
                soup = BeautifulSoup(raw, 'html.parser')
                for tag in soup(['script', 'style', 'head', 'nav', 'footer']):
                    tag.decompose()
                text = soup.get_text(separator='\n')

            # ── PDF ───────────────────────────────────────────────────────────
            elif filename_lower.endswith('.pdf'):
                import io
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(io.BytesIO(raw))
                    pages = [page.extract_text() or '' for page in reader.pages]
                    text = '\n\n'.join(pages)
                except ImportError:
                    return jsonify({"error": "PDF support not available. Run: pip install pypdf"}), 500

            # ── DOCX ──────────────────────────────────────────────────────────
            elif filename_lower.endswith('.docx'):
                import io
                try:
                    import mammoth
                    result = mammoth.extract_raw_text(io.BytesIO(raw))
                    text = result.value
                except ImportError:
                    try:
                        from docx import Document
                        doc = Document(io.BytesIO(raw))
                        text = '\n'.join(p.text for p in doc.paragraphs)
                    except ImportError:
                        return jsonify({"error": "DOCX support not available. Run: pip install python-docx"}), 500

            # ── DOC (legacy Word) ─────────────────────────────────────────────
            elif filename_lower.endswith('.doc'):
                return jsonify({
                    "error": "Legacy .doc format not supported",
                    "message": "Please save the file as .docx or copy-paste the content."
                }), 400

            # ── RTF ───────────────────────────────────────────────────────────
            elif filename_lower.endswith('.rtf'):
                # Strip RTF control words crudely — good enough for job descriptions
                import re as _re
                text_bytes = raw.decode('latin-1', errors='replace')
                text = _re.sub(r'\\[a-z]+\d*\s?|[{}]', ' ', text_bytes)

            else:
                # Try decoding as UTF-8 fallback for unknown extensions
                try:
                    text = raw.decode('utf-8', errors='replace')
                except Exception:
                    return jsonify({
                        "error": f"Unsupported file type: {filename_lower.rsplit('.',1)[-1]}",
                        "message": "Supported formats: txt, md, html, pdf, docx, rtf"
                    }), 400

            # Clean up whitespace
            import re as _re
            text = _re.sub(r'\n{3,}', '\n\n', text).strip()

            if len(text) < 50:
                return jsonify({
                    "error": "Insufficient Content",
                    "message": "The file appears to be empty or contains no readable text.",
                    "content_length": len(text)
                }), 400

            print(f"📎 Uploaded file '{f.filename}': extracted {len(text)} characters")
            return jsonify({
                "ok":             True,
                "text":           text,
                "filename":       f.filename,
                "content_length": len(text),
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Error reading file: {str(e)}"}), 500

    @app.post("/api/load-job-file")
    def load_job_file():
        """Load a job description from a file."""
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        if not filename:
            return jsonify({"error": "Missing filename"}), 400
        
        # Look for the file in sample_jobs directory
        job_file_path = Path(__file__).parent.parent / "sample_jobs" / filename
        
        # Also check CV directory for other job files
        if not job_file_path.exists():
            cv_path = Path.home() / "CV" / "files" / filename
            if cv_path.exists():
                job_file_path = cv_path
        
        if not job_file_path.exists():
            return jsonify({"error": f"File not found: {filename}"}), 404
        
        try:
            with open(job_file_path, 'r', encoding='utf-8') as f:
                job_text = f.read()
            
            # Store job description in state
            conversation.add_job_description(job_text)
            
            return jsonify({
                "ok": True,
                "job_text": job_text,
                "message": f"Loaded job description from {filename}"
            })
        except Exception as e:
            return jsonify({"error": f"Failed to load file: {str(e)}"}), 500

    @app.get("/api/positions")
    def positions():
        # Reuse ConversationManager helper to list positions
        try:
            names = conversation._list_positions()
            return jsonify({"positions": names})
        except Exception as e:
            return jsonify({"error": str(e), "positions": []}), 500

    @app.post("/api/position")
    def set_position():
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        open_latest = bool(data.get("open_latest"))
        if not name:
            return jsonify({"error": "Missing name"}), 400
        conversation.state["position_name"] = name
        loaded = False
        if open_latest:
            loaded = conversation._load_latest_session_for_position(name)
        return jsonify({"ok": True, "loaded": loaded, "position_name": name})

    @app.post("/api/message")
    def send_message():
        data = request.get_json(silent=True) or {}
        msg: Optional[str] = data.get("message")
        if not msg:
            return jsonify({"error": "Missing message"}), 400
        try:
            response = conversation._process_message(msg)
            return jsonify({
                "ok": True,
                "response": response,
                "phase": conversation.state.get("phase"),
            })
        except Exception as e:
            # Comprehensive error logging
            import traceback
            print("\n" + "="*60)
            print("ERROR in /api/message endpoint:")
            print(f"Message: {msg[:100]}..." if len(msg) > 100 else msg)
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            print("Traceback:")
            traceback.print_exc()
            print("="*60 + "\n")
            return jsonify({"error": str(e)}), 500

    @app.post("/api/reset")
    def reset():
        # Call the reset logic via the existing method (requires user confirmation in CLI).
        # For web, we reset directly.
        conversation.conversation_history = []
        conversation.state = {
            "phase": "init",
            "job_description": None,
            "job_analysis": None,
            "customizations": None,
            "generated_files": None,
        }
        return jsonify({"ok": True, "message": "Conversation reset."})

    @app.post("/api/save")
    def save():
        try:
            conversation._save_session()
            return jsonify({"ok": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/sessions")
    def list_sessions():
        """List saved sessions, most recent first."""
        try:
            from utils.config import get_config
            cfg = get_config()
            session_base = Path(cfg.get('session.session_dir', 'files/sessions')).expanduser()
            sessions = []
            if session_base.exists():
                for session_file in sorted(session_base.rglob("session.json"), reverse=True):
                    try:
                        import json as _json
                        with open(session_file) as f:
                            data = _json.load(f)
                        state = data.get('state', {})
                        sessions.append({
                            "path":          str(session_file),
                            "position_name": state.get('position_name') or session_file.parent.parent.name,
                            "timestamp":     data.get('timestamp', ''),
                            "phase":         state.get('phase', ''),
                            "has_job":       bool(state.get('job_description')),
                            "has_analysis":  bool(state.get('job_analysis')),
                            "has_customizations": bool(state.get('customizations')),
                        })
                    except Exception:
                        pass
            return jsonify({"sessions": sessions[:20]})  # cap at 20 most recent
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/load-items")
    def load_items():
        """Merged list of saved sessions and server-side job files for the Load Job panel."""
        items = []

        # ── Sessions ──────────────────────────────────────────────────────────
        try:
            from utils.config import get_config as _cfg
            cfg = _cfg()
            session_base = Path(cfg.get('session.session_dir', 'files/sessions')).expanduser()
            if session_base.exists():
                for session_file in sorted(session_base.rglob("session.json"), reverse=True):
                    try:
                        import json as _json
                        with open(session_file) as f:
                            data = _json.load(f)
                        state = data.get('state', {})
                        items.append({
                            "kind":         "session",
                            "path":         str(session_file),
                            "label":        state.get('position_name') or session_file.parent.parent.name,
                            "timestamp":    data.get('timestamp', ''),
                            "phase":        state.get('phase', ''),
                            "has_job":      bool(state.get('job_description')),
                            "has_analysis": bool(state.get('job_analysis')),
                            "has_cv":       bool(state.get('generated_files')),
                        })
                    except Exception:
                        pass
        except Exception:
            pass

        items = items[:20]  # cap sessions at 20

        # ── Server-side job files ──────────────────────────────────────────────
        try:
            sample_jobs_dir = Path(__file__).parent.parent / "sample_jobs"
            if sample_jobs_dir.exists():
                for f in sorted(sample_jobs_dir.iterdir()):
                    if f.suffix.lower() in {'.txt', '.md', '.html', '.pdf', '.docx', '.rtf'}:
                        label = f.stem.replace('_', ' ').replace('-', ' ').title()
                        items.append({
                            "kind":      "file",
                            "path":      str(f),
                            "filename":  f.name,
                            "label":     label,
                            "timestamp": "",
                            "phase":     "",
                        })
        except Exception:
            pass

        return jsonify({"items": items})

    @app.post("/api/load-session")
    def load_session_endpoint():
        """Load a saved session file into the running conversation state."""
        data = request.get_json(silent=True) or {}
        path = data.get("path")
        if not path:
            return jsonify({"error": "Missing path"}), 400
        session_file = Path(path)
        if not session_file.exists():
            return jsonify({"error": f"Session file not found: {path}"}), 404
        try:
            conversation.load_session(str(session_file))
            return jsonify({
                "ok": True,
                "position_name": conversation.state.get("position_name"),
                "phase":         conversation.state.get("phase"),
                "has_job":       bool(conversation.state.get("job_description")),
                "has_analysis":  bool(conversation.state.get("job_analysis")),
                "history_count": len(conversation.conversation_history),
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/action")
    def do_action():
        data = request.get_json(silent=True) or {}
        action = data.get("action")
        if not action:
            return jsonify({"error": "Missing action"}), 400
        
        # Format the payload correctly for _execute_action
        payload = {"action": action}
        if data.get("job_text"):
            payload["job_text"] = data["job_text"]
        if data.get("user_preferences"):
            payload["user_preferences"] = data["user_preferences"]
            
        try:
            result = conversation._execute_action(payload)
            if not result:
                return jsonify({"error": "Invalid or unsupported action"}), 400
            return jsonify({
                "ok": True,
                "result": result,
                "phase": conversation.state.get("phase"),
            })
        except Exception as e:
            print(f"Action execution error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/api/history")
    def history():
        # Return the conversation history for chat-style rendering
        return jsonify({
            "history": conversation.conversation_history,
            "phase": conversation.state.get("phase"),
        })

    def normalize_experience_id(exp_id):
        """Normalize various experience ID formats to match master data."""
        if not exp_id:
            return exp_id
        
        # Convert to lowercase
        normalized = exp_id.lower()
        
        # Handle formats like "EXP-03" -> "exp_003", "EXP_3" -> "exp_003"
        if normalized.startswith('exp'):
            # Extract number part
            import re
            match = re.search(r'(\d+)$', normalized.replace('-', '_').replace('_', ''))
            if match:
                num = int(match.group(1))
                normalized = f"exp_{num:03d}"
        
        return normalized
    
    @app.post("/api/experience-details")
    def get_experience_details():
        data = request.get_json(silent=True) or {}
        experience_id = data.get("experience_id")
        if not experience_id:
            return jsonify({"error": "Missing experience_id"}), 400
            
        try:
            # Normalize the ID to match master data format
            normalized_id = normalize_experience_id(experience_id)
            
            # Look up experience details in master data
            master_data = conversation.orchestrator.master_data
            experience = None
            
            # Search through experiences in master data (check both 'experience' and 'experiences')
            experiences_list = master_data.get("experiences") or master_data.get("experience", [])
            if experiences_list:
                for exp in experiences_list:
                    if exp.get("id") == normalized_id or exp.get("id") == experience_id:
                        experience = exp
                        break
            
            if experience:
                return jsonify({"experience": experience})
            else:
                # Log available IDs for debugging
                available_ids = [exp.get("id") for exp in experiences_list] if experiences_list else []
                print(f"DEBUG: Experience '{experience_id}' (normalized: '{normalized_id}') not found")
                print(f"DEBUG: Available IDs: {available_ids[:10]}")
                return jsonify({"experience": None, "message": f"Experience {experience_id} not found"})
                
        except Exception as e:
            print(f"ERROR in get_experience_details: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/review-decisions', methods=['POST'])
    def save_review_decisions():
        """Save user's review decisions for experiences/skills"""
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        decision_type = data.get('type')  # 'experiences' or 'skills'
        decisions = data.get('decisions', {})
        
        if not decision_type or not decisions:
            return jsonify({"error": "Missing type or decisions"}), 400
        
        try:
            # Store decisions in conversation state
            if decision_type == 'experiences':
                conversation.state['experience_decisions'] = decisions
                message = f"Saved decisions for {len(decisions)} experiences"
            elif decision_type == 'skills':
                conversation.state['skill_decisions'] = decisions
                message = f"Saved decisions for {len(decisions)} skills"
            else:
                return jsonify({"error": f"Invalid type: {decision_type}"}), 400
            
            # Save the updated state
            conversation._save_session()
            
            print(f"Saved {decision_type} decisions: {decisions}")
            return jsonify({"success": True, "message": message})
            
        except Exception as e:
            print(f"ERROR in save_review_decisions: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.get("/api/download/<filename>")
    def download_file(filename):
        """Download generated CV files"""
        try:
            # Get generated files from conversation state
            generated_files = conversation.state.get('generated_files', {})
            
            # Find the requested file
            file_path = None
            
            # Check if generated_files is the dictionary structure returned by orchestrator
            if isinstance(generated_files, dict) and 'files' in generated_files:
                # This is the structure: {'output_dir': 'path', 'files': ['file1', 'file2'], 'metadata': {}}
                output_dir = Path(generated_files['output_dir'])
                for file_name in generated_files['files']:
                    if file_name == filename:
                        file_path = output_dir / filename
                        break
            else:
                # Legacy structure or other format - search in different ways
                for file_type, file_data in generated_files.items():
                    if isinstance(file_data, dict):
                        # File data is a dict with path info
                        check_filename = file_data.get('filename') if hasattr(file_data, 'get') else None
                        if check_filename == filename:
                            file_path = Path(file_data.get('path', file_data))
                            break
                    elif isinstance(file_data, (str, Path)):
                        # File data is a direct path
                        if Path(file_data).name == filename:
                            file_path = Path(file_data)
                            break
            
            if not file_path or not file_path.exists():
                return jsonify({"error": "File not found on disk"}), 404
            
            # Determine MIME type
            mime_type = 'application/octet-stream'
            if filename.endswith('.pdf'):
                mime_type = 'application/pdf'
            elif filename.endswith('.docx'):
                mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif filename.endswith('.html'):
                mime_type = 'text/html'
            
            return send_file(
                str(file_path),
                as_attachment=True,
                download_name=filename,
                mimetype=mime_type
            )
            
        except Exception as e:
            print(f"ERROR in download_file: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    return app


def parse_args():
    config = get_config()
    
    parser = argparse.ArgumentParser(description="Minimal Web UI for CV Generator")
    parser.add_argument("--job-file", help="Path to job description text file")
    parser.add_argument("--master-data", default=config.master_cv_path,
                       help=f"Path to Master_CV_Data.json")
    parser.add_argument("--publications", default=config.publications_path,
                       help=f"Path to publications.bib")
    parser.add_argument("--output-dir", default=config.output_dir,
                       help=f"Output directory")
    parser.add_argument("--llm-provider", choices=["copilot-oauth", "copilot", "github", "openai", "anthropic", "gemini", "groq", "local"],
                       default=config.llm_provider,
                       help=f"LLM provider (default: {config.llm_provider})")
    parser.add_argument("--model", default=config.llm_model, help="Specific model to use")
    parser.add_argument("--port", type=int, default=config.web_port,
                       help=f"Port to run on (default: {config.web_port})")
    parser.add_argument("--debug", action="store_true", help="Run Flask in debug mode")
    return parser.parse_args()


def main():
    args = parse_args()
    config = get_config()
       
    app = create_app(args)
    app.run(host=config.web_host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
