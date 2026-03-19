---
name: copilot-instructions-bridge
description: Bridge shared Copilot and Claude project instructions into Codex workflows. Use when a repo relies on .github/copilot-instructions.md, ~/src/vscode-config/copilot-instructions.md, Claude command files, or VS Code prompt conventions and you need Codex to follow them intentionally.
---

# Copilot Instructions Bridge

Use this skill when the user wants Codex to honor shared Copilot or Claude guidance.

## Required reads

1. Read repo-local `.github/copilot-instructions.md` if it exists.
2. Read user-level `~/src/vscode-config/copilot-instructions.md` if it exists.
3. If the repo has `.claude/commands/*.md`, treat them as reusable workflow specs, not native Codex commands.
4. If the repo or user config has `prompts/*.prompt.md`, treat them as prompt templates to convert into Codex behavior or Codex skills.

## How to apply the guidance

- Treat Copilot instructions as project rules and working conventions.
- Treat Claude command files as workflow references or checklists.
- Treat prompt files as candidate Codex skills or prompt templates.
- Prefer durable conversion into Codex skills over one-off manual copying.

## Conversion rules

- If a source directory already contains valid `SKILL.md` files, reuse or install those instead of rewriting them.
- Only create new Codex skills for prompt-only workflows or Claude-only command files.
- Preserve repo-specific paths, scripts, and source-of-truth files.
- When a prompt references tools Codex does not have, adapt the workflow rather than copying the prompt literally.

## Recommended local paths

- Shared skills: `~/src/vscode-config/skills/`
- Shared prompts: `~/src/vscode-config/prompts/`
- Project instructions: `.github/copilot-instructions.md`
- Claude commands: `.claude/commands/`

## Codex-first mapping

- Existing `SKILL.md` directories -> install into `~/.codex/skills`
- `*.prompt.md` files -> convert into Codex skills
- `.claude/commands/*.md` -> convert into Codex skills or checklists
- Shared instructions -> read explicitly at task start or encode in a bridge skill like this one
