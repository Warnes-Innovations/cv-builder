# Gaps Analysis: Source-Verified UI Review Findings

**Generated:** 2026-03-06 | **Last updated:** 2026-06-29 (cycle 8)
**Sources:**

- prior backlog in `tasks/gaps.md`
- refreshed persona review files under `tasks/review-status/` dated 2026-04-22, 2026-06-18 (cycle 1), 2026-06-18 (cycle 2), 2026-06-20 (cycle 4), 2026-06-20 (cycle 5), 2026-06-22 (cycle 6), 2026-06-22 (cycle 7), and 2026-06-29 (cycle 8)
- independent heuristic UX evaluation (all cycles through 2026-06-29 cycle 8)
- aggregate synthesis in `tasks/ui-review.md`

This document tracks the gaps that still remain after reconciling the refreshed full 15-persona + heuristic review set against the current implementation. The 2026-04-22 cycle added GAP-72 through GAP-123. The 2026-06-18 cycle 1 added GAP-124 through GAP-142. The 2026-06-18 cycle 2 added GAP-143 through GAP-145. The 2026-06-18 cycle 3 added GAP-146 through GAP-154. The 2026-06-20 cycle 4 added GAP-155 through GAP-165. The 2026-06-20 cycle 5 added GAP-166 through GAP-175. The 2026-06-22 cycle 6 added GAP-176 through GAP-181. The 2026-06-22 cycle 7 added GAP-182. The 2026-06-29 cycle 8 added GAP-183 through GAP-194.

## 2026-06-29 (Cycle 8) Reconciliation Notes

- **7 gaps confirmed resolved this cycle:** GAP-93 (phase-enforcement 409 banner suppressed), GAP-102 (session application status badge), GAP-106 (download generation timestamp), GAP-35 (message-input aria-label — already resolved cycle 7; re-confirmed), GAP-178 (aria-pressed on rewrite buttons — already resolved; re-confirmed), GAP-180 (step-rerun opacity 0→0.35 — already resolved; re-confirmed), GAP-182 (.action-btn.secondary CSS — already resolved; re-confirmed).
- **12 new gaps added (GAP-183 through GAP-194):** forced-colors outline failure (GAP-183), cover letter "I" first-word gate (GAP-184), cover letter PDF absent (GAP-185), cold-restore of rewrite decisions (GAP-186), role-differentiated CL word count (GAP-187), approved_rewrites not injected into CL prompt (GAP-188), action-verb warnings log-only (GAP-189), re-run phase no audit log (GAP-190), session table icon button missing aria-label (GAP-191), emoji not aria-hidden (GAP-192), .q-chip missing :focus-visible (GAP-193), two overlapping advance buttons label conflict (GAP-194).
- **1 gap upgraded severity:** GAP-U9 / tracked as GAP-194 — upgraded from Partial to Fail by ux-expert; two overlapping advance buttons with inconsistent labels (`index.html:188-189`).
- **4 existing gaps re-confirmed with new evidence:** GAP-127 (output exclusion still absent — `cv-template.html:629,777` confirmed by resume-expert), GAP-29 (venue_warning computed but never rendered — confirmed by hr-ats; `cv_orchestrator.py:896`), GAP-95 (word count threshold 400 still too permissive — re-confirmed by persuasion-expert), GAP-175 (summary specificity check absent from baseline path — confirmed by resume-expert).
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-183 (forced-colors outline), GAP-184 (cover letter I-first gate), GAP-127 (candidate_to_confirm in output), GAP-H1/H2/H3 (skill_type persistence/UI).

## 2026-06-22 (Cycle 7) Reconciliation Notes

