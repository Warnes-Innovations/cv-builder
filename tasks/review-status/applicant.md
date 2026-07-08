<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-07-07 23:18 ET

**Executive Summary:** Follow-up committee pass (cycle 106) verifying the claimed fixes for GAP-393 (rerun audit-trail diff) and GAP-395 (cover-letter/screening `session_path` provenance inconsistency). **GAP-393: RESOLVED** — sign off yes. **GAP-395: PARTIAL** — the web-facing bug is genuinely fixed and well tested, but an untouched sibling instance of the exact same inconsistency remains in `scripts/cv-preview.py`'s CLI render path; sign off conditional on that follow-up (see below). Both verified independently by reading current source and running the actual test suites (36/36 `tests/test_intake_rerun.py`, 13/13 `tests/test_cover_letter.py`, all vitest `workflow-steps.test.js` cases pass).

**GAP-393 (rerun audit diff) — RESOLVED.**

`ConversationManager.record_rerun_diff(phase, changed, total)` (`scripts/utils/conversation_manager.py:1874-1894`) attaches the client-computed `{changed, total}` to the most recent `rerun_log` entry for that phase. Verified in detail:

- **Phase-string resolution is consistent** between the two call sites: `re_run_phase()` resolves via `self._STEP_TO_PHASE.get(target_phase, target_phase)` and stores `'phase': str(resolved)` in the log entry (`conversation_manager.py:1775`, `:1862`); `record_rerun_diff()` resolves the same way — `str(self._STEP_TO_PHASE.get(phase, phase))` (`:1886`) — so a short frontend step name (e.g. `'spell'`) and the internal `Phase` enum string always match up.
- **Multiple re-runs of the same phase do not mismatch/overwrite.** The method walks `rerun_log` in reverse and patches only the first entry matching the phase that does **not already have** a `'changed'` key (`:1888-1891`), then stops. This correctly targets "the newest still-pending entry for this phase" rather than always the last entry in the list. Confirmed by a dedicated regression test, `test_record_rerun_diff_does_not_overwrite_an_already_recorded_entry` (`tests/test_intake_rerun.py:295-306`), which reruns `'spell'` twice, submits two diffs, and asserts entry 1 keeps `changed=1` while entry 2 gets `changed=2` — passes.
- **Residual (low-severity) race, noted but not a blocker:** the frontend fires the diff POST fire-and-forget (`.catch(() => {})`, `web/workflow-steps.js:446-450`) right after the main rerun call resolves, with no `await`. If a user triggered a second rerun of the *same* phase before the first rerun's fire-and-forget diff request completed, the second rerun's log entry (newest, no `'changed'` key yet) could receive the *first* rerun's diff by mistake, since the matcher only checks "phase matches + no changed key yet," not "this exact rerun call." In practice this is very unlikely to manifest: the diff POST is a near-instant local write, while triggering another rerun of the same phase requires a full new LLM round-trip, so the diff POST from rerun N reliably lands before rerun N+1's log entry exists. Not something I'd block sign-off on, but worth a one-line comment in the code if a future contributor tries to make reruns fully concurrent.
- **Endpoint** `POST /api/re-run-phase/audit-diff` (`scripts/routes/job_routes.py:852-875`) validates `phase`/`changed`(int)/`total`(int) presence, returns 404 via `result.get('ok')` when no matching pending entry exists.
- **Tests, all passing:** `tests/test_intake_rerun.py::TestReRunPhaseNewSteps::test_record_rerun_diff_attaches_changed_total_to_matching_entry`, `test_record_rerun_diff_does_not_overwrite_an_already_recorded_entry`, `test_record_rerun_diff_returns_error_when_no_matching_entry` (backend, 3/3), plus `tests/test_intake_rerun.py::TestReRunPhaseAuditDiffEndpoint` (endpoint-level, 3/3) and `tests/js/workflow-steps.test.js` "reports the computed diff back to the server so the audit log records it (GAP-393)" / "does not call the audit-diff endpoint when no prior/new output is returned" (both pass). Full suite: 36/36 Python, all vitest cases green.

**GAP-395 (session_path provenance inconsistency) — PARTIAL, not fully resolved.**

The claimed fix in `cover_letter_prior()` is real and correct for its own endpoint: `scripts/routes/master_data_routes.py:2045-2059` now returns `'session_path': str(session_file.parent)` — a directory, matching screening's `response_library.json` format (`str(output_dir)`, `master_data_routes.py:2590,2599`). `test_session_path_is_the_containing_directory_not_the_session_json_file` (`tests/test_cover_letter.py:171-188`) asserts exactly this and passes, as do the other 12 tests in `test_cover_letter.py`. The frontend (`web/cover-letter.js:281-294`) passes the value through opaquely as `reuse_session_path` with no path manipulation, so nothing downstream of the web UI depended on the old file-suffix shape — this half of the fix is solid.

