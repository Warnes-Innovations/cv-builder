<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Applicant Review Status

**Last Updated:** 2026-06-22 20:15 ET
**Reviewer:** Source-first audit against user-story-applicant.md (US-A1 – US-A12)
**Branch:** feature/multi-user-deployment
**Cycle:** 6

**Executive Summary:**
Cycle 6 re-audits all seven required source files from scratch plus supporting modules,
incorporating post-cycle-5 commits (GAP-166 rewrite persistence, GAP-167–173 a11y/UX
label fixes, commit 3057ea8). Two cycle-5 fails are now resolved: (a) the ↻ re-run icon
has been converted from `<span onclick>` to `<button aria-label>` with `:focus-visible`
and `:focus-within` visibility (GAP-167); (b) the spell-check CTA "Done — Generate CV →"
has been renamed "Generate Preview →" (GAP-169). Remaining open issues: no
`"queued"` session status (US-A1 partial); natural-language master CV update and document
ingestion absent (US-A10 fail); re-run ↻ button is now keyboard-reachable but there is
no keyboard shortcut independent of the progress indicator — the acceptance criterion
calls for a "keyboard shortcut or menu, not only via the progress indicator" which is not
yet satisfied; no structured per-re-run audit log (US-A12 partial); no inline
clarification-answer amendment at the re-run trigger (US-A12 partial). The consolidated
JSON diff before harvest write remains a count-only confirmation dialog. Publications
up/down reorder buttons are still absent.

---

## Application Evaluation

### US-A1: Discover and Queue a Job Opportunity

| Criterion | Status | Evidence |
| --- | --- | --- |
| URL and paste-text paths both work | ✅ Pass | `scripts/routes/job_routes.py:221` `/api/fetch-job-url`; `web/job-input.js:108–109` URL tab and paste-text tab both render with submit buttons |
| Protected-site warning with manual-copy fallback | ✅ Pass | `job_routes.py:266–301` — LinkedIn, Indeed, Glassdoor each return `protected_site: true` with numbered manual-copy instructions; `web/job-input.js:140–149` URL-method panel shows "Copy manually from:" advisory with named sites before a URL is even submitted |
| Company name, role title, and date auto-extracted and editable | ✅ Pass | `conversation_manager.py:1357` `extract_intake_metadata()`; `conversation_manager.py:1908–1925` `apply_confirmed_intake()` persists editable role/company/date from `/api/confirm-intake`; state field `intake` (`conversation_manager.py:122`) |
| Session persisted immediately after step 5 | ⚠️ Partial | `/api/confirm-intake` saves confirmed intake and session file immediately (`conversation_manager.py:1908–1925`). However, the session `status` field is never set to `"queued"` — `generation_routes.py:1929` validates only `draft/ready/sent`. Sessions persist but cannot be marked as "queued" to distinguish a parked pre-analysis job from one in progress. |

---

### US-A2: Understand What the Job Requires

| Criterion | Status | Evidence |
| --- | --- | --- |
| Required/preferred split displayed clearly | ✅ Pass | Job analysis tab renders Required Skills grid, Preferred / Nice-to-Have list, ATS Keywords with rank badges, and Must-Have Requirements in `web/review-table-base.js` |
| Progress indicator shown within 1 s of starting | ✅ Pass | `web/index.html:151–160` LLM busy overlay (`llm-busy-overlay`) activates immediately; `index.html:155` now has `aria-live="polite" role="status"` (GAP-170) |
| Master CV data included in LLM context alongside job description | ✅ Pass | `conversation_manager.py:480–514` — complete `master_data` JSON serialized into system prompt for every LLM call |
| Mismatch analysis run against master CV; at least one mismatch surfaced as a clarifying question when a required skill has no evidence in master data | ⚠️ Partial | A `mismatch-callout` banner is rendered in the UI for required skills absent from `window._masterSkills`. The LLM clarifying-question prompt (`conversation_manager.py:654–677`) instructs "specific to this role" questions but does not deterministically require a skill-gap question when a required skill is absent from master data — mismatch questions depend on LLM discretion. The story acceptance criterion calls for "at least one mismatch surfaced… when a required skill or role-type signal has no evidence in the master data." |
| At least one clarifying question surfaced when domain/role-type is ambiguous | ✅ Pass | `web_app.py:971–1049` `_generate_post_analysis_questions()` — LLM generates 2–4 structured JSON questions; `_fallback_post_analysis_questions()` provides deterministic fallback; `web/questions-panel.js` renders them as button-choice UI |
| Clarification answers persist in session state and `metadata.json` under `clarification_answers` | ✅ Pass | `state['post_analysis_answers']` saved to session; `generation_routes.py:1926` writes `metadata['clarification_answers']` on finalise |
| Clarification answers passed as context to all downstream LLM calls | ✅ Pass | Cover letter (`master_data_routes.py:1522`) and screening generation both read `post_analysis_answers`; `conversation_manager.py:1469` adds prior context for re-runs |
| Prior session answers pre-populated as defaults | ✅ Pass | `/api/prior-clarifications` in `status_routes.py` scans prior sessions; `web/message-dispatch.js` `_offerPriorClarifications()` renders a banner UI to load prior answers as defaults |
| Analysis results survive browser refresh | ✅ Pass | Server-side session saved after each exchange; `app.js:59–60` calls `restoreSession()` and `fetchStatus()` on init |

