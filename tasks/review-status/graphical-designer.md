<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-06-29 23:00 ET

**Executive Summary:** Cycle 9 source-first review against all seven specified
files. Nineteen commits since `664750d` (Cycle 8 close) affect design criteria.
Key design-relevant changes: GAP-80 aligns `.btn-primary`/`.btn-secondary`/
`.btn-warning` geometry and disabled states with the `.action-btn` system (closes
D2 partially further); GAP-122 adds a `@media (max-width: 1400px)` breakpoint
for workflow bar overflow; GAP-183 adds `outline: 2px` alongside box-shadow for
forced-colors compatibility on four focus rules; GAP-192 wraps all 12 workflow
step emoji and 19 tab emoji in `<span aria-hidden="true">` — reducing visual
noise for screen-reader users and improving semantic cleanliness; GAP-115 adds
the `#llm-non-confidential-badge` amber pill (still inline-styled in `index.html`
line 59).

Inline `style=""` count in `index.html`: 223 (+5 net from Cycle 8's 218, driven
by the `#llm-non-confidential-badge` element and the `#workflow-stage-announcer`
SR-only div). CSS line count: 1619. No `:root {}` token block added. Distinct
hex literal count in `styles.css`: ~97 (`.layout-page-count-badge` adds `#e0f2fe`,
`#0369a1`, `#bae6fd`, `#fff7ed`, `#c2410c`).

Net result on story criteria: **5 Pass / 7 Partial / 0 Fail** — same total
as Cycle 8. D2 is further improved (`.btn-primary`/`.btn-secondary`/`.btn-warning`
now match `.action-btn` padding/font-size/focus/disabled), but the class
proliferation root cause remains open. Issue D3 (emoji navigation) status
upgraded from ⚠️ Partial to ✅ Pass because all workflow step and tab emoji are
now wrapped in `aria-hidden="true"` spans, addressing the primary graphical-design
concern (screen-reader noise without CSS controllability). Remaining open issues:
D1 (no token layer), D2 (parallel button classes, partially improved), D5
(template divergence), GAP-G1 (no preview zoom), GAP-G2 (settings row grouping),
GAP-G3 (no template identity disclosure in UI).

---

## Cycle 9 Delta Assessment

Compared to Cycle 8 (`tasks/review-status/graphical-designer.md`, updated
2026-06-29 19:30 ET), the following design-relevant changes are confirmed from
source inspection of commits since `664750d`:

**Post-cycle-8 commits inspected (design-relevant):**

| Commit | Description | Design impact |
| ------ | ----------- | ------------- |
| `334451d` | GAP-183/184/193: forced-colors outline, q-chip focus ring | Focus ring on 4 inputs now uses explicit outline (not box-shadow only); q-chip gets `:focus-visible` |
| `647bdf7` | GAP-192: emoji wrapped in `<span aria-hidden="true">` | All 12 workflow steps and 19 tabs now have SR-silent emoji |
| `54b2632` | GAP-122: workflow bar overflow media query | `@(max-width: 1400px)` reduces gap and padding |
| `98b384b` | GAP-115: non-confidential LLM badge in header | New amber pill element, fully inline-styled |
| `79f35dc` | GAP-80: `.btn-primary/.btn-secondary/.btn-warning` aligned | Padding, font-size, focus-visible, disabled now match `.action-btn` system |
| `afbb7c6` | GAP-117: AI-proposal label vs master CV badge in summary review | Visual distinction label added; no CSS class change |
| `e0c1664` | GAP-126/139: cover letter word count, session status UI | Minor: session status badge label copy only |

**GAP-80 fix — `.btn-primary`/`.btn-secondary`/`.btn-warning` aligned with `.action-btn`:**

`styles.css` lines 1305–1312 now define all three variants with matching
geometry: `padding: 10px 16px`, `font-size: 14px`, `border-radius: 6px`,
`:hover:not(:disabled)`, `opacity: 0.6` disabled state, and `:focus-visible`
outline. This significantly narrows the divergence noted in D2 — the layout-
review buttons (`.btn-primary`, `.btn-secondary`, `.btn-warning`) now produce
identical padding/font-size/focus output to `.action-btn.primary` and
`.action-btn.secondary`.

Remaining D2 gap: five parallel classes (`.submit-btn`, `.editor-btn`,
`.continue-btn`, `.modal-btn`, `.layout-action-btn`) still specify padding and
border-radius independently. Border-radius still ranges from 4px to 10px across
these classes.

