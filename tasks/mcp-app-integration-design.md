<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Agent ↔ Running App Integration — Design Proposal

**Date:** 2026-10-22
**Status:** Draft — for scope decision
**Reader:** the maintainer, choosing which phases to build and in what order
**Level:** decisions and architecture. Implementation detail is deliberately left to each phase's
own design; the questions each phase must settle are collected in Section 9.

---

## 1. The decision this document asks for

An LLM agent (Claude Code, via the cv-builder MCP server) and a person (via the browser) should be
able to work on **the same CV data at the same time**, each seeing the other's changes, without
either silently overwriting the other. Today they cannot: the MCP server and the web app are two
processes with two independent copies of every session and of the master data, and several
existing code paths overwrite data without checking what is on disk.

Three capabilities, in priority order:

| Priority | Capability | What it gives you |
|---|---|---|
| **1** | **One writer for shared state** | Agent edits go through the running app, so there is one copy of the data. Master edits reach every open session. Sessions stop hiding master changes they never edited. |
| **2** | **Live updates in the browser** | A change the agent makes appears in the open tab without a reload; a change that would collide with your unsaved edits is shown, not applied. |
| **3** | **Agent sees and steers the UI** | The agent can read what you are looking at and put proposals in front of you to accept or reject. (Proposals arrive with P6, because they are how approval is enforced; presence and agent-backed chat are P8.) |

**What to act on:** the phased plan (Section 7) and the open decisions (Section 8). The central
point is that priority 1 rests mostly on **correctness fixes to code that exists today**
(P0–P4). Routing the MCP server through the app (P6) is the smaller part, but it is the phase that
lets the app enforce approval of agent edits.

Claims about current behaviour in Section 3 are labelled **Verified (ran)**, **Read** (from the
code, not executed) or **Inferred**.

**Constraints:**

- The person approves every wording change before it is written to the master data.
- No fact enters the master data that the person has not confirmed.
- Nothing overwrites a session-only edit without asking.

**Where each constraint is enforced:** until P6 the first two rely on the agent following its
instructions (as today). From P6 every MCP tool call goes through the app, which enforces them
(wording changes made through the CLI still rely on instructions); from P5, writes from other web
sites are refused. The third is enforced by the app from P2
(refused saves) and P3 (conflict resolution). Two limits remain, by design: the app cannot stop a
**same-user local process that deliberately goes around it** (editing files directly, or forging
a browser `Origin`), and it cannot distinguish the person from **script running on the app's own
pages** — which is why P5 must also stop untrusted content from executing there (Section 5.5).

### Settled decisions

Made by the maintainer during review; the rest of the document is written on them.

- **One user, no backward compatibility.** Files get a `schema_version`; formats change in place
  with a one-time migration; old code paths are deleted, not kept alongside.
- **No local secrets.** The agent runs as the same user and could read any secret file the app
  created, so caller identity rests on the `Origin` check and default-deny classification
  (Section 5.0), not on tokens.
- **No detached mode.** From P6 the MCP server never writes files; if the app is down it starts it.
- **Save on every change.** State is written as it changes, not held in memory until eviction or
  shutdown.

### Non-goals

- **Two people (or two browser tabs) co-editing one session.** Only one agent plus one person.
- **Building the multi-user hosted deployment.** The design is local-first (the app on
  `127.0.0.1:5001`); Section 6 lists what a hosted version would additionally need.
- **The agent clicking in the browser.** Steering means proposing; the person's own action
  applies the change.

---

## 2. Motivating case

A person and an agent spent a working session refining several experience bullets and two
selected achievements in `Master_CV_Data.json`, through about a dozen propose-approve-write
rounds. The person then wanted to regenerate a CV in an application session that was already
open in the browser. The edits did not appear, for three independent reasons:

1. **The session held its own copy of every bullet of those jobs.** Editing or accepting a
   rewrite for any one bullet copies all of that job's bullets into the session, and the
   session's copies replace the master's at generation time (Section 3.3).
2. **The open session's in-memory master was never refreshed** after the file changed
   (Section 3.2).
