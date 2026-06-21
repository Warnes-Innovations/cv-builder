<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power-User Review — Cycle 4
**Reviewer:** Power-user persona agent
**Date:** 2026-06-18 ~19:00 ET
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/session-switcher-ui.js, web/session-manager.js, web/workflow-steps.js, web/rewrite-review.js, web/review-table-base.js, web/experience-review.js, web/achievements-review.js, web/skills-review.js, web/download-tab.js

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W1.1 | Frequent actions available without excessive pointer travel | ⚠️ Partial | Primary action buttons (Analyze, Continue, etc.) are grouped at the bottom of the chat panel — reachable but no keyboard shortcut to trigger them directly. |
| W1.2 | Repetitive review work supports efficient sequential progression | ✅ Pass | `acceptAllRewrites()` / `rejectAllRewrites()` in `rewrite-review.js:449–464`; `bulkAction()` for experiences/skills in `review-table-base.js:708`; bulk toolbar with "Accept All Recommended / Emphasize All / Include All / Exclude All" in `experience-review.js:242–248`, `skills-review.js:942–948`, `achievements-review.js:306–312`. |
| W1.3 | Multi-item review screens avoid unnecessary navigation churn | ✅ Pass | DataTable-backed review tables (`experience-review.js`, `skills-review.js`) let users scan and act on all items in one view. Rewrite cards are all on one scrollable panel (`rewrite-review.js`). Tally counters (accepted/rejected) are visible inline (`rewrite-review.js:131–132`). |

**Failure modes guard-against check:**

- **Repeated clicks across distant controls:** The "Accept All Recommended" / "Accept All" / "Reject All" bulk buttons directly address this for the three heaviest review phases (experiences, skills, rewrites). However, there is no keyboard shortcut to trigger the active primary action button (e.g. `Alt+Enter` to proceed to the next phase). A power user who works through many applications per week must still move to the pointer to advance between phases.
- **No efficient path through large review sets:** The DataTable filter row plus bulk actions cover this. The `bulkAction` in `review-table-base.js:712–715` correctly scopes to DataTable-filtered rows, so a user can filter to a subset and bulk-apply. This is positive.

**Net: W1 is partially satisfied.** Bulk decisions work well; inter-phase advancement is pointer-only.

---

### US-W2: Session Switching and Multi-Application Management

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W2.1 | Sessions easy to distinguish in the session-switching UI | ✅ Pass | Sessions modal renders a sortable table with Name, Status (Current / Owned / Unclaimed / Saved), Phase, and Last Modified columns (`session-switcher-ui.js:298–311`). Status pills use color classes (`session-status-current`, `session-status-saved`, etc., `session-switcher-ui.js:326–329`). A "Recents" strip shows the 5 most recently modified sessions at top of the modal (`session-switcher-ui.js:368–383`). |
| W2.2 | Creating, opening, or renaming sessions does not create ambiguity about which is active | ✅ Pass | The current-tab session row is styled with class `sm-tr-current` and its action cell shows "Current" (disabled button) rather than a load affordance (`session-switcher-ui.js:334–336`). Header label `#header-session-name` reads "Current session: name" (`session-switcher-ui.js:153–157`). Ownership-conflict dialog (`session-switcher-ui.js:162–193`) and 409-conflict amber banner (`ui-core.js:449–465`) prevent silent multi-tab collisions. |
| W2.3 | Active session context remains visible while working | ✅ Pass | Position bar row shows `#position-title` (job title) and `#position-company` (company name) persistently below the header (`index.html:72–82`). Header subtitle `#header-session-name` shows "Current session: name · phase" (`session-switcher-ui.js:150–157`). The session switcher button label itself reflects the active session's position + phase via `buildSessionSwitcherLabel()` in `session-manager.js:71–78`. |

**Failure modes guard-against check:**

- **Rapid context switching without losing orientation:** Sessions modal can be opened at any time from the header. However, opening a different session via the modal navigates the current tab (no preview before switching). For a power user managing five simultaneous applications, there is no side-by-side comparison or quick-peek of another session's current content before committing to switch.
- **Currently active session identifiable:** Definitively yes — three independent signals (header subtitle, position bar, switcher button label) keep the active session visible at all times.

