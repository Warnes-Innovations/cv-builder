# Refactoring Candidates Review

Date: 2026-03-18
Scope: Python and JavaScript source in `scripts/` and `web/`

## Executive Summary

The highest-value refactoring work is concentrated in two orchestration files:

- `scripts/web_app.py` centralizes Flask app setup, dependency wiring, request locking, route registration, request parsing, and session-state mutation inside one oversized app factory.
- `web/app.js` centralizes chat flow, session restore, workflow progression, post-analysis Q&A, review interactions, CV editor rendering, and download-stage UI in one browser-global script.

Those two files dominate maintenance risk because they mix unrelated responsibilities and own cross-cutting workflow state. The next tier of candidates are `scripts/utils/cv_orchestrator.py`, `scripts/utils/conversation_manager.py`, `scripts/utils/llm_client.py`, and `web/ui-core.js`, each of which contains smaller but still materially complex blocks that would become easier to change once the primary orchestration files are split.

## Method

- Measured file size using source line counts.
- Measured Python block complexity with an AST-based control-flow heuristic.
- Measured JavaScript size with file-level metrics and then validated candidate blocks by direct source inspection.
- Excluded `.claude/`, caches, logs, generated artifacts, and dependency directories.

Notes:

- Python block complexity values below are approximate but directionally reliable.
- JavaScript block complexity in `web/app.js` was validated manually because an automated brace-based detector over-expanded nested blocks in that file.

## Ranked Candidates

| Priority | Area | Candidate | Size | Complexity Signal | Risk | Refactoring Benefit | Recommended Direction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Python | `scripts/web_app.py` / `create_app()` and nested route handlers | 4,063 LOC file; `create_app()` spans lines 309-3837 (3,529 lines) | App factory owns dependency setup, lock lifecycle, route registration, request parsing, and workflow transitions; nested handlers such as `fetch_job_url()` at lines 1599-1837 add more special-case logic | Very High | Highest reduction in blast radius; makes route behavior testable without booting the whole app; easier lock/state auditing | Split into blueprint-style route modules plus service helpers for URL ingestion, session APIs, generation, and auth |
| 2 | JavaScript | `web/app.js` monolith | 8,308 LOC file | Verified clusters: init and listeners (738-814), message dispatch (1649-1784), post-analysis Q&A UI (2155-2419), CV editor rendering (2874-3195), plus many more workflow functions in one global namespace | Very High | Largest frontend maintainability gain; untangles workflow state, DOM rendering, and transport concerns | Extract modules for workflow controller, chat/message routing, analysis questions, review flows, CV editor, and download/finalize |
| 3 | Python | `scripts/utils/cv_orchestrator.py` selection/generation/validation cluster | 2,529 LOC file; `_select_content_hybrid()` lines 1117-1348 (232 lines); `validate_ats_report()` lines 2185-2529 (345 lines) | File mixes content selection, output generation, ATS validation, PDF/DOCX handling, and publication logic | High | Clearer ownership boundaries; lower regression risk in generation pipeline; easier targeted tests | Separate selectors, render/generation steps, and ATS validation into distinct collaborators |
| 4 | Python | `scripts/utils/conversation_manager.py` / `_execute_action()` | 1,533 LOC file; `_execute_action()` lines 458-733 (276 lines) | Large action dispatcher with embedded phase transitions, data repair, recommendation generation, decision application, and CV generation | High | Simplifies workflow changes; reduces action-specific coupling and conditional drift | Replace the `if/elif` dispatcher with per-action command handlers or a dispatch map |
| 5 | Python | `scripts/utils/llm_client.py` prompt-building and response-parsing cluster | 2,245 LOC file; `recommend_customizations()` lines 159-352; `rank_publications_for_job()` lines 1142-1289; `_propose_rewrites_via_chat()` lines 1291-1426 | File combines provider abstraction, prompt construction, JSON parsing, rewrite filtering, and ranking logic | Medium-High | Easier prompt iteration, stronger validation, lower provider-specific regression risk | Extract prompt builders and response parsers into dedicated helpers; keep providers focused on transport |
| 6 | JavaScript | `web/ui-core.js` tab/modal/model-selection controller | 1,118 LOC file; `setupEventListeners()` lines 236-318; `_buildModelTable()` lines 821-975 | UI shell mixes accessibility, tab routing, modal control, provider/model catalog rendering, DataTables integration, and pricing refresh | Medium | Better UI cohesion and smaller test surface; less coupling between tab logic and model selection | Extract model modal/table code into its own module and keep `ui-core.js` as stage/navigation shell |
| 7 | JavaScript | `web/state-manager.js` backend/localStorage/session restoration ownership | 332 LOC file; `restoreSession()` and `restoreBackendState()` lines 166-295 | Module is not huge, but it overlaps with session/state behavior still present in `web/app.js`, creating split ownership | Medium | Removes duplicated restore/save logic and makes resume behavior predictable | Make this the single owner of browser state hydration and session restoration; have `app.js` consume state instead of reconstructing it |
| 8 | JavaScript | `web/layout-instruction.js` layout review UI | 329 LOC file; `initiateLayoutInstructions()` lines 15-78; `submitLayoutInstruction()` lines 105-155 | Moderate complexity with dynamic DOM creation, history management, inline `prompt()`-based clarification, and partial undo | Low-Medium | Good cleanup target after larger splits; improves layout-review testability | Convert to a small view-model module and replace inline DOM string assembly with focused render helpers |

