<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-07-06 (source-verified full rewrite — corrections to cycle-91 run)

**Evidence standard:** Every conclusion supported by file:line evidence from direct source reading. tasks/gaps.md and tasks/ui-review.md were NOT consulted.

**Corrections to prior run (2026-07-06 15:45 ET):**

1. **Harvest provenance badges are IMPLEMENTED** — prior run incorrectly marked as "no badge." `harvest.js:140–146` shows `renderProvenanceBadge()` which renders "🤖 AI accepted" / "✏️ User-edited" for `improved_bullet` and `summary_variant` candidates.
2. **Disclosure key IS provider-scoped** — prior run said "Not reset on provider change." `api-client.js:31–34` shows `disclosureKey(provider)` produces `cv-builder-llm-disclosure-shown-{provider}`, so switching providers DOES re-trigger the disclosure.
3. **NEW gap identified** — cover letter system prompt (`master_data_routes.py:1691`) has no anti-fabrication instruction. The base `conversation_manager.py:490–491` clause is not in scope for cover letter LLM calls (different code path).

**Executive Summary:** Core trust mechanics are solid: word-level diffs, explicit accept/edit/reject gating, persuasion-warning panels and per-card badges, fabricated-numeric-claim detector, the "CRITICAL — Data Integrity" anti-fabrication clause in the main system prompt, full rewrite audit logs, and correctly implemented harvest provenance badges. Remaining genuine gaps: (1) cover letter system prompt lacks an anti-fabrication instruction; (2) LLM disclosure fires only at `analyzeJob()` — cover letter, harvest analysis, screening, and spell-check operations receive no disclosure; (3) AI-attribution disclosure in generated documents is opt-in, defaults off, and no contextual reminder appears at generation time; (4) "Candidate to confirm" and "Weak evidence" describe the same concept on different surfaces; (5) unreviewed-customizations gate uses suppressible `window.confirm` instead of the custom `confirmDialog`.

---

## Application Evaluation

### US-C1: Transparent AI Suggestions

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Proposed rewrites presented as AI suggestions | ✅ Pass | `rewrite-review.js:171`: chat message explicitly frames items as AI suggestions. Rewrites panel heading reads "Review Text Improvements." |
| Original + proposed shown via inline word diff | ✅ Pass | `rewrite-review.js:349–393`: LCS `computeWordDiff` + `renderDiffHtml` produces `<del class="diff-removed">` / `<ins class="diff-added">` per card. Original preserved in `data-original` attribute. |
| Rationale & evidence collapsible per card | ✅ Pass | `rewrite-review.js:433–438`: `<details class="rewrite-rationale">` with `r.rationale` and `r.evidence`. Silently omitted when absent (see Partial below). |
| Weak-evidence skill adds flagged (Rewrites tab) | ✅ Pass | `rewrite-review.js:396–398`: `isWeakSkillAdd` guard renders `<span class="weak-badge">⚠ Candidate to confirm</span>`. |
| Weak-evidence skills flagged (Skills tab) | ✅ Pass | `skills-review.js:725, 760`: amber "⚠ Not in CV profile" badge for AI-suggested skills with confidence-based tooltip. |
| Persuasion warnings surfaced as panel + per-card badges | ✅ Pass | `rewrite-review.js:231–262`: red collapsible panel with per-flag-type breakdown. Per-card `persuasion-badge` overlay for each warning. |
| System prompt contains explicit anti-fabrication instruction | ✅ Pass | `conversation_manager.py:490–491`: "CRITICAL — Data Integrity: Only include facts, metrics, titles, dates, and achievements that are explicitly present in the candidate's provided master data. Do not invent, extrapolate, or embellish specific numbers…" |
| Anti-fabrication instruction in rewrite proposals | ✅ Pass | `llm_client.py:1958`: "4. Only substitute terminology — do NOT fabricate experience, achievements, or roles." |
| Anti-fabrication instruction in cover letter generation | ❌ Fail | `master_data_routes.py:1691`: system message is `'You write tailored, professional cover letters. Return only the letter body text.'` — no fabrication constraint. The user prompt says "Reference concrete skills and achievements from the candidate profile" (positive instruction) but no explicit "do not invent" clause. Cover letter is a high-stakes output: fabricated claims in this document could reach employers. |
| Numeric-claim fabrication detector | ✅ Pass | `conversation_manager.py:1486–1489`: `LLMClient.check_new_numeric_claims(original, proposed)` applied per rewrite pair. `llm_client.py:1504–1539`: regex extraction of numeric tokens; flags net-new numbers as `new_numeric_claim` warn-severity. |
| LLM disclosure fires at job analysis | ✅ Pass | `job-analysis.js:99–108`: reads current provider from `TAB_DATA`, builds provider-scoped key via `disclosureKey(provider)`, checks localStorage, appends disclosure notice if absent. |
| disclosureKey correctly scoped by provider | ✅ Pass | `api-client.js:31–34`: `disclosureKey(provider)` returns `cv-builder-llm-disclosure-shown-${provider || 'unknown'}`. Switching providers resets the disclosure for that provider. |
| LLM disclosure fires at all LLM operations | ⚠️ Partial | Disclosure fires only in `analyzeJob()`. Cover letter generation (`master_data_routes.py:1563`), harvest analysis (`generation_routes.py:2302`), screening, and spell-check operations never trigger any notice. Users who run these features without first running job analysis receive no disclosure. |
| "Candidate to confirm" vs. "Weak evidence" consistency | ⚠️ Partial | `rewrite-review.js:398`: badge reads "⚠ Candidate to confirm" — ambiguous ("the applicant is a candidate"). `skills-review.js:731`: correctly says "Weak evidence." Same concept, two labels. No tooltip on the Rewrites badge to clarify. |
| Rationale rendered when absent | ⚠️ Partial | When `r.rationale` is falsy, the entire `<details>` element is silently omitted. A visible placeholder ("No detailed rationale was generated") would be more transparent. |

