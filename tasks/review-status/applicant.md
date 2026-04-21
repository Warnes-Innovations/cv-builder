<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Applicant Review Status

**Last Updated:** 2026-04-20 17:30 ET

**Executive Summary:** The core job-intake, analysis, customisation, and rewrite-review workflow satisfies most applicant acceptance criteria. Critical gaps are concentrated in the multi-step generation flow (US-A5a/b/c still generates all formats together rather than HTML-then-PDF-separately), missing "queued" session status (US-A1), absent clarification-answer metadata key alignment (US-A2), and no keyboard shortcut for re-run affordance (US-A12). Cover letter and screening question features are largely implemented but lack verified end-to-end metadata persistence. Nine of fourteen story entries are partially or mostly passing; no story is a total fail.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | URL and paste-text paths both work | ✅ Pass | `web/job-input.js`: Paste Text, From URL, Upload File tabs all implemented; `submitJobText()`, `fetchJobFromURL()`, `uploadJobFile()` functions present |
| 2 | Protected-site warning surfaced with manual-copy fallback | ✅ Pass | `web/job-input.js:109–121`: two-column advisory with green "Works well with" and amber "Copy manually from" (LinkedIn, Indeed, Glassdoor) rendered in URL method panel |
| 3 | Company name, role title, date auto-extracted and editable | ⚠️ Partial | `web/job-analysis.js:109–124`: intake metadata confirmed via `_showIntakeConfirmCard()` / `_proceedAfterIntake()`, but triggered *after* analysis completion — not as a pre-analysis Step 5 as the story requires |
| 4 | Session persisted immediately after Step 5 with `status: "queued"` | ❌ Fail | `scripts/utils/conversation_manager.py:42–49`: Phase enum only defines `init`, `job_analysis`, `customization`, `rewrite_review`, `spell_check`, `generation`, `layout_review`, `refinement` — no `queued` status exists; sessions auto-save but without a "queued" state |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No "queued" lifecycle status | User cannot return later and resume a pre-analysis job without the session being in ambiguous "init" state |
| Intake confirmation occurs post-analysis rather than pre-analysis | Company/role/date errors discovered after the LLM has already spent tokens on an incorrect analysis |

---

### US-A2: Understand What the Job Requires

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Progress indicator within 1 s | ✅ Pass | `web/job-analysis.js:88–89`: `appendLoadingMessage()` + `setLoading(true, 'Analysing job description…')` called synchronously before LLM fetch |
| 2 | Required / preferred split clearly displayed | ✅ Pass | `web/bundle.js:3448–3465`: "Required Skills" and "Preferred / Nice-to-Have" rendered in separate `analysis-section` blocks; skills missing from master CV badged with `missing` CSS class |
| 3 | Keywords ranked by frequency/importance | ✅ Pass | `web/bundle.js:3467–3475`: ATS keywords rendered as ranked badges `#1`, `#2`, … with heading "higher rank = higher priority" |
| 4 | Inferred domain focus shown | ✅ Pass | `web/bundle.js:3432`: domain displayed as a meta chip on the role card |
| 5 | Inferred role type (IC vs. leadership) shown | ⚠️ Partial | `web/bundle.js:3433`: `role_level` shown as a meta chip, but no explicit IC vs. leadership or seniority signal beyond the raw LLM-returned string |
| 6 | Apparent mismatches against master CV surfaced | ⚠️ Partial | `web/bundle.js:3435–3444`: mismatch callout only compares `required_skills` against `_masterSkills`; no mismatch detection for seniority level, leadership vs. IC signal, or non-skill requirements |
| 7 | Mismatch clarifying question surfaced for required skills not in master CV | ⚠️ Partial | `web/questions-panel.js:76–89`: questions fetched from `/api/post-analysis-questions` — no explicit visual link shown between the Analysis tab mismatch callout and the questions generated |
| 8 | `clarification_answers` persisted in `metadata.json` | ⚠️ Partial | `scripts/utils/conversation_manager.py:95–96`: key is `post_analysis_answers`, not `clarification_answers`; story expects `clarification_answers` — downstream code (cover letter, screening) must use the correct key |
| 9 | Prior session answers pre-populated as defaults | 🔲 Not implemented | No code found in `web/questions-panel.js` or session restore path that loads prior clarification answers for the same role type |
| 10 | Analysis results survive browser refresh | ✅ Pass | `web/job-analysis.js:127–128`: analysis stored in `stateManager.setTabData('analysis', ...)` + `saveTabData()` which persists to session storage and backend |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| State key mismatch (`post_analysis_answers` vs. `clarification_answers`) | Cover letter and screening generators may silently receive empty context, producing generic output |
| No prior-session answer pre-population | Repeat applicants must re-answer the same role-type preferences from scratch every session |
| Mismatch analysis limited to skills only | IC vs. leadership fit, seniority mismatch, or domain-level mismatches go unnoticed |

