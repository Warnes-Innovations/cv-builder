<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-06-30 09:45 ET

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

---

## Executive Summary

The core CV-generation workflow (US-A1 through US-A5c) is well-implemented with solid backend and frontend coverage. Protected-site detection, clarifying questions, before/after rewrite cards, spell-check, staged HTML-then-final-output generation, cover letter, screening, and harvest are all structurally present. Key gaps are concentrated in five areas: (1) intake confirmation (company/role/date) is backend-only with no surfaced confirmation UI step; (2) mismatch-driven clarifying questions that reference specific required skills absent from master data are not verifiably generated — the LLM is given all required skills but no explicit instruction to surface mismatch questions; (3) the US-A3b skills-category management UI (rename, reorder, move between categories) is declared in session state but not traceable to shipped frontend code in the reviewed files; (4) prior clarification-answer pre-population for same-role-type sessions exists as an API but is not called from the questions UI; (5) cover letter is saved only as DOCX (PDF missing), and the re-run affordance has no keyboard shortcut.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| Criterion | Status | Evidence |
|-----------|--------|---------|
| URL and paste-text paths both work | ✅ Pass | `job_routes.py:221` — `POST /api/fetch-job-url`; `POST /api/job` (line 178) both implemented. |
| Protected-site warning surfaced with manual-copy fallback | ✅ Pass | `job_routes.py:266-301` — LinkedIn, Indeed, Glassdoor detected by domain; returns `protected_site: true` with step-by-step copy instructions. |
| Company name, role title, and date auto-extracted and editable | ⚠️ Partial | Backend: `status_routes.py:1027` — `GET /api/intake-metadata` extracts company/role/date; `POST /api/confirm-intake` (line 1065) persists confirmed values. However, no explicit user-facing confirmation step is rendered in the Job tab UI prompting review/edit of these values before proceeding. Position bar shows inferred title (index.html:75) but a dedicated confirmation card with editable fields is not surfaced. |
| Session persisted immediately after step 5 | ⚠️ Partial | `confirm-intake` endpoint saves session. But since the confirmation step (step 5) is not a distinct surfaced UI step, the "immediately after step 5" requirement is not clearly met. `status: "queued"` is never set — sessions advance to `job_analysis` phase immediately on job submit. |

**Gap:** `state['intake']` field exists (conversation_manager.py:123) and the extraction API exists, but no workflow UI prompts the applicant to confirm extracted company/role/date as a distinct step.

---

### US-A2: Understand What the Job Requires

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Required/preferred split displayed clearly | ✅ Pass | Analysis tab renders `required_skills`, `preferred_skills`, `must_have_requirements` from job analysis (status_routes.py:106-113). |
| Mismatch analysis run against master CV data; at least one mismatch surfaced as clarifying question | ⚠️ Partial | The LLM prompt (conversation_manager.py:402-476) includes the full master CV and all required skills, but there is no explicit instruction to cross-reference required skills against master data and generate a gap-specific clarifying question (e.g., "Kubernetes is required but not in your master data — do you have relevant experience to add?"). `_fallback_post_analysis_questions()` (web_app.py:933) generates generic questions only. The `skill_gap_confirmed` harvest mechanism exists but operates downstream of clarification, not at the question-generation step. |
| At least one clarifying question surfaced when domain/role-type is ambiguous | ✅ Pass | `_fallback_post_analysis_questions()` (web_app.py:933) generates domain, role_level, and leadership questions. LLM-driven `_generate_post_analysis_questions` (web_app.py:973) requests 2-4 targeted questions. |
| My answers persist in session state and `metadata.json` under `clarification_answers` | ✅ Pass | `post_analysis_answers` stored in `conversation.state` (conversation_manager.py:94); written to `metadata['clarification_answers']` at finalise (generation_routes.py:1944). |
| Clarification answers passed to all downstream LLM calls | ✅ Pass | `post_analysis_answers` in system prompt (conversation_manager.py:756-764); cover letter includes `answers_snippet` (master_data_routes.py:1562-1567); screening includes `answers` (line 1878). |
| Prior clarification answers pre-populated as defaults for same role type | ⚠️ Partial | `GET /api/prior-clarification-answers` (status_routes.py:1090) searches prior sessions. However no evidence this endpoint is called from the questions UI to pre-fill editable defaults before the user answers. |
| Analysis results survive browser refresh | ✅ Pass | `state-manager.js:459-528` restores `tabData`, `postAnalysisQuestions`, `questionAnswers`, `lastKnownPhase`. Backend session also persisted. |

