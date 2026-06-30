<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-06-30
**Reviewed by:** Source-verified review cycle (Graphical Designer persona, US-G*)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, web/layout-instruction.js, web/download-tab.js, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-style.css

**Executive Summary:** The application delivers a coherent, professionally-styled visual system for its primary workflow stages. Typography is well-differentiated, a consistent Slate-based color palette runs throughout, and the semantic status language (green/amber/red) is applied consistently across all surfaces. The main weaknesses from a graphical-design perspective are: (1) pervasive inline-style drift in modals and JS-rendered HTML that bypasses the CSS design system; (2) an emoji-dominant icon language jarring in a professional-facing product (Font Awesome is loaded but used only in one place); (3) no print styles exist in the main `styles.css` app shell (only the CV output template has `@media print`); (4) the two-panel main layout (`interaction-area` 40% / `viewer-area` 60%) has no responsive breakpoint — it stays side-by-side at all viewport widths down to the 500px `min-height` floor; and (5) the generated CV human-PDF uses the system-default `"Segoe UI", Arial, sans-serif` stack, which reads as office-suite default rather than intentional typographic design.

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

**US-G1.1 — Headings, body text, helper text, and controls are visually distinct**
✅ Pass

The CSS defines a clear four-level heading scale within the document viewer: `h1` at 28px/700 weight (`styles.css:691`), `h2` at 20px/600 (`styles.css:692`), `h3` at 16px/600 (`styles.css:693`), and body `li`/`p` at 14–15px/1.6 line-height (`styles.css:694–696`). Helper and meta text is consistently rendered in `#64748b` (Slate-500) at 0.78–0.85em across multiple selectors (`styles.css:82, 200, 231, 487`). Form labels use 0.85–0.88em weight-600 (`styles.css:747, 1515`). The conversation panel separates roles via distinct background colors: user messages in `#3b82f6` blue with white text, assistant messages in white with `#e2e8f0` border, and system messages in `#f1f5f9` italic grey (`styles.css:386–388`). The conversation panel header `h2` "Conversation" at 18px/600 is distinct from the document viewer (`styles.css:376`).

**US-G1.2 — Primary actions are consistently prominent**
⚠️ Partial

The `.action-btn.primary` class is correctly blue (`#3b82f6`) with white text (`styles.css:589`). The chat-area workflow buttons all use `class="action-btn primary"` consistently (`index.html:186–194`). However, the three position-bar action buttons (Master CV, ATS Report, Job Analysis) use full inline style blocks (`background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;color:#475569;font-size:0.8em;padding:2px 7px;line-height:1.6`) rather than a shared CSS class (`index.html:102–106`). These are visually secondary (correct) but styling is governed by inline markup instead of the class system. Additionally, within modals the Sessions footer "New Session" button applies inline `style="background:#10b981;color:#fff;border-color:#10b981"` on top of `class="action-btn"` (`index.html:260`) instead of using a modifier class, further diluting the primary action signal.

**US-G1.3 — Dense review surfaces remain readable**
✅ Pass

The rewrite-review panel uses a well-designed card system (`styles.css:1240–1280`): `rewrite-card` with 1px `#e2e8f0` border, 10px radius, and color-coded state variants (`accepted` → `#f0fdf4` green-tint, `rejected` → `#fef2f2` red-tint at 0.7 opacity). The inline diff rendering uses `del.diff-removed` in `#dc2626` / `#fee2e2` and `ins.diff-added` in `#166534` / `#dcfce7` (`styles.css:1249–1250`). The sticky tally bar prevents losing context on long lists. The experience/skill review tables use `review-table` with alternating row stripes and 8px 12px cell padding (`styles.css:1155–1165`). The analysis page uses the `analysis-section` card pattern (white, 1px border, 16–20px padding, `styles.css:475`) with grouped headings. These surfaces maintain readability at density.

**US-G1.4 — Color and theme choices support usability and attractiveness**
⚠️ Partial

The palette is professional: `#1e293b` (Slate-900) header dark, `#3b82f6` (Blue-500) interactive blue, semantic greens/ambers/reds for state (`styles.css:102–104, 119–121`). The ATS badge uses threshold-triggered color (`score-high` → `#16a34a`, `score-medium` → `#d97706`, `score-low` → `#dc2626`), which is well-executed. However:

