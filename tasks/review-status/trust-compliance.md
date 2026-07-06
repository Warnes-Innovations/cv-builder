<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-07-06 14:30 ET (source-verified full rewrite)

**Executive Summary:** Source-verified trust & compliance review against US-C1, US-C2, and US-C3. The rewrite-review workflow is strong: word-level diffs, explicit accept/edit/reject per card, a persuasion-warnings gate with per-card badges, rationale collapsibles, and a rewrite audit log are all present and correctly wired. Key gaps: (1) no explicit anti-fabrication instruction in the LLM system prompt — persuasion checks cover writing style but not invented metrics; (2) AI-assistance disclosure in generated documents defaults off with no contextual reminder at download time and resets per session; (3) the LLM data-transmission disclosure fires only once per browser and is not reset on provider change; (4) "Candidate to confirm" badge on the Rewrites tab is ambiguous vs. the clearer "Weak evidence" label on the Skills tab; (5) Harvest bullets carry no provenance badge distinguishing AI-accepted vs. user-edited text.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Proposed rewrites presented as suggestions | ✅ Pass | `rewrite-review.js:283–287`: heading "Review Text Improvements"; chat message frames them as AI suggestions to review before continuing. |
| Original + proposed shown via inline word diff | ✅ Pass | `rewrite-review.js:415–416,387–392`: LCS `computeWordDiff` + `renderDiffHtml` producing `<del class="diff-removed">` / `<ins class="diff-added">` per card. |
| Rationale & Evidence collapsible per card | ✅ Pass | `rewrite-review.js:433–438`: `<details class="rewrite-rationale">` with `r.rationale` and `r.evidence`. Falls back to italic "No rationale recorded" when absent. |
| Weak-evidence skill adds flagged in Rewrites tab | ✅ Pass | `rewrite-review.js:396–398`: `isWeakSkillAdd` guard; renders `<span class="weak-badge">⚠ Candidate to confirm</span>`. |
| Weak-evidence skills flagged in Skills tab | ✅ Pass | `skills-review.js:697,727–731`: `isCandidateToConfirm`; renders `⚠ Weak evidence` / `⚠ Verify evidence` badge with tooltip showing evidence text. |
| AI-suggested skills (not in master CV) distinguished | ✅ Pass | `skills-review.js:725`: amber `⚠ Not in CV profile` badge. Tooltip: "Recommended by AI … not currently in your master CV." |
| Persuasion warnings surfaced as panel + per-card badges | ✅ Pass | `rewrite-review.js:231–262`: red panel with per-flag-type breakdown and "Acknowledged" button. `rewrite-review.js:441–443`: per-card `persuasion-badge` overlays. |
| "Candidate to confirm" wording clarity | ⚠️ Partial | `rewrite-review.js:398`: "candidate" is ambiguous (the job applicant? the skill?). Skills tab uses clearer "Weak evidence" (`skills-review.js:731`). Rewrites tab badge lacks a tooltip. Meaning ("verify before including") is not immediate. |
| System prompt contains explicit anti-fabrication instruction | ❌ Fail | `conversation_manager.py:424–495`: system prompt defines recommendation structure and confidence levels but contains no explicit instruction to restrict rewrites to facts in master data, avoid inventing metrics, or flag hallucinated claims. Persuasion checks (`run_persuasion_checks`, lines 1349–1428) cover style (verb strength, passive voice, word count) only. |

---