---

### US-A3: Review and Approve Content Customisations

| Criterion | Status | Evidence |
| --- | --- | --- |
| Every recommended item shows a relevance score and brief rationale | ✅ Pass | Experience review renders recommendation level + confidence + reasoning; skills review shows LLM suggestion rationale; publications review shows relevance score and reasoning column |
| Include/exclude toggles for experiences, achievements, skills, and publications individually | ✅ Pass | `web/experience-review.js`, `web/achievements-review.js`, `web/skills-review.js`, `web/publications-review.js` all implement accept/reject toggles |
| Up/down buttons for reordering experiences, achievements, and skills | ✅ Pass | Experience, achievement, and skill review tables implement up/down controls |
| Up/down buttons for reordering publications | ⚠️ Partial | `web/publications-review.js` table columns: Rank, Citation, Year, 1st-Author★, Score, Confidence, Reasoning, Include? — no up/down reorder buttons. Publications arrive pre-ranked by the LLM; the user cannot manually reorder them. |
| Bullet reordering within a job entry is supported | ✅ Pass | `web/workflow-steps.js:392–498` `showBulletReorder()` provides up/down reorder modal with "Use Suggested Order" and "Reset to Auto" options; `/api/proposed-bullet-order` supplies AI-ranked order |
| "Omit" suggestions explained, not silently dropped | ✅ Pass | LLM system prompt (`conversation_manager.py:415–458`) requires Recommendation + Confidence + Reasoning for every item including Omit; rationale rendered in review tables |
| LLM-recommended publications list shown when `publications.bib` non-empty; pre-ranked with relevance score and rationale | ✅ Pass | `web/publications-review.js:27–57` fetches `/api/publication-recommendations`; renders rank, score/10, confidence badge, and rationale; recommended items shown above the separator |
| If all publications rejected, "Selected Publications" section omitted from CV | ✅ Pass | `publication_decisions` submitted to `/api/review-decisions`; CV orchestrator omits section when all entries are rejected |
| Confirmed publication decisions persist in session and `metadata.json` under `clarification_answers.selected_publications` | ⚠️ Partial | Publication decisions persist under `publication_decisions` at the top level of session state (`conversation_manager.py:111`) and are included in metadata by `generation_routes.py`. The story specifies the key `clarification_answers.selected_publications`; the actual key is `publication_decisions`. |

---

### US-A3b: Organise Skills into Categories and Inline Bullet Groups

| Criterion | Status | Evidence |
| --- | --- | --- |
| Skills displayed grouped under master CV category headings | ✅ Pass | `web/skills-review.js:404–430` `_buildSkillCategoryManagerHtml()` groups skills by category heading |
| LLM suggestions for category changes shown for review — not applied silently | ✅ Pass | `web/skills-review.js:708–712` — AI suggestion rendered with inline "Apply" button; not auto-applied |
| Rename a category heading | ✅ Pass | `web/skills-review.js:784–795` — editable input per category row; `saveSkillCategoryRename()` (line 107–115) calls `/api/review-skill-category-rename` |
| Reorder categories via up/down buttons | ✅ Pass | `web/skills-review.js:423–424` — ↑/↓ buttons per category row now have `aria-label` (GAP-171); `saveSkillCategoryOrder()` calls `/api/skill-category-order` |
| Reorder categories via drag-and-drop | 🔲 Not Implemented | No drag-and-drop UI found in `skills-review.js`. The story criterion specifically mentions drag-and-drop; only ↑/↓ button reorder is present. |
| Move a skill from one category to another | ✅ Pass | `web/skills-review.js:77–93` `saveSkillCategoryOverride()` calls `/api/review-skill-category` |
| Create a new category heading | ⚠️ Partial | No dedicated "Create new category" button or affordance found in `skills-review.js`. A user can type a new category name when adding a skill (line 573) but there is no explicit "add category" action independent of adding a skill. |
| Inline bullet grouping (comma-separated within same group key) | ✅ Pass | `web/skills-review.js:58–71` `saveSkillGroupOverride()`; group-key input rendered per skill row at line 712–721 |
| Proficiency/expertise level and sub-skills editable per skill | ✅ Pass | `web/skills-review.js:725–743` — proficiency label and sub-skills inputs rendered per skill row with descriptive titles |
| Free-form parenthetical text as full override | ✅ Pass | `web/skills-review.js:745–755` — parenthetical override input rendered per skill row |
| Add new skills not in master CV | ✅ Pass | `web/skills-review.js:570–587` — "Add skill" form with name/category/proficiency inputs; submitted to `/api/add-extra-skill` |
| Inline bullets that would render unusually long display a readability warning | ✅ Pass | `web/skills-review.js:266` — `⚠ ${escapeHtml(groupWarning.message)}` when bullet preview length is excessive |
| All grouping decisions persist in session customizations | ✅ Pass | `/api/review-skill-group`, `/api/review-skill-category`, and related endpoints persist overrides; `skill_category_overrides`, `skill_category_order`, `skill_qualifier_overrides`, `extra_skills` all in session state (`conversation_manager.py:117–120`) |

