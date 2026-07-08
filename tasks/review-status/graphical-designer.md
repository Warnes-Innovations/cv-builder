<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Graphical-Designer Review Status

**Last Updated:** 2026-07-07 15:10 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely. This cycle fully re-verified every claim against current source (post the 2026-07-07 devel merge) rather than carrying forward the prior cycle's numbers — several prior findings are now stale (e.g. the "LLM" acronym exposure gap is resolved; the styles.css header comment's claim of "6 one-off literals" in rule bodies is now inaccurate, only 1 remains) and are corrected below.

## Application Evaluation

### US-G1: Visual Hierarchy and Readability

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Headings/body/helper/controls visually distinct | ✅ Pass | Type scale is consistent: `.document-content h1` 28px/700, `h2` 20px/600, `h3` 16px/600 (`web/styles.css:899-901`); helper/hint text uses a dedicated smaller muted class, `.field-hint-xs` 0.78em / `--cv-text-secondary` (`web/styles.css:1181`); controls (`.action-btn`, `.btn-primary`, `.form-input`) share consistent padding/radius/border conventions throughout. |
| 2 | Primary actions consistently prominent | ✅ Pass | All primary CTAs use the same accent-fill convention: `.action-btn.primary` (`styles.css:758`), `.btn-primary` (`:1569`), `.submit-btn`/`.continue-btn` (`:1461-1466`), `.questions-submit-btn` (`:682`) — all `background: var(--cv-accent)` with `:hover → var(--cv-info)`. |
| 3 | Dense review surfaces remain readable | ✅ Pass | `.review-table` uses zebra striping (`tbody tr:nth-child(even)`, `styles.css:1390`), header shading, and hover states; `.rewrite-card`/`.sm-tr`/`.session-switcher-row` all use card/row separation with consistent border + spacing tokens rather than a flat unstyled list. |
| 4 | Color/theme choices support usability + attractiveness | ✅ Pass | 97 semantic `--cv-*` custom properties (see independent assessment below); dedicated `prefers-reduced-motion` (`styles.css:1948-1956`) and `prefers-contrast: more` (`:1958-1965`) blocks exist. Caveat: no automated contrast-ratio audit artifact was found in the repo — pass is based on token/semantic design, not a verified WCAG contrast measurement, and no `prefers-color-scheme: dark` support exists (confirmed absent via full-file grep) — light-mode only. |

**Acceptance criteria:** Both are satisfied — primary actions and current context (`.step.active`/`.tab.active`/`.step.viewing`) are visually distinguishable via color+shape, and dense screens (rewrite review, ATS score tables, session switcher) use borders/spacing/typography rather than being visually flat.

### US-G2: Cross-Stage Visual Consistency

| # | Criterion (abbreviated) | Status | Notes / File:Line refs |
|---|--------------------------|--------|------------------------|
| 1 | Repeated control types share consistent styling | ⚠️ Partial | The **CSS class layer** is consistent (`.action-btn`, `.tab`, `.modal`, `.icon-btn` are reused everywhere). However, both `web/index.html` (161 inline `style=""` attrs) and the JS layer (`web/ui-core.js` ~65 `.style.` mutations, `web/app.js:15-38` `_setConnectionMessage()`) bypass these classes and hardcode literal hex values that duplicate existing `--cv-*` tokens (e.g. `web/app.js:27-37` hardcodes `#166534`/`#ecfdf5`/`#86efac`, `#b91c1c`/`#fef2f2`/`#fecaca`, `#1e40af`/`#eff6ff`/`#bfdbfe` — all of which are `--cv-success-text`/`--cv-success-bg`/`--cv-success-border`, `--cv-error-strong`/`--cv-error-bg`/`--cv-error-bg-md`, `--cv-info-dark`/`--cv-info-bg`/`--cv-info-border` respectively in `styles.css`). This is a latent drift risk: if a token's hex value is ever changed, these JS/HTML literals silently go out of sync with the rest of the app. |
| 2 | Status surfaces use coherent visual language | ✅ Pass | `.auth-badge`, `.confidence-badge`, `.page-estimate`, `.cr-badge`, `.sc-score-badge`, `.persuasion-badge` all draw from the same success/warn/error/info token families consistently. |
| 3 | Tabs/workflow bar/cards/modals feel one system | ✅ Pass (minor nit) | Shared modal/tab/card conventions confirmed. One small glyph inconsistency: the "new session" action uses a full-width Unicode plus **＋** in the header button (`web/index.html:51`, `＋ New Session`) but a standard ASCII **+** in the Sessions-modal footer button (`web/index.html:285`, `<span>+</span> New Session`) — same action, two different plus-sign glyphs. |
| 4 | Familiar/standard interaction patterns | ✅ Pass | Conventional tab bar, modal-overlay-with-backdrop-click-to-close pattern (`onclick="if(event.target===this)close...()"`, e.g. `index.html:274,296,443,603`), toast notifications (`styles.css:1469-1474`) — no unusual or invented interaction idioms found. |

