# UI Gap Implementation Plan

**Created:** 2026-03-19  
**Status:** Phases 1, 2, 3, 5, and 6 complete; Phase 4 reopened on 2026-03-23 for spell-audit preview/final consistency; Refactor backlog M01–M27 complete (2026-03-21)  
**Source basis:** `tasks/ui-review.md` and `tasks/gaps.md` refreshed on 2026-03-23

## Overview

This plan translates the March 19 source-verified UI review into an implementation sequence that closes the highest-risk workflow gaps first, then finishes story-completeness across ATS, intake, rerun, review ergonomics, and accessibility.

The plan is intentionally staged. The current app has meaningful workflow infrastructure already, so the fastest path is not a full redesign. We should preserve the existing review pipeline and add the missing workflow contracts, UI surfaces, persistence, and validation layers in slices that remain testable throughout.

## 2026-03-23 Approved Planning Scope

The March 23 persona-rollup review narrowed the next planning slice to the items that most directly repair the applicant workflow without expanding into a full redesign.

**Plan now**

- Workstream 1: staged `HTML preview -> layout review -> final generation`
- Workstream 2: ATS score visibility and keyword reasoning, delivered with the staged generation slice
- Workstream 3: intake confirmation, with smart clarification defaults deferred if scope starts to grow
- Workstream 3: rerun and session-recovery clarity, especially changed-item visibility and layout-stage re-entry
- Workstream 6: accessibility and dense-review ergonomics cleanup that directly supports the repaired workflow
- `BUG-SpellAuditPreviewMismatch`: preview generation still reads the legacy `state.spell_check.audit` key while spell-check completion persists to `state.spell_audit`; preview and final generation must use the same canonical spell-audit source

**Postpone**

- Standalone expansion of spell-check beyond the preview/state consistency fix
- Broad workflow-boundary redesign; keep only lightweight boundary notes in this plan
- Additional final-preview/versioning expansions that should be reconsidered after the staged workflow lands

## Current State

- Rewrite review, publication review, workflow state basics, and parts of finalise, harvest, and rerun are real.
- The biggest missing behavior is the staged generation contract: `HTML preview -> layout review -> confirmed final generation`.
- ATS support exists, but scoring, document semantics, and visibility are still below the reviewed story target.
- Intake, rerun, and spell-check flows are partially implemented but not dependable enough to support iterative use.
- UX, accessibility, and responsive behavior need a focused cleanup pass after the core workflow is complete.

## Scope

This plan covers the open or partial gaps that most directly affect end-to-end success:

- `GAP-20` staged generation workflow
- `GAP-21` ATS match score and keyword visibility
- `GAP-22` ATS document structure and skill semantics
- `GAP-23` intake metadata confirmation and clarification defaults
- `GAP-02` and `GAP-18` rerun and phase re-entry completeness
- `GAP-08` spell and grammar resolution path
- `GAP-19` structured Master CV editor
- `GAP-24` publication persistence and final rendering
- `GAP-06`, `GAP-07`, `GAP-15`, and `GAP-16` review ergonomics, accessibility, and UX cleanup

This plan does not treat lower-priority persuasion or broad master-data ingestion work as the first implementation target unless they are required by one of the slices above.

## Success Criteria

