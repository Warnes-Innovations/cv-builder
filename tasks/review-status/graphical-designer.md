<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review — CV Builder Application

Reviewer persona: Graphical Designer
Scope: Application UI visual quality + Generated materials visual quality
Cycle: 5
Date: 2026-06-20
Time: ~22:30 ET

Source files read:

- `web/index.html` (719 lines)
- `web/app.js` (140 lines)
- `web/ui-core.js` (2015 lines)
- `web/state-manager.js` (580 lines)
- `web/styles.css` (1601 lines)
- `scripts/web_app.py`
- `scripts/utils/conversation_manager.py`

Legend: ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Implemented | — N/A

---

## Cycle 5 Delta Assessment

Compared to Cycle 4, the following changes are confirmed from source and git log (commits 1c05811, 6ad34fa, since 2026-06-18):

- `web/styles.css`: 1601 lines (unchanged)
- `web/index.html`: 719 lines (unchanged)
- Inline `style=""` count in `index.html`: 218 (unchanged from Cycle 4)

**Resolved since Cycle 4:**

- **D6 (RESOLVED):** The duplicate `.step-stale-badge` rule at the old line 180 was removed (`1c05811`). The class now has a single definition at line 1417 only.
- **GAP-72 (RESOLVED for keyboard nav):** `updateWorkflowStepsClickable()` in `ui-core.js` (lines 1917–1941) now dynamically adds `role="button"`, `tabindex="0"`, and an Enter/Space keydown handler when a step becomes clickable, and removes them when inert. Keyboard users can now navigate all unlocked workflow steps.
- **GAP-155 (RESOLVED):** `.toast.toast-warning { border-left: 4px solid #f59e0b; }` added at `styles.css` line 1223 — warning toasts are now visually distinct from success and error variants.

**Persistent from Cycle 4 (unchanged):**

- D1: No CSS custom properties in `web/styles.css` — `grep ":root"` returns zero matches.
- D2: Six parallel primary-button classes.
- D3: 13 emoji in workflow step bar (12 step elements confirmed in HTML, each with an emoji).
- D4: `.tab` and `.step` elements still have no `:focus-visible` rule.
- D5: Divergent CV output templates (GAP-132) — not within scope of this review cycle's files.

**New observation this cycle — rename widget inline styles:**
`session-manager.js` lines 766–781 implement the inline rename widget (`promptRenameCurrentSession`) with fully hardcoded `style.cssText` strings: input sizing, ok-button green (`#10b981`), cancel-button grey (`#6b7280`). The feature is functionally correct and accessibility-improved (aria-labels added per GAP-157), but the styling remains outside the stylesheet.

---

## GAP-Specific Verifications (Cycle 5)

### GAP-132 — Divergent CV Templates

CONFIRMED OPEN. Source files `templates/cv-template.html` and `templates/cv-style.css` are outside the current review scope but were verified unchanged in Cycle 4. No commit since 2026-06-18 touches either file.

### GAP-133 — No CSS Design Token Layer

CONFIRMED OPEN. `grep ":root" web/styles.css` returns zero matches. Distinct hex colour literals: 96 unique values across 1601 lines (up from ~50 estimated in Cycle 3/4 — exact count via `grep -oP` confirms 96 distinct literals). Inline `style=""` count in `index.html` remains 218. No change.

---

## Section A: Application Evaluation

---

### US-G1: Visual Hierarchy and Readability

---

#### AC 1.1 — Headings, body text, helper text, and controls are visually distinct

⚠️ Partial

