<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-06-29 19:30 ET

**Executive Summary:** Cycle 8 source-first review against all seven specified
files. Three post-cycle-7 commits affect design criteria: `664750d` (cycle 7
close) resolved GAP-182 by defining `.action-btn.secondary` in `styles.css` lines
590–591; `b7fb7c5` adds colour-coded application-status badges to the sessions modal
(Draft grey / Ready blue / Sent green) via `session-switcher-ui.js`; `162dedc`
refines the session-conflict banner to suppress false-positive fires on
phase-enforcement 409s — a behavioural fix with no CSS changes; `f2a0bbf` adds a
"Generated {date}" label to each download card. Net delta: GAP-G4
(`.action-btn.secondary` undefined) is resolved; sessions modal gains a new
semantic status badge surface. D1 (no CSS token layer), D2 (button class
proliferation), D3 (emoji nav), and D5 (template divergence) remain open and
unchanged. Inline `style=""` count in `index.html`: 218 (stable). Net result:
**5 Pass / 7 Partial / 0 Fail** on story criteria — same total as Cycle 7, but
GAP-G4 is closed and sessions modal receives a Pass-tier addendum on AC 2.2.

---

## Cycle 8 Delta Assessment

Compared to Cycle 7 (`tasks/review-status/graphical-designer.md`, updated
2026-06-22 22:30 ET), the following design-relevant changes are confirmed from
source inspection of commits since `664750d`:

**Post-cycle-7 commits inspected (design-relevant):**

| Commit | Description | Design impact |
| ------ | ----------- | ------------- |
| `664750d` | GAP-182: define `.action-btn.secondary` CSS rule | Resolves GAP-G4; 8 elements now styled correctly |
| `b7fb7c5` | GAP-102: sessions modal application status badge | New semantic colour badge surface (Draft/Ready/Sent) |
| `162dedc` | GAP-93: phase-enforcement 409 suppresses conflict banner | Behavioural fix; no CSS change |
| `f2a0bbf` | GAP-106: show generation timestamp on download cards | Adds "Generated {date}" label to each download row |

**GAP-182 fix — `.action-btn.secondary` now defined:**

`styles.css` lines 590–591 now contain:
```css
.action-btn.secondary { background: #e2e8f0; color: #374151; border-color: #94a3b8; }
.action-btn.secondary:hover:not(:disabled) { background: #cbd5e1; }
```
This closes GAP-G4. The eight elements that previously silently fell back to
base `.action-btn` grey (including the "Cancel" button in the confirm modal,
`index.html` line 307) now render with a medium-grey background that visually
distinguishes them from pure ghost/default buttons.

**GAP-102 fix — sessions modal status badge:**

`web/session-switcher-ui.js` `_renderSessionTableRow()` now emits a
colour-coded status pill inside the phase column:
- **Draft** → grey `#e2e8f0` background / `#374151` text
- **Ready** → blue `#dbeafe` background / `#1d4ed8` text
- **Sent** → green `#dcfce7` background / `#166534` text

These are inline colour pairs injected via JS (not via a stylesheet class).
They follow the same semantic palette used for workflow step pills and ATS
badges, which is coherent with AC 2.2.

**GAP-106 fix — download card timestamp label:**

`web/download-tab.js` `_renderDownloadGrid()` now accepts a `generatedAt`
parameter from `populateDownloadTab()` and appends a small grey "Generated
{date}" label (`font-size: 12px; color: #64748b`) beneath each download item's
description. This improves file-currency communication at the file-review
surface (AC 3.3).

**No new CSS-layer additions:**

`grep ":root" web/styles.css` → 0 matches. Distinct hex literal count: 96
(styles.css only). `grep -c 'style="' web/index.html` → 218 (stable). D1 and
D2 remain open.

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

**Status: ⚠️ Partial**

