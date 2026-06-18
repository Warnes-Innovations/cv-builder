<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# UI Review — 2026-06-18

**Cycle:** Full 15-persona + 2 heuristic cycle (branch `feature/multi-user-deployment`)
**Generated:** 2026-06-18

---

## Status Counts (across all 15 persona reviews)

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
|---------|---------|-----------|--------|------------|
| Applicant (US-A*) | 72 | 11 | 3 | 0 |
| UX Expert (US-U*) | 21 | 17 | 6 | 1 |
| Resume Expert (US-R*) | 14 | 9 | 4 | 0 |
| Hiring Manager (US-M*) | 13 | 13 | 2 | 1 |
| Persuasion Expert (US-P*) | 9 | 9 | 2 | 4 |
| HR / ATS (US-H*) | 23 | 10 | 0 | 3 |
| Accessibility Specialist (US-X*) | 1 | 8 | 3 | 0 |
| First-Time User (US-F*) | 1 | 7 | 1 | 0 |
| Returning User (US-S*) | 5 | 4 | 0 | 0 |
| Power User (US-W*) | 5 | 2 | 0 | 0 |
| Recruiter-Ops (US-O*) | 7 | 6 | 1 | 1 |
| Master CV Curator (US-M1/M4) | 15 | 7 | 1 | 0 |
| Trust & Compliance (US-C*) | 7 | 7 | 0 | 2 |
| Graphical Designer (US-G*) | 4 | 7 | 1 | 0 |
| Heuristic (Nielsen) | 5 (Good/Minor) | 6 (Major) | 1 (Critical) | — |
| **Totals** | **~202** | **~123** | **~25** | **~12** |

---

## Top Acceptance-Criteria Gaps (Ranked by Severity)

### CRITICAL

1. **Keyboard and mouse parity — workflow step pills and viewer tabs are completely inaccessible to keyboard-only users** (GAP-120, GAP-72)
   All 12 workflow step `<div class="step">` elements and all viewer tab `<div role="tab">` elements lack `tabindex="0"` and keyboard event handlers. This is a WCAG 2.1 Level A failure blocking the entire workflow for keyboard users.
   Evidence: `web/index.html:119–141, 200–225`; `web/app.js:122–125`

2. **`final_generation` phase absent from SESSION_PHASE_LABELS** (NEW — GAP-124)
   `web/utils.js:262–285` omits `final_generation` from both `SESSION_PHASE_LABELS` and `SESSION_PHASE_LABELS_SHORT`. Sessions in this phase display raw "final generation" string in the session switcher.

3. **Layout scope label actively invites text changes** (GAP-125)
   `web/layout-instruction.js:293` reads "Describe a layout or text change — the AI will determine the right approach." This directly contradicts US-U9 AC 1 & 7 which require: "Affects layout only — approved text is never changed."

### HIGH

4. **Cover letter word count hardcoded to ~250–300 words for all role types** (GAP-126, US-M6)
   `scripts/routes/master_data_routes.py:1566` hard-codes the word target regardless of role type. US-M6 requires 300–400w standard, 400–500w executive, 500–600w research/academic.

5. **`publication_count` stat card reads from JSON not BibTeX** (GAP-92 confirmed)
   `scripts/routes/master_data_routes.py:217` reads `len(data.get('publications', []))` from the master JSON. On any BibTeX-only setup (the standard configuration), the stat card shows 0 while the Publications section below shows real entries.

6. **`candidate_to_confirm` skills invisible in review UI and appear unmarked in generated output** (GAP-127, US-R5 AC4)
   `web/` has zero references to `candidate_to_confirm` in rendering code. Weak-evidence skill additions flow through to generated PDF/DOCX/HTML identically to confirmed skills. Both the UI flag requirement and the output-exclusion requirement are unimplemented.
   Evidence: `web/skills-review.js` — no rendering code for this flag; `scripts/utils/cv_orchestrator.py:1779`

7. **Rejected rewrites absent from `rewrite_audit`** (GAP-128, US-R6 AC3)
   If all rewrites are rejected, `rewrite_audit` in `metadata.json` is empty. Only accepted proposals are reliably recorded. The story requires an entry for every proposal regardless of outcome.
   Evidence: `web/rewrite-review.js:361`; `scripts/utils/conversation_manager.py`

