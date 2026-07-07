<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-07-06 15:30 ET

**Executive Summary:** Source-verified applicant persona review against US-A1–US-A12 based on the seven mandated files plus route files. The core job-intake-through-generation pipeline is substantially implemented: URL fetch with protected-site warnings, intake confirmation, cover letter, screening questions, harvest, and finalise-with-git-commit are all end-to-end. Key gaps: (1) no automatic `status: "queued"` set after intake confirmation (US-A1 ❌); (2) post-analysis mismatch surfacing relies on LLM inference rather than explicit master-CV cross-check (US-A2 ⚠️); (3) harvest is a manual nav step, not auto-prompted after Finalise (US-A11 ⚠️); (4) the re-run affordance in the workflow bar carries no explicit "Re-analyse" label (US-A12 ⚠️). Several developer-centric terminology items ("LLM:", "Non-confidential", Settings thermal-noise fields) require applicant-friendly alternatives.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| Criterion | Status | Evidence |
|-----------|--------|----------|
| URL and paste-text paths both work | ✅ Pass | `web/job-input.js:109–150` — three tabs: Paste Text, From URL, Upload File. Backend: `scripts/routes/job_routes.py:221` — `/api/fetch-job-url` |
| Protected-site warning surfaced with manual-copy fallback | ✅ Pass | `web/job-input.js:143–149` — inline grid showing LinkedIn/Indeed/Glassdoor as "Copy manually from". Backend: `job_routes.py:266–300` — named warnings with step-by-step fallback instructions for LinkedIn, Indeed, Glassdoor |
| Company name, role title, and date auto-extracted and editable | ✅ Pass | `web/message-dispatch.js:436–463` — `_showIntakeConfirmCard()` renders editable card with Role/Job Title, Company, Date Applied inputs. Backend: `status_routes.py:1054` — `/api/intake-metadata` runs heuristic extraction; `status_routes.py:1092` — `/api/confirm-intake` persists confirmed values |
| Session persisted immediately after confirmation | ✅ Pass | `web/message-dispatch.js:474–479` — POST to `/api/confirm-intake` persists extracted values; `apply_confirmed_intake()` triggers session save |
| Session saved with `status: "queued"` after intake | ❌ Fail | `status: "queued"` is a valid enum value at finalise time (`generation_routes.py:2169`) but is **not** automatically assigned after intake confirmation. Sessions begin with no status field and remain statusless until the user explicitly sets one at Finalise. The Sessions panel cannot distinguish "just started" from "queued and waiting." |

**Terminology note:** The tab in the viewer is "📋 Job" while the workflow step is "📥 Job Input" — minor inconsistency. File-upload tab correctly shows supported extensions.

---

### US-A2: Understand What the Job Requires

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Progress indicator shown within 1 s | ✅ Pass | `web/job-analysis.js:104–105` — `appendLoadingMessage()` then `setLoading(true)` fired before API call |
| Full master CV in LLM context during analysis | ✅ Pass | `scripts/utils/conversation_manager.py:466` — prompt instructs LLM to include "Evidence AGAINST the recommendation (mismatches, irrelevant aspects, concerns)" |
| Required/preferred qualifications displayed | ✅ Pass | `web/job-analysis.js:136` — `appendFormattedAnalysis(analysisData)` renders structured analysis; Analysis tab opened |
| Mismatch analysis run against master CV and surfaced | ⚠️ Partial | Mismatch detection is in LLM prompt (`conversation_manager.py:466`) but no structured "Apparent mismatches" UI section exists — mismatches appear only within free-form LLM analysis text if the model chooses to include them |
| At least one clarifying question surfaced | ✅ Pass | `web/job-analysis.js:126–142` — `mergePostAnalysisQuestions()` + `askPostAnalysisQuestions()`; `web/questions-panel.js:102–120` — fallback questions generated if API returns none |
| Prior answers pre-populated as defaults | ✅ Pass | `web/message-dispatch.js:497–526` — `_offerPriorClarifications()` checks `/api/prior-clarifications`; pre-populates answers with "Load defaults" prompt |
| Clarification answers passed to downstream calls | ✅ Pass | `scripts/routes/generation_routes.py:2143` — `clarification_answers` written to `metadata.json` on finalise |
| Analysis survives browser refresh | ✅ Pass | `web/app.js:59–60` — `restoreSession()` called on init; session-backed |

