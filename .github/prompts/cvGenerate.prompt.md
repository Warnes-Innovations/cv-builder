---
mode: agent
description: >
  Full end-to-end CV generation workflow via cv-builder MCP.
  Guides the agent through: job intake → analysis → recommendations
  → rewrites → decisions → generation.
---

# CV Generation Workflow

Use the **cv-builder-agent** agent (`.github/agents/cv-builder-agent.agent.md`)
to drive this workflow.

## Inputs

Provide one or more of:
- **Job description text** (paste inline)
- **Job description file** (path to a `.txt` file)
- **Session ID** (to resume an existing session)

## Steps

### 1. Session setup

```
session_new()  →  save session_id
```

Or resume: `session_list()` → `session_load(session_file=...)`.

### 2. Submit job description

```
job_submit_text(session_id, job_text=<full jd>)
```

### 3. Analyze job (agent fulfills)

```
analysis_prepare(session_id)
→ [agent fulfills PromptBundle — generates job_analysis JSON]
analysis_submit(session_id, result=<json>)
```

### 4. Generate clarifying questions (optional)

```
questions_prepare(session_id)
→ [agent fulfills — generates questions JSON]
questions_submit(session_id, result=<json>)
```
Present questions to the user; collect answers.

### 5. Get customization recommendations (agent fulfills)

```
recommendations_prepare(session_id)
→ [agent fulfills — generates recommendations JSON]
recommendations_submit(session_id, result=<json>)
```

### 6. Propose rewrites (agent fulfills)

```
rewrites_prepare(session_id)
→ [agent fulfills — generates rewrite proposals JSON array]
rewrites_submit(session_id, result=<json>)
```
Present proposals to user → collect approved_ids → `rewrites_approve(session_id, approved_ids=<json array>)`.

### 7. Collect decisions

```
decisions_submit(
  session_id,
  experience_decisions=<json>,
  skill_decisions=<json>,
  achievement_decisions=<json>,
  extra_skills=<json array>,
  summary_focus_override="ai_recommended"
)
```

### 8. Quality checks (optional)

```
spell_check_prepare → [fulfill] → spell_check_submit
persuasion_check_prepare → [fulfill] → persuasion_check_submit
```

### 9. Generate CV

```
generate_cv(session_id)
→ returns {"generated_files": {...}}
```

Report the output file paths to the user.

## Error recovery

If any `*_submit` returns `{"ok": false}`, read the error, correct the JSON,
and retry.  Never advance to the next step while a phase is in an error state.
