# Gaps Analysis: Source-Verified UI Review Findings

**Generated:** 2026-03-06 | **Last updated:** 2026-03-23
**Sources:**

- prior backlog in `tasks/gaps.md`
- refreshed persona review files under `tasks/review-status/` dated 2026-03-23
- aggregate synthesis in `tasks/ui-review.md`

This document tracks the gaps that still remain after reconciling the refreshed 14-persona review set against the current implementation. The March 23 refresh does not invalidate the gap IDs below; it mainly sharpens priority and confidence by replacing the older legacy-normalized persona snapshots with source-backed status files.

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
**Status:** OPEN - discovered 2026-03-19 11:36 ET; applicant, resume, and hiring-manager reviews confirmed ranked publication review exists, but final omission rules, metadata persistence, heading/count rendering, first-author visibility, and role-type gating remain incomplete.
**Description:** Publication recommendation is one of the stronger current review surfaces, but the end-to-end publication workflow is still broken at the edges. The reviewed code does not prove that rejecting all publications removes the section, that selected publications persist under the expected metadata key, or that final outputs always render the required heading, count context, venue/year completeness, and first-author signal.
**Recommended resolution:** Carry publication decisions into the required metadata structure, enforce section omission when nothing is selected, render a consistent `Selected Publications` section in final outputs, and add explicit role-type gating plus first-author and venue completeness checks before generation.

## GAP-25: Master CV Onboarding — Initial Creation from External Sources

**Severity:** HIGH
**Affected stories:** US-O1, US-O2, US-O3, US-O4, US-O5, US-O6, US-O7, US-O8, US-O9, US-O10, US-O11, US-O12, US-F4
**Status:** OPEN — documented 2026-04-20. No onboarding or initial-creation workflow exists. Existing imports (US-A10) assume master data already exists and frame LinkedIn/document ingestion as an *update* path. First-time users with no `Master_CV_Data.json` encounter either a blank/broken UI or must hand-craft JSON before the app is usable.
**Description:** The app has no guided path for creating `Master_CV_Data.json` from scratch. The precondition "master data exists and is up to date" is implicit in every job-application user story, but there is no documented or implemented workflow for satisfying that precondition. The gap covers: (1) detecting and routing first-time users to an onboarding flow, (2) structured extraction from LinkedIn data export, existing resume/CV document, BibTeX or Google Scholar, and GitHub profile, (3) multi-source merge with conflict resolution, (4) manual guided-form fallback, (5) a review/confirm step before any write, and (6) a post-import completeness check. See `tasks/user-story-master-cv-onboarding.md` for full story set.
**Recommended resolution:** Implement a dedicated onboarding mode that activates when no master CV file exists. Provide four import paths (LinkedIn ZIP, resume PDF/DOCX, publications, GitHub) plus a manual wizard. Process each source into a candidate record set, surface a merge/conflict-resolution step for multi-source imports, present a unified review screen, and write only on explicit user confirmation. Show a readiness summary after creation that flags incomplete sections and links to the Master CV Editor for follow-up. See GAP-01 for the related *update* path (natural-language edits to existing master data) — these are complementary, not the same gap.
