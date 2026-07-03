<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
---
name: cv-builder-workflow
description: >
  Full-workflow guide for using the cv-builder MCP server or CLI to generate
  position-specific CV documents.  Covers every phase, output schema,
  user-interaction pattern, and decisions format.  Load this skill when
  driving or debugging a cv-builder session end-to-end.
applyTo: "**/cv-builder/**"
---

# cv-builder Full Workflow Guide

## Server startup — two modes

The MCP server is declared in `.vscode/mcp.json`.  Start it once; all tools
below are then available as `mcp://cv-builder/*`.

| Mode | When | How |
|------|------|-----|
| **Passthrough (agent-as-LLM)** | Agent fulfills each LLM step | No `--provider`; every `*_prepare` returns a PromptBundle for the agent |
| **Internal-LLM** | Fully automated pipeline | `--provider github` (or `openai`/`anthropic`/`local`); use `run_analysis` / `run_recommendations` shortcuts |

Environment (always use the conda env):

```bash
conda run -n cvgen python scripts/mcp_server.py --provider github
```

---

## Phase state machine

Phase enum values (from `conversation_manager.py`):

```
init
  ↓  job_submit_text / job_submit_file
  ↓  analysis_submit
job_analysis
  ↓  recommendations_submit
customization
  ↓  rewrites_submit
rewrite_review
  ↓  generate_cv (html_preview_only=false)
generation
  ↓  (layout confirmed)
layout_review
  ↓  (final generation triggered)
final_generation
  ↓
refinement
```

Side paths available after `job_analysis`:
- `questions_prepare/submit` — clarifying questions (optional)
- `summary_prepare/submit` — custom professional summary (optional)
- `interview_prep_prepare/submit` — interview Q&A (optional)
- `cover_letter_prepare/submit` — cover letter (optional)
- `chat_prepare/submit` — ad-hoc Q&A at any phase

Side paths available at `rewrite_review` or later:
- `spell_check_prepare/submit` — spelling/grammar
- `persuasion_check_prepare/submit` — weak language audit

Always call `session_status` after any `*_submit` to confirm phase.

---

## Step-by-step workflow

### Step 0 — Session setup

```
session_new()
  → {ok: true, session_id: "<uuid>", session_file: "<path>"}

# or resume
session_list()
  → [{session_id, session_file, phase, position_name, modified}, ...]
session_load(session_file="<path>")
  → {ok, session_id, phase}

session_status(session_id="<sid>")
  → {session_id, phase, position_name, has_job_text, ...}
```

---

### Step 1 — Job submission (phase: init)

```
job_submit_text(session_id="<sid>", job_text="<full JD text>")
  → {ok: true, phase: "init"}
```

Or from a file path:
```
job_submit_file(session_id="<sid>", file_path="/path/to/jd.txt")
```

---

### Step 2 — Job analysis (phase: init → job_analysis)

**Operation:** `job_analysis`  
**Pattern:** `analysis_prepare` → fulfill → `analysis_submit`

**Output schema** (agent must return exactly this):

```json
{
  "title":                     "string",
  "company":                   "string",
  "domain":                    "string",
  "role_level":                "string",
  "required_skills":           ["string"],
  "preferred_skills":          ["string"],
  "must_have_requirements":    ["string"],
  "nice_to_have_requirements": ["string"],
  "culture_indicators":        ["string"],
  "ats_keywords":              ["string"]
}
```

**Shortcut (internal-LLM mode):**
```
run_analysis(session_id="<sid>")
  → {ok, phase: "job_analysis", position_name: "<title @ company>"}
```

**Present to user:** job title, company, role level, domain, top required skills,
ATS keywords.  Ask if the analysis is correct before continuing.

---

### Step 3 — Clarifying questions (optional, phase: job_analysis)

**Operation:** `post_analysis_questions`  
**Pattern:** `questions_prepare` → fulfill → `questions_submit`

**Output schema:**

```json
{
  "intro":     "string (≤120 chars)",
  "questions": [
    {
      "type":     "string",
      "question": "string",
      "choices":  ["string"]
    }
  ]
}
```

