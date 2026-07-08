<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust-Compliance Review Status

**Last Updated:** 2026-07-07 20:17 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-C1: Transparent AI Suggestions

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Proposed rewrites/additions visibly presented as suggestions | ✅ Pass | `web/rewrite-review.js:398-455` `renderRewriteCard()` renders every proposal as a card with explicit Accept/Edit/Reject actions; `web/harvest.js:140-162` `renderCandidateRow()` and `web/master-data-ai-update.js:389-401` render AI-proposed master-data changes with **unchecked** checkboxes (`shouldPreCheck()` in harvest.js:99-101 always returns `false`). |
| 2 | Weak-evidence or confirm-first cases are clearly flagged | ⚠️ Partial | Flags exist and are visually distinct: `web/rewrite-review.js:399-402` (`⚠ Weak evidence` badge on `skill_add` rewrites with `evidence_strength==='weak'`), `web/skills-review.js:727-735` (`candidate_to_confirm` → `⚠ Weak evidence`/`Verify evidence` tooltip badge), `web/recommendation-helpers.js:46-49` (Low/Very Low confidence labels with plain-language tooltips). However, the flag is *cosmetic only* — it does not change the default decision. `web/skills-review.js:587-593` computes `defaultAction` purely from the AI's Emphasize/Include/De-emphasize/Omit recommendation; a weak-evidence skill recommended "Include" defaults to **included** with no forced confirm step. Same pattern in `web/experience-review.js:168-174`. |
| 3 | UI does not blur the line between approved output and proposed changes | ❌ Fail (see Generated Materials below) | In-app review UI is clear, but the *generated files* silently diverge from what the user approved: `scripts/utils/cv_orchestrator.py:4407-4408` and `:5427-5428` drop any skill with `candidate_to_confirm=True` from the ATS DOCX and human DOCX — even after the user clicked **Accept** on that exact `skill_add` rewrite in the Rewrites tab. Full detail under "Generated Materials Evaluation". |

**Acceptance criteria:**
- AI-proposed content is reviewable before acceptance — ✅ Pass (`web/rewrite-review.js`, `web/harvest.js`, `web/master-data-ai-update.js` — all opt-in, nothing pre-checked).
- Higher-risk suggestions receive stronger visual signalling — ✅ Pass: persuasion-check warnings (`web/rewrite-review.js:245-264`), possible-duplicate/quality-advisory flags (`web/master-data-ai-update.js:362-373`), confidence badges (`web/harvest.js:55-60,121-125`).

### US-C2: User Approval Integrity

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Review-required stages block progression until required decisions are made, where specified | ⚠️ Partial | Inconsistent across stages: **Hard block** at Rewrite Review — `web/rewrite-review.js:601-608` `updateRewriteTally()` disables `#submit-rewrites-btn` while any card is pending. **Soft gate only** at Experience/Skill review before Generate — `web/app.js:126-143` shows a `confirmDialog` ("...not individually reviewed — the AI's recommendation will be used... Proceed anyway?") but clicking Proceed always continues; nothing server-side requires `experience_decisions`/`skill_decisions` to be populated (`scripts/routes/generation_routes.py` and `cv_orchestrator.py` only *read* these decisions, e.g. `generation_routes.py:1813-1818`, never require them). **Soft gate + auto-ignore** at Spell Check — `web/spell-check.js:441-458` warns, and on "Proceed" auto-converts remaining `pending` entries to `outcome: 'ignore'`. **No gate at all** at Finalise — `web/finalise.js:124,285` never disables `#finalise-btn` based on the readiness checklist, despite the checklist's own copy claiming otherwise (see criterion below). |
| 2 | Acceptance, rejection, and edit paths remain distinguishable | ✅ Pass | `web/rewrite-review.js:447-452` renders three explicit buttons with `aria-pressed` state and a decision badge (`rw-decision-badge-*`, lines 427,470-517) that reads "✓ Accepted" / "✗ Rejected" / "✓ Accepted (edited)". Bulk actions (`acceptAllRewrites`/`rejectAllRewrites`, lines 683-706) have a single-level Undo (`undoBulkRewriteAction`, lines 713-734). |
| 3 | The UI does not silently auto-accept review items that are expected to be user-controlled | ⚠️ Partial | In-conversation flows never silently auto-accept — every "proceed with unreviewed items" path routes through an explicit `confirmDialog`/`showConfirmModal` (`web/app.js:138-142`, `web/spell-check.js:445-450`, `web/rewrite-review.js:612-618`). But `scripts/routes/review_routes.py:405-411` writes `decisions_confirmed` per surface without any corresponding UI or API path that reverses it, and — more importantly — the backend performs the **opposite** silent action on generation: it silently *drops* an already-accepted weak-evidence skill from two of the three document formats (see Generated Materials) with no confirm dialog, toast, or checklist line telling the user this happened. |

