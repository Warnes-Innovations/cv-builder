<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# Power User Review Status

**Last Updated:** 2026-04-20 18:30 EDT
**Executive Summary:** US-W2 (session switching) and US-W3 (efficient iteration) both pass — session ownership metadata is precise, and re-run/back-nav preserve full downstream context. US-W1 (high-throughput workflow) is partial: bulk toolbars cover experience and skills review but are absent for rewrites, spell-check, publications, and achievements, and there are no keyboard shortcuts for any workflow navigation. Four gaps are immediately addressable without backend changes.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

**Criterion 1 — Frequent actions without excessive pointer travel**
⚠️ Bulk action toolbars exist for the Experiences pane (`web/experience-review.js:228–231`: "✨ Accept All Recommended", "➕ Emphasize All", "✓ Include All", "👁 Exclude All") and the Skills pane (`web/skills-review.js:938–944`: same four bulk buttons). Both toolbars apply to DataTable-filtered rows via `bulkAction()` in `web/review-table-base.js:689+`, so DataTable search narrows the affected set — a useful power-user affordance.

However, bulk actions are absent for:
- Rewrites: each card requires an individual Accept / Edit / Reject click (`web/rewrite-review.js`)
- Spell-check: each flag must be individually resolved
- Publications: per-row Accept / Reject, no bulk toolbar
- Achievements: per-row Include / Omit, no bulk toolbar

No keyboard shortcuts are available for any workflow navigation; only Enter (send message / apply spell-check) and Escape (modal dismiss) are bound.

**Gap:** Bulk review coverage is limited to 2 of 5 customisation panes; the two stages most likely to have many items for a power user (rewrites, publications) have no bulk path.

---

**Criterion 2 — Efficient sequential progression**
⚠️ The five customisation panes (Experiences → Experience Bullets → Skills → Achievements → Summary → Publications) are navigated sequentially via "Continue →" / "← Back" buttons at the bottom of each pane (`web/review-table-base.js:626–641`). There is no pane-jump control; users must click through in order. The re-run confirm modal (`web/workflow-steps.js:131–183`) is triggered before any stage re-entry, which adds one extra confirmation click on every iteration.

**Gap:** No jump-to-customisation-pane affordance; always-present confirmation modal adds latency for frequent re-runners.

---

**Criterion 3 — Multi-item review without navigation churn**
✅ The flat single-level tab architecture (one top-level tab per review pane, no nested sub-tabs) eliminates the previous sub-tab layer of churn. The page estimate widget on the Experiences pane header (`web/review-table-base.js:556–575`) updates live as decisions change, giving continuous feedback without requiring a tab switch. The ATS score badge in the header (`web/index.html:90–97`) is always visible across all tabs.

---

### US-W2: Session Switching and Multi-Application Management

**Criterion 1 — Sessions easy to distinguish**
✅ `web/session-manager.js` builds each session's switcher label as `"PositionName · phase"` via `buildSessionSwitcherLabel()`. The label combines the position title (or session ID prefix as fallback) with the current phase abbreviation, giving enough context to distinguish parallel applications at a glance in the sessions panel.

---

**Criterion 2 — No ambiguity about active session**
✅ Four distinct ownership states are surfaced by `getActiveSessionOwnershipMeta()` in `web/session-manager.js`:
- `"Current tab"` — this tab is the unnamed owner
- `"Owned by this tab"` — claimed and owned here
- `"Owned by another tab"` — another browser tab holds the claim
- `"Unclaimed"` — no owner token set

A takeover confirmation dialog fires when another tab already holds the claim (`_claimCurrentSession()`). Sessions are URL-scoped (`?session=<uuid>`), so browser tab state directly reflects the active session.

---

**Criterion 3 — Active context visible while working**
✅ The position title bar (`#position-title`) is always rendered in the header and updates on session restore, rename, or new session start via `updatePositionTitle()` in `web/session-actions.js`. The rename pencil button (`#rename-session-btn`) appears once a title is set. The ATS badge row below the header (`#ats-score-badge`) shows current ATS score across all workflow tabs. These two persistent elements keep the active session context anchored regardless of which workflow tab is open.

---

### US-W3: Efficient Iteration