---

### US-A3: Review and Approve Content Customisations

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Every recommended item shows a relevance score and brief rationale | ✅ Pass | LLM system prompt (conversation_manager.py:413-451) requires Recommendation + Confidence + Reasoning for every item. |
| Include/exclude toggles for experiences, achievements, skills, publications individually | ✅ Pass | `experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions` all tracked in state (conversation_manager.py:109-112); dedicated tabs in viewer (index.html:208-214). |
| Up/down buttons for reordering experiences, achievements, skills, publications | ✅ Pass | Reordering supported in each customisation tab. |
| Bullet reordering within a job entry | ✅ Pass | `tab-ach-editor` "Experience Bullets" tab (index.html:209); bullet reorder modal confirmed in prior reviews. |
| "Omit" suggestions explained, not silently dropped | ✅ Pass | Each recommendation includes `rationale` explaining omit decisions. |
| LLM-recommended publications list shown; pre-ranked with relevance score and rationale | ✅ Pass | `publication_decisions` tracked; `tab-publications-review` tab (index.html:214); LLM receives publication context (conversation_manager.py:488-498). |
| All-rejected publications → section omitted from CV | ✅ Pass | `publication_decisions` drives orchestrator generation; empty accepted set = section omitted. |
| Confirmed decisions persist in session and `metadata.json` under `clarification_answers.selected_publications` | ⚠️ Partial | `publication_decisions` persisted in session and written to metadata at finalise. However metadata key is `publication_decisions`, not `clarification_answers.selected_publications` as specified in the story acceptance criteria. |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Skills displayed under master CV category headings | ✅ Pass | `skill_category_overrides`, `skill_category_order` tracked in state (conversation_manager.py:118-119); skills review tab present. |
| LLM suggestions for category changes shown for review, not applied silently | ⚠️ Partial | Category-level suggestions are embedded in customisation recommendations but no dedicated UI presenting category suggestions as reviewable/rejectable items (separate from individual skills) is traceable in the reviewed source files. |
| Manual: rename a category heading | 🔲 Not Impl | `skill_category_overrides` state field exists but no frontend UI for renaming is traceable in reviewed files (index.html, app.js, ui-core.js). |
| Manual: reorder categories via drag-and-drop | 🔲 Not Impl | `skill_category_order` state exists but no drag-and-drop or up/down controls for category order are found in reviewed files. |
| Manual: move a skill from one category to another | 🔲 Not Impl | Not traceable in reviewed source. |
| Manual: create a new category heading | 🔲 Not Impl | Not traceable in reviewed source. |
| Proficiency/expertise level settable per skill | ✅ Pass | `skill_qualifier_overrides` in state (line 120); skills review UI accepts qualifiers. |
| Add new skills not in master CV | ✅ Pass | `extra_skills` tracked in state (line 113); skills review UI supports additions. |
| Long inline bullets show readability warning | 🔲 Not Impl | No evidence of bullet-length readability warning in reviewed source. |
| All grouping decisions persist in session | ✅ Pass | `skill_group_overrides`, `skill_category_overrides`, `skill_category_order`, `skill_qualifier_overrides` all in session state. |

**Note:** Category management UI (rename/reorder/move) may exist in skill-specific JS modules not in this review scope. If so, test coverage should confirm them.

---

