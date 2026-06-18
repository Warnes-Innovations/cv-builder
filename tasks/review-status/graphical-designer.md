<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review — CV Builder Application

**Reviewer persona:** Graphical Designer
**Scope:** Application UI visual quality + Generated materials visual quality
**Date:** 2026-06-18
**Source files read:**
- `web/index.html` (712 lines)
- `web/app.js` (140 lines)
- `web/ui-core.js` (1950 lines)
- `web/state-manager.js` (580 lines)
- `web/styles.css` (1601 lines)
- `scripts/web_app.py` (1341 lines)
- `scripts/utils/conversation_manager.py` (2469 lines)
- `templates/cv-template.html` (CSS section)
- `templates/cv-style.css`
- `scripts/routes/generation_routes.py` (partial)

Legend: ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Section A: Application Evaluation

---

### US-G1: Visual Hierarchy and Readability

---

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

**⚠️ Partial**

The stylesheet establishes a reasonable typographic hierarchy for the main document viewer area: `h1` at 28px/700, `h2` at 20px/600, `h3` at 16px/600, body `p` at 14px/1.6 line-height (`styles.css` lines 685–690). The header bar uses 20px/600 for the app title (`styles.css` line 21) and the conversation panel titles are 18px/600 (`styles.css` line 375).

However, three structural weaknesses exist:

1. **No shared typographic scale / CSS custom properties.** The stylesheet never declares `:root {}` variables. Font sizes are hardcoded independently at every component — `11px`, `12px`, `13px`, `14px`, `15px` all appear at the helper-text level across different components with no shared token, so relative weight between helper text and labels varies by panel. (`styles.css` lines 37, 97, 100, 192, 200 — cross-component size drift.)

2. **Primary action buttons share the same visual treatment as smaller positioned labels.** Inline styles on the position-bar buttons override the design system: `font-size:0.8em; padding:2px 7px` for the "Master CV", "ATS Report", and "Job Analysis" buttons (`index.html` lines 101–105) makes them look like tertiary UI whereas they are important workflow entry points. No CSS class governs these; they use raw `style=""` attributes.

3. **Helper text in modals is not systematically distinguished.** The settings modal uses 0.78em–0.85em text spans rendered via JS string injection in `ui-core.js` with raw inline style assignments (lines 108–119). This produces readable but not typographically distinctive helper levels.

**What is missing:** A declared type scale (custom properties), a formal size for helper/meta text that is reliably smaller than label text, and a promoted style class for the position-bar action buttons.

---

#### AC 1.2 — Primary actions are consistently prominent

**⚠️ Partial**

Primary workflow buttons (`.action-btn.primary`) consistently use `background: #3b82f6; color: #fff` with 10px/16px padding at 14px font (`styles.css` lines 587–588). The Send button matches. Hover darkens to `#2563eb`. This is correct primary affordance.

However, the following inconsistencies undermine systematic prominence:

- `btn-primary` (lines 1296–1297) duplicates the `.action-btn.primary` rule as a separate class with identical colours but `padding: 10px 20px` — two parallel classes for the same semantic role, potentially diverging over time.
- `editor-btn` (line 858) and `submit-btn` (line 1211) and `continue-btn` (line 1215) each restate button geometry independently.
- The workflow action button strip in the interaction area (`index.html` lines 182–191) shows multiple `.action-btn.primary` buttons simultaneously (Analyze, Recommend, Generate, etc.), only differentiating active context by JS `display:none`. A user who sees two blue primary buttons at once has no hierarchy cue. No secondary-emphasis tier differentiates current-step CTA from upcoming-step CTAs.

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

**✅ Pass**

The rewrite review panel is the densest surface. It uses `.rewrite-card` (border-radius 10px, 1px border, `#f8fafc` background) with `.accepted` and `.rejected` state colours (`styles.css` lines 1232–1234). The diff area uses an inline-diff system with `del.diff-removed` (red on `#fee2e2`) and `ins.diff-added` (green on `#dcfce7`) at lines 1241–1242 — strong visual separation. The tally bar is sticky (line 1226). The card-header badge system (type, weak badge) is consistent (lines 1236–1238). Dense but readable.

