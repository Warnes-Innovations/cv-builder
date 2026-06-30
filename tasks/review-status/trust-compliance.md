<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** The application satisfies the core Trust & Compliance criteria for US-C1 and substantial portions of US-C2 and US-C3. AI-generated suggestions are visibly distinguished from source content through labeled review cards, word-level LCS diffs, weak-evidence badges, and per-card persuasion quality warnings. User approval integrity is strongly enforced at the rewrite stage (hard gate: submit button stays disabled until all cards are decided AND persuasion warnings acknowledged). Two partial gaps persist: spell-check unreviewed items are bulk-set to `ignore` on user-dismissed confirm (not per-item enforced), and the in-browser audit trail (rewrite_audit, metadata.json) is not rendered in the Download/Finalise tabs.

**New since prior review (cycle 7):** The "⚠ Non-confidential" amber pill was added to the header LLM badge. Evaluation of this addition is included in the US-C4 additional-gap section and in the evidence references. The pill is live and correctly wired, but has three completeness gaps: (1) it does not fire when the user changes provider in the model wizard (only updates on `fetchStatus`), (2) it carries no first-use confirmation gate for non-confidential providers, and (3) there is no positive "Data confidential" companion cue.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

#### C1.1 — Proposed rewrites and additions are visibly presented as suggestions

✅ Pass

All AI-proposed text changes are rendered as explicit labeled review cards in the Rewrites tab before any content is committed. Each card header carries a `rewrite-card-type` label (`rewrite-review.js:305`) showing the change category (e.g. "rewrite", "skill add"). The card body displays a word-level inline diff computed by `computeWordDiff` — a Longest-Common-Subsequence algorithm (`rewrite-review.js:238–273`) — that wraps removed tokens in `<del class="diff-removed">` (red strikethrough) and added tokens in `<ins class="diff-added">` (green, `styles.css:1248–1249`). A live tally bar shows Accepted / Rejected / Pending counts (`styles.css:1233–1238`).

The chat message attributing suggestions to the AI is explicit: "Here are the AI's **N** text improvement suggestions for the included bullets — each one introduces job-relevant keywords while preserving your facts." (`rewrite-review.js:120`).

The LLM Configuration Wizard header pill shows the active provider and model name (`index.html:52–61`, `ui-core.js:827–868`), and a live LLM status badge reflects connection state with distinct CSS classes (`authenticated`, `configured`, `unconfigured`, `error`, etc., `styles.css:39–61`). This gives the user a persistent, always-visible reminder that an LLM is involved.

#### C1.2 — Weak-evidence or confirm-first cases are clearly flagged

✅ Pass

Two distinct weak-evidence signal mechanisms are implemented:

1. **Weak skill-add badge (rewrite stage):** When a rewrite card has `type === 'skill_add'` AND `evidence_strength === 'weak'` (set by backend at `llm_client.py:745`), the card header renders `<span class="weak-badge">⚠ Candidate to confirm</span>` (`rewrite-review.js:285–287`). The `.weak-badge` class uses amber styling (`styles.css:1246`): `background:#fef3c7; color:#92400e`.

2. **Skills review "Verify evidence" badge:** When `candidate_to_confirm === true` on a skill entry (set from `evidence_strength == 'weak'` in `cv_orchestrator.py:1779`), the skills review table renders a `⚠ Verify evidence` badge with tooltip "Weak evidence — confirm this skill is genuinely demonstrated in your experience before including it" (`skills-review.js:663–664`). AI-suggested skills not yet in the master CV additionally render a `⚠ Not in CV profile` badge (`skills-review.js:661`).

3. **Persuasion quality warnings panel:** When `persuasion_warnings` from `/api/rewrites` is non-empty, a collapsible red-bordered panel appears above the rewrite cards with count, type breakdown, and per-item details (`rewrite-review.js:141–173`). Each individual card also receives inline `persuasion-badge--{severity}` badges with tooltip details (`rewrite-review.js:322–325`, `styles.css:1274–1276`).