---

### US-C2: User Approval Integrity

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Submit button disabled until all rewrite decisions made | ✅ Pass | `rewrite-review.js:598–605`: `submitBtn.disabled` set true when `pending > 0` or persuasion acknowledgement is missing. `updateRewriteTally()` runs on every card action. |
| Persuasion-acknowledgement gate on submission | ✅ Pass | `rewrite-review.js:609–615`: `submitRewriteDecisions()` opens `showConfirmModal` (not suppressible) if `!persuasionWarningsAcknowledged`. |
| Accept / Edit / Reject paths visually distinct | ✅ Pass | `rewrite-review.js:446–448`: three `rw-btn` buttons with distinct labels; `aria-pressed` state maintained. Edit requires explicit "Save" click before decision is recorded. |
| Harvest items start unchecked (opt-in only) | ✅ Pass | `harvest.js:107–109`: `shouldPreCheck()` always returns `false`. Apply requires explicit checkbox selection and a confirm modal. |
| Session restore of prior decisions disclosed | ✅ Pass | `rewrite-review.js:69–72, 93–95`: toast "Your previous rewrite decisions have been restored — you can still change them." fires on both localStorage and cold-restore paths; `_restoreToastShown` prevents duplicate. |
| Unreviewed-customizations gate uses suppressible dialog | ⚠️ Partial | `app.js:138`: unreviewed-items warning uses `window.confirm()`, not the custom `confirmDialog()` at `ui-core.js:375`. Browsers can suppress `window.confirm` after "Prevent this page from creating additional dialogs," silently passing the gate. |
| Skills / experiences default to "include" without per-item decision | ⚠️ Partial | AI-recommended items in skills and experience review are pre-selected "include." No per-item explicit decision enforced before proceeding. Bulk "Accept All" on Rewrites tab (`rewrite-review.js:293`) bypasses per-card review entirely. Both are disclosed in-context but are soft gates only. |

---

### US-C3: Provenance and Audit Cues

| Sub-criterion | Status | Evidence |
| --- | --- | --- |
| Word-level diff for text rewrites | ✅ Pass | `rewrite-review.js:349–393, 428`: LCS diff rendering; original preserved as `data-original`; edit mode keeps diff visible as reference at 55% opacity. |
| Rewrite Audit Log in Rewrites tab | ✅ Pass | `rewrite-review.js:180–216`: collapsible "Rewrite Audit Log" with original / proposed / outcome (✅/❌/✏️) per entry. |
| Rewrite Audit Log in Finalise tab | ✅ Pass | `finalise.js:218–259`: separate implementation; full audit table with same icon set. |
| Session decisions persisted across reloads | ✅ Pass | `rewrite-review.js:50–54, 78–99`: persist to localStorage and cold-restore from backend rewrite_audit on reload. |
| Harvest candidates show before/after | ✅ Pass | `harvest.js:179–186`: "Before" and "After" labelled blocks with colour-coded left borders. |
| Harvest provenance badges (AI accepted vs. user-edited) | ✅ Pass | `harvest.js:140–146`: `renderProvenanceBadge(c)` shows `'✏️ User-edited'` when `c.outcome === 'edit'`, `'🤖 AI accepted'` otherwise. Badge shown only for `improved_bullet` and `summary_variant` types. Backend `generation_routes.py:1126–1149`: `audit_outcome` index maps rewrite audit outcomes into each candidate's `outcome` field. Provenance chain is complete and correct. |
| Layout-freshness chip tracks content staleness | ✅ Pass | `state-manager.js:120–178`: `getLayoutFreshnessFromState()` returns three states; chip shown in position bar (`index.html:100`). |
| Rationale completeness | ⚠️ Partial | Rewrite rationale silently absent when not populated by LLM. No visible "not available" placeholder. |
| Rewrite Audit Log discoverability | ⚠️ Partial | `rewrite-review.js:208–215`: rendered as a collapsed `<details>` element with no highlight. Users who don't know to look for it may miss the full provenance record. |

