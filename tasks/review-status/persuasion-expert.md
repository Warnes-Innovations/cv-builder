<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Persuasion-Expert Review Status

**Last Updated:** 2026-07-07 20:14 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Summary opens with value-identity statement, not job title/name | ⚠️ Partial | Prompted only — `scripts/utils/llm_client.py:887` instructs "Open with a value-identity statement... NOT a title + years-of-experience formula", but no post-generation check function verifies compliance (contrast with the deterministic `check_*` functions used for bullets). LLM can silently ignore the instruction with no flag raised. |
| 2 | Arc coherence — experiences progress toward the role | ✅ Pass | `narrative_arc_advisory` in `scripts/utils/cv_orchestrator.py:5038-5081` compares strong-verb density in the most recent role vs. earlier roles and warns when the most recent role is weaker (`recent_score < older_avg * 0.70`). Surfaced in UI at `web/download-tab.js:350-357` ("📈 Narrative arc advisory"). |
| 3 | At least one forward-looking statement in the summary | ⚠️ Partial | Prompted only — `scripts/utils/llm_client.py:890` ("Close with a forward-looking statement aligned to the target role"). No check function scans generated summaries for a future-tense/forward-pull clause; failure is invisible to the user. |
| 4 | System warns if >2 equally-weighted narrative threads are present | ✅ Pass | `narrative_thread_advisory` in `scripts/utils/cv_orchestrator.py:5004-5036` — counts `relevant_for` tags across bullets, flags when the top 3 themes are within 20% of each other and total tagged bullets ≥10. Surfaced at `web/download-tab.js:341-348` ("🧵 Narrative focus advisory"). Matches the acceptance criterion closely (≥3 comparably-weighted themes ≈ "more than two"). |
| — | Zero instances of "responsible for"/"helped to"/"assisted with"/"was involved in" in proposed rewrites | ✅ Pass | `LLMClient.check_hedging_language` and `check_passive_voice` (`scripts/utils/llm_client.py:1156-1194`, `1265-1305`) explicitly match these exact phrases via regex and are unconditionally run on every rewrite in `run_persuasion_checks` (`scripts/utils/conversation_manager.py:1515-1529`). |

**Failure Modes Present**

| Failure mode | Present? |
|---|---|
| Summary opens with title/name rather than value statement | ⚠️ Possible — prompt discourages it but nothing detects it if the LLM does it anyway |
| Bullets read as job descriptions ("Responsible for…") | ✅ Not present — blocked by `check_hedging_language`/`check_passive_voice` |
| Competing narratives with no dominant thread | ✅ Mitigated — `narrative_thread_advisory` flags this pattern |
| Hedging language undermining authority | ✅ Not present — `check_hedging_language` covers "helped to", "assisted with", "was involved in", "may/might/could" |

---

