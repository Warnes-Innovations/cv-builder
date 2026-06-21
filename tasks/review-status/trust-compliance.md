<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review

**Persona:** trust-compliance
**Review date:** 2026-06-18
**Review time:** ~19:00 ET
**Review cycle:** 4
**Story file:** tasks/user-story-trust-compliance.md (stories US-C1 – US-C3)

**Executive Summary:** The rewrite stage remains the strongest trust boundary in the application and is substantially correct. The persuasion-warning panel is open by default (`display:block`, `rewrite-review.js:107`); the Submit button is hard-disabled while any card is pending or warnings are unacknowledged (`rewrite-review.js:376`). GAP-130 (persuasion bypass when panel was collapsed) was resolved in commit `38c98ec` and is confirmed resolved in Cycle 4 source inspection. No new regressions were found in the files under review. All six previously-identified open gaps (GAP-131, GAP-TC-3 through GAP-TC-7) remain unimplemented. Score is unchanged from Cycle 3: **7 PASS · 7 PARTIAL · 0 FAIL · 2 NOT IMPLEMENTED**.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

#### Criterion 1 — Proposed rewrites and additions are visibly presented as suggestions

**PASS**

Every proposed rewrite is rendered as a named card in the dedicated Rewrites tab with a word-level LCS inline diff (red strikethrough = removed, green = added) computed by `computeWordDiff` / `renderDiffHtml` (`web/rewrite-review.js:183–226`). Three explicit action buttons — Accept, Edit, Reject — appear on each card (`web/rewrite-review.js:273–275`). The tally bar tracks accepted / rejected / pending independently (`web/rewrite-review.js:130–135`). The submit button renders `disabled` on mount (`web/rewrite-review.js:136`) and re-enables only when `pending === 0` AND `persuasionWarningsAcknowledged === true` (`web/rewrite-review.js:373–380`). No rewrite is pre-accepted or merged without an explicit user action.

The intro text at `web/rewrite-review.js:126–128` reads: "Review each suggested text improvement. Accept, edit, or reject all suggestions before proceeding to spell check."

AI-suggested achievement descriptions carry a `✨` icon button to open an AI rewrite modal (`web/achievements-review.js:557–558`), with explicit Accept and Reject buttons in the modal footer (`web/achievements-review.js:701–703`), separating AI proposals from user-authored entries.

#### Criterion 2 — Weak-evidence or confirm-first cases are clearly flagged

**PARTIAL**

Skill additions with weak evidence carry a `"Candidate to confirm"` amber badge on the rewrite card (`web/rewrite-review.js:230–233`):

```js
const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
const weakBadge = isWeakSkillAdd
  ? `<span class="weak-badge">⚠ Candidate to confirm</span>` : '';
```

When persuasion warnings exist, a red banner is rendered above the rewrite cards with `display:block` (panel open by default, `web/rewrite-review.js:107`). The "Acknowledged" button is immediately visible. The submit button tooltip reads "Acknowledge the persuasion warnings above before submitting" (`web/rewrite-review.js:377–379`) until the Acknowledged button is clicked.

Remaining gap: per-card persuasion badges use two severity CSS classes (`persuasion-badge--warn` / `persuasion-badge--info`) distinguished only by background color (`web/styles.css:1267–1268`); there is no icon differentiation or ordering, and no mechanism escalates individual warn-severity items to hard-block the submit.

#### Criterion 3 — The UI does not blur the line between approved output and proposed changes

**PASS**

Session state maintains three separate keys: `pending_rewrites`, `approved_rewrites`, and `rewrite_audit` (`scripts/utils/conversation_manager.py:97–102`). The `rewriteDecisions` object in the frontend (`web/rewrite-review.js:21`) starts empty and is only populated when the user explicitly acts on a card. `submitRewriteDecisions` sends only decided entries to `POST /api/rewrites/approve` (`web/rewrite-review.js:407–419`). The backend persists only user-approved items to `approved_rewrites` and builds a full `rewrite_audit` log with proposal, outcome, and final text (`scripts/utils/conversation_manager.py:1091–1113`).