### US-A4: Review and Approve Text Rewrites

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Every proposal has a visible before/after diff | ✅ Pass | `tab-rewrite` (index.html:216); `pending_rewrites` contain `original` and `proposed` fields; rewrite card UI shows both. |
| Weak-evidence skill additions badged; cannot be silently accepted | ✅ Pass | `persuasion_warnings` tracked; "⚠ Candidate to confirm" badge rendered for `evidence_strength == "weak"` proposals. |
| Edited final text enters CV (not original LLM proposal) | ✅ Pass | `approved_rewrites` stores user-edited text (conversation_manager.py:97). |
| Submit blocked until all cards actioned | ✅ Pass | `rewrite-btn` (index.html:189) calls `submitRewriteDecisions`; sticky bar tracks pending count. |
| Rewrite audit persisted in session | ✅ Pass | `rewrite_audit` in state (line 99); passed to metadata at finalise. |

---

### US-A4b: Spell & Grammar Check Before Generation

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Spell check runs on all finalised text fields | ✅ Pass | `spell_checker.py` integration; `tab-spell` tab (index.html:217). |
| Zero-flag case shows green banner and proceeds directly | ✅ Pass | Empty spell results = no blocking; immediate proceed path. |
| Per-flag Accept/Reject/Edit/Add-to-Dictionary | ✅ Pass | Spell-check decision API in review_routes; `custom_dictionary_add` (review_routes.py:1968); `SpellChecker` uses `~/CV/custom_dictionary.json` (spell_checker.py:46). |
| `bullet`/`skill_name` context types suppress sentence-fragment warnings | ⚠️ Partial | Context-type filtering logic is referenced in the story but not explicitly verified in the reviewed SpellChecker source. The util exists; exact suppression rules require direct inspection of `spell_checker.py` beyond the reviewed scope. |
| Proceed blocked while any flag unresolved | ✅ Pass | `spell-btn` (index.html:189) enablement tied to resolved flags. |
| Spell audit persisted in session and `metadata.json` | ✅ Pass | `spell_audit` in state; written to metadata at finalise (generation_routes.py:1945). |
| Words added to dictionary immediately suppressed and persisted | ✅ Pass | `custom_dictionary_add` endpoint (review_routes.py:1968); `~/CV/custom_dictionary.json` persists across sessions (spell_checker.py:46). |

---

### US-A5a: Generate HTML for Layout Review

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Only HTML generated at this step | ✅ Pass | `GENERATION_PHASES` distinguishes `layout_review` (HTML preview only) from `final_generation` (PDF+DOCX). |
| HTML preview opens automatically | ✅ Pass | `generate-proceed-btn` (index.html:191) switches to layout tab; `stateManager.markPreviewGenerated()` (state-manager.js:358) triggers layout state. |
| Progress indicator within 1 s | ✅ Pass | `llm-busy-overlay` (index.html:155-163) shown during all LLM calls; elapsed timer displayed. |
| Errors surface as user-visible messages | ✅ Pass | All generation routes return JSON errors; `appendMessage('system', ...)` pattern used throughout. |
| Archive directory and `metadata.json` created at this step | ✅ Pass | Generation routes create output directory and metadata on first generation. |

---

### US-A5b: Review and Refine HTML Layout

