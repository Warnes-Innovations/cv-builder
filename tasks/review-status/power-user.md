<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# Power User Review Status

**Last Updated:** 2026-06-18
**Reviewer persona:** Power user — frequent applicant processing multiple sessions, values speed, low-friction review, and keyboard-efficient interaction.
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/layout-instruction.js, web/session-switcher-ui.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/rewrite-review.js, web/publications-review.js (grep), web/review-table-base.js, web/spell-check.js, scripts/web_app.py, scripts/utils/conversation_manager.py

**Executive Summary:** US-W2 (session switching) passes cleanly — session ownership metadata, sortable table, and persistent position bar meet all three criteria. US-W3 (efficient iteration) passes on context preservation but is partial on affordance discoverability (↻ re-run icon is opacity:0 at rest until hover). US-W1 (high-throughput workflow) is partial: bulk toolbars now cover experience, skills, achievements, and rewrites (Accept All / Reject All added since previous review), but spell-check and publications remain per-item only, and there are still no keyboard shortcuts for any workflow navigation.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

#### Criterion 1 — Frequent actions without excessive pointer travel

⚠️ Partial

Bulk action toolbars are present on four of the five major review panes:

- **Experiences**: "✨ Accept All Recommended", "➕ Emphasize All", "✓ Include All", "👁 Exclude All" — `web/experience-review.js:245–248`
- **Skills**: same four bulk buttons — `web/skills-review.js:941–944`
- **Achievements**: same four bulk buttons — `web/achievements-review.js:309–312`; implemented via `bulkAchievementAction()` at line 327
- **Rewrites**: "✓ Accept All" (`acceptAllRewrites()`) and "✗ Reject All" (`rejectAllRewrites()`) at `web/rewrite-review.js:134–135` via the tally bar

All DataTable-backed bulk actions apply only to filtered rows via `bulkAction()` in `web/review-table-base.js:706` — a genuine power-user affordance (filtering reduces the affected set).

Missing bulk paths:
- **Spell-check**: each flag must be individually accepted/dismissed; no "Accept All" present in `web/spell-check.js` (no match on "bulk" or "Accept All")
- **Publications**: per-row include/exclude only; no bulk toolbar in `web/publications-review.js` (no match on "bulk-toolbar" or "Accept All")

No keyboard shortcuts exist for any workflow navigation. The only keyboard bindings in the application are:
- `Enter` — send chat message (`web/app.js:116`, `web/ui-core.js:515`)
- `Escape` — close modals (`web/ui-core.js:526–530`)
- `ArrowLeft` / `ArrowRight` / `Home` / `End` — tab-bar navigation within the second nav bar (`web/ui-core.js:491–509`)
- `Enter` / `Escape` — session rename inline input (`web/session-switcher-ui.js:429–441`)

**What is missing:** Keyboard shortcuts for stage advance (Alt+→), stage re-run (Alt+R), analyze (Alt+A), generate (Alt+G). No shortcut overlay is documented. For a power user processing 5–10 applications per week, this forces full mouse dependency across an 8-stage, 5-pane workflow.

---

#### Criterion 2 — Efficient sequential progression

⚠️ Partial

The five customization panes (Goals → Questions → Experiences → Experience Bullets → Skills → Achievements → Tagline → Summary → Publications) are navigable via "Continue →" / "← Back" buttons at each pane footer (`web/review-table-base.js`). There is no pane-jump control; the user must traverse all panes in order. The workflow progress bar does not expose a direct link to a specific customization sub-pane.

The re-run confirm modal (`web/workflow-steps.js:138–188`) fires before every stage re-entry; while protective, this adds one confirmation click per iteration loop. There is no "don't ask again this session" option.

Action buttons in the chat panel are contextual and always visible once unlocked (e.g., "⚙️ Recommend Customizations" appears immediately after Analysis completes), which does reduce pointer travel for the primary workflow happy path. Evidence: `web/index.html:183–191`.

**What is missing:** Jump-to-customization-pane affordance; "Skip stage" option for stages like spell-check; confirmation modal bypass for experienced users.

---

#### Criterion 3 — Multi-item review without navigation churn

✅ Pass