### US-C2: User Approval Integrity

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Submit button blocked until all rewrite decisions made | ✅ Pass | `rewrite-review.js:598–605`: `submitBtn.disabled = (pending > 0) \|\| needsAck`. Pending count updated by `updateRewriteTally()`. |
| Persuasion-acknowledgement gate on submission | ✅ Pass | `rewrite-review.js:609–615`: `submitRewriteDecisions()` opens custom confirm dialog if `!persuasionWarningsAcknowledged`. |
| Accept / Edit / Reject paths visually distinct | ✅ Pass | `rewrite-review.js:446–448`: three `rw-btn` buttons with distinct labels; `aria-pressed` maintained; decision badges per card. Edit path requires explicit Save click (`rewrite-review.js:484–485`) before decision is recorded. |
| Unreviewed customizations warn before generating rewrites | ✅ Pass | `app.js:127–141`: "X experience entries / Y skills not individually reviewed — the AI's recommendation will be used. Proceed anyway?" |
| Customization warn uses native window.confirm (suppressible) | ⚠️ Partial | `app.js:138`: uses `window.confirm()` not the custom `confirmDialog()` available in `ui-core.js:375`. Browsers can suppress `window.confirm` after "Prevent this page from creating additional dialogs," silently passing the gate. |
| Skills default to "include" without explicit user selection | ⚠️ Partial | `skills-review.js:704`: `defaultAction = userSelections.skills[skillName] \|\| 'include'`. Same pattern in `experience-review.js:221`. AI-recommended items are pre-selected "include" — no explicit decision required before proceeding past the soft gate. |
| Harvest items start unchecked (opt-in only) | ✅ Pass | `harvest.js:103,107–108`: comment "All harvest items start unchecked — master CV updates are opt-in only (US-A11)". `shouldPreCheck` always returns `false`. |
| Master CV write-back requires explicit confirmation | ✅ Pass | `harvest.js:503–506`: `confirmDialog(...)` or `window.confirm(...)` before promoting items to `Master_CV_Data.json`. |
| Cold-restore of prior rewrite decisions is disclosed | ✅ Pass | `rewrite-review.js:69–72,93–95`: toast "Your previous rewrite decisions have been restored — you can still change them." fires on both localStorage and cold-restore paths. `_restoreToastShown` prevents duplicate toasts. |

---

### US-C3: Provenance and Audit Cues

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Word-level diff for text rewrites | ✅ Pass | `rewrite-review.js:349–393`: LCS `computeWordDiff` + `renderDiffHtml`; original preserved in `data-original` attribute (`rewrite-review.js:428`). |
| Rewrite Audit Log in Rewrites tab | ✅ Pass | `rewrite-review.js:182–216`: `_renderRewriteAuditLog()` renders a collapsible "Rewrite Audit Log" with original / proposed / outcome per decision. |
| Rewrite Audit Log in Finalise tab | ✅ Pass | `finalise.js:216–259`: separate `_renderRewriteAuditLog()` fetches `/api/rewrites` and renders full audit table. |
| Session decisions persisted across reloads | ✅ Pass | `rewrite-review.js:50–54`: `_persistDecisions()` writes to `localStorage`; `rewrite-review.js:78–99`: cold-restore from `_backendRewriteAudit`. |
| Rationale exposed per rewrite card | ⚠️ Partial | `rewrite-review.js:433–438`: rendered only when `r.rationale` is truthy. When absent, section disappears silently with no "not available" indicator. |
| Layout-freshness chip tracks content staleness | ✅ Pass | `state-manager.js:120–178`: `getLayoutFreshnessFromState()` returns "Layout current" / "Layout outdated" / "Files outdated"; chip shown in position bar (`index.html:100`). |
| Harvest candidates show before/after | ✅ Pass | `harvest.js:170–178`: "Before" and "After" labelled blocks with colour-coded left borders. |
| Harvest bullets carry provenance badge (AI-accepted vs. user-edited) | ⚠️ Partial | `harvest.js:41–44`: `HARVEST_SOURCE_BADGE` distinguishes `new_skill` (🆕 Added), `skill_gap_confirmed` (✅ Confirmed), `skill_type_update` (🏷️ Reclassified). Improved bullets (`improved_bullet` type) carry **no badge** indicating whether the final text was AI-proposed+accepted, AI-proposed+user-edited, or user-written from scratch. The rewrite audit records this (`outcome: 'accept' \| 'edit'`) but it is not surfaced on the Harvest card. |

---

## Generated Materials Evaluation

### AI Disclosure in Generated Documents