---

### US-A4: Review and Approve Text Rewrites

| Criterion | Status | Evidence |
| --- | --- | --- |
| Every proposal has a visible before/after diff | ✅ Pass | `web/rewrite-review.js:220–279` — `renderRewriteCard()` renders inline word-level diff using `<del>/<ins>` markup via `computeWordDiff()` |
| Weak-evidence skill additions badged prominently and cannot be silently accepted | ✅ Pass | `web/rewrite-review.js:263–265` — `isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak'`; `<span class="weak-badge">⚠ Candidate to confirm</span>` displayed on card header |
| Edited final text (not original LLM proposal) enters the CV | ✅ Pass | `web/rewrite-review.js:360–386` `saveRewriteEdit()` — captures textarea value; `rewriteDecisions[id]` stores `final_text` from user-edited textarea |
| Submit blocked until all cards actioned | ✅ Pass | `web/rewrite-review.js:408–411` — `submitBtn.disabled = (pending > 0) || needsAck`; sticky tally bar tracks pending count |
| Rewrite audit (proposal + outcome + final text) persisted in session | ✅ Pass | `conversation_manager.py:101` `'rewrite_audit': []`; `generation_routes.py:1926` writes `metadata['rewrite_audit']` on finalise |

---

### US-A4b: Spell & Grammar Check Before Generation

| Criterion | Status | Evidence |
| --- | --- | --- |
| `bullet` and `skill_name` context types suppress sentence-fragment / missing-subject warnings | ⚠️ Partial | `web/spell-check.js` records `context_type` per flag; LanguageTool rule suppression for bullet/skill_name context types lives in `utils/spell_checker.py` (referenced by `web_app.py:73`). The specific per-context suppression logic is not verifiable from the seven primary source files reviewed. |
| Proper nouns and technical terms in `custom_dictionary.json` produce no flags | ✅ Pass | `utils/spell_checker.py` loads custom dictionary; Add to Dictionary flow confirmed via `web/spell-check.js:338–350` |
| Words added to dictionary immediately suppressed; persist to `~/CV/custom_dictionary.json` | ✅ Pass | `web/spell-check.js:338–350` `addSpellWord()` calls `/api/spell-add-word`; persists to filesystem |
| Editing a flag applies my text, not the LLM suggestion | ✅ Pass | `web/spell-check.js:279–295` `applyCustomSpellCorrection()` reads custom input text and records `entry.outcome='accept'` with typed `final` text |
| Proceed to Generation blocked while any flag remains unresolved | ✅ Pass | `web/spell-check.js:271` — action button gated by `submitSpellCheckDecisions()` which checks all suggestion states |
| Spell audit persisted in session and `metadata.json` | ✅ Pass | `web/spell-check.js:415–431` — POST to `/api/spell-check-complete` with full `spell_audit` array |
| Zero-flag case completes instantly with green banner | ✅ Pass | When `flaggedSections` is empty, tab shows green "No spelling or grammar issues found" banner and the action button is immediately enabled |

---

### US-A5a: Generate HTML for Layout Review

| Criterion | Status | Evidence |
| --- | --- | --- |
| Only HTML format generated at this step; PDF and ATS DOCX not yet produced | ✅ Pass | `web/state-manager.js:57–63` — `GENERATION_PHASES.LAYOUT_REVIEW` is distinct from `FINAL_GENERATION`; staged workflow generates HTML preview only, deferring PDF+DOCX to final generation |
| HTML preview opens automatically in the inline preview pane | ✅ Pass | `web/layout-instruction.js` handles layout tab with inline preview iframe; `state-manager.js:363–364` `markPreviewGenerated()` transitions to `LAYOUT_REVIEW` phase |
| Progress indicator shown within 1 s of clicking Generate HTML Preview | ✅ Pass | `web/index.html:151–160` LLM busy overlay activates immediately with elapsed timer |
| Errors surface as user-visible messages, not silent failures | ✅ Pass | `web/final-generate.js` renders error banners; `appendRetryMessage` pattern used throughout |
| Archive directory and `metadata.json` created at this step | ✅ Pass | `scripts/routes/generation_routes.py:154–164` — archive and metadata written when preview is generated |

---

### US-A5b: Review and Refine HTML Layout

