# CV Builder

An AI-powered CV generation system that uses Large Language Models (LLMs) for semantic analysis and guided, step-by-step CV customization through a full-featured web UI.

## Features

- **Full Web UI**: Browser-based workflow with dedicated tabs for every step — job input, LLM analysis, experience/skill/achievement review, ATS scoring, rewrites, spell-check, cover letter, layout review, and finalisation
- **LLM-Driven Analysis**: Semantic understanding of job descriptions via GitHub Copilot, GitHub Models, OpenAI, Anthropic Claude, Google Gemini, Groq, or local models
- **Master CV Management**: Dedicated tab for managing your master CV data (personal info, experience, skills, education, publications, and more) separately from per-job customisation
- **ATS Match Scoring**: Real-time keyword match score with hard/soft skill breakdown, recalculated live as you approve or reject items
- **Multiple Output Formats**:
  - ATS-optimised DOCX (plain-text, machine-parseable)
  - Human-readable PDF (styled, via WeasyPrint)
  - Human-readable DOCX (Word-native, editable)
- **Cover Letter Generation**: AI-generated cover letters tailored to the job description
- **Session Management**: Multiple independent sessions, auto-save, and session switching
- **Multi-Provider LLM Support**: Switch providers or models without restarting

## Quick Start

### Option 1: Use the start script (recommended)

```bash
# 1. Set up your credentials (copy the example and add your API key)
cp .env.example .env
# Edit .env and add your GITHUB_MODELS_TOKEN or other API key

# 2. Start the app
./start.sh

# 3. Open http://localhost:5001
```

### Option 2: Manual start

```bash
conda activate cvgen
python scripts/web_app.py --llm-provider github
# Open http://localhost:5001
```

### Option 3: CLI (non-interactive/automation)

```bash
conda activate cvgen
python scripts/llm_cv_generator.py --llm-provider github
```

## Setup

### 1. Install Conda Environment

The system uses conda to manage spaCy/blis dependencies (avoids compilation issues on macOS):

```bash
# Create environment with spaCy from conda-forge
conda create -n cvgen python=3.9 spacy -c conda-forge --override-channels -y

# Activate environment
conda activate cvgen

# Install remaining dependencies via pip
pip install -r scripts/requirements-conda.txt
```

For CI or pure-pip environments (no conda):

```bash
pip install -r scripts/requirements.txt
```

### 2. Prepare Your Master CV Data

Place your master CV data files in `~/CV/`:

```
~/CV/
├── Master_CV_Data.json    # Your master CV data: personal info, experience, skills,
│                          # education, awards, publications, and more
│                          # (see MASTER_CV_DATA_SPECIFICATION.md for full schema)
└── publications.bib       # BibTeX publications (optional)
```

The paths are configured in `config.yaml`. See [CONFIGURATION.md](CONFIGURATION.md) for details.

### 3. Configure LLM Provider

If you do not pass `--llm-provider` on the CLI, `llm.default_provider` must be configured in `config.yaml` or via environment variable.

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

#### **GitHub Copilot OAuth (easiest — no token needed)**

```yaml
# config.yaml
llm:
  default_provider: "copilot-oauth"
```

On first use the app will prompt you to authenticate via a browser flow.

#### **GitHub Models (uses your GitHub Copilot subscription)**

1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select scope: `read:user`
   - Copy the token

2. Add to `.env`:
```bash
GITHUB_MODELS_TOKEN="your-github-token-here"
```

> **Note:** Uses `GITHUB_MODELS_TOKEN` (not `GITHUB_TOKEN`) to avoid conflicts with your existing GitHub access token.

#### **Google Gemini**
```bash
GEMINI_API_KEY="your-api-key-here"
```

#### **OpenAI**
```bash
OPENAI_API_KEY="your-api-key-here"
```

#### **Anthropic Claude**
```bash
ANTHROPIC_API_KEY="your-api-key-here"
```

#### **Groq**
```bash
GROQ_API_KEY="your-api-key-here"
```

#### **Local Model** (no API key needed)
- Uses HuggingFace transformers with locally downloaded models
- No API costs or internet access required after initial model download
- Slower performance (~30–90 seconds per query)

> **Which provider should I use?** See [LLM_PROVIDER_COMPARISON.md](LLM_PROVIDER_COMPARISON.md) for a detailed speed, cost, and quality comparison.

## Usage

### Web UI (recommended)

```bash
./start.sh
# or:
conda activate cvgen
python scripts/web_app.py --llm-provider github
```

Open **http://localhost:5001** in your browser.

The web UI guides you through the full workflow via a tabbed interface:

| Tab | Purpose |
|-----|---------|
| 📋 Job | Paste or fetch a job description |
| 🔍 Analysis | LLM analysis results and job requirements |
| 💬 Questions | Screening questions generated from the JD |
| 📊 Experiences | Select and rank experiences to include |
| ✏️ Experience Bullets | Review and rewrite individual bullets |
| 🛠️ Skills | Approve/reject recommended skills |
| 🏆 Achievements | Review selected achievements |
| 📝 Summary | Review and select professional summary |
| 📄 Publications | Select publications to include |
| 📊 ATS Score | Keyword match score with skill breakdown |
| ✏️ Rewrites | AI-suggested rewrites for bullet points |
| 🔤 Spell Check | Spell-check the customised CV |
| 📄 Generated CV | Preview the generated CV |
| 🎨 Layout Review | Review and adjust layout |
| ⬇️ File Review | Download generated files |
| ✅ Finalise | Harvest improvements back to master CV |
| 📚 Master CV | Edit master CV data directly |
| 📩 Cover Letter | Generate a tailored cover letter |
| 📋 Screening | View and answer screening questions |

