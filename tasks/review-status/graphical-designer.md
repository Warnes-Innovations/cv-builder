<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-06-22 22:30 ET

**Executive Summary:** Cycle 7 source-first review against all seven specified
files. Three post-cycle-6 commits affect design criteria: `5b20aa2` raises
step-rerun button opacity from 0 to 0.35 (GAP-180) — a discoverability improvement
for the re-run affordance on completed workflow pills. `0cf4d61` adds `role="dialog"`
and focus-trap to the bullet-reorder modal (GAP-176) — primarily accessibility.
`56dba9e` adds a cover-letter company-context textarea (GAP-174) — functional UX,
no style sheet changes. All four persistent design issues (D1 CSS token layer, D2
button proliferation, D3 emoji nav, D5 template divergence) remain open and
unchanged from Cycle 6. Inline `style=""` count in `index.html` is 218. Net
result: 5 Pass / 7 Partial / 0 Fail on story criteria (same as Cycle 6).

---

## Cycle 7 Delta Assessment

Compared to Cycle 6 (`tasks/review-status/graphical-designer.md`, last updated
2026-06-22 20:30 ET), the following design-relevant changes are confirmed from
source inspection and commits since `7937d57`:

**Post-cycle-6 commits inspected (design-relevant only):**

| Commit | Description | Design impact |
| ------ | ----------- | ------------- |
| `5b20aa2` | GAP-180: step-rerun opacity 0→0.35 at rest | Improves discoverability (AC 1.2, D4-adjacent) |
| `0cf4d61` | GAP-176: bullet-reorder modal dialog role + focus trap | Accessibility; no visual change |
| `56dba9e` | GAP-174: cover letter company context textarea | Functional addition; no style changes |
| `56d0d2c` | docs: mark GAP-178 and GAP-180 resolved | Documentation only |

**Step-rerun affordance improvement (GAP-180):**

`web/workflow-steps.js` line 733 changed from `opacity:0` to `opacity:0.35` on the
↻ re-run button injected inside `.step.completed` pills. The hover/focus-within
rule (injected via a `<style>` tag at line 762) raises it to `opacity:1 !important`
on hover or keyboard focus. At 0.35 base opacity, the affordance is now faintly
visible at rest — reducing the hidden-action problem without cluttering the
workflow bar during normal scanning. This is an improvement in visual hierarchy for
the step bar under AC 1.2. The button styling remains an inline `style=""` attribute
(hardcoded hex colours absent; structural only at this element).

**No CSS-layer additions in this cycle:**

`grep ":root" web/styles.css` → 0 matches. Distinct hex literal count: 96 (styles.css
only). `grep -c 'style="' web/index.html` → 218. No `:root` token block introduced.
D1 and D2 remain open.

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

3. **Helper text from JS is outside the stylesheet.** `ui-core.js` injects helper
   text via inline `style.cssText` assignments. `_setConnectionMessage()` in
   `app.js` (lines 16–39) applies `content.style.color`, `content.style.background`,
   `content.style.borderColor` as inline JS properties for the connection status
   pill — a surface outside the CSS layer.

No change in this cycle.

---

#### AC 1.2 — Primary actions are consistently prominent

**Status: ⚠️ Partial**

`.action-btn.primary` (`styles.css` lines 586–587) correctly delivers
`background: #3b82f6; color: #fff; border-color: #3b82f6` at `font-size: 14px`.

**Improvement (GAP-180):** The step-rerun ↻ button in completed workflow pills
now has `opacity: 0.35` at rest (`workflow-steps.js` line 733, up from `opacity:0`)
with `opacity:1` on hover/focus-within (`workflow-steps.js` line 762). This makes
the re-run affordance visible without dominating the workflow bar.

Persistent inconsistencies:

- Six parallel CSS classes for the primary blue button role: `.action-btn.primary`
  (line 586), `.btn-primary` (line 1302), `.submit-btn` (line 1215), `.editor-btn`
  (line 861), `.continue-btn` (line 1219), `.layout-action-btn` (line 1435),
  `.modal-btn` (line 946). Each independently specifies geometry; border-radius
  ranges from 4px (position-bar inline buttons) to 10px (rewrite cards).
- The interaction-area action strip (`index.html` lines 182–190) contains nine
  `.action-btn.primary` buttons managed via `display:none` state toggling. Only
  one visible at a time, but the flat HTML structure provides no secondary-emphasis
  tier.
- `.action-btn secondary` class referenced at `index.html` line 307 and throughout
  `master-cv.js`, but `.action-btn.secondary` has no CSS rule defined in
  `styles.css` — these buttons fall back to base `.action-btn` styling (grey/neutral),
  which renders them visually equivalent to tertiary ghost buttons.

