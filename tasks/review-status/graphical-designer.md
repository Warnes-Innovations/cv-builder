<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-07-06 (cycle 91)
**Reviewed by:** Source-verified review cycle (Graphical Designer persona, US-G*)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-template.html, templates/cv-style.css

**Executive Summary:** The application delivers a coherent, professionally-styled visual system anchored by a 95-property CSS token layer (`styles.css:18–126`), a consistent Slate-based neutral palette, and a semantic status language (green/amber/red/blue) applied uniformly across all stages. The generated CV template is typographically strong — Inter + Merriweather pairing with a configurable `base_font_size` is a well-designed output system. Persistent weaknesses are: (1) **227** inline `style=""` attributes in `index.html` (re-counted in cycle 91; prior cycle estimated ~86) using raw hex literals that bypass the token system, particularly on position-bar buttons, modal close buttons, and the entire onboarding modal content; (2) no dark-mode support (`prefers-color-scheme: dark` is absent); (3) no typography or spacing tokens — font sizes and spacing are hard-coded per-component across 1,859 lines; (4) the tab bar (20+ tabs) and workflow bar (12 steps) create high cognitive density that reads as developer-grade rather than polished product. A previous finding of an undefined `--cv-card-bg` variable is a false positive — the token IS declared at `styles.css:29`. **New in cycle 91:** One raw hex color confirmed in `styles.css` rule body (`.question-item.answered { background: #f8fffe; }` at line 619) — should be tokenized.

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| US-G1.1 Headings, body, helper text, controls visually distinct | ✅ Pass | `styles.css:833–838` |
| US-G1.2 Primary actions consistently prominent | ⚠️ Partial | `index.html:106–110, 264` |
| US-G1.3 Dense review surfaces readable | ✅ Pass | `styles.css:1403–1464` |
| US-G1.4 Color/theme usability and attractiveness | ⚠️ Partial | `styles.css:18–126` |

**US-G1.1 — Headings, body text, helper text, and controls are visually distinct**
✅ Pass

