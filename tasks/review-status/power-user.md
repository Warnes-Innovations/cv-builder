<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power User Review Status

**Last Updated:** 2026-07-06
**Cycle:** Source-first review (cycle 92+)
**Branch:** feature/multi-user-deployment

**Executive Summary:** Source-verified review against US-W1, US-W2, and US-W3. Keyboard A/R
shortcuts now cover all customizations sub-tabs including publications (confirmed via
keyboard-shortcuts.js GAP-332). Bulk actions with single-level undo are implemented for
experience, skills, and achievements. Four gaps remain: (1) `kb-focused` CSS is missing for
DataTable rows so keyboard focus in customizations tables has no visual indicator; (2) the
keyboard shortcut help panel is undiscoverable and its text omits customizations A/R support;
(3) publications bulk actions lack undo unlike the other three sub-tabs; (4) rewrite
"Accept All"/"Reject All" also have no undo.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| W1-1: Frequent actions available without excessive pointer travel | ✅ Pass | Header pill buttons (Sessions, New Session, LLM, Settings) at top-right. Action buttons in `.actions` div at bottom of chat panel (index.html:189–200). |
| W1-2: Repetitive review work supports efficient sequential progression | ✅ Pass | keyboard-shortcuts.js: ↑/↓ navigate cards, A accepts, R rejects on Rewrites, Spell Check, and all customizations sub-tabs (lines 62–182). Auto-scroll to next pending rewrite card after each decision (`_scrollToNextPendingRewrite`, rewrite-review.js:521–532). |
| W1-3: Multi-item review screens avoid unnecessary navigation churn | ⚠️ Partial | Bulk actions present on all review sub-tabs and rewrite panel. Single-level bulk undo exists for experience, skills, achievements but NOT publications and NOT rewrite Accept All/Reject All. |
| W1-4: Keyboard A/R on DataTable customizations tabs — experience, skills, achievements | ✅ Pass | `_getCards()` returns DataTable rows for all three panes when `tab === 'customizations'`; A/R dispatch to `handleActionClick` with correct type (keyboard-shortcuts.js:64–182). |
| W1-5: Keyboard A/R on publications sub-tab | ✅ Pass | GAP-332: `if (pane === 'publications') return [...document.querySelectorAll('#publications-review-table tbody tr[data-cite-key]:not(.pub-divider-row)')...]` (keyboard-shortcuts.js:76). A dispatches `handlePubAction(citeKey, true)`, R dispatches `handlePubAction(citeKey, false)` (lines 136–138, 173–176). |
| W1-6: Visual feedback when keyboard-navigating DataTable rows | ❌ Fail | **GAP-PU-A**: `styles.css` defines `.rewrite-card.kb-focused` and `.spell-card.kb-focused` (line 1413) but has no rule for `tr.kb-focused`. When ↑/↓ adds `kb-focused` to a DataTable row (experience, skills, achievements, publications), there is zero visual highlight. A/R fire on the right row but the user cannot see which row is focused. |
| W1-7: Ctrl+Enter triggers primary action on current step | ✅ Pass | `_TAB_ACTION_BTN` maps tab IDs to button IDs; Ctrl+Enter clicks the mapped button (keyboard-shortcuts.js:40–60). |
| W1-8: Compact mode for rapid review | ✅ Pass | Rewrites panel: `⊞ Compact` toggle (`toggleRewriteCompactMode`, rewrite-review.js:697–708) collapses cards to single-line view. |
| W1-9: Tally bar for review progress visibility | ✅ Pass | Rewrite tally bar shows accepted/rejected/pending counts live (rewrite-review.js:289–292, `updateRewriteTally`). |
| W1-10: J/K vim-style navigation | ⚠️ Not Impl | No J/K key handling in `_onKeyDown` switch. Only ↑/↓ arrows are mapped for card/row navigation. This is a common power-user expectation noted in the story spec. |

**Observation — Compact mode scope is Rewrites-only.** Experiences and Skills DataTables have no compact row option. Power users reviewing dozens of experience bullets cannot collapse them.

