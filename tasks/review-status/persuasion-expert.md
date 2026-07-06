<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-07-06 14:30 ET

**Executive Summary:** Source-verified review against all six US-P stories. The system has a substantial and well-implemented persuasion-check engine (static checks in `llm_client.py`, dynamic validation in `cover-letter.js` and `rewrite-review.js`). The core LLM prompts correctly specify value-identity openings, forward-looking statements, and strong-verb quality criteria. Major gaps are: (1) no server-side enforcement that the cover letter body does not open with "I" — it is client-side UI only; (2) the publication ranking prompt does not surface citation count or industry partner co-authorship per US-P2; (3) the narrative-thread advisory only fires at generate time, not proactively during the Customise phase; (4) no cross-tab enforcement that clarification answers propagate to screening answers (US-P6).

---

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

| Criterion | Status | Evidence |
|---|---|---|
| Identity match in summary | ✅ Pass | Prompt at `llm_client.py:887`: "Open with a value-identity statement: strong verb + differentiating value claim … NOT a title + years-of-experience formula" |
| Arc coherence / narrative thread advisory | ⚠️ Partial | `cv_orchestrator.py:4508–4516`: advisory fires when ≥3 themes within 20% of top. But fires only at generate time, not during the Customise tab where decisions are made. User cannot act on it early enough. |
| Forward-pull framing in summary | ✅ Pass | Prompt at `llm_client.py:890`: "Close with a forward-looking statement aligned to the target role" |
| No identity fragmentation signal | ✅ Pass | Narrative-thread advisory (`cv_orchestrator.py:4508`) warns about competing narratives when three equally-weighted themes detected |
| Summary opening filler-phrase check | ✅ Pass | `_GENERIC_FILLER_PHRASES` at `llm_client.py:1076`; `check_summary_generic_phrases()` at `llm_client.py:1410`; client-side `_checkSummarySpecificity` at `summary-review.js:166–193` |
| Warning for hedging language in rewrites | ✅ Pass | `check_hedging_language()` at `llm_client.py:1265`; `check_passive_voice()` at `llm_client.py:1156` — both feed into persuasion_warnings on the Rewrites tab |

**Gap:** The narrative-thread advisory is computed at `cv_orchestrator.py:4485–4517` at rewrite-build time — too late for the user to change which experiences they include. It should also be surfaced in the Experiences tab during customisation.

---

### US-P2: Social Proof and Authority Signals

| Criterion | Status | Evidence |
|---|---|---|
| apply_rewrite_constraints preserves numeric metrics | ✅ Pass | `apply_rewrite_constraints()` at `llm_client.py:952–998`: rejects proposals that remove numbers or proper nouns |
| Named orgs within first 15 words | ✅ Pass | `check_named_institution_position()` at `llm_client.py:1308`; branded-org list and 15-word window |
| Conditional publication omission surfaced to user | ✅ Pass | `publications-review.js:72–73`: user sees recommended vs. total count and a context note; `is_recommended` divider at line 125. Non-recommended are shown pre-excluded, not silently dropped |
| Publication ranking by job-relevance, not recency/citations | ⚠️ Partial | `rank_publications_for_job()` at `llm_client.py:1791`: sorts by `relevance_score` desc, year desc. LLM scored by job relevance. However the prompt does NOT ask the LLM to factor in citation count or industry-partner co-authorship as additional authority signals — only first-author and journal/conference name (`lines:1754–1760`). US-P2 criterion 4 is partly absent. |
| Each publication shows authority signal alongside rationale | ✅ Pass | `publications-review.js:148`: first-author star shown; score, confidence, rationale rendered; authority_signals built at `llm_client.py:1754–1760` |
| Bullets where number exists in master but absent in rewrite are flagged | ✅ Pass | `apply_rewrite_constraints` at `llm_client.py:984–988` blocks such rewrites from reaching the user |
| Third-party language preserved ("selected by", "invited to", "cited by") | ⚠️ Partial | `apply_rewrite_constraints` preserves proper nouns and numbers but does not specifically scan for third-party authority verb phrases. These strings could be silently dropped if the proper-noun check does not catch them. |

---

### US-P3: Loss-Aversion and Urgency Framing

