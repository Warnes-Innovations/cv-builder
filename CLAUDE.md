# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Activate environment (required)
conda activate cvgen

# Start web app (primary interface)
python scripts/web_app.py --llm-provider github
# zsh gotcha: if shell autocorrects `github` → `.github`, quote it:
# python scripts/web_app.py --llm-provider 'github'
# If `--llm-provider` is omitted, `llm.default_provider` must be configured via env/config.

# Start CLI flow
python scripts/llm_cv_generator.py

# Run tests
python run_tests.py                                          # all tests
python run_tests.py --categories unit component integration  # specific categories
python run_tests.py --list                                   # list available tests
python run_tests.py --verbose                                # verbose output
```

Integration tests require a web server running on port 5001.

## Slash Commands & Prompts

Slash commands are defined in `~/src/vscode-config/.github/prompts/`. The most relevant for cv-builder:

| Command          | Purpose                                                                                     |
|------------------|---------------------------------------------------------------------------------------------|
| `/preflight`     | Mandatory compliance checklist — run before every multi-step or code-change request         |
| `/plan`          | Create a structured implementation plan, then walk through it via `/obo`                    |
| `/obo`           | One-by-one sequential item processor with priority scoring and session persistence          |
| `/codeReview`    | Systematic code review; presents findings sequentially via `/obo`                           |
| `/cvUiReview`    | Evaluate `web/index.html` against all user story acceptance criteria → `tasks/ui-review.md` |
| `/commitMessage` | Generate thematic git commit messages                                                       |
| `/unitTest`      | Generate unit tests for Python/JS functions                                                 |

### /obo Session Management

- Helper script: `.github/skills/one-by-one/obo_helper.py`
- Session files: `.github/obo_sessions/session_YYYYMMDD_HHMMSS.json`
- Always check for existing sessions before starting a new one:
  `python .github/skills/one-by-one/obo_helper.py sessions --base-dir /Users/warnes/src/cv-builder`
- Never pass item JSON directly as a shell argument — write to a temp file first and pass via `--input-file`

## Architecture

Single-user local app. No database — all state is file-backed.

**Primary data files** (paths from `config.yaml`):
- `~/CV/Master_CV_Data.json` — master CV data (experiences, skills, education, awards, publications)
- `~/CV/publications.bib` — BibTeX publications
- `~/CV/files/sessions/` — per-session JSON state
- `~/CV/files/{job_name}_{date}/` — generated output files (HTML, PDF, ATS DOCX)

**Core components:**

| File | Role |
|------|------|
| `scripts/web_app.py` | Flask server, all API endpoints |
| `scripts/utils/conversation_manager.py` | Workflow state machine (phases: init → job_analysis → customization → rewrite_review → generation → refinement) |
| `scripts/utils/cv_orchestrator.py` | Content selection, rewrite application, document generation |
| `scripts/utils/llm_client.py` | LLM provider abstraction (OpenAI, Anthropic, Copilot OAuth, Gemini, Groq, local) |
| `scripts/utils/config.py` | Config loader; precedence: env vars > `.env` > `config.yaml` > defaults |
| `web/index.html` | Single-page app (vanilla JS + DataTables) — entire frontend in one file |
| `templates/cv-template.html` | Jinja2 template for HTML/PDF output (2-column layout) |

**Key API route groups** (all in `web_app.py`):
- `/api/copilot-auth/*` — GitHub Copilot Device Flow OAuth
- `/api/job`, `/api/fetch-job-url`, `/api/upload-file` — job description ingestion
- `/api/analyze`, `/api/recommend`, `/api/post-analysis-*` — LLM analysis
- `/api/review-decisions` — experience/skill selection
- `/api/rewrites`, `/api/rewrites/approve` — rewrite proposal/approval (Phase 4–5)
- `/api/cv-data`, `/api/generate`, `/api/download/<filename>` — editing and output
- `/api/sessions`, `/api/load-session`, `/api/save`, `/api/reset` — session management

**Output formats** (all produced from one `generate_cv()` call):
1. `*_ATS.docx` — plain python-docx, ATS-optimized, single-column
2. `*.html` — Jinja2-rendered, self-contained, includes Schema.org JSON-LD
3. `*.pdf` — WeasyPrint (primary), Chrome headless (fallback); do not assume Quarto is installed

## Configuration

All configuration is in `config.yaml` (project root). Precedence: **env vars > `.env` > `config.yaml` > code defaults** (implemented in `scripts/utils/config.py`).

**There is no built-in default LLM provider.** The app fails with a clear startup error if `llm.default_provider` is missing or unset. Users must explicitly configure a provider.

### Full `config.yaml` schema

```yaml
data:
  master_cv:    string   # Path to Master_CV_Data.json. Default: ~/CV/Master_CV_Data.json
  publications: string   # Path to publications.bib.  Default: ~/CV/publications.bib
  output_dir:   string   # Root output dir.           Default: ~/CV/files

llm:
  default_provider: string   # REQUIRED. One of: copilot-oauth | copilot | github |
                             #   openai | anthropic | gemini | groq | local
                             # No default — app fails on startup if unset.
  default_model:    string   # Model name; null = provider default.
  temperature:      float    # Generation temperature. Default: 0.7
  max_tokens:       int|null # null = provider default.

generation:
  max_skills:        int   # Max skills to include.       Default: 20
  max_achievements:  int   # Max achievements per entry.  Default: 5
  max_publications:  int   # Max publications.            Default: 10
  formats:
    ats_docx:   bool  # Generate ATS DOCX.        Default: true
    human_pdf:  bool  # Generate human-readable PDF.   Default: true
    human_docx: bool  # Generate human-readable DOCX.  Default: true

session:
  auto_save:    bool    # Auto-save session state.     Default: true
  session_dir:  string  # Session storage dir.         Default: ~/CV/files/sessions
  history_file: string  # Input history file path.     Default: ~/CV/files/input_history

google_drive:
  enabled:          bool    # Google Drive API integration. Default: false
                            # Not required — OS-level sync via Google Drive Desktop app
                            # is the intended approach (files land in output_dir).
  credentials_path: string  # OAuth credentials file.
  token_path:       string  # Token cache file.

web:
  host:  string  # Bind address. Default: 127.0.0.1
  port:  int     # Port.         Default: 5000
  debug: bool    # Flask debug.  Default: false

logging:
  level:   string      # DEBUG | INFO | WARNING | ERROR. Default: INFO
  file:    string|null # null = console only.
  log_dir: string      # Log directory. Default: ~/CV/logs
```

### CLI overrides

`--llm-provider` and `--llm-model` flags on `web_app.py` and `llm_cv_generator.py` override `llm.default_provider` / `llm.default_model` from `config.yaml`. Note: CLI provider names (`github`, `openai`, `anthropic`, `local`) may differ from internal factory names (`copilot-oauth`, `copilot`, `gemini`, `groq`) — keep consistent when modifying provider UX.

---

## Patterns and gotchas

- **Single-session architecture** — the Flask app has one global `ConversationManager` / `CVOrchestrator`. A `threading.Lock` enforces single-session-at-a-time and the UI shows a warning if a second tab tries to use the app. Multi-session support (per-request session keying) is a known future refactor if ever needed — avoid patterns that make this harder.
- **Config precedence** is intentional — preserve it when touching `config.py`.
- **`skills` in master data** can be a list or a category dict; code handles both — keep that compatibility.
- **Recommendation objects** must include `recommendation`, `confidence`, and `reasoning` fields with project-specific enums (see prompt logic in `llm_client.py` and `conversation_manager.py`).
- **CLI provider names** (`github|openai|anthropic|local`) differ from backend factory names (`copilot-oauth`, `copilot`, `gemini`, `groq`) — keep consistent when modifying provider UX.
- **Session state** must stay file-backed; avoid hidden in-memory-only state for core workflow.
- **Rewrite audit key** is `final_text` in the spec but `final` in code (renamed in commit `576b75f`).
- **URL ingestion** includes protected-site fallback (LinkedIn, Indeed, Glassdoor) — don't break that path.
- **Prefer minimal, surgical changes** — preserve existing API routes and session state keys.

## Related configuration

VS Code user-level agent instructions/skills are managed from `~/src/vscode-config` and symlinked into `~/Library/Application Support/Code/User/` via `setup-symlinks.sh`. Treat this file as project-specific; user-level instructions apply unless they conflict with explicit repo requirements.
