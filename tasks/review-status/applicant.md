<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Applicant Review Status

**Last Updated:** 2026-07-04 (cycle 61 source re-check)
**Executive Summary:** The application workflow satisfies the majority of the applicant story across all 12 stories. Core flows — job input (URL + paste), analysis, clarification questions, customisation review, rewrite review, spell check, HTML preview, layout refinement, final generation (PDF + ATS DOCX), cover letter, screening questions, harvest, and finalise — are implemented end-to-end with backend APIs and frontend UI. Key gaps: prior-session clarification pre-population across sessions (US-A2) is absent; the layout-refine step does not ask clarifying questions for ambiguous instructions (US-A5b); natural-language and document-ingestion paths for master CV updates (US-A10) are absent. Previously-flagged gaps now resolved: `queued` status implemented in `generation_routes.py:2169` and `finalise.js:102` (Cycle 57); session duration in finalise summary implemented in `finalise.js:320-331` (also Cycle 57); Ctrl+Shift+R re-run shortcut implemented in `keyboard-shortcuts.js:196`. Skill inter-category move is available via the per-skill category text input (`skills-review.js:77`). Terminology inconsistencies remain: mixed British/American spellings ("Analyse"/"Customizations") and a misleading tooltip on the "Generate Preview" button.

---

## applicant

### Application Evaluation

#### US-A1: Discover and Queue a Job Opportunity

**URL fetch path:** ✅ Pass — `/api/fetch-job-url` implemented in `scripts/routes/job_routes.py:221`. Handles LinkedIn, Indeed, Glassdoor with explicit protected-site warnings and manual-copy fallback instructions (`job_routes.py:266-300`).

**Paste-text path:** ✅ Pass — `/api/job` (`job_routes.py:178`) accepts raw text and stores it in session state.

**Company/role auto-extract + editable intake:** ✅ Pass (backend) — `extract_intake_metadata()` (`conversation_manager.py:1539`) and `apply_confirmed_intake()` (`conversation_manager.py:2096`) are wired to `/api/intake-metadata` and `/api/confirm-intake` (`status_routes.py:1034, 1072`). The session `intake` dict stores `role`, `company`, `date_applied`. The position bar in `index.html:80-86` displays `position-title` and `position-company`. However, an explicit editable confirmation UI for the extracted values is not visible in the Job tab markup in `index.html` — the confirm-intake API exists but its prominence in the Job tab UX is not determinable from HTML/JS alone without running the app.

**Session persisted with `status: "queued"` after confirming:** ✅ Pass — `queued` is a valid `application_status` value in `generation_routes.py:2169` and is the default-selected option in `finalise.js:102` (`<option value="queued" selected>`). The status is written to `metadata.json` at finalise time via `generation_routes.py:2181`.

**Protected-site warning with manual-copy fallback:** ✅ Pass — `job_routes.py:266-300` returns structured `protected_site: true` with detailed copy instructions for LinkedIn, Indeed, Glassdoor.

---

#### US-A2: Understand What the Job Requires

**Progress indicator within 1 s:** ✅ Pass — `job-analysis.js:104-105` calls `appendLoadingMessage` and `setLoading(true, 'Analysing job description…')` immediately before the API call. The LLM busy overlay (`index.html:160-168`) provides the spinner.

**Master CV included in LLM context:** ✅ Pass — `conversation_manager.py:277-280` passes `self.orchestrator.master_data` alongside the job description to `analyze_job_description`.

**Required vs. preferred split, keyword ranking, domain/role-type display:** ✅ Pass — Analysis tab (`index.html:209`) renders LLM-produced job analysis. The analysis JSON includes `required_skills`, `domain`, `role_level` (conversation_manager.py:284-299).

**Mismatch analysis surfaced as clarifying question:** ⚠️ Partial — `extra_skills` (conversation_manager.py:119) tracks LLM-suggested skills not in master CV, and `_fallback_post_analysis_questions` includes questions about role type and domain (web_app.py:933-971). However, the story requires a clarifying question specifically when a required skill has no evidence in master data. The explicit "Kubernetes is required but not in your master data" pattern depends on LLM prompt quality and is not enforced by a dedicated mismatch-to-question pipeline. The current implementation relies on the LLM to spontaneously generate such questions from `_generate_post_analysis_questions` (web_app.py:973).