| Criterion | Status | Evidence |
| --- | --- | --- |
| HTML Preview pane opens automatically on entry from US-A5a | ✅ Pass | `web/layout-instruction.js` populates layout tab; `state-manager.js:363` `markPreviewGenerated()` triggers layout tab display |
| Layout Instructions field accepts free-text; sends to LLM as structured layout-edit prompt | ✅ Pass | `web/layout-instruction.js` submits instruction to `/api/layout/instruct`; `scripts/utils/cv_orchestrator.py` `apply_layout_instruction()` |
| Instruction types include section reordering, relocation, page-break hints, and spacing adjustments | ✅ Pass | `web/layout-instruction.js:423–516` handles font-size, page-margin, publications page-break, and free-text instructions; LLM interprets all |
| Each applied instruction updates structural/presentational layer only — approved rewrite text not altered | ✅ Pass | Layout instructions go to `/api/layout/instruct`; session `approved_rewrites` state is not touched by layout processing |
| Preview refreshes after each instruction is applied | ✅ Pass | `web/layout-instruction.js` re-fetches and re-renders preview iframe after each instruction applied |
| Confirm Layout saves final HTML and triggers US-A5c; does NOT generate PDF/DOCX directly | ✅ Pass | `web/app.js:188` `layout-btn` → `handleLayoutPrimaryAction`; `state-manager.js:371` `markLayoutConfirmed()` advances to final generation step only |
| All applied layout instructions recorded in `metadata.json` under `layout_instructions` | ✅ Pass | `conversation_manager.py:103` `'layout_instructions': []`; written to metadata on finalise |
| LLM asks clarifying questions if instruction ambiguous rather than silently guessing | ⚠️ Partial | `/api/layout/instruct` calls the LLM with the instruction; no explicit code path was found where the LLM returns a clarifying question to the UI in preference to attempting an interpretation. Depends on LLM discretion. |

---

### US-A5c: Generate Final Output (PDF + ATS DOCX)

| Criterion | Status | Evidence |
| --- | --- | --- |
| PDF and ATS DOCX generated from the layout-confirmed HTML | ✅ Pass | `state-manager.js:381` `markFinalGenerated()` follows `markLayoutConfirmed()`; generation routes use the confirmed HTML as source |
| File naming follows `CV_{CompanyName}_{Role}_{Date}` convention; ATS adds `_ATS` | ✅ Pass | `generation_routes.py` and `cv_orchestrator.py` implement the naming convention |
| All three formats available as download links on completion | ✅ Pass | `web/download-tab.js` renders download links for HTML/PDF/DOCX |
| Progress indicator shown within 1 s | ✅ Pass | LLM busy overlay activates immediately during final generation |
| Errors surface as user-visible messages | ✅ Pass | `web/final-generate.js` renders error banners |
| `metadata.json` updated with generation timestamps for each format | ✅ Pass | `generation_routes.py:1925` writes generation timestamps and file paths to metadata |

---

### US-A6: Review and Iteratively Refine Generated Output

| Criterion | Status | Evidence |
| --- | --- | --- |
| Feedback can trigger targeted re-entry into rewrite review OR content customisation | ✅ Pass | `scripts/routes/job_routes.py:753` `/api/back-to-phase`; `conversation_manager.py:1391–1424` `back_to_phase()` navigates to a specific prior step; `web/workflow-steps.js:96–128` `backToPhase()` UI |
| Previously approved decisions preserved as defaults when re-entering a review step | ✅ Pass | `web/workflow-steps.js:152–153` confirm modal note: "All existing approvals and rewrites are preserved as context"; `conversation_manager.py:1391–1424` preserves all state on back-navigation |
| Each regeneration cycle updates the archive and `metadata.json` | ✅ Pass | Archive updates and metadata re-written on each generation call |
| Layout-only instructions directed to US-A5b, not treated as content changes | ✅ Pass | Separate `/api/layout/instruct` endpoint distinct from content pipeline; `web/layout-instruction.js` handles layout step exclusively |

---

### US-A7: Generate Cover Letter

| Criterion | Status | Evidence |
| --- | --- | --- |
| Prior same-tone or same-role-type cover letter surfaced with "use as starting point" prompt | ✅ Pass | `web/cover-letter.js:52–69` — fetches `/api/cover-letter/prior`; renders prior sessions as radio-button cards for selection; `cover-letter.js:242–246` `reuse_body` sent to generation API |
| Tone matches selection from at least 4 preset options | ✅ Pass | `web/cover-letter.js:19–25` — 5 preset tone options: startup/tech, pharma/biotech, academia, financial, leadership |
| Hiring manager name appears in salutation if provided | ✅ Pass | `web/cover-letter.js:112–116` — `hiring_manager` input field sent to `/api/cover-letter/generate` and passed to LLM context |
| Cover letter references specific skills/achievements from approved CV content | ✅ Pass | `master_data_routes.py:1522` — `post_analysis_answers` and session customisations passed as LLM context |
| LLM has access to session's `clarification_answers` when generating | ✅ Pass | `master_data_routes.py:1522` reads `post_analysis_answers` from session state |
| Editable before saving | ✅ Pass | `web/cover-letter.js:146–148` — generated text rendered in editable textarea; Save button present |
| Saved to archive as `.docx`, `.pdf`, and `cover_letter_text` in `metadata.json` | ✅ Pass | `master_data_routes.py` saves cover letter files to archive; `cover_letter_text` written to `metadata.json` |
| `metadata.json` records `cover_letter_reused_from` (prior session ID or null) | ✅ Pass | `conversation_manager.py:106` `'cover_letter_reused_from': None`; `master_data_routes.py` writes this field on save |

