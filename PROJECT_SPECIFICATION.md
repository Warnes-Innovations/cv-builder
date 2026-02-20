# CV-Builder: Comprehensive Project Specification
## Version 1.0 MVP - February 11, 2026

---

## Executive Summary

**Project**: LLM-Driven CV Generation System  
**Timeline**: 1 week (Feb 11-18, 2026)  
**Owner**: Gregory R. Warnes  
**Status**: Specification Complete - Ready for Implementation

### Mission Statement
Create an AI-powered system that generates customized, professional CVs tailored to specific job descriptions in minutes, not hours.

### Core Value Proposition
> "Ability to generate customized resumes based on job description"

The system analyzes job postings using LLM intelligence, recommends relevant experience and skills, allows user review and editing, then generates both ATS-optimized and human-readable CVs.

---

## 1. Project Scope

### 1.1 In-Scope for v1.0 MVP

#### **Priority #1: CV Editing UI**
- In-browser editing of generated CV content
- Real-time preview of changes
- Ability to tweak selected experiences, skills, achievements
- Save edits before final download

#### **Priority #2: Document Generation**
- **Human-Readable PDF**: Quarto-generated, 2-column layout, styled output
- **ATS-Optimized DOCX**: python-docx generated, single-column, keyword-optimized

#### **Core Workflow** (Already Implemented):
- Job description upload/paste
- LLM semantic analysis (GitHub Models)
- Customization recommendations
- Interactive review tables (DataTables)
- Session persistence

### 1.2 Out of Scope (Phase 2)

