"""
Tests for URL job description fetching, including JSON-LD / meta-tag fallback
for JS-rendered SPA pages (e.g. Workday).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

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
    print("✅ test_regular_html_extraction passed")


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
    print("✅ test_spa_json_ld_fallback passed")


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
    print("✅ test_spa_meta_og_fallback passed")


def test_json_ld_preferred_over_meta():
    """JSON-LD should be preferred over og:description when both are present."""
    ld_desc = "JSONLD: " + "Data Engineer role with Spark and Kafka experience. " * 10
    meta_desc = "META: " + "Different content from og:description. " * 10
    ld_json = json.dumps({"@type": "JobPosting", "description": ld_desc})
    html = f"""<html>
        <head>
            <meta property="og:description" content="{meta_desc}">
            <script type="application/ld+json">{ld_json}</script>
        </head>
        <body><div id="root"></div></body>
    </html>"""

    result = extract_job_text_from_html(html)
    assert result.startswith('JSONLD:')
    print("✅ test_json_ld_preferred_over_meta passed")


if __name__ == '__main__':
    test_regular_html_extraction()
    test_spa_json_ld_fallback()
    test_spa_meta_og_fallback()
    test_json_ld_preferred_over_meta()
    print("\n✅ All URL fetch tests passed")