8. **Natural-language Master CV update entirely absent** (GAP-01, US-A10)
   No free-text NL update flow, no document ingestion path. `web/master-cv.js` is structured CRUD only. This remains a full ❌ Fail.

9. **No overlapping date range detection in ATS validation** (GAP-33, US-H5 AC4 — 🔲 Not Implemented)
   No validation exists in `validate_ats_report` or anywhere else.

10. **Master CV and ATS Report modals lack focus management** (GAP-129)
    `master-cv.js:2464` and `ats-modals.js:112` open modals with no `setInitialFocus`, `trapFocus`, or `restoreFocus`. Keyboard and screen-reader users cannot use these modals.

11. **Workflow step state conveyed by colour only — no text alternative** (US-X1 AC3)
    All workflow step states (active/completed/upcoming/stale) use colour exclusively (`styles.css:150–156`). No `.sr-only` label or non-colour shape distinction is provided.

12. **`aria-label=""` on `#layout-freshness-chip`** (GAP-123)
    `web/index.html:95`: empty `aria-label` overrides visible button text. Screen readers announce nothing for this interactive button.

### MEDIUM

13. **Cross-rewrite terminology consistency absent** (US-R3 AC4)
    No post-processing step ensures adopted keywords are consistent across all proposals in a batch. LLM can use "MLOps" in one proposal and "productionizing ML pipelines" in another.

14. **No restored-decisions summary on session return** (GAP-110, US-S1 AC3)
    After session restore, no summary shows how many experiences/skills/rewrites were recovered. Users must navigate each review tab individually.

15. **Icon-only controls lacking `aria-label`** (US-X3 AC2)
    `#toggle-chat` (`index.html:149`), `#rename-session-btn` (`index.html:76–79`) have no `aria-label`. Three modal close `×` buttons rely on `title` attribute only (not reliably read by screen readers).

16. **Spell-check auto-advances to generation without confirmation** (GAP-49)
    After `submitSpellCheckDecisions()`, the frontend immediately calls `generate_cv` with no user confirmation, summary, or opportunity to reconsider.

17. **Persuasion warning panel collapsed by default; bypass possible** (GAP-130)
    `rewrite-review.js:107` collapses persuasion warnings by default. "Acknowledged" button is inside the collapsed section. A single "Proceed anyway?" click bypasses the review requirement entirely.

18. **No Customise-stage blocking gate** (GAP-131)
    Users can proceed to CV generation from Customise without reviewing or deciding on any experience, skill, or achievement item. LLM defaults flow silently into the final product.

19. **Two divergent CV output templates** (GAP-132)
    `templates/cv-template.html` (Inter, rem, CSS variables, `#2980b9`) vs `templates/cv-style.css` (Segoe UI/Arial, pt sizes, `#2c5aa0`). The HTML preview shows one visual product; the DOCX download delivers a different one.

20. **No CSS design token layer** (GAP-133)
    ~50 hard-coded hex literals in `styles.css`, 216 inline `style=""` attributes in `index.html`, no `:root {}` custom-property block. Any colour or spacing change requires grep-and-replace across multiple files.

---

## Top 5 UX Heuristic Issues

From `tasks/review-status/ux-heuristic.md` (fresh 2026-06-18) and `tasks/review-status/heuristic.md`:

### 1. No Help System After Onboarding Dismissal (H10 — 🔴 Critical)
Once the welcome modal is permanently dismissed ("Don't show again"), there is no re-openable guide, no help link, no contextual tooltips for "ATS", "Harvest", "Temperature", or any other jargon term. Users have no in-app recourse for any terminology question after the first session.
Evidence: `web/index.html:313–379` (sole onboarding path); no `?` or Help button exists anywhere.

### 2. Dual Navigation Structure Creates Cognitive Overload (H4/H8 — 🟠 Major)
The 13-step workflow bar and ~20-tab tab bar are two parallel navigation systems with inconsistent naming. "⬇️ Download" (step bar) maps to "📄 Generated Files" AND "⬇️ File Review" as separate tabs. "⚙️ Customise" step owns 10 sub-tabs with no visible summary. Users must maintain a mental model of both systems simultaneously.
Evidence: `web/ui-core.js:350–363` (`STAGE_TABS`); `web/index.html:117–228`.