| Finding | Status | Evidence |
| --- | --- | --- |
| AI-assistance disclosure available in generated documents | ✅ Pass | `cv_orchestrator.py:4973,4983`: when `ai_attribution` is true, adds "Generated with AI assistance" to document footer (8pt italic) and sets `core_properties.subject/keywords`. ATS DOCX: `cv_orchestrator.py:3986–3988`. |
| Disclosure is opt-in, default off | ⚠️ Partial | `ui-core.js:188`: checkbox seeded from server `generation.ai_attribution`. No hardcoded default of True in `web_app.py:146`. UI label at `index.html:648–650` reads "Add AI-assistance disclosure … for contexts requiring disclosure" — correct wording but completely hidden inside ⚙️ Settings with no contextual reminder at document generation or download time. |
| Disclosure persists across sessions | ⚠️ Partial | `ui-core.js:211–213`: `ai_attribution` read from per-session status, not `config.yaml`. Enabling it in session A does not carry over to session B. |
| AI disclosure visible to document recipient | 🔲 Not Implemented | Disclosure is placed in document footer (8pt, light-grey italic) and Word metadata — both easily overlooked. No cover-page watermark, body statement, or prominent recipient-facing notice is implemented. Whether this is required depends on context; the tool correctly leaves it as user choice, but the implementation is minimal. |

### Content Factual Integrity

| Finding | Status | Evidence |
| --- | --- | --- |
| Persuasion-check framework active | ✅ Pass | `conversation_manager.py:1349–1428`: 8 heuristic checks (action verbs, passive voice, word count, result clause, hedging, named institution, CAR structure, generic phrases) applied post-hoc. |
| System prompt prohibits fabricating facts | ❌ Fail | `conversation_manager.py:424–495`: no explicit instruction not to invent metrics, titles, or achievements absent from master data. |
| Persuasion checks cover fabricated metrics / quantification inflation | 🔲 Not Implemented | The 8 persuasion checks do not include comparison of quantified claims between `r.original` and `r.proposed`. A rewrite changing "improved efficiency" to "improved efficiency by 40%" passes all checks without a flag. |
| User warned when rewrite introduces a new quantified claim | 🔲 Not Implemented | No diff-level analysis of numeric/percentage additions in proposed text. |

---

## Data Handling & Provider Transparency

| Finding | Status | Evidence |
| --- | --- | --- |
| Non-confidential badge shown for providers that may review data | ✅ Pass | `index.html:59`: `llm-non-confidential-badge` shown unless `info.confidential === true`. `auth-provider.js:86–91`: default is non-confidential (fail-safe). |
| Provider privacy URLs surfaced in model-selector popover | ✅ Pass | `provider-info.js:72–75`: `privacy_url` rendered as "Privacy policy" link. `provider_registry.py:53,76,99,140,159,178,197`: URLs populated for all known providers. |
| LLM data-transmission disclosure fires to user | ⚠️ Partial | `job-analysis.js:99–101`: fires once (`LLM_DISCLOSURE_SHOWN` key set). Not reset on provider change. A user switching from a confidential provider (GitHub Copilot) to a non-confidential one (Gemini free tier) receives no re-disclosure. |
| Session data stored only locally | — N/A | Architectural: local Flask server; session JSON stays on disk. Only external transmission is to the configured LLM provider API. Provider badge system handles the user-facing aspect of this correctly. |
| Credential / API key storage transparent | ✅ Pass | `ui-core.js:976–1013`: "Source" label shown per key (env var, .env, config.yaml). Locked-source amber banner when env/dotenv override is active. |

---

## Terminology Audit

| Term | Location | Issue |
| --- | --- | --- |
| "Candidate to confirm" | `rewrite-review.js:398` | Ambiguous: reads as "the applicant is a candidate." Better: "⚠ Verify before including" or "⚠ Needs confirmation." The Skills tab correctly says "Weak evidence" — inconsistent. |
| "Persuasion checks" / "Persuasion warnings" | `rewrite-review.js:247`, `validators.js:64` | Developer-facing jargon. "Persuasion" is not obviously meaningful to users. "Writing quality checks" or "Content quality warnings" would be clearer. |
| "Harvest" | `index.html:146`, `harvest.js` | Clever metaphor, but opaque to first-time users. Step-tooltip clarifies on hover; consider a visible sub-label: "🌾 Harvest (Save back to Master CV)." |
| "AI attribution" vs. "AI-assistance disclosure" | `index.html:648`, `ui-core.js` | The checkbox label says "Add AI-assistance disclosure" but the setting key is `ai_attribution`. Pick one term for consistency. |
| "Non-confidential" badge | `index.html:59` | Provider-registry jargon. Tooltip says "Data may be reviewed or retained" — that phrase is clearer than "Non-confidential" and should be the badge label instead. |
| "Rewrite Audit Log" | `rewrite-review.js:212` | Accurate but developer-centric. "Change History" or "Decision Log" is more user-facing. |

