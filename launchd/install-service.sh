#!/usr/bin/env zsh
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
#
# Install (or reinstall) the cv-builder launchd service.
# Usage: ./install-service.sh [--uninstall]
#
# LLM provider keys are written to ../.env (seeded from ../.env.example, the
# same template documented in README.md "Configure LLM Provider" -- see that
# section if you're setting up keys for the first time or adding a provider).

set -euo pipefail

LABEL="com.warnes.cv-builder"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/com.warnes.cv-builder.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/cv-builder"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

uninstall() {
    echo "Unloading ${LABEL}..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    rm -f "$PLIST_DEST"
    echo "Service removed. Logs remain at ${LOG_DIR}."
}

if [[ "${1:-}" == "--uninstall" ]]; then
    uninstall
    exit 0
fi

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Remove any existing installation cleanly
if launchctl list "$LABEL" &>/dev/null; then
    echo "Unloading existing service..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Symlink the plist so the repo copy is always the single source of truth --
# no risk of the installed copy drifting from what's checked into git.
# This means the plist itself must never contain secrets (see below).
rm -f "$PLIST_DEST"
ln -s "$PLIST_SRC" "$PLIST_DEST"

# Write LLM provider keys to a gitignored .env file (chmod 600) rather than
# baking them into the plist. scripts/utils/config.py already auto-loads a
# .env file from the app's working directory, so the app picks these up with
# no plist changes needed. Keeps secrets out of both git and the
# world-readable ~/Library/LaunchAgents plist.
#
# .env's key names/format follow ../.env.example (the same template used for
# manual/interactive setup -- see README.md "Configure LLM Provider"). If no
# .env exists yet, seed it from that template so it stays self-documenting
# instead of ending up as a bare list of KEY=value lines.
export ENABLE_LLM_KEYS=1
export ENABLE_TOKENS=1
source "$HOME/.oh-my-zsh-custom/llm-keys.zsh"

write_env_var() {
    local key="$1" val="${(P)1}"   # zsh indirect expansion
    [[ -z "$val" ]] && return
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
        echo "${key}=${val}" >> "$ENV_FILE"
    fi
}

if [[ ! -f "$ENV_FILE" ]]; then
    cp "$(dirname "$ENV_FILE")/.env.example" "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
write_env_var ANTHROPIC_API_KEY
write_env_var OPENAI_API_KEY
write_env_var GEMINI_API_KEY
write_env_var GROQ_API_KEY

# Load the service
launchctl load "$PLIST_DEST"
echo "Service loaded. CV Builder will start now and on every login."
echo ""
echo "Useful commands:"
echo "  Check status : launchctl list ${LABEL}"
echo "  Stop         : launchctl unload ${PLIST_DEST}"
echo "  Start        : launchctl load   ${PLIST_DEST}"
echo "  Uninstall    : ./install-service.sh --uninstall"
echo "  Logs         : tail -f ${LOG_DIR}/launchd-stderr.log"
echo "  Keys         : ${ENV_FILE} (see ../README.md Configure LLM Provider)"
echo ""
echo "App will be available at: http://localhost:5001"
