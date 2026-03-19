# CV Builder UI Review
**Date:** 2026-03-19
**Review basis:** refreshed source-verified persona reviews dated 2026-03-19
**Primary code reviewed:** `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/cv_orchestrator.py`, `scripts/utils/llm_client.py`

---

## Summary

This report replaces the older 2026-03-13 assembly with a normalized synthesis of the March 19 review artifacts. The source files are not perfectly uniform, so the rollups below distinguish story-level review blocks from the persuasion review's criteria-level aggregate.

### Story Outcome Rollup

| Review source | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | Notes |
|---|---:|---:|---:|---:|---|
| Applicant (`US-A*`) | 1 | 11 | 3 | 0 | `tasks/user-story-applicant.md` review status |
| Resume expert (`US-R*`) | 0 | 2 | 5 | 0 | Derived from each story's acceptance-criteria block |
| Hiring manager (`US-M*`) | 0 | 5 | 2 | 0 | `tasks/user-story-hiring-manager.md` review status |
| HR / ATS (`US-H*` / `US-T*`) | 0 | 1 | 5 | 2 | `tasks/user-story-hr-ats.md` review status |
| UX expert (`US-U*`) | 0 | 2 | 7 | 0 | Derived from each story row in the UX review block |
| **Total story-level outcomes** | **1** | **21** | **22** | **2** | Excludes persuasion criteria rollup below |

### Persuasion Review Rollup

| Review source | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | Notes |
|---|---:|---:|---:|---:|---|
| Persuasion expert (`US-P*`) | 4 | 14 | 1 | 5 | Criteria-level aggregate from `tasks/user-story-persuasion-expert.md` |

### Current Product Read

- The app is no longer a blank shell. Core workflow structure, rewrite review, publication review, and parts of finalise / harvest / rerun infrastructure are real and source-verified.
- The biggest remaining gap is still end-to-end completeness: several stories have substantial partial implementations, but the last 20% of behavior is missing in ways that break the promised workflow.
- The strongest implemented areas are rewrite approval, publication ranking/review, workflow orientation basics, and some quality/persuasion linting.
- The weakest areas are staged HTML preview/layout review, ATS-specific output semantics, intake confirmation/default reuse, spell-check write-back, and complete rerun UX.

---

## Top Gaps

### Critical

- **GAP-20: Staged HTML preview -> layout review -> final generation workflow remains open.** Backend layout endpoints exist, but the reviewed frontend still does not provide the required HTML preview, instruction loop, preview refresh, confirm-layout step, and separate final-generation transition.
- **GAP-22: ATS document structure and skill-type semantics remain open.** ATS DOCX headings, contact normalization, hard-vs-soft skill treatment, and related schema semantics are still below the source-verified story target.

### High

- **GAP-23: Intake metadata confirmation and clarification defaults remain open.** Editable extracted company/role/date confirmation and prior-session clarification defaults are still missing from the reviewed flow.
- **GAP-21: ATS match score and keyword visibility remain open.** The app surfaces keyword-related data, but not the unified ATS-fit score, per-keyword status model, or live score feedback the stories require.
- **GAP-19: Structured Master CV editor remains open.** The current Master CV surface still does not provide full structured editing across experiences, skills, education, publications, certifications, and personal info.
- **GAP-08: Spell and grammar resolution path is only partial.** Spell-check endpoints and audit persistence exist, but accepted corrections are not source-verified as writing back into final content, `skill_name` handling is incomplete, and unresolved-item blocking is incomplete.
- **GAP-18 / GAP-02: Rerun and phase re-entry are only partially complete.** Core APIs exist, but not every completed stage exposes rerun, changed-item highlighting is missing, and layout-stage refinement is not story-complete.
- **GAP-16: UX and information architecture issues remain substantial.** The app still has dense shell chrome, weak responsive behavior, incomplete review ergonomics, and missing inline preview/version affordances in several key flows.

### Medium

- **GAP-06: Rewrite review is functional but still inefficient in larger batches.** Inline diff is verified, but edit mode hides context and no sequential "approve and next" flow was source-verified.
- **GAP-07: Content ordering is only partially solved.** Bullet reordering exists within experience entries, but row-level reordering across experiences, achievements, skills, and publications is still incomplete.
- **GAP-24: Publication curation is strong in review but incomplete at final output.** Ranked publication review exists, yet section omission, persistence, first-author visibility, and final rendering rules are still not fully source-verified.

