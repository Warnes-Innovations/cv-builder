<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->
<!-- markdownlint-disable MD032 MD060 -->

# CV Builder UI Review

**Last Updated:** 2026-04-22 17:00 ET
**Review Cycle:** Full — all 14 personas + heuristic sub-agent
**Related backlog:** [tasks/gaps.md](gaps.md), [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)
**Source files:** `tasks/review-status/*.md` — regenerate this file from sources; do not edit directly.

---

## Executive Summary

| Metric | Count | % |
|--------|-------|---|
| Total criteria evaluated | 353 | — |
| ✅ Pass | 176 | 50% |
| ⚠️ Partial | 123 | 35% |
| ❌ Fail | 21 | 6% |
| 🔲 Not Implemented | 33 | 9% |

**6 gaps resolved or partially resolved since the 2026-04-20 cycle:**

| Gap | Title | Disposition |
|-----|-------|-------------|
| GAP-08 | Spell-audit write-back key mismatch | ✅ RESOLVED — span-precise corrections confirmed end-to-end via `cv_orchestrator.py:1501–1706` |
| GAP-28 | Publications heading "Selected" vs full list | ✅ RESOLVED — conditional heading logic in `cv-template.html` (commit `ad9edf0`) |
| GAP-30 | Cover letter opening hardwired as "Dear [name]" | ✅ RESOLVED — opening style now user-selectable (formal/hook/narrative, commit `a5fc40a`) |
| GAP-37 | No welcome screen for first-time users | ⚠️ PARTIAL — welcome modal implemented (`session-manager.js:155–179`); LLM prereq not mentioned; "Get Started" does not navigate to Job tab |
| GAP-38 | "Delete" session button misleads (soft-delete) | ✅ RESOLVED — label updated to "Move to Trash" (`session-switcher-ui.js:85`) |
| GAP-45 | Persuasion warning acknowledgement bypassed | ⚠️ PARTIAL — submission gating added (commit `732a431`) but warning panel collapsed by default; bypass still possible |

**50 new gaps identified this cycle:** GAP-72 through GAP-121 (details in `tasks/gaps.md`).

**Top 5 critical gaps:**

1. **GAP-120 (CRITICAL):** Tab `<div>` elements have no `tabindex="0"` — keyboard-only users cannot activate any viewer tab in the entire application (`web/app.js:122–125`).
2. **GAP-72 (HIGH):** Workflow step pills have no `tabindex` — keyboard users cannot navigate to or activate any of the 8 step pills (`web/workflow-steps.js:666–670`).
3. **GAP-36 (CRITICAL, pre-existing):** No master CV onboarding — `cv_orchestrator.py:130–133` raises a raw `FileNotFoundError` on first run with no UI interception.
4. **GAP-41 (CRITICAL, pre-existing):** Pre-job master CV editing has no frontend entry point — the Master CV tab is only exposed in the `finalise` stage (`web/ui-core.js:358`).
5. **GAP-25 (HIGH, pre-existing):** Layout Undo button is a non-functional stub that posts a chat message instead of rolling back state (`web/layout-instruction.js:855–865`).

---

## Summary Counts by Persona

| Persona | Total | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | Key new gaps |
|---------|-------|---------|-----------|--------|------------|-------------|
| Accessibility Specialist | 15 | 3 | 8 | 4 | 0 | GAP-72,73,74,75 |
| Applicant | 66 | 50 | 11 | 2 | 3 | GAP-20,23 (pre-existing) |
| First-Time User | 7 | 0 | 6 | 1 | 0 | GAP-76,77,78,79 |
| Graphical Designer | 12 | 9 | 3 | 0 | 0 | GAP-80 |
| Hiring Manager | 36 | 17 | 13 | 0 | 6 | GAP-81,82,83,84,85,86 |
| HR / ATS | 47 | 30 | 10 | 3 | 4 | GAP-87,88,89,90 |
| Master CV Curator | 19 | 11 | 7 | 1 | 0 | GAP-91,92,93,94 |
| Persuasion Expert | 24 | 8 | 12 | 0 | 4 | GAP-95,96,97 |
| Power User | ~18 | ~8 | ~6 | ~4 | ~0 | GAP-98,99,100,101 |
| Recruiter-Ops | 10 | 3 | 5 | 1 | 1 | GAP-102,103,104,105,106 |
| Resume Expert | 37 | 6 | 19 | 0 | 12 | GAP-107,108,109 |
| Returning User | 9 | 5 | 4 | 0 | 0 | GAP-110,111,112,113,114 |
| Trust & Compliance | 15 | 8 | 5 | 0 | 2 | GAP-115,116,117,118,119 |
| UX Expert | 38 | 18 | 14 | 5 | 1 | GAP-120,121,122,123 |
| **TOTAL** | **353** | **176** | **123** | **21** | **33** | |