| Criterion | Status | Evidence |
|---|---|---|
| CAR structure proposal | ✅ Pass | `check_car_structure()` at `llm_client.py:1364`; flags bullets lacking challenge + result structure; feeds into persuasion warnings on the Rewrites tab |
| Stakes-language preservation | ⚠️ Partial | `apply_rewrite_constraints` preserves numbers and proper nouns, but does not specifically preserve urgency/stakes language ("before FDA submission", "under regulatory deadline"). These clause-level context signals can be dropped by a rewrite that passes the numeric/proper-noun check. |
| Differentiation from generic applicant pool | ⚠️ Partial | The summary prompt asks for a differentiating value claim (`llm_client.py:887`) but there is no active check that the generated summary contains a differentiating phrase. The `_checkSummarySpecificity` check in `summary-review.js:166` only checks for a quantified claim, role keyword, and three specific generic phrases. |
| Positive-sum framing preferred | ✅ Pass | `check_positive_metric_framing()` at `llm_client.py:1474`; flags negative-framing verbs paired with metrics and proposes reframes |

---

### US-P4: Rhetorical Quality of Bullet Points

| Criterion | Status | Evidence |
|---|---|---|
| Every proposed bullet begins with approved strong action verb | ✅ Pass | `check_strong_action_verb()` at `llm_client.py:1118`; 100+ verb list at `_STRONG_ACTION_VERBS` (`llm_client.py:1011`) |
| Bullets over 30 words flagged | ✅ Pass | `check_word_count()` at `llm_client.py:1197`; default `max_words=30` per story requirement |
| Passive voice flagged | ✅ Pass | `check_passive_voice()` at `llm_client.py:1156`; catches "responsible for", "helped to", "was involved in", "assisted with", "was tasked with" |
| Missing result clause flagged | ✅ Pass | `check_has_result_clause()` at `llm_client.py:1228`; flags bullets with no number or outcome word |
| Keyword appendage at end of bullet flagged | ✅ Pass | `check_keyword_appended()` at `llm_client.py:1445`; checks if an ATS keyword appears only in final 3 tokens |
| Parallel structure within an experience | 🔲 Not Implemented | No check exists for consistent grammatical form within a single experience's bullets. US-P4 criterion 4 is not implemented. |
| Front-loading of impressive content | 🔲 Not Implemented | No check verifies that the most impressive word/phrase appears early in the bullet. US-P4 criterion 2 is not implemented. |

---

### US-P5: Cover Letter Persuasion Architecture

| Criterion | Status | Evidence |
|---|---|---|
| Opening pattern interrupt — no "I am writing to apply…" | ⚠️ Partial | Client-side: `_validateCoverLetter()` at `cover-letter.js:522` checks for generic salutation openers and whether body starts with "I". Backend `_OPENING_GUIDANCE` at `master_data_routes.py:105–108` provides hook/narrative/formal modes. However NO server-side rejection of a generated body opening with "I" — the backend prompt for formal mode only says to start with the salutation; it never explicitly states the first word of the letter body must not be "I". The "I"-first gate is client-side UI only. |
| One-paragraph value proposition | ⚠️ Partial | Backend prompt (`master_data_routes.py:1663`): "Write a compelling, personalised cover letter (3–4 paragraphs…)". No explicit instruction that paragraph 2 must contain exactly one focused value claim. |
| Mirrors job posting language (2–3 exact phrases) | ⚠️ Partial | Backend prompt injects ATS keywords and required skills (`master_data_routes.py:1609–1610`), but the instruction is "Reference concrete skills" — not "mirror 2–3 exact phrases from the JD". Front-end validation also does not check for JD phrase mirroring. |
| Word count enforced | ✅ Pass | Client-side at `cover-letter.js:607–631`: role-differentiated targets (≤300 standard, 300–400 exec, 400–500 academic). Backend instructs at `master_data_routes.py:1663`. |
| Assertive call-to-action closing | ✅ Pass | Client-side: `cover-letter.js:644–666` tests for assertive vs. passive CTA patterns; passive causes fail state. Backend at `master_data_routes.py:1668`: "Close with a specific, confident request…Avoid passive language." |
| Filler phrase check | ✅ Pass | `_CL_FILLER` list at `cover-letter.js:687–695`; 19 filler phrases checked |
| Company name and specific role requirement reference | ✅ Pass | Client-side at `cover-letter.js:563–603`: company name and job title checked; `para1Check` at line 590 verifies company name and role title appear in first 100 words of first body paragraph |
| Specific achievement in letter | ✅ Pass | `achievementCheck` at `cover-letter.js:670`; checks for quantified metrics and action verbs |

---

### US-P6: Consistency of Persuasive Register

