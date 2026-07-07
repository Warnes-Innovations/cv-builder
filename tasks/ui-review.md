<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CV Builder UI Review — Cycle 93 (Full 15-Persona + Heuristic)

**Generated:** 2026-07-06
**Cycle:** 93 (post-cycle-92 full discovery run)
**Branch:** `feature/multi-user-deployment`
**Sources:** 14 persona sub-agents + 1 heuristic sub-agent, all reading source code directly
**New gaps discovered:** GAP-341 through GAP-375 (35 new entries)

---

## Summary Counts by Status

| Persona | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Notes |
|---------|---------|-----------|--------|------------|-------|
| Applicant | ~122 | ~6 | ~2 | ~3 | 133 criteria across US-A1–A12 |
| UX Expert | majority | 3 new | 0 | 0 | US-U1–U9 |
| Resume Expert | majority | 2 | 1 | 0 | US-R* |
| Hiring Manager | majority | 2 | 1 | 0 | US-M* |
| Persuasion Expert | partial | 2 | 1 | 0 | US-P1–P5 |
| HR/ATS | majority | 2 | 1 | 0 | US-H* |
| Accessibility | majority | 2 | 1 | 0 | US-X* |
| First-Time User | majority | 2 | 1 | 0 | US-F* |
| Returning User | 9/9 | 0 | 0 | 0 | US-S* all pass; 2 new story items proposed |
| Power User | majority | 2 | 1 | 0 | US-W* |
| Recruiter Ops | majority | 1 | 1 | 0 | US-O* |
| Master CV Curator | majority | 2 | 1 | 0 | US-M* (master-cv.js OFF-LIMITS) |
| Trust & Compliance | majority | 1 | 1 | 0 | US-C* |
| Graphical Designer | majority | 1 | 1 | 0 | US-G* |
| Heuristic | — | — | 5 Major | — | Nielsen H1–H10 + 8 dimensions |

---

## Top Acceptance-Criteria Gaps (by impact)

| Priority | Gap | Persona(s) | Summary |
|----------|-----|-----------|---------|
| CRITICAL | GAP-341 | Recruiter Ops | Finalise/archive tab structurally unreachable — 4 independent barriers |
| HIGH | GAP-342 | Resume Expert | `candidate_to_confirm` skills leak into human DOCX (one-liner fix) |
| HIGH | GAP-343 | Trust & Compliance | Cover letter LLM system prompt has no anti-fabrication clause |
| HIGH | GAP-344 | Persuasion Expert | Only 3/10 persuasion checks applied to cover letter body |
| HIGH | GAP-345 | Persuasion Expert | CAR structure check severity is `'info'` — zero enforcement, invisible |
| HIGH | GAP-346 | Accessibility | No skip navigation link — WCAG 2.4.1 Level A violation |
| HIGH | GAP-347 | Master CV Curator | Publication edit modal silently drops non-hardcoded BibTeX fields on save |
| HIGH | GAP-348 | Power User | `kb-focused` CSS missing for DataTable rows — keyboard nav invisible |
| HIGH | GAP-349 | Power User | `?` header button opens wrong modal; shortcut panel undiscoverable |
| HIGH | GAP-350 | HR/ATS | Advisory ATS failures counted as blocking in readiness chip |
| HIGH | GAP-351 | First-Time User | Customise stage exposes 9 sub-tabs simultaneously with no guidance |

---

## Heuristic Findings (Nielsen's 10)

| # | Heuristic | Rating | Key Finding |
|---|-----------|--------|-------------|
| H1 | Visibility of system status | 🟡 Minor | Processing spinner adequate; ATS chip conflates advisory and blocking |
| H2 | Match with real world | 🟠 Major | "LLM", "Harvest", "Reasoning…", "candidate_to_confirm" are developer jargon |
| H3 | User control and freedom | 🟡 Minor | Bulk undo missing for publications and rewrite panels |
| H4 | Consistency and standards | 🟠 Major | Two uncoordinated nav systems; primary actions split across left/right panels |
| H5 | Error prevention | 🟡 Minor | Advisory vs. blocking ATS not visually distinct; no extracted-field confirmation |
| H6 | Recognition vs. recall | 🟡 Minor | Keyboard shortcuts undiscoverable; no visit indicators on 9-tab customise stage |
| H7 | Flexibility and efficiency | 🟡 Minor | DataTable kb-focused CSS missing; publications bulk has no undo |
| H8 | Aesthetic and minimalist | 🟠 Major | Header+position bar: 15+ interactive elements; File Review: 14 vertical sections |
| H9 | Error recovery | 🟡 Minor | BibTeX field drop is silent; no pre-generation page length warning |
| H10 | Help and documentation | 🟡 Minor | `?` button goes to wrong place; onboarding is jargon-heavy for non-developers |

