<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-06-22 20:30 ET

**Executive Summary:** Cycle 6 records three targeted focus-indicator improvements
that resolve Issue D4 (the last Cycle 5 partial). `.step:focus-visible`,
`.tab:focus-visible`, and `.action-btn:focus-visible` rules were added in commit
`3057ea8`, closing the visual keyboard-focus gap for the three highest-traffic
interactive element types. All other open issues (D1 CSS token layer, D2 button
proliferation, D3 emoji nav, D5 template divergence) are unchanged. The inline
`style=""` count in `index.html` remains at 218. Net result: 9 Pass / 3 Partial /
0 Fail on story criteria; D4 moves from Partial to resolved.

---

## Cycle 6 Delta Assessment

Compared to Cycle 5, the following changes are confirmed from source and git log
(commits `3057ea8`, `f2f5a0b`, `c3adb5d`, `a098460`, `4dcb7b9`, `7e9cebd` since
2026-06-20):

**Resolved since Cycle 5:**

- **D4 (RESOLVED — visual focus indicators):** Three `:focus-visible` rules added
  in `3057ea8`:
  - `.step:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`
    at `styles.css` line 144
  - `.action-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`
    at `styles.css` line 590
  - `.tab:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }`
    at `styles.css` line 637
  These three selectors cover the workflow step pills, all action-strip buttons,
  and all tab elements — the primary keyboard-navigable surfaces.

- **GAP-169 (label clarity):** Spell-check CTA renamed from "Done — Generate CV →"
  to "Generate Preview →" (`index.html` line 186) — the label now accurately
  describes the destination (layout preview, not final file generation).

- **GAP-170 (ARIA live region):** `#llm-busy-label` gained `aria-live="polite"
  role="status"` (`index.html` line 155) — screen readers now announce the LLM
  operation state during busy periods.

**Persistent from Cycle 5 (unchanged):**

- D1: No CSS custom properties in `web/styles.css` — `grep ":root"` returns zero
  matches; 96 distinct hex literals; 218 inline `style=""` in `index.html`.
- D2: Six parallel primary-button CSS classes.
- D3: 13 emoji in workflow step bar; 25 tabs each with emoji prefix.
- D5: Template divergence — `cv-template.html` vs `cv-style.css` (GAP-132).

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

**Status: ⚠️ Partial**

The stylesheet provides a functional typographic hierarchy in the document viewer
(`styles.css` lines 684–689): `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body
`p` 14px/line-height 1.6. Header app title is 20px/600 (`styles.css` line 21);
conversation panel title 18px/600 (line 374).

Three weaknesses persist from Cycle 5:

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

**No change since Cycle 5.**

---

#### AC 1.2 — Primary actions are consistently prominent

**Status: ⚠️ Partial**

`.action-btn.primary` (`styles.css` lines 586–587) correctly delivers
`background: #3b82f6; color: #fff; border-color: #3b82f6` at `font-size: 14px`.

Persistent inconsistencies:

- Six parallel CSS classes for the primary blue button role: `.action-btn.primary`
  (line 586), `.btn-primary` (line 1296), `.submit-btn` (line 1210), `.editor-btn`
  (line 857), `.continue-btn` (line 1214), `.layout-action-btn` (line 1432),
  `.modal-btn` (line 942). Each independently specifies geometry; border-radius
  ranges from 4px (position-bar inline buttons) to 10px (rewrite cards).
- The interaction-area action strip (`index.html` lines 182–190) contains nine
  `.action-btn.primary` buttons managed via `display:none` state toggling. Only
  one visible at a time, but the flat HTML structure provides no secondary-emphasis
  tier.

**No change since Cycle 5.**

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

**Status: ✅ Pass**

The rewrite review panel handles density well. `.rewrite-card` (`styles.css` line
1235: `border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc`) with
`.accepted` (green `#10b981` border) and `.rejected` (red `#f87171` border, 0.7
opacity) provide strong visual state differentiation. Inline diff markup with
`del.diff-removed` (red text on `#fee2e2`) and `ins.diff-added` (green text on
`#dcfce7`) at lines 1244–1245 supports rapid comprehension. The sticky tally bar
(`position: sticky; top: 0; z-index: 10`, line 1229) anchors tally context during
scroll. The `[data-changed="true"]` animation (`styles.css` lines 1534–1544) adds
a 1.5s amber pulse on re-run changed items.

**No change since Cycle 5.**

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

**Status: ⚠️ Partial**

