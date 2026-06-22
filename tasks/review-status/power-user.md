<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power-User Review — Cycle 5

**Reviewer:** Power-user persona agent
**Date:** 2026-06-20
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

---

## What Changed Since Cycle 4

Two commits landed since the Cycle 4 review that are relevant to this persona:

- **GAP-72** (commit `6ad34fa`): `updateWorkflowStepsClickable()` in `ui-core.js:1917–1931` now adds `role="button"`, `tabindex="0"`, and an `Enter`/`Space` `keydown` handler when a workflow step becomes clickable, and removes them (`tabindex="-1"`, no role) when the step becomes inert. The initial `step-job` element already has `tabindex="0"` in `index.html:119`. This partially addresses **Gap B** from Cycle 4 — keyboard users can now navigate and trigger workflow step pills.
- **GAP-155–165** (commit `1c05811`): Accessibility and UX cleanups (warning toast styling, aria-label improvements, semantic landmarks, Master CV modal focus trap). None of these directly address the remaining power-user gaps (keyboard shortcuts for primary action buttons, session text search, changed-item count summary, undo for bulk review actions).

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W1.1 | Frequent actions available without excessive pointer travel | ⚠️ Partial | Primary action buttons (Analyze, Continue, etc.) remain at bottom of chat panel (`index.html:182–191`). No keyboard shortcut triggers the visible primary action. Workflow step pills are now keyboard-accessible via `Enter`/`Space` (`ui-core.js:1917–1931`, `6ad34fa`), which partially reduces inter-phase pointer travel. |
| W1.2 | Repetitive review work supports efficient sequential progression | ✅ Pass | `acceptAllRewrites()` / `rejectAllRewrites()` in `rewrite-review.js`; `bulkAction()` in `review-table-base.js:708`; bulk toolbars in `experience-review.js`, `skills-review.js`, `achievements-review.js`. These remain unchanged and functional. |
| W1.3 | Multi-item review screens avoid unnecessary navigation churn | ✅ Pass | DataTable-backed review tables let users scan and act on all items in one view. Rewrite cards are on a single scrollable panel. Tally counters visible inline. |

**Failure modes guard-against check:**

- **Repeated clicks across distant controls:** Workflow step pills are now keyboard-navigable (`ui-core.js:1917–1931`), reducing one pointer-travel requirement. However, the **primary action buttons** (Analyze Job, Continue to Spell Check, etc.) at `index.html:182–191` still have no keyboard shortcut — a user must reach for the pointer to advance each phase. `app.js:116–118` only binds `Enter` for message-send; no `Ctrl+Enter` or equivalent triggers the visible primary action button.
- **No efficient path through large review sets:** DataTable filter plus bulk actions cover this. `bulkAction()` scopes to filtered rows. Positive.

**Net: W1 partially satisfied.** Step-pill keyboard nav is new since Cycle 4 and improves the inter-phase path. The primary action button gap (pointer-only) remains.

---

### US-W2: Session Switching and Multi-Application Management

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W2.1 | Sessions easy to distinguish in the session-switching UI | ✅ Pass | Sessions modal renders a sortable table with Name, Status pill, Phase, and Last Modified. Recents strip shows the 5 most recently modified sessions (`session-switcher-ui.js`). Status pills use color classes. Confirmed unchanged in this cycle. |
| W2.2 | Creating, opening, or renaming sessions does not create ambiguity about which is active | ✅ Pass | Current-tab session row is styled `sm-tr-current` with a disabled "Current" button rather than a load affordance. Header label `#header-session-name` reads "Current session: name". Ownership-conflict dialog and 409-conflict amber banner prevent silent multi-tab collisions (`ui-core.js:449–465`). |
| W2.3 | Active session context remains visible while working | ✅ Pass | Position bar row shows `#position-title` and `#position-company` persistently (`index.html:72–82`). Header subtitle `#header-session-name` shows current session name (`index.html:41`). Session switcher button label reflects active session via `buildSessionSwitcherLabel()` in `session-manager.js`. Three independent persistent signals. |

**Failure modes guard-against check:**

- **Rapid context switching without losing orientation:** Sessions modal opens from the header at any time. However, switching still navigates the current tab (no preview). No session text-search filter has been added. With 20+ saved sessions a power user still cannot locate a session by partial name without scrolling.
- **Currently active session identifiable:** Definitively yes — three signals remain strong and unchanged.

**Net: W2 mostly satisfied.** Active-session signals are robust. Absent-session-search and no-preview-before-switch gaps remain as they were in Cycle 4.

---