### Top 5 Heuristic Issues (Most Likely to Cause Abandonment)

1. **Dual navigation systems create disorientation** (H4/Cognitive Load/IA) — 12-step bar + 22-tab bar uncoordinated; `STAGE_TABS` mapping is a hidden implementation detail users must infer.
2. **Primary action buttons split across left and right panels** (H4/Workflow Momentum) — workflow-advance actions in left chat; stage-navigation in right document viewer — forces cross-panel attention zigzag.
3. **Header and position bar overloaded** (H8/Cognitive Load) — 15+ distinct interactive elements; LLM selector alone nests 5 sub-elements.
4. **First-run onboarding is developer-centric** (H2/H10) — requires `Master_CV_Data.json` and LLM API key; welcome modal shows raw filesystem path.
5. **File Review tab information-overloaded at critical submission step** (H8) — up to 14 vertical sections; blocking vs. advisory failures share similar amber styling.

---

## New Gaps Added This Cycle (GAP-341 through GAP-375)

See `tasks/gaps.md` for full details.

### Critical / High Priority

- **GAP-341** — Finalise/archive tab structurally unreachable
- **GAP-342** — `candidate_to_confirm` skills leak into human DOCX
- **GAP-343** — Cover letter system prompt has no anti-fabrication clause
- **GAP-344** — Only 3/10 persuasion checks on cover letter body
- **GAP-345** — CAR structure check has zero enforcement weight
- **GAP-346** — No skip navigation link (WCAG Level A)
- **GAP-347** — Publication edit modal silently drops BibTeX fields on save
- **GAP-348** — `kb-focused` CSS missing for DataTable rows
- **GAP-349** — Keyboard shortcut `?` button goes to wrong modal
- **GAP-350** — Advisory ATS counted as blocking in readiness chip
- **GAP-351** — 9 customise sub-tabs exposed simultaneously with no guidance

### Medium Priority

- **GAP-352** — Session notes invisible during active session workspace
- **GAP-353** — Professional summary never post-validated after generation
- **GAP-354** — Review sub-tabs lack arrow-key navigation
- **GAP-355** — CV template heading hierarchy skips (h2→h4, div not h3)
- **GAP-356** — Cover letter company check passes without substance
- **GAP-357** — Publication scoring over-weights recency, ignores required_skills
- **GAP-358** — No pre-generation page length estimate surfaced to user
- **GAP-359** — experience domain_relevance absent from Master CV CRUD modal
- **GAP-360** — "Blocked formats" footer appears when nothing is blocked (one-line fix)
- **GAP-361** — Role-type/mismatch gap analysis missing from job analysis display
- **GAP-362** — Prior-session clarification answers not pre-populated across sessions
- **GAP-363** — Screening LLM call doesn't inject post-analysis clarification answers
- **GAP-364** — Layout sub-phase has 4 action buttons with no sub-step indicator
- **GAP-365** — `.intake-confirm-card` CSS exists but extracted-field confirmation is unwired
- **GAP-366** — Publications and rewrite bulk actions lack undo

### Low Priority

- **GAP-367** — "LLM" / developer jargon in header and status copy
- **GAP-368** — "Harvest" step label is an opaque metaphor
- **GAP-369** — Single-session auto-resume has no explicit notification
- **GAP-370** — Default archive status is "queued" — wrong for completed workflow
- **GAP-371** — Summary variant key exposed as display label (no display-name field)
- **GAP-372** — Executive/academic cover letter word count bounds possibly still below spec
- **GAP-373** — Hard/soft skill type toggle doesn't trigger ATS refresh
- **GAP-374** — LLM disclosure fires only at analyzeJob(), not at other LLM call sites
- **GAP-375** — Summary validator doesn't check for job title or years-of-experience mention

---

## Full Persona Reviews

Full details are in the per-persona status files under `tasks/review-status/`:

| Persona | Status file | Date |
|---------|-------------|------|
| Applicant | `tasks/review-status/applicant.md` | 2026-07-06 |
| UX Expert | `tasks/review-status/ux-expert.md` | 2026-07-06 |
| Resume Expert | `tasks/review-status/resume-expert.md` | 2026-07-06 |
| Hiring Manager | `tasks/review-status/hiring-manager.md` | 2026-07-06 |
| Persuasion Expert | `tasks/review-status/persuasion-expert.md` | 2026-07-06 |
| HR/ATS | `tasks/review-status/hr-ats.md` | 2026-07-06 |
| Accessibility | `tasks/review-status/accessibility-specialist.md` | 2026-07-06 |
| First-Time User | `tasks/review-status/first-time-user.md` | 2026-07-06 |
| Returning User | `tasks/review-status/returning-user.md` | 2026-07-06 |
| Power User | `tasks/review-status/power-user.md` | 2026-07-06 |
| Recruiter Ops | `tasks/review-status/recruiter-ops.md` | 2026-07-06 |
| Master CV Curator | `tasks/review-status/master-cv-curator.md` | 2026-07-06 |
| Trust & Compliance | `tasks/review-status/trust-compliance.md` | 2026-07-06 |
| Graphical Designer | `tasks/review-status/graphical-designer.md` | 2026-07-06 |
| Heuristic | `tasks/review-status/heuristic.md` | 2026-07-06 |

