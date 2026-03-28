<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

## Summary

The generated benchmark resume output has multiple layout and conditional-rendering defects in both the HTML and PDF outputs.

Artifacts observed:
- `/var/folders/nw/lgv92wzj5m5ch7s4ylsf7bv00000gs/T/cv_render_out_wm2caw3n/benchmark_cv.html`
- `/var/folders/nw/lgv92wzj5m5ch7s4ylsf7bv00000gs/T/cv_render_out_wm2caw3n/benchmark_cv.pdf`

These files were produced by the benchmark/render flow and appear to reflect template/layout logic problems rather than one-off manual edits.

## Observed Problems

1. `Selected Achievements` is empty.
2. The LinkedIn and homepage elements are rendered even when empty; they should only be displayed when non-empty.
3. `Experience` should start immediately after `Selected Achievements`, unless there is not enough room for the `Experience` header and the complete first experience entry.
4. `Selected Publications` should start immediately after `Experience`, unless there is not enough room for the `Selected Publications` header and at least two complete citations.
5. `Technical Skills` should start immediately after `Languages` and `Languages` itself should only be displayed when non-empty. If there is not enough room for the `Technical Skills` header plus two complete skill groups on page one, the skills section should move to the next page. Skill groups should never be split across pages.
6. There is a page containing the left bar with the `Technical Skills` title and nothing else in both the HTML and PDF. That page container should likely be removed, allowing the columns to wrap naturally if they overflow the page.
7. The PDF contains blank page 2 and blank page 4.
8. The generated output has no page numbers.

## Expected Behavior

- Empty optional fields and sections should not render.
- Major sections should flow immediately after the prior section whenever enough room exists.
- Sections should only move to the next page when their minimum viable content block cannot fit.
- Skill groups and required minimum content blocks should not be split in ways that produce orphan headers, empty sidebars, or blank pages.
- PDF output should not contain blank pages.
- Generated resumes should include page numbers.

## Suggested Investigation Areas

- Conditional rendering in the Jinja template for LinkedIn, homepage, languages, and achievements
- Page/container structure in `templates/cv-template.html`
- Pagination and overflow behavior for left/right columns in HTML and PDF renderers
- Rules for keeping section headers with minimum following content
- PDF renderer behavior when empty or nearly empty page containers are emitted
- Page-number rendering for both HTML preview and PDF output

## Reproduction Context

Observed in the generated benchmark artifacts listed above on March 24, 2026.