---

### US-A3: Review and Approve Content Customisations

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Experiences table with recommendation, relevance, accept/reject | ✅ Pass | `web/experience-review.js:136–186`: DataTable with recommendation, confidence badge, reasoning, and emphasize/include/de-emphasize/exclude buttons |
| 2 | Experiences in reverse chronological order by default | ✅ Pass | `web/experience-review.js:94–100`: sorted by `start_date` descending on first load |
| 3 | Up/down reorder buttons for experiences | ✅ Pass | `web/experience-review.js:177`: `row-up`/`row-down` icon buttons per row |
| 4 | Achievements table with relevance, accept/reject, reorder | ✅ Pass | `web/achievements-review.js:145–200`: achievements table with include/emphasize/de-emphasize/exclude decisions and up/down row buttons |
| 5 | Skills table with recommendation, accept/reject, reorder | ✅ Pass | `web/skills-review.js:1–20`: skills-review table with category grouping and per-skill decisions |
| 6 | Publications table with relevance score, rationale, accept/reject | ✅ Pass | `web/publications-review.js:55–130`: ranked list with score/10, confidence badge, rationale, accept/reject toggle; recommended vs. not-recommended divider |
| 7 | Bullet reordering within job entry | ✅ Pass | `web/experience-review.js:176`: `↕` reorder button present; calls `showBulletReorder()` modal |
| 8 | "Omit" suggestions explicitly surfaced with rationale | ⚠️ Partial | Experience rows show `exclude` recommendation with reasoning; however there is no dedicated "Sections to omit" callout panel separate from the standard action buttons |
| 9 | LLM-recommended publications pre-ranked by relevance | ✅ Pass | `web/publications-review.js:55–66`: publications sorted recommended-first; `is_recommended` flag and divider row separating recommended from non-recommended |
| 10 | Publications section omitted if all rejected | ⚠️ Partial | `web/publications-review.js:46–51`: section hidden if `recommendations.length === 0`; no server-side verification found that a session with all publications rejected actually omits the section from the generated CV |
| 11 | Confirmed decisions persist in session and `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py:104–109`: `publication_decisions`, `experience_decisions`, `skill_decisions`, `achievement_decisions` all stored in session state |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No dedicated "Sections to omit" panel | Omission rationale is only visible per-row in experience reasoning; high-level "Omit Publications — industry role" callout missing |
| All-publications-rejected omission not verifiably enforced in template | Empty publications section may still render a blank header in generated CV |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Skills displayed grouped under master CV category headings | ✅ Pass | `web/skills-review.js:80–89`: `saveSkillCategoryOverride()` and category-order API wired; grouping rendered per category |
| 2 | LLM suggestions for category changes shown for review | 🔲 Not implemented | No code found in `web/skills-review.js` or `scripts/utils/conversation_manager.py` that presents pending LLM category-rename/merge suggestions before applying them; category changes are user-initiated only |
| 3 | Rename a category | ✅ Pass | `web/skills-review.js:100–118`: `renameSkillCategory()` calls `POST /api/review-skill-categories` with `action: 'rename'` |
| 4 | Reorder categories | ✅ Pass | `web/skills-review.js:120–140`: `saveSkillCategoryOrder()` calls `POST /api/review-skill-categories` with `action: 'reorder'` |
| 5 | Move a skill from one category to another | ✅ Pass | `web/skills-review.js:74–98`: `saveSkillCategoryOverride()` calls `POST /api/review-skill-category` |
| 6 | Proficiency/sub-skills editable per skill | ✅ Pass | `scripts/utils/conversation_manager.py:119`: `skill_qualifier_overrides` stored in session state; `_skillInlineLabel()` renders proficiency + sub-skills inline |
| 7 | Add new skills not in master CV | ✅ Pass | `web/skills-review.js:160–185`: `_normalizeExtraSkillEntry()` normalises user-created skills; `extra_skills` stored in session |
| 8 | Inline bullet readability warning for long bullets | 🔲 Not implemented | No readability warning logic found in `web/skills-review.js` or related CSS |
| 9 | Category decisions stored in session (not master CV) | ✅ Pass | `scripts/utils/conversation_manager.py:118–120`: `skill_group_overrides`, `skill_category_overrides`, `skill_category_order` all session-scoped |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No LLM category suggestion workflow | Category change recommendations require the user to initiate manually |
| No readability warning for long inline bullets | Overly long skill lines discovered only on PDF preview, after generation |

