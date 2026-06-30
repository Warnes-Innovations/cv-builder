<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust/Compliance Review Status

**Last Updated:** 2026-06-30 10:30 ET

**Executive Summary:** The application has solid foundations for US-C1 (transparent AI suggestions) and US-C2 (approval integrity) — the rewrite review card UI provides word-level diffs, explicit accept/edit/reject paths, and a persuasion-warning overlay that must be acknowledged before progression. Weak-evidence skill suggestions are visually flagged. The AI provider data-handling disclosure (the "Non-confidential" badge) is implemented and surfaced in the header. Where the implementation falls short is in US-C3 (provenance and audit cues): the `rewrite_audit` field is persisted in session JSON and used for cold-restore but is never exposed to the user as an inspectable log; rationale exposure on each rewrite card is conditional on `r.rationale` being populated (orchestrator-dependent); and the harvest/download flows do not surface which session decisions produced the final outputs. No story yet covers data-retention disclosure with provider policy links, explicit AI provenance labelling in the conversation stream, or per-item decision enforcement in the customization panel.

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

A collapsible persuasion-warning summary banner at `rewrite-review.js:153–173` aggregates flags by type and requires an "Acknowledged" button click before the submit button unlocks (`persuasionWarningsAcknowledged` guard).

⚠️ Partial caveat: The `rationale` field in each card is rendered conditionally at `rewrite-review.js:316–320` (`if r.rationale`). If the orchestrator does not populate `rationale` (e.g. for some skill additions), the collapsible "Rationale & Evidence" section is silently absent with no fallback text explaining why.

**Criterion 3 — The UI does not blur the line between approved output and proposed changes.**

✅ Pass — The rewrite panel is a separate tab (`tab-rewrite`) gated behind the "Review Rewrites" action button, which only appears after the customization phase (`app.js:132`). Generated output tabs (`tab-final_generate`, `tab-download`) are only unlocked after `complete_layout_review()` advances the phase to `FINAL_GENERATION` (`conversation_manager.py:1213`). The workflow step bar enforces sequential unlock via `updateWorkflowStepsClickable()` in `ui-core.js:1894–1990`.

**Acceptance criteria assessment:**

- AI-proposed content is reviewable before acceptance: ✅ enforced by phase gating and card UI.
- Higher-risk suggestions receive stronger visual signalling: ✅ `⚠ Candidate to confirm` badge and persuasion-warning overlay.

---

### US-C2: User Approval Integrity

**Criterion 1 — Review-required stages block progression until required decisions are made.**

✅ Pass (rewrite stage) — The "Submit All Decisions" button (`#submit-rewrites-btn`) is rendered `disabled` at `rewrite-review.js:189` and only enables when all cards have a decision and persuasion warnings are acknowledged (`updateRewriteTally()` logic). `submitRewriteDecisions()` also checks `persuasionWarningsAcknowledged`.

✅ Pass (layout stage) — `complete_layout_review()` in `conversation_manager.py:1198` must be called (via the "Confirm Layout" button) before the phase advances to `FINAL_GENERATION`. The `markLayoutConfirmed()` in `state-manager.js:371` gates the freshness chip and the "Continue to File Review" button.

⚠️ Partial (customization stage) — The customization tabs (Experiences, Skills, Achievements) allow users to set per-item decisions, but there is no hard block preventing the user from clicking "Review Rewrites" without having touched every item. The UI accepts the current state of `experience_decisions` / `skill_decisions`, which may be empty, causing the backend to use its own AI recommendations silently. This flexibility is by design, but from a compliance perspective, items without explicit decisions are auto-accepted without disclosure.

**Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable.**

