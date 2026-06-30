<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Persuasion Expert Review Status

**Persona:** US-P* — Persuasion Strategist (Scott Adams / Robert Cialdini school)
**Reviewer:** Claude Code source-first analysis
**Date:** 2026-06-30
**Branch:** feature/multi-user-deployment
**Source files read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, web/cover-letter.js, web/publications-review.js, scripts/web_app.py,
scripts/utils/conversation_manager.py, scripts/utils/llm_client.py,
scripts/routes/master_data_routes.py, scripts/routes/review_routes.py

---

## Application Evaluation

### US-P1: Narrative Arc and Identity Alignment

**AC 1.1 — Professional summary opens with a value-identity statement, not a job title or name.**

✅ **Pass.** `llm_client.py:859` explicitly instructs the summary prompt:
`"Open with a value-identity statement: strong verb + differentiating value claim (e.g. 'Drives 3x revenue growth...', 'Builds ML pipelines that...') — NOT a title + years-of-experience formula"`.
The system prompt in `generate_professional_summary()` directly enforces this constraint.

**AC 1.2 — At least one forward-looking statement in the summary.**

✅ **Pass.** `llm_client.py:862` requires: `"Close with a forward-looking statement aligned to the target role"`. This is a mandatory REQUIREMENTS line in the summary generation prompt.

**AC 1.3 — System warns if more than two equally-weighted narrative threads are present.**

🔲 **Not Implemented.** No code in any source file detects competing narrative threads or flags fragmented identity. The persuasion checks in `run_persuasion_checks()` (`conversation_manager.py:1234`) cover verb strength, passive voice, word count, result clauses, hedging, institution placement, CAR structure, and generic phrases — but nothing checks for narrative-thread coherence or identity fragmentation across the selected content set.

**AC 1.4 — Zero instances of "responsible for", "helped to", "assisted with", or "was involved in" in proposed rewrites.**

✅ **Pass.** Two enforcement layers:

1. `check_passive_voice()` (`llm_client.py:1127`) detects exactly these patterns (`\bresponsible\s+for\b`, `\bhelped\s+(?:to\s+)?`, `\bwas\s+involved\s+in\b`, `\bassisted\s+with\b`) and returns `severity: 'warn'`. Persuasion warnings are surfaced to the user in the Rewrites tab via `rewrite-review.js:324` (per-card badges) and `rewrite-review.js:163` (summary panel).
2. The rewrite prompt (`llm_client.py:1833`) explicitly instructs the LLM: "not 'Responsible for', 'Helped', 'Assisted', or 'Worked on'".

Note: Checks flag the proposed text but do not hard-reject it — the user sees warnings and decides.

---

### US-P2: Social Proof and Authority Signals

**AC 2.1 — `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric.**

✅ **Pass.** `llm_client.py:956–959` implements this as a hard filter:

```python
nums_orig = set(re.findall(r'\d[\d,\.]*%?', original))
nums_prop = set(re.findall(r'\d[\d,\.]*%?', proposed))
if not nums_orig.issubset(nums_prop):
    return False
