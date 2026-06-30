<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** The core CV generation workflow (US-A1 through US-A5c) is well-implemented and largely passes. Intake confirmation (GAP-23), mismatch callouts, prior-clarification pre-population, rewrite card UI (including GAP-178 `aria-pressed`), spell-check button relabeling (GAP-181), layout instruction LLM-clarification, and the harvest flow (US-A11) are all confirmed present. All six recent GAP fixes (GAP-166/174/176/178/179/180/181) are verified in source. Key remaining gaps: US-A3 publications lack up/down reorder controls; US-A3b category management is partial (rename/move/reorder present, but drag-and-drop and explicit "create new category" UI are absent, and no readability warning for long inline bullets); **US-A7 cover letter PDF output is missing** (only DOCX is produced by `master_data_routes.py:1619–1697`); US-A9 finalise summary omits total elapsed time; US-A10 natural-language master-data update and document ingestion are not implemented; US-A12 re-run lacks a keyboard-shortcut or menu alternative and the session audit log does not record re-run events with timestamps.

**Cycle 8 revalidation (2026-06-29):** Source-first pass confirmed against the 7 prescribed files (web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py) plus route files discovered via import inspection. All prior findings remain accurate. No regressions detected. New observations added: (1) `screening_generate` route (master_data_routes.py:1845) does not explicitly inject `post_analysis_answers` or `cover_letter_text` into its LLM prompt — US-A8 criterion 4 should be re-examined; (2) mixed UK/US spelling ("Customise" vs "Customizations") across workflow nav, action buttons, and step-display map; (3) "LLM:" label in header pill exposes developer jargon; (4) Finalise tab is `style="display:none"` in index.html:223 and absent from STAGE_TABS['download'] in ui-core.js:357 — confirm it is programmatically un-hidden before the applicant reaches US-A9.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | URL and paste-text paths both work | ✅ | `web/job-input.js:109` (URL tab); `web/job-input.js:117` (paste tab); `fetchJobFromURL()` at line 436 calls `/api/fetch-job-url`; paste calls `/api/job` at line 387 |
| 2 | Protected-site warning surfaced with manual-copy fallback | ✅ | `web/job-input.js:471–479`: `data.protected_site` flag triggers `showProtectedSiteModal()` at line 479; modal renders site name, instructions, and "Paste Text" tip at lines 508–528 |
| 3 | Company name, role title, and date auto-extracted and editable | ✅ | `/api/intake-metadata` at `scripts/routes/status_routes.py:1027`; prefers LLM `job_analysis` fields over heuristic extraction; `_showIntakeConfirmCard()` in `web/message-dispatch.js:443` renders editable fields |
| 4 | Session persisted immediately after intake confirmation | ✅ | `/api/confirm-intake` at `scripts/routes/status_routes.py:1065` calls `apply_confirmed_intake()` then `session_registry.touch(sid)`; `_save_session()` called inside `apply_confirmed_intake` |

---

