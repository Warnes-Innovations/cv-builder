<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power User Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** The power-user story remains substantially met across all three stories. US-W2 (Session Switching) and US-W3 (Efficient Iteration) fully satisfy their acceptance criteria. US-W1 (High-Throughput Workflow Efficiency) remains partially satisfied on criterion W1.1 — no global keyboard shortcut for primary workflow action buttons. Since the prior review at 19:30 ET, nine additional commits have landed. Those most relevant to this persona: GAP-103 adds an inline application-status edit widget (tag-icon button + select) per saved session row in the sessions modal, reinforcing W2.1 (already ✅). GAP-186 adds a backend cold-restore fallback for rewrite decisions (seeds from `rewrite_audit` when `localStorage` is empty — incognito, new device), further hardening W1.2 (already ✅). GAP-194 relabels the final advance buttons from ambiguous "✅" to "📥 Continue to File Review →" and "📦 Package Application Files", improving action-label clarity for power users in the download phase. GAP-80 aligns `.btn-primary`/`.btn-secondary`/`.btn-warning` CSS with disabled-state handling (opacity 0.6, `cursor:not-allowed`). None of these change story-level verdicts — all prior pass/partial assessments hold. Four gaps remain open: Gap A (no primary-action keyboard shortcut), Gap C (no session text-search), Gap D (no changed-item count after re-run), and Gap E (no bulk-decision undo).

---

## What Changed Since Prior Review (2026-06-29 19:30 ET)

Nine commits landed after the prior review that touch files read by this persona:

- **commit `e0c1664`** (GAP-103): `session-switcher-ui.js` gained `startSessionStatusEdit` / `submitSessionStatusEdit` / `cancelSessionStatusEdit` and a tag-icon action button per saved session row. Application status can now be changed inline without opening the session. **Reinforces W2.1** (session distinguishability) — status is now editable directly from the switcher. Already-✅ criterion.

- **commit `3cf454c`** (GAP-186): `rewrite-review.js` gains `_backendRewriteAudit` cache and a cold-restore fallback: when `localStorage` has no decisions, decisions are seeded from `/api/rewrites`' `rewrite_audit` response field. **Reinforces W1.2** (decision persistence across reload) — decisions now survive even incognito/new-device scenarios. Already-✅ criterion.

- **commit `fb22d6f`** (GAP-194): `index.html` relabels `#final-generate-proceed-btn` to "📥 Continue to File Review →" and `#finalise-action-btn` to "📦 Package Application Files", replacing the prior "✅ Proceed to Finalise →"/"✅ Finalise" labels (which shared the ✅ icon with the Layout Confirm button). **Improves action clarity** for power users in the late-workflow stages — the destination is now unambiguous.

- **commit `79f35dc`** (GAP-80): `styles.css` fixes `.btn-primary`/`.btn-secondary`/`.btn-warning` hover rules to guard `:not(:disabled)`, and adds `opacity:0.6;cursor:not-allowed` for disabled state. **Prevents hover-highlight on inactive buttons**, removing a misleading affordance that could cost a power user an errant click.

- **commit `54b2632`** (GAP-73): `index.html` gains a `#workflow-stage-announcer` `aria-live="polite"` region for stage-change announcements. **Accessibility improvement** relevant to keyboard-first power users.

- **commit `647bdf7`** (GAP-191/192): Workflow step `<span aria-hidden="true">` on emoji icons added across all step pills in `index.html`. Session rows in the modal gain `aria-label` attributes. Minor a11y hardening; no power-user workflow-efficiency impact.

- **commits `afbb7c6`, `98b384b`, `db796b0`**: Cover letter/summary/LLM-provider changes — no impact on any of the three power-user story criteria.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

