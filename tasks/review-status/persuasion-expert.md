<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-04-20 17:30 ET

**Executive Summary:** US-P4 (Rhetorical Quality) is fully implemented with four backend persuasion checks (strong verb, passive voice, word count, result clause) running on every proposed rewrite. The remaining five stories are partially implemented or have gaps: US-P5 (Cover Letter) has a hard failure because the generation prompt hardwires a salutation opening that bypasses the pattern-interrupt requirement, and US-P1/US-P3/US-P6 lack narrative coherence, positive-sum framing, and cross-document consistency checks.

---

## Application Evaluation

### US-P1 — Narrative Arc and Identity Alignment

| AC | Status | Evidence |
|----|--------|----------|
| P1-AC1: Summary opens with value-identity statement, not a job title or name | ⚠️ Partial | `llm_client.py:761` prompts "Open with a strong positioning statement (title + years of experience)" — title-first framing, not value-identity framing per the story. No backend check validates the opening against a value-identity pattern. |
| P1-AC2: At least one forward-looking statement in the summary | ⚠️ Partial | `llm_client.py:767` instructs "Close with a forward-looking statement aligned to the target role." Instruction exists in prompt; no post-generation check verifies presence. |
| P1-AC3: System warns if more than two equally-weighted narrative threads are present | 🔲 Not implemented | No narrative-thread detection or warning anywhere in the backend or frontend source. |
| P1-AC4: Zero instances of "responsible for", "helped to", "assisted with", "was involved in" in proposed rewrites | ⚠️ Partial | `check_passive_voice` (`llm_client.py:1015`) and `check_hedging_language` (`llm_client.py:1124`) catch these patterns — but only on **proposed rewrites** at the Rewrites stage. Original master bullets that pass through unchanged (accepted without rewrite) are never checked. |

**Story assessment: Partial.** The summary generation prompt provides partial coverage; structural narrative-coherence and identity-fragmentation checks are absent.

---

### US-P2 — Social Proof and Authority Signals

