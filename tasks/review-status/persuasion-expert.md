<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-07-06 (Cycle 92 — full source-first re-review)

**Executive Summary:** The cv-builder has a solid persuasion-check engine. All 10+ static check functions in `llm_client.py` are fully wired into the rewrite-review pipeline (per-card badges, aggregate banner, acknowledgement gate). The `generate_professional_summary()` prompt correctly encodes value-identity, forward-looking, and no-generic-filler directives. The cover-letter validation suite covers 8 client-side rules plus 3 backend persuasion checks. Primary gaps are: (1) CAR structure check fires `severity: 'info'` only — no enforcement weight; (2) cover letter body receives only 3 of 10 backend checks; (3) no post-generation runtime validation that the professional summary satisfies its own authoring instructions; (4) narrative thread cross-check between summary and cover letter absent; (5) urgency/stakes and third-party-validation phrases not specifically preserved.

---

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

| Criterion | Status | Evidence |
| --- | --- | --- |
| Identity match — summary opens with value-identity statement | ⚠️ Partial | `llm_client.py:887` prompt instructs "Open with a value-identity statement: strong verb + differentiating value claim — NOT a title + years-of-experience formula." **No post-generation runtime check** validates the produced summary text. |
| Arc coherence — narrative progression through selected experiences | ⚠️ Partial | The LLM prompt encodes this implicitly. No runtime detector for flat-inventory vs. progression narrative. |
| Forward-pull framing — forward-looking statement required | ⚠️ Partial | `llm_client.py:890` instructs "Close with a forward-looking statement aligned to the target role." **No post-generation check** validates presence of a forward-looking sentence. |
| No identity fragmentation — dominant narrative thread enforced | 🔲 Not Implemented | No runtime logic inspects selected-experience set for competing narrative threads. The acceptance criterion "system warns if more than two equally-weighted narrative threads" is absent. |
| Zero "responsible for / helped to / assisted with" in rewrites | ✅ Pass | `check_passive_voice()` (`llm_client.py:1156–1194`) and `check_hedging_language()` (`llm_client.py:1264–1305`) detect all four patterns. Applied to every proposed rewrite via `run_persuasion_checks()` (`conversation_manager.py:1444–1456`). |
| Generic filler phrases flagged in summary rewrites | ✅ Pass | `check_summary_generic_phrases()` (`llm_client.py:1410–1442`): 19-phrase list; >1 found = fail; `severity: 'warn'`. Applied to summary proposals in `run_persuasion_checks()` (`conversation_manager.py:1482–1484`). |

**Gap:** `check_summary_generic_phrases()` is invoked only when a *rewrite proposal* targets `location == 'summary'`. It is never run on the initially generated summary body — so a summary with "results-driven" or "passionate about" passes through unseen.

**Gap:** No forward-looking statement detector exists at runtime. The authoring instruction is prompt-only.

---

### US-P2: Social Proof and Authority Signals

| Criterion | Status | Evidence |
| --- | --- | --- |
| Named institution front-loaded within first 15 words | ✅ Pass | `check_named_institution_position()` (`llm_client.py:1307–1362`): hardcoded branded-org list (~40 names); fires as `severity: 'info'` for exp-location rewrites (`conversation_manager.py:1460–1462`). |
| Quantified impact preserved — no metric dropped in rewrite | ✅ Pass | `apply_rewrite_constraints()` (`llm_client.py:952–1000`): hard filter rejects proposals where any numeric token in `original` is absent from `proposed`. Applied to entire `propose_rewrites()` output before user sees it. |
| No new fabricated numeric claims in rewrites | ✅ Pass | `check_new_numeric_claims()` (`llm_client.py:1504–1539`, GAP-300b): warns when proposed introduces numeric tokens absent from original. `severity: 'warn'`. |
| Publications ranked by job-relevance (not recency/citation alone) | ✅ Pass | `rank_publications_for_job()` (`llm_client.py:1666–1830`): LLM scores relevance 1–10 using domain, title, ATS keywords; sorted by `-relevance_score, -year`. |
| Each publication shows authority signals alongside rationale | ✅ Pass | Returns `authority_signals` (first_author, journal, conference) and `rationale` per result. `venue_warning` set when no journal/conference found. |
| Publications shortlist surfaced proactively | ✅ Pass | `conversation_manager.py:922–942`: top-5 ranked publications surfaced in chat after `recommend_customizations`. |
| Publication/awards omission surfaced with rationale | ⚠️ Partial | Publication include/exclude gate exists (`conversation_manager.py:763–774`). For awards and low-scoring publications: no user-facing explanation of the omission decision. |
| Third-party validation phrases preserved ("selected by", "invited to") | 🔲 Not Implemented | `apply_rewrite_constraints()` preserves numbers and proper nouns but has no phrase detector for passive-attribution language. These phrases can be silently removed in rewrites. |