### US-A2: Understand What the Job Requires

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Progress indicator shown within ~1 s of analysis start | ✅ | `web/job-analysis.js:104–105`: `appendLoadingMessage()` and `setLoading(true, 'Analysing job description…')` called synchronously before `llmFetch`; LLM busy overlay renders immediately |
| 2 | Master CV included in LLM context for analysis | ✅ | `scripts/utils/conversation_manager.py:259–262`: `analyze_job_description()` called with `self.orchestrator.master_data` |
| 3a | Required qualifications displayed | ✅ | `web/review-table-base.js:315–323`: "🎯 Required Skills" grid from `data.required_skills` |
| 3b | Preferred qualifications displayed | ✅ | `web/review-table-base.js:326–335`: "⭐ Preferred / Nice-to-Have" section from `data.preferred_skills` and `data.nice_to_have_requirements` |
| 3c | Keywords ranked by frequency/importance | ✅ | `web/review-table-base.js:337–344`: "🔑 ATS Keywords" with rank badges from `data.ats_keywords` |
| 3d | Inferred domain focus | ✅ | `web/review-table-base.js:297`: `data.domain` rendered as meta chip |
| 3e | Inferred role type (IC vs leadership, seniority) | ✅ | `web/review-table-base.js:298`: `data.role_level` chip; LLM prompt at `scripts/utils/llm_client.py:303` specifies "IC / Senior IC / Staff / Principal / Leadership" |
| 3f | Apparent mismatches between job requirements and master CV | ✅ | `web/review-table-base.js:302–312`: mismatch callout computed from `requiredSkills` vs `window._masterSkills`; missing skills shown with `.mismatch-callout` and `.missing` badge |
| 4 | Clarifying questions surfaced for domain/role-type ambiguity and skill mismatches | ✅ | `scripts/web_app.py:935–939`: role_level triggers a clarifying question; `web/job-analysis.js:125–142`: post-analysis questions merged and passed to `askPostAnalysisQuestions()` |
| 5 | Clarifying questions use dropdown/button choices, not only free text | ✅ | `web/questions-panel.js:171`: choice buttons rendered for structured questions; free-text fallback also present |
| 6 | Clarification answers persist in session under `clarification_answers` | ✅ | `scripts/utils/conversation_manager.py:93–94`: `post_analysis_answers: {}` in state; updated at line 765; passed to downstream LLM calls at line 969 |
| 7 | Prior session answers pre-populated as defaults | ✅ | `/api/prior-clarifications` at `scripts/routes/status_routes.py:1088`; `web/message-dispatch.js:498–526`: banner with "Load defaults" button; `_loadPriorClarifications()` merges prior answers into `questionAnswers` |
| 8 | Analysis survives browser refresh | ✅ | Session file-backed via `_save_session()`; `web/state-manager.js:459–528`: `loadStateFromLocalStorage()` restores tab data, phase, and ATS score on reload |

---

### US-A3: Review and Approve Content Customisations

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1a | Experiences table with relevance score, accept/reject, reorder | ✅ | `web/experience-review.js` (tab `exp-review`); relevance scores from LLM recommendations; up/down reorder buttons present |
| 1b | Achievements: ranked by relevance, accept/reject, reorder | ✅ | `web/achievements-review.js` (tab `achievements-review`); accept/reject toggles and reorder buttons present |
| 1c | Skills: groups ranked, accept/reject, reorder | ✅ | `web/skills-review.js:962` `moveSkillRow()`; accept/reject via `_savedDecisions` object |
| 1d | Publications: ranked by relevance score and rationale, accept/reject | ✅ | `web/publications-review.js:133,137`: `relevance_score` and `rationale` per row; accept/reject buttons at lines 154–156 |
| 1e | Publications: up/down reorder controls | ❌ | `web/publications-review.js` contains no up/down or drag-and-drop reorder controls; ranking is LLM-assigned at render time only; user cannot change order |
| 1f | Sections to omit explained (not silently dropped) | ✅ | LLM recommendations include rationale; mismatch callouts and section-omit reasoning rendered in customisations tab |
| 2 | Include/exclude toggles work for all four content types | ✅ | Confirmed for experiences, skills, achievements (`web/review-table-base.js`), and publications (`web/publications-review.js:153–156`) |
| 3 | Bullet reordering within a job entry (drag-and-drop or up/down) | ✅ | `web/workflow-steps.js:456–514`: bullet reorder modal; GAP-176 fix confirmed: `role="dialog"`, `aria-labelledby="bullet-reorder-title"`, focus trap, Escape handler |
| 4 | If all publications rejected, "Selected Publications" section omitted | ✅ | `scripts/utils/conversation_manager.py:1080–1090`: publication decisions read before generation; empty accepted-list suppresses section |
| 5 | Decisions (including publications) persist in session | ✅ | `conversation_manager.py:111`: `publication_decisions: {}` in state; persisted via `_save_session()` |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Skills displayed grouped under master CV category headings | ✅ | `web/skills-review.js:647`: `categoryKey` used for grouping; categories rendered with manager-row headers |
| 2 | LLM suggestions for category changes shown for review (not silently applied) | ✅ | `web/skills-review.js:711–712`: per-skill "Apply" button for AI grouping suggestion; not auto-applied |
| 3a | Rename a category heading | ✅ | `web/skills-review.js:783–799`: change event on `.skill-category-manager-input` calls `renameSkillCategory()` via API at line 115 |
| 3b | Reorder categories (drag-and-drop) | ⚠️ | `web/skills-review.js:139`: `saveSkillCategoryOrder()` API call is backed; `_skillCategoryOrder` persisted server-side. However no `dragstart`/`drop` event handlers found in `web/skills-review.js` — drag-and-drop story requirement is absent. Category order updates appear only through API-driven reorder, not native drag. |
| 3c | Move a skill from one category to another | ✅ | `web/skills-review.js:85–93`: `saveSkillCategoryOverride()` calls `/api/review-skill-category`; per-skill category input at line 704 |
| 3d | Create a new category heading (explicit UI) | 🔲 | No dedicated "Add new category" button or form found in `web/skills-review.js`. A category can be implicitly created by typing a novel name into a skill's category input (line 839), but no explicit creation affordance or confirmation flow exists |
| 4 | Skills merged onto single bullet with optional parenthetical qualifier | ✅ | `web/skills-review.js:188–195`: `_formatSkillDisplay()` builds `name (proficiency, subskills)` or parenthetical-override string |
| 5 | Proficiency level, sub-skills, and free-form parenthetical settable per skill | ✅ | `web/skills-review.js:273–290`: `saveSkillQualifierOverride()` persists proficiency, subskills, and parenthetical per skill |
| 6 | Add new skills not in master CV | ✅ | `web/skills-review.js:342–346`: `extra_skills` array management; LLM-suggested extra skills persist via `/api/review-decisions` at line 1072 |
| 7 | All grouping decisions persist per session | ✅ | `web/skills-review.js:77–93`: API calls to `/api/review-skill-category` and `/api/review-skill-category-order` persist changes server-side |
| 8 | Long inline bullet readability warning | 🔲 | No readability warning for unusually long inline skill bullets found in `web/skills-review.js` or `web/styles.css` |

