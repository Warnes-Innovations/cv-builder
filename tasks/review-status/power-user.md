<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power User Review Status

**Last Updated:** 2026-06-22 21:30 ET

**Executive Summary:** The power-user story is substantially met for session management (US-W2) and backend iteration support (US-W3 context preservation). High-throughput workflow (US-W1) and iteration discoverability (US-W3.1/W3.3) remain partially satisfied. Two commits since Cycle 5 closed Gap B (↻ re-run button is now a real `<button>` visible on focus, not just hover) and Gap F (rewrite decisions now persist across page reload). Three gaps remain open: no keyboard shortcut for primary action buttons (Gap A), no session text search (Gap C), and no changed-item count after re-run (Gap D). A legacy undo gap (Gap E) remains unchanged.

---

## What Changed Since Cycle 5

Two commits landed after the Cycle 5 review date (2026-06-20) that affect this persona:

- **commit `3057ea8`** (GAP-167–173): Converted `.step-rerun` from `<span>` to `<button aria-label="Re-run …">` in `workflow-steps.js:705`. Added `.step.completed:focus-within .step-rerun { opacity: 1 !important; }` so the ↻ button becomes visible when the parent step pill has focus. Added `:focus-visible` outline to `.step-rerun`. This **closes Gap B** from Cycle 5 — keyboard users can now Tab to a completed step pill, see the ↻ appear, and activate it. Also renamed `#spell-btn` CTA label from "Done — Generate CV →" to "Generate Preview →" (GAP-169, `index.html:186`), fixing a misleading label.

- **commit `f2f5a0b`** (GAP-166): Rewrite decisions now persist to `localStorage` keyed by session ID after every accept/reject/edit action and are restored in `renderRewritePanel()`. Key is cleared after final submission. This **closes Gap F** (regression path where page reload lost rewrite decisions mid-review).

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

**As a** power user, **I want to** move through common review tasks quickly so repeated use across many jobs does not become tedious.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W1.1 | Frequent actions available without excessive pointer travel | ⚠️ Partial | Primary action buttons (Analyze, Continue, Accept All, etc.) live at the bottom of the chat panel (`index.html:182–191`). Tab bar navigates via Arrow/Home/End (`ui-core.js:516–541`). Workflow step pills are keyboard-reachable via `Enter`/`Space` (`ui-core.js:1917–1931`). No global keyboard shortcut triggers the currently visible primary action button. `app.js:116–118` binds `Enter` only to message-send; no `Ctrl+Enter` equivalent exists. |
| W1.2 | Repetitive review work supports efficient sequential progression | ✅ Pass | `acceptAllRewrites()` / `rejectAllRewrites()` in `rewrite-review.js`; `bulkAction()` in `review-table-base.js:708`; bulk toolbars in `experience-review.js`, `skills-review.js`, `achievements-review.js`. DataTable filter restricts bulk actions to visible rows. |
| W1.3 | Multi-item review screens avoid unnecessary navigation churn | ✅ Pass | DataTable-backed review tables allow scanning and acting on all items in a single view. Rewrite cards rendered in a scrollable panel. Inline tally counters. No page-per-item navigation required. |

**Failure modes guard-against check:**

- **Repeated clicks across distant controls:** Step pills are keyboard-reachable. The primary action button (bottom of chat) still requires pointer or Tab-through-all-focusables. No shortcut key. Gap A remains open.
- **No efficient path through large review sets:** DataTable filter + bulk actions cover this adequately.

**Net: W1.1 partially satisfied, W1.2 and W1.3 pass.**

---

### US-W2: Session Switching and Multi-Application Management

**As a** power user, **I want to** move between multiple sessions safely and efficiently so I can manage several applications in parallel.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W2.1 | Sessions easy to distinguish in the session-switching UI | ✅ Pass | Sessions modal renders a sortable table (Name, Status pill, Phase, Last Modified). Recents strip shows up to 5 most recently modified sessions. Status pills use color-coded CSS classes (`.session-status-current`, `.session-status-saved`, etc., `styles.css:210–215`). Sessions modal initial focus now lands correctly inside the modal after GAP-168 fix (`session-switcher-ui.js:458`). |
| W2.2 | Creating, opening, or renaming sessions does not create ambiguity about which is active | ✅ Pass | Current-tab row styled `sm-tr-current` with disabled "Current" indicator, not a clickable load link. Header sub-label `#header-session-name` (`index.html:41`) shows current session. Ownership-conflict dialog on 409 prevents silent multi-tab collisions (`ui-core.js:449–465`). Inline rename replaces title in place without navigating away (`session-manager.js:759–818`). |
| W2.3 | Active session context remains visible while working | ✅ Pass | Three independent persistent signals: (1) `#position-title` / `#position-company` in position bar (`index.html:75–80`); (2) `#header-session-name` sub-label under app title (`index.html:41`); (3) Sessions button label via `buildSessionSwitcherLabel()`. All visible throughout the workflow without modal interaction. |

