<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review — CV Builder Application

Reviewer persona: Graphical Designer
Scope: Application UI visual quality + Generated materials visual quality
Cycle: 3
Date: 2026-06-18

Source files read:

- `web/index.html` (712 lines)
- `web/app.js`
- `web/ui-core.js`
- `web/state-manager.js`
- `web/styles.css` (1602 lines)
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`
- `templates/cv-template.html`
- `templates/cv-style.css`

Legend: ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## GAP-Specific Verifications (Cycle 3)

### GAP-132 — Divergent CV Templates

Verified: CONFIRMED OPEN — two templates retain materially different visual identities.

`templates/cv-template.html`:

- Font: `'Inter', sans-serif` (body); `'Merriweather', serif` (name heading) — loaded from Google Fonts
- Brand colour: `--primary-color: #2c3e50`; accent `--accent-color: #2980b9`
- Layout: CSS Flexbox two-column, `32%` left sidebar / `68%` right main
- Size units: `rem`-based scale anchored to user-settable `html { font-size: <base_font_size> }`
- CSS design tokens: `:root {}` block with `--primary-color`, `--secondary-color`, `--accent-color`, `--bg-color`, `--sidebar-bg`, `--text-main`, `--text-muted`, `--border-color`, `--page-margin`

`templates/cv-style.css`:

- Font: `"Segoe UI", Arial, sans-serif` — no webfont; degrades to Arial on macOS/Linux
- Brand colour: `#2c5aa0` (a different, more saturated blue)
- Layout: CSS Grid two-column, `2.8fr 1.2fr` (opposite column sizing — wide main / narrow sidebar)
- Size units: `pt` units throughout (e.g., `11pt`, `24pt`, `14pt`)
- CSS design tokens: none (no `:root {}`)

Conclusion: The two templates differ on all four axes — font family, colour value, layout mechanism/proportions, and size units. A user reviewing the HTML-rendered preview and then downloading the DOCX-backed output receives a document with different typography, different blue brand colour, and reversed column proportion. This is the structural root of Issue D5 below.

---

### GAP-133 — No CSS Design Token Layer

Verified: CONFIRMED OPEN — no `:root {}` block in `web/styles.css`.

`grep -n ":root" web/styles.css` returns no matches. The 1602-line stylesheet contains approximately 50 distinct hex colour literals (e.g., `#3b82f6`, `#64748b`, `#1e293b`, `#e2e8f0`, `#f8fafc`, `#dc2626`, `#10b981`, `#f59e0b`, `#92400e`, `#b91c1c`, `#166534`, `#1d4ed8`, `#0f172a`, `#475569`, `#334155`, `#94a3b8`, `#cbd5e1`, `#bfdbfe`, `#dbeafe`…) all as bare literals with no variable indirection. Theming, brand colour updates, or white-labelling would require a full-file search-and-replace across every literal.

---

## Section A: Application Evaluation

---

### US-G1: Visual Hierarchy and Readability

---

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

⚠️ Partial

The stylesheet provides a reasonable typographic hierarchy in the document viewer: `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body `p` 14px/1.6 (`styles.css` lines 685–690). Header app title is 20px/600 (line 21); conversation panel titles 18px/600 (line 375).

Three persistent weaknesses:

1. **No shared typographic scale.** No `:root {}` variables. Font sizes at the helper-text level — `11px`, `12px`, `13px`, `14px`, `15px` — appear independently across components with no shared token, producing arbitrary size drift between panels.

2. **Position-bar action buttons use inline styles.** The "Master CV", "ATS Report", and "Job Analysis" buttons (`index.html` lines 101–105) carry raw `style="background:#f1f5f9;border:1px solid #e2e8f0;…font-size:0.8em;padding:2px 7px"` attributes — making them appear tertiary despite representing important workflow entry points.

3. **Helper text sizing is not systematic.** The settings modal injects helper text via JS string interpolation in `ui-core.js` with hardcoded inline style assignments, producing readable but non-systematic helper levels.

---

#### AC 1.2 — Primary actions are consistently prominent

⚠️ Partial

The primary class chain (`.action-btn.primary`, `styles.css` lines 587–588) consistently delivers `background: #3b82f6; color: #fff` at `font-size: 14px`. Send button matches. Hover darkens to `#2563eb`.

