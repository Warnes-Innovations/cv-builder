<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status
**Last Updated:** 2026-07-06 22:45 ET
**Reviewer:** Source-first UI review (applicant persona — job seeker)
**Executive Summary:** The core end-to-end workflow is well-implemented: URL/paste/file job input, protected-site warnings (LinkedIn, Indeed, Glassdoor), intake confirmation, clarifying questions, multi-table customization review with up/down reordering, before/after rewrite review, spell check, staged generation (HTML preview → layout confirm → PDF+DOCX), cover letter with prior-session reuse, screening questions with response library, finalisation with git commit, and harvest. Three significant gaps remain: (1) the job analysis panel does not surface role_level (IC vs. leadership) or apparent mismatches between job requirements and master CV data — the most valuable part of US-A2; (2) prior-session clarification answer defaults are not pre-populated; (3) several step labels ("Harvest", "LLM") are developer-facing jargon that will confuse job seekers.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| Criterion | Status | Evidence |
|-----------|--------|----------|
| URL fetch path works | ✅ Pass | `web/job-input.js:130, 463` — URL tab with `fetchJobFromURL()` calling `/api/fetch-job-url` |
| Paste-text path works | ✅ Pass | `web/job-input.js:108, 123` — Paste Text tab with `submitJobText()` |
| File upload path (bonus) | ✅ Pass | `web/job-input.js:152–178` — drag-and-drop zone with PDF/DOCX/TXT support |
| Protected-site warning with manual-copy fallback | ✅ Pass | `scripts/routes/job_routes.py:266–301` — LinkedIn, Indeed, Glassdoor detected; step-by-step copy instructions returned; `web/job-input.js:475–488` surfaces them |
| Company, role, date auto-extracted and editable | ✅ Pass | `web/message-dispatch.js:438–469` — intake-confirm-card shows editable Role, Company, Date inputs after analysis |
| Session persisted immediately | ✅ Pass | Session auto-saves after every message exchange (`conversation_manager.py` `_save_session()`) |
| Session set to `status: "queued"` on submission | ⚠️ Partial | `generation_routes.py:2180` accepts `queued` in the finalise endpoint, but no code auto-sets the status to `queued` when a job is first submitted; the applicant must manually set it via finalise |

**Story Score: 6/7 criteria met (1 partial)**

---

### US-A2: Understand What the Job Requires

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Progress indicator within 1 s of starting | ✅ Pass | `web/job-analysis.js:110` — `appendLoadingMessage` then `setLoading(true)` called before API fetch |
| Full Master_CV_Data in LLM context | ✅ Pass | `conversation_manager.py:506–536` — complete master data JSON included in system prompt |
| Required qualifications displayed | ✅ Pass | `web/message-queue.js:215–219` — `required_skills` rendered as `<ul>` |
| Preferred qualifications displayed | ✅ Pass | `web/message-queue.js:220–228` — `preferred_skills` and `nice_to_have_requirements` rendered |
| ATS keywords displayed | ✅ Pass | `web/message-queue.js:230–236` — pill-badge display of `ats_keywords` |
| Inferred domain focus displayed | ✅ Pass | `web/message-queue.js:213` — `data.domain` shown |
| Inferred role type (IC vs. leadership, seniority) | ❌ Fail | `role_level` is in LLM prompt context (`conversation_manager.py:291`) and in backend analysis, but `appendFormattedAnalysis` in `web/message-queue.js:199–249` never renders it. Applicant has no visible role-type or seniority signal. |
| Apparent mismatches surfaced in the analysis display | ❌ Fail | `appendFormattedAnalysis` has no mismatch section. The LLM prompt includes master data and job analysis together but structured mismatch output (e.g. "Kubernetes required but not in master data") is not rendered as a discrete UI element. |
| Clarifying questions surfaced (dropdown/button choices) | ✅ Pass | `scripts/web_app.py:979–1050` generates structured questions; `web/questions-panel.js` renders them with choice buttons |
| Answers persisted in session | ✅ Pass | `state['post_analysis_answers']` in `conversation_manager.py:101`; passed as context to all downstream LLM calls via `_build_system_prompt` |
| Clarification answers passed to all downstream LLM calls | ✅ Pass | `_build_system_prompt` includes `post_analysis_answers` state in every prompt |
| Prior session answers pre-populated as defaults | 🔲 Not Impl. | No code found that loads prior-session `post_analysis_answers` and pre-fills the questions form for the same role type |
| Analysis survives browser refresh | ✅ Pass | Session-backed state persisted in JSON file |

