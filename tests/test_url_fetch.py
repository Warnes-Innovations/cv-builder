# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Tests for URL job description fetching, including JSON-LD / meta-tag fallback
for JS-rendered SPA pages (e.g. Workday).
"""

import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from bs4 import BeautifulSoup
import json


# ─── Helpers (extracted from web_app.py fetch_job_url logic) ─────────────────

def extract_job_text_from_html(html: str) -> str:
    """Mirror of the HTML extraction logic in fetch_job_url."""
    soup = BeautifulSoup(html, 'html.parser')

    # Pre-extract JSON-LD / meta BEFORE stripping script tags
    json_ld_text = None
    for script_tag in soup.find_all('script', type='application/ld+json'):
        try:
            ld_data = json.loads(script_tag.string or '')
            desc = ld_data.get('description') if isinstance(ld_data, dict) else None
            if desc and len(desc) > 100:
                json_ld_text = desc
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
                break

    for script in soup(['script', 'style', 'nav', 'header', 'footer']):
        script.decompose()

    body = soup.find('body') or soup
    text = '\n'.join(l.strip() for l in body.get_text().splitlines() if l.strip())

    if len(text.strip()) < 200:
        if json_ld_text:
            return json_ld_text
        elif meta_desc_text:
            return meta_desc_text

    return text


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_regular_html_extraction():
    """Static HTML pages: text should come from the body."""
    html = """<html><body>
        <h1>Software Engineer</h1>
        <div class="job-description">
            We are looking for a talented software engineer with experience in Python, SQL,
            and cloud infrastructure. You will work on large-scale distributed systems.
        </div>
    </body></html>"""

    result = extract_job_text_from_html(html)
    assert 'Software Engineer' in result
    assert 'Python' in result


def test_spa_json_ld_fallback():
    """JS-rendered SPA (Workday-style): body is empty, job is in JSON-LD."""
    job_desc = (
        "Principal Data Scientist. " * 20 +
        "Requirements: PhD in statistics, 5 years experience with ML, "
        "Python, R, SQL, and cloud infrastructure."
    )
    ld_json = json.dumps({
        "@context": "http://schema.org",
        "@type": "JobPosting",
        "title": "Principal Data Scientist",
        "description": job_desc
    })
    html = f"""<html>
        <head>
            <meta property="og:description" content="Short meta content">
            <script type="application/ld+json">{ld_json}</script>
        </head>
        <body><div id="root"></div></body>
    </html>"""

    result = extract_job_text_from_html(html)
    assert 'Principal Data Scientist' in result
    assert 'Python' in result
    assert len(result) > 100


def test_spa_meta_og_fallback():
    """SPA page with og:description but no JSON-LD."""
    og_desc = (
        "Senior ML Engineer at TechCorp. " * 10 +
        "Must have experience with PyTorch, distributed training, and model deployment."
    )
    html = f"""<html>
        <head>
            <meta property="og:description" content="{og_desc}">
        </head>
        <body><div id="root"></div></body>
    </html>"""

    result = extract_job_text_from_html(html)
    assert 'ML Engineer' in result
    assert 'PyTorch' in result


def test_json_ld_preferred_over_meta():
    """JSON-LD should be preferred over og:description when both are present."""
    ld_desc   = "JSONLD: " + "Data Engineer role with Spark and Kafka experience. " * 10
    meta_desc = "META: "   + "Different content from og:description. " * 10
    ld_json   = json.dumps({"@type": "JobPosting", "description": ld_desc})
    html = f"""<html>
        <head>
            <meta property="og:description" content="{meta_desc}">
            <script type="application/ld+json">{ld_json}</script>
        </head>
        <body><div id="root"></div></body>
    </html>"""

    result = extract_job_text_from_html(html)
    assert result.startswith('JSONLD:')


# ─── Route-level tests: drive the real /api/fetch-job-url ────────────────────
#
# The helper above mirrors the route rather than calling it, so it cannot catch
# defects in the route itself. These tests patch only the network
# (routes.job_routes._safe_get) and run the real extraction.

import argparse
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
import requests


def _response(url: str, body: bytes, content_type: str, status: int = 200) -> requests.Response:
    """A real Response whose encoding is set the way HTTPAdapter sets it.

    A MagicMock or a bare Response would decode by sniffing the bytes and so
    hide the ISO-8859-1 default that requests applies to text/* without a charset.
    """
    r = requests.Response()
    r.status_code = status
    r._content = body
    r.headers['content-type'] = content_type
    r.url = url
    r.encoding = requests.utils.get_encoding_from_headers(r.headers)
    return r


@pytest.fixture()
def fetch():
    """POST a URL to the real route; ``fake_get(url)`` supplies each response."""
    with ExitStack() as stack:
        stack.enter_context(patch('scripts.web_app.get_llm_provider', return_value=MagicMock()))
        stack.enter_context(patch('scripts.web_app.CVOrchestrator', return_value=MagicMock()))
        stack.enter_context(patch('scripts.web_app.ConversationManager', return_value=MagicMock()))
        from scripts.web_app import create_app
        app = create_app(argparse.Namespace(
            llm_provider='local', model=None, master_data=None, publications=None,
            output_dir='/tmp/cv_url_fetch_test', job_file=None,
        ))
        app.config['TESTING'] = True

        def _fetch(url, fake_get):
            calls = []

            def _safe_get(u, headers, **kwargs):
                calls.append(u)
                return fake_get(u)

            # _check_ssrf_url resolves DNS; stubbed so tests need no network.
            # SSRF behaviour is covered in tests/test_security_regression.py.
            with app.test_client() as client, \
                 patch('routes.job_routes._check_ssrf_url'), \
                 patch('routes.job_routes._safe_get', side_effect=_safe_get):
                sid = client.post('/api/sessions/new').get_json()['session_id']
                r = client.post(f'/api/fetch-job-url?session_id={sid}',
                                json={'url': url}, headers={'Host': 'localhost:5001'})
            return r, calls

        yield _fetch


_PROSE = ("This is hard, urgent, selfless work—but it’s work worth doing. "
          "If you’re driven by purpose, we invite you to join us. ") * 4


def test_html_without_charset_header_uses_meta_charset(fetch):
    """content-type: text/html with no charset must not decode UTF-8 as ISO-8859-1.

    Workday sends exactly this header; requests' default produced 'itâ€™s'.
    """
    html = (f'<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8">'
            f'</head><body><main><p>{_PROSE}</p></main></body></html>').encode('utf-8')
    url = 'https://jobs.example.com/posting/1'
    r, _ = fetch(url, lambda u: _response(u, html, 'text/html'))
    assert r.status_code == 200, r.get_json()
    text = r.get_json()['job_text']
    assert 'it’s work worth doing' in text
    assert 'â€' not in text  # the "â€" mojibake prefix


_WD_URL = ('https://acme.wd5.myworkdayjobs.com/en-US/Careers/job/'
           'Remote/Data-Scientist_R-1?Job_Application_ID=abc&username=someone%2540example.com')
_WD_CXS = 'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/Careers/job/Remote/Data-Scientist_R-1'


def _workday_page(description: str) -> bytes:
    ld = json.dumps({'@context': 'http://schema.org', '@type': 'JobPosting',
                     'title': 'Data Scientist', 'description': description,
                     'hiringOrganization': {'@type': 'Organization', 'name': 'Acme'}})
    return (f'<html><head><title>Workday</title>'
            f'<script type="application/ld+json">{ld}</script></head>'
            f'<body><div id="root"></div></body></html>').encode('utf-8')


_FLAT = 'Intro paragraph. Responsibilities First duty Second duty ' * 5
_CXS_HTML = ('<p>Intro paragraph.</p><h2>Responsibilities</h2>'
             '<ul><li>First duty</li><li>Second duty</li></ul><p>It’s great.</p>')


def test_workday_uses_cxs_html_description(fetch):
    """Workday's JSON-LD description is flattened to one line; the CXS API keeps the HTML."""
    def fake_get(u):
        if '/wday/cxs/' in u:
            body = json.dumps({'jobPostingInfo': {'title': 'Data Scientist',
                                                  'jobDescription': _CXS_HTML}}).encode('utf-8')
            return _response(u, body, 'application/json')
        return _response(u, _workday_page(_FLAT), 'text/html')

    r, calls = fetch(_WD_URL, fake_get)
    assert r.status_code == 200, r.get_json()
    assert _WD_CXS in calls  # tenant/site/path mapped; query string (incl. username) dropped
    text = r.get_json()['job_text']
    lines = text.splitlines()
    assert 'Intro paragraph.' in lines
    assert 'Responsibilities' in lines
    assert '- First duty' in lines and '- Second duty' in lines
    assert 'It’s great.' in lines
    assert _FLAT.strip() not in text


@pytest.mark.parametrize('cxs_failure', ['status', 'exception', 'no_description'])
def test_workday_cxs_failure_falls_back_to_json_ld(fetch, cxs_failure):
    def fake_get(u):
        if '/wday/cxs/' in u:
            if cxs_failure == 'exception':
                raise requests.ConnectionError('boom')
            if cxs_failure == 'status':
                return _response(u, b'{}', 'application/json', status=500)
            return _response(u, b'{"jobPostingInfo": {}}', 'application/json')
        return _response(u, _workday_page(_FLAT), 'text/html')

    r, _ = fetch(_WD_URL, fake_get)
    assert r.status_code == 200, r.get_json()
    assert 'Intro paragraph. Responsibilities First duty' in r.get_json()['job_text']


def test_non_workday_host_does_not_call_cxs(fetch):
    page = _workday_page(_FLAT)
    r, calls = fetch('https://jobs.example.com/en-US/Careers/job/X_R-1',
                     lambda u: _response(u, page, 'text/html'))
    assert r.status_code == 200, r.get_json()
    assert calls == ['https://jobs.example.com/en-US/Careers/job/X_R-1']


if __name__ == '__main__':
    test_regular_html_extraction()
    test_spa_json_ld_fallback()
    test_spa_meta_og_fallback()
    test_json_ld_preferred_over_meta()
    print("\n✅ All URL fetch tests passed")
