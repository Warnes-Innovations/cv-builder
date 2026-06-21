<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review — CV Builder Application

Reviewer persona: Graphical Designer
Scope: Application UI visual quality + Generated materials visual quality
Cycle: 4
Date: 2026-06-18
Time: ~19:00 ET

Source files read:

- `web/index.html` (719 lines)
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css` (1601 lines)
- `web/layout-instruction.js`
- `web/download-tab.js`
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `templates/cv-template.html`
- `templates/cv-style.css`

Legend: ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Cycle 4 Delta Assessment

Compared to Cycle 3, file line counts are essentially unchanged:
- `web/styles.css`: 1601 lines (was 1602)
- `web/index.html`: 719 lines (was 712 — marginal growth)
- `templates/cv-template.html`: 861 lines
- `templates/cv-style.css`: 236 lines

Inline style count in `index.html` has grown to 218 (was 216 in Cycle 3).

The five top defects identified in Cycle 3 (D1–D5) remain unresolved.

New finding this cycle: `web/layout-instruction.js` introduces the `pxToPt()` helper (line 33) and a live pt readout beside the base-font-size input. This is a genuine positive for graphical-designer usability — designers think in points; the UI now renders both "13 px (9.8 pt)" inline — and is documented below under AC 3.2.

---

## GAP-Specific Verifications (Cycle 4)

### GAP-132 — Divergent CV Templates

CONFIRMED OPEN. No changes to either template file.

`templates/cv-template.html`:
- Font: `'Inter', sans-serif` (body); `'Merriweather', serif` available for name heading (Google Fonts CDN)
- Brand colour: `--primary-color: #2c3e50`; accent `--accent-color: #2980b9`
- Layout: CSS Flexbox, `flex-direction: row`; sidebar explicitly set at 32% / main at 68%
- Size units: `rem`-based scale anchored to user-settable `html { font-size: <base_font_size> }`
- CSS design tokens: `:root {}` with 8 custom properties