**Present to user:** display `intro`, then each question with its choices.
Collect answers to inform the recommendations step.

---

### Step 4 — Recommendations (phase: job_analysis → customization)

**Operation:** `recommendations`  
**Pattern:** `recommendations_prepare` → fulfill → `recommendations_submit`

**Output schema:**

```json
{
  "experience_recommendations": [
    {
      "id":             "exp_001",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence":     "Very High|High|Medium|Low|Very Low",
      "reasoning":      "string",
      "bullet_order": {
        "order":              [1, 0, 2],
        "reasoning":          "string",
        "ats_impact":         "string",
        "page_length_impact": "none|low|medium|high"
      }
    }
  ],
  "skill_recommendations": [
    {
      "skill":          "string",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence":     "Very High|High|Medium|Low|Very Low",
      "reasoning":      "string",
      "grouping": {
        "category":           "string",
        "group":              "string",
        "reasoning":          "string",
        "ats_impact":         "string",
        "page_length_impact": "none|low|medium|high"
      }
    }
  ],
  "achievement_recommendations": [
    {
      "id":             "sa_001",
      "recommendation": "Emphasize|Include|De-emphasize|Omit",
      "confidence":     "Very High|High|Medium|Low|Very Low",
      "reasoning":      "string"
    }
  ],
  "summary_focus":    "string (what to emphasize in the summary)",
  "applicant_tagline":"string (one-line professional description, not job title)",
  "reasoning":        "string (overall strategy)"
}
```

**Shortcut (internal-LLM mode):**
```
run_recommendations(session_id="<sid>", user_preferences="<optional text>")
```

**Present to user:**
- Applicant tagline and summary_focus
- Table of experiences: ID | recommendation | confidence | reasoning
- Table of skills: skill | recommendation | confidence
- Ask which recommendations to accept/override — these become the decisions in Step 6

---

### Step 5 — Summary (optional)

**Operation:** `summary`  
**Pattern:** `summary_prepare` → fulfill → `summary_submit`

Optional args: `refinement_prompt`, `previous_summary`

**Output schema:**

```json
{
  "summary": "string (3–5 sentence professional summary, no markdown)"
}
```

---

### Step 6 — Rewrites (phase: customization → rewrite_review)

**Operation:** `rewrite`  
**Pattern:** `rewrites_prepare` → fulfill → `rewrites_submit` → present → `rewrites_approve`

**Output schema** (top-level is a **JSON array**, not object):

```json
[
  {
    "id":                  "rw_001",
    "type":                "bullet|summary|skill|achievement",
    "location":            "string (e.g. 'exp_001 bullet 2')",
    "original":            "string",
    "proposed":            "string",
    "keywords_introduced": ["string"],
    "rationale":           "string"
  }
]
```

**Present to user:** for each proposal, show original vs. proposed side-by-side
with rationale and keywords introduced.  Collect the IDs the user wants to apply.

**Approve:**
```
rewrites_approve(session_id="<sid>", approved_ids='["rw_001","rw_003"]')
  → {ok, approved: 2, rejected: 1}
```

`approved_ids` is a **JSON-serialized array of strings** (not an array literal).

---

### Step 7 — Decisions

Submit user decisions about which content to include.  All parameters are optional;
omit any that haven't changed.

```
decisions_submit(
  session_id           = "<sid>",
  experience_decisions = '{"exp_001": "emphasize", "exp_002": "include", "exp_004": "omit"}',
  skill_decisions      = '{"Python": "emphasize", "COBOL": "omit"}',
  achievement_decisions= '{"sa_001": "include", "sa_002": "omit"}',
  publication_decisions= '{"jones2020": "include"}',
  extra_skills         = '["dbt", "Databricks"]',
  summary_focus_override = "ai_recommended"
)
→ {ok}
```

**Decision value enum** (same for experience, skill, achievement, publication):

| Value | Meaning |
|-------|---------|
| `"emphasize"` | Feature prominently; move to top; expand bullets |
| `"include"` | Include normally |
| `"de-emphasize"` | Keep but reduce prominence |
| `"omit"` | Exclude from this CV entirely |