| Criterion | Status | Evidence |
|---|---|---|
| Clarification-answer context applied consistently | ⚠️ Partial | `post_analysis_answers` fed into summary prompt (`llm_client.py:856–860`) and cover letter prompt (`master_data_routes.py:1595–1600`). Not explicitly threaded into screening-answer generation. |
| Cover letter core argument cross-checked against summary | ⚠️ Partial | `_renderConsistencyReport()` at `cover-letter.js:348`: checks company name, job title, ATS keywords, date format, and terminology consistency. Does NOT cross-check narrative framing angle (summary emphasises "statistical rigour"; cover letter emphasises "ML engineering" — mismatch not caught). |
| Screening-answer terminology compared to CV keywords | ✅ Pass | `_renderConsistencyReport()` at `cover-letter.js:444`: screening answer `textarea[id^="sc-text-"]` elements included in cross-document terminology check |
| Role-level language calibration | — N/A | The system calibrates page budget and word counts by role level; no explicit "seniority of language" check on generated text. Delegated to LLM via `role_level` context in prompts. |

---

## Generated Materials Evaluation

### Professional Summary

The `generate_professional_summary()` prompt (`llm_client.py:882–903`) instructs: value-identity opening with strong verb; 3–5 ATS keywords woven in; 1–2 specific quantified achievements; forward-looking closing; no generic filler. This is a solid prompt foundation.

**Gaps in generated output quality:**
1. The forward-looking closing is required in the prompt but not validated by any client-side check. A user editing the summary can remove it without any warning.
2. The filler-phrase list in `summary-review.js:187` contains only 3 items, while the back-end `_GENERIC_FILLER_PHRASES` has 20 items. The client-side check will miss most generic phrases.
3. The summary prompt does not instruct the LLM to commit to a dominant identity thread when the candidate has multiple roles. The narrative-thread advisory fires at the rewrite stage, not at summary generation.

### Experience Bullets

Persuasion check pipeline is strong: strong-action-verb, passive-voice, word-count, result-clause, keyword-appendage, CAR structure, and positive-metric-framing checks all implemented in `llm_client.py:1102–1501`. Checks feed into `persuasion_warnings` on the Rewrites tab (`rewrite-review.js:155–165`).

**Gaps:**
1. Parallel structure within an experience is not checked.
2. Front-loading of impressive content is not checked.
3. `check_has_result_clause()` at `llm_client.py:1259` has severity `'info'` not `'warn'`, meaning it does not surface as a visible warning badge and may be missed by users.

### Publications

The `rank_publications_for_job()` prompt scores by job-domain + required-skills + ATS keywords, resolves first-author status. UI shows first-author star, score, confidence badge, rationale, venue warning.

**Gaps:**
1. Ranking prompt does not ask LLM to consider citation count as an authority signal.
2. Industry partner co-authorship is not surfaced.
3. Non-recommended publications show rationale for inclusion but not a clear explanation of why they were excluded — users cannot learn what domain gap caused the exclusion.

### Cover Letter

The backend prompt (`master_data_routes.py:1641–1670`) injects tone guidance, company-specific context, ATS keywords, approved rewrites, and role requirements. `_OPENING_GUIDANCE` provides meaningful differentiation between formal, hook, and narrative styles.

**Gaps:**
1. "I am writing to apply" is not explicitly blocked server-side — only a formal salutation instruction for formal mode.
2. Paragraph 2 one-focused-value-claim structure is not instructed.
3. JD language mirroring (2–3 exact phrases) is not instructed explicitly.

---

## Terminology and UX Clarity Findings

### Ambiguous / Developer-Centric Labels

| Term | Location | Issue |
|---|---|---|
| "ATS" (without expansion) | `index.html:92`, position bar badge | Acronym appears without expansion. Users encountering the badge may not know what ATS means. |
| "Rewrite" tab | `index.html:220`, workflow step | Users may not understand "Rewrites" means "AI suggestions for keyword alignment". "AI Suggestions" or "Keyword Alignment" would be clearer. |
| "Harvest" | `index.html:146` | The metaphor is opaque to first-time users. "Save to Master CV" or "Update Profile" would be immediately clear. |
| "Customise" | `index.html:128` | Too generic — does not convey that this step is about selecting which experiences and skills to include. "Select Content" or "Choose What to Include" would be more directive. |
| "Persuasion checks: X passive voice, Y hedging" | `rewrite-review.js:247` | Internal `flag_type` values exposed (underscores replaced by spaces). Users may not understand "hedging". "Weak language warnings" would be clearer. |
| "Compact" toggle | `rewrite-review.js:295` | Does not describe the mode it enables; "Single-line view" or "Quick review mode" would better set expectations. |
| "Evidence" in rewrite skill_add cards | `rewrite-review.js:437` | Shows comma-separated experience IDs (e.g., "exp_001, exp_002") — developer-facing format exposed to users. |
| "Candidate to confirm" badge | `rewrite-review.js:397` | Phrasing is unclear. "Low confidence — verify" or "Needs your confirmation" would better signal the required action. |

