<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Fixture Layout Review Automation Readiness

**Last Updated:** 2026-03-24 23:34 EDT

**Executive Summary:** The workflow is ready for a minimal local entry point but not yet for CI gating. The smallest automation surface that adds value without distorting the design is a thin Python wrapper around `tests.helpers.fixture_review.generate_fixture_review_bundle`, while persona review authoring and rollup curation remain manual.

## Decision

**Go** for a local script entry point.

**No-Go** for CI or release gating in the current state.

## Why Local Automation Is Ready

1. Repository-owned inputs are stable.
2. The bundle manifest contract is tested.
3. The normalized exports are deterministic except for the optional screenshot dependency, which is explicitly recorded.
4. The first manual review cycle already produced usable persona files and a timestamped rollup.

## Why CI Is Not Ready Yet

1. Persona findings still require human judgment.
2. The duplicate Technical Skills defect shows the review heuristics are still evolving.
3. Chromium availability would create an avoidable source of flaky CI pressure before the review rubric is stable.

## Smallest Approved Automation Surface

Use the local script below:

```bash
/usr/local/Caskroom/miniconda/base/envs/cvgen/bin/python scripts/generate_fixture_review_bundle.py --output-dir test_output/fixture-review-bundle
```

## Future Expansion Path

1. Add automated structural checks for duplicate section headings and oversized blank first-page regions.
2. Expand the bundle run from `complex` only to `simple`, `medium`, and `complex` in one shared rollup.
3. Revisit CI only after the automated checks cover the highest-value structural failures and the manual rubric stops changing frequently.
