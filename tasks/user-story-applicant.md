# User Story: Job Applicant Perspective
**Persona:** Gregory R. Warnes — senior scientist/leader applying to a specific role  
**Scope:** Full workflow from job discovery through application submission  
**Format:** End-to-end narrative with numbered steps, acceptance criteria, and UI interaction notes

---

## US-A1: Discover and Queue a Job Opportunity

**As a** job applicant,  
**I want to** paste or import a job posting URL or text so the system can begin tailoring my application,  
**So that** I spend no time on manual transcription and can start the process immediately.

**Precondition:** `Master_CV_Data.json` is up to date.

**Steps:**
1. Open the web UI and start a new session.
2. Paste the job posting URL (e.g., from LinkedIn, Indeed, Glassdoor) **or** paste the full job description text.
3. If a URL is supplied, the system fetches and extracts the plain-text job description, warning me if the site is login-protected (LinkedIn, Indeed) so I can manually copy the text.
4. The system confirms the company name, role title, and date extracted from the posting.
5. I confirm or correct those values.
6. The session is saved with `status: "queued"` so I can return later.

**Acceptance Criteria:**
- URL and paste-text paths both work.
- Protected-site warning surfaced with a manual-copy fallback.
- Company name, role title, and date auto-extracted and editable.
- Session persisted immediately after step 5.

---

## US-A2: Understand What the Job Requires

**As a** job applicant,  
**I want to** see a structured analysis of the job description — required vs. preferred qualifications, key keywords, and domain focus —  
**So that** I know what the employer is prioritising before I approve any customisations.

**Steps:**
1. After job text is confirmed, the system runs LLM analysis; a progress indicator is shown within 1 s of starting (target completion ≤10 s under normal load — this is a performance guideline, not a hard SLA).
2. The full `Master_CV_Data.json` is included in the LLM context alongside the job description so the analysis can identify mismatches as well as matches.
3. The UI displays:
   - Required qualifications (must-have)
   - Preferred qualifications (nice-to-have)
   - Extracted keywords ranked by frequency/importance
   - Inferred domain focus (e.g., "Genomics/Research", "ML Engineering", "Leadership")
   - Inferred role type (IC vs. leadership, seniority level)
   - **Apparent mismatches** between the job requirements and the master CV data (e.g., a required skill not evidenced, a seniority level higher than current title)
4. The system asks clarifying questions arising from both general ambiguity and specific mismatches. For example:
   - "Do you want to emphasise leadership or technical IC aspects?"
   - "Should publications be included? This appears to be a research role. Based on the job requirements, the following publications look most relevant: [ranked list]. Shall I include all, a subset, or none?"
   - "Kubernetes is listed as required but isn’t in your master data — do you have relevant experience to add, or should we note this gap?"
5. I answer the clarifying questions (UI: dropdown or button choices, not free text).  
6. If additional clarification is needed, return to 4.
7. Analysis is saved to session.

**Acceptance Criteria:**
- Required/preferred split displayed clearly.
- Mismatch analysis run against master CV data; at least one mismatch surfaced as a clarifying question when a required skill or role-type signal has no evidence in the master data.
- At least one clarifying question surfaced when domain/role-type is ambiguous.
- My answers to clarifying questions persist in session state and in `metadata.json` under `clarification_answers`.
- Clarification answers are passed as context to all downstream LLM calls in this session (cover letter, screening responses, iterative refinement) — I am never asked to re-state a preference I already gave.
- If a prior session exists for the same role type, my previous clarification answers are pre-populated as defaults (editable before confirming).
- Analysis results survive browser refresh (session-backed).

---

## US-A3: Review and Approve Content Customisations

**As a** job applicant,  
**I want to** review which experiences, achievements, and skills the system recommends including — with relevance scores —  
**So that** I have full control over what enters my CV before any document is generated.

**Steps:**
1. System presents content recommendations in interactive tables (DataTables):
   - **Experiences**:
      - reverse chronological order by default, I can reorder them using up down buttons.
      - each entry with relevance score, proposed bullet ordering, accept/reject toggle
   - **Selected Achievements**: ordered and ranked by relevance, accept/reject, reorder using up and down buttons
   - **Skills**: recommended skill groups and individual skills, ordered and ranked by relevance, accept/reject, reorder using up and down buttons
   - **Selected Publications**: ranked list of publications recommended by the LLM from `publications.bib`, each with a relevance score and rationale (keyword overlap, domain match, first-author status, recency); accept/reject per item; reorder using up/down buttons; section omitted entirely if no items accepted.
   - **Sections to omit**: e.g., "Omit Selected Publications — industry role", with rationale.
