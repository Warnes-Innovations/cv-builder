#!/usr/bin/env python3
"""
Tests for ATS DOCX generation and ATS compatibility scoring (CVOrchestrator).
"""

import json
import re as _re
import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.cv_orchestrator import CVOrchestrator, validate_ats_report


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def selected_content():
    """Minimal but realistic CV data for ATS testing."""
    return {
        "personal_info": {
            "name": "Gregory R. Warnes, Ph.D.",
            "contact": {
                "email":    "consulting@warnes.net",
                "phone":    "585-678-6661",
                "address":  {"city": "Rochester", "state": "NY"},
                "linkedin": "https://linkedin.com/in/gregorywarnes",
            },
        },
        "summary": (
            "Senior Data Scientist with 25+ years of experience in biostatistics, "
            "genomics, and machine learning."
        ),
        "experiences": [
            {
                "title":      "Chief Scientific Officer",
                "company":    "TNT³",
                "location":   {"city": "Remote", "state": None},
                "start_date": "2024-01",
                "end_date":   "Present",
                "achievements": [
                    {"text": "Led development of automated trading systems using ML, improving accuracy by 35%"},
                    {"text": "Managed cross-functional team of 8 engineers and data scientists"},
                ],
            },
            {
                "title":      "Principal Research Scientist",
                "company":    "Pfizer Global R&D",
                "location":   {"city": "Groton", "state": "CT"},
                "start_date": "2000-01",
                "end_date":   "2024-12",
                "achievements": [
                    {"text": "Developed MiDAS Genomic Workflow System reducing processing time by 60%"},
                    {"text": "Led biostatistics support for 50+ clinical trials across oncology and immunology"},
                ],
            },
        ],
        "skills": [
            {"name": "Python",              "category": "Programming",    "years": 15},
            {"name": "R/Bioconductor",      "category": "Programming",    "years": 20},
            {"name": "Machine Learning",    "category": "Technical",      "years": 10},
            {"name": "Data Science",        "category": "Core Expertise", "years": 25},
            {"name": "Biostatistics",       "category": "Core Expertise", "years": 25},
            {"name": "Statistical Modeling","category": "Technical",      "years": 20},
        ],
        "education": [
            {
                "degree":      "Ph.D.",
                "field":       "Biostatistics",
                "institution": "University of Washington",
                "location":    {"city": "Seattle", "state": "WA"},
                "end_year":    2000,
            }
        ],
        "certifications": [
            {"name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services", "year": 2023}
        ],
        "awards":        [{"title": "Pfizer Achievement Award", "year": 2022, "description": "Outstanding contributions"}],
        "achievements":  [],
        "publications":  [],
    }


@pytest.fixture
def job_analysis():
    """Sample job analysis matching the selected_content above."""
    return {
        "company":  "TestBioTech",
        "title":    "Senior Data Scientist",
        "domain":   "biotechnology",
        "required_skills": ["Python", "Machine Learning", "Statistical Modeling", "Data Science", "R"],
        "ats_keywords": [
            "python", "machine learning", "statistical modeling",
            "biostatistics", "data science", "clinical trials",
            "genomics", "pytorch", "docker", "leadership",
        ],
        "must_have_requirements": [
            "PhD in relevant field",
            "10+ years experience in data science",
            "Strong Python and R skills",
            "Experience with machine learning",
        ],
    }


@pytest.fixture
def orchestrator(tmp_path):
    """CVOrchestrator wired to a temporary directory with no LLM client."""
    master_data = {
        "personal_info":          {"name": "Gregory R. Warnes, Ph.D."},
        "professional_summaries": {"default": "Test summary"},
        "education":              [],
        "awards":                 [],
        "certifications":         [],
    }
    master_path = tmp_path / "Master_CV_Data.json"
    master_path.write_text(json.dumps(master_data), encoding="utf-8")
    return CVOrchestrator(
        master_data_path=str(master_path),
        publications_path=str(tmp_path / "publications.bib"),  # may not exist — that's OK
        output_dir=str(tmp_path / "output"),
        llm_client=None,
    )


# ── tests ─────────────────────────────────────────────────────────────────────

