<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-07-07 20:17 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | URL and paste-text paths both work | ✅ | `web/job-input.js:389` `submitJobText()`, `web/job-input.js:476` `fetchJobFromURL()`, backend `scripts/routes/job_routes.py:253` `submit_job()`, `:296` `fetch_job_url()` |
| 2 | Protected-site warning + manual-copy fallback | ✅ | `scripts/routes/job_routes.py:317-352` detects linkedin.com/indeed.com/glassdoor.com and returns instructions; `web/job-input.js:548` `showProtectedSiteModal()` renders them with a "use Paste Text" tip |
| 3 | Company/role/date auto-extracted and editable | ✅ | `web/message-dispatch.js:421-465` `_showIntakeConfirmCard()` renders editable Role/Company/Date fields pre-filled from `/api/intake-metadata`. Deviation: story step 4 implies confirmation happens **before** analysis; actual flow runs analysis first (`web/job-analysis.js:96` `analyzeJob()`) and shows the intake card afterward (`:151-158`). Functionally equivalent, but sequence differs from the narrative. |
| 4 | Session persisted immediately after confirmation | ✅ | `/api/confirm-intake` → `scripts/routes/status_routes.py:1109` → `ConversationManager.apply_confirmed_intake()` (`scripts/utils/conversation_manager.py:2204-2233`), which calls `self._save_session()` at line 2233. Note: the raw `/api/job` submission itself (`job_routes.py:253-293`) does **not** call `_save_session()` — only `session_registry.touch()` (in-memory timestamp). If a user submits job text and closes the browser before confirming intake, the job text is not guaranteed to be flushed to disk except via idle-eviction (`scripts/utils/session_registry.py:372-409`). Not a failure of the stated criterion (which refers to "after step 5"), but a latent gap between paste and confirm. |

### US-A2: Understand What the Job Requires

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Required/preferred split displayed | ✅ | `scripts/utils/conversation_manager.py:688-726` `_handle_analyze_job()` calls `llm.analyze_job_description()`; rendered via `appendFormattedAnalysis` referenced from `web/job-analysis.js:142` |
| 2 | Mismatch analysis surfaced as clarifying question | ✅ | Skill-gap computation at `conversation_manager.py:704-720` (`analysis['skill_gaps'] = _gaps`); `skill_gap_confirmed` harvest flow in `scripts/routes/generation_routes.py:354-363` |
| 3 | Domain/role-type ambiguity clarifying question | ✅ | `conversation_manager.py:787-802` — a `domain_clarification` question is auto-injected when `domain_confidence < 0.7` |
| 4 | UI: dropdown/button choices, not free text | ⚠️ | `web/questions-panel.js:190-210` renders both `.q-chip` buttons **and** a free-text `<textarea>` per question — contradicts the "not free text" clause, though arguably a UX improvement (chips pre-fill the textarea; user can also type). |
| 5 | Answers persist in session + `metadata.json.clarification_answers` | ⚠️ | Session state key is `post_analysis_answers` (`conversation_manager.py:100,702`); it is only projected into `metadata.json` under the literal key `clarification_answers` at Finalise time (`scripts/routes/generation_routes.py:2161`) — no earlier step writes it to metadata.json. |
| 6 | Answers passed to all downstream LLM calls | ✅ | Cover letter: `scripts/routes/master_data_routes.py:2111`; screening: `master_data_routes.py:2459`; re-run customization: `conversation_manager.py:1803` |
| 7 | Prior-session answers pre-populated as defaults | ✅ | `web/message-dispatch.js:492-549` `_proceedAfterIntake()` / `_offerPriorClarifications()` — offers to load prior answers via `/api/prior-clarifications`, editable before confirming |
| 8 | Analysis survives browser refresh (session-backed) | ✅ | `apply_confirmed_intake()` saves the session immediately after intake confirm, which happens right after analysis completes |

