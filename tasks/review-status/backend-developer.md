<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Backend Developer Review Status

**Last Updated:** 2026-04-20

**Reviewer Persona:** Expert Back-End Developer

**Scope:** Python/Flask backend — architecture, design, implementation, performance, security, test coverage

**Executive Summary:** The cv-builder backend is well-structured for a single-user local application: Blueprint decomposition, per-session object isolation via `SessionRegistry`, typed error hierarchies, and a layered config system all reflect deliberate design. Security posture is strong for the app's threat model — SSRF protection, path-traversal guards, and prompt-injection scanning are all present. The main concerns are a bloated `web_app.py` that still imports private helpers from route modules, three duplicated utility functions shared between the main module and blueprints, and a handful of missing unit-test coverage gaps (DNS-rebinding path, security edge cases, CLI-mixed code in `ConversationManager`).

---

## 1. Architecture & Module Design

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Blueprint decomposition | ✅ Pass | `scripts/routes/` — 8 blueprints | Clean separation: session, job, generation, review, master_data, auth, static, status |
| Session isolation | ✅ Pass | `scripts/utils/session_registry.py:110–160` | `SessionEntry` holds independent `ConversationManager` + `CVOrchestrator` per tab |
| Dependency injection | ✅ Pass | Each `create_blueprint(deps)` receives an explicit dict | Enables test-time substitution of all shared services |
| `web_app.py` size / responsibility | ⚠️ Partial | `scripts/web_app.py:72–79` | Imports private route-module helpers (`_compile_harvest_candidates`, `_harvest_add_skill`, etc.) from `routes.generation_routes` into the main module — breaks encapsulation |
| Duplicated utility code | ⚠️ Partial | `web_app.py:528–545`; `master_data_routes.py:89–104` | `_text_similarity` and `_SCREENING_FORMAT_GUIDANCE` are defined in both `web_app.py` and `master_data_routes.py`; they should live in one shared location |
| Dead code in `create_app` | ⚠️ Partial | `web_app.py:614` | `_auth_poll` dict is defined inside `create_app` but never used; the live `_auth_poll` is defined inside `auth_routes.create_blueprint`. The local variable is unreachable. |
| CLI code mixed into web-shared module | ⚠️ Partial | `conversation_manager.py:32,165–225` | `import readline`, `_get_multiline_input`, `start_interactive`, `_print_welcome`, and readline history management are CLI-only but live in a module also imported by the web app on every session creation |
| Config layer | ✅ Pass | `scripts/utils/config.py:30–210` | Precedence env > `.env` > `config.yaml` > hardcoded defaults is explicit and documented |
| Master-data write-window enforcement | ✅ Pass | `master_data_routes.py:130–141` | `_require_master_data_write_phase` guards all write endpoints |

---

## 2. API Design & Route Structure

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Route organization | ✅ Pass | `scripts/routes/` | 8 blueprints; one concern per file |
| HTTP verb usage | ✅ Pass | Blueprint decorators throughout | GET/POST/PUT/DELETE used correctly; no GET-that-mutates found |
| HTTP status codes | ✅ Pass | `_get_session` (400/404), `_validate_owner` (403), routes | Consistent use of 400 (bad input), 403 (auth), 404 (not found), 409 (wrong phase), 500 (server error) |
| `session_id` resolution | ✅ Pass | `web_app.py:680–720` | GET: query string; POST/PUT/DELETE: JSON body or query string; helper is centralized in `_get_session` |
| REST resource naming | ✅ Pass | `/api/sessions`, `/api/job`, `/api/generate`, `/api/master-data/*` | Consistent noun-first patterns; lifecycle endpoints documented |
| Session-free endpoints | ✅ Pass | `/api/model-catalog`, `/api/pricing`, `/api/models` | Documented in instructions and implemented correctly |
| Phase enforcement | ✅ Pass | `master_data_routes.py:130–141` | Write-window restriction on master data is enforced at the route level, not inside business logic |
| Error response shape | ⚠️ Partial | Throughout route files | Most errors return `{"error": "..."}` but some 500 handlers expose exception text verbatim (e.g., `generation_routes.py:_internal_server_error`) — acceptable for a local app, but would leak internals if ever exposed externally |
| Polling endpoint semantics | ⚠️ Partial | `auth_routes.py:copilot_auth_poll` | `POST /api/copilot-auth/poll` starts a background thread but returns 200 immediately; semantically a fire-and-forget, not a true POST — caller must poll `/status` separately; this is workable but not RESTful |

---