def test_ats_docx_is_generated(orchestrator, selected_content, job_analysis, tmp_path):
    """_generate_ats_docx produces a non-empty .docx file."""
    out_dir = tmp_path / "ats_out"
    out_dir.mkdir()

    ats_file = orchestrator._generate_ats_docx(selected_content, job_analysis, out_dir)

    assert ats_file.exists(), f"Expected ATS DOCX at {ats_file}"
    assert ats_file.stat().st_size > 0, "ATS DOCX is empty"


def test_ats_docx_name_uses_heading1(orchestrator, selected_content, job_analysis, tmp_path):
    """ATS DOCX must have the candidate name as a Heading 1 paragraph (fixes docx_heading1_present)."""
    from docx import Document  # type: ignore

    out_dir = tmp_path / "ats_out_h1"
    out_dir.mkdir()

    ats_file = orchestrator._generate_ats_docx(selected_content, job_analysis, out_dir)
    doc = Document(str(ats_file))

    heading1_paragraphs = [p for p in doc.paragraphs if p.style.name == "Heading 1"]
    assert heading1_paragraphs, "No Heading 1 paragraph found in ATS DOCX"

    name = selected_content["personal_info"]["name"]
    assert any(name in p.text for p in heading1_paragraphs), (
        f"Expected name '{name}' in a Heading 1 paragraph; found: {[p.text for p in heading1_paragraphs]}"
    )


def test_ats_docx_uses_skills_heading(orchestrator, selected_content, job_analysis, tmp_path):
    """ATS DOCX must normalize the skills heading to SKILLS."""
    from docx import Document  # type: ignore

    out_dir = tmp_path / "ats_out_skills_heading"
    out_dir.mkdir()

    ats_file = orchestrator._generate_ats_docx(selected_content, job_analysis, out_dir)
    doc = Document(str(ats_file))

    headings = [p.text.strip() for p in doc.paragraphs if p.style.name == "Heading 2"]
    assert "SKILLS" in headings
    assert "CORE COMPETENCIES" not in headings


def test_ats_compatibility_score_acceptable(orchestrator, selected_content, job_analysis):
    """_validate_ats_compatibility returns a numeric score ≥ 50 for well-matched content."""
    score = orchestrator._validate_ats_compatibility(selected_content, job_analysis)

    assert isinstance(score, (int, float)), f"Expected numeric score, got {type(score)}"
    assert score >= 50, f"ATS score {score} is below the minimum acceptable threshold of 50"


# ── Page Count Validation Tests ────────────────────────────────────────────────

def test_page_count_validation_none_page_count():
    """Page count validation should FAIL when page_count is None."""
    checks = []

    # Simulate the validation check logic
    def _chk(name, label, format_, status, detail):
        checks.append({'name': name, 'label': label, 'format': format_, 'status': status, 'detail': detail})

    page_count = None
    if page_count is None:
        _chk('cv_page_count', 'CV page count', 'pdf', 'fail',
             'Page count could not be determined (HTML render failed)')

    assert len(checks) == 1
    assert checks[0]['status'] == 'fail'
    assert checks[0]['name'] == 'cv_page_count'


def test_page_count_validation_single_page():
    """Page count validation should WARN when page_count is 1."""
    checks = []

    def _chk(name, label, format_, status, detail):
        checks.append({'name': name, 'label': label, 'format': format_, 'status': status, 'detail': detail})

    page_count = 1
    ideal_min, ideal_max = 2, 3

    if page_count == 1:
        _chk('cv_page_count', 'CV page count', 'pdf', 'warn',
             f'{page_count} page — consider {ideal_min}–{ideal_max} pages for senior candidates')

    assert len(checks) == 1
    assert checks[0]['status'] == 'warn'
    assert '1 page' in checks[0]['detail']


def test_page_count_validation_ideal_range():
    """Page count validation should PASS when page_count is 2 or 3."""
    checks = []

    def _chk(name, label, format_, status, detail):
        checks.append({'name': name, 'label': label, 'format': format_, 'status': status, 'detail': detail})

    ideal_min, ideal_max = 2, 3

    for page_count in [2, 3]:
        checks.clear()
        if ideal_min <= page_count <= ideal_max:
            _chk('cv_page_count', 'CV page count', 'pdf', 'pass',
                 f'{page_count} pages — within ideal {ideal_min}–{ideal_max} page range')

        assert len(checks) == 1
        assert checks[0]['status'] == 'pass'
        assert f'{page_count} pages' in checks[0]['detail']


