<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-07-07 22:03 ET

**GAP-383 status: RESOLVED.** Independently re-derived from current source (not from the prior summary) and confirmed by execution against the live `CVOrchestrator` code: all three generated formats — HTML/PDF, ATS DOCX, human-readable DOCX — now agree in excluding `candidate_to_confirm: True` ("weak evidence") skills. See "GAP-383 verification" below for the evidence and the executed test.

**Executive Summary:** The specific defect (HTML/PDF silently showing a skill that vanished from both DOCX outputs) is fixed and consistent across formats. However, the fix cycle did not — and was not scoped to — address the deeper trust problem this persona has flagged before: a `candidate_to_confirm` skill is **unconditionally** excluded from every generated output regardless of what the user does in the Skills Review table (there is no path to "confirm" the skill and lift the flag), and nothing in the UI discloses that accepting a weak-evidence rewrite/skill leads to permanent exclusion from every generated document. That finding (previously filed under US-C1/US-C2/US-C3 as the "format-inconsistent silent exclusion" issue) is now more precisely a "cosmetic-approval, unconditional-exclusion" issue — the cross-format *inconsistency* is gone, but the cross-format *silent, currently-uncorrectable divergence from an apparent user decision* remains. Also identified: a minor code-hygiene inconsistency in the ATS DOCX filter (missing `isinstance(s, dict)` guard present in the other two filters) — confirmed via execution to be a **latent** gap, not a live bug, because the only production entry point (`generate_cv` → `build_render_ready_content` → `_select_content_hybrid`) normalizes every skill to a dict before any of the three generators see it.

---

## GAP-383 verification

Searched `scripts/utils/cv_orchestrator.py` for every `candidate_to_confirm` occurrence — exactly 3 filter sites plus 1 flag-setting site, as expected:

| Path | Location | Guard |
|---|---|---|
| HTML/PDF | `scripts/utils/cv_orchestrator.py:217-224` (`_prepare_cv_data_for_template`, called before `_organize_skills_by_category`) | `if not (isinstance(s, dict) and s.get('candidate_to_confirm'))` |
| ATS DOCX (GAP-326) | `scripts/utils/cv_orchestrator.py:4415-4416` (`_generate_ats_docx`) | `if not s.get('candidate_to_confirm')` — **no `isinstance` guard** |
| Human DOCX (GAP-342) | `scripts/utils/cv_orchestrator.py:5435-5436` (`_generate_human_docx`) | `if not (isinstance(s, dict) and s.get('candidate_to_confirm'))` |
| Flag origin | `scripts/utils/cv_orchestrator.py:1819-1824` (`apply_approved_rewrites`, `skill_add` branch) | `'candidate_to_confirm': item.get('evidence_strength') == 'weak'` — always a real Python bool |

All three use the same truthy semantics on the same field name, so the *filtering logic* is now consistent. I additionally instantiated a real `CVOrchestrator` (per the existing test fixture pattern in `tests/test_cv_orchestrator.py`) and ran all three generators end-to-end against a mixed skill list (`Python` plus a `candidate_to_confirm: True` "Quantum Computing" entry):

- `_prepare_cv_data_for_template()` → `skills_by_category` contains `Python`, not `Quantum Computing`.
- `_generate_ats_docx()` → rendered `.docx` text contains `Python`, not `Quantum Computing`.
- `_generate_human_docx()` → rendered `.docx` text contains `Python`, not `Quantum Computing`.

All three agree. This corroborates the existing regression test `tests/test_cv_orchestrator.py:492-516` (`test_candidate_to_confirm_skills_excluded_from_html_pdf`), which covers the HTML/PDF path only — there is **no** equivalent executable regression test asserting the ATS DOCX or human DOCX renderers actually exclude the flagged skill (both are only protected by the pre-existing GAP-326/GAP-342 source, not by a test that would catch a future accidental removal of either filter). Recommend adding two small tests mirroring `test_candidate_to_confirm_skills_excluded_from_html_pdf` for `_generate_ats_docx` and `_generate_human_docx` so all three formats have equal regression coverage, not just two-of-three plus one.

**New consistency check — plain-string skills:** the master-data schema (`schemas/master_cv_data.schema.json`, `$defs.skillItem`) explicitly documents skill entries as `oneOf: [string, object]` ("Supports legacy flat lists"), and `scripts/utils/conversation_manager.py:705-708,1043,1123` and `cv_orchestrator.py:1789,1807` all defensively branch on `isinstance(skill, str)` — so bare-string skills are a real, supported data shape elsewhere in this codebase. I tested what happens if a bare-string skills list reaches the HTML/PDF and ATS DOCX generators directly:

```text
ATS DOCX with plain-string skills: CRASHED -> AttributeError("'str' object has no attribute 'get'")
HTML/PDF with plain-string skills: CRASHED -> AttributeError("'str' object has no attribute 'get'")
```

Both crash — **not just the ATS DOCX path that lacks the `isinstance` guard**. The HTML/PDF path's `candidate_to_confirm` filter itself is guarded correctly, but the crash happens one level down inside `_organize_skills_by_category`'s helpers (`_group_inline_skills`, `_deduplicate_skills`, etc.), which assume dicts throughout and were never designed to accept bare strings directly. I traced why this isn't reachable in practice: the only real caller of all three generators is `generate_cv()` (`cv_orchestrator.py:2121`) via `build_render_ready_content()` → `_select_content_hybrid()` (`cv_orchestrator.py:3602-3607`), which unconditionally normalizes every skill — string or dict — into a dict (`{'name': skill}` for bare strings) *before* any of the three generators ever see the data. So: **GAP-383's fix did not introduce a new crash risk**, and the ATS DOCX filter's missing `isinstance` guard is not, today, an exploitable defect — but it is inconsistent defensive-coding style relative to its two siblings, and it (along with the whole skills-formatting stack) would break immediately if any future code path called these private methods directly with un-normalized master data (e.g., a future "quick preview" or "regenerate without re-selecting content" shortcut). Recommend adding the same `isinstance(s, dict)` guard to `cv_orchestrator.py:4416` purely for consistency/defense-in-depth, per this repo's own "fix all siblings in the same change set" guidance — even though it is not currently reachable.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Proposed rewrites/additions visibly presented as suggestions | ✅ | `web/rewrite-review.js:398-455` renders every proposal as a card with explicit Accept/Edit/Reject actions; `web/harvest.js:99-101` `shouldPreCheck()` always returns `false` (nothing pre-checked). |
| 2 | Weak-evidence or confirm-first cases are clearly flagged | ⚠️ | Flags are visually distinct: `web/rewrite-review.js:399-401` (`⚠ Weak evidence` badge, keyed off `evidence_strength === 'weak'`), `web/skills-review.js:723-731` (`candidate_to_confirm` → `⚠ Weak evidence` / `⚠ Verify evidence` tooltip badge with copy "Confirm this skill is genuinely demonstrated in your experience before including it."). But the flag is cosmetic only: `web/skills-review.js:587-593` `defaultAction` is driven purely by the AI's Emphasize/Include/De-emphasize/Omit recommendation, and the row's ✓ Include button (`web/skills-review.js:853`) is fully enabled/clickable for a `candidate_to_confirm` row exactly as for any other row — **but clicking it has no effect**, because generation-time filtering in `cv_orchestrator.py` (all three paths) unconditionally strips the skill regardless of the stored `include`/`omit` decision. The badge's own call-to-action ("Confirm this skill…") implies confirming is possible; no UI control anywhere clears `candidate_to_confirm`. |
| 3 | UI does not blur the line between approved output and proposed changes | ✅ (GAP-383 fixed this) | Previously ❌ — HTML/PDF disagreed with both DOCX formats. Now verified consistent across all three (see "GAP-383 verification"). The residual concern (criterion 2, and US-C2/US-C3 below) is no longer a *cross-format inconsistency* but a *disclosure* gap: all three formats now agree with each other, but none of them match what the "Include" button visually implies happened. |

**Acceptance criteria:**
- AI-proposed content is reviewable before acceptance — ✅ (`web/rewrite-review.js`, `web/harvest.js`, `web/master-data-ai-update.js` — opt-in, nothing pre-checked).
- Higher-risk suggestions receive stronger visual signalling — ✅ (`⚠ Weak evidence`/`⚠ Verify evidence` badges, confidence badges, persuasion-check warnings).