### US-P2: Social Proof and Authority Signals

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Named orgs appear in first 15 words of their bullet | ⚠️ Partial | `LLMClient.check_named_institution_position` (`scripts/utils/llm_client.py:1308-1361`) implements exactly this check, but (a) it only runs on **proposed rewrites** whose `location` contains `"exp"` (`scripts/utils/conversation_manager.py:1531-1534`) — bullets the LLM doesn't propose to rewrite are never checked; (b) the `branded_orgs` set is a fixed ~50-name allowlist (`llm_client.py:1327-1338`, e.g. FAANG, a few pharma/biotech names, Ivy-adjacent schools, ACL/NeurIPS) that will miss most employers not on the list. |
| 2 | `apply_rewrite_constraints` rejects proposals that remove/vague a numeric metric | ✅ Pass | `scripts/utils/llm_client.py:952-1000`, specifically lines 984-988: `nums_orig.issubset(nums_prop)` must hold or the rewrite is rejected. Enforced in `_propose_rewrites_via_chat` (`llm_client.py:2007-2023`) — invalid proposals are filtered from the output entirely. **Caveat:** rejection is silent (a Python `warnings.warn()`, not a user-facing message) — see Additional Issues below. |
| 3 | Publication shortlist ranked by job-relevance + authority, not recency/citations alone | ⚠️ Partial | Two parallel ranking paths exist with different rigor: (a) `LLMClient.rank_publications_for_job` (`llm_client.py:1665-1829`) ranks by LLM-assigned `relevance_score` plus first-author/venue authority signals — matches the criterion well. (b) The proactive "Top recommended publications" shortlist shown immediately after customization recommendations (`scripts/utils/conversation_manager.py:993-1014`) instead calls the heuristic `_select_publications` (`scripts/utils/cv_orchestrator.py:4244-4338`), which gives a flat +30 points to any publication from 2020+ regardless of relevance (`cv_orchestrator.py:4262-4270`) — a recent-but-irrelevant paper can outrank an older, highly relevant one. This is exactly the failure mode the story warns against ("ranking... ignoring relevance"), just via recency instead of citation count. |
| 4 | Each recommended publication shows an authority signal + rationale | ✅ Pass | Both paths populate `rationale` and either `authority_signals` (LLM path, `llm_client.py:1791-1798`) or embed authority cues directly in the rationale string (heuristic path, `cv_orchestrator.py:4301-4308`, e.g. "first author", "journal article"). Rendered per-row with a first-author star, relevance score, confidence badge, and rationale text in `web/publications-review.js:148-172`. |
| 5 | Conditional omission decisions for Publications/Awards surfaced with rationale, not silently dropped | ✅ Pass | `scripts/routes/review_routes.py:1411-1494` builds a `not_recommended` list (every publication beyond the top slice) with the same `rationale`/`relevance_score` fields as recommended ones, and `is_recommended: false`. `web/publications-review.js:128,239` renders a visual divider between recommended/not-recommended rows but keeps rationale visible for both, so no publication vanishes without explanation. **Caveat:** the "recommended" cut is up to 15 items (`review_routes.py:1412 all_scored[15:]`), not the "2-5 shortlist" the evaluation criteria call ideal — see Additional Issues. |
| 6 | Third-party validation language ("selected by…", "cited by…", "adopted by…") preserved/surfaced | 🔲 Not Implemented | No check function scans for or protects these phrases. `apply_rewrite_constraints` only guards numeric tokens and Title-Case proper nouns (`llm_client.py:990-997`) — a rewrite could strip "selected by NIH review panel for..." down to a bare fact and nothing would flag it. |
| 7 | Specificity — vague claims flagged in favor of specific ones | ⚠️ Partial | `check_has_result_clause` (`llm_client.py:1228-1262`) requires *some* number or outcome verb, and `check_new_numeric_claims` (`llm_client.py:1503-1538`) flags fabricated new numbers — but there is no detector for the inverse failure mode named in the story ("significantly improved" replacing "improved by 40%") when the replacement still contains a generic outcome verb like "improved". |

**Failure Modes Present**

| Failure mode | Present? |
|---|---|
| Burying a brand name mid-bullet | ⚠️ Partially guarded — only for rewritten experience bullets, only for the fixed org list |
| Replacing a specific metric with a vague qualifier | ✅ Mitigated for full number removal (`apply_rewrite_constraints`); ⚠️ not mitigated if a number is replaced by another vague-but-still-numeric phrase |
| Omitting publications/awards silently | ✅ Not present for publications (rationale surfaced); not verified for a distinct "Awards" flow — awards appear to be folded into achievement recommendations, which do carry per-item reasoning from the LLM (`recommend_customizations` schema, `llm_client.py:601-608`) |
| Raw dump of all publications, no filtering | ⚠️ Partially present — all publications are returned by the API (not just 2-5), though visually separated by a recommended/not-recommended divider |
| Ranking by citation count/impact factor alone | ✅ Not literally present (no citation-count field exists), but recency plays an equivalent unchecked role in the heuristic path |

---

