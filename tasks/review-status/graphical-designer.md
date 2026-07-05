<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical Designer Review Status

**Last Updated:** 2026-07-04 (stale findings corrected cycle 67)
**Reviewed by:** Source-verified review cycle (Graphical Designer persona, US-G*)
**Sources read:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-style.css, templates/cv-template.html

**Executive Summary (updated 2026-07-04):** The application delivers a coherent, professionally-styled visual system for its primary workflow stages. Typography is well-differentiated, a consistent Slate-based color palette runs throughout, and the semantic status language (green/amber/red) is applied consistently across all surfaces. The `styles.css` token layer reached 95 CSS custom properties in cycle 52 with zero raw hex literals remaining in CSS rules — the GAP-133 styles.css portion is fully resolved. The cv-style.css fallback template uses Inter font and `#2980b9` brand blue, aligned with cv-template.html. The duplicate `@keyframes spin` noted in the original review has been resolved (only one `@keyframes spin` at `styles.css:1051`). Remaining structural weaknesses: (1) pervasive inline-style drift in `index.html` modals and JS-rendered HTML (deferred pending GAP-01); (2) emoji-dominant icon language (Font Awesome is loaded but used only in one place); (3) no print styles in the main app shell; (4) the two-panel layout has no responsive breakpoint for the main shell.

---

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

**US-G1.1 — Headings, body text, helper text, and controls are visually distinct**
✅ Pass