- A user can generate an HTML preview, review and revise layout instructions against that preview, confirm the layout, and then generate final outputs from the confirmed HTML.
- ATS fit is visible throughout customization and generation through a single scoring model with keyword-level status and persisted metadata.
- The ATS score is refreshed at reasonable checkpoints and shown on the same row as `div.position-bar`, aligned to the right edge of the window.
- ATS output uses the expected structural semantics, normalized contact formatting, and hard-vs-soft skill handling.
- Intake includes a confirmation substep for extracted metadata and can preload prior clarification defaults for similar role types.
- Every supported completed stage exposes rerun affordances, preserves prior decisions appropriately, and highlights changed items on re-entry.
- Spell-check behaves as a real quality gate: required review, explicit resolution, and identical accepted-fix replay across preview, layout refresh, and generated output.
- Core review and generation flows are keyboard-usable, responsive, and easier to navigate on typical laptop screens.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Delivery order | Workflow completeness before UX polish | The main blockers are missing behavior, not only weak presentation |
| Generation contract | Make HTML preview a first-class persisted artifact | Enables layout iteration, diffing, rerun clarity, and final-generation traceability |
| ATS scoring | Compute one shared scoring model used by analysis, review, validation, and finalise | Avoids conflicting numbers across stages |
| ATS score refresh cadence | Refresh after major workflow checkpoints and debounced bursts of review edits, not on every keystroke | Keeps the score useful without creating noisy or distracting UI churn |
| ATS score placement | Render the visible ATS score summary on the same row as `div.position-bar`, right-aligned | Keeps the score globally visible without adding another header band |
| Skill semantics | Introduce hard/soft skill typing in shared data structures, not only in rendering | Needed for both ATS output and UI review logic |
| Rerun behavior | Re-review only changed or new items where possible | Preserves user trust and reduces repeat work |
| Master data scope | Deliver structured editor after the core workflow is dependable | Important, but not the fastest path to fixing the broken applicant journey |
| Spell-audit source of truth | Use `state['spell_audit']` as the canonical session field for preview and final generation | Prevents preview/final divergence after accepted spell-check decisions |

## Rejected Alternatives

| Alternative | Why not now |
|---|---|
| Full frontend redesign before gap closure | High churn and weak ROI while workflow contracts are still incomplete |
| ATS score only at finalise time | Too late to guide customization decisions |
| Treat layout review as a modal on top of current generation | Hides state and does not create a durable staged artifact model |
| Build the full natural-language master-data ingestion flow first | Valuable, but lower leverage than fixing generation, ATS, and rerun completeness |

## Workstreams

### Workstream 1: Staged Generation Contract

**Primary gaps:** `GAP-20`, parts of `GAP-05`, `GAP-16`  
**Goal:** Replace the bundled generation flow with explicit preview, layout review, confirmation, and final-generation stages.

**Tasks**

1. Audit the current generation, layout, and completion endpoints across `scripts/web_app.py`, `scripts/utils/cv_orchestrator.py`, `web/app.js`, `web/ui-core.js`, and `web/state-manager.js`.
2. Define a persisted generation state model for:
   - preview HTML artifact
   - layout instructions history
   - confirmed preview snapshot
   - final-generation eligibility
3. Add or normalize backend endpoints so preview generation, layout refinement, preview refresh, layout confirmation, and final generation are separate operations with explicit persisted state.
4. Add frontend stage UI for:
   - preview pane
   - layout instruction entry and history
   - preview refresh status
   - confirm-layout action
   - post-confirm final-generation action
5. Carry page-length and generation warnings through preview, layout review, and final validation.
6. Add regression tests for staged generation state transitions in backend, JS, and browser-level workflow coverage.

**Dependencies**

- Existing generation and layout APIs
- Session state persistence
- Review-phase navigation and completion state

**Risks**

- The current frontend may assume generation is single-step in multiple places.
- Preview artifact persistence could drift from final output generation if the shared contract is weak.

### Workstream 2: ATS Scoring and ATS Output Semantics

**Primary gaps:** `GAP-21`, `GAP-22`, `GAP-04`, parts of `GAP-03`, `GAP-10`, `GAP-11`  
**Goal:** Make ATS quality visible during review and consistent in final outputs.

**Tasks**

1. Define a shared ATS scoring contract with:
   - overall score
   - hard-requirement weighting
   - matched/missing/bonus keyword states
   - section and match-type provenance
2. Expose the scoring model in analysis/customization UI and refresh it at reasonable intervals:
   - after analysis completes
   - after batches of review decisions or apply actions
   - after rerun completion for affected stages
   - after layout confirmation and final generation
   - after a short debounce window for score-affecting UI actions, rather than on every keystroke
3. Display the ATS score summary on the same row as `div.position-bar`, aligned to the right edge of the window, while preserving responsive behavior for smaller widths.
4. Persist ATS score details into generation metadata and finalise summaries.
5. Normalize ATS DOCX structure, heading levels, contact formatting, employment-header formatting, and date handling to the reviewed story target.
6. Add hard-vs-soft skill typing in shared skill data and use it consistently in UI review, ATS output, and validation.
7. Expand ATS validation so it runs automatically after final generation and includes the missing checks called out in `GAP-04`.

