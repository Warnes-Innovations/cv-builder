<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-04-20 17:30 ET

**Executive Summary:** The application has a clean, coherent visual foundation built on a professional slate/blue palette with appropriate semantic color states; all three US-G stories pass at the criteria level with two partial gaps — button-class mixing between Bootstrap 5 and the custom `action-btn` system on the Layout tab, and a small set of designer-facing terminology issues in the layout controls.

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. Headings, body text, helper text, and controls are visually distinct | ✅ | `styles.css` defines a full type scale: `h1` 28px/700, `h2` 20px/600, `h3` 16px/600, body `#1e293b`, helper `#64748b`. `.document-content h1/h2/h3` establishes clear heading cascade. |
| 2. Primary actions are consistently prominent | ✅ | `.action-btn.primary { background: #3b82f6; color: #fff; }` (`styles.css`). All stage-gating CTAs in `app.js:105–126` use `action-btn primary`. Blue is reserved for primary actions, green for confirmations/success states. |
| 3. Dense review surfaces remain readable rather than visually flat | ✅ | Review tables use alternating `nth-child(even)` rows, `.rewrite-card` uses card-border + `background:#f8fafc` with accepted/rejected color states (`styles.css`). Analysis role card uses a gradient. |
| 4. Color and theme choices support usability and visual attractiveness | ✅ | Semantic palette: primary `#3b82f6`, success `#10b981`, warning `#f59e0b`, error `#ef4444`, neutral slate `#f8fafc→#1e293b`. Applied consistently across confidence badges, ATS states, freshness chips, and status cards. |

**Acceptance criteria met:** ✅ Primary actions are immediately identifiable; review surfaces maintain readable structure.

---

### US-G2: Cross-Stage Visual Consistency

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. Repeated control types share consistent styling | ⚠️ | Most of the app uses `.action-btn`, `.action-btn.primary`, `.btn-primary`, `.btn-secondary` (custom classes). The Layout tab (`layout-instruction.js:258–295`) uses Bootstrap 5 classes: `btn btn-warning`, `btn btn-secondary`, `btn btn-primary`, `btn btn-success`. Bootstrap and custom heights differ (~2–4px). |
| 2. Status surfaces use a coherent visual language across stages | ✅ | Freshness chip `.layout-freshness-chip.fresh/stale/critical`, `.ats-score-badge.score-high/medium/low`, `.step.active/completed/stale/stale-critical` — all use the same green/amber/red semantic tones from `styles.css`. |
| 3. Tabs, workflow bar, cards, and modals feel part of the same design system | ✅ | Workflow step pills, second-level tab bar, and modal header/body/footer all share the same `#e2e8f0` border, `#f8fafc` surface, and `#1e293b` text system. `styles.css` documents Bootstrap `.modal` override. |
| 4. Familiar, standard interaction patterns unless there is a clear reason to diverge | ⚠️ | The fixed 40/60 chat-left/viewer-right split means complex review canvases are constrained to ~60% of viewport. On a 1366px laptop the viewer gets ~820px — adequate but tight for side-by-side comparisons. This is a deliberate architectural choice. |

**Acceptance criteria met:** ⚠️ Mostly coherent visual language; Bootstrap/custom button mixing on the Layout tab creates minor but noticeable size inconsistency.

---

### US-G3: Preview and Output Presentation Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. The layout-preview area frames content clearly | ✅ | `.layout-instruction-panel { display:flex; gap:20px; height:calc(100vh - 240px); }` (`styles.css:1202`). Preview pane is flex-1 with `min-width:0`; iframe fills it fully. Status card overlays freshness state above the iframe without covering content. |
| 2. Supporting controls do not visually compete with the preview | ⚠️ | The 320px control pane (`styles.css:1207`) is well-subordinate to the preview. However, the layout settings row is built with inline styles (`layout-instruction.js:271`: `style="display:flex; align-items:center; gap:10px; margin-bottom:14px; …"`) rather than a named CSS class, making it invisible to the design system and hard to theme consistently. |
| 3. Final file-review surfaces present outputs and actions cleanly | ✅ | `download-tab.js:_renderDownloadGrid` renders a vertical `.download-grid` with icon, description, and clearly labeled download/blocked states. ATS validation is shown in a `<details open>` table. Finalise tab uses card groupings with clear section headers. |
| 4. Generated materials reinforce a credible professional brand without decorative excess | ✅ | Default viewer shell: `max-width:8.5in; min-height:11in; padding:0.5in; box-shadow:0 4px 6px` (`styles.css`). The page-like frame appropriately signals a professional document context. File labeling distinguishes human-readable vs. ATS-optimised clearly in `download-tab.js:36–54`. |

**Acceptance criteria met:** ⚠️ Largely polished; layout settings row inline styles are the only surface-level inconsistency.

---

## Generated Materials Evaluation

**Download file labeling** (`download-tab.js:36–54`):
- "Human-readable PDF — for human reviewers and printing" ✅ Clear
- "ATS-optimised PDF — machine-readable for automated screening" ✅ Clear
- "Human-readable Word document — editable format" ✅ Clear
- "ATS-optimised Word document — keyword-optimised for job applications" ✅ Clear