---

## Top Acceptance Criteria Gaps — Critical and High Priority

### Critical (blocks a core workflow or acceptance path)

**GAP-120 — Tab `<div>` elements keyboard-inaccessible** *(UX Expert)*
All viewer tabs (`web/index.html:177–197`) are `<div role="tab">` elements with no `tabindex="0"` and click-only event wiring (`web/app.js:122–125`). Keyboard-only users cannot activate any tab in the entire application. Every persona is impacted.

**GAP-36 — No master CV onboarding; raw FileNotFoundError on first run** *(First-Time User)*
`cv_orchestrator.py:130–133` raises `FileNotFoundError` when `Master_CV_Data.json` is absent. No UI intercepts it; result is a 500 error. All three creation paths (LinkedIn export, resume import, manual editor) are unimplemented.

**GAP-41 — Pre-job Master CV editing has no UI entry point** *(Master CV Curator)*
Backend correctly permits `/api/master-data/*` writes when `phase == 'init'` (`master_data_routes.py:129`), but `STAGE_TABS` (`web/ui-core.js:358`) only exposes the Master CV tab in the `finalise` stage. Users who want to update their profile before job analysis have no path to do so.

### High Priority

**GAP-72 — Workflow step pills have no `tabindex`** *(Accessibility Specialist)*
All 8 step pills are `<div>` elements with `onclick` handlers but no `tabindex="0"` or `keydown` handlers. Keyboard users cannot navigate or activate any workflow step (`web/workflow-steps.js:666–670`).

**GAP-25 — Layout Undo is a non-functional stub** *(UX Expert, pre-existing)*
`undoInstruction()` (`web/layout-instruction.js:855–865`) posts a chat message rather than restoring prior state. The Undo button is visible in every history entry but does nothing useful.

**GAP-49 — Spell check auto-advances into generation without confirmation** *(First-Time User, pre-existing)*
After `submitSpellCheckDecisions()` completes, the frontend immediately triggers CV generation with no summary, no confirmation prompt, and no opportunity to reconsider.

**GAP-107 — Synonym grouping absent from analysis UI** *(Resume Expert)*
The synonym map (`scripts/data/synonym_map.json`) resolves aliases internally for ATS scoring, but the analysis UI (`web/review-table-base.js:210+`) displays "ML" and "Machine Learning" as separate keywords without grouping or annotation.

**GAP-108 — Default experience sort is recency-biased, not relevance-based** *(Resume Expert)*
`buildExperienceReviewTable` (`web/experience-review.js:83–89`) sorts by `start_date` descending on first load. LLM recommendations can correct for relevance but the visual default privileges recency.

**GAP-91 — No backup history/restore UI** *(Master CV Curator)*
The backend creates timestamped backup files before every master-data write, but no UI surfaces the backup list or allows restoring a previous version.

**GAP-110 — No restored-decisions summary on session return** *(Returning User)*
After session restore there is no summary of what was recovered (experiences selected, skills, approved rewrites). Users must navigate to every tab individually to verify prior work is intact.

**GAP-98 — No keyboard shortcuts for workflow navigation** *(Power User)*
No keyboard accelerators exist for any workflow step, action button, or review operation.

**GAP-115 — Persistent non-confidential LLM provider warning absent** *(Trust & Compliance)*
Providers like Gemini free-tier (`confidential: False`) and Groq show data-retention disclosures only during the setup wizard; after setup no persistent indicator warns that CV content is being sent to a non-confidential provider.

**GAP-92 — `publication_count` stat card reads from JSON not BibTeX** *(Master CV Curator)*
The overview stat card reads `publication_count` from `Master_CV_Data.json` rather than `publications.bib` — shows 0 for BibTeX-only setups.

**GAP-73 — Stage changes not announced to screen readers** *(Accessibility Specialist)*
The `.workflow` div has no `aria-live` attribute — screen reader users receive no announcement when the active workflow stage changes.

