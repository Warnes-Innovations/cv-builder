#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/run_codeql.sh [--source-root PATH] [--output-root PATH] [--custom-only]

Run a local CodeQL scan for the repository using the CodeQL CLI bundled with the
VS Code extension when the standalone `codeql` command is not on PATH.

Options:
  --source-root PATH  Repository root to scan. Default: repo root
  --output-root PATH  Parent directory for scan artifacts. Default: /tmp
  --custom-only       Run only .github/codeql/ custom queries (fast, no DB rebuild)
                      against the database already loaded in VS Code's CodeQL extension.
  --help              Show this help message and exit

Modes:
  Default             Rebuilds full CodeQL databases from source and runs the standard
                      python-code-scanning + javascript-code-scanning suites. Slow (~15 min).
  --custom-only       Runs only the cv-builder custom queries in .github/codeql/ against the
                      database cached by the VS Code extension. Fast (~1-5 min).

Outputs:
  A timestamped work directory (or /tmp/codeql_custom_*.csv for --custom-only) containing:
    - a filtered source snapshot
    - CodeQL databases for Python and JavaScript
    - SARIF reports
    - plain-text logs and a summary report

Custom Queries:
  .github/codeql/unlogged-exceptions.ql          handlers that log nothing and don't re-raise
  .github/codeql/swallowed-exceptions.ql          bare except:pass (silent discard)
  .github/codeql/exception-detail-in-response.ql  str(e) in jsonify() response (info leak)
  .github/codeql/route-without-session.ql         Flask routes missing _get_session()
  .github/codeql/llm-call-without-timeout.ql      LLM API calls without timeout
  .github/codeql/master-data-write-outside-window.ql  master_data writes outside init/refinement
  .github/codeql/test-writes-user-dir.ql          tests writing to ~/CV/ without tmp isolation
  .github/codeql/html-to-text-without-strip.ql    BeautifulSoup get_text without CSS/JS strip
  .github/codeql/hardcoded-secrets.ql             API-key-shaped strings in suspicious variables
  .github/codeql/path-traversal.ql                user input flowing to file system operations
  .github/codeql/master-data-writes.ql            all writes to master_data variables
  .github/codeql/session-state-keys.ql            inventory of session state keys used
  .github/codeql/flask-routes.ql                  inventory of all Flask routes and HTTP methods
EOF
}

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd "$script_dir/.." && pwd)
source_root="$repo_root"
output_root="/tmp"
custom_only=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-root)
      source_root="$2"
      shift 2
      ;;
    --output-root)
      output_root="$2"
      shift 2
      ;;
    --custom-only)
      custom_only=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