---

## Additional Story Gaps / Proposed Story Items

- **US-P7 (proposed):** Narrative Commit Signal in Summary — system should explicitly commit to the dominant identity thread when the candidate has multiple narrative streams, rather than presenting all threads equally.
- **US-P8 (proposed):** Differentiation Check in Summary — check that the generated summary contains at least one phrase that differentiates the candidate from the generic applicant pool.
- **US-P9 (proposed):** Forward-Looking Statement Preservation — warn the user if they edit out the forward-looking closing sentence from the summary.
- **US-P10 (proposed):** Parallel Structure Within Experience — check that bullets within a single experience follow consistent grammatical form.
- **US-P11 (proposed):** CAR Proposal Generation — not just flag absence of CAR structure but generate a CAR-structured rewrite proposal for the user to accept.
- **US-P12 (proposed):** Third-Party Language Preservation — extend `apply_rewrite_constraints` to detect and preserve third-party authority phrases ("selected by", "invited to", "cited by", "adopted by [organisation]").
- **US-P13 (proposed):** Narrative Thread Cross-check Between Summary and Cover Letter — flag when the dominant framing in the cover letter differs from the identity framing in the CV summary.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, web/summary-review.js, web/publications-review.js, web/cover-letter.js, web/rewrite-review.js, scripts/routes/master_data_routes.py, scripts/utils/cv_orchestrator.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-P1 | 4 | 1 | 0 | 0 | 0 |
| US-P2 | 4 | 2 | 0 | 0 | 0 |
| US-P3 | 2 | 2 | 0 | 0 | 0 |
| US-P4 | 5 | 0 | 0 | 2 | 0 |
| US-P5 | 4 | 3 | 0 | 0 | 0 |
| US-P6 | 1 | 2 | 0 | 0 | 1 |

**Key evidence references:**
- US-P1 identity match → `llm_client.py:887`
- US-P1 narrative thread advisory → `cv_orchestrator.py:4508–4516`
- US-P1 forward-pull → `llm_client.py:890`
- US-P2 apply_rewrite_constraints → `llm_client.py:952–998`
- US-P2 institution placement → `llm_client.py:1308–1362`
- US-P2 publication ranking → `llm_client.py:1628–1792`
- US-P2 publication UI authority signals → `publications-review.js:148`
- US-P3 CAR check → `llm_client.py:1364–1407`
- US-P3 positive metric framing → `llm_client.py:1474–1501`
- US-P4 strong action verb check → `llm_client.py:1118`; verb list `llm_client.py:1011`
- US-P4 word count check → `llm_client.py:1197`
- US-P4 passive voice check → `llm_client.py:1156`
- US-P4 result clause check → `llm_client.py:1228`
- US-P4 keyword appended check → `llm_client.py:1445`
- US-P5 opening guidance (backend) → `master_data_routes.py:105–108`
- US-P5 cover letter validation (client) → `cover-letter.js:519–718`
- US-P5 CTA assertive check → `cover-letter.js:644–666`; backend `master_data_routes.py:1668`
- US-P6 consistency report → `cover-letter.js:348–503`
- US-P6 clarification answers to summary → `llm_client.py:856–860`

**Evidence standard:** Every conclusion supported by file:line evidence.

# UI Review — Persuasion Expert Persona

**Reviewer:** Persuasion Expert (Scott Adams / Robert Cialdini school)
**Date:** 2026-07-01
**Branch:** feature/multi-user-deployment
**Method:** Source-first — read code before checking gap lists

---

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

**Criterion 1 — Identity match (value-identity summary opening)**
PARTIAL. `generate_professional_summary()` in `llm_client.py` instructs the LLM to "Open with a value-identity statement: strong verb + differentiating value claim" — NOT a title + years-of-experience formula. This is an LLM prompt instruction, not an enforced constraint. The `check_summary_generic_phrases()` static method flags up to 20 generic filler phrases but does not positively verify the opening pattern. No runtime check confirms the first sentence follows the value-identity form.

**Criterion 2 — Arc coherence (narrative thread)**
PARTIAL. The customization prompt asks for a `summary_focus` field and an `applicant_tagline` ("NOT the job title; describes who the applicant is"), both of which scaffold narrative coherence. However, no check enforces that experience bullets collectively advance a single narrative thread; this is entirely LLM-dependent.

**Criterion 3 — Forward-pull framing**
IMPLEMENTED. `generate_professional_summary()` prompt explicitly requires: "Close with a forward-looking statement aligned to the target role." Acceptance criterion met at the prompt level but not enforced at runtime.