## 3. Implementation Quality

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Typed error hierarchy | ✅ Pass | `llm_client.py:40–110` | `LLMError` → `LLMAuthError`, `LLMRateLimitError`, `LLMContextLengthError`, `LLMTimeoutError`, `LLMProviderError` — user-facing messages are actionable |
| Response DTOs | ✅ Pass | `web_app.py:100–195` | Typed `@dataclass` DTOs (`StatusResponse`, `RewritesResponse`, etc.) prevent silent field omissions; JS mirrors documented |
| Logging discipline | ✅ Pass | Throughout | `logger.debug` for routine trace; `logger.warning`/`exception` for anomalies; no print statements found |
| Config precedence | ✅ Pass | `config.py:125–210` | Each property checks env var first, then config file, then default — consistent |
| Immutable master during customization | ✅ Pass | `master_data_routes.py:130–141`; copilot-instructions.md | Phase guard prevents writes during customization |
| `duckflow` annotations | ✅ Pass | `cv_orchestrator.py:224`, `web_app.py:132`, `job_routes.py:submit_job` | Annotations are adjacent to code; timestamps present |
| Mutable default argument | ✅ Pass | No `def f(x=[])` patterns found | |
| `safe_url` in template rendering | ✅ Pass | `cv_orchestrator.py:170–175` | LinkedIn and website URLs pass through `safe_url` before template injection |
| Duplicate `_text_similarity` | ❌ Fail | `web_app.py:528–545`; `master_data_routes.py:89–104` | Same function body in two modules — a maintenance hazard; should be extracted to `scripts/utils/text_utils.py` |
| Dead `_auth_poll` variable | ❌ Fail | `web_app.py:614` | `_auth_poll` dict created in `create_app` body but never used — the live dict is inside the blueprint closure |
| Exception swallowing in `_save_master` backup | ⚠️ Partial | `master_data_routes.py:48–55` | `subprocess.run` git-add is `check=False` — failure is silent; a failed git-add leaves master changes untracked without warning |

---

## 4. Performance

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Blocking LLM calls on request thread | ⚠️ Partial | All LLM invoke sites in `conversation_manager.py`, `llm_client.py` | All LLM calls block the Flask request thread. For the development server (`flask run`) this serializes all users. Acceptable for single-user local app; would require async/worker-process architecture to scale |
| Background threading for render snapshots | ✅ Pass | `generation_routes.py:_RENDER_SNAPSHOT_LOCKS`, `schedule_render_snapshot_refresh` | Debounce-locked background threads for preview render avoid blocking the request thread for incremental updates |
| Background model-catalog refresh | ✅ Pass | `web_app.py:510–527` | Model list discovery runs in a daemon thread at startup; catalog endpoint returns cached result immediately |
| `list_sessions` full directory scan | ⚠️ Partial | `session_routes.py:list_sessions` | `output_base.rglob("session.json")` is called on every request to `/api/sessions` and `/api/load-items`; with many sessions this is repeated unbuffered I/O. Result is capped at 20 but the scan is not |
| `evict_idle` on every request | ⚠️ Partial | `web_app.py:_evict_idle_sessions` (before_request) | Full registry scan runs before every request. With many sessions this adds lock contention. Consider adding a timestamp gate so it only scans when last-eviction > N minutes |
| `ThreadPoolExecutor` for CV generation | ✅ Pass | `cv_orchestrator.py:25` | Document formats generated in parallel using `concurrent.futures.ThreadPoolExecutor` |
| Unbuffered master-data reads | ⚠️ Partial | `master_data_routes.py:_load_master` | Each `GET /api/master-fields` reads `Master_CV_Data.json` from disk; no in-process caching. Acceptable for a local app with one session |

---

## 5. Security

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| SSRF prevention (URL fetch) | ✅ Pass | `job_routes.py:fetch_job_url:200–250` | Validates scheme, blocks loopback/private/link-local IPs by address; performs DNS resolution and re-checks resolved address against private ranges — DNS-rebinding attack mitigated |
| Path traversal (session files) | ✅ Pass | `session_routes.py:_resolve_session_path:45–75` | Candidate path is resolved and compared to `session_root`; escapes return `None`. Comment explicitly notes this breaks the user-input taint chain |
| Path traversal (static files) | ✅ Pass | `static_routes.py:static_web` | `send_from_directory(web_dir, filename)` uses Werkzeug's internal `safe_join`; path traversal to outside `web/` is blocked |
| Path traversal (backup file restore) | ✅ Pass | `master_data_routes.py:_resolve_backup_path` | `safe_join(str(backup_dir), filename)` returns `None` on traversal attempt |
| Prompt-injection scanning | ✅ Pass | `job_routes.py:submit_job:256–270`; `prompt_safety.py` | Job descriptions scanned with `scan_for_safety_alert`; layout instructions sanitized with `sanitize_instruction_text` backed by `llm-sanitizer` library |
| CORS configuration | ⚠️ Partial | `web_app.py` — no `flask-cors` or explicit headers | Flask default (no CORS headers). Acceptable for `127.0.0.1`-only deployment, but there is no explicit binding enforcement preventing the app from being started on `0.0.0.0` |
| API keys in plain-text config | ⚠️ Partial | `config.yaml:13–20` | `api_keys.*` section stores provider keys in config file. For a single-user local app this is common practice; config is not committed with actual keys. Worth noting as a risk if the config is ever shared or synced to cloud storage |
| Session ID entropy | ⚠️ Partial | `session_registry.py:136` | Session IDs are `uuid4().hex[:8]` — 32 bits. Adequate for a localhost-only app; would be insufficient if the server were exposed to the internet |
| Owner-token bypass for unclaimed sessions | ⚠️ Partial | `web_app.py:_validate_owner` | Any request may interact with an unclaimed session. This is by design for the single-user case but means a second browser tab can interact with another tab's session before claiming |
| `subprocess` with controlled arguments | ✅ Pass | `master_data_routes.py:_save_master:52` | `git add` is invoked with `['git', '-C', str(master_path.parent), 'add', master_path.name]` — no shell=True, arguments constructed from `Path` objects, not raw user strings |
| No SQL injection surface | — N/A | | No database; all state is in-memory dict or JSON files |