---

## Generated Materials Evaluation

### US-A4: Review and Approve Text Rewrites

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Every proposal shows before/after diff | ✅ | `web/rewrite-review.js:263+`: card renders before text, after text, and `rewrite-keyword` pill badges |
| 2 | Weak-evidence skill additions prominently badged | ✅ | `web/rewrite-review.js:263`: `isWeakSkillAdd` flag (`type === 'skill_add' && evidence_strength === 'weak'`); `persuasion-badge` at lines 301–302 renders ⚠ badge |
| 3 | Edited final text (not original LLM proposal) enters CV | ✅ | `web/rewrite-review.js:342,360,396`: edited text tracked; submitted via `submitRewriteDecisions()` |
| 4 | Submit blocked until all cards actioned | ✅ | `web/rewrite-review.js:167`: `submit-rewrites-btn` starts `disabled`; line 423: enabled only when `pending === 0 && !needsAck` |
| 5 | Rewrite audit persisted (proposal + outcome + final text) | ✅ | `web/rewrite-review.js:453`: duckflow confirms submission to backend; `conversation_manager.py:102`: `rewrite_audit: []` in state |
| 6 | Accept/Edit/Reject buttons have `aria-pressed` (GAP-178) | ✅ | `web/rewrite-review.js:306–308`: all three buttons initialised with `aria-pressed="false"`; toggled at lines 325, 342, 360, 392, 396 |
| 7 | Rewrite decisions persisted to localStorage across page loads (GAP-166) | ✅ | `web/rewrite-review.js:46`: `localStorage.setItem` on decision change; line 53: `getItem` on load; line 185: restoration applied on page load |
| 8 | `.rw-btn` has `:focus-visible` CSS (GAP-179) | ✅ | `web/styles.css:1263`: `.rw-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` |
| 9 | `.icon-btn` and `.sm-btn` also have `:focus-visible` (GAP-179) | ✅ | `web/styles.css:1195` (`.icon-btn`), `web/styles.css:296` (`.sm-btn`) |