The tab architecture filters the second nav bar to show only panes relevant to the current workflow stage via `updateTabBarForStage()` in `web/ui-core.js:575–584` and `STAGE_TABS` at `web/ui-core.js:350–363`. The Customizations stage exposes 10 sub-tabs simultaneously without hiding them behind a modal.

The page estimate widget on the Experiences pane header updates live as decisions change, giving continuous feedback without a tab switch (`web/review-table-base.js`). The ATS score badge (`web/index.html:86–97`) is permanently rendered in the position bar and visible across all tabs.

The rewrite tally bar at the top of the Rewrites tab (`web/rewrite-review.js:130–138`) gives a running count of Accepted / Rejected / Pending without leaving the panel.

---

### US-W2: Session Switching and Multi-Application Management

#### Criterion 1 — Sessions easy to distinguish

✅ Pass

The sessions modal renders a sortable table with columns: Name, Status, Phase, Modified — `web/session-switcher-ui.js:298–311` (`_renderSessionTableHeader()`). Rows display `position_name` (inferred "Title at Company" label from `_infer_position_name()` in `scripts/web_app.py:802–856`) with a phase badge and last-modified timestamp. A "Recent" strip above the table (`web/session-switcher-ui.js:368–384`) shows the five most-recently-modified sessions with status dots for instant access.

The `SessionItem` dataclass (`scripts/web_app.py:160–165`) provides `position_name`, `phase`, and `timestamp` to the list API, giving enough context to distinguish parallel applications at a glance. Notably, `position_company` is not a separate column — the company is embedded in the `position_name` label (e.g., "Senior Engineer at Acme Corp") via the infer logic.

---

#### Criterion 2 — No ambiguity about active session

✅ Pass

Four ownership states are surfaced by `getActiveSessionOwnershipMeta()` referenced in `web/session-switcher-ui.js:46`:
- "Current" (this tab is the owner, `sm-btn-disabled` aria-disabled)
- "Open" link for other active sessions
- Ownership conflict dialog fires on takeover attempt with "Take Over", "Load Different", and "New Session" options (`web/index.html:381–395`)
- An amber session-conflict banner appears on any 409 Conflict response from the global fetch interceptor (`web/ui-core.js:424–441`)

Sessions are URL-scoped (`?session=<uuid>`), so browser tab state directly reflects the active session.

---

#### Criterion 3 — Active context visible while working

✅ Pass

The position bar row (`web/index.html:69–107`) is always rendered in the fixed header. It contains:
- `#position-title` — position name, visible across all tabs
- `#position-company` (hidden until set, `web/index.html:79`)
- `#rename-session-btn` — inline rename pencil; appears once title is set
- ATS score badge and layout freshness chip — visible from any tab

The header subtitle `#header-session-name` (`web/index.html:41`) shows "Current session: PositionName" below the app title.

---

### US-W3: Efficient Iteration

#### Criterion 1 — Re-run affordances discoverable

⚠️ Partial

Completed step pills in the workflow progress bar have a ↻ re-run `<span>` injected for stages: analysis, customizations, rewrite, spell (`RE_RUN_STEPS` at `web/workflow-steps.js:620`). However, that span is **opacity:0 by default** and only revealed by CSS `:hover` on the parent `.step.completed` element (`web/workflow-steps.js:723`: `.step.completed:hover .step-rerun { opacity: 1 !important; }`).

A power user who has not hovered each completed step will not discover that re-run exists. Only the layout stage has a persistent discoverability affordance — the "Layout outdated" / "Files outdated" freshness chip renders visibly at rest (`web/state-manager.js:144–176`, `web/index.html:95`).

Clicking the ↻ calls `confirmReRunPhase(step)` → `_showReRunConfirmModal(step, 'rerun', ...)` (`web/workflow-steps.js:190–192`), which lists downstream stages and explicitly states: "All existing approvals and rewrites are preserved as context."

Back-navigation via `backToPhase()` (`web/workflow-steps.js:98–128`) is available from any completed step by clicking the step pill directly. The confirm modal fires here too.

---

#### Criterion 2 — Re-entry preserves useful downstream context

✅ Pass

`backToPhase()` POSTs to `/api/back-to-phase` which calls `back_to_phase()` in `scripts/utils/conversation_manager.py`. This sets `stale_steps` for downstream stages and `iterating=True` without clearing session state — `approved_rewrites`, `experience_decisions`, `skill_decisions`, `spell_audit`, and `customizations` are preserved intact.

