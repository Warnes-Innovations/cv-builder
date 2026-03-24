# User Story: HR Staffer / ATS Perspective
**Persona:** An HR coordinator who evaluates both the application workflow that produces submission artifacts and what an Applicant Tracking System (ATS) sees before human review  
**Scope:** Two linked evaluations: (1) whether the application guides the user toward ATS-safe outputs, and (2) what the ATS sees, parses, and surfaces — and what it silently suppresses or misreads  
**Format:** Parse-path walk-through with ATS failure modes and checklist validation criteria, while keeping application-review findings separate from output-review findings

---

## US-H1: ATS File Ingestion

**As an** HR staffer,  
**I want** the submitted materials to be ingested without errors by the ATS (Workday, Greenhouse, Lever, iCIMS, Taleo),  
**So that** the applicant's record is created correctly and the resume reaches the review queue.

**Three formats are generated; HR typically receives one or two of them:**

| Format | Primary use | ATS ingestion path |
|--------|------------|-------------------|
| `*_ATS.docx` | ATS upload portal | Parsed directly by ATS file parser |
| `*.pdf` | Email / print submission | PDF-to-text extraction by ATS (less reliable) |
| `*.html` | Browser preview / email body | Structured metadata via JSON-LD `<script>` in `<head>` (modern ATS / search engines) |

> **Recommendation:** Always submit the `_ATS.docx` to ATS portals. Use the `.pdf` for human-email submissions. The `.html` is the authoritative preview and contains Schema.org/Person structured data.

**What the ATS Does (DOCX path — traditional ATS):**
- Opens the `_ATS.docx` file using its internal parser (not Microsoft Word).
- Extracts all text content in reading order.
- Attempts to identify document structure via heading styles (Heading 1, Heading 2) or bold text patterns.
- Stores extracted text in a structured database record.

**What the ATS Does (HTML path — modern ATS / Google for Jobs):**
- Fetches or receives the `.html` file.
- Parses the `<script type="application/ld+json">` block in `<head>` for Schema.org/Person structured data.
- Extracts: name, email, phone, occupation (`hasOccupation`), skills (`knowsAbout`), education (`alumniOf`), awards, LinkedIn URL (`sameAs`).
- This path is less common for traditional HR portals but increasingly used by modern ATS and job aggregators.

**ATS Failure Modes to Guard Against:**

| Element | ATS Behaviour | Required Fix |
|---------|--------------|--------------|
| Tables  | Text extracted in wrong order or skipped | ❌ No tables — use plain paragraphs |
| Text boxes / shapes | Invisible to ATS | ❌ No text boxes |
| Headers/footers | Often skipped entirely | ❌ Contact info must be in body |
| Multi-column layout | Left column read, right column appended at end — garbled | ❌ Single column only |
| Graphics / inline images | Silently ignored | ❌ No graphics |
| Custom fonts | May fail to render, causing garbled characters | ❌ Arial / Calibri / Times New Roman only |
| Hyperlinks | URL text may be replaced by display text | Spell out full URL as plain text |
| Invisible/white text | ATS may still read it (keyword stuffing detected) | ❌ Never use invisible text |

**Acceptance Criteria for ATS DOCX:**
- Single-column layout; zero tables, text boxes, or multi-column sections in the DOCX.
- Contact information in the document body (first paragraph), not in a Word header/footer.
- All fonts are Arial, Calibri, or Times New Roman at 10–12pt.
- All URLs are spelled out as plain text (no formatted hyperlinks).
- ATS text extraction test: 100% of text selectable and copyable as plain text.

---

## US-H2: ATS Section Recognition

**As an** HR staffer,  
**I want** the ATS to correctly identify all standard resume sections,  
**So that** the candidate's experience, education, and skills are correctly categorised in the ATS record.

**What the ATS Does:**
- Scans for known section heading strings.
- Associates following paragraphs with that section until the next heading.
- Populates structured fields in the ATS database: `experience[]`, `education[]`, `skills[]`, etc.

**Required Section Headings (exact labels):**
| Section | Accepted Label | Rejected Labels |
|---------|---------------|-----------------|
| Contact | "Contact Information" (body, not header) | Name-only block with no label |
| Summary | "Professional Summary" or "Objective" | "About Me", "Profile", "Who I Am" |
| Experience | "Work Experience" or "Professional Experience" | "Career History", "My Journey" |
| Education | "Education" | "Academic Background" |
| Skills | "Skills", "Technical Skills", or "Core Competencies" | "What I Know", "Toolkit" |
| Publications | "Publications" | "Selected Publications", "Papers", "Research Work" |
| Certifications | "Certifications" | "Credentials" |

**ATS Failure Modes:**
- Non-standard heading → section content deposited in "Other" or lost entirely.
- Abbreviation in heading ("Prof. Summary") → section not recognised by some ATS.
- Heading formatted as plain bold paragraph rather than Word Heading style → inconsistent recognition.