---

### US-A8: Handle Application Screening Questions

| Criterion | Status | Evidence |
| --- | --- | --- |
| Semantically similar prior responses surfaced per question before generating fresh | ✅ Pass | `web/screening-questions.js:131–156` `searchForQuestion()` calls `/api/screening/search`; renders "Similar prior response found" banner with opt-in checkbox per question |
| At least 3 relevant experience matches shown per question with match scores | ✅ Pass | `web/screening-questions.js:162–174` — experience cards rendered with `% match` score badges; cards are selectable checkboxes |
| All three response formats available with word-count guidance shown in UI | ✅ Pass | `web/screening-questions.js:112` `_fmtLabel()` shows "Direct/Concise (150–200w)", "STAR (250–350w)", "Technical Detail (400–500w)" |
| LLM has access to session's `cover_letter` and `clarification_answers` when generating | ✅ Pass | Backend screening generation reads `post_analysis_answers` and session cover-letter state |
| Format and experience choices persist per question | ✅ Pass | `web/screening-questions.js:16–21` — `_screeningState[idx]` object persists per-question state across interactions within the tab |
| Responses editable before saving | ✅ Pass | Draft appears in editable textarea per question |
| All responses exported together in one DOCX file | ✅ Pass | `/api/screening/save-all` referenced in `screening-questions.js` |
| Each finalized response stored in `metadata.json` as structured object | ✅ Pass | `conversation_manager.py:108` `'screening_responses': []`; `generation_routes.py:1926` writes to metadata |
| `~/CV/response_library.json` updated with finalized response after saving | ✅ Pass | `generation_routes.py:1936` upserts to `response_library.json` on finalise |

---

### US-A9: Finalise, Archive, and Submit

| Criterion | Status | Evidence |
| --- | --- | --- |
| Archive folder contents reviewable in UI | ✅ Pass | `web/finalise.js:65–79` — lists generated files with paths in a styled panel |
| Status transitions `draft → ready → sent` persistent in `metadata.json` | ✅ Pass | `web/finalise.js:89–93` — dropdown with draft/ready/sent options; `generation_routes.py:1929` validates and writes to metadata |
| Notes field saved | ✅ Pass | `web/finalise.js:97–101` — textarea; sent to `/api/finalise` |
| Git commit created automatically with all artefacts | ✅ Pass | `generation_routes.py:1985` `subprocess.run(['git', '-C', ..., 'commit', '-m', commit_msg])`; `finalise.js:170–173` shows commit hash in confirmation summary |
| Summary shows keyword match score vs. job description | ✅ Pass | `web/finalise.js:20–38` `_renderFinaliseAtsItems()` shows ATS overall %, hard-requirement %, soft-requirement %, and keyword coverage detail |

---

### US-A10: Update Master CV Data

| Criterion | Status | Evidence |
| --- | --- | --- |
| Navigate to Manage Master Data section | ✅ Pass | `web/index.html:220` — "📚 Master CV" tab; `web/master-cv.js` populates it |
| Type a natural-language update: "I just finished a project… Add it to my achievements." | ❌ Fail | `web/master-cv.js` implements only a structured form editor (modal dialogs for add/edit/delete of skills, achievements, experiences). No natural-language text input that converts free text to JSON changes exists anywhere in the reviewed source. |
| Paste an existing document (old CV, LinkedIn export) for bulk ingestion | ❌ Fail | No document paste/upload flow for master data found in `web/master-cv.js` or reviewed backend routes. Structured field-by-field editing only. |
| System shows proposed JSON changes before writing | ⚠️ Partial | For structured edits, confirmation modals are used, but no rendered "proposed JSON diff" view as the story describes for natural-language or document-ingestion updates. |
| Git commit on every confirmed update | ✅ Pass | `scripts/routes/master_data_routes.py` routes perform git commit after each master data write |

---

### US-A11: Session Master Data Harvest

