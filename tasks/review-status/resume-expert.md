<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Resume Expert Review Status

**Last Updated:** 2026-07-07 22:03 ET

**Executive Summary:** GAP-387's false-positive determination **CONFIRMED**. `LLMClient.check_summary_generic_phrases()` (scripts/utils/llm_client.py:1409-1441) genuinely exists, checks proposed text against a 22-phrase `_GENERIC_FILLER_PHRASES` set (llm_client.py:1076-1100) that includes exactly the phrases US-R4 calls out ("results-driven", line 1087), and is wired into `run_persuasion_checks()` at scripts/utils/conversation_manager.py:1554-1556, gated by `location == 'summary' or rewrite_type == 'summary'`. Independently traced `apply_approved_rewrites()` (cv_orchestrator.py:1675-1736) and confirmed the only two prose rewrite kinds the system ever produces are `summary` and `bullet` (location always `exp_ID.achievements[N]`) — so the `summary`-only gate on the generic-filler check is not a coverage hole, it is the correct scope; bullets are covered by a *different*, appropriately-scoped set of checks (weak-verb/no-metric/vague-language/negative-framing in `CVOrchestrator.check_persuasion()`, cv_orchestrator.py:4812+). The cover-letter generation path (a third prose surface, outside `run_persuasion_checks`) independently calls `check_summary_generic_phrases` too (scripts/routes/master_data_routes.py:2229), so no rewrite/generation surface in the app skips the filler-phrase check. One **new, real, minor bug** found in the same area during independent verification: web/cover-letter.js's `_persuasionFlagLabels` map (line 767) has a stale key `generic_phrases` that never matches the backend's actual `flag_type` value `generic_summary` (llm_client.py:1418/1438), so the cover-letter warning UI falls back to displaying the raw code `generic_summary` instead of the friendly "Generic phrases" label — cosmetic only, the warning itself still surfaces with correct severity/details.

## Application Evaluation

### US-R1: Job Description Analysis Quality
- ⚠️ **Required vs. preferred split** — LLM prompt distinguishes role level (`llm_client.py:312`) and job analysis schema captures `required_skills`/`ats_keywords`, but I found no explicit UI section split for "required" vs "preferred" qualifications comparable to the acceptance criterion ("visually distinct sections"); not independently re-verified this cycle beyond confirming the schema exists — treat as unchanged from prior findings (—, not re-audited in depth this pass).
- 🔲 Keyword deduplication / synonym grouping — not re-verified this cycle; out of scope of this pass's focus (persuasion pipeline). No regression evidence found.
- 🔲 Domain inference confidence/ambiguous-case prompting — not re-verified this cycle.

### US-R2: Content Selection Strategy
- 🔲 Not re-verified this cycle (out of focus area); no evidence of regression encountered while reading `cv_orchestrator.py` broadly.

### US-R3: Rewrite Quality and Constraint Adherence
- ✅ **Factual preservation** — `LLMClient.apply_rewrite_constraints()` (llm_client.py:952-1000) rejects any proposed rewrite that drops a numeric token (`nums_orig.issubset(nums_prop)`, line 987) or a proper-noun/Title-Case token not in a curated stop-word list (line 997), and `apply_approved_rewrites()` calls it as a hard gate before applying any rewrite (cv_orchestrator.py:1721, "skip if numbers/dates/names lost").
- ✅ **No fabrication (`skill_add`)** — the rewrite-proposal schema requires `evidence` (comma-separated experience IDs) and `evidence_strength` ("strong"/"weak") for `skill_add` (llm_client.py:764-774, 1977-1984), and `apply_approved_rewrites()` flags weak-evidence skill adds with `candidate_to_confirm: True` (per its docstring, cv_orchestrator.py:1695-1698).
- ✅ **Keyword-appended-at-end detection** — `LLMClient.check_keyword_appended()` (llm_client.py:1444) is wired into `run_persuasion_checks()` for bullet locations only when `ats_keywords` are present (conversation_manager.py:1541-1546), directly implementing the "…pipelines. MLOps." failure-mode check from the story.
- 🔲 Terminology consistency across summary/bullets/skills — a batch-level `_VARIANT_GROUPS` consistency check exists (conversation_manager.py:1580+, tagged GAP-233) but I did not fully trace its pass/fail wiring this cycle; flagging for a future pass rather than asserting confidence either way.

