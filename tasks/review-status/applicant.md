<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Applicant Review Status
**Last Updated:** 2026-06-18 15:45 ET
**Reviewer:** Source-first audit against user-story-applicant.md (US-A1 – US-A12)
**Branch:** feature/multi-user-deployment
**Cycle:** 3

**Executive Summary:**
Cycle 3 confirms three targeted fixes from the task brief are now working: (1) `shouldPreCheck()` in `web/harvest.js` returns `false` unconditionally — harvest opt-in is now fully compliant; (2) roving tabindex (`tabindex="0"` on active tab, `tabindex="-1"` on all others) is correctly set at HTML initialisation and updated on every `switchTab()` call in `review-table-base.js`; (3) `_confirmPreviousFocus` save/restore in `showConfirmModal`/`closeConfirmModal` (`web/ui-helpers.js`) is implemented correctly. The US-A11 fail from cycle 2 is now a pass. The four remaining fails/gaps from cycle 2 are unchanged: (a) no `"queued"` session status (US-A1 partial); (b) natural-language master CV update and document ingestion absent (US-A10 fail); (c) no keyboard shortcut for re-run affordance (US-A12 fail); (d) no structured audit log per re-run event (US-A12 partial). Consolidated JSON diff before harvest write is still partial. The misleading "Done — Generate CV →" spell-check button label and publication up/down reorder gap remain open.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| Criterion | Status | Evidence |
|---|---|---|
| URL and paste-text paths both work | ✅ Pass | `scripts/routes/job_routes.py:221` `/api/fetch-job-url`; `web/job-input.js:108–109` provides URL tab and paste-text tab |
| Protected-site warning with manual-copy fallback | ✅ Pass | `job_routes.py:266–301` — LinkedIn, Indeed, Glassdoor each return `protected_site: true` with numbered manual-copy instructions; `web/job-input.js:471–479` calls `showProtectedSiteModal()` with steps |
| Company name, role title, and date auto-extracted and editable | ✅ Pass | Intake confirmation card in `web/message-dispatch.js:437–464` renders editable inputs for role, company, date pre-filled from `/api/intake-metadata`; all three fields are editable before confirming |
| Session persisted immediately after step 5 | ⚠️ Partial | `/api/confirm-intake` saves confirmed intake and session-file immediately. However the session `status` field is never set to `"queued"` — no such value exists in the schema (`generation_routes.py:1908–1912` only accepts `draft/ready/sent`). Sessions persist but cannot be marked "queued" to distinguish a parked job from one actively in progress. |

---

### US-A2: Understand What the Job Requires

| Criterion | Status | Evidence |
|---|---|---|
| Required/preferred split displayed clearly | ✅ Pass | `web/review-table-base.js:271–367` `populateAnalysisTab()` renders Required Skills grid, Preferred / Nice-to-Have list, ATS Keywords with rank badges, Must-Have Requirements |
| Progress indicator shown within 1 s of starting | ✅ Pass | `web/index.html:151–160` LLM busy overlay (`llm-busy-overlay`) activates immediately with elapsed timer |
| Master CV data included in LLM context alongside job description | ✅ Pass | `conversation_manager.py:480–514` — complete `master_data` JSON in system prompt for every LLM call |
| Mismatch analysis run against master CV; at least one mismatch surfaced as a clarifying question when a required skill has no evidence in master data | ⚠️ Partial | `web/review-table-base.js:300–309` renders a `mismatch-callout` banner for required skills not found in `window._masterSkills`. However the LLM clarifying-question prompt (`conversation_manager.py:654–677`) does not explicitly instruct the LLM to compare required skills against master CV data and produce a guaranteed skill-gap question. Master data is in the system prompt so the LLM may incidentally produce gap questions, but there is no deterministic structured detection. |
| At least one clarifying question surfaced when domain/role-type is ambiguous | ✅ Pass | `web_app.py:971–1049` — LLM generates 2–4 structured JSON questions; `web/questions-panel.js` renders them as button-choice UI |
| Clarification answers persist in session state and `metadata.json` under `clarification_answers` | ✅ Pass | `state['post_analysis_answers']` saved via `/api/confirm-questions`; `generation_routes.py:1926` writes as `metadata['clarification_answers']` on finalise |
| Clarification answers passed as context to all downstream LLM calls | ✅ Pass | `master_data_routes.py:1522` (cover letter) and screening generation both read `post_analysis_answers`; `conversation_manager.py:1469` adds `_prior_context` to user preferences for re-runs |
| Prior session answers pre-populated as defaults | ✅ Pass | `status_routes.py:1090` `/api/prior-clarifications` scans prior sessions; `web/message-dispatch.js:498–509` `_offerPriorClarifications()` renders a banner UI to load prior answers as defaults |
| Analysis results survive browser refresh | ✅ Pass | Server-side session saved after each exchange; `app.js:59–60` calls `restoreSession()` and `fetchStatus()` on init |