**As a** power user, **I want to** move through common review tasks quickly so repeated use across many jobs does not become tedious.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W1.1 | Frequent actions available without excessive pointer travel | ⚠️ Partial | Primary action buttons (Analyze, Recommend Customizations, Continue, etc.) live at the bottom of the chat panel (`index.html:182–195`). Tab bar navigates via Arrow/Home/End (`ui-core.js:528–553`). Workflow step pills activate with `Enter`/`Space`. `app.js:116–118` binds `Enter` to message-send only. No `Ctrl+Enter` or other shortcut triggers the currently visible primary action button. A power user processing many jobs per week must still pointer-click each phase-advance button. **GAP-194 (this cycle)** improved label clarity on the two final-phase buttons — the destination is now unambiguous — but the pointer dependency is unchanged. |
| W1.2 | Repetitive review work supports efficient sequential progression | ✅ Pass | `acceptAllRewrites()` / `rejectAllRewrites()` in `rewrite-review.js:519–537`; `bulkAction()` in `review-table-base.js`; bulk toolbars in `experience-review.js:242–248`, `skills-review.js:942–948`, `achievements-review.js:306–312`. All decisions persist to `localStorage` keyed by session ID (GAP-166). **GAP-186 (this cycle)** adds cold-restore from `_backendRewriteAudit` when `localStorage` is empty — decisions now survive incognito and new-device scenarios. |
| W1.3 | Multi-item review screens avoid unnecessary navigation churn | ✅ Pass | DataTable-backed review tables render all items on a single scrollable pane. Rewrite cards presented in a single panel with Accept/Reject/Edit per card plus bulk tools. Inline tally counters update without page reload. No page-per-item navigation required. |

**Failure modes guard-against check:**

- **Repeated clicks across distant controls:** Step pills are keyboard-reachable; primary action button still requires pointer or full Tab traversal. Gap A is open.
- **No efficient path through large review sets:** DataTable filter + bulk actions adequately serve this need.

**Net: W1.1 partially satisfied; W1.2 and W1.3 pass.**

---

### US-W2: Session Switching and Multi-Application Management

**As a** power user, **I want to** move between multiple sessions safely and efficiently so I can manage several applications in parallel.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W2.1 | Sessions easy to distinguish in the session-switching UI | ✅ Pass | Sessions modal renders a sortable table (Name, Status pill, Phase, Last Modified). Recents strip shows most-recently-modified sessions. Status pills use colour-coded CSS classes (`styles.css:210–215`). Application-status badge (Draft/Ready/Sent/Interview/Rejected/Accepted, colour-coded) renders in the Phase column (`session-switcher-ui.js:360–390`). **GAP-103 (this cycle)** adds an inline edit widget (tag-icon button + select + save/cancel) per saved row, making application status editable without opening the session — `startSessionStatusEdit`, `submitSessionStatusEdit`, `cancelSessionStatusEdit` in `session-switcher-ui.js`. |
| W2.2 | Creating, opening, or renaming sessions does not create ambiguity about which is active | ✅ Pass | Current-tab row styled `sm-tr-current` with disabled "Current" indicator. Header sub-label `#header-session-name` (`index.html:41`) shows current session. Ownership-conflict dialog on 409 prevents silent multi-tab collisions; phase-enforcement 409s do NOT trigger this banner (`ui-core.js:449–477`). Inline rename replaces title in place without navigating away (`session-manager.js`). |
| W2.3 | Active session context remains visible while working | ✅ Pass | Three independent persistent signals: (1) `#position-title` / `#position-company` in position bar (`index.html:75–82`); (2) `#header-session-name` sub-label under app title (`index.html:41`); (3) Sessions button label updated via `buildSessionSwitcherLabel()`. All visible throughout the entire workflow. |

**Failure modes guard-against check:**

- **Rapid context switching without losing orientation:** Sessions modal always accessible from header. No text-search filter — with 20+ saved sessions, a power user cannot locate by partial job title. Gap C remains open.
- **Currently active session identifiable throughout:** Three persistent signals are robust.

**Net: W2 fully satisfies all acceptance criteria. Session-search (Gap C) is a scale limitation, not a story failure.**

---

### US-W3: Efficient Iteration

