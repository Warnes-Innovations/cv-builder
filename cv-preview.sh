#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Interpreter choice, first match wins:
#   1. $CV_PYTHON, an explicit override (the test suite passes sys.executable);
#   2. the active virtualenv, which need not be on PATH (CI calls
#      .venv/bin/python directly and never activates it);
#   3. the local cvgen conda environment;
#   4. whatever python3 is on PATH.
# Do not drop 1 or 2: falling through to a bare python3 that lacks the
# project dependencies is what failed the scheduled Full Integration Suite.
if [ -n "${CV_PYTHON:-}" ]; then
    exec "$CV_PYTHON" "$script_dir/scripts/cv-preview.py" "$@"
elif [ -n "${VIRTUAL_ENV:-}" ] && [ -x "$VIRTUAL_ENV/bin/python" ]; then
    exec "$VIRTUAL_ENV/bin/python" "$script_dir/scripts/cv-preview.py" "$@"
elif command -v conda >/dev/null 2>&1 && conda env list 2>/dev/null | grep -qE '^\s*cvgen\s'; then
    exec conda run -n cvgen python "$script_dir/scripts/cv-preview.py" "$@"
else
    exec python3 "$script_dir/scripts/cv-preview.py" "$@"
fi