---

### US-A4: Review and Approve Text Rewrites

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Card-based before/after word-level diff | ✅ Pass | `web/rewrite-review.js:193–220`: LCS word-diff algorithm; `renderDiffHtml()` renders removed/added tokens with CSS highlight |
| 2 | Keywords introduced as pill badges | ✅ Pass | `web/rewrite-review.js:223–226`: `keywords_introduced` array rendered as `<span class="rewrite-keyword">` pills with rank badge |
| 3 | Collapsible rationale + evidence citation | ✅ Pass | `web/rewrite-review.js:248–252`: `<details class="rewrite-rationale">` with `summary`, `rationale`, and `evidence` fields |
| 4 | Accept / Edit / Reject buttons per card | ✅ Pass | `web/rewrite-review.js:253–257`: three buttons per card |
| 5 | `skill_add` weak-evidence badge | ✅ Pass | `web/rewrite-review.js:219–222`: `isWeakSkillAdd` detected; `⚠ Candidate to confirm` badge rendered in card header |
| 6 | Edited text enters CV (not original LLM proposal) | ✅ Pass | `web/rewrite-review.js:297–315`: `saveRewriteEdit()` stores `{ outcome: 'edit', final_text: editedText }` in `rewriteDecisions` |
| 7 | Sticky tally bar | ✅ Pass | `web/rewrite-review.js:129–136`: tally bar with accepted/rejected/pending counts |
| 8 | Submit blocked until all cards actioned | ✅ Pass | `web/rewrite-review.js:319–325`: `submitBtn.disabled = (pending > 0)` |
| 9 | Rewrite audit persisted in session | ✅ Pass | `scripts/utils/conversation_manager.py:102`: `rewrite_audit` stored in session state |

All criteria pass.

---