- There are no CSS custom properties (`var(--color-*)`) at all; zero hits for `:root {}` in `styles.css`. The 97-entry hex color palette is hardcoded throughout — no design-token layer means a theme change requires a global find-and-replace.
- The color family is the Tailwind/Slate palette, which reads as a developer-grade admin panel rather than a designed career product. The overall aesthetic is functional but not aspirational.
- The `@keyframes spin` keyframe is defined twice (`styles.css:901–904` and `styles.css:1445`), and a separate `@keyframes llm-spin` is also defined (`styles.css:558`), indicating CSS accumulation from multiple editors over time.

---

### US-G2: Cross-Stage Visual Consistency

**US-G2.1 — Repeated control types share consistent styling**
⚠️ Partial

The shared `.action-btn` / `.action-btn.primary` / `.action-btn.secondary` system (`styles.css:587–594`) covers most modal footers and the chat-area actions consistently. The `.header-pill-btn` pattern is uniform across all four header buttons (`index.html:46–66`, `styles.css:64–66`). The `icon-btn` 32×32 icon button for rewrite actions is consistent (`styles.css:1170–1210`).

However, there are six distinct close-button styling patterns across modals:

- `class="modal-close-btn"` (correct, used in Master CV modal and LLM Wizard: `index.html:275, 422`)
- Raw `style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;"` (used in Sessions, Settings, ATS Report, Job Analysis modals: `index.html:253, 582, 693, 709`)

This means four of six close buttons are un-classed. Additionally, the layout-instruction sidebar mixes named classes (`btn-primary`, `btn-secondary`, `continue-btn`) with inline overrides for sub-components (`layout-instruction.js:321–356`), and the download tab uses almost entirely inline styles for its dynamic HTML output (`download-tab.js:81–140`).

**US-G2.2 — Status surfaces use a coherent visual language**
✅ Pass

The amber/green/red semantic is applied consistently across all status surfaces:

- Workflow steps: `.step.completed` → `#dcfce7` green, `.step.active` → `#dbeafe` blue, `.step.stale` → `#fffbeb` amber, `.step.stale-critical` → `#fef2f2` red (`styles.css:151–157`)
- Layout freshness chip: `.fresh` → `#ecfdf5` / `#86efac`, `.stale` → `#fffbeb` / `#fcd34d`, `.critical` → `#fef2f2` / `#fca5a5` (`styles.css:119–121`)
- ATS score badge: same green/amber/red thresholds (`styles.css:102–104`)
- Toast notifications: `toast-success` → `#10b981`, `toast-error` → `#ef4444`, `toast-warning` → `#f59e0b` (`styles.css:1229–1231`)
- Confidence badges (rewrite cards): `confidence-high` → `#dcfce7`, `confidence-medium` → `#fef3c7`, `confidence-low` → `#fee2e2` (`styles.css:717–728`)

The semantic assignment is consistent and learnable across all stages.

**US-G2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system**
⚠️ Partial

Tabs, workflow steps, and modals share the `#e2e8f0` border and `#f8fafc`/white background family. The tab indicator pattern (3px bottom border in `#3b82f6` on active, `styles.css:642`) matches the review-subtab pattern (`styles.css:680–682`). The modal base class provides 12px border-radius, `0 20px 25px -5px` shadow, and white background (`styles.css:942`).

However, modals mix two pattern families: some use the `.modal-overlay` / `.modal` class system cleanly (Alert, Confirm, Ownership Conflict, Onboarding modals), while others apply heavy inline size overrides:

- Sessions modal: `style="max-width: 980px; width: 95%;"` and modal-body `style="padding:0; max-height:68vh;"` (`index.html:250–255`)
- Master CV modal: `style="max-width: 1280px; width: 98%; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; position: relative; top: auto; left: auto; transform: none; margin: auto;"` — overrides the fixed `top: 50%; transform: translate(-50%, -50%)` from the class (`index.html:272`)
- LLM Wizard: `style="max-width: 1020px; width: 95%;"` (`index.html:419`)
- Settings modal: `style="max-width: 760px; width: 94%;"` (`index.html:579`)