---

## 6. Test Coverage

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Session registry unit tests | ✅ Pass | `tests/test_session_registry.py` | Covers create, get_or_404, claim, takeover, evict_idle, load_from_file, concurrent access |
| Conversation manager unit tests | ✅ Pass | `tests/test_conversation_manager.py` | State schema, rewrite decisions, phase advancement, backward-compat session loading |
| Web app integration tests | ✅ Pass | `tests/test_web_ui_workflow.py`, `test_web_app_rewrites.py`, `test_staged_generation.py` | Flask test client with mocked dependencies; covers core request/response contracts |
| LLM client | ✅ Pass | `tests/test_llm_client.py` | Provider error classification, model normalization |
| Prompt safety | ✅ Pass | `tests/test_prompt_safety.py` | Injection phrase detection, `sanitize_instruction_text` |
| Scoring utilities | ✅ Pass | `tests/test_scoring.py` | Relevance scoring, keyword extraction |
| Master data validation | ✅ Pass | `tests/test_master_data.py`, `test_master_data_validation_integration.py` | Top-level structure, JSON Schema |
| Session persistence (file I/O) | ✅ Pass | `tests/test_session_registry.py`, `test_conversation_manager.py` | Load/save round-trip using temp dirs |
| Concurrent session access | ✅ Pass | `tests/test_concurrent_sessions.py` | Concurrent create/lookup/eviction under threading |
| URL fetch / SSRF protection | ⚠️ Partial | `tests/test_url_fetch.py`, `test_linkedin_url_handling.py` | Scheme blocking and protected-site detection covered; DNS-rebinding path (hostname resolution → private-IP rejection) has no dedicated test with mocked `socket.getaddrinfo` |
| `static_routes` path traversal | 🔲 Not implemented | `scripts/routes/static_routes.py` | No test that verifies `/<path:filename>` rejects `../../` traversal attempts |
| `_save_master` git-add failure path | 🔲 Not implemented | `master_data_routes.py:52` | No test that verifies behavior when `git add` subprocess fails |
| CLI code in `ConversationManager` | 🔲 Not implemented | `conversation_manager.py:165–225` | `start_interactive`, `_get_multiline_input`, `_print_welcome` are untested (no CLI unit tests found) |
| `auth_routes` dead `_auth_poll` | 🔲 Not implemented | `web_app.py:614` | No test that would surface the orphaned variable |
| Unit test directory | ⚠️ Partial | `tests/unit/` | Contains only `test_session_overrides.py`, `test_session_precedence.py` — unit coverage isolated from Flask app is thin; most unit tests are mixed with integration-style tests at the top level |

---

## 7. Findings Summary