| Criterion | Status | Evidence |
| --- | --- | --- |
| Session harvest prompt appears automatically after Finalise; skippable | ✅ Pass | `web/finalise.js:193–194` `showHarvestSection()` called after successful finalise; section appears inline below the confirmation; user can proceed without acting |
| Candidate write-back items compiled from: approved rewrites, skill additions, summary rewrites, clarification-answer-revealed skills | ✅ Pass | `scripts/routes/generation_routes.py` `_compile_harvest_candidates()` gathers `improved_bullet`, `new_skill`, `skill_gap_confirmed`, `summary_variant` types from session state |
| No item pre-selected — every write-back is explicit opt-in | ✅ Pass | `web/harvest.js:104–106` `shouldPreCheck()` returns `false` unconditionally; `harvest.js:138` — `checked = ''` for every candidate; all checkboxes render unchecked |
| Each candidate shows before/after diff with human-readable rationale | ✅ Pass | `harvest.js:165–175` renders "Before" and "After" blocks side-by-side; `harvest.js:144–150` shows reasoning toggle (💬 button) for candidates with LLM analysis |
| Consolidated JSON diff shown before any write | ⚠️ Partial | `harvest.js:491–507` `applyHarvestSelections()` — user checks items and clicks "Apply Selected to Master CV"; `showConfirmModal()` presents item count and a one-line warning. No rendered JSON diff of actual key/value changes is shown before write. |
| No blind writes — explicit confirmation required | ✅ Pass | User must check checkboxes and click Apply; a confirm dialog is shown before `/api/harvest/apply` is called |
| Items user declines are never written | ✅ Pass | Only checked items sent to `/api/harvest/apply` (`generation_routes.py:2090–2095`) |
| Git commit on every confirmed harvest | ✅ Pass | `generation_routes.py:2188` — git commit after harvest write |
| Harvest step skippable if no meaningful improvements generated | ✅ Pass | User can navigate away or finalise without clicking Apply; harvest section is additive |

---

### US-A12: Re-enter and Re-run Earlier Workflow Stages

**Cycle 6 verification — GAP-167 (↻ re-run button, commit 3057ea8):**
`web/workflow-steps.js:705–707` now renders ↻ as `<button class="step-rerun" aria-label="Re-run ${rerunLabel}" …>↻</button>`. The dynamically injected style (`workflow-steps.js:737`) adds `:focus-visible { outline: 2px solid #3b82f6; … opacity: 1 !important; }` and `.step.completed:focus-within .step-rerun { opacity: 1 !important; }`. This means a keyboard user who Tab-focuses the parent `.completed.step` pill will expose the ↻ button (via `:focus-within`), and further Tab into the button to reach it. The button is now keyboard-reachable. However, there is still no keyboard shortcut (e.g., `accesskey`, global `keydown` handler, or menu entry) that can trigger re-run independently of navigating to the progress bar — the acceptance criterion calls for a "keyboard shortcut or menu, not only via the progress indicator."

| Criterion | Status | Evidence |
| --- | --- | --- |
| Re-run affordance visible for each completed stage in the workflow progress indicator | ✅ Pass | `web/workflow-steps.js:619–620` `RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite', 'spell'])` — ↻ button rendered next to each completed step in this set; `confirmReRunPhase(step)` invoked on click |
| Confirmation dialogue lists which downstream stages contain decisions that could be affected | ✅ Pass | `web/workflow-steps.js:133–188` `_showReRunConfirmModal()` — filters `_STEP_ORDER` for completed downstream steps and renders them as a list |
| Re-running a stage does not silently discard any previously approved decision | ✅ Pass | `conversation_manager.py:1447` `_build_downstream_context()`; confirm modal note: "All existing approvals and rewrites are preserved as context" |
| LLM re-run receives full session context: job text, clarification answers, downstream decisions | ✅ Pass | `conversation_manager.py:1426–1519` `re_run_phase()` — `_build_downstream_context()` includes approved rewrites, omitted experiences, omitted skills, and accepted spell fixes as LLM context |
| After re-run, only changed or new items highlighted; unchanged items remain approved | ✅ Pass | `web/workflow-steps.js:325–388` `_highlightChangedItems()` — compares prior vs new output by ID; marks DOM elements `data-changed` with animation; unchanged items untouched |
| Clarification answers can be amended when triggering a re-run of the Analysis stage, without a separate step | ⚠️ Partial | `conversation_manager.py:1450–1463` — analysis re-run uses existing `post_analysis_answers` as-is. The re-run confirm modal (`workflow-steps.js:133–188`) does not include an inline affordance for amending specific clarification answers before proceeding; user must navigate to the Questions tab separately |
| Session state records each re-run event: stage name, timestamp, previous clarification answers (if changed), and affected item count | ⚠️ Partial | `conversation_manager.py:1458–1463` sets `iterating=True` and `reentry_phase`; no explicit structured audit log entry (with timestamp, prior answers snapshot, and affected-item count) is created per re-run |
| Re-run affordance accessible via keyboard shortcut or menu, not only via the progress indicator | ⚠️ Partial | GAP-167 (commit 3057ea8) converted the ↻ icon to a `<button>` with `aria-label` and `:focus-visible`/`:focus-within` visibility — keyboard users can now Tab to the ↻ button via the progress indicator. However no independent keyboard shortcut (`accesskey`, global `keydown`, or menu item) exists outside the progress bar, which is what the acceptance criterion requires. |