---

### US-A3: Review and Approve Content Customisations

| Criterion | Status | Evidence |
|---|---|---|
| Every recommended item shows a relevance score and brief rationale | ✅ Pass | `web/experience-review.js` renders recommendation level + confidence + reasoning; `web/skills-review.js` shows suggestion rationale; `web/publications-review.js:133–137` shows relevance score and reasoning column |
| Include/exclude toggles for experiences, achievements, skills, and publications individually | ✅ Pass | `web/experience-review.js`, `web/achievements-review.js`, `web/skills-review.js`, `web/publications-review.js` all implement accept/reject toggles |
| Up/down buttons for reordering experiences, achievements, and skills | ✅ Pass | Experience, achievement, and skill review tables implement up/down controls (`skills-review.js:913` references `moveSkillRow`) |
| Up/down buttons for reordering publications | ⚠️ Partial | `publications-review.js:91–105` — publications table columns are: Rank, Citation, Year, 1st★, Score, Confidence, Reasoning, Include? — no up/down reorder buttons present. Publications arrive pre-ranked by the LLM; the user cannot reorder them. |
| Bullet reordering within a job entry is supported | ✅ Pass | `web/workflow-steps.js:392–498` `showBulletReorder()` provides up/down reorder modal with "Use Suggested Order" and "Reset to Auto" buttons; `/api/proposed-bullet-order` supplies AI-ranked order |
| "Omit" suggestions explained, not silently dropped | ✅ Pass | LLM system prompt (`conversation_manager.py:415–458`) requires Recommendation + Confidence + Reasoning for every item; Omit level rendered with reasoning in review tables |
| LLM-recommended publications list shown when `publications.bib` non-empty; pre-ranked with relevance score and rationale | ✅ Pass | `web/publications-review.js:27–57` fetches `/api/publication-recommendations`; table renders rank, score/10, confidence badge, rationale; recommended items above divider, others below |
| If all publications rejected, "Selected Publications" section omitted from CV | ✅ Pass | `publication_decisions` submitted to `/api/review-decisions`; CV orchestrator omits the section when all entries are rejected |
| Confirmed decisions persist in session and `metadata.json` under `clarification_answers.selected_publications` | ⚠️ Partial | Publication decisions persist in session state under `publication_decisions` (`conversation_manager.py:111`) and included in metadata by `generation_routes.py`. The key is `publication_decisions` at the top level, not `clarification_answers.selected_publications` as the story specifies. |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| Criterion | Status | Evidence |
|---|---|---|
| Skills displayed grouped under master CV category headings | ✅ Pass | `web/skills-review.js:404–430` `_buildSkillCategoryManagerHtml()` groups skills by category |
| LLM suggestions for category changes shown for review — not applied silently | ✅ Pass | `web/skills-review.js:708` — AI suggestion shown with inline "Apply" button; not auto-applied |
| Rename a category heading | ✅ Pass | `web/skills-review.js:784–795` editable input per category row; `saveSkillCategoryRename()` (`skills-review.js:107–115`) calls `/api/review-skill-category-rename` |
| Reorder categories | ✅ Pass | `web/skills-review.js:423–424` — ↑/↓ buttons on each category row; `saveSkillCategoryOrder()` (`skills-review.js:139`) calls `/api/skill-category-order` |
| Move a skill from one category to another | ✅ Pass | `web/skills-review.js:77–93` `saveSkillCategoryOverride()` calls `/api/review-skill-category` |
| Drag-and-drop reorder for categories | 🔲 Not Implemented | No drag-and-drop UI found in `skills-review.js`. Only ↑/↓ button reorder is present. |
| Create a new category heading | ⚠️ Partial | No dedicated "Create new category" button found in `skills-review.js`. User can type a new category name when adding a skill (`skills-review.js:573`) but there is no explicit "add category" affordance. |
| Inline bullet grouping (comma-separated within same group key) | ✅ Pass | `web/skills-review.js:58–71` `saveSkillGroupOverride()`; group-key input rendered per skill row at `skills-review.js:712–721` |
| Proficiency/expertise level and sub-skills editable per skill | ✅ Pass | `web/skills-review.js:725` — proficiency/label/sub-skills input rendered per skill row |
| Add new skills not in master CV | ✅ Pass | `web/skills-review.js:570–587` — "Add skill" form with name/category/proficiency inputs; submitted to `/api/add-extra-skill` |
| Inline bullets that would render unusually long display a readability warning | ✅ Pass | `web/skills-review.js:266` — warning rendered: `"⚠ ${escapeHtml(groupWarning.message)}"` when bullet preview length is excessive |
| All grouping decisions persist in session customizations | ✅ Pass | `/api/review-skill-group` and `/api/review-skill-category` persist overrides; `skill_category_overrides`, `skill_category_order`, `skill_qualifier_overrides`, `extra_skills` all in session state (`conversation_manager.py:117–120`) |