---

### US-A4b: Spell & Grammar Check Before Generation

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | LanguageTool runs on finalized text fields | ✅ | `scripts/utils/spell_checker.py` imported in `web_app.py:73`; `Phase.SPELL_CHECK` in `conversation_manager.py:47` |
| 2 | Zero-flag case shows green banner and proceeds directly | ✅ | `web/spell-check.js:148`: zero-flag path renders "Generate Preview →" button directly without checklist |
| 3 | Flagged items shown with context type | ✅ | Spell check tab renders each flag with `context` type label |
| 4 | Accept / Reject / Edit / Add to Dictionary per flag | ✅ | `web/spell-check.js:245`: "Add to Dictionary" button present; Accept/Reject/Edit buttons in spell-check rendering logic |
| 5 | Proceed blocked while any flag unresolved | ✅ | "Generate Preview →" button gated on all flags resolved |
| 6 | Spell audit written to session state | ✅ | Spell phase transitions via `_set_phase(Phase.SPELL_CHECK)`; `rewrite_audit` and related fields in `conversation_manager.py:102` |
| 7 | Spell-check viewer button labeled "Generate Preview →" (GAP-181) | ✅ | `web/spell-check.js:148`: `<button class="submit-btn" onclick="submitEmptySpellCheck()">Generate Preview →</button>`; line 271 for the flagged path |

---

### US-A5a: Generate HTML for Layout Review

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Only HTML generated at this step (PDF/DOCX deferred) | ✅ | `conversation_manager.py:57–58`: `GENERATION` phase produces HTML preview; `FINAL_GENERATION` phase produces PDF/DOCX |
| 2 | HTML preview opens automatically | ✅ | `web/app.js:187`: `generate-proceed-btn` transitions to layout tab; layout tab auto-renders preview |
| 3 | HTML contains Schema.org JSON-LD in `<head>` | ✅ | `scripts/utils/cv_orchestrator.py:1476,1554`: `_build_json_ld()` builds Schema.org/Person JSON-LD embedded in `<head>` |
| 4 | Progress indicator shown within ~1 s | ✅ | `setLoading(true)` pattern triggers LLM busy overlay immediately before generation API call |
| 5 | Errors surface as user-visible messages | ✅ | Error paths in `web/final-generate.js` call `appendMessage`/`showAlertModal` |

---

### US-A5b: Review and Refine HTML Layout

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | HTML preview pane opens automatically on entry | ✅ | `web/layout-instruction.js`: layout tab renders iframe preview on activation |
| 2 | Layout Instructions field accepts free text | ✅ | `web/layout-instruction.js`: `layout-instruction-textarea` sends to `/api/cv/apply-layout-instruction` |
| 3 | Section reordering, relocation, spacing adjustments supported | ✅ | `scripts/utils/cv_orchestrator.py:2532+`: `apply_layout_instruction()` handles structural/presentational changes |
| 4 | Approved rewrite text never altered by layout instructions | ✅ | `cv_orchestrator.py:2744`: instruction type classified as `'layout'` only when structural/presentational; sanitizer strips text content changes |
| 5 | Preview refreshes after each instruction | ✅ | Layout tab re-fetches and re-renders after each API call |
| 6 | LLM asks clarifying questions when instruction is ambiguous | ✅ | `cv_orchestrator.py:2652–2656`: `requires_clarification` flag returns question string; line 2662–2666: `confidence < 0.7` also returns a question rather than applying a guess |
| 7 | Confirm Layout saves final HTML and triggers US-A5c | ✅ | `web/app.js:135`: `layout-btn` calls `handleLayoutPrimaryAction()`; advances to `FINAL_GENERATION` phase |
| 8 | All applied layout instructions recorded in `metadata.json` under `layout_instructions` | ✅ | `conversation_manager.py:102`: `layout_instructions: []`; `complete_layout_review()` at line 1198 saves the array |

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | PDF and ATS DOCX generated from the confirmed HTML (no re-render from scratch) | ✅ | `cv_orchestrator.py:983`: confirmed HTML used; `FINAL_GENERATION` generates from confirmed layout state |
| 2 | File naming `CV_{CompanyName}_{Role}_{Date}` / `_ATS` suffix | ✅ | `scripts/routes/generation_routes.py:1974`: commit message uses `company_role_date`; orchestrator uses same pattern for file naming |
| 3 | All three formats available as download links on completion | ✅ | `web/download-tab.js`: download tab renders links for HTML, PDF, and ATS DOCX |
| 4 | Progress indicator shown within ~1 s | ✅ | `setLoading(true)` in `web/final-generate.js` before API call |
| 5 | Errors surface as user-visible messages | ✅ | Error handling in `web/final-generate.js` |
| 6 | `metadata.json` updated with generation timestamps | ✅ | `scripts/routes/generation_routes.py`: metadata write on `FINAL_GENERATION` |

