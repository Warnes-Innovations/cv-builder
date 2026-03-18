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
Four formats are generated per CV run:
- **HTML** (`*.html`): Jinja2 renders `templates/cv-template.html` → self-contained HTML with embedded CSS (2-column layout) and a Schema.org/Person JSON-LD `<script>` block in `<head>` for structured-data ATS parsing. Directly previewable in-browser.
- **PDF** (`*.pdf`): WeasyPrint (primary) / Chrome headless (fallback) converts the rendered HTML → PDF. Fonts embedded, background colours preserved.
- **ATS DOCX** (`*_ATS.docx`): python-docx generated, single-column, plain-text, keyword-optimized per ATS guidelines.
- **Human DOCX** (`*.docx`): docxtpl (Jinja2) renders `templates/cv-template.docx` → Word-native editable DOCX (Calibri, standard margins). Independently styled from the PDF — no visual parity requirement.

#### **Priority #3: ATS Match Score Display**
After job analysis, compute and display a keyword match score comparing the job description's required skills against the candidate's approved skills:
- Overall match percentage (0–100%) shown prominently in the Analysis tab
- Per-skill match status: matched / missing / bonus (candidate has skill not in JD)
- Breakdown by skill type: hard skills vs. soft skills (see §5.x)
- Score recalculates live as the user approves/rejects customization items
- Score included in `metadata.json` for archival

#### **Priority #4: Hard / Soft Skill Classification**
All skills — both those extracted from the job description and those in the candidate's master CV — are classified into two mutually exclusive categories:
- **Hard skills**: Specific, teachable, measurable abilities (programming languages, tools, methodologies, domain knowledge, certifications). Examples: Python, SQL, WeasyPrint, CRISPR, Scrum.
- **Soft skills**: Interpersonal and self-management traits (communication, leadership, adaptability, problem-solving). Examples: Cross-functional collaboration, stakeholder communication, mentoring.

Classification is performed by the LLM during job analysis and applied to both the JD-required skills and the candidate's own skill inventory. The UI surfaces both lists in clearly labelled sections so the user can verify and override.

#### **Core Workflow** (Already Implemented):
- Job description upload/paste
- LLM semantic analysis (GitHub Models)
- Customization recommendations
- Interactive review tables (DataTables)
- Session persistence

### 1.2 Out of Scope (Phase 2)

**Deferred Features**:
- Job application tracking
- ~~Google Drive integration~~ — **dropped** (git-only archiving; no Drive integration planned)
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

### US-5: ATS Match Score Display
**As a** job applicant  
**I want** to see how well my CV matches the target job description  
**So that** I can make informed decisions about which skills and experiences to include

**Acceptance Criteria**:
- Overall match percentage displayed prominently after job analysis
- Score distinguishes hard skill matches from soft skill matches
- Per-skill status shows: matched (in both JD and CV), missing (required by JD but absent from CV), bonus (in CV but not required by JD)
- Score recalculates live whenever the user approves or rejects items in the customization review
- Score is saved to `metadata.json` at generation time
- Score display does not block or delay the rest of the workflow

### US-6: Hard / Soft Skill Classification
**As a** job applicant reviewing my customization options  
**I want** skills categorised as hard or soft  
**So that** I can quickly see which technical gaps exist and which interpersonal strengths to highlight

**Acceptance Criteria**:
- During job analysis the LLM classifies every skill extracted from the JD as hard or soft
- The candidate’s own skills in the master CV are also classified (persisted in `Master_CV_Data.json`)
- The Analysis tab and Customization tab each display skills in two clearly labelled groups: Hard Skills and Soft Skills
- User can override any classification via a toggle in the UI; override is saved to session state
- Classification label (hard/soft) is included in the `knowsAbout` entries of the HTML JSON-LD block
- Missing hard skills are surfaced more prominently than missing soft skills in the match score UI (hard skills are weighted 2× in the overall score calculation)

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
│              Document Generation Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  cv_orchestrator._render_cv_html_pdf()               │  │
│  │  - Render cv_data via Jinja2 → HTML (+ JSON-LD)      │  │
  │  - Write *.html (self-contained, downloadable)      │  │
  │  - WeasyPrint (primary) / Chrome headless (fallback) │  │
  │    converts rendered HTML → *.pdf                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  cv_orchestrator._generate_ats_docx()                │  │