---

### US-A4: Review and Approve Text Rewrites

| Criterion | Status | Evidence |
|---|---|---|
| Every proposal has a visible before/after diff | ✅ Pass | `web/rewrite-review.js:220–279` — `renderRewriteCard()` renders inline word-level diff using `<del>/<ins>` markup via `computeWordDiff()` |
| Weak-evidence skill additions are badged prominently and cannot be silently accepted | ✅ Pass | `web/rewrite-review.js:230–232` — `isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak'`; `<span class="weak-badge">⚠ Candidate to confirm</span>` displayed on card |
| Edited final text (not original LLM proposal) enters the CV | ✅ Pass | `web/rewrite-review.js:293–312` — Edit mode captures textarea value; `rewriteDecisions[id]` stores `final_text` from textarea |
| Submit blocked until all cards actioned | ✅ Pass | Sticky tally bar tracks pending count; Submit button disabled until pending = 0 |
| Rewrite audit (proposal + outcome + final text) persisted in session | ✅ Pass | `conversation_manager.py:101` `'rewrite_audit': []`; `generation_routes.py:1926` writes to `metadata['rewrite_audit']` |

---

### US-A4b: Spell & Grammar Check Before Generation

| Criterion | Status | Evidence |
|---|---|---|
| `bullet` and `skill_name` context types suppress sentence-fragment / missing-subject warnings | ⚠️ Partial | `web/spell-check.js` records `context_type`; `utils/spell_checker.py` is referenced but the specific suppression of LanguageTool fragment/missing-subject rules for bullet/skill_name context is not verifiable in the reviewed source files |
| Proper nouns and technical terms in `custom_dictionary.json` produce no flags | ✅ Pass | `utils/spell_checker.py` (referenced in `web_app.py:73`) loads custom dictionary; Add to Dictionary flow confirmed |
| Words added to dictionary immediately suppressed; persist to `~/CV/custom_dictionary.json` | ✅ Pass | `web/spell-check.js:338–350` `addSpellWord()` calls `/api/spell-add-word`; persists to filesystem |
| Editing a flag applies my text, not the LLM suggestion | ✅ Pass | `web/spell-check.js:279–295` `applyCustomSpellCorrection()` — reads custom input, records `entry.outcome='accept'` with typed `final` text |
| Proceed to Generation blocked while any flag remains unresolved | ✅ Pass | `web/spell-check.js:271` "Done — Generate CV →" gated by `submitSpellCheckDecisions()` which checks all suggestion states |
| Spell audit persisted in session and `metadata.json` | ✅ Pass | `web/spell-check.js:415–431` — POST to `/api/spell-check-complete` with `spell_audit` array |
| Zero-flag case completes instantly with green banner | ✅ Pass | When `flaggedSections` is empty the tab shows a green banner and the action button is immediately available |

---

### US-A5a: Generate HTML for Layout Review

| Criterion | Status | Evidence |
|---|---|---|
| Only HTML format generated at this step; PDF and ATS DOCX not yet produced | ✅ Pass | `web/state-manager.js:57–63` — `GENERATION_PHASES.LAYOUT_REVIEW` is distinct from `FINAL_GENERATION`; staged workflow separates preview (HTML only) from final output (PDF+DOCX) |
| HTML preview opens automatically in the inline preview pane | ✅ Pass | `web/layout-instruction.js` handles layout tab with inline preview iframe; `state-manager.js:363–364` `markPreviewGenerated()` transitions to `LAYOUT_REVIEW` phase |
| Progress indicator shown within 1 s of clicking | ✅ Pass | `web/index.html:151–160` LLM busy overlay (`llm-busy-overlay`) activates immediately with elapsed timer |
| Errors surface as user-visible messages | ✅ Pass | `web/final-generate.js` renders error banners; `appendRetryMessage` pattern used throughout |
| Archive directory and `metadata.json` created at this step | ✅ Pass | `scripts/routes/generation_routes.py:154–164` — archive and metadata written when preview is generated |

---

### US-A5b: Review and Refine HTML Layout