#### Independent assessment: inline-styles deferral (161 occurrences in index.html)

I counted and categorized all 161 `style=""` occurrences in `web/index.html` (verified via `grep -o 'style="'`) rather than relying on the prior cycle's characterization.

**Duplication measurement (precise counts):**
- 161 total `style=""` attributes.
- **101 distinct value-strings** — so 60 instances are byte-for-byte duplicates of another instance elsewhere in the file, and **78 of the 161 (48%)** belong to one of 18 groups that repeat 2+ times.
- The three largest groups are all `display:none` in different whitespace formatting (`style="display:none"` ×14, `style="display:none;"` ×12, `style="display: none;"` ×12 — **38 instances, 24% of the total**). Bootstrap 5 is already loaded in this page (`index.html:17`) and ships a `.d-none { display: none !important; }` utility class; I confirmed via `grep -rn 'd-none' web/*.html web/*.js` that **it is used nowhere in the codebase**. Every one of these 38 could become `class="d-none"` (or be appended to an existing class list) with zero new CSS and zero visual-regression risk, since the computed style is identical.
- A verbatim 8-property inline style (`background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;color:#475569;font-size:0.8em;padding:2px 7px;line-height:1.6;`) is copy-pasted three times for `#master-cv-bar-btn` (`index.html:111`), `#ats-report-btn` (`:113`), and `#job-analysis-btn` (`:115`) — differing only in the presence of a leading `display:none;`. A `.position-bar-mini-btn` class would remove this duplication entirely.
- A loading-placeholder string (`padding:24px;text-align:center;color:#6b7280;`) is copy-pasted 4 times across different modals (`index.html:281, 303, 727, 743`).
- `color: #1e293b;` (matches `--cv-text-primary`) appears as a lone declaration 6 times, and `color: #475569;` (matches `--cv-text-muted`) 3 times — all inside the onboarding-modal emphasis/body text (`index.html:355-401`), directly substitutable with the existing tokens or a `.cv-text-emphasis`/`.cv-text-muted` utility.

**Verdict on the prior assessment:** "Mostly unique one-offs, not systematic duplication" is **accurate for roughly half the count** (the ~101 distinct, largely bespoke modal-sizing and one-off flex/gap layout compositions used once each — e.g. `max-width: 1280px; width: 98%; ...` for the Master CV modal shell) but **understates a genuinely systematic, low-risk, mechanically-fixable subset**: 78 instances (48%) are literal duplicates, and the `display:none` cluster alone (38 instances, 24%) has a zero-cost, zero-risk fix already sitting in the loaded Bootstrap bundle. I'd characterize the deferral as reasonable for the *bespoke* two-thirds of the count, but recommend a narrowly-scoped follow-up (swap `display:none` variants to `.d-none`, extract `.position-bar-mini-btn` and one loading-placeholder class) rather than deferring the whole 161 as a single undifferentiated MEDIUM gap — that follow-up would remove ~54-60 of the 161 occurrences with essentially no visual-regression testing burden, since the resulting computed styles are identical to today's.

**Off-palette colors (would require a NEW token):** **None found in index.html.** I extracted all 21 unique hex literals appearing inside `index.html` inline styles and diffed them (case-insensitively) against all 97 hex values defined in `:root{}` in `styles.css`. Every single inline hex value already has a matching `--cv-*` token (e.g. `#1e293b`→`--cv-text-primary`, `#475569`→`--cv-text-muted`, `#10b981`→`--cv-success`, `#3b82f6`→`--cv-accent`, `#6366f1`→`--cv-indigo-500`, `#2563eb`→`--cv-info`, `#dc2626`→`--cv-error`, `#c2410c`→`--cv-orange-700`, `#9a3412`→`--cv-orange-text-dark`, `#166534`→`--cv-success-text`, `#bbf7d0`→`--cv-success-bg-lt`, `#f0fdf4`→`--cv-success-bg`, `#fed7aa`→`--cv-orange-200`, `#fff7ed`→`--cv-orange-bg`, `#cbd5e1`→`--cv-slate-300`, `#94a3b8`→`--cv-slate-400`, `#64748b`→`--cv-text-secondary`, `#e2e8f0`→`--cv-border`, `#f1f5f9`→`--cv-bg-subtle`, `#f8fafc`→`--cv-bg-light`, `#6b7280`→`--cv-gray-500`, `#fff`→`--cv-white`). This means the outstanding work is purely "wire existing tokens/classes into index.html," not a token-design gap — the token layer itself does not need to grow to close this.