**GAP-75 — `#session-conflict-banner` has no `role="alert"`** *(Accessibility Specialist)*
The session conflict banner has no `role="alert"` or `aria-live`, so screen reader users are not notified of session conflicts.

**GAP-102 — Application status not visible in session list** *(Recruiter-Ops)*
The session switcher shows position name, phase, and timestamps but not `application_status` from `metadata.json`. Users managing multiple applications cannot see submission status at a glance.

---

## Heuristic Findings

| Heuristic | Rating | Summary |
|-----------|--------|---------|
| H1 Visibility of System Status | 🟡 Minor | LLM busy overlay, step pills, and ATS badge provide reasonable status signals; generation time estimate absent |
| H2 Match System and Real World | 🟡 Minor | Jargon terms (Harvest, ATS, raw Python phase names in session switcher) reduce learnability |
| H3 User Control and Freedom | 🟢 Good | Back-nav guarded by confirmation; re-run available; archive reversible via trash |
| H4 Consistency and Standards | 🟠 Major | 3 overlapping navigation systems with no clear hierarchy; Bootstrap 5 / `.action-btn` mix in Layout tab; inline `onclick` vs `addEventListener` inconsistency across modules |
| H5 Error Prevention | 🟢 Good | Gated submissions, ATS validation blocking downloads, schema validation on master writes |
| H6 Recognition Rather Than Recall | 🟠 Major | 17+ viewer tabs require recall; overflow tabs invisible; action buttons disappear when not in correct phase |
| H7 Flexibility and Efficiency | 🟡 Minor | Bulk-accept exists for skills/experiences; no keyboard shortcuts; re-run is hover-only |
| H8 Aesthetic and Minimalist Design | 🟠 Major | Position bar has 7 simultaneous elements; fixed 40/60 chat/viewer split crowds review area; `min-height: 11in` on `.document-content` creates excess blank space; 17+ tabs |
| H9 Help Recognise, Diagnose, Recover | 🟡 Minor | LLM auth error has no inline CTA; session-conflict banner has no `role="alert"` |
| H10 Help and Documentation | 🟡 Minor | Welcome modal provides orientation (new); persistent help entry point absent; modal cannot be re-opened |

**Top 3 architectural UX debts:**
1. Triple-layer navigation system without a clear hierarchy — step pills govern workflow, tabs govern content view, and chat action buttons also trigger workflow progression.
2. Static 40% chat panel permanently crowds the review work area, preventing effective table review on 1280px viewports.
3. Technical internal state exposed as user-facing labels — raw phase enum values in session switcher, "File Review" instead of "Download Files", "Harvest" without definition.

---

## Top 5 UX Issues by Impact (Friction / Abandonment Risk)

1. **Keyboard navigation fully blocked** — Tab `<div>` elements (GAP-120) and step pills (GAP-72) have no keyboard affordance. Any user who cannot or does not use a mouse cannot complete any workflow step.

2. **First-time user has no guided path** — If `Master_CV_Data.json` is absent, the app crashes with a raw error (GAP-36). Even with the file present, the welcome modal (GAP-37 partial) does not explain LLM provider setup or navigate to the starting tab — users face a blank default state with no orientation.

3. **Staged generation contract invisible to users** — Spell check silently triggers CV generation (GAP-49). The Layout Undo button is present but non-functional (GAP-25). First-time users do not understand the preview→layout-confirmation→final-generation pipeline (GAP-79), creating confusion about which files are authoritative.

4. **Session restore provides no decision summary** — Returning users have no way to see what decisions were restored without navigating to every review tab (GAP-110). Combined with opaque abbreviated phase labels (GAP-112), re-entry into the workflow requires significant recall effort.

5. **Review quality gates partially bypassed** — The persuasion warning acknowledgement can be bypassed by collapsing the panel (GAP-45 partial). Customization stage has no per-item decision gate — items can reach generation with LLM defaults applied silently (GAP-116). Together these undermine the trust model the review system is designed to provide.

---

## Full Persona Reviews

### Accessibility Specialist

**Last Updated:** 2026-04-22 · **15 criteria: 3 ✅ · 8 ⚠️ · 4 ❌ · 0 🔲**

