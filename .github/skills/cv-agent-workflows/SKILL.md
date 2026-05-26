<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->
# cv-agent-workflows

## Description

Agent workflow patterns and best practices for using the cv-builder MCP
server.  Load this skill when designing or debugging LLM-agent workflows
that interact with cv-builder.

---

## Passthrough (agent-as-LLM) pattern

The cv-builder MCP server uses a **prepare / submit** pairing for every LLM
step.  The calling agent fulfills the LLM role:

```
1. Call  *_prepare(session_id)
         → returns PromptBundle { operation, messages, output_schema, instructions }

2. Agent reads `messages` array and generates a response

3. Agent VALIDATES its response JSON (must match output_schema)

4. Call  *_submit(session_id, result=<json string>)
         → server validates again, stores, advances phase
```

The server will reject malformed JSON with `{ok: false, error: "..."}`.
Correct and retry — do not skip.

---

## Phase state machine

Phase enum values and transitions (from `conversation_manager.py`):

```
init
  ↓  analysis_submit
job_analysis
  ↓  recommendations_submit
customization
  ↓  rewrites_submit
rewrite_review
  ↓  generate_cv (html_preview_only=false)
generation  →  layout_review  →  final_generation
  ↓
refinement
```

Optional side paths (available after `job_analysis`):
- `questions_prepare/submit` — clarifying questions
- `summary_prepare/submit` — custom professional summary
- `interview_prep_prepare/submit` — interview questions
- `cover_letter_prepare/submit` — cover letter
- `chat_prepare/submit` — ad-hoc Q&A at any phase

Optional side paths (available at `rewrite_review` or later):
- `spell_check_prepare/submit`
- `persuasion_check_prepare/submit`

Always call `session_status` after any submit to confirm phase.

---

## Full workflow skeleton

```python
# 1. Session
sid = session_new()["session_id"]

# 2. Job intake
job_submit_text(sid, job_text=jd)

# 3. Job analysis
bundle = analysis_prepare(sid)
result = fulfill_bundle(bundle)          # agent generates JSON
analysis_submit(sid, result=result)

# 4. Clarifying questions (optional)
bundle = questions_prepare(sid)
result = fulfill_bundle(bundle)
questions_submit(sid, result=result)
# … present questions + answers to user …

# 5. Recommendations
bundle = recommendations_prepare(sid)
result = fulfill_bundle(bundle)
recommendations_submit(sid, result=result)

# 6. Rewrites
bundle = rewrites_prepare(sid)
result = fulfill_bundle(bundle)
rewrites_submit(sid, result=result)
# … present to user, collect approved ids …
rewrites_approve(sid, approved_ids=json.dumps(approved_list))

# 7. Decisions
decisions_submit(sid,
  experience_decisions   = json.dumps({...}),
  skill_decisions        = json.dumps({...}),
  summary_focus_override = "ai_recommended",
)

# 8. Generate
files = generate_cv(sid)["generated_files"]
```

---

## Bundle fulfillment rules

When fulfilling a PromptBundle:
- Use the `messages` array as the conversation context.
- The last message is the user turn; the system message sets the role/task.
- `output_schema` is a JSON Schema — your response must validate against it.
- `instructions` gives plain-English guidance; prefer schema over instructions when they conflict.
- Always return a JSON object (not a narrative); wrap in `{}` if the schema root is `object`.

---

## Error recovery

| Error | Recovery |
|-------|----------|
| `{ok: false, error: "Invalid JSON"}` | Fix syntax, retry `*_submit` |
| `{ok: false, error: "Schema validation failed"}` | Read `output_schema`, add missing fields, retry |
| `{ok: false, error: "Session not found"}` | Call `session_list`, find the session_file, `session_load` |
| `{ok: false, error: "Phase guard"}` | Check `session_status` phase; master edits only in init/refinement |
| `{ok: false, error: "No job description"}` | Must call `job_submit_text` before `analysis_prepare` |

---

## Parallel-session pattern

Each `session_new` returns a unique `session_id`.  Multiple sessions can
coexist in the MCP server's in-process cache.  To work with multiple jobs
simultaneously, create a separate session per job and track session_ids.

---

## CLI agent-mode equivalent

The CLI mirrors the MCP passthrough pattern with `--agent-mode`:

```bash
# Prepare (prints PromptBundle JSON)
cv-cli --agent-mode --session-id <id> analyze run > bundle.json

# Agent processes bundle.json → writes result.json

# Submit
cv-cli --session-id <id> analyze submit --result-file result.json
```

Use the CLI for scripted pipelines; use the MCP server for Copilot/agent integration.