**Net: W2 is mostly satisfied.** The active-session context signals are strong. The gap is the absence of a non-destructive "preview" before switching.

---

### US-W3: Efficient Iteration

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W3.1 | Re-run affordances are discoverable for supported stages | ⚠️ Partial | Completed workflow step pills for Analysis, Customise, Rewrites, and Spell Check gain a hover-revealed `↻` icon (`workflow-steps.js:702–706`). Tooltip on completed step reads "Click ↻ to rerun from here" (`workflow-steps.js:204`). The ↻ icon triggers `confirmReRunPhase(step)` which opens a downstream-aware confirmation modal. The affordance is functional but hidden at `opacity:0` until hover — not discoverable via keyboard or at a glance. |
| W3.2 | Re-entry into earlier stages preserves useful downstream context | ✅ Pass | `conversation_manager.py:_build_downstream_context()` (line 1348) collects approved rewrites, experience/skill decisions, and accepted spell fixes and injects them as LLM context. `back_to_phase()` (line 1391) marks downstream steps stale but does not erase them. `re_run_phase()` (line 1426) passes this context into the new LLM call. |
| W3.3 | The app minimises redundant work during iteration | ⚠️ Partial | Changed items are highlighted after a re-run (`workflow-steps.js:311–313` calls `_highlightChangedItems()`), reducing the need to re-read the whole output. Stale step pills are visually flagged. However, there is no count of how many items changed and no "show only changed" filter after a re-run — the user must scroll through all items to find highlighted ones in large datasets. |

**Failure modes guard-against check:**

- **Reruns feel equivalent to starting over:** Significantly mitigated. The confirmation modal names which downstream stages are still intact, downstream context is preserved in the LLM prompt, and stale pills clearly distinguish "may be outdated" from "erased". Prior decisions are never reset.
- **UI makes reruns feel costly:** The hover-only ↻ affordance is not discoverable without hovering. A new user or someone working quickly may not notice it. The confirmation dialog adds one more click after the ↻ hover. That said, the dialog shows concrete downstream impact, which is valuable.

**Net: W3 is partially satisfied.** Backend iteration support is excellent. The ↻ hover-only affordance is the weakest link for discoverability; the absence of a changed-item summary count is a friction point for large re-runs.

---

## Generated Materials Evaluation

The review is source-code-based (no runtime session available). Observations based on the code path for generated files:

| Criterion | Status | Notes |
|-----------|--------|-------|
| Files clearly labelled by format and purpose | ✅ Pass | `download-tab.js:38–70`: each file gets an icon and description string (e.g., "ATS-optimised PDF — machine-readable for automated screening"). |
| Page-count advisory surfaced to power user | ✅ Pass | `download-tab.js:79–91`: page count badge with amber warning when outside 1.5–3 page range; "Senior candidate target is 2–3 pages" label. |
| ATS validation report accessible | ✅ Pass | Position bar "ATS Report" button (`index.html:102–103`) appears after analysis. Dedicated ATS Score tab (`tab-ats-score`) with full validation breakdown. |
| Cover letter, screening, interview prep addressable without starting over | ✅ Pass | Post-layout steps all unlock simultaneously once layout is confirmed (`workflow-steps.js:641`), and their step pills become clickable without re-running earlier phases. |
| Files output quality feedback (not just download links) | ✅ Pass | `download-tab.js:76–100`: ATS validation checks table with per-check pass/fail; page count advisory; persuasion-check in the same tab. |
| Harvest path for improvements back to Master CV | ✅ Pass | Harvest step (`step-harvest`, `tab-harvest`) is part of the workflow bar and unlocks after layout confirmation. |

**Key power-user concern for generated materials:** There is no "quick re-generate with unchanged layout" button on the File Review tab. If a user makes a minor content edit and wants to regenerate without revisiting layout review, they must navigate back via the re-run path from Analysis or Customise. The path is correct but is not surfaced as a one-click shortcut from the download area.

---

## Additional Story Gaps / Proposed Story Items