---

## Generated Materials Evaluation

### AI Disclosure in Generated Documents

| Finding | Status | Evidence |
| --- | --- | --- |
| AI-assistance disclosure available in generated files | ✅ Pass | `cv_orchestrator.py:5001–5013`: adds "Generated with AI assistance" footer (8pt italic) and Word core-properties metadata when `ai_attribution` is true. ATS DOCX path handled separately. |
| Disclosure defaults off — no contextual reminder | ⚠️ Partial | `config.py:307–309`: `ai_attribution_default` returns `False`. Settings checkbox at `index.html:648–649` is buried in ⚙️ Settings modal. No banner or reminder at Layout Review or File Review when it is off. Users in disclosure-required contexts may ship documents without enabling it. |
| Disclosure state resets between sessions | ⚠️ Partial | `ai_attribution` is stored per-session in conversation state. Persists to `config.yaml` only when the user clicks "Save Settings" — this is not obvious from the Settings UX. |
| Recipient visibility of disclosure | 🔲 Not Implemented | Disclosure placed only in document footer (8pt, light-grey italic) and Word metadata — both easily overlooked by a recipient. No cover-page or body-level statement. Appropriate for current single-user tool but worth noting for compliance contexts. |

### Content Factual Integrity

| Finding | Status | Evidence |
| --- | --- | --- |
| Anti-fabrication clause in main system prompt | ✅ Pass | `conversation_manager.py:490–491`: "CRITICAL — Data Integrity" clause. |
| Anti-fabrication clause in rewrite proposals | ✅ Pass | `llm_client.py:1958`: "Only substitute terminology — do NOT fabricate experience, achievements, or roles." |
| Anti-fabrication clause in cover letter system prompt | ❌ Fail | `master_data_routes.py:1691`: system message has no fabrication constraint. Only a positive grounding instruction exists in the user prompt. Candidate profile data is passed as context, but there is no explicit prohibition on embellishment or invented claims. |
| Numeric-claim fabrication detector active | ✅ Pass | `llm_client.py:1504–1539`: `check_new_numeric_claims` regex-diff; flags net-new integers, decimals, percentages, dollar amounts, and magnitude words. |
| Persuasion checks cover style and factual inflation | ✅ Pass | 9 checks total including action verbs, passive voice, hedging, generic phrases, named institution, CAR structure, and new numeric claims. All failures produce labelled badges. |

---

## Data Handling & Provider Transparency

| Finding | Status | Evidence |
| --- | --- | --- |
| Non-confidential badge shown persistently | ✅ Pass | `index.html:59`: `llm-non-confidential-badge` visible in header LLM pill. `auth-provider.js:86–91`: shown unless `info.confidential === true`; default is non-confidential (fail-safe). |
| Provider privacy URLs in model-selector popover | ✅ Pass | `provider-info.js:68–76`: confidentiality icon, tier icon, and `privacy_url` link shown in provider popover. `provider_registry.py`: fields populated for all known providers. |
| LLM disclosure is provider-scoped | ✅ Pass | `api-client.js:31–34`: `disclosureKey(provider)` = `cv-builder-llm-disclosure-shown-{provider}`. Switching providers correctly resets the disclosure for that provider. |
| LLM disclosure fires at all LLM operations | ⚠️ Partial | Disclosure only in `analyzeJob()`. Cover letter, harvest analysis, screening, and spell-check receive no notice. |
| Credential / API key source transparent | ✅ Pass | `ui-core.js:976–1013`: source label shown per setting (env var, .env, config.yaml, default). Locked-source amber banner when env/dotenv override is active. |
| Session data stays local | N/A | Architectural: local Flask server; session JSON on disk. Only external transmission is to configured LLM provider API. Provider badge handles user-facing aspect. |

