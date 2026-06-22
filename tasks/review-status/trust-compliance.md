<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust and Compliance Review

**Persona:** Trust / Compliance Reviewer
**Stories:** US-C1, US-C2, US-C3
**Reviewed:** 2026-06-20

**Source files examined:**

- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/rewrite-review.js`
- `web/spell-check.js`
- `web/harvest.js`
- `web/experience-review.js`
- `web/skills-review.js`
- `web/summary-review.js`
- `web/layout-instruction.js`
- `web/finalise.js`
- `web/download-tab.js`
- `web/cover-letter.js`
- `web/workflow-steps.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

#### Criterion C1.1 — Proposed rewrites and additions are visibly presented as suggestions

Status: ✅ Pass

The Rewrites tab renders every AI-proposed text change as an explicit review card (`renderRewriteCard`, `rewrite-review.js:229`). The card header labels the type of change (e.g. "rewrite", "skill add") and presents a word-level inline diff (`computeWordDiff`, `rewrite-review.js:183`) that visually distinguishes removed tokens (`<del class="diff-removed">`, red) from added tokens (`<ins class="diff-added">`, green). No rewrite enters approved state without an explicit Accept / Edit / Reject action (`applyRewriteAction`, `rewrite-review.js:281`). The introductory message at `rewrite-review.js:67` explicitly characterizes the suggestions as "AI's text improvement suggestions … introducing job-relevant keywords while preserving your facts."

The AI-generated professional summary is explicitly labeled "AI-Generated Summary" (`summary-review.js:71`) and distinguished from stored master-CV variants, which appear under a separate collapsible "Use a stored summary variant instead" panel (`summary-review.js:93`).

#### Criterion C1.2 — Weak-evidence or confirm-first cases are clearly flagged

Status: ✅ Pass

Two distinct weak-evidence flags exist:

1. Skills: inline "⚠ Verify evidence" badge with tooltip (`skills-review.js:664`), styled amber via CSS class `.weak-badge` (`styles.css:1238`). Set when backend `evidence_strength == 'weak'` triggers `candidate_to_confirm: True` (`cv_orchestrator.py:1779`).
2. Rewrites: `<span class="weak-badge">⚠ Candidate to confirm</span>` when `r.type === 'skill_add' && r.evidence_strength === 'weak'` (`rewrite-review.js:230–233`).

Persuasion warnings (overstatements, weak verbs) are surfaced as a collapsible red panel at the top of the rewrite review, with per-card inline badges (`rewrite-review.js:100–119`, `rewrite-review.js:267–270`). CSS classes `.persuasion-badge--warn` (amber) and `.persuasion-badge--info` (blue) (`styles.css:1267–1268`) provide colour-coded severity distinction.

#### Criterion C1.3 — The UI does not blur the line between approved output and proposed changes

Status: ✅ Pass

The Submit button is `disabled` until all cards have a decision (pending count = 0) and persuasion warnings are acknowledged (`updateRewriteTally`, `rewrite-review.js:373–380`). Approved content enters the session only via the explicit `/api/rewrites/approve` POST (`submitRewriteDecisions`, `rewrite-review.js:417`). Cards change to `.accepted` or `.rejected` CSS classes immediately on decision, so the panel's visual state always reflects the user's choices, not the AI's proposals.

The cover letter is placed into a user-editable `<textarea>` immediately on generation (`cover-letter.js:261`), making clear it is a draft; no auto-save occurs on generation — the user must explicitly click "Save Cover Letter".

---

### US-C2: User Approval Integrity

#### Criterion C2.1 — Review-required stages block progression until required decisions are made

Status: ✅ Pass (rewrite stage, tagline gate) / ⚠️ Partial (spell-check stage)

*Rewrite stage:* The "Submit All Decisions" button is `disabled` while any card has `pending` status or persuasion warnings are unacknowledged (`rewrite-review.js:136`, `rewrite-review.js:375–380`). This is a hard gate.

*Tagline gate:* `_confirmProceedToGenerate()` (`spell-check.js:359`) checks `status.decisions_confirmed.tagline` and shows a blocking alert modal if the tagline has not been confirmed; generation is blocked.

*Spell-check stage:* The "Done — Generate CV →" button is reachable at any time. When clicked with unreviewed issues present, a confirm modal warns the user (`submitSpellCheckDecisions`, `spell-check.js:401–408`). However, if the user proceeds, all unreviewed items are auto-set to `outcome: 'ignore'` (`spell-check.js:413–416`). The confirmation gate is present, but the per-item review model is weakened by bulk auto-ignore on "proceed".

