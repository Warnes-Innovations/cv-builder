# LLM driven custom CV generator

## Goal

Create an LLM-driven tool for creating and maintaining a master file of my CV material, generating customizd CVs for different job areas (e.g. Data Science vs Biostatistics, Individual Contributor vs Leadership), and specific job opportunities.

## User Interface

The system will use a simple web UI.

## Requirements

### Data Managenent

1. Maintain the master data file `Master_CV_Data.json` to serve as a master data of job experience, skills, achievements, contact information, and other materials.
2. Allow updating the master data file using natural language interactions, including ingestion of existing documents.
3. Preserve an archive of generated materials to allow for reference and future reuse.
4. Leverage Git/GitHub for revision management of text and code resources.
5. **Google Drive sync is not implemented.** All generated files are stored locally at `~/CV/files/`. Git (§4) is the archiving mechanism. Google Drive Desktop sync can be configured at the OS level independently; no in-app integration is planned.

### CV and Cover Letter Generation

1. Allow the user to provide a target job or job area description, asking sufficent questions to fully understand the target and the user's desired approach.
2. Generate an ATS-optimized DOCX file intended for machine parsing by Applicant Tracking Systems (ATS), following the ATS optimization guidelines (see below). Plain text, single-column, keyword-optimized via python-docx.
3. Generate a human-readable HTML file (with embedded Schema.org/Person JSON-LD metadata in `<head>` for structured-data ATS parsing) and a PDF rendered from that same HTML file, both following the human-readable CV guidelines (see below). The HTML and PDF are produced as a matched pair from a single Jinja2 template render; the HTML is also directly downloadable and previewable in-browser.
4. Generate and present to the user a cover letter for refinement.  

## ATS-Optimized CV Generation Guidelines  

### Responses to Interview Screeeing Questions

1. Allow the user to upload screening questions, asking sufficent questions to fully understand the target and the user's desired approach.
2. Generate and present to the user responses for refinement.

## ATS-Optimized CV Generation Guidelines

### Core Formatting Requirements

**File Format & Structure:**
- Output as `.docx` file (preferred by most ATS systems)
- Use reverse chronological format (most recent experience first)
- Single-column layout only (no tables, columns, or text boxes)
- No headers/footers (ATS often cannot parse these)
- No graphics, images, logos, or special characters
- Standard fonts only: Arial, Calibri, or Times New Roman (10-12pt)

**Section Headings (use these exact standard labels):**
- Contact Information (at top, not in header)
- Professional Summary OR Objective
- Work Experience (or "Professional Experience")
- Education
- Skills (or "Technical Skills" / "Core Competencies")
- Certifications (if applicable)
- Publications (if applicable) — **ATS DOCX only**; human-readable PDF and DOCX use "Selected Publications" (see below)

### Formatting Rules

**Text Formatting:**
- Use basic bold for emphasis only (no italics, underline, or mixed)
- Simple bullet points (•) only
- No special characters or symbols
- Standard date formats: "January 2020–Present" or "01/2020–Present"
- No abbreviations without spelling out first: "Master of Business Administration (MBA)"

**Content Structure:**
- Contact info: Name, City/State, Phone, Email, LinkedIn URL
- Each job entry: Job Title | Company Name | Location | Dates
- Use bullet points for achievements (not paragraphs)
- Include both acronyms AND full terms: "Machine Learning (ML)"

### Keyword Optimization Strategy

**For Each Job Application:**
1. Extract key terms from job description (skills, tools, qualifications)
2. Identify required vs. preferred qualifications
3. Map job requirements to candidate's experience using semantic + keyword matching
4. Select and reorder content based on job relevance
5. Rewrite selected text to incorporate job-specific terminology (LLM-driven; user-approved before generation):
   - Professional Summary: rewrite to naturally embed top required keywords
   - Skills section:
     * Adjust terminology to match job posting phrasing (e.g., candidate has "scikit-learn" → job uses "Scikit-Learn / sklearn")
     * Add skills from the job description that are demonstrably present in the candidate's experience but absent from the current skills list
     * Present all additions and terminology changes for user approval before generation
   - Work Experience bullets: substitute job-posting terms for semantically equivalent existing text (e.g., "productionizing ML pipelines" → "MLOps pipeline deployment" when job uses "MLOps")
6. Preserve factual accuracy and quantitative metrics in all rewrites; never invent claims
7. Use exact job posting language where truthful; include both acronym and full form: "MLOps (ML Operations)"

**Keyword Placement Priority:**
1. Skills section (for quick scanning)
2. Professional Summary (for context)
3. Work Experience bullets (for proof)
4. Job titles (if accurate to actual role)

**Synonym & Acronym Mapping:**
- A `synonym_map.json` file (stored at `~/CV/synonym_map.json`) holds approved mappings of synonyms and acronyms to their canonical forms (e.g., `"ML": "Machine Learning"`, `"NLP": "Natural Language Processing"`).
- At job-analysis time, the LLM proposes new synonym/acronym pairs it observes in the job description that are not yet in `synonym_map.json`. These proposals are shown to the user for review; the user may accept, edit, or reject each one.
- Approved pairs are saved to `synonym_map.json` and applied during keyword matching for the current and all future sessions.
- The file is created automatically on first run (empty map). Users may also edit it directly.
- During keyword matching, both the canonical form and all synonyms/acronyms in the map are treated as equivalent (e.g., a bullet containing "ML" counts as a match for a job requirement of "Machine Learning").

**Canonical Skills and Deduplication:**
- Each skill in `Master_CV_Data.json` has exactly one canonical `name` (e.g., `"Machine Learning"`).
- A skill entry may include an optional `aliases` list for display variants (e.g., `["ML", "ML/AI"]`).
- When new skills are added (via session write-back, NL update, or document ingestion), the system checks for duplicates: an incoming skill is a duplicate if its name or any of its aliases matches the name or an alias of an existing skill. Duplicates are surfaced to the user for merge/resolution rather than silently dropped or added.
- On merge, the user chooses the canonical name and the union of aliases, and any `relevant_for` / `keywords` values are merged.

### Content Guidelines

**Professional Summary:**
- 4-6 lines for senior-level candidates
- Include: years of experience, key expertise areas, leadership scope, strategic impact
- Emphasize breadth and depth of experience
- Use keywords from target job description
- Highlight level of responsibility and scale of impact

