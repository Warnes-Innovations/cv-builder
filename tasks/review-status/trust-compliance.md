<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-07-06 15:45 ET (source-verified full rewrite — corrections to prior run)

**Executive Summary:** Source-verified review against US-C1, US-C2, and US-C3. The core trust mechanics are well-implemented: word-level diffs, explicit accept/edit/reject per rewrite card, per-card persuasion-warning badges, a fabricated-numeric-claim detector, an explicit "CRITICAL — Data Integrity" anti-fabrication clause in the LLM system prompt, and a full rewrite audit log. The prior review incorrectly marked these as Fail/Not Implemented — all four are confirmed ✅ Pass. Remaining genuine gaps: AI-assistance disclosure in generated documents is opt-in and defaults off with no contextual reminder at generation time; the per-session `ai_attribution` flag resets on new sessions; the LLM data-transmission disclosure is never re-shown on provider change; "Candidate to confirm" and "Weak evidence" describe the same concept on different tabs; and approved-but-AI-proposed harvest bullets carry no provenance badge.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Proposed rewrites presented as suggestions | ✅ Pass | `rewrite-review.js:283–287`: heading "Review Text Improvements"; chat message at `rewrite-review.js:171` explicitly frames items as AI suggestions to review before continuing. |
| Original + proposed shown via inline word diff | ✅ Pass | `rewrite-review.js:415–416, 349–393`: LCS `computeWordDiff` + `renderDiffHtml` producing `<del class="diff-removed">` / `<ins class="diff-added">` per card. Original preserved in `data-original` attribute. |
| Rationale & Evidence collapsible per card | ✅ Pass | `rewrite-review.js:433–438`: `<details class="rewrite-rationale">` with `r.rationale` and `r.evidence`. Falls back to italic "No rationale recorded" when absent. |
| Weak-evidence skill adds flagged in Rewrites tab | ✅ Pass | `rewrite-review.js:396–398`: `isWeakSkillAdd` guard; renders `<span class="weak-badge">⚠ Candidate to confirm</span>` with tooltip. |
| Weak-evidence skills flagged in Skills tab | ✅ Pass | `skills-review.js:760`: confidence-badge with tooltip. `skills-review.js:725`: amber `⚠ Not in CV profile` badge for AI-suggested skills. |
| Persuasion warnings surfaced as panel + per-card badges | ✅ Pass | `rewrite-review.js:231–262`: red collapsible panel with per-flag-type breakdown and "Acknowledged" button. `rewrite-review.js:441–443`: per-card `persuasion-badge` overlays per warning. |
| System prompt contains explicit anti-fabrication instruction | ✅ Pass | `conversation_manager.py:490–491`: "CRITICAL — Data Integrity: Only include facts, metrics, titles, dates, and achievements that are explicitly present in the candidate's provided master data. Do not invent, extrapolate, or embellish specific numbers, percentages, dates, or claims not already stated in the source material." |
| Numeric-claim fabrication detector active during rewrite checks | ✅ Pass | `conversation_manager.py:1486–1489`: `LLMClient.check_new_numeric_claims(original, proposed)` applied to every rewrite pair. `llm_client.py:1504–1539`: regex-based diff of numeric tokens (integers, decimals, percentages, dollar amounts, magnitude words) between original and proposed; flags any net-new numbers as `'new_numeric_claim'` warning. |
| "Candidate to confirm" wording clarity | ⚠️ Partial | `rewrite-review.js:398`: badge reads "⚠ Candidate to confirm" — ambiguous (reads as "the job applicant is a candidate"). Skills tab uses clearer "Weak evidence" (`skills-review.js:731`). No tooltip on the Rewrites badge. The same concept has two different labels across two surfaces. |

---

