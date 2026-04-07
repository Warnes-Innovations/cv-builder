#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
#
# Run the Playwright UI test suite.
# Usage: ./test_ui.sh [pytest-args...]
# Example: ./test_ui.sh -v -k test_ui_auth

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON=/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python

cd "$REPO_DIR"

echo "Running Playwright UI tests..."
exec "$PYTHON" -m pytest tests/ui/ -q --tb=short "$@"