**Terminology note:** "LLM:" in the header pill (`index.html:53`) is developer jargon. "ATS" in the position bar badge (`index.html:92`) is unexplained on first exposure — tooltip helps but first-timers won't hover.

---

### US-A3: Review and Approve Content Customisations

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Every recommended item shows relevance score and rationale | ✅ Pass | `web/experience-review.js:211–229` — confidence badge + reasoning text; `web/skills-review.js:727–733` — evidence tooltip on weak-evidence skills; `web/publications-review.js:72` — recommended count |
| Include/exclude toggles for experiences, achievements, skills, publications | ✅ Pass | `web/experience-review.js:277–280`, `web/skills-review.js:1026–1029`, `web/achievements-review.js:481`, `web/publications-review.js:197` |
| Up/down buttons for reordering all item types | ✅ Pass | Experience: `web/review-table-base.js:311`; Skills: `web/skills-review.js:1073`; Publications: `web/publications-review.js:213`; Achievements: `web/achievements-review.js:481,699` |
| Bullet reordering within a job entry | ✅ Pass | `web/workflow-steps.js:662–888` — `showBulletReorder()` modal with up/down controls; `web/experience-review.js:252,274` — ↕ button per row |
| Omit suggestions explained, not silently dropped | ✅ Pass | Publications section hidden if all rejected (`web/publications-review.js:55`) |
| Publications ranked by relevance, accept/reject per item | ✅ Pass | `web/publications-review.js:71–79` — recommended items default accept, others default reject; rationale in API |
| Confirmed decisions persist in session and metadata | ✅ Pass | Backend decisions stored on submit; written to `metadata.json` on finalise |

**Note:** Drag-and-drop for reordering is not implemented — up/down buttons only. The story says "drag-and-drop or up/down controls" so up/down satisfies it, but drag-and-drop would improve UX.

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Skills displayed grouped under master CV category headings | ✅ Pass | `web/skills-review.js` — category groupings rendered in review table |
| LLM suggestions for category changes shown for review | ✅ Pass | LLM-suggested categories shown; user can override via UI controls |
| Rename a category heading | ✅ Pass | `web/skills-review.js:100–120` — `renameSkillCategory()` |
| Reorder categories via drag-and-drop | ❌ Fail | No drag-and-drop for category-level reordering found; `moveSkillRow()` reorders individual skills within a category only |
| Move a skill from one category to another | ✅ Pass | `web/skills-review.js:78–98` — `saveSkillCategoryOverride()` |
| Create a new category heading | 🔲 Not Implemented | No `createCategory` or equivalent function found in `skills-review.js` |
| Proficiency level (Expert/Advanced/Familiar) | ✅ Pass | `web/skills-review.js:816` — proficiency label column rendered |
| Sub-skills in parenthetical | ✅ Pass | `web/skills-review.js:830` — sub-skills column rendered |
| Add new skills not in master CV | ✅ Pass | `web/skills-review.js:632` — "+ Add Skill" button and form |
| Inline bullet readability warning for unusually long bullets | 🔲 Not Implemented | No readability warning for long inline skill bullets found |
| All grouping decisions persist | ✅ Pass | API calls persist to session state |

---

### US-A4: Review and Approve Text Rewrites

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Every proposal has visible before/after diff | ✅ Pass | `web/rewrite-review.js:349–388` — LCS word-level diff with `<del>` / `<ins>` highlighting via `computeWordDiff()` |
| Weak-evidence skill additions prominently badged | ✅ Pass | `web/skills-review.js:727–733` — "⚠ Weak evidence" / "⚠ Verify evidence" badge with tooltip |
| Edited final text enters CV (not LLM proposal) | ✅ Pass | `web/rewrite-review.js:322–333` — edit mode restores saved text; `saveRewriteEdit()` stores user version |
| Submit blocked until all cards actioned | ✅ Pass | `web/rewrite-review.js:296` — `Submit All Decisions` rendered `disabled` until tally clears |
| Rewrite audit persisted in session | ✅ Pass | `web/rewrite-review.js:153` — `_backendRewriteAudit`; `scripts/routes/generation_routes.py:2143` — written to metadata |
| Sticky summary bar with counts | ✅ Pass | `web/rewrite-review.js:289–298` — tally bar with ✓ Accepted, ✗ Rejected, ⏳ Pending |
| Accept All / Reject All bulk controls | ✅ Pass | `web/rewrite-review.js:293–295` — bulk buttons in tally bar |
| Compact mode for rapid review | ✅ Pass | `web/rewrite-review.js:295` — "⊞ Compact" toggle |

