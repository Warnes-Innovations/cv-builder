<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Lessons

- 2026-03-24: Keep direct master-data CRUD and harvest write-back as separate policy concepts. Direct master edits are allowed in the pre-job (`init`) and post-job (`refinement`) windows, but `POST /api/harvest/apply` remains post-job only.
