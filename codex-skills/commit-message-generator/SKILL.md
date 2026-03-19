---
name: commit-message-generator
description: Generate conventional commit messages with thematic grouping from changed files. Use when the user wants the old /commit behavior or asks for a commit message.
---

# Commit Message Generator

Adapted from `~/src/vscode-config/prompts/commitMessage.prompt.md`.

## Workflow

1. Inspect changed files.
2. Group changes by functional theme rather than by file list.
3. Choose a conventional commit type and scope.
4. Produce a concise title and 3-5 high-signal bullets.

## Rules

- Prefer `type(scope): summary`
- Focus on user or developer impact
- Do not dump raw file lists into the message
- Mention version bumps only when relevant

## Common types

- `feat`
- `fix`
- `refactor`
- `docs`
- `chore`
- `perf`

## Codex adaptation

- Generate the proposed message first
- Do not commit automatically unless the user explicitly asks you to make the commit
