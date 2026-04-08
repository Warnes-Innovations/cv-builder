# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

"""
Canned API responses for Playwright route interception.

All LLM-backed endpoints are intercepted in tests so no real API
credentials or network calls are needed.
"""

SAMPLE_JOB_TEXT = """\
Senior Data Scientist at Acme Corp

We are looking for a Senior Data Scientist to join our AI team.

Requirements:
- 5+ years of experience in machine learning and statistical modelling
- Proficiency in Python and R
- Experience with NLP and large language models
- Strong communication skills

Responsibilities:
- Develop and deploy ML models for production
- Collaborate with engineering and product teams
- Mentor junior data scientists
"""

# POST /api/job  → 200
API_JOB_OK = {
    "ok": True,
    "position_name": "Senior Data Scientist at Acme Corp",
    "phase": "job_analysis",
}

# GET /api/status (initial, no job loaded yet — triggers showLoadJobPanel on page load)
API_STATUS_INIT = {
    "phase":                    "init",
    "position_name":            None,
    "job_description":          False,
    "job_description_text":     None,
    "job_analysis":             None,
    "post_analysis_questions":  [],
    "post_analysis_answers":    {},
    "customizations":           None,
    "generated_files":          None,
    "generation_progress":      [],
    "persuasion_warnings":      [],
    "all_experience_ids":       [],
    "all_skills":               [],
    "copilot_auth":             {"authenticated": False},
    "iterating":                False,
    "reentry_phase":            None,
}

# GET /api/status (initial / after job submitted)
API_STATUS_JOB_LOADED = {
    "phase": "job_analysis",
    "position_name": "Senior Data Scientist at Acme Corp",
    "job_description": True,
    "job_description_text": SAMPLE_JOB_TEXT,
    "job_analysis": None,
    "post_analysis_questions": [],
    "post_analysis_answers": {},
    "customizations": None,
    "generated_files": None,
    "generation_progress": [],
    "persuasion_warnings": [],
    "all_experience_ids": ["exp-001", "exp-002"],
    "all_skills": ["Python", "R", "Machine Learning", "NLP"],
    "copilot_auth": {"authenticated": False},
    "iterating": False,
    "reentry_phase": None,
}

# GET /api/status (after analysis)
API_STATUS_ANALYSIS_DONE = {
    **API_STATUS_JOB_LOADED,
    "phase": "customization",
    "job_analysis": {
        "job_title": "Senior Data Scientist",
        "company": "Acme Corp",
        "role_level": "Senior",
        "domain": "Data Science / ML",
        "required_skills": ["Python", "R", "Machine Learning", "NLP", "LLM"],
        "nice_to_have_skills": ["Spark", "AWS"],
        "key_responsibilities": [
            "Develop and deploy ML models",
            "Collaborate with engineering and product teams",
            "Mentor junior data scientists",
        ],
        "experience_recommendations": [
            {"id": "exp-001", "recommendation": "Emphasize", "confidence": "high", "reasoning": "Directly relevant ML experience"},
            {"id": "exp-002", "recommendation": "Include", "confidence": "medium", "reasoning": "Shows breadth"},
        ],
        "skill_recommendations": [
            {"skill": "Python", "recommendation": "Emphasize", "confidence": "high", "reasoning": "Core requirement"},
            {"skill": "R", "recommendation": "Include", "confidence": "medium", "reasoning": "Mentioned in JD"},
        ],
        "summary_recommendation": "Emphasize quantitative and leadership experience.",
    },
}

# POST /api/action (analyze_job) → 200
API_ACTION_ANALYZE_OK = {
    "ok": True,
    "phase": "customization",
    "result": API_STATUS_ANALYSIS_DONE["job_analysis"],
}

# POST /api/action (recommend_customizations) → 200
# Includes both the canonical form (experience_recommendations / skill_recommendations)
# AND the backwards-compat flat lists (recommended_experiences / recommended_skills) that
# handleCustomizationResponse() checks to decide whether to set pendingRecommendations.
API_ACTION_RECOMMEND_OK = {
    "ok": True,
    "phase": "customization",
    "result": {
        "experience_recommendations": API_STATUS_ANALYSIS_DONE["job_analysis"]["experience_recommendations"],
        "skill_recommendations": API_STATUS_ANALYSIS_DONE["job_analysis"]["skill_recommendations"],
        "recommended_experiences": ["exp-001", "exp-002"],
        "recommended_skills": ["Python", "R"],
    },
}

# POST /api/post-analysis-responses → 200
API_POST_ANALYSIS_OK = {"ok": True, "phase": "customization"}

# POST /api/review-decisions → 200
API_REVIEW_DECISIONS_OK = {"ok": True, "phase": "rewrite_review"}

# GET /api/rewrites → list of rewrite proposals
API_REWRITES_GET = {
    "rewrites": [
        {
            "id": "rw-001",
            "experience_id": "exp-001",
            "bullet_index": 0,
            "original": "Worked on machine learning models.",
            "proposed": "Designed and deployed production ML models that improved prediction accuracy by 18%.",
            "reasoning": "Quantifies impact; replaces weak verb.",
            "weak_evidence": False,
        },
        {
            "id": "rw-002",
            "experience_id": "exp-001",
            "bullet_index": 1,
            "original": "Helped team with data analysis.",
            "proposed": "Led cross-functional data analysis initiatives across 3 product verticals.",
            "reasoning": "Strengthens ownership; adds scope.",
            "type": "skill_add",
            "evidence_strength": "weak",
            "weak_evidence": True,
            "weak_evidence_reason": "No supporting evidence in CV data.",
        },
    ]
}

