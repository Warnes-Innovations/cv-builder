<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-07-07 23:16 ET

**Executive Summary:** Follow-up review after the GAP-394 (session-scope reminder) fix cycle (cycle 106). **GAP-394 is RESOLVED** — `web/review-table-base.js`'s `populateReviewTab()` now renders a session-scope note (`headerHtml`, lines 743-745) in the `pane === 'experiences'` branch, and `web/rewrite-review.js`'s `renderRewritePanel()` renders an equivalent note (lines 291-293) near the top of the rewrite panel; both correctly say the edits are scoped to "this application only" and both correctly point to the real, currently-live "Update Master CV" step (confirmed as the actual tab label in `web/workflow-steps.js:50,972` and the harvest-section heading in `web/finalise.js`). This closes the gap this persona raised last cycle (US-M1 criterion 2, previously ⚠️ Partial, now upgraded to ✅ Pass). One real — but non-blocking — gap in the fix itself: the `review-table-base.js` side of the fix has **no dedicated regression test** (confirmed: `grep` for the note's exact text across all of `tests/` finds it only in `tests/js/rewrite-review.test.js:349-350`; `tests/js/review-table-base.test.js` deliberately sets `pendingRecommendations = null` before its `handleCustomizationResponse` tests specifically so `populateReviewTab` no-ops, per its own inline comment at line 350), while the `rewrite-review.js` side does have one. I recommend closing this gap before signing off fully, but it does not change my verdict that GAP-394 itself is resolved — the note is present, worded correctly, and pointed at the correct destination. **GAP-384 and GAP-389 have NOT regressed**: re-ran `tests/js/master-cv.test.js`, `tests/js/finalise.test.js`, `tests/js/rewrite-review.test.js`, and `tests/js/review-table-base.test.js` together (222 passed, 0 failed), and independently re-read `web/finalise.js:356-415` (GAP-389's harvest-count-and-link pattern, unchanged) and confirmed no reintroduction of `_focusedElementBeforeModal` anywhere in `web/`.

## Application Evaluation

### GAP-394 verification — session-scope reminder in Customisations and Rewrite Review

