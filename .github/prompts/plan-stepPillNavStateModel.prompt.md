# Plan: Navigation Browse/Rerun State Model

## TL;DR

The step bar currently conflates two distinct concepts into one visual state: **where the backend workflow IS** (application phase) vs. **what the user is currently LOOKING AT** (view cursor). This causes the bug where browsing back to "Job Input" looks like abandoning progress, and the path home is invisible. The fix introduces a two-signal step pill model and wires back-navigation to distinguish "browse" from "rerun".

---

## Research Findings

### Root Cause
- `updateWorkflowSteps(status)` assigns `.step.active` (blue) to the backend phase step; `.step.completed.clickable` to prior steps.
- `switchTab(tabName)` updates `stateManager.currentTab` but does NOT update step pill classes.
- Result: when browsing to an earlier tab, no step pill changes — the user has no visual anchor for where they came from or where their work is.
- The `active` pill is NOT marked `.clickable` — so the user may not even know they can click it to return.
- `getVisibleStage()` resolves via `currentTab` first, so the view cursor IS tracked in state — just never displayed.

### What Exists (infrastructure)
- `backToPhase(step)` → `POST /api/back-to-phase` — repositions backend phase without clearing downstream (wired to wrong trigger)
- `reRunPhase(step)` → `POST /api/re-run-phase` — re-runs LLM call, stores `prior_X` for diff display (also wrong trigger)
- `_showReRunConfirmModal(step, 'back-nav', callback)` — modal exists but callback is only `switchTab()`, never `backToPhase()`
- `.step.stale` and `.step.stale-critical` CSS already defined (amber/red) — not used on step pills
- `isLayoutStale` spec in `tasks/layout-stale-ui-spec.md` covers only layout step
- GAP-02, GAP-14, GAP-18 all identify this as incomplete

### Two-Concept Confusion
| Concept | Current signal | Problem |
|---------|---------------|---------|
| Backend phase (app state) | `.step.active` (blue) | Doesn't move when user browses |
| Viewing cursor | Nothing visible | Completely invisible |

---

## Steps

### Phase A — CSS/Visual: Separate App-State from View Cursor