- **10 gaps resolved this cycle:** GAP-166 (same-device confirmed), GAP-174 (company context), GAP-176 (bullet-reorder modal), GAP-178 (aria-pressed), GAP-179 (:focus-visible), GAP-180 (step-rerun opacity), GAP-181 (spell-check labels) all confirmed by cycle 7 agents. GAP-35 (#message-input aria-label) and GAP-92 (publications stat card bug) fixed and resolved post-cycle. GAP-182 opened and immediately resolved this cycle.
- **1 new open gap:** GAP-182 (`.action-btn.secondary` no CSS definition) — opened and fixed this cycle.
- **Score improvements:** UX Expert 32→34 Pass; Hiring Manager 1→0 Fail (US-M6); Accessibility Specialist US-X2 now 4/4; Power User W3.1 promoted to Pass.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-177 (DOCX heading styles), GAP-H1/H2/H3 (skill_type).

## 2026-06-22 (Cycle 6) Reconciliation Notes

- **8 gaps resolved or partially resolved this cycle:** GAP-166 (resolved for same-device; residual cross-device), GAP-167 (resolved), GAP-168 (resolved), GAP-169 (now fully resolved — viewer-panel buttons fixed), GAP-170 (resolved), GAP-171 (resolved), GAP-172 (resolved), GAP-173 (resolved). GAP-174, GAP-176, GAP-179, GAP-181 resolved post-cycle. GAP-178 and GAP-180 resolved 2026-06-22 (post-cycle).
- **6 new open gaps:** GAP-176 (resolved post-cycle), GAP-177 (DOCX heading bold runs not heading styles), GAP-178 (resolved 2026-06-22), GAP-180 (resolved 2026-06-22). GAP-179 and GAP-181 opened and immediately resolved this cycle.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-14 (no workflow progress indicator), GAP-175 (summary specificity validator), GAP-177 (DOCX heading styles).

## 2026-06-22 (Cycle 5) Reconciliation Notes

- **1 gap resolved this cycle:** GAP-39 (cover letter and screening DOCX now surfaced in Download/Finalise tab).
- **10 new open gaps:** GAP-166 through GAP-175, spanning returning-user (GAP-166 — data loss on restore), accessibility (GAP-167 ↻ rerun span, GAP-168 sessions modal focus, GAP-170 llm-busy-label, GAP-171 category reorder aria-label, GAP-172 colour-only step states, GAP-173 focus-visible CSS), UX (GAP-169 misleading CTA label), and hiring-manager/persuasion (GAP-174 company-initiative injection, GAP-175 summary specificity).
- **GAP-72 regression clarification:** Cycle 5 accessibility agent reported steps 2–12 still missing role/tabindex. Code inspection at `web/ui-core.js:1917–1931` confirms `_makeStepClickable()` DOES add `role="button"`, `tabindex="0"`, and keydown handler. Agent misread `workflow-steps.js` without reading `ui-core.js`. GAP-72 remains correctly RESOLVED.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (pre-job Master CV editor), GAP-174 (cover letter company initiative), GAP-175 (summary specificity validator), GAP-132 (divergent CV templates).

## 2026-06-20 (Cycle 4) Reconciliation Notes

- **10 gaps resolved this cycle:** GAP-155 (toast-warning CSS), GAP-156 (empty-state CTA), GAP-157 (rename widget aria-label), GAP-158 (tabpanel aria-labelledby), GAP-159 (HTML semantic landmarks), GAP-160 (workflow overflow-x), GAP-161 (openMasterCvModal focus), GAP-162 (alert() in session-switcher-ui), D6 (duplicate .step-stale-badge).
- **5 new open gaps:** GAP-163 (summary prompt wrong opening formula), GAP-164 (initialize() dead export), GAP-165 (content_warnings not fired on applyLayoutSettings), C4-1 (manual achievement edits bypass rewrite_audit), C4-2 (spell suggestions unsorted).
- **9 persona agents hit API session limit during cycle 4 (hr-ats, master-cv-curator, applicant, first-time-user, hiring-manager, ux-expert, and 3 others)** — coverage reduced; those personas were not re-reviewed this cycle.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (no pre-job Master CV entry), GAP-72 (step pill keyboard), GAP-73 (aria-live on workflow), GAP-132 (divergent CV templates), GAP-163 (summary LLM prompt contradiction), GAP-165 (content_warnings applyLayoutSettings path).

## 2026-06-18 (Cycle 3) Reconciliation Notes

- **10 gaps closed this cycle:** GAP-120 (tab keyboard — WCAG Level A), GAP-124 (`final_generation` labels), GAP-125 (layout scope label), GAP-129 (ATS modal focus), GAP-34 (`confirmDialog` ARIA), GAP-143 (`showConfirmModal` focus), GAP-144 (harvest pre-selection), GAP-141 (BibTeX editor→author), GAP-128 (FALSE POSITIVE — `submit_rewrite_decisions()` always records all outcomes), GAP-130 (ALREADY RESOLVED).
- **1 regression found and fixed same session:** GAP-146 — `toggleChat` from `ui-helpers.js` was exported into `globalThis` after `ui-core.js`, overwriting the ARIA-aware version and breaking `aria-label`/`aria-expanded` updates after first toggle. Fix: removed duplicate function and export from `web/ui-helpers.js`; rebuilt bundle.
- **3 hiring-manager criteria upgraded:** US-M2f (weak-verb UI now visible in persuasion panel), US-M4b and US-M5b (sidebar background on pages 2+ fixed via `box-decoration-break: clone`).
- **9 new gaps added (GAP-146 through GAP-154):** GAP-146 bundle toggle override (resolved), GAP-147 empty-skeleton "profile ready" mislead (first-time user), GAP-148 workflow pill missing pointer cursor, GAP-149 generic summary fallback reaches PDF, GAP-150 cover letter LLM missing bullet text, GAP-151 ATS STANDARD frozenset includes rejected labels, GAP-152 focus trap incomplete in two modal types, GAP-153 status elements lack aria-live, GAP-154 message-input outline stripped unconditionally.
- **Most critical open gaps:** GAP-36 (first-run onboarding), GAP-41 (no pre-job Master CV entry), GAP-72 (step pill keyboard), GAP-73 (aria-live on workflow), GAP-123 (empty aria-label on freshness chip), GAP-132 (divergent CV templates), GAP-147 (empty-skeleton mislead), GAP-149 (generic summary in PDF), GAP-152 (focus trap).

## 2026-06-18 (Cycle 2) Reconciliation Notes

- **4 gaps resolved this cycle:** GAP-33 (employment date overlap detection — implemented), GAP-45 (persuasion warning bypass — hard-gated), GAP-36 (first-run blank Master CV — implemented), GAP-144 (harvest pre-selection removed — opt-in only).
- **3 new gaps added:** GAP-143 (`showConfirmModal` missing focus management), GAP-144 (Harvest pre-selects high/medium confidence items violating opt-in requirement — resolved same cycle), GAP-145 (no session audit log panel in Finalise — already GAP-118, superseded by this entry's clarification).
- **Confirmed resolved from last cycle:** GAP-103 (ATS advisory checks no longer block downloads), GAP-110 (date overlap detection implemented).
- **Post-cycle resolutions (same commit):** GAP-124 (`final_generation` labels added), GAP-143 (`showConfirmModal` focus management added), GAP-144 (harvest pre-selection removed).
- **Most critical open gaps:** GAP-120 (keyboard tabs WCAG Level A), GAP-127 (`candidate_to_confirm` not rendered/excluded), GAP-128 (rejected rewrites not audited), GAP-132 (two divergent CV templates), GAP-34 (`confirmDialog` missing ARIA).

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
**Status:** RESOLVED — `web/session-manager.js:747` already uses `SESSION_PHASE_LABELS[data.phase]` (imported from `utils.js`) which maps e.g. `customization` → "Customisation". The fallback is `String(data.phase).replace(/_/g, ' ')` for unknown phases. No code change needed; the gap was resolved when `SESSION_PHASE_LABELS` was added to utils.js.
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
**Status:** RESOLVED — `publications-review.js:138` reads `pub.venue_warning` and injects an amber ⚠ icon with a tooltip into the citation cell (`:146`). Backend computes `venue_warning` at `cv_orchestrator.py:896`. The cycle 8 review incorrectly reported this as OPEN; source code confirms it is implemented. (The `.pub-venue-warn` CSS class noted in the original report is unused — the inline `color:#dc7900` style is used instead.)
**Description:** The warning system for incomplete publication entries is wired at the CSS level but dead at the code level. Authors can include publications with no journal, conference, or venue without receiving any feedback.
**Recommended resolution:** Resolved — see status above.

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
**Status:** RESOLVED 2026-06-18
**Description:** The native-style confirmation dialogs were not accessible to keyboard and screen reader users. Users who cannot use a mouse could not access or dismiss these dialogs.
**Fix:** `confirmDialog()` in `web/ui-core.js` now adds `role="dialog"`, `aria-modal="true"`, `aria-labelledby="confirm-dialog-msg"` to the dialog box; moves focus to the OK button on open; traps Tab/Shift-Tab within the two buttons; handles Escape to cancel; restores focus to the previous element on close.

## GAP-35: Message Input Has No Accessible Label

**Severity:** HIGH
**Affected stories:** US-X1
**Status:** RESOLVED 2026-06-22 (cycle 7) — Added `aria-label="Chat message"` to `#message-input` at `web/index.html:177`.
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
**Status:** RESOLVED 2026-06-20 — Cycle 5 recruiter-ops review confirmed cover letter and screening DOCX files are now surfaced in the Download tab file listing. `web/download-tab.js` renders all three CV formats, cover letter, and screening DOCX in the file grid. Previously OPEN since 2026-04-20.
**Description:** Recruiters using the app to review submission packages expect all components (CV formats, cover letter, screening questions) to be visible and downloadable from one place. The cover letter and screening DOCX files are invisible in the package review.
**Recommended resolution:** Include cover letter and screening DOCX files in both the File Review tab file listing and the Finalise stage package summary view.

## GAP-40: No Submission Readiness Checklist in Finalise

**Severity:** HIGH
**Affected stories:** US-O4, US-A9
**Status:** RESOLVED 2026-06-29 — Added `_renderReadinessChecklist(files, statusData)` in `web/finalise.js` rendered into `#readiness-checklist` div above `#consistency-report`. Checks: CV PDF ❌/✅, CV DOCX ❌/✅, CV HTML ❌/✅ (required), cover letter ⚠/✅, screening Q&A ⚠/✅, ATS validation ⚠/✅, layout freshness ⚠/✅. Optional items warn but don't block archiving; required CV formats show ❌ if missing.
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
**Status:** RESOLVED 2026-06-18 — `showAlertModal` / `closeAlertModal` exist only in `ui-helpers.js` now; `ui-core.js` no longer contains these definitions. Duplicate was already removed in a prior commit. Previously discovered 2026-04-20.
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
**Status:** RESOLVED 2026-06-20 — `updateWorkflowStepsClickable()` in `web/ui-core.js` now adds `role="button"`, `tabindex="0"`, and a keydown handler (Enter/Space) when a step becomes clickable; removes them when inert. See GAP-72/GAP-NEW-K entry in cycle 4 section. Previously discovered 2026-04-22.
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
**Status:** RESOLVED 2026-06-18 — Added `role="alert"` to `#session-conflict-banner` in `web/index.html:110`. Previously discovered 2026-04-22; accessibility specialist review found the session conflict banner (`index.html`) has no `role="alert"` or `aria-live` attribute. Screen reader users are not notified of session conflicts.
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
**Status:** RESOLVED 2026-06-22 (cycle 7) — Changed `scripts/routes/master_data_routes.py:214` from `len(data.get('publications', []))` (always 0) to `len(orchestrator.publications or {})`, which reads from the parsed BibTeX dict.
**Description:** The application is designed to support BibTeX as the primary bibliography format. The stat card should reflect this by counting from the BibTeX source.
**Recommended resolution:** Update the publications count stat card to call a route that counts entries from `publications.bib` when it exists, falling back to `Master_CV_Data.json`.

## GAP-93: Phase-Enforcement 409 Response Misidentified as Session Conflict in UI

**Severity:** MEDIUM
**Affected stories:** US-M1, US-M3
**Status:** RESOLVED - 2026-06-29. Added `conflict_type: "phase_enforcement"` to the 409 response in `_require_master_data_write_phase()` (`scripts/routes/master_data_routes.py`). Updated the global fetch interceptor in `web/ui-core.js` to clone and inspect the response body; the session conflict banner is suppressed when `conflict_type` is present and is not `"session_ownership"`. Bundle rebuilt.
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
**Status:** RESOLVED 2026-06-29 — Updated word count thresholds in `web/cover-letter.js`: pass range is now 250–300 words (was 250–400); warning range 200–350 (was 200–450); error below 200 or above 350 (was above 450). Progress bar scaled to 300-word target. Label updated to "Word count (250–300)".
**Previously:** OPEN - discovered 2026-04-22; persuasion expert review found that while the LLM cover letter generation prompt was tightened to ~250–300 words (commit `e0212e3`), the client-side word count validation still accepted cover letters up to 400 words without warning.
**Description:** A cover letter generated at the prompt's 250–300 word target will pass validation. But if a user manually edits a cover letter up to 400 words, no warning is shown.
**Recommended resolution:** Update the client-side cover letter word count threshold from 400 to 300 to match the prompt's target. Display a warning (not blocking) when the cover letter exceeds 300 words.

## GAP-96: Cover Letter CTA Validation Accepts Passive Closings

**Severity:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Refactored CTA check in `_validateCoverLetter()` (`web/cover-letter.js`). Introduced two pattern lists: `assertiveCtaPatterns` (pass: candidate takes initiative — "I will call", "I will follow up", "discuss", "interview") and `passiveCtaPatterns` (warn: "look forward to hearing from you", "await your response", "hope to hear"). If only a passive CTA is present the card shows warn with guidance: "Passive closing detected — consider an assertive follow-up." If no CTA is present the card fails.
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
**Status:** RESOLVED 2026-06-22 (cycle 8) — Added `application_status: str = ''` to `SessionItem` (`scripts/web_app.py:165`). Updated `list_sessions()` (`scripts/routes/session_routes.py:130–142`) to read `metadata.json` from each session directory and include `application_status`. Updated `_normalizeSessionsForTable` and `_renderSessionTableRow` in `web/session-switcher-ui.js` to pass through and render a colour-coded badge (Draft/Ready/Sent) in the phase column.
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
**Status:** RESOLVED - 2026-06-29. `_renderDownloadGrid()` in `web/download-tab.js` now accepts a `generatedAt` parameter. `populateDownloadTab()` passes `cvData.metadata?.generation_date` to that function, and each download card displays a "Generated {date}" label (e.g. "Generated Jun 29, 2026 at 2:23 PM") beneath the file description. The `metadata.generation_date` field is already present in the `generated_files` state returned by `/api/status` — no backend changes needed.
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
**Status:** RESOLVED 2026-06-29 — Added `confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` guard at the top of `_deleteSessionFromModal()` in `web/session-switcher-ui.js:557–560`. Matches the pattern already used by Delete Forever and Empty Trash.
**Description:** Both "Delete Forever" and "Empty Trash" use `confirmDialog()` before proceeding. "Move to Trash" does not, creating an inconsistent behavior pattern.
**Recommended resolution:** Add a `confirmDialog('Move this session to Trash? You can restore it from the Trash view.')` before the API call in `_deleteSessionFromModal()`.

## GAP-112: Abbreviated Phase Labels Opaque to Returning Users

**Severity:** MEDIUM
**Affected stories:** US-S1, US-O2
**Status:** RESOLVED 2026-06-29 — Updated `SESSION_PHASE_LABELS_SHORT` in `web/utils.js:277–287`: `init` → "Setup", `customization` → "Customising", `rewrite_review` → "Rewrites", `spell_check` → "Spell Check", `refinement` → "Finalise", `final_generation` → "Final Gen". Ambiguous "Custom" and misleading "Done" are gone.
**Recommended resolution:** Expand `SESSION_PHASE_LABELS_SHORT` to use more descriptive labels: "Customising", "Reviewing rewrites", "Finalising", "Generated". Update "Done" for `refinement` to "Finalise" or a phase-appropriate label.

## GAP-113: No Session Duplicate/Copy Action

**Severity:** LOW
**Affected stories:** US-W3, US-S3
**Status:** OPEN - discovered 2026-04-22; returning user review found the sessions modal offers Load, Rename, and Move to Trash but no Duplicate. Users who want to try a different customization approach cannot create a copy without starting a new session from scratch.
**Recommended resolution:** Add a "Duplicate session" action to the sessions modal row that creates a deep copy of the session directory and state file under a new session ID and name.

## GAP-114: Session Rename Uses `window.prompt()` Instead of In-App Modal

**Severity:** LOW
**Affected stories:** US-S3, H4
**Status:** RESOLVED 2026-06-18 — `promptRenameCurrentSession()` now shows an inline `<input>` field with ✓/✕ buttons directly in the header, using `showToast()` for errors. No `window.prompt()` or `alert()` calls remain. `web/session-manager.js`. Previously discovered 2026-04-22.
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
**Status:** RESOLVED 2026-06-18
**Description:** All viewer tab `<div role="tab">` elements were missing `tabindex`, making them unreachable by keyboard. Arrow-key keydown handlers existed but could never fire without initial keyboard reachability.
**Fix:** Added `tabindex="0"` to the initial active tab (`tab-job`) and `tabindex="-1"` to all other tabs in `web/index.html`. Added Enter/Space key activation to the `keydown` handler in `web/ui-core.js`. Updated `switchTab()` in `web/review-table-base.js` to maintain roving tabindex — sets `tabindex="-1"` on all tabs then `tabindex="0"` on the newly active tab. All 22 tabs now reachable via Tab then Arrow keys per WCAG 2.1 Level A tablist pattern.

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
**Status:** RESOLVED 2026-06-18 — Changed initial `aria-label=""` to `aria-label="Layout freshness"` in `web/index.html:95`. `refreshLayoutStatusUI()` continues to update the label dynamically when freshness state changes. Previously discovered 2026-04-22; UX expert review found `web/index.html:87` — `<button id="layout-freshness-chip" ... aria-label="">`. An explicitly empty `aria-label` on a focusable interactive element causes screen readers to announce the button with no accessible name. This is a WCAG 2.1 Level A failure.
**Description:** The layout freshness chip is a focusable button that communicates layout currency state. Screen reader users navigating by Tab reach this button and hear nothing — the button has no announced purpose or label.
**Recommended resolution:** Set `aria-label` to a meaningful value that includes the current freshness state, e.g., `aria-label="Layout freshness — layout is current"`. Update the label dynamically as freshness state changes.

## GAP-124: `final_generation` Missing from SESSION_PHASE_LABELS

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/utils.js:262–285` defines `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT` but omits the `final_generation` phase key. Sessions in the `FINAL_GENERATION` phase display the raw Python string "final generation" (lowercase, with space) in the session switcher instead of a human-readable label.
**Fix:** Added `final_generation: 'Final Generation'` to `SESSION_PHASE_LABELS` and `final_generation: 'Final Gen'` to `SESSION_PHASE_LABELS_SHORT` in `web/utils.js`.
**Source evidence:** `web/utils.js:262–285`; returning-user persona review 2026-06-18.

## GAP-125: Layout Scope Label Invites Text Changes

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/layout-instruction.js:293` renders the placeholder/label "Describe a layout or text change — the AI will determine the right approach." This directly contradicts US-U9 AC 1 and AC 7, which require that only layout changes are accepted at this stage and that approved text is never modified. The label actively encourages users to request text changes that should be blocked.
**Fix:** Label updated to "Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here." `web/layout-instruction.js:293`.
**Source evidence:** `web/layout-instruction.js:293`; ux-expert.md 2026-06-18.

## GAP-126: Cover Letter Word Count Hardcoded for All Role Types

**Priority:** HIGH
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`scripts/routes/master_data_routes.py:1566` hard-codes the cover letter length target as `~250-300 words` regardless of role type. US-M6 requires: 300–400w for standard roles, 400–500w for executive roles, 500–600w for research/academic roles. The current prompt will underdeliver for executive and academic candidates.
**Source evidence:** `scripts/routes/master_data_routes.py:1566`; hiring-manager.md 2026-06-18.

## GAP-127: `candidate_to_confirm` Skills Not Rendered in Review UI and Not Excluded from Output

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Both template rendering paths now filter `candidate_to_confirm` skills. HTML skills grid (`templates/cv-template.html:628`) and plaintext ATS block (`:777`) each wrap the skill emission in `{% if not skill.candidate_to_confirm %}`. A Jinja2 `namespace` variable tracks the first-emitted item in the plaintext comma-separated list to avoid leading commas. Skills flagged for confirmation remain visible in the review UI (with the ⚠ badge from the cycle 6 fix) so users can still confirm/delete them, but they are silently excluded from generated PDF/DOCX/HTML until confirmed.
**Found:** 2026-06-18 cvUiReview
`scripts/utils/cv_orchestrator.py:1779` sets a `candidate_to_confirm` flag on skill additions that have weak evidence. However, `web/` has zero references to `candidate_to_confirm` in any rendering code — the flag is never displayed to the user in the skills review tab. Furthermore, no output rendering code checks this flag before including the skill in generated PDF/DOCX/HTML. Skills with unconfirmed evidence are indistinguishable from confirmed skills in both the review UI and the generated artefacts.
**Partial fix (cycle 6):** `web/skills-review.js` now reads `skill.candidate_to_confirm` and renders a `⚠ Verify evidence` badge (dark red, with explanatory tooltip) next to the skill name in the review table. Users can now visually identify and remove weak-evidence skills before generating output.
**Source evidence:** `scripts/utils/cv_orchestrator.py:1779`; `web/skills-review.js`; `templates/cv-template.html:628,777`.

## GAP-128: Rejected Rewrites Absent from `rewrite_audit`

**Priority:** HIGH
**Status:** FALSE POSITIVE — CLOSED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/rewrite-review.js:361` was misidentified as the audit-recording code — it is actually `updateRewriteTally()`, which counts accepted/rejected/pending proposals for the UI counter display. The actual audit recording is in `scripts/utils/conversation_manager.py:submit_rewrite_decisions()` (lines 1100–1104), which appends EVERY decision (including `outcome='reject'`) to `audit`, then stores it as `state['rewrite_audit']`. The submit button is also gated on `pending === 0` (line 376), ensuring all proposals have a decision before submission. No code change required.

## GAP-129: ATS Report Modal Lacks Focus Management

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
`web/ats-modals.js:112–141` opens the ATS Report modal with `style.display = 'flex'` but does not call `setInitialFocus()`, `trapFocus()`, or `restoreFocus()`. On close, keyboard focus returns to `<body>` rather than the triggering element. Screen reader and keyboard users cannot use this modal reliably.
**Fix:** `openAtsReportModal()` now saves `document.activeElement`, moves focus to the Close button, and registers an Escape key listener. `closeAtsReportModal()` removes the listener and restores focus to the saved element. `web/ats-modals.js`.
**Source evidence:** `web/ats-modals.js:112`; accessibility-specialist.md 2026-06-18.

## GAP-130: Persuasion Warning Panel Collapsed by Default — Bypass Possible

**Priority:** MED
**Status:** RESOLVED — already fixed (confirmed 2026-06-18 code check)
**Found:** 2026-06-18 cvUiReview
`web/rewrite-review.js:107` initialises the persuasion warnings panel in a collapsed state. The "Acknowledged" button is rendered inside the collapsed section (`rewrite-review.js:114`). A user can click "Proceed anyway?" (line 383–389) to bypass the entire warning panel without expanding it or reading any individual warning. This violates the trust requirement that persuasion warnings must be reviewed before proceeding.
**Resolution:** The panel already defaults to `display:block` at `rewrite-review.js:107`. This was fixed as part of GAP-45 resolution (persuasion gate hardening). No further change needed.
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
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
Two always-visible interactive elements in the header have no accessible name: (1) `#toggle-chat` (`web/index.html:149`) — the ◀/▶ panel collapse button; (2) `#rename-session-btn` (`web/index.html:76–79`) — the ✏️ rename button. Additionally, multiple modal close `×` buttons across the application use `title` attribute only (not reliably announced by screen readers) with no `aria-label`. This is a WCAG 2.1 Level A failure for each of these elements.
**Fix:** Added `aria-label` and `aria-expanded` to `#toggle-chat`; `toggleChat()` in `web/ui-core.js` updates both attributes on each toggle. Added `aria-label` to `#rename-session-btn`. Added specific `aria-label` values to all 6 modal close `×` buttons in `web/index.html`.
**Source evidence:** `web/index.html:76–79, 149`; accessibility-specialist.md 2026-06-18.

## GAP-141: BibTeX CRUD Modal Converts `editor` Field to `author` on Save

**Priority:** MED
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview
The publication CRUD modal in `web/master-cv.js` loads the `editor` BibTeX field into the `author` input field (`master-cv.js:1448`) and always saves the result back as `fields.author` (`master-cv.js:1498`). For edited volumes and book chapters where the BibTeX entry has an `editor` field but no `author` field, one CRUD modal save silently converts the `editor` to `author`, corrupting the BibTeX entry and breaking citation formatting.
**Fix:** Added `_pubModalUsesEditorField` flag. `editMasterPublication()` sets the flag when the entry has `editor` but no `author`, and updates the label to "Editor(s)". `saveMasterPublication()` saves as `fields.editor` when the flag is true. `showAddPublicationModal()` resets the flag. `web/master-cv.js`.
**Source evidence:** `web/master-cv.js:1448, 1498`; master-cv-curator.md 2026-06-18.

## GAP-142: Bulk BibTeX Import Skips Per-Entry Required-Field Validation

**Priority:** MED
**Status:** Open
**Found:** 2026-06-18 cvUiReview
`POST /api/master-data/publications/import` at `scripts/routes/master_data_routes.py:1375–1415` validates that the uploaded file parses as valid BibTeX but does not validate required fields (title, year, author or editor) on a per-entry basis. Entries missing required fields are imported silently and may produce malformed citations in the generated CV.
**Source evidence:** `scripts/routes/master_data_routes.py:1375–1415`; master-cv-curator.md 2026-06-18.

## GAP-143: `showConfirmModal` Missing Focus Management

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview (cycle 2)
`showConfirmModal` in `web/ui-helpers.js:41–48` sets `display: block` on the confirm modal overlay with no `setInitialFocus`, no `trapFocus`, and `closeConfirmModal` calls no `restoreFocus`. This is a separate code path from `confirmDialog` (which is also deficient per GAP-34). Screen reader and keyboard users can tab out of the modal into the background, and focus is not returned to the triggering element on close. This affects all confirm dialogs triggered via `showConfirmModal` (cover letter generation, rewrite submission, etc.).
**Fix:** `showConfirmModal` now saves `document.activeElement` and moves focus to the OK button on open; `closeConfirmModal` restores focus to the saved element on close. `web/ui-helpers.js`.
**Source evidence:** `web/ui-helpers.js:41–53`; accessibility-specialist.md 2026-06-18 (cycle 2).

## GAP-144: Harvest Pre-Selects High/Medium Confidence Items by Default (Opt-In Violation)

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview (cycle 2)
`web/harvest.js:101–103` pre-checks all harvest candidates with `confidence === 'high' || confidence === 'medium'` on render. The applicant story (US-A11) requires that master CV updates are opt-in only — no candidate should be selected without explicit user action. Pre-selection biases users toward accepting every AI recommendation and can result in unintended master CV changes if the user clicks "Save Selected" without reviewing each item.
**Fix:** `shouldPreCheck()` changed to always return `false`; `preCheckedCount` dead variable removed; UI text updated to describe opt-in behavior. `web/harvest.js`.
**Source evidence:** `web/harvest.js:101–103`; applicant.md 2026-06-18 (cycle 2).

## GAP-145: Cover Letter and Screening DOCX Filenames Omit Role Token

**Priority:** LOW
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview (cycle 2)
Cover letter files are named `CoverLetter_{company}_{date}.docx` and screening responses are named `Screening_Responses_{date}.docx` (no company for screening). Neither includes the role/position token used in CV filenames (`CV_{company}_{role}_{date}.*`). For same-company same-day applications (e.g., two different roles at the same firm), cover letter files will collide and the second will silently overwrite the first.
**Fix:** Cover letter filename is now `CoverLetter_{company}_{role}_{date}.docx`; screening filename is now `Screening_{company}_{role}_{date}.docx`. Both read role from `job_analysis.title`. `scripts/routes/master_data_routes.py:1638, 1869`. Secondary fix: `web/download-tab.js:53` updated `startsWith('Screening_Responses_')` → `startsWith('Screening_')` to match the new prefix.
**Source evidence:** `scripts/routes/master_data_routes.py:1638, 1869`; `web/download-tab.js:53`; recruiter-ops.md 2026-06-18 (cycle 2).

---

## 2026-06-18 (Cycle 3) New Gaps (GAP-146 through GAP-154)

*Discovered during the 15-persona + heuristic review cycle 3, 2026-06-18.*

---

## GAP-146: `toggleChat` Duplicate in `ui-helpers.js` Overwrites ARIA-Aware Version in Bundle

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18
**Found:** 2026-06-18 cvUiReview cycle 3
`web/ui-helpers.js` defined and exported a `toggleChat` function that only updated `textContent` on the toggle button. Because `ui_helpers_exports` is spread into `globalThis` AFTER `ui_core_exports` in `web/bundle.js`, this inferior version overwrote the correct ARIA-aware `toggleChat` from `web/ui-core.js:684–705` (which updates `aria-label` and `aria-expanded` on every toggle). After the first click, the `#toggle-chat` button announced wrong state to screen readers.
**Fix:** Removed the duplicate `toggleChat` function definition and export from `web/ui-helpers.js`. `web/ui-core.js` version now exclusively controls the toggle. Bundle rebuilt.
**Source evidence:** `web/ui-helpers.js:84–98` (removed); `web/ui-core.js:684–705`; `web/bundle.js` globalThis spread order; accessibility-specialist.md 2026-06-18 (cycle 3).

## GAP-147: First-Time User: `ensure_master_cv_exists()` Shows "Profile Ready" for Empty Skeleton

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — `/api/setup/master-cv-status` now returns `is_empty:true` for empty skeletons. Welcome modal shows distinct "empty skeleton" warning with guidance to fill in Master CV before starting a job application. `web/session-manager.js` + `web/index.html`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-F1, US-F4
`ensure_master_cv_exists()` creates a blank skeleton `Master_CV_Data.json` on first run and displays a "Your master profile is ready" success message to the user. However, the skeleton is completely empty (no experiences, skills, education, publications, or personal info). The success message implies the profile has been set up, causing first-time users to proceed into job analysis with an empty master data file, leading to poor AI outputs.
**Recommended resolution:** Change the "profile ready" message to "A blank master profile was created — please fill in your profile before starting a job application." Add a redirect or modal directing the user to the Master CV editor. Alternatively, suppress the success state and show an onboarding prompt instead.

## GAP-148: Workflow Step Pills Missing `cursor:pointer` — Non-Clickable Appearance

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-18 — Added `cursor: pointer` to `.step.stale` and `.step.stale-critical` in `web/styles.css`. All navigable states (active, completed, stale, stale-critical) now have pointer cursor; `.step.clickable` on step-job covers the always-navigable initial state. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-U1, US-A12
Only `step-job` (the first pill) has `class="clickable"` which applies `cursor:pointer`. The remaining navigable pills (analysis, customizations, rewrite, etc.) have `onclick` handlers but no visual affordance indicating they are interactive. Users who have completed an earlier stage see pills that look like static status indicators rather than clickable re-entry points.
**Recommended resolution:** Add `class="clickable"` (or equivalent `cursor:pointer` CSS) to all step pill elements that have `onclick` handlers and are in a navigable state. This is a companion to GAP-72 (keyboard access).

## GAP-149: Generic Professional Summary Fallback Reaches Generated PDF Without UI Warning

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — `_collect_render_snapshot_inputs` detects empty summary and returns a `content_warnings` entry. `/api/cv/generate-preview` now includes `content_warnings` in its response. Layout tab shows a toast warning when this condition is detected before the user downloads. `scripts/routes/generation_routes.py` + `web/layout-instruction.js`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-M1, US-R2
`cv_orchestrator.py:197` substitutes `"Experienced professional applying for {position}"` when the session's professional summary field is empty. This generic placeholder is silently included in the generated PDF, HTML, and ATS DOCX output. No UI warning is shown before generation to alert the user that a fallback summary is in use.
**Recommended resolution:** Before generating output, check whether the selected summary is the fallback placeholder. If so, surface a blocking or prominent warning in the layout review or final generate step: "No professional summary selected — the generated CV will include a generic placeholder." Add a link to the Summary review tab.

## GAP-150: Cover Letter LLM Receives Only Achievement Titles, Not Bullet Body Text

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-18 — Cover letter prompt now passes `title: description` for each achievement, giving the LLM full quantified accomplishment text. `scripts/routes/master_data_routes.py`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-M6, US-P5
The cover letter generation prompt passes achievement `title` fields from the session's approved achievements list but not the full bullet body text. The LLM can only reference achievement titles (which are often generic — e.g., "Revenue Growth") rather than the specific quantified accomplishments in the body (e.g., "grew ARR from $2M to $8M in 18 months"). This produces cover letters with generic achievement references instead of concrete named citations.
**Recommended resolution:** Update the cover letter prompt context to include both achievement title and body text for each approved achievement. The body text is available in the session state alongside the title.

## GAP-151: ATS Validator `STANDARD` Frozenset Includes Rejected Heading Labels

**Priority:** LOW
**Status:** RESOLVED 2026-06-18 — Removed `'career history'` and `'selected publications'` from the `STANDARD` frozenset in `cv_orchestrator.py`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-H2, US-H6
The `STANDARD` frozenset in `validate_ats_report` (`scripts/utils/cv_orchestrator.py:4785–4792`) includes `'career history'` and `'selected publications'`, both of which are explicitly listed as rejected heading labels in US-H2. The ATS DOCX generator does not currently produce these headings, so there is no active bug. However, if generation code changes, the validator would silently pass these rejected labels.
**Recommended resolution:** Remove `'career history'` and `'selected publications'` from the `STANDARD` frozenset. If these need to be tracked for detection purposes, move them to a separate `REJECTED_LABELS` set that the validator flags as failures.

## GAP-152: `showConfirmModal` and `openAtsReportModal` Missing Full Focus Trap

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — `showConfirmModal` now calls `trapFocus('confirm-modal-overlay')` and `closeConfirmModal` calls `restoreFocus()` to release the trap. `openAtsReportModal` now calls `trapFocus('ats-report-modal-overlay')` and `closeAtsReportModal` calls `restoreFocus()`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-X2, US-X3
Both `showConfirmModal` (`web/ui-helpers.js`) and `openAtsReportModal` (`web/ats-modals.js`) now correctly save focus and move it to the first actionable button on open (GAP-143 and GAP-129 fixes). However, neither calls `trapFocus()`. Pressing Tab from the last focusable element exits the modal into background content, allowing keyboard users to interact with the page behind the modal.
**Recommended resolution:** Call `trapFocus(modalElement)` after opening each modal. The `trapFocus()` implementation already exists in `web/ui-core.js` and is used by `confirmDialog()`. Add a corresponding `releaseFocus()` call in the close handlers.

## GAP-153: Dynamic Status Message Elements Lack `aria-live` or `role="alert"`

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — Added `aria-live="polite"` to `#onboarding-modal-status` and `#settings-status-msg`; added `role="alert"` to `#model-auth-key-status`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-X3, US-U7
Three elements display status messages dynamically but have no `aria-live` attribute or `role="alert"`: `#settings-status-msg` (LLM settings save confirmation), `#onboarding-modal-status` (onboarding progress), and `#model-auth-key-status` (API key validation feedback). Screen reader users navigating the UI receive no audible notification when these status elements are updated.
**Recommended resolution:** Add `aria-live="polite"` to `#settings-status-msg` and `#onboarding-modal-status`. Add `role="alert"` (or `aria-live="assertive"`) to `#model-auth-key-status` since API key validation feedback is time-sensitive. Note: `#session-conflict-banner` is tracked separately under GAP-75.

## GAP-154: `.message-input { outline: none }` Set Unconditionally — Keyboard Focus Invisible

**Priority:** HIGH
**Status:** RESOLVED 2026-06-18 — Moved `outline: none` from `.message-input` base rule into `.message-input:focus` in `web/styles.css`. Previously discovered 2026-06-18 (cycle 3)
**Affected stories:** US-X1, US-U7
`web/styles.css` sets `outline: none` on `.message-input` unconditionally (not inside a `:focus` rule). This removes the browser's default keyboard focus indicator from the chat message input for all users at all times, including keyboard-only users. This is a WCAG 2.1 SC 2.4.7 (Focus Visible — Level AA) failure and a WCAG 2.4.11 (Focus Appearance — Level AA) failure.
**Recommended resolution:** Remove the unconditional `outline: none`. If a custom focus style is desired, apply it as `.message-input:focus { outline: 2px solid #2980b9; }` rather than suppressing the outline entirely. Also see GAP-35 for the companion issue of the missing accessible label on this element.

---

## 2026-06-20 (Cycle 4) New Gaps (GAP-155 through GAP-165)

*Discovered during the 15-persona + heuristic review cycle 4, 2026-06-20. Note: 6 persona agents hit API session limits; coverage is partial.*

---

## GAP-155: `toast-warning` CSS Class Missing — Warning Toasts Visually Identical to Base Toast

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — Added `.toast.toast-warning { border-left: 4px solid #f59e0b; }` after `.toast-error` rule in `web/styles.css`. Previously discovered 2026-06-20 (cycle 4 heuristic)
**Affected stories:** US-U7, US-X3
`web/styles.css` defined `.toast.toast-success` (green border) and `.toast.toast-error` (red border) but not `.toast.toast-warning`. Any call to `showToast(msg, 'warning')` — including the GAP-149 content-warning toasts in `web/layout-instruction.js:908` — rendered identically to the dark base slab: no colour coding, no severity distinction.
**Fix:** Added amber border-left rule for `toast-warning` matching the same pattern as existing toast variants.

---

## GAP-156: Empty-Profile Modal "Get Started" CTA Closes Modal Without Navigating to Master CV

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — `_setWelcomeSection('empty')` in `web/session-manager.js` now rewrites the "Get Started" button to "Open Master CV" and wires its `onclick` to call `closeWelcomeModal()` then `openMasterCvModal()`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-F1, US-F4
When `_setWelcomeSection('empty')` is called (empty skeleton profile exists), the footer button still read "Get Started" and called `closeWelcomeModal()`, giving the user no obvious next action. The warning text directed users to the Master CV tab but the CTA did not navigate there.
**Fix:** `_setWelcomeSection` dynamically updates button text and handler based on `section` argument.

---

## GAP-157: Rename Widget `okBtn`/`cancelBtn` Missing `aria-label` — Screen Readers Announce Symbols

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Added `aria-label="Save rename"` and `aria-label="Cancel rename"` to the respective buttons in `promptRenameCurrentSession()` in `web/session-manager.js`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X1, US-S3
The inline rename widget (GAP-113 fix) created `okBtn` (textContent `✓`) and `cancelBtn` (textContent `✕`) with only `title` attributes. Screen readers announce the Unicode symbols directly — "check mark" and "multiplication sign" — without communicating the semantic action.

---

## GAP-158: Tabpanel `#document-content` Missing `aria-labelledby` — Not Linked to Active Tab

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — `switchTab()` in `web/review-table-base.js` now sets `aria-labelledby="tab-{tab}"` on `#document-content` whenever the active tab changes. Initial static value `aria-labelledby="tab-job"` added to `web/index.html`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X2, US-X3
`#document-content` had `role="tabpanel"` but no `aria-labelledby` linking it to the active tab element. WCAG 2.1 SC 4.1.2 requires that tabpanels be programmatically associated with their controlling tab via `aria-labelledby`.

---

## GAP-159: No HTML Semantic Landmarks — Screen Reader Navigation Impaired

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — Replaced `.header` `<div>` with `<header role="banner">`, `.workflow` `<div>` with `<nav aria-label="Application workflow steps">`, and `.main-container` `<div>` with `<main>` in `web/index.html`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X1, US-X2
`web/index.html` used `<div>` for all major regions. Screen reader users relying on landmark navigation (e.g., NVDA/JAWS region list, VoiceOver rotor) had no way to jump directly to the header, navigation, or main content area. WCAG 2.1 SC 1.3.6 (Identify Purpose) and WCAG 2.4.1 (Bypass Blocks) require meaningful landmark regions.

---

## GAP-160: `.workflow-steps` No `overflow-x: auto` — Overflows on Narrow Viewports

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Added `overflow-x: auto` to `.workflow-steps` rule in `web/styles.css`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-U3, US-U9
The workflow step strip uses flexbox with `justify-content: center` and no overflow handling. On viewports narrower than approximately 1600px, the step pills overflow and are clipped or push the layout horizontally.

---

## GAP-161: `openMasterCvModal()` Missing Focus Management — Focus Not Trapped or Restored

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — `openMasterCvModal()` now saves `document.activeElement`, calls `setInitialFocus('master-cv-modal-overlay')` and `trapFocus('master-cv-modal-overlay')`. `closeMasterCvModal()` now calls `restoreFocus()`. `web/master-cv.js`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X2, US-X3
`openMasterCvModal()` at `web/master-cv.js:2475` did not save prior focus, move focus into the modal, or trap Tab within it. This contrasted with all sub-modals in the same file (lines 1270–1485) which correctly use the full `_focusedElementBeforeModal` / `setInitialFocus` / `trapFocus` / `restoreFocus` pattern.

---

## GAP-162: 10 `alert()` Calls in `session-switcher-ui.js` — Native Dialogs Break UX and Accessibility

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Replaced all 10 `alert()` calls in `web/session-switcher-ui.js` (rename error, trash error, restore error, delete error, empty-trash error) with `showToast()` error calls. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-X1, US-U4, US-S4
`web/session-switcher-ui.js` used native `alert()` for all error paths (rename, delete, restore, empty-trash). Native alert dialogs block the event loop, cannot be styled, are not accessible via custom focus management, and break the keyboard flow in ways that `showToast()` does not.

---

## GAP-163: Summary Prompt Contradicts US-P1 — Instructs "Title + Years" Opening Instead of Value-Identity

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — Updated summary generation prompt in `scripts/utils/llm_client.py:850` to instruct value-identity opening ("strong verb + differentiating value claim") instead of the title + years formula. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-P1, US-M2
`scripts/utils/llm_client.py:850` (summary generation prompt) instructs the LLM to open with the candidate's job title and years of experience ("Results-driven {title} with {N} years of experience"). US-P1 requires value-identity openings ("X leader who delivers Y result"). The LLM prompt directly contradicts the story requirement, producing summaries that fail the persuasion standard regardless of LLM capability.

---

## GAP-164: `initialize()` Exported from `ui-core.js` But Never Called — Dead Export

**Priority:** LOW
**Status:** OPEN — Discovered 2026-06-20 (cycle 4)
**Affected stories:** US-U1 (tangential)
`web/ui-core.js` exports `initialize()` (line 472–502) via `ui_core_exports` which is spread into `globalThis` at bundle time. The function is never called anywhere in the codebase. Dead exports in the global namespace increase name-collision risk and maintenance confusion.
**Recommended resolution:** Either call `initialize()` from `app.js` as intended, or remove the export and the function if its purpose has been superseded by the per-tab initialization in `loadTabContent()`.

---

## GAP-165: `content_warnings` Not Processed on `applyLayoutSettings()` Path

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-20 — Added `content_warnings` toast processing to `applyLayoutSettings()` response handler in `web/layout-instruction.js`. Previously discovered 2026-06-20 (cycle 4)
**Affected stories:** US-M1, US-R2
The GAP-149 fix added `content_warnings` processing in the `generatePreview()` success handler in `web/layout-instruction.js:907`. However, the `applyLayoutSettings()` function (line 615) also calls `/api/cv/generate-preview` and does not process `content_warnings` from its response. Similarly, the passive restore path does not fire the toast. Users who re-apply layout settings after an initial generation miss the content-warning feedback.

---

## GAP-72 / GAP-NEW-K: Workflow Step Pills — Keyboard Navigation (Enter/Space)

**Priority:** HIGH
**Status:** RESOLVED 2026-06-20 — `updateWorkflowStepsClickable()` in `web/ui-core.js` now sets `role="button"` and `tabindex="0"` on steps as they become clickable, and attaches a `keydown` handler for Enter/Space. Non-clickable steps get `tabindex="-1"` and role removed. `step-job` initial state updated in `web/index.html`. Previously tracked as GAP-72 (2026-04-22)
**Affected stories:** US-X1, US-X2
Workflow step pills had `onclick` handlers but no `role="button"`, `tabindex`, or keyboard event listeners. Keyboard-only users could not activate workflow step navigation using Enter or Space.

---

## 2026-06-20 (Cycle 5) New Gaps (GAP-166 through GAP-175)

*Discovered during the 14-persona + heuristic review cycle 5, 2026-06-20. All 15 agents completed.*

---

## GAP-166: `rewriteDecisions = {}` Reset on Session Restore — In-Progress Decisions Lost

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Implemented `localStorage` persistence keyed by session ID in `web/rewrite-review.js`. Added `_persistDecisions()` (called after every accept/reject/edit at lines 318, 345), `_restoreDecisions()` (called at the start of `renderRewritePanel` before the re-apply loop), and `_clearPersistedDecisions()` (called after successful final submission). Decisions now survive page reload and browser close within the same session. Previously OPEN since 2026-06-20.
**Affected stories:** US-S1, US-S2, US-A4
`web/session-manager.js:740` resets `rewriteDecisions = {}` during session restore when `sessionPhase === PHASES.REWRITE_REVIEW`. The backend `/api/rewrites` endpoint returns rewrite proposals but not any prior partial decisions (accept/reject/edit) the user made before leaving the session. `renderRewritePanel()` then populates the UI from scratch with all proposals undecided. Any decisions the user had made before the session was interrupted are silently discarded.

---

## GAP-167: ↻ Re-Run `<span>` Inside Step Pills Is Keyboard-Inaccessible

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Converted `.step-rerun` from a bare `<span>` to a `<button>` element with `aria-label="Re-run ${stepLabel}"`, `background:none;border:none;padding:0` styling, and no change to click behavior. Hover CSS injection updated to also reveal on `:focus-within` and `:focus-visible`. `web/workflow-steps.js:702–707`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-A12, US-U7
`web/workflow-steps.js:704–706` inserts a `<span class="step-rerun">` inside each completed step pill that supports LLM re-execution. The span has a bare `onclick="event.stopPropagation();confirmReRunPhase('${step}')"` handler but no `role="button"`, no `tabindex`, and no `keydown` listener. The span also starts at `opacity:0` and becomes visible only on CSS `:hover` (`styles.css` injected rule at `workflow-steps.js:723`). Keyboard-only users cannot reach or activate the re-run action; screen reader users receive no announcement of the control's purpose.
**Recommended resolution:** Convert the re-run indicator from a `<span>` to a `<button>` element (or add `role="button"`, `tabindex="0"`, `aria-label="Re-run ${stepLabel}"`, and a `keydown` handler for Enter/Space). Replace `opacity:0/hover` visibility with `:focus-within` or always-visible styling to ensure keyboard-discoverable affordance.

---

## GAP-168: `openSessionsModal` Traps Focus But Does Not Move Focus Into Modal

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Added `setInitialFocus('sessions-modal-overlay')` call immediately after `trapFocus()` in `openSessionsModal()`. `web/session-switcher-ui.js:458`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X2, US-S1
`web/session-switcher-ui.js:445–458` — `openSessionsModal()` calls `trapFocus('sessions-modal-overlay')` at line 457 but does not call `setInitialFocus()` or move focus to the first actionable element in the modal. The result is that focus remains on whatever element triggered the modal open, with Tab-key now trapped inside a modal the user cannot perceive focus entering. Contrast with `openMasterCvModal()` (fixed in cycle 4) which correctly calls both `setInitialFocus` and `trapFocus`.
**Recommended resolution:** Call `setInitialFocus('sessions-modal-overlay')` immediately after `trapFocus()` in `openSessionsModal()`, and save `document.activeElement` before opening to restore focus on close.

---

## GAP-169: "Done — Generate CV →" CTA Label Misleads Users About What Happens Next

**Priority:** LOW
**Status:** FULLY RESOLVED 2026-06-22 (cycle 6) — Viewer-panel spell-check buttons at `web/spell-check.js:148,271` renamed from "Done — Generate CV →" to "Generate Preview →". Previously PARTIALLY RESOLVED in cycle 5 (only `web/index.html:186` was fixed). All three button instances now consistent.
**Affected stories:** US-F3, US-U6
`web/index.html:186` and `web/spell-check.js:148,271` — the spell-check completion buttons read "Done — Generate CV →". Activating this button calls `generatePreview()`, which produces an HTML preview for layout review — not the final CV files. The label implies that clicking it produces the finished submission-ready CV, which is not accurate.
**Recommended resolution:** Rename the button to "Generate Preview →" or "Next: Layout Review →" to accurately describe the destination and preserve the staged-generation mental model introduced by GAP-79's recommended fix.

---

## GAP-170: `#llm-busy-label` Has No `aria-live` — "Reasoning…" Not Announced to Screen Readers

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Added `aria-live="polite" role="status"` to `#llm-busy-label` in `web/index.html:155`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X3, US-U7
`web/index.html:155` — `<div id="llm-busy-label">Reasoning…</div>` is updated dynamically by `job-input.js`, `job-analysis.js`, and other modules to describe the current LLM operation. The element has no `aria-live` attribute or `role="status"`. Screen reader users receive no announcement when the overlay appears or when the label text changes (e.g., "Analysing job description…", "Generating rewrites…"). The outer `#llm-busy-overlay` is similarly silent.
**Recommended resolution:** Add `aria-live="polite"` and `role="status"` to `#llm-busy-label` so that its content is announced to screen reader users when the overlay becomes visible. Alternatively, add `aria-live="assertive"` to the overlay container so the appearance of any busy state is immediately announced.

---

## GAP-171: Category Reorder Buttons Missing `aria-label` — WCAG 2.1 Level A Failure

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Added `aria-label="Move ${category} category up"` and `aria-label="Move ${category} category down"` to the category reorder buttons in `web/skills-review.js:423–424`. Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-M3
`web/skills-review.js:423–424` — the skill category reorder buttons use `title` attribute only:

```html
<button class="icon-btn" data-action="category-up" title="Move category up" ...>↑</button>
<button class="icon-btn" data-action="category-down" title="Move category down" ...>↓</button>
```

`title` is not reliably announced by screen readers. Individual skill row reorder buttons at `skills-review.js:772–773` correctly use `aria-label` — the category buttons are inconsistent with this established pattern. This is a WCAG 2.1 SC 4.1.2 (Name, Role, Value — Level A) failure.
**Recommended resolution:** Add `aria-label="Move ${category} category up"` and `aria-label="Move ${category} category down"` to the category reorder buttons, using the same naming pattern as the existing skill row reorder buttons.

---

## GAP-172: Workflow Step States Conveyed by Colour Alone — No Screen-Reader Text

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — `updateWorkflowSteps()` in `web/workflow-steps.js` now appends a `<span class="sr-only">` to each step pill describing its state: "(current step)", "(completed)", "(stale — results may be outdated)", "(critical — review required)". Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-U7
`web/styles.css:149–159` — the five workflow step states (active, completed, upcoming, stale, stale-critical) are differentiated exclusively by background colour and text colour changes. No `.sr-only` text or `aria-label` announces the current state of each pill to screen reader users. A screen reader user navigating the step bar via keyboard hears the step label (e.g., "Analysis") but receives no state information ("completed", "stale — results may be outdated").
**Recommended resolution:** In `updateWorkflowSteps()` (`web/workflow-steps.js`), append a visually-hidden `<span class="sr-only">` to each step element describing its state: " (completed)", " (active)", " (stale — click to review)", etc. Update the span's text whenever the state class changes.

---

## GAP-173: No `:focus-visible` CSS for `.tab`, `.action-btn`, and `.step` Elements

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Added `:focus-visible` rules to `web/styles.css` for `.action-btn` (line 589), `.tab` (line 635), and `.step` (line 144). All three classes now show a 2px blue outline on keyboard focus, visible in Windows High Contrast mode. Previously OPEN since 2026-06-20.
**Affected stories:** US-X1, US-U7
`web/styles.css` — no `:focus-visible` rules exist for the three primary interactive element classes: `.tab` (viewer tab bar), `.action-btn` (workflow action buttons), and `.step` (workflow step pills). These rely entirely on the browser's default focus ring, which is invisible in Windows High Contrast mode and suppressed in some browsers by default. The `#message-input` outline issue was fixed in cycle 3 (GAP-154), but the other interactive classes were not updated to include explicit `:focus-visible` styling.
**Recommended resolution:** Add `:focus-visible` rules for `.tab:focus-visible`, `.action-btn:focus-visible`, and `.step:focus-visible` with a distinct, high-contrast outline (e.g., `outline: 2px solid #2980b9; outline-offset: 2px`). This ensures keyboard focus is visible across browsers and accessibility modes.

---

## GAP-174: Cover Letter Has No Mechanism to Inject Company-Specific Initiative References

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Added "Company context" textarea (`#cl-company-context`) to the cover letter generation form in `web/cover-letter.js`. The field value is sent as `company_context` in the POST body and injected into the LLM prompt in `scripts/routes/master_data_routes.py` as a `COMPANY CONTEXT` block with explicit instruction to weave the specifics into the letter. Stored in `cover_letter_params` in session state. Previously OPEN since 2026-06-20.
**Affected stories:** US-M6, US-P3, US-P5
`web/cover-letter.js:124–133` (new textarea), `scripts/routes/master_data_routes.py:1497,1555–1581` (backend extraction and prompt injection).

---

## GAP-175: Professional Summary Specificity Validator Absent

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Added `_checkSummarySpecificity(text)` and `_updateSummarySpecificityBadge(text)` in `web/summary-review.js`. The badge is inserted immediately after `#ai-summary-text` and updated in both `_showAISummary()` and `onSummaryTextChange()`. Three checks: (1) quantified claim (regex for numbers + units/%), (2) target role keyword from `window._lastAnalysisData.title`, (3) generic placeholder phrase detection. Pass shows a green ✓; each failure shows an amber ⚠ advisory. Does not block submission — advisory only.
**Affected stories:** US-M1, US-P1
`scripts/utils/conversation_manager.py:1325` — `check_summary_generic_phrases()` detects and blocks filler phrases like "seasoned professional", "results-driven", and "passionate about". However, the system has no complementary check that enforces the presence of positive specificity: the target job title (or equivalent), a quantified claim (numbers, percentages, years), or a concrete differentiator. A summary like "Experienced engineer who has worked on many challenging problems" passes all current checks despite being generic and unverifiable.
**Cycle 8 additional evidence:** The fallback summary at `cv_orchestrator.py:197` is explicitly generic ("Experienced professional with a strong track record..."). If no specific summary is selected or rewritten, this placeholder can reach the generated PDF.
**Recommended resolution:** Add a post-generation summary validation step that checks for the presence of at least one of: (1) the target job title or role synonym, (2) a quantified achievement (regex for number/percentage patterns), or (3) a specific named technology or domain. Surface failures as an advisory warning in the summary review tab before the user proceeds to generation.

---

## 2026-06-22 (Cycle 6) New Gaps (GAP-176 through GAP-181)

---

## GAP-176: Bullet-Reorder Modal Missing `role="dialog"`, Focus Trap, and ARIA Structure

**Priority:** HIGH
**Status:** RESOLVED 2026-06-22 — Added `role="dialog" aria-modal="true" aria-labelledby="bullet-reorder-title"` to the modal element; added `id="bullet-reorder-title"` to the h3; calls `trapFocus('bullet-reorder-modal')` and `setInitialFocus('bullet-reorder-modal')` after appending; calls `restoreFocus()` on ✕ close, Save Order, and Reset to Auto paths; added Escape key handler. Also added `aria-label` to the ↑↓ move buttons. `web/workflow-steps.js`. Previously OPEN since 2026-06-22.
**Affected stories:** US-X2, US-A3
`web/workflow-steps.js:456–499` — `showBulletReorder()` rendered a list-reorder overlay modal with no ARIA dialog structure, no focus trap, and no focus restoration.

---

## GAP-177: Human DOCX Section Headings Use Bold Runs, Not Word Heading Paragraph Styles

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 8) — Updated `_heading()` helper in `_generate_human_docx()` (`scripts/utils/cv_orchestrator.py:4373`) to use `doc.add_paragraph(style='Heading 1')` (or `'Heading 2'` for level 2) so the paragraph carries Word's semantic heading structure. Visual formatting (bold run, dark blue colour, bottom border, spacing) is applied on top and continues to control appearance.
**Affected stories:** US-H1, US-X3
`scripts/utils/cv_orchestrator.py:4373–4391` — The human-readable DOCX output applies bold formatting to section heading paragraphs using `run.bold = True` rather than assigning Word Heading paragraph styles (`doc.styles['Heading 1']`). As a result: (1) JAWS, NVDA, and VoiceOver cannot navigate the document by heading; (2) ATS parsers that use semantic paragraph role to detect sections may misclassify content. The ATS DOCX path (`_setup_ats_styles`) correctly avoids tables and shapes but also does not set Heading paragraph styles for sections.
**Recommended resolution:** Apply `para.style = doc.styles['Heading 1']` (or equivalent) to section heading paragraphs in the human DOCX path, in addition to any bold/font-size formatting. This preserves visual appearance while enabling semantic navigation.

---

## GAP-178: Rewrite Accept/Edit/Reject Buttons Missing `aria-pressed` State

**Priority:** LOW
**Status:** RESOLVED 2026-06-22 — Added `aria-pressed="false"` at render time to all three buttons (`web/rewrite-review.js:306–308`). In `applyRewriteAction()`, reset all to `"false"` in the clear loop then set the active button to `"true"`. Same pattern in `saveRewriteEdit()`.
**Affected stories:** US-X3, US-A4
`web/rewrite-review.js:273–275` — The three action buttons per rewrite card (✓ Accept, ✎ Edit, ✗ Reject) visually show their selected state via CSS `.active` class (color fill) but carry no `aria-pressed` attribute. Screen reader users hear "Accept button" without any indication that a decision has already been made. The button state is invisible to AT.

---

## GAP-179: `.icon-btn`, `.rw-btn`, `.sm-btn` Missing `:focus-visible` CSS

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 6) — Added `:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px }` to `.icon-btn` (`styles.css` after line 1193), `.rw-btn` (after line 1261), and `.sm-btn` (after line 295). Discovered and fixed this cycle.
**Affected stories:** US-X2, US-X3
`web/styles.css` — `GAP-173` (cycle 5) added `:focus-visible` to `.action-btn`, `.tab`, and `.step`, but missed `.icon-btn` (skills reorder, session switcher), `.rw-btn` (rewrite accept/edit/reject), and `.sm-btn` (session modal action buttons). Keyboard-only users tabbing to these elements received no visible focus ring on browsers that suppress default outlines.