2. I adjust toggles — include/exclude any item.
3. I can reorder experience bullets within an entry by drag-and-drop or up/down controls.
4. I click **Confirm Customisations** to advance.
5. Session saves my decisions.

**Acceptance Criteria:**
- Every recommended item shows a relevance score and brief rationale.
- Include/exclude toggles work for experiences, achievements, skills, and publications individually.
- Up/down buttons for experiences, achievements, skills, and publications to change order.
- Bullet reordering within a job entry is supported.
- "Omit" suggestions (sections, experiences) are explained, not silently dropped.
- LLM-recommended publications list is shown whenever `publications.bib` is non-empty; the list is pre-ranked by relevance to the current job and each item shows its relevance score and rationale.
- If all publications are rejected, the "Selected Publications" section is omitted from the CV entirely (not rendered as an empty section).
- Confirmed decisions (including publication selections) persist in session and in `metadata.json` under `clarification_answers.selected_publications`.

---

## US-A4: Review and Approve Text Rewrites

**As a** job applicant,  
**I want to** see a card-based before/after diff for each LLM-proposed text rewrite — and accept, edit, or reject each one individually —  
**So that** no modified text enters my CV without my explicit approval.

**Steps:**
1. After content customisations are confirmed, the system calls the LLM to propose rewrites.
2. The UI displays one card per proposal, each showing:
   - **Before** text (greyed/strikethrough)
   - **After** text (highlighted)
   - Keywords introduced (pill badges)
   - Collapsible rationale + evidence citation
   - **Accept / Edit / Reject** buttons
3. For `skill_add` proposals with `evidence_strength == "weak"`, a prominent "⚠ Candidate to confirm" badge appears.
4. **Edit** replaces the After text with an inline textarea pre-filled with the proposed text; I save my version.
5. A sticky summary bar shows accepted / rejected / pending counts.
6. **Submit All Decisions** is disabled until every card is actioned.
7. I click Submit → session advances to generation phase.

**Acceptance Criteria:**
- Every proposal has a visible before/after diff.
- Weak-evidence skill additions are badged and cannot be silently accepted without noticing the warning.
- Edited final text is what actually enters the CV — not the original LLM proposal.
- Submit is blocked until all cards are actioned.
- Rewrite audit (proposal + outcome + final text) is persisted in session.

---

## US-A4b: Spell & Grammar Check Before Generation

**As a** job applicant,  
**I want to** review and resolve any spelling or grammar flags on my finalised CV text before generating documents,  
**So that** the delivered files contain no embarrassing errors — and every correction is my explicit decision.

**Precondition:** All rewrite decisions from US-A4 have been submitted.

**Steps:**
1. The system runs LanguageTool on all finalized text fields (summary, bullets, cover letter if present, screening responses if present).
2. If **no flags** are found, the UI shows a green banner: "✅ No spelling or grammar issues found" and I proceed directly to generation.
3. If flags exist, the UI displays a checklist of flagged items. Each item shows:
   - The flagged text (highlighted in context)
   - The suggestion
   - The context type (`summary` / `bullet` / `skill_name` / `cover_letter` / `screening_response`)
4. For each flag I choose one of:
   - **Accept** — apply the suggestion
   - **Reject** — leave as-is (the flag is dismissed)
   - **Edit** — open an inline textarea for my own correction
   - **Add to Dictionary** — suppress this word in all future sessions
5. Once every flag is resolved, **Proceed to Generation** becomes active.
6. I click Proceed → session advances to generation phase; spell audit is written to session state.

**Acceptance Criteria:**
- `bullet` and `skill_name` context types do not generate sentence-fragment or missing-subject warnings.
- Proper nouns and technical terms already in `custom_dictionary.json` produce no flags.
- Words added to dictionary via **Add to Dictionary** are immediately suppressed in the current session and persist to `~/CV/custom_dictionary.json` for future sessions.
- Editing a flag applies my text, not the LLM suggestion.
- **Proceed to Generation** is blocked while any flag remains unresolved.
- Spell audit (flagged text, suggestion, outcome, final) is persisted in session and included in `metadata.json`.
- Zero-flag case completes instantly — no unnecessary blocking step.

