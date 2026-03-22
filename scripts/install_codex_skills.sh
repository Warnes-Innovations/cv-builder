#!/usr/bin/env bash
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_HOME/skills"
VSCODE_SKILLS_DIR="$HOME/src/vscode-config/skills"
LOCAL_SKILLS_DIR="$REPO_ROOT/codex-skills"

mkdir -p "$TARGET_DIR"

link_skill_dir() {
  local source_dir="$1"
  local name
  name="$(basename "$source_dir")"
  local target="$TARGET_DIR/$name"

  if [[ ! -f "$source_dir/SKILL.md" ]]; then
    return 0
  fi

  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "Skipping $name: $target exists and is not a symlink" >&2
    return 0
  fi

  ln -sfn "$source_dir" "$target"
  echo "Installed $name -> $source_dir"
}

if [[ -d "$VSCODE_SKILLS_DIR" ]]; then
  for dir in "$VSCODE_SKILLS_DIR"/*; do
    [[ -d "$dir" ]] || continue
    link_skill_dir "$dir"
  done
fi

if [[ -d "$LOCAL_SKILLS_DIR" ]]; then
  for dir in "$LOCAL_SKILLS_DIR"/*; do
    [[ -d "$dir" ]] || continue
    link_skill_dir "$dir"
  done
fi

echo
echo "Codex skills are available under: $TARGET_DIR"
echo "Restart Codex or start a new session to refresh the skill index if needed."
