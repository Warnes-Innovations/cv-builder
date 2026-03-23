<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Example Profile Tiers

These fixture profiles are intended to exercise the CV workflow across a clear
complexity gradient.

- `simple/`: compact but realistic profile data for smoke tests and baseline UI
  flows. It should contain enough supporting detail to avoid toy-data behavior,
  while remaining easy to inspect by hand.
- `medium/`: richer professional history with more bullets, more supporting
  sections, and more structured metadata. It should resemble a credible real CV
  without the breadth and depth of the largest fixture.
- `complex/`: high-density profile and bibliography data intended to be broadly
  comparable to Dr. Greg's real master data and publications files in shape and
  scale.

When updating these fixtures, preserve the intentional gradient:

1. `simple` should stay lightweight.
2. `medium` should be materially richer than `simple`.
3. `complex` should remain substantially broader than `medium`.
