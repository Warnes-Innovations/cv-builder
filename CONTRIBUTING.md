<!-- Copyright (C) 2026 Gregory R. Warnes -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Contributing to CV Builder

Thank you for your interest in contributing. This document covers local setup,
coding conventions, and the rules you need to follow to keep the project
consistent and safe.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Running Tests](#2-running-tests)
3. [Building the JS Bundle](#3-building-the-js-bundle)
4. [Coding Conventions](#4-coding-conventions)
5. [Data-Contract Maintenance Rule](#5-data-contract-maintenance-rule)
6. [Commit Messages](#6-commit-messages)
7. [Submitting a Pull Request](#7-submitting-a-pull-request)

---

## 1. Local Development Setup

### System prerequisites

Install these **before** creating the Python environment (required by WeasyPrint,
language-tool-python, pypandoc):

```bash
# macOS (Homebrew)
brew install cairo pango gdk-pixbuf libffi pandoc java

# Debian/Ubuntu
sudo apt-get install -y libcairo2 libpango-1.0-0 libgdk-pixbuf2.0-0 \
  libffi-dev pandoc default-jre
```

### Python environment

The project uses a **conda environment** named `cvgen`. CI uses pip-only
(`scripts/requirements.txt`); local development uses
`scripts/requirements-conda.txt` (pip inside conda).

```bash
conda create -n cvgen python=3.11
conda activate cvgen
pip install -r scripts/requirements-conda.txt
python -m spacy download en_core_web_sm
```

### Node.js (for JS bundle)

```bash
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env and add your API key (GITHUB_MODELS_TOKEN, ANTHROPIC_API_KEY, etc.)
```

### Start the app

```bash
conda activate cvgen
python scripts/web_app.py --llm-provider github
# Open http://localhost:5001
```

---

## 2. Running Tests

Always write test output to a file and inspect with `head`/`tail`:

```bash
# Python tests (preferred — skips known-flaky integration test)
python -m pytest tests/ --ignore=tests/ui/ \
  --deselect tests/test_api_integration.py::TestModelAPI::test_model_switch_error_uses_selected_provider_label \
  -q --tb=short > /tmp/pytest_out.txt 2>&1
head -50 /tmp/pytest_out.txt
tail -5  /tmp/pytest_out.txt

# Alternatively, use the orchestrator script
python run_tests.py
python run_tests.py --categories unit component integration

# JavaScript tests
npm run test:js
```

All existing tests must pass before a PR is merged.

---

## 3. Building the JS Bundle

The frontend is bundled with esbuild. **Rebuild after every JS or CSS-affecting
source change:**

```bash
npm run build          # development (unminified)
npm run build:prod     # production (minified)
npm run build:watch    # auto-rebuild on save
```

The built file is `web/bundle.js` and must be committed alongside source
changes.

---

## 4. Coding Conventions

### Copyright header

Every maintained source file (Python, JavaScript, CSS, shell scripts, Markdown
documentation) must carry the project copyright header immediately after any
shebang line:

```python
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
```

Do **not** add headers to generated or vendored files (`web/bundle.js`,
`htmlcov/`, `test_output/`, caches).

### No duplicate helpers

Before adding a new function or export, grep for an existing definition of the
same name across `web/*.js` and `scripts/**/*.py`:

```bash
grep -rn "function myHelper\|def my_helper" web/ scripts/
npm run lint:duplication   # catches exact-name and near-identical duplicates
```

If a definition already exists, extend the canonical copy and have other modules
reference it. Adding a second same-named function in another file causes the
later-loaded copy to silently override the first, reverting fixes without
failing tests.

### Settings files

- `.claude/settings.json` is team-wide and git-tracked — add only portable,
  path-agnostic rules that every contributor should have.
- `.claude/settings.local.json` is gitignored and personal — put
  machine-specific or personal convenience rules there.

### General style

- No comments explaining *what* code does — well-named identifiers do that.
  Only add a comment when the *why* is non-obvious (a constraint, a workaround,
  a subtle invariant).
- Validate only at system boundaries (user input, external APIs). Trust internal
  code and framework guarantees.
- Don't add error handling for scenarios that can't happen.

---

## 5. Data-Contract Maintenance Rule

Whenever a change modifies the structure of `Master_CV_Data.json` (new field,
renamed field, changed type, removed field), **update all three of the following
in the same commit**:

| File | Purpose |
|------|---------|
| `MASTER_CV_DATA_SPECIFICATION.md` | Human-readable schema spec |
| `scripts/utils/master_data_validator.py` | Validation logic |
| `schemas/master_cv_data.schema.json` | JSON Schema (machine-readable) |

PRs that change the data contract without updating all three will be rejected.

---

## 6. Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): short description
fix(scope): short description
docs(scope): short description
refactor(scope): short description
test(scope): short description
```

Reference the gap being addressed when applicable: `fix(ux): tooltip text (GAP-12)`.

---

## 7. Submitting a Pull Request

1. Fork the repository and create a branch from `main`.
2. Make your changes following the conventions above.
3. Run `npm run build` to rebuild the bundle if you changed JS or CSS.
4. Run the full test suite and confirm all tests pass.
5. Run `npm run lint:duplication` and resolve any duplicate-helper warnings.
6. Open a pull request using the PR template and describe what changed and why.

A maintainer will review and provide feedback. We aim to respond within a few
business days.
