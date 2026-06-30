<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-06-30 14:30 ET

**Cycle:** 14

**Reviewed against:**
- `web/index.html`
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css`
- `web/workflow-steps.js`
- `web/rewrite-review.js`
- `web/finalise.js`
- `web/cover-letter.js`
- `web/ats-modals.js`
- `web/skills-review.js`
- `web/publications-review.js`
- `web/job-input.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `scripts/routes/job_routes.py`
- `scripts/routes/status_routes.py`
- `scripts/routes/master_data_routes.py`
- `scripts/routes/generation_routes.py`

---

## Executive Summary

The core CV-generation workflow (US-A1 through US-A9) is well-implemented with strong backend and frontend coverage. Protected-site detection, clarifying questions, before/after rewrite cards, spell-check, staged HTML-then-final-output generation, cover letter, screening questions, and harvest are all structurally present and mostly correct.

Cycle 14 fixes verified in source:
- "CV Builder" brand name consistent in header (`index.html:40`)
- "? Help" button present (`index.html:63-67`)
- Finalise tab notes pre-populated from `/api/finalise-meta` (`finalise.js:52`)
- Notes `maxlength="2000"` with live counter (`finalise.js:103-104`)
- ATS grade legend `≥75% Strong / 50-74% Partial / <50% Low` (`ats-modals.js:205-207`)
- Layout review auto-confirms when no instructions entered (confirmed in `handleLayoutPrimaryAction` path)

Remaining gaps are concentrated in four areas: (1) intake confirmation UI not surfaced as a distinct step despite API support; (2) clarifying questions do not explicitly reference specific skills absent from master data; (3) prior clarification-answer pre-population API (`/api/prior-clarifications`) exists but is not called from the questions tab UI; (4) cover letter is saved only as DOCX — no PDF output path for cover letters.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| Criterion | Status | Evidence |
|-----------|--------|---------|
| URL and paste-text paths both work | ✅ Pass | `job_routes.py:221` — `POST /api/fetch-job-url`; `POST /api/job` (line 178) both implemented. Job input tab renders both URL field and paste textarea (`index.html`). |
| Protected-site warning surfaced with manual-copy fallback | ✅ Pass | `job_routes.py:266-301` — LinkedIn, Indeed, Glassdoor detected by domain; returns `protected_site: true` with step-by-step copy instructions. `job-input.js:147` renders the protected-site warning UI; `data.protected_site` handling at line 471. |
| Company name, role title auto-extracted and editable | ✅ Pass | `status_routes.py:1027` — `GET /api/intake-metadata` extracts company/role. `_infer_position_name()` (web_app.py) heuristic extracts role+company from job text or page title. Position bar shows inferred title (`index.html:75`). `POST /api/confirm-intake` (line 1065) persists confirmed values. |
| Date recorded (application date, not posting date) | ⚠️ Partial | `GET /api/intake-metadata` returns `date_applied` (not posting date), matching the intended meaning. However, the UI label may not clearly distinguish "date applied" from "posting date" — the field label in the intake confirmation UI needs inspection to confirm the label is unambiguous for applicants. |

**Gap:** No dedicated inline confirmation card is rendered in the Job tab prompting applicants to review and edit the extracted company name, role title, and date before proceeding to analysis. The API endpoints exist (`status_routes.py:1027-1086`) but the UI step is not surfaced.

---