Modal focus management (`ui-core.js:208–235`) correctly traps focus and restores it on close across all tested dialogs. ARIA labels on key landmark elements (ATS badge, tab bar, scroll buttons) are present and correct. The re-run confirmation dialog correctly applies `trapFocus('rerun-confirm-overlay')`.

Critical failures: all 8 workflow step pills are `<div>` elements with no `tabindex` (GAP-72); the `.workflow` container has no `aria-live` and stage changes are not announced (GAP-73); `confirmDialog()` lacks `role="dialog"`, focus trap, and focus restore (GAP-34, pre-existing); `#session-conflict-banner` has no `role="alert"` (GAP-75).

Additional findings: `aria-invalid` CSS rule exists but the attribute is never set dynamically (GAP-74). Proposed new stories: US-X4 (keyboard access to step bar), US-X5 (generated CV output accessibility), US-X6 (dynamic aria-invalid).

**Source:** `tasks/review-status/accessibility-specialist.md`

---

### Applicant

**Last Updated:** 2026-04-22 · **66 criteria: 50 ✅ · 11 ⚠️ · 2 ❌ · 3 🔲**

Core workflow foundations are strong — bulk accept for experience/skills/achievements, full rewrite card flow, ATS match display, ranked publications shortlist, layout review loop, and session switching. US-A4 (rewrite review) and US-A6 (iterative refinement) pass substantially.

Key gaps: no "queued" session lifecycle status (Phase enum has no `queued` value); all output formats generated together rather than HTML-first as the story requires (GAP-20); `post_analysis_answers` vs `clarification_answers` key mismatch creates a silent quality risk; no pre-write JSON diff preview during harvest (GAP-19); re-run icon hover-only (GAP-98).

**Source:** `tasks/review-status/applicant.md`

---

### First-Time User

**Last Updated:** 2026-04-22 · **7 criteria: 0 ✅ · 6 ⚠️ · 1 ❌ · 0 🔲**

Welcome/onboarding modal is now implemented (`session-manager.js:155–179`) — addresses prior GAP-FU-2 (welcome modal absent). Character count guidance on paste input with `aria-live="polite"` is a good first-time UX pattern.

Key gaps: "Get Started" button closes modal but does not navigate to Job tab (GAP-77); LLM provider setup never mentioned in welcome flow — users encounter auth failure mid-workflow (GAP-76); "Harvest improvements", "ATS", "Master CV" are unexplained jargon (GAP-78); Generate→Layout→Final pipeline unexplained, "preview vs final" not communicated (GAP-79); critical pre-existing GAP-36 (FileNotFoundError on first run) remains open.

**New gaps this cycle:** GAP-76, GAP-77, GAP-78, GAP-79.

**Source:** `tasks/review-status/first-time-user.md`

---

### Graphical Designer

**Last Updated:** 2026-04-22 · **12 criteria: 9 ✅ · 3 ⚠️ · 0 ❌ · 0 🔲**

Visual hierarchy is consistent and clear. Typography uses a coherent type scale. Preview rendering uses an inline iframe providing authentic output. Generated CV visual identity (spacing, color system, section breaks) meets story criteria.

Key gaps: Layout tab uses Bootstrap 5 classes (`btn btn-warning` etc.) while all other tabs use `.action-btn`, creating a ~2–4px height mismatch (GAP-80); font size control labeled in CSS `px` while designers expect typographic `pt` (GAP-47, pre-existing); Layout settings row uses inline styles bypassing the CSS class system.

**New gaps this cycle:** GAP-80.

**Source:** `tasks/review-status/graphical-designer.md`

---

### Hiring Manager

**Last Updated:** 2026-04-22 · **36 criteria: 17 ✅ · 13 ⚠️ · 0 ❌ · 6 🔲**

Work experience credibility presentation is strong — bullet reordering, experience-level recommendation signals, and persuasion heuristics all support quality content. Publications section passes all active criteria. ATS page-count warning is wired to the Download tab (GAP-HM-02 resolved ✅). Venue-missing publication warning is now wired (GAP-HM-05 resolved ✅).

Key gaps: no minimum bullet count check (GAP-81); cover letter tone not auto-inferred from job analysis (GAP-82); page count warning absent from Layout Review — only shown at Download (GAP-83); cover letter named-achievement check absent (GAP-84); no bullet line-length check (GAP-85); skill category ordering not job-derived (GAP-86).