### US-W3: Efficient Iteration

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W3.1 | Re-run affordances are discoverable for supported stages | ⚠️ Partial | **Partially improved since Cycle 4.** Workflow step pills now support keyboard navigation (`ui-core.js:1917–1931`). A keyboard user can focus a completed step pill and press `Enter` to trigger back-navigation. However the ↻ icon itself (`workflow-steps.js:704–706`) remains `opacity:0` until CSS `:hover` (`workflow-steps.js:723`), so re-run is still not discoverable at a glance or from keyboard-only paths. |
| W3.2 | Re-entry into earlier stages preserves useful downstream context | ✅ Pass | `conversation_manager.py:_build_downstream_context()` collects approved rewrites, experience/skill decisions, accepted spell fixes, and injects them into the LLM prompt. `back_to_phase()` marks downstream steps stale but does not erase them. `re_run_phase()` passes this context into the new LLM call. Unchanged and verified. |
| W3.3 | The app minimises redundant work during iteration | ⚠️ Partial | `_highlightChangedItems()` (`workflow-steps.js:332–380`) marks changed rewrite cards and experience/skill table rows after a re-run. The assistant message at `workflow-steps.js:294` says "changed items are highlighted" but **still does not say how many**. No "show only changed" filter. Unchanged from Cycle 4. |

**Failure modes guard-against check:**

- **Reruns feel equivalent to starting over:** Significantly mitigated. Confirmation modal names which downstream stages remain intact, downstream context is preserved in the LLM prompt, and stale pills flag "may be outdated" without erasing prior decisions.
- **Re-run affordance not keyboard-accessible:** GAP-72 (commit `6ad34fa`) fixed workflow step pill keyboard activation. A user can now press `Enter` on a completed step pill to click it, which in turn fires `confirmReRunPhase()` via the step's `onclick`. This is a meaningful improvement over Cycle 4. The ↻ icon itself (a nested `<span>` with `onclick`) is not independently focusable but the parent pill's keyboard handler propagates to it.

**Net: W3 partially satisfied.** Backend iteration support remains excellent. Step-pill keyboard nav is new in this cycle and improves W3.1 discoverability. The changed-item count summary (W3.3) and hover-only ↻ icon remain unaddressed.

---

## Generated Materials Evaluation

Source-code-based assessment (no runtime session). Observations based on the code path for generated files:

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Files clearly labelled by format and purpose | ✅ Pass | `download-tab.js`: each file gets an icon and description string (e.g., "ATS-optimised PDF"). Unchanged. |
| Page-count advisory surfaced to power user | ✅ Pass | `download-tab.js`: page count badge with amber warning when outside 1.5–3 page range. Unchanged. |
| ATS validation report accessible | ✅ Pass | `index.html:102–103`: "ATS Report" button in position bar, appears after analysis. Dedicated `tab-ats-score` tab. Unchanged. |
| Post-layout steps addressable without starting over | ✅ Pass | Post-layout steps unlock simultaneously once layout is confirmed (`ui-core.js:1880–1963` `updateWorkflowStepsClickable()`). Unchanged. |
| Files output quality feedback (not just download links) | ✅ Pass | `download-tab.js`: ATS validation checks table with per-check pass/fail; page count advisory; persuasion-check in same tab. Unchanged. |
| Harvest path for improvements back to Master CV | ✅ Pass | `step-harvest` / `tab-harvest` in workflow bar, unlocks after layout confirmation. Unchanged. |

**Key power-user concern for generated materials:** No "quick re-generate with unchanged layout" button remains absent from the File Review tab. Minor content edits still require navigating back via the re-run path from Analysis or Customise. The path exists but is not a one-click shortcut from the download area.

---

## Updated Gap Status (vs. Cycle 4)

| Gap | Description | Cycle 4 Status | Cycle 5 Status | Change |
| --- | ----------- | -------------- | -------------- | ------ |
| Gap A | No keyboard shortcuts for primary workflow action buttons (W1.1) | Open | Open | No change |
| Gap B | Re-run ↻ affordance hover-only; step-pill not keyboard-accessible (W3.1) | Open | Partially Closed | Step pills now keyboard-accessible via `Enter`/`Space` (GAP-72, `ui-core.js:1917–1931`). ↻ icon itself still opacity:0 until hover. |
| Gap C | No session text search/filter in sessions modal (W2.1 at scale) | Open | Open | No change |
| Gap D | No changed-item count summary after re-run (W3.3) | Open | Open | No change |
| Gap E | No undo for bulk review-table decisions (W1.1, W3.3) | Open | Open | No change |

---

## Additional Story Gaps / Proposed Story Items