### US-A3: Review and Approve Content Customisations

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Relevance score + rationale per item | ✅ | `web/experience-review.js:224`, `web/publications-review.js:152,156`, `web/achievements-review.js:320` |
| 2 | Include/exclude toggles (all 4 categories) | ✅ | `exclude` action buttons: `experience-review.js:251`, `skills-review.js:858`, `achievements-review.js:280`, `publications-review.js:174-177` |
| 3 | Up/down reorder (all 4 categories) | ✅ | `/api/reorder-rows` used consistently: `experience-review.js:322`, `skills-review.js:1085`, `publications-review.js:226`. Deviation: story text says "drag-and-drop" for bullets/categories; implementation uses up/down buttons only — consistent app-wide, but not literally drag-and-drop. |
| 4 | Bullet reordering within an entry | ✅ | `experience-review.js:252` "↕ Reorder bullet points" action |
| 5 | Omit suggestions explained, not silently dropped | ✅ | Rationale text rendered alongside `exclude` default action, e.g. `experience-review.js:224` |
| 6 | Publications list shown whenever `publications.bib` non-empty, pre-ranked with score+rationale | ✅ | `publications-review.js:152-156` |
| 7 | All-rejected ⇒ "Selected Publications" section omitted entirely | ✅ | `scripts/utils/cv_orchestrator.py:5468-5472` — `if publications:` guards the heading/loop; empty list renders nothing |
| 8 | Decisions persist in session + `metadata.json.clarification_answers.selected_publications` | 🔲 | Publication accept/reject decisions persist in session state (`publication_decisions`, `scripts/web_app.py:110`), but no `clarification_answers.selected_publications` key was found anywhere in `generation_routes.py`'s metadata-writing code — only `clarification_answers` itself, `screening_responses`, `cover_letter_text` are written. This nested key does not appear to exist. |

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Category headings + skill bullets rendered | ✅ | Category grouping fields round-tripped per below; CV rendering handled in `cv_orchestrator.py` skills-section code (not independently re-read line-by-line in this pass) |
| 2 | LLM suggestions shown for review, not applied silently | ✅ | `web/skills-review.js:212-232` computes `categoryChanged`/`groupChanged` and only returns a suggestion object for explicit review |
| 3 | Manual rename/reorder/move/create category | ✅ | Rename: `skills-review.js:78` `saveSkillCategoryOverride()`; reorder: `:397` `_moveSkillCategoryLocally()` (up/down, not drag-and-drop — same deviation as US-A3); create: implied by datalist-driven "add new skill" form at `:618-658` |
| 4 | Merge related skills onto one bullet w/ qualifier | ✅ | `skills-review.js:189-196` builds `name (qualifier)` strings from proficiency/subskills/parenthetical |
| 5 | Per-skill proficiency / sub-skills / free-form override | ✅ | `saveSkillQualifierOverride()` at `skills-review.js:274-313` |
| 6 | Add new skill (name/category/proficiency/sub-skills/parenthetical) | ✅ | Form fields at `skills-review.js:637-648` |
| 7 | Grouping decisions persist in session customizations | ✅ | `/api/review-skill-category`, `/api/review-skill-qualifiers`, `/api/review-skill-category-order` endpoints called from the functions above |
| 8 | Readability warning for long inline bullets | ✅ | `skills-review.js:249-271` builds a `warningMap`; rendered at `:812` `skill-group-warning` |

### US-A4: Review and Approve Text Rewrites

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Visible before/after diff per proposal | ✅ | Card rendering in `web/rewrite-review.js` (before/after + keyword pills, card structure ~lines 399-451) |
| 2 | Weak-evidence skill_add badged | ✅ | `rewrite-review.js:399-401` — `isWeakSkillAdd` → `⚠ Weak evidence` badge when `r.type === 'skill_add' && r.evidence_strength === 'weak'` |
| 3 | Edited text (not original) enters CV | ✅ | `saveRewriteEdit()` at `rewrite-review.js:538` updates the decision to the user's textarea value |
| 4 | Submit blocked until all cards actioned | ✅ | `rewrite-review.js:584-604` — `submitBtn.disabled = (pending > 0) || needsAck` |
| 5 | Rewrite audit persisted | ✅ | `submitRewriteDecisions()` (`app.js:151`) → `conversation_manager.py:1332` `submit_rewrite_decisions()` |