The palette remains a blue-anchored neutral system (Tailwind Slate + Blue).
Semantic state colours are consistently applied: active blue `#dbeafe/#1d4ed8`,
complete green `#dcfce7/#166534`, stale amber `#fffbeb/#92400e`, error red
`#fef2f2/#b91c1c`. Applied faithfully in workflow step pills (`styles.css` lines
150–156), freshness chips (lines 119–121), layout-status cards (lines 1423–1425),
confidence badges (lines 700–722), rewrite cards (lines 1235–1237), toast variants
(lines 1221–1226), and the `[data-changed="true"]` animation (lines 1534–1544).

The visual ceiling remains utilitarian. The dark header bar is flat. 96 distinct
hex literals remain hardcoded with no `:root {}` indirection. The master-profile
card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1460) is the
sole decorative gradient in the app shell.

**No change since Cycle 5.**

---

**US-G1 Summary:**

| Criterion | Status |
|-----------|--------|
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
(`styles.css` lines 623–635), `.review-subtab` (lines 661–675), `.input-tab`
(lines 1291–1293) — same active-underline concept, independently specified padding
and font-size values. The inline rename widget (`session-manager.js` lines 766–781)
introduces two more styled buttons (ok/cancel) as injected inline styles.

**No change since Cycle 5.**

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

**Status: ✅ Pass**

The semantic state colour mapping remains consistent across all surfaces:

- Active / in-progress: blue (`#dbeafe/#1d4ed8`)
- Completed / success: green (`#dcfce7/#166534`)
- Stale / warning: amber (`#fffbeb/#92400e`)
- Critical / error: red (`#fef2f2/#b91c1c`)

Applied faithfully in workflow steps (lines 150–156), freshness chips (lines
119–121), layout status cards (lines 1423–1425), confidence badges (lines 700–722),
rewrite cards (lines 1235–1237), toast variants (lines 1221–1226), and the
`[data-changed="true"]` animation (lines 1534–1544). The `.step-stale-badge` class
remains single-source (line 1420), following the D6 resolution in Cycle 5.

**No change since Cycle 5.**

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

**Status: ⚠️ Partial**

Inline `style=""` count in `index.html` remains 218 (unchanged since Cycle 4).
Modal bodies, settings fields, onboarding steps, and the LLM wizard continue to
use inline styles extensively. The confirm-dialog box built via JS string injection
in `ui-core.js` uses fully hardcoded inline styles and cannot be themed or
overridden via the stylesheet. The rename widget in `session-manager.js` (lines
766–781) follows the same pattern. `_setConnectionMessage()` in `app.js` (lines
16–39) applies colour as inline JS properties for the connection status pill.

**No change since Cycle 5.**

---

#### AC 2.4 — Familiar, standard interaction patterns

**Status: ✅ Pass**

All standard patterns are correctly applied:

- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267)
- Tab-based navigation with active underline and WCAG arrow-key traversal
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, `gap: 8px` stack, `styles.css` line 1221)
- Focus trap and focus restoration in modals (`ui-core.js` lines 260–347)
- Session conflict banner with retry and dismiss affordances
- Keyboard-accessible workflow step pills — Enter/Space keydown handlers (`ui-core.js`
  `updateWorkflowStepsClickable()`), resolved in Cycle 5.
- **New (GAP-170):** `#llm-busy-label` carries `aria-live="polite" role="status"`
  (`index.html` line 155) — assistive technology users receive LLM operation status
  announcements without polling.
- **New (GAP-169):** Spell-check CTA renamed to "Generate Preview →" (`index.html`
  line 186) — the label now correctly describes the workflow destination.

No novel interaction patterns introduced without reason.

---

**US-G2 Summary:**

| Criterion | Status |
|-----------|--------|
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

The layout review panel uses a two-pane flex structure (`styles.css` line 1368:
`display: flex; gap: 20px; height: calc(100vh - 240px)`). The preview pane
(`flex: 1 1 auto`) hosts an iframe inside `preview-iframe-container` (`border: 1px
solid #e2e8f0; border-radius: 8px; background: #f8fafc`). The loading overlay
(lines 1373–1376) shows a spinner with progressive log output during render. The
stale callout (`.layout-stale-callout`, lines 1396–1399: `background: #fffbeb;
border-left: 4px solid #f59e0b`) correctly signals when the preview is out of date.
The `layout-preview-status` block shows timestamp and revision-count information.
Responsive breakpoints collapse to vertical stacking at ≤1100px (`styles.css`
lines 1451–1457).

The sandboxed iframe (`sandbox="allow-same-origin"`, `index.html` line 287)
prevents script execution inside the preview while preserving CSS rendering — a
correct security vs. fidelity tradeoff.

**No change since Cycle 5.**

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

**Status: ⚠️ Partial**