The stylesheet provides a functional typographic hierarchy in the document viewer
(`styles.css` lines 684–689): `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body
`p` 14px/line-height 1.6. Header app title is 20px/600 (`styles.css` line 21);
conversation panel title 18px/600 (line 374).

Three weaknesses persist:

1. **No shared typographic scale.** No `:root {}` token block. Helper-text sizes
   (`11px`, `12px`, `13px`, `14px`, `15px`) recur independently across components.
   Header pill buttons specify `font-size: 13px` as a bare CSS literal
   (`styles.css` line 64).

2. **Position-bar action buttons use raw inline styles.** The "Master CV", "ATS
   Report", and "Job Analysis" buttons (`index.html` lines 101–105) carry
   `style="background:#f1f5f9;border:1px solid #e2e8f0;…font-size:0.8em;padding:2px
   7px;line-height:1.6;"` inline — rendering meaningful workflow entry points at
   sub-tertiary visual weight.

3. **Helper text from JS is outside the stylesheet.** `_setConnectionMessage()` in
   `app.js` (lines 16–39) applies `content.style.color`, `content.style.background`,
   `content.style.borderColor` as inline JS properties for the connection status
   pill — a surface outside the CSS layer.

No change in this cycle.

---

#### AC 1.2 — Primary actions are consistently prominent

**Status: ⚠️ Partial**

`.action-btn.primary` (`styles.css` lines 588–589) correctly delivers
`background: #3b82f6; color: #fff; border-color: #3b82f6` at `font-size: 14px`.

**Improvement (GAP-182, Cycle 7):** `.action-btn.secondary` is now defined at
`styles.css` lines 590–591. The Cancel button in the confirm modal (`index.html`
line 307) and the eight other elements that previously fell back to base grey now
render with a deliberate medium-grey visual weight (`#e2e8f0` background /
`#374151` text / `#94a3b8` border), distinct from both primary blue and
ghost-style default buttons.

Persistent inconsistencies:

- Five remaining parallel classes for the primary blue button role: `.btn-primary`
  (line 1302), `.submit-btn` (line 1215), `.editor-btn` (line 861), `.continue-btn`
  (line 1219), `.layout-action-btn` (line 1435), `.modal-btn` (line 946) — each
  independently specifying geometry; border-radius ranges from 4px to 10px.
- The interaction-area action strip (`index.html` lines 182–190) contains nine
  `.action-btn.primary` buttons managed via `display:none` state toggling. Only
  one visible at a time, but the flat HTML structure provides no secondary-emphasis
  tier.

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

**Status: ✅ Pass**

The rewrite review panel handles density well. `.rewrite-card` (`styles.css` line
1237: `border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc`) with
`.accepted` (green `#10b981` border) and `.rejected` (red `#f87171` border, 0.7
opacity) provide strong visual state differentiation. Inline diff markup with
`del.diff-removed` (red text on `#fee2e2`) and `ins.diff-added` (green text on
`#dcfce7`) at lines 1246–1247 supports rapid comprehension. The sticky tally bar
(`position: sticky; top: 0; z-index: 10`, line 1231) anchors tally context during
scroll. The `[data-changed="true"]` animation (`styles.css` lines 1537–1547) adds
a 1.5s amber pulse on re-run changed items.

No change in this cycle.

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

**Status: ⚠️ Partial**

The palette remains a blue-anchored neutral system (Tailwind Slate + Blue).
Semantic state colours are consistently applied: active blue `#dbeafe/#1d4ed8`,
complete green `#dcfce7/#166534`, stale amber `#fffbeb/#92400e`, error red
`#fef2f2/#b91c1c`. Applied faithfully in workflow step pills (`styles.css` lines
150–156), freshness chips (lines 119–121), layout-status cards (lines 1425–1428),
confidence badges (lines 700–722), rewrite cards (lines 1237–1239), toast variants
(lines 1224–1228), and the `[data-changed="true"]` animation (lines 1537–1547).