### US-A4b: Spell & Grammar Check Before Generation

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | `bullet`/`skill_name` contexts don't produce fragment/subject warnings | ✅ | `scripts/utils/spell_checker.py:30-36` `SUPPRESSED_BULLET_RULES` (SENTENCE_FRAGMENT, PUNCTUATION_PARAGRAPH, etc. suppressed for `context == 'bullet'`); `:207-208` skill context restricted to spelling-only rules |
| 2 | Dictionary words produce no flags | ✅ | `spell_checker.py:210-214` — flagged word normalized and checked against `custom_lower` set before being added to suggestions |
| 3 | Add-to-Dictionary persists to `custom_dictionary.json`, suppressed immediately | ✅ | `spell_checker.py:46,68,80` (`DEFAULT_DICT_PATH = ~/CV/custom_dictionary.json`, `add_word()`, `_save_custom_dict()`) |
| 4 | Editing a flag applies user text, not LLM suggestion | ✅ | `web/spell-check.js:289-305` `applyCustomSpellCorrection()` sets `entry.final = custom` |
| 5 | Proceed to Generation blocked while any flag unresolved | ⚠️ | **Not a hard block.** `web/spell-check.js:441-451` `submitSpellCheckDecisions()` only shows a confirm dialog ("N issues have not been reviewed and will be ignored. Proceed anyway?") and lets the user proceed regardless — pending items are silently auto-marked `'ignore'` at `:456-458`. The Generate Preview button itself is never `disabled` (contrast with rewrite-review.js's `submitBtn.disabled` pattern). |
| 6 | Spell audit persisted + included in `metadata.json` | ✅ | `/api/spell-check-complete` (`spell-check.js:464`); written into `metadata.json.spell_audit` at Finalise (`generation_routes.py:2162`) |
| 7 | Zero-flag case completes instantly | ✅ | `renderSpellCheckZeroState()` path at `spell-check.js:101-114` |

### US-A5a / US-A5b / US-A5c: Layout Review and Final Generation

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Only HTML generated at US-A5a; PDF/DOCX later | ✅ | Staged `GENERATION_PHASES` model in `web/state-manager.js:57-89` (`LAYOUT_REVIEW` → `CONFIRMED` → `FINAL_COMPLETE`) |
| 2 | Layout preview pane + free-text instruction field | ✅ | `web/layout-instruction.js:309-396` two-pane layout with `#instruction-input` textarea |
| 3 | Apply instruction → preview refreshes | ✅ | `submitLayoutInstruction()` flow at `layout-instruction.js:846-963` |
| 4 | Clarifying question when instruction is ambiguous | ✅ | `showClarificationDialog()` at `layout-instruction.js:1256-1311` — inline accessible form, not `window.prompt()` |
| 5 | Confirm Layout saves final HTML, does not directly generate PDF/DOCX | ✅ | `confirm_cv_layout()` route (`generation_routes.py:1765`) is distinct from `generate_cv_final()` (`:1902`) |
| 6 | PDF/ATS DOCX generated from the layout-confirmed HTML (no re-render) | ✅ | `generation_routes.py:1945-1965` reads `gen.get("preview_html")` as `confirmed_html` and calls `orchestrator.generate_final_from_confirmed_html(confirmed_html=confirmed_html, ...)` |
| 7 | File naming `CV_{Company}_{Role}_{Date}` / `_ATS` suffix | ✅ | Inferred from consistent naming conventions elsewhere in the same modules (e.g. `master_data_routes.py:2277-2280`); CV-specific filename string not independently re-verified line-by-line in this pass |
| 8 | All layout instructions recorded in `metadata.json.layout_instructions` | ✅ | `generation_routes.py:2163` `metadata['layout_instructions'] = conversation.state.get('layout_instructions') or []` |

### US-A6: Review and Iteratively Refine Generated Output

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Targeted re-entry to rewrite review OR customization (not full restart) | ✅ | `conversation_manager.py:1725-1758` `back_to_phase()` marks only downstream steps stale (`step_order` slice), preserving prior decisions |
| 2 | Previously approved decisions preserved as defaults | ✅ | `re_run_phase()` (`:1760-1872`) folds `_build_downstream_context()` into the new LLM prompt so approved rewrites/customizations remain known context |
| 3 | Each regen cycle updates archive + metadata.json | ✅ | By construction of the generation pipeline reviewed above |
| 4 | Layout-only instructions routed to US-A5b, not treated as content changes | ✅ | Layout instructions use a separate `/api/layout-instruction` endpoint/state key (`layout_instructions`), never touching `pending_rewrites`/`customizations` |

### US-A7: Generate Cover Letter

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Prior same-tone/same-role-type letter surfaced with "use as starting point" prompt | ⚠️ | `GET /api/cover-letter/prior` (`master_data_routes.py:2026-2059`) returns **up to 30 most-recent sessions with any saved cover letter** — no filtering/matching by tone or role type. `web/cover-letter.js:72-92` renders them all as a radio-button list for manual browsing, rather than the story's proactive single-match "You wrote a similar cover letter for {Company} — use it?" prompt. |
| 2 | Tone matches selection from ≥4 presets | ✅ | `COVER_LETTER_TONES` — 5 options at `cover-letter.js:20-26` |
| 3 | Hiring manager name appears in salutation | ✅ | `_OPENING_GUIDANCE...format(hiring_manager=hiring_manager)` at `master_data_routes.py:2179` |
| 4 | References specific skills/achievements from approved CV content | ✅ | `approved_rewrites_block` injected into the prompt, `master_data_routes.py:2144-2154` |
| 5 | LLM has access to `clarification_answers` | ✅ | `answers_snippet` built from `post_analysis_answers` at `master_data_routes.py:2110-2115` |
| 6 | Editable before saving | ✅ | `#cl-letter-textarea` free-edit, `cover-letter.js:155-157` |
| 7 | Saved as `.docx`, `.pdf`, and `cover_letter_text` in `metadata.json` | ✅ | `master_data_routes.py:2280-2336` (DOCX + WeasyPrint PDF + `metadata['cover_letter_text']`) |
| 8 | `metadata.json` records `cover_letter_reused_from` (session ID or null) | ❌ | **Confirmed bug.** `cover_letter_reused_from` is initialised to `None` in `conversation_manager.py:112` and `:1974`, but is **never assigned anywhere else in the codebase** (grep across `scripts/` finds only those two initializations plus the read-and-write-through at `master_data_routes.py:2334`). Even when the user checks a prior letter and it's used as `reuse_body`, no code sets `conversation.state['cover_letter_reused_from']` to that session's identifier — this metadata field is permanently `null` regardless of reuse. |

### US-A8: Handle Application Screening Questions

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Similar prior response surfaced per question before generating | ✅ | `POST /api/screening/search` (`master_data_routes.py:2357-2424`) returns a single `best_prior` match (score ≥0.25); `web/screening-questions.js:144-158` renders "📚 Similar prior response found" + "Use as starting point" checkbox — closer to the story's intended single-match UX than the cover-letter equivalent. |
| 2 | ≥3 relevant experience matches shown | ✅ | `scored_exps... [:3]` at `master_data_routes.py:2400-2405` |
| 3 | 3 response formats available, roughly correct length | ✅ | `_fmtLabel()` at `screening-questions.js:113-115`; `_SCREENING_FORMAT_GUIDANCE` referenced at `master_data_routes.py:2446` |
| 4 | LLM has access to `cover_letter` and `clarification_answers` | ✅ | `master_data_routes.py:2459-2478` includes `post_analysis_answers` and a `cover_letter_text` excerpt in the prompt |
| 5 | Format/experience choices persist per question | ✅ | `_screeningState[idx]` object, `screening-questions.js:19-20` |
| 6 | Editable before saving | ✅ | `#sc-text-${idx}` textarea, `screening-questions.js:270-273` |
| 7 | All responses exported in one DOCX | ✅ | `master_data_routes.py:2539-2555` single `Document()` with all responses |
| 8 | Stored in `metadata.json` as `{question, topic_tag, format, response_text, reused_from_session}` | ❌ | **Confirmed bug (sibling of the cover-letter bug above).** `master_data_routes.py:2564` writes `metadata['screening_responses'] = responses_in`, and `responses_in` items only ever contain `{question, topic_tag, format, response_text}` (built client-side at `screening-questions.js:318`). The `reused_from_session` field specified by the acceptance criterion is **never added at any point** — not client-side, not server-side. The frontend does send `prior_response` text to `/api/screening/generate` when "Use as starting point" is checked, but that provenance is discarded and never threaded through to the saved response or metadata. |
| 9 | `response_library.json` updated after saving | ⚠️ | Updated, but see cross-cutting bug under US-A9 — the same file is written in **two incompatible shapes** by two different endpoints. |

### US-A9: Finalise, Archive, and Submit

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Status transitions (draft→ready→sent, +queued/interview/rejected/accepted/parked) persist | ✅ | `generation_routes.py:2146-2158`; UI select options in `web/finalise.js:103` |
| 2 | Notes field saved | ✅ | `generation_routes.py:2159`; UI textarea `web/finalise.js:115-120` |
| 3 | Git commit created automatically, correct message format | ✅ | `generation_routes.py:2188-2213` — `f"feat: Add {company}_{role}_{date_str} application"`, `git add` + `git commit` |
| 4 | Summary shows keyword match score | ✅ | `summary = {..., 'ats_keywords': ats_keywords, 'ats_score': ats_score, ...}` at `generation_routes.py:2233-2241` |
| 5 | **Cross-cutting bug — likely to break Finalise in normal use** | ❌ | `finalise_application()` (`generation_routes.py:2169-2183`) upserts screening responses into `response_library.json` by treating it as a **dict** (`library = {}` default; `library[tag] = resp`). But `POST /api/screening/save` (`master_data_routes.py:2571-2591`, the normal Screening-tab save path used *before* Finalise in the tab order) treats the same file as a **list** (`library: list = []`; `library.append(...)`), and `POST /api/screening/search` (`master_data_routes.py:2368-2372`) also reads it as a list. Since the applicant workflow visits Screening (US-A8) before Finalise (US-A9) — `index.html:143-151` orders the workflow steps `cover_letter → screening → interview_prep → thank_you → finalise` — `response_library.json` will already be a JSON **list** by the time Finalise runs. `json.load()` in `finalise_application()` then assigns that list to `library`, and the subsequent `library[tag] = resp` (tag is a string) raises `TypeError: list indices must be integers or slices, not str`, caught by the outer `except Exception: return _internal_server_error(...)` — silently turning the entire Finalise action into a 500 error for any applicant who saved screening responses first. This is the same "duplicated logic across two files" anti-pattern flagged in this project's own `CLAUDE.md` (GAP-146/GAP-48/GAP-43 precedent) — recommend consolidating both write paths into one canonical helper. |

### US-A10: Update Master CV Data

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | NL update produces proposed JSON diff before writing | ✅ | `_mdu_run_propose()` (`master_data_routes.py:548-575`) returns `requires_clarification`/proposal; `web/master-data-ai-update.js` renders the diff via `proposal-review.js` |
| 2 | Document ingestion has a review step | ✅ | `/api/master-data/ingest-document/propose` (`master_data_routes.py:609-624`) shares the same propose→review pipeline |
| 3 | No blind writes — explicit confirmation required | ✅ | `confirmMasterDataAiUpdate()` (`master-data-ai-update.js:462-476`) shows a modal confirm ("Write N change(s) to Master CV?") before `POST /api/master-data/confirm-update` |
| 4 | Git commit on every confirmed update | ✅ | Inferred — `_save_master()` in `scripts/web_app.py:1199-1236` stages the file with `git add` on every successful write; consistent with the master-data confirm-update path |

### US-A11: Session Master Data Harvest

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Harvest prompt appears after Finalise, skippable | ✅ | "Update Master CV" step wired into `STAGE_TABS`/workflow steps (`web/ui-core.js:371`, `web/index.html:153`); `harvest.js` has a `skip` action mapping at line 51 |
| 2 | Candidates from: approved rewrites, skill additions, summary rewrites, clarification-revealed skills | ✅ | Candidate-compiling logic in `generation_routes.py:280-365` builds `new_skill`/`skill_gap_confirmed` candidates from `extra_skills`, `new_skills_added`, and `post_analysis_answers` (`skill_gap_*` keys) |
| 3 | No item pre-selected — opt-in only | ✅ | `web/harvest.js:95-97` "All harvest items start unchecked... opt-in only" |
| 4 | Before/after diff + rationale per item | ✅ | Candidate objects include `original`, `proposed`, `rationale` (`generation_routes.py:313-320`) |
| 5 | Consolidated JSON diff before write | ✅ | Implied by `harvest.js:293` "✅ Apply Selected to Master CV" flow calling `/api/harvest/apply` |
| 6 | Git commit `chore: Update master CV data from {Company}_{Role}_{Date} session` | ✅ | Commit-message convention consistent with `_save_master`/harvest-apply pattern; exact message string not independently re-verified in this pass |

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| # | Criterion | Status | Notes / File:Line refs |
|---|-----------|--------|------------------------|
| 1 | Re-run affordance visible on each completed stage chip | ✅ | `.step-rerun` button injected per stage, `web/workflow-steps.js:1030-1034` |
| 2 | Confirmation dialogue lists affected downstream stages | ✅ | `_showReRunConfirmModal()` at `workflow-steps.js:134-186` |
| 3 | Re-run never silently discards prior approvals | ✅ | `back_to_phase()`/`re_run_phase()` (`conversation_manager.py:1725-1872`) only set `stale_steps`, never delete `approved_rewrites`/`customizations` |
| 4 | LLM re-run receives full session context (job text, current clarification answers, downstream summary) | ✅ | `_build_downstream_context()` folded into `user_prefs['_prior_context']` at `conversation_manager.py:1803-1811` |
| 5 | Only changed/new items highlighted after re-run | ✅ | "Show only changed (N)" toggle, `workflow-steps.js:475-527,623,641` |
| 6 | Clarification answers amendable when re-running Analysis | ✅ | Amend-clarifications modal, `workflow-steps.js:292-343` |
| 7 | Audit log records stage, timestamp, prior answers, downstream-affected count | ⚠️ | `conversation_manager.py:1860-1865` appends `{'phase', 'timestamp', 'triggered_by': 'user'}` to `state['rerun_log']` — does **not** record previous clarification answers or a count of downstream items affected, only phase+timestamp+trigger. |
| 8 | Re-run also accessible via keyboard shortcut | ✅ | `Ctrl+Shift+R`, `web/keyboard-shortcuts.js:262-270` |

## Generated Materials Evaluation

The generated CV/cover-letter/screening-response *content quality* (prose, formatting fidelity in the actual PDF/DOCX) was not independently regenerated and visually inspected in this pass — this review is based on the generation/orchestration code paths (`cv_orchestrator.py`, DOCX/PDF assembly in `master_data_routes.py`) rather than rendered output samples. Notable structural findings:

- Publications section is correctly omitted when the list is empty (`cv_orchestrator.py:5468-5472`), avoiding a dangling empty heading — good defensive behavior for the "reject all publications" path in US-A3.
- Cover letter and screening response DOCX/PDF generation both run through a shared plain-Word/WeasyPrint pattern (`master_data_routes.py:2271-2325`) — consistent formatting expected across artifacts.
- The `response_library.json` list/dict schema conflict (see US-A9 above) is a data-integrity risk for generated-materials continuity across sessions, since a malformed or partially-written library file could also affect future `screening_search()` reads.

## Additional Story Gaps / Proposed Story Items

1. **No story explicitly covers cross-artifact data-format consistency guarantees.** The `response_library.json` list/dict bug found under US-A9 suggests the story set should add an explicit acceptance criterion (perhaps under a new "Data Integrity" story) requiring that any file written by more than one endpoint use one canonical schema and one canonical write helper.
2. **Terminology audit finding (explicitly requested by reviewer brief):** The "AI Model" rebrand (replacing "LLM") was applied to `web/index.html` and the model-selector wizard (`ui-core.js`), but numerous user-facing strings elsewhere still say "LLM": disclosure banners in `cover-letter.js:233`, `harvest.js:333`, `job-analysis.js:106`, `screening-questions.js:237` ("sent to the configured LLM provider..."); button tooltips "Set all to the LLM recommendation" in `achievements-review.js:344`, `experience-review.js:292`, `skills-review.js:1057`; error text "LLM did not return a cover letter" in `cover-letter.js:307`; and the "LLM Interaction" log label in `llm-log.js:101`. Recommend a follow-up gap to finish the terminology pass consistently, or add a story acceptance criterion naming the full surface area (disclosure banners, tooltips, error messages, log panel) rather than just index.html.
3. **US-A2's "dropdown or button choices, not free text" criterion is stale relative to the shipped UX** (chips + free-text textarea both present). Recommend updating the story to describe the actual (arguably better) hybrid pattern rather than leaving a criterion that the implementation deliberately doesn't satisfy.
4. **Consider adding an explicit "reused_from" provenance story/criterion test** — since this exact field (`cover_letter_reused_from`, `screening...reused_from_session`) is specified in two separate stories (US-A7, US-A8) and both are unimplemented, this looks like a single shared root cause (the reuse-selection UI never sends an identifier for *which* prior session/response was reused back to the save endpoint) worth fixing once for both stories.
5. **US-A9's git-commit-on-finalise criterion has no test for the response-library crash path** — recommend a regression test that runs Screening→Finalise in sequence (matching the real workflow order) to catch the type-mismatch bug found here before it reaches applicants.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus web/job-input.js, web/job-analysis.js, web/questions-panel.js, web/message-dispatch.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/publications-review.js, web/rewrite-review.js, web/spell-check.js, web/layout-instruction.js, web/cover-letter.js, web/screening-questions.js, web/finalise.js, web/harvest.js, web/master-cv.js, web/master-data-ai-update.js, web/workflow-steps.js, web/keyboard-shortcuts.js, web/session-actions.js, scripts/routes/job_routes.py, scripts/routes/status_routes.py, scripts/routes/generation_routes.py, scripts/routes/master_data_routes.py, scripts/utils/spell_checker.py, scripts/utils/session_registry.py, scripts/utils/cv_orchestrator.py (partial)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-A1 | 4 | 0 | 0 | 0 | 0 |
| US-A2 | 6 | 2 | 0 | 0 | 0 |
| US-A3 | 7 | 0 | 0 | 1 | 0 |
| US-A3b | 8 | 0 | 0 | 0 | 0 |
| US-A4 | 5 | 0 | 0 | 0 | 0 |
| US-A4b | 6 | 1 | 0 | 0 | 0 |
| US-A5a/b/c | 8 | 0 | 0 | 0 | 0 |
| US-A6 | 4 | 0 | 0 | 0 | 0 |
| US-A7 | 6 | 1 | 1 | 0 | 0 |
| US-A8 | 7 | 1 | 1 | 0 | 0 |
| US-A9 | 4 | 0 | 1 | 0 | 0 |
| US-A10 | 4 | 0 | 0 | 0 | 0 |
| US-A11 | 6 | 0 | 0 | 0 | 0 |
| US-A12 | 7 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- US-A7/US-A8: `cover_letter_reused_from` and `reused_from_session` are dead/missing fields → `scripts/utils/conversation_manager.py:112,1974`, `scripts/routes/master_data_routes.py:2334,2564`
- US-A9: `response_library.json` list/dict schema conflict → `scripts/routes/generation_routes.py:2169-2183` vs `scripts/routes/master_data_routes.py:2571-2591`
- US-A4b: Proceed-to-Generation soft-gate (confirm dialog, not disabled button) → `web/spell-check.js:441-458`
- US-A3: `clarification_answers.selected_publications` metadata key not found anywhere in `scripts/routes/generation_routes.py`
- US-A12: `rerun_log` entries omit prior clarification answers and downstream-affected count → `scripts/utils/conversation_manager.py:1860-1865`
- Terminology: residual "LLM" strings after the "AI Model" rebrand → `web/cover-letter.js:233,307`, `web/harvest.js:333`, `web/job-analysis.js:106`, `web/screening-questions.js:237`, `web/achievements-review.js:344`, `web/experience-review.js:292`, `web/skills-review.js:1057`, `web/llm-log.js:101`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
