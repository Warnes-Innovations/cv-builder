<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review — Cycle 82

**Date:** 2026-07-06
**Branch:** `feature/multi-user-deployment`
**Personas evaluated:** 15 persona sub-agents + 1 heuristic sub-agent
**Method:** Source-first, evidence-cited review. All conclusions backed by file:line references.

---

## Summary Counts

| Persona | Stories | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|---------|---------|---------|-----------|--------|------------|-------|
| Applicant (US-A*) | 16 | 90 | 8 | 1 | 3 | 0 |
| UX Expert (US-U*) | 9 | 35 | 12 | 0 | 1 | 4 |
| Resume Expert (US-R*) | 7 | 29 | 7 | 0 | 0 | 0 |
| Hiring Manager (US-M*) | 7 | 42 | 11 | 1 | 1 | 0 |
| Persuasion Expert (US-P*) | 6 | 20 | 8 | 0 | 2 | 1 |
| HR/ATS (US-H*) | 8 | 44 | 8 | 0 | 1 | 1 |
| Accessibility Specialist (US-X*) | 4+generated | 16 | 7 | 5 | 0 | 0 |
| First-Time User (US-F*) | 3 | 3 | 10 | 1 | 0 | 0 |
| Returning User (US-S*) | 3 | 9 | 0 | 0 | 0 | 0 |
| Power User (US-W*) | 3+generated | 20 | 4 | 0 | 0 | 0 |
| Recruiter/Ops (US-O*) | 3 | 6 | 6 | 0 | 0 | 0 |
| Master CV Curator (US-M*) | 4 | 16 | 1 | 0 | 0 | 0 |
| Trust & Compliance (US-C*) | 3+generated | 19 | 9 | 2 | 3 | 2 |
| Graphical Designer (US-G*) | 3 | 6 | 6 | 0 | 0 | 0 |
| Heuristic (Nielsen H1–H10 + extras) | 10+7 | 3 (Good) | 11 (Minor) | 3 (Major) | — | — |

**Overall pass rate (named persona stories, excluding heuristic):** ~76% pass, ~18% partial, ~4% fail/not-impl.

---

## Top 15 New Gaps by Severity

These are newly discovered issues from Cycle 82 that are **not already tracked** in gaps.md (which covers through GAP-299).

| Rank | Severity | Summary | Persona(s) | Key Evidence |
|------|----------|---------|------------|-------------|
| 1 | **CRITICAL** | No anti-fabrication instruction in LLM system prompt — rewrites may invent metrics or claims absent from master data | trust-compliance | `conversation_manager.py:424–495` |
| 2 | **HIGH** | ATS HTML template missing `lang="en"` on `<html>` element | accessibility | `cv_orchestrator.py:1199` |
| 3 | **HIGH** | Font Awesome icons in generated HTML CV missing `aria-hidden="true"` (section headings + contact icons) | accessibility | `CV_Genentech...html:702–714, 772–847` |
| 4 | **HIGH** | Review sub-tab buttons (Experiences, Skills, etc.) missing `role="tab"`, `aria-selected`, `aria-controls` | accessibility | `review-table-base.js:672–676` |
| 5 | **HIGH** | Model catalog table rows not keyboard-accessible (no `tabindex`/`keydown` on `<tr>`) | accessibility | `ui-core.js:1570–1626` |
| 6 | **HIGH** | `--cv-card-bg` CSS variable undefined — position-style picker renders with transparent background | graphical-designer | `styles.css:1600` |
| 7 | **HIGH** | `check_has_result_clause()` severity is `'info'` not `'warn'` — result-clause advisory badge never visibly surfaces | persuasion-expert | `llm_client.py:1259` |
| 8 | **HIGH** | 6 structural ATS validation checks in `_NON_BLOCKING_CHECKS` are advisory-only, contradicting US-H6 "any fail blocks download" | hr-ats | `download-tab.js:151–161` |
| 9 | **HIGH** | Duplicate `id` attributes on publication modal heading — `aria-labelledby` points to non-existent id; JS title update silently fails | master-cv-curator | `master-cv.js:316` |
| 10 | **HIGH** | Alert modal uses separate focus stack from other modals — `_focusStack`/`_focusTrapStack` can diverge on nested modals | accessibility | `ui-helpers.js:34–49` |
| 11 | **MEDIUM** | Generated Files tab shows no file timestamps despite `finalGeneratedAt` available in state | returning-user | `final-generate.js:155–180`, `state-manager.js:333` |
| 12 | **MEDIUM** | Welcome modal fires for active-session returning users — no active-session guard | returning-user | `session-manager.js:175` |
| 13 | **MEDIUM** | Cover letter defaults to `startup/tech` tone regardless of job domain; no auto-suggestion from analysis | hiring-manager | `cover-letter.js:246` |
| 14 | **MEDIUM** | Cover letter word count mismatch: backend targets 250–300w, story requires 300–400w | hiring-manager, persuasion | `master_data_routes.py:122` |
| 15 | **MEDIUM** | Zero-bullet job entries not blocked — advisory fires only for count==1; count==0 renders bare title | hiring-manager | `cv_orchestrator.py:4465–4470` |

