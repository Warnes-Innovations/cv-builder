<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 MD060 -->

# Power User Review Status

**Last Updated:** 2026-04-22 10:30 ET
**Executive Summary:** US-W2 (session switching) passes cleanly — session ownership metadata is precise and the active session is always visible. US-W3 (efficient iteration) passes for context preservation (criterion 2) but is partial on discoverability (the ↻ re-run icon is opacity:0 until hover). US-W1 (high-throughput workflow) is partial: bulk toolbars now cover experience, skills, and achievements, but are absent for rewrites, spell-check, and publications, and there are no keyboard shortcuts for any workflow navigation.

---

## Application Evaluation

### US-W1: High-Throughput Workflow Efficiency

**Criterion 1 — Frequent actions without excessive pointer travel**
⚠️ Bulk action toolbars exist for the Experiences pane (`web/experience-review.js:228–231`: "✨ Accept All Recommended", "➕ Emphasize All", "✓ Include All", "👁 Exclude All") and the Skills pane (`web/skills-review.js:938–944`: same four bulk buttons). Both toolbars apply to DataTable-filtered rows via `bulkAction()` in `web/review-table-base.js:689+`, so DataTable search narrows the affected set — a useful power-user affordance.

**Achievements** also has a full bulk toolbar (Accept All Recommended, Emphasize All, Include All, Exclude All — `web/achievements-review.js:309–312`).

However, bulk actions are absent for:
- Rewrites: each card requires an individual Accept / Edit / Reject click (`web/rewrite-review.js:257, 259`)
- Spell-check: each flag must be individually resolved
- Publications: per-row include/exclude, no bulk toolbar (`web/publications-review.js` — no bulk match)

No keyboard shortcuts are available for any workflow navigation; only Enter (send message / apply spell-check) and Escape (modal dismiss) are bound.

**Gap:** Bulk review coverage is limited to 3 of 5 customisation panes; the two most likely to have many items for a frequent applicant (rewrites, publications) have no bulk path.

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
⚠️ Completed step pills in the workflow progress bar have a ↻ re-run span injected for supported stages (analysis, customizations, rewrite, spell, generate — `web/workflow-steps.js:671–676`). However, that span is **opacity:0 by default** and becomes visible only on CSS `:hover` of the parent step pill (workflow-steps.js:690: `.step.completed:hover .step-rerun { opacity: 1 !important; }`). A power user who has not hovered each completed step will not discover re-run exists. Clicking the ↻ triggers `_showReRunConfirmModal()` in `web/workflow-steps.js:131–183`, which lists downstream stages and confirms: "All existing approvals and rewrites are preserved as context."

Back-navigation is available on all stages up to and including Layout via `backToPhase()` (`web/workflow-steps.js:88`). The layout stage additionally shows a prominent stale callout banner when content has changed since the preview (`web/layout-instruction.js:199–207`), which is a more discoverable affordance than the hover-triggered ↻.

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
| Bulk achievements          | ✅ Full    | `web/achievements-review.js:309–312` — 4 bulk buttons (Accept All Recommended, Emphasize All, Include All, Exclude All) |
| Bulk publications          | ❌ None    | `web/publications-review.js` — no bulk toolbar; per-row include/exclude only          |
| Forward stage skip         | ❌ None    | Phases must traverse in order; no skip-to-generate affordance                         |
| Back-nav (all stages)      | ✅ Full    | `back_to_phase()` covers job → layout; state preserved                                |
| Re-run affordance (visible) | ⚠️ Hover-only | `web/workflow-steps.js:690` — ↻ icon is opacity:0 at rest, visible only on :hover |
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
| US-W1 | ⚠️ Partial | Bulk covers experience/skills/achievements; absent for rewrites/publications/spell; no keyboard shortcuts; sequential pane-only navigation |
| US-W2 | ✅ Pass    | Session labels, ownership metadata, and position bar meet all three criteria              |
| US-W3 | ⚠️ Partial | Re-run context preservation ✅; re-run affordance discoverability ⚠️ (hover-only ↻)     |

---

## Top 5 Gaps

1. **No keyboard shortcuts for workflow navigation** (High severity) — Zero keyboard acceleration for any stage action (analyze, recommend, generate, accept rewrite, proceed) or pane navigation. Power users processing multiple applications per week must navigate entirely by mouse across a 8-stage, 5-pane workflow. Evidence: no `keydown` / `keyup` handlers found in `web/app.js`, `web/workflow-steps.js`, or `web/review-table-base.js` beyond Enter and Escape.

2. **No bulk accept/reject for rewrites** (Medium severity) — The rewrite stage can surface 10–30 individual proposals. Each requires an explicit Accept / Edit / Reject click. There is no "Accept All", "Reject All", or filter-based bulk path. Evidence: `web/rewrite-review.js` — per-card buttons only; no `.bulk-toolbar` rendered.

3. **Re-run affordance is hover-only and not visible at rest** (Medium severity) — The ↻ icon injected into completed step pills is `opacity:0` until the user hovers the pill (workflow-steps.js:690). A power user processing many sessions back-to-back will not reliably discover re-run exists without prior knowledge. The layout stage is the exception — it has a persistent stale callout banner — but all other stages depend on accidental discovery via hover.

4. **No forward stage skip** (Medium severity) — Users who trust the AI recommendations cannot jump directly from Job Input to Generate. All panes and Spell Check must be traversed in order. Evidence: `web/review-table-base.js:626–641`, `web/app.js`.

5. **Bulk toolbar absent for publications** (Low-Medium severity) — Publications pane has per-row include/exclude buttons with no bulk toolbar, inconsistent with the Experience, Skills, and Achievements panes. A researcher or academic user may have 20–50 publications to review individually. Evidence: `web/publications-review.js` — no `.bulk-toolbar` rendered.

6. **No custom prompt injection surface** (Low severity) — There is no freeform "instructions to AI" field that power users can use to guide LLM behaviour (e.g., "avoid first-person phrasing", "do not include management experience"). The Settings modal exposes model/temperature/token controls but not user-controlled system-prompt context. Evidence: `web/ui-core.js:saveSettingsModal()` — no prompt-injection field in the form.

---

## Proposed Story Items

- **US-W4: Keyboard shortcut layer** — Power users can trigger common workflow actions via keyboard: Alt+→ / Alt+← to advance/retreat workflow stages, Alt+A to run analysis, Alt+G to generate, Enter to confirm a re-run modal. Shortcuts are documented in a discoverable help overlay (? key).

- **US-W5: Batch accept/reject for rewrites and spell-check** — A "✨ Accept All" and "✗ Reject All" button appears at the top of the Rewrites tab and Spell-Check tab, applying to visible (filtered) proposals. Optionally: "Accept All High-Confidence" using the persuasion-check severity field already stored per proposal.

- **US-W6: Stage gating override** — Power users can advance past optional stages (Questions, Spell Check, Layout) without completing them via a "Skip stage →" affordance, recording the skip in the session audit trail. The re-run confirm modal offers a "Don't ask again this session" option.

- **US-W8: Persistent hover-bypass for re-run** — Power users can pin the ↻ re-run icon to be visible at rest on completed step pills (via a preference toggle in Settings), rather than requiring a hover interaction to discover. As a minimum: add a persistent tooltip or step-tooltip that mentions "hover to re-run" as onboarding text.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/layout-instruction.js, web/master-cv.js, web/session-manager.js, web/session-switcher-ui.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/rewrite-review.js, web/publications-review.js, scripts/web_app.py, scripts/utils/conversation_manager.py

**Evidence standard:** Every conclusion is supported by source evidence. No documentation or prior review documents were used as inputs for factual claims.
