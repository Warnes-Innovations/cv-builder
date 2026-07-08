<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-07-07 23:13 ET

**GAP-390 status: RESOLVED.** Independently re-derived from current source (not from the fix-cycle summary). `web/skills-review.js` no longer contains any copy implying an Include/confirm action exists for `candidate_to_confirm` ("weak evidence") skills. The badge now reads "⚠ Excluded — weak evidence" (`web/skills-review.js:734-736`), the inline note reads "Not included in generated documents (weak evidence)" (`web/skills-review.js:737-739`), and the Emphasize/Include/De-emphasize button tooltips append "— still excluded from generated documents (weak evidence)" (`web/skills-review.js:740-742,862-864`). A repository-wide grep for the old copy ("Confirm this skill", "Verify evidence") across `web/` returns nothing, including in the built `web/bundle.js`, which already reflects the new copy — no stale build artifact risk. A genuine, specific regression test exists and passes: `tests/js/skills-review.test.js:582-605`, titled with "(GAP-390)", asserting both the absence of the old copy and the presence of the new copy, including on the Include button's `title` attribute. I ran it in isolation (`vitest run ... -t "GAP-390"`) and it passed (1 passed, 54 skipped by filter — expected).

**Executive Summary:** This cycle's fix closes the *dishonesty* gap this persona flagged as GAP-390: the UI previously told the user "Include" and "Confirm this skill…" were meaningful actions for weak-evidence skills when no code path anywhere ever cleared `candidate_to_confirm`. The team chose disclosure over building a real confirm mechanism, and disclosure is what was scoped and what shipped — verified correct, complete, and tested. The underlying exclusion logic in `scripts/utils/cv_orchestrator.py` was independently re-verified: all three generation paths (HTML/PDF, ATS DOCX, human DOCX) filter `candidate_to_confirm: True` skills with the identical, now fully consistent guard `if not (isinstance(s, dict) and s.get('candidate_to_confirm'))` — notably the ATS DOCX site (`cv_orchestrator.py:4415-4419`) has picked up the missing `isinstance` guard that the prior review pass (GAP-383 verification, retained below) flagged as a defense-in-depth gap; that recommendation was also acted on in this cycle. **I would sign off on this fix as resolving GAP-390 as scoped.** The larger, separate ask — an actual working confirm mechanism that lifts the exclusion — remains unbuilt, but it was never GAP-390's claim; GAP-390 was about the UI lying about what "Include" does, and it no longer does.

---

## GAP-390 verification (this cycle)