**GAP-192 fix — emoji wrapped in `<span aria-hidden="true">`:**

All 12 workflow step emoji (`index.html` lines 120–141) and all 19 (visible) tab
emoji (lines 204–229) are now wrapped in `<span aria-hidden="true">`. Three
advance action buttons (layout-btn, final-generate-proceed-btn, finalise-action-
btn) also have aria-hidden emoji spans. This resolves the screen-reader
announcement problem (D3) and is a minor visual improvement — emoji remain
present as visual decorators but are now cleanly separated from semantic content.

**GAP-183 fix — forced-colors focus outlines:**

`styles.css` additions (confirmed via diff): `.q-chip:focus-visible`,
`.question-item .q-input:focus`, `.message-input:focus`, `.form-input:focus`,
`.layout-instruction-textarea:focus` — all now use explicit `outline: 2px solid #3b82f6`
alongside `box-shadow`. This closes the Windows High Contrast regression.

**GAP-122 fix — workflow bar overflow:**

`styles.css` adds `@media (max-width: 1400px)` that reduces `.workflow-steps`
gap from 32px to 16px and `.workflow` padding from `20px 24px` to `14px 16px`.
Prevents horizontal overflow on mid-range viewports.

**GAP-115 — `#llm-non-confidential-badge`:**

`index.html` line 59 adds a new amber pill element with fully inline-styled
attributes: `style="display:none; font-size:0.72em; padding:1px 6px; border-radius:999px;
background:#fff7ed; border:1px solid #fed7aa; color:#c2410c; font-weight:600;"`.
This continues the inline-style pattern (D1) — the element is not backed by a
CSS class.

**No new CSS token layer:**

`grep ":root" web/styles.css` → 0 matches. CSS line count: 1619.
`grep -c 'style="' web/index.html` → 223 (+5 from Cycle 8's 218).

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

**Status: ⚠️ Partial**

The stylesheet provides a functional typographic hierarchy in the document viewer
(`styles.css` lines 691–694): `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body
`p` 14px/line-height 1.6. Header app title 20px/600 (`styles.css` line 21);
conversation panel title 18px/600 (line 376).

Three weaknesses persist (unchanged from Cycle 8):

1. **No shared typographic scale.** No `:root {}` token block. Helper-text sizes
   (`11px`, `12px`, `13px`, `14px`, `15px`) recur independently across components.
   Header pill buttons specify `font-size: 13px` as a bare literal (`styles.css`
   line 64).

2. **Position-bar action buttons use raw inline styles.** The "Master CV", "ATS
   Report", and "Job Analysis" buttons (`index.html` lines 101–106) carry
   `style="background:#f1f5f9;border:1px solid #e2e8f0;…font-size:0.8em;padding:2px
   7px;line-height:1.6;"` inline — rendering meaningful workflow entry points at
   sub-tertiary visual weight.

3. **Connection status pill colours are inline JS.** `_setConnectionMessage()` in
   `app.js` (lines 16–39) applies `content.style.color`, `content.style.background`,
   `content.style.borderColor` as inline JS properties — a surface outside the CSS
   layer. The `#llm-non-confidential-badge` (GAP-115, `98b384b`) continues this
   pattern.

No change in criterion status this cycle.

---

#### AC 1.2 — Primary actions are consistently prominent

**Status: ⚠️ Partial**

`.action-btn.primary` (`styles.css` lines 589–590) delivers `background: #3b82f6;
color: #fff; border-color: #3b82f6` at `font-size: 14px`.

**Improvement (GAP-80, `79f35dc`):** `.btn-primary`, `.btn-secondary`, and
`.btn-warning` (`styles.css` lines 1305–1312) now match the `.action-btn` system
in padding (`10px 16px`), `font-size: 14px`, `:hover:not(:disabled)`, disabled
opacity, and `:focus-visible` outline. The layout-review workflow's primary/
secondary/warning buttons now have identical visual weight and behaviour to the
main action-button system.

Persistent inconsistencies:

- Five remaining parallel classes for the primary blue button role: `.submit-btn`
  (line 1218), `.editor-btn` (line 864), `.continue-btn` (line 1222),
  `.layout-action-btn` (line 1442), `.modal-btn` (line 949) — each independently
  specifying geometry; border-radius still ranges from 6px to 10px.
- The interaction-area action strip (`index.html` lines 186–195) contains nine
  `.action-btn.primary` buttons managed via `display:none` state toggling. Only
  one visible at a time, but the flat HTML structure provides no secondary-emphasis
  tier.

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

**Status: ✅ Pass**

The rewrite review panel handles density well. `.rewrite-card` (`styles.css` line
1240: `border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc`) with
`.accepted` (green `#10b981` border) and `.rejected` (red `#f87171` border, 0.7
opacity) provide strong visual state differentiation. Inline diff markup with
`del.diff-removed` (red text on `#fee2e2`) and `ins.diff-added` (green text on
`#dcfce7`) at lines 1249–1250 supports rapid comprehension. The sticky tally bar
(`position: sticky; top: 0; z-index: 10`, line 1234) anchors tally context during
scroll. The `[data-changed="true"]` animation (`styles.css` lines 1549–1558) adds
a 1.5s amber pulse on re-run changed items.

No change in this cycle.

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

**Status: ⚠️ Partial**

The palette remains a blue-anchored neutral system (Tailwind Slate + Blue).
Semantic state colours are consistently applied: active blue `#dbeafe/#1d4ed8`,
complete green `#dcfce7/#166534`, stale amber `#fffbeb/#92400e`, error red
`#fef2f2/#b91c1c`. Applied faithfully in workflow step pills (`styles.css` lines
150–156), freshness chips (lines 119–121), layout-status cards (lines 1431–1433),
confidence badges (lines 706–722), rewrite cards (lines 1240–1242), toast
variants (lines 1227–1231), and the `[data-changed="true"]` animation (lines
1549–1558).

**New this cycle:** The `#llm-non-confidential-badge` amber `#fff7ed/#c2410c`
(index.html line 59) follows the existing amber/warning semantic but is
entirely inline-styled — not a CSS class. The `.layout-page-count-badge` added
(`styles.css` lines 1436–1437) uses `#e0f2fe/#0369a1` (sky/info blue) and a
`.warn` variant in amber `#fff7ed/#c2410c` — consistent with existing palette
semantics.

The visual ceiling remains utilitarian. The dark header is flat. ~97 distinct
hex literals remain hardcoded with no `:root {}` indirection. Master-profile card
gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1475) is still the
sole decorative gradient in the app shell.

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

