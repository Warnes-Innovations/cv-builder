<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV-Builder UI Review — Cycle 7

**Date:** 2026-06-22
**Cycle:** 7 (source-first parallel review — 14 personas + 1 heuristic)

---

## Executive Summary

| Reviewer | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| -------- | ------- | --------- | ------ | ---------- | ----- |
| UX Expert / Heuristic | 34 | 11 | 4 | 1 | — |
| Applicant | ~96 | ~13 | ~2 | ~2 | — |
| Resume Expert | 17 | 10 | 2 | 0 | 1 |
| Hiring Manager | 29 | 14 | 0 | 0 | — |
| Persuasion Expert | 10 | 10 | 0 | 4 | — |
| HR/ATS | ~18 | ~6 | ~2 | 0 | — |
| Accessibility Specialist | 10 | 2 | 0 | 0 | — |
| First-Time User | 1 | 8 | 0 | 0 | — |
| Returning User | 5 | 4 | 0 | 0 | — |
| Power User | 3 | 2 | 0 | 0 | — |
| Recruiter Ops | 6 | 3 | 0 | 3 | — |
| Master CV Curator | 4 | 6 | 1 | 0 | — |
| Trust & Compliance | 7 | 2 | 0 | 0 | — |
| Graphical Designer | 5 | 7 | 0 | 0 | — |

**Net improvement from cycle 6:** UX Expert moved 32P/12Pa → 34P/11Pa (US-U7 fully passing). Hiring Manager ❌ cleared (GAP-174 company context closed US-M6 hard failure). Accessibility Specialist US-X2 now 4/4 (bullet-reorder modal fully accessible). Power User W3.1 promoted to ✅ (GAP-180 opacity fix).

---

## Confirmed Resolved Since Cycle 6

All the following were verified fixed in source code by cycle 7 agents:

| Gap | Fix | Evidence |
| --- | --- | -------- |
| GAP-166 | Rewrite decisions persisted to `localStorage` per session | `web/rewrite-review.js:46,53,64,185` |
| GAP-174 | Company context textarea in cover letter generation | `web/cover-letter.js:130–131,251`; `scripts/routes/master_data_routes.py:1556–1558` |
| GAP-176 | Bullet-reorder modal `role="dialog"`, focus trap, Escape handler | `web/workflow-steps.js:463–514` |
| GAP-178 | `aria-pressed` on accept/edit/reject rewrite buttons | `web/rewrite-review.js:306–308,325,342,360` |
| GAP-179 | `:focus-visible` on `.sm-btn`, `.icon-btn`, `.rw-btn` | `web/styles.css:296,1195,1263` |
| GAP-180 | Step-rerun button `opacity:0.35` at rest (was 0) | `web/workflow-steps.js:733` |
| GAP-181 | Viewer-panel spell-check buttons labelled "Generate Preview →" | `web/spell-check.js:148,271` |

---

## Top 5 UX Issues (Cycle 7)

### 1. First-Time User Onboarding Gap (GAP-36) — CRITICAL

All 13 workflow step pills visible at load with no staged disclosure, no welcome screen, and no contextual guidance. The "Not ready" LLM badge renders in red with no onboarding context.

### 2. Publications Stat Card Shows 0 (GAP-M4) — HIGH

`master_data_routes.py:214` — `len(data.get('publications', []))` always returns 0. Publications live in `publications.bib` as `orchestrator.publications` (a dict), not in `Master_CV_Data.json`.

### 3. `candidate_to_confirm` Skills in Generated Output (GAP-R-5) — HIGH

Skills with `evidence_strength === 'weak'` are flagged ⚠️ in the review UI but `_organize_skills_by_category()` (`cv_orchestrator.py:583–595`) does not filter them. They appear unmarked in all generated PDF/DOCX/HTML output.

### 4. No Session `application_status` in Sessions Modal (GAP-OPS-D) — MED

`GET /api/sessions` never reads `metadata.json`, so `application_status` (draft/ready/sent) is not surfaced in the Sessions modal. Users cannot see pipeline state across sessions.

### 5. `.action-btn.secondary` Has No CSS Rule (GAP-G4) — MED

`action-btn.secondary` is used in 8 places (`index.html:307`, `master-cv.js:77,166,171,176,204,206,434`) but no CSS rule defines its appearance — buttons silently fall back to the default grey `.action-btn` style, making Cancel and secondary actions visually indistinguishable.

