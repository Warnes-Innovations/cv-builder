<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power User Review Status

**Last Updated:** 2026-06-30 ET

**Reviewer role:** Power User (US-W1, US-W2, US-W3)

**Executive Summary:** All three stories are substantially satisfied. US-W2 (Session Switching) and US-W3 (Efficient Iteration) fully pass all acceptance criteria. US-W1 (High-Throughput Workflow Efficiency) passes two of three criteria; W1.1 remains partial because primary workflow phase-advance buttons have no keyboard shortcut — pointer or full Tab traversal is required. Four open gaps are tracked: Gap A (no primary-action keyboard shortcut), Gap C (no session text-search filter), Gap D (changed-item count not surfaced after re-run), Gap E (no bulk-decision undo).

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

**As a** power user, **I want to** move through common review tasks quickly so repeated use across many jobs does not become tedious.

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W1.1 | Frequent actions available without excessive pointer travel | ⚠️ Partial | Primary phase-advance buttons (Analyze Job, Recommend Customizations, Continue to Spell Check, etc.) are rendered at the bottom of the chat panel (`index.html:182–195`). The tab bar supports keyboard navigation via Arrow/Home/End and Enter/Space activation (`ui-core.js:528–553`). Completed workflow step pills are reachable by keyboard and support Enter/Space. `aria-current="step"` is set on the active step pill (`ui-core.js:1358–1366`). `app.js:116–118` binds Enter to message-send only. No global shortcut triggers the currently visible primary action button. A power user processing many applications must use a pointer to advance each phase. |
| W1.2 | Repetitive review work supports efficient sequential progression | ✅ Pass | `acceptAllRewrites()` / `rejectAllRewrites()` in `rewrite-review.js:519–535` with tally counters at `rewrite-review.js:183–191`. Bulk action buttons (Accept All Recommended, Emphasize All, Include All, Exclude All) in `experience-review.js:245–248` and `skills-review.js:945–948`. Rewrite decisions persist to `localStorage` keyed by session ID (cold-restore fallback from backend `rewrite_audit` at `rewrite-review.js:52–102`). All review panels present items on a single scrollable page without per-item navigation. |
| W1.3 | Multi-item review screens avoid unnecessary navigation churn | ✅ Pass | DataTable-backed review tables (`experience-review.js`, `skills-review.js`) render all items in a single scrollable panel. Rewrite cards rendered in a flat list with per-card Accept/Reject/Edit controls and bulk tools. Inline tally counters (`tally-accepted`, `tally-rejected`, `tally-pending` at `rewrite-review.js:184–186`) update without page reload. No page-per-item navigation exists. |

**Failure modes guard-against check:**

- **Repeated clicks across distant controls for standard approve/reject flows:** Step pills and tab bar are keyboard-reachable; primary action button still requires pointer or full Tab traversal. Gap A is open.
- **No efficient path through large review sets:** DataTable filter plus bulk actions adequately serve large sets.

**Net: W1.1 partially satisfied; W1.2 and W1.3 pass. Story acceptance criteria — power users can move through review-heavy stages quickly — is met at the review layer (bulk actions, tally counters) but limited at the phase-advance layer (pointer required for primary action buttons).**

---

### US-W2: Session Switching and Multi-Application Management

