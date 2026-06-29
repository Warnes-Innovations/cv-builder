<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-06-29 14:30 ET

**Executive Summary:** The application satisfies the core Trust & Compliance criteria for US-C1 and substantial portions of US-C2 and US-C3. AI-generated suggestions are visibly distinguished from source content through labeled review cards, word-level LCS diffs, weak-evidence badges, and per-card persuasion quality warnings. User approval integrity is strongly enforced at the rewrite stage (hard gate: submit button stays disabled until all cards are decided AND persuasion warnings acknowledged). Two partial gaps persist: spell-check unreviewed items are bulk-set to `ignore` on user-dismissed confirm (not per-item enforced), and the in-browser audit trail (rewrite_audit, metadata.json) is not rendered in the Download/Finalise tabs — it requires opening a file from disk. Generated output files carry no AI-attribution metadata. An additional gap surfaced this cycle: there is no user-visible disclosure that CV and job-description content is transmitted to the selected LLM provider on every request, which is especially relevant for non-confidential providers (Groq, Gemini free tier).

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

#### C1.1 — Proposed rewrites and additions are visibly presented as suggestions

✅ Pass

All AI-proposed text changes are rendered as explicit labeled review cards in the Rewrites tab before any content is committed. Each card header carries a `rewrite-card-type` label (`rewrite-review.js:283`) showing the change category (e.g. "rewrite", "skill add"). The card body displays a word-level inline diff computed by `computeWordDiff` — a Longest-Common-Subsequence algorithm (`rewrite-review.js:216–251`) — that wraps removed tokens in `<del class="diff-removed">` (red strikethrough) and added tokens in `<ins class="diff-added">` (green, `styles.css:1248–1249`). A live tally bar shows Accepted / Rejected / Pending counts (`styles.css:1233–1238`).

The chat message attributing suggestions to the AI is explicit: "Here are the AI's **N** text improvement suggestions for the included bullets — each one introduces job-relevant keywords while preserving your facts." (`rewrite-review.js:98`).

The LLM Configuration Wizard header pill shows the active provider and model name (`index.html:52–61`, `ui-core.js:893–896`), and a live LLM status badge reflects connection state with distinct classes (`authenticated`, `configured`, `unconfigured`, `error`, etc., `styles.css:39–61`). This gives the user a persistent, always-visible reminder that an LLM is involved.

#### C1.2 — Weak-evidence or confirm-first cases are clearly flagged

✅ Pass

Two distinct weak-evidence signal mechanisms are implemented:

1. **Weak skill-add badge:** When a rewrite card has `type === 'skill_add'` AND `evidence_strength === 'weak'`, the card header renders `<span class="weak-badge">⚠ Candidate to confirm</span>` (`rewrite-review.js:263–265`). The `.weak-badge` class uses amber styling (`styles.css:1245`): `background:#fef3c7; color:#92400e`.

2. **Persuasion quality warnings panel:** When `persuasion_warnings` from `/api/rewrites` is non-empty, a collapsible red-bordered panel appears above the rewrite cards with count, type breakdown, and per-item details (`rewrite-review.js:121–150`). Each individual card also receives inline `persuasion-badge--warn` (amber) or `persuasion-badge--info` (blue) badges with tooltip details (`rewrite-review.js:300–303`, `styles.css:1274–1276`).

Crucially, the submit button is disabled until the user clicks "Acknowledged" in the persuasion warnings panel (`updateRewriteTally`, `rewrite-review.js:422–423`): `submitBtn.disabled = (pending > 0) || needsAck`. Even if the user somehow bypasses the UI gate, `submitRewriteDecisions` re-checks `persuasionWarningsAcknowledged` and prompts a confirm modal before proceeding (`rewrite-review.js:431–438`).

#### C1.3 — The UI does not blur the line between approved output and proposed changes

✅ Pass

No proposed rewrite content enters session state without an explicit user action. The "Submit All Decisions" button starts `disabled` and remains disabled while any card has no decision and while persuasion warnings are unacknowledged (`rewrite-review.js:167`, `updateRewriteTally:423`). Cards that are accepted turn green (`.accepted`), rejected turn red with reduced opacity (`.rejected`), and pending cards retain the neutral default (`styles.css:1240–1241`).

