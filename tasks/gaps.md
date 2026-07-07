# Gaps Analysis: Source-Verified UI Review Findings

**Generated:** 2026-03-06 | **Last updated:** 2026-07-07 (cycle 100)
**Sources:**

- prior backlog in `tasks/gaps.md`
- refreshed persona review files under `tasks/review-status/` dated 2026-04-22, 2026-06-18 (cycle 1), 2026-06-18 (cycle 2), 2026-06-20 (cycle 4), 2026-06-20 (cycle 5), 2026-06-22 (cycle 6), 2026-06-22 (cycle 7), 2026-06-29 (cycle 8), 2026-06-29 (cycle 9), 2026-06-30 (cycles 10–11), 2026-06-30 (cycle 12), 2026-06-30 (cycle 13), 2026-06-30 (cycle 14), 2026-07-01 (cycle 15–16), 2026-07-01 (cycle 29), and 2026-07-06 (cycle 82)
- independent heuristic UX evaluation (all cycles through 2026-07-06 cycle 82)
- aggregate synthesis in `tasks/ui-review.md`

This document tracks the gaps that still remain after reconciling the refreshed full 15-persona + heuristic review set against the current implementation. The 2026-04-22 cycle added GAP-72 through GAP-123. The 2026-06-18 cycle 1 added GAP-124 through GAP-142. The 2026-06-18 cycle 2 added GAP-143 through GAP-145. The 2026-06-18 cycle 3 added GAP-146 through GAP-154. The 2026-06-20 cycle 4 added GAP-155 through GAP-165. The 2026-06-20 cycle 5 added GAP-166 through GAP-175. The 2026-06-22 cycle 6 added GAP-176 through GAP-181. The 2026-06-22 cycle 7 added GAP-182. The 2026-06-29 cycle 8 added GAP-183 through GAP-194. The 2026-06-29 cycle 9 added GAP-195 through GAP-217 (GAP-205 and GAP-207 are duplicates of existing gaps; GAP-212 through GAP-217 are from the HR/ATS specialist review). The 2026-06-30 cycle 11 added GAP-218 through GAP-233. The 2026-06-30 cycle 13 added GAP-234 through GAP-257. The 2026-06-30 cycle 14 added GAP-258 through GAP-270. The 2026-07-01 cycle 29 added GAP-271 through GAP-295. 2026-07-02 added GAP-296–GAP-297 (open-source/contributor-readiness, from the ci-cd-engineer persona's scope extension ahead of inviting outside users/contributors) and the new `marketing` persona (`tasks/user-story-marketing.md`, `tasks/review-status/marketing.md`) — no marketing-persona gaps filed yet pending its first full review. 2026-07-02 also added GAP-298–GAP-299 (internal testing-doc consistency follow-ups from Claude Code's review of the `e2e-browser-test.md` expansion — not persona-discovered, no end-user-facing impact). 2026-07-06 cycle 82 added GAP-300 through GAP-325. 2026-07-06 cycle 88 added GAP-326 through GAP-340. 2026-07-06 cycle 93 added GAP-341 through GAP-375 (35 new entries from full 15-persona + heuristic review).

## 2026-07-07 (Cycle 100) Implementation Notes

Cycle 100: code review of the draft GAP-362 implementation found 2 confirmed bugs — gate-type key contamination (stale `include_publications` etc. travelling to the backend and affecting LLM recommendations) and consent bypass (`window.questionAnswers` pre-populated before the existing "No thanks" banner, whose dismiss path did not clear it). Investigation revealed GAP-362 was already resolved by a pre-existing mechanism: `_proceedAfterIntake()` → `/api/prior-clarifications` → consent banner. The buggy draft implementation was fully reverted.

- GAP-362 (MEDIUM, OPEN→RESOLVED via pre-existing impl): No net code change; implementation was reverted after code review confirmed 2 bugs and discovered the pre-existing consent-based mechanism.

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-07 (Cycle 99) Implementation Notes

Cycle 99 addressed 1 gap:

- GAP-349 (HIGH, PARTIAL→RESOLVED): Fixed the `?` header button wiring in `app.js:setupEventListeners()`. The button's inline `onclick="showWelcomeModal()"` is removed at init time and replaced with a `showKeyboardShortcutsPanel()` listener (index.html is off-limits). Also updated `title` and `aria-label` to say "keyboard shortcuts reference". Updated the shortcuts panel in `keyboard-shortcuts.js` to correctly describe A/R as "Accept/include" and "Reject/exclude" and to mention they work on customise review table rows, not just rewrite/spell cards. The button TEXT ("? Help") could not be changed — it remains in index.html.

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-07 (Cycle 98) Implementation Notes

Cycle 98 addressed 1 gap:

- GAP-361 (MEDIUM, PARTIAL→RESOLVED): Added skill-gap computation to `_handle_analyze_job()` in `conversation_manager.py`. After analysis, the required skills list is fuzzy-matched against master CV skill names (substring containment, case-insensitive). Unmatched skills are stored as `analysis['skill_gaps']` in the session state. `appendFormattedAnalysis()` in `message-queue.js` now renders a "⚠️ Skill Gaps" section (amber styling) when `data.skill_gaps` is non-empty. Also fixed unescaped HTML in all other forEach calls in the same function (required\_skills, preferred\_skills, nice\_to\_have\_requirements, ats\_keywords).

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-07 (Cycle 97) Implementation Notes

Cycle 97 addressed 2 gaps:

- GAP-351 (HIGH): Added `_maybeShowCustomizationsGuide()` to `review-table-base.js`. Fires once per browser session on first visit to any Customise sub-tab. Prepends a dismissible sky-blue `.intake-confirm-card` guide to `document-content` listing all 10 sub-tabs with suggested order, required/optional distinction, and a dismiss (✕) button. Called from `loadTabContent()` after each customise tab case.
- GAP-365 (MEDIUM): Added `.intake-confirm-card` with editable position-name input to `populateJobTab()` in `job-input.js` when `data.phase === PHASES.INIT`. "Analyse Job" button now calls `_analyzeJobWithConfirm()` (exported) which reads the input, calls `/api/rename-current-session` if the value changed from the default, then calls `analyzeJob()`.

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-07 (Cycle 96) Implementation Notes

Cycle 96 addressed 7 gaps (2 source-verified as already resolved):

- GAP-357 (MEDIUM): Source-verified already implemented — `required_skills` +8 bonus and first-author +10 bonus both present in `cv_orchestrator.py:3805–3820` with `# GAP-357` comment. Marked RESOLVED.
- GAP-358 (MEDIUM): Added pre-generation page length estimate to customization message in `conversation_manager.py:_handle_recommend_customizations`. Appends `📏 Estimated CV length: X.X pages` (with ⚠️ prefix if > 3.5 or < 1.5 pages) after recommendations are finalized.
- GAP-369 (LOW): Added auto-resume explanation in `session-manager.js:ensureSessionContext` — appends `ℹ️ Only one active session found — auto-resumed. Open Sessions to switch or start a new one.` after `loadSessionFile` succeeds.
- GAP-370 (LOW): Changed default archive status from `queued` to `ready` in `finalise.js:103–105` — "Ready to send" is the appropriate default at the finalisation checkpoint.
- GAP-372 (LOW): Source-verified already correct — backend `master_data_routes.py:119–121` returns 400–500 (exec) / 500–600 (academic) / 300–400 (standard); frontend `cover-letter.js:650–651` validates to matching ranges. GAP-338 was fully resolved in cycle 88. Marked RESOLVED.
- GAP-374 (LOW): Added LLM disclosure check to `generateCoverLetter()` (cover-letter.js), `generateScreeningResponse()` (screening-questions.js), and `fetchAnalysis()` (harvest.js) — uses same provider-scoped `disclosureKey` pattern from job-analysis.js; fires once per provider; appends system message if `appendMessage` is in scope.
- GAP-375 (LOW): Added 2 new checks to `_validate_summary()` in `cv_orchestrator.py`: Check 5 (job title words should appear in summary) and Check 6 (years-of-experience quantification pattern e.g. "10+ years").

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-06 (Cycle 95) Implementation Notes

Cycle 95 addressed 10 gaps:

- GAP-344 (HIGH): Expanded cover letter persuasion checks in `master_data_routes.py` from 3 to 7 (added `check_strong_action_verb`, `check_has_result_clause`, `check_positive_metric_framing`, `check_named_institution_position`)
- GAP-345 (HIGH): Escalated `check_car_structure()` fail-branch severity from `'info'` to `'warn'` in `llm_client.py:1405`
- GAP-352 (PARTIAL): Added `notes` field to `/api/sessions/active` response in `session_routes.py` — active session notes now appear in Sessions modal row (session-switcher-ui.js already reads s.notes). Full workspace banner blocked by index.html OFF-LIMITS (GAP-01).
- GAP-353 (MEDIUM): Added post-generation summary quality check in `master_data_routes.py:generate_professional_summary` route; runs `check_summary_generic_phrases()` on generated text; returns `quality_warning` in API response; `summary-review.js` shows a warning toast when present
- GAP-356 (MEDIUM): Added company-substance check (Rule 2b) to `_validateCoverLetter()` in `cover-letter.js` — warns when no company context provided; checks that context keywords appear in letter when context is filled; added 4 new persuasion flag labels to `_persuasionFlagLabels`
- GAP-361 (PARTIAL): Added `role_level` to job analysis panel in `message-queue.js:appendFormattedAnalysis` — shows "Role level: IC / Senior IC …" when present; full skill-gap display deferred (requires backend gap computation)
- GAP-363 (RESOLVED — already done): Source-verified that `post_analysis_answers` IS already injected into screening prompt at `master_data_routes.py:1968–1986`
- GAP-364 (MEDIUM): Added `#layout-substep-indicator` to layout panel in `layout-instruction.js`; updates dynamically in `refreshLayoutReviewState()` to show "Step N of 3" with descriptive label; CSS added to `styles.css`
- GAP-366 (MEDIUM): Added single-level bulk undo to publications review (`publications-review.js`: `_pubUndoSnapshot`, `undoBulkPubAction`, undo button in `pub-bulk-toolbar`) and rewrite review (`rewrite-review.js`: `_rwUndoSnapshot`, `undoBulkRewriteAction`, undo button in tally bar)
- GAP-368 (PARTIAL): Updated `workflow-steps.js` `STEP_SHORT_LABELS` and dynamic `STEP_LABELS` to use "Update Master CV" instead of "Harvest" — static index.html labels remain (OFF-LIMITS until GAP-01)

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-06 (Cycle 94) Implementation Notes

Cycle 94 addressed 8 gaps (7 from cycle 93 discovery; GAP-350 and GAP-360 co-fixed):

- GAP-342 (HIGH): Added `candidate_to_confirm` filter to human DOCX skills path in `cv_orchestrator.py:4938`
- GAP-343 (HIGH): Added anti-fabrication clause to cover letter LLM system prompt in `master_data_routes.py:1691`
- GAP-348 (HIGH): Added `tr.kb-focused` CSS rule to `styles.css` for DataTable row keyboard focus visibility
- GAP-350 (HIGH) + GAP-360 (MEDIUM): Exported `_NON_BLOCKING_CHECKS` from `download-tab.js`; imported in `finalise.js`; both `_atsFails` computations now exclude advisory checks; "Blocked formats" footer now only shows when `blockingFails.length > 0`
- GAP-354 (MEDIUM): Added `_initReviewSubtabKeyNav()` to `review-table-base.js` with ArrowLeft/ArrowRight handler and roving tabindex on review sub-tab container
- GAP-355 (MEDIUM): Fixed `cv-template.html` heading hierarchy: skill group `<h4>` → `<h3>` (and `.skill-group h4` CSS → `.skill-group h3`); job-role `<div>` → `<h3 class="job-role">`
- GAP-373 (LOW): Added `scheduleAtsRefresh()` in skill type toggle handler in `skills-review.js`

Test suite: 1442 Python + 1223 JS passing.

---

## 2026-07-06 (Cycle 93) Reconciliation Notes

Full 15-persona + heuristic review cycle (discovery only — no code fixes in this cycle). Added GAP-341 through GAP-375 (35 new entries) from findings across all persona reviews and heuristic evaluation.

- **recruiter-ops** — Finalise/archive tab structurally unreachable — 4 independent barriers: `display:none` in `index.html`, absent from `STAGE_TABS`, `updateActionButtons('finalise')` never called, no phase maps to `'finalise'` in `PHASE_TO_STEP` (GAP-341, CRITICAL)
- **resume-expert** — `candidate_to_confirm` skills leak into human DOCX `_generate_human_docx` path — one-liner fix at `cv_orchestrator.py:4938` (GAP-342, HIGH)
- **trust-compliance** — Cover letter LLM system prompt has no anti-fabrication clause (GAP-343, HIGH)
- **persuasion-expert** — Only 3/10 persuasion checks applied to cover letter body (GAP-344, HIGH)
- **persuasion-expert** — CAR structure check severity `'info'` — zero enforcement, invisible in UI (GAP-345, HIGH)
- **accessibility** — No skip navigation link — WCAG 2.4.1 Level A violation (GAP-346, HIGH)
- **master-cv-curator** — Publication edit modal silently drops non-hardcoded BibTeX fields on save (GAP-347, HIGH)
- **power-user** — `kb-focused` CSS missing for DataTable rows — keyboard nav works but invisible (GAP-348, HIGH)
- **power-user** — `?` header button opens welcome modal (wrong target); shortcut panel undiscoverable and outdated (GAP-349, HIGH) ✅ cycle 99
- **hr-ats** — Advisory ATS failures counted as blocking in readiness chip and finalise checklist (GAP-350, HIGH)
- **first-time-user** — Customise stage exposes 9 sub-tabs simultaneously with no guidance (GAP-351, HIGH) ✅ cycle 97
- **returning-user** — Session notes invisible during active session workspace (GAP-352, MEDIUM)
- **persuasion-expert** — Professional summary never post-validated after generation (GAP-353, MEDIUM)
- **accessibility** — Review sub-tabs lack arrow-key navigation and roving tabindex (GAP-354, MEDIUM)
- **accessibility** — CV template heading hierarchy skips: h2→h4 in skills, job-role as div not h3 (GAP-355, MEDIUM)
- **hiring-manager** — Cover letter company-reference check passes without substance (GAP-356, MEDIUM)
- **resume-expert** — Publication scoring over-weights recency, ignores required_skills; first-author 0-weight (GAP-357, MEDIUM)
- **resume-expert** — No user-visible pre-generation page length estimate (GAP-358, MEDIUM)
- **master-cv-curator** — experience `domain_relevance` field absent from Master CV CRUD modal (GAP-359, MEDIUM)
- **hr-ats** — "Blocked formats reflect ATS validation failures" footer appears when nothing is blocked (GAP-360, MEDIUM, one-line fix)
- **applicant** — Role-type/mismatch gap analysis computed but not shown in job analysis panel (GAP-361, MEDIUM) ✅ cycle 98
- **applicant** — Prior-session clarification answers never pre-populated across sessions (GAP-362, MEDIUM) ✅ pre-existing impl
- **applicant** — Screening LLM call doesn't inject post-analysis clarification answers (GAP-363, MEDIUM)
- **ux-expert** — Layout sub-phase has 4 sequential action buttons with no sub-step indicator (GAP-364, MEDIUM)
- **ux-expert** — `.intake-confirm-card` CSS exists but extracted-field confirmation is unwired (GAP-365, MEDIUM) ✅ cycle 97
- **power-user** — Publications and rewrite bulk actions lack undo path (GAP-366, MEDIUM)
- **multi-persona** — "LLM" / developer jargon in header and status copy (GAP-367, LOW)
- **multi-persona** — "Harvest" step label is an opaque metaphor for job seekers (GAP-368, LOW)
- **returning-user** — Single-session auto-resume fires without explaining why user landed in that session (GAP-369, LOW)
- **recruiter-ops** — Default archive status dropdown value is "queued" — wrong for a completed package (GAP-370, LOW)
- **master-cv-curator** — Summary variant key exposed as display label, no display-name field (GAP-371, LOW)
- **hiring-manager** — Executive/academic cover letter word count bounds possibly still below story spec (check GAP-338 resolution) (GAP-372, LOW)
- **hr-ats** — Hard/soft skill type toggle in skills-review.js doesn't call scheduleAtsRefresh() (GAP-373, LOW)
- **trust-compliance** — LLM disclosure fires only at analyzeJob(), not at cover letter/harvest/screening (GAP-374, LOW)
- **hiring-manager** — `_validate_summary()` doesn't check for job title or years-of-experience mention (GAP-375, LOW)

Confirmed still open: GAP-309–312 (master-cv.js OFF-LIMITS), GAP-319 (publication shortlist not proactive), GAP-325 (superseded by GAP-341).
Confirmed resolved: GAP-323 (auto-resume), GAP-334 (readiness chip), GAP-335 (provider-scoped disclosure), GAP-336 (provenance badges), GAP-306/--cv-card-bg.

---

## 2026-07-06 (Cycle 92) Implementation Notes

Cycle 92 addressed 2 gaps: GAP-334 (compact readiness chip added to the File Review tab h1 heading in `web/download-tab.js` — shows "Required files: N/3 ✅/⚠" plus ATS status, computed from the files list and ATS checks already fetched in `populateDownloadTab()`, with no new fetches required), GAP-336 (harvest bullet provenance: `_compile_harvest_candidates()` in `scripts/routes/generation_routes.py` now looks up `outcome` from `rewrite_audit` by rewrite id and adds it to each candidate dict; `renderCandidateRow()` in `web/harvest.js` renders a "✏️ User-edited" or "🤖 AI accepted" badge alongside the existing type label for `improved_bullet` and `summary_variant` types). 1442 Python + 1223 JS tests passing.

## 2026-07-06 (Cycle 91) Implementation Notes

Cycle 91 addressed 1 gap: GAP-339 (persuasion checks now run on generated cover letter body in `scripts/routes/master_data_routes.py` — passive_voice, hedging, and generic_phrases checks applied to the generated body text; results stored in `conversation.state['cover_letter_persuasion_warnings']` and returned as `persuasion_warnings` in the `/api/cover-letter/generate` response; `web/cover-letter.js` reads `data.persuasion_warnings`, stores in `_coverLetterFormState.persuasionWarnings`, and `_validateCoverLetter()` appends them to the existing checks panel). No new tests required — existing 1442 Python + 1223 JS tests pass.

## 2026-07-06 (Cycle 90) Implementation Notes

Cycle 90 addressed 3 gaps: GAP-330 (auto-analysis removed from file upload and paste submit paths in `web/job-input.js` — both now call `populateJobTab()` like the URL fetch path, so users review the extracted position name before clicking "🔍 Analyse Job"), GAP-333 (false positive — notes ARE rendered in the sessions modal via `notesPreview` at `session-switcher-ui.js:404–406`), GAP-335 (LLM disclosure flag now keyed by provider ID in `web/api-client.js` via `disclosureKey(provider)` helper; `analyzeJob()` in `web/job-analysis.js` reads the current provider from `StorageKeys.TAB_DATA` and uses the provider-scoped key, so the disclosure fires once per provider on first use).

## 2026-07-06 (Cycle 89) Implementation Notes

Cycle 89 addressed 4 gaps: GAP-327 (aria-hidden not toggled on modals opened outside openModal() — fixed in ui-core.js, ats-modals.js, session-switcher-ui.js for settings, confirmDialog, model, ATS report, job analysis, sessions, and ownership-conflict modals), GAP-329 (ats_checks added to StatusResponse and populated from generated_files.metadata.ats_validation.checks in status_routes.py), GAP-331 (sessions modal and ownership conflict dialog now use pushFocusStack/_focusStack instead of disconnected window._focusedElementBeforeModal), GAP-337 (publications CRUD single-entry and import routes now back up publications.bib before overwriting). 5 new JS tests added, 1 Python test added.

## 2026-07-06 (Cycle 88) Implementation Notes

Cycle 88 addressed 6 gaps: GAP-326 (ATS DOCX candidate_to_confirm skill filter), GAP-328 (window.confirm → confirmDialog at app.js:138), GAP-332 (publications tab keyboard A/R navigation), GAP-338 (cover letter exec/academic word count ranges aligned to story spec), GAP-341 (ATS Score modal raw basis strings replaced with human-readable labels). Cycle 88 also discovered 15 new gaps (GAP-326 through GAP-340).

## 2026-07-06 (Cycle 87) Implementation Notes

Cycle 87 addressed 2 gaps: GAP-324 (keyboard card navigation extended to DataTable review rows for Experiences, Skills, Achievements sub-tabs), GAP-300b (new numeric claims persuasion check added to llm_client.py and wired into conversation_manager.py).

## 2026-07-06 (Cycle 86) Implementation Notes

Cycle 86 addressed 5 gaps: GAP-308 (ATS advisory vs blocking distinction), GAP-304 (model table keyboard nav), GAP-321 (ai_attribution config persistence), GAP-325 (Finalise button relabeled), GAP-323 (single-session auto-resume).

## 2026-07-06 (Cycle 85) Implementation Notes

Cycle 85 addressed 4 gaps: GAP-303 (ARIA tab semantics on review sub-tabs), GAP-305 (alert modal focus stack), GAP-313 (file timestamps in Generated Files tab), GAP-315 (cover letter tone auto-suggest).

## 2026-07-06 (Cycle 84) Implementation Notes

Cycle 84 addressed 6 gaps from cycle 82 review: GAP-300 (anti-fabrication instruction), GAP-314 (welcome modal active session), GAP-316 (cover letter word count), GAP-317 (zero-bullet guard), GAP-318 (first-author publication bonus), GAP-320 (summary density check).

## 2026-07-06 (Cycle 83) Implementation Notes

Cycle 83 addressed 5 highest-priority gaps from cycle 82 review: GAP-301 (ATS HTML lang), GAP-302 (FA aria-hidden), GAP-306 (--cv-card-bg), GAP-307 (result-clause severity), GAP-322 (Weak evidence label). Also added `.toggle-chat:focus-visible` focus ring (unpinned accessibility improvement).

## 2026-07-06 (Cycle 82) Reconciliation Notes

Full 15-persona + heuristic review cycle. No code fixes in this cycle — discovery only. Added GAP-300 through GAP-325 from new findings across all persona reviews.

- **trust-compliance** — System prompt lacks anti-fabrication instruction (GAP-300, CRITICAL)
- **accessibility** — ATS HTML `<html>` tag missing `lang="en"` (GAP-301); Font Awesome icons missing `aria-hidden="true"` in generated HTML CV (GAP-302); review sub-tab buttons missing tab ARIA semantics (GAP-303); model table not keyboard-accessible (GAP-304); alert modal focus stack isolation bug (GAP-305)
- **graphical-designer** — `--cv-card-bg` CSS variable undefined, position-style picker transparent background (GAP-306)
- **persuasion-expert** — `check_has_result_clause()` has severity `'info'` not `'warn'`, badge never visible (GAP-307)
- **hr-ats** — `_NON_BLOCKING_CHECKS` exempts 6 structural failures, contradicts "any fail blocks download" (GAP-308)
- **master-cv-curator** — Duplicate `id` attributes on publication modal heading (bug, GAP-309); experience bullets not editable in Master CV tab (GAP-310); backup restore requires manual reload (GAP-311); phase lock exposes raw enum "refinement" (GAP-312)
- **returning-user** — No file timestamps on Generated Files tab (GAP-313); welcome modal fires for active-session users (GAP-314)
- **hiring-manager** — Cover letter tone hardcoded `startup/tech` default (GAP-315); word count mismatch 250–300w backend vs 300–400w spec (GAP-316); zero-bullet job entries not guarded (GAP-317)
- **resume-expert** — First-author status 0-weight in publication scoring (GAP-318); publication shortlist not presented proactively (GAP-319); summary line-count not validated (GAP-320)
- **trust-compliance** — `ai_attribution` resets per session, not persisted to config.yaml (GAP-321); "Candidate to confirm" / "Weak evidence" inconsistency (GAP-322)
- **returning-user** — Single active session requires full modal to resume (GAP-323)
- **power-user** — Keyboard card nav absent for Experiences/Skills/Achievements DataTable tabs (GAP-324)
- **recruiter-ops** — Finalise tab hidden; reached only via mislabeled "Package Application Files" button (GAP-325)

---

## 2026-07-06 (Cycle 81) Reconciliation Notes

Four bugs from code review of cycles 79-80 fixed.

- **`web/review-table-base.js`** — `bulkAction()`: hides the OTHER type's undo button (e.g., skill bulk action hides exp undo button) to prevent cross-tab clobber bug where exp undo button stayed visible but silently no-op'd. `undoBulkAction()`: removed early return guard for `!restoredAction`; now clears active state for all visible rows and only re-applies the button active class when `restoredAction` is present. This restores rows that had no prior selection to "no action" state.
- **`web/achievements-review.js`** — `undoBulkAchievementAction()`: rewritten to set `window.achievementDecisions = { ...snap }` and iterate all visible rows (clearing active state, restoring from snap). Rows that had no prior decision (not in snap) are now correctly cleared.
- **`scripts/utils/cv_orchestrator.py`** — `_generate_ats_docx` pub loop: moved `venue_warning` append inside the `if citation:` check so whitespace-only `formatted_citation` (stripped to empty string) does not emit a lone `[venue unavailable]` paragraph.
- **`web/cover-letter.js`** — Rule 2b: limited `_p1Lc` to first 100 words of the first body paragraph (`_firstBody.split(/\\s+/).slice(0, 100).join(' ')`) so single-newline cover letters (parsed as one block) don't falsely pass when company/role only appear later in the letter.
- **Tests**: Added 2 tests in `tests/js/review-table-base.test.js` (cross-tab clobber fix + unset-rows fix), 1 test in `tests/js/cover-letter.test.js` (100-word para1 limit), 1 test in `tests/js/achievements-review.test.js` (ach undo unset-rows).
- **`web/bundle.js`** — Rebuilt.

## 2026-07-06 (Cycle 80) Reconciliation Notes

GAP-NEW-HM-07 and GAP-NEW-HM-08 resolved: cover letter paragraph-1 validation and venue-warning in generated output.

- **`web/cover-letter.js`** — Added Rule 2b ("Paragraph 1 role context") to `_validateCoverLetter`. Extracts first body paragraph (split on `\n\n+`, skipping the salutation line), then checks whether company name and role title (`_lastAnalysisData.title`) appear in it. Renders pass/warn/fail with a detail message identifying the missing term(s). Prepended `_clAnalysis` / `_jobTitle` locals before Rule 2 to share the analysis lookup.
- **`templates/cv-template.html`** — Added `.pub-venue-warning` CSS (amber italic, cursor:help). Added `{% if pub.venue_warning | default('') %}` block after the publication citation item to render `<span class="pub-venue-warning" title="...">[venue unavailable]</span>`.
- **`scripts/utils/cv_orchestrator.py`** — `_generate_ats_docx`: appends `' [venue unavailable]'` to citation string when `pub.get('venue_warning')` is truthy. `_generate_human_docx`: adds an italic amber-coloured run (`vr.font.color.rgb = RGBColor(0xB4, 0x53, 0x09)`) after the citation paragraph when venue_warning is set.
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/cover-letter.test.js`** — Added 4 new tests in `_validateCoverLetter — paragraph 1 role context` describe block. Test count: 1213 (was 1209).
- **`tasks/review-status/hiring-manager.md`** — AC6.1 and AC7.6 updated to ✅ Pass; cycle line updated.
- **Python tests:** 1436 pass (pending confirmation). **JS tests:** 1213 pass (4 new).

## 2026-07-06 (Cycle 79) Reconciliation Notes

Power-user Gap E resolved: single-level bulk-action undo for experience/skill/achievement review tables.

- **`web/review-table-base.js`** — Added `_bulkUndoSnapshot` module-level variable. `bulkAction()` now snapshots `userSelections[selType]` before applying changes and calls `_setBulkUndoVisible(type, true)` after. Added `undoBulkAction(type)` (restores snapshot, re-applies button active states, hides undo button) and `_setBulkUndoVisible(type, show)` helpers. Exported `undoBulkAction`.
- **`web/experience-review.js`** — Toolbar div given `id="exp-bulk-toolbar"`; added hidden `↩ Undo` button (`.bulk-undo-btn`, `display:none`) calling `undoBulkAction('experience')`.
- **`web/skills-review.js`** — Toolbar div given `id="skill-bulk-toolbar"`; added hidden `↩ Undo` button calling `undoBulkAction('skill')`.
- **`web/achievements-review.js`** — Added `_achBulkUndoSnapshot` module-level variable. `bulkAchievementAction()` snapshots `window.achievementDecisions` before iterating. Added `undoBulkAchievementAction()` (restores via `handleAchievementAction` per entry, hides undo button). Toolbar div given `id="ach-bulk-toolbar"`; added hidden `↩ Undo` button calling `undoBulkAchievementAction()`. Exported `undoBulkAchievementAction`.
- **`web/styles.css`** — Added `.bulk-btn.bulk-undo-btn` and hover rules; `margin-left:auto` pushes the button to the right end of the toolbar for visual distinction.
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/review-table-base.test.js`** — Added `bulkAction` and `undoBulkAction` to imports; added 7 new tests in `bulkAction snapshot and undoBulkAction` describe block. Test count: 1205 (was 1198).
- **`tests/js/achievements-review.test.js`** — Added `undoBulkAchievementAction` to imports; added 4 new tests in `undoBulkAchievementAction` describe block. Test count: 1209 (was 1205).
- **`tasks/review-status/power-user.md`** — Gap E marked RESOLVED; summary and Gap E section updated.
- **Python tests:** 1436 pass (unchanged). **JS tests:** 1209 pass (11 new).

## 2026-07-06 (Cycle 78) Reconciliation Notes

US-U6 Criterion 1 fully resolved: step progress checklist during CV generation.

- **`web/layout-instruction.js`** — Updated `#processing-indicator` HTML (injected by JS, not index.html) to include `<ol id="cv-gen-step-list">` with three `<li class="cv-gen-step">` items. Added `_showGenStepProgress(activeIdx)` helper that shows the step list and marks steps is-pending / is-active / is-complete. Updated `showProcessing()` to hide the step list and show the label on normal calls. Updated `generateFinalOutputs()` to call `_showGenStepProgress(0)` at start and advance through steps via `setInterval` at 2500ms intervals instead of cycling label text. Exported `_showGenStepProgress`.
- **`web/styles.css`** — Added `.cv-gen-step-list`, `.cv-gen-step`, `.cv-gen-step.is-active`, `.cv-gen-step.is-complete`, `.cv-gen-step.is-pending` CSS rules.
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/layout-instruction.test.js`** — Updated `buildDom()` to include step list elements; added import for `_showGenStepProgress`; added 7 new tests: 1 for `showProcessing` (step list hidden), 6 for `_showGenStepProgress`. Test count: 1198 (was 1191).
- **`tasks/review-status/ux-expert.md`** — US-U6 C1 updated to ✅; GAP-UX-06 note updated. Date updated.
- **Python tests:** 1436 pass (unchanged). **JS tests:** 1198 pass (7 new).

## 2026-07-06 (Cycle 77) Reconciliation Notes

GAP-UX-05 resolved: confidence badge tooltips and column header legend.

- **`web/recommendation-helpers.js`** — `_parseConfidence()` now returns a `title` field per level (qualitative description, e.g. "Strong alignment with the job requirements"). Added `CONFIDENCE_COLUMN_LEGEND` constant (exported) with a five-level summary for use in column header `title` attributes.
- **`web/experience-review.js`**, **`web/skills-review.js`**, **`web/achievements-review.js`** — Added `import { CONFIDENCE_COLUMN_LEGEND }` from recommendation-helpers; updated `confidenceBadge` templates to include `title="${confidence.title || ''}"` on the `<span>`; updated "Confidence" `<th>` headers to "Confidence ⓘ" with `title="${CONFIDENCE_COLUMN_LEGEND}"`. Suggested-achievement path in achievements-review.js uses an inline `confTitles` lookup for the same effect.
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/recommendation-helpers.test.js`** — Updated 3 failing assertions to use `expect.objectContaining()`; added import for `CONFIDENCE_COLUMN_LEGEND`; added 4 new tests (title field, legend string). Test count: 1191 (was 1187).
- **`tasks/review-status/ux-expert.md`** — GAP-UX-05 marked RESOLVED; date updated.
- **Python tests:** 1436 pass (unchanged). **JS tests:** 1191 pass (4 new).

## 2026-07-06 (Cycle 76) Reconciliation Notes

GAP-UX-01 resolved: session age indicator implemented.

- **`scripts/web_app.py`** — Added `session_last_modified: Optional[str] = None` field to `StatusResponse` dataclass.
- **`scripts/routes/status_routes.py`** — `session_last_modified` populated from `entry.last_modified.isoformat()` in `StatusResponse(...)` call.
- **`web/session-actions.js`** — Added `_formatSessionAge(isoStr)` helper (returns "Last edited Xm/Xh/Xd ago" / "yesterday"; hidden when < 5min or > 14d). Updated `updatePositionTitle()` to dynamically inject `#position-session-age` div (class `position-subtitle position-session-age`) below `#position-company` and populate it from `status.session_last_modified`. Exported `_formatSessionAge`.
- **`web/styles.css`** — Added `.position-session-age { font-style: italic; opacity: 0.8; }` rule.
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/session-actions.test.js`** — Added import for `_formatSessionAge`; 11 new tests: 9 for `_formatSessionAge`, 4 for `updatePositionTitle session age indicator`. Test count: 1187 (was 1175).
- **`tasks/review-status/ux-expert.md`** — GAP-UX-01 marked RESOLVED; US-U1 Criterion 4 notable gap updated to reflect implementation. Date updated.
- **Python tests:** 1436 pass (unchanged). **JS tests:** 1187 pass (12 new).

## 2026-07-05 (Cycle 75) Reconciliation Notes

Power-user Gap D fully resolved; two stale ux-expert findings corrected.

- **`web/workflow-steps.js`** — Added `_injectCustomizationsFilterToggle(expCount, skillCount)` and `_injectTableFilterBtn(tableId, containerId, count)`. After a customizations re-run, `_highlightChangedItems` now calls the filter inject (via `setTimeout(0)`) with the count of changed experience/skill rows. Each table's bulk-toolbar gets a "⬡ Changed (N)" button when some (but not all) rows changed; button toggles `.filter-cust-changed` class on the table. `_executeReRunPhase` clears `.cust-changed-filter-btn` buttons and `.filter-cust-changed` class on subsequent re-runs. New exports: `_injectCustomizationsFilterToggle`, `_injectTableFilterBtn`.
- **`web/styles.css`** — Three rules added: `#experience-review-table.filter-cust-changed tr[data-exp-id]:not(.rw-new-item) { display: none !important; }`, same for skills table, and active state for `.cust-changed-filter-btn[aria-pressed="true"]`. `!important` overrides DataTables' inline `display: table-row` management.
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/workflow-steps.test.js`** — Added imports for new functions; added 10 new tests: 4 for `_highlightChangedItems (customizations step)`, 6 for `_injectTableFilterBtn`. Test count: 1175 (was 1165).
- **`tasks/review-status/power-user.md`** — Gap D updated to RESOLVED (cycle 75); W3.3 updated to ✅ Pass; executive summary updated. Gap E (bulk undo) resolved in cycle 79.
- **`tasks/review-status/ux-expert.md`** — Four stale corrections: US-U9 C6 (layout two-step hint ✅, GAP-291 cycle 31), US-U8 C4 (min-height placeholders ✅, GAP-290 cycle 31), GAP-UX-10 and GAP-UX-11 marked as resolved. Date updated.
- **Python tests:** 1436 pass (unchanged). **JS tests:** 1175 pass (10 new).

## 2026-07-05 (Cycle 74) Reconciliation Notes

JS test suite: 22 pre-existing failures resolved — all 1165 tests now pass.

- **Missing exports added** — `loadTabContent` → `ui-core.js`; `showSessionConflictBanner`/`conflictRetryNow`/`conflictDismiss` → `fetch-utils.js`; `applyHarvestSelections` → `finalise.js`; `_ACTION_LABELS` → `session-actions.js` (already present); `_ACTION_LABELS`/`_STEP_DESCRIPTIONS` → `workflow-steps.js` (already present).
- **Stale expectations fixed** — phase labels updated to SHORT set; button/message copy updated to match current UI (`Generate Preview →`, `Could not generate final files`, etc.); `globalThis.tabData` and `globalThis.interactiveState` removed in favour of `stateManager` accessors; edit-mode diff now stays visible at 0.55 opacity.
- **Mock/import fixes** — `api-client.test.js` 409 mock needs `clone()` method; `ui-helpers.test.js` imports `toggleChat` from `ui-core.js` (correct module); fixture DOM uses `.interaction-area`/`.viewer-area` classes; `ui-core.test.js` uses dynamic import to get stable `fetchSettings`/`fetchStatus` mock references after `vi.resetModules()`; `ats-modals.test.js` stubs global `fetch` for synonym-map pre-fetch; `review-table-base.test.js` now `await`s `populateAnalysisTab` when `ats_keywords` present.
- **Stub additions** — `setInitialFocus` and `scrollIntoView` stubs added to tests that trigger code paths using them.
- **Python tests**: 1436 pass (unchanged).

## 2026-07-04 (Cycle 73) Reconciliation Notes

Step-tooltip contextual descriptions for FTU-1 and FTU-8 (first-time-user).

- **`web/workflow-steps.js`** — Added `_STEP_DESCRIPTIONS` constant (12 entries) with plain-English descriptions for every workflow step. Updated `_getStepTooltip` to prepend/append the description to every tooltip state: active ("Current step · {desc}"), completed ("desc · Click to view"), browsing-away ("Active step — click to return · {desc}"), stale (description appended), locked ("{desc} · Unlocks as you complete earlier steps.").
- **`web/bundle.js`** — Rebuilt.
- **`tests/js/workflow-steps.test.js`** — Updated `_getStepTooltip` test assertions from `.toBe()` to `.toContain()` to accommodate description-prefixed tooltips; added a separate test for the locked-step-description behavior and a test confirming empty return for unknown steps.
- **`tasks/review-status/first-time-user.md`** — FTU-1 and FTU-8 updated to reflect partial fix (tooltip-only; step labels on pill faces unchanged).
- **Test suite:** 1436 Python tests pass.

## 2026-07-04 (Cycle 72) Reconciliation Notes

Backend-developer stale test-coverage findings corrected; git-add failure regression test added.

- **`tests/test_master_data.py`** — New test `TestSaveMasterHelper::test_save_master_git_add_failure_does_not_raise`: verifies that when `subprocess.run(['git', 'add', ...])` returns exit 1, `web_app.py:_save_master` still saves the file and does not raise an exception. Was `🔲 Not implemented` in backend-developer.md.
- **`tasks/review-status/backend-developer.md`** — Two stale corrections:
  1. `static_routes` path traversal: already covered by `tests/test_security_regression.py:120–145` (GAP-58); corrected to ✅ Pass.
  2. `_save_master` git-add failure: test added above; corrected to ✅ Pass.
- **No JS/CSS changes** — no bundle rebuild needed.
- **Test suite:** 1436 expected (1435 + 1 new test).

## 2026-07-04 (Cycle 71) Reconciliation Notes

Hiring-manager stale finding corrections (AC2.2 and AC2.3).

- **`tasks/review-status/hiring-manager.md`** — AC2.2 (`_detect_sparse_experiences` at `cv_orchestrator.py:5100`, called at line 2114, rendered at `download-tab.js:417–426`) and AC2.3 (`_detect_long_bullets` at `cv_orchestrator.py:5075`, called at line 2111, rendered at `download-tab.js:406–415`) were incorrectly marked 🔲 Not Implemented. Both detect quality issues and surface yellow warning cards in the Download tab. Status corrected to ✅ Pass in body text and Summary Table.
- **No JS/CSS changes** — documentation only; no bundle rebuild needed.

## 2026-07-04 (Cycle 70) Reconciliation Notes

Session text-search filter in sessions modal (Power-user Gap C substantially resolved, W2.1).

- **`web/session-switcher-ui.js`** — Four changes:
  1. Added `let _smSearchTerm = ''` module-level state variable.
  2. `openSessionsModal()`: resets `_smSearchTerm = ''` on each fresh modal open.
  3. `_renderSessionTableRow()`: adds `data-sm-search="${name+company+phase (lowercase)}"` to each `.sm-tr` div, pre-computing the searchable text for fast client-side filtering.
  4. `_renderSessionTableFromCache()`: adds a `.sm-search-wrap > input#sm-search-input` above the table; wires up `input` event to call `_applySessionSearch()`; restores search term value on sort re-renders.
  5. New `_applySessionSearch()`: iterates `.sm-tr[data-sm-search]`, shows/hides rows by `.dataset.smSearch.includes(term)`, updates `#sm-table-info` to show "N of M sessions" count while filtering.
- **`web/styles.css`** — `.sm-search-wrap` and `.sm-search-input` CSS rules added.
- **`web/bundle.js`** — Rebuilt.
- **`tasks/review-status/power-user.md`** — Gap C updated to "SUBSTANTIALLY RESOLVED (cycle 70)"; W2.1 failure-mode check updated.
- **Test suite:** Running at time of commit; 1435 expected.

## 2026-07-04 (Cycle 69) Reconciliation Notes

"Show only changed" filter toggle for rewrite re-run (Power-user Gap D partial fix, W3.3).

- **`web/workflow-steps.js`** — Three changes:
  1. `_markChanged(el)`: now also adds `el.classList.add('rw-new-item')` (persistent) alongside `data-changed` animation attribute.
  2. `_injectRewriteFilterToggle(count)`: new function injecting a "⬡ Changed (N)" button into `#rewrite-tally` when some-but-not-all rewrite cards changed; button toggles `.filter-changed-only` on `#rewrite-cards`; `aria-pressed` tracks state; button text switches to "✕ Show all" when active.
  3. `_executeReRunPhase()`: clears `.rw-new-item` from all elements, removes any previous filter button, and resets `.filter-changed-only` before each re-run. After the 300ms DOM highlight, `_highlightChangedItems()` calls `_injectRewriteFilterToggle()` when the filter is applicable.
  4. `_highlightChangedItems()` (rewrite path): after marking cards, calls `_injectRewriteFilterToggle(changedCards.length)` via `setTimeout(0)`.
- **`web/styles.css`** — Two rules added:
  - `#rewrite-cards.filter-changed-only .rewrite-card:not(.rw-new-item) { display: none; }` — hides non-changed cards when filter is active.
  - `#rw-changed-filter-btn[aria-pressed="true"] { ... }` — active state styling (accent background).
- **`web/bundle.js`** — Rebuilt.
- **`tasks/review-status/power-user.md`** — Gap D updated to "PARTIAL FIX (cycle 69)"; W3.3 and net summary updated.
- **Remaining:** Experience/skill table filter (customizations step) not yet implemented.
- **Test suite:** Running at time of commit; 1435 expected.

## 2026-07-04 (Cycle 68) Reconciliation Notes

Named step-sequence progress labels during final generation (US-U6 Criterion 1 partial fix).

- **`web/layout-instruction.js`** — `generateFinalOutputs()` updated:
  - Added `const _STEP_LABELS = ['Step 1 of 3: Rendering HTML…', 'Step 2 of 3: Generating PDF…', 'Step 3 of 3: Building DOCX files…']` and `let _stepTimer = null` before `try`.
  - Changed `showProcessing(true, 'Generating final files…')` to `showProcessing(true, _STEP_LABELS[0])`.
  - Added `setInterval` that advances `_stepIdx` at 1800ms intervals, updating the `#processing-indicator` label through all three step labels while the `POST /api/cv/generate-final` call is in-flight.
  - Added `if (_stepTimer) clearInterval(_stepTimer)` in the `finally` block before `showProcessing(false)`.
- **`web/bundle.js`** — Rebuilt after JS change.
- **`tasks/review-status/ux-expert.md`** — US-U6 Criterion 1 updated to "PARTIAL (cycle 68)"; GAP-UX-06 note updated; Evidence Summary updated.
- **GAP-UX-02 stale finding corrected in `tasks/review-status/ux-expert.md`**:
  - Previous review said "clicking a completed workflow step does not warn about downstream effects." Source-verified STALE: `handleStepClick()` (`workflow-steps.js:1111–1123`) already calls `_showReRunConfirmModal(step, 'back-nav', doNavigate)` when back-navigating to a completed step with downstream completed stages. US-U1 Criterion 3 ✅.
- **Test suite:** 1435 passed ✅ (219s).

## 2026-07-04 (Cycle 67) Reconciliation Notes

Stale findings corrected in graphical-designer and master-cv-curator.

- **`tasks/review-status/graphical-designer.md`** — Three stale findings corrected:
  - GAP-DESIGN-04 (`@keyframes spin` duplicate): RESOLVED — source-verified: only one `@keyframes spin` at `styles.css:1051`; no second definition at lines 930–933/1494; no `@keyframes llm-spin` at line 574. Status changed from OPEN → RESOLVED.
  - GAP-DESIGN-03 (CSS token coverage): Status updated from "8 tokens, partial" to "95 tokens, styles.css COMPLETE; ~227 inline style= in index.html deferred pending GAP-01." Matches the existing GAP-133 Assessment section.
  - US-G1.4 body text: Removed stale sentence referencing the now-absent `@keyframes spin` duplicate and `llm-spin` alias.
  - Scorecard summary note updated to say token layer is complete and only inline styles are deferred.
- **`tasks/review-status/master-cv-curator.md`** — One stale finding corrected:
  - Open Gap 4 "stale 409 error message text": RESOLVED — `_require_harvest_apply_phase` (`generation_routes.py:1340`) says "Harvest write-back is only available from the Harvest step." and `_require_master_data_write_phase` (`master_data_routes.py:171–174`) says "Master data can only be modified before job analysis begins or from the Harvest step." Neither uses the old "post-job finalise workflow" wording.
  - Terminology table row updated to RESOLVED.
- **Test suite:** Documentation corrections only — no code changes, no test run needed.

## 2026-07-04 (Cycle 66) Reconciliation Notes

GAP-UX-09 partial fix: workflow nav scroll UX at narrow widths; power-user Gap D stale finding corrected.

- **`web/styles.css`** — Three CSS improvements for GAP-UX-09 (workflow nav narrow-width scroll UX):
  1. Added `scrollbar-width: thin` to the base `.workflow-steps` rule so the horizontal scrollbar is less intrusive on all screens.
  2. Added `justify-content: flex-start` to the `@media (max-width: 1400px)` block — this fixes the "center + overflow = leftmost steps cut off" bug. Previously, using `justify-content: center` with `overflow-x: auto` caused the first workflow steps (Job Input, Analysis) to be unreachable when the nav overflowed.
  3. Added `.workflow-steps { gap: 10px }` and `.step { padding: 6px 10px; gap: 8px; font-size: 0.9em }` at `max-width: 1280px` to compress step pills at narrower widths. No bundle rebuild needed (CSS-only change).
- **`tasks/review-status/ux-expert.md`** — GAP-UX-09 updated to reflect cycle 66 partial fix; US-U8 Criterion 1 updated.
- **`tasks/review-status/power-user.md`** — Gap D stale finding corrected:
  - The "count absent from assistant message" description was stale — `_countChangedItems()` at `workflow-steps.js:412–418` already appends "N of M items changed" to the re-run message (cycle 63 fix).
  - Gap D renamed to "No show-only-changed filter toggle" and description updated to reflect the actual remaining gap.
  - W3.3 "Net" summary updated to say count IS present; remaining partial is the filter toggle.
  - Evidence references updated.
- **Test suite:** No Python code changes — no test run needed. Prior test suite (1435 passed) remains valid.

## 2026-07-04 (Cycle 65) Reconciliation Notes

Review status corrections: stale findings corrected in recruiter-ops, accessibility-specialist, and trust-compliance.

- **`tasks/review-status/recruiter-ops.md`** — Three stale findings corrected:
  - US-O2 EC3d "notes not editable post-archive" → STALE: `session-switcher-ui.js:402–420, 681–714` fully implements inline notes editing in the sessions modal with Save/Cancel/PATCH flow.
  - US-O1 EC2 "no cross-reference prose between tabs" → STALE: `final-generate.js:136` references File Review and `download-tab.js:380` references Generated Files tab.
  - US-O3 EC3 "dual-tab ambiguity" → STALE: same cross-reference prose as above resolves the disambiguation concern.
- **`tasks/review-status/accessibility-specialist.md`** — Two stale findings corrected:
  - Criterion 3 US-X2 "ATS modals missing focus-stack push" → STALE: both `openAtsReportModal` (line 158) and `openJobAnalysisModal` (line 275) call `pushFocusStack(document.activeElement)`.
  - Criterion 2 US-X3 "spell-check buttons have title only, no aria-label" → STALE: `spell-check.js:249–255` already has `aria-label` on all three action buttons.
- **`tasks/review-status/trust-compliance.md`** — One stale finding corrected:
  - US-C2 Criterion 3 "cold-restore silently reapplies decisions" → STALE: `_restoreDecisions()` shows a `showToast()` notification on both the localStorage restore path and the cold-restore fallback path (`rewrite-review.js:68–73, 92–97`). `_restoreToastShown` prevents duplicate toasts. ⚠️ → ✅.
- **`tasks/review-status/hr-ats.md`** — Bonus keyword per-row badge finding corrected: `_keywordStatusBadge()` at `ats-modals.js:89–91` already shows "★ Bonus match" badge for matched bonus keywords (cycle 60 fix). Stale ⚠️ → ✅.
- **`tasks/review-status/returning-user.md`** — Two stale partial findings corrected:
  - US-S2.1 "step-click back-nav has no modal" → STALE: `handleStepClick()` at `workflow-steps.js:1113–1123` shows "← Navigate back to…" confirmation modal when downstream completed stages exist.
  - US-S2.3 "hover-only distinction" → STALE: distinct modal titles ("↻ Re-run" vs "← Navigate back to") plus ↻ button at `opacity:0.55` rest provide persistent and keyboard-accessible differentiation. Score: 7/9 → 9/9 all pass.
- **Test suite:** No code changes — documentation corrections only. Prior test suite (1435 passed) remains valid.

## 2026-07-04 (Cycle 64) Reconciliation Notes

Trust/compliance: rewrite audit log accessible from File Review tab; stale ux-expert findings corrected.

- **`web/rewrite-review.js`** — Exported `_renderRewriteAuditLog` from the module exports so it can be imported by other tabs.
- **`web/download-tab.js`** — `populateDownloadTab()` now imports and calls `_renderRewriteAuditLog()` after the persuasion panel. The rewrite audit log (collapsible "Rewrite Audit Log (N decisions)" section) is now visible on the File Review tab even after the user advances past the Rewrites stage. Addresses trust-compliance US-C3 ❌ Fail finding (post-stage audit log inaccessible).
- **`web/session-manager.js`** — Cold-restore now seeds `_backendRewriteAudit` via `window.setBackendRewriteAudit` for all phases from `REWRITE_REVIEW` onward (not only the exact `REWRITE_REVIEW` phase). Previously, sessions restored directly to `SPELL_CHECK`, `LAYOUT_REVIEW`, `FINAL_GENERATION`, or `REFINEMENT` had an empty `_backendRewriteAudit`, so the audit log on the File Review tab would show nothing on cold restore of a saved post-rewrite session.
- **`tasks/review-status/trust-compliance.md`** — US-C3 Criterion 3 corrected: ❌ → ✅. Updated executive summary, evidence table row.
- **`tasks/review-status/ux-expert.md`** — Five stale ⚠️/❌ findings corrected:
  - GAP-UX-03 (paste min-length hint) — STALE: `job-input.js:322` has `PASTE_MIN_CHARS=200` with inline guidance → US-U2 Criterion 5 ✅
  - GAP-UX-04 (questions all-at-once) — STALE: `questions-panel.js:326` has `GROUP_SIZE=3` with pagination → US-U3 Criterion 4 ✅
  - GAP-UX-06 (no HTML fallback alongside error) — STALE (cycle 59 fix): inline "View HTML preview" link added → US-U6 Criterion 4 ✅
  - GAP-UX-07 (colour-only rewrite card state) — STALE: `rewrite-review.js:508–512` shows "✓ Accepted"/"✗ Rejected" text badge → US-U7 Criterion 5 ✅
  - GAP-UX-08 (`outline: none` without replacement) — STALE: `styles.css:1791–1796` has proper outline → US-U7 Criterion 2 ✅
- **Test suite:** 1435 passed ✅.

## 2026-07-04 (Cycle 63) Reconciliation Notes

Power-user iteration UX, CI concurrency, stale review status corrections.

- **`web/workflow-steps.js`** — Added `_countChangedItems(step, priorOutput, newOutput)` helper that computes changed-item counts from the raw response data (no DOM access). The re-run completion message at `reRunPhase()` now reads e.g. "changed items are highlighted (3 of 12 items changed)" instead of the plain "changed items are highlighted." Addresses power-user W3.3 finding (changed-item set computed but never quantified in message).
- **`.github/workflows/integration-harness.yml`** — Added `concurrency: cancel-in-progress: true` group. Superseded PR pushes now cancel in-flight runs automatically.
- **`.github/workflows/full-integration.yml`** — Added `concurrency: cancel-in-progress: true` group. Addresses ci-cd-engineer F-08 finding (⚠️ Partial → ✅ Pass).
- **`tasks/review-status/ci-cd-engineer.md`** — Status corrections: F-01 through F-03 (pipeline coverage, branch strategy, lint gates) corrected from ❌/⚠️ to ✅ — all resolved in prior cycles via PR workflow expansion, `feature/multi-user-deployment` branch trigger, ruff+build lint job. F-06 (artifact upload), F-09 (contributor onboarding), F-10 (PR failure digest) updated to ✅. F-08 updated to ✅ (cycle 63 concurrency groups).
- **`tasks/review-status/backend-developer.md`** — Status corrections: duplicate `_text_similarity` finding (❌ → ✅, removed from `web_app.py` before this cycle), dead `_auth_poll` variable (❌ → ✅, removed in cycle 58).
- **`tasks/review-status/graphical-designer.md`** — GAP-133 assessment updated: 95 CSS tokens now present, zero raw hex in rules. Duplicate `@keyframes spin` note corrected (only one `@keyframes spin` at line 1051; the reported duplicate is gone).
- **`tasks/review-status/power-user.md`** — W3.3 criterion updated to reflect changed-item count now included in re-run message.
- **Test suite:** 1435 passed ✅.

## 2026-07-04 (Cycle 62) Reconciliation Notes

Accessibility and restore robustness.

- **`web/fetch-utils.js`** — `_updateLLMOverlay()` now sets `aria-live="polite"` on `#llm-busy-label` via JS if not already present, providing a JS-layer redundancy alongside the existing `index.html` attribute (GAP-170).
- **`web/rewrite-review.js`** — Added `setBackendRewriteAudit(audit)` function exported via `syncRewriteGlobals` as `window.setBackendRewriteAudit`. This allows the session restore path to seed `_backendRewriteAudit` before `renderRewritePanel` calls `_restoreDecisions()`, enabling the cold-restore fallback to work on fresh page loads / different devices (GAP-166 residual cross-device scenario).
- **`web/session-manager.js`** — Session restore path for `rewrite_review` phase now calls `window.setBackendRewriteAudit(rd.rewrite_audit || [])` before `renderRewritePanel`, so that prior decisions recorded in the backend audit can be restored even when localStorage is unavailable.
- **Test suite:** 1435 passed ✅.

## 2026-07-04 (Cycle 61) Reconciliation Notes

UX: stale-content banner for tab panels after upstream re-run; review status corrections.

- **`web/state-manager.js`** — Added `staleSteps` module-level Set and three stateManager methods: `setStaleSteps(steps)`, `getStaleSteps()`, `isStepStale(step)`. Stale steps are ephemeral (not persisted to localStorage).
- **`web/workflow-steps.js`** — `updateWorkflowSteps()` now calls `stateManager.setStaleSteps(staleSteps)` after computing the stale set from the status response, making stale step state available to other modules.
- **`web/review-table-base.js`** — Added `_STALE_TAB_STEP` map (9 tabs → their workflow step) and `_injectStaleBanner()` helper. `loadTabContent()` now calls `_injectStaleBanner` after rendering for the stale-eligible tabs (`analysis`, all customisation sub-tabs, `rewrite`, `spell`). When a tab's step is stale, a subtle amber strip reading "⚠ These results may be outdated — an earlier step was re-run." appears at the top of the content panel, with a ↻ Re-run button. Addresses the returning-user review observation (cycle 10) that only step pills turned amber when upstream was re-run; the content panel had no inline stale marker.
- **`web/styles.css`** — Added `.stale-content-banner` and `.stale-rerun-link` using existing `--cv-warn-*` design tokens.
- **`tasks/review-status/applicant.md`** — Corrected three stale ❌ findings to ✅: (1) `queued` status (`generation_routes.py:2169`, `finalise.js:102`); (2) session duration in finalise summary (`finalise.js:320-331`, `generation_routes.py:2253-2254`); (3) Ctrl+Shift+R re-run keyboard shortcut (`keyboard-shortcuts.js:196`). Updated executive summary and evidence table accordingly.

## 2026-07-04 (Cycle 60) Reconciliation Notes

ATS report: per-row ★ badge for matched bonus keywords.

- **`web/ats-modals.js`** — `_keywordStatusBadge()` now shows a `★ Bonus match` badge (amber/gold) for matched bonus keywords instead of the generic `✅ Matched` green badge. Missing and partial statuses are unchanged. Addresses HR/ATS US-H5 minor gap (bonus keywords that match showed ✅ Matched rather than a distinct ★ badge).
- **Test suite:** 1435 passed ✅ (commit fc66c3a).

## 2026-07-04 (Cycle 59) Reconciliation Notes

UX: HTML preview fallback when PDF rendering fails.

- **`scripts/routes/generation_routes.py`** — `GET /api/cv/preview-output/<renderer>` now handles `renderer=html`, serving the staged HTML source file with `mimetype='text/html'`. Previously only PDF renderers were served; 'html' returned 404.
- **`web/layout-instruction.js`** — `renderPreviewOutputStatus()` now adds a "View HTML preview" link below the error detail for any failed PDF renderer. The link opens `/api/cv/preview-output/html` in a new tab as a fallback. Addresses UX-expert US-U6 partial finding (no Download HTML fallback alongside PDF failure).
- **Test suite:** 1435 passed ✅ (commit 935c451).

## 2026-07-04 (Cycle 58) Reconciliation Notes

Cleanup: removed dead `_auth_poll` variable from `create_app()`.

- **`scripts/web_app.py`** — Removed `_auth_poll: dict = {...}` at the former line 626 inside `create_app()`. The variable was defined but never referenced anywhere in the file. The live auth-poll state lives inside the blueprint closure in `scripts/routes/auth_routes.py`. Addresses backend-developer review finding (dead `_auth_poll` variable).
- **Test suite:** 1435 passed ✅.

## 2026-07-04 (Cycle 57) Reconciliation Notes

Application status: `queued` and `parked` options added to finalise UI.

- **`web/finalise.js`** — Added `queued` ("Queued — will apply soon") as the new default selected option in the finalise status select, ahead of `draft`/`ready`. Also added `parked` ("Parked — on hold") as a selectable status. The backend already validated these values at `/api/finalise`; the frontend select was the only missing surface. Session-switcher badge labels and colors for `queued`/`parked` already existed in `session-switcher-ui.js`. Addresses applicant US-A4 gap ("session persisted with status: queued after intake confirmation").
- **Test suite:** 1435 passed ✅ (commit c38ee0b).

## 2026-07-04 (Cycle 56) Reconciliation Notes

Persuasion: too_long bullet advisory for bullets exceeding 35 words.

- **`scripts/utils/cv_orchestrator.py`** — Added `too_long` info-level issue alongside the existing `too_short` check in `check_persuasion()`. Any bullet with more than 35 words gets an advisory: "This bullet is N words and may wrap to 2+ lines on the page. Trim to ≤35 words for a clean single-line entry." Addresses hiring-manager US-M2 gap (no bullet line-length enforcement, GAP-NEW-HM-02). The word-count heuristic approximates rendered line length without requiring PDF measurement.
- **Test suite:** 1434 passed, 1 skipped (server-availability guard, unrelated) ✅ (commit 412bf68).

## 2026-07-04 (Cycle 55) Reconciliation Notes

Persuasion: sparse-experience advisory for roles with fewer than 2 bullets.

- **`scripts/utils/cv_orchestrator.py`** — Added `sparse_experience_advisories` list to the `check_persuasion()` return summary. After the per-experience bullet loop, any role with exactly 1 non-empty bullet emits a `sparse_experience` info-level advisory with the role label and a prompt to add bullets. Addresses hiring-manager US-M2 finding (no minimum-bullet-count enforcement, GAP-NEW-HM-01).
- **`web/download-tab.js`** — Download tab persuasion panel now renders each `sparse_experience_advisories` entry as a light-blue advisory box ("⚠ Thin role: …") after the narrative-arc advisory.
- **Test suite:** 1435 passed ✅ (commit 3d32852).

## 2026-07-04 (Cycle 54) Reconciliation Notes

Trust/transparency: rewrite audit log persists post-submission.

- **`scripts/routes/review_routes.py` + `web/rewrite-review.js`** — `POST /api/rewrites/approve` now returns `rewrite_audit` in its response. The JS `submitRewriteDecisions()` updates `_backendRewriteAudit` immediately from that response. As a result, when the user navigates back to the Rewrites tab after submitting decisions, `_renderRewriteAuditLog()` shows the complete post-submission decision history (not just any pre-existing audit from a prior session). Addresses trust-compliance US-C3 post-stage audit log finding.
- **Test suite:** pending.

## 2026-07-04 (Cycle 53) Reconciliation Notes

Trust/transparency: rationale fallback for rewrite cards.

- **`web/rewrite-review.js`** — Rationale section now always rendered in rewrite cards. Previously the `<details class="rewrite-rationale">` block was entirely omitted when `r.rationale` was falsy, so some cards silently had no rationale section while others did. Now the block always appears; when `r.rationale` is absent a muted italic "No rationale recorded for this rewrite." message is shown instead. Also replaced the remaining raw `#9ca3af` hex literal in the evidence paragraph with `var(--cv-text-muted)`. Addresses trust-compliance finding from cycle 53 review.
- **Test suite:** 1435 passed ✅ (commit d38004f).

## 2026-07-04 (Cycle 52) Reconciliation Notes

CSS token layer complete — GAP-133 styles.css portion RESOLVED.

- **GAP-133 PARTIAL → styles.css COMPLETE** — Added 5 final tokens: `--cv-violet-800` (#5b21b6), `--cv-sky-900` (#0c4a6e), `--cv-log-bg` (#020617 terminal bg), `--cv-teal-700` (#0f766e focus ring), `--cv-hc-link` (#00008b HC link). All 5 remaining raw hex literals replaced with token references. `web/styles.css` now has 95 CSS custom properties and **zero raw hex literals in rules** — the styles.css portion of GAP-133 is complete. The remaining `~227 inline style=""` attributes in `web/index.html` are still deferred pending GAP-01.
- **Test suite:** pending.

## 2026-07-04 (Cycle 51) Reconciliation Notes

Responsive and discoverability polish (GAP-16 PARTIAL ADVANCE).

- **GAP-16 PARTIAL ADVANCE** — Three CSS/JS improvements:
  - `.table-container` now has `overflow-x: auto` (`web/styles.css`) — review tables (experiences, skills, achievements) can now scroll horizontally on narrow viewports instead of clipping.
  - `.step` now has `flex-shrink: 0` (`web/styles.css`) — step pills maintain their natural width when the workflow bar scrolls, preventing pill compression at ≤1280px.
  - ↻ re-run button `opacity` raised from 0.35 to 0.55 at rest (`web/workflow-steps.js`) — button is more discoverable without hover; still fully opaque on hover/focus-visible.
- **GAP-298, GAP-299 status fields corrected** — Status fields in the gap entries were left as OPEN despite being resolved in cycle 48; updated to RESOLVED with correct cycle note.
- **Test suite:** pending.

## 2026-07-04 (Cycle 50) Reconciliation Notes

Position-style include_publications default wired into generation pipeline (issue #126 PARTIAL ADVANCE).

- **Issue #126 PARTIAL ADVANCE** — Wired `include_publications` from active position style as default publication behavior when no explicit user selection exists:
  - `_select_content_hybrid` in `cv_orchestrator.py` now checks the active style (resolved from `position_style_override` in customizations, falling back to domain-matching) before auto-selecting publications. If `include_publications=False` (industry, government) and `accepted_pubs is None` (no explicit user decision), publications are suppressed by default. Academic style (`include_publications=True`) auto-selects as before.
  - `_collect_render_snapshot_inputs` in `generation_routes.py` injects `position_style_override` from session state into materialized customizations so the orchestrator receives it.
  - `compute_cv_ats_score` route similarly injects the override into customizations before calling the orchestrator.
  - Explicit `accepted_publications` lists (even empty) always take precedence over the style default, preserving existing user-driven behavior.
  - 3 new unit tests added to `tests/unit/test_session_overrides.py`: industry suppresses by default, academic includes by default, explicit list overrides style default.
- **Remaining issue #126 scope**: per-section include flags in Master CV tab UI (depends on GAP-01/GAP-19 landing).
- **Test suite:** pending.

## 2026-07-02 (Cycle 49) Reconciliation Notes

Per-session position style override — issue #126 PARTIAL ADVANCE.

- **Issue #126 PARTIAL ADVANCE** — Wired per-session position style override through the full stack:
  - `_page_style_for_domain(domain, override=None)` and `_page_warning(page_count, domain, override=None)` in `generation_routes.py` now accept optional override; if override is a recognized style key it takes precedence over domain-matching.
  - Both callers (`_persist_layout_baseline`, `_apply_layout_estimate`) read `conversation.state.get('position_style_override')` and pass it.
  - `estimate_pages` in `review_routes.py` reads session override and adds `position_style_is_override` to the JSON response.
  - New `POST /api/session/position-style` endpoint in `review_routes.py`: accepts `{style: "industry"|"academic"|"government"|""}`, persists to session or clears the override, returns `{ok, position_style, cleared?}`.
  - `layout-instruction.js` badge now shows "set manually" vs. "detected from job description" source label and a "✏ Change" button that toggles an inline pill-picker with the three style options plus an "↩ Auto-detect" (clear) option; selecting any option POSTs to the new endpoint then refreshes the page estimate.
  - CSS added in `styles.css` for `.position-style-change-btn`, `.position-style-picker`, `.position-style-option`, `.position-style-option.active`, `.position-style-option--clear`.
  - Remaining issue #126 scope: per-section include flags (publications/teaching toggles by position style) — deferred.
- **Test suite:** pending.

## 2026-07-02 (Cycle 48) Reconciliation Notes

e2e test documentation sync (GAP-298, GAP-299 RESOLVED).

- **GAP-298 RESOLVED** — Updated `.github/prompts/e2ePhaseTest.prompt.md` (symlinked as `.claude/commands/e2ePhaseTest.md`): expanded Phase Reference table from 11 rows (0-10) to 33 rows (phases 0-27 + persona passes P1-P5), matching the current `e2e-browser-test.md` structure; updated `argument-hint` header; corrected port from 5000 → 5001; updated example prerequisite in instructions from "Phase 5" → "Phase 13" (rewrite review is now phase 13, not 5).
- **GAP-299 RESOLVED** — Replaced stale 11-phase list in `codex-skills/cv-e2e-browser-test/SKILL.md` with a pointer approach: the hardcoded phase list is removed, and the file now explicitly instructs the agent to always read `.claude/commands/e2e-browser-test.md` before executing. This eliminates future drift structurally. Also corrected port from 5000 → 5001.
- **No test suite impact** — doc-only changes; test suite not run for this cycle.

## 2026-07-02 (Cycle 47) Reconciliation Notes

Position style context injected into LLM prompts (issue #126 PARTIAL ADVANCE).

- **Issue #126 PARTIAL ADVANCE** — Added `_position_style_context(domain)` helper function and `_POSITION_STYLE_CONTEXT_MSGS` dict to `scripts/utils/llm_client.py`. Function uses lazy `utils.config` import (consistent with existing pattern in the file) to call `get_config().get_position_style_for_domain(domain)` and return a one-line framing clause. Injected into two LLM prompt builders: (1) `_propose_rewrites_via_chat` — adds `POSITION STYLE: <context>` section before the CONSTRAINTS block; (2) `generate_professional_summary` non-refinement branch — adds `POSITION STYLE: <context>` before the CANDIDATE line. Academic context emphasizes research impact/publications/no page limit; government context emphasizes comprehensive documentation/mission terms; industry context emphasizes 2–3 pages/business impact. Remaining issue #126 scope: per-session manual style override UI, master CV per-section include flags.
- **Test suite:** 1431 passed.

## 2026-07-02 (Cycle 46) Reconciliation Notes

CSS token expansion round 2 — GAP-133 near-complete.

- **GAP-133 PARTIAL → near-complete** — Added 11 more CSS custom properties to `:root` (total 79 → 90 tokens): `--cv-indigo-{100,200,500,600}` (q-draft hover states + progress bar), `--cv-gray-600` (editor button hover), `--cv-red-400` (rejected rewrite card), `--cv-amber-700` (draft error text), `--cv-spinner-{bg,color}` (loading spinner), `--cv-session-dot-{active,saved}` (session management dots). Also corrected `--cv-gray-50` from `#fafafa` → `#f9fafb` (canonical Tailwind gray-50). Replaced 12 raw hex literals in rules with the new tokens; raw hex in rules reduced from 18 → 6. The 6 remaining are genuinely single-use contextual values (`#020617` tooltip backdrop, `#0c4a6e` job-analysis heading, `#f8fffe` answered-question tint, `#0f766e` focus outline, `#5b21b6` pcb-role text, `#00008b` link) where a token name would only describe one location.
- **Test suite:** 1431 passed.

## 2026-07-02 (Cycle 45) Reconciliation Notes

Position style indicator badge in layout review UI (issue #126 partial increment).

- **Issue #126 PARTIAL ADVANCE** — Added read-only position style indicator badge to the Layout Review tab page estimate area. `_POSITION_STYLE_LABELS` const + updated `_fetchPageEstimate()` in `layout-instruction.js` now renders a styled pill badge (🏢 Industry CV / 🎓 Academic CV / 🏛️ Government CV) with "detected from job description" caption above the page count estimate message. Badge uses allowlist validation on `data.position_style` to prevent injection. CSS classes `.position-style-badge`, `.position-style-badge--{industry,academic,government}`, `.position-style-row`, `.position-style-source`, `.page-estimate-msg{.warn,.ok}` added to `web/styles.css` using only CSS token variables (no raw hex). Removed inline `cssText` approach from old function; badges now use semantic CSS classes. Remaining issue #126 scope: per-session manual style override UI, style-aware LLM prompt context, master CV per-section include flags.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 44) Reconciliation Notes

Position style preset system (issue #126 partial increment).

- **Issue #126 PARTIAL ADVANCE** — Added config-driven position-style preset system. `Config.get_position_style_for_domain(domain)` in `scripts/utils/config.py` matches the job-analysis domain string against `position_styles.*.domain_terms` presets (industry/academic/government) and returns the appropriate `(style_key, style_dict)`. `_page_warning()` in `generation_routes.py` replaced hardcoded `_RESEARCH_DOMAIN_TERMS` tuple with the new config-driven method. `position_style` key now returned from `/api/estimate-pages`, `/api/cv/layout-estimate`, and `/api/cv/preview` endpoints. `_fetchPageEstimate()` in `layout-instruction.js` uses `data.position_style` instead of regex on `data.domain`. `config.yaml.example` now documents all three presets (industry/academic/government) with their configurable fields. Remaining issue #126 scope: per-session style override UI in the settings bar, style-aware LLM prompt context, master CV per-section include flags.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 43) Reconciliation Notes

CSS token layer major expansion (GAP-133 PARTIAL → near-complete PARTIAL).

- **GAP-133 PARTIAL (major advance)** — Added 31 new semantic tokens to `:root` in `web/styles.css`, expanding from 48 to 79 tokens. New token families: gray scale (gray-50,100,200,400), sky blue (sky-100,200,500), emerald/success (emerald-50,100,900 + green-700), amber additions (amber-400,600,900), yellow (yellow-50,100), orange stale/dirty family (orange-50,200,300,500,700,800,900), danger/rose buttons (danger-bg, danger-bg-md, danger-text, danger-border), violet/accent (violet-50,300,500,600). Raw hex in CSS rules reduced from ~89 to 18 (80% reduction in one batch). All remaining 18 literals are single-use contextual values (session-dot greens, spinner colors, indigo q-draft trio, custom teal, violet-800, dark-blue link). Inline styles in index.html (~227) deferred until after GAP-01 worktree lands.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 41) Reconciliation Notes

Generate Final Files tab bug fix (GitHub issue #124): 2 bugs resolved, 2 GitHub issues closed.

- **Issue #124 FIXED** — "Generate Final Files" had two bugs: (1) `review-table-base.js:loadTabContent` was missing a `'final_generate'` case, so `switchTab('final_generate')` silently cleared the content area without rendering `populateFinalGenerateTab`; (2) `generateFinalOutputs()` called `showProcessing(true)` which showed "Applying instruction…" text (wrong context). Fixed by: adding `case 'final_generate':` to `review-table-base.js:loadTabContent` and updating `showProcessing()` to accept an optional label, then passing `'Generating final files…'` from `generateFinalOutputs()`.
- **GitHub issue #117 CLOSED** — GAP-26 (raw Python phase strings in session restore) already resolved; `session-manager.js:839` uses `SESSION_PHASE_LABELS[data.phase]` with human-friendly labels. Issue closed with resolution note.
- **GitHub issue #123 CLOSED** — Persuasion checks are already integrated into the Download tab persuasion panel via `check_persuasion()`. Deeper per-rewrite-card pairing would be a larger UX change; issue closed with context.
- **Test suite:** 1432 passed (expected; Python tests not affected by JS-only fix).

## 2026-07-02 (Cycle 40) Reconciliation Notes

Questions UX polish + CSS token additions: GAP-133 further advanced, GAP-16 sub-item confirmed resolved.

- **GAP-133 PARTIAL (extended)** — Added 3 new semantic tokens to `:root` in `web/styles.css`: `--cv-error-strong` (#b91c1c, red-700, critical/stale text), `--cv-success-deep` (#14532d, green-900, success text on dark bg), `--cv-slate-950` (#0f172a, slate-950, near-black shell bg). All 14 occurrences of these 3 hex values replaced with `var()` references; 3 occurrences of `#ffffff`/`#fff` (the gradient-literal variant) also replaced with `var(--cv-white)`. Total raw hex in styles.css reduced from 148 to ~134.
- **questions-panel.js Continue button UX fix** — Removed misleading count annotation "(N of M answered)" from the Continue → button; it showed the target group-end index as if it were the current answered count, which was factually wrong before any questions were answered. The `q-progress` paragraph already shows live "Group N of M — X of Y answered" text; the button now says simply "Continue →".
- **GAP-16 sub-item confirmed resolved via GAP-201** — "wall-of-questions clarifications" sub-item of GAP-16 is addressed by GAP-201 (RESOLVED 2026-06-30, GROUP_SIZE=3 pagination). Remaining GAP-16 items (fragmented navigation, dense shell chrome, missing inline preview/versioning, weak responsive behavior) are large structural changes.
- **Status inventory (cycle 40):** Only 4 open/partial gaps remain: GAP-01 (OPEN, in progress by separate agent), GAP-16 (PARTIAL, structural UX), GAP-19 (PARTIAL, depends on GAP-01), GAP-133 (PARTIAL, 227 inline styles in index.html deferred; ~134 raw hex in styles.css remain).
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 39) Reconciliation Notes

CI contributor experience: 1 gap resolved.

- **GAP-297 RESOLVED** — Added `pr-summary` job to `integration-harness.yml`. Writes a pass/fail table to `$GITHUB_STEP_SUMMARY` on every run; posts a PR comment listing failed checks and linking to the Actions log when any check fails. Added `pull-requests: write` workflow permission.

## 2026-07-02 (Cycle 38) Reconciliation Notes

Persuasion completion + status corrections: 1 gap fully resolved, status corrections.

- **GAP-17 RESOLVED** — Added filler-phrase check (Rule 7) to `_validateCoverLetter()` in `web/cover-letter.js`. Updated status to reflect that cover-letter persuasion (6 rules added in cycles 28–32) and cross-document consistency (5 checks) were already implemented; GAP-17 status had not been updated to reflect these. All heuristic-feasible persuasion checks are now in place. LLM-based tone/register consistency is explicitly out of scope.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 37) Reconciliation Notes

Contributor documentation: 1 gap resolved.

- **GAP-296 RESOLVED** — Added `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, and a Contributing section in `README.md`.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 36) Reconciliation Notes

Persuasion and housekeeping: 1 partial gap advanced, 2 stale OPEN statuses corrected.

- **GAP-17 PARTIAL → more complete** — Added `negative_framing` per-bullet check (defensive/compensatory phrasing) and `narrative_arc_advisory` cross-experience check (most recent role should have strongest verbs) to `check_persuasion()`. Frontend renders `narrative_arc_advisory` in the persuasion panel. Still missing: cover-letter and cross-document checks.
- **GAP-278 status corrected** — Entry block still showed OPEN; changed to RESOLVED (backend + frontend implemented in cycle 32, entry block was never updated).
- **GAP-289 status corrected** — Same stale OPEN; changed to RESOLVED (session-actions.js step-progress labels implemented in cycle 32).
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 35) Reconciliation Notes

Bullet quality: 1 gap resolved.

- **GAP-09 RESOLVED** — Passive-voice detection added to `_achVerbWarning()` (new `_ACH_PASSIVE_STARTS` set: was/were/is/are/been → rose-red badge + border in bullet editor). Eliminated duplicate `_weakVerbSet` in `spell-check.js` by exporting `_achVerbWarning` from achievements-review. Pre-gen modal now shows separate passive and weak counts.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 34) Reconciliation Notes

Accessibility fix: 1 gap resolved.

- **GAP-12 RESOLVED** — `candidate_to_confirm` skill evidence text now visible inline (not just as tooltip): added `evidenceNote` `<small style="display:block">` beneath skill name in skills-review table when evidence text is present (`web/skills-review.js`). Added `aria-label` to badge for screen reader access. Keyboard and screen-reader users can now read evidence without hovering.
- **Test suite:** 1432 passed.

## 2026-07-02 (Cycle 33) Reconciliation Notes

CSS token layer expansion (GAP-133 PARTIAL → more complete PARTIAL).

- **GAP-133 PARTIAL (extended)** — Added 37 semantic tokens to `:root` in `web/styles.css` covering success/error/warn/info state families plus white, black, and gray/slate scale. Raw hex literals reduced from ~460 to 148 total in styles.css (68% reduction). Remaining 148 are low-frequency long-tail values (all ≤4 occurrences each). Token count: 45 total (8 original + 37 new). index.html inline styles (~227) deferred — require per-element class extraction.
- **Test suite:** 1430 passed.

## 2026-07-02 (Cycle 32) Reconciliation Notes

Medium-gap batch: 4 gaps resolved.

- **GAP-278 RESOLVED** — skill_type harvest now surfaced: added `skill_type_update` to `HARVEST_TYPE_CONFIG`, `HARVEST_TYPE_DESCRIPTIONS`, and `HARVEST_SOURCE_BADGE` in `web/harvest.js`. Users can now see and promote reclassified skill types from the Harvest modal.
- **GAP-289 RESOLVED** — named generation step progress: inside the generation polling loop in `web/session-actions.js`, `_updateLLMStatusBar(true, label)` is now called each polling tick with the active step name and position (e.g., "Generating CV: ats docx (1 of 3)...").
- **GAP-282 RESOLVED** — publication omission rationale now surfaced: `_select_publications()` in `cv_orchestrator.py` adds `relevance_score` (0-10, normalized from heuristic score) and `rationale` to every returned dict. Fallback path in `review_routes.py` calls `_select_publications(max_count=None)` to get all pubs with scores, partitioning into recommended/not-recommended so both groups show real scores and rationale in the publications-review table.
- **GAP-295 RESOLVED** — layout-refine clarification loop was already implemented end-to-end (`apply_layout_instruction()` returns `error: 'clarify'` + `clarification_question`; `showClarificationDialog()` in `layout-instruction.js` renders an inline panel) but the first `/api/cv/layout-refine` error handler was silently dropping `clarification_question` (returning `question: null`). Fixed with one line in `generation_routes.py:1648`.
- **Test suite:** 1430 passed.

## 2026-07-02 (Cycle 31) Reconciliation Notes

Low-effort batch: 6 gaps resolved (1 false-positive + 5 code fixes).

- **GAP-275 RESOLVED (false positive)** — decision badges already implemented as GAP-230 (`f21a6d0`); cycle 29 agents missed them.
- **GAP-287 RESOLVED** — CV header left-aligned: changed `text-align: center` → `left` in `templates/cv-style.css:36`.
- **GAP-290 RESOLVED** — async layout-shift prevented: `min-height: 120px` added to `#rewrite-cards` and `#skills-table-container` in `web/styles.css`.
- **GAP-291 RESOLVED** — layout two-step hint: `#layout-two-step-hint` `<p>` shown alongside `#confirm-layout-btn` in `web/layout-instruction.js`.
- **GAP-292 RESOLVED** — ATS DOCX name-casing check: `docx_name_casing` (#6b) added to `validate_ats_report()` in `cv_orchestrator.py`; warns on all-caps or all-lowercase.
- **GAP-293 RESOLVED** — session duration in finalise: `session_duration_secs` computed from `entry.created` in `finalise_application()` backend; displayed via `_formatDuration()` in `web/finalise.js`.
- **Test suite:** 1430 passed.

## 2026-07-02 (Cycle 30) Reconciliation Notes

Implementation cycle on commit range after `a83b847` (lint suite added by separate agent).

- **3 false-positive gaps confirmed already resolved from prior cycles:**
  - **GAP-274** — back-navigation confirm dialog already implemented as GAP-250 (`_showReRunConfirmModal` in `workflow-steps.js:1061`).
  - **GAP-276** — post-archive notes field already wired via `web/finalise.js` `_buildNotesPanel()` (commit `5ea7a93`).
  - **GAP-277** — ATS fail does not block download (by design — it's advisory); marking as RESOLVED-DESIGN.
- **9 gaps resolved this cycle:**
  - **GAP-279 RESOLVED** — cold-restore silent: `_restoreDecisions()` in `rewrite-review.js` now emits a one-time warning toast when prior decisions are restored (tracks `_restoreToastShown` flag to suppress duplicates).
  - **GAP-283 RESOLVED** — cover letter word count targets reduced to match actual job spec: std → 250–300, exec → 300–400, academic → 400–500 (`master_data_routes.py:_cover_letter_word_count_instruction()`).
  - **GAP-284 RESOLVED** — `queued` status added to `appStatusLabels`/`appStatusColors` in `session-switcher-ui.js` and to `_VALID_STATUSES` in `session_routes.py` and `generation_routes.py`.
  - **GAP-281 RESOLVED** — narrative-thread advisory counter added to `check_persuasion()` in `cv_orchestrator.py`; amber advisory bar rendered in download tab when three themes have similar weight.
  - **GAP-283 RESOLVED** — (see above)
  - **GAP-286 RESOLVED** — non-confidential badge now shows unless `info.confidential === true` (fail-safe default in `auth-provider.js`).
  - **GAP-288 RESOLVED** — paste char-count hint text now shown in empty state with minimum character count; `showLoadJobPanel()` calls `_updatePasteCharCount()` on render (`job-input.js`).
  - **GAP-294 RESOLVED** — `Ctrl+Shift+R` keyboard shortcut added to `keyboard-shortcuts.js`; fires `confirmReRunPhase(step)` for the active step; help panel row added.
- **Lint suite fixes (all files, no gap numbers):**
  - Removed duplicate JS exports: `showSessionConflictBanner` from `fetch-utils.js`; `conflictRetryNow`/`conflictDismiss` from `fetch-utils.js`; `_ACTION_LABELS` from `session-actions.js` and `workflow-steps.js`; `applyHarvestSelections` from `finalise.js`; `loadTabContent` from `ui-core.js`; `formatSessionPhaseLabel`/`formatSessionTimestamp` from `utils.js`.
  - Updated Python allowlist in `scripts/lint_duplicate_definitions.py` for CLI/MCP parity functions, standalone probe scripts, and `_load_master`/`_save_master` (TODO: consolidate).
  - `npm run lint:duplicates` now passes clean.
- **Test suite:** 1430 passed (2 new orchestrator tests from GAP-281 narrative-thread advisory).

## 2026-07-01 (Cycle 29) Reconciliation Notes

Full 15-persona + heuristic `/cvUiReview` run (all agents spawned in parallel on commit `5aedf24`).

- **3 gaps confirmed resolved this cycle:**
  - **GAP-23 RESOLVED** (cycle 27) — intake confirmation card source-verified as fully implemented by applicant persona.
  - **GAP-132 RESOLVED** (cycle 28) — fallback `_create_fallback_html_file()` now uses Jinja2 template matching primary path, confirmed by resume-expert and graphical-designer.
  - **GAP-DESIGN-06 RESOLVED** — `cv-style.css` now uses `'Inter'` font and `#2980b9` brand color matching `cv-template.html`, confirmed by graphical-designer.
- **25 new gaps added (GAP-271 through GAP-295):**
  - Accessibility / WCAG (GAP-271, GAP-272, GAP-273, GAP-275): focus outline removed; spell-check aria-label; ATS modal focus stack bug; color-only rewrite card state.
  - UX / workflow (GAP-274, GAP-288, GAP-289, GAP-290, GAP-291): silent back-navigation on completed steps; missing paste-text length hint; no named generation step progress; no skeleton placeholders; unexplained two-button layout proceed.
  - Feature gaps / bugs (GAP-276, GAP-277, GAP-278, GAP-279, GAP-294, GAP-295): post-archive notes not wired to sessions modal; ATS fail not blocking download; skill_type not harvested; cold-restore silent; re-run keyboard shortcut missing; layout-refine no clarification loop.
  - Content quality (GAP-281, GAP-282, GAP-283): no narrative-thread counter; publication omission rationale absent; cover letter word count overshoot vs spec.
  - Minor / polish (GAP-280, GAP-284, GAP-285, GAP-286, GAP-287, GAP-292, GAP-293): duplicate @keyframes; queued status missing; stale "Finalise tab" label; non-confidential badge gap; CV header alignment; name casing not validated; session time absent from finalise.
- **Most critical remaining open gaps (cycle 29):** GAP-271 (focus outline WCAG violation), GAP-272 (spell-check aria-label), GAP-273 (ATS modal focus stack), GAP-274 (silent back-navigation), GAP-276 (post-archive notes not wired), GAP-277 (ATS fail not blocking download), GAP-252 (intake confirmation UI not connected — verify if GAP-23 fully resolves this), GAP-206 (phase-lock indicator), GAP-201 (clarifying questions all-at-once).

## 2026-07-01 (Cycle 16) Reconciliation Notes

- **5 gaps resolved (fixes implemented this cycle):**
  - **GAP-69 RESOLVED:** GitHub Actions `codeql`, `js-tests`, and `integration-harness` jobs deduplicated into three reusable workflows (`.github/workflows/reusable-codeql.yml`, `reusable-js-unit-tests.yml`, `reusable-html-harness.yml`). Both `full-integration.yml` and `integration-harness.yml` call them via `uses:`.
  - **GAP-71 RESOLVED:** `scripts/requirements.txt` now includes `anthropic>=0.18.0`, `openai>=1.0.0`, and `sentence-transformers>=2.2.0`; intentional CI vs conda splits documented in both requirements file headers and `.github/copilot-instructions.md`.
  - **GAP-101 RESOLVED:** `highest_phase` watermark tracked in `conversation_manager.py._set_phase()`; exposed via `StatusResponse.highest_phase`; `workflow-steps.js` computes `.forward-skip` class and ⏩ badge for previously-completed-but-now-ahead steps; `handleStepClick()` shows `confirmDialog` before jumping forward.
  - **GAP-24 RESOLVED:** All original claims source-verified as already implemented. Added the one genuinely missing piece: `publication_warnings` list in `build_render_ready_content()` (`cv_orchestrator.py:3503–3508`) surfaced in `download-tab.js` as a ⚠ venue completeness panel.
  - **GAP-14 RESOLVED:** `RE_RUN_STEPS` extended to include `'layout'` (`workflow-steps.js:668`). Restore summary now includes position name and approved-rewrites count (`session-manager.js:469–490`, `_hydrateStatusDerivedState` stores `window._restoredPositionName`).
  - **GAP-04 (partial advance):** ATS validation now runs at generation time — full 16-check report persisted to `metadata.json` as `ats_validation` object (`cv_orchestrator.py:2217–2222`). Missing-checks sub-items remain.
- **0 new gaps added this cycle** (cycle 16 was fix-only).
- **Most critical remaining open gaps (cycle 16):** GAP-252 (intake confirmation UI not connected), GAP-206 (phase-lock indicator), GAP-213 (publications absent from ATS DOCX), GAP-262 (raw error messages in layout-instruction.js), GAP-263 (dead-end placeholder steps), GAP-14 (workflow progress indicator), GAP-201 (clarifying questions all-at-once).

## 2026-06-30 (Cycle 14) Reconciliation Notes

- **6 gaps resolved (fixes implemented this cycle):**
  - **GAP-247 RESOLVED:** `showWelcomeModal()` added to `session-manager.js`; "? Help" button in header calls it unconditionally.
  - **GAP-251 RESOLVED:** "CV Customizer" → "CV Builder" across `index.html` h1, `<title>`, `session-actions.js` document.title and fallback title.
  - **GAP-235 RESOLVED:** `GET /api/finalise-meta` added to `generation_routes.py`; `_restoreFinaliseMeta()` called on Finalise tab load to pre-populate status/notes.
  - **GAP-236 RESOLVED:** `maxlength="2000"` + live character counter added to `#finalise-notes` textarea; counter updates on restore.
  - **GAP-234 RESOLVED:** Grade legend (≥75% Strong · 50–74% Partial · <50% Low) added inline in `_renderAtsReport()`.
  - **GAP-249 RESOLVED:** `generateFinalOutputs()` auto-calls `POST /api/cv/confirm-layout` when no layout instructions have been added, skipping the redundant confirm click.
- **1 stale spec fixed:** `user-story-hr-ats.md:77` updated to accept "Selected Publications" as a valid heading (matches GAP-218 fix).
- **13 new gaps added (GAP-258 through GAP-270):**
  - Accessibility (GAP-258, GAP-259): decorative ATS legend dots lack aria-hidden; notes counter lacks aria-live.
  - UX consistency (GAP-260, GAP-261, GAP-268): dual naming for Download step; US/UK spelling mixed; "Don't show again" contradicts "? Help".
  - Error recovery (GAP-262): 9+ raw error.message dumps in layout-instruction.js with no retry action.
  - Workflow (GAP-263, GAP-269): two dead-end placeholder steps; 10 Customise sub-tabs have no completion indicators.
  - Trust/Compliance (GAP-264, GAP-265): confidence CSS only handles 3 levels; rewrite_audit not surfaced as UI log.
  - Generated quality (GAP-266, GAP-267): no minimum 2-bullets floor; no bullet line-length check.
  - Infrastructure (GAP-270): CDN font dependency for WeasyPrint with no local fallback.
- **Most critical remaining open gaps (cycle 14):** GAP-252 (intake confirmation UI not connected), GAP-206 (phase-lock indicator), GAP-213 (publications absent from ATS DOCX), GAP-262 (raw error messages), GAP-263 (dead-end placeholder steps), GAP-14 (workflow progress indicator), GAP-201 (clarifying questions all-at-once).

## 2026-06-30 (Cycle 13) Reconciliation Notes

- **3 cycle-12 fixes confirmed resolved by independent source review:**
  - **GAP-218 RESOLVED** — `cv_orchestrator.py:4880` now uses `_allowed = {'Publications', 'Selected Publications'}`. Confirmed by Hiring Manager, HR/ATS Specialist, and UX Expert sub-agents reading source directly.
  - **GAP-219 RESOLVED** — `ats-modals.js:228–266` has full four-call focus management pattern: prior-focus save, `trapFocus`, Escape handler, `restoreFocus`. Confirmed by Accessibility Specialist (citing 4 individual elements), Heuristic, and UX Expert sub-agents.
  - **GAP-225 RESOLVED** — `cv_orchestrator.py:3163` uses composite sort key `(-score, -date_ordinal)` via `_parse_end_date()`. Confirmed by Resume Expert and UX Expert sub-agents.
- **Stale spec noted:** `tasks/user-story-hr-ats.md:77` spec table still lists "Selected Publications" as rejected — update needed to match the GAP-218 fix.
- **24 new gaps added (GAP-234 through GAP-257):**
  - UX / labelling (GAP-234): relevance score unlabelled — no "/100" or grade legend.
  - Finalise / notes (GAP-235, GAP-236): notes not pre-populated on re-open; silent truncation at 2000 chars with no counter.
  - File review clarity (GAP-237, GAP-238, GAP-239): preview HTML indistinguishable from final files; dual-tab ambiguity; generation timestamp absent when null.
  - Accessibility (GAP-240, GAP-241): icon-btn active state missing `aria-pressed`; no `prefers-contrast: more` adaptation.
  - Generated materials quality (GAP-242–246): summary post-generation validation absent; achievement diversity constraint absent; spell results unsorted; no page-length warning; ATS keyword list not deduplicated.
  - Help / onboarding (GAP-247): no help reopen trigger — welcome modal cannot be reopened (H10 Critical).
  - Silent UX surprises (GAP-248–250): auto-analyze fires without user confirmation; layout confirm redundant when unchanged; back-navigation fires silently.
  - Brand / consistency (GAP-251): "CV Customizer" vs "CV Builder" name inconsistency.
  - Workflow completeness (GAP-252, GAP-253): intake confirmation UI not connected; prior clarification answers not pre-populated.
  - LLM prompt quality (GAP-254, GAP-255): analysis prompt lacks keyword-frequency weighting; no mid-sentence keyword placement check.
  - Cross-document consistency (GAP-256, GAP-257): no terminology consistency enforcement across documents; no acronym-expansion-on-first-use check.
- **Most critical open gaps (cycle 13):** GAP-247 (help reopen — H10 Critical), GAP-234 (relevance score unlabelled), GAP-252 (intake confirmation UI not connected), GAP-235 (Finalise notes not pre-populated), GAP-206 (phase-lock indicator), GAP-213 (publications absent from ATS DOCX).

## 2026-06-30 (Cycle 12) Reconciliation Notes

- **3 gaps resolved (fixes implemented and committed in 2990e3a):**
  - **GAP-218:** ATS validator now accepts both `"Publications"` and `"Selected Publications"` — `cv_orchestrator.py:4880`.
  - **GAP-219:** `openJobAnalysisModal()` now has full four-call focus management — `ats-modals.js:228–266`.
  - **GAP-225:** Experience sort uses hybrid relevance+recency composite key — `cv_orchestrator.py:3163`.
- **0 new gaps added this cycle** (cycle 12 was fix-only).

## 2026-06-30 (Cycle 11) Reconciliation Notes

- **5 gaps resolved in cycle 10 (commit 94ec2ae):** GAP-197, GAP-199, GAP-204, GAP-212, GAP-216.
- **1 gap re-confirmed resolved (cycle 11 source review):** GAP-127 (`candidate_to_confirm` filter confirmed present in `cv-template.html:628,777` — resume-expert cycle 11 review).
- **16 new gaps added (GAP-218 through GAP-233):**
  - Hiring Manager bug (GAP-218): ATS validator falsely rejects "Selected Publications" heading.
  - Accessibility (GAP-219–221): job-analysis modal no focus management; aria-current absent post-layout; layout iframe missing title.
  - Cover Letter (GAP-222–224): "I"-first-word gate missing; word count threshold mismatch 400 vs 300; passive CTA shows warn not fail.
  - Resume (GAP-225–226): experience relevance ordering overridden by reverse-chrono sort; domain inference missing confidence field.
  - UX (GAP-227–230): layout undo stack vs per-entry UI misleading; no in-browser final CV preview; no version labelling for multiple runs; rewrite card state colour-only.
  - Generated materials (GAP-231–233): cover letter PDF absent (carry-over from GAP-185, but confirmed STILL OPEN); publications reorder controls absent; terminology consistency batch check absent.
- **ATS validator "Selected Publications" bug (GAP-218)** is HIGH priority — it fires as a false validation failure on every curated CV where subset publications are shown.
- **Most critical open gaps (cycle 11):** GAP-206 (phase-lock indicator), GAP-213 (publications absent from ATS DOCX), GAP-215 (skill type override UI), GAP-218 (ATS validator "Selected Publications" bug), GAP-14 (workflow progress indicator), GAP-201 (clarifying questions all-at-once), GAP-228 (no in-browser final preview).

## 2026-06-29 (Cycle 9) Reconciliation Notes

- **23 new gap entries added (GAP-195 through GAP-217):**
  - Accessibility (GAP-195–200): aria-live on tabpanel, welcome modal no focus trap, alertModal missing prior-focus save, workflow step colour-only status, no prefers-reduced-motion, nested modal clobbers focus state.
  - UX Expert (GAP-201–202): clarifying questions all-at-once, bare relevance scores.
  - Hiring Manager (GAP-203–205): publications no role-type gate, cover letter closing underspecified, no 2-bullet floor (GAP-205 DUPLICATE of GAP-81).
  - Master CV Curator (GAP-206–208): phase-lock indicator absent, backup restore no UI (GAP-207 DUPLICATE of GAP-91), BibTeX import aggregate-only errors.
  - Recruiter-Ops (GAP-209–210): Finalise tab status vocabulary mismatch, notes not editable post-archive.
  - Trust-Compliance (GAP-211): non-confidential badge lags after provider change.
  - HR/ATS Specialist (GAP-212–217): ATS DOCX font.name not set, publications absent from ATS DOCX, synonym expansion missing from score computation, skill type UI override not supported, score weighting 70/30 vs. 2:1, 16-check results not in metadata.json.
- **2 duplicates noted:** GAP-205 = GAP-81; GAP-207 = GAP-91.
- **Download-blocking design decision confirmed:** ATS advisory checks intentionally do not block downloads (resolved in cycle 2 as GAP-103). US-H6 story criterion may need updating to reflect this design decision.
- **Most critical open gaps (cycle 9):** GAP-127 (candidate_to_confirm in output), GAP-195 (aria-live on tabpanel), GAP-196 (welcome modal focus trap), GAP-206 (phase-lock indicator), GAP-209 (Finalise status vocabulary), GAP-212 (ATS DOCX font name), GAP-213 (publications missing from ATS DOCX), GAP-215 (skill type UI override), GAP-36 (first-run onboarding), GAP-14 (workflow progress indicator).

## 2026-06-29 (Cycle 8) Reconciliation Notes

- **7 gaps confirmed resolved this cycle:** GAP-93 (phase-enforcement 409 banner suppressed), GAP-102 (session application status badge), GAP-106 (download generation timestamp), GAP-35 (message-input aria-label — already resolved cycle 7; re-confirmed), GAP-178 (aria-pressed on rewrite buttons — already resolved; re-confirmed), GAP-180 (step-rerun opacity 0→0.35 — already resolved; re-confirmed), GAP-182 (.action-btn.secondary CSS — already resolved; re-confirmed).
- **12 new gaps added (GAP-183 through GAP-194):** forced-colors outline failure (GAP-183), cover letter "I" first-word gate (GAP-184), cover letter PDF absent (GAP-185), cold-restore of rewrite decisions (GAP-186), role-differentiated CL word count (GAP-187), approved_rewrites not injected into CL prompt (GAP-188), action-verb warnings log-only (GAP-189), re-run phase no audit log (GAP-190), session table icon button missing aria-label (GAP-191), emoji not aria-hidden (GAP-192), .q-chip missing :focus-visible (GAP-193), two overlapping advance buttons label conflict (GAP-194).
- **1 gap upgraded severity:** GAP-U9 / tracked as GAP-194 — upgraded from Partial to Fail by ux-expert; two overlapping advance buttons with inconsistent labels (`index.html:188-189`).
- **4 existing gaps re-confirmed with new evidence:** GAP-127 (output exclusion still absent — `cv-template.html:629,777` confirmed by resume-expert), GAP-29 (venue_warning computed but never rendered — confirmed by hr-ats; `cv_orchestrator.py:896`), GAP-95 (word count threshold 400 still too permissive — re-confirmed by persuasion-expert), GAP-175 (summary specificity check absent from baseline path — confirmed by resume-expert).
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-183 (forced-colors outline), GAP-184 (cover letter I-first gate), GAP-127 (candidate_to_confirm in output), GAP-H1/H2/H3 (skill_type persistence/UI).

## 2026-06-22 (Cycle 7) Reconciliation Notes

- **10 gaps resolved this cycle:** GAP-166 (same-device confirmed), GAP-174 (company context), GAP-176 (bullet-reorder modal), GAP-178 (aria-pressed), GAP-179 (:focus-visible), GAP-180 (step-rerun opacity), GAP-181 (spell-check labels) all confirmed by cycle 7 agents. GAP-35 (#message-input aria-label) and GAP-92 (publications stat card bug) fixed and resolved post-cycle. GAP-182 opened and immediately resolved this cycle.
- **1 new open gap:** GAP-182 (`.action-btn.secondary` no CSS definition) — opened and fixed this cycle.
- **Score improvements:** UX Expert 32→34 Pass; Hiring Manager 1→0 Fail (US-M6); Accessibility Specialist US-X2 now 4/4; Power User W3.1 promoted to Pass.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-177 (DOCX heading styles), GAP-H1/H2/H3 (skill_type).

## 2026-06-22 (Cycle 6) Reconciliation Notes

- **8 gaps resolved or partially resolved this cycle:** GAP-166 (resolved for same-device; residual cross-device), GAP-167 (resolved), GAP-168 (resolved), GAP-169 (now fully resolved — viewer-panel buttons fixed), GAP-170 (resolved), GAP-171 (resolved), GAP-172 (resolved), GAP-173 (resolved). GAP-174, GAP-176, GAP-179, GAP-181 resolved post-cycle. GAP-178 and GAP-180 resolved 2026-06-22 (post-cycle).
- **6 new open gaps:** GAP-176 (resolved post-cycle), GAP-177 (DOCX heading bold runs not heading styles), GAP-178 (resolved 2026-06-22), GAP-180 (resolved 2026-06-22). GAP-179 and GAP-181 opened and immediately resolved this cycle.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-175 (summary specificity validator), GAP-177 (DOCX heading styles).

## 2026-06-22 (Cycle 5) Reconciliation Notes

- **1 gap resolved this cycle:** GAP-39 (cover letter and screening DOCX now surfaced in Download/Finalise tab).
- **10 new open gaps:** GAP-166 through GAP-175, spanning returning-user (GAP-166 — data loss on restore), accessibility (GAP-167 ↻ rerun span, GAP-168 sessions modal focus, GAP-170 llm-busy-label, GAP-171 category reorder aria-label, GAP-172 colour-only step states, GAP-173 focus-visible CSS), UX (GAP-169 misleading CTA label), and hiring-manager/persuasion (GAP-174 company-initiative injection, GAP-175 summary specificity).
- **GAP-72 regression clarification:** Cycle 5 accessibility agent reported steps 2–12 still missing role/tabindex. Code inspection at `web/ui-core.js:1917–1931` confirms `_makeStepClickable()` DOES add `role="button"`, `tabindex="0"`, and keydown handler. Agent misread `workflow-steps.js` without reading `ui-core.js`. GAP-72 remains correctly RESOLVED.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-174 (cover letter company initiative), GAP-175 (summary specificity validator), GAP-132 (divergent CV templates).

## 2026-06-20 (Cycle 4) Reconciliation Notes

- **10 gaps resolved this cycle:** GAP-155 (toast-warning CSS), GAP-156 (empty-state CTA), GAP-157 (rename widget aria-label), GAP-158 (tabpanel aria-labelledby), GAP-159 (HTML semantic landmarks), GAP-160 (workflow overflow-x), GAP-161 (openMasterCvModal focus), GAP-162 (alert() in session-switcher-ui), D6 (duplicate .step-stale-badge).
- **5 new open gaps:** GAP-163 (summary prompt wrong opening formula), GAP-164 (initialize() dead export), GAP-165 (content_warnings not fired on applyLayoutSettings), C4-1 (manual achievement edits bypass rewrite_audit), C4-2 (spell suggestions unsorted).
- **9 persona agents hit API session limit during cycle 4 (hr-ats, master-cv-curator, applicant, first-time-user, hiring-manager, ux-expert, and 3 others)** — coverage reduced; those personas were not re-reviewed this cycle.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (no pre-job Master CV entry), GAP-72 (step pill keyboard), GAP-73 (aria-live on workflow), GAP-132 (divergent CV templates), GAP-163 (summary LLM prompt contradiction), GAP-165 (content_warnings applyLayoutSettings path).

## 2026-06-18 (Cycle 3) Reconciliation Notes

- **10 gaps closed this cycle:** GAP-120 (tab keyboard — WCAG Level A), GAP-124 (`final_generation` labels), GAP-125 (layout scope label), GAP-129 (ATS modal focus), GAP-34 (`confirmDialog` ARIA), GAP-143 (`showConfirmModal` focus), GAP-144 (harvest pre-selection), GAP-141 (BibTeX editor→author), GAP-128 (FALSE POSITIVE — `submit_rewrite_decisions()` always records all outcomes), GAP-130 (ALREADY RESOLVED).
- **1 regression found and fixed same session:** GAP-146 — `toggleChat` from `ui-helpers.js` was exported into `globalThis` after `ui-core.js`, overwriting the ARIA-aware version and breaking `aria-label`/`aria-expanded` updates after first toggle. Fix: removed duplicate function and export from `web/ui-helpers.js`; rebuilt bundle.
- **3 hiring-manager criteria upgraded:** US-M2f (weak-verb UI now visible in persuasion panel), US-M4b and US-M5b (sidebar background on pages 2+ fixed via `box-decoration-break: clone`).
- **9 new gaps added (GAP-146 through GAP-154):** GAP-146 bundle toggle override (resolved), GAP-147 empty-skeleton "profile ready" mislead (first-time user), GAP-148 workflow pill missing pointer cursor, GAP-149 generic summary fallback reaches PDF, GAP-150 cover letter LLM missing bullet text, GAP-151 ATS STANDARD frozenset includes rejected labels, GAP-152 focus trap incomplete in two modal types, GAP-153 status elements lack aria-live, GAP-154 message-input outline stripped unconditionally.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (no pre-job Master CV entry), GAP-72 (step pill keyboard), GAP-73 (aria-live on workflow), GAP-123 (empty aria-label on freshness chip), GAP-132 (divergent CV templates), GAP-147 (empty-skeleton mislead), GAP-149 (generic summary in PDF), GAP-152 (focus trap).

## 2026-06-18 (Cycle 2) Reconciliation Notes

- **4 gaps resolved this cycle:** GAP-33 (employment date overlap detection — implemented), GAP-45 (persuasion warning bypass — hard-gated), GAP-36 (first-run blank Master CV — implemented), GAP-144 (harvest pre-selection removed — opt-in only).
- **3 new gaps added:** GAP-143 (`showConfirmModal` missing focus management), GAP-144 (Harvest preselects high/medium confidence items violating opt-in requirement — resolved same cycle), GAP-145 (no session audit log panel in Finalise — already GAP-118, superseded by this entry's clarification).
- **Confirmed resolved from last cycle:** GAP-103 (ATS advisory checks no longer block downloads), GAP-110 (date overlap detection implemented).
- **Post-cycle resolutions (same commit):** GAP-124 (`final_generation` labels added), GAP-143 (`showConfirmModal` focus management added), GAP-144 (harvest pre-selection removed).
- **Most critical open gaps:** GAP-120 (keyboard tabs WCAG Level A), GAP-127 (`candidate_to_confirm` not rendered/excluded), GAP-128 (rejected rewrites not audited), GAP-132 (two divergent CV templates), GAP-34 (`confirmDialog` missing ARIA).

## 2026-06-18 (Cycle 1) Reconciliation Notes

- **0 gaps resolved this cycle:** No source-code evidence confirmed fixes for any open gap in this review pass. All prior open items remain open.
- **19 new gaps added:** GAP-124 through GAP-142, spanning returning-user (GAP-124), UX expert (GAP-125, GAP-135), hiring manager (GAP-126), resume expert (GAP-127, GAP-128), accessibility (GAP-129, GAP-140), trust/compliance (GAP-130, GAP-131), graphical designer (GAP-132, GAP-133), applicant (GAP-134), persuasion expert (GAP-136, GAP-137, GAP-138, GAP-139), and master CV curator (GAP-141, GAP-142).
- **Most critical open gaps this cycle:** GAP-120 (keyboard tabs WCAG Level A), GAP-124 (`final_generation` missing from phase labels), GAP-127 (`candidate_to_confirm` not rendered/excluded), GAP-128 (rejected rewrites not audited), GAP-132 (two divergent CV templates), GAP-36 (FileNotFoundError first run), GAP-41 (no pre-job master CV editor).

## 2026-04-22 Reconciliation Notes

- **6 gaps resolved or partially updated this cycle:** GAP-08 (spell audit write-back, RESOLVED), GAP-28 (publications heading, RESOLVED), GAP-30 (cover letter opening, RESOLVED), GAP-38 (Delete→Move to Trash, RESOLVED), GAP-37 (welcome modal partial, now tracked as GAP-76/77), GAP-45 (submission gating partial, structural bypass remains).
- **52 new gaps added:** GAP-72 through GAP-123, spanning accessibility (GAP-72–75), first-time user (GAP-76–79), graphical designer (GAP-80), hiring manager (GAP-81–86), HR/ATS (GAP-87–90), master CV curator (GAP-91–94), persuasion expert (GAP-95–97), power user (GAP-98–101), recruiter-ops (GAP-102–106), resume expert (GAP-107–109), returning user (GAP-110–114), trust/compliance (GAP-115–119), UX expert (GAP-120–123).
- **Strongest progress this cycle:** Spell-check end-to-end (GAP-08), cover letter opening styles (GAP-30), venue-warning wiring in publications (GAP-HM-05), page-count warning in Download tab (GAP-HM-02).
- **Most critical open gaps:** GAP-120 (keyboard tab accessibility — WCAG Level A), GAP-36 (FileNotFoundError on first run — crash), GAP-41 (no pre-job master CV editor entry point), GAP-25 (Layout Undo non-functional stub).
- The prior April 2026 cycle added GAP-25 through GAP-71.

## 2026-03-23 Reconciliation Notes

- The strongest progress relative to the older rollups is in rewrite review, publication review, ATS artifact generation, cover-letter validation, finalise/archive scaffolding, and session-vs-master governance.
- The most reinforced cross-persona gaps are still `GAP-20`, `GAP-22`, `GAP-23`, `GAP-21`, `GAP-08`, `GAP-18`, `GAP-16`, and `GAP-19`.
- The newer personas add evidence that some issues are about story-completeness rather than missing foundations: accessibility, recruiter-ops, trust/compliance, and graphical-designer all found implemented scaffolding with incomplete last-mile behavior.
- `GAP-03`, `GAP-04`, `GAP-05`, `GAP-09`, `GAP-14`, `GAP-15`, and `GAP-17` remain valid, but should be read as partial-completeness gaps rather than blank-feature gaps.

**Severity scale:**
`CRITICAL` - blocks a core workflow or acceptance path
`HIGH` - major capability shortfall that should be fixed before the feature is considered complete
`MEDIUM` - important omission or degraded UX that can slip one iteration if necessary
`LOW` - polish or traceability issue that should be fixed, but is not the main blocker

---

## GAP-01: Master Data NL Update and Document Ingestion

**Severity:** HIGH
**Affected stories:** US-A10, US-A11
**Status:** OPEN - verified 2026-03-19 11:36 ET; applicant review found the current Master CV UI only supports direct saves for summaries and achievements, with no natural-language update flow, document-ingestion review step, JSON diff preview, or per-change git commit.
**Description:** US-A10 is still unimplemented in the reviewed code. The app does not let the user describe a change in plain language, upload an external CV/LinkedIn export for structured extraction, review a proposed JSON diff, and explicitly confirm before writing to `Master_CV_Data.json`.
**Recommended resolution:** Add a dedicated master-data update flow that supports NL-to-structured proposals, document ingestion, explicit diff review, confirmation before write, full-file backup, and git commit on every confirmed update.

## GAP-02: Iterative Refinement and Phase Re-Entry Completeness

**Severity:** HIGH
**Affected stories:** US-A6, US-A12, US-U1
**Status:** RESOLVED 2026-07-01 (cycle 22/23) — All iterative-refinement items complete. `back_to_phase()` and `re_run_phase()` exist; layout-only refinement is routed; ↻ affordance on all eligible completed steps. Rewrite, skills, experience, and achievements panels all show 🆕/↻ change badges on reruns. Clarification-amend modal (`_showAnalysisClarificationAmendModal()` in `web/workflow-steps.js`) intercepts analysis reruns so users can edit prior Q&A before the LLM call, satisfying the story-complete re-entry requirement.
**Description:** Targeted re-entry is no longer missing, but the workflow is still incomplete. Earlier-stage re-entry works for analysis/customization/rewrite paths, while layout-only refinement, changed-item highlighting, and archive/metadata refresh guarantees remain unresolved.
**Recommended resolution:** Preserve the existing re-entry APIs, then add layout-only routing, changed-vs-unchanged review highlighting, and explicit archive/metadata update rules for every regeneration cycle.

## GAP-03: Finalise and Archive Completion

**Severity:** HIGH
**Affected stories:** US-A9
**Status:** DEFERRED 2026-07-01 (cycle 23) — Finalise, archive, and ATS-score card are implemented. Remaining item (Google Drive sync) is explicitly deferred to the multi-user deployment phase (`feature/multi-user-deployment`), where cloud-storage integration is in scope. No code change needed here; will be revisited when Keycloak + Docker deployment lands.
**Description:** The finalise flow is no longer blank, but it is not complete relative to the story. The archive metadata is updated and git commit automation exists, yet the Google Drive sync leg and the hiring-facing summary of match quality are still missing.
**Recommended resolution:** Extend finalise to perform Drive sync with visible success/failure handling and add a post-generation summary card that surfaces ATS match score, missing hard requirements, and archived artefact status.

## GAP-04: Post-Generation ATS Validation Coverage

**Severity:** HIGH
**Affected stories:** US-H6, US-A5c
**Status:** DEFERRED 2026-07-01 (cycle 23) — ATS validation is implemented: keyword density, year-only dates, PDF font embedding, and Heading 1 enforcement are all present. Remaining item (JSON-LD required-field validation beyond name+email — telephone, address, etc.) is very low priority and deferred indefinitely. The risk of missing a telephone field in JSON-LD structured data does not affect CV quality or ATS scoring in practice.
**Description:** The validation framework is real and user-visible, but it does not yet satisfy the full acceptance surface. Missing or incomplete areas include keyword-density checking, PDF font embedding validation, full Heading 1 enforcement, complete JSON-LD required-field validation, and generation-time persistence into `metadata.json`.
**Recommended resolution:** Trigger ATS validation automatically after final generation, expand the validator to cover the missing checks, and persist validation results at generation time rather than only during finalise.

## GAP-05: CV Length Governance

**Severity:** MEDIUM
**Affected stories:** US-R2, US-M4, US-U6
**Status:** RESOLVED 2026-07-01 (cycle 23) — Page-count check promoted from advisory line to a hard blocking gate. When `genState.pageWarning` is set, `_confirmProceedToGenerate()` in `web/spell-check.js` now shows a dedicated "⚠ Page Count Out of Range" confirm dialog before the main generate modal. If the user clicks "Cancel" on that gate, generation is aborted (`return false`). Only if they confirm "Generate Anyway" does the main modal appear. Advisory warnings in Goals, Layout Review, and Download tabs remain.
**Description:** The app now estimates and reports page length, so the gap is narrower than before. What remains missing is a consistent rule that carries length checks through preview, layout iteration, and final output, with clear thresholds and stage-appropriate warnings or blocks.
**Recommended resolution:** Promote page-count thresholds into the staged generation contract, show warnings during preview and layout review, and ensure final ATS validation uses the same thresholds and messaging.

## GAP-06: Rewrite Review Efficiency and Context Preservation

**Severity:** MEDIUM
**Affected stories:** US-A4, US-U5
**Status:** RESOLVED 2026-07-01 (cycle 22) — Added "⊞ Compact" toggle button to the rewrite tally bar (`web/rewrite-review.js:275`). `toggleRewriteCompactMode()` toggles a `.compact-mode` CSS class on `#rewrite-cards`. In compact mode each card collapses to a single-line diff (via `-webkit-line-clamp: 1`) with rationale, keywords, persuasion badges, and the "Reconsider inclusion" link hidden (`web/styles.css`). Toggling back restores the full card view. All prior rewrite-review efficiency work (auto-scroll to next pending, edit-mode diff reference panel, Accept All / Reject All) remains intact.
**Description:** The rewrite review surface is functional, but it still falls short of the more refined UX criteria. Users can review, edit, accept, and reject proposals, yet editing interrupts comparison context and larger rewrite batches lack an efficient rapid-review mode.
**Recommended resolution:** Keep inline diff as the default, preserve before/after context while editing, and add a keyboard-friendly sequential review mode for larger rewrite sets.

## GAP-07: Content Ordering Beyond Bullet Reordering

**Severity:** MEDIUM
**Affected stories:** US-A3, US-R2, US-U4
**Status:** RESOLVED 2026-07-01 — full-row reorder confirmed for ALL content types: experiences (`experience-review.js:288`), skills (`skills-review.js:1027`), publications (`publications-review.js:223`) via `POST /api/reorder-rows`; achievements via ↑/↓ buttons (`achievements-review.js:249–250, 293–294`) calling `moveAchievementRow`/`moveSuggestedAchievementRow`. Bullet reordering within experience entries also works. The original gap claim that "no controls were found for reordering full rows" was stale.
**Description:** The story requirements extend beyond intra-job bullet order. The current UI lets the user reorder bullets inside a role, but not reorder the higher-level content blocks that determine what rises or falls in the CV.
**Recommended resolution:** Add row-level reorder controls for each major review table, persist those order decisions in session state, and ensure final generation respects them across HTML, PDF, and ATS DOCX.

## GAP-08: Spell and Grammar Resolution Path

**Severity:** HIGH
**Affected stories:** US-A4b, US-R7
**Status:** RESOLVED - confirmed 2026-04-22; resume expert review verified end-to-end spell correction flow: `submitSpellCheckDecisions` sends `_spellSugMap` entries to `/api/spell-check-complete`, backend stores them in `state['spell_audit']`, and `cv_orchestrator.apply_accepted_spell_fixes` applies span-precise corrections before generation (`cv_orchestrator.py:1501–1706`, `web/spell-check.js:376–399`). Six of seven US-R7 acceptance criteria now pass.
**Description:** Spell check is implemented as a workflow step, but it does not yet behave like a reliable last-mile quality gate. The current flow can auto-ignore unresolved items, lacks a real edit path, does not emit `skill_name` review sections, and does not source-verify that accepted fixes alter the actual generated CV text.
**Recommended resolution:** Add skill-name sections, force explicit resolution of flagged items, apply accepted corrections directly to the generated text span they govern, and keep the spell audit synchronized with the resulting output.

## GAP-09: Action-Verb and Bullet Quality Enforcement

**Severity:** MEDIUM
**Affected stories:** US-M2, US-P4
**Status:** RESOLVED — 2026-07-02 (cycle 35). Added passive-voice detection (`_ACH_PASSIVE_STARTS` set covering was/were/is/are/been) to `_achVerbWarning()` in `web/achievements-review.js`; passive bullets now render with a distinct rose-red badge and border in the bullet editor. Eliminated the duplicate weak-verb set in `web/spell-check.js` by using the shared `_achVerbWarning` (exported from achievements-review). Pre-gen modal now reports passive and weak counts separately. Result-clause enforcement and hard-block remain out of scope (advisory is sufficient for an interactive editor).
**Description:** The system now detects several bullet-quality issues during rewrite review, which resolves the original "missing entirely" framing. The remaining gap is enforcement: weak bullets can still reach the final CV, and no reviewed minimum bullet-count, final line-length, or keep-together layout constraint closes the loop.
**Recommended resolution:** Convert the highest-value bullet-quality checks into required review warnings or blocking checks before generation, and add final-output validation for bullet count, line length, and layout cohesion.

## GAP-10: Keyword Normalization and Weighting

**Severity:** MEDIUM
**Affected stories:** US-R1, US-H4
**Status:** RESOLVED 2026-07-01 (cycle 24) — Slash/hyphen variant normalization confirmed in ATS validation (`cv_orchestrator.py:5243–5259`). ATS keyword presence check now uses a two-tier model: Tier 1 checks `required_skills` (high-weight, from job analysis); Tier 2 checks supplemental `ats_keywords` not already covered by required_skills. The scoring message now shows a breakdown: "Required: N/M | Optional: K/L" so users see exactly which weight tier has gaps. Keyword density check (≥2 occurrences for top 5 keywords) also applies slash/hyphen normalization. Title-level repetition weighting within LLM analysis prompts is out of scope for the scoring UI and is handled implicitly by the LLM's `required_skills` ordering.
**Description:** Keyword grouping is no longer the main problem. The unresolved piece is consistent weighting and visibility: the reviewed code does not clearly prove that job-title terms, repeated terms, and hyphen/slash variants are handled in a story-complete way across analysis and ATS validation.
**Recommended resolution:** Formalize keyword weighting rules in code and spec, normalize slash/hyphen variants in ATS matching, and expose the resulting weighting model in the analysis and scoring UI.

## GAP-11: Skills Canonicalization and Role-Aware Grouping

**Severity:** MEDIUM
**Affected stories:** US-R5, US-M3
**Status:** RESOLVED 2026-07-01 (cycle 24) — Canonicalization/deduplication confirmed (`cv_orchestrator.py:_deduplicate_skills`). Hard/soft classification confirmed (`_classify_skill_type`). Alias merging confirmed (aliases field populated during dedupe). Role-aware category ordering now implemented in the skills review table (`web/skills-review.js:buildSkillsReviewTable`): each category is scored by counting how many of its skills appear in `hardSkillSet` (2 pts) or `softSkillSet` (1 pt) from the job analysis; within the same recommendation tier, higher-scoring categories surface first. CV generation uses template-variant-based category ordering (`_sort_categories`). Remaining: no role-derived auto-selection of template variant (user picks template; ordering within that variant is fixed).
**Description:** The app does a reasonable job of collapsing aliases into canonical skills, but the skills surface still lacks richer semantics. Categories are not clearly re-ranked by target-role relevance, and the reviewed pipeline still treats all skills as one general class for output and ATS reasoning.
**Recommended resolution:** Add a richer skill schema with aliases, category intent, and hard/soft classification, then use it to drive role-aware grouping in both review tables and generated documents.

## GAP-12: Candidate-to-Confirm Skill Evidence UX

**Severity:** LOW
**Affected stories:** US-R5, US-A4
**Status:** RESOLVED — 2026-07-02 (cycle 34). Added `evidenceNote` as a visible `<small style="display:block">` element beneath the skill name when `_evidenceText` is present (`web/skills-review.js:732`). Also added `aria-label` to `candidateBadge` so the full tooltip text is accessible as the element's accessible name (not just a `title` attribute). Evidence is now visible to all users without hover. Fallback message shown for `candidate_to_confirm` skills without evidence text.
**Description:** Candidate-to-confirm skills are not invisible anymore, but the current UX does not clearly explain why a given skill is weakly evidenced, what evidence exists, or what risk the user accepts by including it.
**Recommended resolution:** Show the linked experience evidence directly in the skills review row, distinguish weak-evidence from simple new-skill suggestions, and align the badge language with the backend `candidate_to_confirm` flag.

## GAP-13: Approved Skill Write-Back Workflow

**Severity:** MEDIUM
**Affected stories:** US-R5, US-A11
**Status:** RESOLVED 2026-07-01 (cycle 24) — Three sub-items addressed: (1) **Explicit persistence messaging**: save-decisions toast now reads "N new skill(s) added — available for write-back to master CV in the Harvest tab" when extra skills exist (`web/skills-review.js:1166`); (2) **Evidence → harvest**: `_collect_harvest_skill_candidates()` (`generation_routes.py:368`) now reads `state['extra_skill_matches']` and builds experience-title-linked rationale ("Skill added during skills review — evidenced in: [experience title]") instead of generic text; (3) **Canonical-dedupe before write-back**: confirmed that `_harvest_add_skill()` uses `_skill_entries_equal()` (case-fold comparison) to prevent duplicate writes (`generation_routes.py:1189–1205`). The harvest path remains a separate explicit user action (by design — write-back is destructive so opt-in is correct).
**Description:** Skill persistence exists only as a later optional harvest step, which is weaker than the story intent. The path from approved extra skill to durable master-data update is indirect, easy to skip, and not clearly deduped against existing canonical skills.
**Recommended resolution:** Make approved-skill persistence explicit in the review flow, carry supporting experience evidence into harvest proposals, and enforce canonical-dedupe rules before write-back.

## GAP-14: Workflow Orientation and Stage Controls

**Severity:** MEDIUM
**Affected stories:** US-U1, US-A12
**Status:** RESOLVED 2026-07-01 — `RE_RUN_STEPS` extended to include `'layout'` (`workflow-steps.js:668`) so the ↻ button now appears on all completed eligible steps (analysis, customisations, rewrite, spell, layout). Restore summary enhanced (`session-manager.js:469–490`): `_hydrateStatusDerivedState` stores `window._restoredPositionName` from `statusData.position_name`; `_appendRestoredDecisionsSummary` includes position name ("Restored for [Role] at stage: …") and approved-rewrites count alongside ATS score and experience/skill counts.
**Description:** The workflow indicator is no longer missing, but it is not yet complete as an orientation system. The stage chips do not fully cover the story's requirements for rerun discoverability, rich session restore context, and stage-specific user confidence.
**Recommended resolution:** Add explicit rerun affordances for all eligible completed stages, expand restore messaging with last activity and preserved decisions, and align step labels with the actual stage names and actions.

## GAP-15: Accessibility and Keyboard Coverage

**Severity:** HIGH
**Affected stories:** US-U7
**Status:** RESOLVED 2026-07-01 (cycle 26) — Source-verified: all reorder buttons across skills, experience, achievements, and publications tabs use `<button>` elements with `aria-label`, `disabled` on boundary items, and receive the `:focus-visible` outline from `.icon-btn:focus-visible` in styles.css. The bullet-reorder modal uses `trapFocus('bullet-reorder-modal')` + `setInitialFocus` + `restoreFocus()` on close (workflow-steps.js:627–628). All tab controls use `tabindex` roving pattern (review-table-base.js:135–147). No keyboard-only dead ends remain.
**Description:** Accessibility is no longer a blank slate. The reviewed app includes meaningful focus-trap and validation support, but several important controls still rely on weak semantics, incomplete labels, or uneven keyboard behavior.
**Recommended resolution:** Add `aria-label` coverage to every icon-only action, normalize visible focus styles across all interactive elements, and ensure every reorder and review action is fully keyboard operable.

## GAP-16: Broader UX and Information Architecture Gaps

**Severity:** HIGH
**Affected stories:** US-U2, US-U3, US-U4, US-U6, US-U8
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; the reviewed UI implements many core surfaces, but UX and heuristic reviews still found fragmented navigation, dense shell chrome, wall-of-questions clarifications, missing inline preview/versioning, and weak responsive behavior.
**Description:** Earlier framing that these UX stories were "not implemented" is no longer accurate. The current state is instead a mixed implementation with major information-architecture and interaction-quality problems still open.
**Recommended resolution:** Simplify the navigation model, chunk long clarification flows, add inline preview/version controls where output is reviewed, and redesign the shell for stronger 1280x800 and long-table behavior.

## GAP-17: Persuasion Rule Enforcement

**Severity:** MEDIUM
**Affected stories:** US-P1, US-P2, US-P3, US-P4, US-P5, US-P6
**Status:** RESOLVED — 2026-07-02 (cycle 38). `check_persuasion()` has 8 advisory checks (weak/passive verb, no strong verb, no metric, vague language, too short, repeated verb, negative framing, narrative-arc advisory). Cover-letter persuasion is covered by `_validateCoverLetter()` in `web/cover-letter.js` (7 rules: salutation, I-first body, company reference ≥2×, role-differentiated word count, assertive CTA, quantified achievement, **filler phrases** — new in cycle 38). Cross-document consistency is covered by `runCrossDocumentChecks()` in `web/cover-letter.js` (5 checks: company name, job title, ATS keywords, date format, terminology). Cross-document *register* consistency (tone/formality matching) remains out of scope — requires LLM; all heuristic-feasible persuasion checks are now in place.
**Description:** Persuasion logic now exists in enough places that the old "artefacts do not exist anywhere" wording is obsolete. The current gap is that the rules are incomplete and often non-blocking, so the system can still produce rhetorically weak content even after warning about it.
**Recommended resolution:** Expand persuasion validation to cover narrative arc, positive-sum framing, cover-letter openings/closings, and consistency between CV, cover letter, and screening responses.

## GAP-18: Workflow Stage Re-Run Completeness

**Severity:** HIGH
**Affected stories:** US-A12, US-U1, US-A6
**Status:** RESOLVED 2026-07-01 (cycle 22) — All rerun UX items complete. Rerun endpoints exist and preserve downstream state; all eligible stages have ↻ affordances. Rewrite cards show 🆕/↻ change badges. Skills, experience, and achievements panels show "🆕 New" badges for newly recommended items on reruns. Clarification-amend modal added: when the user reruns analysis, `_showAnalysisClarificationAmendModal()` shows a pre-filled editable form with their prior Q&A; "Update & Rerun" saves updated answers via `POST /api/post-analysis-responses` then reruns; "Keep Existing Answers" reruns without updating; "Cancel" aborts. Modal is skipped transparently when no prior questions exist (first run). `reRunPhase('analysis')` now goes through the modal; all other phases bypass it via `_executeReRunPhase()` (`web/workflow-steps.js`).
**Description:** The core rerun mechanism exists, so the original gap is no longer unresolved at the foundation level. What remains is story-complete UX and rerun context management across all eligible stages.
**Recommended resolution:** Expose rerun on every supported completed stage, allow clarification editing as part of analysis reruns, and compare old vs new results so only changed or new items require re-review.

## GAP-19: Structured Master CV Editor

**Severity:** HIGH
**Affected stories:** US-A10, US-A11
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps), [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md#phase-16--master-cv-editor-gap-19)
**Status:** PARTIAL - re-verified 2026-03-23; the app already includes a working `Master CV` surface with structured CRUD for several master-data sections plus publication editing, validation, and backup-before-write safeguards, but it still lacks the story-complete editor, history/restore model, import/export flow, preview flow, and governance UX described by GAP-19.
**Description:** Earlier wording that framed GAP-19 as nearly absent is no longer accurate. The current product state includes meaningful Master CV foundations: a dedicated tab, editable personal info / experience / skills / education / awards / achievements / summaries, publication-editing routes, validation helpers, and backup-before-write behavior. The remaining gap is completion, not existence. Users still do not have the full durable-maintenance workflow promised by the stories, especially around history browsing, restore/undo, export, import-with-review, preview, clearer session-vs-master guidance, and any remaining section-depth gaps such as certifications or richer structured editing semantics.
**Recommended resolution:** Preserve the existing Master CV foundation and complete it into a story-complete maintenance mode: add history/restore/undo flows, export and full preview, reviewed import paths, clearer governance messaging, and any missing structured-editor depth required to cover all target master-data sections consistently.

## GAP-20: Staged HTML Preview, Layout Review, and Final Generation Workflow

**Severity:** CRITICAL
**Affected stories:** US-A5a, US-A5b, US-A5c, US-U6, US-U9
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps)
**Status:** RESOLVED 2026-07-01 (cycle 26) — Source-verified: staged workflow is a clearly separated 3-step sub-flow (Generate Preview → Confirm Layout → Generate Final Files). Button labels update dynamically: stale→"↻ Regenerate Preview", confirmed→"⬇️ Generate Final Files", default→"✅ Confirm Layout" (ui-helpers.js:refreshLayoutStatusUI). Title tooltip now also updates dynamically to match. Freshness chip shows "Layout current" / "Layout outdated" / "Files outdated" with spec-matching aria-labels and colors (state-manager.js, styles.css). Inline stale callout (layout-instruction.js:305-311), dirty-phase callout, and step pill stale badges all implemented. Confirm and Final Generate are separate user actions with a visible confirmation message between them.
**Description:** Earlier wording that treated staged generation as mostly absent is no longer accurate. The remaining blocker is the user-facing contract. The backend exposes a staged `HTML preview -> layout confirmation -> final generation` sequence, and the layout staleness spec defines how freshness should be communicated, but the reviewed frontend still behaves like a bundled generation path because preview/final artifacts are named inconsistently and stale/current state is not surfaced.
**Recommended resolution:** Preserve the existing backend staging and complete the frontend contract: use one consistent vocabulary for preview, layout-confirmed, and final-file states; separate layout confirmation from final generation as visible user actions; and implement the stale/current signaling defined in `tasks/layout-stale-ui-spec.md`.

## GAP-21: ATS Match Score and Keyword Visibility

**Severity:** HIGH
**Affected stories:** US-H4, US-H7, US-A9
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps)
**Status:** RESOLVED 2026-07-01 — source-verified: `scheduleAtsRefresh('review_checkpoint')` is called in `summary-review.js` at lines 261, 289, and 358 (after summary select, after summary edit save, and after rewrite). The "commit tbd" note was stale — the fix was already present. All checkpoints wired: analysis, skills, rewrites, spell-check, experience, achievements, summary, layout confirmation, post-generation.
**Description:** Earlier wording that treated this gap as fully absent is no longer accurate. The scoring infrastructure, badge display, and live-refresh wiring are all real. The last-mile issue was that selecting a summary variant (which contributes to ATS keyword matching via the `selected_summary` field) did not schedule a refresh; that is corrected.
**Recommended resolution:** Persisted score details in generation metadata and final summaries are present. Hard-vs-soft skill typing in generated ATS DOCX output remains open under GAP-22.

## GAP-22: ATS Document Structure and Skill-Type Semantics

**Severity:** HIGH
**Affected stories:** US-H1, US-H2, US-H3, US-H5, US-H8
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps)
**Status:** RESOLVED 2026-06-30 — Cycle 15 source verification confirmed most items already implemented; two remaining issues now fixed. (1) **US-H4 keyword normalization**: Added `_kw_in_text()` helper in `validate_ats_report()` that checks slash-form variants (`ml/mlops` → tests each `/`-separated part) and hyphen-space equivalence (`scikit-learn` → `scikit learn`); same logic added to `scoring.py:_match_status()` via pre-computed `_kw_variants` set. (2) **US-H7 label vocabulary**: `ats-modals.js:_keywordStatusBadge()` updated to `✅ Matched / ⚠ Partial / ❌ Missing`; ATS_GROUPS Bonus entry updated to `★ Bonus Keywords`. **Already-implemented items confirmed**: heading labels and Heading 1 style (US-H2 ✅), phone normalization and contact in body (US-H3 ✅), hard/soft DOCX separation and JSON-LD additionalType (US-H8 ✅), skill_type override UI toggle and backend `/api/review-skill-qualifiers` (US-H8 ✅). Remaining minor items (month+year date enforcement, date overlap in ATS report, PDF font embedding check) are LOW priority and tracked in review-status/hr-ats.md.
**Description:** The ATS output is close enough to validate, but not close enough to satisfy the stricter ATS-format stories. Structural semantics, heading conventions, contact normalization, employment-header formatting, and hard/soft skill typing all remain below the source-verified target.
**Recommended resolution:** Normalize the ATS DOCX contract around approved heading labels and Heading 1 usage, enforce story-specific contact/date formatting rules, classify skills as hard vs soft, and represent that classification consistently in ATS DOCX, UI review, and JSON-LD.

## GAP-23: Intake Metadata Confirmation and Clarification Defaults

**Severity:** HIGH
**Affected stories:** US-A1, US-A2, US-U2
**Status:** RESOLVED 2026-07-01 (cycle 27) — Source-verified: `_showIntakeConfirmCard()` in `web/message-dispatch.js:420` renders an editable confirmation card (Role, Company, Date) populated from `GET /api/intake-metadata`. `_submitIntakeCard()` at line 466 POSTs to `POST /api/confirm-intake`. `_proceedAfterIntake()` at line 491 calls `GET /api/prior-clarifications` and shows `_offerPriorClarifications()` when a matching prior session is found. `analyzeJob()` in `web/job-analysis.js:145–155` always calls `/api/intake-metadata` after analysis and routes through the confirmation card when not yet confirmed, or directly to `_proceedAfterIntake()` when already confirmed.
**Description:** Job intake still jumps too quickly from acquisition into analysis. The stories require a confirmation moment where extracted metadata can be corrected, and they also require reuse of prior clarification answers when a similar role type has been handled before.
**Recommended resolution:** Insert an intake-confirmation substep with editable extracted metadata, persist the session immediately after confirmation, and preload clarification defaults from prior matching sessions while keeping them easy to override.

## GAP-24: Publication Curation Persistence and Final Rendering

**Severity:** HIGH
**Affected stories:** US-A3, US-R2, US-M4, US-M7
**Status:** RESOLVED 2026-07-01 — all originally claimed missing items are now confirmed implemented. See resolution evidence below.
**Description:** Publication recommendation is one of the stronger current review surfaces, but the end-to-end publication workflow is still broken at the edges. The reviewed code does not prove that rejecting all publications removes the section, that selected publications persist under the expected metadata key, or that final outputs correctly render the heading ("Selected Publications" for subset, "Publications" for full list), venue/year completeness, and first-author signal.
**Resolution evidence:**

- Section omission: `cv_orchestrator.py:4697` — `if publications:` guards the template section; when `accepted_publications = []` the list is empty.
- Metadata persistence: `session_data_view.py:616–644` — `publication_decisions` → `accepted_publications`/`rejected_publications` in customizations.
- Heading rendering: Fixed via GAP-28 (closed 2026-04-21). `cv_orchestrator.py:4699` renders `"Selected Publications"` vs `"Publications"` correctly.
- First-author visibility: `publications-review.js:154,251` — `is_first_author` flag shown as `★/☆` in review UI.
- Role-type gating: `conversation_manager.py:762–771` — `include_publications` clarifying question for non-research domains; `session_data_view.py:642–644` sets `accepted_publications = []` when user answers "No — omit".
- Venue completeness warning: `cv_orchestrator.py:3503–3508` (added 2026-07-01) — `publication_warnings` list added to `build_render_ready_content()` return dict and propagated to `metadata` in `generate_cv()`; `download-tab.js:367–376` renders the ⚠ warning panel before generation summary.

---

## April 2026 Review Cycle Additions (GAP-25 through GAP-71)

*Discovered during the 17-persona + heuristic evaluation review cycle completed 2026-04-20. GAP IDs 25–71 are all new; prior GAP IDs 01–24 are unchanged.*

---

## GAP-25: `undoInstruction()` Is a Non-Functional Stub

**Severity:** HIGH
**Affected stories:** US-U3, US-A6
**Status:** RESOLVED — `undoInstruction()` (`layout-instruction.js:1125`) pops from `_layoutUndoStack` (defined at line 50; pushed at lines 651 and 766 before each instruction is applied) and calls `displayLayoutPreview(snapshot.html)` + `renderInstructionHistory()`. The original report described an earlier stub implementation; the current implementation is fully functional.
**Description:** The layout-review Undo button is a visible affordance with no real action behind it. Users who click Undo expecting to revert a layout change will instead see a chat message posted, and the layout will not change.
**Recommended resolution:** Implement proper undo by snapshotting the layout state (instruction history + current rendered result) before each instruction is applied, and restoring the last snapshot when the Undo button is pressed.

## GAP-26: Session Restore Message Shows Raw Python Phase Strings

**Severity:** MEDIUM
**Affected stories:** US-S1, US-U1
**Status:** RESOLVED — `web/session-manager.js:747` already uses `SESSION_PHASE_LABELS[data.phase]` (imported from `utils.js`) which maps e.g. `customization` → "Customisation". The fallback is `String(data.phase).replace(/_/g, ' ')` for unknown phases. No code change needed; the gap was resolved when `SESSION_PHASE_LABELS` was added to utils.js.
**Description:** The restoration confirmation reads "✅ Session restored: [title] (customization)" — technical enum copy visible to end users.
**Recommended resolution:** Map the phase enum value to the same display label used by `_STEP_DISPLAY` in `workflow-steps.js` before constructing the restoration message.

## GAP-27: No Post-Generation Rewrite-Audit Diff Verification

**Severity:** MEDIUM
**Affected stories:** US-R7, US-A5c
**Status:** RESOLVED 2026-06-30 — `CVOrchestrator._verify_rewrite_audit_alignment(selected_content, rewrite_audit)` added to `scripts/utils/cv_orchestrator.py`. Called in `generate_cv()` after `build_render_ready_content()`; result stored as `metadata['rewrite_audit_mismatches']`. `web/download-tab.js` renders a red callout block listing each mismatch with expected vs actual text. 9 unit tests added in `tests/test_cv_orchestrator.py::TestVerifyRewriteAuditAlignment`.
**Description:** The rewrite audit stores the user-approved final text per bullet, but there is no post-generation step that diffs the generated document text against those approved values and flags discrepancies.
**Recommended resolution:** After generation, compare each generated bullet span against the corresponding `rewrite_audit[*].final` value and surface any mismatch as a validation warning before allowing finalisation.

## GAP-28: Publications Heading Does Not Distinguish Subset vs Full List

**Severity:** HIGH
**Affected stories:** US-M4, US-M7, US-A3
**Status:** CLOSED - fixed 2026-04-21 (commit ad9edf0, amended). Template logic corrected.
**Description:** The publications section heading did not correctly signal whether a subset or the full list was rendered.
**Resolution:** `cv-template.html` now renders the heading conditionally:

- **"Selected Publications"** — when `template_metadata.total_publications_count` exceeds the number of rendered publications (i.e., a subset is shown).
- **"Publications"** — when all publications are shown or when no count metadata is available.
- The publication count is **never** shown in generated documents.

This behavior must not be reversed. The count suffix `(N)` was intentionally removed.

## GAP-29: Venue-Missing Publications Render Silently

**Severity:** HIGH
**Affected stories:** US-M4, US-R2
**Status:** RESOLVED — `publications-review.js:138` reads `pub.venue_warning` and injects an amber ⚠ icon with a tooltip into the citation cell (`:146`). Backend computes `venue_warning` at `cv_orchestrator.py:896`. The cycle 8 review incorrectly reported this as OPEN; source code confirms it is implemented. (The `.pub-venue-warn` CSS class noted in the original report is unused — the inline `color:#dc7900` style is used instead.)
**Description:** The warning system for incomplete publication entries is wired at the CSS level but dead at the code level. Authors can include publications with no journal, conference, or venue without receiving any feedback.
**Recommended resolution:** Resolved — see status above.

## GAP-30: Cover Letter Opening Hardwired as "Dear [name],"

**Severity:** CRITICAL
**Affected stories:** US-P3, US-P5
**Status:** RESOLVED - confirmed 2026-04-22; persuasion expert review confirmed the cover letter opening style is now user-selectable (formal/hook/narrative), commit `a5fc40a`. The hardwired "Dear [name]," constraint is removed. Client-side word count ceiling remains open under GAP-95.
**Description:** A hardwired "Dear [name]," opener is the weakest possible cover letter opening from a persuasion perspective. The story spec requires an opening that captures attention, establishes a specific connection, or uses a hook — none of which are possible with a forced salutation.
**Recommended resolution:** Remove the hardwired salutation from the cover letter prompt. Allow the LLM to generate a configurable opening (salutation, hook, or pattern-interrupt) based on user preference and job context. Add a cover letter opening style option (formal/attention-grabbing/narrative) to the session configuration.

## GAP-31: Cover Letter Word Count Ceiling 400 vs Story Spec 300

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** RESOLVED 2026-06-29 — Both backend prompt and frontend validation now use role-differentiated word count targets (300–400w standard, 400–500w executive, 500–600w academic/research). Backend: `_cover_letter_word_count_instruction()` in `scripts/routes/master_data_routes.py` (GAP-126 fix). Frontend: role-differentiated thresholds in `_validateCoverLetter()` at `web/cover-letter.js:550–576` (GAP-95 fix). The blanket 400-word ceiling is gone.
**Description:** The 400-word ceiling produces cover letters that are too long for most recruiter review contexts, which typically allow 200–300 words per the story spec.
**Recommended resolution:** Reduce the cover letter word count target to 300 words maximum in the generation prompt.

## GAP-32: ATS Score and Validation Results Not Written to `metadata.json`

**Severity:** HIGH
**Affected stories:** US-H6, US-A9
**Status:** RESOLVED — 2026-06-30. Modified `CVOrchestrator._generate_ats_docx()` to return `(filepath, ats_score)` tuple. The call site in `generate_cv()` captures `ats_score_at_generation` and writes it to `metadata.json` as `'ats_score'`. The full `validation_results` dict is available via `/api/validate-ats` on demand but is not separately duplicated into metadata to avoid bloat.
**Description:** ATS score and validation results are ephemeral — they are displayed during the session but not persisted to the generation artifact. If the session is closed, the score cannot be recovered from the archive. The audit trail is broken.
**Recommended resolution:** After generation completes and ATS scoring runs, write both `ats_score` and `validation_results` to `metadata.json` in the generation output directory. See also GAP-04 (validation coverage) for the related completeness gap.

## GAP-33: No Employment Date Overlap Detection

**Severity:** HIGH
**Affected stories:** US-H2, US-R2
**Status:** RESOLVED — re-verified 2026-06-30. `CVOrchestrator._detect_date_overlaps()` (`scripts/utils/cv_orchestrator.py:4755`) was implemented in a prior batch; called in `generate_cv()` at line 2094. Results stored in `metadata.json` as `date_overlap_warnings` and displayed in a callout in `web/download-tab.js`. The gap was based on a stale pre-implementation snapshot.
**Description:** Overlapping employment dates are a common CV integrity problem that human reviewers and ATS systems both flag. The current pipeline has no detection and generates CVs with overlapping dates without warning.
**Recommended resolution:** During the pre-generation validation step, check all experience entries for date range overlaps and surface any detected overlaps as a blocking or warning validation result.

## GAP-34: `confirmDialog()` Missing ARIA Role, Focus Trap, and Focus Restore

**Severity:** HIGH
**Affected stories:** US-X2
**Status:** RESOLVED 2026-06-18
**Description:** The native-style confirmation dialogs were not accessible to keyboard and screen reader users. Users who cannot use a mouse could not access or dismiss these dialogs.
**Fix:** `confirmDialog()` in `web/ui-core.js` now adds `role="dialog"`, `aria-modal="true"`, `aria-labelledby="confirm-dialog-msg"` to the dialog box; moves focus to the OK button on open; traps Tab/Shift-Tab within the two buttons; handles Escape to cancel; restores focus to the previous element on close.

## GAP-35: Message Input Has No Accessible Label

**Severity:** HIGH
**Affected stories:** US-X1
**Status:** RESOLVED 2026-06-22 (cycle 7) — Added `aria-label="Chat message"` to `#message-input` at `web/index.html:177`.
**Description:** Placeholder text is not a substitute for an accessible label. Screen reader users navigating by form fields will encounter an unlabeled input.
**Recommended resolution:** Add `aria-label="Chat message"` (or a visually-hidden `<label>`) to the message input element.

## GAP-36: No Master CV Onboarding — Raw FileNotFoundError on First Run

**Severity:** CRITICAL
**Affected stories:** US-F4
**Status:** RESOLVED 2026-06-29 — Full onboarding pipeline implemented: `maybeShowWelcomeModal()` in `web/session-manager.js:169` calls `/api/setup/master-cv-status` on every startup and shows appropriate section (present/empty/missing). `onboardingCreateEmptyProfile()` in `session-manager.js:211` calls `POST /api/setup/create-master-cv` to create a skeleton, then navigates to a new session. `createNewSessionAndNavigate()` handles `master_cv_missing` error from session creation. Backend endpoints at `session_routes.py:505` and `session_routes.py:532`. `ensure_master_cv_exists()` called at non-multi-user startup (web_app.py:695). Previously discovered 2026-04-20; first-time user review confirmed `cv_orchestrator.py:130–133` raises `FileNotFoundError` when `master_data_path` is absent.
**Description:** A first-time user with no `Master_CV_Data.json` cannot use the application. The only guidance is a raw developer error message in the server log. This is a complete adoption blocker.
**Recommended resolution:** Add an early-startup check for the master data file. If missing, redirect to a dedicated onboarding wizard before opening any session UI. Implement at minimum one creation path (structured JSON editor or guided form) and document the other two paths.

## GAP-37: No Welcome Screen or App-Purpose Statement for First-Time Users

**Severity:** HIGH
**Affected stories:** US-F1
**Status:** RESOLVED 2026-07-01 — all three remaining issues are now closed: (1) LLM provider prerequisite added to welcome modal (GAP-76, resolved 2026-06-29); (2) "Get Started" navigates to Job tab (GAP-77, resolved 2026-06-29); (3) modal re-openable via "? Help" button (GAP-247, resolved 2026-06-30).
**Description:** First-time users cannot identify what the application does, what prerequisites exist, or how to start without external documentation. Undefined terms ("ATS," "Harvest," "Master CV," "Customise") appear immediately in the tab bar.
**Recommended resolution:** Add a first-visit welcome screen that explains the application's purpose in one sentence, lists the two prerequisites (Master CV file and LLM provider), and provides a clear "Get started" CTA. Add inline definitions or tooltips for jargon terms ("ATS," "Harvest") on first encounter.

## GAP-38: "Delete" Session Button Label Misleads — Should Read "Move to Trash"

**Severity:** MEDIUM
**Affected stories:** US-S3
**Status:** RESOLVED - confirmed 2026-04-22; returning user review confirmed the button at `web/session-switcher-ui.js:85` was relabelled from "Delete" to "Move to Trash" and the `title` attribute also reads "Move session to Trash". The Trash view with Restore and Delete Forever actions provides the full recovery path. Note: the action still executes without a confirmation dialog — tracked as GAP-111.
**Description:** Label-behavior mismatch erodes trust. Soft-delete actions should be labeled "Move to Trash" or "Archive" to distinguish them from permanent deletion.
**Recommended resolution:** Rename the session delete button to "Move to Trash" and update any confirmation dialogs accordingly.

## GAP-39: Cover Letter and Screening DOCX Excluded From File Review and Finalise Package View

**Severity:** HIGH
**Affected stories:** US-O3, US-O4
**Status:** RESOLVED 2026-06-20 — Cycle 5 recruiter-ops review confirmed cover letter and screening DOCX files are now surfaced in the Download tab file listing. `web/download-tab.js` renders all three CV formats, cover letter, and screening DOCX in the file grid. Previously OPEN since 2026-04-20.
**Description:** Recruiters using the app to review submission packages expect all components (CV formats, cover letter, screening questions) to be visible and downloadable from one place. The cover letter and screening DOCX files are invisible in the package review.
**Recommended resolution:** Include cover letter and screening DOCX files in both the File Review tab file listing and the Finalise stage package summary view.

## GAP-40: No Submission Readiness Checklist in Finalise

**Severity:** HIGH
**Affected stories:** US-O4, US-A9
**Status:** RESOLVED 2026-06-29 — Added `_renderReadinessChecklist(files, statusData)` in `web/finalise.js` rendered into `#readiness-checklist` div above `#consistency-report`. Checks: CV PDF ❌/✅, CV DOCX ❌/✅, CV HTML ❌/✅ (required), cover letter ⚠/✅, screening Q&A ⚠/✅, ATS validation ⚠/✅, layout freshness ⚠/✅. Optional items warn but don't block archiving; required CV formats show ❌ if missing.
**Description:** Without a submission readiness checklist, users cannot quickly verify completeness. Partially generated or stale-file packages can be archived without warning.
**Recommended resolution:** Add a pre-archive checklist to the Finalise tab that confirms: all three CV formats generated, cover letter generated, screening questions generated (or explicitly skipped), ATS score above threshold (or explicitly acknowledged), and layout freshness current.

## GAP-41: Pre-Job Master-Data Editing Has No UI Entry Point

**Severity:** CRITICAL
**Affected stories:** US-M1, US-A10, US-A11
**Status:** RESOLVED 2026-06-29 — Added `'master'` to the `job` stage in `STAGE_TABS` (`web/ui-core.js:351`). The Master CV tab is now visible whenever the user is on the Job stage (before starting analysis), giving access to the editor before any job session begins. Backend already permitted writes in `init`/`job` phase (`master_data_routes.py:129`). Previously discovered 2026-04-20; `STAGE_TABS` only exposed the Master CV tab in the `finalise` stage — the pre-job editing window had no frontend surface.
**Description:** Users who want to update their master CV profile (add a new experience, update skills, fix a publication) before beginning job analysis have no way to access the Master CV editor. They must either complete a full job analysis first or reach the Finalise stage, which may already have customized the data.
**Recommended resolution:** Expose the Master CV tab (or a dedicated "Maintain Master CV" link) in the `job` stage so users can update their profile before any job session begins. Alternatively, add a standalone "Maintain Master CV" view accessible from the header regardless of workflow stage.

## GAP-42: `GET /api/master-data/full` Omits `certifications`

**Severity:** HIGH
**Affected stories:** US-M1, US-A10
**Status:** RESOLVED — `master_data_routes.py:324` already includes `"certifications": master.get('certifications', [])` in the `GET /api/master-data/full` response. The original line numbers in the GAP (284–302) are stale; certifications was added in a prior refactor. No code change needed.
**Description:** The certifications data is stored correctly and can be written to, but it is invisible to the user because the read endpoint omits it. Any certifications entered via the editor or present in the file are silently lost from the view.
**Recommended resolution:** Add `certifications` to the response body of `GET /api/master-data/full` in `master_data_routes.py`.

## GAP-43: `master_data_routes._save_master` Has No Post-Write Schema Validation

**Severity:** MEDIUM
**Affected stories:** US-M1
**Status:** RESOLVED — `master_data_routes.py:52–60` already runs `validate_master_data(master)` after writing and restores from backup on validation failure. The original report (lines 38–51) captured a snapshot before post-write validation was added. No code change needed.
**Description:** Two implementations of the same write-path helper exist with different safety guarantees. Writes routed through `master_data_routes._save_master` can corrupt `Master_CV_Data.json` without triggering the automatic restore.
**Recommended resolution:** Consolidate to a single `_save_master` implementation that always runs post-write validation with backup-restore on failure. Remove the duplicate in `web_app.py` or make the routes module call the validated version.

## GAP-44: BibTeX CRUD Modal Does Not Pre-Populate Extra Fields on Edit

**Severity:** MEDIUM
**Affected stories:** US-M4
**Status:** RESOLVED — `master-cv.js:1469–1474` already builds the extra-fields content on edit: filters out the known field set (author, editor, title, year, journal, booktitle, doi) and joins remaining fields as `key=value` per line into `#pub-modal-extra`. No code change needed.
**Description:** Publications with volume, pages, publisher, or other BibTeX fields beyond the fixed set will silently lose those fields if saved through the CRUD modal, because the extra-fields textarea is empty on open.
**Recommended resolution:** When opening the edit modal for an existing publication, populate the `extra fields` textarea with all BibTeX fields that are not mapped to dedicated form inputs.

## GAP-45: Persuasion Warning "Acknowledged" Button Is Bypassed in Collapsed Panel

**Severity:** HIGH
**Affected stories:** US-C2, US-P3
**Status:** RESOLVED 2026-07-01 — re-verified: `submitBtn.disabled = (pending > 0) || !persuasionWarningsAcknowledged` (`rewrite-review.js:502`). The submit button is hard-disabled until the user expands the warning panel and clicks "✓ Acknowledged" (`rewrite-review.js:206`), which calls `setPersuasionWarningsAcknowledged(true)`. The "toggle without reading" bypass described in the gap report is not possible — the toggle only shows/hides the panel; clicking the toggle does not set `persuasionWarningsAcknowledged`. A `confirmModal` secondary guard at line 510–517 handles the edge case where the flag is false at submit time.
**Description:** The persuasion warning system is present but easily bypassed by collapsing the panel. This violates the trust and compliance story requirement that users must acknowledge warnings before submitting rewrite decisions.
**Recommended resolution:** Gate the rewrite decision submission button on at least one of: (a) the warning panel being expanded, or (b) the "Acknowledged" button having been clicked. Store the acknowledgement in session state to persist across page refreshes.

## GAP-46: No In-App Disclosure of LLM Data Transmission

**Severity:** MEDIUM
**Affected stories:** US-C1
**Status:** RESOLVED — re-verified 2026-06-30. `web/job-analysis.js:99–102` shows a one-time disclosure message in the chat panel on the first `analyzeJob()` call and persists an acknowledgement flag in `localStorage` (`StorageKeys.LLM_DISCLOSURE_SHOWN`). The gap was stale.
**Description:** Users who have not read the configuration documentation may not know that submitting a job description or CV content sends that data to an external API (OpenAI, Anthropic, GitHub Models, etc.). This is a data governance transparency gap.
**Recommended resolution:** Display a brief disclosure on the first LLM call of a session (or on initial LLM configuration) noting that content is transmitted to the configured provider. Persist an acknowledgement flag in the session.

## GAP-47: Font Size Control Labeled in CSS px — Designers Think in Typographic pt

**Severity:** MEDIUM
**Affected stories:** US-G2
**Status:** RESOLVED — The layout tab shows "Base font size:" with the px input and a live-updating span `#font-size-pt-display` showing "px (N.N pt)". The `pxToPt()` helper (96px/in, 72pt/in convention) updates the display on every input event and on tab load. `web/layout-instruction.js:332` (static default) and lines 424–426, 529–533 (dynamic updates).
**Description:** The CSS px unit is not the natural unit for typographic font size decisions. This label will cause confusion for any user with a design background.
**Recommended resolution:** Display the pt equivalent alongside the px value (e.g., "12px (9pt)" or provide a pt input that converts to px internally). Alternatively, change the control to accept pt and convert internally.

## GAP-48: Duplicate `showAlertModal` / `closeAlertModal` Definitions

**Severity:** HIGH
**Affected stories:** US-U4
**Status:** RESOLVED 2026-06-18 — `showAlertModal` / `closeAlertModal` exist only in `ui-helpers.js` now; `ui-core.js` no longer contains these definitions. Duplicate was already removed in a prior commit. Previously discovered 2026-04-20.
**Description:** Duplicate implementations of the same UI primitive create an undefined contract. Alert dialogs may or may not trap focus depending on which module wins the global assignment. Any bug fix in one implementation will not apply to the other.
**Recommended resolution:** Remove the duplicate in `ui-helpers.js` and use the single canonical version from `ui-core.js` throughout. Audit all call sites to ensure they use the focus-trap-capable version.

## GAP-49: Spell Check Auto-Advances Into Generation Without Confirmation

**Severity:** HIGH
**Affected stories:** US-F2, US-A4b
**Status:** RESOLVED 2026-06-29 — `_confirmProceedToGenerate()` at `web/spell-check.js:356` shows a "Proceed to Generate?" modal before `sendAction('generate_cv')` fires. Modal displays current ATS score (if available), layout staleness warning (if stale), and requires explicit "Generate Now" button click. Tagline-confirmed gate also blocks generation if tagline hasn't been confirmed. Previously discovered 2026-04-20; earlier version auto-advanced without confirmation.
**Description:** CV generation is the irreversible convergence of all prior decisions into output files. Silently triggering it after spell-check completion denies the user a final review opportunity. Users who realise they missed a customisation step have already passed the point of no return without knowing it.
**Recommended resolution:** Insert a "Proceed to Generate?" confirmation step after spell-check completion. The prompt should summarize: number of CV formats to be generated, current ATS score, any active staleness warnings, and a "Generate Now" button. This also addresses the H3 (User control and freedom) heuristic finding.

## GAP-50: Backend Helper Duplication Across `web_app.py` and `master_data_routes.py`

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — The `_text_similarity` function and `_SCREENING_FORMAT_GUIDANCE` dict in `scripts/web_app.py` were dead code (defined but never called there); the only actual callers are in `scripts/routes/master_data_routes.py` which already has its own copies. Removed both dead definitions from `web_app.py`, eliminating the duplication.
**Description:** Shared backend utility logic is copied into multiple modules rather than extracted into one supported utility location.
**Recommended resolution:** Move the duplicated helpers into a shared utility module and update both callers to import the same implementation.

## GAP-51: CLI-Only Logic Lives Inside `ConversationManager`

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Removed the top-level `import readline` from `scripts/utils/conversation_manager.py`. Replaced it with lazy `import readline` inside `_setup_readline()` and `_save_readline_history()` — the only two methods that use it. The web-app import path no longer triggers readline initialisation at startup. The CLI-only interactive methods (`start_interactive`, `_get_multiline_input`, `_handle_quit_confirmation`) remain in ConversationManager for now; a full adapter-module split is tracked as a follow-up if needed.
**Description:** CLI-specific concerns are mixed into a core session/state class used by the Flask application, increasing startup overhead and coupling two runtimes.
**Recommended resolution:** Move CLI-only behavior into a dedicated runner or adapter module and keep `ConversationManager` focused on shared orchestration/state responsibilities.

## GAP-52: `web_app.py` Depends On Private Route-Module Helpers

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — The `from routes.generation_routes import (_compile_harvest_candidates, _harvest_add_skill, _harvest_add_summary_variant, _harvest_apply_bullet)` block in `scripts/web_app.py` was dead code (imported but never called in that module). Removed the import entirely. Blueprint encapsulation is now clean.
**Description:** The main Flask app reaches into route-internal helpers instead of depending on a stable shared service boundary.
**Recommended resolution:** Extract shared harvest/generation helpers into a neutral support module and stop importing private route internals into `web_app.py`.

## GAP-53: Session Listing Re-Scans The Session Tree On Every Request

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added module-level `_SESSION_LIST_CACHE` dict with 5-second TTL in `scripts/routes/session_routes.py`. `GET /api/sessions` checks the cache first and only runs `rglob("session.json")` on a cache miss. Cache is invalidated immediately on `POST /api/save` and `POST /api/sessions/new` to prevent stale results after mutations.
**Description:** Session browsing scales linearly with on-disk session count because the directory tree is rescanned on each request.
**Recommended resolution:** Add a short-lived cache or timestamp-based invalidation layer for session discovery results.

## GAP-54: Idle-Session Eviction Performs A Full Registry Scan Before Every Request

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added `_last_eviction_time` closure list and `_EVICTION_INTERVAL_S = 60.0` constant in `create_app()` (`scripts/web_app.py`). The `_evict_idle_sessions` before-request hook now calls `session_registry.evict_idle()` only when at least 60 seconds have elapsed since the last scan (checked via `time.monotonic()`).
**Description:** Every request pays for a registry-wide eviction scan even when no eviction is needed.
**Recommended resolution:** Add a minimum interval between eviction scans or move the sweep to a periodic background task.

## GAP-55: No Explicit Loopback-Only CORS Policy

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added Host-header validation `before_request` hook in `scripts/web_app.py` (inside `create_app()`). When `CV_WEB_HOST` is a loopback address (default `127.0.0.1`), the hook rejects requests whose `Host` header is not `localhost`, `127.0.0.1`, or `::1`, returning HTTP 400. Controlled by `CV_ALLOWED_HOSTS` env var: set to `*` to disable (reverse-proxy deployments), or a comma-separated list of permitted hostnames. 7 regression tests added in `tests/test_host_validation.py`.
**Description:** Security posture depends on deployment assumptions rather than a declared loopback-only origin policy.
**Recommended resolution:** Add explicit CORS/origin restrictions for loopback origins and document the expected hosting model.

## GAP-56: Session ID Entropy Is Too Small For Anything Beyond Localhost

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Changed all three generation sites from `uuid.uuid4().hex[:8]` (32 bits) to `uuid.uuid4().hex` (full 128-bit UUID, 32 hex chars). Sites updated: `scripts/utils/session_registry.py:136`, `scripts/utils/conversation_manager.py:1982`, `scripts/utils/conversation_manager.py:2268`. Existing sessions are unaffected (IDs are read verbatim from `session.json`).
**Description:** Current session IDs are adequate for a single-user localhost tool, but would be too guessable if the app were ever port-forwarded or exposed remotely.
**Recommended resolution:** Increase session ID entropy to at least 64 bits or full UUID length and document any migration implications.

## GAP-57: No Dedicated DNS-Rebinding Regression Test For URL Fetch Guardrails

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — 5 regression tests added in `tests/test_security_regression.py::TestDnsRebindingSsrfRejection`. Covers: bare loopback IP, bare private IP, localhost name, public hostname resolving to 192.168.x.x (mocked), and public hostname resolving to 127.x.x.x (mocked). All assert HTTP 400 and "not permitted" error message.
**Description:** A key security control is present in code but not pinned down with a regression test.
**Recommended resolution:** Add a unit test that mocks DNS resolution and verifies private-IP rejection after hostname lookup.

## GAP-58: No Static-Route Path-Traversal Regression Test

**Severity:** LOW
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — 3 regression tests added in `tests/test_security_regression.py::TestStaticRoutePathTraversal`. Covers `/web/../etc/passwd`, URL-encoded traversal `%2e%2e%2f`, and double-dot beyond web root. All assert 400 or 404 (Flask/Werkzeug rejects these before the route handler).
**Description:** The code appears safe via `send_from_directory`, but the safety property is not explicitly regression-tested.
**Recommended resolution:** Add tests for `../` and similar traversal inputs against the static route handler.

## GAP-59: `_save_master` Failure Path For `git add` Is Untested

**Severity:** LOW
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Test added in `tests/test_security_regression.py::TestSaveMasterGitAddFailure`. Mocks `subprocess.run` to return exit code 1, verifies `logger.warning` is called with "git add" in the message, and confirms the JSON file is written correctly to disk.
**Description:** A subtle operational path exists without regression coverage.
**Recommended resolution:** Add a test that mocks a failing `git add` subprocess and verifies the write succeeds with an explicit warning.

## GAP-60: `git add` Failure During Master Save Is Silent

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-29 — `_save_master` in `scripts/routes/master_data_routes.py:62` now captures the `subprocess.run` result and emits `logger.warning(...)` when `returncode != 0`, including the git stderr/stdout. Non-fatal — master save still succeeds.
**Description:** The master file can be updated successfully while the repo is left untracked or partially staged without any visible signal.
**Recommended resolution:** Log and optionally surface a non-fatal warning when `git add` fails during master-data save.

## GAP-61: Frontend Alert And Confirm Modals Render Unsanitized HTML

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-29 — Added `_setModalText(el, message)` helper in `web/ui-helpers.js` that splits on `\n` and appends text nodes + `<br>` elements. `showAlertModal()` and `showConfirmModal()` now call `_setModalText()` instead of `.innerHTML = message.replace(/\n/g, '<br>')`. `ui-core.js` already used `textContent` throughout.
**Description:** Error/help content can be rendered as HTML inside modal dialogs without sanitization, creating an avoidable XSS surface.
**Recommended resolution:** Use `textContent` plus explicit line-break handling, or sanitize rich content before rendering it into modal bodies.

## GAP-62: Frontend Request Interception Is Split Across Multiple `window.fetch` Monkey Patches

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-07-01 (cycle 25) — Removed `fetch-utils.js` IIFE patch; replaced with exported `handle409Conflict()` function. `api-client.js:sessionAwareFetch` now calls `handle409Conflict` on 409 response and retries if user confirms. Single `window.fetch = sessionAwareFetch` assignment in `api-client.js` owns the full pipeline.
**Description:** Fetch behavior depends on load order and side-effect layering rather than a single owned request pipeline.
**Recommended resolution:** Consolidate request decoration, conflict handling, and retry/abort behavior into one fetch wrapper or client module.

## GAP-63: `state-manager.js` Still Mirrors Canonical State Onto `globalThis`

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-07-01 (cycle 25) — Removed `installLegacyStateGlobals()` and its call from `state-manager.js`; removed `globalThis.isLoading` write fallbacks from `fetch-utils.js` `setLoading()` and `state-manager.js` `setLoading`; removed `globalThis.isLoading = isLoading` module-level write. All consumers of loading/tab/stage state use `stateManager` accessors. 3 legacy-mirror tests removed from `state-manager.test.js`.
**Description:** The frontend still operates with two overlapping state models: module-managed state and ambient global state.
**Recommended resolution:** Finish migrating remaining consumers to imports/state-manager accessors and retire the `globalThis` compatibility layer.

## GAP-64: `app.js` Still Lives Outside The Main Frontend Module Graph

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-07-01 (cycle 25) — `app.js` now exports `{ init, setupEventListeners }` and is imported as `App` in `web/src/main.js`. `main.js` registers `document.addEventListener('DOMContentLoaded', App.init)` after `Object.assign(globalThis, ..., App)`. Removed `if (typeof init === 'function') init()` from `ui-core.js` DOMContentLoaded handler. Removed `<script src="app.js"></script>` from `index.html`.
**Description:** The application still uses a transitional build structure rather than a single bundled entrypoint, which weakens import contracts and maintainability.
**Recommended resolution:** Fold `app.js` into the module entrypoint and stop relying on globally exported module functions.

## GAP-65: No Security Regression Test For Modal HTML Injection

**Severity:** LOW
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added 4 HTML-injection regression tests in `tests/js/ui-helpers.test.js` (describe block: "modal HTML injection regression (GAP-65)"). Tests pass `<img src=x onerror=...>` and `<script>...</script>` payloads into both `showAlertModal` and `showConfirmModal` titles and messages; assert `innerHTML` does not contain the raw tag and `textContent` contains the literal source. Confirms `_setModalText()` (which uses `document.createTextNode`) correctly prevents XSS injection.
**Description:** The current unsafe modal rendering path is not guarded by a regression test that would fail if raw HTML is injected.
**Recommended resolution:** Add tests that pass HTML-looking content into alert/confirm helpers and assert it is escaped or sanitized before render.

## GAP-66: Pull Requests Do Not Run The Broader Non-UI Python Regression Suite

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Updated `python-tests` job in `.github/workflows/integration-harness.yml` to run `python -m pytest -q --ignore=tests/ui tests/` (full non-UI suite) instead of the previous hand-picked subset. One known-flaky integration test is deselected.
**Description:** Important Python regressions can miss PR-time detection because the broader suite is deferred to `main`/nightly/manual execution.
**Recommended resolution:** Run the wider non-UI Python suite on pull requests, or add a reusable medium-weight gate that is still broader than the current PR subset.

## GAP-67: Full Integration Coverage Does Not Protect The Active Development Branch

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added `feature/multi-user-deployment` to the `push.branches` trigger in `.github/workflows/full-integration.yml` alongside `main`. Full suite (Playwright E2E, Python full, integration harness) now runs on pushes to the active development branch.
**Description:** The branch where active development occurs is not protected by the broadest automated regression workflow.
**Recommended resolution:** Extend full integration coverage to the protected development branch or whichever branch is used for normal merge flow.

## GAP-68: No Lint Or Typecheck Gate In GitHub Actions

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added `lint` job to `.github/workflows/integration-harness.yml`. Runs `ruff check scripts/ --select E,F,W --ignore E501,E402` and then verifies the JS bundle builds cleanly with `npm run build`. Job runs in parallel with `python-tests` and `js-tests` on every PR.
**Description:** Basic static-quality gates are missing from automated CI, allowing style, type, and stale-build regressions through until later testing.
**Recommended resolution:** Add lint/typecheck/build-verification jobs and require them on PRs.

## GAP-69: GitHub Actions Workflows Duplicate Large Shared Sections

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-07-01 — Extracted three fully duplicated jobs (`codeql`, `js-tests`, `integration-harness`) into reusable workflows: `.github/workflows/reusable-codeql.yml`, `.github/workflows/reusable-js-unit-tests.yml`, `.github/workflows/reusable-html-harness.yml`. Both `full-integration.yml` and `integration-harness.yml` now call these via `uses:`.
**Description:** Workflow duplication increases maintenance cost and the risk that one pipeline is updated while the other silently drifts.
**Recommended resolution:** Extract shared job logic into a reusable workflow or composite action.

## GAP-70: CI Does Not Publish Coverage Or Rich Failure Artifacts On PR Runs

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-06-30 — Added `--junit-xml=test-results/python-pr.xml` to the `python-tests` job in `integration-harness.yml` and an `upload-artifact@v4` step (name: `python-pr-results`) that uploads `test-results/` on every run including failures.
**Description:** Reviewers get pass/fail signals but limited diagnostic context and no coverage visibility during PR review.
**Recommended resolution:** Publish junit/coverage artifacts on PR runs and consider enforcing minimum thresholds.

## GAP-71: CI Environment Parity With Local `cvgen` Workflow Is Incomplete

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** RESOLVED 2026-07-01 — Added `anthropic>=0.18.0`, `openai>=1.0.0`, and `sentence-transformers>=2.2.0` (lazy-imported LLM clients) to `scripts/requirements.txt`; added `docxtpl>=0.20.0` to `scripts/requirements-conda.txt`; updated both file headers to document intentional splits. Added parity note to `.github/copilot-instructions.md` explaining CI vs conda environment differences.
**Description:** CI and local development use different environment construction paths, increasing the chance of environment-specific failures.
**Recommended resolution:** Either narrow the gap between CI and local environment setup or document and validate the supported differences explicitly.

---

## April 2026 Full-Cycle Additions (GAP-72 through GAP-121)

*Discovered during the 14-persona + heuristic full-cycle review completed 2026-04-22. All prior GAP IDs (01–71) are unchanged except for status updates above.*

---

## GAP-72: Workflow Step Pills Have No `tabindex` — Keyboard Navigation Blocked

**Severity:** HIGH
**Affected stories:** US-X1, US-U7
**Status:** RESOLVED 2026-06-20 — `updateWorkflowStepsClickable()` in `web/ui-core.js` now adds `role="button"`, `tabindex="0"`, and a keydown handler (Enter/Space) when a step becomes clickable; removes them when inert. See GAP-72/GAP-NEW-K entry in cycle 4 section. Previously discovered 2026-04-22.
**Description:** The workflow step bar is the primary navigation affordance for the entire application. Without keyboard access, keyboard-only users cannot navigate between stages, trigger back-navigation, or discover the ↻ re-run action.
**Recommended resolution:** Add `tabindex="0"` and `Enter`/`Space` `keydown` event handlers to all step pill elements. Ensure the ↻ re-run icon within each pill is separately reachable. Apply the ARIA `tablist` pattern.

## GAP-73: `.workflow` Container Has No `aria-live` — Stage Changes Not Announced

**Severity:** HIGH
**Affected stories:** US-X1, US-U7
**Status:** RESOLVED 2026-06-29 — Added visually-hidden `<div id="workflow-stage-announcer" aria-live="polite" aria-atomic="true">` in `web/index.html` after `</nav>`. Wired in `switchTab()` in `web/review-table-base.js`: clears then re-sets `announcer.textContent` with a 50 ms timeout so screen readers detect the DOM mutation. Previously discovered 2026-04-22; accessibility specialist review found the `.workflow` div has no `aria-live` attribute. When the active stage changes, screen readers receive no notification.
**Description:** Stage transitions are the most significant navigation events in the workflow. Without an `aria-live` region, screen reader users cannot detect when the application has advanced to a new stage.
**Recommended resolution:** Add `aria-live="polite"` and `aria-atomic="true"` to a designated status region that announces stage changes (e.g., "Now at step 3: Customise").

## GAP-74: `aria-invalid` Never Set Dynamically Despite CSS Rule Existing

**Severity:** MEDIUM
**Affected stories:** US-X3
**Status:** RESOLVED — re-verified 2026-06-30. `web/job-input.js:550–568` — `_showFieldError()` sets `aria-invalid="true"` on invalid inputs and `aria-invalid="false"` on clear. This is the primary job-text intake form. Master CV modal forms use `showAlertModal()` for errors (accessible via focus-trapped dialog), which is an acceptable pattern. The CSS rule `[aria-invalid="true"]` in `web/styles.css:1555–1556` is exercised by job-input validation.
**Description:** Screen readers use `aria-invalid` to announce validation errors. Without it, users relying on assistive technology receive no error announcement beyond visual styling.
**Recommended resolution:** In all form validation handlers, set `element.setAttribute('aria-invalid', 'true')` on error and `element.removeAttribute('aria-invalid')` on correction. The CSS rule already handles the visual response.

## GAP-75: `#session-conflict-banner` Has No `role="alert"` or `aria-live`

**Severity:** HIGH
**Affected stories:** US-X3, US-U7
**Status:** RESOLVED 2026-06-18 — Added `role="alert"` to `#session-conflict-banner` in `web/index.html:110`. Previously discovered 2026-04-22; accessibility specialist review found the session conflict banner (`index.html`) has no `role="alert"` or `aria-live` attribute. Screen reader users are not notified of session conflicts.
**Description:** Session conflict banners alert the user to an important application-state problem. Without `role="alert"`, a screen reader user will not be informed of the conflict unless they explicitly move focus to the banner.
**Recommended resolution:** Add `role="alert"` to the `#session-conflict-banner` element, or use `aria-live="assertive"` so the announcement interrupts the current screen reader context.

## GAP-76: LLM Provider Prerequisites Not Mentioned in Welcome Onboarding Modal

**Severity:** HIGH
**Affected stories:** US-F1, US-F2
**Status:** RESOLVED 2026-06-29 — Added a "Prerequisites" list box to the welcome modal in `web/index.html` between the 3-step workflow explanation and the status sections. Lists: (1) `Master_CV_Data.json` profile needed, (2) LLM provider must be configured via the ⚙ LLM button. Shows on every visit. Previously discovered 2026-04-22; welcome modal made no mention of LLM provider setup prerequisite.
**Description:** The LLM provider is required for every analysis, rewrite, and generation action. Without guidance at onboarding, first-time users who have not configured a provider will start a job session and receive a cryptic authentication error after minutes of effort.
**Recommended resolution:** Add a "Prerequisites" list to the welcome modal noting: (1) a `Master_CV_Data.json` file is needed and (2) an LLM provider must be configured via the LLM settings button. Link or highlight the LLM wizard button.

## GAP-77: Welcome Modal "Get Started" Button Doesn't Navigate to Job Tab

**Severity:** MEDIUM
**Affected stories:** US-F1, US-U1
**Status:** RESOLVED 2026-06-29 — Updated the "present" state onclick in `_setWelcomeSection()` (`web/session-manager.js:143–146`) to call `switchTab('job')` after `closeWelcomeModal()`. Users with a populated Master CV profile are now navigated to the Job tab immediately on "Get Started". Previously discovered 2026-04-22; button only called `closeWelcomeModal()` and left the user on blank state.
**Description:** After reading the welcome modal, a first-time user expects to be directed to the next action. Closing the modal and remaining on a blank screen provides no momentum.
**Recommended resolution:** After dismissing the welcome modal via "Get Started", programmatically navigate to the Job Input tab (or trigger the New Session flow) so users immediately see their starting point.

## GAP-78: CV Jargon Terms Undefined on First Encounter

**Severity:** MEDIUM
**Affected stories:** US-F1, US-F2
**Status:** RESOLVED — 2026-06-30. Added definitional `title` attributes to: ATS score badge ("Applicant Tracking System (ATS) match score — percentage of job keywords present in your CV"), ATS Report button ("View ATS (Applicant Tracking System) match report"), and Harvest step pill ("Harvest improvements — save refined bullets, new skills, and summary variants back to your Master CV for future applications"). These are the three key jargon terms identified in the gap; "Master CV" and "Session" already have descriptive tooltips from prior work.
**Description:** Key terms — particularly "ATS" (Applicant Tracking System) and "Harvest improvements" — have no definition on first encounter. Users unfamiliar with recruitment technology cannot determine their meaning from context.
**Recommended resolution:** Add glossary tooltips or `title` attributes with one-sentence definitions for: ATS, Harvest, Master CV, Session. Alternatively, add a "?" help icon adjacent to each jargon term.

## GAP-79: Preview vs Final Generation Pipeline Distinction Unexplained

**Severity:** HIGH
**Affected stories:** US-F3, US-U6
**Status:** RESOLVED — 2026-06-30. Added stage-context `title` tooltips to all three pipeline buttons in `web/index.html` and `web/spell-check.js`: "Generate Preview →" (Step 1 of 3 — HTML preview), "Open Layout Review →" (Step 2 of 3 — adjust layout settings), "Confirm Layout" (Step 3 of 3 — produce final DOCX/PDF). The button labels already differentiated the steps; the tooltips now explain what each step produces.
**Description:** The distinction between the HTML preview, layout-reviewed output, and final generation is not communicated. First-time users face three generation-related actions with overlapping terminology and no explanation of the sequence.
**Recommended resolution:** Add an informational banner or tooltip before the Generate step explaining the three-stage pipeline. Update action button labels to include stage context (e.g., "Generate Preview", "Confirm Layout", "Generate Final Files").

## GAP-80: Button Style Inconsistency — Layout Tab Uses Bootstrap 5 While Other Tabs Use `.action-btn`

**Severity:** MEDIUM
**Affected stories:** US-G2, H4
**Status:** RESOLVED 2026-06-29 — Aligned `.btn-primary`, `.btn-secondary`, and `.btn-warning` CSS to match `.action-btn` system in `web/styles.css`: same padding (`10px 16px`), same `font-size: 14px`, added `:focus-visible` outline, disabled state opacity, and `:not(:disabled)` on hover rules. These classes are used broadly (34 instances across 12 JS files), not only in the layout tab. Previously discovered 2026-04-22; `.btn-*` classes used `20px` horizontal padding vs `.action-btn`'s `16px` and lacked disabled/focus states.
**Description:** Users navigating from the Customise or Rewrite tab to the Layout tab see a different visual language for action buttons. The inconsistency reflects the Layout tab being implemented later with Bootstrap 5 while earlier tabs used the custom system.
**Recommended resolution:** Align the Layout tab buttons with the `.action-btn` system used throughout the rest of the application. Alternatively document a decision to migrate all tabs to Bootstrap 5 and execute it consistently.

## GAP-81: No Minimum Bullet Count Check Before Generation

**Severity:** MEDIUM
**Affected stories:** US-M2
**Status:** RESOLVED — 2026-06-30. Added `CVOrchestrator._detect_sparse_experiences()` static method that flags experience entries with fewer than 2 selected bullets. Called in `generate_cv()` alongside `_detect_date_overlaps` and `_detect_long_bullets`; results stored in `metadata.sparse_experience_warnings`. `web/download-tab.js` displays a yellow warning callout listing each sparse entry with a "Return to the Experience tab" prompt.
**Description:** CVs with single-bullet or empty experience entries signal rushed preparation and are unprofessional. The pre-generation validation does not detect this condition.
**Recommended resolution:** Add a validation check that flags experience entries with fewer than 2 bullets and surfaces a blocking or warning message in the ATS validation report.

## GAP-82: Cover Letter Tone Not Auto-Inferred from Job Analysis

**Severity:** MEDIUM
**Affected stories:** US-M6, US-P5
**Status:** RESOLVED 2026-06-30 — `culture_indicators` from job analysis are now injected into the tone hint sent to the cover letter LLM (`scripts/routes/master_data_routes.py`). Up to 5 culture signals (e.g. "fast-paced", "academic rigor", "async-first") are appended to the existing tone-style line so the LLM can calibrate formality and vocabulary automatically, while the user's explicit tone override still takes priority.
**Description:** A cover letter for a startup engineering role should differ tonally from one for a pharmaceutical director role. The analysis data necessary to make this inference is available but unused.
**Recommended resolution:** Include `culture_indicators` and `communication_style` fields from the job analysis in the cover letter generation prompt. Add a tone preference override in the cover letter settings.

## GAP-83: Page Count Warning Not Shown During Layout Review — Only at Download

**Severity:** MEDIUM
**Affected stories:** US-M4
**Status:** RESOLVED 2026-06-29 — Added page count badge to the layout preview status card in `renderLayoutPreviewStatus()` (`web/layout-instruction.js`). Badge shows exact or estimated page count from `generationState.pageCountExact/Estimate` with warning style (amber) when `pageWarning` is true. CSS `.layout-page-count-badge` and `.layout-page-count-badge.warn` added to `web/styles.css`. Previously discovered 2026-04-22; page count was only shown in download-tab.js.
**Description:** The ideal time to inform users about page count problems is during Layout Review, when they can still make adjustments. Showing the warning only at Download forces an additional round-trip through the layout flow.
**Recommended resolution:** Surface the page count validation result in the Layout Review tab header or beside the preview iframe. Update the layout freshness system to include a page-count-over-limit warning state.

## GAP-84: Cover Letter Named-Achievement Check Absent

**Severity:** MEDIUM
**Affected stories:** US-M6, US-P5
**Status:** RESOLVED 2026-06-29 — Added Rule 5 "Specific achievement" check to `_validateCoverLetter()` in `web/cover-letter.js`. Detects percentages, dollar amounts, quantified numbers, and action-result verbs (increased, reduced, delivered, launched, etc.). Shows warn (not fail) so it's advisory, not blocking. Previously discovered 2026-04-22; no achievement validation existed.
**Description:** The most persuasive cover letters reference concrete achievements. The existing cover letter validation checks word count, company name, and CTA, but not whether specific achievements are cited.
**Recommended resolution:** Add a cover letter body validation rule that checks for the presence of at least one quantified or named achievement (pattern: numbers, percentages, named project, "successfully", etc.) and warns if absent.

## GAP-85: No Bullet Line-Length or Word-Count Check

**Severity:** LOW
**Affected stories:** US-M2, US-R2
**Status:** RESOLVED — Covered by GAP-267: `CVOrchestrator._detect_long_bullets()` flags bullets >200 characters (≈35 words at average word length), storing results in `metadata.long_bullet_warnings`. `web/download-tab.js` displays a warning callout per-entry with the character count and a preview of the offending text.
**Description:** Best-practice CV bullets are 1–2 lines (15–30 words). The current pipeline has no check that flags bullets exceeding a reasonable length threshold.
**Recommended resolution:** Add a bullet length check to the pre-generation or ATS validation step that warns when any bullet exceeds a configurable word-count threshold (e.g., 35 words).

## GAP-86: Skill Category Ordering Not Derived from Job Analysis

**Severity:** LOW
**Affected stories:** US-M3, US-R5
**Status:** RESOLVED 2026-06-30 — Added `ConversationManager._rank_skill_categories_by_relevance()` static method (`scripts/utils/conversation_manager.py`). Called after `_normalize_recommendations()` in `_handle_recommend_customizations()`. Scores each category by counting recommended skills whose name overlaps with ATS keywords (+2) or are simply recommended (+1). Result stored in `recommendations['skill_category_order']` and `state['skill_category_order']`. Frontend (`web/skills-review.js`) applies the backend `skill_category_order` from `stateManager.getTabData('customizations')` to `window._skillCategoryOrder` on first table load.
**Description:** Job analysis identifies which skills are most important for a role. This ranking is not used to re-order skill categories in the generated CV or in the skill review table.
**Recommended resolution:** After job analysis, compute a per-category relevance score based on how many required/preferred skills belong to each category. Use this to suggest a re-ordered category display in the skills review tab and in the generated CV.

## GAP-87: Font Compliance Validation Absent from ATS Output

**Severity:** MEDIUM
**Affected stories:** US-H1, US-H6
**Status:** RESOLVED 2026-06-30 — Added check 17 ("ATS-safe fonts only") to `validate_ats_report()` in `scripts/utils/cv_orchestrator.py`. Reads all `run.font.name` values from every DOCX paragraph plus the Normal style default; validates each against a set of 11 known ATS-safe families (Arial, Calibri, Times New Roman, Helvetica, Georgia, Garamond, Verdana, Trebuchet MS, Courier New, Palatino, Book Antiqua). Returns `warn` with a list of non-standard font names if any are found; `warn` (not `fail`) because some ATS platforms handle them gracefully.
**Description:** Some ATS platforms reject or misread PDFs with decorative or non-standard fonts. The ATS validation report checks structure, keywords, and contact fields but not font embedding or font family compliance.
**Recommended resolution:** Add a font-family compliance check to ATS validation that reads the embedded font list from the generated ATS PDF and warns if non-standard fonts are detected.

## GAP-88: Year-Only Date Entries Not Rejected During Validation

**Severity:** MEDIUM
**Affected stories:** US-H5
**Status:** RESOLVED 2026-06-30 — Added `CVOrchestrator._detect_year_only_dates(experiences)` static method (`scripts/utils/cv_orchestrator.py`). Called alongside `_detect_long_bullets` and `_detect_sparse_experiences` during generation; results stored in `metadata.json` as `year_only_date_warnings`. Frontend callout added to download tab (`web/download-tab.js`) displaying company/role, affected field (start or end), and the raw year value with advice to use Month YYYY format.
**Description:** Year-only dates are ambiguous for employment duration calculation. ATS systems often parse this as invalid or estimate incorrectly.
**Recommended resolution:** Add a date-format validation check that flags year-only date entries and recommends month/year format for all experience start and end dates.

## GAP-89: `skill_type` Field Not Persisted to Master CV via Harvest

**Severity:** HIGH
**Affected stories:** US-H8, US-R5
**Status:** RESOLVED 2026-06-30 — Added `skill_type_update` harvest candidate type. `_collect_harvest_skill_type_candidates()` in `scripts/routes/generation_routes.py` compares `skill_qualifier_overrides[name].skill_type` (session) against the master data value; candidates are generated where they differ. `_harvest_update_skill_type()` writes the `skill_type` field to the matching skill in master data (list or dict format). `harvest_apply()` now handles `skill_type_update` candidates. Session skill-type overrides are now surfaced in the harvest panel and persisted to `Master_CV_Data.json` on apply.
**Description:** Hard/soft skill classification affects ATS output structure and section labeling. Without persisting this, every session must reclassify from scratch.
**Recommended resolution:** Add `skill_type` as a harvest-eligible field. Include skill type overrides in the harvest candidates panel and write them to `Master_CV_Data.json` when the user applies harvest.

## GAP-90: Synonym Normalization Absent from ATS Validation Report

**Severity:** MEDIUM
**Affected stories:** US-H4, US-R1
**Status:** RESOLVED 2026-06-30 — `openAtsReportModal()` in `web/ats-modals.js` now fetches `GET /api/synonym-map` (cached in `_atsSynonymMapCache`) before rendering. The synonym map is passed to `_renderAtsReport(score, synMap)` → `_renderKeywordGroup(title, keywords, synMap)`. Each keyword row shows a small grey annotation: aliases display "= Canonical Term" and canonical terms display "also: alias1, alias2". The existing match_type='synonym' badge for partial/synonym matches remains unchanged.
**Description:** Without synonym grouping in the validation report, users cannot verify that their synonym-matched keywords are being counted correctly or identify which canonical term to use for maximum ATS compatibility.
**Recommended resolution:** Update the ATS validation report and analysis tab keyword display to group synonym pairs, showing the canonical term with aliases. Mark each keyword as "matched via synonym" or "exact match".

## GAP-91: No Backup History/Restore UI Despite Backend Support

**Severity:** HIGH
**Affected stories:** US-M1, US-A10
**Status:** RESOLVED — 2026-06-30. Added `openBackupHistoryModal()` and `restoreBackup(filename)` functions in `web/master-cv.js`. The modal fetches `GET /api/master-data/history` and renders a table of backups with timestamps, file sizes, and Restore buttons. Restore calls `POST /api/master-data/restore` with confirmation dialog; creates a safety backup of the current version first. A "🕐 Backups" button was added to the Master CV tab header alongside the Export JSON button.
**Description:** The safety net for master data modifications exists but is invisible. Users who accidentally overwrite or corrupt their master CV data have no way to restore a backup without directly accessing the filesystem.
**Recommended resolution:** Add a "Backup history" section to the Master CV tab (or a dedicated modal) that lists all available backups with timestamps and provides a "Restore this version" action. The restore action should create a new backup of the current state before restoring.

## GAP-92: `publication_count` Stat Card Reads from JSON Not BibTeX

**Severity:** MEDIUM
**Affected stories:** US-M4, US-M7
**Status:** RESOLVED 2026-06-22 (cycle 7) — Changed `scripts/routes/master_data_routes.py:214` from `len(data.get('publications', []))` (always 0) to `len(orchestrator.publications or {})`, which reads from the parsed BibTeX dict.
**Description:** The application is designed to support BibTeX as the primary bibliography format. The stat card should reflect this by counting from the BibTeX source.
**Recommended resolution:** Update the publications count stat card to call a route that counts entries from `publications.bib` when it exists, falling back to `Master_CV_Data.json`.

## GAP-93: Phase-Enforcement 409 Response Misidentified as Session Conflict in UI

**Severity:** MEDIUM
**Affected stories:** US-M1, US-M3
**Status:** RESOLVED - 2026-06-29. Added `conflict_type: "phase_enforcement"` to the 409 response in `_require_master_data_write_phase()` (`scripts/routes/master_data_routes.py`). Updated the global fetch interceptor in `web/ui-core.js` to clone and inspect the response body; the session conflict banner is suppressed when `conflict_type` is present and is not `"session_ownership"`. Bundle rebuilt.
**Description:** A `409` during phase enforcement and a `409` during session-ownership conflict are distinct situations with very different user implications. The current UI handling does not distinguish them.
**Recommended resolution:** Add a `conflict_type` field (e.g., `phase_enforcement` vs `session_ownership`) to 409 responses and update the UI error handler to display phase-appropriate messaging.

## GAP-94: Summary Variant Format Inconsistency After Harvest

**Severity:** MEDIUM
**Affected stories:** US-M2, US-A11
**Status:** RESOLVED 2026-06-30 — Fixed `_harvest_add_summary_variant()` in `scripts/routes/generation_routes.py` to preserve the existing field format. If `professional_summaries` is a dict it adds a new key (`variant_N`) rather than replacing with a list. If it is a list it appends as before. This prevents the dict→list format flip that caused GAP-94. 2 new tests in `tests/test_finalise.py::TestHarvestAddSummaryVariant` cover the dict path.
**Description:** The `summaries` field in master data has two valid formats (list vs dict), and the harvest write-back may produce a different format than was originally present.
**Recommended resolution:** Standardize the `summaries` field to a single canonical format in `MASTER_CV_DATA_SPECIFICATION.md` and `master_data_validator.py`, then update the harvest write-back and all read paths to use that format consistently.

## GAP-95: Cover Letter Client-Side Validation Still Allows 400 Words

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** RESOLVED 2026-06-29 — Updated word count thresholds in `web/cover-letter.js`: pass range is now 250–300 words (was 250–400); warning range 200–350 (was 200–450); error below 200 or above 350 (was above 450). Progress bar scaled to 300-word target. Label updated to "Word count (250–300)".
**Previously:** OPEN - discovered 2026-04-22; persuasion expert review found that while the LLM cover letter generation prompt was tightened to ~250–300 words (commit `e0212e3`), the client-side word count validation still accepted cover letters up to 400 words without warning.
**Description:** A cover letter generated at the prompt's 250–300 word target will pass validation. But if a user manually edits a cover letter up to 400 words, no warning is shown.
**Recommended resolution:** Update the client-side cover letter word count threshold from 400 to 300 to match the prompt's target. Display a warning (not blocking) when the cover letter exceeds 300 words.

## GAP-96: Cover Letter CTA Validation Accepts Passive Closings

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** RESOLVED 2026-06-29 — Refactored CTA check in `_validateCoverLetter()` (`web/cover-letter.js`). Introduced two pattern lists: `assertiveCtaPatterns` (pass: candidate takes initiative — "I will call", "I will follow up", "discuss", "interview") and `passiveCtaPatterns` (warn: "look forward to hearing from you", "await your response", "hope to hear"). If only a passive CTA is present the card shows warn with guidance: "Passive closing detected — consider an assertive follow-up." If no CTA is present the card fails. (Same fix also resolves GAP-137.)
**Description:** Passive closings put the burden of action on the hiring manager. Active closings imply the applicant will follow up (e.g., "I will follow up on [date]").
**Recommended resolution:** Update the CTA validation heuristic to flag passive constructions ("I look forward to hearing", "Please feel free to contact me") and suggest an active alternative.

## GAP-97: No Positive-Sum Metric Framing Preference in CV Writing Guidance

**Severity:** LOW
**Affected stories:** US-P3
**Status:** RESOLVED 2026-06-30 — Added `LLMClient.check_positive_metric_framing(text)` static method in `scripts/utils/llm_client.py`. Flags bullets that pair a negative-framing verb (reduced, cut, eliminated, decreased, slashed, trimmed, shrunk) with a quantified metric (%, $, ×, million, etc.), suggesting positive-sum rewrites such as "freed up 30%" or "delivered a 30% saving". Wired into `run_persuasion_quality_checks()` in `scripts/utils/conversation_manager.py` for experience bullets. 6 unit tests added in `tests/test_llm_client.py`.
**Description:** Negative-framing metrics (cuts, reductions, eliminations) can create unfavorable impressions even when the underlying achievement is positive. Persuasion-optimal CVs frame all quantified outcomes in additive, growth-oriented terms.
**Recommended resolution:** Add a positive-sum framing check to the persuasion heuristic suite. Flag bullets where a quantified negative outcome (reduced, cut, eliminated, decreased) appears without a corresponding positive consequence.

## GAP-98: No Keyboard Shortcuts for Workflow Navigation

**Severity:** HIGH
**Affected stories:** US-W1, US-W3, US-U7
**Status:** RESOLVED 2026-06-30 — Added `web/keyboard-shortcuts.js` module. `initKeyboardShortcuts()` registers a global `keydown` handler called from `app.js:init()`. Shortcuts: `Ctrl+Enter` triggers the primary action button for the current tab (via `_TAB_ACTION_BTN` map); `↑`/`↓` navigate between `.rewrite-card` / `.spell-card` elements; `A` accepts the focused card; `R` rejects the focused card; `?` toggles a floating help panel listing all shortcuts. Single-key shortcuts are suppressed when focus is in a text input or a modal is open. Tab change calls `resetCardFocus()` from `review-table-base.js:switchTab()`. `kb-focused` CSS class highlights the keyboard-active card with a blue outline. `kbd` element style added to `web/styles.css`.
**Description:** The absence of any keyboard shortcut support creates a speed bottleneck for power users and an access barrier for users with motor impairments.
**Recommended resolution:** Implement keyboard shortcuts for: advance to next step (`Ctrl+→`), trigger action button (`Ctrl+Enter`), accept current item (`A`), reject current item (`R`), and navigate between review cards (`↑`/`↓`). Publish shortcuts in a keyboard shortcut reference panel.

## GAP-99: No Bulk Accept/Reject for Rewrites

**Severity:** MEDIUM
**Affected stories:** US-W1, US-U5
**Status:** RESOLVED 2026-06-29 — `acceptAllRewrites()` and `rejectAllRewrites()` buttons exist in the rewrite panel header at `web/rewrite-review.js:187–188`. Both skip already-decided cards. Previously discovered 2026-04-22; but bulk actions were already implemented.
**Description:** The absence of bulk-accept for rewrites is the most significant workflow bottleneck for power users after keyboard shortcuts.
**Recommended resolution:** Add "Accept All Recommended" and "Reject All" buttons to the rewrite review panel header, consistent with the pattern used in the skills review panel (`web/skills-review.js:941`). These should respect existing persuasion-warning gating.

## GAP-100: No Bulk Toolbar for Publications

**Severity:** LOW
**Affected stories:** US-W1
**Status:** RESOLVED 2026-06-30 — Added a bulk-action toolbar above the publications table in `web/publications-review.js`. Three buttons: "Accept Recommended" (sets decisions to match the LLM recommendation), "Accept All", and "Reject All". Implemented as `bulkPubAction(mode)` function exported from the module and exposed on `globalThis` via `src/main.js`. Buttons are rendered in the same `<div>` row as the filter input, right-aligned with `margin-left:auto`.
**Recommended resolution:** Add bulk-accept (accept all recommended) and bulk-reject (reject all non-recommended) controls to the publications review table header.

## GAP-101: No Forward Stage Skip Mechanism

**Severity:** MEDIUM
**Affected stories:** US-W1, US-W3
**Status:** RESOLVED 2026-07-01 — Added `highest_phase` watermark to session state (tracked in `conversation_manager.py:_set_phase()`). `StatusResponse` (`scripts/web_app.py`) and `/api/status` (`scripts/routes/status_routes.py`) now return `highest_phase`. Frontend `updateWorkflowSteps()` (`web/workflow-steps.js`) applies `.forward-skip` class to steps that were previously completed but are ahead of the current phase; `handleStepClick()` shows a `confirmDialog` ("Jump ahead?") before navigating. Styled with dashed blue border + ⏩ badge in `web/styles.css`.
**Description:** Power users iterating on a specific aspect of their CV need to jump stages. The current workflow forces sequential progression even when intermediate stages are already completed.
**Recommended resolution:** Allow forward-skip navigation when all intermediate stages have been previously completed. Guard forward-skip with a lightweight confirmation if any intermediate stage data may be stale.

## GAP-102: Application Submission Status Not Visible in Session List

**Severity:** HIGH
**Affected stories:** US-O2
**Status:** RESOLVED 2026-06-22 (cycle 8) — Added `application_status: str = ''` to `SessionItem` (`scripts/web_app.py:165`). Updated `list_sessions()` (`scripts/routes/session_routes.py:130–142`) to read `metadata.json` from each session directory and include `application_status`. Updated `_normalizeSessionsForTable` and `_renderSessionTableRow` in `web/session-switcher-ui.js` to pass through and render a colour-coded badge (Draft/Ready/Sent) in the phase column.
**Description:** For a user tracking 5–10 active applications, the inability to see submission status in the session list forces them to open and close each session individually.
**Recommended resolution:** Update `GET /api/sessions/list` to include `application_status` from each session's `metadata.json`. Render the status as a badge (Draft / Ready / Sent) in each session row.

## GAP-103: No Post-Archive Metadata Update Endpoint or UI

**Severity:** MEDIUM
**Affected stories:** US-O2
**Status:** RESOLVED 2026-06-29 — Added `PATCH /api/sessions/metadata` route to `scripts/routes/session_routes.py`. Accepts `{ path, application_status?, notes? }`. Validates path is within the output directory, validates status against the extended enum (draft/ready/sent/interview/rejected/accepted), and writes to `metadata.json`. Added "Update status" tag-icon button to saved session rows in `web/session-switcher-ui.js`. Clicking it shows an inline `<select>` widget (same pattern as rename); save/cancel are handled by `startSessionStatusEdit`, `submitSessionStatusEdit`, `cancelSessionStatusEdit`. Badge in the phase column updates in-place without a full re-render. Bundle rebuilt.
**Recommended resolution:** Add a `PATCH /api/sessions/{id}/metadata` endpoint that accepts `application_status` and `notes` updates. Surface a lightweight "Update status" UI in the session list row.

## GAP-104: "Done" Phase Label Misleading for Active-Refinement Sessions

**Severity:** LOW
**Affected stories:** US-S1, US-O2
**Status:** RESOLVED 2026-06-29 — Fixed as part of GAP-112: `SESSION_PHASE_LABELS_SHORT.refinement` changed from "Done" to "Finalise" (`web/utils.js:285`).
**Recommended resolution:** Replace "Done" with "Finalise" or "Refine" for sessions in `refinement` phase without an `application_status`. For sessions with `application_status = 'sent'`, show "Sent". Consider a compound status badge.

## GAP-105: No Cross-Application Summary/Pipeline Dashboard View

**Severity:** MEDIUM
**Affected stories:** US-O4
**Status:** RESOLVED 2026-07-01 — Added company and ATS score to the sessions list. `SessionItem` dataclass (web_app.py) gains `ats_score: Optional[int]` and `company: str`. `session_routes.py:list_sessions()` now reads `ats_score` from `metadata.json` (handling both `int` and `{"overall": N}` shapes) and `company` from `state.job_analysis.company`. `session-switcher-ui.js:_normalizeSessionsForTable()` adds `company` and `atsScore` to row objects. `_renderSessionTableRow()` renders company as a sub-label under the role title and ATS score as a color-coded pill (green ≥75%, amber ≥50%, red <50%) next to the phase label. Existing application_status badge, action buttons, and sort/filter behavior are unchanged.
**Description:** A user managing 5–10 simultaneous applications needs a consolidated pipeline view to track progress, identify actions needed, and assess overall campaign health.
**Recommended resolution:** Add an "Applications" dashboard view that shows all sessions with columns for: company, role title, application status, ATS score, date last modified, and a quick-action button.

## GAP-106: No Generation Timestamp Shown in File List

**Severity:** MEDIUM
**Affected stories:** US-O3, US-S3
**Status:** RESOLVED - 2026-06-29. `_renderDownloadGrid()` in `web/download-tab.js` now accepts a `generatedAt` parameter. `populateDownloadTab()` passes `cvData.metadata?.generation_date` to that function, and each download card displays a "Generated {date}" label (e.g. "Generated Jun 29, 2026 at 2:23 PM") beneath the file description. The `metadata.generation_date` field is already present in the `generated_files` state returned by `/api/status` — no backend changes needed.
**Description:** Multiple generation passes within a session produce files with the same date-stamped naming pattern. Without a visible "generated at" timestamp, users cannot confirm currency after re-generation.
**Recommended resolution:** Include a `generatedAt` timestamp in the `cvData.files` response and render it alongside each file in the download grid.

## GAP-107: Synonym Grouping Absent from Analysis UI

**Severity:** HIGH
**Affected stories:** US-R1, US-H4
**Status:** RESOLVED 2026-06-30 — `populateAnalysisTab` in `web/review-table-base.js` now fetches `GET /api/synonym-map` (already implemented) once per session and annotates each ATS keyword badge. Aliases show their canonical expansion (e.g. "ML = Machine Learning"); canonical terms show their known aliases (e.g. "Machine Learning (ML, AI)"). Annotations appear as small grey text inside each keyword badge and as a `title` tooltip. The synonym map is cached in `_synonymMapCache` after the first fetch.
**Description:** Without synonym grouping in the analysis display, users cannot determine which keyword variants are being resolved together and cannot make informed decisions about which form to use in their CV text.
**Recommended resolution:** Update `populateAnalysisTab` (`web/review-table-base.js`) to group canonical keywords with their synonym aliases. Mark each keyword as "exact match", "synonym match", or "partial match".

## GAP-108: Default Experience Sort Is Recency-Biased, Not Relevance-Based

**Severity:** HIGH
**Affected stories:** US-R2, US-U4
**Status:** RESOLVED — 2026-06-30. Updated the default sort in `buildExperienceReviewTable()` (`web/experience-review.js`): when no saved row order exists, experiences now sort by LLM recommendation strength (Emphasize=0, Include=1, De-emphasize=2, Omit=3) as primary key, with reverse-chronological end-date as secondary key. Uses `getExperienceRecommendation(expId, data)` which is already in scope. User-saved orders are still restored first.
**Description:** For career-changers or those with highly relevant older roles, the recency-biased default sort means the most relevant experience may appear at the bottom of the review table.
**Recommended resolution:** Change the default sort order on first load to order by LLM recommendation strength (Emphasize > Include > De-emphasize > Omit) as the primary key, with recency as a secondary key. Show a "Sorted by relevance" label and allow users to switch to recency sort.

## GAP-109: Domain Inference Confidence Not Surfaced

**Severity:** MEDIUM
**Affected stories:** US-R1
**Status:** RESOLVED 2026-06-30 — The domain chip in `populateAnalysisTab` (`web/review-table-base.js:321`) now shows a confidence indicator. `domain_confidence` (already returned by the LLM as a 0–1 float) is read from the analysis data: ≥0.8 = no annotation; 0.6–0.8 = "⚠" + medium-confidence tooltip; <0.6 = "⚠" + low-confidence tooltip advising the user to verify the domain. The `title` attribute carries the full explanation.
**Description:** The analysis prompt infers a technical domain that affects keyword weighting and skill ordering. When this inference is ambiguous or wrong, users have no signal to challenge it and no mechanism to override it.
**Recommended resolution:** Include a `domain_confidence` field (High/Medium/Low) in the job analysis response and display it alongside the domain badge. For Low confidence, add an inline "Is this correct?" override that lets users select from alternatives or enter a custom domain.

## GAP-110: No Restored-Decisions Summary on Session Return

**Severity:** HIGH
**Affected stories:** US-S1, US-S3
**Status:** RESOLVED 2026-06-29 — Added `_appendRestoredDecisionsSummary()` called after `restoreBackendState()` returns `serverHasData=true` in `restoreSession()` (`web/session-manager.js`). Appends a system message: "📋 Restored at stage: {phaseLabel} — N experiences recommended, N skills recommended, ATS score N%." Uses data already present in stateManager after restore. Previously discovered 2026-04-22; restore only showed the raw phase name with no decision summary.
**Description:** A returning user's first question after re-opening a session is "where did I leave off?" The current restore message answers "what stage" but not "what did I decide".
**Recommended resolution:** After session restore, display a brief "Restored decisions" summary panel showing: N experiences selected (N recommended), N skills included, N/M rewrites approved, last activity timestamp. The panel should appear for the first visit after restoration and be dismissible.

## GAP-111: "Move to Trash" Executes Without Confirmation Dialog

**Severity:** LOW
**Affected stories:** US-S3
**Status:** RESOLVED 2026-06-29 — Added `confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` guard at the top of `_deleteSessionFromModal()` in `web/session-switcher-ui.js:557–560`. Matches the pattern already used by Delete Forever and Empty Trash.
**Description:** Both "Delete Forever" and "Empty Trash" use `confirmDialog()` before proceeding. "Move to Trash" does not, creating an inconsistent behavior pattern.
**Recommended resolution:** Add a `confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the API call in `_deleteSessionFromModal()`.

## GAP-112: Abbreviated Phase Labels Opaque to Returning Users

**Severity:** MEDIUM
**Affected stories:** US-S1, US-O2
**Status:** RESOLVED 2026-06-29 — Updated `SESSION_PHASE_LABELS_SHORT` in `web/utils.js:277–287`: `init` → "Setup", `customization` → "Customising", `rewrite_review` → "Rewrites", `spell_check` → "Spell Check", `refinement` → "Finalise", `final_generation` → "Final Gen". Ambiguous "Custom" and misleading "Done" are gone.
**Recommended resolution:** Expand `SESSION_PHASE_LABELS_SHORT` to use more descriptive labels: "Customising", "Reviewing rewrites", "Finalising", "Generated". Update "Done" for `refinement` to "Finalise" or a phase-appropriate label.

## GAP-113: No Session Duplicate/Copy Action

**Severity:** LOW
**Affected stories:** US-W3, US-S3
**Status:** RESOLVED 2026-06-30 — Added `POST /api/sessions/duplicate` endpoint in `scripts/routes/session_routes.py`. Deep-copies the session directory under a new UUID-based name, updates `session_id` and `position_name` (" (Copy)" suffix) in the new `session.json`. Added a copy icon button (`data-sm-action="duplicate"`) to each saved-session row in the sessions modal (`web/session-switcher-ui.js`). `_duplicateSessionFromModal()` calls the endpoint and refreshes the modal on success.
**Recommended resolution:** Add a "Duplicate session" action to the sessions modal row that creates a deep copy of the session directory and state file under a new session ID and name.

## GAP-114: Session Rename Uses `window.prompt()` Instead of In-App Modal

**Severity:** LOW
**Affected stories:** US-S3, H4
**Status:** RESOLVED 2026-06-18 — `promptRenameCurrentSession()` now shows an inline `<input>` field with ✓/✕ buttons directly in the header, using `showToast()` for errors. No `window.prompt()` or `alert()` calls remain. `web/session-manager.js`. Previously discovered 2026-04-22.
**Recommended resolution:** Replace `promptRenameCurrentSession()` with an in-app modal using the existing `confirmDialog()` infrastructure. Alternatively, wire the header ✏️ button to open the sessions modal with the rename field pre-focused.

## GAP-115: Persistent Non-Confidential LLM Provider Warning Absent After Setup

**Severity:** HIGH
**Affected stories:** US-C1, US-C3
**Status:** RESOLVED 2026-06-29 — Added `#llm-non-confidential-badge` amber pill in the LLM header area (`web/index.html`, after `#llm-status-pill`). Badge is shown/hidden in `updateAuthBadge()` (`web/auth-provider.js`) by calling `getProviderInfo(activeProvider)` (now a direct import from `provider-info.js`) and checking `info.confidential === false`. Badge reads "⚠ Non-confidential" and links to provider details via tooltip. Previously discovered 2026-04-22; no persistent indicator after wizard close.
**Description:** A user who configured Gemini free-tier at startup and never re-opened the wizard has no ongoing reminder that their CV and job description content may be reviewed by Google. The header pill shows only model name and auth status.
**Recommended resolution:** Add a persistent visual indicator (e.g., an amber "⚠ Non-confidential" badge in the header LLM pill) when the active provider has `confidential: False`. The indicator should link to the provider privacy policy.

## GAP-116: Per-Item Decision Gate Absent from Customization Stages

**Severity:** MEDIUM
**Affected stories:** US-C2, US-A3
**Status:** RESOLVED 2026-06-30 — `handleActionClick()` in `web/review-table-base.js` now records each individual item click into `window._explicitlyReviewed.{experiences,skills}` Sets. The generate button handler in `web/app.js` computes unreviewed counts before calling `fetchAndReviewRewrites()`; if any items remain unreviewed, a `window.confirm()` soft gate displays "X experience entries / Y skills not individually reviewed — the AI's recommendation will be used for these. Proceed anyway?" Users can dismiss to return and review, or confirm to proceed.
**Description:** The rewrite review panel requires explicit per-item decisions before submission is enabled. The customization stage has no equivalent gate. This asymmetry means users can produce a final CV where all customization decisions were made by the LLM without any user review.
**Recommended resolution:** Add a soft gate to the Generate action that warns when any customization section has items that have never been individually reviewed. Display a count: "3 experience recommendations not reviewed — proceed anyway?" The rewrite panel's existing gate pattern is the reference implementation.

## GAP-117: AI-Generated Summary Variants Have No AI-Proposal Label

**Severity:** MEDIUM
**Affected stories:** US-C1, US-C3
**Status:** RESOLVED 2026-06-29 — AI-generated panel heading changed from "AI-Generated Summary" to "🤖 AI-Proposed Summary" (`web/summary-review.js:72`). Stored master CV summary radio buttons now show a "📄 From your Master CV" badge next to the key label (`summary-review.js:142`). Previously discovered 2026-04-22; no label distinguished AI proposals from user-authored variants.
**Description:** Users cannot distinguish between summaries they wrote and summaries the AI generated. This undermines the transparency model that the rest of the review flow (word-level diffs, confidence badges) is designed to enforce.
**Recommended resolution:** Label AI-generated summary variants with an "🤖 AI-proposed" badge. User-authored summaries from master data should be labeled "📄 From your Master CV".

## GAP-118: No Session Audit Panel Accessible from Finalise Tab

**Severity:** MEDIUM
**Affected stories:** US-C3
**Status:** RESOLVED 2026-06-29 — Added `_renderRewriteAuditLog()` in `web/finalise.js` called from `populateFinaliseTab()`. Fetches `rewrite_audit` from `/api/rewrites`, renders a collapsible `<details>` table showing Field, Original, Final, and Outcome (✅ accepted / ✏️ edited / ❌ rejected) for each decision. Only shown when audit has at least one entry. Previously discovered 2026-04-22; `rewrite_audit` was persisted to session.json but never surfaced in the UI.
**Description:** For compliance use cases (confirming what AI changes were accepted before submitting a CV to a regulated employer), the absence of an audit view is a gap. The data exists but is inaccessible through the UI.
**Recommended resolution:** Add a collapsible "Rewrite audit log" section to the Finalise tab that renders the `rewrite_audit` array in a readable table: proposal, original text, final text, outcome (accepted/edited/rejected), timestamp.

## GAP-119: AI Attribution Option Absent from Generated Files

**Severity:** LOW
**Affected stories:** US-C3
**Status:** RESOLVED 2026-06-30 — Added `ai_attribution` toggle to the Settings modal (`web/index.html`, `web/ui-core.js`). When enabled: (1) ATS DOCX sets `core_properties.keywords = "AI-assisted"` and `core_properties.subject` to a disclosure string; (2) Human DOCX appends "Generated with AI assistance" to the footer alongside the generation timestamp; both also set DOCX document properties. Backend plumbing: `POST /api/generation-settings` accepts `ai_attribution` and stores it in session state and `customizations`; `GET /api/status` returns `ai_attribution`; `StatusResponse` dataclass updated. Defaults to off.
**Recommended resolution:** Add an optional "AI-assisted" disclosure setting (default off). When enabled, include a document property and optionally a footer note in generated PDF/DOCX files noting that AI assistance was used.

## GAP-120: Tab `<div>` Elements Keyboard-Inaccessible — CRITICAL

**Severity:** CRITICAL
**Affected stories:** US-U7, US-X1, and all workflow stories
**Status:** RESOLVED 2026-06-18
**Description:** All viewer tab `<div role="tab">` elements were missing `tabindex`, making them unreachable by keyboard. Arrow-key keydown handlers existed but could never fire without initial keyboard reachability.
**Fix:** Added `tabindex="0"` to the initial active tab (`tab-job`) and `tabindex="-1"` to all other tabs in `web/index.html`. Added Enter/Space key activation to the `keydown` handler in `web/ui-core.js`. Updated `switchTab()` in `web/review-table-base.js` to maintain roving tabindex — sets `tabindex="-1"` on all tabs then `tabindex="0"` on the newly active tab. All 22 tabs now reachable via Tab then Arrow keys per WCAG 2.1 Level A tablist pattern.

## GAP-121: Layout Clarification Uses `window.prompt()` — Accessibility Anti-Pattern

**Severity:** MEDIUM
**Affected stories:** US-U9, US-X2
**Status:** RESOLVED 2026-06-29 — Replaced `window.prompt()` with an inline amber panel injected after the instruction input container. Panel includes: a `role="alert"` wrapper, the LLM question text, a labelled `<textarea>` pre-filled with the original instruction, Submit and Cancel buttons, Escape/Enter keyboard handling. Focus moves to the textarea on open. No `trapFocus()` needed (panel is inline, not modal). `web/layout-instruction.js:1109`.
**Description:** `window.prompt()` is inconsistent with the application's custom modal infrastructure (`confirmDialog()`, `showAlertModal()`, `trapFocus()`). It cannot be styled and breaks the keyboard focus chain.
**Recommended resolution:** Replace `showClarificationDialog()` with an inline clarification input rendered within the layout pane — a text input field that appears below the instruction textarea with a "Submit clarification" button, using the application's existing `trapFocus()` infrastructure.

## GAP-122: Workflow Bar Overflow at 1280px Viewport Width

**Severity:** MEDIUM
**Affected stories:** US-U8, H8
**Status:** RESOLVED 2026-06-29 — Added `@media (max-width: 1400px) { .workflow-steps { gap: 16px; } .workflow { padding: 14px 16px; } }` in `web/styles.css`. Previously discovered 2026-04-22; UX expert review found `web/styles.css:146` defines `.workflow-steps { display: flex; gap: 32px; }` without `flex-wrap: wrap`. With 8 step pills and 7 arrows at 32px gap, the workflow bar risks horizontal overflow on 1280px viewport widths.
**Description:** At 1280px, the 8-step workflow bar may truncate or overflow without wrapping, hiding step pills from view. This creates an inconsistent experience for users on smaller laptop displays.
**Recommended resolution:** Add `flex-wrap: wrap` or reduce `gap` to 16px at viewports ≤1400px via a media query. Alternatively, introduce abbreviated step labels at narrow widths.

## GAP-123: `#layout-freshness-chip` Button Has Empty `aria-label=""`

**Severity:** HIGH
**Affected stories:** US-U7, US-X2
**Status:** RESOLVED 2026-06-18 — Changed initial `aria-label=""` to `aria-label="Layout freshness"` in `web/index.html:95`. `refreshLayoutStatusUI()` continues to update the label dynamically when freshness state changes. Previously discovered 2026-04-22; UX expert review found `web/index.html:87` — `<button id="layout-freshness-chip" ... aria-label="">`. An explicitly empty `aria-label` on a focusable interactive element causes screen readers to announce the button with no accessible name. This is a WCAG 2.1 Level A failure.
**Description:** The layout freshness chip is a focusable button that communicates layout currency state. Screen reader users navigating by Tab reach this button and hear nothing — the button has no announced purpose or label.
**Recommended resolution:** Set `aria-label` to a meaningful value that includes the current freshness state, e.g., `aria-label="Layout freshness — layout is current"`. Update the label dynamically as freshness state changes.

## GAP-124: `final_generation` Missing from SESSION_PHASE_LABELS

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/utils.js:262–285` defines `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` but omits the `final_generation` phase key. Sessions in the `FINAL_GENERATION` phase display the raw Python string "final generation" (lowercase, with space) in the session switcher instead of a human-readable label.
**Fix:** Added `final_generation: 'Final Generation'` to `SESSION_PHASE_LABELS` and `final_generation: 'Final Gen'` to `SESSION_PHASE_LABELS_SHORT` in `web/utils.js`.
**Source evidence:** `web/utils.js:262–285`; returning-user persona review 2026-06-18.

## GAP-125: Layout Scope Label Invites Text Changes

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/layout-instruction.js:293` renders the placeholder/label "Describe a layout or text change — the AI will determine the right approach." This directly contradicts US-U9 AC 1 and AC 7, which require that only layout changes are accepted at this stage and that approved text is never modified. The label actively encourages users to request text changes that should be blocked.
**Fix:** Label updated to "Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." `web/layout-instruction.js:293`.
**Source evidence:** `web/layout-instruction.js:293`; ux-expert.md 2026-06-18.

## GAP-126: Cover Letter Word Count Hardcoded for All Role Types

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — `_cover_letter_word_count_instruction(job_analysis)` helper added to `scripts/routes/master_data_routes.py`. Reads `role_level` and `domain` from `job_analysis`; returns 300–400w (standard), 400–500w (executive), or 500–600w (academic/research). Prompt line 1601 now calls this helper instead of hardcoding `~250–300 words`.
**Found:** 2026-06-18 cvUiReview
`scripts/routes/master_data_routes.py:1566` hard-codes the cover letter length target as `~250-300 words` regardless of role type. US-M6 requires: 300–400w for standard roles, 400–500w for executive roles, 500–600w for research/academic roles. The current prompt will underdeliver for executive and academic candidates.
**Source evidence:** `scripts/routes/master_data_routes.py:1566`; hiring-manager.md 2026-06-18.

## GAP-127: `candidate_to_confirm` Skills Not Rendered in Review UI and Not Excluded from Output

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Both template rendering paths now filter `candidate_to_confirm` skills. HTML skills grid (`templates/cv-template.html:628`) and plaintext ATS block (`:777`) each wrap the skill emission in `{% if not skill.candidate_to_confirm %}`. A Jinja2 `namespace` variable tracks the first-emitted item in the plaintext comma-separated list to avoid leading commas. Skills flagged for confirmation remain visible in the review UI (with the ⚠ badge from the cycle 6 fix) so users can still confirm/delete them, but they are silently excluded from generated PDF/DOCX/HTML until confirmed.
**Found:** 2026-06-18 cvUiReview
`scripts/utils/cv_orchestrator.py:1779` sets a `candidate_to_confirm` flag on skill additions that have weak evidence. However, `web/` has zero references to `candidate_to_confirm` in any rendering code — the flag is never displayed to the user in the skills review tab. Furthermore, no output rendering code checks this flag before including the skill in generated PDF/DOCX/HTML. Skills with unconfirmed evidence are indistinguishable from confirmed skills in both the review UI and the generated artefacts.
**Partial fix (cycle 6):** `web/skills-review.js` now reads `skill.candidate_to_confirm` and renders a `⚠ Verify evidence` badge (dark red, with explanatory tooltip) next to the skill name in the review table. Users can now visually identify and remove weak-evidence skills before generating output.
**Source evidence:** `scripts/utils/cv_orchestrator.py:1779`; `web/skills-review.js`; `templates/cv-template.html:628,777`.

## GAP-128: Rejected Rewrites Absent from `rewrite_audit`

**Priority:** HIGH
**Status:** FALSE POSITIVE — CLOSED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/rewrite-review.js:361` was misidentified as the audit-recording code — it is actually `updateRewriteTally()`, which counts accepted/rejected/pending proposals for the UI counter display. The actual audit recording is in `scripts/utils/conversation_manager.py:submit_rewrite_decisions()` (lines 1100–1104), which appends EVERY decision (including `outcome='reject'`) to `audit`, then stores it as `state['rewrite_audit']`. The submit button is also gated on `pending === 0` (line 376), ensuring all proposals have a decision before submission. No code change required.

## GAP-129: ATS Report Modal Lacks Focus Management

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/ats-modals.js:112–141` opens the ATS Report modal with `style.display = 'flex'` but does not call `setInitialFocus()`, `trapFocus()`, or `restoreFocus()`. On close, keyboard focus returns to `<body>` rather than the triggering element. Screen reader and keyboard users cannot use this modal reliably.
**Fix:** `openAtsReportModal()` now saves `document.activeElement`, moves focus to the Close button, and registers an Escape key listener. `closeAtsReportModal()` removes the listener and restores focus to the saved element. `web/ats-modals.js`.
**Source evidence:** `web/ats-modals.js:112`; accessibility-specialist.md 2026-06-18.

## GAP-130: Persuasion Warning Panel Collapsed by Default — Bypass Possible

**Priority:** MED
**Status:** RESOLVED — already fixed (confirmed 2026-06-18 code check)
**Found:** 2026-06-18 cvUiReview
`web/rewrite-review.js:107` initialises the persuasion warnings panel in a collapsed state. The "Acknowledged" button is rendered inside the collapsed section (`rewrite-review.js:114`). A user can click "Proceed anyway?" (line 383–389) to bypass the entire warning panel without expanding it or reading any individual warning. This violates the trust requirement that persuasion warnings must be reviewed before proceeding.
**Resolution:** The panel already defaults to `display:block` at `rewrite-review.js:107`. This was fixed as part of GAP-45 resolution (persuasion gate hardening). No further change needed.
**Source evidence:** `web/rewrite-review.js:107, 114, 383–389`; trust-compliance.md 2026-06-18.

## GAP-131: No Blocking Gate at Customise Stage

**Priority:** MED
**Status:** RESOLVED 2026-07-01 — Added advisory warning to `_confirmProceedToGenerate()` in `web/spell-check.js`. After the tagline hard-gate check, the modal now reads `decisions_confirmed` from `/api/status` and adds "⚠ No customisation sections reviewed — experience, skill, and achievement selections are all LLM defaults." when none of `experiences`, `skills`, or `achievements` appear in `decisions_confirmed`. The warning is informational (non-blocking) because the tagline hard block already prevents completely unreviewed generation; the new message ensures users are aware of un-reviewed defaults without adding friction for intentional skip. Tagline hard block still enforced.
**Found:** 2026-06-18 cvUiReview
Users can proceed from the Customise stage to CV generation without visiting or making any decision on experience, skill, or achievement items. All customisation decisions silently inherit LLM defaults. There is no progress gate or minimum-decision requirement (e.g., "Review at least one experience item") before the Generate button becomes active at the Customise stage.
**Source evidence:** `web/app.js:123–130`; trust-compliance.md 2026-06-18.

## GAP-132: Two Divergent CV Output Templates with Different Visual Identities

**Priority:** HIGH
**Status:** RESOLVED 2026-07-01 (cycle 28) — `_create_fallback_html_file()` in `cv_orchestrator.py` now renders `cv-template.html` via Jinja2 (same as the primary generation path) so the Quarto fallback and primary path are visually identical. A secondary fallback to the simple string-builder remains only if Jinja2 rendering itself throws. `cv-style.css` brand colors updated from `#2c5aa0` to `#2980b9` and font changed from Segoe UI to Inter for the rare triple-failure case.
**Source evidence:** `templates/cv-template.html`; `templates/cv-style.css`; `scripts/utils/cv_orchestrator.py:_create_fallback_html_file()`; graphical-designer.md 2026-06-18.
**Note:** `cv-style.css` is only referenced by the Quarto fallback path `_create_fallback_html()` — NOT by the layout preview or DOCX generation. The original gap description conflated this with the HTML-preview vs DOCX difference (which is expected given different rendering engines).

## GAP-133: No CSS Design Token Layer

**Priority:** MED
**Status:** PARTIAL 2026-07-04 (cycle 52) — `web/styles.css` token layer **complete**: 95 CSS custom properties in `:root`; zero raw hex literals remain in CSS rules. Added 5 tokens in cycle 52: `--cv-violet-800`, `--cv-sky-900`, `--cv-log-bg`, `--cv-teal-700`, `--cv-hc-link`. ~227 inline `style=""` attributes in `web/index.html` remain as a separate follow-up (deferred to after GAP-01 lands to avoid merge conflicts).
**Found:** 2026-06-18 cvUiReview
`web/styles.css` contains approximately 50 hard-coded hex color literals scattered across rules. `web/index.html` contains approximately 216 inline `style=""` attributes. No `:root {}` CSS custom properties block exists. Any color, spacing, or typography change requires grep-and-replace across multiple files with high risk of missed instances, and brand changes are impractical to apply consistently.
**Source evidence:** `web/styles.css` (`:root {}` block added line 18); `web/index.html` (~227 inline styles still pending); graphical-designer.md 2026-06-18.

## GAP-134: No "Queued" Session Status in Schema

**Priority:** LOW
**Status:** RESOLVED 2026-07-01 (cycle 20) — Added `"parked"` to `_VALID_STATUSES` in `scripts/routes/session_routes.py` and to both `appStatusLabels`/`_appStatusLabels` (label: "Parked") and `appStatusColors`/`_appStatusColors` (colour: `#f97316` orange) in `web/session-switcher-ui.js`. Users can now mark sessions as intentionally set aside for later. The status schema already contained `interview`, `rejected`, and `accepted` beyond the original report; `parked` completes the set.
**Found:** 2026-06-18 cvUiReview
The session status schema accepts only `draft`, `ready`, and `sent`. US-A1 implies a `queued` or `parked` state for sessions where intake is complete but the user has deliberately set them aside for later. Without this state, users have no way to mark sessions as intentionally pending.
**Source evidence:** `scripts/routes/session_routes.py` (status enum); applicant.md 2026-06-18.

## GAP-135: Intake Confirmation Fields Not Inline-Editable

**Priority:** MED
**Status:** FALSE POSITIVE — RESOLVED 2026-07-01. Source-verified: `_showIntakeConfirmCard()` in `web/message-dispatch.js:438–459` renders an editable card with fully functional `<input type="text">` elements for Role/Job Title and Company, plus `<input type="date">` for Date Applied. The original report looked in `web/job-input.js` but the implementation lives in `web/message-dispatch.js`. All three fields are freely editable before the user clicks "Confirm & Continue".
**Found:** 2026-06-18 cvUiReview
After URL fetch populates the job intake confirmation card (company, role, date, location, salary fields), those fields are displayed as read-only text. US-U2 AC4 requires that these extracted fields be inline-editable so the user can correct extraction errors without re-fetching. `web/job-input.js:49–84` and `web/review-table-base.js:222–248` show no inline edit mechanism for the confirmation card fields.
**Source evidence:** `web/job-input.js:49–84`; ux-expert.md 2026-06-18.

## GAP-136: No Post-Generation Cover Letter Word Count Enforcement

**Priority:** MED
**Status:** RESOLVED 2026-06-29 — Source-verified false positive. `_validateCoverLetter()` in `web/cover-letter.js:543–576` already implements role-differentiated word count validation with a color-coded progress bar: standard 300–400w, executive 400–500w, academic 500–600w, each with warn zones. The check runs on every textarea `input` event (line 275) and on post-generation populate (line 479 — called after the LLM returns the letter). The `wcStatus` pass/warn/fail gates match US-P5 AC3 exactly.
**Found:** 2026-06-18 cvUiReview
US-P5 AC3 requires a programmatic check that the generated cover letter falls within the target word count range for the role type. Currently, the only mechanism is the LLM prompt instruction (`master_data_routes.py:1566`). No post-generation validation counts words and warns or blocks if the output is outside range. LLMs routinely deviate from length instructions.
**Source evidence:** `scripts/routes/master_data_routes.py:1566`; persuasion-expert.md 2026-06-18.

## GAP-137: Cover Letter CTA Check Accepts Passive Closings

**Priority:** MED
**Status:** RESOLVED 2026-06-29 — Source-verified false positive. `_validateCoverLetter()` (`web/cover-letter.js:578–603`) explicitly distinguishes assertive CTAs (pass: "I will follow up", "discuss", "interview") from passive CTAs (warn: "look forward to hearing from you", "await your response"). Passive closings produce a `warn` card with the specific advisory: "consider an assertive follow-up: 'I will contact your office next week.'" This satisfies US-P5 AC4.
**Found:** 2026-06-18 cvUiReview
US-P5 AC4 requires the cover letter to contain a specific, active call-to-action (e.g., "I will follow up on [date]" rather than "I look forward to hearing from you"). No post-generation pattern check distinguishes passive from active CTAs. The LLM prompt mentions "call to action" but does not enforce the active/specific requirement with a verifiable rule.
**Source evidence:** `scripts/routes/master_data_routes.py:1570`; persuasion-expert.md 2026-06-18.

## GAP-138: Professional Summary Prompt Uses Title-First Opener (Not Value-Identity-First)

**Priority:** MED
**Status:** RESOLVED 2026-06-29 — Duplicate of GAP-163 (resolved 2026-06-20). `scripts/utils/llm_client.py:850` now instructs: "Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula". Source-verified 2026-06-29.
**Found:** 2026-06-18 cvUiReview
US-P1 AC1 requires the summary to open with a value-identity-first framing (e.g., "Scaling ML inference pipelines…") rather than a title-and-tenure opener (e.g., "Senior ML Engineer with 8 years of experience…"). `scripts/utils/llm_client.py:850` instructs the LLM with a title-first opener pattern, producing summaries that fail the persuasion expert's value-identity requirement.
**Source evidence:** `scripts/utils/llm_client.py:850`; persuasion-expert.md 2026-06-18.

## GAP-139: `post_analysis_answers` Not Passed to `generate_professional_summary`

**Priority:** MED
**Status:** RESOLVED 2026-06-29 — Added `post_analysis_answers: Dict = None` parameter to `generate_professional_summary` in `scripts/utils/llm_client.py:754`. When provided, builds a "CANDIDATE CONTEXT (from interview Q&A)" block (up to 6 Q&A pairs) injected into both the fresh and refinement prompt paths. Route `POST /api/generate-summary` (`scripts/routes/master_data_routes.py:1175`) now reads `post_analysis_answers` from `conversation.state` and passes it through.
**Found:** 2026-06-18 cvUiReview
Clarification answers (`post_analysis_answers`) are injected into the cover letter and screening question prompts but are absent from the `generate_professional_summary` call at `scripts/utils/llm_client.py:754`. The summary LLM therefore lacks the user's clarification context (e.g., "I led the team during the reorg") that was provided during the analysis phase. This context is material to producing a personalized, accurate summary.
**Source evidence:** `scripts/utils/llm_client.py:754`; persuasion-expert.md 2026-06-18.

## GAP-140: Icon-Only Controls Missing `aria-label`

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
Two always-visible interactive elements in the header have no accessible name: (1) `#toggle-chat` (`web/index.html:149`) — the ◀/▶ panel collapse button; (2) `#rename-session-btn` (`web/index.html:76–79`) — the ✏️ rename button. Additionally, multiple modal close `×` buttons across the application use `title` attribute only (not reliably announced by screen readers) with no `aria-label`. This is a WCAG 2.1 Level A failure for each of these elements.
**Fix:** Added `aria-label` and `aria-expanded` to `#toggle-chat`; `toggleChat()` in `web/ui-core.js` updates both attributes on each toggle. Added `aria-label` to `#rename-session-btn`. Added specific `aria-label` values to all 6 modal close `×` buttons in `web/index.html`.
**Source evidence:** `web/index.html:76–79, 149`; accessibility-specialist.md 2026-06-18.

## GAP-141: BibTeX CRUD Modal Converts `editor` Field to `author` on Save

**Priority:** MED
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
The publication CRUD modal in `web/master-cv.js` loads the `editor` BibTeX field into the `author` input field (`master-cv.js:1448`) and always saves the result back as `fields.author` (`master-cv.js:1498`). For edited volumes and book chapters where the BibTeX entry has an `editor` field but no `author` field, one CRUD modal save silently converts the `editor` to `author`, corrupting the BibTeX entry and breaking citation formatting.
**Fix:** Added `_pubModalUsesEditorField` flag. `editMasterPublication()` sets the flag when the entry has `editor` but no `author`, and updates the label to "Editor(s)". `saveMasterPublication()` saves as `fields.editor` when the flag is true. `showAddPublicationModal()` resets the flag. `web/master-cv.js`.
**Source evidence:** `web/master-cv.js:1448, 1498`; master-cv-curator.md 2026-06-18.

## GAP-142: Bulk BibTeX Import Skips Per-Entry Required-Field Validation

**Priority:** MED
**Status:** RESOLVED 2026-07-01 — Added per-entry required-field validation in `POST /api/master-data/publications/import` (`scripts/routes/master_data_routes.py`). After parsing, each entry is checked for: non-empty `title`, non-empty `year`, and at least one of `authors` or `editor`. Entries failing any check are logged as warnings and collected in `invalid` / `invalid_keys` response fields rather than silently imported. Both frontend import handlers (`master-cv.js:_importPublications()` and `convertPublicationText()`) now show the rejected count and key list in the confirmation modal.
**Found:** 2026-06-18 cvUiReview
`POST /api/master-data/publications/import` at `scripts/routes/master_data_routes.py:1375–1415` validates that the uploaded file parses as valid BibTeX but does not validate required fields (title, year, author or editor) on a per-entry basis. Entries missing required fields are imported silently and may produce malformed citations in the generated CV.
**Source evidence:** `scripts/routes/master_data_routes.py:1375–1415`; master-cv-curator.md 2026-06-18.

## GAP-143: `showConfirmModal` Missing Focus Management

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview (cycle 2)
`showConfirmModal` in `web/ui-helpers.js:41–48` sets `display: block` on the confirm modal overlay with no `setInitialFocus`, no `trapFocus`, and `closeConfirmModal` calls no `restoreFocus`. This is a separate code path from `confirmDialog` (which is also deficient per GAP-34). Screen reader and keyboard users can tab out of the modal into the background, and focus is not returned to the triggering element on close. This affects all confirm dialogs triggered via `showConfirmModal` (cover letter generation, rewrite submission, etc.).
**Fix:** `showConfirmModal` now saves `document.activeElement` and moves focus to the OK button on open; `closeConfirmModal` restores focus to the saved element on close. `web/ui-helpers.js`.
**Source evidence:** `web/ui-helpers.js:41–53`; accessibility-specialist.md 2026-06-18 (cycle 2).

## GAP-144: Harvest Preselects High/Medium Confidence Items by Default (Opt-In Violation)

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview (cycle 2)
`web/harvest.js:101–103` pre-checks all harvest candidates with `confidence === 'high' || confidence === 'medium'` on render. The applicant story (US-A11) requires that master CV updates are opt-in only — no candidate should be selected without explicit user action. Pre-selection biases users toward accepting every AI recommendation and can result in unintended master CV changes if the user clicks "Save Selected" without reviewing each item.
**Fix:** `shouldPreCheck()` changed to always return `false`; `preCheckedCount` dead variable removed; UI text updated to describe opt-in behavior. `web/harvest.js`.
**Source evidence:** `web/harvest.js:101–103`; applicant.md 2026-06-18 (cycle 2).

## GAP-145: Cover Letter and Screening DOCX Filenames Omit Role Token

**Priority:** LOW
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview (cycle 2)
Cover letter files are named `CoverLetter_{company}_{date}.docx` and screening responses are named `Screening_Responses_{date}.docx` (no company for screening). Neither includes the role/position token used in CV filenames (`CV_{company}_{role}_{date}.*`). For same-company same-day applications (e.g., two different roles at the same firm), cover letter files will collide and the second will silently overwrite the first.
**Fix:** Cover letter filename is now `CoverLetter_{company}_{role}_{date}.docx`; screening filename is now `Screening_{company}_{role}_{date}.docx`. Both read role from `job_analysis.title`. `scripts/routes/master_data_routes.py:1638, 1869`. Secondary fix: `web/download-tab.js:53` updated `startsWith('Screening_Responses_')` → `startsWith('Screening_')` to match the new prefix.
**Source evidence:** `scripts/routes/master_data_routes.py:1638, 1869`; `web/download-tab.js:53`; recruiter-ops.md 2026-06-18 (cycle 2).

---

## 2026-06-18 (Cycle 3) New Gaps (GAP-146 through GAP-154)

*Discovered during the 15-persona + heuristic review cycle 3, 2026-06-18.*

---

## GAP-146: `toggleChat` Duplicate in `ui-helpers.js` Overwrites ARIA-Aware Version in Bundle

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview cycle 3
`web/ui-helpers.js` defined and exported a `toggleChat` function that only updated `textContent` on the toggle button. Because `ui_helpers_exports` is spread into `globalThis` AFTER `ui_core_exports` in `web/bundle.js`, this inferior version overwrote the correct ARIA-aware `toggleChat` from `web/ui-core.js:684–705` (which updates `aria-label` and `aria-expanded` on every toggle). After the first click, the `#toggle-chat` button announced wrong state to screen readers.
**Fix:** Removed the duplicate `toggleChat` function definition and export from `web/ui-helpers.js`. `web/ui-core.js` version now exclusively controls the toggle. Bundle rebuilt.
**Source evidence:** `web/ui-helpers.js:84–98` (removed); `web/ui-core.js:684–705`; `web/bundle.js` globalThis spread order; accessibility-specialist.md 2026-06-18 (cycle 3).

## GAP-147: First-Time User: `ensure_master_cv_exists()` Shows "Profile Ready" for Empty Skeleton

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — `/api/setup/master-cv-status` now returns `is_empty:true` for empty skeletons. Welcome modal shows distinct "empty skeleton" warning with guidance to fill in Master CV before starting a job application. `web/session-manager.js` + `web/index.html`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-F1, US-F4
`ensure_master_cv_exists()` creates a blank skeleton `Master_CV_Data.json` on first run and displays a "Your master profile is ready" success message to the user. However, the skeleton is completely empty (no experiences, skills, education, publications, or personal info). The success message implies the profile has been set up, causing first-time users to proceed into job analysis with an empty master data file, leading to poor AI outputs.
**Recommended resolution:** Change the "profile ready" message to "A blank master profile was created — please fill in your profile before starting a job application." Add a redirect or modal directing the user to the Master CV editor. Alternatively, suppress the success state and show an onboarding prompt instead.

## GAP-148: Workflow Step Pills Missing `cursor:pointer` — Non-Clickable Appearance

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-18 — Added `cursor: pointer` to `.step.stale` and `.step.stale-critical` in `web/styles.css`. All navigable states (active, completed, stale, stale-critical) now have pointer cursor; `.step.clickable` on step-job covers the always-navigable initial state. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-U1, US-A12
Only `step-job` (the first pill) has `class="clickable"` which applies `cursor:pointer`. The remaining navigable pills (analysis, customizations, rewrite, etc.) have `onclick` handlers but no visual affordance indicating they are interactive. Users who have completed an earlier stage see pills that look like static status indicators rather than clickable re-entry points.
**Recommended resolution:** Add `class="clickable"` (or equivalent `cursor:pointer` CSS) to all step pill elements that have `onclick` handlers and are in a navigable state. This is a companion to GAP-72 (keyboard access).

## GAP-149: Generic Professional Summary Fallback Reaches Generated PDF Without UI Warning

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — `_collect_render_snapshot_inputs` detects empty summary and returns a `content_warnings` entry. `/api/cv/generate-preview` now includes `content_warnings` in its response. Layout tab shows a toast warning when this condition is detected before the user downloads. `scripts/routes/generation_routes.py` + `web/layout-instruction.js`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-M1, US-R2
`cv_orchestrator.py:197` substitutes `"Experienced professional applying for {position}"` when the session's professional summary field is empty. This generic placeholder is silently included in the generated PDF, HTML, and ATS DOCX output. No UI warning is shown before generation to alert the user that a fallback summary is in use.
**Recommended resolution:** Before generating output, check whether the selected summary is the fallback placeholder. If so, surface a blocking or prominent warning in the layout review or final generate step: "No professional summary selected — the generated CV will include a generic placeholder." Add a link to the Summary review tab.

## GAP-150: Cover Letter LLM Receives Only Achievement Titles, Not Bullet Body Text

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-18 — Cover letter prompt now passes `title: description` for each achievement, giving the LLM full quantified accomplishment text. `scripts/routes/master_data_routes.py`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-M6, US-P5
The cover letter generation prompt passes achievement `title` fields from the session's approved achievements list but not the full bullet body text. The LLM can only reference achievement titles (which are often generic — e.g., "Revenue Growth") rather than the specific quantified accomplishments in the body (e.g., "grew ARR from $2M to $8M in 18 months"). This produces cover letters with generic achievement references instead of concrete named citations.
**Recommended resolution:** Update the cover letter prompt context to include both achievement title and body text for each approved achievement. The body text is available in the session state alongside the title.

## GAP-151: ATS Validator `STANDARD` Frozenset Includes Rejected Heading Labels

**Priority:** LOW
**Status:** RESOLVED 2026-06-18 — Removed `'career history'` and `'selected publications'` from the `STANDARD` frozenset in `cv_orchestrator.py`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-H2, US-H6
The `STANDARD` frozenset in `validate_ats_report` (`scripts/utils/cv_orchestrator.py:4785–4792`) includes `'career history'` and `'selected publications'`, both of which are explicitly listed as rejected heading labels in US-H2. The ATS DOCX generator does not currently produce these headings, so there is no active bug. However, if generation code changes, the validator would silently pass these rejected labels.
**Recommended resolution:** Remove `'career history'` and `'selected publications'` from the `STANDARD` frozenset. If these need to be tracked for detection purposes, move them to a separate `REJECTED_LABELS` set that the validator flags as failures.

## GAP-152: `showConfirmModal` and `openAtsReportModal` Missing Full Focus Trap

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — `showConfirmModal` now calls `trapFocus('confirm-modal-overlay')` and `closeConfirmModal` calls `restoreFocus()` to release the trap. `openAtsReportModal` now calls `trapFocus('ats-report-modal-overlay')` and `closeAtsReportModal` calls `restoreFocus()`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-X2, US-X3
Both `showConfirmModal` (`web/ui-helpers.js`) and `openAtsReportModal` (`web/ats-modals.js`) now correctly save focus and move it to the first actionable button on open (GAP-143 and GAP-129 fixes). However, neither calls `trapFocus()`. Pressing Tab from the last focusable element exits the modal into background content, allowing keyboard users to interact with the page behind the modal.
**Recommended resolution:** Call `trapFocus(modalElement)` after opening each modal. The `trapFocus()` implementation already exists in `web/ui-core.js` and is used by `confirmDialog()`. Add a corresponding `releaseFocus()` call in the close handlers.

## GAP-153: Dynamic Status Message Elements Lack `aria-live` or `role="alert"`

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — Added `aria-live="polite"` to `#onboarding-modal-status` and `#settings-status-msg`; added `role="alert"` to `#model-auth-key-status`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-X3, US-U7
Three elements display status messages dynamically but have no `aria-live` attribute or `role="alert"`: `#settings-status-msg` (LLM settings save confirmation), `#onboarding-modal-status` (onboarding progress), and `#model-auth-key-status` (API key validation feedback). Screen reader users navigating the UI receive no audible notification when these status elements are updated.
**Recommended resolution:** Add `aria-live="polite"` to `#settings-status-msg` and `#onboarding-modal-status`. Add `role="alert"` (or `aria-live="assertive"`) to `#model-auth-key-status` since API key validation feedback is time-sensitive. Note: `#session-conflict-banner` is tracked separately under GAP-75.

## GAP-154: `.message-input { outline: none }` Set Unconditionally — Keyboard Focus Invisible

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — Moved `outline: none` from `.message-input` base rule into `.message-input:focus` in `web/styles.css`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-X1, US-U7
`web/styles.css` sets `outline: none` on `.message-input` unconditionally (not inside a `:focus` rule). This removes the browser's default keyboard focus indicator from the chat message input for all users at all times, including keyboard-only users. This is a WCAG 2.1 SC 2.4.7 (Focus Visible — Level AA) failure and a WCAG 2.4.11 (Focus Appearance — Level AA) failure.
**Recommended resolution:** Remove the unconditional `outline: none`. If a custom focus style is desired, apply it as `.message-input:focus { outline: 2px solid #2980b9; }` rather than suppressing the outline entirely. Also see GAP-35 for the companion issue of the missing accessible label on this element.

---

## 2026-06-20 (Cycle 4) New Gaps (GAP-155 through GAP-165)

*Discovered during the 15-persona + heuristic review cycle 4, 2026-06-20. Note: 6 persona agents hit API session limits; coverage is partial.*

---

## GAP-155: `toast-warning` CSS Class Missing — Warning Toasts Visually Identical to Base Toast

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — Added `.toast.toast-warning { border-left: 4px solid #f59e0b; }` after `.toast-error` rule in `web/styles.css`. Previously discovered 2026-06-20 (cycle 4 heuristic)
**Affected stories:** US-U7, US-X3
`web/styles.css` defined `.toast.toast-success` (green border) and `.toast.toast-error` (red border) but not `.toast.toast-warning`. Any call to `showToast(msg, 'warning')` — including the GAP-149 content-warning toasts in `web/layout-instruction.js:908` — rendered identically to the dark base slab: no colour coding, no severity distinction.
**Fix:** Added amber border-left rule for `toast-warning` matching the same pattern as existing toast variants.

---

## GAP-156: Empty-Profile Modal "Get Started" CTA Closes Modal Without Navigating to Master CV

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — `_setWelcomeSection('empty')` in `web/session-manager.js` now rewrites the "Get Started" button to "Open Master CV" and wires its `onclick` to call `closeWelcomeModal()` then `openMasterCvModal()`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-F1, US-F4
When `_setWelcomeSection('empty')` is called (empty skeleton profile exists), the footer button still read "Get Started" and called `closeWelcomeModal()`, giving the user no obvious next action. The warning text directed users to the Master CV tab but the CTA did not navigate there.
**Fix:** `_setWelcomeSection` dynamically updates button text and handler based on `section` argument.

---

## GAP-157: Rename Widget `okBtn`/`cancelBtn` Missing `aria-label` — Screen Readers Announce Symbols

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Added `aria-label="Save rename"` and `aria-label="Cancel rename"` to the respective buttons in `promptRenameCurrentSession()` in `web/session-manager.js`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X1, US-S3
The inline rename widget (GAP-113 fix) created `okBtn` (textContent `✓`) and `cancelBtn` (textContent `✕`) with only `title` attributes. Screen readers announce the Unicode symbols directly — "check mark" and "multiplication sign" — without communicating the semantic action.

---

## GAP-158: Tabpanel `#document-content` Missing `aria-labelledby` — Not Linked to Active Tab

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — `switchTab()` in `web/review-table-base.js` now sets `aria-labelledby="tab-{tab}"` on `#document-content` whenever the active tab changes. Initial static value `aria-labelledby="tab-job"` added to `web/index.html`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X2, US-X3
`#document-content` had `role="tabpanel"` but no `aria-labelledby` linking it to the active tab element. WCAG 2.1 SC 4.1.2 requires that tabpanels be programmatically associated with their controlling tab via `aria-labelledby`.

---

## GAP-159: No HTML Semantic Landmarks — Screen Reader Navigation Impaired

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — Replaced `.header` `<div>` with `<header role="banner">`, `.workflow` `<div>` with `<nav aria-label="Application workflow steps">`, and `.main-container` `<div>` with `<main>` in `web/index.html`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X1, US-X2
`web/index.html` used `<div>` for all major regions. Screen reader users relying on landmark navigation (e.g., NVDA/JAWS region list, VoiceOver rotor) had no way to jump directly to the header, navigation, or main content area. WCAG 2.1 SC 1.3.6 (Identify Purpose) and WCAG 2.4.1 (Bypass Blocks) require meaningful landmark regions.

---

## GAP-160: `.workflow-steps` No `overflow-x: auto` — Overflows on Narrow Viewports

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Added `overflow-x: auto` to `.workflow-steps` rule in `web/styles.css`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-U3, US-U9
The workflow step strip uses flexbox with `justify-content: center` and no overflow handling. On viewports narrower than approximately 1600px, the step pills overflow and are clipped or push the layout horizontally.

---

## GAP-161: `openMasterCvModal()` Missing Focus Management — Focus Not Trapped or Restored

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — `openMasterCvModal()` now saves `document.activeElement`, calls `setInitialFocus('master-cv-modal-overlay')` and `trapFocus('master-cv-modal-overlay')`. `closeMasterCvModal()` now calls `restoreFocus()`. `web/master-cv.js`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X2, US-X3
`openMasterCvModal()` at `web/master-cv.js:2475` did not save prior focus, move focus into the modal, or trap Tab within it. This contrasted with all sub-modals in the same file (lines 1270–1485) which correctly use the full `_focusedElementBeforeModal` / `setInitialFocus` / `trapFocus` / `restoreFocus` pattern.

---

## GAP-162: 10 `alert()` Calls in `session-switcher-ui.js` — Native Dialogs Break UX and Accessibility

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Replaced all 10 `alert()` calls in `web/session-switcher-ui.js` (rename error, trash error, restore error, delete error, empty-trash error) with `showToast()` error calls. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X1, US-U4, US-S4
`web/session-switcher-ui.js` used native `alert()` for all error paths (rename, delete, restore, empty-trash). Native alert dialogs block the event loop, cannot be styled, are not accessible via custom focus management, and break the keyboard flow in ways that `showToast()` does not.

---

## GAP-163: Summary Prompt Contradicts US-P1 — Instructs "Title + Years" Opening Instead of Value-Identity

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — Updated summary generation prompt in `scripts/utils/llm_client.py:850` to instruct value-identity opening ("strong verb + differentiating value claim") instead of the title + years formula. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-P1, US-M2
`scripts/utils/llm_client.py:850` (summary generation prompt) instructs the LLM to open with the candidate's job title and years of experience ("Results-driven {title} with {N} years of experience"). US-P1 requires value-identity openings ("X leader who delivers Y result"). The LLM prompt directly contradicts the story requirement, producing summaries that fail the persuasion standard regardless of LLM capability.

---

## GAP-164: `initialize()` Exported from `ui-core.js` But Never Called — Dead Export

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30
**Resolution:** Removed the dead `async function initialize()` from `web/ui-core.js` and its `initialize,` export entry. The function was never called; actual app initialization is done by the `DOMContentLoaded` → `init()` + `session-manager.js` path.
**Affected stories:** US-U1 (tangential)
`web/ui-core.js` exports `initialize()` (line 472–502) via `ui_core_exports` which is spread into `globalThis` at bundle time. The function is never called anywhere in the codebase. Dead exports in the global namespace increase name-collision risk and maintenance confusion.
**Recommended resolution:** Either call `initialize()` from `app.js` as intended, or remove the export and the function if its purpose has been superseded by the per-tab initialization in `loadTabContent()`.

---

## GAP-165: `content_warnings` Not Processed on `applyLayoutSettings()` Path

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Added `content_warnings` toast processing to `applyLayoutSettings()` response handler in `web/layout-instruction.js`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-M1, US-R2
The GAP-149 fix added `content_warnings` processing in the `generatePreview()` success handler in `web/layout-instruction.js:907`. However, the `applyLayoutSettings()` function (line 615) also calls `/api/cv/generate-preview` and does not process `content_warnings` from its response. Similarly, the passive restore path does not fire the toast. Users who re-apply layout settings after an initial generation miss the content-warning feedback.

---

## GAP-72 / GAP-NEW-K: Workflow Step Pills — Keyboard Navigation (Enter/Space)

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — `updateWorkflowStepsClickable()` in `web/ui-core.js` now sets `role="button"` and `tabindex="0"` on steps as they become clickable, and attaches a `keydown` handler for Enter/Space. Non-clickable steps get `tabindex="-1"` and role removed. `step-job` initial state updated in `web/index.html`. Previously tracked as GAP-72 (2026-04-22)
**Affected stories:** US-X1, US-X2
Workflow step pills had `onclick` handlers but no `role="button"`, `tabindex`, or keyboard event listeners. Keyboard-only users could not activate workflow step navigation using Enter or Space.

---

## 2026-06-20 (Cycle 5) New Gaps (GAP-166 through GAP-175)

*Discovered during the 14-persona + heuristic review cycle 5, 2026-06-20. All 15 agents completed.*

---

## GAP-166: `rewriteDecisions = {}` Reset on Session Restore — In-Progress Decisions Lost

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Implemented `localStorage` persistence keyed by session ID in `web/rewrite-review.js`. Added `_persistDecisions()` (called after every accept/reject/edit at lines 318, 345), `_restoreDecisions()` (called at the start of `renderRewritePanel` before the re-apply loop), and `_clearPersistedDecisions()` (called after successful final submission). Decisions now survive page reload and browser close within the same session. Previously OPEN since 2026-06-20.
**Affected stories:** US-S1, US-S2, US-A4
`web/session-manager.js:740` resets `rewriteDecisions = {}` during session restore when `sessionPhase === PHASES.REWRITE_REVIEW`. The backend `/api/rewrites` endpoint returns rewrite proposals but not any prior partial decisions (accept/reject/edit) the user made before leaving the session. `renderRewritePanel()` then populates the UI from scratch with all proposals undecided. Any decisions the user had made before the session was interrupted are silently discarded.

---

## GAP-167: ↻ Re-Run `<span>` Inside Step Pills Is Keyboard-Inaccessible

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Converted `.step-rerun` from a bare `<span>` to a `<button>` element with `aria-label="Re-run ${stepLabel}"`, `background:none;border:none;padding:0` styling, and no change to click behavior. Hover CSS injection updated to also reveal on `:focus-within` and `:focus-visible`. `web/workflow-steps.js:702–707`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-A12, US-U7
`web/workflow-steps.js:704–706` inserts a `<span class="step-rerun">` inside each completed step pill that supports LLM re-execution. The span has a bare `onclick="event.stopPropagation();confirmReRunPhase('${step}')"` handler but no `role="button"`, no `tabindex`, and no `keydown` listener. The span also starts at `opacity:0` and becomes visible only on CSS `:hover` (`styles.css` injected rule at `workflow-steps.js:723`). Keyboard-only users cannot reach or activate the re-run action; screen reader users receive no announcement of the control's purpose.
**Recommended resolution:** Convert the re-run indicator from a `<span>` to a `<button>` element (or add `role="button"`, `tabindex="0"`, `aria-label="Re-run ${stepLabel}"`, and a `keydown` handler for Enter/Space). Replace `opacity:0/hover` visibility with `:focus-within` or always-visible styling to ensure keyboard-discoverable affordance.

---

## GAP-168: `openSessionsModal` Traps Focus But Does Not Move Focus Into Modal

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Added `setInitialFocus('sessions-modal-overlay')` call immediately after `trapFocus()` in `openSessionsModal()`. `web/session-switcher-ui.js:458`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X2, US-S1
`web/session-switcher-ui.js:445–458` — `openSessionsModal()` calls `trapFocus('sessions-modal-overlay')` at line 457 but does not call `setInitialFocus()` or move focus to the first actionable element in the modal. The result is that focus remains on whatever element triggered the modal open, with Tab-key now trapped inside a modal the user cannot perceive focus entering. Contrast with `openMasterCvModal()` (fixed in cycle 4) which correctly calls both `setInitialFocus` and `trapFocus`.
**Recommended resolution:** Call `setInitialFocus('sessions-modal-overlay')` immediately after `trapFocus()` in `openSessionsModal()`, and save `document.activeElement` before opening to restore focus on close.

---

## GAP-169: "Done — Generate CV →" CTA Label Misleads Users About What Happens Next

**Priority:** LOW
**Status:** FULLY RESOLVED 2026-06-22 (cycle 6) — Viewer-panel spell-check buttons at `web/spell-check.js:148,271` renamed from "Done — Generate CV →" to "Generate Preview →". Previously PARTIALLY RESOLVED in cycle 5 (only `web/index.html:186` was fixed). All three button instances now consistent.
**Affected stories:** US-F3, US-U6
`web/index.html:186` and `web/spell-check.js:148,271` — the spell-check completion buttons read "Done — Generate CV →". Activating this button calls `generatePreview()`, which produces an HTML preview for layout review — not the final CV files. The label implies that clicking it produces the finished submission-ready CV, which is not accurate.
**Recommended resolution:** Rename the button to "Generate Preview →" or "Next: Layout Review →" to accurately describe the destination and preserve the staged-generation mental model introduced by GAP-79's recommended fix.

---

## GAP-170: `#llm-busy-label` Has No `aria-live` — "Reasoning…" Not Announced to Screen Readers

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Added `aria-live="polite" role="status"` to `#llm-busy-label` in `web/index.html:155`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X3, US-U7
`web/index.html:155` — `<div id="llm-busy-label">Reasoning…</div>` is updated dynamically by `job-input.js`, `job-analysis.js`, and other modules to describe the current LLM operation. The element has no `aria-live` attribute or `role="status"`. Screen reader users receive no announcement when the overlay appears or when the label text changes (e.g., "Analysing job description…", "Generating rewrites…"). The outer `#llm-busy-overlay` is similarly silent.
**Recommended resolution:** Add `aria-live="polite"` and `role="status"` to `#llm-busy-label` so that its content is announced to screen reader users when the overlay becomes visible. Alternatively, add `aria-live="assertive"` to the overlay container so the appearance of any busy state is immediately announced.

---

## GAP-171: Category Reorder Buttons Missing `aria-label` — WCAG 2.1 Level A Failure

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Added `aria-label="Move ${category} category up"` and `aria-label="Move ${category} category down"` to the category reorder buttons in `web/skills-review.js:423–424`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-M3
`web/skills-review.js:423–424` — the skill category reorder buttons use `title` attribute only:

```html
<button class="icon-btn" data-action="category-up" title="Move category up" ...>↑</button>
<button class="icon-btn" data-action="category-down" title="Move category down" ...>↓</button>
```

`title` is not reliably announced by screen readers. Individual skill row reorder buttons at `skills-review.js:772–773` correctly use `aria-label` — the category buttons are inconsistent with this established pattern. This is a WCAG 2.1 SC 4.1.2 (Name, Role, Value — Level A) failure.
**Recommended resolution:** Add `aria-label="Move ${category} category up"` and `aria-label="Move ${category} category down"` to the category reorder buttons, using the same naming pattern as the existing skill row reorder buttons.

---

## GAP-172: Workflow Step States Conveyed by Colour Alone — No Screen-Reader Text

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — `updateWorkflowSteps()` in `web/workflow-steps.js` now appends a `<span class="sr-only">` to each step pill describing its state: "(current step)", "(completed)", "(stale — results may be outdated)", "(critical — review required)". Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-U7
`web/styles.css:149–159` — the five workflow step states (active, completed, upcoming, stale, stale-critical) are differentiated exclusively by background colour and text colour changes. No `.sr-only` text or `aria-label` announces the current state of each pill to screen reader users. A screen reader user navigating the step bar via keyboard hears the step label (e.g., "Analysis") but receives no state information ("completed", "stale — results may be outdated").
**Recommended resolution:** In `updateWorkflowSteps()` (`web/workflow-steps.js`), append a visually-hidden `<span class="sr-only">` to each step element describing its state: " (completed)", " (active)", " (stale — click to review)", etc. Update the span's text whenever the state class changes.

---

## GAP-173: No `:focus-visible` CSS for `.tab`, `.action-btn`, and `.step` Elements

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Added `:focus-visible` rules to `web/styles.css` for `.action-btn` (line 589), `.tab` (line 635), and `.step` (line 144). All three classes now show a 2px blue outline on keyboard focus, visible in Windows High Contrast mode. Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-U7
`web/styles.css` — no `:focus-visible` rules exist for the three primary interactive element classes: `.tab` (viewer tab bar), `.action-btn` (workflow action buttons), and `.step` (workflow step pills). These rely entirely on the browser's default focus ring, which is invisible in Windows High Contrast mode and suppressed in some browsers by default. The `#message-input` outline issue was fixed in cycle 3 (GAP-154), but the other interactive classes were not updated to include explicit `:focus-visible` styling.
**Recommended resolution:** Add `:focus-visible` rules for `.tab:focus-visible`, `.action-btn:focus-visible`, and `.step:focus-visible` with a distinct, high-contrast outline (e.g., `outline: 2px solid #2980b9; outline-offset: 2px`). This ensures keyboard focus is visible across browsers and accessibility modes.

---

## GAP-174: Cover Letter Has No Mechanism to Inject Company-Specific Initiative References

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Added "Company context" textarea (`#cl-company-context`) to the cover letter generation form in `web/cover-letter.js`. The field value is sent as `company_context` in the POST body and injected into the LLM prompt in `scripts/routes/master_data_routes.py` as a `COMPANY CONTEXT` block with explicit instruction to weave the specifics into the letter. Stored in `cover_letter_params` in session state. Previously OPEN since 2026-06-20.
**Affected stories:** US-M6, US-P3, US-P5
`web/cover-letter.js:124–133` (new textarea), `scripts/routes/master_data_routes.py:1497,1555–1581` (backend extraction and prompt injection).

---

## GAP-175: Professional Summary Specificity Validator Absent

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Added `_checkSummarySpecificity(text)` and `_updateSummarySpecificityBadge(text)` in `web/summary-review.js`. The badge is inserted immediately after `#ai-summary-text` and updated in both `_showAISummary()` and `onSummaryTextChange()`. Three checks: (1) quantified claim (regex for numbers + units/%), (2) target role keyword from `window._lastAnalysisData.title`, (3) generic placeholder phrase detection. Pass shows a green ✓; each failure shows an amber ⚠ advisory. Does not block submission — advisory only.
**Affected stories:** US-M1, US-P1
`scripts/utils/conversation_manager.py:1325` — `check_summary_generic_phrases()` detects and blocks filler phrases like "seasoned professional", "results-driven", and "passionate about". However, the system has no complementary check that enforces the presence of positive specificity: the target job title (or equivalent), a quantified claim (numbers, percentages, years), or a concrete differentiator. A summary like "Experienced engineer who has worked on many challenging problems" passes all current checks despite being generic and unverifiable.
**Cycle 8 additional evidence:** The fallback summary at `cv_orchestrator.py:197` is explicitly generic ("Experienced professional with a strong track record..."). If no specific summary is selected or rewritten, this placeholder can reach the generated PDF.
**Recommended resolution:** Add a post-generation summary validation step that checks for the presence of at least one of: (1) the target job title or role synonym, (2) a quantified achievement (regex for number/percentage patterns), or (3) a specific named technology or domain. Surface failures as an advisory warning in the summary review tab before the user proceeds to generation.

---

## 2026-06-22 (Cycle 6) New Gaps (GAP-176 through GAP-181)

---

## GAP-176: Bullet-Reorder Modal Missing `role="dialog"`, Focus Trap, and ARIA Structure

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Added `role="dialog" aria-modal="true" aria-labelledby="bullet-reorder-title"` to the modal element; added `id="bullet-reorder-title"` to the h3; calls `trapFocus('bullet-reorder-modal')` and `setInitialFocus('bullet-reorder-modal')` after appending; calls `restoreFocus()` on ✕ close, Save Order, and Reset to Auto paths; added Escape key handler. Also added `aria-label` to the ↑↓ move buttons. `web/workflow-steps.js`. Previously OPEN since 2026-06-22.
**Affected stories:** US-X2, US-A3
`web/workflow-steps.js:456–499` — `showBulletReorder()` rendered a list-reorder overlay modal with no ARIA dialog structure, no focus trap, and no focus restoration.

---

## GAP-177: Human DOCX Section Headings Use Bold Runs, Not Word Heading Paragraph Styles

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 8) — Updated `_heading()` helper in `_generate_human_docx()` (`scripts/utils/cv_orchestrator.py:4373`) to use `doc.add_paragraph(style='Heading 1')` (or `'Heading 2'` for level 2) so the paragraph carries Word's semantic heading structure. Visual formatting (bold run, dark blue colour, bottom border, spacing) is applied on top and continues to control appearance.
**Affected stories:** US-H1, US-X3
`scripts/utils/cv_orchestrator.py:4373–4391` — The human-readable DOCX output applies bold formatting to section heading paragraphs using `run.bold = True` rather than assigning Word Heading paragraph styles (`doc.styles['Heading 1']`). As a result: (1) JAWS, NVDA, and VoiceOver cannot navigate the document by heading; (2) ATS parsers that use semantic paragraph role to detect sections may misclassify content. The ATS DOCX path (`_setup_ats_styles`) correctly avoids tables and shapes but also does not set Heading paragraph styles for sections.
**Recommended resolution:** Apply `para.style = doc.styles['Heading 1']` (or equivalent) to section heading paragraphs in the human DOCX path, in addition to any bold/font-size formatting. This preserves visual appearance while enabling semantic navigation.

---

## GAP-178: Rewrite Accept/Edit/Reject Buttons Missing `aria-pressed` State

**Priority:** LOW
**Status:** RESOLVED 2026-06-22 — Added `aria-pressed="false"` at render time to all three buttons (`web/rewrite-review.js:306–308`). In `applyRewriteAction()`, reset all to `"false"` in the clear loop then set the active button to `"true"`. Same pattern in `saveRewriteEdit()`.
**Affected stories:** US-X3, US-A4
`web/rewrite-review.js:273–275` — The three action buttons per rewrite card (✓ Accept, ✎ Edit, ✗ Reject) visually show their selected state via CSS `.active` class (color fill) but carry no `aria-pressed` attribute. Screen reader users hear "Accept button" without any indication that a decision has already been made. The button state is invisible to AT.

---

## GAP-179: `.icon-btn`, `.rw-btn`, `.sm-btn` Missing `:focus-visible` CSS

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 6) — Added `:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px }` to `.icon-btn` (`styles.css` after line 1193), `.rw-btn` (after line 1261), and `.sm-btn` (after line 295). Discovered and fixed this cycle.
**Affected stories:** US-X2, US-X3
`web/styles.css` — `GAP-173` (cycle 5) added `:focus-visible` to `.action-btn`, `.tab`, and `.step`, but missed `.icon-btn` (skills reorder, session switcher), `.rw-btn` (rewrite accept/edit/reject), and `.sm-btn` (session modal action buttons). Keyboard-only users tabbing to these elements received no visible focus ring on browsers that suppress default outlines.

---

## GAP-180: Step-Rerun Button `opacity:0` at Rest — Zero Discoverability for Mouse Users

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Changed default `opacity` from `0` to `0.35` in the `.step-rerun` inline button template (`web/workflow-steps.js:733`). The ↻ button is now dimly visible at rest on all completed step pills; it brightens to full opacity on hover or focus.
**Affected stories:** US-W3, US-A12
`web/workflow-steps.js:723` — The CSS injected for the ↻ re-run button sets `opacity: 0` by default and `opacity: 1 !important` on `.step.completed:hover` and `.step.completed:focus-within`. Mouse users who do not hover over completed step pills never see the re-run affordance. The button is now keyboard-reachable (GAP-167 fix), but it is invisible unless the pill is hovered first. Users who don't know the feature exists will never discover it through normal navigation.

---

## GAP-181: Viewer-Panel Spell-Check Buttons Still "Done — Generate CV →"

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 6) — Changed `web/spell-check.js:148` and `web/spell-check.js:271` from "Done — Generate CV →" to "Generate Preview →". This completes the GAP-169 fix; `web/index.html:186` was fixed in cycle 5 but `spell-check.js` was missed. Discovered and fixed this cycle.
**Affected stories:** US-F3, US-U6
`web/spell-check.js:148,271` — The two viewer-panel spell-check submit buttons (empty state and review state) still read "Done — Generate CV →" after the cycle 5 partial fix of GAP-169 that only updated `index.html:186`. This created a label inconsistency between the chat-panel button and the viewer-panel buttons.

---

## GAP-182: `.action-btn.secondary` Has No CSS Definition

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 7) — Added `.action-btn.secondary { background: #e2e8f0; color: #374151; border-color: #94a3b8; }` and hover rule to `web/styles.css` after the `.action-btn.primary` block. Discovered and fixed this cycle.
**Affected stories:** US-G2, US-U4
`web/index.html:307`, `web/master-cv.js:77,166,171,176,204,206,434` — Eight elements use `class="action-btn secondary"` (Cancel button in confirm modal; Export Master CV; BibTeX import/convert/toggle/validate/load buttons) but no CSS rule defines `.action-btn.secondary`. These buttons silently fall back to the base `.action-btn` grey style, making Cancel and secondary actions visually indistinguishable from each other and from ghost navigation buttons.

---

## 2026-06-29 (Cycle 8) New Gaps (GAP-183 through GAP-194)

---

## GAP-183: Input Focus States Fail Windows High Contrast / `forced-colors: active`

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Added `outline: 2px solid #3b82f6; outline-offset: 2px` to all four affected `:focus` rules in `web/styles.css` (lines 510, 579, 755, 1436). Focus outline now persists under `forced-colors: active`; `box-shadow` continues to provide the visual glow in standard mode. Also added `.q-chip:focus-visible` rule at same time (see GAP-193).
**Discovered:** 2026-06-29 (cycle 8) by ux-expert and accessibility-specialist.
**Affected stories:** US-X2, US-X3, US-U3
Four input elements use `outline: none` with `box-shadow` as the sole focus indicator. Under `forced-colors: active` (Windows High Contrast Mode), browsers suppress `box-shadow`, rendering these inputs invisible when focused. This is a WCAG 2.1 Level AA failure (1.4.11 Non-text Contrast) under forced-colors.
**Affected selectors and locations:**

- `.q-input:focus` (`web/styles.css:510`)
- `.message-input:focus` (`web/styles.css:579`)
- `.form-input:focus` (`web/styles.css:755`)
- `.layout-instruction-textarea:focus` (`web/styles.css:1436`)

**Recommended resolution:** Add `outline: 2px solid #3b82f6; outline-offset: 2px` alongside each existing `box-shadow` rule. The outline persists under forced-colors; the box-shadow provides the visual style in standard mode.

---

## GAP-184: Cover Letter Body May Open With "I" — No Rejection Gate

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Added Rule 1b to `_validateCoverLetter()` in `web/cover-letter.js`. The check finds the first body paragraph (lines after the salutation) and tests if its first word is "I". If so, it renders a fail card: "Body opens with 'I' — lead with your value, the role, or the company instead." Bundle rebuilt.
**Discovered:** 2026-06-29 (cycle 8) by persuasion-expert.
**Affected stories:** US-P1, US-P3
`_validateCoverLetter()` (`web/cover-letter.js:492–509`) validates for generic salutations and empty body but does not detect when the first word of the opening line is "I". Persuasion best practice and the story require the opening to establish value or context before the first-person pronoun.
**Recommended resolution:** Add a check in `_validateCoverLetter`: if the letter body (after stripping salutation and whitespace) begins with the word "I" (case-insensitive, word boundary), show a blocking or advisory error: "Cover letter should not open with 'I'. Lead with your value or the role you are targeting."

---

## GAP-185: Cover Letter PDF Not Generated — Only DOCX Produced

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — After DOCX save, `/api/cover-letter/save` now builds a minimal HTML representation of the cover letter (11pt Calibri, 2.5cm margins) and calls WeasyPrint in a subprocess (same crash-safe pattern as `cv_orchestrator._convert_html_to_pdf`). Both `.docx` and `.pdf` filenames are appended to `generated_files.files` and returned in the API response. WeasyPrint failure is caught and logged as a warning; DOCX is still saved in that case and `pdf_filename` returns `null`.
**Discovered:** 2026-06-29 (cycle 8) by applicant.
**Affected stories:** US-A7, US-O1
`scripts/routes/master_data_routes.py:1619–1697` — the cover letter generation route produces only a DOCX file. No PDF conversion step exists for the cover letter. The download tab will show a `.docx` but no `.pdf`. The applicant story (US-A7) expects both formats to be available for submission.
**Recommended resolution:** After generating the cover letter DOCX, run WeasyPrint or python-docx2pdf to produce a matching `.pdf` at the same output path, mirroring the pattern used for CV PDF generation.

---

## GAP-186: Rewrite Decisions Not Cold-Restored from Backend `approved_rewrites`

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Three-layer fix: (1) `RewritesResponse` dataclass (`scripts/web_app.py`) gained `rewrite_audit: List[Any]` field; (2) both return paths in `/api/rewrites` (`scripts/routes/review_routes.py`) now include `rewrite_audit=conversation.state.get('rewrite_audit') or []`; (3) `web/rewrite-review.js` adds module-level `_backendRewriteAudit`, stores audit from `fetchAndReviewRewrites()` response, and `_restoreDecisions()` falls back to cold-restore from the audit when localStorage has no entry for the session.
**Discovered:** 2026-06-29 (cycle 8) by returning-user.
**Affected stories:** US-S2, US-S3
`_persistDecisions()` / `_restoreDecisions()` (`web/rewrite-review.js:43–65`) round-trip rewrite card state via `localStorage`. This works for same-device / same-browser returns within the storage TTL. However, on cold load (different device, incognito, localStorage cleared, or after 24h), the backend `state['approved_rewrites']` is not used to re-seed the rewrite panel UI. Users who return to a session from a different device or after a storage reset lose all their previously recorded rewrite decisions from the UI, even though the decisions persist in the backend session state.
**Recommended resolution:** On rewrite panel render, check `approved_rewrites` in the session state returned by `/api/status`. For each proposal already present in `approved_rewrites`, set the corresponding card's decision radio to the stored outcome before rendering. This should be a fallback only when localStorage has no entry for this session.

---

## GAP-187: Cover Letter Word Count Not Role-Differentiated

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — `_validateCoverLetter()` in `web/cover-letter.js` now reads `window._lastAnalysisData.role_level` and `.domain` (same source used by `_getCompanyNameForCL`). Selects `wcTarget` from three tiers: standard (300–400w, warn 250–450), executive (400–500w, warn 300–550), academic/research (500–600w, warn 400–650). The validation label and detail text update to show the active tier. Bundle rebuilt.
**Discovered:** 2026-06-29 (cycle 8) by hiring-manager. Related to GAP-95.
**Affected stories:** US-M6, US-P5
`web/cover-letter.js:534` hard-codes a single 250–400 word validation range for all roles. The hiring-manager story and persuasion guidance require role-specific targets:

- Standard/industry roles: 300–400 words
- Executive/VP/C-suite roles: 400–500 words
- Academic/research roles: 500–600 words

Role level is available from `job_analysis.role_level` / `job_analysis.domain` in the session state.
**Recommended resolution:** Expose `role_level` in the status endpoint's job analysis summary. In `cover-letter.js`, read `role_level` on init and select the appropriate threshold object before validation runs.

---

## GAP-188: `approved_rewrites` Not Injected Into Cover Letter LLM Prompt

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — In `scripts/routes/master_data_routes.py`, added `approved_rewrites_block` construction after `company_context_block`. Reads `conversation.state.get('approved_rewrites') or []`, formats up to 5 approved bullets as a `TAILORED CV BULLETS` block, and injects it into the cover letter generation f-string prompt immediately after `top_ach_titles`. LLM is instructed to "reference at least one" approved bullet.
**Discovered:** 2026-06-29 (cycle 8) by hiring-manager.
**Affected stories:** US-M5, US-M6
`scripts/routes/master_data_routes.py:1555–1581` (cover letter generation prompt) and `scripts/headless_session.py:427–430` (headless path) do not include `approved_rewrites` or tailored achievement bullets from the session. The LLM generates cover letter content without access to the specific phrases, metrics, or accomplishments the user has already approved for their customised CV. This means cover letter content may contradict or fail to echo the tailored CV narrative.
**Recommended resolution:** In the cover letter generation route, read `session_state.get('approved_rewrites', [])` and format the top 3–5 approved rewrites as a `TAILORED ACHIEVEMENTS` block in the system prompt. Instruct the LLM to echo at least one specific achievement or phrase from this block in the cover letter body.

---

## GAP-189: Action-Verb Warnings in Experience Bullets Are Log-Only

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Added `_achVerbWarning()` in `web/achievements-review.js` with mirrored `_ACH_WEAK_VERBS` and `_ACH_STRONG_VERBS` sets (from `cv_orchestrator.py`). In `renderAchievementEditorRows()`: each bullet's textarea is now wrapped in a `flex-direction:column` div; when the first word is in `_ACH_WEAK_VERBS`, an amber warning badge appears below the textarea ("⚠ Weak opening verb"); when not in `_ACH_STRONG_VERBS`, a grey informational badge appears. Weak-verb bullets also get a yellow border. The check fires on render and on save. Backend `_enhance_achievement_for_ats` log warning remains; no backend change needed for UI surfacing.
**Discovered:** 2026-06-29 (cycle 8) by hiring-manager.
**Affected stories:** US-M2, US-R3
`_enhance_achievement_for_ats()` (`scripts/utils/cv_orchestrator.py:3966–3970`) calls `logger.warning(f"Weak action verb: {verb}")` when it detects a weak opening verb in a bullet. This log entry is never surfaced to the user. The experience bullets review tab shows no indicator when a bullet's opening verb is flagged as weak (e.g. "Responsible for", "Helped", "Assisted").
**Recommended resolution:** Store weak-verb flags in the bullet metadata (e.g., `bullet['weak_verb_warning'] = True`) and return this in the `/api/status` response. In the experience bullets review tab, display a small ⚠ badge next to flagged bullets with a tooltip: "Consider replacing the opening verb with a stronger action word."

---

## GAP-190: Phase Re-Run Events Not Written to Session Audit Log

**Priority:** LOW
**Status:** RESOLVED 2026-06-29 — Added `rerun_log` append in `re_run_phase()` (`scripts/utils/conversation_manager.py:1570`), just before `_save_session()`. Each entry contains `phase` (resolved phase name), `timestamp` (UTC ISO-8601), and `triggered_by: 'user'`. Log is persisted in session state JSON.
**Discovered:** 2026-06-29 (cycle 8) by applicant.
**Affected stories:** US-A12, US-C2
`re_run_phase()` (`scripts/utils/conversation_manager.py:1570–1576`) updates phase state and returns the result but does not write any timestamped entry to the session's audit trail. Users and compliance reviewers cannot determine from the session JSON when a phase was re-entered, how many times re-runs occurred, or which outcome was produced each time.
**Recommended resolution:** Add a timestamped `rerun_log` entry to session state in `re_run_phase()`:

```python
session_state.setdefault('rerun_log', []).append({
    'phase': phase_name, 'timestamp': datetime.utcnow().isoformat(), 'triggered_by': 'user'
})
```

---

## GAP-191: Session Table Icon Buttons Have `title` But No `aria-label`

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Added `aria-label` matching the `title` text to all three icon buttons in `_renderSessionTableRow()` (`web/session-switcher-ui.js:342–344`): Load session, Rename session, Move session to Trash. Also added aria-label to the inline rename Save/Cancel buttons.
**Discovered:** 2026-06-29 (cycle 8) by accessibility-specialist.
**Affected stories:** US-X1, US-X2
Session table row action buttons (rename, archive, delete) use HTML `title` attributes for tooltip text but no `aria-label`. The `title` attribute is announced inconsistently across screen readers (NVDA announces it; VoiceOver does not by default). Without `aria-label`, VoiceOver users hear only the button icon character or silence.
**Source evidence:** `web/bundle.js:19567` (session-switcher-ui rendered icon buttons); `web/session-switcher-ui.js` row-render function.
**Recommended resolution:** Add `aria-label` matching or expanding on the existing `title` text to each icon button: e.g., `aria-label="Rename session"`, `aria-label="Archive session"`, `aria-label="Delete session"`.

---

## GAP-192: Emoji in Workflow Steps and Tab Labels Not Wrapped in `aria-hidden`

**Priority:** LOW
**Status:** RESOLVED 2026-06-29 — Wrapped all 12 workflow step emoji and all 19 tab label emoji in `<span aria-hidden="true">` in `web/index.html` (lines 119–141 and 200–225). Also wrapped the three ✅ advance buttons (layout-btn, final-generate-proceed-btn, finalise-action-btn, lines 188–190).
**Discovered:** 2026-06-29 (cycle 8) by accessibility-specialist.
**Affected stories:** US-X1, US-X2
Workflow step pills and tab labels include emoji characters (e.g., ✅, ↻, ⚠) that are read aloud by screen readers as their Unicode name: "white heavy check mark", "clockwise rightwards and leftwards open circle arrows", etc. This interrupts the label flow and adds noise for screen reader users.
**Source evidence:** `web/index.html:200–225` (step pill label templates).
**Recommended resolution:** Wrap decorative emoji in `<span aria-hidden="true">` elements: e.g., `<span aria-hidden="true">✅</span> Confirm Layout`.

---

## GAP-193: `.q-chip` Missing `:focus-visible` CSS Rule

**Priority:** LOW
**Status:** RESOLVED 2026-06-29 — Added `.q-chip:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` to `web/styles.css` after the `.q-chip.selected` rule. Fixed in the same commit as GAP-183.
**Discovered:** 2026-06-29 (cycle 8) by accessibility-specialist.
**Affected stories:** US-X2, US-X3
`.q-chip` elements (qualification match chips, skills chips, tag chips) are rendered as focusable `<span>` or `<button>` elements but have no `:focus-visible` CSS rule in `web/styles.css`. Keyboard users tabbing through chips receive no visible focus indicator. GAP-179 added `:focus-visible` to `.icon-btn`, `.rw-btn`, `.sm-btn`; `.q-chip` was missed.
**Recommended resolution:** Add `.q-chip:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` to `web/styles.css` after the existing `.q-chip` block.

---

## GAP-194: Two Overlapping Advance Buttons With Inconsistent Labels (GAP-U9 upgraded to Fail)

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Relabeled both buttons for clarity and visual distinction:

- `#final-generate-proceed-btn`: "✅ Proceed to Finalise →" → "📥 Continue to File Review →" (distinct emoji, clearer destination)
- `#finalise-action-btn`: "✅ Finalise" → "📦 Package Application Files" (action-oriented, no ✅ conflict)

`#layout-btn` retains its dynamic ✅/⬇️/↻ labels unchanged. `updateActionButtons()` already ensures only one button is visible per stage — the fix is label clarity, not structural consolidation.
**Affected stories:** US-U9, US-A5
`web/index.html:188–189` — Two overlapping advance buttons appear at the Layout stage:

- `#layout-btn` — label "✅ Confirm Layout" (advances to `spell_check` phase)
- `#final-generate-proceed-btn` — label "✅ Proceed to Finalise →" (shown at a different moment but overlapping in DOM)

The buttons have inconsistent labels, both use ✅ prefix, and the second label "Proceed to Finalise →" is misleading because the next step is spell check, not finalisation. The story requires a single unambiguous "Proceed to Final Generation" CTA at this step.
**Recommended resolution:** Consolidate to a single advance button at this workflow stage. Relabel using the story's required text "Proceed to Final Generation" and remove the redundant `#final-generate-proceed-btn` or hide it until the correct phase. Ensure only one ✅ CTA is visible at any time.

---

## GAP-195: `aria-live="polite"` on `#document-content` Tabpanel Causes Full Content Announcement on Tab Switch

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Removed `aria-live="polite"` from `#document-content` tabpanel in `web/index.html:235`. The dedicated `#workflow-stage-announcer` live region (lines 146–147) already announces tab navigation; the tabpanel must not itself carry a live region attribute.
**Discovered:** 2026-06-29 (cycle 9) by accessibility-specialist.
**Affected stories:** US-X1, US-X2
`web/index.html:235` — the main content `<div id="document-content">` carries both `role="tabpanel"` and `aria-live="polite"`. Every time the active tab changes, the browser injects the full new tab HTML into this element, causing screen readers to announce the entire content of the tab (entire review tables, cover letter editors, etc.). This produces verbose, disorienting output and makes the application unusable for screen reader users navigating between tabs.
**Source evidence:** `web/index.html:235` — `<div id="document-content" role="tabpanel" aria-live="polite" ...>`
**Recommended resolution:** Remove `aria-live="polite"` from `#document-content`. The dedicated `#workflow-stage-announcer` region (`index.html:146–147`) already provides tab-change announcements. Do not add `aria-live` to any element that receives large HTML injections.

---

## GAP-196: Welcome/Onboarding Modal Has No Focus Trap or Escape Handler

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Added `_openOnboardingFocusTrap(overlay)` helper to `web/session-manager.js`. Calls `globalThis.setInitialFocus('onboarding-modal-overlay')` and `globalThis.trapFocus('onboarding-modal-overlay')` on open. Adds an Escape key handler (`keydown` listener) that calls `closeWelcomeModal()`. The handler is cleaned up on close. `closeWelcomeModal()` now also calls `globalThis.restoreFocus()`.
**Discovered:** 2026-06-29 (cycle 9) by accessibility-specialist.
**Affected stories:** US-X2 (WCAG 2.1 AA failure — 2.1.2 No Keyboard Trap)
`maybeShowWelcomeModal()` in `web/session-manager.js:172–195` shows `#onboarding-modal-overlay` without calling `trapFocus()`, `setInitialFocus()`, or installing an Escape key handler. Keyboard users can Tab through the modal and continue into background page content, violating WCAG 2.1.2. This is inconsistent with every other modal in the app, which all call `trapFocus()` and `setInitialFocus()`.
**Source evidence:** `web/session-manager.js:172–195` — `_openOnboardingModal()` has no `trapFocus` or `setInitialFocus` call. Contrast: `openSettingsModal()` in `ui-core.js:258–280` calls both.
**Recommended resolution:** Add `setInitialFocus('onboarding-modal-overlay')` and `trapFocus('onboarding-modal-overlay')` on open; call `restoreFocus()` in `closeWelcomeModal()`.

---

## GAP-197: `showAlertModal()` Does Not Save Prior Focus Before Opening

**Priority:** MED
**Status:** RESOLVED — 2026-06-30 cycle 10. Added module-level `let _alertPreviousFocus = null` to `web/ui-helpers.js`. `showAlertModal()` saves `document.activeElement` to `_alertPreviousFocus` before calling `setInitialFocus`; `closeAlertModal()` restores focus from that local variable (bypassing the shared `_focusedElementBeforeModal` to avoid clobbering nested modal state).
**Discovered:** 2026-06-29 (cycle 9) by accessibility-specialist.
**Affected stories:** US-X2
`ui-helpers.js:31–37` — `showAlertModal()` calls `setInitialFocus('alert-modal-overlay')` but does not first execute `_focusedElementBeforeModal = document.activeElement`. `closeAlertModal()` calls `restoreFocus()` which reads `_focusedElementBeforeModal` from `ui-core.js:30`. Since that variable was never set by the alert modal open path, focus restores to wherever the last named modal left it (null or stale).
**Source evidence:** `web/ui-helpers.js:31–37` — no `_focusedElementBeforeModal = document.activeElement` before `setInitialFocus`. `web/ui-core.js:30` — shared variable. `web/ui-helpers.js:63–71` — `closeAlertModal` calls `restoreFocus()`.
**Recommended resolution:** Add `_focusedElementBeforeModal = document.activeElement` to `showAlertModal()` before calling `setInitialFocus`.

---

## GAP-198: Workflow Step Active Status Conveyed by Colour Only — No `aria-current`

**Priority:** MED
**Status:** RESOLVED 2026-06-29 — Added `aria-current="step"` management to the tail of `updateWorkflowStepsClickable()` in `web/ui-core.js`. After updating clickable state, all step elements have `aria-current` removed, then `aria-current="step"` is set on `sequentialSteps[currentIdx]` (the currently active step). Post-layout phases have no single active step; `aria-current` is cleared for all in that case.
**Discovered:** 2026-06-29 (cycle 9) by accessibility-specialist.
**Affected stories:** US-X1.3
Workflow step pills use CSS class colours to distinguish active, completed, upcoming, stale, and stale-critical states (`web/styles.css:151–157`). No `aria-current` attribute is set on the active step pill, so screen reader users receive no programmatic indication of current position. This is inconsistent with the LLM wizard progress bar, which correctly sets `aria-current="step"` (`web/ui-core.js:1362`).
**Source evidence:** `web/styles.css:151–157` — state conveyed by class only. `web/ui-core.js:1891–1975` — `updateWorkflowStepsClickable()` sets `classList` but not `aria-current`. Contrast: `ui-core.js:1362` — wizard bar sets `aria-current="step"`.
**Recommended resolution:** In `updateWorkflowStepsClickable()`, set `aria-current="step"` on the currently active workflow step element and remove it from all others.

---

## GAP-199: No `@media (prefers-reduced-motion: reduce)` on CSS Animations

**Priority:** MED
**Status:** RESOLVED — 2026-06-29 cycle 10. Added `@media (prefers-reduced-motion: reduce)` block at end of `web/styles.css` that sets `animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important` for `*, *::before, *::after`. Covers all 7 animation types: `spin`, `stale-chip-pulse`, `browsing-pulse`, `dots`, `llm-spin`, `step-pulse`, `changed-item-pulse`.
**Discovered:** 2026-06-29 (cycle 9) by accessibility-specialist.
**Affected stories:** US-X (WCAG 2.3.3 Animation from Interactions)
`web/styles.css` contains `browsing-pulse`, `stale-chip-pulse`, `changed-item-pulse`, `step-pulse`, `llm-spin`, `dots`, and spinner keyframe animations. None are wrapped in `@media (prefers-reduced-motion: reduce)`. Users with vestibular disorders or motion sensitivity receive no accommodation and will experience persistent animation throughout the workflow.
**Source evidence:** `web/styles.css` — `@keyframes` animations present without motion media query guard.
**Recommended resolution:** Wrap all non-essential animations in `@media (prefers-reduced-motion: reduce) { ... { animation: none; } }`. Spinners can use `opacity: 0.5` toggle instead of rotation.

---

## GAP-200: Single `_focusedElementBeforeModal` Variable Clobbered by Nested Modal Opens

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Replaced single `_focusedElementBeforeModal` and `_currentFocusTrapListener` variables with `_focusStack[]` and `_focusTrapStack[]` arrays in `web/ui-core.js`. All three `openModal` call sites push to the stacks; `restoreFocus()` pops both in LIFO order. Nested modal opens/closes now correctly restore focus.
**Discovered:** 2026-06-29 (cycle 9) by accessibility-specialist.
**Affected stories:** US-X2
`web/ui-core.js:30` maintains a single module-level `_focusedElementBeforeModal` variable shared by all modal open/close paths. When a sub-modal is opened from within a primary modal (e.g., a publication editor modal opened from within the Master CV modal), the inner modal open overwrites the value saved by the outer modal. When the inner modal closes and calls `restoreFocus()`, focus returns correctly; but when the outer modal then closes and also calls `restoreFocus()`, the variable now holds the inner modal's trigger element rather than the element that opened the outer modal.
**Source evidence:** `web/ui-core.js:30` — `let _focusedElementBeforeModal = null` — single variable. `openMasterCvModal()` and sub-modals in `master-cv.js` all call `setInitialFocus()` which overwrites this variable.
**Recommended resolution:** Replace the single variable with a stack: `push` on open, `pop` on close. This correctly handles arbitrarily nested modal sequences.

---

## GAP-201: Clarifying Questions Shown All at Once — No ≤3-Per-Group Flow

**Priority:** MED
**Status:** RESOLVED — 2026-06-30. Added group pagination (GROUP_SIZE=3) to `web/questions-panel.js`. `_currentGroup` tracks the current page; `renderQuestionsPanel()` shows only the current group of ≤3 questions. A "Continue →" button advances groups (saving answers to `window.questionAnswers`); "Submit Answers" appears only on the last group. `updateQProgress()` counts answers from DOM (current group) and `window.questionAnswers` (previous groups). Group counter shown: "Group N of M".
**Discovered:** 2026-06-29 (cycle 9) by ux-expert.
**Affected stories:** US-U3 AC4 (Fail)
`web/questions-panel.js:147` renders all clarifying questions simultaneously as a single scrollable list. The user story requires questions to be presented in groups of ≤3 with a "confirm and see next group" flow to reduce cognitive load. Users may see 10+ questions at once after analysis, which is overwhelming for first-time users and hides structure in what should be a guided dialogue.
**Source evidence:** `web/questions-panel.js:147` — all questions rendered as single flat list. No pagination or group-by-3 logic present.
**Recommended resolution:** Group questions into batches of ≤3. Show one batch at a time. Render a "Continue →" or "Done" button after each group that reveals the next. Track group progress with a counter ("Group 1 of 3").

---

## GAP-202: Relevance Scores in Review Tables Are Bare Integers With No Scale Label

**Priority:** MED
**Status:** RESOLVED — re-verified 2026-06-30; the experience review table (`web/experience-review.js:180`) already uses a `.confidence-badge confidence-{level}` element with labelled text (e.g. "High", "Medium", "Low") for each experience row. The skills and publications tables follow the same pattern. No bare integer score is rendered. The gap description was based on a stale version of the UI predating the confidence badge implementation.
**Discovered:** 2026-06-29 (cycle 9) by ux-expert.
**Affected stories:** US-U4 AC6, H6 (Recognition rather than recall)

---

## GAP-203: Publications Always Included With No Role-Type Gate

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30. After `_handle_analyze_job()` builds clarifying questions, a publication-inclusion question is appended when: (a) the user has publications in their master CV (`orchestrator.publications` is non-empty) and (b) `job_analysis.domain` does not match a research/academic keyword list. Question type `include_publications`, two choices: "Yes — include publications" / "No — omit for this application". In `scripts/utils/session_data_view.py:materialize_generation_customizations()`, if `post_analysis_answers['include_publications']` starts with "no" and no explicit `accepted_publications` are set, `accepted_publications = []` is written — which the generation pipeline (`cv_orchestrator.py:3434`) treats as "user selected nothing", suppressing the section. Research-domain roles bypass the gate automatically. Users can still override via the Publications review tab decisions at any time.
**Discovered:** 2026-06-29 (cycle 9) by hiring-manager.
**Affected stories:** US-M (hiring manager, generated materials)
`scripts/utils/cv_orchestrator.py:3444` — `_select_publications()` runs and includes publications whenever `publications.bib` is non-empty, regardless of whether the target role is research-oriented or industry/commercial. For industry roles (engineering, product, operations), a publications section is often a negative signal that suggests academic-world misalignment. No analysis flag, role-level check, or user prompt gates whether publications should appear.
**Source evidence:** `scripts/utils/cv_orchestrator.py:3444` — `_select_publications()` called unconditionally when `publications.bib` exists.
**Recommended resolution:** During job analysis, determine whether the role warrants a publications section (research/academic/scientist/faculty vs. industry). Surface a question to the user ("Include publications for this application?") or use `job_analysis.domain` to auto-gate. Allow per-application override.

---

## GAP-204: Cover Letter Closing Prompt Underspecified — "Call to Action" Not "Direct Interview Request"

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30 cycle 10. Updated `scripts/routes/master_data_routes.py:1630` — replaced generic "call to action" with: "Close with a specific, confident request for an interview or a conversation about the role. Name the role explicitly. Avoid passive language such as 'I look forward to hearing from you.'"
**Discovered:** 2026-06-29 (cycle 9) by hiring-manager.
**Affected stories:** US-M6, US-P (persuasion-expert)
`scripts/routes/master_data_routes.py:1630` — the cover letter generation prompt instructs the LLM to write a "call to action" closing. The user story and hiring-manager standards require the closing to contain a direct, specific interview request ("I would welcome the opportunity to discuss..."), not a generic call to action. Vague closings ("I look forward to hearing from you") score significantly lower with hiring managers.
**Source evidence:** `scripts/routes/master_data_routes.py:1630` — prompt contains "call to action"; no "interview request" language.
**Recommended resolution:** Replace "call to action" with explicit instruction: "Close with a specific, confident request for an interview or a conversation, naming the role. Avoid passive language like 'I look forward to your response.'"

---

## GAP-205: No Minimum 2-Bullet Floor Enforced Per Job Entry

**Priority:** MED
**Status:** DUPLICATE of GAP-81 — see GAP-81 for tracking.
**Discovered:** 2026-06-29 (cycle 9) by hiring-manager.
**Affected stories:** US-M (hiring manager, generated materials)
Duplicate of the previously discovered GAP-81 (No Minimum Bullet Count Check Before Generation, discovered 2026-04-22). Both identify that experience entries with fewer than 2 bullets can be generated without any warning or gate. Tracking in GAP-81.

---

## GAP-206: Phase-Lock Indicator Absent From Master CV Tab — Edit Buttons Visible in All Phases

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30; `populateMasterTab()` in `web/master-cv.js` now reads `stateManager.getPhase()` and computes `isEditable` (true only when phase is `init`, `refinement`, or null). When not editable: (1) a red 🔒 banner is injected above the governance note explaining the current phase and how to re-enable editing; (2) all `<button>` elements in the content area are set `disabled=true`, `opacity:0.45`, and `cursor:not-allowed`, except `exportMasterCV()` and `validatePublicationsBib()` which are read-only operations.
**Discovered:** 2026-06-29 (cycle 9) by master-cv-curator.
**Affected stories:** US-M1 AC2 (Master CV Curator)

---

## GAP-207: Backup History/Restore API Has No Frontend UI Surface

**Priority:** HIGH
**Status:** DUPLICATE of GAP-91 — see GAP-91 for tracking.
**Discovered:** 2026-06-29 (cycle 9) by master-cv-curator.
**Affected stories:** US-M (Master CV Curator — backup/restore)
Duplicate of the previously discovered GAP-91 (No Backup History/Restore UI Despite Backend Support, discovered 2026-04-22). Both identify that `/api/master-data/history` and `/api/master-data/restore` exist but have no frontend surface. Tracking in GAP-91.

---

## GAP-208: BibTeX Import Returns Aggregate Error Counts Only — No Per-Key Detail

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added `added_keys`, `updated_keys`, and `skipped_keys` arrays to the `/api/master-data/publications/import` response in `scripts/routes/master_data_routes.py`. Both import result handlers in `web/master-cv.js` (`importBibtexPublications`, `importConvertedBibtex`) now show a bulleted list of skipped cite keys in the alert modal when any were skipped, with a note that enabling "Overwrite" will update them.
**Discovered:** 2026-06-29 (cycle 9) by master-cv-curator.
**Affected stories:** US-M4 AC3 (Master CV Curator — publications import)

---

## GAP-209: Finalise Tab Status Vocabulary Mismatch — 3 Values vs. 6 Values in PATCH Endpoint

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Expanded the Finalise tab `<select id="finalise-status">` in `web/finalise.js` to include three additional options: "Interview scheduled" (`interview`), "Rejected" (`rejected`), "Accepted" (`accepted`). Updated status validation in `scripts/routes/generation_routes.py:1929–1930` to accept all six values. The Finalise tab and the PATCH endpoint now share a consistent 6-value vocabulary.
**Discovered:** 2026-06-29 (cycle 9) by recruiter-ops.
**Affected stories:** US-O (Recruiter-Ops — session management)
The Finalise tab (`web/finalise.js:91–95`) presents a `<select>` with only three values: `draft`, `ready`, `sent`. The `PATCH /api/sessions/metadata` endpoint (`scripts/routes/session_routes.py`) and the session-switcher inline status widget (`web/session-switcher-ui.js`) accept and display six values: `draft`, `ready`, `sent`, `interview`, `rejected`, `accepted`. Status set post-archive via the session-switcher cannot be set during the Finalise workflow, and vice versa — users face a vocabulary split depending on which UI path they use.
**Source evidence:** `web/finalise.js:91–95` — `<select>` has 3 options. `scripts/routes/generation_routes.py:1929` — validates against 3-value set. `web/session-switcher-ui.js` — `appStatusLabels` maps 6 values. `scripts/routes/session_routes.py` — PATCH accepts 6 values.
**Recommended resolution:** Expand the Finalise tab `<select>` to include `interview`, `rejected`, `accepted`. Update the validation set in `generation_routes.py:1929` to match the 6-value set used by the PATCH endpoint. Ensure label display is consistent across both UI surfaces.

---

## GAP-210: Notes Field Not Editable Post-Archive — No Notes Widget in Session-Switcher UI

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added inline notes-edit widget to saved-session table rows in `web/session-switcher-ui.js`. A fa-note-sticky icon button triggers a two-row textarea pre-populated with existing notes, wired to PATCH /api/sessions/metadata with `{path, notes}`. `SessionItem.notes` added to `scripts/web_app.py` and the session list route now reads `notes` from `metadata.json` alongside `application_status`.
**Discovered:** 2026-06-29 (cycle 9) by recruiter-ops.
**Affected stories:** US-O (Recruiter-Ops — session notes)
`PATCH /api/sessions/metadata` accepts a `notes` field and writes it to `metadata.json`. The session-switcher UI (`web/session-switcher-ui.js`) was extended with an inline status edit widget (GAP-103) but no corresponding notes edit widget. Users who want to annotate a saved application ("interviewed 2025-03-10, awaiting callback") have no UI path to do so after archiving.
**Source evidence:** `scripts/routes/session_routes.py` — PATCH endpoint accepts `notes`. `web/session-switcher-ui.js` — inline status edit widget present; no notes textarea widget.
**Recommended resolution:** Add a notes edit widget to the session-switcher saved-session row (following the same show/hide pattern as the status widget). A single-line or two-line textarea with "Save Notes" / "Cancel" is sufficient. Wire to `PATCH /api/sessions/metadata` with `{ path, notes }`.

---

## GAP-211: Non-Confidential Badge Lags After Provider Change — `setModel()` Doesn't Update Badge

**Priority:** MED
**Status:** RESOLVED 2026-06-29 — Added `globalThis.updateAuthBadge({}, effectiveProvider)` call in `setModel()` in `web/ui-core.js`, immediately before `_refreshCopilotAuthStatus()`. The badge now reflects the new provider as soon as the model switch POST succeeds, without requiring a page reload.
**Discovered:** 2026-06-29 (cycle 9) by trust-compliance.
**Affected stories:** US-C (Trust-Compliance — provider transparency)
After a user switches the active LLM provider via the model wizard, the non-confidential badge (`#llm-non-confidential-badge`) is not updated until the next page reload or state refresh. `setModel()` in `web/ui-core.js` POSTs the new provider/model selection and updates internal state, but does not call `updateAuthBadge()` (or equivalent) after the POST succeeds. The badge therefore shows stale provider information while the user is actively working.
**Source evidence:** `web/ui-core.js` — `setModel()` POST handler does not call `updateAuthBadge`. `web/app.js` or `web/ui-core.js` — `updateAuthBadge()` reads current provider from state and updates the badge element.
**Recommended resolution:** In the `setModel()` POST success callback, call `updateAuthBadge({}, effectiveProvider)` (or the equivalent function that refreshes the non-confidential badge) after updating internal provider state.

---

## GAP-212: ATS DOCX `_setup_ats_styles` Never Sets `font.name` — Inherits Theme Font

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30 cycle 10. Added `font.name = 'Calibri'` to Heading 1 (line 3847), Heading 2 (line 3857), Normal (line 3867), and List Bullet (line 3875) style blocks in `_setup_ats_styles()` in `scripts/utils/cv_orchestrator.py`. Verified by grep: all 4 styles now set Calibri explicitly.
**Discovered:** 2026-06-29 (cycle 9) by hr-ats.
**Affected stories:** US-H1 (ATS file ingestion)
`scripts/utils/cv_orchestrator.py:3836–3867` (`_setup_ats_styles`) sets font sizes and bold/color properties for all ATS DOCX styles but never calls `font.name = 'Calibri'` (or any explicit ATS-safe font) on any style. The ATS DOCX document therefore inherits Word's default theme font (typically "Calibri Light" or whatever the host Word installation sets as default), which may not be Calibri/Arial/Times New Roman. By contrast, the human DOCX correctly calls `font.name = 'Calibri'` at line 4369. The existing `validate_ats_report` font check (GAP-87) focuses on PDF font embedding and does not validate the DOCX font name.
**Source evidence:** `scripts/utils/cv_orchestrator.py:3836–3867` — no `font.name` assignment in `_setup_ats_styles`. Line 4369 — human DOCX sets `font.name = 'Calibri'`.
**Recommended resolution:** Add explicit `font.name = 'Calibri'` to each style definition in `_setup_ats_styles`. Add a DOCX font-name check to `validate_ats_report` (check 1b) that reads paragraph font names from the first 10 paragraphs and warns if a non-ATS-safe family is detected.

---

## GAP-213: Publications Section Absent From ATS DOCX

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30; added publications block to `_add_ats_additional_sections()` in `scripts/utils/cv_orchestrator.py`. Renders selected publications as plain-text paragraphs (`formatted_citation`) under a "Publications" or "Selected Publications" heading (same title logic as the human DOCX). Uses the `publications` key already present in the `content` dict passed to the function.
**Discovered:** 2026-06-29 (cycle 9) by hr-ats.
**Affected stories:** US-H1, US-H2

---

## GAP-214: Synonym Expansion Not Applied in `compute_ats_score`

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added optional `synonym_map` parameter to `compute_ats_score()` in `scripts/utils/scoring.py`; pre-computes canonical→forms reverse index from `CVOrchestrator._expansion_index`; synonym-only matches get `match_type='synonym'` (counted as exact in `ats-refinement.js` summary bar). Route at `scripts/routes/generation_routes.py:1741` passes `synonym_map=conv.orchestrator._expansion_index`.
**Discovered:** 2026-06-29 (cycle 9) by hr-ats.
**Affected stories:** US-H4 (keyword matching and scoring)
`_optimize_skills_for_ats` in `scripts/utils/cv_orchestrator.py:3914–3927` expands skill names via `_expansion_index` before selecting skills for the ATS DOCX. However, `compute_ats_score` in `scripts/utils/scoring.py:345–554` uses only raw string containment checks — it does not apply synonym expansion. A job keyword "Machine Learning" will not match a skill stored as "ML" in the ATS score computation, even though `_expansion_index` knows they are synonyms. This causes the ATS score to undercount keyword matches and misreports coverage to the user. Note: GAP-90 covers a related but distinct issue — the UI not showing synonym grouping in the validation report.
**Source evidence:** `scripts/utils/scoring.py:345–554` — no synonym/expansion lookup in `compute_ats_score`. `scripts/utils/cv_orchestrator.py:3914–3927` — `_expansion_index` applied only during skill selection.
**Recommended resolution:** Apply synonym expansion in `compute_ats_score` before string matching: for each job keyword, check it against both the raw skill list and all synonym expansions in `_expansion_index`. Mark expanded matches as "partial match via synonym" to preserve the distinction from exact matches.

---

## GAP-215: Skill Type UI Override Not Supported

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30. Added a clickable toggle button to each skill row in `web/skills-review.js` (replaced the display-only `skillTypeBadge` span with a `<button class="skill-type-toggle">`). Button cycles: Hard → Soft → unset → Hard. Overrides are stored in `window._skillTypeOverrides` keyed by lowercase skill name and persisted via `/api/review-skill-qualifiers` (extended to accept `skill_type` field in `scripts/routes/review_routes.py`). Backend coercion added in `scripts/utils/session_data_view.py:_coerce_skill_qualifier_overrides`. Override badges display with an outline to distinguish them from job-analysis-derived labels. Override is loaded from `skill_qualifier_overrides` in `/api/status` response (field added to `StatusResponse` in `scripts/web_app.py` and builder in `scripts/routes/status_routes.py`).
**Discovered:** 2026-06-29 (cycle 9) by hr-ats.
**Affected stories:** US-H8 (hard/soft skill distinction)
`web/skills-review.js:667–671` renders skill type as a display-only badge derived from job analysis lists (`hardSkillSet`/`softSkillSet`). No UI control allows users to reclassify a skill from hard to soft or vice versa. No backend route accepts a `skill_type` override. The `skill_qualifier_overrides` state field (`scripts/utils/conversation_manager.py:119`) covers proficiency/subskills/parenthetical but not `skill_type`. Note: GAP-89 covers persistence of `skill_type` to Master CV via harvest; this gap specifically covers the missing UI override mechanism.
**Source evidence:** `web/skills-review.js:667–671` — badge rendered with no input control. No `skill_type` field in `skill_qualifier_overrides`. No backend route with `skill_type` in request body.
**Recommended resolution:** Add a toggle button alongside each skill's type badge (hard ↔ soft). Store the override in `skill_qualifier_overrides` under `skill_type`. Propagate the override when rebuilding `hardSkillSet`/`softSkillSet` for ATS DOCX generation and JSON-LD annotation.

---

## GAP-216: ATS Match Score Weighting Is 70/30, Not Story-Required 2:1

**Priority:** MED
**Status:** RESOLVED — 2026-06-30 cycle 10. Changed `scripts/utils/scoring.py:534` from `round(0.7 * hard_score + 0.3 * soft_score, 1)` to `round((2 * hard_score + soft_score) / 3, 1)`. Now exactly implements the 2:1 (66.7/33.3) specification. Verified by grep.
**Discovered:** 2026-06-29 (cycle 9) by hr-ats.
**Affected stories:** US-H7 (ATS match score visibility)
`scripts/utils/scoring.py:533–534` computes `overall = round(0.7 * hard_score + 0.3 * soft_score, 1)`. The user story US-H7 specifies "hard skill matches count twice as much as soft skill matches" — i.e., a 2:1 ratio, which is 66.7%/33.3%. The actual implementation uses 70%/30% (a 7:3 ratio). The maximum difference between the two formulas is ~3.4 percentage points, but the implementation does not match the documented specification.
**Source evidence:** `scripts/utils/scoring.py:533–534` — `0.7 * hard_score + 0.3 * soft_score`.
**Recommended resolution:** Change to `round((2 * hard_score + soft_score) / 3, 1)` to exactly implement the 2:1 specification. This is a one-line code change. Update the score formula comment and any displayed explanation of the scoring methodology.

---

## GAP-217: ATS 16-Check Validation Results Not Stored in `metadata.json`

**Priority:** MED
**Status:** RESOLVED — Re-verified 2026-06-30; `scripts/routes/review_routes.py:2339` already calls `_try_patch_metadata(conversation, {'validation_results': ...})` immediately after the 16-check validation run. The full check list (including per-check status, message, and page count) is written to `metadata.json` at ATS-validate time. The gap was based on a stale code read before this was implemented.
**Discovered:** 2026-06-29 (cycle 9) by hr-ats.
**Affected stories:** US-H6 (ATS output validation report)
`validate_ats_report` in `scripts/utils/cv_orchestrator.py:4686–5031` runs 16 checks and returns a full pass/warn/fail report structure. At generation time, only `metadata['date_overlap_warnings']` (line 2202) and the scalar `metadata['ats_score']` (via `_try_patch_metadata`, `generation_routes.py:1703–1704`) are persisted to `metadata.json`. The 16-check validation report list is never written to `metadata.json`. If a user archives and later returns to a session, the per-check validation detail is lost — only the aggregate ATS score is available.
**Source evidence:** `scripts/utils/cv_orchestrator.py:2198–2210` — `metadata` dict written at generation; contains `ats_score` and `date_overlap_warnings` but not `ats_validation_report`. `scripts/routes/generation_routes.py:1703–1704` — `_try_patch_metadata` only patches `ats_score`.
**Recommended resolution:** Add `metadata['ats_validation_report'] = validation_result` (or the serialized check list) to the generation metadata write. Include it in `_try_patch_metadata`. Surface the persisted validation data in the Finalise tab's readiness checklist when reviewing an archived session.

---

## GAP-218: ATS Validator Falsely Rejects "Selected Publications" Heading

**Priority:** HIGH
**Status:** RESOLVED — cycle 12
**Discovered:** 2026-06-30 (cycle 11) by hiring-manager.
**Affected stories:** US-M7, US-H2 (ATS section recognition)
`scripts/utils/cv_orchestrator.py:4882–4889` — the `validate_ats_report` check `docx_standard_headings` asserts the publications section heading must be exactly `"Publications"` and marks `"Selected Publications"` as a **fail**. However, `cv_orchestrator.py:4592` and `templates/cv-template.html` both correctly use `"Selected Publications"` when a subset of publications is shown. The validator check is therefore wrong: it fires as a false failure on every curated CV.
**Source evidence:** `scripts/utils/cv_orchestrator.py:4882–4889` — heading check `== 'Publications'` only; `cv_orchestrator.py:4592` — generates heading as `"Selected Publications"` when publication subset is used.
**Recommended resolution:** Update the `docx_standard_headings` validator to accept both `"Publications"` and `"Selected Publications"` as valid heading text.

---

## GAP-219: `openJobAnalysisModal()` Has Zero Focus Management

**Priority:** HIGH
**Status:** RESOLVED — cycle 12
**Discovered:** 2026-06-30 (cycle 11) by accessibility-specialist.
**Affected stories:** US-X2 (WCAG 2.1.2 No Keyboard Trap, 2.4.3 Focus Order)
`bundle.js:6686–6700` — `openJobAnalysisModal()` opens the job analysis modal without: (1) saving the currently focused element, (2) calling `setInitialFocus()`, (3) calling `trapFocus()`, or (4) calling `restoreFocus()` on close. This is inconsistent with every other major modal in the application. Keyboard users cannot navigate into the modal naturally and focus leaks to background content.
**Source evidence:** `bundle.js:6686–6700` (or equivalent in source `web/` file) — no prior-focus save, no `setInitialFocus`, no `trapFocus`, no `restoreFocus` on close.
**Recommended resolution:** Add the standard four-call focus management pattern used by `openSettingsModal()` (`ui-core.js:258–280`): save prior focus, `setInitialFocus`, `trapFocus` on open; `restoreFocus` on close.

---

## GAP-220: `aria-current="step"` Not Set During Post-Layout Phases

**Priority:** LOW
**Status:** RESOLVED 2026-06-30 — `web/ui-core.js`: During post-layout phases (`final_generation`, `refinement`), `aria-current="step"` is now set on `#step-download` (the first post-layout step) instead of clearing all indicators. Previously `activeStepId = null` removed all `aria-current` attributes during these phases.
**Discovered:** 2026-06-30 (cycle 11) by accessibility-specialist.
**Affected stories:** US-X1.3
`web/ui-core.js:1985` — `updateWorkflowStepsClickable()` resolves `activeStepId` to `null` for post-layout phases (`final_generation`, `refinement`). As a result, `aria-current` is cleared from all step pills during these phases, leaving screen reader users with no programmatic indication of current workflow position. The visual "active" state (blue background `.step.active`) is still set but is not communicated via ARIA.
**Source evidence:** `web/ui-core.js:1985` — `activeStepId` null branch clears all `aria-current`; post-layout steps have no fallback indicator.
**Recommended resolution:** During post-layout phases, set `aria-current="step"` on whichever post-layout step is currently active rather than clearing all indicators.

---

## GAP-221: Layout Review Iframe Missing `title` Attribute

**Priority:** LOW
**Status:** RESOLVED — Re-verified 2026-06-30; `web/layout-instruction.js:296` already has `title="CV Layout Preview"` on the `<iframe id="layout-preview">` element. The gap description was based on an unverified assumption. Source code confirms the attribute is present.
**Discovered:** 2026-06-30 (cycle 11) by accessibility-specialist.
**Affected stories:** US-X1 (WCAG 4.1.2 Name, Role, Value)
The Layout Review iframe (`<iframe id="layout-preview">`) likely lacks a `title` attribute. WCAG 4.1.2 requires iframes to have a descriptive `title` attribute so screen reader users understand the frame's purpose when navigating. An untitled iframe is announced as just "frame" with no context.
**Source evidence:** `web/layout-instruction.js` — iframe element creation or declaration; `title` attribute not confirmed present.
**Recommended resolution:** Add `title="CV layout preview"` to the layout-preview iframe.

---

## GAP-222: Cover Letter "I"-As-First-Word Gate Not Implemented

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30; fixed body-starts-with-I detection in `_validateCoverLetter()` (`web/cover-letter.js`). The old check used a regex that failed to catch contractions like "I'm", "I've", "I'd". Replaced with `firstBodyWord.split(/[^a-zA-Z]/)[0].toLowerCase() === 'i'` which correctly identifies the personal-pronoun "I" in all contraction forms while ignoring words like "In", "It". The `iFirstCheck` object already rendered as `fail` (not `warn`) since it had no `warn: true` property. Also tightened the salutation-index detection from `indexOf(find(...))` to `findIndex()` to avoid duplicate-line edge cases.
**Discovered:** 2026-06-30 (cycle 11) by persuasion-expert. (See also GAP-184 from cycle 8 which flagged the same issue — GAP-222 supersedes GAP-184.)
**Affected stories:** US-P5 (cover letter persuasion architecture)

---

## GAP-223: Cover Letter Word Count Threshold Mismatch — Frontend 400 vs Backend 300

**Priority:** MED
**Status:** RESOLVED — 2026-06-30. Changed standard-role `wcTarget` in `_validateCoverLetter()` (`web/cover-letter.js`) from `{ lo:300, hi:400, warnLo:250, warnHi:450 }` to `{ lo:250, hi:300, warnLo:200, warnHi:400 }`. Green zone now ≤300w, amber 300–400w, fail >400w, matching US-P5 ≤300-word target. Label updated to "≤300 (standard)".
**Discovered:** 2026-06-30 (cycle 11) by persuasion-expert.
**Affected stories:** US-P5 (cover letter conciseness)
`web/cover-letter.js:550–566` — the frontend validator green zone for standard roles extends to 400 words (warn above 400, fail above 450). However, the backend generation prompt (`scripts/routes/master_data_routes.py:_cover_letter_word_count_instruction`) targets `~300–400 words` for standard roles. These are internally consistent for standard roles, but the persuasion story spec requires ≤300 words as the primary target. The frontend does not warn when the LLM overshoots 300 words.
**Source evidence:** `web/cover-letter.js:550–566` — green zone 300–400 for standard. `scripts/routes/master_data_routes.py` — `_cover_letter_word_count_instruction()` targets 300–400w standard.
**Recommended resolution:** Align the frontend green zone upper bound to 300 words for standard roles (matching the story's ≤300 target), with amber at 300–400 and fail above 400.

---

## GAP-224: Passive Cover Letter CTA Shows Warning Instead of Fail

**Priority:** MED
**Status:** RESOLVED — 2026-06-30. Changed `warn: !hasAssertiveCta && hasPassiveCta` to `fail: !hasAssertiveCta && hasPassiveCta` in `_validateCoverLetter()`. Updated detail message to explicitly state passive CTA is rejected with example of assertive alternative.
**Discovered:** 2026-06-30 (cycle 11) by persuasion-expert.
**Affected stories:** US-P5 (cover letter CTA)
`web/cover-letter.js:578–603` — the CTA validator correctly identifies passive phrases ("hear from you", "look forward to", "await your") in `passiveCtaPatterns` (line 589). However, the result is `warn: !hasAssertiveCta && hasPassiveCta` — a warning level. The user story specifies that a passive CTA ("I look forward to hearing from you") must be rejected (fail), not merely warned. The current render logic shows a yellow warning rather than a hard failure, allowing passive closings to reach final output.
**Source evidence:** `web/cover-letter.js:589` — `passiveCtaPatterns` correct; `cover-letter.js:623` — renders warn not fail; `master_data_routes.py:1630` — strengthened prompt (cycle 10) helps at generation time but client-side gate remains advisory.
**Recommended resolution:** Upgrade passive CTA from `warn` to `fail` in `_validateCoverLetter`. Add explicit rejection message: "Closing must include a direct interview request. Phrases like 'I look forward to hearing from you' are too passive."

---

## GAP-225: Experience Relevance Ordering Overridden by Reverse-Chronological Sort

**Priority:** HIGH
**Status:** RESOLVED — cycle 12
**Discovered:** 2026-06-30 (cycle 11) by resume-expert.
**Affected stories:** US-R2 (publication/experience selection quality)
`scripts/utils/cv_orchestrator.py:3168` — unconditionally overwrites any relevance-scored ordering of experience entries with a reverse-chronological sort. `rank_publications_for_job` produces job-relevance ordering (1–10 scores), but this sort is discarded. A highly relevant older role lands behind a less-relevant current role in the generated CV, contradicting the story requirement that "most relevant experiences appear prominently."
**Source evidence:** `scripts/utils/cv_orchestrator.py:3168` — `sorted(..., key=lambda e: e.get('end_date', ''), reverse=True)` overwrites relevance order.
**Recommended resolution:** Use a hybrid ordering: primary sort by relevance score (descending), secondary tiebreak by recency. Alternatively, surface a "sort by relevance / sort by date" toggle in the Customise Experience tab.

---

## GAP-226: Domain Inference Missing Confidence Field

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30. Added `domain_confidence: Optional[float]` (0.0–1.0, `ge=0.0`, `le=1.0`) to `JobAnalysisResponse` in `scripts/utils/llm_response_models.py`. Updated `analyze_job_description` prompt in `scripts/utils/llm_client.py` to request the field. In `_handle_analyze_job()` (`scripts/utils/conversation_manager.py`), when `domain_confidence < 0.7` and a domain was inferred, a `domain_clarification` question is prepended to `cleaned_questions` before saving to `post_analysis_questions` — satisfying US-R1.3.
**Discovered:** 2026-06-30 (cycle 11) by resume-expert.
**Affected stories:** US-R1 (domain and role-type inference)
`JobAnalysisResponse` schema has no `confidence` field for domain or role-type inference. When the LLM has low confidence (e.g., a multi-domain JD), the analysis proceeds without any ambiguity signal to the UI or to the customisation pipeline. No clarifying question is triggered when domain inference is ambiguous. US-R1.3 explicitly requires that low-confidence domain inference triggers a targeted clarifying question.
**Source evidence:** `scripts/utils/conversation_manager.py` — `JobAnalysisResponse` dataclass/TypedDict has no `confidence` field. No ambiguity-triggered clarifying question exists in any route handler.
**Recommended resolution:** Add `domain_confidence: float` (0.0–1.0) to `JobAnalysisResponse`. In `recommend_customizations()`, if `domain_confidence < 0.7`, prepend a domain-clarifying question to the clarifying questions list before the user proceeds.

---

## GAP-227: Layout Instruction Undo Is Stack-Based But UI Shows Per-Entry Buttons

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — In `renderInstructionHistory()` (`web/layout-instruction.js`), only the most recent (last) instruction entry now shows an active "↩ Undo" button. Earlier entries show the same button but `disabled` with `opacity:0.3` and a tooltip: "Undo is sequential — undo the most recent instruction first". This matches the stack-based behavior of `undoInstruction()` without requiring a full non-linear undo rewrite.
**Discovered:** 2026-06-30 (cycle 11) by ux-expert.
**Affected stories:** US-U9.5 (layout review interaction quality)

---

## GAP-228: No In-Browser Preview of Final Generated CV

**Priority:** HIGH
**Status:** RESOLVED — 2026-06-30. Added a sandboxed `<iframe id="final-cv-preview">` to `web/final-generate.js`. The iframe loads `CV_*.html` via `/api/download/{base}`. A toggle button ("🌐 Show preview" / "🌐 Hide preview") and an inline "Hide" button in the pane header control visibility. Default state: open. State persists across re-renders via module-level `_previewOpen`. The `_htmlPreviewFile()` helper selects the human-readable HTML file (non-ATS) when multiple HTML files exist; preview pane is suppressed entirely if no HTML file is present.
**Discovered:** 2026-06-30 (cycle 11) by ux-expert.
**Affected stories:** US-U6.2 (generation and output state feedback)
`web/final-generate.js:72–100` — the "Generated Files" tab renders download links only. No iframe, embedded PDF viewer, or HTML preview is present for the final output. By contrast, the Layout Review stage has `<iframe id="layout-preview">` for the draft preview, creating an inconsistency: the draft is previewable but the final output is not. Users must download a file to verify the final result, adding friction and a round-trip.
**Source evidence:** `web/final-generate.js:72–100` — download link rendering only; no iframe or embed element. `web/layout-instruction.js` — `<iframe id="layout-preview">` for draft stage.
**Recommended resolution:** Add an HTML preview panel on the Download tab that renders the generated `CV_*.html` in a sandboxed iframe. Allow switching between HTML preview and download-only mode via a tab or toggle.

---

## GAP-229: No Version Labelling for Multiple Generation Runs in a Session

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added `generation_run` integer counter to `metadata.json` in `scripts/utils/cv_orchestrator.py`. Before writing metadata, the orchestrator reads the existing `metadata.json` (if any) to get the previous run number and increments it; first run is `1`. In `web/download-tab.js`, `_renderDownloadGrid()` now accepts a `generationRun` parameter and shows "Run #N — {date}" in the timestamp line when `generation_run > 1`.
**Discovered:** 2026-06-30 (cycle 11) by ux-expert.
**Affected stories:** US-U6.6 (version label)

---

## GAP-230: Rewrite Card Accepted/Rejected State Is Colour-Only

**Priority:** LOW
**Status:** RESOLVED 2026-06-30 — Added `<span id="rw-decision-badge-{id}" aria-live="polite">` to the rewrite card header in `web/rewrite-review.js`. Badge shows "✓ Accepted", "✓ Accepted (edited)", or "✗ Rejected" text (colour supplementary) on decision; cleared on reset. Also restored on back-navigation via the existing `_restoreDecisions()` → `applyRewriteAction()` / `saveRewriteEdit()` replay path.
**Discovered:** 2026-06-30 (cycle 11) by ux-expert and accessibility-specialist.
**Affected stories:** US-U7.5 (colour-independence), US-X1 (WCAG 1.4.1 Use of Color)
`web/styles.css:1241–1242` — `.rewrite-card.accepted` sets `border-color: #10b981; background: #f0fdf4` (green) and `.rewrite-card.rejected` sets `border-color: #ef4444; background: #fee2e2; opacity: 0.6` (red). The card-level accepted/rejected state is communicated entirely through colour and opacity. While the action buttons carry text labels (Accept / Reject / Edit), the whole-card visual state change adds no text badge or icon to communicate the decision state independently of colour. Users with protanopia or deuteranopia may not distinguish accepted (green) from rejected (red) cards.
**Source evidence:** `web/styles.css:1241–1242` — colour-only card state; no text badge or icon in card header for accepted/rejected state.
**Recommended resolution:** Add a compact text badge ("✓ Accepted" / "✗ Rejected") to the card header that appears once a decision is made, independent of card background colour.

---

## GAP-231: Cover Letter PDF Format Not Generated

**Priority:** MED
**Status:** RESOLVED — Re-verified 2026-06-30; `scripts/routes/master_data_routes.py:1711–1744` already generates a PDF alongside the DOCX via a WeasyPrint subprocess call. The HTML is built from paragraphs with Calibri/print-ready CSS and passed to WeasyPrint. If generation fails, DOCX is still saved and a warning is logged. The gap description was based on a stale code read before this was implemented.
**Discovered:** 2026-06-30 (cycle 11) by applicant (US-A7). See also GAP-185 from cycle 8.
**Affected stories:** US-A7 (cover letter generation)
`scripts/routes/master_data_routes.py:1619–1697` — cover letter generation saves only a `.docx` file. US-A7 acceptance criteria require both `.docx` and `.pdf` outputs. The cover letter PDF format is absent from the generation pipeline. GAP-185 tracked this from cycle 8; confirmed still open in cycle 11 source review.
**Source evidence:** `scripts/routes/master_data_routes.py:1619–1697` — `Document()` creation and save only; no WeasyPrint / headless-Chrome PDF conversion call.
**Recommended resolution:** After generating the cover letter DOCX, run WeasyPrint on an HTML rendering of the letter to produce a matching PDF. Store it alongside the DOCX in the output directory.

---

## GAP-232: Publications Review Has No Reorder Controls

**Priority:** MED
**Status:** RESOLVED
**Discovered:** 2026-06-30 (cycle 11) by applicant (US-A3).
**Resolved:** 2026-06-30 (loop session) — Added ↑/↓ reorder buttons to each publication row in `web/publications-review.js`. `movePubRow()` swaps items in `window._publicationsOrdered`, calls `_rebuildPubTableBody()` to re-render the tbody in-place, and POSTs to `/api/reorder-rows` with `type="publication"`. Backend endpoint in `scripts/routes/session_routes.py` extended to accept `publication` type and persist `publication_row_order` to session state.
**Affected stories:** US-A3 (review and approve content customizations)

---

## GAP-233: No Batch Terminology Consistency Check Across Rewrites

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added batch terminology consistency check at the end of `ConversationManager.run_persuasion_checks()` (`scripts/utils/conversation_manager.py`). After all per-bullet persuasion checks complete, scans all proposed texts for 14 common tech abbreviation variant pairs (ML/machine learning, AI/artificial intelligence, NLP/natural language processing, k8s/kubernetes, etc.) using case-insensitive word-boundary regex. When both short and long forms appear across different rewrites, emits a `terminology_inconsistency` warning with `flag_type='terminology_inconsistency'`, `severity='info'`, and a human-readable details string. The existing Rewrites tab already renders these warnings. 5 unit tests added in `tests/test_conversation_manager.py::TestTerminologyConsistencyCheck`.
**Discovered:** 2026-06-30 (cycle 11) by resume-expert.
**Affected stories:** US-R3 (resume quality standards — terminology consistency)
`scripts/utils/llm_client.py` — the 8 persuasion checks in `_check_persuasion_quality()` evaluate each bullet in isolation. No batch-level check verifies that a keyword adopted in one bullet (e.g., "machine learning") appears consistently across related bullets and the professional summary. `_renderConsistencyReport` (`web/cover-letter.js:348`) checks cross-document consistency but only for cover letter vs. CV, not within the CV itself.
**Source evidence:** `scripts/utils/llm_client.py` — `_check_persuasion_quality()` operates per-bullet; no cross-bullet consistency pass. `web/cover-letter.js:348–469` — `_renderConsistencyReport` is CL-vs-CV only.
**Recommended resolution:** After all per-bullet checks complete, run a batch consistency pass that identifies keyword variants (e.g., "ML" vs. "machine learning", "Python" vs. "Python 3") and surfaces a Rewrites tab warning: "Inconsistent terminology: 'ML' used in 2 bullets, 'machine learning' in 3 — consider standardizing."

---

## GAP-234: Relevance Score Unlabelled in Review Tables

**Priority:** HIGH
**Status:** RESOLVED — cycle 14
**Discovered:** 2026-06-30 (cycle 13) by ux-expert (US-U4.6).
**Affected stories:** US-U4 (review UI clarity)
`web/ats-modals.js:50–58` — experience/skill relevance scores are displayed as raw integers (e.g., "73") with no "/100" label and no grade legend (e.g., "70+ = Good", "50–69 = Fair", "<50 = Low"). Without domain knowledge a raw score is uninterpretable. Confirmed by UX Expert and Applicant sub-agents.
**Source evidence:** `web/ats-modals.js:50–58` — score rendered as plain number; no unit label or legend anywhere in the review panel template.
**Recommended resolution:** Append "/100" to each score display; add a compact legend row or tooltip ("70+ Good · 50–69 Fair · <50 Low") to the table header.

---

## GAP-235: Finalise Tab Notes Not Pre-Populated on Re-Open

**Priority:** HIGH
**Status:** RESOLVED — cycle 14
**Discovered:** 2026-06-30 (cycle 13) by recruiter-ops (US-O4).
**Affected stories:** US-O4 (notes and context management)
`web/finalise.js:42–52` — the Finalise tab initialises with a default status ("Ready to send") and an empty notes textarea on every tab load. There is no fetch of `metadata.json` or `session.json` on tab activation to restore previously saved notes. A user who enters submission-tracking notes, switches tabs, and returns finds the field blank.
**Source evidence:** `web/finalise.js:42–52` — tab init code; no GET request to restore prior notes value.
**Recommended resolution:** On Finalise tab open, call `/api/session/{id}/metadata` (or equivalent) and populate `#finalise-notes` and `#finalise-status` from the returned values before rendering.

---

## GAP-236: Notes Silently Truncated at 2000 Characters — No Counter or Warning

**Priority:** MED
**Status:** RESOLVED — cycle 14
**Discovered:** 2026-06-30 (cycle 13) by recruiter-ops (US-O4).
**Affected stories:** US-O4 (notes and context management)
`scripts/routes/session_routes.py:647` — the session notes field is truncated to 2000 characters server-side without surfacing a warning to the user. The `#finalise-notes` textarea has no `maxlength` attribute and no character counter. Users who paste long notes silently lose the trailing content with no error or warning.
**Source evidence:** `scripts/routes/session_routes.py:647` — `[:2000]` slice on notes; `web/index.html` — `#finalise-notes` has no `maxlength` attribute.
**Recommended resolution:** Add `maxlength="2000"` to the textarea; add a live character counter ("1543 / 2000") that turns amber at 80% and red at 100%.

---

## GAP-237: Preview HTML File Indistinguishable from Final Deliverables in File Review

**Priority:** MED
**Status:** RESOLVED — 2026-06-30. In `web/download-tab.js`, preview HTML files (matching `/preview/i`) now get `format='preview'`, a dashed card border, and a yellow "Working file — not for submission" badge next to the filename. Description updated to "Layout preview — intermediate working file, not for submission".
**Discovered:** 2026-06-30 (cycle 13) by recruiter-ops (US-O1).
**Affected stories:** US-O1 (file output clarity)
The File Review tab lists `cv_preview.html` alongside final deliverables (`cv_ats.docx`, `cv_branded.pdf`) without visual distinction. The preview file is an intermediate artifact for layout review, not a submission-ready file. Users reading the file list cannot easily tell which files to send to employers.
**Source evidence:** `web/download-tab.js:42–68` — file list rendered from `cvData.files` array without file-type categorisation or "preview" vs "deliverable" labelling.
**Recommended resolution:** Add a "Preview (not for submission)" badge or group preview files in a separate "Working Files" section in the File Review tab.

---

## GAP-238: Dual-Tab Ambiguity — "Generated Files" and "File Review" Visible Simultaneously

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Renamed `web/download-tab.js` H1 to "File Review"; added an info callout explaining the distinction between the Generated Files tab (immediate downloads, HTML preview) and the File Review sub-tab (ATS checks, archive). Added HTML preview pane with toggle to `web/final-generate.js`.
**Discovered:** 2026-06-30 (cycle 13) by recruiter-ops (US-O1).
**Affected stories:** US-O1 (file output clarity)
Both a "Generated Files" stage tab and a "File Review" tab within Finalise are visible at the same time after generation. They show overlapping file lists with no clear distinction of purpose. Users are unsure which tab to use when checking their output.
**Source evidence:** `web/ui-core.js:350–363` — `STAGE_TABS` includes both a "generate" stage tab and a "file-review" Finalise sub-tab; no disambiguation copy or tooltip.
**Recommended resolution:** Either merge both views or clearly differentiate them with distinct labels and brief descriptions ("Download files" vs "Check completeness and archive").

---

## GAP-239: File Generation Timestamp Absent When metadata.generation_date is Null

**Priority:** LOW
**Status:** RESOLVED 2026-06-30 — `web/download-tab.js:197`: When `generatedLabel` is empty (generation_date is null), renders "Not yet generated" placeholder in muted grey instead of an empty cell, making the missing-timestamp state explicit.
**Discovered:** 2026-06-30 (cycle 13) by recruiter-ops (US-O5).
**Affected stories:** US-O5 (session traceability)
When `metadata.generation_date` is null (e.g., session partially completed), the File Review shows file entries with no timestamp at all rather than a placeholder ("Not yet generated"). Users cannot tell whether a file is missing or just untracked.
**Source evidence:** `web/download-tab.js` — generation timestamp rendered inline only when present; null case shows empty cell.
**Recommended resolution:** Render "—" or "Not generated" when `generation_date` is null to make the missing-state explicit.

---

## GAP-240: Experience/Skill Icon-Button Active State Missing aria-pressed

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30
**Resolution:** Added `aria-pressed` attribute to all 4 state-toggle buttons (emphasize/include/de-emphasize/exclude) in `web/experience-review.js` and `web/skills-review.js`. Updated `handleActionClick()` and `bulkAction()` in `web/review-table-base.js` to sync `aria-pressed` whenever the `active` CSS class changes.
**Discovered:** 2026-06-30 (cycle 13) by accessibility-specialist (US-X3).
**Affected stories:** US-X3 (ARIA state accuracy)
Experience and skill review icon-buttons (`icon-btn`) that toggle "include/exclude" state do not carry `aria-pressed` to reflect the current toggle state. Sighted users see a visual colour change; keyboard and screen reader users have no programmatic indicator of state.
**Source evidence:** `web/experience-review.js` and `web/skills-review.js` — icon-btn click handlers toggle inclusion state visually but no `aria-pressed` attribute update found in event handlers.
**Recommended resolution:** On each toggle, set `el.setAttribute('aria-pressed', String(isIncluded))` on the button element, matching the pattern already used for rewrite buttons (`aria-pressed` added in GAP-178 fix).

---

## GAP-241: No @media (prefers-contrast: more) Adaptation

**Priority:** LOW
**Status:** RESOLVED 2026-06-30 — Added `@media (prefers-contrast: more)` block to `web/styles.css` (after the prefers-reduced-motion block): increases interactive element borders to 2px solid #000, forces body text to #000 on #fff, sets link colour to #00008b, enforces 2px borders on form inputs, and adds a 1px border on confidence badges.
**Discovered:** 2026-06-30 (cycle 13) by accessibility-specialist (US-X1).
**Affected stories:** US-X1 (WCAG 1.4 Distinguishable)
`web/styles.css` has a `@media (prefers-reduced-motion: reduce)` block at line 1621–1630 but no `@media (prefers-contrast: more)` block. Users who enable high-contrast system preferences receive no adapted colour scheme; text and border contrast may be insufficient in their display context.
**Source evidence:** `web/styles.css` — no `prefers-contrast: more` media query found.
**Recommended resolution:** Add a minimal `@media (prefers-contrast: more)` block that increases border contrast and ensures text-on-background ratios meet WCAG 1.4.6 (7:1) for body text and 4.5:1 for UI elements.

---

## GAP-242: Summary Post-Generation Validation Absent

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added `CVOrchestrator._validate_summary()` static method in `scripts/utils/cv_orchestrator.py`. Called at the end of `build_render_ready_content()`, it returns a `summary_warnings` list checking: (a) first word is not "I", (b) word count is 40–250, (c) top 3 required skills from job_analysis appear in the summary text. Warnings are returned as `selected_content['summary_warnings']`, saved in `metadata.json` as `summary_warnings`, and displayed in the File Review (Download) tab via `web/download-tab.js` using `cvData.metadata?.summary_warnings`.
**Discovered:** 2026-06-30 (cycle 13) by resume-expert (US-R2).
**Affected stories:** US-R2 (output quality standards)

---

## GAP-243: Achievement Selection Has No Diversity-Across-Impact-Types Constraint

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added `CVOrchestrator._classify_achievement_impact(text)` (keyword-based heuristic classifying into 6 buckets: financial, leadership, cost, customer, technical, process) and `CVOrchestrator._apply_achievement_diversity(scored, max_ach, max_type_fraction=0.5)`. When at least 3 distinct impact types are present, no single type may fill more than 50% of `max_ach` slots; remaining slots are backfilled in score order. `build_render_ready_content()` now calls `_apply_achievement_diversity()` instead of bare `scored_achievements[:max_ach]`. 10 unit tests in `tests/test_cv_orchestrator.py::TestAchievementDiversity`.
**Discovered:** 2026-06-30 (cycle 13) by resume-expert (US-R2).
**Affected stories:** US-R2 (output quality — achievement diversity)
Achievement selection (`scripts/utils/cv_orchestrator.py`) ranks by relevance score but applies no diversity constraint across impact types (e.g., revenue / cost / people-leadership / technical). A candidate with 8 revenue-impact achievements and 2 leadership achievements may get a CV with 5 revenue bullets and 0 leadership bullets even when the JD values both.
**Source evidence:** `scripts/utils/cv_orchestrator.py` — `_select_achievements()` (or equivalent) ranks by relevance score only; no grouping by impact type.
**Recommended resolution:** Classify achievements by impact type at selection time and apply a max-per-type cap (e.g., no more than 50% from one type when the JD values multiple types) before final ranking.

---

## GAP-244: Spell Check Results Not Sorted by Severity

**Priority:** LOW
**Status:** RESOLVED 2026-06-30 — Added `_sugSeverity()` ranking function in `renderSpellSuggestions()` (`web/spell-check.js`); each section's suggestions are cloned and stable-sorted before rendering: spelling (rule_id/category matches spell|typo) = 0, grammar = 1, style = 2, other = 3. Document order is preserved within each severity tier.
**Discovered:** 2026-06-30 (cycle 13) by resume-expert.
**Affected stories:** US-R7 (spell check flow)
Spell check results are presented in document order. Spelling errors (highest severity) are interleaved with stylistic suggestions (lowest severity). Users must scan the entire list to find critical errors; less important suggestions consume attention before errors are addressed.
**Source evidence:** `web/spell-check.js` — results rendered from LanguageTool response array directly, no severity-sort applied.
**Recommended resolution:** Re-sort results by severity before rendering: SPELLING first, then GRAMMAR, then STYLE, then LOCALE-SPECIFIC.

---

## GAP-245: No Proactive Page-Length Warning During Customisation

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added `GET /api/estimate-pages` endpoint in `scripts/routes/review_routes.py`. It calls `build_render_ready_content()` and `_estimate_cv_body_chars()` on the current customizations and returns `{ok, estimated_pages, chars}`. Added `_fetchPageEstimate()` function in `web/layout-instruction.js`, called at the end of `initiateLayoutInstructions()` when the Layout Review tab loads. Displays a banner (`#layout-page-estimate`) in the layout-input-pane: green "✓ Estimated ~N pages" for ≤3 pages, yellow "⚠ Estimated ~N pages" with a tip to reduce bullets for >3 pages. Users see this estimate before clicking Generate, giving them a chance to adjust content without incurring a full re-generation.
**Discovered:** 2026-06-30 (cycle 13) by resume-expert (US-R2).
**Affected stories:** US-R2 (CV length management)

---

## GAP-246: ATS Keyword List Not Deduplicated/Synonym-Grouped Before Display

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added `_dedup()` helper in `web/ats-modals.js` applied to `req`, `pref`, and `keywords` arrays before rendering to eliminate case-insensitive duplicate keyword entries in ATS modals.
**Discovered:** 2026-06-30 (cycle 13) by resume-expert and hr-ats.
**Affected stories:** US-H1 (ATS keyword alignment)
`web/ats-modals.js:50–58` — the ATS keyword list in the Analysis tab displays raw tokens from the LLM response including near-duplicates and variant forms (e.g., "Python", "python", "Python 3", "Python3"). These appear as separate entries, inflating the visual count and making the list hard to scan.
**Source evidence:** `web/ats-modals.js:50–58` — keyword list rendered from LLM response array without deduplication or synonym grouping.
**Recommended resolution:** Case-normalise and deduplicate the keyword list before rendering; optionally group near-duplicates under a canonical form with a "(3 variants)" annotation.

---

## GAP-247: No Help Reopen Trigger — Welcome Modal Cannot Be Reopened After Dismissal

**Priority:** HIGH
**Status:** RESOLVED — cycle 14
**Discovered:** 2026-06-30 (cycle 13) by heuristic sub-agent (H10 Critical) and first-time-user.
**Affected stories:** US-F1 (first-run onboarding), US-F4 (help access mid-workflow)
`web/index.html:317–399` — the welcome/onboarding modal shows on first load via `maybeShowWelcomeModal()` (`web/session-manager.js:169`). Once dismissed via the "Get Started" button there is no visible way to reopen it. No "Help" or "?" button exists in the UI. No command reference, keyboard shortcut guide, or help panel is accessible to a user mid-workflow.
**Source evidence:** `web/index.html:317–399` — modal markup; `web/session-manager.js:169` — `maybeShowWelcomeModal()` called only at startup; no other call site found. No help button found in `index.html` header or toolbar area.
**Recommended resolution:** Add a "?" or "Help" button to the toolbar (near the session controls) that calls `showWelcomeModal()` directly. Alternatively render a persistent help-link that opens the modal or a command reference panel.

---

## GAP-248: Silent Auto-Analyze Fires on Page Load Without User Confirmation

**Priority:** MED
**Status:** RESOLVED — 2026-06-30. Replaced `analyzeJob()` auto-fire in `web/app.js` with a status message: "📋 Job description detected — click Analyse Job when ready to begin." and a blue outline highlight on the Analyse Job button. Users now initiate analysis explicitly.
**Discovered:** 2026-06-30 (cycle 13) by heuristic sub-agent (H5) and applicant.
**Affected stories:** US-A2 (job analysis initiation), US-U3 (user control)
`web/app.js:88–95` — on page load, if a job description is present in the session but no analysis result exists, `analyzeJob()` fires automatically without user interaction. A returning user who intentionally left a description unanalyzed (e.g., mid-edit) will find that analysis has started without their knowledge.
**Source evidence:** `web/app.js:88–95` — auto-fire logic on init path; no user-confirmation dialog or "would you like to analyze now?" prompt.
**Recommended resolution:** Replace the auto-fire with a banner or toast: "Job description detected — click Analyze to begin." Let the user initiate analysis explicitly.

---

## GAP-249: Layout Confirm Step Redundant When No Layout Changes Made

**Priority:** MED
**Status:** RESOLVED — cycle 14
**Discovered:** 2026-06-30 (cycle 13) by ux-expert (US-U9.6).
**Affected stories:** US-U9 (workflow efficiency)
The Layout Review phase requires the user to click through a confirmation step even when they have made no layout instruction changes. The confirmation adds friction with no benefit when layout is unchanged from the default.
**Source evidence:** `web/layout-instruction.js` — confirm step is always shown regardless of whether any instruction has been added or changed.
**Recommended resolution:** Detect whether any layout instructions differ from defaults (or whether any were entered at all); if none, allow advancing directly to the next phase without a confirm dialog, or auto-confirm silently.

---

## GAP-250: Back-Navigation to Completed Step Fires Silently Without Confirmation

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30. Updated `handleStepClick()` in `web/workflow-steps.js` to call the existing `_showReRunConfirmModal(step, 'back-nav', doNavigate)` when clicking a completed step that has downstream completed steps. The modal lists the downstream steps and offers Cancel / Proceed. Navigation is unchanged when no downstream steps are completed (no unnecessary friction for early-stage back-navigation).
**Discovered:** 2026-06-30 (cycle 13) by heuristic sub-agent (H3).
**Affected stories:** US-U3 (user control and freedom)
Clicking a previously completed workflow step in the pill bar silently re-enters that step and may cause downstream state invalidation (e.g., backing into Customise re-enables re-run buttons without warning). There is no confirmation dialog explaining potential downstream impact.
**Source evidence:** `web/ui-core.js` — `_makeStepClickable()` handles click without checking for downstream invalidation or showing a warning dialog.
**Recommended resolution:** When navigating backwards to a completed step that has downstream state, show a brief warning: "Going back to [Step Name] may require re-running downstream steps. Continue?"

---

## GAP-251: Brand Name Inconsistency — "CV Customizer" vs "CV Builder"

**Priority:** MED
**Status:** RESOLVED — cycle 14
**Discovered:** 2026-06-30 (cycle 13) by applicant and heuristic sub-agent (H4).
**Affected stories:** US-A1 (first impression consistency)
The application header reads "CV Customizer" while the onboarding welcome modal calls it "CV Builder". These two names appear in the same user session and create confusion about what the product is called.
**Source evidence:** `web/index.html` — header element contains "CV Customizer"; welcome modal heading contains "CV Builder" (or vice versa — verify exact line numbers before fixing).
**Recommended resolution:** Standardise on one name throughout all UI surfaces. "CV Builder" is the more commonly used name in documentation; update the header to match.

---

## GAP-252: Intake Confirmation UI Not Connected — API Exists but No Frontend Step

**Priority:** HIGH
**Status:** RESOLVED — re-verified 2026-06-30; `_showIntakeConfirmCard()`, `_submitIntakeCard()`, `_skipIntakeCard()`, and `_proceedAfterIntake()` are fully implemented in `web/message-dispatch.js:420–509`; called from `analyzeJob()` in `web/job-analysis.js:145–155` after analysis completes; CSS in `web/styles.css:1575–1618`; backend routes in `scripts/routes/status_routes.py:1027–1086`. The GAP source-evidence claim that "no call to either endpoint found in `web/app.js`" was stale — the call is in `web/job-analysis.js`, not `app.js`.
**Discovered:** 2026-06-30 (cycle 13) by applicant (US-A2) and ux-expert.
**Affected stories:** US-A2 (job analysis — intake confirmation)

---

## GAP-253: Prior Clarification Answers Not Pre-Populated on Re-Visit

**Priority:** MED
**Status:** RESOLVED — re-verified 2026-06-30; `web/session-manager.js:600` restores `window.questionAnswers` from `statusData.post_analysis_answers` during session hydration on page load. `web/questions-panel.js:renderQuestionsPanel()` reads `window.questionAnswers` at lines 166–168 and pre-fills each textarea at line 188. Within-session re-visits also retain answers because `window.questionAnswers` persists in memory across tab switches. The GAP source-evidence claim that no pre-population existed in `web/app.js` was stale — the implementation is in `web/questions-panel.js` and `web/session-manager.js`.
**Discovered:** 2026-06-30 (cycle 13) by applicant (US-A2).
**Affected stories:** US-A2 (clarifying questions flow)

---

## GAP-254: Analysis Prompt Lacks Keyword-Frequency and Title-Position Weighting

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30. Updated item 6 of the `analyze_job_description()` prompt in `scripts/utils/llm_client.py` to instruct the model to rank `ats_keywords` by: (1) frequency of occurrence in the JD, (2) positional prominence (job title / requirements section keywords outrank body-text mentions).
**Discovered:** 2026-06-30 (cycle 13) by resume-expert (US-R1) and hr-ats.
**Affected stories:** US-R1 (domain/role inference quality)
The job analysis LLM prompt does not instruct the model to weight keywords by frequency (a keyword appearing 5× in the JD is more important than one appearing 1×) or by position (title-section keywords outrank body-text keywords). As a result, rare but prominent title keywords may rank below frequent but generic body keywords.
**Source evidence:** `scripts/utils/llm_client.py` — job analysis prompt section; no frequency or position weighting instruction found.
**Recommended resolution:** Add prompt instruction: "Weight keywords by: (1) frequency of occurrence in the JD, (2) whether they appear in the job title or role level section. Surface top weighted keywords first."

---

## GAP-255: No Post-LLM Check That Introduced Keywords Appear Mid-Sentence vs Appended

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30. Added `LLMClient.check_keyword_appended(proposed, original, ats_keywords)` static method in `scripts/utils/llm_client.py`. Checks whether any of the final 3 tokens of a rewritten bullet match an ATS keyword absent from the original; flags with `flag_type='keyword_appended'`, severity `'warn'`. Wired into `ConversationManager.run_persuasion_quality_checks()` for experience bullets when ATS keywords are available.
**Discovered:** 2026-06-30 (cycle 13) by resume-expert.
**Affected stories:** US-R2 (rewrite quality)
When the LLM rewrites bullets to incorporate missing ATS keywords, there is no post-generation check that keywords appear naturally mid-sentence rather than tacked on at the end (e.g., "Led team project management Python"). Keyword stuffing at sentence end passes all current persuasion checks.
**Source evidence:** `scripts/utils/llm_client.py` — `_check_persuasion_quality()` has 8 checks but none specifically detect end-of-sentence keyword appending.
**Recommended resolution:** Add a heuristic check: if the final 3 words of a rewritten bullet match ATS keywords that were absent from the original, flag as "keyword appended — review placement."

---

## GAP-256: No Cross-Document Terminology Consistency Enforcement

**Priority:** MED
**Status:** RESOLVED 2026-06-30 — Added cross-document terminology consistency check as item #5 in `_renderConsistencyReport()` (`web/cover-letter.js`). Collects text from CV (tab data), cover letter textarea, and all screening Q&A response textareas (`sc-text-*`). Checks 10 abbreviation/expansion pairs (ml/machine learning, ai/artificial intelligence, nlp, dl, llm, ui, ux, api, k8s/kubernetes, ci/cd/continuous integration). If both the long and short forms appear across the document set, a `warn` row is added to the consistency report. If no conflicts are found (and documents are non-trivial in length), a `pass` row is shown. The panel description updated to mention screening answers. Complementary backend batch check added in GAP-233 (conversation_manager.py).
**Discovered:** 2026-06-30 (cycle 13) by persuasion-expert (US-P4).
**Affected stories:** US-P4 (cross-document coherence)
The CV, cover letter, and screening question answers are generated sequentially but with no shared terminology constraint. A technology name ("TensorFlow" in CV, "TF" in cover letter, "deep learning frameworks" in screening answers) may vary without any cross-document check or warning.
**Source evidence:** `web/cover-letter.js:348–469` — `_renderConsistencyReport` checks CL vs. CV for structural consistency but not for terminology consistency. No cross-document terminology check in the screening Q&A path.
**Recommended resolution:** After all three documents are generated, run a batch term-normalisation check: identify the canonical form of each named technology/concept in the CV and flag divergences in the cover letter and screening answers.

---

## GAP-257: No Acronym-Expansion-on-First-Use Enforcement Across Generated Documents

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30. Added acronym-expansion instruction to both generators: cover letter prompt in `scripts/routes/master_data_routes.py:cover_letter_generate()` and screening-question prompt in `screening_generate()`. Both now include: "Acronyms: expand every acronym on first use — the reviewer may be a non-technical screener/HR reviewer."
**Discovered:** 2026-06-30 (cycle 13) by persuasion-expert.
**Affected stories:** US-P3 (professional polish)
Generated documents (CV, cover letter, screening answers) may use acronyms (e.g., "ATS", "KPI", "CI/CD") without expanding them on first use. This is standard professional writing practice and is particularly important in cover letters addressed to non-technical hiring managers.
**Source evidence:** No acronym-expansion check found in `scripts/utils/llm_client.py`, `scripts/utils/cv_orchestrator.py`, or any route handler.
**Recommended resolution:** Add an acronym-expansion prompt instruction to the cover letter and screening Q&A generators. For CV bullets, surface a review warning for common acronyms without prior expansion.

## GAP-258: Decorative ATS Legend Dots Lack aria-hidden

**Priority:** LOW
**Status:** RESOLVED — re-verified 2026-06-30; `web/ats-modals.js:205–207` already has `aria-hidden="true"` on all three `●` spans. The gap description was based on a stale pre-implementation snapshot.
**Discovered:** 2026-06-30 (cycle 14) by accessibility-specialist.
**Affected stories:** US-X1 (keyboard and screen-reader navigation)

## GAP-259: Finalise Notes Character Counter Has No aria-live

**Priority:** LOW
**Status:** RESOLVED — re-verified 2026-06-30; `web/finalise.js:108` already has `aria-live="polite"` on `#finalise-notes-counter`. The gap description was based on a stale pre-implementation snapshot.
**Discovered:** 2026-06-30 (cycle 14) by accessibility-specialist.
**Affected stories:** US-X1, US-X3 (form feedback for screen readers)

## GAP-260: "Download" Step Pill and "File Review" Tab Use Different Names for Same Step

**Priority:** MED
**Status:** RESOLVED — 2026-06-30
**Discovered:** 2026-06-30 (cycle 14) by recruiter-ops.
**Affected stories:** US-O2, US-U4 (orientation and clarity)
The workflow step pill in the pill bar is labelled "Download" while the tab inside the Finalise stage is labelled "File Review". Users navigating between the two surfaces see inconsistent labels for the same step, which causes disorientation.
**Source evidence:** `web/index.html` — pill bar label; `web/finalise.js` — "File Review" tab. Dual naming confirmed by Recruiter Ops and Heuristic (H4 — Consistency and Standards).
**Resolution:** Pill bar step now labelled "File Review" to match the tab (updated `web/index.html:136`, `web/workflow-steps.js` — all 3 download label constants).

## GAP-261: US/UK Spelling Inconsistency Throughout UI

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30
**Discovered:** 2026-06-30 (cycle 14) by ux-expert.
**Affected stories:** US-U4, US-G1 (brand consistency)
"Analyze"/"Analyse" and "Customize"/"Customise" are used interchangeably across pill labels, tab names, and button text. This creates an inconsistent tone and makes the UI appear unpolished.
**Source evidence:** `web/index.html` — mixed pill and tab labels. UX Expert noted the inconsistency; Graphical Designer confirmed (H4 — Consistency and Standards).
**Resolution:** Standardised visible UI text to UK English (consistent with "Customise", "Finalise", "ATS-optimised" already in use). Changed "Analyze Job" → "Analyse Job" in `web/index.html`, `web/job-input.js`, `web/questions-panel.js`; "Re-analyze" → "Re-analyse" in `web/harvest.js`. JS function/ID names (`analyzeJob`, `analyze-btn`) left unchanged as they are internal identifiers.

## GAP-262: Error Messages in layout-instruction.js Dump Raw error.message With No Recovery Guidance

**Priority:** MED
**Status:** RESOLVED — 2026-06-30
**Discovered:** 2026-06-30 (cycle 14) by heuristic sub-agent.
**Affected stories:** US-U6, US-A6 (error handling and recovery)
Nine or more error catch blocks in `web/layout-instruction.js` append `error.message` directly to the chat or show it as a status string without providing a recovery action, retry button, or guidance on what the user should do next. This violates H9 (Help users recognise, diagnose, and recover from errors).
**Source evidence:** `web/layout-instruction.js` — multiple `catch(e)` blocks using `_appendToChat(e.message)` or equivalent. Heuristic rated H9 as 🟠 Major.
**Resolution:** All 9 raw `error.message` dumps replaced with user-friendly messages that include a plain-language explanation and a suggested recovery action (retry, rephrase, or reload). `web/layout-instruction.js` — all catch blocks.

## GAP-263: Two Placeholder Workflow Steps Are Dead Ends

**Priority:** MED
**Status:** RESOLVED — re-verified 2026-06-30; `web/interview-prep.js` and `web/thank-you.js` both render a "coming soon" card with an emoji heading, explanation text, and a "Proceed to next step →" button. Both are wired into `switchTab()` in `web/review-table-base.js:262–267`. The GAP claim that they "show no content" was stale — placeholder content with forward navigation was already implemented.
**Discovered:** 2026-06-30 (cycle 14) by heuristic sub-agent.
**Affected stories:** US-F3, US-A5 (workflow orientation and momentum)

## GAP-264: CSS Confidence Badge Only Handles 3 Levels; LLM Emits 5-Point Scale

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30
**Discovered:** 2026-06-30 (cycle 14) by trust-compliance.
**Affected stories:** US-C3 (AI confidence transparency)
The CSS confidence badge classes cover only `confidence-high`, `confidence-medium`, and `confidence-low`. The LLM can output a 5-point confidence scale including "Very High" and "Very Low". Labels that map to `confidence-very-high` or `confidence-very-low` render without styling (plain text, no colour-coded badge).
**Source evidence:** `web/styles.css` — search for `.confidence-` classes; Trust/Compliance persona found only 3 variants. LLM response schema allows 5 levels.
**Resolution:** Added `.confidence-very-high` (deeper green, bold) and `.confidence-very-low` (deeper red, bold) to `web/styles.css:730–742`.

## GAP-265: rewrite_audit Array Not Surfaced as In-UI Inspectable Log

**Priority:** MED
**Status:** RESOLVED — 2026-06-30; added `_renderRewriteAuditLog()` to both `web/rewrite-review.js` (inline string renderer called from `renderRewritePanel()`) and `web/finalise.js` (async DOM renderer called from `populateFinaliseTab()`). The Rewrite Review tab displays a collapsible "Rewrite Audit Log" `<details>` panel showing outcome icon (✅/❌/✏️), location, original text (strikethrough), proposed text, and final edited text per entry when `_backendRewriteAudit` is populated. The Finalise tab fetches `/api/rewrites` and renders the same audit in a `#rewrite-audit-log` element.
**Discovered:** 2026-06-30 (cycle 14) by trust-compliance.
**Affected stories:** US-C4 (audit trail visibility)

## GAP-266: No Minimum 2-Bullets-Per-Job Enforcement

**Priority:** MED
**Status:** RESOLVED — 2026-06-30; added sparse-bullet check to `_collect_render_snapshot_inputs()` in `scripts/routes/generation_routes.py:456–495`. Reads `achievement_edits` from session state and emits a `sparse_experience_bullets` content_warning (code + severity + message) for any experience whose visible bullet count is < 2. Warning surfaces to the user in the Preview generation response via the existing `content_warnings` mechanism. Not a hard block — user can proceed with fewer bullets.
**Discovered:** 2026-06-30 (cycle 14) by hiring-manager.
**Affected stories:** US-M3 (resume quality standards)

## GAP-267: No Bullet Line-Length Check

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30
**Resolution:** Added `_detect_long_bullets()` static method to `CVOrchestrator` in `scripts/utils/cv_orchestrator.py` that flags bullets >200 characters. Called in `generate_cv()` after `_detect_date_overlaps`; results stored in metadata as `long_bullet_warnings`. Added a callout in `web/download-tab.js` to display warnings when present.
**Discovered:** 2026-06-30 (cycle 14) by hiring-manager.
**Affected stories:** US-M3 (resume quality standards)
The system does not check whether individual CV bullets exceed the recommended ≤2-line target. Excessively long bullets reduce scannability, look unprofessional, and may wrap awkwardly in the generated DOCX.
**Source evidence:** No line-length check found in `scripts/utils/cv_orchestrator.py` or any post-generation validation route.
**Recommended resolution:** After generation, scan bullets in the ATS DOCX for character length >200 (approximate 2-line threshold at standard font size) and surface them as warnings in the ATS validator report.

## GAP-268: "Don't Show Again" Label Contradicts "? Help" Button

**Priority:** LOW
**Status:** RESOLVED — 2026-06-30
**Discovered:** 2026-06-30 (cycle 14) by heuristic sub-agent.
**Affected stories:** US-F1, US-S1 (help accessibility and onboarding)
The welcome modal contains a "Don't show again" checkbox that, once checked, sets a localStorage flag. The cycle-14 fix (GAP-247) added a "? Help" header button that bypasses this flag — so the modal CAN be reopened regardless. But once the user has checked "Don't show again", the checkbox label is no longer accurate (it implies the modal is permanently suppressed, which it isn't via the Help button).
**Source evidence:** `web/session-manager.js` — `showWelcomeModal()` bypasses localStorage flag; `web/index.html:63–66` — "? Help" button.
**Resolution:** Label updated to "Don't show automatically on startup" at `web/index.html:392` — accurately describes the behaviour (suppresses auto-show, not the Help-button reopen path).

## GAP-269: 10 Customise Sub-Tabs Have No Completion Indicators

**Priority:** MED
**Status:** RESOLVED — 2026-06-30
**Discovered:** 2026-06-30 (cycle 14) by ux-expert and heuristic sub-agent.
**Affected stories:** US-U3, US-A4 (progress visibility in customisation stage)
The Customise stage has 10 sub-tabs. There is no visual indicator on any tab showing whether the user has reviewed its content, made changes, or confirmed their decisions. Users must remember which tabs they have visited and cannot tell at a glance whether they have completed the Customise stage.
**Source evidence:** `web/ui-core.js:350–363` — sub-tab definitions; no completion badge or visited-state class found in `web/styles.css` or `web/app.js`. Heuristic rated H6 (Recognition rather than recall) as 🟡 Minor.
**Resolution:** Added `_visitedCustomiseTabs` Set and `_updateVisitedTabIndicators()` to `web/review-table-base.js`; `switchTab()` marks each customise tab visited on first view and applies `.tab--visited` CSS class. CSS added to `web/styles.css:643` — small green dot after the tab label for visited tabs.

## GAP-270: CDN Font Dependency for WeasyPrint — No Bundled Local Fallback

**Priority:** MED
**Status:** RESOLVED — 2026-06-30; added `scripts/setup_fonts.py` (one-time downloader) and `scripts/utils/wp_render.py` (standalone WeasyPrint subprocess). `cv_orchestrator.py:_try_weasyprint()` now calls `wp_render.py` which substitutes the Google Fonts CDN `<link>` with inline `@font-face` CSS using `file://` URIs to local WOFF2 files in `web/fonts/` when that directory exists. Falls back to CDN transparently when fonts are not pre-downloaded.
**Discovered:** 2026-06-30 (cycle 14) by hiring-manager.
**Affected stories:** US-M2, US-H1 (generated materials quality and portability)

## GAP-271: Focus Outline Removed on Intake Form Inputs — WCAG 2.1 AA Violation

**Priority:** HIGH
**Status:** RESOLVED — 2026-07-02; replaced `outline: none` with `outline: 2px solid var(--cv-accent); outline-offset: 2px` in `web/styles.css` `.intake-field-row input:focus`.
**Discovered:** 2026-07-01 (cycle 29) by accessibility-specialist, ux-expert.
**Description:** `styles.css:1651` sets `outline: none` on `.intake-field-row input:focus` with no visual replacement. This removes the keyboard focus indicator for all intake form fields, violating WCAG 2.1 Success Criterion 2.4.7 (Level AA).
**Affected stories:** US-X3, US-U7
**Fix:** Replace `outline: none` with a styled focus ring, e.g. `outline: 2px solid var(--cv-accent); outline-offset: 2px`.

## GAP-272: Spell-Check Action Buttons Missing aria-label

**Priority:** HIGH
**Status:** RESOLVED — 2026-07-02; added `aria-label` matching each button's `title` attribute in `web/spell-check.js` (Apply custom correction, Ignore this suggestion, Add to custom dictionary).
**Discovered:** 2026-07-01 (cycle 29) by accessibility-specialist.
**Description:** The "Apply", "Ignore", and "Add to Dictionary" buttons in the spell-check UI (`spell-check.js:~249–255`) use the `title` attribute only. Screen readers announce `title` inconsistently and it does not satisfy WCAG 4.1.2 (Name, Role, Value). Each button needs an explicit `aria-label`.
**Affected stories:** US-X3
**Fix:** Add `aria-label="Apply suggestion"`, `aria-label="Ignore"`, `aria-label="Add to dictionary"` to the respective buttons.

## GAP-273: ATS Modal Focus Stack Bug — restoreFocus Returns to Wrong Element

**Priority:** HIGH
**Status:** RESOLVED — 2026-07-02; exported `pushFocusStack()` from `ui-core.js`; imported and called in both `openAtsReportModal()` and `openJobAnalysisModal()` in `ats-modals.js` before `trapFocus()`; removed now-redundant module-level `_atsModalPreviousFocus` / `_jobAnalysisPreviousFocus` variables and their manual `.focus()` fallback calls from close functions.
**Discovered:** 2026-07-01 (cycle 29) by accessibility-specialist.
**Description:** `openAtsReportModal()` and `openJobAnalysisModal()` in `ats-modals.js` call `trapFocus` without first pushing the currently focused element to `_focusStack`. When the modal closes, `restoreFocus()` pops an unrelated entry and returns focus to the wrong element.
**Affected stories:** US-X2
**Fix:** Add `_focusStack.push(document.activeElement)` before each `trapFocus` call in both modal openers, matching the pattern used in `ui-core.js` `confirmDialog`.

## GAP-274: Silent Back-Navigation on Completed Workflow Steps

**Priority:** HIGH
**Status:** RESOLVED — duplicate of GAP-250. `_showReRunConfirmModal(step, 'back-nav', doNavigate)` already called at `web/workflow-steps.js:1061` when back-navigating to a completed step with downstream completed steps. Fixed in commit `ea87540` (2026-06-30). Cycle 29 review agents re-discovered it without being aware of GAP-250.
**Discovered:** 2026-07-01 (cycle 29) by ux-expert, applicant.
**Description:** Clicking a completed step pill in the workflow nav navigates silently with no destructive-action warning. Only the ↻ re-run button (`confirmReRunPhase()`) shows a confirmation dialog. Direct step-pill click bypasses this gate, potentially causing users to navigate back and lose unsaved downstream state without warning.
**Affected stories:** US-U1, US-A12
**Fix:** `handleStepClick()` in `workflow-steps.js` should check if the target step precedes the current phase and, if so, call `confirmDialog` before navigating.

## GAP-275: Color-Only Rewrite Card State — Accepted/Rejected

**Priority:** MEDIUM
**Status:** RESOLVED — duplicate of GAP-230. Decision badges ("✓ Accepted", "✗ Rejected", "✓ Accepted (edited)") with green/red backgrounds already rendered at `web/rewrite-review.js:502–508` and `562–568`, in commit `f21a6d0`. Cycle 29 review agents did not detect the existing implementation. Verified 2026-07-02 (cycle 31).
**Discovered:** 2026-07-01 (cycle 29) by ux-expert, accessibility-specialist.
**Description:** Accepted and rejected rewrite cards communicate their state via border color and background tint only (`rewrite-review.js`). No persistent text label ("Accepted" / "Rejected") is rendered on the card. Color-blind users cannot reliably distinguish card state.
**Affected stories:** US-X1, US-U5
**Fix:** Render a small status badge or text chip ("✓ Accepted" / "✗ Rejected") on each card after the decision is made.

## GAP-276: Post-Archive Notes Not Editable in Sessions Modal

**Priority:** HIGH
**Status:** RESOLVED — duplicate of GAP-210. Notes edit textarea (lines 404–413 `web/session-switcher-ui.js`) and edit-notes button (line 420) are wired to `PATCH /api/sessions/metadata` (line 704). Added in commit `edc8e49`. Cycle 29 review agents did not detect the implementation.
**Discovered:** 2026-07-01 (cycle 29) by recruiter-ops.
**Description:** The sessions modal inline-edit widget in `session-switcher-ui.js` exposes only a status dropdown for post-archive editing. The backend `PATCH /api/sessions/metadata` endpoint accepts a `notes` field, but no notes input is wired in the frontend sessions modal. Recruiters cannot edit notes after archiving without re-opening the full session.
**Affected stories:** US-O2
**Fix:** Add a `<textarea>` (or expandable notes field) to the sessions modal edit row, wired to `PATCH /api/sessions/metadata` with `{ notes: value }`.

## GAP-277: ATS Validation Failure Does Not Block File Download

**Priority:** HIGH
**Status:** RESOLVED — `_renderDownloadGrid()` in `web/download-tab.js:163–167` blocks downloads per format for critical ATS failures; `_NON_BLOCKING_CHECKS` (line 150) lists advisory-only checks. Keyword fail blocks all formats. Introduced in commit `5ea7a93`. Cycle 29 review agents did not detect this implementation.
**Discovered:** 2026-07-01 (cycle 29) by hr-ats.
**Description:** Story US-H6 requires that any ATS validation check failure blocks the file download. The 17-check validation report is generated and persisted to `metadata.json`, and the ATS Report modal displays results, but the finalise/download path does not enforce a gate. Files are downloadable regardless of validation outcome.
**Affected stories:** US-H6
**Fix:** In the download tab / finalise flow, check `ats_validation` from `metadata.json` for any `status: 'fail'` entries and block the download button, showing the specific failing check(s).

## GAP-278: skill_type Classification Not Written Back to Master CV via Harvest

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02 (cycle 32). Backend generates `skill_type_update` harvest candidates in `_collect_harvest_skill_type_candidates()` (`generation_routes.py:997`) and applies them via `_harvest_update_skill_type()` (`generation_routes.py:1052`). Frontend display config added: `skill_type_update` added to `HARVEST_TYPE_CONFIG`, `HARVEST_TYPE_DESCRIPTIONS`, and `HARVEST_SOURCE_BADGE` in `web/harvest.js`. (Status was erroneously left as OPEN when cycle 32 reconciliation notes were written.)
**Discovered:** 2026-07-01 (cycle 29) by hr-ats.
**Description:** `_classify_skill_type()` computes hard/soft classification at render time from the `skill_type` field or heuristics. If `skill_type` is absent, classification is ephemeral — recomputed each run. The harvest workflow does not write back `skill_type` to `Master_CV_Data.json`, so user-confirmed or heuristic-derived classifications are lost between sessions.
**Affected stories:** US-H8
**Fix:** During harvest, include `skill_type` in the diff candidates for any skill whose computed classification differs from the stored value (or whose stored value is missing).

## GAP-279: Cold-Restore of Prior Rewrite Decisions Fires Without User Notification

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02. Added `_restoreToastShown` flag and toast call in `_restoreDecisions()` (`web/rewrite-review.js:55–90`). Toast fires once per module init when decisions are actually loaded (both localStorage restore and cold-restore from backend audit paths). Message: "Your previous rewrite decisions have been restored — you can still change them." (warning style, 6s).
**Discovered:** 2026-07-01 (cycle 29) by trust-compliance.
**Description:** When a session is restored, prior accept/reject/edit decisions on rewrite cards are silently reapplied. The user sees pre-decided cards without being told that these decisions were made in a prior session and are being restored. This creates a trust gap — users may not realize they can still change their prior decisions.
**Affected stories:** US-C2
**Fix:** Display a brief banner or toast when rewrite decisions are restored from a prior session: "Your previous rewrite decisions have been restored. You can still change them."

## GAP-280: Duplicate @keyframes spin Definitions in styles.css

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02; removed duplicate `@keyframes spin` at line 1494; removed `@keyframes llm-spin` at line 574; replaced `animation: llm-spin` with `animation: spin` at the LLM spinner element. Single `@keyframes spin` at line 929 remains.
**Discovered:** 2026-07-01 (cycle 29) by graphical-designer.
**Description:** `@keyframes spin` is defined twice in `web/styles.css` (lines 930 and 1494). `@keyframes llm-spin` at line 574 is also redundant with `spin`. This is dead CSS that increases file size and maintenance overhead.
**Affected stories:** US-G3 (CSS maintainability)
**Fix:** Consolidate to a single `@keyframes spin` definition and replace `llm-spin` references with `spin`.

## GAP-281: No Narrative-Thread Counter in Persuasion Check

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02. Added narrative-thread counting to `check_persuasion()` in `scripts/utils/cv_orchestrator.py:4400–4425`. Uses `relevant_for` tags on achievements; if ≥3 themes are within 20% of the top theme's bullet count and ≥10 tagged bullets exist, a `narrative_thread_advisory` dict is added to the summary. Surfaced in the download tab persuasion panel (`web/download-tab.js:308–313`) as an amber advisory bar below the findings list.
**Discovered:** 2026-07-01 (cycle 29) by persuasion-expert.
**Description:** Story US-P1 requires a warning when the CV presents more than 2 equally-weighted narrative threads (e.g., simultaneous emphasis on management, technical depth, and sales). No such check is implemented in `check_persuasion()` or elsewhere in `cv_orchestrator.py`.
**Affected stories:** US-P1
**Fix:** Add a narrative-thread counter to `check_persuasion()`: detect the top N achievement categories by bullet count; if the top 2 categories have similar weights (within 20%) and a 3rd category is also similarly weighted, emit a `narrative_thread` advisory finding.

## GAP-282: Publication Omission Rationale Not Surfaced to User

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02 (cycle 32). `_select_publications()` in `cv_orchestrator.py` now returns `relevance_score` (0-10 normalized from raw heuristic score) and `rationale` (e.g., "Heuristic: recent (2023), journal article, 2 keyword matches") in every pub dict. The fallback path in `review_routes.py` calls `_select_publications(max_count=None)` to score all publications and partitions into recommended (top 15) and not-recommended (rest) — both groups show real scores and rationale in the Score and Reasoning columns of `publications-review.js`. LLM path similarly gets heuristic scores for non-recommended entries.
**Discovered:** 2026-07-01 (cycle 29) by persuasion-expert, resume-expert.
**Description:** `_select_publications()` ranks publications by relevance and may silently exclude low-ranked entries. Users accept/reject the presented shortlist without seeing per-item relevance scores or the reason why specific publications were excluded from the shortlist.
**Affected stories:** US-R2, US-P2
**Fix:** Surface per-item relevance scores and a brief rationale in the Publications review UI (e.g., "Excluded: low relevance to target domain (score: 0.3)").

## GAP-283: Cover Letter Word Count Target Overshoots Story Specification

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02. Updated `_cover_letter_word_count_instruction()` in `scripts/routes/master_data_routes.py:118–122` to: standard 250–300w, executive 300–400w, academic/research 400–500w. Aligned with US-P3 ≤300w ceiling for standard roles.
**Discovered:** 2026-07-01 (cycle 29) by persuasion-expert.
**Description:** `_cover_letter_word_count_instruction()` returns 300–400 words for standard roles. Story US-P3 specifies ≤300 words. The current implementation produces cover letters 0–33% longer than the story's maximum.
**Affected stories:** US-P3
**Fix:** Adjust word count ranges: 250–300w standard, 300–400w executive, 400–500w research, and update the client-side validator to enforce the lower ceiling for standard roles.

## GAP-284: "queued" Application Status Absent from Lifecycle

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02. Added 'queued' (amber badge #eab308) between 'sent' and 'interview' in both `appStatusLabels`/`appStatusColors` dicts in `web/session-switcher-ui.js`; added to `_VALID_STATUSES` in `scripts/routes/session_routes.py:721` and the finalise status allowlist in `scripts/routes/generation_routes.py:2105`.
**Discovered:** 2026-07-01 (cycle 29) by applicant.
**Description:** The application status lifecycle has six values (draft, ready, sent, interview, rejected, accepted) but omits "queued" — used by applicants who have submitted but are awaiting ATS screening. US-A1 references this status.
**Affected stories:** US-A1
**Fix:** Add "queued" between "sent" and "interview" in the status enum definition and the sessions modal status dropdown.

## GAP-285: Stale "Finalise tab" Label in master-cv.js

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02; `web/master-cv.js:285` updated to "The Harvest feature (Harvest tab)…". Also fixed matching stale text in `scripts/routes/master_data_routes.py` and `scripts/routes/generation_routes.py` where 409 error messages said "post-job finalise workflow" — updated to "Harvest step".
**Discovered:** 2026-07-01 (cycle 29) by master-cv-curator.
**Description:** `web/master-cv.js:~285` contains the text "The Harvest feature (Finalise tab)…". The tab is now labeled "Harvest" in the UI. This creates a confusing internal mismatch visible in tooltip or help text.
**Affected stories:** US-MC3
**Fix:** Update the string to "The Harvest feature (Harvest tab)…" in `master-cv.js`.

## GAP-286: Non-Confidential Provider Badge Absent for Implicitly Non-Private Providers

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02. Changed `ncBadge.style.display` condition in `web/auth-provider.js:90` from `info.confidential === false` to `info && info.confidential !== true`. Badge now shows for any provider that doesn't explicitly declare `confidential: true`, making the fail-safe default visible.
**Discovered:** 2026-07-01 (cycle 29) by trust-compliance.
**Description:** The "Non-confidential" warning badge in the header only fires when a provider has `confidential: false` explicitly set. Providers without this field defined show no badge, leaving their data-handling opaque. Most providers implicitly are non-confidential.
**Affected stories:** US-C1
**Fix:** Default to showing the "Non-confidential" badge unless `confidential: true` is explicitly set in the provider definition. This is a fail-safe default.

## GAP-287: CV Header text-align:center Inconsistent with Left-Aligned Body Grid

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 31). Changed `.cv-header { text-align: center }` to `text-align: left` in `templates/cv-style.css:36`.
**Discovered:** 2026-07-01 (cycle 29) by graphical-designer.
**Description:** `cv-template.html` renders the CV header (`<div class="cv-header">`) with `text-align: center`, while the CV body uses a left-aligned two-column grid. This creates a visual inconsistency in the generated output — centered header above a left-aligned content body.
**Affected stories:** US-G1, US-M1
**Fix:** Align the CV header to match the body layout. For two-column designs, left-align the header (or use a flex row for name + contact info side-by-side).

## GAP-288: Paste-Text Input Shows Character Count But No Minimum-Length Hint

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02. `_updatePasteCharCount()` in `web/job-input.js:327–329` now shows a grey hint ("Paste the full job description (minimum 200 characters for best results)") when the textarea is empty. `showLoadJobPanel()` calls `_updatePasteCharCount()` immediately after rendering so the hint appears before any typing.
**Discovered:** 2026-07-01 (cycle 29) by ux-expert, first-time-user.
**Description:** The job description paste textarea shows an ARIA-live character count (`job-input.js:119–120`) but gives no minimum-length guidance. Users submitting very short job descriptions receive no warning until the LLM produces a poor analysis.
**Affected stories:** US-U2, US-F1
**Fix:** Add a helper text element: "Paste the full job description (minimum ~200 characters for best results)." Show an amber warning if the count drops below 200 before submission.

## GAP-289: No Named Generation Step Progress in LLM Busy Overlay

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02 (cycle 32). Inside the generation polling loop in `web/session-actions.js`, `_updateLLMStatusBar(true, label)` is called each polling tick with the active step name and position (e.g., "Generating CV: ats docx (1 of 3)…"). (Status was erroneously left as OPEN when cycle 32 reconciliation notes were written.)
**Discovered:** 2026-07-01 (cycle 29) by ux-expert.
**Description:** The `#llm-busy-overlay` shows a spinner, elapsed time, and a slow-mode badge but does not display named steps for long multi-step generation sequences (e.g., "Step 1 of 3: Generating HTML preview…"). Users have no indication of how far along the generation pipeline is.
**Affected stories:** US-U6, US-F3
**Fix:** Emit named step events from the generation pipeline and update `#llm-busy-label` with "Generating preview (1 of 3)…" etc.

## GAP-290: No Skeleton Placeholders for Async Content Areas

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 31). Added `min-height: 120px` to `#rewrite-cards` and `#skills-table-container` in `web/styles.css` to prevent cumulative layout shift while async content loads.
**Discovered:** 2026-07-01 (cycle 29) by ux-expert.
**Description:** Content areas for LLM-generated results (analysis results card, rewrite cards, skills table) have no skeleton loaders or dimensioned placeholders. When async content arrives, the layout shifts (Cumulative Layout Shift), causing disorientation.
**Affected stories:** US-U6, US-U8
**Fix:** Add `min-height` or skeleton-loader placeholder divs to the main async content containers so the layout is stable before content loads.

## GAP-291: Two-Button Layout Proceed Path Has No Inline Explanation

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 31). Added `#layout-two-step-hint` `<p>` element to the layout instruction HTML template in `web/layout-instruction.js:373`; shown/hidden alongside `#confirm-layout-btn` via `refreshLayoutReviewState()`. Text: "Once the preview looks right, confirm the layout — then generate your final submission files."
**Discovered:** 2026-07-01 (cycle 29) by ux-expert, first-time-user.
**Description:** The layout review stage has two sequential proceed buttons — "Confirm Layout" and "Generate Final Files" — toggled by generation state. New users see whichever is visible with no explanation of why there are two steps or what each one does differently.
**Affected stories:** US-U9, US-F3
**Fix:** Add a one-line scope label below the layout instruction textarea that explains the two-step nature: e.g., "1. Confirm your layout is ready → 2. Generate your final files."

## GAP-292: Candidate Name Casing Not Validated in ATS DOCX

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 31). Added `docx_name_casing` check (#6b) in `validate_ats_report()` (`scripts/utils/cv_orchestrator.py`). Reads the first heading paragraph as the candidate name; emits `warn` if all-uppercase or all-lowercase, `pass` otherwise.
**Discovered:** 2026-07-01 (cycle 29) by hr-ats.
**Description:** The ATS DOCX renders the candidate name directly from `Master_CV_Data.json` without casing validation. Names in all-uppercase or all-lowercase pass through silently; some ATS systems reject or mis-parse non-standard casing.
**Affected stories:** US-H3
**Fix:** Add a pre-generation warning in the ATS validation report when the candidate name is all-uppercase or all-lowercase: "Candidate name appears to be in unusual casing — ATS systems may have difficulty parsing it."

## GAP-293: Total Session Processing Time Absent from Finalise Confirmation Summary

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 31). Backend `finalise_application()` in `scripts/routes/generation_routes.py` now computes `session_duration_secs` from `entry.created` and adds it to `summary`. Frontend `web/finalise.js` renders "Session duration: Xh Ym" or "Xm Ys" in the archived confirmation list via `_formatDuration()`.
**Discovered:** 2026-07-01 (cycle 29) by applicant.
**Description:** Story US-A9 requires the finalise confirmation summary to include total session processing time. The finalise tab currently shows status, notes, and the submission readiness checklist, but not session duration.
**Affected stories:** US-A9
**Fix:** Compute `session_end - session_start` from session metadata and display it in the finalise form as "Session duration: X minutes".

## GAP-294: Keyboard Shortcut for Workflow Re-Run Not Implemented

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02. Added `Ctrl+Shift+R` handler to `_onKeyDown()` in `web/keyboard-shortcuts.js`. Finds the active step pill via DOM (`[id^="step-"].active`), calls `confirmReRunPhase(step)`. Also added to the `?` help panel table and docstring.
**Discovered:** 2026-07-01 (cycle 29) by applicant, power-user.
**Description:** `keyboard-shortcuts.js` implements `Ctrl+Enter` for primary phase-advance action, `A`/`R` for review cards, and `↑`/`↓` for card navigation, but provides no keyboard shortcut for the ↻ re-run action. Re-running a phase requires a mouse click on the step pill re-run button.
**Affected stories:** US-A12, US-W1
**Fix:** Add a keyboard shortcut (e.g., `Ctrl+Shift+R`) for triggering `confirmReRunPhase()` on the current phase.

## GAP-295: Layout-Refine Has No Clarification Loop for Ambiguous Instructions

**Priority:** MEDIUM
**Status:** RESOLVED — 2026-07-02 (cycle 32). The clarification loop was already fully implemented: `apply_layout_instruction()` in `cv_orchestrator.py` returns `{error: 'clarify', clarification_question: "..."}` when `requires_clarification` is true, and `showClarificationDialog()` in `web/layout-instruction.js:1155` renders an inline amber panel with the question and a textarea for the user's clarification. The bug was that the first `/api/cv/layout-refine` error handler at `generation_routes.py:1648` used `result.get("question")` (which is `None` for the `clarify` error), silently returning `question: null` to the frontend. Fixed to `result.get("question") or result.get("clarification_question")`.
**Discovered:** 2026-07-01 (cycle 29) by applicant.
**Description:** When the user submits an ambiguous layout instruction (e.g., "make it look better"), the response flows through the conversation panel as a backend chat reply with no structured clarification prompt or follow-up question. The user must re-read the message and manually rephrase their instruction.
**Affected stories:** US-A5b, US-U9

---

## Open Source Readiness Additions (GAP-296–GAP-297)

*Added 2026-07-02 by the ci-cd-engineer persona, extended ahead of inviting outside users/contributors to the project (`tasks/review-status/ci-cd-engineer.md` §6). See also GAP-01–GAP-295 above, which predate this scope extension.*

## GAP-296: No Contribution Documentation for External Contributors

**Priority:** HIGH
**Status:** RESOLVED — 2026-07-02 (cycle 37). Added `CONTRIBUTING.md` (local setup, test-running, JS build, coding conventions, data-contract rule, commit style, PR workflow); `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1); `.github/pull_request_template.md`; `.github/ISSUE_TEMPLATE/bug_report.md`; `.github/ISSUE_TEMPLATE/feature_request.md`; brief Contributing section added to `README.md` pointing to both docs.
**Discovered:** 2026-07-02 by ci-cd-engineer (scope extension).
**Description:** The repository has no `CONTRIBUTING.md`, no GitHub issue or PR templates, and no `CODE_OF_CONDUCT.md`; `README.md` has zero contributor-facing content (confirmed via grep for "contribut": no matches). Existing developer-facing guidance (`CLAUDE.md`, `.github/copilot-instructions.md`) is written for AI coding agents, not human external contributors, and includes repo-specific rules (e.g. updating `MASTER_CV_DATA_SPECIFICATION.md`/`master_data_validator.py`/the JSON schema together whenever the master-data contract changes) that an outside contributor has no way to discover without reading agent-instruction files not aimed at them. The project's CI fork-PR posture is otherwise sound (uses the safe `pull_request` trigger, not `pull_request_target`; no workflow references `secrets.*`, so nothing can leak to a fork PR's run) — this gap is entirely about missing documentation, not CI security.
**Affected stories:** Technical review follow-up (ci-cd-engineer, marketing US-MK3)
**Fix:** Add `CONTRIBUTING.md` covering local setup, coding conventions, test-running instructions, and the data-contract-maintenance rule; add `.github/pull_request_template.md` and an issue template; add `CODE_OF_CONDUCT.md`; add a short contributor-facing section to `README.md` distinct from the end-user setup path.

## GAP-297: No PR-Time Failure Digest for First-Time Contributors

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 39). Added `pr-summary` job to `.github/workflows/integration-harness.yml`: runs `if: always()` after all checks, writes a pass/fail table to `$GITHUB_STEP_SUMMARY`, and posts a PR comment with links to the Actions log when any check fails. Added `pull-requests: write` permission at the workflow level.
**Discovered:** 2026-07-02 by ci-cd-engineer (scope extension).
**Description:** The PR workflow (`.github/workflows/integration-harness.yml`) runs CodeQL, Python tests, JS tests, and the HTML integration harness, surfacing failures only as raw GitHub Actions log output. A contributor unfamiliar with the codebase has no job-summary or PR-comment digest pointing at what actually failed and why, unlike the richer artifact/coverage reporting already tracked for the full workflow under GAP-70.
**Affected stories:** Technical review follow-up (ci-cd-engineer)
**Fix:** Add a PR-time job summary (`$GITHUB_STEP_SUMMARY`) or failure-digest PR comment summarizing which check failed and pointing at the relevant log section, once external PR volume makes this worth the maintenance cost.

---

## Testing-Doc Follow-Ups (GAP-298–GAP-299)

*Added 2026-07-02 by Claude Code, discovered while reviewing and expanding `.claude/commands/e2e-browser-test.md` (commit `136a046`) from a stale 11-phase test into a 33-phase test with live-interaction persona passes. Both are cross-file consequences of that renumbering, deliberately left unfixed at the time since they require editing files outside that change's scope.*

## GAP-298: e2ePhaseTest.md Stale Against e2e-browser-test.md's New Phase Numbering

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 48). Updated `.github/prompts/e2ePhaseTest.prompt.md` (symlinked as `.claude/commands/e2ePhaseTest.md`): expanded Phase Reference table from 11 rows to 33 rows (phases 0-27 + P1-P5); corrected port 5000 → 5001; updated argument-hint; fixed example prerequisite in instructions.
**Discovered:** 2026-07-02 by Claude Code, during code-review of the e2e-browser-test.md expansion.
**Description:** `.claude/commands/e2ePhaseTest.md` hardcodes its own "Phase Reference" table (0-10, e.g. "5 = Rewrite review", "7 = CV generation") and a "Server assumption" section stating `http://127.0.0.1:5000`. `e2e-browser-test.md` was expanded to 28 phases (0-27, tab-bar order) plus persona passes P1-P5, and its port references were corrected to `127.0.0.1:5001` (matching `config.yaml`'s `web.port`). `e2ePhaseTest.md` was not updated to match either change: its phase table no longer corresponds to the phases described in `e2e-browser-test.md` (e.g. its "Phase 5" is now `e2e-browser-test.md`'s Phase 13, not Phase 5), and its assumed port is wrong.
**Affected stories:** Internal tooling consistency (no end-user-facing story; affects whoever invokes `/e2ePhaseTest <N>` expecting it to match the full test's numbering).
**Fix:** Update `e2ePhaseTest.md`'s Phase Reference table to match `e2e-browser-test.md`'s current 0-27 + P1-P5 phases, and correct its Server assumption to port 5001 (or better, have it read the port from `config.yaml` at invocation time instead of hardcoding either file).

## GAP-299: codex-skills Mirror of e2e-browser-test Is Increasingly Stale

**Priority:** LOW
**Status:** RESOLVED — 2026-07-02 (cycle 48). Replaced stale 11-phase hardcoded list in `codex-skills/cv-e2e-browser-test/SKILL.md` with a pointer approach: always reads `.claude/commands/e2e-browser-test.md` before executing. Eliminates future drift structurally. Port corrected to 5001.
**Discovered:** 2026-07-02 by Claude Code, during the e2e-browser-test.md expansion (flagged but not addressed, per user confirmation to defer).
**Description:** `codex-skills/cv-e2e-browser-test/` mirrors `.claude/commands/e2e-browser-test.md` for the Codex agent tool, with its own header noting "Adapted from `.claude/commands/e2e-browser-test.md`." It still reflects the old 11-phase version (App load through Error handling, no Goals/Tagline/Summary/Publications/ATS Score/Layout Review/Master CV/Cover Letter/Screening/Interview Prep/Thank You/Harvest, and no Part 2 persona passes) and was not updated alongside the Claude version's expansion to 33 phases.
**Affected stories:** Internal tooling consistency (affects whoever runs the Codex-agent variant of this test expecting parity with the Claude Code version).
**Fix:** Either regenerate `codex-skills/cv-e2e-browser-test/` from the current `e2e-browser-test.md` content, or replace it with a thinner pointer/adapter that reads the Claude version directly instead of maintaining a parallel copy (removing the drift risk structurally rather than re-syncing it manually each time).

---

## Cycle 82 Discoveries (2026-07-06)

*Added by Phase 3 assembly agent, Cycle 82. All items source-verified with file:line evidence from persona review files.*

---

## GAP-300: No Anti-Fabrication Instruction in LLM System Prompt

**Priority:** CRITICAL
**Status:** RESOLVED 2026-07-06 (cycle 87) — (a) Anti-fabrication system prompt added in cycle 84. (b) `check_new_numeric_claims(original, proposed)` static method added to `LLMClient` (`scripts/utils/llm_client.py`); called after all other persuasion checks in `conversation_manager.py:1486`. Returns `warn`-severity flag with sample numeric values when the proposed rewrite contains numeric tokens absent in the original.
**Discovered:** 2026-07-06 (cycle 82) by trust-compliance, persuasion-expert, resume-expert.
**Description:** The LLM system prompt (`conversation_manager.py:424–495`) defines recommendation structure and confidence levels but contains no explicit instruction to restrict rewrites to facts present in master data, avoid inventing metrics, or flag hallucinated claims. The persuasion check pipeline (`run_persuasion_checks()`, lines 1349–1428) covers writing style (verb strength, passive voice, word count) only. A rewrite changing "improved efficiency" to "improved efficiency by 40%" passes all checks without a flag — the fabricated metric is never flagged. `apply_rewrite_constraints()` preserves numbers already in the original but does not detect numbers invented in the proposed text. There is no diff-level check comparing quantified claims between `r.original` and `r.proposed`.
**Affected stories:** US-C1, US-C3, US-R3, US-P2
**Fix:** (a) Add an explicit anti-fabrication instruction to the system prompt at `conversation_manager.py:424–495`: "Do not invent metrics, titles, dates, or achievements not present in the master data. If a claim cannot be verified from the provided information, omit it." (b) Add a persuasion check that detects new numeric tokens in `r.proposed` that are absent in `r.original` and surfaces a "New claim — verify accuracy" badge.

---

## GAP-301: ATS HTML Template Missing `lang="en"` on Root `<html>` Element

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 83) — Changed `'<html><head>'` to `'<html lang="en"><head>'` in `scripts/utils/cv_orchestrator.py:1199`.
**Discovered:** 2026-07-06 (cycle 82) by accessibility-specialist.
**Description:** `cv_orchestrator.py:1199` generates the ATS DOCX intermediate HTML as `'<html><head>'` without a `lang` attribute on the root element. Screen readers use the `lang` attribute to determine the correct pronunciation engine. Without it, AT may default to the OS language or produce incorrect pronunciation. The human-facing HTML CV template correctly has `<html lang="en">` (confirmed in generated output), but the ATS-format HTML does not.
**Affected stories:** US-X7 (proposed), US-H1
**Fix:** Change `cv_orchestrator.py:1199` from `'<html><head>'` to `'<html lang="en"><head>'`.

---

## GAP-302: Font Awesome Icons in Generated HTML CV Missing `aria-hidden="true"`

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 83) — Added `aria-hidden="true"` to all 9 Font Awesome `<i>` elements in `templates/cv-template.html`.
**Discovered:** 2026-07-06 (cycle 82) by accessibility-specialist.
**Description:** Section heading icons (`<i class="fas fa-user-circle">`, `<i class="fas fa-trophy">`, etc.) and sidebar contact icons (`<i class="fas fa-envelope">`, `<i class="fab fa-linkedin">`) in generated HTML CV output lack `aria-hidden="true"`. Screen readers will read aloud the Font Awesome Unicode character glyph names or the icon CSS class names depending on the AT and browser, producing noise like "fas fa-envelope" read before the email address. Evidence: `CV_Genentech_SeniorRPackageDevelo_2026-03-26.html:702–714` (contact icons), `:772–847` (section heading icons). The icons are decorative — the text adjacent to them is the meaningful content.
**Affected stories:** US-X6 (proposed)
**Fix:** Add `aria-hidden="true"` to all `<i class="fa*">` elements in the Jinja2/Python templates used to generate the HTML CV in `cv_orchestrator.py`. Search for all `<i class="fa` patterns and add the attribute.

---

## GAP-303: Review Sub-Tab Buttons Missing Tab ARIA Semantics

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 85) — Added `role="tablist"` on container, `role="tab"` + `aria-selected` + `aria-controls` on each `.review-subtab` button, and `role="tabpanel"` on `.review-pane` elements in `switchReviewSubtab()` (`web/review-table-base.js`).
**Discovered:** 2026-07-06 (cycle 82) by accessibility-specialist.
**Description:** The customization stage sub-tabs (Experiences, Skills, Achievements, Summary, Publications, etc.) are `<button>` elements with a `.active` CSS class toggle but no `role="tab"`, `aria-selected`, or `aria-controls` attributes (`review-table-base.js:672–676`). Screen readers cannot determine which sub-tab is selected or navigate using AT tab-list patterns (arrow keys, tab/role semantics). The main workflow tab bar correctly uses `role="tab"` and `aria-selected` (`review-table-base.js:136–148`), but the customization stage sub-tabs within the viewer do not follow the same pattern.
**Affected stories:** US-X4 (proposed), US-X3
**Fix:** Update `review-table-base.js:672–676` to add `role="tab"`, `aria-selected="true/false"`, and `aria-controls="[panel-id]"` to each `.review-subtab` button. Add `role="tablist"` to the container. Add `role="tabpanel"` and `aria-labelledby` to each panel.

---

## GAP-304: Model Catalog Table Rows Not Keyboard-Accessible

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 86) — Added `tabindex="0"` and `role="row"` to each `<tr>` in `_buildModelTable()`. Extracted shared `_activateModelRow()` handler called by both `tbody.onclick` and new `tbody.onkeydown` (Enter/Space) delegation in `web/ui-core.js`.
**Discovered:** 2026-07-06 (cycle 82) by accessibility-specialist.
**Description:** The LLM model selection table in the model wizard (`#model-table`, `ui-core.js:1570–1626`) uses `tbody.onclick` delegation but adds no `tabindex`, `role`, or `keydown` handlers to `<tr>` elements. Keyboard users cannot Tab into rows or use Enter/Space to select a model from the full catalog table. The quick-model button list in Step 1 is keyboard-accessible but the full catalog table in Step 3 is mouse-only.
**Affected stories:** US-X5 (proposed), US-X3
**Fix:** Add `tabindex="0"` and `role="row"` to each `<tr>` in the model table, and add a `keydown` handler for Enter/Space that fires the same selection logic as the `onclick` delegation. Or expose all models in the keyboard-accessible quick-model button list as an alternative.

---

## GAP-305: Alert Modal Uses Separate Focus Stack From Other Modals

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 85) — Replaced `_alertPreviousFocus` variable with `pushFocusStack()`/`restoreFocus()` in `showAlertModal()`/`closeAlertModal()` in `web/ui-helpers.js`.
**Discovered:** 2026-07-06 (cycle 82) by accessibility-specialist.
**Description:** `showAlertModal()` in `ui-helpers.js:34–49` calls `trapFocus()` and `setInitialFocus()` but does not push to `_focusStack` (unlike `openSettingsModal()` which calls `_focusStack.push(document.activeElement)` before opening). `closeAlertModal()` uses its own `_alertPreviousFocus` variable rather than `restoreFocus()`. This means if an alert opens while another modal is already focus-trapped, the `_focusTrapStack` and `_focusStack` can diverge: the trap listener from the underlying modal may be consumed incorrectly by the alert's close path. In practice, closing the alert may fail to restore focus to the intended element inside the underlying modal.
**Affected stories:** US-X8 (proposed), US-X2
**Fix:** Refactor `showAlertModal()`/`closeAlertModal()` in `ui-helpers.js` to use the same `_focusStack.push()` / `restoreFocus()` coordination pattern used by `openSettingsModal()` and `openModal()` in `ui-core.js`, rather than the separate `_alertPreviousFocus` variable.

---

## GAP-306: `--cv-card-bg` CSS Variable Undefined — Position-Style Picker Transparent

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 83) — Added `--cv-card-bg: #fff;` to `:root` block in `web/styles.css` (after `--cv-white`).
**Discovered:** 2026-07-06 (cycle 82) by graphical-designer.
**Description:** `var(--cv-card-bg)` is used at `styles.css:1600` in the `.position-style-option` selector but is not defined anywhere in `:root`. CSS variable resolution silently falls back to `transparent`, causing the position-style picker buttons to render with invisible background. The `:root` block defines 95 CSS custom properties (`styles.css:18–126`) but `--cv-card-bg` is absent. This is a design system integrity issue and a rendering defect.
**Affected stories:** US-G1.4, US-G2.3
**Fix:** Add `--cv-card-bg: var(--cv-bg-light);` (or `--cv-card-bg: var(--cv-white);`) to the `:root` block in `styles.css`. Value should be consistent with the intended card surface color used elsewhere.

---

## GAP-307: `check_has_result_clause()` Severity `'info'` Prevents Amber Badge

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 83) — Changed `'severity': 'info'` to `'severity': 'warn'` in `check_has_result_clause()` at `scripts/utils/llm_client.py:~1260`.
**Discovered:** 2026-07-06 (cycle 82) by persuasion-expert.
**Description:** `check_has_result_clause()` at `llm_client.py:1259` fires with `severity: 'info'` when a bullet lacks any metric or outcome word. The rewrite review panel only surfaces amber persuasion badges for checks with `severity: 'warn'` or higher. Because `'info'` is below the badge threshold, result-clause findings are never visually surfaced to users reviewing rewrite cards — the advisory is silently produced but invisible. US-P4 acceptance criterion "Missing result clause flagged" is nominally met at the code level but fails in the UI because of the severity mismatch.
**Affected stories:** US-P4, US-C1
**Fix:** Change `severity` from `'info'` to `'warn'` in `check_has_result_clause()` at `llm_client.py:1259` so that result-clause findings surface as amber badges in the rewrite review panel.

---

## GAP-308: Six Structural ATS Validation Checks Are Non-Blocking, Contradicting Story Spec

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 86) — Implemented option (b): advisory-only failed checks now render amber (⚠ Advisory badge) instead of red (❌) in the ATS report table. Summary line shows separate "advisory" and "fail" counts. "Fix required" banner only fires for blocking failures; advisory-only failures get a distinct amber advisory notice. Changes in `web/download-tab.js:_renderValidationSummary()`.
**Discovered:** 2026-07-06 (cycle 82) by hr-ats.
**Description:** `download-tab.js:151–161` defines `_NON_BLOCKING_CHECKS` which exempts the following checks from blocking file downloads even on `fail` status: `docx_zero_shapes`, `docx_standard_headings`, `docx_heading1_present`, `docx_date_format_consistent`, `html_jsonld_valid_person`, `html_jsonld_knows_about`. US-H6 acceptance criterion states "Any fail blocks download with a clear explanation." The current implementation allows downloads when structural failures occur — a hiring manager or ATS system receiving a non-conformant DOCX with creative heading names or invalid JSON-LD will get a degraded document without warning at download time.
**Affected stories:** US-H6
**Fix:** Either (a) tighten the blocking logic so at minimum structural failures (`docx_heading1_present`, `docx_standard_headings`, `html_jsonld_valid_person`) block download, or (b) update the US-H6 acceptance criterion to explicitly enumerate which checks are advisory-only vs. blocking, and surface advisory-only failures with a distinct visual treatment in the validation table.

---

## GAP-309: Duplicate `id` Attributes on Publication Modal Heading — aria-labelledby Broken

**Priority:** HIGH (Bug)
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 82) by master-cv-curator.
**Description:** `master-cv.js:316` sets two `id` attributes on the same `<h2>` element: `id="master-pub-modal-title-heading" id="pub-modal-title-heading"`. HTML parsers retain only the first `id` (`master-pub-modal-title-heading`). JavaScript at `master-cv.js:1497` and `1526` references `pub-modal-title-heading` (the second id) to update the title between "Add Publication" and "Edit Publication" — these calls silently fail (`getElementById()` returns `null`) in conformant parsers. Additionally, the modal's `aria-labelledby="master-pub-modal-title"` points to a non-existent id (neither of the two ids on the heading), so screen readers cannot announce the modal title programmatically.
**Affected stories:** US-M4, US-X2
**Fix:** (1) Remove the duplicate `id` and choose a single canonical id (e.g., `pub-modal-title-heading`). (2) Update `aria-labelledby` on the modal overlay to point to that canonical id. (3) Update the JS references at `master-cv.js:1497` and `1526` to use the same id.

---

## GAP-310: Experience Bullets Not Editable in Master CV Tab

**Priority:** MEDIUM
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 82) by master-cv-curator.
**Description:** The Work Experience section in the Master CV tab (`master-cv.js:904`) shows a "Bullets" count column displaying `exp.achievements.length`, but provides no interface to view, add, edit, or reorder the individual achievement bullet entries. Users who need to durably edit experience bullets outside the session-specific Harvest flow must edit `Master_CV_Data.json` directly. This creates an asymmetry: all other master data sections (skills, education, publications, certifications) have CRUD interfaces in the tab.
**Affected stories:** US-M5 (proposed), US-A10
**Fix:** Add an expandable bullet management panel per experience row in the Master CV tab that allows viewing, adding, editing, and deleting achievement bullets. This mirrors the existing modal pattern used for skills and publications in the same tab.

---

## GAP-311: Backup Restore Requires Manual Tab Reload — No Auto-Refresh

**Priority:** MEDIUM
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 82) by master-cv-curator.
**Description:** After a backup restore succeeds, `master-cv.js:2529` displays "Reload the tab to see the updated data" rather than automatically calling `populateMasterTab()` (or equivalent). The user must manually navigate away from the tab and back, or reload the page, to see the restored data. During this window the user sees stale data that no longer reflects the restored state, creating a risk of editing over the restored content.
**Affected stories:** US-M6 (proposed)
**Fix:** After a successful backup restore, call `populateMasterTab()` automatically from the success handler in `master-cv.js` instead of instructing the user to reload manually. Replace the instruction text with a success message.

---

## GAP-312: Phase Lock Banner Exposes Internal Enum Value "refinement"

**Priority:** LOW
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 82) by master-cv-curator.
**Description:** The phase-lock banner in the Master CV tab (`master-cv.js:88`) renders "The current stage is **refinement**". "refinement" is the internal `Phase` enum value (`conversation_manager.py:48`). Users who see this message during an active application workflow do not understand what "refinement" means. `SESSION_PHASE_LABELS_SHORT` in `utils.js` already maps `refinement` → "Finalise" (confirmed in GAP-112 resolution). The same map should be used in the lock banner.
**Affected stories:** US-M8 (proposed)
**Fix:** Import or inline the `SESSION_PHASE_LABELS_SHORT` map in `master-cv.js` and use it when building the phase-lock banner text: "The current stage is **Finalise**" (or similar human label) instead of the raw enum value.

---

## GAP-313: Generated Files Tab Shows No File Timestamps

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 85) — Added generation timestamp next to the "Generated Files" heading in `populateFinalGenerateTab()` (`web/final-generate.js`) using `stateManager.getGenerationState().finalGeneratedAt`.
**Discovered:** 2026-07-06 (cycle 82) by returning-user.
**Description:** `populateFinalGenerateTab()` (`final-generate.js:107–200`) renders each downloadable file as an icon + label + description + Download button. No generation timestamp is shown alongside the file. The `finalGeneratedAt` field is stored in `generationState` (`state-manager.js:333`) and restored from the backend on session load (`session-manager.js:686`), but is not injected into the tab render. A returning user who made content changes in a prior session sees download links that look identical regardless of whether the files pre-date or post-date their most recent edits. The position-bar freshness chip covers the boolean "outdated vs current" case but does not appear within the Generated Files tab itself.
**Affected stories:** US-S5 (proposed), US-S3
**Fix:** In `populateFinalGenerateTab()` (`final-generate.js:107–200`), inject a "Generated: [date/time]" label beneath each file entry using `generationState.finalGeneratedAt` (already available in state). Format as a human-readable relative or absolute timestamp consistent with other time displays in the application.

---

## GAP-314: Welcome Modal Fires for Active-Session Returning Users

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 84) — Added active-session check to `maybeShowWelcomeModal()` in `session-manager.js`: fetches `/api/status` and skips the modal when `phase !== 'init'`.
**Discovered:** 2026-07-06 (cycle 82) by returning-user.
**Description:** `maybeShowWelcomeModal()` (`session-manager.js:175–201`) checks only `localStorage.getItem('cv-builder-welcome-dismissed')`. If the user has never checked the "Don't show automatically on startup" checkbox (`index.html:391–393`), the welcome modal fires on every `init()` call (`app.js:57`) — including when a live session with work in progress is being restored. The modal body is oriented at new users (3-phase workflow overview, prerequisites) and provides no value to a returning user mid-application. The "Don't show automatically" checkbox is easy to miss because it sits left-aligned in the modal footer while the primary CTA ("Get Started") is right-aligned.
**Affected stories:** US-S7 (proposed), US-F1, US-S1
**Fix:** Add an active-session check to `maybeShowWelcomeModal()`: if `restoreSession()` has already loaded a session with `serverHasData === true`, skip showing the modal regardless of the `localStorage` flag. Alternatively, suppress the modal if the current phase is beyond `PHASES.INIT`.

---

## GAP-315: Cover Letter Tone Defaults to `startup/tech` Regardless of Job Domain

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 85) — Added domain-to-tone auto-select in `_restoreCoverLetterFormState()` (`web/cover-letter.js`): pharma/biotech, academia, financial, and leadership domains pre-select the matching tone when no user preference is saved.
**Discovered:** 2026-07-06 (cycle 82) by hiring-manager.
**Description:** The cover letter tone dropdown defaults to `startup/tech` via `cover-letter.js:246`: `|| 'startup/tech'`. The 5-tone guidance dict exists (`master_data_routes.py:97–103`) and the job analysis already extracts `domain` and `culture_indicators` (`master_data_routes.py:1604`). A user generating a cover letter for a pharma/biotech role will receive `startup/tech` tone framing unless they manually change the dropdown. No auto-suggestion or pre-selection based on job analysis domain is implemented.
**Affected stories:** US-M6, US-A7
**Fix:** After job analysis completes, map `analysis.domain` or `analysis.culture_indicators` to a recommended tone value and pre-select the dropdown (or display a hint "Based on job analysis, we suggest Pharma/Biotech tone"). A simple domain-to-tone map (e.g., `pharma` → `pharma/biotech`, `academic` → `academia`, `finance` → `financial_services`) would cover most cases.

---

## GAP-316: Cover Letter Word Count Target Mismatch — Backend 250–300w vs Story 300–400w

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 84) — Aligned backend (`scripts/routes/master_data_routes.py:122`) to 300–400w (standard) / 350–450w (exec) / 400–500w (academic). Frontend (`web/cover-letter.js:614-616`) updated to matching ranges.
**Discovered:** 2026-07-06 (cycle 82) by hiring-manager, persuasion-expert.
**Description:** `_cover_letter_word_count_instruction()` in `master_data_routes.py:118–122` returns "250–300 words" for standard roles. The client-side `_validateCoverLetter()` in `cover-letter.js:607–631` uses a green-zone target of ≤300w for standard roles. The user story specifies 300–400 words as the standard range. Letters generated to the backend's 250–300w target will consistently fall below what hiring managers expect for substantive roles. Confirmed independently by two personas (hiring-manager and persuasion-expert).
**Affected stories:** US-M6, US-P5
**Fix:** Align both backend prompt instruction (`master_data_routes.py:118–122`) and client validation (`cover-letter.js:607–631`) to the story spec: 300–400 words for standard roles. Review exec and academic role ranges for consistency.

---

## GAP-317: Zero-Bullet Job Entries Not Guarded — Renders Bare Job Title

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 84) — Added `bullet_count == 0` case with `severity: 'warn'` in `cv_orchestrator.py:4470`. Changed existing `bullet_count == 1` branch to `elif`.
**Discovered:** 2026-07-06 (cycle 82) by hiring-manager.
**Description:** `cv_orchestrator.py:4465–4483` fires an advisory when `bullet_count == 1` ("Only 1 bullet remaining — consider adding more"). However, when a user excludes all bullets for a job entry (`bullet_count == 0`), no advisory fires and the job entry renders as a bare title + company + dates with no content — a credibility failure on the generated CV. The condition `if bullet_count == 1` at line 4470 does not handle the `0` case.
**Affected stories:** US-M2
**Fix:** Add a `bullet_count == 0` guard in `cv_orchestrator.py` at line 4465: fire a hard advisory (or gate the customization confirmation) when all bullets for a job entry are excluded. Consider blocking generation when any included job entry has zero bullets, or at minimum surfacing a distinct error-level advisory distinguishable from the 1-bullet warning.

---

## GAP-318: First-Author Status Contributes 0 Points to Publication Scoring

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 84) — Added `+10` first-author bonus in `_select_publications()` scoring loop in `cv_orchestrator.py:3801` (after domain-specific bonus).
**Discovered:** 2026-07-06 (cycle 82) by resume-expert.
**Description:** `is_first_author` is detected (`cv_orchestrator.py:892–895`) and displayed in the publications review table as a ★ star indicator (`publications-review.js:148`), and the US-R2 acceptance criterion explicitly lists "first-author status" as a scoring factor. However, `_select_publications()` at `cv_orchestrator.py:3764–3806` does not include first-author status in its scoring function — the field is detected but contributes 0 points. Publications by first authors are not ranked higher than those by middle authors with equivalent recency/keyword match.
**Affected stories:** US-R2
**Fix:** Add a first-author bonus (e.g., +10 points, normalized relative to the recency/keyword score range) to `_select_publications()` at `cv_orchestrator.py:3764–3806` when `pub.get('is_first_author') is True`.

---

## GAP-319: Ranked Publication Shortlist Not Presented Proactively

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 86) — `_generate_recommendations()` in `scripts/utils/conversation_manager.py` now calls `self.orchestrator._select_publications()` after generating recommendations and appends a "Top recommended publications for this role" list (up to 5, with relevance score and rationale) to the confirmation message. Only fires when the user has publications and has opted to include them.
**Discovered:** 2026-07-06 (cycle 82) by resume-expert.
**Description:** The publications review tab exposes `relevance_score` and `rationale` per publication (`publications-review.js:149–153`), and the scoring algorithm ranks publications by recency, entry type, keyword-title match, and domain bonus. However, the ranked shortlist is not presented to the user before they navigate to the Publications sub-tab. There is no proactive assistant message after customization recommendations saying "Your top recommended publications for this role are: X, Y, Z." The US-R2 acceptance criterion states the ranked shortlist should be "presented" (not merely available). This mirrors the pattern used for experiences and skills which are summarized in the assistant recommendation message.
**Affected stories:** US-R2, US-R-NEW-5
**Fix:** After customization recommendations are generated, include a publications summary in the assistant message listing the top N recommended publications (with relevance scores) in descending order. This mirrors how experience and skill recommendations are surfaced.

---

## GAP-320: Summary Line-Count Not Validated — Dense Paragraphs Pass

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 84) — Added Check 3 to `_validate_summary()` in `cv_orchestrator.py`: warns when summary >80 words has no line breaks and >5 sentences.
**Discovered:** 2026-07-06 (cycle 82) by resume-expert.
**Description:** `_validate_summary()` in `cv_orchestrator.py:3606–3646` validates word count (40–250 words) but not line count. The US-R4 acceptance criterion requires 4–6 lines for the professional summary. A 250-word single dense paragraph block passes the word-count gate but violates the line-count criterion — hiring managers expect a scannable summary, not a prose block.
**Affected stories:** US-R4
**Fix:** Add a line/sentence count check in `_validate_summary()`: split the summary on `.` or `\n` and count clauses/sentences; warn if > 7 (too blocky) or < 3 (too terse for senior candidates). Consider a separate newline-count check (warn if no line breaks in summaries > 80 words).

---

## GAP-321: `ai_attribution` Resets Per Session — Not Persisted to config.yaml

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 86) — Added `ai_attribution_default` property to `Config` (`scripts/utils/config.py`). When user sets `ai_attribution` via `/api/generation-settings`, it is now also persisted to `config.yaml` under `generation.ai_attribution_default`. New sessions seed from `get_config().ai_attribution_default` instead of hardcoded `False` (`scripts/routes/status_routes.py`).
**Discovered:** 2026-07-06 (cycle 82) by trust-compliance.
**Description:** The AI-assistance disclosure checkbox (`index.html:647–649`) seeds from `generation.ai_attribution` in per-session status (`ui-core.js:188`). `ui-core.js:211–213` reads `ai_attribution` from per-session state, not from `config.yaml`. Enabling the disclosure in session A does not carry it over to session B. Users who need to routinely disclose AI assistance (e.g., for legal or ethical contexts) must re-enable the setting on every new session — a compliance friction point.
**Affected stories:** US-C5 (proposed), US-C3
**Fix:** Persist `ai_attribution` as a global default in `config.yaml` (e.g., under `generation.ai_attribution_default`). Seed new sessions from this global default. Allow per-session override but ensure the global preference is respected across sessions without manual re-enabling.

---

## GAP-322: "Candidate to Confirm" (Rewrites Tab) vs "Weak Evidence" (Skills Tab) — Inconsistent Labels

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 83) — Changed label in `web/rewrite-review.js:398` from `"⚠ Candidate to confirm"` to `"⚠ Weak evidence"` and added tooltip matching the Skills tab pattern.
**Discovered:** 2026-07-06 (cycle 82) by trust-compliance, applicant.
**Description:** The same concept (a skill addition backed by weak or unverified evidence) is labeled differently in two tabs: "⚠ Candidate to confirm" in the Rewrites tab (`rewrite-review.js:397–398`) and "⚠ Weak evidence" / "⚠ Verify evidence" in the Skills tab (`skills-review.js:730–731`). "Candidate to confirm" is ambiguous (reads as "the job applicant is a candidate") and lacks a tooltip. "Weak evidence" is clearer and already has an evidence tooltip. The inconsistency was flagged independently by trust-compliance and applicant personas.
**Affected stories:** US-C9 (proposed), US-C1, US-A4
**Fix:** Standardize the label to "⚠ Weak evidence" (or "⚠ Verify before including") in the Rewrites tab to match the Skills tab. Add a tooltip to the Rewrites tab badge showing the evidence basis (matching the tooltip pattern in `skills-review.js:731`).

---

## GAP-323: Single Active Session Requires Full Modal to Resume at Root URL

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 86) — `ensureSessionContext()` in `web/session-manager.js` now fetches `/api/sessions/active` first; if exactly one active session exists, auto-loads it via `loadSessionFile()` without showing the modal. Falls through to existing modal flow on error or when ≥2 active sessions exist.
**Discovered:** 2026-07-06 (cycle 82) by returning-user.
**Description:** When a returning user navigates to the root URL without a `?session=` parameter, `ensureSessionContext()` (`session-manager.js:457–467`) calls `openSessionsModal({ required: true })` and blocks on session selection. There is no "resume most recent session" shortcut. The recents strip in the sessions modal (`session-switcher-ui.js:442–480`) exists but does not auto-navigate. Users with a single active session must open the full 980px modal, find their session, and click Load before any context appears.
**Affected stories:** US-S4 (proposed), US-S1
**Fix:** In `ensureSessionContext()`, if there is exactly one session in "active" (in-memory) state, auto-load it directly without requiring the sessions modal. If there are 2+ active sessions, show the modal as today. A "Resume most recent session" shortcut button in the modal would also reduce friction for users with multiple sessions.

---

## GAP-324: Keyboard Card Navigation Absent for Experiences/Skills/Achievements DataTable Tabs

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 87) — Extended `_getCards()` in `web/keyboard-shortcuts.js` to return DataTable rows (`tr[data-exp-id]`, `tr[data-skill]`, `tr[data-ach-id]`) for the active review sub-tab when main tab is `customizations`. Extended `_acceptFocusedCard()` (A = include) and `_rejectFocusedCard()` (R = exclude) to call `handleActionClick()` for experience/skill rows and click the action button for achievement rows.
**Discovered:** 2026-07-06 (cycle 82) by power-user, accessibility-specialist.
**Description:** `_getCards()` in `keyboard-shortcuts.js:65–69` returns review cards only when `tab === 'rewrite'` or `tab === 'spell'`. On Experiences, Skills, and Achievements review tabs, `_getCards()` returns an empty array and the ↑/↓/A/R keyboard shortcuts are silently non-functional. These tabs use DataTable rows (`<tr>` elements), not `.rewrite-card`/`.spell-card` DOM elements. Power users reviewing 30+ experience entries must use the mouse for each row — the keyboard review efficiency that makes the Rewrites tab fast is unavailable on the largest review surfaces.
**Affected stories:** US-W4 (proposed), US-W1, US-X3
**Fix:** Extend `_getCards()` to detect the active review tab and return the appropriate DataTable rows (`.dt-tr` or `tr[data-exp-id]`, `tr[data-skill-name]`, etc.) on Experiences, Skills, and Achievements tabs. Wire `A`/`R` shortcut handlers to the relevant include/exclude toggle actions for DataTable rows. This likely requires updating `keyboard-shortcuts.js` and adding coordinating event-target resolution in `experience-review.js`, `skills-review.js`, and `achievements-review.js`.

---

## GAP-325: Finalise Tab Hidden — Only Reachable Via Mislabeled "Package Application Files" Button

**Priority:** MEDIUM
**Status:** PARTIAL 2026-07-06 (cycle 86) — Relabeled the action button to "📦 Archive Application" with a clarifying `title` tooltip at startup via `web/app.js:setupEventListeners()` (index.html is off-limits until GAP-01 lands). The Finalise tab nav visibility deferral remains; that requires index.html changes blocked by GAP-01.
**Discovered:** 2026-07-06 (cycle 82) by recruiter-ops.
**Description:** The Finalise tab (`index.html:227`) has `style="display:none"` and is absent from `STAGE_TABS` (`ui-core.js:353–366`). The archive flow is reachable only via the `finalise-action-btn` labeled "📦 Package Application Files" (`index.html:198`) — a label that sounds like a file-zipping operation, not an archival checkpoint. Recruiters and applicants reviewing the workflow nav see no "Finalise" or "Archive" step pill; the action button alone signals that archiving is available, and only after the user has visited the File Review tab. The readiness checklist (`finalise.js:163–214`) and the archive confirmation are fully implemented but inaccessible without knowing to click this button.
**Affected stories:** US-O4 (proposed), US-O1, US-A9
**Fix:** Either (a) expose the Finalise tab as a visible step in `STAGE_TABS` (making it part of the workflow nav), or (b) rename the action button to "Archive Application" / "Finalise & Archive" to accurately signal the step's purpose. Additionally, surface a compact readiness badge (e.g., "3/3 required files ready ✅") in the position bar or File Review tab so users know their package status before reaching the hidden finalise step.

---

## GAP-326: ATS DOCX Includes `candidate_to_confirm` (Weak-Evidence) Skills

**Priority:** HIGH (Bug — data integrity)
**Status:** RESOLVED 2026-07-06 (cycle 88) — Added `ats_skills = [s for s in content['skills'] if not s.get('candidate_to_confirm')]` filter before `_optimize_skills_for_ats()` call in `cv_orchestrator.py:3918`. Both the skill name list and the skill_map now exclude weak-evidence additions.
**Discovered:** 2026-07-06 (cycle 88) by resume-expert.
**Description:** `_generate_ats_docx()` at `cv_orchestrator.py:3918` called `_optimize_skills_for_ats(content['skills'], ...)` without pre-filtering. The HTML/PDF template correctly guards with `{% if not skill.candidate_to_confirm %}` but the ATS DOCX path bypassed this, allowing unverified skill additions to appear in the recruiter-facing ATS document.
**Affected stories:** US-R5, US-H2, US-C9
**Fix:** Pre-filter `content['skills']` to exclude `candidate_to_confirm: True` entries before passing to `_optimize_skills_for_ats()` in `_generate_ats_docx()`.

---

## GAP-327: `aria-hidden` Not Toggled on Primary Modals Opened Outside `openModal()`

**Priority:** HIGH (Accessibility)
**Status:** RESOLVED 2026-07-06 (cycle 89) — Added `setAttribute('aria-hidden', 'false'/'true')` on open/close in: `openSettingsModal`/`closeSettingsModal` (ui-core.js), `confirmDialog` finish callback (ui-core.js), `openModelModal`/`closeModelModal` (ui-core.js), `openAtsReportModal`/`closeAtsReportModal` (ats-modals.js), `openJobAnalysisModal`/`closeJobAnalysisModal` (ats-modals.js), `openSessionsModal`/`closeSessionsModal` (session-switcher-ui.js), `showOwnershipConflictDialog`/cleanup (session-switcher-ui.js). Modals in master-cv.js remain deferred pending GAP-01.
**Discovered:** 2026-07-06 (cycle 88) by accessibility-specialist.
**Description:** The `openModal()` helper in `ui-core.js` sets `aria-hidden="true"` on the main content when a modal is shown. However, many modal open paths use `overlay.style.display = 'flex'` directly (e.g., settings modal, sessions modal, publication modal in master-cv.js) rather than calling `openModal()`. Background landmark content remains visible to screen readers while a dialog is active, causing virtual cursor confusion for screen reader users.
**Affected stories:** US-X2, US-X3

---

## GAP-328: `window.confirm()` at Critical Rewrite Gate Is Suppressible by Browsers

**Priority:** MEDIUM (Accessibility / correctness)
**Status:** RESOLVED 2026-07-06 (cycle 88) — Replaced `window.confirm()` at `web/app.js:138` with `await confirmDialog(...)` using `{ confirmLabel: 'Proceed', cancelLabel: 'Go back and review' }`. The custom dialog is keyboard-accessible and cannot be suppressed by browsers.
**Discovered:** 2026-07-06 (cycle 88) by accessibility-specialist, trust-compliance, heuristic.
**Description:** The "unreviewed items" gate before Rewrite Review (`app.js:138`) used the native `window.confirm()` dialog. Browsers can silently suppress native dialogs after the user clicks "Don't allow more dialogs," causing the gate to pass `true` without user awareness — at exactly the point where AI decisions most affect CV quality.
**Affected stories:** US-X2, US-C1, US-A4

---

## GAP-329: Finalise Tab ATS Readiness Always Shows "Not Yet Run"

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 89) — Added `ats_checks: Optional[List[Any]] = None` to `StatusResponse` dataclass (web_app.py). Status route (status_routes.py) now populates it from `generated_files['metadata']['ats_validation']['checks']`. The Finalise readiness checklist at `finalise.js:174` now reads a non-empty list and shows real pass/fail state when ATS validation ran as part of CV generation.
**Discovered:** 2026-07-06 (cycle 88) by hr-ats.
**Description:** The Finalise readiness checklist (`finalise.js:174`) reads `statusData?.ats_checks` from `/api/status`. However, `StatusResponse` in `web_app.py:164` had no `ats_checks` field. ATS validation results are stored in `generated_files.metadata.ats_validation.checks` (written by `cv_orchestrator.generate_cv()`) but were never forwarded to `/api/status`. Users who correctly ran a full generation saw "not yet run" in the Finalise checklist regardless.
**Affected stories:** US-H6, US-O4

---

## GAP-330: No Extracted-Field Confirmation Before Job Analysis

**Priority:** HIGH (UX — Fail)
**Status:** RESOLVED 2026-07-06 (cycle 90) — Removed the auto-call to `analyzeJob()` from both `uploadJobFile()` and `submitJobText()` in `web/job-input.js`. Both paths now call `populateJobTab()` (matching the URL fetch path), which shows the job description and extracted position name with a "🔍 Analyse Job" button. Users can review the extracted position name before triggering the expensive LLM analysis step.
**Discovered:** 2026-07-06 (cycle 88) by ux-expert.
**Description:** All three input paths (paste at `job-input.js:307`, URL at `job-input.js:385`, file upload at `job-input.js:495`) call `analyzeJob()` directly without a confirmation or editing step. If the LLM misparses company name, role title, or domain, the user has no way to correct it without restarting the entire job analysis step. The story requires an extracted-field preview with inline correction before analysis proceeds.
**Affected stories:** US-U2.4, US-A1

---

## GAP-331: Sessions Modal Focus-Restore Stack Mismatch

**Priority:** MEDIUM (Accessibility)
**Status:** RESOLVED 2026-07-06 (cycle 89) — Changed `openSessionsModal()` and `showOwnershipConflictDialog()` in `session-switcher-ui.js` to call `pushFocusStack(document.activeElement)` instead of setting `window._focusedElementBeforeModal`. Both modals now use the shared `_focusStack` that `restoreFocus()` pops, so focus correctly returns to the triggering element on close (WCAG 2.1 AA).
**Discovered:** 2026-07-06 (cycle 88) by accessibility-specialist.
**Description:** `openSessionsModal()` in `session-switcher-ui.js` saved the triggering element to `window._focusedElementBeforeModal`, but `closeSessionsModal` called `restoreFocus()` which pops from `_focusStack`. These are disconnected stacks — focus was never returned to the element that opened the sessions modal, violating WCAG 2.1 AA focus management requirements.
**Affected stories:** US-X2, US-S1

---

## GAP-332: Publications Tab A/R Keyboard Navigation Absent

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 88) — Extended `_getCards()` in `web/keyboard-shortcuts.js` to return `tr[data-cite-key]:not(.pub-divider-row)` rows when `window._activeReviewPane === 'publications'`. Extended `_acceptFocusedCard()` (A = `handlePubAction(citeKey, true)`) and `_rejectFocusedCard()` (R = `handlePubAction(citeKey, false)`) for the publications pane.
**Discovered:** 2026-07-06 (cycle 88) by power-user.
**Description:** `_getCards()` had branches for `experience`, `skills`, and `achievements` but no branch for `publications`. The A/R keyboard shortcuts were silently non-functional on the Publications sub-tab.
**Affected stories:** US-W4, US-W1

---

## GAP-333: Session Notes Field Not Displayed in Sessions Modal

**Priority:** LOW
**Status:** FALSE POSITIVE 2026-07-06 (cycle 90) — Source-verified: notes ARE rendered in the sessions modal. `session-switcher-ui.js:404–406` renders `notesPreview` (truncated single-line with tooltip for non-empty notes). `session-switcher-ui.js:407–414` renders `notesEditWidget` (editable textarea for saved sessions). The `/api/sessions` endpoint returns the `notes` field at `session_routes.py:189`. No fix needed.
**Discovered:** 2026-07-06 (cycle 88) by recruiter-ops.
**Description:** The sessions archive stores up to 2000 characters of `notes` per session. However, source verification confirmed notes are rendered — the gap description was incorrect.
**Affected stories:** US-O2, US-S3

---

## GAP-334: No Pre-Archive Readiness Signal Outside the Finalise Tab

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 92) — Added a compact readiness chip to the "⬇️ File Review" h1 heading in `web/download-tab.js:populateDownloadTab()`. The chip shows "Required files: N/3 ✅/⚠ · ATS ✅/⚠ N issues" computed from the file list and ATS checks already fetched. Color-coded green/amber/red based on readiness. No new API calls needed — data already available in the function.
**Discovered:** 2026-07-06 (cycle 88) by recruiter-ops.
**Description:** The 7-item readiness checklist (`finalise.js:163–214`) was rendered only inside the hidden Finalise tab. There was no compact signal in the File Review tab showing required file readiness before the user navigates to the Finalise step.
**Affected stories:** US-O4, US-O1

---

## GAP-335: LLM Disclosure Flag Never Resets on Provider Switch

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 90) — Added `disclosureKey(provider)` helper to `web/api-client.js` that returns `cv-builder-llm-disclosure-shown-${provider}` (falling back to `unknown`). `analyzeJob()` in `web/job-analysis.js` now reads `currentModelProvider` from `StorageKeys.TAB_DATA` in localStorage and checks/sets the provider-scoped key. Each provider gets its own disclosure flag — switching providers causes the disclosure to fire again on first use of the new provider.
**Discovered:** 2026-07-06 (cycle 88) by trust-compliance.
**Description:** The one-time `LLM_DISCLOSURE_SHOWN` flag (stored in `localStorage`) was never cleared when the user switches LLM providers. If a user initially accepted a disclosure for a confidential provider (e.g., GitHub Copilot) and later switched to a non-confidential provider (e.g., Gemini free tier), the disclosure for the new provider never fired. The semantics of "data may be used for training" differ significantly between providers.
**Affected stories:** US-C3, US-C5

---

## GAP-336: Harvest Bullet Provenance (AI-Accepted vs. User-Edited) Not Shown on Harvest Cards

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 92) — `_compile_harvest_candidates()` in `scripts/routes/generation_routes.py` now builds a `audit_outcome` dict from `rewrite_audit` (keyed by rewrite id) and adds `outcome: 'accept'|'edit'` to each `improved_bullet` and `summary_variant` candidate. `renderCandidateRow()` in `web/harvest.js` now calls `renderProvenanceBadge(c)` which shows "✏️ User-edited" (amber) or "🤖 AI accepted" (violet) next to the type label for these candidate types.
**Discovered:** 2026-07-06 (cycle 88) by trust-compliance.
**Description:** The rewrite audit records `outcome: 'accept' | 'edit'` in `conversation_manager.py:1290–1294`, distinguishing AI-accepted rewrites from user-edited ones. Harvest cards did not surface this distinction.
**Affected stories:** US-C9, US-C1

---

## GAP-337: Publications CRUD and Batch Import Routes Lack Pre-Write Backup

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 89) — Added timestamped `publications.bib` backup (to `backups/` subdirectory) in `master_data_update_publication()` (before delete, and before add/update write) and in `master_data_import_publications()` (before the merged write). Pattern matches the existing backup in `master_data_save_raw_publications()`.
**Discovered:** 2026-07-06 (cycle 88) by master-cv-curator.
**Description:** The raw `PUT` endpoint for master data (`master_data_routes.py:1273–1283`) creates a timestamped backup before writing. However, the single-entry CRUD route (`1327–1387`) and the BibTeX batch import route (`1457–1465`) did not create backups. A corrupt write via CRUD or import was unrecoverable from the Backup History modal.
**Affected stories:** US-M6, US-M9

---

## GAP-338: Cover Letter Exec and Academic Word Count Ranges Diverge from Story Spec

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 88) — Backend `_cover_letter_word_count_instruction()` in `master_data_routes.py:118–122` updated: exec `350–450` → `400–500 words`; academic `400–500` → `500–600 words`. Frontend `_validateCoverLetter()` in `cover-letter.js:623–625` updated to matching ranges.
**Discovered:** 2026-07-06 (cycle 88) by hiring-manager.
**Description:** Standard cover letter range already matched story spec (300–400w). Executive range was `350–450w` (story spec: `400–500w`); academic range was `400–500w` (story spec: `500–600w`).
**Affected stories:** US-M6, US-P5

---

## GAP-339: Persuasion Checks Not Run on Generated Professional Summary or Cover Letter

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 91) — Cover letter generation in `scripts/routes/master_data_routes.py:cover_letter_generate()` now runs `check_passive_voice`, `check_hedging_language`, and `check_summary_generic_phrases` on the generated body text after LLM response. Results are stored in `conversation.state['cover_letter_persuasion_warnings']` and returned as `persuasion_warnings` in the API response. `web/cover-letter.js` stores them in `_coverLetterFormState.persuasionWarnings` and `_validateCoverLetter()` appends them to the existing checks panel. Professional summary (embedded in full CV generation) not yet addressed — would require orchestrator-level hook.
**Discovered:** 2026-07-06 (cycle 88) by persuasion-expert.
**Description:** The 10 persuasion checks in `_run_persuasion_checks()` (`conversation_manager.py`) applied only to proposed rewrite candidates shown during the Rewrite Review tab. Freshly generated cover letter body text was not run through these checks.
**Affected stories:** US-P1, US-P4

---

## GAP-340: ATS Score Modal Shows Raw `basis` Enum Strings

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 88) — Replaced raw `score.basis` in `web/ats-modals.js:240` with a lookup map: `review_checkpoint` → "During review", `post_generation` → "After generation", `analysis` → "After job analysis". Label now reads "Scored: During review" etc.
**Discovered:** 2026-07-06 (cycle 88) by hr-ats.
**Description:** The ATS Score modal rendered `Basis: review_checkpoint` / `Basis: post_generation` / `Basis: analysis` — internal enum values exposed as user-facing text. `ats-modals.js:240` used `escapeHtml(score.basis || 'review')` directly.
**Affected stories:** US-H3, US-U4

---

## GAP-341: Finalise/Archive Tab Structurally Unreachable in Normal Workflow

**Priority:** CRITICAL
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 93) by recruiter-ops.
**Description:** The archive tab (`web/finalise.js`) has a complete implementation (readiness checklist, status dropdown, notes textarea, archive button) but four independent structural barriers make it inaccessible: (1) `tab-finalise` is hardcoded `display:none` in `index.html:227` and absent from `STAGE_TABS`; (2) `finalise-action-btn` is hardcoded `display:none` in `index.html:198` and `updateActionButtons('finalise')` is never called; (3) no phase in `PHASE_TO_STEP` maps to `'finalise'`; (4) the File Review tab's only navigation button leads to Cover Letter, not Archive. The only signal to users is a chat message "You can now finalise your application" with no matching UI affordance.
**Affected stories:** US-O1, US-O2, US-O5

---

## GAP-342: `candidate_to_confirm` Skills Leak Into Human-Readable DOCX

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 94) — Added `candidate_to_confirm` filter in `_generate_human_docx` at `cv_orchestrator.py:4938`: `skills_list = [s for s in cat.get('skills', []) if not (isinstance(s, dict) and s.get('candidate_to_confirm'))]`.
**Discovered:** 2026-07-06 (cycle 93) by resume-expert.
**Description:** Three of four output paths correctly filter `candidate_to_confirm` (weak-evidence) skills. The human DOCX path (`_generate_human_docx`, `cv_orchestrator.py:4919–4944`) is the remaining gap — it reads `skills_by_category` without any `candidate_to_confirm` filter in the chain. ATS DOCX was fixed in GAP-326; HTML/PDF template uses `{% if not skill.candidate_to_confirm %}`.
**Affected stories:** US-R5

---

## GAP-343: Cover Letter LLM System Prompt Has No Anti-Fabrication Clause

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 94) — Added anti-fabrication clause to cover letter system message in `master_data_routes.py:1691`: "CRITICAL: Base every claim strictly on the candidate profile provided. Do not invent, embellish, or fabricate any achievement, metric, role, technology, or fact not present in the source material."
**Discovered:** 2026-07-06 (cycle 93) by trust-compliance.
**Description:** The cover letter LLM call (`scripts/routes/master_data_routes.py:1691`) used a minimal system message with no prohibition on inventing claims. The main conversation system prompt's "CRITICAL — Data Integrity" clause (`conversation_manager.py:490–491`) and the rewrite-proposal constraint (`llm_client.py:1958`) did not apply to this code path.
**Affected stories:** US-C1, US-C2

---

## GAP-344: Only 3/10 Persuasion Checks Applied to Cover Letter Body

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 95) — Added 4 more checks: check_strong_action_verb, check_has_result_clause, check_positive_metric_framing, check_named_institution_position. Skipped check_keyword_appended and check_new_numeric_claims (different signatures not applicable to generation). Skipped check_car_structure (bullet-level). Added 4 new persuasion flag labels to cover-letter.js.
**Discovered:** 2026-07-06 (cycle 93) by persuasion-expert.
**Description:** `cover_letter_generate` in `master_data_routes.py:1713–1715` applies only `check_passive_voice`, `check_hedging_language`, and `check_summary_generic_phrases` to the generated letter body. The other 7 checks — `check_strong_action_verb`, `check_has_result_clause`, `check_keyword_appended`, `check_positive_metric_framing`, `check_new_numeric_claims`, `check_named_institution_position`, `check_car_structure` — are never run on cover letters. A cover letter with fabricated metrics or weak passive voice passes through 7 unguarded checks.
**Affected stories:** US-P5

---

## GAP-345: CAR Structure Check Has Zero Enforcement Weight

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 95) — Changed severity from 'info' to 'warn' in the fail branch of check_car_structure() in llm_client.py:1405; updated docstring.
**Discovered:** 2026-07-06 (cycle 93) by persuasion-expert.
**Description:** `check_car_structure()` (`llm_client.py:1364–1407`) returns `severity: 'info'` for both pass and fail outcomes. In `renderRewritePanel()` (`rewrite-review.js`), only `severity: 'warn'` entries increment the warning count, appear in the blocking amber banner, and require user acknowledgement before submission. CAR failures silently appear as quiet info badges that users can ignore without any friction. Fix: escalate severity to `warn` and add a suggested CAR-structured rewrite to the flag details.
**Affected stories:** US-P3

---

## GAP-346: No Skip Navigation Link — WCAG 2.4.1 Level A Violation

**Priority:** HIGH
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 93) by accessibility-specialist.
**Description:** `index.html` has no "Skip to main content" bypass link. A keyboard user must Tab through the fixed header (5 buttons), the position/ATS metrics bar, and all 13 workflow-step pills before reaching the Conversation input or Tab panel on every page load. WCAG 2.4.1 (Bypass Blocks) is a Level A mandatory criterion. Fix: add `<a href="#document-content" class="sr-only">Skip to content</a>` as the first focusable element in `<body>`.
**Affected stories:** US-X1

---

## GAP-347: Publication Edit Modal Silently Drops Non-Hardcoded BibTeX Fields on Save

**Priority:** HIGH
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 93) by master-cv-curator.
**Description:** The publication CRUD modal hard-codes a "known" field set (`author`, `editor`, `title`, `year`, `journal`, `booktitle`, `doi`). All other standard BibTeX fields — `volume`, `pages`, `publisher`, `number`, `series`, `isbn`, `url`, etc. — go into a raw "Extra fields (key=value)" textarea. When a curator opens an existing entry and saves, any content in that textarea that they do not explicitly preserve is silently dropped from `publications.bib`. No warning, no diff, no "unchanged = safe" guard. This directly violates US-M4: "Round-trip editing through the UI preserves existing BibTeX information." Location: `web/master-cv.js:1519–1567` (OFF-LIMITS until GAP-01 resolves).
**Affected stories:** US-M4

---

## GAP-348: `kb-focused` CSS Missing for DataTable Rows — Keyboard Nav Invisible

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 94) — Added `tr.kb-focused` CSS rule in `styles.css` after the existing rewrite/spell-card rule: `tr.kb-focused { outline: 2px solid var(--cv-accent); outline-offset: -2px; background-color: rgba(59,130,246,0.06) !important; }`.
**Discovered:** 2026-07-06 (cycle 93) by power-user.
**Description:** Keyboard ↑/↓ navigation and A/R shortcuts are implemented for all customizations sub-tabs in `keyboard-shortcuts.js`. However, `styles.css` only defined `.kb-focused` for `.rewrite-card` and `.spell-card`. When a DataTable `<tr>` received the `kb-focused` class, there was no visual style applied.
**Affected stories:** US-W3

---

## GAP-349: Keyboard Shortcut `?` Header Button Opens Wrong Modal

**Priority:** HIGH
**Status:** RESOLVED 2026-07-07 (cycle 99) — `setupEventListeners()` in `app.js` now removes the inline `onclick` from `#help-btn` at init and replaces it with `showKeyboardShortcutsPanel()`. Also updates `title`/`aria-label` to say "keyboard shortcuts reference". Shortcuts panel content in `keyboard-shortcuts.js` updated to describe A/R as working on customise review rows too. Button text "? Help" could not be changed (in index.html).
**Discovered:** 2026-07-06 (cycle 93) by power-user.
**Description:** The `?` key correctly opens a floating shortcuts panel, but the "? Help" header button (`index.html:63`) calls `showWelcomeModal()` — the onboarding wizard, not the shortcuts panel — so a user who investigates the `?` button is taken to the wrong place. Additionally, the shortcuts panel content says "A/R: Accept focused card (rewrite / spell)" without mentioning that A/R also works on all four customizations DataTable sub-tabs (added in GAP-332). The panel is undiscoverable for users who don't know the `?` key.
**Affected stories:** US-W1

---

## GAP-350: Advisory ATS Failures Counted as Blocking in Readiness Chip and Finalise Checklist

**Priority:** HIGH
**Status:** RESOLVED 2026-07-06 (cycle 94) — Exported `_NON_BLOCKING_CHECKS` from `download-tab.js`; imported it in `finalise.js`. Both `_atsFails` computations now exclude advisory check names. Also fixed the "Blocked formats" footer in `download-tab.js` to use `blockingFails.length > 0` instead of `summary.fail > 0` (GAP-360 co-fixed).
**Discovered:** 2026-07-06 (cycle 93) by hr-ats.
**Description:** Both `download-tab.js:414` and `finalise.js:175` computed ATS issue counts without excluding `_NON_BLOCKING_CHECKS`, causing advisory failures to be counted as blocking in the readiness chip and finalise checklist.
**Affected stories:** US-H3, US-H5

---

## GAP-351: Customise Stage Exposes 9 Sub-Tabs Simultaneously With No Guidance

**Priority:** HIGH
**Status:** RESOLVED 2026-07-07 (cycle 97) — Added `_maybeShowCustomizationsGuide()` in `review-table-base.js`. On first visit to any Customise sub-tab the function prepends a dismissible numbered guide card listing all 10 tabs with suggested order and required/optional labels. Existing `_visitedCustomiseTabs` set still tracks visited-state indicators (tab--visited CSS class).
**Discovered:** 2026-07-06 (cycle 93) by first-time-user.
**Description:** When the Customise step activates, 9 sub-tabs unlock at once (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications) with no ordering guidance, no required/optional distinction, and no visit-tracking progress indicator. A first-time user has no affordance for where to start or when they are done. Source: `ui-core.js` `STAGE_TABS.customizations`.
**Affected stories:** US-F3, US-A3

---

## GAP-352: Session Notes Invisible During Active Session Workspace

**Priority:** MEDIUM
**Status:** PARTIAL 2026-07-06 (cycle 95) — Added _active_notes() helper in session_routes.py:sessions_active() that reads metadata.json sidecar and returns notes field; session-switcher-ui.js already reads s.notes at line 268 and renders notesPreview for all row types, so notes now appear in the Sessions modal row for active sessions. Full "follow into workspace" banner would require a new DOM element in index.html (OFF-LIMITS until GAP-01).
**Discovered:** 2026-07-06 (cycle 93) by returning-user.
**Description:** Notes and application status are stored in a `metadata.json` sidecar file, not in the in-memory session. The `/api/sessions/active` endpoint (`session_routes.py:747–768`) never returns `notes`. `_normalizeSessionsForTable()` (`session-switcher-ui.js:238–280`) includes `notes` only for saved-type rows. `loadSessionFile()` does not read `metadata.json`. Result: a returning user who left themselves notes must open the Sessions modal to recall them — notes do not follow the user into the active workspace.
**Affected stories:** US-S5 (proposed US-S8)

---

## GAP-353: Professional Summary Never Post-Validated After Generation

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 95) — Added post-generation check_summary_generic_phrases() call in master_data_routes.py after summary generation; returns quality_warning in API response; summary-review.js shows a warning toast when quality_warning is non-null.
**Discovered:** 2026-07-06 (cycle 93) by persuasion-expert.
**Description:** The `generate_professional_summary()` prompt (`llm_client.py:882–903`) explicitly requires a value-identity opening and a forward-looking closing, and prohibits 19 generic filler phrases. None of these are verified on the actual output. `check_summary_generic_phrases()` fires only on rewrite proposals targeting `location == 'summary'`, not on the freshly generated text. A summary opening "Results-driven biostatistician with 10 years of experience seeking a challenging role…" passes the entire pipeline undetected.
**Affected stories:** US-P1, US-P3

---

## GAP-354: Review Sub-Tabs Lack Arrow-Key Navigation and Roving Tabindex

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 94) — Added `_initReviewSubtabKeyNav(container)` in `review-table-base.js`: wires ArrowLeft/ArrowRight handler on the tablist container (one-time, guarded by `dataset.keynavInit`), and updated `switchReviewSubtab()` to manage roving tabindex (active tab `tabindex="0"`, others `tabindex="-1"`). The `role="tablist"` is now set inside `_initReviewSubtabKeyNav` which is called from `switchReviewSubtab` on every invocation.
**Discovered:** 2026-07-06 (cycle 93) by accessibility-specialist.
**Description:** The review sub-tabs had `role="tab"` and `aria-selected` but no ArrowLeft/ArrowRight keyboard handler and no roving tabindex.
**Affected stories:** US-X2

---

## GAP-355: CV Template Heading Hierarchy Skips — Skills h2→h4, Job Role as div

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 94) — In `templates/cv-template.html`: changed skill group heading from `<h4>` to `<h3>` (line 627) and updated `.skill-group h4` CSS selector to `.skill-group h3` (line 182); changed job-role from `<div class="job-role">` to `<h3 class="job-role">` (line 672).
**Discovered:** 2026-07-06 (cycle 93) by accessibility-specialist.
**Description:** Skills section used `<h2>` then immediately `<h4>`, skipping h3; experience job title was a `<div>` not an `<h3>`. Both broke WCAG 1.3.1 Level A.
**Affected stories:** US-X1, US-H4

---

## GAP-356: Cover Letter Company-Reference Check Passes Without Company-Specific Substance

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 95) — Added Rule 2b company-substance check to _validateCoverLetter() in cover-letter.js. Warns when company_context is empty; when filled, checks for keyword overlap between context and letter body.
**Discovered:** 2026-07-06 (cycle 93) by hiring-manager.
**Description:** The `companyCheck` validation in `cover-letter.js:562–589` counts how many times the company name appears in the letter. Mentioning the company name twice counts as a pass. However, the prompt only injects company-specific context (initiatives, products, values) when the user fills in the optional `company_context` textarea (`master_data_routes.py:1640–1643`). When that field is empty (the common case), the letter will say "I'm excited about Acme Corp" twice and still pass the check, with no company-specific substance. US-M6 requires "at least one company-specific reference (recent initiative, product, or value)."
**Affected stories:** US-M6

---

## GAP-357: Publication Scoring Over-Weights Recency, Ignores `required_skills`; First-Author 0-Weight

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-07 (cycle 96) — Source-verified: `required_skills` bonus (+8 per match) and first-author bonus (+10) are both implemented in `cv_orchestrator.py:3805–3820` (added by cycle 94 GAP-318 fix, annotated with `# GAP-357` comment). Status was incorrectly left as OPEN.
**Discovered:** 2026-07-06 (cycle 93) by resume-expert. (Related to GAP-318, which added a first-author bonus detection but left its point value at 0.)
**Description:** In `_select_publications()` (`cv_orchestrator.py:3764–3806`): Year ≥ 2020 yields +30 points; first-author status is detected but contributes 0 points; `required_skills` is not consulted (only `ats_keywords`). A 2022 paper on an unrelated topic scores the same as a 2014 paper with four required-skill matches. Fix: add `required_skills` bonus (+8 per match) and first-author bonus (+10, consistent with GAP-318 intent).
**Affected stories:** US-R2

---

## GAP-358: No User-Visible Pre-Generation Page Length Estimate

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-07 (cycle 96) — Added page length estimate to the customization recommendations message in `conversation_manager.py:_handle_recommend_customizations`. After finalizing recommendations, calls `_estimate_cv_body_pages()` and appends `📏 Estimated CV length: X.X pages` (or `⚠️` prefix if < 1.5 or > 3.5 pages) to the assistant message visible to the user.
**Discovered:** 2026-07-06 (cycle 93) by resume-expert.
**Description:** `_estimate_cv_body_pages()` and `_cap_cv_body_to_pages()` run internally during `_handle_recommend_customizations` but neither the estimate nor any intermediate warning is surfaced as a visible UI message to the user before generation is initiated. Page count warnings fire only after generation via `validate_ats_report`. US-R2 criterion 2.5 states "System warns if estimated CV length exceeds 3 pages or is under 1.5 pages" — this should be visible pre-generation.
**Affected stories:** US-R2

---

## GAP-359: Experience `domain_relevance` Field Absent From Master CV CRUD Modal

**Priority:** MEDIUM
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 93) by master-cv-curator.
**Description:** The `experience` entries support a `domain_relevance` array (e.g. `["pharma", "clinical"]`) that the backend correctly reads and persists (`master_data_routes.py:591, 614`). The add/edit experience modal exposes only title, company, location, dates, employment type, importance, and tags — `domain_relevance` has no UI field (`web/master-cv.js:519–585`, OFF-LIMITS). Curators must edit `Master_CV_Data.json` directly to set this field, silently degrading domain-specific AI recommendations.
**Affected stories:** US-M3

---

## GAP-360: "Blocked Formats Reflect ATS Validation Failures" Footer Appears When Nothing Is Blocked

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 94) — Co-fixed with GAP-350. Changed `summary.fail > 0` to `blockingFails.length > 0` in `download-tab.js` — the footer now only appears when a format is genuinely blocked.
**Discovered:** 2026-07-06 (cycle 93) by hr-ats.
**Description:** `download-tab.js:258` showed "Blocked formats reflect ATS validation failures" when only advisory checks had failed and no format was actually blocked.
**Affected stories:** US-H5, US-U4

---

## GAP-361: Role-Type/Mismatch Gap Analysis Missing From Job Analysis Display

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-07 (cycle 98) — Added skill-gap computation in `conversation_manager.py:_handle_analyze_job()`: required skills fuzzy-matched against master CV skill names; gaps stored as `analysis['skill_gaps']`. `appendFormattedAnalysis()` in `message-queue.js` now renders an amber "⚠️ Skill Gaps" section listing unmatched required skills. role_level display was added in cycle 95.
**Discovered:** 2026-07-06 (cycle 93) by applicant.
**Description:** The backend computes `role_level` (IC vs. leadership, seniority) and has all data needed for apparent-mismatch surfacing, but `appendFormattedAnalysis` in `web/message-queue.js:199–249` renders only: position, domain, required skills, preferred skills, and ATS keywords. Neither the role-type inference nor any gap analysis ("Kubernetes is required but not in your master data") appears in the analysis panel. This is the most decision-critical part of US-A2 for an applicant.
**Affected stories:** US-A2

---

## GAP-362: Prior-Session Clarification Answers Not Pre-Populated Across Sessions

**Priority:** MEDIUM
**Status:** RESOLVED (pre-existing implementation discovered in cycle 100) — `_proceedAfterIntake()` in `message-dispatch.js:491` calls `/api/prior-clarifications` (status_routes.py:1121), which scans all sessions for role-keyword overlap against `state.intake.role`, then shows a consent banner ("Load defaults" / "No thanks"). When the user clicks "Load defaults", `_loadPriorClarifications()` merges the matched answers into `window.questionAnswers`. This satisfies US-A2 with proper user consent. Note: the mechanism requires `state.intake.role` to be non-empty for keyword matching; if the intake form was skipped or produces no role string, no prior answers are offered — this edge case remains unfixed.
**Discovered:** 2026-07-06 (cycle 93) by applicant (pre-existing implementation was missed in the source scan).
**Description:** US-A2 requires that if a prior session exists for the same role type, previous clarification answers are pre-filled as editable defaults. No code was found that loads prior `post_analysis_answers` across sessions. Every session forces the applicant to re-answer from scratch.
**Affected stories:** US-A2

---

## GAP-363: Screening LLM Call Does Not Inject Post-Analysis Clarification Answers

**Priority:** MEDIUM
**Status:** RESOLVED — already implemented prior to cycle 93 discovery. post_analysis_answers injected into screening prompt as cl_context at master_data_routes.py:1968–1986.
**Discovered:** 2026-07-06 (cycle 93) by applicant.
**Description:** The `/api/screening/generate` endpoint (`master_data_routes.py:1922`) is a standalone LLM call that reads master data and selected experiences but does not pull `post_analysis_answers` from the active session state. Preferences the applicant already stated (e.g., "emphasise leadership") are silently absent from screening response generation, contrary to US-A8's requirement that screening responses leverage the established conversation context.
**Affected stories:** US-A8

---

## GAP-364: Layout Sub-Phase Has 4 Sequential Action Buttons With No Sub-Step Indicator

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 95) — Added #layout-substep-indicator element to layout panel in layout-instruction.js; refreshLayoutReviewState() updates it to show 'Step N of 3' based on previewAvailable and layoutConfirmed state; CSS .layout-substep-indicator added to styles.css.
**Discovered:** 2026-07-06 (cycle 93) by ux-expert.
**Description:** The layout phase exposes four sequentially-labeled primary action buttons — "Generate Preview →", "Open Layout Review →", "Confirm Layout", "Continue to File Review →" — without any sub-step indicator in the workflow nav bar. All four states map to the single "Layout Review" step pill. A returning user cannot tell from the nav which of the four substeps they are on. Source: `app.js:194–197`, `index.html:134`.
**Affected stories:** US-U9, US-A6

---

## GAP-365: `.intake-confirm-card` CSS Exists But Extracted-Field Confirmation Is Unwired

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-07 (cycle 97) — `populateJobTab()` in `job-input.js` now renders an `.intake-confirm-card` with an editable position-name `<input>` when `phase === PHASES.INIT`. "Analyse Job" button calls `_analyzeJobWithConfirm()` which saves any user edit via `/api/rename-current-session` before calling `analyzeJob()`.
**Discovered:** 2026-07-06 (cycle 93) by ux-expert.
**Description:** The `.intake-confirm-card` and `.intake-field-row` CSS classes exist in `styles.css:1781–1825`, indicating a designed extracted-field confirmation step. However, all three job-input paths (paste at `job-input.js:307`, URL fetch at `job-input.js:385`, file upload at `job-input.js:495`) route directly to analysis (or now to `populateJobTab()`) without rendering this confirmation UI. US-U2 criterion 4 explicitly requires extracted fields to be inline-editable before analysis runs. If the company name, role title, or date is misparsed, the user has no in-place correction path.
**Affected stories:** US-U2, US-A2

---

## GAP-366: Publications and Rewrite Bulk Actions Lack Undo Path

**Priority:** MEDIUM
**Status:** RESOLVED 2026-07-06 (cycle 95) — Added `_pubUndoSnapshot` and `undoBulkPubAction()` to publications-review.js with pub-bulk-toolbar undo button; added `_rwUndoSnapshot` and `undoBulkRewriteAction()` to rewrite-review.js with rw-bulk-undo-btn in tally bar.
**Discovered:** 2026-07-06 (cycle 93) by power-user.
**Description:** Experience, skills, and achievements all show an "↩ Undo" button immediately after any bulk action. Publications (`bulkPubAction` in `publications-review.js:295`) and the rewrite panel (`acceptAllRewrites`/`rejectAllRewrites` in `rewrite-review.js:680–695`) perform bulk operations without recording a snapshot — no undo button appears. Accidentally clicking "Reject All" on publications or "Accept All" on rewrites has no recovery path, which is a significant power-user penalty on large review sets.
**Affected stories:** US-W2, US-A5

---

## GAP-367: "LLM" and Implementation-Centric Jargon Throughout Header and Status Copy

**Priority:** LOW
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 93) by applicant, first-time-user, ux-expert, heuristic.
**Description:** The header permanently displays "LLM: [provider] ⚠ Not ready" before setup. The onboarding modal directs the user to "use the ⚙ LLM button" but no button has that label. "LLM" is never spelled out anywhere. The busy overlay says "Reasoning…" — a technical AI term. The connection-status badge uses "auth-required", "rate-limited", "unconfigured" — vocabulary familiar to engineers but opaque to job seekers. Sources: `index.html:51–62`, `index.html:355`, `ui-core.js:776–810`. Suggested replacements: "LLM" → "AI Model", "Reasoning…" → "Working…", "auth-required" → "Sign in required".
**Affected stories:** US-F1, US-A1, US-U1

---

## GAP-368: "Harvest" Step Label Is an Opaque Metaphor for Job Seekers

**Priority:** LOW
**Status:** PARTIAL 2026-07-06 (cycle 95) — Updated STEP_SHORT_LABELS[harvest] and dynamic STEP_LABELS[harvest] in workflow-steps.js to 'Update Master CV'. Static step div and tab label in index.html remain (OFF-LIMITS until GAP-01).
**Discovered:** 2026-07-06 (cycle 93) by applicant, first-time-user.
**Description:** The workflow step "🌾 Harvest" is an agricultural metaphor with no inline definition. An explanation exists only in a hover tooltip. This violates the US-F1 failure-mode guard: "Terms like rewrites, customisations, layout review, or harvest appearing without context." The meaning ("Save approved rewrites back to your master CV") would be immediately understood if the label were "Update Master CV". Source: `index.html:122–148`, `workflow-steps.js:196–208`.
**Affected stories:** US-F1, US-A11

---

## GAP-369: Single-Session Auto-Resume Has No Explicit Notification

**Priority:** LOW
**Status:** RESOLVED 2026-07-07 (cycle 96) — Added auto-resume notification in `session-manager.js:ensureSessionContext()`: after `loadSessionFile` succeeds, appends `ℹ️ Only one active session found — auto-resumed. Open Sessions to switch or start a new one.`
**Discovered:** 2026-07-06 (cycle 93) by returning-user.
**Description:** When auto-resume fires (GAP-323 fixed), the only messages are generic "🔄 Restoring session from file..." and "✅ Session restored: {name} ({phase})". There is no "Auto-resumed — only one active session found. Use Sessions to switch." Users who arrive expecting to choose a session may be confused about why they landed in a specific session.
**Affected stories:** US-S1 (proposed US-S9)

---

## GAP-370: Default Archive Status Dropdown Value Is "queued" — Wrong for Completed Workflow

**Priority:** LOW
**Status:** RESOLVED 2026-07-07 (cycle 96) — Moved `selected` attribute from `value="queued"` to `value="ready"` in `finalise.js:103–105`. Default is now "Ready to send" which is appropriate at the point of finalising a completed package.
**Discovered:** 2026-07-06 (cycle 93) by recruiter-ops.
**Description:** The Finalise tab status dropdown (`finalise.js:102`) defaults to `queued` ("Queued — will apply soon"). At the moment of archiving a completed package, "queued" describes a pre-submission state — the default should be `ready` (or a neutral "unset"). Separately, the values `queued` and `parked` use informal jargon; plain-language equivalents ("Ready to Send", "On Hold") would improve clarity.
**Affected stories:** US-O1, US-O2

---

## GAP-371: Summary Variant Key Exposed as Display Label — No Display-Name Field

**Priority:** LOW
**Status:** OPEN
**Discovered:** 2026-07-06 (cycle 93) by master-cv-curator.
**Description:** Professional summary variants are stored as `{ key: text }` pairs with `lowercase_underscore` keys. This key is the label shown in the Summary Focus picker during customisation — there is no separate display-name field. A curator creating variants for "Machine Learning Engineering" and "VP / Executive" roles must either accept that the workflow shows `ml_engineering` and `vp_executive` as picker labels, or encode long readable strings as keys with potential downstream handling issues. Location: `web/master-cv.js:807–811` (OFF-LIMITS).
**Affected stories:** US-M2

---

## GAP-372: Executive/Academic Cover Letter Word Count Bounds Possibly Still Below Story Spec

**Priority:** LOW
**Status:** RESOLVED 2026-07-07 (cycle 96) — Source-verified: backend `master_data_routes.py:119–121` returns 400–500 (exec) / 500–600 (academic); frontend `cover-letter.js:650–651` validates `{ lo: 400, hi: 500 }` (exec) / `{ lo: 500, hi: 600 }` (academic). Both match story spec. GAP-338 was fully resolved in cycle 88. Status was incorrectly left as OPEN.
**Discovered:** 2026-07-06 (cycle 93) by hiring-manager. (Check against GAP-338 resolution from cycle 88.)
**Description:** The hiring manager review found that executive word-count target is set at 350–450 words and academic at 400–500 words (`master_data_routes.py:118–120`; `cover-letter.js:621–625`), while the story spec requires 400–500 for executive and 500–600 for research/academic. GAP-338 was marked resolved in cycle 88 ("cover letter exec/academic word count ranges aligned to story spec") — either the fix was incomplete or the story spec numbers differ from what was implemented. Needs code verification.
**Affected stories:** US-M6

---

## GAP-373: Hard/Soft Skill Type Toggle Does Not Trigger ATS Refresh

**Priority:** LOW
**Status:** RESOLVED 2026-07-06 (cycle 94) — Added `scheduleAtsRefresh()` call in the `.then()` handler after `saveSkillQualifierOverride()` in `skills-review.js:991`. The ATS modal keyword grouping now stays current after skill type changes.
**Discovered:** 2026-07-06 (cycle 93) by hr-ats.
**Description:** The hard/soft skill type toggle did not call `scheduleAtsRefresh()` after saving, leaving the ATS Report modal's keyword grouping stale.
**Affected stories:** US-H6

---

## GAP-374: LLM Disclosure Fires Only at analyzeJob() — Not at Cover Letter/Harvest/Screening

**Priority:** LOW
**Status:** RESOLVED 2026-07-07 (cycle 96) — Added provider-scoped `disclosureKey` disclosure check to: `generateCoverLetter()` in `cover-letter.js` (via `_showLlmDisclosure()` helper), `generateScreeningResponse()` in `screening-questions.js`, and `fetchAnalysis()` in `harvest.js`. All use the same `disclosureKey(provider)` pattern from job-analysis.js; fires once per provider via localStorage flag; uses `appendMessage` if available in scope.
**Discovered:** 2026-07-06 (cycle 93) by trust-compliance.
**Description:** The provider-scoped LLM disclosure (`disclosureKey(provider)` in `api-client.js:31–34`) is implemented and correct, but it fires only when `analyzeJob()` runs in `web/job-analysis.js:99–108`. Cover letter generation, harvest analysis, and screening question generation are all LLM calls that do not trigger the disclosure. A user who navigates directly to cover letter generation without running job analysis would never see the disclosure.
**Affected stories:** US-C3

---

## GAP-375: `_validate_summary()` Does Not Check for Job Title or Years-of-Experience Mention

**Priority:** LOW
**Status:** RESOLVED 2026-07-07 (cycle 96) — Added Check 5 (job title partial match: at least one word > 3 chars from `job_analysis.title` must appear in summary) and Check 6 (years-of-experience regex: `\d+\+?\s+year`, `over N years`, `more than N years`) to `cv_orchestrator.py:_validate_summary`. Both produce advisory warnings surfaced in the download tab quality report.
**Discovered:** 2026-07-06 (cycle 93) by hiring-manager.
**Description:** `_validate_summary()` in `cv_orchestrator.py:3607–3656` runs four checks (no "I" opener, word count, dense paragraph, top-3 skills) but never verifies that the summary mentions the target job title or quantifies years of experience. Both are US-M1 acceptance criteria. A hiring manager expects to read "10+ years in data science" and the specific role title in the opening paragraph — the current validator will pass a summary that omits both.
**Affected stories:** US-M1
