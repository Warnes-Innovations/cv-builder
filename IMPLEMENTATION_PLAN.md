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
| 16.2 | Clarify governance boundary in the UI between session-only edits and durable master-data edits | Open | `web/master-cv.js`, `web/finalise.js`, `web/index.html` | The product still needs clearer user guidance about when a change affects `Master_CV_Data.json` or `publications.bib`. |
| 16.3 | Decide whether to keep the current single-tab surface or refactor to a dedicated sub-tabbed editor shell | Open | `web/master-cv.js`, `web/styles.css` | Existing sections work, but the GAP-19 target expects a more structured, scalable editing mode. |

### 16.2 History, Restore, And Undo/Redo

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.4 | Add a server-side history listing endpoint for master-data and publication backups | Open | `scripts/routes/master_data_routes.py`, publication routes | No user-facing history browser exists yet. |
| 16.5 | Add restore endpoints for named backup snapshots | Open | `scripts/routes/master_data_routes.py`, publication routes | Current backup creation exists, but restore remains manual or offline. |
| 16.6 | Add backup pruning rules and config support | Open | `scripts/utils/config.py`, shared history helper | Backups exist, but retention policy and pruning are not implemented. |
| 16.7 | Add explicit undo/redo UI backed by snapshot history | Open | `web/master-cv.js`, `web/styles.css` | The planned split-button history UX does not exist yet. |
| 16.8 | Add scoped keyboard shortcuts for editor-level undo/redo behavior | Open | `web/master-cv.js` | No story-complete keyboard or history model exists yet. |

### 16.3 Story-Complete Structured Editing

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.9 | Normalize section coverage against GAP-19 requirements | Open | `web/master-cv.js`, `scripts/routes/master_data_routes.py` | Current coverage is strong but still uneven across all required master-data sections. |
| 16.10 | Add first-class certifications editing if certifications remain distinct from awards in the contract | Open | `web/master-cv.js`, routes, schema/spec if required | Current editor covers awards; GAP-19 still calls out certifications explicitly. |
| 16.11 | Review and, if needed, enrich experience editing for nested bullets, ordering, and inline record workflows | Open | `web/master-cv.js` | Basic experience editing exists; verify and close any remaining GAP-19 ergonomics gaps. |
| 16.12 | Review and, if needed, enrich skills editing for aliases, proficiency, and tagging semantics | Open | `web/master-cv.js`, schema/spec if required | Existing skill editing may not yet satisfy the richer structured-editor target. |
| 16.13 | Review and, if needed, enrich publications editing UX across structured, raw, and import modes | Open | `web/master-cv.js`, publication routes | Backend exists; the story-complete curation and review UX still needs consolidation. |

### 16.4 Import, Export, Preview, And Review Flow

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.14 | Add explicit export action for current master data | Open | `web/master-cv.js`, routes if needed | No dedicated export or download action is tracked as complete. |
| 16.15 | Add full unfiltered preview mode for master data | Open | `web/master-cv.js`, render/generation helpers | Preview-diff exists; a full master-data preview workflow does not. |
| 16.16 | Add structured import flow for native JSON with diff review | Open | routes plus frontend modal | Preview-diff exists for limited edits, not for full-file import review. |
| 16.17 | Decide whether broader document-ingestion import remains in Phase 16 or is deferred to a later ingestion-focused workstream | Open | spec and plan only until implemented | Earlier GAP-19 planning discussed this explicitly; current implementation still does not provide the full ingestion workflow. |

### 16.5 Validation And Regression Coverage

| # | Step | Status | Files | Notes |
| --- | --- | --- | --- | --- |
| 16.18 | Add dedicated tests for history listing, restore, and pruning | Open | new or expanded backend tests | Existing tests cover CRUD and validation, not snapshot lifecycle. |
| 16.19 | Add focused UI smoke coverage for the Master CV editor workflow | Open | new UI tests | The current surface needs explicit story-level UI coverage, not only route-level assertions. |
| 16.20 | Reconcile GAP-19 status across plan, gaps, and review docs once the remaining work lands | Open | docs | Documentation still correctly calls GAP-19 open; update only after implementation closes the gap. |

## Design Constraints

The remaining Phase 16 work must preserve these repository rules:

- Master-data writes are allowed only in the dedicated master-data management surface and explicit finalise-harvest flows.
- Session-only customization must not silently write to `Master_CV_Data.json` or `publications.bib`.
- Existing validation, backup-before-write, and schema/spec synchronization rules must remain intact.
- If the master-data contract changes, update `MASTER_CV_DATA_SPECIFICATION.md`, `scripts/utils/master_data_validator.py`, and `schemas/master_cv_data.schema.json` together.

## Validation Notes

- This rewrite intentionally removes fully completed historical phases from the active plan file.
- It does not claim GAP-19 is complete.
- It reclassifies already-shipped Master CV CRUD and validation work as delivered foundation, then leaves only the real remaining Phase 16 backlog in scope.
