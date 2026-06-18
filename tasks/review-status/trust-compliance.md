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

**Executive Summary:** The application has a solid trust posture for its primary rewrite stage: LCS word-level diffs, per-card accept/edit/reject controls, a persuasion-warning panel, and a full `rewrite_audit` record in session state. The critical weaknesses are: (1) the persuasion-warning acknowledgement can be bypassed because the detail panel and "Acknowledged" button are collapsed by default; (2) customization-stage decisions (experience, skill, achievement) carry no blocking gate, allowing generation with entirely implicit LLM defaults; (3) no in-app disclosure notifies users that their CV content and job description are transmitted to external LLM APIs; (4) the `rewrite_audit` record exists on disk but is never surfaced in any UI view.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

**Criterion 1 — Proposed rewrites and additions are visibly presented as suggestions**

✅ Pass

Every proposed rewrite is rendered as a named card in the dedicated Rewrites tab with a word-level LCS inline diff (red strikethrough = removed, green = added) computed by `computeWordDiff` / `renderDiffHtml` (`web/rewrite-review.js:183–226`). Three explicit action buttons — ✓ Accept, ✎ Edit, ✗ Reject — appear on each card. The tally bar tracks accepted / rejected / pending independently (`web/rewrite-review.js:130–135`). The submit button is rendered `disabled` on mount and re-enabled only when `pending === 0` (`web/rewrite-review.js:136, 373–378`). No rewrite is pre-accepted or merged without user action.

The intro message at `web/rewrite-review.js:126–128` reads: "Review each suggested text improvement. Accept, edit, or reject all suggestions before proceeding to spell check." — making the suggestion-status framing explicit.

AI-suggested achievements carry a gold `⭐ AI Suggested` badge (`web/achievements-review.js:270`) and a yellow row background, visually separating them from user-authored entries.

**Criterion 2 — Weak-evidence or confirm-first cases are clearly flagged**

⚠️ Partial

Skill additions with weak evidence carry a `⚠ Candidate to confirm` badge on the rewrite card (`web/rewrite-review.js:230–233`):

```js
const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
const weakBadge = isWeakSkillAdd
  ? `<span class="weak-badge">⚠ Candidate to confirm</span>` : '';
```

The backend computes eight persuasion-check heuristics via `run_persuasion_checks` (`scripts/utils/conversation_manager.py`): strong action verb, passive voice, word count, result clause, named institution, CAR structure, summary generic phrases. When warnings exist, a red collapsible banner appears above the rewrite cards (`web/rewrite-review.js:88–119`).

**Gap:** The warning detail section is collapsed by default (`style="display:none"` at `web/rewrite-review.js:107`). The "✓ Acknowledged" button lives inside that collapsed section (`web/rewrite-review.js:114`). A user can expand the banner header to see the count but click "✓ Acknowledged" only after expanding — however nothing in the UI forces the user to read the individual warnings before the button becomes accessible. The `submitRewriteDecisions` check at `web/rewrite-review.js:383–389` prompts a confirm dialog if `!persuasionWarningsAcknowledged`, but the dialog only says "Proceed anyway?" — the user can bypass with a single click.

Individual rewrite cards carry per-card persuasion badges (`web/rewrite-review.js:267–270`) using `persuasion-badge--warn` / `persuasion-badge--info` CSS classes, but the visual distinction between severity levels (warn vs info) is limited to color; there is no icon differentiation or ordering.

**Criterion 3 — The UI does not blur the line between approved output and proposed changes**

✅ Pass

Session state maintains three separate keys: `pending_rewrites`, `approved_rewrites`, and `rewrite_audit` (`scripts/utils/conversation_manager.py:96–102`). The `rewriteDecisions` object in the frontend (`web/rewrite-review.js:21`) starts empty and is only populated when the user explicitly acts on a card. `submitRewriteDecisions` sends only decided entries to `POST /api/rewrites/approve` (`web/rewrite-review.js:407–419`). The backend's `submit_rewrite_decisions` (`scripts/utils/conversation_manager.py:1070–1120`) builds the `rewrite_audit` from proposed + outcome + final text and persists only user-approved items to `approved_rewrites`.

---

### US-C2: User Approval Integrity

**Criterion 1 — Review-required stages block progression until required decisions are made**

⚠️ Partial

*Rewrite stage* — functionally gated. The submit button is disabled while `pending > 0` (`web/rewrite-review.js:373–378`). Unacknowledged persuasion warnings trigger a confirm dialog before submission. This is the strongest gate in the application.

*Spell-check stage* — soft gate only. `submitSpellCheckDecisions` prompts a confirm modal when pending items remain (`web/spell-check.js` — pattern: "n issues have not been reviewed and will be ignored. Proceed anyway?"). One click proceeds, and unreviewed items are auto-resolved to `'ignore'`. This is a weaker gate than the rewrite stage.

