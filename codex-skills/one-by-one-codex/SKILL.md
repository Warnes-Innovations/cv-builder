---
name: one-by-one-codex
description: Sequentially process a list of findings, tasks, or decisions one item at a time with persistence and prioritization. Use when the user wants OBO or one-by-one behavior in Codex.
---

# One-By-One for Codex

Adapted from:

- `~/src/vscode-config/skills/one-by-one/SKILL.md`
- `~/src/vscode-config/prompts/OneByOne.prompt.md`

## When to use

- The user asks for `/obo`, one-by-one processing, or sequential review
- A list of findings, tasks, or design decisions should be handled one at a time
- You need resumable session state in `.github/obo_sessions/`

## Session handling

- Session files live in `.github/obo_sessions/`
- Prefer the helper script if available:
  `/Users/warnes/src/vscode-config/skills/one-by-one/obo_helper.py`
- If MCP/session helpers are unavailable, manage the JSON files directly

## Workflow

1. Check for incomplete OBO sessions first.
2. Offer resume/merge/replace behavior when relevant.
3. Extract items and assign priority factors:
   `urgency + importance + (6 - effort) + dependencies`
4. Persist the session.
5. Present one item at a time.
6. Do not advance until the user explicitly approves, denies, skips, or asks for next.

## Codex adaptation

- Codex does not treat `/obo` as a native command.
- Use this skill plus normal chat turns, plans, and repo session files to recreate the behavior.
- If the environment supports structured user-input tools, use them; otherwise ask short direct questions.

## Original references

- `~/src/vscode-config/prompts/OneByOne.prompt.md`
- `~/src/vscode-config/skills/one-by-one/SKILL.md`
