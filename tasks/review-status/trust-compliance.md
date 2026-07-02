<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust/Compliance Review Status

**Last Updated:** 2026-07-01 ET

**Executive Summary:** The application has solid foundations for US-C1 (transparent AI suggestions) and US-C2 (approval integrity) — the rewrite review card UI provides word-level diffs, explicit accept/edit/reject paths, and a persuasion-warning overlay that must be acknowledged before progression. Weak-evidence skill suggestions are visually flagged with an "⚠ Candidate to confirm" badge. The AI provider data-handling disclosure (the "Non-confidential" badge) is implemented and surfaced in the header. A layout-freshness chip and stale callout provide provenance cues for preview/final state drift. Where the implementation falls short is in US-C3 (provenance and audit cues): the `rewrite_audit` field is persisted in session JSON and used for cold-restore but is never exposed to the user as an inspectable log; rationale exposure on each rewrite card is conditional on `r.rationale` being populated (orchestrator-dependent); and the harvest/download flows do not surface which session decisions produced the final outputs. No story yet covers data-retention disclosure with provider policy links, explicit AI provenance labelling in the conversation stream, or per-item decision enforcement in the customization panel.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

**Criterion 1 — Proposed rewrites and additions are visibly presented as suggestions.**

✅ Pass — `web/rewrite-review.js:399–432` renders each proposed change in a `.rewrite-card` with a word-level LCS diff (`<del class="diff-removed">` / `<ins class="diff-added">`). Cards are labelled with a `rewrite-card-type` span (e.g. "skill add", "bullet rewrite") and a location label. The card header makes clear these are proposals, not accepted text.

The conversation message at `rewrite-review.js:152` uses explicit framing: "Here are the AI's **N** text improvement suggestions… Review each suggestion in the Rewrites tab, then accept, edit, or reject before continuing."

**Criterion 2 — Weak-evidence or confirm-first cases are clearly flagged.**

✅ Pass — `rewrite-review.js:377–379`:

```js
const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
const weakBadge = isWeakSkillAdd
  ? `<span class="weak-badge">⚠ Candidate to confirm</span>`
  : '';
```

The `⚠ Candidate to confirm` badge is injected into the card header for weak-evidence skill additions. Persuasion-check warnings are surfaced per-card via `rewrite-persuasion-badges` at `rewrite-review.js:420–423`.

A collapsible persuasion-warning summary banner at `rewrite-review.js:213–244` aggregates flags by type and requires an "Acknowledged" button click before the submit button unlocks (the `persuasionWarningsAcknowledged` guard).

Experience review and skill review tabs also surface confidence badges and reasoning text. `experience-review.js` renders a `confidence-badge confidence-${confidence.level}` badge per experience row, with colour coding: green = high, amber = medium, red = low (in `styles.css`). The reasoning text is shown in the same table row. The same pattern applies in `skills-review.js`.

⚠️ Partial caveat: The `rationale` field in each rewrite card is rendered conditionally at `rewrite-review.js:414–419` (`if r.rationale`). If the orchestrator does not populate `rationale` (e.g. for some skill additions), the collapsible "Rationale & Evidence" section is silently absent with no fallback text explaining why.

**Criterion 3 — The UI does not blur the line between approved output and proposed changes.**

✅ Pass — The rewrite panel is a separate tab (`tab-rewrite`) gated behind the "Review Rewrites" action button, which only appears after the customization phase (`app.js:126–148`). Generated output tabs (`tab-final_generate`, `tab-download`) are only unlocked after `complete_layout_review()` advances the phase to `FINAL_GENERATION` (`conversation_manager.py`). The workflow step bar enforces sequential unlock via `updateWorkflowStepsClickable()` in `ui-core.js`.

**Acceptance criteria assessment:**

- AI-proposed content is reviewable before acceptance: ✅ enforced by phase gating and card UI.
- Higher-risk suggestions receive stronger visual signalling: ✅ `⚠ Candidate to confirm` badge and persuasion-warning overlay.

---

### US-C2: User Approval Integrity

**Criterion 1 — Review-required stages block progression until required decisions are made.**

✅ Pass (rewrite stage) — The "Submit All Decisions" button (`#submit-rewrites-btn`) is rendered `disabled` at `rewrite-review.js:277` and only enables when all cards have a decision and persuasion warnings are acknowledged (`updateRewriteTally()` at lines 559–585). `submitRewriteDecisions()` also checks `persuasionWarningsAcknowledged` at line 589 before continuing.

