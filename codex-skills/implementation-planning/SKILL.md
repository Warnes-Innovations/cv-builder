---
name: implementation-planning
description: Create a structured implementation plan with explicit decisions, risks, and task breakdown, then walk through it for approval. Use when the user wants the old /plan behavior.
---

# Implementation Planning

Adapted from `~/src/vscode-config/prompts/plan.prompt.md`.

## Produce three things

1. Analysis results and conclusions
2. Key decisions and rejected alternatives
3. Actionable tasks with dependencies, effort, and risk

## Preferred flow

1. Summarize current state and requirements
2. Identify dependencies, risks, and success criteria
3. Break the work into concrete tasks
4. Surface open questions or assumptions
5. Ask for approval when the decision path has non-obvious consequences

## Codex adaptation

- Use the built-in plan tool when available
- For simple tasks, keep the plan lightweight
- For architectural or multi-file changes, make the plan explicit before editing