---

## Additional Story Gaps / Proposed Story Items

1. **US-C4 (Proposed): Anti-Fabrication Safeguard in Rewrites** — The LLM system prompt contains no instruction to restrict rewrites to facts present in the master data. Persuasion checks cover style, not factual inflation. Proposed acceptance criterion: any rewrite that introduces a quantified claim or named entity not in `r.original` must receive a "New claim — verify accuracy" persuasion badge.

2. **US-C5 (Proposed): Persistent AI Disclosure Setting** — `ai_attribution` is per-session and resets on new sessions. Proposed: persist as a global default in `config.yaml` with per-session override.

3. **US-C6 (Proposed): Contextual Disclosure Reminder at Generation Time** — The AI-assistance disclosure option is buried in Settings. Proposed: one-line reminder banner on the "File Review" tab if `ai_attribution` is off, e.g. "Some contexts require disclosing AI assistance — enable in Settings if applicable."

4. **US-C7 (Proposed): Re-disclosure on Provider Change** — `LLM_DISCLOSURE_SHOWN` is never reset. Proposed: re-show the disclosure when the user switches to a provider where `confidential !== true`.

5. **US-C8 (Proposed): Harvest Provenance Badge for Improved Bullets** — Bullets promoted via Harvest carry no badge indicating whether the final text was AI-accepted, AI-edited, or user-written. The rewrite audit records `outcome: 'accept' | 'edit'` — this should be surfaced on the Harvest card as a source badge.

6. **US-C9 (Proposed): Terminology Consistency — Weak Evidence** — "Candidate to confirm" (Rewrites tab) and "Weak evidence" (Skills tab) describe the same concept. These should use the same term across both surfaces.

7. **US-C10 (Proposed): Rationale Completeness Guarantee** — When `r.rationale` is absent, the rewrite card shows no section at all. Proposed: always render the section with a visible fallback: "No detailed rationale was generated for this change."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

**Additional files consulted:** web/rewrite-review.js, web/skills-review.js, web/harvest.js, web/finalise.js, web/provider-info.js, web/auth-provider.js, web/job-analysis.js, scripts/utils/cv_orchestrator.py, scripts/utils/provider_registry.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-C1 Transparent AI Suggestions | 6 | 1 | 1 | 0 | 0 |
| US-C2 User Approval Integrity | 4 | 2 | 0 | 0 | 0 |
| US-C3 Provenance and Audit Cues | 4 | 2 | 0 | 0 | 0 |
| Generated Materials — AI Disclosure | 1 | 2 | 0 | 1 | 1 |
| Generated Materials — Factual Integrity | 1 | 0 | 1 | 2 | 0 |
| Data Handling & Provider Transparency | 3 | 1 | 0 | 0 | 1 |

**Key evidence references:**

- US-C1 word diff: `web/rewrite-review.js:349–393`
- US-C1 weak-evidence badge: `web/skills-review.js:727–731`, `web/rewrite-review.js:396–398`
- US-C1 AI-suggested skill badge: `web/skills-review.js:725`
- US-C1 anti-fabrication gap: `scripts/utils/conversation_manager.py:424–495`
- US-C2 submit gate: `web/rewrite-review.js:598–605`
- US-C2 window.confirm suppressibility: `web/app.js:138`
- US-C2 default include: `web/skills-review.js:704`, `web/experience-review.js:221`
- US-C2 harvest opt-in: `web/harvest.js:103,107–108`
- US-C3 audit log Rewrites tab: `web/rewrite-review.js:182–216`
- US-C3 audit log Finalise tab: `web/finalise.js:216–259`
- US-C3 harvest no bullet provenance badge: `web/harvest.js:41–44`
- AI disclosure setting: `web/index.html:647–649`, `web/ui-core.js:188,211–213`
- AI disclosure in document: `scripts/utils/cv_orchestrator.py:4973,4983`
- Data disclosure one-time: `web/job-analysis.js:99–101`
- Non-confidential badge: `web/index.html:59`, `web/auth-provider.js:86–91`
- Provider privacy URLs: `web/provider-info.js:72–75`, `scripts/utils/provider_registry.py:53,76,99`

**Evidence standard:** Every conclusion supported by file:line evidence from direct source reading. tasks/gaps.md and tasks/ui-review.md were not consulted.