**Preview fidelity** (`layout-instruction.js:246`): CV is rendered in a sandboxed iframe (`sandbox="allow-same-origin"`) preserving document styling while preventing script injection. Chrome and WeasyPrint render in parallel and are linked directly from the Preview PDFs card. Both renderer labels and their ready/failed states are clearly distinguished.

**Typography of generated materials**: The print CSS path targets `page-margin` (configurable 0.5–1.5 in) and `base-font-size` (6–16 px root). Control ranges are appropriate for print output. Font family used in generated output is not exposed or labeled in the UI.

---

## Story Tally

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-G1: Visual Hierarchy and Readability | 4 | 0 | 0 | 0 | 0 |
| US-G2: Cross-Stage Visual Consistency | 2 | 2 | 0 | 0 | 0 |
| US-G3: Preview and Output Presentation Quality | 3 | 1 | 0 | 0 | 0 |
| **Totals** | **9** | **3** | **0** | **0** | **0** |

---

## Top 5 Gaps (by Severity)

### Gap 1 — Layout control labeling not designer-accessible (MEDIUM)

**Evidence:** `layout-instruction.js:273–278`
```html
<label>Base font size (px):</label>
<input min="6" max="16" step="0.5" value="13"
  title="Controls the root font size for the CV. All rem-based sizes scale with this value." />
```
A non-developer who sets this to 13 cannot tell whether the output will look like 10pt or 12pt body text, because the CSS root-font-size-to-rem relationship is opaque. The tooltip is accurate but requires CSS literacy. The unit label "px" is a CSS unit, not a print unit — designers think in pt.

---

### Gap 2 — Button class system mixing on Layout tab (MEDIUM)

**Evidence:** `layout-instruction.js:258, 289, 292, 308, 315, 322` use `btn btn-warning`, `btn btn-secondary`, `btn btn-primary`, `btn btn-success` (Bootstrap 5). All other tabs use `action-btn`, `action-btn primary`, `btn-primary`, `btn-secondary` (custom `styles.css` classes).

Bootstrap 5's `.btn` has `padding:.375rem .75rem` (≈6×12px) vs. `.action-btn` with `padding:10px 16px` (10×16px). Buttons inside the layout pane are visibly smaller than action buttons in the chat panel.

---

### Gap 3 — Layout settings row uses inline styles (LOW)

**Evidence:** `layout-instruction.js:271`:
```js
style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;"
```
This row cannot be themed from `styles.css` and will not respond to future design-system updates. Should be extracted to a named CSS class (e.g., `.layout-settings-row`).

---

### Gap 4 — Instruction textarea placeholder reads as developer copy (LOW)

**Evidence:** `layout-instruction.js:294–298`
```
placeholder="e.g., Move Publications section after Skills&#10;or: Make the Summary section smaller&#10;or: Keep the Genentech entry on one page"
```
The `or:` prefix is a code-documentation convention, not natural user guidance language. The examples are technically accurate but feel like developer-written documentation rather than in-product guidance.

---

### Gap 5 — "Confirm Layout" button duplicated with no visual disambiguation (LOW)

**Evidence:** `layout-instruction.js:307–310 and 320–323`
Two identical `<button>Confirm Layout</button>` elements appear — one above and one below the instruction history, both sharing the same green `btn btn-success` style. First-time users may be confused about whether both must be clicked. There is no visual hint (e.g., secondary label, anchor icon) that the second is a scroll-convenience duplicate.

---

## Additional Story Gaps / Proposed Story Items

**Proposed US-G4:**
> As a graphical designer, I want layout controls to display values in designer-familiar units (pt for font size, in for margins) and show a live equivalence note (e.g., "≈ 10pt body text") so I can make informed typographic decisions without CSS knowledge.

**Proposed US-G5:**
> As a graphical designer, I want the layout instruction textarea to show user-friendly placeholder examples that demonstrate natural language input so that users understand the kind of language the system accepts.

**Proposed US-G6:**
> As a graphical designer, I want all buttons across every workflow stage to use the same visual system (same height, weight, border-radius, and color semantics) so that the application feels unified rather than assembled from multiple design systems.

---

## Evidence Base

**Files reviewed:**
- `web/index.html` (lines 1–300)
- `web/app.js` (full)
- `web/ui-core.js` (lines 1–300)
- `web/state-manager.js` (lines 1–300)
- `web/styles.css` (full — reviewed in sections)
- `web/layout-instruction.js` (full)
- `web/finalise.js` (full)
- `web/download-tab.js` (full)
- `web/ats-modals.js` (lines 1–200)
- `tasks/user-story-graphical-designer.md`
- `tasks/current-implemented-workflow.md`

**Key evidence references:**
- `styles.css:18–19` — body font and background base
- `styles.css:~109–136` — `.action-btn` / `.action-btn.primary` system
- `styles.css:1202–1263` — layout panel two-column layout and responsive breakpoints
- `layout-instruction.js:241–330` — full layout panel HTML with inline styles and Bootstrap classes
- `layout-instruction.js:271–295` — layout settings row (inline styles, Bootstrap buttons)
- `download-tab.js:36–54` — file description labeling
- `app.js:105–126` — stage action buttons using `.action-btn.primary`

**Evidence standard:** Every conclusion is supported by file:line source evidence. No assumptions made about runtime behavior from untested code paths.
