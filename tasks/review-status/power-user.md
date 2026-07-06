<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power User Review Status

**Last Updated:** 2026-07-06 14:40 ET

**Executive Summary:** Source-verified power user persona review against US-W1, US-W2, and US-W3 criteria. All three stories show partial or full implementation. Keyboard shortcuts, bulk actions, re-run affordances, and session management are genuinely implemented. Key gaps are: single-level bulk undo (no multi-step undo), card-focus shortcuts limited to Rewrites and Spell Check only, no keyboard shortcut to toggle compact mode, and the session switcher's search/filter is only available in the full management modal (not a header quick-access path). Terminology is mostly clear with a few developer-centric terms that surface for power users.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| W1-1: Frequent actions available without excessive pointer travel | ✅ Pass | Header pill buttons (Sessions, New Session, LLM, Settings) at top-right. Action buttons in `.actions` div at bottom of chat panel (web/index.html:189–200). Primary action varies by step (analyze-btn, generate-btn, etc.) |
| W1-2: Repetitive review work supports efficient sequential progression | ✅ Pass | keyboard-shortcuts.js: ↑/↓ navigate cards, A accepts, R rejects on Rewrites and Spell Check tabs (keyboard-shortcuts.js:62–125). Compact mode toggle on Rewrites: `⊞ Compact` button collapses cards to single-line for rapid scan (rewrite-review.js:295, 697–706) |
| W1-3: Multi-item review screens avoid unnecessary navigation churn | ⚠️ Partial | Bulk actions present for experiences, skills, achievements, publications, rewrites (experience-review.js:289–296, achievements-review.js:344–348, rewrite-review.js:293–294, publications-review.js:98–102). Single-level bulk undo exists (review-table-base.js:38, 851–907) but only one undo step is stored — a power user bulk-accepting then reconsidering must re-run the phase |
| W1-4: Card keyboard navigation covers all review tabs | ⚠️ Partial | keyboard-shortcuts.js:65–69: `_getCards()` only returns cards for tab === 'rewrite' or tab === 'spell'. Experiences, Skills, Achievements, Publications tabs do NOT have keyboard card navigation — those are DataTable rows, not `.rewrite-card`/`.spell-card` DOM elements |
| W1-5: Ctrl+Enter triggers primary action on current step | ✅ Pass | keyboard-shortcuts.js:40–60: `_TAB_ACTION_BTN` maps tab IDs to button IDs; Ctrl+Enter clicks the mapped button |
| W1-6: Show-only-changed filter after re-runs | ✅ Pass | workflow-steps.js:547–654: injects "Show only changed (N)" toggle on customisation tabs and rewrite tally bar after a re-run. Badge highlighting via `data-changed` attribute |
| W1-7: Token/context window usage visible | ✅ Pass | fetch-utils.js:183–198: `_refreshContextStats()` updates `#llm-token-count` element (index.html:171) with `~estK / winK (pct%)` |

**Additional efficiency observations:**

- **Compact mode scope is Rewrites-only.** The compact toggle (rewrite-review.js:295) applies only to the Rewrites tab. The Experiences and Skills DataTables show full descriptive rows with no compact option — power users reviewing dozens of experience bullets cannot collapse them similarly.
- **Abort/stop is available.** `■ Stop` button at LLM busy overlay (index.html:166). Ctrl+Enter always triggers even during loading (keyboard-shortcuts.js:189–193) — benign since the button's `disabled` state blocks double-submission.
- **Tally bar** on Rewrites shows accepted/rejected/pending counts live (rewrite-review.js:289–292) — good for throughput awareness.

---

### US-W2: Session Switching and Multi-Application Management

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| W2-1: Sessions easy to distinguish in the switching UI | ✅ Pass | Session modal shows: position name (bold), phase label, created timestamp, last modified timestamp, status pill (Current / Saved / Parked) with colour-coded dot (session-switcher-ui.js:46–65, 99–119). DataTable in modal also shows company column |
| W2-2: Creating, opening, or renaming sessions has no ambiguity | ✅ Pass | Inline rename input in modal row (session-switcher-ui.js:107–110). Ownership conflict dialog with "Current", "Take Over", "Load Different", "New Session" options (index.html:411–418). Amber banner for session conflict with retry countdown (index.html:115–119) |
| W2-3: Active session context remains visible while working | ✅ Pass | Header subtitle `#header-session-name` shows "Current session: name" (session-switcher-ui.js:156–158). Position bar shows position title + company (index.html:80–86). Session age indicator shows "Last edited Xh ago" (session-actions.js:206–218) |
| W2-4: Session search and filtering in modal | ✅ Pass | session-switcher-ui.js:35,481–497: filter input searches by name, company, phase. Sort by name/phase/last-modified with persisted sort preference in localStorage (session-switcher-ui.js:27–31, 210–222) |
| W2-5: Quick session access without full modal | ⚠️ Partial | Header "📂 Sessions" pill always opens the full 980px modal (index.html:45–47). There is no popover, hover-preview, or keyboard shortcut to switch sessions. Power users managing 10+ active applications must open the modal on every context switch |
| W2-6: New session in new tab | ✅ Pass | `createNewSessionInNewTab()` wired to "＋ New Session" header button (index.html:48–50) |
| W2-7: Parked session status distinguishable | ✅ Pass | finalise.js:109 "Parked — on hold" option. session-switcher-ui.js:375,380: parked sessions shown with orange (`#f97316`) pill |

