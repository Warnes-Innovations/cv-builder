<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# Power User Review Status

**Last Updated:** 2026-06-18 (Cycle 3)
**Reviewer persona:** Power user — frequent applicant processing multiple sessions, values speed, low-friction review, and keyboard-efficient interaction.
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/session-switcher-ui.js, web/session-manager.js, web/experience-review.js, web/skills-review.js, web/rewrite-review.js, web/publications-review.js, web/spell-check.js, scripts/web_app.py, scripts/utils/conversation_manager.py

**Executive Summary:** All three story verdicts are unchanged from cycle 2. US-W2 (session switching) passes on all three criteria. US-W3 (efficient iteration) passes context preservation and minimised redundant work but remains partial on affordance discoverability (↻ re-run icon is opacity:0 at rest). US-W1 (high-throughput workflow) is partial: bulk toolbars cover Experience, Skills, Achievements, and Rewrites but spell-check and publications still have no bulk-accept path; no keyboard shortcuts exist for any workflow navigation.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

#### Criterion 1 — Frequent actions without excessive pointer travel

⚠️ Partial

Bulk action toolbars are present on four of the major review panes:

- **Experiences** (`web/experience-review.js:245–248`): "✨ Accept All Recommended", "➕ Emphasize All", "✓ Include All", "👁 Exclude All"
- **Skills** (`web/skills-review.js:945–948`): same four bulk buttons
- **Achievements** (via `bulkAchievementAction()`): same four bulk buttons
- **Rewrites** (`web/rewrite-review.js:134–135`): "✓ Accept All" (`acceptAllRewrites()`) and "✗ Reject All" (`rejectAllRewrites()`) in the tally bar; bulk acts only on cards not yet decided

All DataTable-backed bulk actions apply to filtered rows via `bulkAction()` in `web/review-table-base.js` — a power-user affordance (filtering reduces the affected set).

Missing bulk paths:
- **Spell-check**: no "Accept All" or "Dismiss All" in `web/spell-check.js` (confirmed: no match on "bulk" or "Accept All" in that file); each flag must be resolved individually
- **Publications**: per-row include/exclude only (`web/publications-review.js:152–156`); no bulk toolbar rendered; confirmed: no `.bulk-toolbar` in that file

No keyboard shortcuts exist for any workflow navigation. Keyboard bindings confirmed in source:
- `Enter` — send chat message (`web/app.js:116`, `web/ui-core.js:547`)
- `Escape` — close all modals (`web/ui-core.js:558–562`)
- `ArrowLeft` / `ArrowRight` / `Home` / `End` — second-nav tab-bar navigation (`web/ui-core.js:524–540`)
- `Enter` / `Space` — activate focused tab (`web/ui-core.js:517–521`)

**No** Alt+→ stage advance, Alt+A analyze, Alt+G generate, Alt+R re-run, or any other workflow shortcut was found in any `web/*.js` file.

---

#### Criterion 2 — Efficient sequential progression

⚠️ Partial

The customization stage exposes nine panes (Goals → Questions → Experiences → Experience Bullets → Skills → Achievements → Tagline → Summary → Publications) navigated via pane-footer buttons. No jump-to-pane affordance exists; users traverse panes in fixed order. The workflow progress bar does not expose a direct link to a specific customization sub-pane.

The re-run confirm modal (`web/workflow-steps.js:138–188`) fires before every stage re-entry. It correctly lists downstream stages and states "All existing approvals and rewrites are preserved as context", but there is no "Don't ask again this session" option. This adds a mandatory confirmation click per iteration loop.

Contextual action buttons (`web/index.html:183–191`) stay visible once a stage unlocks, reducing pointer travel on the primary happy path. The chat panel provides `Enter` to submit and action buttons trigger async calls with appropriate loading overlays.

---

#### Criterion 3 — Multi-item review without navigation churn

✅ Pass

`updateTabBarForStage()` (`web/ui-core.js:607–616`) and `STAGE_TABS` (`web/ui-core.js:350–363`) filter the second nav bar to show only panes for the current stage. The Customizations stage exposes all nine sub-tabs simultaneously without hiding any behind a secondary modal.

The rewrite tally bar (`web/rewrite-review.js:130–138`) gives a running count of Accepted / Rejected / Pending without leaving the panel. The ATS score badge (`web/index.html:86–97`) is permanently visible in the position bar across all tabs. Page estimate on the Experiences pane updates live as decisions change.