Inconsistencies:

- `btn-primary` (line 1296) duplicates `action-btn.primary` with identical colours but `padding: 10px 20px` — two independent classes for one semantic role.
- `editor-btn` (line 858), `submit-btn` (line 1211), `continue-btn` (line 1215), `layout-action-btn` (line 1429), `modal-btn` (line 943) all restate blue primary button geometry independently.
- The interaction-area action strip can expose multiple blue primary buttons simultaneously (Analyze, Recommend, Generate). No secondary-emphasis tier distinguishes the active-step CTA from upcoming-step CTAs.

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

✅ Pass

The rewrite review panel is the densest surface. `.rewrite-card` (border-radius 10px, 1px border, `#f8fafc` background) with `.accepted` (green `#10b981` border) and `.rejected` (red `#f87171` border at 0.7 opacity) states (`styles.css` lines 1232–1234) provide strong visual separation. `del.diff-removed` (red on `#fee2e2`) and `ins.diff-added` (green on `#dcfce7`) at lines 1241–1242 reinforce change comprehension. The sticky tally bar (line 1226) anchors context throughout scroll.

The analysis page uses role card on gradient `#eff6ff → #dbeafe`, skill badges on `#dbeafe`, missing-skill badges on `#fee2e2` (lines 469–486). Section containers use `border: 1px solid #e2e8f0` with white backgrounds — clean visual grouping that prevents flatness.

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

⚠️ Partial

The palette is a blue-anchored neutral system (Tailwind Slate + Blue). Header dark `#1e293b`, primary blue `#3b82f6`, complete green `#166534`/`#dcfce7`, warning amber `#92400e`/`#fffbeb`, error red `#dc2626`/`#fee2e2` — all applied consistently as semantic state signals across workflow steps (`styles.css` lines 150–156) and status badges.

Two concerns:

- Approximately 50 unique hex literals across 1602 lines with no token layer. Colours are individually sound but structurally fragile.
- The visual ceiling is utilitarian. The header is a flat dark bar. The master-profile card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1457) is the sole decorative gradient in the app UI — an isolated moment rather than part of a systematic visual language.

---

Summary — US-G1:

- AC 1.1: ⚠️ (no token scale; inconsistent helper-text sizing; inline-style position-bar buttons)
- AC 1.2: ⚠️ (six button classes for same role; no CTA hierarchy in action strip)
- AC 1.3: ✅ (rewrite cards and analysis panels are readable and well-separated)
- AC 1.4: ⚠️ (palette semantically correct but not tokenised; visual ceiling is utilitarian)

Acceptance Criteria verdict: ⚠️ Partial — users can identify primary actions and current context with moderate effort; hierarchy holds on sparse screens but degrades on multi-button surfaces.

---

### US-G2: Cross-Stage Visual Consistency

---

#### AC 2.1 — Repeated control types share consistent styling

⚠️ Partial

Buttons sharing the same semantic role have divergent class names with independent geometry:

- Primary actions: `.action-btn.primary`, `.btn-primary`, `.submit-btn`, `.editor-btn`, `.layout-action-btn`, `.modal-btn`
- Secondary/ghost: `.action-btn`, `.btn-secondary`, `.back-btn`, `.rw-btn`

Border-radius ranges from 4px to 8px to 20px across controls with similar affordance roles.

The tab underline pattern is tripled: `.tab` (main tab bar, lines 624–636), `.review-subtab` (lines 662–676), and `.input-tab` (lines 1289–1291) — the same active-underline pattern implemented as three independent classes with marginally different padding values.

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

✅ Pass

The semantic state → colour mapping is consistent:

- Active / in-progress: blue (`#dbeafe` / `#1d4ed8`)
- Completed / success: green (`#dcfce7` / `#166534`)
- Stale / warning: amber (`#fffbeb` / `#92400e`)
- Critical / error: red (`#fef2f2` / `#b91c1c`)

This mapping appears faithfully in workflow steps (lines 150–156), freshness chips (lines 119–121), layout status cards (lines 1420–1422), confidence badges (lines 700–722), and rewrite cards (lines 1232–1234).

One maintenance note: `.step-stale-badge` is defined twice at lines 180 and 1417 with different values. Not a visible inconsistency at present but a drift risk.

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

⚠️ Partial

The workflow bar pills, tab bar, and modal containers share the same border/colour vocabulary. However, 216 inline `style=""` attributes exist in `index.html` (verified by `grep -c 'style="' web/index.html`). Modal body content, settings fields, onboarding steps, and the LLM wizard all use inline styles extensively — modals look functional but sit visually outside the classified component system in `styles.css`.

The confirm-dialog box (built via JS string injection in `ui-core.js`) uses hardcoded inline styles and cannot be themed.

---

#### AC 2.4 — Familiar, standard interaction patterns

✅ Pass

Standard patterns throughout:

- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267, 381)
- Tab-based navigation with active underline
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, 8px stack gap, line 1219)
- Focus trap + focus restoration in modals (`ui-core.js` lines 260–347)

No novel interaction patterns introduced without clear reason.

---

Summary — US-G2:

- AC 2.1: ⚠️ (button and tab class proliferation; padding drift)
- AC 2.2: ✅ (state/colour mapping is coherent and consistently applied)
- AC 2.3: ⚠️ (216 inline styles in index.html; JS-built dialogs outside design system)
- AC 2.4: ✅ (all patterns are standard and correctly applied)

Acceptance Criteria verdict: ⚠️ Partial — coherent state colour language; component classes are fractured; inline styles prevent full design-system coherence.

---

### US-G3: Preview and Output Presentation Quality

---

#### AC 3.1 — Layout-preview area frames content clearly

✅ Pass

The layout review panel uses a two-pane flex structure (`layout-instruction-panel`, line 1365): flex-1 preview pane on the left, fixed 320px input pane on the right. The preview pane wraps an iframe inside `preview-iframe-container` (`border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc`). A spinner loading overlay appears during render (lines 1370–1373). The stale callout (`layout-stale-callout`, lines 1393–1396) with amber left-border signals when the preview may not represent current content. Responsive breakpoints collapse to vertical stacking at ≤1100px (lines 1448–1454).

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

⚠️ Partial

The 320px input pane is spatially separated from the iframe. However the layout-settings row packs six inputs inline (base font size, page margin, checkbox, skill-experience select, Apply button, status label) with `flex-wrap: wrap; gap: 10px`. Labels at `font-size: 0.85em; font-weight: 600` are compact but the visual grouping does not clearly communicate that all six controls govern global layout — distinguishing them from the instruction textarea below requires user reading rather than visual inference.

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

✅ Pass

The download section (`styles.css` lines 1273–1284) uses `.download-grid` with flex column layout. Each `.download-item` is a `#f8fafc` card row with file icon, `font-weight: 600` file name, `color: #64748b` description, and a green `.btn-download` CTA. The icon/info/action structure is scannable. The document viewer uses `max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)` (line 682) — a familiar paper-on-desk simulation.

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

⚠️ Partial

`templates/cv-template.html` has genuine strengths: CSS custom properties for colours, `rem`-based font scale, Inter + Merriweather dual stack, 32/68 two-column flex layout, `page-break-inside: avoid`, JSON-LD ATS structured data, and tracked uppercase sidebar titles.

`templates/cv-style.css` presents a materially different visual identity (see GAP-132 above): different font family (Segoe UI / Arial vs Inter / Merriweather), different brand blue (`#2c5aa0` vs `#2980b9`), different column proportion (`2.8fr/1.2fr` grid vs `32%/68%` flex), and `pt` units vs `rem`. This undermines brand credibility: the user's preview does not represent the downloadable DOCX.

