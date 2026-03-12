# Copilot Instructions for cv-builder

## 🛑🛑🛑 MANDATORY PRE-FLIGHT 🛑🛑🛑

**BEFORE RESPONDING TO ANY REQUEST:** Execute `/preflight`.
See `~/src/vscode-config/.github/prompts/preflight.prompt.md` for full requirements.

☐ State which copilot-instructions.md sections apply to this request
☐ List applicable Agent Skills explicitly
☐ If multi-step: create todo list
☐ Use `/codeReview` before finalising ANY code changes
☐ Use "we" collaborative language; refer to user as "Dr. Greg"

---

## 🛑 CRITICAL: NEVER LOSE USER DATA

1. **NEVER delete, drop, or destroy user data** by error, omission, or negligence
2. **ALWAYS get explicit confirmation** for ANY action that destroys data
3. **Create backups before irreversible operations** (session files, `Master_CV_Data.json`, generated output under `~/CV/`)
4. **When in doubt, ASK**

Actions requiring explicit confirmation:
- Overwriting or deleting `Master_CV_Data.json`, `publications.bib`, or session files
- Any `rm -rf` or destructive file operations under `~/CV/`
- Any `--force` flag on git operations

---

## Big picture (read first)
- This is a **single-user local CV generation app**: web UI + CLI, no DB, file-backed state.
- Primary flow: job description → LLM analysis/recommendations → user review/edit → CV generation.
- Source of truth is local files, especially `~/CV/Master_CV_Data.json` and `~/CV/publications.bib` (see `config.yaml` and `scripts/utils/config.py`).
- Main runtime boundaries:
  - Web/API: `scripts/web_app.py`
  - Orchestration/generation: `scripts/utils/cv_orchestrator.py`
  - Conversation state/session logic: `scripts/utils/conversation_manager.py`
  - Provider abstraction: `scripts/utils/llm_client.py`

## Critical workflows
- Environment: use conda env `cvgen`.
- Start web app: `python scripts/web_app.py --llm-provider github`.
- If `--llm-provider` is omitted, `llm.default_provider` must be configured via env/config.
- zsh tip: if shell autocorrect changes `github` to `.github`, escape or quote the provider value, e.g. `python scripts/web_app.py --llm-provider \github` (or `--llm-provider 'github'`).
- Start CLI flow: `python scripts/llm_cv_generator.py`.
- Run tests via orchestrator script (preferred):
  - `python run_tests.py`
  - `python run_tests.py --categories unit component integration`
  - `python run_tests.py --list`

## Project-specific patterns and gotchas
- Config precedence is intentional and must be preserved: env vars > `.env` > `config.yaml` > defaults (`scripts/utils/config.py`).
- Session persistence is file-based (`~/CV/files/sessions` by default); avoid introducing hidden in-memory-only state for core workflow.
- `skills` in master data can be either a list or category dict; existing code handles both—keep that compatibility.
- Recommendation semantics are strict: each recommendation includes `recommendation`, `confidence`, and `reasoning` with project-specific enums (see prompt logic in `scripts/utils/llm_client.py` and `scripts/utils/conversation_manager.py`).
- `scripts/llm_cv_generator.py` CLI currently restricts `--llm-provider` choices to `github|openai|anthropic|local`, while backend factory supports more providers (`copilot-oauth`, `copilot`, `gemini`, `groq`). Keep changes consistent when touching provider UX.

## Integration points
- LLM providers are selected through `get_llm_provider(...)` in `scripts/utils/llm_client.py`.
- Copilot OAuth flow is exposed by `/api/copilot-auth/*` endpoints in `scripts/web_app.py` and uses `utils/copilot_auth.py` token caching.
- URL ingestion in web flow includes protected-site handling (LinkedIn/Indeed/Glassdoor) with manual-copy fallback in `scripts/web_app.py`.
- Document generation uses WeasyPrint (primary) and Chrome headless (fallback) for PDF output; do not assume Quarto is installed.

## Instructions hierarchy and user-level config
- Respect VS Code **user-level** agent instructions/prompts/skills symlinked into:
  - `~/Library/Application Support/Code/User/`
  - Managed from `~/src/vscode-config` via `setup-symlinks.sh`.
- Treat this file as project-specific guidance; user-level instructions still apply unless they conflict with explicit repo requirements.

## Available Slash Commands

Slash commands are defined in `~/src/vscode-config/.github/prompts/`. The most relevant:

| Command | Purpose |
|---------|---------|
| `/preflight` | Mandatory pre-flight (run before every response) |
| `/plan` | Create structured implementation plan → walk through via `/obo` |
| `/obo` | One-by-one sequential item processor with priority scoring and session persistence |
| `/codeReview` | Systematic code review; findings presented sequentially via `/obo` |
| `/cvUiReview` | Evaluate `web/index.html` against user story acceptance criteria → `tasks/ui-review.md` |
| `/commitMessage` | Generate thematic git commit messages |
| `/unitTest` | Generate unit tests for Python/JS functions |

### /obo in cv-builder

- Helper script: `.github/skills/one-by-one/obo_helper.py`
- Session dir: `.github/obo_sessions/`
- Always check for existing sessions first:
  `python .github/skills/one-by-one/obo_helper.py sessions --base-dir /Users/warnes/src/cv-builder`
- Never pass item JSON directly as a shell argument — write to a temp file and pass via `--input-file`

---

## When modifying code
- Prefer minimal, surgical changes and preserve existing API routes/state keys.
- Keep generated artifacts under configured output dirs; avoid hardcoding alternate storage paths.
- Validate changes by running targeted tests first (category or file-level), then broader test runs as needed.

## Communication Style

- Refer to user as **"Dr. Greg"**
- Use collaborative **"we"** language ("We need to…", "Let's check…")
- When presenting multiple items for review, use `/obo` — never list all items at once in a single response
- Begin every multi-step or code-change response by stating which copilot-instructions.md sections apply and which Agent Skills apply