<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Fixture Layout Review Workflow

**Last Updated:** 2026-03-25 11:45 EDT

**Executive Summary:** This workflow generates a repository-owned review bundle for issue #59 using the `complex` example profile and the canonical engineering job fixture. The bundle now includes raw generated artifacts plus normalized exports for layout review: structure outline, plain text, and a browser screenshot when Playwright Chromium is installed.

## Prerequisites

1. Use the `cvgen` conda environment.
2. Install Playwright Chromium for `normalized/render.png` output:

```bash
playwright install chromium
```

If Chromium is unavailable, the helper still writes the raw artifacts and normalized text exports, and records the missing browser dependency in `normalized/render-status.txt`.

## Generate A Bundle

Run this from the repository root:

```bash
/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python -c "from pathlib import Path; from tests.helpers.fixture_review import generate_fixture_review_bundle; manifest = generate_fixture_review_bundle(Path('test_output/fixture-review-bundle')); print(manifest['bundle']['root'])"
```

## Bundle Layout

- `fixture-review-manifest.json`: canonical manifest for the run.
- `raw/`: generated HTML, PDF, ATS DOCX, human DOCX, metadata, and job description text.
- `normalized/structure-outline.txt`: section-level outline derived from generated HTML.
- `normalized/plain-text.txt`: extracted plain-text view of the HTML.
- `normalized/render.png`: browser screenshot of the HTML when Chromium is installed.
- `normalized/render-status.txt`: notes whether screenshot export succeeded or was skipped.

## Reproducibility Notes

1. The helper uses only repository-owned inputs: `tests/fixtures/example_profiles/complex` and `tests/fixtures/fixture_job_engineering.json`.
2. The manifest records both fixture sources and every generated artifact path.
3. Screenshot export is the only environment-sensitive step; the status file captures that dependency explicitly.