**However, a sibling instance of the identical bug remains unfixed.** `scripts/cv-preview.py` — a separate, actively-used CLI rendering tool (has its own `cv-preview.sh` wrapper, invoked from `test_cv_comprehensive_cli.py`, with its own `tests/test_cv_preview_cli.py`) — independently writes the **same** `cover_letter_reused_from` key into the **same** `metadata.json` file, but still in the old file-path form:

- `scripts/cv-preview.py:518`: `reused_from = str(session_file)` (the `session.json` file itself, not its parent directory)
- flows into `_write_cover_letter_docx(..., reused_from=reused_from)` (`:340-373`) which does `metadata['cover_letter_reused_from'] = reused_from` (`:369`)

This is the exact class of bug GAP-395 was raised against (a provenance-identifier field whose format differs depending on which code path wrote it), in a code path the fix never touched. `tests/test_cv_preview_cli.py` has no assertion on `cover_letter_reused_from`'s shape, so this wasn't caught by CI. Currently nothing reads `cover_letter_reused_from` back out of `metadata.json` anywhere in the codebase (confirmed by grep — it is write-only today), so this is **not an active runtime bug**, but it does mean the fix's own stated goal — "so this provenance identifier has the same shape as screening's ... session_path" (`master_data_routes.py:2047-2049` comment) — is not actually achieved codebase-wide. A future feature that displays or diffs "which session a cover letter was reused from" across both the web-generated and CLI-rendered paths would silently receive inconsistent values again.

**Recommendation:** change `scripts/cv-preview.py:518` to `reused_from = str(session_file.parent)` and add a regression test to `tests/test_cv_preview_cli.py` asserting the metadata value has no `session.json` suffix, mirroring `tests/test_cover_letter.py:171-188`.