✅ Pass — Three separate styled buttons with distinct labels and `aria-pressed` state: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:328–330`). Cards receive `accepted` or `rejected` CSS classes on decision. The tally bar separately counts accepted, rejected, and pending items (`rewrite-review.js:184–186`). The edit path requires an explicit textarea Save click before the decision is recorded (comment at line 365: "Decision is recorded only when the user clicks Save").

**Criterion 3 — The UI does not silently auto-accept review items.**

✅ Pass (rewrite stage) — All rewrite cards start with no decision set; `rewriteDecisions` is reset to `{}` when the panel renders (`rewrite-review.js:112`). The submit button is disabled until every card has a decision.

⚠️ Partial (cold-restore path) — `_restoreDecisions()` at `rewrite-review.js:52–79` re-seeds decisions from `rewrite_audit` on cold restore. If a prior session already completed the rewrite stage, revisiting the rewrite tab will pre-populate decisions from the audit without user notification. Prior decisions auto-apply without a clear disclosure that previously recorded choices are being restored.

**Acceptance criteria assessment:**

- Approval-dependent workflow stages enforce explicit decision-making: ✅ for rewrite and layout stages. ⚠️ for customization stage (no per-item decision enforcement; AI defaults apply silently).

---

### US-C3: Provenance and Audit Cues

**Criterion 1 — Diff-like review is available where text is being changed.**

✅ Pass — The word-level LCS diff (`computeWordDiff` / `renderDiffHtml` at `rewrite-review.js:238–282`) renders `<del>` / `<ins>` spans inline for every rewrite card. The original text is preserved in `data-original` on the diff element (`rewrite-review.js:311`). Users can toggle between diff view and the after-text via the edit flow.

**Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale.**

⚠️ Partial — The rewrite card renders a `<details class="rewrite-rationale"><summary>Rationale &amp; Evidence</summary>` section at `rewrite-review.js:316–321`, but only when `r.rationale` is truthy. There is no fallback text when rationale is absent, so users may see some cards with rationale and others silently missing it. The `evidence` sub-field is similarly conditional (line 320).

The `_build_system_prompt()` in `conversation_manager.py:402–470` instructs the LLM to provide structured confidence levels (Very High / High / Medium / Low / Very Low) and reasoning with evidence for/against. This context informs the chat stream and the AI's recommendation framing, but it is not surfaced per-rewrite-card in a structured way in the review UI — it lives only in the conversation log.

**Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes.**

❌ Fail — The `rewrite_audit` array is persisted in `session.json` at `conversation_manager.py:1157` and records the full proposal-plus-outcome for every rewrite decision. It is used for cold-restore in the UI (`rewrite-review.js:64–79`) but is **never exposed to the user as an inspectable audit log** in the application. Users cannot access the full decision history through the application after the session has progressed past the rewrite stage.

⚠️ Partial (session-level traceability) — Sessions are saved incrementally to `session.json` on disk at every phase transition (`_save_session()` in `conversation_manager.py:1845`). The session file contains `rewrite_audit`, `spell_audit`, `experience_decisions`, `skill_decisions`, and `generation_state`, so provenance is preserved on disk. However, the harvest tab and the download tab do not surface which session decisions produced the final outputs in the UI. The user cannot see "these 3 bullets were accepted rewrites, this skill was added via weak-evidence confirmation" without reading the raw JSON file directly.

The `position_name` and `session_id` appear in the position bar (`index.html:76–82`), providing a minimal session identity cue, but no workflow-summary view aggregates decisions for post-hoc inspection.

**Acceptance criteria assessment:**

- Users can inspect key changes and their justification before finalisation: ✅ at the rewrite panel (diff view exists), ⚠️ rationale conditional, ❌ no post-hoc audit log accessible in-UI.

---

## Generated Materials Evaluation

Two observations from the source about generated output:

⚠️ Partial — There is no mechanism in the generated files (DOCX, PDF) to indicate which bullets were AI-rewrites versus original master CV content. A compliance reviewer reading the final package would have no way to identify AI-modified text from the document itself.

— N/A — Story US-C3 acceptance criterion ("users can inspect key changes and their justification before finalisation") is scoped to the UI workflow interaction, not the generated file content. The rewrite review panel satisfies this at the interaction level.

---

## Additional Story Gaps / Proposed Story Items

1. **Provider data-retention disclosure** — The "⚠ Non-confidential" badge (`index.html:59`, `auth-provider.js:86–90`) fires when `info.confidential === false`, but the tooltip is limited to "Data may be reviewed or retained by this provider — see provider settings for details." No provider privacy policy link is surfaced. For providers where `confidential` is `undefined`, no badge appears, making the default opaque. A new story should require: (a) a clear data-handling statement per provider in the LLM wizard step 1/2, and (b) a link to provider privacy terms in the wizard and the settings modal.

2. **AI provenance labelling in the conversation stream** — Conversation messages from the AI (`appendMessage('assistant', ...)`) have no visual differentiation from application system status messages in the chat panel. A compliance reviewer cannot distinguish a generated AI recommendation from an application status notification without reading the text content. A proposed story: all `assistant`-role messages should carry a visible "AI" badge or distinct visual treatment.

3. **Audit log UI exposure** — The `rewrite_audit` array is persisted in session JSON but never surfaced in the UI. A proposed story: a "Session Audit" view (tab or modal) that shows the full decision log for the current session — which rewrites were accepted/rejected/edited, which weak-evidence items were confirmed, and a timeline of phase transitions.

4. **Customization-stage per-item decision enforcement** — No story currently requires that all items in the Experience, Skills, and Achievements review panels have an explicit user decision before progression. The current silent-default behavior (items without a decision use the AI recommendation) is not disclosed to the user. A proposed story: either (a) block progression until all items are explicitly decided, or (b) show a count of "N items using AI default" with a clear disclosure before advancing.

5. **Rationale completeness guarantee** — If the orchestrator does not populate `r.rationale`, the rewrite card shows no rationale section with no indication of absence. A proposed story: always render a rationale section, even if it contains a fallback ("No detailed rationale was generated for this change") so the absence is visible rather than invisible.

6. **Cold-restore decision disclosure** — When `_restoreDecisions()` re-applies prior decisions on cold restore (`rewrite-review.js:52–79`), the user is not informed that previously recorded choices have been reapplied. A proposed story: surface a notification ("Prior decisions restored from last session") when the cold-restore path triggers.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-C1 Criterion 1: Rewrites presented as suggestions | ✅ | | | | |
| US-C1 Criterion 2: Weak-evidence flagged | ✅ (badge + persuasion overlay) | ⚠️ rationale conditional | | | |
| US-C1 Criterion 3: No blur between proposed and approved | ✅ | | | | |
| US-C2 Criterion 1: Review stages block progression | ✅ rewrite + layout | ⚠️ customization defaults silently accepted | | | |
| US-C2 Criterion 2: Accept/reject/edit distinguishable | ✅ | | | | |
| US-C2 Criterion 3: No silent auto-accept | ✅ fresh render | ⚠️ cold-restore silently reapplies | | | |
| US-C3 Criterion 1: Diff view available | ✅ | | | | |
| US-C3 Criterion 2: Rationale exposed | | ⚠️ conditional on orchestrator | | | |
| US-C3 Criterion 3: Finalisation traceable | | ⚠️ disk only | ❌ no in-UI audit log | | |

**Key evidence references:**

- Non-confidential badge: `web/auth-provider.js:86–90`, `web/index.html:59`
- Weak-evidence `⚠ Candidate to confirm` badge: `web/rewrite-review.js:285–288`
- Word-level LCS diff rendering: `web/rewrite-review.js:238–282`, `renderDiffHtml` at line 275
- Inline diff element with `data-original`: `web/rewrite-review.js:310–311`
- Rationale/evidence section (conditional): `web/rewrite-review.js:316–321`
- Persuasion warning overlay + acknowledge gate: `web/rewrite-review.js:153–173`, line 105
- Submit button disabled until all decided: `web/rewrite-review.js:189`
- Rewrite audit persisted but not exposed as UI: `scripts/utils/conversation_manager.py:1157`, `rewrite-review.js:64–79`
- Phase gating for sequential unlock: `web/ui-core.js:1894–1990` (`updateWorkflowStepsClickable`)
- Phase transition validation: `scripts/utils/conversation_manager.py:163–183` (`_set_phase`)
- Session persistence: `conversation_manager.py:1845` (`_save_session`)
- Cold-restore of prior decisions: `rewrite-review.js:52–79` (`_restoreDecisions`)
- LLM confidence/evidence prompt structure: `conversation_manager.py:402–470` (`_build_system_prompt`)
- Layout confirm gate: `conversation_manager.py:1198–1219` (`complete_layout_review`)
- Accept/reject/edit button trio with `aria-pressed`: `rewrite-review.js:328–330`