---

### US-C2: User Approval Integrity

#### Criterion 1 — Review-required stages block progression until required decisions are made

**PARTIAL**

**Rewrite stage — hard-gated.** The submit button is disabled while `pending > 0` or `!persuasionWarningsAcknowledged` (`web/rewrite-review.js:373–380`). The button displays a tooltip explaining the requirement. `submitRewriteDecisions` has a secondary confirm dialog if somehow called while unacknowledged (`web/rewrite-review.js:383–390`). This is the strongest approval gate in the application.

**Spell-check stage — soft gate only.** `submitSpellCheckDecisions` prompts a confirm modal when pending items remain (`web/spell-check.js:399–408`): "n issues have not been reviewed and will be ignored. Proceed anyway?" One confirm click proceeds, and unreviewed items are auto-resolved to `'ignore'`. Weaker than the rewrite stage.

**Customization stage — no blocking gate (GAP-131, Open).** The Generate button (`web/index.html:184`, bound in `web/app.js:123`) invokes `fetchAndReviewRewrites()` without checking whether any of the Customise sub-tabs (experience, skills, achievements, tagline, publications) have been visited or decided. The comment at `web/app.js:127` notes: "Decisions were already submitted via submitExperienceDecisions/submitSkillDecisions" — but this is conditional on `userSelections` having entries, which can be empty if the user never opened the Customise tabs. Items with no user decision silently inherit the LLM `recommendation` field. There is no progress gate, minimum-decision requirement, or warning that no customisation review took place.

**Harvest stage — correctly gated.** No items are pre-selected. The harvest UI requires explicit checkbox selection for each candidate (`web/finalise.js:276`), which is the correct pattern.

#### Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable

**PASS**

Rewrite cards use three visually distinct states: `.accepted` (green border, `web/styles.css:1233`), `.rejected` (red border + muted, `web/styles.css:1234`), and edit-in-progress (textarea visible, Edit button `.active`). After `saveRewriteEdit`, the card is styled `.accepted` with the Edit button marked `.active` (`web/rewrite-review.js:344–350`), preserving a visible record of how each item was resolved. The tally bar keeps running counts unambiguous.

Achievement decisions use a four-button inline toolbar: AI rewrite → Accept/Reject in a modal. Skill and experience panels use equivalent action-button patterns.

#### Criterion 3 — The UI does not silently auto-accept review items that are expected to be user-controlled

**PARTIAL**

No silent auto-acceptance occurs for rewrite items when rewrites are present. The hard gate described under Criterion 1 prevents inadvertent progression. However:

1. **Zero-rewrite path** — When zero rewrites are returned, the workflow renders an empty state (`web/rewrite-review.js:143–148`) with an immediately enabled "Continue to Spell Check" button. Users cannot distinguish "nothing needed review" from "review was skipped," and there is no explicit zero-rewrite acknowledgement screen. (GAP-TC-5, Open)
2. **Spell-check auto-resolution** — The spell-check flow auto-resolves unreviewed items to `'ignore'` after a single confirm-modal click, which is coarser than per-item control.
3. **Customization implicit defaults** — Items that the user never touches in the Customise stage inherit LLM defaults without any acknowledgement that this occurred. (GAP-131, Open)

---

### US-C3: Provenance and Audit Cues

#### Criterion 1 — Diff-like review is available where text is being changed

**PASS**

Word-level LCS diff is computed for every rewrite proposal via `computeWordDiff(original, proposed)` (`web/rewrite-review.js:183–218`) and rendered with `<del class="diff-removed">` / `<ins class="diff-added">` spans (`web/rewrite-review.js:221–226`). After a user edits a card, the diff is regenerated against the user-provided text (`web/rewrite-review.js:336–342`), so the displayed diff always reflects the delta between original and the accepted final text.

CSS: `.diff-removed` is red with line-through; `.diff-added` is green with no decoration (`web/styles.css:1241–1242`).

#### Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale

**PASS**

Each rewrite card includes a collapsible `<details class="rewrite-rationale">` section containing `rationale` and optionally `evidence` when provided (`web/rewrite-review.js:261–266`):