# POST /api/rewrites/approve → 200
API_REWRITES_APPROVE_OK = {
    "ok": True,
    "phase": "spell_check",
    "approved": ["rw-001"],
    "rejected": ["rw-002"],
}

# GET /api/spell-check (or action result)
API_SPELL_CHECK_OK = {
    "ok": True,
    "phase": "generation",
    "issues": [],
    "message": "No spelling or grammar issues found.",
}

# POST /api/generate → 200
API_GENERATE_OK = {
    "ok": True,
    "phase": "refinement",
    "files": {
        "ats_docx": "CV_AcmeCorp_SeniorDataScientist_2026-03-11_ATS.docx",
        "html": "CV_AcmeCorp_SeniorDataScientist_2026-03-11.html",
        "pdf": "CV_AcmeCorp_SeniorDataScientist_2026-03-11.pdf",
    },
    "generation_progress": [
        "Starting CV generation...",
        "Applying rewrites...",
        "Rendering HTML...",
        "Generating ATS DOCX...",
        "Generating PDF...",
        "✅ Generation complete.",
    ],
}

# GET /api/history (empty)
API_HISTORY_EMPTY = {"history": [], "phase": "init"}

# GET /api/history (with job loaded)
API_HISTORY_JOB = {
    "history": [
        {"role": "system", "content": "Job description loaded: Senior Data Scientist at Acme Corp"},
    ],
    "phase": "job_analysis",
}

# GET /api/load-items → merged list of sessions + server-side job files
API_LOAD_ITEMS = {
    "items": [
        {
            "kind":         "session",
            "path":         "/fake/cv/files/acme-job/session.json",
            "label":        "Senior Data Scientist at Acme Corp",
            "timestamp":    "2026-03-11T10:00:00",
            "phase":        "customization",
            "has_job":      True,
            "has_analysis": True,
            "has_cv":       False,
        },
        {
            "kind":      "file",
            "path":      "/fake/sample_jobs/sample_job.txt",
            "filename":  "sample_job.txt",
            "label":     "Sample Job",
            "timestamp": "",
            "phase":     "",
        },
    ]
}

# POST /api/load-session → 200
API_LOAD_SESSION_OK = {
    "ok":            True,
    "position_name": "Senior Data Scientist at Acme Corp",
    "phase":         "customization",
    "has_job":       True,
    "has_analysis":  True,
    "history_count": 2,
}

# POST /api/load-job-file → 200
API_LOAD_JOB_FILE_OK = {
    "ok":       True,
    "job_text": SAMPLE_JOB_TEXT,
}

# GET /api/status — analysis complete but still in job_analysis phase (tab-analysis visible)
API_STATUS_IN_ANALYSIS = {
    **API_STATUS_ANALYSIS_DONE,
    "phase": "job_analysis",
}

# GET /api/status — in rewrite_review phase (rewrite stage: #tab-rewrite visible)
API_STATUS_REWRITE = {
    **API_STATUS_ANALYSIS_DONE,
    "phase": "rewrite_review",
    # customizations must be non-null so _resolveRestoredPhase() does not
    # downgrade rewrite_review → job_analysis (the guard fires when
    # customizations is falsy for customization/rewrite_review phases).
    "customizations": {
        "experience_recommendations": API_STATUS_ANALYSIS_DONE["job_analysis"]["experience_recommendations"],
        "skill_recommendations":      API_STATUS_ANALYSIS_DONE["job_analysis"]["skill_recommendations"],
        "recommended_experiences":    ["exp-001", "exp-002"],
        "recommended_skills":         ["Python", "R"],
    },
}

# GET /api/status — in spell_check phase (spell stage: #tab-spell visible)
API_STATUS_SPELL = {
    **API_STATUS_ANALYSIS_DONE,
    "phase": "spell_check",
}

# GET /api/status — in generation phase (generate stage: #tab-generate visible)
API_STATUS_GENERATE = {
    **API_STATUS_ANALYSIS_DONE,
    "phase": "generation",
    "generated_files": {
        "ats_docx": "CV_Test_ATS.docx",
        "html": "CV_Test.html",
        "pdf": "CV_Test.pdf",
    },
}

# GET /api/status — in layout_review phase
API_STATUS_LAYOUT_REVIEW = {
    **API_STATUS_GENERATE,
    "phase": "layout_review",
}

# GET /api/status — in refinement phase (finalise stage: #tab-download, #tab-finalise visible)
API_STATUS_FINALISE = {
    **API_STATUS_GENERATE,
    "phase": "refinement",
}

# GET /api/cv/generation-state — canonical idle state
API_GENERATION_STATE_IDLE = {
    "ok": True,
    "phase": "idle",
    "preview_available": False,
    "layout_confirmed": False,
    "page_count_estimate": None,
    "page_length_warning": False,
    "layout_instructions_count": 0,
    "final_generated_at": None,
}

# GET /api/cv/generation-state — active layout review preview
API_GENERATION_STATE_LAYOUT_REVIEW = {
    **API_GENERATION_STATE_IDLE,
    "phase": "layout_review",
    "preview_available": True,
    "page_count_estimate": 2,
    "layout_instructions_count": 1,
}

# GET /api/cv/generation-state — confirmed layout awaiting final outputs
API_GENERATION_STATE_CONFIRMED = {
    **API_GENERATION_STATE_LAYOUT_REVIEW,
    "phase": "confirmed",
    "layout_confirmed": True,
}

# GET /api/cv/generation-state — final outputs generated
API_GENERATION_STATE_FINAL_COMPLETE = {
    **API_GENERATION_STATE_CONFIRMED,
    "phase": "final_complete",
    "final_generated_at": "2026-03-24T00:47:00-04:00",
}
