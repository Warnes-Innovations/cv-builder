#!/usr/bin/env zsh
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
#
# Install (or reinstall) the cv-builder launchd service.
# Usage: ./install-service.sh [--uninstall]

set -euo pipefail

LABEL="com.warnes.cv-builder"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/com.warnes.cv-builder.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/CV/cv-builder/logs"

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

# Install plist
cp "$PLIST_SRC" "$PLIST_DEST"
chmod 644 "$PLIST_DEST"

# Source LLM keys and inject them into the plist environment block.
# launchd agents don't run .zshrc, so we bake the keys in at install time.
export ENABLE_TOKENS=1
source "$HOME/.oh-my-zsh-custom/llm-keys.zsh"

inject_env_var() {
    local key="$1" val="${(P)1}"   # zsh indirect expansion
    [[ -z "$val" ]] && return
    # Only inject if the plist doesn't already have a non-empty value for this key
    /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:${key} string ${val}" \
        "$PLIST_DEST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:${key} ${val}" \
        "$PLIST_DEST"
}

inject_env_var ANTHROPIC_API_KEY
inject_env_var OPENAI_API_KEY
inject_env_var GEMINI_API_KEY
inject_env_var GROQ_API_KEY

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
echo ""
echo "App will be available at: http://localhost:5001"
