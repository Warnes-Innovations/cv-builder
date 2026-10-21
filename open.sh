#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

# Open the running CV Builder web app in the default browser (macOS `open`).
# Usage: ./open.sh [PORT]
#
# The host and port are resolved the way the app resolves them; see
# scripts/app_url.sh for the precedence. Opens the browser only if the server
# answering is CV Builder; exits 1 otherwise.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${1:-}" in
    -h|--help) awk 'NR >= 8 { if (!/^#/) exit; sub(/^# ?/, ""); print }' "${BASH_SOURCE[0]}"; exit 0 ;;
    -*) echo "Error: unknown option '$1' (see --help)" >&2; exit 2 ;;
esac

url="$("$script_dir/scripts/app_url.sh" "${1:-}")"

if ! command -v open >/dev/null 2>&1 || [[ "$(uname)" != "Darwin" ]]; then
    echo "Error: this script needs macOS 'open'; browse to $url manually" >&2
    exit 2
fi

"$script_dir/scripts/app_url.sh" --probe "$url" && rc=0 || rc=$?
case "$rc" in
    0) ;;
    1) echo "CV Builder is not running at $url (start it with ./start.sh, or launchd/restart.sh for the launchd service)" >&2; exit 1 ;;
    3) echo "Error: something is listening at $url, but it is not a live CV Builder" >&2; exit 1 ;;
    4) echo "Error: $url accepted the connection but did not respond within 5s" >&2; exit 1 ;;
    *) echo "Error: could not reach $url" >&2; exit 1 ;;
esac

echo "Opening $url"
exec open "$url"
