---
name: sequential-code-review
description: Run a systematic code review and present multiple findings one by one instead of as a flat summary. Use when the user wants the old /codeReview behavior or when multiple review findings should be prioritized and handled sequentially.
---

# Sequential Code Review

Adapted from:

- `~/src/vscode-config/prompts/codeReview.prompt.md`
- `~/src/vscode-config/skills/code-review/SKILL.md`

## Workflow

1. Run a normal code review first.
2. Collect all findings with severity, impact, and a concrete fix.
3. If there are 2 or more findings, present them sequentially using one-by-one workflow.
4. If there is 1 finding, present it directly and ask whether to implement it.
5. If there are 0 findings, explicitly say so and mention residual risk or test gaps.

## Required finding fields

- file or area
- problem
- impact
- recommended fix
- urgency
- importance
- effort
- dependencies

## Codex adaptation

- Use `one-by-one-codex` instead of relying on a native `/obo` slash command.
- Do not auto-apply fixes from review findings unless the user asked for a fix workflow rather than a review.
- Keep findings first, summary second.