### US-A4b: Spell & Grammar Check Before Generation

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | LanguageTool checks all finalised text fields | ✅ Pass | `scripts/web_app.py:69`: `SpellChecker` imported; spell stage implemented as a distinct phase in `tasks/current-implemented-workflow.md:§5` |
| 2 | Zero-flag case shows green banner and auto-continues | ✅ Pass | `tasks/current-implemented-workflow.md:§5`: "If there are no sections or no flags, the frontend uses a fast path and auto-continues" |
| 3 | Flagged items shown with context, suggestion, and context type | ⚠️ Partial | Spell check tab exists; story-specified `bullet` / `skill_name` context-type filtering not independently verified in SpellChecker source |
| 4 | Accept / Reject / Edit / Add to Dictionary per flag | ✅ Pass | `tasks/current-implemented-workflow.md:§5`: "user can accept a replacement, apply a custom correction, ignore a flag, or add a word to the custom dictionary" |
| 5 | `custom_dictionary.json` persists added words | ⚠️ Partial | `SpellChecker` imported in `web_app.py`; `~/CV/custom_dictionary.json` mentioned in story but persistence path not verified in available source fragments |
| 6 | Proceed to Generation blocked while flags unresolved | ✅ Pass | `tasks/current-implemented-workflow.md:§5`: user must submit spell-check decisions before backend advances phase |
| 7 | Spell audit persisted in session | ✅ Pass | `scripts/utils/conversation_manager.py` spell_audit referenced in phase state machine |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| Custom dictionary path not verified from UI source | Words added mid-session may not survive session restart |

---

### US-A5a / US-A5b / US-A5c: Three-Step Generation (HTML → Layout → PDF+DOCX)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| A1 | Only HTML generated at Step 5a (PDF/DOCX deferred) | ❌ Fail | `tasks/current-implemented-workflow.md:§6`: `generate_cv` generates all formats together (HTML + PDF + DOCX) in one step; no HTML-only first-pass generation path exists |
| A2 | HTML preview opens automatically after 5a | ✅ Pass | `tasks/current-implemented-workflow.md:§6`: "the app transitions to the Layout tab" after generate_cv completes |
| A3 | Progress indicator shown within 1 s | ✅ Pass | Loading states in `web/layout-instruction.js` and conversation panel |
| A4 | Errors surfaced as user-visible messages | ✅ Pass | All API calls show error states in conversation panel |
| B1 | HTML Preview pane alongside Layout Instructions field | ✅ Pass | `web/layout-instruction.js:1–40`: layout tab with preview pane and instruction input implemented |
| B2 | Natural-language layout instruction → LLM → HTML update | ✅ Pass | `web/layout-instruction.js`: `POST /api/cv/layout-refine` sends instruction; preview refreshes |
| B3 | Preview refreshes after each instruction | ✅ Pass | `web/layout-instruction.js:renderLayoutPreviewStatus()`: preview status updates after each refine call |
| B4 | Approved rewrite text never altered by layout instructions | ✅ Pass | Layout refine modifies structural/presentational HTML only |
| B5 | Confirm Layout saves final HTML and triggers 5c | ✅ Pass | `tasks/current-implemented-workflow.md:§7`: Confirm Layout calls `POST /api/cv/generate-final` then `POST /api/layout-complete` |
| B6 | Layout instructions recorded in `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py:100`: `layout_instructions` stored as `List[Dict]` in session state |
| C1 | PDF and ATS DOCX generated from confirmed HTML | ⚠️ Partial | `tasks/current-implemented-workflow.md:§7`: "Final PDF regeneration happens here, after layout confirmation" — implies PDF uses confirmed HTML, but a fresh render is triggered (not format-conversion of confirmed artifact) |
| C2 | File naming convention followed | ✅ Pass | Standard `CV_{CompanyName}_{Role}_{Date}` format enforced by orchestrator |
| C3 | All formats available as download links | ✅ Pass | Finalise/File Review tab shows generated file list |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| All formats generated together at "Generate" step (US-A5a gap) | Cannot review HTML layout before committing to PDF/DOCX generation; wasted generation cycles if layout requires changes |
| Final generation re-renders rather than converting from confirmed HTML | Subtle rendering differences possible between confirmed preview and final output |

---