`summary_focus_override` values:
- `"ai_recommended"` — use the `summary_focus` string from recommendations
- `"user_written"` — use the user's manually typed summary
- `"<variant_key>"` — a key from `summary_variants` in `Master_CV_Data.json`

---

### Step 8 — Quality checks (optional)

**Spell check** (`spell_check_prepare` / `spell_check_submit`):

```json
{
  "corrections": [
    {"original": "string", "corrected": "string", "context": "string"}
  ]
}
```

**Persuasion check** (`persuasion_check_prepare` / `persuasion_check_submit`):

```json
{
  "warnings": [
    {"type": "string", "text": "string", "suggestion": "string"}
  ]
}
```

Present both results to the user for review.  Applied on submit.

---

### Step 9 — CV generation

```
generate_cv(session_id="<sid>", html_preview_only=false)
  → {ok, generated_files: ["/path/CV_Company_Title_YYYY-MM-DD.pdf", ...]}
```

Output formats (controlled by `generation.formats` in `config.yaml`):

| Suffix | Format |
|--------|--------|
| `*_preview.html` | HTML preview |
| `*_ats.docx` | ATS-optimized DOCX |
| `*_human.pdf` | Human-readable PDF (WeasyPrint primary, Chrome fallback) |
| `*_human.docx` | Human-readable DOCX |

Report all file paths to the user.

---

### Step 10 — Optional extras

**Interview prep** (`interview_prep_prepare` / `interview_prep_submit`):

```json
{
  "questions": [
    {"question": "string", "rationale": "string", "hint": "string"}
  ]
}
```

Generates ~10 targeted interview questions based on job + candidate profile.

**Cover letter** (`cover_letter_prepare` / `cover_letter_submit`):

Optional args: `tone` (string), `notes` (string).

```json
{
  "cover_letter": "string (full letter text, no markdown)"
}
```

**Chat** (`chat_prepare` / `chat_submit`):

```
chat_prepare(session_id="<sid>", user_message="<question>")
  → PromptBundle

chat_submit(session_id="<sid>", user_message="<question>", result='{"response":"<answer>"}')
  → {ok, response: "string"}
```

Use for ad-hoc CV advice at any phase.

---

## PromptBundle fulfillment rules

Every `*_prepare` call returns a PromptBundle with these fields:

```json
{
  "operation":     "job_analysis | recommendations | ...",
  "messages":      [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
  "output_schema": { ... },
  "instructions":  "plain-English guidance",
  "context_hint":  "one-line description"
}
```

Rules:
1. Use `messages` as the conversation context; the last message is the user turn.
2. Your response **must** be valid JSON matching `output_schema`.
3. Return ONLY raw JSON — no markdown fences, no prose, no labels.
4. Prefer schema constraints over `instructions` if they conflict.

---

## JSON compliance (CRITICAL)

All string arguments to `*_submit`, `decisions_submit`, `rewrites_approve`:
1. Must be **syntactically valid JSON** — no trailing commas, no code fences, no comments.
2. Must match the `output_schema` from the PromptBundle.
3. Must be **complete** — do not omit required fields.

On failure the server returns `{"ok": false, "error": "..."}`.  Fix and retry.

---

## Error recovery

| Error | Recovery |
|-------|----------|
| `"Invalid JSON"` | Fix syntax; retry `*_submit` |
| `"Schema validation failed"` | Add missing fields per `output_schema`; retry |
| `"Session not found"` | Call `session_list`, find `session_file`, call `session_load` |
| `"Phase guard"` | Check `session_status` phase; master edits only in `init`/`refinement` |
| `"No job description"` | Must call `job_submit_text` before `analysis_prepare` |

---

## Harvest workflow (post-generation, phase: refinement)

Use `POST /api/harvest/apply` (web app) or the harvest CLI to write
approved rewrites, new skills, and summary variants back to
`Master_CV_Data.json`.  This is the only supported path for updating the
master during a customization session.

See `.github/prompts/cvHarvest.prompt.md` for the full workflow.
