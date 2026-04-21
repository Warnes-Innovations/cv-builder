# Gaps Analysis: Source-Verified UI Review Findings

**Generated:** 2026-03-06 | **Last updated:** 2026-04-20
**Sources:**

- prior backlog in `tasks/gaps.md`
- refreshed persona review files under `tasks/review-status/` dated 2026-04-20
- independent heuristic UX evaluation (2026-04-20)
- aggregate synthesis in `tasks/ui-review.md`

This document tracks the gaps that still remain after reconciling the refreshed 17-persona review set against the current implementation. The April 2026 cycle added GAP-25 through GAP-71 from newly discovered issues.

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
**Status:** PARTIAL - verified 2026-03-19 11:36 ET; applicant and resume reviews confirmed spell-check endpoints and audit persistence exist, but skill-name review, edit-in-place correction, blocking on unresolved flags, and write-back of accepted corrections into generated output are incomplete.
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
**Description:** Publication recommendation is one of the stronger current review surfaces, but the end-to-end publication workflow is still broken at the edges. The reviewed code does not prove that rejecting all publications removes the section, that selected publications persist under the expected metadata key, or that final outputs always render the required heading, count context, venue/year completeness, and first-author signal.
**Recommended resolution:** Carry publication decisions into the required metadata structure, enforce section omission when nothing is selected, render a consistent `Selected Publications` section in final outputs, and add explicit role-type gating plus first-author and venue completeness checks before generation.

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

## GAP-28: Publications Heading Degrades to "Publications"

**Severity:** HIGH
**Affected stories:** US-M4, US-M7, US-A3
**Status:** OPEN - discovered 2026-04-20; hiring-manager review found `cv-template.html:636–643` renders "Publications" instead of the required "Selected Publications" under certain conditions (e.g., when the count label is omitted or the section title is overridden). The story requires the heading to always read "Selected Publications" when publications are present.
**Description:** The publications section heading degrades to the generic "Publications" label instead of maintaining the "Selected Publications" phrasing, which signals curation and selection to the reader.
**Recommended resolution:** Ensure `cv-template.html` always renders "Selected Publications" as the section heading when any publications are present, regardless of count or other conditional logic.

## GAP-29: Venue-Missing Publications Render Silently

**Severity:** HIGH
**Affected stories:** US-M4, US-R2
**Status:** OPEN - discovered 2026-04-20; hiring-manager review found `.pub-venue-warn` CSS class is defined in `styles.css` but no code path adds it to a publication entry when venue/journal data is absent. Publications with missing venue information render without any visual warning.
**Description:** The warning system for incomplete publication entries is wired at the CSS level but dead at the code level. Authors can include publications with no journal, conference, or venue without receiving any feedback.
**Recommended resolution:** In the publication rendering code (both in the review table and in the CV template), check for absent venue/journal fields and apply `.pub-venue-warn` styling (or an equivalent inline warning) to flag the entry.

## GAP-30: Cover Letter Opening Hardwired as "Dear [name],"

**Severity:** CRITICAL
**Affected stories:** US-P3, US-P5
**Status:** OPEN - discovered 2026-04-20; persuasion expert review confirmed the cover letter generation prompt hardwires "Dear [name]," as the opening salutation. This prevents any pattern-interrupt opener (a persuasion technique), blocks all story acceptance criteria for cover letter openings, and makes all generated cover letters structurally identical.
**Description:** A hardwired "Dear [name]," opener is the weakest possible cover letter opening from a persuasion perspective. The story spec requires an opening that captures attention, establishes a specific connection, or uses a hook — none of which are possible with a forced salutation.
**Recommended resolution:** Remove the hardwired salutation from the cover letter prompt. Allow the LLM to generate a configurable opening (salutation, hook, or pattern-interrupt) based on user preference and job context. Add a cover letter opening style option (formal/attention-grabbing/narrative) to the session configuration.

## GAP-31: Cover Letter Word Count Ceiling 400 vs Story Spec 300

**Severity:** MEDIUM
**Affected stories:** US-P5
**Status:** OPEN - discovered 2026-04-20; persuasion expert review found the cover letter generation prompt uses a 400-word ceiling, while the persuasion story spec requires ≤300 words for optimal recruiter review.
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
**Status:** OPEN - discovered 2026-04-20; first-time user review found that the first visible content on a no-session visit is the Sessions modal showing "Select a Session" with subtext "Each browser tab now works against its own URL-scoped session" — technical architecture copy, not user orientation. The application has no welcome screen, app description, or "get started" path.
**Description:** First-time users cannot identify what the application does, what prerequisites exist, or how to start without external documentation. Undefined terms ("ATS," "Harvest," "Master CV," "Customise") appear immediately in the tab bar.
**Recommended resolution:** Add a first-visit welcome screen that explains the application's purpose in one sentence, lists the two prerequisites (Master CV file and LLM provider), and provides a clear "Get started" CTA. Add inline definitions or tooltips for jargon terms ("ATS," "Harvest") on first encounter.

## GAP-38: "Delete" Session Button Label Misleads — Should Read "Move to Trash"

**Severity:** MEDIUM
**Affected stories:** US-S3
**Status:** OPEN - discovered 2026-04-20; returning user review confirmed that the session delete button soft-deletes to a Trash view (recoverable), but the button label says "Delete," implying permanent deletion. Users who intend to recover a session may believe it is permanently gone.
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
**Status:** OPEN - discovered 2026-04-20; trust and compliance review confirmed that the "Acknowledged" button for persuasion warnings in the rewrite review surface lives inside the collapsible warning panel (`rewrite-review.js:85,92–96`). Users can collapse the warning panel and proceed to submit all rewrite decisions without ever reading or acknowledging the warning.
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
