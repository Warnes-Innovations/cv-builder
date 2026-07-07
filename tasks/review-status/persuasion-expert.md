<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-07-06 20:00 ET

**Executive Summary:** The cv-builder has a well-implemented persuasion-check engine with ten distinct rhetorical quality checks wired into the rewrite-review pipeline, and the cover-letter validation suite is the most mature component relative to this persona's criteria. The primary gaps are: (1) no post-generation validation on the final summary or cover letter body (persuasion checks apply only to proposed rewrite candidates, not to freshly-generated text); (2) cover letter word count targets exceed the story ceiling for standard roles; (3) no cross-section register consistency check (summary assertiveness vs. bullet assertiveness vs. screening answer language); and (4) urgency/stakes phrases and third-party validation language ("selected by", "invited to") are not specifically preserved through rewrites.

---

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

| Criterion | Status | Evidence |
|---|---|---|
| Identity match — summary opens with value-identity statement (not title/name) | ⚠️ Partial | `llm_client.py:887` instructs "Open with a value-identity statement: strong verb + differentiating value claim — NOT a title + years-of-experience formula." `cv_orchestrator.py:3614–3616` rejects `"I"` as first word but does **not** detect a bare job-title or name opener. No post-generation enforcement of the value-identity pattern on the produced text. |
| Arc coherence — narrative arc advisory (most recent role shows strongest verbs) | ✅ Pass | `cv_orchestrator.py:4547–4590` (`check_persuasion`): `narrative_arc_advisory` fires when most recent role's action-verb strength < 70% of earlier roles' average. |
| Forward-pull framing — forward-looking statement required | ⚠️ Partial | `llm_client.py:893` prompt instruction: "Close with a forward-looking statement aligned to the target role." No post-generation validation checks this on the produced summary text. |
| No identity fragmentation — warns when ≥3 equally-weighted narrative threads | ✅ Pass | `cv_orchestrator.py:4513–4545` (`check_persuasion`): `narrative_thread_advisory` fires when ≥3 themes are within 20% of the leading theme count and total tagged bullets ≥10. |
| Zero "responsible for / helped to / assisted with / was involved in" in rewrites | ✅ Pass | `llm_client.py:check_passive_voice()` (1156–1194) and `check_hedging_language()` (1264–1305) detect all four patterns. Applied to every proposed rewrite via `conversation_manager.py:run_persuasion_checks()` (1434–1503). |
| Generic filler phrases flagged in summary | ✅ Pass | `llm_client.py:check_summary_generic_phrases()` (1410–1442): 19-phrase list; fails if > 1 found; applied to summary rewrites in `run_persuasion_checks()`. |

**Gap:** The narrative-thread advisory fires at rewrite time — too late for the user to adjust which experiences they included during the Customise phase. It should also be surfaced during the Experiences review tab. Additionally, no runtime check validates that the generated summary's first sentence follows the value-identity form rather than opening with a title.

---

### US-P2: Social Proof and Authority Signals

| Criterion | Status | Evidence |
|---|---|---|
| Named institution front-loaded within first 15 words | ✅ Pass | `llm_client.py:check_named_institution_position()` (1307–1362): hardcoded branded-org list (FAANG, pharma, top universities, flagship journals/conferences); fires as `severity: 'info'` for `exp` location rewrites. |
| Quantified impact preserved — no metric dropped in rewrite | ✅ Pass | `llm_client.py:apply_rewrite_constraints()` (952–1000): hard filter — rejects proposals where any numeric token in `original` is absent from `proposed`. Applied to entire `propose_rewrites` output before user sees it. |
| No new fabricated numeric claims in rewrites | ✅ Pass | `llm_client.py:check_new_numeric_claims()` (1503–1539, GAP-300b): warns when proposed introduces numeric tokens absent from original. |
| Publications ranked by job-relevance (not recency/citation count alone) | ✅ Pass | `llm_client.py:rank_publications_for_job()` (1666–1830): LLM prompt uses domain, title, required skills, ATS keywords to assign `relevance_score` (1–10); sorted by `-relevance_score, -year`. |
| Each recommended publication shows authority signals alongside rationale | ✅ Pass | `rank_publications_for_job()` returns `authority_signals` (first_author, journal name, conference name) and `rationale` per result. `venue_warning` set when no journal/conference found. |
| Publications shortlist surfaced proactively after recommendations | ✅ Pass | `conversation_manager.py:922–942`: top-5 ranked publications surfaced in chat immediately after `recommend_customizations`. |
| Publication/awards omission surfaced to user with rationale | ⚠️ Partial | For non-research roles: publications gate question in `conversation_manager.py:763–774` surfaces the include/exclude decision. For research roles, inclusion is assumed. For **awards** there is no equivalent gate — they are included or excluded based solely on master data content, with no explicit user-facing omission decision. Low-scoring publications have no explanation shown in the UI. |
| Third-party validation language preserved ("selected by", "invited to", "cited by") | 🔲 Not Implemented | No check or prompt instruction specifically detects and preserves third-party passive-attribution phrases. `apply_rewrite_constraints()` preserves proper nouns and numbers, but passive-attribution phrasing is not detected. |