The stylesheet provides a functional typographic hierarchy in the document viewer (`styles.css` lines 684–689): `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body `p` 14px/line-height 1.6. Header app title is 20px/600 (`styles.css` line 21); conversation panel title 18px/600 (line 374).

Three weaknesses persist from Cycle 4:

1. **No shared typographic scale.** No `:root {}` token block. Helper-text sizes — `11px`, `12px`, `13px`, `14px`, `15px` — recur independently across components. The inline rename widget (`session-manager.js` line 771) uses `font-size:inherit` for the input, which is a relative improvement, but the `⚙️ Settings` and `📂 Sessions` header pill buttons specify `font-size: 13px` as a bare CSS literal (styles.css line 64). No token layer unifies these.

2. **Position-bar action buttons use raw inline styles.** The "Master CV", "ATS Report", and "Job Analysis" buttons (`index.html` lines 101–105) carry `style="background:#f1f5f9;border:1px solid #e2e8f0;…font-size:0.8em;padding:2px 7px;line-height:1.6;"` inline. These are meaningful workflow entry points rendered at sub-tertiary visual weight.

3. **Helper text from JS is outside the stylesheet.** `ui-core.js` injects helper text via inline `style.cssText` assignments (lines 381–395 confirm-dialog; lines 99, 108–118 settings sources). Source-level text annotations in the settings modal use `font-size: 0.78em` hardcoded strings outside any CSS class.

**No regression, no improvement since Cycle 4.**

---

#### AC 1.2 — Primary actions are consistently prominent

⚠️ Partial

`.action-btn.primary` (`styles.css` lines 586–587) correctly delivers `background: #3b82f6; color: #fff; border-color: #3b82f6` at `font-size: 14px`. The Send button matches. Hover darkens to `#2563eb`.

Persistent inconsistencies:

- Six parallel CSS classes exist for the primary blue button role: `.action-btn.primary` (line 586), `.btn-primary` (line 1296), `.submit-btn` (line 1210), `.editor-btn` (line 857), `.continue-btn` (line 1214), `.layout-action-btn` (line 1429), `.modal-btn` (line 942). Each independently specifies geometry (padding, border-radius, font-size). Border-radius ranges from 4px (position-bar inline buttons) to 10px (rewrite cards) across these classes.
- The interaction-area action strip (`index.html` lines 182–190) contains nine `.action-btn.primary` buttons managed via `display:none` state toggling. While only one is visible at a time in normal flow, the HTML structure places nine equally-weighted primary CTAs in a single flat list with no secondary-emphasis tier.

**No change since Cycle 4.**

---

#### AC 1.3 — Dense review surfaces remain readable rather than visually flat

✅ Pass

The rewrite review panel continues to handle density well. `.rewrite-card` (`styles.css` line 1232: `border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc`) with `.accepted` (green `#10b981` border) and `.rejected` (red `#f87171` border, 0.7 opacity) provide strong visual state differentiation. Inline diff markup with `del.diff-removed` (red text on `#fee2e2`) and `ins.diff-added` (green text on `#dcfce7`) at lines 1241–1242 supports rapid comprehension. The sticky tally bar (line 1226: `position: sticky; top: 0; z-index: 10`) anchors tally context during scroll.

The analysis page card hierarchy (role card on gradient `#eff6ff → #dbeafe`, section cards on `border: 1px solid #e2e8f0` white background, skill badges on `#dbeafe` / missing on `#fee2e2`) remains clear.

**New positive:** `[data-changed="true"]` animation (`styles.css` lines 1531–1541) adds a 1.5s amber pulse (`#f59e0b` outline, `#fef3c7` background → `inherit`) on re-run changed items. This is a meaningful visual differentiator for dense review surfaces during re-runs.

**No regression; minor improvement via changed-item animation.**

---

#### AC 1.4 — Color and theme choices support both usability and visual attractiveness

⚠️ Partial

The palette remains a blue-anchored neutral system (Tailwind Slate + Blue). Semantic state colours are consistently applied: active blue `#dbeafe/#1d4ed8`, complete green `#dcfce7/#166534`, stale amber `#fffbeb/#92400e`, error red `#fef2f2/#b91c1c`. These are reflected coherently in workflow step pills (`styles.css` lines 150–156), freshness chips (lines 119–121), layout-status cards (lines 1420–1422), confidence badges (lines 700–722), and rewrite cards (lines 1232–1234).

**New positive (GAP-155):** Warning toasts now have an amber left-border (`styles.css` line 1223: `border-left: 4px solid #f59e0b`), closing the visual gap between the three toast variants (success green / error red / warning amber). This aligns toast colour semantics with the rest of the application's state colour vocabulary.