**As a** power user, **I want to** revisit and rerun stages with minimal friction so refinement loops remain practical instead of costly.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| W3.1 | Re-run affordances are discoverable for supported stages | ✅ Pass | The ↻ re-run button renders at `opacity:0.35` at rest (`workflow-steps.js:733`) on every completed step pill that supports LLM re-execution (analysis, customizations, rewrite, spell — `RE_RUN_STEPS` at `workflow-steps.js:645`). The button is a `<button aria-label="Re-run …">` element with a `:focus-visible` ring and a `:focus-within` CSS rule that raises opacity to 1 (`workflow-steps.js:762`). Keyboard users can Tab to a completed step pill and activate ↻. Confirmation modal (`workflow-steps.js:138–188`) has its own focus trap and lists downstream stages that remain intact. |
| W3.2 | Re-entry into earlier stages preserves useful downstream context | ✅ Pass | `_build_downstream_context()` in `conversation_manager.py` collects approved rewrites, experience/skill decisions, and accepted spell fixes, injecting them into the re-run LLM prompt. `back_to_phase()` marks downstream steps stale without erasing content. `re_run_phase()` passes context to the new LLM call. Backend support is comprehensive. |
| W3.3 | The app minimises redundant work during iteration | ⚠️ Partial | `_highlightChangedItems()` (`workflow-steps.js:332–380`) marks changed rewrite cards and experience/skill table rows. Rewrite decisions survive page reload (GAP-166) and cold-restore (GAP-186). However, the assistant message after re-run (`workflow-steps.js:294`) says "changed items are highlighted" with no count. No "show only changed" filter exists. The changed-item set is computed but never surfaced as a quantity. |

**Failure modes guard-against check:**

- **Reruns feel equivalent to starting over:** Substantially mitigated. Confirmation modal lists which downstream stages remain intact. Stale badges appear on downstream steps. Downstream context passes into the LLM prompt.
- **Re-run affordance keyboard accessibility and discoverability:** ↻ button is persistently visible at 0.35 opacity at rest, focusable with Tab, and raises to full opacity on hover/focus. Both pointer and keyboard discovery paths work.

**Net: W3.1 and W3.2 pass fully. W3.3 remains partial — changed-item count after re-run still absent.**

---

## Generated Materials Evaluation

Assessment based on source code reading of generation and download paths.

| Criterion | Status | Notes |
|-----------|--------|-------|
| Files clearly labelled by format and purpose | ✅ Pass | `download-tab.js`: each file card has a format icon and descriptive label ("ATS-optimised DOCX", "Human-readable PDF", etc.). |
| Generation timestamp on download cards | ✅ Pass | `_renderDownloadGrid()` displays a "Generated {date}" label on each download card. File currency confirmed at a glance. |
| Page-count advisory surfaced | ✅ Pass | `download-tab.js`: page count badge with amber warning when outside 1–3 page range. |
| ATS validation report accessible | ✅ Pass | "ATS Report" button in position bar (`index.html:102–103`), visible after job analysis. Dedicated `tab-ats-score` tab. |
| Post-layout steps addressable without restart | ✅ Pass | Post-layout steps unlock simultaneously after layout confirmation (`workflow-steps.js:666–680`). |
| File quality feedback beyond download links | ✅ Pass | `download-tab.js`: ATS validation checks table with per-check pass/fail; page count advisory; persuasion-check warnings. |
| Harvest path for improvements to Master CV | ✅ Pass | `step-harvest` / `tab-harvest` in workflow bar, unlocks after layout confirmation. |
| Rewrite decisions survive page reload | ✅ Pass | GAP-166: decisions persisted to `localStorage` keyed by session ID (`rewrite-review.js`). **GAP-186 (this cycle)**: cold-restore from backend `rewrite_audit` when `localStorage` is empty. |
| Final-phase action button labels unambiguous | ✅ Pass | **GAP-194 (this cycle)**: "📥 Continue to File Review →" and "📦 Package Application Files" now replace the prior ✅-labelled buttons (`index.html:192–194`). |

**Remaining concern:** No "quick re-generate with unchanged layout" affordance from the File Review tab. Minor content edits still require back-navigating via the re-run path — typically 3–4 interactions from the download view. The path exists but is not surfaced as a single-click affordance.

---

## Additional Story Gaps / Proposed Story Items

### Gap A (Open) — No keyboard shortcuts for primary workflow action buttons (W1.1)