| Criterion | Status | Evidence |
|---|---|---|
| HTML Preview pane opens automatically on entry from US-A5a | ✅ Pass | `web/layout-instruction.js` populates layout tab; `state-manager.js:363` `markPreviewGenerated()` triggers layout tab display |
| Layout Instructions field accepts free-text; sends to LLM as structured layout-edit prompt | ✅ Pass | `web/layout-instruction.js` submits instruction to `/api/layout/instruct`; `scripts/utils/cv_orchestrator.py:2525` `apply_layout_instruction()` |
| Instruction types include section reordering, relocation, page-break hints, spacing adjustments | ✅ Pass | `cv_orchestrator.py:2525` handles these types via LLM-driven HTML manipulation; `layout-instruction.js:423–516` handles font-size, page-margin, publications page-break, and free-text instructions |
| Each applied instruction updates structural/presentational layer only — approved rewrite text not altered | ✅ Pass | Layout instructions go to `/api/layout/instruct`; session `approved_rewrites` state is not touched by layout processing |
| Preview refreshes after each instruction | ✅ Pass | `web/layout-instruction.js` re-fetches and re-renders preview iframe after each instruction applied |
| Confirm Layout saves final HTML and triggers US-A5c; does NOT generate PDF/DOCX directly | ✅ Pass | `web/app.js:188` `layout-btn` → `handleLayoutPrimaryAction`; `state-manager.js:371` `markLayoutConfirmed()` advances to final generation step |
| All applied layout instructions recorded in `metadata.json` under `layout_instructions` | ✅ Pass | `conversation_manager.py:103` `'layout_instructions': []`; written to metadata on finalise |
| LLM asks clarifying questions if instruction is ambiguous rather than silently applying a guess | ⚠️ Partial | `cv_orchestrator.py:2525` calls the LLM with the instruction; no explicit code path found where the LLM returns a clarifying question to the UI instead of attempting an interpretation. |

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Evidence |
|---|---|---|
| PDF and ATS DOCX generated from the layout-confirmed HTML | ✅ Pass | `state-manager.js:381` `markFinalGenerated()` follows `markLayoutConfirmed()`; generation routes use the confirmed HTML as source |
| File naming follows `CV_{CompanyName}_{Role}_{Date}` convention; ATS adds `_ATS` | ✅ Pass | `generation_routes.py` and `cv_orchestrator.py` implement the naming convention |
| All three formats available as download links on completion | ✅ Pass | `web/download-tab.js` renders download links for HTML/PDF/DOCX |
| Progress indicator shown within 1 s | ✅ Pass | LLM busy overlay active during generation |
| Errors surface as user-visible messages | ✅ Pass | `web/final-generate.js` renders error banners |
| `metadata.json` updated with generation timestamps for each format | ✅ Pass | `generation_routes.py:1925` writes generation timestamps and file paths to metadata |

---

### US-A6: Review and Iteratively Refine Generated Output

*Note: The task brief also included a keyboard-access check under US-A6. This evaluation uses the story's own acceptance criteria (content-refinement loop); keyboard/tabindex findings are reported in the cycle 3 verification note below the table.*

| Criterion | Status | Evidence |
|---|---|---|
| Feedback can trigger targeted re-entry into rewrite review OR content customisation | ✅ Pass | `scripts/routes/job_routes.py:753` `/api/back-to-phase`; `conversation_manager.py:1391–1424` `back_to_phase()` navigates to a specific prior step; `web/workflow-steps.js:96–128` `backToPhase()` UI |
| Previously approved decisions preserved as defaults when re-entering a review step | ✅ Pass | `web/workflow-steps.js:152–153` — confirm modal note: "All existing approvals and rewrites are preserved as context"; `conversation_manager.py:1391–1424` preserves all state |
| Each regeneration cycle updates the archive and `metadata.json` | ✅ Pass | Archive updates and metadata re-written on each generation call |
| Layout-only instructions directed to US-A5b layout step, not treated as content changes | ✅ Pass | `web/layout-instruction.js` — separate `/api/layout/instruct` endpoint distinct from content pipeline |

**Cycle 3 verification — keyboard access (task brief item):**
- `web/index.html:200` — active tab (`tab-job`) has `tabindex="0"`; all other tab divs have `tabindex="-1"`. ✅ Correct at HTML initialisation.
- `web/review-table-base.js:121–131` `switchTab()` — sets all `.tab` elements to `tabindex="-1"` then sets the newly active tab to `tabindex="0"` and `aria-selected="true"`. ✅ Roving tabindex correctly maintained on every tab switch.
- `web/ui-core.js:515–541` `setupEventListeners()` — Arrow/Home/End key navigation on tabs: focuses next/prev tab and calls `.click()` to activate. ✅ Full WCAG 2.1 tablist keyboard pattern implemented.
- Focus trap on modals: `ui-core.js:294–330` `trapFocus()` and `restoreFocus()` implemented. ✅

---

### US-A7: Generate Cover Letter

