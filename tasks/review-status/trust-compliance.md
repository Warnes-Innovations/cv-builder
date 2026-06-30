<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust/Compliance Review Status

**Last Updated:** 2026-06-30 ET

**Executive Summary:** The application has solid foundations for US-C1 (transparent AI suggestions) and US-C2 (approval integrity) — the rewrite review card UI provides word-level diffs, explicit accept/edit/reject paths, and a persuasion-warning overlay that must be acknowledged before progression. Weak-evidence skill suggestions are visually flagged. The AI provider data-handling disclosure (the "Non-confidential" badge) is implemented and surfaced in the header. A layout-freshness chip and stale callout provide provenance cues for preview/final state drift. Where the implementation falls short is in US-C3 (provenance and audit cues): the `rewrite_audit` field is persisted in session JSON and used for cold-restore but is never exposed to the user as an inspectable log; rationale exposure on each rewrite card is conditional on `r.rationale` being populated (orchestrator-dependent); and the harvest/download flows do not surface which session decisions produced the final outputs. No story yet covers data-retention disclosure with provider policy links, explicit AI provenance labelling in the conversation stream, or per-item decision enforcement in the customization panel.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

**Criterion 1 — Proposed rewrites and additions are visibly presented as suggestions.**

✅ Pass — `web/rewrite-review.js:302–333` renders each proposed change in a `.rewrite-card` with a word-level LCS diff (`<del class="diff-removed">` / `<ins class="diff-added">`). Cards are labelled with a `rewrite-card-type` span (e.g. "skill add", "bullet rewrite") and a location label. The card header makes clear these are proposals, not accepted text.

The conversation message at `rewrite-review.js:120` uses explicit framing: "Here are the AI's **N** text improvement suggestions… Review each suggestion in the Rewrites tab, then accept, edit, or reject before continuing."

**Criterion 2 — Weak-evidence or confirm-first cases are clearly flagged.**

✅ Pass — `rewrite-review.js:285–288`:

```js
const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
const weakBadge = isWeakSkillAdd
  ? `<span class="weak-badge">⚠ Candidate to confirm</span>`
  : '';
```

The `⚠ Candidate to confirm` badge is injected into the card header for weak-evidence skill additions. Persuasion-check warnings are surfaced per-card via `rewrite-persuasion-badges` at `rewrite-review.js:322–325`.

A collapsible persuasion-warning summary banner at `rewrite-review.js:153–173` aggregates flags by type and requires an "Acknowledged" button click before the submit button unlocks (`persuasionWarningsAcknowledged` guard at line 105).

Experience review and skill review tabs also surface confidence badges and reasoning text. `experience-review.js:168–200` renders a `confidence-badge confidence-${confidence.level}` badge per experience row, with colour coding: green = high, amber = medium, red = low (`styles.css:714–727`). The reasoning text is shown in the same table row. The same pattern applies in `skills-review.js:636–688`.

⚠️ Partial caveat: The `rationale` field in each rewrite card is rendered conditionally at `rewrite-review.js:316–320` (`if r.rationale`). If the orchestrator does not populate `rationale` (e.g. for some skill additions), the collapsible "Rationale & Evidence" section is silently absent with no fallback text explaining why. The `confidence-badge` styling does not include a "very-high" or "very-low" variant in `styles.css:706–727` — only `confidence-high`, `confidence-medium`, and `confidence-low` are defined, so LLM-returned "Very High" or "Very Low" strings would fall back to unstyled.

**Criterion 3 — The UI does not blur the line between approved output and proposed changes.**

✅ Pass — The rewrite panel is a separate tab (`tab-rewrite`) gated behind the "Review Rewrites" action button, which only appears after the customization phase (`app.js:132`). Generated output tabs (`tab-final_generate`, `tab-download`) are only unlocked after `complete_layout_review()` advances the phase to `FINAL_GENERATION` (`conversation_manager.py:1213`). The workflow step bar enforces sequential unlock via `updateWorkflowStepsClickable()` in `ui-core.js:1894–1990`.

**Acceptance criteria assessment:**

- AI-proposed content is reviewable before acceptance: ✅ enforced by phase gating and card UI.
- Higher-risk suggestions receive stronger visual signalling: ✅ `⚠ Candidate to confirm` badge and persuasion-warning overlay.

---

### US-C2: User Approval Integrity

**Criterion 1 — Review-required stages block progression until required decisions are made.**