---

Summary — US-G3:

- AC 3.1: ✅ (iframe pane clearly framed with labelling, freshness signalling, loading state)
- AC 3.2: ⚠️ (dense inline controls row; grouping ambiguous)
- AC 3.3: ✅ (download cards scannable; paper-simulation document viewer appropriate)
- AC 3.4: ⚠️ (HTML template credible; DOCX template diverges in fonts, colour, layout)

Acceptance Criteria verdict: ⚠️ Partial — preview and file-review screens are largely polished; generated output has two competing visual identities that undermine market-facing brand credibility.

---

## Section B: Generated Materials Evaluation

### Typography

⚠️ Partial

The primary CV template (`cv-template.html`) correctly uses:

- Inter (weights 300/400/600/700) for body and labels
- Merriweather (serif) available for name heading
- `rem`-based scale anchored to user-settable `base_font_size`
- `line-height: 1.6` on body
- Sidebar titles at `0.85rem / letter-spacing: 1px / font-weight: 700 / text-transform: uppercase`

This is a well-constructed type system for a professional document.

The secondary `cv-style.css` uses `11pt / Segoe UI, Arial / line-height: 1.4` — functional but lower quality and visually distinct from the primary template.

### Colour and Visual Identity

⚠️ Partial

The HTML CV template has a clean dark-blue scheme: `--primary-color: #2c3e50`, `--accent-color: #2980b9`, `--sidebar-bg: #eef2f5`. The sidebar-left layout with subtle background and accent border is professional and non-distracting.

The secondary `cv-style.css` uses `#2c5aa0` — a distinct, more saturated blue. The two templates produce documents with different brand colours.

### Layout

✅ Pass

The HTML template's two-column flex-row (32/68 split) is a recognised professional resume format. Sidebar carries contact, skills, education; main column carries experience and achievements. `page-break-inside: avoid` prevents awkward mid-entry cuts. `max-width: 215.9mm` and `--page-margin` are correctly specified for US Letter PDF output.

### Preview Fidelity

⚠️ Partial

The layout preview iframe serves an HTML render from the server. At 1280px viewport width, the iframe occupies approximately 960px (sharing space with the 320px input pane). The document natural width is 215.9mm (~848px CSS pixels at 96dpi). The preview is close to accurate but is not guaranteed to be 1:1 at all viewport sizes, and no zoom/scale control is exposed to compensate.

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer (GAP-133)

❌ Fail

Confirmed: `web/styles.css` contains no `:root {}` block. Approximately 50 distinct hex colour literals are hardcoded across 1602 lines. 216 inline `style=""` attributes in `index.html` add further hardcoded values outside the stylesheet entirely. Colour changes require global search-and-replace; theming is structurally impossible; colour drift between components is inevitable.

### Issue D2 — Proliferation of Button Classes

❌ Fail

Six distinct classes for blue primary action buttons: `.action-btn.primary` (line 587), `.btn-primary` (line 1296), `.submit-btn` (line 1211), `.editor-btn` (line 858), `.layout-action-btn` (line 1429), `.modal-btn` (line 943). Each independently specifies colour, padding, border-radius, and font-size. A spacing or colour change to the primary button requires touching six separate rules.

### Issue D3 — Heavy Emoji Use in Navigation

⚠️ Partial

13 emoji characters appear in the workflow step bar and additional emoji in the tab bar and action buttons (`index.html` lines 119–142). Emoji rendering is platform-dependent (Apple Color Emoji vs Noto Color Emoji vs Twemoji) and produces visual inconsistency across operating systems. Emoji cannot be recoloured or scaled independently, preventing future brand customisation.

### Issue D4 — Missing Focus Indicators on Interactive Navigation Elements

⚠️ Partial