*Harvest stage:* All harvest items start unchecked (`harvest.js:100`, `shouldPreCheck` returns `false`), enforcing opt-in. A confirmation modal gates `applyHarvestSelections()` (`harvest.js:498–503`), correctly implementing an explicit approval path for master CV modification.

#### Criterion C2.2 — Acceptance, rejection, and edit paths remain distinguishable

Status: ✅ Pass

Rewrite cards present three labelled, visually distinct buttons: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:273–275`). Edit mode replaces the inline diff with a `<textarea>` for free editing, and the decision records only on "Save" click (`saveRewriteEdit`, `rewrite-review.js:326`). A live tally bar (accepted / rejected / pending) updates on every action (`rewrite-review.js:354–381`). Card `.accepted` and `.rejected` CSS classes give immediate visual feedback (`rewrite-review.js:319`).

Experience review provides "Emphasize", "Include", "De-emphasize", "Exclude" action choices with distinct visual states. Skill review includes the "Verify evidence" badge. These paths are not auto-applied.

#### Criterion C2.3 — The UI does not silently auto-accept review items that are expected to be user-controlled

Status: ✅ Pass (rewrites, harvest, experiences, skills) / ⚠️ Partial (spell-check, auto-analysis)

No auto-accept behavior was found for rewrite, skill, or experience decisions. For spell-check: unreviewed items are auto-ignored only after a user-confirmed modal (⚠ Partial — see C2.1 above).

Auto-analysis: `app.js:88–95` calls `analyzeJob()` automatically on session load when a job description is present but not yet analyzed. A system message is shown in the conversation panel (`app.js:92`). This is a read/analyze step, not a content-approval step, so it does not violate approval integrity, but it does run without an explicit user trigger.

---

### US-C3: Provenance and Audit Cues

#### Criterion C3.1 — Diff-like review is available where text is being changed

Status: ✅ Pass

The rewrite panel provides a word-level LCS diff rendered with `<del>` and `<ins>` elements (`computeWordDiff`, `renderDiffHtml`, `rewrite-review.js:183–227`). Red strikethrough shows removed tokens; green shows added tokens (`styles.css:1241–1242`). When a user edits a rewrite, the saved edit regenerates the diff against the original (`saveRewriteEdit`, `rewrite-review.js:338–342`), so the before/after view persists post-edit.

Harvest candidates display "Before" and "After" panels with visual distinction (grey-bordered before, green-bordered after) (`harvest.js:167–176`). Spell check shows flagged text in a red-highlighted span and inline `<del>…</del> → <ins>…</ins>` rendering after a custom correction is applied (`spell-check.js:292`).

#### Criterion C3.2 — The UI retains or exposes rationale where the workflow promises rationale

Status: ✅ Pass

Rewrite cards expose `rationale` and `evidence` fields in a collapsible `<details>` element ("Rationale & Evidence", `rewrite-review.js:261–266`). Keywords introduced by each rewrite are shown as ranked pills (`rewrite-review.js:235–237`). Harvest candidates expose an AI reasoning block (toggle button, `harvest.js:147–152`) when `hasReasoning` is true.

Phase re-run confirmations state: "All existing approvals and rewrites are preserved as context" (`workflow-steps.js:153`), and list downstream stages affected by the re-run. Stale-step tracking (`stale_steps` in `StatusResponse`, `web_app.py:150`) drives amber warning badges on completed workflow steps in the progress bar, alerting users that earlier changes may have made downstream results outdated (`workflow-steps.js:682`).

#### Criterion C3.3 — Finalisation and harvest flows remain traceable to reviewed session changes

Status: ✅ Pass (backend-level) / 🔲 Not Implemented (in-UI audit display)

Backend: `cv_orchestrator.py:2187–2207` writes `metadata.json` alongside every generated output, including: `generation_date`, `approved_rewrites`, `rewrite_audit`, `spell_audit`, `job_analysis`, `customizations`, `selected_content_summary`, `files_generated`. The `metadata.json` file is listed among generated files in the Download tab. This constitutes a machine-readable, per-generation audit trail.

However, there is no in-UI display of the `rewrite_audit` or `metadata.json` contents in the Download or Finalise tabs. The user cannot inspect which specific rewrites were accepted, rejected, or edited from within the browser — they must open the file on disk. The Finalise tab lists `metadata.json` as a download link but does not render its contents inline.

---

## Generated Materials Evaluation

### US-C1 (Generated materials — AI contributions transparent)

Status: ✅ Pass (applied content is user-approved) / 🔲 Not Implemented (no AI-attribution in output files)

Generated CV files contain only content that passed through explicit user decisions: experience inclusion, skill decisions, rewrite accept/reject, and summary selection. No AI-proposed content enters the output without a user decision. However, the generated PDF/DOCX files themselves carry no indication of AI assistance (no footer, metadata field, or watermark visible to recipients). This is standard practice for job application tools, but institutional compliance contexts requiring AI-assisted-document disclosure would not be served.

### US-C2 (Generated materials — approval integrity preserved)

Status: ✅ Pass

Only accepted rewrites appear in `approved_rewrites` passed to `generate_cv`, sourced from `conversation_manager.py:1157`. Rejected rewrites are excluded. The cover letter enters the generated `.docx` only after the user explicitly clicks "Save Cover Letter" (`saveCoverLetter`, `cover-letter.js:283`), using the user-edited textarea content rather than the raw LLM output.

### US-C3 (Generated materials — provenance traceable)

Status: ✅ Pass (file-level metadata) / 🔲 Not Implemented (in-app audit display at output stage)

`metadata.json` in the output directory records the full generation provenance. The gap is that the contents require leaving the application to inspect.

---

## Summary Table

| Criterion | Status | Key Evidence |
| --- | --- | --- |
| C1.1 Rewrites visibly proposed as suggestions | ✅ | `rewrite-review.js:229` card + word-diff; `rewrite-review.js:67` labeling |
| C1.2 Weak-evidence and persuasion flags | ✅ | `skills-review.js:664` badge; `rewrite-review.js:230` badge; `rewrite-review.js:100` panel |
| C1.3 Approved output vs proposed not blurred | ✅ | Submit gate `rewrite-review.js:136,375`; explicit `/api/rewrites/approve` POST |
| C2.1 Progression gated on decisions | ⚠️ | Rewrite: hard gate. Spell: modal only; unreviewed items auto-ignored (`spell-check.js:413`) |
| C2.2 Accept/reject/edit distinguishable | ✅ | Three labelled buttons; tally bar; `.accepted`/`.rejected` card states |
| C2.3 No silent auto-accept | ⚠️ | Spell issues bulk-auto-ignored on "proceed"; auto-analysis on session load |
| C3.1 Diff where text changes | ✅ | LCS word diff (`rewrite-review.js:183`); before/after harvest (`harvest.js:167`) |
| C3.2 Rationale exposed | ✅ | Collapsible rationale on rewrite cards (`rewrite-review.js:261`); harvest reasoning toggle |
| C3.3 Finalisation traceable | ⚠️ | `metadata.json` on disk (`cv_orchestrator.py:2205`); no in-UI audit rendering |
| Generated: AI content labelled in output files | 🔲 | No AI-attribution marker in exported PDF/DOCX |
| Generated: Only approved content in outputs | ✅ | `approved_rewrites` gated; cover letter requires explicit Save |
| Generated: Metadata audit file produced | ✅ | `metadata.json` with full audit per generation (`cv_orchestrator.py:2187`) |

---

## Gaps Identified

### GAP-C1 (LOW): Spell-check bulk auto-ignore on "proceed"

`submitSpellCheckDecisions` (`spell-check.js:413–416`) auto-sets all remaining `pending` items to `outcome: 'ignore'` after the user clicks "Proceed" in the warning modal. The confirmation gate exists, but auto-ignore is bulk and silent per-item. Consider requiring explicit per-item dismiss before "Done" becomes enabled, or at minimum flagging auto-ignored items distinctly in the spell audit log.

### GAP-C2 (LOW): Auto-analysis fires without explicit user trigger

`app.js:88–95` calls `analyzeJob()` automatically when a session has a job description but no analysis. A system message is shown. This is a read/analyze step, not a content-approval step, but users expecting to initiate analysis via "Analyze Job" may be surprised. A toast disambiguation could clarify the trigger.

### GAP-C3 (MEDIUM): No in-UI audit display at Finalise/Download stage

`metadata.json` contains the full rewrite and spell audit but is only accessible on disk. The Finalise or Download tab could render a summary table of accepted/rejected rewrites and spell corrections to close the provenance loop in-app without requiring users to open files externally.

### GAP-C4 (MEDIUM): No AI-attribution metadata in exported DOCX/PDF

Generated output files carry no indication of AI assistance. For institutional compliance contexts that require disclosure of AI-assisted documents, this is a gap. The `metadata.json` provides machine-readable provenance but is external to the documents themselves. A document metadata field (e.g. DOCX `dc:description` or PDF `Keywords`) recording the session identifier and generation date would address this without affecting visible content.
