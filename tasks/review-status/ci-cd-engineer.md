<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# CI/CD Engineer Review Status

**Last Updated:** 2026-07-04 (status corrections cycle 63)

**Reviewer Persona:** Expert CI/CD Engineer

**Scope:** GitHub Actions CI/CD processes, workflow design, dependency setup, security gates, reporting, branch coverage, and (added 2026-07-02, ahead of inviting outside users/contributors) external-contributor and open-source readiness — fork-PR CI safety, contributor-facing failure clarity, and contribution documentation.

**Executive Summary (cycle 63 corrections):** Significant CI improvements since the 2026-04-20 review have resolved most HIGH findings. The PR workflow (`integration-harness.yml`) now runs the full Python test suite, a `lint` job with ruff + bundle verification, artifact upload, and a `pr-summary` job that posts failure comments. CodeQL, JS tests, and the HTML harness have been extracted into reusable workflows, substantially reducing YAML duplication. The full workflow now runs on `feature/multi-user-deployment` in addition to `main`. Concurrency cancel groups were added in cycle 63. Two remaining genuine gaps: coverage publishing (F-05, no coverage threshold enforcement in CI) and some residual Python setup duplication between the two workflows.

---

## 1. Pipeline Topology

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Separate PR and full workflows | ✅ Pass | `.github/workflows/integration-harness.yml`; `.github/workflows/full-integration.yml` | PR workflow runs full Python suite, lint, JS tests, HTML harness. Full workflow adds Playwright E2E and `python-full` with server stub. |
| Mainline automation | ✅ Pass | `.github/workflows/full-integration.yml:10-15` | `push` to `main` and `feature/multi-user-deployment`, nightly schedule, and manual dispatch are all covered. |
| PR automation | ✅ Pass | `.github/workflows/integration-harness.yml` | PRs now get CodeQL, full Python suite (`tests/ --ignore=tests/ui`), JS tests, ruff lint, bundle build verification, HTML harness, and a failure-digest PR comment. |
| Branch coverage strategy | ✅ Pass | `.github/workflows/full-integration.yml:11` | Full workflow now triggers on `feature/multi-user-deployment` in addition to `main`. Was ❌ Fail in initial review. |

---

## 2. Build And Dependency Management

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Node dependency install | ✅ Pass | `.github/workflows/integration-harness.yml:73-90`; `.github/workflows/full-integration.yml:77-94` | Root `package.json` is used consistently for JS tests and the integration harness. |
| Python dependency install | ⚠️ Partial | `.github/workflows/integration-harness.yml:52-63`; `.github/workflows/full-integration.yml:56-67,146-154,201-209`; `scripts/requirements.txt:1-37` | CI uses pip-only installs from `scripts/requirements.txt`, which is practical but diverges from local `cvgen`/conda guidance in repo instructions. |
| Caching | ✅ Pass | `.github/workflows/integration-harness.yml:77-83,104-110`; `.github/workflows/full-integration.yml:81-87,108-114,140-145,195-200` | npm and pip caches are configured in the heavier paths. |
| Build verification | ⚠️ Partial | `package.json:7-15` | There is a `build` script, but no workflow step explicitly verifies `npm run build` or catches stale/generated asset drift on PRs. |

---

## 3. Test Execution Fidelity

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| JS unit coverage in CI | ✅ Pass | `.github/workflows/integration-harness.yml:72-90`; `.github/workflows/full-integration.yml:76-94` | `npm run test:js` runs in both workflows. |
| HTML harness in CI | ✅ Pass | `.github/workflows/integration-harness.yml:99-121`; `.github/workflows/full-integration.yml:103-125` | The browser-facing integration harness is automated. |
| Broader Python regression suite | ✅ Pass | `.github/workflows/integration-harness.yml` (python-tests job) | PR workflow now runs `python -m pytest tests/ --ignore=tests/ui` — the full non-UI suite. Was ⚠️ Partial. |
| Playwright E2E | ⚠️ Partial | `.github/workflows/full-integration.yml` (playwright-e2e job) | Playwright E2E runs in the full workflow on push/nightly. Not exercised on PRs (by design — requires running server). |
| PR-time regression confidence | ✅ Pass | `.github/workflows/integration-harness.yml` (python-tests job) | PR workflow runs the full `tests/ --ignore=tests/ui` suite with junit artifact upload. Was ❌ Fail. |