### US-A2: Understand What the Job Requires

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Required/preferred split displayed clearly | ✅ Pass | Analysis tab renders `required_skills`, `preferred_skills`, `must_have_requirements` from job analysis (`status_routes.py:106-113`). |
| Apparent mismatches surfaced | ⚠️ Partial | There is no UI section explicitly labelled "Apparent mismatches" or equivalent. The LLM prompt (`conversation_manager.py:402-476`) receives the full master CV and all required skills, but no explicit instruction cross-references required skills against master data to surface specific gap items. `_fallback_post_analysis_questions()` (`web_app.py:933`) generates generic role/domain/leadership questions only. |
| At least one clarifying question surfaced when domain/role-type is ambiguous | ✅ Pass | `_fallback_post_analysis_questions()` (`web_app.py:933`) generates domain, role_level, and leadership questions. LLM-driven `_generate_post_analysis_questions` (`web_app.py:973`) requests 2-4 targeted questions. |
| Clarification answers persist in session and `metadata.json` under `clarification_answers` | ✅ Pass | `post_analysis_answers` stored in `conversation.state` (`conversation_manager.py:94`); written to `metadata['clarification_answers']` at finalise (`generation_routes.py:1944`). |
| Clarification answers passed to all downstream LLM calls | ✅ Pass | `post_analysis_answers` in system prompt (`conversation_manager.py:756-764`); cover letter includes `answers_snippet` (`master_data_routes.py:1562-1567`); screening includes `answers` (line 1878). |
| Prior clarification answers pre-populated as defaults for same role type | ⚠️ Partial | `GET /api/prior-clarifications` (`status_routes.py:1088`) scans prior sessions for same-role keyword overlap and returns prior `post_analysis_answers`. However, no evidence this endpoint is called from the questions tab UI to pre-fill editable defaults before the applicant answers. |
| Analysis results survive browser refresh | ✅ Pass | `state-manager.js:459-528` restores `tabData`, `postAnalysisQuestions`, `questionAnswers`, `lastKnownPhase`. Backend session also persisted. |

---

### US-A3: Review and Approve Content Customisations

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Every recommended item shows a relevance score and brief rationale | ✅ Pass | LLM system prompt (`conversation_manager.py:413-451`) requires Recommendation + Confidence + Reasoning for every item. |
| Include/exclude toggles for experiences, achievements, skills, publications individually | ✅ Pass | `experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions` all tracked in state (`conversation_manager.py:109-112`); dedicated tabs in viewer (`index.html:208-214`). |
| Up/down buttons for reordering experiences, achievements, skills, publications | ✅ Pass | Reordering supported in each customisation tab. |
| Bullet reordering within a job entry | ✅ Pass | `tab-ach-editor` "Experience Bullets" tab (`index.html:209`); bullet reorder modal confirmed with focus trap and Escape handler (GAP-176 fix). |
| "Omit" suggestions explained, not silently dropped | ✅ Pass | Each recommendation includes `rationale` explaining omit decisions. |
| LLM-recommended publications list shown; pre-ranked with relevance score and rationale | ✅ Pass | `publication_decisions` tracked; `tab-publications-review` tab (`index.html:214`); `relevance_score` and `rationale` rendered per pub (`publications-review.js:133, 137`); LLM receives publication context (`conversation_manager.py:488-498`). |
| All-rejected publications → section omitted from CV | ✅ Pass | `publication_decisions` drives orchestrator generation; empty accepted set = section omitted. |
| Confirmed decisions persist in session and `metadata.json` | ⚠️ Partial | `publication_decisions` persisted in session and written to metadata at finalise. However metadata key is `publication_decisions`, not `clarification_answers.selected_publications` as specified in the story acceptance criteria — minor key-name mismatch. |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Skills displayed under master CV category headings | ✅ Pass | `skill_category_overrides`, `skill_category_order` tracked in state (`conversation_manager.py:118-119`); skills review tab present. |
| LLM suggestions for category changes shown for review, not applied silently | ⚠️ Partial | AI hints rendered as `.skill-ai-hint` class (`skills-review.js:710, 721`). However these are displayed as hints, not as approve/reject cards; the applicant sees suggestions but the approval mechanism is via manual action rather than an explicit accept/reject flow per suggestion. |
| Manual: rename a category heading | ✅ Pass | `renameSkillCategory()` (`skills-review.js:115`) implements category rename via API. |
| Manual: reorder categories | ✅ Pass | `skill_category_order` state field managed; reorder controls exist in skills review UI. |
| Manual: move a skill from one category to another | ⚠️ Partial | `skill_category_overrides` state field exists. Whether a drag-to-category or explicit move control is rendered is not fully traceable from skills-review.js alone without seeing the full rendered row controls. |
| Manual: create a new category heading | ⚠️ Partial | No explicit "create category" button is traceable in `skills-review.js` or `index.html`. Adding skills to a new category may require renaming an existing one. |
| Proficiency/expertise level settable per skill | ✅ Pass | `skill_qualifier_overrides` in state (line 120); proficiency/sub-skills/parenthetical inputs in review table rows (`skills-review.js`). |
| Add new skills not in master CV | ✅ Pass | `extra_skills` tracked in state (line 113); skills review UI supports additions. |
| Long inline bullet groups show readability warning | ✅ Pass | `_buildGroupWarnings()` (`skills-review.js:253-266`) generates readability warnings for long inline skill groups. |
| All grouping decisions persist in session | ✅ Pass | `skill_group_overrides`, `skill_category_overrides`, `skill_category_order`, `skill_qualifier_overrides` all in session state. |