---

## US-A5a: Generate HTML for Layout Review

**As a** job applicant,  
**I want to** generate the HTML version of my CV immediately after approving rewrites,  
**So that** I can review and refine the visual layout before committing to PDF and ATS outputs.

**Steps:**
1. After spell/grammar check decisions are submitted, I click **Generate HTML Preview**.
2. The system shows a progress indicator: "Applying rewrites… Rendering HTML…"
3. On completion, the HTML file is written to the archive directory and the inline preview opens automatically:
   - `CV_{Company}_{Role}_{Date}.html` — self-contained browser-previewable file; contains Schema.org JSON-LD metadata in `<head>`
4. `metadata.json` is created/updated with the current `rewrite_audit` and `spell_audit` arrays.
5. The UI transitions to the **HTML Layout Review** step (US-A5b).

**Acceptance Criteria:**
- Only the HTML format is generated at this step; PDF and ATS DOCX are not yet produced.
- HTML preview opens automatically in the inline preview pane.
- HTML preview renders correctly in any browser with two-column layout and styling intact.
- A progress indicator is shown within 1 s of clicking Generate HTML Preview; generation typically completes within 30 s under normal load (performance guideline, not a hard SLA).
- Errors surface as user-visible messages, not silent failures.
- Archive directory and `metadata.json` created at this step.

---

## US-A5b: Review and Refine HTML Layout

**As a** job applicant,  
**I want to** preview the generated HTML and issue natural-language layout instructions to the LLM,  
**So that** I can fix section order, page-break placement, and structural presentation without editing HTML by hand.

**Steps:**
1. After HTML generation (US-A5a) completes, the UI opens an **HTML Preview** pane alongside a **Layout Instructions** text prompt.
2. I review the rendered HTML (inline preview or browser link) and identify structural issues:
   - Section out of order (e.g., Publications appearing before Skills)
   - An experience entry spilling across a page break awkwardly
   - A section I want moved to page 2
   - Too much whitespace at the bottom of page 1
3. I type a plain-English instruction in the Layout Instructions field, e.g.:
   - *"Move Publications to after the Skills section."*
   - *"Keep the Genentech entry on one page — don't split it across pages."*
   - *"Move the Selected Achievements section to page 2."*
   - *"Reduce spacing between bullet points to fit on 2 pages."*
4. I click **Apply Layout Changes**. The LLM interprets the instruction and modifies the HTML template/CSS or section order accordingly.
5. The HTML preview refreshes with the updated layout.
6. I can issue additional layout instructions; each is applied incrementally.
7. When satisfied, I click **Confirm Layout**. The final HTML is saved to the archive and the workflow advances to **US-A5c: Generate Final Output**.
8. Layout instructions are stored in `metadata.json` under `layout_instructions` (array of strings, in order applied).

**Acceptance Criteria:**
- The HTML preview pane opens automatically on entry from US-A5a.
- The Layout Instructions field accepts free-text and sends it to the LLM as a structured layout-edit prompt.
- Example instruction types include (but are not limited to): section reordering, section relocation (page 1 vs page 2), page-break hints, and spacing adjustments.
- Each applied instruction updates only the structural/presentational layer — approved rewrite text is never altered.
- The preview refreshes after each instruction is applied.
- **Confirm Layout** saves the final HTML and triggers US-A5c; it does NOT generate PDF/DOCX directly.
- All applied layout instructions are recorded in `metadata.json` under `layout_instructions`.
- If the LLM cannot confidently interpret an instruction, it asks clarifying questions rather than silently applying a guess.

---

## US-A5c: Generate Final Output (PDF + ATS DOCX)

**As a** job applicant,  
**I want to** generate the PDF and ATS DOCX from the layout-confirmed HTML,  
**So that** my submission-ready files faithfully reflect the reviewed and approved layout.

**Steps:**
1. After clicking **Proceed to Final Generation** in US-A5b, the system generates the remaining two formats from the final HTML:
   - `CV_{Company}_{Role}_{Date}.pdf` — rendered from the confirmed HTML; fonts embedded, full visual styling
   - `CV_{Company}_{Role}_{Date}_ATS.docx` — plain-text single-column; keyword-optimized for ATS portals