---

## Heuristic Ratings — Nielsen's 10 + Additional UX Dimensions

### Nielsen's 10 Heuristics

| # | Heuristic | Rating | Key Finding |
|---|-----------|--------|------------|
| H1 | Visibility of System Status | 🟡 Minor | Dead `#llm-status-bar` region; `#llm-busy-state-badge` timing unpredictable; token count shown without limit label |
| H2 | Match Between System and Real World | 🟡 Minor | "ATS," "Harvest," "LLM," "Master CV," "Authentication" (conflates API key + OAuth) — opaque without tooltips |
| H3 | User Control and Freedom | 🟡 Minor | `window.confirm()` still used; no multi-step undo for experience/skill decisions; "Take Over" has no data-loss warning |
| H4 | Consistency and Standards | 🟡 Minor | Mixed UK/US English in same workflow step; two modal close-button patterns; tab slug naming inconsistency |
| H5 | Error Prevention | 🟠 **Major** | Un-review gate uses suppressible `window.confirm()`; LLM wizard closeable during active test; "Take Over" irreversible without warning |
| H6 | Recognition Rather Than Recall | 🟡 Minor | Action buttons disappear with no inactive placeholder; provider/model settings require recall of internal key strings |
| H7 | Flexibility and Efficiency | 🟢 Good | Full keyboard shortcut system; bulk accept/reject; compact rewrite mode; non-linear step navigation |
| H8 | Aesthetic and Minimalist Design | 🟡 Minor | 12-step workflow nav; 10 simultaneous Customise sub-tabs; 5-control header; three chrome rows consume ~210px |
| H9 | Help Users Recognise, Diagnose, and Recover | 🟡 Minor | Connection failures revert to auth step without diagnostic; conflict banner offers no cause explanation |
| H10 | Help and Documentation | 🟡 Minor | Help modal is static, stage-unaware; no inline contextual help on review tabs; Harvest tooltip hover-only |

### Additional UX Dimensions

| Dimension | Rating | Key Finding |
|-----------|--------|------------|
| Cognitive Load | 🟠 **Major** | 10 simultaneous Customise tabs with no progress indicator; split-panel forces cross-region context switching |
| Visual Hierarchy | 🟡 Minor | All primary action buttons equal weight; 210px chrome before workspace |
| Information Architecture | 🟡 Minor | "File Review" / "Generated Files" / "Download Generated Files" — three labels for same stage |
| Workflow Momentum | 🟡 Minor | No Customise-stage progress counter visible; `_explicitlyReviewed` gate hidden until user tries to advance |
| Feedback Loops | 🟢 Good | Elapsed LLM timer; toast notifications with aria-live; ATS score auto-refresh; layout freshness chip |
| Error Recovery | 🟡 Minor | No Retry button adjacent to conversation error message; analyze-btn may stay disabled after failure |
| Affordance Clarity | 🟡 Minor | Upcoming vs. clickable step pills visually indistinct; toggle-chat glyph unclear |
| Terminology Clarity | 🟡 Minor | "Customise" (10 tasks), "Harvest," "ATS DOCX," "Copilot multiplier" — opaque without hover |

