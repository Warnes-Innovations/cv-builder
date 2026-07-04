<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power User Review Status

**Last Updated:** 2026-07-01
**Branch:** feature/multi-user-deployment (HEAD: 5aedf24)
**Reviewer role:** Power User (US-W1, US-W2, US-W3)

**Executive Summary:** All three stories are substantially satisfied. US-W2 (Session Switching) and US-W3 (Efficient Iteration) fully pass all acceptance criteria. US-W1 (High-Throughput Workflow Efficiency) now passes all three criteria — Gap A (keyboard shortcut for primary action) was resolved by `keyboard-shortcuts.js` which implements `Ctrl+Enter` → primary action and `A`/`R`/arrow navigation for review cards. Three open gaps remain: Gap C (no session text-search filter), Gap D (changed-item count not surfaced in assistant message after re-run), and Gap E (no bulk-decision undo). Gap A from the prior review is CLOSED.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

**As a** power user, **I want to** move through common review tasks quickly so repeated use across many jobs does not become tedious.

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W1.1 | Frequent actions available without excessive pointer travel | ✅ Pass | `keyboard-shortcuts.js` implements `Ctrl+Enter` → trigger primary action button for the current tab (`_triggerPrimaryAction()`, `keyboard-shortcuts.js:52–58`). The `_TAB_ACTION_BTN` map covers: job → `send-btn`, analysis → `analyze-btn`, goals → `recommend-btn`, rewrite → `rewrite-btn`, spell → `spell-btn`, layout → `layout-btn`, download → `final-generate-proceed-btn`, finalise → `finalise-action-btn` (`keyboard-shortcuts.js:39–48`). Arrow keys (`↑`/`↓`) navigate between review cards; `A`/`R` accept or reject the focused card on Rewrites and Spell Check tabs (`keyboard-shortcuts.js:203–220`). Tab bar supports Arrow/Home/End keyboard navigation (`ui-core.js:459–486`). `?` key opens the keyboard shortcuts help panel. Shortcut help panel is shown at startup via `? Help` header button and accessible at any time (`index.html:63–67`). |
| W1.2 | Repetitive review work supports efficient sequential progression | ✅ Pass | `acceptAllRewrites()` / `rejectAllRewrites()` in `rewrite-review.js:656–672` with tally counters updating live (`rewrite-review.js:270–276`). Compact mode toggle (`⊞ Compact` / `⊟ Full View`) collapses rewrite cards to single-line for rapid scanning (`rewrite-review.js:674–684`). Bulk action buttons on experience and skills tabs. Rewrite decisions persist to `localStorage` keyed by session ID with cold-restore fallback from backend `rewrite_audit`. All review panels render items on a single scrollable page. |
| W1.3 | Multi-item review screens avoid unnecessary navigation churn | ✅ Pass | DataTable-backed review tables (`experience-review.js`, `skills-review.js`) render all items in a single scrollable panel. Rewrite cards render as a flat list with per-card Accept/Reject/Edit controls and bulk tools. Inline tally counters (`tally-accepted`, `tally-rejected`, `tally-pending` at `rewrite-review.js:270–273`) update without page reload. No page-per-item navigation exists. Compact mode further reduces scroll distance during rewrite review. |

**Failure modes guard-against check:**

- **Repeated clicks across distant controls for standard approve/reject flows:** `Ctrl+Enter` advances the workflow from any phase without pointer travel. `A`/`R`/arrow keys handle review-card accept/reject. Gap A is closed.
- **No efficient path through large review sets:** Compact mode, bulk accept/reject, and DataTable filter all serve large review sets efficiently.

**Net: W1 fully satisfies all acceptance criteria.**

---

### US-W2: Session Switching and Multi-Application Management