**New gaps this cycle:** GAP-81 through GAP-86.

**Source:** `tasks/review-status/hiring-manager.md`

---

### HR / ATS

**Last Updated:** 2026-04-22 · **47 criteria: 30 ✅ · 10 ⚠️ · 3 ❌ · 4 🔲**

ATS file format generation (DOCX, HTML with JSON-LD, PDF variants), contact parsing, keyword matching with synonym resolution, section recognition, match score visibility, and the validation report framework meet or substantially meet story criteria. US-H1 through US-H7 are largely in good shape.

Key failures (US-H8 — Hard/Soft Skill Distinction): LLM not used for skill classification (rule-based heuristic only); no UI override for hard/soft classification; `skill_type` not persisted to `Master_CV_Data.json` via harvest (GAP-89).

**New gaps this cycle:** GAP-87 (font compliance validation), GAP-88 (year-only date rejection), GAP-89 (skill_type persistence), GAP-90 (synonym normalization in validation report).

**Source:** `tasks/review-status/hr-ats.md`

---

### Master CV Curator

**Last Updated:** 2026-04-22 · **19 criteria: 11 ✅ · 7 ⚠️ · 1 ❌ · 0 🔲**

Session-vs-master boundary is correctly enforced — accepted suggestions go to session state only; harvest writes to master require explicit `POST /api/harvest/apply`. Backup-before-write is implemented in `web_app.py`. Publication CRUD including BibTeX editing is solid. Phase-enforcement 403/409 guards are in place.

Key gaps: `publication_count` stat card reads from JSON not BibTeX — shows 0 for BibTeX-only setups (GAP-92 ❌); phase-enforcement 409 misidentified as session conflict in UI (GAP-93); no backup history/restore UI despite backend support (GAP-91); summary variant format inconsistency after harvest (GAP-94); CRITICAL pre-existing GAP-41 (no pre-job editor entry point) remains open.

**New gaps this cycle:** GAP-91 through GAP-94.

**Source:** `tasks/review-status/master-cv-curator.md`

---

### Persuasion Expert

**Last Updated:** 2026-04-22 · **24 criteria: 8 ✅ · 12 ⚠️ · 0 ❌ · 4 🔲**

Persuasion check framework is substantive — 8 heuristic checks computed by `run_persuasion_checks` (strong action verb, passive voice, word count, result clause, named institution, CAR structure, summary filler). Opening style selection is now user-configurable (GAP-30 RESOLVED). Rewrite submission gating added (GAP-45 partial, commit `732a431`).

Key gaps: client-side cover letter validation still allows 400 words while the LLM prompt now targets 250–300 (GAP-95); CTA validation accepts passive closings (GAP-96); no positive-sum metric framing preference (GAP-97); no cross-document register consistency checking.

**New gaps this cycle:** GAP-95, GAP-96, GAP-97.

**Source:** `tasks/review-status/persuasion-expert.md`

---

### Power User

**Last Updated:** 2026-04-22 · **~18 criteria: ~8 ✅ · ~6 ⚠️ · ~4 ❌ · ~0 🔲**

Session switching with independent tab isolation (US-W2) passes. Bulk accept is available for experience, skills, and achievements. Layout history is displayed. Session list supports quick-load.

Key failures: no keyboard shortcuts for any workflow operation (GAP-98 HIGH); no bulk accept/reject for rewrites — each of 10–20 cards requires individual action (GAP-99); no bulk toolbar for publications (GAP-100); no forward stage skip from a completed stage (GAP-101); re-run affordance is `opacity:0` at rest and hover-only.

**New gaps this cycle:** GAP-98 through GAP-101.

**Source:** `tasks/review-status/power-user.md`

---

### Recruiter-Ops

**Last Updated:** 2026-04-22 · **10 criteria: 3 ✅ · 5 ⚠️ · 1 ❌ · 1 🔲**

File naming is job-relevant (`CV_{Company}_{Role}_{date}.*`). Notes textarea at finalise step is present with practical placeholder. Finalise stage is clearly separated from generation in the workflow bar.

Key gaps: multiple generation passes do not surface a "generated at" timestamp — users cannot confirm files are current after re-run (GAP-106 ❌); application submission status not shown in session list (GAP-102); no post-archive metadata update endpoint or UI (GAP-103); "Done" phase label misleading for active-refinement sessions (GAP-104); no cross-application summary dashboard (GAP-105); cover letter and screening-response DOCX excluded from File Review (GAP-39, pre-existing).