### US-P3: Loss-Aversion and Urgency Framing

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | System proposes CAR (Challenge-Action-Result) structure where challenge language exists | ✅ Pass | `LLMClient.check_car_structure` (`scripts/utils/llm_client.py:1363-1406`) detects challenge indicators (faced/encountered/due to/etc.) plus a result, and flags bullets lacking challenge framing. Run on all experience-bullet rewrites (`conversation_manager.py:1536-1539`, gated on `'exp' in location.lower()`). |
| 2 | Rewrites prefer positive-sum metric framing over loss framing (unless the loss framing is itself the impressive result) | ✅ Pass | `LLMClient.check_positive_metric_framing` (`llm_client.py:1472-1500`) flags bullets that pair a negative verb (cut/reduce/eliminate/decrease) with a quantified metric and suggests a positive reframe. Run on experience and generic bullet rewrites (`conversation_manager.py:1548-1551`). The "unless impressive as-is" nuance is not encoded — the check fires unconditionally whenever a negative verb + number co-occur, even for genuinely positive-framed reductions (e.g. "reduced defect rate by 90%"), so it may over-flag. |
| 3 | Summary rewrite checked against generic filler phrases, flagged if >1 appears | ✅ Pass | `LLMClient.check_summary_generic_phrases` (`llm_client.py:1409-1441`) checks against a 22-item `_GENERIC_FILLER_PHRASES` set and fails (`pass: len(found_phrases) <= 1`) once 2+ phrases are found — matches the acceptance criterion's ">1" threshold exactly. Client-side cover-letter equivalent exists too (`web/cover-letter.js:739-757`, `_CL_FILLER`). |

**Failure Modes Present**

| Failure mode | Present? |
|---|---|
| Rewrite strips challenge context, leaving only action | ⚠️ Detected but not prevented — `check_car_structure` flags the absence but does not block or auto-repair the rewrite |
| Metrics in negative frame when a positive reframe exists | ✅ Flagged via `check_positive_metric_framing` |
| Summary sounds generic/interchangeable | ✅ Flagged via `check_summary_generic_phrases`; the differentiation-signal evaluation criterion is not separately checked (no explicit "rare combination of X and Y" detector), but filler-phrase suppression indirectly reduces genericness |

---

### US-P4: Rhetorical Quality of Bullet Points

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Every proposed bullet begins with an approved strong-action verb | ✅ Pass | `LLMClient.check_strong_action_verb` (`scripts/utils/llm_client.py:1117-1153`) checks the first word against a ~150-verb `_STRONG_ACTION_VERBS` set (lines 1011-1073) and is run unconditionally on every rewrite (`conversation_manager.py:1510-1513`). Handles a "Label: " intro-phrase edge case via `_strip_intro_phrase` (`llm_client.py:1102-1115`). |
| 2 | Flags any bullet exceeding 30 words | ✅ Pass | `LLMClient.check_word_count` (`llm_client.py:1196-1225`), default `max_words=30`, explicitly commented "per US-P4" (line 1202) — direct evidence the story was implemented against. |
| 3 | Flags passive voice constructions | ✅ Pass | `LLMClient.check_passive_voice` (`llm_client.py:1155-1194`) — regex set covers "was/were + verb", "responsible for", "helped to", "was involved in", "assisted with", "was tasked with". |
| 4 | Flags bullets with no result clause | ✅ Pass | `LLMClient.check_has_result_clause` (`llm_client.py:1228-1262`) requires a number/metric or an outcome verb (reduced/increased/resulted in/etc.). |

**Failure Modes Present**

| Failure mode | Present? |
|---|---|
| Keyword insertion as a bolted-on appendage | ✅ Detected — `check_keyword_appended` (`llm_client.py:1444-1470`) flags ATS keywords found only in the final 3 tokens of the proposed text that weren't in the original |
| Over-long bullets | ✅ Flagged via `check_word_count` |
| Passive voice ("was tasked with") | ✅ Flagged via `check_passive_voice` |
| Bullets describing input, not output | ✅ Partially flagged via `check_has_result_clause` |
| Front-loading of the most impressive phrase (evaluation criterion 2) | 🔲 Not Implemented — no check verifies word position of the "hook" within a bullet; only named-institution position is checked, not the general front-loading principle. Not in the acceptance-criteria list, so this is a gap in the story rather than a failed acceptance test. |
| Parallel grammatical structure within an experience (evaluation criterion 4) | 🔲 Not Implemented — no cross-bullet consistency check exists; not in the acceptance-criteria list either. |