The absence of named modal-size variants (`.modal--wide`, `.modal--narrow`) forces per-instance inline overrides and risks visual drift over time.

**US-G2.4 — Familiar, standard interaction patterns**
✅ Pass

Tab navigation follows the standard tablist pattern with `role="tab"`, `aria-selected`, and keyboard navigation implemented in `ui-core.js` (`ui-core.js:536–553`). The active tab uses `border-bottom: 3px solid #3b82f6` (`styles.css:642`). Modal open/close follows standard overlay pattern with focus trap (`trapFocus` at `ui-core.js:294–330`) and focus restoration (`restoreFocus` at `ui-core.js:336–347`). Escape-key dismiss is wired via `onclick="if(event.target===this)..."` on overlay elements. The rewrite card Accept/Reject/Edit button trio follows a clear green/red/blue convention. The LLM Configuration Wizard uses a 4-step progress bar (badges 1–4 with connector lines) that is visually clear (`styles.css:956–1032`). The reduced-motion media query at `styles.css:1621–1630` accommodates accessibility needs.

---

### US-G3: Preview and Output Presentation Quality

**US-G3.1 — Layout-preview area frames content clearly**
✅ Pass

The `layout-instruction-panel` uses a two-pane flex layout: `layout-preview-pane` (flex: 1 1 auto, fills available width, `styles.css:1377`) and `layout-input-pane` (fixed 320px sidebar, `styles.css:1385`). The `preview-iframe-container` has `border: 1px solid #e2e8f0`, `border-radius: 8px`, `background: #f8fafc`, and `overflow: auto` (`styles.css:1379`). It contains a loading overlay with spinner and status label (`styles.css:1381–1384`). The panel height is `calc(100vh - 240px)` with `min-height: 500px`, giving the iframe meaningful vertical space. At 1100px and below the layout stacks to vertical with `min-height: 60vh` for the preview pane (`styles.css:1466–1472`). The preview iframe uses `sandbox="allow-same-origin"` and `title="CV Layout Preview"` (`layout-instruction.js:296`).

**US-G3.2 — Supporting controls do not visually compete with the preview**
⚠️ Partial

At full width (>1100px), the 320px sidebar is compact. The sidebar presents a scope label in `#f0f9ff` light-blue, a textarea with standard 1px border, output status cards in `#f8fafc`, and an instruction history section — visually quiet. However:

- The layout-settings row (`layout-instruction.js:321–356`) is entirely inline-styled and dense: it crams font-size input, page-margin input, publications-page-break checkbox, skill-experience-level select, and an Apply button into a single row. On a 320px sidebar this row will wrap unpredictably and compete visually with the preview.
- The `layout-preview-status` card (freshness state) and the `preview-output-card` (PDF links) sit above the textarea and occupy meaningful vertical space. At 1100–900px viewports, after the stack-to-column breakpoint fires, the combined sidebar content (scope label + freshness status + PDF cards + settings row + textarea + buttons + history) creates a long scroll that pushes the main preview iframe off-screen.
- The freshness-status card uses class-governed styling (`layout-preview-status-card.fresh/stale/critical`, `styles.css:1431–1433`) which is consistent, but the settings row uses `display:flex` inline on the container div (`layout-instruction.js:321`).

**US-G3.3 — Final file-review surfaces present outputs and actions cleanly**
✅ Pass (with caveat)

The download section uses `.download-item` cards: flex layout with 20px padding, download-icon (emoji at 24px), `.download-name` in 600 weight, `.download-description` in `#64748b` at 14px, and a `.btn-download` green button (`styles.css:1285–1293`). The ATS validation report uses `review-table` with pass/warn/fail row coloring and a wrapping `<details>` element for progressive disclosure. The `preview-output-row` pattern in the layout pane uses `is-ready`/`is-failed` badge classes (`styles.css:1396–1401`).

The caveat: the download tab's entire dynamic HTML content is constructed via `innerHTML` with hardcoded inline styles in `download-tab.js` (44 inline-style occurrences in that file alone). This includes status colors, font sizes, backgrounds, and borders that are semantically identical to existing CSS classes but are not using them. This is the most concentrated example of style drift in the codebase.

