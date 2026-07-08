<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Power-User Review Status

**Last Updated:** 2026-07-07 20:14 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Frequent actions available without excessive pointer travel | ✅ | Global keyboard shortcuts cover the primary loop: `Ctrl+Enter` triggers the current tab's primary action button (`web/keyboard-shortcuts.js:60-68`, `_TAB_ACTION_BTN` map), `A`/`R` accept/reject the keyboard-focused card, `↑`/`↓` move focus between cards (`web/keyboard-shortcuts.js:301-316`). Bulk toolbars ("Accept All Recommended", "Emphasize All", "Include All", "Exclude All", single-level "Undo") exist on every DataTable review surface: experiences (`web/experience-review.js:286-296`), skills (`web/skills-review.js:1053-1060`), achievements (`web/achievements-review.js:338-348`), publications (`web/publications-review.js:97-105`), and rewrites (`acceptAllRewrites()`/`rejectAllRewrites()`, `web/rewrite-review.js:295-297`). All bulk-toolbar classes are styled (`web/styles.css:1584-1600`), and `.kb-focused` keyboard-focus highlighting is styled for both card and DataTable-row layouts (`web/styles.css:1486-1488`). |
| 2 | Repetitive review work supports efficient sequential progression | ✅ | `_moveCardFocus`/`_getCards` (`web/keyboard-shortcuts.js:73-115`) generalizes card navigation across rewrite cards, spell cards, and four separate DataTable review panes (experience/skills/achievements/publications), so the same up/down + A/R muscle memory carries across all review tabs. |
| 3 | Multi-item review screens avoid unnecessary navigation churn | ⚠️ | DataTable-based review tabs (experience, skills, achievements, publications) have search/filter and bulk actions confirmed above. However, **Spell Check has no bulk "Apply All" / "Keep All" action** — `web/spell-check.js` defines only per-suggestion `applyCustomSpellCorrection`, `applySpellReplacement`, `dismissSpellSuggestion` (lines 289-326); no `bulk`/`Accept All`/`Apply All` symbol exists anywhere in the file (confirmed via grep — 0 matches). For a job description with many flagged spelling/grammar issues, a power user must click through every suggestion individually, unlike every other review stage. This is the single most concrete throughput gap found. |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Requiring repeated clicks across distant controls for standard approve/reject flows | ✅ Not present — keyboard shortcuts + inline bulk toolbars keep controls co-located with each row/card (`web/keyboard-shortcuts.js`, `web/review-table-base.js:1008-1071`). |
| No efficient path through large review sets | ⚠️ Partially present — true for spell-check only; all other review tabs have bulk actions. `web/spell-check.js` (no bulk symbol found in full-file grep). |

Additional observation (not in story but power-user relevant): the **File Review / download stage has no "Download All" bulk action** — `web/download-tab.js:190-263` (`_renderDownloadGrid`) renders one `<a class="btn-download">` per file with no aggregate download/zip control. With up to 3-4 generated formats (ATS DOCX, Human PDF, Human DOCX, preview HTML) this is a minor but real repeated-click cost for a user who wants everything at once. Low severity given the small file count, but a natural target for a "download all" affordance.

---