✅ Pass (rewrite stage) — The "Submit All Decisions" button (`#submit-rewrites-btn`) is rendered `disabled` at `rewrite-review.js:189` and only enables when all cards have a decision and persuasion warnings are acknowledged (`updateRewriteTally()` logic at line 444–449). `submitRewriteDecisions()` also checks `persuasionWarningsAcknowledged` at line 453.

✅ Pass (layout stage) — `complete_layout_review()` in `conversation_manager.py:1198` must be called (via the "Confirm Layout" button) before the phase advances to `FINAL_GENERATION`. The `markLayoutConfirmed()` in `state-manager.js:371` gates the freshness chip and the "Continue to File Review" button.

✅ Pass (harvest stage) — `harvest.js:100` comments explicitly: "All harvest items start unchecked — master CV updates are opt-in only (US-A11)." `applyHarvestSelections()` at line 487 requires a confirmation dialog before writing to `Master_CV_Data.json` (line 498–505).

✅ Pass (spell-check stage) — `submitSpellCheckDecisions()` at `spell-check.js:381` prompts the user before advancing if any items are still `pending`: "N issues have not been reviewed and will be ignored. Proceed anyway?" (line 401–411). Pending items are explicitly auto-ignored only after user confirmation.

⚠️ Partial (customization stage) — The customization tabs (Experiences, Skills, Achievements) allow users to set per-item decisions, but there is no hard block preventing the user from clicking "Review Rewrites" without having touched every item. The UI accepts the current state of `experience_decisions` / `skill_decisions`, which may be empty, causing the backend to use its own AI recommendations silently. This flexibility is by design, but from a compliance perspective, items without explicit decisions are auto-accepted without disclosure.

**Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable.**

