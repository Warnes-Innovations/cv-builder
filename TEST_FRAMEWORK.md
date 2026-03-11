# CV Builder Testing Configuration

## Test Categories

The testing framework is organized into three main categories:

### 1. Unit Tests 🧪
- **test_copilot_auth.py** - Authentication and OAuth flow
- **test_url_fetch.py** - URL parsing and content extraction
- No external dependencies (web server, network calls)
- Uses mocks for external services

### 2. Component Tests 📄  
- **test_pdf_generation.py** - Quarto PDF generation pipeline
- **test_ats_generation.py** - ATS-optimized DOCX generation
- Tests individual components in isolation
- May require file system access but no network

### 3. Integration Tests 🌐
- **test_enhanced_job_input.py** - Complete job input workflow  
- **test_linkedin_url_handling.py** - LinkedIn URL processing
- **test_user_linkedin_url.py** - Specific URL validation
- **test_web_ui_workflow.py** - End-to-end web interface
- Requires running web server on port 5001
- Full workflow testing

## Running Tests

### Run All Tests
```bash
python run_tests.py
```

### Run Specific Categories
```bash
python run_tests.py --categories unit component
python run_tests.py --categories integration  
```

### Verbose Output
```bash
python run_tests.py --verbose
```

### List Available Tests
```bash
python run_tests.py --list
```

## Environment Setup

Tests require the `cvgen` conda environment:
```bash
conda activate cvgen
```

## Test Dependencies

- **Unit Tests**: No special requirements
- **Component Tests**: Quarto installation for PDF generation
- **Integration Tests**: Web server running on port 5001

## Output Locations

Test outputs are written to:
- **test_output/**: Generated PDFs, DOCX files, logs
- **web/media/**: Web assets and uploads

## Mock Data

Tests use realistic but anonymized data:
- Sample job descriptions in `sample_jobs/`
- Test CV content in individual test files
- Authentication tokens are mocked

## Performance Benchmarks

- PDF generation should complete in < 10 seconds
- DOCX generation should complete in < 5 seconds  
- API endpoints should respond in < 2 seconds
- Full workflow should complete in < 30 seconds

## Test Output Validation

Generated files are validated for:
- File existence and non-zero size
- PDF/DOCX format integrity
- Required content sections
- ATS-friendly formatting

## Continuous Integration

Framework designed for CI/CD integration:
- Exit codes: 0 = success, 1 = failure
- JSON output option for parsing
- Timeout protection (60s per test)
- Proper cleanup of resources

---

## 4. UI Tests (Browser Automation) 🎭

End-to-end tests using **Playwright** (Python). Exercises the full stack — Flask server,
frontend JS modules, and all 8 workflow steps — through a real browser.

### Why Playwright

- First-class Python API; fits the existing `cvgen` / `pytest` environment
- Auto-waits for elements (critical for this async/polling app)
- Built-in network route interception to mock LLM API responses (no real API keys needed)
- Headless by default; headed mode (`--headed`) available for debugging

### Installation

```bash
conda activate cvgen
pip install playwright pytest-playwright
playwright install chromium
```

### File Layout

```
tests/ui/
  conftest.py                  # session-scoped live server + per-test browser fixtures
  fixtures/
    mock_responses.py          # Canned JSON for /api/analyze, /api/recommend, etc.
    sample_job.txt             # Sample job description for file-upload tests
  test_ui_job_input.py         # Step 1 — text paste / URL / file upload
  test_ui_analysis.py          # Step 2 — analysis tab rendering
  test_ui_customise.py         # Step 3 — DataTable selection
  test_ui_rewrites.py          # Step 4 — approve / reject / edit rewrite cards
  test_ui_spell_check.py       # Step 5 — spell check display
  test_ui_generation.py        # Step 6 — generation progress + download links
  test_ui_session.py           # Session save / load / reset
  test_ui_auth.py              # Copilot OAuth modal
  test_ui_workflow.py          # End-to-end happy path (all 8 steps)
```

### Fixture Strategy

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `live_server` | session | Starts Flask on port 5001; yields base URL; tears down after suite |
| `page` | function | Fresh browser context per test; clears localStorage; intercepts LLM routes |
| `seeded_page` | function | `page` already past Step 1 (job loaded) — for tests that skip ingestion |

All LLM-facing routes (`POST /api/analyze`, `POST /api/recommend`, `POST /api/rewrites`,
`POST /api/generate`) are intercepted and served from `fixtures/mock_responses.py` so
tests are deterministic and require no API credentials.

### Coverage by File

| File | Key Assertions |
|------|---------------|
| `test_ui_job_input.py` | Text paste enables Analyze button; URL field triggers fetch; file upload shows filename; invalid input shows error; step bar advances to Analysis |
| `test_ui_analysis.py` | Analysis tab populates keyword chips; responsibilities list rendered; skills table shown; step advances |
| `test_ui_customise.py` | DataTable loads experience rows; relevance scores visible; checkbox toggle persists; Recommend highlights rows; Proceed advances |
| `test_ui_rewrites.py` | Rewrite cards render before/after; weak-evidence warning shown; Accept/Reject update card state; Edit saves; Approve All bulk action |
| `test_ui_spell_check.py` | Issues list shown or "none found"; dismissing advances step |
| `test_ui_generation.py` | Generate triggers progress; messages stream; download links appear; ATS DOCX + PDF both present |
| `test_ui_session.py` | Reload restores phase; Save persists; Reset clears + returns to step 1 |
| `test_ui_auth.py` | Auth modal opens; device code displayed; badge updates |
| `test_ui_workflow.py` | Full path paste → analyze → customise → rewrites → generate → download |

### Running UI Tests

```bash
conda activate cvgen

# All UI tests (headless)
pytest tests/ui/

# Watch the browser
pytest tests/ui/ --headed

# Stop on first failure
pytest tests/ui/ -x

# Specific file
pytest tests/ui/test_ui_workflow.py -v

# Via run_tests.py
python run_tests.py --categories ui
```

### Implementation Priority

1. `test_ui_workflow.py` — single end-to-end smoke test; fastest signal the app works
2. `test_ui_job_input.py` — Step 1 is the entry point; regressions here block everything
3. `test_ui_rewrites.py` — most complex interactive component
4. `test_ui_generation.py` — primary deliverable (generation + download)
5. `test_ui_customise.py` — DataTable interaction; fragile after refactoring
6. Remaining files

### Key DOM Selectors

| Element | Selector |
|---------|----------|
| Workflow steps | `#step-job`, `#step-analysis`, `#step-customizations`, `#step-rewrite`, `#step-spell`, `#step-generate`, `#step-layout`, `#step-finalise` |
| Tabs | `#tab-job`, `#tab-analysis`, `#tab-customizations`, `#tab-rewrite`, `#tab-spell`, `#tab-editor`, `#tab-cv`, `#tab-download` |
| Action buttons | `#analyze-btn`, `#recommend-btn`, `#generate-btn`, `#reset-btn` |
| Conversation | `#conversation`, `#message-input`, `#send-btn` |
| Auth | `#copilot-auth-badge`, `#auth-modal-overlay`, `#auth-user-code` |
| Document area | `#document-content` |