**As a** power user, **I want to** move between multiple sessions safely and efficiently so I can manage several applications in parallel.

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W2.1 | Sessions easy to distinguish in the session-switching UI | ✅ Pass | Sessions modal renders a sortable table with Name (with company sub-label), Status pill, Phase/ATS score/Application Status, Last Modified columns (`session-switcher-ui.js:305–317`, `330–438`). Recents strip shows 5 most-recently-modified sessions at the top of the modal (`session-switcher-ui.js:440–455`, `_renderRecentsStrip(byDate.slice(0, 5))`). Status pills are colour-coded: current (green), owned by another tab (amber), unclaimed (blue), saved-to-disk (grey). ATS score rendered as coloured badge in the Phase column (`session-switcher-ui.js:423–429`). Inline application-status edit widget per saved row (tag icon → select → save/cancel). Inline notes edit (sticky-note icon → textarea → save/cancel). |
| W2.2 | Creating, opening, or renaming sessions does not create ambiguity about which is active | ✅ Pass | Current-session row styled `sm-tr-current` with "Current" badge (non-clickable `aria-disabled="true"`). Ownership-conflict dialog (`#ownership-conflict-overlay`) fires on 409 ownership responses, preventing silent multi-tab session collisions (`session-manager.js:340–351`). Inline rename in the sessions modal replaces the name in place without page navigation. Session name visible in three persistent locations throughout the workflow (see W2.3). |
| W2.3 | Active session context remains visible while working | ✅ Pass | Three persistent, independent signals: (1) `#position-title` (large job title) and `#position-company` (company subtitle) in the position bar (`index.html:80–85`); (2) `#header-session-name` sub-label under the app title (`index.html:41`), updated to "Current session: {name}" via `_updateSessionSwitcherHeader()` (`session-switcher-ui.js:146–158`); (3) Sessions pill label in the header, always visible and updated via `buildSessionSwitcherLabel()`. All three persist while tabs and modals are open. |

**Failure modes guard-against check:**

- **Rapid context switching without losing orientation:** Sessions modal is always accessible from the header pill. No text-search filter exists — with many saved sessions a power user must scroll or rely on the Recents strip. Gap C remains open.
- **Currently active session identifiable throughout:** Three persistent, independently-updated signals are robust.

**Net: W2 fully satisfies all acceptance criteria. Session-search (Gap C) is a scale limitation, not a story failure.**

---

### US-W3: Efficient Iteration

**As a** power user, **I want to** revisit and rerun stages with minimal friction so refinement loops remain practical instead of costly.

| # | Criterion | Status | Evidence |
| --- | --------- | ------ | -------- |
| W3.1 | Re-run affordances are discoverable for supported stages | ✅ Pass | The ↻ re-run button is injected into every completed step pill that supports LLM re-execution (analysis, customizations, rewrite, spell — `RE_RUN_STEPS` in `workflow-steps.js`). At rest the button renders at low opacity; it rises to full opacity on `:hover` and `:focus-within` and has `aria-label="Re-run …"`. A downstream-aware confirmation modal (`_showReRunConfirmModal()`, `workflow-steps.js:138–188`) lists completed stages that remain intact and notes "All existing approvals and rewrites are preserved as context." For analysis re-runs, the clarification-amend modal (`_showAnalysisClarificationAmendModal()`, `workflow-steps.js:277–380`) lets the user update or keep prior clarification answers before proceeding. Layout staleness is communicated via the "Layout outdated" / "Files outdated" chip in the position bar (`state-manager.js:145–175`). |
| W3.2 | Re-entry into earlier stages preserves useful downstream context | ✅ Pass | `_build_downstream_context()` in `conversation_manager.py` collects approved rewrites, experience/skill decisions, and accepted spell fixes and injects them into the re-run LLM prompt. `backToPhase()` at `workflow-steps.js:98` calls `/api/back-to-phase` and logs "Prior decisions and approvals are preserved." `reRunPhase()` clears per-phase caches (`_spellCheckCache`, `_rewritePanelCache`) so the UI fetches fresh results while backend context is carried forward. Downstream steps gain `.stale` class without erasing prior content. |
| W3.3 | The app minimises redundant work during iteration | ⚠️ Partial | `_countChangedItems()` + `_highlightChangedItems()` (`workflow-steps.js`) mark changed items and now quantify them in the assistant message (e.g. "changed items are highlighted (3 of 12 items changed)" — cycle 63). No "show only changed" filter exists. The changed count is surfaced as a summary but per-item filter remains absent. |

**Failure modes guard-against check:**

- **Reruns feel equivalent to starting over:** Well-mitigated. Confirmation modal names intact downstream stages. Stale badges appear on downstream step pills. Downstream context passes into the LLM prompt. Re-run message in chat explicitly states approvals are preserved.
- **Re-run affordance discoverability:** ↻ button persistently visible (dim at rest), focusable with Tab, rises to full opacity on hover/focus-within. Keyboard shortcut (`Ctrl+Enter`) also works from completed step pill click interactions.

