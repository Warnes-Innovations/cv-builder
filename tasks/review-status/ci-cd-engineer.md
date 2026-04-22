<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# CI/CD Engineer Review Status

**Last Updated:** 2026-04-20

**Reviewer Persona:** Expert CI/CD Engineer

**Scope:** GitHub Actions CI/CD processes, workflow design, dependency setup, security gates, reporting, branch coverage

**Executive Summary:** The repository has a real CI foundation: CodeQL runs on both PR and mainline workflows, JS tests run in CI, the HTML harness is automated, and the full workflow includes a broader Python suite plus Playwright E2E. The main weakness is coverage topology rather than tooling choice. Pull requests only get a reduced workflow, the broader suite runs only on `main` and nightly/manual triggers, there is no lint/typecheck gate, and the two workflows duplicate large sections of YAML that are likely to drift over time.

---

## 1. Pipeline Topology

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Separate PR and full workflows | ⚠️ Partial | `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` | There is a clear fast-path vs. full-path split, but the split is wide enough that important regressions can miss PR-time detection. |
| Mainline automation | ✅ Pass | `.github/workflows/full-integration.yml:10-15` | `push` to `main`, nightly schedule, and manual dispatch are all covered. |
| PR automation | ✅ Pass | `.github/workflows/integration-harness.yml:10-11` | PRs get CodeQL, Python tests, JS tests, and the HTML integration harness. |
| Branch coverage strategy | ❌ Fail | `.github/workflows/full-integration.yml:10-11` | The full workflow only runs on `main` pushes, not on `devel` or PRs, so normal development work is gated by a narrower suite. |

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
| Broader Python regression suite | ⚠️ Partial | `.github/workflows/full-integration.yml:129-185` | A larger non-UI suite exists, but it only runs in the full workflow on `main`/nightly/manual. |
| Playwright E2E | ⚠️ Partial | `.github/workflows/full-integration.yml:187-223`; `tests/ui/conftest.py:54-165` | Playwright E2E exists and the test fixture can self-start the Flask app, but this path is not exercised on PRs. |
| PR-time regression confidence | ❌ Fail | `.github/workflows/integration-harness.yml:52-63` | The PR workflow runs `tests/unit` plus a short allowlist, not the broader `tests/ --ignore=tests/ui` suite used later in the full workflow. |

---

## 4. Security And Quality Gates

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| CodeQL coverage | ✅ Pass | `.github/workflows/integration-harness.yml:19-42`; `.github/workflows/full-integration.yml:23-46`; `.github/codeql/codeql-config.yml:1-8` | Security scanning is integrated in both workflows with a repo-specific CodeQL config. |
| Lint/typecheck gates | ❌ Fail | `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` | Neither workflow runs `ruff`, `mypy`, or a frontend lint/build-verification step. |
| Coverage reporting | ⚠️ Partial | `package.json:11-13`; `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` | Coverage tooling exists locally (`test:js:cover`), but CI does not publish coverage or enforce thresholds. |

---

## 5. Reporting, Reuse, And Maintainability

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Artifact upload in full workflow | ✅ Pass | `.github/workflows/full-integration.yml:176-185,219-223` | The full workflow uploads Python and Playwright artifacts. |
| Artifact upload in PR workflow | ⚠️ Partial | `.github/workflows/integration-harness.yml:1-121` | The PR workflow uploads nothing, which makes failure triage slower. |
| Workflow deduplication | ❌ Fail | `.github/workflows/integration-harness.yml:19-121`; `.github/workflows/full-integration.yml:23-125` | CodeQL, Python setup, JS setup, npm cache, and harness steps are duplicated across both files rather than shared via reusable workflow/composite action. |
| Concurrency control | ⚠️ Partial | `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` | No `concurrency` group is defined, so superseded pushes/PR updates do not automatically cancel older runs. |

---

## 6. Findings Summary

| ID | Severity | Area | Finding | Evidence |
|----|----------|------|---------|----------|
| F-01 | HIGH | Pipeline Coverage | Full regression coverage does not run on PRs; PRs get only the reduced harness workflow | `.github/workflows/integration-harness.yml:10-121`; `.github/workflows/full-integration.yml:129-223` |
| F-02 | HIGH | Branch Strategy | The full workflow triggers only on pushes to `main`, so `devel` work is not protected by the broadest suite | `.github/workflows/full-integration.yml:10-15` |
| F-03 | HIGH | Quality Gates | No lint or typecheck job runs in GitHub Actions | `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` |
| F-04 | MEDIUM | Maintainability | Large parts of the PR and full workflows are duplicated, increasing drift risk | `.github/workflows/integration-harness.yml:19-121`; `.github/workflows/full-integration.yml:23-125` |
| F-05 | MEDIUM | Feedback Quality | CI does not publish coverage results or enforce coverage thresholds even though local coverage scripts exist | `package.json:11-13`; `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` |
| F-06 | MEDIUM | Reporting | The PR workflow does not upload junit/trace-style artifacts for failures | `.github/workflows/integration-harness.yml:1-121` |
| F-07 | MEDIUM | CI Parity | Python CI installs from pip requirements rather than the repo’s preferred local `cvgen` environment, which increases environment skew risk | `.github/workflows/integration-harness.yml:52-63`; `.github/workflows/full-integration.yml:56-67`; `scripts/requirements.txt:1-37` |
| F-08 | LOW | Efficiency | No `concurrency` cancellation is configured for superseded runs | `.github/workflows/integration-harness.yml:1-121`; `.github/workflows/full-integration.yml:1-223` |

---

## 7. Proposed New Story Items / Gaps

| GAP ID | Area | Description | Rationale |
|--------|------|-------------|-----------|
| GAP-66 | CI Coverage | Run the broader non-UI Python regression suite on `pull_request`, not only in the full `main` workflow | Addresses F-01 |
| GAP-67 | Branch Protection | Extend the full workflow to `devel` (or the actual protected development branch) so pre-merge development gets full regression coverage | Addresses F-02 |
| GAP-68 | Quality Gates | Add `ruff`, `mypy`, and frontend build verification to GitHub Actions | Addresses F-03 |
| GAP-69 | Workflow Maintainability | Refactor shared workflow logic into a reusable workflow or composite action to eliminate YAML duplication | Addresses F-04 |
| GAP-70 | CI Feedback | Publish coverage/artifacts on PR runs and optionally enforce minimum coverage thresholds | Addresses F-05 and F-06 |
| GAP-71 | Environment Parity | Reduce CI/local skew by documenting or automating a closer match between pip-only CI and the local `cvgen` environment | Addresses F-07 |