The analysis page similarly uses semantic colour zones: role card on gradient `#eff6ff → #dbeafe`, skill badges on `#dbeafe`, missing-skill badges on `#fee2e2` (`styles.css` lines 469–486). Sections use `border: 1px solid #e2e8f0` with white backgrounds for clear visual grouping.

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

**⚠️ Partial**

The palette is a valid blue-anchored neutral system (Tailwind Slate + Blue families). The header dark (`#1e293b`), blue primary (`#3b82f6`), green complete (`#166534`/`#dcfce7`), amber warning (`#92400e`/`#fffbeb`), and red error (`#dc2626`/`#fee2e2`) are applied consistently as semantic state signals across the workflow steps (`styles.css` lines 150–156) and badges.

**Concern — colour count density:** `#64748b` appears 40 times in the stylesheet and a total of ~50 unique named colours are in use across 1601 lines with no CSS variable consolidation. While the colour choices are individually sound, the absence of a token layer creates drift risk and makes the palette appear slightly heterogeneous when components are placed side-by-side.

**Concern — aesthetic ceiling:** The UI reads as a functional tool UI (Bootstrap-adjacent), not a polished product with visual character. The header is a flat dark bar with no logo treatment hierarchy. The master-profile card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)` at `styles.css` line 1457) is the single use of a gradient in the application UI — it stands out as an isolated decorative moment rather than part of a coherent visual language.

---

**Summary — US-G1:**
- AC 1.1: ⚠️ (no token scale, inconsistent helper-text sizing, inline-style position-bar buttons)
- AC 1.2: ⚠️ (multiple button classes for same role; no CTA hierarchy within action strip)
- AC 1.3: ✅ (rewrite cards and analysis panels are readable and well-separated)
- AC 1.4: ⚠️ (palette is semantically correct but not tokenised; visual ceiling is utilitarian)

**Acceptance Criteria verdict:** ⚠️ Partial — users can identify primary actions and current context with moderate effort; hierarchy holds on sparse screens but degrades on multi-button surfaces.

---

### US-G2: Cross-Stage Visual Consistency

---

#### AC 2.1 — Repeated control types share consistent styling

**⚠️ Partial**

Buttons that share the same semantic role have divergent class names:
- Primary actions: `.action-btn.primary`, `.btn-primary`, `.submit-btn`, `.editor-btn`, `.layout-action-btn`
- Secondary/ghost: `.action-btn`, `.btn-secondary`, `.back-btn`, `.rw-btn`

All use approximately the same blue/grey colour scheme but independent padding, border-radius, and font-size values. Border-radius ranges from 4px to 8px to 20px across controls with similar affordance roles.

The tab pattern is tripled: `.tab` (main tab bar, `styles.css` lines 624–636), `.review-subtab` (lines 662–676), and `.input-tab` (lines 1289–1291) all implement the same active-underline pattern with independent class names and marginally different padding values.

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

**✅ Pass**

The semantic state → colour mapping is consistent:
- Active / in-progress: blue (`#dbeafe` / `#1d4ed8`)
- Completed / success: green (`#dcfce7` / `#166534`)
- Stale / warning: amber (`#fffbeb` / `#92400e`)
- Critical / error: red (`#fef2f2` / `#b91c1c`)

This mapping appears in workflow steps (`styles.css` lines 150–156), freshness chips (lines 119–121), layout status cards (lines 1420–1422), confidence badges (lines 700–722), and the rewrite cards (lines 1232–1234). The pattern is applied faithfully across stages.

The one inconsistency: `.step-stale-badge` is defined twice at lines 180 and 1417 with different values. This is a maintenance gap, not currently a visible design inconsistency.

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

**⚠️ Partial**

