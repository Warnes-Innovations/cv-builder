<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review

**Persona:** trust-compliance
**Review date:** 2026-06-18
**Story file:** tasks/user-story-trust-compliance.md (stories US-C1 – US-C3)

**Executive Summary:** The rewrite stage is the strongest trust boundary in the application. The persuasion-warning panel is open by default (`display:block`, `rewrite-review.js:107`), and the Submit button is hard-disabled while any card is pending or warnings are unacknowledged (`rewrite-review.js:376`). This is a correctly implemented hard gate. The remaining weaknesses are: (1) the customization stage has no blocking gate, so a user can generate a CV having never reviewed a single experience/skill/achievement recommendation; (2) LLM data-transmission disclosure is limited to the LLM wizard popover and a one-line chat message at first analysis, with no persistent indicator or pre-consent step; (3) the `rewrite_audit` and `spell_audit` records exist in `session.json` but are never surfaced in any UI view; (4) AI-proposed summary variants are not labeled as AI-proposed.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

**Criterion 1 — Proposed rewrites and additions are visibly presented as suggestions**

PASS

Every proposed rewrite is rendered as a named card in the dedicated Rewrites tab with a word-level LCS inline diff (red strikethrough = removed, green = added) computed by `computeWordDiff` / `renderDiffHtml` (`web/rewrite-review.js:183–226`). Three explicit action buttons — Accept, Edit, Reject — appear on each card. The tally bar tracks accepted / rejected / pending independently (`web/rewrite-review.js:130–135`). The submit button is rendered `disabled` on mount (`web/rewrite-review.js:136`) and re-enabled only when `pending === 0` AND `persuasionWarningsAcknowledged === true` (`web/rewrite-review.js:373–380`). No rewrite is pre-accepted or merged without user action.

The intro text at `web/rewrite-review.js:126–128` reads: "Review each suggested text improvement. Accept, edit, or reject all suggestions before proceeding to spell check."

AI-suggested achievements carry a visual badge and a distinct row style in the achievements review panel, separating them from user-authored entries.

**Criterion 2 — Weak-evidence or confirm-first cases are clearly flagged**

PARTIAL

Skill additions with weak evidence carry a `"Candidate to confirm"` badge on the rewrite card (`web/rewrite-review.js:230–233`):

```js
const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
const weakBadge = isWeakSkillAdd
  ? `<span class="weak-badge">⚠ Candidate to confirm</span>` : '';
```

When persuasion warnings exist, a red banner is rendered above the rewrite cards with `display:block` (panel is open by default, `web/rewrite-review.js:107`). The "Acknowledged" button is visible immediately without any expand action. The submit button tooltip reads "Acknowledge the persuasion warnings above before submitting" (`web/rewrite-review.js:377–379`) until the button is clicked.

Remaining gap: per-card persuasion badges use two severity CSS classes (`persuasion-badge--warn` / `persuasion-badge--info`) distinguished only by color; there is no icon differentiation or ordering between severities. Severity escalation (e.g., blocking the submit button per individual warn-severity item rather than the panel as a whole) is not implemented.

**Criterion 3 — The UI does not blur the line between approved output and proposed changes**

PASS

Session state maintains three separate keys: `pending_rewrites`, `approved_rewrites`, and `rewrite_audit` (`scripts/utils/conversation_manager.py:96–102`). The `rewriteDecisions` object in the frontend (`web/rewrite-review.js:21`) starts empty and is only populated when the user explicitly acts on a card. `submitRewriteDecisions` sends only decided entries to `POST /api/rewrites/approve` (`web/rewrite-review.js:407–419`). The backend's `submit_rewrite_decisions` method (`scripts/utils/conversation_manager.py:1070–1120`) builds `rewrite_audit` from proposal + outcome + final text and persists only user-approved items to `approved_rewrites`.

---

### US-C2: User Approval Integrity

**Criterion 1 — Review-required stages block progression until required decisions are made**

PARTIAL

*Rewrite stage* — hard-gated. The submit button is disabled while `pending > 0` or `!persuasionWarningsAcknowledged` (`web/rewrite-review.js:373–380`). The button has a tooltip explaining the requirement. `submitRewriteDecisions` has a secondary fallback confirm dialog if somehow called while unacknowledged, but the normal path is fully blocked at the UI level. This is the strongest approval gate in the application.

*Spell-check stage* — soft gate only. `submitSpellCheckDecisions` prompts a confirm modal when pending items remain (`web/spell-check.js:399–408` — "n issues have not been reviewed and will be ignored. Proceed anyway?"). One confirm click proceeds, and unreviewed items are auto-resolved to `'ignore'`. Weaker than the rewrite stage.