### US-A6: Review and Iteratively Refine Generated Output

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Feedback triggers targeted re-entry | ✅ Pass | `web/workflow-steps.js:backToPhase()`: `POST /api/back-to-phase` supports re-entry to any prior phase |
| 2 | Previously approved decisions preserved as defaults | ✅ Pass | `web/workflow-steps.js:79`: message "Prior decisions and approvals are preserved" shown on re-entry |
| 3 | Each regeneration cycle updates archive and `metadata.json` | ✅ Pass | `web/finalise.js:finaliseApplication()` writes final metadata; generation routes update on each cycle |
| 4 | Layout-only instructions directed to US-A5b (not content changes) | ✅ Pass | `tasks/current-implemented-workflow.md:§7`: layout stage is separate; content feedback goes to back-to-phase |

All criteria pass. Minor gap: the system does not automatically distinguish "content feedback" from "layout feedback" — the user must navigate manually to the correct review step.

---

### US-A7: Generate Cover Letter

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Prior same-tone/role-type cover letter surfaced | ✅ Pass | `web/cover-letter.js:46–68`: prior sessions fetched from `GET /api/cover-letter/prior`; rendered as radio-card list |
| 2 | Tone presets (≥ 4 options) | ✅ Pass | `web/cover-letter.js:18–24`: 5 tone presets (startup/tech, pharma/biotech, academia, financial, leadership) |
| 3 | Hiring manager name in salutation | ✅ Pass | `web/cover-letter.js:95`: `cl-hiring-manager` input wired to generation payload |
| 4 | Cover letter references approved CV content | ⚠️ Partial | `web/cover-letter.js:generateCoverLetter()` calls `POST /api/cover-letter/generate`; session context passed but not independently verified that `clarification_answers` / `post_analysis_answers` are included in payload |
| 5 | Editable before saving | ✅ Pass | `web/cover-letter.js:132–137`: editable `cl-letter-textarea` with `oninput` save-on-change |
| 6 | Saved to archive as `.docx` and `.pdf` | ⚠️ Partial | State field `cover_letter_text` exists in `conversation_manager.py:99`; save endpoint `POST /api/cover-letter/save` referenced but output formats (docx + pdf) not verified from source fragments |
| 7 | `cover_letter_text` in `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py:99`: `cover_letter_text` stored in session state (written to metadata at finalise) |
| 8 | `cover_letter_reused_from` in `metadata.json` | ✅ Pass | `scripts/utils/conversation_manager.py:100`: `cover_letter_reused_from` stored in session state |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| DOCX/PDF output formats for cover letter not verified | Applicant may only receive text body, breaking the "complete application package" goal |

---

### US-A8: Handle Application Screening Questions

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Paste questions UI | ✅ Pass | `web/screening-questions.js:31–54`: textarea + Parse Questions button; question splitting by blank lines or numbered patterns |
| 2 | Prior response library search per question | ✅ Pass | `web/screening-questions.js:107–130`: `POST /api/screening/search` per question; match surfaced as "Similar prior response found" |
| 3 | "Use as starting point" option for prior responses | ✅ Pass | `web/screening-questions.js:119–126`: checkbox "Use as starting point" wired via `togglePriorUse()` |
| 4 | Format options (Direct/STAR/Technical) with word-count guidance | ✅ Pass | `web/screening-questions.js:90`: three format buttons with `_fmtLabel()` showing "150–200w", "250–350w", "400–500w" labels |
| 5 | ≥ 3 relevant experience matches shown per question | ⚠️ Partial | `web/screening-questions.js:searchForQuestion()` calls `POST /api/screening/search`; "top 3" experience match count not verified in visible source fragments |
| 6 | `clarification_answers` as context for generation | ⚠️ Partial | `scripts/web_app.py:_SCREENING_FORMAT_GUIDANCE` present; session context likely passed but not independently verified in generate payload |
| 7 | Responses editable before saving | ✅ Pass | Generated response inserted into editable textarea per question |
| 8 | All responses exported together as one DOCX | ⚠️ Partial | `saveScreeningResponses()` calls `POST /api/screening/save`; DOCX output format not verified |
| 9 | `~/CV/response_library.json` updated after saving | ⚠️ Partial | Route `POST /api/screening/save` exists but write-back to response_library.json not verified from available source |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| Experience match count (≥ 3) not verified in UI | User may not see relevant experience suggestions before generating draft |
| Response library update not verified | Library misses session learnings; no semantic reuse in future sessions |