**Acceptance Criteria:**
- Generated DOCX uses `Heading 1` Word style for all section headings.
- Heading text matches exactly one of the accepted labels in the table above.
- No creative section names appear in the ATS DOCX (only in human PDF).

---

## US-H3: Contact Information Parsing

**As an** HR staffer,  
**I want** the ATS to extract a complete, correctly formatted contact record,  
**So that** the candidate can be contacted and their record is complete for compliance purposes.

**What the ATS Parses:**
- Name (first + last)
- Email address
- Phone number
- Location (city, state at minimum)
- LinkedIn URL (some ATS systems)

**Required Format:**
```
Gregory R. Warnes, Ph.D.
Rochester, NY | 585-678-6661 | consulting@warnes.net | linkedin.com/in/gregorywarnes
```

**ATS Failure Modes:**
- Candidate name is in UPPERCASE or lowercase 
- Ph.D. credential in name field → some ATS strip it, creating name mismatch.
- Full street address → some ATS treat it as a searchable field; privacy risk.
- Phone formatted as (585) 678-6661 with parentheses → inconsistent across ATS.
- Email and phone on different lines → some ATS parse only first line.
- LinkedIn URL as a hyperlink only → some ATS do not follow hyperlinks.

**Acceptance Criteria:**
- Contact block is the first content in the document body.
- Name, city/state, phone, email on first 1–2 lines.
- Phone formatted as `585-678-6661` (no parentheses).
- LinkedIn URL spelled out as plain text.
- No full street address in ATS DOCX (city + state only, per REQUIREMENTS.md).
- Credentials (Ph.D.) appear after name with comma separator.

---

## US-H4: Keyword Matching and Scoring

**As an** HR staffer,  
**I want** the ATS keyword match score to be as high as possible for the target role,  
**So that** the resume passes the automated screener and reaches human review.

**How ATS Keyword Scoring Works (DOCX path — traditional ATS):**
1. Employer loads required keywords from the job description (or manually enters them).
2. ATS scans resume text for exact string matches and close variants.
3. A match score is calculated; resumes below a threshold are automatically rejected.
4. Most ATS do NOT understand semantics — "ML pipeline deployment" does not match "MLOps" without the word "MLOps" present.

**How ATS Keyword Scoring Works (HTML path — modern ATS / Google for Jobs):**
1. ATS parser reads the `<script type="application/ld+json">` block from the `.html` file.
2. `knowsAbout` array provides an explicit, structured skill list — no body-text scanning required.
3. Keywords in `knowsAbout` are an unambiguous signal; terminology must still match the job's vocabulary exactly.

**Required Keyword Strategy (applies to all formats):**
- Job-specific terminology appears **verbatim** in at least one of: Skills, Professional Summary, or Work Experience in the ATS DOCX.
- Same terminology present in the `knowsAbout` array of the HTML JSON-LD block.
- Both acronym and full form present: "MLOps (ML Operations)" or "ML/MLOps".
- Keywords appear in high-weight sections (Skills first, Summary second, Experience third).
- Keywords are NOT stuffed — each appears naturally in context, not repeated 10 times.

**ATS Failure Modes:**
- Required keyword present only in human PDF, not in ATS DOCX.
- Keyword present in a table cell or text box (extracted incorrectly or skipped).
- Job title keyword only in a section heading, not in body text.
- "Scikit-learn" in the resume, "Scikit-Learn" in the job → some ATS are case-sensitive.
- `knowsAbout` array in HTML JSON-LD is empty or omitted.

**Acceptance Criteria:**
- A post-generation keyword check compares the job's required keywords against the ATS DOCX text.
- System reports: keyword present, section where it appears, and match type (exact / variant).
- System warns when a required keyword is absent from the ATS DOCX text.
- Keyword variants normalised: case-insensitive match, hyphen/slash variants treated as equivalent.
- System verifies that `knowsAbout` in the HTML JSON-LD block contains all approved skill names from the rewrite decisions.

---

## US-H5: Date and Employment History Parsing

**As an** HR staffer,  
**I want** dates and job entries to be parsed accurately by the ATS,  
**So that** employment gaps, tenure calculations, and date-sorting are correct in the ATS database.

**Required Date Format:** `January 2020–Present` or `01/2020–12/2022`  
(Both are widely supported; em-dash `–` preferred over hyphen `-`.)

**Required Job Entry Format:**
```
Senior Biostatistician | Genentech | South San Francisco, CA | January 2022–Present
```

**ATS Failure Modes:**
- En-dash vs. em-dash vs. hyphen inconsistency → some ATS misparse date ranges.
- Year-only dates ("2020–2022") → cannot calculate tenure accurately.
- Job title and company on separate lines with no separator → ATS may treat as two separate fields incorrectly.
- Overlapping date ranges → ATS flags as data quality issue.
- Future end dates → ATS may reject or flag.