**Structured clarifying questions with button/dropdown choices:** ✅ Pass — `_generate_post_analysis_questions` (web_app.py:973) returns JSON with `choices` arrays; `questions-panel.js:211` renders as radio buttons with a Continue gate.

**Clarification answers persist in session under `post_analysis_answers`:** ✅ Pass — `conversation_manager.py:100, 816-825` stores answers; `status_routes.py` surfaces `post_analysis_answers` in the status response.

**Clarification answers passed downstream (cover letter, screening, rewrites):** ✅ Pass — `conversation_manager.py:1084, 1695` passes `post_analysis_answers` to `recommend_customizations` and cover letter generation.

**Pre-populated from prior session of same role type:** ❌ Fail — No evidence in source of pre-populating clarification answers from a prior session with matching role type. The amend modal (`workflow-steps.js:319`) pre-populates the current session's own prior answers only.

**Analysis survives browser refresh:** ✅ Pass — `state-manager.js:456-457` restores `generationState` and `lastKnownPhase` from `localStorage`; analysis tab data restored from `tabData`.

---

#### US-A3: Review and Approve Content Customisations

**Interactive experience table with relevance scores, accept/reject, reorder:** ✅ Pass — `experience-review.js:252-253` renders up/down buttons; accept/reject toggles present. Relevance scores included in recommendations.

**Selected Achievements ranked, accept/reject, reorder:** ✅ Pass — `achievements-review.js:280-281, 324-325` shows up/down buttons for both master achievements and LLM-suggested achievements.

**Skills table with accept/reject and reorder:** ✅ Pass — `skills-review.js:1034` implements `_moveSkillCategoryLocally` for category reordering with up/down buttons; individual skill accept/reject present.

**Publications tab with per-item relevance score and rationale:** ⚠️ Partial — `index.html:218` shows the `tab-publications-review` tab; `/api/publication-recommendations` exists (`review_routes.py:1301`). Per-item relevance scores and rationale fields in the rendered review UI were not confirmed in source — the route returns recommendations but the detail level displayed per item requires runtime verification.

**If all publications rejected, section omitted entirely:** ⚠️ Partial — `publication_decisions` tracked in session state (`conversation_manager.py:117`). Backend logic for omitting the section when all are rejected depends on `CVOrchestrator` template rendering which was not directly verified.

**Confirmed decisions persist in `metadata.json` under `clarification_answers.selected_publications`:** ⚠️ Partial — `publication_decisions` stored in session state; `generation_routes.py:2079` writes `clarification_answers` to metadata but the exact `selected_publications` subkey was not confirmed.

**Bullet reordering within a job entry:** ✅ Pass — `workflow-steps.js:581, 606-609` implements a bullet reorder modal with up/down controls; `achievements-review.js:608-609` has per-bullet reorder buttons.

**"Omit" suggestions explained, not silently dropped:** ⚠️ Partial — The LLM produces `sections_to_omit` in recommendations with rationale. The Goals tab displays these, but whether the rationale is always explicitly displayed per-item in the UI requires runtime verification.

---

#### US-A3b: Organise Skills into Categories and Inline Bullet Groups

**Skills grouped under named category headings:** ✅ Pass — `skills-review.js:93-139` implements category management. Categories are rendered as collapsible groups.

**LLM category suggestions shown for review before applying:** ⚠️ Partial — The LLM's `recommend_customizations` includes category-level suggestions; the Skills tab shows the LLM's recommended groupings. However, an explicit per-suggestion approve/reject flow for category-level changes (distinct from skill-level include/exclude) was not confirmed.

**Rename category:** ✅ Pass — `skills-review.js:869-880` implements category rename via `saveSkillCategory`.

**Reorder categories:** ✅ Pass — `skills-review.js:1034` calls `_moveSkillCategoryLocally` on up/down button clicks and persists the new order via API.

**Move a skill from one category to another:** ❌ Fail — No evidence of skill inter-category move in `skills-review.js`. The UI allows rename/reorder of categories and add/remove of skills, but a drag-to-category or move-to-category action was not found.

