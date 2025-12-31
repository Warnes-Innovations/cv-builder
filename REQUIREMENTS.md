# LLM driven custom CV generator

## Goal

Create an LLM-driven tool for creating and maintaining a master file of my CV material, generating customizd CVs for different job areas (e.g. Data Science vs Biostatistics, Individual Contributor vs Leadership), and specific job opportunities.

## User Interface

The system will use VSCode as the UI with GitHub Copilot acting as the conversational interface for all interactions.

## Requirements

### Data Managenent

1. Maintain the master data file `Master_CV_Data.json` to serve as a master data of job experience, skills, achievements, contact information, and other materials.
2. Allow updating the master data file using natural language interactions, including ingestion of existing documents.
3. Preserve an archive of generated materials to allow for reference and future reuse.
4. Leverage Git/GitHub for revision management of text and code resources.
5. Use Google Drive (either directly or via the local mirror in /Users/warnes/Google Drive@ -> /Users/warnes/Library/CloudStorage/GoogleDrive-greg@warnes.net) to store all 'current' files.  **This will require a python script to access the contents of .gdoc files.**

### CV and Cover Letter Generation

1. Allow the user to provide a target job or job area description, asking sufficent questions to fully understand the target and the user's desired approach.
2. Generate a clean .DOCX CV file intended for machine parsing (e.g. by Applicant Management Systems (AMS)) following ATS optimization guidelines (see below).
3. Generate well-formatted PDF and DOCX files intended for human reviewers (e.g. HR Hiring Manager, Interviewers) following the human-readable CV guidelines (see below).
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
- Publications (if applicable)

### Formatting Rules

**Text Formatting:**
- Use basic bold for emphasis only (no italics, underline, or mixed)
- Simple bullet points (•) only
- No special characters or symbols
- Standard date formats: "January 2020–Present" or "01/2020–Present"
- No abbreviations without spelling out first: "Master of Business Administration (MBA)"

**Content Structure:**
- Contact info: Name, City/State, Phone, Email, LinkedIn URL (optional)
- Each job entry: Job Title | Company Name | Location | Dates
- Use bullet points for achievements (not paragraphs)
- Include both acronyms AND full terms: "Machine Learning (ML)"

### Keyword Optimization Strategy

**For Each Job Application:**
1. Extract key terms from job description (skills, tools, qualifications)
2. Identify required vs. preferred qualifications
3. Map job requirements to candidate's experience
4. Naturally incorporate keywords into:
   - Professional Summary (2-3 sentences with top qualifications)
   - Skills section (exact matches to job posting)
   - Work Experience bullets (action verb + keyword + result)
5. Use exact job posting language where truthful
6. Include variations: "project management" and "project manager"

**Keyword Placement Priority:**
1. Skills section (for quick scanning)
2. Professional Summary (for context)
3. Work Experience bullets (for proof)
4. Job titles (if accurate to actual role)

### Content Guidelines

**Professional Summary:**
- 4-6 lines for senior-level candidates
- Include: years of experience, key expertise areas, leadership scope, strategic impact
- Emphasize breadth and depth of experience
- Use keywords from target job description
- Highlight level of responsibility and scale of impact

**Work Experience:**
- Focus on achievements with quantifiable results
- Start bullets with strong action verbs
- Include metrics where possible: "$2M revenue", "50+ daily calls", "team of 15"
- Emphasize contributions matching job requirements
- For senior roles, emphasize leadership, strategy, and organizational impact

**Skills Section:**
- List as simple text (not tables)
- Group by category if needed: "Technical Skills:", "Leadership Skills:", "Domain Expertise:"
- Use one or two-word phrases that match job posting
- Include both hard skills and relevant soft skills

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
2. Map requirements to candidate's Master_CV_Data
3. Select most relevant experiences and achievements
4. Reorder/emphasize content based on job priorities
5. Incorporate exact keywords naturally
6. Generate clean, parseable DOCX
7. Validate: Can all text be selected/copied as plain text?

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
  - Publications section (optional, if space allows)

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

### File Generation

**Output Formats:**
- **PDF**: Primary format, preserving exact visual styling and colors
- **DOCX**: Secondary format with equivalent styling using Word styles