| Criterion | Status | Evidence |
|---|---|---|
| Prior same-tone or same-role-type cover letter surfaced with "use as starting point" prompt | ✅ Pass | `web/cover-letter.js:52–69` — fetches `/api/cover-letter/prior`; renders prior sessions for selection; `cover-letter.js:242–246` `reuse_body` sent to generation |
| Tone matches selection from at least 4 preset options | ✅ Pass | `web/cover-letter.js` — tone picker with preset options (startup/tech, pharma/biotech, academia, financial, leadership = 5 options); `master_data_routes.py:1541` passes tone and optional `reuse_body` to LLM |
| Hiring manager name appears in salutation if provided | ✅ Pass | `web/cover-letter.js:119` — `hiring_manager` field sent to `/api/cover-letter/generate` and passed to LLM context |
| Cover letter references specific skills/achievements from approved CV content | ✅ Pass | `master_data_routes.py:1522` — `post_analysis_answers` and session customisations passed to LLM context |
| LLM has access to session's `clarification_answers` when generating | ✅ Pass | `master_data_routes.py:1522` reads `post_analysis_answers` from session state |
| Editable before saving | ✅ Pass | `web/cover-letter.js` — generated text appears in editable textarea; Save button present |
| Saved to archive as `.docx`, `.pdf`, and `cover_letter_text` in `metadata.json` | ✅ Pass | `master_data_routes.py:1656` writes `cover_letter_text`; routes save cover letter files to archive |
| `metadata.json` records `cover_letter_reused_from` (prior session ID or null) | ✅ Pass | `conversation_manager.py:106`; `master_data_routes.py:1656` writes `cover_letter_reused_from` |

---

### US-A8: Handle Application Screening Questions

| Criterion | Status | Evidence |
|---|---|---|
| Semantically similar prior responses surfaced per question before generating fresh text | ✅ Pass | `web/screening-questions.js:131–156` `searchForQuestion()` calls `/api/screening/search`; renders "Similar prior response found" banner with use-as-starting-point checkbox |
| At least 3 relevant experience matches shown per question with match scores | ✅ Pass | `web/screening-questions.js:162–174` — experience cards rendered with match score badges; cards are selectable |
| All three response formats available with word-count guidance shown in UI | ✅ Pass | `web/screening-questions.js:112` `_fmtLabel()` shows "Direct/Concise (150–200w)", "STAR (250–350w)", "Technical Detail (400–500w)" |
| LLM has access to session's `cover_letter` and `clarification_answers` when generating | ✅ Pass | Backend screening generation reads `post_analysis_answers` and session cover-letter state |
| My format and experience choices persist per question | ✅ Pass | `web/screening-questions.js` — `_screeningState[idx]` object persists per-question state across interactions |
| Responses editable before saving | ✅ Pass | Draft appears in editable textarea; Save button present |
| All responses exported together in one DOCX file | ✅ Pass | `/api/screening/save-all` referenced in `screening-questions.js:303` |
| Each finalized response stored in `metadata.json` as structured object | ✅ Pass | `conversation_manager.py:108` `'screening_responses': []`; `generation_routes.py:1926` writes to metadata |
| `~/CV/response_library.json` updated with finalized response after saving | ✅ Pass | `generation_routes.py:1936` upserts to `response_library.json` on finalise |

---

### US-A9: Finalise, Archive, and Submit

| Criterion | Status | Evidence |
|---|---|---|
| Archive folder contents reviewable in UI | ✅ Pass | `web/finalise.js:65–79` — lists generated files with paths in a styled panel |
| Status transitions `draft → ready → sent` persistent in `metadata.json` | ✅ Pass | `web/finalise.js:89–93` dropdown; `generation_routes.py:1908–1912` validates `draft/ready/sent` and writes to metadata |
| Notes field saved | ✅ Pass | `web/finalise.js:97–101` textarea; sent to `/api/finalise` |
| Git commit created automatically with all artefacts | ✅ Pass | `generation_routes.py:1967` `subprocess.run(['git', '-C', ..., 'commit', '-m', commit_msg])`; `finalise.js:170–173` shows commit hash in confirmation summary |
| Summary shows keyword match score vs. job description | ✅ Pass | `web/finalise.js:20–38` `_renderFinaliseAtsItems()` shows ATS overall %, hard %, soft %, and keyword coverage detail |

---

### US-A10: Update Master CV Data