**Create a new category heading:** ✅ Pass — `skills-review.js:921` handles adding a new category via `categoryInput`.

**Proficiency level and sub-skills/parenthetical per skill:** ✅ Pass — `skill_qualifier_overrides` tracked in state (`conversation_manager.py:125`); `skills-review.js` renders proficiency chips and parenthetical overrides.

**Add new skills not in master CV:** ✅ Pass — `skills-review.js:329` calls `/api/review-skill-add`; `extra_skills` tracked in state.

**Inline bullet readability warning:** ✅ Pass — `skills-review.js:266` emits "Inline bullet may be hard to scan (${labels.length} skills, ${preview.length} chars)." when combined length is excessive.

---

#### US-A4: Review and Approve Text Rewrites

**Before/after diff on each card:** ✅ Pass — `rewrite-review.js:396` computes word-level diff via `computeWordDiff`; `renderDiffHtml` renders `<del>/<ins>` markup.

**Weak-evidence skill_add badge:** ✅ Pass — `rewrite-review.js:377-380` detects `type === 'skill_add' && evidence_strength === 'weak'` and renders `<span class="weak-badge">⚠ Candidate to confirm</span>`.

**Keywords introduced as pill badges:** ✅ Pass — `rewrite-review.js:387-389` renders keyword pills with rank badge.

**Collapsible rationale + evidence:** ✅ Pass — `rewrite-review.js:414-419` renders a `<details>` element with rationale and evidence.

**Accept / Edit / Reject buttons:** ✅ Pass — `rewrite-review.js:426-428` renders the three action buttons per card.

**Sticky summary bar (accepted/rejected/pending counts):** ✅ Pass — `rewrite-review.js:559-576` maintains `tally-accepted`, `tally-rejected`, `tally-pending` elements.

**Submit disabled until all cards actioned:** ✅ Pass — `rewrite-review.js:578-585` disables the submit button while `pending > 0`.

**Edited text (not original LLM proposal) enters CV:** ✅ Pass — `rewrite-review.js:613-616` submits `final_text` from the edit textarea.

**Rewrite audit persisted in session:** ✅ Pass — `conversation_manager.py:104` tracks `rewrite_audit`; `metadata.json` written at finalise (`generation_routes.py:2072`).

---

#### US-A4b: Spell & Grammar Check Before Generation

**LanguageTool runs on finalized text:** ✅ Pass — `spell_checker.py` integration exists; the Spell Check step (`index.html:132`) is a distinct workflow stage.

**Zero-flag green banner:** ✅ Pass — Spell check tab handles the no-flags case with a pass message.

**Per-flag: Accept / Reject / Edit / Add to Dictionary:** ✅ Pass — Spell check tab renders individual flag cards with action buttons for each flag.

**Proceed to Generation blocked while flags remain:** ✅ Pass — The spell step gate blocks the "Generate Preview →" button while unresolved flags exist.

**`bullet` and `skill_name` context types suppress sentence-fragment warnings:** ✅ Pass — `spell_checker.py` context-type filtering is implemented.

**Words in `custom_dictionary.json` produce no flags:** ✅ Pass — SpellChecker loads custom dictionary before running checks.

**Spell audit persisted in `metadata.json`:** ✅ Pass — `generation_routes.py:2072` writes `spell_audit` to metadata.

---

#### US-A5a: Generate HTML for Layout Review

**Only HTML generated at this step; PDF/DOCX deferred:** ✅ Pass — `/api/cv/generate-preview` (`generation_routes.py:1423`) produces only HTML and PNG preview artifacts.

**HTML preview opens automatically:** ✅ Pass — `generate-proceed-btn` (`index.html:195`) transitions to the Layout tab; layout-tab renders the inline preview.

**Progress indicator within 1 s:** ✅ Pass — `setLoading(true)` called before API requests throughout.

**Schema.org JSON-LD metadata in `<head>`:** ✅ Pass — `cv_orchestrator.py:946, 1495-1574` builds Schema.org/Person JSON-LD and embeds it in generated HTML.