**Improvement (GAP-80, `79f35dc`):** `.btn-primary`, `.btn-secondary`, and
`.btn-warning` now match `.action-btn` system geometry. `padding: 10px 16px`,
`font-size: 14px`, `:hover:not(:disabled)`, disabled `opacity: 0.6`, and
`:focus-visible` outline rules are shared (`styles.css` lines 1305–1312).

Five remaining parallel classes (`.submit-btn`, `.editor-btn`, `.continue-btn`,
`.modal-btn`, `.layout-action-btn`) still specify geometry independently.
Tab underline pattern continues to be implemented three times independently:
`.tab` (`styles.css` lines 629–642), `.review-subtab` (lines 665–681),
`.input-tab` (lines 1295–1299) — same active-underline concept, independently
specified padding and font-size values.

Status continues at ⚠️ Partial (improved geometry parity between `.btn-*` and
`.action-btn` system, but fragmentation remains).

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

**Status: ✅ Pass**

The semantic state colour mapping is consistent and extends to new elements added
this cycle:

- Active / in-progress: blue (`#dbeafe/#1d4ed8`)
- Completed / success: green (`#dcfce7/#166534`)
- Stale / warning: amber (`#fffbeb/#92400e`), `#fff7ed/#c2410c` for LLM badge
- Critical / error: red (`#fef2f2/#b91c1c`)
- Draft / unclaimed: grey (`#e2e8f0/#374151`)

The new `.layout-page-count-badge` (`styles.css` lines 1436–1437) follows palette
semantics: info-blue default, amber `.warn` variant. The `#llm-non-confidential-
badge` amber is semantically coherent with the warning tier. No palette drift
detected.

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

**Status: ⚠️ Partial**

Inline `style=""` count in `index.html`: 223 (+5 from Cycle 8). The `#llm-non-
confidential-badge` element (`index.html` line 59) adds fully inline-styled
colour/sizing. Modal bodies, settings fields, onboarding steps, and the LLM
wizard continue to use inline styles extensively. The confirm-dialog built via
JS string injection in `ui-core.js` uses fully hardcoded inline styles.
`_setConnectionMessage()` in `app.js` (lines 16–39) applies colour as inline JS
properties.