### Top 5 Heuristic Issues by Impact

1. **🟠 Major — Cognitive overload in Customization stage:** 10 simultaneous tab panels, no stage-level progress counter, `_explicitlyReviewed` gate invisible, `window.confirm()` gate suppressible. Highest abandonment risk point. (`app.js:128–142`, `ui-core.js:354–366`)
2. **🟠 Major — 210px chrome height reduces usable workspace:** Three stacked rows (header ~80px, position bar ~70px, workflow nav ~60px) consume ~210px before main panel. At 768px viewport, workspace is ~558px. (`styles.css:449`)
3. **🟠 Major — "Take Over" destructive action has no warning:** Ownership conflict button performs irreversible ownership claim with no data-loss warning; `window.confirm()` remains adjacent. (`index.html:413–416`, `app.js:139`)
4. **🟡 Minor — Action buttons disappear with no inactive placeholder:** Workflow action buttons use `display:none`; returning users must infer state from conversation history alone. (`index.html:189–199`)
5. **🟡 Minor — Dual LLM status displays with one dead region:** `#llm-status-bar` is permanently `display:none`; code updating it produces invisible feedback, creating a maintenance trap. (`index.html:175–178`)

---

## Full Persona Reviews

### Applicant Persona (US-A1–US-A12)

**Overall:** Strong implementation. Core intake-through-generation pipeline is complete and solid. 90 pass, 8 partial, 1 fail across 16 stories.

**Passing highlights:** URL/paste/upload intake (US-A1 ✅); analysis with clarification Q&A and prior-answer reuse (US-A2 ✅ 6/7); full review surface with confidence badges, up/down ordering, bulk actions (US-A3 ✅ 7/7); rewrite review with LCS word diff, weak-evidence badges, bulk controls, compact mode (US-A4 ✅ 8/8); spell-check pipeline (US-A4b ✅ 7/7); HTML preview then PDF+DOCX final generation (US-A5a–US-A5c ✅); finalise+archive with git commit and readiness checklist (US-A9 ✅ 5/5).

**Key gaps:** Mismatch analysis UI absent (LLM prompt only, no structured panel); category creation not implemented in skills tab (🔲); "Persuasion checks" label is internal jargon; NL→JSON master CV update and document ingestion absent (US-A10, 🔲); ↻ re-run button hover-only at 0.55 opacity; Interview Prep tab is a placeholder stub with no "Coming soon" label.

**Terminology issues:** "LLM:" pill, "ATS" unexplained on first use, "🌾 Harvest" opaque, UK/US spelling mix, re-run affordance touch/keyboard gap, "File Review" passive framing.

---

### UX Expert Persona (US-U1–US-U9)

**Overall:** Strong foundations in workflow orientation, rewrite review, and layout instructions. Key gaps in analysis chunking, session return context, and skeleton loading.

**Passing highlights:** Workflow steps bar with 4 visual states; job input with 3 tabs + protected-site guidance; rewrite review LCS diff with collocated actions (US-U5 ✅ 5/5); generation progress checklist (US-U6 ✅); layout review with per-entry Undo (US-U9 ✅ 7/8).

**Key gaps:** No "Welcome back — you left off at [Step] for [Job Title]" banner on session restore; analysis output renders in conversation panel as scrolling message, not structured cards in viewer pane; ATS keywords are flat equal-weight badges (no rank tier); mismatch panel completely absent (🔲); no skeleton/shimmer CSS pattern for async content areas; multiple-run version label only appears after first run.

**Terminology:** "Customise" / "Customizations" / "Recommend Customizations" — three forms; "File Review" / "Download Files" — two names for same step.

---

### Resume Expert Persona (US-R1–US-R7)

**Overall:** Core selection, rewrite, and audit pipeline is excellent. Minor gaps in publication ranking criteria and summary validation depth.

