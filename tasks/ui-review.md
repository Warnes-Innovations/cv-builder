<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 103 (Full 15-Persona + Heuristic Committee Pass)

**Generated:** 2026-07-07
**Cycle:** 103 (committee-review verification of cycles 102–103's own gap-resolution work, plus a fresh full-app sweep)
**Branch:** `main`
**Sources:** 14 persona sub-agents + 1 heuristic sub-agent, all reading source code directly (source-first — no sub-agent read `tasks/gaps.md` or this file as evidence)
**New gaps discovered:** GAP-376 through GAP-389 (14 new entries; 8 resolved same-cycle, 6 left open and documented)

---

## Why This Cycle Ran

Cycles 102–103 (earlier the same day) resolved 12 gaps unblocked by the GAP-01 merge (`web/index.html`/`web/master-cv.js` no longer off-limits), most centrally making the previously-unreachable Finalise/Archive workflow step reachable. This committee pass was run specifically to verify that work against independent scrutiny rather than self-certification, per the operating goal "resolve remaining gaps to the satisfaction of the committee review." Several personas were explicitly briefed to trace the Finalise-tab fix and the master-cv.js changes end-to-end rather than trust a summary.

**Verdict on the cycle 102/103 fixes:** all 7 flagged master-cv.js changes and the Finalise-tab structural fix were independently confirmed correct by master-cv-curator, recruiter-ops, and hiring-manager. However, the committee pass also found **2 regressions in the Finalise-tab fix itself** (keyboard inaccessibility, a spurious back-nav warning) and **1 unrelated pre-existing critical bug that the fix's own code path exposed** (`download-tab.js`'s `blockingFails` crash) — all fixed in this same cycle. It also found the terminology cleanup (cycles 101–103) was incompletely propagated outside `index.html`, and surfaced two independently severe pre-existing bugs unrelated to any of this branch's recent work (`response_library.json`'s dict/list mismatch, and the "re-run" button silently not re-running).

---

## Summary Counts by Status (approximate, per persona's own report)

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Notes |
|---------|---------|-----------|--------|------------|-------|
| Applicant | 82 | 6 | 3 | 1 | US-A1–A12; 3 fails are data-plumbing bugs (GAP-376, 381, 382) |
| UX Expert | 36 | 13 | 0 | 2 | US-U1–U9; no hard failures |
| Resume Expert | majority | several | 0 | 2 | US-R1–R7; GAP-387 (dead filler-phrase detector) is the standout finding |
| Hiring Manager | majority | several | 0 | 2 | US-M1–M7; Finalise workflow re-verified clean |
| Persuasion Expert | majority | several | 0 | 0 | US-P1–P6; strong existing implementation, some enforcement gaps |
| HR/ATS | majority | 3 | 1 | 1 | US-H1–H8; GAP-377 (download-tab crash) was the critical find |
| Accessibility Specialist | majority | 2 | 2 | 0 | US-X1–X3; GAP-379 (keyboard gap) + GAP-384 (focus-restore) found here |
| First-Time User | majority | several | 0 | 0 | US-F1–F3; GAP-380 (incomplete jargon cleanup) found here |
| Returning User | 9 | 0 | 1 | 0 | US-S1–S3; GAP-378 (re-run bug) + GAP-386 (notes editing gap) found here |
| Power User | majority | 1 | 0 | 0 | US-W1–W3; minor Spell Check bulk-action gap |
| Recruiter Ops | 1 | 3 | 1 | 0 | Finalise/Archive trace; GAP-377 and GAP-378 both independently corroborated here |
| Master CV Curator | majority | 2 | 0 | 0 | All 7 flagged master-cv.js fixes confirmed working end-to-end |
| Trust & Compliance | majority | 1 | 1 | 0 | GAP-383 (format-inconsistent weak-evidence exclusion) is the standout finding |
| Graphical Designer | majority | 1 | 0 | 0 | Independently assessed and partially disputed the GAP-133 inline-styles deferral (see below) |
| Heuristic | — | — | 4 Major/Critical | — | Nielsen H1, H4, H10 🟠; H2 🟡; full table in `tasks/review-status/heuristic.md` |

