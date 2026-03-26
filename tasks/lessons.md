<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Lessons

- 2026-03-24: Keep direct master-data CRUD and harvest write-back as separate policy concepts. Direct master edits are allowed in the pre-job (`init`) and post-job (`refinement`) windows, but `POST /api/harvest/apply` remains post-job only.
- 2026-03-24: When mutating Monte Carlo resume lists, avoid hard minimum expansion for tiny source lists and keep achievement/job-bullet transformations symmetric so training samples stay plausible.
- 2026-03-25: Keep skill-group retargeting aligned with achievement/job-bullet behavior, and make publication focusing use an explicit bounded reduction window instead of ad hoc item deletion.
- 2026-03-24: Before continuing work in an existing worktree, verify it is not already serving another active agent task; if there is any doubt, create a fresh linked worktree under `worktrees/` and port only task-specific changes.
- 2026-03-25: If later-page sidebar content must begin on page 2, do not let the page-one container auto-flow through subsequent print pages; keep page one bounded and render continuation content from a separate page container with cloned fragment background styling.
- 2026-03-25: When synthetic page wrappers keep causing pagination defects, prefer a single flowing two-column layout with `break-inside` guards on skill groups, job entries, and publication items instead of hard-splitting content into page-one/page-two containers.
- 2026-03-25: For multi-page print layouts, do not rely on a flowing content container's background to fill the final page fragment; use a fixed print-time backdrop when the sidebar color must span the full page height and margins on every page.
- 2026-03-25: In WeasyPrint, a fixed `body::before` backdrop may disappear entirely in the PDF. When the tint must cover the full page and margins, paint it in the `@page` background instead of a fixed pseudo-element.
- 2026-03-25: For print backdrops that must survive WeasyPrint and Chrome fragmentation, use a real fixed DOM element in the document body; fragmented `.page` or `.left-col` backgrounds and pseudo-element backdrops are not reliable enough.
- 2026-03-25: If Chrome's fixed print backdrop drifts past the sidebar edge, anchor it to the printable content box (`top/left = page margin`, `width = content width * sidebar ratio`) instead of spanning from paper edge to computed divider.
- 2026-03-25: If fixed or page-level tint layers still misalign across renderers, remove them and let the printable `.left-col` own the sidebar color directly, with page-height `min-height` and `box-decoration-break: clone` to stabilize multi-page fragments.
- 2026-03-25: If a single flowing print layout still causes page-one sidebar fragments to bleed into later pages, split the print DOM into a bounded first page and a separate continuation page; later-page sidebar paint is more reliable when Chrome and WeasyPrint fragment different containers instead of one shared two-column flow.