**Criterion 4 — No identity fragmentation warning**
NOT IMPLEMENTED. The acceptance criterion "System warns if more than two equally-weighted narrative threads are present" does not exist in any source file. No check counts or weights competing narrative threads.

**Failure modes guarded against:**

- "Responsible for / helped to / assisted with / was involved in" — IMPLEMENTED via `check_hedging_language()` and `check_passive_voice()` in `llm_client.py`, both called in `run_persuasion_checks()`.
- Summary opening with title/name — NOT enforced at runtime (prompt-instruction only).

---

### US-P2: Social Proof and Authority Signals

**Criterion 1 — Named institutions front-loaded**
PARTIAL. `check_named_institution_position()` in `llm_client.py` (line 1280) checks whether a branded org name appears within the first 15 words of a bullet. It fires for experience bullets (`'exp' in location.lower()`). The hardcoded org list covers FAANG, pharma (Pfizer, Genentech, Amgen, Moderna), top universities, and flagship journals/conferences. Gap: the check fires with `severity: 'info'` (not 'warn'), so it will not trigger the amber badge in the rewrite card — it produces a blue informational badge instead.

**Criterion 2 — Quantified impact preserved**
IMPLEMENTED. `apply_rewrite_constraints()` rejects any rewrite that removes a numeric token present in the original. This is a hard gate — rewrites failing this check are filtered before reaching the user. The `check_has_result_clause()` check additionally flags bullets lacking any metric or outcome indicator.

**Criterion 3 — Publication shortlist ranked by job-relevance**
IMPLEMENTED. `rank_publications_for_job()` in `llm_client.py` sends publications to the LLM with the job domain, title, required skills, and ATS keywords. The LLM returns a relevance_score (1–10) per publication. Results are sorted by `(-relevance_score, -year)`. Returns up to `max_results` (default 10 — configurable).

**Criterion 4 — Publication authority signals shown**
IMPLEMENTED. The method assembles `authority_signals` per result: `first_author` (from LLM determination), `journal: <name>`, or `conference: <name>`. These are returned to the UI alongside each publication. A `venue_warning` is set when no journal/conference is found.

**Criterion 5 — Third-party language preserved**
PARTIAL. `apply_rewrite_constraints()` preserves proper nouns and numbers, which incidentally preserves phrases like "selected by" or "cited by" if they start with recognisable names. But there is no specific check for third-party validation phrases ("selected by…", "invited to…", "adopted by…") as independent persuasion signals.

**Criterion 6 — Specificity as credibility**
PARTIAL. The rewrite prompt instructs "Include a quantified result or metric" and `apply_rewrite_constraints()` prevents metric removal. But no check flags bullets where a vague qualifier has replaced a specific claim that was already present but without a number (e.g., "significantly improved" instead of "improved by 40%" where the original had no number either). That edge case is not catchable by the numeric-preservation rule.

**Criterion — Conditional omission surfaced to user**
NOT FULLY IMPLEMENTED. Publication decisions are surfaced via the Publications Review tab and a publications-gate question in post-analysis Q&A (for industry roles). However, there is no explicit "rationale for omission" surface in the UI — the user can accept/reject individual publications but is not shown a system-generated rationale for why a publication was ranked low.

**Criterion — System flags bullets where number exists in master data but absent in rewrite**
IMPLEMENTED via `apply_rewrite_constraints()` — the rewrite is rejected outright, not flagged. This is stronger than the acceptance criterion.

---

### US-P3: Loss-Aversion and Urgency Framing

**Criterion 1 — CAR structure detection**
IMPLEMENTED. `check_car_structure()` in `llm_client.py` checks for context indicators ("faced", "encountered", "due to", "required", "optimize") combined with a result indicator. Fires as `severity: 'info'` and is applied to experience bullets in `run_persuasion_checks()`.

**Criterion 2 — Cost-of-inaction stakes preservation**
NOT IMPLEMENTED. There is no specific check that preserves urgency/stakes language ("before FDA submission", "before product launch") in rewrites. `apply_rewrite_constraints()` preserves proper nouns and numbers but not urgency phrases.

**Criterion 3 — Differentiation from generics**
PARTIAL. `check_summary_generic_phrases()` guards against filler phrases in summaries. No explicit check creates a differentiation signal in the Skills section.

**Criterion 4 — Positive-sum framing**
IMPLEMENTED. `check_positive_metric_framing()` in `llm_client.py` detects negative-sum verbs (cut, reduce, eliminate, shrink, slash) paired with a metric and flags the combination with a reframing suggestion. Applied to experience bullets in `run_persuasion_checks()`.