**As a** power user, **I want to** move between multiple sessions safely and efficiently so I can manage several applications in parallel.

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W2.1 | Sessions easy to distinguish in the session-switching UI | ✅ Pass | Sessions modal renders a sortable table with Name, Status pill, Phase/Application Status, Last Modified columns (`session-switcher-ui.js:419–443`). Recents strip shows most-recently-modified sessions (`session-switcher-ui.js:401–416`). Status pills use colour-coded CSS classes: `session-status-current` (green), `session-status-owned` (amber), `session-status-unclaimed` (blue), `session-status-saved` (grey) (`styles.css:211–215`). Inline application-status edit widget (tag icon + select + save/cancel) per saved row (`session-switcher-ui.js:375–389`). |
| W2.2 | Creating, opening, or renaming sessions does not create ambiguity about which is active | ✅ Pass | Current-session row styled `sm-tr-current` (`styles.css:243`) with "Current" badge (disabled, non-clickable). Ownership-conflict dialog (`#ownership-conflict-overlay`) fires on 409 session-ownership conflicts, preventing silent multi-tab session collisions. Phase-enforcement 409s and `/api/sessions/claim` / `/api/sessions/takeover` responses are excluded from this banner (`ui-core.js:449–477`). Inline rename in the sessions modal replaces the name in place without page navigation (`session-switcher-ui.js:544–579`). |
| W2.3 | Active session context remains visible while working | ✅ Pass | Three persistent, independent signals throughout the workflow: (1) `#position-title` (large position name) and `#position-company` (company subtitle) in the position bar (`index.html:80–85`), updated via `session-actions.js:133–177`; (2) `#header-session-name` sub-label under the app title (`index.html:41`), updated via `_updateSessionSwitcherHeader()` in `session-switcher-ui.js:146–158`; (3) Sessions pill label in the header, updated via `buildSessionSwitcherLabel()` (`session-manager.js:71–78`). All three persist while tabs and modals are open. |

**Failure modes guard-against check:**

- **Rapid context switching without losing orientation:** Sessions modal is always accessible from the header. No text-search filter exists — with many saved sessions a power user must scroll to locate by job title. Gap C is open.
- **Currently active session identifiable throughout:** Three persistent and independently-updated signals are robust.

**Net: W2 fully satisfies all acceptance criteria. Session-search (Gap C) is a scale limitation, not a story failure.**

---

### US-W3: Efficient Iteration

**As a** power user, **I want to** revisit and rerun stages with minimal friction so refinement loops remain practical instead of costly.

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W3.1 | Re-run affordances are discoverable for supported stages | ✅ Pass | The ↻ re-run button is injected into every completed step pill that supports LLM re-execution (analysis, customizations, rewrite, spell — `RE_RUN_STEPS` at `workflow-steps.js:645`). At rest the button renders at `opacity:0.35` (`workflow-steps.js:733`). CSS injected once at `workflow-steps.js:762` raises opacity to 1 on `:hover` and `:focus-within`. Button carries `aria-label="Re-run …"` and a focusable `<button>` element with `:focus-visible` ring. Keyboard users can Tab to a completed step pill and activate ↻. Confirmation modal (`workflow-steps.js:138–188`) has a focus trap, lists downstream completed stages that remain intact, and notes "All existing approvals and rewrites are preserved as context." Under `prefers-reduced-motion` (`styles.css:1622`), staleness animation disappears but chip colour/border remains visible. |
| W3.2 | Re-entry into earlier stages preserves useful downstream context | ✅ Pass | `_build_downstream_context()` in `conversation_manager.py:1392` collects approved rewrites, experience/skill decisions, and accepted spell fixes and injects them into the re-run LLM prompt (`conversation_manager.py:1491`). `back_to_phase()` at `workflow-steps.js:98` calls `/api/back-to-phase` and messages "Prior decisions and approvals are preserved." `re_run_phase()` at `workflow-steps.js:276` clears per-phase caches (`_spellCheckCache`, `_rewritePanelCache`) so UI fetches fresh results while backend context is carried forward. Downstream steps gain `.stale` class (`status.stale_steps` applied at `workflow-steps.js:707–738`) without erasing prior content. |
| W3.3 | The app minimises redundant work during iteration | ⚠️ Partial | `_highlightChangedItems()` (`workflow-steps.js:332–380`) marks changed rewrite cards (by comparing `priorOutput.pending_rewrites` IDs and proposed text) and experience/skill table rows. Changed items receive `data-changed="true"` which drives a highlight animation (`_markChanged()` at `workflow-steps.js:384–388`). Rewrite decisions survive page reload and cold-restore (`rewrite-review.js:52–102`). However, the assistant message after re-run (`workflow-steps.js:294`) reads "changed items are highlighted" with no count of how many changed versus total. No "show only changed" filter exists. The changed-item set is computed but never surfaced as a quantity. |

**Failure modes guard-against check:**