The sessions modal status badges (GAP-102, `b7fb7c5`) follow the same semantic
palette coherently: Draft grey matches `.action-btn.secondary`, Ready blue matches
ATS badge `#dbeafe/#1d4ed8`, Sent green matches `.step.completed`.

The visual ceiling remains utilitarian. The dark header bar is flat. 96 distinct
hex literals remain hardcoded with no `:root {}` indirection. The master-profile
card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1463) is the
sole decorative gradient in the app shell.

No net change in overall criterion status.

---

**US-G1 Summary:**

| Criterion | Status |
| --------- | ------ |
| 1.1 Heading hierarchy distinct | ⚠️ Partial |
| 1.2 Primary actions prominent | ⚠️ Partial |
| 1.3 Dense surfaces readable | ✅ Pass |
| 1.4 Colour supports usability and attractiveness | ⚠️ Partial |

Acceptance Criteria verdict: **⚠️ Partial** — hierarchy is functional on sparse
surfaces; degrades where multiple primary-weight controls co-exist or where
position-bar entry-point buttons are rendered at sub-tertiary weight.

---

### US-G2: Cross-Stage Visual Consistency

#### AC 2.1 — Repeated control types share consistent styling

**Status: ⚠️ Partial**

Button proliferation is partially reduced. `.action-btn.secondary` is now defined
(`styles.css` lines 590–591), closing the silent-fallback gap (GAP-G4). However,
five remaining primary-role classes (`.btn-primary`, `.submit-btn`, `.editor-btn`,
`.continue-btn`, `.modal-btn`) still specify geometry independently. Tab underline
pattern continues to be implemented three times independently: `.tab` (`styles.css`
lines 626–635), `.review-subtab` (lines 665–679), `.input-tab` (lines 1295–1297)
— same active-underline concept, independently specified padding and font-size
values.

Improvement from Cycle 7: GAP-G4 resolved; one source of inconsistency closed.

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

**Status: ✅ Pass**

The semantic state colour mapping remains consistent and now extends to the
sessions modal:

- Active / in-progress: blue (`#dbeafe/#1d4ed8`)
- Completed / success / Sent: green (`#dcfce7/#166534`)
- Stale / warning: amber (`#fffbeb/#92400e`)
- Critical / error: red (`#fef2f2/#b91c1c`)
- Draft / unclaimed: grey (`#e2e8f0/#374151`)

Applied in: workflow steps (lines 150–156), freshness chips (lines 119–121),
layout status cards (lines 1425–1428), confidence badges (lines 700–722), rewrite
cards (lines 1237–1239), toast variants (lines 1224–1228), ATS score badge
(lines 102–104), sessions modal status badges (`session-switcher-ui.js`
`_renderSessionTableRow()`). No palette drift detected.

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

**Status: ⚠️ Partial**

Inline `style=""` count in `index.html` is 218 (unchanged since Cycle 4).
Modal bodies, settings fields, onboarding steps, and the LLM wizard continue to
use inline styles extensively. The confirm-dialog built via JS string injection
in `ui-core.js` uses fully hardcoded inline styles and cannot be themed or
overridden via the stylesheet. `_setConnectionMessage()` in `app.js` (lines
16–39) applies colour as inline JS properties for the connection status pill.

The sessions modal status badges (`b7fb7c5`) also inject colour pairs as inline
JS style strings rather than as CSS classes, continuing this pattern.

No change in overall visual consistency status this cycle.

---

#### AC 2.4 — Familiar, standard interaction patterns

**Status: ✅ Pass**

All standard patterns are correctly applied:

- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267)
- Tab-based navigation with active underline and WCAG arrow-key traversal
  (`ui-core.js` lines 528–554)
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, `gap: 8px` stack, `styles.css` line 1223)
- Focus trap and focus restoration in modals (`ui-core.js` lines 260–347)
- Session conflict banner with retry and dismiss affordances; now correctly
  suppressed for phase-enforcement 409s (`162dedc`; `ui-core.js` lines 451–478)