`.tab` and `.step` elements have no `:focus-visible` rule. They respond to `onclick` but lack keyboard-focus visual affordance. Only `.sm-th` (session table headers, line 261) and form inputs have explicit `focus-visible` styling. `.message-input` suppresses `outline` in the base rule (line 577) before the `:focus` rule restores it — a fragile ordering dependency.

### Issue D5 — Divergent Generated Output Templates (GAP-132)

❌ Fail

Two CV output templates produce documents with materially different visual identities:

| Dimension | cv-template.html | cv-style.css |
| --- | --- | --- |
| Font family | Inter + Merriweather (Google Fonts) | Segoe UI, Arial (system font) |
| Brand blue | #2980b9 | #2c5aa0 |
| Layout mechanism | CSS Flexbox | CSS Grid |
| Column split | 32% sidebar / 68% main | 2.8fr main / 1.2fr sidebar (reversed) |
| Size units | rem (user-scalable) | pt (fixed) |
| CSS variables | :root with 8 custom properties | None |

A user reviewing the HTML-rendered layout preview cannot trust that the downloaded DOCX will look the same. The template-to-format mapping is not surfaced in the UI.

---

## Summary Table

| Story | Criterion | Status | Key Evidence |
|-------|-----------|--------|--------------|
| US-G1 | 1.1 Heading hierarchy distinct | ⚠️ | No CSS token scale; inline-style position-bar buttons; cross-component size drift |
| US-G1 | 1.2 Primary actions prominent | ⚠️ | Six button classes for same role; multi-primary-button strip |
| US-G1 | 1.3 Dense surfaces readable | ✅ | Rewrite cards, analysis sections well-structured with clear visual grouping |
| US-G1 | 1.4 Colour supports usability and attractiveness | ⚠️ | Semantically correct palette; no token layer; utilitarian visual ceiling |
| US-G2 | 2.1 Repeated controls consistent | ⚠️ | Button and tab class proliferation; padding drift across similar-role controls |
| US-G2 | 2.2 Status surfaces coherent | ✅ | Blue/green/amber/red semantic state colours applied consistently across all stages |
| US-G2 | 2.3 Tabs, workflow bar, modals cohesive | ⚠️ | 216 inline styles in index.html; JS-built confirm dialog outside design system |
| US-G2 | 2.4 Standard interaction patterns | ✅ | Focus trap, modal overlay, sticky tally bar, toast notifications all standard |
| US-G3 | 3.1 Layout preview frames clearly | ✅ | iframe in labelled pane with freshness signalling and loading overlay |
| US-G3 | 3.2 Controls don't compete with preview | ⚠️ | Dense inline layout-settings row; control grouping visually ambiguous |
| US-G3 | 3.3 Final file-review surfaces clean | ✅ | Download cards scannable; paper-sim document viewer appropriate |
| US-G3 | 3.4 Generated materials professionally credible | ⚠️ | Two template systems produce divergent visual identities (GAP-132) |

---

## Top Defects (Priority Order)

| ID | Priority | Issue | GAP |
|----|----------|-------|-----|
| D5 | HIGH | Two CV output templates produce inconsistent brand identity — font family, brand blue, layout mechanism, column proportions all differ | GAP-132 |
| D1 | HIGH | No CSS custom properties in web/styles.css — ~50 hardcoded colour literals; 216 inline styles in index.html; theming not possible | GAP-133 |
| D2 | MEDIUM | Six parallel button classes for same primary action role — independently maintained geometry | — |
| D3 | MEDIUM | 13+ emoji in workflow navigation — platform-inconsistent rendering; cannot be themed | — |
| D4 | MEDIUM | .tab and .step elements lack :focus-visible styling — keyboard-focus affordance missing | — |

---

## Change Summary vs Cycle 2

No changes observed in `web/styles.css`, `web/index.html`, `templates/cv-template.html`, or `templates/cv-style.css` that would alter any prior finding. GAP-132 and GAP-133 remain open and confirmed. All criterion verdicts are unchanged from Cycle 2.