**Passing highlights:** Required/preferred split, synonym deduplication (US-R1); recency bias avoidance, bullet reordering (US-R2); skills optimization (US-R5 ✅ 5/5); rewrite audit traceability (US-R6 ✅ 4/4); spell-check with context-aware rules (US-R7 ✅ 7/7).

**Key gaps:** `is_first_author` detected and shown (star indicator, `publications-review.js:148`) but contributes 0 points to `_select_publications()` scoring (`cv_orchestrator.py:3764–3806`); ranked publication shortlist not presented proactively; `_validate_summary()` validates word count (40–250w) but not line count (4–6 lines per story spec); publication dictionary not seeded with journal/author names — false positives possible.

---

### Hiring Manager Persona (US-M1–US-M7)

**Overall:** Generated CV template strong — layout, hierarchy, page-flow controls well implemented. Cover letter and edge-case content checks are partial.

**Passing highlights:** Name/contact/summary/achievements layout (US-M1 partial); action verb and metric advisories (US-M2 partial); skills deduplication and category ordering (US-M3); multi-page sidebar fill, page count 2–3 (US-M4 partial); publications heading logic (US-M7 partial).

**Key gaps:** No automated page-1 fullness advisory; zero-bullet job entry (all bullets rejected) renders bare job title — advisory fires only for count==1, not count==0 (`cv_orchestrator.py:4470`); cover letter hardcoded `startup/tech` tone default; backend word count 250–300w vs. story spec 300–400w; Font Awesome + Google Fonts from CDN — offline render risk.

---

### Persuasion Expert Persona (US-P1–US-P6)

**Overall:** Persuasion check engine is comprehensive (10 checks). Hard metric-preservation constraint via `apply_rewrite_constraints()` is the strongest implementation. Gaps in enforcement coverage and cross-document consistency.

**Passing highlights:** Strong action verb, word count, passive voice, keyword appendage, positive metric framing (US-P4 5/7); CTA assertive check, filler phrases, company/role reference (US-P5 partial); batch terminology consistency (US-P6 partial).

**Key gaps:** `check_has_result_clause()` fires as `'info'` not `'warn'` — result-clause badge never shows as amber; narrative-thread advisory fires at generate time, not during Customise phase; no parallel structure check; front-loading not checked; cover letter word count target 300–400w exceeds story ceiling ≤300w for standard roles; no cross-document narrative framing consistency.

---

### HR/ATS Persona (US-H1–US-H8)

**Overall:** Strong ATS DOCX structure — zero tables, correct heading hierarchy, calibri fonts, JSON-LD schema.org/Person. Key gaps in non-blocking check alignment and acronym injection.

**Passing highlights:** Zero tables/shapes, contact in body, calibri fonts, JSON-LD (US-H1–H2 ✅); phone normalization (US-H3 ✅); keyword presence check, synonym matching (US-H4 partial); 2:1 weighted ATS score (US-H7 partial); hard/soft DOCX split, JSON-LD `additionalType` (US-H8 partial).

**Key gaps:** `_NON_BLOCKING_CHECKS` exempts 6 structural failures from blocking download, contradicting "any fail blocks download" (`download-tab.js:151–161`); acronym + full form not injected (🔲, `US-H4`); JSON-LD validation checks only `name` and `email` (not `telephone`, `hasOccupation`); "Basis: review_checkpoint" developer label exposed verbatim in ATS Score modal.

---

### Accessibility Specialist Persona (US-X1–US-X3 + Generated Materials)

**Overall:** Solid foundation — focus management, focus traps, keyboard navigation, live regions, reduced-motion, and high-contrast media queries all implemented. Five clear failures remain.

**Failures (❌):**
- Review sub-tab buttons are plain `<button>` with CSS `.active` only — no `role="tab"`, `aria-selected`, `aria-controls` (`review-table-base.js:672–676`)
- Model catalog table rows click-only — no `tabindex`, `role`, or `keydown` handlers on `<tr>` (`ui-core.js:1570–1626`)
- Font Awesome icons in generated HTML CV section headings lack `aria-hidden="true"` (`cv_orchestrator.py` templates)
- Sidebar contact icons in generated HTML lack `aria-hidden="true"`
- ATS DOCX HTML template: `<html><head>` without `lang="en"` (`cv_orchestrator.py:1199`)

