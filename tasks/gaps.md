# Gaps Analysis: Source-Verified UI Review Findings

**Generated:** 2026-03-06 | **Last updated:** 2026-06-18 (cycle 2)
**Sources:**

- prior backlog in `tasks/gaps.md`
- refreshed persona review files under `tasks/review-status/` dated 2026-04-22, 2026-06-18 (cycle 1), and 2026-06-18 (cycle 2)
- independent heuristic UX evaluation (2026-04-22, 2026-06-18 cycle 1 and 2)
- aggregate synthesis in `tasks/ui-review.md`

This document tracks the gaps that still remain after reconciling the refreshed full 15-persona + heuristic review set against the current implementation. The 2026-04-22 cycle added GAP-72 through GAP-123 from newly discovered issues and resolved/updated GAP-08, GAP-28, GAP-30, GAP-37, GAP-38, and GAP-45. The 2026-06-18 cycle 1 added GAP-124 through GAP-142. The 2026-06-18 cycle 2 added GAP-143 through GAP-145.

## 2026-06-18 (Cycle 2) Reconciliation Notes

- **3 gaps resolved this cycle:** GAP-33 (employment date overlap detection — implemented), GAP-45 (persuasion warning bypass — hard-gated), GAP-36 (first-run blank Master CV — implemented).
- **3 new gaps added:** GAP-143 (`showConfirmModal` missing focus management), GAP-144 (Harvest pre-selects high/medium confidence items violating opt-in requirement), GAP-145 (no session audit log panel in Finalise — already GAP-118, superseded by this entry's clarification).
- **Confirmed resolved from last cycle:** GAP-103 (ATS advisory checks no longer block downloads), GAP-110 (date overlap detection implemented).
- **Most critical open gaps this cycle:** GAP-120 (keyboard tabs WCAG Level A), GAP-127 (`candidate_to_confirm` not rendered/excluded), GAP-128 (rejected rewrites not audited), GAP-132 (two divergent CV templates), GAP-34 (`confirmDialog` missing ARIA), GAP-143 (`showConfirmModal` missing focus).

## 2026-06-18 (Cycle 1) Reconciliation Notes

- **0 gaps resolved this cycle:** No source-code evidence confirmed fixes for any open gap in this review pass. All prior open items remain open.
- **19 new gaps added:** GAP-124 through GAP-142, spanning returning-user (GAP-124), UX expert (GAP-125, GAP-135), hiring manager (GAP-126), resume expert (GAP-127, GAP-128), accessibility (GAP-129, GAP-140), trust/compliance (GAP-130, GAP-131), graphical designer (GAP-132, GAP-133), applicant (GAP-134), persuasion expert (GAP-136, GAP-137, GAP-138, GAP-139), and master CV curator (GAP-141, GAP-142).
- **Most critical open gaps this cycle:** GAP-120 (keyboard tabs WCAG Level A), GAP-124 (`final_generation` missing from phase labels), GAP-127 (`candidate_to_confirm` not rendered/excluded), GAP-128 (rejected rewrites not audited), GAP-132 (two divergent CV templates), GAP-36 (FileNotFoundError first run), GAP-41 (no pre-job master CV editor).

## 2026-04-22 Reconciliation Notes

- **6 gaps resolved or partially updated this cycle:** GAP-08 (spell audit write-back, RESOLVED), GAP-28 (publications heading, RESOLVED), GAP-30 (cover letter opening, RESOLVED), GAP-38 (Delete→Move to Trash, RESOLVED), GAP-37 (welcome modal partial, now tracked as GAP-76/77), GAP-45 (submission gating partial, structural bypass remains).
- **52 new gaps added:** GAP-72 through GAP-123, spanning accessibility (GAP-72–75), first-time user (GAP-76–79), graphical designer (GAP-80), hiring manager (GAP-81–86), HR/ATS (GAP-87–90), master CV curator (GAP-91–94), persuasion expert (GAP-95–97), power user (GAP-98–101), recruiter-ops (GAP-102–106), resume expert (GAP-107–109), returning user (GAP-110–114), trust/compliance (GAP-115–119), UX expert (GAP-120–123).
- **Strongest progress this cycle:** Spell-check end-to-end (GAP-08), cover letter opening styles (GAP-30), venue-warning wiring in publications (GAP-HM-05), page-count warning in Download tab (GAP-HM-02).
- **Most critical open gaps:** GAP-120 (keyboard tab accessibility — WCAG Level A), GAP-36 (FileNotFoundError on first run — crash), GAP-41 (no pre-job master CV editor entry point), GAP-25 (Layout Undo non-functional stub).
- The prior April 2026 cycle added GAP-25 through GAP-71.

## 2026-03-23 Reconciliation Notes

- The strongest progress relative to the older rollups is in rewrite review, publication review, ATS artifact generation, cover-letter validation, finalise/archive scaffolding, and session-vs-master governance.
- The most reinforced cross-persona gaps are still `GAP-20`, `GAP-22`, `GAP-23`, `GAP-21`, `GAP-08`, `GAP-18`, `GAP-16`, and `GAP-19`.
- The newer personas add evidence that some issues are about story-completeness rather than missing foundations: accessibility, recruiter-ops, trust/compliance, and graphical-designer all found implemented scaffolding with incomplete last-mile behavior.
- `GAP-03`, `GAP-04`, `GAP-05`, `GAP-09`, `GAP-14`, `GAP-15`, and `GAP-17` remain valid, but should be read as partial-completeness gaps rather than blank-feature gaps.

**Severity scale:**
`CRITICAL` - blocks a core workflow or acceptance path
`HIGH` - major capability shortfall that should be fixed before the feature is considered complete
`MEDIUM` - important omission or degraded UX that can slip one iteration if necessary
`LOW` - polish or traceability issue that should be fixed, but is not the main blocker

---

## GAP-01: Master Data NL Update and Document Ingestion

**Severity:** HIGH
**Affected stories:** US-A10, US-A11
**Status:** OPEN - verified 2026-03-19 11:36 ET; applicant review found the current Master CV UI only supports direct saves for summaries and achievements, with no natural-language update flow, document-ingestion review step, JSON diff preview, or per-change git commit.
**Description:** US-A10 is still unimplemented in the reviewed code. The app does not let the user describe a change in plain language, upload an external CV/LinkedIn export for structured extraction, review a proposed JSON diff, and explicitly confirm before writing to `Master_CV_Data.json`.
**Recommended resolution:** Add a dedicated master-data update flow that supports NL-to-structured proposals, document ingestion, explicit diff review, confirmation before write, full-file backup, and git commit on every confirmed update.

## GAP-02: Iterative Refinement and Phase Re-Entry Completeness

**Severity:** HIGH
**Affected stories:** US-A6, US-A12, US-U1
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; applicant review confirmed `back_to_phase()` and `re_run_phase()` exist, but layout-only refinement is not routed into a working layout-review loop and per-cycle metadata refresh was not source-verified.
**Description:** Targeted re-entry is no longer missing, but the workflow is still incomplete. Earlier-stage re-entry works for analysis/customization/rewrite paths, while layout-only refinement, changed-item highlighting, and archive/metadata refresh guarantees remain unresolved.
**Recommended resolution:** Preserve the existing re-entry APIs, then add layout-only routing, changed-vs-unchanged review highlighting, and explicit archive/metadata update rules for every regeneration cycle.

## GAP-03: Finalise and Archive Completion

**Severity:** HIGH
**Affected stories:** US-A9
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; applicant review confirmed finalise writes status/notes and creates a git commit, but Drive sync is still absent and the summary view does not show the requested keyword-match score.
**Description:** The finalise flow is no longer blank, but it is not complete relative to the story. The archive metadata is updated and git commit automation exists, yet the Google Drive sync leg and the hiring-facing summary of match quality are still missing.
**Recommended resolution:** Extend finalise to perform Drive sync with visible success/failure handling and add a post-generation summary card that surfaces ATS match score, missing hard requirements, and archived artefact status.

## GAP-04: Post-Generation ATS Validation Coverage

**Severity:** HIGH
**Affected stories:** US-H6, US-A5c
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; HR/ATS review confirmed the ATS validation report exists, but it runs when the Download tab opens instead of automatically after generation, and several required checks remain incomplete or missing.
**Description:** The validation framework is real and user-visible, but it does not yet satisfy the full acceptance surface. Missing or incomplete areas include keyword-density checking, PDF font embedding validation, full Heading 1 enforcement, complete JSON-LD required-field validation, and generation-time persistence into `metadata.json`.
**Recommended resolution:** Trigger ATS validation automatically after final generation, expand the validator to cover the missing checks, and persist validation results at generation time rather than only during finalise.

## GAP-05: CV Length Governance

**Severity:** MEDIUM
**Affected stories:** US-R2, US-M4, US-U6
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; resume and hiring-manager reviews found page-count warnings in the UI, but length control is still heuristic and not enforced across staged preview, layout review, and final generation.
**Description:** The app now estimates and reports page length, so the gap is narrower than before. What remains missing is a consistent rule that carries length checks through preview, layout iteration, and final output, with clear thresholds and stage-appropriate warnings or blocks.
**Recommended resolution:** Promote page-count thresholds into the staged generation contract, show warnings during preview and layout review, and ensure final ATS validation uses the same thresholds and messaging.

## GAP-06: Rewrite Review Efficiency and Context Preservation

**Severity:** MEDIUM
**Affected stories:** US-A4, US-U5
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; applicant review passed the core rewrite card workflow, but UX review found edit mode hides the diff context and no sequential "approve and next" or compact review flow was source-verified.
**Description:** The rewrite review surface is functional, but it still falls short of the more refined UX criteria. Users can review, edit, accept, and reject proposals, yet editing interrupts comparison context and larger rewrite batches lack an efficient rapid-review mode.
**Recommended resolution:** Keep inline diff as the default, preserve before/after context while editing, and add a keyboard-friendly sequential review mode for larger rewrite sets.

## GAP-07: Content Ordering Beyond Bullet Reordering

**Severity:** MEDIUM
**Affected stories:** US-A3, US-R2, US-U4
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; applicant review confirmed bullet reordering within an experience entry works, but no reviewed controls were found for reordering experiences, achievements, skills, or publications as full rows.
**Description:** The story requirements extend beyond intra-job bullet order. The current UI lets the user reorder bullets inside a role, but not reorder the higher-level content blocks that determine what rises or falls in the CV.
**Recommended resolution:** Add row-level reorder controls for each major review table, persist those order decisions in session state, and ensure final generation respects them across HTML, PDF, and ATS DOCX.

## GAP-08: Spell and Grammar Resolution Path

**Severity:** HIGH
**Affected stories:** US-A4b, US-R7
**Status:** RESOLVED - confirmed 2026-04-22; resume expert review verified end-to-end spell correction flow: `submitSpellCheckDecisions` sends `_spellSugMap` entries to `/api/spell-check-complete`, backend stores them in `state['spell_audit']`, and `cv_orchestrator.apply_accepted_spell_fixes` applies span-precise corrections before generation (`cv_orchestrator.py:1501–1706`, `web/spell-check.js:376–399`). Six of seven US-R7 acceptance criteria now pass.
**Description:** Spell check is implemented as a workflow step, but it does not yet behave like a reliable last-mile quality gate. The current flow can auto-ignore unresolved items, lacks a real edit path, does not emit `skill_name` review sections, and does not source-verify that accepted fixes alter the actual generated CV text.
**Recommended resolution:** Add skill-name sections, force explicit resolution of flagged items, apply accepted corrections directly to the generated text span they govern, and keep the spell audit synchronized with the resulting output.

## GAP-09: Action-Verb and Bullet Quality Enforcement

**Severity:** MEDIUM
**Affected stories:** US-M2, US-P4
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; hiring-manager and persuasion reviews confirmed strong-verb, passive-voice, and result-clause checks exist, but they remain advisory and do not enforce final-output compliance.
**Description:** The system now detects several bullet-quality issues during rewrite review, which resolves the original "missing entirely" framing. The remaining gap is enforcement: weak bullets can still reach the final CV, and no reviewed minimum bullet-count, final line-length, or keep-together layout constraint closes the loop.
**Recommended resolution:** Convert the highest-value bullet-quality checks into required review warnings or blocking checks before generation, and add final-output validation for bullet count, line length, and layout cohesion.

## GAP-10: Keyword Normalization and Weighting

**Severity:** MEDIUM
**Affected stories:** US-R1, US-H4
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; resume review confirmed canonical synonym grouping exists, but deterministic title/lead-paragraph/repetition weighting and ATS-side variant normalization remain incomplete.
**Description:** Keyword grouping is no longer the main problem. The unresolved piece is consistent weighting and visibility: the reviewed code does not clearly prove that job-title terms, repeated terms, and hyphen/slash variants are handled in a story-complete way across analysis and ATS validation.
**Recommended resolution:** Formalize keyword weighting rules in code and spec, normalize slash/hyphen variants in ATS matching, and expose the resulting weighting model in the analysis and scoring UI.

## GAP-11: Skills Canonicalization and Role-Aware Grouping

**Severity:** MEDIUM
**Affected stories:** US-R5, US-M3
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; deduplication and relevance ordering exist, but resume and hiring-manager reviews found no role-aware category ordering, no hard-vs-soft distinction, and no formal alias/write-back schema.
**Description:** The app does a reasonable job of collapsing aliases into canonical skills, but the skills surface still lacks richer semantics. Categories are not clearly re-ranked by target-role relevance, and the reviewed pipeline still treats all skills as one general class for output and ATS reasoning.
**Recommended resolution:** Add a richer skill schema with aliases, category intent, and hard/soft classification, then use it to drive role-aware grouping in both review tables and generated documents.

## GAP-12: Candidate-to-Confirm Skill Evidence UX

**Severity:** LOW
**Affected stories:** US-R5, US-A4
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; reviewed UI surfaces AI-suggested skills, but source verification did not show a consistently strong evidence-specific `candidate_to_confirm` explanation tied to concrete experience evidence.
**Description:** Candidate-to-confirm skills are not invisible anymore, but the current UX does not clearly explain why a given skill is weakly evidenced, what evidence exists, or what risk the user accepts by including it.
**Recommended resolution:** Show the linked experience evidence directly in the skills review row, distinguish weak-evidence from simple new-skill suggestions, and align the badge language with the backend `candidate_to_confirm` flag.

## GAP-13: Approved Skill Write-Back Workflow

**Severity:** MEDIUM
**Affected stories:** US-R5, US-A11
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; harvest apply can persist selected updates, but resume and applicant reviews showed approved extra skills remain "for this CV only" unless the user separately completes harvest, and evidence-linked dedupe rules remain unclear.
**Description:** Skill persistence exists only as a later optional harvest step, which is weaker than the story intent. The path from approved extra skill to durable master-data update is indirect, easy to skip, and not clearly deduped against existing canonical skills.
**Recommended resolution:** Make approved-skill persistence explicit in the review flow, carry supporting experience evidence into harvest proposals, and enforce canonical-dedupe rules before write-back.

## GAP-14: Workflow Orientation and Stage Controls

**Severity:** MEDIUM
**Affected stories:** US-U1, US-A12
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; workflow chips, active/completed states, and guarded back-navigation exist, but restore messaging lacks richer context and not every completed stage exposes a visible re-run affordance.
**Description:** The workflow indicator is no longer missing, but it is not yet complete as an orientation system. The stage chips do not fully cover the story's requirements for rerun discoverability, rich session restore context, and stage-specific user confidence.
**Recommended resolution:** Add explicit rerun affordances for all eligible completed stages, expand restore messaging with last activity and preserved decisions, and align step labels with the actual stage names and actions.

## GAP-15: Accessibility and Keyboard Coverage

**Severity:** HIGH
**Affected stories:** US-U7
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; modal focus management and validation wiring exist, but icon-only review controls still miss `aria-label` coverage and keyboard/reorder/focus behavior is inconsistent across primary controls.
**Description:** Accessibility is no longer a blank slate. The reviewed app includes meaningful focus-trap and validation support, but several important controls still rely on weak semantics, incomplete labels, or uneven keyboard behavior.
**Recommended resolution:** Add `aria-label` coverage to every icon-only action, normalize visible focus styles across all interactive elements, and ensure every reorder and review action is fully keyboard operable.

## GAP-16: Broader UX and Information Architecture Gaps

**Severity:** HIGH
**Affected stories:** US-U2, US-U3, US-U4, US-U6, US-U8
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; the reviewed UI implements many core surfaces, but UX and heuristic reviews still found fragmented navigation, dense shell chrome, wall-of-questions clarifications, missing inline preview/versioning, and weak responsive behavior.
**Description:** Earlier framing that these UX stories were "not implemented" is no longer accurate. The current state is instead a mixed implementation with major information-architecture and interaction-quality problems still open.
**Recommended resolution:** Simplify the navigation model, chunk long clarification flows, add inline preview/version controls where output is reviewed, and redesign the shell for stronger 1280x800 and long-table behavior.

## GAP-17: Persuasion Rule Enforcement

**Severity:** MEDIUM
**Affected stories:** US-P1, US-P2, US-P3, US-P4, US-P5, US-P6
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; persuasion review confirmed several checks exist for weak verbs, passive phrasing, CAR structure, and generic filler, but they are mostly advisory and do not cover narrative-arc, keyword-appendage, cover-letter persuasion, or cross-document register consistency.
**Description:** Persuasion logic now exists in enough places that the old "artefacts do not exist anywhere" wording is obsolete. The current gap is that the rules are incomplete and often non-blocking, so the system can still produce rhetorically weak content even after warning about it.
**Recommended resolution:** Expand persuasion validation to cover narrative arc, positive-sum framing, keyword stuffing, cover-letter openings/closings, and consistency between CV, cover letter, and screening responses.

## GAP-18: Workflow Stage Re-Run Completeness

**Severity:** HIGH
**Affected stories:** US-A12, US-U1, US-A6
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; rerun endpoints exist and preserve downstream state, but applicant review found rerun affordances only for some stages, no clear clarification-amend path for analysis reruns, and no changed-item highlighting.
**Description:** The core rerun mechanism exists, so the original gap is no longer unresolved at the foundation level. What remains is story-complete UX and rerun context management across all eligible stages.
**Recommended resolution:** Expose rerun on every supported completed stage, allow clarification editing as part of analysis reruns, and compare old vs new results so only changed or new items require re-review.

## GAP-19: Structured Master CV Editor

**Severity:** HIGH
**Affected stories:** US-A10, US-A11
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps), [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md#phase-16--master-cv-editor-gap-19)
**Status:** PARTIAL - re-verified 2026-03-23; the app already includes a working `Master CV` surface with structured CRUD for several master-data sections plus publication editing, validation, and backup-before-write safeguards, but it still lacks the story-complete editor, history/restore model, import/export flow, preview flow, and governance UX described by GAP-19.
**Description:** Earlier wording that framed GAP-19 as nearly absent is no longer accurate. The current product state includes meaningful Master CV foundations: a dedicated tab, editable personal info / experience / skills / education / awards / achievements / summaries, publication-editing routes, validation helpers, and backup-before-write behavior. The remaining gap is completion, not existence. Users still do not have the full durable-maintenance workflow promised by the stories, especially around history browsing, restore/undo, export, import-with-review, preview, clearer session-vs-master guidance, and any remaining section-depth gaps such as certifications or richer structured editing semantics.
**Recommended resolution:** Preserve the existing Master CV foundation and complete it into a story-complete maintenance mode: add history/restore/undo flows, export and full preview, reviewed import paths, clearer governance messaging, and any missing structured-editor depth required to cover all target master-data sections consistently.

## GAP-20: Staged HTML Preview, Layout Review, and Final Generation Workflow

**Severity:** CRITICAL
**Affected stories:** US-A5a, US-A5b, US-A5c, US-U6, US-U9
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps)
**Status:** PARTIAL - re-verified 2026-03-25; the app now has a real inline preview pane, session-backed layout refresh calls, and distinct backend endpoints for preview generation, layout confirmation, and final generation, but the frontend still presents those stages with overlapping terminology and collapses confirm-layout plus final-file generation into one user action.
**Description:** Earlier wording that treated staged generation as mostly absent is no longer accurate. The remaining blocker is the user-facing contract. The backend exposes a staged `HTML preview -> layout confirmation -> final generation` sequence, and the layout staleness spec defines how freshness should be communicated, but the reviewed frontend still behaves like a bundled generation path because preview/final artifacts are named inconsistently and stale/current state is not surfaced.
**Recommended resolution:** Preserve the existing backend staging and complete the frontend contract: use one consistent vocabulary for preview, layout-confirmed, and final-file states; separate layout confirmation from final generation as visible user actions; and implement the stale/current signaling defined in `tasks/layout-stale-ui-spec.md`.