### US-W2: Session Switching and Multi-Application Management

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Sessions easy to distinguish in the session-switching UI | ✅ | Sessions modal splits Active vs Saved sessions (`web/session-switcher-ui.js:124-146`) and renders a sortable/searchable table (name, status, phase, modified — `_renderSessionTableHeader`, `web/session-switcher-ui.js:309-322`) plus a "Recent" strip (`_renderRecentsStrip`, lines 445-461). Each row shows a colored `session-status-pill` (Current tab / Owned by another tab / Unclaimed / Saved — `getActiveSessionOwnershipMeta`, `web/session-manager.js:81-101`, styled at `web/styles.css:363-368`) plus an ATS-score badge and application-status badge (Draft/Ready/Sent/Interview/etc., lines 375-388). Free-text filter by name/company/phase is present (`web/session-switcher-ui.js:494-525`). |
| 2 | Creating/opening/renaming does not create ambiguity about which session is active | ✅ | Distinct flows are deliberately separated: `createNewSessionAndNavigate()` replaces the current tab (`window.location.assign`, `web/session-manager.js:306-319`) while the header "+ New Session" button explicitly calls `createNewSessionInNewTab()` which opens `window.open(..., '_blank')` (lines 321-329) — this lets a power user keep multiple applications open in parallel tabs without accidentally clobbering the current one. Ownership conflicts (session already claimed by another tab) surface a 3-way dialog — Load Different / New Session / Take Over (`web/index.html:426-440`, `showOwnershipConflictDialog`, `web/session-switcher-ui.js:164-197`) rather than silently switching. Inline rename is scoped per-row with explicit Save/Cancel (`startSessionModalRename`/`submitSessionModalRename`, lines 632-668). |
| 3 | Active session context remains visible while working | ⚠️ | The header shows `header-session-name` and updates via `_updateSessionSwitcherHeader()` (`web/session-switcher-ui.js:148-160`), but the label text is only `Session · {phase}` (`buildSessionSwitcherLabel`, `web/session-manager.js:78`) — it does **not** include the job title or company, so two open sessions in the same phase (e.g. two "Customise"-phase applications) would show an identical header label. The actual distinguishing identity (job title/company) lives only in the separate position-bar (`#position-title`, `#position-company`, `web/index.html:81-86`), not in the session-switcher pill itself. This is a partial gap: the session *is* visible, but not distinguishably so from the header alone when several sessions share a phase. |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Losing orientation while switching sessions | ✅ Not present — ownership dialog, status pills, and same-tab vs new-tab creation paths are all explicit. |
| No visible indicator of which session is active | ⚠️ Present in a weak form — header label conflates all same-phase sessions (`buildSessionSwitcherLabel`, `web/session-manager.js:78`), relying on the separate position bar for true disambiguation. |

Additional gap (found, not in story): there is **no keyboard shortcut to open the Sessions modal** or to jump between sessions — `web/keyboard-shortcuts.js`'s shortcut table (lines 214-222) has no entry for `openSessionsModal()`; a power user managing many parallel applications must always reach for the mouse to switch sessions, which cuts against the "keyboard-efficient interaction" framing of this persona.

---

### US-W3: Efficient Iteration

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Re-run affordances discoverable for supported stages | ✅ | Completed workflow steps grow a `.step-rerun` ↻ control (referenced in `applyLayoutFreshnessNavigationState`, `web/workflow-steps.js:61-95`) and tooltips explicitly say "Click ↻ to rerun from here" (`_getStepTooltip`, lines 216-225). A global `Ctrl+Shift+R` shortcut re-runs the currently active phase (`web/keyboard-shortcuts.js:262-271`, documented in the shortcuts panel line 215). The download/File-Review tab also surfaces an explicit "↻ Iterative Refinement" panel with per-stage "↻ Refine Customise / ↻ Refine Rewrites / ↻ Re-analyse Job" buttons (`_renderRefinementPanel`, `web/download-tab.js:265-284`). |
| 2 | Re-entry into earlier stages preserves useful downstream context | ✅ | Backend `back_to_phase()` explicitly preserves all prior decisions/rewrites/customizations and only marks downstream steps `stale` rather than clearing them (`scripts/utils/conversation_manager.py:1725-1758`). `re_run_phase()` builds a `_build_downstream_context()` summary of previously approved rewrites, omitted/emphasized experiences and skills, and accepted spell-check fixes, and feeds it back into the new LLM prompt as `_prior_context` (`scripts/utils/conversation_manager.py:1682-1723, 1780-1856`) — a genuinely well-implemented "improve on last pass, don't restart" iteration model. Frontend confirmation copy reinforces this: "All existing approvals and rewrites are preserved as context" (`web/workflow-steps.js:154`) and "Go back to refine an earlier step — all prior decisions and approvals are preserved" (`web/download-tab.js:269-270`). |
| 3 | App minimizes redundant work during iteration | ✅ | The re-run confirmation modal (`_showReRunConfirmModal`, `web/workflow-steps.js:139-189`) lists exactly which *already-completed* downstream stages will be affected before the user commits, so a power user can judge the blast radius of a re-run before triggering it — avoiding an all-or-nothing restart. Staleness is also tracked structurally (`stale_steps` in Python state, `scripts/utils/conversation_manager.py:1740-1747`; mirrored client-side via `stateManager.setStaleSteps`/`isStepStale`, `web/state-manager.js:290-292`) and surfaced as visual badges ("Outdated"/"Layout outdated"/"Files outdated", `getLayoutFreshnessFromState`, `web/state-manager.js:120-178`). |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Re-runs feel equivalent to starting over | ✅ Not present — explicit "preserved as context" messaging, prior/new output diffing scaffolding (`prior_output`/`new_output` in `re_run_phase()`, `scripts/utils/conversation_manager.py:1777-1859`), and a pre-flight impact list before committing to a re-run. |

