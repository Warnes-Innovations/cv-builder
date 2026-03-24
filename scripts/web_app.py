#!/usr/bin/env python3
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Minimal Web UI for LLM-Driven CV Generator

Serves a single-page web app with endpoints to:
- Submit a job description
- Send chat messages to the assistant
- View current state
- Save session

Run:
    python scripts/web_app.py

Then open http://localhost:5001
"""

import argparse
import copy
import dataclasses
import json
import logging
import os
import shutil
import subprocess
import sys
import threading
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

from flask import Flask, jsonify, redirect, request, send_file, send_from_directory, url_for
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

from utils.config import get_config, validate_config, ConfigurationError, setup_logging
from utils.llm_client import get_llm_provider, PROVIDER_MODELS, PROVIDER_BILLING, MODEL_INFO
from utils.cv_orchestrator import CVOrchestrator, validate_ats_report
from utils.conversation_manager import ConversationManager, Phase
from utils.llm_client import LLMError, LLMAuthError, LLMRateLimitError, LLMContextLengthError
from utils.copilot_auth import CopilotAuthManager
from utils.pricing_cache import (
    get_cached_pricing, get_pricing_updated_at, get_pricing_source,
    refresh_pricing_cache, maybe_refresh_in_background, lookup_runtime_pricing_bulk, STATIC_PRICING,
)
from utils.spell_checker import SpellChecker
from utils.master_data_validator import validate_master_data_file
from utils.bibtex_parser import (
    parse_bibtex_file,
    format_publication,
    serialize_publications_to_bibtex,
    bibtex_text_to_publications,
)
from utils.session_registry import (
    SessionRegistry, SessionNotFoundError, SessionOwnedError
)


# ---------------------------------------------------------------------------
# API response DTOs — typed dataclasses for the most critical endpoints.
#
# Using dataclasses ensures:
#   • All fields are always present in the JSON response (no silent omissions).
#   • Shape changes (field additions / renames) surface as TypeError at the call site.
#   • The expected response contract is documented in one place.
#
# JS mirror validators live in web/app.js (parseStatusResponse, etc.).
# Update both sides together when adding/removing fields.
# ---------------------------------------------------------------------------

@dataclass
class StatusResponse:
    """Response shape for GET /api/status."""

    position_name: Optional[str]
    phase: Optional[str]
    llm_provider: str
    llm_model: Optional[str]
    job_description: bool
    job_description_text: Optional[str]
    job_analysis: Optional[Dict[str, Any]]
    post_analysis_questions: List[Any]
    post_analysis_answers: Dict[str, Any]
    customizations: Optional[Dict[str, Any]]
    generated_files: Optional[Dict[str, Any]]
    generation_progress: List[Any]
    persuasion_warnings: List[Any]
    all_experience_ids: List[str]
    all_experiences: List[Dict[str, Any]]
    all_skills: List[Any]
    all_achievements: List[Any]
    professional_summaries: Dict[str, Any]
    copilot_auth: Dict[str, Any]
    iterating: bool
    reentry_phase: Optional[str]
    experience_decisions: Dict[str, Any]
    skill_decisions: Dict[str, Any]
    achievement_decisions: Dict[str, Any]
    publication_decisions: Dict[str, Any]
    summary_focus_override: Optional[str]
    extra_skills: List[Any]
    extra_skill_matches: Dict[str, List[str]]
    session_file: str
    max_skills: int
    achievement_edits: Dict[str, Any]
    intake: Dict[str, Any]


@dataclass
class SessionItem:
    """One entry in the SessionListResponse."""

    path: str
    position_name: str
    timestamp: str
    phase: str
    has_job: bool
    has_analysis: bool
    has_customizations: bool


@dataclass
class SessionListResponse:
    """Response shape for GET /api/sessions."""

    sessions: List[SessionItem]

    def to_dict(self) -> Dict[str, Any]:
        return {"sessions": [dataclasses.asdict(s) for s in self.sessions]}


@dataclass
class RewritesResponse:
    """Response shape for GET /api/rewrites."""

    ok: bool
    rewrites: List[Any]
    persuasion_warnings: List[Any]
    phase: str


@dataclass
class MessageResponse:
    """Response shape for POST /api/message."""

    ok: bool
    response: Any
    phase: Optional[str]


@dataclass
class ActionResponse:
    """Response shape for POST /api/action."""

    ok: bool
    result: Any
    phase: Optional[str]


# ---------------------------------------------------------------------------
# Model-catalog helpers (module-level for testability)
# ---------------------------------------------------------------------------

_CATALOG_LIST_MODELS_CAPABLE: set[str] = {"openai", "anthropic", "gemini", "groq"}
_CATALOG_STATIC_ONLY: set[str] = {"copilot-oauth", "copilot", "github", "local"}


def _frontend_project_root() -> Path:
    """Return the repository root for frontend bundle checks."""
    return Path(__file__).resolve().parent.parent


_FRONTEND_IMPORT_RE = re.compile(
    r'["\'](?P<spec>[^"\']+)["\']',
)


def _iter_frontend_import_specs(source: str) -> List[str]:
    """Extract relative import specs from single-line import/export statements."""
    specs: List[str] = []
    for line in source.splitlines():
        stripped = line.strip()
        if not stripped.startswith(('import ', 'export ')):
            continue
        if stripped.startswith('export ') and ' from ' not in stripped:
            continue

        match = _FRONTEND_IMPORT_RE.search(stripped)
        if match:
            specs.append(match.group('spec'))

    return specs


def _resolve_frontend_bundle_import(importer: Path, spec: str) -> Optional[Path]:
    """Resolve a relative JS import used by the bundle entrypoint graph."""
    if not spec.startswith('.'):
        return None

    candidate = (importer.parent / spec).resolve()
    if candidate.is_file():
        return candidate

    if candidate.suffix:
        return None

    for resolved in (candidate.with_suffix('.js'), candidate / 'index.js'):
        if resolved.is_file():
            return resolved

    return None


def _frontend_bundle_inputs(project_root: Path) -> List[Path]:
    resolved_project_root = project_root.resolve()
    build_script = project_root / 'scripts' / 'build.mjs'
    entrypoint = project_root / 'web' / 'src' / 'main.js'
    inputs: List[Path] = []

    if build_script.exists():
        inputs.append(build_script)

            "pricing_source":       get_pricing_source(),
        })

    @app.post("/api/model-pricing/refresh")
    def refresh_model_pricing():
        """Refresh the pricing cache. Fetches live prices from OpenRouter; falls back to static."""
        pricing = refresh_pricing_cache()
        return jsonify({
            "ok":          True,
            "updated_at":  get_pricing_updated_at(),
            "source":      get_pricing_source(),
            "model_count": len(pricing),
        })

    @app.post("/api/model")
    def set_model():
        """Switch the active model and optionally the provider."""
        nonlocal llm_client, _provider_name, _current_model

        def _format_probe_error(provider_name: str, probe_error: Optional[str]) -> str:
            if not probe_error:
                return "Model probe failed."

            friendly = probe_error.strip()
            if provider_name == "github":
                friendly = friendly.replace("with OpenAI", "with GitHub Models")
                friendly = friendly.replace("by OpenAI", "by GitHub Models")
                friendly = friendly.replace("(openai)", "(github)")
            return friendly

        def _probe_client(candidate_client) -> tuple[bool, Optional[str]]:
            """Run a minimal chat call to ensure model/provider is reachable."""
            try:
                candidate_client.chat(
                    messages=[{"role": "user", "content": "Reply with one word: ready"}],
                    temperature=0,
                    max_tokens=8,
                )
                return True, None
            except Exception as exc:
                return False, str(exc)

        data     = request.get_json(silent=True) or {}
        model    = data.get("model", "").strip()
        provider = (data.get("provider") or _provider_name).strip()
        if not model:
            return jsonify({"error": "Missing model"}), 400
        available = PROVIDER_MODELS.get(provider, [])
        # Providers with dynamic model catalogs (e.g., list_models-backed) can
        # accept models beyond the static catalog. Enforce strict validation only
        # for providers that are intentionally static.
        static_only = {"copilot-oauth", "copilot", "github", "local"}
        if provider in static_only and available and model not in available:
            return jsonify({"error": f"Unknown model '{model}' for provider '{provider}'"}), 400
        try:
            candidate_client = get_llm_provider(provider=provider, model=model, auth_manager=auth_manager)
            ok, probe_error = _probe_client(candidate_client)
            if not ok:
                formatted_error = _format_probe_error(provider, probe_error)
                return jsonify({
                    "error": f"Model '{model}' is not currently available for provider '{provider}'. {formatted_error}",
                    "provider": provider,
                    "model": model,
                }), 400

            llm_client     = candidate_client
            _provider_name = provider
            _current_model = model
            # Update all active sessions with the new LLM client
            for _entry in session_registry.all_active():
                _entry.orchestrator.llm = llm_client
                _entry.manager.llm = llm_client

            # If the caller supplied a session_id, persist the chosen
            # provider/model into that session's state so it survives reloads.
            entry = _get_session(required=False, allow_missing=True)
            if entry:
                try:
                    _validate_owner(entry)
                    conv = entry.manager
                    conv.state["provider"] = provider
                    conv.state["model"] = model
                    conv._save_session()
                    session_registry.touch(entry.session_id)
                except Exception:
                    # Preserve original behavior even if session write fails
                    pass

            return jsonify({"ok": True, "provider": provider, "model": model})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.post("/api/model/test")
    def test_model():
        """Smoke-test the active LLM: send a minimal 1-token prompt.

        Returns {ok, provider, model, latency_ms} on success or
        {ok: false, error, provider, model} on failure.
        """
        import time
        t0 = time.monotonic()
        try:
            llm_client.chat(
                messages=[{"role": "user", "content": "Reply with one word: ready"}],
            )
            latency_ms = round((time.monotonic() - t0) * 1000)
            return jsonify({
                "ok":         True,
                "provider":   _provider_name,
                "model":      _current_model,
                "latency_ms": latency_ms,
            })
        except Exception as exc:
            return jsonify({
                "ok":       False,
                "error":    str(exc),
                "provider": _provider_name,
                "model":    _current_model,
            }), 200   # 200 so JS can read the body regardless

    # ── Job / chat endpoints ──────────────────────────────────────────────────

    @app.post("/api/job")
    def submit_job():
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        job_text: Optional[str] = data.get("job_text")
        if not job_text:
            return jsonify({"error": "Missing job_text"}), 400
        with entry.lock:
            # Store job description in state and also add to conversation history
            conversation.add_job_description(job_text)
            conversation.state["position_name"] = _infer_position_name(job_text)
            conversation.conversation_history.append({
                "role": "user",
                "content": job_text,
            })
        session_registry.touch(sid)
        return jsonify({"ok": True, "message": "Job description added."})
    
    @app.post("/api/fetch-job-url")
    def fetch_job_url():
        """Fetch job description from URL with enhanced error handling"""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
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
            with entry.lock:
                conversation.add_job_description(job_text)
                conversation.state["position_name"] = _infer_position_name(job_text)
            session_registry.touch(sid)
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
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
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

            with entry.lock:
                # Store job description in state
                conversation.add_job_description(job_text)
                conversation.state["position_name"] = _infer_position_name(job_text)
            session_registry.touch(sid)

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
        entry = _get_session()
        conversation = entry.manager
        try:
            names = conversation._list_positions()
            return jsonify({"positions": names})
        except Exception as e:
            return jsonify({"error": str(e), "positions": []}), 500

    @app.post("/api/position")
    def set_position():
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        open_latest = bool(data.get("open_latest"))
        if not name:
            return jsonify({"error": "Missing name"}), 400
        with entry.lock:
            conversation.state["position_name"] = name
            loaded = False
            if open_latest:
                loaded = conversation._load_latest_session_for_position(name)
        session_registry.touch(sid)
        return jsonify({"ok": True, "loaded": loaded, "position_name": name})

    @app.post("/api/message")
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
        except LLMAuthError as e:
            logger.warning("LLM auth error in /api/message: %s", e)
            return jsonify({"error": str(e), "error_type": "auth"}), 401
        except LLMRateLimitError as e:
            logger.warning("LLM rate limit in /api/message: %s", e)
            return jsonify({"error": str(e), "error_type": "rate_limit"}), 429
        except LLMContextLengthError as e:
            logger.warning("LLM context length in /api/message: %s", e)
            return jsonify({"error": str(e), "error_type": "context_length"}), 400
        except LLMError as e:
            logger.error("LLM provider error in /api/message: %s", e)
            return jsonify({"error": str(e), "error_type": "provider"}), 502
        except Exception as e:
            # Comprehensive error logging
            logger.error(
                "ERROR in /api/message endpoint: %s (msg: %s)",
                type(e).__name__,
                msg[:100] if len(msg) > 100 else msg,
                exc_info=True
            )
            return jsonify({"error": str(e)}), 500

    @app.post("/api/rename-current-session")
    def rename_current_session():
        """Rename the currently active session (no path needed)."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        new_name = (data.get("new_name") or "").strip()[:200]
        if not new_name:
            return jsonify({"error": "Missing new_name"}), 400
        with entry.lock:
            conversation.state["position_name"] = new_name
            conversation._save_session()
        session_registry.touch(sid)
        return jsonify({"ok": True, "new_name": new_name})

    @app.post("/api/rename-session")
    def rename_session():
        """Rename a session's position_name in its session.json file."""
        # This is a disk-level rename; it does NOT require an active session_id.
        data = request.get_json(silent=True) or {}
        path     = data.get("path")
        new_name = (data.get("new_name") or "").strip()[:200]
        if not path:
            return jsonify({"error": "Missing path"}), 400
        if not new_name:
            return jsonify({"error": "Missing new_name"}), 400
        session_file = Path(path)
        if not session_file.exists():
            return jsonify({"error": f"Session not found: {path}"}), 404
        # Safety: must be inside the configured output base
        try:
            cfg = get_config()
            output_base = Path(cfg.get("data.output_dir", "~/CV/files")).expanduser()
            if not session_file.resolve().is_relative_to(output_base.resolve()):
                return jsonify({"error": "Path is outside the output directory"}), 400
        except Exception:
            pass  # if we can't verify, proceed (path existence check above is sufficient)
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                session_data = json.load(f)
            session_data.setdefault("state", {})["position_name"] = new_name
            with open(session_file, "w", encoding="utf-8") as f:
                json.dump(session_data, f, indent=2, default=str)
            # If this is an active in-memory session, sync in-memory state too
            for _entry in session_registry.all_active():
                _active = getattr(_entry.manager, "session_file", None)
                if _active and str(Path(_active).resolve()) == str(session_file.resolve()):
                    _entry.manager.state["position_name"] = new_name
                    _entry.manager._save_session()
            return jsonify({"ok": True, "new_name": new_name})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _usage_prompt_tokens(usage) -> int | None:
        """Extract prompt/input token count from a provider usage object or dict."""
        if usage is None:
            return None
        if isinstance(usage, dict):
            return usage.get("prompt_tokens") or usage.get("input_tokens")
        return (
            getattr(usage, "prompt_tokens", None)
            or getattr(usage, "input_tokens", None)
        )

    @app.get("/api/context-stats")
    def context_stats():
        """Return a rough token-usage estimate for the current session."""
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        MODEL_CONTEXT_WINDOWS = {
            "gemini-2.5-pro":    2_000_000,
            "gemini-2.5-flash":  1_048_576,
            "gemini-2.0-flash":  1_048_576,
            "gemini-1.5-pro":    2_000_000,
            "gemini-1.5-flash":  1_048_576,
            "gpt-4o":              128_000,
            "gpt-4o-mini":         128_000,
            "gpt-4-turbo":         128_000,
            "o1":                  200_000,
            "o3-mini":             200_000,
            "claude-3-5-sonnet":   200_000,
            "claude-3-5-haiku":    200_000,
            "claude-3-opus":       200_000,
            "llama":               128_000,
        }
        try:
            model_name     = getattr(orchestrator.llm, "model", "") or ""
            context_window = 128_000
            for key, size in MODEL_CONTEXT_WINDOWS.items():
                if key.lower() in model_name.lower():
                    context_window = size
                    break

            # Prefer exact prompt-token count from the last API response; fall back to
            # a char-based estimate (chars / 4) when no real usage is available yet.
            real_tokens  = _usage_prompt_tokens(getattr(orchestrator.llm, "last_usage", None))
            if real_tokens is not None:
                token_count  = real_tokens
                token_source = "exact"
            else:
                state_chars   = len(json.dumps(conversation.state, default=str))
                history_chars = sum(len(str(m.get("content", ""))) for m in conversation.conversation_history)
                base_overhead = 4_000  # boilerplate in the system prompt
                token_count   = (state_chars + history_chars + base_overhead) // 4
                token_source  = "estimated"

            return jsonify({
                "ok":               True,
                "estimated_tokens": token_count,
                "token_source":     token_source,
                "context_window":   context_window,
                "model":            model_name,
                "history_messages": len(conversation.conversation_history),
            })
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

    @app.post("/api/generation-settings")
    def update_generation_settings():
        """Update per-session generation settings (max_skills, etc.).

        Request body: ``{"max_skills": int}``
        All fields are optional; only provided fields are updated.
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        if "max_skills" in data:
            v = data["max_skills"]
            if not isinstance(v, int) or not (1 <= v <= 100):
                return jsonify({"error": "max_skills must be an integer between 1 and 100"}), 400
            with entry.lock:
                conversation.state["max_skills"] = v
                conversation._save_session()
        else:
            with entry.lock:
                conversation._save_session()
        session_registry.touch(sid)
        cfg_default = get_config().get("generation.max_skills", 20)
        return jsonify({
            "ok": True,
            "max_skills": int(conversation.state.get("max_skills") or cfg_default),
        })

    @app.post("/api/post-analysis-responses")
    def post_analysis_responses():
        """Persist generated post-analysis questions and user answers into session state."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
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
                    "question": question_text[:2000],
                })

        cleaned_answers = {}
        for key, value in answers.items():
            clean_key = str(key).strip().lower().replace(" ", "_")[:40]
            if not clean_key:
                continue
            clean_value = str(value).strip()
            if clean_value:
                cleaned_answers[clean_key] = clean_value[:1000]

        with entry.lock:
            conversation.state["post_analysis_questions"] = cleaned_questions
            conversation.state["post_analysis_answers"] = cleaned_answers
            conversation._save_session()
        session_registry.touch(sid)

        return jsonify({
            "ok": True,
            "questions_count": len(cleaned_questions),
            "answers_count": len(cleaned_answers),
        })

    @app.post("/api/save")
    def save():
        entry = _get_session()
        conversation = entry.manager
        try:
            with entry.lock:
                conversation._save_session()
            session_file = str(conversation.session_dir / "session.json") if conversation.session_dir else None
            return jsonify({"ok": True, "session_file": session_file})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/sessions")
    def list_sessions():
        """List saved sessions, most recent first."""
        try:
            from utils.config import get_config
            cfg = get_config()
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash_dir   = output_base / '.trash'
            sessions = []
            if output_base.exists():
                for session_file in sorted(output_base.rglob("session.json"), reverse=True):
                    # Exclude anything inside .trash
                    if trash_dir in session_file.parents:
                        continue
                    try:
                        import json as _json
                        with open(session_file) as f:
                            data = _json.load(f)
                        state = data.get('state', {})
                        sessions.append(SessionItem(
                            path=str(session_file),
                            position_name=state.get('position_name') or session_file.parent.name,
                            timestamp=data.get('timestamp', ''),
                            phase=state.get('phase', ''),
                            has_job=bool(state.get('job_description')),
                            has_analysis=bool(state.get('job_analysis')),
                            has_customizations=bool(state.get('customizations')),
                        ))
                    except Exception:
                        pass
            return jsonify(SessionListResponse(sessions=sessions[:20]).to_dict())  # cap at 20 most recent
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
            trash_dir   = output_base / '.trash'
            if output_base.exists():
                for session_file in sorted(output_base.rglob("session.json"), reverse=True):
                    if trash_dir in session_file.parents:
                        continue
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
        """Load a saved session file and register it in the session registry."""
        data = request.get_json(silent=True) or {}
        path = data.get("path")
        if not path:
            return jsonify({"error": "Missing path"}), 400
        session_file = Path(path)
        if not session_file.exists():
            return jsonify({"error": f"Session file not found: {path}"}), 404
        try:
            sid, entry = session_registry.load_from_file(str(session_file), _app_config)
            conversation = entry.manager
            return jsonify({
                "ok":            True,
                "session_id":    sid,
                "redirect_url":  f"/?session={sid}",
                "session_file":  str(session_file),
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
        """Move a session directory to the .trash folder (recoverable).

        Accepts a JSON body with either:
        - ``path``: full path to a ``session.json`` file → moves its parent
          directory into ``<output_base>/.trash/``.
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
            trash_dir   = output_base / '.trash'

            def _move_to_trash(job_dir: Path):
                """Move job_dir into .trash, handling name collisions."""
                trash_dir.mkdir(parents=True, exist_ok=True)
                dest = trash_dir / job_dir.name
                if dest.exists():
                    dest = trash_dir / f"{job_dir.name}_{int(datetime.now().timestamp())}"
                import shutil as _shutil
                _shutil.move(str(job_dir), str(dest))
                print(f"Trashed: {job_dir} → {dest}")

            # ── Preferred: caller supplies the full session.json path ──────────
            candidate = Path(path_param)
            if candidate.exists() and candidate.name == 'session.json':
                job_dir = candidate.parent
                if job_dir.resolve().is_relative_to(output_base.resolve()):
                    _move_to_trash(job_dir)
                    return jsonify({"success": True, "message": "Session moved to Trash"})
                else:
                    return jsonify({"error": "Path is outside the output directory"}), 400

            # ── Fallback: match by directory name or position name ────────────
            deleted = False
            for session_file in output_base.rglob('session.json'):
                if trash_dir in session_file.parents:
                    continue
                job_dir = session_file.parent
                if path_param in job_dir.name or job_dir.name == path_param:
                    _move_to_trash(job_dir)
                    deleted = True
                    break

            if deleted:
                return jsonify({"success": True, "message": "Session moved to Trash"})
            return jsonify({"error": f"Session not found: {path_param}"}), 404

        except Exception as e:
            print(f"ERROR in delete_session: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.get("/api/trash")
    def list_trash():
        """List sessions in the .trash folder."""
        try:
            cfg = get_config()
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash_dir   = output_base / '.trash'
            items = []
            if trash_dir.exists():
                for session_file in sorted(trash_dir.rglob("session.json"), reverse=True):
                    try:
                        import json as _json
                        with open(session_file) as f:
                            data = _json.load(f)
                        state = data.get('state', {})
                        items.append({
                            "path":          str(session_file),
                            "position_name": state.get('position_name') or session_file.parent.name,
                            "timestamp":     data.get('timestamp', ''),
                            "phase":         state.get('phase', ''),
                        })
                    except Exception:
                        pass
            return jsonify({"items": items, "count": len(items)})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/trash/restore")
    def trash_restore():
        """Restore a trashed session back to the output directory."""
        data = request.get_json(silent=True) or {}
        path_param = data.get("path")
        if not path_param:
            return jsonify({"error": "Missing path"}), 400
        try:
            cfg = get_config()
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash_dir   = output_base / '.trash'
            candidate   = Path(path_param)
            if not candidate.exists() or candidate.name != 'session.json':
                return jsonify({"error": "Session file not found"}), 404
            job_dir = candidate.parent
            if not job_dir.resolve().is_relative_to(trash_dir.resolve()):
                return jsonify({"error": "Path is not inside trash"}), 400
            dest = output_base / job_dir.name
            if dest.exists():
                dest = output_base / f"{job_dir.name}_restored_{int(datetime.now().timestamp())}"
            import shutil as _shutil
            _shutil.move(str(job_dir), str(dest))
            print(f"Restored: {job_dir} → {dest}")
            return jsonify({"success": True, "message": "Session restored"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/trash/delete")
    def trash_delete_one():
        """Permanently delete a single item from trash."""
        data = request.get_json(silent=True) or {}
        path_param = data.get("path")
        if not path_param:
            return jsonify({"error": "Missing path"}), 400
        try:
            cfg = get_config()
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash_dir   = output_base / '.trash'
            candidate   = Path(path_param)
            if not candidate.exists() or candidate.name != 'session.json':
                return jsonify({"error": "Session file not found"}), 404
            job_dir = candidate.parent
            if not job_dir.resolve().is_relative_to(trash_dir.resolve()):
                return jsonify({"error": "Path is not inside trash"}), 400
            import shutil as _shutil
            _shutil.rmtree(job_dir)
            print(f"Permanently deleted: {job_dir}")
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/trash/empty")
    def trash_empty():
        """Permanently delete everything in the .trash folder."""
        try:
            cfg = get_config()
            output_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash_dir   = output_base / '.trash'
            if trash_dir.exists():
                import shutil as _shutil
                _shutil.rmtree(trash_dir)
                trash_dir.mkdir()
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/action")
    def do_action():
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
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
        except LLMAuthError as e:
            logger.warning("LLM auth error in /api/action: %s", e)
            return jsonify({"error": str(e), "error_type": "auth"}), 401
        except LLMRateLimitError as e:
            logger.warning("LLM rate limit in /api/action: %s", e)
            return jsonify({"error": str(e), "error_type": "rate_limit"}), 429
        except LLMContextLengthError as e:
            logger.warning("LLM context length in /api/action: %s", e)
            return jsonify({"error": str(e), "error_type": "context_length"}), 400
        except LLMError as e:
            logger.error("LLM provider error in /api/action: %s", e)
            return jsonify({"error": str(e), "error_type": "provider"}), 502
        except Exception as e:
            logger.error("Action execution error: %s", e, exc_info=True)
            return jsonify({"error": str(e)}), 500

    @app.post("/api/back-to-phase")
    def back_to_phase():
        """Navigate back to a prior phase without clearing downstream state.

        Body: ``{"phase": "analysis"|"customizations"|"rewrite"|"spell"|...,
                 "feedback": "optional refinement note"}``
        Resolves frontend step labels to internal phase strings automatically.
        If ``feedback`` is provided it is injected as a user message so the
        next LLM call sees it as context.
        """
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
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/re-run-phase")
    def re_run_phase():
        """Re-execute the LLM call for a phase with downstream context preserved.

        Body: ``{"phase": "analysis"|"customizations"|"rewrite"}``
        Returns ``{ok, phase, prior_output, new_output}``.
        """
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
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/intake-metadata")
    def intake_metadata():
        """Return extracted or confirmed intake metadata for the current session.

        If intake has already been confirmed (``state.intake.confirmed == True``),
        the stored values are returned as-is.  Otherwise the fields are extracted
        heuristically from the stored job description text.

        Response: ``{role, company, date_applied, confirmed}``
        """
        entry = _get_session()
        conversation = entry.manager
        intake = conversation.state.get('intake') or {}
        if intake.get('confirmed'):
            return jsonify({
                'role':         intake.get('role'),
                'company':      intake.get('company'),
                'date_applied': intake.get('date_applied'),
                'confirmed':    True,
            })
        extracted = conversation.extract_intake_metadata()
        return jsonify({
            'role':         extracted.get('role'),
            'company':      extracted.get('company'),
            'date_applied': extracted.get('date_applied'),
            'confirmed':    False,
        })

    @app.post("/api/confirm-intake")
    def confirm_intake():
        """Persist user-confirmed intake metadata and immediately save the session.

        Body: ``{company, role, date_applied}``
        All fields are optional; missing/blank fields are stored as ``None``.
        Session is persisted synchronously so the intake record survives a page reload.

        Response: ``{ok, intake: {role, company, date_applied, confirmed}}``
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        intake = {
            'role':         (data.get('role') or '').strip() or None,
            'company':      (data.get('company') or '').strip() or None,
            'date_applied': (data.get('date_applied') or '').strip() or None,
            'confirmed':    True,
        }
        with entry.lock:
            conversation.state['intake'] = intake
            if intake.get('role') and intake.get('company'):
                conversation.state['position_name'] = f"{intake['role']} at {intake['company']}"
            elif intake.get('role'):
                conversation.state['position_name'] = intake['role']
            elif intake.get('company'):
                conversation.state['position_name'] = intake['company']
            conversation._save_session()
        session_registry.touch(sid)
        return jsonify({'ok': True, 'intake': intake})

    @app.get("/api/prior-clarifications")
    def prior_clarifications():
        """Return prior post-analysis answers from the most recent session with a similar role.

        Searches persisted sessions by keyword overlap between the current
        session's ``intake.role`` and each candidate session's ``intake.role``.
        Sessions lacking ``post_analysis_answers`` are skipped.

        Query param: ``?limit=3`` (default 3, max 10)
        Response: ``{found, matches: [{position_name, role, company, date, answers, overlap}]}``
        """
        entry = _get_session()
        conversation = entry.manager
        current_intake = conversation.state.get('intake') or {}
        current_role   = (current_intake.get('role') or '').lower()

        limit = min(int(request.args.get('limit', 3)), 10)

        _STOP = {
            'a', 'an', 'the', 'of', 'in', 'at', 'for', 'to', 'and', 'or',
            'is', 'be', 'with', 'on', 'by', 'senior', 'junior', 'lead',
        }

        def _kw(role: str) -> set:
            return {w for w in role.split() if w not in _STOP and len(w) > 2}

        current_kw = _kw(current_role)

        try:
            from utils.config import get_config as _get_cfg
            cfg      = _get_cfg()
            out_base = Path(cfg.get('data.output_dir', '~/CV/files')).expanduser()
            trash    = out_base / '.trash'
            matches  = []
            for sf in sorted(out_base.rglob('session.json'), reverse=True):
                if trash in sf.parents:
                    continue
                try:
                    with open(sf, 'r', encoding='utf-8') as fh:
                        sd = json.load(fh)
                    st      = sd.get('state', {})
                    answers = st.get('post_analysis_answers') or {}
                    if not answers:
                        continue
                    prior_intake = st.get('intake') or {}
                    prior_role   = (prior_intake.get('role') or st.get('position_name') or '').lower()
                    overlap      = current_kw & _kw(prior_role)
                    if not overlap:
                        continue
                    matches.append({
                        'position_name': st.get('position_name'),
                        'role':          prior_intake.get('role'),
                        'company':       prior_intake.get('company'),
                        'date':          prior_intake.get('date_applied') or sd.get('timestamp', '')[:10],
                        'answers':       answers,
                        'overlap':       sorted(overlap),
                    })
                    if len(matches) >= limit:
                        break
                except Exception:
                    pass
            return jsonify({'found': len(matches) > 0, 'matches': matches})
        except Exception as e:
            return jsonify({'found': False, 'matches': [], 'error': str(e)})

    @app.get("/api/synonym-lookup")
    def synonym_lookup():
        """Look up the canonical form of a skill or keyword via the synonym map.

        Query param: ``?term=ML``
        Returns ``{term, canonical, found}`` — ``found`` is False when no
        mapping exists (canonical == term in that case).
        """
        entry = _get_session()
        conversation = entry.manager
        term = request.args.get("term", "").strip()
        if not term:
            return jsonify({"error": "Missing term query parameter"}), 400
        canonical = conversation.orchestrator.canonical_skill_name(term)
        return jsonify({"term": term, "canonical": canonical, "found": canonical != term})

    @app.get("/api/synonym-map")
    def synonym_map():
        """Return the full synonym map as ``{alias: canonical}``."""
        entry = _get_session()
        conversation = entry.manager
        return jsonify(conversation.orchestrator._synonym_map)

    @app.post("/api/reorder-bullets")
    def reorder_bullets():
        """Persist a user-defined bullet ordering for one experience.

        Body: ``{"experience_id": "exp_001", "order": [2, 0, 1]}``
        ``order`` is a list of original achievement indices in the desired
        display order.  Pass an empty list to reset to relevance-sorted order.
        Returns ``{ok: true}``.
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
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
            with entry.lock:
                achievement_orders = conversation.state.setdefault("achievement_orders", {})
                if order:
                    achievement_orders[exp_id] = [int(i) for i in order]
                else:
                    achievement_orders.pop(exp_id, None)  # reset → use auto relevance sort
                conversation._save_session()
            session_registry.touch(sid)
            return jsonify({"ok": True, "experience_id": exp_id, "order": order})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/api/proposed-bullet-order")
    def proposed_bullet_order():
        """Return relevance-ranked bullet order for one experience based on job keywords.

        Query param: ``?experience_id=exp_001``
        Returns ``{"proposed_order": [2, 0, 1], "has_job_analysis": true}``.
        Indices are original achievement positions sorted by keyword relevance (highest first).
        Returns natural order when no job analysis is available.
        """
        entry = _get_session()
        conversation = entry.manager
        exp_id = request.args.get("experience_id")
        if not exp_id:
            return jsonify({"error": "Missing experience_id"}), 400
        try:
            master_data = conversation.orchestrator.master_data
            experiences_list = master_data.get("experiences") or master_data.get("experience", [])
            experience = next((e for e in experiences_list if e.get("id") == exp_id), None)
            if not experience:
                return jsonify({"error": f"Experience {exp_id} not found"}), 404

            achievements = list(experience.get("achievements") or [])
            if not achievements:
                return jsonify({"proposed_order": [], "has_job_analysis": False})

            job_analysis = conversation.state.get("job_analysis") or {}
            job_keywords = {kw.lower() for kw in job_analysis.get("ats_keywords", [])}

            if not job_keywords:
                return jsonify({
                    "proposed_order": list(range(len(achievements))),
                    "has_job_analysis": False,
                })

            def ach_score(ach):
                text = (ach.get("text", "") if isinstance(ach, dict) else str(ach)).lower()
                tokens = set(re.findall(r'\b\w+\b', text))
                return len(tokens & job_keywords)

            proposed = sorted(range(len(achievements)), key=lambda i: ach_score(achievements[i]), reverse=True)
            return jsonify({"proposed_order": proposed, "has_job_analysis": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/reorder-rows")
    def reorder_rows():
        """Persist a user-defined row ordering for experiences or skills.

        Body: ``{"type": "experience"|"skill", "ordered_ids": ["exp_001", ...]}``
        Pass an empty list to reset to relevance-scored order.
        Returns ``{ok: true}``.
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        row_type   = data.get("type")
        ordered_ids = data.get("ordered_ids")
        if row_type not in ("experience", "skill"):
            return jsonify({"error": "type must be 'experience' or 'skill'"}), 400
        if ordered_ids is None:
            return jsonify({"error": "Missing ordered_ids"}), 400
        if not isinstance(ordered_ids, list):
            return jsonify({"error": "ordered_ids must be a list"}), 400
        state_key = "experience_row_order" if row_type == "experience" else "skill_row_order"
        try:
            with entry.lock:
                if ordered_ids:
                    conversation.state[state_key] = [str(i) for i in ordered_ids]
                else:
                    conversation.state.pop(state_key, None)
                conversation._save_session()
            session_registry.touch(sid)
            return jsonify({"ok": True, "type": row_type, "ordered_ids": ordered_ids})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.post("/api/post-analysis-draft-response")
    def post_analysis_draft_response():
        """Use the LLM to draft an answer for a single clarification question."""
        entry = _get_session()
        conversation = entry.manager
        try:
            body          = request.get_json(force=True) or {}
            question      = (body.get('question') or '').strip()
            question_type = (body.get('question_type') or '').strip()
            analysis      = body.get('analysis') or {}

            if not question:
                return jsonify({'ok': False, 'error': 'question required'}), 400

            existing_answers = conversation.state.get('post_analysis_answers') or {}

            context_items: List[str] = []
            if isinstance(analysis, dict):
                for key, label in [('job_title', 'Job Title'), ('company_name', 'Company'),
                                   ('role_level', 'Role Level'), ('domain', 'Domain')]:
                    if analysis.get(key):
                        context_items.append(f"{label}: {analysis[key]}")
            context = '\n'.join(context_items) or 'Not available'

            prior_answers_block = (
                '\n'.join(f'- {k}: {v}' for k, v in list(existing_answers.items())[:6])
                if existing_answers else 'None yet.'
            )

            prompt = (
                'You are helping a job applicant answer a clarifying question about their CV preferences.\n'
                'The question was asked to better tailor their CV for a specific job.\n\n'
                f'Job context:\n{context}\n\n'
                f'Previously answered questions:\n{prior_answers_block}\n\n'
                f'Question to answer:\n"{question}"\n\n'
                'Write a concise, first-person DRAFT answer (1–3 sentences) the applicant could give.\n'
                'Base it on the most sensible choice for someone applying to this role.\n'
                'Write only the answer text. No preamble, no labels.'
            )

            try:
                draft = llm_client.chat(
                    messages=[
                        {'role': 'system', 'content': 'You write concise draft answers for job application clarifying questions.'},
                        {'role': 'user',   'content': prompt},
                    ],
                    temperature=0.7,
                    # No max_tokens cap: thinking-capable models (e.g. Gemini 2.0 Flash)
                    # count reasoning tokens against max_output_tokens, so a 200-token
                    # limit leaves only a handful of tokens for the visible response.
                    # The prompt already constrains output to 1-3 sentences.
                )
            except Exception as e:
                err_str = str(e)
                if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower() or 'rate' in err_str.lower():
                    return jsonify({'ok': False, 'error': 'Rate limit reached — please wait a moment and try again.', 'rate_limited': True}), 429
                return jsonify({'ok': False, 'error': f'LLM error: {e}'}), 500

            return jsonify({'ok': True, 'text': draft.strip()})
        except Exception as e:
            return jsonify({'ok': False, 'error': str(e)}), 500


    @app.post("/api/post-analysis-questions")
    def post_analysis_questions():
        """Generate post-analysis clarifying questions, preferably via LLM."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}

        analysis = _coerce_to_dict(
            data.get("analysis") or conversation.state.get("job_analysis")
        )

        if not analysis:
            return jsonify({"ok": True, "questions": []})

        # Pass prior answers so the LLM avoids re-asking already-covered topics.
        prior_qa = conversation.state.get("post_analysis_answers") or None

        questions: List[Dict[str, str]] = []
        source = "fallback"
        try:
            questions = _generate_post_analysis_questions(
                analysis=analysis,
                job_text=conversation.state.get("job_description"),
                prior_qa=prior_qa,
            )
            if questions:
                source = "llm"
        except Exception as e:
            print(f"Question generation failed, using fallback: {e}")

        if not questions:
            questions = _fallback_post_analysis_questions(analysis)

        with entry.lock:
            conversation.state["post_analysis_questions"] = questions
            conversation._save_session()
        session_registry.touch(sid)

        return jsonify({"ok": True, "questions": questions, "source": source})

    @app.get("/api/history")
    def history():
        # Return the conversation history for chat-style rendering
        entry = _get_session()
        conversation = entry.manager
        return jsonify({
            "history": conversation.conversation_history,
            "phase": conversation.state.get("phase"),
        })

    def normalize_experience_id(exp_id):
        """Return the experience ID unchanged for direct lookup against master data."""
        return exp_id
    
    @app.post("/api/experience-details")
    def get_experience_details():
        entry = _get_session()
        conversation = entry.manager
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
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
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
                extra_skills = data.get('extra_skills', [])
                if extra_skills:
                    conversation.state['extra_skills'] = extra_skills

                raw_matches = data.get('extra_skill_matches') or {}
                sanitized_matches: Dict[str, List[str]] = {}
                valid_ids = {
                    (exp.get('id') or '').strip()
                    for exp in (conversation.orchestrator.master_data.get('experience') or [])
                    if isinstance(exp, dict) and (exp.get('id') or '').strip()
                }
                if isinstance(raw_matches, dict):
                    for skill_name, exp_ids in raw_matches.items():
                        if not isinstance(skill_name, str) or not skill_name.strip():
                            continue
                        if isinstance(exp_ids, str):
                            exp_ids = [x.strip() for x in exp_ids.split(',') if x.strip()]
                        if not isinstance(exp_ids, list):
                            continue
                        cleaned = []
                        seen = set()
                        for exp_id in exp_ids:
                            if not isinstance(exp_id, str):
                                continue
                            exp_id = exp_id.strip()
                            if not exp_id or exp_id not in valid_ids or exp_id in seen:
                                continue
                            cleaned.append(exp_id)
                            seen.add(exp_id)
                        if cleaned:
                            sanitized_matches[skill_name.strip()] = cleaned
                conversation.state['extra_skill_matches'] = sanitized_matches

                # Mirror extra-skill decisions into customizations so render/generation
                # paths can use them without relying on separate top-level state.
                customizations = dict(conversation.state.get('customizations') or {})
                customizations['extra_skills'] = conversation.state.get('extra_skills') or []
                customizations['extra_skill_matches'] = sanitized_matches
                conversation.state['customizations'] = customizations
                message = f"Saved decisions for {len(decisions)} skills"
            elif decision_type == 'achievements':
                conversation.state['achievement_decisions'] = decisions
                accepted_suggestions = data.get('accepted_suggestions', [])
                if accepted_suggestions:
                    conversation.state['accepted_suggested_achievements'] = accepted_suggestions
                message = f"Saved decisions for {len(decisions)} achievements" + (
                    f" (+{len(accepted_suggestions)} AI suggestions accepted)" if accepted_suggestions else ""
                )
            elif decision_type == 'publications':
                conversation.state['publication_decisions'] = decisions
                message = f"Saved decisions for {len(decisions)} publications"
            elif decision_type == 'summary_focus':
                # decisions is a single string key here
                conversation.state['summary_focus_override'] = decisions
                message = "Saved summary focus preference"
            else:
                return jsonify({"error": f"Invalid type: {decision_type}"}), 400
            
            # Save the updated state
            conversation._save_session()

            print(f"Saved {decision_type} decisions: {decisions}")
            session_registry.touch(sid)
            return jsonify({"success": True, "message": message})

        except Exception as e:
            print(f"ERROR in save_review_decisions: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/save-achievement-edits', methods=['POST'])
    def save_achievement_edits():
        """Save per-experience achievement edits from the achievements editor tab."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.json or {}
        edits = data.get('edits', {})
        if not edits:
            return jsonify({"error": "No edits provided"}), 400
        # Convert string keys (from JSON) to int if needed
        normalized = {int(k): v for k, v in edits.items() if str(k).lstrip("-").isdigit()}
        with entry.lock:
            conversation.state['achievement_edits'] = normalized
            conversation._save_session()
        session_registry.touch(sid)
        total = sum(len(v) for v in normalized.values())
        return jsonify({"success": True, "message": f"Saved edits for {len(normalized)} experiences ({total} achievements)"})

    @app.route('/api/rewrite-achievement', methods=['POST'])
    def rewrite_achievement():
        """Ask the LLM to rewrite a single achievement bullet."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        orchestrator = entry.orchestrator
        data = request.json or {}
        achievement_text = data.get('achievement_text', '').strip()
        experience_index = data.get('experience_index')
        user_instructions    = data.get('user_instructions', '').strip()
        previous_suggestions = data.get('previous_suggestions') or []
        if not isinstance(previous_suggestions, list):
            previous_suggestions = []

        if not achievement_text:
            return jsonify({"error": "achievement_text is required"}), 400

        # Gather context: experience title + job description
        experience_context = ''
        exp_idx = None
        if experience_index is not None:
            try:
                exp_idx = int(experience_index)
                _master, _ = _load_master(orchestrator.master_data_path)
                experiences = _master.get('experience', [])
                if 0 <= exp_idx < len(experiences):
                    exp = experiences[exp_idx]
                    title   = exp.get('title', exp.get('position', ''))
                    company = exp.get('company', exp.get('organization', ''))
                    experience_context = f"{title} at {company}".strip(' at')
            except (ValueError, TypeError, OSError):
                pass

        achievement_index = data.get('achievement_index')
        ach_idx = None
        if achievement_index is not None:
            try:
                ach_idx = int(achievement_index)
            except (ValueError, TypeError):
                ach_idx = None

        job_description = conversation.state.get('job_description') or ''

        try:
            rewritten = llm_client.rewrite_achievement(
                achievement_text=achievement_text,
                experience_context=experience_context,
                job_description=job_description,
                user_instructions=user_instructions,
                previous_suggestions=previous_suggestions,
            )
            log_id = conversation.log_achievement_rewrite(
                original_text=achievement_text,
                experience_context=experience_context,
                user_instructions=user_instructions,
                previous_suggestions=previous_suggestions,
                suggested_text=rewritten,
                experience_index=exp_idx,
                achievement_index=ach_idx,
            )
            return jsonify({"rewritten": rewritten, "log_id": log_id})
        except Exception as e:
            print(f"ERROR rewriting achievement: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route('/api/rewrite-achievement-outcome', methods=['POST'])
    def rewrite_achievement_outcome():
        """Record the user's accept/reject decision for an AI rewrite suggestion."""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        data = request.json or {}
        log_id = data.get('log_id', '').strip()
        outcome = data.get('outcome', '').strip()
        accepted_text = data.get('accepted_text') or None

        if not log_id:
            return jsonify({"error": "log_id is required"}), 400
        if outcome not in ('accepted', 'rejected'):
            return jsonify({"error": "outcome must be 'accepted' or 'rejected'"}), 400

        found = conversation.update_achievement_rewrite_outcome(
            log_id=log_id,
            outcome=outcome,
            accepted_text=accepted_text,
        )
        if not found:
            return jsonify({"error": "log_id not found"}), 404
        return jsonify({"ok": True})

    @app.route('/api/cv-data', methods=['GET'])
    def get_cv_data():
        """Get current CV data for editing"""
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
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
                all_skills = conversation.normalize_skills_data(skills_data)
                cv_data['skills'] = all_skills
            
            return jsonify(cv_data)
            
        except Exception as e:
            print(f"ERROR in get_cv_data: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/cv-data', methods=['POST'])
    def save_cv_data():
        """Save edited CV data"""
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            # Store the edited CV data in the conversation state for now
            # In a full implementation, you'd want to update the master data file
            with entry.lock:
                conversation.state['edited_cv_data'] = data
                conversation._save_session()
            session_registry.touch(sid)
            
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
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        orchestrator = entry.orchestrator
        sid = entry.session_id
        try:
            # Return cached rewrites on restore rather than re-running the LLM
            stored_rewrites = conversation.state.get('pending_rewrites')
            if stored_rewrites:
                return jsonify(dataclasses.asdict(RewritesResponse(
                    ok=True,
                    rewrites=stored_rewrites,
                    persuasion_warnings=conversation.state.get('persuasion_warnings', []),
                    phase=Phase.REWRITE_REVIEW,
                )))

            job_analysis = conversation.state.get('job_analysis')
            if not job_analysis:
                return jsonify({"error": "Job analysis not available. Analyse the job first."}), 400

            content = orchestrator.master_data
            if not content:
                return jsonify({"error": "CV master data not loaded."}), 400

            rewrites = orchestrator.propose_rewrites(
                content,
                job_analysis,
                conversation_history=conversation.conversation_history,
                user_preferences=conversation.state.get('post_analysis_answers'),
            )
            conversation.state['pending_rewrites'] = rewrites

            # Run persuasion quality checks (Phase 10)
            if rewrites:
                persuasion_warnings = conversation.run_persuasion_checks(
                    rewrites,
                    job_analysis,
                    orchestrator.master_data
                )
                conversation.state['persuasion_warnings'] = persuasion_warnings
            else:
                conversation.state['persuasion_warnings'] = []

            if rewrites:
                conversation.state['phase'] = Phase.REWRITE_REVIEW
                phase = Phase.REWRITE_REVIEW
            else:
                # No proposals (no LLM or nothing to rewrite) — skip review step
                phase = Phase.GENERATION

            conversation._save_session()
            session_registry.touch(sid)
            return jsonify(dataclasses.asdict(RewritesResponse(
                ok=True,
                rewrites=rewrites,
                persuasion_warnings=conversation.state.get('persuasion_warnings', []),
                phase=phase,
            )))

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
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        data = request.get_json(silent=True) or {}
        decisions = data.get('decisions')
        if decisions is None:
            return jsonify({"error": "Missing decisions"}), 400
        if not isinstance(decisions, list):
            return jsonify({"error": "decisions must be a list"}), 400

        try:
            with entry.lock:
                summary = conversation.submit_rewrite_decisions(decisions)
            session_registry.touch(sid)
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
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        sid = entry.session_id
        try:
            # Return cached recommendations if available.
            cached = conversation.state.get('publication_recommendations')
            if cached is not None:
                return jsonify({"ok": True, "recommendations": cached, "source": "cache",
                                "total_count": len(cached)})

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
                if not recommendations:
                    raise RuntimeError("LLM returned no publication recommendations")
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
                        'confidence':        'Medium',
                        'rationale':         '',
                        'authority_signals': [],
                        'venue_warning':     '' if (pub.get('journal') or pub.get('booktitle')) else 'No venue found',
                        'formatted_citation': pub.get('formatted', ''),
                    })
                source = "fallback"

            # Mark LLM-recommended publications and add any remaining pubs as not recommended.
            recommended_keys = {r['cite_key'] for r in recommendations}
            for r in recommendations:
                r['is_recommended'] = True

            if orchestrator.publications:
                try:
                    from utils.bibtex_parser import format_publication as _fmt_pub
                except ImportError:
                    _fmt_pub = None
                not_recommended = []
                for key, pub in orchestrator.publications.items():
                    if key in recommended_keys:
                        continue
                    if _fmt_pub:
                        try:
                            formatted = _fmt_pub(pub, style='apa')
                        except Exception:
                            formatted = ''
                    else:
                        formatted = ''
                    if not formatted:
                        formatted = f"{pub.get('authors', '')} ({pub.get('year', '')}). {pub.get('title', '')}".strip('. ')
                    not_recommended.append({
                        'cite_key':          key,
                        'title':             pub.get('title', ''),
                        'venue':             pub.get('journal') or pub.get('booktitle') or '',
                        'year':              pub.get('year', ''),
                        'is_first_author':   False,
                        'relevance_score':   0,
                        'confidence':        '',
                        'rationale':         '',
                        'authority_signals': [],
                        'venue_warning':     '' if (pub.get('journal') or pub.get('booktitle')) else 'No venue found',
                        'formatted_citation': formatted,
                        'is_recommended':    False,
                    })
                not_recommended.sort(key=lambda p: -int(str(p['year']).strip() or '0'))
                recommendations.extend(not_recommended)

            conversation.state['publication_recommendations'] = recommendations
            conversation._save_session()
            session_registry.touch(sid)

            total_count = len(recommendations)
            return jsonify({"ok": True, "recommendations": recommendations, "source": source, "total_count": total_count})

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.get("/api/download/<filename>")
    def download_file(filename):
        """Download generated CV files"""
        entry = _get_session()
        conversation = entry.manager
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

    def _prepopulate_spell_dict(orchestrator_inst) -> None:
        """Load domain terms and proper nouns from master data into the custom dictionary."""
        try:
            master = orchestrator_inst.master_data or {}
            skills = master.get('skills', {})
            all_names: list = []

            def _collect_names(values) -> None:
                for value in values or []:
                    if isinstance(value, dict):
                        name = (
                            value.get('name', '')
                            or value.get('title', '')
                            or value.get('degree', '')
                            or value.get('institution', '')
                            or value.get('company', '')
                            or value.get('issuer', '')
                            or value.get('language', '')
                            or value.get('proficiency', '')
                        )
                        if name:
                            all_names.append(str(name))
                    elif value:
                        all_names.append(str(value))

            if isinstance(skills, dict):
                for cat_skills in skills.values():
                    if isinstance(cat_skills, list):
                        _collect_names(cat_skills)
            elif isinstance(skills, list):
                _collect_names(skills)

            pinfo = master.get('personal_info', {})
            all_names.extend(filter(None, [
                pinfo.get('name', ''),
                pinfo.get('title', ''),
            ]))

            for exp in master.get('experience', []) or []:
                if isinstance(exp, dict):
                    all_names.extend(filter(None, [
                        exp.get('company', ''),
                        exp.get('title', ''),
                    ]))

            for edu in master.get('education', []) or []:
                if isinstance(edu, dict):
                    all_names.extend(filter(None, [
                        edu.get('institution', ''),
                        edu.get('degree', ''),
                        edu.get('field', ''),
                    ]))

            for award in master.get('awards', []) or []:
                if isinstance(award, dict):
                    all_names.extend(filter(None, [
                        award.get('degree', ''),
                        award.get('title', ''),
                    ]))

            for cert in master.get('certifications', []) or []:
                if isinstance(cert, dict):
                    all_names.extend(filter(None, [
                        cert.get('name', ''),
                        cert.get('issuer', ''),
                    ]))

            for lang in pinfo.get('languages', []) or []:
                if isinstance(lang, dict):
                    all_names.extend(filter(None, [
                        lang.get('language', ''),
                        lang.get('proficiency', ''),
                    ]))
                else:
                    all_names.append(str(lang))

            _spell_checker.prepopulate_from_skills(all_names)
        except Exception:
            pass

    @app.get("/api/spell-check-sections")
    def spell_check_sections():
        """Return the text sections that need spell checking for the current session.

        Covers the professional summary and every non-omitted achievement bullet
        from the selected work experiences, with approved rewrites already applied
        so the spell-checked text matches what the CV will actually render.
        """
        entry = _get_session()
        conversation = entry.manager
        orchestrator = entry.orchestrator
        sections = []

        def _append_section(section_id: str, label: str, text: str, context: str = 'skill') -> None:
            text = (text or '').strip()
            if not text:
                return
            sections.append({
                'id':      section_id,
                'label':   label,
                'text':    text,
                'context': context,
            })
        try:
            state             = conversation.state
            job_analysis      = state.get('job_analysis') or {}
            customizations    = state.get('customizations') or {}
            approved_rewrites = state.get('approved_rewrites') or []
            spell_audit       = state.get('spell_audit') or []

            _prepopulate_spell_dict(orchestrator)
            selected_content = orchestrator.build_render_ready_content(
                job_analysis,
                customizations,
                approved_rewrites=approved_rewrites,
                spell_audit=spell_audit,
                max_skills=state.get('max_skills'),
                use_semantic_match=False,
            )

            cv_data = orchestrator._prepare_cv_data_for_template(selected_content, job_analysis)

            _append_section('summary', 'Professional Summary', cv_data.get('professional_summary', ''), 'summary')

            for i, ach in enumerate(selected_content.get('achievements', []) or []):
                text = ach.get('text', '') if isinstance(ach, dict) else str(ach)
                _append_section(f'selected_ach_{i}', f'Selected Achievement {i + 1}', text, 'bullet')

            for idx, skill in enumerate(selected_content.get('skills', []) or []):
                if isinstance(skill, dict):
                    rendered_skill = skill.get('name', '')
                    if skill.get('years'):
                        rendered_skill += f" ({skill['years']} yrs)"
                else:
                    rendered_skill = str(skill)
                _append_section(f'skill_{idx}', f'Skill {idx + 1}', rendered_skill, 'skill')

            for idx, edu in enumerate(selected_content.get('education', []) or []):
                if not isinstance(edu, dict):
                    continue
                _append_section(f'edu_{idx}_degree', f'Education {idx + 1} — Degree', edu.get('degree', ''), 'skill')
                _append_section(f'edu_{idx}_field', f'Education {idx + 1} — Field', edu.get('field', ''), 'skill')
                _append_section(f'edu_{idx}_institution', f'Education {idx + 1} — Institution', edu.get('institution', ''), 'skill')

            for idx, award in enumerate(selected_content.get('awards', []) or []):
                if not isinstance(award, dict):
                    continue
                _append_section(
                    f'award_{idx}_title',
                    f'Award {idx + 1}',
                    award.get('degree', '') or award.get('title', ''),
                    'skill',
                )

            for idx, cert in enumerate(selected_content.get('certifications', []) or []):
                if not isinstance(cert, dict):
                    continue
                _append_section(f'cert_{idx}_name', f'Certification {idx + 1} — Name', cert.get('name', ''), 'skill')
                _append_section(f'cert_{idx}_issuer', f'Certification {idx + 1} — Issuer', cert.get('issuer', ''), 'skill')

            for idx, lang in enumerate(selected_content.get('personal_info', {}).get('languages', []) or []):
                if isinstance(lang, dict):
                    _append_section(f'lang_{idx}_language', f'Language {idx + 1}', lang.get('language', ''), 'skill')
                    _append_section(f'lang_{idx}_proficiency', f'Language {idx + 1} — Proficiency', lang.get('proficiency', ''), 'skill')
                else:
                    _append_section(f'lang_{idx}', f'Language {idx + 1}', str(lang), 'skill')

            for idx, pub in enumerate(selected_content.get('publications', []) or []):
                if not isinstance(pub, dict):
                    continue
                if pub.get('formatted'):
                    _append_section(f'pub_{idx}_formatted', f'Publication {idx + 1}', pub.get('formatted', ''), 'skill')
                else:
                    _append_section(f'pub_{idx}_title', f'Publication {idx + 1} — Title', pub.get('title', ''), 'skill')
                    _append_section(f'pub_{idx}_authors', f'Publication {idx + 1} — Authors', pub.get('authors', ''), 'skill')
                    _append_section(f'pub_{idx}_journal', f'Publication {idx + 1} — Venue', pub.get('journal', '') or pub.get('booktitle', ''), 'skill')

            # Experience bullets from every selected experience (rewrites already applied)
            for exp in cv_data.get('experiences', []) or []:
                exp_id  = exp.get('id', '')
                company = exp.get('company', 'Experience')
                role    = exp.get('title', '')
                label   = f"{company} \u2014 {role}" if role else company

                ach_list = exp.get('ordered_achievements') or exp.get('achievements') or []
                for i, ach in enumerate(ach_list):
                    text = ach.get('text', '') if isinstance(ach, dict) else str(ach)
                    _append_section(f"exp_{exp_id}_ach_{i}", f"{label} (bullet {i + 1})", text, 'bullet')

        except Exception as e:
            return jsonify({'error': str(e)}), 500

        aggregate_stats = _spell_checker.aggregate_stats([s['text'] for s in sections])
        return jsonify({
            'ok':               True,
            'sections':         sections,
            'aggregate_stats':  aggregate_stats,
            'custom_dict_size': len(_spell_checker.get_custom_dict()),
        })

    @app.post("/api/spell-check")
    def spell_check_text():
        """Check a single text fragment.

        Body: ``{"text": "...", "context": "bullet"|"summary"|"skill"}``
        Returns: ``{"ok": true, "suggestions": [...]}``
        """
        entry = _get_session()
        orchestrator = entry.orchestrator
        try:
            body    = request.get_json(force=True) or {}
            text    = body.get('text', '')
            context = body.get('context', 'bullet')
            if context not in ('bullet', 'summary', 'skill'):
                context = 'bullet'

            _prepopulate_spell_dict(orchestrator)
            result = _spell_checker.check(text, context=context)
            custom_dict_size = len(_spell_checker.get_custom_dict())
            return jsonify({
                'ok':              True,
                'suggestions':     result['suggestions'],
                'stats':           result['stats'],
                'custom_dict_size': custom_dict_size,
            })
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
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        try:
            body        = request.get_json(force=True) or {}
            spell_audit = body.get('spell_audit', [])
            with entry.lock:
                result = conversation.complete_spell_check(spell_audit)
            session_registry.touch(sid)
            return jsonify({'ok': True, **result})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ------------------------------------------------------------------ #
    # Layout Instructions (Phase 12)                                      #
    # ------------------------------------------------------------------ #

    @app.get("/api/layout-html")
    def get_layout_html():
        """Return the HTML content of the most recently generated CV.

        Reads the ``.html`` file from the session's generated output directory.
        Used by the layout-preview panel on first load when tabData.cv has no
        inline HTML.

        Returns: ``{"ok": true, "html": "..."}`` or ``{"error": "..."}``
        """
        entry = _get_session()
        conversation = entry.manager
        try:
            generated = conversation.state.get('generated_files')
            if not generated or not isinstance(generated, dict):
                return jsonify({'error': 'No generated CV found — generate your CV first.'}), 404
            output_dir = Path(generated.get('output_dir', ''))
            if not output_dir.is_dir():
                return jsonify({'error': f'Output directory not found: {output_dir}'}), 404
            html_files = sorted(output_dir.glob('*.html'))
            if not html_files:
                return jsonify({'error': 'No HTML file found in output directory.'}), 404
            html_content = html_files[0].read_text(encoding='utf-8', errors='replace')
            return jsonify({'ok': True, 'html': html_content})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.post("/api/layout-instruction")
    def apply_layout_instruction():
        """Apply a natural-language layout instruction to the current HTML.

        Body: ``{"instruction": "Move Publications after Skills", "current_html": "..."}``
            Optional: ``"prior_instructions": [...]``

        Returns:
            Success: ``{"ok": true, "html": "...", "summary": "...", "confidence": 0.95}``
            Clarification: ``{"ok": false, "error": "clarify", "question": "..."}``
            Error: ``{"ok": false, "error": "error_type", "details": "..."}``
        """
        entry = _get_session()
        conversation = entry.manager
        try:
            body = request.get_json(force=True) or {}
            instruction_text = body.get('instruction', '').strip()
            current_html = body.get('current_html', '')
            prior_instructions = body.get('prior_instructions', [])

            if not instruction_text:
                return jsonify({'error': 'Missing instruction text'}), 400
            if not current_html:
                return jsonify({'error': 'Missing current HTML'}), 400

            # Call orchestrator to apply instruction
            result = conversation.orchestrator.apply_layout_instruction(
                instruction_text=instruction_text,
                current_html=current_html,
                prior_instructions=prior_instructions
            )

            if result.get('error'):
                return jsonify({
                    'ok':           False,
                    'error':        result['error'],
                    'question':     result.get('question'),
                    'details':      result.get('details'),
                    'confidence':   result.get('confidence'),
                    'raw_response': result.get('raw_response'),
                })

            return jsonify({
                'ok': True,
                'html': result['html'],
                'summary': result['summary'],
                'confidence': result['confidence']
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.get("/api/layout-history")
    def get_layout_history():
        """Return the current session's applied layout instruction history.

        Returns:
            ``{"instructions": [...], "count": int}``
        """
        entry = _get_session()
        conversation = entry.manager
        try:
            instructions = conversation.state.get('layout_instructions')
            if not instructions:
                instructions = (
                    conversation.state.get('generation_state', {}).get('layout_instructions', [])
                )
            return jsonify({
                'instructions': instructions,
                'count': len(instructions)
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.post("/api/layout-complete")
    def complete_layout_review():
        """Record layout instruction outcomes and advance phase to refinement (finalise).

        Body: ``{"layout_instructions": [...]}``
        Each instruction should have: ``{timestamp, instruction_text, change_summary, confirmation}``

        Returns:
            ``{"ok": true, "instructions_applied": int, "phase": "refinement"}``
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        try:
            body = request.get_json(force=True) or {}
            layout_instructions = body.get('layout_instructions', [])
            if not layout_instructions:
                layout_instructions = (
                    conversation.state.get('layout_instructions')
                    or conversation.state.get('generation_state', {}).get('layout_instructions', [])
                )
            with entry.lock:
                result = conversation.complete_layout_review(layout_instructions)
            session_registry.touch(sid)
            return jsonify({'ok': True, **result})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.post("/api/layout-settings")
    def update_layout_settings():
        """Persist layout display settings to session state.

        Supported keys:
          ``base_font_size`` — CSS font size string, e.g. ``"10px"`` or ``"11px"``.

        Returns:
            ``{"ok": true}``
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid          = entry.session_id
        try:
            body = request.get_json(force=True) or {}
            with entry.lock:
                if 'base_font_size' in body:
                    raw = str(body['base_font_size']).strip()
                    # Accept bare numbers ("10") or values with unit ("10px")
                    if not raw.endswith('px'):
                        raw = raw + 'px'
                    conversation.state['base_font_size'] = raw
                    # Keep customizations dict in sync if it already exists
                    if 'customizations' in conversation.state:
                        conversation.state['customizations']['base_font_size'] = raw
                conversation._save_session()
            session_registry.touch(sid)
            return jsonify({'ok': True})
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
        entry = _get_session()
        conversation = entry.manager
        sid = entry.session_id
        try:
            generated = conversation.state.get('generated_files')
            if not generated or not isinstance(generated, dict):
                return jsonify({'ok': False, 'error': 'No CV files generated yet'}), 400

            output_dir  = Path(generated.get('output_dir', ''))
            if not output_dir.is_dir():
                return jsonify({'ok': False, 'error': f'Output directory not found: {output_dir}'}), 404

            job_analysis = _coerce_to_dict(conversation.state.get('job_analysis'))

            checks, page_count = validate_ats_report(output_dir, job_analysis)

            # Cache page_count in session state
            if page_count is not None:
                conversation.state['page_count'] = page_count

            summary = {
                'pass': sum(1 for c in checks if c['status'] == 'pass'),
                'warn': sum(1 for c in checks if c['status'] == 'warn'),
                'fail': sum(1 for c in checks if c['status'] == 'fail'),
            }

            # Cache validation results for finalise (includes page_count and all checks)
            conversation.state['validation_results'] = {
                'page_count': page_count,
                'checks': checks,
                'summary': summary,
                'validation_date': datetime.now().isoformat(),
            }
            session_registry.touch(sid)

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

    @app.get("/api/persuasion-check")
    def persuasion_check():
        """Run rule-based persuasion checks on selected experience bullets.

        Returns
        -------
        ``{"ok": true, "findings": [...], "summary": {total_bullets, flagged,
           strong_count}}``

        Each finding has: ``exp_id``, ``bullet_index``, ``text``, ``severity``,
        ``issues`` (list of ``{type, severity, suggestion}``).
        """
        entry = _get_session()
        conversation = entry.manager
        try:
            experiences = None

            # Use selected_content stored during generation if available
            generated = conversation.state.get('generated_files')
            if generated:
                # Re-derive selected content from current state
                job_analysis   = _coerce_to_dict(conversation.state.get('job_analysis'))
                customizations = conversation.state.get('customizations') or {}
                try:
                    selected = conversation.orchestrator._select_content_hybrid(
                        job_analysis, customizations
                    )
                    experiences = selected.get('experiences', [])
                except Exception:
                    experiences = None

            # Fallback: analyse raw master data experiences
            if experiences is None:
                experiences = (
                    conversation.orchestrator.master_data.get('experience')
                    or conversation.orchestrator.master_data.get('experiences')
                    or []
                )

            result = conversation.orchestrator.check_persuasion(experiences)
            return jsonify({'ok': True, **result})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    # ── Phase 11: Finalise & Archive ────────────────────────────────────────

    # ── Staged Generation Routes (GAP-20 Phase 1) ─────────────────────────────
    # Contract: tasks/contracts/phase0-contract.md

    @app.get("/api/cv/generation-state")
    def get_generation_state():
        """Return staged generation phase and metadata (no raw HTML)."""
        entry = _get_session()
        gen   = entry.manager.state.get("generation_state") or {}
        return jsonify({
            "ok":                        True,
            "phase":                     gen.get("phase", "idle"),
            "preview_available":         bool(gen.get("preview_html")),
            "layout_confirmed":          gen.get("layout_confirmed", False),
            "page_count_estimate":       gen.get("page_count_estimate"),
            "page_length_warning":       gen.get("page_length_warning", False),
            "layout_instructions_count": len(gen.get("layout_instructions", [])),
            "ats_score":                 gen.get("ats_score"),
            "final_generated_at":        gen.get("final_generated_at"),
        })

    @app.post("/api/cv/generate-preview")
    def generate_cv_preview():
        """Generate an HTML preview of the CV and store it in generation_state.

        Renders the HTML template from current CV state (job_analysis +
        customizations + approved rewrites + spell audit).  Falls back to the
        most recent HTML file on disk when the customisation data is incomplete.

        Returns the rendered HTML so the frontend can display it immediately
        without a second round-trip to /api/layout-html.
        """
        import uuid as _u
        entry = _get_session()
        conv  = entry.manager
        if not conv.state.get("job_analysis"):
            return jsonify({"error": "Run job analysis first."}), 400

        html_str = None

        # ── Try to render fresh HTML from current CV state ──────────────────
        customizations = conv.state.get("customizations")
        if customizations:
            try:
                approved_rewrites = conv.state.get("approved_rewrites") or []
                spell_audit       = conv.state.get("spell_audit")
                if spell_audit is None:
                    legacy_spell = conv.state.get("spell_check") or {}
                    spell_audit = legacy_spell.get("audit") or [] if isinstance(legacy_spell, dict) else []
                html_str = conv.orchestrator.render_html_preview(
                    job_analysis=conv.state["job_analysis"],
                    customizations=customizations,
                    approved_rewrites=approved_rewrites,
                    spell_audit=spell_audit,
                )
            except Exception as _exc:
                app.logger.warning("render_html_preview failed: %s", _exc)

        # ── Fallback: load most recent HTML file from output directory ───────
        if not html_str:
            generated      = conv.state.get("generated_files") or {}
            output_dir_str = generated.get("output_dir", "")
            if output_dir_str:
                output_dir = Path(output_dir_str)
                if output_dir.is_dir():
                    for p in sorted(output_dir.glob("*.html")):
                        html_str = p.read_text(encoding="utf-8")

        if not html_str:
            return jsonify({"error": "No CV content available — complete customisation first."}), 404

        now     = datetime.now().isoformat()
        prev_id = str(_u.uuid4())
        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase":                "layout_review",
            "preview_html":         html_str,
            "preview_request_id":   prev_id,
            "preview_generated_at": now,
            "layout_confirmed":     False,
        })
        if "layout_instructions" not in gen:
            gen["layout_instructions"] = []
        conv._save_session()
        return jsonify({
            "ok":                  True,
            "html":                html_str,
            "preview_request_id":  prev_id,
            "page_count_estimate": gen.get("page_count_estimate"),
            "page_length_warning": gen.get("page_length_warning", False),
        })

    @app.post("/api/cv/layout-refine")
    def refine_cv_layout():
        """Apply a layout instruction to the stored preview and return updated HTML.

        Bridges the existing ``apply_layout_instruction`` orchestrator method
        into the staged generation contract.  The frontend does not need to
        pass the current HTML — it is read from and written back to
        ``generation_state.preview_html`` in the session.

        Body: ``{"instruction": str, "session_id": str}``

        Returns:
            ``{"ok": true, "html": str, "summary": str, "confidence": float,
               "preview_request_id": str}``
        """
        import uuid as _u
        entry = _get_session()
        conv  = entry.manager
        gen   = conv.state.get("generation_state") or {}

        phase = gen.get("phase", "idle")
        if phase not in ("preview", "layout_review"):
            return jsonify({
                "error": "Call /api/cv/generate-preview first before refining layout."
            }), 400

        body = request.get_json(force=True) or {}
        instruction_text = (body.get("instruction") or "").strip()
        if not instruction_text:
            return jsonify({"error": "Missing instruction text."}), 400

        current_html = gen.get("preview_html", "")
        if not current_html:
            return jsonify({"error": "No preview HTML in session — call generate-preview first."}), 400

        prior_instructions = gen.get("layout_instructions", [])

        result = conv.orchestrator.apply_layout_instruction(
            instruction_text=instruction_text,
            current_html=current_html,
            prior_instructions=prior_instructions,
        )

        if result.get("error"):
            return jsonify({
                "ok":           False,
                "error":        result["error"],
                "question":     result.get("question"),
                "details":      result.get("details"),
                "raw_response": result.get("raw_response"),
            })

        updated_html = result["html"]
        now     = datetime.now().isoformat()
        prev_id = str(_u.uuid4())

        instruction_record = {
            "id":           prev_id,
            "text":         instruction_text,
            "submitted_at": now,
            "applied":      True,
            "summary":      result.get("summary", ""),
            "confidence":   result.get("confidence"),
        }

        gen = conv.state.setdefault("generation_state", {})
        gen["preview_html"]        = updated_html
        gen["preview_request_id"]  = prev_id
        gen["preview_generated_at"] = now
        gen["phase"]               = "layout_review"
        gen["layout_confirmed"]    = False
        gen.setdefault("layout_instructions", []).append(instruction_record)
        conv._save_session()

        return jsonify({
            "ok":                 True,
            "html":               updated_html,
            "summary":            result.get("summary", ""),
            "confidence":         result.get("confidence"),
            "preview_request_id": prev_id,
        })

    @app.post("/api/cv/confirm-layout")
    def confirm_cv_layout():
        """Lock current preview; enables /api/cv/generate-final."""
        entry = _get_session()
        conv  = entry.manager
        gen   = conv.state.get("generation_state") or {}
        if not gen.get("preview_html"):
            return jsonify({"error": "No preview — call /api/cv/generate-preview first."}), 400
        if gen.get("layout_confirmed") or gen.get("phase") == "confirmed":
            return jsonify({"error": "Layout already confirmed."}), 400
        import hashlib as _hl
        now   = datetime.now().isoformat()
        chash = _hl.sha256(gen["preview_html"].encode()).hexdigest()[:16]
        gen   = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase": "confirmed", "layout_confirmed": True,
            "confirmed_at": now, "confirmed_preview_hash": chash,
        })
        conv._save_session()
        return jsonify({"ok": True, "confirmed": True, "confirmed_at": now, "hash": chash})

    @app.post("/api/cv/ats-score")
    def compute_cv_ats_score():
        """Return ATS match score for current session state (GAP-21).

        Computes the score from job_analysis and customizations stored in
        the session.  Optionally re-persists the score in generation_state.

        Request body:
            { "session_id": str, "basis": str | None }

        Response:
            { "ok": True, "ats_score": { ...Phase-0 contract schema... } }
        """
        from utils.scoring import compute_ats_score as _compute_ats_score
        entry = _get_session()
        conv  = entry.manager
        job_analysis   = conv.state.get("job_analysis") or {}
        customizations = dict(conv.state.get("customizations") or {})
        body  = request.get_json(silent=True) or {}
        basis = body.get("basis", "review_checkpoint")

        # Enrich customizations with session-level decision fields so the ATS
        # scorer sees the actual content the user has approved/edited.
        #
        # skill_decisions: {skill_name: 'keep'|'exclude'} → approved_skills list
        skill_decisions = conv.state.get("skill_decisions") or {}
        extra_skills    = conv.state.get("extra_skills") or []
        kept_skills = [k for k, v in skill_decisions.items() if v != "exclude"]
        kept_skills += [s for s in extra_skills if s not in kept_skills]
        if kept_skills:
            existing = [
                (s.get("name") if isinstance(s, dict) else s)
                for s in customizations.get("approved_skills", [])
            ]
            customizations["approved_skills"] = list(
                customizations.get("approved_skills", [])
            ) + [s for s in kept_skills if s not in existing]

        # approved_rewrites stored at top-level state (not nested in customizations)
        if not customizations.get("approved_rewrites"):
            state_rewrites = conv.state.get("approved_rewrites") or []
            if state_rewrites:
                customizations["approved_rewrites"] = state_rewrites

        # achievement_edits: {expIdx: [bullet, ...]} — fold into experience text
        achievement_edits = conv.state.get("achievement_edits") or {}
        if achievement_edits and not customizations.get("approved_rewrites"):
            bullet_rewrites = []
            for bullets in achievement_edits.values():
                if isinstance(bullets, list):
                    bullet_rewrites.extend(
                        {"rewritten": b, "section": "experience"}
                        for b in bullets if isinstance(b, str) and b.strip()
                    )
            if bullet_rewrites:
                customizations.setdefault("approved_rewrites", [])
                customizations["approved_rewrites"] = (
                    customizations["approved_rewrites"] + bullet_rewrites
                )

        # session_summaries override master professional_summaries
        session_summaries = conv.state.get("session_summaries") or {}
        if session_summaries and not customizations.get("selected_summary"):
            focus = conv.state.get("summary_focus_override", "ai_recommended")
            chosen = session_summaries.get(focus) or next(iter(session_summaries.values()), "")
            if chosen:
                customizations["selected_summary"] = chosen

        score = _compute_ats_score(job_analysis, customizations, basis=basis)
        # Persist latest score into generation_state for client polling
        gen = conv.state.setdefault("generation_state", {})
        gen["ats_score"] = score
        conv._save_session()
        return jsonify({"ok": True, "ats_score": score})

    @app.post("/api/cv/generate-final")
    def generate_cv_final():
        """Regenerate human-readable HTML+PDF from the confirmed preview; mark final_complete.

        Requires layout_confirmed == true and an existing output_dir (from the
        earlier generate_cv run).  Takes the confirmed HTML out of generation_state,
        writes it to the output directory, and reconverts to PDF so that any layout
        instructions applied during the preview loop are reflected in the final files.

        ATS DOCX is derived from structured data (not HTML) and is left unchanged.
        """
        entry = _get_session()
        conv  = entry.manager
        gen   = conv.state.get("generation_state") or {}
        if not gen.get("layout_confirmed"):
            return jsonify({"error": "Confirm layout first via /api/cv/confirm-layout."}), 400

        confirmed_html = gen.get("preview_html")
        if not confirmed_html:
            return jsonify({"error": "No confirmed preview HTML in session."}), 400

        generated = conv.state.get("generated_files") or {}
        if not generated.get("output_dir"):
            return jsonify({"error": "No generated files — complete workflow first."}), 404

        output_dir = Path(generated["output_dir"])

        # Build descriptive filename: CV_{company}_{position}_{date}
        _analysis = _coerce_to_dict(conv.state.get("job_analysis"))
        _company  = re.sub(r'[^\w]', '_', (_analysis.get('company') or '').strip())[:30]
        _position = re.sub(r'[^\w]', '_', (conv.state.get('position_name') or
                                            _analysis.get('job_title') or '').strip())[:40]
        _date     = datetime.now().strftime('%Y-%m-%d')
        _parts    = [p for p in ['CV', _company, _position, _date] if p and p != '_']
        filename_base = '_'.join(_parts) if len(_parts) > 2 else 'CV_final'

        try:
            final_paths = conv.orchestrator.generate_final_from_confirmed_html(
                confirmed_html=confirmed_html,
                output_dir=output_dir,
                filename_base=filename_base,
            )
        except Exception as exc:
            app.logger.error("generate_final_from_confirmed_html failed: %s", exc)
            return jsonify({"error": f"Final generation failed: {exc}"}), 500

        now = datetime.now().isoformat()
        gen = conv.state.setdefault("generation_state", {})
        gen.update({
            "phase": "final_complete",
            "final_generated_at": now,
            "final_output_paths": final_paths,
        })
        generated.update({
            "final_html": final_paths["html"],
            "final_pdf": final_paths["pdf"],
            "files": [
                final_paths["html"],
                final_paths["pdf"],
            ],
        })
        conv._save_session()

        outputs = dict(generated)
        return jsonify({"ok": True, "generated_at": now, "outputs": outputs})

    @app.post("/api/finalise")
    def finalise_application():
        """Finalise the application: update metadata, upsert response library, git commit.

        Request body (all optional):
            status  — "draft" | "ready" | "sent"  (default "ready")
            notes   — free-text notes string

        Returns:
            { ok, commit_hash, summary } on success
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        with entry.lock:
            generated = conversation.state.get('generated_files')
            if not generated or not generated.get('output_dir'):
                return jsonify({'error': 'No generated CV to finalise. Please generate first.'}), 400

            try:
                body        = request.get_json(silent=True) or {}
                app_status  = body.get('status', 'ready')
                notes       = body.get('notes', '')

                if app_status not in ('draft', 'ready', 'sent'):
                    return jsonify({'error': "status must be 'draft', 'ready', or 'sent'"}), 400

                output_dir   = Path(generated['output_dir'])
                metadata_path = output_dir / 'metadata.json'

                # Load existing metadata (created during generate_cv)
                if metadata_path.exists():
                    with open(metadata_path, encoding='utf-8') as f:
                        metadata = json.load(f)
                else:
                    metadata = {}

                # Augment metadata with finalise data
                metadata['application_status'] = app_status
                metadata['notes']              = notes
                metadata['finalised_at']       = datetime.now().isoformat()
                metadata['clarification_answers'] = conversation.state.get('post_analysis_answers') or {}
                metadata['spell_audit']           = conversation.state.get('spell_audit') or []
                metadata['layout_instructions']   = conversation.state.get('layout_instructions') or []
                metadata['validation_results']    = conversation.state.get('validation_results') or {}
                ats_score = ((conversation.state.get('generation_state') or {}).get('ats_score'))
                if ats_score is not None:
                    metadata['ats_score'] = ats_score

                # Upsert screening responses into response_library.json (if any)
                screening = metadata.get('screening_responses') or []
                if screening:
                    library_path = Path(conversation.orchestrator.master_data_path).parent / 'response_library.json'
                    if library_path.exists():
                        with open(library_path, encoding='utf-8') as f:
                            library = json.load(f)
                    else:
                        library = {}
                    for resp in screening:
                        tag = resp.get('topic_tag') or resp.get('question', '')[:40]
                        if tag:
                            library[tag] = resp
                    library_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(library_path, 'w', encoding='utf-8') as f:
                        json.dump(library, f, indent=2)

                # Write updated metadata
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2)

                # Git commit
                company  = (metadata.get('company') or 'Unknown').replace(' ', '_')
                role     = (metadata.get('role') or 'Role').replace(' ', '_')
                date_str = datetime.now().strftime('%Y-%m-%d')
                commit_msg = f"feat: Add {company}_{role}_{date_str} application"

                commit_hash = None
                git_error   = None
                try:
                    repo_root = Path(__file__).parent.parent
                    subprocess.run(
                        ['git', 'add', str(output_dir)],
                        cwd=str(repo_root), check=True, capture_output=True
                    )
                    result = subprocess.run(
                        ['git', 'commit', '-m', commit_msg],
                        cwd=str(repo_root), capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        # Extract short hash from the commit output
                        m = re.search(r'\b([0-9a-f]{7,40})\b', result.stdout)
                        commit_hash = m.group(1) if m else None
                    else:
                        git_error = result.stderr.strip() or result.stdout.strip()
                except Exception as git_exc:
                    git_error = str(git_exc)

                # Advance phase
                conversation.state['phase'] = Phase.REFINEMENT
                conversation.save_session()
                session_registry.touch(sid)

                # Build keyword match summary
                job_analysis   = conversation.state.get('job_analysis') or {}
                ats_keywords   = job_analysis.get('ats_keywords') or []
                approved_count = len(conversation.state.get('approved_rewrites') or [])

                summary = {
                    'files':          generated.get('files', []),
                    'output_dir':     str(output_dir),
                    'ats_keywords':   ats_keywords,
                    'ats_score':      ats_score,
                    'approved_rewrites': approved_count,
                    'application_status': app_status,
                }

                return jsonify({
                    'ok':          True,
                    'commit_hash': commit_hash,
                    'git_error':   git_error,
                    'summary':     summary,
                })
            except Exception as e:
                traceback.print_exc()
                return jsonify({'error': str(e)}), 500

    # ── Phase 11: Master Data Harvest ───────────────────────────────────────

    @app.get("/api/harvest/candidates")
    def harvest_candidates():
        """Compile candidate write-back items from the current session.

        Returns:
            { candidates: List[{id, type, label, original, proposed, rationale}] }
        """
        entry = _get_session()
        conversation = entry.manager
        try:
            candidates = _compile_harvest_candidates(conversation)
            return jsonify({'ok': True, 'candidates': candidates})
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    @app.post("/api/harvest/apply")
    def harvest_apply():
        """Write selected harvest candidates back to Master_CV_Data.json and git commit.

        Request body:
            selected_ids — list of candidate ids to apply

        Returns:
            { ok, written_count, diff_summary, commit_hash }
        """
        entry = _get_session()
        _validate_owner(entry)
        conversation = entry.manager
        sid = entry.session_id
        with entry.lock:
            try:
                body         = request.get_json(silent=True) or {}
                selected_ids = body.get('selected_ids') or []

                if not selected_ids:
                    return jsonify({'ok': True, 'written_count': 0, 'diff_summary': [], 'commit_hash': None})

                candidates_by_id = {c['id']: c for c in _compile_harvest_candidates(conversation)}
                selected = [candidates_by_id[sid] for sid in selected_ids if sid in candidates_by_id]
                if not selected:
                    return jsonify({'ok': True, 'written_count': 0, 'diff_summary': [], 'commit_hash': None})

                master_path = Path(conversation.orchestrator.master_data_path)
                with open(master_path, encoding='utf-8') as f:
                    master = json.load(f)

                diff_summary: List[Dict[str, Any]] = []

                for cand in selected:
                    ctype = cand['type']
                    if ctype == 'improved_bullet':
                        # Update the matching bullet in master experience data
                        applied = _harvest_apply_bullet(master, cand['original'], cand['proposed'])
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })
                    elif ctype in ('new_skill', 'skill_gap_confirmed'):
                        skill_name = cand['proposed']
                        applied    = _harvest_add_skill(master, skill_name)
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })
                    elif ctype == 'summary_variant':
                        applied = _harvest_add_summary_variant(master, cand['proposed'])
                        diff_summary.append({
                            'id':      cand['id'],
                            'type':    ctype,
                            'applied': applied,
                            'label':   cand['label'],
                        })

                # Write updated master data via shared helper (backup + validation)
                _save_master(master, master_path)

                # Reload in orchestrator
                conversation.orchestrator.master_data = master

                # Git commit
                job_analysis = conversation.state.get('job_analysis') or {}
                company  = (job_analysis.get('company') or 'Unknown').replace(' ', '_')
                role     = (job_analysis.get('title') or 'Role').replace(' ', '_')
                date_str = datetime.now().strftime('%Y-%m-%d')
                commit_msg = f"chore: Update master CV data from {company}_{role}_{date_str} session"

                commit_hash = None
                git_error   = None
                try:
                    repo_root = Path(__file__).parent.parent
                    subprocess.run(
                        ['git', 'add', str(master_path)],
                        cwd=str(repo_root), check=True, capture_output=True
                    )
                    result = subprocess.run(
                        ['git', 'commit', '-m', commit_msg],
                        cwd=str(repo_root), capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        m = re.search(r'\b([0-9a-f]{7,40})\b', result.stdout)
                        commit_hash = m.group(1) if m else None
                    else:
                        git_error = result.stderr.strip() or result.stdout.strip()
                except Exception as git_exc:
                    git_error = str(git_exc)

                written_count = sum(1 for d in diff_summary if d.get('applied'))
                session_registry.touch(sid)
                return jsonify({
                    'ok':           True,
                    'written_count': written_count,
                    'diff_summary': diff_summary,
                    'commit_hash':  commit_hash,
                    'git_error':    git_error,
                })
            except Exception as e:
                traceback.print_exc()
                return jsonify({'error': str(e)}), 500

    # ── Session management endpoints ─────────────────────────────────────────

    @app.post("/api/sessions/new")
    def sessions_new():
        """Create a new session and return its ID.

        Returns ``{"ok": true, "session_id": "abcd1234", "redirect_url": "/?session=abcd1234"}``.
        """
        sid, _entry = session_registry.create(_app_config)
        return jsonify({"ok": True, "session_id": sid, "redirect_url": f"/?session={sid}"})

    @app.post("/api/sessions/claim")
    def sessions_claim():
        """Claim ownership of a session with a tab token.

        Body: ``{"session_id": "...", "owner_token": "..."}``
        Returns ``{"ok": true}`` or 409 if already owned by another token.
        """
        body = request.get_json(silent=True) or {}
        sid = body.get("session_id")
        token = body.get("owner_token")
        if not sid or not token:
            return jsonify({"error": "session_id and owner_token required"}), 400
        try:
            session_registry.claim(sid, token)
            return jsonify({"ok": True})
        except SessionNotFoundError as e:
            return jsonify({
                "ok": False,
                "error": "session_not_found",
                "message": str(e),
            })
        except SessionOwnedError as e:
            return jsonify({"error": "session_owned", "message": str(e)}), 409

    @app.post("/api/sessions/takeover")
    def sessions_takeover():
        """Forcibly take over a session (e.g. after page reload).

        Body: ``{"session_id": "...", "owner_token": "..."}``
        Returns ``{"ok": true}``.
        """
        body = request.get_json(silent=True) or {}
        sid = body.get("session_id")
        token = body.get("owner_token")
        if not sid or not token:
            return jsonify({"error": "session_id and owner_token required"}), 400
        try:
            session_registry.takeover(sid, token)
            return jsonify({"ok": True})
        except SessionNotFoundError as e:
            return jsonify({"error": str(e)}), 404

    @app.get("/api/sessions/active")
    def sessions_active():
        """Return a list of all active in-memory sessions.

        Returns ``{"sessions": [{"session_id": "...", "created": "...",
        "last_modified": "...", "position_name": "...", "phase": "...",
        "owner_token": "..."}]}``.
        """
        entries = session_registry.all_active()
        requester_token = request.args.get("owner_token")
        return jsonify({
            "sessions": [
                {
                    "session_id":          e.session_id,
                    "position_name":       (e.manager.state or {}).get("position_name"),
                    "phase":               (e.manager.state or {}).get("phase"),
                    "created":             e.created.isoformat(),
                    "last_modified":       e.last_modified.isoformat(),
                    "claimed":             e.owner_token is not None,
                    "owned_by_requester":  bool(
                        requester_token
                        and e.owner_token
                        and requester_token == e.owner_token
                    ),
                }
                for e in entries
            ]
        })

    @app.delete("/api/sessions/<session_id>/evict")
    def sessions_evict(session_id):
        """Save and remove a specific session from the registry.

        Returns ``{"ok": true}``.
        """
        entry = session_registry.get(session_id)
        if entry is None:
            return jsonify({"error": f"Session not found: {session_id}"}), 404
        _validate_owner(entry)
        try:
            entry.manager._save_session()
        except Exception:
            pass
        session_registry.remove(session_id)
        return jsonify({"ok": True})
>>>>>>> c4531aa (Fix session restore and staged generation persistence)

    return app

# ---------------------------------------------------------------------------
# Master CV IO helpers (module-level for testability)
# ---------------------------------------------------------------------------

def _load_master(master_data_path: str) -> "tuple[dict, Path]":
    """Read master CV JSON from disk and return (data, path)."""
    p = Path(master_data_path).expanduser()

    validation = validate_master_data_file(str(p), use_schema=True)
    if not validation.valid:
        msg = "; ".join(validation.errors) or "master data validation failed"
        raise ValueError(f"Master data validation failed before load: {msg}")

    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f), p


def _extract_year(value: Any) -> Optional[int]:
    """Extract a 4-digit year from a free-form date string."""
    raw = str(value or '').strip()
    if not raw:
        return None
    m = re.search(r'\b(19|20)\d{2}\b', raw)
    if not m:
        return None
    return int(m.group(0))


def _validate_master_for_persistence(master: Dict[str, Any]) -> None:
    """Validate top-level master CV structure before writing to disk."""
    if not isinstance(master, dict):
        raise ValueError("master data must be a JSON object")

    errors: List[str] = []

    if 'personal_info' in master and not isinstance(master.get('personal_info'), dict):
        errors.append("personal_info must be an object")

    for key in ('experience', 'education', 'awards', 'selected_achievements'):
        if key in master and not isinstance(master.get(key), list):
            errors.append(f"{key} must be a list")

    if 'skills' in master and not isinstance(master.get('skills'), (list, dict)):
        errors.append("skills must be a list or object")

    if 'professional_summaries' in master and not isinstance(master.get('professional_summaries'), (dict, list)):
        errors.append("professional_summaries must be an object or list")

    if errors:
        raise ValueError("Invalid master data: " + "; ".join(errors))


def _save_master(master: Dict[str, Any], master_path: Path) -> None:
    """Write master CV data to disk and stage the file in git.

    Creates a timestamped backup before overwrite when the target file exists.
    """
    _validate_master_for_persistence(master)

    backup_path: Optional[Path] = None
    if master_path.exists():
        backup_dir = master_path.parent / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        backup_path = backup_dir / f"{master_path.stem}.{ts}.bak{master_path.suffix}"
        shutil.copy2(master_path, backup_path)

    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(master, f, indent=2)

    validation = validate_master_data_file(str(master_path), use_schema=True)
    if not validation.valid:
        if backup_path is not None and backup_path.exists():
            shutil.copy2(backup_path, master_path)
        msg = "; ".join(validation.errors) or "master data validation failed"
        raise ValueError(f"Master data validation failed after write: {msg}")

    subprocess.run(
        ['git', '-C', str(master_path.parent), 'add', master_path.name],
        capture_output=True, check=False,
    )


# ---------------------------------------------------------------------------
# Phase 11 harvest helpers (module-level for testability)
# ---------------------------------------------------------------------------

def _compile_harvest_candidates(conversation) -> List[Dict[str, Any]]:
    """Return candidate write-back items for the current session.

    Extracted from the harvest_candidates view so harvest_apply can call it
    directly without round-tripping through the Flask response layer.
    """
    candidates: List[Dict[str, Any]] = []

    approved_rewrites = conversation.state.get('approved_rewrites') or []
    customizations    = conversation.state.get('customizations') or {}
    post_answers      = conversation.state.get('post_analysis_answers') or {}

    # 1. Improved bullets — approved rewrites where content differs from master
    for rw in approved_rewrites:
        if rw.get('section') == 'summary':  # handled separately as summary_variant
            continue
        proposed = rw.get('proposed', '')
        original = rw.get('original', '')
        if not proposed or not original:
            continue
        if proposed.strip() == original.strip():
            continue
        candidates.append({
            'id':        f"rewrite_{rw.get('id', len(candidates))}",
            'type':      'improved_bullet',
            'label':     f"Improved bullet — {rw.get('context', rw.get('id', 'unknown'))}",
            'original':  original,
            'proposed':  proposed,
            'rationale': rw.get('rationale') or 'Approved rewrite improves ATS-keyword coverage or adds a quantified metric.',
        })

    # 2. New / renamed skills added during the session
    for skill in customizations.get('new_skills_added') or []:
        if not skill:
            continue
        candidates.append({
            'id':        f"skill_{skill.replace(' ', '_')}",
            'type':      'new_skill',
            'label':     f"New skill — {skill}",
            'original':  '(not in master data)',
            'proposed':  skill,
            'rationale': 'Skill was added during the skills review step.',
        })

    # 3. Summary variant — if summary was rewritten and approved
    summary_rewrite = next(
        (rw for rw in approved_rewrites if rw.get('section') == 'summary'), None
    )
    if summary_rewrite and summary_rewrite.get('proposed'):
        cand_id = 'summary_variant'
        if not any(c['id'] == cand_id for c in candidates):
            candidates.append({
                'id':        cand_id,
                'type':      'summary_variant',
                'label':     'Professional summary variant',
                'original':  summary_rewrite.get('original', ''),
                'proposed':  summary_rewrite.get('proposed', ''),
                'rationale': 'Rewritten summary could be stored as a named variant for future reuse.',
            })

    # 4. Clarification-answer-revealed skills (user confirmed yes to a skill gap)
    for key, val in post_answers.items():
        if not isinstance(val, str):
            continue
        if key.startswith('skill_gap_') and val.lower() in ('yes', 'true', '1'):
            skill_name = key[len('skill_gap_'):]
            cand_id    = f'skill_gap_{skill_name}'
            if not any(c['id'] == cand_id for c in candidates):
                candidates.append({
                    'id':        cand_id,
                    'type':      'skill_gap_confirmed',
                    'label':     f"Confirmed skill — {skill_name}",
                    'original':  '(not in master data)',
                    'proposed':  skill_name,
                    'rationale': 'You confirmed this skill in response to a clarifying question.',
                })

    return candidates


def _harvest_apply_bullet(master: Dict, original: str, proposed: str) -> bool:
    """Replace ``original`` bullet text with ``proposed`` in master experience data."""
    experiences = (
        master.get('experience')
        or master.get('experiences')
        or []
    )
    for exp in experiences:
        achievements = exp.get('achievements') or exp.get('bullets') or []
        for i, bullet in enumerate(achievements):
            text = bullet if isinstance(bullet, str) else bullet.get('text', '')
            if text.strip() == original.strip():
                if isinstance(bullet, str):
                    achievements[i] = proposed
                else:
                    bullet['text'] = proposed
                return True
    return False


def _harvest_add_skill(master: Dict, skill_name: str) -> bool:
    """Add ``skill_name`` to master skills data; returns True if actually added."""
    skills = master.get('skills')
    if isinstance(skills, list):
        if skill_name not in skills:
            skills.append(skill_name)
            return True
        return False
    elif isinstance(skills, dict):
        # Category dict — add to a named 'other'/'general'/'additional' bucket;
        # never auto-add to an arbitrary category.
        for cat_key, cat_val in skills.items():
            cat_list: List[str] = []
            if isinstance(cat_val, list):
                cat_list = cat_val
            elif isinstance(cat_val, dict) and isinstance(cat_val.get('skills'), list):
                cat_list = cat_val['skills']
            if cat_key.lower() in ('other', 'general', 'additional'):
                if skill_name not in cat_list:
                    cat_list.append(skill_name)
                    return True
                return False
        # No suitable category — add a new 'Other' category
        skills['Other'] = [skill_name]
        return True
    # skills field is missing — create as list
    master['skills'] = [skill_name]
    return True


def _harvest_add_summary_variant(master: Dict, new_summary: str) -> bool:
    """Store ``new_summary`` as a named variant in master data.

    If ``professional_summaries`` already exists as a list, appends.
    Otherwise creates it.
    """
    variants = master.get('professional_summaries')
    if isinstance(variants, list):
        if new_summary not in variants:
            variants.append(new_summary)
            return True
        return False
    master['professional_summaries'] = [new_summary]
    return True


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
    parser.add_argument("--llm-provider", choices=["copilot-oauth", "copilot", "github", "openai", "anthropic", "gemini", "groq", "local", "copilot-sdk", "stub"],
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
    
    # Set up logging before anything else
    setup_logging(config)

    app = create_app(args)
    bundle_status = app.config.get('FRONTEND_BUNDLE_STATUS', 'unknown')
    bundle_built_at = app.config.get('FRONTEND_BUNDLE_BUILT_AT', 'unknown')

    # ── Startup banner ────────────────────────────────────────────────────────
    model_source = (
        "env var"      if os.getenv("CV_LLM_MODEL")
        else ".env"    if (Path(__file__).parent.parent / ".env").exists()
                          and _env_file_has_value("CV_LLM_MODEL")
        else "config.yaml"
    )
    provider_source = (
        "env var"      if os.getenv("CV_LLM_PROVIDER")
        else "CLI arg" if args.llm_provider != config.llm_provider
        else ".env"    if (Path(__file__).parent.parent / ".env").exists()
                          and _env_file_has_value("CV_LLM_PROVIDER")
        else "config.yaml"
    )
    print(
        f"\n"
        f"  ┌─────────────────────────────────────────────────────┐\n"
        f"  │                    CV Builder                       │\n"
        f"  ├──────────┬──────────────────────────────────────────┤\n"
        f"  │ provider │ {args.llm_provider:<24}  [{provider_source}]\n"
        f"  │ model    │ {args.model or '(provider default)':<24}  [{model_source}]\n"
        f"  │ port     │ {args.port}\n"
        f"  │ data     │ {args.master_data}\n"
        f"  │ output   │ {args.output_dir}\n"
        f"  │ bundle   │ {bundle_status}\n"
        f"  │ built at │ {bundle_built_at}\n"
        f"  └──────────┴──────────────────────────────────────────┘\n",
        flush=True,
    )

    app.run(host=config.web_host, port=args.port, debug=args.debug)


def _env_file_has_value(key: str) -> bool:
    """Return True if *key* is set (uncommented) in the project .env file."""
    env_path = Path(__file__).parent.parent / ".env"
    try:
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            if line.split("=", 1)[0].strip() == key:
                return True
    except OSError:
        pass
    return False


if __name__ == "__main__":
    main()