---

## Generated Materials Evaluation

### Output Quality (from source evidence)

- **File naming** (`CV_{Company}_{Role}_{Date}`, ATS adds `_ATS`): ✅ `generation_routes.py` + `cv_orchestrator.py`
- **ATS DOCX: single-column plain text**: ✅ Settings option `settings-format-ats-docx` (`ui-core.js:137`) and orchestrator ATS generation path
- **Metadata completeness on finalise**: ✅ `generation_routes.py:1926` writes `clarification_answers`, `rewrite_audit`, `spell_audit`, `cover_letter_text`, `screening_responses`, `cover_letter_reused_from`, generation timestamps, status, and notes
- **Publications heading** (D7.4 amendment): "Publications" / "Selected Publications" rules implemented; count notation `(N of M)` removed per MEMORY.md
- **Schema.org JSON-LD in HTML `<head>`** (US-A5a criterion): Not directly verifiable from the seven primary source files reviewed (would require inspecting the CV HTML template in `cv_orchestrator.py`)

---

## Terminology Evaluation

| Term / Label | Finding |
| --- | --- |
| `"LLM: …"` (model selector button, `index.html:52`) | Developer-centric; "AI Model" would be more accessible for non-technical applicants |
| `"⚙️ Recommend Customizations"` (action button, `index.html:183`) | Slightly implementation-centric; "Get AI Recommendations" would be more applicant-facing |
| **`"Generate Preview →"`** (spell-check submit, `index.html:186`) | ✅ Fixed in GAP-169 (commit 3057ea8) — previously "Done — Generate CV →" which was misleading; now accurately describes the destination |
| `"🌾 Harvest"` (workflow step `index.html:141`; tab `index.html:225`) | Metaphorical/developer-facing; "Update Master Profile" would be more transparent to an applicant |
| `"✏️ Experience Bullets"` (tab label, `index.html:205`) | Overly technical; "Edit Experience Details" is clearer |
| `"⬇️ File Review"` vs `"⬇️ Download"` (tab `index.html:218`; step `index.html:131`) | Inconsistency: the workflow step bar says "Download" but the tab label says "File Review". One label should be chosen consistently. |
| `"📂 Sessions"` (header button) | Technical; "My Applications" might be more applicant-friendly, though "Sessions" is not opaque |
| `"ATS Score"` / `"ATS Report"` | Acceptable — applicants applying to jobs understand ATS |
| `"🎨 Layout Review"` | Clear and non-technical |
| `"📋 Job Input"` | Clear and explicit |
| `"📩 Cover Letter"` | Clear |
| `"🔤 Spell Check"` | Clear |
| `"✅ Proceed to Finalise →"` | UK English "Finalise"; US applicants read as "Finalize" — acceptable given the project's established convention |

---

## Cycle 6 Fix Verification Summary

| GAP / Item | Cycle 6 status |
| --- | --- |
| GAP-167: ↻ re-run `<span>` → `<button aria-label>` with `:focus-visible`/`:focus-within` | ✅ Fixed — `web/workflow-steps.js:705–707, 737` |
| GAP-169: spell-check CTA "Done — Generate CV →" → "Generate Preview →" | ✅ Fixed — `web/index.html:186` |
| GAP-170: `aria-live="polite" role="status"` on `#llm-busy-label` | ✅ Fixed — `web/index.html:155` |
| GAP-171: `aria-label` on category ↑/↓ reorder buttons in skills-review | ✅ Fixed — `web/skills-review.js:423–424` |
| GAP-172: `<span class="sr-only">` per step pill for screen-reader state | ✅ Fixed — `web/workflow-steps.js:715–725` |
| GAP-173: `:focus-visible` rules on `.action-btn`, `.tab`, `.step` | ✅ Fixed — `web/styles.css` |
| US-A10: Natural-language master CV update | ❌ Still not implemented |
| US-A12: Re-run ↻ keyboard shortcut independent of progress bar | ⚠️ Partially addressed — button now keyboard-reachable via progress bar; no independent shortcut |
| US-A11: Consolidated JSON diff before harvest write | ⚠️ Still count-only confirmation dialog |
| US-A3: Publications up/down reorder buttons | ⚠️ Still absent |
| US-A1: Session "queued" status | ⚠️ Still absent — enum is `draft/ready/sent` only |
| US-A12: Per-re-run structured audit log | ⚠️ Still not implemented |

---

## Additional Story Gaps / Proposed Story Items