| AC | Status | Evidence |
|----|--------|----------|
| P2-AC1: `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric | ✅ Pass | `llm_client.py:827–885` — numeric token set from original must be a subset of proposed; rewrite is discarded otherwise. |
| P2-AC2: Named recognisable organisations appear within first 15 words | ⚠️ Partial | `check_named_institution_position` at `llm_client.py:1165` checks a hardcoded set of ~50 brand names (FAANG, pharma, top journals, top conferences). Organisations not in that set are not detected. Warning fires to user in rewrite panel (`rewrite-review.js:85`). |
| P2-AC3: Conditional omission decisions for Publications/Awards surfaced to user with rationale | ⚠️ Partial | `rank_publications_for_job` (`llm_client.py:~1480`) ranks publications with `relevance_score` and `rationale`. Publications below the selection threshold are silently dropped — the system does not explicitly surface "these publications were excluded because…" to the user. |
| P2-AC4: Publication list ranked by job-relevance (keyword + domain + authority signals) | ✅ Pass | `rank_publications_for_job` at `llm_client.py:1480–1590` sends a prompt embedding domain, required skills, and ATS keywords; sorts output by `relevance_score` desc, then `year` desc. LLM determines `is_first_author`. |
| P2-AC5: Each recommended publication shows at least one authority signal | ✅ Pass | `authority_signals` array at `llm_client.py:1562–1568` appends `first_author`, `journal: <name>`, or `conference: <name>` per publication. `venue_warning` fires when neither field is present. |
| P2-AC6: System flags bullets where a number is present in master data but absent in the proposed rewrite | ⚠️ Partial | `apply_rewrite_constraints` (`llm_client.py:827`) silently discards the offending rewrite — no user-visible "a metric was stripped" flag surfaces. The user sees fewer proposals but is not told why. |

**Story assessment: Mostly passing.** Core metric-preservation and publication-ranking mechanics are solid. Gaps: brand list coverage is limited; silent omission of excluded publications and stripped-metric rewrites provides no user feedback.

---

### US-P3 — Loss-Aversion and Urgency Framing

| AC | Status | Evidence |
|----|--------|----------|
| P3-AC1: System identifies and proposes CAR (Challenge-Action-Result) structure for bullets where challenge language exists | ⚠️ Partial | `check_car_structure` at `llm_client.py:1214` detects CAR patterns and flags their absence — but fires as `severity='info'` (not `'warn'`), and does **not** propose a CAR rewrite. Detection only. |
| P3-AC2: Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless loss-framing is impressive | 🔲 Not implemented | No positive-sum vs. loss-framing preference check exists anywhere in `llm_client.py`, `conversation_manager.py`, or the rewrite prompt (`llm_client.py:1639–1779`). |
| P3-AC3: Summary rewrite is checked against generic filler phrases; flagged if more than one appears | ✅ Pass | `check_summary_generic_phrases` at `llm_client.py:1257` maintains a `_GENERIC_FILLER_PHRASES` set and fires `severity='warn'` when more than one phrase matches. Called from `conversation_manager.py:1071` in `run_persuasion_checks`. |

**Story assessment: Partial.** Generic-phrase checking passes; CAR detection is informational only; positive-sum framing is absent.

---

### US-P4 — Rhetorical Quality of Bullet Points

| AC | Status | Evidence |
|----|--------|----------|
| P4-AC1: Every proposed bullet begins with a verb from an approved strong-action-verb list | ✅ Pass | `check_strong_action_verb` at `llm_client.py:978`; `_STRONG_ACTION_VERBS` set at `llm_client.py:886` covers ~120 curated verbs across achievement, leadership, innovation, and operational categories. |
| P4-AC2: System flags any proposed bullet exceeding 30 words for compression review | ✅ Pass | `check_word_count` at `llm_client.py:1056`; 30-word threshold. Warning rendered in rewrite-panel persuasion warnings section (`rewrite-review.js:85–105`). |
| P4-AC3: System flags passive voice constructions in proposed rewrites | ✅ Pass | `check_passive_voice` at `llm_client.py:1015` checks `was X`, `were X`, `responsible for`, `was tasked with`, etc. Called for all rewrites in `conversation_manager.py:1043`. |
| P4-AC4: System flags bullets where no result clause (outcome, impact, or metric) is present | ✅ Pass | `check_has_result_clause` at `llm_client.py:1086`; detects numeric tokens, outcome verbs, and causal phrases. Severity is `'info'`. |

**Story assessment: Full pass.** All four checks are implemented, wired into `run_persuasion_checks`, and surface in the rewrite review panel.

**Note on check visibility:** Persuasion warnings are displayed in a collapsible `⚠️` summary panel at the top of the Rewrite Review tab (`rewrite-review.js:83`). The "Acknowledged" button only lowers panel opacity — it does not gate the "Submit All Decisions" button. Warnings are advisory and non-blocking.

---

### US-P5 — Cover Letter Persuasion Architecture

| AC | Status | Evidence |
|----|--------|----------|
| P5-AC1: System rejects any draft where the first word is "I" and offers a rewrite prompt | ❌ Fail | Backend prompt at `master_data_routes.py:1524` instructs: `"Start directly with the salutation line: 'Dear {hiring_manager},' "`. Every generated letter starts with `Dear`, not a pattern-interrupt. Client-side `_validateCoverLetter` at `cover-letter.js:454` tests only for generic salutations ("Dear Hiring Manager" etc.) — it does not enforce a non-salutation, pattern-interrupt opening. The AC directly conflicts with the generation prompt's hardwired salutation. |
| P5-AC2: Cover letter references at least the company name and one specific role requirement in a non-generic way | ⚠️ Partial | `_validateCoverLetter` Rule 2 (`cover-letter.js:476`) checks that the company name appears ≥2 times. No check verifies a **specific role requirement** from the job description appears. |
| P5-AC3: Word count check enforced; letter exceeding 300 words triggers compression review flag | ⚠️ Partial | `_validateCoverLetter` Rule 3 (`cover-letter.js:492`) uses a **250–400 word range**, not the 300-word max specified in US-P5. Generation prompt at `master_data_routes.py:1524` also targets "~300–400 words." |
| P5-AC4: Closing sentence includes a specific proposed next step (flagged if absent) | ✅ Pass | `_validateCoverLetter` Rule 4 (`cover-letter.js:504`) scans the last paragraph for CTA patterns: "interview", "discuss", "look forward to", "contact me", etc. |

**Story assessment: Fail (hard failure on core criterion).** The generation architecture hardwires a salutation opening that structurally blocks the pattern-interrupt requirement.

---

### US-P6 — Consistency of Persuasive Register

| AC | Status | Evidence |
|----|--------|----------|
| P6-AC1: System enforces that clarification-answer context is applied consistently across all generated content | ⚠️ Partial | Post-analysis answers are passed to `recommend_customizations` (`llm_client.py:~1040`) and `_propose_rewrites_via_chat` (`llm_client.py:1710`) via `user_preferences`. For cover letter generation, only a 6-item `answers_snippet` is included (`master_data_routes.py:1507`). Summary generation (`llm_client.py:725`) does not receive post-analysis answers at all. |
| P6-AC2: Cover letter core argument is cross-checked against summary framing; mismatch flagged | 🔲 Not implemented | No comparison between cover letter body and professional summary in any route or utility. `_renderConsistencyReport` (`cover-letter.js:268`) checks company name, job title, ATS keywords — not narrative framing. |
| P6-AC3: Prior screening-answer terminology compared against CV keyword choices; divergences presented as harmonisation suggestion | 🔲 Not implemented | Screening tab exists in Finalise stage but no terminology-harmonisation logic is wired. `_renderConsistencyReport` does not include screening-answer comparison. |

**Story assessment: Mostly not implemented.** Cross-document register consistency is limited to company name / ATS keyword spot-checks.

---

## Generated Materials Evaluation

### Cover Letter

Provided by `cover-letter.js` + `master_data_routes.py`:
- ✅ Tone selection (5 presets: Startup/Tech, Pharma/Biotech, Academia, Financial, Leadership)
- ✅ Hiring manager personalisation
- ✅ Prior session reuse ("use as starting point")
- ✅ Post-generation quality validation panel (4 checks)
- ✅ Save to DOCX

Structural weaknesses from a persuasion standpoint:
- Letter is hardwired to open `"Dear [name],"` — conventional salutation, not a pattern interrupt. Highest-impact persuasion failure in generated materials.
- Word count target (300–400) is 100 words above the story's 300-word maximum.
- No enforcement of a "one focused value-proposition paragraph" structure.
- No check that the letter mirrors 2–3 phrases directly from the job description verbatim.

### Professional Summary

- ✅ AI-generated per application; ATS keyword weaving in prompt (`llm_client.py:765`)
- ✅ Forward-looking close instruction (`llm_client.py:767`)
- ✅ Generic filler phrase check (`check_summary_generic_phrases`)
- ✅ Refinement loop with user instructions (`summary-review.js`)
- ⚠️ Opening instruction is title-first ("strong positioning statement (title + years of experience)"), not value-identity-first per US-P1
- ⚠️ Post-analysis clarification answers are NOT passed to `generate_professional_summary`

### Experience Bullets (Rewrites)

- ✅ Eight persuasion checks run on all proposed rewrites (`conversation_manager.py:980`)
- ✅ Word-level inline diff display per rewrite card
- ✅ Persuasion warning panel (collapsible) before submission
- ✅ Constraint prevents metric removal (`apply_rewrite_constraints`)
- ⚠️ Warnings panel is informational and non-blocking
- ⚠️ Original master bullets not checked — only LLM-proposed rewrites are evaluated

---

## Additional Story Gaps / Proposed Story Items

### GAP-P-01: Unchecked original bullets

Original master CV bullets included without a rewrite are never run through persuasion checks. A candidate could include bullets full of hedging language or passive voice that pass through unchallenged.

**Proposed story — US-P7 (Passive Review of Included Originals):** System runs the four bullet-quality checks against all included original bullets and surfaces a summary of findings before the user leaves the Customise stage.

### GAP-P-02: Pattern-interrupt cover letter opening

The generation prompt hardwires a salutation opening. Implementing US-P5-AC1 requires separating the salutation token from the first content paragraph so the latter can be a specific claim or observation.

**Proposed story — US-P8 (Pattern-Interrupt Cover Letter Generator):** The generation prompt separates the salutation (formatting) from the first content paragraph, which must open with a specific claim or observation, validated client-side.

### GAP-P-03: Positive-sum metric framing preference

No rewrite constraint or prompt instruction prefers gain framing ("increased latency by 3×") over loss framing ("reduced latency by 66%").

**Proposed story — US-P9 (Positive-Sum Framing Check):** Add `check_positive_sum_framing` that detects reduction/loss framings for metrics and proposes an equivalent positive reframing for user review.

### GAP-P-04: Narrative thread fragmentation detection

No cross-experience narrative coherence check exists. The LLM `recommend_customizations` already returns an overall `reasoning` field describing the strategy — this could anchor a narrative-thread warning.

**Proposed story — US-P10 (Narrative Arc Coherence Warning):** System detects when selected experiences span three or more non-overlapping role domains and warns the user that the CV may signal identity fragmentation.

### GAP-P-05: Cover letter / summary framing cross-check

Cover letter is generated independently of the professional summary. Both can lead with different role identities.

**Proposed story — US-P11 (Cross-Document Framing Alignment):** After cover letter generation, compare the first paragraph claim against the professional summary's opening statement and flag if they lead with different role identities or contradictory value propositions.

---

## Summary Table

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, web/rewrite-review.js, web/experience-review.js, web/achievements-review.js, web/summary-review.js, web/cover-letter.js, scripts/routes/master_data_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-P1 Narrative Arc | 0 | 3 | 0 | 1 | 0 |
| US-P2 Social Proof | 3 | 3 | 0 | 0 | 0 |
| US-P3 Loss-Aversion | 1 | 1 | 0 | 1 | 0 |
| US-P4 Bullet Quality | 4 | 0 | 0 | 0 | 0 |
| US-P5 Cover Letter | 1 | 2 | 1 | 0 | 0 |
| US-P6 Register Consistency | 0 | 1 | 0 | 2 | 0 |
| **Totals (24 ACs)** | **9** | **10** | **1** | **4** | **0** |

**Key evidence references:**

| Finding | File | Line |
|---------|------|------|
| `apply_rewrite_constraints` metric guard | `scripts/utils/llm_client.py` | 827 |
| `check_strong_action_verb` | `scripts/utils/llm_client.py` | 978 |
| `check_passive_voice` | `scripts/utils/llm_client.py` | 1015 |
| `check_word_count` (30-word limit) | `scripts/utils/llm_client.py` | 1056 |
| `check_has_result_clause` | `scripts/utils/llm_client.py` | 1086 |
| `check_hedging_language` | `scripts/utils/llm_client.py` | 1124 |
| `check_named_institution_position` | `scripts/utils/llm_client.py` | 1165 |
| `check_car_structure` (info-only) | `scripts/utils/llm_client.py` | 1214 |
| `check_summary_generic_phrases` | `scripts/utils/llm_client.py` | 1257 |
| `_STRONG_ACTION_VERBS` set | `scripts/utils/llm_client.py` | 886 |
| Summary prompt: "title + years" opening | `scripts/utils/llm_client.py` | 761 |
| Summary prompt: forward-looking close | `scripts/utils/llm_client.py` | 767 |
| `rank_publications_for_job` | `scripts/utils/llm_client.py` | ~1480 |
| `authority_signals` in publication output | `scripts/utils/llm_client.py` | ~1562 |
| `run_persuasion_checks` orchestration | `scripts/utils/conversation_manager.py` | 980 |
| Cover letter hardwired "Dear X," prompt | `scripts/routes/master_data_routes.py` | 1524 |
| Cover letter validation 4 rules | `web/cover-letter.js` | 449–530 |
| Word-count range 250-400 (not 300 max) | `web/cover-letter.js` | 492 |
| Persuasion warnings collapsible panel | `web/rewrite-review.js` | 83 |
| Consistency report (company/title/ATS) | `web/cover-letter.js` | 268 |

**Evidence standard:** Every conclusion supported by source evidence with file and line citation. Review conducted from direct source inspection on 2026-04-20.