---

### US-W2: Session Switching and Multi-Application Management

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| W2-1: Sessions easy to distinguish in the switching UI | ✅ Pass | Sessions modal shows position name, phase label, timestamps, and status pills. Session name shown in `#header-session-name` and position bar (index.html:41, 79–86). |
| W2-2: Creating, opening, renaming sessions — no ambiguity | ✅ Pass | Rename button (✏️) in position bar (index.html:83). Sessions modal inline rename. Ownership conflict dialog with Take Over / Load Different / New Session options (index.html:405–419). Amber banner with retry countdown for conflicts. |
| W2-3: Active session context remains visible throughout workflow | ✅ Pass | Header subtitle and position bar (job title + company) persist across all workflow stages. |
| W2-4: Quick session access without full modal | ⚠️ Partial | The "📂 Sessions" header button always opens the full 980px modal (index.html:45–47). No popover, hover-preview, or keyboard shortcut switches sessions directly. Power users managing 10+ active applications must open the modal on every context switch. |
| W2-5: New session in new tab | ✅ Pass | `createNewSessionInNewTab()` wired to "＋ New Session" header button (index.html:48–50). |

---

### US-W3: Efficient Iteration

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| W3-1: Re-run affordances discoverable | ✅ Pass | Completed steps get a re-run affordance in the workflow nav. `confirmReRunPhase` is triggered from workflow-steps.js and from `Ctrl+Shift+R`. |
| W3-2: Ctrl+Shift+R keyboard shortcut for re-run | ✅ Pass | keyboard-shortcuts.js:244–253: `Ctrl+Shift+R` triggers `confirmReRunPhase(step)` for the active step. |
| W3-3: Keyboard shortcut discoverability | ❌ Fail | **GAP-PU-D**: The `?` key toggles the shortcut help panel (`showKeyboardShortcutsPanel`, keyboard-shortcuts.js:188), but there is no visible hint anywhere in the UI that `?` opens it. The "? Help" header button opens the onboarding wizard — not shortcuts — which creates false expectations. Additionally, the panel's table still reads "A: Accept focused card (rewrite / spell)" and "R: Reject focused card (rewrite / spell)" — this is incomplete since A/R also work on all four customizations sub-tabs since GAP-332. A user reading the panel would not know A/R are available there. |
| W3-4: Re-entry into earlier stages preserves context | ✅ Pass | Rewrite decisions persisted in localStorage (keyed by session ID) and restored on reload (`_restoreDecisions`, rewrite-review.js:59–100). Backend `back_to_phase()` preserves all prior decisions. |
| W3-5: App minimizes redundant work during iteration | ✅ Pass | Change-status badges ("🆕 New" / "↻ Updated") in rewrite cards flag what changed since the previous run. Rewrite audit log available for review history. |
| W3-6: Layout undo stack | ✅ Pass | layout-instruction.js: sequential undo of layout instructions via `_layoutUndoStack`. |

---

## Bulk Undo Coverage Matrix

| Sub-tab / context | Bulk actions present | Undo present | Status |
| --- | --- | --- | --- |
| Experience review | ✅ Yes | ✅ Yes — `undoBulkAction('experience')` (review-table-base.js:915) | Pass |
| Skills review | ✅ Yes | ✅ Yes — `undoBulkAction('skill')` (review-table-base.js:915) | Pass |
| Achievements review | ✅ Yes | ✅ Yes — `undoBulkAchievementAction()` (achievements-review.js:388) | Pass |
| Publications review | ✅ Yes — Accept Recommended, Accept All, Reject All | ❌ No undo button; `bulkPubAction()` takes no snapshot | **GAP-PU-E** |
| Rewrite panel | ✅ Yes — Accept All, Reject All | ❌ No undo; `acceptAllRewrites()`/`rejectAllRewrites()` take no snapshot | **GAP-PU-C** |

---

## Generated Materials Evaluation