---

### US-W2: Session Switching and Multi-Application Management

#### Criterion 1 — Sessions easy to distinguish

✅ Pass

The sessions modal renders a sortable table with four columns: Name, Status, Phase, Modified (`web/session-switcher-ui.js:298–311`). Each row shows `position_name` (inferred "Title at Company" label from backend logic in `scripts/web_app.py`), a phase badge, and last-modified timestamp. A "Recent" strip above the table (`web/session-switcher-ui.js:368–384`) shows the five most-recently-modified sessions with coloured status dots for rapid identification.

Sessions are sortable by Name, Status, Phase, or last-modified date via column headers. Sort preferences persist to localStorage (`web/session-switcher-ui.js:30–31`).

---

#### Criterion 2 — No ambiguity about active session

✅ Pass

`getActiveSessionOwnershipMeta()` (`web/session-manager.js:80–100`) surfaces four ownership states: "Current tab", "Owned by this tab", "Owned by another tab", "Unclaimed". Action cells show a greyed-out "Current" label for the active session and an "Open" link for others, making the active session unambiguous.

An ownership conflict dialog (`web/index.html:381–395`) fires when a session claimed by another tab is opened, offering "Take Over", "Load Different", and "New Session". An amber session-conflict banner appears on any 409 Conflict HTTP response via the global fetch interceptor (`web/ui-core.js:449–466`).

---

#### Criterion 3 — Active context visible while working

✅ Pass

The position bar row (`web/index.html:69–107`) is always rendered in the fixed header and contains:
- `#position-title` — job position name, visible across all tabs
- `#rename-session-btn` — inline pencil icon, appears once a title is set
- ATS score badge and layout freshness chip — remain visible from any tab
- Header subtitle `#header-session-name` — shows "Current session: PositionName" below the app title (`web/index.html:41–42`)

The `📂 Sessions` button updates its label to "PositionName · phase" via `buildSessionSwitcherLabel()` in `web/session-manager.js:71–78`, giving constant context from the header.

---

### US-W3: Efficient Iteration

#### Criterion 1 — Re-run affordances discoverable

⚠️ Partial

Completed step pills in the workflow progress bar have a ↻ re-run `<span>` injected for stages: analysis, customizations, rewrite, spell (`RE_RUN_STEPS` at `web/workflow-steps.js:620`). However, that span is **opacity:0 by default** and becomes visible only via CSS `:hover` on the parent `.step.completed` element (`web/workflow-steps.js:723`):

```javascript
s.textContent = '.step.completed:hover .step-rerun { opacity: 1 !important; }';
```

A power user who has not moused over each completed step will not discover that re-run exists. Only the layout stage has a persistent affordance — the "Layout outdated" / "Files outdated" freshness chip renders visibly at rest (`web/state-manager.js:144–176`; `web/index.html:95`).

Clicking the ↻ calls `confirmReRunPhase(step)` → `_showReRunConfirmModal(step, 'rerun', ...)` (`web/workflow-steps.js:190–192`), listing downstream stages and noting context preservation.

Back-navigation to any completed step is supported via `backToPhase()` (`web/workflow-steps.js:98–128`) by clicking the step pill.

---

#### Criterion 2 — Re-entry preserves useful downstream context

✅ Pass

`backToPhase()` POSTs to `/api/back-to-phase`, which sets `stale_steps` for downstream stages and `iterating=True` without clearing session state. Fields `approved_rewrites`, `experience_decisions`, `skill_decisions`, `spell_audit`, and `customizations` are preserved intact in `ConversationManager.state` (`scripts/utils/conversation_manager.py:88–123`).

The `_build_downstream_context()` method constructs a plain-English summary of prior decisions injected into the LLM system prompt on re-run, so each new pass builds on the user's previous choices.

`reRunPhase()` (`web/workflow-steps.js:276–319`) supports full LLM re-execution for analysis, customizations, rewrite, and spell. Changed items are highlighted via `_highlightChangedItems()` after the re-run completes (`web/workflow-steps.js:310–380`).

---

#### Criterion 3 — Minimises redundant work

✅ Pass

Stale step pills render with amber `.step.stale` visual state (set via `stale_steps` in status response — `web/workflow-steps.js:682–711`). The layout review panel renders "Layout outdated" or "Files outdated" callout with explicit action options via the freshness chip from `getLayoutFreshnessFromState()` (`web/state-manager.js:120–178`).