---

## Terminology Audit

| Term | Location | Issue |
| --- | --- | --- |
| "Candidate to confirm" | `rewrite-review.js:398` | Ambiguous. Skills tab correctly says "Weak evidence" (`skills-review.js:731`). Recommended: "⚠ Verify before including." Needs tooltip. |
| "Persuasion checks" / "Persuasion warnings" | `rewrite-review.js:247` | Developer jargon. "Writing quality checks" or "Content quality warnings" is more user-facing. |
| "AI attribution" vs. "AI-assistance disclosure" | `index.html:648`, settings code | Two terms for the same feature across settings UI and backend key. Standardise on one. |
| "Non-confidential" badge label | `index.html:59` | Badge shows "⚠ Non-confidential" — registry jargon. The tooltip "Data may be reviewed or retained by this provider" is clearer and should become the primary label or badge text. |
| "Rewrite Audit Log" | `rewrite-review.js:212` | Accurate but developer-centric. "Change Decision Log" or "Review History" would be more user-facing. |

---

## Proposed Story Gaps

1. **US-C4 (Proposed): Anti-fabrication clause in cover letter system prompt** — Add the "do not fabricate" constraint to `master_data_routes.py:1691` system message. Minimum: "Base the letter strictly on the candidate profile provided. Do not invent claims, metrics, or achievements not present in the source material." Priority: HIGH (cover letter reaches employers).

2. **US-C5 (Proposed): Contextual disclosure reminder at generation time** — Banner on File Review tab when `ai_attribution` is off: "Some contexts require disclosing AI assistance — enable in ⚙️ Settings if applicable." Priority: MEDIUM.

3. **US-C6 (Proposed): Extend LLM disclosure to cover letter and harvest operations** — Call `disclosureKey(provider)` check at cover letter generation and harvest analysis, not only at `analyzeJob()`. Priority: MEDIUM.

4. **US-C7 (Proposed): Replace window.confirm gate with custom dialog** — `app.js:138`: replace `window.confirm()` with the existing `confirmDialog()` (`ui-core.js:375`) to close the browser-suppress bypass. Priority: LOW.

5. **US-C8 (Proposed): Standardise weak-evidence label across surfaces** — "Candidate to confirm" (Rewrites tab) → "⚠ Weak evidence" with tooltip. Makes both surfaces consistent. Priority: LOW.

6. **US-C9 (Proposed): Rationale placeholder when absent** — Always render the `<details>` element for rewrite rationale; show "No detailed rationale was generated for this change" when absent. Priority: LOW.

---

## Summary Table

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | N/A |
| --- | --- | --- | --- | --- | --- |
| US-C1 Transparent AI Suggestions | 9 | 3 | 1 | 0 | 0 |
| US-C2 User Approval Integrity | 5 | 2 | 0 | 0 | 0 |
| US-C3 Provenance and Audit Cues | 6 | 2 | 0 | 0 | 0 |
| Generated Materials — AI Disclosure | 1 | 2 | 0 | 1 | 1 |
| Generated Materials — Factual Integrity | 4 | 0 | 1 | 0 | 0 |
| Data Handling & Provider Transparency | 4 | 1 | 0 | 0 | 1 |

---

**Key evidence references:**

- `disclosureKey(provider)` scoping: `web/api-client.js:31–34`
- Disclosure at analyzeJob: `web/job-analysis.js:99–108`
- Harvest provenance badge: `web/harvest.js:140–146`
- Harvest outcome wiring: `scripts/routes/generation_routes.py:1119–1149`
- Anti-fabrication main system prompt: `scripts/utils/conversation_manager.py:490–491`
- Anti-fabrication rewrite prompt: `scripts/utils/llm_client.py:1958`
- Cover letter system message (gap): `scripts/routes/master_data_routes.py:1691`
- Numeric-claim check: `scripts/utils/llm_client.py:1504–1539`
- Submit gate: `web/rewrite-review.js:598–605`
- Persuasion-acknowledgement gate: `web/rewrite-review.js:609–615`
- window.confirm bypass: `web/app.js:138`
- Harvest opt-in: `web/harvest.js:107–109`
- AI attribution default: `scripts/utils/config.py:307–309`
- AI attribution in document: `scripts/utils/cv_orchestrator.py:5001–5013`
- Non-confidential badge: `web/index.html:59`, `web/auth-provider.js:86–91`
- Provider registry: `scripts/utils/provider_registry.py`
- Rewrite audit log: `web/rewrite-review.js:180–216`