```html
<details class="rewrite-rationale">
  <summary>Rationale &amp; Evidence</summary>
  <p>${escapeHtml(r.rationale)}</p>
  ${r.evidence ? `<p ...>${escapeHtml(r.evidence)}</p>` : ''}
</details>
```

Experience, skill, and achievement recommendations expose `reasoning` in their review panels via `recommendation-helpers.js`. The LLM system prompt explicitly instructs: "If asked, explain the rationale for a specific proposal" (`scripts/utils/conversation_manager.py:529`).

#### Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes

**PASS** (with partial limitation)

Session state persists `approved_rewrites` and `rewrite_audit` after `submitRewriteDecisions` (`scripts/utils/conversation_manager.py:1112–1113`). The `rewrite_audit` contains every proposal merged with its outcome and final text. `spell_audit` is similarly persisted after `complete_spell_check` (`scripts/utils/conversation_manager.py:1141`). Sessions are auto-saved to disk after every phase transition.

`_compile_harvest_candidates` (in `scripts/routes/generation_routes.py`) sources candidates exclusively from `conversation.state['approved_rewrites']`, ensuring harvest only offers items the user explicitly approved or edited.

**PARTIAL limitation (GAP-TC-4, Open):** The `rewrite_audit` and `spell_audit` records exist in `session.json` on disk but are never surfaced in any UI view. `web/finalise.js` contains no reference to either audit key. A user who wants to reconstruct the approval chain must locate and parse `session.json` manually.

---

## Generated Materials Evaluation

### AI Accuracy and Factual Grounding

**PASS — grounding mechanism**

All LLM prompts for customization and rewriting include the full `Master_CV_Data.json` as context (`scripts/utils/conversation_manager.py:484–495`). Skills recommendations are constrained to items in the master data; the rewrite stage operates on actual bullet text rather than inventing new facts.

**PARTIAL — skill additions and summary variants**

`extra_skills` (session state key, `conversation_manager.py:113`) allows the LLM to suggest skills not present in master data. These items flow through the same review gates (accept/reject) but there is no factual-grounding check verifying that a suggested extra skill corresponds to actual documented work history. Summary variants can introduce new career characterizations with no factual-provenance check beyond the LLM's own prompt context.

**NOT IMPLEMENTED — AI-proposal label for summary variants (GAP-TC-6)**

When the LLM proposes a professional summary variant, there is no visible "AI-proposed" label distinguishing it from user-authored summaries sourced from master data. The summary review tab presents all variants without provenance attribution.

### AI Attribution in Generated Documents

**NOT IMPLEMENTED (GAP-TC-7)**

The generated CV files (PDF and DOCX) contain no metadata, footer, or annotation indicating that AI was used in their creation. The `metadata.json` written to the output directory records `approved_rewrites` and `rewrite_audit`, but this file is not included in the downloadable package and is not visible from the UI. For contexts where AI-assisted content authorship requires disclosure (academic submissions, grant applications, certain government roles), the absence of attribution metadata could expose users to compliance risk they are unaware of.

### LLM Provider Data-Retention Disclosure

**PARTIAL (GAP-TC-3)**

Provider confidentiality flags are surfaced in the LLM wizard provider-card popovers during initial setup (`web/provider-info.js:66–83`). Provider data includes a `confidential` flag (whether the provider commits not to train on API request data) and `privacy_url`, rendered as:

```js
const privIcon = info.confidential
  ? '&#128274; Data confidential'
  : '&#9888;&#65039; Data may be reviewed/retained';
```

A one-line disclosure is shown in the conversation at first analysis (`web/job-analysis.js:99–102`), gated by `LLM_DISCLOSURE_SHOWN` in localStorage:

```text
ℹ️ Content you submit is sent to the configured LLM provider for analysis.
Review your provider's data policy for details.
```