---

## GAP-180: Step-Rerun Button `opacity:0` at Rest — Zero Discoverability for Mouse Users

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 — Changed default `opacity` from `0` to `0.35` in the `.step-rerun` inline button template (`web/workflow-steps.js:733`). The ↻ button is now dimly visible at rest on all completed step pills; it brightens to full opacity on hover or focus.
**Affected stories:** US-W3, US-A12
`web/workflow-steps.js:723` — The CSS injected for the ↻ re-run button sets `opacity: 0` by default and `opacity: 1 !important` on `.step.completed:hover` and `.step.completed:focus-within`. Mouse users who do not hover over completed step pills never see the re-run affordance. The button is now keyboard-reachable (GAP-167 fix), but it is invisible unless the pill is hovered first. Users who don't know the feature exists will never discover it through normal navigation.

---

## GAP-181: Viewer-Panel Spell-Check Buttons Still "Done — Generate CV →"

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 6) — Changed `web/spell-check.js:148` and `web/spell-check.js:271` from "Done — Generate CV →" to "Generate Preview →". This completes the GAP-169 fix; `web/index.html:186` was fixed in cycle 5 but `spell-check.js` was missed. Discovered and fixed this cycle.
**Affected stories:** US-F3, US-U6
`web/spell-check.js:148,271` — The two viewer-panel spell-check submit buttons (empty state and review state) still read "Done — Generate CV →" after the cycle 5 partial fix of GAP-169 that only updated `index.html:186`. This created a label inconsistency between the chat-panel button and the viewer-panel buttons.