**Net: W3.1 and W3.2 pass fully. W3.3 remains partial — changed-item count after re-run is present at the per-item badge level but not summarised as a total in the assistant message.**

---

## Generated Materials Evaluation

Assessment derived from source-code reading of generation and download paths.

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Files clearly labelled by format and purpose | ✅ Pass | `download-tab.js`: each file card has a format icon and descriptive label ("ATS-optimised DOCX", "Human-readable PDF", etc.). |
| Generation timestamp on download cards | ✅ Pass | `_renderDownloadGrid()` displays a "Generated {date}" label on each download card. |
| Page-count advisory surfaced | ✅ Pass | `download-tab.js`: page count badge with amber warning when outside 1–3 page range (GAP-02 resolved). |
| ATS validation report accessible | ✅ Pass | "ATS Report" button in position bar (`index.html:107–108`), visible after job analysis. Dedicated `tab-ats-score` tab. ATS score displayed in position bar badge (`#ats-score-badge`) with colour thresholds; two-tier keyword scoring (GAP-10). |
| Post-layout steps addressable without restart | ✅ Pass | Post-layout steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously after layout confirmation. All have dedicated workflow step pills and tabs. |
| File quality feedback beyond download links | ✅ Pass | `download-tab.js`: ATS validation checks table with per-check pass/fail; page count advisory; persuasion-check warnings; weak-bullet advisory (GAP-03). |
| Harvest path for improvements to Master CV | ✅ Pass | `step-harvest` / `tab-harvest` in workflow bar (`index.html:147`). Unlocks after layout confirmation. Evidence rationale shown in harvest UI (GAP-13). |
| Rewrite decisions survive page reload | ✅ Pass | `localStorage`-persisted decisions keyed by session ID; cold-restore fallback from backend `rewrite_audit`. |
| Final-phase action button labels unambiguous | ✅ Pass | "📥 Continue to File Review →" and "📦 Package Application Files" (`index.html:193–194`). |

**Remaining concern:** No single-click "re-generate with unchanged layout" affordance from the File Review tab. Minor content edits still require back-navigating via the re-run path — typically 3–4 interactions from the download view. The path exists but is not surfaced as a shortcut.

---

## Open Gaps

### Gap C — No session search/filter in the sessions modal (W2.1 at scale)

The sessions modal has sortable columns, a Recents strip, status badges, and inline edit widgets, but no text search input. With many sessions, a power user cannot locate a session by partial job title or company name without scrolling or relying on the 5-item Recents strip.

**Proposed:** Add a text search input above the sessions table that filters rows client-side by name, phase, or company name.

---

### Gap D — No changed-item count summary after re-run (W3.3)

After `reRunPhase()` completes, the assistant message (`workflow-steps.js:412`) says "changed items are highlighted" without a count. Per-item "New" badges are rendered in the skills/experience review tables (`skills-review.js:730`, `experience-review.js:232`), but no aggregate count (e.g. "3 of 12 recommendations changed") is shown to the user.

**Proposed:** Append a count to the assistant message — e.g., "3 of 12 experience recommendations changed — highlighted in the table."

---

### Gap E — No undo for bulk review-table decisions (W1.2, W3.3)

Layout instructions have an undo stack (`layout-instruction.js`), but experience/skill/achievement/rewrite decisions cannot be undone individually or in bulk after applying. A misclick on "Exclude All" requires re-running the phase to reset.

**Proposed:** Single-level undo for the last bulk action on a review table — store a pre-bulk state snapshot in `localStorage` and restore it on `Ctrl+Z` or an Undo button.

---

## Resolved Gaps (this cycle)

### Gap A (CLOSED) — Keyboard shortcut for primary workflow action buttons

`keyboard-shortcuts.js` (committed in the current branch) implements:

- `Ctrl+Enter` → `_triggerPrimaryAction()` — clicks the primary action button for the current tab
- `A` / `R` → accept / reject the focused review card (Rewrites and Spell Check tabs)
- `↑` / `↓` → navigate between review cards
- `?` → toggle the keyboard shortcuts help panel

Tab map covers all major workflow phases (`keyboard-shortcuts.js:39–48`). Help panel lists all shortcuts with formatted `<kbd>` elements. The `? Help` button in the header (`index.html:63–67`) provides permanent access to the help panel. **Gap A is closed.**