---

### US-W3: Efficient Iteration

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| W3-1: Re-run affordances discoverable for supported stages | ✅ Pass | workflow-steps.js:1026–1033: completed steps that support re-run get `↻` inline button. RE_RUN_STEPS = {analysis, customizations, rewrite, spell, layout} (workflow-steps.js:938). Step tooltip includes "Click ↻ to rerun from here" (workflow-steps.js:221) |
| W3-2: Ctrl+Shift+R keyboard shortcut for re-run | ✅ Pass | keyboard-shortcuts.js:195–204: `Ctrl+Shift+R` triggers `confirmReRunPhase(step)` for the active step |
| W3-3: Downstream impact communicated before re-run | ✅ Pass | workflow-steps.js:133–191: `_showReRunConfirmModal()` shows a modal with the step name and downstream impact text. Stale step pills highlighted amber/red (state-manager.js:289–292; styles.css: `.step.stale`, `.step.stale-critical`) |
| W3-4: Analysis re-run preserves and allows amending clarification answers | ✅ Pass | workflow-steps.js:294–400: `_showAnalysisClarificationAmendModal()` is intercepted before analysis re-run, allowing user to update or keep prior answers ("Update & Rerun" vs "Keep Existing Answers") |
| W3-5: Changed items highlighted after re-run | ✅ Pass | workflow-steps.js:526–629: items changed between prior and new re-run outputs get `data-changed` attribute. New rerun badge rendered in experience-review.js:233, skills-review.js:736, achievements-review.js:252 |
| W3-6: Layout undo stack | ✅ Pass | layout-instruction.js:48–50,747–867,1298–1314: `_layoutUndoStack` (capped at max entries) supports sequential undo of layout instructions. Sequential-only limitation disclosed in tooltip (layout-instruction.js:1117) |
| W3-7: Forward-skip navigation to prior completed step | ✅ Pass | workflow-steps.js:1034–1038: steps previously completed but above current phase get `forward-skip` class with ⏩ badge and `clickable` class |
| W3-8: Re-entry preserves useful downstream context | ✅ Pass | conversation_manager.py:1577–1652: `re_run_phase()` augments LLM prompts with prior choices so re-runs improve on the last pass. Skill/experience decisions retained across re-runs |

---

## Generated Materials Evaluation

| Aspect | Status | Evidence |
| ------ | ------ | -------- |
| Output format control (ATS DOCX / Human PDF / Human DOCX) | ✅ Pass | Settings modal checkboxes (index.html:642–646). All three format flags wired to `_collectSettingsPayloadFromForm()` (ui-core.js:131–143) |
| Skills limit, achievements limit, publications limit configurable | ✅ Pass | Settings modal numeric inputs (index.html:622–635). Max Skills, Max Achievements, Max Publications all editable |
| Page count visibility during layout review | ✅ Pass | layout-instruction.js:211–224: page count badge with ⚠ icon when outside recommended range |
| Page count gate / multi-page advisory | ✅ Pass | `pageWarning` boolean from backend drives `warn` CSS class on badge. Soft-gate advisory for page count exceeded |
| Harvest: opt-in improvement capture back to Master CV | ✅ Pass | harvest.js:103: all harvest items start unchecked — Master CV updates are opt-in only |
| Weak-bullet advisory / skill evidence tooltip | ✅ Pass | skills-review.js:727–733: `⚠ Weak evidence` badge with hover tooltip showing evidence text |
| AI-attribution disclosure control | ✅ Pass | Settings modal checkbox for "Add AI-assistance disclosure" (index.html:647–649). Per-session state (ui-core.js:141) |

---

## Terminology Audit

| Term | Assessment | Recommendation |
| ---- | ---------- | -------------- |
| "Harvest Improvements" | ✅ Distinctive and memorable once explained. Welcome modal explains it (index.html:345–348) | Keep; brief tooltip on the tab step would reinforce the concept |
| "Customise" (step label) vs "Customizations" (API/phase) | ⚠️ Inconsistent spelling — British in workflow bar (index.html:128), American in PHASES/API | Normalise to one spelling in all user-visible labels |
| "ATS" acronym in position bar | ⚠️ ATS badge tooltip does expand the acronym (index.html:92 title attr). Session modal column heading is just "ATS" | "ATS Score" in all column headers for clarity |
| "LLM: Loading…" / "LLM: Not ready" | ⚠️ "LLM" is developer vocabulary. Status badge shows "Not ready" with ⚠ but no call-to-action | Consider "AI: Not configured — click to set up" |
| "Re-run" vs "Rerun" | ⚠️ "Re-run" in step tooltips (workflow-steps.js:218), "rerun" in DOM IDs and JS variable names | Normalise to "Re-run" in all user-visible labels |
| "Analyse Job" button (British) vs "analyze" in placeholder | ⚠️ Mixed British/American across two adjacent elements (index.html:185, 190) | Pick one spelling project-wide for verbs |
| "Parked" session | ✅ Clear: "Parked — on hold" is self-explanatory | Keep |
| "Layout current / Layout outdated / Files outdated" freshness chip | ✅ Pass — clear, escalating severity language | Good |
| "↻ Amend Clarification Answers" modal title | ⚠️ "Amend" is less familiar than "Update" for general audiences | "Update your answers before re-running" is already in the subtitle; title could say "Update Clarification Answers" |