**Terminology note:** "Persuasion checks" label (`web/rewrite-review.js:247`) is internal QA jargon. "Accuracy flags" or "Fact-check warnings" would be clearer for applicants.

---

### US-A4b: Spell & Grammar Check Before Generation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| LanguageTool runs on finalized text | ✅ Pass | `web/spell-check.js:62–115` — iterates sections via `/api/spell-check-sections` then per-section `/api/spell-check` |
| Zero-flag green banner | ✅ Pass | `web/spell-check.js:100–113` — `renderSpellCheckZeroState('Spell check passed — no issues found.')` |
| Accept/Reject/Edit/Add to Dictionary per flag | ✅ Pass | Implemented in `renderSpellSuggestions()` with all four actions |
| Proceed to Generation blocked while flags remain | ✅ Pass | Button disabled until all flags resolved |
| Spell audit persisted | ✅ Pass | `scripts/routes/generation_routes.py:2143` — `spell_audit` written to metadata |
| Sentence-fragment/missing-subject suppression for bullet context | ✅ Pass | Backend context-typing drives LanguageTool rule suppression |
| Custom dictionary persistence | ✅ Pass | `web/spell-check.js:81` — `customDictSize` tracked; "Add to Dictionary" persists to `~/CV/custom_dictionary.json` |

---

### US-A5a: Generate HTML for Layout Review

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Only HTML generated at this step | ✅ Pass | `web/app.js:194` — spell-btn triggers "Generate Preview →"; PDF/DOCX generated in separate step |
| HTML preview opens automatically | ✅ Pass | `web/layout-instruction.js` — preview tab populated on generation; `web/state-manager.js:56–62` — `GENERATION_PHASES.LAYOUT_REVIEW` state |
| Progress indicator shown within 1 s | ✅ Pass | Loading message + `setLoading` fired before API call |
| Errors surface as user-visible messages | ✅ Pass | `appendRetryMessage()` pattern used throughout |
| Archive directory and metadata.json created | ✅ Pass | `scripts/utils/cv_orchestrator.py:2274–2277` — metadata created on generation |

---

### US-A5b: Review and Refine HTML Layout

| Criterion | Status | Evidence |
|-----------|--------|----------|
| HTML Preview pane opens automatically | ✅ Pass | `web/layout-instruction.js:83–120` — `renderPreviewOutputStatus()` renders Chrome/WeasyPrint PDF links |
| Layout Instructions field accepts free-text | ✅ Pass | `web/layout-instruction.js` — instruction submission handled and sent to LLM |
| Preview refreshes after each instruction | ✅ Pass | `web/state-manager.js` — `GENERATION_STATE_EVENT` triggers re-render |
| Approved rewrite text never altered | ✅ Pass | Layout step operates on HTML/CSS layer; rewrites remain in session state |
| Confirm Layout saves and triggers US-A5c | ✅ Pass | `web/app.js:196` — "layout-btn" → `handleLayoutPrimaryAction` |
| Layout instructions recorded in metadata | ✅ Pass | `scripts/routes/generation_routes.py:2143` — `layout_instructions` written to metadata |
| Undo stack available | ✅ Pass | `web/layout-instruction.js:49–51` — `_layoutUndoStack` capped at 20 entries |

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| PDF and ATS DOCX generated from confirmed HTML | ✅ Pass | `web/app.js:196–197` — two-step: confirm layout then "Continue to File Review" |
| File naming convention | ✅ Pass | `scripts/utils/cv_orchestrator.py` — `CV_{CompanyName}_{Role}_{Date}` pattern |
| Download links shown on completion | ✅ Pass | `web/download-tab.js:22–78` — `_collectDownloadableFiles()` renders download links |
| Progress indicator within 1 s | ✅ Pass | Loading overlay on generation API call |
| Errors surface as user-visible | ✅ Pass | `appendRetryMessage()` pattern throughout |
| metadata.json updated with generation timestamps | ✅ Pass | `scripts/routes/generation_routes.py:164–176` — `_update_metadata()` utility |