`templates/cv-style.css`:
- Font: `"Segoe UI", Arial, sans-serif` — no webfont; degrades to Arial on macOS/Linux
- Brand colour: `#2c5aa0` (a more saturated blue than the HTML template's `#2980b9`)
- Layout: CSS Grid `grid-template-columns: 2.8fr 1.2fr` — opposite proportions (wide main / narrow sidebar)
- Size units: `pt` throughout (e.g., `11pt` body, `24pt` name heading)
- CSS design tokens: none

Summary: Templates diverge on font family, brand blue value, layout mechanism, column proportions, and size unit system. The preview iframe renders the HTML template; the exported DOCX uses cv-style.css. Users cannot trust the preview as a fidelity guide for the downloadable artifact.

---

### GAP-133 — No CSS Design Token Layer

CONFIRMED OPEN.

`grep ":root" web/styles.css` returns zero matches. The 1601-line stylesheet retains approximately 50 distinct hex colour literals as bare values with no variable indirection. No change since Cycle 3.

---

## Section A: Application Evaluation

---

### US-G1: Visual Hierarchy and Readability

---

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

⚠️ Partial

The stylesheet provides a functional typographic hierarchy in the document viewer (`styles.css` lines 685–690): `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body `p` 14px/line-height 1.6. Header app title is 20px/600 (`styles.css` line 21); conversation panel title 18px/600 (line 375).

Three weaknesses persist from Cycle 3:

1. **No shared typographic scale.** No `:root {}` token block. Helper-text sizes — `11px`, `12px`, `13px`, `14px`, `15px` — recur independently across components, producing arbitrary size drift between panels. The layout-instruction pane alone mixes `0.82em`, `0.83em`, `0.85em`, `0.88em`, and `0.9em` labels within a single card (`layout-instruction.js` lines 313, 322, 332, 336).

2. **Position-bar action buttons use raw inline styles.** The "Master CV", "ATS Report", and "Job Analysis" buttons (`index.html` lines 100–105) carry `style="background:#f1f5f9;border:1px solid #e2e8f0;…font-size:0.8em;padding:2px 7px"` inline. These are meaningful workflow entry points rendered with the visual weight of tertiary helper elements.

3. **Helper text from JS is outside the stylesheet.** `ui-core.js` injects helper text via inline `style.cssText` assignments (lines 381–395 confirm-dialog; lines 954, 1051, 1061, 1076 model-wizard labels). Source-level text annotations in the settings modal use `font-size: 0.78em` hardcoded strings outside any CSS class.

**No regression, no improvement since Cycle 3.**

---

#### AC 1.2 — Primary actions are consistently prominent

⚠️ Partial

`.action-btn.primary` (`styles.css` lines 587–588) correctly delivers `background: #3b82f6; color: #fff; border-color: #3b82f6` at `font-size: 14px`. The Send button matches. Hover darkens to `#2563eb`.

Persistent inconsistencies:

- Six parallel CSS classes exist for the primary blue button role: `.action-btn.primary` (line 587), `.btn-primary` (line 1296), `.submit-btn` (line 1211), `.editor-btn` (line 858), `.continue-btn` (line 1215), `.layout-action-btn` (line 1429), `.modal-btn` (line 943). Each independently specifies geometry (padding, border-radius, font-size). Border-radius ranges from 4px to 10px across these classes.
- The interaction-area action strip can display multiple blue primary buttons simultaneously (`index.html` lines 182–190: Analyze, Recommend, Generate, and multiple "proceed" buttons). No secondary-emphasis tier distinguishes the currently-active-step CTA from upcoming steps.

**No change since Cycle 3.**

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

✅ Pass

The rewrite review panel remains the application's densest surface and continues to handle it well. `.rewrite-card` (`styles.css` line 1232: `border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc`) with `.accepted` (green `#10b981` border) and `.rejected` (red `#f87171` border, 0.7 opacity) provide strong visual state differentiation. Inline diff markup with `del.diff-removed` (red text on `#fee2e2`) and `ins.diff-added` (green text on `#dcfce7`) at lines 1241–1242 supports rapid comprehension of proposed changes. The sticky tally bar (line 1226: `position: sticky; top: 0; z-index: 10`) anchors tally context during scroll.

The analysis page card hierarchy (role card on gradient `#eff6ff → #dbeafe`, section cards on `border: 1px solid #e2e8f0` white background, skill badges on `#dbeafe` / missing on `#fee2e2`) remains clear.

**No regression; no change.**

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

⚠️ Partial

The palette remains a blue-anchored neutral system (Tailwind Slate + Blue). Semantic state colours are consistently applied: active blue `#dbeafe/#1d4ed8`, complete green `#dcfce7/#166534`, stale amber `#fffbeb/#92400e`, error red `#fef2f2/#b91c1c`. These are reflected coherently in workflow step pills (`styles.css` lines 150–156), freshness chips (lines 119–121), layout-status cards (lines 1420–1422), confidence badges (lines 700–722), and rewrite cards (lines 1232–1234).

The visual ceiling remains utilitarian. The dark header bar is flat. The master-profile card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1457) is the sole decorative use of gradient in the app shell. No change in token structure: approximately 50 distinct hex literals remain hardcoded with no `:root {}` indirection.

**No regression; no improvement.**

---

**Summary — US-G1:**

| Criterion | Status |
|-----------|--------|
| 1.1 Heading hierarchy distinct | ⚠️ |
| 1.2 Primary actions prominent | ⚠️ |
| 1.3 Dense surfaces readable | ✅ |
| 1.4 Colour supports usability and attractiveness | ⚠️ |

Acceptance Criteria verdict: ⚠️ Partial — hierarchy is functional on sparse surfaces; degrades where multiple primary-weight controls appear together or where position-bar entry-point buttons are rendered at sub-tertiary weight.

---

### US-G2: Cross-Stage Visual Consistency

---

#### AC 2.1 — Repeated control types share consistent styling

⚠️ Partial

Button proliferation is unchanged (six primary-role classes; see AC 1.2). Tab underline pattern continues to be implemented three times independently: `.tab` (`styles.css` lines 624–636), `.review-subtab` (lines 662–676), `.input-tab` (lines 1289–1291) — same active-underline concept, independently specified padding and font-size values. Layout-instruction input controls pack six differently-styled elements in one flex row.

**No change since Cycle 3.**

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

✅ Pass

The semantic state colour mapping remains consistent across all surfaces:

- Active / in-progress: blue (`#dbeafe/#1d4ed8`)
- Completed / success: green (`#dcfce7/#166534`)
- Stale / warning: amber (`#fffbeb/#92400e`)
- Critical / error: red (`#fef2f2/#b91c1c`)

Applied faithfully in workflow steps (lines 150–156), freshness chips (lines 119–121), layout status cards (lines 1420–1422), confidence badges (lines 700–722), rewrite cards (lines 1232–1234), and the download-tab ATS report row colorisation (`download-tab.js` line 118: `background: '#f0fdf4'/'#fef9c3'/'#fee2e2'` for pass/warn/fail).