### Key Findings by Persona

**Applicant (US-A1–A12):** ~122 pass / ~11 partial-or-fail. Role-type mismatch analysis computed but not shown (GAP-361). Prior-session clarification answers never pre-populated (GAP-362). Screening LLM call ignores session clarification answers (GAP-363).

**UX Expert (US-U1–U9):** Layout phase 4-button sub-flow lacks sub-step indicator (GAP-364). `.intake-confirm-card` CSS exists but intake confirmation is unwired (GAP-365). "LLM" header jargon (GAP-367).

**Resume Expert (US-R*):** Human DOCX `_generate_human_docx` never filters `candidate_to_confirm` skills — one-liner fix at `cv_orchestrator.py:4938` (GAP-342). Publication scoring ignores `required_skills` (GAP-357). No pre-generation page length warning (GAP-358).

**Hiring Manager (US-M*):** `_validate_summary()` doesn't verify job title or years-of-experience mention (GAP-375). `companyCheck` counts name occurrences, not substance (GAP-356). Word count bounds possibly still below spec (GAP-372).

**Persuasion Expert (US-P*):** `check_car_structure()` severity `'info'` — banner never shown (GAP-345). Cover letter generate applies only 3/10 checks (GAP-344). Professional summary never post-validated (GAP-353).

**HR/ATS (US-H*):** `_atsFails` counts advisory failures as blocking in readiness chip (GAP-350). "Blocked formats" footer fires on advisory failures (GAP-360, one-line fix). Skill type toggle skips ATS refresh (GAP-373).

**Accessibility (US-X*):** Missing skip link — WCAG 2.4.1 Level A (GAP-346). Review sub-tabs have no ArrowKey handler (GAP-354). CV template h2→h4 skip and job-role as div (GAP-355).

**First-Time User (US-F*):** "LLM" undefined; onboarding references nonexistent "⚙ LLM button" (GAP-367). 9 customise sub-tabs exposed simultaneously (GAP-351). "Harvest" unexplained (GAP-368).

**Returning User (US-S*):** All 9 US-S* criteria pass. Session notes invisible during active session (GAP-352). Auto-resume fires silently with no explanation (GAP-369).

**Power User (US-W*):** `.kb-focused` CSS missing for DataTable rows — A/R work but invisible (GAP-348). `?` button opens wrong modal; shortcut panel outdated (GAP-349). Publications and rewrite bulk actions lack undo (GAP-366).

**Recruiter Ops (US-O*):** Finalise tab has 4 independent structural barriers making it unreachable (GAP-341, CRITICAL). Default archive status is "queued" (GAP-370).

**Master CV Curator (US-M*):** OFF-LIMITS for edits. Publication CRUD modal silently drops BibTeX fields on save (GAP-347). `domain_relevance` absent from experience CRUD (GAP-359). Summary variant key exposed as display label (GAP-371).

**Trust & Compliance (US-C*):** Cover letter system prompt has no anti-fabrication constraint (GAP-343). LLM disclosure fires only at `analyzeJob()` (GAP-374). Provenance badges and provider-scoped disclosure confirmed resolved.

**Graphical Designer (US-G*):** Dark mode: 0 `@media (prefers-color-scheme: dark)` declarations (deferred by design). 227 `style=` occurrences with hardcoded hex in index.html (ongoing). One remaining raw hex in styles.css:619.

**Heuristic:** See Top 5 Heuristic Issues above.

---

## Previously Tracked Gaps Confirmed Resolved (Cycle 93 Verification)

| Gap | Confirmed by |
|-----|-------------|
| GAP-323 — Single active session auto-resume | Returning User — all US-S* pass |
| GAP-334 — Pre-archive readiness chip | Recruiter Ops — chip present and correct |
| GAP-335 — LLM disclosure not provider-scoped | Trust & Compliance — verified at api-client.js:31–34 |
| GAP-336 — Harvest provenance badges | Trust & Compliance — fully implemented |
| GAP-306 / `--cv-card-bg` | Graphical Designer — defined at styles.css:28 |

---

*Reviewed against: web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, plus persona-specific source files.*