### 3. Developer-Centric Terminology Throughout UI (H2 — 🟠 Major)
"Harvest", "ATS", "LLM", "Temperature", "Base Delay (ms)", "Experience Bullets", "Tagline", "reentry_phase" appear in the primary UI without definition or tooltip. Settings expose 12 engineering parameters to end-users.
Evidence: `web/index.html:53,141,205,208,586,634`; `web/state-manager.js:23–33`.

### 4. Phase Action Buttons Shift Unpredictably; No Within-Phase Progress (H6 — 🟠 Major)
Eight action buttons in the chat area show/hide by phase with no count of completion within a phase. The Customise phase reveals 10 sub-tabs with no indication of which are required vs. optional. No within-phase progress indicator shows "3 of 8 experiences reviewed."
Evidence: `web/index.html:182–190`; `web/ui-core.js:353`.

### 5. Position Bar and Header Bar Overloaded (H8 — 🟠 Major)
Header contains 7 interactive elements in a 48px band. Position bar contains up to 9 distinct elements simultaneously. On initial load, most are empty/hidden, making the interface appear broken to first-time users. Workflow bar overflows its container at 1280px viewport width (`styles.css:146`, `gap: 32px`, no `flex-wrap`).
Evidence: `web/index.html:34–107`; `web/styles.css:83–141, 146`.

---

## Persona Reviews — Summary

### Applicant (US-A1 – US-A12)
**Last Updated:** 2026-06-18 | **Score:** 72 ✅ / 11 ⚠️ / 3 ❌

- URL fetch + protected-site guidance, intake confirmation card, clarification pre-population, cover letter with prior-session reuse, screening with prior-response lookup, and finalise/harvest all pass solidly.
- ❌ No `"queued"` session status; the schema only accepts draft/ready/sent (US-A1). New gap GAP-134.
- ❌ NL master CV update entirely absent — structured CRUD only (US-A10, GAP-01 still open).
- ❌ No keyboard shortcut for re-run affordance (US-A12, GAP-14 related).
- ⚠️ Enforced mismatch clarifying questions not guaranteed; LLM may produce gap questions incidentally (US-A2).
- ⚠️ Consolidated JSON diff preview before harvest write not evident (US-A11).
- ⚠️ `"Done — Generate CV →"` label misleads — generates HTML preview, not final PDF.

### UX Expert (US-U1 – US-U9)
**Last Updated:** 2026-06-18 | **Score:** 21 ✅ / 17 ⚠️ / 6 ❌ / 1 🔲

- Workflow bar with active/completed/stale states, inline word-level diff, protected-site guidance, focus management in Settings/Model/Sessions modals all pass.
- ❌ Extracted job metadata fields not inline-editable after URL fetch — `job-input.js:49–84` (US-U2 AC4). New gap GAP-135.
- ❌ No keyboard shortcut or "Approve & Next" for sequential rewrite review when > 3 rewrites (US-U5 AC5).
- ❌ Tab `<div>` elements lack `tabindex="0"` — keyboard-only users cannot activate any viewer tab (US-U7 AC3).
- ❌ Layout scope label invites text changes instead of asserting layout-only protection (US-U9 AC1/7). GAP-125.
- ❌ `styles.css:577, 1584` suppresses focus outline without confirmed styled replacement.
- ⚠️ Layout Undo (`undoInstruction()`) is a non-functional stub — posts a chat message (GAP-25).
- 🔲 No version history with timestamps for generated files (US-U6 AC5).

### Resume Expert (US-R1 – US-R7)
**Last Updated:** 2026-06-18 | **Score:** 14 ✅ / 9 ⚠️ / 4 ❌

- Rewrite constraints (numeric preservation), spell-check pipeline end-to-end, publications ranking, skills dedup, and page-length warning all pass.
- ❌ Keyword frequency weighting absent — `ats_keywords` is a flat LLM list, not position/frequency-weighted (US-R1 AC4).
- ❌ Cross-rewrite terminology consistency not enforced (US-R3 AC4).
- ❌ `candidate_to_confirm` flag invisible in review UI, not excluded from generated output (US-R5 AC4). GAP-127.
- ❌ Rejected rewrites absent from `rewrite_audit`; empty audit when all rejected (US-R6 AC3). GAP-128.
- ⚠️ Skills ordered by years-of-experience, not job relevance within category.
- ⚠️ `skill_add` evidence field not validated non-empty before acceptance.