| Criterion | Status | Evidence |
|-----------|--------|---------|
| HTML preview pane opens automatically | ✅ Pass | `tab-layout` (index.html:220); `generate-proceed-btn` (app.js:134) switches to layout tab. |
| Layout Instructions field accepts free-text | ✅ Pass | `layout_instructions` in state (conversation_manager.py:102); LLM applies instructions. |
| Example instruction types supported (reorder, relocate, page-break, spacing) | ✅ Pass | LLM layout prompt handles section reorder and structural changes. |
| Each applied instruction updates only structural/presentational layer | ✅ Pass | Layout changes applied via LLM to HTML template; approved rewrite text is not re-processed. |
| Preview refreshes after each instruction | ✅ Pass | `stateManager.markPreviewGenerated()` triggers UI update; layout freshness chip (index.html:96). |
| Confirm Layout saves final HTML and triggers US-A5c | ✅ Pass | `layout-btn` (index.html:192) calls `handleLayoutPrimaryAction` (app.js:135); `stateManager.markLayoutConfirmed()` advances state. |
| All applied instructions recorded in `metadata.json` under `layout_instructions` | ✅ Pass | `layout_instructions` written to metadata at finalise (generation_routes.py:1946). |
| LLM asks clarifying questions if instruction ambiguous | ⚠️ Partial | No explicit "ask for clarification if ambiguous" instruction is verifiable in the reviewed layout-instruction LLM prompt path. Backend applies changes and returns results without a clarification loop. |

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Evidence |
|-----------|--------|---------|
| PDF and ATS DOCX generated from confirmed HTML | ✅ Pass | Final generation route (generation_routes.py duckflow note line 1745) generates from confirmed HTML in `GENERATION_PHASES.CONFIRMED`. |
| File naming `CV_{CompanyName}_{Role}_{Date}` with `_ATS` suffix | ✅ Pass | Generation route names files per convention. |
| All three formats available as download links | ✅ Pass | `tab-final_generate` and `tab-download` (index.html:221-222) render download links. |
| Progress indicator within 1 s | ✅ Pass | `llm-busy-overlay` covers generation; `final-generate-proceed-btn` triggers with overlay. |
| `metadata.json` updated with generation timestamps | ✅ Pass | Generation routes update metadata with timestamps for each format. |

---

### US-A6: Review and Iteratively Refine Generated Output

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Feedback can trigger targeted re-entry into rewrite review OR content customisation | ✅ Pass | `back_to_phase()` (job_routes.py:754) and `re_run_phase()` (job_routes.py:779) both implemented. |
| Previously approved decisions preserved as defaults on re-entry | ✅ Pass | `re_run_phase()` (conversation_manager.py:1470) preserves `experience_decisions`, `skill_decisions`, `approved_rewrites` and passes them as `_prior_context` to the LLM. |
| Each regeneration cycle updates archive and `metadata.json` | ✅ Pass | Each generation route updates output directory and metadata. |
| Layout-only instructions directed to US-A5b, not treated as content changes | ✅ Pass | `layout_instructions` separate from content decisions in state; layout tab is a distinct step. |

---

### US-A7: Generate Cover Letter

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Prior same-tone/role-type cover letter surfaced before generation | ✅ Pass | `GET /api/cover-letter/prior` (master_data_routes.py:1478) scans prior sessions; `reuse_body` accepted by generate (line 1529). |
| Tone matches selection from at least 4 preset options | ✅ Pass | `_TONE_GUIDANCE` (master_data_routes.py:97-103) defines 5 tones: startup/tech, pharma/biotech, academia, financial, leadership. |
| Hiring manager name appears in salutation | ✅ Pass | `hiring_manager` used in `_OPENING_GUIDANCE` salutation (line 106); injected into prompt (line 1526). |
| Cover letter references specific skills/achievements from approved CV content | ✅ Pass | Approved rewrites injected into prompt (master_data_routes.py:1591-1601). |
| LLM has access to `clarification_answers` when generating | ✅ Pass | `answers_snippet` from `post_analysis_answers` included in prompt (lines 1562-1567). |
| Editable before saving | ✅ Pass | Cover letter tab shows editable text area; `POST /api/cover-letter/save` (line 1656) accepts edited text. |
| Saved as `.docx` | ✅ Pass | `CoverLetter_{Company}_{Role}_{Date}.docx` written at save (line 1700). |
| Saved as `.pdf` | ❌ Fail | Cover letter save endpoint writes DOCX only. No PDF generation path for cover letters is found in any reviewed source file. The story requires both `.docx` and `.pdf`. |
| `cover_letter_text` stored in `metadata.json` | ✅ Pass | `metadata['cover_letter_text']` written at save. |
| `metadata.json` records `cover_letter_reused_from` | ✅ Pass | `cover_letter_reused_from` written to metadata (master_data_routes.py:1753). |

---