### CLI

```bash
conda activate cvgen
python scripts/llm_cv_generator.py
```

Options:

```bash
# Load a job description from a file
python scripts/llm_cv_generator.py --job-file sample_jobs/data_science_lead.txt

# Choose LLM provider
python scripts/llm_cv_generator.py --llm-provider github      # GitHub Models
python scripts/llm_cv_generator.py --llm-provider openai      # OpenAI
python scripts/llm_cv_generator.py --llm-provider anthropic   # Anthropic Claude
python scripts/llm_cv_generator.py --llm-provider gemini      # Google Gemini
python scripts/llm_cv_generator.py --llm-provider groq        # Groq
python scripts/llm_cv_generator.py --llm-provider local       # Local model (no API key)

# Non-interactive mode (automation/testing)
python scripts/llm_cv_generator.py --job-file job.txt --non-interactive

# Resume a previous session
python scripts/llm_cv_generator.py --resume-session path/to/session.json
```

### Web App Options

```bash
python scripts/web_app.py [options]

  --llm-provider   LLM provider: copilot-oauth | copilot | github | openai | anthropic | gemini | groq | local
  --model          Specific model name (e.g. gpt-4o, gemini-flash-latest)
  --port           Port to listen on (default: 5001)
  --master-data    Path to Master_CV_Data.json
  --publications   Path to publications.bib
  --output-dir     Output directory for generated files
  --debug          Run Flask in debug mode
```

## Project Structure

```
cv-builder/
├── config.yaml                      # Main configuration file
├── .env.example                     # Environment variable template
├── start.sh                         # Convenience start script
├── run_tests.py                     # Test runner orchestrator
├── scripts/
│   ├── web_app.py                   # Flask web server entry point
│   ├── llm_cv_generator.py         # CLI entry point
│   ├── generate_cv.py              # Legacy rule-based generator
│   ├── requirements.txt            # Pip dependencies (CI / pure-pip)
│   ├── requirements-conda.txt      # Pip deps for conda dev environment
│   ├── routes/                     # Flask route modules
│   │   ├── auth_routes.py          # Copilot OAuth routes
│   │   ├── generation_routes.py    # CV generation routes
│   │   ├── job_routes.py           # Job description routes
│   │   ├── master_data_routes.py   # Master CV CRUD routes
│   │   ├── publication_routes.py   # Publications CRUD routes
│   │   ├── review_routes.py        # Review/approval routes
│   │   ├── session_routes.py       # Session management routes
│   │   ├── static_routes.py        # Static file serving
│   │   └── status_routes.py        # Status and health routes
│   └── utils/
│       ├── llm_client.py           # LLM provider abstraction
│       ├── conversation_manager.py # Workflow state machine
│       ├── cv_orchestrator.py      # Content selection & generation
│       ├── session_registry.py     # Multi-session registry
│       ├── bibtex_parser.py        # BibTeX publication parsing
│       ├── template_renderer.py    # Jinja2 HTML/DOCX rendering
│       ├── master_data_validator.py # JSON schema validation
│       └── config.py               # Configuration loader
├── web/                            # Frontend (browser) source
│   ├── index.html                  # Single-page app shell
│   ├── bundle.js                   # Built frontend bundle (generated)
│   ├── styles.css                  # Application styles
│   ├── app.js                      # App bootstrap
│   ├── state-manager.js            # Global state management
│   ├── api-client.js               # REST API client
│   └── [tab-name].js               # Per-tab UI modules
├── templates/
│   ├── cv-template.html            # Jinja2 HTML CV template
│   └── cv-style.css                # CV stylesheet
├── schemas/
│   └── master_cv_data.schema.json  # JSON schema for master CV data
└── tests/
    ├── test_*.py                   # Python test files
    └── js/                         # JavaScript unit tests (Vitest)
```

Generated output is stored under `~/CV/cv-builder/` by default:

```
~/CV/cv-builder/
├── {Company}_{Role}_{Date}/
│   ├── CV_*_ATS.docx              # ATS-optimised DOCX
│   ├── CV_*.html                  # Human-readable HTML
│   ├── CV_*.pdf                   # Human-readable PDF
│   ├── CV_*.docx                  # Human-readable DOCX
│   ├── CoverLetter_*.docx         # Cover letter (if generated)
│   ├── metadata.json              # Generation metadata
│   └── job_description.txt        # Original job posting
└── sessions/                      # Auto-saved session files
```

## Architecture

### Overview

The system consists of a Flask backend with modular route handlers and a multi-tab single-page web UI:

- **`scripts/web_app.py`** — Flask server, wires routes and app configuration
- **`scripts/routes/`** — Route handler modules grouped by domain
- **`scripts/utils/cv_orchestrator.py`** — Content selection (hybrid LLM + scoring) and document generation
- **`scripts/utils/conversation_manager.py`** — Per-session workflow state machine
- **`scripts/utils/session_registry.py`** — Multi-session registry (UUID-keyed `SessionEntry` objects)
- **`scripts/utils/llm_client.py`** — Adapter pattern over all supported LLM providers
- **`web/`** — Single-page app with modular per-tab JS files, bundled via `npm run build`

### Multi-Session Architecture

The Flask app uses a `SessionRegistry` singleton that manages independent `SessionEntry` objects, each with its own `ConversationManager` and `CVOrchestrator`. Sessions are keyed by UUID.

- **GET requests** pass `?session_id=<uuid>` as a query parameter
- **POST/PUT/DELETE requests** include `"session_id": "<uuid>"` in the JSON body

### LLM Providers

| Provider | CLI value | Credentials |
|----------|-----------|-------------|
| GitHub Copilot (OAuth) | `copilot-oauth` | Browser auth flow |
| GitHub Copilot (direct) | `copilot` | `GITHUB_TOKEN` |
| GitHub Models | `github` | `GITHUB_MODELS_TOKEN` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic Claude | `anthropic` | `ANTHROPIC_API_KEY` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| Groq | `groq` | `GROQ_API_KEY` |
| Local (HuggingFace) | `local` | None |

### Document Generation Pipeline

1. **HTML** — Jinja2 renders `templates/cv-template.html` → self-contained HTML with embedded CSS and Schema.org JSON-LD
2. **PDF** — WeasyPrint (primary) or Chrome headless (fallback) converts HTML → PDF
3. **ATS DOCX** — python-docx generates a plain-text, single-column DOCX for ATS parsing
4. **Human DOCX** — docxtpl (Jinja2) renders a styled Word document

## Testing

### Python tests

Run the full Python test suite via the orchestrator script (preferred):

```bash
conda activate cvgen
python run_tests.py                                        # all tests
python run_tests.py --categories unit component integration
python run_tests.py --list                                 # list available categories
```

Or run pytest directly:

```bash
conda run -n cvgen python -m pytest                       # all tests
conda run -n cvgen python -m pytest tests/test_*.py       # specific files
```

### JavaScript tests

Frontend modules under `web/` are covered by Vitest unit tests (42 test files):

```bash
npm install               # first time only — installs vitest + jsdom
npm run test:js           # run all JS tests
npm run test:js:watch     # watch mode during development
npm run test:js:cover     # run with coverage report
```

Test files live in `tests/js/`. The test runner is configured in `vitest.config.mjs`.

To rebuild the frontend bundle after changing source files in `web/`:

```bash
npm run build
```

## Configuration

Configuration is loaded from (highest to lowest priority):
1. Environment variables (e.g. `CV_LLM_PROVIDER`)
2. `.env` file
3. `config.yaml`
4. Hardcoded defaults

See [CONFIGURATION.md](CONFIGURATION.md) for the full reference.

Key settings in `config.yaml`:

```yaml
data:
  master_cv: "~/CV/Master_CV_Data.json"
  publications: "~/CV/publications.bib"
  output_dir: "~/CV/cv-builder"

llm:
  default_provider: "github"   # copilot-oauth | copilot | github | openai | anthropic | gemini | groq | local
  default_model: null          # null = provider default
  temperature: 0.7

web:
  host: "127.0.0.1"
  port: 5001
```

## Troubleshooting

**"Module not found" errors:**
```bash
conda activate cvgen
pip install -r scripts/requirements-conda.txt
```

**App doesn't start / port already in use:**

`start.sh` automatically stops any process on port 5001 before starting. To stop the port manually:

```bash
# macOS / Linux (get the PID first, then stop it):
lsof -ti tcp:5001
```

**LLM API errors:**
- Verify your key is set: `echo $GITHUB_MODELS_TOKEN`
- Check API quota or billing limits
- Try a different provider: `--llm-provider local`

**Conda environment issues:**
```bash
conda env remove -n cvgen
conda create -n cvgen python=3.9 spacy -c conda-forge --override-channels -y
conda activate cvgen
pip install -r scripts/requirements-conda.txt
```

**Frontend bundle is out of date:**
```bash
npm run build
```

## Documentation

| Document | Description |
|----------|-------------|
| [CONFIGURATION.md](CONFIGURATION.md) | Full configuration reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed architecture and API spec |
| [MASTER_CV_DATA_SPECIFICATION.md](MASTER_CV_DATA_SPECIFICATION.md) | Master CV data schema and contracts |
| [LLM_PROVIDER_COMPARISON.md](LLM_PROVIDER_COMPARISON.md) | Provider speed, cost, and quality comparison |
| [PROJECT_SPECIFICATION.md](PROJECT_SPECIFICATION.md) | Full product specification |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Active implementation backlog |

## License

Copyright (C) 2026 Gregory R. Warnes  
SPDX-License-Identifier: AGPL-3.0-or-later

For commercial licensing, contact greg@warnes-innovations.com