### Hiring Manager (US-M1 – US-M7)
**Last Updated:** 2026-06-18 | **Score:** 13 ✅ / 13 ⚠️ / 2 ❌ / 1 🔲

- Publications heading logic, page-break-inside avoidance, publication decision persistence, and cover letter tone selection all pass.
- ❌ Cover letter word count uniformly ~250–300w regardless of role type (US-M6). GAP-126.
- ❌ Weak-verb detection logs server-side warning (`cv_orchestrator.py:3954–3956`) but not surfaced to UI (US-M2a/2f).
- ⚠️ Sidebar absent on pages 2+ — visual consistency breaks for multi-page CVs.
- ⚠️ Missing-venue publication warning computed but not rendered (`cv_orchestrator.py:896`).
- ⚠️ Generic fallback summary not blocked from reaching the final PDF (`cv_orchestrator.py:197`).

### Persuasion Expert (US-P1 – US-P6)
**Last Updated:** 2026-06-18 | **Score:** 9 ✅ / 9 ⚠️ / 2 ❌ / 4 🔲

- All four US-P4 bullet-quality checks (action verb, word count, passive voice, result clause) are implemented and blocking — full pass.
- ❌ Cover letter word count check not programmatically enforced — relies solely on LLM prompt (US-P5 AC3). GAP-136.
- ❌ Cover letter CTA check: passive "I look forward to hearing from you" accepted as valid (US-P5 AC4). GAP-137.
- 🔲 Narrative-thread fragmentation detection absent (US-P1 AC3).
- 🔲 Positive-sum metric framing check absent (US-P3 AC2).
- 🔲 Cross-document framing alignment absent (US-P6 AC2/3).
- ⚠️ Summary opening instruction is title-first, not value-identity-first per US-P1 AC1 (`llm_client.py:850`). GAP-138.
- ⚠️ `post_analysis_answers` NOT passed to `generate_professional_summary` (`llm_client.py:754`). GAP-139.

### HR / ATS (US-H1 – US-H8)
**Last Updated:** 2026-06-18 | **Score:** 23 ✅ / 10 ⚠️ / 0 ❌ / 3 🔲

- ATS DOCX structure, keyword matching report, score badge with live refresh, and skills hard/soft separation all pass.
- 🔲 No overlapping date range detection (US-H5 AC4). GAP-33 still open.
- 🔲 LLM skill classification not implemented — heuristic-only (US-H8 AC2).
- 🔲 No UI control for hard/soft skill classification override (US-H8 AC5).
- ⚠️ Font name not explicitly set in `_setup_ats_styles` — relies on python-docx template default.
- ⚠️ `knowsAbout` validation counts entries but does not cross-check against approved skills.

### Accessibility Specialist (US-X1 – US-X3)
**Last Updated:** 2026-06-18 | **Score:** 1 ✅ / 8 ⚠️ / 3 ❌

- Dialog ARIA labelling (`role="dialog" aria-modal aria-labelledby`) passes across all ~9 modal types.
- ❌ Workflow step pills not keyboard-reachable — `<div>` elements, no `tabindex`, no `keydown` handlers (US-X1 AC1).
- ❌ Workflow step states conveyed by colour only — no text alternative (US-X1 AC3).
- ❌ Icon-only controls lack `aria-label`: `#toggle-chat`, `#rename-session-btn`, modal `×` close buttons (US-X3 AC2). GAP-140.
- ⚠️ Tab `<div role="tab">` elements lack `tabindex` (US-X1 AC2).
- ⚠️ Master CV modal and ATS Report modal: no `setInitialFocus`, no `trapFocus`, no `restoreFocus`. GAP-129.
- ⚠️ `#session-conflict-banner` has no `role="alert"` or `aria-live`.
- ⚠️ Status message elements lack `aria-live` (US-X3 AC4).
- ⚠️ Five element types suppress `outline` without `:focus-visible` fallback.