**Partial failures:** Alert modal focus stack isolation (`ui-helpers.js:34–49`); `confirmDialog()` `aria-labelledby` targets a `<p>` not a heading; secondary text contrast ~4.0:1 (below AA 4.5:1); `.toggle-chat` has no `:focus-visible` rule.

---

### First-Time User Persona (US-F1–US-F3)

**Overall:** Onboarding modal well-structured. Job Input clear. Customise stage and generation pipeline confusing for first-time users.

**Failure (❌):** Relationship between "Generate Preview →", "Open Layout Review →", "Confirm Layout", and "Continue to File Review →" is not explained as a pipeline (`index.html:193–198`).

**Key gaps:** Customise stage exposes 9+ tabs simultaneously with no orientation; "Goals" tab contains document length constraints — label/content mismatch; "Harvest," "ATS," "ATS DOCX," "Non-confidential" require hover to understand; post-layout optional steps (Cover Letter, Screening, Interview Prep, Thank You, Harvest) unlock simultaneously with no distinction from required steps.

---

### Returning User Persona (US-S1–US-S3)

**Overall:** All 9 criteria across 3 stories pass. Three new observations added this cycle.

**All stories pass (US-S1 ✅ 3/3, US-S2 ✅ 3/3, US-S3 ✅ 3/3).**

**New observations (Cycle 82):**
- Welcome modal fires for active-session returning users — no active-session guard in `maybeShowWelcomeModal()` (`session-manager.js:175`)
- Generated Files tab shows no file timestamps despite `finalGeneratedAt` available in state (`final-generate.js:155–180`, `state-manager.js:333`)
- Root URL access always requires full sessions modal navigation — no auto-resume shortcut for single active session (`session-manager.js:457–467`)

---

### Power User Persona (US-W1–US-W3)

**Overall:** Strong power-user feature set — keyboard shortcuts, bulk actions, re-run affordances, layout undo, session management. Two key gaps in keyboard coverage and session quick-access.

**All US-W3 criteria pass (8/8).** US-W1 5/7, US-W2 5/7.

**Key gaps:** `_getCards()` in `keyboard-shortcuts.js:65–69` returns cards only for `rewrite` or `spell` tabs — Experiences, Skills, Achievements tabs have no keyboard card navigation; single-level bulk undo only (`_bulkUndoSnapshot` stores one state); session switching always opens full 980px modal; compact mode is Rewrites-only.

---

### Recruiter/Ops Persona (US-O1–US-O3)

**Overall:** File naming, metadata capture, and archive flow are solid. Discoverability of the Finalise step and terminology are the main issues.

**Key gaps:** Finalise tab is `style="display:none"` and absent from `STAGE_TABS`; reached only via mislabeled "Package Application Files" button; readiness checklist visible only inside Finalise tab with no pre-entry signal; status values "queued" and "parked" are pipeline jargon; final HTML files lack "not for direct submission" advisory.

---

### Master CV Curator Persona (US-M1–US-M4)

**Overall:** Session/master boundary clearly communicated. Harvest review and publications bibliography management fully implemented. US-M3 (finalise vs. harvest boundary) is partial.

**US-M1 ✅ 3/3, US-M2 ✅ 4/4, US-M4 ✅ 9/9. US-M3 ⚠️ partial.**

**Key gaps:** Experience bullets count shown but not editable in Master CV tab (`master-cv.js:904`); backup restore requires manual tab reload (`master-cv.js:2529`); phase lock banner exposes raw enum "refinement" (`master-cv.js:88`); **Bug (❌):** Duplicate `id` attributes on publication modal heading (`master-cv.js:316`) — `aria-labelledby` points to non-existent id.

---

### Trust & Compliance Persona (US-C1–US-C3)

