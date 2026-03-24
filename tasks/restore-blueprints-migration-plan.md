<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Restore Blueprints Migration Plan

**Last Updated:** 2026-03-24 12:25 EDT

**Executive Summary:** This document captures the concrete migration plan for restoring the extracted Flask blueprint route architecture in `cv-builder`. The current route modules are close to parity with the live inline handlers, but the cutover still needs dependency-contract cleanup, publication-route backfill, and a single-step registration/removal pass to avoid duplicate live handlers.

## Contents

- [Purpose](#purpose)
- [Current Architecture Summary](#current-architecture-summary)
- [Dependency Contract Gaps](#dependency-contract-gaps)
- [Endpoint Parity Gaps](#endpoint-parity-gaps)
- [Concrete Migration Diff Plan](#concrete-migration-diff-plan)
- [Registration Order](#registration-order)
- [Cutover Risks](#cutover-risks)
- [Validation Plan](#validation-plan)

## Purpose

This plan defines the exact implementation steps required to restore the blueprint-based route architecture that previously existed in the repository history.

The intended end state is:

1. `scripts/web_app.py` owns app startup, dependency wiring, helper definitions, and blueprint registration.
2. `scripts/routes/*.py` own the HTTP route handlers.
3. Duplicate inline route handlers are removed in the same cutover change.

## Current Architecture Summary

The current live application still serves routes from inline handlers in `scripts/web_app.py`.

The extracted blueprints under `scripts/routes/` are currently inactive, but they are not dead code. Repository history shows that commit `6e249fd` already wired these blueprints into `create_app()`, so the main task is restoring and updating that wiring rather than inventing a new route split.

The current route modules are already close to endpoint parity with the inline app. The main remaining work is contract cleanup and migration sequencing.

## Dependency Contract Gaps

The current route modules consume the following dependency keys:

```python
deps = {
    "get_session": _get_session,
    "validate_owner": _validate_owner,
    "session_registry": session_registry,
    "app_config": _app_config,
    "auth_manager": auth_manager,
    "provider_name_ref": provider_name_ref,
    "current_model_ref": current_model_ref,
    "llm_client_ref": llm_client_ref,
    "dynamic_model_cache": _dynamic_model_cache,
    "dynamic_model_cache_lock": _dynamic_model_cache_lock,
    "catalog_list_models_capable": _CATALOG_LIST_MODELS_CAPABLE,
    "catalog_discover_provider_models": _catalog_discover_provider_models,
    "get_available_models": _get_available_models,
    "infer_position_name": _infer_position_name,
    "coerce_to_dict": _coerce_to_dict,
    "extract_json_payload": _extract_json_payload,
    "fallback_post_analysis_questions": _fallback_post_analysis_questions,
    "generate_post_analysis_questions": _generate_post_analysis_questions,
    "load_master": _load_master,
    "save_master": _save_master,
    "validate_master_data_file": validate_master_data_file,
    "validate_ats_report": validate_ats_report,
    "StatusResponse": StatusResponse,
    "SessionItem": SessionItem,
    "SessionListResponse": SessionListResponse,
    "RewritesResponse": RewritesResponse,
    "MessageResponse": MessageResponse,
    "ActionResponse": ActionResponse,
    "Phase": Phase,
    "preload_session_id": _preload_session_id,
}
```

The exact drift from the historical blueprint wiring is:

1. The historical blueprint bundle used callable accessors like `provider_name`, `current_model`, and `llm_client_ref=lambda: llm_client`, but the current route modules expect mutable reference dictionaries such as `{"value": client}`.
2. The auth blueprint now depends on live catalog helpers and caches that were not fully represented in the old `deps` map.
3. The status blueprint depends on helper functions for post-analysis fallback and LLM-driven question generation that still live privately inside `scripts/web_app.py`.
4. The review blueprint depends on `Phase`, `validate_ats_report`, `load_master`, and `llm_client_ref`.
5. The job blueprint depends on `infer_position_name`, `MessageResponse`, and `ActionResponse`.
6. The static blueprint expects `preload_session_id` as a direct value.

### `llm_client_ref` Contract Mismatch

There is one concrete contract inconsistency inside the route package itself.

These modules treat `llm_client_ref` as a mutable dict:

1. `scripts/routes/auth_routes.py`
2. `scripts/routes/status_routes.py`
3. `scripts/routes/review_routes.py`

But `scripts/routes/master_data_routes.py` still treats it as a callable.

That needs to be normalized before cutover so all route modules read the same dependency shape.

## Endpoint Parity Gaps

The extracted blueprints already cover nearly all live inline routes.

The current gaps are the publication-focused master-data endpoints that still exist only in `scripts/web_app.py`:

1. `GET /api/master-data/publications`
2. `PUT /api/master-data/publications`
3. `POST /api/master-data/publications/validate`
4. `POST /api/master-data/publication`
5. `POST /api/master-data/publications/import`
6. `POST /api/master-data/publications/convert`

These must be ported into `scripts/routes/master_data_routes.py` before the inline handlers are removed.

## Concrete Migration Diff Plan

### Step 1: Normalize `master_data_routes` to the current dependency contract

Patch `scripts/routes/master_data_routes.py` to stop calling `llm_client_ref()` and instead use `llm_client_ref["value"]` consistently.

This removes the last mixed reference semantic inside the blueprint layer.

### Step 2: Port the publication endpoints into the blueprint layer

Move the publication CRUD, validation, import, raw-save, and convert endpoints from `scripts/web_app.py` into `scripts/routes/master_data_routes.py`.

Requirements for this step:

1. Preserve the current backup-before-write and parse-before-write safety contract for raw BibTeX saves.
2. Preserve the existing use of `parse_bibtex_file`, `serialize_publications_to_bibtex`, `bibtex_text_to_publications`, and `format_publication`.
3. Keep master-data writes constrained to the explicit master-management flows already allowed by repo instructions.

### Step 3: Build mutable provider and model references in `create_app()`

In `scripts/web_app.py`, introduce shared mutable refs near the current provider/model/client initialization:

```python
provider_name_ref = {"value": _provider_name}
current_model_ref = {"value": _current_model}
llm_client_ref    = {"value": llm_client}
```

These references should become the canonical blueprint-facing contract.

### Step 4: Update model switching to mutate refs instead of rebinding locals

Patch the current `/api/model` handler logic so provider, model, and client updates mutate the reference dictionaries rather than only rebinding local variables.

That update must also continue to propagate the chosen client to all active sessions.

### Step 5: Restore the `deps` map in `create_app()`

After the local helper definitions and preload-session setup, add a single `deps` bundle containing the current helper set and the mutable refs consumed by the route modules.

This should be the only dependency contract used to construct the blueprints.

### Step 6: Restore blueprint imports and registration

In `scripts/web_app.py`, import and register these blueprint factories:

1. `routes.session_routes.create_blueprint`
2. `routes.status_routes.create_blueprint`
3. `routes.job_routes.create_blueprint`
4. `routes.review_routes.create_blueprint`
5. `routes.generation_routes.create_blueprint`
6. `routes.auth_routes.create_blueprint`
7. `routes.master_data_routes.create_blueprint`
8. `routes.static_routes.create_blueprint`

### Step 7: Remove duplicate inline route handlers in the same cutover diff

Do not leave both inline handlers and blueprint handlers active for the same URLs.

Once the blueprint registration block is active and endpoint parity is complete, remove the duplicated inline route bodies from `scripts/web_app.py` in the same change.

That is important for three reasons:

1. It avoids ambiguous routing ownership.
2. It prevents route drift from immediately starting again.
3. It makes failures attributable to one implementation path.

## Registration Order

The safest registration order is:

1. session
2. status
3. job
4. review
5. generation
6. auth
7. master data
8. static

`static` should be registered last because it includes a catch-all `/<path:filename>` route.

## Cutover Risks

The main cutover risks are:

1. Mixed `llm_client_ref` semantics across route modules.
2. Missing publication endpoints in the blueprint layer.
3. Silent drift in mutable provider/model/client state if model switching still rebinds locals instead of mutating shared refs.
4. Duplicate handler registration if inline routes are not removed in the same cutover.
5. Regressions in session ownership or session ID enforcement if helper wiring is incomplete.

## Validation Plan

After the blueprint cutover, run the following checks before any additional feature work:

1. Route smoke checks for `/`, `/api/status`, `/api/model`, `/api/sessions/new`, and the publication CRUD endpoints.
2. Targeted backend regression tests around session ownership, staged generation, and restore behavior.
3. Targeted frontend regression tests around analysis, intake confirmation, and session restore where route behavior is user-visible.
4. Manual browser verification that the app still loads and the major workflow entry points respond with the expected JSON contracts.

## Recommended Follow-On Order

Once the blueprint cutover passes validation, the next implementation target should be the issue #54 workflow fix:

1. move intake confirmation after analysis
2. fix session metadata and folder rename propagation on confirmed intake changes
3. run the focused regression slice
4. update the active OBO item with the implementation result