### First-Time User (US-F1 – US-F3)
**Last Updated:** 2026-06-18 | **Score:** 1 ✅ / 7 ⚠️ / 1 ❌

- Stage transition feedback (LLM busy overlay, phase-change system messages) passes.
- ❌ Preview-vs-final generation pipeline invisible — "Done — Generate CV →" produces preview, not deliverable; no explanation distinguishes the two steps (US-F3 AC2).
- ⚠️ All 13 workflow steps visible simultaneously — no progressive disclosure.
- ⚠️ "Harvest", "Customise", "Rewrites" opaque without glossary.
- ⚠️ Job tab has no inline "paste job description here" prompt when empty.
- ⚠️ Welcome modal "Don't show again" permanently dismisses; no way to reopen (GAP-18 related).
- ⚠️ Customise stage reveals 10 sub-tabs at once with no guided order.

### Returning User (US-S1 – US-S3)
**Last Updated:** 2026-06-18 | **Score:** 5 ✅ / 4 ⚠️ / 0 ❌

- Session restore to correct tab, position title + company shown, re-run confirmation modal, layout freshness system, and phase guards all pass.
- ⚠️ No restored-decisions summary on return — GAP-110 still open.
- ⚠️ ↻ re-run icon is `opacity:0` by default, visible on CSS `:hover` only.
- ⚠️ Phase labels opaque: "Custom", "Done" (refinement still active?).
- **NEW:** `final_generation` missing from `SESSION_PHASE_LABELS` / `SESSION_PHASE_LABELS_SHORT` (`web/utils.js:262–285`). GAP-124.

### Power User (US-W1 – US-W3)
**Last Updated:** 2026-06-18 | **Score:** 5 ✅ / 2 ⚠️ / 0 ❌

- Session switching, re-run context preservation, and bulk actions for experiences/skills/achievements/rewrites all pass.
- ⚠️ No bulk accept for spell-check or publications.
- ⚠️ Re-run affordance hover-only (`opacity:0` at rest).
- No keyboard shortcuts for any workflow action.

### Recruiter-Ops (US-O1 – US-O3)
**Last Updated:** 2026-06-18 | **Score:** 7 ✅ / 6 ⚠️ / 1 ❌ / 1 🔲

- Status values (draft/ready/sent), notes capture, archive metadata, file naming, and conflict handling all pass.
- ❌ No cross-session pipeline dashboard — `application_status` not surfaced in sessions modal.
- 🔲 No CSV/JSON export of application status across sessions.
- ⚠️ Finalise file list lacks per-file generation timestamps.
- ⚠️ Preview and final artifacts intermixed in Finalise file list.

### Master CV Curator (US-M1, US-M2, US-M3, US-M4)
**Last Updated:** 2026-06-18 | **Score:** 15 ✅ / 7 ⚠️ / 1 ❌

- Phase enforcement, harvest confirmation, backup-before-write, four publication ingestion paths, and full citation → BibTeX → preview pipeline all pass.
- ❌ `publication_count` stat card shows 0 for BibTeX-only setups (`master_data_routes.py:217`). GAP-92.
- ⚠️ `editor` BibTeX entries silently converted to `author` after one CRUD modal save (`master-cv.js:1448, 1498`). GAP-141.
- ⚠️ Bulk BibTeX import skips required-field validation per entry. GAP-142.
- ⚠️ Phase-enforcement 409 triggers wrong "session open in another tab" banner.
- ⚠️ Dual harvest surfaces with different capabilities and no usage guidance.
- ⚠️ No UI surface for backup/restore despite backend support.

### Trust & Compliance (US-C1 – US-C3)
**Last Updated:** 2026-06-18 | **Score:** 7 ✅ / 7 ⚠️ / 0 ❌ / 2 🔲

- Word-level LCS diff, per-card accept/edit/reject, `rewrite_audit` persistence, harvest-from-approved-only, and factual grounding all pass.
- 🔲 No "AI-proposed" label on summary variants.
- 🔲 No AI attribution option in generated files.
- ⚠️ Persuasion warning panel collapsed by default — bypass possible via "Proceed anyway?" (GAP-130).
- ⚠️ No blocking gate at Customise stage (GAP-131).
- ⚠️ `rewrite_audit` persisted but never surfaced in UI.
- ⚠️ LLM data-transmission disclosure not persistently visible.