---

### US-P3: Loss-Aversion and Urgency Framing

| Criterion | Status | Evidence |
|---|---|---|
| CAR structure identified and proposed for bullets with challenge language | ⚠️ Partial | `llm_client.py:check_car_structure()` (1364–1407): detects CAR presence/absence in proposed rewrites and flags missing structure. Applied in `conversation_manager.py:run_persuasion_checks()` (1464–1466). However, the `_propose_rewrites_via_chat()` prompt does not specifically instruct the LLM to identify challenge language in the original and construct a CAR rewrite — the check is reactive, not proactive. |
| Cost-of-inaction/urgency language preserved through rewrites | 🔲 Not Implemented | No constraint in `apply_rewrite_constraints()` or any `check_*` function detects urgency phrases ("before FDA submission", "production incident", "regulatory deadline") and prevents their removal. |
| Differentiation signal from generic applicant pool | ⚠️ Partial | `llm_client.py:check_summary_generic_phrases()` guards against filler in summaries. The summary prompt at `llm_client.py:887` requests a "differentiating value claim" but no runtime check verifies a differentiating phrase is present. No explicit "rare combination…" type probe. |
| Positive-sum metric framing preferred over loss framing | ✅ Pass | `llm_client.py:check_positive_metric_framing()` (1473–1501): flags negative-framing verbs (cut, reduce, eliminate, shrink) adjacent to metrics; suggests positive reframing. Applied to experience bullets in `run_persuasion_checks()`. Also reinforced in `_propose_rewrites_via_chat()` quality criteria prompt. |

---

### US-P4: Rhetorical Quality of Bullet Points

| Criterion | Status | Evidence |
|---|---|---|
| Every proposed bullet opens with strong action verb | ✅ Pass | `llm_client.py:check_strong_action_verb()` (1117–1153): checks first word against `_STRONG_ACTION_VERBS` (250+ verbs). `severity: 'warn'`. Applied to all rewrites in `run_persuasion_checks()`. `_strip_intro_phrase()` helper correctly skips "Category Label: Verb…" prefixes. |
| Bullets over 30 words flagged for compression | ✅ Pass | `llm_client.py:check_word_count()` (1196–1225): `max_words=30`, `severity: 'warn'`. Also `cv_orchestrator.py:4406–4414`: independent check at > 35 words in `check_persuasion()`. |
| Passive voice flagged | ✅ Pass | `llm_client.py:check_passive_voice()` (1155–1194): 7 passive patterns including "was responsible for", "was involved in", "assisted with", "was tasked with". `severity: 'warn'`. |
| Missing result clause flagged | ✅ Pass | `llm_client.py:check_has_result_clause()` (1227–1262): heuristic for numbers, outcome words, "resulted in / led to". `severity: 'warn'` (note: severity is `'warn'` per code). |
| Keyword appendage at end of bullet flagged | ✅ Pass | `llm_client.py:check_keyword_appended()` (1444–1471): checks final 3 tokens for ATS keywords absent from original. `severity: 'warn'`. |
| Front-loading — most impressive phrase appears early | 🔲 Not Implemented | No check verifies that the highest-value word or phrase (brand name, metric, outcome) appears in the first 5–7 words of the bullet. `check_named_institution_position()` is a proxy but covers only a hardcoded branded-org list. |
| Parallel structure within experience | 🔲 Not Implemented | No detection of mixed grammatical forms across bullets in the same experience. Would require NLP parsing beyond simple regex. |