│  │  - Generate *_ATS.docx via python-docx               │  │
│  │  - Single-column, plain-text, keyword-optimized      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Four output files per run:                                  │
│    *.html       (Jinja2 + CSS + Schema.org JSON-LD)         │
│    *.pdf        (WeasyPrint/Chrome from HTML)               │
│    *_ATS.docx   (python-docx, ATS plain-text)               │
│    *.docx       (docxtpl, Word-native human-readable)       │
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
- `template_renderer.py` - Jinja2 template loading and rendering
- `docx_generator.py` - ATS DOCX generation
- `cv_editor.py` - Edit API and validation
- Enhanced `cv_orchestrator.generate_cv()` + `_render_cv_html_pdf()` methods

#### 3.2.3 Document Templates
**Jinja2 HTML Template** (`templates/cv-template.html`):
- Self-contained HTML with embedded CSS
- Jinja2 variable substitution and control structures
- 2-column layout: 32% sidebar + 68% main content
- Page-break management (`page-break-inside: avoid`)
- WeasyPrint-compatible `@media print` rules

**CSS** (`templates/cv-style.css`):
- Extracted from existing HTML CV (linked externally)
- Multi-page sidebar/main flow
- Font Awesome icons, Merriweather/Inter typography

**Human DOCX Template** (`templates/cv-template.docx`):
- Word-native `.docx` file with Jinja2 `{{ variable }}` / `{% for %}` placeholders via `docxtpl`
- Professional defaults: Calibri font, standard margins, ATS-safe layout
- Independently styled from the PDF — no visual parity requirement
- Filled at generation time from the same `cv_data` context as the HTML template

#### 3.2.4 LLM Integration
- **Provider**: Configurable — GitHub Copilot OAuth, OpenAI, Anthropic, Gemini, Groq, or local model. **No built-in default provider** — `llm.default_provider` must be explicitly set in `config.yaml` or passed via `--llm-provider`; the app fails with a clear error on startup if unset.
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
11. template_renderer.render() → HTML via Jinja2 → WeasyPrint → PDF
12. docx_generator.generate() → ATS DOCX (python-docx, plain-text)
12b. cv_orchestrator._generate_human_docx() → Human DOCX (docxtpl, Word-native)
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

### 4.2 Phase 2: Jinja2 HTML PDF Generation (Priority #2a) - 1.5 days

#### Day 3 Morning: Template Creation
**Tasks**:
- [x] Create `templates/cv-template.html`
  - Jinja2 variable substitution and control structures
  - 2-column layout: sidebar (32%) + main (68%)
  - Sidebar: Contact, Education, Skills
  - Main: Summary, Experience, Awards
- [x] Create `templates/cv-style.css`
  - Extracted from existing HTML CV
  - Page-break rules
  - WeasyPrint-compatible print media queries
  - Multi-page sidebar/main flow
- [x] Test render manually with sample data

**Acceptance**: Template renders PDF matching existing HTML CV style ✅

#### Day 3 Afternoon + Day 4 Morning: Python Integration
**Tasks**:
- [x] Create `scripts/utils/template_renderer.py`
  - `load_template(path)` - Loads Jinja2 template
  - `render_template(template, cv_data)` - Renders HTML string
- [x] Implement `cv_orchestrator._render_cv_html_pdf()`
  - Renders HTML via Jinja2, writes `.html` output
  - Converts to PDF via WeasyPrint (Chrome headless fallback)
- [x] Test end-to-end: Job → Customizations → Generate PDF

**Acceptance**: PDF generated via Jinja2 + WeasyPrint, downloadable from UI ✅

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

### 5.2 Jinja2 HTML Template Structure

#### Template File: `templates/cv-template.html`

The template uses standard Jinja2 syntax with the `cv_data` dictionary as context:

```html
<!-- Sidebar (32% width) -->
<div class="sidebar">
  <section class="contact">
    <h2>Contact</h2>
    <p>{{ personal_info.contact.email }}</p>
    <p>{{ personal_info.contact.phone }}</p>
  </section>

  <section class="education">
    <h2>Education</h2>
    {% for edu in education %}
    <div class="edu-entry">
      <strong>{{ edu.degree }}</strong>
      <span>{{ edu.institution }}, {{ edu.end_year }}</span>
    </div>
    {% endfor %}
  </section>

  <section class="skills">
    <h2>Skills</h2>
    {% for category, data in skills.items() %}
    <h3>{{ data.category }}</h3>
    {% for skill in data.skills %}
    <span class="skill-tag">{{ skill.name }}</span>
    {% endfor %}
    {% endfor %}
  </section>
</div>

<!-- Main Content (68% width) -->
<div class="main-content">
  <h2>Professional Summary</h2>
  <p>{{ professional_summary }}</p>

  <h2>Experience</h2>
  {% for exp in experiences %}
  <div class="job-entry">
    <h3>{{ exp.title }} | {{ exp.company }}</h3>
    <span>{{ exp.start_date }} – {{ exp.end_date }}</span>
    <ul>
    {% for ach in exp.achievements %}
      <li>{{ ach.text }}</li>
    {% endfor %}
    </ul>
  </div>
  {% endfor %}
</div>
```

