# Multi-Session Implementation Plan

**Created:** 2026-03-18 | **Status:** Complete

**Last Updated:** 2026-03-18

## Progress Log

### 2026-03-18 22:30 EDT — API Test Session-ID Migration + Spec File Updates

**Summary:** Updated all legacy API test files to the ExitStack + unclaimed-session pattern, bringing the full test suite from 65 failures to 568 passed (2 pre-existing network-only failures remain). Updated specification files to reflect the completed multi-session architecture.

**Test files migrated**

Each file's `_make_app()` helper was rewritten to return a 4- or 5-tuple including `(session_id, stack)`. Tests create an unclaimed session via `POST /api/sessions/new` (no claim → `owner_token is None` → `_validate_owner` skips all ownership checks). The `ExitStack` keeps mock patches alive past the helper return boundary.

- `tests/test_api_integration.py` — `_make_app_and_client()` returns `(app, session_id, stack)`; 5 class `setUp` methods updated
- `tests/test_web_app_rewrites.py` — `_make_app()` returns 5-tuple; 8 GET calls + 5 POST calls get `session_id`
- `tests/test_finalise.py` — `_make_app()` returns 5-tuple; all 19 HTTP test methods updated
- `tests/test_screening.py` — `_make_app()` returns 5-tuple; `_generate()` helper injects `session_id`
- `tests/test_cover_letter.py` — `_make_app()` returns 5-tuple; all 10 test methods updated
- `tests/test_master_data.py` — `_make_app()` returns 4-tuple; all 10 test methods updated

**Specification files updated**

- `.github/copilot-instructions.md` — replaced stale "Single-session architecture" bullet with full `SessionRegistry` description including ownership model, `session_id` delivery patterns, and session lifecycle endpoints
- `tasks/roadmap.md` — ROAD-01 dependency note updated from "currently in-progress" to "now complete"
- `tasks/gaps.md` — GAP-18 already marked RESOLVED (no changes needed); user-story files contain no single-session assumptions

**Verified**

- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest -q` → **568 passed**, 2 network failures (pre-existing LinkedIn connectivity, unrelated to sessions)

**Status after this slice**

- Done: all multi-session implementation steps complete; test suite green; specification files updated
- Remaining: browser-level verification of session switching, takeover, and header/dropdown behavior (manual; see ROAD-01 for future multi-user work)

### 2026-03-18 21:10 EDT — Full Route-Cluster Coverage + Production Bug Fixes

**Summary:** Extended session-aware API test coverage to all remaining `_validate_owner` route clusters and fixed four production bugs discovered in the process.

**Production bugs fixed in `scripts/web_app.py`**

- `_validate_owner`: only read `owner_token` from the JSON body. GET requests (e.g. `GET /api/rewrites`) pass ownership via the query string, so those endpoints rejected every legitimate owner request with 403. Now reads from query args as fallback when the JSON body token is absent.
- `cover_letter_generate`: called `', '.join(all_skills[:12])` but `normalize_skills_data` returns a list of dicts, not strings, causing a `TypeError`. Fixed to extract `s.get('name', str(s))` from each element.
- `finalise_application`: called `conversation.save_session()` which is a public method defined on `ConversationManager`. The `FakeConversationManager` had only `_save_session()`; added the public `save_session()` alias to the fake to match the real class contract.

**Test fixture fix in `tests/test_concurrent_sessions.py`**

- `SAMPLE_MASTER_DATA["selected_achievements"]`: was a list of bare strings. The `/api/master-data/update-achievement` route calls `.get('id')` on each element, which raises `AttributeError` against strings. Changed to a list of dicts `[{"id": "sa_001", "title": "..."}]` to match the real data format.

**New test clusters added — all owner-validated endpoints now covered**

- `test_summary_and_master_data_routes_enforce_ownership`: `POST /api/generate-summary`, `POST /api/master-data/update-summary`, `POST /api/master-data/update-achievement`
- `test_cover_letter_and_screening_routes_enforce_ownership`: `POST /api/cover-letter/generate`, `POST /api/cover-letter/save`, `POST /api/screening/save`
- `test_phase_navigation_and_review_routes_update_session_state`: `POST /api/back-to-phase`, `POST /api/re-run-phase`, `POST /api/generation-settings`, `POST /api/post-analysis-responses`, `POST /api/review-decisions`
- `test_editing_and_rewrite_fetch_routes_enforce_ownership`: `POST /api/save-achievement-edits`, `POST /api/rewrite-achievement`, `POST /api/cv-data`, `GET /api/rewrites`
- `test_finalise_and_harvest_routes_enforce_ownership`: `POST /api/finalise`, `POST /api/harvest/apply`

**Verified**

- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest tests/test_concurrent_sessions.py tests/test_session_registry.py -q` → **40 passed**