## Detailed Notes

### 1. `scripts/web_app.py`

Primary concern:

- `create_app()` is no longer an app factory in the narrow sense. It acts as a dependency container, route registry, request-lock manager, and controller layer for most user workflows.

Evidence:

- App setup, auth, `CVOrchestrator`, and `ConversationManager` are all instantiated inside `create_app()`.
- Nested handlers such as `fetch_job_url()` contain domain-specific scraping rules, validation, HTML extraction, state mutation, and error shaping in one route function.

Refactor shape:

- Keep `create_app()` limited to configuration, dependency creation, and blueprint registration.
- Move route logic into cohesive modules by domain: status/session APIs, job ingestion, generation/download, auth/model catalog, and harvest/finalize.
- Keep the single-session lock, but centralize exempt-path policy and lock handling in a dedicated wrapper.

### 2. `web/app.js`

Primary concern:

- The file has become the frontend runtime for nearly the whole application, with browser globals as the integration mechanism.

Evidence from inspected blocks:

- `init()` and `setupEventListeners()` combine startup sequencing, local persistence, restore behavior, and button wiring.
- `_handleLLMMessage()` combines transport, retry UI, JSON extraction, customization detection, and fallback rendering.
- `askPostAnalysisQuestions()` through `submitAllAnswers()` mixes persistence, rendering, AI drafting, validation, and workflow transitions.
- `populateCVEditorTab()` through `renderExperienceCards()` combine data fetching, templating, event routing, mutation, and persistence cues.

Refactor shape:

- Keep a thin top-level bootstrap.
- Extract modules for: session bootstrapping, chat transport/message routing, post-analysis questions, review flows, CV editor, and generation/download orchestration.
- Replace window-global coordination with explicit state and module APIs.

### 3. `scripts/utils/cv_orchestrator.py`

Primary concern:

- The file combines three different kinds of work: business rules for content selection, output generation, and post-generation validation.

Evidence:

- `_select_content_hybrid()` contains omission/recommendation rules, skills-shape compatibility handling, scoring, bullet reordering, summary resolution, and publication filtering.
- `validate_ats_report()` contains 16 checks covering DOCX, HTML/JSON-LD, WeasyPrint rendering, PDF page size, and page-count policy.

Refactor shape:

- Extract a content-selector service.
- Extract ATS validation into a standalone validator object or module.
- Keep orchestration methods focused on sequence and data flow.

### 4. `scripts/utils/conversation_manager.py`

Primary concern:

- `_execute_action()` encodes most workflow branching in one imperative block.

Evidence:

- It handles analysis, question generation, recommendation generation, decision normalization, summary/session injection, publication decisions, and final generation.
- It also repairs persisted JSON strings inline, which makes action logic harder to reason about.

Refactor shape:

- Introduce action-specific handlers with a common interface.
- Move state normalization into dedicated helpers called before dispatch.
- Keep phase transitions explicit and centrally validated.

### 5. `scripts/utils/llm_client.py`

Primary concern:

- The file is doing transport-layer work and prompt-architecture work at the same time.

Evidence:

- `recommend_customizations()` builds a large provider-agnostic prompt, includes user preferences and conversation history formatting, and also performs backward-compatibility normalization.
- `rank_publications_for_job()` and `_propose_rewrites_via_chat()` repeat a similar pattern: compact serialization, prompt construction, JSON parsing, filtering, and fallback shaping.

Refactor shape:

- Extract reusable prompt-builder classes/functions.
- Extract schema validation and normalization helpers.
- Keep provider classes focused on API transport and capability selection.

### 6. `web/ui-core.js`

Primary concern:

- `ui-core.js` is better factored than `web/app.js`, but it still owns too many unrelated UI concerns.

Evidence:

- `setupEventListeners()` handles tabs, keyboard behavior, ESC modal closing, chat toggling, and dialog background clicks.
- `_buildModelTable()` manages header generation, DataTable lifecycle, row rendering, filtering, and selection synchronization.

Refactor shape:

- Split navigation/modal shell from model catalog/table behavior.
- Keep accessibility utilities in a separate shared module if they are reused.

### 7. `web/state-manager.js`

Primary concern:

- This module should be the single state owner, but app-level restore/save logic is still distributed across `web/app.js`.

Evidence:

- `restoreSession()` and `restoreBackendState()` are already substantial.
- The current structure suggests state concerns are only partially centralized.

Refactor shape:

- Make this module authoritative for localStorage, backend hydration, and phase restoration.
- Have higher-level UI modules subscribe to or request state rather than rebuilding it.

### 8. `web/layout-instruction.js`

Primary concern:

- This is not a crisis file, but it has enough view logic and state mutation to justify cleanup after the main hotspots.

Evidence:

- The module dynamically creates the whole layout panel, binds listeners, stores history in globals, and uses `prompt()` for clarification.
- `undoInstruction()` is explicitly partial and relies on re-render placeholders rather than a real model.

Refactor shape:

- Treat layout review as a self-contained feature module with its own render and state helpers.

## Recommended Order

This order is the recommended refactor backlog order, not the recommended execution order relative to the March 19 UI-gap implementation work.

For near-term execution:

1. During UI-gap Phase 0 and Phase 1, do only enabling refactors that directly support staged generation, ATS score surfacing, and rerun/state ownership.
2. After the staged generation slice stabilizes, begin the broader structural refactors below.
3. Reassess after the ATS slice before taking on the largest frontend/backend splits in full.

Broader refactor backlog order:

1. Split `scripts/web_app.py` into app factory plus route/service modules.
2. Split `web/app.js` into a bootstrap and feature modules.
3. Separate selection, rendering, and ATS validation concerns in `scripts/utils/cv_orchestrator.py`.
4. Replace `ConversationManager._execute_action()` with dispatched handlers.
5. Extract prompt builders/parsers from `scripts/utils/llm_client.py`.
6. Extract model catalog UI from `web/ui-core.js`.
7. Make `web/state-manager.js` the single browser state owner.
8. Clean up `web/layout-instruction.js` after the larger workflow splits land.

## OBO Session

An OBO session has been created for these recommendations:

- `session_20260318_refactor_review.json`