### US-A8: Handle Application Screening Questions

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Semantically similar prior responses surfaced per question | ✅ Pass | `POST /api/screening/search` (master_data_routes.py:1776) uses `_text_similarity()` against `response_library.json`; threshold ≥ 0.25 (line 1807). |
| At least 3 relevant experience matches shown per question | ✅ Pass | `screening_search` returns top 3 experiences (line 1824). |
| All three response formats available | ✅ Pass | `_SCREENING_FORMAT_GUIDANCE` (web_app.py:549-556) defines direct/star/technical. Format param passed to `screening_generate` (master_data_routes.py:1851). |
| Word count ranges shown as guidance in UI | ⚠️ Partial | Word count ranges defined in `_SCREENING_FORMAT_GUIDANCE` and included in LLM prompt. Whether they are displayed as visible UI labels in the screening tab cannot be confirmed from the reviewed files alone. |
| LLM has access to `cover_letter` and `clarification_answers` | ✅ Pass | `cover_letter_snippet` and `answers` both included in screening prompt (master_data_routes.py:1878-1898). |
| My format and experience choices persist per question | ⚠️ Partial | Format and experience indices passed per-request. No evidence of per-question persistence of these choices in session state between UI interactions. |
| All responses exported in one DOCX file | ✅ Pass | `screening_save` (master_data_routes.py:1919) writes single `Screening_{Company}_{Role}_{Date}.docx` (lines 1959-1973). |
| Each finalised response stored in `metadata.json` | ✅ Pass | `metadata['screening_responses']` written at save (generation_routes.py:1952). |
| `response_library.json` updated after saving | ✅ Pass | Library upserted at `screening_save` and at finalise (generation_routes.py:1952-1966). |

---

### US-A9: Finalise, Archive, and Submit

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Status transitions (`draft → ready → sent`) persistent | ✅ Pass | `finalise_application` (generation_routes.py:1880) validates status against `('draft', 'ready', 'sent', 'interview', 'rejected', 'accepted')` (line 1929); written to `metadata['application_status']` (line 1941). |
| Notes field saved | ✅ Pass | `notes` written to `metadata['notes']` (generation_routes.py:1942). |
| Git commit created automatically | ✅ Pass | Git add + commit in finalise route (generation_routes.py:1980-2001); commit message `feat: Add {Company}_{Role}_{Date} application` (line 1974). |
| Summary shows keyword match score vs. job description | ⚠️ Partial | Summary returns `ats_keywords` and `ats_score` (generation_routes.py:2009-2018). ATS score shown in position bar (index.html:88-95). However a dedicated "matched vs. unmatched keywords" breakdown in the finalise summary view is not verifiable from the reviewed source. |

---

### US-A10: Update Master CV Data

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Natural-language updates produce proposed JSON diff before writing | ✅ Pass | Master CV tab (index.html:224); master_data_routes handles NL updates via LLM with preview diff. |
| Document ingestion with review step | ✅ Pass | Master CV modal has import/upload flow with structured review. |
| No blind writes | ✅ Pass | Master CV routes require explicit confirmation before writing. |
| Git commit on every confirmed update | ✅ Pass | Master data routes commit on confirmed save. |

---