**Residual maintenance risk:** `.step-stale-badge` is defined twice (`styles.css` lines 180 and 1417) with incompatible values — `rgba(245,158,11,0.16)` background in line 180 vs `#fed7aa` background + `#7c2d12` text + `font-size: 10px` in line 1417. No visible symptom currently but constitutes a CSS specificity trap. Not a regression but not resolved since Cycle 3.

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

⚠️ Partial

Inline `style=""` count in `index.html` is now 218 (grew by 2 from Cycle 3's 216). Modal bodies, settings fields, onboarding steps, and the LLM wizard continue to use inline styles extensively. The confirm-dialog box built via JS string injection in `ui-core.js` (lines 381–395) uses fully hardcoded inline styles and cannot be themed or overridden via the stylesheet.

**Minor regression: inline style count increased by 2.** All other findings unchanged.

---

#### AC 2.4 — Familiar, standard interaction patterns

✅ Pass

All standard patterns remain correctly applied:
- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267, 405)
- Tab-based navigation with active underline and WCAG arrow-key traversal (`ui-core.js` lines 515–541)
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, `gap: 8px` stack, `styles.css` line 1219)
- Focus trap and focus restoration in modals (`ui-core.js` lines 260–347)
- Session conflict banner with retry and dismiss affordances

No novel interaction patterns introduced without reason.

---

**Summary — US-G2:**

| Criterion | Status |
|-----------|--------|
| 2.1 Repeated controls consistent | ⚠️ |
| 2.2 Status surfaces coherent | ✅ |
| 2.3 Tabs, workflow bar, modals cohesive | ⚠️ |
| 2.4 Standard interaction patterns | ✅ |

Acceptance Criteria verdict: ⚠️ Partial — state colour language is coherent and well-maintained; component class structure remains fractured; inline-style count continues to grow.

---

### US-G3: Preview and Output Presentation Quality

---

#### AC 3.1 — Layout-preview area frames content clearly

✅ Pass

The layout review panel uses a two-pane flex structure (`styles.css` line 1365: `display: flex; gap: 20px; height: calc(100vh - 240px)`). The preview pane (`flex: 1 1 auto`) hosts an iframe inside `preview-iframe-container` (`border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc`). The loading overlay (lines 1370–1373) shows a spinner with progressive log output during render. The stale callout (`.layout-stale-callout`, lines 1393–1396: `background: #fffbeb; border-left: 4px solid #f59e0b`) correctly signals when the preview is out of date. The `layout-preview-status` block (rendered by `layout-instruction.js` `renderLayoutPreviewStatus()`) shows timestamp and revision-count information. Responsive breakpoints collapse to vertical stacking at ≤1100px (`styles.css` lines 1448–1454).

The sandboxed iframe (`sandbox="allow-same-origin"`, `index.html` line 287) prevents script execution inside the preview while preserving CSS rendering — a correct security vs. fidelity tradeoff.

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

⚠️ Partial

**New positive finding (Cycle 4):** The font-size input now shows both px and pt: `"13 px (9.8 pt)"`. The `pxToPt()` function (`layout-instruction.js` lines 33–35) implements the standard 96dpi/72pt screen convention correctly. The live pt readout updates on `input` events (line 497). This is a meaningful typographic transparency improvement for designers and print-production users — they can express the font size in the units that match page-layout tools. **This is a genuine improvement since Cycle 3.**

Persistent concern: the layout-settings row (`layout-instruction.js` lines 312–348) packs six heterogeneous controls (font-size number input, px/pt readout span, page-margin number input, page-break checkbox, skill-experience select, Apply button, status label) in a single `flex-wrap: wrap` row at `gap: 10px`. The visual grouping does not communicate that all six govern global layout parameters rather than the instruction textarea below. No spatial or typographic cue separates this "document-wide settings" zone from the "natural-language instruction" zone. A section heading or visual divider would resolve the ambiguity.

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

✅ Pass

The File Review tab uses `download-tab.js` to build `.download-grid` (`.download-item` flex rows: icon + info block + green `.btn-download` CTA). File type detection yields contextually labelled descriptions:
- PDF: "ATS-optimised PDF — machine-readable for automated screening" or "Human-readable PDF — for human reviewers and printing"
- DOCX: format-aware variants; cover letter and screening files labelled distinctly
- HTML: "HTML format with embedded JSON-LD structured data"