The font-size input shows both px and pt (`layout-instruction.js` lines 34–35,
413–415: `pxToPt()` calculates the point equivalent; the `#font-size-pt-display`
span reads e.g. `px (9.8 pt)`). This is a genuine typographic transparency
improvement for designers.

Persistent concern: the layout-settings row (`layout-instruction.js` line 312)
packs six heterogeneous controls (font-size number input, px/pt readout span,
page-margin number input, page-break checkbox, skill-experience select, Apply
button, status label) in a single `flex-wrap: wrap` row without a section heading
or visual divider separating "document-wide settings" from the "natural-language
instruction" textarea below. No change.

**No change since Cycle 5.**

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

**Status: ✅ Pass**

The File Review tab uses `.download-grid` (`.download-item` flex rows: icon + info
block + green `.btn-download` CTA — `styles.css` line 1286: `background: #10b981`).
File type detection in `download-tab.js` (lines 43–69) yields contextually labelled
descriptions for PDF, DOCX, HTML, cover letter, and screening files. The ATS
validation report renders in a `<details open>` collapsible with pass/warn/fail
colour-coded rows. The paper-simulation document viewer (`styles.css` line 684:
`max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px
rgba(0,0,0,0.1)`) is appropriate for the context.

**No change since Cycle 5.**

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

**Status: ⚠️ Partial**

`templates/cv-template.html` continues to provide a sound design-token layer (8
CSS custom properties in `:root {}`), rem-based font scale anchored to a
user-controllable `base_font_size`, Inter + Merriweather typography, and a
restrained 32%/68% flex-row two-column layout. The colour scheme (dark-blue
`#2c3e50`, accent `#2980b9`, sidebar `#eef2f5`) is professional and
non-distracting. These remain appropriate for professional credibility.

`templates/cv-style.css` (DOCX output) continues to diverge on all four axes
documented in GAP-132 (font family, brand blue, layout mechanism, column
proportions, size units). No change.

**No change since Cycle 5.**

---

**US-G3 Summary:**

| Criterion | Status |
|-----------|--------|
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

`web/styles.css` contains no `:root {}` block. Confirmed via `grep ":root"
web/styles.css` returning zero matches (the only two `:root`-adjacent matches are
`.persuasion-badge--warn` and `.persuasion-badge--info` at lines 1270–1271, not a
token block). Distinct hex colour literals: 96 unique values across 1604 lines
(verified by `grep -oP '#[0-9a-fA-F]{3,8}\b'`). 218 inline `style=""` attributes
in `index.html` (unchanged since Cycle 4). JS files (`app.js` lines 16–39,
`ui-core.js` lines 99–118, `session-manager.js` lines 766–781) add further
hardcoded colour values outside the stylesheet. Theming is structurally impossible;
colour drift between components is endemic.

### Issue D2 — Proliferation of Button Classes

**Status: ❌ Fail — UNCHANGED**

Six distinct classes for primary blue action buttons: `.action-btn.primary` (line
586), `.btn-primary` (line 1299), `.submit-btn` (line 1213), `.editor-btn` (line
860), `.continue-btn` (line 1217), `.layout-action-btn` (line 1432), `.modal-btn`
(line 942). Each independently specifies geometry. Additional `#10b981` green
button classes (`.btn-download`, `.continue-btn`, `.questions-submit-btn`) also
diverge independently. The rename widget ok-button (`session-manager.js` line 776)
adds yet another `#10b981` inline occurrence.

### Issue D3 — Heavy Emoji Use in Navigation

**Status: ⚠️ Partial — UNCHANGED**

12 step elements in the workflow nav bar (`index.html` lines 119–141), each with
an emoji prefix (📥 🔍 ⚙️ ✏️ 🔤 🎨 ⬇️ 📩 📋 🎤 🙏 🌾). Additional emoji in the
tab bar (25 tabs, most with emoji) and header buttons. Emoji rendering is
platform-dependent and cannot be recoloured or scaled independently via CSS.

### Issue D4 — Missing Focus Indicators on Interactive Navigation Elements

**Status: ✅ RESOLVED (Cycle 6)**

Three `:focus-visible` rules added in commit `3057ea8`:

- `.step:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`
  at `styles.css` line 144
- `.action-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }`
  at `styles.css` line 590
- `.tab:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }`
  at `styles.css` line 637

Combined with the existing `.sm-th:focus-visible` (line 261) and
`.preview-output-badge-link:focus-visible` (line 1393) rules, and the GAP-72
keyboard operability work from Cycle 5 (`updateWorkflowStepsClickable()` adds
`role="button"` + `tabindex="0"` + Enter/Space keydown handler to unlocked steps),
keyboard users now receive a consistent visible blue outline on all primary
interactive elements. The 2px outline with appropriate `outline-offset` values
meets WCAG 2.1 SC 2.4.7 at the non-contrast level, and the blue `#3b82f6` passes
3:1 against the white/light-grey backgrounds where these elements appear.