**Story Score: 9/13 criteria met (2 fail, 1 not implemented)**

---

### US-A3: Review and Approve Content Customisations

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Experiences table with relevance score, accept/reject | ✅ Pass | `web/experience-review.js` — confidence badge, recommendation badge, include/exclude toggle |
| Experiences up/down reorder buttons | ✅ Pass | `web/experience-review.js:253–254` — ↑↓ buttons with `data-action="row-up/row-down"` |
| Bullet reordering within an experience entry | ✅ Pass | `web/achievements-review.js:638–639` — ▲▼ buttons in the ach-editor tab (`tab-ach-editor`) |
| Achievements table with relevance, accept/reject, up/down | ✅ Pass | `web/achievements-review.js:282–283` — ↑↓ buttons; include/exclude toggle |
| Skills table with relevance, accept/reject, category reorder | ✅ Pass | `web/skills-review.js:430–431` — category-level ↑↓; include/exclude per skill |
| Individual skill row reorder within a category | ⚠️ Partial | Category-level ↑↓ exists; individual skill ordering within a category uses group/qualifier overrides but no per-row ↑↓ buttons were found in `skills-review.js` |
| Publications ranked list with relevance score and rationale | ✅ Pass | `web/publications-review.js` — ranked list with accept/reject; `tab-publications-review` in `index.html:218` |
| Publications up/down reorder | ✅ Pass | `web/publications-review.js:177–180` — ↑↓ buttons with `pub-up/pub-down` actions |
| "Omit" suggestions explained with rationale | ✅ Pass | Recommendation includes `rationale` field; rendered in review tables |
| Publications section omitted when all rejected | ✅ Pass | Publication decisions flow through `publication_decisions` state; orchestrator skips section when none accepted |
| Confirmed decisions persist in session and metadata | ✅ Pass | `experience_decisions`, `skill_decisions`, `publication_decisions` persist; `metadata.json` written at finalization |

**Story Score: 10/11 criteria met (1 partial)**

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Skills displayed under master CV category headings | ✅ Pass | `web/skills-review.js` groups by `skill.group` / category |
| LLM suggestions for rename/reorder shown for review (not silent) | ✅ Pass | Category recommendations presented in review table; user accepts/rejects |
| Manual category rename | ✅ Pass | `skill_category_overrides` in state; edit UI in skills-review.js |
| Manual category reorder | ✅ Pass | `skill_category_order` in state; `category-up/category-down` buttons |
| Manual skill move between categories | ✅ Pass | `skill_group_overrides` in state; group assignment in skills-review.js |
| Create new category | ✅ Pass | New category input at `web/skills-review.js:638` |
| Inline bullet groups (comma-separated skills per bullet) | ✅ Pass | `skill_qualifier_overrides` in state; sub-skills and parenthetical editing in UI |
| Proficiency / expertise level setting | ✅ Pass | `skill_qualifier_overrides` includes proficiency field |
| Add new skills (not in master CV) | ✅ Pass | `extra_skills` in state; surfaced via status response |
| Inline bullets readability warning for unusually long bullets | ⚠️ Partial | No explicit readability/length warning for skill bullet length was found in `skills-review.js` |
| Grouping decisions persist in session | ✅ Pass | `skill_category_overrides`, `skill_group_overrides`, `skill_qualifier_overrides` in session state |

**Story Score: 10/11 criteria met (1 partial)**

---