### US-C2: User Approval Integrity

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Review-required stages block progression until required decisions are made, where specified | ⚠️ | Hard block at Rewrite Review (`web/rewrite-review.js:601-608` `updateRewriteTally()` disables `#submit-rewrites-btn` while any card is pending). Soft gate only before Generate (`web/app.js:126-143` `confirmDialog`, then proceeds regardless). No gate at Finalise: `web/finalise.js:213` claims "❌ items must be resolved before submitting" but `#finalise-btn` is never disabled based on `_renderReadinessChecklist()` (`finalise.js:164-216,270-289` — still unconditional, re-verified this pass). |
| 2 | Acceptance, rejection, and edit paths remain distinguishable | ✅ | `web/rewrite-review.js:447-452` three explicit buttons with `aria-pressed` state plus a decision badge ("✓ Accepted" / "✗ Rejected" / "✓ Accepted (edited)"). |
| 3 | The UI does not silently auto-accept review items that are expected to be user-controlled | ⚠️ | Inverse problem persists: nothing auto-*accepts* silently, but the backend silently *overrides* an explicit user "Include" decision for `candidate_to_confirm` skills at generation time (now consistently, across all three formats — see GAP-383 verification) with no confirm dialog, toast, or checklist line disclosing it happened. |

**Acceptance criteria:**
- Approval-dependent workflow stages enforce explicit decision-making where the product promises it — ❌ Finalise readiness-checklist copy (`web/finalise.js:213`) is a promise of enforcement the code does not keep.

### US-C3: Provenance and Audit Cues

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Diff-like review is available where text is being changed | ✅ | `web/rewrite-review.js:352-396` word-level diff rendered per card. |
| 2 | The UI retains or exposes rationale where the workflow promises rationale | ✅ | `web/rewrite-review.js:436-441` `<details><summary>Rationale & Evidence</summary>` with explicit "No rationale recorded" fallback; also `web/harvest.js:146,155`, `web/master-data-ai-update.js:394,502`. |
| 3 | Finalisation and harvest flows remain traceable to reviewed session changes | ⚠️ | Traceability exists (`web/finalise.js:220-262` rewrite audit log; `web/harvest.js:132-138` provenance badges), but it is now *consistently* silent about the `candidate_to_confirm` divergence rather than *inconsistently* silent: a `skill_add` rewrite recorded as `outcome: accept` in the audit log will not appear in **any** of the three generated formats once `candidate_to_confirm` is true, and no audit surface says so. GAP-383 removed the case where a user could at least notice the discrepancy by comparing the DOCX to the HTML/PDF preview — now all three formats agree with each other, which paradoxically makes the divergence from the audit log *harder* to notice, not easier, since there is no longer a visible artifact-to-artifact mismatch to tip the user off. |

**Acceptance criteria:**
- Users can inspect key changes and their justification before finalisation — ⚠️ Inspection tooling is present and good, but does not reflect that an "Accepted" skill_add with weak evidence will be silently absent from every generated artifact.

---

## Generated Materials Evaluation

**GAP-383 (silent format inconsistency): RESOLVED.** Confirmed via source inspection and direct execution (see "GAP-383 verification" above) — HTML/PDF, ATS DOCX, and human DOCX now all exclude `candidate_to_confirm: True` skills identically. No plain-string-skill crash was introduced by this fix; the shared skill-formatting helpers already assumed dict-shaped skills before this cycle, and the only production caller normalizes to dicts upstream.

**Residual finding — unconditional, undisclosed, uncorrectable exclusion (still open; distinct from GAP-383):**

1. A `skill_add` rewrite with `evidence_strength: 'weak'` is shown with an `⚠ Weak evidence` badge (`web/rewrite-review.js:399-401`) and can be **Accepted** like any other rewrite.
2. `apply_approved_rewrites()` (`cv_orchestrator.py:1819-1824`) then adds the skill with `candidate_to_confirm: True`, set unconditionally from `evidence_strength == 'weak'`. Grepping the whole codebase for `candidate_to_confirm` (Python and JS) finds only 3 Python filter/flag sites and 1 JS read site (`web/skills-review.js:697`) — there is no write path anywhere that clears the flag once set.
3. In the Skills Review table, the row for such a skill renders the full set of action buttons (Emphasize / Include / De-emphasize / Exclude, `web/skills-review.js:853-857`) with no `disabled` attribute and no visual distinction from a normal row's controls — a user can click ✓ Include and see it highlighted as active (`aria-pressed="true"`).
4. At generation time, all three formats now consistently ignore that stored decision and exclude the skill outright (this is the fix under review, and it is working correctly for its stated purpose).
5. Net effect: a user who accepts a weak-evidence rewrite, then explicitly clicks "Include" on it in the Skills Review table, will find it absent from **every** generated document, with no disclosure at any point (not the badge tooltip, not the Skills Review row, not the Rewrites tab, not the Finalise readiness checklist, not the rewrite audit log) that this specific combination of decisions is a no-op.