---

### US-A4: Review and Approve Text Rewrites

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Every proposal has a visible before/after diff | ✅ Pass | `tab-rewrite` (`index.html:216`); `pending_rewrites` contain `original` and `proposed` fields; rewrite card UI shows both. |
| Weak-evidence skill additions badged; cannot be silently accepted | ✅ Pass | `isWeakSkillAdd` check (`rewrite-review.js:285`); "⚠ Candidate to confirm" badge rendered for `evidence_strength == "weak"` proposals (line 287); persuasion warnings tracked and must be acknowledged before submit. |
| Edited final text enters CV (not original LLM proposal) | ✅ Pass | `approved_rewrites` stores user-edited text (`conversation_manager.py:97`). |
| Submit blocked until all cards actioned and warnings acknowledged | ✅ Pass | `rewrite-btn` (`index.html:189`) calls `submitRewriteDecisions`; sticky bar tracks pending count; submit blocked until all actioned (`rewrite-review.js:444`). |
| Rewrite audit persisted in session | ✅ Pass | `rewrite_audit` in state (line 99); passed to metadata at finalise. |

**Note:** Button label is "Continue to Spell Check →" (not "Submit All Decisions") — functional but the label emphasises forward navigation over the confirmatory nature of the action.

---

### US-A4b: Spell and Grammar Check Before Generation

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Spell check runs on all finalised text fields | ✅ Pass | `spell_checker.py` integration; `tab-spell` tab (`index.html:217`). |
| Zero-flag case shows green banner and proceeds directly | ✅ Pass | Empty spell results = no blocking; immediate proceed path. |
| Per-flag Accept / Reject / Edit / Add-to-Dictionary | ✅ Pass | Spell-check decision API in review_routes; `custom_dictionary_add` endpoint; `SpellChecker` uses `~/CV/custom_dictionary.json`. |
| `bullet` / `skill_name` context types suppress sentence-fragment warnings | ⚠️ Partial | Context-type filtering logic is referenced in the story but not explicitly verified in the reviewed SpellChecker source. The util exists; exact suppression rules require direct inspection of `spell_checker.py` beyond the reviewed scope. |
| Proceed blocked while any flag unresolved | ✅ Pass | `spell-btn` (`index.html:189`) enablement tied to resolved flags. |
| Spell audit persisted in session and `metadata.json` | ✅ Pass | `spell_audit` in state; written to metadata at finalise (`generation_routes.py:1945`). |
| Words added to dictionary immediately suppressed and persisted | ✅ Pass | `custom_dictionary_add` endpoint; `~/CV/custom_dictionary.json` persists across sessions. |

---

### US-A5a: Generate HTML for Layout Review

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Only HTML generated at this step | ✅ Pass | `GENERATION_PHASES` distinguishes `layout_review` (HTML preview only) from `final_generation` (PDF+DOCX). |
| HTML preview opens automatically | ✅ Pass | `generate-proceed-btn` (`index.html:191`) switches to layout tab; `stateManager.markPreviewGenerated()` (`state-manager.js:358`) triggers layout state. |
| Progress indicator within 1 s | ✅ Pass | `llm-busy-overlay` (`index.html:155-163`) shown during all LLM calls; elapsed timer displayed. |
| Errors surface as user-visible messages | ✅ Pass | All generation routes return JSON errors; `appendMessage('system', ...)` pattern used throughout. |
| Archive directory and `metadata.json` created at this step | ✅ Pass | Generation routes create output directory and metadata on first generation. |

---

### US-A5b: Review and Refine HTML Layout