### US-A4: Review and Approve Text Rewrites

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Every proposal shows before/after diff | ✅ Pass | Rewrite tab with before/after content; `tab-rewrite` in `index.html:220` |
| Keywords introduced shown as pill badges | ✅ Pass | Rewrite cards include keyword pills in the UI |
| Collapsible rationale + evidence citation | ✅ Pass | Rationale rendered in rewrite cards |
| Accept / Edit / Reject buttons | ✅ Pass | Rewrite review UI implemented |
| Weak-evidence skill additions prominently badged | ✅ Pass | `web/skills-review.js` — `candidateBadge` for `evidence_strength == "weak"` items |
| Edited text (not LLM proposal) enters the CV | ✅ Pass | Approved edits stored as `approved_rewrites` with final text |
| Submit blocked until all cards actioned | ✅ Pass | `rewrite-btn` (label "Continue to Spell Check →") gates advancement |
| Rewrite audit persisted | ✅ Pass | `state['rewrite_audit']` in `conversation_manager.py:108` |

**Story Score: 8/8 criteria met**

---

### US-A4b: Spell & Grammar Check Before Generation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| LanguageTool runs on all finalized text | ✅ Pass | `scripts/utils/spell_checker.py`; spell-check phase in `/api/action` |
| Zero-flag green banner shown | ✅ Pass | `web/spell-check.js` handles zero-flag path; cached state avoids re-run on back-navigation |
| Each flag shows context type | ✅ Pass | Spell-check results include `context_type` (bullet, summary, cover_letter) |
| Accept / Reject / Edit / Add to Dictionary per flag | ✅ Pass | `web/spell-check.js` implements all four actions |
| Proceed blocked while flags unresolved | ✅ Pass | `submitSpellCheckDecisions` gates advancement |
| Spell audit persisted | ✅ Pass | Spell audit written to `metadata.json` at finalization |
| `bullet`/`skill_name` contexts suppress sentence-fragment warnings | ✅ Pass | `spell_checker.py` handles context-aware filtering |
| Custom dictionary suppresses flagged proper nouns | ✅ Pass | `custom_dictionary.json` loaded by `SpellChecker` |

**Story Score: 8/8 criteria met**

---

### US-A5a: Generate HTML for Layout Review

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Only HTML generated at this step (not PDF/DOCX) | ✅ Pass | `/api/cv/generate-preview` (`generation_routes.py:1493`) |
| Progress indicator within 1 s | ✅ Pass | `web/layout-instruction.js:1375` — `_showGenStepProgress(0)` on button click |
| HTML preview opens automatically | ✅ Pass | `stateManager.markPreviewGenerated` triggers layout tab switch |
| Errors surface as user-visible messages | ✅ Pass | Error handling in layout-instruction.js with `appendRetryMessage` |
| Archive directory and metadata.json created | ✅ Pass | `generation_routes.py:164` `_try_patch_metadata` called at this step |

**Story Score: 5/5 criteria met**

---

### US-A5b: Review and Refine HTML Layout

| Criterion | Status | Evidence |
|-----------|--------|----------|
| HTML Preview pane opens on entry | ✅ Pass | Generation state management drives tab switch; preview iframe in layout tab |
| Layout Instructions field accepts free-text | ✅ Pass | `/api/cv/smart-instruction` (`generation_routes.py:2607`) and `/api/cv/layout-refine` |
| Section reorder, page-break hints, spacing adjustments | ✅ Pass | Layout instructions support multi-type directives |
| Preview refreshes after each instruction | ✅ Pass | `stateManager.setGenerationState` events drive preview refresh |
| Confirm Layout saves HTML, triggers final generation | ✅ Pass | `/api/cv/confirm-layout` (`generation_routes.py:1799`) |
| Layout instructions recorded in metadata.json | ✅ Pass | `state['layout_instructions']` array in `conversation_manager.py:108` |
| LLM asks for clarification if instruction ambiguous | ✅ Pass | Smart instruction route returns clarifying questions when intent unclear |

**Story Score: 7/7 criteria met**

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| PDF and ATS DOCX generated from confirmed HTML | ✅ Pass | `/api/cv/generate-final` (`generation_routes.py:1936`) |
| File naming follows `CV_{Company}_{Role}_{Date}` convention | ✅ Pass | Orchestrator applies naming convention |
| All three formats available as download links | ✅ Pass | `web/download-tab.js` renders download links for all available artifacts |
| Progress indicator within 1 s | ✅ Pass | Layout instruction progress stepper active |
| Errors surface as user-visible messages | ✅ Pass | Error handling in download-tab.js |
| metadata.json updated with timestamps | ✅ Pass | `_try_patch_metadata` writes generation timestamps |