The visual ceiling remains utilitarian. The dark header bar is flat. 96 distinct hex literals remain hardcoded with no `:root {}` indirection. The master-profile card gradient (`linear-gradient(135deg, #1e40af, #3b82f6)`, line 1457) is the sole decorative gradient in the app shell.

**Minor improvement (toast warning colour); no regression.**

---

**Summary — US-G1:**

| Criterion | Status |
| --------- | ------ |
| 1.1 Heading hierarchy distinct | ⚠️ |
| 1.2 Primary actions prominent | ⚠️ |
| 1.3 Dense surfaces readable | ✅ |
| 1.4 Colour supports usability and attractiveness | ⚠️ |

Acceptance Criteria verdict: ⚠️ Partial — hierarchy is functional on sparse surfaces; degrades where multiple primary-weight controls appear together or where position-bar entry-point buttons are rendered at sub-tertiary weight. Toast colour semantics improved.

---

### US-G2: Cross-Stage Visual Consistency

---

#### AC 2.1 — Repeated control types share consistent styling

⚠️ Partial

Button proliferation is unchanged (six primary-role classes; see AC 1.2). Tab underline pattern continues to be implemented three times independently: `.tab` (`styles.css` lines 623–635), `.review-subtab` (lines 661–675), `.input-tab` (lines 1288–1291) — same active-underline concept, independently specified padding and font-size values. The inline rename widget (`session-manager.js` lines 766–781) introduces two more styled buttons (ok/cancel) as injected inline styles, adding to the fragmentation.

**No change since Cycle 4.**

---

#### AC 2.2 — Status surfaces use a coherent visual language across stages

✅ Pass

The semantic state colour mapping remains consistent across all surfaces:

- Active / in-progress: blue (`#dbeafe/#1d4ed8`)
- Completed / success: green (`#dcfce7/#166534`)
- Stale / warning: amber (`#fffbeb/#92400e`)
- Critical / error: red (`#fef2f2/#b91c1c`)

Applied faithfully in workflow steps (lines 150–156), freshness chips (lines 119–121), layout status cards (lines 1420–1422), confidence badges (lines 700–722), rewrite cards (lines 1232–1234), toast variants (lines 1221–1223), and the `[data-changed="true"]` animation (lines 1531–1541).

**D6 RESOLVED:** The duplicate `.step-stale-badge` definition at the old line 180 (with conflicting `rgba(245,158,11,0.16)` background) has been removed. Only the richer definition at line 1417 (`background: #fed7aa; color: #7c2d12`) remains. The specificity trap is gone.

**Improvement: D6 resolved; stale-badge CSS is now single-source.**

---

#### AC 2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system

⚠️ Partial

Inline `style=""` count in `index.html` remains 218 (unchanged since Cycle 4 count of 218). Modal bodies, settings fields, onboarding steps, and the LLM wizard continue to use inline styles extensively. The confirm-dialog box built via JS string injection in `ui-core.js` (lines 381–395) uses fully hardcoded inline styles and cannot be themed or overridden via the stylesheet. The rename widget in `session-manager.js` (lines 766–781) follows the same pattern: functional but unthemeable.

The `_setConnectionMessage()` function in `app.js` (lines 16–39) applies `content.style.color`, `content.style.background`, `content.style.borderColor` as inline JS properties for the connection status pill — another surface outside the CSS layer.

**No change in inline-style count; no regression.**

---

#### AC 2.4 — Familiar, standard interaction patterns

✅ Pass

All standard patterns remain correctly applied:

- Modal overlays with close-on-backdrop-click (`index.html` lines 245, 267, 405)
- Tab-based navigation with active underline and WCAG arrow-key traversal (`ui-core.js` lines 515–541)
- Sticky tally bar during rewrite review
- Toast notifications (bottom-right, `gap: 8px` stack, `styles.css` line 1218)
- Focus trap and focus restoration in modals (`ui-core.js` lines 260–347)
- Session conflict banner with retry and dismiss affordances
- **New (GAP-72):** Keyboard-accessible workflow step pills — Enter/Space keydown handlers added dynamically to clickable steps (`ui-core.js` lines 1922–1930).

No novel interaction patterns introduced without reason.

---

**Summary — US-G2:**