One near-miss **does** exist, but outside index.html: `styles.css:665` — `.question-item.answered { background: #f8fffe; ... }` — is a raw hex literal in a CSS rule body (not `:root`), and `#f8fffe` is not itself one of the 97 tokens. It is visually a near-white mint, close to but distinct from the existing `--cv-success-bg` (`#f0fdf4`) or `--cv-emerald-50` (`#ecfdf5`). This should either be replaced with one of those existing tokens (near-zero visual difference) or promoted to a named token rather than left as a bare literal. Note: the file's own header comment at `styles.css:16-17` claims "6 one-off literals remain in rules" — I verified only **1** raw hex literal actually remains outside `:root` (`grep -n` across the whole file, excluding the `:root` block, found only `styles.css:665`), so that comment is now stale and should be corrected to avoid future reviewers over- or under-estimating remaining work.

**Token layer (`:root{}`) completeness/organization:** ✅ Pass, well organized. 97 custom properties in `web/styles.css:18-142`, grouped by semantic family with inline comments naming the source Tailwind-style color and its usage (borders, text, success/error/warn/info, extended gray/sky/emerald/amber/orange/violet/indigo scales, spinner colors, session-dot colors). One minor design-system smell: 10 "alias" tokens exist purely for backward compatibility and resolve to the same hex as another canonical token (e.g. `--cv-error-dark` = `--cv-error-strong` = `#b91c1c`, `--cv-success-text-dark` = `--cv-success-deep`, `--cv-warn-dark` = `--cv-amber-600`; see `styles.css:127-141`). This isn't a functional bug, but having two names for one value is a common source of "which token do I use here?" confusion in a design system and is worth a future consolidation pass. There is also no typography or spacing token scale (no `--cv-font-*`/`--cv-space-*` custom properties) — the token layer covers color only; font sizes and spacing are hard-coded per-component throughout `styles.css`.

## Generated Materials Evaluation