*Customization stage* — no blocking gate found. Experience, skill, and achievement review panels allow the user to submit whatever subset of decisions they have made. Undecided items silently inherit the LLM's `recommendation` field (e.g., "Include") without an explicit per-item acknowledgement prompt. The Generate action at `web/app.js:123–130` checks whether `userSelections` has entries but does not block if the Customise tabs were never opened. A user can proceed from Job Input through to CV generation having never reviewed a single recommended customization.

*Harvest stage* — no items are pre-selected. The harvest UI requires explicit checkbox selection for each candidate, which is the correct pattern.

**Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable**

PASS

Rewrite cards use three visually distinct states: `.accepted` (green tint + Accept button highlighted), `.rejected` (muted + Reject button highlighted), and edit-in-progress (textarea visible, Edit button `.active`). After `saveRewriteEdit`, the card is styled `.accepted` with the Edit button marked `.active` (`web/rewrite-review.js:344–350`), preserving a visible record of how each item was resolved. The tally bar makes the current counts unambiguous at all times.

Achievement decisions use a four-button inline toolbar: Emphasize, Include, De-emphasize, Exclude — with the active choice visually highlighted. Skill and experience panels use equivalent action-button patterns.

**Criterion 3 — The UI does not silently auto-accept review items that are expected to be user-controlled**

PARTIAL

No silent auto-acceptance was found for rewrite items when rewrites are present. The hard gate described under Criterion 1 prevents inadvertent progression. However:

1. When zero rewrites are returned, the workflow renders an empty state (`web/rewrite-review.js:143–148`) with a "Continue to Spell Check" button that is not disabled. Users cannot distinguish "nothing needed review" from "review was skipped," and there is no explicit zero-rewrite acknowledgement screen.
2. The spell-check flow auto-resolves unreviewed items to `'ignore'` after a single confirm-modal click — coarser than per-item control.
3. Customization-stage items that the user never touches inherit LLM defaults without any acknowledgement that this occurred.

---

### US-C3: Provenance and Audit Cues

**Criterion 1 — Diff-like review is available where text is being changed**

PASS

Word-level LCS diff is computed for every rewrite proposal via `computeWordDiff(original, proposed)` (`web/rewrite-review.js:183–218`) and rendered with `<del class="diff-removed">` / `<ins class="diff-added">` spans (`web/rewrite-review.js:221–226`). After a user edits a card, the diff is regenerated against the user-provided text (`web/rewrite-review.js:336–342`), so the displayed diff always reflects the delta between original and final accepted text — not just original vs. AI-proposed.

CSS: `.diff-removed` is red with line-through; `.diff-added` is green with no decoration (`web/styles.css:1241–1242`).

**Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale**

PASS