**Goal**: Two independent visual signals on step pills — fill encodes app state (where work is), ring encodes view cursor (what's on screen). The ring is unconditional: it always appears on whichever step is currently visible, regardless of app state.

#### Four-State Visual Matrix

Every pill is in exactly ONE of four states, determined by two binary conditions:
- **Is this the app-active step?** (backend `phase` maps to this step)
- **Is this the currently viewed step?** (`stateManager.currentTab` maps to this step)

| App state = this step? | Viewing = this step? | Pill state | CSS classes | Visual |
|---|---|---|---|---|
| ✅ Yes | ✅ Yes | **At home** | `.step.active.viewing` | Blue fill + solid blue ring |
| ✅ Yes | ❌ No | **Home, browsing away** | `.step.active.browsing-away` | Blue fill + pulsing amber ring |
| ❌ No (completed) | ✅ Yes | **Reviewing a past step** | `.step.completed.viewing` | Green fill + solid blue ring |
| ❌ No (completed) | ❌ No | **Done, not in view** | `.step.completed` | Green fill, no ring |

**Upcoming steps** (neither active nor completed): gray fill, no ring, not clickable — unchanged.

**Stale modifier (.stale)**: amber fill tint stacks on top of either `completed` or `active` fill; ring still renders on top. Stale-critical: red tint.

#### Ring Design

- **Blue ring** (`#3b82f6`, `box-shadow: 0 0 0 2px #3b82f6`) = "your eye is here" — unconditionally applied to the viewed step. Echoes the tab-bar active blue, deliberately linking the view cursor to the second-level tabs.
- **Blue ring on `.step.active` when also viewing**: the ring is visually distinguishable from the blue fill because fill is a light blue (`#dbeafe`) while the ring is the saturated brand blue (`#3b82f6`). They read as "fill = state, ring = position" even in the same color family.
- **Amber pulsing ring** (`#f59e0b`) on `.browsing-away`: replaces the blue ring on the active pill when the user is elsewhere. Warm urgency — "your work is waiting here, come back."

#### Animation

`.step.browsing-away` ring pulses: `animation: browsing-pulse 2s ease-in-out infinite` — alternates between `box-shadow: 0 0 0 2px #f59e0b` and `box-shadow: 0 0 0 4px rgba(245,158,11,0.3)`. Slow, gentle. No bounce, no flash.

`.step.viewing` ring: `transition: box-shadow 0.2s ease` only — steady, no pulse. Browsing is calm.

#### Ring Mutual Exclusivity on the Active Pill

- When `active` pill IS the viewed step → `.active.viewing` → blue ring
- When `active` pill is NOT the viewed step → `.active.browsing-away` → amber ring
- **Only one ring at a time on the active pill.** `_updateViewingIndicator` adds `.viewing` to the viewed pill; `updateWorkflowSteps` adds `.browsing-away` to the active pill when they differ. The CSS rule order ensures only the applicable ring color appears.

#### Hover State for Rerun Button

On `.step.completed:hover`, the `↻` span transitions from `opacity: 0` to `opacity: 1` (already implemented). The ring (if present) stays; `↻` appears inside the pill at pill-right. No rerun button on `.step.active` (user presses the step's own action button instead).

#### CSS Changes

1. Add `.step.viewing` — `box-shadow: 0 0 0 2px #3b82f6; transition: box-shadow 0.2s ease`
2. Add `.step.browsing-away` — `box-shadow: 0 0 0 2px #f59e0b; animation: browsing-pulse 2s ease-in-out infinite`
3. Add `@keyframes browsing-pulse`
4. Add `cursor: pointer` to `.step.active` (currently missing — blocks "click to return")
5. **No suppression of `.viewing` on the active pill** — the blue ring appears there too; the light fill vs. saturated ring distinguishes fill from cursor signal

**Files**: `web/styles.css`

#### Tooltips

Bootstrap 5 tooltips (already available) are used so tooltips can be styled and positioned consistently with the rest of the UI. The `data-bs-toggle="tooltip"` attribute is set on each step pill element, and `data-bs-title` is updated dynamically in `updateWorkflowSteps` / `_updateViewingIndicator` whenever state changes.

A single `bootstrap.Tooltip` instance is created per pill on first render and updated by calling `tip.setContent({'.tooltip-inner': newText})` on each re-render (Bootstrap 5 API).

**Tooltip text per state:**

| State                   | Condition                          | Tooltip text                                                                          |
|-------------------------|------------------------------------|---------------------------------------------------------------------------------------|
| At home                 | `active + viewing`                 | "**Active step** — your workflow and current view is here"                            |
| Home, browsing away     | `active + not viewing` (amber ring)| "**Active step** — your workflow is paused here."                                     |
| Reviewing a past step   | `completed + viewing`              | "**Completed** — you are reviewing this step. Click ↻ to rerun."            |
| Done, not in view       | `completed + not viewing`          | "**Completed** — click to review. Click ↻ to rerun."                        |
| Stale (any)             | `stale` modifier added             | Appends: " Results may need updating after upstream changes."                         |
| Stale-critical          | `stale-critical` modifier          | Appends: " Output files are outdated — regeneration required."                        |
| Upcoming                | neither active nor completed       | "**Not yet reached** — complete earlier steps to unlock [Step Name]."                 |

Tooltip placement: `data-bs-placement="bottom"` on all pills. Delay: `show: 400, hide: 100` — fast enough to be responsive, slow enough not to fire on pass-through mouse movement.

**Files**: `web/workflow-steps.js`, `web/styles.css` (tooltip init, no custom CSS needed beyond Bootstrap defaults)

---

### Phase B — JS: Emit Viewing Indicator on Tab/Step Switch

**Goal**: The viewing cursor updates every time any tab or step is clicked.

4. **New helper `_updateViewingIndicator(tabName)`** in `web/workflow-steps.js` (or `web/ui-core.js`):
   - Removes `.viewing` from all `.step` elements
   - Adds `.viewing` to `#step-{stage}` where `stage = getStageForTab(tabName)`
   - Also toggles `.browsing-away` on the `app-active` step if `stage !== activeStep`

5. **Call `_updateViewingIndicator(tab)`** from `switchTab()` (after `stateManager.setCurrentTab(tab)`)
   - `switchTab` is in `web/review-table-base.js` — add call there
   - Also call from `handleStepClick` after any navigation

6. **Call `_updateViewingIndicator(currentTab)`** from `updateWorkflowSteps(status)` at end (to re-sync on every status fetch)

**Files**: `web/workflow-steps.js`, `web/review-table-base.js` (or `web/ui-core.js`)

---

### Phase C — Simplify Navigation: Click = Browse, Hover Button = Rerun

**Goal**: Remove all friction from back-navigation; rerun intent is expressed via a dedicated hover-revealed button — not implied by clicking.

7. **Remove the confirmation modal from all step-click and tab-click paths** in `web/workflow-steps.js` and `web/ui-core.js`:
   - `handleStepClick` on a completed step → `switchTab(tabName)` directly, no modal
   - Tab-click guard in `setupEventListeners` → remove the guard prompt entirely; let the click through immediately
   - The tab-click guard was the specific cause of the reported "lose ability to return" bug — removing it is the direct fix

8. **Wire the existing `↻` hover span** on completed step pills to a rerun confirmation dialog:
   - The span is already injected at opacity 0 by the CSS in `updateWorkflowSteps` (revealed on hover)
   - Add `onclick` handler: `_showReRunConfirmModal(step, () => backToPhase(step))`
   - Modal: "Re-run [Step Name]?" / "Downstream results may need updating." / buttons: "Re-run step" (solid) and "Cancel"
   - Callback: `backToPhase(step)` — repositions the backend phase; user then presses the step's own action button to trigger the LLM call

9. **Wire `.step.active` as a click target** — add `cursor: pointer` and click handler (currently no `clickable` class on active pills, making the "return home" affordance invisible)

**Files**: `web/workflow-steps.js`, `web/ui-core.js`

---

### Phase D — Backend: Phase-Level Stale State

**Goal**: When a step is re-run, downstream steps become visually stale (amber), not just layout.

10. **Add `stale_steps` set to `ConversationManager` session state** in `scripts/utils/conversation_manager.py`:
    - Populated by `re_run_phase(target)`: mark all steps after `target` in `_STEP_ORDER` as stale
    - Cleared step-by-step as each step is re-executed
    - Exposed via `GET /api/status` response

11. **`PHASE_PRODUCES` mapping** (what state keys each phase produces) in `conversation_manager.py`:
    - Maps each phase to its output state keys (for future invalidation if needed)
    - Used by `re_run_phase` to identify which `prior_X` fields to archive before overwrite

12. **Expose `stale_steps` in `StatusResponse`** (scripts/utils/schemas or web_app.py):
    - Frontend reads `status.stale_steps: string[]`

13. **`updateWorkflowSteps(status)`** reads `status.stale_steps`:
    - For each step in `stale_steps`: add `.stale` modifier class (amber, already defined in CSS)
    - `.stale` stacks on top of `.completed` or `.active`

**Files**: `scripts/utils/conversation_manager.py`, relevant route files for status, `web/workflow-steps.js`

---

### Phase E — Design/Story Document Updates

**Goal**: Capture the two-signal model, browse vs. rerun intent, and phase-level staleness in authoritative docs.

14. **`tasks/user-story-applicant.md`** — extend US-A6 and US-A12:
    - US-A6: add acceptance criteria for view cursor, browsing-away signal, hover rerun button
    - US-A12: add acceptance criteria for stale step pills, viewing indicator, browsing affordance

15. **`tasks/gaps.md`** — update GAP-02, GAP-14, GAP-18:
    - Specific implementation requirements per this plan
    - Reference new navigation state model doc

16. **`tasks/current-implemented-workflow.md`** — add "Back Navigation Modes" section:
    - Browse mode (view only, no phase change, view cursor moves)
    - Rerun mode (phase change via hover ↻ button, downstream steps stale)

17. **`tasks/layout-stale-ui-spec.md`** — extend scope:
    - Section: "Phase-Level Staleness" (steps after a rerun become amber)
    - Distinguish layout staleness (existing spec) from workflow step staleness (new)
    - `stale_steps` state field spec

18. **New `tasks/navigation-state-model.md`** — authoritative spec for the 3-variable step pill model:
    - Variables: `app_state` (backend phase), `view_cursor` (currently viewed stage), `stale_steps` (set)
    - Visual encoding matrix: all combinations of the three variables and their rendering
    - Color vocabulary table

---

## Relevant Files

- `web/styles.css` — add `.step.viewing`, `.step.browsing-away`, `cursor: pointer` on `.step.active`, `@keyframes browsing-pulse`
- `web/workflow-steps.js` — `updateWorkflowSteps`, `handleStepClick`, `_showReRunConfirmModal`, new `_updateViewingIndicator`, tooltip init/update, `_getStepTooltip`
- `web/review-table-base.js` — `switchTab()` — add `_updateViewingIndicator` call
- `web/ui-core.js` — remove tab-click guard from `setupEventListeners`
- `web/state-manager.js` — `getCurrentTab()`, `getPhase()` already separate; no changes needed
- `scripts/utils/conversation_manager.py` — `re_run_phase()`, `back_to_phase()`, add `stale_steps`, `PHASE_PRODUCES`
- `web/src/main.js` — rebuilt from component files; run `npm run build` after JS changes

---

## Verification

1. **Browse test**: At Customization phase, click Job Input pill → navigates immediately, no modal. Job Input gets `.viewing` blue ring; Customization pill gets `.browsing-away` amber pulse. Click Customization pill → returns, rings rebalance. No API call fired.
2. **Rerun test**: Hover over completed Job Input pill → `↻` appears → click → confirmation modal → confirm → `POST /api/back-to-phase` fires → `status.stale_steps` populated → downstream pills show amber `.stale` modifier.
3. **Guard removal regression**: Tab-click on any earlier tab at any phase navigates freely — no modal fires.
4. **Tooltip test**: Hover each pill in each state → correct tooltip text displayed per matrix.
5. **Session restore**: Reload with session at Customization, `currentTab=job` → correct two-signal state on first render without user interaction.
6. **JS tests**: `npm run test:js` — all 104 tests pass.
7. **Python tests**: `conda run -n cvgen python run_tests.py --categories unit component` — all pass.

---

## Decisions

- **Click = browse (no friction)**: the reported bug is that the modal trapped users without a clear "just look" escape; removing the modal from the click path is the simplest fix.
- **Hover ↻ = rerun intent**: surface the `↻` affordance that was already partially built but unwired.
- **`backToPhase` not `reRunPhase`** in the rerun confirm callback — repositions phase without auto-firing LLM; user initiates the LLM call via the step's action button (less surprising).
- **Blue ring is unconditional** on the viewed step — no suppression on the active pill; light fill vs. saturated ring distinguishes the two signals in the blue family.
- **Downstream state preserved** — consistent with existing policy; `stale_steps` is advisory, not destructive.
- **Deferred**: changed-item highlighting (GAP-02, GAP-18) — still a gap but not part of this plan.

---

## Further Considerations

1. **Browsing banner** (optional addition): a thin bar below the step rail — "Browsing Job Input — active step: Customise →" — is more discoverable than a pill pulse alone. Additive, not a blocker.
2. **Hover rerun on mobile/touch**: `hover` is not available on touch devices; the `↻` button could also appear as a small inline icon at reduced opacity on narrow viewports (always visible, not hover-gated).
3. **`_getStepTooltip` pure function**: tooltip text generation should be a pure function taking `(stepName, isActive, isViewing, isStale, isStaleCritical)` — easy to unit-test independently of DOM.
