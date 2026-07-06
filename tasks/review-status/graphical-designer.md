<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-07-06 15:45 ET
**Reviewed by:** Source-verified review cycle (Graphical Designer persona, US-G*)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-template.html

**Executive Summary (updated 2026-07-06):** The application delivers a coherent, professionally-styled visual system. Typography is well-differentiated, a consistent Slate-based color palette runs throughout, and the semantic status language (green/amber/red) is applied uniformly across all surfaces. The `styles.css` token layer has 95 CSS custom properties — the GAP-133 styles.css portion is fully resolved. The `@keyframes spin` duplicate noted in earlier cycles is resolved (single definition at `styles.css:1055`). One undefined CSS variable was found: `var(--cv-card-bg)` at `styles.css:1600` (`.position-style-option`) — this variable is not declared in `:root` and will silently fall back to transparent, causing invisible background on position-style picker buttons. Ongoing weaknesses: (1) ~227 inline `style=""` attributes in `index.html` deferred pending GAP-01; (2) emoji-dominant icon language (Font Awesome loaded but used only in session table action buttons); (3) no responsive breakpoint for the main two-panel shell; (4) one undefined CSS variable (`--cv-card-bg`); (5) no typographic scale or spacing tokens in the design system (font sizes are hard-coded px/em values per-component).

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

| Criterion | Status | Evidence |
|-----------|--------|----------|
| US-G1.1 Headings, body, helper text, controls visually distinct | ✅ Pass | `styles.css:833–838` |
| US-G1.2 Primary actions consistently prominent | ⚠️ Partial | `index.html:104–111, 264` |
| US-G1.3 Dense review surfaces readable | ✅ Pass | `styles.css:1398–1464` |
| US-G1.4 Color/theme usability and attractiveness | ⚠️ Partial | `styles.css:18–126` |

**US-G1.1 — Headings, body text, helper text, and controls are visually distinct**
✅ Pass