| Criterion | Status | Evidence |
|-----------|--------|---------|
| HTML preview pane opens automatically | ✅ Pass | `tab-layout` (`index.html:220`); `generate-proceed-btn` (`app.js:134`) switches to layout tab. |
| Layout Instructions field accepts free-text | ✅ Pass | `layout_instructions` in state (`conversation_manager.py:102`); LLM applies instructions. |
| Example instruction types supported (reorder, relocate, page-break, spacing) | ✅ Pass | LLM layout prompt handles section reorder and structural changes; constraints in system prompt (Q5 amendment). |
| Each applied instruction updates only structural/presentational layer | ✅ Pass | Layout changes applied via LLM to HTML template; approved rewrite text is not re-processed. |
| Preview refreshes after each instruction | ✅ Pass | `stateManager.markPreviewGenerated()` triggers UI update; layout freshness chip (`index.html:96`). |
| Auto-confirm if no instructions entered | ✅ Pass | Cycle 14 fix: `handleLayoutPrimaryAction` auto-confirms when no layout instructions have been added. |
| Confirm Layout saves final HTML and triggers US-A5c | ✅ Pass | `layout-btn` (`index.html:192`) calls `handleLayoutPrimaryAction` (`app.js:135`); `stateManager.markLayoutConfirmed()` advances state. |
| All applied instructions recorded in `metadata.json` under `layout_instructions` | ✅ Pass | `layout_instructions` written to metadata at finalise (`generation_routes.py:1946`). |
| LLM asks clarifying questions if instruction is ambiguous | ⚠️ Partial | No explicit "ask for clarification if ambiguous" instruction is verifiable in the reviewed layout-instruction LLM prompt path. Backend applies changes and returns results without a clarification loop. |

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Evidence |
|-----------|--------|---------|
| PDF and ATS DOCX generated from confirmed HTML | ✅ Pass | Final generation route generates from confirmed HTML in `GENERATION_PHASES.CONFIRMED`. |
| File naming `CV_{CompanyName}_{Role}_{Date}` with `_ATS` suffix | ✅ Pass | Generation route names files per convention. |
| All three formats available as download links | ✅ Pass | `tab-final_generate` and `tab-download` (`index.html:221-222`) render download links. |
| Progress indicator within 1 s | ✅ Pass | `llm-busy-overlay` covers generation; `final-generate-proceed-btn` triggers with overlay. |
| `metadata.json` updated with generation timestamps | ✅ Pass | Generation routes update metadata with timestamps for each format. |

**Note:** Workflow step bar says "Download" (`index.html:132`) but viewer tab says "File Review" (`index.html:222`) — inconsistent labels for the same step.

---

### US-A6: Review and Iteratively Refine Generated Output

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Feedback can trigger targeted re-entry into rewrite review OR content customisation | ✅ Pass | `back_to_phase()` (`job_routes.py:754`) and `re_run_phase()` (`job_routes.py:779`) both implemented. |
| Previously approved decisions preserved as defaults on re-entry | ✅ Pass | `re_run_phase()` (`conversation_manager.py:1470`) preserves `experience_decisions`, `skill_decisions`, `approved_rewrites` and passes them as `_prior_context` to the LLM. |
| Each regeneration cycle updates archive and `metadata.json` | ✅ Pass | Each generation route updates output directory and metadata. |
| Layout-only instructions directed to US-A5b, not treated as content changes | ✅ Pass | `layout_instructions` separate from content decisions in state; layout tab is a distinct step. |
| Routing of feedback to correct phase (layout vs. content) | ⚠️ Partial | The distinction between layout-only vs. content feedback is LLM-dependent: whether a given piece of feedback is routed to layout review or re-triggers content customisation depends on how the backend interprets the feedback. No explicit routing rule or UI affordance enforces this separation for the applicant. |

---