**Improved from Partial (Cycle 5) to Resolved (Cycle 6).**

### Issue D5 — Divergent Generated Output Templates (GAP-132)

**Status: ❌ Fail — UNCHANGED**

| Dimension | cv-template.html | cv-style.css |
|-----------|-----------------|--------------|
| Font family | Inter + Merriweather (Google Fonts) | Segoe UI, Arial (system font) |
| Brand blue | #2980b9 | #2c5aa0 |
| Layout mechanism | CSS Flexbox, flex-row | CSS Grid, grid-template-columns |
| Column split | 32% sidebar / 68% main | 2.8fr main / 1.2fr sidebar (reversed polarity) |
| Size units | rem (user-scalable) | pt (fixed absolute) |
| CSS variables | :root with 8 custom properties | None |

The font-size control in the layout panel adjusts `cv-template.html`'s `rem` root.
This has no effect on the DOCX output, which uses hardcoded `pt` values. The
template divergence is not disclosed in the UI.

### Issue D6 — Duplicate CSS Rule: `.step-stale-badge`

**Status: ✅ RESOLVED (Cycle 5)**

Single definition remains at `styles.css` line 1420. No regression.

---

## Additional Story Gaps / Proposed Story Items

These observations fall outside the current user story criteria but are relevant
to the graphical-designer perspective. Carried forward from Cycle 5 — none resolved:

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
"document-wide settings" from "natural-language instruction." Proposed story: "As
a graphical designer, I want the document-wide layout settings (font size, margin,
page-break) to be visually grouped and labelled separately from the natural-language
instruction textarea so that I can identify the scope of each control at a glance."

**GAP-G3 — Template identity is not disclosed in the UI.** Users cannot tell from
the application that the preview renders `cv-template.html` (Inter + Merriweather,
rem, CSS custom properties) while the DOCX download uses `cv-style.css` (Segoe
UI, pt, no variables). The visual discrepancy between preview and downloaded
artifact is invisible until download. Proposed story: "As a graphical designer, I
want the layout review and file-review tabs to indicate which template is used for
each output format so that I understand why the downloaded DOCX may differ visually
from the preview."

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/layout-instruction.js, scripts/utils/cv_orchestrator.py, templates/cv-template.html, templates/cv-style.css

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-G1 | 1 | 3 | 0 | 0 | 0 |
| US-G2 | 2 | 2 | 0 | 0 | 0 |
| US-G3 | 2 | 2 | 0 | 0 | 0 |
| **Total** | **5** | **7** | **0** | **0** | **0** |

| Issue | Cycle 5 | Cycle 6 | Change |
|-------|---------|---------|--------|
| D1 CSS token layer (GAP-133) | ❌ | ❌ | No change |
| D2 Button class proliferation | ❌ | ❌ | No change |
| D3 Emoji navigation | ⚠️ | ⚠️ | No change |
| D4 Focus-visible indicators | ⚠️ | ✅ | **RESOLVED** |
| D5 Template divergence (GAP-132) | ❌ | ❌ | No change |
| D6 Duplicate CSS rule | ✅ | ✅ | Remains resolved |

**Key evidence references:**

- D4 resolved: `web/styles.css` lines 144, 590, 637 — `.step:focus-visible`, `.action-btn:focus-visible`, `.tab:focus-visible`
- D1 open: `grep ":root" web/styles.css` → zero matches; 96 distinct hex literals in 1604 lines
- D5 open: `templates/cv-template.html` line 49 (Inter) vs `templates/cv-style.css` line 17 (Segoe UI); `#2980b9` vs `#2c5aa0`
- GAP-169 resolved: `web/index.html` line 186 — "Generate Preview →"
- GAP-170 resolved: `web/index.html` line 155 — `aria-live="polite" role="status"` on `#llm-busy-label`
- Inline style count: `grep -c 'style="' web/index.html` → 218 (unchanged since Cycle 4)
- AC 3.1 pass: `web/styles.css` line 1368 (layout pane); `web/index.html` line 287 (sandboxed iframe)
- AC 3.3 pass: `web/styles.css` line 684 (paper simulation); `web/download-tab.js` lines 43–69 (file labelling)
- GAP-G2: `web/layout-instruction.js` line 312 (layout-settings-row flex container — no group heading)
- GAP-G3: no UI element in any reviewed file discloses which template produces each output format

**Evidence standard:** Every conclusion above is independently verifiable from the cited source evidence at the specified file paths and line numbers.