---

### US-P3: Loss-Aversion and Urgency Framing

| Criterion | Status | Evidence |
| --- | --- | --- |
| CAR structure identified and proposed for bullets | ⚠️ Partial | `check_car_structure()` (`llm_client.py:1364–1407`): detects CAR presence/absence. Applied in `run_persuasion_checks()` for exp bullets (`conversation_manager.py:1464–1466`). **BUT: `severity: 'info'` on fail** — does not increment warning count, does not show in aggregate banner, does not require acknowledgement. Reactive check only; the rewrite prompt does not proactively instruct CAR construction. |
| Urgency/stakes phrases preserved through rewrites | 🔲 Not Implemented | No constraint or check detects urgency context phrases ("before FDA submission", "production incident", "regulatory deadline") and prevents their removal. |
| Differentiation signal from generic applicant pool | ⚠️ Partial | `check_summary_generic_phrases()` guards against filler in summary *rewrites*. The summary prompt requests a "differentiating value claim" but no runtime check verifies presence of a differentiation phrase in the output. |
| Positive-sum metric framing preferred | ✅ Pass | `check_positive_metric_framing()` (`llm_client.py:1473–1501`): flags negative-framing verbs (cut, reduce, eliminate, shrink) adjacent to metrics; `severity: 'info'`. Wired for exp bullets in `run_persuasion_checks()`. |

**Critical gap:** CAR check effectiveness is undermined by info-only severity. The acceptance criterion "System identifies and proposes CAR structure for experience bullets where challenge language exists" is stated as a hard requirement, but the check is advisory only.

---

### US-P4: Rhetorical Quality of Bullet Points

All checks pass. Full wiring verified in `conversation_manager.py:1434–1503`.

| Check | Scope | Severity | Status |
| --- | --- | --- | --- |
| `check_strong_action_verb` | all proposals | warn | ✅ Pass |
| `check_passive_voice` | all proposals | warn | ✅ Pass |
| `check_word_count` (>30 words) | all proposals | warn | ✅ Pass |
| `check_has_result_clause` | all proposals | warn | ✅ Pass |
| `check_hedging_language` | all proposals | warn | ✅ Pass |
| `check_named_institution_position` | exp bullets | info | ✅ Pass |
| `check_car_structure` | exp bullets | info | ✅ Pass |
| `check_keyword_appended` | exp bullets w/ ATS kw | warn | ✅ Pass |
| `check_positive_metric_framing` | exp bullets | info | ✅ Pass |
| `check_summary_generic_phrases` | summary proposals | warn/info | ✅ Pass |
| `check_new_numeric_claims` | all proposals | warn | ✅ Pass |
| batch terminology consistency | all proposals | info | ✅ Pass |

**UI presentation is solid:** per-card persuasion badges inline on each rewrite card (`rewrite-review.js:440–443`); aggregate banner with warning count shown when warnings > 0 (`rewrite-review.js:244–263`); Submit button blocked until acknowledged (`rewrite-review.js:596–605`); user can override with explicit confirmation (`rewrite-review.js:609–616`).

