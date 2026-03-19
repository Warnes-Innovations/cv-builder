---
name: copilot-preflight
description: Run the shared preflight workflow before substantial work in repos that use Copilot-style instructions. Use when the task should begin by identifying applicable instruction sections, relevant skills, planning needs, and review requirements.
---

# Copilot Preflight

Adapted from `~/src/vscode-config/prompts/preflight.prompt.md`.

## When to use

- Before non-trivial work in repos that use Copilot-style instructions
- When the user asks Codex to follow existing prompt, skill, or instruction conventions
- Before code changes, reviews, or multi-step investigations

## Preflight checklist

1. State which sections of repo-local and user-level instructions apply.
2. State which Codex skills apply.
3. If the task is multi-step, create or update a plan before implementation.
4. If code will change, reserve time for a final code review pass.
5. If the task depends on converted prompt workflows, name the converted skill(s) being used.

## Output pattern

Start substantial work with a short note covering:

- applicable instruction sections
- applicable skills
- whether planning will be used
- whether review will be used before finalizing

Keep it brief; the goal is compliance visibility, not ceremony.