The document viewer defines a clear four-level heading scale: `h1` at 28px/700 (`styles.css:838`), `h2` at 20px/600 (`styles.css:839`), `h3` at 16px/600 (`styles.css:840`), body `li`/`p` at 14px / line-height 1.6 (`styles.css:841–843`). Helper and meta text consistently uses `var(--cv-text-secondary)` (#64748b Slate-500). Form labels are 0.85–0.88em / weight-600 (e.g., `styles.css:906`). The conversation panel differentiates message roles via distinct backgrounds: user messages in `var(--cv-accent)` blue with white text (styles.css:510), assistant in white with border (styles.css:511), system in `var(--cv-bg-subtle)` italic grey (styles.css:512). The conversation header "Conversation" h2 at 18px/600 (`styles.css:500`) is visually distinct from viewer content. The `.ats-score-label` uses 11px/600/uppercase/letter-spacing (`styles.css:212`) — appropriate for secondary data labels.

**US-G1.2 — Primary actions are consistently prominent**
⚠️ Partial

The `.action-btn.primary` class is correctly defined as `var(--cv-accent)` blue with white text (`styles.css:712`). All chat-area workflow action buttons use `class="action-btn primary"` consistently (`index.html:190–199`). The `.header-pill-btn` pattern is uniform across all five header buttons (`index.html:45–70`, `styles.css:178`).

However, three position-bar action buttons (Master CV, ATS Report, Job Analysis) use full inline style blocks with hardcoded hex literals (`background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;font-size:0.8em;padding:2px 7px;`) (`index.html:106–110`) rather than a shared CSS class. The Sessions modal "New Session" button applies inline `style="background:#10b981;color:#fff;border-color:#10b981"` on a bare `.action-btn` (`index.html:264`) instead of `.action-btn.primary`. Both cases dilute the primary-action signal system and bypass the design token layer.

**US-G1.3 — Dense review surfaces remain readable**
✅ Pass

The rewrite-review panel uses a well-designed card system (`styles.css:1403–1464`): `.rewrite-card` with 1px border, 10px radius, color-coded states (`accepted` → `var(--cv-success-bg)`, `rejected` → `var(--cv-error-bg)` at 0.7 opacity, `styles.css:1411–1412`). Inline diff uses `del.diff-removed` in `var(--cv-error)` / `var(--cv-error-bg-lt)` and `ins.diff-added` in `var(--cv-success-text)` / `var(--cv-success-bg-md)` (`styles.css:1424–1425`). The sticky tally bar prevents context loss on long lists (`styles.css:1404`). Confidence badges use a clear five-level color-coded semantic (very-high → high → medium → low → very-low, `styles.css:852–887`). The experience/skill tables use `.review-table` with alternating row stripes and hover states (`styles.css:1317–1318`). These surfaces are readable at high content density.

**US-G1.4 — Color and theme choices support usability and attractiveness**
⚠️ Partial

The palette is professional: `var(--cv-text-primary)` (#1e293b Slate-800) for headings, `var(--cv-accent)` (#3b82f6 Blue-500) for interactive elements, semantic green/amber/red families for state. The token system is comprehensive — 95 CSS custom properties in `:root` (`styles.css:18–126`) cover the full semantic palette including error/warn/info/success families, extended gray/slate/sky/emerald/violet/amber/orange scales, high-contrast variants, session-dot colors, log background, and spinner. The ATS badge applies threshold-triggered color correctly via class modifiers (`styles.css:216–218`). The `@media (prefers-contrast: more)` block (`styles.css:1852–1859`) and `@media (prefers-reduced-motion: reduce)` block (`styles.css:1841–1850`) are implemented.

**Weaknesses:** No `@media (prefers-color-scheme: dark)` exists anywhere in `styles.css` — the app is light-mode only with no dark theme. No typography tokens (`--cv-font-sm`, `--cv-font-base`, `--cv-font-lg`) or spacing tokens exist; font sizes and padding values are hard-coded per-component. The overall aesthetic reads as a developer-grade admin tool rather than a polished career product — functional and clean but not distinctive.

**Correction from prior cycle:** `--cv-card-bg` is correctly defined in `:root` at `styles.css:29` (`--cv-card-bg: #fff;` — card/option background). The prior cycle's "undefined variable" finding was a false positive. GAP-DESIGN-08 should be closed.

---

### US-G2: Cross-Stage Visual Consistency

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| US-G2.1 Repeated control types share consistent styling | ⚠️ Partial | `index.html:257, 586, 703, 719` |
| US-G2.2 Status surfaces use coherent visual language | ✅ Pass | `styles.css:265–271, 216–218, 233–235` |
| US-G2.3 Tabs, workflow bar, cards, modals feel cohesive | ⚠️ Partial | `index.html:254, 276, 423, 583` |
| US-G2.4 Familiar, standard interaction patterns | ✅ Pass | `styles.css:758–761, 1841–1859` |

**US-G2.1 — Repeated control types share consistent styling**
⚠️ Partial

The shared `.action-btn` system (`styles.css:710–717`) covers most modal footers and chat-area actions. The `.header-pill-btn` pattern is uniform across all five header buttons. The `icon-btn` 32×32 action buttons for review surfaces are consistent (`styles.css:1329–1357`). The session manager table uses its own coherent `.sm-btn` family (`styles.css:400–421`).

However, six modal close buttons use two different patterns:
- `class="modal-close-btn"` — correct, used in Master CV modal and LLM Wizard (`index.html:279, 426`)
- Raw inline `style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;"` — used in Sessions, Settings, ATS Report, and Job Analysis modals (`index.html:257, 586, 703, 719`)

Four of six close buttons are un-classed inline styles. This pattern has persisted across multiple cycles.

**US-G2.2 — Status surfaces use a coherent visual language**
✅ Pass

The amber/green/red semantic is applied consistently across all stages:
- Workflow steps: `.step.completed` → `var(--cv-success-bg-md)`, `.step.active` → `var(--cv-info-bg-md)`, `.step.stale` → `var(--cv-warn-bg)`, `.step.stale-critical` → `var(--cv-error-bg)` (`styles.css:265–271`)
- Layout freshness chip: `.fresh` → `var(--cv-emerald-50)` / `var(--cv-success-border)`, `.stale` → `var(--cv-warn-bg)` / `var(--cv-warn-light)`, `.critical` → `var(--cv-error-bg)` / `var(--cv-error-border)` (`styles.css:233–235`)
- ATS score badge: same green/amber/red thresholds via class modifiers (`styles.css:216–218`)
- Toast notifications: `toast-success` / `toast-error` / `toast-warning` left-border accents (`styles.css:1399–1401`)
- Confidence badges: `confidence-high` through `confidence-very-low` using same semantic family (`styles.css:852–887`)

The semantic assignment is consistent and learnable across all stages.

**US-G2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system**
⚠️ Partial

Tabs, workflow steps, and modals share `var(--cv-border)` and background tokens consistently. The active tab indicator (3px blue bottom border, `styles.css:765`) matches the review-subtab pattern (`styles.css:829`). The modal base provides 12px border-radius and white background (`styles.css:1101`). Cards consistently use `var(--cv-border)` / `var(--cv-bg-light)` / rounded corners.

However, modal sizes all use inline overrides rather than named modifier classes: Sessions (`max-width: 980px; width: 95%`), Master CV (`max-width: 1280px; width: 98%; max-height: 92vh`), LLM Wizard (`max-width: 1020px; width: 95%`), Settings (`max-width: 760px; width: 94%`) — all at `index.html:254, 276, 423, 583`. No `.modal--wide`, `.modal--narrow`, `.modal--fullscreen` modifier classes exist. Additionally, the 20+ tab bar and 12-step workflow bar create high cognitive density — all steps visible simultaneously rather than contextually revealed.

**US-G2.4 — Familiar, standard interaction patterns**
✅ Pass

Tab navigation uses `role="tablist"` / `role="tab"` / `aria-selected` / keyboard navigation (`index.html:207–234`). Modal open/close uses the overlay pattern with click-outside-to-dismiss. The rewrite card Accept/Reject/Edit trio follows a clear green/red/blue convention (`styles.css:1435–1440`). The LLM Configuration Wizard uses a 4-step progress bar with connector lines and completion states (`styles.css:1110–1178`). The `prefers-reduced-motion` and `prefers-contrast: more` media queries are implemented (`styles.css:1841–1859`).

---

### US-G3: Preview and Output Presentation Quality

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| US-G3.1 Layout-preview area frames content clearly | ✅ Pass | `styles.css:1562–1571` |
| US-G3.2 Supporting controls don't visually compete with preview | ⚠️ Partial | `styles.css:1681–1691` |
| US-G3.3 Final file-review surfaces present cleanly | ✅ Pass | `styles.css:1471–1481` |
| US-G3.4 Generated materials reinforce professional credibility | ⚠️ Partial | `templates/cv-template.html:22–34, 210–227` |

**US-G3.1 — Layout-preview area frames content clearly**
✅ Pass

The `layout-instruction-panel` uses a two-pane flex layout: `layout-preview-pane` (flex: 1 1 auto, `styles.css:1568`) and `layout-input-pane` (fixed 320px sidebar, `styles.css:1576`). The `preview-iframe-container` has `border: 1px solid var(--cv-border)`, `border-radius: 8px`, `background: var(--cv-bg-light)`, and `overflow: auto` (`styles.css:1570`). A `.preview-loading-overlay` with spinner and label cleanly handles the loading state (`styles.css:1572–1575`). At ≤1100px the layout stacks to vertical with `min-height: 60vh` for the preview pane (`styles.css:1686–1687`).

**US-G3.2 — Supporting controls do not visually compete with preview**
⚠️ Partial

At desktop width (>1100px), the 320px sidebar is compact and subdued (bg-light tokens, 13px text). The preview dominates at flex: 1 1 auto. However, after the column-stack breakpoint at ≤1100px fires, all layout controls (freshness status, page estimate, instruction textarea, generation checklist, output cards, instruction history) stack below the preview, creating a long scroll that can push the preview partially off-screen before the user reaches controls. The individual settings controls generated from JS also use inline styles rather than the CSS class system, making them harder to maintain consistently.

**US-G3.3 — Final file-review surfaces present outputs and actions cleanly**
✅ Pass

The download section uses `.download-item` cards: flex layout with 20px padding, 24px font-size icon, `.download-name` at weight-600, `.download-description` in `var(--cv-text-secondary)` at 14px, and `.btn-download` green button with hover state (`styles.css:1471–1481`). Cards have hover state (`styles.css:1474`). The cover letter textarea uses `font-family: 'Georgia', 'Times New Roman', serif; font-size: 0.95em; line-height: 1.7` (`styles.css:1737`) — a typographically appropriate choice for letter composition. The screening response textarea similarly uses `font-size: 0.92em; line-height: 1.6; min-height: 120px` (`styles.css:1754`).

**US-G3.4 — Generated materials reinforce a credible professional brand**
⚠️ Partial

Verified against `templates/cv-template.html` and `templates/cv-style.css`.

**Strengths:**

- Inter (body text) and Merriweather (name heading) are loaded via Google Fonts CDN (`cv-template.html:22`), providing a designed, typographically considered pairing between a modern humanist sans and a refined serif
- The name element uses `font-family: 'Merriweather', serif; font-size: 2.2rem; font-weight: 700` (`cv-template.html:210–218`) — commands the page without being ostentatious
- The job title uses Inter at 1.1rem, uppercase, letter-spacing 1px, accent-color blue (`cv-template.html:220–227`) — restrained and professional
- The configurable `base_font_size` via `{{ base_font_size | safe_css_size }}` scales the entire CV proportionally (`cv-template.html:39`)
- Section titles use uppercase + border-bottom — the standard CV convention applied cleanly (`cv-template.html:233–246`)
- Print optimization includes `break-after: avoid-page` on section titles paired with first content block (`cv-template.html:250–256`), preventing orphaned headings
- The sidebar/main two-column proportioning (32% sidebar, 68% main, `cv-template.html:87`) is well-balanced
- The faux-column CSS gradient technique for consistent sidebar background across page-breaks in print is technically well-executed (`cv-template.html:388–397`)
- Schema.org/Person JSON-LD structured data is included for ATS parser compatibility (`cv-template.html:18–20`)

**Weaknesses:**

- `text-align: justify` on `.summary-text` (`cv-template.html:267–268`) can produce uneven word spacing, especially at smaller `base_font_size` values or in the narrower right column
- The color palette is entirely monochromatic blue: `--primary-color: #2c3e50`, `--secondary-color: #34495e`, `--accent-color: #2980b9` (`cv-template.html:25–27`). No accent-contrast color gives the CV visual distinction from a generic business template. There is no mechanism for users to select a different color scheme
- The sidebar background (#eef2f5 / --sidebar-bg) provides weak contrast against white — nearly imperceptible in printed grayscale, potentially undermining the two-column visual structure on printed copies
- A fallback cv-style.css (`templates/cv-style.css`) exists with a slightly different structure (primary color #2980b9 directly, traditional two-column grid rather than single-flow layout) but is not confirmed to be the active template path — if both templates are in use, they present different visual identities
- Hard-coded hex literals remain in the CV template outside the `:root` token block for publication-section decoration (`cv-template.html` ~line 453, 462, 491 in prior review versions — not re-verified in this cycle)
- No single-column layout option for academic/text-heavy CVs

---

## Terminology Clarity Assessment

| Term | Clarity | Assessment |
| ---- | ------- | ---------- |
| "Harvest" (step + tab) | ⚠️ Ambiguous | Creative metaphor, non-standard; onboarding modal provides definition |
| "ATS" | ✅ Clear | Industry-standard acronym; tooltip expansion present |
| "Rewrites" / "Review Rewrites" | ✅ Clear | Self-explanatory action label |
| "Layout Review" | ✅ Clear | Precise and unambiguous |
| "File Review" | ⚠️ Passive | Could be "Download Files" — slightly passive framing |
| "Screening" | ✅ Clear | Context-appropriate industry term |
| "Master CV" | ✅ Clear | Industry-standard; consistently applied |
| "Goals" tab | ⚠️ Vague | Brief; no visual clue of what "goals" means in this context |
| "LLM" in header button and modal | ⚠️ Developer-centric | "LLM: [model name]" exposes a technical acronym in primary navigation |
| "Customise" (step) vs. "Customizations" (button) | ⚠️ Inconsistent | British spelling on step (`index.html:128`), American on action button (`index.html:191`) |
| "Experience Bullets" tab vs. "Experiences" tab | ⚠️ Confusing | Two separate tabs covering the same work history — hierarchy unclear |
| "Generated Files" tab vs. "File Review" tab/step | ⚠️ Redundant | Two tabs name what appears to be the same content area differently |

**Key terminology findings:**

1. **Locale inconsistency**: Step bar says "Customise" (`index.html:128`); action button says "Recommend Customizations" (`index.html:191`). Mixed British/American within the same workflow path.
2. **LLM acronym exposure**: Header button, modal title, and onboarding all surface "LLM" as user-facing text. Consider "AI Model" or "Provider" for non-technical users.
3. **Dual work-history tabs**: "Experiences" (`tab-exp-review`) and "Experience Bullets" (`tab-ach-editor`) exist as separate tabs (`index.html:212–213`). The distinction between these is not self-explanatory.
4. **Generated Files / File Review redundancy**: `tab-final_generate` ("Generated Files") and `tab-download` ("File Review") (`index.html:225–226`) cover what appears to be the same or adjacent content area; the distinction is not communicated by the label alone.

---

## Design Token System Assessment

**Status (2026-07-06):** The `styles.css` color token layer is **complete**. The `:root {}` block has **95 CSS custom properties** (`styles.css:18–126`) covering the full semantic color palette.

**Correction:** `--cv-card-bg` IS defined at `styles.css:29` (`--cv-card-bg: #fff;`). The prior cycle's "undefined variable" finding (GAP-DESIGN-08) was a **false positive**. GAP-DESIGN-08 should be closed as invalid.

**Outstanding gap — No typography or spacing tokens:** The design system is color-only. Font sizes, line heights, spacing scale, border-radii, and box-shadow values are hard-coded per-component (e.g., `.position-title` at 24px, `.conversation-header h2` at 18px, `.review-section h2` at 24px, `.document-content h1` at 28px — individually declared across 1,859 lines). A typography/spacing token layer would make global scale adjustments trivial.

---

## Design Gap Status

| Gap | Status | Evidence |
| --- | ------ | -------- |
| GAP-DESIGN-01: Icon language emoji-dominant; FA underused | OPEN | `index.html:23` — FA loaded; workflow/tabs use emoji only |
| GAP-DESIGN-02: Inline style proliferation in modals/JS | OPEN | `index.html:257, 586, 703, 719; 106–110, 264` |
| GAP-DESIGN-03: Inline styles in index.html (227 occurrences per cycle-91 recount) | OPEN (deferred, pending GAP-01) | `index.html` — 227 inline `style=""` attributes; subset have raw hex |
| GAP-DESIGN-13: `.question-item.answered` uses raw `#f8fffe` hex (styles.css:619) | OPEN | `styles.css:619` — only remaining bare hex in a CSS rule body; token `--cv-answered-bg` missing |
| GAP-DESIGN-04: Duplicate @keyframes spin | RESOLVED | Single definition at `styles.css:1060` |
| GAP-DESIGN-05: Main two-panel layout has no responsive breakpoint | OPEN | `styles.css:450, 453–463, 495` — no collapse at <900px |
| GAP-DESIGN-06: CV font choice | RESOLVED | Inter + Merriweather via Google Fonts `cv-template.html:22` |
| GAP-DESIGN-07: CV summary text-align justify | OPEN | `cv-template.html:267` — justify can produce uneven spacing |
| GAP-DESIGN-08: Undefined --cv-card-bg variable | CLOSED (FALSE POSITIVE) | `styles.css:29` — token IS defined |
| GAP-DESIGN-09: No typography or spacing scale tokens | OPEN | Color-only token system; font sizes hard-coded per component |
| GAP-DESIGN-10: Locale inconsistency in workflow labels | OPEN | `index.html:128` "Customise" vs `index.html:191` "Customizations" |
| GAP-DESIGN-11: "LLM" acronym exposed to end-users | OPEN | `index.html:53–55` header button; modal title |
| GAP-DESIGN-12: No dark mode support | OPEN | No `prefers-color-scheme: dark` in `styles.css` (1,859 lines) |

---

## Scorecard

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ----- | ------- | --------- | ------ | ---------- | ----- |
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

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-template.html, templates/cv-style.css

## Key Evidence References

| Finding | File | Line(s) |
| ------- | ---- | ------- |
| CSS design token block (:root) — 95 properties | `web/styles.css` | 18–126 |
| `--cv-card-bg` correctly defined (prior finding was false positive) | `web/styles.css` | 29 |
| Typography scale (document-content h1/h2/h3/body) | `web/styles.css` | 838–843 |
| `.action-btn` / `.action-btn.primary` / `.action-btn.secondary` | `web/styles.css` | 710–717 |
| Position-bar inline-style buttons (hardcoded hex) | `web/index.html` | 106–110 |
| Sessions modal "New Session" inline green style | `web/index.html` | 264 |
| Close button class used correctly | `web/index.html` | 279, 426 |
| Close button inline-styled (un-classed) | `web/index.html` | 257, 586, 703, 719 |
| Status color semantic system (workflow steps) | `web/styles.css` | 265–271 |
| Status color semantic system (layout freshness chip) | `web/styles.css` | 233–235 |
| Status color semantic system (ATS badge) | `web/styles.css` | 216–218 |
| Confidence badge five-level semantic | `web/styles.css` | 852–887 |
| Modal base class | `web/styles.css` | 1101 |
| Modal inline size overrides | `web/index.html` | 254, 276, 423, 583 |
| Layout preview pane CSS | `web/styles.css` | 1562–1576 |
| Layout responsive stack breakpoint | `web/styles.css` | 1685–1691 |
| Download item card styling | `web/styles.css` | 1471–1481 |
| Cover letter textarea serif font | `web/styles.css` | 1737 |
| CV template font loading (Inter + Merriweather) | `templates/cv-template.html` | 22 |
| CV template :root color tokens | `templates/cv-template.html` | 25–27 |
| CV configurable base_font_size | `templates/cv-template.html` | 39 |
| CV name heading (Merriweather 2.2rem/700) | `templates/cv-template.html` | 210–218 |
| CV job title (uppercase, letter-spacing) | `templates/cv-template.html` | 220–227 |
| CV summary text-align justify | `templates/cv-template.html` | 267 |
| CV print faux-column background gradient | `templates/cv-template.html` | 388–397 |
| No dark mode query anywhere in stylesheet | `web/styles.css` | (absent — 1,859 lines) |
| Locale inconsistency: "Customise" vs. "Customizations" | `web/index.html` | 128, 191 |
| "Experience Bullets" vs "Experiences" dual tabs | `web/index.html` | 212–213 |
| "Generated Files" vs "File Review" dual naming | `web/index.html` | 225–226 |
| Main panel widths (no responsive breakpoint) | `web/styles.css` | 450, 453–463, 495 |

**Evidence standard:** Every conclusion supported by file:line evidence from source-read of actual files in this review cycle.