`_build_downstream_context()` constructs a plain-English summary of prior decisions that is injected into the LLM prompt on re-run, so the new pass builds on the user's previous choices rather than starting blind.

`reRunPhase()` (`web/workflow-steps.js:276–325`) supports full LLM re-execution for analysis, customizations, rewrite, and spell; highlights changed items via `_highlightChangedItems()` after the re-run completes.

---

#### Criterion 3 — Minimizes redundant work

✅ Pass

Stale step pills render with amber `.step.stale` visual state (downstream of a re-run, set via `stale_steps` in status response — `web/workflow-steps.js:682–711`). The layout review panel renders a "Layout outdated" or "Files outdated" callout with explicit action options via the freshness chip from `getLayoutFreshnessFromState()` in `web/state-manager.js:120–178`.

Spell-check results are cached in `window._spellCheckCache` and re-used on back-navigation without re-running LanguageTool (`web/spell-check.js:31`). Rewrite panel state is similarly cached in `window._rewritePanelCache`.

---

## Generated Materials Evaluation

— N/A. This persona story evaluates throughput, iteration efficiency, and session management. The generated output files (CV PDF, DOCX, ATS DOCX) are not in scope for power-user interaction quality assessment.

---

## Power-User Feature Evaluation

| Feature                         | Status          | Evidence                                                                               |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| Keyboard shortcuts (nav/stages) | ❌ None         | `web/app.js`, `web/ui-core.js` — only Enter (send) and Escape (modal close)           |
| Bulk accept/reject rewrites     | ✅ Present      | `web/rewrite-review.js:134–135` — "✓ Accept All" and "✗ Reject All" in tally bar      |
| Bulk actions — experience/skills | ✅ Full         | `web/experience-review.js:245–248`, `web/skills-review.js:941–944` — 4 bulk buttons  |
| Bulk actions — achievements     | ✅ Full         | `web/achievements-review.js:309–312` — 4 bulk buttons                                 |
| Bulk actions — publications     | ❌ None         | `web/publications-review.js` — per-row only, no bulk toolbar                          |
| Bulk accept/reject spell-check  | ❌ None         | `web/spell-check.js` — no "Accept All"; each flag resolved individually               |
| Forward stage skip              | ❌ None         | Phases traverse in fixed order; no skip affordance                                     |
| Back-nav (all stages)           | ✅ Full         | `backToPhase()` covers job → layout; prior state preserved                             |
| Re-run affordance (visible)     | ⚠️ Hover-only  | `web/workflow-steps.js:723` — ↻ icon opacity:0 at rest, visible only on :hover        |
| Re-run context preservation     | ✅ Full         | `conversation_manager.py` preserves all decisions; `_build_downstream_context()` in LLM prompt |
| Changed-item highlighting       | ✅ Full         | `_highlightChangedItems()` in `web/workflow-steps.js:325` — DOM elements marked after re-run |
| Sortable session table          | ✅ Full         | `web/session-switcher-ui.js:298–311` — sortable by Name, Status, Phase, Modified       |
| Recent sessions strip           | ✅ Full         | `web/session-switcher-ui.js:368–384` — top-5 most recent with status dots             |
| Inline session rename           | ✅ Full         | `web/session-switcher-ui.js:507–513` — Enter to save, Escape to cancel                |
| Active session context          | ✅ Full         | Position bar always visible; `#header-session-name` subtitle                          |
| Settings source labels          | ✅ Full         | `_renderSettingsSources()` in `web/ui-core.js` — env var / .env / config.yaml labels  |
| LLM abort (in-flight)           | ✅ Full         | "■ Stop" button in LLM busy overlay `web/index.html:169`; `abortCurrentRequest()`     |
| Custom prompt injection         | ❌ None         | No user-facing system-prompt override or "instructions to AI" field in Settings        |

---

## Terminology Clarity

