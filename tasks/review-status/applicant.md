<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Applicant Review Status

**Last Updated:** 2026-04-22 15:45 ET

**Executive Summary:** Source-first review of all fourteen applicant story entries (US-A1 through US-A12, plus US-A3b and US-A4b). The core intake → analysis → customisation → rewrite → spell → generate → layout → finalise pipeline is well-implemented with most criteria satisfied. Four outright failures remain: all output formats (HTML + PDF + DOCX) are generated together rather than in the story-specified HTML-first staged model (US-A5a), no "queued" session lifecycle status exists (US-A1), no pre-write consolidated JSON diff is shown during harvest before writing to master data (US-A11), and no keyboard shortcut exists for the re-run affordance (US-A12). The re-run ↻ icon is also hidden behind a CSS hover rather than permanently visible as the story requires. The metadata key mismatch (`post_analysis_answers` vs. story spec's `clarification_answers`) remains a silent quality risk for cover letter and screening generation. Twelve of fourteen stories are mostly-passing; no story is a total fail.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | URL and paste-text paths both work | ✅ Pass | `web/job-input.js`: three input-method tabs (Paste Text, From URL, Upload File); `submitJobText()`, `fetchJobFromURL()`, `uploadJobFile()` all implemented |
| 2 | File upload path works | ✅ Pass | `web/job-input.js`: drag-drop + click upload, supports .txt/.md/.html/.pdf/.docx/.rtf up to 20 MB; `uploadJobFile()` routes to `analyzeJob()` |
| 3 | Protected-site warning surfaced with manual-copy fallback | ✅ Pass | `web/job-input.js` URL panel: two-column advisory; amber box lists "Copy manually from: LinkedIn (login required), Indeed (anti-bot), Glassdoor (auth required)" |
| 4 | Company name, role title, date auto-extracted and user-editable before queuing | ⚠️ Partial | `scripts/utils/conversation_manager.py`: `_store_job_analysis()` extracts `position_name` from title+company post-analysis; `intake` dict stored in session state. However extraction happens *after* the LLM analysis, not as a pre-analysis user-confirmation step — so errors are only catchable after tokens have been spent |
| 5 | Session persisted with `status: "queued"` immediately after Step 5 | ❌ Fail | `scripts/utils/conversation_manager.py:42–49`: `Phase` enum defines only `init`, `job_analysis`, `customization`, `rewrite_review`, `spell_check`, `generation`, `layout_review`, `refinement` — no `queued` state; pre-analysis sessions remain in ambiguous `init` phase in the session switcher |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No "queued" lifecycle status | User cannot distinguish a parked pre-analysis job from a freshly opened session; session switcher shows raw phase names |
| Intake confirmation occurs post-analysis | If company/role/date are wrong, the analysis has already consumed LLM tokens |

---

### US-A2: Understand What the Job Requires

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Progress indicator appears within 1 s of submit | ✅ Pass | `web/job-input.js`: `analyzeJob()` calls `setLoading(true, 'Analysing job description…')` synchronously before the LLM fetch |
| 2 | Required / preferred skills split clearly displayed | ✅ Pass | Analysis tab renders "Required Skills" and "Preferred / Nice-to-Have" in separate blocks; skills absent from master CV badged with `missing` class |
| 3 | ATS keywords ranked by frequency / importance | ✅ Pass | Keywords rendered with rank badges (#1, #2 …) and heading "higher rank = higher priority" |
| 4 | Inferred domain focus shown | ✅ Pass | Analysis role card shows `domain` as a meta chip |
| 5 | Inferred role type (IC vs. leadership) shown | ⚠️ Partial | `role_level` chip present in analysis card, but no explicit IC vs. individual-contributor vs. leadership signal beyond the raw LLM-returned string; no seniority-mismatch callout |
| 6 | Apparent mismatches against master CV surfaced | ⚠️ Partial | Mismatch callout compares `required_skills` against master `_masterSkills`; seniority, leadership/IC, and domain-level mismatches are not checked |
| 7 | Clarifying question surfaced for each required skill gap | ⚠️ Partial | Questions tab populated by `GET /api/post-analysis-questions`; however there is no explicit visual link between the Analysis mismatch callout and the generated questions list |
| 8 | `clarification_answers` persisted in `metadata.json` | ⚠️ Partial | Backend key is `post_analysis_answers` throughout `scripts/utils/conversation_manager.py` (lines 70, 656, 731, 852, 1259); story spec uses `clarification_answers` — any downstream consumer using the spec key will silently receive nothing |
| 9 | Prior-session answers pre-populated as defaults | 🔲 Not implemented | No code found in questions-panel restore path that loads prior answers for the same role type |
| 10 | Analysis results survive browser refresh | ✅ Pass | Analysis stored in `stateManager.setTabData('analysis', …)` backed by session file; `fetchStatus()` restores tab data on reload |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| `post_analysis_answers` vs. `clarification_answers` key mismatch | Cover letter and screening generators may silently receive empty session context, producing generic output |
| Mismatch analysis limited to required skills only | IC-vs-leadership fit and seniority mismatches go unnoticed until the applicant reads the generated CV |
| No prior-session answer pre-population | Repeat applicants for the same role type must answer from scratch every session |

---

### US-A3: Review and Approve Content Customisations

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Experiences table with recommendation, confidence, accept/reject | ✅ Pass | `web/experience-review.js`: DataTable with recommendation badge, confidence, reasoning, and emphasize/include/de-emphasize/exclude buttons per row |
| 2 | Experiences in reverse chronological order by default | ✅ Pass | `web/experience-review.js`: rows sorted by `start_date` descending on first load |
| 3 | Up/down reorder buttons for experiences | ✅ Pass | `web/experience-review.js`: `row-up` / `row-down` icon buttons present per row |
| 4 | Achievements table with relevance, accept/reject, reorder | ✅ Pass | `web/achievements-review.js`: achievements with include/emphasize/de-emphasize/exclude decisions and up/down row buttons |
| 5 | Skills table with recommendation, accept/reject | ✅ Pass | `web/skills-review.js`: skills table with category grouping and per-skill decisions |
| 6 | Publications table with relevance score, rationale, accept/reject | ✅ Pass | `web/publications-review.js`: ranked list with score/10, confidence badge, rationale, accept/reject toggle; recommended / not-recommended divider row |
| 7 | Bullet reordering within a job entry | ✅ Pass | `web/workflow-steps.js:showBulletReorder()`: modal with ↑ / ↓ buttons, "Use Suggested Order" button when job-analysis bullet_order exists, and "↺ Reset to Auto" |
| 8 | LLM-recommended publications pre-ranked by relevance | ✅ Pass | `web/publications-review.js`: publications sorted recommended-first; `is_recommended` flag used; divider separates recommended from the rest |
| 9 | "Omit" suggestions explicitly surfaced with rationale | ⚠️ Partial | Per-row `exclude` recommendation is shown with reasoning; no dedicated "Sections to omit" summary panel at the top of the customisations view |
| 10 | Publications section omitted from CV if all publications rejected | ⚠️ Partial | Frontend hides the section when `recommendations.length === 0`; no verified enforcement that the CV template skips the section header when all items are excluded |
| 11 | Confirmed decisions persist in session and `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py`: `publication_decisions`, `experience_decisions`, `skill_decisions`, `achievement_decisions` all stored in session state |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No dedicated "Sections to omit" callout | High-level omission rationale (e.g. "Publications — industry role, omit entire section") not surfaced as a top-level recommendation |
| All-publications-rejected omission not verified in template | Empty publications section may still render a blank heading in the generated CV |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Skills displayed grouped under master CV category headings | ✅ Pass | `web/skills-review.js`: category grouping rendered; `saveSkillCategoryOverride()` and category-order API wired |
| 2 | LLM category-change suggestions presented for review before applying | 🔲 Not implemented | No code found in `web/skills-review.js` or `conversation_manager.py` that queues pending LLM category suggestions; category changes are user-initiated only |
| 3 | Rename a category | ✅ Pass | `web/skills-review.js:renameSkillCategory()` → `POST /api/review-skill-categories` with `action: 'rename'` |
| 4 | Reorder categories | ✅ Pass | `web/skills-review.js:saveSkillCategoryOrder()` → `POST /api/review-skill-categories` with `action: 'reorder'` |
| 5 | Move a skill from one category to another | ✅ Pass | `web/skills-review.js:saveSkillCategoryOverride()` → `POST /api/review-skill-category` |
| 6 | Proficiency and sub-skills editable per skill | ✅ Pass | `web/skills-review.js:_skillInlineLabel()` renders proficiency + sub-skills inline; `skill_qualifier_overrides` stored in `conversation_manager.py` |
| 7 | Add new skills not in master CV | ✅ Pass | `web/skills-review.js:_normalizeExtraSkillEntry()` normalises user-created skill entries; `extra_skills` stored in session |
| 8 | Readability warning when inline bullet group is excessively long | 🔲 Not implemented | No readability-check logic found in skills-review source or related CSS |
| 9 | Category decisions stored in session state (never in master CV) | ✅ Pass | `scripts/utils/conversation_manager.py`: `skill_group_overrides`, `skill_category_overrides`, `skill_category_order` all session-scoped; master is read-only during customisation per project rules |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No LLM category suggestion workflow | LLM analysis may identify obvious category improvements but cannot surface them to the applicant |
| No readability warning for long inline bullets | Overly long skill lines are only discovered on PDF preview after generation |

---

### US-A4: Review and Approve Text Rewrites

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Card-based before/after with word-level diff | ✅ Pass | `web/rewrite-review.js:computeWordDiff()`: LCS word-diff algorithm; `renderDiffHtml()` renders removed/added tokens with CSS highlighting |
| 2 | Keywords introduced shown as pill badges | ✅ Pass | `web/rewrite-review.js`: `keywords_introduced` array rendered as `<span class="rewrite-keyword">` pills with rank badge |
| 3 | Collapsible rationale with evidence citation | ✅ Pass | `web/rewrite-review.js`: `<details class="rewrite-rationale">` with `summary`, `rationale`, and `evidence` fields |
| 4 | Accept / Edit / Reject per card | ✅ Pass | `web/rewrite-review.js`: three buttons per card |
| 5 | Weak-evidence (`skill_add`) badge | ✅ Pass | `web/rewrite-review.js`: `isWeakSkillAdd` flag detected; `⚠ Candidate to confirm` badge rendered in card header |
| 6 | Persuasion-patterns warning panel | ✅ Pass | `web/rewrite-review.js`: collapsible persuasion warnings panel with `⚠ Acknowledged` dismiss button |
| 7 | User-edited text enters CV (not original LLM proposal) | ✅ Pass | `web/rewrite-review.js:saveRewriteEdit()` stores `{ outcome: 'edit', final_text: editedText }` in `rewriteDecisions` |
| 8 | Sticky tally bar showing accepted / rejected / pending | ✅ Pass | `web/rewrite-review.js`: `rewrite-tally` bar with per-category counts; updates on each decision |
| 9 | Submit Rewrites button blocked until all cards actioned | ✅ Pass | `web/rewrite-review.js`: `submitBtn.disabled = (pending > 0)` |
| 10 | Rewrite audit record persisted in session | ✅ Pass | `scripts/utils/conversation_manager.py`: `rewrite_audit` stored in session state |

All criteria pass.

---

### US-A4b: Spell & Grammar Check Before Generation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | LanguageTool checks all finalised text fields | ✅ Pass | `scripts/web_app.py`: `SpellChecker` imported; spell check runs as a distinct workflow phase with dedicated `step-spell` step and `tab-spell` tab |
| 2 | Zero-flag case shows green banner and auto-continues | ✅ Pass | Zero-flag fast-path present: if no flags are returned the frontend auto-advances without requiring user action |
| 3 | Flagged items shown with surrounding context and context type | ⚠️ Partial | Spell check tab and result panels exist; story-specified `bullet` / `skill_name` context-type labelling not independently verified in `SpellChecker` source fragments read |
| 4 | Accept / Reject / Edit / Add to Dictionary per flag | ✅ Pass | User can accept a replacement, apply a custom correction, ignore a flag, or add a word to the custom dictionary |
| 5 | `custom_dictionary.json` persists added words across sessions | ⚠️ Partial | `SpellChecker` imported; `~/CV/custom_dictionary.json` persistence path referenced in story but not verified in available source fragments |
| 6 | Proceed to Generation blocked while flags are unresolved | ✅ Pass | Backend advances phase only after spell-check decisions submitted; `spell-btn` disabled state wired |
| 7 | Spell audit record persisted in session | ✅ Pass | `scripts/utils/conversation_manager.py`: `spell_audit` stored in session state |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| Custom dictionary path not verified from UI source | Words added in a session may not survive a session restart |

---

### US-A5a / US-A5b / US-A5c: Three-Step Generation (HTML → Layout → PDF + DOCX)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| A1 | Only HTML generated at Step 5a; PDF/DOCX deferred until after layout review | ❌ Fail | `generate_cv` call generates all formats (HTML + PDF + DOCX) together; no HTML-only first-pass generation path exists; the user reviews a layout that is already the final generation artifact |
| A2 | HTML preview opens automatically after 5a completes | ✅ Pass | After `generate_cv` the app transitions to the Layout tab automatically |
| A3 | Progress indicator shown within 1 s | ✅ Pass | Loading overlay + conversation panel message shown before generation request; `spell-btn` transitions to spinner state |
| A4 | Errors surfaced as user-visible messages | ✅ Pass | All generation API calls surface errors through the conversation panel |
| B1 | HTML preview pane alongside free-text Layout Instructions field | ✅ Pass | `web/layout-instruction.js`: preview pane and instruction input implemented in layout tab |
| B2 | Natural-language layout instruction → LLM → HTML update | ✅ Pass | `web/layout-instruction.js`: `POST /api/cv/layout-refine` sends instruction; HTML preview refreshes |
| B3 | Preview refreshes after each instruction | ✅ Pass | `web/layout-instruction.js:renderLayoutPreviewStatus()`: freshness timestamps updated after each refine call |
| B4 | Undo stack for layout instructions | ✅ Pass | `web/layout-instruction.js`: `_layoutUndoStack` (max 20 entries) wired to Undo button |
| B5 | Approved rewrite text never altered by layout instructions | ✅ Pass | Layout refine modifies presentational / structural HTML only; text content is write-protected at the route level |
| B6 | Confirm Layout button saves final HTML and triggers 5c | ✅ Pass | Confirm Layout calls `POST /api/cv/generate-final` then `POST /api/layout-complete` |
| B7 | Layout instructions recorded in `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py`: `layout_instructions` stored as `List[Dict]` in session state |
| C1 | PDF and ATS DOCX generated from confirmed HTML artifact | ⚠️ Partial | Final generation triggers a fresh render pass, not a direct format-conversion of the confirmed HTML preview; subtle rendering differences between the confirmed preview and the final output are possible |
| C2 | File naming follows `CV_{Company}_{Role}_{Date}` convention | ✅ Pass | Standard naming enforced by the CV orchestrator |
| C3 | All formats available as download links | ✅ Pass | Finalise / File Review tab lists all generated files with download links |
| C4 | Progress indicator during final generation | ✅ Pass | Loading state shown during `generate-final` API call |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| All formats generated together at the "Generate" step (US-A5a failure) | Applicant cannot review HTML layout before PDF/DOCX are produced; if layout changes are needed, all three formats must be regenerated |
| Final generation re-renders from source rather than converting confirmed HTML | The preview approved by the applicant may not exactly match the archived PDF if renderer state differs |

---

### US-A6: Review and Iteratively Refine Generated Output

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Feedback triggers targeted re-entry to an earlier step | ✅ Pass | `web/workflow-steps.js:backToPhase()`: `POST /api/back-to-phase` supports re-entry to any prior phase |
| 2 | Previously approved decisions preserved as defaults on re-entry | ✅ Pass | `web/workflow-steps.js`: confirmation message "Prior decisions and approvals are preserved" shown |
| 3 | Downstream-stages impact listed in the confirmation modal | ✅ Pass | `web/workflow-steps.js:_showReRunConfirmModal()`: lists completed downstream stages that will be affected |
| 4 | Each regeneration cycle updates archive files and `metadata.json` | ✅ Pass | `web/finalise.js:finaliseApplication()` writes final metadata; generation routes update session on each cycle |

All criteria pass. Minor gap: the system does not automatically distinguish "layout-only feedback" from "content-change feedback" — the applicant must manually navigate to the correct step.

---

### US-A7: Generate Cover Letter

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Prior cover letter from same-role sessions surfaced before generation | ✅ Pass | `web/cover-letter.js:populateCoverLetterTab()`: `GET /api/cover-letter/prior` renders prior-session radio cards; selected letter body available as `reuse_body` |
| 2 | Tone presets (≥ 4 options) | ✅ Pass | `web/cover-letter.js`: 5 tone presets — startup/tech, pharma/biotech, academia, financial, leadership/exec |
| 3 | Opening style selector | ✅ Pass | `web/cover-letter.js`: 3 opening styles — formal, hook, narrative — wired as `opening_style` in payload |
| 4 | Hiring manager name in salutation | ✅ Pass | `web/cover-letter.js`: `cl-hiring-manager` input wired to `hiring_manager` field in `POST /api/cover-letter/generate` payload |
| 5 | Cover letter references approved CV achievements and keywords | ⚠️ Partial | `POST /api/cover-letter/generate` receives session context from the backend; however the story's `clarification_answers` context is stored under `post_analysis_answers` — generation may receive empty context silently |
| 6 | Editable in an textarea before saving | ✅ Pass | `web/cover-letter.js`: editable `cl-letter-textarea` with live validation (`_validateCoverLetter`) |
| 7 | Saved to archive as `.docx` and `.pdf` | ⚠️ Partial | `POST /api/cover-letter/save` route exists; `cover_letter_text` written to session state by `scripts/utils/conversation_manager.py`; output file formats (.docx + .pdf) not verified in available source fragments |
| 8 | `cover_letter_text` persisted in `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py`: `cover_letter_text` stored in session state and written to metadata at Finalise |
| 9 | `cover_letter_reused_from` persisted in `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py`: `cover_letter_reused_from` stored in session state |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| `.docx`/`.pdf` cover letter output not verified | Applicant may have no physical cover letter file to attach to an application |
| Session context key mismatch (US-A2 carry-over) | Generated cover letter may lack role-specific tailoring if `post_analysis_answers` is not read by the cover letter route |

---

### US-A8: Handle Application Screening Questions

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Paste screening questions UI | ✅ Pass | `web/screening-questions.js:populateScreeningTab()`: textarea + "Parse Questions" button; split on blank lines or numbered patterns |
| 2 | Prior response library search per question | ✅ Pass | `web/screening-questions.js:searchForQuestion()` → `POST /api/screening/search`; best prior match surfaced with similarity score |
| 3 | "Use as starting point" option for prior responses | ✅ Pass | `web/screening-questions.js`: "Use as starting point" checkbox wired via `togglePriorUse()` |
| 4 | Three format presets (Direct / STAR / Technical) with word-count guidance | ✅ Pass | `web/screening-questions.js`: `_fmtLabel()` renders "150–200w", "250–350w", "400–500w" labels on the three format buttons |
| 5 | At least 3 relevant experience cards shown per question | ⚠️ Partial | `web/screening-questions.js:searchForQuestion()` calls `POST /api/screening/search`; experience cards with match score percentages rendered, but minimum count of 3 not independently verified |
| 6 | `clarification_answers` (session context) used when generating response | ⚠️ Partial | Session context passed via backend; again subject to `post_analysis_answers` key mismatch risk |
| 7 | Responses editable before saving | ✅ Pass | Generated response inserted into per-question editable textarea |
| 8 | All responses exported together as one `.docx` | ⚠️ Partial | `saveScreeningResponses()` → `POST /api/screening/save`; DOCX output format not verified from available source |
| 9 | `~/CV/response_library.json` updated after saving | ⚠️ Partial | Save route exists; write-back to `response_library.json` not verified in available source fragments |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| Minimum 3 experience cards not verified | Applicant may see fewer relevant experience options when constructing a STAR response |
| Response library write-back not verified | Library doesn't accumulate session learnings; semantic reuse won't improve in future sessions |

---

### US-A9: Finalise, Archive, and Submit

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Archive folder contents listed in UI | ✅ Pass | `web/finalise.js:populateFinaliseTab()`: generated files listed from `/api/status` with download links |
| 2 | Status transitions (draft → ready → sent) | ✅ Pass | `web/finalise.js`: `<select>` with draft / ready / sent options sent to `POST /api/finalise` |
| 3 | Notes field | ✅ Pass | `web/finalise.js`: `<textarea id="finalise-notes">` wired to finalise payload |
| 4 | Git commit created automatically on finalise | ✅ Pass | `web/finalise.js`: `commit_hash` returned by `/api/finalise`; git warning shown if commit fails |
| 5 | Summary shows files, ATS keyword coverage | ✅ Pass | `web/finalise.js`: finalise result shows approved rewrite count, ATS score, coverage percentage, git commit hash |
| 6 | Summary shows total elapsed time for the application session | 🔲 Not implemented | No elapsed-time field in the finalise result HTML in `web/finalise.js` |

---

### US-A10: Update Master CV Data

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Master CV tab accessible from the application workflow | ✅ Pass | `web/index.html`: `tab-master` tab present; `web/master-cv.js` module exists |
| 2 | Natural-language update produces a proposed JSON diff before writing | ⚠️ Partial | Master CV tab exists and sends updates to backend; diff presentation flow not directly verified in source fragments read |
| 3 | No blind writes — explicit user confirmation required | ⚠️ Partial | Required by project `AGENTS.md` and `copilot-instructions.md`; not independently verified in `web/master-cv.js` source |
| 4 | Git commit created on confirmed master CV update | ⚠️ Partial | Git commit wired in the finalise and harvest flows; master-data direct-edit path not independently verified |

---

### US-A11: Session Master CV Harvest

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Harvest prompt appears automatically after Finalise | ✅ Pass | `web/finalise.js:finaliseApplication()`: calls `showHarvestSection()` on successful finalise response |
| 2 | Candidate types include improved bullets, new skills, summary variants, confirmed skill gaps | ✅ Pass | `scripts/web_app.py`: `_compile_harvest_candidates`, `_harvest_add_skill`, `_harvest_add_summary_variant`, `_harvest_apply_bullet` imported; candidate types `improved_bullet`, `new_skill`, `summary_variant`, `skill_gap_confirmed` |
| 3 | Harvest is skippable | ✅ Pass | `web/finalise.js`: Skip button hides `harvest-section` div without writing anything |
| 4 | Before / after diff with rationale shown per candidate item | ✅ Pass | `web/finalise.js`: harvest table renders original (strikethrough) + proposed + rationale columns |
| 5 | No item pre-selected (opt-in only) | ✅ Pass | `web/finalise.js`: harvest checkboxes rendered without `checked` attribute — all unchecked by default |
| 6 | Consolidated JSON diff shown **before** writing to master CV | ❌ Fail | `web/finalise.js:applyHarvestSelections()`: code calls `POST /api/harvest/apply` directly; a `diff_summary` is returned and shown **after** the write completes, not as a pre-write preview step |
| 7 | Git commit on confirmed harvest | ⚠️ Partial | `commit_hash` returned by `/api/harvest/apply` in the success case; error paths may bypass the commit |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No pre-write consolidated diff | Applicant cannot verify the exact JSON changes before they are applied; mistakes require manual master-CV rollback |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Re-run affordance permanently visible on each completed step | ⚠️ Partial | `web/workflow-steps.js`: `step-rerun` spans have `style="opacity:0"` by default; they become visible only on CSS hover (`.step.completed:hover .step-rerun { opacity: 1 !important; }`). Not permanently visible; requires mouse hover to discover |
| 2 | Confirmation dialog lists downstream stages that will be affected | ✅ Pass | `web/workflow-steps.js:_showReRunConfirmModal()`: downstream completed stages listed in modal body |
| 3 | Prior approvals preserved as defaults on re-run | ✅ Pass | `web/workflow-steps.js:backToPhase()` → `POST /api/back-to-phase`; message "Prior decisions and approvals are preserved" shown |
| 4 | LLM re-run receives full session context | ✅ Pass | `POST /api/back-to-phase` and `POST /api/re-run-phase` include existing session; job text and prior answers preserved |
| 5 | After re-run, changed / new items highlighted | ⚠️ Partial | `web/workflow-steps.js:_highlightChangedItems()` exists and marks changed items with `data-changed` attribute and a 2.5-second CSS animation; however the highlight is **transient** — no persistent "new since re-run" badge remains after the animation ends |
| 6 | Clarification answers can be amended when triggering Analysis re-run | ⚠️ Partial | Re-run navigates back to analysis step; Questions tab re-renders with existing answers as editable defaults; no explicit "amend one answer only" flow defined |
| 7 | Re-run events logged to session audit (stage, timestamp, affected count) | 🔲 Not implemented | No re-run event audit record found in `conversation_manager.py` state fields or in the back-to-phase / re-run-phase route responses |
| 8 | Keyboard shortcut to trigger re-run | ❌ Fail | No keyboard shortcut found in `web/workflow-steps.js`, `web/app.js`, or any event-listener scan |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| Re-run ↻ icon hidden until hover | Power users and keyboard-only users may not discover the re-run affordance; accessibility concern |
| Delta highlighting is transient (2.5 s only) | After re-analysis, all 20+ experience/skill rows appear identical; applicant must find changed items manually |
| No re-run audit log | No record of how many times a stage was re-run or what changed; hard to explain decisions to a recruiter |
| No keyboard shortcut | Accessibility gap for keyboard-only and power users |

---

## Generated Materials Evaluation

### HTML Preview and PDF Layout Quality

| Finding | Severity |
|---------|---------|
| All three output formats (HTML + PDF + DOCX) generated in one `generate_cv` call rather than HTML-first | High — the "preview" in Layout Review is actually the already-generated artifact; layout changes trigger a complete re-generation of all formats |
| WeasyPrint (primary) + Chrome headless (fallback) rendering shown as separate badges | Medium — two renderers may produce slightly different output; discrepancy can surprise applicants who approved a specific layout |
| ATS DOCX format generated alongside human-readable PDF | Good — both formats produced in one pipeline step |

### Cover Letter Quality

| Finding | Severity |
|---------|---------|
| 5 tone presets cover the most common applicant industries | Good |
| Prior cover letter "starting point" surfaced before generation — avoids blank-slate syndrome | Good |
| DOCX / PDF output format not verified from client source | Medium — applicant may receive only a text body; complete application package unconfirmed |

### Screening Responses Quality

| Finding | Severity |
|---------|---------|
| Three format presets with word-count targets shown as guidance | Good |
| Prior response reuse surfaced per question with similarity score | Good |
| Response library write-back path not verified | Medium — session learnings may not persist for future sessions |

---

## Terminology Clarity Evaluation

| Term | Location | Issue |
|------|----------|-------|
| **"Customise"** (workflow step) | `web/index.html` `step-customizations` | British spelling "Customise" in step label vs. `step-customizations` DOM id; may confuse US applicants |
| **"Generate"** (workflow step label) | `web/workflow-steps.js:STEP_LABELS` `generate` | One label covers two generation moments: the initial "Generate CV" step and the "Generate Final" after layout confirmation; two distinct actions share a single step name |
| **"Spell Check"** (workflow step) | `web/workflow-steps.js:STEP_LABELS` `spell` | Label understates scope; LanguageTool also runs grammar checks. "Spell & Grammar" would be more accurate |
| **"⚙️ Recommend Customizations"** (action button) | `web/index.html`: `recommend-btn` | Developer-framed label; from the applicant's perspective this is "Review My CV Suggestions" or "Start Customising" |
| **"✏️ Review Rewrites"** (generate button label) | `web/index.html`: `generate-btn` | The button triggers `fetchAndReviewRewrites()`; the label is accurate but "✏️ Review Rewrites" is not visible to the user as a "generate" action — it could confuse users expecting CV generation here |
| **"✓ Done — Generate CV"** (spell button label) | `web/index.html`: `spell-btn` | Conflates spell-check completion with generation trigger; implies spelling acceptance produces the CV immediately, which bypasses the layout review step in the user's mental model |
| **"Outdated"** (layout freshness badge) | `web/workflow-steps.js:applyLayoutFreshnessNavigationState()` | "Outdated" is alarming; "Review needed" or "Refresh required" is clearer in context |
| **`post_analysis_answers`** (state key) | `scripts/utils/conversation_manager.py:70` | Internal key does not match the story-contract key `clarification_answers`; documentation and downstream code using the spec key name will silently receive nothing |
| **"Harvest"** (workflow section heading) | `web/finalise.js` harvest section | Developer-centric term; "Update Your Master CV Profile" or "Apply Learnings to Profile" better describes the applicant's goal |
| **"Queued"** (expected session status) | Not present in any source file | Sessions in pre-analysis state show as `init` phase in the session switcher — meaningless to a non-technical applicant |

---

## Additional Story Gaps / Proposed Story Items

| ID | Title | Rationale |
|----|-------|-----------|
| GAP-1 | **Pre-analysis intake confirmation step** | Intake (company/role/date) extracted post-analysis. A story should define a mandatory confirmation/edit step before the LLM analysis begins, so token cost is not wasted on an incorrectly labelled job |
| GAP-2 | **Session lifecycle status enum** | No story defines the full session lifecycle: `queued` (pre-analysis), `active` (in workflow), `ready` (finalised), `sent` (application submitted). Users cannot distinguish parked sessions from in-progress ones |
| GAP-3 | **Mismatch-driven clarifying question mapping** | Analysis mismatch callout is visually disconnected from the questions panel. A story should define: each flagged required skill without master-CV evidence must produce at least one clarifying question with a direct link |
| GAP-4 | **Post-rerun delta highlighting (persistent)** | After re-running a stage, customisation tables show no lasting distinction between changed and unchanged items. A story should define persistent "new/changed since last run" badge UX |
| GAP-5 | **Pre-write harvest diff preview** | A story should require a consolidated JSON diff review step before `POST /api/harvest/apply` writes to the master CV, so applicants can verify the exact changes |
| GAP-6 | **Cover letter DOCX/PDF output verification** | An explicit acceptance criterion and end-to-end test for `.docx` + `.pdf` cover letter archive artifacts |
| GAP-7 | **Screening response library write-back verification** | An explicit acceptance criterion for `~/CV/response_library.json` update after each screening save, including a semantic-search smoke test |
| GAP-8 | **Keyboard accessibility for re-run** | Story should define keyboard shortcut(s) for triggering re-run on the currently active completed step |

---

## Story Tally

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
|-------|---------|-----------|--------|------------|
| US-A1  | 3 | 1 | 1 | 0 |
| US-A2  | 5 | 4 | 0 | 1 |
| US-A3  | 8 | 2 | 0 | 0 |
| US-A3b | 5 | 0 | 0 | 2 |
| US-A4  | 9 | 0 | 0 | 0 |
| US-A4b | 4 | 2 | 0 | 0 |
| US-A5a/b/c | 10 | 2 | 1 | 0 |
| US-A6  | 4 | 0 | 0 | 0 |
| US-A7  | 5 | 3 | 0 | 0 |
| US-A8  | 4 | 5 | 0 | 0 |
| US-A9  | 5 | 0 | 0 | 1 |
| US-A10 | 1 | 3 | 0 | 0 |
| US-A11 | 4 | 1 | 1 | 0 |
| US-A12 | 3 | 3 | 1 | 1 |

---

## Top Gaps by Severity

| Rank | Severity | Gap | Story |
|------|----------|-----|-------|
| 1 | **Critical** | All formats (HTML + PDF + DOCX) generated together at "Generate" — no staged HTML-first generation path exists; layout review is on the already-final artifact | US-A5a |
| 2 | **High** | `post_analysis_answers` vs. `clarification_answers` key mismatch — cover letter and screening generators silently receive empty context | US-A2 |
| 3 | **High** | No pre-write consolidated diff before harvest applies to master CV — applicant cannot verify exact changes before they are committed | US-A11 |
| 4 | **High** | No "queued" session lifecycle status — pre-analysis sessions appear as raw phase-names in the session switcher | US-A1 |
| 5 | **Medium** | Re-run ↻ icon hidden until hover — not permanently visible on completed steps | US-A12 |
| 6 | **Medium** | Delta highlighting after re-run is transient (2.5 s only) — user must manually find what changed | US-A12 |
| 7 | **Medium** | Mismatch analysis is skills-only — IC/leadership fit, seniority, and domain mismatches not surfaced | US-A2 |

---

**Reviewed against (source-first):**
`web/index.html`, `web/app.js`, `web/state-manager.js`, `web/job-input.js`, `web/workflow-steps.js`,
`web/rewrite-review.js`, `web/review-table-base.js`, `web/skills-review.js`, `web/layout-instruction.js`,
`web/cover-letter.js`, `web/screening-questions.js`, `web/finalise.js`,
`scripts/utils/conversation_manager.py`, `scripts/web_app.py` (grep only)

**Evidence standard:** All ✅ / ❌ / ⚠️ / 🔲 entries cite at least one specific source file and either a line number or function name. No criterion is assessed from documentation alone.