| Criterion | Status |
| --------- | ------ |
| 2.1 Repeated controls consistent | ⚠️ |
| 2.2 Status surfaces coherent | ✅ |
| 2.3 Tabs, workflow bar, modals cohesive | ⚠️ |
| 2.4 Standard interaction patterns | ✅ |

Acceptance Criteria verdict: ⚠️ Partial — state colour language is coherent and well-maintained (D6 resolved, GAP-72 keyboard patterns added); component class structure remains fractured; inline-style count stable at 218.

---

### US-G3: Preview and Output Presentation Quality

---

#### AC 3.1 — Layout-preview area frames content clearly

✅ Pass

The layout review panel uses a two-pane flex structure (`styles.css` line 1365: `display: flex; gap: 20px; height: calc(100vh - 240px)`). The preview pane (`flex: 1 1 auto`) hosts an iframe inside `preview-iframe-container` (`border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc`). The loading overlay (lines 1370–1373) shows a spinner with progressive log output during render. The stale callout (`.layout-stale-callout`, lines 1393–1396: `background: #fffbeb; border-left: 4px solid #f59e0b`) correctly signals when the preview is out of date. The `layout-preview-status` block shows timestamp and revision-count information. Responsive breakpoints collapse to vertical stacking at ≤1100px (`styles.css` lines 1448–1454).

The sandboxed iframe (`sandbox="allow-same-origin"`, `index.html` line 287) prevents script execution inside the preview while preserving CSS rendering — a correct security vs. fidelity tradeoff.

**No change since Cycle 4.**

---

#### AC 3.2 — Supporting controls do not visually compete with the preview

⚠️ Partial

The font-size input continues to show both px and pt (confirmed in Cycle 4). This remains a genuine typographic transparency improvement for designers.

Persistent concern: the layout-settings row packs six heterogeneous controls (font-size number input, px/pt readout span, page-margin number input, page-break checkbox, skill-experience select, Apply button, status label) in a single `flex-wrap: wrap` row without a section heading or visual divider separating "document-wide settings" from the "natural-language instruction" textarea below. No change.

**No change since Cycle 4.**

---

#### AC 3.3 — Final file-review surfaces present outputs and actions cleanly

✅ Pass

The File Review tab uses `.download-grid` (`.download-item` flex rows: icon + info block + green `.btn-download` CTA — `styles.css` line 1283: `background: #10b981`). File type detection yields contextually labelled descriptions for PDF, DOCX, HTML, cover letter, and screening files. The ATS validation report renders in a `<details open>` collapsible with a pass/warn/fail colour-coded `<table>`. Blocked files are shown at `opacity: 0.75`. The paper-simulation document viewer (`styles.css` line 681: `max-width: 8.5in; min-height: 11in; padding: 0.5in; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`) is appropriate for the context.

**No change since Cycle 4.**

---

#### AC 3.4 — Generated materials reinforce a credible professional brand without decorative excess

⚠️ Partial

The HTML CV template (`templates/cv-template.html`, not in direct review scope but referenced as unchanged) continues to provide a sound design-token layer (8 CSS custom properties in `:root {}`), rem-based font scale, Inter + Merriweather typography, and a restrained 32%/68% flex-row layout. These remain appropriate for professional credibility.

`templates/cv-style.css` (DOCX output) continues to diverge on all four axes documented in GAP-132 (font family, brand blue, layout mechanism, column proportions, size units). No change.

**No change since Cycle 4.**

---

**Summary — US-G3:**

| Criterion | Status |
| --------- | ------ |
| 3.1 Layout preview frames clearly | ✅ |
| 3.2 Controls don't compete with preview | ⚠️ |
| 3.3 Final file-review surfaces clean | ✅ |
| 3.4 Generated materials professionally credible | ⚠️ |

Acceptance Criteria verdict: ⚠️ Partial — preview and file-review screens are largely polished; AC 3.2 settings row grouping remains visually ambiguous; AC 3.4 blocked by divergent template systems.

---

## Section B: Generated Materials Evaluation

### Typography

⚠️ Partial