---

### US-P5: Cover Letter Persuasion Architecture

| Criterion | Status | Evidence |
|---|---|---|
| Opening pattern interrupt — no generic "I am writing to apply" opener | ✅ Pass | `cover-letter.js:534–551` (`_validateCoverLetter`): rejects 6 generic salutation patterns. `_OPENING_GUIDANCE` at `master_data_routes.py:105–109` provides hook and narrative opener variants. |
| Body does not open with "I" | ✅ Pass | `cover-letter.js:553–569`: explicit "I-first gate" — isolates first body token after salutation line; fails if `=== 'i'`. |
| Company name and role title referenced non-generically in paragraph 1 | ✅ Pass | `cover-letter.js:592–613` (`para1Check`): checks that both company name and role title appear in the first 100 words of the first non-salutation paragraph. |
| Company name appears ≥2 times | ✅ Pass | `cover-letter.js:572–590` (`companyCheck`): 1 mention = warn; 0 mentions = fail; ≥2 = pass. |
| Generic filler phrases rejected | ✅ Pass | `cover-letter.js:695–715` (`fillerCheck`): 19-phrase list; > 2 found = fail. |
| Named or quantified achievement present | ✅ Pass | `cover-letter.js:678–693` (`achievementCheck`): checks for %, dollar amounts, numeric impact phrases, action verbs. |
| Assertive call-to-action in closing | ✅ Pass | `cover-letter.js:651–676` (`ctaCheck`): 7 assertive CTA patterns (pass); 4 passive CTA patterns (fail with rejection message). Backend at `master_data_routes.py:1668` explicitly instructs "Avoid passive language such as 'I look forward to hearing from you.'" |
| Word count enforced — maximum 300 words (story) | ⚠️ Partial | Story specifies "maximum 300 words." Implementation targets 300–400 for standard roles (`cover-letter.js:623–625`; `master_data_routes.py:111–122`). Letters up to 400 words pass without warning. Only > 450 triggers fail for standard roles — a systematic divergence from the story's 300-word ceiling. |
| One focused second paragraph — single provable claim | 🔲 Not Implemented | No check that paragraph 2 makes one specific claim rather than a list of attributes. The generation prompt instructs "3–4 paragraphs" without paragraph-specific structure guidance. |
| 2–3 verbatim phrases from job description mirrored | ⚠️ Partial | The cover letter prompt injects ATS keywords and required skills (`master_data_routes.py:1609–1610`), but no instruction to lift specific multi-word phrases verbatim from the JD. `_renderConsistencyReport()` at `cover-letter.js:421–435` checks keyword presence, not verbatim phrase mirroring. |

---

### US-P6: Consistency of Persuasive Register

| Criterion | Status | Evidence |
|---|---|---|
| Terminology consistency across CV, cover letter, and screening answers | ✅ Pass | Two complementary checks: (1) `conversation_manager.py:run_persuasion_checks()` (1506–1558): `_VARIANT_GROUPS` batch check for 14 abbreviation/expansion pairs across all rewrites. (2) `cover-letter.js:452–483` (`_renderConsistencyReport`): `_TERM_PAIRS` check including CV, cover letter, and screening answer `textarea[id^="sc-text-"]` elements. |
| Clarification-answer context propagated to all generated content | ✅ Pass | `post_analysis_answers` from session state is passed to: `recommend_customizations()`, cover letter prompt (`master_data_routes.py:1595–1600`), and `generate_professional_summary()` (`llm_client.py:856–860`). |
| Role-level language calibration | ⚠️ Partial | `_position_style_context()` at `llm_client.py:215–222` injects domain-appropriate framing (academic/government/industry) into rewrite and summary prompts. The cover letter word count target and summary length guidance are role-level calibrated. No enforcement check validates that produced language matches the target role's seniority. |
| Cover letter core argument cross-checked against summary framing | ❌ Fail | No implementation checks that the dominant narrative thread in the professional summary echoes in the cover letter's central argument. Both are generated independently with shared context but no cross-reference validation. |
| Confidence register uniform — assertive summary matched by assertive bullets | ❌ Fail | No cross-section check verifies that hedging flags in bullets are inconsistent with an assertive summary register. Passive-voice and hedging checks run per-rewrite in isolation without comparison to other sections. |
| Screening answer terminology harmonised with CV keyword choices | ⚠️ Partial | `_renderConsistencyReport()` checks 10 hard-coded abbreviation pairs across screening answers and CV but does not perform generalised keyword comparison between screening answers and the full approved CV vocabulary. |