3. **Reloading did not help**, because the app returns the in-memory session rather than
   re-reading the file (Section 3.4), and editing `session.json` directly was unsafe because the
   app writes its in-memory copy back over the file (Section 3.5).

The workaround was to close the browser, stop the app's launchd service, patch `session.json` by
script (refusing any copy the person had changed), and restart the service — about a minute of
downtime, with any unsaved work in other tabs at risk.

Two further frictions: finding earlier wording was slow, because the only copy of a detailed
bullet lived in an old session's edits (never harvested back to the master), and `session.json`
files embed whole rendered CVs as HTML, so text search is mostly noise; and master edits had to be
made by ad-hoc script, because the MCP tool for it is unsafe (Section 3.2).

---

## 3. Current behaviour

### 3.1 Two processes, two copies — and both write

- **Read.** The MCP server keeps its own cache of `HeadlessSession` objects (`mcp_server.py`,
  `_SessionCache`), each with its own orchestrator and master copy. It finds sessions by scanning
  every `session.json` under the output directory (`_locate_session_file`, `:187`), and once a
  session is cached it does not re-read the file for up to 24 hours (an LRU cache with a TTL,
  `:88`; `_get_session`, `:211`). It makes no HTTP connection to the app.
- **Read.** The web app keeps sessions in `SessionRegistry`, each with its own `CVOrchestrator`,
  which loads `master_data` once, in `__init__` (`cv_orchestrator.py:124`).
- **Read.** Both processes write `session.json`, and so does the CLI, which uses `HeadlessSession`
  directly (`scripts/cli.py`). MCP `session_evict` only drops its own cache entry (`:363`).

### 3.2 Master data: one good save path, two weaker ones, and no propagation

