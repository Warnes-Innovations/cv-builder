# cv-mcp-reference

## Description

Quick reference for all cv-builder MCP server tools.  The MCP server is
started via `.vscode/mcp.json` and exposes the server name `cv-builder`.

Load this skill when you need to know:
- Which tools exist and what they do
- Tool argument types and shapes
- Which tools return PromptBundles (passthrough pattern)
- Which tools require a `session_id`

---

## Session management tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `session_new` | `provider?`, `model?` | `{ok, session_id, session_file}` |
| `session_list` | — | `[{session_id, session_file, phase, position_name, modified}]` |
| `session_load` | `session_file` | `{ok, session_id, phase}` |
| `session_status` | `session_id` | `{session_id, phase, position_name, has_job_text, ...}` |
| `session_save` | `session_id` | `{ok, session_file}` |
| `session_evict` | `session_id` | `{ok}` |

---

## Job intake tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `job_submit_text` | `session_id`, `job_text` | `{ok, phase}` |
| `job_submit_file` | `session_id`, `file_path` | `{ok, phase}` |

---

## Analysis tools (passthrough pair)

| Tool | Arguments | Returns |
|------|-----------|---------|
| `analysis_prepare` | `session_id` | PromptBundle dict + `{ok: true}` |
| `analysis_submit` | `session_id`, `result: str` | `{ok, phase, position_name}` |

**PromptBundle shape:**
```json
{
  "operation": "job_analysis",
  "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
  "output_schema": { ... },
  "instructions": "...",
  "context_hint": "..."
}
```

---

## Clarifying questions tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `questions_prepare` | `session_id` | PromptBundle dict |
| `questions_submit` | `session_id`, `result: str` | `{ok, phase}` |

---

## Recommendations tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `recommendations_prepare` | `session_id`, `user_preferences?: str` | PromptBundle dict |
| `recommendations_submit` | `session_id`, `result: str` | `{ok, phase}` |

---

## Summary tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `summary_prepare` | `session_id`, `refinement_prompt?: str`, `previous_summary?: str` | PromptBundle dict |
| `summary_submit` | `session_id`, `result: str` | `{ok}` |

---

## Rewrite tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `rewrites_prepare` | `session_id` | PromptBundle dict |
| `rewrites_submit` | `session_id`, `result: str` | `{ok, proposal_count, phase}` |
| `rewrites_approve` | `session_id`, `approved_ids: str` (JSON array) | `{ok, approved, rejected}` |

---

## Quality check tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `spell_check_prepare` | `session_id` | PromptBundle dict |
| `spell_check_submit` | `session_id`, `result: str` | `{ok, correction_count}` |
| `persuasion_check_prepare` | `session_id` | PromptBundle dict |
| `persuasion_check_submit` | `session_id`, `result: str` | `{ok, warning_count}` |

---

## Interview prep & cover letter tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `interview_prep_prepare` | `session_id` | PromptBundle dict |
| `interview_prep_submit` | `session_id`, `result: str` | `{ok}` |
| `cover_letter_prepare` | `session_id`, `tone?: str`, `notes?: str` | PromptBundle dict |
| `cover_letter_submit` | `session_id`, `result: str` | `{ok}` |

---

## Chat tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `chat_prepare` | `session_id`, `user_message: str` | PromptBundle dict |
| `chat_submit` | `session_id`, `user_message: str`, `result: str` | `{ok, response}` |

---

## Direct LLM shortcuts (require server `--provider`)

| Tool | Arguments | Returns |
|------|-----------|---------|
| `run_analysis` | `session_id` | `{ok, phase, position_name}` |
| `run_recommendations` | `session_id`, `user_preferences?: str` | `{ok, phase}` |

---

## Decisions tool

```
decisions_submit(
  session_id,
  experience_decisions?: str,   # JSON object: {title: "include"|"exclude"}
  skill_decisions?: str,        # JSON object: {skill: "include"|"exclude"}
  achievement_decisions?: str,  # JSON object: {id: "include"|"exclude"}
  publication_decisions?: str,  # JSON object: {key: "include"|"exclude"}
  extra_skills?: str,           # JSON array of skill strings to add
  summary_focus_override?: str  # "ai_recommended"|"user_written"|key name
)
→ {ok}
```

---

## CV generation tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `generate_cv` | `session_id`, `html_preview_only?: bool` | `{ok, generated_files}` |
| `get_generated_files` | `session_id` | `{ok, generated_files}` |

---

## Master data tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `master_data_read` | `session_id`, `section?: str` | `{ok, data}` |
| `master_data_update_section` | `session_id`, `section: str`, `data: str` | `{ok, section}` |
| `publications_read` | `session_id` | `{ok, bibtex: str}` |

---

## State inspection tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `get_job_analysis` | `session_id` | `{ok, job_analysis}` |
| `get_customizations` | `session_id` | `{ok, customizations}` |
| `get_pending_rewrites` | `session_id` | `{ok, pending_rewrites}` |

---

## JSON compliance rule (CRITICAL)

All JSON passed to any `*_submit` or `*_update_*` tool must be:
1. Syntactically valid (no trailing commas, no code fences, no comments).
2. Matching the `output_schema` from the PromptBundle (for submit tools).
3. Complete — do not omit required fields.

The server validates with jsonschema and returns `{ok: false, error: "..."}` on failure.