**US-G3.4 — Generated materials reinforce a credible professional brand**
⚠️ Partial

Verified against `templates/cv-style.css`:

**What works:**

- CV body font: `"Segoe UI", Arial, sans-serif` at 11pt (`cv-style.css:18–19`) — reliable cross-platform
- Print media query reduces body to 10pt and header h1 to 22pt (`cv-style.css:206–224`) — correct print optimization
- `page-break-inside: avoid` on experience/education/skills/award items (`cv-style.css:226–232`) — prevents page-break mid-item
- `page-break-after: avoid` on headings (`cv-style.css:235–237`) — keeps headings with their content
- Left-column `h2` at 14pt with `border-bottom: 1px solid #ddd` (`cv-style.css:78–84`) creates clean section breaks
- Right-column `h2` at 12pt (`cv-style.css:145`) correctly subordinates sidebar content

**What is weak:**

- Font stack `"Segoe UI", Arial, sans-serif` is a Windows system default. For a human-readable PDF positioned as a premium output, a web-served humanist sans (Source Sans Pro, IBM Plex Sans, or similar) would project more intentionality.
- `#2c5aa0` (medium blue) is professional but generic. The same blue is used for name h1, section headings, bullet points, and links — monotonous accent application.
- The `.cv-header` is `text-align: center` (`cv-style.css:36`) while the body uses a left-biased two-column grid (`grid-template-columns: 2.8fr 1.2fr`, `cv-style.css:67`). This center/left mixed alignment is a compositional inconsistency.
- There is no single-column layout option for academic/text-heavy CVs.
- The cover letter textarea in the UI uses `'Georgia', 'Times New Roman', serif` (`styles.css:1518`), which is more character-appropriate for formal correspondence than the CV's sans-serif — this is a correct differentiation.

---

## Additional Design Gaps

**GAP-DESIGN-01: Icon language is emoji-dominant; Font Awesome is underused**
Font Awesome 6 Free is loaded (`index.html:23`) but the only FA usage observed is in session table action buttons. The workflow bar (`index.html:120–142`), tab bar (`index.html:204–229`), header buttons (`index.html:46–66`), and file-review cards all use Unicode emoji. Emoji render at inconsistent sizes, misalign vertically, and carry different visual weight across platforms. Estimated scope to replace with FA icons: medium.

**GAP-DESIGN-02: Inline style proliferation in modals and JS templates will drift**
Four of six close buttons use raw inline styles instead of `.modal-close-btn` (`index.html:253, 582, 693, 709`). No named modal-size modifier classes exist; all modal sizing is inline. The download tab generates entirely inline-styled HTML (`download-tab.js` has 44 inline-style occurrences). The layout-instruction sidebar mixes named classes with inline control styles (`layout-instruction.js:321–356`). Proposed fix: (a) add `.modal--wide`, `.modal--narrow`, `.modal--fullscreen` variants to CSS; (b) add semantic classes for the ATS report table rows and badges currently using inline styles in JS.

**GAP-DESIGN-03: No CSS design tokens**
Zero CSS custom properties are used (`var(--*)` count: 0 in `styles.css`). The 97-entry hardcoded color palette makes theme adaptation or even a color-fix a global search-and-replace exercise. Proposed fix: establish a `:root {}` token block for the eight most-used palette values (brand-blue, brand-dark, surface-border, text-primary, text-secondary, status-success, status-warning, status-danger).

**GAP-DESIGN-04: Duplicate `@keyframes spin` definitions**
`@keyframes spin` is defined at `styles.css:901–904` (the original) and again at `styles.css:1445` (the layout processing indicator). A third variant `@keyframes llm-spin` exists at `styles.css:558`. These are functionally identical (`to { transform: rotate(360deg) }`). The duplication indicates CSS accumulation without housekeeping. Consolidate to a single `@keyframes spin` definition.