Crucially, the submit button is disabled until the user clicks "Acknowledged" in the persuasion warnings panel (`updateRewriteTally`, `rewrite-review.js:444–448`): `submitBtn.disabled = (pending > 0) || needsAck`. Even if the user somehow bypasses the UI gate, `submitRewriteDecisions` re-checks `persuasionWarningsAcknowledged` and prompts a confirm modal before proceeding (`rewrite-review.js:452–459`).

#### C1.3 — The UI does not blur the line between approved output and proposed changes

✅ Pass

No proposed rewrite content enters session state without an explicit user action. The "Submit All Decisions" button starts `disabled` and remains disabled while any card has no decision and while persuasion warnings are unacknowledged (`rewrite-review.js:189`, `updateRewriteTally:444`). Cards that are accepted turn green (`.accepted`), rejected turn red with reduced opacity (`.rejected`), and pending cards retain the neutral default (`styles.css:1240–1241`).

The edit path requires a two-step sequence: click "✎ Edit" to enter edit mode (replaces diff with `<textarea>`), then click "Save" to commit the edited text and record the decision (`saveRewriteEdit`, `rewrite-review.js:388–410`). A decision is registered only on Save; leaving edit mode without saving does not persist.

The cover letter enters a user-editable `<textarea>` immediately on generation and is not auto-saved. Bulk actions ("Accept All" / "Reject All") require explicit clicks and update the tally in real time.

**System-level grounding:** The LLM system prompts include explicit anti-fabrication constraints. The rewrite proposal prompt states "Only substitute terminology — do NOT fabricate experience, achievements, or roles." The professional summary prompt states "Grounded in the candidate's real experience — do not fabricate." (`conversation_manager.py:402–477`, `_build_system_prompt`). These grounding constraints reduce the hallucination risk at source.

---

### US-C2: User Approval Integrity

#### C2.1 — Review-required stages block progression until required decisions are made

⚠️ Partial

**Rewrite stage: hard gate — Pass.** The Submit button stays `disabled` while `pending > 0` OR persuasion warnings are unacknowledged (`rewrite-review.js:444`). Every card must be actioned (accept/edit/reject) and persuasion warnings acknowledged before any content passes to spell-check.

**Spell-check stage: soft gate — Partial.** The "Generate Preview →" action button (`index.html:186`, id `spell-btn`) is always enabled once the spell phase is reached. When unreviewed items exist, the flow prompts a confirm modal asking the user to confirm proceeding. If confirmed, any `pending` spell items are bulk-resolved to `outcome: 'ignore'` (`spell-check.js:414–415`). The user consented to proceed but did not individually decide each item. This is a behavioural soft gate, not a hard gate.

**Harvest stage: opt-in, confirmed — Pass.** All harvest candidates are unchecked by default (`harvest.js:100`, `shouldPreCheck` always returns `false`); a confirmation dialog gates the final write-back to master CV, preventing accidental bulk acceptance.

**Experience/skill/achievement decisions:** These start with LLM-recommended defaults. The "Confirm & Continue" CTA is available without requiring the user to visit every row. This is appropriate for a recommendation-driven, not compulsory-approval, workflow.

**Auto-analysis on session load:** `app.js:89–95` calls `analyzeJob()` automatically when a job description is present but not yet analyzed. A system message appears in the chat ("Auto-analyzing loaded job description..."). This is a read/analyze step, not a content-approval step, but it executes without an explicit user trigger.

#### C2.2 — Acceptance, rejection, and edit paths remain distinguishable

✅ Pass

Three labeled, visually distinct action buttons appear on every rewrite card: "✓ Accept", "✎ Edit", "✗ Reject" (`rewrite-review.js:328–330`). Each button uses `aria-pressed` toggling and a visual active state class. Edit mode replaces the inline diff with a `<textarea>` and a "Save" button; content is committed only on Save click (`rewrite-review.js:350–386`). A live tally bar (Accepted / Rejected / Pending) updates on every action (`rewrite-review.js:430–450`). Card border colors and background colors change on decision (`.accepted` green, `.rejected` red/dim, `styles.css:1240–1241`).