---

## 4. Security And Quality Gates

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| CodeQL coverage | ✅ Pass | `.github/workflows/integration-harness.yml:19-42`; `.github/workflows/full-integration.yml:23-46`; `.github/codeql/codeql-config.yml:1-8` | Security scanning is integrated in both workflows with a repo-specific CodeQL config. |
| Lint/typecheck gates | ✅ Pass | `.github/workflows/integration-harness.yml` (lint job) | PR workflow `lint` job runs `ruff check scripts/` and `npm run build` (bundle verification). Was ❌ Fail. |
| Coverage reporting | ⚠️ Partial | `package.json:11-13`; `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` | Coverage tooling exists locally (`test:js:cover`), but CI does not publish coverage or enforce thresholds. |

---

## 5. Reporting, Reuse, And Maintainability

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Artifact upload in full workflow | ✅ Pass | `.github/workflows/full-integration.yml:176-185,219-223` | The full workflow uploads Python and Playwright artifacts. |
| Artifact upload in PR workflow | ✅ Pass | `.github/workflows/integration-harness.yml` (python-tests job) | PR workflow uploads Python test results artifact. Was ⚠️ Partial. |
| Workflow deduplication | ⚠️ Partial | `.github/workflows/reusable-codeql.yml`, `reusable-js-unit-tests.yml`, `reusable-html-harness.yml` | CodeQL, JS tests, and HTML harness extracted to reusable workflows — significant improvement. Residual duplication: Python setup steps still repeated across both files. Was ❌ Fail. |
| Concurrency control | ✅ Pass | `.github/workflows/integration-harness.yml:13-15`; `.github/workflows/full-integration.yml:18-20` | Concurrency `cancel-in-progress` added to both workflows in cycle 63. Was ⚠️ Partial. |

---

## 6. External Contributor / Open Source Readiness

_Added 2026-07-02, ahead of inviting outside users/contributors to the project._

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Fork-PR trigger safety | ✅ Pass | `.github/workflows/integration-harness.yml:9-11` | Uses `pull_request` (not `pull_request_target`), the safe default — a fork PR's workflow run gets a read-only `GITHUB_TOKEN` and cannot access repository secrets or push to the base repo, avoiding the classic fork-PR privilege-escalation footgun. |
| Secrets exposure to fork PRs | ✅ Pass | `.github/workflows/*.yml` (grep for `secrets\.` across all 5 workflow files: zero matches) | No workflow references any `secrets.*` context at all, so there is nothing that could leak to a fork PR's run even if the trigger were less safe than it is. |
| `CONTRIBUTING.md` | ✅ Pass | `CONTRIBUTING.md` (added, GAP-296 RESOLVED cycle 37) | Covers local setup, test-running, JS build, coding conventions, the data-contract-maintenance rule, commit style, and PR workflow. |
| Issue / PR templates | ✅ Pass | `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md` (added, GAP-296 RESOLVED cycle 37) | New contributors now get structured PR/issue forms instead of GitHub's blank defaults. |
| `CODE_OF_CONDUCT.md` | ✅ Pass | `CODE_OF_CONDUCT.md` (added, GAP-296 RESOLVED cycle 37, Contributor Covenant v2.1) | Community conduct expectations now stated. |
| README contributor path | ✅ Pass | `README.md` (brief Contributing section added, GAP-296 RESOLVED cycle 37, pointing to `CONTRIBUTING.md`/`CODE_OF_CONDUCT.md`) | See also `tasks/user-story-marketing.md` US-MK3 for the same gap from a positioning angle — resolved here from the process angle. |
| PR-time failure clarity for a first-time contributor | ✅ Pass | `.github/workflows/integration-harness.yml` (pr-summary job) | `pr-summary` job (GAP-297, cycle 39) writes a pass/fail table to `$GITHUB_STEP_SUMMARY` and posts a PR comment listing failed jobs with Action log links when any check fails. Was ⚠️ Partial. |