The workflow bar pills, tab bar, and modal containers share the same border/colour vocabulary. However, the modal system is partially outside the design system: 216 inline `style=""` attributes appear in `index.html` alone. Modal body content, settings fields, onboarding steps, and the LLM wizard body all use inline styles extensively (e.g., `index.html` lines 328–340 for onboarding numbered circles, lines 569–665 for settings form fields). The result is modals that look functional but sit visually apart from the classified component system in `styles.css`.

The `confirm-dialog` box (created in `ui-core.js` line 380) is built via JS string injection with hardcoded inline styles — it cannot be themed.

---

#### AC 2.4 — Familiar, standard interaction patterns

**✅ Pass**

Standard patterns are used throughout:
- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267, 381)
- Tab-based navigation with active underline (industry standard)
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, 8px stack gap, `styles.css` line 1219)
- Focus trap + focus restoration in modals (`ui-core.js` lines 260–347)

No novel interaction patterns were introduced without clear reason.

---

**Summary — US-G2:**
- AC 2.1: ⚠️ (button and tab class proliferation; minor padding drift)
- AC 2.2: ✅ (state/colour mapping is coherent and consistently applied)
- AC 2.3: ⚠️ (216 inline styles in index.html; JS-built dialogs outside design system)
- AC 2.4: ✅ (all patterns are standard and correctly applied)

**Acceptance Criteria verdict:** ⚠️ Partial — the application uses a coherent state colour language but its component classes are fractured; inline styles prevent full design system coherence.

---

### US-G3: Preview and Output Presentation Quality

---

#### AC 3.1 — Layout-preview area frames content clearly

**✅ Pass**

The layout review panel uses a two-column structure (`layout-instruction-panel`, `styles.css` line 1365): a flex-1 preview pane on the left, and a fixed 320px input pane on the right. The preview pane contains a labelled iframe (`"Current Layout Preview"`, `layout-instruction.js` line 279) inside a `preview-iframe-container` with `border: 1px solid #e2e8f0; border-radius: 8px` and a `#f8fafc` background. A loading overlay with a spinner and log text displays during render (`styles.css` lines 1370–1373).

The stale callout (`layout-stale-callout`, lines 1393–1396) with amber left-border and explicit action buttons appears when content has changed since the last render — giving the user clear visual signal that the preview may not represent current state. Responsive breakpoints collapse the two-pane layout to vertical stacking at 1100px (`styles.css` lines 1448–1454).

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

**⚠️ Partial**

The layout input pane is spatially separated from the iframe at 320px fixed width. However the pane contains a dense controls row (`layout-settings-row`, `layout-instruction.js` lines 312–347) with six inputs packed inline: base font size, page margin, a checkbox, a skill experience select, an Apply button, and a status label. The row uses `flex-wrap: wrap; gap: 10px` — compact but potentially overwhelming next to the preview.

The controls row labels (`font-size: 0.85em; font-weight: 600`) are small and the visual grouping does not clearly communicate that all six controls affect global layout settings rather than the instruction textarea below. The instruction textarea and action buttons below it are appropriately sized and don't compete.

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

**✅ Pass**

The download section (`styles.css` lines 1273–1284) uses a `.download-grid` with flex column layout. Each `.download-item` on a `#f8fafc` card row has a file icon, file name at `font-weight: 600`, description at `color: #64748b`, and a green `.btn-download` CTA (`background: #10b981`). The icon/info/action layout is scannable.

The `Generated Files` tab precedes `File Review` in the tab order (`index.html` lines 217–218), giving a sensible two-step cadence.

The document viewer for content preview uses `max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)` (`styles.css` line 682) — a classic paper-on-desk simulation that is clear and familiar.

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

**⚠️ Partial**

The CV template (`templates/cv-template.html`) presents genuine strengths:
- CSS custom properties for colours (`:root` with `--primary-color`, `--accent-color`, `--sidebar-bg`, `--page-margin`)
- A `rem`-based font scale keyed to user-settable `base_font_size`
- Inter + Merriweather Google Fonts dual stack
- Two-column layout (32% left sidebar / 68% right) — a well-established professional resume format
- `page-break-inside: avoid` on experience items
- JSON-LD structured data for ATS parsers
- Uppercase tracked sidebar titles (`letter-spacing: 1px`)