The CSS defines a clear four-level heading scale within the document viewer: `h1` at 28px/700 weight (`styles.css:833`), `h2` at 20px/600 (`styles.css:834`), `h3` at 16px/600 (`styles.css:835`), and body `li`/`p` at 14–15px / line-height 1.6 (`styles.css:836–838`). Helper and meta text is consistently rendered using `var(--cv-text-secondary)` (#64748b Slate-500). Form labels use 0.85–0.88em / weight-600. The conversation panel separates roles via distinct background colors: user messages in `var(--cv-accent)` blue with white text, assistant in white with border, and system messages in `var(--cv-bg-subtle)` italic grey (`styles.css:505–507`). The conversation panel header "Conversation" h2 at 18px/600 (`styles.css:495`) is distinct from the document viewer.

**US-G1.2 — Primary actions are consistently prominent**
⚠️ Partial

The `.action-btn.primary` class is correctly blue (`var(--cv-accent)`) with white text (`styles.css:707`). All chat-area workflow buttons use `class="action-btn primary"` consistently (`index.html:190–199`). However, three position-bar buttons (Master CV, ATS Report, Job Analysis) use full inline style blocks with hardcoded hex literals (`background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;font-size:0.8em;padding:2px 7px`) rather than a shared CSS class (`index.html:106–110`). The Sessions modal footer "New Session" button applies inline `style="background:#10b981;color:#fff;border-color:#10b981"` on `class="action-btn"` (`index.html:264`) instead of using `.action-btn.primary`. This dilutes the primary-action signal system.

**US-G1.3 — Dense review surfaces remain readable**
✅ Pass

The rewrite-review panel uses a well-designed card system (`styles.css:1405–1464`): `rewrite-card` with 1px border, 10px radius, and color-coded states (`accepted` → `var(--cv-success-bg)`, `rejected` → `var(--cv-error-bg)` at 0.7 opacity). Inline diff uses `del.diff-removed` in `var(--cv-error)` / `var(--cv-error-bg-lt)` and `ins.diff-added` in `var(--cv-success-text)` / `var(--cv-success-bg-md)` (`styles.css:1419–1420`). A sticky tally bar prevents context loss on long lists. Experience/skill review tables use `.review-table` with alternating row stripes, 8px/12px cell padding (`styles.css:1309–1313`). These surfaces maintain readability at density.

**US-G1.4 — Color and theme choices support usability and attractiveness**
⚠️ Partial

The palette is professional: `var(--cv-text-primary)` (#1e293b Slate-800) for headers, `var(--cv-accent)` (#3b82f6 Blue-500) for interactive elements, semantic greens/ambers/reds for state. The ATS badge uses threshold-triggered color (`score-high` → `var(--cv-success-md)`, `score-medium` → `var(--cv-amber-600)`, `score-low` → `var(--cv-error)`) (`styles.css:216–218`), which is well-executed. The `:root {}` block has 95 CSS custom properties covering the full semantic palette (`styles.css:18–126`).

**NEW FINDING:** `var(--cv-card-bg)` is used at `styles.css:1600` (`.position-style-option`) but is not defined anywhere in `:root`. This undefined variable causes the position-style picker buttons to silently inherit `transparent` background instead of the intended card-background fill. This is a minor rendering defect but a design system integrity issue.

The overall aesthetic remains Slate/Tailwind-adjacent — functional and clean but reads as a developer-grade admin panel rather than a designed career product. Font scale and spacing tokens are absent from the token layer (only color is tokenized); sizes are hard-coded per-component in px/em.

---

### US-G2: Cross-Stage Visual Consistency

| Criterion | Status | Evidence |
|-----------|--------|----------|
| US-G2.1 Repeated control types share consistent styling | ⚠️ Partial | `index.html:257, 586, 703, 719` |
| US-G2.2 Status surfaces use coherent visual language | ✅ Pass | `styles.css:265–271, 216–218, 233–235` |
| US-G2.3 Tabs, workflow bar, cards, modals feel cohesive | ⚠️ Partial | `index.html:254, 276, 423, 583` |
| US-G2.4 Familiar, standard interaction patterns | ✅ Pass | `styles.css:758–761, 1836–1854` |

**US-G2.1 — Repeated control types share consistent styling**
⚠️ Partial

The shared `.action-btn` system (`styles.css:705–712`) covers most modal footers and chat-area actions consistently. The `.header-pill-btn` pattern is uniform across all five header buttons (`index.html:45–70`, `styles.css:177–179`). The `icon-btn` 32×32 action buttons for review surfaces are consistent.

However, six distinct close-button patterns exist across modals:
- `class="modal-close-btn"` — correct, used in Master CV modal and LLM Wizard (`index.html:279, 426`)
- Raw inline `style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;"` — used in Sessions, Settings, ATS Report, Job Analysis modals (`index.html:257, 586, 703, 719`)

Four of six close buttons are un-classed. This was identified in prior cycles and remains unresolved.

**US-G2.2 — Status surfaces use a coherent visual language**
✅ Pass

The amber/green/red semantic is applied consistently:
- Workflow steps: `.step.completed` → `var(--cv-success-bg-md)`, `.step.active` → `var(--cv-info-bg-md)`, `.step.stale` → `var(--cv-warn-bg)`, `.step.stale-critical` → `var(--cv-error-bg)` (`styles.css:265–271`)
- Layout freshness chip: `.fresh` → `var(--cv-emerald-50)` / `var(--cv-success-border)`, `.stale` → `var(--cv-warn-bg)` / `var(--cv-warn-light)`, `.critical` → `var(--cv-error-bg)` / `var(--cv-error-border)` (`styles.css:233–235`)
- ATS score badge: same green/amber/red thresholds via class modifiers (`styles.css:216–218`)
- Toast notifications: `toast-success` → `var(--cv-success)`, `toast-error` → `var(--cv-error-light)`, `toast-warning` → `var(--cv-warn)` (`styles.css:1394–1396`)
- Confidence badges: `confidence-high` → `var(--cv-success-bg-md)`, `confidence-medium` → `var(--cv-warn-bg-md)`, `confidence-low` → `var(--cv-error-bg-lt)` (`styles.css:856–882`)

The semantic assignment is consistent and learnable across all stages.

**US-G2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system**
⚠️ Partial

Tabs, workflow steps, and modals share `var(--cv-border)` and background tokens through the token system. The tab active-indicator pattern (3px bottom border in `var(--cv-accent)`, `styles.css:760`) matches the review-subtab pattern (`styles.css:824`). The modal base class provides 12px border-radius and white background (`styles.css:1096`).

However, modals mix two pattern families. Named modals use the class system cleanly while others apply heavy inline size overrides: Sessions (`max-width: 980px; width: 95%`), Master CV (`max-width: 1280px; width: 98%; max-height: 92vh`), LLM Wizard (`max-width: 1020px; width: 95%`), Settings (`max-width: 760px; width: 94%`) — all at `index.html:254, 276, 423, 583`. No named modal-size modifier classes (`.modal--wide`, `.modal--narrow`) exist, forcing per-instance inline overrides. This was identified in prior cycles and remains unresolved.

**US-G2.4 — Familiar, standard interaction patterns**
✅ Pass

Tab navigation follows the standard tablist/tab pattern with `role="tab"`, `aria-selected`, and keyboard focus management. Modal open/close follows the overlay pattern with focus trap and focus restoration. The rewrite card Accept/Reject/Edit trio follows a clear green/red/blue convention. The LLM Configuration Wizard uses a 4-step progress bar with connector lines (`styles.css:1110–1178`). The reduced-motion media query at `styles.css:1836–1845` and high-contrast query at `styles.css:1847–1854` accommodate accessibility needs.

---

### US-G3: Preview and Output Presentation Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| US-G3.1 Layout-preview area frames content clearly | ✅ Pass | `styles.css:1562–1565` |
| US-G3.2 Supporting controls don't compete with preview | ⚠️ Partial | `styles.css:1571, 1681–1682` |
| US-G3.3 Final file-review surfaces clean | ✅ Pass | `styles.css:1467–1477` |
| US-G3.4 Generated materials reinforce professional credibility | ⚠️ Partial | `templates/cv-template.html:22–34, 210–227` |

**US-G3.1 — Layout-preview area frames content clearly**
✅ Pass

The `layout-instruction-panel` uses a two-pane flex layout: `layout-preview-pane` (flex: 1 1 auto) and `layout-input-pane` (fixed 320px sidebar) (`styles.css:1562–1571`). The `preview-iframe-container` has `border: 1px solid var(--cv-border)`, `border-radius: 8px`, `background: var(--cv-bg-light)`, and `overflow: auto` (`styles.css:1565`). At ≤1100px the layout stacks to vertical with `min-height: 60vh` for the preview pane (`styles.css:1681–1682`).

**US-G3.2 — Supporting controls do not visually compete with the preview**
⚠️ Partial

At full width (>1100px), the 320px sidebar is compact and does not crowd the preview. However, layout-settings controls rendered from JS are entirely inline-styled and dense. After the stack-to-column breakpoint fires at ≤1100px, the combined sidebar content creates a long scroll that can push the preview iframe partially off-screen. The freshness-status card uses class-governed styling (`styles.css:1633–1642`) consistently, but individual settings-row controls use inline styles in JS.

**US-G3.3 — Final file-review surfaces present outputs and actions cleanly**
✅ Pass (with caveat)

The download section uses `.download-item` cards: flex layout with 20px padding, 24px icons, `.download-name` in 600 weight, `.download-description` in `var(--cv-text-secondary)` at 14px, and a `.btn-download` green button (`styles.css:1467–1477`). Caveat: the download tab's dynamic HTML content is generated from JS using inline styles rather than the CSS class system — this is an architectural concern rather than a visual defect.

**US-G3.4 — Generated materials reinforce credible professional brand**
⚠️ Partial

Verified against `templates/cv-template.html`.

**Strengths:**
- Inter (body/UI text) and Merriweather (name heading) are loaded via Google Fonts CDN (`cv-template.html:22`), providing a designed, typographically considered pairing
- The name uses Merriweather at 2.2rem/700 weight (`cv-template.html:210–218`), providing commanding presence at the top of the CV
- The `applicant_tagline` / `job-title` uses Inter at 1.1rem, uppercase, letter-spacing 1px, `var(--accent-color)` blue — restrained and professional (`cv-template.html:220–227`)
- A configurable `base_font_size` via layout settings allows users to scale the entire CV proportionally — this is a well-designed scaling system (`cv-template.html:39`)
- Print optimization includes `break-after: avoid-page` on section titles + first content block pairs (`cv-template.html:250–256`)
- The sidebar/main two-column layout is well-proportioned: 32% sidebar, 68% main (`cv-template.html:87`)

**Weaknesses:**
- The `summary-text` uses `text-align: justify` (`cv-template.html:267–268`), which can produce uneven word spacing for longer lines, especially at smaller base font sizes
- The color palette is entirely monochromatic blue: `--primary-color: #2c3e50`, `--secondary-color: #34495e`, `--accent-color: #2980b9` (`cv-template.html:25–27`). No accent contrast color distinguishes the CV visually from a generic business document
- There is still no single-column layout option for academic/text-heavy CVs
- The sidebar background (`#eef2f5`) is very light — nearly imperceptible from white — providing weak visual separation of the two-column structure in printed grayscale
- Hard-coded hex literals remain in the CV template for some decorative elements (publication section: `#ccc`, `#aaa`, `#94a3b8` at `cv-template.html:453, 462, 491`) outside the `:root` token block

---

## Terminology Clarity Assessment

| Term | Clarity | Assessment |
|------|---------|------------|
| "Harvest" (step + tab) | ⚠️ Ambiguous | Creative metaphor, non-standard; onboarding modal provides definition |
| "ATS" | ✅ Clear | Industry-standard; tooltip expansion provided |
| "Rewrites" | ✅ Clear | Self-explanatory; "Review Rewrites" action is accurate |
| "Layout Review" | ✅ Clear | Precise and unambiguous |
| "File Review" | ⚠️ Passive | Could be "Download Files" — slightly passive framing |
| "Screening" | ✅ Clear | Context-appropriate |
| "Master CV" | ✅ Clear | Industry-standard term; consistently applied |
| "Goals" tab | ⚠️ Vague | Brief; no visual clue of what "goals" means in this context |
| "LLM Configuration Wizard" | ⚠️ Developer-centric | Modal title uses "LLM" (acronym); header button says "LLM: [model name]"; onboarding says "⚙ LLM button" — three slightly different labels for the same entry point |
| "Customise" (step) vs. "Recommend Customizations" (button) | ⚠️ Inconsistent | "Customise" (British) on step, "Customizations" (American) on action button — mixed locale |
| "Experience Bullets" (tab) vs. "Experiences" (tab) | ⚠️ Confusing | Two separate tabs for the same work history concept — unclear hierarchy to new users |
| "Generated Files" (tab) vs. "File Review" (step/tab) | ⚠️ Redundant | Two different tabs name the same content area differently |

**Key terminology concerns:**
1. **Locale inconsistency**: Step bar says "Customise" (`index.html:128`); action button says "Recommend Customizations" (`index.html:191`). Mixed British/American spelling within the same workflow.
2. **LLM acronym**: User-facing header button and modal title both expose "LLM" — users unfamiliar with the term may not know this means "AI model." "AI Model" or "Provider" would be more accessible.
3. **Dual tab names for work history**: "Experiences" and "Experience Bullets" are separate tabs (`index.html:212–213`), and "Experiences" vs "Experience Bullets" is not self-explanatory.
4. **"Generated Files" vs. "File Review"**: The tab bar has both `tab-final_generate` ("Generated Files") and `tab-download` ("File Review") (`index.html:225–226`). These appear to cover the same territory; the distinction (pre-final vs. final) is not communicated by the label alone.

---

## GAP-133 Assessment: CSS Design Token Adequacy

**Status (2026-07-06):** The `styles.css` token layer is **complete for colors**. The `:root {}` block has **95 CSS custom properties** (`styles.css:18–126`) covering the full semantic color palette: error/warn/info/success state families, gray and slate scales, amber/orange/sky/emerald/violet families, high-contrast variants, log background, stale/dirty badge families, spinner, and session-dot colors.

**NEW FINDING:** `var(--cv-card-bg)` is referenced at `styles.css:1600` but is **not defined** in `:root`. This is a missing token causing silent fallback to `transparent`.

**GAP — No typography or spacing tokens:** The design system is color-only. Font sizes, line heights, spacing scale, border radii, and box-shadow values are all hard-coded per-component (e.g., `.position-title` at 24px, `.conversation-header h2` at 18px, `.review-section h2` at 24px, `.document-content h1` at 28px — each individually declared). A spacing/typography token layer (`--cv-font-sm`, `--cv-font-base`, `--cv-font-lg`, `--cv-space-*`) would make global typography adjustments trivial.

---

## Additional Design Gaps (Source-Verified)

**GAP-DESIGN-01: Icon language is emoji-dominant; Font Awesome is underused**
STATUS: OPEN — unchanged
Font Awesome 6 Free is loaded (`index.html:23`) but the only FA usage is in session table action buttons. The workflow bar, tab bar, header buttons, and file-review cards all use Unicode emoji. Emoji render at inconsistent sizes, misalign vertically, and carry different visual weight across platforms and OS emoji sets.

**GAP-DESIGN-02: Inline style proliferation in modals and JS templates**
STATUS: OPEN — unchanged
Four of six modal close buttons use raw inline styles instead of `.modal-close-btn`. No named modal-size modifier classes exist. The download tab and layout-settings sidebar generate entirely inline-styled HTML from JS. The position-bar action buttons use hardcoded color literals in inline styles.

**GAP-DESIGN-03: CSS design tokens — styles.css COMPLETE; index.html inline styles deferred**
STATUS: PARTIAL — `styles.css` COMPLETE (95 tokens); ~227 inline `style=""` in `index.html` deferred pending GAP-01 merge
**NEW SUBTASK:** `var(--cv-card-bg)` undefined at `styles.css:1600` — should be added to `:root`.

**GAP-DESIGN-04: Duplicate `@keyframes spin` — RESOLVED**
STATUS: RESOLVED — single `@keyframes spin` at `styles.css:1055`.

**GAP-DESIGN-05: Main two-panel layout has no responsive breakpoint**
STATUS: OPEN — unchanged
`.main-container` is `display: flex` with `.interaction-area` at 40% (`styles.css:452–463`) and `.viewer-area` at 60% (`styles.css:490`). No `@media` rule collapses these panels at narrow viewports. At <900px the 40% chat panel becomes too narrow for usable text input.

**GAP-DESIGN-06: CV font choice — RESOLVED**
STATUS: RESOLVED — Inter + Merriweather loaded via Google Fonts (`cv-template.html:22`).

**GAP-DESIGN-07: CV summary text-align justify — OPEN**
STATUS: OPEN — `text-align: justify` on `.summary-text` at `cv-template.html:267` can produce poor word spacing at narrower base font sizes.

**GAP-DESIGN-08 (NEW): Missing undefined CSS variable `--cv-card-bg`**
STATUS: NEW — `var(--cv-card-bg)` at `styles.css:1600` is not in `:root`. Position-style picker buttons render with transparent background instead of intended card surface. Trivial fix: add `--cv-card-bg: var(--cv-white);` or `--cv-card-bg: var(--cv-bg-light);` to `:root`.

**GAP-DESIGN-09 (NEW): No typographic or spacing scale tokens**
STATUS: NEW — Design system is color-only. No `--cv-font-*` or `--cv-space-*` tokens exist. Typography changes require hunting individual component declarations scattered across 1854 lines.

**GAP-DESIGN-10 (NEW): Locale inconsistency in workflow labels**
STATUS: NEW — "Customise" (British) at `index.html:128` vs. "Recommend Customizations" (American) at `index.html:191`. Should be standardized to one locale.

**GAP-DESIGN-11 (NEW): "LLM" acronym exposed to end-users**
STATUS: NEW — Header button, modal title, and onboarding all use "LLM" as user-facing terminology. Consider replacing with "AI Model" or "Provider" in user-facing text.

---

## Scorecard

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
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

Score unchanged from cycle 67. GAP-133 styles.css is fully resolved (95 color tokens, zero raw hex literals in CSS rules). New findings this cycle: undefined `--cv-card-bg` variable, missing typography/spacing token layer, locale inconsistency in labels, and LLM acronym exposure to end-users.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-template.html

## Key Evidence References

| Finding | File | Line(s) |
|---------|------|---------|
| CSS design token block (:root) — 95 properties | `web/styles.css` | 18–126 |
| **Undefined `--cv-card-bg` variable** | `web/styles.css` | 1600 |
| Typography scale (document-content h1/h2/h3/body) | `web/styles.css` | 833–838 |
| `.action-btn` / `.action-btn.primary` / `.action-btn.secondary` | `web/styles.css` | 705–712 |
| Position-bar inline-style buttons (hardcoded hex) | `web/index.html` | 106–110 |
| Sessions modal "New Session" inline green style | `web/index.html` | 264 |
| Close button class used correctly | `web/index.html` | 279, 426 |
| Close button inline-styled (un-classed) | `web/index.html` | 257, 586, 703, 719 |
| Status color semantic system (steps) | `web/styles.css` | 265–271 |
| Status color semantic system (layout chip) | `web/styles.css` | 233–235 |
| Status color semantic system (ATS badge) | `web/styles.css` | 216–218 |
| Modal base class | `web/styles.css` | 1095–1099 |
| Modal inline size overrides | `web/index.html` | 254, 276, 423, 583 |
| Layout preview pane CSS | `web/styles.css` | 1562–1571 |
| Layout responsive stack breakpoint | `web/styles.css` | 1681–1682 |
| Download item card styling | `web/styles.css` | 1467–1477 |
| CV template font loading (Inter + Merriweather) | `templates/cv-template.html` | 22 |
| CV template :root color tokens | `templates/cv-template.html` | 25–27 |
| CV name heading (Merriweather 2.2rem) | `templates/cv-template.html` | 210–218 |
| CV tagline / job-title styling | `templates/cv-template.html` | 220–227 |
| CV summary text-align justify | `templates/cv-template.html` | 267 |
| Single @keyframes spin | `web/styles.css` | 1055 |
| Locale inconsistency: "Customise" vs. "Customizations" | `web/index.html` | 128, 191 |
| "Experience Bullets" vs "Experiences" dual tabs | `web/index.html` | 212–213 |
| "Generated Files" vs "File Review" dual naming | `web/index.html` | 225–226 |
| Main panel widths (no responsive breakpoint) | `web/styles.css` | 449, 452–463, 490 |

**Evidence standard:** Every conclusion supported by file:line evidence from source-read of actual files.