| Aspect | Status | Evidence |
| ------ | ------ | -------- |
| Output format control (ATS DOCX / Human PDF / Human DOCX) | ✅ Pass | Settings modal checkboxes (index.html:642–646) wired to `_collectSettingsPayloadFromForm()` (ui-core.js:131–143). |
| Skills / achievements / publications limits configurable | ✅ Pass | Settings modal numeric inputs (index.html:622–635). |
| Page count visible during layout review | ✅ Pass | layout-instruction.js: page count badge with ⚠ when outside recommended range. |
| Harvest: opt-in improvement capture | ✅ Pass | harvest.js: all items start unchecked — Master CV updates are opt-in. |
| Weak-bullet / skill evidence advisory | ✅ Pass | skills-review.js: `⚠ Weak evidence` badge. Rewrite cards show `⚠ Weak evidence` for skill-add rewrites with weak evidence (rewrite-review.js:396–399). |
| AI attribution disclosure control | ✅ Pass | Settings modal checkbox (index.html:647–649). |

---

## Terminology Audit

| Term | Assessment |
| ---- | ---------- |
| "Harvest Improvements" | Distinctive once explained; welcome modal covers it. |
| "Customise" (step label) vs "Customizations" (phase/API) | Mixed British/American spelling across the UI. |
| "LLM: Not ready" header status | Developer vocabulary; "AI: Not configured" would be clearer for non-technical users. |
| "Analyse Job" button (British) vs "analyze" placeholder | Mixed spellings on adjacent elements (index.html:185, 190). |

---

## Gap Summary

| ID | Description | Severity | Status |
| ---- | ----------- | -------- | ------ |
| GAP-PU-A | `kb-focused` CSS missing for DataTable rows — no visual indicator when ↑/↓ navigate customizations tables (experience, skills, achievements, publications) | HIGH | OPEN |
| GAP-PU-B | J/K vim-style navigation not implemented; only ↑/↓ arrows work | LOW | OPEN |
| GAP-PU-C | Rewrite "Accept All" / "Reject All" have no undo (unlike experience/skills/achievements) | MEDIUM | OPEN |
| GAP-PU-D | Shortcut help panel undiscoverable (no hint in UI); panel text omits customizations A/R support; "? Help" header button opens wrong destination | HIGH | OPEN |
| GAP-PU-E | Publications bulk actions lack undo — inconsistent with experience, skills, and achievements sub-tabs | MEDIUM | OPEN |
| US-W6 (prior) | Session switching always requires opening full 980px modal — no quick-access path | LOW | OPEN |
| US-W7 (prior) | Compact/density mode applies to Rewrites only; no compact option for DataTable tabs | LOW | OPEN |

---

## Overall Assessment

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | --------- | ------ | ---------- |
| US-W1 | 7 | 1 | 1 | 1 |
| US-W2 | 4 | 1 | 0 | 0 |
| US-W3 | 4 | 0 | 1 | 0 |
| Generated Materials | 6 | 0 | 0 | 0 |

The core power-user efficiency layer is substantially complete: keyboard A/R shortcuts now
work on all five review contexts (rewrite, spell, experience, skills, achievements,
publications — GAP-332 confirmed by source). Bulk actions are present everywhere. Session
management supports multi-application parallel work.

The two HIGH-severity gaps are: (1) no visual CSS for keyboard focus on DataTable rows
(A/R fire correctly but the user cannot see which row is focused), and (2) the shortcut
help panel is hidden behind an undiscoverable keypress and contains outdated text. Both
are low-effort fixes with high power-user impact.

**Key evidence references:**

- A/R on publications: `keyboard-shortcuts.js:76, 136–138, 173–176`
- `kb-focused` CSS gap: `styles.css:1413` (only rewrite/spell cards defined)
- Bulk undo for experience/skills: `review-table-base.js:38, 915`
- Bulk undo for achievements: `achievements-review.js:85, 388`
- Publications bulk — no undo: `publications-review.js:295–320`
- Rewrite bulk — no undo: `rewrite-review.js:680–695`
- Shortcut panel text: `keyboard-shortcuts.js:204–214`
- "? Help" button destination: `index.html:63–66` (`onclick="showWelcomeModal()"`)