### US-R4: Professional Summary Effectiveness
- ✅ **No fluff / "results-driven" suppression** — directly confirmed: `check_summary_generic_phrases()` flags "results-driven" and 21 other filler phrases (llm_client.py:1076-1100), runs on every summary rewrite (conversation_manager.py:1554-1556) and every cover letter (master_data_routes.py:2229), with `pass = len(found_phrases) <= 1` (line 1437) — i.e. it tolerates at most one incidental match before warning, and warns (severity `warn`) at 3+ matches (line 1435).
- 🔲 Hook quality (role type + years + differentiator) and leadership-scope-stated criteria are prompt-engineering concerns handled in the LLM instructions (llm_client.py:312 mentions role level) rather than post-hoc automated checks — no static check verifies these; not a regression, just an acknowledged coverage gap in *automated* verification (the LLM is trusted to follow prompt instructions here). Not re-scored this cycle.

### US-R5: Skills Section Optimisation
- ✅ **"Candidate to confirm" flagging surfaced in UI, not silently dropped** — `web/skills-review.js:697` reads `skill.candidate_to_confirm === true` and renders a distinct visual indicator; consistent with `apply_approved_rewrites()` setting that flag for weak-evidence skill adds (cv_orchestrator.py:1696-1698).
- 🔲 Whether the flag is stripped from generated output documents (PDF/DOCX/HTML) — not re-verified this cycle; recommend a follow-up grep of the document-generation templates for `candidate_to_confirm` to confirm it's stripped before render, since this is a "never appear in generated output" hard requirement.

### US-R6: Rewrite Audit Traceability
- 🔲 Not re-verified this cycle (out of focus area). No regression evidence encountered.

### US-R7: Spell & Grammar Check Quality
- ✅ **Context-aware rule suppression** — `SpellChecker.check(text, context=...)` (scripts/utils/spell_checker.py:171) suppresses `SENTENCE_FRAGMENT`/`PUNCTUATION_PARAGRAPH` rules in `bullet` context (line 203, `SUPPRESSED_BULLET_RULES`) and restricts `skill` context to spelling-only rules via `_is_spelling_rule()` (line 207), matching the story's fragment-tolerance and skill-name criteria directly.
- ✅ **Custom dictionary dedup on write** — `add_word()` (spell_checker.py:80-90) and `prepopulate_from_skills()` (line 92-103) both case-insensitively check membership (`{w.lower() for w in self._custom_words}`) before appending, so duplicate/whitespace-variant entries cannot accumulate through the normal write path.
- 🔲 Severity calibration/sort order and full custom-dictionary seeding from `Master_CV_Data.json` on first run — not independently re-verified this cycle.

## Generated Materials Evaluation