---

### US-P5: Cover Letter Persuasion Architecture

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | System rejects any draft where the first word is "I" and offers a rewrite prompt | ❌ Fail (as literally stated) | `web/cover-letter.js:571-587` (`iFirstCheck`) *detects* a body opening with "I" and shows an advisory in the Quality Checks panel, but nothing **rejects** the draft or blocks `saveCoverLetter()` (`web/cover-letter.js:321-366` has no validation gate before saving — only checks the textarea is non-empty). The backend prompt asks the model to avoid passive closings (`scripts/routes/master_data_routes.py:2183`) but does not instruct against opening with "I", and there is no server-side rejection/retry loop. |
| 2 | Cover letter references company name and one specific role requirement in a non-generic way | ✅ Pass | Client-side `companyCheck` and `para1Check` (`web/cover-letter.js:589-657`) verify the company name and job title appear (ideally 2+ times, and specifically within paragraph 1). Backend prompt also explicitly injects company/role/context (`master_data_routes.py:2156-2185`). |
| 3 | Word count enforced; letter >300 words triggers compression flag | ⚠️ Partial | The story's flat "max 300 words" is **not** what's implemented — `_cover_letter_word_count_instruction` (`scripts/routes/master_data_routes.py:125-136`) uses role-differentiated targets: 300–400 words standard, 400–500 executive, **500–600 academic** — i.e. up to double the story's stated ceiling for some roles. The client-side `wordCountCheck` (`web/cover-letter.js:659-692`) enforces these same differentiated bands, not a flat 300. This is a deliberate, reasoned design choice (noted in code) but directly contradicts the letter of the acceptance criterion; the story should be updated to reflect role-differentiated targets, or the code should cap at 300 as written. |
| 4 | Closing sentence includes a specific proposed next step (flagged if absent) | ✅ Pass | `ctaCheck` (`web/cover-letter.js:694-719`) distinguishes assertive CTAs (pass) from passive CTAs like "look forward to hearing from you" (explicit fail, comment references "story US-P5 requires rejection" at line 703) from no-CTA-at-all (fail). Backend prompt also instructs "Avoid passive language such as 'I look forward to hearing from you'" (`master_data_routes.py:2183`). |

**Failure Modes Present**

| Failure mode | Present? |
|---|---|
| Opening with "I" as the first word | ⚠️ Detected but not rejected (see criterion 1 above) |
| Restating the CV rather than extending it | 🔲 Not checked — no mechanism compares cover-letter content against CV bullets to detect verbatim restatement |
| Closing with a passive sentence | ✅ Flagged — `ctaCheck` explicitly fails passive closings |
| Generic, could-apply-anywhere letter | ✅ Partially mitigated — `companyCheck`, `substanceCheck` (company-context keyword matching, `cover-letter.js:610-633`), and `para1Check` all push toward specificity |

---

