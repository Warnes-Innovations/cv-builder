<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Stories: Master CV Onboarding — Initial Creation from External Sources

**Last Updated:** 2026-04-20 12:00 ET

**Executive Summary:** These stories cover the workflow for creating `Master_CV_Data.json` from scratch using external source materials (LinkedIn data export, existing resume/CV, publications list, Google Scholar profile, GitHub profile, and manual entry). They are distinct from US-A10 and US-M* stories, which assume master data already exists. The onboarding workflow addresses the documented gap in `tasks/gaps.md` §GAP-25.

## Contents

- [US-O1: Precondition — Guided Entry into the Onboarding Workflow](#us-o1-precondition--guided-entry-into-the-onboarding-workflow)
- [US-O2: Import from LinkedIn Data Export](#us-o2-import-from-linkedin-data-export)
- [US-O3: Import from Existing Resume or CV Document](#us-o3-import-from-existing-resume-or-cv-document) — PDF, DOCX, plain text, Markdown, HTML, or paste
- [US-O4: Import Publications from BibTeX or Google Scholar](#us-o4-import-publications-from-bibtex-or-google-scholar)
- [US-O5: Import Projects and Skills from GitHub Profile](#us-o5-import-projects-and-skills-from-github-profile)
- [US-O6: Merge Multiple Sources into a Unified Master CV](#us-o6-merge-multiple-sources-into-a-unified-master-cv)
- [US-O7: Manual Entry Fallback via Guided Form](#us-o7-manual-entry-fallback-via-guided-form)
- [US-O8: Review and Confirm Imported Data Before Writing](#us-o8-review-and-confirm-imported-data-before-writing)
- [US-O9: UX Evaluation — Onboarding Source Selection and Import Flow](#us-o9-ux-evaluation--onboarding-source-selection-and-import-flow)
- [US-O10: UX Evaluation — Import Error and Gap Handling](#us-o10-ux-evaluation--import-error-and-gap-handling)
- [US-O11: Post-Import Completeness Check (Master CV Curator)](#us-o11-post-import-completeness-check-master-cv-curator)
- [US-O12: Conflict Resolution When Merging Sources (Master CV Curator)](#us-o12-conflict-resolution-when-merging-sources-master-cv-curator)

---

## Applicant / First-Time User Stories

---

### US-O1: Precondition — Guided Entry into the Onboarding Workflow

**Persona:** First-time user  
**Related gap:** GAP-25  
**Related stories:** US-F1, US-F2

**As a** first-time user of CV Builder,  
**I want to** be guided to create my master CV before I can begin a job application session,  
**So that** I understand why the master CV is required and have a clear path to create it without being blocked.

**Precondition:** No `Master_CV_Data.json` exists at the configured path.

**Steps:**
1. On first launch, the system detects that no master CV file exists.
2. The UI presents a friendly welcome screen that explains: what a master CV is, why it is required, and that it only needs to be created once.
3. The screen offers three primary onboarding paths, presented with equal visual weight:
   - **Import from my materials** — for users with a LinkedIn export, existing resume, publications file, or GitHub profile.
   - **Start from a guided form** — for users who prefer to type their information section by section.
   - **Load an existing JSON file** — for users who have a `Master_CV_Data.json` from a prior installation.
4. The user selects a path and proceeds.

**Acceptance Criteria:**
- Missing master CV file is detected at app startup with a user-actionable message, not a raw error or Python traceback.
- All three onboarding paths are accessible from the welcome screen; none is hidden behind a settings menu or advanced mode.
- The welcome screen explains what will be created before asking the user to act.
- A user who selects the wrong path can return to the path-selection screen without losing any progress already made.

**Failure Modes to Guard Against:**
- Dropping the user onto the job-application UI with a broken/empty state because the master CV is missing.
- Presenting "Load JSON file" as the only path, leaving new users with no actionable route.
- Starting import without explaining what the resulting file is or where it will be saved.

---

### US-O2: Import from LinkedIn Data Export

**Persona:** Job applicant / first-time user  
**Related gap:** GAP-25, GAP-01  
**Related stories:** US-A10, US-O1, US-O6, US-O8

**As a** user onboarding into CV Builder,  
**I want to** upload my LinkedIn data export archive so the system extracts my professional history and pre-populates the master CV,  
**So that** I do not have to re-enter years of employment, education, skills, and publications that LinkedIn already holds.

**Context:** LinkedIn data exports are delivered as a ZIP archive containing CSV files including `Profile.csv`, `Positions.csv`, `Education.csv`, `Skills.csv`, `Certifications.csv`, `Projects.csv`, and optionally `Publications.csv`. The archive must be requested through LinkedIn account settings and typically arrives within 24 hours.

**Steps:**
1. The user requests a LinkedIn data export from their LinkedIn account settings (out of scope — the UI surfaces a link and explains how to do this).
2. The user uploads the received ZIP file (or extracted folder) via a drag-and-drop or browse control.
3. The system unpacks and parses the known CSV files. A progress indicator is shown for each file parsed.
4. The system maps parsed fields to the master CV schema:
   - `Positions.csv` → `experience[]` entries with title, company, dates, and description converted to achievement bullets
   - `Education.csv` → `education[]` entries
   - `Skills.csv` → `skills[]` entries with proficiency left blank (not available from LinkedIn export)
   - `Certifications.csv` → `certifications[]` entries
   - `Profile.csv` → `personal_info` (name, headline, location, contact)
   - `Publications.csv` (if present) → offered as candidate entries for `publications.bib`
5. Fields that could not be reliably mapped are flagged as **needs review** with the raw source value shown alongside.
6. The user proceeds to the import review step (US-O8).

**Acceptance Criteria:**
- ZIP upload accepted without requiring the user to first extract files.
- All standard LinkedIn export CSV files are parsed; unknown or future-format files are skipped gracefully with a logged notice.
- Each mapped experience entry is presented as a candidate draft, not silently written to disk.
- Fields not present in the LinkedIn export (e.g., achievement importance scores, tags) are left blank or at defaults — not fabricated.
- If `Publications.csv` is present, the user is given the option to import entries into `publications.bib` during the review step.
- The system clearly communicates that LinkedIn proficiency levels are not available in export data and that the user should review skills after import.

**Failure Modes to Guard Against:**
- Parsing fails silently for malformed or older-format LinkedIn exports without informing the user.
- Achievement bullets generated from LinkedIn `Description` fields appear verbatim without being flagged for review/cleanup.
- Missing CSV files (e.g., user never added certifications to LinkedIn) cause the entire import to fail instead of importing the available sections.

---

### US-O3: Import from Existing Resume or CV Document

**Persona:** Job applicant / first-time user  
**Related gap:** GAP-25, GAP-01  
**Related stories:** US-A10, US-O1, US-O6, US-O8

**As a** user onboarding into CV Builder,  
**I want to** provide my existing CV or resume in whatever format I have it — uploaded file, pasted text, or a web page — so the system uses LLM extraction to pre-populate the master CV,  
**So that** I can quickly seed the system with my professional history without re-typing it, regardless of what format my existing materials are in.

**Supported input paths:**

| Path | Description |
| --- | --- |
| **File upload — PDF** | Upload a PDF resume. System extracts embedded text. |
| **File upload — DOCX** | Upload a Word document. System extracts text and paragraph structure. |
| **File upload — plain text (.txt)** | Upload a UTF-8 text file. Used directly as-is. |
| **File upload — Markdown (.md)** | Upload a Markdown-formatted CV. Markdown is stripped to plain text before LLM processing; heading structure is used to aid section detection. |
| **File upload — HTML (.html / .htm)** | Upload an HTML page (e.g., a saved LinkedIn profile page or an HTML-format CV). System strips tags and extracts readable text; `<h1>`–`<h3>` elements are used as section-boundary hints. |
| **Paste text** | The user pastes resume text directly into a text area. Any format is accepted: plain text, Markdown, or lightly formatted text copied from a browser. |

**Steps:**
1. The user selects an input path from the options above. File upload and paste text are presented as clearly labelled tabs or panels of equal weight.
2. For file uploads, the system detects the format from the file extension and MIME type and routes it through the appropriate text extraction step (PDF text extraction, DOCX paragraph extraction, HTML tag-stripping, or direct read for `.txt`/`.md`). A progress indicator is shown during extraction.
3. For paste input, the system accepts the text as-is after a minimum-length validation (see Acceptance Criteria).
4. Markdown heading structure (for `.md` or pasted Markdown) and HTML heading tags (for `.html` uploads or pasted HTML) are used as lightweight section-boundary hints to aid LLM extraction accuracy. They are not required.
5. The extracted or pasted text is passed to the LLM with a structured extraction prompt. The LLM returns a JSON payload conforming to the master CV schema. A progress indicator is shown during LLM processing.
6. The system validates the LLM response against the master CV JSON schema and flags fields with low extraction confidence (e.g., ambiguous date ranges, titles that look like section headings, phone numbers that fail format validation).
7. The extraction result is presented for user review (US-O8). The raw source text is available in a collapsible panel for the user to inspect if an extraction looks wrong.

**Acceptance Criteria:**
- All six input paths (PDF, DOCX, TXT, MD, HTML, paste) are accepted; a file with an unrecognised extension produces a clear "unsupported format" message listing the supported formats, not a generic error.
- HTML input has tags stripped before LLM processing; the raw HTML is never passed verbatim into the LLM prompt.
- Markdown input has syntax markers (headings, bold, bullet markers) preserved as plain-text hints rather than stripped entirely, so the LLM can use structural signals.
- Pasted text is accepted as long as it meets a minimum length threshold (default: 100 characters); input below the threshold produces an inline hint that the text appears too short to extract a useful CV.
- LLM extraction targets all master CV sections: personal info, experience, education, skills, certifications, and summaries. Publications found in the source are extracted as candidate `publications.bib` entries.
- Low-confidence fields are visually flagged during review with an amber indicator and an inline note explaining the flag.
- The raw extracted text (post-stripping, pre-LLM) is available in a collapsible panel at the review screen.
- Files over a configurable size limit (default: 5 MB) are rejected with a clear message before processing begins.
- Processing time is indicated with a progress indicator; if extraction exceeds 30 seconds the UI explains why (LLM latency) and offers a cancel option.

**Failure Modes to Guard Against:**
- LLM fabricating employment history not present in the source (hallucination). The UI must make clear that review is essential, not optional, regardless of input format.
- Scanned-image PDFs (no embedded text) failing silently instead of surfacing a "no text detected" warning with guidance to use a text-based PDF or the paste path instead.
- HTML uploads retaining `<script>`, `<style>`, or other non-content tags in the text passed to the LLM, polluting the extraction.
- Pasted HTML (e.g., content copy-pasted from a browser) being passed raw to the LLM rather than being detected and tag-stripped first.
- Extraction writing directly to `Master_CV_Data.json` before the user has confirmed the review step.

---

### US-O4: Import Publications from BibTeX or Google Scholar

**Persona:** Job applicant / researcher / first-time user  
**Related gap:** GAP-25  
**Related stories:** US-M4, US-O1, US-O6, US-O8

**As a** user onboarding into CV Builder,  
**I want to** import my publication record from a BibTeX file, a pasted citation list, or a public Google Scholar profile URL,  
**So that** my publications are accurately captured in `publications.bib` without manual BibTeX entry.

**Steps:**

**Path A — BibTeX file upload:**
1. The user uploads a `.bib` file.
2. The system parses the file, validates BibTeX syntax, and extracts all entries.
3. Entries with missing required fields (title, authors, or year) are flagged.
4. The user proceeds to publication review before any write occurs.

**Path B — Google Scholar URL:**
1. The user pastes their public Google Scholar profile URL.
2. The system fetches the public profile page and extracts the publication list (title, authors, year, venue).
3. Entries are presented as candidate BibTeX records for user review. DOIs and URLs are extracted where available; missing identifiers are flagged.
4. The user can edit or discard individual entries before confirming.

**Path C — Pasted citation text:**
1. The user pastes a block of citation text in any common format (APA, MLA, Chicago, or mixed).
2. The LLM is invoked to convert each citation to a candidate BibTeX record.
3. The converted records are presented for review, with confidence scores and raw source text shown side-by-side.
4. The user confirms the records to import.

**Acceptance Criteria (all paths):**
- No publication entries are written to `publications.bib` until the user explicitly confirms after review.
- Duplicate detection: if an entry closely matches an existing record (same title and year), the user is alerted and can choose to skip, overwrite, or keep both.
- BibTeX key uniqueness is enforced; conflicts are surfaced, not silently resolved.
- The review screen shows entry count, flagged entries (missing fields or low confidence), and allows individual entry editing before confirm.

**Failure Modes to Guard Against:**
- Google Scholar URL fails to fetch because the profile is not fully public — system must distinguish "not public" from "fetch error" and give appropriate guidance.
- Pasted citation conversion fails silently for one or more entries, writing only a partial set without informing the user.
- BibTeX parse errors on malformed input do not abort the entire import; valid entries should still be offered for review.

---

### US-O5: Import Projects and Skills from GitHub Profile

**Persona:** Job applicant / software professional / first-time user  
**Related gap:** GAP-25  
**Related stories:** US-O1, US-O6, US-O8

**As a** user onboarding into CV Builder,  
**I want to** import my public GitHub profile (username or URL) so the system extracts notable repositories, languages, and contributions as candidate skills and achievements,  
**So that** my open-source and personal project work is captured in the master CV.

**Steps:**
1. The user pastes their GitHub username or profile URL.
2. The system queries the public GitHub API for:
   - Pinned/notable public repositories (name, description, languages, stars, topics)
   - Top programming languages across public repositories
   - Organisation memberships (public)
3. The system uses the LLM to convert repository descriptions and language summaries into:
   - Candidate `skills[]` entries (languages, frameworks inferred from repo topics/descriptions)
   - Candidate `experience[]` achievement bullets for notable projects (framed as professional achievements)
4. All candidates are presented as suggestions for user review, clearly labelled "from GitHub — review before accepting."
5. The user selects which candidates to include, edits descriptions as needed, and confirms.

**Acceptance Criteria:**
- Only the public GitHub API is used; no authentication credentials are requested or stored.
- Candidate entries are never written to master data without explicit user confirmation.
- Repositories the user forks but did not author significantly are visually distinguished from original projects (fork indicator shown).
- The import is scoped to a configurable limit (default: top 20 repositories by stars/recency) to prevent overwhelming the review screen.
- Candidate skill entries from GitHub are merged into existing skills sections, not added as duplicates of skills already in the master CV.

**Failure Modes to Guard Against:**
- Rate-limiting by the GitHub API causing the import to fail silently without a clear message.
- LLM over-claiming technical skills based on repository topics that do not reflect the user's personal expertise.
- All repositories listed as achievement bullets with no curation, bloating the master CV with minor projects.

---

### US-O6: Merge Multiple Sources into a Unified Master CV

**Persona:** Job applicant / first-time user  
**Related gap:** GAP-25  
**Related stories:** US-O2, US-O3, US-O4, US-O5, US-O8, US-O12

**As a** user onboarding into CV Builder with data spread across multiple sources,  
**I want to** combine a LinkedIn export, an existing resume, a publications file, and a GitHub profile into a single unified master CV,  
**So that** I get the most complete picture from all my materials in one structured review rather than having to choose just one source.

**Steps:**
1. On the import screen, the user selects multiple sources to combine (any combination of: LinkedIn ZIP, resume PDF/DOCX, BibTeX file, Google Scholar URL, GitHub username).
2. The system processes each source in parallel and produces a candidate record set for each.
3. When the same piece of information appears in multiple sources (e.g., a job title appears in both the LinkedIn export and the resume), the system identifies the conflict and presents both versions side-by-side for the user to choose or merge.
4. Sections unique to one source (e.g., GitHub-only projects, LinkedIn-only certifications) are added without conflict.
5. The user reviews the merged result — structured by master CV section — and makes field-by-field decisions on any flagged conflicts.
6. On confirmation, the merged result is written to `Master_CV_Data.json` with a timestamped backup.

**Acceptance Criteria:**
- At least two sources can be combined in a single onboarding flow.
- Conflicts (same experience entry with differing details) are surfaced for explicit user resolution, not resolved silently by taking one source's version.
- Unique non-conflicting entries from all sources are combined without requiring manual re-entry.
- The review screen groups conflicts by section and shows provenance (which source each value came from).
- The user can proceed with unresolved conflicts left as "needs review" tags if they choose, completing merge of the rest.

**Failure Modes to Guard Against:**
- Duplicate entries written to master data when the same employer appears in both LinkedIn and the resume.
- Conflict detection failing for records where company names are slightly different (e.g., "Genentech" vs. "Genentech, Inc.") — fuzzy matching should be applied, not exact-string comparison.
- A failure in processing one source cancelling the entire merge; each source should be processed independently.

---

### US-O7: Manual Entry Fallback via Guided Form

**Persona:** First-time user without digital source materials  
**Related gap:** GAP-25  
**Related stories:** US-O1, US-F2

**As a** first-time user who does not have a LinkedIn export, digital resume, or other importable file,  
**I want to** enter my professional information section by section through a guided form,  
**So that** I am not blocked from using CV Builder just because I lack a file to upload.

**Steps:**
1. The user selects "Start from a guided form" from the onboarding path screen.
2. The system presents a multi-step wizard with one section per screen:
   - Step 1: Personal Info (name, headline, contact details)
   - Step 2: Experience (add one or more roles with title, company, dates, and a description text box)
   - Step 3: Education (add degrees)
   - Step 4: Skills (type or pick from a suggested list)
   - Step 5: Publications (optional — skip or add entries)
   - Step 6: Summary (optional — write or skip; can be generated later)
3. Each step can be saved individually; the user can close the wizard and resume later.
4. On completion of the wizard, a review screen shows the full draft master CV.
5. The user confirms, and `Master_CV_Data.json` is written.

**Acceptance Criteria:**
- Every wizard step has a "Skip for now" option so the user is never blocked by optional data.
- Progress is persisted between steps so a browser refresh or restart does not discard entered data.
- Experience description text is accepted as free text; the system does not require bullet format at entry time (formatting is handled later).
- The completed wizard result is shown in the same review/confirm screen as the import paths before writing to disk.
- The user can return to any earlier wizard step from the review screen and correct entries before confirming.

**Failure Modes to Guard Against:**
- Requiring all fields in a step before allowing the user to proceed (should be opt-in per field, not mandatory).
- Losing entered data if the user navigates to a different tab and returns.
- Writing to `Master_CV_Data.json` after each step rather than after the final review confirm.

---

### US-O8: Review and Confirm Imported Data Before Writing

**Persona:** Job applicant / first-time user  
**Related gap:** GAP-25  
**Related stories:** US-O2, US-O3, US-O4, US-O5, US-O6, US-O7, US-M1

**As a** user completing any onboarding import path,  
**I want to** review the structured data extracted from my source materials in a section-by-section preview before it is written to disk,  
**So that** I can catch extraction errors, fill gaps, and confirm I am satisfied with the result.

**Steps:**
1. After any import source is processed (or the guided form wizard is completed), the user lands on the **Import Review** screen.
2. The screen is organised by master CV section (Personal Info, Experience, Skills, Education, etc.), each in a collapsible panel.
3. Within each section:
   - Extracted records are listed with their key fields visible.
   - Fields flagged as low-confidence or missing required values are highlighted (amber/red indicator).
   - The user can inline-edit any field, delete any record, or add a manual record before confirming.
4. A summary bar at the top shows: total records per section, count of flagged items needing attention.
5. The user clicks **Confirm and Create Master CV**. The system:
   - Creates a timestamped backup if a previous `Master_CV_Data.json` exists.
   - Writes the reviewed data to `Master_CV_Data.json`.
   - Runs `git add Master_CV_Data.json` and records a commit with message `chore: Create master CV from onboarding import`.
   - Shows a success screen confirming the file path and offering a link to open the Master CV Editor or start a job session.
6. If the user closes or navigates away before confirming, the staged import data is preserved in a temporary session so they can return and continue.

**Acceptance Criteria:**
- No write to `Master_CV_Data.json` occurs before the user clicks Confirm.
- All flagged items are listed in the summary bar; the user can proceed with flags still present (not blocked), but a warning is shown.
- Inline editing is available for every field without requiring a separate modal.
- The success screen shows the file path where `Master_CV_Data.json` was written.
- Git commit is created automatically on confirm; if Git is not available in the environment, the write still succeeds and the user is notified that git tracking was skipped.

**Failure Modes to Guard Against:**
- Auto-writing on successful extraction without going through the review step.
- Flagged items disappearing without user action (e.g., auto-fixed silently).
- No path back to the source selection screen if the user decides to add another source after seeing the review.

---

## UX Expert Evaluation Stories

---

### US-O9: UX Evaluation — Onboarding Source Selection and Import Flow

**Persona:** UI/UX expert  
**Related gap:** GAP-25  
**Related stories:** US-O1 through US-O8

**As a** UI/UX expert,  
**I want to** verify that the onboarding import flow presents source options clearly and guides the user from "I have these materials" to "my master CV is ready",  
**So that** first-time users are not blocked, confused, or led to make irreversible mistakes during initial setup.

**Evaluation Criteria:**

1. **Source option clarity** — Each available import path is presented with a short, plain-language description of what it requires and what it produces. Users should be able to pick the right path without reading documentation.
2. **Progress visibility** — The user always knows which step of the onboarding flow they are on and how many steps remain. Progress is shown persistently, not only at the top of each step.
3. **Recovery from wrong path** — Selecting an import path and then deciding to change source (or add another) must be achievable without discarding progress. A user who uploads the wrong file can remove it and upload a different one.
4. **Confirmation gate integrity** — The flow must not write any data to disk until an explicit user confirmation action. Intermediate import steps are staging operations only.
5. **Success state communication** — After master CV creation, the user is clearly told what was created, where it was saved, and what the next step is.

**Failure Modes to Guard Against:**
- Source options described only by file format names (e.g., "Upload CSV") without explaining what the format is or where to get it.
- A progress indicator that resets or disappears when the user navigates back one step.
- No way to add a second source after processing the first, forcing a restart.
- Success confirmation that leaves the user on a blank screen with no call to action.

**Acceptance Criteria:**
- Each source path on the onboarding screen has a label (e.g., "LinkedIn Export"), a one-sentence description of what it requires, and an optional help link.
- A step counter or progress indicator is visible throughout the onboarding flow and updates accurately.
- A user who navigates back from the review screen can add or remove sources without losing data already extracted.
- The confirmation step clearly summarises what will be written before the write button is clicked.
- Post-creation success screen offers at least: "Review in Master CV Editor" and "Start a Job Application" as next actions.

---

### US-O10: UX Evaluation — Import Error and Gap Handling

**Persona:** UI/UX expert  
**Related gap:** GAP-25  
**Related stories:** US-O2, US-O3, US-O4, US-O5

**As a** UI/UX expert,  
**I want to** verify that the import flow handles parsing errors, missing fields, and low-confidence extractions gracefully and informatively,  
**So that** users are oriented toward what needs manual attention without feeling overwhelmed or uncertain about the reliability of the import.

**Evaluation Criteria:**

1. **Error presentation** — Parse and network errors are shown as user-readable messages with a recovery action. Stack traces and raw error codes are never shown directly to the user.
2. **Partial success** — When an import partially succeeds (e.g., three of four sources parsed correctly), the partial result is offered for review rather than discarding all progress.
3. **Confidence signalling** — Fields extracted with low confidence are visually distinguished from high-confidence fields at the review screen. The distinction is explained in context, not just by color.
4. **Gap surfacing** — Sections with no extracted data (e.g., no education entries found in the resume) are shown as empty sections during review with an "add manually" prompt rather than being hidden.
5. **LLM latency feedback** — When extraction involves an LLM call, the user sees meaningful progress feedback (not just a spinner) indicating that processing is active.

**Failure Modes to Guard Against:**
- A generic "import failed" message with no indication of which file or section failed.
- All extracted fields presented identically regardless of confidence level, leaving users unaware that some values need verification.
- Empty sections silently omitted from the review screen, leading users to believe all sections were populated.
- LLM processing stalling with no timeout, cancel option, or retry path.

**Acceptance Criteria:**
- Errors display a plain-language description, the affected file or section, and a recovery action (retry, skip, or enter manually).
- Low-confidence fields are visually flagged (amber indicator) and a tooltip or inline note explains what triggered the flag.
- Empty sections appear in the review screen with an "Add manually" affordance, not a blank page.
- LLM processing steps show a status message that changes during processing (e.g., "Extracting experience entries..." → "Extracting skills...").
- A cancel/stop button is available during LLM processing steps; cancelling returns the user to the source selection screen with their file upload intact.

---

## Master CV Curator Evaluation Stories

---

### US-O11: Post-Import Completeness Check

**Persona:** Master CV curator  
**Related gap:** GAP-25  
**Related stories:** US-O8, US-M1, US-M2

**As a** master CV curator reviewing a freshly imported master CV,  
**I want to** see a completeness summary that flags thin or missing sections after import,  
**So that** I know what requires manual follow-up before the master CV is ready for job applications.

**Evaluation Criteria:**

1. After import and confirmation, the system presents a **Master CV Readiness Summary** — a compact report showing section-by-section status.
2. Sections with zero entries are flagged as **Missing** (red).
3. Sections with entries but common quality issues (e.g., experience bullets that are a single sentence copied verbatim from a job description, skills with no proficiency level) are flagged as **Needs Review** (amber).
4. Sections that appear complete are shown as **OK** (green).
5. Each flagged item links directly to the Master CV Editor section where it can be resolved.

**Acceptance Criteria:**
- Readiness summary is shown immediately after the successful import confirm screen.
- At minimum, the following are flagged as Missing if absent: personal info contact details, at least one experience entry, at least one skill entry, education.
- Verbatim long-form job descriptions used as the sole achievement bullet for a role are flagged as Needs Review with an inline message suggesting they be broken into bullet-format achievements.
- The curator can dismiss the summary and proceed to job applications; it is advisory, not a blocking gate.

**Failure Modes to Guard Against:**
- No post-import summary: user proceeds to job application with a materially incomplete master CV and only discovers gaps during the customisation review step.
- Readiness check erroneously flagging well-populated sections as incomplete due to optional fields being blank.

---

### US-O12: Conflict Resolution When Merging Sources

**Persona:** Master CV curator  
**Related gap:** GAP-25  
**Related stories:** US-O6, US-M1, US-M2

**As a** master CV curator merging multiple source materials,  
**I want to** see and resolve conflicts between records extracted from different sources side-by-side,  
**So that** the resulting master CV reflects accurate, authoritative data rather than a silent amalgam of potentially contradictory inputs.

**Evaluation Criteria:**

1. When the same experience entry (matched by company name and approximate date range) appears in two or more sources with differing values, both versions are shown in a conflict card.
2. The conflict card shows: field name, value from source A, value from source B, and a "Use A / Use B / Edit manually" control.
3. Conflicts are grouped by section and presented as a dedicated **Resolve Conflicts** step between source processing and the full review screen.
4. The curator can defer a conflict by marking it "Decide later" — the field is written with the source A value but tagged as unresolved, visible in the Master CV Editor.
5. Fuzzy matching is applied when comparing records across sources so that minor formatting differences (e.g., "Genentech, Inc." vs. "Genentech") do not prevent conflict detection.

**Acceptance Criteria:**
- Conflict resolution step appears only when genuine conflicts exist; it is skipped when all sources are non-overlapping.
- Every conflict is presented to the curator before writing; no silent resolution by default.
- Fuzzy company-name matching applies to conflict detection, with the matched pair shown explicitly so the curator can confirm it is the same entity.
- "Decide later" deferred conflicts are visible in the Master CV Editor with a "Needs resolution" tag after import.
- The curator can edit the merged value freely rather than being forced to pick one source verbatim.

**Failure Modes to Guard Against:**
- Silent merge choosing the first-processed source's value whenever a conflict exists.
- Treating "Genentech" and "Genentech, Inc." as separate companies and creating two duplicate experience entries.
- Conflict resolution step blocking progress if the curator wants to skip all conflicts and resolve later through the Master CV Editor.