Spell-check results are cached in `window._spellCheckCache` and reused on back-navigation without re-running LanguageTool. Rewrite panel state is similarly cached in `window._rewritePanelCache` — cleared only on explicit re-run (`web/workflow-steps.js:297–299`).

---

## Generated Materials Evaluation

— N/A. This persona story evaluates throughput, iteration efficiency, and session management. Generated output files (CV PDF, DOCX, ATS DOCX) are not in scope for power-user interaction quality assessment.

---

## Power-User Feature Matrix

| Feature                          | Status          | Evidence                                                                                        |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| Keyboard shortcuts (workflow)    | ❌ None         | No Alt/Ctrl `keydown` handlers in any `web/*.js`; only Enter (send) and Escape (modal close)   |
| Bulk accept/reject rewrites      | ✅ Present      | `web/rewrite-review.js:134–135` — "✓ Accept All" and "✗ Reject All" in tally bar              |
| Bulk actions — experience/skills | ✅ Full         | `web/experience-review.js:245–248`, `web/skills-review.js:945–948` — 4 bulk buttons each      |
| Bulk actions — achievements      | ✅ Full         | 4 bulk buttons via `bulkAchievementAction()`                                                    |
| Bulk actions — publications      | ❌ None         | `web/publications-review.js` — per-row only; no bulk toolbar found                             |
| Bulk accept/reject spell-check   | ❌ None         | `web/spell-check.js` — no "Accept All"; each flag resolved individually                        |
| Forward stage skip               | ❌ None         | Phases traverse in fixed order; no skip affordance                                              |
| Back-nav (all stages)            | ✅ Full         | `backToPhase()` covers job → layout; prior state preserved                                     |
| Re-run affordance (visible)      | ⚠️ Hover-only  | `web/workflow-steps.js:723` — ↻ icon opacity:0 at rest; revealed only on :hover                |
| Re-run context preservation      | ✅ Full         | `conversation_manager.py` preserves all decisions; `_build_downstream_context()` in LLM prompt |
| Changed-item highlighting        | ✅ Full         | `_highlightChangedItems()` in `web/workflow-steps.js:332–381` — DOM elements marked            |
| Sortable session table           | ✅ Full         | `web/session-switcher-ui.js:298–311` — sortable by Name, Status, Phase, Modified               |
| Recent sessions strip            | ✅ Full         | `web/session-switcher-ui.js:368–384` — top-5 most-recent with status dots                     |
| Inline session rename            | ✅ Full         | `web/session-switcher-ui.js` — Enter to save, Escape to cancel                                 |
| Active session context           | ✅ Full         | Position bar always visible; `#header-session-name` subtitle                                   |
| Settings source labels           | ✅ Full         | `_renderSettingsSources()` in `web/ui-core.js:79–101` — env var / .env / config.yaml labels   |
| LLM abort (in-flight)           | ✅ Full         | "■ Stop" in LLM busy overlay (`web/index.html:169`); `abortCurrentRequest()`                  |
| Custom prompt injection          | ❌ None         | No user-facing system-prompt override in Settings; `_collectSettingsPayloadFromForm()` at `web/ui-core.js:123–143` has no prompt field |
| Confirmation bypass ("don't ask")| ❌ None         | Re-run confirm modal fires on every re-run with no suppress option (`web/workflow-steps.js:138`) |

---

## Terminology Clarity

- **"Recommend Customisations"** / **"Customisations"** / **"Finalise"** — British spelling is consistent throughout. Not a clarity problem for the target user, but may surprise US-locale users.
- **"Layout outdated" / "Files outdated"** freshness chips — unambiguous; clearer than "stale" as user-facing language.
- **Bulk toolbar labels** ("✨ Accept All Recommended", "✓ Include All") — precise and scannable; the ✨ prefix efficiently signals "AI recommendation" to a power user.
- **Session ownership labels** ("Owned by another tab", "Current") — precise enough for multi-tab coordination.
- **Settings source labels** ("env var `LLM_PROVIDER`", "config.yaml default") — excellent power-user affordance; reduces guessing about where a value originates.
- **Re-run confirm modal** downstream-stage list — correctly communicates that context travels forward; the note "All existing approvals and rewrites are preserved as context" is well-placed.
- **Phase label in session table** — "Job Analysis", "Customisation", "Spell Check" etc. match the workflow step bar labels, reducing cognitive load when scanning sessions.