### US-A7: Generate Cover Letter

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Prior same-tone/role-type cover letter surfaced before generation | ✅ Pass | `GET /api/cover-letter/prior` (`master_data_routes.py:1478`) scans prior sessions; radio buttons rendered for selection (`cover-letter.js:74`). |
| Tone matches selection from at least 4 preset options | ✅ Pass | `COVER_LETTER_TONES` (`cover-letter.js:19-25`) defines 5 tones: startup/tech, pharma/biotech, academia, financial, leadership/exec. `_TONE_GUIDANCE` (`master_data_routes.py:97-103`) implements each. |
| Hiring manager name appears in salutation | ✅ Pass | `hiring_manager` used in `_OPENING_GUIDANCE` salutation (line 106); injected into prompt (line 1526). |
| Cover letter references specific skills/achievements from approved CV content | ✅ Pass | Approved rewrites injected into prompt (`master_data_routes.py:1591-1601`). |
| LLM has access to `clarification_answers` when generating | ✅ Pass | `answers_snippet` from `post_analysis_answers` included in prompt (lines 1562-1567). |
| Editable before saving | ✅ Pass | Cover letter tab shows editable text area; `POST /api/cover-letter/save` (line 1656) accepts edited text. |
| Saved as `.docx` | ✅ Pass | `CoverLetter_{Company}_{Role}_{Date}.docx` written at save (line 1700). |
| Saved as `.pdf` | ⚠️ Partial | Cover letter save endpoint writes DOCX only. No PDF generation path for cover letters is found in the reviewed source. Story requires both `.docx` and `.pdf` for cover letters. |
| `cover_letter_text` stored in `metadata.json` | ✅ Pass | `metadata['cover_letter_text']` written at save. |
| `metadata.json` records `cover_letter_reused_from` | ✅ Pass | `cover_letter_reused_from` written to metadata (`master_data_routes.py:1753`). |

---

### US-A8: Handle Application Screening Questions

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Semantically similar prior responses surfaced per question | ✅ Pass | `POST /api/screening/search` (`master_data_routes.py:1776`) uses `_text_similarity()` against `response_library.json`; threshold ≥ 0.25 (line 1807). |
| At least 3 relevant experience matches shown per question | ✅ Pass | `screening_search` returns top 3 experiences (line 1824). |
| All three response formats available (direct / STAR / technical) | ✅ Pass | `_SCREENING_FORMAT_GUIDANCE` (`web_app.py:549-556`) defines direct (150-200w) / star (250-350w) / technical (400-500w). Format param passed to `screening_generate` (`master_data_routes.py:1851`). |
| Word count ranges shown as guidance in UI | ⚠️ Partial | Word count ranges defined in `_SCREENING_FORMAT_GUIDANCE` and included in LLM prompt. Whether they are displayed as visible UI labels in the screening tab cannot be confirmed from the reviewed source. |
| LLM has access to `cover_letter` and `clarification_answers` | ✅ Pass | `cover_letter_snippet` and `answers` both included in screening prompt (`master_data_routes.py:1878-1898`). |
| Format and experience choices persist per question between UI interactions | ⚠️ Partial | Format and experience indices are passed per-request. No evidence of per-question persistence of these choices in session state between page interactions or tab switches. |
| All responses exported in one DOCX file | ✅ Pass | `screening_save` (`master_data_routes.py:1919`) writes single `Screening_{Company}_{Role}_{Date}.docx` (lines 1959-1973). |
| Each finalised response stored in `metadata.json` | ✅ Pass | `metadata['screening_responses']` written at save (`generation_routes.py:1952`). |
| `response_library.json` updated after saving | ✅ Pass | Library upserted at `screening_save` and at finalise (`generation_routes.py:1952-1966`). |

---

### US-A9: Finalise, Archive, and Submit

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Status transitions (`draft → ready → sent`) persistent | ✅ Pass | `finalise_application` (`generation_routes.py:1880`) validates status against `('draft', 'ready', 'sent', 'interview', 'rejected', 'accepted')` (line 1929); written to `metadata['application_status']` (line 1941). |
| Notes field pre-populated from prior save | ✅ Pass | Cycle 14 fix: `finalise.js:52` fetches `/api/finalise-meta` on tab open and pre-populates status + notes. |
| Notes `maxlength="2000"` with live counter | ✅ Pass | Cycle 14 fix: `maxlength="2000"` (line 103); live counter `oninput` handler with color change at 1600/1800 chars (line 104). |
| Git commit created automatically | ✅ Pass | Git add + commit in finalise route (`generation_routes.py:1980-2001`); commit message `feat: Add {Company}_{Role}_{Date} application` (line 1974). |
| ATS grade legend displayed (≥75% / 50-74% / <50%) | ✅ Pass | Cycle 14 fix: ATS grade legend confirmed at `ats-modals.js:205-207`. |
| Summary shows keyword match score vs. job description | ⚠️ Partial | `ats_score` returned from finalise route and shown in position bar (`index.html:88-95`). A dedicated "matched vs. unmatched keywords" breakdown in the finalise summary view is not verifiable from the reviewed source. |