### US-P6: Consistency of Persuasive Register

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Clarification-answer context applied consistently across all generated content in the session | ✅ Pass | `post_analysis_answers` (the Q&A clarification state) is threaded into every major generation call: customizations (`conversation_manager.py:892-897`), professional summary (`llm_client.py:857-860` `post_analysis_answers` param), cover letter (`master_data_routes.py:2110-2115` `answers_snippet`), and screening questions (`scripts/routes/generation_routes.py:354`, `master_data_routes.py:1671-1680,2459`). One shared source of truth, not per-document re-entry. |
| 2 | Cover letter core argument cross-checked against summary framing; mismatch flagged | 🔲 Not Implemented | `_renderConsistencyReport` (`web/cover-letter.js:375-530`) checks company name, job title, top-8 ATS keywords, date-format consistency, and abbreviation/expansion terminology pairs across CV/cover letter/screening text — but there is no check of the *narrative thread* or *core argument* itself (e.g. does the cover letter's central claim echo the summary's positioning?). This is a real gap relative to the specific criterion. |
| 3 | Prior screening-answer terminology compared against CV keywords; divergences presented as harmonisation suggestion | ⚠️ Partial | The terminology-consistency check (`web/cover-letter.js:470-501`) does include screening-answer textareas (`sqTexts`, line 471) in its cross-document text pool and flags abbreviation/expansion mismatches (ML vs. machine learning, etc.) — but this is a fixed list of 10 tech acronym pairs (line 475-484), not a general-purpose comparison of arbitrary CV keywords against screening-answer word choices. |
| 4 | Role-level calibration (VP-level language throughout for a VP application) | 🔲 Not Implemented | No check verifies that summary/bullet/cover-letter language register matches the inferred `role_level`. The cover letter word-count target does scale by role level (exec vs. standard vs. academic, `master_data_routes.py:130-136`), but that only affects length, not vocabulary/scope register. |

**Failure Modes Present**

| Failure mode | Present? |
|---|---|
| Confident summary + hedged bullets | ✅ Indirectly prevented — `check_hedging_language`/`check_passive_voice` run on all bullet rewrites, keeping bullet register assertive; but nothing directly cross-compares summary vs. bullet register |
| Cover letter introduces a new narrative angle | 🔲 Not detected — see criterion 2 |
| Screening answers use different terminology than CV | ⚠️ Partially detected — only for the 10 hardcoded acronym pairs |
| Role-level language mismatch | 🔲 Not detected |

---

## Generated Materials Evaluation

Findings here concern the *quality of the persuasion mechanisms themselves* (their coverage and precision), rather than whether the mechanism exists at all (covered above).

1. **Coverage gap: unrewritten bullets never get persuasion-checked.** All eight `check_*` functions in `llm_client.py` only run inside `run_persuasion_checks`, which only receives `rewrites` — i.e., bullets/summary text the LLM chose to *propose changes for*. A bullet the model leaves untouched (because it judged no keyword alignment was needed) never gets checked for passive voice, hedging, missing result clause, or weak opening verb, even though the story's concern (rhetorical quality "per bullet") applies to the whole CV, not just the delta. This is the single biggest persuasion-quality blind spot in the implementation.
2. **Silent constraint rejection undermines user trust and learning.** `apply_rewrite_constraints` failures (`llm_client.py:2014-2022`) are dropped with a Python `warnings.warn()` — invisible in production logging and never surfaced in the chat/rewrite UI. A user who expected a rewrite for a bullet and doesn't see one has no way to know it was attempted and rejected for good reason (metric/proper-noun loss) versus simply never proposed. This directly contradicts the spirit of US-P2's failure mode "Omitting... silently without surfacing the omission decision to the user" — the story only names publications/awards, but the same principle is violated for rewrites.
3. **Publication shortlist size mismatch.** The story's evaluation criteria call for "a targeted 2–5 publication shortlist" as more persuasive than a comprehensive list, but the implementation surfaces the top-15 (`review_routes.py:1412`) as "recommended" and returns literally all publications to the client. The UI's visual divider (`web/publications-review.js:128`) is helpful, but the recommended slice is 3-7x larger than the story's target — worth either tightening the cutoff or revising the story's numeric target given the different tool contexts (shortlist for chat message vs. full review table).
4. **Recency conflated with relevance in the fallback publication ranking.** `_select_publications`'s scoring (`cv_orchestrator.py:4262-4270`) gives +30 points for any 2020+ publication regardless of topical match — a bigger swing than the keyword-match bonus (+5/match) or required-skill bonus (+8/match) for a single match. A recent, tangential publication can out-rank an older, highly relevant one. This is used specifically for the proactive chat-message shortlist (`conversation_manager.py:999`), which is the first thing a user sees — so first impressions of publication ranking are the least rigorous path in the codebase.
5. **Cover letter word-count target silently exceeds the story's stated ceiling.** For academic/research roles, the implemented target (500–600 words, `master_data_routes.py:135`) is double the story's flat "maximum 300 words" criterion. This looks like a deliberate, reasonable product decision (academic cover letters are conventionally longer) rather than a bug, but it means the acceptance criterion as literally written will always read as failing for that role type — the story needs updating to match the intended design, or the design needs to match the story.
6. **"I am writing to apply" pattern-interrupt is checked, but not enforced.** Multiple client-side checks (`iFirstCheck`, filler-phrase list including "i am writing to apply" at `web/cover-letter.js:740`) detect the exact failure mode named in the story, but detection never gates saving/downloading the letter — a user can ignore every warning and export a cover letter that opens "I am writing to apply for..." with zero friction.