---

## Nielsen's 10 Heuristics Summary

| # | Heuristic | Rating | Key Issue |
| --- | --------- | ------ | --------- |
| H1 | Visibility of system status | 🟡 Minor | LLM status readable; step pills informative; no global progress % |
| H2 | Match between system and real world | 🟡 Minor | "Rewrite review" / "spell check" are internal terms; step labels improved |
| H3 | User control and freedom | 🟠 Major | Re-run modals confirm; no undo for bulk accept/reject; no back-nav within phase |
| H4 | Consistency and standards | 🟡 Minor | `.action-btn.secondary` undefined (GAP-G4); label inconsistencies reduced |
| H5 | Error prevention | 🟡 Minor | Required fields gated; rewrites gated; spell-check is soft gate only |
| H6 | Recognition rather than recall | 🟠 Major | Clarifying questions flat list; step meanings non-obvious without hover |
| H7 | Flexibility and efficiency | 🟢 Good | Re-run keyboard-accessible; step-rerun now visible at rest (GAP-180 fixed) |
| H8 | Aesthetic and minimalist design | 🟡 Minor | 96 hardcoded hex values; 218 inline style attrs; emoji in steps |
| H9 | Help recover from errors | 🟡 Minor | Retry messages present; no in-app error log |
| H10 | Help and documentation | 🟠 Major | No in-app help; workflow stage meaning requires prior knowledge |

---

## New Gaps Identified (Cycle 7)

| Gap | Priority | Summary |
| --- | -------- | ------- |
| GAP-182 | MED | `.action-btn.secondary` has no CSS definition — 8 usages fall back to default grey (GAP-G4) |
| GAP-35 | LOW | `#message-input` has no accessible label (aria-label or associated `<label>`) — confirmed by accessibility and applicant agents |

---

## Per-Persona Findings

### Applicant (~96P / ~13Pa / ~2F / ~2NI)

**All 7 cycle 6+ fixes verified:** GAP-166, 174, 176, 178, 179, 180, 181 all confirmed in source.

**Still failing:**

- US-A3: Publications — no up/down reorder controls
- US-A12: No session audit log for re-run events (no timestamp, no affected-count)
- US-A12: No keyboard shortcut / menu alternative for ↻ re-run

**Not implemented:** US-A10 (natural-language master CV update, document ingestion from paste/LinkedIn)

---

### UX Expert / Heuristic (34P / 11Pa / 4F / 1NI)

**Improvements:** US-U7 now 6/0/0 (was 6/1/0). GAP-U15 closed.

**Still failing (4 persistent):**

1. US-U3 AC4 — Clarifying questions rendered flat, no paged grouping
2. US-U4 AC6 — No numeric relevance score with scale shown
3. US-U5 AC5 — No "Approve & Next" keyboard navigation for rewrites
4. US-U8 AC2 — Review table columns not responsive at ≤1400px

---

### Resume Expert (17P / 10Pa / 2F / 1 N/A)

**Hard failures (unchanged):**

1. US-R1 AC4 — Keyword frequency weighting: `ats_keywords` is flat list, no title/repetition boost
2. US-R3 AC4 — No cross-rewrite consistency check; rewrites proposed independently

**Critical partial:** `candidate_to_confirm` skills flow into output without filtering (`cv_orchestrator.py:583–595`).

---

### Hiring Manager (29P / 14Pa / 0F)

**Improvement:** US-M6 ❌ → ⚠️ (GAP-174 resolved — company context mechanism exists; auto-extraction from job posting not yet implemented).

**Persistent partials:** No minimum 2-bullet gate; cover letter ~250–300w (below 300w floor); no role-type word-count tiers; `persuasion_warnings` computed but never surfaced in UI.

---

### Persuasion Expert (10P / 10Pa / 0F / 4NI)

Unchanged from cycle 6. Six new gap proposals (GAP-P-01 through GAP-P-06) documented in persona status file covering: narrative fragmentation detection, positive-sum framing, cover-letter CTA, `post_analysis_answers` not flowing to summary generation, and `authority_signals` not rendered as distinct badges.

---

### HR/ATS (~18P / ~6Pa / ~2F)

**Three high-priority gaps remain:**