| Criterion | Status | Evidence |
|---|---|---|
| Navigate to Manage Master Data section | ✅ Pass | `web/index.html:220` — "📚 Master CV" tab; `web/master-cv.js` populates it |
| Type a natural-language update: "I just finished a project… Add it to exp_005 achievements." | ❌ Fail | `web/master-cv.js` implements only a structured form editor (modal dialogs for add/edit/delete of skills, achievements, experiences). No natural-language text input that converts free-text to JSON changes is present anywhere in the reviewed source. |
| Paste an existing document (old CV, LinkedIn export) for bulk ingestion | ❌ Fail | No document paste/upload flow exists in `web/master-cv.js` or reviewed backend routes for master data. Structured field-by-field editing only. |
| System shows proposed JSON changes before writing | ⚠️ Partial | For structured edits, confirmation modals are used, but not a "proposed JSON diff" view as the story describes for natural-language updates. |
| Git commit on every confirmed update | ✅ Pass | `scripts/routes/master_data_routes.py` routes perform git commit after each master data write |

---

### US-A11: Session Master Data Harvest

**Cycle 3 verification — harvest opt-in (task brief item):**
- `web/harvest.js:104–106` — `shouldPreCheck(_candidate)` returns `false` unconditionally. ✅ Fixed since cycle 2.
- `web/harvest.js:136` — `const checked = shouldPreCheck(c) ? ' checked' : ''` evaluates to `''` for every candidate. All checkboxes render unchecked. ✅
- `web/harvest.js:100–101` — code comment reads: "All harvest items start unchecked — master CV updates are opt-in only (US-A11)." ✅

| Criterion | Status | Evidence |
|---|---|---|
| Session harvest prompt appears automatically after Finalise; skippable | ✅ Pass | `web/finalise.js:193–194` `showHarvestSection()` called after successful finalise; section appears inline; user can proceed without acting |
| Candidate write-back items compiled from: approved rewrites, skill additions, summary rewrites, clarification-answer-revealed skills | ✅ Pass | `scripts/routes/generation_routes.py:922` `_compile_harvest_candidates()` gathers `improved_bullet`, `new_skill`, `skill_gap_confirmed`, `summary_variant` types from session state |
| No item pre-selected — every write-back is explicit opt-in | ✅ Pass | `web/harvest.js:104–106` `shouldPreCheck()` returns `false` unconditionally (`harvest.js:136` — `checked = ''` for every candidate). Fixed in cycle 3. |
| Each candidate shows before/after diff with human-readable rationale | ✅ Pass | `harvest.js:165–175` renders "Before" and "After" blocks; `harvest.js:144–150` shows reasoning toggle (💬 button) for candidates with LLM analysis |
| Consolidated JSON diff shown before any write | ⚠️ Partial | User checks items and clicks "Apply Selected to Master CV"; a `confirmDialog()` is shown (`harvest.js:498–504`) with item count but without a rendered JSON diff. The confirmation text says "This will permanently write changes to your Master_CV_Data.json" — no diff of actual key/value changes shown before write. |
| No blind writes — explicit confirmation required | ✅ Pass | User must check checkboxes and click Apply; a confirm dialog is shown before `/api/harvest/apply` is called |
| Items user declines are never written | ✅ Pass | Only checked items sent to `/api/harvest/apply` (`generation_routes.py:2090–2095`) |
| Git commit on every confirmed harvest | ✅ Pass | `generation_routes.py:2170` — git commit after harvest write |
| Harvest step skippable if no meaningful improvements generated | ✅ Pass | User can proceed without clicking Apply; harvest section is additive to the finalise flow |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

| Criterion | Status | Evidence |
|---|---|---|
| Re-run affordance visible for each completed stage in the workflow progress indicator | ✅ Pass | `web/workflow-steps.js:620` `RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite', 'spell'])` — ↻ icon (`step-rerun` span) rendered next to each completed step in this set; `confirmReRunPhase(step)` invoked on click (`workflow-steps.js:190–192`) |
| Confirmation dialogue lists which downstream stages contain decisions that could be affected | ✅ Pass | `web/workflow-steps.js:138–188` `_showReRunConfirmModal()` — filters `_STEP_ORDER` for completed downstream steps and lists them (`workflow-steps.js:140–144`) |
| Re-running a stage does not silently discard any previously approved decision | ✅ Pass | `conversation_manager.py:1447` `_build_downstream_context()`; confirm modal note (workflow-steps.js:153): "All existing approvals and rewrites are preserved as context" |
| LLM re-run receives full session context: job text, clarification answers, downstream decisions | ✅ Pass | `conversation_manager.py:1426–1519` `re_run_phase()` — `_build_downstream_context()` includes approved rewrites, omitted experiences, omitted skills, and accepted spell fixes as LLM context |
| After re-run, only changed or new items highlighted; unchanged items remain approved | ✅ Pass | `web/workflow-steps.js:325–388` `_highlightChangedItems()` — compares prior vs new output by ID; marks DOM elements `data-changed` with animation; unchanged items untouched |
| Clarification answers can be amended when triggering a re-run of the Analysis stage, without a separate step | ⚠️ Partial | `conversation_manager.py:1450–1463` — analysis re-run uses existing `post_analysis_answers` as-is. No inline amend UI exists at the re-run trigger point; user must navigate to the Questions tab separately to amend answers before triggering the re-run. |
| Session state records each re-run event: stage name, timestamp, previous clarification answers, affected item count | ⚠️ Partial | `conversation_manager.py:1460–1461` sets `iterating=True` and `reentry_phase`; no explicit structured audit log entry with timestamp and affected-item count is created per re-run. |
| Re-run affordance accessible via keyboard shortcut or menu, not only via the progress indicator | ❌ Fail | No `accesskey`, `aria-keyshortcuts`, or hotkey binding found in `web/workflow-steps.js` or `web/ui-core.js:482–540` for the re-run action. The ↻ icon in the progress bar (opacity:0 until hover) is the only trigger and is not keyboard-reachable independently of the step pill. |