✅ Pass (layout stage) — `complete_layout_review()` in `conversation_manager.py` must be called (via the "Confirm Layout" button) before the phase advances to `FINAL_GENERATION`. The `markLayoutConfirmed()` in `state-manager.js:314–320` gates the freshness chip and the "Continue to File Review" button.

✅ Pass (harvest stage) — `harvest.js:100` comments explicitly: "All harvest items start unchecked — master CV updates are opt-in only (US-A11)." `applyHarvestSelections()` requires a confirmation dialog before writing to `Master_CV_Data.json`.

✅ Pass (spell-check stage) — `submitSpellCheckDecisions()` in `spell-check.js` prompts the user before advancing if any items are still `pending`: "N issues have not been reviewed and will be ignored. Proceed anyway?" Pending items are explicitly auto-ignored only after user confirmation.

⚠️ Partial (customization stage) — The customization tabs (Experiences, Skills, Achievements) allow users to set per-item decisions, but there is no hard block preventing the user from clicking "Review Rewrites" without having touched every item. The `app.js:127–142` soft-gate warns of unreviewed items but proceeds after a `window.confirm` — the user can dismiss it to proceed. The backend then uses its own AI recommendations for undecided items. From a compliance perspective, items without explicit decisions are AI-defaulted without a clear per-item disclosure.

**Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable.**

