<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-04-22 10:30 ET
**Executive Summary:** The cv-builder application has a solid foundation for trust and compliance: AI suggestions are visually distinguished from source content with word-level diffs, confidence levels are tracked and displayed for all recommendation types, and the rewrite stage enforces explicit per-item decisions gated by a persuasion-warning acknowledgement. Two gaps weaken the posture: (1) LLM provider data-retention disclosure is accessible only via a wizard popover and disappears after setup, leaving users who selected a non-confidential provider (Gemini free-tier, Groq) with no persistent reminder; (2) the customization stage (experiences, skills, achievements) carries no blocking gate requiring explicit per-item decisions before generation, so items can reach the final CV with only LLM defaults applied.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

**Criterion 1 — Proposed rewrites and additions are visibly presented as suggestions**

✅ **Pass**

Every proposed rewrite is rendered as a card in the dedicated Rewrites tab with a word-level inline diff (red = removed, green = added) computed by `computeWordDiff` and `renderDiffHtml` (web/rewrite-review.js:204–229). Three explicit action buttons (✓ Accept, ✎ Edit, ✗ Reject) appear on each card. The tab is never populated with a pre-accepted or merged result — the user sees only the unresolved proposals on arrival.

Skill additions with weak evidence carry a `⚠ Candidate to confirm` badge rendered at web/rewrite-review.js:238–240:
```js
const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
const weakBadge = isWeakSkillAdd
  ? `<span class="weak-badge">⚠ Candidate to confirm</span>` : '';
```

**Criterion 2 — Weak-evidence or confirm-first cases are clearly flagged**

✅ **Pass**

Persuasion warnings are collected in a dedicated red panel (`background:#fef2f2; border:1px solid #fecaca`) above the rewrite cards (web/rewrite-review.js:79–109). The panel lists each warning by `flag_type` and location. Submission is blocked until the user explicitly clicks "✓ Acknowledged" (web/rewrite-review.js:105). The backend computes eight structural checks (strong action verb, passive voice, word count, result clause, named institution, CAR structure, summary generic phrases — conversation_manager.py:1009–1070) so the flag set is grounded in concrete heuristics, not heuristic-free.

Confidence levels for experience, skill, and achievement recommendations are computed by `getConfidenceLevel` / `getSkillConfidence` / `getAchievementConfidence` in web/recommendation-helpers.js (lines 68, 90, 126) using a five-point scale (Very High → Very Low) and displayed in review panels.

**Criterion 3 — The UI does not blur the line between approved output and proposed changes**

✅ **Pass**

`rewriteDecisions` is module-level state in web/rewrite-review.js; it starts empty and is only populated when the user clicks Accept, Edit+Save, or Reject. The backend's `approve_rewrites` method (conversation_manager.py:879–928) persists only decided entries to `approved_rewrites` and records all outcomes in `rewrite_audit`. No merging of undecided proposals into the session state occurs.

---

### US-C2: User Approval Integrity

**Criterion 1 — Review-required stages block progression until required decisions are made**

⚠️ **Partial**

*Rewrite stage* — fully gated. `submitRewriteDecisions` is disabled while `pending > 0` **and** until `persuasionWarningsAcknowledged` is true (web/rewrite-review.js:358):
```js
if (submitBtn) submitBtn.disabled = (pending > 0 || !persuasionWarningsAcknowledged);
```

*Spell-check stage* — gated with a soft confirm, not a hard block. When the user clicks "Done" with unreviewed items still pending, a confirmation modal warns "n issues have not been reviewed and will be ignored. Proceed anyway?" (web/spell-check.js:363–372). If the user confirms, pending items are auto-resolved to `'ignore'`. This is an explicit acknowledgement gate, but its semantics are weaker than the rewrite gate — a user can proceed with a single click without reviewing any individual item.

*Customization stage* — no blocking gate found. Experience, skill, and achievement review panels allow users to submit whatever subset of decisions they have made. Undecided items silently default to the LLM's `recommendation` field (e.g., "Include" or "Omit") without an explicit per-item decision prompt. Users can arrive at generation with many items never explicitly reviewed.

**Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable**

✅ **Pass**

