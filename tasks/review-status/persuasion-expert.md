<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Persuasion Expert Review Status

**Last Updated:** 2026-06-30 09:45 ET

**Executive Summary:** The application has strong backend persuasion infrastructure — 8 static checks (`check_strong_action_verb`, `check_passive_voice`, `check_word_count`, `check_has_result_clause`, `check_hedging_language`, `check_car_structure`, `check_named_institution_position`, `check_summary_generic_phrases`) are implemented in `llm_client.py` and surfaced on the Rewrites tab with severity badges. `apply_rewrite_constraints` blocks numeric and proper-noun removal. Publication ranking via `rank_publications_for_job` ranks by job-relevance and exposes authority signals (first-author, journal/conference) in the review table. The cover letter generator has tone/opening style options and a real-time 4-point client-side validator (generic opener, company name, word count, CTA). Cross-document consistency checking (company, job title, ATS keywords, date formats) exists in the Finalise tab. However, several acceptance tests are not implemented: no check for "I" as first word of the cover letter; no identity-fragmentation warning for competing narrative threads; no forward-looking sentence gate in summary; no cross-document terminology harmonisation between screening answers and CV keywords; word count threshold mismatch (400 vs story's 300); and passive CTA patterns pass that should fail.

---

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

**Criterion 1 — Identity match (summary opens as target role identity)**
⚠️ Partial
- `generate_professional_summary` (llm_client.py:844–858) prompts: "Open with a value-identity statement: strong verb + differentiating value claim … NOT a title + years-of-experience formula" — good LLM guidance.
- No post-generation check verifies the produced summary actually opens with a value-identity statement. `check_summary_generic_phrases` only scans for filler phrases, not structure.

**Criterion 2 — Arc coherence (progression, not flat inventory)**
🔲 Not Implemented
- No check or prompt guidance ensures that experience bullets, in aggregate, advance a single dominant narrative thread. `recommend_customizations` (llm_client.py:499–594) evaluates per-item relevance but not cross-item narrative coherence.

**Criterion 3 — Future-pull framing (forward-looking sentence in summary)**
🔲 Not Implemented
- `generate_professional_summary` prompt (llm_client.py:851) instructs "Close with a forward-looking statement." This is prompt-only — no post-generation check verifies its presence ("positioned to…", "brings direct experience in…").

**Criterion 4 — No identity fragmentation (warn if >2 equally-weighted narrative threads)**
🔲 Not Implemented
- No multi-thread detection logic exists anywhere in the Python backend or JS frontend.

**Acceptance criteria summary for US-P1:**

| Criterion | Status | Evidence |
|---|---|---|
| Summary opens with value-identity statement, not job title or name | ⚠️ Partial | Prompt instructs (llm_client.py:850); no post-check validates |
| At least one forward-looking statement in summary | 🔲 Not Implemented | No post-generation check |
| System warns if >2 equally-weighted narrative threads | 🔲 Not Implemented | No such logic exists |
| Zero instances of "responsible for", "helped to", "assisted with", "was involved in" in proposed rewrites | ✅ Pass | `check_passive_voice` (llm_client.py:1136–1155) + `check_hedging_language` (1226–1266) catch all four; rewrite prompt explicitly forbids them (1820–1824) |

---

### US-P2: Social Proof and Authority Signals

**Criterion 1 — Named institutions surface-level visible (first 15 words)**
✅ Pass
- `check_named_institution_position` (llm_client.py:1268–1323) checks branded orgs within first `max_position=15` words, flags if found later. Called for experience bullets (conversation_manager.py:1314–1316). Includes Pfizer, Genentech, major pharma, universities, top journals/conferences (llm_client.py:1289–1300). Result shown as a badge on Rewrites tab (bundle.js:14286).

**Criterion 2 — Quantified impact preserved**
✅ Pass
- `apply_rewrite_constraints` (llm_client.py:913–961) rejects any proposal removing numeric tokens. Called in `_propose_rewrites_via_chat` (llm_client.py:1874–1884) filtering every proposal before storage.

**Criterion 3 — External validation at appropriate prominence; proactive publication shortlist**
⚠️ Partial
- Publications ranked by job relevance via `rank_publications_for_job` (llm_client.py:1530–1694); LLM prompt asks for 1–10 relevance using domain + keyword alignment, not just recency or citation count. Satisfies the "ranked by job-relevance" criterion.
- Publications review UI shows rank, relevance score, confidence, first-author badge, venue, rationale (publications-review.js:82–162). Conditional omission is visible with a divider row (publications-review.js:110–127). ✅
- Gap: The ranking prompt (llm_client.py:1589–1612) does not explicitly instruct the LLM to use citation count or industry co-authorship as ranking inputs. These are post-hoc added from bibtex data (llm_client.py:1655–1666) but not given to the LLM for ranking decisions.

**Criterion 4 — Publication authority signals surfaced per publication**
⚠️ Partial
- `authority_signals` built from `is_first_author` (LLM-determined) + `journal`/`booktitle` from bibtex (llm_client.py:1655–1666). First-author flag (★) shown in UI (publications-review.js:132).
- Citation count and co-authorship signals are not surfaced even where present in bibtex `note` or custom fields.

**Criterion 5 — Third-party language preserved**
⚠️ Partial
- `apply_rewrite_constraints` preserves proper nouns (llm_client.py:952–960), catching named organisations in "selected by…" phrases. However, the contextual third-party validation phrases themselves ("cited by", "invited to", "adopted by") are not specifically detected or guarded.

**Criterion 6 — Specificity as credibility**
✅ Pass
- `apply_rewrite_constraints` blocks metric removal. `check_has_result_clause` (llm_client.py:1188–1223) flags bulletswith no quantified result.

**Acceptance criteria summary for US-P2:**

| Criterion | Status | Evidence |
|---|---|---|
| `apply_rewrite_constraints` rejects proposals removing numeric metric | ✅ Pass | llm_client.py:946–949 |
| Named organisations within first 15 words | ✅ Pass | llm_client.py:1268–1323; conversation_manager.py:1314–1316 |
| Conditional omission of Publications surfaced with rationale | ✅ Pass | publications-review.js:110–127; rationale column rendered |
| Publication list ranked by job-relevance, not recency/citation | ✅ Pass | rank_publications_for_job; sorted by relevance_score desc (llm_client.py:1692–1693) |
| Each recommended publication shows at least one authority signal | ⚠️ Partial | First-author + venue shown; citation count, co-authorship not available |
| System flags bullets where number in master data absent in proposed rewrite | ✅ Pass | apply_rewrite_constraints blocks wholesale |

---

### US-P3: Loss-Aversion and Urgency Framing

**Criterion 1 — CAR (Challenge-Action-Result) structure proposed proactively**
❌ Fail
- `check_car_structure` (llm_client.py:1326–1368) detects CAR absence in *proposed* rewrites and flags it informational (severity: 'info', llm_client.py:1338). The check is reactive (what LLM proposed) not proactive (detect challenge language in master data and propose a CAR rewrite). Acceptance criterion says "System identifies and proposes CAR structure for bullets where challenge language exists in master data" — not met.

**Criterion 2 — Cost-of-inaction signals preserved**
⚠️ Partial
- `apply_rewrite_constraints` preserves numbers and proper nouns. Contextual urgency phrases ("before FDA submission") are partially protected (proper noun "FDA" preserved) but the full contextual phrase is not guaranteed if the LLM restructures the sentence.

**Criterion 3 — Differentiation from generics (at least one contrast signal in Skills or Summary)**
🔲 Not Implemented
- No check or prompt guidance for differentiation signals ("rare combination of…", contrast against typical applicant pool). `check_summary_generic_phrases` detects filler but not absence of differentiation.

**Criterion 4 — Positive-sum framing ("increased X" preferred over "reduced Y")**
🔲 Not Implemented
- No check or prompt instruction prefers positive-sum framing. `check_has_result_clause` verifies presence of a metric, not its framing direction. Rewrite prompt (llm_client.py:1820–1828) includes no positive-sum preference.

**Acceptance criteria summary for US-P3:**

| Criterion | Status | Evidence |
|---|---|---|
| System identifies and proposes CAR structure for bullets with challenge language in master data | ❌ Fail | check_car_structure is reactive on proposed text only; llm_client.py:1326–1368 |
| Rewrites prefer positive-sum metric framing | 🔲 Not Implemented | Not in prompts or checks |
| Summary rewrite checked against generic filler phrases; flagged if >1 appears | ✅ Pass | check_summary_generic_phrases (llm_client.py:1371–1403), severity='warn' if >2 found |

---

### US-P4: Rhetorical Quality of Bullet Points

**Criterion 1 — Strong opening verb**
✅ Pass
- `check_strong_action_verb` (llm_client.py:1078–1114) — 130+ verb set, `_strip_intro_phrase` helper. Called in `run_persuasion_checks` (conversation_manager.py:1293–1295). Rewrite prompt explicitly instructs strong verbs (llm_client.py:1820). Displayed as badge on Rewrites tab (bundle.js:14286).

**Criterion 2 — Front-loading (most impressive element appears first)**
🔲 Not Implemented
- No check evaluates whether the most impressive element appears early in the bullet. No "front-loading" heuristic exists.

**Criterion 3 — Conciseness (≤30 words)**
✅ Pass
- `check_word_count` (llm_client.py:1157–1186) flags bullets exceeding 30 words. Applied in `run_persuasion_checks` (conversation_manager.py:1301–1303).

**Criterion 4 — Parallel structure within an experience**
🔲 Not Implemented
- No check evaluates grammatical parallel structure across bullets within a single experience. Each bullet is checked in isolation.

**Acceptance criteria summary for US-P4:**

| Criterion | Status | Evidence |
|---|---|---|
| Every proposed bullet begins with strong action verb | ✅ Pass | check_strong_action_verb, llm_client.py:1078–1114 |
| System flags bullet exceeding 30 words for compression review | ✅ Pass | check_word_count, llm_client.py:1157–1186 |
| System flags passive voice constructions in proposed rewrites | ✅ Pass | check_passive_voice, llm_client.py:1116–1155 |
| System flags bullets where no result clause is present | ✅ Pass | check_has_result_clause, llm_client.py:1188–1223 |

---

### US-P5: Cover Letter Persuasion Architecture

**Criterion 1 — Opening pattern interrupt (not "I am writing to apply…")**
⚠️ Partial
- Three opening styles: formal salutation, attention hook, narrative opener (cover-letter.js:27–31). `_OPENING_GUIDANCE` (master_data_routes.py:98–102) instructs LLM appropriately for hook/narrative styles.
- Client-side `_validateCoverLetter` (cover-letter.js:492–509) checks for 6 generic salutation patterns. However, the acceptance criterion "System rejects any draft where the first word is 'I' and offers a rewrite prompt" is NOT implemented — the validator checks generic salutations, not a leading "I" in the letter body.

**Criterion 2 — One-paragraph value proposition (one focused point)**
🔲 Not Implemented
- Cover letter prompt says "3–4 paragraphs" (master_data_routes.py:1588) but does not constrain paragraph 2 to a single focused, provable claim. No post-generation structural check exists.

**Criterion 3 — Mirroring JD language (2–3 verbatim phrases)**
⚠️ Partial
- Cover letter prompt includes `req_skills` and `keywords` from job analysis (master_data_routes.py:1548–1549, 1573–1575). This increases terminology alignment but does not explicitly instruct the LLM to mirror 2–3 exact JD phrases verbatim (not paraphrased) to trigger cognitive fluency.

**Criterion 4 — Conciseness (≤4 paragraphs, ≤300 words)**
⚠️ Partial
- Backend prompt says "~250–300 words" (master_data_routes.py:1588). Client-side validator targets 250–400 words and flags red only at <200 or >450 (cover-letter.js:533–534). The story acceptance criterion says "exceeding 300 words triggers a compression review flag" — the UI allows to 400 before warning-level and 450 before fail-level.
- Inconsistency: backend prompt (300) vs. frontend validator (400 upper).

**Criterion 5 — Call to action (specific next step)**
⚠️ Partial
- `_validateCoverLetter` (cover-letter.js:542–555) checks for CTA patterns in the last paragraph. Cover letter prompt says "Close professionally with a call to action" (master_data_routes.py:1593).
- Critical gap: "I look forward to hearing from you" (a passive CTA — explicitly listed as a failure mode in the story) matches `hear from you` (cover-letter.js:547) and passes the CTA check. The validator should flag this pattern as passive rather than passing it.

**Acceptance criteria summary for US-P5:**

| Criterion | Status | Evidence |
|---|---|---|
| System rejects any draft where first word is "I" and offers a rewrite prompt | ❌ Fail | cover-letter.js:492–509 — checks generic salutations only; no "I" first-word gate |
| Cover letter references company name and one specific role requirement non-generically | ✅ Pass | Company name check (_validateCoverLetter:511–527); req_skills in prompt |
| Word count check; >300 words triggers compression review flag | ⚠️ Partial | UI threshold is 400 (not 300); cover-letter.js:533–534 |
| Closing sentence includes specific proposed next step (flagged if absent) | ⚠️ Partial | CTA check exists but "look forward to hearing from you" passes when it should fail; cover-letter.js:547 |

---

### US-P6: Consistency of Persuasive Register

**Criterion 1 — Confidence register uniform across documents**
⚠️ Partial
- Per-bullet passive/hedging checks exist. But no cross-document register alignment check: system does not compare summary confidence level against bullet language level and flag mismatches.

**Criterion 2 — Role-level calibration**
⚠️ Partial
- `recommend_customizations` includes `role_level` in job analysis; summary prompt includes it. The LLM receives context but no post-generation check verifies output language matches the target seniority level.

**Criterion 3 — Cross-document keyword consistency (CV, cover letter, screening)**
⚠️ Partial
- Cross-document consistency check in Finalise tab (`_renderConsistencyReport`, cover-letter.js:348–469) checks company name, job title, ATS keywords, date formats across CV + cover letter.
- Gap: Screening answers NOT included. No terminology harmonisation feature for screening-answer divergence from CV keywords.
- Gap: Cover letter core argument NOT cross-checked against summary framing.

**Criterion 4 — Narrative thread continuity (summary → cover letter)**
🔲 Not Implemented
- No check verifies the dominant narrative thread from the CV summary echoes in the cover letter's core argument.

**Acceptance criteria summary for US-P6:**

| Criterion | Status | Evidence |
|---|---|---|
| Clarification-answer context applied consistently across all generated content | ⚠️ Partial | `post_analysis_answers` injected into cover letter prompt (master_data_routes.py:1538–1543) and recommend_customizations (llm_client.py:349–365); no cross-output consistency check |
| Cover letter core argument cross-checked against summary framing; mismatch flagged | 🔲 Not Implemented | No such check |
| Screening-answer terminology compared against CV keywords; harmonisation suggestion | 🔲 Not Implemented | Consistency report excludes screening data |

---

## Generated Materials Evaluation

Review is source-only (no live generation run). Assessment based on prompts, constraints, and checks applied:

**Professional Summary**
- Prompt engineering is strong: value-identity opening, ATS keyword weaving (3–5), 1–2 quantified achievements, forward-looking close, no generic filler (llm_client.py:844–879). Aligned with US-P1 and US-P4.
- Missing: no post-generation structural validation; compliance depends on LLM behavior.

**Experience Bullet Rewrites**
- `apply_rewrite_constraints` is a robust gate: numbers, dates, proper nouns protected.
- 8 persuasion checks are comprehensive and all surfaced in the Rewrites tab UI.
- Rewrite prompt explicitly instructs active voice, no hedging, quantified results, strong verbs.
- Missing: proactive CAR structure proposals, front-loading check, parallel structure check.

**Cover Letter**
- Opening style (3 options) + tone (5 options) give structural control.
- Prompt includes company name, role, required skills, achievements, candidate context.
- Real-time 4-point validator provides immediate feedback.
- Critical gaps: "I" first-word gate; word count at 400 vs. story's 300; passive CTA passes.

**Publications**
- Ranking prompt is well-constructed; sorted relevance descending, year descending.
- UI renders rank, citation, year, first-author flag, relevance /10, confidence, rationale, venue warning.
- Divider separates recommended from non-recommended; user overrides all decisions.
- Gap: citation count, co-authorship authority signals not surfaced.

---

## Terminology / Label Clarity Assessment

| Location | Label | Assessment |
|---|---|---|
| publications-review.js:97 | Column header `1st★` | Ambiguous to non-researchers — should read "First Author" with title tooltip |
| bundle.js:14162 | Persuasion flag types displayed as raw snake_case after `.replace(/_/g, " ")` | "car structure", "has result" are developer-centric. Better: "No Challenge-Action-Result structure", "Missing outcome/result" |
| cover-letter.js:533 | Word count target "250–400" in UI | Inconsistent with backend prompt "~250–300 words" — confusing |
| publications-review.js:99 | Column `Score` | No `title` attribute explaining it is job-relevance 1–10 |
| cover-letter.js:547 | "hear from you" in CTA pass list | Passive phrase that story explicitly calls a failure mode |

---

## Additional Story Gaps / Proposed Story Items

**GAP-PE-01 (High): "I"-as-first-word cover letter rejection** — Add one-regex check at start of `_validateCoverLetter`: if first non-whitespace word of the letter body is "I", show a fail state with a rewrite suggestion. One-line fix.

**GAP-PE-02 (High): Word count threshold alignment** — Backend prompt says "~250–300 words"; frontend validator uses 400 as upper limit before fail. Align both to 300. Change cover-letter.js:533 `words <= 400` → `words <= 300` for the green zone.

**GAP-PE-03 (High): Passive CTA fix** — Remove `hear from you` from the CTA pass patterns (cover-letter.js:547); add it to a separate "passive closing" fail list with message "Passive closing detected — use a specific, active next step."

**GAP-PE-04 (Medium): JD phrase mirroring instruction** — Add to the cover letter generation prompt: "Use 2–3 phrases or terms from the job description verbatim (not paraphrased) in the body of the letter." One sentence added to master_data_routes.py:1588–1594.

**GAP-PE-05 (Medium): Forward-looking sentence post-check** — After summary generation, scan for forward-looking indicators ("positioned to", "brings direct experience in", "will", "enable the team to"). If none found, append an informational badge in the Summary Review tab.

**GAP-PE-06 (Medium): Positive-sum framing preference** — Add one sentence to `_propose_rewrites_via_chat` prompt: "Prefer positive-sum framing ('increased X by Y%') over loss framing ('reduced Y') unless the reduction itself is the impressive result."

**GAP-PE-07 (Medium): Screening-to-CV keyword harmonisation** — US-P6 Criterion 3: compare `screening_responses` terminology against `ats_keywords` in the Finalise tab consistency report. Surface divergences as a "Terminology alignment" check row.

**GAP-PE-08 (Low): CAR proactive proposal** — Add a proactive step in `_propose_rewrites_via_chat`: when the original bullet text contains challenge language keywords ("faced", "before deadline", "in response to"), propose a CAR-structured rewrite as an additional proposal.

**GAP-PE-09 (Low): Publication column label** — Change `<th>1st★</th>` to `<th title="First-author publications carry stronger authority signals">First Author</th>`.

**GAP-PE-10 (Low): Score column tooltip** — Add `title="Job relevance score: 1 (low) – 10 (high)"` to the Score column header in publications-review.js.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, web/cover-letter.js, web/publications-review.js, scripts/routes/master_data_routes.py, scripts/routes/review_routes.py, scripts/routes/llm_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-P1 | 1 | 1 | 0 | 3 | 0 |
| US-P2 | 4 | 3 | 0 | 0 | 0 |
| US-P3 | 1 | 1 | 1 | 2 | 0 |
| US-P4 | 4 | 0 | 0 | 2 | 0 |
| US-P5 | 1 | 3 | 1 | 1 | 0 |
| US-P6 | 0 | 2 | 0 | 2 | 0 |

**Key evidence references:**
- `apply_rewrite_constraints`: llm_client.py:913–961
- `check_strong_action_verb`: llm_client.py:1078–1114
- `check_passive_voice`: llm_client.py:1116–1155
- `check_word_count`: llm_client.py:1157–1186
- `check_has_result_clause`: llm_client.py:1188–1223
- `check_hedging_language`: llm_client.py:1225–1266
- `check_named_institution_position`: llm_client.py:1268–1323
- `check_car_structure`: llm_client.py:1326–1368 (informational severity only)
- `check_summary_generic_phrases`: llm_client.py:1371–1403
- `run_persuasion_checks`: conversation_manager.py:1234–1342
- `rank_publications_for_job`: llm_client.py:1530–1694
- `_validateCoverLetter`: web/cover-letter.js:487–570
- `_renderConsistencyReport`: web/cover-letter.js:348–469
- `_OPENING_GUIDANCE`: scripts/routes/master_data_routes.py:98–102
- Cover letter prompt: scripts/routes/master_data_routes.py:1567–1594
- Summary prompt: llm_client.py:844–879
- Publications review UI: web/publications-review.js:82–162