## GAP-21: ATS Match Score and Keyword Visibility

**Severity:** HIGH
**Affected stories:** US-H4, US-H7, US-A9
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps)
**Status:** PARTIAL - re-verified 2026-03-27; the app now has a real backend scoring model (`compute_ats_score` via `POST /api/cv/ats-score`), an ATS badge (overall %) in the position bar row, per-keyword matched/partial/missing + section provenance in the ATS Report modal and ATS Score tab, debounced score refresh after all major review checkpoints (analysis, skills, rewrites, spell-check, experience, achievements, layout confirmation, post-generation), and ATS score persisted to `generation_state` and `metadata.json`. The remaining gap is that score refresh was not triggered after summary focus selection in `summary-review.js`; that is fixed as of 2026-03-27/commit tbd.
**Description:** Earlier wording that treated this gap as fully absent is no longer accurate. The scoring infrastructure, badge display, and live-refresh wiring are all real. The last-mile issue was that selecting a summary variant (which contributes to ATS keyword matching via the `selected_summary` field) did not schedule a refresh; that is corrected.
**Recommended resolution:** Persisted score details in generation metadata and final summaries are present. Hard-vs-soft skill typing in generated ATS DOCX output remains open under GAP-22.

## GAP-22: ATS Document Structure and Skill-Type Semantics