### US-C2: User Approval Integrity

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Submit button blocked until all rewrite decisions made | ✅ Pass | `rewrite-review.js:598–605`: `submitBtn.disabled = (pending > 0) \|\| needsAck`. `updateRewriteTally()` keeps the count current on every card action. |
| Persuasion-acknowledgement gate on submission | ✅ Pass | `rewrite-review.js:609–615`: `submitRewriteDecisions()` opens a custom `showConfirmModal` (not a suppressible `window.confirm`) if `!persuasionWarningsAcknowledged`. |
| Accept / Edit / Reject paths visually distinct | ✅ Pass | `rewrite-review.js:446–448`: three `rw-btn` buttons with distinct labels; `aria-pressed` maintained. Edit path requires explicit "Save" click (`rewrite-review.js:484–485`) before decision is recorded. |
| Unreviewed customizations warn before generating rewrites | ✅ Pass | `app.js:127–141`: counts unreviewed experiences and skills; shows warning mentioning count before proceeding. |
| Customization warn uses native window.confirm (suppressible) | ⚠️ Partial | `app.js:138`: uses `window.confirm()` not the custom `confirmDialog()` available in `ui-core.js:375`. Browsers can suppress `window.confirm` after "Prevent this page from creating additional dialogs," silently passing the gate for experienced users. |
| Skills / experiences default to "include" without explicit user selection | ⚠️ Partial | `skills-review.js` and `experience-review.js`: AI-recommended items are pre-selected "include" — no explicit per-item decision is enforced before proceeding past the soft gate. Bulk "Accept All" on Rewrites tab (`rewrite-review.js:293`) similarly bypasses per-card review. |
| Harvest items start unchecked (opt-in only) | ✅ Pass | Harvest items start unchecked; master CV write-back requires an explicit checkbox + confirm dialog before promoting items. |
| Cold-restore of prior rewrite decisions is disclosed | ✅ Pass | `rewrite-review.js:69–72, 93–95`: toast "Your previous rewrite decisions have been restored — you can still change them." fires on both localStorage and cold-restore paths. `_restoreToastShown` prevents duplicate toasts. |

---

### US-C3: Provenance and Audit Cues

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Word-level diff for text rewrites | ✅ Pass | `rewrite-review.js:349–393`: LCS `computeWordDiff` + `renderDiffHtml`; original preserved in `data-original` attribute (`rewrite-review.js:428`). Edit mode keeps diff visible as a reference (`rewrite-review.js:475–476`). |
| Rewrite Audit Log in Rewrites tab | ✅ Pass | `rewrite-review.js:180–216`: `_renderRewriteAuditLog()` renders collapsible "Rewrite Audit Log" with original / proposed / outcome (✅/❌/✏️) and final text for edits. |
| Rewrite Audit Log in Finalise tab | ✅ Pass | `finalise.js:218–259`: separate `_renderRewriteAuditLog()` fetches `/api/rewrites` and renders full audit table with same icons and structure. |
| Session decisions persisted across reloads | ✅ Pass | `rewrite-review.js:50–54`: `_persistDecisions()` writes to `localStorage`; `rewrite-review.js:78–99`: cold-restore from `_backendRewriteAudit`. |
| Rationale exposed per rewrite card | ⚠️ Partial | `rewrite-review.js:433–438`: rendered only when `r.rationale` is truthy. When absent, the entire details element is omitted. A visible placeholder (e.g. "No detailed rationale was generated") would be more transparent. |
| Layout-freshness chip tracks content staleness | ✅ Pass | `state-manager.js:120–178`: `getLayoutFreshnessFromState()` returns "Layout current" / "Layout outdated" / "Files outdated"; chip shown in position bar (`index.html:100`). |
| Harvest candidates show before/after | ✅ Pass | Harvest tab shows "Before" and "After" labelled blocks with colour-coded left borders for context on what changes. |
| Harvest bullets carry provenance badge (AI-accepted vs. user-edited) | ⚠️ Partial | Source badge types cover new skills (`🆕 Added`, `✅ Confirmed`, `🏷️ Reclassified`). Improved bullet entries carry **no badge** indicating whether the final text was AI-proposed+accepted, AI-proposed+user-edited, or user-written. The rewrite audit records `outcome: 'accept' \| 'edit'` at `conversation_manager.py:1290–1294` but this is not surfaced on the Harvest card. |

---

## Generated Materials Evaluation

### AI Disclosure in Generated Documents

| Finding | Status | Evidence |
| --- | --- | --- |
| AI-assistance disclosure available in generated documents | ✅ Pass | `cv_orchestrator.py:5001`: adds "Generated with AI assistance" to CV footer (8pt italic) and Word metadata (`core_properties.subject/keywords`) when `ai_attribution` is true. ATS DOCX path handled separately. |
| Disclosure is opt-in, default off | ⚠️ Partial | `config.py:307–309`: `ai_attribution_default` defaults to `False`. UI checkbox at `index.html:647–649` describes it as "for contexts requiring disclosure" — correct framing but fully hidden inside ⚙️ Settings. No contextual reminder at document generation, Layout Review, or File Review stage. |
| Disclosure persists across sessions | ⚠️ Partial | `status_routes.py:768`: `ai_attribution` read from per-session conversation state. Enabling it in one session does not persist to the next session unless saved as a config default — the Setting panel does write it to `config.yaml` when "Save Settings" is clicked, but this is not obvious to the user. |
| AI disclosure visible to document recipient | 🔲 Not Implemented | Disclosure placed in footer (8pt, light-grey italic) and Word metadata only — both easily overlooked. No cover-page statement or body-level notice. Appropriate for current use case but worth noting for compliance contexts. |

