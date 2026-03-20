# Copilot Instructions for cv-builder

## 🛑 CRITICAL: NEVER LOSE USER DATA

1. **NEVER delete, drop, or destroy user data** by error, omission, or negligence
2. **ALWAYS get explicit confirmation** for ANY action that destroys data
3. **Create backups before irreversible operations** (session files, `Master_CV_Data.json`, generated output under `~/CV/`)
4. **When in doubt, ASK**

Actions requiring explicit confirmation:
- Overwriting or deleting `Master_CV_Data.json`, `publications.bib`, or session files
- Any `rm -rf` or destructive file operations under `~/CV/`
- Any `--force` flag on git operations

## 🛑 CRITICAL: Master CV is read-only during job customization

**Never write to `Master_CV_Data.json` (or `publications.bib`) during CV customization or generation.**

All user edits during the customization workflow — accepted AI suggestions, skill decisions, achievement edits, rewrites, summary overrides — must be stored in the **session file only**.

The Master CV is modified **only** during two permitted stages:
1. **Master CV management tab** (Phase 8) — direct edits via `/api/master-data/*` endpoints
2. **Finalise → Harvest Apply** — the `POST /api/harvest/apply` endpoint writes harvested improvements (improved bullets, new skills, summary variants) back to the master as an explicit user-initiated action at the end of the finalization workflow. This is treated as an extension of the master modification workflow, not part of customization.

Any code that writes to the master file outside of these two stages is a bug.

✅ CORRECT — store in session state:
```python
conversation.state['accepted_suggested_achievements'] = accepted_suggestions
```

❌ INCORRECT — write back to master during customization:
```python
master_data['achievements'].append(new_achievement)  # Never during job customization
```

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
- Run Python tests via orchestrator script (preferred):
  - `python run_tests.py`
  - `python run_tests.py --categories unit component integration`
  - `python run_tests.py --list`
- When running pytest, write output to a file, then use `head` or `tail` (if necessary) to read the output file.  This allows you to investigate details without rerunning
the tests.
  - ✅ `python -m pytest tests/ui/ -q --tb=short > /tmp/pytest_out.txt 2>&1; head -100 /tmp/pytest_out.txt`
  - ❌ `python -m pytest tests/ui/ -q --tb=short` (output inline — blocks the shell, floods context)
- Run JavaScript tests (frontend utilities in `web/`):
  - `npm run test:js`              — run all 104 JS tests
  - `npm run test:js:watch`        — watch mode
  - `npm run test:js:cover`        — with coverage
  - Test files: `tests/js/utils.test.js`, `tests/js/api-client.test.js`, `tests/js/state-manager.test.js`
  - Config: `vitest.config.mjs`; stack: Vitest 3 + jsdom

## Project-specific patterns and gotchas
- Config precedence is intentional and must be preserved: env vars > `.env` > `config.yaml` > defaults (`scripts/utils/config.py`).
- Session persistence is file-based (`~/CV/files/sessions` by default); avoid introducing hidden in-memory-only state for core workflow.
- `skills` in master data can be either a list or category dict; existing code handles both—keep that compatibility.
- Recommendation semantics are strict: each recommendation includes `recommendation`, `confidence`, and `reasoning` with project-specific enums (see prompt logic in `scripts/utils/llm_client.py` and `scripts/utils/conversation_manager.py`).
- `scripts/llm_cv_generator.py` CLI currently restricts `--llm-provider` choices to `github|openai|anthropic|local`, while backend factory supports more providers (`copilot-oauth`, `copilot`, `gemini`, `groq`). Keep changes consistent when touching provider UX.
- **Multi-session architecture**: the Flask app uses a `SessionRegistry` singleton (`scripts/utils/session_registry.py`) that manages independent `SessionEntry` objects, each holding its own `ConversationManager` and `CVOrchestrator`. Sessions are keyed by `session_id` (UUID). There is no global manager and no threading lock on session access.
  - **session_id delivery**: GET requests pass `?session_id=<uuid>` as a query parameter; POST/PUT/DELETE requests include `"session_id": "<uuid>"` in the JSON body. `_get_session(required=True)` in `web_app.py` resolves the session from either location and returns HTTP 400 if not found.
  - **Ownership model**: sessions can be *unclaimed* (`owner_token is None`, no token needed) or *claimed* (`owner_token` set by `POST /api/sessions/claim`). `_validate_owner(entry)` skips validation for unclaimed sessions and returns HTTP 403 for wrong-token requests on claimed ones.
  - **Session lifecycle endpoints** (no `session_id` needed): `POST /api/sessions/new`, `POST /api/sessions/claim`, `POST /api/sessions/takeover`, `GET /api/sessions/active`, `DELETE /api/sessions/<id>/evict`.
  - **Session-free endpoints** (model/pricing metadata): `/api/model-catalog`, `/api/pricing`, `/api/models`.
  - All other API routes require a valid `session_id`; never bypass `_get_session()` in new routes.