**Critical concern — two templates with divergent visual identities:**

`templates/cv-style.css` (a secondary template, presumably for the ATS DOCX path) uses:
- `font-family: "Segoe UI", Arial, sans-serif` (degrades to Arial on macOS/Linux — less refined)
- `font-size: 11pt` body (pt units vs rem)
- Single-column centred header (`text-align: center; border-bottom: 2px solid #2c5aa0`)
- Grid two-column at `2.8fr / 1.2fr`
- `#2c5aa0` as the brand blue (vs `#2980b9` in the HTML template)

These produce documents with materially different visual identities. A user who reviews the HTML preview and then downloads the DOCX variant gets a different visual product — undermining output credibility.

---

**Summary — US-G3:**
- AC 3.1: ✅ (iframe pane clearly framed with labeling, freshness signaling, and loading state)
- AC 3.2: ⚠️ (dense inline controls row competes visually; grouping ambiguous)
- AC 3.3: ✅ (download cards scannable; paper-simulation document viewer appropriate)
- AC 3.4: ⚠️ (HTML template is credible and well-crafted; DOCX template diverges in fonts, colour, and layout)

**Acceptance Criteria verdict:** ⚠️ Partial — preview and file-review screens are largely polished; generated output has two competing visual identities that undermine market-facing brand credibility.

---

## Section B: Generated Materials Evaluation

### Typography

**⚠️ Partial**

The primary CV template (`cv-template.html`) correctly uses:
- Inter (sans-serif, weights 300/400/600/700) for body and labels
- Merriweather (serif, italic variants) available for body text variation
- `rem`-based scale anchored to user-settable `base_font_size` (default 13px in the layout panel)
- `line-height: 1.6` on body
- Sidebar titles at `0.85rem / letter-spacing: 1px / font-weight: 700 / text-transform: uppercase`

This is a well-constructed type system for a professional document.

The legacy `cv-style.css` uses `11pt / Segoe UI, Arial / line-height: 1.4` — functional but lower quality, and produces a visually different document.

### Colour and Visual Identity

**⚠️ Partial**

The HTML CV template has a clean dark-blue scheme: `--primary-color: #2c3e50`, `--accent-color: #2980b9`, `--sidebar-bg: #eef2f5`. The sidebar-on-left layout with subtle background and accent border is professional and non-distracting.

The legacy `cv-style.css` uses `#2c5aa0` (a distinct blue) — a different brand colour in the DOCX output.

### Layout

**✅ Pass**

The HTML template's two-column flex-row layout (32/68 split) is a recognised professional resume format. Sidebar contains contact, skills, education; main column contains experience and achievements. `page-break-inside: avoid` prevents awkward mid-entry cuts. `max-width: 215.9mm` (US Letter) and `--page-margin` are correctly specified for PDF.

### Preview Fidelity

**⚠️ Partial**

The layout preview iframe serves an HTML render from the server. At 1280px screen width, the iframe occupies approximately 960px (sharing space with the 320px input pane) — narrower than the 215.9mm (848px) natural document width. The preview is close to accurate at this resolution but is not guaranteed to be 1:1 at all viewport sizes.

No zoom/scale control is exposed to compensate.

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer

**❌ Fail**

216 inline `style=""` attributes in `index.html` and ~50 distinct hex colour literals in `styles.css` with no `:root {}` variable declarations. This means colour changes require global search-and-replace, theming is not possible, and drift between components is structurally inevitable.

**Evidence:** `styles.css` contains no `:root` block. `index.html` lines 101–105 show position-bar action buttons styled entirely inline.

### Issue D2 — Proliferation of Button Classes

**❌ Fail**

Six distinct classes for blue primary action buttons: `.action-btn.primary`, `.btn-primary`, `.submit-btn`, `.editor-btn`, `.layout-action-btn`, `.modal-btn`. These share the same visual intent but are maintained independently. A spacing or colour change to the primary button requires touching six rules.

