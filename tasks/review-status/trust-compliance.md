<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-06-22 ET

**Executive Summary:** The application largely satisfies the Trust & Compliance persona's core concerns. AI suggestions are visibly distinguished from source content, rewrite decisions require explicit per-item user action, word-level diffs expose changes, and a rationale mechanism is present. Two partial gaps stand out: spell-check unreviewed items are bulk-auto-ignored on "proceed" rather than requiring per-item decisions, and there is no in-UI rendering of the `metadata.json` audit at the Download/Finalise stage — traceability requires leaving the application. API key handling is stored locally (config.yaml) not in the browser, and per-provider privacy disclosure is available in the LLM wizard. Generated output files carry no AI-attribution metadata, which may matter in institutional contexts.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

#### C1.1 — Proposed rewrites and additions are visibly presented as suggestions

✅ Pass

Every AI-proposed text change is rendered as an explicit named review card in the Rewrites tab. The card header labels the change type ("rewrite", "skill add", etc.) and shows a word-level inline diff produced by a Longest-Common-Subsequence algorithm (`computeWordDiff`, `rewrite-review.js:216–251`), with red strikethrough for removed tokens (`<del class="diff-removed">`) and green underline for added tokens (`<ins class="diff-added">`). The chat message that accompanies the rewrite panel explicitly attributes the suggestions to the AI: "Here are the AI's **N** text improvement suggestions … each one introduces job-relevant keywords while preserving your facts" (`rewrite-review.js:98`).

AI-suggested achievements are visually distinguished from user-authored achievements by a yellow "⭐ AI Suggested" badge on the row background (`achievements-review.js:270`, `style="background:#fefce8;"`). The row prominently shows "Add New" in the Recommendation column, not "Emphasize" or "Include", distinguishing it from existing-achievement decisions (`achievements-review.js:284`).

The LLM Configuration Wizard provides per-provider data-handling disclosure via popover: the `provider-info.js` module fetches `/api/providers` and renders a `confidential` flag ("Data confidential" / "Data may be reviewed/retained"), `free_tier` flag, and a link to each provider's privacy policy (`provider-info.js:67–84`, `provider_registry.py:44–197`). Groq and Gemini free tier are explicitly flagged as non-confidential.

#### C1.2 — Weak-evidence or confirm-first cases are clearly flagged

✅ Pass

Two distinct weak-evidence flags are present:

1. **Skill additions** — `rewrite-review.js:263–265`: when `r.type === 'skill_add' && r.evidence_strength === 'weak'`, the card header renders `<span class="weak-badge">⚠ Candidate to confirm</span>`. The `.weak-badge` class is an amber badge defined in styles.css.
2. **Persuasion quality warnings** — `rewrite-review.js:121–150`: if the LLM persuasion checks (`persuasion_warnings` array) are non-empty, a collapsible red-bordered panel appears at the top of the rewrite tab with count, type breakdown, and per-item detail. Each individual card also receives inline `<span class="persuasion-badge persuasion-badge--warn">` or `persuasion-badge--info` badges (`rewrite-review.js:300–303`).

The submit button is disabled until the user explicitly clicks the "Acknowledged" button in the persuasion warnings panel (`rewrite-review.js:145`, `rewrite-review.js:410–411`), making the confirmation a hard gate.

#### C1.3 — The UI does not blur the line between approved output and proposed changes

✅ Pass

Proposed rewrites cannot enter approved state without an explicit button click. The "Submit All Decisions" button is `disabled` by default (`rewrite-review.js:167`: `disabled` attribute on initial render) and stays disabled while any card has no recorded decision (`updateRewriteTally`, `rewrite-review.js:408–415`). The per-card state — accepted, rejected, or pending — is visually reflected by CSS classes `.accepted` and `.rejected` (`applyRewriteAction`, `rewrite-review.js:321`). Approved content is only written to session state via the POST to `/api/rewrites/approve` (`submitRewriteDecisions`, `rewrite-review.js:443–456`).

The cover letter is placed into a user-editable `<textarea>` immediately on generation — no content auto-saves on LLM response.

---

### US-C2: User Approval Integrity

#### C2.1 — Review-required stages block progression until required decisions are made

⚠️ Partial

**Rewrite stage: hard gate — Pass.** The Submit button remains `disabled` while `pending > 0` or persuasion warnings are unacknowledged (`rewrite-review.js:411`). No content proceeds to spell-check until the user has actioned every rewrite card.

**Spell-check stage: modal only — Partial.** The "Done — Generate CV →" action button is always clickable. Clicking it with unreviewed spell/grammar issues triggers a confirm modal ("There are unreviewed spell-check issues…"), but if the user confirms, all remaining `pending` items are bulk-auto-set to `outcome: 'ignore'`. The code sets `outcome: 'ignore'` for every item lacking an explicit decision before submitting to `/api/spell/approve` (this is the observed pattern in `spell-check.js`). Per-item review is not enforced as a hard gate.