**Overall:** Rewrite workflow transparency is strong. Two clear failures: no anti-fabrication instruction, no quantity-inflation check.

**Failures (❌):** LLM system prompt (`conversation_manager.py:424–495`) contains no explicit anti-fabrication instruction; no check for proposed rewrites introducing new quantified claims.

**Key gaps:** AI-assistance disclosure defaults off with no contextual reminder at download time; `ai_attribution` resets per session, not persisted to `config.yaml`; "Candidate to confirm" (Rewrites tab) vs. "Weak evidence" (Skills tab) — same concept, two labels; harvest bullets for `improved_bullet` type carry no provenance badge.

---

### Graphical Designer Persona (US-G1–US-G3)

**Overall:** Color token system complete (95 CSS custom properties). Typography, status semantics, and card/diff readability are strong. Inline style proliferation, icon inconsistency, and one undefined variable remain.

**Passing:** Heading scale distinctiveness, dense review card readability, status color semantic system across all surfaces, standard interaction patterns with a11y media queries, layout preview framing, download item card styling.

**Key gaps:** `--cv-card-bg` undefined at `styles.css:1600` — position-style picker transparent background; four of six modal close buttons use raw inline styles; main two-panel layout has no responsive breakpoint below ~900px; design system is color-only (no `--cv-font-*` or `--cv-space-*` tokens); `summary-text` uses `text-align: justify`; Font Awesome loaded but underused (emoji-dominant); locale inconsistency within single workflow stage.

---

## Cross-Cutting Themes

### 1. Terminology Inconsistency (12+ persona reviews)

All 15 personas flagged terminology issues. Key clusters:
- **"ATS"** unexplained at first use — 8 personas
- **"Harvest"** opaque metaphor — 9 personas
- **"LLM"** developer jargon in user-facing header — 5 personas
- **UK/US spelling mix** ("Customise" step vs "Recommend Customizations" button) — 4 personas
- **"Persuasion checks/warnings"** jargon — 3 personas

### 2. Accessibility Failures in Generated Output (4 personas)

Three direct failures in generated HTML CV and ATS template: Font Awesome icons missing `aria-hidden`, ATS HTML template missing `lang="en"`, and review sub-tab buttons missing tab ARIA semantics. Cross-cutting because the generated materials are the tool's primary deliverable.

### 3. Mismatch/Gap Analysis UI Absent (applicant + ux-expert + resume-expert)

Three personas independently confirmed that gap analysis is present in the LLM prompt (`conversation_manager.py:466`) but has no structured UI section. Analysis output is free-form text in the conversation panel only. This is the highest-value analysis surface for a job application tool.

### 4. Cover Letter Specification Drift (hiring-manager + persuasion-expert)

Both personas independently identified: backend word count 250–300w (`master_data_routes.py:122`) vs. story spec 300–400w; hardcoded `startup/tech` tone default (`cover-letter.js:246`); no tone auto-suggestion from `job_analysis.domain`.

### 5. Anti-Fabrication Gap (trust-compliance + resume-expert + persuasion-expert)

Three personas confirmed no safeguard against LLM-invented content: no anti-fabrication instruction in system prompt; `skill_add` evidence citation required in prompt but not runtime-enforced; no diff-level analysis of numeric additions in proposed rewrites.

### 6. Cognitive Overload at Customise Stage (first-time-user + ux-expert + heuristic)

Three independent sources rated the Customise stage as high cognitive load: 9–10 simultaneous tabs with no progress indicator, no required-vs-optional labeling, and an invisible gate counter. Heuristic review rated this 🟠 Major.

### 7. Focus Management Edge Cases (accessibility + heuristic)

Alert modal focus stack isolation, model table keyboard access, and review sub-tab ARIA semantics flagged by multiple passes. The `_focusTrapStack`/`_focusStack` divergence in `showAlertModal()` (`ui-helpers.js:34–49`) is a subtle bug that could cause focus loss in nested modal scenarios.

---

*Report generated 2026-07-06 by Phase 3 assembly agent for cycle 82.*