---

## GAP-182: `.action-btn.secondary` Has No CSS Definition

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-22 (cycle 7) — Added `.action-btn.secondary { background: #e2e8f0; color: #374151; border-color: #94a3b8; }` and hover rule to `web/styles.css` after the `.action-btn.primary` block. Discovered and fixed this cycle.
**Affected stories:** US-G2, US-U4
`web/index.html:307`, `web/master-cv.js:77,166,171,176,204,206,434` — Eight elements use `class="action-btn secondary"` (Cancel button in confirm modal; Export Master CV; BibTeX import/convert/toggle/validate/load buttons) but no CSS rule defines `.action-btn.secondary`. These buttons silently fall back to the base `.action-btn` grey style, making Cancel and secondary actions visually indistinguishable from each other and from ghost navigation buttons.

---

## 2026-06-29 (Cycle 8) New Gaps (GAP-183 through GAP-194)

---

## GAP-183: Input Focus States Fail Windows High Contrast / `forced-colors: active`

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Added `outline: 2px solid #3b82f6; outline-offset: 2px` to all four affected `:focus` rules in `web/styles.css` (lines 510, 579, 755, 1436). Focus outline now persists under `forced-colors: active`; `box-shadow` continues to provide the visual glow in standard mode. Also added `.q-chip:focus-visible` rule at same time (see GAP-193).
**Discovered:** 2026-06-29 (cycle 8) by ux-expert and accessibility-specialist.
**Affected stories:** US-X2, US-X3, US-U3
Four input elements use `outline: none` with `box-shadow` as the sole focus indicator. Under `forced-colors: active` (Windows High Contrast Mode), browsers suppress `box-shadow`, rendering these inputs invisible when focused. This is a WCAG 2.1 Level AA failure (1.4.11 Non-text Contrast) under forced-colors.
**Affected selectors and locations:**
- `.q-input:focus` (`web/styles.css:510`)
- `.message-input:focus` (`web/styles.css:579`)
- `.form-input:focus` (`web/styles.css:755`)
- `.layout-instruction-textarea:focus` (`web/styles.css:1436`)
**Recommended resolution:** Add `outline: 2px solid #3b82f6; outline-offset: 2px` alongside each existing `box-shadow` rule. The outline persists under forced-colors; the box-shadow provides the visual style in standard mode.