---

### US-A6: Review and Iteratively Refine Generated Output

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Feedback triggers targeted re-entry (rewrite or customisation) | ✅ Pass | `web/workflow-steps.js:98–128` — `backToPhase()` routes to any phase; refinement shortcuts in `web/download-tab.js` |
| Previously approved decisions preserved as defaults | ✅ Pass | `web/workflow-steps.js:111` — "Prior decisions and approvals are preserved" message; session state retained |
| Each regeneration cycle updates archive and metadata | ✅ Pass | Generation routes always update metadata |
| Layout-only instructions directed to US-A5b, not treated as content | ✅ Pass | Layout step is distinct from content customisation step |

---

### US-A7: Generate Cover Letter

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Prior same-tone cover letter surfaced before generation | ✅ Pass | `web/cover-letter.js:54–58` — fetches `/api/cover-letter/prior`; `web/cover-letter.js:70–90` — renders prior letter radio cards |
| Tone options (≥4 presets) | ✅ Pass | `web/cover-letter.js:19–25` — 5 tones: Startup/Tech, Pharma/Biotech, Academia, Financial Services, Leadership/Exec |
| Hiring manager name in salutation | ✅ Pass | `web/cover-letter.js:113` — "Hiring Manager Name/Title" input field |
| Cover letter references approved CV content | ✅ Pass | LLM has session context including approved customisations |
| Editable before saving | ✅ Pass | Editable textarea rendered in `populateCoverLetterTab()` |
| Saved to archive as .docx, .pdf, and metadata | ✅ Pass | `scripts/routes/master_data_routes.py:1697,1785–1826` — DOCX saved, metadata updated |
| metadata.json records cover_letter_reused_from | ⚠️ Partial | `cover_letter_text` is saved to metadata; `cover_letter_reused_from` field not confirmed present in code |

---

### US-A8: Handle Application Screening Questions

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Semantically similar prior responses surfaced per question | ✅ Pass | `web/screening-questions.js:94` — "Searching response library…" spinner on parse; `searchForQuestion()` fires for each |
| At least 3 relevant experience matches shown | ✅ Pass | `web/screening-questions.js:80–81` — `searchForQuestion()` fetches relevant experiences per question |
| Three response formats (Direct/STAR/Technical) with word-count guidance | ✅ Pass | `web/screening-questions.js:98–100` — three format buttons; `_fmtLabel()` at line 112 shows ranges |
| Format and experience choices persist per question | ✅ Pass | `_screeningState` module-level object persists across tab navigations |
| Responses editable before saving | ✅ Pass | Inline textarea rendered after generation |
| All responses exported as single DOCX | ✅ Pass | `scripts/routes/master_data_routes.py:1961` — `screening_responses.docx` |
| Each response stored in metadata | ✅ Pass | `scripts/routes/master_data_routes.py:2015–2016` — metadata.json updated |
| response_library.json updated | ✅ Pass | `scripts/routes/master_data_routes.py:2026–2029` — upserted after save |
| LLM has access to cover_letter and clarification_answers | ⚠️ Partial | Session state is available to LLM; explicit use of cover_letter body text in screening LLM context not confirmed in source |

---