This is a genuine, current, and consequential trust-compliance gap (previously folded into the GAP-383 write-up as "cross-format inconsistency"; now that the formats agree with each other, this is more accurately framed as a "misleading affordance" issue — the Include control looks actionable but is not, for this one class of item).

**Secondary finding — AI-assistance disclosure to the generated document itself defaults to OFF (unchanged, re-checked):**
`scripts/web_app.py:133` and `web/index.html` checkbox for `ai_attribution` default to unchecked/`False`; the document that leaves the app (the artifact an employer receives) carries no AI-assistance disclosure unless the user opts in. Distinct from the in-app transparency covered by US-C1–C3.

**Positive finding — third-party data disclosure remains handled well:** `disclosureKey()`-gated one-time notices before sending content to an external LLM provider (`web/harvest.js:326-337`, `web/index.html` "⚠ Non-confidential" badge) — unchanged and still a good pattern.

**Positive finding — Master CV mutation flow remains the strongest review-gate pattern:** `web/master-data-ai-update.js:383-476` — per-row opt-in checkboxes (none pre-checked), confirm modal naming the AI source, backup-first language, inline duplicate/persuasion-flag warnings, and a "Select all non-flagged" shortcut that explicitly excludes flagged rows. Still the template the `candidate_to_confirm` skill flow should converge toward (e.g., an equivalent "Select all confirmed" shortcut that excludes weak-evidence rows, paired with an actual confirm action that clears the flag).

---

## Additional Story Gaps / Proposed Story Items

1. **Proposed new criterion for US-C1/US-C2:** "A user-facing action that appears to control an item's inclusion (Include/Omit, Accept/Reject) must actually control it, or the UI must disable/relabel the control and explain why it is inert." Directly motivated by the `candidate_to_confirm` "Include" button being fully interactive but inert.
2. **Proposed new story (carried forward, unchanged):** "Document-level AI disclosure" — whether AI-assistance attribution embedded in the delivered CV/cover-letter should default on, off, or be forced to a decision point.
3. **Story-set gap (carried forward, unchanged):** none of US-C1–C3 covers the Finalise "readiness checklist" as a distinct trust surface even though its copy claims enforcement (`finalise.js:213`) that the code does not provide.
4. **Recommendation:** add `_generate_ats_docx`/`_generate_human_docx` regression tests mirroring `tests/test_cv_orchestrator.py:492-516` so all three formats have equal, independent test coverage for the `candidate_to_confirm` filter (currently only the HTML/PDF path has an executable regression test; the other two are protected by code review and this ad hoc verification pass, not by a repeatable test).
5. **Recommendation (defense-in-depth, not a live bug):** add the `isinstance(s, dict)` guard to the ATS DOCX filter at `cv_orchestrator.py:4416` to match its two siblings, given the master-data schema explicitly supports bare-string skill entries elsewhere in the codebase.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, plus (for continuity with the prior review pass) web/rewrite-review.js, web/harvest.js, web/finalise.js, web/skills-review.js, web/master-data-ai-update.js, schemas/master_cv_data.schema.json, tests/test_cv_orchestrator.py

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-C1 | 2 | 1 | 0 | 0 | 0 |
| US-C2 | 1 | 2 | 1 | 0 | 0 |
| US-C3 | 2 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- GAP-383 fix (HTML/PDF filter): `scripts/utils/cv_orchestrator.py:217-224`
- ATS DOCX filter (GAP-326): `scripts/utils/cv_orchestrator.py:4415-4416`
- Human DOCX filter (GAP-342): `scripts/utils/cv_orchestrator.py:5435-5436`
- Flag origin (`skill_add`, weak evidence): `scripts/utils/cv_orchestrator.py:1819-1824`
- Normalization that protects against bare-string skills in production: `scripts/utils/cv_orchestrator.py:3602-3607` (`_select_content_hybrid`)
- Schema support for bare-string skills: `schemas/master_cv_data.schema.json` (`$defs.skillItem`, `oneOf: [string, object]`)
- Existing regression test (HTML/PDF only): `tests/test_cv_orchestrator.py:492-516`
- Include button rendered fully active for weak-evidence rows: `web/skills-review.js:853-857`
- Weak-evidence badge copy implying confirmability with no confirm path: `web/skills-review.js:723-731`
- Finalise readiness checklist non-binding: `web/finalise.js:213` vs. `web/finalise.js:270-289`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