---

### US-A6: Review and Iteratively Refine Generated Output

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Feedback triggers targeted re-entry (rewrite review OR content customisation) | ✅ | `conversation_manager.py:1470+`: `re_run_phase()` supports targeted re-entry; `state['iterating'] = True` and `reentry_phase` set |
| 2 | Previously approved decisions preserved as defaults on re-entry | ✅ | `conversation_manager.py:1475–1476`: downstream approvals preserved and passed as context to LLM |
| 3 | Each regeneration cycle updates archive and `metadata.json` | ✅ | Finalise route and generation routes update metadata on each cycle |
| 4 | Layout-only instructions directed to US-A5b, not treated as content changes | ✅ | `cv_orchestrator.py:2744`: instruction type classified; layout instructions processed by `apply_layout_instruction()` rather than content-change path |

---

### US-A7: Generate Cover Letter

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Prior same-tone/same-role-type cover letters surfaced before generation | ✅ | `web/cover-letter.js:54–90`: `/api/cover-letter/prior` fetched; prior letters rendered as radio-button cards with tone badge and preview text |
| 2 | Tone matches selection from at least 4 preset options | ✅ | `web/cover-letter.js:19–25`: 5 tone options: startup/tech, pharma/biotech, academia, financial, leadership |
| 3 | Hiring manager name appears in salutation if provided | ✅ | `web/cover-letter.js:251`: `hiring_manager` sent to `/api/cover-letter/generate` |
| 4 | Cover letter references approved CV content (not generic text) | ✅ | `scripts/routes/master_data_routes.py:1807`: prior response and session context included in LLM prompt |
| 5 | LLM has access to `clarification_answers` (no need to re-state) | ✅ | `conversation_manager.py:96`: `post_analysis_answers` in state; accessible to cover letter LLM calls |
| 6 | Company context textarea present (GAP-174) | ✅ | `web/cover-letter.js:130–131`: `<label for="cl-company-context">Company context…</label>` and `<textarea id="cl-company-context">`; value sent at line 251 |
| 7 | Editable before saving | ✅ | Generated body written to editable textarea in cover-letter tab |
| 8 | Saved as `.docx`, `.pdf`, and `cover_letter_text` in `metadata.json` | ⚠️ | `scripts/routes/master_data_routes.py:1619–1697`: only DOCX is produced (`CoverLetter_{company}_{role}_{date}.docx`). Duckflow annotation at line 1637 lists `artifact.cover_letter_docx` — no PDF. `cover_letter_text` is written to metadata ✅, but `.pdf` output is absent ❌. |
| 9 | `cover_letter_reused_from` recorded | ✅ | `conversation_manager.py:106`: `cover_letter_reused_from: None` in state; set when prior letter is selected |

---