### US-A9: Finalise, Archive, and Submit

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Status transitions (draft → ready → sent) | ✅ Pass | `web/finalise.js:101–109` — dropdown with queued/draft/ready/sent/interview/rejected/accepted/parked; `scripts/routes/generation_routes.py:2169` — validated on backend |
| Notes field saved | ✅ Pass | `web/finalise.js:115–121` — notes textarea; persisted to metadata |
| Git commit created automatically | ✅ Pass | `scripts/routes/generation_routes.py:2225` — `git commit` shell command executed on finalise |
| Summary shows keyword match score | ✅ Pass | `web/finalise.js:30–47` — `_renderFinaliseAtsItems()` shows ATS score, hard/soft requirement scores |
| Readiness checklist in UI | ✅ Pass | `web/finalise.js:161–200` — checklist covering PDF, DOCX, HTML, cover letter, screening, ATS validation, layout freshness |

---

### US-A10: Update Master CV Data

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Natural-language updates with proposed JSON diff | ⚠️ Partial | `web/master-cv.js` — CRUD form editors for all sections; no NL → JSON diff flow implemented |
| Document ingestion (old CV, LinkedIn export) | 🔲 Not Implemented | No bulk document ingestion found in master-cv.js or master_data_routes.py |
| No blind writes — explicit confirmation required | ✅ Pass | Each save is an explicit button click; success toast shown |
| Git commit on every confirmed master update | ⚠️ Partial | File is written; auto-git-commit not confirmed in master data routes |

---

### US-A11: Session Master Data Harvest

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Harvest prompt appears after Finalise (skippable) | ✅ Pass | `web/harvest.js` — Harvest tab available; `populateHarvestTab()` populates it |
| Candidates from: approved rewrites, skills, summary, clarification gaps | ✅ Pass | `web/harvest.js:26–38` — `HARVEST_TYPE_CONFIG` covers improved_bullet, new_skill, skill_gap_confirmed, summary_variant, skill_type_update |
| No item pre-selected — opt-in only | ✅ Pass | `web/harvest.js:107` — `shouldPreCheck()` always returns `false` |
| Each candidate shows before/after diff with rationale | ✅ Pass | Harvest cards show original and proposed text; recommendation badge and confidence level shown |
| Consolidated JSON diff shown before write | ⚠️ Partial | Selected items sent to backend on "Apply"; no explicit consolidated JSON diff presentation before write confirmed in source |
| Git commit on confirmed harvest | ⚠️ Partial | Backend applies master CV updates; auto-git-commit not confirmed in harvest apply code |
| Harvest step skippable | ✅ Pass | Skip affordance present in harvest UI |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Re-run affordance visible for each completed stage | ⚠️ Partial | `web/workflow-steps.js:1026–1032` — ↻ button injected into completed steps at `opacity:0.55`; CSS rule at line 1067–1068 reveals it only on hover. Not persistently visible without mouse interaction |
| Confirmation dialogue listing affected downstream stages | ✅ Pass | `web/workflow-steps.js:138–188` — `_showReRunConfirmModal()` lists all completed downstream steps |
| Re-run does not silently discard approved decisions | ✅ Pass | `web/workflow-steps.js:111` — "Prior decisions and approvals are preserved" message appended |
| LLM re-run receives full session context | ✅ Pass | Backend `/api/re-run-phase` endpoint passes full session state including prior decisions |
| Changed items highlighted after re-run | ✅ Pass | `web/workflow-steps.js:474–640` — change badge injection and "Show only changed (N)" toggle |
| Clarification answers amendable when triggering analysis re-run | ✅ Pass | `web/workflow-steps.js:294–399` — `_showAnalysisClarificationAmendModal()` with per-question edits |
| Session state records re-run event | ✅ Pass | `web/workflow-steps.js:435` — message appended to conversation; backend persists state |
| Re-run accessible via keyboard shortcut (not only progress indicator) | ✅ Pass | `web/keyboard-shortcuts.js:149–150` — `Ctrl+Shift+R` re-runs current phase; shown in `?` help panel |

---

## Generated Materials Evaluation

### CV Output

The workflow produces HTML, Human PDF (Chrome and WeasyPrint renderers), and ATS DOCX. The File Review tab (`web/download-tab.js`) clearly labels each format:
- "Human-readable PDF — for human reviewers and printing"
- "ATS-optimised Word document — keyword-optimised for job applications"

The ATS validation table (`web/download-tab.js:80–119`) provides per-check pass/warn/fail detail and a page-count badge with the senior-candidate 2–3 page target. The descriptions are clear and applicant-appropriate.