`templates/cv-template.html` uses a well-constructed type system:
- Inter (weights 300/400/600/700) for body and labels; Merriweather available for name heading
- `rem`-based scale anchored to `html { font-size: <base_font_size> }`; 13px default ≈ 9.75pt
- `line-height: 1.6` on body
- Sidebar titles at `0.85rem / letter-spacing: 1px / font-weight: 700 / text-transform: uppercase`

`templates/cv-style.css` (DOCX): `font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.4` — lower typographic quality and visually different from the HTML template's Inter/Merriweather combination.

### Colour and Visual Identity

⚠️ Partial

`cv-template.html`: dark-blue scheme `--primary-color: #2c3e50`, accent `--accent-color: #2980b9`, sidebar `--sidebar-bg: #eef2f5`. Clean, professional, non-distracting.

`cv-style.css`: `#2c5aa0` (DOCX brand blue — 15% more saturated than HTML template's `#2980b9`). Two documents produced by the same session have different brand colours.

### Layout

✅ Pass

The HTML template's two-column flex-row (32/68 split) is a recognised professional resume format. Sidebar carries contact, skills, education; main carries experience and achievements. `page-break-inside: avoid` prevents mid-entry page cuts. `max-width: 215.9mm` + `--page-margin` correctly sized for US Letter PDF.

### Preview Fidelity

⚠️ Partial

The layout review iframe serves the HTML template. The `pxToPt()` helper allows designers to reason about the CV's printed font size in points. No viewport-zoom or DPI-scale control is exposed, so at non-standard viewports or HiDPI displays the preview may not accurately represent printed proportions.

---

## Cross-Cutting Design Issues

### Issue D1 — No CSS Custom Properties / Design Token Layer (GAP-133)

❌ Fail — UNCHANGED

`web/styles.css` contains no `:root {}` block. Confirmed via `grep ":root" web/styles.css` returning zero matches. Distinct hex colour literals: 96 unique values across 1601 lines (exact count via `grep -oP '#[0-9a-fA-F]{3,6}\b'`). 218 inline `style=""` attributes in `index.html` (unchanged). JS files (`app.js` lines 16–39, `ui-core.js` lines 99–118, `session-manager.js` lines 766–781) add further hardcoded colour values outside the stylesheet. Theming is structurally impossible; colour drift between components is endemic.

### Issue D2 — Proliferation of Button Classes

❌ Fail — UNCHANGED

Six distinct classes for primary blue action buttons: `.action-btn.primary` (line 586), `.btn-primary` (line 1296), `.submit-btn` (line 1210), `.editor-btn` (line 857), `.continue-btn` (line 1214), `.layout-action-btn` (line 1429), `.modal-btn` (line 942). Each independently specifies geometry. Note: `.continue-btn` deviates from the primary blue, using green `#10b981` — an additional inconsistency in that `.btn-download` (line 1283) and `.questions-submit-btn` (line 509) also use `#10b981` independently. The rename widget ok-button (`session-manager.js` line 776) adds yet another `#10b981` inline occurrence.

### Issue D3 — Heavy Emoji Use in Navigation

⚠️ Partial — UNCHANGED

12 step elements in the workflow nav bar (`index.html` lines 119–141), each with an emoji prefix (📥 🔍 ⚙️ ✏️ 🔤 🎨 ⬇️ 📩 📋 🎤 🙏 🌾). Additional emoji in the tab bar (25 tabs, most with emoji) and header buttons. Emoji rendering is platform-dependent and cannot be recoloured or scaled independently via CSS.

### Issue D4 — Missing Focus Indicators on Interactive Navigation Elements

⚠️ Partial — IMPROVED

**New (GAP-72):** Clickable `.step` elements now receive `role="button"` and `tabindex="0"` dynamically via `updateWorkflowStepsClickable()` in `ui-core.js` (lines 1920–1921). Keyboard Enter/Space triggers click (`lines 1923–1929`). This resolves the keyboard operability gap for workflow steps.

However, the visual `:focus-visible` styling for `.tab` and `.step` elements remains absent from `styles.css`. Only `.sm-th:focus-visible` (line 260) and `.preview-output-badge-link:focus-visible` (line 1390) are explicitly styled. Keyboard users navigating `.tab` elements or the newly-keyboard-accessible `.step` elements will see only the browser-default focus ring (thin dotted outline in some browsers; suppressed by `outline: none` on form inputs). The operability improvement (GAP-72) is real, but the visual affordance for the primary navigation controls remains at browser-default quality.

**Status improved from ⚠️ to ⚠️ with partial credit** — keyboard operability resolved; visual focus indicator still missing from stylesheet.

### Issue D5 — Divergent Generated Output Templates (GAP-132)

❌ Fail — UNCHANGED

| Dimension | cv-template.html | cv-style.css |
| --------- | ---------------- | ------------ |
| Font family | Inter + Merriweather (Google Fonts) | Segoe UI, Arial (system font) |
| Brand blue | #2980b9 | #2c5aa0 |
| Layout mechanism | CSS Flexbox, flex-row | CSS Grid, grid-template-columns |
| Column split | 32% sidebar / 68% main | 2.8fr main / 1.2fr sidebar (reversed polarity) |
| Size units | rem (user-scalable) | pt (fixed absolute) |
| CSS variables | :root with 8 custom properties | None |

The font-size control in the layout panel adjusts `cv-template.html`'s `rem` root. This has no effect on the DOCX output, which uses hardcoded `pt` values. The template divergence is not disclosed in the UI.

### Issue D6 — Duplicate CSS Rule: `.step-stale-badge`

✅ RESOLVED (Cycle 5)

The duplicate `.step-stale-badge` definition at the former line 180 (background `rgba(245,158,11,0.16)`, dead code) was removed in commit `1c05811`. The class is now defined once at line 1417 with the richer spec (`background: #fed7aa; color: #7c2d12`). No further cascade risk.

---

## Summary Table

| Story | Criterion | Cycle 4 | Cycle 5 | Change |
| ----- | --------- | ------- | ------- | ------ |
| US-G1 | 1.1 Heading hierarchy distinct | ⚠️ | ⚠️ | No change |
| US-G1 | 1.2 Primary actions prominent | ⚠️ | ⚠️ | No change |
| US-G1 | 1.3 Dense surfaces readable | ✅ | ✅ | Additive: changed-item pulse animation |
| US-G1 | 1.4 Colour supports usability and attractiveness | ⚠️ | ⚠️ | Improved: toast-warning amber border (GAP-155) |
| US-G2 | 2.1 Repeated controls consistent | ⚠️ | ⚠️ | No change |
| US-G2 | 2.2 Status surfaces coherent | ✅ | ✅ | Improved: D6 resolved (step-stale-badge deduplicated) |
| US-G2 | 2.3 Tabs, workflow bar, modals cohesive | ⚠️ | ⚠️ | No change; inline count stable at 218 |
| US-G2 | 2.4 Standard interaction patterns | ✅ | ✅ | Improved: GAP-72 keyboard nav for step pills |
| US-G3 | 3.1 Layout preview frames clearly | ✅ | ✅ | No change |
| US-G3 | 3.2 Controls don't compete with preview | ⚠️ | ⚠️ | No change |
| US-G3 | 3.3 Final file-review surfaces clean | ✅ | ✅ | No change |
| US-G3 | 3.4 Generated materials professionally credible | ⚠️ | ⚠️ | No change |

---

## Top Defects (Priority Order)

| ID | Priority | Issue | GAP | Cycle 5 Status |
| -- | -------- | ----- | --- | -------------- |
| D5 | HIGH | Two CV output templates produce inconsistent brand identity — font family, brand blue, layout, column proportions, size units all differ | GAP-132 | OPEN — no change |
| D1 | HIGH | No CSS custom properties in web/styles.css — 96 distinct hardcoded hex literals; 218 inline styles in index.html; theming structurally impossible | GAP-133 | OPEN — no change |
| D2 | MEDIUM | Six parallel button classes for same primary action role — independently maintained geometry | — | OPEN — no change |
| D3 | MEDIUM | 13+ emoji in workflow navigation — platform-inconsistent rendering; cannot be themed | — | OPEN — no change |
| D4 | MEDIUM | `.tab` and `.step` elements lack `:focus-visible` styling — keyboard operability improved (GAP-72) but visual focus indicator absent from stylesheet | — | PARTIAL — keyboard operability resolved; visual indicator still missing |
| D6 | — | `.step-stale-badge` defined twice with incompatible values | — | RESOLVED in Cycle 5 |

---

## Additional Story Gaps / Proposed Story Items

These observations fall outside the current user story criteria but are relevant to the graphical-designer perspective. Carried forward from Cycle 4 — none resolved:

**GAP-G1 — No zoom/scale control on layout preview iframe.** At non-standard viewport widths or HiDPI displays, the iframe preview renders at a fixed width without a user-controlled scale. A designer reviewing a US Letter document on a 13" laptop at 150% DPI cannot easily validate the printed proportions. Proposed story: "As a graphical designer, I want to scale the preview iframe to 100% / 75% / fit-to-pane so that I can evaluate the printed proportions accurately at any viewport size."

**GAP-G2 — Layout panel settings row grouping is visually ambiguous.** The six controls in the layout-settings bar (font size, margin, publications checkbox, skill-experience select, Apply button, status) are visually co-mingled with the instruction textarea below them. No section heading or horizontal rule separates "document-wide settings" from "natural-language instruction." Proposed story: "As a graphical designer, I want the document-wide layout settings (font size, margin, page-break) to be visually grouped and labelled separately from the natural-language instruction textarea so that I can identify the scope of each control at a glance."

**GAP-G3 — Template identity is not disclosed in the UI.** Users cannot tell from the application that the preview renders `cv-template.html` (Inter + Merriweather, rem, CSS custom properties) while the DOCX download uses `cv-style.css` (Segoe UI, pt, no variables). The visual discrepancy between preview and downloaded artifact is invisible until download. Proposed story: "As a graphical designer, I want the layout review and file-review tabs to indicate which template is used for each output format so that I understand why the downloaded DOCX may differ visually from the preview."

---

## Evidence Summary

| Source | Evidence type | Finding |
| ------ | ------------- | ------- |
| `web/styles.css` (grep `:root`) | Zero matches | GAP-133 confirmed open |
| `web/styles.css` lines 150–156 | Step state colours | Semantic colour consistency ✅ |
| `web/styles.css` lines 586, 857, 942, 1210, 1214, 1296, 1429 | Button classes | Six primary-role button classes ❌ |
| `web/styles.css` line 1417 only | `.step-stale-badge` | Single definition; D6 resolved ✅ |
| `web/styles.css` lines 260, 1390 | focus-visible rules | Only `.sm-th` and `.preview-output-badge-link` styled; `.tab` and `.step` missing ⚠️ |
| `web/styles.css` lines 681–683 | Document viewer | Paper-simulation (8.5in / 11in / 0.5in / box-shadow) ✅ |
| `web/styles.css` lines 1365–1454 | Layout review pane | Two-pane flex, iframe, stale callout, responsive breakpoints ✅ |
| `web/styles.css` line 1223 | `.toast.toast-warning` | Amber border-left added; GAP-155 resolved ✅ |
| `web/styles.css` lines 1531–1541 | `[data-changed="true"]` | Amber pulse animation on re-run changed items ✅ |
| `web/index.html` (grep count) | 218 inline styles | Unchanged from Cycle 4 |
| `web/index.html` lines 101–105 | Position-bar buttons | Inline-styled tertiary weight for important workflow entry points ⚠️ |
| `web/index.html` lines 119–141 | Workflow step emoji | 12 steps, each with emoji prefix ⚠️ |
| `web/ui-core.js` lines 1917–1941 | `_makeStepClickable()` | role=button + tabindex + keydown handler; GAP-72 resolved ✅ |
| `web/ui-core.js` lines 381–395 | confirm-dialog cssText | Fully hardcoded inline styles; not themeable ⚠️ |
| `web/app.js` lines 16–39 | `_setConnectionMessage()` | JS-injected inline colour styles for connection pill ⚠️ |
| `web/session-manager.js` lines 766–781 | rename widget | Inline `style.cssText`; functionally correct, accessibility-labelled, not themeable ⚠️ |