- ✅ **Persuasion pipeline coverage is now correctly attributed** (re: GAP-387) — the check exists, is real, and is invoked for every prose surface that can contain "results-driven"-style filler: proposed summary rewrites (conversation_manager.py:1554) and generated cover letters (master_data_routes.py:2229). Achievement bullets are deliberately excluded from this specific check (by design — bullets aren't summaries) but are covered by an independent, arguably *more* thorough vague-language/negative-framing/no-metric detector in `CVOrchestrator.check_persuasion()` (cv_orchestrator.py:4812-4929), exposed via `scripts/routes/review_routes.py:2473`.
- ⚠️ **New minor bug (cover-letter persuasion label mismatch)** — `web/cover-letter.js:764-772` defines `_persuasionFlagLabels` with key `generic_phrases`, but the backend's actual `flag_type` for this check is `generic_summary` (llm_client.py:1418, 1438). The lookup `_persuasionFlagLabels[w.flag_type] || w.flag_type` (line 775) therefore misses and falls back to displaying the raw string `generic_summary` in the cover-letter quality-check panel instead of the intended "Generic phrases" label. Contrast with `web/rewrite-review.js:255,445`, which avoids this entire class of bug by deriving the label dynamically (`w.flag_type.replace(/_/g,' ')`) instead of hardcoding a lookup table — recommend cover-letter.js adopt the same pattern, or simply fix the map key from `generic_phrases` to `generic_summary`.
- ✅ **No other missing rewrite-location coverage found** — traced every rewrite `type` the system produces (`summary`, `bullet`, `skill_rename`, `skill_add` — cv_orchestrator.py:1685-1698) and confirmed `bullet` locations always match the `'exp' in location.lower()` gate used for the other bullet-specific checks (car_structure, keyword_appended, positive_metric_framing) in `run_persuasion_checks`. There is no free-text rewrite location that falls outside both the `summary` and `exp_*` gates, so no rewrite silently skips all persuasion checking.
- 🔲 GAP-384 (focus-restore in modals) — spot-checked `web/achievements-review.js:806-809` (AI-rewrite modal) and confirmed it correctly calls `pushFocusStack(document.activeElement)` / `setInitialFocus` / `trapFocus` around the rewrite-review modal, consistent with the GAP-384 pattern. No impact on persuasion-check content or logic observed; this is an accessibility/UX concern outside this persona's primary scope, deferred to the accessibility-specialist and ux-expert reviews.

## Additional Story Gaps / Proposed Story Items

- Consider adding an explicit acceptance criterion to US-R4 (or a new story) requiring the label/lookup tables that render backend `flag_type` values in the UI be either (a) generated dynamically from the flag_type string, or (b) covered by a unit test asserting every `flag_type` the backend can emit has a corresponding UI label — the `generic_phrases`/`generic_summary` mismatch found this cycle is exactly the kind of silent drift such a test would catch.
- No new gap ticket needed for GAP-387 itself; recommend closing it as confirmed-false-positive per this independent re-verification.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/utils/cv_orchestrator.py, scripts/utils/llm_client.py

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-R1 | 0 | 1 | 0 | 2 | 0 |
| US-R2 | 0 | 0 | 0 | 1 | 0 |
| US-R3 | 2 | 0 | 0 | 1 | 0 |
| US-R4 | 1 | 0 | 0 | 1 | 0 |
| US-R5 | 1 | 0 | 0 | 1 | 0 |
| US-R6 | 0 | 0 | 0 | 1 | 0 |
| US-R7 | 2 | 0 | 0 | 1 | 0 |

**Key evidence references:**
- GAP-387 re-verification: `check_summary_generic_phrases` exists and works → scripts/utils/llm_client.py:1409-1441
- GAP-387 re-verification: wired into persuasion pipeline → scripts/utils/conversation_manager.py:1554-1556
- GAP-387 re-verification: also wired into cover-letter generation → scripts/routes/master_data_routes.py:2229
- New bug found: cover-letter UI label mismatch (`generic_phrases` vs `generic_summary`) → web/cover-letter.js:764-775 (contrast correct dynamic pattern at web/rewrite-review.js:255,445)
- US-R3: constraint validation preserves numbers/proper nouns → scripts/utils/llm_client.py:952-1000
- US-R3: skill_add evidence requirement → scripts/utils/llm_client.py:764-774, 1977-1984
- US-R5: candidate-to-confirm UI flag → web/skills-review.js:697
- US-R7: bullet/skill context-aware rule suppression → scripts/utils/spell_checker.py:171-210
- US-R7: custom dictionary dedup on write → scripts/utils/spell_checker.py:80-103