**Failure modes guard-against check:**

- **Rapid context switching without losing orientation:** Sessions modal is always accessible from the header. No preview of a session's content before loading. No text-search filter — with 20+ saved sessions a power user still cannot locate by partial job title. Gap C remains open.
- **Currently active session identifiable throughout:** Three signals are robust and persistent.

**Net: W2 fully satisfied for all stated acceptance criteria. Session-search gap (C) is a scale limitation, not a story failure.**

---

### US-W3: Efficient Iteration

**As a** power user, **I want to** revisit and rerun stages with minimal friction so refinement loops remain practical instead of costly.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W3.1 | Re-run affordances are discoverable for supported stages | ⚠️ Partial | **Improved in this cycle.** The ↻ re-run button is now a real `<button class="step-rerun" aria-label="Re-run …">` (GAP-167, `workflow-steps.js:705`). The injected style `.step.completed:focus-within .step-rerun { opacity: 1 !important; }` makes it visible when the step pill has keyboard focus (`workflow-steps.js:737`). `:focus-visible` adds a blue ring directly on the ↻ button. A keyboard user can now Tab to a completed step pill, see ↻ appear, Tab once more to reach it, and press Enter. However, the ↻ button is **still hidden at `opacity:0` by default** (`workflow-steps.js:706, style="...opacity:0..."`), surfacing only on hover or parent-focus — it is not visible at a glance without interaction. |
| W3.2 | Re-entry into earlier stages preserves useful downstream context | ✅ Pass | `conversation_manager.py:_build_downstream_context()` (`line 1392`) collects approved rewrites, experience/skill decisions, and accepted spell fixes, injecting them into the re-run LLM prompt. `back_to_phase()` (`line 1435`) marks downstream steps stale without erasing content. `re_run_phase()` (`line 1470`) passes context to the new LLM call. Backend support is comprehensive. |
| W3.3 | The app minimises redundant work during iteration | ⚠️ Partial | `_highlightChangedItems()` (`workflow-steps.js:332–380`) marks changed rewrite cards and experience/skill table rows. GAP-166 (commit `f2f5a0b`) ensures rewrite decisions survive page reload. However, the assistant message after re-run (`workflow-steps.js:294`) still does not surface a count — "changed items are highlighted" with no quantity. No "show only changed" filter. |

**Failure modes guard-against check:**

- **Reruns feel equivalent to starting over:** Substantially mitigated. Confirmation modal (`workflow-steps.js:138–188`) lists which downstream stages remain intact. Stale badges appear on downstream steps. Downstream context passes into the LLM prompt.
- **Re-run affordance keyboard accessibility:** Gap B is now **closed**. The ↻ button is a focusable `<button>` visible on step-pill focus. Activating it raises the confirmation modal with its own focus trap. This is a meaningful improvement over Cycle 5.

**Net: W3.2 passes fully. W3.1 and W3.3 are partial — discoverability is better but ↻ is still hidden-by-default, and changed-item count is absent.**

---

## Generated Materials Evaluation

Assessment based on source code reading of generation and download paths.

| Criterion | Status | Notes |
|-----------|--------|-------|
| Files clearly labelled by format and purpose | ✅ Pass | `download-tab.js`: each file gets a format icon and descriptive label ("ATS-optimised DOCX", "Human-readable PDF", etc.). |
| Page-count advisory surfaced | ✅ Pass | `download-tab.js`: page count badge with amber warning when outside the 1–3 page range. |
| ATS validation report accessible | ✅ Pass | "ATS Report" button in position bar (`index.html:102–103`), visible after job analysis. Dedicated `tab-ats-score` tab. |
| Post-layout steps addressable without restart | ✅ Pass | Post-layout steps unlock simultaneously after layout confirmation (`ui-core.js:1954–1962`, `updateWorkflowStepsClickable()`). |
| File quality feedback beyond download links | ✅ Pass | `download-tab.js`: ATS validation checks table with per-check pass/fail; page count advisory; persuasion-check warnings. |
| Harvest path for improvements to Master CV | ✅ Pass | `step-harvest` / `tab-harvest` in workflow bar, unlocks after layout confirmation. |
| Rewrite decisions survive page reload | ✅ Pass | **New since Cycle 5.** GAP-166 persists decisions to `localStorage` keyed by session ID (`rewrite-review.js`). Restored on panel render; cleared after final submission. |

**Remaining concern:** No "quick re-generate with unchanged layout" affordance from the File Review tab. Minor content edits (e.g., fixing a bullet) still require navigating back to Analysis or Customise via the re-run path. The path exists but requires 3–4 interactions from the download view.

---

## Additional Story Gaps / Proposed Story Items

### Gap A (Open) — No keyboard shortcuts for primary workflow action buttons (W1.1)