The edit path requires a two-step sequence: click "✎ Edit" to enter edit mode (replaces diff with `<textarea>`), then click "Save" to commit the edited text and record the decision (`saveRewriteEdit`, `rewrite-review.js:366–398`). A decision is registered only on Save; leaving edit mode without saving does not persist.

The cover letter enters a user-editable `<textarea>` immediately on generation and is not auto-saved. Bulk actions ("Accept All" / "Reject All") require explicit clicks and update the tally in real time.

**System-level grounding:** The LLM system prompts include explicit anti-fabrication constraints. The rewrite proposal prompt states "Only substitute terminology — do NOT fabricate experience, achievements, or roles." The professional summary prompt states "Grounded in the candidate's real experience — do not fabricate." (`conversation_manager.py:403–477`, `_build_system_prompt` method). These grounding constraints reduce the hallucination risk at source.

---

### US-C2: User Approval Integrity

#### C2.1 — Review-required stages block progression until required decisions are made

⚠️ Partial

**Rewrite stage: hard gate — Pass.** The Submit button stays `disabled` while `pending > 0` OR persuasion warnings are unacknowledged (`rewrite-review.js:423`). Every card must be actioned (accept/edit/reject) and persuasion warnings acknowledged before any content passes to spell-check.

**Spell-check stage: soft gate — Partial.** The "Generate Preview →" action button (`index.html:186`, id `spell-btn`) is always enabled once the spell phase is reached. When unreviewed items exist, the flow prompts a confirm modal asking the user to confirm proceeding. If confirmed, any `pending` spell items are bulk-resolved to `outcome: 'ignore'` via the `complete_spell_check` backend path (`conversation_manager.py:1183`). The user consented to proceed but did not individually decide each item. This is a behavioural soft gate, not a hard gate.

**Harvest stage: opt-in, confirmed — Pass.** All harvest candidates are unchecked by default; a confirmation dialog gates the final write-back to master CV, preventing accidental bulk acceptance.

**Experience/skill/achievement decisions:** These start with LLM-recommended defaults. The "Confirm & Continue" CTA is available without requiring the user to visit every row. This is appropriate for a recommendation-driven, not compulsory-approval, workflow.

**Auto-analysis on session load:** `app.js:89–95` calls `analyzeJob()` automatically when a job description is present but not yet analyzed. A system message appears in the chat ("Auto-analyzing loaded job description..."). This is a read/analyze step, not a content-approval step, but it executes without an explicit user trigger.

#### C2.2 — Acceptance, rejection, and edit paths remain distinguishable

✅ Pass

Three labeled, visually distinct action buttons appear on every rewrite card: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:306–308`). Each button uses `aria-pressed` toggling and a visual active state class. Edit mode replaces the inline diff with a `<textarea>` and a "Save" button; content is committed only on Save click (`rewrite-review.js:328–343`). A live tally bar (Accepted / Rejected / Pending) updates on every action (`rewrite-review.js:401–428`). Card border colors and background colors change on decision (`.accepted` green, `.rejected` red/dim, `styles.css:1240–1241`).

#### C2.3 — The UI does not silently auto-accept review items that are expected to be user-controlled

⚠️ Partial

No silent auto-accept was found for rewrite, skill, experience, achievement, or harvest decisions. The partial flag applies to:

1. **Spell-check bulk auto-ignore:** Unreviewed spell items are resolved to `ignore` after a user-dismissed modal (user chose "proceed anyway"). The consent was implicit (dismissing a modal), not explicit per-item decisions.
2. **Auto-analysis on session load** (`app.js:89–95`): job analysis runs without an explicit trigger. No content is approved in this step, but it may surprise users.

---

### US-C3: Provenance and Audit Cues

#### C3.1 — Diff-like review is available where text is being changed

✅ Pass

Every rewrite card shows a word-level LCS diff rendered with `<del>` (red strikethrough) and `<ins>` (green) elements (`computeWordDiff`, `renderDiffHtml`, `rewrite-review.js:216–260`). When the user edits a rewrite, `saveRewriteEdit` re-computes the diff against the original and updates the card display in real time (`rewrite-review.js:379–381`), so the before/after comparison remains visible after editing.

The Harvest tab (confirmed via styles.css harvest-section classes) displays side-by-side "Before" and "After" panels for each candidate change.

The spell-check tab renders flagged tokens with distinct styling and presents corrected forms inline.

#### C3.2 — The UI retains or exposes rationale where the workflow promises rationale

✅ Pass

Every rewrite card exposes `rationale` and `evidence` in a collapsible `<details class="rewrite-rationale">` element with a "Rationale & Evidence" summary (`rewrite-review.js:295–298`). Keywords introduced by each rewrite are shown as ranked pills with position numbers `#1`, `#2`, ... (`rewrite-review.js:268–270`, `styles.css:1252–1254`).