**New gaps this cycle:** GAP-102 through GAP-106.

**Source:** `tasks/review-status/recruiter-ops.md`

---

### Resume Expert

**Last Updated:** 2026-04-22 · **37 criteria: 6 ✅ · 19 ⚠️ · 0 ❌ · 12 🔲**

Major upgrade this cycle — US-R7 (Spell & Grammar) substantially passes. `SUPPRESSED_BULLET_RULES` correctly suppresses fragment/punctuation rules for bullet context. Custom dictionary is pre-populated from master data. Span-precise `_apply_spell_fixes_to_text` confirmed end-to-end (GAP-08 RESOLVED). Required/preferred split in analysis UI, bullet reordering, and publication ranking pass.

Key gaps: synonym grouping absent from analysis UI (GAP-107 HIGH); default experience sort is recency-biased (GAP-108 HIGH); domain inference confidence not surfaced (GAP-109); summary opening-line quality, anti-fluff detection, and 4–6 line enforcement not validated; skills not auto-re-sorted by role relevance.

**New gaps this cycle:** GAP-107 through GAP-109.

**Source:** `tasks/review-status/resume-expert.md`

---

### Returning User

**Last Updated:** 2026-04-22 · **9 criteria: 5 ✅ · 4 ⚠️ · 0 ❌ · 0 🔲**

Session restoration is functionally sound — job context, position title, and phase are recovered correctly on return. Layout freshness stale/critical badge system correctly signals output currency. Re-run confirmation modal lists downstream consequences. `_resolveRestoredPhase()` guards against corrupt phase state on restore. GAP-38 resolved ✅ ("Delete" → "Move to Trash").

Key gaps: no restored-decisions summary on return — users must navigate to each tab individually (GAP-110 HIGH); "Move to Trash" executes without confirmation dialog (GAP-111); abbreviated phase labels opaque ("Custom", "Done" for `refinement`, GAP-112); no session duplicate/copy action (GAP-113); session rename uses `window.prompt()` (GAP-114).

**New gaps this cycle:** GAP-110 through GAP-114.

**Source:** `tasks/review-status/returning-user.md`

---

### Trust & Compliance

**Last Updated:** 2026-04-22 · **15 criteria: 8 ✅ · 5 ⚠️ · 0 ❌ · 2 🔲**

AI suggestion transparency is strong — word-level diffs clearly distinguish proposals from source text, confidence levels are computed and displayed for all recommendation types, rationale is accessible via collapsible `<details>`. Rewrite audit is persisted to `session.json`. Harvest candidates are never pre-selected. Factual grounding via full master data in LLM prompts significantly limits hallucination risk.

Key gaps: customization stage (experience/skill/achievement) has no blocking gate — items can reach generation with LLM defaults applied silently (GAP-116); non-confidential provider has no persistent warning after setup (GAP-115); AI-generated summary variants have no AI-proposal label (GAP-117); no session audit panel in Finalise tab (GAP-118); no AI attribution option in generated files (GAP-119).

**New gaps this cycle:** GAP-115 through GAP-119.

**Source:** `tasks/review-status/trust-compliance.md`

---

### UX Expert

**Last Updated:** 2026-04-22 · **38 criteria (8 N/A excluded): 18 ✅ · 14 ⚠️ · 5 ❌ · 1 🔲**

Strong structural foundations: persistent 8-step progress bar with rich state classes, word-level inline diffs, contextual protected-site guidance, thorough modal focus management. Focus trap implemented on all modals. Re-run confirmation modal correctly lists downstream consequences.

Critical failures: tab `<div>` elements have no `tabindex="0"` — keyboard navigation blocked application-wide (GAP-120 CRITICAL); extracted job metadata not inline-editable after URL fetch (GAP-23, pre-existing); `#layout-freshness-chip` has empty `aria-label=""` (GAP-123); no sequential "Approve & Next →" rewrite review flow (GAP-99); re-run icon has no keyboard handler (extends GAP-72).

Key gaps: Layout Undo non-functional (GAP-25, pre-existing); layout clarification uses `window.prompt()` (GAP-121); workflow bar overflow risk at 1280px (GAP-122).