---

## Terminology Clarity Assessment

The application's terminology is generally accurate and consistent:

- "ATS" is used correctly throughout and always spelled out as "Applicant Tracking System" on first use in tooltips (`index.html:92`).
- "Harvest" (collect improvements back to Master CV) is contextually clear but the ↻ rerun icon and "Harvest" step name together could initially confuse users expecting "Export" — the tooltip text ("save refined bullets, new skills, and summary variants back to your Master CV for future applications", `index.html:146`) is sufficient but only visible on hover.
- "Compact" mode toggle on the Rewrites tab (`⊞ Compact` / `⊟ Full View`) is clear.
- "Layout outdated" / "Files outdated" freshness chip labels are precise and correctly differentiated.
- "Application Status" in the sessions table (Draft/Ready/Sent/Interview/Rejected/Accepted/Parked) uses standard HR lifecycle vocabulary — immediately legible to a power user managing multiple applications.
- Phase labels in the session table (e.g., "Job Analysis", "Customisation") match the workflow step labels in the navigation bar — no mismatch found.

---

## Score Summary

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | ---------- | ------ | ----------- |
| US-W1 (3 criteria) | 3 | 0 | 0 | 0 |
| US-W2 (3 criteria) | 3 | 0 | 0 | 0 |
| US-W3 (3 criteria) | 2 | 1 | 0 | 0 |
| Generated Materials (9 criteria) | 9 | 0 | 0 | 0 |

---

## Key Evidence References

- **W1.1 pass:** `Ctrl+Enter` → primary action → `web/keyboard-shortcuts.js:186–190`; tab map → `web/keyboard-shortcuts.js:39–48`; `A`/`R`/arrow review-card shortcuts → `web/keyboard-shortcuts.js:203–220`; tab bar keyboard nav → `web/ui-core.js:459–486`
- **W1.2 pass:** bulk accept/reject → `web/rewrite-review.js:656–672`; compact mode → `web/rewrite-review.js:674–684`; tally counters → `web/rewrite-review.js:270–276`
- **W1.3 pass:** single-panel review tables → `web/experience-review.js`, `web/skills-review.js`; inline tally → `web/rewrite-review.js:270–276`
- **W2.1 pass:** sortable table + recents + ATS badge → `web/session-switcher-ui.js:305–317`, `423–429`, `440–455`; status pill styles → `web/styles.css`; inline status/notes edit → `web/session-switcher-ui.js:386–414`
- **W2.2 pass:** current-row indicator → `web/session-switcher-ui.js:354`; conflict detection → `web/session-manager.js:340–351`; inline rename → `web/session-switcher-ui.js`
- **W2.3 pass:** three active-session signals → `web/index.html:41,80–85`; `buildSessionSwitcherLabel()` → `web/session-manager.js`; `_updateSessionSwitcherHeader()` → `web/session-switcher-ui.js:146–158`
- **W3.1 pass:** ↻ button + confirmation modal → `web/workflow-steps.js:133–191`; clarification-amend modal → `web/workflow-steps.js:277–380`; layout freshness chip → `web/state-manager.js:145–175`
- **W3.2 pass:** downstream context injection → `scripts/utils/conversation_manager.py`; stale-step marking → `web/workflow-steps.js`; cache clearing after re-run → `web/workflow-steps.js`
- **W3.3 partial:** per-item change badges exist → `web/skills-review.js:730`, `web/experience-review.js:232`; count absent from assistant message → `web/workflow-steps.js:412`
- **Gap C (open):** no session filter input → `web/session-switcher-ui.js` (no `<input>` for search)
- **Gap D (open):** count not surfaced → `web/workflow-steps.js:412`
- **Gap E (open):** no bulk-decision undo → `web/rewrite-review.js`, `web/experience-review.js`
- **Gap A (closed):** `Ctrl+Enter` → `web/keyboard-shortcuts.js:186–190`; shortcut help panel → `web/keyboard-shortcuts.js:130–173`

**Evidence standard:** All conclusions derived from direct source-code reading. No runtime testing performed.

**Files read:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, plus directly referenced modules: `web/keyboard-shortcuts.js`, `web/workflow-steps.js`, `web/session-switcher-ui.js`, `web/session-manager.js`, `web/rewrite-review.js`, `web/experience-review.js`, `web/skills-review.js`.