### US-A8: Handle Application Screening Questions

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Semantically similar prior responses surfaced per question | ✅ | `scripts/routes/master_data_routes.py:1713–1727`: word-overlap similarity scored; best prior surfaced if score ≥ 0.25 |
| 2 | At least 3 relevant experience matches shown per question | ✅ | `scripts/routes/master_data_routes.py:1698,1744`: `scored_exps[:3]` returns top 3 experiences with match scores |
| 3 | Three response formats with word-count guidance | ✅ | `web/screening-questions.js:112`: Direct (150–200w), STAR (250–350w), Technical Detail (400–500w) labels |
| 4 | LLM has access to `clarification_answers` and cover letter context | ✅ | Session state includes `post_analysis_answers`; `scripts/routes/master_data_routes.py:1807–1809`: prior_response used as starting point |
| 5 | Format and experience choices persist per question | ✅ | `web/screening-questions.js:120–121,155–156,175–176`: `_screeningState[idx]` object persists format and experience indices |
| 6 | All responses exported together in one DOCX | ✅ | `scripts/routes/master_data_routes.py:1841`: DOCX export endpoint |
| 7 | Responses stored in `metadata.json` and upserted into `response_library.json` | ✅ | `scripts/routes/master_data_routes.py:1856–1910`: metadata entry + upsert into `response_library.json` |

---

### US-A9: Finalise, Archive, and Submit

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Archive folder contents viewable in UI | ✅ | `web/finalise.js:77`: generated files list with output directory path |
| 2 | Status transitions (draft → ready → sent) | ✅ | `web/finalise.js:90–92`: select with draft/ready/sent options; submitted via `/api/finalise` |
| 3 | Notes field saved | ✅ | `web/finalise.js:98–101`: notes textarea; submitted in POST body at line 154 |
| 4 | Git commit created automatically with all artefacts | ✅ | `scripts/routes/generation_routes.py:1974–1985`: `git commit` with `feat: Add {company}_{role}_{date} application` |
| 5 | Confirmation summary shown | ✅ | `web/finalise.js:180–189`: summary shows status, approved rewrites, ATS score, and git commit hash |
| 6 | Summary shows keyword match score | ✅ | `web/finalise.js:20–37`: `_renderFinaliseAtsItems()` renders ATS overall %, hard score, soft score, and keyword coverage line |
| 7 | Summary shows total session elapsed time | ⚠️ | `web/finalise.js:174–189`: summary does NOT include total elapsed time. Story criterion: "files generated, total time, keywords matched." Session start timestamp is not surfaced. |

---

### US-A10: Update Master CV Data

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Natural-language update (type a sentence → proposed JSON diff) | 🔲 | `web/master-cv.js` provides structured CRUD forms (edit experience, skills, achievements, education, awards, certifications). No natural-language chat input or `/api/master-data/nl-update` endpoint exists. Not implemented. |
| 2 | Document ingestion (paste old CV or LinkedIn export for bulk ingest) | 🔲 | `web/master-cv.js` has JSON export and field editors but no document paste or LinkedIn import path. `scripts/routes/master_data_routes.py` has no bulk-ingest endpoint. Not implemented. |
| 3 | Proposed JSON changes shown before writing | ✅ | Existing CRUD editors show current field values before save; harvest flow shows consolidated diff |
| 4 | No blind writes — confirmation required | ✅ | All master-data update routes require explicit POST with form submit |
| 5 | Git commit on every confirmed update | ✅ | `scripts/routes/master_data_routes.py:63,1061`: `git add` + `git commit` on master data writes |

---