- **Rewrite audit key**: field is `final_text` in the spec but `final` in code (renamed in commit `576b75f`). Do not revert.

## Configuration

All configuration is in `config.yaml` (project root). **Precedence: env vars > `.env` > `config.yaml` > code defaults.**

**There is no built-in default LLM provider** — the app fails on startup if `llm.default_provider` is unset.

```yaml
data:
  master_cv:    string   # Path to Master_CV_Data.json. Default: ~/CV/Master_CV_Data.json
  publications: string   # Path to publications.bib.  Default: ~/CV/publications.bib
  output_dir:   string   # Root output dir.           Default: ~/CV/files

llm:
  default_provider: string   # REQUIRED. One of: copilot-oauth | copilot | github |
                             #   openai | anthropic | gemini | groq | local
  default_model:    string   # Model name; null = provider default.
  temperature:      float    # Default: 0.7
  max_tokens:       int|null # null = provider default.

generation:
  max_skills:        int   # Default: 20
  max_achievements:  int   # Default: 5
  max_publications:  int   # Default: 10
  formats:
    ats_docx:   bool  # Default: true
    human_pdf:  bool  # Default: true
    human_docx: bool  # Default: true

session:
  auto_save:    bool    # Default: true
  session_dir:  string  # Default: ~/CV/files/sessions
  history_file: string  # Default: ~/CV/files/input_history

google_drive:
  enabled:          bool    # Default: false (use OS-level Google Drive Desktop sync instead)
  credentials_path: string
  token_path:       string

web:
  host:  string  # Default: 127.0.0.1
  port:  int     # Default: 5000
  debug: bool    # Default: false

logging:
  level:   string      # DEBUG | INFO | WARNING | ERROR. Default: INFO
  file:    string|null # null = console only.
  log_dir: string      # Default: ~/CV/logs
```

`--llm-provider` and `--llm-model` flags on `web_app.py` / `llm_cv_generator.py` override `config.yaml` values.

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
- Codex bridge: repo-local prompt-to-skill conversions live under `codex-skills/`; install them plus shared `~/src/vscode-config/skills` into `~/.codex/skills` with `bash scripts/install_codex_skills.sh`.

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

- Helper script: `~/src/vscode-config/.github/skills/one-by-one/obo_helper.py`
  - macOS: `/Users/warnes/src/vscode-config/.github/skills/one-by-one/obo_helper.py`
  - Linux:  `/home/warnes/src/vscode-config/.github/skills/one-by-one/obo_helper.py`
- Session dir: `.github/obo_sessions/`
- Always check for existing sessions first:
  ```bash
  # macOS:
  python /Users/warnes/src/vscode-config/.github/skills/one-by-one/obo_helper.py sessions --base-dir /Users/warnes/src/cv-builder
  # Linux:
  python /home/warnes/src/vscode-config/.github/skills/one-by-one/obo_helper.py sessions --base-dir /home/warnes/src/cv-builder
  ```
- Never pass item JSON directly as a shell argument — write to a temp file and pass via `--input-file`

---

## When modifying code
- Prefer minimal, surgical changes and preserve existing API routes/state keys.
- Keep generated artifacts under configured output dirs; avoid hardcoding alternate storage paths.
- Validate changes by running targeted tests first (category or file-level), then broader test runs as needed.


- Begin every multi-step or code-change response by stating which copilot-instructions.md sections apply and which Agent Skills apply
