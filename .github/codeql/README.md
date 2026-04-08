# CodeQL Queries for cv-builder

<!-- Copyright (C) 2026 Gregory R. Warnes -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

Custom static-analysis queries for the cv-builder codebase.
Designed for use by AI agents and human reviewers to catch recurring defect patterns
identified from specstory conversation histories.

---

## Quick Start for Agents

### Run all custom queries (fast — uses cached VS Code database)

```bash
bash scripts/run_codeql.sh --custom-only
```

Results are printed to stdout grouped by severity and saved to `/tmp/codeql_custom_<timestamp>.csv`.

### Run full standard scan (slow — rebuilds databases from source)

```bash
bash scripts/run_codeql.sh
```

### Run a single query by name

```bash
bash /usr/local/bin/codeql database analyze \
  "$HOME/Library/Application Support/Code/User/workspaceStorage/$(ls "$HOME/Library/Application Support/Code/User/workspaceStorage" | xargs -I{} ls "$HOME/Library/Application Support/Code/User/workspaceStorage/{}/GitHub.vscode-codeql" 2>/dev/null | grep cv-builder | head -1)/python" \
  .github/codeql/<query>.ql \
  --format=csv --output=/tmp/result.csv
cat /tmp/result.csv
```

---

## Query Reference

All query files live in `.github/codeql/`. Each has a `@id`, `@problem.severity`, and a description comment at the top.

### Security Queries

| Query file | Severity | What it finds | Specstory origin |
|---|---|---|---|
| `hardcoded-secrets.ql` | error | API-key-shaped string literals in `*token*`, `*secret*`, `*api_key*` variables | Persistent concern across multiple histories |
| `path-traversal.ql` | error | User input (Flask `request.*`) flowing to `open()`, `os.path.join()`, `os.makedirs()` | PR #85 flagged path injection in `session_routes.py` |
| `exception-detail-in-response.ql` | error | `str(e)`, `e.args`, `traceback.format_exc()` inside `jsonify()` responses | `master_data_routes.py` and `status_routes.py` returning raw exception messages |
| `route-without-session.ql` | warning | Flask route handlers that never call `_get_session()` | Architecture rule: all user-scoped routes must validate session_id |

### Architecture Integrity Queries

| Query file | Severity | What it finds | Specstory origin |
|---|---|---|---|
| `master-data-write-outside-window.ql` | error | Subscript writes to `master_data[...]` outside `init`/`refinement` permitted functions | Core invariant — master CV must not be modified during job customization |
| `master-data-writes.ql` | warning | All writes to `master_data` variables (inventory, not necessarily bugs) | Broader audit companion to the above |
| `llm-call-without-timeout.ql` | warning | LLM generate/complete/chat calls without a `timeout=` argument or `TimeoutError` handler | UI freezing on "Reasoning..." with no user-controllable abort |
| `flask-routes.ql` | recommendation | Inventory of all Flask routes and their HTTP methods | Route audit baseline |
| `session-state-keys.ql` | recommendation | All string keys used to access `.state[...]` | Track undocumented session keys being introduced |

### Quality / Test Hygiene Queries

| Query file | Severity | What it finds | Specstory origin |
|---|---|---|---|
| `unlogged-exceptions.ql` | warning | `except` blocks that neither log nor re-raise | Recurring incidents where bugs were hidden by silent handlers |
| `swallowed-exceptions.ql` | error | `except: pass` — exception silently discarded entirely | More severe form of the above |
| `html-to-text-without-strip.ql` | warning | `BeautifulSoup.get_text()` without prior `<script>`/`<style>` removal | LLM gets CSS/JS noise, degrades job description extraction accuracy |
| `test-writes-user-dir.ql` | warning | Test functions writing to `os.path.expanduser()` paths without `tmp_path` isolation | Test sessions accumulating in `~/CV/cv-builder/` (real data directory) |

---

## Adding New Queries

1. Create `.github/codeql/<descriptive-name>.ql`
2. Add the required metadata headers (`@name`, `@description`, `@kind problem`, `@problem.severity`, `@id cv-builder/<name>`)
3. Import `python` or `semmle.python.frameworks.Flask` as needed
4. Run `cd .github/codeql && bash /usr/local/bin/codeql pack install` once to resolve deps
5. Test-compile with `bash scripts/run_codeql.sh --custom-only` (compilation errors are shown immediately)
6. Add a row to the table above

### Key CodeQL Python AST types (python-all 7.0.3)

```ql
ExceptStmt              -- an except X as e: handler
ExceptStmt.getBody()    -- returns StmtList
StmtList.getAnItem()    -- direct child Stmt
StmtList.contains(node) -- transitive containment (use this for nested checks)
ExceptStmt.getType()    -- the exception type expression (Name, Attribute, Tuple)
ExceptStmt.getName()    -- the `as e` binding name expression
Call.getFunc()          -- function expression (Name or Attribute)
Attribute.getName()     -- the attribute name string
AssignStmt.getATarget() -- LHS of assignment
Subscript.getObject()   -- the[] base expression
```

### Correctness notes

- Use `StmtList.contains(node)` (transitive) not `StmtList.getAnItem() = node` (direct only) when checking nested statements
- `ExceptGroup` does NOT exist in python-all 7.0.3 — use `ExceptStmt` instead
- `getEnclosingStmt()` is NOT available on `Call` — use `Function.contains(call)` or `Stmt.getBody().contains(call)`
- `StmtList` has no `getCount()` — use `max(int i | exists(body.getItem(i)))` or existential checks

---

## Interpreting Results

**error** — Fix before merging. These are security issues (OWASP Top 10) or architecture rule violations that can corrupt user data.

**warning** — Review and fix. These are reliability issues or patterns that have caused real incidents in cv-builder's history.

**recommendation** — Inventory/audit queries. Use the output to understand the codebase state; no immediate action required.

---

## Known Limitations

- **`route-without-session.ql`** requires Flask route annotations to be importable by CodeQL's Python extractor. Routes registered via blueprints may not be detected if the blueprint import chain is complex.
- **`llm-call-without-timeout.ql`** uses method name matching. It will miss timeout handling that wraps the LLM call from the outside (e.g., `asyncio.wait_for`).
- **`path-traversal.ql`** is a full dataflow query — it takes 3-5 minutes to compile on first run; subsequent runs use the cache.
- Queries run against the database built from the **last time the VS Code CodeQL extension indexed the repo**. For freshly changed files, rebuild the database via the extension's "Add Database from Repository" → "Current Workspace" command.