The ATS validation report renders in a `<details open>` collapsible with a pass/warn/fail colour-coded `<table>` (green/amber/red row backgrounds: `download-tab.js` line 118). Blocked files are shown at `opacity: 0.75`. The paper-simulation document viewer (`styles.css` line 682: `max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`) is appropriate for the context.

**No change since Cycle 3.**

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

⚠️ Partial

`templates/cv-template.html` strengths confirmed unchanged:
- `:root {}` with 8 CSS custom properties (primary, secondary, accent, bg, sidebar-bg, text-main, text-muted, border-color)
- `rem`-based font scale with user-settable `html { font-size: ... }` root
- Inter 300/400/600/700 + Merriweather loaded from Google CDN
- `32%` sidebar / `68%` main flex-row layout
- `page-break-inside: avoid` on experience entries
- JSON-LD structured data for ATS machine parsing
- Sidebar section titles: `0.85rem / letter-spacing: 1px / font-weight: 700 / text-transform: uppercase`

These are appropriate design decisions for professional credibility.

`templates/cv-style.css` (DOCX output) continues to diverge on all four axes documented in GAP-132. No change. A user who adjusts the preview's font size in the layout panel (which governs `cv-template.html`'s `rem` anchor) will not see that change reflected in the downloaded DOCX, which uses absolute `pt` values.

---

**Summary — US-G3:**

| Criterion | Status |
|-----------|--------|
| 3.1 Layout preview frames clearly | ✅ |
| 3.2 Controls don't compete with preview | ⚠️ |
| 3.3 Final file-review surfaces clean | ✅ |
| 3.4 Generated materials professionally credible | ⚠️ |

Acceptance Criteria verdict: ⚠️ Partial — preview and file-review screens are largely polished; AC 3.2 has an improvement (px/pt display) but the settings row grouping remains ambiguous; AC 3.4 is blocked by the two divergent template systems.

---

## Section B: Generated Materials Evaluation

### Typography

⚠️ Partial

`templates/cv-template.html` uses a well-constructed type system:
- Inter (weights 300/400/600/700) for body and labels; Merriweather available for name heading
- `rem`-based scale anchored to `html { font-size: <base_font_size> }`; 13px default = 9.75pt
- `line-height: 1.6` on body
- Sidebar titles at `0.85rem / letter-spacing: 1px / font-weight: 700 / text-transform: uppercase`

`templates/cv-style.css` (DOCX): `font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.4` — lower typographic quality and visually different from the HTML template's Inter/Merriweather combination.

### Colour and Visual Identity

⚠️ Partial

`cv-template.html`: dark-blue scheme `--primary-color: #2c3e50`, accent `--accent-color: #2980b9`, sidebar `--sidebar-bg: #eef2f5`. Clean, professional, non-distracting.