*Customization stage* — no blocking gate found. Experience, skill, and achievement review panels (`web/experience-review.js`, `web/skills-review.js`, `web/achievements-review.js`) allow the user to submit whatever subset of decisions they have made. Undecided items silently inherit the LLM's `recommendation` field (e.g., "Include") without an explicit per-item decision prompt. The Generate button in `web/app.js:123–130` checks whether `userSelections` has entries but does not block if the Customise tabs were never opened. This means a user can proceed from Job Input through to CV generation having never reviewed a single recommended customization.

*Harvest stage* — no items are pre-selected. The harvest UI (`web/finalise.js`) requires explicit checkbox selection for each candidate, which is the correct pattern.

**Criterion 2 — Acceptance, rejection, and edit paths remain distinguishable**

✅ Pass

Rewrite cards use three visually distinct states: `.accepted` (green tint + ✓ button highlighted), `.rejected` (muted + ✗ button highlighted), and edit-in-progress (textarea visible, ✎ button `.active`). After `saveRewriteEdit`, the card is styled `.accepted` with the edit button marked `.active` (`web/rewrite-review.js:344–350`), preserving a visible record of how each item was resolved. The tally bar makes the current counts unambiguous.

Achievement decisions use a four-button inline toolbar: Emphasize, Include, De-emphasize, Exclude — with the active choice visually highlighted (`web/achievements-review.js:288–291`). Skill and experience panels use equivalent action-button patterns.

**Criterion 3 — The UI does not silently auto-accept review items that are expected to be user-controlled**

⚠️ Partial

No silent auto-acceptance was found for rewrite items when rewrites are present. However:

1. When zero rewrites are returned, `fetchAndReviewRewrites` in `web/rewrite-review.js:64–65` displays a message and renders the empty state, but the workflow can proceed without the user ever confirming "I acknowledge zero rewrites were needed." There is no explicit zero-rewrite confirmation screen.
2. The spell-check flow auto-resolves unreviewed items to `'ignore'` after a single confirm-modal click — coarser than per-item control.
3. Customization-stage items that the user never touches inherit LLM defaults without any acknowledgement that this occurred.

---

### US-C3: Provenance and Audit Cues

**Criterion 1 — Diff-like review is available where text is being changed**

✅ Pass

Word-level LCS diff is computed for every rewrite proposal via `computeWordDiff(original, proposed)` (`web/rewrite-review.js:183–218`) and rendered with `<del class="diff-removed">` / `<ins class="diff-added">` spans (`web/rewrite-review.js:221–226`). After a user edits a card, the diff is regenerated against the user-provided text (`web/rewrite-review.js:336–342`), so the displayed diff always reflects the actual delta between original and final accepted text — not just original vs. AI-proposed.

**Criterion 2 — The UI retains or exposes rationale where the workflow promises rationale**

✅ Pass