✅ Pass — Three separate styled buttons with distinct labels and `aria-pressed` state: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:426–428`). Cards receive `accepted` or `rejected` CSS classes on decision (`styles.css:1270–1271`). The tally bar separately counts accepted, rejected, and pending items (`rewrite-review.js:559–576`). The edit path requires an explicit textarea Save click before the decision is recorded (`rewrite-review.js:462–466`).

**Criterion 3 — The UI does not silently auto-accept review items.**

✅ Pass (rewrite stage, fresh session) — All rewrite cards start with no decision set; `rewriteDecisions` is reset to `{}` when the panel renders (`rewrite-review.js:144–145`). The submit button is disabled until every card has a decision.

⚠️ Partial (cold-restore path) — `_restoreDecisions()` at `rewrite-review.js:53–81` re-seeds decisions from `rewrite_audit` on cold restore. If a prior session already completed the rewrite stage, revisiting the rewrite tab will pre-populate decisions from the audit without user notification. Prior decisions auto-apply without a clear disclosure that previously recorded choices are being restored.

**Acceptance criteria assessment:**

- Approval-dependent workflow stages enforce explicit decision-making: ✅ for rewrite, layout, spell-check, and harvest stages. ⚠️ for customization stage (no per-item decision enforcement; AI defaults apply silently).

---

### US-C3: Provenance and Audit Cues

**Criterion 1 — Diff-like review is available where text is being changed.**

✅ Pass — The word-level LCS diff (`computeWordDiff` at `rewrite-review.js:330` / `renderDiffHtml` at `rewrite-review.js:368`) renders `<del>` / `<ins>` spans inline for every rewrite card. The original text is preserved in a `data-original` attribute on the diff element (`rewrite-review.js:408–409`). Users can toggle between diff view and the after-text via the edit flow, with the AI suggestion kept visible as reference (`rewrite-review.js:454–465`).

The layout-freshness chip in the position bar (`index.html:100`, `state-manager.js:120–178`) provides a staleness indicator: "Layout current", "Layout outdated", or "Files outdated". When layout or final files are stale relative to content changes, a stale callout is shown prompting the user to regenerate. The `dirtyPhases` / `earliestDirtyStep` fields in `state-manager.js:342–361` track which upstream phases have changed content.

**Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale.**

⚠️ Partial — The rewrite card renders a `<details class="rewrite-rationale"><summary>Rationale &amp; Evidence</summary>` section at `rewrite-review.js:415–418`, but only when `r.rationale` is truthy. There is no fallback text when rationale is absent, so users may see some cards with rationale and others silently missing it.

The `_build_system_prompt()` in `conversation_manager.py` instructs the LLM to provide structured confidence levels (Very High / High / Medium / Low / Very Low) and reasoning with evidence for and against each recommendation. The per-experience and per-skill review tables surface `reasoning` text inline, but this reasoning comes from the customization recommendations, not the final rewrite proposals. No structured before/after rationale is linked across the two stages.

**Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes.**

❌ Fail — The `rewrite_audit` array is persisted in `session.json` at `conversation_manager.py` and records the full proposal-plus-outcome for every rewrite decision. It is used for cold-restore in the UI (`rewrite-review.js:53–81`) but is **never exposed to the user as an inspectable audit log** in the application. A collapsible "Rewrite Audit Log" element is generated by `_renderRewriteAuditLog()` at `rewrite-review.js:161–198` and appended to the rewrite panel content — however this section only appears while the user is still on the Rewrites tab. Once they advance past that stage, no UI view surfaces the full decision history.

⚠️ Partial (session-level traceability) — Sessions are saved incrementally to `session.json` on disk at every phase transition. The session file contains `rewrite_audit`, `spell_audit`, `experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions`, and `generation_state`, so provenance is preserved on disk. However, the harvest tab and the download tab do not surface which session decisions produced the final outputs in the UI. The user cannot see "these 3 bullets were accepted rewrites, this skill was added via weak-evidence confirmation" without reading the raw JSON file directly.

The `position_name` and `session_id` appear in the position bar (`index.html:76–82`), providing a minimal session identity cue, but no workflow-summary view aggregates decisions for post-hoc inspection.

**Acceptance criteria assessment:**

- Users can inspect key changes and their justification before finalisation: ✅ at the rewrite panel (diff view and conditional rationale while on the Rewrites tab), ⚠️ rationale conditional on orchestrator, ❌ no post-hoc audit log accessible in-UI after advancing past the rewrite stage.

---

## Generated Materials Evaluation

⚠️ Partial — There is no mechanism in the generated files (DOCX, PDF) to indicate which bullets were AI-rewrites versus original master CV content. A compliance reviewer reading the final package would have no way to identify AI-modified text from the document itself. The download tab shows a `generatedAt` timestamp (`download-tab.js`) and the output directory path, but no per-field provenance annotation.

An optional `ai_attribution` setting is available in Settings (`ui-core.js:141`, `index.html:648–650`) — when enabled it embeds "Generated with AI assistance" in document properties and footer, providing a disclosure for contexts requiring it. This is opt-in (default unclear from static source) and applies globally to the document rather than per-field.

The download tab surfaces several content-integrity warnings before the user downloads: date overlap warnings, sparse experience warnings, year-only date warnings, and rewrite audit mismatch warnings (`download-tab.js:390–420`). The rewrite audit mismatch warning specifically flags when accepted rewrites may not have been applied to the generated text — a meaningful provenance cross-check.

The story acceptance criterion ("users can inspect key changes and their justification before finalisation") is scoped to the UI workflow interaction, not the generated file content. The rewrite review panel satisfies this at the interaction level.

---

## Terminology Clarity

The application uses clear and consistent terminology throughout the trust-relevant workflow:

- "AI suggestion" / "text improvement" language is used in the rewrite panel header and chat messages to signal the advisory nature of proposals.
- "Candidate to confirm" (weak-badge) and "Persuasion checks" are clear if slightly technical; "persuasion" may not be immediately understood by all users as meaning "potentially overstated claims".
- "ATS" (Applicant Tracking System) is expanded in the badge tooltip (`index.html:92`) — appropriate.
- "Harvest" is a clear metaphor for the opt-in promotion of session improvements to the master CV; the tab tooltip reinforces it: "save refined bullets, new skills, and summary variants back to your Master CV for future applications."
- "Non-confidential" in the LLM header badge (`index.html:59`) is accurate terminology but does not clearly communicate what it means to a user who does not already know — the title attribute text says "Data may be reviewed or retained by this provider — see provider settings for details" which is helpful but only shown on hover.

---

## Additional Story Gaps / Proposed Story Items

1. **Provider data-retention disclosure** — The "⚠ Non-confidential" badge (`index.html:59`) fires when a provider is explicitly flagged `confidential: false`. No badge appears when `confidential` is `undefined`, making the data-handling status opaque for most providers. No provider privacy policy link is surfaced in the wizard or settings. A new story should require: (a) a clear data-handling statement per provider in the LLM wizard step 1/2, and (b) a link to provider privacy terms in the wizard and the settings modal.

2. **AI provenance labelling in the conversation stream** — Conversation messages from the AI (`appendMessage('assistant', ...)`) have no visual differentiation from application system status messages in the chat panel. A compliance reviewer cannot distinguish a generated AI recommendation from an application status notification without reading the text content. A proposed story: all `assistant`-role messages should carry a visible "AI" badge or distinct visual treatment.

3. **Audit log UI exposure** — The `rewrite_audit` array is persisted in session JSON but is only visible in the Rewrites tab (via `_renderRewriteAuditLog()`) and not accessible from any later stage. A proposed story: a "Session Audit" view (tab or modal) that shows the full decision log for the current session — which rewrites were accepted/rejected/edited, which weak-evidence items were confirmed, and a timeline of phase transitions.

4. **Customization-stage per-item decision enforcement** — No story currently requires that all items in the Experience, Skills, and Achievements review panels have an explicit user decision before progression. The current soft-gate (a `window.confirm` at `app.js:138`) allows proceeding without reviewing all items, and undecided items silently use AI recommendations. A proposed story: show a count of "N items using AI default" with a clear disclosure banner before advancing.

5. **Rationale completeness guarantee** — If the orchestrator does not populate `r.rationale`, the rewrite card shows no rationale section with no indication of absence. A proposed story: always render a rationale section, even if it contains a fallback ("No detailed rationale was generated for this change") so the absence is visible rather than invisible.

6. **Cold-restore decision disclosure** — When `_restoreDecisions()` re-applies prior decisions on cold restore (`rewrite-review.js:53–81`), the user is not informed that previously recorded choices have been reapplied. A proposed story: surface a notification ("Prior decisions restored from last session") when the cold-restore path triggers.

7. **Confidence badge coverage gap** — `styles.css` defines `.confidence-high`, `.confidence-medium`, and `.confidence-low` variants but not `.confidence-very-high` or `.confidence-very-low`. The LLM system prompt in `conversation_manager.py` specifies a 5-point scale including "Very High" and "Very Low". If the backend surfaces these values as CSS class suffixes, they would render unstyled. A proposed story: add the two missing badge variants or normalise the confidence scale to a 3-point badge set.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py (plus direct inspection of web/rewrite-review.js, web/harvest.js, web/spell-check.js, web/download-tab.js, web/auth-provider.js for corroboration)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ----- | ------- | --------- | ------ | ---------- |
| US-C1 Criterion 1: Rewrites presented as suggestions | ✅ | | | |
| US-C1 Criterion 2: Weak-evidence flagged | ✅ badge + persuasion overlay | ⚠️ rationale conditional | | |
| US-C1 Criterion 3: No blur between proposed and approved | ✅ | | | |
| US-C2 Criterion 1: Review stages block progression | ✅ rewrite + layout + spell + harvest | ⚠️ customization defaults silently accepted | | |
| US-C2 Criterion 2: Accept/reject/edit distinguishable | ✅ | | | |
| US-C2 Criterion 3: No silent auto-accept | ✅ fresh render | ⚠️ cold-restore silently reapplies | | |
| US-C3 Criterion 1: Diff view available | ✅ rewrite diff + layout-freshness chip | | | |
| US-C3 Criterion 2: Rationale exposed | | ⚠️ conditional on orchestrator; no cross-stage linkage | | |
| US-C3 Criterion 3: Finalisation traceable | | ⚠️ rewrite audit log only visible on Rewrites tab | ❌ no post-stage audit log | |

**Key evidence references:**

- Non-confidential badge: `web/index.html:59`, `web/auth-provider.js:86–90`
- Weak-evidence `⚠ Candidate to confirm` badge: `web/rewrite-review.js:377–379`
- Word-level LCS diff rendering: `web/rewrite-review.js:330` (`computeWordDiff`), `web/rewrite-review.js:368` (`renderDiffHtml`)
- Inline diff element with `data-original`: `web/rewrite-review.js:408–409`
- Rationale/evidence section (conditional): `web/rewrite-review.js:414–419`
- Persuasion warning overlay + acknowledge gate: `web/rewrite-review.js:213–244`
- Submit button disabled until all decided: `web/rewrite-review.js:277`, `updateRewriteTally` at `rewrite-review.js:559–585`
- Submit persuasion guard: `web/rewrite-review.js:589–595`
- Cold-restore of prior decisions: `web/rewrite-review.js:53–81` (`_restoreDecisions`)
- Rewrite audit log rendered in panel (only on Rewrites tab): `web/rewrite-review.js:161–198`
- Soft-gate for unreviewed customization items: `web/app.js:127–142`
- Layout-freshness chip and staleness state: `web/state-manager.js:120–178`, `web/state-manager.js:342–361`
- Harvest opt-in comment: `web/harvest.js:100`
- Rewrite audit persisted in session JSON: `scripts/utils/conversation_manager.py`
- Layout confirm gate: `scripts/utils/conversation_manager.py` (`complete_layout_review`)
- Accept/reject/edit button trio with `aria-pressed`: `web/rewrite-review.js:426–428`
- Rewrite audit mismatch warning on download tab: `web/download-tab.js:411–419`
- AI attribution (opt-in disclosure): `web/index.html:648–650`, `web/ui-core.js:141`
- Confidence badge styles: `web/styles.css:1270–1271, 1277, 1283–1284, 1308–1310`