---

## UX / Heuristic Synthesis

- **Workflow orientation is improved but not complete.** The workflow chips, active/completed state styling, and session restore behavior are real, but rerun discoverability and restore context are still weaker than the stories require.
- **Job intake still moves too quickly into analysis.** Protected-site guidance exists and editable confirmation fields are partly supported, but the full intake-confirmation substep and role-type defaulting behavior are still missing.
- **Analysis and clarification UX needs chunking.** Analysis surfaces and keyword badges exist, but clarifying questions are still rendered in a dense, all-at-once format rather than a staged, low-cognitive-load flow.
- **Review UX is uneven.** Rewrite diff rendering is in much better shape than before, but customization tables still lack some context labeling, reorder ergonomics, and accessibility coverage.
- **Generation UX remains the biggest frontend product gap.** Progress labels exist, but in-browser staged preview, versioning, and the layout instruction flow are still not implemented to the level the stories describe.
- **Accessibility is partial, not done.** Modal focus management exists, but icon-only controls still miss some `aria-label` coverage and keyboard behavior is inconsistent across review/reorder affordances.

---

## Persona Snapshots

### Applicant (`US-A*`)

- **Pass:** US-A4
- **Partial:** US-A1, US-A2, US-A3, US-A4b, US-A5c, US-A6, US-A7, US-A8, US-A9, US-A11, US-A12
- **Fail:** US-A5a, US-A5b, US-A10

Key takeaways:
- The rewrite approval flow is now the clearest strong point in the applicant journey.
- The staged generation sequence is still broken at the HTML preview and layout-review steps.
- Master-data editing remains incomplete enough to block the intended pre-workflow maintenance story.

### Resume Expert (`US-R*`)

- **Partial:** US-R1, US-R2
- **Fail:** US-R3, US-R4, US-R5, US-R6, US-R7

Key takeaways:
- Keyword grouping, publication review, and bullet reordering have real implementation behind them.
- The system still falls short on batch rewrite consistency, summary quality enforcement, skill evidence/write-back, complete rewrite traceability, and spell-check correctness.

### Hiring Manager (`US-M*`)

- **Partial:** 5 stories
- **Fail:** 2 stories

Key takeaways:
- Relevance ordering, page-length warnings, and some cover-letter controls exist.
- Final-output quality still lacks stronger governance around publication rendering, presentation quality, and the candidate-facing match summary.

### HR / ATS (`US-H*` / `US-T*`)

- **Partial:** 1 story
- **Fail:** 5 stories
- **Not implemented:** 2 stories

Key takeaways:
- ATS validation is real enough to inspect, but it runs from the wrong part of the flow and is missing required checks.
- ATS DOCX semantics, keyword visibility, heading conventions, and hard/soft skill modeling are still major gaps.

### Persuasion Expert (`US-P*`)

- **Criteria rollup:** 4 pass, 14 partial, 1 fail, 5 not implemented

Key takeaways:
- Prompting and review checks now preserve some persuasion mechanics: strong verbs, CAR hints, numeric preservation, and basic cover-letter validation are in place.
- Narrative-thread enforcement, stronger cover-letter opening rules, and cross-document harmonization are still incomplete.

### UX Expert (`US-U*`)

- **Partial:** US-U1, US-U7
- **Fail:** US-U2, US-U3, US-U4, US-U5, US-U6, US-U8, US-U9

Key takeaways:
- The shell has meaningful workflow state and some accessibility structure.
- The remaining failures cluster around intake polish, analysis chunking, review efficiency, responsive behavior, preview/versioning, and the missing layout-review frontend.

---

## Recommended Focus Order

1. Close the staged generation hole: finish HTML preview, layout review, and confirmed final generation (`GAP-20`).
2. Bring ATS output and ATS validation up to story-complete semantics (`GAP-04`, `GAP-21`, `GAP-22`).
3. Finish rerun/intake/spell-check workflow completeness so the core loop is dependable (`GAP-02`, `GAP-08`, `GAP-18`, `GAP-23`).
4. Improve review ergonomics, accessibility, and responsive behavior once the core workflow is solid (`GAP-06`, `GAP-07`, `GAP-15`, `GAP-16`).