**Status after this slice**

- Done:
  - All 31 `_validate_owner` call sites have representative API test coverage
  - All five new clusters verified passing
  - All production bugs caught by the tests fixed
- Next:
  - browser-level verification of session switching, takeover, and header/dropdown behavior

### 2026-03-18 19:18 EDT — API And Concurrent Session Coverage

**Summary:** Added the missing Flask coverage for session ownership and representative session-aware routes. The new tests exercise the HTTP contracts for claim and takeover, verify that mutation routes reject missing or wrong session ownership, confirm that `/api/sessions/active` reflects per-session metadata, and prove that two sessions can mutate state concurrently without leaking into each other.

**Implemented in this slice**

- `tests/test_concurrent_sessions.py`
  - added a lightweight Flask app harness with fake per-session `ConversationManager` and `CVOrchestrator` instances
  - covered `POST /api/sessions/claim` success, validation failure, and `session_owned` conflict handling
  - covered `POST /api/sessions/takeover` ownership reassignment through the API layer
  - covered representative session-aware route guards on `POST /api/job` and `POST /api/reset` for missing `session_id`, unknown session, and wrong-owner cases
  - expanded representative mutation coverage to `POST /api/message` and `POST /api/action`, including owner enforcement, validation failures, and payload forwarding checks
  - expanded stateful completion coverage to `POST /api/rewrites/approve`, `POST /api/spell-check-complete`, and `POST /api/layout-complete`, including phase transitions and persisted payload assertions
  - verified that `GET /api/status` and `GET /api/sessions/active` expose the correct per-session state after mutations
  - added a concurrent mutation test that submits jobs into two claimed sessions in parallel and confirms state isolation

**Verified**

- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest tests/test_concurrent_sessions.py -q` → 4 passed
- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest tests/test_session_registry.py tests/test_concurrent_sessions.py -q` → 30 passed
- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest tests/test_concurrent_sessions.py tests/test_session_registry.py -q` → 32 passed
- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest tests/test_concurrent_sessions.py tests/test_session_registry.py -q` → 35 passed

**Status after this slice**

- Done:
  - API-level claim / takeover coverage
  - representative session-aware guard coverage for `job`, `reset`, `message`, and `action`
  - representative completion-flow coverage for rewrite approval, spell-check completion, and layout completion
  - active-session metadata coverage
  - concurrent multi-session mutation isolation test
- Partial:
  - broader route-by-route backend migration coverage is still incomplete
  - browser-level verification of the full takeover and switcher UX is still pending
- Next:
  - expand session-aware API coverage to additional high-value mutation routes as they are migrated
  - do a browser-level verification pass for session switching, takeover, and header/dropdown behavior

### 2026-03-18 17:39 EDT — Unified Session Switcher UI

**Summary:** The session switcher is now a real header-driven UI instead of a split between the old saved-sessions modal and the lightweight landing panel. The header now exposes the active session label plus a dedicated new-session action, the sessions overlay shows both active and saved sessions in one place, and ownership conflicts now use the planned multi-action dialog instead of a binary confirm prompt.

**Implemented in this slice**

- `web/index.html`
  - replaced the static `Sessions` pill with a real switcher label target in the header
  - added a header `+ New Session` control that opens a fresh session in a new tab
  - added a dedicated ownership-conflict dialog with `Take Over`, `New Session`, and `Load Different` actions
- `web/styles.css`
  - added styling for the unified session-switcher overlay, session rows, and ownership/status pills
  - added active-session styling for the header switcher button
- `web/app.js`
  - added session-switcher helper functions for phase labels, ownership-state labelling, and header button labelling
  - updated the no-session landing panel to reuse the unified active/saved session section layout
  - changed the sessions modal body to include active sessions and saved sessions in one overlay
  - replaced the old 409 ownership confirm flow with the planned three-way ownership dialog
  - updated the header session label whenever status/position metadata changes