1. **GAP: Session "queued" status (US-A1)** — No `queued` or `parked` session state exists. The status enum (`draft/ready/sent`) at `generation_routes.py:1929` does not include a value for "saved before analysis begins". Add `queued` as a status set on first job submission and cleared when analysis starts.

2. **GAP: Enforced mismatch clarifying questions (US-A2)** — The LLM clarifying-question prompt (`conversation_manager.py:654–677`) does not explicitly require a skill-gap question when a required skill is absent from master data. The mismatch callout banner is UI-only. Consider a deterministic pre-pass before question generation to guarantee at least one gap question when mismatches are detected.

3. **GAP: Natural-language Master CV update (US-A10)** — Free-text "I just completed X, add it to my master CV" and document-ingestion (paste old CV / LinkedIn export) are entirely absent. Only structured form editing exists in `web/master-cv.js`.

4. **GAP: JSON diff before harvest write (US-A11)** — The story calls for a consolidated JSON diff preview before writing selected harvest items. `harvest.js:491–507` shows only an item count in the confirmation dialog, not the actual key/value changes that would be written.

5. **GAP: Clarifications amendment at re-run trigger (US-A12)** — When triggering a re-run of Analysis, there is no inline affordance to amend specific clarification answers in the confirm modal (`workflow-steps.js:133–188`). User must navigate to the Questions tab separately before the re-run.

6. **GAP: Keyboard shortcut for re-run independent of progress bar (US-A12)** — The ↻ button (now a proper `<button>`) is reachable by keyboard via the progress bar, but the acceptance criterion calls for "a keyboard shortcut or menu, not only via the progress indicator." No `accesskey`, global `keydown` handler, or application menu for re-run exists in the reviewed source.

7. **GAP: Re-run structured audit log (US-A12)** — The story requires session state to record each re-run event with: stage name, timestamp, previous clarification answers (if changed), and count of downstream items affected. Currently only `iterating=True` and `reentry_phase` are set (`conversation_manager.py:1458–1463`).

8. **GAP: Publications up/down reorder (US-A3)** — Publications table (`web/publications-review.js`) has no user-controllable ↑/↓ reorder buttons. The story requires reorder controls like those on other content tables.

9. **TERMINOLOGY: "File Review" vs "Download" label inconsistency** — The workflow step bar uses "⬇️ Download" (`index.html:131`) but the tab label reads "⬇️ File Review" (`index.html:218`). One label should be chosen and used consistently across both navigation areas.

10. **TERMINOLOGY: "🌾 Harvest" label** — Metaphorical and developer-facing. Consider "Update Master Profile" for clarity with non-technical applicants.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/harvest.js, web/review-table-base.js, web/ui-helpers.js, web/workflow-steps.js, web/rewrite-review.js, web/spell-check.js, web/skills-review.js, web/publications-review.js, web/finalise.js, web/screening-questions.js, web/cover-letter.js, web/message-dispatch.js, web/job-input.js, scripts/routes/job_routes.py, scripts/routes/generation_routes.py, scripts/routes/master_data_routes.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| --- | --- | --- | --- | --- | --- |
| US-A1 | 3 | 1 | 0 | 0 | 0 |
| US-A2 | 6 | 1 | 0 | 0 | 0 |
| US-A3 | 7 | 2 | 0 | 0 | 0 |
| US-A3b | 9 | 1 | 0 | 1 | 0 |
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
| US-A12 | 5 | 3 | 0 | 0 | 0 |
| **Total** | **96** | **13** | **2** | **1** | **0** |

**Key evidence references:**
- URL fetch + protected-site warning: `scripts/routes/job_routes.py:221–301`
- Intake confirmation (editable role/company/date): `scripts/utils/conversation_manager.py:1357,1908–1925`
- Session status enum (no "queued"): `scripts/routes/generation_routes.py:1929`
- Mismatch callout UI: `web/review-table-base.js:304–310`
- Prior clarifications pre-population: `web/message-dispatch.js:498–509`
- Clarification answers in downstream calls: `conversation_manager.py:1469`
- Publications table (no reorder): `web/publications-review.js:91–105`
- Weak-evidence skill-add badge: `web/rewrite-review.js:263–265`
- Submit gated on all-actioned: `web/rewrite-review.js:408–411`
- Harvest opt-in (all unchecked): `web/harvest.js:104–106, 138`
- Harvest confirm dialog (count-only, no JSON diff): `web/harvest.js:491–507`
- Re-run button (now `<button aria-label>`, GAP-167): `web/workflow-steps.js:705–707, 737`
- Re-run confirm modal + downstream list: `web/workflow-steps.js:133–188`
- Re-run changed-item highlight: `web/workflow-steps.js:325–388`
- Re-run audit log (incomplete): `conversation_manager.py:1458–1463`
- Natural-language master CV update: absent from `web/master-cv.js`
- "Generate Preview →" label (GAP-169 fix): `web/index.html:186`
- "File Review" vs "Download" inconsistency: `web/index.html:131, 218`