---

## Additional Story Gaps / Proposed Story Items

- **US-P1 gap:** No acceptance criterion currently requires *verifying* (not just prompting for) the "value-identity opening" and "forward-looking closing" requirements. Recommend adding a deterministic check (e.g., flag summaries whose first clause matches `<Name>, <Title>` or `<Title> with N years experience` patterns) alongside the existing prompt instruction, mirroring how `check_hedging_language` backs up the "no hedging" prompt instruction.
- **US-P2 gap:** No acceptance criterion protects third-party validation language ("selected by", "invited to", "cited by", "adopted by") from being stripped during a rewrite. Recommend an `apply_rewrite_constraints`-style guard that treats these phrases as protected tokens, the same way numbers and proper nouns are protected today.
- **US-P2 gap:** The story's "2–5 publication shortlist" target and the codebase's "top-15 recommended, rest shown with a divider" design are in tension. Recommend the story explicitly distinguish between the *proactive chat shortlist* (should stay small, 2-5) and the *full review table* (reasonably shows everything with a clear recommended/not-recommended split), since both already exist in the code but serve different UX moments.
- **US-P4 gap:** Evaluation criteria 2 (front-loading) and 4 (parallel structure) have no corresponding acceptance-criteria bullets and, correspondingly, no implementation. Recommend adding acceptance criteria for both, since strong infrastructure already exists (`check_named_institution_position` shows the front-loading pattern is already partially solved for one token type — generalizing it to "most distinctive noun/number phrase" would be a natural extension).
- **US-P5 gap:** The "reject the first-word-is-I draft" criterion, as literally written, implies a hard gate (reject + reprompt). The actual implementation philosophy across the whole app is soft-gate-with-acknowledgment (see the `persuasionWarningsAcknowledged` pattern in rewrite review, `web/rewrite-review.js:603-619`). Recommend either (a) softening the story's language to match the established soft-gate pattern for consistency, or (b) if a hard gate is genuinely wanted here specifically (cover letters are a lower-volume, higher-stakes artifact than CV bullets), implement one — currently neither the client nor server enforces it.
- **US-P6 gap:** No acceptance criterion or implementation addresses role-level (seniority) language calibration, despite it being evaluation criterion 2. This is arguably the hardest of the six stories to check computationally (it requires semantic judgment of "VP-level scope" vs. "IC-level scope"), but even a heuristic (e.g., flag summaries for Director+ roles containing no organizational/budget/strategic-scope language) would be a meaningful first step.
- **Terminology/UX finding (persuasion-expert lens):** The persuasion-check `flag_type` values (`car_structure`, `keyword_appended`, `negative_metric_framing`, `new_numeric_claim`, `terminology_inconsistency`, etc.) are rendered directly to end users as `flag_type.replace(/_/g, ' ')` in `web/rewrite-review.js` (no friendly-label mapping at all), while `web/cover-letter.js:761-769` has a *partial* friendly-label dictionary covering only 7 of ~11 flag types used elsewhere in the codebase — the remaining types (`car_structure`, `keyword_appended`, `new_numeric_claim`, `terminology_inconsistency`) fall through to the same raw snake-case label. A job seeker without an ATS/HR background is unlikely to know what "car structure" (meaning Challenge-Action-Result) or "keyword appended" mean without a tooltip or explanation. Recommend a single shared, complete label+description map used by both surfaces (per the project's `CLAUDE.md` "Avoid Duplicate Helper/Function Definitions" rule — this is exactly the kind of split-definition risk it warns about).
- **Terminology finding:** "Persuasion checks" as a section header (`web/rewrite-review.js` warnings panel, `web/cover-letter.js` Quality Checks panel) is internally consistent but never explained to the user in plain language on first encounter — no tooltip or onboarding text clarifies that these are heuristic writing-quality checks, not a claim about job-application success odds. Given this app's userbase (job seekers, not writing-craft experts), a one-line explainer the first time this panel appears would reduce misinterpretation risk (e.g., "these are automated writing-quality checks, not job-fit predictions").

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/llm_client.py, plus web/cover-letter.js, web/rewrite-review.js, web/publications-review.js, web/download-tab.js, scripts/utils/cv_orchestrator.py, scripts/routes/master_data_routes.py, scripts/routes/review_routes.py, scripts/routes/generation_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-P1 | 2 | 2 | 0 | 0 | 0 |
| US-P2 | 3 | 3 | 0 | 1 | 0 |
| US-P3 | 3 | 0 | 0 | 0 | 0 |
| US-P4 | 4 | 0 | 0 | 0 | 0 |
| US-P5 | 2 | 1 | 1 | 0 | 0 |
| US-P6 | 1 | 2 | 0 | 1 | 0 |

**Key evidence references:**
- US-P1: `narrative_thread_advisory` / `narrative_arc_advisory` → `scripts/utils/cv_orchestrator.py:5004-5081`, surfaced at `web/download-tab.js:341-357`
- US-P1: Hedging/passive-voice zero-tolerance → `scripts/utils/llm_client.py:1156-1194,1265-1305`, run unconditionally in `scripts/utils/conversation_manager.py:1515-1529`
- US-P2: Numeric-metric protection → `scripts/utils/llm_client.py:952-1000` (`apply_rewrite_constraints`)
- US-P2: Publication authority ranking → `scripts/utils/llm_client.py:1665-1829` (`rank_publications_for_job`); heuristic fallback with recency weighting → `scripts/utils/cv_orchestrator.py:4244-4338`
- US-P2: Publication omission-with-rationale UI → `scripts/routes/review_routes.py:1411-1494`, `web/publications-review.js:128,148-172,239`
- US-P2: Third-party validation-language preservation → not found in any `check_*`/`apply_rewrite_constraints` function
- US-P3: CAR structure and positive-sum framing checks → `scripts/utils/llm_client.py:1363-1406,1472-1500`
- US-P4: Strong verb / word count / passive voice / result clause → `scripts/utils/llm_client.py:1117-1262`, explicit "per US-P4" comment at line 1202
- US-P5: Passive-CTA rejection with explicit story reference → `web/cover-letter.js:694-719`, comment at line 703 ("story US-P5 requires rejection")
- US-P5: First-word-"I" is detected but never blocks save → `web/cover-letter.js:571-587` (detection) vs. `web/cover-letter.js:321-366` (`saveCoverLetter`, no gate)
- US-P5: Role-differentiated word count exceeds the story's flat 300-word ceiling → `scripts/routes/master_data_routes.py:125-136`
- US-P6: Clarification-answer propagation across summary/customizations/cover letter/screening → `scripts/utils/llm_client.py:857-860`, `scripts/utils/conversation_manager.py:892-897`, `scripts/routes/master_data_routes.py:2110-2115,1671-1680,2459`, `scripts/routes/generation_routes.py:354`
- US-P6: Cross-document consistency report (company/title/keywords/dates/terminology) → `web/cover-letter.js:375-501`; no narrative/core-argument or role-level register check found

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