**Acceptance criteria:**
- Approval-dependent workflow stages enforce explicit decision-making where the product promises it — ❌ Fail. The Finalise readiness checklist text (`web/finalise.js:213`: "❌ items must be resolved before submitting") is a promise of enforcement that the code does not keep — `finaliseApplication()` (finalise.js:266-352) runs unconditionally from the unconditionally-enabled `#finalise-btn` regardless of `_renderReadinessChecklist()` results (finalise.js:164-216).

### US-C3: Provenance and Audit Cues

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Diff-like review is available where text is being changed | ✅ Pass | `web/rewrite-review.js:352-396` `computeWordDiff()`/`renderDiffHtml()` — LCS word-level diff rendered inline per card (`rw-diff-*`, lines 418-431), regenerated live after an edit (`saveRewriteEdit()`, lines 538-580). |
| 2 | The UI retains or exposes rationale where the workflow promises rationale | ✅ Pass | `web/rewrite-review.js:436-441` `<details><summary>Rationale & Evidence</summary>...` per rewrite card, with an explicit fallback ("No rationale recorded for this rewrite.") rather than hiding the section. Also `web/harvest.js:146,155` (`hasReasoning`/`reasoning` → `detailText`), `web/achievements-review.js:320,453`, `web/publications-review.js:156,253`, `web/master-data-ai-update.js:394,502` (`c.rationale`). |
| 3 | Finalisation and harvest flows remain traceable to reviewed session changes | ⚠️ Partial | Traceability exists for what makes it into the audit trail: `web/finalise.js:220-262` `_renderRewriteAuditLog()` and `web/rewrite-review.js:182-219` show original/proposed/final/outcome per rewrite; `web/harvest.js:132-138` `renderProvenanceBadge()` distinguishes "🤖 AI accepted" vs "✏️ User-edited". **But** this audit trail is itself misleading: a `skill_add` rewrite recorded in the audit log as `outcome: accept` (i.e., "you approved this") will not actually be present in the ATS DOCX or human DOCX once `candidate_to_confirm` is true (`cv_orchestrator.py:4407-4408,5427-5428`), and neither the rewrite audit log nor the Finalise readiness checklist (`finalise.js:182-193`) has any line item that would surface this divergence to the user. |

**Acceptance criteria:**
- Users can inspect key changes and their justification before finalisation — ⚠️ Partial. Inspection tooling is present and good (diff + rationale + audit log), but it does not reflect the true content of every generated artifact (see above), so "inspect before finalisation" does not guarantee "matches what finalisation actually produces."

---

## Generated Materials Evaluation

**Primary finding — format-inconsistent silent exclusion of accepted content (new, cross-cutting; affects US-C1.3, US-C2.3, US-C3.3):**