**Minor gaps:**

- User-facing check labels are raw `flag_type` strings with underscores replaced by spaces ("car structure", "institution placement", "negative metric framing") — jargon for non-expert users. No tooltip or explanatory text.
- `check_word_count()` runs after `_strip_intro_phrase()` strips a leading label prefix. A bullet with a 5-word label + 28 substantive words passes (28 ≤ 30) but prints as 33 words on the page.
- Front-loading check (highest-value phrase in first 5–7 words) is not implemented beyond the branded-org proxy.
- Parallel structure within an experience is not implemented.

---

### US-P5: Cover Letter Persuasion Architecture

| Criterion | Status | Evidence |
| --- | --- | --- |
| Opening not generic ("I am writing to apply" etc.) | ✅ Pass | `cover-letter.js:534–551`: 6 generic salutation regex patterns rejected. |
| Body does not open with "I" | ✅ Pass | `cover-letter.js:553–569`: explicit I-first gate on first body token. |
| Company name + role title in paragraph 1 (first 100 words) | ✅ Pass | `cover-letter.js:592–613` (`para1Check`): fails if either is missing; warns if one is missing. |
| Company name ≥2 mentions | ✅ Pass | `cover-letter.js:572–590` (`companyCheck`). |
| Generic filler phrases rejected | ✅ Pass | `cover-letter.js:695–715`: 19-phrase list. |
| Named or quantified achievement present | ✅ Pass | `cover-letter.js:678–693`. |
| Assertive call-to-action in closing | ✅ Pass | `cover-letter.js:651–676`: 7 assertive patterns (pass), 4 passive patterns (fail with rejection message). |
| Word count enforced | ⚠️ Partial | Story ceiling: 300 words. Implementation targets 300–400 standard / 400–500 exec / 500–600 academic. Up to 450 words passes for standard roles. Systematic divergence from story spec. |
| Backend persuasion checks on CL body | ⚠️ Partial | Only 3 of 10 checks applied: `check_passive_voice`, `check_hedging_language`, `check_summary_generic_phrases` (`master_data_routes.py:1713–1715`). The other 7 are silent for cover letter body. |
| 2–3 verbatim JD phrases mirrored | 🔲 Not Implemented | ATS keywords are injected into the prompt, but no instruction to lift verbatim multi-word phrases. No post-generation check validates JD mirroring. |
| One focused second paragraph (single provable claim) | 🔲 Not Implemented | No paragraph-structure check. Generation prompt does not specify per-paragraph content structure. |

**Gap — 7 of 10 backend checks absent from cover letter.** Missing checks on the CL body: `check_strong_action_verb`, `check_word_count` (per-sentence), `check_has_result_clause`, `check_named_institution_position`, `check_car_structure`, `check_keyword_appended`, `check_positive_metric_framing`, `check_new_numeric_claims`. A cover letter opening "Was responsible for leading…" or containing fabricated metrics passes through without a backend warning.

---

### US-P6: Consistency of Persuasive Register

| Criterion | Status | Evidence |
| --- | --- | --- |
| Terminology consistency across CV, cover letter, screening answers | ✅ Pass | Two checks: (1) `run_persuasion_checks()` batch `_VARIANT_GROUPS` check (`conversation_manager.py:1506–1558`). (2) `_renderConsistencyReport()` `_TERM_PAIRS` check across CV + CL + screening answer textareas (`cover-letter.js:452–483`). |
| Clarification-answer context propagated to all generated content | ✅ Pass | `post_analysis_answers` passed to `recommend_customizations()`, cover letter prompt (`master_data_routes.py:1595–1600`), and `generate_professional_summary()` (`llm_client.py:856–860`). |
| Role-level language calibration | ⚠️ Partial | `_position_style_context()` (`llm_client.py:215–222`) injects domain framing into rewrite and summary prompts. No enforcement check validates that produced language matches the target seniority. |
| Cover letter core argument cross-checked against summary framing | ❌ Fail | No implementation. Both are generated independently with shared context but no cross-reference validation that the dominant narrative thread in the summary echoes in the cover letter. |
| Confidence register uniform (summary assertive → bullets assertive) | ❌ Fail | No cross-section check. Hedging flags on bullets run per-rewrite in isolation — no comparison against the summary register. A confident summary with hedged bullets is not detected. |
| Screening-answer terminology harmonised with CV keywords | ⚠️ Partial | Consistency report checks 10 hard-coded abbreviation pairs. Does not perform generalised keyword comparison between screening answers and the full approved CV vocabulary. |