**Severity:** HIGH
**Affected stories:** US-H1, US-H2, US-H3, US-H5, US-H8
**See also:** [tasks/ui-review.md](ui-review.md#top-gaps)
**Status:** OPEN - discovered 2026-03-19 11:36 ET; HR/ATS review found ATS DOCX heading levels and labels do not match the required standard, contact/date formatting is only partially normalized, and no hard-vs-soft skill classification or output separation exists.
**Description:** The ATS output is close enough to validate, but not close enough to satisfy the stricter ATS-format stories. Structural semantics, heading conventions, contact normalization, employment-header formatting, and hard/soft skill typing all remain below the source-verified target.
**Recommended resolution:** Normalize the ATS DOCX contract around approved heading labels and Heading 1 usage, enforce story-specific contact/date formatting rules, classify skills as hard vs soft, and represent that classification consistently in ATS DOCX, UI review, and JSON-LD.

## GAP-23: Intake Metadata Confirmation and Clarification Defaults

**Severity:** HIGH
**Affected stories:** US-A1, US-A2, US-U2
**Status:** OPEN - discovered 2026-03-19 11:36 ET; applicant and UX reviews found no editable confirmation step for extracted company/role/date, no queued post-intake persistence stage, and no prior-session clarification defaults keyed by role type.
**Description:** Job intake still jumps too quickly from acquisition into analysis. The stories require a confirmation moment where extracted metadata can be corrected, and they also require reuse of prior clarification answers when a similar role type has been handled before.
**Recommended resolution:** Insert an intake-confirmation substep with editable extracted metadata, persist the session immediately after confirmation, and preload clarification defaults from prior matching sessions while keeping them easy to override.

## GAP-24: Publication Curation Persistence and Final Rendering

**Severity:** HIGH
**Affected stories:** US-A3, US-R2, US-M4, US-M7
**Status:** OPEN - discovered 2026-03-19 11:36 ET; applicant, resume, and hiring-manager reviews confirmed ranked publication review exists, but final omission rules, metadata persistence, heading/count rendering, first-author visibility, and role-type gating remain incomplete. See also GAP-28, GAP-29 (new bugs in the rendering path).
**Description:** Publication recommendation is one of the stronger current review surfaces, but the end-to-end publication workflow is still broken at the edges. The reviewed code does not prove that rejecting all publications removes the section, that selected publications persist under the expected metadata key, or that final outputs correctly render the heading ("Selected Publications" for subset, "Publications" for full list), venue/year completeness, and first-author signal.
**Recommended resolution:** Carry publication decisions into the required metadata structure, enforce section omission when nothing is selected, render the correct section heading per updated US-M7 (subset vs full), and add explicit role-type gating plus first-author and venue completeness checks before generation.

---

## April 2026 Review Cycle Additions (GAP-25 through GAP-71)

*Discovered during the 17-persona + heuristic evaluation review cycle completed 2026-04-20. GAP IDs 25–71 are all new; prior GAP IDs 01–24 are unchanged.*

---

## GAP-25: `undoInstruction()` Is a Non-Functional Stub

**Severity:** HIGH
**Affected stories:** US-U3, US-A6
**Status:** OPEN - discovered 2026-04-20; UX expert review found `layout-instruction.js:855–865` implements undo by posting a chat message ("I want to undo the last layout instruction") rather than rolling back to a prior layout snapshot. The Undo button exists in the UI but does not undo.
**Description:** The layout-review Undo button is a visible affordance with no real action behind it. Users who click Undo expecting to revert a layout change will instead see a chat message posted, and the layout will not change.
**Recommended resolution:** Implement proper undo by snapshotting the layout state (instruction history + current rendered result) before each instruction is applied, and restoring the last snapshot when the Undo button is pressed.

## GAP-26: Session Restore Message Shows Raw Python Phase Strings

**Severity:** MEDIUM
**Affected stories:** US-S1, US-U1
**Status:** OPEN - discovered 2026-04-20; `web/session-manager.js:608` renders the raw Python `PHASES` enum value ("customization", "rewrite_review", "spell_check") in the session restoration message, rather than the human-friendly step label ("Customise", "Rewrites", "Spell Check").
**Description:** The restoration confirmation reads "✅ Session restored: [title] (customization)" — technical enum copy visible to end users.
**Recommended resolution:** Map the phase enum value to the same display label used by `_STEP_DISPLAY` in `workflow-steps.js` before constructing the restoration message.

## GAP-27: No Post-Generation Rewrite-Audit Diff Verification

**Severity:** MEDIUM
**Affected stories:** US-R7, US-A5c
**Status:** OPEN - discovered 2026-04-20; resume expert review found no automated check that verifies the generated CV text for each bullet matches the accepted `rewrite_audit[*].final` value. Silently divergent generated text is undetected.
**Description:** The rewrite audit stores the user-approved final text per bullet, but there is no post-generation step that diffs the generated document text against those approved values and flags discrepancies.
**Recommended resolution:** After generation, compare each generated bullet span against the corresponding `rewrite_audit[*].final` value and surface any mismatch as a validation warning before allowing finalisation.

## GAP-28: Publications Heading Does Not Distinguish Subset vs Full List

**Severity:** HIGH
**Affected stories:** US-M4, US-M7, US-A3
**Status:** CLOSED - fixed 2026-04-21 (commit ad9edf0, amended). Template logic corrected.
**Description:** The publications section heading did not correctly signal whether a subset or the full list was rendered.
**Resolution:** `cv-template.html` now renders the heading conditionally:
- **"Selected Publications"** — when `template_metadata.total_publications_count` exceeds the number of rendered publications (i.e., a subset is shown).
- **"Publications"** — when all publications are shown or when no count metadata is available.
- The publication count is **never** shown in generated documents.

This behavior must not be reversed. The count suffix `(N)` was intentionally removed.

## GAP-29: Venue-Missing Publications Render Silently

**Severity:** HIGH
**Affected stories:** US-M4, US-R2
**Status:** OPEN - discovered 2026-04-20; hiring-manager review found `.pub-venue-warn` CSS class is defined in `styles.css` but no code path adds it to a publication entry when venue/journal data is absent. Publications with missing venue information render without any visual warning.
**Description:** The warning system for incomplete publication entries is wired at the CSS level but dead at the code level. Authors can include publications with no journal, conference, or venue without receiving any feedback.
**Recommended resolution:** In the publication rendering code (both in the review table and in the CV template), check for absent venue/journal fields and apply `.pub-venue-warn` styling (or an equivalent inline warning) to flag the entry.

## GAP-30: Cover Letter Opening Hardwired as "Dear [name],"

**Severity:** CRITICAL
**Affected stories:** US-P3, US-P5
**Status:** RESOLVED - confirmed 2026-04-22; persuasion expert review confirmed the cover letter opening style is now user-selectable (formal/hook/narrative), commit `a5fc40a`. The hardwired "Dear [name]," constraint is removed. Client-side word count ceiling remains open under GAP-95.
**Description:** A hardwired "Dear [name]," opener is the weakest possible cover letter opening from a persuasion perspective. The story spec requires an opening that captures attention, establishes a specific connection, or uses a hook — none of which are possible with a forced salutation.
**Recommended resolution:** Remove the hardwired salutation from the cover letter prompt. Allow the LLM to generate a configurable opening (salutation, hook, or pattern-interrupt) based on user preference and job context. Add a cover letter opening style option (formal/attention-grabbing/narrative) to the session configuration.

## GAP-31: Cover Letter Word Count Ceiling 400 vs Story Spec 300

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** PARTIAL - updated 2026-04-22; the LLM generation prompt has been tightened to ~250–300 words (commit `e0212e3`), but client-side validation in the cover letter UI still allows 400 words. The server-side prompt fix is confirmed; the client-side ceiling mismatch is tracked as GAP-95.
**Description:** The 400-word ceiling produces cover letters that are too long for most recruiter review contexts, which typically allow 200–300 words per the story spec.
**Recommended resolution:** Reduce the cover letter word count target to 300 words maximum in the generation prompt.

## GAP-32: ATS Score and Validation Results Not Written to `metadata.json`

**Severity:** HIGH
**Affected stories:** US-H6, US-A9
**Status:** OPEN - discovered 2026-04-20; HR/ATS review found `cv_orchestrator.py:1878` does not persist `ats_score` and `validation_results` to `metadata.json` at generation time. The ATS badge value is computed and shown live but not written to the archival metadata record.
**Description:** ATS score and validation results are ephemeral — they are displayed during the session but not persisted to the generation artifact. If the session is closed, the score cannot be recovered from the archive. The audit trail is broken.
**Recommended resolution:** After generation completes and ATS scoring runs, write both `ats_score` and `validation_results` to `metadata.json` in the generation output directory. See also GAP-04 (validation coverage) for the related completeness gap.

## GAP-33: No Employment Date Overlap Detection

**Severity:** HIGH
**Affected stories:** US-H2, US-R2
**Status:** OPEN - discovered 2026-04-20; HR/ATS review found no code path checks for overlapping date ranges across experience entries before generation. Erroneous overlaps (e.g., two full-time roles in the same period) are silently included in the generated CV.
**Description:** Overlapping employment dates are a common CV integrity problem that human reviewers and ATS systems both flag. The current pipeline has no detection and generates CVs with overlapping dates without warning.
**Recommended resolution:** During the pre-generation validation step, check all experience entries for date range overlaps and surface any detected overlaps as a blocking or warning validation result.

## GAP-34: `confirmDialog()` Missing ARIA Role, Focus Trap, and Focus Restore

**Severity:** HIGH
**Affected stories:** US-X2
**Status:** OPEN - discovered 2026-04-20; accessibility specialist review confirmed `confirmDialog()` (wherever it is used as a generic confirmation prompt) lacks `role="dialog"`, a `tabindex="-1"` container for focus trap, and a `restoreFocus` call on close.
**Description:** The native-style confirmation dialogs are not accessible to keyboard and screen reader users. Users who cannot use a mouse cannot access or dismiss these dialogs.
**Recommended resolution:** Refactor `confirmDialog()` and all modal dialogs to include `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, a focus trap that restricts Tab/Shift-Tab to the dialog, and a `restoreFocus()` call on close that returns focus to the triggering element.

## GAP-35: Message Input Has No Accessible Label

**Severity:** HIGH
**Affected stories:** US-X1
**Status:** OPEN - discovered 2026-04-20; accessibility review found `index.html:149` — the chat message input — has only a `placeholder` attribute and no `<label>` or `aria-label`. Screen readers cannot identify the field by name.
**Description:** Placeholder text is not a substitute for an accessible label. Screen reader users navigating by form fields will encounter an unlabeled input.
**Recommended resolution:** Add `aria-label="Chat message"` (or a visually-hidden `<label>`) to the message input element.

## GAP-36: No Master CV Onboarding — Raw FileNotFoundError on First Run

**Severity:** CRITICAL
**Affected stories:** US-F4
**Status:** OPEN - discovered 2026-04-20; first-time user review confirmed `cv_orchestrator.py:130–133` raises `FileNotFoundError("Master data file not found: ... Please create Master_CV_Data.json first.")` when `master_data_path` is absent. This propagates as a 500 error. No UI intercepts it, no onboarding redirect exists, and all three creation paths (LinkedIn export, resume import, manual) are entirely unimplemented.
**Description:** A first-time user with no `Master_CV_Data.json` cannot use the application. The only guidance is a raw developer error message in the server log. This is a complete adoption blocker.
**Recommended resolution:** Add an early-startup check for the master data file. If missing, redirect to a dedicated onboarding wizard before opening any session UI. Implement at minimum one creation path (structured JSON editor or guided form) and document the other two paths.

## GAP-37: No Welcome Screen or App-Purpose Statement for First-Time Users

**Severity:** HIGH
**Affected stories:** US-F1
**Status:** PARTIAL - updated 2026-04-22; first-time user review confirmed the welcome/onboarding modal is now implemented (`session-manager.js:155–179`, `index.html:258–325`). The modal provides an app description and a "Get Started" button. Remaining issues: LLM provider setup is never mentioned as a prerequisite; the "Get Started" button closes the modal but does NOT navigate to the Job tab; the modal cannot be re-opened from anywhere in the UI. These remaining issues are tracked as GAP-76, GAP-77.
**Description:** First-time users cannot identify what the application does, what prerequisites exist, or how to start without external documentation. Undefined terms ("ATS," "Harvest," "Master CV," "Customise") appear immediately in the tab bar.
**Recommended resolution:** Add a first-visit welcome screen that explains the application's purpose in one sentence, lists the two prerequisites (Master CV file and LLM provider), and provides a clear "Get started" CTA. Add inline definitions or tooltips for jargon terms ("ATS," "Harvest") on first encounter.

## GAP-38: "Delete" Session Button Label Misleads — Should Read "Move to Trash"

**Severity:** MEDIUM
**Affected stories:** US-S3
**Status:** RESOLVED - confirmed 2026-04-22; returning user review confirmed the button at `web/session-switcher-ui.js:85` was relabelled from "Delete" to "Move to Trash" and the `title` attribute also reads "Move session to Trash". The Trash view with Restore and Delete Forever actions provides the full recovery path. Note: the action still executes without a confirmation dialog — tracked as GAP-111.
**Description:** Label-behavior mismatch erodes trust. Soft-delete actions should be labeled "Move to Trash" or "Archive" to distinguish them from permanent deletion.
**Recommended resolution:** Rename the session delete button to "Move to Trash" and update any confirmation dialogs accordingly.

## GAP-39: Cover Letter and Screening DOCX Excluded From File Review and Finalise Package View

**Severity:** HIGH
**Affected stories:** US-O3, US-O4
**Status:** OPEN - discovered 2026-04-20; recruiter-ops review found that cover letter and screening question DOCX files, while generated by the backend, are not surfaced in the File Review tab or the Finalise package view. The complete package appears incomplete to recruiters and the applicant.
**Description:** Recruiters using the app to review submission packages expect all components (CV formats, cover letter, screening questions) to be visible and downloadable from one place. The cover letter and screening DOCX files are invisible in the package review.
**Recommended resolution:** Include cover letter and screening DOCX files in both the File Review tab file listing and the Finalise stage package summary view.

## GAP-40: No Submission Readiness Checklist in Finalise

**Severity:** HIGH
**Affected stories:** US-O4, US-A9
**Status:** OPEN - discovered 2026-04-20; recruiter-ops review found no checklist or summary confirming all required package components (CV formats, cover letter, screening questions, ATS compliance) are present, current, and ready before archiving.
**Description:** Without a submission readiness checklist, users cannot quickly verify completeness. Partially generated or stale-file packages can be archived without warning.
**Recommended resolution:** Add a pre-archive checklist to the Finalise tab that confirms: all three CV formats generated, cover letter generated, screening questions generated (or explicitly skipped), ATS score above threshold (or explicitly acknowledged), and layout freshness current.

## GAP-41: Pre-Job Master-Data Editing Has No UI Entry Point

**Severity:** CRITICAL
**Affected stories:** US-M1, US-A10, US-A11
**Status:** OPEN - discovered 2026-04-20; master CV curator review confirmed the backend correctly permits `/api/master-data/*` writes when `phase == 'init'` (`master_data_routes.py:129`), but `web/ui-core.js:358 STAGE_TABS` only exposes the Master CV tab in the `finalise` stage. The pre-job editing window is a backend contract with no frontend surface.
**Description:** Users who want to update their master CV profile (add a new experience, update skills, fix a publication) before beginning job analysis have no way to access the Master CV editor. They must either complete a full job analysis first or reach the Finalise stage, which may already have customized the data.
**Recommended resolution:** Expose the Master CV tab (or a dedicated "Maintain Master CV" link) in the `job` stage so users can update their profile before any job session begins. Alternatively, add a standalone "Maintain Master CV" view accessible from the header regardless of workflow stage.

## GAP-42: `GET /api/master-data/full` Omits `certifications`

**Severity:** HIGH
**Affected stories:** US-M1, US-A10
**Status:** OPEN - discovered 2026-04-20; master CV curator review confirmed `master_data_routes.py:284–302` does not include `certifications` in the `GET /api/master-data/full` response. `master-cv.js:60` reads `fullData.certifications || []`, so the Certifications section in the Master CV editor always renders empty regardless of what is stored in `Master_CV_Data.json`. Write operations via `POST /api/master-data/certification` work correctly, but data is invisible in the UI.
**Description:** The certifications data is stored correctly and can be written to, but it is invisible to the user because the read endpoint omits it. Any certifications entered via the editor or present in the file are silently lost from the view.
**Recommended resolution:** Add `certifications` to the response body of `GET /api/master-data/full` in `master_data_routes.py`.

## GAP-43: `master_data_routes._save_master` Has No Post-Write Schema Validation

**Severity:** MEDIUM
**Affected stories:** US-M1
**Status:** OPEN - discovered 2026-04-20; master CV curator review found that the `_save_master` helper in `master_data_routes.py:38–51` creates a backup and writes the new file but does not run `validate_master_data_file`. The corresponding helper in `web_app.py:1166–1191` does run validation and restores the backup on failure. This inconsistency means malformed writes through the routes module bypass the validation-and-restore safety net.
**Description:** Two implementations of the same write-path helper exist with different safety guarantees. Writes routed through `master_data_routes._save_master` can corrupt `Master_CV_Data.json` without triggering the automatic restore.
**Recommended resolution:** Consolidate to a single `_save_master` implementation that always runs post-write validation with backup-restore on failure. Remove the duplicate in `web_app.py` or make the routes module call the validated version.

## GAP-44: BibTeX CRUD Modal Does Not Pre-Populate Extra Fields on Edit

**Severity:** MEDIUM
**Affected stories:** US-M4
**Status:** OPEN - discovered 2026-04-20; master CV curator review found that when editing an existing publication via the structured Add/Edit modal, the `extra fields` textarea does not pre-populate from stored BibTeX fields not covered by the fixed form fields (volume, pages, publisher, address, etc.). Clicking Save overwrites those fields with an empty string.
**Description:** Publications with volume, pages, publisher, or other BibTeX fields beyond the fixed set will silently lose those fields if saved through the CRUD modal, because the extra-fields textarea is empty on open.
**Recommended resolution:** When opening the edit modal for an existing publication, populate the `extra fields` textarea with all BibTeX fields that are not mapped to dedicated form inputs.

## GAP-45: Persuasion Warning "Acknowledged" Button Is Bypassed in Collapsed Panel

**Severity:** HIGH
**Affected stories:** US-C2, US-P3
**Status:** PARTIAL - updated 2026-04-22; submission gating was added (commit `732a431`) — `submitBtn.disabled` is true while `persuasionWarningsAcknowledged === false`. However, the warning panel is collapsed by default (`rewrite-review.js:85`, `style="display:none"`) and the "✓ Acknowledged" button lives inside the collapsed section (`rewrite-review.js:92–96`). Users can trigger the acknowledgement by clicking the toggle without reading the warning content. The structural bypass remains open.
**Description:** The persuasion warning system is present but easily bypassed by collapsing the panel. This violates the trust and compliance story requirement that users must acknowledge warnings before submitting rewrite decisions.
**Recommended resolution:** Gate the rewrite decision submission button on at least one of: (a) the warning panel being expanded, or (b) the "Acknowledged" button having been clicked. Store the acknowledgement in session state to persist across page refreshes.

## GAP-46: No In-App Disclosure of LLM Data Transmission

**Severity:** MEDIUM
**Affected stories:** US-C1
**Status:** OPEN - discovered 2026-04-20; trust and compliance review found no notice in the app informing users that their CV content and job descriptions are transmitted to the configured external LLM provider. The localhost URL and single-user framing imply that data stays local.
**Description:** Users who have not read the configuration documentation may not know that submitting a job description or CV content sends that data to an external API (OpenAI, Anthropic, GitHub Models, etc.). This is a data governance transparency gap.
**Recommended resolution:** Display a brief disclosure on the first LLM call of a session (or on initial LLM configuration) noting that content is transmitted to the configured provider. Persist an acknowledgement flag in the session.

## GAP-47: Font Size Control Labeled in CSS px — Designers Think in Typographic pt

**Severity:** MEDIUM
**Affected stories:** US-G2
**Status:** OPEN - discovered 2026-04-20; graphical designer review found the layout tab labels the font size control "Base font size (px)." Graphic designers habitually work in typographic points (12pt = 16px). A user entering "12" in a px field sets a font that appears tiny compared to their expectation.
**Description:** The CSS px unit is not the natural unit for typographic font size decisions. This label will cause confusion for any user with a design background.
**Recommended resolution:** Display the pt equivalent alongside the px value (e.g., "12px (9pt)" or provide a pt input that converts to px internally). Alternatively, change the control to accept pt and convert internally.

## GAP-48: Duplicate `showAlertModal` / `closeAlertModal` Definitions

**Severity:** HIGH
**Affected stories:** US-U4
**Status:** OPEN - discovered 2026-04-20; heuristic evaluation (H4: Consistency and Standards) found both `ui-core.js` and `ui-helpers.js` define `showAlertModal` / `closeAlertModal`. The `ui-helpers.js` comment explicitly notes the duplication. The active implementation depends on module-load order and may produce inconsistent behavior (one version has focus-trap capability; the other does not).
**Description:** Duplicate implementations of the same UI primitive create an undefined contract. Alert dialogs may or may not trap focus depending on which module wins the global assignment. Any bug fix in one implementation will not apply to the other.
**Recommended resolution:** Remove the duplicate in `ui-helpers.js` and use the single canonical version from `ui-core.js` throughout. Audit all call sites to ensure they use the focus-trap-capable version.

## GAP-49: Spell Check Auto-Advances Into Generation Without Confirmation

**Severity:** HIGH
**Affected stories:** US-F2, US-A4b
**Status:** OPEN - discovered 2026-04-20; first-time user and heuristic reviews confirmed that after `submitSpellCheckDecisions()` completes, the frontend immediately calls `generate_cv` with no user prompt, no summary of what will be generated, no indication of expected duration, and no opportunity for the user to make any further changes. The workflow documentation explicitly states: "The user does not manually move from Spell Check into Generate."
**Description:** CV generation is the irreversible convergence of all prior decisions into output files. Silently triggering it after spell-check completion denies the user a final review opportunity. Users who realise they missed a customisation step have already passed the point of no return without knowing it.
**Recommended resolution:** Insert a "Proceed to Generate?" confirmation step after spell-check completion. The prompt should summarize: number of CV formats to be generated, current ATS score, any active staleness warnings, and a "Generate Now" button. This also addresses the H3 (User control and freedom) heuristic finding.

## GAP-50: Backend Helper Duplication Across `web_app.py` and `master_data_routes.py`

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found `_text_similarity` and `_SCREENING_FORMAT_GUIDANCE` are duplicated between `scripts/web_app.py` and `scripts/routes/master_data_routes.py`, creating drift risk for shared logic and prompt guidance.
**Description:** Shared backend utility logic is copied into multiple modules rather than extracted into one supported utility location.
**Recommended resolution:** Move the duplicated helpers into a shared utility module and update both callers to import the same implementation.

## GAP-51: CLI-Only Logic Lives Inside `ConversationManager`

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found readline setup, CLI prompts, and interactive methods live inside `scripts/utils/conversation_manager.py`, which is also imported by the web app.
**Description:** CLI-specific concerns are mixed into a core session/state class used by the Flask application, increasing startup overhead and coupling two runtimes.
**Recommended resolution:** Move CLI-only behavior into a dedicated runner or adapter module and keep `ConversationManager` focused on shared orchestration/state responsibilities.

## GAP-52: `web_app.py` Depends On Private Route-Module Helpers

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found `scripts/web_app.py` imports private helper functions from `scripts/routes/generation_routes.py`, breaking blueprint encapsulation.
**Description:** The main Flask app reaches into route-internal helpers instead of depending on a stable shared service boundary.
**Recommended resolution:** Extract shared harvest/generation helpers into a neutral support module and stop importing private route internals into `web_app.py`.

## GAP-53: Session Listing Re-Scans The Session Tree On Every Request

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found the session-listing endpoints repeatedly call `rglob("session.json")` with no caching.
**Description:** Session browsing scales linearly with on-disk session count because the directory tree is rescanned on each request.
**Recommended resolution:** Add a short-lived cache or timestamp-based invalidation layer for session discovery results.

## GAP-54: Idle-Session Eviction Performs A Full Registry Scan Before Every Request

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found idle-session eviction runs from a per-request hook with no throttle.
**Description:** Every request pays for a registry-wide eviction scan even when no eviction is needed.
**Recommended resolution:** Add a minimum interval between eviction scans or move the sweep to a periodic background task.

## GAP-55: No Explicit Loopback-Only CORS Policy

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found no explicit CORS configuration. The app is safe in its normal localhost usage model, but there is no explicit browser-origin restriction if deployment settings change.
**Description:** Security posture depends on deployment assumptions rather than a declared loopback-only origin policy.
**Recommended resolution:** Add explicit CORS/origin restrictions for loopback origins and document the expected hosting model.

## GAP-56: Session ID Entropy Is Too Small For Anything Beyond Localhost

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found session IDs are truncated to 8 hex characters.
**Description:** Current session IDs are adequate for a single-user localhost tool, but would be too guessable if the app were ever port-forwarded or exposed remotely.
**Recommended resolution:** Increase session ID entropy to at least 64 bits or full UUID length and document any migration implications.

## GAP-57: No Dedicated DNS-Rebinding Regression Test For URL Fetch Guardrails

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review confirmed SSRF checks exist, but found no test that mocks hostname resolution to a private IP after a public hostname is supplied.
**Description:** A key security control is present in code but not pinned down with a regression test.
**Recommended resolution:** Add a unit test that mocks DNS resolution and verifies private-IP rejection after hostname lookup.

## GAP-58: No Static-Route Path-Traversal Regression Test

**Severity:** LOW
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found no targeted test that proves the wildcard static-file route rejects traversal inputs.
**Description:** The code appears safe via `send_from_directory`, but the safety property is not explicitly regression-tested.
**Recommended resolution:** Add tests for `../` and similar traversal inputs against the static route handler.

## GAP-59: `_save_master` Failure Path For `git add` Is Untested

**Severity:** LOW
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found no test that exercises the non-fatal `git add` failure path in master-data saves.
**Description:** A subtle operational path exists without regression coverage.
**Recommended resolution:** Add a test that mocks a failing `git add` subprocess and verifies the write succeeds with an explicit warning.

## GAP-60: `git add` Failure During Master Save Is Silent

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; backend review found `_save_master` runs `git add` with `check=False` and no warning on failure.
**Description:** The master file can be updated successfully while the repo is left untracked or partially staged without any visible signal.
**Recommended resolution:** Log and optionally surface a non-fatal warning when `git add` fails during master-data save.

## GAP-61: Frontend Alert And Confirm Modals Render Unsanitized HTML

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; frontend review found both `web/ui-core.js` and `web/ui-helpers.js` write modal message bodies via `innerHTML`, and `web/job-input.js` passes interpolated error/help text into those sinks.
**Description:** Error/help content can be rendered as HTML inside modal dialogs without sanitization, creating an avoidable XSS surface.
**Recommended resolution:** Use `textContent` plus explicit line-break handling, or sanitize rich content before rendering it into modal bodies.

## GAP-62: Frontend Request Interception Is Split Across Multiple `window.fetch` Monkey Patches

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; frontend review found both `api-client.js` and `fetch-utils.js` replace `window.fetch`, and tests explicitly compensate for the wrapper order.
**Description:** Fetch behavior depends on load order and side-effect layering rather than a single owned request pipeline.
**Recommended resolution:** Consolidate request decoration, conflict handling, and retry/abort behavior into one fetch wrapper or client module.

## GAP-63: `state-manager.js` Still Mirrors Canonical State Onto `globalThis`

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; frontend review found `installLegacyStateGlobals()` exports module state back onto `globalThis` as writable properties.
**Description:** The frontend still operates with two overlapping state models: module-managed state and ambient global state.
**Recommended resolution:** Finish migrating remaining consumers to imports/state-manager accessors and retire the `globalThis` compatibility layer.

## GAP-64: `app.js` Still Lives Outside The Main Frontend Module Graph

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; frontend review found `web/app.js` depends on globals exported from the IIFE bundle generated by `scripts/build.mjs`.
**Description:** The application still uses a transitional build structure rather than a single bundled entrypoint, which weakens import contracts and maintainability.
**Recommended resolution:** Fold `app.js` into the module entrypoint and stop relying on globally exported module functions.

## GAP-65: No Security Regression Test For Modal HTML Injection

**Severity:** LOW
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; frontend review found `tests/js/ui-helpers.test.js` asserts current `innerHTML` behavior but does not include an escaping/sanitization regression test.
**Description:** The current unsafe modal rendering path is not guarded by a regression test that would fail if raw HTML is injected.
**Recommended resolution:** Add tests that pass HTML-looking content into alert/confirm helpers and assert it is escaped or sanitized before render.

## GAP-66: Pull Requests Do Not Run The Broader Non-UI Python Regression Suite

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; CI/CD review found the PR workflow runs a reduced Python subset, while the broader non-UI suite only runs in the full workflow.
**Description:** Important Python regressions can miss PR-time detection because the broader suite is deferred to `main`/nightly/manual execution.
**Recommended resolution:** Run the wider non-UI Python suite on pull requests, or add a reusable medium-weight gate that is still broader than the current PR subset.

## GAP-67: Full Integration Coverage Does Not Protect The Active Development Branch

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; CI/CD review found `.github/workflows/full-integration.yml` triggers on pushes to `main` only.
**Description:** The branch where active development occurs is not protected by the broadest automated regression workflow.
**Recommended resolution:** Extend full integration coverage to the protected development branch or whichever branch is used for normal merge flow.

## GAP-68: No Lint Or Typecheck Gate In GitHub Actions

**Severity:** HIGH
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; CI/CD review found CodeQL and tests in CI, but no `ruff`, `mypy`, or frontend build-verification job.
**Description:** Basic static-quality gates are missing from automated CI, allowing style, type, and stale-build regressions through until later testing.
**Recommended resolution:** Add lint/typecheck/build-verification jobs and require them on PRs.

## GAP-69: GitHub Actions Workflows Duplicate Large Shared Sections

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; CI/CD review found CodeQL, Python setup, JS setup, and harness steps repeated across the PR and full workflows.
**Description:** Workflow duplication increases maintenance cost and the risk that one pipeline is updated while the other silently drifts.
**Recommended resolution:** Extract shared job logic into a reusable workflow or composite action.

## GAP-70: CI Does Not Publish Coverage Or Rich Failure Artifacts On PR Runs

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; CI/CD review found local coverage scripts exist, but PR workflows do not publish coverage reports or failure artifacts.
**Description:** Reviewers get pass/fail signals but limited diagnostic context and no coverage visibility during PR review.
**Recommended resolution:** Publish junit/coverage artifacts on PR runs and consider enforcing minimum thresholds.

## GAP-71: CI Environment Parity With Local `cvgen` Workflow Is Incomplete

**Severity:** MEDIUM
**Affected stories:** Technical review follow-up
**Status:** OPEN - discovered 2026-04-20; CI/CD review found GitHub Actions uses pip-only installs from `scripts/requirements.txt`, while repo guidance emphasizes the local `cvgen` environment.
**Description:** CI and local development use different environment construction paths, increasing the chance of environment-specific failures.
**Recommended resolution:** Either narrow the gap between CI and local environment setup or document and validate the supported differences explicitly.

---

## April 2026 Full-Cycle Additions (GAP-72 through GAP-121)

*Discovered during the 14-persona + heuristic full-cycle review completed 2026-04-22. All prior GAP IDs (01–71) are unchanged except for status updates above.*

---

## GAP-72: Workflow Step Pills Have No `tabindex` — Keyboard Navigation Blocked

**Severity:** HIGH
**Affected stories:** US-X1, US-U7
**Status:** OPEN - discovered 2026-04-22; accessibility and UX expert reviews confirmed all 8 workflow step pills are `<div>` elements with `onclick` handlers but no `tabindex="0"` or `keydown` handlers (`web/workflow-steps.js:666–670`). Keyboard users cannot focus or activate any step pill.
**Description:** The workflow step bar is the primary navigation affordance for the entire application. Without keyboard access, keyboard-only users cannot navigate between stages, trigger back-navigation, or discover the ↻ re-run action.
**Recommended resolution:** Add `tabindex="0"` and `Enter`/`Space` `keydown` event handlers to all step pill elements. Ensure the ↻ re-run icon within each pill is separately reachable. Apply the ARIA `tablist` pattern.

## GAP-73: `.workflow` Container Has No `aria-live` — Stage Changes Not Announced

**Severity:** HIGH
**Affected stories:** US-X1, US-U7
**Status:** OPEN - discovered 2026-04-22; accessibility specialist review found the `.workflow` div has no `aria-live` attribute. When the active stage changes, screen readers receive no notification.
**Description:** Stage transitions are the most significant navigation events in the workflow. Without an `aria-live` region, screen reader users cannot detect when the application has advanced to a new stage.
**Recommended resolution:** Add `aria-live="polite"` and `aria-atomic="true"` to a designated status region that announces stage changes (e.g., "Now at step 3: Customise").

## GAP-74: `aria-invalid` Never Set Dynamically Despite CSS Rule Existing

**Severity:** MEDIUM
**Affected stories:** US-X3
**Status:** OPEN - discovered 2026-04-22; accessibility specialist review found a CSS rule for `[aria-invalid="true"]` exists in `web/styles.css` but `aria-invalid` is never set dynamically by any JavaScript code. Form validation errors are communicated via CSS class changes only.
**Description:** Screen readers use `aria-invalid` to announce validation errors. Without it, users relying on assistive technology receive no error announcement beyond visual styling.
**Recommended resolution:** In all form validation handlers, set `element.setAttribute('aria-invalid', 'true')` on error and `element.removeAttribute('aria-invalid')` on correction. The CSS rule already handles the visual response.

## GAP-75: `#session-conflict-banner` Has No `role="alert"` or `aria-live`

**Severity:** HIGH
**Affected stories:** US-X3, US-U7
**Status:** OPEN - discovered 2026-04-22; accessibility specialist review found the session conflict banner (`index.html`) has no `role="alert"` or `aria-live` attribute. Screen reader users are not notified of session conflicts.
**Description:** Session conflict banners alert the user to an important application-state problem. Without `role="alert"`, a screen reader user will not be informed of the conflict unless they explicitly move focus to the banner.
**Recommended resolution:** Add `role="alert"` to the `#session-conflict-banner` element, or use `aria-live="assertive"` so the announcement interrupts the current screen reader context.

## GAP-76: LLM Provider Prerequisites Not Mentioned in Welcome Onboarding Modal

**Severity:** HIGH
**Affected stories:** US-F1, US-F2
**Status:** OPEN - discovered 2026-04-22; first-time user review confirmed the welcome modal (`index.html:258–325`) introduces the application but makes no mention of the LLM provider setup prerequisite. Users who have not configured a provider encounter an auth failure mid-workflow with no contextual guidance.
**Description:** The LLM provider is required for every analysis, rewrite, and generation action. Without guidance at onboarding, first-time users who have not configured a provider will start a job session and receive a cryptic authentication error after minutes of effort.
**Recommended resolution:** Add a "Prerequisites" list to the welcome modal noting: (1) a `Master_CV_Data.json` file is needed and (2) an LLM provider must be configured via the LLM settings button. Link or highlight the LLM wizard button.

## GAP-77: Welcome Modal "Get Started" Button Doesn't Navigate to Job Tab

**Severity:** MEDIUM
**Affected stories:** US-F1, US-U1
**Status:** OPEN - discovered 2026-04-22; first-time user review found the "✕ Get Started" button (`session-manager.js:155–179`) dismisses the welcome modal but does not navigate to the Job Input tab or trigger the New Session flow. Users are left on the default blank state.
**Description:** After reading the welcome modal, a first-time user expects to be directed to the next action. Closing the modal and remaining on a blank screen provides no momentum.
**Recommended resolution:** After dismissing the welcome modal via "Get Started", programmatically navigate to the Job Input tab (or trigger the New Session flow) so users immediately see their starting point.

## GAP-78: CV Jargon Terms Undefined on First Encounter

**Severity:** MEDIUM
**Affected stories:** US-F1, US-F2
**Status:** OPEN - discovered 2026-04-22; first-time user and heuristic reviews found no inline definitions or tooltips for "ATS", "Harvest", "Master CV", or "Session" on any first-encounter screen.
**Description:** Key terms — particularly "ATS" (Applicant Tracking System) and "Harvest improvements" — have no definition on first encounter. Users unfamiliar with recruitment technology cannot determine their meaning from context.
**Recommended resolution:** Add glossary tooltips or `title` attributes with one-sentence definitions for: ATS, Harvest, Master CV, Session. Alternatively, add a "?" help icon adjacent to each jargon term.

## GAP-79: Preview vs Final Generation Pipeline Distinction Unexplained

**Severity:** HIGH
**Affected stories:** US-F3, US-U6
**Status:** OPEN - discovered 2026-04-22; first-time user and UX expert reviews found no explanation of the staged generation pipeline: HTML preview → layout confirmation → final file generation. Users who click "Generate CV" do not know whether they are producing a draft preview or final submission-ready files.
**Description:** The distinction between the HTML preview, layout-reviewed output, and final generation is not communicated. First-time users face three generation-related actions with overlapping terminology and no explanation of the sequence.
**Recommended resolution:** Add an informational banner or tooltip before the Generate step explaining the three-stage pipeline. Update action button labels to include stage context (e.g., "Generate Preview", "Confirm Layout", "Generate Final Files").

## GAP-80: Button Style Inconsistency — Layout Tab Uses Bootstrap 5 While Other Tabs Use `.action-btn`

**Severity:** MEDIUM
**Affected stories:** US-G2, H4
**Status:** OPEN - discovered 2026-04-22; graphical designer review found the Layout tab uses Bootstrap 5 button classes (`btn btn-primary`, `btn btn-warning`, etc.) while all other workflow tabs use the custom `.action-btn` / `.action-btn-secondary` CSS class system. This creates a ~2–4px height mismatch and visual inconsistency between tabs.
**Description:** Users navigating from the Customise or Rewrite tab to the Layout tab see a different visual language for action buttons. The inconsistency reflects the Layout tab being implemented later with Bootstrap 5 while earlier tabs used the custom system.
**Recommended resolution:** Align the Layout tab buttons with the `.action-btn` system used throughout the rest of the application. Alternatively document a decision to migrate all tabs to Bootstrap 5 and execute it consistently.

## GAP-81: No Minimum Bullet Count Check Before Generation

**Severity:** MEDIUM
**Affected stories:** US-M2
**Status:** OPEN - discovered 2026-04-22; hiring manager review found no validation check enforcing a minimum number of bullets per experience entry. Experience entries with 0 or 1 bullets can be included in the final CV without warning.
**Description:** CVs with single-bullet or empty experience entries signal rushed preparation and are unprofessional. The pre-generation validation does not detect this condition.
**Recommended resolution:** Add a validation check that flags experience entries with fewer than 2 bullets and surfaces a blocking or warning message in the ATS validation report.

## GAP-82: Cover Letter Tone Not Auto-Inferred from Job Analysis

**Severity:** MEDIUM
**Affected stories:** US-M6, US-P5
**Status:** OPEN - discovered 2026-04-22; hiring manager review found the cover letter generation prompt uses a fixed tone regardless of job analysis results. Culture indicators and company communication style identified in the analysis are not used to adjust cover letter formality.
**Description:** A cover letter for a startup engineering role should differ tonally from one for a pharmaceutical director role. The analysis data necessary to make this inference is available but unused.
**Recommended resolution:** Include `culture_indicators` and `communication_style` fields from the job analysis in the cover letter generation prompt. Add a tone preference override in the cover letter settings.

## GAP-83: Page Count Warning Not Shown During Layout Review — Only at Download

**Severity:** MEDIUM
**Affected stories:** US-M4
**Status:** OPEN - discovered 2026-04-22; hiring manager review found the page count warning is wired to the Download tab (`web/download-tab.js`) but not shown during the Layout Review stage where the user is actively adjusting layout.
**Description:** The ideal time to inform users about page count problems is during Layout Review, when they can still make adjustments. Showing the warning only at Download forces an additional round-trip through the layout flow.
**Recommended resolution:** Surface the page count validation result in the Layout Review tab header or beside the preview iframe. Update the layout freshness system to include a page-count-over-limit warning state.

## GAP-84: Cover Letter Named-Achievement Check Absent

**Severity:** MEDIUM
**Affected stories:** US-M6, US-P5
**Status:** OPEN - discovered 2026-04-22; hiring manager review found no validation check that the cover letter body references at least one specific named achievement from the CV. Cover letters can pass all other validations while being generic and achievement-free.
**Description:** The most persuasive cover letters reference concrete achievements. The existing cover letter validation checks word count, company name, and CTA, but not whether specific achievements are cited.
**Recommended resolution:** Add a cover letter body validation rule that checks for the presence of at least one quantified or named achievement (pattern: numbers, percentages, named project, "successfully", etc.) and warns if absent.

## GAP-85: No Bullet Line-Length or Word-Count Check

**Severity:** LOW
**Affected stories:** US-M2, US-R2
**Status:** OPEN - discovered 2026-04-22; hiring manager review found no validation check for overly long bullet points (> 2 lines or > 35 words). Long bullets reduce scannability.
**Description:** Best-practice CV bullets are 1–2 lines (15–30 words). The current pipeline has no check that flags bullets exceeding a reasonable length threshold.
**Recommended resolution:** Add a bullet length check to the pre-generation or ATS validation step that warns when any bullet exceeds a configurable word-count threshold (e.g., 35 words).

## GAP-86: Skill Category Ordering Not Derived from Job Analysis

**Severity:** LOW
**Affected stories:** US-M3, US-R5
**Status:** OPEN - discovered 2026-04-22; hiring manager review found skill categories are ordered by the user's existing master data category order, not by relevance to the target role. The most relevant skill category for a given role may appear last.
**Description:** Job analysis identifies which skills are most important for a role. This ranking is not used to re-order skill categories in the generated CV or in the skill review table.
**Recommended resolution:** After job analysis, compute a per-category relevance score based on how many required/preferred skills belong to each category. Use this to suggest a re-ordered category display in the skills review tab and in the generated CV.

## GAP-87: Font Compliance Validation Absent from ATS Output

**Severity:** MEDIUM
**Affected stories:** US-H1, US-H6
**Status:** OPEN - discovered 2026-04-22; HR/ATS review found no validation check confirming the ATS PDF uses a standard ATS-safe font. Non-standard fonts can cause ATS character mis-parsing.
**Description:** Some ATS platforms reject or misread PDFs with decorative or non-standard fonts. The ATS validation report checks structure, keywords, and contact fields but not font embedding or font family compliance.
**Recommended resolution:** Add a font-family compliance check to ATS validation that reads the embedded font list from the generated ATS PDF and warns if non-standard fonts are detected.

## GAP-88: Year-Only Date Entries Not Rejected During Validation

**Severity:** MEDIUM
**Affected stories:** US-H5
**Status:** OPEN - discovered 2026-04-22; HR/ATS review found experience entries with year-only dates (e.g., "2020–2022") pass ATS date validation. Many ATS platforms require month/year format for accurate tenure calculation.
**Description:** Year-only dates are ambiguous for employment duration calculation. ATS systems often parse this as invalid or estimate incorrectly.
**Recommended resolution:** Add a date-format validation check that flags year-only date entries and recommends month/year format for all experience start and end dates.

## GAP-89: `skill_type` Field Not Persisted to Master CV via Harvest

**Severity:** HIGH
**Affected stories:** US-H8, US-R5
**Status:** OPEN - discovered 2026-04-22; HR/ATS review found that even when the LLM classifies skills as hard or soft during the session, the `skill_type` classification is not written back to `Master_CV_Data.json` via the harvest flow. Classifications are ephemeral session-only data.
**Description:** Hard/soft skill classification affects ATS output structure and section labeling. Without persisting this, every session must reclassify from scratch.
**Recommended resolution:** Add `skill_type` as a harvest-eligible field. Include skill type overrides in the harvest candidates panel and write them to `Master_CV_Data.json` when the user applies harvest.

## GAP-90: Synonym Normalization Absent from ATS Validation Report

**Severity:** MEDIUM
**Affected stories:** US-H4, US-R1
**Status:** OPEN - discovered 2026-04-22; HR/ATS and resume expert reviews found that while the synonym map (`scripts/data/synonym_map.json`) is used for ATS score computation, the validation report does not show synonym grouping. Users see separate entries for "ML" and "Machine Learning" without grouping.
**Description:** Without synonym grouping in the validation report, users cannot verify that their synonym-matched keywords are being counted correctly or identify which canonical term to use for maximum ATS compatibility.
**Recommended resolution:** Update the ATS validation report and analysis tab keyword display to group synonym pairs, showing the canonical term with aliases. Mark each keyword as "matched via synonym" or "exact match".

## GAP-91: No Backup History/Restore UI Despite Backend Support

**Severity:** HIGH
**Affected stories:** US-M1, US-A10
**Status:** OPEN - discovered 2026-04-22; master CV curator review confirmed the backend creates timestamped backup files before every `_save_master` write, but no UI surfaces the backup list or allows the user to restore a prior version.
**Description:** The safety net for master data modifications exists but is invisible. Users who accidentally overwrite or corrupt their master CV data have no way to restore a backup without directly accessing the filesystem.
**Recommended resolution:** Add a "Backup history" section to the Master CV tab (or a dedicated modal) that lists all available backups with timestamps and provides a "Restore this version" action. The restore action should create a new backup of the current state before restoring.

## GAP-92: `publication_count` Stat Card Reads from JSON Not BibTeX

**Severity:** MEDIUM
**Affected stories:** US-M4, US-M7
**Status:** OPEN - discovered 2026-04-22; master CV curator review found the publications stat card in the Master CV overview reads `publication_count` from `Master_CV_Data.json` rather than `publications.bib`. Users who maintain their bibliography exclusively in BibTeX see a count of 0.
**Description:** The application is designed to support BibTeX as the primary bibliography format. The stat card should reflect this by counting from the BibTeX source.
**Recommended resolution:** Update the publications count stat card to call a route that counts entries from `publications.bib` when it exists, falling back to `Master_CV_Data.json`.

## GAP-93: Phase-Enforcement 409 Response Misidentified as Session Conflict in UI

**Severity:** MEDIUM
**Affected stories:** US-M1, US-M3
**Status:** OPEN - discovered 2026-04-22; master CV curator review found that when the backend returns a `409 Conflict` response to enforce phase restrictions, the UI displays a generic "session conflict" error message rather than a phase-appropriate explanation.
**Description:** A `409` during phase enforcement and a `409` during session-ownership conflict are distinct situations with very different user implications. The current UI handling does not distinguish them.
**Recommended resolution:** Add a `conflict_type` field (e.g., `phase_enforcement` vs `session_ownership`) to 409 responses and update the UI error handler to display phase-appropriate messaging.

## GAP-94: Summary Variant Format Inconsistency After Harvest

**Severity:** MEDIUM
**Affected stories:** US-M2, US-A11
**Status:** OPEN - discovered 2026-04-22; master CV curator review found that summary variants stored in `Master_CV_Data.json` can exist as a list (string array) in the original format but may be written back as a dict (keyed variants) after harvest. This inconsistency can cause rendering failures in the Summary review tab for sessions opened after harvest.
**Description:** The `summaries` field in master data has two valid formats (list vs dict), and the harvest write-back may produce a different format than was originally present.
**Recommended resolution:** Standardize the `summaries` field to a single canonical format in `MASTER_CV_DATA_SPECIFICATION.md` and `master_data_validator.py`, then update the harvest write-back and all read paths to use that format consistently.

## GAP-95: Cover Letter Client-Side Validation Still Allows 400 Words

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** OPEN - discovered 2026-04-22; persuasion expert review found that while the LLM cover letter generation prompt was tightened to ~250–300 words (commit `e0212e3`), the client-side word count validation still accepts cover letters up to 400 words without warning. The LLM prompt and client validator are out of sync.
**Description:** A cover letter generated at the prompt's 250–300 word target will pass validation. But if a user manually edits a cover letter up to 400 words, no warning is shown.
**Recommended resolution:** Update the client-side cover letter word count threshold from 400 to 300 to match the prompt's target. Display a warning (not blocking) when the cover letter exceeds 300 words.

## GAP-96: Cover Letter CTA Validation Accepts Passive Closings

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** OPEN - discovered 2026-04-22; persuasion expert review found the cover letter CTA (call-to-action) validator accepts passive closings such as "I look forward to hearing from you" without flagging them as weak. Persuasion best practice requires an active, initiative-taking closing.
**Description:** Passive closings put the burden of action on the hiring manager. Active closings imply the applicant will follow up (e.g., "I will follow up on [date]").
**Recommended resolution:** Update the CTA validation heuristic to flag passive constructions ("I look forward to hearing", "Please feel free to contact me") and suggest an active alternative.

## GAP-97: No Positive-Sum Metric Framing Preference in CV Writing Guidance

**Severity:** LOW
**Affected stories:** US-P3
**Status:** OPEN - discovered 2026-04-22; persuasion expert review found no guidance or validation rule encouraging positive-sum framing of metrics. The persuasion check suite covers action verbs and CAR structure but not framing polarity.
**Description:** Negative-framing metrics (cuts, reductions, eliminations) can create unfavorable impressions even when the underlying achievement is positive. Persuasion-optimal CVs frame all quantified outcomes in additive, growth-oriented terms.
**Recommended resolution:** Add a positive-sum framing check to the persuasion heuristic suite. Flag bullets where a quantified negative outcome (reduced, cut, eliminated, decreased) appears without a corresponding positive consequence.

## GAP-98: No Keyboard Shortcuts for Workflow Navigation

**Severity:** HIGH
**Affected stories:** US-W1, US-W3, US-U7
**Status:** OPEN - discovered 2026-04-22; power user review found no keyboard accelerators for any workflow step, action button, or review operation. High-throughput users who process multiple CVs per day must use a mouse for every navigation and decision action.
**Description:** The absence of any keyboard shortcut support creates a speed bottleneck for power users and an access barrier for users with motor impairments.
**Recommended resolution:** Implement keyboard shortcuts for: advance to next step (`Ctrl+→`), trigger action button (`Ctrl+Enter`), accept current item (`A`), reject current item (`R`), and navigate between review cards (`↑`/`↓`). Publish shortcuts in a keyboard shortcut reference panel.

## GAP-99: No Bulk Accept/Reject for Rewrites

**Severity:** MEDIUM
**Affected stories:** US-W1, US-U5
**Status:** OPEN - discovered 2026-04-22; power user and UX expert reviews found no bulk accept/reject control for the rewrite review panel. Bulk-accept exists for experience, skills, and achievements but not for rewrites. Sessions with 15–20 rewrite proposals require individual card-by-card attention.
**Description:** The absence of bulk-accept for rewrites is the most significant workflow bottleneck for power users after keyboard shortcuts.
**Recommended resolution:** Add "Accept All Recommended" and "Reject All" buttons to the rewrite review panel header, consistent with the pattern used in the skills review panel (`web/skills-review.js:941`). These should respect existing persuasion-warning gating.

## GAP-100: No Bulk Toolbar for Publications

**Severity:** LOW
**Affected stories:** US-W1
**Status:** OPEN - discovered 2026-04-22; power user review found no bulk accept/reject for the publications review table. Each publication must be individually toggled. Publications tables can contain 20–30 entries.
**Recommended resolution:** Add bulk-accept (accept all recommended) and bulk-reject (reject all non-recommended) controls to the publications review table header.

## GAP-101: No Forward Stage Skip Mechanism

**Severity:** MEDIUM
**Affected stories:** US-W1, US-W3
**Status:** OPEN - discovered 2026-04-22; power user review found no mechanism to skip forward from a completed stage to a non-adjacent later stage. Users who want to jump from Customise directly to Spell Check must proceed through the normal sequential workflow.
**Description:** Power users iterating on a specific aspect of their CV need to jump stages. The current workflow forces sequential progression even when intermediate stages are already completed.
**Recommended resolution:** Allow forward-skip navigation when all intermediate stages have been previously completed. Guard forward-skip with a lightweight confirmation if any intermediate stage data may be stale.

## GAP-102: Application Submission Status Not Visible in Session List

**Severity:** HIGH
**Affected stories:** US-O2
**Status:** OPEN - discovered 2026-04-22; recruiter-ops review found the session switcher shows position name, phase label, created date, and last-modified date — but not `application_status` from `metadata.json`. Users managing multiple applications cannot see which packages are sent, ready, or draft without opening each session.
**Description:** For a user tracking 5–10 active applications, the inability to see submission status in the session list forces them to open and close each session individually.
**Recommended resolution:** Update `GET /api/sessions/list` to include `application_status` from each session's `metadata.json`. Render the status as a badge (Draft / Ready / Sent) in each session row.

## GAP-103: No Post-Archive Metadata Update Endpoint or UI

**Severity:** MEDIUM
**Affected stories:** US-O2
**Status:** OPEN - discovered 2026-04-22; recruiter-ops review found no route or UI to update `application_status` or `notes` after a session has been archived. Users who want to update status from "Sent" to "Interview" must reload the entire session into the active workflow.
**Recommended resolution:** Add a `PATCH /api/sessions/{id}/metadata` endpoint that accepts `application_status` and `notes` updates. Surface a lightweight "Update status" UI in the session list row.

## GAP-104: "Done" Phase Label Misleading for Active-Refinement Sessions

**Severity:** LOW
**Affected stories:** US-S1, US-O2
**Status:** OPEN - discovered 2026-04-22; recruiter-ops and returning user reviews found `SESSION_PHASE_LABELS_SHORT.refinement = 'Done'` (`web/utils.js:282`). Sessions in `refinement` phase are actively being refined, not necessarily complete. A session that reached the finalise step but was never submitted also shows "Done".
**Recommended resolution:** Replace "Done" with "Finalise" or "Refine" for sessions in `refinement` phase without an `application_status`. For sessions with `application_status = 'sent'`, show "Sent". Consider a compound status badge.

## GAP-105: No Cross-Application Summary/Pipeline Dashboard View

**Severity:** MEDIUM
**Affected stories:** US-O4
**Status:** OPEN - discovered 2026-04-22; recruiter-ops review found the session list is the only multi-application surface, showing only position name, phase, and timestamps with no ATS score, status, or action summary.
**Description:** A user managing 5–10 simultaneous applications needs a consolidated pipeline view to track progress, identify actions needed, and assess overall campaign health.
**Recommended resolution:** Add an "Applications" dashboard view that shows all sessions with columns for: company, role title, application status, ATS score, date last modified, and a quick-action button.

## GAP-106: No Generation Timestamp Shown in File List

**Severity:** MEDIUM
**Affected stories:** US-O3, US-S3
**Status:** OPEN - discovered 2026-04-22; recruiter-ops review found `populateDownloadTab` (`web/download-tab.js:276–325`) renders no "generated at" timestamp alongside file names. After a back-to-phase re-run, users cannot confirm that displayed files reflect the current review decisions.
**Description:** Multiple generation passes within a session produce files with the same date-stamped naming pattern. Without a visible "generated at" timestamp, users cannot confirm currency after re-generation.
**Recommended resolution:** Include a `generatedAt` timestamp in the `cvData.files` response and render it alongside each file in the download grid.

## GAP-107: Synonym Grouping Absent from Analysis UI

**Severity:** HIGH
**Affected stories:** US-R1, US-H4
**Status:** OPEN - discovered 2026-04-22; resume expert and HR/ATS reviews confirmed the synonym map (`scripts/data/synonym_map.json`) is used for ATS scoring but the analysis UI displays each keyword variant separately. Users see "ML" and "Machine Learning" as distinct entries without any grouping or annotation.
**Description:** Without synonym grouping in the analysis display, users cannot determine which keyword variants are being resolved together and cannot make informed decisions about which form to use in their CV text.
**Recommended resolution:** Update `populateAnalysisTab` (`web/review-table-base.js`) to group canonical keywords with their synonym aliases. Mark each keyword as "exact match", "synonym match", or "partial match".

## GAP-108: Default Experience Sort Is Recency-Biased, Not Relevance-Based

**Severity:** HIGH
**Affected stories:** US-R2, US-U4
**Status:** OPEN - discovered 2026-04-22; resume expert review found `buildExperienceReviewTable` (`web/experience-review.js:83–89`) sorts experiences by `start_date` descending on first load. The LLM recommendation provides relevance signal, but the visual default privileges recency.
**Description:** For career-changers or those with highly relevant older roles, the recency-biased default sort means the most relevant experience may appear at the bottom of the review table.
**Recommended resolution:** Change the default sort order on first load to order by LLM recommendation strength (Emphasize > Include > De-emphasize > Omit) as the primary key, with recency as a secondary key. Show a "Sorted by relevance" label and allow users to switch to recency sort.

## GAP-109: Domain Inference Confidence Not Surfaced

**Severity:** MEDIUM
**Affected stories:** US-R1
**Status:** OPEN - discovered 2026-04-22; resume expert review found the domain badge in the analysis tab shows only the inferred value with no confidence level or disambiguation pathway. Ambiguous domain inferences are silently applied.
**Description:** The analysis prompt infers a technical domain that affects keyword weighting and skill ordering. When this inference is ambiguous or wrong, users have no signal to challenge it and no mechanism to override it.
**Recommended resolution:** Include a `domain_confidence` field (High/Medium/Low) in the job analysis response and display it alongside the domain badge. For Low confidence, add an inline "Is this correct?" override that lets users select from alternatives or enter a custom domain.

## GAP-110: No Restored-Decisions Summary on Session Return

**Severity:** HIGH
**Affected stories:** US-S1, US-S3
**Status:** OPEN - discovered 2026-04-22; returning user review found that after session restore, there is no human-readable summary of what was recovered. The user must navigate to every review tab individually to verify that prior decisions (experiences selected, skills, approved rewrites) are intact.
**Description:** A returning user's first question after re-opening a session is "where did I leave off?" The current restore message answers "what stage" but not "what did I decide".
**Recommended resolution:** After session restore, display a brief "Restored decisions" summary panel showing: N experiences selected (N recommended), N skills included, N/M rewrites approved, last activity timestamp. The panel should appear for the first visit after restoration and be dismissible.

## GAP-111: "Move to Trash" Executes Without Confirmation Dialog

**Severity:** LOW
**Affected stories:** US-S3
**Status:** OPEN - discovered 2026-04-22; returning user review found `_deleteSessionFromModal()` (`web/session-switcher-ui.js:317`) calls the delete API directly with no `confirmDialog()`. While the action is reversible (session goes to Trash), the red "Move to Trash" button immediately removes the session from the active list without user confirmation.
**Description:** Both "Delete Forever" and "Empty Trash" use `confirmDialog()` before proceeding. "Move to Trash" does not, creating an inconsistent behavior pattern.
**Recommended resolution:** Add a `confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the API call in `_deleteSessionFromModal()`.

## GAP-112: Abbreviated Phase Labels Opaque to Returning Users

**Severity:** MEDIUM
**Affected stories:** US-S1, US-O2
**Status:** OPEN - discovered 2026-04-22; returning user and recruiter-ops reviews found `SESSION_PHASE_LABELS_SHORT` (`web/utils.js:274–285`) maps phase values to abbreviated labels: `customization` → "Custom", `rewrite_review` → "Rewrites", `refinement` → "Done". These appear in the session switcher header and session modal rows. "Custom" is non-obvious; "Done" is misleading for active-refinement sessions.
**Recommended resolution:** Expand `SESSION_PHASE_LABELS_SHORT` to use more descriptive labels: "Customising", "Reviewing rewrites", "Finalising", "Generated". Update "Done" for `refinement` to "Finalise" or a phase-appropriate label.

## GAP-113: No Session Duplicate/Copy Action

**Severity:** LOW
**Affected stories:** US-W3, US-S3
**Status:** OPEN - discovered 2026-04-22; returning user review found the sessions modal offers Load, Rename, and Move to Trash but no Duplicate. Users who want to try a different customization approach cannot create a copy without starting a new session from scratch.
**Recommended resolution:** Add a "Duplicate session" action to the sessions modal row that creates a deep copy of the session directory and state file under a new session ID and name.

## GAP-114: Session Rename Uses `window.prompt()` Instead of In-App Modal

**Severity:** LOW
**Affected stories:** US-S3, H4
**Status:** OPEN - discovered 2026-04-22; returning user review found `promptRenameCurrentSession()` (`web/session-manager.js:735`) uses `window.prompt()` for the header rename button. This can be blocked by browsers, fails screen readers, and is inconsistent with the application's custom `confirmDialog()` and `showAlertModal()` patterns.
**Recommended resolution:** Replace `promptRenameCurrentSession()` with an in-app modal using the existing `confirmDialog()` infrastructure. Alternatively, wire the header ✏️ button to open the sessions modal with the rename field pre-focused.

## GAP-115: Persistent Non-Confidential LLM Provider Warning Absent After Setup

**Severity:** HIGH
**Affected stories:** US-C1, US-C3
**Status:** OPEN - discovered 2026-04-22; trust and compliance review found that providers marked `confidential: False` in `provider_registry.py` (Gemini free-tier and Groq) only show data-retention disclosures during the LLM wizard setup popover. After the wizard is closed, no persistent indicator warns the user that CV content is being transmitted to a non-confidential provider.
**Description:** A user who configured Gemini free-tier at startup and never re-opened the wizard has no ongoing reminder that their CV and job description content may be reviewed by Google. The header pill shows only model name and auth status.
**Recommended resolution:** Add a persistent visual indicator (e.g., an amber "⚠ Non-confidential" badge in the header LLM pill) when the active provider has `confidential: False`. The indicator should link to the provider privacy policy.

## GAP-116: Per-Item Decision Gate Absent from Customization Stages

**Severity:** MEDIUM
**Affected stories:** US-C2, US-A3
**Status:** OPEN - discovered 2026-04-22; trust and compliance review confirmed that the experience, skill, and achievement review panels allow users to proceed to generation without making explicit decisions on any individual item. Undecided items silently default to the LLM's `recommendation` field without user confirmation.
**Description:** The rewrite review panel requires explicit per-item decisions before submission is enabled. The customization stage has no equivalent gate. This asymmetry means users can produce a final CV where all customization decisions were made by the LLM without any user review.
**Recommended resolution:** Add a soft gate to the Generate action that warns when any customization section has items that have never been individually reviewed. Display a count: "3 experience recommendations not reviewed — proceed anyway?" The rewrite panel's existing gate pattern is the reference implementation.

## GAP-117: AI-Generated Summary Variants Have No AI-Proposal Label

**Severity:** MEDIUM
**Affected stories:** US-C1, US-C3
**Status:** OPEN - discovered 2026-04-22; trust and compliance review found that when the LLM proposes a professional summary variant, the variant is presented in the Summary review tab without any "AI-proposed" label distinguishing it from user-authored summaries stored in `Master_CV_Data.json`.
**Description:** Users cannot distinguish between summaries they wrote and summaries the AI generated. This undermines the transparency model that the rest of the review flow (word-level diffs, confidence badges) is designed to enforce.
**Recommended resolution:** Label AI-generated summary variants with an "🤖 AI-proposed" badge. User-authored summaries from master data should be labeled "📄 From your Master CV".

## GAP-118: No Session Audit Panel Accessible from Finalise Tab

**Severity:** MEDIUM
**Affected stories:** US-C3
**Status:** OPEN - discovered 2026-04-22; trust and compliance review found that `rewrite_audit` is persisted to `session.json` (`conversation_manager.py:920`) but is not exposed in any UI tab. Users who want to review the full record of what was proposed, accepted, edited, or rejected have no way to do so without inspecting `session.json` directly.
**Description:** For compliance use cases (confirming what AI changes were accepted before submitting a CV to a regulated employer), the absence of an audit view is a gap. The data exists but is inaccessible through the UI.
**Recommended resolution:** Add a collapsible "Rewrite audit log" section to the Finalise tab that renders the `rewrite_audit` array in a readable table: proposal, original text, final text, outcome (accepted/edited/rejected), timestamp.

## GAP-119: AI Attribution Option Absent from Generated Files

**Severity:** LOW
**Affected stories:** US-C3
**Status:** OPEN - discovered 2026-04-22; trust and compliance review found the generated CV files contain no metadata, footer, or header indicating AI assistance. For contexts where AI-assisted content authorship requires disclosure (academic submissions, grant applications, some government roles), users have no opt-in mechanism.
**Recommended resolution:** Add an optional "AI-assisted" disclosure setting (default off). When enabled, include a document property and optionally a footer note in generated PDF/DOCX files noting that AI assistance was used.

## GAP-120: Tab `<div>` Elements Keyboard-Inaccessible — CRITICAL

**Severity:** CRITICAL
**Affected stories:** US-U7, US-X1, and all workflow stories
**Status:** OPEN - discovered 2026-04-22; UX expert and accessibility reviews confirmed all viewer tabs (`web/index.html:177–197`) are `<div role="tab">` elements with no `tabindex="0"` and click-only event wiring (`web/app.js:122–125`). Keyboard-only users cannot activate any viewer tab in the entire application.
**Description:** This is a blocking accessibility failure. The viewer tab bar contains all content tabs (Analysis, Experiences, Skills, Achievements, Publications, Rewrites, Spell Check, Generated CV, Layout, File Review, Finalise, Master, Cover Letter, Screening). Every one of these is inaccessible without a mouse. This is a WCAG 2.1 Level A requirement.
**Recommended resolution:** For each `.tab` element: (1) add `tabindex="0"`, (2) add an `Enter`/`Space` `keydown` handler that calls `switchTab(tab.dataset.tab)`, (3) implement `ArrowLeft`/`ArrowRight` navigation between tabs within the tab bar per the ARIA `tablist` pattern.

## GAP-121: Layout Clarification Uses `window.prompt()` — Accessibility Anti-Pattern

**Severity:** MEDIUM
**Affected stories:** US-U9, US-X2
**Status:** OPEN - discovered 2026-04-22; UX expert review found `showClarificationDialog()` (`web/layout-instruction.js:842–851`) uses `window.prompt()` (native browser dialog) to request clarification when a layout instruction is ambiguous. This breaks screen reader context and may be blocked by browser security policies.
**Description:** `window.prompt()` is inconsistent with the application's custom modal infrastructure (`confirmDialog()`, `showAlertModal()`, `trapFocus()`). It cannot be styled and breaks the keyboard focus chain.
**Recommended resolution:** Replace `showClarificationDialog()` with an inline clarification input rendered within the layout pane — a text input field that appears below the instruction textarea with a "Submit clarification" button, using the application's existing `trapFocus()` infrastructure.

## GAP-122: Workflow Bar Overflow at 1280px Viewport Width

**Severity:** MEDIUM
**Affected stories:** US-U8, H8
**Status:** OPEN - discovered 2026-04-22; UX expert review found `web/styles.css:146` defines `.workflow-steps { display: flex; gap: 32px; }` without `flex-wrap: wrap`. With 8 step pills and 7 arrows at 32px gap, the workflow bar risks horizontal overflow on 1280px viewport widths.
**Description:** At 1280px, the 8-step workflow bar may truncate or overflow without wrapping, hiding step pills from view. This creates an inconsistent experience for users on smaller laptop displays.
**Recommended resolution:** Add `flex-wrap: wrap` or reduce `gap` to 16px at viewports ≤1400px via a media query. Alternatively, introduce abbreviated step labels at narrow widths.

## GAP-123: `#layout-freshness-chip` Button Has Empty `aria-label=""`

**Severity:** HIGH
**Affected stories:** US-U7, US-X2
**Status:** OPEN - discovered 2026-04-22; UX expert review found `web/index.html:87` — `<button id="layout-freshness-chip" ... aria-label="">`. An explicitly empty `aria-label` on a focusable interactive element causes screen readers to announce the button with no accessible name. This is a WCAG 2.1 Level A failure.
**Description:** The layout freshness chip is a focusable button that communicates layout currency state. Screen reader users navigating by Tab reach this button and hear nothing — the button has no announced purpose or label.
**Recommended resolution:** Set `aria-label` to a meaningful value that includes the current freshness state, e.g., `aria-label="Layout freshness — layout is current"`. Update the label dynamically as freshness state changes.

## GAP-124: `final_generation` Missing from SESSION_PHASE_LABELS

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`web/utils.js:262–285` defines `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` but omits the `final_generation` phase key. Sessions in the `FINAL_GENERATION` phase display the raw Python string "final generation" (lowercase, with space) in the session switcher instead of a human-readable label.
**Source evidence:** `web/utils.js:262–285`; returning-user persona review 2026-06-18.

## GAP-125: Layout Scope Label Invites Text Changes

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`web/layout-instruction.js:293` renders the placeholder/label "Describe a layout or text change — the AI will determine the right approach." This directly contradicts US-U9 AC 1 and AC 7, which require that only layout changes are accepted at this stage and that approved text is never modified. The label actively encourages users to request text changes that should be blocked.
**Source evidence:** `web/layout-instruction.js:293`; ux-expert.md 2026-06-18.

## GAP-126: Cover Letter Word Count Hardcoded for All Role Types

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`scripts/routes/master_data_routes.py:1566` hard-codes the cover letter length target as `~250-300 words` regardless of role type. US-M6 requires: 300–400w for standard roles, 400–500w for executive roles, 500–600w for research/academic roles. The current prompt will underdeliver for executive and academic candidates.
**Source evidence:** `scripts/routes/master_data_routes.py:1566`; hiring-manager.md 2026-06-18.

## GAP-127: `candidate_to_confirm` Skills Not Rendered in Review UI and Not Excluded from Output

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`scripts/utils/cv_orchestrator.py:1779` sets a `candidate_to_confirm` flag on skill additions that have weak evidence. However, `web/` has zero references to `candidate_to_confirm` in any rendering code — the flag is never displayed to the user in the skills review tab. Furthermore, no output rendering code checks this flag before including the skill in generated PDF/DOCX/HTML. Skills with unconfirmed evidence are indistinguishable from confirmed skills in both the review UI and the generated artefacts.
**Source evidence:** `scripts/utils/cv_orchestrator.py:1779`; `web/skills-review.js` (no reference to flag); resume-expert.md 2026-06-18.

## GAP-128: Rejected Rewrites Absent from `rewrite_audit`

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`web/rewrite-review.js:361` records accepted proposals to `rewrite_audit` but does not record rejected proposals. If a user rejects all rewrites, `rewrite_audit` in `metadata.json` is empty. US-R6 AC3 requires an audit entry for every proposal regardless of outcome (accepted, edited, or rejected) so the full review history is preserved.
**Source evidence:** `web/rewrite-review.js:361`; `scripts/utils/conversation_manager.py`; resume-expert.md 2026-06-18.

## GAP-129: ATS Report Modal Lacks Focus Management

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`web/ats-modals.js:112–141` opens the ATS Report modal with `style.display = 'flex'` but does not call `setInitialFocus()`, `trapFocus()`, or `restoreFocus()`. On close, keyboard focus returns to `<body>` rather than the triggering element. Screen reader and keyboard users cannot use this modal reliably.
**Source evidence:** `web/ats-modals.js:112`; accessibility-specialist.md 2026-06-18.

## GAP-130: Persuasion Warning Panel Collapsed by Default — Bypass Possible

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`web/rewrite-review.js:107` initialises the persuasion warnings panel in a collapsed state. The "Acknowledged" button is rendered inside the collapsed section (`rewrite-review.js:114`). A user can click "Proceed anyway?" (line 383–389) to bypass the entire warning panel without expanding it or reading any individual warning. This violates the trust requirement that persuasion warnings must be reviewed before proceeding.
**Source evidence:** `web/rewrite-review.js:107, 114, 383–389`; trust-compliance.md 2026-06-18.

## GAP-131: No Blocking Gate at Customise Stage

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
Users can proceed from the Customise stage to CV generation without visiting or making any decision on experience, skill, or achievement items. All customisation decisions silently inherit LLM defaults. There is no progress gate or minimum-decision requirement (e.g., "Review at least one experience item") before the Generate button becomes active at the Customise stage.
**Source evidence:** `web/app.js:123–130`; trust-compliance.md 2026-06-18.

## GAP-132: Two Divergent CV Output Templates with Different Visual Identities

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
The application ships two CV output templates with different visual identities that produce visually inconsistent output for the same session: (1) `templates/cv-template.html` — uses Inter font family, `rem` units, CSS custom properties, `#2980b9` blue, flex `32% / 68%` two-column layout; (2) `templates/cv-style.css` / layout preview — uses Segoe UI/Arial, `pt` units, no CSS custom properties, `#2c5aa0` blue, grid `2.8fr / 1.2fr`. A user reviewing the HTML preview sees a different visual product than what appears in the DOCX download.
**Source evidence:** `templates/cv-template.html`; `templates/cv-style.css`; graphical-designer.md 2026-06-18.

## GAP-133: No CSS Design Token Layer

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`web/styles.css` contains approximately 50 hard-coded hex colour literals scattered across rules. `web/index.html` contains approximately 216 inline `style=""` attributes. No `:root {}` CSS custom properties block exists. Any colour, spacing, or typography change requires grep-and-replace across multiple files with high risk of missed instances, and brand changes are impractical to apply consistently.
**Source evidence:** `web/styles.css` (no `:root {}`); `web/index.html` (~216 inline styles); graphical-designer.md 2026-06-18.

## GAP-134: No "Queued" Session Status in Schema

**Priority:** LOW
**Status:** Open
**Found:** 2026-06-18 cvUiReview
The session status schema accepts only `draft`, `ready`, and `sent`. US-A1 implies a `queued` or `parked` state for sessions where intake is complete but the user has deliberately set them aside for later. Without this state, users have no way to mark sessions as intentionally pending.
**Source evidence:** `scripts/routes/session_routes.py` (status enum); applicant.md 2026-06-18.

## GAP-135: Intake Confirmation Fields Not Inline-Editable

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
After URL fetch populates the job intake confirmation card (company, role, date, location, salary fields), those fields are displayed as read-only text. US-U2 AC4 requires that these extracted fields be inline-editable so the user can correct extraction errors without re-fetching. `web/job-input.js:49–84` and `web/review-table-base.js:222–248` show no inline edit mechanism for the confirmation card fields.
**Source evidence:** `web/job-input.js:49–84`; ux-expert.md 2026-06-18.

## GAP-136: No Post-Generation Cover Letter Word Count Enforcement

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
US-P5 AC3 requires a programmatic check that the generated cover letter falls within the target word count range for the role type. Currently, the only mechanism is the LLM prompt instruction (`master_data_routes.py:1566`). No post-generation validation counts words and warns or blocks if the output is outside range. LLMs routinely deviate from length instructions.
**Source evidence:** `scripts/routes/master_data_routes.py:1566`; persuasion-expert.md 2026-06-18.

## GAP-137: Cover Letter CTA Check Accepts Passive Closings

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
US-P5 AC4 requires the cover letter to contain a specific, active call-to-action (e.g., "I will follow up on [date]" rather than "I look forward to hearing from you"). No post-generation pattern check distinguishes passive from active CTAs. The LLM prompt mentions "call to action" but does not enforce the active/specific requirement with a verifiable rule.
**Source evidence:** `scripts/routes/master_data_routes.py:1570`; persuasion-expert.md 2026-06-18.

## GAP-138: Professional Summary Prompt Uses Title-First Opener (Not Value-Identity-First)

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
US-P1 AC1 requires the summary to open with a value-identity-first framing (e.g., "Scaling ML inference pipelines…") rather than a title-and-tenure opener (e.g., "Senior ML Engineer with 8 years of experience…"). `scripts/utils/llm_client.py:850` instructs the LLM with a title-first opener pattern, producing summaries that fail the persuasion expert's value-identity requirement.
**Source evidence:** `scripts/utils/llm_client.py:850`; persuasion-expert.md 2026-06-18.

## GAP-139: `post_analysis_answers` Not Passed to `generate_professional_summary`

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
Clarification answers (`post_analysis_answers`) are injected into the cover letter and screening question prompts but are absent from the `generate_professional_summary` call at `scripts/utils/llm_client.py:754`. The summary LLM therefore lacks the user's clarification context (e.g., "I led the team during the reorg") that was provided during the analysis phase. This context is material to producing a personalised, accurate summary.
**Source evidence:** `scripts/utils/llm_client.py:754`; persuasion-expert.md 2026-06-18.

## GAP-140: Icon-Only Controls Missing `aria-label`

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
Two always-visible interactive elements in the header have no accessible name: (1) `#toggle-chat` (`web/index.html:149`) — the ◀/▶ panel collapse button; (2) `#rename-session-btn` (`web/index.html:76–79`) — the ✏️ rename button. Additionally, multiple modal close `×` buttons across the application use `title` attribute only (not reliably announced by screen readers) with no `aria-label`. This is a WCAG 2.1 Level A failure for each of these elements.
**Source evidence:** `web/index.html:76–79, 149`; accessibility-specialist.md 2026-06-18.

## GAP-141: BibTeX CRUD Modal Converts `editor` Field to `author` on Save

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
The publication CRUD modal in `web/master-cv.js` loads the `editor` BibTeX field into the `author` input field (`master-cv.js:1448`) and always saves the result back as `fields.author` (`master-cv.js:1498`). For edited volumes and book chapters where the BibTeX entry has an `editor` field but no `author` field, one CRUD modal save silently converts the `editor` to `author`, corrupting the BibTeX entry and breaking citation formatting.
**Source evidence:** `web/master-cv.js:1448, 1498`; master-cv-curator.md 2026-06-18.

## GAP-142: Bulk BibTeX Import Skips Per-Entry Required-Field Validation

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`POST /api/master-data/publications/import` at `scripts/routes/master_data_routes.py:1375–1415` validates that the uploaded file parses as valid BibTeX but does not validate required fields (title, year, author or editor) on a per-entry basis. Entries missing required fields are imported silently and may produce malformed citations in the generated CV.
**Source evidence:** `scripts/routes/master_data_routes.py:1375–1415`; master-cv-curator.md 2026-06-18.

## GAP-143: `showConfirmModal` Missing Focus Management

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview (cycle 2)
`showConfirmModal` in `web/ui-helpers.js:41–48` sets `display: block` on the confirm modal overlay with no `setInitialFocus`, no `trapFocus`, and `closeConfirmModal` calls no `restoreFocus`. This is a separate code path from `confirmDialog` (which is also deficient per GAP-34). Screen reader and keyboard users can tab out of the modal into the background, and focus is not returned to the triggering element on close. This affects all confirm dialogs triggered via `showConfirmModal` (cover letter generation, rewrite submission, etc.).
**Source evidence:** `web/ui-helpers.js:41–53`; accessibility-specialist.md 2026-06-18 (cycle 2).

## GAP-144: Harvest Pre-Selects High/Medium Confidence Items by Default (Opt-In Violation)

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview (cycle 2)
`web/harvest.js:101–103` pre-checks all harvest candidates with `confidence === 'high' || confidence === 'medium'` on render. The applicant story (US-A11) requires that master CV updates are opt-in only — no candidate should be selected without explicit user action. Pre-selection biases users toward accepting every AI recommendation and can result in unintended master CV changes if the user clicks "Save Selected" without reviewing each item.
**Source evidence:** `web/harvest.js:101–103`; applicant.md 2026-06-18 (cycle 2).

## GAP-145: Cover Letter and Screening DOCX Filenames Omit Role Token

**Priority:** LOW
**Status:** Open
**Found:** 2026-06-18 cvUiReview (cycle 2)
Cover letter files are named `CoverLetter_{company}_{date}.docx` and screening responses are named `Screening_Responses_{date}.docx` (no company for screening). Neither includes the role/position token used in CV filenames (`CV_{company}_{role}_{date}.*`). For same-company same-day applications (e.g., two different roles at the same firm), cover letter files will collide and the second will silently overwrite the first.
**Source evidence:** `scripts/routes/master_data_routes.py:1638, 1869`; recruiter-ops.md 2026-06-18 (cycle 2).