**New gaps this cycle:** GAP-120 through GAP-123.

**Source:** `tasks/review-status/ux-expert.md`

---

## Heuristic Evaluation Detail

**Last Updated:** 2026-04-22 · **Source:** `tasks/review-status/heuristic.md`

### H1 — Visibility of System Status · 🟡 Minor

LLM busy overlay with elapsed timer, step-pill active/completed state classes, ATS badge live updates after each review checkpoint. Weakness: generation progress is a single "Generating CV…" state with no per-step checkmarks; no estimated duration feedback.

### H2 — Match System and Real World · 🟡 Minor

Step labels ("Customise", "Rewrites", "Spell Check") align with user tasks. Weaknesses: raw Python phase enum values appear in session restoration messages ("customization", "rewrite_review"); "Harvest", "ATS", and "Session" are unexplained; "File Review" is unusual for a download surface; "Done" for `refinement` phase is misleading.

### H3 — User Control and Freedom · 🟢 Good

Back-navigation is guarded by a confirmation modal listing downstream consequences. Re-run preserves prior decisions. Sessions have trash/restore path. Harvest apply is never pre-selected. Main gaps: no forward-skip from a completed stage to a later stage; re-run ↻ is hover-only and not keyboard-accessible.

### H4 — Consistency and Standards · 🟠 Major

Three overlapping navigation systems with no clear hierarchy: (1) step pills govern stage progression, (2) 16+ viewer tabs govern content within a stage, (3) chat action buttons also trigger stage progression. The Layout tab uses Bootstrap 5 button classes while all other stages use `.action-btn`. Inline `onclick` vs `addEventListener` is inconsistent across modules. British ("Finalise") / American ("Customize") spelling is mixed across the UI.

### H5 — Error Prevention · 🟢 Good

Gated rewrite submission (pending > 0 blocks submit), ATS validation blocking downloads for failing formats, schema validation on master writes with backup-restore on failure, confirmation modal before destructive re-runs. Customization stage lacks a similar decision gate (GAP-116).

### H6 — Recognition Rather Than Recall · 🟠 Major

17+ viewer tabs require users to recall which tab contains what. Overflow tabs are not indicated — they are invisible rather than indicated by a scroll affordance. Action buttons disappear without trace when the wrong phase is active. Tab population state (whether a tab has been populated) has no badge or indicator.

### H7 — Flexibility and Efficiency · 🟡 Minor

Bulk-accept exists for skills and experiences. No keyboard shortcuts for any workflow step or review operation. No forward-skip between non-adjacent stages. Re-run affordance is hover-only (opacity:0 at rest).

### H8 — Aesthetic and Minimalist Design · 🟠 Major

Position bar holds 7 simultaneous elements (ATS badge, model badge, session label, LLM status, new-session button, active-sessions button, scroll indicator). The fixed 40/60 chat/viewer split cannot be adjusted, crowding review tables on 1280px viewports. The `min-height: 11in` rule on `.document-content` creates excessive blank space below short CVs. The Layout pane exposes four action surfaces with state-dependent labels for one conceptual "confirm and proceed" action.

### H9 — Help Recognise, Diagnose, and Recover from Errors · 🟡 Minor

Error messages from fetch failures surface in the chat panel. LLM auth errors have no inline CTA linking to the configuration wizard. The session-conflict banner (GAP-75) has no `role="alert"`.

### H10 — Help and Documentation · 🟡 Minor

The welcome modal (now implemented) provides initial orientation. No persistent help link or "?" button allows re-opening the modal after dismissal. In-app definitions for jargon terms are absent throughout (GAP-78).

---

*Generated from:* `tasks/review-status/accessibility-specialist.md`, `tasks/review-status/applicant.md`, `tasks/review-status/first-time-user.md`, `tasks/review-status/graphical-designer.md`, `tasks/review-status/heuristic.md`, `tasks/review-status/hiring-manager.md`, `tasks/review-status/hr-ats.md`, `tasks/review-status/master-cv-curator.md`, `tasks/review-status/persuasion-expert.md`, `tasks/review-status/power-user.md`, `tasks/review-status/recruiter-ops.md`, `tasks/review-status/resume-expert.md`, `tasks/review-status/returning-user.md`, `tasks/review-status/trust-compliance.md`, `tasks/review-status/ux-expert.md`