**Evidence:** `styles.css` lines 587, 1296, 1211, 858, 1429, 943.

### Issue D3 — Heavy Emoji Use in Navigation

**⚠️ Partial**

13 emoji characters appear in the workflow step bar and ~22 in the tab bar. Emoji rendering is platform-dependent (Apple Color Emoji vs Noto Color Emoji vs Twemoji) and produces visual inconsistency across operating systems. Emoji cannot be recoloured or scaled independently, preventing future brand customisation.

**Evidence:** Workflow steps: 📥🔍⚙️✏️🔤🎨⬇️📩📋🎤🙏🌾 (`index.html` lines 119–142). Tabs: full set lines 200–225.

### Issue D4 — Tab and Step Focus Indicators Missing

**⚠️ Partial**

`.tab` and `.step` elements have no `:focus-visible` rule. They respond to `onclick` but lack keyboard-focus visual affordance. Only `.sm-th` (session table headers) has `focus-visible` styling (`styles.css` line 261). `.message-input` suppresses `outline` in the base rule (`line 577`) before the `:focus` rule adds a replacement — a fragile ordering dependency.

### Issue D5 — Divergent Generated Output Templates

**❌ Fail**

Two CV output templates exist:
1. `templates/cv-template.html` — Inter font, flex two-column, dark-slate colour scheme, CSS custom properties, `rem` scale
2. `templates/cv-style.css` — Segoe UI/Arial, grid two-column, `#2c5aa0` blue, `pt` sizes, no CSS variables

These produce documents with materially different visual identities. A user reviewing the HTML preview cannot trust that the downloaded DOCX will look the same. The template-to-format mapping is not surfaced in the UI.

---

## Summary Table

| Story | Criterion | Status | Key Evidence |
|-------|-----------|--------|--------------|
| US-G1 | 1.1 Heading hierarchy distinct | ⚠️ | No CSS token scale; inline-style position-bar buttons |
| US-G1 | 1.2 Primary actions prominent | ⚠️ | Six button classes; multi-primary-button strip |
| US-G1 | 1.3 Dense surfaces readable | ✅ | Rewrite cards, analysis sections well-structured |
| US-G1 | 1.4 Colour supports usability and attractiveness | ⚠️ | Semantically correct; no token layer; utilitarian ceiling |
| US-G2 | 2.1 Repeated controls consistent | ⚠️ | Button and tab class proliferation |
| US-G2 | 2.2 Status surfaces coherent | ✅ | Blue/green/amber/red state colours applied consistently |
| US-G2 | 2.3 Tabs, workflow bar, modals cohesive | ⚠️ | 216 inline styles in index.html; JS-built dialogs outside system |
| US-G2 | 2.4 Standard interaction patterns | ✅ | Focus trap, modal overlay, sticky bars all standard |
| US-G3 | 3.1 Layout preview frames clearly | ✅ | iframe in labelled pane with freshness signaling |
| US-G3 | 3.2 Controls don't compete with preview | ⚠️ | Dense inline controls row; grouping ambiguous |
| US-G3 | 3.3 Final file-review surfaces clean | ✅ | Download cards scannable; paper-sim document viewer |
| US-G3 | 3.4 Generated materials professionally credible | ⚠️ | Two template systems produce divergent visual identities |

---

## Top Defects (Priority Order)

| ID | Priority | Issue |
|----|----------|-------|
| D5 | HIGH | Two CV output templates produce inconsistent brand identity in generated documents |
| D1 | HIGH | No CSS custom properties — ~50 hard-coded colour literals; 216 inline styles; no theming possible |
| D2 | MEDIUM | Six parallel button classes for same primary action role |
| D3 | MEDIUM | 35+ emoji in navigation elements — platform-inconsistent rendering; cannot be themed |
| D4 | MEDIUM | `.tab` and `.step` elements lack `:focus-visible` styling |
