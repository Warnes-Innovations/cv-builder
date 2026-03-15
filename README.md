# LLM-Driven CV Generator

An AI-powered CV generation system that uses Large Language Models (LLMs) for semantic understanding and conversational customization.

## Features

- **LLM-Driven Analysis**: Semantic understanding of job descriptions using OpenAI, Anthropic Claude, or local models
- **Conversational Interface**: Interactive Q&A to understand your goals and refine output
- **Hybrid Content Selection**: Combines LLM recommendations with rule-based scoring
- **Multiple Output Formats**:
  - ATS-optimized DOCX (machine-parseable)
  - Human-readable PDF (styled)
  - Human-readable DOCX (styled)
- **Iterative Refinement**: Review and adjust generated CVs through conversation

## Quick Start with GitHub Copilot

If you have a GitHub Copilot subscription, this is the fastest way to get started:

```bash
# 1. Create GitHub token
# Go to: https://github.com/settings/tokens
# Click "Generate new token (classic)"
# Select scope: read:user
# Copy the token

# 2. Set up environment
conda activate cvgen
export GITHUB_MODELS_TOKEN="ghp_your_token_here"

# 3. Run the test
python scripts/test_llm.py

# 4. Start generating CVs!
python scripts/llm_cv_generator.py
```

That's it! No additional API costs - uses your existing GitHub Copilot subscription.

## Setup

### 1. Install Conda Environment

The system uses conda for managing spaCy/blis dependencies (avoids compilation issues on macOS):

```bash
# Create environment with spaCy from conda-forge
conda create -n cvgen python=3.9 spacy -c conda-forge --override-channels -y

# Activate environment
conda activate cvgen

# Install remaining dependencies via pip
pip install -r scripts/requirements-pip.txt
```

### 2. Configure LLM Provider

Choose one LLM provider and set the appropriate credentials:

If you do not pass `--llm-provider` on the CLI, `llm.default_provider` must be configured via env/config.

#### **GitHub Models (Recommended - Uses Your GitHub Copilot Subscription)**

1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select scopes: `read:user` (basic access)
   - Copy the token

2. Set the token:
```bash
export GITHUB_MODELS_TOKEN="your-github-token-here"
```

> **Note:** Uses `GITHUB_MODELS_TOKEN` (not `GITHUB_TOKEN`) to avoid conflicts with your existing GitHub access token.

**Benefits**:
- Free/included with GitHub Copilot subscription
- Access to GPT-4, GPT-4o, and other models
- Generous rate limits
- No separate API billing

#### **OpenAI (Direct)**
```bash
export OPENAI_API_KEY="your-api-key-here"
```

#### **Anthropic Claude**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

#### **Local Model** (No API key needed)
- Uses HuggingFace transformers with local models
- Downloads models automatically on first run
- Requires more RAM/CPU but no API costs
- Slower performance (~30-90 seconds per query)

## Usage

### Interactive Mode (Recommended)

```bash
conda activate cvgen
python scripts/llm_cv_generator.py
```

This starts a conversational session where you can:
1. Paste job descriptions
2. Ask questions about your CV content
3. Review LLM analysis and recommendations
4. Approve customizations
5. Generate CV files
6. Request refinements

### With Job Description File

```bash
python scripts/llm_cv_generator.py --job-file sample_jobs/data_science_lead.txt
```

### Specify LLM Provider

```bash
# Use GitHub Models (included with Copilot)
python scripts/llm_cv_generator.py --llm-provider github

# Use OpenAI GPT-4 directly
python scripts/llm_cv_generator.py --llm-provider openai

# Use Anthropic Claude
python scripts/llm_cv_generator.py --llm-provider anthropic

# Use local model (no API key)
python scripts/llm_cv_generator.py --llm-provider local
```

> **Which provider should I use?** See [LLM_PROVIDER_COMPARISON.md](LLM_PROVIDER_COMPARISON.md) for detailed comparison including speed, cost, and quality analysis for your hardware.

### Non-Interactive Mode

For automation/testing:

```bash
python scripts/llm_cv_generator.py --job-file job.txt --non-interactive
```

### Minimal Web UI

Serve a simple web interface instead of the terminal UI:

```bash
conda activate cvgen
pip install -r scripts/requirements-pip.txt  # ensure Flask is installed
python scripts/web_app.py --llm-provider github
# If you omit --llm-provider, llm.default_provider must be configured.
# Open http://localhost:5000
```

In the browser, paste a job description, send messages (e.g., `recommend_customizations`, `generate_cv`), check status, and save the session.

## Project Structure