**Acceptance Criteria:**
- All date ranges use a consistent separator character (em-dash `–`).
- All dates include month and year.
- Job entry header is on one line: `Title | Company | Location | Date Range`.
- No overlapping date ranges in the work history (system validates this).
- "Present" is used for current role (not future date).

---

## US-H6: ATS Output Validation Report

**As an** HR staffer,  
**I want** to receive a validation summary alongside the generated files,  
**So that** I have confidence that the generated DOCX will perform well in our ATS.

**Required Validation Checks:**

*ATS DOCX (`*_ATS.docx`):*
1. ✅ All text selectable as plain text (no locked fields)
2. ✅ Zero tables detected
3. ✅ Zero text boxes or shapes detected
4. ✅ Contact info in document body (not header/footer)
5. ✅ All section headings use standard labels
6. ✅ All section headings use Word Heading 1 style
7. ✅ Date formats consistent
8. ✅ Keywords from job description present in body text
9. ⚠ Keyword density within acceptable range (not stuffed)

*HTML (`*.html`):*
10. ✅ `<script type="application/ld+json">` block present and valid JSON
11. ✅ `knowsAbout` array populated with approved skill names
12. ✅ Required fields present: `name`, `email`, `telephone`, `hasOccupation`
13. ✅ HTML renders correctly in browser (two-column layout visible)

*PDF (`*.pdf`):*
14. ✅ All pages US Letter size
15. ✅ Fonts embedded
16. ✅ No clipped content at margins

**Acceptance Criteria:**
- System runs programmatic ATS validation checks after generation.
- Results displayed in the UI with pass/warn/fail for each check.
- Any fail blocks download with a clear explanation.
- Any warn allows download but shows the specific issue.
- Validation results included in `metadata.json`.

---

## US-H7: ATS Match Score Visibility

**As an** HR staffer reviewing applicant materials,  
**I want** to know that the submitted CV’s skills vocabulary aligns with the job requisition keywords,  
**So that** I can trust that the application will rank well in the ATS screener.

**Context (what the ATS does):**
- Traditional ATS: counts keyword occurrences from a predefined keyword list.
- Modern ATS (Google for Jobs / Workday Skill Match): computes a structured-data match between the `knowsAbout` array in the HTML JSON-LD and the job posting’s required skills.
- A visible pre-submission score gives the applicant confidence without gaming the system.

**Acceptance Criteria:**
- Overall match score (0–100%) is computed and displayed after job analysis.
- Score is weighted: hard skill matches count twice as much as soft skill matches (hard skills are more ATS-deterministic).
- Score updates live as the user approves/rejects customization items — no page reload required.
- Score is persisted to `metadata.json` at generation time for audit purposes.
- The score UI clearly labels the three per-skill states: Matched ✅, Missing ❌, Bonus ★ (candidate has skill not in JD).

---

## US-H8: Hard / Soft Skill Distinction in ATS Output

**As an** HR staffer,  
**I want** the ATS to correctly distinguish hard technical skills from soft interpersonal skills,  
**So that** the candidate’s record is correctly categorised and searchable by the hiring manager.

**Context (what the ATS does):**
- Some ATS (e.g. Workday, Greenhouse) have separate structured fields for technical skills vs. interpersonal competencies.
- `knowsAbout` entries in the HTML JSON-LD can optionally carry a `@type` or `additionalType` annotation — this enables richer structured-data parsing.
- Hard skills are typically the primary screener signal; soft skills are secondary.

**ATS Failure Modes:**
- All skills listed as a flat comma-separated string with no type distinction — modern ATS cannot categorise them.
- Soft skills mixed into the Technical Skills section of the DOCX — confuses ATS skill-extraction heuristics.
- Hard/soft mislabelling: listing "Python" as a soft skill or "Communication" as a hard skill reduces match accuracy.

**Required Format (ATS DOCX):**
```
Technical Skills
Programming: Python, R, SQL, Julia
ML/AI: Scikit-learn, PyTorch, Hugging Face, LangChain
Cloud & MLOps: AWS (EC2, S3, SageMaker), Docker, Kubernetes

Core Competencies
Cross-functional team leadership | Executive stakeholder communication | Mentoring
```

**Required Format (HTML JSON-LD `knowsAbout`):**
```json
"knowsAbout": [
  {"@type": "DefinedTerm", "name": "Python",        "additionalType": "HardSkill"},
  {"@type": "DefinedTerm", "name": "Communication",  "additionalType": "SoftSkill"}
]
```

**Acceptance Criteria:**
- LLM classifies every extracted skill as hard or soft during job analysis.
- Candidate’s master CV skills are also classified and the classification persisted in `Master_CV_Data.json`.
- The ATS DOCX separates skills into a “Technical Skills” section (hard) and a “Core Competencies” section (soft).
- The HTML JSON-LD `knowsAbout` entries include `"additionalType": "HardSkill"` or `"SoftSkill"`.
- User can override any classification in the UI; the override propagates to the generated documents.
- Missing hard skills are highlighted more prominently than missing soft skills in the match score display.

