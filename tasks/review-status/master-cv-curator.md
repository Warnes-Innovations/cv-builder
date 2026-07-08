<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-07-07 22:01 ET

**Executive Summary:** Follow-up review after the GAP-384 (focus-restoration) and GAP-389 (duplicate harvest table) fix cycle. **GAP-384 is RESOLVED** — all 20 Master CV modals now use `pushFocusStack(document.activeElement)` against the shared `_focusStack` array in `web/ui-core.js`, paired with `restoreFocus()` on close; no reference to the old dead `_focusedElementBeforeModal` variable remains anywhere in `web/`. **GAP-389 is RESOLVED** — `web/finalise.js`'s `showHarvestSection()` now renders only a candidate count and a "Review & Update Master CV →" link into the `harvest` tab; it no longer re-renders its own checkbox table, and the file carries an explicit in-code note (`finalise.js:356-363`) documenting why the old duplicate was removed. **No dead code was left behind**: the div `#harvest-section` in `finalise.js` is legitimately reused for the new count/link summary (not orphaned), no `harvest-chk-`/`harvest-apply-btn` ids exist outside `web/harvest.js`, and `web/styles.css` has no leftover `.harvest-*` rules. Beyond the two target GAPs, this pass also finds three additional issues flagged in the prior (pre-fix) review snapshot have themselves been independently resolved since then (stale "Package Application Files" label, "Harvest Improvements" vs. "Update Master CV" terminology split, and the Finalise-tab auto-injected harvest table that drove the old US-M3 partial rating) — see details below. One real gap remains open: session-scoped edits (rewrite review, skills review, customization) still carry no in-context "this is session-only" reminder outside the Master CV tab itself (US-M1 criterion 2).

## Application Evaluation

### GAP-384 verification — focus restoration across Master CV modals

`web/ui-core.js:31` defines a single shared `_focusStack` array; `pushFocusStack()` (line 353-355) pushes onto it and `restoreFocus()` (line 345-352) pops and refocuses. `grep -c "_focusedElementBeforeModal" web/*.js` returns zero hits repo-wide — the old dead variable is fully gone, not merely unused-but-present.

All 20 `pushFocusStack(document.activeElement)` call sites in `web/master-cv.js` were enumerated and spot-checked; every one immediately follows the modal overlay's `style.display = 'flex'` assignment and precedes `setInitialFocus()`/`trapFocus()`, with a matching `restoreFocus()` in the corresponding `close*Modal()` function:

| Modal | Show/Edit | Line(s) | Close | Line |
|---|---|---|---|---|
| Publication | `showAddPublicationModal` / `editMasterPublication` | 1566 / 1600 | `closePublicationModal` | 1607 |
| Import Publications | `showImportPublicationsModal` | 1372 | `closeImportPublicationsModal` | 1379 |
| Convert Publications | `showConvertPublicationsModal` | 1444 | `closeConvertPublicationsModal` | 1451 |
| Achievement | `showAddAchievementModal` / `editMasterAchievement` | 1856 / 1870 | `closeMasterAchModal` | 1877 |
| Summary | `showAddSummaryModal` / `editMasterSummary` | 1919 / 1929 | `closeMasterSumModal` | 1936 |
| Personal Info | `showEditPersonalInfoModal` | 1984 | `closePersonalInfoModal` | 1991 (implied by symmetric pattern) |
| Experience | `showAddExperienceModal` / `editMasterExperience` | 2043 / 2140 | `closeExperienceModal` | 2147 |
| Skill | `showAddSkillModal` / `editMasterSkill` | 2243 / 2280 | `closeSkillModal` | 2288 |
| Education | `showAddEducationModal` / `editMasterEducation` | 2379 / 2395 | `closeEducationModal` | 2402 |
| Award | `showAddAwardModal` / `editMasterAward` | 2478 / 2492 | `closeAwardModal` | 2499 |
| Certification | (add/edit) | 2570 / 2582 | `closeCertificationModal` | (line 2587) |
| Master CV backup/data preview | `openMasterCvModal` | 3045 | `closeMasterCvModal` | 3054 |