**Dependencies**

- Stable generation artifact flow from Workstream 1
- Shared skill schema changes
- Validation and metadata persistence paths

**Risks**

- If scoring logic lives in multiple modules, the UI and final metadata will diverge.
- Skill schema changes may affect review tables, generation prompts, validators, and stored metadata.

### Workstream 3: Intake, Clarification Defaults, and Rerun Completeness

**Primary gaps:** `GAP-23`, `GAP-02`, `GAP-18`, `GAP-14`  
**Goal:** Make the app dependable for repeated iterative use instead of only clean first-pass runs.

**Tasks**

1. Insert an intake-confirmation substep after job extraction and before full analysis.
2. Let the user edit extracted company, role, and date values before analysis proceeds.
3. Persist the session immediately after intake confirmation.
4. Define a role-type matching strategy for prior clarification defaults and preload them with explicit override support.
5. Expose rerun affordances on every supported completed stage.
6. Add changed-item highlighting so reruns only force re-review where content actually changed.
7. Complete layout-stage re-entry so the new staged generation flow supports layout-only refinement without restarting unrelated work.

**Dependencies**

- Session metadata persistence
- Stage navigation APIs
- Diffing support for reviewable entities

**Risks**

- Poor diffing granularity could cause too much forced re-review and erase the value of rerun support.
- Clarification default reuse can feel unsafe if the role-type matching rule is opaque.

### Workstream 4: Spell-Check, Publication Persistence, and Output Governance

**Primary gaps:** `GAP-08`, `GAP-24`, parts of `GAP-03`, `GAP-09`, `GAP-13`  
**Goal:** Close important last-mile quality gaps that affect what actually reaches final output.

**Tasks**

1. Make spell-check a blocking review stage until all flagged items are explicitly resolved.
2. Add edit-in-place and skill-name review coverage where the gap analysis says handling is incomplete.
3. Fix the preview/state mismatch so preview generation, layout refresh, and final generation all replay accepted corrections from `state['spell_audit']`.
4. Write accepted spell/grammar corrections back into the generated text spans they govern using stable identifiers and the same canonical spell-audit payload in every generation path.
5. Persist publication review decisions under the required metadata structure.
6. Ensure final outputs omit the publications section when nothing is selected and render the required heading/count/first-author details when items are selected.
7. Add final-output validation for publication rendering and selected publication metadata.

**Tracked bug**

- GitHub issue #49: preview generation ignores persisted spell audit because preview code still reads the legacy `state.spell_check.audit` key while spell-check completion persists to `state.spell_audit`.

**Dependencies**

- Stable generation artifact model
- Output metadata persistence
- Review decision storage

**Risks**

- Write-back logic can silently desynchronize spell audits from generated content if not tied to stable identifiers.
- Publication behavior may differ across HTML preview, PDF, ATS DOCX, and archived metadata if not validated end-to-end.

### Workstream 5: Structured Master CV Editing

**Primary gaps:** `GAP-19`, `GAP-01`  
**Goal:** Deliver a real structured maintenance surface for master data without blocking the main workflow repair.

**Tasks**

1. Define the editable sections and write-back rules for experiences, skills, education, publications, certifications, and personal info.
2. Build a dedicated Master CV mode separate from the job-specific review flow.
3. Add save safeguards: backup before write, clear diff/changed-state display, and validation before persistence.
4. Align the editor with harvest and approved-skill persistence flows so data contracts do not fork.

**Dependencies**

- Shared master-data schema understanding
- Save and backup behavior in `ConversationManager` or related persistence layer

**Risks**

- This area can expand quickly into a second product if the scope is not held to structured editing first.

### Workstream 6: UX, Accessibility, and Review Ergonomics Cleanup

**Primary gaps:** `GAP-06`, `GAP-07`, `GAP-15`, `GAP-16`  
**Goal:** Improve the daily usability of the now-complete workflow.

**Tasks**