| Area | Status | Notes / File:Line refs |
|------|--------|------------------------|
| Primary CV template visual quality | ✅ Pass | `templates/cv-template.html:24-320` defines a self-contained, coherent design system for the *output* document (distinct from, but not conflicting with, the app's UI tokens): serif display name (`Merriweather`, `.name` line 210-218) paired with sans-serif body (`Inter`), a single accent blue family (`--primary-color:#2c3e50`, `--accent-color:#2980b9`), FontAwesome icons for contact rows, uppercase letter-spaced section titles, and print-specific rules (`page-break-inside: avoid`, `break-after: avoid-page`) to prevent orphaned headings across page breaks (`:244-256`). This reads as a credible, professional, non-novelty resume layout — satisfies US-G3 criterion 4. |
| ATS structured data | ✅ Pass | Schema.org `Person` JSON-LD is embedded in the document `<head>` (`templates/cv-template.html:17-20`) — a nod to both machine-readability and professional polish. |
| Color distinctiveness of generated CV | ⚠️ Partial | The template's palette is entirely monochromatic blue (`--primary-color:#2c3e50`, `--secondary-color:#34495e`, `--accent-color:#2980b9`, `templates/cv-template.html:25-27`) with no way for a user to choose an alternate accent — every CV produced by this app looks like every other one from a color standpoint. Also, `.summary-text { text-align: justify; }` (`:267`) can produce uneven word-spacing rivers, especially at smaller `base_font_size` settings or in a narrow column. |
| Fallback template consistency | ⚠️ Partial | `scripts/utils/cv_orchestrator.py:1207-1229` generates a much plainer fallback HTML (referencing `templates/cv-style.css`) used **only** when both Quarto and the primary Jinja2 template fail to render. `cv-style.css` uses a different but not clashing palette (`#2980b9` accent — coincidentally the same blue as the primary template) and a simpler two-column CSS Grid layout with no icons/JSON-LD. This is a legitimate secondary design surface that is currently un-audited/un-unified with the primary template; low risk given it is rarely invoked, but worth flagging since a designer reviewing "the generated CV" would only see this in a failure path and might be surprised by the visual downgrade. |
| Preview/document-viewer framing (in-app) | ✅ Pass | `.document-content` simulates a physical page: `max-width: 8.5in`, `min-height: 11in`, `padding: 0.5in`, `box-shadow` (`web/styles.css:896`); `.preview-iframe-container` frames the live layout preview with border + radius + background (`:1645`), and `.layout-input-pane` is a fixed 320px sidebar so instruction controls don't compete visually with the preview (`:1651`). Satisfies US-G3 criteria 1-2. |
| File-review / download presentation | ✅ Pass | `.download-item`/`.download-grid` render each output file as a clean bordered card with icon, name, description, and a distinct action button (`web/styles.css:1548-1557`); `.preview-output-row`/`.preview-output-badge` similarly present generation status cleanly (`:1658-1668`). Satisfies US-G3 criterion 3. |

## Additional Story Gaps / Proposed Story Items

- **US-G2 gap:** The story's acceptance criteria only cover the *static* CSS design system, but the actual drift risk found here lives in **JS-set inline styles** (`web/ui-core.js`, `web/app.js`) that hardcode hex literals instead of referencing `--cv-*` tokens or classes. Propose adding an explicit criterion: "Dynamically-applied styles (via `element.style.x =`) reference design tokens/classes rather than hardcoded literals," since this is where token drift is most likely to go unnoticed (a CSS-only audit would miss it entirely).
- **US-G3 gap:** No acceptance criterion currently covers the **fallback CV template** (`templates/cv-style.css` / `cv_orchestrator.py::_create_fallback_html`). Given it is a real, user-facing rendering path (invoked when Quarto + Jinja2 both fail), propose a criterion that fallback/degraded output paths also meet the same "credible professional brand" bar as the primary template, or explicitly document that this path is exercised so rarely it's out of scope.
- **Terminology finding (re-verified this cycle, still open):** The workflow-step bar uses British spelling — `id="step-customizations"` with visible label **"Customise"** and `title="Content customisation"` (`web/index.html:133`) — while the corresponding chat-area action button uses American spelling, **"⚙️ Recommend Customizations"** (`web/index.html:198`). Same feature, same user flow, two different spelling conventions visible seconds apart. This is a small but real "does this feel like one product" signal a designer would flag.
- **Terminology finding (corrected from a stale prior claim):** A prior review cycle flagged the header/model-selector button as exposing the developer-centric acronym "LLM" to end users. Re-verified against current source: this has been fixed — the header button, wizard modal title, and settings-card headings all now read **"AI Model"** (`web/index.html:54, 446, 613, 681`), not "LLM." No `>LLM` or `LLM:` user-facing string remains in `index.html`. This finding should be marked resolved rather than carried forward.
- Otherwise, no ambiguity/inconsistency found in the workflow-step or tab labels themselves (e.g., "File Review", "Layout Review", "Update Master CV" are all clear, jargon-free, and match the user's mental model of the CV-tailoring process). The plus-sign glyph inconsistency (`index.html:51` vs `:285`) is cosmetic, not a comprehension issue.

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, templates/cv-template.html, templates/cv-style.css, scripts/utils/cv_orchestrator.py (fallback-template code path only)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-G1 | 4 | 0 | 0 | 0 | 0 |
| US-G2 | 3 | 1 | 0 | 0 | 0 |
| US-G3 | 4 | 2 | 0 | 0 | 0 |

**Key evidence references:**
- US-G1.4: 97-token design system, no dark mode → `web/styles.css:18-142` (tokens), absent `prefers-color-scheme: dark` (full-file grep, no match)
- US-G2.1: JS-hardcoded hex duplicating tokens → `web/app.js:15-38`, `web/ui-core.js:107-119`
- US-G2.3: plus-sign glyph inconsistency → `web/index.html:51` vs `web/index.html:285`
- Terminology: British/American spelling split → `web/index.html:133` ("Customise") vs `web/index.html:198` ("Customizations")
- Terminology: "LLM" acronym exposure — now resolved, all instances read "AI Model" → `web/index.html:54, 446, 613, 681`
- Inline-styles independent count → `web/index.html` (161 total `style=""`, 78 duplicated instances across 18 repeated groups, 38 of which are `display:none` variants matching Bootstrap's unused `.d-none` utility already loaded at `web/index.html:17`)
- Off-palette hex check → zero of 21 unique inline hex values in index.html fall outside the 97 tokens defined in `web/styles.css:18-142`; one near-miss literal exists in a CSS rule body at `web/styles.css:665` (`#f8fffe`, not itself a token)
- Design-token-comment drift → `web/styles.css:16-17` claims "6 one-off literals remain in rules"; actual current count is 1 (`web/styles.css:665`)
- Generated CV template quality → `templates/cv-template.html:24-320`
- Generated CV color monotony / justified-text risk → `templates/cv-template.html:25-27, 267`
- Fallback template (lower scrutiny path) → `scripts/utils/cv_orchestrator.py:1207-1229`, `templates/cv-style.css`

**Evidence standard:**
- Every conclusion should be supported by evidence sufficient for another reviewer to verify it independently.
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
