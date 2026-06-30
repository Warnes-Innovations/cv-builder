<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-06-30 10:45 ET

**Executive Summary:** The application delivers a coherent, professionally-styled visual system for its primary workflow stages. Typography is well-differentiated, a consistent Slate-based color system runs throughout, and controls share uniform visual treatment. The main weaknesses from a graphical-design perspective are: (1) inline-style proliferation across modals that bypasses the CSS design system and will drift over time; (2) an emoji-heavy icon language that is jarring in a professional-facing tool; (3) the generated CV output uses a functional but typographically modest sans-serif stack (Segoe UI / Arial) with a two-column layout that may not project the document-design credibility expected of a "market-facing" premium product; and (4) the preview/layout-review surface frames the iframe well but the sidebar controls compete visually with the preview area at narrow viewport widths.

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

**US-G1.1 — Headings, body text, helper text, and controls are visually distinct**
✅ Pass

The CSS defines a clear four-level scale: `document-content h1` at 28px / 700 weight (`styles.css:691`), `h2` at 20px / 600 (`styles.css:692`), `h3` at 16px / 600 (`styles.css:693`), and body at the inherited 14–15px. Helper/meta text is consistently rendered in `#64748b` at 0.78–0.85em (`styles.css:82, 200, 231`). Form labels use 0.85–0.88em weight-600 (`styles.css:747, 1515`). The conversation panel separates roles via distinct background colors: user messages in `#3b82f6` blue, assistant messages in white with `#e2e8f0` border, system messages in `#f1f5f9` italic (`styles.css:386–388`).

**US-G1.2 — Primary actions are consistently prominent**
⚠️ Partial

The `.action-btn.primary` class is correctly blue (`#3b82f6`) with white text (`styles.css:589`). However, the position-bar action buttons (Master CV, ATS Report, Job Analysis) use inline-style `background:#f1f5f9;border:1px solid #e2e8f0` rather than the shared `.action-btn` class (`index.html:102–106`). These look appropriately secondary but are styled out-of-system. More notably, the workflow-step action buttons in the chat-area `actions` div show only one primary button at a time (correct), but the hidden-then-shown pattern (`style="display:none"`) means the action buttons change identity per stage without any visual transition cue, which can disorient users returning mid-workflow.

**US-G1.3 — Dense review surfaces remain readable**
✅ Pass

The rewrite-review panel uses a well-designed card system (`styles.css:1240–1280`): `rewrite-card` with 1px `#e2e8f0` border + 10px radius, color-coded state variations (`accepted` → green tint, `rejected` → red/dimmed), inline diff coloring (red for `del.diff-removed`, green for `ins.diff-added`), and a sticky tally bar. The experience/skill review tables use `review-table` with alternating row stripes and 8px 12px cell padding (`styles.css:1155–1165`). The customization tab uses grouped cards with `analysis-section` pattern (white card, subtle border, 16px–20px padding `styles.css:475`).

**US-G1.4 — Color and theme choices support usability and attractiveness**
⚠️ Partial

The palette is professional: `#1e293b` header dark, `#3b82f6` interactive blue, semantic greens/ambers/reds for state. The ATS score badge uses threshold-triggered colors (`score-high` → `#16a34a`, `score-medium` → `#d97706`, `score-low` → `#dc2626` at `styles.css:102–104`) which is well-executed. The overall aesthetic reads as a developer-grade admin panel (Tailwind-palette family) rather than a designed product. The dark header (`#1e293b`) contrasts well but the total brand impression is "utility tool" rather than "professional career product." This is a design-taste gap, not a usability failure.

---

### US-G2: Cross-Stage Visual Consistency

**US-G2.1 — Repeated control types share consistent styling**
⚠️ Partial

The shared `.action-btn`, `.action-btn.primary`, `.action-btn.secondary` system (`styles.css:587–594`) is correctly applied to most modal footers and the chat-area actions. However, several modals apply buttons via inline styles directly (e.g., Sessions modal "New Session" button uses `style="background:#10b981;color:#fff;border-color:#10b981"` at `index.html:260`; the "Trash" button uses inline styles at `index.html:263`; the Settings modal close button uses inline `style` at `index.html:582`). The `header-pill-btn` pattern for header controls is consistent across all four header buttons (`index.html:46–66`). The `icon-btn` 32x32 icon button pattern for rewrite-review actions is consistent (`styles.css:1170–1210`).