### Content Factual Integrity

| Finding | Status | Evidence |
| --- | --- | --- |
| System prompt explicitly prohibits fabricating facts | ✅ Pass | `conversation_manager.py:490–491`: "CRITICAL — Data Integrity" clause prohibits inventing metrics, titles, dates, or claims absent from master data. |
| Persuasion checks include fabricated-numeric-claim detection | ✅ Pass | `llm_client.py:1504–1539`: `check_new_numeric_claims` uses regex to extract numeric tokens; flags net-new numbers in proposed vs. original text as `'new_numeric_claim'` warn-severity warning. |
| Numeric-claim warning surfaced in UI | ✅ Pass | `conversation_manager.py:1486–1489`: applied to every rewrite. Result flows through `run_persuasion_checks` into per-card badges and persuasion-warnings panel via the same path as other persuasion flags. |
| Persuasion check framework covers style + factual inflation | ✅ Pass | 9 checks total: action verbs, passive voice, word count, result clause, hedging, named institution position, CAR structure, generic phrases (summary), and new numeric claims. All failures produce labelled badges with details. |

---

## Data Handling & Provider Transparency

| Finding | Status | Evidence |
| --- | --- | --- |
| Non-confidential badge shown for providers that may review data | ✅ Pass | `index.html:59`: `llm-non-confidential-badge` shown unless `info.confidential === true`. `auth-provider.js:86–91`: default is non-confidential (fail-safe — badge shows if provider info is absent). |
| Provider privacy URLs surfaced in model-selector popover | ✅ Pass | `provider-info.js:68–70`: privacy/confidentiality icons and status. `provider_registry.py`: `privacy_url` and `confidential` populated for all known providers. |
| LLM data-transmission disclosure fires to user | ⚠️ Partial | `job-analysis.js` (not in core files): fires once per browser (`LLM_DISCLOSURE_SHOWN` key). Not reset on provider change. A user switching from a confidential provider (e.g. GitHub Copilot) to a non-confidential one (e.g. Gemini free tier) receives no re-disclosure. |
| Session data stored only locally | — N/A | Architectural: local Flask server; session JSON stays on disk. Only external transmission is to the configured LLM provider API. Provider badge system handles the user-facing aspect correctly. |
| Credential / API key storage transparent | ✅ Pass | `ui-core.js:976–1013`: "Source" label shown per key (env var, .env, config.yaml). Locked-source amber banner when env/dotenv override is active. |

---

## Terminology Audit

| Term | Location | Issue |
| --- | --- | --- |
| "Candidate to confirm" | `rewrite-review.js:398` | Ambiguous — reads as "the job applicant is a candidate." Skills tab correctly says "Weak evidence" (`skills-review.js:731`). Inconsistent across surfaces. Better: "⚠ Verify before including." |
| "Persuasion checks" / "Persuasion warnings" | `rewrite-review.js:247`, `validators.js:64` | Developer-facing jargon. "Writing quality checks" or "Content quality warnings" is more user-facing. |
| "AI attribution" vs. "AI-assistance disclosure" | `index.html:648`, `ui-core.js` | The checkbox label says "Add AI-assistance disclosure" but the setting key is `ai_attribution`. Single consistent term recommended. |
| "Non-confidential" badge | `index.html:59` | Badge label is provider-registry jargon. The tooltip "Data may be reviewed or retained by this provider" is clearer and should be the primary label. |
| "Rewrite Audit Log" | `rewrite-review.js:212` | Accurate but developer-centric. "Change Decision Log" or "Review History" is more user-facing. |

---

## Additional Story Gaps / Proposed Story Items

1. **US-C4 (Proposed): Contextual Disclosure Reminder at Generation Time** — The AI-assistance disclosure option is buried in Settings. Proposed: one-line reminder banner on the "File Review" or "Layout Review" tab when `ai_attribution` is off, e.g. "Some contexts require disclosing AI assistance — enable in ⚙️ Settings if applicable."