```
CV/
├── Master_CV_Data.json              # Your master CV data
├── publications.bib                 # BibTeX publications
├── REQUIREMENTS.md                  # Full requirements doc
├── scripts/
│   ├── llm_cv_generator.py         # Main entry point (LLM-driven)
│   ├── generate_cv.py              # Legacy rule-based generator
│   ├── parse_job_description.py    # Job parsing utilities
│   ├── fetch_gdoc.py               # Google Docs integration
│   ├── requirements-pip.txt        # Pip dependencies
│   └── utils/
│       ├── llm_client.py           # LLM API abstraction
│       ├── conversation_manager.py # Conversational flow
│       ├── cv_orchestrator.py      # Content selection & generation
│       ├── scoring.py              # Relevance scoring functions
│       ├── bibtex_parser.py        # Publication parsing
│       └── template_renderer.py    # Document templates
└── files/                          # Generated CVs archive
    └── {Company}_{Role}_{Date}/
        ├── CV_*_ATS.docx          # Machine-parseable
        ├── CV_*.html              # Styled HTML + Schema.org JSON-LD
        ├── CV_*.pdf               # Styled PDF
        ├── metadata.json          # Generation metadata
        └── job_description.txt    # Original posting
```

## Architecture

### LLM-First Design

The system uses LLMs for:
1. **Semantic Analysis**: Understanding job requirements beyond keywords
2. **Content Recommendation**: Suggesting which experiences/skills to emphasize
3. **Conversational Guidance**: Interactive Q&A for customization
4. **Iterative Refinement**: Understanding feedback and regenerating

### Hybrid Approach

Combines LLM intelligence with traditional methods:
- **LLM**: Semantic understanding, recommendations, conversation
- **Rule-based**: Keyword matching, scoring, validation
- **Combined**: Best of both—semantic relevance + ATS optimization

### Components

1. **LLM Client** (`llm_client.py`):
   - Abstraction over OpenAI, Anthropic, local models
   - Job analysis, customization recommendations
   - Semantic similarity scoring

2. **Conversation Manager** (`conversation_manager.py`):
   - Interactive dialogue flow
   - State management
   - Session persistence

3. **CV Orchestrator** (`cv_orchestrator.py`):
   - Content selection (hybrid LLM + scoring)
   - Document generation coordination
   - Output file management

4. **Utilities**:
   - Scoring functions (keyword relevance)
   - BibTeX parsing
   - Template rendering

## Commands

During interactive session:

- `help` - Show available commands
- `status` - Check current progress
- `reset` - Start over
- `quit` - Save and exit

## Example Workflow

```
$ python scripts/llm_cv_generator.py

======================================================================
   LLM-Driven CV Generation System
   Conversational AI-powered CV customization
======================================================================

Initializing LLM (openai)...
✓ LLM initialized

Welcome! I'll help you create a customized CV.

> I'm applying for a Senior Data Scientist role at Genentech

Great! I'll help you create a CV for the Senior Data Scientist position
at Genentech. Could you share the job description? You can paste it here.

> [paste job description]

✓ Analyzing job description...

I've analyzed the position. It emphasizes:
- Genomics and biostatistics (high priority)
- R/Bioconductor expertise (required)
- Clinical trial experience (preferred)

Based on your background, I recommend emphasizing:
1. Your Pfizer genomics work (RNA-Seq analysis)
2. Bioconductor package development
3. Clinical trial design experience

Would you like me to proceed with these customizations?

> Yes, generate the CV

🔄 Generating CV files...

✓ CV generated successfully!

Output directory: files/Genentech_SeniorDataScientist_2026-01-06/

Files created:
  - CV_Genentech_SeniorDataScientist_2026-01-06_ATS.docx
  - CV_Genentech_SeniorDataScientist_2026-01-06.html
  - CV_Genentech_SeniorDataScientist_2026-01-06.pdf
  - metadata.json
```

## Next Steps

1. **Review Generated CVs**: Check the files in the output directory
2. **Refine if Needed**: Continue conversation to adjust
3. **Save Session**: Sessions auto-save on exit
4. **Generate Cover Letter**: (Feature coming soon)

## Testing

### Python tests

Run the full Python test suite via the orchestrator script (preferred):

```bash
conda activate cvgen
python run_tests.py                                       # all tests
python run_tests.py --categories unit component integration
python run_tests.py --list                                # list available categories
```

Or run pytest directly:

```bash
pytest                        # all tests
pytest tests/test_*.py        # specific files
```

### JavaScript tests

The frontend utilities in `web/utils.js`, `web/api-client.js`, and `web/state-manager.js` are covered by Vitest unit tests.

```bash
npm install               # first time only — installs vitest + jsdom
npm run test:js           # run all JS tests (104 tests across 3 files)
npm run test:js:watch     # watch mode during development
npm run test:js:cover     # run with coverage report
```

Test files live in `tests/js/`. The test runner is configured in `vitest.config.mjs`.

## Requirements

See [REQUIREMENTS.md](REQUIREMENTS.md) for full system requirements and design specifications.

## Troubleshooting

**"Module not found" errors:**
```bash
conda activate cvgen
pip install -r scripts/requirements-pip.txt
```

**LLM API errors:**
- Verify API key is set: `echo $OPENAI_API_KEY`
- Check API quota/billing
- Try local model: `--llm-provider local`

**Conda environment issues:**
- Recreate: `conda env remove -n cvgen && conda create ...`
- Use only conda-forge: `--override-channels -c conda-forge`

## License

Private project - Gregory R. Warnes