✅ Pass — Three separate styled buttons with distinct labels and `aria-pressed` state: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:328–330`). Cards receive `accepted` or `rejected` CSS classes on decision. The tally bar separately counts accepted, rejected, and pending items (`rewrite-review.js:184–186`). The edit path requires an explicit textarea Save click before the decision is recorded (lines 350–420 in `rewrite-review.js`).

**Criterion 3 — The UI does not silently auto-accept review items.**

✅ Pass (rewrite stage, fresh session) — All rewrite cards start with no decision set; `rewriteDecisions` is reset to `{}` when the panel renders (`rewrite-review.js:112`). The submit button is disabled until every card has a decision.

⚠️ Partial (cold-restore path) — `_restoreDecisions()` at `rewrite-review.js:52–79` re-seeds decisions from `rewrite_audit` on cold restore. If a prior session already completed the rewrite stage, revisiting the rewrite tab will pre-populate decisions from the audit without user notification. Prior decisions auto-apply without a clear disclosure that previously recorded choices are being restored.

**Acceptance criteria assessment:**

- Approval-dependent workflow stages enforce explicit decision-making: ✅ for rewrite, layout, spell-check, and harvest stages. ⚠️ for customization stage (no per-item decision enforcement; AI defaults apply silently).

---

### US-C3: Provenance and Audit Cues

**Criterion 1 — Diff-like review is available where text is being changed.**

✅ Pass — The word-level LCS diff (`computeWordDiff` / `renderDiffHtml` at `rewrite-review.js:238–282`) renders `<del>` / `<ins>` spans inline for every rewrite card. The original text is preserved in `data-original` on the diff element (`rewrite-review.js:311`). Users can toggle between diff view and the after-text via the edit flow.

The layout-freshness chip in the position bar (`index.html:100`, `state-manager.js:144–178`) provides a staleness indicator: "Layout current", "Layout outdated", or "Files outdated". When layout or final files are stale relative to content changes, a "stale callout" banner is shown in the layout panel (`bundle.js:4839, 4890`) prompting the user to regenerate. The `dirtyPhases` / `earliestDirtyStep` fields in `state-manager.js:399–418` track which upstream phases have changed content. Stale workflow steps in the top nav bar are marked with an "Outdated" inline badge (`bundle.js:4036–4053`).

**Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale.**

⚠️ Partial — The rewrite card renders a `<details class="rewrite-rationale"><summary>Rationale &amp; Evidence</summary>` section at `rewrite-review.js:316–321`, but only when `r.rationale` is truthy. There is no fallback text when rationale is absent, so users may see some cards with rationale and others silently missing it.

The `_build_system_prompt()` in `conversation_manager.py:402–470` instructs the LLM to provide structured confidence levels (Very High / High / Medium / Low / Very Low) and reasoning with evidence for/against — including "Evidence FOR the recommendation" and "Evidence AGAINST the recommendation". This context informs the chat stream and the AI's recommendation framing. The per-experience and per-skill review tables surface `reasoning` text inline (from `experience-review.js:181–186`, `skills-review.js:683–688`), but this reasoning comes from the customization recommendations, not the final rewrite proposals. No structured before/after rationale is linked across the two stages.

**Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes.**

❌ Fail — The `rewrite_audit` array is persisted in `session.json` at `conversation_manager.py:1157` and records the full proposal-plus-outcome for every rewrite decision. It is used for cold-restore in the UI (`rewrite-review.js:64–79`) but is **never exposed to the user as an inspectable audit log** in the application. Users cannot access the full decision history through the application after the session has progressed past the rewrite stage.

⚠️ Partial (session-level traceability) — Sessions are saved incrementally to `session.json` on disk at every phase transition (`_save_session()` in `conversation_manager.py:1845`). The session file contains `rewrite_audit`, `spell_audit`, `experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions`, and `generation_state`, so provenance is preserved on disk. However, the harvest tab and the download tab do not surface which session decisions produced the final outputs in the UI. The user cannot see "these 3 bullets were accepted rewrites, this skill was added via weak-evidence confirmation" without reading the raw JSON file directly.

The `position_name` and `session_id` appear in the position bar (`index.html:76–82`), providing a minimal session identity cue, but no workflow-summary view aggregates decisions for post-hoc inspection.

The `re_run_phase()` method (`conversation_manager.py:1470–1582`) preserves `prior_output` alongside `new_output` in state when a phase is re-run and appends to `rerun_log`, providing machine-readable traceability. The `_build_downstream_context()` method (`conversation_manager.py:1392–1433`) summarises prior decisions to re-run LLM prompts. These mechanisms exist in the backend but are not surfaced to the user in the UI.

**Acceptance criteria assessment:**

- Users can inspect key changes and their justification before finalisation: ✅ at the rewrite panel (diff view and conditional rationale), ⚠️ rationale conditional on orchestrator, ❌ no post-hoc audit log accessible in-UI.

---

## Generated Materials Evaluation

⚠️ Partial — There is no mechanism in the generated files (DOCX, PDF) to indicate which bullets were AI-rewrites versus original master CV content. A compliance reviewer reading the final package would have no way to identify AI-modified text from the document itself. The download tab shows a `generatedAt` timestamp (`download-tab.js:167–175`) and the output directory path, but no per-field provenance annotation.

The `download-tab.js` employment date overlap warning (`lines 345–354`) does surface a cross-check of date integrity in the generated output, warning the user about overlapping employment dates before they submit. This is a positive integrity signal, though it is a data-consistency check rather than an AI-provenance marker.

— N/A — Story US-C3 acceptance criterion ("users can inspect key changes and their justification before finalisation") is scoped to the UI workflow interaction, not the generated file content. The rewrite review panel satisfies this at the interaction level.

---

## Additional Story Gaps / Proposed Story Items

1. **Provider data-retention disclosure** — The "⚠ Non-confidential" badge (`index.html:59`, bundle.js shows `ncBadge.style.display = info && info.confidential === false ? "" : "none"` at line 6493) fires when a provider is explicitly flagged as non-confidential. No badge appears when `confidential` is `undefined`, making the data-handling status opaque for most providers. No provider privacy policy link is surfaced in the wizard or settings. A new story should require: (a) a clear data-handling statement per provider in the LLM wizard step 1/2, and (b) a link to provider privacy terms in the wizard and the settings modal.

2. **AI provenance labelling in the conversation stream** — Conversation messages from the AI (`appendMessage('assistant', ...)`) have no visual differentiation from application system status messages in the chat panel. A compliance reviewer cannot distinguish a generated AI recommendation from an application status notification without reading the text content. A proposed story: all `assistant`-role messages should carry a visible "AI" badge or distinct visual treatment.

3. **Audit log UI exposure** — The `rewrite_audit` array is persisted in session JSON but never surfaced in the UI. A proposed story: a "Session Audit" view (tab or modal) that shows the full decision log for the current session — which rewrites were accepted/rejected/edited, which weak-evidence items were confirmed, and a timeline of phase transitions with `rerun_log` entries.

4. **Customization-stage per-item decision enforcement** — No story currently requires that all items in the Experience, Skills, and Achievements review panels have an explicit user decision before progression. The current silent-default behavior (items without a decision use the AI recommendation) is not disclosed to the user. A proposed story: either (a) block progression until all items are explicitly decided, or (b) show a count of "N items using AI default" with a clear disclosure before advancing.

5. **Rationale completeness guarantee** — If the orchestrator does not populate `r.rationale`, the rewrite card shows no rationale section with no indication of absence. A proposed story: always render a rationale section, even if it contains a fallback ("No detailed rationale was generated for this change") so the absence is visible rather than invisible.

6. **Cold-restore decision disclosure** — When `_restoreDecisions()` re-applies prior decisions on cold restore (`rewrite-review.js:52–79`), the user is not informed that previously recorded choices have been reapplied. A proposed story: surface a notification ("Prior decisions restored from last session") when the cold-restore path triggers.

7. **Confidence badge coverage gap** — `styles.css:706–727` defines `.confidence-high`, `.confidence-medium`, and `.confidence-low` variants but not `.confidence-very-high` or `.confidence-very-low`. The LLM system prompt (`conversation_manager.py:428`) specifies a 5-point scale including "Very High" and "Very Low". If the backend surfaces these values as CSS class suffixes, they would render unstyled. A proposed story: add the two missing badge variants or normalise the confidence scale to a 3-point badge set.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py (plus direct inspection of web/rewrite-review.js, web/harvest.js, web/spell-check.js, web/experience-review.js, web/skills-review.js, web/download-tab.js, web/bundle.js for corroboration)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | --------- | ------ | ---------- |
| US-C1 Criterion 1: Rewrites presented as suggestions | ✅ | | | |
| US-C1 Criterion 2: Weak-evidence flagged | ✅ badge + persuasion overlay | ⚠️ rationale conditional; confidence badge missing very-high/very-low variants | | |
| US-C1 Criterion 3: No blur between proposed and approved | ✅ | | | |
| US-C2 Criterion 1: Review stages block progression | ✅ rewrite + layout + spell + harvest | ⚠️ customization defaults silently accepted | | |
| US-C2 Criterion 2: Accept/reject/edit distinguishable | ✅ | | | |
| US-C2 Criterion 3: No silent auto-accept | ✅ fresh render | ⚠️ cold-restore silently reapplies | | |
| US-C3 Criterion 1: Diff view available | ✅ rewrite diff + layout-freshness chip + stale callout | | | |
| US-C3 Criterion 2: Rationale exposed | | ⚠️ conditional on orchestrator; no cross-stage linkage | | |
| US-C3 Criterion 3: Finalisation traceable | | ⚠️ disk only (session.json) | ❌ no in-UI audit log | |

**Key evidence references:**

- Non-confidential badge: `web/index.html:59`, `web/bundle.js:6490–6493`
- Weak-evidence `⚠ Candidate to confirm` badge: `web/rewrite-review.js:285–288`
- Confidence badge styling: `web/styles.css:706–727`; per-experience/skill display: `web/experience-review.js:168–200`, `web/skills-review.js:636–688`
- Word-level LCS diff rendering: `web/rewrite-review.js:238–282`, `renderDiffHtml` at line 275
- Inline diff element with `data-original`: `web/rewrite-review.js:310–311`
- Rationale/evidence section (conditional): `web/rewrite-review.js:316–321`
- Persuasion warning overlay + acknowledge gate: `web/rewrite-review.js:153–173`, line 105
- Submit button disabled until all decided: `web/rewrite-review.js:189`, `updateRewriteTally:444–449`
- Layout-freshness chip and stale callout: `web/state-manager.js:144–178`, `web/bundle.js:4036–4053, 4839–4895`
- Dirty-phases traceability: `web/state-manager.js:399–418`
- Harvest opt-in comment: `web/harvest.js:100`; confirmation dialog: lines 498–505
- Spell-check pending confirmation: `web/spell-check.js:399–415`
- Rewrite audit persisted but not exposed as UI: `scripts/utils/conversation_manager.py:1157`, `web/rewrite-review.js:64–79`
- Phase gating for sequential unlock: `web/ui-core.js:1894–1990` (`updateWorkflowStepsClickable`)
- Phase transition validation: `scripts/utils/conversation_manager.py:163–183` (`_set_phase`)
- Session persistence: `conversation_manager.py:1845` (`_save_session`)
- Cold-restore of prior decisions: `web/rewrite-review.js:52–79` (`_restoreDecisions`)
- LLM confidence/evidence 5-point prompt structure: `conversation_manager.py:402–470` (`_build_system_prompt`)
- Downstream context and rerun_log: `conversation_manager.py:1392–1433`, `1570–1582`
- Layout confirm gate: `conversation_manager.py:1198–1219` (`complete_layout_review`)
- Accept/reject/edit button trio with `aria-pressed`: `web/rewrite-review.js:328–330`
- Generated-at timestamp on download tab: `web/download-tab.js:167–175`
- Date overlap warning on download tab: `web/download-tab.js:345–354`