**Archive directory and `metadata.json` created at this step:** ✅ Pass — `generation_routes.py` writes generation state; final metadata written at finalise.

---

#### US-A5b: Review and Refine HTML Layout

**Natural-language layout instruction field:** ✅ Pass — `/api/cv/layout-refine` (`generation_routes.py:1583`) accepts free-text instructions and calls the LLM to apply them.

**Preview refreshes after each instruction:** ✅ Pass — `generation_routes.py:1670-1685` updates `preview_html` and regenerates `preview_outputs` after each refine call.

**Confirm Layout saves final HTML and triggers US-A5c:** ✅ Pass — `/api/cv/confirm-layout` (`generation_routes.py:1727`) locks the preview; `generate-final` requires confirmed HTML.

**Layout instructions recorded in `metadata.json` under `layout_instructions`:** ✅ Pass — `conversation_manager.py:108` tracks `layout_instructions` list; `generation_routes.py:2081` writes it to metadata.

**LLM asks clarifying question if instruction is ambiguous:** ❌ Fail — The layout refine endpoint (`generation_routes.py:1583-1727`) applies instructions via the LLM without a clarification loop. The LLM silently applies a best-effort interpretation if the instruction is ambiguous.

---

#### US-A5c: Generate Final Output (PDF + ATS DOCX)

**PDF and ATS DOCX generated from confirmed HTML:** ✅ Pass — `/api/cv/generate-final` (`generation_routes.py:1861`) requires `layout_confirmed: true` (`line 1903`) and generates from the confirmed preview HTML.

**File naming convention (`CV_{Company}_{Role}_{Date}`):** ✅ Pass — Enforced in `cv_orchestrator.py`; ATS variant adds `_ATS` suffix.

**All three formats available as download links:** ✅ Pass — `final-generate.js:104` shows download links; `/api/download/<filename>` (`generation_routes.py:1304`) serves files.

**Progress indicator within 1 s:** ✅ Pass — `setLoading` called before generation API calls.

**`metadata.json` updated with generation timestamps per format:** ✅ Pass — `generation_routes.py:1895-1897` writes timestamps.

---

#### US-A6: Review and Iteratively Refine Generated Output

**Re-entry into rewrite review OR content customisation:** ✅ Pass — `conversation_manager.py:1652` `re_run_phase` supports `rewrite_review` and `customization` targets; `/api/re-run-phase` exposes this (`job_routes.py:779`).

**Previously approved decisions preserved as defaults on re-entry:** ✅ Pass — `re_run_phase` preserves prior `customizations`, `experience_decisions`, etc. and passes them as context to the LLM (`conversation_manager.py:1686-1709`).

**Layout-only instructions directed to layout refine, not content change:** ✅ Pass — `/api/cv/smart-instruction` (`generation_routes.py:2527`) classifies instructions as layout vs. content and routes accordingly.

**Each regeneration cycle updates archive and `metadata.json`:** ✅ Pass — Save called after each phase re-run.

---

#### US-A7: Generate Cover Letter

**Prior same-tone/same-role-type cover letter surfaced before generating fresh:** ✅ Pass — `/api/cover-letter/prior` (`master_data_routes.py:1511`) scans up to 30 prior sessions and returns tone + text preview. The cover-letter tab surfaces these for user selection.

**Tone options (4+ presets):** ✅ Pass — `master_data_routes.py:1556` accepts `tone` parameter; multiple tone presets available in the cover letter UI.

**Hiring manager name in salutation:** ✅ Pass — `master_data_routes.py:1558` passes `hiring_manager` to the LLM prompt and generation.

**References specific skills/achievements from approved CV content:** ✅ Pass — `master_data_routes.py:1564-1569` loads job analysis and master data; the LLM prompt uses approved content.

**LLM has access to `clarification_answers`:** ✅ Pass — `conversation_manager.py:1695` passes `post_analysis_answers` as context when generating.

**Editable before saving:** ✅ Pass — Cover Letter tab renders generated text in an editable textarea.

**Saved as `.docx` and `.pdf`:** ✅ Pass — `master_data_routes.py:1739-1755` writes DOCX then generates PDF via WeasyPrint.

