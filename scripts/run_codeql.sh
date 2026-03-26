#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/run_codeql.sh [--source-root PATH] [--output-root PATH]

Run a local CodeQL scan for the repository using the CodeQL CLI bundled with the
VS Code extension when the standalone `codeql` command is not on PATH.

Options:
  --source-root PATH  Repository root to scan. Default: repo root
  --output-root PATH  Parent directory for scan artifacts. Default: /tmp
  --help              Show this help message and exit

Outputs:
  A timestamped work directory containing:
    - a filtered source snapshot
    - CodeQL databases for Python and JavaScript
    - SARIF reports
    - plain-text logs and a summary report
EOF
}

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd "$script_dir/.." && pwd)
source_root="$repo_root"
output_root="/tmp"

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
    "$HOME/Library/Application Support/Code/User/globalStorage/github.vscode-codeql/distribution1/codeql/codeql" \
    "$HOME/.config/Code/User/globalStorage/github.vscode-codeql/distribution1/codeql/codeql" \
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