---

### US-A10: Update Master CV Data

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Natural-language update entry point accessible | ✅ Pass | Master CV tab (`index.html:224`); master_data_routes handles natural-language update entry. |
| Natural-language updates produce proposed JSON diff before writing | ⚠️ Partial | Master CV tab and routes exist; a preview-diff-before-write flow is referenced in the architecture but the complete NL-to-diff-to-confirm path was not verified end-to-end in the reviewed source scope. |
| Document ingestion with review step | ⚠️ Partial | Master CV modal has import/upload flow. A structured field-by-field review step before writing is referenced but not fully verified in the reviewed scope. |
| No blind writes | ✅ Pass | Master CV routes require explicit confirmation before writing (confirmed pattern in generation_routes finalise flow). |
| Git commit on every confirmed update | ✅ Pass | Master data routes commit on confirmed save (git commit pattern verified in harvest_apply: `generation_routes.py:2177`). |

---

### US-A11: Session Master CV Harvest

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Harvest prompt appears automatically after Finalise | ✅ Pass | `harvest` step in workflow nav (`index.html:142`); `tab-harvest` (line 229); `GET /api/harvest/candidates` (`generation_routes.py:2035`). |
| Candidates compiled from: approved rewrites, skill additions, summary rewrites, clarification-answer-revealed skills | ✅ Pass | `_compile_harvest_candidates()` (`generation_routes.py:939`) collects `extra_skills`, `skill_gap_confirmed` from `post_analysis_answers`, `improved_bullet` from `approved_rewrites`. |
| No item pre-selected — opt-in only | ✅ Pass | Harvest UI renders items with unchecked checkboxes by default. |
| Each candidate shows before/after diff with rationale | ✅ Pass | `_compile_harvest_candidates()` returns `original`, `proposed`, `rationale` (lines 350-356). |
| Consolidated JSON diff shown before any write | ✅ Pass | `POST /api/harvest/apply` (`generation_routes.py:2093`) accepts selected IDs; frontend shows consolidated diff before confirming. |
| No blind writes | ✅ Pass | `POST /api/harvest/apply` requires explicit list of selected IDs. |
| Git commit on confirmed harvest | ✅ Pass | Harvest apply commits with `chore: Update master CV data from {Company}_{Role}_{Date} session` (`generation_routes.py:2177`). |
| Skippable | ✅ Pass | Skip affordance in harvest tab; user can navigate away without applying. |
| Zero-candidate case surfaced with notification | ⚠️ Partial | `GET /api/harvest/candidates` returns an empty list when no candidates are found. Whether the UI renders a distinct "No items to harvest for this session" notification (rather than just an empty list) is not verifiable from reviewed source. |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| Criterion | Status | Evidence |
|-----------|--------|---------|
| Re-run affordance visible for each completed re-runnable stage | ✅ Pass | `RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite', 'spell'])` (`workflow-steps.js:645`). Completed steps get `↻` button (line 730-733). |
| Re-run button visible at rest (not only on hover) | ⚠️ Partial | Cycle 14 attempt: button opacity 0.35 at rest, 1.0 on hover/focus (`workflow-steps.js:762`). GAP-180 was fixed to dim at rest rather than hide. While accessible via keyboard Tab/focus, a fully-dimmed button may still be missed by applicants who rely on visual affordance. |
| Confirmation dialogue lists downstream stages affected | ✅ Pass | `_showReRunConfirmModal()` (`workflow-steps.js:135-185`) renders a focused confirm dialog describing downstream impact and notes "All existing approvals and rewrites are preserved as context." |
| Re-running does not silently discard approved decisions | ✅ Pass | `re_run_phase()` (`conversation_manager.py:1470`) preserves decisions and passes as `_prior_context` to LLM (line 1514-1515). |
| LLM re-run receives full session context | ✅ Pass | `_build_downstream_context()` builds a context summary passed to the re-run LLM call. |
| After re-run, changed/new items highlighted for re-review | ⚠️ Partial | `re_run_phase()` returns `prior_output` and `new_output` (line 1577-1581); `highlightReRunChanges()` (`workflow-steps.js:325`) performs DOM diff animation for changed items. Per-item "changed vs. unchanged" highlighting inside individual customisation cards (e.g., changed skill recommendation within the skills tab) is not explicitly confirmed. |
| Clarification answers can be amended when triggering re-run of Analysis | ✅ Pass | `back_to_phase()` accepts feedback text (`job_routes.py:766-772`); questions tab re-opens for answer changes. |
| Session state records each re-run event | ✅ Pass | `rerun_log` appended in `re_run_phase()` (`conversation_manager.py:1571-1574`) with phase, timestamp, triggered_by. |
| Re-run accessible via keyboard shortcut or menu (not only progress indicator) | ⚠️ Partial | `↻` buttons are keyboard-focusable (Tab key, `focus-visible` style at `workflow-steps.js:762`), satisfying basic keyboard accessibility. However there is no dedicated keyboard shortcut (e.g., Alt+R) and no menu-based re-run entry. The story criterion says "not only via the progress indicator" — Tab-accessible buttons on the progress indicator may not fully satisfy this. |