- **`web/review-table-base.js` — `populateReviewTab()` (function body: lines 722-796).** Read in full. The `headerHtml` ternary (line 740) is gated on `pane === 'experiences'` and, only for that pane, renders (lines 743-745):
  > 💡 *Changes here apply to **this application only** — they won't change your saved Master CV data. To keep something permanently, use the **Update Master CV** step after finalising.*
  This is accurate: it correctly names the scope ("this application only"), correctly states the consequence (won't change saved Master CV data), and correctly names the real next step. Cross-checked against `web/workflow-steps.js:50` (`harvest: 'Update Master CV'`) and `web/finalise.js` harvest-section heading (`<h2>📥 Update Master CV Data</h2>`) — the label the note references is a real, currently-live step, not a stale or renamed one.
- **`web/rewrite-review.js` — `renderRewritePanel()` (lines 221-345).** Read in full. Lines 291-293 render, near the top of the panel body (right after the intro paragraph, before the tally bar):
  > 💡 *Decisions here apply to **this application only** — your saved Master CV data is unchanged. To keep a rewrite permanently, use the **Update Master CV** step after finalising.*
  Same verdict: accurate wording, correct pointer, well-placed (above the fold, before the action buttons).
- Both notes use identical low-emphasis styling (`font-size:0.83em; color:#94a3b8; background:#f8fafc; border-left:3px solid #e2e8f0`) — consistent visual language between the two surfaces, which is good for recognizability.

**Verdict: GAP-394 RESOLVED.** Wording is clear, accurate, and consistently styled across both surfaces; the destination step name is real and current, not aspirational or stale.

### Frequency of display — every visit, not once-per-session

Traced the call chain rather than trusting the claimed-fix summary's "rendered once" framing:

- `switchTab()` (`web/review-table-base.js:214-283`) calls `loadTabContent(tab)` **unconditionally on every tab switch** (line 282) — there is no "already visited" guard before that call. `loadTabContent`'s `case 'exp-review'` (line 353-355) calls `populateReviewTab('experiences')` every single time, so the note re-renders on every visit to that sub-tab, not just the first.
- The `rewrite` tab is the same shape: `loadTabContent`'s `case 'rewrite'` (lines 377-396) calls `renderRewritePanel()` every time the tab is switched to — either from `window._rewritePanelCache` (line 378-382) or freshly fetched (line 388) — so the note re-renders every visit there too.
- So "rendered once" in the fix description is accurate only in the sense of "once per pane, not repeated on every Customisations sub-tab" (skills/achievements/summary/publications don't get it) — it is **not** "shown once ever per session." It reappears every time the user returns to the experiences sub-tab or the rewrite tab.

**My opinion on this UX call:** this is the right choice, not a bug. The note is styled as a low-contrast inline caption (not a toast, not a modal, no dismiss affordance needed) sitting in a natural reading position above the content — reappearing on every visit costs the user nothing (it doesn't block, animate, or demand acknowledgment) and correctly avoids the alternative failure mode of a "seen once, forgotten by the time it matters" one-shot reminder. I would not make it dismissible — dismissible-and-gone is worse here than always-present-and-quiet, given how easy it is to lose track of session-vs-permanent state across a multi-tab, multi-visit editing session.

One real edge case this placement misses: `stateManager`'s `currentTab` is persisted and restored on reconnect (`web/state-manager.js:429-430`), and the top-level sub-tab buttons for `skills-review`/`achievements-review`/`summary-review`/`publications-review` are independently clickable (`web/index.html:220-226`) once unlocked — so a user who reconnects mid-session with `currentTab` already set to, say, `skills-review`, or who jumps directly to a later sub-tab, may never pass through `exp-review` in that browsing session and would never see the reminder at all. This is a minor gap, not a regression of the claimed fix (the fix does exactly what it says for the common "enter Customisations fresh" path), but worth a follow-up story item — see Additional Story Gaps below.

### Regression test coverage — asymmetric between the two files

- `tests/js/rewrite-review.test.js:347-351` — `it('reminds the user decisions here are session-only, not saved to Master CV data (GAP-394)', ...)` directly renders the panel and asserts on the note's text (`'this application only'`, `'Update Master CV'`). This is a real, working regression test I could re-run (see below).
- `tests/js/review-table-base.test.js` has **no equivalent test**. Confirmed by `grep` for the note's exact substrings (`'this application only'`, `'Update Master CV'`, `'session only'`, `'GAP-394'`) across the entire file — zero hits. The file's own header comment (lines 7-14) states: *"(populateReviewTab / loadTabContent are orchestration-heavy and rely on globalThis delegations that are validated via integration tests.)"* — and this is not just a stale comment; the `handleCustomizationResponse` test block (lines 342-351) deliberately sets `window.pendingRecommendations = null` specifically so that `populateReviewTab`'s early-return guard (`review-table-base.js:726-729`) fires and the function no-ops, with an explicit comment saying so ("populateReviewTab needs pendingRecommendations set; just let it no-op via DOM"). So the claim in the fix summary — "the file's own header comment says populateReviewTab is orchestration-heavy and not directly unit tested" — is **verifiably true**, not a convenient excuse.
- Ran both suites together to confirm both pass as-is: `npx vitest run tests/js/master-cv.test.js tests/js/finalise.test.js tests/js/rewrite-review.test.js tests/js/review-table-base.test.js` → 222 passed, 0 failed.

**My opinion on whether this gap is acceptable:** partially, but I would not let it stand indefinitely. The `rewrite-review.js` side proves that a one-line assertion against `document.getElementById('document-content').textContent` is cheap to add and does not require unwinding the "orchestration-heavy" concerns that justify skipping broader `populateReviewTab` coverage — a test could set `window.pendingRecommendations` and `customizations` to any truthy stub, call `populateReviewTab('experiences')`, and assert the note text appears, without needing to test the rest of the orchestration. Its absence is a real, avoidable asymmetry between the two halves of this fix, even though it's a text-only UI change with low regression risk. I'd flag this for a quick follow-up rather than block sign-off on it.

### GAP-384 / GAP-389 regression check (prior cycle)

- Re-ran the full relevant test surface: `tests/js/master-cv.test.js`, `tests/js/finalise.test.js`, `tests/js/rewrite-review.test.js`, `tests/js/review-table-base.test.js` — **222 passed, 0 failed**.
- `grep -rn "_focusedElementBeforeModal" web/` — zero hits repo-wide; GAP-384's shared `_focusStack`/`pushFocusStack`/`restoreFocus` pattern (`web/ui-core.js`) has not been reverted or forked.
- Re-read `web/finalise.js:356-415` (`showHarvestSection()`) in full: still only fetches a count from `/api/harvest/candidates` and renders a count + "Review & Update Master CV →" link into `#harvest-section`; no checkbox markup, no `harvest-chk-*`/`harvest-apply-btn` ids, no direct call to `/api/harvest/apply` — GAP-389's dedup is intact.
- **No regression found in either GAP-384 or GAP-389.**

---

### US-M1: Session-Only Customization Boundary

| # | Criterion (abbreviated) | Status | Notes / File:Line |
|---|--------------------------|--------|--------------------|
| 1 | Workflow distinguishes session editing from master-data maintenance | ✅ Pass | `scripts/utils/session_data_view.py:7` docstring: "Read-only view that overlays session state onto master CV data." `scripts/utils/conversation_manager.py:120-125` explicitly comments session-only state fields. Enforced at the route layer via `_require_master_data_write_phase()` (`scripts/routes/master_data_routes.py:208-221`). |
| 2 | UI does not imply temporary edits already updated the master record | ✅ Pass (upgraded from ⚠️ Partial — GAP-394 fix) | `web/review-table-base.js:743-745` (Customisations, experiences pane) and `web/rewrite-review.js:291-293` (Rewrite Review) now both carry an explicit "this application only... Update Master CV" reminder. The Master CV tab's phase-lock banner (`master-cv.js:102-110`) remains as a second, complementary reminder for that surface. Minor residual gap: a user who reconnects or navigates directly to a later Customisations sub-tab (skills/achievements/summary/publications) without visiting the experiences sub-tab first still won't see the note in that session — see Additional Story Gaps. |
| 3 | Durable write-back occurs only through explicit user action | ✅ Pass | `harvest_apply()` (`scripts/routes/generation_routes.py:2328-2349`) requires an explicit POST with named `selected_ids`. Client requires `showConfirmModal` before the POST fires (`web/harvest.js:482-489`). |

---

### US-M2: Harvest Review Quality

| # | Criterion (abbreviated) | Status | Notes / File:Line |
|---|--------------------------|--------|--------------------|
| 1 | Harvest candidates presented in reviewable form | ✅ Pass | `renderHarvestTabHtml()` (`web/harvest.js:262`) groups candidates by type → recommendation → confidence. |
| 2 | Each candidate indicates what would be added/changed | ✅ Pass | `renderCandidateRow()` (`web/harvest.js:140`) → `renderProposalRow()` (`web/proposal-review.js`) renders explicit Before/After content per candidate. |
| 3 | Applying harvested changes is optional and selective | ✅ Pass | `shouldPreCheck()` (`harvest.js:99-101`) always returns `false`. `applyHarvestSelections()` (line 471-472) only submits checked items; backend only writes named `selected_ids`. |

---

### US-M3: Boundary Clarity Across Final Stages

| # | Criterion | Status | Notes / File:Line |
|---|-----------|--------|--------------------|
| 1 | Finalise/archive and harvest/apply appear as distinct steps with distinct consequences | ✅ Pass | Separate tabs, endpoints, and phase gates; `finalise.js:342` calls `showHarvestSection()`, which only shows a count + navigation button, not an inline apply table (GAP-389, re-confirmed this cycle). |

---

### US-M4: Maintain the Master Publications Bibliography

| # | Acceptance Criterion | Status | Notes / File:Line |
|---|-----------------------|--------|--------------------|
| 1 | Reviewable list view with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList()` (`web/master-cv.js:1213-1289`). |
| 2 | Add/edit/delete publication entries from Master CV surface | ✅ Pass | `showAddPublicationModal()`/`editMasterPublication()`/`saveMasterPublication()` → `POST /api/master-data/publication`. |
| 3 | Import raw BibTeX + review validation errors | ✅ Pass | `showImportPublicationsModal()`/`importPublicationsBib()` → `POST /api/master-data/publications/import`. |
| 4 | Paste citation text, review generated BibTeX, decide to import | ✅ Pass | `showConvertPublicationsModal()`/`convertPublicationText()` → `POST /api/master-data/publications/convert` (preview, no persistence). |
| 5 | Flags missing key fields (title/authors/year) | ✅ Pass | `master_data_routes.py:1874-1879` and bulk-import per-entry `missing_fields` check. |
| 6 | Writes only from `init`/`refinement` windows | ✅ Pass | `_require_master_data_write_phase()` gates all publication write routes. |
| 7 | Round-trip editing preserves unrelated fields | ✅ Pass | `_entry_to_publication()`/`serialize_bibtex_entry()` (`scripts/utils/bibtex_parser.py`) denylist only bibtexparser's own reserved keys. |

(US-M2/M3/M4 rows re-verified this cycle as not-regressed; not re-derived from scratch line-by-line since this cycle's change did not touch those code paths, aside from confirming their tests still pass.)

---

## Generated Materials Evaluation

N/A — this persona's scope (Master CV data maintenance) does not itself produce generated CV/cover-letter output artifacts. The GAP-394 fix is a UI-copy-only change to two review screens and has no generated-materials surface.

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-394 review-table-base.js side has no dedicated regression test (new, minor).** `tests/js/rewrite-review.test.js:347-351` tests the rewrite-panel note directly; `tests/js/review-table-base.test.js` has no equivalent assertion, and its test setup actively avoids exercising `populateReviewTab`'s render path (`pendingRecommendations = null` at line 348, with an explicit "let it no-op" comment at line 350). Recommend adding one small test that stubs `pendingRecommendations`/`customizations` truthy, calls `populateReviewTab('experiences')`, and asserts the note text is present — mirroring the existing rewrite-review.js test at low cost.

2. **Session-scope note is invisible if a user's session skips the experiences sub-tab (new, minor).** `web/state-manager.js:429-430` restores a persisted `currentTab` on reconnect, and the `skills-review`/`achievements-review`/`summary-review`/`publications-review` sub-tab buttons (`web/index.html:220-226`) are independently reachable once unlocked. A user who reconnects with, or navigates directly to, one of those later sub-tabs without visiting `exp-review` first in that session will never see the reminder. Recommend either (a) adding the same note (or a shorter variant) to the shared `navHtml`/wrapper so it appears regardless of which sub-tab loads first, or (b) explicitly accepting this as a known limitation in the story text if the "first sub-tab shown" assumption is judged good enough in practice.

3. **Pre-existing, out-of-scope: GAP-43 duplicate `_save_master` still open.** Confirmed `_save_master` is still defined independently in both `scripts/web_app.py:1199` and `scripts/routes/master_data_routes.py:46` (also documented and allowlisted in `scripts/lint_duplicate_definitions.py:93-100`). This is unrelated to and unaffected by the GAP-394 fix cycle — noting only because this persona's CLAUDE.md explicitly calls it out as still needing consolidation, so it doesn't get lost.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/review-table-base.js, web/rewrite-review.js, web/master-cv.js, web/harvest.js (plus, for cross-referenced evidence: web/finalise.js, web/workflow-steps.js, tests/js/rewrite-review.test.js, tests/js/review-table-base.test.js, tests/js/master-cv.test.js, tests/js/finalise.test.js, scripts/lint_duplicate_definitions.py)

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-M1 | 3 | 0 | 0 | 0 | 0 |
| US-M2 | 3 | 0 | 0 | 0 | 0 |
| US-M3 | 1 | 0 | 0 | 0 | 0 |
| US-M4 | 7 | 0 | 0 | 0 | 0 |

**Key evidence references:**

- GAP-394 (session-scope reminder): review-table-base.js note → web/review-table-base.js:722-796 (function), :740-745 (note text); rewrite-review.js note → web/rewrite-review.js:221-345 (function), :291-293 (note text); destination label verified live → web/workflow-steps.js:50,972.
- GAP-394 test asymmetry: has test → tests/js/rewrite-review.test.js:347-351; lacks test (confirmed by design, not oversight-only) → tests/js/review-table-base.test.js:7-14 (header comment), :342-351 (no-op setup).
- GAP-394 every-visit re-render: web/review-table-base.js:214-283 (switchTab, unconditional loadTabContent call at :282), :353-355 (exp-review case), :377-396 (rewrite case).
- GAP-384/GAP-389 regression check: zero `_focusedElementBeforeModal` refs repo-wide; web/finalise.js:356-415 unchanged dedup pattern; 222/222 tests passing across master-cv.test.js, finalise.test.js, rewrite-review.test.js, review-table-base.test.js.
- US-M1: session/master overlay architecture → scripts/utils/session_data_view.py:7; phase gate → scripts/routes/master_data_routes.py:208-221.
- Pre-existing GAP-43 (out of scope): scripts/web_app.py:1199, scripts/routes/master_data_routes.py:46, scripts/lint_duplicate_definitions.py:93-100.

**Evidence standard:** every conclusion above is supported by a repository-relative file path plus line number(s), independently re-derived by reading the current source rather than trusting the summary provided at task start or any prior gap/review document.