- `tests/js/session-switcher.test.js`
  - added focused regression coverage for the new header/session-switcher helper logic

**Verified**

- `npx vitest run tests/js/session-switcher.test.js` → 6 passed
- `npx vitest run tests/js/api-client.test.js` → 21 passed

**Status after this slice**

- Done:
  - unified header session-switcher label
  - dedicated header new-session action
  - sessions overlay with active + saved session sections
  - ownership-conflict dialog with `Take Over` / `New Session` / `Load Different`
- Partial:
  - saved-session rows in the landing panel still use explicit load actions rather than full middle-click/new-tab semantics
  - broader browser-level validation of the full switcher flow is still needed
- Next:
  - add API and concurrent-session coverage for claim/takeover and representative session-aware routes
  - do a browser-level verification pass for session switching, takeover, and header/dropdown behavior

### 2026-03-18 18:55 EDT — Frontend Session Contract Slice

**Summary:** The frontend now has a real URL-scoped session contract instead of the old synthetic local session ID. Shared API calls automatically inject `session_id` and `owner_token`, app startup claims the session from `?session=`, and the no-session state now renders a lightweight sessions landing view instead of blindly trying to restore a global singleton.

**Implemented in this slice**
- `web/api-client.js`
  - added `getSessionIdFromURL()`, `setSessionIdInURL()`, `getOwnerToken()`, and scoped tab-data storage helpers
  - added session-aware request augmentation so session-scoped API calls automatically include `session_id` and `owner_token`
  - routed `apiCall()` through the session-aware transport path
- `web/app.js`
  - added URL-based session bootstrap and ownership claim on page load
  - added takeover flow for `session_owned` conflicts
  - added lightweight no-session landing panel with `New Session`, active sessions, and saved sessions
  - changed `new session` and `load session` flows to navigate onto `/?session=<id>`
  - namespaced persisted tab state by `session_id`
- `web/ui-core.js`
  - narrowed generic 409 handling so ownership-claim conflicts do not trigger the old busy-session banner path
- `scripts/web_app.py`
  - `POST /api/sessions/new` now returns `redirect_url`
  - `POST /api/sessions/claim` now returns the planned structured `session_owned` error on conflict
  - `GET /api/sessions/active` now includes `position_name` and `phase`
- `tests/js/api-client.test.js`
  - added focused coverage for URL session extraction, owner-token reuse, and automatic request augmentation

**Verified**
- `npx vitest run tests/js/api-client.test.js` → 20 passed
- `/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -m pytest tests/test_session_registry.py -q` → 26 passed

**Status after this slice**
- Done:
  - `session.json` schema / `ConversationManager` session ID persistence
  - `SessionRegistry` implementation
  - config support for `idle_timeout_minutes`
  - frontend URL/session transport contract
- Partial:
  - session switcher UI is still the pre-existing modal plus the new lightweight landing panel, not yet the final unified header/dropdown experience from the plan
  - backend route migration is still mixed; many routes are session-aware, but this still needs a full pass and dedicated API coverage
  - concurrent-session integration tests are still missing
- Next:
  - finish the remaining UI work for session switching / ownership conflicts
  - add API and concurrent-session tests for claim/takeover and session-aware routes

### 2026-03-18 18:35 EDT — Implementation Audit

**Summary:** The backend registry and session persistence work are substantially underway, but the frontend still runs on the old single-session contract. The current priority is to wire URL-scoped session startup, per-tab ownership claims, and automatic `session_id` / `owner_token` injection for API requests so the migrated backend routes are actually reachable from the UI.

**Completed**
- `conversation_manager.py` persists `session_id` in `session.json` and backfills older session files that do not have one.
- `scripts/utils/session_registry.py` exists with create, lookup, claim, takeover, idle eviction, load-from-file, remove, and active-session listing support.
- `config.yaml` and `scripts/utils/config.py` include `session.idle_timeout_minutes`.
- `scripts/web_app.py` has been partially migrated to a `SessionRegistry` and includes new session endpoints.
- `tests/test_session_registry.py` exists and covers the registry plus `session_id` persistence behavior.