---

## Generated Materials Evaluation

### Professional Summary

`generate_professional_summary()` prompt (`llm_client.py:882–903`) instructs: value-identity opening; 3–5 ATS keywords woven in; 1–2 specific quantified achievements; forward-looking closing; no generic filler. This is a strong prompt foundation.

**Weaknesses:**

1. No post-generation validation on the produced text. Persuasion checks in `run_persuasion_checks()` apply to rewrite *candidates*, not to the freshly-generated summary.
2. `check_summary_generic_phrases()` (19-phrase list) only fires on rewrite proposals. A generated summary with "passionate about" or "results-driven" is undetected.
3. Forward-looking statement presence is not verified at runtime.

### Experience Bullets

Architecturally strong: prompt guides the LLM toward compliant bullets → `apply_rewrite_constraints()` filters metric/name drops → `run_persuasion_checks()` runs 10+ checks → per-card badges show flags → acknowledgement gate enforces review.

**Minor gaps:**

- `check_word_count()` strips intro label before counting — bullets can exceed 30 total printed words and still pass.
- `check_car_structure()` fires info-only — CAR failure has no enforcement weight.

### Publications

`rank_publications_for_job()` returns authority signals and rationale. Publication shortlist appears proactively in chat. Up to 10 publications returned; the story recommends a 2–5 shortlist — no "show top N" gate in the Publications Review tab.

Low-scoring publications are omitted without an explanatory note. Citation counts are absent (would require external API integration).

### Cover Letter

**Strengths:** 8 client-side quality checks including assertive CTA enforcement and role-differentiated word count. Three backend persuasion checks appended to the validation panel (GAP-339, recently implemented). Opening styles (hook, narrative) directly implement pattern-interrupt.

**Weaknesses:** 7 of 10 backend persuasion checks absent from the CL body. Word count target diverges from story spec (300-word ceiling). No JD phrase-mirroring check. No per-paragraph structure enforcement.

---

## Terminology and UX Clarity Findings

| Term / Label | Location | Issue |
| --- | --- | --- |
| Raw `flag_type` values as badges | `rewrite-review.js:442` | "car structure", "institution placement", "negative metric framing" are opaque to non-experts. No tooltip explaining what each flag means or how to fix it beyond the `details` string. |
| "Persuasion warnings" / "Persuasion checks" | `rewrite-review.js:247`, `fetchAndReviewRewrites` | "Persuasion" is jargon. "Writing quality flags" or "Clarity checks" would be clearer to a general user. |
| `check_car_structure` severity label | `llm_client.py:1398,1406` | Always `severity: 'info'` — produces a grey/blue info badge, not amber. Inconsistent with the enforcement intent of the story criterion. |
| Backend CL check labels in validation panel | `cover-letter.js:720–729` | Only 3 flag types are mapped to readable labels (`passive_voice`, `hedging`, `generic_phrases`). Any unmapped flag type from future checks would display as a raw key. |

---

## Top Three Findings

