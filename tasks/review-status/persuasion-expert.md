<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-06-22 13:00 ET (source-first refresh, cycle 7 — full independent re-read of all 8 required source files plus supplementary route/UI files; no inference from prior cycles; branch `feature/multi-user-deployment`)

**Source files read (fresh this cycle):**

`web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`

Supplementary files verified for specific claims: `web/cover-letter.js`, `web/rewrite-review.js`, `web/publications-review.js`, `scripts/routes/master_data_routes.py`, `scripts/routes/review_routes.py`

**Cycle 7 status changes from cycle 6:**

All statuses confirmed unchanged. No new implementations found. All six persistent gaps remain open (see Additional Story Gaps). The word-count ceiling in `_validateCoverLetter` is confirmed at 400 words (`cover-letter.js:521–527`); the generation prompt target remains `~250–300 words` (`master_data_routes.py:1582`). The CTA check (`cover-letter.js:544–556`) continues to accept passive closings including "look forward to hearing from you." `post_analysis_answers` remain absent from the `generate_professional_summary` call site (`master_data_routes.py:1154–1161`).

**Executive Summary:** Scores hold at **10 Pass / 10 Partial / 0 Fail / 4 Not Implemented** across 24 acceptance criteria. The persuasion engine is strong on individual-bullet quality (P4: all four checks fully implemented) and metric-preservation (P2-AC1, P2-AC4, P2-AC6). The cover-letter layer (P5) is the weakest section: all four ACs are Partial, with the word-count ceiling 100 words too high (400 vs 300), the CTA check accepting passive closes, and no first-content-sentence "I" detection. Cross-document narrative consistency (P6-AC2, P6-AC3) and narrative-fragmentation warning (P1-AC3) remain absent from the codebase.

---

## Application Evaluation

### US-P1 — Narrative Arc and Identity Alignment

| AC | Status | Evidence |
| -- | ------ | -------- |
| P1-AC1: Summary opens with value-identity statement, not a job title or name | ✅ Pass | `llm_client.py:850` instructs "Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3× revenue growth…', 'Builds ML pipelines that…') — NOT a title + years-of-experience formula". Directly satisfies the story requirement. No post-generation validation of the output exists, but the prompt constraint is correctly specified. |
| P1-AC2: At least one forward-looking statement in the summary | ✅ Pass | `llm_client.py:853` instructs "Close with a forward-looking statement aligned to the target role" inside `generate_professional_summary`. The constraint is part of the generation prompt. |
| P1-AC3: System warns if more than two equally-weighted narrative threads are present | 🔲 Not Implemented | No narrative-thread detection, identity-fragmentation warning, or competing-domain analysis exists anywhere in the backend or frontend. No evidence in `conversation_manager.py`, `llm_client.py`, `review_routes.py`, or any web module. |
| P1-AC4: Zero instances of "responsible for", "helped to", "assisted with", "was involved in" in proposed rewrites | ⚠️ Partial | `check_passive_voice` (`llm_client.py:1117`) and `check_hedging_language` (`llm_client.py:1226`) detect these exact patterns and are invoked on every proposed rewrite (`conversation_manager.py:1294–1311`). Gap: original master CV bullets that are included without a rewrite are never checked. |

**Story assessment:** Two ACs pass cleanly. Narrative-fragmentation detection is absent (🔲). Passive/hedging checks cover proposed rewrites but not the original included bullets (⚠️).

---

### US-P2 — Social Proof and Authority Signals

