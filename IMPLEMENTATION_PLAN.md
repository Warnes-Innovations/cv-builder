# CV-Builder: Implementation Plan
## Version 1.0 MVP - February 11-18, 2026

---

## Executive Summary

**Timeline**: 7 days (Feb 11-18, 2026)  
**Team Size**: 1 developer (solo)  
**Target**: Production-ready v1.0 with CV editing and document generation  
**Risk Level**: Low (realistic scope, proven technologies)

### Critical Path
1. **Days 1-2**: CV Editing UI (Priority #1)
2. **Days 3-4**: Quarto PDF Generation (Priority #2a)
3. **Day 4-5**: DOCX ATS Generation (Priority #2b)
4. **Days 5-7**: Integration Testing & Polish

---

## Implementation Phases

## Phase 1: CV Editor UI (Days 1-2)

### Day 1: Editor Interface Development

#### Morning Session (9:00 AM - 12:00 PM)

**Task 1.1: Setup Editor Tab Structure** [2 hours]
- [ ] Add "CV Editor" tab to navigation in `web/index.html`
- [ ] Create HTML structure with sections:
  - Personal info display (read-only)
  - Summary textarea
  - Experiences container (empty, will populate dynamically)
  - Skills container
  - Action buttons (Save, Reset, Generate)
- [ ] Add CSS classes in `web/styles.css`:
  - `.editor-container` - main layout
  - `.section` - section spacing and borders
  - `.experience-card` - collapsible cards
  - `.skills-chips` - chip styling

**Acceptance Criteria**:
- ✅ Tab visible and navigable
- ✅ Layout matches mockup wireframe
- ✅ Responsive on desktop (1920x1080 and 1440x900)

**Task 1.2: Personal Info & Summary Editors** [1 hour]
- [ ] Populate personal info from `appState.cvData.personal_info`
- [ ] Create summary textarea with character counter (500 max)
- [ ] Add auto-save on blur (save to appState and localStorage)

**Acceptance Criteria**:
- ✅ Personal info displays correctly
- ✅ Summary editable with real-time character count
- ✅ Changes persist in localStorage

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 1.3: Experience Editor Cards** [3 hours]
- [ ] Create `renderExperienceCards(experiences)` function
- [ ] For each experience, render card with:
  - Title input (text, required)
  - Company input (text, required)
  - Start/end date inputs (type="month")
  - Location input (text, optional)
  - Achievements list (textareas with add/remove buttons)
- [ ] Add "Remove Experience" button per card
- [ ] Implement collapsible card behavior (click header to expand/collapse)

**JavaScript Functions**:
```javascript
function renderExperienceCards(experiences)
function updateExperience(index, field, value)
function addAchievement(experienceIndex)
function updateAchievement(expIndex, achIndex, value)
function removeAchievement(expIndex, achIndex)
function removeExperience(index)
```

**Acceptance Criteria**:
- ✅ All experiences render as cards
- ✅ Can edit title, company, dates
- ✅ Can add/remove bullet points
- ✅ Can remove entire experience
- ✅ Changes update `appState.cvData.experiences`

**Task 1.4: Skills Editor** [1 hour]
- [ ] Create `renderSkillChips(skills)` function
- [ ] Render skills as removable chips
- [ ] Add "Add Skill" input + button
- [ ] Implement `addSkill()` and `removeSkill(index)` functions

**Acceptance Criteria**:
- ✅ Skills display as chips
- ✅ Can add new skills
- ✅ Can remove skills (X icon)
- ✅ Skills saved to `appState.cvData.skills`

---

### Day 2: Backend Integration & Validation

#### Morning Session (9:00 AM - 12:00 PM)

**Task 2.1: Create cv_editor.py Module** [2 hours]

**File**: `scripts/utils/cv_editor.py`

**Implementation**:
```python
class CVEditor:
    def validate_cv_data(self, cv_data):
        """
        Validate CV structure and required fields.
        Returns: {'valid': bool, 'errors': [], 'warnings': []}
        """
        # Check required fields
        # Check data types
        # Check logical constraints (e.g., end_date > start_date)
        pass
    
    def apply_edits(self, original_cv, edits):
        """Merge edits into original CV (deep copy)."""
        pass
    
    def _deep_merge(self, target, updates):
        """Recursively merge dicts."""
        pass
```

**Validation Rules**:
- Required: `personal_info.name`, `experiences[].title`, `experiences[].company`
- Warnings: Missing end_date (suggest current=true), missing location
- Errors: Invalid date format, empty achievements array

**Acceptance Criteria**:
- ✅ Unit tests pass for validation logic
- ✅ Returns errors/warnings in correct format
- ✅ apply_edits() creates deep copy (no mutation)

**Task 2.2: Implement POST /api/edit Endpoint** [1 hour]

**File**: `scripts/web_app.py`

**Implementation**:
```python
@app.route('/api/edit', methods=['POST'])
def edit_cv():
    data = request.get_json()
    session_id = data.get('session_id')
    cv_data = data.get('cv_data')
    
    # Load session
    session = conversation_manager.get_session(session_id)
    
    # Validate
    editor = CVEditor()
    validation_result = editor.validate_cv_data(cv_data)
    
    if not validation_result['valid']:
        return jsonify({
            'status': 'error',
            'validation': validation_result
        }), 400
    
    # Save to session
    session['edited_cv_data'] = cv_data
    conversation_manager.save_session(session)
    
    return jsonify({
        'status': 'success',
        'validation': validation_result
    })
```

**Acceptance Criteria**:
- ✅ Endpoint returns 200 on valid data
- ✅ Returns 400 with error details on invalid data
- ✅ Updates session JSON file

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 2.3: Frontend-Backend Integration** [2 hours]
- [ ] Implement `async saveCVEdits()` function
- [ ] Call `/api/edit` with current cv_data
- [ ] Handle success: Show notification, save to appState
- [ ] Handle errors: Display field-level validation messages
- [ ] Add loading spinner during save

**JavaScript**:
```javascript
async function saveCVEdits() {
  const cvData = collectCVDataFromForm();
  
  showLoadingSpinner('Saving...');
  
  try {
    const response = await fetch('/api/edit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        session_id: appState.session_id,
        cv_data: cvData
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      appState.cvData = cvData;
      saveState();
      showNotification('Saved successfully', 'success');
      
      // Show warnings
      displayWarnings(result.validation.warnings);
    } else {
      displayErrors(result.validation.errors);
    }
  } catch (error) {
    showNotification('Save failed: ' + error.message, 'error');
  } finally {
    hideLoadingSpinner();
  }
}
```

**Acceptance Criteria**:
- ✅ Save button triggers API call
- ✅ Success shows green notification
- ✅ Errors display next to invalid fields
- ✅ Loading spinner appears during request

**Task 2.4: Reset & Live Preview** [1.5 hours]
- [ ] Implement "Reset to LLM Recommendations" button
  - Reloads original `selected_content` from session
  - Discards user edits
  - Requires confirmation modal
- [ ] Add live preview pane (optional, only if time permits)
  - Renders HTML preview of current CV
  - Updates on blur of text fields

**Acceptance Criteria**:
- ✅ Reset button restores original state
- ✅ Confirmation modal prevents accidental resets
- ⭕ Preview pane shows CV layout (optional)

**Task 2.5: End-to-End Testing** [0.5 hours]
- [ ] Test full workflow:
  1. Load job description
  2. Review customizations
  3. Navigate to Editor
  4. Edit summary and experiences
  5. Save draft
  6. Refresh page → Verify edits persist
  7. Reset to recommendations
  8. Re-edit and save

**Acceptance Criteria**:
- ✅ No console errors
- ✅ Data persists across page refreshes
- ✅ Validation errors clear when corrected

---

## Phase 2: Quarto PDF Generation (Days 3-4)

### Day 3: Template Creation & Quarto Setup

#### Morning Session (9:00 AM - 12:00 PM)

**Task 3.1: Create Quarto Template Files** [2 hours]

**File**: `templates/cv_template.qmd`

**Implementation**:
```yaml
---
format:
  pdf:
    documentclass: article
    geometry:
      - top=0.5in
      - bottom=0.5in
      - left=0.75in
      - right=0.75in
    include-in-header:
      text: |
        <link rel="stylesheet" href="cv_styles.css">
    pdf-engine: chrome
params:
  personal_info:
    name: ""
    title: ""
    email: ""
    phone: ""
  summary: ""
  experiences: []
  skills: []
  education: []
---

<!-- Sidebar + Main Content Layout -->
<div class="cv-container">
  <div class="sidebar">
    <h2>Contact</h2>
    <p>
      {{params.personal_info.email}}<br>
      {{params.personal_info.phone}}
    </p>
    
    <h2>Education</h2>
    {{#each params.education}}
    <div class="edu-item">
      <strong>{{degree}}</strong><br>
      {{institution}}, {{year}}
    </div>
    {{/each}}
    
    <h2>Skills</h2>
    {{#each params.skills}}
    <span class="skill-tag">{{name}}</span>
    {{/each}}
  </div>
  
  <div class="main-content">
    <h1>{{params.personal_info.name}}</h1>
    <h2 class="subtitle">{{params.personal_info.title}}</h2>
    
    <h2>Professional Summary</h2>
    <p>{{params.summary}}</p>
    
    <h2>Experience</h2>
    {{#each params.experiences}}
    <div class="experience-item">
      <h3>{{title}} | {{company}}</h3>
      <p class="dates">{{start_date}} – {{end_date}}</p>
      <ul>
      {{#each achievements}}
        <li>{{this}}</li>
      {{/each}}
      </ul>
    </div>
    {{/each}}
  </div>
</div>
```

**File**: `templates/cv_styles.css`

**Implementation** (extract from existing HTML CV):
```css
@page {
  size: letter;
  margin: 0.5in 0.75in;
}

.cv-container {
  display: grid;
  grid-template-columns: 30% 70%;
  gap: 20px;
  font-family: 'Calibri', 'Arial', sans-serif;
}

.sidebar {
  border-right: 2px solid #ddd;
  padding-right: 20px;
}

.main-content {
  padding-left: 20px;
}

h1 {
  font-size: 24pt;
  color: #2c3e50;
  margin: 0;
}

.subtitle {
  font-size: 14pt;
  color: #7f8c8d;
  font-weight: normal;
  margin-top: 5px;
}

.experience-item {
  page-break-inside: avoid;
  margin-bottom: 20px;
}

.dates {
  font-style: italic;
  color: #7f8c8d;
}

/* Print-specific */
@media print {
  .cv-container {
    grid-template-columns: 30% 70%;
  }
  
  .experience-item {
    page-break-inside: avoid;
  }
}
```

**Acceptance Criteria**:
- ✅ Template files created in `templates/` directory
- ✅ CSS extracted from existing HTML CV
- ✅ Quarto syntax valid (no parse errors)

**Task 3.2: Manual Quarto Test** [1 hour]
- [ ] Install Quarto (if not already): `brew install quarto` (macOS)
- [ ] Create test data file: `templates/test_data.json`
- [ ] Manually render: `quarto render cv_template.qmd --to pdf`
- [ ] Verify PDF output:
  - 2-column layout
  - Multi-page flow
  - Professional styling
  - No rendering errors

**Acceptance Criteria**:
- ✅ Quarto installed and accessible via CLI
- ✅ Test PDF generated successfully
- ✅ Visual output matches expected style

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 3.3: Create quarto_generator.py Module** [2.5 hours]

**File**: `scripts/utils/quarto_generator.py`

**Implementation**:
```python
import subprocess
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class QuartoNotFoundError(Exception):
    pass

class QuartoRenderError(Exception):
    pass

class QuartoGenerator:
    def __init__(self, template_dir='templates'):
        self.template_dir = Path(template_dir)
        self.template_path = self.template_dir / 'cv_template.qmd'
        self._validate_quarto_installation()
    
    def render(self, cv_data, job_info, output_dir):
        """Generate PDF via Quarto."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate .qmd with data
        qmd_path = self._generate_qmd(cv_data, job_info, output_dir)
        
        # Render to PDF
        pdf_path = self._render_quarto(qmd_path, output_dir)
        
        return pdf_path
    
    def _generate_qmd(self, cv_data, job_info, output_dir):
        """Create .qmd file from template."""
        # Load template
        with open(self.template_path, 'r') as f:
            template_content = f.read()
        
        # Create params JSON
        params_json = json.dumps({
            'personal_info': cv_data['personal_info'],
            'summary': cv_data.get('summary', ''),
            'experiences': cv_data.get('experiences', []),
            'skills': cv_data.get('skills', []),
            'education': cv_data.get('education', [])
        }, indent=2)
        
        # Inject params into template YAML
        qmd_content = template_content.replace('{{PARAMS}}', params_json)
        
        # Write .qmd
        qmd_path = output_dir / 'cv_generated.qmd'
        with open(qmd_path, 'w') as f:
            f.write(qmd_content)
        
        logger.info(f"Generated .qmd file: {qmd_path}")
        return qmd_path
    
    def _render_quarto(self, qmd_path, output_dir):
        """Shell out to quarto CLI."""
        try:
            result = subprocess.run(
                ['quarto', 'render', str(qmd_path), '--to', 'pdf'],
                cwd=str(output_dir),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                logger.error(f"Quarto render failed: {result.stderr}")
                raise QuartoRenderError(f"Rendering failed: {result.stderr}")
            
            pdf_path = qmd_path.with_suffix('.pdf')
            if not pdf_path.exists():
                raise QuartoRenderError("PDF not created")
            
            logger.info(f"Generated PDF: {pdf_path}")
            return str(pdf_path)
        
        except subprocess.TimeoutExpired:
            raise QuartoRenderError("Render timeout (>60s)")
        except FileNotFoundError:
            raise QuartoNotFoundError("quarto CLI not found")
    
    def _validate_quarto_installation(self):
        """Check quarto is installed."""
        try:
            result = subprocess.run(
                ['quarto', '--version'],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise QuartoNotFoundError("quarto command failed")
            
            logger.info(f"Quarto version: {result.stdout.strip()}")
        except FileNotFoundError:
            raise QuartoNotFoundError("quarto not installed - see quarto.org")
```

**Acceptance Criteria**:
- ✅ Module imports without errors
- ✅ `_validate_quarto_installation()` passes
- ✅ Can generate .qmd file with test data
- ✅ Can render PDF successfully

**Task 3.4: Unit Tests for quarto_generator** [0.5 hours]

**File**: `tests/test_quarto_generator.py`

```python
import pytest
from scripts.utils.quarto_generator import QuartoGenerator, QuartoNotFoundError

def test_quarto_validation():
    gen = QuartoGenerator()
    # Should not raise if quarto installed

def test_generate_qmd(tmp_path):
    gen = QuartoGenerator()
    cv_data = {...}  # Test data
    job_info = {...}
    
    qmd_path = gen._generate_qmd(cv_data, job_info, tmp_path)
    
    assert qmd_path.exists()
    assert 'Gregory R. Warnes' in qmd_path.read_text()

def test_render_pdf(tmp_path):
    gen = QuartoGenerator()
    cv_data = {...}
    job_info = {...}
    
    pdf_path = gen.render(cv_data, job_info, tmp_path)
    
    assert pdf_path.endswith('.pdf')
    assert Path(pdf_path).exists()
```

**Acceptance Criteria**:
- ✅ Tests pass with pytest
- ✅ Code coverage >80%

---

### Day 4: Backend Integration & DOCX Generation

#### Morning Session (9:00 AM - 12:00 PM)

**Task 4.1: Enhance cv_orchestrator.generate_cv()** [1.5 hours]

**File**: `scripts/utils/cv_orchestrator.py`

**Add Dependencies**:
```python
from .quarto_generator import QuartoGenerator, QuartoNotFoundError, QuartoRenderError
from .docx_generator import DocxGenerator
```

**Implement**:
```python
class CVOrchestrator:
    def __init__(self, llm_client, master_cv_path):
        self.llm = llm_client
        self.master_cv = self._load_master_cv(master_cv_path)
        self.quarto_gen = QuartoGenerator()
        self.docx_gen = DocxGenerator()
    
    def generate_cv(self, cv_data, job_info, output_dir):
        """Generate PDF and DOCX files."""
        # Validate structure
        validated_data = self._validate_cv_structure(cv_data)
        
        # Generate PDF
        pdf_path = self.quarto_gen.render(
            cv_data=validated_data,
            job_info=job_info,
            output_dir=output_dir
        )
        
        # Generate DOCX
        docx_path = self.docx_gen.generate_ats_docx(
            cv_data=validated_data,
            job_info=job_info,
            output_path=f"{output_dir}/CV_ATS.docx"
        )
        
        # Metadata
        metadata = {
            'generated_at': datetime.now().isoformat(),
            'job_title': job_info.get('job_title'),
            'company': job_info.get('company'),
            'pdf_size_bytes': Path(pdf_path).stat().st_size,
            'docx_size_bytes': Path(docx_path).stat().st_size
        }
        
        self._save_json(metadata, f"{output_dir}/metadata.json")
        
        return {
            'pdf_path': pdf_path,
            'docx_path': docx_path,
            'metadata': metadata
        }
```

**Acceptance Criteria**:
- ✅ Method exists and callable
- ✅ Returns dict with pdf_path, docx_path, metadata
- ✅ Creates output directory if doesn't exist

**Task 4.2: Implement POST /api/generate Endpoint** [1 hour]

**File**: `scripts/web_app.py`

```python
@app.route('/api/generate', methods=['POST'])
def generate_cv():
    data = request.get_json()
    session_id = data.get('session_id')
    formats = data.get('formats', ['pdf', 'docx'])
    
    session = conversation_manager.get_session(session_id)
    
    # Get edited cv_data or selected_content
    cv_data = session.get('edited_cv_data') or session['selected_content']
    job_info = session['job_info']
    
    # Create output directory
    company_safe = job_info['company'].replace(' ', '')
    title_safe = job_info['job_title'].replace(' ', '')
    output_dir = f"./files/{company_safe}_{title_safe}_{date.today()}"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        result = cv_orchestrator.generate_cv(
            cv_data=cv_data,
            job_info=job_info,
            output_dir=output_dir
        )
        
        # Save to session
        session['generated_files'] = result
        conversation_manager.save_session(session)
        
        return jsonify({
            'status': 'success',
            'files': {
                'pdf': {
                    'path': result['pdf_path'],
                    'url': f"/downloads/{Path(result['pdf_path']).name}",
                    'size': result['metadata']['pdf_size_bytes']
                },
                'docx': {
                    'path': result['docx_path'],
                    'url': f"/downloads/{Path(result['docx_path']).name}",
                    'size': result['metadata']['docx_size_bytes']
                }
            }
        })
    
    except QuartoNotFoundError as e:
        return jsonify({
            'status': 'error',
            'error_type': 'quarto_not_installed',
            'message': str(e)
        }), 500
    
    except Exception as e:
        logger.exception("Generation failed")
        return jsonify({
            'status': 'error',
            'error_type': 'unknown',
            'message': str(e)
        }), 500
```

**Acceptance Criteria**:
- ✅ Endpoint callable via POST
- ✅ Returns 200 with file URLs on success
- ✅ Returns 500 with error details on failure

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 4.3: Create docx_generator.py Module** [2.5 hours]

**File**: `scripts/utils/docx_generator.py`

**Implementation** (see ARCHITECTURE.md Section 2.2.4 for full code)

Key Methods:
- `generate_ats_docx(cv_data, job_info, output_path)`
- `_add_contact_section(doc, personal_info)`
- `_add_summary_section(doc, cv_data, job_info)`
- `_add_experience_section(doc, experiences)`
- `_add_skills_section(doc, skills, job_keywords)`
- `_add_education_section(doc, education)`
- `_inject_keywords(text, keywords)` - Natural keyword incorporation

**ATS Guidelines**:
- Calibri 11pt font
- Single-column layout
- No tables, no graphics
- Simple bullet points
- Standard section headings
- Keywords injected naturally

**Acceptance Criteria**:
- ✅ Generates valid .docx file
- ✅ Opens in Microsoft Word without errors
- ✅ Passes ATS validator (use online tool)
- ✅ File size <1MB

**Task 4.4: Frontend - Generate Button & Downloads** [1 hour]

**JavaScript** (add to `web/index.html`):
```javascript
async function generateCV() {
  showLoadingSpinner('Generating CV...');
  
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        session_id: appState.session_id,
        formats: ['pdf', 'docx']
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      appState.generatedFiles = result.files;
      saveState();
      
      // Navigate to Generated CVs tab
      showTab('generated-cvs');
      
      // Display download links
      displayDownloadLinks(result.files);
      
      showNotification('CV generated successfully!', 'success');
    } else {
      handleGenerateError(result);
    }
  } catch (error) {
    showNotification('Generation failed: ' + error.message, 'error');
  } finally {
    hideLoadingSpinner();
  }
}

function displayDownloadLinks(files) {
  const container = document.getElementById('download-links');
  container.innerHTML = `
    <div class="download-card pdf">
      <h3>Human-Readable CV (PDF)</h3>
      <p>Professional 2-column layout for hiring managers</p>
      <a href="${files.pdf.url}" download class="btn-download">
        Download PDF (${formatFileSize(files.pdf.size)})
      </a>
    </div>
    
    <div class="download-card docx">
      <h3>ATS-Optimized CV (DOCX)</h3>
      <p>Simple format for applicant tracking systems</p>
      <a href="${files.docx.url}" download class="btn-download">
        Download DOCX (${formatFileSize(files.docx.size)})
      </a>
    </div>
  `;
}
```

**Acceptance Criteria**:
- ✅ "Generate CV" button triggers generation
- ✅ Loading spinner shows during process
- ✅ Download links appear on success
- ✅ Files download correctly when clicked

---

## Phase 3: Integration Testing (Days 5-6)

### Day 5: End-to-End Testing

#### Morning Session (9:00 AM - 12:00 PM)

**Task 5.1: Test Full Workflow - Scenario 1** [1.5 hours]

**Test Case 1: Biotech Senior Data Scientist**
- [ ] Start fresh session
- [ ] Paste job description from `sample_jobs/biotech_senior_ds.txt`
- [ ] Review job analysis (verify keywords extracted)
- [ ] Review customizations (check relevance scores)
- [ ] Navigate to Editor
- [ ] Edit 3 experiences (modify achievements)
- [ ] Add 2 new skills
- [ ] Save draft
- [ ] Generate CV
- [ ] Download PDF and DOCX
- [ ] **Manual verification**:
  - PDF has 2-column layout
  - PDF is visually appealing
  - DOCX opens in Word correctly
  - DOCX passes ATS validator online
  - Edited content appears in both files

**Acceptance Criteria**:
- ✅ No errors in workflow
- ✅ PDF and DOCX reflect edits
- ✅ Visual quality meets standards

**Task 5.2: Test Full Workflow - Scenario 2** [1 hour]

**Test Case 2: ML Engineer Startup**
- [ ] Same workflow as above
- [ ] Different job description
- [ ] Reject some recommended experiences
- [ ] Add custom achievements in editor
- [ ] Verify rejected items don't appear in final CV

**Task 5.3: Test Edge Cases** [0.5 hours]
- [ ] Empty achievements array (should show at least 1)
- [ ] Very long summary (500+ chars)
- [ ] Special characters in company name (e.g., "O'Reilly & Associates")
- [ ] Missing end_date (should show "Present")

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 5.4: Browser Compatibility Testing** [1 hour]
- [ ] Test in Chrome (primary)
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Check responsive layout (1920x1080, 1440x900, 13" laptop)

**Acceptance Criteria**:
- ✅ UI functional in all 3 browsers
- ✅ No layout breaking on different screen sizes

**Task 5.5: Error Handling Testing** [1.5 hours]

**Test Cases**:
- [ ] Quarto not installed (simulate by renaming binary)
  - Should show clear error with install link
- [ ] Invalid CV data (remove required field)
  - Should show validation error
- [ ] LLM timeout (disconnect network during analysis)
  - Should show retry option
- [ ] Disk full (simulate with small test partition)
  - Should show clear error message
- [ ] File permissions issue
  - Should show actionable error

**Acceptance Criteria**:
- ✅ All errors handled gracefully
- ✅ User sees clear instructions for fixing
- ✅ No crashes or undefined errors

**Task 5.6: Performance Testing** [0.5 hours]
- [ ] Measure time for:
  - Job analysis: <10 seconds
  - Recommendations: <5 seconds
  - PDF generation: <10 seconds
  - DOCX generation: <2 seconds
  - Total workflow: <2 minutes

**Acceptance Criteria**:
- ✅ All operations complete within time budgets
- ✅ No UI freezing during generation

**Task 5.7: Session Persistence Testing** [0.5 hours]
- [ ] Complete workflow halfway (stop at Editor)
- [ ] Close browser
- [ ] Reopen browser
- [ ] Verify:
  - Session restored from localStorage
  - Job analysis persists
  - Customizations remembered
  - Editor state intact

**Acceptance Criteria**:
- ✅ Full state restoration working
- ✅ No data loss

---

### Day 6: Documentation & Polish

#### Morning Session (9:00 AM - 12:00 PM)

**Task 6.1: Update README.md** [1 hour]

**Sections to Add/Update**:
```markdown
## Features
- ✅ LLM-driven job analysis
- ✅ Interactive customization review
- ✅ In-app CV editing
- ✅ Professional PDF generation (Quarto)
- ✅ ATS-optimized DOCX generation

## Installation

### Prerequisites
- Python 3.9+
- Conda or virtualenv
- **Quarto** (required for PDF generation)

### Setup Steps
1. Install Quarto: https://quarto.org/docs/get-started/
   - macOS: `brew install quarto`
   - Windows: Download installer
   - Linux: `sudo apt install quarto` or download binary

2. Clone repository and install Python dependencies:
   ```bash
   git clone ...
   cd cv-builder
   conda env create -f environment.yml
   conda activate cvgen
   pip install python-docx
   ```

3. Configure API keys in `.env`:
   ```
   GITHUB_MODELS_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here (optional)
   ```

4. Run application:
   ```bash
   python scripts/web_app.py
   ```

5. Open browser: http://localhost:5000

## Usage

### Step 1: Upload Job Description
- Paste job description text
- Or upload .txt file
- Click "Analyze"

### Step 2: Review Customizations
- Review recommended experiences and skills
- Approve or reject each item
- Click "Generate Recommendations"

### Step 3: Edit CV Content
- Navigate to "CV Editor" tab
- Edit summary, experiences, skills
- Click "Save Draft"

### Step 4: Generate Documents
- Click "Generate CV"
- Download PDF (human-readable)
- Download DOCX (ATS-optimized)

## Troubleshooting

### "Quarto not found" Error
- Install Quarto from https://quarto.org
- Verify installation: `quarto --version`
- Restart Flask server

### PDF Generation Fails
- Check Quarto logs in `files/` directory
- Ensure Chrome headless is available
- Try manual render: `quarto render template.qmd`

### LLM Timeout
- Check internet connection
- Verify API keys in `.env`
- Try with shorter job description
```

**Acceptance Criteria**:
- ✅ README complete and accurate
- ✅ All commands tested and working
- ✅ Troubleshooting section covers common issues

**Task 6.2: Create USER_GUIDE.md** [1 hour]

**Structure**:
1. Introduction
2. Step-by-step workflow (with screenshots)
3. Editor usage tips
4. Best practices
   - How to write effective achievements
   - Keyword optimization strategies
   - When to use PDF vs DOCX
5. FAQ

**Acceptance Criteria**:
- ✅ User guide is clear and comprehensive
- ✅ Screenshots show key UI states

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 6.3: UI Polish** [2 hours]
- [ ] Add loading spinners for all async operations
- [ ] Improve error message styling (toast notifications)
- [ ] Add tooltips for non-obvious UI elements
- [ ] Improve button states (disabled during operations)
- [ ] Add keyboard shortcuts (Ctrl+S to save)
- [ ] Improve mobile responsiveness (stretch goal)

**Acceptance Criteria**:
- ✅ UI feels polished and professional
- ✅ No confusing UI states

**Task 6.4: Code Cleanup** [1 hour]
- [ ] Remove debug console.logs
- [ ] Add JSDoc comments to JavaScript functions
- [ ] Add Python docstrings to new modules
- [ ] Run linter (Black for Python, ESLint for JS)
- [ ] Remove unused imports

**Acceptance Criteria**:
- ✅ Code passes linter with no warnings
- ✅ All functions documented

**Task 6.5: Final Testing on Clean Environment** [1 hour]
- [ ] Clone repository to new directory
- [ ] Follow README installation steps exactly
- [ ] Test full workflow from scratch
- [ ] Verify no missing dependencies

**Acceptance Criteria**:
- ✅ Fresh install works without issues
- ✅ README instructions are accurate

---

## Phase 4: Launch Preparation (Day 7)

### Day 7: Buffer Day & Go-Live Decision

#### Morning Session (9:00 AM - 12:00 PM)

**Task 7.1: Address Discovered Issues** [3 hours]
- [ ] Fix any bugs discovered in Day 5-6 testing
- [ ] Implement any minor enhancements
- [ ] Respond to user feedback (if any)

**Priority**:
1. Critical bugs (data loss, crashes)
2. High-priority bugs (generation failures)
3. Medium-priority bugs (UI glitches)
4. Low-priority enhancements (nice-to-haves)

#### Afternoon Session (1:00 PM - 5:00 PM)

**Task 7.2: Create v1.0 Release** [1 hour]
- [ ] Tag release in git: `git tag v1.0.0`
- [ ] Create CHANGELOG.md:
  ```markdown
  # Changelog
  
  ## [1.0.0] - 2026-02-18
  
  ### Added
  - CV editing UI with in-app content modification
  - Quarto-based PDF generation (professional 2-column layout)
  - ATS-optimized DOCX generation
  - Session persistence and state management
  - Comprehensive error handling
  
  ### Fixed
  - [List any bugs fixed during development]
  
  ### Known Issues
  - Mobile view not optimized (Phase 2)
  - Cover letters not implemented (Phase 2)
  ```
- [ ] Push to GitHub
- [ ] Create GitHub release with binaries (if applicable)

**Task 7.3: User Acceptance Testing** [1 hour]
- [ ] Invite user (Gregory) to test application
- [ ] Observe real-world usage
- [ ] Note any friction points
- [ ] Document feedback for Phase 2

**Task 7.4: Go-Live Decision** [0.5 hours]

**Checklist**:
- ✅ All "must have" success criteria met
- ✅ No critical bugs
- ✅ Documentation complete
- ✅ Fresh install tested
- ✅ User acceptance positive

**If all checked**: **GO LIVE** 🎉

**Task 7.5: Post-Launch Monitoring** [0.5 hours]
- [ ] Monitor first few real-world CV generations
- [ ] Check for any runtime errors
- [ ] Collect user feedback
- [ ] Plan Phase 2 priorities

---

## Dependencies & Critical Path

### Critical Path (Cannot Parallelize)
```
Day 1-2: Editor UI → Day 2: Backend Integration → 
Day 3: Quarto Template → Day 4: Integration → 
Day 5: Testing → Day 7: Launch
```

### Parallelizable Tasks
- Day 3 Morning (Quarto template) + Day 4 Afternoon (DOCX generator) could be done in parallel if 2 developers
- Day 6 Morning (Documentation) + Day 6 Afternoon (UI Polish) are independent

### External Dependencies
1. **Quarto Installation**: User must install before Day 3 testing
2. **LLM API Access**: GitHub Models must be working (test on Day 1)
3. **Browser Availability**: Chrome, Firefox, Safari for testing

---

## Risk Mitigation

### High-Risk Areas

**1. Quarto PDF Generation** (Days 3-4)
- **Risk**: User unfamiliar with Quarto, may take longer than estimated
- **Mitigation**: 
  - Study sng-dnra templates on Day 1 evening
  - Allocate 0.5 day buffer on Day 7
  - Fallback: Simplify to HTML-only in Phase 1, add PDF in Phase 2

**2. ATS DOCX Complexity** (Day 4)
- **Risk**: python-docx learning curve, ATS guidelines complex
- **Mitigation**:
  - Use REQUIREMENTS.md guidelines explicitly
  - Test with online ATS validators early (Day 4 afternoon)
  - Fallback: Simplify to basic DOCX, enhance in Phase 2

**3. Integration Issues** (Days 5-6)
- **Risk**: Components work individually but fail when integrated
- **Mitigation**:
  - Test end-to-end frequently (after each phase)
  - Use comprehensive error handling from start
  - Day 7 buffer for fixing integration bugs

### Medium-Risk Areas

**4. UI Complexity** (Days 1-2)
- **Risk**: Editor UI more complex than anticipated
- **Mitigation**:
  - Build minimal viable editor first (text fields only)
  - Add enhancements (drag-and-drop, collapsible) if time permits
  - Mark advanced features as "nice to have"

**5. Browser Compatibility** (Day 5)
- **Risk**: UI breaks in Safari or Firefox
- **Mitigation**:
  - Stick to vanilla JavaScript (no framework quirks)
  - Test in all browsers throughout development
  - Use CSS Grid (widely supported)

---

## Success Metrics

### Must-Have (Launch Blockers)
- ✅ Can edit CV content in-app
- ✅ Generated PDF matches existing HTML CV style
- ✅ Generated DOCX passes ATS validator
- ✅ Edits persist across browser sessions
- ✅ No data loss
- ✅ Works in Chrome, Firefox, Safari

### Should-Have (High Priority)
- ✅ PDF generation completes in <10 seconds
- ✅ Error messages are clear and actionable
- ✅ UI feels polished (loading spinners, notifications)
- ✅ Documentation is complete

### Nice-to-Have (Optional)
- ⭕ Live preview pane in editor
- ⭕ Drag-and-drop reordering
- ⭕ Keyboard shortcuts
- ⭕ Mobile-responsive layout
- ⭕ Export session data

---

## Post-MVP Phase 2 Priorities

**Ranked by User Value**:
1. **Cover Letter Generation** (3 days)
2. **Interview Question Responses** (3 days)
3. **Google Drive Integration** (4 days)
4. **Job Application Tracking** (4 days)
5. **Analytics Dashboard** (3 days)
6. **LinkedIn Profile Generation** (3 days)
7. **Multi-user Support** (10+ days)

**Estimated Phase 2 Timeline**: 3-4 weeks

---

## Conclusion

This implementation plan delivers a **production-ready v1.0 in 7 days** by:
- Focusing on core value (editing + generation)
- Leveraging proven technologies (Quarto, python-docx)
- Building incrementally with frequent testing
- Allocating buffer time for integration issues
- Deferring complexity to Phase 2

**Key Success Factors**:
- Realistic scope (no feature creep)
- Daily progress milestones
- Frequent end-to-end testing
- Clear acceptance criteria
- Comprehensive error handling

**Ready to implement!** 🚀

---

**Document Version**: 1.0  
**Last Updated**: February 11, 2026  
**Status**: Approved - Ready for Implementation  
**Author**: AI Project Manager (GitHub Copilot)