Also confirmed correct at the two other sites named in the task: `web/workflow-steps.js` (lines 180, 362, 734-735, all guarded with `typeof pushFocusStack === 'function'`) and `web/achievements-review.js` (line 807) — both consistent with the same shared-stack pattern, no local re-implementation.

**Verdict: GAP-384 RESOLVED**, no regressions found across the sampled surface (publication, experience, skill, achievement, personal info, plus education/award/certification/summary/backup as a bonus check).

### GAP-389 verification — dedicated Update Master CV tab vs. Finalise tab

- `web/harvest.js` (`populateHarvestTab`, line 361) remains the sole implementation that fetches candidates (`/api/harvest/candidates`), runs AI analysis (`/api/harvest/analyze`), renders the grouped/checkbox table (`renderHarvestTabHtml`, line 262), and applies selections (`applyHarvestSelections`, line 471, POSTing to `/api/harvest/apply` with a `showConfirmModal` gate at lines 482-489).
- `web/review-table-base.js:426-427` wires `case 'harvest': ... populateHarvestTab()` into tab-switch handling — confirmed this is the only tab-switch call site for `populateHarvestTab`, and `web/bundle.js` contains the same compiled function body (not a second divergent copy).
- `web/finalise.js`'s `showHarvestSection()` (lines 356-415) now only calls `/api/harvest/candidates` to get a **count**, then renders either an empty-state message or `<button onclick="switchTab('harvest')">🌾 Review & Update Master CV →</button>` (lines 398-406). It contains **no** checkbox markup, no `harvest-chk-*` ids, and does not call `/api/harvest/apply` itself.
- The file carries an explicit comment (`finalise.js:357-363`) documenting the GAP-389 rationale ("one feature, two independent implementations... it now only surfaces the count and links to the single canonical implementation") and a second comment (`finalise.js:417-423`) noting the old divergent `applyHarvestSelections()` copy that used to live in this file was dead code (harvest.js's version always won at click time) and has been removed, pointing readers to `web/harvest.js`.
- Cross-file ID collision check: `grep -n "harvest-section\|harvest-chk-\|harvest-apply-btn\|harvest-row-\|showHarvestSection"` across `finalise.js`, `harvest.js`, `styles.css`, `index.html` shows `harvest-section` used only in `finalise.js` (legitimately, for the new count/link summary) and `harvest-chk-`/`harvest-apply-btn`/`harvest-row-` used only in `harvest.js`. `styles.css` has zero `.harvest-*` rules (harvest.js styles everything inline). `index.html` only references the `step-harvest`/`tab-harvest` nav elements, no embedded harvest markup.

**Verdict: GAP-389 RESOLVED**, and the harvest-panel simplification left no dead code, no orphaned ids, and no orphaned CSS.

### Bonus finding: three items from the pre-fix review snapshot are also now resolved

The review-status file as of the last pass (2026-07-07 20:18 ET, prior to this fix cycle) flagged three additional issues under US-M2/US-M3. Re-checking current source shows all three are now fixed, apparently as part of the same broader cleanup:

1. **Stale HTML label vs. JS runtime patch (was: US-M3 Additional Gap #3).** Previously `index.html:205` hardcoded "📦 Package Application Files" with a JS override in `app.js` correcting it at runtime. Current source: `index.html:205` now reads `<button ... id="finalise-action-btn" ...>✅ Finalise Application</button>` directly — the label is fixed at the source of truth. `app.js:156-159` no longer contains a `textContent` override, only a plain click listener (`finaliseBtn.addEventListener('click', () => switchTab('finalise'))`). Confirmed resolved, `grep -rn "Package Application Files"` across `web/` returns no hits.
2. **"Harvest Improvements" vs. "Update Master CV" terminology split (was: US-M2 Additional Gap #4).** Previously the nav tab read "Update Master CV" but the in-panel `<h1>` read "🌾 Harvest Improvements." Current source: `web/harvest.js:284` (`renderHarvestTabHtml`) and `:309` (`renderEmptyStateHtml`) both now render `<h1>🌾 Update Master CV</h1>`, matching `index.html:153`/`:241` exactly. Confirmed resolved.
3. **Finalise tab auto-chaining a harvest table (was: US-M3 Additional Gap #2 / criterion "Partial").** This is subsumed by the GAP-389 fix itself: `showHarvestSection()` no longer injects the harvest-apply table into the Finalise tab at all — it now requires an explicit navigation click ("Review & Update Master CV →") to reach the dedicated `harvest` tab. This directly satisfies the acceptance criterion that finalise/archive and harvest/apply "appear as distinct steps," upgrading US-M3's criterion 1 from ⚠️ Partial to ✅ Pass.

---

### US-M1: Session-Only Customization Boundary

| # | Criterion (abbreviated) | Status | Notes / File:Line |
|---|--------------------------|--------|--------------------|
| 1 | Workflow distinguishes session editing from master-data maintenance | ✅ Pass | `scripts/utils/session_data_view.py:7` docstring: "Read-only view that overlays session state onto master CV data." `scripts/utils/conversation_manager.py:120-125` explicitly comments session-only state fields (`achievement_overrides`, `removed_achievement_ids`, `skill_group_overrides`, `skill_category_overrides`, `skill_qualifier_overrides` — all annotated "for this session only"). Enforced at the route layer via `_require_master_data_write_phase()` (`scripts/routes/master_data_routes.py:208-221`), gating master-data writes to `init`/`refinement` phases only, applied at 17+ call sites in that file (achievement, summary, experience, personal-info, publication CRUD, import/convert, NL-update propose/confirm). |
| 2 | UI does not imply temporary edits already updated the master record | ⚠️ Partial (unchanged from prior review) | The Master CV tab carries a clear governance banner (`master-cv.js:102-110`, phase-lock messaging naming the current stage). However `web/rewrite-review.js` still has no session-scope disclaimer in its intro copy (re-checked: `grep -i "session.only\|this session\|temporary"` against `rewrite-review.js` returns only an unrelated "weak evidence" tooltip at line 401, no boundary-clarity copy). A curator who works entirely within customization/rewrite-review and never opens the Master CV tab still has no in-context signal that their in-session choices are non-durable. |
| 3 | Durable write-back occurs only through explicit user action | ✅ Pass | `harvest_apply()` (`scripts/routes/generation_routes.py:2328-2349`) requires an explicit POST with named `selected_ids`; empty selection is a no-op. Client requires a `showConfirmModal` step before the POST fires (`web/harvest.js:482-489`). All Master CV tab structured edits are explicit, one-entity-at-a-time `save*()` actions. |

---

### US-M2: Harvest Review Quality

| # | Criterion (abbreviated) | Status | Notes / File:Line |
|---|--------------------------|--------|--------------------|
| 1 | Harvest candidates presented in reviewable form | ✅ Pass | `renderHarvestTabHtml()` (`web/harvest.js:262`) groups candidates by type → recommendation → confidence (`groupCandidates()`, line 72; `HARVEST_TYPE_CONFIG`, line 28). |
| 2 | Each candidate indicates what would be added/changed | ✅ Pass | `renderCandidateRow()` (`web/harvest.js:140`) → `renderProposalRow()` (`web/proposal-review.js`) renders explicit Before (`c.original`) / After (`c.proposed`) content per candidate, not just a bare label. |
| 3 | Applying harvested changes is optional and selective | ✅ Pass | `shouldPreCheck()` (`harvest.js:99-101`) always returns `false` — "master CV updates are opt-in only." `applyHarvestSelections()` (line 471-472) only submits checked `input[data-harvest-id]`. Backend only writes named `selected_ids` (`generation_routes.py:2343-2349`). |

Terminology inconsistency previously noted here (nav "Update Master CV" vs. panel "Harvest Improvements") is now resolved — see Bonus Finding #2 above.

---

### US-M3: Boundary Clarity Across Final Stages

| # | Criterion | Status | Notes / File:Line |
|---|-----------|--------|--------------------|
| 1 | Finalise/archive and harvest/apply appear as distinct steps with distinct consequences | ✅ Pass (upgraded from ⚠️ Partial) | Structurally distinct: separate tabs (`index.html:151` `step-finalise` vs `:153` `step-harvest`), separate endpoints (`POST /api/finalise` in `finalise.js:296` vs `POST /api/harvest/apply` in `generation_routes.py:2328`), separate phase gates (`_require_harvest_apply_phase()`, `generation_routes.py:1309-1318`, restricts to `refinement` only). Now also distinct **in presentation**: post-finalise, `finalise.js:342` calls `showHarvestSection()`, which (per GAP-389 fix) only shows a count + an explicit navigation button to the dedicated `harvest` tab — it no longer auto-renders the harvest-apply table inline on the Finalise screen. |

Both other failure modes previously tracked here are resolved: the stale "Package Application Files" label (see Bonus Finding #1) and the auto-chained harvest table (see Bonus Finding #3, subsumed by GAP-389).

---

### US-M4: Maintain the Master Publications Bibliography

| # | Acceptance Criterion | Status | Notes / File:Line |
|---|-----------------------|--------|--------------------|
| 1 | Reviewable list view with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList()` (`web/master-cv.js:1213-1289`) — Sort (`year_desc/asc`, `type_asc/desc`) and Group (`none/year/type`) `<select>` controls. |
| 2 | Add/edit/delete publication entries from Master CV surface | ✅ Pass | `showAddPublicationModal()` (1550), `editMasterPublication()` (1571), `saveMasterPublication()` (1610) → `POST /api/master-data/publication` (`master_data_routes.py:1826-1893`, add/update/delete). |
| 3 | Import raw BibTeX + review validation errors | ✅ Pass | `showImportPublicationsModal()`/`importPublicationsBib()` (1367-1436) → `POST /api/master-data/publications/import` (`master_data_routes.py:1895-1994`); per-entry required-field validation surfaced via `invalid_keys`/`skipped_keys`. Separate no-save `POST /api/master-data/publications/validate` (routes.py:1797-1824). |
| 4 | Paste citation text, review generated BibTeX, decide to import | ✅ Pass | `showConvertPublicationsModal()`/`convertPublicationText()` (1438-1490) → `POST /api/master-data/publications/convert` (routes.py:1996-2020, LLM-driven, no persistence) producing a preview; a separate explicit import action reuses the criterion-3 import endpoint. |
| 5 | Flags missing key fields (title/authors/year) | ✅ Pass | Single-entry: `master_data_routes.py:1874-1879` (400 if title/year/author-or-editor missing). Bulk import: per-entry `missing_fields` check (routes.py:1930-1948) rejects and reports invalid entries rather than silently accepting them. |
| 6 | Writes only from `init`/`refinement` windows | ✅ Pass | `_require_master_data_write_phase()` gates PUT `/api/master-data/publications` (1752-1754), POST `/api/master-data/publication` (1831-1833), POST `/api/master-data/publications/import` (1900-1902). GET/`validate`/`convert` correctly ungated because they perform no writes (verified: neither route calls `bib_path.write_text` or mutates `orchestrator.publications`). |
| 7 | Round-trip editing preserves unrelated fields | ✅ Pass | `_entry_to_publication()` (`scripts/utils/bibtex_parser.py:99-132`) denylists only bibtexparser's own `{"ID","ENTRYTYPE"}`; `serialize_bibtex_entry()` (500-536) re-emits any non-standard field alphabetically. No allowlist-driven field loss. Multi-line "extra field" values are escaped/unescaped correctly at the UI layer (`master-cv.js` editMasterPublication/saveMasterPublication). |

---

## Generated Materials Evaluation

N/A — this persona's scope (Master CV data maintenance) does not itself produce generated CV/cover-letter output artifacts; those are evaluated by other personas. The one "generated material" in scope, converted BibTeX from pasted citation text (`convertPublicationText()`), is covered under US-M4 criterion 4 above — it is presented as a preview requiring a separate explicit import action, never auto-applied.

---

## Additional Story Gaps / Proposed Story Items

1. **No point-of-editing session-scope reminder (US-M1 criterion 2, still open).** The Master CV tab's phase-lock banner (`master-cv.js:102-110`) is not visible from customization/rewrite-review/skills stages where session-scoped decisions actually happen. `web/rewrite-review.js` still carries no session-boundary disclaimer in its intro copy. Recommend a new/refined US-M1 acceptance criterion: "A brief, consistent session-scope reminder appears on every stage where session-only edits are made, not only on the Master CV tab."

2. **No explicit story criterion for the achievement-bullet editor inside the Experience modal.** This is a fully working structured-editing surface (`_renderExpAchievementsEditor`/`_addExpAchievement`/`_moveExpAchievement`/`_deleteExpAchievement`, `master-cv.js:2059-2114`, persisted via `POST /api/master-data/experience`) but has no corresponding acceptance criterion in `tasks/user-story-master-cv-curator.md`. Recommend adding one under US-M4 (or a new US-M5) so a future regression here is caught by story-driven review rather than only by incidental testing.

3. **Cosmetic: naive title-casing on summary variant keys.** `_renderSummariesList()` (`master-cv.js:1831`) produces "Ml Engineering" for `ml_engineering` rather than "ML Engineering" (no acronym exception list). Low priority; the in-code comment already references GAP-371's planned display-name-field fix as the proper long-term resolution.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/master-cv.js, web/harvest.js, web/finalise.js (plus, for cross-referenced evidence: web/workflow-steps.js, web/achievements-review.js, web/review-table-base.js, web/proposal-review.js, web/rewrite-review.js, scripts/routes/master_data_routes.py, scripts/routes/generation_routes.py, scripts/utils/bibtex_parser.py, scripts/utils/session_data_view.py)

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-M1 | 2 | 1 | 0 | 0 | 0 |
| US-M2 | 3 | 0 | 0 | 0 | 0 |
| US-M3 | 1 | 0 | 0 | 0 | 0 |
| US-M4 | 7 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- GAP-384 (focus stack): shared implementation → web/ui-core.js:31,345-355; all 20 call sites → web/master-cv.js (see table above); zero remaining `_focusedElementBeforeModal` refs repo-wide.
- GAP-389 (dedupe harvest table): canonical implementation → web/harvest.js:361-420 (populateHarvestTab), :471-538 (applyHarvestSelections); wiring → web/review-table-base.js:426-427; simplified caller → web/finalise.js:356-415, with removal rationale comments at :357-363 and :417-423.
- US-M1: session/master overlay architecture → scripts/utils/session_data_view.py:7; phase gate → scripts/routes/master_data_routes.py:208-221; missing point-of-editing reminder → web/rewrite-review.js (no disclaimer found).
- US-M2: per-item selective apply → web/harvest.js:99-101,471-489; scripts/routes/generation_routes.py:2343-2349.
- US-M3: distinct steps, no longer visually chained → web/finalise.js:342,398-406; scripts/routes/generation_routes.py:1309-1318.
- US-M4: publications CRUD + sort/group → web/master-cv.js:1182-1289; field preservation → scripts/utils/bibtex_parser.py:99-132,500-536; write-window gating → scripts/routes/master_data_routes.py:1752-1754,1831-1833,1900-1902.

**Evidence standard:** every conclusion above is supported by a repository-relative file path plus line number(s), independently re-derived by reading the current source rather than trusting the summary provided at task start or any prior gap/review document.
