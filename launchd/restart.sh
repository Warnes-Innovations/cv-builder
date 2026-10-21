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

# Resolve the URL before touching the service, so a bad config fails first.
# Resolve it against the checkout the SERVICE runs from (the plist's
# WorkingDirectory), not the one this script sits in: a worktree has its own
# (or no) config.yaml. Drop the caller's CV_WEB_*: the launchd job does not
# inherit this shell's environment, so honouring them would wait on a port
# the service is not using.
SERVICE_DIR="$(/usr/libexec/PlistBuddy -c 'Print :WorkingDirectory' "$PLIST_DEST" 2>/dev/null)" \
    || SERVICE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_URL_SH="${SERVICE_DIR}/scripts/app_url.sh"
if [[ ! -x "$APP_URL_SH" ]]; then
    echo "Cannot find ${APP_URL_SH} (service checkout: ${SERVICE_DIR})." >&2
    exit 1
fi
URL="$(env -u CV_WEB_PORT -u CV_WEB_HOST "$APP_URL_SH")"

if launchctl print "gui/$(id -u)/${LABEL}" &>/dev/null; then
    echo "Restarting ${LABEL}..."
    launchctl kickstart -k "gui/$(id -u)/${LABEL}"
else
    echo "Service not currently loaded — loading it now..."
    launchctl load "$PLIST_DEST"
fi

echo "Restarted. Waiting for it to come back up at ${URL} (conda activation takes a few seconds)..."
for _ in {1..30}; do
    sleep 1
    # Exit 0 only when the page answering is CV Builder; any other listener
    # (e.g. AirPlay on :5000) keeps us waiting rather than reporting success.
    if "$APP_URL_SH" --probe "$URL"; then
        echo "CV Builder is back up at ${URL}"
        exit 0
    fi
done

echo "Still not serving CV Builder at ${URL} after 30s — check the logs:" >&2
echo "  tail -f ${LOG_DIR}/launchd-stderr.log" >&2
exit 1