**US-G2.2 — Status surfaces use a coherent visual language**
✅ Pass

Status coloring follows the same amber/green/red semantic across all surfaces:

- Workflow steps: `.step.completed` → `#dcfce7` green, `.step.active` → `#dbeafe` blue, `.step.stale` → `#fffbeb` amber, `.step.stale-critical` → `#fef2f2` red (`styles.css:151–157`).
- Layout freshness chip: `.fresh` → `#ecfdf5` / `#86efac`, `.stale` → `#fffbeb` / `#fcd34d`, `.critical` → `#fef2f2` / `#fca5a5` (`styles.css:119–121`).
- ATS score badge: same green/amber/red thresholds (`styles.css:102–104`).
- Toast notifications: same border-left color coding (`styles.css:1229–1231`).
- Confidence badges (rewrite cards): high → `#dcfce7`, medium → `#fef3c7`, low → `#fee2e2` (`styles.css:717–728`).

The semantic color assignment is consistent and learnable.

**US-G2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system**
⚠️ Partial

Tabs, workflow steps, and modals share the same `#e2e8f0` border and `#f8fafc`/white background family. However, the modal system mixes two pattern families: some modals use `.modal-overlay` / `.modal` classes with 12px radius and 20px shadow (`styles.css:941–946`), while others apply extensive inline styles that override or supplement the class-level rules. The LLM Configuration Wizard is the most design-coherent modal — the 4-step progress bar, section panes, and footer are well-structured (`styles.css:952–1148`). The Sessions modal and Master CV modal both apply heavy inline sizing overrides (`index.html:250–281`), creating risk of drift. The Welcome/Onboarding modal uses inline numbered circles in blue/indigo/green — a different design vocabulary from the rest of the UI.

**US-G2.4 — Familiar, standard interaction patterns**
✅ Pass

Tab navigation follows the standard browser tab pattern with `border-bottom: 3px solid #3b82f6` on active (`styles.css:642`). Modal open/close follows standard overlay pattern with focus trap and Escape-key dismiss (`ui-core.js:294–347`). The workflow step bar uses pill/chip navigation familiar from wizard UIs. The rewrite card Accept/Reject/Edit button trio follows a clear red/green/blue convention. Keyboard navigation on tabs implements WCAG-2.1 `tablist` pattern with ArrowLeft/Right/Home/End (`ui-core.js:536–553`).

---

### US-G3: Preview and Output Presentation Quality

**US-G3.1 — Layout-preview area frames content clearly**
✅ Pass

The `layout-instruction-panel` uses a two-pane flex layout: `layout-preview-pane` (flex: 1, expands to fill) and `layout-input-pane` (fixed 320px, `styles.css:1376–1385`). The `preview-iframe-container` has `border: 1px solid #e2e8f0`, `border-radius: 8px`, `background: #f8fafc` and contains a `loading-overlay` with spinner and status text (`styles.css:1379–1384`). The preview pane height is `calc(100vh - 240px)` with `min-height: 500px`, giving the iframe room to breathe. The layout tab label ("Layout Review") and stage-specific button ("Confirm Layout") align with the preview focus. At 1100px and below the layout stacks vertically with `min-height: 60vh` for the preview pane (`styles.css:1466–1472`).

**US-G3.2 — Supporting controls do not visually compete with the preview**
⚠️ Partial

At full width (>1100px), the 320px sidebar (`layout-input-pane`) is modest and well-contained. The sidebar presents: a layout scope label in `#f0f9ff` light blue, a textarea with standard 1px border, output status cards in `#f8fafc`, and an instruction history section (`styles.css:1387–1455`). These are visually quiet. However, at viewports between 900px and 1100px the sidebar shifts below the preview, and at that breakpoint the combined page height can push the preview iframe into a compressed state where the document is unreadable. The freshness chip and status card above the iframe (`layout-preview-status-card`) add visual weight that is not differentiated from the iframe itself.