1. GAP-H1 — `_classify_skill_type()` is rule-based heuristic, not LLM; novel names default to `'hard'`
2. GAP-H2 — `skill_type` never written back to `Master_CV_Data.json`; recomputed each session
3. GAP-H3 — No per-skill hard/soft override toggle in `skills-review.js`

**Lower-priority:** Month-only date validation, `knowsAbout` count-only check, Bonus ★ row icon, ATS DOCX Normal font unset, keyword density ceiling absent.

---

### Accessibility Specialist (US-X1: 4/4, US-X2: 4/4, US-X3: 2+/4)

**US-X2 now 4/4** — all four cycle 6 fixes confirmed (GAP-176, GAP-178, GAP-179, GAP-180).

**Remaining open:**

1. GAP-35 — `#message-input` (`index.html:177`) has no accessible label
2. GAP-177 — Human DOCX headings: bold runs, not Word Heading paragraph styles
3. `outline:none` on four input types without High Contrast fallback
4. Single `_currentFocusTrapListener` cannot handle nested modals
5. Emoji in tabs/steps not wrapped in `aria-hidden` spans

---

### First-Time User (1P / 8Pa / 0F)

**GAP-181 verified closed.** Remaining top issues: GAP-78 (all 13 steps visible at load), GAP-79 (viewer-panel pipeline unexplained), GAP-14 (no progress indicator), GAP-76 (LLM "Not ready" badge alarms new users), post-download optional steps have no "Optional" label.

---

### Returning User (5P / 4Pa / 0F)

**GAP-166 confirmed implemented** with full line-number evidence (`rewrite-review.js:46,53,64,185`). Residual: no welcome-back summary on restore; back-nav vs re-run distinction is hover/tooltip only; cross-device/cleared-storage restores still lose decisions (requires backend persistence).

---

### Power User (3P / 2Pa / 0F)

**US-W3.1 now ✅** (GAP-180 opacity fix confirmed). Still open: no primary-action keyboard shortcut, no session search, no changed-item count after re-run, no bulk-decision undo.

---

### Recruiter Ops (6P / 3Pa / 0F / 3NI)

Unchanged. GAP-OPS-C (no readiness gate before archive), GAP-OPS-D (sessions modal omits `application_status`), GAP-OPS-E (no per-file timestamp). Additional concern: when ATS scoring is skipped, Finalise tab shows no "not scored" warning.

---

### Master CV Curator (4P / 6Pa / 1F)

**❌ confirmed:** `master_data_routes.py:214` — `len(data.get('publications', []))` returns 0; fix is `len(orchestrator.publications or {})`.

**Partials:** Bulk BibTeX import doesn't enforce per-entry required fields; 409 phase-enforcement triggers misleading "session conflict" amber banner; two harvest surfaces (harvest tab vs. finalise section) have different capabilities with no UI explanation; harvest section not labelled as optional.

---

### Trust & Compliance (7P / 2Pa / 0F)

Unchanged. Soft spell-check gate can be bypassed; no in-browser audit trail rendering at Download/Finalise; no AI attribution metadata in generated PDF/DOCX.

---

### Graphical Designer (5P / 7Pa / 0F)

**GAP-180 confirmed ✅.** New gap: GAP-182/GAP-G4 — `.action-btn.secondary` undefined.

**Persistent:** No CSS custom properties (96 hardcoded hex), divergent HTML vs DOCX templates, six parallel button classes maintaining geometry independently.

---

## Most Critical Open Gaps (post-cycle 7)

| Priority | Gap | Description |
| -------- | --- | ----------- |
| HIGH | GAP-36 | First-run onboarding — no welcome screen, all steps visible, unclear start |
| HIGH | GAP-M4 | Publications stat card always shows 0 (data.get bug) |
| HIGH | GAP-R-5 | `candidate_to_confirm` skills appear in generated output without warning |
| HIGH | GAP-41 | Pre-job Master CV editor missing |
| HIGH | GAP-14 | No workflow progress indicator |
| MED | GAP-182 | `.action-btn.secondary` has no CSS definition |
| MED | GAP-OPS-D | Sessions modal omits `application_status` |
| MED | GAP-H1/H2/H3 | skill_type heuristic-only, not persisted, no UI toggle |
| MED | GAP-177 | Human DOCX section headings use bold runs, not Word Heading styles |
| MED | GAP-35 | `#message-input` has no accessible label |