1. A "skill_add" rewrite with `evidence_strength: 'weak'` is shown in the Rewrites tab with an `⚠ Weak evidence` badge (`web/rewrite-review.js:399-402`) and can be **Accepted** like any other rewrite.
2. On acceptance, `apply_approved_rewrites()` (`scripts/utils/cv_orchestrator.py:1811-1816`) adds the skill to the CV's skill list with `candidate_to_confirm: True` (set unconditionally from `evidence_strength == 'weak'`, line 1814) — there is no subsequent user-facing step anywhere in the codebase that clears this flag (confirmed by grepping all `.py` under `scripts/` for `candidate_to_confirm`: only 3 write/read sites exist, at lines 1814, 4408, 5428 — no "confirm" endpoint or UI control targets it).
3. At generation time this flag causes the skill to be:
   - **Included** in the HTML preview and PDF, because `_prepare_cv_data_for_template()` → `_organize_skills_by_category()` (`cv_orchestrator.py:172-222`, `:593`) does not filter on `candidate_to_confirm` at all.
   - **Silently excluded** from the ATS DOCX (`cv_orchestrator.py:4407-4408`, comment: "Filter weak-evidence (candidate_to_confirm) skills from ATS DOCX (GAP-326)").
   - **Silently excluded** from the human-readable DOCX (`cv_orchestrator.py:5427-5428`, comment: "Exclude weak-evidence (candidate_to_confirm) skills from human DOCX (GAP-342)").
4. Result: a user who reviews the PDF/HTML preview, sees the skill present, and trusts the rewrite audit log's "✓ Accepted" record will submit a DOCX to an employer that is **missing** content they explicitly approved — with no warning anywhere in the product (not in the Rewrites tab, not in the Finalise readiness checklist, not in the Harvest tab, not in the rewrite audit log). This directly violates the trust-compliance principle that approved content should reliably reach the final package, and that any divergence between what was reviewed and what is delivered must be visible.

This is a real code-level finding (not merely documentation), verified by reading the three call sites directly; it was introduced deliberately by two separate prior gap fixes (GAP-326, GAP-342) that each independently decided to exclude `candidate_to_confirm` skills from *their* format without coordinating with the HTML/PDF path or with any user-facing disclosure.

**Secondary finding — AI-assistance disclosure to the generated document itself defaults to OFF:**
`scripts/routes/status_routes.py:779` and `scripts/utils/cv_orchestrator.py:2158,2201` read `ai_attribution` from `conversation.state`, defaulting to `get_config().ai_attribution` which is `False` by default (`scripts/web_app.py:133`, `web/index.html:669-671` checkbox unchecked by default). This means: **in-app** the user is told which content is AI-suggested (rationale panels, badges), but the **document that leaves the app** (the artifact an employer receives) carries no AI-assistance disclosure unless the user proactively opts in via Settings. This is a legitimate, distinct trust question from the three existing stories (which are scoped to in-app transparency) — see proposed story item below.

**Positive finding — third-party data disclosure is handled well:**
`disclosureKey()`-gated one-time notices before sending user content to an external LLM provider appear consistently across `web/job-analysis.js`, `web/cover-letter.js`, `web/harvest.js:326-337`, and `web/screening-questions.js` — e.g. harvest.js: "ℹ️ Content you submit is sent to the configured LLM provider (…) for analysis. Review your provider's data policy for details." Also `web/index.html:60` shows a persistent "⚠ Non-confidential" badge in the header when the selected provider may retain data. This is a genuine trust-supporting pattern worth preserving.

**Positive finding — Master CV mutation flow is a strong model for the other flows:**
`web/master-data-ai-update.js:383-476` (`confirmMasterDataAiUpdate()`) requires per-row opt-in checkboxes (none pre-checked), a confirm modal that names the source ("proposed by AI from your instruction... have not been previously reviewed"), states a backup will be made first, and surfaces `possible_duplicate_of`/`persuasion_flags` warnings inline (`_mduFlagHtml()`, lines 362-373) with a "Select all non-flagged" shortcut that explicitly excludes flagged rows (lines 447-458). This is the most rigorous review gate in the codebase and should be the template other write-back flows (harvest, skill_add) converge toward.

---

## Additional Story Gaps / Proposed Story Items