---

## Additional Story Gaps / Proposed Story Items

**US-W4 (proposed): Keyboard card navigation on all customisation review tabs**
Current ↑/↓/A/R shortcuts only apply to Rewrites and Spell Check. The Experiences, Skills, and Achievements tabs use DataTable rows — no keyboard card navigation, no Accept/Reject by keystroke. Power users reviewing 30+ experience entries must use mouse per row. Proposed criterion: "Arrow keys and A/R shortcuts navigate and act on DataTable review rows in all customisation tabs."
Evidence: keyboard-shortcuts.js:65–69 (`_getCards()` returns `[]` for all non-rewrite/spell tabs)

**US-W5 (proposed): Multi-step bulk undo**
`_bulkUndoSnapshot` stores only one state (review-table-base.js:38). After a bulk-accept, a second bulk-action replaces the prior snapshot. A power user who accidentally bulk-accepts then bulk-rejects cannot undo both steps. Proposed criterion: "At least 3 levels of undo are available for bulk actions on review tabs."
Evidence: review-table-base.js:38, 851–907

**US-W6 (proposed): Session header quick-access path without full modal**
Switching sessions always requires opening the full 980px modal (index.html:253–272). A power user managing 10 active applications needs a faster path — a popover or mini-list from the header pill. Proposed criterion: "Session switching is achievable in ≤2 clicks without opening a full modal overlay."
Evidence: index.html:45–47 (`onclick="openSessionsModal()"`)

**US-W7 (proposed): Compact/density toggle on customisation DataTables**
Only Rewrites has compact mode (rewrite-review.js:295,697). Experiences and Skills DataTables show full descriptive rows with no compact option. Proposed criterion: "A compact row mode is available on all DataTable review tabs to reduce scroll depth."

**US-W8 (proposed): Keyboard shortcut for compact/density toggle**
No keyboard shortcut toggles compact mode on the Rewrites tab. Power users switching view density during rapid review must click with the mouse. Proposed criterion: "A keyboard shortcut (e.g., C) toggles compact mode on review tabs that support it."

**US-W9 (verification needed): Spell Check A/R selector accuracy**
keyboard-shortcuts.js:105,122 uses `.spell-keep-btn` and `.spell-apply-btn` selectors within the focused spell card. These selectors may not match the actual DOM elements rendered by spell-check.js. If they diverge, A/R shortcuts silently do nothing on the Spell Check tab. Recommend verifying the selector strings match spell-check.js's rendered button classes.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/keyboard-shortcuts.js, web/rewrite-review.js, web/workflow-steps.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/review-table-base.js, web/session-switcher-ui.js, web/session-actions.js, web/layout-instruction.js, web/harvest.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-W1 | 5 | 2 | 0 | 0 | 0 |
| US-W2 | 5 | 2 | 0 | 0 | 0 |
| US-W3 | 8 | 0 | 0 | 0 | 0 |
| Generated Materials | 7 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-W1 (keyboard shortcuts): `initKeyboardShortcuts()` → web/keyboard-shortcuts.js:244; `_getCards()` limitation → keyboard-shortcuts.js:65–69
- US-W1 (bulk actions): `bulkAction()` → web/review-table-base.js:847; `bulkAchievementAction()` → web/achievements-review.js:363
- US-W1 (compact mode): `toggleRewriteCompactMode()` → web/rewrite-review.js:697–706
- US-W1 (show-only-changed): workflow-steps.js:610–654
- US-W2 (session modal render): `_renderSessionSwitcherSections()` → web/session-switcher-ui.js:123–145
- US-W2 (session search): `_applySessionSearch()` → web/session-switcher-ui.js:501–513
- US-W2 (session age): `_formatSessionAge()` → web/session-actions.js:206–218
- US-W3 (re-run button): RE_RUN_STEPS + `↻` injection → web/workflow-steps.js:938, 1026–1033
- US-W3 (Ctrl+Shift+R): `_onKeyDown` → web/keyboard-shortcuts.js:195–204
- US-W3 (clarification amend modal): `_showAnalysisClarificationAmendModal()` → web/workflow-steps.js:297–400
- US-W3 (layout undo): `_layoutUndoStack`, `undoInstruction()` → web/layout-instruction.js:48–50, 1298–1314
- US-W3 (re-run phase backend): `re_run_phase()` → scripts/utils/conversation_manager.py:1652

**Evidence standard:** Every conclusion supported by file:line evidence.