#### C2.3 — The UI does not silently auto-accept review items that are expected to be user-controlled

⚠️ Partial

No silent auto-accept was found for rewrite, skill, experience, achievement, or harvest decisions. The partial flag applies to:

1. **Spell-check bulk auto-ignore:** Unreviewed spell items are resolved to `ignore` after a user-dismissed modal (user chose "proceed anyway"). The consent was implicit (dismissing a modal), not explicit per-item decisions.
2. **Auto-analysis on session load** (`app.js:89–95`): job analysis runs without an explicit trigger. No content is approved in this step, but it may surprise users.

---

### US-C3: Provenance and Audit Cues

#### C3.1 — Diff-like review is available where text is being changed

✅ Pass

Every rewrite card shows a word-level LCS diff rendered with `<del>` (red strikethrough) and `<ins>` (green) elements (`computeWordDiff`, `renderDiffHtml`, `rewrite-review.js:238–282`). When the user edits a rewrite, `saveRewriteEdit` re-computes the diff against the original and updates the card display in real time (`rewrite-review.js:407`), so the before/after comparison remains visible after editing.

The spell-check tab renders flagged tokens with distinct styling and presents corrected forms inline. The Harvest tab groups improvement candidates by display type and confidence tier.

#### C3.2 — The UI retains or exposes rationale where the workflow promises rationale

✅ Pass

Every rewrite card exposes `rationale` and `evidence` in a collapsible `<details class="rewrite-rationale">` element with a "Rationale & Evidence" summary (`rewrite-review.js:316–321`). Keywords introduced by each rewrite are shown as ranked pills with position numbers `#1`, `#2`, ... (`rewrite-review.js:289–292`, `styles.css:1252–1254`).

Experience and achievement recommendation cards display the LLM `reasoning` field and a `confidence` color-coded badge. The backend LLM system prompt mandates a "REASONING & EVIDENCE" section in every recommendation with explicit instructions to cite supporting and contradicting evidence (`conversation_manager.py:422–450`).

The model wizard exposes per-provider context-window size, pricing (input/output per 1M tokens), Copilot multiplier, and "Source" (list_models vs fallback_static) for every available model (`ui-core.js:1580–1661`, `index.html:513–530`). The Settings modal exposes per-field "Source" labels showing whether each config value comes from an environment variable, .env file, config.yaml, or built-in default (`ui-core.js:67–100`).

#### C3.3 — Finalisation and harvest flows remain traceable to reviewed session changes

⚠️ Partial

**Backend audit: Pass.** `conversation_manager.py` records `approved_rewrites`, `rewrite_audit` (full proposal + outcome per item), and `spell_audit` in session state. This is persisted to session JSON and included in `metadata.json` alongside generated output files. The rewrite_audit captures the full before/after/outcome/final_text for every rewrite proposal, constituting a verifiable per-generation audit trail.

**In-UI display: Not Implemented.** The Download tab and Finalise tab provide no in-browser rendering of `rewrite_audit` or `metadata.json` contents. A user cannot inspect the full rewrite audit trail from within the browser — they must locate and open `metadata.json` from the filesystem. The `rewrite_audit` log on the Finalise tab is loaded via `_renderRewriteAuditLog` (`finalise.js:180–222`) which fetches from `/api/rewrites` and renders a collapsible table — this is the closest approximation, but it is scoped to the Finalise tab and requires that fetch to succeed.

The `StatusResponse` dataclass (`web_app.py:104–153`) includes `stale_steps` and `reentry_phase` fields, and `workflow-steps.js` reads these to mark workflow steps as stale with visual indicators (`styles.css:156–163`: `.step.stale`, `.step.stale-critical`).

---

## Generated Materials Evaluation

### AI Contribution Transparency in Output Files

🔲 Not Implemented