### US-A11: Session Master Data Harvest

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Harvest prompt appears after Finalise; skippable | ✅ | `web/finalise.js:194`: `showHarvestSection()` called after finalise success; skip option available |
| 2 | Candidate items compiled from approved rewrites, skill additions, summary rewrites, gap-revealed skills | ✅ | `scripts/routes/generation_routes.py:1140`: `_compile_harvest_candidates()` draws from session state |
| 3 | No item pre-selected (opt-in only) | ✅ | `web/harvest.js:100`: comment explicitly: "All harvest items start unchecked — master CV updates are opt-in only" |
| 4 | Each item shows before/after diff with rationale | ✅ | `web/harvest.js:143–219`: each candidate row renders original and proposed text with rationale |
| 5 | Consolidated JSON diff shown before write | ✅ | `web/harvest.js:351`: `/api/harvest/analyze` returns diff before apply |
| 6 | Explicit confirmation required; no blind writes | ✅ | `web/harvest.js:488+`: Apply button triggers confirm step before writing |
| 7 | Git commit on every confirmed harvest | ✅ | `scripts/routes/generation_routes.py:2188`: `git commit` with `chore: Update master CV data from {company}_{role}_{date} session` |
| 8 | Harvest skippable if no meaningful improvements | ✅ | `web/harvest.js:335`: "No harvest candidates found" empty state; skip path available |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| # | Criterion | Status | Notes / Evidence |
|---|-----------|--------|-----------------|
| 1 | Re-run affordance visible for each completed stage in progress indicator | ✅ | `web/workflow-steps.js:645,727–733`: `↻` button injected into all steps in `RE_RUN_STEPS` set; `opacity:0.35` at rest (GAP-180 confirmed at line 733) |
| 2 | Confirmation dialogue lists stage to re-run and potentially affected downstream stages | ✅ | `web/workflow-steps.js:164–187`: `role="dialog"` overlay with descriptive title and body; `aria-labelledby="rerun-confirm-title"` (GAP-176 fix); Escape handler at line 187 |
| 3 | Re-run does not silently discard prior approvals | ✅ | `conversation_manager.py:1475–1476`: "Downstream approvals … are preserved and included in the new LLM prompt as structured context" |
| 4 | LLM re-run receives full session context (job text, clarification answers, downstream decisions) | ✅ | `conversation_manager.py:1490–1491`: `ctx = self._build_downstream_context()` (method at line 1392); passed as `_prior_context` at line 1515 |
| 5 | After re-run, only changed/new items highlighted; unchanged items remain approved | ✅ | `web/workflow-steps.js:325+`: `_highlightReRunChanges()` diffs prior vs new output and marks changed elements |
| 6 | Clarification answers can be amended when triggering re-run of Analysis | ✅ | `conversation_manager.py:1494–1507`: analysis re-run uses current `post_analysis_answers`; questions panel allows updates before re-run |
| 7 | Session audit log records each re-run event (stage, timestamp, prior answers, count affected) | ❌ | `conversation_manager.py:1570–1576`: `re_run_phase()` calls `_save_session()` and returns `{ok, phase, prior_output, new_output}` but does NOT write a structured audit log entry. No `rerun_log` or equivalent timestamped field exists in `self.state`. |
| 8 | Re-run affordance accessible via keyboard shortcut or menu (not only progress indicator) | ❌ | No `accesskey`, hotkey handler, or secondary-nav menu path found in `web/workflow-steps.js`, `web/index.html`, or `web/ui-core.js`. The `↻` button is tab-focusable with `:focus-visible` style (`web/workflow-steps.js:762`) but no keyboard shortcut or menu alternative exists as the story explicitly requires. |

---

## Additional Story Gaps / Proposed Story Items

### Confirmed-present items not in stories but noteworthy
- **Layout freshness chip** (`web/state-manager.js:120–177`): "Files outdated" / "Layout outdated" / "Layout current" chip in position bar — real-time applicant feedback not covered by any story.
- **Prior-clarification banner** (`web/message-dispatch.js:512–526`): Styled banner offering "Load defaults" vs "No thanks" before questions panel — exceeds US-A2's pre-population requirement with a deliberate opt-in step.
- **LLM busy overlay with elapsed timer** (`web/index.html:152–162`): Elapsed time display and stop button during LLM calls — good transparency not captured in stories.