### Graphical Designer (US-G1 – US-G3)
**Last Updated:** 2026-06-18 | **Score:** 4 ✅ / 7 ⚠️ / 1 ❌

- Rewrite-card readability, semantic state colour system, layout preview framing, and modal overlays all pass.
- ❌ No CSS custom properties / design token layer (GAP-133).
- ⚠️ Two divergent CV output templates (GAP-132).
- ⚠️ Six parallel button classes for same primary action role.
- ⚠️ Layout tab uses Bootstrap 5; all other tabs use `.action-btn` system (GAP-80).
- ⚠️ 35+ emoji in navigation — platform-inconsistent rendering.

---

## New GAP Candidates Identified in This Review Cycle

The following were identified as new (not in gaps.md as of 2026-04-22) and have been assigned provisional numbers GAP-124 through GAP-142 in `tasks/gaps.md`.

| GAP | Title | Priority | Source |
|-----|-------|----------|--------|
| GAP-124 | `final_generation` missing from SESSION_PHASE_LABELS | HIGH | returning-user.md |
| GAP-125 | Layout scope label invites text changes | HIGH | ux-expert.md |
| GAP-126 | Cover letter word count hardcoded all role types | HIGH | hiring-manager.md |
| GAP-127 | `candidate_to_confirm` skills not rendered/excluded | HIGH | resume-expert.md |
| GAP-128 | Rejected rewrites absent from rewrite_audit | HIGH | resume-expert.md |
| GAP-129 | ATS Report modal lacks focus management | HIGH | accessibility-specialist.md |
| GAP-130 | Persuasion warning panel bypassed by collapse | MED | trust-compliance.md |
| GAP-131 | No Customise-stage blocking gate | MED | trust-compliance.md |
| GAP-132 | Two divergent CV output templates | HIGH | graphical-designer.md |
| GAP-133 | No CSS design token layer | MED | graphical-designer.md |
| GAP-134 | No "queued" session status in schema | LOW | applicant.md |
| GAP-135 | Intake confirmation fields not inline-editable | MED | ux-expert.md |
| GAP-136 | No post-generation cover letter word count check | MED | persuasion-expert.md |
| GAP-137 | Cover letter CTA accepts passive closings | MED | persuasion-expert.md |
| GAP-138 | Summary prompt is title-first not value-identity-first | MED | persuasion-expert.md |
| GAP-139 | `post_analysis_answers` not passed to summary LLM | MED | persuasion-expert.md |
| GAP-140 | Icon-only controls missing aria-label | HIGH | accessibility-specialist.md |
| GAP-141 | editor→author field conversion in BibTeX CRUD modal | MED | master-cv-curator.md |
| GAP-142 | Bulk BibTeX import skips per-entry required-field validation | MED | master-cv-curator.md |

---

**Key source file references across this review cycle:**

- `web/utils.js:262–285` — SESSION_PHASE_LABELS (`final_generation` missing)
- `web/layout-instruction.js:293` — scope label defect
- `scripts/routes/master_data_routes.py:217` — publication stat card count bug
- `scripts/routes/master_data_routes.py:1566` — hardcoded cover letter word count
- `web/master-cv.js:1448, 1498` — editor→author conversion bug
- `scripts/utils/cv_orchestrator.py:1779` — candidate_to_confirm flag set but never rendered
- `web/rewrite-review.js:107, 114, 383–389` — persuasion warning panel collapse bypass
- `web/index.html:95` — empty `aria-label=""` on layout-freshness-chip
- `web/index.html:119–141, 200–225` — step pills and tab divs without tabindex
- `web/app.js:122–125` — click-only tab event wiring
- `scripts/utils/llm_client.py:850` — title-first summary prompt (US-P1 non-compliant)
- `scripts/utils/llm_client.py:754` — `generate_professional_summary` missing `post_analysis_answers`
- `web/rewrite-review.js:361` — only accepted proposals tracked in rewrite_audit
- `ats-modals.js:112` — ATS modal lacks focus management