---

## Generated Materials Evaluation

### Professional Summary

`generate_professional_summary()` prompt (`llm_client.py:882–903`) instructs: value-identity opening with strong verb; 3–5 ATS keywords woven in naturally; reference to 1–2 specific quantified achievements; forward-looking closing; no generic filler. This is a strong prompt foundation.

**Gaps:**

1. No post-generation validation on the produced summary text — the persuasion checks in `run_persuasion_checks()` apply to `proposed` rewrite candidates, not to the initially generated summary text.
2. `_validate_summary()` in `cv_orchestrator.py:3607–3656` checks that the summary does not open with "I", is between 40–250 words, avoids a dense single paragraph, and mentions top required skills. But it does not validate: value-identity framing, forward-looking statement presence, or differentiation signal.
3. `_checkSummarySpecificity` in `summary-review.js:166` (client-side) checks only a quantified claim, a role keyword, and 3 generic phrases — much narrower than the 19-phrase list in `llm_client.py:_GENERIC_FILLER_PHRASES`.

### Experience Bullets

The rewrite pipeline (`_propose_rewrites_via_chat()`) instructs the LLM with explicit quality criteria: strong action verb, active voice, no hedging, no passive, ≤30 words. Post-generation, `run_persuasion_checks()` applies ten checks to proposed rewrites. The layered approach (prompt → LLM → static checks → user review) is architecturally sound.

**Key strength:** `apply_rewrite_constraints()` is a hard pre-presentation filter — users never see rewrites that dropped metrics or proper nouns.

**Minor gap:** `check_word_count()` evaluates word count after `_strip_intro_phrase()` strips a leading label prefix. A bullet with a 5-word label and 28 following words passes (28 ≤ 30), but the full printed bullet is 33 words. Labels count toward print length on the page.

### Publications

`rank_publications_for_job()` provides job-relevance ranking with authority signals (first-author, journal, conference) and venue warnings. Maximum shortlist is configurable via `generation.max_publications` (default 10 in settings). The story recommends a targeted 2–5 shortlist; the implementation returns up to 10 without a "show only top N" gate in the Publications Review UI.

**Gap:** Publication omission rationale is not surfaced. A low-scoring publication is absent from the shortlist without any explanation of which domain gap caused the exclusion. Users cannot learn from the ranking.

**Gap:** Citation count is not included in authority signals. This would require an external API (CrossRef/Semantic Scholar) not yet integrated.

### Cover Letter

**Strengths:** Three opening styles (formal, hook, narrative) with hook and narrative directly implementing pattern-interrupt. Assertive CTA enforced both in prompt and client-side validation. Culture signals from job analysis auto-enriched into the tone hint. Approved CV rewrite bullets injected into the cover letter context so tailored phrasing echoes through.

**Weaknesses:** Word count target (300–400 standard) exceeds story ceiling (≤300). One-paragraph value proposition structure not enforced. JD language mirroring (verbatim 2–3 phrases) not explicitly prompted.

---

## Terminology and UX Clarity Findings

| Term | Location | Issue |
|---|---|---|
| "Persuasion warnings" badge label | `rewrite-review.js:247,253` | "Persuasion" is jargon for a general audience; flag_type values exposed with underscores replaced by spaces. "Writing quality flags" would be more immediately clear. |
| "Evidence" field in skill_add rewrite cards | `rewrite-review.js:437` | Shows comma-separated experience IDs (e.g., "exp_001, exp_002") — developer-facing format exposed to users. Should show experience titles. |
| `check_named_institution_position` severity | `llm_client.py:1318` | Fires as `severity: 'info'` — produces a blue badge, not amber. The story criterion is a persuasion concern that warrants 'warn' severity for brand names buried past word 15. |
| `check_has_result_clause` severity | `llm_client.py:1260` | `severity: 'warn'` in code (confirmed), displayed as amber. Appropriately prominent. |

---

## Additional Story Gaps / Proposed Story Items