The keyboard bindings in the primary flow are: `Enter` sends message (`ui-core.js:547–554`), `Escape` closes modals (`ui-core.js:558–561`), Arrow/Home/End navigate the tab bar (`ui-core.js:516–541`), and `Enter`/`Space` activate focused workflow step pills (`ui-core.js:1917–1931`). There is no shortcut to trigger the visible primary action button (Analyze, Continue, Accept All). A power user processing many applications per week must still use a pointer to advance each phase.

**Proposed:** `Ctrl+Enter` triggers the currently visible primary action button. `Ctrl+Shift+A` triggers Accept All Recommended in bulk-action review contexts.

---

### Gap B (CLOSED since Cycle 6) — Re-run ↻ button keyboard accessible

GAP-167 (commit `3057ea8`) converted `.step-rerun` from a `<span>` to a `<button>` with `aria-label`. The injected CSS makes ↻ visible when the parent step has keyboard focus (`:focus-within`). The button has its own `:focus-visible` ring. A keyboard-only user can now reach and activate the re-run button without a pointer. The button is still **hidden by default** (`opacity:0`, `workflow-steps.js:706`) — it only appears on hover or parent-focus — but keyboard reachability is now confirmed.

**Residual concern:** At-a-glance discoverability is still weak — a new power user unaware of the hover/focus reveal may not discover the re-run feature without a pointer or accidental Tab traversal. Consider always-visible ↻ at reduced opacity on completed steps.

---

### Gap C (Open) — No session search/filter in the sessions modal (W2.1 at scale)

The sessions modal has sortable columns and a Recents strip but no text search input (`session-switcher-ui.js` — no `<input>` for filtering). With many sessions, a power user cannot locate a session by partial job title or company name without scrolling. The `/api/sessions` endpoint returns up to 20 sessions (`session_routes.py:144`).

**Proposed:** Add a text search input above the sessions table that filters rows client-side by name, phase, or company name.

---

### Gap D (Open) — No changed-item count summary after re-run (W3.3)

After `reRunPhase()` completes, the assistant message (`workflow-steps.js:294`) says "changed items are highlighted" without a count. The diff logic in `_highlightChangedItems()` (`workflow-steps.js:332–380`) computes the changed set, but that count is never surfaced in the UI.

**Proposed:** Append a count to the assistant message: e.g., "3 of 12 experience recommendations changed — highlighted in the table."

---

### Gap E (Open) — No undo for bulk review-table decisions (W1.1, W3.3)

Layout instructions have an undo stack (`layout-instruction.js`), but experience/skill/achievement/rewrite decisions cannot be undone individually or in bulk after applying. A bulk-accept followed by a misclick requires re-running the phase to reset.

**Proposed:** Single-level undo for the last bulk action on a review table — store a pre-bulk state snapshot in `localStorage` and restore it on `Ctrl+Z` or an Undo button.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | ------- | ---------- | ------ | ---------- | ----- |
| US-W1 (3 criteria) | 2 | 1 | 0 | 0 | 0 |
| US-W2 (3 criteria) | 3 | 0 | 0 | 0 | 0 |
| US-W3 (3 criteria) | 1 | 2 | 0 | 0 | 0 |
| Generated Materials (7 criteria) | 7 | 0 | 0 | 0 | 0 |

**Key evidence references:**

- W1.1: primary action buttons pointer-only → `web/index.html:182–191`, `web/app.js:116–118`
- W1.2: bulk actions → `web/review-table-base.js:708`, `web/rewrite-review.js`
- W1.3: DataTable reviews → `web/experience-review.js`, `web/skills-review.js`
- W2.1: session modal table + recents → `web/session-switcher-ui.js:445–492`; status pill CSS → `web/styles.css:210–215`
- W2.2: current-row indicator, conflict detection → `web/session-manager.js:759–818`, `web/ui-core.js:449–465`
- W2.3: three active-session signals → `web/index.html:41,75–80`, `web/session-manager.js`
- W3.1: ↻ button now `<button>` with focus-within visibility → `web/workflow-steps.js:705,737`; step pill keyboard nav → `web/ui-core.js:1917–1931`
- W3.2: downstream context preservation → `scripts/utils/conversation_manager.py:1392,1435,1470`
- W3.3: highlight logic exists, count absent → `web/workflow-steps.js:294,332–380`
- Gap A (open): no primary-action shortcut → `web/ui-core.js:547–561`
- Gap B (closed): GAP-167 commit `3057ea8` → `web/workflow-steps.js:705,737`
- Gap C (open): no search input → `web/session-switcher-ui.js` (no filter element)
- Gap D (open): count not surfaced → `web/workflow-steps.js:294`
- Gap E (open): no bulk-decision undo → `web/rewrite-review.js`, `web/review-table-base.js`
- GAP-166 closed: rewrite decision persistence → `web/rewrite-review.js` (commit `f2f5a0b`)
- GAP-169 label fix: spell-check CTA relabelled "Generate Preview →" → `web/index.html:186`

**Evidence standard:** Every conclusion is independently verifiable from the cited source files. No runtime testing was performed — assessment is based on source code only.