**Deferred Features** (ranked #3-#10):
- Cover letter generation
- Interview screening question responses
- Job application tracking
- Google Drive integration
- Analytics and insights
- LinkedIn profile generation
- Mobile application
- Multi-user support+ (single-user MVP)

---

## 2. User Stories & Acceptance Criteria

### US-1: Generate Customized CV from Job Description
**As a** job applicant  
**I want to** paste a job description and get a tailored CV  
**So that** I can apply quickly with relevant, optimized content

**Acceptance Criteria**:
- ✅ System analyzes job description within 10 seconds
- ✅ Presents recommended experiences/skills for review
- ✅ Allows approval/rejection of recommendations
- ✅ Generates both PDF and DOCX formats
- ✅ Downloadable files ready for submission

### US-2: Edit Generated CV Content
**As a** user reviewing my generated CV  
**I want to** make final edits in the application  
**So that** I can perfect the content before downloading

**Acceptance Criteria**:
- ✅ Edit experience descriptions, dates, achievements
- ✅ Add/remove bullet points
- ✅ Reorder sections
- ✅ See live preview of changes
- ✅ Changes persist in session
- ✅ Re-generate documents with edits applied

### US-3: Optimize for ATS Systems
**As a** job applicant  
**I want** my CV to be ATS-parseable  
**So that** it passes automated screening

**Acceptance Criteria**:
- ✅ DOCX format is ATS-compatible (per REQUIREMENTS.md guidelines)
- ✅ Keywords from job description incorporated naturally
- ✅ Clean single-column structure
- ✅ Standard section headings
- ✅ No tables, graphics, or complex formatting in ATS version

### US-4: Create Human-Readable CV
**As a** hiring manager  
**I want** to review a visually appealing CV  
**So that** I can quickly assess candidate qualifications

**Acceptance Criteria**:
- ✅ PDF format preserves 2-column layout from existing HTML CV
- ✅ Professional styling with proper typography
- ✅ Multi-page support with intelligent page breaks
- ✅ Consistent branding and visual hierarchy

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User (Web Browser)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Flask Web Server (Local)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  web_app.py - API endpoints                          │  │
│  │  - /api/chat (LLM interaction)                       │  │
│  │  - /api/analyze (job description)                    │  │
│  │  - /api/recommend (customizations)                   │  │
│  │  - /api/generate (CV files)                          │  │
│  │  - /api/edit (CV content updates)           [NEW]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  conversation_manager.py - State & workflow          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  cv_orchestrator.py - Content selection & generation │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  llm_client.py - GitHub Models, OpenAI, Anthropic    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Document Generation Layer          [NEW]        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  quarto_generator.py                                 │  │
│  │  - Generate .qmd from cv_data.json                   │  │
│  │  - Call quarto render → HTML + PDF                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  docx_generator.py                                   │  │
│  │  - Generate ATS DOCX via python-docx                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data & Storage Layer                        │
│  - ~/CV/Master_CV_Data.json (source data)                  │
│  - ~/CV/publications.bib (publications)                     │
│  - ./files/sessions/ (conversation history)                 │
│  - ./files/{company}_{role}_{date}/ (generated CVs)         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component Details

#### 3.2.1 Frontend (web/index.html)
- **Technology**: Vanilla JavaScript + DataTables
- **State Management**: LocalStorage for session persistence
- **New Components**: CV Editor UI (WYSIWYG-style content editing)
- **Navigation**: Tabbed interface (Job, Analysis, Customizations, Editor, Generated)

#### 3.2.2 Backend (Flask Python)
**Existing**:
- `web_app.py` - HTTP server and API routes  
- `conversation_manager.py` - Conversational workflow
- `cv_orchestrator.py` - Content selection logic
- `llm_client.py` - LLM abstraction
- `scoring.py` - Relevance calculations

**New/Enhanced**:
- `quarto_generator.py` - Quarto template generation
- `docx_generator.py` - ATS DOCX generation
- `cv_editor.py` - Edit API and validation
- Enhanced `cv_orchestrator.generate_cv()` method

#### 3.2.3 Document Templates
**Quarto Template** (`templates/cv_template.qmd`):
- Based on sng-dnra pattern
- Parameterized YAML header
- 2-column CSS Grid layout
- Page-break management
- Print media queries

**CSS** (`templates/cv_styles.css`):
- Extracted from existing HTML CV
- `@media print` rules
- `page-break-inside: avoid` for job entries
- Multi-page flow support

#### 3.2.4 LLM Integration
- **Primary**: GitHub Models (gpt-4o via Copilot)
- **Fallback**: OpenAI, Anthropic (if configured)
- **Timeout**: 30 seconds per LLM call
- **Retry**: 3 attempts with exponential backoff

### 3.3 Data Flow

#### Generate CV Workflow:
```
1. User pastes job description → Frontend
2. POST /api/analyze → Backend
3. LLM analyzes job → Job keywords, requirements, domain
4. GET /api/recommend → Backend
5. LLM recommends experiences/skills → Ranked list
6. User reviews in DataTables → Approve/reject items
7. POST /api/review-decisions → Backend saves choices
8. [NEW] User edits content → POST /api/edit
9. POST /api/generate → Backend
10. cv_orchestrator.select_content() → Filtered cv_data.json
11. quarto_generator.render() → PDF
12. docx_generator.generate() → DOCX
13. Return file paths → Frontend shows download links
```

---

## 4. Implementation Plan

### 4.1 Phase 1: CV Editing UI (Priority #1) - 2 days

#### Day 1: Editor Interface
**Tasks**:
- [ ] Add "Edit CV" tab after "Customizations" in UI
- [ ] Create editable form fields for each CV section:
  - Personal info (read-only display, edit in JSON)
  - Professional summary (textarea, 500 char limit)
  - Experience entries (collapsible cards)
    - Title, company, dates (text inputs)
    - Achievements (bullet list, add/remove/reorder)
  - Skills (chips with add/remove)
  - Education, Awards (simple lists)
- [ ] Live preview pane (HTML render of current edits)
- [ ] "Save Draft" button (persist to session)
- [ ] "Reset to LLM Recommendations" button

**Acceptance**: Can edit all CV sections, changes persist in session

#### Day 2: Editor Backend + Integration
**Tasks**:
- [ ] `POST /api/edit` endpoint
  - Accepts edited cv_data JSON
  - Validates structure and required fields
  - Saves to session state
  - Returns validation errors if any
- [ ] Update `cv_orchestrator.generate_cv()` to use edited data
- [ ] Add edit history tracking (for undo/redo - optional)
- [ ] Frontend-backend integration
- [ ] Testing: Edit → Generate → Verify edits in PDF/DOCX

**Acceptance**: Edits flow through to generated documents

### 4.2 Phase 2: Quarto PDF Generation (Priority #2a) - 1.5 days

#### Day 3 Morning: Template Creation
**Tasks**:
- [ ] Create `templates/cv_template.qmd`
  - YAML header with parameters
  - 2-column layout: sidebar (30%) + main (70%)
  - Sidebar: Contact, Education, Skills
  - Main: Summary, Experience, Awards
- [ ] Create `templates/cv_styles.css`
  - Extract from existing HTML CV
  - Page-break rules
  - Print media queries
  - Multi-page sidebar/main flow
- [ ] Test Quarto render manually with sample data

**Acceptance**: Quarto template renders PDF matching existing HTML CV style

#### Day 3 Afternoon + Day 4 Morning: Python Integration
**Tasks**:
- [ ] Create `scripts/utils/quarto_generator.py`
  - `generate_qmd(cv_data, output_dir)` - Creates .qmd file
  - `render_pdf(qmd_file)` - Calls `quarto render`
  - Error handling and logging
- [ ] Update `cv_orchestrator.generate_cv()` to call quarto_generator
- [ ] Handle Quarto installation check
- [ ] Test end-to-end: Job → Customizations → Generate PDF

**Acceptance**: PDF generated via Quarto, downloadable from UI

### 4.3 Phase 3: DOCX ATS Generation (Priority #2b) - 1 day

#### Day 4 Afternoon: ATS DOCX Implementation
**Tasks**:
- [ ] Create `scripts/utils/docx_generator.py`
  - `generate_ats_docx(cv_data, output_path)`
  - Single-column layout, standard headings
  - Apply ATS guidelines from REQUIREMENTS.md:
    - No tables/columns
    - Simple bullet points only
    - Standard fonts (Calibri 11pt)
    - Keywords from job description
  - Section order: Contact, Summary, Experience, Skills, Education
- [ ] Integrate with `cv_orchestrator.generate_cv()`
- [ ] Test ATS compliance manually

**Acceptance**: DOCX file passes ATS validator (online tool), downloads successfully

### 4.4 Phase 4: Testing & Polish - 1.5 days

#### Day 5: Integration Testing
**Tasks**:
- [ ] End-to-end workflow testing:
  - Multiple job descriptions
  - Different CV configurations
  - Edit → regenerate cycles
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Error handling and user feedback
- [ ] Loading indicators during generation
- [ ] File size validation (<5MB)

#### Day 6 Morning: Documentation & Deployment
**Tasks**:
- [ ] Update README.md with:
  - New features (editing, generation)
  - Quarto installation instructions
  - Usage examples
- [ ] Create USER_GUIDE.md:
  - Step-by-step CV generation workflow  
  - Editor usage tips
  - Troubleshooting common issues
- [ ] Final testing on clean environment
- [ ] Tag v1.0 release

**Acceptance**: Documentation complete, system working end-to-end

### 4.5 Phase 5: Buffer & Launch - 0.5 days

#### Day 6 Afternoon: Final Polish
- [ ] Address any discovered bugs
- [ ] Performance optimization if needed
- [ ] **Go-live decision**: Ready for real-world use

---

## 5. Technical Specifications

### 5.1 CV Editing API

#### `POST /api/edit`
**Request**:
```json
{
  "cv_data": {
    "personal_info": {...},
    "summary": "...",
    "experiences": [
      {
        "id": "exp_001",
        "title": "Principal Data Scientist",
        "company": "Torqata",
        "start_date": "2018-01",
        "end_date": "2020-12",
        "achievements": [
          "Invented ML methodology...",
          "..."
        ]
      }
    ],
    "skills": [...],
    ...
  }
}
```

**Response** (Success):
```json
{
  "status": "success",
  "message": "CV data updated",
  "validation": {
    "errors": [],
    "warnings": ["Experience exp_002 missing end_date"]
  }
}
```

**Response** (Error):
```json
{
  "status": "error",
  "message": "Validation failed",
  "validation": {
    "errors": [
      {"field": "experiences[0].title", "message": "Title is required"}
    ]
  }
}
```

### 5.2 Quarto Template Structure

#### YAML Header
```yaml
---
title: "{{personal_info.name}}"
subtitle: "{{job_info.title}}"
format:
  pdf:
    template: cv-template.html
    css: cv-styles.css
    pdf-engine: chrome
    margin-top: 0.5in
    margin-bottom: 0.5in
    margin-left: 0.75in
    margin-right: 0.75in
params:
  personal_info:
    name: "Gregory R. Warnes"
    title: "Senior Bioinformatics & ML Scientist"
    email: "greg@warnes.net"
    ...
  experiences: [...]
  skills: [...]
  ...
---
```

#### Document Structure
```markdown
<!-- Sidebar (30% width) -->
::: {.sidebar}
## Contact
{{personal_info.email}}
{{personal_info.phone}}

## Education
{{#each education}}
### {{degree}}
{{institution}}, {{year}}
{{/each}}

## Skills
{{#each skills}}
- {{name}}
{{/each}}
:::

<!-- Main Content (70% width) -->
::: {.main-content}
## Professional Summary
{{summary}}

## Experience
{{#each experiences}}
### {{title}} | {{company}}
*{{start_date}} - {{end_date}}*

{{#each achievements}}
- {{this}}
{{/each}}
{{/each}}
:::
```

### 5.3 ATS DOCX Structure

#### Section Order & Formatting
```python
from docx import Document
from docx.shared import Pt, Inches

doc = Document()

# Contact Information (no header/footer)
doc.add_paragraph(f"{name}\n{city}, {state} | {phone} | {email}")

# Professional Summary
doc.add_heading('Professional Summary', level=1)
doc.add_paragraph(summary_text)

# Work Experience
doc.add_heading('Work Experience', level=1)
for exp in experiences:
    # Job header (bold)
    p = doc.add_paragraph()
    p.add_run(f"{exp.title} | {exp.company}").bold = True
    p.add_run(f"\n{exp.location} | {exp.start_date} – {exp.end_date}")
    
    # Achievements (bullets)
    for achievement in exp.achievements:
        doc.add_paragraph(achievement, style='List Bullet')

# Technical Skills
doc.add_heading('Technical Skills', level=1)
skill_text = ', '.join([s.name for s in skills])
doc.add_paragraph(skill_text)

# Education
doc.add_heading('Education', level=1)
# ...

# Save
doc.save(output_path)
```

#### ATS Compliance Checklist
- ✅ Single column layout (no tables)
- ✅ Standard headings ("Work Experience", not "My Journey")
- ✅ Calibri or Arial font, 10-12pt
- ✅ Simple bullet points (•) only
- ✅ Dates in consistent format: "01/2020 – 12/2022"
- ✅ Keywords from job description naturally incorporated
- ✅ No graphics, images, or special characters
- ✅ No headers/footers with content
- ✅ File size <5MB

---

## 6. Success Metrics

### 6.1 MVP Success Criteria (1 Week)

#### **Must Have** (Launch Blockers):
- ✅ Can generate customized CV from job description in <5 minutes
- ✅ PDF output matches existing HTML CV styling
- ✅ DOCX output passes ATS validator online tool
- ✅ Edit functionality works for all CV sections
- ✅ Edits persist and flow to generated documents
- ✅ No data loss (session persistence working)

#### **Should Have** (High Priority):
- ✅ Loading indicators during LLM/generation
- ✅ Error messages are clear and actionable
- ✅ Downloads work in all major browsers
- ✅ README and USER_GUIDE complete

#### **Nice to Have** (Optional):
- ⭕ Keyboard shortcuts for editor
- ⭕ Drag-and-drop reordering in editor
- ⭕ Export session data (JSON download)

### 6.2 Quality Gates

**Before Launch Checklist**:
- [ ] Generate 3 different CVs with real job descriptions
- [ ] Test edit → regenerate → verify changes (3 times)
- [ ] Upload DOCX to 3 ATS testing websites
- [ ] Print PDF and verify visual quality
- [ ] Test in Chrome, Firefox, Safari
- [ ] Verify session persistence across browser restarts
- [ ] Check file sizes (<5MB for PDF, <1MB for DOCX)
- [ ] Review generated CVs for accuracy (no hallucinations)
- [ ] Confirm Loading states don't time out
- [ ] Documentation reviewed and accurate

---

## 7. Risk Management

### 7.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Quarto not installed or incompatible version | High | Pre-flight check, clear install instructions, fallback error message |
| LLM API rate limits or timeouts | Medium | Implement retries, fallback to simpler prompts, cache responses |
| PDF rendering issues (fonts, page breaks) | Medium | Test on multiple examples early, iterate on CSS |
| Browser compatibility (edit UI) | Low | Stick to vanilla JS, test in top 3 browsers |
| File size too large (>5MB) | Low | Compress images, optimize CSS, validate before download |

### 7.2 Schedule Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Quarto template complexity underestimated | Medium | High | Allocate buffer time (0.5 days), start simple then enhance |
| Editor UI takes longer than 2 days | Medium | Medium | Build minimal editor first (text fields only), enhance if time |
| Testing reveals major bugs | Medium | High | Test continuously, don't wait until Day 5 |
| Quarto installation issues on user machine | Low | Medium | Document dependencies clearly, test on clean env |

### 7.3 Scope Risks

**Scope Creep Prevention**:
- ✅ All Phase 2 features formally deferred (documented in this spec)
- ✅ No new features during implementation week
- ✅ Focus on "must have" success criteria only
- ✅ "Nice to have" items explicitly marked as optional

---

## 8. Dependencies & Prerequisites

### 8.1 Software Dependencies

**Already Installed**:
- Python 3.9+ with conda environment
- Flask web server
- LLM client libraries (openai, anthropic)
- DataTables, jQuery (CDN)

**Need to Install**:
- **Quarto**: Download from https://quarto.org/docs/get-started/
  - Version: 1.4+ recommended
  - Includes built-in Chromium for PDF generation
- **python-docx**: `pip install python-docx`
  - Version: 0.8.11+

**Optional** (for development):
- **Black** (code formatting): `pip install black`
- **Pytest** (testing): `pip install pytest`

### 8.2 Data Prerequisites

**Required Files**:
- ✅ `~/CV/Master_CV_Data.json` - Master CV data (already exists)
- ✅ `~/CV/publications.bib` - Publications (already exists)
- ✅ `.env` file with LLM API keys (already configured)

**Directory Structure**:
```
~/CV/
├── Master_CV_Data.json
├── publications.bib
└── files/
    ├── sessions/
    └── [generated CVs]/

/Users/warnes/src/cv-builder/
├── .env
├── config.yaml
├── scripts/
│   ├── web_app.py
│   └── utils/
│       ├── quarto_generator.py    [NEW]
│       ├── docx_generator.py      [NEW]
│       └── cv_editor.py           [NEW]
├── templates/                     [NEW]
│   ├── cv_template.qmd
│   ├── cv_styles.css
│   └── cv-template.html
└── web/
    └── index.html (enhanced)
```

---

## 9. Post-MVP Roadmap (Phase 2)

### Priority #3: Cover Letter Generation
- Same workflow as CV generation
- Separate Quarto template  
- Integrate with CV context
- **Estimated**: 2-3 days

### Priority #4: Interview Question Responses
- Parse screening questions
- LLM generates responses based on CV
- Editable text fields
- Export as text/PDF
- **Estimated**: 2-3 days

### Priority #5: Job Application Tracking
- Track submitted applications
- Link CV versions to jobs
- Status tracking (applied, interview, rejected, offer)
- SQLite database
- **Estimated**: 3-4 days

### Lower Priorities (#6-#10):
- Google Drive integration
- Analytics dashboard
- LinkedIn profile generation
- Mobile-responsive UI
- Multi-user support with authentication

---

## 10. Conclusion

This specification defines a **focused 1-week MVP** that delivers core value: generating customized, professional CVs quickly. By leveraging existing code (LLM analysis, review interface) and the user's Quarto expertise, the implementation is achievable within the timeline.

**Key Success Factors**:
1. ✅ Clear scope (CV editing + document generation only)
2. ✅ Realistic timeline (6 days implementation + buffer)
3. ✅ Leveraging existing patterns (Quarto from sng-dnra)
4. ✅ Deferred complexity (Phase 2 features documented)
5. ✅ Focus on must-have criteria (launch blockers clearly defined)

**Next Steps**:
1. Review and approve this specification
2. Set up development environment (install Quarto)
3. Begin implementation (Day 1: CV Editor UI)
4. Daily progress check-ins
5. Launch on Day 7 (Feb 18, 2026)

---

**Document Version**: 1.0  
**Last Updated**: February 11, 2026  
**Status**: Awaiting Approval  
**Author**: AI Project Manager (GitHub Copilot)