find_codeql() {
  local candidate

  if command -v codeql >/dev/null 2>&1; then
    command -v codeql
    return 0
  fi

  for candidate in \
    "$HOME/Library/Application Support/Code/User/globalStorage/github.vscode-codeql/distribution2/codeql/codeql" \
    "$HOME/Library/Application Support/Code/User/globalStorage/github.vscode-codeql/distribution1/codeql/codeql" \
    "$HOME/.config/Code/User/globalStorage/github.vscode-codeql/distribution2/codeql/codeql" \
    "$HOME/.config/Code/User/globalStorage/github.vscode-codeql/distribution1/codeql/codeql" \
    "$HOME/.vscode-server/data/User/globalStorage/github.vscode-codeql/distribution2/codeql/codeql" \
    "$HOME/.vscode-server/data/User/globalStorage/github.vscode-codeql/distribution1/codeql/codeql"
  do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

latest_pack_dir() {
  local pack_root="$1"

  if [[ ! -d "$pack_root" ]]; then
    return 1
  fi

  find "$pack_root" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1
}

CODEQL_BIN=$(find_codeql) || {
  echo "Unable to locate the CodeQL CLI. Install the VS Code CodeQL extension or add 'codeql' to PATH." >&2
  exit 1
}

# ── Custom-only mode: run .github/codeql/ queries against the extension's cached DB ──
if [[ "$custom_only" == "true" ]]; then
  # Locate the database loaded by the VS Code CodeQL extension for this workspace.
  # The extension stores databases under: ~/Library/.../workspaceStorage/<workspace-id>/GitHub.vscode-codeql/<repo-slug>/
  vscode_storage="$HOME/Library/Application Support/Code/User/workspaceStorage"
  py_db=$(find "$vscode_storage" -path "*/GitHub.vscode-codeql/*/python/codeql-database.yml" 2>/dev/null \
    | head -1 | sed 's|/codeql-database.yml$||')

  if [[ -z "$py_db" ]] || [[ ! -d "$py_db" ]]; then
    echo "No CodeQL Python database found in VS Code workspace storage." >&2
    echo "Open the CodeQL extension and add a database for this repo first." >&2
    exit 1
  fi

  echo "CodeQL CLI:    $CODEQL_BIN"
  echo "Python DB:     $py_db"
  echo "Custom queries: $repo_root/.github/codeql/"

  timestamp=$(date +%Y%m%d-%H%M%S)
  out_csv="/tmp/codeql_custom_${timestamp}.csv"
  err_log="/tmp/codeql_custom_${timestamp}.log"

  # Collect all .ql files from the custom query directory
  query_files=()
  while IFS= read -r f; do
    query_files+=("$f")
  done < <(find "$repo_root/.github/codeql" -name "*.ql" | sort)
  echo "Queries to run: ${#query_files[@]}"

  "$CODEQL_BIN" database analyze "$py_db" \
    "${query_files[@]}" \
    --format=csv \
    --output="$out_csv" \
    2>"$err_log" || { cat "$err_log" >&2; exit 1; }

  echo
  echo "=== Custom Query Results ==="
  # Pretty-print: rule name, severity, message, file, line
  python3 - "$out_csv" <<'PY'
import csv, sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.exists():
    print("(no results file)")
    sys.exit(0)

rows = list(csv.reader(path.open()))
by_rule = {}
for row in rows:
    if len(row) < 7:
        continue
    rule, desc, sev, msg, loc_file, line, *_ = row
    by_rule.setdefault(rule, []).append((sev, msg, loc_file, line))

if not by_rule:
    print("No issues found.")
    sys.exit(0)

# Sort: error first, then warning, then recommendation
sev_order = {"error": 0, "warning": 1, "recommendation": 2}
for rule in sorted(by_rule, key=lambda r: sev_order.get(by_rule[r][0][0], 9)):
    findings = by_rule[rule]
    print(f"\n[{findings[0][0].upper()}] {rule} ({len(findings)} finding{'s' if len(findings) != 1 else ''})")
    for sev, msg, loc, line in findings[:10]:  # cap at 10 per rule
        print(f"  {loc}:{line}  {msg[:100]}")
    if len(findings) > 10:
        print(f"  ... and {len(findings) - 10} more")
PY
  echo
  echo "Full CSV:  $out_csv"
  echo "Error log: $err_log"
  exit 0
fi

timestamp=$(date +%Y%m%d-%H%M%S)
repo_name=$(basename "$source_root")
run_dir="$output_root/${repo_name}-codeql-${timestamp}"
source_snapshot="$run_dir/source"
database_dir="$run_dir/database"
report_dir="$run_dir/reports"
log_dir="$run_dir/logs"

mkdir -p "$source_snapshot" "$database_dir" "$report_dir" "$log_dir"

echo "CodeQL CLI: $CODEQL_BIN"
echo "Source root: $source_root"
echo "Work directory: $run_dir"

rsync -a \
  --exclude '.git/' \
  --exclude 'worktrees/' \
  --exclude 'coverage/' \
  --exclude 'htmlcov/' \
  --exclude 'test-output/' \
  --exclude 'test_output/' \
  --exclude 'node_modules/' \
  --exclude '.venv/' \
  --exclude '__pycache__/' \
  --exclude '.mypy_cache/' \
  --exclude '.pytest_cache/' \
  --exclude 'web/bundle.js' \
  "$source_root/" \
  "$source_snapshot/"

"$CODEQL_BIN" pack download codeql/python-queries   > "$log_dir/python-pack-download.txt" 2>&1
"$CODEQL_BIN" pack download codeql/javascript-queries > "$log_dir/javascript-pack-download.txt" 2>&1

python_pack=$(latest_pack_dir "$HOME/.codeql/packages/codeql/python-queries")
javascript_pack=$(latest_pack_dir "$HOME/.codeql/packages/codeql/javascript-queries")

if [[ -z "$python_pack" || -z "$javascript_pack" ]]; then
  echo "Unable to resolve downloaded CodeQL query packs." >&2
  exit 1
fi

python_suite="$python_pack/codeql-suites/python-code-scanning.qls"
javascript_suite="$javascript_pack/codeql-suites/javascript-code-scanning.qls"

"$CODEQL_BIN" database create "$database_dir" \
  --db-cluster \
  --language=python,javascript \
  --source-root "$source_snapshot" \
  > "$log_dir/database-create.txt" 2>&1

"$CODEQL_BIN" database analyze "$database_dir/python" "$python_suite" \
  --format=sarif-latest \
  --output "$report_dir/python.sarif" \
  --threads=0 \
  > "$log_dir/python-analyze.txt" 2>&1

"$CODEQL_BIN" database analyze "$database_dir/javascript" "$javascript_suite" \
  --format=sarif-latest \
  --output "$report_dir/javascript.sarif" \
  --threads=0 \
  > "$log_dir/javascript-analyze.txt" 2>&1

python3 - "$report_dir/python.sarif" "$report_dir/javascript.sarif" "$run_dir/summary.txt" <<'PY'
import json
import sys
from collections import Counter
from pathlib import Path

python_file = Path(sys.argv[1])
javascript_file = Path(sys.argv[2])
summary_file = Path(sys.argv[3])


def summarize(path: Path) -> list[str]:
    sarif = json.loads(path.read_text())
    results = sarif.get("runs", [{}])[0].get("results", [])
    by_rule = Counter(result.get("ruleId", "unknown") for result in results)
    lines = [str(path), f"results={len(results)}"]
    for rule_id, count in by_rule.most_common(10):
      lines.append(f"{rule_id} {count}")
    lines.append("")
    return lines


summary_lines = summarize(python_file) + summarize(javascript_file)
summary_file.write_text("\n".join(summary_lines))
print("\n".join(summary_lines))
PY

echo
echo "Artifacts written to: $run_dir"