No net change in overall status.

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

The visual ceiling remains utilitarian. The dark header bar is flat. 96 distinct
hex literals remain hardcoded with no `:root {}` indirection. The master-profile
card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1463) is the
sole decorative gradient in the app shell.

No change in this cycle.

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

Button proliferation is unchanged (six primary-role classes; see AC 1.2). Tab
underline pattern continues to be implemented three times independently: `.tab`
(`styles.css` lines 626–635), `.review-subtab` (lines 665–679), `.input-tab`
(lines 1295–1297) — same active-underline concept, independently specified padding
and font-size values. The inline rename widget introduces two more styled
buttons (ok/cancel) as injected inline styles.

No change in this cycle.

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

**Status: ✅ Pass**

The semantic state colour mapping remains consistent across all surfaces:

- Active / in-progress: blue (`#dbeafe/#1d4ed8`)
- Completed / success: green (`#dcfce7/#166534`)
- Stale / warning: amber (`#fffbeb/#92400e`)
- Critical / error: red (`#fef2f2/#b91c1c`)

Applied faithfully in workflow steps (lines 150–156), freshness chips (lines
119–121), layout status cards (lines 1425–1428), confidence badges (lines 700–722),
rewrite cards (lines 1237–1239), toast variants (lines 1224–1228), and the
`[data-changed="true"]` animation (lines 1537–1547).

No change in this cycle.

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

**Status: ⚠️ Partial**

Inline `style=""` count in `index.html` is 218 (unchanged since Cycle 4).
Modal bodies, settings fields, onboarding steps, and the LLM wizard continue to
use inline styles extensively. The confirm-dialog built via JS string injection
in `ui-core.js` uses fully hardcoded inline styles and cannot be themed or
overridden via the stylesheet. `_setConnectionMessage()` in `app.js` (lines
16–39) applies colour as inline JS properties for the connection status pill.

The bullet-reorder modal (`0cf4d61`) gains `role="dialog"` and focus-trap semantics
but introduces no visual regressions.

No change in overall visual consistency status this cycle.

---

#### AC 2.4 — Familiar, standard interaction patterns

**Status: ✅ Pass**

All standard patterns are correctly applied:

- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267)
- Tab-based navigation with active underline and WCAG arrow-key traversal
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, `gap: 8px` stack, `styles.css` line 1223)
- Focus trap and focus restoration in modals (`ui-core.js` lines 260–347)
- Session conflict banner with retry and dismiss affordances
- Keyboard-accessible workflow step pills — Enter/Space keydown handlers in
  `workflow-steps.js` (`updateWorkflowStepsClickable()`)
- `#llm-busy-label` carries `aria-live="polite" role="status"` (`index.html` line
  155) — assistive technology users receive LLM operation status announcements
- Spell-check CTA labelled "Generate Preview →" (`index.html` line 186) —
  accurately describes the workflow destination
- **New (GAP-176):** Bullet-reorder modal now has `role="dialog" aria-modal="true"`
  with focus trap and Escape handler (`0cf4d61`) — consistent with the modal pattern
  applied to all other dialogs.

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
and well-maintained; component class structure remains fractured; inline-style
count stable at 218.

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

The sandboxed iframe (`sandbox="allow-same-origin"`, `index.html` line 287)
prevents script execution inside the preview while preserving CSS rendering.

No change in this cycle.

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

**Status: ⚠️ Partial**

The font-size input shows both px and pt (`layout-instruction.js` lines 33–35,
413–415: `pxToPt()` calculates the point equivalent; the `#font-size-pt-display`
span reads e.g. `px (9.8 pt)`). This is a typographic transparency improvement
for designers.

Persistent concern: the layout-settings row (`layout-instruction.js` line 312)
packs six heterogeneous controls (font-size number input, px/pt readout span,
page-margin number input, page-break checkbox, skill-experience select, Apply
button, status label) in a single `flex-wrap: wrap` row without a section heading
or visual divider separating "document-wide settings" from the "natural-language
instruction" textarea below. No change.

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

**Status: ✅ Pass**

The File Review tab uses `.download-grid` (`.download-item` flex rows: icon + info
block + green `.btn-download` CTA — `styles.css` line 1289: `background: #10b981`).
File type detection in `download-tab.js` (lines 43–69) yields contextually labelled
descriptions for PDF, DOCX, HTML, cover letter, and screening files. The ATS
validation report renders in a `<details open>` collapsible with pass/warn/fail
colour-coded rows. The paper-simulation document viewer (`styles.css` line 685:
`max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px
rgba(0,0,0,0.1)`) is appropriate for the context.