| ID | Severity | Area | Finding | Evidence |
|----|----------|------|---------|----------|
| F-01 | HIGH | Implementation | `_text_similarity` function is duplicated verbatim in `web_app.py` and `master_data_routes.py`; divergence risk | `web_app.py:528–545`; `master_data_routes.py:89–104` |
| F-02 | HIGH | Architecture | `web_app.py` imports private helpers (`_compile_harvest_candidates`, `_harvest_add_skill`, `_harvest_apply_bullet`, `_harvest_add_summary_variant`) from `routes.generation_routes` — breaks encapsulation and makes `create_app` depend on route internals | `web_app.py:72–79` |
| F-03 | HIGH | Implementation | Dead variable `_auth_poll` defined inside `create_app` but never used; the actual live poll state lives inside `auth_routes.create_blueprint` | `web_app.py:614` |
| F-04 | MEDIUM | Architecture | CLI-only code (`readline`, `start_interactive`, `_get_multiline_input`) is embedded in `ConversationManager`, which is imported on every web session creation — increases startup overhead and conflates concerns | `conversation_manager.py:32,165–225` |
| F-05 | MEDIUM | Performance | `list_sessions` and `load_items` both perform a full `rglob("session.json")` directory scan on every call with no caching | `session_routes.py:list_sessions`, `session_routes.py:load_items` |
| F-06 | MEDIUM | Performance | `evict_idle` runs a full registry lock-and-scan before every request; no timestamp gate to skip if last eviction was recent | `web_app.py:_evict_idle_sessions` (before_request) |
| F-07 | MEDIUM | Security | No explicit CORS policy; the app can be started on `0.0.0.0` without any origin restriction | `web_app.py:create_app` — no `flask-cors` |
| F-08 | MEDIUM | Security | Session IDs are only 32-bit (`uuid4().hex[:8]`); acceptable for localhost-only but insufficient if port is ever forwarded or app is served externally | `session_registry.py:136` |
| F-09 | MEDIUM | Test Coverage | DNS-rebinding protection (hostname → IP re-check) in `fetch_job_url` has no unit test with mocked `socket.getaddrinfo` | `job_routes.py:200–225`; `tests/test_url_fetch.py` |
| F-10 | MEDIUM | Implementation | `_save_master` runs `git add` with `check=False` — silent failure leaves master changes untracked without any log warning | `master_data_routes.py:52` |
| F-11 | LOW | Test Coverage | `static_routes.py` wildcard handler (`/<path:filename>`) has no path-traversal test | `static_routes.py:static_web` |
| F-12 | LOW | Test Coverage | `_save_master` git-add failure path is untested | `master_data_routes.py:48–55` |
| F-13 | LOW | Architecture | `_SCREENING_FORMAT_GUIDANCE` is duplicated in `web_app.py` and `master_data_routes.py` | `web_app.py:562–568`; `master_data_routes.py:55–62` |
| F-14 | LOW | API Design | `POST /api/copilot-auth/poll` starts a background thread and returns 200 immediately; the non-blocking behavior is not reflected in the HTTP verb or response shape — callers cannot distinguish "poll accepted" from "poll completed" | `auth_routes.py:copilot_auth_poll` |
| F-15 | LOW | Security | API keys in `config.yaml` under `api_keys.*` are plain text; risk materializes if the config file is ever cloud-synced or shared | `config.yaml:13–20` |

---

## 8. Proposed New Story Items / Gaps

| GAP ID | Area | Description | Rationale |
|--------|------|-------------|-----------|
| GAP-50 | Architecture | Extract shared `_text_similarity` and `_SCREENING_FORMAT_GUIDANCE` from `web_app.py` and `master_data_routes.py` into `scripts/utils/text_utils.py`; update both callers | Eliminates duplication risk flagged in F-01 and F-13 |
| GAP-51 | Architecture | Move CLI-only methods (`start_interactive`, `_get_multiline_input`, `_print_welcome`, readline setup) out of `ConversationManager` into a `scripts/cli_runner.py` shim | Addresses F-04; reduces web-session startup overhead and cleans the class interface |
| GAP-52 | Architecture | Move the imported private helpers (`_compile_harvest_candidates` etc.) out of `web_app.py` into a `routes/harvest_helpers.py` module so `create_app` does not depend on route internals | Addresses F-02 |
| GAP-53 | Performance | Add a session-scan result cache (TTL ~5s) to `list_sessions` and `load_items` to avoid repeated `rglob` on every panel open | Addresses F-05 |
| GAP-54 | Performance | Add a timestamp gate to `evict_idle` so the full registry scan is skipped if last eviction was within the last 60 seconds | Addresses F-06 |
| GAP-55 | Security | Add `flask-cors` with `origins=["http://127.0.0.1:*", "http://localhost:*"]` to restrict CORS to loopback origins, and document it in `config.yaml` | Addresses F-07 |
| GAP-56 | Security | Increase session ID entropy to 16 hex chars (`uuid4().hex[:16]`, 64 bits) or full UUID; the change is backward-incompatible with saved sessions so requires migration note | Addresses F-08 |
| GAP-57 | Test Coverage | Add unit test for DNS-rebinding path in `fetch_job_url`: mock `socket.getaddrinfo` to return a private IP for a public hostname and assert 400 response | Addresses F-09 |
| GAP-58 | Test Coverage | Add unit test for `static_routes` wildcard handler with path-traversal inputs (e.g., `../config.yaml`) to confirm `send_from_directory` blocks them | Addresses F-11 |
| GAP-59 | Test Coverage | Add test for `_save_master` git-add failure: mock `subprocess.run` to return non-zero and assert the data is still written and a log warning is emitted | Addresses F-10 and F-12 |
| GAP-60 | Implementation | Add a `logger.warning` in `_save_master` when the `git add` subprocess returns non-zero, and optionally surface it in the API response as a non-fatal warning | Addresses F-10 |