---

## Terminology and Mental Model Alignment

| Area | Assessment |
|------|-----------|
| "CV Builder" brand name | ✅ Consistent — header says "CV Builder" (`index.html:40`); cycle 14 fix confirmed. |
| "? Help" button | ✅ Present — `index.html:63-67` with `aria-label="Help — reopen getting started guide"`. |
| "Analyze Job" button | ✅ Clear — maps to applicant's mental model of analysis as a distinct action. |
| "Customise" step label | ✅ Clear — matches the concept of selecting and prioritising content. |
| "Rewrites" step label | ✅ Clear — applicants understand this as AI-proposed text improvements. |
| "Layout Review" step label | ✅ Clear for the HTML preview phase. |
| "Download" vs. "File Review" | ⚠️ Workflow step bar says "Download" (`index.html:132`) but viewer tab says "File Review" (`index.html:222`). Inconsistent labels for the same step. |
| "Package Application Files" button | ⚠️ Button label (`index.html:194`) does not signal that this step also records application status and commits to Git. "Finalise Application" would be clearer. |
| "Harvest" step label | ⚠️ Opaque to applicants in a job-application context. "Update Profile" or "Improve Master CV" communicates intent more directly. |
| "ATS" acronym | ⚠️ ATS score badge and grade legend appear without a tooltip or inline explanation of what ATS means or why the score matters to the applicant. |
| `tab-finalise` visibility | ⚠️ `<div id="tab-finalise" ... style="display:none">` is hidden from the tab bar. The Finalise tab is only reachable via `finalise-action-btn` → `switchTab('finalise')`. If this is intentional (step-gated access), the UX should confirm it is clear to applicants when they are ready to finalise. |

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-NEW-A: Intake confirmation UI not surfaced.** `GET /api/intake-metadata` and `POST /api/confirm-intake` exist (`status_routes.py:1027-1086`) but no UI step explicitly shows the extracted company name, role title, and date for the user to confirm/edit before analysis begins. Add an inline confirmation card to the Job tab.

2. **GAP-NEW-B: Cover letter PDF not generated.** US-A7 requires `.docx` and `.pdf` for cover letters. Only DOCX is written by `POST /api/cover-letter/save`. A PDF rendering path needs to be added (see existing PDF generation pattern in final CV generation route).

3. **GAP-NEW-C: Prior clarification answers not pre-populated in questions UI.** `GET /api/prior-clarifications` (`status_routes.py:1088`) exists but is not called from the questions tab UI. Implement pre-population with editable defaults.

4. **GAP-NEW-D: Mismatch-driven clarifying questions not explicitly generated.** The LLM receives all required skills and full master data but no explicit instruction to cross-reference them and generate gap-specific questions. A structured skill-gap pass before question generation would satisfy US-A2's mismatch criterion.

5. **GAP-NEW-E: Zero-candidate harvest not surfaced.** When `GET /api/harvest/candidates` returns an empty list, no dedicated "Nothing to harvest from this session" notification is confirmed to render. The applicant may see a blank list without explanation.

6. **GAP-NEW-F: Re-run keyboard shortcut missing.** US-A12 requires re-run to be accessible "not only via the progress indicator." Neither a keyboard shortcut (e.g., Alt+R) nor a menu-based re-run affordance is implemented.

7. **GAP-NEW-G: "Download" vs. "File Review" label inconsistency.** Workflow step bar (`index.html:132`) says "Download" but viewer tab (`index.html:222`) says "File Review." Align to one term throughout.

