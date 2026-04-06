**Last Updated:** 2026-04-01 14:05 EDT

**Executive Summary:** This plan implements issue #75 end-to-end by adding a centralized Settings modal in the web UI and safe backend read/update endpoints. The implementation preserves config precedence (env vars > .env > config.yaml > defaults), supports validated writes to config.yaml, and surfaces override metadata so users can see when values are locked by environment settings.

## Contents
- [Scope](#scope)
- [Decisions](#decisions)
- [Task Status](#task-status)
- [Verification](#verification)

## Scope
- Add backend settings API endpoints for read and validated update.
- Preserve runtime/session behavior while updating global defaults in config.yaml.
- Add centralized header Settings modal for editing supported options.
- Surface per-field source metadata and override warnings in UI.
- Add targeted backend and frontend tests.

## Decisions
- Persist global settings to config.yaml only, with atomic backup and validation.
- Keep session-specific generation controls where they currently live; new modal edits global defaults.
- Return effective value and source metadata per setting key from backend.
- When provider/model defaults are updated, refresh in-memory model refs so runtime remains consistent.

## Task Status
- [x] 1. Add backend settings helpers (source tracking, validation, config read/write)
- [x] 2. Add backend endpoints (GET and PUT /api/settings) and wire into route module
- [x] 3. Add frontend API functions for centralized settings read/save
- [x] 4. Add header Settings button and modal markup
- [x] 5. Implement settings modal logic in UI (load, render, validate, save, feedback)
- [x] 6. Add/update backend tests for settings API
- [x] 7. Add/update frontend tests for settings modal behavior
- [x] 8. Run targeted tests and full JS bundle build
- [x] 9. Final review, update status notes, and summarize

## Verification
- Backend API tests: `conda run -n cvgen python -m pytest tests/test_api_integration.py -k settings -q --tb=short` -> `2 passed, 18 deselected`.
- Frontend UI tests: `npx vitest run tests/js/ui-core.test.js` -> `6 passed`.
- Frontend bundle: `npm run build` -> success, regenerated `web/bundle.js`.