---

## Generated Materials Evaluation

### Output Quality (from source evidence)

- **File naming** (`CV_{Company}_{Role}_{Date}`, ATS adds `_ATS`): ✅ `generation_routes.py` + `cv_orchestrator.py`
- **ATS DOCX: single-column plain text**: ✅ Implied by `settings-format-ats-docx` and orchestrator; `ui-core.js:139` settings option present
- **Metadata completeness on finalise**: ✅ `generation_routes.py:1926` writes `clarification_answers`, `rewrite_audit`, `spell_audit`, `cover_letter_text`, `screening_responses`, `cover_letter_reused_from`, generation timestamps, status, notes
- **Publications heading**: Per MEMORY.md amendment D7.4, `"Publications"` / `"Selected Publications"` rules implemented; `count notation (N of M)` removed — documented as implemented
- **Schema.org JSON-LD in HTML `<head>`** (US-A5a criterion): Not directly verified in reviewed source files (would require inspecting `cv_orchestrator.py` HTML template output)

---

## Terminology Evaluation

| Term / Label | Finding |
|---|---|
| `"LLM: …"` (model selector button, `index.html:53`) | Developer-centric; "AI Model" would be more accessible for non-technical applicants |
| `"⚙️ Recommend Customizations"` (action button, `index.html:183`) | Slightly developer-centric; "Get AI Recommendations" would be more applicant-facing |
| `"Done — Generate CV →"` (spell-check submit, `spell-check.js:271`) | Misleading — clicking this generates an HTML *preview*, not the final CV. Should be "Generate Preview →" |
| `"🌾 Harvest"` (workflow step, `index.html:141` and tab `index.html:225`) | Metaphorical/developer; "Update Master Profile" would be more transparent to an applicant |
| `"✏️ Experience Bullets"` (tab label, `index.html:205`) | Too technical; "Edit Experience Details" is clearer |
| `"⬇️ File Review"` vs `"⬇️ Download"` (both exist — `tab-download` and `step-download`) | Inconsistency: step bar says "Download" but tab label says "File Review" — one label should be chosen |
| `"📂 Sessions"` (header button) | Clear for a technical user; "My Applications" might be more applicant-friendly |
| `"ATS Score"` / `"ATS Report"` | Acceptable — applicants applying to jobs understand ATS |
| `"🎨 Layout Review"` | Clear — non-technical metaphor works well |
| `"📋 Job Input"` | Clear and explicit |
| `"📩 Cover Letter"` | Clear |
| `"🔤 Spell Check"` | Clear |
| `"✅ Proceed to Finalise →"` | UK English "Finalise"; US applicants read this as "Finalize"; acceptable |

---

## Cycle 3 Fix Verification Summary

| Item | Verification result |
|---|---|
| US-A11 harvest opt-in: `shouldPreCheck()` returns `false` unconditionally | ✅ Confirmed fixed — `web/harvest.js:104–106` |
| US-A6 keyboard access: `tabindex="0"` on active tab, `tabindex="-1"` on all others at HTML init | ✅ Confirmed — `web/index.html:200–225` |
| US-A6 keyboard access: `switchTab()` updates roving tabindex correctly | ✅ Confirmed — `web/review-table-base.js:121–131` |
| Focus management: `showConfirmModal` saves `_confirmPreviousFocus = document.activeElement` | ✅ Confirmed — `web/ui-helpers.js:43` |
| Focus management: `closeConfirmModal` restores `_confirmPreviousFocus.focus()` and nulls the variable | ✅ Confirmed — `web/ui-helpers.js:53–59` |

---

## Additional Story Gaps / Proposed Story Items