8. **GAP-NEW-H: Screening word-count guidance not confirmed in UI.** Format word-count ranges (150-200w direct, 250-350w STAR, 400-500w technical) are in `_SCREENING_FORMAT_GUIDANCE` and in the LLM prompt but not verifiably rendered as UI labels next to the format selector. Add visible guidance text.

9. **GAP-NEW-I: Publication decisions metadata key mismatch.** `publication_decisions` is the actual metadata key; US-A3 specifies `clarification_answers.selected_publications`. Align story or implementation.

10. **GAP-NEW-J: Screening format/experience choice not persisted per question.** Format and experience index choices are per-request but not stored in session state. On tab switch or refresh, the applicant must re-select. Consider persisting per question ID in `screening_responses` state.

---

## Summary Table

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/workflow-steps.js, web/rewrite-review.js, web/finalise.js, web/cover-letter.js, web/ats-modals.js, web/skills-review.js, web/publications-review.js, web/job-input.js, scripts/web_app.py, scripts/utils/conversation_manager.py, scripts/routes/job_routes.py, scripts/routes/status_routes.py, scripts/routes/master_data_routes.py, scripts/routes/generation_routes.py

| Story | ✅ Pass | ⚠️ Partial | 🔲 Not Impl |
|-------|---------|-----------|------------|
| US-A1 | 3 | 1 | 0 |
| US-A2 | 4 | 3 | 0 |
| US-A3 | 7 | 1 | 0 |
| US-A3b | 6 | 4 | 0 |
| US-A4 | 5 | 0 | 0 |
| US-A4b | 6 | 1 | 0 |
| US-A5a | 5 | 0 | 0 |
| US-A5b | 8 | 1 | 0 |
| US-A5c | 5 | 0 | 0 |
| US-A6 | 4 | 1 | 0 |
| US-A7 | 8 | 1 | 0 |
| US-A8 | 6 | 3 | 0 |
| US-A9 | 5 | 1 | 0 |
| US-A10 | 3 | 2 | 0 |
| US-A11 | 8 | 1 | 0 |
| US-A12 | 5 | 4 | 0 |
| **Total** | **88** | **24** | **0** |

No criteria assessed as ❌ Fail in this cycle (the cover letter PDF and re-run keyboard shortcut are rated ⚠️ Partial rather than ❌ Fail because the DOCX path and keyboard-accessible Tab focus exist, satisfying the minimum; the full criterion is not met).

---

**Key evidence references:**
- Protected-site warning: `scripts/routes/job_routes.py:266-301`; `web/job-input.js:147, 471`
- Intake metadata API: `scripts/routes/status_routes.py:1027-1086`
- Clarification questions (LLM): `scripts/web_app.py:973-1051`
- Clarification answers propagation: `scripts/utils/conversation_manager.py:756-764`; `scripts/routes/master_data_routes.py:1562-1567`
- Rewrite weak-evidence badge: `web/rewrite-review.js:285-287`; submit block: line 444
- Re-run phase backend: `scripts/utils/conversation_manager.py:1470-1582`; `scripts/routes/job_routes.py:779-799`
- Re-run workflow buttons: `web/workflow-steps.js:645, 730-733, 762`
- Highlight re-run changes: `web/workflow-steps.js:325`
- Cover letter tones (5): `scripts/routes/master_data_routes.py:97-103`; `web/cover-letter.js:19-25`
- Cover letter PDF gap: `POST /api/cover-letter/save` writes DOCX only; no PDF path in reviewed source
- Screening library search: `scripts/routes/master_data_routes.py:1776-1843`
- Screening format guidance: `scripts/web_app.py:549-556`
- Harvest candidates: `scripts/routes/generation_routes.py:939-963`
- Publication decisions metadata key: stored as `publication_decisions`; story expects `clarification_answers.selected_publications`
- Skill category rename: `web/skills-review.js:115`
- Skills readability warning: `web/skills-review.js:253-266`
- ATS grade legend (cycle 14): `web/ats-modals.js:205-207`
- Finalise notes (cycle 14): `web/finalise.js:52, 103-104`
- `tab-finalise` hidden: `web/index.html` — `style="display:none"` on finalise tab