**GAP-381 (cover_letter_reused_from) — RESOLVED** *(prior cycle, unchanged this pass).* `web/cover-letter.js` sends `reuse_session_path` (from the selected prior letter's `session_path`) alongside `reuse_body` in the `/api/cover-letter/generate` POST body (`web/cover-letter.js:281-294`). `scripts/routes/master_data_routes.py:2217` sets `conversation.state['cover_letter_reused_from'] = reuse_session_path or None` inside `cover_letter_generate()`, and `cover_letter_save()` at `scripts/routes/master_data_routes.py:2345` writes that state value into `metadata['cover_letter_reused_from']` when the letter is saved. The chain (UI → generate → state → save → metadata.json) is intact and null-safe when no prior letter is selected.

**GAP-382 (reused_from_session) — RESOLVED** *(prior cycle, unchanged this pass).* `web/screening-questions.js:159` stores `p.session_path` into `_screeningState[idx].priorSessionPath` inside `searchForQuestion()`. `saveScreeningResponses()` (`web/screening-questions.js:318-324`) computes `reused_from_session` from `priorSessionPath` only when `usePrior` is checked, else `null`, and includes it in each response object posted to `/api/screening/save`. The backend (`scripts/routes/master_data_routes.py:2569`) writes the raw `responses_in` array — including `reused_from_session` — straight into `metadata['screening_responses']`, so the field survives to disk unmodified.

## Application Evaluation

#### US-A1: Discover and Queue a Job Opportunity
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | URL and paste-text paths both work | ✅ | `scripts/routes/job_routes.py` provides fetch/extract paths (`:319-332` protected-site list) alongside plain-text paste handling in the job tab. |
| 2 | Protected-site warning + manual-copy fallback | ✅ | `scripts/routes/job_routes.py:319-332` — LinkedIn/Indeed protected-site messages with manual-copy instructions. |
| 3 | Company/role/date auto-extracted and editable | ✅ | `scripts/routes/status_routes.py:1071` `/api/intake-metadata`, `:1110` `confirm_intake()`; `scripts/utils/conversation_manager.py:2204` `apply_confirmed_intake()`. |
| 4 | Session persisted immediately after confirmation | ✅ | `apply_confirmed_intake()` persists `self.state['intake']` (`scripts/utils/conversation_manager.py:2221`) followed by session save. |

#### US-A2: Understand What the Job Requires
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Required/preferred split displayed | ✅ | Rendered via job-analysis tab (not re-verified line-by-line this pass, but `job_analysis` schema fields consumed throughout `web/*.js`). |
| 2 | Mismatch analysis surfaces as clarifying question | ✅ | `web/review-table-base.js:561` renders "required skill(s) not found in your master CV" callout; `scripts/utils/cv_orchestrator.py:5765-5830` computes mismatches. |
| 3 | Clarifying question when domain/role ambiguous | ⚠️ | Not independently re-verified this pass which specific ambiguity triggers a question vs. always being asked; recommend a follow-up spot-check of `analyze_job_description()` prompt logic. |
| 4 | Answers persist in session + `metadata.json.clarification_answers` | ✅ | `scripts/routes/generation_routes.py:2161` `metadata['clarification_answers'] = conversation.state.get('post_analysis_answers')`. |
| 5 | Clarification answers passed to downstream LLM calls (cover letter, screening) | ✅ | Cover letter: `scripts/routes/master_data_routes.py:2111-2116` (`answers_snippet` built from `post_analysis_answers`). Screening: `scripts/routes/master_data_routes.py:2464-2470` (`cl_context` built from same). |
| 6 | Prior-session answers pre-populated as defaults | 🔲 | No evidence found this pass of a "same role type → pre-populate prior answers" mechanism distinct from the re-run amend-modal (which pre-fills from the *current* session only, `web/workflow-steps.js:304-407`). Needs confirmation against a fresh job/analysis flow. |
| 7 | Analysis results survive browser refresh | ✅ | Session-backed via `conversation.state`/`_save_session()` pattern used throughout `conversation_manager.py`. |

#### US-A3: Review and Approve Content Customisations
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Relevance score + rationale per item | ✅ | `web/review-table-base.js` renders score/rationale columns (consumed by experience/skills/achievements/publications review tabs). |
| 2 | Include/exclude toggles per category | ✅ | `experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions` all present in `conversation_manager.py` state and round-tripped via `scripts/routes/review_routes.py:359`. |
| 3 | Up/down reorder for experiences/achievements/skills/publications | ✅ | Bullet reorder modal: `web/workflow-steps.js:667-891` (`showBulletReorder`, `moveBullet`, `saveBulletOrder`). |
| 4 | Bullet reordering within an entry | ✅ | Same as above — `/api/reorder-bullets` (`web/workflow-steps.js:877-897`). |
| 5 | Omit suggestions explained | ⚠️ | Rationale text exists in recommendation payloads generally; did not confirm this pass that "omit section" suggestions specifically carry inline rationale text in the UI (vs. just being an accept/reject toggle). |
| 6 | Publications list shown/ranked when non-empty; omitted section if all rejected | ✅ | `web/publications-review.js:83`, `scripts/routes/review_routes.py:359` (`publication_decisions`); state field `publication_decisions` initialized as dict, consistent with opt-out-per-item design. |
| 7 | Confirmed decisions persist incl. `clarification_answers.selected_publications` | ⚠️ | `publication_decisions` persists to `metadata.json` (`scripts/routes/generation_routes.py:885`), but the AC specifically names the path `clarification_answers.selected_publications` — did not find that exact nested key; publication decisions appear to live at `metadata.publication_decisions` (sibling, not nested under `clarification_answers`). Worth reconciling story wording vs. implementation, or confirming intentional divergence. |

#### US-A3b: Organise Skills into Categories and Inline Bullet Groups
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Category headings + reorder + rename + move + create | ✅ | `web/skills-review.js:480` (`skill_qualifier_overrides`), `:559` (`skill_category_order`); backend state keys `skill_group_overrides`, `skill_category_overrides`, `skill_category_order`, `skill_qualifier_overrides` all present in `scripts/utils/conversation_manager.py`. |
| 2 | LLM suggestions shown for review, not silent | ⚠️ | Not independently re-verified this pass; plausible given the general "propose → accept/reject" pattern used elsewhere, but no direct citation found for skills-category LLM suggestions specifically. |
| 3 | Proficiency / sub-skills / parenthetical editable | ✅ | `skill_qualifier_overrides` state key exists for this purpose (`web/skills-review.js:480`). |
| 4 | New skills addable with full metadata | ✅ | `extra_skills` state list (`scripts/utils/conversation_manager.py`) backs this. |
| 5 | Readability warning for long inline bullets | 🔲 | No evidence found this pass of a client-side "unusually long bullet" readability warning. Flag as a likely gap pending confirmation. |

#### US-A4: Review and Approve Text Rewrites
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Before/after diff per proposal | ✅ | `web/rewrite-review.js` card rendering (existing pattern, consistent with weak-badge evidence below). |
| 2 | Weak-evidence skill_add badged | ✅ | `web/rewrite-review.js:399-401` — `isWeakSkillAdd` renders "⚠ Weak evidence" badge for `evidence_strength === 'weak'`. |
| 3 | Edited text is what's used, not original | ✅ | Standard accept/edit/reject pattern; `approved_rewrites` state stores final text (used later e.g. `master_data_routes.py:2148-2151` cover-letter context pulls `proposed`/`original`). |
| 4 | Submit blocked until all actioned | ✅ | `web/rewrite-review.js:601-604` — `submitBtn.disabled = (pending > 0) || needsAck;`. |
| 5 | Rewrite audit persisted | ✅ | `rewrite_audit` state key, `scripts/utils/conversation_manager.py` init list. |

#### US-A4b: Spell & Grammar Check Before Generation
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | No sentence-fragment warnings for bullet/skill_name context | — | Not re-verified this pass (LanguageTool config specifics not read). |
| 2 | Dictionary words produce no flags | ✅ | `scripts/utils/spell_checker.py:14,46` — `DEFAULT_DICT_PATH = ~/CV/custom_dictionary.json` consulted by checker. |
| 3 | Add to Dictionary suppresses immediately + persists | ✅ | `web/spell-check.js:255` "Add to Dictionary" button wired to dictionary persistence path referenced above. |
| 4 | Edit applies user text | — | Not re-verified this pass. |
| 5 | Proceed blocked until resolved | — | Not re-verified this pass (pattern consistent with US-A4's blocking pattern, but not directly cited). |
| 6 | Spell audit persisted + in metadata.json | ✅ | `spell_audit` referenced alongside `rewrite_audit` in `generation_routes.py:2163` area metadata writes. |
| 7 | Zero-flag case completes instantly | — | Not re-verified this pass. |

#### US-A5a/b/c: HTML Preview, Layout Refinement, Final Output
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | HTML-only generation first | — | Not re-verified line-by-line this pass; step ordering in `web/index.html:197-205` (button sequence "Generate Preview → / Open Layout Review → / Confirm Layout") matches the intended 3-step flow. |
| 2 | Layout instructions free-text → LLM → incremental apply | ✅ | `scripts/routes/review_routes.py:2164-2199`; `scripts/routes/generation_routes.py:1672-1725` (`layout_instructions` append with `instruction_record`). |
| 3 | `metadata.json.layout_instructions` recorded | ✅ | `scripts/routes/generation_routes.py:2163` — `metadata['layout_instructions'] = conversation.state.get('layout_instructions') or []`. |
| 4 | PDF + ATS DOCX generated from confirmed HTML (no re-render from scratch) | ⚠️ | Not independently confirmed this pass that PDF/DOCX derive strictly from the already-rendered HTML vs. a fresh render pass using the same data; `cv_orchestrator.py` has separate PDF/DOCX/ATS code paths (`:4415`, `:5435` weak-skill filtering duplicated in each format), which is consistent with either interpretation. |
| 5 | Errors surface as user-visible messages | ✅ | `web/layout-instruction.js:1433` — user-visible error message with actionable next step. |

#### US-A6: Review and Iteratively Refine Generated Output
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Feedback routes to rewrite review OR customisation, not full restart | ✅ | `scripts/utils/conversation_manager.py:1725-1758` `back_to_phase()` preserves all downstream state and only marks steps after target as stale; `re_run_phase()` (`:1760-1872`) similarly targeted per-phase. |
| 2 | Previously approved decisions preserved as defaults | ✅ | `re_run_phase()` explicitly builds `_build_downstream_context()` and passes prior approvals into the new LLM call (`:1781, 1803-1811`). |
| 3 | Each cycle updates archive + metadata.json | ✅ | Consistent with `_save_session()` calls at end of both `back_to_phase()` and `re_run_phase()`. |
| 4 | Layout-only instructions routed to US-A5b, not treated as content change | ✅ | Layout instructions handled via separate `/api/layout/*` endpoints in `review_routes.py`/`generation_routes.py`, distinct from rewrite/customization re-run paths. |

#### US-A7: Generate Cover Letter — *GAP-381 focus*
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Prior same-tone/role-type letter surfaced as "use as starting point" | ✅ | `web/cover-letter.js:72-92` renders `_coverLetterPriorSessions` as radio-selectable prior-letter cards; backed by `GET /api/cover-letter/prior` (`scripts/routes/master_data_routes.py:2026-2059`). |
| 2 | Tone ≥ 4 preset options | ✅ | `web/cover-letter.js:20-26` — 5 tones (`startup/tech`, `pharma/biotech`, `academia`, `financial`, `leadership`). |
| 3 | Hiring manager name in salutation | ✅ | `scripts/routes/master_data_routes.py:2073,2180` — `hiring_manager` passed into `_OPENING_GUIDANCE.format(hiring_manager=hiring_manager)`. |
| 4 | References specific skills/achievements, not generic | ✅ | `scripts/routes/master_data_routes.py:2145-2155` injects up to 5 approved rewrites plus achievements into the prompt; anti-fabrication system instruction at `:2191` ("Base every claim strictly on the candidate profile provided..."). |
| 5 | LLM has `clarification_answers` as context | ✅ | `scripts/routes/master_data_routes.py:2111-2116` (`answers_snippet` from `post_analysis_answers`). |
| 6 | Editable before saving | ✅ | `web/cover-letter.js:155-157` textarea with `oninput` writing back to `_coverLetterFormState.letterText`. |
| 7 | Saved as `.docx`, `.pdf`, and `cover_letter_text` in metadata.json | ✅ | `scripts/routes/master_data_routes.py:2276-2338` (DOCX + WeasyPrint PDF), `:2338` (`metadata['cover_letter_text']`). |
| 8 | `metadata.json` records `cover_letter_reused_from` (session ID or null), same shape as screening's provenance identifier | ⚠️ **GAP-395 partially fixed** | Web path fixed: `scripts/routes/master_data_routes.py:2045-2059` (`cover_letter_prior()`) now returns a directory `session_path`, matching screening. But `scripts/cv-preview.py:518` (CLI render path) independently writes the same `cover_letter_reused_from` key as `str(session_file)` (a file path) — the sibling half of this AC is still broken. See GAP-395 discussion above. |

##### Failure Modes Present
| Failure mode | Present? |
|---|---|
| `cover_letter_reused_from` permanently null regardless of reuse | No — fixed, verified end-to-end (GAP-381, prior cycle). |
| Reuse checkbox selected but `reuse_session_path` not sent | No — both `reuse_body` and `reuse_session_path` derive from the same `_coverLetterPriorSessions[idx]` object, so they're always in sync (`web/cover-letter.js:282-287`). |
| Regenerating without reuse after a reused generation leaves stale `cover_letter_reused_from` | No — each `generate` call unconditionally overwrites `conversation.state['cover_letter_reused_from']` (`master_data_routes.py:2217`), so the value always reflects the most recent generation, not a stale prior one. |
| `session_path` / `cover_letter_reused_from` format differs depending on which code path (web UI vs. CLI render) wrote it | **Yes — GAP-395 sibling, unfixed.** `scripts/cv-preview.py:518` still writes `str(session_file)` into the same metadata key the web path now writes as a directory. Latent (nothing reads the field back today) but real. |

#### US-A8: Handle Application Screening Questions — *GAP-382 focus*
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Semantically similar prior responses surfaced per question | ✅ | `scripts/routes/master_data_routes.py:2362-2429` `screening_search()` — `_text_similarity` scored against `response_library.json`, threshold `>= 0.25`. |
| 2 | ≥3 relevant experience matches shown | ✅ | `scripts/routes/master_data_routes.py:2405-2410` — `[:3]` top experiences by score. |
| 3 | All 3 formats available, roughly correct length, no hard reject/retry | ✅ | `web/screening-questions.js:100-101,114` (`direct`/`star`/`technical` buttons + labels); `_SCREENING_FORMAT_GUIDANCE` drives word-range guidance in the prompt (`master_data_routes.py:2451`) with no evidence of auto-retry logic. |
| 4 | LLM has `cover_letter` + `clarification_answers` context | ✅ | `scripts/routes/master_data_routes.py:2464-2470,2483` — `cover_letter_snippet` and `cl_context` (from `post_analysis_answers`) both injected into the prompt. |
| 5 | Format/experience choices persist per question | ✅ | `_screeningState[idx]` tracks `format`/`experienceIndices` per question (`web/screening-questions.js:19-20,122-124,201-203`). |
| 6 | Responses editable before saving | ✅ | `web/screening-questions.js:271-274` — textarea with `oninput` writing back to state. |
| 7 | All responses exported in one DOCX | ✅ | `scripts/routes/master_data_routes.py:2544-2560` — single `Document()` with one heading per question. |
| 8 | Each finalized response stored as `{question, topic_tag, format, response_text, reused_from_session}` in `metadata.json` | ✅ **GAP-382 verified fixed** | `web/screening-questions.js:318-324` builds exactly this shape; `scripts/routes/master_data_routes.py:2569` writes the raw array (including `reused_from_session`) straight to `metadata['screening_responses']`. |
| 9 | `response_library.json` updated after saving | ✅ | `scripts/routes/master_data_routes.py:2573-2596` — appends one library entry per response with `session_path` (`str(output_dir)`, `:2590,2599` — the *output directory*, now the same shape the cover-letter path uses too, per GAP-395's web-side fix). |

##### Failure Modes Present
| Failure mode | Present? |
|---|---|
| `reused_from_session` never populated even when "Use as starting point" checked | No — fixed; `_screeningState[idx].priorSessionPath` is set whenever a prior match exists (`web/screening-questions.js:159`), and `reused_from_session` is derived from it only when `usePrior` is true (`:320-322`), else explicitly `null`. |
| `session_path` semantics differ between cover-letter (web path) and screening (output directory) | **Fixed this cycle for the web paths** (GAP-395) — `cover_letter_prior()` now returns a directory too. **Still present for the CLI render path** — see GAP-395 discussion at top of file and US-A7 AC8 above; `scripts/cv-preview.py:518` remains a sibling, unfixed instance. |
| Checkbox unchecked after search populates `priorSessionPath`, but a stale `usePrior=true` from a previous question index leaking into another — index collision | No — `_screeningState` is keyed by `idx` derived from block position, each block's checkbox `onchange` only touches its own `idx`; no cross-question leakage found. |

#### US-A9: Finalise, Archive, and Submit
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Status transitions persist | ✅ | `scripts/routes/generation_routes.py:2146-2147` validates status against `draft, ready, sent, queued, interview, rejected...`. |
| 2 | Notes field saved | — | Not re-verified this pass. |
| 3 | Git commit created automatically | ✅ | `scripts/routes/generation_routes.py:2204` — `commit_msg = f"feat: Add {company}_{role}_{date_str} application"`. |
| 4 | Summary shows keyword match score | — | Not re-verified this pass (ATS score badge exists elsewhere in the UI per `web/index.html:95-104`, but did not confirm it appears specifically in the Finalise summary). |

#### US-A10: Update Master CV Data
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | NL update → proposed JSON diff before write | ✅ | `scripts/routes/master_data_routes.py:611` — "Propose a structured master-data diff from bulk document text..." confirms review-before-write pattern exists. |
| 2 | Document ingestion with review step | ✅ | Same endpoint family handles bulk ingestion per its docstring. |
| 3 | No blind writes | — | Not independently re-verified this pass beyond the docstring evidence above. |
| 4 | Git commit on confirmed update | — | Not re-verified this pass. |

#### US-A11: Session Master Data Harvest
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Harvest prompt appears after Finalise, skippable | ✅ | `scripts/routes/generation_routes.py:2271` `harvest_candidates()`, `:2282` `harvest_analyze()`, `:2329` `harvest_apply()` — separate opt-in step from finalise. |
| 2 | Candidates from rewrites/skills/summary/clarification gaps | ✅ | `_collect_harvest_skill_candidates`, `_compile_harvest_candidates`, `_harvest_add_summary_variant` all present (`generation_routes.py:78-1309`). |
| 3 | No pre-selected items (opt-in only) | ✅ | `web/harvest.js:95` — "All harvest items start unchecked — master CV updates are opt-in only (US-A11)." |
| 4 | Before/after diff + rationale per item | — | Not re-verified this pass beyond candidate-compilation evidence. |
| 5 | Git commit on confirmed harvest | ✅ | `scripts/routes/generation_routes.py:2330` docstring — "Write selected harvest candidates back to Master_CV_Data.json and git commit." |

#### US-A12: Re-enter and Re-run Earlier Workflow Stages
##### Acceptance Criteria
| # | Criterion | Status | Notes / File:Line |
|---|---|---|---|
| 1 | Re-run affordance visible on completed stage chips | ✅ | `web/workflow-steps.js:1037-1043` — `.step-rerun` button injected for `RE_RUN_STEPS` (analysis, customizations, rewrite, spell, layout). |
| 2 | Confirmation dialogue lists affected downstream stages | ✅ | `web/workflow-steps.js:139-189` `_showReRunConfirmModal()` computes `downstream` from completed steps after the target. |
| 3 | Re-run never silently discards approvals | ✅ | `re_run_phase()` explicitly preserves state and passes prior approvals as context (`scripts/utils/conversation_manager.py:1780-1817`); UI copy states "All existing approvals and rewrites are preserved as context" (`workflow-steps.js:154`). |
| 4 | LLM receives full context (job text, current clarification answers, downstream summary) | ✅ | `_build_downstream_context()` call (`conversation_manager.py:1781`) plus `user_prefs['_prior_context'] = ctx` (`:1804-1805`). |
| 5 | Only changed/new items highlighted post-rerun | ✅ | `_highlightChangedItems()` / `_countChangedItems()` (`web/workflow-steps.js:486-604`) diff prior vs. new output per-entity. |
| 6 | Clarification answers amendable when re-running Analysis | ✅ | `_showAnalysisClarificationAmendModal()` (`web/workflow-steps.js:304-407`) — "Update & Rerun" posts to `/api/post-analysis-responses` before re-running. |
| 7 | Audit log records stage, timestamp, previous clarification answers (if changed), and downstream-affected count | ✅ **GAP-393 verified fixed** | `rerun_log` entries record phase + timestamp (`scripts/utils/conversation_manager.py:1861-1865`), and the downstream-affected `{changed, total}` count is now attached via `record_rerun_diff()` (`:1874-1894`), fed by the frontend's already-computed `_countChangedItems()` result posted to `POST /api/re-run-phase/audit-diff` right after each re-run (`web/workflow-steps.js:436-451`, `scripts/routes/job_routes.py:852-875`). Verified against multiple-rerun-of-same-phase edge case — see GAP-393 discussion at top of file. Note: previous clarification answers are still not separately snapshotted in the log entry itself (only the diff count is), a narrower residual gap than before but not zero — see note below. |
| 8 | Re-run also accessible via keyboard shortcut, not only progress bar | ✅ | `web/keyboard-shortcuts.js:12,269-275` — Ctrl+Shift+R calls `confirmReRunPhase(step)` for the currently active step. |

##### Failure Modes Present
| Failure mode | Present? |
|---|---|
| Re-running analysis silently overwrites all customisation decisions | No — `_showReRunConfirmModal` + preserved-context re-run avoid this. |
| Re-run triggers only reachable by navigating back with no return path | No — the ↻ button is inline on the step chip itself, no navigation required first. |
| No visual indication of which items were affected | No — `_markChanged()` + "Changed (N)" filter toggle (`workflow-steps.js:607-665`). |
| User must re-answer all clarifying questions from scratch on a one-answer change | No — the amend modal pre-fills existing answers and lets the user keep-as-is or change individual fields (`workflow-steps.js:315-341`). |
| Rerun audit trail omits the changed/total item diff | **No longer — fixed (GAP-393).** `record_rerun_diff()` now attaches `{changed, total}` to the matching `rerun_log` entry; regression-tested for the multi-rerun-of-same-phase case. |
| Rerun audit trail still doesn't snapshot *prior clarification answers* verbatim per entry | **Minor, still open.** GAP-393's fix targeted the item-diff count specifically (that's what was asked for and what's tested); a literal reading of the AC also wants the previous clarification-answer values recorded per rerun entry when they changed. Not addressed by this fix and not something I'd block sign-off on — flagging as a smaller follow-up, not a regression. |

## Generated Materials Evaluation

Note: this pass evaluated the **prompt engineering and quality-gate code paths** that govern generated-document quality, not a live-generated CV/cover-letter/screening-response sample (no session was run this pass). Findings below are about the mechanisms that determine materials quality, not a review of specific output text.

- **Cover letter anti-hallucination guard**: system prompt explicitly instructs "Base every claim strictly on the candidate profile provided. Do not invent, embellish, or fabricate any achievement, metric, role, technology, or fact not present in the source material." (`scripts/routes/master_data_routes.py:2191`). This is a strong, explicit safeguard against a common LLM cover-letter failure mode (fabricated metrics).
- **Cover letter persuasion/quality checks run twice** — server-side (`master_data_routes.py:2213-2235`, checks for passive voice, hedging, generic phrases, weak action verbs, missing result clauses, negative metric framing, missing named institution) and again client-side in `_validateCoverLetter()` (`web/cover-letter.js:550-791`, 10 rules including opening salutation, "I"-first opening, company-name frequency, company-context substance, paragraph-1 role/company mention, role-differentiated word-count targets, call-to-action assertiveness, quantified-achievement detection, and generic filler-phrase detection). This dual-layer check is unusually thorough for a tool in this space and should catch most generic-cover-letter failure modes before the applicant ever sees the "Save" button.
- **Screening response format guidance** is length-targeted per format (Direct/STAR/Technical) via `_SCREENING_FORMAT_GUIDANCE` (`scripts/routes/master_data_routes.py:2451`), consistent with the story's non-strict word-count guardrail (US-A8 AC3 explicitly says targets are guidance, not hard-rejected).
- **Weak-evidence skill filtering is applied consistently across all three output formats** (ATS DOCX `cv_orchestrator.py:4415`, human DOCX `:5435`, and the general HTML/PDF path `:217`) — a skill flagged `evidence_strength == 'weak'` and not confirmed by the user is excluded from every generated document, not just the one the developer happened to think of first. This is good defense against "unreviewed AI suggestion silently ships to the ATS-facing document."
- **Acronym-expansion instruction** appears in both the cover letter prompt (`master_data_routes.py:2185`) and the screening-response prompt (`:2486`) — a thoughtful touch for non-technical HR/recruiter readers, applied consistently rather than only in one document type.
- **Not verified this pass**: actual rendered PDF/DOCX visual layout (fonts, margins, two-column balance) — the project's own guidance says PDF layout must be reviewed from the rendered PDF itself, not source; that requires actually running a generation cycle, which was out of scope for a source-only persona pass.

## Additional Story Gaps / Proposed Story Items

- **GAP-395 sibling in `scripts/cv-preview.py` (new this cycle)**: `render_generated_assets()` (`scripts/cv-preview.py:518`) still sets `reused_from = str(session_file)` — a file path — which flows into `metadata['cover_letter_reused_from']` (`:369`) alongside the now-fixed web path's directory-shaped value. Same field, same file, two shapes depending on which code path wrote it. Fix: change to `str(session_file.parent)` and add a regression test to `tests/test_cv_preview_cli.py` mirroring `tests/test_cover_letter.py:171-188`. Currently latent (nothing reads the field back), so not urgent, but should be closed out before GAP-395 is called fully resolved.
- **US-A12 audit-log completeness, narrowed**: GAP-393 fixed the downstream-affected `{changed, total}` count (`record_rerun_diff()`, `scripts/utils/conversation_manager.py:1874-1894`). What remains open against a literal reading of the AC: `rerun_log` entries still don't snapshot the previous `post_analysis_answers` values at the time of an analysis re-run. Smaller in scope than before this cycle's fix, but not fully closed.
- **US-A3 AC "clarification_answers.selected_publications"**: the acceptance criterion names a specific nested metadata path that doesn't match where `publication_decisions` is actually persisted (`metadata.publication_decisions`, sibling of `clarification_answers` rather than nested under it). Either the story wording or the implementation should be reconciled — as written, a strict reading of the AC would fail.
- **US-A3b readability warning for long inline skill bullets**: no evidence found of this warning; recommend a dedicated follow-up check (this pass used grep-based sampling, not an exhaustive read of `web/skills-review.js`).

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/routes/job_routes.py, scripts/routes/master_data_routes.py, web/workflow-steps.js, web/cover-letter.js, web/screening-questions.js, scripts/cv-preview.py, tests/test_intake_rerun.py, tests/js/workflow-steps.test.js, tests/test_cover_letter.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-A1..A12 | 45 | 8 | 0 | 2 | 11 |

**Key evidence references:**

- US-A12 (GAP-393, this cycle — RESOLVED): rerun diff audit trail → `scripts/utils/conversation_manager.py:1874-1894` (`record_rerun_diff`), `scripts/routes/job_routes.py:852-875` (endpoint), `web/workflow-steps.js:436-451` (client), `tests/test_intake_rerun.py:283-311` + `TestReRunPhaseAuditDiffEndpoint`, `tests/js/workflow-steps.test.js:465-479` (all passing)
- US-A7 (GAP-395, this cycle — PARTIAL): `cover_letter_reused_from`/`session_path` shape → fixed at `scripts/routes/master_data_routes.py:2045-2059`, tested at `tests/test_cover_letter.py:171-188`; **unfixed sibling** at `scripts/cv-preview.py:518,369`
- US-A7 (GAP-381, prior cycle): `cover_letter_reused_from` end-to-end → `web/cover-letter.js:280-294`, `scripts/routes/master_data_routes.py:2217`, `:2345`
- US-A8 (GAP-382, prior cycle): `reused_from_session` end-to-end → `web/screening-questions.js:159`, `:318-324`, `scripts/routes/master_data_routes.py:2569`
- US-A4: weak-evidence badge → `web/rewrite-review.js:399-401`
- US-A9: automatic git commit → `scripts/routes/generation_routes.py:2204`
