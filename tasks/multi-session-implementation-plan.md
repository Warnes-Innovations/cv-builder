# Multi-Session Implementation Plan

**Created:** 2026-03-18 | **Status:** Approved — ready for implementation

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