1. Add keyboard-friendly sequential rewrite review and preserve diff context while editing.
2. Add row-level reorder controls for experiences, achievements, skills, and publications.
3. Fill `aria-label`, focus-style, and keyboard-operation gaps across icon-only and reorder controls.
4. Reduce shell density, improve long-table behavior, and tune responsive layouts for 1280x800 and smaller widths.
5. Add inline preview/version cues in the places where users compare outputs or re-enter stages.

**Dependencies**

- Core workflow stages must be stable enough to polish without rework.

**Risks**

- Polishing too early will lead to duplicate work if upstream workflow contracts change.

## Recommended Delivery Sequence

### Phase 0: Architecture Audit and Contract Definition — **DONE (2026-03-19)**

- Confirmed current backend and frontend state for generation, ATS scoring, rerun, spell-check, and master-data flows.
- Produced `tasks/contracts/phase0-contract.md` covering staged generation artifacts, ATS score schema, skill typing, and rerun diffing.
- Identified files and tests to be touched by each workstream.

### Final Phase: CI Integration & Full-Stack Test Runs

**Goal:** Ensure full integration tests (backend + UI + persistence + provider‑dependent scenarios) run automatically on main and on a schedule, and that PRs run fast, deterministic suites only.

**Tasks**

1. Create a GitHub task/issue to update CI so the full integration suite runs on `push` to `main` and on a nightly schedule. The task should reference the existing PR-focused workflow file and include the desired triggers: `push` (branch: `main`) and `schedule` (daily at 02:00 UTC).
2. Define which tests run where:
   - PRs: `tests/unit`, lint/type checks, and the HTML harness (`npm run test:integration:headless`).
   - Main/nightly: `tests/integration`, end‑to‑end Playwright tests against a live server, and any provider/credentialed scenarios.
3. Add environment gating and secrets guidance to the task: document required secrets (e.g. `LLM_API_KEY`), and ensure integration jobs skip or `pytest.skip(...)` when creds are absent.
4. Implement the workflow changes (or link to the workflow PR) and add a job that starts the web app (`conda` env + `python scripts/web_app.py --llm-provider github`) in the integration runner before running full tests.
5. Add a lightweight monitoring step to report failed test artifacts (logs, pytest xml, playwright trace/video) into the Actions run for debugging.
6. Assign an owner and estimate effort: owner `@team` (or repo maintainer), effort `1-2 days` to get a stable run, `3-5 days` to harden across providers.

**Risks & Notes**

- Running provider-dependent tests in CI increases cost and flakiness; prefer using recorded/replay fixtures or mocking where feasible.
- Ensure database/file backups and safe write paths are used in CI to avoid destroying real user data.
- Use the staged approach: land PR-focused workflow first (already present), then implement the `main`/`schedule` expansion tracked by this GitHub task.


### Phase 1: Staged Generation Slice — **COMPLETE (2026-03-19)**

Phase 1 deliverables status:
- [x] Backend endpoints: `/api/cv/generate-preview`, `/api/cv/layout-refine`, `/api/cv/confirm-layout`, `/api/cv/generate-final`, `/api/cv/generation-state` — implemented in `scripts/web_app.py`
- [x] `CVOrchestrator.render_html_preview()` and `generate_final_from_confirmed_html()` — implemented in `scripts/utils/cv_orchestrator.py`
- [x] `generation_state` added to `ConversationManager` state dict and `load_session` backward-compat guards
- [x] `app.session_registry` exposed on Flask app object for test isolation
- [x] Bug fix: `Path("").is_dir()` fallback resolves to cwd — fixed with non-empty string guard
- [x] Regression tests: 26 tests in `tests/test_staged_generation.py` covering all endpoints, guards, happy paths, and session persistence
- [x] Frontend staged generation UI: `layout-instruction.js` has preview pane, instruction loop, confirm button — all wired to new endpoints with legacy fallback
- [x] `completeLayoutReview()` now calls `/api/cv/generate-final` after confirming layout; updates `tabData.cv` with final outputs and refreshes ATS badge
- [x] Generation state synced from backend on session restore: `restoreBackendState()` in `state-manager.js` now calls `/api/cv/generation-state` after restoring other session data

### Phase 1: Staged Generation Slice