#### PDF Conversion: WeasyPrint (primary) / Chrome headless (fallback)

```python
# In cv_orchestrator._convert_html_to_pdf()
import weasyprint
weasyprint.HTML(filename=str(html_file)).write_pdf(str(pdf_output))
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
- ✅ CV Length (2–3 pages ideal; warn if 1 page or >3 pages; fail if >4 pages)

#### CV Length Validation Rules
Post-generation validation checks page count with the following thresholds (configurable in config.yaml):
- **1 page**: WARN — Too brief for senior candidates; consider expanding with additional experiences or detail
- **2–3 pages**: PASS — Ideal range for senior candidates
- **>3 to 4 pages**: WARN — Exceeds ideal range; consider condensing to fit in 3 pages
- **>4 pages**: FAIL — Exceeds maximum; ATS systems often truncate or reject; strong recommendation to condense before submission

These checks are non-blocking for the user workflow but provide critical quality feedback for ATS compatibility.

---

## 5.x ATS Match Score and Hard/Soft Skill Classification

### 5.x.1 Skill Classification Schema

Every skill object — whether extracted from the JD or from `Master_CV_Data.json` — carries a `skill_type` field:

```json
{
  "name": "Python",
  "skill_type": "hard",
  "source": "jd",
  "match_status": "matched"
}
```

| Field | Values | Notes |
|-------|--------|-------|
| `skill_type` | `"hard"` \| `"soft"` | Set by LLM during analysis; overridable by user |
| `source` | `"jd"` \| `"cv"` \| `"both"` | Where the skill was found |
| `match_status` | `"matched"` \| `"missing"` \| `"bonus"` | Relative to the JD requirements |

**Classification rules applied by the LLM prompt:**
- Hard skill: Any specific tool, language, framework, methodology, certification, domain technique, or quantifiable technical ability.
- Soft skill: Any interpersonal, communication, leadership, or self-management trait. These are not tools or measurable technical competencies.
- When ambiguous (e.g. "project management"), classify as hard if a certification or tool is implied (PMP, Jira) and soft if the trait is behavioural.

### 5.x.2 ATS Match Score Calculation

```
hard_matched  = count of hard skills with match_status == "matched"
hard_required = count of hard skills extracted from JD
soft_matched  = count of soft skills with match_status == "matched"
soft_required = count of soft skills extracted from JD

hard_score = hard_matched / max(hard_required, 1)   # 0.0–1.0
soft_score = soft_matched / max(soft_required, 1)   # 0.0–1.0