```

Proposals failing this are silently discarded in `_propose_rewrites_via_chat()` at `llm_client.py:1886–1893`.

**AC 2.2 — Named recognisable organisations appear within the first 15 words of their bullet.**

⚠️ **Partial.** `check_named_institution_position()` (`llm_client.py:1279`) checks a hardcoded list of branded orgs within the first 15 words, flagging violations as `severity: 'info'`. The check runs on proposed rewrite text via `run_persuasion_checks()`. Two limitations: (a) severity is `info` (not `warn`), so it may not render prominently in the UI; (b) the branded-orgs list (`llm_client.py:1299–1310`) is hardcoded to major tech/pharma/academic names and does not adapt to the candidate's actual employer names from master data.

**AC 2.3 — Conditional omission decisions for Publications/Awards are surfaced to the user with rationale, not silently dropped.**

✅ **Pass.** `publications-review.js:69–71` shows: `"N of M publications recommended for this role"` and explicitly labels the below-the-divider section: `"Publications below were not recommended for this role (pre-excluded)"`. Non-recommended publications remain visible (with `opacity:0.7`) rather than hidden. The LLM provides `rationale` text for recommended publications rendered in the Reasoning column (`publications-review.js:137`).

**AC 2.4 — Publication recommendation list is ranked by job-relevance, not by recency or citation count alone.**

✅ **Pass.** `rank_publications_for_job()` (`llm_client.py:1540`) uses LLM ranking by domain + keyword + title relevance. The sort key (`llm_client.py:1703`) is `(-relevance_score, -year)` — relevance is the primary key, recency is secondary tiebreaker only. The LLM prompt passes job domain, title, required skills, and ATS keywords to guide scoring.

**AC 2.5 — Each recommended publication shows at least one authority signal alongside its relevance rationale.**

⚠️ **Partial.** The publications table shows first-author star, relevance score (`/10`), confidence badge, and LLM rationale text. `authority_signals` are assembled in `llm_client.py:1666–1673` (`first_author`, `journal: <name>`, `conference: <name>`). However in the fallback path (`review_routes.py:1386`), `authority_signals` is always an empty list — the fallback renders no authority signals at all. For the LLM path, venue/journal names appear in `formatted_citation` but are not rendered as distinct authority-signal badges.

**AC 2.6 — System flags bullets where a number is present in master data but absent in the proposed rewrite.**

✅ **Pass.** `apply_rewrite_constraints()` (`llm_client.py:956–959`) rejects rewrites that drop any numeric token present in the original. Enforced at generation time before proposals reach the user.

---

### US-P3: Loss-Aversion and Urgency Framing

**AC 3.1 — System identifies and proposes CAR (Challenge-Action-Result) structure for experience bullets where challenge language exists in master data.**

⚠️ **Partial.** `check_car_structure()` (`llm_client.py:1336`) detects CAR structure in proposed rewrites and flags absence as `severity: 'info'`. The check runs via `run_persuasion_checks()` (`conversation_manager.py:1319`). This is reactive (flags existing text) rather than proactive — the system does not scan master data for challenge language and then construct CAR-structured bullet proposals from that source. The rewrite prompt does not specifically instruct the LLM to produce CAR-structured bullets when challenge language is detected.

**AC 3.2 — Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless the loss-framing itself is the impressive result.**

🔲 **Not Implemented.** No code enforces or checks framing direction preference. `check_car_structure()` and `check_has_result_clause()` check for presence of a result, not its framing polarity. The rewrite prompt quality criteria (`llm_client.py:1835–1838`) do not mention positive-sum framing. No "increased vs reduced" check exists anywhere.

**AC 3.3 — Summary rewrite is checked against a short list of generic filler phrases and flagged if more than one appears.**

✅ **Pass.** `check_summary_generic_phrases()` (`llm_client.py:1381`) checks against `_GENERIC_FILLER_PHRASES` (20 entries, `llm_client.py:1047–1071`) and returns `severity: 'warn'` when more than 2 are found. Runs on summary rewrites via `run_persuasion_checks()` (`conversation_manager.py:1324`). The `pass` condition allows at most 1 filler phrase.

---

### US-P4: Rhetorical Quality of Bullet Points

**AC 4.1 — Every proposed bullet begins with a verb from an approved strong-action-verb list.**

✅ **Pass.** `check_strong_action_verb()` (`llm_client.py:1089`) validates all proposed text against `_STRONG_ACTION_VERBS` (approximately 140 curated verbs at `llm_client.py:982–1044`). Violations are flagged as `severity: 'warn'`. `_strip_intro_phrase()` (`llm_client.py:1073`) strips leading category labels before checking so structured bullets are handled correctly. Warnings surface as per-card badges in the Rewrites tab (`rewrite-review.js:324`).

**AC 4.2 — System flags any proposed bullet exceeding 30 words for compression review.**

✅ **Pass.** `check_word_count()` (`llm_client.py:1168`) enforces a 30-word limit, returning `severity: 'warn'` with the exact word count and "Compress for readability." message. Runs on all proposed rewrites via `run_persuasion_checks()` (`conversation_manager.py:1302`).

**AC 4.3 — System flags passive voice constructions in proposed rewrites.**

✅ **Pass.** `check_passive_voice()` (`llm_client.py:1127`) detects `was/were + [ed]`, `responsible for`, `helped to`, `was involved in`, `assisted with`, `was tasked with` and returns `severity: 'warn'`. Runs on all proposed rewrites (`conversation_manager.py:1298`).

**AC 4.4 — System flags bullets where no result clause (outcome, impact, or metric) is present.**

✅ **Pass.** `check_has_result_clause()` (`llm_client.py:1199`) checks for numeric patterns, outcome verbs, and causal connectors. Returns `severity: 'info'` (not `warn`) when absent. Runs on all rewrites (`conversation_manager.py:1304`).

Note: `info` severity may render less prominently than `warn` in the UI — consider elevating to `warn` to ensure result-less bullets get equal attention.

---

### US-P5: Cover Letter Persuasion Architecture

**AC 5.1 — System rejects any draft where the first word is "I" and offers a rewrite prompt.**

⚠️ **Partial.** `_validateCoverLetter()` (`cover-letter.js:511–522`) detects when the body opens with "I" and displays a fail-state check: "Body opens with 'I' — lead with your value, the role, or the company instead." This fires in real-time on the editable textarea. However it does not block saving or offer an automatic rewrite prompt — the user sees the warning but can save unchanged. The LLM server prompt does not explicitly instruct the model not to open the body with "I".

**AC 5.2 — Cover letter references at least the company name and one specific role requirement in a non-generic way.**

✅ **Pass.** Two mechanisms:

1. Server-side prompt (`master_data_routes.py:1608–1611`) passes `company`, `role`, and `req_skills or keywords` as required context.
2. Client-side check (`cover-letter.js:524–540`) counts company-name mentions: 0 = fail, 1 = warn, 2+ = pass.

**AC 5.3 — Word count check enforced; letter exceeding 300 words triggers a compression review flag.**

✅ **Pass.** `_validateCoverLetter()` (`cover-letter.js:543–576`) implements a role-differentiated word count check: standard 300–400, executive 400–500, academic 500–600. Words outside the target range trigger `fail` or `warn` states with a visual progress bar. The server-side `_cover_letter_word_count_instruction()` (`master_data_routes.py:111`) enforces the same boundaries in the LLM prompt.

**AC 5.4 — Closing sentence includes a specific proposed next step (flagged if absent).**

✅ **Pass.** Two mechanisms:

1. Client-side: `_validateCoverLetter()` (`cover-letter.js:578–603`) checks the last paragraph for assertive CTA patterns (interview, discuss, follow-up). Assertive = pass, passive = warn, absent = fail.
2. Server-side: `master_data_routes.py:1630` instructs the LLM: "Close with a specific, confident request for an interview or a conversation about the role. Name the role explicitly. Avoid passive language such as 'I look forward to hearing from you.'"

---

### US-P6: Consistency of Persuasive Register

**AC 6.1 — System enforces that clarification-answer context is applied consistently across all generated content in the session.**

⚠️ **Partial.** `post_analysis_answers` from the Q&A step is passed as `user_preferences` to `recommend_customizations()` and `generate_professional_summary()`, and injected as `answers_snippet` in the cover letter prompt (`master_data_routes.py:1562–1567`). However there is no mechanism that enforces the same framing emphasis in screening-question responses or interview-prep content. Each generation step receives its own context block, but cross-step register enforcement is not implemented.

**AC 6.2 — Cover letter core argument is cross-checked against summary framing; mismatch flagged for user review.**

⚠️ **Partial.** `_renderConsistencyReport()` (`cover-letter.js:348–469`) checks company name, job title, ATS keywords, and date format consistency across CV and cover letter. However it does not compare the argumentative framing or narrative thread of the cover letter against the professional summary. There is no semantic comparison of summary focus vs the cover letter's core value proposition.

**AC 6.3 — Prior screening-answer terminology is compared against CV keyword choices; divergences are presented as a harmonisation suggestion.**

🔲 **Not Implemented.** The consistency report checks ATS keyword presence across CV and cover letter but does not compare screening answers against CV terminology. Screening responses are stored in `state['screening_responses']` (`conversation_manager.py:108`) but no cross-document terminology comparison is triggered. No harmonisation suggestion feature exists.

---

## Generated Materials Evaluation

*Note: Generated materials evaluation assesses whether the system's prompts and constraints are designed to produce output meeting each criterion. Actual LLM compliance depends on the model used.*

### US-P1: Narrative Arc (Generated Output)

**Value-identity summary opening:** The `generate_professional_summary()` prompt (`llm_client.py:854–874`) explicitly forbids the title+years formula and requires a strong verb + differentiating value claim. Well-designed. Actual compliance depends on the LLM model.

**Forward-looking statement:** Required explicitly in the prompt (`llm_client.py:862`). Present in design.

**Arc coherence across bullets:** No mechanism ensures bullets across experiences advance a single narrative thread. The system generates per-bullet rewrites independently without checking aggregate narrative coherence.

**No identity fragmentation:** Not checked. The system does not detect or warn on dual-identity positioning (e.g., "researcher AND engineer" presented equally).

### US-P2: Social Proof (Generated Output)

**Named institutions front-loaded:** Preserved via `apply_rewrite_constraints()` (proper-noun preservation). Front-loading is encouraged in the rewrite prompt but not structurally enforced.

**Quantified metrics preserved:** ✅ Hard-enforced by `apply_rewrite_constraints()`.

**Publications ranked by relevance:** ✅ LLM ranks by domain + keyword relevance; first-author and venue authority signals surfaced.

**Authority signals on publications:** ⚠️ Shown for LLM path (first author, journal, rationale). Missing for fallback path. Citation counts not included (not in BibTeX data model).

### US-P3: Loss-Aversion (Generated Output)

**CAR structure:** Detected reactively on proposed rewrites; not proactively constructed. Flat bullets are not rewritten into CAR format by extracting challenge context from master data.

**Positive-sum framing:** Not enforced. LLM may produce loss framing ("reduced X") when gain framing ("increased Y") is equivalent.

**Differentiation from generic summary:** `check_summary_generic_phrases()` catches filler but does not require a positive differentiation signal ("rare combination of...").

### US-P4: Bullet Rhetorical Quality (Generated Output)

All four checks (strong verb, word count, passive voice, result clause) run on proposed rewrites before the user sees them. Warnings surface per-card in the Rewrites tab. The rewrite prompt quality criteria (`llm_client.py:1832–1838`) instruct the LLM toward the desired output independently of post-hoc checks.

### US-P5: Cover Letter (Generated Output)

The LLM prompt instructs: personalised opener, company-specific references, specific CTA, role-appropriate length. Client-side `_validateCoverLetter()` enforces all these criteria after generation. The opening-with-I check fires immediately on generated output.

**Mirroring job posting language:** ⚠️ The prompt passes `req_skills` and `ats_keywords` as context but does not explicitly instruct the LLM to mirror exact job-description phrases verbatim. The instruction is to reference key requirements, not to reproduce the exact phrasing from the posting.

### US-P6: Consistency (Generated Output)

Keyword consistency between CV and cover letter is checked in the Finalise tab's cross-document report. Screening-answer vs CV terminology comparison is not implemented.

---

## Summary Table

| Story | Criterion | Status | Key Evidence |
| ----- | --------- | ------ | ------------ |
| US-P1 | Value-identity summary opening required | ✅ | `llm_client.py:859` |
| US-P1 | Forward-looking statement required | ✅ | `llm_client.py:862` |
| US-P1 | Narrative thread count warning | 🔲 | Not implemented |
| US-P1 | Zero hedging language in rewrites | ✅ | `llm_client.py:1127` + rewrite prompt `llm_client.py:1833` |
| US-P2 | `apply_rewrite_constraints` rejects metric removal | ✅ | `llm_client.py:956–959` hard filter |
| US-P2 | Named orgs in first 15 words | ⚠️ | `llm_client.py:1279` — hardcoded org list + `info` severity |
| US-P2 | Publication omissions surfaced with rationale | ✅ | `publications-review.js:69–71, 137` |
| US-P2 | Publications ranked by job-relevance | ✅ | `llm_client.py:1540–1703` |
| US-P2 | Each pub shows authority signal + rationale | ⚠️ | LLM path OK; fallback path `authority_signals: []` always |
| US-P2 | Flags bullets where number dropped in rewrite | ✅ | `apply_rewrite_constraints()` |
| US-P3 | CAR structure proposed for challenge bullets | ⚠️ | Detection only (`llm_client.py:1336`); no proactive CAR construction |
| US-P3 | Positive-sum metric framing preferred | 🔲 | Not implemented |
| US-P3 | Summary checked for generic filler | ✅ | `llm_client.py:1381` |
| US-P4 | Bullets begin with approved strong verb | ✅ | `llm_client.py:1089` + `_STRONG_ACTION_VERBS` |
| US-P4 | Flags bullets >30 words | ✅ | `llm_client.py:1168` |
| US-P4 | Flags passive voice in rewrites | ✅ | `llm_client.py:1127` severity=warn |
| US-P4 | Flags bullets with no result clause | ✅ | `llm_client.py:1199` severity=info |
| US-P5 | Rejects cover letter opening with "I" | ⚠️ | Warning shown (`cover-letter.js:511`) but save not blocked |
| US-P5 | Company name + role requirement referenced | ✅ | `master_data_routes.py:1608` + `cover-letter.js:524` |
| US-P5 | Word count enforced (role-differentiated) | ✅ | `cover-letter.js:543–576` |
| US-P5 | Assertive CTA closing flagged if absent | ✅ | `cover-letter.js:578–603` + `master_data_routes.py:1630` |
| US-P6 | Clarification context applied consistently | ⚠️ | Applied to CV/summary/cover letter; not enforced in screening |
| US-P6 | Cover letter vs summary framing cross-checked | ⚠️ | Keywords checked; narrative framing not compared |
| US-P6 | Screening terminology vs CV harmonisation | 🔲 | Not implemented |

---

## Priority Gaps

**High (AC failures that directly break persuasion effectiveness):**

1. **US-P1 AC 1.3 / US-P6 AC 6.3** — Narrative thread detection and screening-answer terminology harmonisation are completely absent. A candidate can have contradictory positioning across documents with no flag.

2. **US-P3 AC 3.2** — No positive-sum framing enforcement. Bullets may default to "reduced latency by 40%" (loss framing) when "improved throughput by 67%" (gain framing) is available from the same data.

**Medium (Partial implementations with meaningful gaps):**

1. **US-P5 AC 5.1** — The "I"-opening detection warns but does not block saving or offer an automatic rewrite. A user receiving the warning can click Save without acting.

2. **US-P2 AC 2.5 (fallback path)** — When LLM ranking fails, the fallback path (`review_routes.py:1386`) returns `authority_signals: []` for all publications, removing a key persuasion signal from the UI.

3. **US-P2 AC 2.2** — Institution placement check uses a hardcoded brand list that excludes domain-specific organisations (niche biotech companies, specialist journals) not in the preset list.

4. **US-P6 AC 6.2** — Consistency report checks keyword presence but not argumentative framing or narrative alignment between summary and cover letter.

**Low (Minor quality improvements):**

1. **US-P4 AC 4.4** — Result clause absence is flagged at `info` severity rather than `warn`. Consider elevating to match the passive-voice check so result-less bullets are equally prominent.

2. **US-P3 AC 3.1** — CAR structure is detected reactively. A proactive signal in the rewrite prompt — instructing the LLM to construct CAR bullets when challenge context is detectable in master-data text — would strengthen persuasive output without backend changes.