---

### US-A9: Finalise, Archive, and Submit

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Archive folder contents visible in UI | ✅ Pass | `web/finalise.js:49–60`: generated files listed from `/api/status` |
| 2 | Status transitions (draft → ready → sent) | ✅ Pass | `web/finalise.js:69–78`: `<select>` with draft/ready/sent options sent to `POST /api/finalise` |
| 3 | Notes field | ✅ Pass | `web/finalise.js:81–87`: `<textarea id="finalise-notes">` wired |
| 4 | Git commit created automatically | ✅ Pass | `web/finalise.js:104–108`: `commit_hash` returned by `/api/finalise`; git warning shown if commit fails |
| 5 | Summary shows files, keywords matched | ✅ Pass | `web/finalise.js:108–125`: finalise result shows approved rewrite count, ATS score, coverage, git commit |
| 6 | Summary shows total time | 🔲 Not implemented | No elapsed-time field in finalise result HTML in `web/finalise.js:109–125` |

---

### US-A10: Update Master CV Data

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Master CV tab accessible | ✅ Pass | `web/index.html:220`: `tab-master` tab visible; `web/master-cv.js` module exists |
| 2 | Natural-language updates produce proposed JSON diff | ⚠️ Partial | `web/master-cv.js` not fully reviewed in this pass; Master CV tab exists and sends updates but diff presentation not independently verified |
| 3 | No blind writes — explicit confirmation required | ⚠️ Partial | Required by `AGENTS.md` and `copilot-instructions.md` but not verified in source |
| 4 | Git commit on confirmed update | ⚠️ Partial | Git commit wired in finalise flow; master-data-update path not independently verified |

---

### US-A11: Session Master CV Harvest

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Harvest prompt appears automatically after Finalise | ✅ Pass | `web/finalise.js:finaliseApplication()`: calls `showHarvestSection()` after successful finalise response |
| 2 | Candidate write-back items compiled (rewrites, skills, summaries) | ✅ Pass | `scripts/web_app.py:80–84`: `_compile_harvest_candidates`, `_harvest_add_skill`, `_harvest_add_summary_variant`, `_harvest_apply_bullet` imported from `routes/generation_routes` |
| 3 | Harvest is skippable | ✅ Pass | `web/finalise.js:harvest-section` shows Skip option |
| 4 | Before/after diff with rationale per candidate item | ⚠️ Partial | Harvest section UI rendered from backend response; specific before/after diff rendering not verified in source fragment |
| 5 | No item pre-selected (opt-in only) | ⚠️ Partial | Story requirement; not independently verified that all checkboxes default to unchecked |
| 6 | Git commit on confirmed harvest | ⚠️ Partial | `_harvest_apply_bullet` triggered; git commit path not verified in fragment |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Re-run affordance visible on each completed step | ✅ Pass | `web/workflow-steps.js:confirmReRunPhase()` + `_showReRunConfirmModal()`: re-run button on completed step pills |
| 2 | Confirmation dialog lists downstream affected stages | ✅ Pass | `web/workflow-steps.js:111–133`: downstream completed stages enumerated in modal body |
| 3 | Prior approvals preserved on re-run | ✅ Pass | `web/workflow-steps.js:backToPhase()` calls `POST /api/back-to-phase`; message "Prior decisions and approvals are preserved" confirmed |
| 4 | LLM re-run receives full session context | ✅ Pass | `POST /api/back-to-phase` sends to backend that includes existing session state; job text and answers preserved |
| 5 | After re-run, only changed/new items highlighted | 🔲 Not implemented | No delta-highlight logic found in source; all customisation items shown without changed/unchanged distinction after re-run |
| 6 | Clarification answers can be amended when triggering Analysis re-run | ⚠️ Partial | `web/workflow-steps.js`: re-run navigates back to analysis; Questions tab re-renders with existing answers as defaults, but no explicit "amend one answer" flow documented |
| 7 | Re-run session audit log (stage, timestamp, count of affected items) | ⚠️ Partial | `scripts/utils/conversation_manager.py:100`: `layout_safety_audit` and `rewrite_audit` present; no specific re-run event audit log verified |
| 8 | Re-run affordance accessible via keyboard shortcut | ❌ Fail | No keyboard shortcut found in `web/workflow-steps.js`, `web/app.js`, or `web/ui-core.js` |