2. The system shows a progress indicator: "Converting to PDF… Generating ATS DOCX…"
3. On completion, the UI shows download links for all three formats (HTML already in archive from US-A5a/b).
4. `metadata.json` is updated with the final `layout_instructions` array and generation timestamps.

**Acceptance Criteria:**
- PDF and ATS DOCX are generated from the HTML that was confirmed in US-A5b (no re-render from scratch).
- File naming follows `CV_{CompanyName}_{Role}_{Date}` convention; ATS file adds `_ATS` suffix.
- All three formats available as download links on completion.
- A progress indicator is shown within 1 s of clicking Proceed to Final Generation; generation typically completes within 45 s under normal load (performance guideline, not a hard SLA).
- Errors surface as user-visible messages, not silent failures.
- `metadata.json` updated with generation timestamps for each format.

---

## US-A6: Review and Iteratively Refine Generated Output

**As a** job applicant,  
**I want to** preview the generated files and request targeted edits before finalising,  
**So that** I can perfect the content without starting over.

**Steps:**
1. I open the PDF preview in the UI (or download and review). *(For HTML layout/structural changes — section order, page breaks, spacing — use US-A5b.)*
2. I provide feedback on **content**: "Make the professional summary more technical" or "Add the MLOps keyword to the skills section".
3. For changes that affect already-approved rewrite text, the system re-enters the **rewrite review** step for just the affected items.
4. For semantic/content changes (add/remove an experience entry, change which bullets are included), the system re-enters the **content customisation** step.
5. I confirm again; the system re-runs from US-A5a (HTML generation) through US-A5b (layout review) and US-A5c (PDF + ATS generation).
6. I can iterate this loop as many times as needed within the session.

**Acceptance Criteria:**
- Feedback can trigger targeted re-entry into rewrite review OR content customisation, not always a full restart.
- Previously approved decisions are preserved as defaults when re-entering a review step.
- Each regeneration cycle updates the archive and `metadata.json`.
- Layout-only instructions (section order, page breaks) are directed to US-A5b, not treated as content changes.

---

## US-A7: Generate Cover Letter

**As a** job applicant,  
**I want to** generate a tailored cover letter after my CV is approved,  
**So that** I have a complete application package from the same workflow.

**Steps:**
1. After CV is finalised, I click **Generate Cover Letter**.
2. The system checks prior sessions for cover letters with the same tone preference or role type. If a match is found, it asks: "You wrote a similar cover letter for **{Company}** ({Date}) — use it as a starting point?"
   - **Yes** → The LLM uses the prior letter body as the starting point (proceed to step 3).
   - **No** → generate fresh (proceed to step 3).
3. The system asks for:
   - Hiring manager name/title (if known; otherwise "Hiring Manager")
   - Company address (optional)
   - Tone preference: startup/tech, pharma/biotech, academia, financial, leadership
   - Any specific achievement or project to highlight
4. The LLM generates a cover letter using the job's key requirements **and** the session's `clarification_answers` as context.
5. The cover letter is displayed in an editable text area.
6. I refine the text inline (free edit) and click **Save Cover Letter**.
7. Saved as `CoverLetter_{Company}_{Date}.docx` `CoverLetter_{Company}_{Date}.pdf` in the archive folder. The finalized body text is also stored in `metadata.json` under `cover_letter_text` for future reuse.

**Acceptance Criteria:**
- If a prior same-tone or same-role-type cover letter exists, it is surfaced with a "use as starting point" prompt before generation.
- Tone matches my selection from at least 4 preset options.
- Hiring manager name, if provided, appears in the salutation.
- Cover letter references specific skills/achievements from the approved CV content — not generic text.
- The LLM has access to the session's `clarification_answers` when generating (no need to re-state preferences).
- Editable before saving.
- Saved to archive as `.docx`, `.pdf`, **and** as `cover_letter_text` in `metadata.json`.
- `metadata.json` records `cover_letter_reused_from` (prior session ID or `null`).

---

## US-A8: Handle Application Screening Questions

**As a** job applicant,  
**I want to** paste screening questions and receive tailored draft responses,  
**So that** I can complete application forms efficiently without writing responses from scratch.

**Steps:**
1. I paste one or more screening questions into the UI (plain text, one question per block).
2. For each question, the system:
   - Searches `~/CV/response_library.json` for semantically similar past responses. If found, surfaces the best match: "You answered a similar question for **{Company}** ({Date}) — use as a starting point?"
     - **Yes** → The LLM uses the prior response as a starting place.
     - **No** → The LLM proceeds to generate fresh.
   - Shows the top 3 relevant experiences from `Master_CV_Data.json` with match scores.
   - Suggests a response format: Direct/Concise (150–200 w), STAR (250–350 w), or Technical Detail (400–500 w).
