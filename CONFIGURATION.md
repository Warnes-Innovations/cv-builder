# Configuration Guide

The CV Builder uses a flexible configuration system that supports multiple sources:

## Configuration Priority

Settings are loaded in this order (highest to lowest priority):

1. **Environment variables** (e.g., `CV_MASTER_DATA_PATH`)
2. **`.env` file** (for API keys and overrides)
3. **`config.yaml`** (project defaults)
4. **Hardcoded defaults** (fallback)

## Quick Setup

### 1. Copy the example environment file:

```bash
cd /Users/warnes/src/cv-builder
cp .env.example .env
```

### 2. Edit `.env` and add your API key:

```bash
# For GitHub Models (recommended):
GITHUB_MODELS_TOKEN=ghp_your_token_here

# Or for OpenAI:
OPENAI_API_KEY=sk-your_key_here

# Or for Anthropic:
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

### 3. (Optional) Customize `config.yaml`:

The default `config.yaml` is already set up to use `~/CV/` for data files. You can customize:

```yaml
data:
  master_cv: "~/CV/Master_CV_Data.json"
  publications: "~/CV/publications.bib"
  output_dir: "./files"

llm:
  default_provider: "github"
  temperature: 0.7
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
  default_provider: "github"     # Options: github, openai, anthropic, local
  default_model: null            # null uses provider default
  temperature: 0.7               # 0.0 = deterministic, 1.0 = creative
  max_tokens: null               # null uses provider default
```

**Environment variable overrides:**
- `CV_LLM_PROVIDER`
- `CV_LLM_MODEL`
- `CV_LLM_TEMPERATURE`
- `CV_LLM_MAX_TOKENS`

**API Keys (in `.env` file):**
```bash
GITHUB_MODELS_TOKEN=ghp_xxxx
OPENAI_API_KEY=sk-xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
```

### Generation Defaults

```yaml
generation:
  max_skills: 20
  max_achievements: 5
  max_publications: 10
  
  formats:
    ats_docx:   true   # ATS-optimized DOCX (*_ATS.docx) — plain-text, single-column
    human_html: true   # Human-readable HTML (*.html) — Jinja2 + CSS + Schema.org JSON-LD
    human_pdf:  true   # Human-readable PDF (*.pdf)  — rendered from HTML via WeasyPrint
```

### Session Management

```yaml
session:
  auto_save: true
  session_dir: "./files/sessions"
  history_file: "./files/.input_history"
```

### Web UI

```yaml
web:
  host: "127.0.0.1"
  port: 5000
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

- **Never commit `.env`** to git - it contains sensitive API keys
- `.env` is already in `.gitignore`
- `.env.example` shows the template without actual keys
- API keys in `.env` take precedence over `config.yaml`

## Troubleshooting

**"Config file not found" warning:**
- This is normal if you haven't customized `config.yaml`
- The system will use hardcoded defaults

**"API key not found" errors:**
- Check that `.env` file exists and contains your key
- Verify the environment variable is set: `echo $GITHUB_MODELS_TOKEN`
- Make sure you're in the right directory when running scripts

**Path issues:**
- Use `~` for home directory: `~/CV/data.json`
- Use `./` for relative paths: `./files/output`
- Use absolute paths if needed: `/Users/yourname/CV/data.json`
