# CV-Builder: Architectural Design Document
## Version 1.0 MVP - February 11, 2026

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Architecture](#3-data-architecture)
4. [API Specifications](#4-api-specifications)
5. [Document Generation Pipeline](#5-document-generation-pipeline)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Security & Error Handling](#7-security--error-handling)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                               │
│                    (Web Browser - Chrome/Firefox/Safari)         │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP/HTTPS
                 │ WebSocket (future)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Static Web App (index.html + JavaScript)                │  │
│  │  - DataTables for review                                 │  │
│  │  - Rich text editor for CV content        [NEW]          │  │
│  │  - Session state management                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │ REST API (JSON)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer (Flask)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  web_app.py - HTTP Server                                │  │
│  │  Routes:                                                  │  │
│  │    POST /api/chat - LLM conversation                     │  │
│  │    POST /api/analyze - Job analysis                      │  │
│  │    GET  /api/recommend - Get recommendations             │  │
│  │    POST /api/review-decisions - Save user choices        │  │
│  │    POST /api/edit - Update CV content    [NEW]           │  │
│  │    POST /api/generate - Create PDF/DOCX  [NEW]           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  conversation_manager.py                                 │  │
│  │    - Workflow state machine                              │  │
│  │    - User interaction tracking                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  cv_orchestrator.py                                      │  │
│  │    - select_content() - Filter experiences/skills        │  │
│  │    - generate_cv() - Coordinate generation   [ENHANCED]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  cv_editor.py                               [NEW]        │  │
│  │    - validate_cv_data()                                  │  │
│  │    - apply_edits()                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  scoring.py                                              │  │
│  │    - calculate_experience_relevance()                    │  │
│  │    - rank_skills()                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Integration Layer                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  llm_client.py - LLM Adapter Pattern                     │  │
│  │    - GitHubModelsClient (primary)                        │  │
│  │    - OpenAIClient (fallback)                             │  │
│  │    - AnthropicClient (fallback)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  quarto_generator.py                        [NEW]        │  │
│  │    - generate_qmd() - Create Quarto markdown             │  │
│  │    - render_pdf() - Shell out to quarto CLI              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  docx_generator.py                          [NEW]        │  │
│  │    - generate_ats_docx() - python-docx generation        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ GitHub       │  │ OpenAI       │  │ Anthropic Claude     │ │
│  │ Models API   │  │ GPT-4 API    │  │ API                  │ │
│  │ (Primary)    │  │ (Fallback)   │  │ (Fallback)           │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Quarto CLI (Local Process)                               │  │
│  │   - Chrome headless for PDF rendering                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Storage Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  File System (JSON)                                      │  │
│  │    ~/CV/Master_CV_Data.json - Source of truth            │  │
│  │    ~/CV/publications.bib - BibTeX publications           │  │
│  │    ./files/sessions/*.json - Conversation history        │  │
│  │    ./files/{job_name}/*.{pdf,docx} - Generated CVs       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

1. **Simplicity First**: Single-user, local deployment ⇒ No complex infrastructure
2. **Leverage Existing Tools**: Quarto (user's expertise), python-docx (battle-tested)
3. **Stateless HTTP**: Each request is independent (session state in JSON files)
4. **Progressive Enhancement**: Core workflow working ⇒ Add editor ⇒ Add generation
5. **Fail Fast**: Validate inputs early, surface errors clearly
6. **Separation of Concerns**: LLM logic ≠ Document formatting ≠ User interaction

---

## 2. Component Architecture

### 2.1 Frontend Components (web/index.html)

#### Component Hierarchy
```
App Shell
├── Navigation Tabs
│   ├── Job Description Tab
│   ├── Job Analysis Tab
│   ├── Customization Review Tab
│   ├── CV Editor Tab           [NEW]
│   └── Generated CVs Tab       [NEW]
├── Job Description Form
│   ├── Text Area (paste job)
│   └── File Upload (future)
├── Job Analysis Display
│   ├── Keywords Table
│   ├── Requirements List
│   └── Domain Classification
├── Customization Review
│   ├── Experiences DataTable
│   │   ├── Checkbox column
│   │   ├── Relevance score
│   │   └── Expansion details
│   ├── Skills DataTable
│   └── Achievements DataTable
├── CV Editor                   [NEW]
│   ├── Personal Info Display (read-only)
│   ├── Summary Editor (textarea)
│   ├── Experience Editor Cards
│   │   ├── Title/Company/Dates inputs
│   │   ├── Achievements Bullet Editor
│   │   │   ├── Add bullet button
│   │   │   ├── Remove bullet button
│   │   │   └── Drag-to-reorder (optional)
│   │   └── Remove Experience button
│   ├── Skills Chip Editor
│   │   ├── Add skill input
│   │   └── Remove skill (X icon)
│   ├── Education/Awards Lists
│   ├── Live Preview Pane
│   ├── Save Draft Button
│   └── Reset Button
└── Generated CVs Display       [ENHANCED]
    ├── Download PDF Link
    ├── Download DOCX Link
    ├── Preview iframe
    └── Edit & Regenerate Button
```

#### State Management

**JavaScript State Object**:
```javascript
// Global state (in memory + localStorage)
const appState = {
  currentTab: 'job-description',
  jobDescription: '',
  jobAnalysis: null,
  recommendations: {
    experiences: [],
    skills: [],
    achievements: []
  },
  userDecisions: {
    approvedExperiences: [],
    approvedSkills: [],
    approvedAchievements: []
  },
  cvData: {
    personal_info: {...},
    summary: '...',
    experiences: [...],
    skills: [...],
    education: [...],
    ...
  },
  generatedFiles: {
    pdfPath: null,
    docxPath: null
  }
};

// Persist to localStorage on each update
function saveState() {
  localStorage.setItem('cvBuilderState', JSON.stringify(appState));
}

// Restore on page load
function loadState() {
  const saved = localStorage.getItem('cvBuilderState');
  if (saved) {
    Object.assign(appState, JSON.parse(saved));
  }
}
```

### 2.2 Backend Components

#### 2.2.1 cv_orchestrator.py (Enhanced)

**Existing Methods**:
- `select_content(job_analysis, user_decisions, master_cv)` - Filters CV items
- `_calculate_relevance(experience, job_analysis)` - Scoring logic

**New/Enhanced Methods**:
```python
class CVOrchestrator:
    def __init__(self, llm_client, master_cv_path):
        self.llm = llm_client
        self.master_cv = self._load_master_cv(master_cv_path)
        self.quarto_gen = QuartoGenerator()
        self.docx_gen = DocxGenerator()
    
    def generate_cv(self, cv_data, job_info, output_dir):
        """
        Generate both PDF and DOCX versions of CV.
        
        Args:
            cv_data: Filtered/edited CV content (from editor or select_content)
            job_info: Dict with job_title, company, description
            output_dir: Path to save generated files
        
        Returns:
            {
                'pdf_path': '/path/to/CV.pdf',
                'docx_path': '/path/to/CV_ATS.docx',
                'metadata': {...}
            }
        """
        # 1. Validate cv_data structure
        validated_data = self._validate_cv_structure(cv_data)
        
        # 2. Generate PDF via Quarto
        pdf_path = self.quarto_gen.render(
            cv_data=validated_data,
            job_info=job_info,
            output_dir=output_dir
        )
        
        # 3. Generate DOCX for ATS
        docx_path = self.docx_gen.generate_ats_docx(
            cv_data=validated_data,
            job_info=job_info,
            output_path=f"{output_dir}/{job_info['company']}_CV_ATS.docx"
        )
        
        # 4. Create metadata file
        metadata = self._create_metadata(cv_data, job_info)
        self._save_json(metadata, f"{output_dir}/metadata.json")
        
        return {
            'pdf_path': pdf_path,
            'docx_path': docx_path,
            'metadata': metadata
        }
    
    def _validate_cv_structure(self, cv_data):
        """Ensure required fields exist, apply defaults."""
        required_fields = ['personal_info', 'experiences', 'skills']
        for field in required_fields:
            if field not in cv_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Apply defaults
        if 'summary' not in cv_data:
            cv_data['summary'] = self._generate_default_summary(cv_data)
        
        return cv_data
```

#### 2.2.2 cv_editor.py (New Component)

```python
class CVEditor:
    """
    Handles CV content editing operations.
    Validates user edits and applies them to CV data structure.
    """
    
    def validate_cv_data(self, cv_data):
        """
        Validate edited CV data for required fields and format.
        
        Returns:
            {
                'valid': True/False,
                'errors': [
                    {'field': 'experiences[0].title', 'message': 'Title required'}
                ],
                'warnings': [
                    {'field': 'experiences[1].end_date', 'message': 'Missing end date'}
                ]
            }
        """
        errors = []
        warnings = []
        
        # Required field checks
        if not cv_data.get('personal_info', {}).get('name'):
            errors.append({'field': 'personal_info.name', 'message': 'Name is required'})
        
        # Experience validation
        for i, exp in enumerate(cv_data.get('experiences', [])):
            if not exp.get('title'):
                errors.append({
                    'field': f'experiences[{i}].title',
                    'message': 'Job title is required'
                })
            if not exp.get('end_date') and not exp.get('current'):
                warnings.append({
                    'field': f'experiences[{i}].end_date',
                    'message': 'Missing end date (set current=true if ongoing)'
                })
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    def apply_edits(self, original_cv, edits):
        """
        Apply user edits to original CV data.
        Supports partial updates (only changed fields).
        
        Args:
            original_cv: Full Master_CV_Data structure
            edits: Dict with edited fields (can be partial)
        
        Returns:
            Updated cv_data (deep copy with edits applied)
        """
        import copy
        updated_cv = copy.deepcopy(original_cv)
        
        # Deep merge edits into updated_cv
        self._deep_merge(updated_cv, edits)
        
        return updated_cv
    
    def _deep_merge(self, target, updates):
        """Recursively merge updates into target dict."""
        for key, value in updates.items():
            if isinstance(value, dict) and key in target:
                self._deep_merge(target[key], value)
            else:
                target[key] = value
```

#### 2.2.3 quarto_generator.py (New Component)

```python
import subprocess
import json
from pathlib import Path

class QuartoGenerator:
    """
    Generates Quarto markdown and renders to PDF.
    """
    
    def __init__(self, template_dir='templates'):
        self.template_dir = Path(template_dir)
        self.template_path = self.template_dir / 'cv_template.qmd'
        self._validate_quarto_installation()
    
    def render(self, cv_data, job_info, output_dir):
        """
        Generate CV PDF via Quarto.
        
        Args:
            cv_data: Dict with CV content
            job_info: Dict with job_title, company
            output_dir: Path to output directory
        
        Returns:
            Path to generated PDF file
        
        Raises:
            QuartoNotFoundError: If quarto CLI not installed
            QuartoRenderError: If rendering fails
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Generate .qmd file with data
        qmd_path = self._generate_qmd(cv_data, job_info, output_dir)
        
        # 2. Render to PDF using quarto CLI
        pdf_path = self._render_quarto(qmd_path, output_dir)
        
        return pdf_path
    
    def _generate_qmd(self, cv_data, job_info, output_dir):
        """Create .qmd file from template and data."""
        qmd_path = output_dir / "cv_generated.qmd"
        
        # Load template
        with open(self.template_path, 'r') as f:
            template_content = f.read()
        
        # Create params YAML
        yaml_params = self._create_yaml_params(cv_data, job_info)
        
        # Replace placeholders in template
        qmd_content = template_content.replace('{{PARAMS}}', yaml_params)
        
        # Write .qmd file
        with open(qmd_path, 'w') as f:
            f.write(qmd_content)
        
        return qmd_path
    
    def _render_quarto(self, qmd_path, output_dir):
        """Shell out to quarto CLI to render PDF."""
        try:
            result = subprocess.run(
                ['quarto', 'render', str(qmd_path), '--to', 'pdf'],
                cwd=str(output_dir),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                raise QuartoRenderError(f"Quarto render failed: {result.stderr}")
            
            # Quarto creates PDF with same name as .qmd
            pdf_path = qmd_path.with_suffix('.pdf')
            if not pdf_path.exists():
                raise QuartoRenderError("PDF file not created by Quarto")
            
            return str(pdf_path)
        
        except subprocess.TimeoutExpired:
            raise QuartoRenderError("Quarto render timed out (>60s)")
        except FileNotFoundError:
            raise QuartoNotFoundError("quarto CLI not found - please install from quarto.org")
    
    def _validate_quarto_installation(self):
        """Check if quarto is installed and accessible."""
        try:
            result = subprocess.run(
                ['quarto', '--version'],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise QuartoNotFoundError("quarto command failed")
        except FileNotFoundError:
            raise QuartoNotFoundError("quarto not installed - see quarto.org")
```

#### 2.2.4 docx_generator.py (New Component)

```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

class DocxGenerator:
    """
    Generates ATS-optimized DOCX files using python-docx.
    """
    
    def generate_ats_docx(self, cv_data, job_info, output_path):
        """
        Create ATS-compliant DOCX file.
        
        ATS Guidelines:
        - Single column layout (no tables)
        - Standard headings
        - Simple bullet points
        - Calibri/Arial font 10-12pt
        - Keywords from job description
        - No graphics or special formatting
        
        Args:
            cv_data: Dict with CV content
            job_info: Dict with job_title, company, keywords
            output_path: Path for output .docx file
        
        Returns:
            Path to generated DOCX file
        """
        doc = Document()
        
        # Set default font
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Calibri'
        font.size = Pt(11)
        
        # 1. Contact Information (no header)
        self._add_contact_section(doc, cv_data['personal_info'])
        
        # 2. Professional Summary
        self._add_summary_section(doc, cv_data, job_info)
        
        # 3. Work Experience
        self._add_experience_section(doc, cv_data['experiences'])
        
        # 4. Technical Skills
        self._add_skills_section(doc, cv_data['skills'], job_info.get('keywords', []))
        
        # 5. Education
        self._add_education_section(doc, cv_data.get('education', []))
        
        # 6. Awards (if any)
        if cv_data.get('awards'):
            self._add_awards_section(doc, cv_data['awards'])
        
        # Save
        doc.save(output_path)
        return output_path
    
    def _add_contact_section(self, doc, personal_info):
        """Contact info (centered, no header)."""
        p = doc.add_paragraph()
        p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        
        # Name (larger, bold)
        run = p.add_run(personal_info['name'])
        run.bold = True
        run.font.size = Pt(14)
        
        # Contact details
        contact_line = f"\n{personal_info.get('city', '')}, {personal_info.get('state', '')}"
        contact_line += f" | {personal_info.get('phone', '')}"
        contact_line += f" | {personal_info.get('email', '')}"
        
        p.add_run(contact_line)
        
        # Spacing
        p.add_run('\n')
    
    def _add_summary_section(self, doc, cv_data, job_info):
        """Professional summary with job-specific keywords."""
        doc.add_heading('Professional Summary', level=1)
        
        summary_text = cv_data.get('summary', '')
        
        # Enhance summary with job keywords (if not already present)
        keywords = job_info.get('keywords', [])
        summary_text = self._inject_keywords(summary_text, keywords)
        
        doc.add_paragraph(summary_text)
    
    def _add_experience_section(self, doc, experiences):
        """Work experience with bullet achievements."""
        doc.add_heading('Work Experience', level=1)
        
        for exp in experiences:
            # Job header (bold)
            p = doc.add_paragraph()
            run = p.add_run(f"{exp['title']} | {exp['company']}")
            run.bold = True
            
            # Location and dates
            location = exp.get('location', '')
            start_date = self._format_date(exp['start_date'])
            end_date = self._format_date(exp.get('end_date', 'Present'))
            p.add_run(f"\n{location} | {start_date} – {end_date}")
            
            # Achievements (bullets)
            for achievement in exp.get('achievements', []):
                doc.add_paragraph(achievement, style='List Bullet')
            
            # Spacing between jobs
            doc.add_paragraph()
    
    def _add_skills_section(self, doc, skills, job_keywords):
        """Skills section with comma-separated list."""
        doc.add_heading('Technical Skills', level=1)
        
        # Group skills by category if available
        if isinstance(skills[0], dict) and 'category' in skills[0]:
            skills_by_category = {}
            for skill in skills:
                category = skill.get('category', 'Other')
                if category not in skills_by_category:
                    skills_by_category[category] = []
                skills_by_category[category].append(skill['name'])
            
            for category, skill_names in skills_by_category.items():
                p = doc.add_paragraph()
                run = p.add_run(f"{category}: ")
                run.bold = True
                p.add_run(', '.join(skill_names))
        else:
            # Simple list
            skill_names = [s['name'] if isinstance(s, dict) else s for s in skills]
            doc.add_paragraph(', '.join(skill_names))
    
    def _inject_keywords(self, text, keywords):
        """
        Naturally incorporate job keywords if not already present.
        Uses simple word boundary check.
        """
        text_lower = text.lower()
        missing_keywords = [kw for kw in keywords if kw.lower() not in text_lower]
        
        if missing_keywords:
            # Append as separate sentence
            text += f" Expertise includes {', '.join(missing_keywords[:5])}."
        
        return text
    
    def _format_date(self, date_str):
        """Convert YYYY-MM format to MM/YYYY for ATS."""
        if not date_str or date_str == 'Present':
            return date_str
        
        try:
            parts = date_str.split('-')
            if len(parts) == 2:
                return f"{parts[1]}/{parts[0]}"  # MM/YYYY
        except:
            pass
        
        return date_str
```

---

## 3. Data Architecture

### 3.1 Master CV Data Schema

**File**: `~/CV/Master_CV_Data.json`

```json
{
  "personal_info": {
    "name": "Gregory R. Warnes",
    "title": "Senior Bioinformatics & ML Scientist",
    "email": "greg@warnes.net",
    "phone": "+1-XXX-XXX-XXXX",
    "city": "Rochester",
    "state": "NY",
    "linkedin": "linkedin.com/in/gregwarnes",
    "github": "github.com/gwwarnes"
  },
  "professional_summaries": [
    {
      "id": "summary_biotech",
      "text": "Senior bioinformatics and machine learning scientist...",
      "tags": ["biotech", "ML", "data_science"]
    }
  ],
  "experience": [
    {
      "id": "exp_001",
      "title": "Principal Data Scientist",
      "company": "Torqata",
      "location": "Boston, MA",
      "start_date": "2018-01",
      "end_date": "2020-12",
      "current": false,
      "domain": ["Insurance", "Machine Learning"],
      "achievements": [
        "Invented ML methodology reducing model risk by 40%",
        "Led team of 5 data scientists"
      ],
      "technologies": ["Python", "TensorFlow", "AWS"]
    }
  ],
  "skills": [
    {
      "name": "Python",
      "category": "Programming Languages",
      "years_experience": 20,
      "proficiency": "Expert"
    },
    {
      "name": "Machine Learning",
      "category": "Data Science",
      "subcategories": ["Deep Learning", "NLP", "Computer Vision"]
    }
  ],
  "education": [
    {
      "degree": "Ph.D. Biomedical Engineering",
      "institution": "University of Washington",
      "location": "Seattle, WA",
      "year": "2002",
      "focus": "Statistical Genetics"
    }
  ],
  "awards": [
    {
      "name": "R Foundation Award",
      "year": "2015",
      "description": "For contributions to R statistical software"
    }
  ],
  "selected_achievements": [
    "Creator of popular R packages (gplots, gtools) with 500K+ downloads/year",
    "Published 50+ peer-reviewed papers in bioinformatics and genetics"
  ]
}
```

### 3.2 Session State Schema

**File**: `./files/sessions/{session_id}.json`

```json
{
  "session_id": "20260211_153045",
  "created_at": "2026-02-11T15:30:45Z",
  "last_updated": "2026-02-11T16:15:20Z",
  "workflow_stage": "cv_editing",
  "job_info": {
    "job_title": "Senior Data Scientist",
    "company": "BioTech Innovations",
    "job_description": "We are seeking...",
    "job_url": "https://example.com/job/123"
  },
  "job_analysis": {
    "keywords": ["machine learning", "Python", "clinical trials", "biostatistics"],
    "required_skills": ["Python", "R", "SQL", "TensorFlow"],
    "preferred_skills": ["AWS", "Docker", "Kubernetes"],
    "domain": "Biotech",
    "experience_level": "Senior"
  },
  "recommendations": {
    "experiences": [
      {
        "id": "exp_001",
        "relevance_score": 0.92,
        "reasoning": "Direct ML and biotech experience"
      }
    ],
    "skills": [
      {"id": "skill_python", "relevance_score": 0.98},
      {"id": "skill_ml", "relevance_score": 0.95}
    ]
  },
  "user_decisions": {
    "approved_experiences": ["exp_001", "exp_003", "exp_005"],
    "rejected_experiences": ["exp_010"],
    "approved_skills": ["skill_python", "skill_ml", "skill_aws"],
    "custom_notes": "Emphasize clinical trial work"
  },
  "edited_cv_data": {
    "summary": "Senior data scientist with 15+ years...",
    "experiences": [
      {
        "id": "exp_001",
        "title": "Principal Data Scientist",
        "achievements": [
          "Modified achievement text...",
          "..."
        ]
      }
    ]
  },
  "generated_files": {
    "pdf_path": "./files/BioTechInnovations_SeniorDataScientist_2026-02-11/CV.pdf",
    "docx_path": "./files/BioTechInnovations_SeniorDataScientist_2026-02-11/CV_ATS.docx",
    "generated_at": "2026-02-11T16:15:20Z"
  }
}
```

### 3.3 Quarto Template Data Binding

**Template File**: `templates/cv_template.qmd`

**YAML Front Matter**:
```yaml
---
format:
  pdf:
    template: cv-template.html
    css: cv-styles.css
    pdf-engine: chrome
    margin-top: 0.5in
    margin-bottom: 0.5in
params:
  personal_info:
    name: "{{name}}"
    title: "{{title}}"
    email: "{{email}}"
  summary: "{{summary}}"
  experiences: !r params$experiences
  skills: !r params$skills
---
```

**Rendering**: Quarto uses R or Python to inject `params` into template.

---

## 4. API Specifications

### 4.1 Existing APIs (Already Implemented)

#### POST /api/chat
**Purpose**: LLM conversation endpoint

**Request**:
```json
{
  "message": "Analyze this job description: ...",
  "session_id": "20260211_153045"
}
```

**Response**:
```json
{
  "response": "I've analyzed the job description. It requires...",
  "session_id": "20260211_153045"
}
```

#### POST /api/analyze
**Purpose**: Analyze job description

**Request**:
```json
{
  "job_description": "We are seeking a Senior Data Scientist...",
  "job_url": "https://example.com/job/123"
}
```

**Response**:
```json
{
  "analysis": {
    "keywords": ["machine learning", "Python", "biostatistics"],
    "required_skills": ["Python", "R", "SQL"],
    "preferred_skills": ["AWS", "Docker"],
    "domain": "Biotech",
    "experience_level": "Senior"
  },
  "session_id": "20260211_153045"
}
```

#### GET /api/recommend
**Purpose**: Get customization recommendations

**Response**:
```json
{
  "recommendations": {
    "experiences": [
      {
        "id": "exp_001",
        "title": "Principal Data Scientist",
        "company": "Torqata",
        "relevance_score": 0.92,
        "reasoning": "Strong ML and biotech match"
      }
    ],
    "skills": [...]
  }
}
```

#### POST /api/review-decisions
**Purpose**: Save user approval/rejection of recommendations

**Request**:
```json
{
  "session_id": "20260211_153045",
  "approved_experiences": ["exp_001", "exp_003"],
  "rejected_experiences": ["exp_010"],
  "approved_skills": ["skill_python", "skill_ml"]
}
```

### 4.2 New APIs (To Be Implemented)

#### POST /api/edit
**Purpose**: Update CV content with user edits

**Request**:
```json
{
  "session_id": "20260211_153045",
  "cv_data": {
    "summary": "Modified summary text...",
    "experiences": [
      {
        "id": "exp_001",
        "title": "Principal Data Scientist",
        "achievements": [
          "Edited achievement...",
          "New bullet point..."
        ]
      }
    ],
    "skills": [...]
  }
}
```

**Response** (Success):
```json
{
  "status": "success",
  "message": "CV data updated successfully",
  "validation": {
    "errors": [],
    "warnings": [
      {"field": "experiences[1].end_date", "message": "Missing end date"}
    ]
  }
}
```

**Response** (Validation Error):
```json
{
  "status": "error",
  "message": "Validation failed",
  "validation": {
    "errors": [
      {"field": "experiences[0].title", "message": "Title is required"},
      {"field": "experiences[0].achievements", "message": "At least 1 achievement required"}
    ],
    "warnings": []
  }
}
```

**Implementation**:
```python
# In web_app.py
@app.route('/api/edit', methods=['POST'])
def edit_cv():
    data = request.get_json()
    session_id = data.get('session_id')
    cv_data = data.get('cv_data')
    
    # Load session
    session = conversation_manager.get_session(session_id)
    
    # Validate edits
    editor = CVEditor()
    validation_result = editor.validate_cv_data(cv_data)
    
    if not validation_result['valid']:
        return jsonify({
            'status': 'error',
            'message': 'Validation failed',
            'validation': validation_result
        }), 400
    
    # Save edited CV data to session
    session['edited_cv_data'] = cv_data
    conversation_manager.save_session(session)
    
    return jsonify({
        'status': 'success',
        'message': 'CV data updated successfully',
        'validation': validation_result
    })
```

#### POST /api/generate
**Purpose**: Generate PDF and DOCX files

**Request**:
```json
{
  "session_id": "20260211_153045",
  "formats": ["pdf", "docx"]
}
```

**Response** (Success):
```json
{
  "status": "success",
  "message": "CV generated successfully",
  "files": {
    "pdf": {
      "path": "/files/BioTechInnovations_SeniorDataScientist_2026-02-11/CV.pdf",
      "url": "/downloads/BioTechInnovations_SeniorDataScientist_2026-02-11/CV.pdf",
      "size_bytes": 245760
    },
    "docx": {
      "path": "/files/BioTechInnovations_SeniorDataScientist_2026-02-11/CV_ATS.docx",
      "url": "/downloads/BioTechInnovations_SeniorDataScientist_2026-02-11/CV_ATS.docx",
      "size_bytes": 51200
    }
  },
  "preview_url": "/preview/BioTechInnovations_SeniorDataScientist_2026-02-11/CV.pdf"
}
```

**Response** (Error):
```json
{
  "status": "error",
  "message": "Quarto rendering failed",
  "error_details": "quarto CLI not found - please install from quarto.org",
  "stack_trace": "..."
}
```

**Implementation**:
```python
@app.route('/api/generate', methods=['POST'])
def generate_cv():
    data = request.get_json()
    session_id = data.get('session_id')
    formats = data.get('formats', ['pdf', 'docx'])
    
    # Load session
    session = conversation_manager.get_session(session_id)
    
    # Get edited CV data or use selected content
    cv_data = session.get('edited_cv_data') or session['selected_content']
    job_info = session['job_info']
    
    # Create unique output directory
    output_dir = f"./files/{job_info['company']}_{job_info['job_title']}_{date.today()}"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Generate documents
        result = cv_orchestrator.generate_cv(
            cv_data=cv_data,
            job_info=job_info,
            output_dir=output_dir
        )
        
        # Save generation metadata to session
        session['generated_files'] = result
        conversation_manager.save_session(session)
        
        return jsonify({
            'status': 'success',
            'message': 'CV generated successfully',
            'files': result
        })
    
    except QuartoNotFoundError as e:
        return jsonify({
            'status': 'error',
            'message': 'Quarto not installed',
            'error_details': str(e)
        }), 500
    
    except Exception as e:
        logger.exception("CV generation failed")
        return jsonify({
            'status': 'error',
            'message': 'CV generation failed',
            'error_details': str(e)
        }), 500
```

---

## 5. Document Generation Pipeline

### 5.1 Quarto PDF Generation Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. CV Data (JSON) + Job Info                                │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  2. quarto_generator.generate_qmd()                          │
│     - Load cv_template.qmd                                    │
│     - Inject params into YAML                                │
│     - Write cv_generated.qmd                                 │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Shell: quarto render cv_generated.qmd --to pdf          │
│     - Quarto parses .qmd                                     │
│     - Applies cv_styles.css                                  │
│     - Generates HTML intermediate                            │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Chrome Headless (embedded in Quarto)                     │
│     - Renders HTML with print media queries                  │
│     - Applies page-break rules                               │
│     - Generates PDF                                          │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Output: cv_generated.pdf                                 │
│     - Multi-page, 2-column layout                            │
│     - Professional styling                                   │
│     - File size optimized (<5MB)                             │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 DOCX ATS Generation Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. CV Data (JSON) + Job Keywords                            │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  2. docx_generator.generate_ats_docx()                       │
│     - Create Document()                                      │
│     - Set Calibri 11pt default font                          │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Add Sections (ATS Order)                                 │
│     - Contact Info (centered, no header)                     │
│     - Professional Summary (inject keywords)                 │
│     - Work Experience (bullets, dates formatted)             │
│     - Technical Skills (comma-separated)                     │
│     - Education                                              │
│     - Awards (optional)                                      │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  4. ATS Optimization                                         │
│     - No tables or columns                                   │
│     - Simple bullet points only                              │
│     - Standard section headings                              │
│     - Keywords naturally incorporated                        │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Output: CV_ATS.docx                                      │
│     - Parseable by all ATS systems                           │
│     - File size <1MB                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Frontend Architecture

### 6.1 CV Editor UI Component

**HTML Structure** (added to web/index.html):

```html
<div id="cv-editor-tab" class="tab-content" style="display:none;">
  <div class="editor-container">
    <!-- Personal Info (read-only display) -->
    <div class="section" id="personal-info-display">
      <h3>Contact Information</h3>
      <div class="info-grid">
        <span><strong>Name:</strong> <span id="display-name"></span></span>
        <span><strong>Email:</strong> <span id="display-email"></span></span>
        <span><strong>Phone:</strong> <span id="display-phone"></span></span>
      </div>
    </div>
    
    <!-- Summary Editor -->
    <div class="section">
      <h3>Professional Summary</h3>
      <textarea id="edit-summary" rows="5" maxlength="500"></textarea>
      <span class="char-counter">0/500</span>
    </div>
    
    <!-- Experience Editor -->
    <div class="section">
      <h3>Work Experience</h3>
      <div id="experiences-container">
        <!-- Dynamically generated experience cards -->
      </div>
    </div>
    
    <!-- Skills Editor -->
    <div class="section">
      <h3>Technical Skills</h3>
      <div id="skills-chips-container"></div>
      <div class="add-skill-form">
        <input type="text" id="new-skill-input" placeholder="Add skill...">
        <button onclick="addSkill()">Add</button>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="editor-actions">
      <button class="btn-primary" onclick="saveCVEdits()">Save Draft</button>
      <button class="btn-secondary" onclick="resetToRecommendations()">Reset to LLM Recommendations</button>
      <button class="btn-primary" onclick="generateFromEdits()">Generate CV</button>
    </div>
    
    <!-- Live Preview Pane (optional) -->
    <div class="preview-pane">
      <h3>Preview</h3>
      <div id="live-preview-html"></div>
    </div>
  </div>
</div>
```

**JavaScript Functions**:

```javascript
// Load CV data into editor
function loadCVEditor() {
  const cvData = appState.cvData;
  
  // Personal info (read-only)
  document.getElementById('display-name').innerText = cvData.personal_info.name;
  document.getElementById('display-email').innerText = cvData.personal_info.email;
  
  // Summary
  document.getElementById('edit-summary').value = cvData.summary || '';
  
  // Experiences (render cards)
  renderExperienceCards(cvData.experiences);
  
  // Skills (render chips)
  renderSkillChips(cvData.skills);
}

// Render experience cards
function renderExperienceCards(experiences) {
  const container = document.getElementById('experiences-container');
  container.innerHTML = '';
  
  experiences.forEach((exp, index) => {
    const card = document.createElement('div');
    card.className = 'experience-card';
    card.innerHTML = `
      <div class="exp-header">
        <input type="text" class="exp-title" value="${exp.title}" 
               onchange="updateExperience(${index}, 'title', this.value)">
        <input type="text" class="exp-company" value="${exp.company}"
               onchange="updateExperience(${index}, 'company', this.value)">
      </div>
      <div class="exp-dates">
        <input type="month" value="${exp.start_date}"
               onchange="updateExperience(${index}, 'start_date', this.value)">
        <span>to</span>
        <input type="month" value="${exp.end_date || ''}"
               onchange="updateExperience(${index}, 'end_date', this.value)">
      </div>
      <div class="exp-achievements">
        <h4>Achievements</h4>
        <ul id="achievements-${index}">
          ${exp.achievements.map((ach, achIndex) => `
            <li>
              <textarea onchange="updateAchievement(${index}, ${achIndex}, this.value)">${ach}</textarea>
              <button onclick="removeAchievement(${index}, ${achIndex})">Remove</button>
            </li>
          `).join('')}
        </ul>
        <button onclick="addAchievement(${index})">Add Bullet Point</button>
      </div>
      <button class="btn-remove" onclick="removeExperience(${index})">Remove Experience</button>
    `;
    container.appendChild(card);
  });
}

// Save CV edits to session
async function saveCVEdits() {
  const cvData = collectCVDataFromForm();
  
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
      showNotification('CV saved successfully', 'success');
      
      // Show warnings if any
      if (result.validation.warnings.length > 0) {
        showWarnings(result.validation.warnings);
      }
    } else {
      showErrors(result.validation.errors);
    }
  } catch (error) {
    showNotification('Save failed: ' + error.message, 'error');
  }
}

// Collect form data into CV structure
function collectCVDataFromForm() {
  return {
    personal_info: appState.cvData.personal_info, // unchanged
    summary: document.getElementById('edit-summary').value,
    experiences: collectExperiencesFromForm(),
    skills: collectSkillsFromForm(),
    education: appState.cvData.education, // unchanged for MVP
    awards: appState.cvData.awards
  };
}
```

---

## 7. Security & Error Handling

### 7.1 Security Considerations

**Threat Model** (Single-user, Local Deployment):
- ✅ No authentication needed (runs on localhost)
- ✅ No network exposure (127.0.0.1 only)
- ⚠️ **LLM API Keys**: Store in `.env` file (not git)
- ⚠️ **File System Access**: Validate paths to prevent directory traversal

**Input Validation**:
```python
# In cv_editor.py
def sanitize_path(filepath):
    """Prevent directory traversal attacks."""
    filepath = os.path.normpath(filepath)
    if filepath.startswith('..') or filepath.startswith('/'):
        raise ValueError("Invalid file path")
    return filepath

# In web_app.py
@app.route('/downloads/<path:filepath>')
def download_file(filepath):
    filepath = sanitize_path(filepath)
    safe_path = os.path.join(app.config['FILES_DIR'], filepath)
    
    if not os.path.exists(safe_path):
        abort(404)
    
    return send_file(safe_path, as_attachment=True)
```

### 7.2 Error Handling Strategy

**Graceful Degradation**:
1. **Quarto Not Installed**: Show clear error message with install instructions
2. **LLM Timeout**: Retry with exponential backoff, fallback to simpler prompt
3. **Invalid CV Data**: Display validation errors per field, don't lose user edits
4. **File Write Errors**: Check disk space, permissions, notify user

**Error Response Pattern**:
```python
try:
    result = cv_orchestrator.generate_cv(...)
    return jsonify({'status': 'success', 'files': result})
except QuartoNotFoundError as e:
    logger.error(f"Quarto not found: {e}")
    return jsonify({
        'status': 'error',
        'error_type': 'quarto_not_installed',
        'message': 'Quarto is not installed',
        'instructions': 'Download from https://quarto.org/docs/get-started/',
        'details': str(e)
    }), 500
except QuartoRenderError as e:
    logger.error(f"Quarto render failed: {e}")
    return jsonify({
        'status': 'error',
        'error_type': 'render_error',
        'message': 'PDF generation failed',
        'details': str(e)
    }), 500
except Exception as e:
    logger.exception("Unexpected error in CV generation")
    return jsonify({
        'status': 'error',
        'error_type': 'unknown',
        'message': 'An unexpected error occurred',
        'details': str(e)
    }), 500
```

**Frontend Error Display**:
```javascript
function handleGenerateError(errorResponse) {
  const errorType = errorResponse.error_type;
  
  switch (errorType) {
    case 'quarto_not_installed':
      showModal({
        title: 'Quarto Not Installed',
        message: errorResponse.instructions,
        link: 'https://quarto.org/docs/get-started/',
        linkText: 'Install Quarto'
      });
      break;
    
    case 'render_error':
      showNotification('PDF generation failed: ' + errorResponse.details, 'error');
      break;
    
    default:
      showNotification('An error occurred: ' + errorResponse.message, 'error');
  }
}
```

---

## 8. Deployment Architecture

### 8.1 Local Development Setup

**Directory Structure**:
```
/Users/warnes/src/cv-builder/
├── .env                          # LLM API keys (not in git)
├── config.yaml                   # App configuration
├── requirements.txt              # Python dependencies
├── scripts/
│   ├── llm_cv_generator.py       # CLI entry point
│   ├── web_app.py                # Flask server
│   └── utils/
│       ├── cv_orchestrator.py
│       ├── cv_editor.py          [NEW]
│       ├── quarto_generator.py   [NEW]
│       ├── docx_generator.py     [NEW]
│       └── ...
├── templates/                    [NEW]
│   ├── cv_template.qmd
│   ├── cv_styles.css
│   └── cv-template.html
├── web/
│   ├── index.html                [ENHANCED]
│   └── styles.css
└── files/
    ├── sessions/                 # Session JSON files
    └── {job_name}/               # Generated CVs
```

**Running Locally**:
```bash
# 1. Activate conda environment
conda activate cvgen

# 2. Install new dependencies
pip install python-docx

# 3. Install Quarto (one-time)
# Download from https://quarto.org/docs/get-started/
# macOS: brew install quarto

# 4. Start Flask server
cd /Users/warnes/src/cv-builder
python scripts/web_app.py

# 5. Open browser
open http://localhost:5000
```

### 8.2 Production Considerations (Phase 2)

**If deploying to remote server** (NOT in MVP):
- Use Gunicorn/uWSGI instead of Flask dev server
- Add HTTPS (Let's Encrypt)
- Add authentication (Flask-Login)
- Use PostgreSQL instead of JSON files
- Add file storage (S3 or NFS)
- Add background task queue (Celery) for LLM/generation

---

## 9. Conclusion

This architecture delivers a **production-ready MVP in 1 week** by:

1. **Reusing existing components** (LLM client, conversation manager, review UI)
2. **Leveraging mature tools** (Quarto, python-docx, DataTables)
3. **Simplifying deployment** (local-only, single-user)
4. **Focusing on core value** (CV editing + document generation)

**Key Architectural Decisions**:
- ✅ Quarto for PDF generation (matches user's expertise)
- ✅ python-docx for ATS DOCX (simple, reliable)
- ✅ File-based storage (no database overhead)
- ✅ Synchronous processing (acceptable for single-user)
- ✅ Modular components (easy to test and extend)

**Next Steps**: Proceed to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for phased execution roadmap.

---

**Document Version**: 1.0  
**Last Updated**: February 11, 2026  
**Status**: Approved  
**Author**: AI Architect (GitHub Copilot)