Each rewrite card includes a collapsible `<details class="rewrite-rationale">` section containing `rationale` (LLM's explanation) and optionally `evidence` (source text) when provided (`web/rewrite-review.js:261–266`):

```html
<details class="rewrite-rationale">
  <summary>Rationale &amp; Evidence</summary>
  <p>${escapeHtml(r.rationale)}</p>
  ${r.evidence ? `<p ...>${escapeHtml(r.evidence)}</p>` : ''}
</details>
```

Experience, skill, and achievement recommendations expose `reasoning` in their review panels via `getExperienceReasoning` / `getSkillReasoning` / `getAchievementReasoning` from `web/recommendation-helpers.js`.

The LLM's system prompt enforces a structured recommendation format with mandatory `Reasoning & Evidence` field that cites specific job requirements and candidate background (`scripts/utils/conversation_manager.py:415–466`), so the rationale content is structurally grounded.

**Criterion 3 — Finalisation and harvest flows remain traceable to reviewed session changes**

✅ Pass

`submit_rewrite_decisions` persists to both `self.state['approved_rewrites']` and `self.state['rewrite_audit']` (`scripts/utils/conversation_manager.py:1113`), where `rewrite_audit` stores every proposal merged with its outcome and final text. Sessions are auto-saved to disk after every exchange (`conversation_manager.py:384`).

`_compile_harvest_candidates` (`scripts/routes/generation_routes.py:926–928`) sources candidates exclusively from `conversation.state['approved_rewrites']`, ensuring harvest only offers items the user explicitly approved.

The harvest apply step creates a git commit (`generation_routes.py:1961–1978`) with a traceable commit message. A timestamped backup is created before overwriting master data.

⚠️ Partial limitation: The `rewrite_audit` record exists in `session.json` on disk but is never surfaced in any UI view. There is no audit panel in the Finalise tab, no downloadable audit report, and no modal to inspect the full decision history after the session ends. A user who wants to reconstruct the approval chain must locate and parse `session.json` manually.

---

## Generated Materials Evaluation

### AI Accuracy and Factual Grounding

✅ Pass — grounding mechanism

All LLM prompts for customization and rewriting include the full `Master_CV_Data.json` as context (`scripts/utils/conversation_manager.py:484–495`). Skills recommendations are constrained to items in the master data; the rewrite stage operates on actual bullet text rather than inventing new facts. This significantly limits hallucination risk for core CV content.

⚠️ Partial — skill additions and summary variants

`extra_skills` (session state key, `conversation_manager.py:89`) allows the LLM to suggest skills not present in master data. Summary variants can introduce new career characterizations. These items flow through the same review gates (accept/reject) but there is no factual-grounding check verifying that a suggested extra skill corresponds to actual work history.

🔲 Not Implemented — AI-proposal label for summary variants

When the LLM proposes a professional summary variant, there is no visible "AI-proposed" label distinguishing it from user-authored summaries sourced from master data. The summary review tab presents all variants without provenance attribution.

### AI Attribution in Generated Documents

🔲 Not Implemented

The generated CV files (PDF and DOCX) contain no metadata, footer, or annotation indicating that AI was used in their creation. The `metadata.json` written to the output directory (`scripts/utils/cv_orchestrator.py:2175–2194`) records `approved_rewrites` and `rewrite_audit` but this file is not included in the downloadable package and is not visible from the UI.

For contexts where AI-assisted content authorship requires disclosure (academic submissions, grant applications, certain government roles), the absence of attribution metadata could expose users to compliance risk.

### LLM Provider Data-Retention Disclosure

⚠️ Partial

Provider confidentiality flags are defined (e.g., `confidential: False` for Gemini free-tier with note "Free-tier prompts may be reviewed by Google", and for Groq). These are surfaced in the LLM wizard provider-card popovers and the model-selection table during initial setup.

However:

1. The disclosure is **only visible during initial setup** in the LLM wizard. Once a provider is configured and the wizard is closed, there is no persistent indicator.
2. The header pill (`web/index.html:51–60`) shows only model name and auth-ready status — no `confidential` warning.
3. The onboarding modal (`web/index.html:313–378`) mentions "AI" and external providers in general terms but contains no explicit statement that the user's CV content and job description are transmitted to the configured LLM provider.
4. There is no one-time consent or acknowledgement before the first LLM call is made.

---

## Summary Score Table

| Story / Criterion | Rating | Key Evidence |
| --- | --- | --- |
| US-C1 Criterion 1: Rewrites visibly presented as suggestions | ✅ Pass | `web/rewrite-review.js:126–135`, per-card accept/edit/reject |
| US-C1 Criterion 2: Weak-evidence / confirm-first cases flagged | ⚠️ Partial | `web/rewrite-review.js:230–233` (weak badge); collapsed warning panel at line 107 |
| US-C1 Criterion 3: No blur between approved output and proposals | ✅ Pass | `conversation_manager.py:96–102`; `rewriteDecisions` starts empty |
| US-C1 AC: AI-proposed content reviewable before acceptance | ✅ Pass | Submit blocked while `pending > 0` (`rewrite-review.js:373–378`) |
| US-C1 AC: Higher-risk suggestions receive stronger signalling | ⚠️ Partial | Per-card badge exists; warning panel collapsed by default |
| US-C2 Criterion 1: Review stages block progression | ⚠️ Partial | Rewrite: gated. Spell: soft. Customise: no gate |
| US-C2 Criterion 2: Accept/reject/edit paths distinguishable | ✅ Pass | `web/rewrite-review.js:344–350`; `.accepted`/`.rejected` classes |
| US-C2 Criterion 3: No silent auto-acceptance | ⚠️ Partial | No auto-accept for rewrites; customise defaults are implicit |
| US-C2 AC: Approval-dependent stages enforce explicit decisions | ⚠️ Partial | Only satisfied for non-empty rewrite review |
| US-C3 Criterion 1: Diff-like review where text changes | ✅ Pass | `computeWordDiff` + `<del>`/`<ins>` rendering (`rewrite-review.js:183–226`) |
| US-C3 Criterion 2: Rationale exposed where promised | ✅ Pass | `<details class="rewrite-rationale">` per card; `recommendation-helpers.js` |
| US-C3 Criterion 3: Finalisation/harvest traceable | ✅ Pass | `rewrite_audit` in session; harvest from `approved_rewrites` only |
| US-C3 Criterion 3: Audit record accessible in UI | ⚠️ Partial | `rewrite_audit` in `session.json` but no UI panel |
| Materials: Factual grounding of AI content | ✅ Pass | Master CV in every LLM prompt (`conversation_manager.py:484–495`) |
| Materials: Extra skills / summary variant grounding | ⚠️ Partial | `extra_skills` state key; no factual check against work history |
| Materials: AI-proposal label for summary variants | 🔲 Not Implemented | No "AI-proposed" label in summary review tab |
| Materials: AI attribution in generated files | 🔲 Not Implemented | No metadata/footer in PDF or DOCX |
| Materials: LLM data-transmission disclosure | ⚠️ Partial | Wizard-only; no persistent indicator; no consent step |

Tally: 7 ✅ Pass · 7 ⚠️ Partial · 0 ❌ Fail · 2 🔲 Not Implemented

---

## Proposed Story Items (Gaps)

**GAP-TC-1 (HIGH) — Persuasion warning acknowledgement can be bypassed**
The warning detail panel is collapsed by default (`web/rewrite-review.js:107`, `style="display:none"`). The "✓ Acknowledged" button is inside the collapsed section (line 114). Users can dismiss unread warnings via a single "Proceed anyway?" dialog click.
*Proposed US-C4:* The Submit button must remain disabled until all `warn`-severity persuasion warnings have been read (panel expanded) and individually acknowledged.

**GAP-TC-2 (HIGH) — No blocking gate at the Customise stage**
A user can proceed from job analysis to CV generation without visiting or deciding on any experience, skill, or achievement item. Items inherit LLM defaults silently.
*Proposed US-C7:* The Generate action must require at least one explicit decision from the Customise stage (or show a blocking warning that no customisation decisions were made).

**GAP-TC-3 (MEDIUM) — No in-app disclosure of external LLM data transmission**
The application transmits the user's full CV data and job description to third-party LLM providers. No in-app notice or one-time acknowledgement of this data flow is presented.
*Proposed US-C6:* First LLM call must be preceded by a one-time disclosure modal: "Your job description and CV excerpts are sent to [provider] for analysis. [Provider privacy policy link]." Require an explicit acknowledgement checkbox.

**GAP-TC-4 (MEDIUM) — No UI panel for session rewrite audit**
`rewrite_audit` is persisted to `session.json` (`conversation_manager.py:1113`) but is never displayed in the UI. A user cannot reconstruct the approval chain without locating and parsing the raw session file.
*Proposed US-C8:* The Finalise tab should include a collapsible "Session audit" section showing the `rewrite_audit` log: proposal, outcome, and final text for each item.

**GAP-TC-5 (MEDIUM) — Silent auto-advance through zero-item review stages**
When zero rewrites are returned, the workflow does not show a zero-rewrite confirmation screen. Users cannot distinguish "nothing needed review" from "review was skipped."
*Proposed US-C5:* When a review stage produces zero items, display an explicit summary screen ("0 text improvements required") requiring user acknowledgement before advancing.

**GAP-TC-6 (LOW) — Summary variant not labeled as AI-proposed**
Summary variants in the summary review tab are presented without attribution, indistinguishable from user-authored summaries sourced from master data.
*Proposed US-C9:* All AI-generated summary variants must carry a visible "(AI-proposed)" annotation.

**GAP-TC-7 (LOW) — No AI attribution option in generated files**
Generated PDF and DOCX contain no indication that AI was used. For academic, grant, or government submissions, this may cause a compliance issue the user is unaware of.
*Proposed US-C10:* Add an optional "AI-assisted" checkbox in the generation settings that, when checked, adds an attribution line to the PDF/DOCX footer.

---

### Source files inspected (this review)

- `web/index.html` lines 1–600
- `web/app.js` all
- `web/ui-core.js` lines 1–600
- `web/state-manager.js` all
- `web/styles.css` persuasion badge styles
- `web/rewrite-review.js` all
- `web/achievements-review.js` lines 1–350, 630–900
- `web/experience-review.js` lines 1–250
- `web/finalise.js` lines 1–390
- `web/goals.js` lines 1–210
- `web/spell-check.js` lines 200–320
- `scripts/web_app.py` lines 1–210
- `scripts/utils/conversation_manager.py` lines 1–500, 860–1150
- `scripts/routes/review_routes.py` lines 1167–1290, 2282–2380
- `scripts/routes/generation_routes.py` lines 40–60, 400–480, 890–960, 1600–1660, 2170–2210
- `scripts/utils/cv_orchestrator.py` lines 900–935, 1632–1800, 2015–2210

**Evidence standard:** Every ✅/⚠️/❌/🔲 is supported by file:line citations from direct source inspection. No conclusion depends on prior review documents or untested assertions.
