# User Story: Hiring Manager Perspective
**Persona:** A technical hiring manager or department head who reviews the human-readable PDF after it passes ATS screening  
**Scope:** Visual presentation, content calibration, credibility, and strategic fit signals in the human-readable output  
**Format:** Evaluation criteria presented as acceptance tests from a reviewer's perspective

---

## US-M1: First Impression — Page 1 Layout

**As a** hiring manager,  
**I want** the first page to immediately communicate the candidate's identity, seniority, and relevance to the role,  
**So that** I can make an informed "keep reading" decision within 10–15 seconds.

**What I Look For on Page 1:**
1. **Name and current title** — clear, prominent, at the top.
2. **Contact information** — scannable, not buried.
3. **Professional summary** — 4–6 lines that tell me: Who are you? What's your level? Why are you a fit for *this* role?
4. **Selected achievements** — 4–6 high-impact bullets proving the candidate can deliver at the required level.
5. **Education** — visible at a glance (degree, institution, year).

**Layout Requirements:**
- 2-column layout: sidebar (contact, education, awards) left; main content (summary, achievements) right.
- Sidebar background slightly differentiated (light fill) for visual separation.
- Page 1 is exactly one page — no overflow, no blank white space at bottom.
- The candidate's name is the largest text element on the page.

**Failure Modes:**
- Summary is generic ("seasoned professional with diverse experience") → immediate credibility loss.
- Page 1 overflow forces summary or achievements onto page 2 → first impression weakened.
- Contact information in a sidebar icon block that's hard to scan quickly.
- Font too small (below 10pt) → illegible in print.
- Page 1 is only half-full → appears sparse and unpolished.

**Acceptance Criteria:**
- Page 1 contains name, contact, summary, selected achievements, and education — all visible without scrolling.
- Summary is role-specific: contains the job title or near-equivalent, years of experience, and one specific differentiator.
- Page 1 has no overflow (content does not bleed onto page 2 from the fixed-height section).
- Page 1 has no visibly unbalanced whitespace — both columns appear full or near-full; neither column ends with a large blank area. (Visual QC guideline: gap greater than ~2cm at the bottom of either column is a flag for human review.)

---

## US-M2: Work Experience — Credibility and Relevance

**As a** hiring manager,  
**I want** the work experience section to present the candidate's most relevant accomplishments in a structured, easy-to-scan format,  
**So that** I can quickly assess fit without reading every word.

**What I Look For:**
1. **Job title visibility** — Bold, at start of entry; tells me the candidate's role immediately.
2. **Company + date** — On same line as title; I check tenure and recency at a glance.
3. **Achievement bullets, not duty prose** — "Led development of X, resulting in Y" beats "Responsible for developing X."
4. **Metrics where present** — "Team of 15", "$2M budget", "50% reduction" signals credibility.
5. **Relevant bullets first** — The most job-relevant achievement is bullet #1 for each role.
6. **No orphaned job entries** — A job title alone on page 3 with bullets continuing on a theoretical page 4 is confusing.

**Failure Modes:**
- Bullet starts with "Responsible for" or "Duties included" → passive, uncredible.
- Only one bullet per job → appears thin.
- Bullets are long paragraphs rather than concise achievement statements.
- Same bullet phrasing across multiple jobs (boilerplate).
- Important role buried on page 3 because it's chronologically old, despite being the most relevant.

**Acceptance Criteria:**
- Every bullet starts with a strong action verb (past tense for past roles, present for current).
- Each job entry has at least 2 bullets.
- Bullets are ≤2 lines each.
- Job entries are not split across pages (`page-break-inside: avoid`).
- Relevance-ordered bullets within each entry (most relevant first, per content customisation step).
- System warns if a bullet lacks an action verb (per Phase 2.4 refactor).

---

## US-M3: Skills Section Readability

**As a** hiring manager,  
**I want** to quickly find the technical skills that are relevant to the role I'm hiring for,  
**So that** I can confirm the candidate has the required toolkit without reading every line.