---

## GAP-184: Cover Letter Body May Open With "I" — No Rejection Gate

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Added Rule 1b to `_validateCoverLetter()` in `web/cover-letter.js`. The check finds the first body paragraph (lines after the salutation) and tests if its first word is "I". If so, it renders a fail card: "Body opens with 'I' — lead with your value, the role, or the company instead." Bundle rebuilt.
**Discovered:** 2026-06-29 (cycle 8) by persuasion-expert.
**Affected stories:** US-P1, US-P3
`_validateCoverLetter()` (`web/cover-letter.js:492–509`) validates for generic salutations and empty body but does not detect when the first word of the opening line is "I". Persuasion best practice and the story require the opening to establish value or context before the first-person pronoun.
**Recommended resolution:** Add a check in `_validateCoverLetter`: if the letter body (after stripping salutation and whitespace) begins with the word "I" (case-insensitive, word boundary), show a blocking or advisory error: "Cover letter should not open with 'I'. Lead with your value or the role you are targeting."

---

## GAP-185: Cover Letter PDF Not Generated — Only DOCX Produced

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — After DOCX save, `/api/cover-letter/save` now builds a minimal HTML representation of the cover letter (11pt Calibri, 2.5cm margins) and calls WeasyPrint in a subprocess (same crash-safe pattern as `cv_orchestrator._convert_html_to_pdf`). Both `.docx` and `.pdf` filenames are appended to `generated_files.files` and returned in the API response. WeasyPrint failure is caught and logged as a warning; DOCX is still saved in that case and `pdf_filename` returns `null`.
**Discovered:** 2026-06-29 (cycle 8) by applicant.
**Affected stories:** US-A7, US-O1
`scripts/routes/master_data_routes.py:1619–1697` — the cover letter generation route produces only a DOCX file. No PDF conversion step exists for the cover letter. The download tab will show a `.docx` but no `.pdf`. The applicant story (US-A7) expects both formats to be available for submission.
**Recommended resolution:** After generating the cover letter DOCX, run WeasyPrint or python-docx2pdf to produce a matching `.pdf` at the same output path, mirroring the pattern used for CV PDF generation.

