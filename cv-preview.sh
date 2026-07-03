#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prefer the local cvgen conda environment when available; fall back to
# whatever python3 is on PATH (e.g. pip-only CI, or no conda installed).
if command -v conda >/dev/null 2>&1 && conda env list 2>/dev/null | grep -qE '^\s*cvgen\s'; then
    exec conda run -n cvgen python "$script_dir/scripts/cv-preview.py" "$@"
else
    exec python3 "$script_dir/scripts/cv-preview.py" "$@"
fi