**Criterion 1 — Re-run affordances discoverable**
✅ Completed step pills in the workflow progress bar display a ↻ re-run icon. Clicking it triggers `_showReRunConfirmModal()` in `web/workflow-steps.js:131–183`, which shows a titled confirmation listing all downstream stages that will be marked stale. The modal confirms: "All existing approvals and rewrites are preserved as context." Re-run is available on: Analysis, Customisations, Rewrites. Back-navigation is available on all stages up to and including Layout via `backToPhase()`.

---

**Criterion 2 — Re-entry preserves context**
✅ `back_to_phase()` in `scripts/utils/conversation_manager.py:1181–1215` sets `stale_steps` for downstream stages and `iterating=True` without clearing any session state — `approved_rewrites`, `experience_decisions`, `skill_decisions`, `spell_audit`, and `customizations` are all preserved intact.

`_build_downstream_context()` in `conversation_manager.py` constructs a plain-English summary of prior decisions (omitted/emphasised experiences, approved rewrites, accepted spell-check corrections) that is injected into the LLM prompt as `_prior_context` on re-run, so the new pass builds on the user's previous choices rather than starting blind.

`re_run_phase()` supports full LLM re-execution for Analysis (`job_analysis`), Customisations (`customization`), and Rewrites (`rewrite_review`); for Spell Check, Generation, and Layout it sets the `iterating` flag and navigates back so the next forward pass carries downstream context.

---

**Criterion 3 — Minimizes redundant work**
✅ Stale step pills show amber/red `.step.stale` / `.step.stale-critical` visual state via `web/styles.css` so users know exactly which downstream steps need attention without inspecting each one. The layout review panel renders a "Layout outdated" callout with two explicit options — "Regenerate preview" or "Keep reviewing current preview" — via `renderLayoutPreviewStatus()` in `web/layout-instruction.js`. The layout freshness chip (`fresh` / `stale` / `critical`) derives from `getLayoutFreshnessFromState()` in `web/state-manager.js`.

---

## Generated Materials Evaluation

— N/A. This persona story evaluates throughput, iteration efficiency, and session management. The generated materials (CV HTML/PDF, DOCX, ATS DOCX) are not in scope for power-user interaction quality assessment.

---

## Power-User Feature Evaluation

| Feature                    | Status     | Evidence                                                                               |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| Keyboard shortcuts (nav)   | ❌ None    | `web/app.js`, `web/workflow-steps.js` — only Enter (send/apply) and Escape (modal)    |
| Bulk accept/reject rewrites | ❌ None   | `web/rewrite-review.js` — per-card buttons only; no bulk toolbar                      |
| Bulk accept/reject spell   | ❌ None    | Spell-check flags resolved individually; no "Accept All" button                        |
| Bulk experience/skills     | ✅ Full    | `web/experience-review.js:228–231`, `web/skills-review.js:938–944` — 4 bulk buttons   |
| Bulk achievements/pubs     | ❌ None    | `web/review-table-base.js` — no bulk toolbar rendered for these panes                 |
| Forward stage skip         | ❌ None    | Phases must traverse in order; no skip-to-generate affordance                         |
| Back-nav (all stages)      | ✅ Full    | `back_to_phase()` covers job → layout; state preserved                                |
| Settings modal             | ✅ Full    | `web/ui-core.js` — LLM provider/model, temperature, retry policy, output formats      |
| Generation settings panel  | ✅ Full    | `web/review-table-base.js:562–595` — max-skills slider, skills-section-title select   |
| Layout fine controls       | ✅ Full    | `web/layout-instruction.js` — font size and page margin numeric inputs                |
| Config source visibility   | ✅ Full    | `_renderSettingsSources()` in `web/ui-core.js` — env var / .env / config.yaml labels  |
| Custom prompt injection    | ❌ None    | No user-facing system-prompt override or "instructions to AI" field anywhere in UI     |

---

## Terminology Clarity