**Work Experience:**
- Focus on achievements with quantifiable results
- Start bullets with strong action verbs (e.g., Led, Designed, Implemented, Reduced). During rewrite review, the system checks whether the first word of each bullet is a recognised action verb; if not, it is flagged as a low-confidence rewrite candidate. See `tasks/rewrite-feature.md` Phase 2.4 for the detection implementation.
- Include metrics where possible: "$2M revenue", "50+ daily calls", "team of 15"
- Emphasize contributions matching job requirements
- For senior roles, emphasize leadership, strategy, and organizational impact

**Skills Section:**
- List as simple text (not tables)
- Group by category if needed: "Technical Skills:", "Leadership Skills:", "Domain Expertise:"
- Use one or two-word phrases that match job posting
- Include both hard skills and relevant soft skills
- **Keyword-driven updates (per job):**
  * Adjust terminology of existing skills to match job posting phrasing (e.g., "machine learning" → "ML/AI" if job uses that form)
  * Add skills from the job description that are evidenced in the candidate's experience or work history but are missing from the skills list; flag each addition for user approval
  * Do not add skills the candidate does not demonstrably have; any uncertain addition must be flagged as "candidate to confirm"

### What to Avoid

❌ Tables, columns, or complex layouts
❌ Headers or footers containing information
❌ Graphics, logos, photos, charts
❌ Text boxes or shapes
❌ Special fonts or font effects (shadows, outlines)
❌ Hyperlinks (spell out URLs)
❌ Excessive formatting (multiple colors, underlines)
❌ Creative section names ("My Journey" instead of "Work Experience")
❌ Keyword stuffing or invisible text

### Generation Process

**For each CV request:**
1. Analyze job description for keywords and requirements
2. Map requirements to candidate's Master_CV_Data (semantic + keyword matching)
3. Select most relevant experiences and achievements
4. Reorder/emphasize content based on job priorities
5. Generate proposed text rewrites using LLM to incorporate job-specific terminology
6. Present rewrites to user as before/after diffs for approval (see Customization Workflow)
7. Apply approved rewrites; discard or revert rejected ones
8. Run spell and grammar check on all finalized text (see §Spell & Grammar Check below);
   present flagged items for accept/reject; apply accepted corrections
9. Generate all four output formats from finalized content:
   - **ATS DOCX**: clean, parseable plain-text DOCX (python-docx)
   - **Human DOCX**: Word-native editable DOCX (docxtpl Jinja2 template; independently styled from the PDF)
   - **HTML**: Jinja2-rendered human-readable HTML with embedded Schema.org/Person JSON-LD in `<head>`
   - **PDF**: WeasyPrint (primary) / Chrome headless (fallback) conversion of the rendered HTML
9. Validate ATS DOCX: Can all text be selected/copied as plain text? No tables, text boxes, or multi-column sections?
10. Validate HTML: JSON-LD block present and parseable? All CSS renders correctly in browsers?
11. Validate PDF: No clipped content, fonts embedded, page breaks correct?
12. **ATS validation blocking rules:**
    - **Format-specific failures** block only the affected format download — DOCX failures grey out the DOCX download; HTML/JSON-LD failures grey out the HTML download; PDF failures grey out the PDF download; other formats remain available.
    - **Keyword presence failure (exception):** If required keywords are absent from the finalised CV text, **all format downloads are blocked**. Keywords are content-level — they are absent from all three outputs equally because all formats are rendered from the same finalised text.

**Success Criteria:**
- ATS can extract all section content correctly
- Keywords match job description naturally
- Dates, titles, and education parse accurately
- No formatting blocks content extraction
- Resume reads well to both ATS and humans

## Human-Readable CV Generation Guidelines

### Template Structure & Styling

**Base Template:** Extract and preserve exact styling from `CV - Gregory R. Warnes - Bioinformatics and ML Scientist.html`