**Improvement (GAP-192):** All workflow step and tab emoji are now wrapped in
`<span aria-hidden="true">`. This does not change visual appearance but improves
semantic cleanliness: emoji are now explicitly decorative rather than content
nodes, which is the correct role for visual icon-like elements in a design system.

No change in overall visual consistency status this cycle.

---

#### AC 2.4 — Familiar, standard interaction patterns

**Status: ✅ Pass**

All standard patterns remain correctly applied. No regressions detected.

New in this cycle:

- **GAP-73 `#workflow-stage-announcer`** (`index.html` lines 145–147): visually
  hidden `aria-live="polite"` region wired to `switchTab()` — correct
  implementation of stage-change announcements for assistive technology. The
  element uses inline `style=""` for the sr-only pattern, consistent with
  established practice.
- **GAP-122 overflow breakpoint** (`styles.css`): the workflow bar now responds
  to viewport width, preventing overflow at ≤1400px.
- **GAP-121 inline clarification panel:** `window.prompt()` replaced with an
  accessible inline panel. Standard browser prompts replaced with on-page UI
  is a correct interaction-pattern improvement.

---

**US-G2 Summary:**

| Criterion | Status |
| --------- | ------ |
| 2.1 Repeated controls consistent | ⚠️ Partial |
| 2.2 Status surfaces coherent | ✅ Pass |
| 2.3 Tabs, workflow bar, modals cohesive | ⚠️ Partial |
| 2.4 Standard interaction patterns | ✅ Pass |

Acceptance Criteria verdict: **⚠️ Partial** — state colour language is coherent
and well-maintained; component class structure is narrowed but fragmented; inline
style count has risen slightly.

---

### US-G3: Preview and Output Presentation Quality

#### AC 3.1 — Layout-preview area frames content clearly

**Status: ✅ Pass**

The layout review panel two-pane flex structure (`styles.css` line 1376:
`display: flex; gap: 20px; height: calc(100vh - 240px)`) is unchanged.
The preview pane (`flex: 1 1 auto`) hosts the iframe inside
`preview-iframe-container` (`border: 1px solid #e2e8f0; border-radius: 8px`).
The stale callout (`.layout-stale-callout`, lines 1404–1407) correctly signals
when the preview is out of date.