Experience and achievement recommendation cards display the LLM `reasoning` field and a `confidence` color-coded badge. The backend LLM system prompt mandates a "REASONING & EVIDENCE" section in every recommendation, with explicit instructions to cite supporting and contradicting evidence (`conversation_manager.py:422–450`).

AI-suggested achievements (in the achievements review tab, referenced in summary-review.js) carry the `rationale` field ("Why this is credible and relevant").

The model wizard exposes per-provider context-window size, pricing (input/output per 1M tokens), Copilot multiplier, and "Source" (list_models vs fallback_static) for every available model (`ui-core.js:1580–1661`, `index.html:513–530`). A "Prices" footer notes whether pricing data comes from a live source (OpenRouter) or a static baseline with a hardcoded date (`ui-core.js:1849–1868`). This gives compliance-minded users visibility into the model's cost and pricing-data quality.

The Settings modal exposes per-field "Source" labels showing whether each config value comes from an environment variable, .env file, config.yaml, or built-in default (`ui-core.js:67–100`, `index.html:580–632`).

#### C3.3 — Finalisation and harvest flows remain traceable to reviewed session changes

⚠️ Partial

**Backend audit: Pass.** `conversation_manager.py` records `approved_rewrites`, `rewrite_audit` (full proposal + outcome per item), and `spell_audit` in session state (`conversation_manager.py:1114–1159`, `1168–1187`). This is persisted to session JSON and included in `metadata.json` alongside generated output files. The `rewrite_audit` captures the full before/after/outcome/final_text for every rewrite proposal, which constitutes a verifiable per-generation audit trail.

**In-UI display: Not Implemented.** The Download tab and Finalise tab provide no in-browser rendering of `rewrite_audit` or `metadata.json` contents. A user cannot inspect the full rewrite audit trail from within the browser — they must locate and open `metadata.json` from the filesystem. The file is likely linked in the Download tab as a downloadable artifact, but it is not rendered inline.

The `StatusResponse` dataclass (`web_app.py:104–153`) includes `stale_steps` and `reentry_phase` fields, and `workflow-steps.js` reads these to mark workflow steps as stale with visual indicators (`styles.css:156–163`: `.step.stale`, `.step.stale-critical`). This partial audit cue helps users see when downstream steps need re-running after content changes.

---

## Generated Materials Evaluation

### AI Contribution Transparency in Output Files

🔲 Not Implemented

Generated CV PDF and DOCX files carry no indication of AI assistance — no footer notice, no document metadata field (`dc:description`, `dc:creator`), no watermark visible to a recipient or an institutional reviewer. The `metadata.json` sidecar file provides machine-readable provenance but is not embedded in or attached to the output documents. For individual job applications this is common industry practice. For institutional or regulated contexts (e.g. university postdoc applications with AI disclosure requirements), this is an unaddressed gap.

### Approval Integrity — Only User-Approved Content in Outputs

✅ Pass

Only content that passed through explicit user decisions enters the output:

- Only `approved_rewrites` (explicitly accepted or edited) are passed through `state['approved_rewrites']` to `generate_cv_from_session_state` (`conversation_manager.py:1156`).
- Rejected rewrites are excluded from generation.
- The cover letter is placed into a user-editable `<textarea>` immediately on generation and is saved to output only on an explicit "Save Cover Letter" user action, not on raw LLM response.

### Provenance Traceability at Output Stage

✅ Pass (file level) / 🔲 Not Implemented (in-app display)

`metadata.json` records generation provenance as noted under C3.3. The gap is that its contents require leaving the application to inspect.

---

## Additional Story Gaps / Proposed Story Items

### Proposed US-C4: LLM Data Transmission Disclosure