`cv-style.css`: `#2c5aa0` (DOCX brand blue — 15% more saturated than HTML template's `#2980b9`). Two documents produced by the same session have different brand colours.

### Layout

✅ Pass

The HTML template's two-column flex-row (32/68 split) is a recognised professional resume format. Sidebar carries contact, skills, education; main carries experience and achievements. `page-break-inside: avoid` prevents mid-entry page cuts. `max-width: 215.9mm` + `--page-margin` correctly sized for US Letter PDF. The layout is restrained and functional.

### Preview Fidelity

⚠️ Partial

The layout review iframe serves the HTML template rendered by the server. At ≥1280px viewport the preview occupies approximately 960px sharing space with the 320px input pane. The CV's natural print width is 215.9mm (~818px at 96dpi). The preview renders close to natural width with no forced scale. No viewport-zoom or DPI-scale control is exposed, so at non-standard viewports or HiDPI displays the preview may not accurately represent the printed artifact's proportions.

The `pxToPt()` helper (`layout-instruction.js` line 33) is mathematically correct: 96px/in ÷ 72pt/in = 0.75 px/pt, applied as `px * 0.75`. The live readout allows designers to reason about the CV's printed font size in points rather than arbitrary screen pixels. This is an additive improvement to preview fidelity communication.

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer (GAP-133)

❌ Fail — UNCHANGED

`web/styles.css` contains no `:root {}` block. Approximately 50 distinct hex colour literals are hardcoded across 1601 lines. 218 inline `style=""` attributes in `index.html` add further hardcoded values outside the stylesheet entirely (count grew by 2 since Cycle 3). Theming is structurally impossible; colour drift between components is endemic.

### Issue D2 — Proliferation of Button Classes

❌ Fail — UNCHANGED

Six distinct classes for primary blue action buttons: `.action-btn.primary` (line 587), `.btn-primary` (line 1296), `.submit-btn` (line 1211), `.editor-btn` (line 858), `.continue-btn` (line 1215), `.layout-action-btn` (line 1429), `.modal-btn` (line 943). Note: the `editor-btn.secondary` variant (grey, `#6b7280`) further illustrates the drift — the secondary colour is independently specified rather than derived from the primary.

### Issue D3 — Heavy Emoji Use in Navigation

⚠️ Partial — UNCHANGED

13 emoji characters in the workflow step bar (confirmed by reading `index.html` lines 119–142), with additional emoji in the tab bar and action buttons. Emoji rendering is platform-dependent (Apple Color Emoji vs Noto Color Emoji vs Windows Segoe UI Emoji) and cannot be recoloured or scaled independently.

### Issue D4 — Missing Focus Indicators on Interactive Navigation Elements

⚠️ Partial — UNCHANGED

`.tab` and `.step` elements have no `:focus-visible` rule in `styles.css`. Only `.sm-th` (line 261) and form inputs expose explicit `focus-visible` styling. The keyboard-focus visual affordance on the primary navigation elements (tabs, workflow pills) is absent.

### Issue D5 — Divergent Generated Output Templates (GAP-132)

❌ Fail — UNCHANGED

| Dimension | cv-template.html | cv-style.css |
|-----------|-----------------|-------------|
| Font family | Inter + Merriweather (Google Fonts) | Segoe UI, Arial (system font) |
| Brand blue | #2980b9 | #2c5aa0 |
| Layout mechanism | CSS Flexbox, flex-row | CSS Grid, grid-template-columns |
| Column split | 32% sidebar / 68% main | 2.8fr main / 1.2fr sidebar (reversed polarity) |
| Size units | rem (user-scalable) | pt (fixed absolute) |
| CSS variables | :root with 8 custom properties | None |

The font-size control in the layout panel adjusts `cv-template.html`'s `rem` root. This has no effect on the DOCX output, which uses hardcoded `pt` values. The template divergence is not disclosed in the UI.

### Issue D6 — Duplicate CSS Rule: `.step-stale-badge` (NEW — Cycle 4)

⚠️ Risk

`.step-stale-badge` is defined at two locations with incompatible values:

- `styles.css` line 180: `background: rgba(245,158,11,0.16); color: inherit;`
- `styles.css` line 1417: `background: #fed7aa; color: #7c2d12; border-radius: 4px; padding: 1px 5px; font-size: 10px; font-weight: 600; vertical-align: middle;`

The second definition (line 1417) wins due to cascade order and contains the richer visual spec, so there is no visible symptom today. However the first definition is dead code that creates a false impression the rule is "lightweight" — any future edit at line 180 will produce no effect, causing confusion. This is a low-priority cleanup but is explicitly tracked here for the first time.

---

## Summary Table

| Story | Criterion | Cycle 3 | Cycle 4 | Change |
|-------|-----------|---------|---------|--------|
| US-G1 | 1.1 Heading hierarchy distinct | ⚠️ | ⚠️ | No change |
| US-G1 | 1.2 Primary actions prominent | ⚠️ | ⚠️ | No change |
| US-G1 | 1.3 Dense surfaces readable | ✅ | ✅ | No change |
| US-G1 | 1.4 Colour supports usability and attractiveness | ⚠️ | ⚠️ | No change |
| US-G2 | 2.1 Repeated controls consistent | ⚠️ | ⚠️ | No change |
| US-G2 | 2.2 Status surfaces coherent | ✅ | ✅ | No change |
| US-G2 | 2.3 Tabs, workflow bar, modals cohesive | ⚠️ | ⚠️ | Minor regression (inline style count +2) |
| US-G2 | 2.4 Standard interaction patterns | ✅ | ✅ | No change |
| US-G3 | 3.1 Layout preview frames clearly | ✅ | ✅ | No change |
| US-G3 | 3.2 Controls don't compete with preview | ⚠️ | ⚠️ | Improved: px/pt dual display; grouping still ambiguous |
| US-G3 | 3.3 Final file-review surfaces clean | ✅ | ✅ | No change |
| US-G3 | 3.4 Generated materials professionally credible | ⚠️ | ⚠️ | No change |

---

## Top Defects (Priority Order)

| ID | Priority | Issue | GAP | Cycle 4 Status |
|----|----------|-------|-----|----------------|
| D5 | HIGH | Two CV output templates produce inconsistent brand identity — font family, brand blue, layout, column proportions, size units all differ | GAP-132 | OPEN — no change |
| D1 | HIGH | No CSS custom properties in web/styles.css — ~50 hardcoded colour literals; 218 inline styles in index.html; theming structurally impossible | GAP-133 | OPEN — inline count +2 (minor regression) |
| D2 | MEDIUM | Six parallel button classes for same primary action role — independently maintained geometry | — | OPEN — no change |
| D3 | MEDIUM | 13+ emoji in workflow navigation — platform-inconsistent rendering; cannot be themed | — | OPEN — no change |
| D4 | MEDIUM | `.tab` and `.step` elements lack `:focus-visible` styling — keyboard-focus affordance absent | — | OPEN — no change |
| D6 | LOW | `.step-stale-badge` defined twice in styles.css with incompatible values — dead first definition, silent override risk | — | NEW in Cycle 4 |

---

## Additional Story Gaps / Proposed Story Items

The following are observations that fall outside the current user story criteria but are relevant to the graphical-designer perspective:

**GAP-G1 — No zoom/scale control on layout preview iframe.** At non-standard viewport widths or HiDPI displays, the iframe preview renders at a fixed width without a user-controlled scale. A designer reviewing a US Letter document on a 13" laptop at 150% DPI cannot easily validate the printed proportions. Proposed story: "As a graphical designer, I want to scale the preview iframe to 100% / 75% / fit-to-pane so that I can evaluate the printed proportions accurately at any viewport size."

**GAP-G2 — Layout panel settings row grouping is visually ambiguous.** The six controls in the layout-settings bar (font size, margin, publications checkbox, skill-experience select, Apply button, status) are visually co-mingled with the instruction textarea below them. No section heading or horizontal rule separates "document-wide settings" from "natural-language instruction." Proposed story: "As a graphical designer, I want the document-wide layout settings (font size, margin, page-break) to be visually grouped and labelled separately from the natural-language instruction textarea so that I can identify the scope of each control at a glance."

**GAP-G3 — Template identity is not disclosed in the UI.** Users cannot tell from the application that the preview renders `cv-template.html` (Inter + Merriweather, rem, CSS custom properties) while the DOCX download uses `cv-style.css` (Segoe UI, pt, no variables). The visual discrepancy between preview and downloaded artifact is invisible until download. Proposed story: "As a graphical designer, I want the layout review and file-review tabs to indicate which template is used for each output format so that I understand why the downloaded DOCX may differ visually from the preview."

---

## Evidence Summary

| Source | Evidence type | Finding |
|--------|--------------|---------|
| `web/styles.css` line 0 (grep `:root`) | Zero matches | GAP-133 confirmed open |
| `web/styles.css` lines 150–156 | Step state colours | Semantic colour consistency ✅ |
| `web/styles.css` lines 587, 858, 943, 1211, 1215, 1296, 1429 | Button classes | Six primary-role button classes ❌ |
| `web/styles.css` lines 180 and 1417 | Duplicate selector | `.step-stale-badge` defined twice with incompatible values — D6 |
| `web/styles.css` lines 682–684 | Document viewer | Paper-simulation (8.5in / 11in / 0.5in / box-shadow) ✅ |
| `web/styles.css` lines 1365–1454 | Layout review pane | Two-pane flex, iframe, stale callout, responsive breakpoints ✅ |
| `web/index.html` (grep count) | 218 inline styles | Exceeds Cycle 3 count of 216 — minor regression |
| `web/index.html` lines 100–105 | Position-bar buttons | Inline-styled tertiary weight for important workflow entry points ⚠️ |
| `web/layout-instruction.js` lines 33–35 | `pxToPt()` helper | Correct 96dpi/72pt convention; live pt readout in layout panel ✅ |
| `web/layout-instruction.js` lines 312–348 | Settings row HTML | Six controls in unlabelled flex row; grouping ambiguous ⚠️ |
| `templates/cv-template.html` lines 24–34 | `:root {}` block | 8 CSS custom properties; correct design-token layer ✅ |
| `templates/cv-style.css` lines 17–19 | Body font/size | `"Segoe UI", Arial; 11pt` — diverges from HTML template ❌ |
| `templates/cv-style.css` lines 33, 39, 44, 77 | `#2c5aa0` brand blue | Different blue from HTML template's `#2980b9` ❌ |
| `templates/cv-style.css` lines 65–70 | Grid layout | `2.8fr / 1.2fr` — opposite column polarity from HTML template ❌ |