Generated CV PDF and DOCX files carry no indication of AI assistance — no footer notice, no document metadata field (`dc:description`, `dc:creator`), no watermark visible to a recipient or institutional reviewer. The `metadata.json` sidecar file provides machine-readable provenance but is not embedded in or attached to the output documents. For individual job applications this is common industry practice. For institutional or regulated contexts (e.g. university postdoc applications with AI disclosure requirements), this is an unaddressed gap.

### Approval Integrity — Only User-Approved Content in Outputs

✅ Pass

Only content that passed through explicit user decisions enters the output:

- Only `approved_rewrites` (explicitly accepted or edited) are passed through `state['approved_rewrites']` to `generate_cv_from_session_state`.
- Rejected rewrites are excluded from generation.
- The cover letter is placed into a user-editable `<textarea>` immediately on generation and is saved to output only on an explicit "Save Cover Letter" user action, not on raw LLM response.

### Provenance Traceability at Output Stage

✅ Pass (file level) / 🔲 Not Implemented (in-app display)

`metadata.json` records generation provenance as noted under C3.3. The gap is that its contents require leaving the application to inspect.

---

## Additional Story Gaps / Proposed Story Items

### Proposed US-C4: LLM Data Transmission Disclosure and the Non-Confidential Badge

**What has been added:** A "⚠ Non-confidential" amber pill has been added to the header LLM badge (`index.html:59`). It is rendered inline beside the provider/model name and status pill. It shows when the active provider has `confidential: false` in the provider registry (`auth-provider.js:86–90`). Currently this applies to `gemini` and `groq` (`provider_registry.py:171, 190`). The pill has amber styling (`background:#fff7ed; border:1px solid #fed7aa; color:#c2410c`) and a tooltip: "Data may be reviewed or retained by this provider — see provider settings for details". Clicking the badge opens the model modal (via the parent button's `onclick`).

**What is working correctly:**

- Badge appears immediately on page load when the active provider is non-confidential (badge state is driven by `fetchStatus` → `updateAuthBadge` → `getProviderInfo(provider)` chain: `api-client.js:207–208`, `auth-provider.js:86–90`).
- Per-provider confidentiality metadata is the single source of truth in `provider_registry.py` and served by `GET /api/providers`, which is loaded via `loadProviderInfo()` in `provider-info.js:36–48`.
- The provider model-selection wizard shows a `ⓘ` popover with full privacy metadata (homepage, pricing URL, privacy URL, free-tier status, confidentiality flag) for each provider (`ui-core.js:1273–1305`, `provider-info.js:66–84`).

**Completeness gaps in the new badge:**

1. **Badge not updated on in-wizard provider change.** `setModel` (`ui-core.js:1743–1785`) calls `_refreshCopilotAuthStatus()` which only updates the pill state (authenticated/connecting), not the non-confidential badge. The badge is only updated via `updateAuthBadge` called from `fetchStatus` (`api-client.js:207–208`) or from `session-manager.js:575–576`. If the user selects a non-confidential provider in the wizard and closes it without the subsequent background `fetchStatus` completing, the badge may lag by one page-interaction cycle. At minimum `testCurrentModel` or `setModel` should call `updateAuthBadge` with the new provider.

2. **No first-use gate for non-confidential providers.** When the active provider is Groq or Gemini, the user has no confirmation prompt explaining that their CV text and job description will be transmitted to a provider that may review or retain that data. The `analyzeJob` function only shows a generic one-time LLM disclosure message (`job-analysis.js:99–101`): "Content you submit is sent to the configured LLM provider for analysis." — this fires once ever and does not repeat when the user later switches to a non-confidential provider. A per-provider-switch prompt or a distinct "Non-confidential provider — your data may be retained" acknowledgement on first use would close this gap.

3. **No positive "Data confidential" companion cue.** The badge is only visible when non-confidential (`confidential === false`). When the provider is confidential (Anthropic, OpenAI, GitHub Copilot, etc.), no badge appears — this is the correct secure-by-default UX, but it means the user cannot distinguish "confidential and the badge is intentionally absent" from "badge logic failed". A small green lock or a tooltip on the existing LLM status pill for confidential providers would make the disclosure complete in both directions.

4. **Badge title text references "provider settings" but badge click does not jump to privacy step.** The tooltip reads "see provider settings for details" but clicking opens the model wizard at step 1 (provider selection), not directly to the provider's privacy URL or a settings step that highlights the privacy information. The `ⓘ` popover on the wizard provider list is the right place for this, but the journey from seeing the amber pill to finding the privacy policy is multi-step.

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
| Non-confidential badge (US-C4 gap) | Badge present | 4 completeness sub-gaps | | | |

**Key evidence references:**

- US-C1.1: rewrite card type label — `web/rewrite-review.js:305`
- US-C1.1: LCS word-level diff — `web/rewrite-review.js:238–273`
- US-C1.1: diff CSS classes — `web/styles.css:1248–1249`
- US-C1.1: LLM attribution message — `web/rewrite-review.js:120`
- US-C1.1: LLM status pill — `web/index.html:55–61`, `web/ui-core.js:827–868`
- US-C1.2: weak skill_add badge — `web/rewrite-review.js:285–287`, `web/styles.css:1246`
- US-C1.2: skills verify-evidence badge — `web/skills-review.js:663–664`
- US-C1.2: persuasion warnings panel — `web/rewrite-review.js:141–173`
- US-C1.2: per-card persuasion badges — `web/rewrite-review.js:322–325`, `web/styles.css:1274–1276`
- US-C1.2: submit gate (pending + acknowledgement) — `web/rewrite-review.js:444–448`
- US-C1.3: submit button disabled on render — `web/rewrite-review.js:189`
- US-C1.3: two-step edit path — `web/rewrite-review.js:350–386`
- US-C1.3: anti-fabrication constraints — `scripts/utils/conversation_manager.py:402–477`
- US-C2.1: rewrite hard gate — `web/rewrite-review.js:444`
- US-C2.1: spell-check soft gate / bulk-ignore — `web/spell-check.js:414–415`
- US-C2.1: harvest opt-in unchecked default — `web/harvest.js:100–106`
- US-C2.1: auto-analysis on load — `web/app.js:89–95`
- US-C2.2: Accept/Edit/Reject buttons — `web/rewrite-review.js:328–330`
- US-C2.2: aria-pressed toggling — `web/rewrite-review.js:362–365`
- US-C2.2: tally bar — `web/rewrite-review.js:430–450`, `web/styles.css:1233–1237`
- US-C3.1: LCS diff — `web/rewrite-review.js:238–273`
- US-C3.1: diff update on edit — `web/rewrite-review.js:407`
- US-C3.2: rewrite rationale `<details>` — `web/rewrite-review.js:316–321`
- US-C3.2: keyword pills with rank — `web/rewrite-review.js:289–292`
- US-C3.2: LLM recommendation format mandate — `scripts/utils/conversation_manager.py:416–450`
- US-C3.2: model pricing transparency — `web/ui-core.js:1580–1661, 1849–1868`
- US-C3.2: settings source labels — `web/ui-core.js:67–100`
- US-C3.3: rewrite_audit rendering on Finalise tab — `web/finalise.js:180–222`
- US-C3.3: stale step visual indicators — `web/styles.css:156–163`
- Generated approval: approved_rewrites state — `scripts/utils/conversation_manager.py` state management
- US-C4 badge: HTML element — `web/index.html:59`
- US-C4 badge: display logic — `web/auth-provider.js:86–90`
- US-C4 badge: provider registry confidential fields — `scripts/utils/provider_registry.py:171, 190`
- US-C4 badge: triggered by fetchStatus → updateAuthBadge — `web/api-client.js:207–208`
- US-C4 badge: provider info popover — `web/provider-info.js:66–84`, `web/ui-core.js:1282–1305`
- US-C4 gap 2: generic one-time LLM disclosure — `web/job-analysis.js:99–101`
- US-C4 gap 2: provider_registry non-confidential entries — `scripts/utils/provider_registry.py:161–198`