- **GAP-P-01 (Proposed):** Post-generation persuasion validation on final summary — run `check_summary_generic_phrases`, first-word value-identity test, and forward-look presence check after `generate_professional_summary()` returns, not only on rewrite candidates.
- **GAP-P-02 (Proposed):** Cover letter word count reconciliation — align backend prompt target and UI validation pass band to the story's 300-word ceiling for standard roles, or formally update the story to 300–400.
- **GAP-P-03 (Proposed):** CAR structure proactive rewrite — when `check_car_structure()` fires, offer a suggested CAR-structured rewrite, not only a flag. Converts the check from informational to actionable.
- **GAP-P-04 (Proposed):** Urgency/stakes language preservation — add phrase detector to `apply_rewrite_constraints()` or a new `check_urgency_language()` that identifies high-stakes context phrases and prevents their removal.
- **GAP-P-05 (Proposed):** Awards omission decision surfacing — when user has awards in master data and target domain is non-research, surface an explicit include/exclude decision parallel to the publications gate question.
- **GAP-P-06 (Proposed):** Third-party validation phrase preservation — add a phrase list ("selected by", "invited to", "cited by", "adopted by") to `apply_rewrite_constraints()` so rewrites cannot silently remove authority-conferring passive-attribution phrases.
- **GAP-P-07 (Proposed):** Cross-section register consistency advisory — after rewrite review, check whether hedging flags in bullets are inconsistent with a confident summary register; surface as a single session-level advisory.
- **GAP-P-08 (Proposed):** Narrative thread surfaced at Customise phase — move `narrative_thread_advisory` to fire during Experiences tab review, not only at rewrite time, so users can act on it by adjusting which experiences they include.
- **GAP-P-09 (Proposed):** Publication shortlist "top N" gate — add a configurable "show top 5" view in the Publications Review tab to match the story's recommended 2–5 shortlist signal.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, web/cover-letter.js, web/rewrite-review.js, scripts/utils/cv_orchestrator.py, scripts/routes/master_data_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-P1: Narrative arc & identity | 4 | 2 | 0 | 0 | 0 |
| US-P2: Social proof & authority | 5 | 1 | 0 | 1 | 0 |
| US-P3: Loss-aversion & urgency | 1 | 2 | 0 | 1 | 0 |
| US-P4: Rhetorical bullet quality | 5 | 0 | 0 | 2 | 0 |
| US-P5: Cover letter architecture | 6 | 2 | 0 | 1 | 0 |
| US-P6: Register consistency | 2 | 2 | 2 | 0 | 0 |

**Key evidence references:**

- US-P1 value-identity prompt → `llm_client.py:887`
- US-P1 narrative thread advisory → `cv_orchestrator.py:4513–4545`
- US-P1 narrative arc advisory → `cv_orchestrator.py:4547–4590`
- US-P1 hedging/passive checks → `llm_client.py:1156–1194, 1264–1305`
- US-P2 apply_rewrite_constraints → `llm_client.py:952–1000`
- US-P2 institution placement → `llm_client.py:1307–1362`
- US-P2 publication ranking → `llm_client.py:1666–1830`
- US-P2 publications shortlist in chat → `conversation_manager.py:922–942`
- US-P2 publications gate question → `conversation_manager.py:763–774`
- US-P3 CAR check → `llm_client.py:1364–1407`
- US-P3 positive metric framing → `llm_client.py:1473–1501`
- US-P4 strong action verb → `llm_client.py:1117–1153`; verb list → `llm_client.py:1011`
- US-P4 word count → `llm_client.py:1196–1225`
- US-P4 passive voice → `llm_client.py:1155–1194`
- US-P4 result clause → `llm_client.py:1227–1262`
- US-P4 keyword appended → `llm_client.py:1444–1471`
- US-P4 repeated verb (orchestrator) → `cv_orchestrator.py:4444–4478`
- US-P5 opening guidance → `master_data_routes.py:105–109`
- US-P5 cover letter validation → `cover-letter.js:529–727`
- US-P5 word count target → `master_data_routes.py:111–122`; `cover-letter.js:623–625`
- US-P5 CTA check → `cover-letter.js:651–676`
- US-P6 terminology consistency → `conversation_manager.py:1506–1558`; `cover-letter.js:452–483`
- US-P6 post-analysis answers propagation → `master_data_routes.py:1595–1600`; `llm_client.py:856–860`
- Summary validation → `cv_orchestrator.py:3607–3656`
