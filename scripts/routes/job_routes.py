# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Job/chat routes — job submission, URL fetch, file upload, load job file,
send message, do action, back-to-phase, re-run-phase.
"""
import dataclasses
import ipaddress
import logging
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import io as _io
import json as _json
import re as _re

import requests as _requests
from bs4 import BeautifulSoup
from flask import Blueprint, jsonify, request
from markitdown import MarkItDown as _MarkItDown
from markitdown import StreamInfo as _StreamInfo
from werkzeug.utils import safe_join

logger = logging.getLogger(__name__)

# Live blueprint module registered by `scripts.web_app.create_app()`.

from utils.llm_client import LLMError, LLMAuthError, LLMRateLimitError, LLMContextLengthError


def _json_ld_blobs_to_markdown(blobs: list) -> str:
    """Render JSON-LD blobs as human-readable markdown.

    All present fields are rendered dynamically without assuming any particular
    field name exists.  JSON-LD internal tokens (@-prefixed keys and metadata
    tokens such as sameAs and url) are always skipped.  HTML content in field
    values is stripped to plain text via BeautifulSoup.
    """
    _SKIP = frozenset({'@context', '@id', 'sameAs', 'url'})

    def _label(key: str) -> str:
        """Convert camelCase key to Title Case label."""
        return _re.sub(r'([A-Z])', r' \1', key).strip().title()

    def _strip_html(text: str) -> str:
        return BeautifulSoup(text, 'html.parser').get_text(separator='\n', strip=True)

    def _is_html(text: str) -> bool:
        return bool(_re.search(r'<[a-zA-Z][^>]*>', text))

    def _render(v, depth: int = 0) -> str:
        pad = '  ' * depth
        if v is None:
            return ''
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ''
            return _strip_html(v) if _is_html(v) else v
        if isinstance(v, (int, float, bool)):
            return str(v)
        if isinstance(v, dict):
            parts = []
            for k, sub in v.items():
                if k in _SKIP or k.startswith('@'):
                    continue
                rendered = _render(sub, depth + 1)
                if rendered:
                    if '\n' in rendered:
                        parts.append(f"{pad}  - **{_label(k)}:**\n{rendered}")
                    else:
                        parts.append(f"{pad}  - **{_label(k)}:** {rendered}")
            return '\n'.join(parts)
        if isinstance(v, list):
            items = []
            for item in v:
                rendered = _render(item, depth)
                if rendered:
                    items.append(f"{pad}- {rendered}")
            return '\n'.join(items)
        return str(v)

    # Fields shown as brief inline metadata (top of section)
    _META_KEYS = (
        'hiringOrganization', 'jobLocation', 'employmentType',
        'datePosted', 'validThrough', 'baseSalary',
    )
    # Fields shown as sub-section headers (longer content)
    _BODY_KEYS = (
        'qualifications', 'responsibilities', 'skills',
        'experienceRequirements', 'educationRequirements', 'description',
    )
    _HEADING_KEYS = ('title', 'name')

    sections = []
    for blob in blobs:
        lines: list = []
        heading = next(
            (blob[k].strip() for k in _HEADING_KEYS
             if isinstance(blob.get(k), str) and blob.get(k, '').strip()),
            None,
        )
        schema_type = blob.get('@type', '')
        if heading:
            lines.append(f"## {heading}")
        if schema_type:
            lines.append(f"*{schema_type}*")
        if lines:
            lines.append('')

        for key in _META_KEYS:
            val = blob.get(key)
            if val is None:
                continue
            rendered = _render(val)
            if not rendered:
                continue
            label = _label(key)
            if isinstance(val, (dict, list)):
                lines.append(f"**{label}:**\n{rendered}\n")
            else:
                lines.append(f"**{label}:** {rendered}\n")

        for key in _BODY_KEYS:
            val = blob.get(key)
            if val is None:
                continue
            rendered = _render(val)
            if rendered:
                lines.append(f"\n### {_label(key)}\n\n{rendered}")

        already = _SKIP | set(_HEADING_KEYS) | set(_META_KEYS) | set(_BODY_KEYS) | {'@type'}
        for key, val in blob.items():
            if key in already or key.startswith('@'):
                continue
            rendered = _render(val)
            if rendered:
                lines.append(f"\n**{_label(key)}:** {rendered}")

        if lines:
            sections.append('\n'.join(lines))

    return '\n\n---\n\n'.join(sections)


def create_blueprint(deps):
    bp = Blueprint('job', __name__)

    _get_session = deps['get_session']
    _validate_owner = deps['validate_owner']
    session_registry = deps['session_registry']
    _infer_position_name = deps['infer_position_name']
    MessageResponse = deps['MessageResponse']
    ActionResponse = deps['ActionResponse']

    @bp.post("/api/job")
    def submit_job():
        # duckflow:
        #   id: job_api_submit_live
        #   kind: api
        #   timestamp: '2026-03-25T21:39:48Z'
        #   status: live
        #   handles:
        #   - POST /api/job
        #   reads:
        #   - request:POST /api/job.job_text
        #   writes:
        #   - state:job_description
        #   - state:position_name
        #   - history:user.job_text
        #   returns:
        #   - response:POST /api/job.ok
        #   notes: Stores the submitted job text in session state, infers the position name, and appends the raw text to conversation history.
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        job_text: Optional[str] = data.get("job_text")
        if not job_text:
            return jsonify({"error": "Missing job_text"}), 400
        with entry.lock:
            conversation.add_job_description(job_text)
            conversation.state["position_name"] = _infer_position_name(job_text)
            conversation.conversation_history.append({
                "role": "user",
                "content": job_text,
            })
        session_registry.touch(sid)
        return jsonify({"ok": True, "message": "Job description added."})

    @bp.post("/api/fetch-job-url")
    def fetch_job_url():
        """Fetch job description from URL with enhanced error handling."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        url = data.get("url")

        if not url:
            return jsonify({"error": "Missing URL"}), 400

        try:
            parsed = urlparse(url)
            if not all([parsed.scheme, parsed.netloc]):
                return jsonify({"error": "Invalid URL format"}), 400

            if parsed.scheme not in ("http", "https"):
                return jsonify({"error": "Only http and https URLs are supported"}), 400

            # Block loopback and private-range addresses to prevent SSRF.
            hostname = parsed.hostname or ""
            if hostname.lower() in ("localhost", "ip6-localhost", "ip6-loopback"):
                return jsonify({"error": "URL host not permitted"}), 400
            try:
                addr = ipaddress.ip_address(hostname)
                if addr.is_loopback or addr.is_private or addr.is_link_local or addr.is_reserved:
                    return jsonify({"error": "URL host not permitted"}), 400
            except ValueError:
                pass  # hostname is a name, not a bare IP — allow normal DNS resolution

            domain = parsed.netloc.lower()

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

            for site_domain, site_info in protected_sites.items():
                if site_domain in domain:
                    return jsonify({
                        "error": f"{site_info['name']} Protection Detected",
                        "message": site_info['message'],
                        "instructions": site_info['instructions'],
                        "site_name": site_info['name'],
                        "protected_site": True
                    }), 400

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

            logger.debug("Fetching URL: %s", url)
            response = _requests.get(url, timeout=30, headers=headers, allow_redirects=True)

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

            content_type = response.headers.get('content-type', '').lower()
            logger.debug("Content type: %s", content_type)

            page_title = None  # populated by the HTML branch; used by _infer_position_name
            if 'text/plain' in content_type:
                job_text = response.text
            elif 'text/html' in content_type or 'html' in content_type:
                soup = BeautifulSoup(response.text, 'html.parser')

                # --- Structured metadata extraction (before any tag removal) ---
                json_ld_blobs: list  = []
                json_ld_title        = None
                for script_tag in soup.find_all('script', type='application/ld+json'):
                    try:
                        ld_data = _json.loads(script_tag.string or '')
                        if not isinstance(ld_data, dict):
                            continue
                        json_ld_blobs.append(ld_data)
                        if json_ld_title is None:
                            for title_key in ('title', 'name'):
                                v = ld_data.get(title_key)
                                if v and isinstance(v, str) and 3 < len(v) < 200:
                                    json_ld_title = v
                                    logger.debug("Found JSON-LD title: %s", json_ld_title)
                                    break
                    except Exception:
                        pass

                og_title = None
                meta_desc_text = None
                for meta in soup.find_all('meta'):
                    prop = meta.get('property', '') or meta.get('name', '')
                    if prop == 'og:title' and og_title is None:
                        og_title = meta.get('content', '') or None
                        logger.debug("Found og:title: %s", og_title)
                    elif prop in ('og:description', 'description') and meta_desc_text is None:
                        content = meta.get('content', '')
                        if len(content) > 100:
                            meta_desc_text = content
                            logger.debug("Found meta description (%d chars)", len(meta_desc_text))

                html_title = (soup.title.string.strip() if soup.title and soup.title.string else None)
                logger.debug("HTML <title>: %s", html_title)

                # page_title priority: JSON-LD title > og:title > HTML <title>
                page_title = json_ld_title or og_title or html_title

                # --- Strip noise elements before text extraction ---
                _noise_tags = [
                    "script", "style", "nav", "header", "footer",
                    "noscript", "aside", "iframe", "button", "form",
                ]
                for tag in soup(_noise_tags):
                    tag.decompose()
                for tag in soup.find_all(attrs={"aria-hidden": "true"}):
                    tag.decompose()
                for tag in soup.find_all(attrs={"role": "navigation"}):
                    tag.decompose()

                _stream     = _io.BytesIO(str(soup).encode('utf-8'))
                _stream_info = _StreamInfo(mimetype='text/html', charset='utf-8', url=url)
                html_text   = _MarkItDown().convert(_stream, stream_info=_stream_info).text_content

                # Detect SPA-style noise: body text is abnormally large relative to
                # a clean job page (>50 KB) but we have structured JSON-LD — means the
                # page is a client-rendered SPA (e.g. Eightfold.ai) and the extracted
                # text is dominated by embedded JSON/CSS configs, not actual content.
                _SPA_NOISE_THRESHOLD = 50_000
                _body_is_thin   = len(html_text.strip()) < 200
                _body_is_noisy  = bool(json_ld_blobs) and len(html_text) > _SPA_NOISE_THRESHOLD

                if _body_is_thin or _body_is_noisy:
                    # Page body too thin or full of SPA noise — prefer structured JSON-LD
                    if json_ld_blobs:
                        job_text = _json_ld_blobs_to_markdown(json_ld_blobs)
                        if _body_is_noisy:
                            logger.info(
                                "SPA noise detected (%d chars body) — using JSON-LD structured data",
                                len(html_text),
                            )
                        else:
                            logger.debug("Using JSON-LD structured data (body text was too short)")
                    elif meta_desc_text:
                        job_text = meta_desc_text
                        logger.debug("Using meta description (body text was too short)")
                    else:
                        job_text = html_text
                elif json_ld_blobs:
                    # Both sources available — combine rendered structured data with page text
                    blobs_md = _json_ld_blobs_to_markdown(json_ld_blobs)
                    job_text = blobs_md + "\n\n---\n\n## Page Content\n\n" + html_text
                    logger.debug("Prepended %d JSON-LD blob(s) to page content", len(json_ld_blobs))
                else:
                    job_text = html_text

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

            with entry.lock:
                conversation.add_job_description(job_text)
                conversation.state["position_name"] = _infer_position_name(
                    job_text, page_title=page_title
                )
                conversation.state["job_url"] = url
            session_registry.touch(sid)
            logger.info("Fetched %d chars from %s", len(job_text), domain)

            return jsonify({
                "ok": True,
                "job_text": job_text,
                "message": f"Job description fetched from {domain}",
                "source_url": url,
                "content_length": len(job_text)
            })

        except _requests.Timeout:
            return jsonify({
                "error": "Request Timeout",
                "message": "The website took too long to respond. Please try again or use manual text input.",
                "instructions": ["Try copying the job description manually and use the 'Paste Text' tab"]
            }), 500
        except _requests.ConnectionError:
            return jsonify({
                "error": "Connection Error",
                "message": "Unable to connect to the website. Please check the URL or your internet connection.",
                "instructions": ["Verify the URL is correct and accessible in your browser"]
            }), 500
        except _requests.RequestException:
            logger.exception("Network error fetching URL: %s", url)
            return jsonify({
                "error":        "Network Error",
                "message":      "Failed to fetch URL. Please check the URL or try manual text input.",
                "instructions": ["Try copying the job description manually and use the 'Paste Text' tab"],
            }), 500
        except Exception:
            logger.exception("Error processing URL: %s", url)
            return jsonify({
                "error":        "Processing Error",
                "message":      "Error processing URL content.",
                "instructions": ["Try copying the job description manually and use the 'Paste Text' tab"],
            }), 500

    @bp.post("/api/upload-file")
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
            if any(filename_lower.endswith(ext) for ext in ('.txt', '.md', '.rst', '.text')):
                text = raw.decode('utf-8', errors='replace')

            elif any(filename_lower.endswith(ext) for ext in ('.html', '.htm')):
                _soup = BeautifulSoup(raw, 'html.parser')
                for _tag in _soup(['script', 'style', 'head', 'nav', 'footer', 'noscript']):
                    _tag.decompose()
                _stream      = _io.BytesIO(str(_soup).encode('utf-8'))
                _stream_info = _StreamInfo(mimetype='text/html', charset='utf-8')
                text         = _MarkItDown().convert(_stream, stream_info=_stream_info).text_content

            elif filename_lower.endswith('.pdf'):
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(_io.BytesIO(raw))
                    pages = [page.extract_text() or '' for page in reader.pages]
                    text = '\n\n'.join(pages)
                except ImportError:
                    return jsonify({"error": "PDF support not available. Run: pip install pypdf"}), 500

            elif filename_lower.endswith('.docx'):
                try:
                    import mammoth
                    result = mammoth.extract_raw_text(_io.BytesIO(raw))
                    text = result.value
                except ImportError:
                    try:
                        from docx import Document
                        doc = Document(_io.BytesIO(raw))
                        text = '\n'.join(p.text for p in doc.paragraphs)
                    except ImportError:
                        return jsonify({"error": "DOCX support not available. Run: pip install python-docx"}), 500

            elif filename_lower.endswith('.doc'):
                return jsonify({
                    "error": "Legacy .doc format not supported",
                    "message": "Please save the file as .docx or copy-paste the content."
                }), 400

            elif filename_lower.endswith('.rtf'):
                import re as _re
                text_bytes = raw.decode('latin-1', errors='replace')
                text = _re.sub(r'\\[a-z]+\d*\s?|[{}]', ' ', text_bytes)

            else:
                try:
                    text = raw.decode('utf-8', errors='replace')
                except Exception:
                    return jsonify({
                        "error": f"Unsupported file type: {filename_lower.rsplit('.', 1)[-1]}",
                        "message": "Supported formats: txt, md, html, pdf, docx, rtf"
                    }), 400

            import re as _re
            text = _re.sub(r'\n{3,}', '\n\n', text).strip()

            if len(text) < 50:
                return jsonify({
                    "error": "Insufficient Content",
                    "message": "The file appears to be empty or contains no readable text.",
                    "content_length": len(text)
                }), 400

            logger.info("Uploaded file '%s': extracted %d characters", f.filename, len(text))
            return jsonify({
                "ok":             True,
                "text":           text,
                "filename":       f.filename,
                "content_length": len(text),
            })

        except Exception:
            logger.exception("Error reading uploaded file")
            return jsonify({"error": "Error reading file."}), 500

    @bp.post("/api/load-job-file")
    def load_job_file():
        """Load a job description from a file."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        if not filename:
            return jsonify({"error": "Missing filename"}), 400

        sample_jobs_root = Path(__file__).parent.parent.parent / "sample_jobs"
        safe_name = safe_join(str(sample_jobs_root), filename)
        if safe_name is None:
            return jsonify({"error": "Invalid filename."}), 400
        job_file_path = Path(safe_name)

        if not job_file_path.exists():
            cv_files_root = Path.home() / "CV" / "files"
            safe_cv_name  = safe_join(str(cv_files_root), filename)
            if safe_cv_name is not None:
                cv_path = Path(safe_cv_name)
                if cv_path.exists():
                    job_file_path = cv_path

        if not job_file_path.exists():
            return jsonify({"error": f"File not found: {filename}"}), 404

        try:
            with open(job_file_path, 'r', encoding='utf-8') as f:
                job_text = f.read()

            with entry.lock:
                conversation.add_job_description(job_text)
                conversation.state["position_name"] = _infer_position_name(job_text)
            session_registry.touch(sid)

            return jsonify({
                "ok": True,
                "job_text": job_text,
                "message": f"Loaded job description from {filename}"
            })
        except Exception:
            logger.exception("Failed to load job file: %s", filename)
            return jsonify({"error": "Failed to load file."}), 500

    @bp.post("/api/message")
    def send_message():
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        msg: Optional[str] = data.get("message")
        if not msg:
            return jsonify({"error": "Missing message"}), 400
        try:
            with entry.lock:
                response = conversation._process_message(msg)
            session_registry.touch(sid)
            return jsonify(dataclasses.asdict(MessageResponse(
                ok=True,
                response=response,
                phase=conversation.state.get("phase"),
            )))
        except LLMAuthError:
            logger.exception("LLM auth error in /api/message")
            return jsonify({"error": "Authentication failed. Please check your API key.", "error_type": "auth"}), 401
        except LLMRateLimitError:
            logger.exception("LLM rate limit in /api/message")
            return jsonify({"error": "Rate limit reached. Please wait and try again.", "error_type": "rate_limit"}), 429
        except LLMContextLengthError:
            logger.exception("LLM context length exceeded in /api/message")
            return jsonify({"error": "Message too long for this model.", "error_type": "context_length"}), 400
        except LLMError:
            logger.exception("LLM provider error in /api/message")
            return jsonify({"error": "An AI provider error occurred. Please try again.", "error_type": "provider"}), 502
        except Exception:
            logger.exception("Unexpected error in /api/message")
            return jsonify({"error": "Failed to process message."}), 500

    @bp.post("/api/action")
    def do_action():
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        action = data.get("action")
        if not action:
            return jsonify({"error": "Missing action"}), 400

        payload = {"action": action}
        if data.get("job_text"):
            payload["job_text"] = data["job_text"]
        if data.get("user_preferences"):
            payload["user_preferences"] = data["user_preferences"]

        try:
            with entry.lock:
                result = conversation._execute_action(payload)
            if not result:
                return jsonify({"error": "Invalid or unsupported action"}), 400
            session_registry.touch(sid)
            return jsonify(dataclasses.asdict(ActionResponse(
                ok=True,
                result=result,
                phase=conversation.state.get("phase"),
            )))
        except LLMAuthError:
            logger.exception("LLM auth error in /api/action")
            return jsonify({"error": "Authentication failed. Please check your API key.", "error_type": "auth"}), 401
        except LLMRateLimitError:
            logger.exception("LLM rate limit in /api/action")
            return jsonify({"error": "Rate limit reached. Please wait and try again.", "error_type": "rate_limit"}), 429
        except LLMContextLengthError:
            logger.exception("LLM context length exceeded in /api/action")
            return jsonify({"error": "Message too long for this model.", "error_type": "context_length"}), 400
        except LLMError:
            logger.exception("LLM provider error in /api/action")
            return jsonify({"error": "An AI provider error occurred. Please try again.", "error_type": "provider"}), 502
        except Exception:
            logger.exception("Unexpected error in /api/action")
            return jsonify({"error": "Action execution failed."}), 500

    @bp.post("/api/back-to-phase")
    def back_to_phase():
        """Navigate back to a prior phase without clearing downstream state."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        target = data.get("phase")
        if not target:
            return jsonify({"error": "Missing phase"}), 400
        try:
            with entry.lock:
                result = conversation.back_to_phase(target)
                feedback = (data.get("feedback") or "").strip()
                if feedback:
                    conversation.conversation_history.append({
                        "role": "user",
                        "content": f"[Refinement feedback for {target}]: {feedback}",
                    })
            session_registry.touch(sid)
            return jsonify(result)
        except Exception:
            logger.exception("Failed to navigate back to phase")
            return jsonify({"error": "Failed to navigate back to phase."}), 500

    @bp.post("/api/re-run-phase")
    def re_run_phase():
        """Re-execute the LLM call for a phase with downstream context preserved."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        target = data.get("phase")
        if not target:
            return jsonify({"error": "Missing phase"}), 400
        try:
            with entry.lock:
                result = conversation.re_run_phase(target)
            if not result.get("ok"):
                return jsonify(result), 400
            session_registry.touch(sid)
            return jsonify(result)
        except Exception:
            logger.exception("Failed to re-run phase")
            return jsonify({"error": "Failed to re-run phase."}), 500

    return bp