The CSS defines a clear four-level heading scale within the document viewer: `h1` at 28px/700 weight (`styles.css:708`), `h2` at 20px/600 (`styles.css:709`), `h3` at 16px/600 (`styles.css:710`), and body `li`/`p` at 14–15px/1.6 line-height (`styles.css:711–713`). Helper and meta text is consistently rendered using `var(--cv-text-secondary)` (#64748b Slate-500) across multiple selectors. Form labels use 0.85–0.88em weight-600. The conversation panel separates roles via distinct background colors: user messages in `var(--cv-accent)` blue with white text, assistant messages in white with `var(--cv-border)` border, and system messages in `var(--cv-bg-subtle)` italic grey (`styles.css:402–404`). The conversation panel header "Conversation" h2 at 18px/600 is distinct from the document viewer.

**US-G1.2 — Primary actions are consistently prominent**
⚠️ Partial

The `.action-btn.primary` class is correctly blue (`var(--cv-accent)`) with white text (`styles.css:605`). The chat-area workflow buttons all use `class="action-btn primary"` consistently (`index.html:190–199`). However, the three position-bar action buttons (Master CV, ATS Report, Job Analysis) use full inline style blocks (`background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;color:#475569;font-size:0.8em;padding:2px 7px;line-height:1.6`) rather than a shared CSS class (`index.html:104–111`). These are visually secondary (correct) but styling is governed by inline markup instead of the class system. Additionally, within modals the Sessions footer "New Session" button applies inline `style="background:#10b981;color:#fff;border-color:#10b981"` on top of `class="action-btn"` (`index.html:264`) instead of using a modifier class, further diluting the primary action signal.

**US-G1.3 — Dense review surfaces remain readable**
✅ Pass

The rewrite-review panel uses a well-designed card system (`styles.css:1269–1330`): `rewrite-card` with 1px `var(--cv-border)` border, 10px radius, and color-coded state variants (`accepted` → `#f0fdf4` green-tint, `rejected` → `#fef2f2` red-tint at 0.7 opacity). The inline diff rendering uses `del.diff-removed` in `#dc2626` / `#fee2e2` and `ins.diff-added` in `#166534` / `#dcfce7` (`styles.css:1283–1284`). The sticky tally bar prevents losing context on long lists. The experience/skill review tables use `review-table` with alternating row stripes and 8px 12px cell padding. The analysis page uses the `analysis-section` card pattern (white, 1px border, 16–20px padding) with grouped headings. These surfaces maintain readability at density.

**US-G1.4 — Color and theme choices support usability and attractiveness**
⚠️ Partial

The palette is professional: `var(--cv-text-primary)` (#1e293b Slate-800) for headers, `var(--cv-accent)` (#3b82f6 Blue-500) for interactive elements, semantic greens/ambers/reds for state. The ATS badge uses threshold-triggered color (`score-high` → `#16a34a`, `score-medium` → `#d97706`, `score-low` → `#dc2626`), which is well-executed.

The newly added `:root {}` block at `styles.css:18–27` introduces eight CSS custom properties:

- `--cv-border`, `--cv-accent`, `--cv-bg-light`, `--cv-text-secondary`, `--cv-text-primary`, `--cv-bg-subtle`, `--cv-text-muted`, `--cv-accent-hover`

These tokens are actively consumed in many of the most-frequently-used selectors — borders, backgrounds, text colors on headings, modal elements, tabs, review cards, and action buttons. This is a real improvement over the previous state of zero tokens. However, a large number of color literals remain hardcoded in selectors not yet migrated: confidence badges, loading overlays, the LLM busy card, master-profile card gradient, cover-letter textarea, and all JS-generated HTML (download-tab.js, layout-instruction.js). The `@keyframes spin` duplicate and the `@keyframes llm-spin` alias are both resolved — only one `@keyframes spin` definition exists (`styles.css:1051`). This was a stale finding from the original review.

The overall aesthetic remains Tailwind/Slate — functional and clean but not aspirational. The color family reads as a developer-grade admin panel rather than a designed career product.

---

### US-G2: Cross-Stage Visual Consistency

**US-G2.1 — Repeated control types share consistent styling**
⚠️ Partial

The shared `.action-btn` / `.action-btn.primary` / `.action-btn.secondary` system (`styles.css:603–610`) covers most modal footers and the chat-area actions consistently. The `.header-pill-btn` pattern is uniform across all five header buttons (`index.html:45–70`, `styles.css:78–80`). The `icon-btn` 32×32 icon button for rewrite actions is consistent.

However, there are six distinct close-button styling patterns across modals:

- `class="modal-close-btn"` (correct, used in Master CV modal and LLM Wizard: `index.html:279, 427`)
- Raw `style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;"` (used in Sessions, Settings, ATS Report, Job Analysis modals: `index.html:257, 586, 703, 719`)

This means four of six close buttons are un-classed. This was identified in the previous cycle and remains unresolved.

**US-G2.2 — Status surfaces use a coherent visual language**
✅ Pass

The amber/green/red semantic is applied consistently across all status surfaces:

- Workflow steps: `.step.completed` → `#dcfce7` green, `.step.active` → `#dbeafe` blue, `.step.stale` → `#fffbeb` amber, `.step.stale-critical` → `#fef2f2` red (`styles.css:165–171`)
- Layout freshness chip: `.fresh` → `#ecfdf5` / `#86efac`, `.stale` → `#fffbeb` / `#fcd34d`, `.critical` → `#fef2f2` / `#fca5a5` (`styles.css:133–135`)
- ATS score badge: same green/amber/red thresholds (`styles.css:116–118`)
- Toast notifications: `toast-success` → `#10b981`, `toast-error` → `#ef4444`, `toast-warning` → `#f59e0b` (`styles.css:1258–1260`)
- Confidence badges (rewrite cards): `confidence-high` → `#dcfce7`, `confidence-medium` → `#fef3c7`, `confidence-low` → `#fee2e2` (`styles.css:731–757`)

The semantic assignment is consistent and learnable across all stages.

**US-G2.3 — Tabs, workflow bar, cards, and modals feel part of the same design system**
⚠️ Partial

Tabs, workflow steps, and modals now share `var(--cv-border)` and `var(--cv-bg-light)` / white background through the token system. The tab indicator pattern (3px bottom border in `var(--cv-accent)` on active, `styles.css:658`) matches the review-subtab pattern (`styles.css:698`). The modal base class provides 12px border-radius and white background (`styles.css:971`).

However, modals still mix two pattern families — some use the class system cleanly while others apply heavy inline size overrides (Sessions, Master CV, LLM Wizard, Settings modals at `index.html:254, 276, 423, 583`). The absence of named modal-size variants (`.modal--wide`, `.modal--narrow`) forces per-instance inline overrides. This was identified in the previous cycle and remains unresolved.

**US-G2.4 — Familiar, standard interaction patterns**
✅ Pass

Tab navigation follows the standard tablist pattern with `role="tab"`, `aria-selected`, and keyboard navigation. Modal open/close follows the standard overlay pattern with focus trap and focus restoration. Escape-key dismiss is wired on overlay elements. The rewrite card Accept/Reject/Edit button trio follows a clear green/red/blue convention. The LLM Configuration Wizard uses a 4-step progress bar with connector lines that is visually clear (`styles.css:981–1062`). The reduced-motion media query at `styles.css:1670–1678` and the high-contrast media query at `styles.css:1681–1688` accommodate accessibility needs.

---

### US-G3: Preview and Output Presentation Quality

**US-G3.1 — Layout-preview area frames content clearly**
✅ Pass

The `layout-instruction-panel` uses a two-pane flex layout: `layout-preview-pane` (flex: 1 1 auto) and `layout-input-pane` (fixed 320px sidebar, `styles.css:1424–1433`). The `preview-iframe-container` has `border: 1px solid var(--cv-border)`, `border-radius: 8px`, `background: var(--cv-bg-light)`, and `overflow: auto` (`styles.css:1427`). The panel height is `calc(100vh - 240px)` with `min-height: 500px`. At 1100px and below, the layout stacks to vertical with `min-height: 60vh` for the preview pane (`styles.css:1515–1521`).

**US-G3.2 — Supporting controls do not visually compete with the preview**
⚠️ Partial

At full width (>1100px), the 320px sidebar is compact. However, the layout-settings controls are entirely inline-styled and dense. After the stack-to-column breakpoint fires at ≤1100px, the combined sidebar content creates a long scroll that can push the preview iframe off-screen. The freshness-status card uses class-governed styling (`styles.css:1479–1482`) which is consistent, but settings-row controls use inline styles in JS.

**US-G3.3 — Final file-review surfaces present outputs and actions cleanly**
✅ Pass (with caveat)

The download section uses `.download-item` cards: flex layout with 20px padding, download-icon at 24px, `.download-name` in 600 weight, `.download-description` in `var(--cv-text-secondary)` at 14px, and a `.btn-download` green button (`styles.css:1332–1342`). The caveat remains: the download tab's dynamic HTML content uses inline styles in JS rather than the CSS class system.

**US-G3.4 — Generated materials reinforce a credible professional brand**
⚠️ Partial — IMPROVED since previous cycle

Verified against `templates/cv-style.css` and `templates/cv-template.html`.

What has improved:

- `cv-style.css` (the Quarto/fallback template) now uses `font-family: 'Inter', Arial, sans-serif` at line 18, upgrading from the previous Windows-default `"Segoe UI"` stack. This gives the fallback template a designed, intentional font presence.
- `cv-style.css` uses `#2980b9` for brand-blue throughout (header border, h1 name, section heading colors, skill bullets, award accents). This matches the `--accent-color: #2980b9` token in `cv-template.html:27`.
- `cv-template.html` already loads Inter via Google Fonts (`cv-template.html:22`) and defines a `:root {}` token block with `--accent-color: #2980b9` (`cv-template.html:24–34`). The two templates now share the same brand color and typeface family.
- Print optimization in `cv-style.css` includes proper `page-break-inside: avoid` on items and `page-break-after: avoid` on headings (`cv-style.css:226–237`).

What remains weak:

- The cv-style.css header is `text-align: center` (`cv-style.css:36`) while the body uses a left-biased two-column grid (`grid-template-columns: 2.8fr 1.2fr`, `cv-style.css:67`). This center/left compositional inconsistency persists (previously logged as GAP-DESIGN-07).
- `cv-style.css` uses `color: #2c3e50` for body text and `#2980b9` for accent, while `cv-template.html` uses `--primary-color: #2c3e50` and `--accent-color: #2980b9`. The values are harmonized but cv-style.css still uses hardcoded literals rather than consuming the cv-template token names. This is acceptable (they are separate rendering paths) but worth noting.
- `#2c5aa0` appears nowhere — the previous cycle's comment about `#2c5aa0` being monotonous was based on an earlier version. The current `#2980b9` is a clean single-hue professional accent, still monotonous in application but less anaemic.
- There is still no single-column layout option for academic/text-heavy CVs.
- The cover letter textarea in the UI uses `'Georgia', 'Times New Roman', serif` (`styles.css:1567`), which is appropriate for formal correspondence — this differentiation is correct and intentional.

---

## Terminology Clarity Assessment

The application's terminology was evaluated for clarity and industry alignment:

- **"Harvest"** — the final workflow step is labeled "Harvest" (with a 🌾 icon) across the workflow bar, tab bar, and conversation. This metaphor is creative but may be opaque to first-time users who do not read the onboarding modal. The onboarding modal does define it ("save refined bullets, new skills, and summary variants back to your Master CV"), so informed users will understand it. It is not a standard resume-tooling term.
- **"ATS"** — used throughout (ATS Score tab, ATS Report button, ATS badge). "Applicant Tracking System" is a well-known industry term in job-seeking contexts; usage here is appropriate and consistently titled.
- **"Rewrites"** — the step and tab labeled "Rewrites" is clear. The action button says "✏️ Review Rewrites," which accurately describes the activity.
- **"Layout Review"** — used for the iframe preview step. This is precise and unambiguous.
- **"File Review"** — the download step is labeled "File Review" in the workflow bar and tab. This is slightly passive compared to "Download Files" but accurately describes the step's content (review before downloading).
- **"Screening"** — the Screening tab for screening-question responses is clear in the context of job applications.
- **"Master CV"** — consistently used across the tab, modal title, header button, and onboarding modal. The term is industry-standard for a comprehensive source document.
- **"Goals"** — a tab in the viewer area. This is brief but contextually understood as customization goals for the application.
- **"Interview Prep"** and **"Thank You"** — self-explanatory workflow steps at the end of the pipeline.

Overall terminology clarity is adequate to good. "Harvest" is the one term that could confuse first-time users without onboarding context. The onboarding modal's step 3 definition provides mitigation.

---

## GAP-133 Assessment: CSS Design Token Adequacy

**Updated 2026-07-04 (cycle 52/63):** The `styles.css` token layer is now **complete**. The `:root {}` block has grown from the original 8 tokens to **95 CSS custom properties** covering the full semantic palette: error/warn/info/success state families, gray and slate scales, amber/orange/sky/emerald/violet families, high-contrast variants, CSS log background, stale/dirty badge families, spinner, and session-dot colors. All previously hardcoded hex literals in CSS rules have been replaced with `var()` references — **zero raw hex literals remain in `styles.css` rules** as of cycle 52.

**Assessment: PARTIAL (styles.css complete; inline styles in index.html deferred).**

The `styles.css` portion of GAP-133 is fully resolved. Approximately 227 `style=""` inline attributes in `web/index.html` remain as the only incomplete portion. These require per-element class extraction but are deferred to avoid merge conflicts with the active GAP-01 worktree. Once GAP-01 lands, the inline-style sweep can proceed.

Previously identified tokens now present: `--cv-success`, `--cv-success-bg`, `--cv-danger`, `--cv-danger-bg`, `--cv-warn-bg`, `--cv-warn-text`, all confidence badge colors, and all previously hardcoded literals (confirmed 2026-07-04).

---

## Additional Design Gaps (Updated)

**GAP-DESIGN-01: Icon language is emoji-dominant; Font Awesome is underused**
STATUS: OPEN — unchanged
Font Awesome 6 Free is loaded (`index.html:23`) but the only FA usage observed is in session table action buttons. The workflow bar, tab bar, header buttons, and file-review cards all use Unicode emoji. Emoji render at inconsistent sizes, misalign vertically, and carry different visual weight across platforms.

**GAP-DESIGN-02: Inline style proliferation in modals and JS templates will drift**
STATUS: OPEN — unchanged
Four of six close buttons use raw inline styles instead of `.modal-close-btn`. No named modal-size modifier classes exist. The download tab generates entirely inline-styled HTML. The layout-instruction sidebar mixes named classes with inline control styles.

**GAP-DESIGN-03: CSS design tokens — styles.css RESOLVED; index.html inline styles deferred**
STATUS: PARTIAL — `styles.css` COMPLETE (95 tokens, zero raw hex in rules); ~227 inline `style=""` in `index.html` deferred pending GAP-01 merge
The `:root {}` block now has 95 CSS custom properties (cycle 52/63). All previously hardcoded hex literals in `styles.css` rules are replaced with `var()` references. The remaining drift is the ~227 `style=""` attributes in `index.html` which require per-element class extraction; deferred to avoid conflict with the active GAP-01 worktree. JS-generated inline HTML (download-tab.js, etc.) still uses inline styles, which is a separate architectural concern.

**GAP-DESIGN-04: Duplicate `@keyframes spin` definitions — RESOLVED**
STATUS: RESOLVED (cycle 63) — stale finding corrected 2026-07-04 (cycle 67)
Source-verified: only one `@keyframes spin` definition exists at `styles.css:1051`. No second `@keyframes spin` at lines 930–933 or 1494, and no `@keyframes llm-spin` remains. All spin animation consumers use the single canonical `@keyframes spin` at line 1051.

**GAP-DESIGN-05: Main two-panel layout has no responsive breakpoint**
STATUS: OPEN — unchanged
`.main-container` is `display: flex` with `.interaction-area` at 40% and `.viewer-area` at 60% (`styles.css:346–388`). There is no `@media` rule that collapses these panels at narrow viewports. At widths below ~900px the 40% chat panel becomes too narrow for usable input.

**GAP-DESIGN-06: Generated CV font choice — RESOLVED for fallback template**
STATUS: RESOLVED for cv-style.css (Inter now used); UNCHANGED for cv-template.html (already used Inter)
The `cv-style.css` fallback template now uses `'Inter', Arial, sans-serif` at line 18. The `cv-template.html` primary template already used Inter. Both output paths now use the same intentional typeface.

**GAP-DESIGN-07: CV header center-alignment vs. body left-alignment**
STATUS: OPEN — unchanged
`.cv-header` in `cv-style.css` remains `text-align: center` (`cv-style.css:36`) while the body uses a left-aligned two-column grid. The compositional inconsistency persists.

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

Score unchanged. The `styles.css` token layer is now complete (95 tokens, GAP-133 styles.css RESOLVED), but the ~227 inline `style=""` attributes in `index.html` (deferred pending GAP-01) and JS-generated inline HTML keep US-G1.4 and US-G3.4 at Partial. GAP-DESIGN-04 (`@keyframes spin` duplicate) is now resolved.

---

## Evidence References

| Finding | File | Line(s) |
| ------- | ---- | ------- |
| CSS design token block (:root) | `web/styles.css` | 18–27 |
| Typography scale (h1/h2/h3/body) | `web/styles.css` | 708–713 |
| `.action-btn` / `.action-btn.primary` / `.action-btn.secondary` | `web/styles.css` | 603–610 |
| Position-bar inline-style buttons | `web/index.html` | 104–111 |
| Sessions modal "New Session" inline style | `web/index.html` | 264 |
| Status color semantic system | `web/styles.css` | 116–118, 133–135, 165–171, 731–757, 1258–1260 |
| Modal base class | `web/styles.css` | 971–975 |
| Sessions modal inline size overrides | `web/index.html` | 254–268 |
| Master CV modal position override | `web/index.html` | 276 |
| Close button inconsistency (4 un-classed) | `web/index.html` | 257, 279, 427, 586, 703, 719 |
| Modal close-btn class definition | `web/styles.css` | 976 |
| Layout preview two-pane flex | `web/styles.css` | 1424–1433 |
| Layout preview responsive breakpoint | `web/styles.css` | 1515–1521 |
| Duplicate @keyframes spin | `web/styles.css` | 930–933, 1494 |
| @keyframes llm-spin | `web/styles.css` | 574 |
| Two-panel main layout (no responsive breakpoint) | `web/styles.css` | 346–388 |
| cv-style.css Inter font (updated) | `templates/cv-style.css` | 18 |
| cv-style.css brand blue (#2980b9) | `templates/cv-style.css` | 33–44 |
| cv-template.html Inter font load | `templates/cv-template.html` | 22 |
| cv-template.html :root token block | `templates/cv-template.html` | 24–34 |
| CV header center alignment | `templates/cv-style.css` | 36 |
| CV two-column grid | `templates/cv-style.css` | 67 |
| CV print optimization | `templates/cv-style.css` | 206–224 |
| CV page-break rules | `templates/cv-style.css` | 226–237 |
| Cover letter serif font (correct differentiation) | `web/styles.css` | 1567 |
| LLM Wizard progress bar | `web/styles.css` | 981–1062 |
| Emoji in workflow nav | `web/index.html` | 124–147 |
| Font Awesome loaded (underused) | `web/index.html` | 23 |
| Focus trap implementation | `web/ui-core.js` | ~294–347 |
| Reduced-motion media query | `web/styles.css` | 1670–1678 |
| High-contrast media query | `web/styles.css` | 1681–1688 |