**What I Look For:**
1. **Category grouping** — "Core Expertise", "ML & Statistics", "Infrastructure & Cloud" — I scan to the relevant group.
2. **Job-specific terms visible** — The terminology from my job posting should be present; I am pattern-matching.
3. **No unsupported skills** — If I see a skill I'll probe in interview; I need confidence it's real.
4. **Reasonable length** — A skills section that fills 40% of the page signals padding.

**Failure Modes:**
- Flat alphabetical list with no categories → takes 3× longer to scan.
- Rare/outdated skills listed prominently (COBOL, SPSS) → dates the candidate.
- Same skills name appearing twice in slightly different forms.
- Skills section so long it crowds work experience off the visible area.

**Acceptance Criteria:**
- Skills grouped into named categories on the human-readable PDF.
- Categories ordered by relevance to the target role.
- No duplicate skills (exact match or obvious aliases).
- Skills section occupies no more than 1.5 sidebar columns total.

---

## US-M4: Multi-Page Flow and Readability

**As a** hiring manager,  
**I want** the multi-page CV to flow logically across pages without confusing breaks or orphaned content,  
**So that** I can read continuously without losing track of where I am.

**Page Transition Rules:**
- Page 1 → Page 2: Work Experience begins (most recent roles).
- Page 2 → Page 3 (if needed): Work Experience continues; optional Publications.
- No page should open with a bullet that is the continuation of a job entry started on the previous page.
- Each page after page 1 should have a clear visual structure in both columns.

**Failure Modes:**
- Last entry on page 2 has job title at bottom, bullets on page 3 (entry not kept together).
- Page 3 sidebar is empty while page 3 main content is full.
- Two pages total but page 2 is mostly white space.
- Publications appear on page 2 when the role doesn't require them, pushing Experience onto page 3.

**Acceptance Criteria:**
- `page-break-inside: avoid` applied to every job entry; split entries are not permitted.
- Sidebar content is balanced across pages (not empty on any page that has main content).
- Total page count is 2–3 for a senior candidate; system warns if output is 1 or >3 pages.
- Publications included only when flagged as relevant for the role type.
- When publications are included, the section is headed "Selected Publications" — not "Publications" — signalling deliberate curation rather than a full list dump.

---

## US-M5: Visual Identity and Professionalism

**As a** hiring manager (or HR screener passing the file to me),  
**I want** the PDF to look visually polished and consistent with a senior candidate's brand,  
**So that** poor formatting doesn't introduce doubts about the candidate's attention to detail.

**Visual Requirements:**
- Consistent colour scheme: dark navy primary for headings/structure, accent blue for interactive elements and icons, muted grey for secondary text, light border separators. (Exact values are implementation details defined in `cv-template.html`.)
- Typography: a serif font for the candidate's name (display heading); a clean sans-serif for all body text. (Merriweather and Inter are the current choices; the user story requires *a* pairing that achieves this contrast, not these specific fonts.)
- Section titles: uppercase, slightly larger than body, with a horizontal rule border-bottom.
- Icon-prefixed contact fields (Font Awesome icons).
- Bullet points: custom-styled with accent colour.
- No visible pagination artefacts (half-rendered sidebar boundaries, clipped text).

**HTML vs PDF distinction:**
- The `.html` file is the authoritative master document — self-contained, browser-previewable, and containing Schema.org JSON-LD metadata in `<head>`.
- The `.pdf` is produced by converting the rendered HTML via WeasyPrint (primary) or Chrome headless (fallback); any visual defect in the PDF should be diagnosed against the HTML output first.
- If the HTML renders correctly in a browser but the PDF has defects, the issue is in the PDF conversion step, not the template or content.

**Failure Modes:**
- Font not embedded in PDF → different appearance on different viewers.
- Background colour not rendered in PDF (sidebar appears white).
- Section title border extends off-page.
- Icon glyphs render as empty squares (Font Awesome not embedded).
- Page margin clips content on left or right edge.

**Acceptance Criteria:**
- All fonts embedded in the PDF (WeasyPrint embeds by default; verify for Chrome headless fallback).
- Sidebar background colour present on every page, including pages 2+.
- No content clipped at page margins.
- Font Awesome icons rendered correctly (requires network or bundled font file at generation time).
- PDF passes visual QC: compare rendered page images against a reference screenshot.