The rewrite card UI maintains three visually distinct states: `.accepted` (green tint), `.rejected` (muted/strikethrough), and edit-in-progress (textarea visible). After a `saveRewriteEdit`, the card is styled `.accepted` with the `edit` button marked `.active` (web/rewrite-review.js:336–360), preserving a visible record of how each item was resolved.

**Criterion 3 — The UI does not silently auto-accept review items that are expected to be user-controlled**

⚠️ **Partial**

No silent auto-acceptance was found for rewrite items. However, the spell-check flow converts unreviewed items to `'ignore'` after a single bulk confirmation (web/spell-check.js:377–379), and the customization-stage items carry implicit defaults without explicit per-item confirmation. The word "silently" does not strictly apply in the spell-check case (there is a modal), but the approval is coarser than the per-item rewrite model.

---

### US-C3: Provenance and Audit Cues

**Criterion 1 — Diff-like review is available where text is being changed**

✅ **Pass**

Word-level LCS diff is computed for every rewrite proposal via `computeWordDiff(original, proposed)` (web/rewrite-review.js:205) and rendered with `<del class="diff-removed">` / `<ins class="diff-added">` spans (web/rewrite-review.js:216–220). After a user edit, the diff is regenerated against the user's text (web/rewrite-review.js:336–342), so the displayed diff always reflects the actual delta.

**Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale**

✅ **Pass**