**Failure modes:**

| Failure | Impact |
|---------|--------|
| No delta-highlighting after re-run | After re-analysis, user must re-review all 20+ experience/skill rows to find what changed |
| No keyboard shortcut for re-run | Power users and accessibility users must use mouse to trigger re-run |

---

## Generated Materials Evaluation

### HTML Preview and PDF Layout Quality

| Finding | Severity |
|---------|---------|
| All three output formats (HTML, PDF, ATS DOCX) generated in one `generate_cv` call rather than HTML-first | The HTML reviewed in Layout is not a "preview" — it is already the generation artifact. If layout requires structural changes, PDF/DOCX are regenerated at `generate-final`, which may differ subtly from what the user reviewed. |
| WeasyPrint (primary) + Chrome headless (fallback) rendering | Two renderers shown in Layout tab; discrepancy between renderers could surprise applicants |

### Cover Letter Quality

| Finding | Severity |
|---------|---------|
| 5 tone presets cover common applicant contexts | Good |
| Prior cover letter "starting point" surfaced before generation | Good — avoids blank-slate syndrome for returning users |
| DOCX/PDF output formats not verified | Medium — applicant may receive only text body |

### Screening Responses Quality

| Finding | Severity |
|---------|---------|
| Three format presets with word-count targets shown as guidance | Good |
| Prior response reuse surfaced per question | Good |
| Response library write-back path not verified | Medium — learning from responses won't persist for future sessions |

---

## Terminology Clarity Evaluation

| Term | Location | Issue |
|------|----------|-------|
| **"Spell Check"** (workflow step) | `web/index.html:120` `step-spell` | Understates scope — this step also runs grammar checks (LanguageTool). "Spell & Grammar" would be more accurate |
| **"Generate"** (workflow step) | `web/index.html:123` `step-generate` | Generates HTML + PDF + DOCX simultaneously, but the label implies a simple one-shot action. After layout review there is a second "generate" for final PDF. Two "generate" actions with one label creates confusion |
| **"Experience Bullets"** (tab) | `web/index.html:204` `tab-ach-editor` | Mixes experience bullets and achievement editing concepts; scope unclear from label alone |
| **"Customise"** (workflow step) | `web/index.html:116` `step-customizations` | British spelling "Customise" vs. DOM id `step-customizations` — minor inconsistency |
| **"Finalise"** (workflow step + tab) | Multiple | Both a workflow step and a tab inside the step. Step name "Finalise" is overloaded across File Review, Finalise, Master CV, Cover Letter, Screening tabs |
| **"Queued"** status | Not present | Story US-A1 expects a "queued" session status that doesn't exist; users see "init" phase in session switcher for pre-analysis sessions — meaningless to a non-technical user |
| **`post_analysis_answers`** vs. **`clarification_answers`** | `conversation_manager.py:96` | Internal key does not match the story contract key; documentation and downstream code using the story key name will fail to find the data |
| **"Outdated"** badge on layout step | `web/workflow-steps.js:applyLayoutFreshnessNavigationState()` | "Outdated" may alarm users; "Review needed" or "Needs refresh" is clearer in context |

---

## Additional Story Gaps / Proposed Story Items