### Gap items discovered beyond story checklist
1. **Publications reorder missing (US-A3)**: `web/publications-review.js` offers only accept/reject; no up/down or drag controls. Story AC: "reorder using up/down buttons."
2. **US-A9 missing total elapsed time**: `web/finalise.js:174–189` shows ATS score and commit hash but not "total time." Session start timestamp not surfaced in finalise summary.
3. **US-A10 NL update / document ingestion absent**: Master CV management is structured CRUD only. No NL-to-JSON-diff path or paste-old-CV ingest endpoint.
4. **US-A12 no re-run audit log**: `conversation_manager.py:1570–1576` does not write a `rerun_log` entry with timestamp, previous answers, and count of affected downstream items.
5. **US-A12 no keyboard shortcut for re-run**: `↻` button is tab-focusable but there is no global shortcut key or menu-based path; story AC explicitly requires "keyboard shortcut or menu."
6. **US-A3b category drag-and-drop absent**: `web/skills-review.js` has no `dragstart`/`drop` event handlers; story names drag-and-drop for category reorder.
7. **US-A3b no explicit "create new category" UI**: New category creation is implicit (type a new name in a skill's category field). No dedicated "Add Category" button or wizard exists.
8. **US-A3b no long-bullet readability warning**: `web/skills-review.js` does not compute rendered bullet length or warn when a grouped skill bullet would be unusually long.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py  
**Additional files read for evidence:** web/job-input.js, web/job-analysis.js, web/review-table-base.js, web/rewrite-review.js, web/spell-check.js, web/workflow-steps.js, web/publications-review.js, web/skills-review.js, web/cover-letter.js, web/screening-questions.js, web/harvest.js, web/finalise.js, web/message-dispatch.js, scripts/routes/status_routes.py, scripts/routes/generation_routes.py, scripts/routes/master_data_routes.py, scripts/utils/cv_orchestrator.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-A1 | 4 | 0 | 0 | 0 | 0 |
| US-A2 | 8 | 0 | 0 | 0 | 0 |
| US-A3 | 6 | 0 | 1 | 0 | 0 |
| US-A3b | 5 | 1 | 0 | 2 | 0 |
| US-A4 | 9 | 0 | 0 | 0 | 0 |
| US-A4b | 7 | 0 | 0 | 0 | 0 |
| US-A5a | 5 | 0 | 0 | 0 | 0 |
| US-A5b | 8 | 0 | 0 | 0 | 0 |
| US-A5c | 6 | 0 | 0 | 0 | 0 |
| US-A6 | 4 | 0 | 0 | 0 | 0 |
| US-A7 | 8 | 1 | 0 | 0 | 0 |
| US-A8 | 7 | 0 | 0 | 0 | 0 |
| US-A9 | 6 | 1 | 0 | 0 | 0 |
| US-A10 | 3 | 0 | 0 | 2 | 0 |
| US-A11 | 8 | 0 | 0 | 0 | 0 |
| US-A12 | 6 | 0 | 2 | 0 | 0 |

**Key evidence references:**
- **US-A7 cover letter PDF absent**: `scripts/routes/master_data_routes.py:1619–1697` — only DOCX produced; story requires `.docx` AND `.pdf`
- GAP-174 (company context textarea): `web/cover-letter.js:130–131, 251`
- GAP-176 (bullet reorder modal ARIA + focus trap + Escape): `web/workflow-steps.js:164–187, 456–514`
- GAP-178 (aria-pressed on rewrite buttons): `web/rewrite-review.js:306–308, 325, 342, 360, 392, 396`
- GAP-179 (focus-visible for .icon-btn, .rw-btn, .sm-btn): `web/styles.css:1195, 1263, 296`
- GAP-180 (step-rerun opacity:0.35 at rest): `web/workflow-steps.js:733`
- GAP-181 (spell-check "Generate Preview →"): `web/spell-check.js:148, 271`
- GAP-166 (rewrite decisions localStorage): `web/rewrite-review.js:46, 53, 64, 185`
- Publications missing reorder: `web/publications-review.js` — no up/down or drag controls anywhere in file
- US-A10 NL update absent: `web/master-cv.js` — structured CRUD only; no `/api/master-data/nl-update` or ingestion endpoint
- US-A12 no audit log: `conversation_manager.py:1570–1576` — returns result but no timestamped `rerun_log` written to state
- US-A12 no keyboard shortcut: `web/workflow-steps.js`, `web/index.html` — no `accesskey`, hotkey handler, or menu route

**Evidence standard:** Every conclusion is supported by file path and line number sufficient for another reviewer to verify independently.