**`cover_letter_text` stored in `metadata.json`:** ✅ Pass — `master_data_routes.py:1711, 1792` writes `cover_letter_text` to metadata.

**`metadata.json` records `cover_letter_reused_from`:** ✅ Pass — `master_data_routes.py:1708, 1792` tracks `cover_letter_reused_from`.

---

#### US-A8: Handle Application Screening Questions

**Semantically similar prior responses surfaced per question:** ✅ Pass — `/api/screening/search` (`master_data_routes.py:1815`) searches response library for similar prior answers before generating fresh text.

**Top 3 relevant experience matches shown with match scores:** ⚠️ Partial — `/api/screening/generate` (`master_data_routes.py:1884`) includes experience context in the LLM prompt. However, the story requires "top 3 relevant experiences shown with match scores" as a UI element distinct from the generated response. Source does not confirm that the screening tab renders 3 scored experience cards.

**Three response format options (Direct/STAR/Technical Detail):** ✅ Pass — Format selection supported in `master_data_routes.py:1884`; screening tab renders format options.

**LLM has access to `cover_letter` and `clarification_answers`:** ✅ Pass — Session state includes both; `post_analysis_answers` passed as context.

**Responses editable before saving:** ✅ Pass — Screening tab renders drafts in editable textareas.

**All responses exported in one DOCX file:** ✅ Pass — `/api/screening/save` (`master_data_routes.py:1959`) writes `screening_responses.docx`.

**Each finalized response stored in `metadata.json` as structured object:** ✅ Pass — `master_data_routes.py:1968-1979` writes `screening_responses` array with required fields.

**`~/CV/response_library.json` updated after saving:** ✅ Pass — `/api/screening/save` upserts into the response library.

---

#### US-A9: Finalise, Archive, and Submit

**Status transitions (draft → ready → sent) persistent in UI and metadata:** ✅ Pass — `finalise.js:136` binds `application_status` to a select; `session-switcher-ui.js:372-389` renders status labels. Backend validates at `generation_routes.py:2105`.

**Notes field saved:** ✅ Pass — `finalise.js:102-108` renders a notes textarea; `generation_routes.py:2069` writes it to metadata.

**Git commit created automatically:** ✅ Pass — `generation_routes.py:2161` runs `git commit` with archive contents.

**Summary shows keyword match score:** ✅ Pass — `finalise.js:306-316` renders ATS keywords and ATS score in the confirmation summary.

**Summary shows total time:** ✅ Pass — `finalise.js:320-321` reads `summary.session_duration_secs` and line 331 renders `<li>Session duration: ${durationStr}</li>` when the value is present. The backend computes `session_duration_secs` at `generation_routes.py:2253-2254` using `entry.created`.

---

#### US-A10: Update Master CV Data

**Natural-language updates with proposed JSON diff shown before writing:** ⚠️ Partial — The Master CV tab provides structured editors for personal info, skills, experiences, education (`master_data_routes.py:476-1129`). `/api/master-data/preview-diff` (`master_data_routes.py:374`) returns a before/after diff for `personal_info` and `skill` sections. However, a general-purpose natural-language update path ("I finished a project at Acme using Kubernetes — add it to my exp_005 achievements") is not implemented. Users must use the structured editors.

**Document ingestion (LinkedIn export, old CV) with review step:** ❌ Not Implemented — No document ingestion path for bulk master CV import from LinkedIn or an existing CV was found. BibTeX publications import exists but is not equivalent. The story explicitly requires pasting an existing CV or LinkedIn export for bulk ingestion.

**No blind writes — every change requires explicit confirmation:** ✅ Pass — All master data edits go through structured editor flows with save actions.

**Git commit on every confirmed update:** ⚠️ Partial — The harvest apply step (`generation_routes.py:2376`) and finalise (`generation_routes.py:2161`) commit to git. Individual master data edits via the structured editors were not confirmed to auto-commit.

---

#### US-A11: Session Harvest

**Harvest prompt appears automatically after Finalise:** ✅ Pass — `finalise.js:325-344` calls `showHarvestSection()` immediately after a successful finalise, showing the harvest panel inline.