### US-A11: Session Master CV Harvest

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Harvest prompt appears automatically after Finalise | ✅ Pass | `harvest` step in workflow nav (index.html:142); `tab-harvest` (line 229); `GET /api/harvest/candidates` (generation_routes.py:2035). |
| Candidates compiled from: approved rewrites, skill additions, summary rewrites, clarification-answer-revealed skills | ✅ Pass | `_compile_harvest_candidates()` (generation_routes.py:939) collects extra_skills, skill_gap_confirmed from post_analysis_answers, improved bullets. |
| No item pre-selected — opt-in only | ✅ Pass | Harvest UI renders items with unchecked checkboxes by default. |
| Each candidate shows before/after diff with rationale | ✅ Pass | `_compile_harvest_candidates()` returns `original`, `proposed`, `rationale` (lines 350-356). |
| Consolidated JSON diff shown before any write | ✅ Pass | `harvest_apply` (generation_routes.py:2093) accepts selected IDs; frontend shows consolidated diff. |
| No blind writes | ✅ Pass | `POST /api/harvest/apply` requires explicit list of selected IDs. |
| Git commit on confirmed harvest | ✅ Pass | Harvest apply commits with `chore: Update master CV data from {Company}_{Role}_{Date} session` (generation_routes.py:2177). |
| Skippable | ✅ Pass | Skip affordance in harvest tab; user can navigate away without applying. |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Re-run affordance visible for each completed stage | ✅ Pass | `workflow-steps.js:645` — `RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite', 'spell'])`. Completed steps get `↻` button (line 730-733), visible on hover/focus via CSS (line 762). |
| Confirmation dialogue lists downstream stages affected | ✅ Pass | `_showReRunConfirmModal()` (workflow-steps.js:135-185) renders a focused confirm dialog describing downstream impact. |
| Re-running does not silently discard approved decisions | ✅ Pass | `re_run_phase()` (conversation_manager.py:1470) preserves decisions and passes as `_prior_context` to LLM (line 1514-1515). |
| LLM re-run receives full session context | ✅ Pass | `_build_downstream_context()` builds a context summary passed to the re-run LLM call. |
| After re-run, only changed/new items highlighted for re-review | ⚠️ Partial | `re_run_phase()` returns `prior_output` and `new_output` (line 1577-1581); `stale_steps` tracked in StatusResponse. Per-item "changed vs. unchanged" highlighting in the customisations step is not explicitly confirmed from the reviewed source. |
| Clarification answers can be amended when triggering re-run of Analysis | ✅ Pass | `back_to_phase()` accepts feedback text (job_routes.py:766-772); questions tab re-opens for answer changes. |
| Session state records each re-run event | ✅ Pass | `rerun_log` appended in `re_run_phase()` (conversation_manager.py:1571-1574) with phase, timestamp, triggered_by. |
| Re-run affordance accessible via keyboard shortcut or menu (not only progress indicator) | ❌ Fail | `↻` buttons are keyboard-focusable (Tab key, focus-visible style at workflow-steps.js:762), but there is no dedicated keyboard shortcut (e.g., Alt+R) and no menu-based re-run entry found in reviewed source. Story requires access "not only via the progress indicator." |

---

## Generated Materials Evaluation

### Terminology and Mental Model Alignment

| Area | Assessment |
|------|-----------|
| "CV Builder" vs. "CV Customizer" | Header says "CV Customizer" (index.html:41); onboarding modal says "CV Builder" (index.html:322). Dual naming is inconsistent. "CV Builder" better matches the applicant's mental model of building a tailored document. |
| "Analyze Job" button | ✅ Clear — maps to mental model of analysis as a distinct action. |
| "Customise" step label | ✅ Clear — matches the concept of selecting and prioritising content. |
| "Rewrites" step label | ✅ Clear — applicants understand this as AI-proposed text improvements. |
| "Layout Review" step label | ✅ Clear for the HTML preview phase. |
| "Download" vs "File Review" | ⚠️ Workflow step bar says "Download" (index.html:132) but viewer tab says "File Review" (index.html:222). Inconsistent labels for the same step. |
| "Package Application Files" button | ⚠️ Button (index.html:194) does not signal that this step also records application status and commits to Git. "Finalise Application" would be clearer. |
| "Harvest" step label | ⚠️ Opaque to applicants in a job-application context. "Update Profile" or "Improve Master CV" would communicate intent more directly. |
| "Master CV" / "master profile" | ⚠️ Internal jargon. Applicants think of this as their "complete work history." Consider "My Career Profile" in user-facing text. |
| "ATS" acronym unexplained | ⚠️ ATS score badge appears without any tooltip or explanation of what ATS means or why the score matters to the applicant. |

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-NEW-A: Intake confirmation UI not surfaced.** `GET /api/intake-metadata` and `POST /api/confirm-intake` exist (status_routes.py:1027-1086) but no UI step explicitly shows the extracted company name, role title, and date for the user to confirm/edit before analysis begins. Add an inline confirmation card to the Job tab.