No change in this cycle.

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

**Status: ⚠️ Partial**

`templates/cv-template.html` provides a sound design-token layer (8 CSS custom
properties in `:root {}`), rem-based font scale anchored to a user-controllable
`base_font_size`, Inter + Merriweather typography, and a restrained 32%/68%
flex-row two-column layout. The colour scheme (dark-blue `#2c3e50`, accent
`#2980b9`, sidebar `#eef2f5`) is professional and non-distracting.

`templates/cv-style.css` (DOCX output) diverges on all dimensions documented in
GAP-132 (font family: Segoe UI vs Inter/Merriweather; brand blue: `#2c5aa0` vs
`#2980b9`; layout: CSS Grid vs Flexbox; column proportions reversed; size units: pt
vs rem). No change.

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
blocked by divergent template systems.

---

## Generated Materials Evaluation

### Typography

**Status: ⚠️ Partial**

`templates/cv-template.html` uses a well-constructed type system:
- Inter (weights 300/400/600/700) for body and labels; Merriweather for the name
  heading (line 211: `font-family: 'Merriweather', serif; font-size: 2.2rem;`)
- `rem`-based scale anchored to `html { font-size: <base_font_size> }` (line 39);
  default 13px ≈ 9.75pt, adjustable in the layout panel
- `line-height: 1.6` on body (line 51)
- Sidebar titles at `0.85rem / letter-spacing: 1px / font-weight: 700 /
  text-transform: uppercase` (line 137)

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
cuts (`cv-template.html` line 279). `max-width: 215.9mm` + CSS `@page { size:
letter; margin: var(--page-margin); }` correctly sized for US Letter PDF.

### Preview Fidelity

**Status: ⚠️ Partial**

The layout review iframe serves the HTML template. The `pxToPt()` helper in
`layout-instruction.js` (lines 33–35) allows designers to reason about printed
font size in points. No viewport-zoom or DPI-scale control is exposed, so at
non-standard viewports or HiDPI displays the preview may not accurately represent
printed proportions (GAP-G1, below).

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer (GAP-133)

**Status: ❌ Fail — UNCHANGED**

`web/styles.css` contains no `:root {}` block. `grep ":root" web/styles.css`
returns zero matches. Distinct hex colour literals: 96 unique values across 1607
lines. 218 inline `style=""` attributes in `index.html`. JS files (`app.js` lines
16–39, `ui-core.js` lines 99–118) add further hardcoded colour values outside the
stylesheet. Theming is structurally impossible; colour drift between components is
endemic.

Evidence: `styles.css` line 17 (`#f8fafc`), line 20 (`#1e293b`), line 77
(`#3b82f6`), etc. — 529 total hex-bearing lines.

### Issue D2 — Proliferation of Button Classes

**Status: ❌ Fail — UNCHANGED**

Six distinct classes for primary blue action buttons: `.action-btn.primary`
(`styles.css` line 588), `.btn-primary` (line 1302), `.submit-btn` (line 1215),
`.editor-btn` (line 861), `.continue-btn` (line 1219), `.layout-action-btn` (line
1435), `.modal-btn` (line 946). Each independently specifies geometry.

Additionally, `.action-btn.secondary` is referenced in `index.html` line 307 and
across `master-cv.js` (7 occurrences) but has no dedicated CSS rule — these buttons
silently inherit base `.action-btn` grey styling, indistinguishable from other
ghost buttons.

### Issue D3 — Heavy Emoji Use in Navigation

**Status: ⚠️ Partial — UNCHANGED**

12 step elements in the workflow nav bar (`index.html` lines 119–141), each with
an emoji prefix (📥 🔍 ⚙️ ✏️ 🔤 🎨 ⬇️ 📩 📋 🎤 🙏 🌾). 25 tabs in the tab
bar (`index.html` lines 200–225), most with emoji prefixes. Header buttons include
emoji (📂, ⚙️, 📚). Emoji rendering is platform-dependent and cannot be recoloured
or scaled independently via CSS.

### Issue D4 — Missing Focus Indicators on Interactive Navigation Elements

**Status: ✅ RESOLVED (Cycle 6)**

Three `:focus-visible` rules confirmed at:
- `.step:focus-visible` — `styles.css` line 144
- `.action-btn:focus-visible` — `styles.css` line 591
- `.tab:focus-visible` — `styles.css` line 638

Combined with `.sm-th:focus-visible` (line 261), `.sm-btn:focus-visible` (line 296),
`.icon-btn:focus-visible` (line 1195), `.rw-btn:focus-visible` (line 1263), and
`.preview-output-badge-link:focus-visible` (line 1396) — primary interactive
elements have consistent 2px blue outlines. No regression in this cycle.