---

## 7. Findings Summary

| ID | Severity | Area | Finding | Evidence |
|----|----------|------|---------|----------|
| F-01 | HIGH | Pipeline Coverage | RESOLVED — PR workflow now runs full Python suite (`tests/ --ignore=tests/ui`) + lint + artifact upload. | resolved cycle 39+ |
| F-02 | HIGH | Branch Strategy | RESOLVED — full workflow now triggers on `feature/multi-user-deployment` in addition to `main`. | resolved cycle 39+ |
| F-03 | HIGH | Quality Gates | RESOLVED — `lint` job in PR workflow runs `ruff check scripts/` + `npm run build` (bundle verification). | resolved cycle 39+ |
| F-04 | MEDIUM | Maintainability | PARTIAL — CodeQL, JS tests, HTML harness extracted to reusable workflows; residual Python setup duplication remains. | `.github/workflows/reusable-*.yml` |
| F-05 | MEDIUM | Feedback Quality | OPEN — CI does not publish coverage results or enforce coverage thresholds. | `package.json:11-13` |
| F-06 | MEDIUM | Reporting | RESOLVED — PR workflow uploads Python test results artifact (python-pr-results). | resolved cycle 39+ |
| F-07 | MEDIUM | CI Parity | DEFERRED — pip-only CI install is intentional (Docker deployment uses pip-only). Local conda/cvgen skew documented in `CONTRIBUTING.md`. | by design |
| F-08 | LOW | Efficiency | RESOLVED — `concurrency: cancel-in-progress` added to both workflows in cycle 63. | resolved cycle 63 |
| F-09 | HIGH | Contributor Onboarding | RESOLVED (GAP-296, cycle 37) — `CONTRIBUTING.md`, issue/PR templates, and `CODE_OF_CONDUCT.md` added; README now has a contributor-facing section. | `CONTRIBUTING.md`; `.github/` |
| F-10 | LOW | Contributor Feedback | RESOLVED (GAP-297, cycle 39) — `pr-summary` job writes pass/fail table to step summary and posts failure comment on PR. | resolved cycle 39 |

---

## 8. Proposed New Story Items / Gaps

| GAP ID | Area | Description | Rationale |
|--------|------|-------------|-----------|
| GAP-66 | CI Coverage | Run the broader non-UI Python regression suite on `pull_request`, not only in the full `main` workflow | Addresses F-01 |
| GAP-67 | Branch Protection | Extend the full workflow to `devel` (or the actual protected development branch) so pre-merge development gets full regression coverage | Addresses F-02 |
| GAP-68 | Quality Gates | Add `ruff`, `mypy`, and frontend build verification to GitHub Actions | Addresses F-03 |
| GAP-69 | Workflow Maintainability | Refactor shared workflow logic into a reusable workflow or composite action to eliminate YAML duplication | Addresses F-04 |
| GAP-70 | CI Feedback | Publish coverage/artifacts on PR runs and optionally enforce minimum coverage thresholds | Addresses F-05 and F-06 |
| GAP-71 | Environment Parity | Reduce CI/local skew by documenting or automating a closer match between pip-only CI and the local `cvgen` environment | Addresses F-07 |
| GAP-296 | Contributor Onboarding | **RESOLVED cycle 37.** Added `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/*`, and a README contributor section. | Addressed F-09 — was the highest-severity finding for the project's move to accepting outside contributors |
| GAP-297 | Contributor Feedback | Add PR-time job summaries or a failure-digest comment so a first-time contributor doesn't have to parse raw Actions logs to understand why a check failed | Addresses F-10 |

_Note: gap numbers above (GAP-66–GAP-71) mirror entries already promoted into the canonical tracker `tasks/gaps.md`; GAP-296/GAP-297 were numbered to follow the tracker's current highest entry (GAP-295) to avoid colliding with unrelated existing GAP-72/GAP-73 (workflow step pill keyboard/aria-live gaps, unrelated to this persona's findings)._