- Keyboard-accessible workflow step pills — Enter/Space keydown handlers in
  `ui-core.js` (`updateWorkflowStepsClickable()` lines 1891–1975)
- `#llm-busy-label` carries `aria-live="polite" role="status"` (`index.html` line
  155) — assistive technology users receive LLM operation status announcements
- Step-rerun ↻ button is visible at rest (opacity 0.35) and reaches full opacity
  on hover/focus-within (`styles.css` line 143–144 with `:hover` rule)

No novel interaction patterns introduced without reason.

---

**US-G2 Summary:**

| Criterion | Status |
| --------- | ------ |
| 2.1 Repeated controls consistent | ⚠️ Partial |
| 2.2 Status surfaces coherent | ✅ Pass |
| 2.3 Tabs, workflow bar, modals cohesive | ⚠️ Partial |
| 2.4 Standard interaction patterns | ✅ Pass |

Acceptance Criteria verdict: **⚠️ Partial** — state colour language is coherent
and well-maintained; component class structure remains fractured but GAP-G4 is now
closed.

---

### US-G3: Preview and Output Presentation Quality

#### AC 3.1 — Layout-preview area frames content clearly

**Status: ✅ Pass**

The layout review panel uses a two-pane flex structure (`styles.css` line 1371:
`display: flex; gap: 20px; height: calc(100vh - 240px)`). The preview pane
(`flex: 1 1 auto`) hosts an iframe inside `preview-iframe-container` (`border: 1px
solid #e2e8f0; border-radius: 8px; background: #f8fafc`). The loading overlay
(lines 1376–1379) shows a spinner with progressive log output during render. The
stale callout (`.layout-stale-callout`, lines 1399–1402: `background: #fffbeb;
border-left: 4px solid #f59e0b`) correctly signals when the preview is out of date.
The `layout-preview-status` block shows timestamp and revision-count information.
Responsive breakpoints collapse to vertical stacking at ≤1100px (`styles.css`
lines 1454–1460).

No change in this cycle.

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

**Status: ⚠️ Partial**

Persistent concern: the layout-settings row packs six heterogeneous controls (font-
size number input, px/pt readout span, page-margin number input, page-break
checkbox, skill-experience select, Apply button, status label) in a single
`flex-wrap: wrap` row without a section heading or visual divider separating
"document-wide settings" from the "natural-language instruction" textarea below.
Source evidence: `styles.css` line 1435 (`.layout-instruction-textarea`) and the
layout-settings row container — no group heading CSS class exists in the stylesheet.

No change in this cycle.

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

**Status: ✅ Pass**

The File Review tab uses `.download-grid` (`.download-item` flex rows: icon + info
block + green `.btn-download` CTA — `styles.css` line 1289: `background: #10b981`).
File type detection in `web/download-tab.js` yields contextually labelled
descriptions for PDF, DOCX, HTML, cover letter, and screening files.

**Improvement (GAP-106, `f2a0bbf`):** Each download card now displays a "Generated
{date}" timestamp label (`font-size: 12px; color: #64748b`) beneath the file
description. `populateDownloadTab()` reads `cvData.metadata?.generation_date` and
passes it to `_renderDownloadGrid()` as the `generatedAt` parameter. This gives
users explicit file-currency confirmation — a substantive improvement for the
file-review surface.

The ATS validation report renders in a `<details open>` collapsible with pass/warn/
fail colour-coded rows. The paper-simulation document viewer (`styles.css` line 685:
`max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px
rgba(0,0,0,0.1)`) is appropriate for the context.

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

**Status: ⚠️ Partial**

`templates/cv-template.html` provides a sound design-token layer (8 CSS custom
properties in `:root {}`), rem-based font scale anchored to a user-controllable
`base_font_size`, Inter + Merriweather typography, and a restrained 32%/68%
flex-row two-column layout. The colour scheme (dark-blue `#2c3e50`, accent
`#2980b9`, sidebar `#eef2f5`) is professional and non-distracting.