**Improvement (GAP-83, `79f35dc`):** The `layout-preview-status` block now
displays a `layout-page-count-badge` (`styles.css` lines 1436–1437`) during
layout review — showing exact or estimated page count with amber `.warn` variant
when page count falls outside expected range. This gives designers explicit
document-length context while reviewing layout.

Responsive breakpoints at ≤1400px (`styles.css` lines 1456–1459) and ≤1280px
and ≤1100px remain in place.

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

**Status: ⚠️ Partial**

The layout-settings row still packs six heterogeneous controls (font-size number
input, px/pt readout, page-margin number input, page-break checkbox, skill-
experience select, Apply button, status label) in a single `flex-wrap: wrap` row
without a group heading or visual divider separating "document-wide settings"
from the "natural-language instruction" textarea below.

**The page-count badge** (`layout-page-count-badge`) is now embedded in the
`layout-preview-status` block, which lives above the preview in the left pane
rather than competing with it — an acceptable placement.

Source evidence: `styles.css` line 1440 (`.layout-instruction-textarea`) —
no group heading CSS class adjacent; layout-settings row container has no class
boundary visible in `styles.css`. GAP-G2 remains open.

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

**Status: ✅ Pass**

The File Review tab uses `.download-grid` (`.download-item` flex rows: icon +
info block + green `.btn-download` CTA — `styles.css` line 1292:
`background: #10b981`). Each card carries the "Generated {date}" timestamp label
(`web/download-tab.js`, `f2a0bbf`, from Cycle 8) — providing explicit
file-currency confirmation.

The ATS validation report renders in a collapsible with pass/warn/fail
colour-coded rows. The paper-simulation document viewer (`styles.css` line 688:
`max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px
rgba(0,0,0,0.1)`) is appropriate for the context.

**New this cycle (GAP-118, `afbb7c6`):** `web/finalise.js` now renders a rewrite
audit log (`_renderRewriteAuditLog()`) in the Finalise tab — a collapsible table
(Field / Original / Final / Outcome). This is a transparency improvement at the
final-review surface; its styling is JS-generated but uses existing table and
badge patterns. No new CSS class defined.

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

**Status: ⚠️ Partial**

`templates/cv-template.html` provides a sound design-token layer (8 CSS custom
properties in `:root {}`), rem-based font scale anchored to user-controllable
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
blocked by divergent template systems. Page-count badge in layout preview improves
3.1.

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
cuts. `max-width: 215.9mm` + `@page { size: letter; margin: var(--page-margin); }`
correctly sized for US Letter PDF.

### Preview Fidelity

**Status: ⚠️ Partial**

The layout review iframe serves the HTML template. The `pxToPt()` helper in
`layout-instruction.js` allows designers to reason about printed font size in
points. The new page-count badge (GAP-83) now surfaces exact or estimated page
count during layout review. No viewport-zoom or DPI-scale control is exposed, so
at non-standard viewports or HiDPI displays the preview may not accurately
represent printed proportions (GAP-G1, below).

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer (GAP-133)

**Status: ❌ Fail — UNCHANGED**

`web/styles.css` contains no `:root {}` block. `grep ":root" web/styles.css`
returns zero matches. Distinct hex colour literals: ~97 unique values across 1619
lines. 223 inline `style=""` attributes in `index.html` (+5 from Cycle 8). JS
files (`app.js` lines 16–39, `ui-core.js` lines 99–118) add further hardcoded
colour values outside the stylesheet. Theming is structurally impossible; colour
drift between components is endemic.

New contributor this cycle: `#llm-non-confidential-badge` (`index.html` line 59)
adds five inline colour/sizing declarations (`#fff7ed`, `#fed7aa`, `#c2410c`) that
duplicate existing amber-tier palette values with no CSS class backing.

Evidence: `styles.css` line 17 (`#f8fafc`), line 20 (`#1e293b`), line 77
(`#3b82f6`), etc.

### Issue D2 — Proliferation of Button Classes

**Status: ⚠️ Partial — FURTHER IMPROVED**

**Improvement (GAP-80, `79f35dc`):** `.btn-primary`, `.btn-secondary`, and
`.btn-warning` (`styles.css` lines 1305–1312) now match `.action-btn` geometry:
`padding: 10px 16px`, `font-size: 14px`, `border: 1px solid`, `:hover:not(:disabled)`,
`disabled opacity: 0.6`, `:focus-visible` outline. The layout-review buttons now
produce identical visual output to the main action-button system.

Remaining gap: `.submit-btn` (line 1218, `border-radius: 8px`), `.editor-btn`
(line 864, `border-radius: 6px`), `.continue-btn` (line 1222, `border-radius: 8px`),
`.modal-btn` (line 949, `border-radius: 6px`), `.layout-action-btn` (line 1442)
still specify geometry independently. Tab underline implemented three times
independently.

### Issue D3 — Heavy Emoji Use in Navigation

**Status: ✅ Pass — RESOLVED (Cycle 9)**

All 12 workflow step emoji (`index.html` lines 120–141) are now wrapped in
`<span aria-hidden="true">`. All 19 visible tab emoji (lines 204–229) are
similarly wrapped. Three advance action buttons also have aria-hidden emoji spans.
Emoji remain as visual decorators (unchanged from Cycle 8 visually), but are
now correctly marked as presentational. Screen readers no longer announce
platform-dependent emoji names at navigation surfaces.

This resolves the primary graphical-design concern: emoji are now treated as
decorative icon-equivalents rather than content, which is the correct design
system role.

The emoji themselves are still present (not replaced by SVG icons or font icons),
so platform-dependent rendering and non-restyling via CSS remain as minor caveats.
However, from a design-system correctness standpoint, the usage is now proper.

### Issue D4 — Focus Indicators on Interactive Navigation Elements

**Status: ✅ RESOLVED (Cycle 6) — Confirmed stable Cycle 9**

Three primary `:focus-visible` rules confirmed at:
- `.step:focus-visible` — `styles.css` line 144
- `.action-btn:focus-visible` — `styles.css` line 593
- `.tab:focus-visible` — `styles.css` line 640

**New in Cycle 9:** `.q-chip:focus-visible` (GAP-193, `334451d`), plus forced-
colors-safe explicit `outline` on `.q-input:focus`, `.message-input:focus`,
`.form-input:focus`, `.layout-instruction-textarea:focus` (GAP-183).

Combined with `.sm-th:focus-visible` (line 261), `.sm-btn:focus-visible` (line 296),
`.icon-btn:focus-visible` (line 1197), `.rw-btn:focus-visible` (line 1265), and
`.preview-output-badge-link:focus-visible` (line 1398) — primary interactive
elements have consistent 2px blue outlines, now also Windows High Contrast
compatible. No regression.

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

**Status: ✅ RESOLVED (Cycle 5) — Confirmed stable Cycle 9**

Single definition at `styles.css` line 1428. No regression.

### Issue GAP-G4 — `.action-btn.secondary` Undefined

**Status: ✅ RESOLVED (Cycle 7 commit `664750d`) — Confirmed stable Cycle 9**

`styles.css` lines 590–591 continue to define `.action-btn.secondary`. No
regression.

---

## Additional Story Gaps / Proposed Story Items

**GAP-G1 — No zoom/scale control on layout preview iframe.** At non-standard
viewport widths or HiDPI displays, the iframe renders at a fixed width without
user-controlled scale. A designer reviewing a US Letter document on a 13" laptop
at 150% DPI cannot easily validate printed proportions. The new page-count badge
(GAP-83) helps but does not substitute for visual scale control. Proposed story:
"As a graphical designer, I want to scale the preview iframe to 100% / 75% /
fit-to-pane so that I can evaluate the printed proportions accurately at any
viewport size."

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

**Issue tracker delta (Cycle 8 → Cycle 9):**

| Issue | Cycle 8 | Cycle 9 | Change |
| ----- | ------- | ------- | ------ |
| D1 CSS token layer (GAP-133) | ❌ | ❌ | No change; inline count +5 (223) |
| D2 Button class proliferation | ⚠️ | ⚠️ | **Further improved** — `.btn-*` now match `.action-btn` geometry (GAP-80) |
| D3 Emoji navigation | ⚠️ | ✅ | **Resolved** — all emoji wrapped `aria-hidden="true"` (GAP-192) |
| D4 Focus-visible indicators | ✅ | ✅ | **Extended** — forced-colors safe; q-chip added (GAP-183/193) |
| D5 Template divergence (GAP-132) | ❌ | ❌ | No change |
| D6 Duplicate CSS rule | ✅ | ✅ | Remains resolved |
| GAP-G4 `.action-btn.secondary` | ✅ | ✅ | Remains resolved |
| GAP-G1 Preview zoom/scale | open | open | No change |
| GAP-G2 Settings row grouping | open | open | No change |
| GAP-G3 Template identity disclosure | open | open | No change |

**Key evidence references:**

- D1 open: `grep ":root" web/styles.css` → 0 matches; ~97 distinct hex literals; 223 inline `style=""` in `index.html`; `#llm-non-confidential-badge` (`index.html` line 59) fully inline-styled
- D2 improved: `styles.css` lines 1305–1312 (`.btn-primary`/`.btn-secondary`/`.btn-warning` now match `.action-btn` geometry); remaining parallel classes: lines 1218, 864, 1222, 949
- D3 resolved: `index.html` lines 120–141 (all 12 workflow step emoji `aria-hidden="true"`); lines 204–229 (all visible tab emoji `aria-hidden="true"`) — commit `647bdf7` GAP-192
- D4 extended: `styles.css` — `.q-chip:focus-visible` and forced-colors-safe `outline:2px` on `.q-input`, `.message-input`, `.form-input`, `.layout-instruction-textarea` — commit `334451d` GAP-183/193
- D5 open: `templates/cv-template.html` (Inter/Merriweather, `#2980b9`, 8 CSS custom props) vs `templates/cv-style.css` (Segoe UI, `#2c5aa0`, no vars)
- GAP-G1: no zoom/scale control in `styles.css` layout-preview rules or `layout-instruction.js` panel HTML
- GAP-G2: `styles.css` line 1440 (`.layout-instruction-textarea`) — no group heading rule adjacent; layout-settings row in `layout-instruction.js` lines 321–357 has no grouping CSS class
- GAP-G3: no template-name disclosure found in any reviewed source file
- AC 3.1 improved: `.layout-page-count-badge` (`styles.css` lines 1436–1437) — page count now displayed in layout status during review (GAP-83, `79f35dc`)
- AC 2.4 improved: `#workflow-stage-announcer` (`index.html` lines 145–147) — `aria-live="polite"` stage-change announcer (GAP-73, `54b2632`)

**Evidence standard:** Every conclusion above is independently verifiable from the cited source evidence at the specified file paths and line numbers.