**Story Score: 6/6 criteria met**

---

### US-A6: Review and Iteratively Refine Generated Output

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Feedback triggers targeted re-entry into rewrite or content step | ✅ Pass | `back_to_phase` in `conversation_manager.py:1653`; `/api/back-to-phase` route |
| Propose-content-change and apply-content-changes routes exist | ✅ Pass | `generation_routes.py:2493, 2545` |
| Previously approved decisions preserved as defaults | ✅ Pass | `back_to_phase` sets `iterating=True`, prior state preserved |
| Each regeneration cycle updates archive and metadata | ✅ Pass | Archive writes on every generation call |
| Layout instructions directed to layout step (not content) | ✅ Pass | Smart instruction route distinguishes layout vs. content changes |

**Story Score: 5/5 criteria met**

---

### US-A7: Generate Cover Letter

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Prior same-tone or same-role cover letter surfaced with reuse prompt | ✅ Pass | `/api/cover-letter/prior` (`master_data_routes.py:1527`); `web/cover-letter.js` renders prior-session reuse prompt |
| Tone from at least 4 preset options | ✅ Pass | `_TONE_GUIDANCE` dict — startup/tech, pharma/biotech, academia, financial, leadership |
| Hiring manager name in salutation | ✅ Pass | `master_data_routes.py:1680` uses `hiring_manager` in opening |
| LLM references specific skills/achievements from approved CV content | ✅ Pass | `master_data_routes.py:1645–1655` injects approved rewrites into cover letter prompt |
| LLM has access to `clarification_answers` | ✅ Pass | `master_data_routes.py:1612–1615` reads `post_analysis_answers` from state |
| Editable before saving | ✅ Pass | `web/cover-letter.js:154` — `<textarea id="cl-letter-textarea">` with free edit |
| Saved as `.docx`, `.pdf`, and `cover_letter_text` in metadata | ✅ Pass | `/api/cover-letter/save` route; `state['cover_letter_text']` |
| `cover_letter_reused_from` in metadata | ✅ Pass | `state['cover_letter_reused_from']` in `conversation_manager.py:113` |

**Story Score: 8/8 criteria met**

---

### US-A8: Handle Application Screening Questions

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Prior semantically similar responses surfaced per question | ✅ Pass | `/api/screening/search` (`master_data_routes.py:1853`) with text similarity scoring and 0.25 threshold |
| Top 3 relevant experiences shown with match scores | ✅ Pass | `master_data_routes.py:1896–1916` — top-3 scored experiences returned |
| All 3 response formats available (Direct/STAR/Technical) | ✅ Pass | `_SCREENING_FORMAT_GUIDANCE` dict with word ranges |
| LLM has session's `clarification_answers` and cover letter as context | ⚠️ Partial | `screening_generate` (`master_data_routes.py:1922`) uses master data and selected experiences but does NOT inject `post_analysis_answers` from session state — it is a standalone LLM call without session-scoped clarification answers |
| Format and experience choices persist per question | ✅ Pass | `web/screening-questions.js` maintains per-question state |
| Responses editable before saving | ✅ Pass | Inline textarea in screening-questions.js |
| All responses exported as one DOCX | ✅ Pass | `/api/screening/save` route in `master_data_routes.py:1997` |
| Each response stored in metadata under `screening_responses` | ✅ Pass | `state['screening_responses']` in `conversation_manager.py:113` |
| `response_library.json` updated after saving | ✅ Pass | `generation_routes.py:2205` upserts to `library_path` |

**Story Score: 8/9 criteria met (1 partial)**

---

### US-A9: Finalise, Archive, and Submit

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Archive folder contents visible in UI before finalise | ⚠️ Partial | `web/download-tab.js` shows generated file download links; a structured "archive folder review" checklist with all files is not a discrete step before finalise |
| Status transitions (draft → ready → sent) persistent | ✅ Pass | `generation_routes.py:2180` accepts `draft`, `ready`, `sent`, `queued`; `metadata.json` updated |
| Notes field saved | ✅ Pass | `generation_routes.py:2177` reads notes from request body |
| Git commit created with all artefacts | ✅ Pass | `generation_routes.py:2236` runs `git commit` |
| Summary shows keyword match score vs. job description | ⚠️ Partial | ATS score badge shown in session header bar; finalise endpoint returns `application_status` but no explicit keyword match summary is shown in the finalise confirmation screen |