---

## US-M6: Cover Letter Tone and Relevance

**As a** hiring manager,  
**I want** the cover letter to be concise, specific, and directly address why this candidate is a fit for this role,  
**So that** it adds value rather than repeating the resume.

**What I Look For:**
1. **Opening paragraph** — Names the specific role and company; shows awareness of what the company/team does.
2. **Body** — 2–3 paragraphs directly connecting the candidate's experience to the role's 2–3 key requirements.
3. **Closing** — Specific call to action (interview request), not "I hope to hear from you."
4. **Length** — ¾ to 1 page; never more than 1 page.
5. **No resume repetition** — Cover letter complements; does not summarise bullet points.

**Failure Modes:**
- Generic opening: "I am writing to apply for the position of…" with no company-specific content.
- Letter is exactly 1 paragraph rewriting the professional summary.
- Closing is passive: "I look forward to potentially discussing…"
- Length exceeds 1 page.
- Tone mismatch: casual startup language for a pharma/biotech conservative role.

**Acceptance Criteria:**
- Company name and role title appear in paragraph 1.
- At least one company-specific reference (recent initiative, product, or value) if extractable from the job posting.
- Body paragraphs cite specific, named achievements — not generic claims.
- Closing paragraph ends with a direct interview request.
- Length within the role-appropriate range: 300–400w standard; 400–500w executive; 500–600w research/academic.
- Tone setting (startup / pharma / academic / financial) applied based on inferred employer type.

---

## US-M7: Selected Publications — Credibility and Relevance Signalling

**As a** hiring manager reviewing a research, scientific, or technical role,
**I want** the publications section — when present — to show me a short, clearly curated list of work directly relevant to the role I'm filling,
**So that** I can quickly assess the candidate's domain expertise and credibility without wading through an undifferentiated bibliography.

**What I Look For:**

1. **Immediate relevance signal** — The listed publications should feel like they were chosen *for this job*, not copied from a CV template. The topics should map to the role's core requirements within one or two reads.
2. **Concise, scannable citations** — Each entry should show: title, venue (journal or conference), year, and enough author information to confirm first-author or senior-author status. I do not want full BibTeX formatting or excess metadata.
3. **Curation, not volume** — 2–5 highly relevant publications signal judgment and focus. 15+ entries signal the candidate did not edit. For a pure research role, up to 10 is acceptable if all are clearly relevant.
4. **Section placement** — Publications are always the final section of the CV, regardless of role type. The page they land on is a consequence of CV length and publication count — not a separate placement directive. For research-heavy roles, keep the CV to 2 pages so publications appear on page 2; for industry roles, a 3-page CV with publications on the last page is acceptable.
5. **"Selected" framing** — The heading "Selected Publications" tells me this is an intentional subset. Heading "Publications" implies it's a complete list and raises the question of what's missing.
6. **First-author visibility** — I care whether the candidate led the work. The citation format should make first-author status immediately apparent (name position, or a "First Author" note if not obvious from citation style).

**Failure Modes:**

- Section headed "Publications" with 25 entries — signals the candidate didn't tailor the CV and expects me to filter.
- Highly cited but off-topic papers listed prominently — suggests the candidate is signalling prestige over relevance.
- First-author and co-author papers mixed indistinguishably — I can't assess contribution without extra work.
- Publications section placed after the cover letter page — effectively invisible.
- Venue not shown — a paper with no journal or conference name cannot be evaluated for credibility.
- Year not shown — I cannot assess recency or whether the work predates the relevant technology landscape.

**Acceptance Criteria:**

- Section heading is always "Selected Publications" when the section is present.
- Each entry displays: authors (first-author name identifiable), title, venue, year — in that order of scan priority.
- Total entry count matches what the applicant confirmed in the Customisation step — not the full `publications.bib` count.
- A count indicator is shown: _"Selected Publications (4 of 52)"_ — communicates curation to the reader.
- Selected Publications is always the final section of the CV; its page position is determined by overall CV length and publication count, not by a separate placement rule.
- No entry appears without a venue — entries missing a `journal` or `booktitle` BibTeX field are flagged to the user during Customisation rather than silently rendered without venue.

---