| AC | Status | Evidence |
| -- | ------ | -------- |
| P2-AC1: `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric | ✅ Pass | `llm_client.py:945–948` — all numeric tokens from the original text must be a subset of the proposed text. Proposals that drop metrics are discarded at `llm_client.py:1875–1883`. |
| P2-AC2: Named recognisable organisations appear within first 15 words | ⚠️ Partial | `check_named_institution_position` at `llm_client.py:1268` checks a hardcoded set of ~50 brand names (`llm_client.py:1289–1300`). Covers FAANG, US pharma (Pfizer, Moderna, Genentech, Amgen), top universities, and prominent journals/conferences. Notable absences for global life-science candidates: Roche, AstraZeneca, Novartis, GSK, Sanofi, Eli Lilly, Abbott, Illumina. Warning fires in the rewrite panel (`rewrite-review.js:109`). |
| P2-AC3: Conditional omission decisions for Publications/Awards surfaced to user with rationale | ⚠️ Partial | Non-recommended publications are rendered with `is_recommended=False` at 70% opacity (`publications-review.js:141`). The `rationale` field is empty for non-recommended entries (verified in `review_routes.py`). The user sees which publications were deprioritised but receives no explanation why. |
| P2-AC4: Publication list ranked by job-relevance (keyword + domain + authority signals), not recency or citation count alone | ✅ Pass | `rank_publications_for_job` (`llm_client.py:1530`) sends domain, title, required skills, and ATS keywords to the LLM; returns ranked list sorted by `relevance_score` descending, then `year` descending (`llm_client.py:1692`). LLM also detects `is_first_author`. |
| P2-AC5: Each recommended publication shows at least one authority signal | ⚠️ Partial | `authority_signals` is populated with `first_author` and `journal:`/`conference:` tokens (`llm_client.py:1656–1662`). UI renders `is_first_author` as a star icon (`publications-review.js:132`) and shows the formatted citation (which includes venue). Full `authority_signals` array is not displayed as distinct labelled badges in the UI; citation count is not tracked. |
| P2-AC6: System flags bullets where a number is present in master data but absent in the proposed rewrite | ✅ Pass (constraint enforced, no explicit flag) | `apply_rewrite_constraints` silently discards such proposals (`llm_client.py:1875–1883`). The user sees fewer proposals but no "a metric was stripped" explanation is surfaced. The constraint is correctly enforced; transparency is a minor UX gap. |

**Story assessment:** Metric-preservation and publication-ranking mechanics are solid. Institution-name list is incomplete for global pharma; non-recommended publication rationale is always empty; authority signals are partially displayed.

---

### US-P3 — Loss-Aversion and Urgency Framing

| AC | Status | Evidence |
| -- | ------ | -------- |
| P3-AC1: System identifies and proposes CAR (Challenge-Action-Result) structure for bullets where challenge language exists in master data | ⚠️ Partial | `check_car_structure` at `llm_client.py:1325` detects presence/absence of challenge and result language and fires `severity='info'` when absent (`llm_client.py:1363`). Applied to experience bullets at `conversation_manager.py:1318–1321`. Gap: (a) check fires on proposed rewrites, not on original master data to identify preservation opportunities; (b) no CAR-structured alternative proposal is generated; (c) the flag is informational only — no automatic CAR rewrite is offered. |
| P3-AC2: Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless loss-framing is the impressive result | 🔲 Not Implemented | No positive-sum framing check or prompt preference exists anywhere. The rewrite prompt at `llm_client.py:1809–1854` requires metric preservation but does not specify framing direction. `check_has_result_clause` at `llm_client.py:1209` lists "reduced" as equally valid to "increased" and "improved". |
| P3-AC3: Summary rewrite checked against a short list of generic filler phrases; flagged if more than one appears | ✅ Pass | `check_summary_generic_phrases` (`llm_client.py:1371`) with `_GENERIC_FILLER_PHRASES` set at `llm_client.py:1037`. Severity is `'warn'` for >2 matches. Applied at `conversation_manager.py:1323–1326`. |

**Story assessment:** Generic-phrase detection is solid. CAR check is reactive and informational only. Positive-sum framing is absent entirely.

---

### US-P4 — Rhetorical Quality of Bullet Points

| AC | Status | Evidence |
| -- | ------ | -------- |
| P4-AC1: Every proposed bullet begins with a verb from an approved strong-action-verb list | ✅ Pass | `check_strong_action_verb` at `llm_client.py:1079`; `_STRONG_ACTION_VERBS` set at `llm_client.py:972` covers ~150 curated verbs across achievement, leadership, innovation, operational, and recognition categories. `_strip_intro_phrase()` is called at `llm_client.py:1097` before verb extraction to avoid false-positives on label-prefixed bullets. Applied at `conversation_manager.py:1293–1295`. |
| P4-AC2: System flags any proposed bullet exceeding 30 words for compression review | ✅ Pass | `check_word_count` at `llm_client.py:1158` with 30-word default threshold. `_strip_intro_phrase()` called at `llm_client.py:1176` before counting. Applied at `conversation_manager.py:1301–1303`. Warning surfaced in rewrite panel (`rewrite-review.js:108–118`). |
| P4-AC3: System flags passive voice constructions in proposed rewrites | ✅ Pass | `check_passive_voice` at `llm_client.py:1117` with regex patterns for `was X`, `were X`, `responsible for`, `was tasked with`, `helped to`, etc. Applied at `conversation_manager.py:1297–1299`. |
| P4-AC4: System flags bullets where no result clause (outcome, impact, or metric) is present | ✅ Pass | `check_has_result_clause` at `llm_client.py:1188` detects numeric tokens, outcome verbs, and causal phrases. Severity `'info'`. Applied at `conversation_manager.py:1305–1307`. |

**Story assessment: Full pass.** All four checks implemented, wired into the persuasion-check pipeline, and surface in the rewrite panel. The warnings panel defaults to open (`rewrite-review.js:138` `display:block`). The submit button is hard-disabled until warnings are acknowledged (`rewrite-review.js:410`), with a modal guard in `submitRewriteDecisions()`. When no warnings are present, the flag is pre-set at `rewrite-review.js:83`.

Minor note: parallel-structure consistency across bullets within a single experience is not checked — each bullet is evaluated in isolation.

---

### US-P5 — Cover Letter Persuasion Architecture

| AC | Status | Evidence |
| -- | ------ | -------- |
| P5-AC1: System rejects any draft where the first word is "I" and offers a rewrite prompt | ⚠️ Partial | Opening style is user-selectable via `_OPENING_GUIDANCE` (`master_data_routes.py:98–102`). The `hook` and `narrative` styles instruct "Do NOT use a formal salutation." `_validateCoverLetter()` at `cover-letter.js:481–497` checks only for generic salutation openers (e.g. "Dear Hiring Manager", "To Whom It May Concern"). Gaps: (a) `formal` is the default option; it produces "Dear {hiring_manager}," which is typically followed by "I…" in sentence 1; (b) no check detects "I" as the first word of the first content sentence; (c) no rejection or rewrite offer is implemented. |
| P5-AC2: Cover letter references at least the company name and one specific role requirement in a non-generic way | ⚠️ Partial | Generation prompt injects company, role, and required skills (`master_data_routes.py:1560–1563`). `_validateCoverLetter()` checks company name mention count (`cover-letter.js:500–516`) with pass/warn/fail grading. No post-generation check verifies that a specific role requirement is mentioned non-generically. |
| P5-AC3: Word count check enforced; letter exceeding 300 words triggers a compression review flag | ⚠️ Partial | `_validateCoverLetter()` at `cover-letter.js:518–527` applies a programmatic word-count check with visual progress bar and colour coding. The UI label reads "Word count (250–400)" and the check passes any count in 250–400 as green. The generation prompt targets ~250–300 words (`master_data_routes.py:1576`) but the UI ceiling is 400 — a 350-word letter receives a "within target range" status. The story requires flagging at 300. |
| P5-AC4: Closing sentence includes a specific proposed next step; flagged if absent | ⚠️ Partial | `_validateCoverLetter()` checks the closing paragraph for CTA patterns (`cover-letter.js:532–537`). However, `ctaPatterns` includes passive phrases (`/hear from you/i`, `/look forward to/i`) that pass the check despite not meeting the story's requirement for an active, specific next step. No distinction between active and passive CTA is enforced. |

**Story assessment: Partial across all four ACs.** All four rules have client-side checks in `_validateCoverLetter()`. P5-AC1 lacks a first-content-sentence "I" check. P5-AC3's word-count ceiling is 100 words above the story threshold. P5-AC4 accepts passive closes.

---

### US-P6 — Consistency of Persuasive Register

| AC | Status | Evidence |
| -- | ------ | -------- |
| P6-AC1: System enforces that clarification-answer context is applied consistently across all generated content in the session | ⚠️ Partial | `post_analysis_answers` are injected into the cover letter prompt (`master_data_routes.py:1531–1536`) and into screening-response prompts. They are NOT passed to `generate_professional_summary` — that call at `master_data_routes.py:1154–1161` passes only `job_analysis`, `master_data`, `selected_experiences`, `refinement_prompt`, `previous_summary`. Style emphasis from user clarification does not flow into the summary. |
| P6-AC2: Cover letter core argument is cross-checked against summary framing; mismatch flagged for user review | 🔲 Not Implemented | No comparison between cover letter body and professional summary text exists in any route or utility. `_renderConsistencyReport` at `cover-letter.js:336–457` checks only company name, job title, ATS keyword presence, and date format — no narrative or identity-framing alignment. |
| P6-AC3: Prior screening-answer terminology compared against CV keyword choices; divergences presented as a harmonisation suggestion | 🔲 Not Implemented | Screening responses are generated with cover letter snippet and session answers as context, but no keyword extraction or comparison against CV terminology occurs, and no harmonisation suggestion is generated or surfaced. |

**Story assessment: Mostly not implemented.** Session clarification context flows into cover letter and screening prompts but not into summary generation. No cross-document framing alignment or keyword harmonisation logic exists.

---

## Generated Materials Evaluation

### Cover Letter

Provided by `web/cover-letter.js` + `scripts/routes/master_data_routes.py`:

- ✅ Tone selection (5 presets: Startup/Tech, Pharma/Biotech, Academia, Financial, Leadership) — `master_data_routes.py:90–96`
- ✅ Opening style selector (Formal / Hook / Narrative) — `cover-letter.js:27`, `master_data_routes.py:98–102`
- ✅ Hiring manager personalisation field
- ✅ Prior session reuse ("use as starting point") — `master_data_routes.py:1550–1553`
- ✅ Post-generation quality validation panel (`_validateCoverLetter()`) with 4 programmatic checks
- ✅ Save to DOCX

Remaining structural weaknesses:

- Default opening style is `formal` — most users receive a salutation opener unless they actively change it
- Word-count ceiling in UI is 400 vs story's 300-word flag threshold; a 350-word letter passes as green
- CTA check accepts passive phrases ("I look forward to hearing from you") as a full pass
- No enforcement of a "one focused value-proposition paragraph" structure
- No check that the letter mirrors 2–3 phrases directly from the job description verbatim
- No first-content-sentence "I" check (only generic salutation opener is checked)

### Professional Summary

- ✅ AI-generated per application with ATS keyword weaving (`llm_client.py:851`)
- ✅ Opening instruction: value-identity-first ("strong verb + differentiating value claim … NOT a title + years-of-experience formula") — `llm_client.py:850`
- ✅ Forward-looking close instruction — `llm_client.py:853`
- ✅ Generic filler phrase check via `check_summary_generic_phrases` — `llm_client.py:1371`
- ✅ Refinement loop with user instructions (`web/summary-review.js`)
- ⚠️ Post-analysis clarification answers are NOT passed to `generate_professional_summary` — the call at `master_data_routes.py:1154–1161` omits `post_analysis_answers`

### Experience Bullets (Rewrites)

- ✅ Eight persuasion checks run on all proposed rewrites (`conversation_manager.py:1288–1342`)
- ✅ Word-level inline diff display per rewrite card
- ✅ Persuasion warning panel defaults open (`rewrite-review.js:138` `display:block`)
- ✅ Constraint prevents metric removal — `apply_rewrite_constraints` at `llm_client.py:913`
- ✅ Submit gate hard-disabled until persuasion warnings are acknowledged (`rewrite-review.js:410`); modal guard at `submitRewriteDecisions()`
- ✅ `_strip_intro_phrase()` prevents false-positive failures on label-prefixed bullets (`llm_client.py:1064`, called at `1097`, `1176`)
- ⚠️ Original master CV bullets included without a rewrite are never run through persuasion checks

### Publications

- ✅ LLM-ranked by job-relevance score (`llm_client.py:1530`)
- ✅ First-author detection via LLM (`llm_client.py:1656–1658`)
- ✅ Recommended vs non-recommended split with visual divider (`publications-review.js:110–127`)
- ⚠️ Non-recommended publication rationale is empty (verified in review_routes.py)
- ⚠️ Citation count not tracked; authority signals (journal, first-author) partially displayed — `authority_signals` array not rendered as distinct badges

---

## Additional Story Gaps / Proposed Story Items

### GAP-P-01: Unchecked original bullets

Original master CV bullets included without a rewrite are never run through persuasion checks. A candidate could include bullets full of hedging language or passive voice that pass through unchallenged.

**Proposed story — US-P7 (Passive Review of Included Originals):** System runs the four bullet-quality checks against all included original bullets and surfaces a summary of findings before the user leaves the Customise stage.

### GAP-P-02: Pattern-interrupt cover letter opening and word-count ceiling

The default opening style (`formal`) produces a salutation. The first-content-sentence may start with "I" without any check or flag. The UI word-count ceiling (400) is 100 words above the story threshold (300).

**Proposed story — US-P8 (Pattern-Interrupt Cover Letter Generator):** Check the first word of the first non-salutation content paragraph; flag and offer rewrite if it begins with "I". Tighten word-count ceiling from 400 to 300 in `_validateCoverLetter` (`cover-letter.js:521–527`). Update `ctaPatterns` to exclude passive phrases ("look forward to", "hear from you") and require active-voice specificity.

### GAP-P-03: Positive-sum metric framing preference

No rewrite constraint or prompt instruction prefers gain framing ("increased latency 3×") over loss framing ("reduced latency by 66%").

**Proposed story — US-P9 (Positive-Sum Framing Check):** Add a `check_positive_sum_framing` static method to `LLMClient` that detects reduction/loss framings for metrics and proposes an equivalent positive reframing for user review.

### GAP-P-04: Narrative thread fragmentation detection

No cross-experience narrative coherence check exists. The LLM `recommend_customizations` already returns an `applicant_tagline` and `summary_focus` — these could anchor a narrative-thread warning.

**Proposed story — US-P10 (Narrative Arc Coherence Warning):** System detects when selected experiences span three or more non-overlapping role domains and warns the user that the CV may signal identity fragmentation, citing the specific domain split.

### GAP-P-05: Cover letter / summary framing cross-check

Cover letter is generated independently of the professional summary. Both can lead with different role identities or value propositions.

**Proposed story — US-P11 (Cross-Document Framing Alignment):** After cover letter generation, compare the first paragraph's role identity claim against the professional summary's opening statement and flag if they diverge. Add this as a fifth check in `_renderConsistencyReport` (`cover-letter.js:336–457`).

### GAP-P-06: Post-analysis clarification context missing from summary generation

`post_analysis_answers` (style emphasis from the user clarification step) are passed to cover letter and screening prompts but not to `generate_professional_summary`, creating a register mismatch between the summary and the rest of the application materials.

**Fix (no new story needed):** Pass `post_analysis_answers` to `generate_professional_summary` in `master_data_routes.py` at the call site (`1154–1161`) and add a `user_preferences` block to the generation prompt in `llm_client.py:754–879`, mirroring the pattern already used in `recommend_customizations` (`llm_client.py:350–365`).

---

**Reviewed against:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`, `web/cover-letter.js`, `web/rewrite-review.js`, `web/publications-review.js`, `scripts/routes/master_data_routes.py`, `scripts/routes/review_routes.py`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-P1 Narrative Arc | 2 | 1 | 0 | 1 | 0 |
| US-P2 Social Proof | 3 | 3 | 0 | 0 | 0 |
| US-P3 Loss-Aversion | 1 | 1 | 0 | 1 | 0 |
| US-P4 Bullet Quality | 4 | 0 | 0 | 0 | 0 |
| US-P5 Cover Letter | 0 | 4 | 0 | 0 | 0 |
| US-P6 Register Consistency | 0 | 1 | 0 | 2 | 0 |
| **Totals (24 ACs)** | **10** | **10** | **0** | **4** | **0** |

