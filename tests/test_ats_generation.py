#!/usr/bin/env python3
"""
Tests for ATS DOCX generation and ATS compatibility scoring (CVOrchestrator).
"""

import json
import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.cv_orchestrator import CVOrchestrator


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


def test_ats_compatibility_score_acceptable(orchestrator, selected_content, job_analysis):
    """_validate_ats_compatibility returns a numeric score ≥ 50 for well-matched content."""
    score = orchestrator._validate_ats_compatibility(selected_content, job_analysis)

    assert isinstance(score, (int, float)), f"Expected numeric score, got {type(score)}"
    assert score >= 50, f"ATS score {score} is below the minimum acceptable threshold of 50"


if __name__ == '__main__':
    import pytest, sys
    sys.exit(pytest.main([__file__, '-v']))