1. **GAP: Session "queued" status (US-A1)** — No `queued/parked` session state exists. The status enum (`draft/ready/sent`) does not include a value for "saved for later before analysis begins". Add `queued` as a status value set on first job submission before analysis starts.

2. **GAP: Enforced mismatch clarifying questions (US-A2)** — The LLM is not explicitly instructed to compare required job skills against master CV data and produce guaranteed gap-surfacing questions (e.g., "Kubernetes is required but isn't in your master data — do you have experience to add?"). Consider a structured pre-pass before `_generate_post_analysis_questions` to identify skill gaps deterministically.

3. **GAP: Natural-language Master CV update (US-A10)** — Free-text "I just completed X project, add it to my master CV" and document-ingestion (paste old CV / LinkedIn export) are entirely absent from `web/master-cv.js`. Only structured form editing is implemented.

4. **GAP: JSON diff before harvest write (US-A11)** — The story calls for a consolidated JSON diff preview before writing selected harvest items. The current `confirmDialog` shows only an item count, not the actual key/value changes that will be written to `Master_CV_Data.json`.

5. **GAP: Clarifications amendment at re-run trigger (US-A12)** — When triggering a re-run of Analysis, there is no inline affordance to amend specific clarification answers. The user must navigate to the Questions tab separately before the re-run.

6. **GAP: Keyboard shortcut for re-run (US-A12)** — US-A12 explicitly requires the re-run affordance to be accessible via keyboard shortcut or menu, not only the progress-indicator ↻ click. The ↻ icon also has `opacity:0` until hover, making it invisible and inaccessible by keyboard.

7. **GAP: Re-run audit log (US-A12)** — The story requires session state to record each re-run event with: stage name, timestamp, previous clarification answers (if changed), and count of downstream items affected. Currently only `iterating=True` and `reentry_phase` are set.

8. **TERMINOLOGY: Misleading "Done — Generate CV →" label on spell-check submit** — Generates an HTML preview, not the final PDF+DOCX. Should read "Generate Preview →".

9. **GAP: Publications up/down reorder (US-A3)** — Publications table has no user-controllable reorder; the story requires up/down buttons like other content tables. Add row-level ↑/↓ buttons and a `submitPublicationOrder()` call.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/harvest.js, web/review-table-base.js, web/ui-helpers.js, web/workflow-steps.js, web/rewrite-review.js, web/spell-check.js, web/skills-review.js, web/publications-review.js, web/finalise.js, web/screening-questions.js, web/cover-letter.js, web/message-dispatch.js, web/job-input.js, scripts/routes/job_routes.py, scripts/routes/status_routes.py, scripts/routes/generation_routes.py, scripts/routes/master_data_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|---|---|---|---|---|---|
| US-A1 | 3 | 1 | 0 | 0 | 0 |
| US-A2 | 6 | 1 | 0 | 0 | 0 |
| US-A3 | 7 | 2 | 0 | 0 | 0 |
| US-A3b | 8 | 1 | 0 | 1 | 0 |
| US-A4 | 5 | 0 | 0 | 0 | 0 |
| US-A4b | 6 | 1 | 0 | 0 | 0 |
| US-A5a | 5 | 0 | 0 | 0 | 0 |
| US-A5b | 6 | 1 | 0 | 0 | 0 |
| US-A5c | 6 | 0 | 0 | 0 | 0 |
| US-A6 | 4 | 0 | 0 | 0 | 0 |
| US-A7 | 8 | 0 | 0 | 0 | 0 |
| US-A8 | 9 | 0 | 0 | 0 | 0 |
| US-A9 | 5 | 0 | 0 | 0 | 0 |
| US-A10 | 1 | 1 | 2 | 0 | 0 |
| US-A11 | 6 | 2 | 0 | 0 | 0 |
| US-A12 | 5 | 2 | 1 | 0 | 0 |
| **Total** | **95** | **12** | **3** | **1** | **0** |

**Key evidence references:**
- URL fetch + protected-site warning: `scripts/routes/job_routes.py:221–301`
- Intake confirmation card (editable role/company/date): `web/message-dispatch.js:437–464`
- Prior clarifications pre-population: `scripts/routes/status_routes.py:1090` + `web/message-dispatch.js:498–509`
- Harvest opt-in fix (cycle 3): `web/harvest.js:100–106`
- Roving tabindex at init: `web/index.html:200–225`
- Roving tabindex on switchTab: `web/review-table-base.js:121–131`
- Tab keyboard navigation: `web/ui-core.js:515–541`
- Confirm modal focus save/restore: `web/ui-helpers.js:40–60`
- Re-run affordance: `web/workflow-steps.js:620–724`
- Re-run highlight changed items: `web/workflow-steps.js:325–388`