**Finding 1 — CAR check fires info-only, effectively removing all enforcement (US-P3).**
`check_car_structure()` (`llm_client.py:1364–1407`) returns `severity: 'info'` for both pass and fail outcomes. In `renderRewritePanel()`, only `severity: 'warn'` entries are counted in the warning total and shown in the blocking banner. CAR structure failures appear as quiet info badges that users are not required to acknowledge and that do not count toward the "N persuasion checks flagged" display. The acceptance criterion "System identifies and proposes CAR structure for experience bullets where challenge language exists" is not met at an enforcement level. Recommendation: escalate to `severity: 'warn'` and add a suggested CAR-structured rewrite prompt.

**Finding 2 — Cover letter body receives only 3 of 10 backend persuasion checks (US-P5).**
`master_data_routes.cover_letter_generate` runs `check_passive_voice`, `check_hedging_language`, and `check_summary_generic_phrases` on the generated cover letter body. The remaining 7 checks — including `check_strong_action_verb`, `check_has_result_clause`, `check_keyword_appended`, `check_positive_metric_framing`, `check_new_numeric_claims` — are never applied to the CL body. A cover letter opening with "Was responsible for leading…", containing fabricated metrics, or appending keywords at the end of sentences passes through with no backend warning. Recommendation: apply all applicable checks from the 10-function suite to the cover letter body in the generate endpoint.

**Finding 3 — Generated professional summary is not post-validated against its own authoring instructions (US-P1, US-P3).**
The `generate_professional_summary()` prompt explicitly requires a value-identity opening and a forward-looking closing, and prohibits generic filler. None of these properties are verified on the generated output. `check_summary_generic_phrases()` (19-phrase list) only fires on *rewrite proposals*, not on the initial generated summary body. This means a summary that opens with "Results-driven biostatistician with 10+ years of experience seeking a challenging role…" passes the pipeline undetected. Recommendation: run `check_summary_generic_phrases()`, a simple forward-looking-statement detector, and a value-identity opener check immediately after `generate_professional_summary()` returns, and surface any failure in the summary-review tab.

---

## Additional Proposed Gaps

- **GAP-P-01:** Post-generation persuasion validation on final summary — run checks after `generate_professional_summary()`.
- **GAP-P-02:** Cover letter word count reconciliation — align backend and UI to the story's 300-word ceiling for standard roles, or formally update the story.
- **GAP-P-03:** CAR structure enforcement — escalate `check_car_structure()` to `severity: 'warn'` and offer a suggested CAR rewrite.
- **GAP-P-04:** Urgency/stakes phrase preservation — add phrase detector to `apply_rewrite_constraints()` for high-stakes context phrases.
- **GAP-P-05:** Awards omission decision surfacing — explicit include/exclude gate parallel to the publications gate.
- **GAP-P-06:** Third-party validation phrase preservation — add a phrase list ("selected by", "invited to", "cited by") to `apply_rewrite_constraints()`.
- **GAP-P-07:** Cross-section register consistency advisory — session-level check comparing summary assertiveness against aggregate bullet-hedging flags.
- **GAP-P-08:** Apply all 10 backend checks to cover letter body.
- **GAP-P-09:** Narrative thread advisory surfaced at Customise phase, not only at rewrite time.
- **GAP-P-10:** JD phrase-mirroring check in cover letter (2–3 verbatim multi-word phrases from JD).

---

**Reviewed against source:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`, `web/cover-letter.js`, `web/rewrite-review.js`, `scripts/routes/master_data_routes.py`

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| --- | --- | --- | --- | --- |
| US-P1: Narrative arc & identity | 2 | 2 | 0 | 1 |
| US-P2: Social proof & authority | 5 | 1 | 0 | 1 |
| US-P3: Loss-aversion & urgency | 1 | 2 | 0 | 1 |
| US-P4: Rhetorical bullet quality | 5 | 0 | 0 | 2 |
| US-P5: Cover letter architecture | 6 | 2 | 0 | 2 |
| US-P6: Register consistency | 2 | 2 | 2 | 0 |