- **Reruns feel equivalent to starting over:** Substantially mitigated. Confirmation modal lists intact downstream stages. Stale badges appear on downstream step pills. Downstream context passes into the LLM prompt (`_build_downstream_context()`). The re-run message in the chat explicitly states approvals are preserved.
- **Re-run affordance keyboard accessibility and discoverability:** ↻ button is persistently visible (dim at rest), focusable with Tab, raises to full opacity on hover/focus-within. Pointer and keyboard discovery both work.

**Net: W3.1 and W3.2 pass fully. W3.3 remains partial — changed-item count after re-run is still absent.**

---

## Generated Materials Evaluation

Assessment derived from source-code reading of generation and download paths.

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Files clearly labelled by format and purpose | ✅ Pass | `download-tab.js`: each file card has a format icon and descriptive label ("ATS-optimised DOCX", "Human-readable PDF", etc.). |
| Generation timestamp on download cards | ✅ Pass | `_renderDownloadGrid()` displays a "Generated {date}" label on each download card. |
| Page-count advisory surfaced | ✅ Pass | `download-tab.js`: page count badge with amber warning when outside 1–3 page range. |
| ATS validation report accessible | ✅ Pass | "ATS Report" button in position bar (`index.html:102–103`), visible after job analysis. Dedicated `tab-ats-score` tab. ATS score displayed in position bar badge (`#ats-score-badge`) with colour thresholds (high/medium/low, `styles.css:102–104`). |
| Post-layout steps addressable without restart | ✅ Pass | Post-layout steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously after layout confirmation (`workflow-steps.js`). All have dedicated workflow step pills in `index.html:138–147` and corresponding tabs. |
| File quality feedback beyond download links | ✅ Pass | `download-tab.js`: ATS validation checks table with per-check pass/fail; page count advisory; persuasion-check warnings surfaced from `persuasion_warnings` in status response. |
| Harvest path for improvements to Master CV | ✅ Pass | `step-harvest` / `tab-harvest` in workflow bar (`index.html:147`). Unlocks after layout confirmation. |
| Rewrite decisions survive page reload | ✅ Pass | `localStorage`-persisted decisions keyed by session ID; cold-restore fallback from backend `rewrite_audit` when `localStorage` is empty (`rewrite-review.js:52–102`). |
| Final-phase action button labels unambiguous | ✅ Pass | "📥 Continue to File Review →" and "📦 Package Application Files" (`index.html:193–194`). |

**Remaining concern:** No single-click "re-generate with unchanged layout" affordance from the File Review tab. Minor content edits still require back-navigating via the re-run path — typically 3–4 interactions from the download view. The path exists but is not surfaced as a shortcut.

---

## Open Gaps

### Gap A — No keyboard shortcut for primary workflow action buttons (W1.1)

Current keyboard bindings: `Enter` sends chat message (`app.js:116–118`), `Escape` closes modals (`ui-core.js:570–574`), Arrow/Home/End navigate the tab bar (`ui-core.js:536–553`), `Enter`/`Space` activate focused workflow step pills. `aria-current="step"` is set on the active step (`ui-core.js:1362`). No shortcut triggers the currently visible primary action button (Analyze Job, Recommend Customisations, Continue to Spell Check, etc.). A power user processing many applications per week must use a pointer to advance each phase.

**Proposed:** `Ctrl+Enter` triggers the currently visible primary action button. `Ctrl+Shift+A` triggers Accept All Recommended in bulk-action review contexts.

---

### Gap C — No session search/filter in the sessions modal (W2.1 at scale)

The sessions modal has sortable columns, a Recents strip, status badges, and inline edit widgets, but no text search input (`session-switcher-ui.js` — no filter `<input>` element). With many sessions, a power user cannot locate a session by partial job title or company name without scrolling.

**Proposed:** Add a text search input above the sessions table that filters rows client-side by name, phase, or company name.

---

### Gap D — No changed-item count summary after re-run (W3.3)

After `reRunPhase()` completes, the assistant message (`workflow-steps.js:294`) says "changed items are highlighted" without a count. The diff logic in `_highlightChangedItems()` (`workflow-steps.js:332–380`) computes the changed set, but that count is never surfaced in the UI.

