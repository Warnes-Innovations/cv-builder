# Configuration Guide

The CV Builder uses a flexible configuration system that supports multiple sources:

## Configuration Priority

Settings are loaded in this order (highest to lowest priority):

1. **Environment variables** (e.g., `GITHUB_MODELS_TOKEN`)
2. **`.env` file** (legacy override; still supported)
3. **`config.yaml`** — includes the `api_keys:` section written by the wizard
4. **Hardcoded defaults** (fallback)

## Quick Setup

### 1. Copy the example configuration file:

```bash
cp config.yaml.example config.yaml
```

> **Note:** `config.yaml` is gitignored — it is your personal configuration file and is never committed.

### 2. Configure your LLM provider

**Option A — Use the web wizard (recommended):**

```bash
conda activate cvgen && python scripts/web_app.py --llm-provider github
```

Click the provider badge in the top-right of the UI to open the wizard. The four-step wizard walks you through:
1. **Choose provider** — pick the LLM service you want to use
2. **API Key / Auth** — enter your API key (or complete OAuth / CLI auth)
3. **Model + Test** — select a model and verify the connection
4. **Complete** — you're done

The wizard saves your key to the `api_keys:` section of `config.yaml` and applies it immediately
to the running process via `os.environ` — no restart needed.

> **Single-worker limitation:** The immediate `os.environ` effect is process-local. cv-builder is
> designed to run as a single-worker server (the only supported mode), so this is always correct.
> If the server is ever run with multiple workers (e.g. `gunicorn -w 4`), only the worker that
> handled the save request would pick up the new value; other workers would need a restart to read
> the updated `config.yaml`. Do not move to a multi-worker deployment without revisiting this
> behaviour.

**Option B — Edit `config.yaml` directly:**

```yaml
llm:
  default_provider: "github"

api_keys:
  github_token: "ghp_your_token_here"
```

**Option C — Use environment variables:**

```bash
export GITHUB_MODELS_TOKEN=ghp_your_token_here
export CV_LLM_PROVIDER=github
```

## Configuration Options

### Data Paths

```yaml
data:
  master_cv: "~/CV/Master_CV_Data.json"      # Master CV data
  publications: "~/CV/publications.bib"      # BibTeX publications
  output_dir: "./files"                      # Generated CV output
```

**Environment variable overrides:**
- `CV_MASTER_DATA_PATH`
- `CV_PUBLICATIONS_PATH`
- `CV_OUTPUT_DIR`

### LLM Provider

```yaml
llm:
  default_provider: "github"
  default_model: null            # null uses provider default
  temperature: 0.7               # 0.0 = deterministic, 1.0 = creative
  max_tokens: null               # null uses provider default
  request_timeout_seconds: 300  # Max seconds to wait per LLM reply; increase for slow
                                 # providers or complex queries, null = no limit
```

**Supported providers:**

| CLI value | Credentials |
|-----------|-------------|
| `copilot-oauth` | Browser OAuth flow (no token needed) |
| `copilot` | `GITHUB_TOKEN` |
| `github` | `GITHUB_MODELS_TOKEN` |
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |
| `groq` | `GROQ_API_KEY` |
| `local` | None (HuggingFace local model) |

**Environment variable overrides:**
- `CV_LLM_PROVIDER`
- `CV_LLM_MODEL`
- `CV_LLM_TEMPERATURE`
- `CV_LLM_MAX_TOKENS`

**API Keys:**

The recommended approach is to use the built-in wizard (see Quick Setup above), which writes keys to
the `api_keys:` section of your `config.yaml`. You can also set them directly:

```yaml
# config.yaml
api_keys:
  github_token: "ghp_xxxx"        # used by github and copilot providers
  openai_api_key: "sk-xxxx"
  anthropic_api_key: "sk-ant-xxxx"
  gemini_api_key: "xxxx"
  groq_api_key: "xxxx"
```

Or via environment variables (highest priority):

```bash
export GITHUB_MODELS_TOKEN=ghp_xxxx
export OPENAI_API_KEY=sk-xxxx
export ANTHROPIC_API_KEY=sk-ant-xxxx
export GEMINI_API_KEY=xxxx
export GROQ_API_KEY=xxxx
```

For `copilot-oauth`, use the wizard's device-flow sign-in (no key required).
For `copilot-sdk`, run `gh auth login` in your terminal before starting the app.

### Generation Defaults

```yaml
generation:
  base_font_size: "13px"  # Default root font size for HTML/PDF CV rendering
  max_skills: 20
  max_achievements: 5
  max_publications: 10
  page_margin: "0.5in"  # Default PDF/print page margins

  formats:
    ats_docx:   true   # ATS-optimised DOCX (*_ATS.docx) — plain-text, single-column
    human_html: true   # Human-readable HTML (*.html) — Jinja2 + CSS + Schema.org JSON-LD
    human_pdf:  true   # Human-readable PDF (*.pdf)  — rendered from HTML via WeasyPrint
    human_docx: true   # Human-readable DOCX (*.docx) — styled Word document
```

> **Note:** `human_html` and `human_pdf` share the same rendering pass — the HTML is always produced when `human_pdf` is enabled, because WeasyPrint converts it to PDF. Both output files are saved to the output directory.

### Session Management

```yaml
session:
  auto_save: true
  session_dir: "~/CV/cv-builder/sessions"
  history_file: "~/CV/cv-builder/input_history"
```

### Web UI

```yaml
web:
  host: "127.0.0.1"
  port: 5001
  debug: false
```

**Environment variable overrides:**
- `CV_WEB_HOST`
- `CV_WEB_PORT`
- `CV_WEB_DEBUG`

### Logging

```yaml
logging:
  level: "INFO"          # DEBUG, INFO, WARNING, ERROR
  file: null             # null = console only
  log_dir: "~/CV/cv-builder/logs"
```

**Environment variable overrides:**
- `CV_LOG_LEVEL`
- `CV_LOG_FILE`

## Usage Examples

### Using config.yaml defaults:

```bash
conda activate cvgen
python scripts/llm_cv_generator.py
```

### Override with environment variables:

```bash
conda activate cvgen
export CV_LLM_PROVIDER=openai
export CV_OUTPUT_DIR=./my_cvs
python scripts/llm_cv_generator.py
```

### Override with command-line arguments:

```bash
python scripts/llm_cv_generator.py \
  --master-data ~/custom/path/cv_data.json \
  --publications ~/custom/path/pubs.bib \
  --llm-provider anthropic \
  --output-dir ./custom_output
```

Command-line arguments take precedence over all configuration sources.

## Security Notes

- **Never commit `config.yaml`** — it contains your personal API keys and local paths. It is gitignored by default.
- **`config.yaml.example`** is the tracked template. Copy it to `config.yaml` to get started.
- `.env` is still supported for legacy setups and is also gitignored.
- API keys in environment variables or `.env` always take precedence over `config.yaml api_keys.*`.
- The backend never returns key values to the frontend — only a boolean `is_set` flag.

## Troubleshooting

**"Config file not found" warning:**
- This is normal if you haven't customized `config.yaml`
- The system will use hardcoded defaults

**"API key not found" errors:**
- Use the wizard to enter and save your key (opens via the provider badge in the top-right of the UI)
- Or edit `config.yaml` directly and add the key to the `api_keys:` section
- Verify the environment variable is set: `echo $GITHUB_MODELS_TOKEN`
- Make sure you're in the right directory when running scripts

**Path issues:**
- Use `~` for home directory: `~/CV/data.json`
- Use `./` for relative paths: `./files/output`
- Use absolute paths if needed: `/Users/yourname/CV/data.json`