| Check | Result | Evidence |
|---|---|---|
| No residual copy implying a confirm action exists | ✅ | `grep -rn "Confirm this skill\|Verify evidence" web/` → zero hits (source and built `bundle.js`) |
| New copy honestly states unconditional exclusion, independent of Include/Omit | ✅ | `web/skills-review.js:734-742` — badge, note, and three button tooltips (emphasize/include/de-emphasize) all say "excluded" / "not included," none say "confirm" |
| Underlying exclusion logic (3 sites) still consistent and unconditional | ✅ | HTML/PDF `cv_orchestrator.py:217-224`; ATS DOCX `cv_orchestrator.py:4415-4419`; human DOCX `cv_orchestrator.py:5439-5440` — all three now use `isinstance(s, dict) and s.get('candidate_to_confirm')`, closing the ATS DOCX guard gap noted in the prior review pass |
| Regression test exists, is specific to GAP-390, and passes | ✅ | `tests/js/skills-review.test.js:582-605`; ran in isolation, passed |
| No server-side path clears the flag (copy's honesty is not accidentally wrong) | ✅ | `grep -rn candidate_to_confirm web/ scripts/` — only 3 Python filter sites + 1 flag-origin site (`cv_orchestrator.py:1822`) + 1 JS read site (`web/skills-review.js:697`); no write/clear path anywhere |

**Verdict: RESOLVED**, not partial — every claim in the fix summary was independently reproduced from source, and the one prior sibling gap (ATS DOCX missing `isinstance` guard) was fixed in the same pass rather than left dangling.

---

## GAP-383 verification (carried forward from prior review pass, still valid, unchanged by this cycle)

Searched `scripts/utils/cv_orchestrator.py` for every `candidate_to_confirm` occurrence — exactly 3 filter sites plus 1 flag-setting site:

| Path | Location | Guard |
|---|---|---|
| HTML/PDF | `scripts/utils/cv_orchestrator.py:217-224` (`_prepare_cv_data_for_template`) | `if not (isinstance(s, dict) and s.get('candidate_to_confirm'))` |
| ATS DOCX (GAP-326) | `scripts/utils/cv_orchestrator.py:4415-4419` (`_generate_ats_docx`) | `if not (isinstance(s, dict) and s.get('candidate_to_confirm'))` — **now guarded** (was missing the `isinstance` check in the prior review pass; fixed in this cycle) |
| Human DOCX (GAP-342) | `scripts/utils/cv_orchestrator.py:5439-5440` (`_generate_human_docx`) | `if not (isinstance(s, dict) and s.get('candidate_to_confirm'))` |
| Flag origin | `scripts/utils/cv_orchestrator.py:1822` (`apply_approved_rewrites`, `skill_add` branch) | `'candidate_to_confirm': item.get('evidence_strength') == 'weak'` — always a real Python bool |

All three filters now use identical truthy semantics and identical defensive guards on the same field name.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Proposed rewrites/additions visibly presented as suggestions | ✅ | `web/rewrite-review.js:398-455` renders every proposal as a card with explicit Accept/Edit/Reject actions; `web/harvest.js:99-101` `shouldPreCheck()` always returns `false`. |
| 2 | Weak-evidence or confirm-first cases are clearly flagged, and the flag's call-to-action matches what the app actually does | ✅ (GAP-390 fixed this) | Previously ⚠️ — the badge/tooltip said "Confirm this skill is genuinely demonstrated…" with no working confirm path. Now `web/skills-review.js:734-742` states plainly that the skill is excluded from generated documents regardless of the row's action, matching the unconditional generation-time exclusion verified above. |
| 3 | UI does not blur the line between approved output and proposed changes | ✅ (GAP-383, prior cycle) | HTML/PDF, ATS DOCX, and human DOCX agree on exclusion (unchanged this cycle, re-verified above). |

**Acceptance criteria:**

- AI-proposed content is reviewable before acceptance — ✅.
- Higher-risk suggestions receive stronger visual signalling, and that signalling is accurate about what the app does — ✅ (previously ⚠️ on the accuracy dimension; GAP-390 closes that gap).

### US-C2: User Approval Integrity

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Review-required stages block progression until required decisions are made, where specified | ⚠️ (unchanged, out of GAP-390 scope) | Hard block at Rewrite Review (`web/rewrite-review.js:601-608`). No gate at Finalise: `web/finalise.js:213` claims enforcement the checklist code does not provide (`finalise.js:164-216,270-289` — not independently re-verified this pass; carried forward from prior review, flagging as unconfirmed-this-cycle rather than re-asserting). |
| 2 | Acceptance, rejection, and edit paths remain distinguishable | ✅ | `web/rewrite-review.js:447-452`. |
| 3 | The UI does not silently auto-accept, nor silently override, a user's explicit review-item decision | ✅ (GAP-390 fixed the disclosure half) | The backend still overrides an "Include" decision for `candidate_to_confirm` skills at generation time — but this is no longer *silent*: the row's own badge, note, and button tooltips now say so at the point of decision. This is a legitimate resolution of the "silent" complaint; it does not (and was not claimed to) restore the user's ability to make Include actually take effect. |

**Acceptance criteria:**

- Where a control cannot actually change an outcome, the UI must say so rather than imply otherwise — ✅ new criterion satisfied by this fix (see "Additional Story Gaps" below for the pre-existing, still-open ask that the control eventually become real).

### US-C3: Provenance and Audit Cues

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Diff-like review is available where text is being changed | ✅ | `web/rewrite-review.js:352-396` (unchanged, not re-verified this cycle). |
| 2 | The UI retains or exposes rationale where the workflow promises rationale | ✅ | `web/rewrite-review.js:436-441` (unchanged, not re-verified this cycle). |
| 3 | Finalisation and harvest flows remain traceable to reviewed session changes | ⚠️ (unchanged, out of GAP-390 scope) | The rewrite audit log (`web/finalise.js:220-262`) still won't mention that an accepted weak-evidence `skill_add` is excluded from every generated format — GAP-390 fixed the Skills Review row's own honesty, not the audit-log surface. Not re-verified line-by-line this cycle; carried forward. |

---

## Generated Materials Evaluation

**GAP-390 (misleading "Include" affordance for weak-evidence skills): RESOLVED.** Verified independently: the UI copy no longer implies a confirm mechanism exists, honestly states unconditional exclusion at every touchpoint (badge, note, three button tooltips), and the underlying exclusion logic that copy describes is real, consistent across all three generated formats, and covered by a specific, passing regression test.

**GAP-383 (silent format inconsistency): still RESOLVED, unchanged this cycle** — HTML/PDF, ATS DOCX, and human DOCX all exclude `candidate_to_confirm: True` skills identically (re-confirmed by source read this pass, not re-executed).

**Residual finding — carried forward, now smaller in scope: no working confirm mechanism exists.** The Skills Review row's Emphasize/Include/De-emphasize buttons remain fully clickable and visually "active" (`aria-pressed`) for a `candidate_to_confirm` row, and clicking them still has zero effect on generation output — that has not changed and was explicitly out of scope for this fix. What changed is that the row now tells the user this plainly at the point of decision, which is the honesty defect GAP-390 was filed against. A genuinely complete fix would eventually offer a real way to lift the flag (e.g., an editable evidence field with re-classification, mirroring the "Select all confirmed" pattern already used well in `web/master-data-ai-update.js:383-476`), but shipping honest disclosure now rather than waiting for that larger feature is a reasonable, non-deceptive interim state — the control's tooltip/badge no longer promises something it can't deliver.

---

## Additional Story Gaps / Proposed Story Items

1. **Closed this cycle:** the "misleading affordance" criterion proposed in the prior review pass ("a control that appears to affect inclusion must actually affect it, or disclose that it doesn't") is now satisfied for the `candidate_to_confirm` case specifically via honest copy — track as precedent for any future not-yet-actionable control in this app.
2. **Still open (unchanged):** build an actual confirm mechanism (edit/strengthen evidence → re-classify → skill becomes generation-eligible) so "weak evidence" is a recoverable state, not a permanent one. Not a compliance defect as of this fix (the UI no longer lies about it), but still a product gap worth a story.
3. **Still open (unchanged, not GAP-390's scope):** document-level AI-assistance disclosure to the delivered artifact itself defaults OFF (`scripts/web_app.py:133`) — distinct trust surface from in-app review transparency.
4. **Still open (unchanged, not GAP-390's scope):** Finalise readiness-checklist copy claims enforcement it does not provide (`web/finalise.js:213`) — not re-verified this cycle, flagged for a future pass to confirm current state.
5. **Still open (unchanged, not GAP-390's scope):** no regression test exists for the ATS DOCX / human DOCX `candidate_to_confirm` exclusion specifically (only the HTML/PDF path has `tests/test_cv_orchestrator.py:492-516`); the ATS DOCX `isinstance` guard was fixed this cycle but still lacks its own dedicated test.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, web/skills-review.js, tests/js/skills-review.test.js

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-C1 | 3 | 0 | 0 | 0 | 0 |
| US-C2 | 2 | 1 | 0 | 0 | 0 |
| US-C3 | 2 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- US-C1: GAP-390 honest weak-evidence copy → `web/skills-review.js:734-742`
- US-C1: GAP-390 regression test → `tests/js/skills-review.test.js:582-605`
- US-C1/US-C3: GAP-383 cross-format exclusion consistency → `scripts/utils/cv_orchestrator.py:217-224,4415-4419,5439-5440`
- US-C2: Flag origin, never cleared anywhere → `scripts/utils/cv_orchestrator.py:1822`; no write/clear path found in `web/` or `scripts/`
- US-C2/US-C3: Finalise checklist non-binding claim (carried forward, not re-verified this cycle) → `web/finalise.js:213` vs. `web/finalise.js:270-289`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