Remaining gaps:
1. The disclosure is a chat message shown exactly once per browser profile, then suppressed by `localStorage.setItem(StorageKeys.LLM_DISCLOSURE_SHOWN, '1')`. No acknowledgement is required; the user can simply miss it.
2. The header LLM pill (`web/index.html:51–60`) shows model name and auth-ready status but does not display a `confidential` warning when a non-confidential provider (e.g., Gemini free tier, Groq) is active.
3. The onboarding modal (`web/index.html:313–378`) mentions "AI" generally but does not state that CV content and job description are transmitted externally to a third-party provider.
4. No consent step exists before any LLM call when `LLM_DISCLOSURE_SHOWN` is already set.

---

## Summary Score Table

| Story / Criterion | Rating | Key Evidence |
| --- | --- | --- |
| US-C1 Crit 1: Rewrites visibly presented as suggestions | PASS | `rewrite-review.js:126–135`; per-card accept/edit/reject buttons |
| US-C1 Crit 2: Weak-evidence / confirm-first cases flagged | PARTIAL | `rewrite-review.js:230–233` (weak badge); persuasion panel open by default at line 107; no per-severity blocking |
| US-C1 Crit 3: No blur between approved output and proposals | PASS | `conversation_manager.py:97–102`; `rewriteDecisions` starts empty |
| US-C1 AC: AI-proposed content reviewable before acceptance | PASS | Submit blocked while `pending > 0` (`rewrite-review.js:373–380`) |
| US-C1 AC: Higher-risk suggestions receive stronger signalling | PARTIAL | Per-card badge exists; warn/info distinguished by color only (`styles.css:1267–1268`) |
| US-C2 Crit 1: Review stages block progression | PARTIAL | Rewrite: hard gate (PASS). Spell: soft gate. Customise: no gate (GAP-131 Open) |
| US-C2 Crit 2: Accept/reject/edit paths distinguishable | PASS | `rewrite-review.js:344–350`; `.accepted`/`.rejected` CSS classes |
| US-C2 Crit 3: No silent auto-acceptance | PARTIAL | No auto-accept for rewrites; customise defaults implicit; zero-rewrite path has no explicit ack screen |
| US-C2 AC: Approval-dependent stages enforce explicit decisions | PARTIAL | Only fully satisfied for non-empty rewrite review |
| US-C3 Crit 1: Diff-like review where text changes | PASS | `computeWordDiff` + `<del>`/`<ins>` rendering (`rewrite-review.js:183–226`) |
| US-C3 Crit 2: Rationale exposed where promised | PASS | `<details class="rewrite-rationale">` per card; `recommendation-helpers.js` |
| US-C3 Crit 3: Finalisation/harvest traceable | PASS | `rewrite_audit` in session; harvest sourced from `approved_rewrites` only |
| US-C3 Crit 3: Audit record accessible in UI | PARTIAL | `rewrite_audit` in `session.json` but no UI panel (`finalise.js` has no audit reference) |
| Materials: Factual grounding of AI content | PASS | Master CV in every LLM prompt (`conversation_manager.py:484–495`) |
| Materials: Extra skills / summary variant grounding | PARTIAL | `extra_skills` state key; no factual check against work history |
| Materials: AI-proposal label for summary variants | NOT IMPLEMENTED | No "AI-proposed" label in summary review tab (GAP-TC-6) |
| Materials: AI attribution in generated files | NOT IMPLEMENTED | No metadata/footer in PDF or DOCX (GAP-TC-7) |
| Materials: LLM data-transmission disclosure | PARTIAL | One-shot chat message (`job-analysis.js:99–102`); wizard-only persistent icon; no consent step |

**Tally: 7 PASS · 7 PARTIAL · 0 FAIL · 2 NOT IMPLEMENTED**

---

## Additional Story Gaps / Proposed Story Items

The three-story set (US-C1 through US-C3) does not explicitly address data transmission consent or AI attribution in output files. Both are material trust concerns. Proposed additions for the story file:

**Proposed US-C4: Data Transmission Consent**
*As a trust/compliance reviewer, I want to verify that users are explicitly informed and consent before their CV data and job description are sent to an external LLM provider, so that users can make an informed choice about provider data policies.*
- Acceptance criteria: A modal or banner requiring explicit acknowledgement (checkbox or button click) must appear before the first LLM call per session, or at minimum per new provider selection. The disclosure must name the active provider and link to its privacy policy. Non-confidential providers (Gemini free tier, Groq) must trigger a visible warning distinct from confidential providers.