**Page Layout:**
- US Letter size (215.9mm × 279.4mm)
- Two-column layout: 32% left sidebar (light background: #eef2f5), 68% right main content
- Multi-page with explicit page management to prevent overflow/underflow
- Page 1: Fixed height (279.4mm) with overflow:hidden to maintain exact layout
- Pages 2+: Managed height with content flow control

**Typography:**
- Headers: 'Merriweather' serif for name (2.2rem, bold)
- Body: 'Inter' sans-serif throughout
- Color scheme:
  - Primary: #2c3e50 (dark blue for titles)
  - Accent: #2980b9 (bright blue for links/icons)
  - Text: #333 main, #666 muted
  - Border: #d1d8dd

**Component Styles:**
- Section titles: Uppercase, 1.1rem, border-bottom
- Icons: Font Awesome 6.0 for visual hierarchy
- Job entries: `page-break-inside: avoid` to prevent splitting
- Bullet points: Custom styled with accent color
- Contact info: Icon + text pairs with consistent spacing

### Page Content Distribution

**Page 1 (Required - Fixed Layout):**
- **Left Sidebar:**
  - Contact Information (required)
  - Education (required)
  - Awards (optional)
  - Languages (optional)
  
- **Right Main:**
  - Header: Name + Job Title (required)
  - Professional Summary (required)
  - Selected Achievements (required for senior roles)

**Page 2:**
- **Left Sidebar:**
  - Technical Skills - Part 1 (required):
    - Core Expertise
    - Scientific & Genomics (domain-specific)
    - Modeling & Statistics
    - Programming & Libraries

- **Right Main:**
  - Work Experience entries (most recent 4-5 positions)

**Page 3:**
- **Left Sidebar:**
  - Technical Skills - Part 2 (optional based on role):
    - Infrastructure & Cloud
    - Data & Visualization

- **Right Main:**
  - Work Experience continuation (earlier positions)
  - Publications section (optional, if space allows; always the final section regardless of role type)

### Section Priority & Selection

**Always Include (Required):**
1. **Contact Information** - Name, email, phone, LinkedIn, website
2. **Education** - All degrees with institutions and years
3. **Professional Summary** - 4-6 lines showcasing senior expertise
4. **Selected Achievements** - 4-6 key accomplishments with quantifiable impact
5. **Work Experience** - All positions (distributed across pages as needed)
6. **Core Technical Skills** - Domain expertise, programming languages, key methodologies

**Conditionally Include (Role-Dependent):**
1. **Awards** - Include for senior/leadership roles; omit for technical IC roles if space tight
2. **Languages** - Include if job international or mentions language requirements
3. **Infrastructure Skills** - Emphasize for DevOps/MLOps/Platform roles; de-emphasize for pure research
4. **Publications** - Include for academic/research scientist roles; optional for industry positions
   - **LLM-driven item selection:** At job-analysis time, the LLM reads the full `publications.bib` file alongside the job description and recommends a ranked shortlist of the most relevant publications for a "Selected Publications" section, with per-item rationale (keyword overlap, domain alignment, recency, first-author status). The user reviews and adjusts the shortlist in the Customisation step before it enters the CV.
   - **Count guidance by role type:** Research/academic roles: up to 10 items; industry/biotech roles: 2–5 most relevant; pure business/management roles: omit unless directly instructed.
   - **Section heading:** Always labelled "Selected Publications" (not "Publications") to signal intentional curation to the reader.
5. **Patents** - Include for innovation-focused or IP-heavy roles

**Customization Strategy:**
- For **Leadership roles**: Emphasize Selected Achievements, include Awards, highlight organizational impact
- For **Technical IC roles**: Maximize Technical Skills detail, emphasize hands-on accomplishments
- For **Genomics/Biotech roles**: Full Scientific & Genomics skills, recent relevant experience
- For **Data Science/ML roles**: Emphasize ML/modeling skills, productionization experience, scale metrics
- For **Research roles**: Include publications, emphasize methodology expertise

### Content Management Rules

**Page Overflow Prevention:**
1. Calculate approximate line counts for each section before placement
2. Job entries marked with `page-break-inside: avoid` - move entire entry if won't fit
3. Skills sections can be split across pages at group boundaries
4. Monitor Page 1 right column carefully - Summary + Achievements must fit in ~220mm height
5. If Page 1 overflows: reduce Achievement bullets or move one to Experience section

**Content Selection for Target Fit:**
1. Reorder Experience bullets to prioritize relevant accomplishments
2. Select 3-5 most relevant skills per group (not comprehensive lists)
3. Tailor Professional Summary keywords to job description
4. Adjust Selected Achievements to match role requirements (leadership vs. technical)
5. Omit older/less relevant positions if CV exceeds 3 pages
6. Select publications by relevance to the specific job: rank all items in `publications.bib` by keyword overlap with `ats_keywords` and `required_skills`, domain match, recency, and first-author status; present top-N candidates for user confirmation

### File Generation

**Output Formats (four formats per CV generation run):**

| Format | Purpose | Generator | Audience |
|--------|---------|-----------|----------|
| **ATS DOCX** (`*_ATS.docx`) | Machine parsing by ATS | python-docx | ATS systems, HR portals |
| **Human DOCX** (`*.docx`) | Human-readable editable Word document | docxtpl (Jinja2 template) | Applicants — edit before submission in Word/Pages/LibreOffice |
| **HTML** (`*.html`) | Human-readable browser view + structured metadata | Jinja2 template | Browsers, structured-data parsers |
| **PDF** (`*.pdf`) | Print/email human-readable CV | WeasyPrint → HTML | HR, hiring managers, email submission |

> **Note:** The Human DOCX and the PDF are **independently styled** — the PDF is a polished 2-column CSS render; the Human DOCX is a clean Word-native layout (Calibri, standard margins). There is no requirement for them to look identical.

**HTML Format Details:**
- Rendered from `templates/cv-template.html` via Jinja2
- Two-column layout with embedded CSS (self-contained; no external resources required)
- `<head>` contains a `<script type="application/ld+json">` block with Schema.org/Person structured data (name, contact, occupation, skills, education, awards)
- JSON-LD serves as a machine-readable metadata layer that some modern ATS and search engines can parse directly from the HTML
- The HTML file is downloadable and fully previewable in any browser without a server

**PDF Format Details:**
- Produced from the same HTML render (no separate template render step)
- WeasyPrint is the primary converter; Chrome headless is the fallback
- Fonts are embedded; background colours and sidebar fill are preserved

**Quality Checks:**
1. All PDF pages exactly US Letter size
2. No orphaned lines or split job entries
3. Consistent spacing and alignment across pages
4. All links functional (in digitall versions)
5. HTML JSON-LD block present, valid JSON, and contains required fields
6. Background colors render correctly in PDF
7. Fonts embedded in PDF output
8. ATS DOCX: zero tables, text boxes, or multi-column sections

## Detailed Implementation Specifications

### 1. Job Description Matching & Customization Workflow

**Analysis Approach:**
- Automatic extraction of keywords, required skills, preferred qualifications, and key responsibilities
- When prompting the LLM to generate clarifying questions, pass `Master_CV_Data.json` as context alongside the job description so the LLM can identify apparent mismatches (e.g., a leadership role where the CV emphasises IC work, or a required skill not evidenced in the master data)
- Clarifying questions must address both strategic ambiguity *and* specific gaps or mismatches surfaced by comparing the job requirements against the master CV data (e.g., "This role requires Kubernetes experience, which isn’t in your master data — should we proceed without it or add it?")  
- Ask clarifying questions when ambiguity exists (e.g., "Do you want to emphasise leadership or technical IC aspects?")
- Persist all clarification-question answers to session state and to `metadata.json` under `clarification_answers`
- Use stored answers as LLM context throughout the rest of the session (cover letter generation, screening response generation, iterative refinement) so the user never has to re-state their preferences
- On subsequent sessions for the same role type, pre-populate clarification defaults from prior `clarification_answers` records in the archive
- Highlight which experiences best match requirements with relevance scores

**Keyword vs. Semantic Understanding:**
- **Keyword Matching:** Identify exact phrases from job description for ATS optimization
- **Semantic Understanding:** Recognize related concepts (e.g., "MLOps" ≈ "productionizing ML pipelines")
- **Approach:** Use semantic matching to find relevant content, then use LLM to rewrite selected text with the job's exact terminology
- **User Interaction:** Present proposed rewrites as diffs for approval: "Job uses 'MLOps'—proposed change: 'productionizing ML pipelines' → 'MLOps pipeline deployment'. Accept / Edit / Reject?"
- **Rewrite Constraints:** LLM must preserve all factual content, metrics, dates, and company names; only terminology may change

**Customization Workflow:**
1. Extract and categorize job requirements (must-have vs. nice-to-have)
2. Map to Master_CV_Data using semantic similarity + keyword matching
3. Generate relevance scores for each experience/skill
4. Present suggested content customizations for approval:
   - **Reordered experience bullets** — The system proposes a relevance-ranked ordering of achievement bullets within each job entry based on keyword overlap with the target job description. The proposed order is shown as a numbered preview (e.g., "Proposed order: 3 → 1 → 2") with a relevance score for each bullet. The user may accept the proposed order, drag-and-drop or use up/down controls to choose their own order, or keep the original. When LLM relevance confidence is low (score < 0.5), the original order is kept and no reorder is proposed. Display order is stored in `metadata.json` but does not modify `Master_CV_Data.json` — the reordering is per-session only.
   - Emphasized skills sections
   - Recommended content additions/omissions
5. Generate LLM-proposed text rewrites and present for approval as before/after diffs:
   - Professional summary rewrite with job-targeted keywords
   - Individual experience bullet rewrites substituting job terminology
   - Skills list updates:
     * Terminology adjustments: existing skill renamed to match job posting phrasing
     * Additions: new skill entry derived from job description, with citation of the experience(s) that evidence it
     * Each proposed addition flags whether evidence is strong (clearly demonstrated) or weak (candidate to confirm)
   - Each rewrite shows: original text, proposed text, keywords introduced, and rationale
6. User accepts, edits, or rejects each proposed rewrite individually
7. Run spell and grammar check on the full set of finalized text fields (see §Spell & Grammar Check);
   user accepts, rejects, or adds flagged words to the custom dictionary
8. Allow iterative refinement before generation

### 2. Archive & Storage Strategy

**Naming Convention:** `CV_{CompanyName}_{Role}_{Date}.{ext}`
- CompanyName: CamelCase, no spaces
- Role: Abbreviated (e.g., SrDataScientist, MLEngineer)
- Date: YYYY-MM-DD format
- Examples: `CV_Genentech_SrBiostatistician_2025-12-15.pdf`

**Directory Structure:**
```
CV/
├── Master_CV_Data.json                    # Master data file
├── publications.bib                       # BibTeX publications
├── REQUIREMENTS.md                        # This file
├── scripts/                               # Python scripts
│   ├── generate_cv.py
│   ├── generate_cover_letter.py
│   ├── parse_job_description.py
│   └── utils/
└── files/
    └── Genentech_SrBiostatistician_2025-12-15/                     # Generated, data, metadata & outputs
        ├── CV_Genentech_SrBiostatistician_2025-12-15.html
        ├── CV_Genentech_SrBiostatistician_2025-12-15.pdf
        ├── CV_Genentech_SrBiostatistician_2025-12-15_ATS.docx
        ├── CoverLetter_Genentech_2025-12-15.docx
        ├── metadata.json                                           # Generation metadata
        ├── job_description.txt                                     # Original job posting
        ├── customizations.json                                     # Applied customizations
        ├── screening_questions.txt                                 # If applicable
        └── screening_responses.docx                                # If applicable
# Global (not per-session):
~/CV/response_library.json                                  # Indexed prior screening responses (cross-session reuse)
```

**Metadata Schema (`metadata.json`):**
```json
{
  "generation_date": "2025-12-15T14:30:00Z",
  "company": "Genentech",
  "role": "Senior Biostatistician",
  "job_url": "https://...",
  "clarification_answers": {
    "emphasis": "technical_ic",
    "include_publications": true,
    "selected_publications": [
      {"cite_key": "warnes2023genomics", "relevance_score": 0.91, "rationale": "Directly addresses RNA-Seq pipeline requirement"},
      {"cite_key": "warnes2021bioconductor", "relevance_score": 0.78, "rationale": "R/Bioconductor domain match"}
    ],
    "tone_preference": "pharma_biotech"
  },
  "customizations": {
    "role_type": "technical_ic",
    "domain_focus": "genomics",
    "emphasized_skills": ["RNA-Seq", "Biostatistics", "R/Bioconductor"],
    "selected_achievements": [1, 3, 5],
    "experience_order": ["custom"]
  },
  "files_generated": [
    "CV_Genentech_SrBiostatistician_2025-12-15.html",
    "CV_Genentech_SrBiostatistician_2025-12-15.pdf",
    "CV_Genentech_SrBiostatistician_2025-12-15_ATS.docx",
    "CoverLetter_Genentech_2025-12-15.docx"
  ],
  "cover_letter_text": "[body paragraphs only — salutation and closing are re-generated per session from the hiring manager name field]",
  "cover_letter_reused_from": null,
  "screening_responses": [
    {
      "question": "Describe your ML productionization experience.",
      "topic_tag": "ml_productionization",
      "format": "STAR",
      "response_text": "[finalized response text...]",
      "reused_from_session": null
    }
  ],
  "rewrite_audit": [],
  "spell_audit": [],
  "layout_instructions": [
    "Move Publications to after the Skills section.",
    "Keep the Genentech entry on one page — don't split it across pages."
  ],
  "status": "sent",
  "notes": "Applied for genomics platform role"
}
```

### 3. Master Data Schema (Master_CV_Data.json)

**Proposed Structure:**

```json
{
  "personal_info": {
    "name": "Gregory R. Warnes, Ph.D.",
    "title": "Senior Bioinformatics & Machine Learning Scientist",
    "contact": {
      "email": "consulting@warnes.net",
      "phone": "585-678-6661",
      "address": {
        "street": "123 Main Street",
        "city": "Rochester",
        "state": "NY",
        "zip": "14623",
        "display": "full"
      },
      "linkedin": "https://linkedin.com/in/gregorywarnes",
      "website": "http://warnes.net"
    },
    "languages": [
      {"language": "English", "proficiency": "Native"},
      {"language": "French", "proficiency": "Professional"}
    ]
  },
  
  "professional_summaries": {
    "default": "Senior Machine Learning Scientist and Analytic Architect...",
    "data_science_leadership": "Data Science Leader with 25+ years...",
    "biostatistics_ic": "Biostatistician specializing in genomics and clinical trial analysis...",
    "ml_engineering": "ML Engineer with expertise in productionizing scalable pipelines..."
  },
  
  "education": [
    {
      "degree": "Ph.D.",
      "field": "Biostatistics",
      "institution": "University of Washington",
      "location": {"city": "Seattle", "state": "WA"},
      "start_year": 1995,
      "end_year": 2000,
      "relevant_for": ["all"]
    }
  ],
  
  "experience": [
    {
      "id": "exp_001",
      "title": "Chief Scientific Officer",
      "company": "TNT³",
      "location": {"city": "Remote", "state": null},
      "start_date": "2024-01",
      "end_date": "2025-12",
      "employment_type": "full_time",
      "tags": ["leadership", "ml", "algorithmic_trading"],
      "audience": ["executive", "technical"],
      "domain_relevance": ["data_science", "ml_engineering"],
      "importance": 9,
      
      "achievements": [
        {
          "id": "ach_001_001",
          "text": "Led the development and prototyping of automated trading systems based on collaborative AI and machine learning, working closely with engineering teams to productionize algorithms.",
          "keywords": ["AI", "machine learning", "productionize", "algorithms", "engineering leadership"],
          "metrics": ["team collaboration", "system deployment"],
          "tags": ["leadership", "ml", "productionization"],
          "importance": 8,
          "relevant_for": ["leadership", "ml_engineering", "data_science"]
        }
      ]
    }
  ],
  
  "skills": {
    "core_expertise": {
      "category": "Core Expertise",
      "skills": [
        {
          "name": "Data Science",
          "proficiency": "expert",
          "years": 25,
          "keywords": ["data science", "statistical analysis", "predictive modeling"],
          "relevant_for": ["data_science", "ml_engineering"]
        },
        {
          "name": "Biostatistics",
          "proficiency": "expert",
          "years": 25,
          "keywords": ["biostatistics", "clinical trials", "experimental design"],
          "relevant_for": ["biostatistics", "genomics"]
        }
      ]
    },
    "scientific_genomics": {
      "category": "Scientific & Genomics",
      "skills": [
        {
          "name": "RNA-Seq, scRNA-Seq",
          "proficiency": "expert",
          "years": 15,
          "keywords": ["RNA-Seq", "scRNA-Seq", "single-cell", "transcriptomics"],
          "relevant_for": ["genomics", "biotech", "pharma"]
        }
      ]
    }
  },
  
  "selected_achievements": [
    {
      "id": "sa_001",
      "title": "Productionizing Analytic Infrastructure",
      "description": "Co-founded Revolution Analytics (acquired by Microsoft), creating the industry standard for enterprise-grade R deployment. Architected RStatServer to operationalize statistical models.",
      "keywords": ["productionization", "enterprise", "R", "Microsoft", "architecture"],
      "metrics": ["company acquisition", "industry standard"],
      "importance": 10,
      "relevant_for": ["leadership", "data_science", "ml_engineering"],
      "show_for_roles": ["leadership", "principal", "staff"]
    }
  ],
  
  "awards": [
    {
      "title": "Pfizer Global Achievement Award",
      "year": 2004,
      "description": "For development of MiDAS Genomic Workflow System",
      "relevant_for": ["genomics", "pharma", "leadership"]
    }
  ],
  
  "publications_file": "publications.bib",
  "patents": "See publications.bib"
}
```

**Tagging System:**
- **audience:** ["technical", "executive", "research", "business"]
- **domain_relevance:** ["data_science", "biostatistics", "genomics", "ml_engineering", "leadership"]
- **importance:** 1-10 scale (10 = always include, 1 = rarely include)
- **relevant_for:** List of role types where this content is most valuable

**Master Data Update Flows:**

The master data (`Master_CV_Data.json`) may be updated via two complementary mechanisms. Neither mechanism writes any change without explicit per-field user approval.

*3a. Natural-Language (NL) Update Flow*

Triggered by user request at any time (standalone or as part of Session Master Data Harvest — see §7 step 12).

1. **Candidate gathering:** Collect all potential updates from two sources:
   - **Session-derived suggestions:** During the current (or most recent) CV generation session the LLM may have proposed rewrites, new skills, summary variants, or skills renamed to match job terminology that were approved by the user and are materially better than the current master text. These are automatically presented as recommended candidates for write-back.
   - **User NL input:** The user may additionally describe changes in plain English (e.g., "Add PyTorch with 3 years experience", "Update my title to Principal Scientist", "Remove the 2010 contract role").
2. **LLM parsing:** All candidates — session-derived and user-described — are sent to the LLM together. The LLM produces a structured JSON diff: a list of proposed `{path, old_value, new_value, source, rationale}` objects.
3. **Diff review UI:** The proposed diff is presented field-by-field as a before/after table. Each item is opt-in (nothing pre-selected). The user may accept, edit, or reject each change individually.
4. **Consolidated write:** After all fields are reviewed, a summary of accepted changes is shown. On confirmation, all accepted changes are written to `Master_CV_Data.json` in a single atomic operation.
5. **Git commit:** After the write, commit with message `chore: Update master CV data from {Company}_{Role}_{Date} session` (or `chore: Manual master CV data update – {Date}` for standalone updates). See §7 step 11 for error-handling rules.

*3b. Document Ingestion Flow*

Allows the user to import an existing CV document (e.g., a Word or plain-text CV from another source) to extend or refresh the master data.

1. **Input:** User pastes plain text or uploads a DOCX/HTML/PDF file.
2. **Extraction:** LLM parses the document and maps content to `Master_CV_Data.json` fields (personal info, experience entries, skills, education, achievements, publications).
3. **Diff review:** Extracted content is shown as a diff against the current master — new items, modified items, and potential duplicates are flagged. The user approves per-section, not per-field (to keep the review tractable for large documents).
4. **Deduplication check:** Before writing, the system checks for duplicate experience entries (same company + overlapping dates) or duplicate skills (see §3 Canonical Skills). Conflicts are surfaced for user resolution.
5. **Write and commit:** Same single-write + git commit flow as NL update.

### 4. Cover Letter Generation

**Template Structure:**
```
[Your Address]
[Date]

[Hiring Manager Name/Title]
[Company Name]
[Company Address]

Dear [Hiring Manager],

[Opening Paragraph: Hook + Role Interest]
[Body Paragraph 1: Relevant Experience Match]
[Body Paragraph 2: Key Achievement/Value Proposition]
[Body Paragraph 3: Cultural/Company Fit]
[Closing Paragraph: Call to Action]

Sincerely,
Gregory R. Warnes, Ph.D.
```

**Required Sections:**
- Addressee information
- Opening paragraph (connection/interest in role)
- 2-3 body paragraphs (experience matches + value)
- Closing with call to action
- Signature

**Optional Sections:**
- Specific project/achievement highlight (if highly relevant)
- Research about company/recent news mention
- Referral name-drop (if applicable)

**Length Guidelines:**
- **Standard:** 3/4 to 1 page (300-400 words)
- **Executive:** 1 full page (400-500 words)
- **Research/Academic:** 1-1.5 pages (500-600 words)

**Tone Matching:**
- **Startup/Tech:** Energetic, innovative, direct
- **Pharma/Biotech:** Professional, scientific, achievement-focused
- **Academia:** Scholarly, methodology-focused, collaborative
- **Financial Services:** Precision, results-driven, conservative
- **Leadership Roles:** Strategic vision, organizational impact

**Integration with Job Description:**
1. Extract company values/culture indicators
2. Identify 2-3 key requirements to address
3. Match achievements to their specific needs
4. Mirror their language/terminology
5. Reference specific company projects/initiatives when possible

**Storage and Reuse:**
- The finalized cover letter **body text** (hook + value paragraphs + CTA — not the salutation "Dear X," or the closing "Sincerely,") is stored in `metadata.json` under `cover_letter_text` in addition to the `.docx` file. The salutation and closing are re-generated per session using the hiring manager name field, so the stored body paragraphs are cleanly reusable across different applications.
- When starting a new cover letter, the system searches prior sessions for cover letters with the same `tone_preference` or targeting the same `role_type`; if found, it surfaces the best match with a "Use as starting point?" prompt.
- The prior cover letter is offered as an editable draft pre-filled in the text area, not applied silently.
- Prior cover letter reuse is tracked in `metadata.json` as `cover_letter_reused_from: "<prior_session_id>"` (or `null` if written from scratch).

### 6. Spell & Grammar Check

**Purpose:** Catch spelling errors, typos, and grammatical issues in the assembled CV content after all LLM rewrites have been applied and approved, but before document generation. The user has full control over every correction — no change is applied without explicit approval.

**Scope of Checking:**
All text fields that appear in generated output are checked:
- Professional summary
- Experience achievement bullets
- Selected achievements
- Skills display names (spelling only; grammar rules not applied to single words/phrases)
- Cover letter body (when present)
- Screening question responses (when present)

**Context Types and Rule Sets:**

| Context type | Sentence-completeness rule | Typical issues checked |
|---|---|---|
| `summary` | Required (complete sentences) | Spelling, grammar, punctuation, agreement |
| `bullet` | Not required (fragment OK) | Spelling, punctuation, verb tense consistency |
| `skill_name` | Not required (word/phrase) | Spelling only |
| `cover_letter` | Required (complete sentences) | Spelling, grammar, punctuation, agreement |
| `screening_response` | Required (complete sentences) | Spelling, grammar, punctuation, agreement |

The checker must **not** raise "sentence fragment" or "missing subject" warnings for `bullet` or `skill_name` contexts. It must recognize that bullet points beginning with imperative verbs ("Led…", "Designed…") are grammatically complete in their context.

**Custom Dictionary:**
- Stored at `~/CV/custom_dictionary.json` as a simple list of strings
- Pre-populated with the candidate's name, common technical acronyms, and company names from `Master_CV_Data.json` at first run
- User can add words via the "Add to Dictionary" action during any review session
- The dictionary is shared across all CV generation sessions (global, not per-job)
- Words in the dictionary are never flagged, regardless of context

**Per-Suggestion User Actions:**

| Action | Effect |
|---|---|
| **Accept** | Apply the suggested correction; update the in-memory content field |
| **Reject** | Leave the original text unchanged; mark flag as resolved |
| **Edit** | Open the text in an inline textarea; user saves their own correction |
| **Add to Dictionary** | Add the flagged word to `custom_dictionary.json`; suppress this flag and any future occurrence |

Accept/Reject must be done item-by-item. Bulk "Accept All" is allowed only after all items have been individually reviewed. No change is written to a generated file until explicitly accepted.

**Spell/Grammar Audit Trail:**
- Record each flagged item and its outcome (accepted/rejected/edited/added-to-dictionary) in `spell_audit` within `metadata.json`
- Format mirrors `rewrite_audit`:
  ```json
  "spell_audit": [
    {
      "context_type": "bullet",
      "location":     "exp_001.achievements[2]",
      "original":     "Leveraged synergetic algorithms",
      "suggestion":   "Leveraged synergistic algorithms",
      "rule":         "SPELLING",
      "outcome":      "accept",
      "final":        "Leveraged synergistic algorithms"
    }
  ]
  ```

**Implementation Notes:**
- Use `language-tool-python` (LanguageTool) as the primary checker — it supports context-aware rule suppression, custom dictionaries, and both spelling and grammar in a single pass
- Suppress LanguageTool rule IDs for fragment-related rules (`SENTENCE_FRAGMENT`, `MISSING_VERB`) for `bullet` and `skill_name` contexts
- Pre-load custom dictionary words as LanguageTool disabled-words before each check pass
- Run check client-side (local LanguageTool server) to avoid sending resume text to external services

### 5. Interview Screening Questions

**Input Format:** Plain text, one question per line or paragraph

**Response Strategy (prompt user for each question):**
- **Response format:** STAR / Direct / Technical Deep-Dive
- **Target length:** Short (150-200w) / Medium (250-350w) / Long (400-500w)
- **Emphasis:** Technical details / Leadership / Business impact
- **Specific experiences to highlight:** (suggest top 3 matches)

**STAR Method Format:**
- **Situation** (2-3 sentences): Context and background
- **Task** (1-2 sentences): Your specific responsibility
- **Action** (3-4 sentences): Steps you took, decisions made
- **Result** (2-3 sentences): Quantifiable outcomes and impact

**Storage and Reuse:**
- Each finalized screening response (after user edits) is stored in `metadata.json` under `screening_responses` as a list of `{question, format, response_text}` objects, in addition to the `.docx` export.
- Each finalized response is also written to `~/CV/response_library.json`, indexed by an LLM-generated topic tag (e.g., `ml_productionization`, `leadership_conflict`, `technical_architecture`) and the role type.
- When a new screening question is entered, the system queries `response_library.json` for semantically similar past responses (same topic tag or embedding similarity above threshold) and surfaces the top match with its original question and answer as a "Similar past response" suggestion.
- The user can adopt the prior response as a starting point (pre-fills the editable text area), or ignore it and generate fresh.
- Reuse provenance is tracked in `metadata.json` as `reused_from_session: "<id>"` per question entry.

**Example Prompts to User:**
```
Question: "Describe your experience with machine learning productionization"

Suggested approach:
- Format: STAR (structured) or Direct (concise)?
- Length: Medium (250-350 words) recommended
- Emphasis: Technical + Business Impact
- Relevant experiences:
  1. Torqata Category Compass (ML SaaS) - 95% match
  2. Revolution Analytics RStatServer - 90% match
  3. TNT³ Trading Systems - 85% match
Which would you like to emphasize?
```

### 6. Technical Implementation Details

**Python Libraries:**
- **Document Generation:**
  - `jinja2`: Render `templates/cv-template.html` with `cv_data` context
  - `weasyprint` (primary): Rendered HTML → PDF conversion
  - `google-chrome --headless` (fallback): Used when WeasyPrint unavailable
  - `python-docx`: DOCX generation (basic)
  - `mammoth` or `pypandoc`: HTML → DOCX with styling
- **Google Drive API:**
  - `google-api-python-client`
  - `google-auth`, `google-auth-oauthlib`
- **Text Processing:**
  - `transformers` (HuggingFace): Semantic similarity, keyword extraction
  - `spacy`: NLP, entity recognition
  - `nltk`: Text processing utilities
  - `language-tool-python`: Context-aware spell and grammar checking with custom dictionary support
- **Data:**
  - `pybtex`: BibTeX parsing
  - `pydantic`: Data validation for JSON schemas
- **HTML/CSS:**
  - `jinja2`: Template rendering
  - `BeautifulSoup4`: HTML parsing

**ATS Compatibility Testing Strategy:**
1. **Automated Checks:**
   - Parse generated DOCX with `python-docx` - verify all text extractable
   - Check for forbidden elements (tables, images, headers)
   - Validate against ATS-friendly checklist
2. **Manual Testing:**
   - Test with free ATS scanners (Jobscan, Resume Worded)
   - Submit to actual job postings (when appropriate)
   - Review feedback reports
3. **Validation Criteria:**
   - 100% text extraction success
   - All sections correctly identified
   - Contact info properly parsed
   - Keywords accurately detected
   - Formatting doesn't interfere with parsing

### 7. Workflow & User Experience

**Step-by-Step CV Generation Process:**

1. **Initiate Request:**
   ```
   User: "Generate CV for Genentech Senior Biostatistician role"
   ```

2. **Job Analysis:**
   - Ask for job description (paste text or URL)
   - Extract requirements, keywords, qualifications
   - Present analysis: "This role emphasizes: genomics (high), R/Bioconductor (high), clinical trials (medium)"

3. **Customization Planning:**
   - Ask clarifying questions:
     * "IC or leadership focus?"
     * "Emphasize recent genomics work or broader biostatistics?"
   - Suggest customizations for approval
   - Show relevance scores for experiences

4. **Content Selection:**
   - Present proposed sections and content
   - Highlight what's included/excluded
   - Allow adjustments

5. **Text Rewrite Review:**
   - LLM generates proposed rewrites for summary, experience bullets, and skills
   - Present each proposed change as a before/after diff
   - User accepts, edits, or rejects each rewrite
   - No rewritten text enters generation without explicit approval

6. **Spell & Grammar Check:**
   - Run checker on all finalized text (summary, bullets, cover letter, screening responses)
   - Each flagged item shows: the flagged text, the suggestion, and the context type
   - Context-aware rules: bullet points and skill names are treated as sentence fragments
     (no "sentence fragment" or "missing subject" warnings for those context types)
   - User can: **Accept** suggestion, **Reject** (leave as-is), or **Add to Dictionary** (suppress future flags for that word)
   - Custom dictionary entries (names, technical terms, acronyms) persist to `~/CV/custom_dictionary.json`
   - Corrections are applied before generation; rejected flags produce no change

7. **Generate HTML Preview:**
   - Render the Jinja2 HTML template from spell/grammar-corrected content
   - Write `CV_{Company}_{Role}_{Date}.html` to the archive directory
   - Open inline preview pane automatically
   - Create/update `metadata.json` with `rewrite_audit` and `spell_audit`

8. **HTML Layout Review:**
   - Display the generated HTML in an inline preview pane alongside a **Layout Instructions** text prompt
   - Accept plain-English instructions for structural / presentational changes:
     * Section reordering ("Move Publications after Skills")
     * Page-break control ("Keep Genentech entry on one page")
     * Section relocation ("Move Selected Achievements to page 2")
     * Spacing adjustments ("Reduce bullet spacing to fit 2 pages")
   - LLM interprets each instruction and modifies HTML template/CSS or section ordering
   - Preview refreshes after each instruction; user can issue multiple instructions sequentially
   - Approved rewrite text is never altered — layout layer only
   - When satisfied (or if no changes needed), user clicks **Proceed to Final Generation** to advance
   - All applied instructions recorded in `metadata.json` under `layout_instructions` (empty array if none applied)

9. **Generate Final Output (PDF + ATS DOCX):**
   - Convert the confirmed HTML → PDF (WeasyPrint / Chrome headless fallback)
   - Generate ATS DOCX from the same confirmed content (python-docx)
   - Run validation checks on both formats
   - Present download links for all three formats (HTML already in archive)
   - Update `metadata.json` with generation timestamps for each format

10. **Review & Refinement:**
   - Open generated files in preview
   - User reviews and provides **content** feedback
   - Iterative edits:
     * "Make professional summary more technical"
     * "Add more ML keywords to skills"
     * "Reorder experience bullets for Job X"
     * Re-enter Text Rewrite Review step for any new proposed changes
   - *(For structural/layout changes return to HTML Layout Review step)*

11. **Finalization:**
   - Save to archive with metadata (including record of all accepted/rejected rewrites)
   - Upsert screening responses to `~/CV/response_library.json`
   - **Git commit:** Stage and commit the following files with message `feat: Add {Company}_{Role}_{Date} application`:
     * All generated output files (PDF, DOCX, HTML) under the job-specific output directory
     * `metadata.json` for the session
     * `~/CV/response_library.json` (if updated)
     * If git is not available or the working tree is in an unexpected state, log a warning and skip the commit rather than failing the finalization step
   - **Google Drive sync:** Not implemented — git commit is the archiving mechanism.
   - Mark status (draft/ready/sent)

12. **Session Master Data Harvest (optional):**
   - After finalise, present candidate write-back items compiled from this session:
     * Approved rewrites materially better than the original master text
     * New or renamed skills approved during skills review
     * Approved professional summary variants
     * Skills revealed by clarification answers to mismatch questions
   - Each item shown as before/after diff with rationale; all opt-in (nothing pre-selected)
   - Consolidated JSON diff shown before any write
   - On confirmation: write `Master_CV_Data.json`, commit `chore: Update master CV data from {Company}_{Role}_{Date} session` (same git error-handling as step 11)
   - Step is skippable if no meaningful improvements exist

**Validation Steps Before Output:**
1. **Content Validation:**
   - All required sections present
   - No placeholder text remaining
   - Dates consistent and properly formatted
   - Contact info complete
2. **ATS Validation:**
   - Text extraction successful
   - No forbidden formatting elements
   - Keywords present in appropriate sections
3. **Human-Readable Validation:**
   - Page breaks appropriate
   - No orphaned lines
   - Visual styling consistent
   - Links functional (PDF/DOCX)
4. **File Validation:**
   - All requested formats generated
   - Files open correctly
   - Naming convention followed
5. **Page Length Validation:**
   - Estimated page count is within the 1.5–3 page target range
   - Estimation method: rendered HTML page height divided by A4/Letter page height (preferred), or character-count heuristic (≈ 3 000–6 000 chars for 1.5–3 pages) as fallback when a headless browser is unavailable
   - **Warn** (non-blocking download): estimated length < 1.5 pages or > 3 pages
   - Warning message shown in the validation report alongside ATS results; user may proceed or return to the content customisation step to adjust
   - Page count estimate and warn/pass result are recorded in `metadata.json` under `validation.page_length`

**Error Handling & User Feedback:**
- **Clear error messages:** "Cannot parse job description - please provide plain text"
- **Warnings:** "Page 1 overflow detected - suggesting reduced achievements"
- **Progress indicators:** "Analyzing job description... Extracting keywords... Matching experiences..."
- **Validation results:** "✓ ATS check passed" "⚠ Minor formatting adjustment needed"
- **Suggestions:** "Consider adding 'scRNA-Seq' keyword - appears 3x in job description"

### 8. Success Metrics

**ATS Compatibility Measurement:**
1. **Parsing Success Rate:**
   - Test with 3+ free ATS scanners
   - Target: 100% text extraction
   - Target: 95%+ keyword match accuracy
2. **Section Recognition:**
   - All sections correctly identified by ATS
   - Contact info properly extracted
   - Dates and locations parsed accurately
3. **Formatting Score:**
   - No warnings about formatting issues
   - Clean text-only validation passes

**Quality Criteria for Generated Content:**
1. **Keyword Optimization:**
   - 80%+ of required job keywords present
   - Keywords appear via rewritten text using job's own terminology, not only appended sentences
   - Natural integration (no keyword stuffing detected)
   - Variations included (e.g., "ML" and "Machine Learning")
   - All rewrites traceable to user-approved changes
2. **Relevance Scoring:**
   - Selected experiences have 85%+ relevance to job
   - Bullets reordered to prioritize matches
   - Professional summary rewritten to target job requirements using job-specific language
3. **Completeness:**
   - All required sections present
   - No missing data or placeholders
   - Appropriate length (2-3 pages for senior roles)
4. **Professional Polish:**
   - No typos or grammatical errors
   - Consistent formatting and style
   - Quantifiable metrics included where possible
5. **Visual Quality (Human-Readable):**
   - Page layout balanced and professional
   - No layout issues (overflow, orphaned content)
   - Color scheme and typography consistent

**Testing Approach for Different ATS Systems:**
1. **Free ATS Scanners:**
   - Jobscan.co
   - Resume Worded
   - TopResume ATS checker
2. **Format Variations:**
   - Test .docx (primary)
   - Test .pdf (if accepted)
3. **Validation Process:**
   - Upload to 3+ different scanners
   - Compare parsing results
   - Document any inconsistencies
   - Adjust formatting if issues detected
4. **Continuous Improvement:**
   - Track success rates by ATS system
   - Maintain compatibility database
   - Update guidelines based on feedback





------------------

1. Job Description Matching & Customization Workflow

- How should the system analyze job descriptions? Automatic extraction asking me questions for clarification.

- Highlight which experiences best match requirements.

- Suggest customizations for approval.

- Use both approaches—semantic matching to find relevant content, then keyword optimization to ensure ATS compatibility.

2. Archive & Storage Strategy

- Naming convention for generated files `CV_{CompanyName}_{Role}_{Date}.{ext}`.
- Directory structure for archives: Original files in `CV`, archive of generated files in `CV/files`, scripts in `CV/scripts`
- Metadata to store with each generated CV (job posting, date, customizations made)
    - Store all material (except the base `Master_CV_Data.json`) used to generate each `CV_{CompanyName}_{Role}_{Date}` in a folder `CV/CV_{CompanyName}_{Role}_{Date}_resources/`, with metadata in `CV/CV_{CompanyName}_{Role}_{Date}_resources/metadata.json`.
- Google Drive will contain all current files.
- Git will be used for version control of all files.

3. Master Data Schema (Master_CV_Data.json)
- Structure for experience entries (job-level vs. individual achievements) - Make a suggestion
- How to tag content for different audiences (technical/executive, DS/biostat) - Make a suggestion
- Skill categorization and tagging system - Make a suggestion
- How to indicate importance/relevance levels for different role types - Make a suggestion
- Storage of multiple professional summary variants - Make a suggestion
- Contact information variations (full address vs. city only) - For my contact information, full address.  For company location, city + state only (if needed)
- Publication and patent data structure - Use a bibtex file

4. Cover Letter Generation
- Template structure and styling - Make a suggestion
- Required vs. optional sections - Make a suggestion
- Length guidelines - Make a suggestion
- How to match tone to company/role type - Make a suggestion
- Integration with job description analysis - Make a suggestion

5. Interview Screening Questions
- Input format expectations: text
- Response length guidelines - prompt me
- How to select relevant experience for each question - prompt me
- Format for presenting responses: For screening questions, prompt me to choose between:
  - Direct/Concise (2-3 paragraphs, ~150-200 words)
  - STAR Format (structured, ~250-350 words)
  - Detailed Technical (in-depth, ~400-500 words)

6. Technical Implementation Details
- Python libraries/frameworks to use for document generation - 
- How to handle Google Docs file access: API
- PDF generation approach: HTML→PDF
- DOCX generation with complex styling preservation: HTML→DOCX
- Testing strategy for ATS compatibility - Make a suggestion

7. Workflow & User Experience
- Step-by-step process for generating a new CV - Make a suggestion
- Handle iterative refinement: (review→edit→regenerate) 
- Validation steps before final output - Make a suggestion
- Error handling and user feedback - Make a suggestion

8. Success Metrics
- How to measure ATS compatibility - Make a suggestion
- Quality criteria for generated content - Make a suggestion
- Testing approach for different ATS systems - Make a suggestion