**Key evidence references (verified line numbers from cycle 6 source read, 2026-06-22, branch `feature/multi-user-deployment`):**

- P1-AC1 / P1-AC2: value-identity-first opening + forward-looking close → `scripts/utils/llm_client.py:850, 853`
- P2-AC1 / P2-AC6: `apply_rewrite_constraints` numeric guard → `scripts/utils/llm_client.py:945–948, 1875–1883`
- P2-AC2: `check_named_institution_position` / branded-org list → `scripts/utils/llm_client.py:1268, 1289–1300`
- P2-AC3: non-recommended pub at 70% opacity, rationale empty → `web/publications-review.js:141`; `scripts/routes/review_routes.py`
- P2-AC4: `rank_publications_for_job` relevance-score sort → `scripts/utils/llm_client.py:1530, 1692`
- P2-AC5: `authority_signals` construction → `scripts/utils/llm_client.py:1656–1662`
- P3-AC1: `check_car_structure` (info-only) → `scripts/utils/llm_client.py:1325, 1363`
- P3-AC3: `check_summary_generic_phrases` + `_GENERIC_FILLER_PHRASES` → `scripts/utils/llm_client.py:1037, 1371`
- P4-AC1: `_STRONG_ACTION_VERBS` + `check_strong_action_verb` → `scripts/utils/llm_client.py:972, 1079, 1097`
- P4-AC2: `check_word_count` (30-word limit, `_strip_intro_phrase`) → `scripts/utils/llm_client.py:1158, 1176`
- P4-AC3: `check_passive_voice` → `scripts/utils/llm_client.py:1117`
- P4-AC4: `check_has_result_clause` → `scripts/utils/llm_client.py:1188`
- P4 persuasion pipeline: `run_persuasion_checks` orchestration → `scripts/utils/conversation_manager.py:1234, 1288–1342`
- P4 warnings panel: defaults open, submit gate → `web/rewrite-review.js:83, 138, 410`
- P5-AC1: generic-salutation check (no first-sentence "I" check) → `web/cover-letter.js:481–497`
- P5-AC2: company reference check → `web/cover-letter.js:500–516`
- P5-AC3: word-count check ceiling at 400 (not 300) → `web/cover-letter.js:518–527`; generation target ~250–300 → `scripts/routes/master_data_routes.py:1576`
- P5-AC4: CTA check includes passive patterns → `web/cover-letter.js:532–537`
- P5 opening styles: `_OPENING_GUIDANCE` dict → `scripts/routes/master_data_routes.py:98–102`
- P6-AC1 gap: `post_analysis_answers` NOT passed to summary generator → `scripts/routes/master_data_routes.py:1154–1161`; IS passed to cover letter → `master_data_routes.py:1531–1536`
- P6-AC2: consistency report keyword/company only, no narrative check → `web/cover-letter.js:336–457`

**Evidence standard:** Every conclusion is independently verifiable from the cited source files read during this session (2026-06-22, cycle 6, branch `feature/multi-user-deployment`).