**Failure mode — rewrite strips challenge description leaving only action**
PARTIALLY GUARDED. The CAR check will flag if context is absent in the *proposed* text, but it does not compare whether the original had context that was lost in the rewrite.

**Acceptance criteria met:**

- CAR structure identification — YES (check_car_structure, info severity)
- Positive-sum framing preference — YES (check_positive_metric_framing, info severity)
- Generic filler phrase detection in summary — YES (check_summary_generic_phrases)

---

### US-P4: Rhetorical Quality of Bullet Points

**Criterion 1 — Strong opening verb**
IMPLEMENTED. `check_strong_action_verb()` in `llm_client.py` checks the first word against a 150+ verb set. Fires as `severity: 'warn'`. Applied to all rewrites in `run_persuasion_checks()`. The `_strip_intro_phrase()` helper correctly handles "Category Label: Verb…" bullets by skipping the label prefix (1–5 words before a colon).

Additionally, `cv_orchestrator.py check_persuasion()` runs a separate, independent verb check on raw master-data bullets (not just proposed rewrites), using a smaller curated `_STRONG_VERBS` set. Both pipelines provide complementary coverage.

**Criterion 2 — Front-loading**
NOT IMPLEMENTED. No check measures word position of the most impressive/distinctive phrase. The rewrite prompt instructs front-loading but does not enforce it at runtime.

**Criterion 3 — Conciseness (≤30 words)**
IMPLEMENTED. `check_word_count()` flags bullets over 30 words (`severity: 'warn'`). Applied to all rewrites in `run_persuasion_checks()`. The rewrite generation prompt also instructs "Keep it to one concise sentence (≤30 words)."

**Criterion 4 — Parallel structure**
NOT IMPLEMENTED. No grammatical parallelism check exists. This would require NLP parsing beyond simple regex.

**Failure modes guarded against:**

- Keyword appended at end — YES: `check_keyword_appended()` checks the final 3 tokens for keywords absent in the original. Fires as `severity: 'warn'`.
- Passive voice — YES: `check_passive_voice()` and `check_hedging_language()` both catch passive/hedging forms.
- No result clause — YES: `check_has_result_clause()`, fires as `severity: 'info'`.

**Acceptance criteria met:**

- Strong action verb check — YES
- Word count flag (>30 words) — YES
- Passive voice flag — YES
- Result clause flag — YES (info, not warn)

---

### US-P5: Cover Letter Persuasion Architecture

**Criterion 1 — Opening pattern interrupt (no "I am writing to apply")**
IMPLEMENTED (UI-side). `_validateCoverLetter()` in `cover-letter.js` implements a two-part opening check: (a) flags generic salutations ("Dear Hiring Manager", "To Whom It May Concern", etc.) and (b) specifically checks that the body paragraph does not start with the word "I". The "I-first" check fires as a named failing check in the UI validation panel. On the backend, `_OPENING_GUIDANCE` provides three styles: `formal` (salutation), `hook` (pattern-interrupt), and `narrative` (vivid scene), with `hook` and `narrative` directly satisfying this criterion.

**Criterion 2 — One focused value proposition paragraph**
NOT ENFORCED. The LLM prompt requests 3–4 paragraphs but does not specifically demand "one focused point" in paragraph 2. No structural check enforces this.

**Criterion 3 — Mirroring the job posting language**
PARTIAL. The cover letter prompt injects `req_skills` and `keywords` into context and instructs the LLM to "Reference concrete skills and achievements." It does not explicitly instruct to mirror 2–3 verbatim phrases from the job description. The `approved_rewrites_block` (injecting tailored CV bullets) provides partial language continuity.

**Criterion 4 — Conciseness (≤300 words)**
PARTIALLY DIVERGES FROM STORY. The `_cover_letter_word_count_instruction()` backend function returns "300–400 words" for standard roles. The UI validation in `_validateCoverLetter()` uses 250–300 as the green-zone target, ≤400 as warn for standard roles. The user story specifies a hard maximum of 300 words for all roles. The implementation targets a range 33% higher than the story prescribes for standard roles.

**Criterion 5 — Call to action**
IMPLEMENTED (UI-side). `_validateCoverLetter()` checks for assertive CTA patterns (interview, discuss, available for, will follow up) and fails on passive patterns (hear from you, look forward to hearing). The backend prompt also instructs the LLM to use specific, confident closing language.

**Acceptance criteria met:**

- First-word "I" rejection — YES (UI validation in cover-letter.js)
- Company name reference — YES (name mentioned N-times check + prompt instruction)
- Word count check enforced — YES, but with higher ceiling than story specifies
- Specific next step in closing — YES (CTA check in cover-letter.js)