This is the strongest-scoring story of the three — both frontend affordances and backend state semantics are aligned and mutually reinforcing.

---

## Generated Materials Evaluation

Not applicable for this persona/story set — US-W1–W3 concern application-workflow throughput and session management, not the content or formatting of generated CV/cover-letter artifacts. No generated-materials-specific acceptance criteria exist in `tasks/user-story-power-user.md`.

## Additional Story Gaps / Proposed Story Items

- **Spell Check bulk actions**: Every other review stage (experience, skills, achievements, publications, rewrites) has "Accept All"/"Include All"/"Exclude All" bulk toolbars with undo; Spell Check does not (`web/spell-check.js`). Recommend a follow-up story/criterion: "Bulk accept/dismiss affordances exist on every review stage, not a subset."
- **No keyboard shortcut for session switching**: The shortcuts panel (`web/keyboard-shortcuts.js:206-225`) documents 9 shortcuts but none open the Sessions modal, create a new session, or jump directly to a specific recent session. For a persona explicitly framed around "keyboard-efficient interaction" and "session switching," this is a natural gap the story set should call out explicitly (US-W2 evaluation criteria don't mention keyboard access at all, only "surfaces" in general).
- **Session-switcher header label ambiguity**: `buildSessionSwitcherLabel()` (`web/session-manager.js:78`) produces "Session · {phase}" with no job title/company, so the header alone cannot disambiguate two sessions in the same phase. Recommend either enriching the header label or making US-W2's "active session context remains visible" criterion explicit about needing a *unique*, not just present, identifier.
- **No bulk/aggregate download**: `web/download-tab.js` renders one download link per generated file with no "download all" or zip affordance. Minor given the small file count (typically 2-4 files), but worth a low-priority backlog item.
- **Terminology note**: the app is broadly consistent (Rewrites/Rewrite Review, Layout Review, Spell Check appear the same in workflow bar and tab labels), and re-run language is consistently "↻ Re-run" / "↻ Refine …" across `web/workflow-steps.js` and `web/download-tab.js`. One inconsistency worth flagging for a future terminology pass: the workflow-bar label for the download stage is "File Review" (`web/index.html:141`) while its accompanying sub-tab is literally named "Generated Files" (`tab-final_generate`, `web/index.html:233`) alongside a second tab also called "File Review" (`tab-download`, `web/index.html:234`) — two same-stage tabs with overlapping names ("Generated Files" vs "File Review") could read as duplicates to a fast-moving user scanning tab labels rather than reading content.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/keyboard-shortcuts.js, web/session-switcher-ui.js, web/session-manager.js, web/workflow-steps.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/publications-review.js, web/rewrite-review.js, web/spell-check.js, web/review-table-base.js, web/download-tab.js

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-W1 | 2 | 1 | 0 | 0 | 0 |
| US-W2 | 2 | 1 | 0 | 0 | 0 |
| US-W3 | 3 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-W1: keyboard shortcuts (`A`/`R`/arrows/Ctrl+Enter) → `web/keyboard-shortcuts.js:60-115, 296-319`
- US-W1: bulk review toolbars (experience/skills/achievements/publications/rewrites) → `web/experience-review.js:286-296`, `web/skills-review.js:1053-1060`, `web/achievements-review.js:338-348`, `web/publications-review.js:97-105`, `web/rewrite-review.js:295-297`
- US-W1: Spell Check missing bulk actions → no `bulk`/`Accept All` symbol found in `web/spell-check.js` (grep confirmed)
- US-W2: session status pills / ownership metadata → `web/session-manager.js:81-101`, `web/styles.css:363-368`
- US-W2: same-tab vs new-tab session creation → `web/session-manager.js:306-329`
- US-W2: ownership-conflict 3-way dialog → `web/index.html:426-440`, `web/session-switcher-ui.js:164-197`
- US-W2: header label lacks job-title disambiguation → `web/session-manager.js:78`
- US-W3: re-run confirmation shows downstream impact before proceeding → `web/workflow-steps.js:139-193`
- US-W3: backend preserves prior decisions and builds `_prior_context` for re-runs → `scripts/utils/conversation_manager.py:1682-1858`
- US-W3: stale-step tracking (frontend + backend) → `web/state-manager.js:120-178, 290-292`, `scripts/utils/conversation_manager.py:1740-1747`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