**US-G3.3 — Final file-review surfaces present outputs and actions cleanly**
✅ Pass (with caveat)

The download section uses `.download-item` cards: flex layout with 20px padding, a `download-icon` (emoji at 24px), `.download-name` in 600 weight, `.download-description` in `#64748b` at 14px, and a `.btn-download` green button (`styles.css:1283–1293`). The `preview-output-row` pattern in the layout pane uses consistent output cards with `is-ready`/`is-failed` badges (`styles.css:1396–1401`). The caveat: file icons are emoji rather than proper File-type icons from Font Awesome (which is loaded). Using emoji as icons in a professional document product is inconsistent with the tool's stated purpose.

**US-G3.4 — Generated materials reinforce a credible professional brand**
⚠️ Partial

The CV output template (`templates/cv-style.css`) establishes:

- Font: `"Segoe UI", Arial, sans-serif` at 11pt body (`cv-style.css:18`)
- Heading: Name at 24pt bold `#2c5aa0`, tagline at 14pt italic `#666`, sections at 14pt blue with `border-bottom` rule (`cv-style.css:40–83`)
- Layout: Two-column grid `2.8fr 1.2fr` with `0.75in` gap (`cv-style.css:67`)
- Color accent: `#2c5aa0` (medium blue) used for name, section headings, bullet points, and links

This is a clean, functional design. However from a graphical-designer perspective:

- The sans-serif body font (Segoe UI / Arial) is a utilitarian choice. For a "human PDF" marketed to hiring managers, a professional system with even a hint of character (e.g., a humanist sans like Source Sans Pro, or a professional hybrid) would project more credibility.
- `#2c5aa0` is a competent professional blue but not distinctive.
- The two-column grid may not be appropriate for all candidate profiles (academic CVs, all-text profiles). There is no visible mechanism for the user to choose single- vs. two-column layout from the UI (the layout instructions textarea is freeform NL, which is LLM-mediated).
- The right-column `h2` at 12pt vs. left-column `h2` at 14pt (`cv-style.css:78, 145`) creates an intentional hierarchy but may look unbalanced when section heading labels are long.
- Print optimization at 10pt body (`cv-style.css:208`) is correct but 10pt Segoe UI/Arial is dense for print; a humanist sans reads better at this size.
- The cover letter textarea correctly uses `font-family: 'Georgia', 'Times New Roman', serif` (`styles.css:1518`), which is more appropriate than the CV's sans-serif choice for formal correspondence.

---

## Generated Materials Evaluation

**Typography credibility**
⚠️ Partial — The choice of Segoe UI / Arial is reliable cross-platform but reads as office-suite default rather than intentional typographic design. The heading blue (`#2c5aa0`) is professional without being distinctive.

**Layout credibility**
⚠️ Partial — Two-column layout with 2.8fr/1.2fr split is a solid choice for most candidates. Section spacing (0.5–1rem between items) is appropriate. The `page-break-inside: avoid` on experience items is correct. However the header is center-aligned for the name while the body uses a left-biased grid, creating a mixed alignment aesthetic.

**ATS DOCX output**
— N/A — ATS DOCX is a format flag in settings. The template rendering pipeline passes through `conversation_manager.py` → `template_renderer.py` but the ATS DOCX template is not in scope for this review.

**Cover letter typography**
✅ Pass — The cover letter textarea uses `font-family: 'Georgia', 'Times New Roman', serif` at 0.95em / line-height 1.7 (`styles.css:1518`). Georgia at 1.7 line-height is highly readable and appropriate for formal correspondence.

---

## Additional Story Gaps / Proposed Story Items

**GAP-DESIGN-01: Icon language is emoji-dominant, not icon-system consistent**
The workflow bar, tabs, header buttons, and file-review cards all use Unicode emoji (various). Font Awesome 6 is loaded (`index.html:23`) but used only in session table action buttons. A professional career tool would benefit from replacing emoji with FA icons throughout: more consistent sizing, alignment, color inheritance, and professional register. Estimated scope: medium.