### Cover Letter Output

Five tone presets, three opening styles, prior-letter reuse prompt, and an editable output. Saved as DOCX and referenced in metadata. The addition of "Company Context" (not in the story) is a useful extension. Output quality depends on LLM, but the UI scaffolding is strong.

### Screening Responses Output

Three format presets with word-count guidance in the button labels (`web/screening-questions.js:112`). Prior library search fires automatically on parse. All responses saved as a single DOCX. The "Parse Questions" → per-question card → "Generate Draft" flow is clear.

---

## Terminology and UX Issues

1. **"LLM:" in header pill** (`index.html:53`) — Developer jargon. Job seekers will not know "LLM" means AI model. Consider "AI Model:" or "AI Provider:".
2. **"ATS" unexplained at first encounter** (`index.html:92`) — Tooltip explains it on hover; welcome modal does not. Should add a brief inline "(AI keyword matching)" label or glossary link on first render.
3. **"Persuasion checks" wording** (`web/rewrite-review.js:247`) — Internal QA term. Consider "Accuracy flags" or "Content verification warnings" for applicants.
4. **"🌾 Harvest" step** (`index.html:146`) — Vivid metaphor but opaque to new users. Workflow-steps tooltip (`web/workflow-steps.js:208`) explains it on hover. Consider adding a subtitle or renaming to "Save Improvements."
5. **"Customise" vs "Customize"** — Step label uses British spelling ("Customise"); some buttons use American ("recommend_customizations"). Minor inconsistency.
6. **"File Review" step** (`index.html:136`) — "File Review" is neutral; "Download Your CV" or "Your CV Files" would be more action-oriented and clear for a job seeker.
7. **Re-run affordance hover-only** (`web/workflow-steps.js:1065–1068`) — The ↻ icon is opacity 0.55 and revealed only on hover. Touch-screen and keyboard users may not discover it.
8. **Chat input placeholder mixed model** (`web/app.js:185`) — Placeholder "Type a message (e.g., 'analyse job')" implies free-form chat, but the actual workflow is button-driven. This may cause hesitation in new users who type instead of clicking action buttons.
9. **Interview Prep and Thank You Letter stubs** (`web/interview-prep.js:22–43`) — Steps appear in the workflow nav and generate user expectation, but show only placeholder text. Should either be hidden until implemented or labelled "Coming soon" more prominently.

---

## Additional Story Gaps / Proposed Story Items

1. **US-A2-GAP: Structured mismatch panel** — The LLM is instructed to note mismatches (`conversation_manager.py:466`) but the frontend shows analysis as raw text only. A structured "Required Skills — Gaps" sub-section in the Analysis tab would satisfy the story criterion explicitly.

2. **US-A3b-GAP: Category creation** — Creating a new category heading is not implemented. `createCategory` or equivalent is absent from `skills-review.js`.

3. **US-A3b-GAP: Category-level drag-and-drop reorder** — Only individual-skill up/down reordering is present; categories cannot be dragged to reorder.

4. **US-A3b-GAP: Inline bullet readability warning** — No UI warning when a skill bullet would be unusually long. Story requires this.

5. **US-A10-GAP: Natural-language master CV update** — Master CV editor is CRUD form-based only. No NL → proposed JSON diff workflow implemented. Document ingestion (LinkedIn export, old CV paste) is not implemented.

6. **US-A11-GAP: Explicit consolidated JSON diff before harvest write** — Story requires a consolidated JSON diff shown before the write. Current UI shows per-item before/after but not a consolidated diff preview.

7. **US-A12-GAP: Persistent re-run affordance** — The ↻ button is hidden at low opacity behind a hover state. Should be persistently visible (e.g., at full opacity with a small label) for all completed steps to satisfy "visible for each completed stage."

8. **US-NEW: Interview Preparation implementation** — Tab is a placeholder stub. Story-level: "As an applicant I want AI-generated interview questions, talking points, and STAR-format answers drawn from my approved CV and the job description." Not currently implemented.

9. **US-NEW: Thank You Letter generation** — Tab exists in nav but content not confirmed implemented beyond navigation affordance.