---

### US-P6: Consistency of Persuasive Register

**Criterion 1 — Confidence register uniformity**
NOT IMPLEMENTED. No cross-section check compares confidence/assertiveness level between summary and bullets.

**Criterion 2 — Role-level calibration**
PARTIAL. The customization prompt includes `role_level` context and the summary prompt includes `role_level` so the LLM can calibrate scope. No runtime check validates that language matches seniority of the target role.

**Criterion 3 — Cross-document keyword consistency**
PARTIAL. The batch terminology consistency check in `run_persuasion_checks()` flags inconsistent use of abbreviation vs. full form (ML vs. "machine learning", etc.) within the *rewrite batch*. This does not extend to cover letter and screening answers.

**Criterion 4 — Narrative thread continuity (CV → cover letter)**
PARTIAL. The cover letter prompt receives `summary_text` and `top_skills`, providing implicit continuity. No cross-document narrative consistency check exists. `approved_rewrites_block` provides some thread continuity by echoing approved CV language into the letter.

**Acceptance criteria met:**

- Clarification-answer context applied across session — YES (post_analysis_answers passed to all LLM calls)
- Cover letter vs. summary framing cross-check — NO
- Screening answer vs. CV keyword harmonisation — NO

---

### check_persuasion() — New repeated_verb Detection (2026-07-01)

The `check_persuasion()` method in `cv_orchestrator.py` now includes a sixth check — repeated opening verb detection — alongside the existing five (weak_verb, no_strong_verb, no_metric, vague_language, too_short).

**Implementation review:**

- Uses `Counter` over `exp_first_words` (list of `(first_word_lower, bullet_index)` tuples) to count verb frequency per experience block.
- Threshold: fires when a verb appears **3 or more times** within a single experience. The first occurrence is not flagged ("First occurrence is fine; only flag repetitions").
- Severity: `'warning'` (appropriate — matches story persuasion signal priority).
- Suggestion text accurately communicates the problem and what to do.
- Correctly handles bullets that already have other findings (appends to existing finding dict) and removes newly-flagged bullets from `strong_count` (line 4399).
- Scoped to single experience block — appropriate. Different experiences commonly open with the same verb and cross-experience repetition is less of a persuasion issue.

**Minor concern:** The threshold of 3+ will miss the case where the same verb opens exactly 2 bullets in one role — a common enough pattern worth an `info` flag at threshold 2. This is a tuning decision, not a bug.

The implementation is coherent and correctly integrated into the findings/finding_by_bullet dual-update logic. No functional defects observed.

---

## Generated Materials Evaluation

### Summary Quality

The `generate_professional_summary()` method produces summaries via an LLM prompt that requires: value-identity opening, 3–5 ATS keywords, 1–2 specific quantified achievements, a forward-looking closing statement, and no generic filler. Post-generation, `check_summary_generic_phrases()` flags summaries with 2+ filler phrases (1 is permitted). This is a reasonable lenient threshold.

**Gap:** No dedicated runtime check confirms the summary was not opened by a job title or candidate name. The `check_strong_action_verb()` check is applied to summary rewrites when `location == 'summary'` in `run_persuasion_checks()`, which would catch a noun-first opening, but only for rewrite proposals — not for the initially generated summary.

### Experience Bullets Quality

The rewrite pipeline (`_propose_rewrites_via_chat()`) instructs the LLM with explicit quality criteria: strong action verb, active voice, no hedging, no passive, ≤30 words. Post-generation, `run_persuasion_checks()` applies all checks to proposed rewrites. This layered approach (prompt instruction → LLM compliance → post-hoc static check → user review) is sound.

**Key strength:** `apply_rewrite_constraints()` as a hard filter before presentation means users never see rewrites that dropped metrics or proper nouns.

**Minor gap:** `check_word_count()` uses `text.split()` after `_strip_intro_phrase()` strips a leading label prefix. A 30-word bullet with a 5-word label prefix is evaluated on 25 words and may pass the check, even though the full bullet (with label) exceeds 30 print-words. Labels count toward print length.

### Publications

`rank_publications_for_job()` provides job-relevance ranking with authority signals and venue warnings. The maximum shortlist is configurable via `generation.max_publications` (default 10). The story recommends a targeted 2–5 shortlist; the implementation returns up to 10 without a front-end "show only top N" gate in the Publications Review tab.

**Gap:** Citation count is not included in authority signals — requires an external API (CrossRef/Semantic Scholar) not yet integrated.

**Gap:** Publication omission rationale is not surfaced to the user. A rejected (low-scoring) publication is simply absent from the shortlist without explanation.