overall_score = round((2 * hard_score + soft_score) / 3 * 100)  # weighted: hard 2×, soft 1×
```

Displayed as:
- **Overall match: 78%** (large, prominent)
- Hard skills: 8 / 10 matched (80%)
- Soft skills: 3 / 5 matched (60%)

### 5.x.3 Live Score Recalculation

The score is recalculated in the browser (no round-trip to the server) whenever:
- A skill is approved or rejected in the Customization review table
- A user adds an extra skill via the free-text skill entry
- A user overrides a hard/soft classification

The score widget updates immediately using the current `skillDecisions` state from `state-manager.js`.

### 5.x.4 API Changes

**Enhanced `GET /api/status` response** — `job_analysis.skills` array gains `skill_type` and `match_status` per skill:
```json
{
  "job_analysis": {
    "skills": [
      {"name": "Python", "skill_type": "hard", "match_status": "matched"},
      {"name": "Communication", "skill_type": "soft", "match_status": "missing"}
    ],
    "ats_match_score": {
      "overall": 78,
      "hard": {"matched": 8, "required": 10, "score": 80},
      "soft": {"matched": 3, "required": 5, "score": 60}
    }
  }
}
```

**`metadata.json` addition** — `ats_match_score` block saved at generation time.

### 5.x.5 UI Placement

| Tab | New element |
|-----|-------------|
| Analysis | Match score widget below job summary; hard/soft skill lists side-by-side |
| Customization | Skills DataTable gains a "Type" column (Hard / Soft badge) and a "Status" column (Matched / Missing / Bonus badge); missing hard skills sorted to top |
| Generation summary | Final score shown alongside file download links |

---

### 5.x.6 Persuasion Quality Checks (GAP-09)

Three warn-level quality checks run automatically during rewrite generation and before any bullet is presented for review. They surface issues for user decision — they never hard-block generation.

#### Action Verb Validation (US-M2, US-P4)

Every proposed bullet must begin with a verb from the `strong_action_verbs` list in `config.yaml`. If a bullet begins with a weak, passive, or absent verb:

- `conversation_manager.py` logs a warning (implemented at line 892).
- The rewrite card displays a `⚠ Weak action verb` badge alongside the proposal.
- The user may still accept the bullet as-is; the badge is advisory only.

Implementation: `LLMClient.check_strong_action_verb()` (`llm_client.py` line 366) runs per-bullet and returns `{is_strong: bool, detected_verb: str}`.

#### Filler Phrase Detection (US-P3, US-P4)

Summaries and bullet points are scanned for weak/passive constructions before presentation. Phrases flagged (case-insensitive):

> "results-driven", "responsible for", "helped to", "assisted with", "was involved in", "passionate about", "team player", "detail-oriented"

- If >1 filler phrase in a summary, an amber `⚠ Generic language` badge appears on the summary card.
- If a bullet contains a passive construction ("was involved in", "responsible for"), the rewrite card is pre-flagged to draw user attention.

The full phrase list is maintained in `config.yaml` under `persuasion_checks.weak_phrases`.

#### CAR Structure Detection (US-P3)

If a bullet already contains challenge language (e.g., "Despite", "When faced with", "After X failed"), the LLM prompt includes an instruction to restructure as **Challenge → Action → Result**. The rewrite card indicates the CAR restructuring intent in the rationale.

---

### 5.x.7 Weak-Evidence Skill Marking in Generated Output (GAP-12)

When a user accepts a `skill_add` rewrite proposal that was flagged `evidence_strength = "weak"` (shown with the `⚠ Candidate to confirm` badge during review), the generated output handles the skill as follows:

**Decision:** Mark in HTML/PDF output; omit mark in ATS DOCX output.

| Output format | Treatment |
| --- | --- |
| HTML / PDF | Skill name followed by `*`; footnote at page bottom: `* Candidate to confirm in interview` |
| ATS DOCX | Skill name only, no mark (clean for ATS parsing) |

This ensures the candidate is reminded to be prepared to discuss the skill in interview, while the ATS DOCX remains uncluttered for machine parsing.

**Implementation notes:**

- The `weak_evidence` flag on accepted skills is stored in session rewrite decisions.
- The HTML Jinja2 template adds the `*` annotation and footnote block when `skill.weak_evidence == true`.
- The ATS DOCX template omits the annotation.
- This behaviour is specced here to disambiguate from the rewrite-review badge (which is UI-only, not in generated output).

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
- [ ] ATS match score displayed after job analysis (US-5)
- [ ] Skills split into Hard / Soft groups in Analysis and Customization tabs (US-6)
- [ ] Per-skill matched/missing/bonus status visible in score UI
- [ ] Score recalculates live on approve/reject decisions
- [ ] Hard/soft classification overridable by user

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

## 7. Workflow & User Experience

### 7.1 Rewrite Review Card Interface

The Rewrite Review Card Interface enables users to systematically review and approve/modify all LLM-proposed text rewrites before finalizing the CV. This phase occurs after content customisations have been confirmed but before spell-check and document generation.

#### Overview

Users encounter a paginated or scrollable set of individual **rewrite cards**, one for each proposed bullet point enhancement. Each card displays:
1. The original text (what the system learned from Master CV data)
2. The proposed rewrite (LLM-generated enhancement)
3. Keywords introduced (with rank numbers showing priority)
4. Weak-evidence flagging (⚠) if the skill recommendation had low confidence
5. Collapsible rationale explaining why the rewrite was proposed
6. Three action buttons: **Accept | Edit | Reject**

A **sticky summary bar** at the top tracks decision progress and blocks submission until all cards are actioned.

#### Card Layout & Components

**Sticky Summary Bar** (sticky position, always visible at top)
- **Format**: `✓ Accepted: N | ✗ Rejected: N | ⏳ Pending: N` [blue submit button]
- **Height**: 70px with padding
- **Background**: White with bottom border (2px solid #e2e8f0)
- **Submit Button State**:
  - **Enabled** (blue #3b82f6): when pending count = 0
  - **Disabled** (gray, 45% opacity): when any card is still pending

**Individual Rewrite Card Layout** (one card per proposal):

```
┌─────────────────────────────────────────────────────────────────┐
│ [TYPE BADGE] [LOCATION TITLE]                  [⚠ IF WEAK]     │ Header
├─────────────────────────────────────────────────────────────────┤
│ BEFORE:     <original text with strikethrough formatting>       │
│ PROPOSED:   <new text with green highlight formatting>          │ Inline Diff
│                                                                 │
│ Keywords Introduced: [#1 Keyword1] [#2 Keyword2] [...]         │
│                                                                 │
│ <details>                                                       │
│  <summary>Rationale & Evidence</summary>                        │
│  <p>LLM explanation of why this rewrite strengthens the CV      │ Collapsible
│  narrative...</p>                                               │ Rationale
│  <p style="color:#9ca3af;font-size:0.85em;">                   │
│   Evidence citation (e.g., "from job_analysis.keywords")       │
│  </p>                                                           │
│ </details>                                                      │
│                                                                 │
│ [✓ Accept]  [✎ Edit]  [✗ Reject]                         Actions │
└─────────────────────────────────────────────────────────────────┘
```

#### Visual Styling

**Card States** (border and background colors):
- **Default** (pending): Light gray border (#e2e8f0), light blue background (#f8fafc)
- **Accepted** (user clicked Accept): Green border (#10b981), light green background (#f0fdf4)
- **Rejected** (user clicked Reject): Light red background (#fef2f2), 70% opacity (dimmed)
- **Edited** (user saved an edit): Same as Accepted (green styling)

**Type Badge** (e.g., "SKILL ADD", "BULLET REWRITE")
- Font: 11px bold, uppercase
- Color: Dark slate (#64748b)
- Background: Light gray (#e2e8f0)
- Padding: 2px 8px | Border-radius: 12px

**Weak-Evidence Badge** (appears if evidence_strength='weak')
- Text: `⚠ Candidate to confirm`
- Color: Dark amber (#92400e)
- Background: Light amber (#fef3c7)
- Font: 11px bold
- Padding: 2px 8px | Border-radius: 12px

**Inline Diff Formatting**:
- **Removed text** (`<del>` tags):
  - Strikethrough (text-decoration: line-through)
  - Color: Red (#dc2626)
  - Background: Light red (#fee2e2)
  - Padding: 0–2px with 2px border-radius

- **Added text** (`<ins>` tags):
  - No strikethrough
  - Color: Dark green (#166534)
  - Background: Light green (#dcfce7)
  - Padding: 0–2px with 2px border-radius

**Keyword Pills**:
- Background: Light blue (#dbeafe)
- Text Color: Dark blue (#1e40af)
- Font: 11px bold with rank number badge
- **Rank Number Styling**: Dark blue background (#1e40af), white text, 8px border-radius, 10px font
- Format: `[#1 Keyword1] [#2 Keyword2]` etc., with 4px gap between pills

**Action Buttons** (Accept, Edit, Reject):
- Font: 13px bold
- Padding: 5px 14px
- Border: 1px solid #d1d5db
- Border-radius: 6px
- Transition: all 0.15s
- **Default State** (pending): White background with colored border matching action
- **Active/Clicked State** (user has taken action):
  - Accept: Green background (#10b981), white text
  - Edit: Blue background (#2563eb), white text
  - Reject: Red background (#dc2626), white text

**Rationale Section** (HTML `<details>` element):
- Default: Collapsed (user clicks "Rationale & Evidence" to expand)
- On expand: Shows LLM explanation paragraph + evidence citation (smaller, gray text)
- Font: 13px for explanation, 11px gray (#9ca3af) for citation

#### User Interaction Flows

**ACCEPT Flow**:
1. User clicks **✓ Accept** button
2. Card immediately turns green (border #10b981, background #f0fdf4)
3. Button gets `.active` styling (green background, white text)
4. Decision recorded: `{ outcome: 'accept', final_text: null }`
5. Tally bar updates: pending count -1, accepted count +1
6. If all cards now have actions, Submit button becomes enabled

**EDIT Flow**:
1. User clicks **✎ Edit** button
2. Inline diff section is hidden
3. Textarea appears: width 100%, min-height 60px, pre-filled with the proposed text (not original)
4. Outline: 1px solid #10b981 (green)
5. User edits the text and clicks **Save** button
6. System computes word-level diff (LCS algorithm) comparing original vs. edited text
7. New inline diff is displayed (showing edits the user made relative to the original)
8. Card turns green (treated as approved/accepted)
9. Button gets `.active` styling
10. Decision recorded: `{ outcome: 'edit', final_text: userEditedText }`
11. Pending count -1, accepted count +1; tally bar updates

**REJECT Flow**:
1. User clicks **✗ Reject** button
2. Card turns light red/dimmed (background #fef2f2, opacity 0.7)
3. Button gets `.active` styling (red background #dc2626, white text)
4. Decision recorded: `{ outcome: 'reject', final_text: null }`
5. Tally bar updates: pending count -1, rejected count +1
6. Rejected rewrites are excluded from final CV generation

**SUBMIT ALL Flow**:
1. User clicks **Submit All Decisions** button (only enabled when pending = 0)
2. System collects all decisions from cards: `{ id, outcome, final_text }`
3. POST to `/api/rewrites/approve` with payload:
   ```json
   {
     "decisions": [
       { "id": "rwid_1", "outcome": "accept", "final_text": null },
       { "id": "rwid_2", "outcome": "edit", "final_text": "user edited text here" },
       { "id": "rwid_3", "outcome": "reject", "final_text": null }
     ]
   }
   ```
4. Backend applies approved rewrites (including user edits) to CV data
5. Route advances to **Spell Check** phase
6. Rewrite audit logged to session state for metadata

#### User Story Alignment

This interface fully satisfies **US-A4** (Rewrite Review) acceptance criteria:

| Criterion | Implementation |
|-----------|-----------------|
| Before/after diff visible | ✅ Word-level LCS diff with color-coded `<del>` and `<ins>` tags |
| Weak-evidence flagging | ✅ Amber `⚠ Candidate to confirm` badge; cannot be silently accepted |
| Edited text used in CV | ✅ `final_text` from edit flow sent to backend; original LLM proposal discarded |
| Submit blocked until complete | ✅ Button disabled while `pending > 0`; enabled only when all cards actioned |
| Audit persisted | ✅ All decisions + outcomes sent to `/api/rewrites/approve` and logged |

#### Implementation Reference

- **Frontend**: `/Users/warnes/src/cv-builder/web/app.js` lines 4702–4983
  - `renderRewritePanel()` — Panel container (lines 4702–4757)
  - `renderRewriteCard()` — Individual card HTML (lines 4813–4858)
  - `applyRewriteAction()` — User interaction handler (lines 4860–4902)
  - `updateRewriteTally()` — Tally bar updates (lines 4931–4948)

- **Styling**: `/Users/warnes/src/cv-builder/web/styles.css` lines 615–649
  - `.rewrite-tally-bar` — Sticky summary bar
  - `.rewrite-card`, `.accepted`, `.rejected` — Card state styles
  - `.rewrite-inline-diff`, `<del>`, `<ins>` — Diff formatting
  - `.rewrite-keyword`, `.rewrite-rationale` — Component styles

### 7.2 Job Input and URL Ingestion UX (US-U2)

**Scope:** Job Input step — URL fetch and paste-text input paths.

**Acceptance Criteria:**

- URL and paste-text modes are clearly delineated as separate, equal-weight options (tabs or labelled panels); the active mode state is visually obvious.
- Protected-site detection (LinkedIn, Indeed, Glassdoor) triggers an inline, contextual copy-paste instruction naming the specific site — not a generic "fetch failed" error.
- A fetch loading state (spinner or progress bar) appears **within 300 ms** of URL submission.
- Extracted fields (company name, role title, date) are inline-editable at the confirmation UI; editing does not restart the workflow.
- Paste text area shows a minimum character guidance hint.

**Failure modes to guard against:**

- URL and text area presented simultaneously with no clear hierarchy.
- Raw status code or generic error on protected-site fetch failure.
- Fetch taking >3 s with no visible progress indicator.
- Correcting an extracted field requires restarting the step.

---

### 7.3 Analysis Results Readability (US-U3)

**Scope:** Analysis results display — how LLM output is presented to the user.

**Acceptance Criteria:**

- Analysis result has **at minimum 4 visually distinct sections**: required quals, preferred quals, keywords, and role/domain inference.
- Keywords displayed with a visual rank signal (ordered list with rank numbers, badge, or font-weight differentiation) — not a flat comma-separated list.
- Mismatch callouts (skills required by JD but absent from master CV) visible **above the fold**. If >3 mismatches, a summary count appears above the fold with expandable detail below.
- Clarifying questions presented in logical groups of ≤3 per screen; each group is answered and confirmed before the next group appears.
- Loading state for analysis includes a descriptive label (e.g., "Analysing job description against your CV…") and an estimated duration indicator.

**Failure modes to guard against:**

- Full analysis output as a single scrolling prose block.
- Keywords listed alphabetically with no rank differentiation.
- Mismatch callouts placed below the fold with no above-fold summary.
- All clarifying questions presented simultaneously as a long form.

---

### 7.4 Review Table Interaction Quality (US-U4)

**Scope:** Experience, Achievement, and Skills review tables in the Customisation phase.

**Acceptance Criteria:**

- Accept/reject state is legible from ≥60 cm viewing distance (sufficient contrast and size; icon buttons with active states, not small checkboxes).
- Reorder controls (up/down or drag handle) are **visible without hover**; keyboard navigation is supported (arrow keys or keyboard shortcut to reorder).
- Bullet/row expansion is **in-place** (no page navigation away); smooth expand animation. Scroll position is preserved on expand/collapse.
- Relevance scores labelled with scale (e.g., "Relevance: 92 / 100") or letter grade with legend — never a raw 0–1 float.
- **Bulk accept/reject controls** present when table row count > 8.
- Tables show enough content per row (title, company, date, first bullet excerpt) to make a decision without expanding every row.

**Failure modes to guard against:**

- Small checkboxes as accept/reject with no visual state change.
- Reorder controls only visible on hover (inaccessible, undiscoverable).
- Row expansion navigates away and resets scroll position.
- No bulk controls on large skill tables (30+ entries).

---

### 7.5 Rewrite Review Presentation (US-U5)

**Scope:** Proposed rewrite review step — how individual rewrite proposals are presented.

**Acceptance Criteria:**

- All rewrite proposals display **inline diff**: red/strikethrough for removals, green for additions, unchanged text intact. Side-by-side "before box / after box" without character-level diff highlighting is not acceptable.
- Accept, Reject, and Edit controls appear **within the same card as the diff** — not in a separate panel.
- LLM rewrite reason is visible within one click or hover (not a full modal navigation).
- Edit mode allows free-text editing of the proposed text and **preserves the original for comparison** during editing. Editing does not require accepting the LLM version first.
- A sequential navigation control ("Approve & Next" or equivalent) is present when more than 3 rewrites exist.

**Failure modes to guard against:**

- Side-by-side text boxes requiring cognitive comparison with no visual diff highlighting.
- Accept/Reject buttons separated from the text they govern (scroll required to act).
- No way to edit the proposed text — only accept as-is or reject entirely.
- Rationale completely hidden behind a full modal navigation.

---

### 7.6 Generation and Output State Feedback (US-U6)

**Scope:** Document generation step — progress feedback and output presentation.

**Acceptance Criteria:**

- Generation progress is **step-labelled**; each completed step (HTML render → PDF conversion → ATS DOCX) shows a checkmark before the next begins. A spinner alone with no step labels is not acceptable.
- Generated CV rendered **inline** (iframe or embedded PDF viewer) with a prominently placed download button alongside.
- Download filename follows the `CV_{Company}_{Role}_{Date}` convention (ATS DOCX adds `_ATS` suffix).
- Generation error surfaces a **user-readable message** explaining what failed, with at least one fallback or recovery action (e.g., "Download HTML instead").
- When multiple generated versions exist in a session, they are listed with timestamps and a "current" label on the most recent.

**Output filename format:**
```
{Surname}-{Role}-{Company}-{YYYY-MM-DD}.pdf
{Surname}-{Role}-{Company}-{YYYY-MM-DD}_ATS.docx
```

**Failure modes to guard against:**

- Spinner running >10 s with no step labels or progress indication.
- Generated output accessible only via raw file path link, not in-browser preview.
- Generic filename (`cv_output.pdf`) with no job or date context.
- Raw stack trace or `500 Internal Server Error` shown to user on generation failure.
- Multiple prior versions not distinguished; user downloads an old version accidentally.

---

### 7.7 Accessibility Requirements (US-U7)

**Scope:** Accessibility baseline — all interactive elements across the web UI.

**Acceptance Criteria:**

- All interactive elements have a **visible, styled focus indicator**. The global `outline: none` CSS rule is prohibited; if default outlines are removed, a styled replacement ring must be provided.
- Modal dialogs **trap focus** while open (Tab/Shift-Tab cycle within the modal) and restore focus to the opener element on close.
- All icon-only controls (up/down reorder arrows, ✕ close buttons, action icons) have `aria-label` or `title` attributes with descriptive text.
- Accept/reject status communicated by **both colour and a text label or icon** — not colour alone.
- Tab order is logical and matches visual reading order; no interactive elements are skipped.
- Form validation errors associated with their input via `aria-describedby` and announced to screen readers on appearance.

**Failure modes to guard against:**

- `outline: none` applied globally with no styled replacement focus ring.
- Modal opened without moving focus inside it.
- Icon-only buttons with no tooltip or ARIA label.
- Status distinguishable only by background colour (green/red) with no accompanying label.

---

### 7.8 Responsive Behaviour and Loading Performance (US-U8)

**Scope:** Minimum viable layout and performance at 1280 × 800.

**Acceptance Criteria:**

- Core workflow is **fully operable at 1280 × 800** without horizontal scrolling. Review tables may scroll horizontally within a defined container, but the page structure must not break.
- Lower-priority table columns (internal IDs, raw score floats) are **hidden or collapsed** at viewport widths ≤1400 px. Column collapse behaviour is documented in component config.
- Application shell (HTML + CSS + base JS) renders in **≤2 s on localhost** with no external blocking resources.
- Async content areas have **skeleton placeholders** that match the approximate dimensions of the arriving content, preventing layout shift on LLM response arrival.
- Tables with 20+ rows (skills table) must not exhibit scroll jank.

**Failure modes to guard against:**

- Review table overflows viewport horizontally at 1280 × 800 causing full-page horizontal scroll.
- Page blank-whites for >2 s on first load.
- Content areas collapsing to zero height and jumping on LLM response arrival.

---

## 8. Risk Management

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
| HTML template layout issues (page breaks, overflow) | Medium | High | Test on multiple examples early, iterate on CSS |
| Editor UI takes longer than 2 days | Medium | Medium | Build minimal editor first (text fields only), enhance if time |
| Testing reveals major bugs | Medium | High | Test continuously, don't wait until Day 5 |
| WeasyPrint rendering differences vs. browser | Low | Medium | Validate PDF output against browser render early |

### 7.3 Scope Risks

**Scope Creep Prevention**:
- ✅ All Phase 2 features formally deferred (documented in this spec)
- ✅ No new features during implementation week
- ✅ Focus on "must have" success criteria only
- ✅ "Nice to have" items explicitly marked as optional

---

## 9. Dependencies & Prerequisites

### 8.1 Software Dependencies

**Already Installed**:
- Python 3.9+ with conda environment
- Flask web server
- LLM client libraries (openai, anthropic)
- DataTables, jQuery (CDN)

**Need to Install**:
- **WeasyPrint**: `pip install weasyprint>=60.0`
  - Primary HTML → PDF converter
  - Requires system libraries: `pango`, `cairo`, `gdk-pixbuf` (macOS: `brew install pango`)
- **python-docx**: `pip install python-docx`
  - Version: 0.8.11+
- **Jinja2**: `pip install jinja2`
  - Usually installed as a Flask dependency

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
│       ├── template_renderer.py   [implemented]
│       ├── docx_generator.py      [implemented]
│       └── cv_editor.py           [implemented]
├── templates/                     [implemented]
│   ├── cv-template.html
│   └── cv-style.css
└── web/
    └── index.html (enhanced)
```

---

## 10. Post-MVP Roadmap (Phase 2)

### Priority #3: Cover Letter Generation
- Same workflow as CV generation
- Separate Jinja2 HTML template
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

## 11. Conclusion

This specification defines a **focused 1-week MVP** that delivers core value: generating customized, professional CVs quickly. By leveraging existing code (LLM analysis, review interface) and the Jinja2 HTML template + WeasyPrint pipeline, the implementation is achievable within the timeline.

**Key Success Factors**:
1. ✅ Clear scope (CV editing + document generation only)
2. ✅ Realistic timeline (6 days implementation + buffer)
3. ✅ Leveraging Jinja2 HTML template + WeasyPrint (no external tool dependency)
4. ✅ Deferred complexity (Phase 2 features documented)
5. ✅ Focus on must-have criteria (launch blockers clearly defined)

**Next Steps**:
1. Review and approve this specification
2. Ensure WeasyPrint and system library dependencies are installed
3. Begin implementation (Day 1: CV Editor UI)
4. Daily progress check-ins
5. Launch on Day 7 (Feb 18, 2026)

---

**Document Version**: 1.0  
**Last Updated**: March 6, 2026 (updated to reflect Jinja2 HTML template + WeasyPrint PDF pipeline)  
**Status**: Implemented  
**Author**: AI Project Manager (GitHub Copilot)