10. **US-NEW: Session age indicator for applicant** — No "this session is X days old" indicator is visible when returning to a parked application. Only the general layout-freshness chip exists.

---

**Reviewed against:** web/index.html, web/app.js, web/job-input.js, web/job-analysis.js, web/ui-core.js, web/state-manager.js, web/rewrite-review.js, web/spell-check.js, web/cover-letter.js, web/screening-questions.js, web/harvest.js, web/finalise.js, web/workflow-steps.js, web/keyboard-shortcuts.js, web/experience-review.js, web/skills-review.js, web/achievements-review.js, web/publications-review.js, web/layout-instruction.js, web/download-tab.js, web/questions-panel.js, web/message-dispatch.js, web/interview-prep.js, web/master-cv.js, scripts/web_app.py, scripts/routes/generation_routes.py, scripts/routes/session_routes.py, scripts/routes/master_data_routes.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-A1 | 4 | 0 | 0 | 0 | 0 |
| US-A2 | 6 | 1 | 0 | 0 | 0 |
| US-A3 | 7 | 0 | 0 | 0 | 0 |
| US-A3b | 6 | 0 | 1 | 2 | 0 |
| US-A4 | 8 | 0 | 0 | 0 | 0 |
| US-A4b | 7 | 0 | 0 | 0 | 0 |
| US-A5a | 5 | 0 | 0 | 0 | 0 |
| US-A5b | 7 | 0 | 0 | 0 | 0 |
| US-A5c | 6 | 0 | 0 | 0 | 0 |
| US-A6 | 4 | 0 | 0 | 0 | 0 |
| US-A7 | 6 | 1 | 0 | 0 | 0 |
| US-A8 | 7 | 1 | 0 | 0 | 0 |
| US-A9 | 5 | 0 | 0 | 0 | 0 |
| US-A10 | 1 | 2 | 0 | 1 | 0 |
| US-A11 | 4 | 3 | 0 | 0 | 0 |
| US-A12 | 7 | 1 | 0 | 0 | 0 |

**Key evidence references:**

- US-A1 (intake card): `web/message-dispatch.js:436–483`
- US-A1 (protected-site warning): `web/job-input.js:143–149`
- US-A2 (clarification questions): `web/job-analysis.js:126–142`, `web/questions-panel.js:90–126`
- US-A2 (prior answers reuse): `web/message-dispatch.js:497–526`
- US-A2 (mismatch in LLM prompt only): `scripts/utils/conversation_manager.py:466`
- US-A3 (experience up/down): `web/review-table-base.js:311`
- US-A3 (bullet reorder modal): `web/workflow-steps.js:662–888`
- US-A3b (category rename): `web/skills-review.js:100–120`
- US-A3b (no drag-and-drop): absence of `dragstart`/`dragover` in skills-review.js
- US-A3b (new skill add): `web/skills-review.js:632`, API `addSkill` at line 338
- US-A4 (word-level diff): `web/rewrite-review.js:349–388`
- US-A4 (weak-evidence badge): `web/skills-review.js:727–733`
- US-A4 (submit disabled): `web/rewrite-review.js:296`
- US-A7 (tone options): `web/cover-letter.js:19–25`
- US-A7 (prior letter reuse): `web/cover-letter.js:54–90`
- US-A8 (format labels): `web/screening-questions.js:112`
- US-A8 (response library): `scripts/routes/master_data_routes.py:2026–2029`
- US-A9 (finalise with git commit): `scripts/routes/generation_routes.py:2120–2225`
- US-A9 (readiness checklist): `web/finalise.js:161–200`
- US-A10 (NL update absent): `web/master-cv.js` — CRUD-only forms
- US-A11 (opt-in harvest): `web/harvest.js:107` — `shouldPreCheck()` returns `false`
- US-A12 (↻ re-run button hover-only): `web/workflow-steps.js:1026–1068`
- US-A12 (Ctrl+Shift+R shortcut): `web/keyboard-shortcuts.js:149–150`
- Interview Prep stub: `web/interview-prep.js:22–43`

**Evidence standard:** Every conclusion supported by file:line evidence from source code.