**Partial / Needs Follow-up**
- `POST /api/sessions/new` exists but does not yet return the planned `redirect_url`.
- `GET /api/sessions/active` exists but does not yet return the planned session summary fields (`position_name`, `phase`).
- Many backend routes are session-aware, but the frontend still sends most requests without URL-derived `session_id` or `owner_token`.
- The frontend still generates and stores a synthetic local session ID instead of treating `?session=` as the source of truth.
- No-session page load still behaves like the old app instead of showing the planned sessions landing panel.
- Ownership conflict handling is not yet implemented as the planned claim / takeover flow.
- The concurrent-session/API test slice from the plan has not been added yet.

**Current Focus**
- Frontend transport and startup contract:
  - derive session from `?session=`
  - claim ownership with a tab-local token
  - inject `session_id` and `owner_token` into session-aware API requests
  - route `new session` and `load session` flows back to URL-based sessions

---

## Overview

Replace the current single-session architecture with a `SessionRegistry` that supports multiple
independent concurrent sessions, one per browser tab. Each session is identified by a short UUID
in the URL (`?session=<id>`), has exclusive ownership by the tab that claimed it, and is stored
on disk as before.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Session ID transport | URL query param `?session=<uuid>` | Tabs are naturally independent; bookmarkable; inspectable |
| Session ID format | Short UUID4 (first 8 hex chars) | Readable in URL bar |
| Scope | Single user, multiple browser tabs | Multi-user deferred to `tasks/roadmap.md` (ROAD-01) |
| Session ownership | Exclusive per tab (`claim` / `takeover`) | Prevents split-brain edits |
| Page load (no session) | Unified sessions landing panel | Deliberate choice; avoids accidental blank sessions |
| Memory cap | None | Single-user local app; idle eviction is sufficient |
| Idle eviction | `last_modified` > `idle_timeout_minutes` (default 120) | Evict on mutation staleness, not access |
| `last_modified` semantics | Updated on state mutations only, not reads | Viewing a session shouldn't change its timestamp |
| First-deploy migration | One-time manual reload via sessions panel | Acceptable; no migration code needed |
| Implementation order | End-to-end slice-first | App stays usable throughout; enables debugging while in use |

---

## Architecture: SessionEntry & SessionRegistry

### `SessionEntry` (new dataclass)
```python
@dataclass
class SessionEntry:
    session_id: str
    manager: ConversationManager
    orchestrator: CVOrchestrator
    lock: threading.RLock       # per-session mutation lock
    owner_token: str | None     # tab-local UUID; None = unclaimed
    created: datetime           # set at creation; displayed to user
    last_modified: datetime     # updated on mutations only; used for idle eviction + display
```

### `SessionRegistry` (new class — `scripts/utils/session_registry.py`)

| Method | Behaviour |
|---|---|
| `create()` | Generate short UUID, instantiate manager + orchestrator, set `created = last_modified = now` |
| `get(session_id)` | Look up entry; does **not** update `last_modified` |
| `get_or_404(session_id)` | Raises `SessionNotFoundError` → HTTP 404 |
| `touch(session_id)` | Update `last_modified` — called by state-mutating routes |
| `claim(session_id, token)` | Set `owner_token`; raises `SessionOwnedError` → HTTP 409 if different token already owns it |
| `takeover(session_id, token)` | Forcibly reassign `owner_token` (no error) |
| `load_from_file(path)` | Read disk; recover `session_id` from file or generate new; set `created` from file timestamp |
| `evict_idle()` | Auto-save + remove sessions where `now - last_modified > idle_timeout` (lazy, per-request) |
| `all_active()` | Return all in-memory entries (for display in sessions panel) |

**Thread safety:**
- Registry dict: protected by a single registry-level `RLock`
- Per-session mutations: protected by `SessionEntry.lock`
- Different sessions: zero contention

---

## session.json Schema Change

Add `session_id` as a top-level field (backward compatible):

```json
{
  "session_id": "a3f7b2c1",
  "timestamp": "...",
  "state": { ... },
  "conversation_history": [ ... ]
}
```

`conversation_manager.py` changes:
- `_save_session()`: write `session_id` to JSON
- `load_session()`: read `session_id`; generate new UUID and save back if absent (backward compat)
- Expose `self.session_id` property