### Gap A — No keyboard shortcuts for primary workflow actions (W1.1)
The only keyboard bindings are: `Enter` sends message (`app.js:116–118`), `Escape` closes modals (`ui-core.js:558–561`), Arrow/Home/End navigate the tab bar (`ui-core.js:516–541`). There is no shortcut to trigger the current primary action button (Analyze, Continue, Accept All, etc.). A power user processing many applications per week must reach for the pointer to advance every phase.

**Proposed:** Add `Ctrl+Enter` (or `Alt+→`) to trigger the visible primary action button; `Ctrl+Shift+A` for Accept All Recommended in bulk-action contexts.

### Gap B — Re-run affordance requires hover; not keyboard-accessible (W3.1)
The ↻ icon on completed steps starts at `opacity:0` and is only revealed on CSS `:hover` (`workflow-steps.js:706`; `step-rerun-style` injection). There is no way to trigger a re-run from the keyboard.

**Proposed:** Either permanently show the ↻ icon at reduced opacity on completed steps, or expose a "Re-run this phase" option via right-click context menu or a small persistent icon button.

### Gap C — No session search/filter in the sessions modal (W2.1 at scale)
The session modal has sortable columns and a Recents strip but no text search input. With 20+ saved sessions, a power user cannot quickly locate a session by partial job title or company name.

**Proposed:** Add a search input above the sessions table that filters rows client-side by name, phase, or company.

### Gap D — No changed-item count summary after re-run (W3.3)
After `reRunPhase()` completes, the assistant message says "changed items are highlighted" but does not say how many. The diff logic in `_highlightChangedItems()` computes the changed set but does not report its size.

**Proposed:** Surface a count in the assistant message: e.g., "3 of 12 items changed — highlighted in the table below."

### Gap E — No undo for bulk review-table decisions (W1.1, W3.3)
Layout instructions have an undo stack (`layout-instruction.js:1122`), but experience/skill/achievement/rewrite decisions cannot be individually undone. Bulk-accept followed by one misclick requires re-running the phase to reset.

**Proposed:** Implement a single-level undo for the last bulk-action applied to a review table (store the pre-bulk state snapshot and restore on undo).

---

## Evidence Summary

| Feature | Implemented | Source Location |
|---------|-------------|-----------------|
| Bulk accept/reject rewrites | Yes | `rewrite-review.js:449–464` |
| Bulk experience/skill/achievement actions | Yes | `review-table-base.js:708`, `experience-review.js:245–248`, `skills-review.js:945–948`, `achievements-review.js:309–312` |
| Phase re-run with downstream context | Yes | `workflow-steps.js:276–319`, `conversation_manager.py:1426–1508`, `job_routes.py:779–799` |
| Back-to-phase with stale flagging | Yes | `workflow-steps.js:98–128`, `conversation_manager.py:1391–1424`, `job_routes.py:753–777` |
| Re-run highlight of changed items | Yes (no count) | `workflow-steps.js:332–420`, `_highlightChangedItems()` |
| Session modal with sortable columns | Yes | `session-switcher-ui.js:298–411` |
| Recents strip in session modal | Yes | `session-switcher-ui.js:368–383` |
| Active session persistent display (3 signals) | Yes | `session-manager.js:71–78`, `session-switcher-ui.js:146–158`, `index.html:40–42` |
| Session rename — current session (inline) | Yes | `session-manager.js:748–806` |
| Session rename — saved sessions (modal) | Yes | `session-switcher-ui.js:507–543` |
| Ownership conflict detection + resolution | Yes | `session-switcher-ui.js:162–193`, `ui-core.js:449–465` |
| Layout undo stack | Yes | `layout-instruction.js:1120–1134` |
| Keyboard: tab bar navigation (Arrow/Home/End) | Yes | `ui-core.js:516–541` |
| Keyboard: Enter to send message | Yes | `app.js:116–118` |
| Keyboard: Escape closes modals | Yes | `ui-core.js:558–561` |
| Keyboard: global workflow action shortcuts | **No** | Not implemented |
| Session text search/filter | **No** | Not implemented |
| Changed-item count summary after re-run | **No** | Not implemented |
| Undo for bulk review-table decisions | **No** | Not implemented |
| Non-hover (always-visible) re-run affordance | **No** | `workflow-steps.js:706` — opacity:0 until hover |
