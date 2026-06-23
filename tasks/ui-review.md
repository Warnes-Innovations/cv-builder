<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV-Builder UI Review — Cycle 6

**Date:** 2026-06-22
**Cycle:** 6 (source-first parallel review — 14 personas + 1 heuristic)

---

## Executive Summary

| Reviewer | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| -------- | ------- | --------- | ------ | ---------- | ----- |
| UX Expert / Heuristic | 32 | 12 | 4 | 1 | 1 |
| Applicant | 96 | 13 | 2 | 1 | — |
| Resume Expert | 17 | 10 | 2 | 0 | 1 |
| Hiring Manager | 29 | 13 | 1 | 0 | — |
| Persuasion Expert | 10 | 10 | 0 | 4 | — |
| HR/ATS | ~18 | ~6 | ~2 | ~2 | — |
| Accessibility Specialist | 9 | 3 | 0 | 0 | — |
| First-Time User | 1 | 8 | 0 | 0 | — |
| Returning User | 5 | 4 | 0 | 0 | — |
| Power User | 2 | 3 | 0 | 0 | — |
| Recruiter Ops | 6 | 3 | 0 | 3 | — |
| Master CV Curator | 4 | 6 | 1 | 0 | — |
| Trust & Compliance | 7 | 2 | 0 | 0 | — |
| Graphical Designer | 5 | 7 | 0 | 0 | — |

**Net improvement from cycle 5:** UX Expert/Heuristic moved from 28P/13Pa/4F/1NI → 32P/12Pa/4F/1NI. 10 gaps confirmed resolved from cycle 5 work.

---

## Confirmed Resolved Since Cycle 5

All the following were verified fixed in source code by cycle 6 agents:

| Gap | Fix | Evidence |
| --- | --- | -------- |
| GAP-166 | Rewrite decisions persisted to `localStorage` per session | `web/rewrite-review.js:_persistDecisions()`, `_restoreDecisions()` |
| GAP-167 | `.step-rerun` converted from `<span>` to `<button>` with `aria-label` and `:focus-within` visibility | `web/workflow-steps.js:702–707` |
| GAP-168 | Sessions modal `openSessionsModal()` calls `setInitialFocus()` | `web/session-switcher-ui.js:458` |
| GAP-169 (chat) | `#spell-btn` label changed to "Generate Preview →" | `web/index.html:186` |
| GAP-170 | `#llm-busy-label` has `aria-live="polite" role="status"` | `web/index.html:155` |
| GAP-171 | Category reorder ↑↓ buttons have `aria-label` | `web/skills-review.js:423–424` |
| GAP-172 | Step pills append `.sr-only` state text | `web/workflow-steps.js:715–726` |
| GAP-173 | `.action-btn`, `.tab`, `.step` have `:focus-visible` CSS | `web/styles.css` |
| GAP-179 | `.icon-btn`, `.rw-btn`, `.sm-btn` `:focus-visible` rules added | `web/styles.css` (cycle 6 fix) |
| GAP-181 | Viewer-panel spell-check buttons relabelled "Generate Preview →" | `web/spell-check.js:148,271` (cycle 6 fix) |

**Residual (partially resolved):**

- **GAP-166 cross-device**: localStorage approach works for same-device reloads; cold-restore from a different device or cleared storage still requires re-deciding all rewrites. Backend persistence would fully close this.

---

## Top 5 UX Issues (Cycle 6)

### 1. First-Time User Onboarding Gap (GAP-36) — CRITICAL

All 13 workflow steps are visible at load, with no progress indicator, no welcome screen, and no contextual guidance. First-time users have no clear starting point. The "Not ready" LLM badge reads as an error state.

### 2. Cover Letter Missing Company Context (GAP-174) — HIGH

The cover letter LLM prompt receives structured `job_analysis` fields but not the raw job posting text or company-specific content (initiatives, products, values). Every letter is structurally sound but generically voiced.

### 3. Bullet-Reorder Modal Missing Accessibility Structure (GAP-176) — HIGH

`showBulletReorder()` (`workflow-steps.js:456–499`) renders a list-reorder modal with no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no focus entry, no focus trap, and no focus restoration on close. Screen reader users cannot interact with it.

### 4. candidate_to_confirm Skills Flow Into Output — HIGH

Skills with `evidence_strength === 'weak'` (marked ⚠ in UI) are not filtered in `_organize_skills_by_category()` (`cv_orchestrator.py:583–595`). They appear in the generated PDF/DOCX without qualification.

### 5. Clarifying Questions Rendered Flat (GAP-55) — HIGH

All clarifying questions are rendered in a single scrollable list with no grouping, paging, or topic separation. Users presented with 15+ questions face significant cognitive overload.

---

## Nielsen's 10 Heuristics Summary