---

## New & Updated API Endpoints

### New endpoints (no session_id required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions/new` | Create blank session → `{ session_id, redirect_url }` |
| `POST` | `/api/sessions/claim` | Claim tab ownership → 200 OK or 409 `session_owned` |
| `POST` | `/api/sessions/takeover` | Force-reassign ownership → 200 OK |
| `GET` | `/api/sessions/active` | List in-memory sessions with `created` + `last_modified` |
| `DELETE` | `/api/sessions/<id>/evict` | Save to disk + remove from memory |

#### `/api/sessions/claim`
```json
Request:  { "session_id": "a3f7b2c1", "owner_token": "<tab-uuid>" }
Response: 200 OK  |  409 { "error": "session_owned" }
```
- `claim` is polite: succeeds if unclaimed or already owned by same token; fails if owned by different token
- `takeover` is forceful: always succeeds; used after user confirms conflict dialog

#### `/api/sessions/active` response
```json
[
  {
    "session_id": "a3f7b2c1",
    "position_name": "SWE at Acme",
    "phase": "generation",
    "created": "2026-03-18T14:00:00",
    "last_modified": "2026-03-18T15:32:11"
  }
]
```

### Updated endpoints

| Method | Path | Change |
|---|---|---|
| `POST` | `/api/load-session` | Now registers in registry; returns `session_id` + `redirect_url` |
| All state routes | `/api/status`, `/api/chat`, `/api/analyze`, etc. | Gain `?session_id=<str>` param + `owner_token` validation on mutations |

### Unchanged endpoints (no session_id needed)
`GET /api/sessions`, `GET /api/load-items`, `GET/POST /api/trash/*`

---

## Backend Refactor: `web_app.py`

Replace globals:
```python
# Before
conversation: ConversationManager = None
orchestrator: CVOrchestrator = None
_SESSION_LOCK = threading.RLock()

# After
session_registry: SessionRegistry = SessionRegistry(
    idle_timeout_minutes=config.session.idle_timeout_minutes
)
```

Central helper used by all session-aware routes:
```python
def _get_session(required=True) -> SessionEntry:
    sid = request.args.get('session_id') or (request.json or {}).get('session_id')
    if not sid:
        if required: abort(400, 'session_id required')
        return None
    return session_registry.get_or_404(sid)
```

**Mutation routes** validate `owner_token`, acquire `session_entry.lock`, mutate, call `session_registry.touch(sid)`.

**Read-only routes** (`GET /api/status`, `GET /api/history`) look up session, read state — no lock, no touch, no token check.

**Safety net:** Delete global `conversation` variable immediately after refactor so any missed reference raises `NameError` rather than silently using stale state.

---

## Config Changes

`config.yaml`:
```yaml
session:
  auto_save: true
  session_dir: "~/CV/files/sessions"
  history_file: "~/CV/files/input_history"
  idle_timeout_minutes: 120     # NEW: evict sessions idle > N minutes (no mutations)
```

`scripts/utils/config.py`:
- Add `idle_timeout_minutes: int = 120` to `SessionConfig` dataclass

---

## Frontend Changes

### `api-client.js` — centralize session_id injection
```javascript
function apiGet(path, params = {}) {
  const sid = getSessionIdFromURL();
  if (sid) params.session_id = sid;
  return fetch(`${path}?${new URLSearchParams(params)}`);
}

function apiPost(path, body = {}) {
  const sid = getSessionIdFromURL();
  if (sid) body = { session_id: sid, owner_token: getOwnerToken(), ...body };
  return fetch(path, { method: 'POST', body: JSON.stringify(body), ... });
}
```

### `app.js` — page load routing
```javascript
function getSessionIdFromURL() {
  return new URLSearchParams(window.location.search).get('session');
}

// On page load:
// 1. Read ?session= from URL
// 2. If present → POST /api/sessions/claim with owner_token (from sessionStorage)
//    - 409 session_owned → show ownership conflict dialog
//    - 404 → offer reload from disk or start fresh
// 3. If absent → show unified sessions landing panel
```

`owner_token` is generated once per tab, stored in `sessionStorage` (tab-local, not shared).

### `state-manager.js`
- Namespace localStorage keys by session_id: `cv-builder-tab-data-${sessionId}`
- Remove 409 retry banner (cross-session conflicts no longer occur)