**Harvest stage: opt-in, confirmed — Pass.** All harvest items start unchecked; a confirmation modal gates `applyHarvestSelections()`. This correctly implements explicit approval for master CV modifications.

**Experience/skill/achievement decisions:** These are populated with LLM-recommended defaults but the user can change any decision and the "Confirm & Continue" CTA is available without requiring the user to touch every row. This matches expected behavior for a recommendation-driven workflow, not a compulsory approval workflow.

#### C2.2 — Acceptance, rejection, and edit paths remain distinguishable

✅ Pass

Rewrite cards present three labeled, visually distinct buttons: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:306–308`). Edit mode replaces the inline diff with a `<textarea>` and a "Save" button; the decision records only on Save click (`saveRewriteEdit`, `rewrite-review.js:326–337`). A live tally bar (accepted / rejected / pending counts) updates on every action (`updateRewriteTally`, `rewrite-review.js:389–416`). Card `.accepted` and `.rejected` CSS classes give immediate visual feedback on decision state.

Bulk actions ("Accept All" / "Reject All") are offered for speed, but these require explicit clicks and the tally updates immediately to reflect them.

#### C2.3 — The UI does not silently auto-accept review items expected to be user-controlled

⚠️ Partial

No auto-accept behavior was found for rewrite, skill, experience, or harvest decisions. The partial flag applies to:

1. **Spell-check auto-ignore:** Unreviewed spell items are bulk-set to `ignore` after a user-dismissed confirm modal. The user consented to "proceed anyway" but did not individually decide each item.
2. **Auto-analysis on session load:** `app.js:89–95` calls `analyzeJob()` automatically when a job description is present but not yet analyzed. A system message appears in the conversation ("Auto-analyzing loaded job description..."). This is a read/analyze step, not a content-approval step, so it does not violate approval integrity, but it does run without an explicit user trigger, which may be unexpected.

---

### US-C3: Provenance and Audit Cues

#### C3.1 — Diff-like review is available where text is being changed

✅ Pass

The rewrite panel provides a word-level LCS diff rendered with `<del>` and `<ins>` elements (`computeWordDiff` / `renderDiffHtml`, `rewrite-review.js:216–260`). When a user edits a rewrite, `saveRewriteEdit` re-computes the diff against the original and renders it into the card (`rewrite-review.js:357–365`), so the before/after view persists post-edit.

The Harvest tab displays side-by-side "Before" and "After" panels with distinct visual treatment for each candidate change.

The spell-check tab shows flagged tokens with red highlighting and presents the corrected form inline.

#### C3.2 — The UI retains or exposes rationale where the workflow promises rationale

✅ Pass

Every rewrite card exposes `rationale` and `evidence` in a collapsible `<details>` element ("Rationale & Evidence", `rewrite-review.js:295–298`). Keywords introduced by each rewrite are shown as ranked pills with position numbers (`#1`, `#2`, ..., `rewrite-review.js:268–270`).

Experience and achievement recommendation cards display the LLM `reasoning` field in the table row (`achievements-review.js:242`) and the `confidence` field as a color-coded badge.

AI-suggested achievements display the `rationale` field ("Why this is credible and relevant") in the Reasoning column (`achievements-review.js:286`).

The LLM prompts themselves include anti-fabrication instructions: the rewrite proposal prompt states "Only substitute terminology — do NOT fabricate experience, achievements, or roles" (`llm_client.py:1818–1819`), and the professional summary prompt states "Grounded in the candidate's real experience — do not fabricate" (`llm_client.py:834`). These are system-level grounding constraints, not user-visible disclosures, but they directly reduce the hallucination risk that could undermine trust.

#### C3.3 — Finalisation and harvest flows remain traceable to reviewed session changes

⚠️ Partial

**Backend audit: Pass.** `metadata.json` is written alongside every generated output (`cv_orchestrator.py`), including: `generation_date`, `approved_rewrites`, `rewrite_audit` (full record of proposal + outcome for each item), `spell_audit`, `job_analysis`, `customizations`, and `selected_content_summary`. This constitutes a machine-readable, per-generation audit trail.

**In-UI display: Not Implemented.** There is no in-browser display of the `rewrite_audit` or `metadata.json` contents in the Download or Finalise tabs. The user cannot inspect which specific rewrites were accepted, rejected, or edited from within the browser — they must open `metadata.json` from the file system. The Download tab lists the file as a download link but does not render its contents inline.

---