---

## Story Tally

| Story | Result       | Summary                                                                                                              |
| ----- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| US-W1 | ⚠️ Partial  | Bulk covers experience/skills/achievements/rewrites; absent for spell-check/publications; no keyboard shortcuts; sequential pane traversal only |
| US-W2 | ✅ Pass      | Session labels, ownership metadata, sortable table, recent strip, and position bar meet all three criteria           |
| US-W3 | ⚠️ Partial  | Re-run context preservation ✅; minimised redundant work ✅; re-run affordance discoverability ⚠️ (hover-only ↻)    |

---

## Top Gaps

1. **No keyboard shortcuts for workflow navigation** (High severity) — Zero keyboard acceleration for any stage action (analyze, recommend, generate, advance, accept-all, re-run). Power users must navigate entirely by mouse across an 8-stage, multi-pane workflow that can span 30+ minutes. Evidence: no Alt/Ctrl `keydown` handlers in any `web/*.js` file beyond Enter (send) and Escape (modal close).

2. **Re-run affordance is hover-only and invisible at rest** (Medium severity) — The ↻ icon injected into completed step pills is `opacity:0` until hover (`web/workflow-steps.js:723`). A power user processing sessions from memory will not reliably discover re-run exists. The layout stage is the only exception (persistent freshness chip). All other re-runnable stages (analysis, customizations, rewrite, spell) depend on accidental hover discovery.

3. **No bulk accept for spell-check** (Medium severity) — The spell-check panel resolves flags one at a time. For a document with 15–25 flagged items (typical CV with technical jargon), there is no "Accept All" or "Dismiss All" path. Evidence: `web/spell-check.js` — no `.bulk-toolbar`, no bulk-accept function confirmed.

4. **Bulk toolbar absent for publications** (Low-Medium severity) — Publications pane has per-row include/exclude only (`web/publications-review.js:152–156`), inconsistent with the Experience, Skills, and Achievements panes that all have four-button bulk toolbars. Academic users with 20–50 publications must click individually. The existing `bulkAction()` infrastructure in `web/review-table-base.js` could serve this pane with minimal work.

5. **No confirmation bypass for re-run modal** (Low severity) — The re-run confirm modal fires on every re-run with no "Don't ask again this session" option (`web/workflow-steps.js:138`). For a power user running multiple iteration loops per session, this adds a mandatory pointer-click per cycle with no value after the first occurrence.

6. **No custom prompt injection surface** (Low severity) — No freeform "instructions to AI" field for power users to guide LLM behaviour across all stages (e.g., "avoid first-person phrasing", "prefer active verbs"). Settings modal exposes model/temperature but not user-controlled system-prompt context; `_collectSettingsPayloadFromForm()` (`web/ui-core.js:123–143`) has no such field.

---

## Proposed Story Items

- **US-W4: Keyboard shortcut layer** — Power users can trigger common workflow actions via keyboard: Alt+→ / Alt+← to advance/retreat stages, Alt+A to analyze, Alt+G to generate, Alt+R to re-run current stage. Shortcuts are documented in a discoverable overlay (? key or footer tooltip).

- **US-W5: Bulk accept for spell-check** — "✓ Accept All" and "✗ Dismiss All" buttons appear at the top of the Spell Check panel, applying to visible (filtered) flags. Optional: "Accept All Auto-Corrections" for high-confidence flags only.

- **US-W6: Stage gating override** — Power users can advance past optional stages (Questions, Spell Check) via a "Skip stage →" affordance. The re-run confirm modal offers a "Don't ask again this session" toggle.

- **US-W7: Bulk publications review** — Publications pane receives the same four-button bulk toolbar (Accept All Recommended, Include All, Exclude All, Emphasize All) as the other content panes, reusing the existing `bulkAction()` infrastructure in `web/review-table-base.js`.

- **US-W8: Persistent re-run discoverability** — The ↻ re-run icon renders at reduced opacity (e.g., 0.4) at rest rather than fully hidden, becoming fully opaque on hover. A Settings toggle ("Always show re-run buttons") allows power users to pin them fully visible. At minimum, each completed step's tooltip reads "Click ↻ to re-run" without requiring hover to first discover the icon.

---

**Cycle:** 3 — all conclusions derived from direct source-file reading; no prior review documents, gap lists, or documentation were used as factual inputs. All source citations verified against the current codebase as of 2026-06-18.