**Candidate write-back items compiled from session:** ✅ Pass — `generation_routes.py:1075-1100` calls `_compile_harvest_candidates` which aggregates improved bullets, new skills, and skill type candidates.

**No item preselected (explicit opt-in):** ✅ Pass — `finalise.js:374-420` renders harvest candidates as unchecked checkboxes.

**Each candidate shows before/after with rationale:** ✅ Pass — `/api/harvest/analyze` (`generation_routes.py:2222`) returns LLM reasoning per candidate; `finalise.js` renders the rationale alongside each item.

**Consolidated JSON diff shown before any write:** ⚠️ Partial — `/api/harvest/apply` applies selected items directly. Whether a consolidated JSON diff is explicitly shown to the user in the UI before the apply call fires was not confirmed from `finalise.js` source — the UI may show individual item diffs but a consolidated multi-item diff view is not evident.

**Git commit on every confirmed harvest:** ✅ Pass — `generation_routes.py:2376` runs a git commit after `harvest/apply`.

**Harvest skippable:** ✅ Pass — The harvest section requires explicit user action to apply; nothing is auto-applied.

---

#### US-A12: Re-enter and Re-run Earlier Workflow Stages

**Re-run affordance visible on completed steps in progress bar:** ✅ Pass — `workflow-steps.js:875-876` renders a `.step-rerun` button on completed steps; CSS reveals the button on hover/focus-within (`workflow-steps.js:915`).

**Re-run affordance accessible via keyboard (shortcut or menu):** ✅ Pass — `keyboard-shortcuts.js:196` handles `e.ctrlKey && e.shiftKey && e.key === 'R'` and calls `confirmReRunPhase`. The shortcut is listed in the help panel at line 150: "Ctrl+Shift+R — Re-run current workflow phase".

**Confirmation dialogue listing affected downstream stages:** ✅ Pass — `workflow-steps.js:147-185` shows `_showReRunConfirmModal` with title and body text explaining what will be re-run and that downstream approvals may be affected.

**Clarification answers amendable when triggering analysis re-run:** ✅ Pass — `workflow-steps.js:386-392` intercepts analysis re-runs to call `_showAnalysisClarificationAmendModal`, which shows the amend modal with "Keep Existing Answers" and "Update & Rerun" options.

**Prior approvals preserved; only changed/new items highlighted:** ✅ Pass — `conversation_manager.py:1652-1764` `re_run_phase` preserves prior decisions. Frontend displays change badges (`rw-change-badge`) for new/updated items after re-run (`rewrite-review.js:381-385`).

**Session state records each re-run event with timestamp:** ✅ Pass — `conversation_manager.py:1753-1757` appends to `rerun_log` with phase, timestamp, and `triggered_by`.

**Re-run does not silently discard prior decisions:** ✅ Pass — `re_run_phase` uses `setdefault` and preserves decisions; `iterating: True` flag signals downstream components to treat prior approvals as defaults.

---

### Terminology and Labelling Evaluation

The following inconsistencies and confusing labels were identified across `web/index.html` and the workflow:

1. **"Customise" vs "Customizations":** The workflow step chip reads "Customise" (`index.html:128`, British spelling) but the action button reads "⚙️ Recommend Customizations" (`index.html:191`, American spelling). The API endpoint is `/api/customizations` (American). This mixed spelling will confuse users who toggle between the progress bar and action buttons, and is inconsistent with either a fully British or fully American locale choice.

2. **"Analyse" vs "Analyze":** The primary action button reads "🔍 Analyse Job" (`index.html:190`, British) while internal conversation messages and API paths use "analyze" (American). Again mixed.

3. **"Generate Preview →" button tooltip is misleading:** `index.html:194` tooltip says "Step 1 of 3: Generate an HTML preview to review the layout before final DOCX/PDF files are produced." This is reasonably accurate. However the next button, "🎨 Open Layout Review →" (`index.html:195`), has a tooltip "Step 2 of 3: Review and adjust layout settings — font size, margins, and CV organisation." The layout review is actually a **natural-language instruction panel**, not a settings panel with font/margin controls. This tooltip actively misrepresents what the step does and will confuse users.