---

## Fixed This Cycle (all verified with passing regression tests)

| Gap | Severity | Summary |
|-----|----------|---------|
| GAP-376 | CRITICAL | `response_library.json` dict-vs-list mismatch crashed Finalise whenever screening responses existed (normal tab order) |
| GAP-377 | CRITICAL | `_renderDownloadGrid()` `ReferenceError` crashed the entire File Review tab whenever any generated file existed |
| GAP-378 | HIGH | The "↻ Re-run" confirmation modal was wired to plain back-navigation, never actually recomputing — the real recompute function had zero UI callers |
| GAP-379 | HIGH | Two regressions in cycle 102's own Finalise-step-pill fix: keyboard-inaccessible, and a spurious back-nav warning triggered by simultaneous post-layout unlock semantics; plus an invalid ARIA role and a skip-link that scrolled but never moved focus |
| GAP-380 | LOW | "LLM"/"Harvest" terminology cleanup (cycles 101–103) only reached `index.html`; propagated to all user-visible tooltips/messages/headings across ~12 other files |

## Left Open, Documented for a Future Cycle

| Gap | Priority | Summary |
|-----|----------|---------|
| GAP-381 | MEDIUM | `cover_letter_reused_from` metadata field initialized but never assigned |
| GAP-382 | MEDIUM | Screening response metadata has no `reused_from_session` field at all |
| GAP-383 | HIGH | Accepted weak-evidence skills silently excluded from DOCX outputs but not HTML/PDF, no warning |
| GAP-384 | MEDIUM | ~19 Master CV modals use a dead variable instead of the shared focus-restore stack |
| GAP-385 | MEDIUM | "? Help" button has no path back to the onboarding guide since cycle 99's rewiring |
| GAP-386 | MEDIUM | Session notes cannot be set/edited for an active (non-saved) session, only saved ones |
| GAP-387 | MEDIUM | A complete generic-filler-phrase detector exists but is never called from the persuasion pipeline |
| GAP-388 | LOW | "Finalise"/"Archive"/"Package Application Files" used interchangeably across 5 different surfaces |
| GAP-389 | LOW | Finalise tab auto-embeds its own Harvest panel, duplicating the dedicated Update Master CV tab |

---

## Heuristic Findings (Nielsen's 10)

| # | Heuristic | Rating | Key Finding |
|---|-----------|--------|-------------|
| H1 | Visibility of system status | 🟠 Major | Workflow bar marks 6 post-generation steps "completed" the instant files generate, regardless of whether the user touched any of them — the backend phase model has no concept of these steps at all |
| H2 | Match with real world | 🟡 Minor | Jargon cleanup mostly landed this cycle (GAP-380); remaining nits are cosmetic |
| H3 | User control and freedom | 🟢 Good | — |
| H4 | Consistency and standards | 🟠 Major | "Skip to Finalise" used back-button styling for a forward jump (fixed); Finalise/Archive/Package naming split across 5 surfaces (GAP-388, open) |
| H5 | Error prevention | 🟢 Good | BibTeX drop-field guard (GAP-347) now catches the main risk |
| H6 | Recognition vs. recall | 🟢 Good | — |
| H7 | Flexibility and efficiency | 🟡 Minor | Spell Check lacks bulk accept/dismiss unlike every other review stage |
| H8 | Aesthetic and minimalist | 🟡 Minor | — |
| H9 | Error recovery | 🟢 Good | — |
| H10 | Help and documentation | 🟠 Major | "? Help" button has no path back to onboarding (GAP-385, open) |

### Top 5 UX Issues (heuristic reviewer's picks)

1. **False "completed" status** on 6 post-generation workflow steps the instant files generate (H1).
2. **"Harvest → Update Master CV" rename incompletely propagated** — fixed this cycle (GAP-380).
3. **"? Help" button orphaned from onboarding** since cycle 99 (GAP-385, open).
4. **"Skip to Finalise" used back-button styling** for a forward action — fixed this cycle.
5. **"LLM" jargon outside index.html** — fixed this cycle (GAP-380).