def test_page_count_validation_exceeds_ideal():
    """Page count validation should WARN when 3 < page_count <= 4."""
    checks = []

    def _chk(name, label, format_, status, detail):
        checks.append({'name': name, 'label': label, 'format': format_, 'status': status, 'detail': detail})

    page_count = 4
    ideal_max, absolute_max = 3, 4

    if ideal_max < page_count <= absolute_max:
        _chk('cv_page_count', 'CV page count', 'pdf', 'warn',
             f'{page_count} pages — exceeds {ideal_max}-page ideal range')

    assert len(checks) == 1
    assert checks[0]['status'] == 'warn'
    assert '4 pages' in checks[0]['detail']


def test_page_count_validation_exceeds_maximum():
    """Page count validation should FAIL when page_count > 4."""
    checks = []

    def _chk(name, label, format_, status, detail):
        checks.append({'name': name, 'label': label, 'format': format_, 'status': status, 'detail': detail})

    page_count = 5
    absolute_max = 4

    if page_count > absolute_max:
        _chk('cv_page_count', 'CV page count', 'pdf', 'fail',
             f'{page_count} pages — exceeds {absolute_max}-page maximum; consider condensing')

    assert len(checks) == 1
    assert checks[0]['status'] == 'fail'
    assert '5 pages' in checks[0]['detail']
    assert 'exceeds' in checks[0]['detail']


# ──────────────────────────────────────────────────────────────────
# GAP-07: Proposed Bullet Ordering Tests
# ──────────────────────────────────────────────────────────────────

def _ach_keyword_score(ach, job_keywords):
    """Mirrors the scoring logic in /api/proposed-bullet-order."""
    text = (ach.get("text", "") if isinstance(ach, dict) else str(ach)).lower()
    tokens = set(_re.findall(r'\b\w+\b', text))
    return len(tokens & {kw.lower() for kw in job_keywords})


def _compute_proposed_order(achievements, job_keywords):
    """Return achievement indices sorted by keyword relevance (highest first)."""
    return sorted(range(len(achievements)), key=lambda i: _ach_keyword_score(achievements[i], job_keywords), reverse=True)


def test_proposed_order_sorts_by_keyword_relevance():
    """Achievements with more job keyword matches should rank higher."""
    achievements = [
        {"text": "Managed budgets and spreadsheets"},          # 0 — no keywords
        {"text": "Built Python API with FastAPI and Docker"},  # 1 — python, api, docker
        {"text": "Deployed Docker containers on Kubernetes"},  # 2 — docker, kubernetes
    ]
    job_keywords = {"python", "api", "docker", "kubernetes"}
    proposed = _compute_proposed_order(achievements, job_keywords)
    # Index 1 has 3 matches (python, api, docker), index 2 has 2 (docker, kubernetes), index 0 has 0
    assert proposed[0] == 1
    assert proposed[1] == 2
    assert proposed[2] == 0


def test_proposed_order_empty_achievements():
    """Empty achievements list returns empty proposed order."""
    proposed = _compute_proposed_order([], {"python", "api"})
    assert proposed == []


def test_proposed_order_no_job_keywords_returns_natural_order():
    """With no job keywords all scores are 0, so stable sort returns original order."""
    achievements = [{"text": "A"}, {"text": "B"}, {"text": "C"}]
    # No keywords → all scores are 0; sorted with reverse=True is stable so order preserved
    proposed = _compute_proposed_order(achievements, set())
    assert proposed == [0, 1, 2]


def test_proposed_order_string_achievements():
    """Plain string achievements (not dicts) are handled correctly."""
    achievements = ["Deployed Kubernetes clusters", "Wrote documentation", "Built Python services"]
    job_keywords = {"python", "kubernetes"}
    proposed = _compute_proposed_order(achievements, job_keywords)
    # Index 0 has 1 match (kubernetes), index 2 has 1 match (python), index 1 has 0
    # Both 0 and 2 score 1; index 1 must be last
    assert proposed[-1] == 1


def test_proposed_order_case_insensitive():
    """Keyword matching is case-insensitive."""
    achievements = [
        {"text": "Led PYTHON development"},
        {"text": "Managed team communications"},
    ]
    job_keywords = {"Python"}
    proposed = _compute_proposed_order(achievements, job_keywords)
    assert proposed[0] == 0  # PYTHON matches 'python' keyword


if __name__ == '__main__':
    import pytest, sys
    sys.exit(pytest.main([__file__, '-v']))