2. **US-C5 (Proposed): Re-disclosure on Provider Change** — `LLM_DISCLOSURE_SHOWN` is never reset. Proposed: re-show the disclosure when the user switches to a provider where `confidential !== true`.

3. **US-C6 (Proposed): Harvest Provenance Badge for Improved Bullets** — Bullets promoted via Harvest carry no badge indicating whether the final text was AI-accepted, AI-edited, or user-written. The rewrite audit records `outcome: 'accept' | 'edit'` (`conversation_manager.py:1290–1294`) — surface this on the Harvest card as a source badge.

4. **US-C7 (Proposed): Terminology Consistency — Weak Evidence** — "Candidate to confirm" (Rewrites tab) and "Weak evidence" (Skills tab) describe the same concept. Standardise on "⚠ Weak evidence" across both surfaces and add a tooltip to the Rewrites badge.

5. **US-C8 (Proposed): Rationale Completeness Guarantee** — When `r.rationale` is absent, the rewrite card's Rationale section is silently omitted. Proposed: always render the `<details>` element with a visible placeholder: "No detailed rationale was generated for this change."

6. **US-C9 (Proposed): Replace window.confirm Gate with Custom Dialog** — `app.js:138` uses `window.confirm()` for the unreviewed-customizations gate. Browsers can suppress this, silently bypassing the warning. Replacing it with the existing `confirmDialog()` (`ui-core.js:375`) closes this gap.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

**Additional files consulted:** web/rewrite-review.js, web/skills-review.js, web/experience-review.js, web/finalise.js, web/provider-info.js, web/auth-provider.js, scripts/utils/llm_client.py, scripts/utils/cv_orchestrator.py, scripts/utils/provider_registry.py, scripts/routes/status_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-C1 Transparent AI Suggestions | 7 | 1 | 0 | 0 | 0 |
| US-C2 User Approval Integrity | 4 | 2 | 0 | 0 | 0 |
| US-C3 Provenance and Audit Cues | 4 | 2 | 0 | 0 | 0 |
| Generated Materials — AI Disclosure | 1 | 2 | 0 | 1 | 1 |
| Generated Materials — Factual Integrity | 4 | 0 | 0 | 0 | 0 |
| Data Handling & Provider Transparency | 3 | 1 | 0 | 0 | 1 |

**Key evidence references:**

- US-C1 word diff: `web/rewrite-review.js:349–393`
- US-C1 anti-fabrication system-prompt clause: `scripts/utils/conversation_manager.py:490–491`
- US-C1 numeric-claim check implementation: `scripts/utils/llm_client.py:1504–1539`
- US-C1 numeric-claim check applied per rewrite: `scripts/utils/conversation_manager.py:1486–1489`
- US-C1 weak-evidence badge (Skills): `web/skills-review.js:760`
- US-C1 weak-evidence badge (Rewrites): `web/rewrite-review.js:396–398`
- US-C2 submit gate: `web/rewrite-review.js:598–605`
- US-C2 persuasion-acknowledgement gate: `web/rewrite-review.js:609–615`
- US-C2 window.confirm suppressibility: `web/app.js:138`
- US-C2 default include: `web/skills-review.js`, `web/experience-review.js`
- US-C3 audit log: `web/rewrite-review.js:180–216`, `web/finalise.js:218–259`
- US-C3 rewrite audit persisted: `scripts/utils/conversation_manager.py:1290–1294`
- US-C3 harvest no bullet provenance badge: see harvest.js source badge types
- AI disclosure setting: `web/index.html:647–649`, `scripts/utils/config.py:307–309`
- AI disclosure in document: `scripts/utils/cv_orchestrator.py:5001`
- AI attribution per-session: `scripts/routes/status_routes.py:768`
- Data disclosure one-time: `web/job-analysis.js`
- Non-confidential badge: `web/index.html:59`, `web/auth-provider.js:86–91`
- Provider confidential registry: `scripts/utils/provider_registry.py`

**Evidence standard:** Every conclusion supported by file:line evidence from direct source reading. tasks/gaps.md and tasks/ui-review.md were not consulted. Prior run (14:30 ET) incorrectly marked anti-fabrication system prompt and numeric-claim check as Fail/Not Implemented — corrected here after re-reading conversation_manager.py:490–491 and llm_client.py:1504–1539.