---

## GAP-186: Rewrite Decisions Not Cold-Restored from Backend `approved_rewrites`

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Three-layer fix: (1) `RewritesResponse` dataclass (`scripts/web_app.py`) gained `rewrite_audit: List[Any]` field; (2) both return paths in `/api/rewrites` (`scripts/routes/review_routes.py`) now include `rewrite_audit=conversation.state.get('rewrite_audit') or []`; (3) `web/rewrite-review.js` adds module-level `_backendRewriteAudit`, stores audit from `fetchAndReviewRewrites()` response, and `_restoreDecisions()` falls back to cold-restore from the audit when localStorage has no entry for the session.
**Discovered:** 2026-06-29 (cycle 8) by returning-user.
**Affected stories:** US-S2, US-S3
`_persistDecisions()` / `_restoreDecisions()` (`web/rewrite-review.js:43–65`) round-trip rewrite card state via `localStorage`. This works for same-device / same-browser returns within the storage TTL. However, on cold load (different device, incognito, localStorage cleared, or after 24h), the backend `state['approved_rewrites']` is not used to re-seed the rewrite panel UI. Users who return to a session from a different device or after a storage reset lose all their previously recorded rewrite decisions from the UI, even though the decisions persist in the backend session state.
**Recommended resolution:** On rewrite panel render, check `approved_rewrites` in the session state returned by `/api/status`. For each proposal already present in `approved_rewrites`, set the corresponding card's decision radio to the stored outcome before rendering. This should be a fallback only when localStorage has no entry for this session.