Each rewrite card includes a collapsible `<details class="rewrite-rationale">` section containing `rationale` (LLM's explanation) and optionally `evidence` (source text) when provided (`web/rewrite-review.js:261–266`):

```html
<details class="rewrite-rationale">
  <summary>Rationale &amp; Evidence</summary>
  <p>${escapeHtml(r.rationale)}</p>
  ${r.evidence ? `<p ...>${escapeHtml(r.evidence)}</p>` : ''}
</details>
```

Experience, skill, and achievement recommendations expose `reasoning` in their review panels via `getExperienceReasoning` / `getSkillReasoning` / `getAchievementReasoning` from `web/recommendation-helpers.js`.

**Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes**

PASS

`submit_rewrite_decisions` persists to both `self.state['approved_rewrites']` and `self.state['rewrite_audit']` (`scripts/utils/conversation_manager.py:1112–1113`), where `rewrite_audit` stores every proposal merged with its outcome and final text. Sessions are auto-saved to disk after every phase transition.

`_compile_harvest_candidates` (`scripts/routes/generation_routes.py:922–963`) sources candidates exclusively from `conversation.state['approved_rewrites']`, ensuring harvest only offers items the user explicitly approved or edited.

PARTIAL limitation: The `rewrite_audit` record exists in `session.json` on disk but is never surfaced in any UI view. There is no audit panel in the Finalise tab, no downloadable audit report, and no modal to inspect the full decision history after the session ends. A user who wants to reconstruct the approval chain must locate and parse `session.json` manually.

---

## Generated Materials Evaluation

### AI Accuracy and Factual Grounding

PASS — grounding mechanism

All LLM prompts for customization and rewriting include the full `Master_CV_Data.json` as context (`scripts/utils/conversation_manager.py:484–495`). Skills recommendations are constrained to items in the master data; the rewrite stage operates on actual bullet text rather than inventing new facts.

PARTIAL — skill additions and summary variants

`extra_skills` (session state key, `conversation_manager.py:113`) allows the LLM to suggest skills not present in master data. These items flow through the same review gates (accept/reject) but there is no factual-grounding check verifying that a suggested extra skill corresponds to actual work history. Summary variants can introduce new career characterizations with no factual-provenance check.

NOT IMPLEMENTED — AI-proposal label for summary variants

When the LLM proposes a professional summary variant, there is no visible "AI-proposed" label distinguishing it from user-authored summaries sourced from master data. The summary review tab presents all variants without provenance attribution.

### AI Attribution in Generated Documents

NOT IMPLEMENTED

The generated CV files (PDF and DOCX) contain no metadata, footer, or annotation indicating that AI was used in their creation. The `metadata.json` written to the output directory (`scripts/utils/cv_orchestrator.py:2205–2208`) records `approved_rewrites` and `rewrite_audit` but this file is not included in the downloadable package and is not visible from the UI.

For contexts where AI-assisted content authorship requires disclosure (academic submissions, grant applications, certain government roles), the absence of attribution metadata could expose users to compliance risk.

### LLM Provider Data-Retention Disclosure

PARTIAL

Provider confidentiality flags are surfaced in the LLM wizard provider-card popovers and the model-selection table during initial setup (`web/provider-info.js:67–83`). Provider data includes `confidential` (whether the provider commits not to train on API request data) and `privacy_url`.

A one-line disclosure is shown in the conversation at first analysis:

```text
ℹ️ Content you submit is sent to the configured LLM provider for analysis.
Review your provider's data policy for details.
```

(`web/job-analysis.js:99–102`, gated by `LLM_DISCLOSURE_SHOWN` in localStorage)

However:

1. The disclosure is a chat message shown exactly once per browser profile, then suppressed. There is no modal requiring a click-through acknowledgement.
2. The header pill (`web/index.html:51–60`) shows only model name and auth-ready status — no `confidential` warning when a non-confidential provider is active.
3. The onboarding modal (`web/index.html:313–378`) mentions "AI" generally but does not state that CV content and job description are transmitted externally.
4. No pre-consent step exists before the first LLM call when `LLM_DISCLOSURE_SHOWN` is already set.

---

## Summary Score Table

| Story / Criterion | Rating | Key Evidence |
| --- | --- | --- |
| US-C1 Criterion 1: Rewrites visibly presented as suggestions | PASS | `rewrite-review.js:126–135`; per-card accept/edit/reject |
| US-C1 Criterion 2: Weak-evidence / confirm-first cases flagged | PARTIAL | `rewrite-review.js:230–233` (weak badge); warning panel open by default at line 107; no per-severity blocking |
| US-C1 Criterion 3: No blur between approved output and proposals | PASS | `conversation_manager.py:96–102`; `rewriteDecisions` starts empty |
| US-C1 AC: AI-proposed content reviewable before acceptance | PASS | Submit blocked while `pending > 0` (`rewrite-review.js:373–380`) |
| US-C1 AC: Higher-risk suggestions receive stronger signalling | PARTIAL | Per-card badge exists; warn/info distinguished by color only |
| US-C2 Criterion 1: Review stages block progression | PARTIAL | Rewrite: hard gate (PASS). Spell: soft gate. Customise: no gate |
| US-C2 Criterion 2: Accept/reject/edit paths distinguishable | PASS | `rewrite-review.js:344–350`; `.accepted`/`.rejected` classes |
| US-C2 Criterion 3: No silent auto-acceptance | PARTIAL | No auto-accept for rewrites; customise defaults implicit; zero-rewrite path has no explicit ack screen |
| US-C2 AC: Approval-dependent stages enforce explicit decisions | PARTIAL | Only satisfied for non-empty rewrite review |
| US-C3 Criterion 1: Diff-like review where text changes | PASS | `computeWordDiff` + `<del>`/`<ins>` rendering (`rewrite-review.js:183–226`) |
| US-C3 Criterion 2: Rationale exposed where promised | PASS | `<details class="rewrite-rationale">` per card; `recommendation-helpers.js` |
| US-C3 Criterion 3: Finalisation/harvest traceable | PASS | `rewrite_audit` in session; harvest from `approved_rewrites` only |
| US-C3 Criterion 3: Audit record accessible in UI | PARTIAL | `rewrite_audit` in `session.json` but no UI panel |
| Materials: Factual grounding of AI content | PASS | Master CV in every LLM prompt (`conversation_manager.py:484–495`) |
| Materials: Extra skills / summary variant grounding | PARTIAL | `extra_skills` state key; no factual check against work history |
| Materials: AI-proposal label for summary variants | NOT IMPLEMENTED | No "AI-proposed" label in summary review tab |
| Materials: AI attribution in generated files | NOT IMPLEMENTED | No metadata/footer in PDF or DOCX |
| Materials: LLM data-transmission disclosure | PARTIAL | One-shot chat message (job-analysis.js:99–102); wizard-only persistent; no consent step |

Tally: 7 PASS · 7 PARTIAL · 0 FAIL · 2 NOT IMPLEMENTED

---

## Gaps

**GAP-TC-1 (RESOLVED) — Persuasion warning acknowledgement gate**
Previously recorded as high severity (panel collapsed by default). Source inspection of `web/rewrite-review.js:107` confirms the panel now renders with `display:block` — the warnings are immediately visible. The Submit button is hard-disabled (`rewriteDecisions:373–380`) until the "Acknowledged" button is clicked. A secondary confirm dialog in `submitRewriteDecisions` (lines 383–390) provides a fallback if the button is somehow invoked while `!persuasionWarningsAcknowledged`. This gap is resolved in the current codebase.

**GAP-TC-2 (HIGH) — No blocking gate at the Customise stage**
A user can proceed from job analysis to CV generation without visiting or deciding on any experience, skill, or achievement item. Items inherit LLM defaults silently.
Proposed story: The Generate action must require at least one explicit decision from the Customise stage (or show a blocking warning that no customisation decisions were made).

**GAP-TC-3 (MEDIUM) — No in-app consent step for external LLM data transmission**
The application transmits the user's full CV data and job description to third-party LLM providers. The disclosure at `web/job-analysis.js:99–102` is a one-shot chat message, shown once per browser profile, with no acknowledgement required. Once dismissed there is no persistent warning when a non-confidential provider is selected.
Proposed story: First LLM call must be preceded by a one-time modal disclosure: "Your job description and CV excerpts are sent to [provider] for analysis. [Provider privacy policy link]." Require an explicit acknowledgement checkbox before proceeding.

**GAP-TC-4 (MEDIUM) — No UI panel for session audit record**
`rewrite_audit` and `spell_audit` are persisted to `session.json` (`conversation_manager.py:1112–1113, 1141`) but are never displayed in the UI. A user cannot reconstruct the approval chain without locating and parsing the raw session file.
Proposed story: The Finalise tab should include a collapsible "Session audit" section showing the `rewrite_audit` log (proposal, outcome, final text) and `spell_audit` log.

**GAP-TC-5 (MEDIUM) — Silent auto-advance through zero-item review stages**
When zero rewrites are returned, the workflow renders an empty state with an immediately enabled "Continue to Spell Check" button. Users cannot distinguish "nothing needed review" from "review was skipped."
Proposed story: When a review stage produces zero items, display an explicit summary screen ("0 text improvements required — no wording changes were proposed") requiring user acknowledgement before advancing.

**GAP-TC-6 (LOW) — Summary variant not labeled as AI-proposed**
Summary variants in the summary review tab are presented without attribution, indistinguishable from user-authored summaries sourced from master data.
Proposed story: All AI-generated summary variants must carry a visible "(AI-proposed)" annotation.

**GAP-TC-7 (LOW) — No AI attribution option in generated files**
Generated PDF and DOCX contain no indication that AI was used. For academic, grant, or government submissions, this may cause a compliance issue the user is unaware of.
Proposed story: Add an optional "AI-assisted" checkbox in the generation settings that, when checked, adds an attribution note to the PDF/DOCX footer or cover metadata.

---

### Source files inspected (this review)

- `web/index.html` lines 1–400
- `web/app.js` all
- `web/ui-core.js` lines 1–155
- `web/state-manager.js` lines 1–155
- `web/styles.css` lines 1226–1271 (rewrite card, persuasion badge, diff styles)
- `web/rewrite-review.js` all (primary source for US-C1/US-C2 evaluation)
- `web/spell-check.js` lines 1–450
- `web/api-client.js` lines 1–60
- `web/job-analysis.js` lines 85–145
- `web/provider-info.js` all
- `scripts/web_app.py` lines 1–210
- `scripts/utils/conversation_manager.py` lines 1–155, 1070–1160, 1348–1390
- `scripts/utils/cv_orchestrator.py` lines 2185–2215
- `scripts/routes/generation_routes.py` lines 920–965

**Evidence standard:** Every rating is supported by file:line citations from direct source inspection of the files read in this review session. The critical correction from the prior review (GAP-TC-1) is verified at `web/rewrite-review.js:107` (`style="display:block"`).