**GAP-180 addendum:** The step-rerun ↻ button now has `opacity:0.35` at rest with
`.step-rerun:focus-visible { outline: 2px solid #3b82f6; opacity: 1 !important; }`
injected by `workflow-steps.js` line 762 — the affordance is both visible and
keyboard-focusable.

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
This has no effect on the DOCX output, which uses hardcoded `pt` values. The
template divergence is not disclosed in the UI. No change.

### Issue D6 — Duplicate CSS Rule: `.step-stale-badge`

**Status: ✅ RESOLVED (Cycle 5)**

Single definition at `styles.css` line 1423. No regression.

---

## Additional Story Gaps / Proposed Story Items

These observations fall outside the current user story criteria but are relevant
to the graphical-designer perspective:

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
"document-wide settings" from "natural-language instruction." Source: `web/layout-instruction.js` line 312. Proposed story: "As a graphical designer, I
want the document-wide layout settings (font size, margin, page-break) to be
visually grouped and labelled separately from the natural-language instruction
textarea so that I can identify the scope of each control at a glance."

**GAP-G3 — Template identity is not disclosed in the UI.** Users cannot tell from
the application that the preview renders `cv-template.html` (Inter + Merriweather,
rem, CSS custom properties) while the DOCX download uses `cv-style.css` (Segoe
UI, pt, no variables). The visual discrepancy between preview and downloaded
artifact is invisible until download. Source: no template-name element found in any
reviewed file. Proposed story: "As a graphical designer, I want the layout review
and file-review tabs to indicate which template is used for each output format so
that I understand why the downloaded DOCX may differ visually from the preview."

**GAP-G4 — `.action-btn.secondary` class referenced but not defined.** Used in
`index.html` line 307 ("Cancel" in confirm modal) and 7 times in `master-cv.js`,
but no `.action-btn.secondary` rule exists in `styles.css`. These buttons silently
inherit the base `.action-btn` styling (grey background `#f8fafc`, `color: #475569`)
with no visual differentiation from other ghost buttons. A named `.action-btn.secondary`
rule would disambiguate intent and align with the existing `.btn-secondary` pattern.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
| US-G1 | 1 | 3 | 0 | 0 | 0 |
| US-G2 | 2 | 2 | 0 | 0 | 0 |
| US-G3 | 2 | 2 | 0 | 0 | 0 |
| **Total** | **5** | **7** | **0** | **0** | **0** |

| Issue | Cycle 6 | Cycle 7 | Change |
| ----- | ------- | ------- | ------ |
| D1 CSS token layer (GAP-133) | ❌ | ❌ | No change |
| D2 Button class proliferation | ❌ | ❌ | No change; GAP-G4 added |
| D3 Emoji navigation | ⚠️ | ⚠️ | No change |
| D4 Focus-visible indicators | ✅ | ✅ | Remains resolved; GAP-180 addendum |
| D5 Template divergence (GAP-132) | ❌ | ❌ | No change |
| D6 Duplicate CSS rule | ✅ | ✅ | Remains resolved |
| GAP-G4 `.action-btn.secondary` undefined | — | ⚠️ New | First identified this cycle |

**Key evidence references:**

- D1 open: `grep ":root" web/styles.css` → 0 matches; 96 distinct hex literals; 218 inline `style=""` in `index.html`
- D2 open: `styles.css` lines 588, 1302, 1215, 861, 1219, 1435, 946 — seven primary-role button classes
- D4 confirmed resolved: `styles.css` lines 144, 591, 638; `workflow-steps.js` line 762 (step-rerun focus-visible)
- D5 open: `templates/cv-template.html` line 49 (Inter/Merriweather) vs `templates/cv-style.css` (Segoe UI); `#2980b9` vs `#2c5aa0`
- GAP-G2: `web/layout-instruction.js` line 312 (layout-settings-row flex container — no group heading)
- GAP-G3: no template-name disclosure in any reviewed source file
- GAP-G4: `web/index.html` line 307, `web/master-cv.js` (7 occurrences) — `.action-btn.secondary` absent from `styles.css`
- GAP-180 improvement: `web/workflow-steps.js` line 733 (`opacity:0.35` at rest)
- AC 3.1 pass: `web/styles.css` line 1371 (layout pane); `web/index.html` line 287 (sandboxed iframe)
- AC 3.3 pass: `web/styles.css` line 685 (paper simulation); `web/download-tab.js` lines 43–69 (file labelling)
- Inline style count: `grep -c 'style="' web/index.html` → 218

**Evidence standard:** Every conclusion above is independently verifiable from the cited source evidence at the specified file paths and line numbers.