---

## GAP-187: Cover Letter Word Count Not Role-Differentiated

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — `_validateCoverLetter()` in `web/cover-letter.js` now reads `window._lastAnalysisData.role_level` and `.domain` (same source used by `_getCompanyNameForCL`). Selects `wcTarget` from three tiers: standard (300–400w, warn 250–450), executive (400–500w, warn 300–550), academic/research (500–600w, warn 400–650). The validation label and detail text update to show the active tier. Bundle rebuilt.
**Discovered:** 2026-06-29 (cycle 8) by hiring-manager. Related to GAP-95.
**Affected stories:** US-M6, US-P5
`web/cover-letter.js:534` hard-codes a single 250–400 word validation range for all roles. The hiring-manager story and persuasion guidance require role-specific targets:
- Standard/industry roles: 300–400 words
- Executive/VP/C-suite roles: 400–500 words
- Academic/research roles: 500–600 words
Role level is available from `job_analysis.role_level` / `job_analysis.domain` in the session state.
**Recommended resolution:** Expose `role_level` in the status endpoint's job analysis summary. In `cover-letter.js`, read `role_level` on init and select the appropriate threshold object before validation runs.

---

## GAP-188: `approved_rewrites` Not Injected Into Cover Letter LLM Prompt

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — In `scripts/routes/master_data_routes.py`, added `approved_rewrites_block` construction after `company_context_block`. Reads `conversation.state.get('approved_rewrites') or []`, formats up to 5 approved bullets as a `TAILORED CV BULLETS` block, and injects it into the cover letter generation f-string prompt immediately after `top_ach_titles`. LLM is instructed to "reference at least one" approved bullet.
**Discovered:** 2026-06-29 (cycle 8) by hiring-manager.
**Affected stories:** US-M5, US-M6
`scripts/routes/master_data_routes.py:1555–1581` (cover letter generation prompt) and `scripts/headless_session.py:427–430` (headless path) do not include `approved_rewrites` or tailored achievement bullets from the session. The LLM generates cover letter content without access to the specific phrases, metrics, or accomplishments the user has already approved for their customised CV. This means cover letter content may contradict or fail to echo the tailored CV narrative.
**Recommended resolution:** In the cover letter generation route, read `session_state.get('approved_rewrites', [])` and format the top 3–5 approved rewrites as a `TAILORED ACHIEVEMENTS` block in the system prompt. Instruct the LLM to echo at least one specific achievement or phrase from this block in the cover letter body.