| Path | Backup | Validation | Refreshes in-memory master |
|---|---|---|---|
| **App (live):** `web_app._save_master` (`web_app.py:1224`), injected into the routes (`web_app.py:1134`; `master_data_routes.py:404`) | yes, taken before overwriting | before **and** after writing; restores the backup on failure; then `git add` | only the requesting session's orchestrator, in four routes (`master_data_routes.py:979`, `:1103`, `:1870`; harvest `generation_routes.py:2434`) |
| **Harvest fallback** (`generation_routes.py:2428–2432`), used when `save_master` is not callable | yes (the harvest route's own, `:2416–2423`) | **none**: plain `json.dump` | requesting session |
| **MCP:** `master_data_update_section` → `HeadlessSession._save_master_data` (`headless_session.py:794–834`) | **none** | **none** | the MCP process's own copy only |

All **Read**. The MCP tool replaces a whole top-level section (to change one bullet the agent
must send the entire `experience` array), and then writes the **whole cached master** to disk
(`headless_session.py:824–826`) — so one call can silently revert changes the app made to *other*
sections since the MCP server cached the session. Three routes additionally run a bare
`git commit -m` (`master_data_routes.py:994`, `:1115`; `generation_routes.py:2451`), which commits
everything staged in the master file's repository. Master writes require the session to be in the
`init` or `refinement` phase, in the MCP tool and in the master data routes
(`_require_master_data_write_phase`, `master_data_routes.py:416`); harvest apply has its own,
refinement-only gate (`generation_routes.py:1309`).

### 3.3 Sessions snapshot every bullet, by position

Two paths copy a job's **untouched** bullets into the session:

- **Browser editor — Read.** On render, `web/achievements-review.js:520–531` seeds the edit map
  with every bullet of every displayed experience; any edit then posts the **whole map**
  (`:676–683`, 500 ms debounce), and the server replaces the stored map wholesale
  (`review_routes.py:481`).
- **Accepted rewrite — Verified (ran).** `tests/test_conversation_manager.py::test_accepted_rewrite_persists_into_achievement_edits`
  passes and asserts that accepting a rewrite of bullet two also stores bullet one's original
  master text (`conversation_manager.py:2074`).

At generation, `CVOrchestrator._apply_session_achievement_edits` (`cv_orchestrator.py:528`)
**replaces** the job's bullet list with the session's. **Read.**

Everything is **positional**: `achievement_edits` is keyed by experience list index with a list
of bullets by position, and `achievement_orders` (`review_routes.py:1531–1536`) stores integer
positions; the editor can also add, delete and reorder rows. About a dozen other readers use the
positional data (generation warnings, the layout overlay, a second copy in `customizations`,
spell-check, session hydration, the rewrite log). Master experiences and bullets *may* carry an
`id`, but the schema requires neither (`schemas/master_cv_data.schema.json`). **Read.**

### 3.4 Reload returns the in-memory copy

**Verified (ran).** `tests/test_session_registry.py::TestLoadFromFile::test_load_already_active`
passes: a second `load_from_file` for a registered session returns the first entry and discards
the freshly loaded one (`session_registry.py:313–364`).

### 3.5 Saves never check the disk, and failures are swallowed

- **Read.** Idle eviction (`session_registry.py:372`) and `DELETE /api/sessions/<id>/evict`
  (`session_routes.py:835`) save before evicting, without the session's lock, without checking
  whether the file changed, and discard any save error.
- **Read.** `_save_session` writes with a plain `open('w')`, which is not atomic
  (`conversation_manager.py:2202`).
- **Inferred.** Any external write to a live session's `session.json` is lost at the next save, in
  either direction.

### 3.6 Tab ownership is collision avoidance, not authentication

- **Read.** `POST /api/sessions/takeover` sets any owner token on any session
  (`session_registry.py:285`), and `/api/llm/<op>/prompt` and `/result` never check ownership.
  **Any local caller can already write to any loaded session.**
- **Read.** The Host-header check (`web_app.py:581`) blocks DNS rebinding, but there is no Origin
  check, and 16 route handlers use `get_json(force=True)`, which accepts a `text/plain` body that a
  hostile web page can send without a CORS preflight.
- **Read.** Generated CV previews are served inline from the app's own origin
  (`generation_routes.py:1394`), and no Content-Security-Policy is set.

### 3.7 Restarting the app kills browser tabs

**Read.** On start-up `_evict_port` (`web_app.py:1343`) sends SIGTERM to **every** process with a
socket on the port, clients included (`cv_generate_cli.py:329` already warns of this). There is
no shutdown handler, so in-memory state not yet saved is lost on restart.

### 3.8 What already exists to build on

- **Read.** `llm_routes.py` exposes `POST /api/llm/<operation>/prompt` and `/result` — "the HTTP
  equivalents of the MCP `*_prepare` / `*_submit` tool pairs".
- **Read.** Per-object master routes, backup history and restore, and harvest routes.
- **Read.** No server-push channel to the browser; it fetches `/api/status` on navigation and
  actions, not on a timer.

---

## 4. Root causes

| Symptom | Root cause | Fixed in |
|---|---|---|
| Master edits invisible in an open session | (a) untouched bullets snapshotted by position (3.3); (b) in-memory master never refreshed (3.2) | P3 **and** P4 — neither alone suffices |
| Reload does nothing | registry returns the cached entry (3.4) | P2 |
| External edits overwritten | saves never check the disk; failures swallowed (3.5) | P0 (evictions), P2; conflict resolution in P3 |
| Agent and app disagree | several processes writing (3.1) | P6 |
| MCP master edits unsafe | save paths without the app's guarantees; whole-master overwrite from a stale cache (3.2) | P0 (backup, validation); P4 (refuses the stale overwrite) |
| Approval not enforced by the app | routes open to any local caller (3.6) | P5 (Origin, content isolation), P6 (classification, proposals) |
| Browser stale after an agent edit | no push channel (3.8) | P5 for changes made through the app; agent edits bypass the app until P6 |
| App restart can kill browser tabs | `_evict_port` (3.7) | P0 |

---

## 5. Proposed design

### 5.0 Trust model and approval

- **Who is calling.** Only a request whose `Origin` is on the allow-list is the **browser**.
  **Every other caller is the agent** — the MCP server, scripts, tests, a `curl` from a shell.
  This is default-deny: anything not provably the browser is treated with the agent's
  restrictions.
- **The agent proposes; the person decides wording.** Imported text such as a job description
  reaches the agent and can carry prompt injection, so the app — not the agent — enforces
  approval. An agent call that changes wording, in a session or in the master, becomes a
  **proposal** (5.6) the person accepts in the browser. Calls that change no wording apply
  directly. Some actions are **person-only** and refused for the agent.
- **Classification covers routes, not just tools.** Every state-changing route is person-only for
  agent callers unless explicitly classified otherwise, and a test fails on any unclassified route.
  The starting point for today's MCP tools:

  | Class | Tools (today's names) |
  |---|---|
  | **Direct** (no wording change) | `session_*`, `job_submit_*`, `analysis_*`, `recommendations_*`, `questions_*`, `*_prepare`, `run_analysis`, `run_recommendations`, `decisions_submit` (include/exclude and summary-variant choice), `generate_cv`, `get_*`, `master_data_read`, `publications_read` |
  | **Draft → proposal** | `summary_submit`, `rewrites_submit`, `cover_letter_submit`, `interview_prep_submit`, `spell_check_submit`, `persuasion_check_submit`, content-changing `chat_submit`, `decisions_submit`'s `extra_skills` (agent-written skill text that goes into the CV), and a new `bullet_propose` for master wording (P6, so the motivating workflow works as soon as the agent goes through the app) |
  | **Person-only** | `rewrites_approve`, `master_data_update_section`, master restore, harvest apply |

- `owner_token` stays what it is — protection against two tabs colliding — and is not treated as a
  security boundary.

### 5.1 One writer: the MCP server becomes a client of the running app (P6)

From P6 the MCP server keeps no session or master state and never writes files; every tool calls
the app's HTTP API (the `*_prepare`/`*_submit` pairs map to the existing `/api/llm/*` routes). If
the app is down, the MCP server starts it through launchd and waits; if it cannot, the call
returns an error. A stale MCP process left running after a deployment can then only make HTTP
calls, which the updated app checks. The CLI keeps using `HeadlessSession` directly and remains a
file writer, using the same checked save (5.4); it does not go through the proposal queue, so
agent instructions must not route wording changes through the CLI.

### 5.2 One master copy, refreshed everywhere (P0, P4)

- **P0:** a single `MasterStore` wraps the live save (backup, validation, rollback). The harvest
  fallback and the MCP tool's save delegate to it, so every master write gets a backup and
  validation now. It also removes the duplicate `_save_master` definitions
  (`master_data_routes.py:178`, `web_app.py:1224`) that GAP-43 in `tasks/gaps.md` recommended
  consolidating; that entry is marked resolved, but both copies remain.
- **P4:** the store refuses a save if the file changed underneath it (compare-and-swap) — which
  also stops the MCP tool's stale whole-master overwrite — and **detects changes made outside the
  app** (by hand, a script, the CLI, or the MCP server before P6) by checking the file's hash when
  the master is next used. It holds the master as a versioned snapshot that each session picks up
  the next time it is used — no session takes another's lock, so concurrent saves cannot deadlock,
  and a generation in progress finishes on the snapshot it started with. Master bullets can be
  updated one at a time by `id`.

### 5.3 Session edits by bullet id, stored only when edited (P3)

- **New shape, same key.** `achievement_edits` becomes keyed by experience `id` and bullet `id`,
  and stores **only bullets the person edited, hid, removed or added**, each with the hash of the
  master text it started from. Untouched bullets always come from the current master. A custom
  order replaces the positional `achievement_orders`. Session-only bullets get session-local ids; a
  deleted master bullet is a `removed` record, so it cannot reappear.
- **Resolution.** If the session text equals the master, the edit has converged and is dropped
  (keeping hidden/removed flags). If the master text is unchanged since the edit began, the
  session text is used. If both changed, or the base is unknown, it is a **conflict**, shown side
  by side (base, master, session) for the person to choose; until resolved, previews warn and
  final generation is blocked on every path, including MCP `generate_cv`. A record whose master
  bullet no longer exists is an **orphan**, listed for the person.
- **The browser editor changes too.** It sends per-bullet changes instead of the whole map and no
  longer seeds untouched bullets; otherwise the next keystroke recreates the snapshot.
- **Migration is a CLI command, run with the app stopped.** `cli.py migrate-sessions --dry-run`
  reports what it would do for every session — which rows are untouched snapshots, which are
  edits, which are ambiguous — and writes nothing. `--apply` copies each file to
  `session.pre-migration-<timestamp>.json`, migrates it, and bumps its `schema_version`; a failure
  in one file is reported and does not stop the others. The P3 app **refuses to load** a session
  that has not been migrated and says to run the command; there is no migration at start-up or on
  load. P3 lands before P6, so the MCP server's auto-start cannot restart the app mid-migration.
- **Migration principles.** Rows are linked to master bullets by evidence — the rewrite log, the
  row's position checked against the master as it was when the session was created, then text
  similarity — never by position alone. A row equal to the then-current master text was an
  untouched snapshot and is dropped. Anything ambiguous becomes a conflict for the person, never a
  guess. The detailed rules are a P3 design task (Section 9).
- **Shape check on load.** Because the format changes under the same key, a stale writer could
  write the old shape into a migrated file; every load checks the shape against `schema_version`
  and refuses a mismatch rather than reading it as "no edits".

### 5.4 Versioned, atomic, checked saves (P2)

- Session and master files get a `schema_version`; a writer refuses a file newer than it
  understands.
- Every save is atomic (write a temporary file, then rename) and **checked**: it is refused if the
  file changed since the writer last read it. The check and the write are serialised across
  processes, not only within the app, because the CLI (and, until P6, the MCP server) write the
  same files.
- **A refused save never loses data:** the in-memory state goes to a side file, the session stays
  loaded, and the person chooses — keep theirs, take the file's, or resolve per item.
- **Save on every change.** Every state change is saved as it happens; most routes already do
  (about 60 `_save_session()` call sites). Eviction keeps a dirty check as a backstop: unsaved
  state is saved or the eviction refused, never dropped. An app restart then loses nothing, and no
  shutdown handler is needed.
- `POST /api/sessions/<id>/reload` re-reads a session from disk (MCP tool `session_reload`).
- **Bundle-version check.** `/api/status` reports the frontend bundle version, and the browser's
  existing status fetches compare it with the version the page loaded; on a mismatch the tab
  reloads. From P2 onward, open tabs therefore pick up new code by themselves after a deployment.
- **Read.** The browser's `localStorage` restore applies only UI preferences when the server holds
  the session's data (`web/session-manager.js:675–678`, `:1075`), so it is not a path for
  overwriting server state; no change is needed there.

### 5.5 Live updates and cross-site protection (P5)

- **Events.** `GET /api/events?session_id=<id>` is a Server-Sent Events stream announcing master
  changes, session changes (with the actor), conflicts and new proposals. The browser re-fetches
  the affected tab's data — or shows a banner if the person has unsaved edits there — and on
  reconnect simply re-fetches; there is no replay buffer.
- **Origin protection on every state-changing route.** Require a JSON content type (removing the
  `force=True` parsers) and an allow-listed `Origin` or an `X-CV-Client` header, which browsers
  cannot send cross-site without a CORS preflight the app never approves. Requests carrying
  `X-CV-Client` are agent-class callers (5.0).
- **Content isolation.** Because an allow-listed `Origin` is what makes a caller "the person",
  untrusted content must not run script on the app's origin: a `script-src 'self'`
  Content-Security-Policy, and generated CV previews served sandboxed or as downloads.

### 5.6 Proposals, and the agent seeing the UI (P6, P8)

- **Proposals (P6)** carry a target, base hash, new text and rationale, are stored per session in
  their own file (surviving restarts), and appear in the chat panel with Accept / Edit / Reject.
  Accepting calls the same route as the person's own edit, re-checking the base hash; proposal
  text is rendered as text, never HTML. Proposals are rate-limited.
- **Presence (P8).** The browser reports its current session, stage, tab and selection; the agent
  reads it through an MCP tool, labelled as browser-reported and untrusted.
- **Agent-backed chat (P8, optional).** The passthrough client (`utils/agent_bridge.py`) already
  turns an LLM call into a prompt bundle; the chat panel could queue it for the agent, falling back
  to the configured provider on timeout.

### 5.7 MCP tools for content maintenance (P7)

| Tool | Does |
|---|---|
| `content_search` | JSON-aware search over the master and all sessions' edits (skipping rendered HTML), returning ids |
| `bullet_get` | read one bullet by id (`bullet_propose` itself ships in P6, 5.0) |
| `bullet_sessions` / `bullet_sync` | list sessions with an edit for a bullet / propose resolving them |
| `harvest_propose` | propose promoting a session edit to the master |
| `master_history` | list backups and commits |

---

## 6. Remote readiness (designed for, not built)

- **Authentication.** Remotely, classification must rest on a credential, not on `Origin`: a
  Keycloak client or per-user API token for the MCP server, sessions bound to the Keycloak user.
  The MCP server cannot start a remote app and reports it unreachable instead.
- **Host check.** **Read.** The container sets `CV_WEB_HOST=0.0.0.0` with no `CV_ALLOWED_HOSTS`
  (`Dockerfile:51`), so the Host check is off there; a hosted version needs a host allow-list.
- **Multiple workers.** **Read.** The container runs gunicorn with two sync workers
  (`Dockerfile:56–62`). **Inferred.** Each has its own in-memory session registry, so the
  two-copies problem exists inside the hosted app unless sessions stick to one worker, and an
  event stream ties up a sync worker. A hosted P5 needs an async worker class or a shared event
  bus.

---

## 7. Phased plan

Phases are numbered **in build order**. Sizes are rough judgments (S ≈ a day, M ≈ a few days,
L ≈ a week or more).

| Phase | Content | Size | Depends on | Removes |
|---|---|---|---|---|
| **P0** | Safety fixes to today's code: `_evict_port` kills only the listener; `MasterStore` for every master write; evictions stop discarding save errors | S–M | — | unsafe master writes, killed tabs, silent eviction loss |
| **P1** | An `id` on every master experience and bullet — a CLI command shows the proposed ids as a diff for the person to approve before applying (the proposal queue does not exist yet); specification, validator and schema updated together (project rule) | S | P0 | the migration's main ambiguity |
| **P2** | `schema_version`; atomic, checked, cross-process-safe saves; save on every change with an eviction dirty check; side files; reload; bundle-version check so open tabs reload after a deployment | M | P0 | silent overwrites, reload that does nothing, restart loss |
| **P3** | Id-keyed `achievement_edits`, per-bullet editor, all consumers, conflict view, `migrate-sessions` CLI command, removal of positional code | L | P1, P2 | the snapshot problem |
| **P4** | Master compare-and-swap, detection of outside edits, snapshot propagation | M | P0, P1, P3 | stale in-memory master; the MCP tool's stale overwrite |
| **P5** | Event stream; Origin / `X-CV-Client` protection on every state-changing route; content isolation | M | P2 | stale browser for changes made through the app; cross-site writes |
| **P6** | MCP server as a thin client of the app; caller and route classification; proposal queue, including `bullet_propose` | L | P2, P3, P4, P5 | several writers; agent approval left to the agent; stale browser after agent edits |
| **P7** | Content-maintenance tools | M | P3, P6 | script-driven edits |
| **P8** | Presence; optional agent-backed chat | M | P6 | — |

**Reading the plan.** P0 is worth doing regardless. The motivating case needs **P3 and P4
together** — P3 stops sessions shadowing the master, P4 makes every open session see master
changes, including ones made outside the app — so "through P4" means P0–P4. P4 waits for P3
because spreading master changes into sessions whose edits are still positional could attach them
to the wrong bullets. P5 depends on P2 because its events announce versioned saves, and lands
before P6 because P6's proposals reach the browser through the event stream. Until P6, approval of
agent wording still relies on the agent, and agent edits bypass the app's events.

**Effort, roughly, from the sizes above:** P0–P4 about 2½–4 weeks; P5–P6 about 2–3 weeks more;
P7–P8 about 1–2 weeks more.

**Deploying.** Each deployment restarts every cv-builder MCP process (Claude Code runs one per
session and keeps it on the code it started with) and reloads open browser tabs; from P2, tabs
reload themselves when the code changes. P3 is deployed only after P2, and its migration is run
with the app stopped (5.3).

**Rollback.** Phases roll forward; there is no backward compatibility. Undoing P3 means restoring
the `session.pre-migration-*` copies with the pre-P3 code, losing edits made since.

**Tests.** Each phase adds tests that fail before the change — for example: a connected client
survives an app restart (P0); a save is refused after the file changes on disk, and no session
change is lost across a restart (P2); editing bullet two leaves bullet one out of the stored edits,
and a migrated edit still conflicts when its master text later changes (P3); two sessions saving
the master concurrently both complete (P4); a cross-site POST is refused (P5); an agent wording
call becomes a proposal and an unclassified route fails the route-coverage test (P6).

---

## 8. Open decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | How far to commit now | P0 only; through P4; through P5; through P6 | **Through P4** (about 2½–4 weeks) — fixes the motivating case, including master edits made outside the app, and today's unsafe paths; decide P5 and P6 with that experience. Cost of stopping there: several writers remain, approval of agent wording still relies on the agent, and the browser is not told about changes |
| D2 | Agent changes to wording | proposals; or direct writes with a notification | **Proposals** — the only way the app, rather than the agent, enforces approval. Cost: the proposal queue and its UI are a large part of P6; direct writes would be cheaper but leave approval to the agent's instructions |
| D3 | Master history | today's mix (three routes commit, most only `git add`); commit every save | **Commit every save** through `MasterStore`, from P0, naming only the master file so nothing else staged is swept in, with an actor/reason note. Cost: one commit per master save; if a commit fails, it is logged and the save stands (the file is already written and validated) |
| D4 | Phase gate on master writes | keep for app and agent; drop for both | **Drop for both, after P3 and P4** — master data belongs to no session, but while session edits are positional a mid-job master edit can re-target them |

---

## 9. Open questions per phase

Settled when each phase is designed; collected from review so they are not lost.

- **P0.** Whether eviction should run inside `before_request` once it takes the session lock (it
  could stall the status probe).
- **P1.** How ids are generated, and whether existing ids are kept stable.
- **P2.**
  - How cross-process serialisation is done (a per-session OS file lock is the obvious choice).
  - One rolling side file per session, or one per refused save.
  - Which state changes are not saved today (the route-by-route inventory).
  - Whether a refused save should freeze further changes to that session until resolved.
  - Log volume and rotation for the launchd logs.
- **P3.**
  - The exact linking rules and similarity threshold.
  - How to recover "the master when the session was created": `session.json` stores no creation
    time (its `timestamp` is rewritten on every save, `conversation_manager.py:2196`), and a
    backup holds the master as it was *before* the save it is named for.
  - How an unlinked ambiguous row is represented.
  - What happens to pending rewrites recorded by position.
  - Field-level selected-achievement overrides, which today live in two places.
  - Tests that the dry run writes nothing and that each pre-migration copy matches its original.
  - A dry run over copies of real sessions before `--apply`.
- **P4.** How `orchestrator.master_data` reads that happen without the session lock see the
  current snapshot.
- **P5.**
  - The inventory of current non-browser HTTP clients and which class each needs.
  - Precedence when a request carries both an allowed `Origin` and `X-CV-Client`.
  - What the event stream exposes to any local subscriber.
- **P6.**
  - The full route classification.
  - Start-up behaviour: how long to wait, telling a hung app from a starting one, confirming the
    responder is cv-builder, and an API-version check so an MCP server from another branch
    refuses.
  - A **maintenance marker** so the MCP server does not restart the app during a rollback or a
    manual repair.
  - Duplicate-proposal handling on retries.
  - Conflict granularity for agent writes: per target, not per session, so the person's
    concurrent edits do not refuse the agent's.
  - Whether `job_submit_file` sends the file or its path.
- **P7.** Whether `content_search` needs an index once there are many sessions.

**Housekeeping, outside this design:** `uv run` reportedly fails to build the package and the
repository `.venv` lacks `bibtexparser`, so tooling currently works only in the `cvgen` conda
environment.