The keyboard bindings in the primary flow are: `Enter` sends message (`app.js:116–118`), `Escape` closes modals (`ui-core.js:570–574`), Arrow/Home/End navigate the tab bar (`ui-core.js:536–553`), and `Enter`/`Space` activate focused workflow step pills. There is no shortcut to trigger the visible primary action button (Analyze Job, Recommend Customisations, Continue to Spell Check, etc.). A power user processing many applications per week must use a pointer to advance each phase.

**Proposed:** `Ctrl+Enter` triggers the currently visible primary action button. `Ctrl+Shift+A` triggers Accept All Recommended in bulk-action review contexts.

---

### Gap C (Open) — No session search/filter in the sessions modal (W2.1 at scale)

The sessions modal has sortable columns, a Recents strip, and application-status badges/edit widgets, but no text search input (`session-switcher-ui.js` — no `<input>` filter element). With many sessions, a power user cannot locate a session by partial job title or company name without scrolling. The `/api/sessions` endpoint returns up to 20 sessions.

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

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/workflow-steps.js, web/session-actions.js, web/session-switcher-ui.js, web/session-manager.js, web/rewrite-review.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/download-tab.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | ---------- | ------ | ---------- | ----- |
| US-W1 (3 criteria) | 2 | 1 | 0 | 0 | 0 |
| US-W2 (3 criteria) | 3 | 0 | 0 | 0 | 0 |
| US-W3 (3 criteria) | 2 | 1 | 0 | 0 | 0 |
| Generated Materials (9 criteria) | 9 | 0 | 0 | 0 | 0 |

**Key evidence references:**

- W1.1 partial: primary action buttons pointer-only → `web/index.html:182–195`; no global shortcut → `web/ui-core.js:528–574`; GAP-194 improved labels but not keyboard access → `web/index.html:192–194`
- W1.2 pass: bulk actions → `web/review-table-base.js`, `web/rewrite-review.js:519–537`; rewrite decision persistence → GAP-166; cold-restore fallback → GAP-186 `web/rewrite-review.js`
- W1.3 pass: DataTable reviews → `web/experience-review.js`, `web/skills-review.js`
- W2.1 pass + improved: session modal table + recents + status badges → `web/session-switcher-ui.js:360–390`; inline status edit widget → GAP-103 `web/session-switcher-ui.js`; status pill CSS → `web/styles.css:210–215`
- W2.2 pass: current-row indicator, conflict detection (non-ownership 409s suppressed) → `web/ui-core.js:449–477`; inline rename → `web/session-manager.js`
- W2.3 pass: three active-session signals → `web/index.html:41,75–82`, `web/session-actions.js`
- W3.1 pass: ↻ button at `opacity:0.35` at rest → `web/workflow-steps.js:733`; hover/focus to 1 → `web/workflow-steps.js:762`; `aria-label` element → `web/workflow-steps.js:730`; `RE_RUN_STEPS` → `web/workflow-steps.js:645`
- W3.2 pass: downstream context → `scripts/utils/conversation_manager.py`
- W3.3 partial: highlight logic exists, count absent → `web/workflow-steps.js:294,332–380`
- Generated Materials — generation timestamp → `web/download-tab.js`; final-phase button labels → GAP-194 `web/index.html:192–194`
- Gap A (open): no primary-action shortcut → `web/ui-core.js:528–574`
- Gap C (open): no session filter input → `web/session-switcher-ui.js`
- Gap D (open): count not surfaced → `web/workflow-steps.js:294`
- Gap E (open): no bulk-decision undo → `web/rewrite-review.js`, `web/review-table-base.js`
- GAP-80 closed: disabled-state CSS for btn-primary/secondary/warning → `web/styles.css`
- GAP-103 closed: inline application-status edit in sessions modal → `web/session-switcher-ui.js`
- GAP-186 closed: cold-restore rewrite decisions from backend audit → `web/rewrite-review.js`
- GAP-194 closed: unambiguous final-phase action button labels → `web/index.html:192–194`

**Evidence standard:** Every conclusion is independently verifiable from the cited source files. No runtime testing was performed — assessment is based on source code only.