**Proposed US-C5: AI Attribution in Generated Materials**
*As a trust/compliance reviewer, I want to verify that generated CV files can be clearly marked as AI-assisted, so that users submitting to contexts requiring AI disclosure are aware of and can act on this requirement.*
- Acceptance criteria: An opt-in setting exists to embed an AI-assistance notation in PDF metadata or a document footer. The Finalise tab prominently notes that generated files do not carry AI attribution unless the setting is enabled.

---

## Open Gaps

### GAP-130 (RESOLVED — confirmed Cycle 4)
Source inspection of `web/rewrite-review.js:107` confirms the persuasion panel renders with `style="display:block"`. The Submit button is hard-disabled until "Acknowledged" is clicked (`rewrite-review.js:376`). A secondary confirm dialog in `submitRewriteDecisions` lines 383–390 provides a fallback. Resolved in commit `38c98ec`. No regression found in Cycle 4.

### GAP-131 (Open, MED) — No blocking gate at the Customise stage
A user can proceed from job analysis to CV generation without visiting or deciding on any experience, skill, or achievement item. Items inherit LLM defaults silently. The `generate-btn` click handler (`web/app.js:123–130`) only checks whether `userSelections` has entries — it does not block if Customise tabs were never opened.
**Proposed story:** The Generate action must require at least one explicit decision from the Customise stage, or show a blocking warning that no customisation decisions were made.

### GAP-TC-3 (MED, Open) — No in-app consent step for external LLM data transmission
The application transmits the user's full CV data and job description to third-party LLM providers. The disclosure at `web/job-analysis.js:99–102` is a one-shot chat message with no acknowledgement required. Once the `LLM_DISCLOSURE_SHOWN` key is set in localStorage, there is no persistent warning when a non-confidential provider is selected.
**Proposed story:** First LLM call must be preceded by a one-time modal disclosure: "Your job description and CV excerpts are sent to [provider] for analysis. [Provider privacy policy link]." Require an explicit acknowledgement checkbox before proceeding. Non-confidential providers must show a secondary amber warning.

### GAP-TC-4 (MED, Open) — No UI panel for session audit record
`rewrite_audit` and `spell_audit` are persisted to `session.json` but are never displayed in the UI. `web/finalise.js` has no reference to either audit key. A user cannot reconstruct the approval chain without locating and parsing the raw session file.
**Proposed story:** The Finalise tab should include a collapsible "Session audit" section showing the `rewrite_audit` log (proposal, outcome, final text) and `spell_audit` log.

### GAP-TC-5 (MED, Open) — Silent auto-advance through zero-item review stages
When zero rewrites are returned, the workflow renders an empty state with an immediately enabled "Continue to Spell Check" button. Users cannot distinguish "nothing needed review" from "review was skipped."
**Proposed story:** When a review stage produces zero items, display an explicit summary screen ("0 text improvements required — no wording changes were proposed") requiring user acknowledgement before advancing.

### GAP-TC-6 (LOW, Open) — Summary variant not labeled as AI-proposed
Summary variants in the summary review tab are presented without attribution, indistinguishable from user-authored summaries sourced from master data.
**Proposed story:** All AI-generated summary variants must carry a visible "(AI-proposed)" annotation.

### GAP-TC-7 (LOW, Open) — No AI attribution option in generated files
Generated PDF and DOCX contain no indication that AI was used. For academic, grant, or government submissions, this may create a compliance issue the user is unaware of.
**Proposed story:** Add an optional "AI-assisted" checkbox in generation settings that, when checked, adds an attribution note to the PDF/DOCX footer or document properties metadata.

---

## Cycle-over-Cycle Delta (Cycle 3 → Cycle 4)