**Proposed:** Append a count to the assistant message — e.g., "3 of 12 experience recommendations changed — highlighted in the table."

---

### Gap E — No undo for bulk review-table decisions (W1.1, W3.3)

Layout instructions have an undo stack (`layout-instruction.js`), but experience/skill/achievement/rewrite decisions cannot be undone individually or in bulk after applying. A misclick on "Exclude All" requires re-running the phase to reset.

**Proposed:** Single-level undo for the last bulk action on a review table — store a pre-bulk state snapshot in `localStorage` and restore it on `Ctrl+Z` or an Undo button.

---

## Score Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | ---------- | ------ | ----------- |
| US-W1 (3 criteria) | 2 | 1 | 0 | 0 |
| US-W2 (3 criteria) | 3 | 0 | 0 | 0 |
| US-W3 (3 criteria) | 2 | 1 | 0 | 0 |
| Generated Materials (9 criteria) | 9 | 0 | 0 | 0 |

---

## Key Evidence References

- **W1.1 partial:** primary action buttons pointer-only → `web/index.html:182–195`; Enter binds only to send-message → `web/app.js:116–118`; no global shortcut → `web/ui-core.js:528–574`; `aria-current="step"` reinforces orientation → `web/ui-core.js:1362`
- **W1.2 pass:** bulk accept/reject → `web/rewrite-review.js:519–535`; bulk action buttons → `web/experience-review.js:245–248`, `web/skills-review.js:945–948`; cold-restore → `web/rewrite-review.js:52–102`
- **W1.3 pass:** single-panel review tables → `web/experience-review.js`, `web/skills-review.js`; inline tally counters → `web/rewrite-review.js:183–191`
- **W2.1 pass:** sortable table + recents + status badges → `web/session-switcher-ui.js:419–443`, `401–416`; status pill CSS → `web/styles.css:211–215`; inline status edit → `web/session-switcher-ui.js:375–389`
- **W2.2 pass:** current-row indicator → `web/styles.css:243`; conflict detection → `web/ui-core.js:449–477`; inline rename → `web/session-switcher-ui.js:544–579`
- **W2.3 pass:** three active-session signals → `web/index.html:41,80–85`; `buildSessionSwitcherLabel()` → `web/session-manager.js:71–78`; `_updateSessionSwitcherHeader()` → `web/session-switcher-ui.js:146–158`
- **W3.1 pass:** ↻ button at `opacity:0.35` at rest → `web/workflow-steps.js:733`; `RE_RUN_STEPS` → `web/workflow-steps.js:645`; `aria-label` on button → `web/workflow-steps.js:730`; focus-within CSS → `web/workflow-steps.js:762`
- **W3.2 pass:** downstream context injection → `scripts/utils/conversation_manager.py:1392`; stale-step marking → `web/workflow-steps.js:707–738`; cache clearing after re-run → `web/workflow-steps.js:298–299`
- **W3.3 partial:** highlight logic exists, count absent → `web/workflow-steps.js:294,332–380`
- **Gap A (open):** no primary-action shortcut → `web/ui-core.js:528–574`; `web/app.js:116–118`
- **Gap C (open):** no session filter input → `web/session-switcher-ui.js`
- **Gap D (open):** count not surfaced → `web/workflow-steps.js:294`
- **Gap E (open):** no bulk-decision undo → `web/rewrite-review.js`, `web/experience-review.js`
- **Generated Materials:** ATS badge CSS thresholds → `web/styles.css:102–104`; final-phase button labels → `web/index.html:193–194`; `prefers-reduced-motion` (staleness animations suppressed, colour retained) → `web/styles.css:1622`

**Evidence standard:** All conclusions derived from direct source-code reading of the seven required files plus directly referenced modules. No runtime testing performed.

**Files read:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, plus directly referenced modules: `web/workflow-steps.js`, `web/session-switcher-ui.js`, `web/session-manager.js`, `web/rewrite-review.js`, `web/experience-review.js`, `web/skills-review.js`.