3. I select the format and which experiences to highlight.
4. The LLM generates a draft response using the selected experiences **and** the session's `clarification_answers` as context.
5. I edit the response inline and click **Save**.
6. Responses are saved as `screening_responses.docx` in the archive folder. Each finalized response is also stored in `metadata.json` under `screening_responses` (structured) and upserted into `~/CV/response_library.json` indexed by topic tag.

**Acceptance Criteria:**
- Semantically similar prior responses are surfaced per question before generating fresh text.
- At least 3 relevant experience matches shown per question.
- All three response formats available and produce text in roughly the appropriate length range. Word count ranges (150–200w / 250–350w / 400–500w) are targets shown as guidance in the UI — the system does not auto-reject or retry responses that fall slightly outside the range.
- The LLM has access to the session's `cover_letter` and `clarification_answers` when generating draft responses.
- My format and experience choices persist per question.
- Responses editable before saving.
- All responses exported together in one DOCX file.
- Each finalized response stored in `metadata.json` as `{question, topic_tag, format, response_text, reused_from_session}`.
- `~/CV/response_library.json` updated with the finalized response after saving.

---

## US-A9: Finalise, Archive, and Submit

**As a** job applicant,  
**I want to** mark my application as ready/sent and have all materials archived with full metadata,  
**So that** I have a complete record for future reference and follow-up.

**Steps:**
1. I review the archive folder contents in the UI: CV PDF, ATS DOCX, cover letter, screening responses.
2. I update the application status: `draft → ready → sent`.
3. I optionally add notes (e.g., "Applied via Workday portal, ref #12345").
4. I click **Finalise** — the system:
   - Writes final `metadata.json` (including status, notes, all file paths, rewrite audit, spell audit, customisation decisions, `clarification_answers`, `cover_letter_text`, and `screening_responses`).
   - Upserts all screening responses into `~/CV/response_library.json`.
   - Commits all artefacts to Git with message `feat: Add {Company}_{Role}_{Date} application`.
5. A confirmation summary is shown: files generated, total time, keywords matched.

**Acceptance Criteria:**
- Status transitions (draft → ready → sent) persistent in `metadata.json`.
- Notes field saved.
- Git commit created automatically with all artefacts.
- Summary shows keyword match score vs. job description.

---

## US-A10: Update Master CV Data

**As a** job applicant,  
**I want to** update my `Master_CV_Data.json` via natural language or document ingestion — not raw JSON editing —  
**So that** my master data stays current without requiring me to be a JSON expert.

**Steps:**
1. I navigate to the **Manage Master Data** section.
2. I can:
   - Type a natural-language update: "I just finished a project at Acme using Kubernetes. Add it to my exp_005 achievements."
   - Paste an existing document (old CV, LinkedIn export) for bulk ingestion.
3. The system shows me the proposed JSON changes and asks for confirmation.
4. On confirmation, it writes the updated `Master_CV_Data.json` and commits to Git.

**Acceptance Criteria:**
- Natural-language updates produce a proposed JSON diff shown to me before writing.
- Document ingestion extracts structured data with a review step.
- No blind writes — every change requires explicit confirmation.
- Git commit on every confirmed update.

---

## US-A11: Session Master Data Harvest

**As a** job applicant,  
**I want to** review and selectively write back improvements discovered during this session to my master CV data,  
**So that** my master data gets continuously better with each application I run.

**Steps:**
1. After clicking **Finalise** (US-A9), the system presents a **Session Harvest** prompt: *"This session produced improvements to your CV content. Would you like to update your master data?"*
2. The system compiles a list of candidate write-back items from the session, grouped by type:
   - **Improved bullets** — bullets where an approved rewrite is materially better than the original master text (not just keyword-swapped)
   - **New / renamed skills** — skills added or terminology-updated during the skills review step
   - **Professional summary variant** — if the summary was rewritten and approved, offer to store it as a named variant in `professional_summaries`
   - **Clarification answers that revealed a gap** — e.g., if the user answered "yes, I have Kubernetes experience" to a mismatch question, offer to add that skill/bullet to master data