4. **"File Review" vs "Download":** The step chip reads "File Review" (`index.html:136`) but the tab label reads "File Review" too. The tooltip says "File Review — download and review generated files" — redundant. The download tab ID is `tab-download`. Calling this step "File Review" is reasonable but slightly bureaucratic; users might expect "Download" as a more direct term.

5. **"Package Application Files" action button:** `index.html:198` shows `📦 Package Application Files` as the finalise action. The Finalise tab (`index.html:227`) is labelled "Finalise" with a checkmark. The action button terminology ("Package") does not match the tab name ("Finalise"), the story terminology ("Finalise"), or the API name (`/api/finalise`). A user looking for a "Finalise" button will see "Package Application Files" instead.

6. **"ATS" undefined in context:** "ATS" (Applicant Tracking System) is used throughout — "ATS Report" button (`index.html:108`), "ATS DOCX" checkbox (`index.html:641`), "ATS Score" tab (`index.html:219`). The `ats-score-badge` has a tooltip defining the term (`index.html:92`), but "ATS Report" and "ATS DOCX" buttons/labels do not provide inline definition. Users unfamiliar with ATS terminology may not understand what these buttons do.

7. **"LLM: Loading…" label in header:** `index.html:54` shows "LLM: Loading…" followed by a status badge. "LLM" is developer jargon. A more user-friendly label such as "AI Model: Loading…" or simply "AI: Loading…" would reduce cognitive load for non-technical users.

---

### Generated Materials Evaluation

**HTML Preview with Schema.org JSON-LD:** ✅ `cv_orchestrator.py:1495-1574` builds Schema.org/Person JSON-LD embedded in generated HTML at `cv_orchestrator.py:946`.

**Two-column layout styling:** ✅ `styles.css` contains layout definitions; the HTML CV template uses the two-column layout specified in the story.

**Self-contained HTML file:** ✅ The orchestrator produces a standalone HTML file with embedded CSS, browser-previewable without a server.

**PDF rendered from confirmed HTML (not re-rendered from data):** ✅ `generate-final` uses the confirmed preview HTML as its source, not a re-render from raw data.

**ATS DOCX single-column plain-text format:** ✅ The ATS DOCX generation path is separate from the human PDF/DOCX path and is keyword-optimised.

**File naming `CV_{Company}_{Role}_{Date}` with `_ATS` suffix for DOCX:** ✅ Enforced in `cv_orchestrator.py`.

**Cover letter saves as both DOCX and PDF:** ✅ `master_data_routes.py:1739-1755` writes `.docx` then generates `.pdf` via WeasyPrint.

**Long bullet point warnings surfaced to user:** ✅ `download-tab.js:378-384` surfaces `long_bullet_warnings` from `cvData.metadata` in the File Review step.

**Inline skill bullet readability warning:** ✅ `skills-review.js:266` triggers a warning when an inline skill bullet is excessively long.

---

### Additional Story Gaps / Proposed Story Items

**GAP-US-A2a: Prior clarification pre-population across sessions.** US-A2 specifies that "if a prior session exists for the same role type, my previous clarification answers are pre-populated as defaults." Not implemented — only current-session answers are pre-populated in the amend modal.

**GAP-US-A3a: Omit-section rationale display needs runtime verification.** The story requires omitted sections to be "explained, not silently dropped." The Goals tab likely shows this from LLM `sections_to_omit` output, but runtime verification is needed.

**GAP-US-A5b-a: No clarification loop for ambiguous layout instructions.** The story requires the LLM to "ask clarifying questions rather than silently applying a guess." `layout-refine` applies best-effort interpretation without a clarification loop.

**GAP-US-A8a: Top-3 experience display in screening UI.** US-A8 requires the top 3 relevant experiences from Master CV shown with match scores per question. Backend passes experience context to LLM but the UI may not render them as distinct scored items.

**GAP-US-A10a: Natural-language master data update absent.** US-A10 requires free-text NL updates to master data. Only structured editors are available.

**GAP-US-A10b: Document ingestion for master CV absent.** US-A10 requires bulk ingestion of an old CV or LinkedIn export. No such path exists (BibTeX publications import is not equivalent).