- Implement Workstream 1 first.
- Goal: unblock the broken `preview -> layout -> final` applicant path.
- Exit criteria: source-verified UI flow exists and is covered by backend and frontend regression tests.

### Phase 2: ATS Slice — **COMPLETE (2026-03-19)**

Phase 2 deliverables status:
- [x] `scoring.py`: `_match_status()` tri-state (matched/partial/missing); `match_type` absent for missing keywords, `"exact"` or `"partial"` otherwise; education items extracted from `customizations.education` and fed into `section_matches["education"]`
- [x] `cv_orchestrator.py`: ATS DOCX name paragraph uses `Heading 1` style; `_setup_ats_styles()` configures Heading 1 (16pt, bold, black) fixing the `docx_heading1_present` validation warning
- [x] `app.js`: 3 missing ATS refresh triggers added — after `submitRewriteDecisions`, after `submitSpellCheckDecisions`, and after `generate_cv` completes
- [x] `app.js`: Hard/Soft skill-type badges added to skills review table using `tabData.analysis.required_skills` and `tabData.analysis.nice_to_have_skills`
- [x] Regression tests: 8 new tests in `tests/test_scoring.py` covering tri-state matching, missing keyword `match_type` contract, education section feed, and edge cases; new Heading 1 test in `tests/test_ats_generation.py`
- [x] JS tests: 118/118 pass; Python tests: 73/73 pass for scoring and ATS generation suites

### Phase 2: ATS Slice

- Implement Workstream 2 next.
- Goal: make ATS decisions visible before finalisation and align output semantics with stories.
- Exit criteria: one shared ATS score is visible during review, refreshed at reasonable checkpoints, rendered in the `div.position-bar` row, and preserved in generated metadata and final summaries.

### Phase 3: Iteration and Intake Slice — **COMPLETE (2026-03-19)**

Phase 3 deliverables status:
- [x] Intake confirmation substep after job extraction — implemented in `scripts/web_app.py` (`intake_metadata`, `confirm_intake`)
- [x] Prior clarification defaults with role-type matching and explicit override — implemented in `scripts/web_app.py` (`prior_clarifications`)
- [x] Session persisted immediately after intake confirmation
- [x] Spell-check and generate re-run affordances exposed

### Phase 4: Quality-Gate Slice — **PARTIALLY COMPLETE (2026-03-23 reassessment)**

Phase 4 deliverables status:
- [x] Spell-check blocking guard — requires explicit resolution before proceeding
- [x] Publication decisions persistence — decisions stored in session and respected by final output
- [ ] End-to-end spell-check write-back consistency — preview generation still reads a legacy spell-audit state key; tracked in GitHub issue #49
- [ ] Preview/layout/final spell-audit contract regression coverage

### Phase 5: Master Data Editing Slice — **COMPLETE (2026-03-21)**

- Implement Workstream 5.
- Goal: provide structured master-data maintenance once the main applicant workflow is stable.

Phase 5 deliverables status:
- [x] Backup-before-write safeguard for `Master_CV_Data.json`
- [x] Pre-save structural validation for master-data writes
- [x] Clear changed-state display in the Master CV editor after save/delete actions
- [x] `scripts/utils/master_data_validator.py` — `ValidationResult` dataclass + `validate_master_data()` / `validate_master_data_file()` helpers
- [x] `schemas/master_cv_data.schema.json` — JSON Schema 2020-12 for master data (experience, skills, education, awards, personal_info)
- [x] `MASTER_CV_DATA_SPECIFICATION.md` — human-readable field reference
- [x] `scripts/validate_master_data.py` — CLI wrapper, exit 0/1
- [x] Pre-load validation in `CVOrchestrator._load_master_data()` and `generate_cv.load_master_data()`
- [x] `GET /api/master-data/validate` endpoint
- [x] `POST /api/master-data/preview-diff` endpoint (read-only before/after diff for personal_info and skill sections)
- [x] 53 Python tests (TestMasterDataPreviewDiff 17, TestValidateMasterData 12, TestMasterDataValidateEndpoint 3, TestMasterDataOverview 5, + existing)

### Phase 6: UX and Accessibility Hardening — **COMPLETE (2026-03-20)**