3. For each candidate item the system shows:
   - The **original master text** (or "new — not in master") alongside the **proposed master update**
   - The rationale for the suggestion (e.g., *"This rewrite adds a quantified metric absent in the original"*)
4. I select which items to write back (checkboxes; default: none selected — opt-in only).
5. I click **Apply Selected Updates**. The system shows a consolidated JSON diff of all selected changes.
6. I confirm and the system:
   - Writes the updated `Master_CV_Data.json`.
   - Commits to Git with message `chore: Update master CV data from {Company}_{Role}_{Date} session`.
7. A summary is shown: *"X items written to master data."*
8. I can click **Skip** at any point to bypass the harvest without writing anything.

**Acceptance Criteria:**
- Session harvest prompt appears automatically after Finalise; it is skippable.
- Candidate write-back items are compiled from: approved rewrites, approved skill additions, summary rewrites, and clarification-answer-revealed skills.
- No item is pre-selected — every write-back is explicit opt-in.
- Each candidate item shows a before/after diff with a human-readable rationale.
- A consolidated JSON diff is shown before any write.
- No blind writes — explicit confirmation required.
- Items the user declines are never written; session-specific content stays session-specific.
- Git commit on every confirmed harvest.
- Harvest step is skippable if no meaningful improvements were generated this session (i.e., all rewrites were rejected or were keyword-only swaps).

---

## US-A12: Re-enter and Re-run Earlier Workflow Stages

**As a** job applicant,
**I want to** return to any previously completed workflow stage and re-run it — including the job analysis step — at any point in the session,
**So that** if I'm uncertain a step completed correctly, or I want to refine it after seeing downstream results, I can do so without losing later work.

**Precondition:** At least one workflow stage has been completed.

**Key scenario (analysis re-run):**
I have proceeded to the Customisations or Rewrite Review step and realise the job analysis may have been incomplete — for example, it missed a required skill, used the wrong role type, or my clarifying answers were different from what I intended. I want to re-run **Analyse Job** without discarding approved customisations or rewrites.

**Steps:**

1. From any workflow stage, I can see a **Re-run** or **Re-analyse** affordance next to any completed stage in the progress indicator. (Examples: "Re-analyse" on the Analysis stage chip; "Re-review Customisations" on the Customisations stage chip.)
2. I click **Re-analyse** (or equivalent for another stage).
3. The system shows a confirmation dialogue explaining:
   - Which stage will be re-run.
   - Which downstream stages (if any) could be affected by the re-run.
   - That downstream approvals will be preserved as defaults but may need review if the re-run changes recommendations.
4. I confirm and the system re-runs the selected stage using:
   - The original job text (plus my current clarification answers, which I can amend at this step).
   - All downstream approved decisions (customisations, rewrites, layout instructions) as context — so the LLM is aware of what I have already approved.
5. Results from the re-run are shown in the relevant UI step.
6. For each downstream stage that could be affected (e.g., customisation recommendations changed after re-analysis), the UI flags which items are new, changed, or no longer recommended — rather than requiring me to re-review everything from scratch.
7. Items I previously approved that are unaffected by the re-run retain their approved state.
8. I review and confirm the affected items and continue.

**Acceptance Criteria:**

- A **Re-run** affordance is visible for each completed stage in the workflow progress indicator (not just via a hidden settings menu).
- The confirmation dialogue accurately lists which downstream stages contain decisions that could be affected.
- Re-running a stage does not silently discard any previously approved decision; all prior approvals are preserved until the user explicitly changes them.
- The LLM re-run receives the full session context: original job text, current clarification answers, and a summary of downstream decisions already approved.
- After re-run, only changed or new items are highlighted as requiring re-review; unchanged items remain approved without requiring re-confirmation.
- Clarification answers can be amended when triggering a re-run of the Analysis stage, without requiring a separate step.
- Session state and audit log record each re-run event with: stage name, timestamp, previous clarification answers (if changed), and count of downstream items affected.
- Re-run affordance is also accessible via a keyboard shortcut or menu, not only via the progress indicator.

**Anti-patterns to guard against:**

- Re-running analysis silently overwrites all customisation decisions, forcing a full re-review.
- Re-run triggers only available by navigating back with no way to return to the current stage without losing work.
- No visual indication of which previously approved items were affected by the re-run.
- User must re-answer all clarifying questions from scratch even when only one answer changed.