`templates/cv-style.css` (DOCX output) diverges on all dimensions documented in
GAP-132: font family (Segoe UI vs Inter/Merriweather), brand blue (`#2c5aa0` vs
`#2980b9`), layout (CSS Grid vs Flexbox), column proportions reversed, size units
(pt vs rem). No change.

---

**US-G3 Summary:**

| Criterion | Status |
| --------- | ------ |
| 3.1 Layout preview frames clearly | ✅ Pass |
| 3.2 Controls don't compete with preview | ⚠️ Partial |
| 3.3 Final file-review surfaces clean | ✅ Pass |
| 3.4 Generated materials professionally credible | ⚠️ Partial |

Acceptance Criteria verdict: **⚠️ Partial** — preview and file-review screens are
largely polished; AC 3.2 settings row grouping remains visually ambiguous; AC 3.4
blocked by divergent template systems. Download surface improved by timestamp label.

---

## Generated Materials Evaluation

### Typography

**Status: ⚠️ Partial**

`templates/cv-template.html` uses a well-constructed type system:
- Inter (weights 300/400/600/700) for body and labels; Merriweather for the name
  heading (`font-family: 'Merriweather', serif; font-size: 2.2rem;`)
- `rem`-based scale anchored to `html { font-size: <base_font_size> }`; default
  13px ≈ 9.75pt, adjustable in the layout panel
- `line-height: 1.6` on body

`templates/cv-style.css` (DOCX): `font-family: "Segoe UI", Arial, sans-serif;
font-size: 11pt; line-height: 1.4` — lower typographic quality and visually
different from the HTML template's Inter/Merriweather combination.

### Colour and Visual Identity

**Status: ⚠️ Partial**

`cv-template.html`: dark-blue scheme `--primary-color: #2c3e50`, accent
`--accent-color: #2980b9`, sidebar `--sidebar-bg: #eef2f5`. Clean, professional,
non-distracting.