**GAP-DESIGN-02: Inline style proliferation in modals will drift**
At least 6 modals apply a mix of class-level and inline-style overrides for sizing, colors, and layout. This means the visual design of individual modals is not governed by the CSS design system and will diverge over time. Proposed fix: extract modal-size variants into named CSS classes (`.modal--wide`, `.modal--fullscreen`, `.modal--narrow`) and remove inline `max-width`, `width`, `max-height` from HTML.

**GAP-DESIGN-03: Generated CV font stack choice limits output credibility**
The human PDF uses `"Segoe UI", Arial, sans-serif` — a system default. Proposal: offer 2–3 font-stack presets in the Layout panel (e.g., "Modern Sans" / "Classic Serif" / "Compact") so users have meaningful typographic choice without relying on LLM freeform instructions.

**GAP-DESIGN-04: Header center alignment vs. body left alignment in CV output**
The `.cv-header` is `text-align: center` while the body grid is left-aligned. A deliberate design choice would left-align the header name as well, or use a centered layout throughout. The current mixed approach is inconsistent.

**GAP-DESIGN-05: Workflow step bar arrow dividers at mid-range viewports**
The workflow nav uses `overflow-x: auto` and `gap: 32px` which creates a scrollable bar at narrow widths. At mid-range (~900–1200px) the steps and arrow dividers (→) become dense and the arrows lose semantic meaning when steps scroll. A scrollable pill bar with hidden scroll indicators (the tab-scroll-btn pattern already used on the tab bar) would be more refined.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-style.css (additionally consulted — directly relevant to US-G3.4)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | ---------- | ------ | ----------- | ----- |
| US-G1.1 Typography distinctiveness | ✅ | | | | |
| US-G1.2 Primary action prominence | | ⚠️ | | | |
| US-G1.3 Dense review readability | ✅ | | | | |
| US-G1.4 Color/theme attractiveness | | ⚠️ | | | |
| US-G2.1 Control styling consistency | | ⚠️ | | | |
| US-G2.2 Status surface coherence | ✅ | | | | |
| US-G2.3 System-level cohesion | | ⚠️ | | | |
| US-G2.4 Standard interaction patterns | ✅ | | | | |
| US-G3.1 Layout preview framing | ✅ | | | | |
| US-G3.2 Controls vs preview competition | | ⚠️ | | | |
| US-G3.3 File-review surface quality | ✅ | | | | |
| US-G3.4 Generated materials credibility | | ⚠️ | | | |

**Summary counts:** 6 Pass / 6 Partial / 0 Fail / 0 Not Implemented / 0 N/A

**Key evidence references:**

| Finding | File | Line(s) |
| ------- | ---- | ------- |
| Typography scale definition | `web/styles.css` | 691–694 |
| `.action-btn` system | `web/styles.css` | 587–594 |
| Position-bar inline-style buttons | `web/index.html` | 102–106 |
| Status color semantic system | `web/styles.css` | 119–121, 151–157, 102–104, 1229–1231 |
| Modal class definitions | `web/styles.css` | 941–946 |
| Sessions modal inline overrides | `web/index.html` | 250–268 |
| Layout preview pane | `web/styles.css` | 1376–1385 |
| Download item cards | `web/styles.css` | 1283–1293 |
| Rewrite card visual system | `web/styles.css` | 1240–1280 |
| CV output font stack | `templates/cv-style.css` | 18–22 |
| CV header center alignment | `templates/cv-style.css` | 32–44 |
| CV two-column grid | `templates/cv-style.css` | 64–69 |
| CV heading color | `templates/cv-style.css` | 40–43, 78–79, 145–147 |
| Cover letter serif font | `web/styles.css` | 1518 |
| LLM Wizard progress bar | `web/styles.css` | 952–1148 |
| Emoji in workflow nav | `web/index.html` | 120–142 |
| Font Awesome loaded but underused | `web/index.html` | 23 |
| Focus trap implementation | `web/ui-core.js` | 294–347 |
| Reduced-motion accommodation | `web/styles.css` | 1621–1630 |