**Quality Checks:**
1. All pages exactly US Letter size
2. No orphaned lines or split job entries
3. Consistent spacing and alignment
4. All links functional (in digital versions)
5. Background colors render correctly in PDF
6. Font embedding for consistent display

## Detailed Implementation Specifications

### 1. Job Description Matching & Customization Workflow

**Analysis Approach:**
- Automatic extraction of keywords, required skills, preferred qualifications, and key responsibilities
- Ask clarifying questions when ambiguity exists (e.g., "Do you want to emphasize leadership or technical IC aspects?")
- Highlight which experiences best match requirements with relevance scores

**Keyword vs. Semantic Understanding:**
- **Keyword Matching:** Identify exact phrases from job description for ATS optimization
- **Semantic Understanding:** Recognize related concepts (e.g., "MLOps" ≈ "productionizing ML pipelines")
- **Approach:** Use semantic matching to find relevant content, then optimize with exact keywords
- **User Interaction:** Suggest paraphrasing options: "Job requires 'MLOps'—emphasize your Torqata productionization work?"

**Customization Workflow:**
1. Extract and categorize job requirements (must-have vs. nice-to-have)
2. Map to Master_CV_Data using semantic similarity + keyword matching
3. Generate relevance scores for each experience/skill
4. Present suggested customizations for approval:
   - Reordered experience bullets
   - Emphasized skills sections
   - Tailored professional summary
   - Recommended content additions/omissions
5. Allow iterative refinement before generation

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
        ├── CV_Genentech_SrBiostatistician_2025-12-15.pdf
        ├── CV_Genentech_SrBiostatistician_2025-12-15_ATS.docx
        ├── CV_Genentech_SrBiostatistician_2025-12-15_Human.docx
        ├── CoverLetter_Genentech_2025-12-15.docx
        ├── metadata.json                                           # Generation metadata
        ├── job_description.txt                                     # Original job posting
        ├── customizations.json                                     # Applied customizations
        ├── screening_questions.txt                                 # If applicable
        └── screening_responses.docx                                # If applicable
```

**Metadata Schema (`metadata.json`):**
```json
{
  "generation_date": "2025-12-15T14:30:00Z",
  "company": "Genentech",
  "role": "Senior Biostatistician",
  "job_url": "https://...",
  "customizations": {
    "role_type": "technical_ic",
    "domain_focus": "genomics",
    "emphasized_skills": ["RNA-Seq", "Biostatistics", "R/Bioconductor"],
    "selected_achievements": [1, 3, 5],
    "experience_order": ["custom"]
  },
  "files_generated": [
    "CV_Genentech_SrBiostatistician_2025-12-15.pdf",
    "CV_Genentech_SrBiostatistician_2025-12-15_ATS.docx",
    "CV_Genentech_SrBiostatistician_2025-12-15_Human.docx",
    "CoverLetter_Genentech_2025-12-15.docx"
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
  - `weasyprint` or `pdfkit`: HTML → PDF conversion
  - `python-docx`: DOCX generation (basic)
  - `mammoth` or `pypandoc`: HTML → DOCX with styling
- **Google Drive API:**
  - `google-api-python-client`
  - `google-auth`, `google-auth-oauthlib`
- **Text Processing:**
  - `transformers` (HuggingFace): Semantic similarity, keyword extraction
  - `spacy`: NLP, entity recognition
  - `nltk`: Text processing utilities
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

5. **Generation:**
   - Generate all formats (ATS DOCX, Human PDF/DOCX)
   - Run validation checks
   - Present output files

6. **Review & Refinement:**
   - Open generated files in preview
   - User reviews and provides feedback
   - Iterative edits:
     * "Make professional summary more technical"
     * "Add more ML keywords to skills"
     * "Reorder experience bullets for Job X"

7. **Finalization:**
   - Save to archive with metadata
   - Commit to Git
   - Mark status (draft/ready/sent)

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
   - Natural integration (no keyword stuffing detected)
   - Variations included (e.g., "ML" and "Machine Learning")
2. **Relevance Scoring:**
   - Selected experiences have 85%+ relevance to job
   - Bullets reordered to prioritize matches
   - Professional summary targets job requirements
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