`cv-style.css`: `#2c5aa0` (DOCX brand blue — 15% more saturated than HTML
template's `#2980b9`). Two documents produced from the same session carry different
brand colours with no UI disclosure.

### Layout

**Status: ✅ Pass**

The HTML template's two-column flex-row (32/68 split) is a recognised professional
resume format. Sidebar carries contact, skills, education; main column carries
experience and achievements. `page-break-inside: avoid` prevents mid-entry page
cuts. `max-width: 215.9mm` + CSS `@page { size: letter; margin: var(--page-margin); }`
correctly sized for US Letter PDF.

### Preview Fidelity

**Status: ⚠️ Partial**

The layout review iframe serves the HTML template. The `pxToPt()` helper in
`layout-instruction.js` allows designers to reason about printed font size in
points. No viewport-zoom or DPI-scale control is exposed, so at non-standard
viewports or HiDPI displays the preview may not accurately represent printed
proportions (GAP-G1, below).

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer (GAP-133)

**Status: ❌ Fail — UNCHANGED**

`web/styles.css` contains no `:root {}` block. `grep ":root" web/styles.css`
returns zero matches. Distinct hex colour literals: 96 unique values across 1609
lines. 218 inline `style=""` attributes in `index.html`. JS files (`app.js` lines
16–39, `ui-core.js` lines 99–118) add further hardcoded colour values outside the
stylesheet. Theming is structurally impossible; colour drift between components is
endemic.

Evidence: `styles.css` line 17 (`#f8fafc`), line 20 (`#1e293b`), line 77
(`#3b82f6`), etc.

### Issue D2 — Proliferation of Button Classes

**Status: ⚠️ Partial — IMPROVED**

GAP-182 is resolved: `.action-btn.secondary` is now defined at `styles.css` lines
590–591 (`background: #e2e8f0; color: #374151; border-color: #94a3b8`). The eight
elements (confirm modal Cancel, master-cv.js secondary actions) that previously
silently fell back to base grey now render with deliberate medium-grey visual weight.

However, five remaining parallel classes for primary-role blue buttons still exist
independently: `.btn-primary` (line 1302), `.submit-btn` (line 1215), `.editor-btn`
(line 861), `.continue-btn` (line 1219), `.modal-btn` (line 946). Each independently
specifies padding, border-radius, and font-size. Border-radius ranges from 4px
(position-bar inline buttons) to 10px (wizard primary close).

Status upgraded from ❌ Fail to ⚠️ Partial due to resolution of the most acute
gap (undefined secondary class).

### Issue D3 — Heavy Emoji Use in Navigation

**Status: ⚠️ Partial — UNCHANGED**

12 step elements in the workflow nav bar (`index.html` lines 119–141), each with
an emoji prefix (📥 🔍 ⚙️ ✏️ 🔤 🎨 ⬇️ 📩 📋 🎤 🙏 🌾). 25 tabs in the tab
bar (`index.html` lines 200–225), most with emoji prefixes. Header buttons include
emoji (📂, ⚙️, 📚). Emoji rendering is platform-dependent and cannot be recoloured
or scaled independently via CSS.

### Issue D4 — Focus Indicators on Interactive Navigation Elements

**Status: ✅ RESOLVED (Cycle 6) — Confirmed stable Cycle 8**

Three `:focus-visible` rules confirmed at:
- `.step:focus-visible` — `styles.css` line 144
- `.action-btn:focus-visible` — `styles.css` line 593
- `.tab:focus-visible` — `styles.css` line 640

Combined with `.sm-th:focus-visible` (line 261), `.sm-btn:focus-visible` (line 296),
`.icon-btn:focus-visible` (line 1197), `.rw-btn:focus-visible` (line 1265), and
`.preview-output-badge-link:focus-visible` (line 1398) — primary interactive
elements have consistent 2px blue outlines. No regression.

### Issue D5 — Divergent Generated Output Templates (GAP-132)

**Status: ❌ Fail — UNCHANGED**

| Dimension | cv-template.html | cv-style.css |
| --------- | --------------- | ------------ |
| Font family | Inter + Merriweather (Google Fonts) | Segoe UI, Arial (system font) |
| Brand blue | #2980b9 | #2c5aa0 |
| Layout mechanism | CSS Flexbox, flex-row | CSS Grid, grid-template-columns |
| Column split | 32% sidebar / 68% main | 2.8fr main / 1.2fr sidebar (reversed polarity) |
| Size units | rem (user-scalable) | pt (fixed absolute) |
| CSS variables | :root with 8 custom properties | None |

The font-size control in the layout panel adjusts `cv-template.html`'s `rem` root.
This has no effect on the DOCX output. Not disclosed in UI. No change.

### Issue D6 — Duplicate CSS Rule: `.step-stale-badge`

**Status: ✅ RESOLVED (Cycle 5) — Confirmed stable Cycle 8**

Single definition at `styles.css` line 1425. No regression.

### Issue GAP-G4 — `.action-btn.secondary` Undefined

**Status: ✅ RESOLVED (Cycle 7 commit `664750d`)**

`styles.css` lines 590–591 now define `.action-btn.secondary`. The confirm-modal
"Cancel" button (`index.html` line 307) and all other secondary-labelled buttons
now render with deliberate medium-grey weight. No regression detected in Cycle 8.

---

## Additional Story Gaps / Proposed Story Items

**GAP-G1 — No zoom/scale control on layout preview iframe.** At non-standard
viewport widths or HiDPI displays, the iframe renders at a fixed width without
user-controlled scale. A designer reviewing a US Letter document on a 13" laptop
at 150% DPI cannot easily validate printed proportions. Proposed story: "As a
graphical designer, I want to scale the preview iframe to 100% / 75% / fit-to-pane
so that I can evaluate the printed proportions accurately at any viewport size."

**GAP-G2 — Layout panel settings row grouping is visually ambiguous.** The six
controls in the layout-settings bar (font size, margin, publications checkbox,
skill-experience select, Apply button, status) are visually co-mingled with the
instruction textarea below them. No section heading or horizontal rule separates
"document-wide settings" from "natural-language instruction." Proposed story: "As a
graphical designer, I want the document-wide layout settings (font size, margin,
page-break) to be visually grouped and labelled separately from the natural-language
instruction textarea so that I can identify the scope of each control at a glance."

**GAP-G3 — Template identity is not disclosed in the UI.** Users cannot tell from
the application that the preview renders `cv-template.html` (Inter + Merriweather,
rem, CSS custom properties) while the DOCX download uses `cv-style.css` (Segoe
UI, pt, no variables). The visual discrepancy between preview and downloaded
artifact is invisible until download. Proposed story: "As a graphical designer,
I want the layout review and file-review tabs to indicate which template is used for
each output format so that I understand why the downloaded DOCX may differ visually
from the preview."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-G1 | 1 | 3 | 0 | 0 | 0 |
| US-G2 | 2 | 2 | 0 | 0 | 0 |
| US-G3 | 2 | 2 | 0 | 0 | 0 |
| **Total** | **5** | **7** | **0** | **0** | **0** |

**Issue tracker delta (Cycle 7 → Cycle 8):**

| Issue | Cycle 7 | Cycle 8 | Change |
| ----- | ------- | ------- | ------ |
| D1 CSS token layer (GAP-133) | ❌ | ❌ | No change |
| D2 Button class proliferation | ❌ | ⚠️ | **Improved** — `.action-btn.secondary` now defined |
| D3 Emoji navigation | ⚠️ | ⚠️ | No change |
| D4 Focus-visible indicators | ✅ | ✅ | Remains resolved |
| D5 Template divergence (GAP-132) | ❌ | ❌ | No change |
| D6 Duplicate CSS rule | ✅ | ✅ | Remains resolved |
| GAP-G4 `.action-btn.secondary` undefined | ⚠️ | ✅ | **Resolved** (`664750d`) |

**Key evidence references:**

- D1 open: `grep ":root" web/styles.css` → 0 matches; 96 distinct hex literals; 218 inline `style=""` in `index.html`
- D2 improved: `styles.css` lines 590–591 (`.action-btn.secondary` now defined); remaining parallel classes: lines 1302, 1215, 861, 1219, 1435, 946
- D4 confirmed resolved: `styles.css` lines 144, 593, 640; `ui-core.js` lines 1930–1943 (step-rerun keyboard handlers)
- D5 open: `templates/cv-template.html` (Inter/Merriweather, `#2980b9`) vs `templates/cv-style.css` (Segoe UI, `#2c5aa0`)
- GAP-G1: no zoom/scale control in `styles.css` layout-preview rules or layout-instruction panel HTML
- GAP-G2: `styles.css` line 1435 (`.layout-instruction-textarea`) — no group heading rule adjacent; layout-settings row has no class boundary visible in `styles.css`
- GAP-G3: no template-name disclosure found in any reviewed source file
- GAP-G4 resolved: `styles.css` lines 590–591 (`664750d`); `index.html` line 307 (confirm Cancel now correctly styled)
- AC 3.2 partial: `styles.css` line 1435 — no grouping class between layout-settings row and textarea
- AC 3.3 improved: `web/download-tab.js` `_renderDownloadGrid()` — `generatedAt` parameter adds "Generated {date}" label (`f2a0bbf`)
- AC 2.2 pass-tier addendum: `web/session-switcher-ui.js` `_renderSessionTableRow()` — Draft/Ready/Sent semantic badge colours match palette (`b7fb7c5`)

**Evidence standard:** Every conclusion above is independently verifiable from the cited source evidence at the specified file paths and line numbers.