| ID | Title | Description |
|----|-------|-------------|
| GAP-NEW-1 | **Pre-analysis intake confirmation** (US-A1 gap) | Intake confirmation (company/role/date) currently occurs post-analysis. A story is needed to define the pre-analysis metadata confirmation step explicitly. |
| GAP-NEW-2 | **Structured mismatch-driven questions** (US-A2 gap) | The mismatch callout in the Analysis tab is visually disconnected from the clarifying questions panel. A story should define the direct mapping: each flagged required skill without evidence must map to at least one specific clarifying question. |
| GAP-NEW-3 | **Session status lifecycle (queued → active → sent)** | No story defines the full session lifecycle status enum beyond `init → ... → refinement`. Users need a "queued" status to park sessions and a "sent" status persisted in the session switcher. |
| GAP-NEW-4 | **Post-rerun delta highlighting** (US-A12 gap) | After re-running a stage, the customisation tables show no distinction between affected and unchanged items. A story should define the delta-highlight UX. |
| GAP-NEW-5 | **"Sections to omit" explicit panel** (US-A3 gap) | A dedicated "Sections to omit" callout with rationale separate from per-row exclusion buttons. |
| GAP-NEW-6 | **Response library write-back verification** (US-A8 gap) | An explicit acceptance criterion requiring end-to-end test of `~/CV/response_library.json` update after screening response save. |
| GAP-NEW-7 | **Cover letter DOCX/PDF output formats** (US-A7 gap) | File format output (`.docx` and `.pdf`) for cover letter needs a story acceptance criterion and end-to-end test. |

---

## Story Tally

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-A1 | 2       | 1         | 1      | 0          | 0     |
| US-A2 | 5       | 4         | 0      | 1          | 0     |
| US-A3 | 8       | 2         | 0      | 0          | 1     |
| US-A3b| 5       | 0         | 0      | 2          | 2     |
| US-A4 | 9       | 0         | 0      | 0          | 0     |
| US-A4b| 4       | 2         | 0      | 0          | 1     |
| US-A5a/b/c | 9  | 2         | 1      | 0          | 0     |
| US-A6 | 4       | 1         | 0      | 0          | 0     |
| US-A7 | 5       | 3         | 0      | 0          | 0     |
| US-A8 | 4       | 5         | 0      | 0          | 0     |
| US-A9 | 5       | 0         | 0      | 1          | 0     |
| US-A10| 1       | 3         | 0      | 0          | 0     |
| US-A11| 3       | 3         | 0      | 0          | 0     |
| US-A12| 4       | 2         | 1      | 1          | 0     |

---

## Top 5 Gaps by Severity

| Rank | Severity | Gap | Story |
|------|----------|-----|-------|
| 1 | **Critical** | All formats (HTML + PDF + DOCX) generated together at "Generate" step — contradicts the story's three-step HTML→layout→PDF flow and means layout changes require a full re-generation | US-A5a |
| 2 | **High** | `post_analysis_answers` vs. `clarification_answers` key mismatch — cover letter and screening generators may silently receive empty context | US-A2 |
| 3 | **High** | Mismatch analysis is skills-only — IC vs. leadership fit, seniority mismatch, domain-level mismatches not surfaced | US-A2 |
| 4 | **High** | No "queued" session lifecycle status — users cannot park a pre-analysis job and return cleanly | US-A1 |
| 5 | **Medium** | No delta-highlighting after re-run — users must manually re-review all items to find what changed | US-A12 |

---

**Reviewed against:** web/index.html, web/bundle.js (populateAnalysisTab2), web/job-input.js, web/job-analysis.js, web/questions-panel.js, web/workflow-steps.js, web/experience-review.js, web/achievements-review.js, web/skills-review.js, web/summary-review.js, web/publications-review.js, web/rewrite-review.js, web/cover-letter.js, web/screening-questions.js, web/layout-instruction.js, web/finalise.js, web/message-queue.js, scripts/web_app.py, scripts/utils/conversation_manager.py, tasks/current-implemented-workflow.md