No user-visible statement explains that job description text and CV content are transmitted to the selected LLM provider's API on every request. The LLM wizard shows a per-provider "confidentiality" flag via the provider info popover, but this is buried behind a ⓘ icon in the model selection UI and is not surfaced as a first-class warning when a non-confidential provider (e.g. Groq, Gemini free tier) is selected or first used. A trust-compliant design would prompt: "Your CV and job description content will be sent to [provider] and may be retained. Continue?" on first use of a non-confidential provider.

### Proposed US-C5: AI Attribution in Output Documents

For users in regulated environments, a story covering AI attribution metadata in generated DOCX/PDF files (e.g., a `dc:description` field, a document footer option, or a session-ID notice on the cover letter) would close the gap identified under Generated Materials. Even an opt-in "Include AI-generated notice" setting would satisfy institutional requirements without forcing attribution on users who do not need it.

### Terminology Clarity

The term "Customise" in the workflow step bar (`index.html:123`, step id `step-customizations`) covers a complex multi-sub-tab stage (Goals, Questions, Experiences, Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score). A first-time user may not understand that "Customise" requires reviewing LLM recommendations across eight tabs before proceeding. A brief stage-entry instruction or a "Customisation checklist" tooltip would improve compliance by ensuring no required review step is inadvertently skipped.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-C1 Transparent AI Suggestions | C1.1, C1.2, C1.3 | | | | |
| US-C2 User Approval Integrity | C2.2 | C2.1, C2.3 | | | |
| US-C3 Provenance and Audit Cues | C3.1, C3.2 | C3.3 | | | |
| Generated: Approval integrity | 1 | | | | |
| Generated: AI attribution in files | | | | 1 | |
| Generated: Metadata audit | 1 (file) | | | 1 (in-UI) | |

**Key evidence references:**

- US-C1.1: rewrite card type label — `web/rewrite-review.js:283`
- US-C1.1: LCS word-level diff — `web/rewrite-review.js:216–260`
- US-C1.1: diff CSS classes — `web/styles.css:1248–1249`
- US-C1.1: LLM attribution message — `web/rewrite-review.js:98`
- US-C1.1: LLM status pill — `web/index.html:55–61`, `web/ui-core.js:827–868`
- US-C1.2: weak skill_add badge — `web/rewrite-review.js:263–265`, `web/styles.css:1245`
- US-C1.2: persuasion warnings panel — `web/rewrite-review.js:121–150`
- US-C1.2: per-card persuasion badges — `web/rewrite-review.js:300–303`, `web/styles.css:1273–1276`
- US-C1.2: submit gate (pending + acknowledgement) — `web/rewrite-review.js:422–423`
- US-C1.3: submit button disabled on render — `web/rewrite-review.js:167`
- US-C1.3: two-step edit path — `web/rewrite-review.js:328–343, 366–398`
- US-C1.3: anti-fabrication constraints — `scripts/utils/conversation_manager.py:403–477`
- US-C2.1: rewrite hard gate — `web/rewrite-review.js:423`
- US-C2.1: spell-check soft gate — `scripts/utils/conversation_manager.py:1183`
- US-C2.1: auto-analysis on load — `web/app.js:89–95`
- US-C2.2: Accept/Edit/Reject buttons — `web/rewrite-review.js:306–308`
- US-C2.2: aria-pressed toggling — `web/rewrite-review.js:325–360`
- US-C2.2: tally bar — `web/rewrite-review.js:401–428`, `web/styles.css:1233–1237`
- US-C3.1: LCS diff — `web/rewrite-review.js:216–260`
- US-C3.1: diff update on edit — `web/rewrite-review.js:379–381`
- US-C3.2: rewrite rationale `<details>` — `web/rewrite-review.js:295–298`
- US-C3.2: keyword pills with rank — `web/rewrite-review.js:268–270`
- US-C3.2: LLM recommendation format mandate — `scripts/utils/conversation_manager.py:416–450`
- US-C3.2: model pricing transparency — `web/ui-core.js:1580–1661, 1849–1868`
- US-C3.2: settings source labels — `web/ui-core.js:67–100`
- US-C3.3: rewrite_audit recording — `scripts/utils/conversation_manager.py:1114–1159`
- US-C3.3: spell_audit recording — `scripts/utils/conversation_manager.py:1168–1187`
- US-C3.3: stale step visual indicators — `web/styles.css:156–163`
- Generated approval: approved_rewrites state — `scripts/utils/conversation_manager.py:1156`