### Gap A — No keyboard shortcuts for primary workflow actions (W1.1)
The only keyboard bindings in the primary flow are: `Enter` sends message (`ui-core.js:547–554`), `Escape` closes modals (`ui-core.js:558–561`), Arrow/Home/End navigate the tab bar (`ui-core.js:516–541`), and `Enter`/`Space` activate focused workflow step pills (`ui-core.js:1917–1931`). There is no shortcut to trigger the current **primary action button** (Analyze, Continue, Accept All, etc.). A power user processing many applications per week must reach for the pointer to advance each phase.

**Proposed:** Add `Ctrl+Enter` to trigger the visible primary action button; `Ctrl+Shift+A` for Accept All Recommended in bulk-action contexts.

### Gap B — Re-run ↻ icon not discoverable at a glance (W3.1) — Partial
The ↻ icon on completed steps starts at `opacity:0` and is only revealed via CSS `:hover` (`workflow-steps.js:704–706`, `workflow-steps.js:723`). Step pills themselves are now keyboard-reachable (GAP-72), but the ↻ child span is not independently focusable. A user who prefers keyboard-only workflows can back-navigate to a completed step via `Enter`, which eventually triggers the re-run confirmation path, but must discover this by exploring.

**Proposed:** Either permanently show the ↻ icon at reduced opacity on completed steps, or expose it as a keyboard-focusable button with its own `tabindex`.

### Gap C — No session search/filter in the sessions modal (W2.1 at scale)
The session modal has sortable columns and a Recents strip but no text search input. With 20+ saved sessions, a power user cannot quickly locate a session by partial job title or company name. Session-switcher-ui.js contains no search input element or filter logic.

**Proposed:** Add a search input above the sessions table that filters rows client-side by name, phase, or company.

### Gap D — No changed-item count summary after re-run (W3.3)
After `reRunPhase()` completes, the assistant message (`workflow-steps.js:294`) says "changed items are highlighted" but does not say how many. The diff logic in `_highlightChangedItems()` computes the changed set but the count is never surfaced.

**Proposed:** Surface a count in the assistant message: e.g., "3 of 12 items changed — highlighted below."

### Gap E — No undo for bulk review-table decisions (W1.1, W3.3)
Layout instructions have an undo stack (`layout-instruction.js`), but experience/skill/achievement/rewrite decisions cannot be individually undone. Bulk-accept followed by one misclick requires re-running the phase to reset.

**Proposed:** Implement a single-level undo for the last bulk-action applied to a review table (store the pre-bulk state snapshot and restore on undo).

---

## Evidence Summary

| Feature | Implemented | Source Location |
| ------- | ----------- | --------------- |
| Bulk accept/reject rewrites | Yes | `rewrite-review.js` |
| Bulk experience/skill/achievement actions | Yes | `review-table-base.js:708`, `experience-review.js`, `skills-review.js`, `achievements-review.js` |
| Phase re-run with downstream context | Yes | `workflow-steps.js:276–319`, `conversation_manager.py` |
| Back-to-phase with stale flagging | Yes | `workflow-steps.js:98–128`, `conversation_manager.py` |
| Re-run highlight of changed items | Yes (no count) | `workflow-steps.js:332–380`, `_highlightChangedItems()` |
| Session modal with sortable columns | Yes | `session-switcher-ui.js` |
| Recents strip in session modal | Yes | `session-switcher-ui.js` |
| Active session persistent display (3 signals) | Yes | `session-manager.js`, `session-switcher-ui.js`, `index.html:41` |
| Session rename — current session (inline) | Yes | `session-manager.js` |
| Session rename — saved sessions (modal) | Yes | `session-switcher-ui.js` |
| Ownership conflict detection + resolution | Yes | `session-switcher-ui.js`, `ui-core.js:449–465` |
| Keyboard: workflow step pills (Enter/Space) | **New — Yes** | `ui-core.js:1917–1931` (GAP-72, commit `6ad34fa`) |
| Keyboard: tab bar navigation (Arrow/Home/End) | Yes | `ui-core.js:516–541` |
| Keyboard: Enter to send message | Yes | `ui-core.js:547–554` |
| Keyboard: Escape closes modals | Yes | `ui-core.js:558–561` |
| Keyboard: global workflow action shortcuts | **No** | Not implemented |
| Re-run ↻ icon always-visible (not hover-only) | **No** | `workflow-steps.js:706,723` — opacity:0 until hover |
| Session text search/filter | **No** | Not implemented |
| Changed-item count summary after re-run | **No** | Not implemented |
| Undo for bulk review-table decisions | **No** | Not implemented |