Phase 6 deliverables status:
- [x] Row-level reorder controls for review tables implemented in the split frontend modules (experience, achievements, skills, publications)
- [x] Icon-only review actions now include `aria-label` coverage in active review surfaces
- [x] Review-table rendering hardened around explicit re-render helpers and ordering state persistence
- [x] Layout review usability improved with persisted base-font-size control and immediate preview re-render loop

- Implement Workstream 6.
- Goal: reduce friction and finish keyboard/responsive coverage after the core flows stop moving.

### Refactor Timing

- Do not execute the full refactor program before Phase 1.
- Use targeted refactoring only where it directly enables:
  - staged generation contract work
  - ATS score calculation and header-row display
  - rerun/highlighting state ownership
- Revisit the broader refactor candidates after Phase 1 and again after Phase 2, when the new workflow and ATS contracts are stable enough to split safely.
- Treat `web/layout-instruction.js`, `web/ui-core.js`, and `web/state-manager.js` cleanup as follow-on work unless a narrow extraction is needed to land the staged-generation slice.

## Task Breakdown With Dependencies

| ID | Task | Depends on | Effort | Risk |
|---|---|---|---|---|
| T1 | Audit current generation/layout contract | none | M | M |
| T2 | Define persisted preview and layout state model | T1 | M | H |
| T3 | Split backend generation into preview, layout refine, confirm, final | T2 | L | H |
| T4 | Build frontend staged generation UI | T3 | L | H |
| T5 | Add generation state regression tests | T3, T4 | M | M |
| T6 | Define shared ATS score and keyword-status schema | T1 | M | H |
| T7 | Implement ATS score recalculation and UI surfacing | T6 | L | H |
| T8 | Normalize ATS output structure and skill typing | T6 | L | H |
| T9 | Auto-run ATS validation after final generation | T3, T8 | M | M |
| T10 | Add intake confirmation and metadata persistence | T1 | M | M |
| T11 | Add clarification-default preload logic | T10 | M | M |
| T12 | Expose rerun affordances and changed-item highlighting | T3, T10 | L | H |
| T13 | Normalize spell-audit state across preview and final generation, then complete spell-check write-back | T3 | L | H |
| T14 | Persist publication decisions through final outputs | T3 | M | M |
| T15 | Build structured Master CV editor | T1 | XL | M |
| T16 | Improve rewrite ergonomics, reorder UI, and accessibility | T4, T12 | L | M |

## Validation Strategy

- Add backend tests for staged generation transitions, ATS metadata persistence, rerun state, spell-check write-back, and publication rendering rules.
- Add JS tests for new state-management helpers, ATS score display logic and refresh cadence, rerun highlighting, and accessibility-sensitive controls.
- Add UI coverage that the ATS score remains visible in the `div.position-bar` row and degrades cleanly on narrower layouts.
- Add browser-level workflow coverage for:
  - intake confirmation
  - staged generation
  - layout refinement loop
  - rerun from completed stages
  - spell-check completion gating
  - publication omission and rendering behavior
- Re-run the source-verification review slices after each major phase instead of waiting for the end.

## Suggested First Slice

Start with a thin vertical slice that closes the highest-leverage blocker:

1. Define persisted preview/layout state.
2. Split the generation API into preview, layout refresh, confirm, and final.
3. Add a minimal frontend preview pane plus layout instruction loop.
4. Add one browser test that proves `generate preview -> revise layout -> confirm -> final generate`.

This slice should make `GAP-20` materially smaller while setting up the contracts needed by ATS validation, rerun completeness, and final-output governance.

## Open Questions

- Should the confirmed HTML preview become the canonical source for both PDF and ATS DOCX generation, or only for PDF/layout-sensitive outputs?
- How much of the Master CV editor should be delivered before NL-driven update and document-ingestion work are tackled?
- Is Google Drive sync still in scope for the near-term finalise slice, or should it remain deferred while the core workflow is repaired?

## Recommendation

Approve Phase 0 and Phase 1 immediately, using only enabling refactors during those slices, then revisit the broader refactor backlog after the staged generation slice lands. That keeps the team focused on the broken applicant workflow first while preserving the option to narrow or expand later structural work based on what the new generation contract exposes.