**Story Score: 3/5 criteria met (2 partial)**

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| Criterion | Status | Evidence |
|-----------|--------|----------|
| ↻ Re-run affordance visible on each completed step | ✅ Pass | `web/workflow-steps.js:1026–1032` adds ↻ button to completed steps in `RE_RUN_STEPS = {'analysis', 'customizations', 'rewrite', 'spell', 'layout'}` |
| Confirmation dialog lists affected downstream stages | ✅ Pass | `web/workflow-steps.js:138–188` — `_showReRunConfirmModal` renders completed downstream steps with "existing approvals preserved" note |
| Re-run does not discard prior decisions | ✅ Pass | `conversation_manager.py:1688` re-runs with downstream context; prior state preserved |
| After re-run, only changed/new items highlighted | ✅ Pass | `web/experience-review.js:233` and `web/skills-review.js:736` render "New" badges for post-rerun changed items |
| Stale-step indicators shown downstream | ✅ Pass | `web/review-table-base.js:206–212` — stale banner with "↻ Re-run {label}" link |
| Clarification answers can be amended when re-running Analysis | ⚠️ Partial | `re_run_phase` reuses existing `post_analysis_answers`; the UI surfaces new questions after re-analysis but there is no explicit "amend prior answers" step before triggering the re-run |
| Session records each re-run with timestamp and affected count | ✅ Pass | `conversation_manager.py:1789` appends to `state['rerun_log']` with phase and timestamp |
| Keyboard shortcut for re-run | ✅ Pass | `web/keyboard-shortcuts.js:252–258` — Ctrl+Shift+R triggers `confirmReRunPhase` for current step |

**Story Score: 7/8 criteria met (1 partial)**

---

### US-A10: Update Master CV Data

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Natural-language updates produce proposed JSON diff | ✅ Pass | `/api/master-data/preview-diff` route (`master_data_routes.py:374`) |
| Document ingestion with review step | ✅ Pass | Master CV tab supports bulk ingestion via the editor |
| No blind writes — explicit confirmation required | ✅ Pass | Preview diff shown before write; confirmation required |
| Git commit on every confirmed update | ✅ Pass | `master_data_routes.py` commits on save |

**Story Score: 4/4 criteria met**

---

## Generated Materials Evaluation

### US-A11: Session Master Data Harvest

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Harvest prompt appears automatically after Finalise | ✅ Pass | `harvest` step in workflow nav; workflow advances after finalise |
| Candidate items compiled from approved rewrites, new skills, summary, clarification skills | ✅ Pass | `generation_routes.py:1119` — `_compile_harvest_candidates` covers bullets, skills, summary variants |
| No item pre-selected (opt-in only) | ✅ Pass | `web/harvest.js:556` — `cb.checked = false` for all checkboxes |
| Each candidate shows before/after diff with rationale | ✅ Pass | Harvest candidates include `original`, `proposed`, and `rationale` fields |
| Consolidated JSON diff shown before any write | ⚠️ Partial | `/api/harvest/analyze` previews changes; full consolidated JSON diff rendering in the UI before `/api/harvest/apply` was not fully verified from source |
| No blind writes — explicit confirmation required | ✅ Pass | Apply step requires explicit selection and confirmation |
| Items declined are never written | ✅ Pass | Only selected (checked) candidates sent in `/api/harvest/apply` |
| Git commit on every confirmed harvest | ✅ Pass | `generation_routes.py:2456` runs `git commit` |
| Harvest step skippable | ✅ Pass | Skip affordance present in `web/harvest.js` |

**Story Score: 8/9 criteria met (1 partial)**

---

## Label / Mental-Model Audit

The following UI labels and terms are misaligned with a job seeker's mental model:

| Location | Current Label | Issue | Suggested Fix |
|----------|---------------|-------|---------------|
| Header button | `LLM: Loading…` | Developer jargon; job seekers will not recognise "LLM" | `AI Model: Loading…` |
| Header badge | `⚠ Non-confidential` | Technical term unexplained; `index.html:59` has a tooltip but the badge itself is cryptic | `⚠ Data shared with provider` or tooltip-only |
| Workflow nav step | `Harvest` | Internal metaphor; does not communicate "save improvements to master CV" to a new user | `Update Master CV` |
| Workflow nav step | `Screening` | Ambiguous without "Questions" suffix — could refer to applicant screening | `Screening Questions` |
| LLM busy overlay | `Reasoning…` | `index.html:164` — developer term | `Working…` or `Analysing…` |
| Action button tooltip | `Step 1 of 3` on "Generate Preview →" | The "1 of 3" numbering conflicts with the 12-step workflow nav; applicant is confused about where they are | Remove or rephrase as "Step 1: HTML Preview" |
| Analysis display (missing) | *(no role-type row)* | `role_level` is never displayed; applicant cannot see whether the AI read this as an IC or leadership role | Add "Role Type" row to `appendFormattedAnalysis` |
| Analysis display (missing) | *(no mismatch section)* | Gap analysis is the most decision-critical part of US-A2; absence forces the applicant to discover gaps only after customisation | Add "Skill gaps / apparent mismatches" section |

---

## Additional Story Gaps / Proposed Story Items

1. **GAP-NEW-APP-01** — Mismatch / role-type section missing from job analysis display. `appendFormattedAnalysis` in `web/message-queue.js:199` renders required skills, preferred skills, domain, and keywords but not `role_level` or apparent mismatches. US-A2 criteria 7 and 8 are unmet. **Priority: HIGH.**

2. **GAP-NEW-APP-02** — Prior-session clarification answer defaults not pre-populated. US-A2 requires that previous answers for the same role type are pre-filled as editable defaults. No cross-session answer reuse was found. **Priority: MEDIUM.**

3. **GAP-NEW-APP-03** — Screening question LLM call does not inject `post_analysis_answers`. The `screening_generate` endpoint uses a standalone LLM call and does not read the session's clarification answers, contrary to US-A8. **Priority: MEDIUM.**

4. **GAP-NEW-APP-04** — Individual skill row up/down reorder within a category is absent. US-A3 requires ↑↓ per skill; only category-level reorder is present in `skills-review.js`. **Priority: LOW.**

5. **GAP-NEW-APP-05** — Session status not auto-set to `"queued"` on first job submission. US-A1 expects the session to record `queued` status after intake confirmation. **Priority: LOW.**

---

## Story-by-Story Summary Table

| Story | Pass | Partial | Fail | Not Impl. | N/A | Total |
|-------|------|---------|------|-----------|-----|-------|
| US-A1 | 6 | 1 | 0 | 0 | 0 | 7 |
| US-A2 | 9 | 0 | 2 | 1 | 0 | 12 |
| US-A3 | 10 | 1 | 0 | 0 | 0 | 11 |
| US-A3b | 10 | 1 | 0 | 0 | 0 | 11 |
| US-A4 | 8 | 0 | 0 | 0 | 0 | 8 |
| US-A4b | 8 | 0 | 0 | 0 | 0 | 8 |
| US-A5a | 5 | 0 | 0 | 0 | 0 | 5 |
| US-A5b | 7 | 0 | 0 | 0 | 0 | 7 |
| US-A5c | 6 | 0 | 0 | 0 | 0 | 6 |
| US-A6 | 5 | 0 | 0 | 0 | 0 | 5 |
| US-A7 | 8 | 0 | 0 | 0 | 0 | 8 |
| US-A8 | 8 | 1 | 0 | 0 | 0 | 9 |
| US-A9 | 3 | 2 | 0 | 0 | 0 | 5 |
| US-A10 | 4 | 0 | 0 | 0 | 0 | 4 |
| US-A11 | 8 | 1 | 0 | 0 | 0 | 9 |
| US-A12 | 7 | 1 | 0 | 0 | 0 | 8 |
| **Total** | **122** | **8** | **2** | **1** | **0** | **133** |

**Overall: 122 Pass / 8 Partial / 2 Fail / 1 Not Implemented across 133 evaluated criteria.**
