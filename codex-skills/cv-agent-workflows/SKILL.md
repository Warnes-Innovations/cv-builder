# cv-agent-workflows

## Description

Agent workflow patterns for cv-builder MCP.

See the full guide in `.github/skills/cv-agent-workflows/SKILL.md`.
This is the Codex-facing mirror.

---

<!-- BEGIN MIRROR — keep in sync with .github/skills/cv-agent-workflows/SKILL.md -->

## Passthrough pattern

```
1. *_prepare(session_id)    → PromptBundle {messages, output_schema, instructions}
2. Agent reads messages, generates response
3. Agent validates response JSON matches output_schema
4. *_submit(session_id, result=<json string>)
```

## Phase state machine

```
init → (job_submit_text) → init
     → (analysis_submit) → job_analysis
     → (recommendations_submit) → customization
     → (rewrites_submit) → rewrite_review
     → (generate_cv done) → refinement
```

## Full workflow

```python
sid    = session_new()["session_id"]
job_submit_text(sid, job_text=jd)
bundle = analysis_prepare(sid)
result = fulfill_bundle(bundle)     # agent generates JSON
analysis_submit(sid, result=result)
# ... recommendations, rewrites, decisions ...
files = generate_cv(sid)["generated_files"]
```

## Bundle fulfillment

- Use `messages` array as conversation.
- Response must validate against `output_schema` (JSON Schema).
- Return valid JSON object; never markdown prose.

## Error recovery

- `"Invalid JSON"` → fix syntax, retry
- `"Schema validation failed"` → add missing fields, retry
- `"Phase guard"` → check phase; master edits only in init/refinement

## CLI equivalent (agent-mode)

```bash
cv-cli --agent-mode --session-id <id> analyze run > bundle.json
# fulfill bundle.json → result.json
cv-cli --session-id <id> analyze submit --result-file result.json
```

<!-- END MIRROR -->