---

## Independent Second Opinion: GAP-133 (Inline Styles) Deferral

The graphical-designer persona was specifically asked to independently re-assess cycle 103's decision to leave GAP-133 (~161 inline styles in `index.html`) as a documented follow-up rather than converting them. Their finding: **partially disputes the "mostly unique one-offs" characterization** — only ~101 of 161 are distinct strings; 78 instances (48%) are exact duplicates across 18 repeated groups, with 38 instances alone being three whitespace variants of `display:none` that could be swapped for the already-loaded (but currently unused) Bootstrap `.d-none` class at zero regression risk. Recommends a **narrow follow-up** (the `display:none` consolidation specifically) rather than either doing nothing or converting all 161. No off-palette colors were found — every inline hex value already matches an existing `--cv-*` token, confirming the design-token layer itself is complete. This nuance is recorded here for whoever picks up GAP-133 next; the gaps.md entry itself is left as previously written pending that follow-up decision.

---

## Full Persona Reviews

Full details, acceptance-criteria tables, and file:line evidence are in the per-persona status files under `tasks/review-status/` (all refreshed this cycle):

| Persona | Status file |
|---------|-------------|
| Applicant | `tasks/review-status/applicant.md` |
| UX Expert | `tasks/review-status/ux-expert.md` |
| Resume Expert | `tasks/review-status/resume-expert.md` |
| Hiring Manager | `tasks/review-status/hiring-manager.md` |
| Persuasion Expert | `tasks/review-status/persuasion-expert.md` |
| HR/ATS | `tasks/review-status/hr-ats.md` |
| Accessibility Specialist | `tasks/review-status/accessibility-specialist.md` |
| First-Time User | `tasks/review-status/first-time-user.md` |
| Returning User | `tasks/review-status/returning-user.md` |
| Power User | `tasks/review-status/power-user.md` |
| Recruiter Ops | `tasks/review-status/recruiter-ops.md` |
| Master CV Curator | `tasks/review-status/master-cv-curator.md` |
| Trust & Compliance | `tasks/review-status/trust-compliance.md` |
| Graphical Designer | `tasks/review-status/graphical-designer.md` |
| Heuristic | `tasks/review-status/heuristic.md` |

---

## Previously Tracked Gaps Confirmed Resolved (Cycle 103 Independent Verification)

| Gap | Confirmed by |
|-----|-------------|
| GAP-341 (Finalise tab reachability) | recruiter-ops, master-cv-curator, hiring-manager — structural fix is sound; see GAP-379 for the 2 regressions found in it |
| GAP-309 (duplicate publication modal id) | master-cv-curator, accessibility-specialist |
| GAP-311 (backup restore auto-refresh) | master-cv-curator |
| GAP-312 (phase-lock banner label) | master-cv-curator |
| GAP-346 (skip navigation link) | heuristic, ux-expert — present but see GAP-379 for the tabindex fix needed |
| GAP-347 (BibTeX drop-field guard) | master-cv-curator, resume-expert |
| GAP-352 (session notes indicator) | master-cv-curator, returning-user — indicator confirmed working; see GAP-386 for the separate active-session-editing gap |
| GAP-359 (`domain_relevance` field) | master-cv-curator, resume-expert |
| GAP-367/368 (LLM/Harvest jargon in index.html) | graphical-designer — confirmed clean; see GAP-380 for the rest of the app |
| GAP-371 (summary variant title-casing) | master-cv-curator, resume-expert |
| GAP-310 (achievement bullet editor false-positive) | master-cv-curator — full CRUD confirmed present |

---

*Reviewed against: web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus persona-specific source files (web/master-cv.js, web/finalise.js, web/harvest.js, web/download-tab.js, web/workflow-steps.js, scripts/utils/cv_orchestrator.py, scripts/utils/llm_client.py, scripts/routes/*.py, and others per persona).*