| # | Heuristic | Rating | Key Issue |
| --- | --------- | ------ | --------- |
| H1 | Visibility of system status | 🟡 Minor | LLM status readable; step pills informative; but no global progress % |
| H2 | Match between system and real world | 🟡 Minor | "Rewrite review" / "spell check" are internal terms; "Generate Preview" now clearer |
| H3 | User control and freedom | 🟠 Major | Re-run modals confirm; but no undo for bulk accept/reject; no back-nav within phase |
| H4 | Consistency and standards | 🟡 Minor | Some label inconsistencies remain; button styling somewhat unified |
| H5 | Error prevention | 🟡 Minor | Required fields gated; rewrites gated; spell-check is soft gate only |
| H6 | Recognition rather than recall | 🟠 Major | Clarifying questions flat list; step meanings non-obvious without hover |
| H7 | Flexibility and efficiency | 🟡 Minor | Re-run now keyboard-accessible; no primary-action keyboard shortcuts |
| H8 | Aesthetic and minimalist design | 🟡 Minor | 96 hardcoded hex values; 218 inline style attrs; emoji in steps |
| H9 | Help recover from errors | 🟡 Minor | Retry messages present; no in-app error log |
| H10 | Help and documentation | 🟠 Major | No in-app help; workflow stage meaning requires prior knowledge |

---

## New Gaps Identified (GAP-176 through GAP-181)

| Gap | Priority | Summary |
| --- | -------- | ------- |
| GAP-176 | HIGH | Bullet-reorder modal missing `role="dialog"`, focus trap, `aria-labelledby` |
| GAP-177 | MED | Human DOCX section headings use bold runs, not Word Heading paragraph styles |
| GAP-178 | LOW | Rewrite accept/edit/reject buttons lack `aria-pressed` state |
| GAP-179 | MED | `.icon-btn`, `.rw-btn`, `.sm-btn` missing `:focus-visible` CSS → FIXED this cycle |
| GAP-180 | MED | Step-rerun button `opacity:0` at rest — mouse users who don't hover never see it |
| GAP-181 | MED | Viewer-panel spell-check buttons still "Done — Generate CV →" → FIXED this cycle |

---

## Per-Persona Findings

### Applicant (96P / 13Pa / 2F / 1NI)

**Key change from cycle 5:** US-A12 ↻ keyboard reachability promoted from ❌ Fail to ⚠️ Partial (GAP-167 converts span to button; acceptance criterion requires keyboard shortcut, not only progress-bar access).

**Still failing:**

- US-A10: Natural-language master CV update — not implemented (2 criteria)

**Key partials:** session "queued" status, publications reorder, consolidated JSON diff before harvest, clarification amendment at re-run, re-run audit log.

---

### UX Expert / Heuristic (32P / 12Pa / 4F / 1NI)

**Confirmed resolved:** GAP-166–173, GAP-NEW-D (intake focus replacement), GAP-U12 (freshness chip aria-label).

**Still failing (3 persistent):**

1. US-U3 AC4 — Clarifying questions rendered flat, no paged grouping
2. US-U5 AC5 — No "Approve & Next" keyboard navigation for rewrites
3. US-U8 AC2 — Review table columns not responsive at 1400px

**New gaps:** GAP-U15/GAP-179 (`.icon-btn`/`.rw-btn` focus-visible → fixed), GAP-U16/GAP-180 (step-rerun zero discoverability at rest).

---

### Resume Expert (17P / 10Pa / 2F / 1 N/A)

**Hard failures:**

1. US-R1 AC4 — Keyword frequency weighting: `ats_keywords` is flat list, no title/repetition boost
2. US-R3 AC4 — No cross-rewrite consistency check; rewrites proposed independently

**Critical partial:** `candidate_to_confirm` skills flow into output without filtering (`cv_orchestrator.py:583–595`).

---

### Hiring Manager (29P / 13Pa / 1F)

**Hard failure:** US-M6 (cover letter) — no mechanism to inject company-specific intelligence (GAP-174 remains).

