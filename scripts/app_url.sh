#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

# Resolve and probe the URL the CV Builder web app listens on.
# Shared by open.sh and launchd/restart.sh so the logic lives in one place.
#
# Usage:
#   scripts/app_url.sh [PORT]      print the app URL (exit 2 if host/port invalid)
#   scripts/app_url.sh --probe URL check what answers at URL; prints nothing.
#       exit 0  CV Builder answered (/api/status reports alive:true)
#       exit 1  nothing listening
#       exit 3  something answered, but it is not a live CV Builder
#       exit 4  connected, but no answer within 5s
#       exit 5  any other curl failure
#
# Host and port follow the app's own precedence (scripts/utils/config.py
# web_host/web_port), read from this checkout's .env and config.yaml, which is
# where start.sh and the launchd service run the app from:
#   port: PORT argument > $CV_WEB_PORT > .env CV_WEB_PORT > config.yaml web.port > 5000
#   host: $CV_WEB_HOST > .env CV_WEB_HOST > config.yaml web.host > 127.0.0.1
# Keep these defaults in step with config.py; a mismatch silently targets the
# wrong server. A `start.sh --port N` override is not visible here: pass N.

set -euo pipefail

if [[ "${1:-}" == "--probe" ]]; then
    url="${2:?--probe needs a URL}"
    # Identify the server by what it says, not by getting any HTTP response:
    # on macOS port 5000 is held by AirPlay, which answers 403. Same check as
    # scripts/cv_generate_cli.py's _require_cv_builder: 2xx and alive:true.
    body="$(curl -q -s -f --max-time 5 "${url%/}/api/status")" && rc=0 || rc=$?
    case "$rc" in
        0)  [[ "$body" =~ \"alive\"[[:space:]]*:[[:space:]]*true ]] && exit 0 || exit 3 ;;
        22) exit 3 ;;
        7)  exit 1 ;;
        28) exit 4 ;;
        *)  exit 5 ;;
    esac
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config="$repo_dir/config.yaml"
env_file="$repo_dir/.env"

# Value of KEY in .env, read the way python-dotenv reads it for simple lines:
# optional `export`, spaces around `=`, quotes and trailing ` # comment`
# stripped, last assignment wins. Only the requested key is ever read.
env_value() {
    [[ -f "$env_file" ]] || return 0
    awk -v k="$1" '
        { sub(/\r$/, "") }
        $0 ~ "^[[:space:]]*(export[[:space:]]+)?" k "[[:space:]]*=" {
            v = substr($0, index($0, "=") + 1)
            sub(/^[[:space:]]+/, "", v)
            if (v ~ /^["\047]/) { q = substr(v, 1, 1); v = substr(v, 2); sub(q ".*$", "", v) }
            else { sub(/[[:space:]]+#.*$/, "", v); sub(/[[:space:]]+$/, "", v) }
            last = v; found = 1
        }
        END { if (found) print last }' "$env_file"
}

# Value of a direct child KEY of the top-level `web:` block in config.yaml.
# Handles block style at any consistent indent; flow style (`web: {port: N}`)
# is not parsed and falls through to the default.
config_value() {
    [[ -f "$config" ]] || return 0
    awk -v k="$1" '
        { sub(/\r$/, "") }
        /^web:[[:space:]]*(#.*)?$/ { w = 1; ind = ""; next }
        /^[^[:space:]#]/           { w = 0 }
        w && /^[[:space:]]+[^[:space:]#]/ {
            match($0, /^[[:space:]]+/); cur = substr($0, 1, RLENGTH)
            if (ind == "") ind = cur
            if (cur == ind && $0 ~ "^" ind k ":") {
                v = $0; sub(/^[^:]*:[[:space:]]*/, "", v); sub(/[[:space:]]+#.*$/, "", v)
                gsub(/["\047]/, "", v); print v; exit
            }
        }' "$config"
}

port="${1:-${CV_WEB_PORT:-}}"
[[ -n "$port" ]] || port="$(env_value CV_WEB_PORT)"
[[ -n "$port" ]] || port="$(config_value port)"
port="${port:-5000}"

host="${CV_WEB_HOST:-}"
[[ -n "$host" ]] || host="$(env_value CV_WEB_HOST)"
[[ -n "$host" ]] || host="$(config_value host)"
host="${host#[}"; host="${host%]}"
case "$host" in
    ""|0.0.0.0|::) host="127.0.0.1" ;;
esac

if ! [[ "$port" =~ ^[0-9]{1,5}$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
    echo "Error: invalid port '$port' (expected 1-65535)" >&2
    exit 2
fi
# Read leading zeros as decimal, as the app's int() does (bash would say octal).
port=$((10#$port))
if ! [[ "$host" =~ ^[A-Za-z0-9.:-]+$ ]]; then
    echo "Error: invalid host '$host'" >&2
    exit 2
fi
[[ "$host" == *:* ]] && host="[$host]"

echo "http://${host}:${port}/"