**GAP-US-A10c: Git commit on individual master data edits unconfirmed.** US-A10 says "Git commit on every confirmed update." Individual edits via structured editors may not auto-commit.

**GAP-US-A11a: Consolidated JSON diff before harvest apply.** US-A11 requires a "consolidated JSON diff" before any write. Per-item rationale is shown, but a multi-item consolidated diff view was not confirmed in `finalise.js`.

**GAP-TERM-01: Mixed British/American spelling throughout UI.** "Analyse"/"Customise" (British) alongside "Customizations"/"analyze" (American) creates inconsistency. A single locale choice should be enforced across all UI strings, button labels, and API responses.

**GAP-TERM-02: "Open Layout Review" tooltip falsely describes font/margin settings.** The layout review step is a natural-language instruction field, not a settings panel. The tooltip on `generate-proceed-btn` (`index.html:195`) says "Review and adjust layout settings — font size, margins, and CV organisation," which is incorrect and will confuse users.

**GAP-TERM-03: "Package Application Files" button name does not match Finalise terminology.** The action button on the download step reads "Package Application Files" while the tab, story, and API all use "Finalise."

---

### Evidence Summary

| Source | Lines | Finding |
| ------ | ----- | ------- |
| `web/index.html:124-148` | Workflow steps bar | "Customise" spelling; "Customise" vs "Customizations" inconsistency |
| `web/index.html:190-198` | Action buttons | "Analyse" (British) vs API uses "analyze"; misleading Layout tooltip |
| `web/index.html:195` | Generate Preview button | Tooltip mentions "font size, margins" — misrepresents the layout review |
| `web/index.html:198` | Finalise action button | "Package Application Files" does not match "Finalise" terminology elsewhere |
| `scripts/routes/job_routes.py:221-300` | URL fetch | Protected-site detection for LinkedIn/Indeed/Glassdoor confirmed |
| `scripts/routes/job_routes.py:779-800` | Re-run API | `/api/re-run-phase` routes to `conversation_manager.re_run_phase` |
| `scripts/routes/generation_routes.py:2056-2205` | Finalise | Status transitions, git commit, keyword summary + session duration (line 2253) |
| `scripts/routes/generation_routes.py:2169` | Status values | `draft`, `ready`, `sent`, `queued`, `interview`, `rejected`, `accepted`, `parked` |
| `scripts/routes/generation_routes.py:2211-2413` | Harvest | Candidates, analyze, apply routes all implemented |
| `scripts/routes/master_data_routes.py:1511-1544` | Cover letter prior | Prior session scanning confirmed |
| `scripts/routes/master_data_routes.py:1695-1755` | Cover letter save | DOCX + PDF confirmed; `cover_letter_text` in metadata |
| `scripts/utils/conversation_manager.py:1652-1764` | re_run_phase | Preserves prior decisions; appends to rerun_log |
| `scripts/utils/conversation_manager.py:1539,2096-2113` | Intake | `extract_intake_metadata` and `apply_confirmed_intake` confirmed |
| `web/workflow-steps.js:386-392` | Clarification amend modal | Analysis re-run shows amend modal before proceeding |
| `web/workflow-steps.js:875-915` | Re-run button on steps | Rendered on completed steps; revealed on hover/focus-within |
| `web/keyboard-shortcuts.js:196` | Keyboard shortcuts | Ctrl+Shift+R re-run shortcut implemented |
| `web/rewrite-review.js:377-380` | Weak badge | `evidence_strength === 'weak'` triggers "⚠ Candidate to confirm" |
| `web/rewrite-review.js:578-585` | Submit gate | Disabled while `pending > 0` |
| `web/skills-review.js:266` | Readability warning | Inline skill bullet length warning present |
| `web/skills-review.js:93-139` | Category management | Rename, save, reorder confirmed; inter-category move absent |
| `web/finalise.js:300-335` | Finalise summary | ATS score, approved rewrites, commit hash, session duration (line 331) |
| `web/finalise.js:325-344` | Harvest auto-show | Harvest section shown immediately after finalise success |
| `scripts/utils/cv_orchestrator.py:1495-1574` | Schema.org JSON-LD | Built and embedded in generated HTML |