---

## GAP-189: Action-Verb Warnings in Experience Bullets Are Log-Only

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Added `_achVerbWarning()` in `web/achievements-review.js` with mirrored `_ACH_WEAK_VERBS` and `_ACH_STRONG_VERBS` sets (from `cv_orchestrator.py`). In `renderAchievementEditorRows()`: each bullet's textarea is now wrapped in a `flex-direction:column` div; when the first word is in `_ACH_WEAK_VERBS`, an amber warning badge appears below the textarea ("⚠ Weak opening verb"); when not in `_ACH_STRONG_VERBS`, a grey informational badge appears. Weak-verb bullets also get a yellow border. The check fires on render and on save. Backend `_enhance_achievement_for_ats` log warning remains; no backend change needed for UI surfacing.
**Discovered:** 2026-06-29 (cycle 8) by hiring-manager.
**Affected stories:** US-M2, US-R3
`_enhance_achievement_for_ats()` (`scripts/utils/cv_orchestrator.py:3966–3970`) calls `logger.warning(f"Weak action verb: {verb}")` when it detects a weak opening verb in a bullet. This log entry is never surfaced to the user. The experience bullets review tab shows no indicator when a bullet's opening verb is flagged as weak (e.g. "Responsible for", "Helped", "Assisted").
**Recommended resolution:** Store weak-verb flags in the bullet metadata (e.g., `bullet['weak_verb_warning'] = True`) and return this in the `/api/status` response. In the experience bullets review tab, display a small ⚠ badge next to flagged bullets with a tooltip: "Consider replacing the opening verb with a stronger action word."

---

## GAP-190: Phase Re-Run Events Not Written to Session Audit Log

**Priority:** LOW
**Status:** RESOLVED 2026-06-29 — Added `rerun_log` append in `re_run_phase()` (`scripts/utils/conversation_manager.py:1570`), just before `_save_session()`. Each entry contains `phase` (resolved phase name), `timestamp` (UTC ISO-8601), and `triggered_by: 'user'`. Log is persisted in session state JSON.
**Discovered:** 2026-06-29 (cycle 8) by applicant.
**Affected stories:** US-A12, US-C2
`re_run_phase()` (`scripts/utils/conversation_manager.py:1570–1576`) updates phase state and returns the result but does not write any timestamped entry to the session's audit trail. Users and compliance reviewers cannot determine from the session JSON when a phase was re-entered, how many times re-runs occurred, or which outcome was produced each time.
**Recommended resolution:** Add a timestamped `rerun_log` entry to session state in `re_run_phase()`:
```python
session_state.setdefault('rerun_log', []).append({
    'phase': phase_name, 'timestamp': datetime.utcnow().isoformat(), 'triggered_by': 'user'
})
```

---

## GAP-191: Session Table Icon Buttons Have `title` But No `aria-label`

**Priority:** MEDIUM
**Status:** RESOLVED 2026-06-29 — Added `aria-label` matching the `title` text to all three icon buttons in `_renderSessionTableRow()` (`web/session-switcher-ui.js:342–344`): Load session, Rename session, Move session to Trash. Also added aria-label to the inline rename Save/Cancel buttons.
**Discovered:** 2026-06-29 (cycle 8) by accessibility-specialist.
**Affected stories:** US-X1, US-X2
Session table row action buttons (rename, archive, delete) use HTML `title` attributes for tooltip text but no `aria-label`. The `title` attribute is announced inconsistently across screen readers (NVDA announces it; VoiceOver does not by default). Without `aria-label`, VoiceOver users hear only the button icon character or silence.
**Source evidence:** `web/bundle.js:19567` (session-switcher-ui rendered icon buttons); `web/session-switcher-ui.js` row-render function.
**Recommended resolution:** Add `aria-label` matching or expanding on the existing `title` text to each icon button: e.g., `aria-label="Rename session"`, `aria-label="Archive session"`, `aria-label="Delete session"`.

---

## GAP-192: Emoji in Workflow Steps and Tab Labels Not Wrapped in `aria-hidden`

**Priority:** LOW
**Status:** RESOLVED 2026-06-29 — Wrapped all 12 workflow step emoji and all 19 tab label emoji in `<span aria-hidden="true">` in `web/index.html` (lines 119–141 and 200–225). Also wrapped the three ✅ advance buttons (layout-btn, final-generate-proceed-btn, finalise-action-btn, lines 188–190).
**Discovered:** 2026-06-29 (cycle 8) by accessibility-specialist.
**Affected stories:** US-X1, US-X2
Workflow step pills and tab labels include emoji characters (e.g., ✅, ↻, ⚠) that are read aloud by screen readers as their Unicode name: "white heavy check mark", "clockwise rightwards and leftwards open circle arrows", etc. This interrupts the label flow and adds noise for screen reader users.
**Source evidence:** `web/index.html:200–225` (step pill label templates).
**Recommended resolution:** Wrap decorative emoji in `<span aria-hidden="true">` elements: e.g., `<span aria-hidden="true">✅</span> Confirm Layout`.

---

## GAP-193: `.q-chip` Missing `:focus-visible` CSS Rule

**Priority:** LOW
**Status:** RESOLVED 2026-06-29 — Added `.q-chip:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` to `web/styles.css` after the `.q-chip.selected` rule. Fixed in the same commit as GAP-183.
**Discovered:** 2026-06-29 (cycle 8) by accessibility-specialist.
**Affected stories:** US-X2, US-X3
`.q-chip` elements (qualification match chips, skills chips, tag chips) are rendered as focusable `<span>` or `<button>` elements but have no `:focus-visible` CSS rule in `web/styles.css`. Keyboard users tabbing through chips receive no visible focus indicator. GAP-179 added `:focus-visible` to `.icon-btn`, `.rw-btn`, `.sm-btn`; `.q-chip` was missed.
**Recommended resolution:** Add `.q-chip:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }` to `web/styles.css` after the existing `.q-chip` block.

---

## GAP-194: Two Overlapping Advance Buttons With Inconsistent Labels (GAP-U9 upgraded to Fail)

**Priority:** HIGH
**Status:** RESOLVED 2026-06-29 — Relabeled both buttons for clarity and visual distinction:

- `#final-generate-proceed-btn`: "✅ Proceed to Finalise →" → "📥 Continue to File Review →" (distinct emoji, clearer destination)
- `#finalise-action-btn`: "✅ Finalise" → "📦 Package Application Files" (action-oriented, no ✅ conflict)

`#layout-btn` retains its dynamic ✅/⬇️/↻ labels unchanged. `updateActionButtons()` already ensures only one button is visible per stage — the fix is label clarity, not structural consolidation.
**Affected stories:** US-U9, US-A5
`web/index.html:188–189` — Two overlapping advance buttons appear at the Layout stage:

- `#layout-btn` — label "✅ Confirm Layout" (advances to `spell_check` phase)
- `#final-generate-proceed-btn` — label "✅ Proceed to Finalise →" (shown at a different moment but overlapping in DOM)

The buttons have inconsistent labels, both use ✅ prefix, and the second label "Proceed to Finalise →" is misleading because the next step is spell check, not finalisation. The story requires a single unambiguous "Proceed to Final Generation" CTA at this step.
**Recommended resolution:** Consolidate to a single advance button at this workflow stage. Relabel using the story's required text "Proceed to Final Generation" and remove the redundant `#final-generate-proceed-btn` or hide it until the correct phase. Ensure only one ✅ CTA is visible at any time.