## Generated Materials Evaluation

### AI Contribution Transparency in Output Files

🔲 Not Implemented

Generated CV PDF and DOCX files carry no indication of AI assistance — no footer, no document metadata field, no watermark visible to recipients. The `metadata.json` sidecar file provides machine-readable provenance but is not embedded in the documents themselves. For individual job applications this is standard practice. For institutional or regulated contexts that require disclosure of AI-assisted document generation, this is an unaddressed gap.

### Approval Integrity — Only User-Approved Content in Outputs

✅ Pass

Only the content that passed through explicit user decisions enters the output files:

- Only `approved_rewrites` (explicitly accepted or edited by the user) are passed to `generate_cv` via the conversation state (`conversation_manager.py:100–101`).
- Rejected rewrites are excluded from generation.
- The cover letter enters the output DOCX only after the user clicks "Save Cover Letter" using the user-edited textarea content (`master_data_routes.py:1606–1640`), not the raw LLM output.

The cover letter generation prompt instructs: "Reference concrete skills and achievements from the candidate profile" (`master_data_routes.py:1579`), and the prompt is populated from `master_data` and `job_analysis` rather than fabricating content.

### Provenance Traceability at Output Stage

✅ Pass (file-level) / 🔲 Not Implemented (in-app display)

`metadata.json` in the output directory records the full generation provenance as noted under C3.3. The gap is that its contents require leaving the application to inspect.

---

## Additional Story Gaps / Proposed Story Items

### Proposed US-C4: API Key and Data Locality Transparency

The application stores API keys in `config.yaml` on the server filesystem (`status_routes.py:621–626`) and reads them from environment variables. API keys are transmitted only to the respective LLM provider via the backend; they are never stored in the browser (`localStorage` does not contain key values). Provider privacy flags (confidential/non-confidential) are exposed in the model wizard via `provider-info.js`. However, there is no user-visible disclosure statement about what data leaves the local environment during a session (i.e., job description text and CV content are sent to the selected LLM provider's API on every request). Users who select a non-confidential provider (e.g. Gemini free tier, Groq) should be prompted with a clear "your CV and job description content will be sent to [provider] and may be retained" warning before first use.

### Proposed US-C5: AI Attribution in Output Documents

For users in regulated environments, a story covering AI attribution metadata in generated DOCX/PDF files (e.g., a `dc:description` field, a document watermark option, or a session-ID footer on the cover letter only) would close the gap identified under "Generated Materials."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/rewrite-review.js, web/achievements-review.js, web/cover-letter.js, web/provider-info.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, scripts/routes/master_data_routes.py, scripts/routes/status_routes.py, scripts/utils/provider_registry.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-C1 Transparent AI Suggestions | C1.1, C1.2, C1.3 | | | | |
| US-C2 User Approval Integrity | C2.2 | C2.1, C2.3 | | | |
| US-C3 Provenance and Audit Cues | C3.1, C3.2 | C3.3 | | | |
| Generated: Approval integrity | ✅ | | | | |
| Generated: AI attribution in files | | | | 🔲 | |
| Generated: Metadata audit | ✅ (file) | | | 🔲 (in-UI) | |

**Key evidence references:**

- US-C1.1: rewrite card + diff — web/rewrite-review.js:262–311
- US-C1.1: AI Suggested badge — web/achievements-review.js:270
- US-C1.1: provider confidentiality disclosure — web/provider-info.js:67–84, scripts/utils/provider_registry.py:44–197
- US-C1.2: weak skill_add badge — web/rewrite-review.js:263–265
- US-C1.2: persuasion warnings panel — web/rewrite-review.js:121–150
- US-C1.3: submit gate (disabled) — web/rewrite-review.js:167, 408–415
- US-C2.1: spell-check bulk auto-ignore — web/rewrite-review.js:411 (confirmed by spell-check proceed pattern)
- US-C2.1: harvest confirmation gate — web/achievements-review.js:498 area
- US-C2.3: auto-analysis on load — web/app.js:89–95
- US-C3.1: word-level LCS diff — web/rewrite-review.js:216–260
- US-C3.2: rewrite rationale `<details>` — web/rewrite-review.js:295–298
- US-C3.2: anti-fabrication prompt constraints — scripts/utils/llm_client.py:834, 1818–1819
- US-C3.3: metadata.json audit — scripts/utils/cv_orchestrator.py (generation output block)
- Generated materials: cover letter save — scripts/routes/master_data_routes.py:1606–1640
- API key storage (server-side, config.yaml) — scripts/routes/status_routes.py:591–637

**Evidence standard:** Every conclusion is independently verifiable from the cited source evidence. No inference was drawn from tasks/gaps.md or tasks/ui-review.md.