### Cover Letter

**Strengths:**

- Three opening styles (formal, hook, narrative) — hook and narrative directly implement pattern-interrupt.
- CTA closing enforced at UI level with specific assertive-vs-passive pattern matching.
- Tailored CV bullets injected into cover letter context so approved rewrites echo into the letter.
- Culture signals from job analysis enriched into the tone hint.

**Weaknesses:**

- Word count target (300–400 standard) exceeds user story ceiling (300). This is the most concrete divergence from the story specification.
- "One focused value proposition" paragraph structure is not enforced.
- Job description language mirroring (verbatim 2–3 phrases) not explicitly prompted.

### Terminology Clarity Assessment

Overall terminology is clear and appropriate:

- "ATS" explained inline in the position bar tooltip.
- "Emphasize / Include / De-emphasize / Omit" vocabulary is precise.
- Workflow step labels use plain language.
- The cover letter LLM prompt instructs acronym expansion on first use — applied to generated content.

**One concern:** "persuasion warnings" as a label in the rewrite review panel is jargon. A user unfamiliar with persuasion science may not immediately understand why "repeated verb" or "keyword appended" is a "persuasion" issue. An alternative like "writing quality flags" would be more immediately clear to a general audience.

---

## Summary of Gaps Found

| # | Story | Finding | Severity |
| --- | --- | --- | --- |
| 1 | US-P1 | No runtime narrative-thread counter — "warns if >2 equally-weighted threads" unimplemented | Medium |
| 2 | US-P1 | Value-identity summary opening not verified at runtime (prompt-instruction only) | Low |
| 3 | US-P2 | Publication omission rationale not surfaced to user with explanation | Medium |
| 4 | US-P2 | `check_named_institution_position` fires as `info` not `warn` — low badge visibility | Low |
| 5 | US-P2 | Third-party validation phrases ("selected by…", "invited to…") not specifically preserved/flagged | Low |
| 6 | US-P3 | Urgency/stakes language preservation not checked across rewrites | Low |
| 7 | US-P4 | No parallel structure check | Low |
| 8 | US-P4 | Front-loading (most impressive phrase first) not checked at runtime | Low |
| 9 | US-P5 | Cover letter word count target (300–400) exceeds story ceiling (≤300) for standard roles | Medium |
| 10 | US-P5 | "One focused value proposition" in paragraph 2 not enforced | Low |
| 11 | US-P5 | Job description language mirroring (verbatim 2–3 phrases) not explicitly prompted | Low |
| 12 | US-P6 | No cross-document register consistency check (CV → cover letter → screening) | Medium |
| 13 | US-P6 | Cover letter vs. summary framing mismatch not checked | Low |
| 14 | General | "Persuasion warnings" label is jargon; "writing quality flags" would be clearer | Low |
| 15 | US-P4 | repeated_verb threshold of 3 may be too lenient; 2 occurrences also warrants an info flag | Low |
| 16 | US-P2 | Citation count not in authority signals (requires external API not integrated) | Info |

---

## Strengths (Positive Findings)

1. **Hard constraint on metric removal** — `apply_rewrite_constraints()` is a pre-presentation hard filter, not a warning. This is the strongest possible implementation of the metric-preservation requirement.
2. **Ten-check persuasion pipeline** — `run_persuasion_checks()` applies strong_action_verb, passive_voice, word_count, result_clause, hedging, institution_placement, CAR structure, keyword_appended, positive_metric_framing, and generic_summary to every proposed rewrite. This is comprehensive.
3. **repeated_verb detection** — The new `check_persuasion()` repeated verb check (2026-07-01) is correctly implemented with appropriate threshold (3+), correct finding/strong_count bookkeeping, and per-experience scoping. No functional defects observed.
4. **Publication ranking by relevance** — `rank_publications_for_job()` uses LLM-assigned relevance scores anchored to job domain + ATS keywords, not by recency or citation count alone. Authority signals are returned alongside each result.
5. **Batch terminology consistency** — The `_VARIANT_GROUPS` check in `run_persuasion_checks()` catches abbreviation vs. full-form inconsistencies across the rewrite batch (e.g., "ML" vs. "machine learning"), directly addressing US-P6 Criterion 3.
6. **Post-analysis Q&A context propagation** — Structured clarifying questions with choices enable user preferences to flow consistently into all downstream LLM calls, satisfying US-P6 Criterion 1.
7. **Dual-layer verb checking** — Both the orchestrator's `check_persuasion()` (on master data bullets) and `run_persuasion_checks()` (on proposed rewrites) flag weak/missing action verbs, providing belt-and-suspenders coverage at different workflow stages.