- **"Recommend Customisations"** button — action-oriented, describes what happens; acceptable for power users.
- **"Customisations" / "Finalise"** (British spelling) — consistent throughout; not a clarity problem, but may surprise US-locale users who type "Customize" in search.
- **Settings source labels** ("env var `LLM_PROVIDER`", "config.yaml default") — excellent power-user affordance; eliminates guesswork about what's driving config values.
- **"Layout outdated" / "Files outdated"** freshness chips — unambiguous; "outdated" is clearer than "stale" would be as user-facing text.
- **Bulk toolbar labels** ("✨ Accept All Recommended", "✓ Include All") — precise and scannable.
- **Session ownership labels** ("Owned by another tab") — precise enough for multi-tab coordination.
- **Re-run confirm modal** downstream-stage list — correctly communicates that "these steps will be marked stale".

---

## Story Tally

| Story | Result     | Summary                                                                                   |
| ----- | ---------- | ----------------------------------------------------------------------------------------- |
| US-W1 | ⚠️ Partial | Bulk covers experience/skills only; no keyboard shortcuts; sequential pane-only navigation |
| US-W2 | ✅ Pass    | Session labels, ownership metadata, and position bar meet all three criteria              |
| US-W3 | ✅ Pass    | Re-run with context preservation, stale chips, and layout freshness all work correctly    |

---

## Top 5 Gaps

1. **No keyboard shortcuts for workflow navigation** (High severity) — Zero keyboard acceleration for any stage action (analyze, recommend, generate, accept rewrite, proceed) or pane navigation. Power users processing multiple applications per week must navigate entirely by mouse across a 8-stage, 5-pane workflow. Evidence: no `keydown` / `keyup` handlers found in `web/app.js`, `web/workflow-steps.js`, or `web/review-table-base.js` beyond Enter and Escape.

2. **No bulk accept/reject for rewrites** (Medium severity) — The rewrite stage can surface 10–30 individual proposals. Each requires an explicit Accept / Edit / Reject click. There is no "Accept All", "Reject All", or filter-based bulk path. Evidence: `web/rewrite-review.js` — per-card buttons only; no `.bulk-toolbar` rendered.

3. **No forward stage skip** (Medium severity) — Users who trust the AI recommendations or who are iterating quickly cannot jump directly from Job Input to Generate. All 5 customisation panes plus Rewrites and Spell Check must be traversed in order. `_STEP_TO_PHASE` in `conversation_manager.py` maps all steps including `generate`, but no frontend route exposes forward-jump. Evidence: `web/review-table-base.js:626–641`, `web/app.js`.

4. **Bulk toolbar absent for publications and achievements** (Low-Medium severity) — Publications and Achievements panes have per-row Accept/Reject or Include/Omit buttons with no bulk toolbar, inconsistent with the Experience and Skills panes. A researcher or academic user may have 20–50 publications to review. Evidence: `web/review-table-base.js` pane configs — no `.bulk-toolbar` injection for `publications-table-container` or `achievements-table-container`.

5. **No custom prompt injection surface** (Low severity) — There is no freeform "instructions to AI" field that power users can use to guide LLM behaviour (e.g., "avoid first-person phrasing", "do not include management experience", "emphasise Python over R"). The Settings modal exposes model/temperature/token controls but not user-controlled system-prompt context. Evidence: `web/ui-core.js:saveSettingsModal()` — no prompt-injection field in the form.

---

## Proposed Story Items

- **US-W4: Keyboard shortcut layer** — Power users can trigger common workflow actions via keyboard: Alt+→ / Alt+← to advance/retreat workflow stages, Alt+A to run analysis, Alt+G to generate, Enter to confirm a re-run modal. Shortcuts are documented in a discoverable help overlay (? key).

- **US-W5: Batch accept/reject for rewrites and spell-check** — A "✨ Accept All" and "✗ Reject All" button appears at the top of the Rewrites tab and Spell-Check tab, applying to visible (filtered) proposals. Optionally: "Accept All High-Confidence" using the persuasion-check severity field already stored per proposal.

- **US-W6: Stage gating override** — Power users can advance past optional stages (Questions, Spell Check, Layout) without completing them via a "Skip stage →" affordance, recording the skip in the session audit trail. The re-run confirm modal offers a "Don't ask again this session" option.

- **US-W7: Custom prompt context injection** — A collapsible "Instructions to AI" textarea in the Generation Settings panel (or a dedicated Settings modal field) appends freeform user context to the LLM system prompt for customisations and rewrites. Content is stored in session state and displayed in the finalise audit summary.
