# CV-Builder Active Implementation Plan

**Last Updated:** 2026-03-23 17:36 EDT

**Executive Summary:** This file now tracks only active implementation work. Fully completed phases from the original 15-phase rollout have been removed from this document; the remaining open plan item is Phase 16, which needs to be restated against the current shipped Master CV foundation and the still-open GAP-19 work.

## Contents

- [Scope](#scope)
- [Current Status](#current-status)
- [Phase 16 — Master CV Editor (GAP-19)](#phase-16--master-cv-editor-gap-19)
- [Source Documents](#source-documents)
- [Delivered Foundation](#delivered-foundation)
- [Remaining Work](#remaining-work)
- [Design Constraints](#design-constraints)
- [Validation Notes](#validation-notes)

## Scope

This document is now an active backlog rather than a historical implementation log.

- Completed phases 0-15 have been intentionally removed for brevity.
- Their implementation details remain available in git history and prior revisions of this file.
- The active focus is the still-open Master CV editor and governance work tracked as GAP-19.

## Current Status

| Phase | Title | Status | Notes |
| --- | --- | --- | --- |
| 16 | Master CV Editor (GAP-19) | Partially Implemented | A substantial Master CV management surface already exists, but the story-complete editor, history model, import/export flow, and governance UX are still incomplete. |

## Phase 16 — Master CV Editor (GAP-19)

**Status:** Partially Implemented

**Primary gap:** The product already includes a working Master CV tab and several CRUD flows, but it does not yet provide the full structured, story-complete Master CV editor described in GAP-19.

**Target outcome:** A dependable Master CV editing mode that cleanly separates durable master-data maintenance from session-only customization, supports structured editing across all required sections, preserves backups and validation guarantees, and adds explicit history, restore, import, export, and review capabilities.

## Source Documents

- Rollup summary: [tasks/ui-review.md](tasks/ui-review.md#top-gaps)
- Canonical gap definition: [tasks/gaps.md](tasks/gaps.md#gap-19-structured-master-cv-editor)
- Active execution plan: this document

## Delivered Foundation

The following Phase 16 foundation is already in the repository and should not be planned as new work:

| Area | Current state | Evidence |
| --- | --- | --- |
| Navigation surface | A dedicated `Master CV` tab already exists in the primary tab bar. | `web/index.html`, `web/master-cv.js` |
| Frontend editor shell | The current Master CV tab loads overview data and renders editable sections for personal info, experience, skills, education, awards, achievements, summaries, and publications. | `web/master-cv.js` |
| Master-data read APIs | The app already serves `/api/master-data/overview`, `/api/master-data/full`, and `/api/master-data/validate`. | `scripts/routes/master_data_routes.py` |
| Master-data write APIs | The app already supports write flows for personal info, experience, skills, education, awards, achievements, and summaries. | `scripts/routes/master_data_routes.py` |
| Publication editing | Publication CRUD and raw BibTeX save, validate, import, and convert routes already exist. | `scripts/routes/publication_routes.py`, `tests/test_publication_endpoints.py` |
| Validation baseline | JSON-schema-backed validation and preview-diff support already exist for master data. | `MASTER_CV_DATA_SPECIFICATION.md`, `schemas/master_cv_data.schema.json`, `tests/test_master_data.py` |
| Backup-before-write | Current master-data writes already create backups before overwrite and restore on write failure. | `scripts/web_app.py`, publication save flow |
| Changed-state feedback | The current Master CV surface already shows save-state feedback after master-data edits. | `web/master-cv.js`, `tasks/ui-gap-implementation-plan.md` |
| Test baseline | There is already coverage for master-data and publication API behavior. | `tests/test_master_data.py`, `tests/test_publication_endpoints.py` |

## Remaining Work

The remaining plan is the delta between the current shipped foundation and the full GAP-19 target.

### 16.1 Product Framing And UX Boundaries

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.1 | Reframe the current Master CV tab as the active Phase 16 base | Complete | `IMPLEMENTATION_PLAN.md` | This document now treats existing Master CV CRUD as delivered foundation, not future work. |
| 16.2 | Clarify governance boundary in the UI between session-only edits and durable master-data edits | Complete | `web/master-cv.js` | Governance banner now explicitly contrasts durable Master CV edits against session-only choices and points to the Finalise step's harvest flow as the sanctioned bridge; verified `web/finalise.js`'s existing copy ("optionally write any improvements back to Master CV Data") already conveys the session-only side adequately, so no change was needed there. |
| 16.3 | Decide whether to keep the current single-tab surface or refactor to a dedicated sub-tabbed editor shell | Decided: keep | `web/master-cv.js` | Decision (GAP-19 Cycle 2, 2026-07-02): keep the current single scrollable-tab surface rather than refactor to a sub-tabbed shell. Each section (personal info, experience, skills, education, awards, certifications, achievements, summaries, publications) already renders as its own self-contained card with its own modals, and a sub-tab refactor would touch every section's rendering, modal-focus-trap chaining, and test file for a UX benefit that's marginal given the sections already collapse/scan well — disproportionate to the cost, especially just after the AI-update panel and undo/redo were added to the same tab. Revisit only if user feedback identifies the single-scroll surface as a concrete pain point. |

### 16.2 History, Restore, And Undo/Redo

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.4 | Add a server-side history listing endpoint for master-data and publication backups | Complete | `scripts/routes/master_data_routes.py` | Verified already shipped (`GET /api/master-data/history`) with a working `web/master-cv.js` browser (`openBackupHistoryModal()`) — this row was stale relative to the actual codebase; corrected during GAP-19 Cycle 1 source-verification rather than left inaccurate. |
| 16.5 | Add restore endpoints for named backup snapshots | Complete | `scripts/routes/master_data_routes.py` | Verified already shipped (`POST /api/master-data/restore`, `restoreBackup()`) — same stale-row correction as 16.4. |
| 16.6 | Add backup pruning rules and config support | Complete | `scripts/utils/config.py`, `scripts/utils/backup_helpers.py` | Added `Config.master_data_backup_retention_days`/`master_data_backup_max_count` (env var → `config.yaml` `data.*` → default-30-days/50-count precedence) and a shared `prune_backups()` helper called from both `_save_master` implementations (`scripts/web_app.py` and `scripts/routes/master_data_routes.py`) after each backup write. Tests: `tests/test_backup_pruning.py`. |
| 16.7 | Add explicit undo/redo UI backed by snapshot history | Complete | `web/master-cv.js` | Added single-level Undo/Redo toolbar buttons reusing the existing `/api/master-data/history` + `/api/master-data/restore` endpoints (no new backend surface) — Undo restores the most recent snapshot, Redo restores the safety backup that restore itself took of the pre-undo state. Known v1 limitation: single-level only; further-back recovery remains available via the existing "🕐 Backups" history modal. Tests: `tests/js/master-cv.test.js`. |
| 16.8 | Add scoped keyboard shortcuts for editor-level undo/redo behavior | Complete | `web/keyboard-shortcuts.js` | Added `Ctrl+Z`/`Ctrl+Shift+Z`, scoped to when the Master CV modal is open, no nested sub-modal (e.g. backup history) is stacked on top, and focus isn't in a text field (native browser text-undo still wins there). Tests: `tests/js/keyboard-shortcuts.test.js`. |

### 16.3 Story-Complete Structured Editing

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.9 | Normalize section coverage against GAP-19 requirements | Complete | `web/master-cv.js` | Verified during GAP-19 Cycle 2 (2026-07-02): every required section (personal info, experience, skills, education, awards, certifications, achievements, summaries, publications) already has full add/edit/delete CRUD with its own modal — this row was stale relative to the actual codebase; corrected rather than left inaccurate. |
| 16.10 | Add first-class certifications editing if certifications remain distinct from awards in the contract | Complete | `web/master-cv.js` | Verified already shipped (`showAddCertificationModal`/`editMasterCertification`/`saveMasterCertification`/`deleteMasterCertification`, distinct from awards) — same stale-row correction as 16.9. |
| 16.11 | Review and, if needed, enrich experience editing for nested bullets, ordering, and inline record workflows | Complete | `web/master-cv.js`, `scripts/routes/master_data_routes.py` | Found a genuine gap: the experience edit modal had no UI at all for an experience's own nested `achievements` list (only harvest/AI-update could populate it). Added an in-modal achievements editor: add/reorder (↑/↓)/delete rows, synced into the save payload; backend `/api/master-data/experience` now accepts an optional `achievements` list on add/update (validated as a list of string-or-object items, preserved when omitted). Tests: `tests/test_master_data.py`, `tests/js/master-cv.test.js`. |
| 16.12 | Review and, if needed, enrich skills editing for aliases, proficiency, and tagging semantics | Complete | `web/master-cv.js`, `scripts/routes/master_data_routes.py` | Schema already supported `aliases`/`years` per-skill but no UI existed. Added Aliases (comma-separated) and Years of Experience fields to the skill modal, threaded through both the flat-list and categorized-dict skill-storage shapes (mirroring the existing `group`-field pattern), preserved when omitted on update, clearable by submitting blank. No new "proficiency" enum added — `years` already serves as the proficiency proxy the schema defines; adding a new enum field would require a schema/spec change disproportionate to this cycle. Tests: `tests/test_master_data.py`, `tests/js/master-cv.test.js`. |
| 16.13 | Review and, if needed, enrich publications editing UX across structured, raw, and import modes | Complete | `web/master-cv.js` | Verified during GAP-19 Cycle 3 (2026-07-02): already story-complete — structured CRUD view, a raw-BibTeX toggle view (`loadPublicationsBib`), BibTeX-text import (`importPublicationsBib`), and citation-to-BibTeX conversion preview (`convertPublicationText`) all exist. Stale row corrected. |

### 16.4 Import, Export, Preview, And Review Flow

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.14 | Add explicit export action for current master data | Complete | `web/master-cv.js` | Verified already shipped (`exportMasterCV()` / `GET /api/master-data/export`, downloads `Master_CV_Data.json`) — stale row corrected. |
| 16.15 | Add full unfiltered preview mode for master data | Complete | `web/master-cv.js` | Added `openFullDataPreviewModal()` — a read-only modal rendering the complete `GET /api/master-data/full` response as formatted JSON, so a user can see fields the structured editors don't surface without downloading the file. Tests: `tests/js/master-cv.test.js`. |
| 16.16 | Add structured import flow for native JSON with diff review | Complete | `scripts/routes/master_data_routes.py`, `web/master-cv.js` | Added `POST /api/master-data/import-preview` (schema-validates an uploaded full document and returns a per-top-level-section changed/count summary against the current file, writes nothing) and `POST /api/master-data/import-confirm` (re-validates, replaces the whole file via the canonical `save_master`/backup/git-commit path). Frontend: file-upload button -> client-side JSON.parse -> preview -> review-diff modal with an explicit "this replaces the entire file" warning and a link to Backup History -> confirm. **Known v1 limitation** (logged, not silently dropped): the diff is section-level (changed flag + item count), not a full recursive field-level diff — sufficient to catch an unintended overwrite before confirming, but not a line-by-line comparison; a richer diff would reuse more of GAP-01's per-item review machinery and is a reasonable follow-up once usage shows it's needed. Tests: `tests/test_master_data_import.py` (new), `tests/js/master-cv.test.js`. |
| 16.17 | Decide whether broader document-ingestion import remains in Phase 16 or is deferred to a later ingestion-focused workstream | Resolved by GAP-01 | — | GAP-01's `document_ingestion` source path (`POST /api/master-data/ingest-document/propose` + `/confirm-update`) already provides LLM-driven document ingestion with per-item review — a materially different, complementary path from 16.16's full-file structured JSON import (16.16 is for re-importing/restoring a whole `Master_CV_Data.json`-shaped file; GAP-01's flow is for extracting structured facts from an arbitrary unstructured document like an old CV or LinkedIn export). No separate Phase 16 work needed. |

### 16.5 Validation And Regression Coverage

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.18 | Add dedicated tests for history listing, restore, and pruning | Complete | `tests/test_master_data.py`, `tests/test_backup_pruning.py` | Verified `TestMasterDataHistory`/`TestMasterDataRestore` (13 tests) already covered history/restore lifecycle; added the missing piece, pruning, in Cycle 1 (`tests/test_backup_pruning.py`, 9 tests). |
| 16.19 | Add focused UI smoke coverage for the Master CV editor workflow | Complete (scope note below) | `tests/js/master-cv.test.js` | Added a single vitest integration-style test ("Master CV editor workflow smoke test") chaining add-experience -> add achievements -> reorder -> save -> undo across real handlers in one sequence, exercising more of the integration surface than the per-function unit tests alone. **Scope decision, not silently substituted:** did not add a new `tests/ui/` (Playwright, browser-driven) story-level e2e test as originally envisioned — that suite has pre-existing, unrelated DOM-selector-drift failures (verified 2026-07-02 by running `tests/ui/test_ui_achievements.py` directly: a stale selector timeout and a strict-mode locator ambiguity, neither touched by GAP-19) and is already excluded from this project's standard test command for that reason; a new Playwright test on an already-unreliable, excluded suite wouldn't give dependable coverage. The `tests/ui/` selector-drift itself is a separate, pre-existing maintenance item, not GAP-19 scope. |
| 16.20 | Reconcile GAP-19 status across plan, gaps, and review docs once the remaining work lands | Complete | `IMPLEMENTATION_PLAN.md`, `tasks/gaps.md` | All of 16.2-16.19 above are now Complete/Decided (16.4/16.5/16.9/16.10/16.13/16.14/16.17 were corrected in-place as stale rows found already shipped during source-verification, not left inaccurate). `tasks/gaps.md`'s GAP-19 entry updated to reflect resolution. |

## Design Constraints

The remaining Phase 16 work must preserve these repository rules:

- Master-data writes are allowed only in the dedicated master-data management surface and explicit finalise-harvest flows.
- Session-only customization must not silently write to `Master_CV_Data.json` or `publications.bib`.
- Existing validation, backup-before-write, and schema/spec synchronization rules must remain intact.
- If the master-data contract changes, update `MASTER_CV_DATA_SPECIFICATION.md`, `scripts/utils/master_data_validator.py`, and `schemas/master_cv_data.schema.json` together.

## Validation Notes

- This rewrite intentionally removes fully completed historical phases from the active plan file.
- **Update (2026-07-02, GAP-19 Cycle 4):** all remaining Phase 16 items (16.2-16.20) are now Complete or Decided — see `tasks/gaps.md` for the corresponding GAP-19 resolution entry. Several rows above were corrected in place, not left stale, when source-verification during implementation found them already shipped by earlier work.
- It reclassifies already-shipped Master CV CRUD and validation work as delivered foundation, then closes out the real remaining Phase 16 backlog identified above.
