# cv-mcp-reference

## Description

Quick reference for all cv-builder MCP server tools.

See the full reference in `.github/skills/cv-mcp-reference/SKILL.md`.

This file is the Codex-facing mirror.  The content is identical; it is
duplicated here so Codex agents can find it under `codex-skills/`.

---

<!-- BEGIN MIRROR — keep in sync with .github/skills/cv-mcp-reference/SKILL.md -->

## Session management tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `session_new` | `provider?`, `model?` | `{ok, session_id, session_file}` |
| `session_list` | — | `[{session_id, session_file, phase, position_name, modified}]` |
| `session_load` | `session_file` | `{ok, session_id, phase}` |
| `session_status` | `session_id` | `{session_id, phase, ...}` |
| `session_save` | `session_id` | `{ok, session_file}` |
| `session_evict` | `session_id` | `{ok}` |

## Job intake tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `job_submit_text` | `session_id`, `job_text` | `{ok, phase}` |
| `job_submit_file` | `session_id`, `file_path` | `{ok, phase}` |

## Passthrough pairs

| Prepare | Submit | Phase after submit |
|---------|--------|-------------------|
| `analysis_prepare` | `analysis_submit(result)` | `job_analysis` |
| `questions_prepare` | `questions_submit(result)` | `job_analysis` |
| `recommendations_prepare` | `recommendations_submit(result)` | `customization` |
| `summary_prepare` | `summary_submit(result)` | unchanged |
| `rewrites_prepare` | `rewrites_submit(result)` | `rewrite_review` |
| `spell_check_prepare` | `spell_check_submit(result)` | unchanged |
| `persuasion_check_prepare` | `persuasion_check_submit(result)` | unchanged |
| `interview_prep_prepare` | `interview_prep_submit(result)` | unchanged |
| `cover_letter_prepare` | `cover_letter_submit(result)` | unchanged |
| `chat_prepare` | `chat_submit(user_message, result)` | unchanged |

## Decisions tool

`decisions_submit(session_id, experience_decisions?, skill_decisions?, achievement_decisions?, publication_decisions?, extra_skills?, summary_focus_override?)`

All decision arguments are JSON strings.

## CV generation

`generate_cv(session_id, html_preview_only?)` → `{ok, generated_files}`

## Master data tools (init / refinement phase only)

`master_data_read(session_id, section?)` → `{ok, data}`
`master_data_update_section(session_id, section, data)` → `{ok, section}`
`publications_read(session_id)` → `{ok, bibtex}`

## JSON compliance rule (CRITICAL)

All JSON passed to `*_submit` or `*_update_*` must be syntactically valid,
schema-conformant, and complete.  The server validates and returns
`{ok: false, error: "..."}` on failure.

<!-- END MIRROR -->