- **"Recommend Customisations"** button — action-oriented, describes what happens; acceptable for power users.
- **"Customisations" / "Finalise"** (British spelling) — consistent throughout; not a clarity problem, but may surprise US-locale users.
- **Settings source labels** ("env var `LLM_PROVIDER`", "config.yaml default") — excellent power-user affordance.
- **"Layout outdated" / "Files outdated"** freshness chips — unambiguous; "outdated" is clearer than "stale" as user-facing text.
- **Bulk toolbar labels** ("✨ Accept All Recommended", "✓ Include All") — precise and scannable.
- **Session ownership labels** ("Owned by another tab", "Current") — precise enough for multi-tab coordination.
- **Re-run confirm modal** downstream-stage list — correctly communicates that preserved context travels forward.

---

## Story Tally

| Story | Result      | Summary                                                                                      |
| ----- | ----------- | -------------------------------------------------------------------------------------------- |
| US-W1 | ⚠️ Partial | Bulk covers experience/skills/achievements/rewrites; absent for spell-check/publications; no keyboard shortcuts; sequential pane navigation only |
| US-W2 | ✅ Pass     | Session labels, ownership metadata, sortable table, and position bar meet all three criteria |
| US-W3 | ⚠️ Partial | Re-run context preservation ✅; re-run affordance discoverability ⚠️ (hover-only ↻)        |

---

## Top Gaps

1. **No keyboard shortcuts for workflow navigation** (High severity) — Zero keyboard acceleration for stage actions (analyze, recommend, generate, accept rewrite, proceed) or pane navigation. Power users must navigate entirely by mouse across an 8-stage, multi-pane workflow. Evidence: no Alt/Ctrl `keydown` handlers in any `web/*.js` file beyond Enter and Escape.

2. **Re-run affordance is hover-only and invisible at rest** (Medium severity) — The ↻ icon injected into completed step pills is `opacity:0` until the user hovers the pill (`web/workflow-steps.js:723`). A power user processing many sessions will not reliably discover re-run exists without prior knowledge. The layout stage is the exception (persistent freshness chip); all other re-runnable stages depend on accidental hover discovery.

3. **No bulk accept for spell-check** (Medium severity) — The spell-check panel resolves flags one at a time. For a document with 15–25 flagged items, there is no "Accept All" path. Evidence: `web/spell-check.js` — no `.bulk-toolbar`, no bulk accept function found.

4. **Bulk toolbar absent for publications** (Low-Medium severity) — Publications pane has per-row include/exclude with no bulk toolbar, inconsistent with Experience, Skills, and Achievements panes. An academic user with 20–50 publications must click through each one individually. Evidence: `web/publications-review.js` — no `.bulk-toolbar` rendered.

5. **No custom prompt injection surface** (Low severity) — No freeform "instructions to AI" field for power users to guide LLM behaviour (e.g., "avoid first-person phrasing"). The Settings modal exposes model/temperature controls but not user-controlled system-prompt context. Evidence: `_collectSettingsPayloadFromForm()` in `web/ui-core.js:123–143` — no prompt-injection field in the payload.

---

## Proposed Story Items

- **US-W4: Keyboard shortcut layer** — Power users can trigger common workflow actions via keyboard: Alt+→ / Alt+← to advance/retreat stages, Alt+A to analyze, Alt+G to generate, Alt+R to re-run current stage. Shortcuts documented in a discoverable overlay (? key).

- **US-W5: Bulk accept for spell-check** — "✓ Accept All" and "✗ Dismiss All" buttons appear at the top of the Spell Check panel, applying to visible (filtered) flags. Optionally: "Accept All Auto-Corrections" for high-confidence flags.

- **US-W6: Stage gating override** — Power users can advance past optional stages (Questions, Spell Check) via a "Skip stage →" affordance. The re-run confirm modal offers a "Don't ask again this session" option.

- **US-W7: Bulk publications review** — Publications pane receives the same four-button bulk toolbar (Accept All Recommended, Include All, Exclude All, Emphasize All) as the other content panes, consistent with the existing `bulkAction()` infrastructure in `web/review-table-base.js:706`.

- **US-W8: Persistent re-run discoverability** — Power users can pin the ↻ re-run icon to visible at rest via a Settings preference toggle. At minimum, a persistent tooltip on each completed step should read "Hover to re-run" as onboarding text.

---

**Evidence standard:** Every conclusion is supported by direct source file evidence. No documentation, prior review documents, or gap lists were used as inputs for factual claims. All source citations were verified against the current codebase as of 2026-06-18.