**GAP-DESIGN-05: Main two-panel layout has no responsive breakpoint**
`.main-container` is `display: flex` with `.interaction-area` at 40% and `.viewer-area` at 60% (`styles.css:330–372`). There is no `@media` rule that collapses these panels to stacked or single-column at narrow widths. The workflow step bar has responsive rules at 1400px and 1280px but the chat/viewer split does not. At widths below ~900px the 40% chat panel becomes too narrow for usable input and the viewer is compressed. The only adaptation is the chat-collapse toggle button, which is a workaround rather than a responsive layout.

**GAP-DESIGN-06: Generated CV font choice limits output credibility**
`templates/cv-style.css:18` uses `"Segoe UI", Arial, sans-serif` — a Windows system default with no typographic personality. Proposal: offer 2–3 named font-stack presets in the Layout panel (e.g., "Modern Sans" / "Classic Humanist" / "Compact Mono") so users have meaningful typographic choice beyond LLM freeform instructions.

**GAP-DESIGN-07: CV header center-alignment vs. body left-alignment**
`.cv-header` is `text-align: center` (`cv-style.css:36`) while the body uses a left-aligned two-column grid. This creates a compositional inconsistency: the reader's eye enters center-aligned, then shifts left for body content. A deliberate design choice would be consistently left-aligned throughout, or a centered layout with a centered column.

---

## Scorecard

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
| US-G3.2 Controls vs. preview competition | | ⚠️ | | | |
| US-G3.3 File-review surface quality | ✅ | | | | |
| US-G3.4 Generated materials credibility | | ⚠️ | | | |

**Summary counts:** 6 Pass / 6 Partial / 0 Fail / 0 Not Implemented / 0 N/A

---

## Evidence References

| Finding | File | Line(s) |
| ------- | ---- | ------- |
| Typography scale (h1/h2/h3/body) | `web/styles.css` | 691–696 |
| `.action-btn` / `.action-btn.primary` / `.action-btn.secondary` | `web/styles.css` | 587–594 |
| Position-bar inline-style buttons | `web/index.html` | 102–106 |
| Sessions modal "New Session" inline style | `web/index.html` | 260 |
| Status color semantic system | `web/styles.css` | 102–104, 119–121, 151–157, 717–728, 1229–1231 |
| Modal base class | `web/styles.css` | 941–946 |
| Sessions modal inline size overrides | `web/index.html` | 250–268 |
| Master CV modal position override | `web/index.html` | 272 |
| Close button inconsistency | `web/index.html` | 253, 275, 422, 582, 693, 709 |
| Modal close-btn class definition | `web/styles.css` | 947 |
| Layout preview two-pane flex | `web/styles.css` | 1376–1385 |
| Layout preview responsive breakpoint | `web/styles.css` | 1466–1472 |
| Layout settings row inline styles | `web/layout-instruction.js` | 321–356 |
| Download tab inline-styled HTML | `web/download-tab.js` | 81–140 |
| Download item cards (class-governed) | `web/styles.css` | 1285–1293 |
| Rewrite card visual system | `web/styles.css` | 1240–1280 |
| Duplicate @keyframes spin | `web/styles.css` | 901–904, 1445 |
| @keyframes llm-spin | `web/styles.css` | 558 |
| No CSS custom properties | `web/styles.css` | entire file (0 hits for `var(--`) |
| Two-panel main layout (no responsive breakpoint) | `web/styles.css` | 330–372 |
| CV body font stack | `templates/cv-style.css` | 18–19 |
| CV header center alignment | `templates/cv-style.css` | 36 |
| CV two-column grid | `templates/cv-style.css` | 64–70 |
| CV right-column h2 at 12pt | `templates/cv-style.css` | 145–147 |
| CV print optimization | `templates/cv-style.css` | 206–224 |
| CV page-break rules | `templates/cv-style.css` | 226–237 |
| Cover letter serif font | `web/styles.css` | 1518 |
| LLM Wizard progress bar | `web/styles.css` | 956–1032 |
| Emoji in workflow nav | `web/index.html` | 120–142 |
| Font Awesome loaded (underused) | `web/index.html` | 23 |
| Focus trap implementation | `web/ui-core.js` | 294–347 |
| Reduced-motion media query | `web/styles.css` | 1621–1630 |