Each rewrite card includes a collapsible `<details class="rewrite-rationale">` section containing both `rationale` (the LLM's explanation) and `evidence` (source text from the job description or CV) when provided (web/rewrite-review.js:280–285):
```js
${r.rationale ? `
<details class="rewrite-rationale">
  <summary>Rationale &amp; Evidence</summary>
  <p>${escapeHtml(r.rationale)}</p>
  ${r.evidence ? `<p ...>${escapeHtml(r.evidence)}</p>` : ''}
</details>` : ''}
```

Experience, skill, and achievement recommendations also expose `reasoning` via `getExperienceReasoning` / `getSkillReasoning` / `getAchievementReasoning` (web/recommendation-helpers.js:82–162).

**Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes**

✅ **Pass**

`rewrite_audit` (every proposal + its outcome) and `approved_rewrites` are persisted to `session.json` at each `_save_session()` call (conversation_manager.py:919–920, 1585–1645). The finalise confirmation summary shows `approved_rewrites` count (web/finalise.js:200–209). Harvest candidates expose a `rationale` column and the apply result shows a `diff_summary` per item (web/finalise.js:268–302 and 355–361). No items are pre-selected in harvest — "No items are pre-selected — choose only what you want to keep" (web/finalise.js:268).

⚠️ **Partial limitation:** There is no UI view that lets a user inspect the full `rewrite_audit` array or the session-level `conversation_history` after the session is completed. The audit record exists in `session.json` but is not surfaced in the Finalise tab or any dedicated audit panel.

---

## Generated Materials Evaluation

### AI Accuracy and Factual Grounding

✅ **Pass — grounding mechanism**

All LLM prompts for customization and rewriting include the full `Master_CV_Data.json` as context (conversation_manager.py:390–395, 532, 660, 730). Skills recommendations are constrained to items in the master data; the rewrite stage operates on actual bullet text rather than generating new facts. This significantly limits hallucination risk for core CV content.

⚠️ **Partial — skill additions and summary variants**

`extra_skills` (conversation_manager.py state key, line 88) allows the LLM to suggest skills not present in the master data. Summary variants can introduce new characterizations of the user's career that may not be grounded in factual entries. These items flow through the same review gates (accept/reject in the relevant tabs) but there is no factual-grounding check verifying that a suggested extra skill corresponds to actual work history.

🔲 **Not Implemented — AI-proposal label for summary variants**

When the LLM proposes a professional summary variant, there is no UI warning indicating that the summary was AI-generated and should be verified for accuracy. The summary review tab presents the variant text without a visible "AI-proposed" label distinguishing it from user-authored summaries sourced from the master data.

### AI Attribution in Generated Documents

🔲 **Not Implemented**

The generated CV files (PDF and DOCX) contain no metadata, footer, or header indicating that AI was used in their creation. For contexts where AI-assisted content authorship requires disclosure (certain academic submissions, grant applications, or government roles), the absence of attribution metadata could expose users to compliance risk they are not aware of.

### LLM Provider Data-Retention Disclosure

⚠️ **Partial**

`provider_registry.py` correctly tracks `confidential` flags and `privacy_url` per provider:
- GitHub, Copilot, copilot-oauth, OpenAI, Anthropic: `confidential: True`
- Gemini free-tier: `confidential: False` with note "Free-tier prompts may be reviewed by Google"
- Groq: `confidential: False` with note "Review Groq privacy policy for data retention details"

This data is surfaced in the LLM wizard step-1 provider-card popovers (web/provider-info.js:63–79) and the model-selection table (web/index.html:458). However:

1. The disclosure is **only visible during initial setup**. Once a provider is configured and the wizard is closed, there is no persistent indicator in the header pill or settings panel warning that the active provider is non-confidential.
2. The header pill shows "LLM: [model name]" with a ready/not-ready badge (web/index.html:50–55) but no `confidential` status.
3. For a user who selected Gemini's free tier at startup and never re-opened the wizard, their CV content and job descriptions are being sent to Google for potential review — with no visible UI reminder.

---

## Additional Story Gaps / Proposed Story Items

**GAP-TC-1: Persistent non-confidential provider warning**
*Proposed story:* As a trust/compliance reviewer, I want a persistent visual indicator when the active LLM provider is non-confidential, so that users who send sensitive career data to providers like Gemini free-tier or Groq are continuously reminded of data-retention risk.
Evidence: `confidential: False` for gemini (provider_registry.py:171) and groq (provider_registry.py:190); header pill shows only model name and auth status (web/index.html:50–55).

**GAP-TC-2: Per-item decision gate in customization stages**
*Proposed story:* As a trust/compliance reviewer, I want the customization stage (experience/skill/achievement review) to require explicit decisions on AI-recommended items rather than allowing undecided items to inherit LLM defaults silently, so that users remain in active control of what enters their CV.
Evidence: customization tabs allow submission with undecided items; rewrite tab already demonstrates the correct gating pattern (web/rewrite-review.js:358).

**GAP-TC-3: Summary variant AI-proposal labeling**
*Proposed story:* As a trust/compliance reviewer, I want all AI-generated summary variants to be clearly labeled as AI-proposed (not authored by the user) in the Summary review tab, so that users apply appropriate scrutiny before accepting AI characterizations of their career.
Evidence: no "AI-proposed" label found for summary variants; contrast with weak-badge pattern in web/rewrite-review.js:238–240.

**GAP-TC-4: Session audit panel**
*Proposed story:* As a trust/compliance reviewer, I want a read-only session audit view accessible from the Finalise tab that shows the full `rewrite_audit` log (what was proposed, what was accepted, what was edited), so that users can reconstruct the approval chain after the fact.
Evidence: `rewrite_audit` exists in session.json (conversation_manager.py:920) but is not exposed in any UI tab.

**GAP-TC-5: AI attribution option in generated files**
*Proposed story:* As a trust/compliance reviewer, I want the option to include an "AI-assisted" attribution in the metadata or footer of generated PDF/DOCX files, so that users can disclose AI involvement where required by the role or institution.
Evidence: no attribution mechanism found in cv_orchestrator or template renderer.

**GAP-TC-6: LLM data-transmission disclosure**
*Proposed story:* As a trust/compliance reviewer, I want users to see a clear one-time disclosure that their CV content and job description are transmitted to the configured LLM provider, so that the data flow is transparent before any sensitive career data leaves the local machine.
Evidence: no in-app disclosure of external data transmission found; onboarding modal (web/index.html:264–313) mentions AI but not external data transmission.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

Additional files consulted: web/rewrite-review.js, web/recommendation-helpers.js, web/finalise.js, web/spell-check.js, web/provider-info.js, scripts/utils/provider_registry.py

| Story  | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|--------|---------|-----------|--------|------------|-------|
| US-C1 Transparent AI Suggestions | 3 | 0 | 0 | 0 | 0 |
| US-C2 User Approval Integrity     | 1 | 2 | 0 | 0 | 0 |
| US-C3 Provenance and Audit Cues   | 3 | 1 | 0 | 0 | 0 |
| Materials — grounding             | 1 | 1 | 0 | 1 | 0 |
| Materials — attribution           | 0 | 0 | 0 | 1 | 0 |
| Materials — provider disclosure   | 0 | 1 | 0 | 0 | 0 |

**Tally: 8 ✅ Pass · 5 ⚠️ Partial · 0 ❌ Fail · 2 🔲 Not Implemented · 0 — N/A**

**Key evidence references:**

- US-C1 (suggestion transparency) → web/rewrite-review.js:204–229 (`computeWordDiff`, `renderDiffHtml`)
- US-C1 (weak badge) → web/rewrite-review.js:238–240
- US-C1 (confidence display) → web/recommendation-helpers.js:42–68 (`_parseConfidence`, `getConfidenceLevel`)
- US-C1 (persuasion gate) → web/rewrite-review.js:79–109 (red warning panel), :358 (disabled submit)
- US-C2 (rewrite gate) → web/rewrite-review.js:358 (`pending > 0 || !persuasionWarningsAcknowledged`)
- US-C2 (spell-check soft gate) → web/spell-check.js:363–379 (confirm modal + auto-ignore)
- US-C2 (customization no gate) → web/experience-review.js, web/skills-review.js (no blocking gate found)
- US-C2 (harvest explicit selection) → web/finalise.js:268 ("No items are pre-selected")
- US-C3 (diff review) → web/rewrite-review.js:280–285 (`<details class="rewrite-rationale">`)
- US-C3 (audit persisted) → scripts/utils/conversation_manager.py:919–920 (`rewrite_audit` saved)
- US-C3 (no audit UI) → web/finalise.js (no audit panel found)
- Materials (grounding) → scripts/utils/conversation_manager.py:390–395 (master_data in prompts)
- Materials (extra_skills gap) → scripts/utils/conversation_manager.py:88 (`extra_skills` state key)
- Provider disclosure → scripts/utils/provider_registry.py:171 (`confidential: False` for gemini), :190 (groq)
- Provider disclosure (popover only) → web/provider-info.js:63–79 (`providerInfoPopoverContent`)
- No persistent warning → web/index.html:50–55 (header pill shows model name and auth status only)

**Evidence standard:** Every conclusion is supported by file:line citations from direct source inspection. No conclusion depends on prior review documents or untested assertions.


**Criteria 1: Proposed rewrites are visibly presented as suggestions.**

✅ **Pass** — The Rewrites tab renders a panel headed "✏️ Review Text Improvements" with explicit messaging: "Look over each suggestion… accept, edit, or reject each one before continuing to spell check" (`web/rewrite-review.js:64`). Each card shows original and proposed text with an LCS word-level inline diff.

**Criteria 2: Weak-evidence or confirm-first cases are clearly flagged.**

⚠️ **Partial** — The persuasion-warning system (Phase 10) is implemented. `web/rewrite-review.js:46–58` fetches `persuasion_warnings` from `/api/rewrites`, groups them by type, and renders a red collapsible banner at the top of the panel. `conversation_manager.py:980–1064` defines `run_persuasion_checks`, applying 8 heuristic checks (strong action verb, passive voice, word count, result clause, named institution, CAR structure, summary generic phrases). **Gap**: the warning detail section is collapsed by default (`rewrite-review.js:85` `style="display:none"`), and the "✓ Acknowledged" button lives inside the collapsed panel (`rewrite-review.js:92–96`). A user can submit rewrite decisions without ever expanding the warning. Individual cards carry no inline severity badge distinguishing `warn` vs `info`.

**Criteria 3: The UI does not blur approved output with proposed changes.**

✅ **Pass** — Session state separates `pending_rewrites`, `approved_rewrites`, and `rewrite_audit` (`conversation_manager.py:74–77`). The customization stage never auto-promotes any pending rewrite. The tally bar tracks accepted / rejected / pending independently (`rewrite-review.js:338–358`). The `submit-rewrites-btn` is rendered `disabled` on mount (`rewrite-review.js:125`) and stays disabled while `pending > 0` (`rewrite-review.js:358`).

**Acceptance Criterion — AI-proposed content is reviewable before acceptance.**

✅ **Pass** — Every rewrite card exposes explicit accept / edit / reject controls. `submitRewriteDecisions` is blocked by the button-disabled guard.

**Acceptance Criterion — Higher-risk suggestions receive stronger visual signalling.**

⚠️ **Partial** — A red banner aggregates counts by type. The severity field (`warn` | `info`) from `run_persuasion_checks` is stored but is not rendered as a per-card badge or visual distinction at the card level.

---

### US-C2 — User Approval Integrity

**Criteria 1: Review-required stages block progression until decisions are made.**

⚠️ **Partial** — Rewrite review: submit button is blocked while any pending item remains (`rewrite-review.js:358`). **Gap**: when zero rewrites exist, the workflow auto-advances directly to `generate_cv` without showing the Rewrites tab at all (`current-implemented-workflow.md` §Rewrite Review). The user never sees a confirmation that the review stage was evaluated cleanly.

Spell check: a similar fast-path exists — if no flags are returned, the frontend auto-continues to generate (`current-implemented-workflow.md` §Spell Check, note 1).

Customise stage: experience/skill/achievement decisions are not gated. The Generate button (`app.js:117`) checks `userSelections` for already-submitted decisions but does not block if the user has never opened the decision panels.

**Criteria 2: Acceptance, rejection, and edit paths remain distinguishable.**

✅ **Pass** — Three distinct rewrite actions: accept (green), reject (red), edit (opens textarea). Card class names reflect state (`.accepted` / `.rejected`, `rewrite-review.js:301–307`). Active buttons receive the `.active` class.

**Criteria 3: The UI does not silently auto-accept items expected to be user-controlled.**

⚠️ **Partial** — When rewrites exist, no item is auto-accepted. When zero rewrites exist the workflow treats absence as implicitly accepted and advances silently. Same applies to the zero-flags spell-check path.

**Acceptance Criterion — Approval-dependent stages enforce explicit decision-making.**

⚠️ **Partial** — Satisfied for non-empty rewrite review. Not satisfied for: (a) empty rewrite review fast-path, (b) empty spell-check fast-path, (c) Customise stage with no decision gating.

---

### US-C3 — Provenance and Audit Cues

**Criteria 1: Diff-like review is available where text is being changed.**

✅ **Pass** — `computeWordDiff` (`rewrite-review.js:196–259`) implements a full LCS word-level diff, tokenising by whitespace and producing `unchanged` / `removed` / `added` tokens. Removed tokens render as red strikethrough, added tokens as green. Diffs regenerate live when a user edits a card.

**Criteria 2: The UI retains or exposes rationale where promised.**

✅ **Pass** — Each rewrite proposal carries a `rationale` field. `rewrite_audit` in session state (`conversation_manager.py:920`) stores every proposal merged with its outcome and `final` text. The harvest candidate table (`finalise.js:276`) renders `c.rationale` in a dedicated column for every candidate.

**Criteria 3: Finalisation and harvest flows remain traceable to reviewed changes.**

✅ **Pass** — `_compile_harvest_candidates` (`generation_routes.py:897`) sources candidates exclusively from `conversation.state['approved_rewrites']`. Harvest apply (`generation_routes.py:1961–1978`) creates a git commit with message `"chore: Update master CV data from {company}_{role}_{date} session"`. `_save_master` (`web_app.py:1166–1188`) creates a timestamped backup before overwriting and restores it if post-write schema validation fails.

---

## Generated Materials Evaluation

Generated output files (HTML, PDF, DOCX) do not embed provenance metadata — session ID, LLM provider, model, date, or rewrite-audit summary — in the file itself. Users cannot verify after the fact which session or model produced a given file from the artifact alone. This is an expected limitation of the single-user local architecture but is not disclosed anywhere in the UI.

The harvest rationale column (`finalise.js:276`) renders LLM-generated text without attribution. No label indicates that rationale is AI-inferred rather than factually sourced. Users evaluating candidates in the harvest table cannot distinguish the basis of the rationale.

---

## Additional Story Gaps / Proposed Story Items

**GAP-T1 (HIGH) — Persuasion warning acknowledgement can be bypassed**
Warning detail is collapsed by default (`rewrite-review.js:85`, `style="display:none"`). The "✓ Acknowledged" button is inside the collapsed section (`rewrite-review.js:92–96`). Users can submit rewrite decisions without ever reading or expanding the warning.
*Proposed US-C4*: The Submit button must remain disabled until each `warn`-severity persuasion warning has been individually acknowledged via the button inside the expanded panel.

**GAP-T2 (MEDIUM) — Silent auto-advance through empty review stages**
Zero-rewrite and zero-flag paths advance without any user-visible confirmation that the stage was evaluated. Users cannot distinguish "nothing needed review" from "review was skipped."
*Proposed US-C5*: When a review stage produces zero items, display an explicit confirmation screen with a summary ("0 rewrites required" / "0 spell flags found") before advancing.

**GAP-T3 (MEDIUM) — No in-app disclosure that CV content is transmitted to external LLM APIs**
The application sends the user's full CV data and job description to third-party LLM providers. There is no in-app notice or one-time acknowledgement of this data flow. The localhost URL and file-path settings imply local storage, but the transmission path is invisible.
*Proposed US-C6*: First session creation must show a one-time disclosure ("Your job description and CV excerpts are sent to the configured LLM provider for analysis") with an explicit acknowledgement checkbox before proceeding.

**GAP-T4 (MEDIUM) — Customise stage decisions not gated before Generate**
A user can reach the Generate step without visiting or deciding on any item in the Customise stage. The customizations used for generation may not reflect any user intent.
*Proposed US-C7*: The Generate action must require that at least one explicit decision has been submitted from the Customise stage, or show a blocking warning that no customisation decisions were made.

**GAP-T5 (LOW) — Harvest rationale column is AI-generated but unlabelled**
Rationale in the harvest table (`finalise.js:276`) is LLM-produced and displayed without attribution or caveat.
*Proposed US-C8*: Harvest candidate rationale fields must carry a visible "(AI-generated)" annotation.

**GAP-T6 (LOW) — Session data retention not disclosed**
Sessions accumulate indefinitely in `~/CV/files/sessions`. There is no in-app guidance on retention, how to delete sessions, or what happens to files after in-memory eviction.
*Proposed US-C9*: The Sessions panel must include a note explaining where session files are stored and how to permanently delete them.

---

**Reviewed against:**
- `web/index.html` (lines 1–550+)
- `web/app.js` (all 136 lines)
- `web/ui-core.js` (lines 1–430)
- `web/state-manager.js` (lines 1–400)
- `web/rewrite-review.js` (lines 1–430)
- `web/finalise.js` (lines 1–430)
- `web/master-cv.js` (lines 1–200)
- `web/session-actions.js` (lines 1–150)
- `scripts/web_app.py` (lines 1–300, 1150–1260)
- `scripts/utils/conversation_manager.py` (lines 60–120, 880–1064)
- `scripts/routes/generation_routes.py` (lines 1–120, 897–980, 1093–1120, 1860–1980)
- `tasks/current-implemented-workflow.md` (all)
- `tasks/user-story-trust-compliance.md` (all)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-C1 Transparent AI Suggestions | 3 | 2 | 0 | 0 | 0 |
| US-C2 User Approval Integrity     | 1 | 3 | 0 | 0 | 0 |
| US-C3 Provenance and Audit Cues   | 3 | 0 | 0 | 0 | 0 |

**Tally: 7 ✅ Pass · 5 ⚠️ Partial · 0 ❌ Fail · 0 🔲 Not Implemented · 0 — N/A**

**Key evidence references:**
- `web/rewrite-review.js:125` — `submit-rewrites-btn` rendered `disabled` on mount
- `web/rewrite-review.js:358` — button re-enabled only when `pending === 0`
- `web/rewrite-review.js:85–96` — persuasion warning detail collapsed by default; "Acknowledged" button inside collapsed section
- `web/rewrite-review.js:46–58` — `persuasion_warnings` fetched from `/api/rewrites`
- `conversation_manager.py:74–77` — `pending_rewrites`, `approved_rewrites`, `rewrite_audit` kept separate
- `conversation_manager.py:920` — `rewrite_audit` stores full proposal + outcome
- `generation_routes.py:897` — `_compile_harvest_candidates` sources from `approved_rewrites` only
- `generation_routes.py:1097–1107` — harvest write-back blocked server-side outside refinement phase
- `web_app.py:1166–1188` — `_save_master` creates timestamped backup, validates schema, restores on failure
- `master-cv.js:70–76` — persistent governance banner on Master CV tab
- `web/index.html:48–56` — active LLM provider/model visible in header pill at all times
- `ui-core.js:79–91` — `_settingsSourceLabel` renders config source per setting

**Evidence standard:** Every conclusion is supported by file:line citations from direct source inspection. No conclusion depends on prior review documents or untested assertions.
