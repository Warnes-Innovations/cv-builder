#!/usr/bin/env zsh
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
#
# Restart the cv-builder launchd service (e.g. after pulling new code or
# switching branches, so the running instance picks up the change).
# Usage: ./restart.sh

set -euo pipefail

LABEL="com.warnes.cv-builder"
PLIST_DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/cv-builder"

if [[ ! -f "$PLIST_DEST" ]]; then
    echo "Service not installed — run ./install-service.sh first." >&2
    exit 1
fi

if launchctl print "gui/$(id -u)/${LABEL}" &>/dev/null; then
    echo "Restarting ${LABEL}..."
    launchctl kickstart -k "gui/$(id -u)/${LABEL}"
else
    echo "Service not currently loaded — loading it now..."
    launchctl load "$PLIST_DEST"
fi

echo "Restarted. Waiting for it to come back up (conda activation takes a few seconds)..."
for _ in {1..30}; do
    sleep 1
    if curl -s -o /dev/null "http://localhost:5001/"; then
        echo "CV Builder is back up at http://localhost:5001"
        exit 0
    fi
done

echo "Still not responding after 30s — check the logs:" >&2
echo "  tail -f ${LOG_DIR}/launchd-stderr.log" >&2
exit 1
