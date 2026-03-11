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
import json
import sys
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional
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

from utils.config import get_config, validate_config, ConfigurationError
from utils.llm_client import get_llm_provider
from utils.cv_orchestrator import CVOrchestrator, validate_ats_report
from utils.conversation_manager import ConversationManager
from utils.copilot_auth import CopilotAuthManager
from utils.spell_checker import SpellChecker


def create_app(args) -> Flask:
    app = Flask(__name__, static_folder=None)

    # Validate configuration before initializing dependencies.
    # Raises ConfigurationError with a clear message if no LLM provider is set.
    validate_config(provider=args.llm_provider)

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

    # ── Single-session guard ────────────────────────────────────────────────
    # Prevents two browser tabs from corrupting shared ConversationManager
    # state concurrently. Any state-mutating POST that arrives while the lock
    # is held returns 409 Conflict; the JS client shows the amber banner.
    _session_lock = threading.Lock()
    # Endpoints that are read-only or session-management: never blocked.
    _LOCK_EXEMPT_PATHS = {
        '/api/status', '/api/history', '/api/sessions', '/api/load-items',
        '/api/positions', '/api/save', '/api/load-session', '/api/delete-session',
        '/api/copilot-auth/start', '/api/copilot-auth/poll',
        '/api/copilot-auth/status', '/api/copilot-auth/logout',
    }

    @app.before_request
    def _acquire_session_lock():
        if request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
            if request.path.startswith('/api/') and request.path not in _LOCK_EXEMPT_PATHS:
                acquired = _session_lock.acquire(blocking=False)
                if not acquired:
                    return jsonify({
                        "error": "Session busy",
                        "message": "Another session is active. Close the other tab or wait for it to complete.",
                    }), 409
                request.environ['_session_lock_acquired'] = True

    @app.teardown_request
    def _release_session_lock(exc=None):
        if request.environ.get('_session_lock_acquired'):
            _session_lock.release()
            request.environ['_session_lock_acquired'] = False
    # ── end single-session guard ────────────────────────────────────────────

    def _infer_position_name(job_text: str) -> Optional[str]:
        """Infer a concise position label from job text."""
        if not job_text:
            return None

        lines = [line.strip() for line in job_text.splitlines() if line.strip()]
        if not lines:
            return None

        title = lines[0]
        company = lines[1] if len(lines) > 1 else ""

        if " at " in title.lower() and not company:
            parts = title.split(" at ", 1)
            if len(parts) == 2:
                title, company = parts[0].strip(), parts[1].strip()

        if title and company:
            label = f"{title} at {company}"
        else:
            label = title or company

        return label[:120] if label else None

    def _extract_json_payload(text: str) -> Any:
        """Best-effort extraction of JSON array/object from model output."""
        if not text:
            return None

        try:
            return json.loads(text)
        except Exception:
            pass

        if "```json" in text:
            try:
                json_str = text.split("```json", 1)[1].split("```", 1)[0].strip()
                return json.loads(json_str)
            except Exception:
                pass

        object_match = re.search(r"\{[\s\S]*\}", text)
        if object_match:
            try:
                return json.loads(object_match.group(0))
            except Exception:
                pass

        array_match = re.search(r"\[[\s\S]*\]", text)
        if array_match:
            try:
                return json.loads(array_match.group(0))
            except Exception:
                pass

        return None

    def _fallback_post_analysis_questions(analysis: Dict[str, Any]) -> List[Dict[str, str]]:
        """Deterministic fallback if LLM question generation fails."""
        questions: List[Dict] = []

        role_level = analysis.get("role_level")
        if role_level:
            questions.append({
                "type": "experience_level",
                "question": f"This role appears to be at {role_level} level. Should I emphasize your most senior experiences or include a broader range to show career progression?",
                "choices": ["Emphasize most senior", "Broader career progression", "Let you decide based on analysis"],
            })

        required_skills = analysis.get("required_skills") or []
        if isinstance(required_skills, list):
            skill_text = " ".join(str(s).lower() for s in required_skills)
            if any(token in skill_text for token in ("leadership", "management", "team")):
                questions.append({
                    "type": "leadership_focus",
                    "question": "This role has leadership components. Would you prefer me to emphasize your management experience or focus more on your technical contributions?",
                    "choices": ["Emphasize management", "Focus on technical", "Balance both equally"],
                })

        domain = analysis.get("domain")
        if domain:
            questions.append({
                "type": "domain_expertise",
                "question": f"The role is in {domain}. Do you have particular projects or achievements in this domain that you'd like me to highlight?",
                "choices": ["Highlight domain-specific achievements", "Use all available experience", "Prioritize most recent work"],
            })

        company = analysis.get("company")
        if company:
            questions.append({
                "type": "company_culture",
                "question": f"For {company}, would you like me to tailor emphasis toward their culture and values? If so, what should I prioritize?",
                "choices": ["Research-driven / academic", "Industry / commercial impact", "Innovation / startup", "Use cultural indicators from job description"],
            })

        return questions[:4]

    def _generate_post_analysis_questions(analysis: Dict[str, Any], job_text: Optional[str]) -> List[Dict]:
        """Generate clarifying questions from the LLM in JSON format."""
        prompt = f"""You are helping tailor a CV to a specific job.

Create 2-4 concise, high-value clarifying questions for the candidate before generating customization recommendations.

Requirements:
- Questions must be specific to this role, company, and analysis.
- Focus on tradeoffs that affect selection/emphasis of experiences and skills.
- Avoid generic or repetitive questions.
- Keep each question under 220 characters.
- For each question, provide 2-4 button-answer choices covering the most likely responses.
- Return ONLY valid JSON as an array of objects.

Schema:
[
  {{"type": "short_snake_case", "question": "...", "choices": ["Option A", "Option B", "Option C"]}}
]

Job Analysis:
{json.dumps(analysis, indent=2)}

Job Description (excerpt):
{(job_text or '')[:2500]}
"""

        response = llm_client.chat(
            messages=[
                {"role": "system", "content": "You generate targeted CV-optimization clarification questions and respond with strict JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=600,
        )

        payload = _extract_json_payload(response)
        if isinstance(payload, dict) and isinstance(payload.get("questions"), list):
            payload = payload.get("questions")

        if not isinstance(payload, list):
            return []

        cleaned: List[Dict] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            qtype = str(item.get("type", "clarification")).strip().lower().replace(" ", "_")
            choices = item.get("choices")
            if not isinstance(choices, list):
                choices = []
            choices = [str(c).strip() for c in choices if str(c).strip()][:4]
            if not question:
                continue
            entry: Dict = {
                "type": qtype[:40] or "clarification",
                "question": question[:220],
            }
            if choices:
                entry["choices"] = choices
            cleaned.append(entry)

        return cleaned[:4]

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
            "post_analysis_questions": conversation.state.get("post_analysis_questions") or [],
            "post_analysis_answers": conversation.state.get("post_analysis_answers") or {},
            "customizations": conversation.state.get("customizations"),  # Return full data, not just bool
            "generated_files": conversation.state.get("generated_files"),
            "all_experience_ids": all_experience_ids,  # Add all experience IDs
            "all_skills": all_skills,  # Add all skills
            "copilot_auth": auth_manager.status,
            "iterating": bool(conversation.state.get("iterating")),
            "reentry_phase": conversation.state.get("reentry_phase"),
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
        conversation.state["position_name"] = _infer_position_name(job_text)
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
            conversation.state["position_name"] = _infer_position_name(job_text)
            
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
            conversation.state["position_name"] = _infer_position_name(job_text)
            
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
            "position_name": None,
            "job_description": None,
            "job_analysis": None,
            "post_analysis_questions": [],
            "post_analysis_answers": {},
            "customizations": None,
            "generated_files": None,
        }
        return jsonify({"ok": True, "message": "Conversation reset."})

    @app.post("/api/post-analysis-responses")
    def post_analysis_responses():
        """Persist generated post-analysis questions and user answers into session state."""
        data = request.get_json(silent=True) or {}
        questions = data.get("questions") or []
        answers = data.get("answers") or {}

        if not isinstance(questions, list):
            return jsonify({"error": "questions must be a list"}), 400
        if not isinstance(answers, dict):
            return jsonify({"error": "answers must be an object"}), 400

        cleaned_questions = []
        for q in questions[:8]:
            if not isinstance(q, dict):
                continue
            question_text = str(q.get("question", "")).strip()
            qtype = str(q.get("type", "clarification")).strip().lower().replace(" ", "_")
            if question_text:
                cleaned_questions.append({
                    "type": qtype[:40] or "clarification",
                    "question": question_text[:260],
                })

        cleaned_answers = {}
        for key, value in answers.items():
            clean_key = str(key).strip().lower().replace(" ", "_")[:40]
            if not clean_key:
                continue
            clean_value = str(value).strip()
            if clean_value:
                cleaned_answers[clean_key] = clean_value[:1000]

        conversation.state["post_analysis_questions"] = cleaned_questions
        conversation.state["post_analysis_answers"] = cleaned_answers
        conversation._save_session()

        return jsonify({
            "ok": True,
            "questions_count": len(cleaned_questions),
            "answers_count": len(cleaned_answers),
        })

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
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            sessions = []
            if output_base.exists():
                for session_file in sorted(output_base.rglob("session.json"), reverse=True):
                    try:
                        import json as _json
                        with open(session_file) as f:
                            data = _json.load(f)
                        state = data.get('state', {})
                        sessions.append({
                            "path":          str(session_file),
                            "position_name": state.get('position_name') or session_file.parent.name,
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
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            if output_base.exists():
                for session_file in sorted(output_base.rglob("session.json"), reverse=True):
                    try:
                        import json as _json
                        with open(session_file) as f:
                            data = _json.load(f)
                        state = data.get('state', {})
                        items.append({
                            "kind":         "session",
                            "path":         str(session_file),
                            "label":        state.get('position_name') or session_file.parent.name,
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

    @app.post("/api/delete-session")
    def delete_session_endpoint():
        """Delete a session and all associated generated files.

        Accepts a JSON body with either:
        - ``path``: full path to a ``session.json`` file → deletes its parent
          directory (the entire job output directory).
        - ``session_id``: legacy positional identifier (directory name or
          suffix) → falls back to a name-matching search for backward compat.
        """
        data = request.get_json(silent=True) or {}
        path_param  = data.get("path") or data.get("session_id")
        if not path_param:
            return jsonify({"error": "Missing path or session_id"}), 400

        try:
            cfg = get_config()
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()

            # ── Preferred: caller supplies the full session.json path ──────────
            candidate = Path(path_param)
            if candidate.exists() and candidate.name == 'session.json':
                job_dir = candidate.parent
                # Safety: must be a direct child of output_base
                if job_dir.parent.resolve() == output_base.resolve():
                    import shutil as _shutil
                    _shutil.rmtree(job_dir)
                    print(f"Deleted job directory: {job_dir}")
                    return jsonify({"success": True, "message": "Session deleted successfully"})
                else:
                    return jsonify({"error": "Path is outside the output directory"}), 400

            # ── Fallback: match by directory name or position name ────────────
            deleted = False
            for session_file in output_base.rglob('session.json'):
                job_dir = session_file.parent
                if path_param in job_dir.name or job_dir.name == path_param:
                    import shutil as _shutil
                    _shutil.rmtree(job_dir)
                    deleted = True
                    print(f"Deleted job directory: {job_dir}")
                    break

            if deleted:
                return jsonify({"success": True, "message": "Session deleted successfully"})
            return jsonify({"error": f"Session not found: {path_param}"}), 404

        except Exception as e:
            print(f"ERROR in delete_session: {e}")
            import traceback
            traceback.print_exc()
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

    @app.post("/api/back-to-phase")
    def back_to_phase():
        """Navigate back to a prior phase without clearing downstream state.

        Body: ``{"phase": "analysis"|"customizations"|"rewrite"|"spell"|...}``
        Resolves frontend step labels to internal phase strings automatically.
        """
        data = request.get_json(silent=True) or {}
        target = data.get("phase")
        if not target:
            return jsonify({"error": "Missing phase"}), 400
        try:
            result = conversation.back_to_phase(target)
            return jsonify(result)
        except Exception as e:
            import traceback; traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.post("/api/re-run-phase")
    def re_run_phase():
        """Re-execute the LLM call for a phase with downstream context preserved.

        Body: ``{"phase": "analysis"|"customizations"|"rewrite"}``
        Returns ``{ok, phase, prior_output, new_output}``.
        """
        data = request.get_json(silent=True) or {}
        target = data.get("phase")
        if not target:
            return jsonify({"error": "Missing phase"}), 400
        try:
            result = conversation.re_run_phase(target)
            if not result.get("ok"):
                return jsonify(result), 400
            return jsonify(result)
        except Exception as e:
            import traceback; traceback.print_exc()
            return jsonify({"error": str(e)}), 500


    @app.get("/api/synonym-lookup")
    def synonym_lookup():
        """Look up the canonical form of a skill or keyword via the synonym map.

        Query param: ``?term=ML``
        Returns ``{term, canonical, found}`` — ``found`` is False when no
        mapping exists (canonical == term in that case).
        """
        term = request.args.get("term", "").strip()
        if not term:
            return jsonify({"error": "Missing term query parameter"}), 400
        canonical = conversation.orchestrator.canonical_skill_name(term)
        return jsonify({"term": term, "canonical": canonical, "found": canonical != term})

    @app.get("/api/synonym-map")
    def synonym_map():
        """Return the full synonym map as ``{alias: canonical}``."""
        return jsonify(conversation.orchestrator._synonym_map)

    @app.post("/api/reorder-bullets")
    def reorder_bullets():
        """Persist a user-defined bullet ordering for one experience.

        Body: ``{"experience_id": "exp_001", "order": [2, 0, 1]}``
        ``order`` is a list of original achievement indices in the desired
        display order.  Pass an empty list to reset to relevance-sorted order.
        Returns ``{ok: true}``.
        """
        data = request.get_json(silent=True) or {}
        exp_id = data.get("experience_id")
        order  = data.get("order")
        if not exp_id:
            return jsonify({"error": "Missing experience_id"}), 400
        if order is None:
            return jsonify({"error": "Missing order list"}), 400
        if not isinstance(order, list):
            return jsonify({"error": "order must be a list of integers"}), 400
        try:
            achievement_orders = conversation.state.setdefault("achievement_orders", {})
            if order:
                achievement_orders[exp_id] = [int(i) for i in order]
            else:
                achievement_orders.pop(exp_id, None)  # reset → use auto relevance sort
            conversation._save_session()
            return jsonify({"ok": True, "experience_id": exp_id, "order": order})
        except Exception as e:
            import traceback; traceback.print_exc()
            return jsonify({"error": str(e)}), 500


    @app.post("/api/post-analysis-questions")
    def post_analysis_questions():
        """Generate post-analysis clarifying questions, preferably via LLM."""
        data = request.get_json(silent=True) or {}
        analysis = data.get("analysis") or conversation.state.get("job_analysis")

        if isinstance(analysis, str):
            analysis = _extract_json_payload(analysis)

        if not isinstance(analysis, dict):
            return jsonify({"ok": True, "questions": []})

        questions: List[Dict[str, str]] = []
        source = "fallback"
        try:
            questions = _generate_post_analysis_questions(
                analysis=analysis,
                job_text=conversation.state.get("job_description"),
            )
            if questions:
                source = "llm"
        except Exception as e:
            print(f"Question generation failed, using fallback: {e}")

        if not questions:
            questions = _fallback_post_analysis_questions(analysis)

        conversation.state["post_analysis_questions"] = questions
        conversation._save_session()

        return jsonify({"ok": True, "questions": questions, "source": source})

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

    @app.route('/api/cv-data', methods=['GET'])
    def get_cv_data():
        """Get current CV data for editing"""
        try:
            # Get CV data from orchestrator's master data
            cv_data = {
                'personal_info': {},
                'summary': '',
                'experiences': [],
                'skills': []
            }
            
            if orchestrator and orchestrator.master_data:
                master_data = orchestrator.master_data
                
                # Get personal info
                personal_info = master_data.get('personal_info', {})
                cv_data['personal_info'] = {
                    'name': personal_info.get('name', ''),
                    'email': personal_info.get('email', ''),
                    'phone': personal_info.get('phone', ''),
                    'location': personal_info.get('location', '')
                }
                
                # Get summary
                cv_data['summary'] = master_data.get('summary', '')
                
                # Get experiences
                experiences = master_data.get('experience', [])
                cv_data['experiences'] = []
                for exp in experiences:
                    exp_data = {
                        'title': exp.get('title', ''),
                        'company': exp.get('company', ''),
                        'start_date': exp.get('start_date', ''),
                        'end_date': exp.get('end_date', ''),
                        'current': exp.get('current', False),
                        'location': exp.get('location', ''),
                        'achievements': exp.get('achievements', [])
                    }
                    cv_data['experiences'].append(exp_data)
                
                # Get skills
                skills_data = master_data.get('skills', [])
                if isinstance(skills_data, dict):
                    # Extract skills from categories
                    all_skills = []
                    for category_data in skills_data.values():
                        if isinstance(category_data, dict) and 'skills' in category_data:
                            category_skills = category_data.get('skills', [])
                            if isinstance(category_skills, list):
                                all_skills.extend(category_skills)
                        elif isinstance(category_data, list):
                            all_skills.extend(category_data)
                    cv_data['skills'] = all_skills
                elif isinstance(skills_data, list):
                    cv_data['skills'] = skills_data
                else:
                    cv_data['skills'] = []
            
            return jsonify(cv_data)
            
        except Exception as e:
            print(f"ERROR in get_cv_data: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/cv-data', methods=['POST'])
    def save_cv_data():
        """Save edited CV data"""
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            # Store the edited CV data in the conversation state for now
            # In a full implementation, you'd want to update the master data file
            conversation.state['edited_cv_data'] = data
            conversation._save_session()
            
            # Log the changes
            print(f"CV data updated:")
            if 'personal_info' in data:
                print(f"  - Personal info: {data['personal_info']}")
            if 'summary' in data:
                print(f"  - Summary: {len(data.get('summary', ''))} chars")
            if 'experiences' in data:
                print(f"  - Experiences: {len(data['experiences'])} items")
            if 'skills' in data:
                print(f"  - Skills: {len(data['skills'])} items")
            
            return jsonify({"success": True, "message": "CV data saved successfully"})
            
        except Exception as e:
            print(f"ERROR in save_cv_data: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.get("/api/rewrites")
    def get_rewrites():
        """Propose LLM text rewrites aligned with the target job description.

        Calls ``orchestrator.propose_rewrites`` with the master CV data and the
        stored job analysis, stores the proposals in session state, and returns
        them for the frontend rewrite-review panel.

        Returns ``phase: 'generation'`` when no proposals are produced (either
        no LLM is configured or the LLM found nothing to rewrite) so the
        frontend can fall through gracefully.
        """
        try:
            job_analysis = conversation.state.get('job_analysis')
            if not job_analysis:
                return jsonify({"error": "Job analysis not available. Analyse the job first."}), 400

            content = orchestrator.master_data
            if not content:
                return jsonify({"error": "CV master data not loaded."}), 400

            rewrites = orchestrator.propose_rewrites(content, job_analysis)
            conversation.state['pending_rewrites'] = rewrites

            if rewrites:
                conversation.state['phase'] = 'rewrite_review'
                phase = 'rewrite_review'
            else:
                # No proposals (no LLM or nothing to rewrite) — skip review step
                phase = 'generation'

            conversation._save_session()
            return jsonify({"ok": True, "rewrites": rewrites, "phase": phase})

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.post("/api/rewrites/approve")
    def approve_rewrites():
        """Submit accept / edit / reject decisions for pending rewrite proposals.

        Request body::

            {"decisions": [{"id": str, "outcome": "accept"|"reject"|"edit",
                            "final_text": str|null}, ...]}

        Delegates to :meth:`ConversationManager.submit_rewrite_decisions` which
        builds ``approved_rewrites``, ``rewrite_audit``, advances the phase to
        ``'generation'``, and persists the session.
        """
        data = request.get_json(silent=True) or {}
        decisions = data.get('decisions')
        if decisions is None:
            return jsonify({"error": "Missing decisions"}), 400
        if not isinstance(decisions, list):
            return jsonify({"error": "decisions must be a list"}), 400

        try:
            summary = conversation.submit_rewrite_decisions(decisions)
            return jsonify({
                "ok":             True,
                "approved_count": summary['approved_count'],
                "rejected_count": summary['rejected_count'],
                "phase":          summary['phase'],
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.get("/api/publication-recommendations")
    def publication_recommendations():
        """Return LLM-ranked publication recommendations for the current job.

        Reads `session.publication_recommendations` if already computed, or
        computes them from `orchestrator.publications` + `session.job_analysis`.
        Computation runs at most once per session (cached in state).
        """
        try:
            # Return cached recommendations if available.
            cached = conversation.state.get('publication_recommendations')
            if cached is not None:
                return jsonify({"ok": True, "recommendations": cached, "source": "cache"})

            job_analysis = conversation.state.get('job_analysis')
            if not job_analysis:
                return jsonify({"ok": True, "recommendations": [], "source": "no_analysis"})

            if not orchestrator.publications:
                return jsonify({"ok": True, "recommendations": [], "source": "no_publications"})

            candidate_name = ''
            if orchestrator.master_data:
                candidate_name = orchestrator.master_data.get('personal_info', {}).get('name', '')

            # Convert bibtex_parser dict-of-dicts to list for the LLM ranker.
            pubs_list = list(orchestrator.publications.values())

            try:
                recommendations = llm_client.rank_publications_for_job(
                    publications=pubs_list,
                    job_analysis=job_analysis,
                    candidate_name=candidate_name,
                    max_results=15,
                )
                source = "llm"
            except Exception as rank_err:
                print(f"Publication ranking failed, using score-based fallback: {rank_err}")
                # Fallback: use the existing score-based _select_publications.
                selected = orchestrator._select_publications(job_analysis, max_count=15)
                recommendations = []
                for pub in selected:
                    recommendations.append({
                        'cite_key':          pub.get('key', ''),
                        'title':             pub.get('title', ''),
                        'venue':             pub.get('journal') or pub.get('booktitle') or '',
                        'year':              pub.get('year', ''),
                        'is_first_author':   False,
                        'relevance_score':   pub.get('relevance_score', 5),
                        'rationale':         '',
                        'authority_signals': [],
                        'venue_warning':     '' if (pub.get('journal') or pub.get('booktitle')) else 'No venue found',
                        'formatted_citation': pub.get('formatted', ''),
                    })
                source = "fallback"

            conversation.state['publication_recommendations'] = recommendations
            conversation._save_session()

            return jsonify({"ok": True, "recommendations": recommendations, "source": source})

        except Exception as e:
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

    # ------------------------------------------------------------------ #
    # Spell / Grammar Check endpoints  (Phase 6)                          #
    # ------------------------------------------------------------------ #

    # Lazy singleton — the LanguageTool JVM starts on first call.
    _spell_checker: SpellChecker = SpellChecker()

    def _prepopulate_spell_dict() -> None:
        """Load skill names from master data into the custom dictionary once."""
        try:
            skills = orchestrator.master_data.get('skills', {})
            # skills may be a list, dict of categories, or flat list
            all_names: list = []
            if isinstance(skills, dict):
                for cat_skills in skills.values():
                    if isinstance(cat_skills, list):
                        all_names.extend(cat_skills)
            elif isinstance(skills, list):
                all_names = [s if isinstance(s, str) else str(s) for s in skills]
            # Also add candidate name
            pinfo = orchestrator.master_data.get('personal_info', {})
            name = pinfo.get('name', '')
            if name:
                all_names.append(name)
            _spell_checker.prepopulate_from_skills(all_names)
        except Exception:
            pass

    @app.get("/api/spell-check-sections")
    def spell_check_sections():
        """Return the text sections that need spell checking for the current session."""
        sections = []
        try:
            state = conversation.state

            # Professional summary (from master data or post-analysis answers)
            post_answers = state.get('post_analysis_answers') or {}
            summary_text = post_answers.get('custom_summary', '')
            if not summary_text:
                summaries = orchestrator.master_data.get('professional_summaries', {})
                summary_text = summaries.get('default', '') or next(iter(summaries.values()), '')
            if summary_text:
                sections.append({
                    'id':      'summary',
                    'label':   'Professional Summary',
                    'text':    summary_text,
                    'context': 'summary',
                })

            # Approved rewrite proposed texts
            approved_rewrites = state.get('approved_rewrites') or []
            for r in approved_rewrites:
                proposed = r.get('proposed', '')
                if not proposed:
                    continue
                location = r.get('id', '') or r.get('section', 'bullet')
                sections.append({
                    'id':      f"rewrite_{r.get('id', location)}",
                    'label':   f"Rewrite: {location}",
                    'text':    proposed,
                    'context': 'bullet',
                })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

        return jsonify({'ok': True, 'sections': sections})

    @app.post("/api/spell-check")
    def spell_check_text():
        """Check a single text fragment.

        Body: ``{"text": "...", "context": "bullet"|"summary"|"skill"}``
        Returns: ``{"ok": true, "suggestions": [...]}``
        """
        try:
            body    = request.get_json(force=True) or {}
            text    = body.get('text', '')
            context = body.get('context', 'bullet')
            if context not in ('bullet', 'summary', 'skill'):
                context = 'bullet'

            _prepopulate_spell_dict()
            suggestions = _spell_checker.check(text, context=context)
            return jsonify({'ok': True, 'suggestions': suggestions})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.get("/api/custom-dictionary")
    def custom_dictionary_get():
        """Return the current custom dictionary word list."""
        try:
            words = _spell_checker.get_custom_dict()
            return jsonify({'ok': True, 'words': words})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.post("/api/custom-dictionary")
    def custom_dictionary_add():
        """Add a word to the custom dictionary.

        Body: ``{"word": "MyTechTerm"}``
        Returns: ``{"ok": true, "added": true|false}``
        """
        try:
            body  = request.get_json(force=True) or {}
            word  = body.get('word', '').strip()
            if not word:
                return jsonify({'error': 'word is required'}), 400
            added = _spell_checker.add_word(word)
            return jsonify({'ok': True, 'added': added})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.post("/api/spell-check-complete")
    def spell_check_complete():
        """Record spell-check audit and advance phase to generation.

        Body: ``{"spell_audit": [...]}``
        Each audit entry: ``{context_type, location, original, suggestion, rule, outcome, final}``
        """
        try:
            body        = request.get_json(force=True) or {}
            spell_audit = body.get('spell_audit', [])
            result      = conversation.complete_spell_check(spell_audit)
            return jsonify({'ok': True, **result})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ------------------------------------------------------------------ #
    # ATS Validation + Page Count  (Phase 7)                              #
    # ------------------------------------------------------------------ #

    @app.get("/api/ats-validate")
    def ats_validate():
        """Run 16-check ATS validation on the latest generated CV files.

        Returns:
            ``{"ok": true, "checks": [...], "page_count": int|null,
               "summary": {"pass": N, "warn": N, "fail": N}}``
        """
        try:
            generated = conversation.state.get('generated_files')
            if not generated or not isinstance(generated, dict):
                return jsonify({'ok': False, 'error': 'No CV files generated yet'}), 400

            output_dir  = Path(generated.get('output_dir', ''))
            if not output_dir.is_dir():
                return jsonify({'ok': False, 'error': f'Output directory not found: {output_dir}'}), 404

            job_analysis = conversation.state.get('job_analysis') or {}
            if isinstance(job_analysis, str):
                import json as _json
                try:
                    job_analysis = _json.loads(job_analysis)
                except Exception:
                    job_analysis = {}

            checks, page_count = validate_ats_report(output_dir, job_analysis)

            # Cache page_count in session state
            if page_count is not None:
                conversation.state['page_count'] = page_count

            summary = {
                'pass': sum(1 for c in checks if c['status'] == 'pass'),
                'warn': sum(1 for c in checks if c['status'] == 'warn'),
                'fail': sum(1 for c in checks if c['status'] == 'fail'),
            }

            return jsonify({
                'ok':         True,
                'checks':     checks,
                'page_count': page_count,
                'summary':    summary,
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

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