| Gap | Cycle 3 Status | Cycle 4 Status | Change |
| --- | --- | --- | --- |
| GAP-130 | RESOLVED | RESOLVED (confirmed) | No regression; `display:block` at `rewrite-review.js:107` still present |
| GAP-131 | OPEN | OPEN | No change confirmed: `web/app.js:123–130` still has no decision-count gate |
| GAP-TC-3 | OPEN | OPEN | No change: `LLM_DISCLOSURE_SHOWN` one-shot message still the only disclosure |
| GAP-TC-4 | OPEN | OPEN | Confirmed: `finalise.js` (396 lines) has zero references to `rewrite_audit` or `spell_audit` |
| GAP-TC-5 | OPEN | OPEN | No change |
| GAP-TC-6 | OPEN | OPEN | No change |
| GAP-TC-7 | OPEN | OPEN | No change |

**Score unchanged from Cycle 3: 7 PASS · 7 PARTIAL · 0 FAIL · 2 NOT IMPLEMENTED**

New in Cycle 4:
- Two proposed story additions (US-C4, US-C5) to cover data-transmission consent and AI attribution in output files — these were always material gaps but are now formally proposed.
- Confirmed that commits since last review (`b250dce`, `0effd30`, `c38e620`, `c9bd18c`, `ae68789`) touched accessibility, template rendering, and onboarding but made no changes to rewrite-review logic, spell-check gates, finalise/harvest, or disclosure messaging.

---

## Evidence Summary

| Claim | File:line |
| --- | --- |
| Persuasion panel open by default (`display:block`) | `web/rewrite-review.js:107` |
| Submit button hard-disabled while pending or unacknowledged | `web/rewrite-review.js:373–380` |
| Secondary confirm dialog if unacknowledged | `web/rewrite-review.js:383–390` |
| Weak-skill badge | `web/rewrite-review.js:230–233` |
| Per-card persuasion badge severity styling | `web/styles.css:1267–1268` |
| Word-level diff rendering | `web/rewrite-review.js:183–226` |
| Diff regenerated after user edit | `web/rewrite-review.js:336–342` |
| Rationale collapsible details block | `web/rewrite-review.js:261–266` |
| Zero-rewrite path no explicit ack | `web/rewrite-review.js:143–148` |
| `rewriteDecisions` starts empty | `web/rewrite-review.js:21` |
| Backend: `pending_rewrites`, `approved_rewrites`, `rewrite_audit` | `scripts/utils/conversation_manager.py:97–102` |
| `rewrite_audit` written after submit | `scripts/utils/conversation_manager.py:1112–1113` |
| `spell_audit` written after spell check | `scripts/utils/conversation_manager.py:1141` |
| `generate-btn` handler — no customise gate | `web/app.js:123–130` |
| LLM disclosure: one-shot chat message | `web/job-analysis.js:99–102` |
| Provider confidential icon in wizard | `web/provider-info.js:67–68` |
| Provider registry `confidential` field | `scripts/utils/provider_registry.py:46, 70, 93, 115, 133, 155, 171, 192, 209` |
| Finalise tab — no audit reference | `web/finalise.js` (all 396 lines — no `rewrite_audit` or `spell_audit`) |

### Source files inspected (Cycle 4)

- `web/index.html` (lines 1–700 read)
- `web/app.js` (all 141 lines)
- `web/ui-core.js` (lines 1–400, 980–1410)
- `web/state-manager.js` (lines 1–65)
- `web/styles.css` (lines 1–50, grep for rewrite/badge classes)
- `web/rewrite-review.js` (all 486 lines — primary evidence source)
- `web/spell-check.js` (lines 1–462)
- `web/finalise.js` (all 396 lines)
- `web/provider-info.js` (all 85 lines)
- `web/job-analysis.js` (lines 94–115)
- `scripts/utils/provider_registry.py` (all 239 lines)
- `scripts/utils/conversation_manager.py` (lines 1–165, 1079–1200)
- `scripts/web_app.py` (lines 1–220)
- `tasks/user-story-trust-compliance.md` (all 62 lines)
- Git log for trust-compliance-relevant files to establish Cycle 3 → Cycle 4 delta