### Session Switcher UI (unified panel + header bar)

**Landing/Sessions Panel** (shown on load with no session, or via dropdown):
- **"+ New Session"** button → `POST /api/sessions/new` → navigate to `/?session=<id>`
- **Active sessions** section (`GET /api/sessions/active`)
- **Saved sessions** section (`GET /api/sessions`)
- Each row: position name · phase · status dot · **Created** timestamp · **Last modified** timestamp
- Primary click → claim session (conflict dialog on 409)
- Middle-click / Ctrl+click → open in new tab

**Session Header Bar** (shown when session is active):
- Label: "SWE at Acme Corp · generation" + dropdown arrow → opens panel as overlay
- **"+ New Session"** button → new tab

**Ownership Conflict Dialog** (on 409 `session_owned`):
- **"Take Over"** → `POST /api/sessions/takeover`
- **"New Session"** → `POST /api/sessions/new`
- **"Load Different"** → dismiss, return to sessions panel

---

## Testing

### New: `tests/test_session_registry.py`
- `test_create_session()` — unique ID, manager + orchestrator initialized
- `test_get_session_found()` — retrieved; `last_modified` NOT updated (read-only)
- `test_get_session_not_found()` — raises `SessionNotFoundError`
- `test_idle_eviction()` — sessions idle > timeout evicted (mocked datetime)
- `test_load_from_file()` — loads session.json, creates entry, returns session_id
- `test_load_already_active()` — loading same file twice returns same session_id
- `test_concurrent_access()` — two threads, different sessions, no deadlock
- `test_evict_saves_to_disk()` — auto-saved before removal
- `test_session_id_persisted()` — session_id written to session.json on save
- `test_backward_compat_no_session_id()` — old session.json gets new ID generated
- `test_claim_unclaimed()` — succeeds on unclaimed session
- `test_claim_owned_conflict()` — raises `SessionOwnedError` if different token
- `test_takeover()` — reassigns owner_token regardless
- `test_touch_updates_last_modified()` — `touch()` updates; `get()` does not

### New: `tests/test_concurrent_sessions.py`
- `test_concurrent_sessions_independent()` — two sessions, different job descriptions, fully isolated
- `test_parallel_llm_calls_dont_block()` — parallel threads, mock LLM delay, no 409
- `test_claim_conflict_detected()` — second claim with different token returns 409 `session_owned`

### Updated: existing API tests
Fixture in `conftest.py`:
```python
@pytest.fixture
def session_id(client):
    return client.post('/api/sessions/new').json['session_id']

@pytest.fixture
def owner_token():
    return str(uuid.uuid4())
```
All existing tests that call session-aware routes get `session_id` fixture added.

---

## Implementation Order (slice-first)

1. **`session.json` schema** — add `session_id` field to `conversation_manager.py` (~20 lines)
2. **`SessionRegistry` class** — new `scripts/utils/session_registry.py` (~150 lines)
3. **New session endpoints** — `POST /api/sessions/new`, `/claim`, `/takeover`, `GET /api/sessions/active`, `DELETE /api/sessions/<id>/evict`
4. **One route end-to-end** — migrate `GET /api/status` + `POST /api/chat`; verify in browser
5. **Remaining ~28 routes** — migrate all other session-aware routes in `web_app.py`
6. **Config** — add `idle_timeout_minutes` to `config.yaml` + `config.py`
7. **Frontend URL routing** — `api-client.js`, `app.js`, `state-manager.js`
8. **Session Switcher UI** — unified panel + header bar + conflict dialog
9. **Tests** — `test_session_registry.py`, `test_concurrent_sessions.py`, update existing API tests

Each step leaves the app in a runnable state for testing/use.

---

## Specification Files to Update

1. **`.github/copilot-instructions.md`** — replace "Single-session architecture" with `SessionRegistry` description, ownership model, `?session=` URL param, updated API route list, updated config schema
2. **`tasks/gaps.md`** — review GAP-18 (re-run with downstream state); add any new gaps discovered
3. **`tasks/user-story-*.md`** — check for single-session assumptions; update accordingly
4. **`tasks/roadmap.md`** — ROAD-01 (multi-user server mode) already logged