2. **GAP-NEW-B: Cover letter PDF not generated.** US-A7 requires `.docx` and `.pdf` for cover letters. Only DOCX is written by `cover_letter_save`. A PDF rendering path needs to be added.

3. **GAP-NEW-C: US-A3b category management UI not traceable.** State fields (`skill_category_overrides`, `skill_category_order`) exist but rename/reorder/move-between-categories controls are not found in the reviewed frontend source. If implemented in skill-specific JS modules outside this review scope, verify and document them; otherwise this is a confirmed gap.

4. **GAP-NEW-D: Prior clarification answers not pre-populated in questions UI.** `GET /api/prior-clarification-answers` (status_routes.py:1090) exists but is not called from the questions tab UI. Implement pre-population with editable defaults.

5. **GAP-NEW-E: "Harvest" step label opaque.** The label "🌾 Harvest" is not immediately meaningful to job applicants. Recommend "📚 Update Profile" or "📈 Improve Master CV."

6. **GAP-NEW-F: Re-run keyboard shortcut missing.** US-A12 requires re-run to be accessible via "a keyboard shortcut or menu, not only via the progress indicator." Neither is implemented.

7. **GAP-NEW-G: Mismatch-driven clarifying questions not explicitly generated.** The LLM receives all required skills and full master data but no explicit instruction to compare them and generate gap-specific questions. A structured gap-analysis pass before question generation would satisfy US-A2's mismatch criterion.

8. **GAP-NEW-H: "Download" vs "File Review" label inconsistency.** Workflow step bar (index.html:132) says "Download" but viewer tab (index.html:222) says "File Review." Align to one term.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-A1 | 2 | 2 | 0 | 0 | 0 |
| US-A2 | 4 | 3 | 0 | 0 | 0 |
| US-A3 | 6 | 2 | 0 | 0 | 0 |
| US-A3b | 3 | 1 | 0 | 4 | 0 |
| US-A4 | 5 | 0 | 0 | 0 | 0 |
| US-A4b | 6 | 1 | 0 | 0 | 0 |
| US-A5a | 5 | 0 | 0 | 0 | 0 |
| US-A5b | 6 | 1 | 0 | 0 | 0 |
| US-A5c | 5 | 0 | 0 | 0 | 0 |
| US-A6 | 4 | 0 | 0 | 0 | 0 |
| US-A7 | 8 | 0 | 1 | 0 | 0 |
| US-A8 | 5 | 3 | 0 | 0 | 0 |
| US-A9 | 3 | 1 | 0 | 0 | 0 |
| US-A10 | 4 | 0 | 0 | 0 | 0 |
| US-A11 | 8 | 0 | 0 | 0 | 0 |
| US-A12 | 5 | 1 | 1 | 0 | 0 |
| **Total** | **79** | **15** | **2** | **4** | **0** |

**Key evidence references:**
- Protected-site warning: `scripts/routes/job_routes.py:266-301`
- Intake metadata API: `scripts/routes/status_routes.py:1027-1086`
- Clarification questions (LLM): `scripts/web_app.py:973-1051`
- Clarification answers propagation: `scripts/utils/conversation_manager.py:756-764`; `scripts/routes/master_data_routes.py:1562-1567`
- Rewrite cards state: `scripts/utils/conversation_manager.py:97-99`; `web/index.html:216`
- Re-run phase backend: `scripts/utils/conversation_manager.py:1470-1582`; `scripts/routes/job_routes.py:779-799`
- Re-run workflow buttons: `web/workflow-steps.js:645, 730-733`
- Cover letter tone options (5 tones): `scripts/routes/master_data_routes.py:97-103`
- Cover letter PDF gap: `POST /api/cover-letter/save` writes DOCX only; no PDF path found
- Screening library search: `scripts/routes/master_data_routes.py:1776-1843`
- Harvest candidates: `scripts/routes/generation_routes.py:939-963`
- Publication decisions metadata key mismatch: stored as `publication_decisions`, story expects `clarification_answers.selected_publications`
- Re-run keyboard shortcut absent: `web/workflow-steps.js:759-763` (hover/focus-visible CSS only, no keyboard shortcut)
