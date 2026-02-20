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