**Partials:** Action-verb warnings server-side only (not surfaced in UI); no minimum 2-bullet gate; cover letter at ~250–300 words (below story's 300w floor); no role-type word-count tiers.

---

### Persuasion Expert (10P / 10Pa / 0F / 4NI)

**Persistent gaps:** No narrative-fragmentation detection, no positive-sum framing preference, no cross-document framing check, cover-letter word-count ceiling 400 vs. story's 300, CTA check accepts passive closes, `post_analysis_answers` does not flow to `generate_professional_summary`.

---

### HR/ATS

**Hard failures:**

1. Hard/soft skill classification is rule-based heuristic, not LLM (GAP-H1)
2. `skill_type` never written back to `Master_CV_Data.json` (GAP-H2)

**Partials:** No per-skill UI toggle; month-required enforcement absent; `knowsAbout` only validates count (not membership); bonus ★ not per-row; ATS DOCX normal font not set to Calibri.

---

### Accessibility Specialist (US-X1: 4/4, US-X2: 3/4, US-X3: 2/4)

**All cycle 5 fixes confirmed:** Steps 2–12 keyboard-reachable, sr-only state text, sessions modal focus, category reorder aria-label, aria-live on LLM status, focus-visible CSS.

**Open findings (cycle 6):**

1. `#message-input` no accessible label (`index.html:177`, GAP-35)
2. Bullet-reorder modal has no `role="dialog"`, focus trap, or aria structure (GAP-176)
3. Human DOCX headings: bold runs, not Word Heading paragraph styles (GAP-177)
4. `.icon-btn`, `.rw-btn`, `.sm-btn` lack `:focus-visible` CSS (GAP-179) → **FIXED this cycle**
5. Rewrite accept/edit/reject buttons lack `aria-pressed` (GAP-178)
6. Four input types use `outline:none` without `:focus-visible` replacement
7. Single `_currentFocusTrapListener` cannot handle nested modals
8. Emoji in tabs/steps not wrapped in `aria-hidden` spans

---

### First-Time User (1P / 8Pa / 0F)

**GAP-169 residual:** viewer-panel spell buttons "Done — Generate CV →" at `spell-check.js:148,271` → **FIXED this cycle** (GAP-181).

**Top open:** GAP-79 (viewer-panel pipeline explanation), GAP-78 (all 13 steps visible at load), GAP-14 (no progress indicator), GAP-76 (LLM "Not ready" alarms new users).

---

### Returning User (5P / 4Pa / 0F)

**GAP-166 partially resolved:** Same-device reloads now restore rewrite decisions via localStorage. Residual gap for cross-device or cleared-storage restores.

**Open partials:** No "welcome back" summary on restore, re-run vs. navigation distinction hover/tooltip only, ↻ button zero-opacity at rest.

---

### Power User (2P / 3Pa / 0F)

**Confirmed fixed:** GAP-167 (keyboard-reachable ↻), GAP-166 (localStorage decisions), GAP-169 (label).

**Open:** No primary-action keyboard shortcut, no session search, no changed-item count after re-run, no bulk-decision undo.

---

### Recruiter Ops (6P / 3Pa / 0F / 3NI)

**Open gaps:** No preflight check before archive (GAP-OPS-C), `application_status` not shown in sessions modal (GAP-OPS-D), no per-file timestamp (GAP-OPS-E), ATS score not flagged as unchecked at finalise.

---

### Master CV Curator (4P / 6Pa / 1F)

**Hard failure:** Publications overview stat card reads `data.get('publications', [])` (returns list from JSON, not BibTeX dict) → shows 0 when bibliography is non-empty. Fix: `master_data_routes.py:214` — change to `len(orchestrator.publications or {})`.

**Partials:** Bulk BibTeX import doesn't validate required fields per entry; 409 phase-enforcement caught by session-conflict handler (wrong semantic); harvest section not labelled as optional; summary variants can be corrupted on CRUD edit.

---

### Trust & Compliance (7P / 2Pa / 0F)

**Partials:** Spell-check is a soft gate (bulk-ignore can bypass per-item review); `metadata.json` audit log requires opening from disk (no in-browser rendering); no AI attribution metadata in generated PDF/DOCX.

---

### Graphical Designer (5P / 7Pa / 0F)

**Confirmed fixed:** GAP-173 (focus-visible), GAP-169 (label), GAP-170 (aria-live).

**Persistent:** No CSS custom properties (96 hardcoded hex values, GAP-133); two divergent CV templates not disclosed (GAP-132); six parallel button classes maintaining geometry independently.

---

## Most Critical Open Gaps (post-cycle 6)

| Priority | Gap | Description |
| -------- | --- | ----------- |
| HIGH | GAP-36 | First-run onboarding — no welcome screen, all steps visible, unclear start |
| HIGH | GAP-174 | Cover letter no company-specific injection |
| HIGH | GAP-176 | Bullet-reorder modal inaccessible (no dialog role, no focus trap) |
| HIGH | GAP-41 | Pre-job Master CV editor missing |
| HIGH | GAP-14 | No workflow progress indicator |
| MED | GAP-175 | Summary specificity validator absent |
| MED | GAP-132 | Divergent CV templates (cv-template.html vs cv-style.css) |
| MED | GAP-133 | No CSS custom properties — theming impossible |
| MED | GAP-79 | Viewer-panel pipeline unclear for first-time users |
| MED | GAP-55 | Clarifying questions flat list — cognitive overload |