1. **Proposed new criterion for US-C1/US-C3:** "Content a user explicitly approves during review must appear in every generated output format, or the UI must disclose format-specific exclusions before finalisation." Directly motivated by the `candidate_to_confirm` DOCX-exclusion bug above.
2. **Proposed new story:** "Document-level AI disclosure" — evaluate whether AI-assistance attribution embedded in the delivered CV/cover-letter (not just in-app UI) should default on, default off, or be forced to a decision point, given this is the artifact a third party (employer) actually sees. Current stories (US-C1–C3) only cover in-app transparency; none currently address what disclosure travels with the document itself.
3. **Story-set gap:** none of US-C1–C3 explicitly covers the Finalise stage's "readiness checklist" as a distinct trust surface, even though it's the closest thing the product has to a formal sign-off gate — and it is currently non-binding despite its own copy claiming otherwise (`finalise.js:213`). Recommend adding an explicit acceptance criterion under US-C2 or US-C3 that any UI text asserting a requirement ("must be resolved before submitting") is backed by actual enforcement, or is reworded to avoid over-promising.
4. **Terminology inconsistency (not a story gap, but flagged per task instructions):** the same workflow step is labelled "🌾 **Update Master CV**" in the workflow nav and tab bar (`web/index.html:153,241`; `web/workflow-steps.js` `_STEP_DISPLAY['harvest'] = 'Update Master CV'`) but the panel itself repeatedly renders "🌾 **Harvest Improvements**" as its heading and prose (`web/harvest.js:284,309,366`). A user navigating from the nav label to the panel sees a different, internal/developer term ("harvest") not otherwise explained in-panel, which weakens the mental-model alignment the rest of the product works hard to maintain (c.f. GAP-325's rename of "Package Application Files" → "Archive Application" specifically to fix this class of issue elsewhere).
5. **Terminology micro-inconsistency:** `web/skills-review.js:731` labels the weak-evidence badge "⚠ Weak evidence" only when `_evidenceText` is present, otherwise "⚠ Verify evidence"; `web/rewrite-review.js:401` always uses "⚠ Weak evidence" regardless. Two independent implementations of the same underlying concept (`evidence_strength === 'weak'` / `candidate_to_confirm`) use different label logic — low severity, but worth consolidating per this repo's own documented anti-pattern (CLAUDE.md: "Avoid Duplicate Helper/Function Definitions Across Files").

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/rewrite-review.js, web/harvest.js, web/finalise.js, web/skills-review.js, web/experience-review.js, web/master-data-ai-update.js, web/workflow-steps.js, web/spell-check.js, web/recommendation-helpers.js, scripts/utils/cv_orchestrator.py, scripts/routes/review_routes.py, scripts/routes/generation_routes.py, scripts/routes/status_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-C1 | 2 | 1 | 1 | 0 | 0 |
| US-C2 | 1 | 2 | 1 | 0 | 0 |
| US-C3 | 2 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- US-C1.1: opt-in, nothing pre-checked → `web/harvest.js:99-101` `shouldPreCheck()` always false
- US-C1.2: weak-evidence badge doesn't change default decision → `web/skills-review.js:587-593`, `web/experience-review.js:168-174`
- US-C1.3 / Generated Materials: accepted weak-evidence skill dropped from DOCX only → `scripts/utils/cv_orchestrator.py:1814` (flag set), `:4407-4408` (ATS DOCX filter), `:5427-5428` (human DOCX filter), vs. no filter in `:172-222` template prep path
- US-C2.1: hard gate at Rewrite Review vs. soft gate elsewhere → `web/rewrite-review.js:601-608` vs. `web/app.js:126-143` vs. `web/finalise.js:124,285` (no gate)
- US-C2 acceptance criterion: checklist copy promises enforcement not implemented → `web/finalise.js:213` vs. `finalise.js:164-216,266-352`
- US-C3.3: rewrite audit log doesn't reflect DOCX-format divergence → `web/finalise.js:220-262`, `web/rewrite-review.js:182-219`
- Positive: third-party LLM data disclosure → `web/harvest.js:326-337`, `web/index.html:60`
- Positive: strongest review-gate pattern in the codebase → `web/master-data-ai-update.js:383-476`
- Document-level AI disclosure defaults off → `scripts/web_app.py:133`, `scripts/routes/status_routes.py:779`, `web/index.html:669-671`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
