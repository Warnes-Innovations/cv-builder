# Gaps Analysis: User Stories vs. Specifications & Implementation

**Generated:** 2026-03-06 | **Last updated:** 2026-03-16
**Sources:** `tasks/user-story-*.md`, `REQUIREMENTS.md`, `PROJECT_SPECIFICATION.md`, `tasks/rewrite-feature.md`

This document identifies gaps between what the user stories require and what is currently specified or implemented.
Each gap has a severity, affected user stories, and a recommended resolution.

**Severity scale:**  
`CRITICAL` — blocks a user story's acceptance criteria  
`HIGH` — significantly degrades the experience; should be resolved before that feature ships  
`MEDIUM` — notable omission; acceptable to defer one release cycle  
`LOW` — nice-to-have clarification or polish

---

## GAP-01: Master Data NL Update — Partially Resolved

**Severity:** HIGH  
**Affected stories:** US-A10, US-A11  
**Status:** PARTIAL — Session harvest path implemented (`_compile_harvest_candidates()`, `/api/harvest`, `/api/harvest-apply`); NL update and document ingestion path (US-A10) still not specified, not implemented

**Description:**  
US-A10 requires a "Manage Master Data" section where the user can update `Master_CV_Data.json` via
natural-language input ("I just finished a project at Acme using Kubernetes. Add it to exp_005.") or by
pasting an existing document (old CV, LinkedIn export). The system should show a proposed JSON diff and
require explicit confirmation before writing.

US-A11 (Session Master Data Harvest) now specifies the session-end structured write-back path, which
partially addresses this gap. The freeform NL update and document ingestion path (US-A10) remains
unspecified: no REQUIREMENTS.md section, no NL→JSON diff UI spec, no document-ingestion parse step.

**Recommended resolution:**  
Add a `### X. Master Data Management` section to REQUIREMENTS.md covering:
- NL update → proposed JSON diff → confirm → write + git commit + Drive sync
- Document ingestion → extract structured data → review step → confirm
- Out-of-scope triggers (malformed input, ambiguous field mapping)
- Cross-reference US-A11 harvest flow for the session-end structured path (already specified)

---

## GAP-02: Iterative Refinement — Phase Re-Entry Logic Underspecified

**Severity:** HIGH  
**Affected stories:** US-A6  
**Status:** PARTIAL — `back_to_phase()` implemented in `conversation_manager.py` (line 998) and exposed via `/api/back-to-phase`; feedback classification logic (text-level vs. structural keywords) and partial regeneration remain unspecified

**Description:**  
US-A6 requires that post-generation feedback triggers *targeted* re-entry into either the **rewrite review**
phase (for text-level changes) or the **content customisation** phase (for structural changes like add/remove
experience) — not a full session restart. Previously approved decisions must be preserved as defaults on
re-entry.

REQUIREMENTS.md §1 mentions "Allow iterative refinement" but does not specify:
- How the system classifies feedback as text-level vs. structural
- What "preserved as defaults" means in session state when re-entering a prior phase
- Whether partial regeneration (re-render only the affected section) is supported

`conversation_manager.py` currently only advances phases forward; no back-transition logic exists.

**Recommended resolution:**  
- Spec the phase back-transition rules in REQUIREMENTS.md §7
- Add `back_to_phase(target_phase)` to `conversation_manager.py` that resets state to the target phase while preserving prior decisions
- Specify the feedback classification logic (text keywords → rewrite phase; structural keywords → customization phase)

---

## GAP-03: Finalise Flow — Git Commit and Drive Sync Unspecified

**Severity:** HIGH  
**Affected stories:** US-A9  
**Status:** RESOLVED — `/api/finalise` endpoint implemented (`web_app.py` line 3425); git commit with `feat: Add {Company}_{Role}_{Date} application` message implemented (line 3503); Drive sync still unimplemented

**Description:**  
US-A9 specifies that clicking "Finalise" triggers:
1. A Git commit with message `feat: Add {Company}_{Role}_{Date} application`
2. Google Drive sync of all artefacts

Neither the Git commit trigger/format nor the Drive sync mechanism is specified beyond REQUIREMENTS.md §6.2
("Google Drive API" library list). No implementation exists in `cv_orchestrator.py` or `web_app.py`.

**Recommended resolution:**  
- Add `### Finalise & Archive` spec to REQUIREMENTS.md §2 covering Git commit format, failure handling, Drive target folder structure, and sync confirmation UX
- Implement as a `/api/finalise` endpoint that calls orchestrator finalise method

---

## GAP-04: Post-Generation ATS Validation Report — Spec Incomplete, Not Implemented

**Severity:** HIGH  
**Affected stories:** US-H6  
**Status:** RESOLVED — `run_ats_validation_checks()` implements all 16 checks (`cv_orchestrator.py` line 2173); `/api/ats-validate` endpoint exposed; results include pass/warn/fail per check and page count; `validation_results` written to `metadata.json`

**Description:**  
US-H6 specifies a 16-point programmatic validation report run after generation covering DOCX structure,
HTML JSON-LD fields, and PDF page metrics. Results should be shown in the UI (pass/warn/fail per check),
with failures blocking download and validation results written to `metadata.json`.

REQUIREMENTS.md has no section describing this validation pass. `cv_orchestrator.py` has no post-generation
validation logic.

**Recommended resolution:**  
- Add `### Post-Generation Validation` subsection under REQUIREMENTS.md §6 (Technical Implementation Details)
- Specify the exact 16 checks (sourced from US-H6), their severity (fail vs. warn), and the `validation_results` schema for `metadata.json`
- Implement `_validate_generated_files()` in `cv_orchestrator.py`

---

## GAP-05: CV Length Estimation and Warning — Not Specified

**Severity:** MEDIUM
**Affected stories:** US-R2, US-M4
**Status:** PARTIAL — Page count is computed via WeasyPrint render (`cv_orchestrator.py` line 2427) and returned by `/api/ats-validate`; no threshold-based warn/fail check (1 page = warn, >3 pages = warn) has been added as a named validation check

**Description:**  
US-R2 requires the system to warn if the estimated CV length is outside 1.5–3 pages for a senior candidate.
US-M4 echoes this: total page count should be 2–3; system warns if output is 1 or >3 pages.

No page-count estimation or post-generation page-count check exists anywhere in the spec or implementation.

**Recommended resolution:**  
- Add page-count check to the post-generation validation pass (GAP-04)
- Specify page-count warning thresholds in REQUIREMENTS.md (1 page = warn; >3 pages = warn; >4 pages = fail)
- Use WeasyPrint's page count API (or PDF metadata) to extract actual page count after generation

---

## GAP-06: Rewrite Review Card UI — Not Specified in REQUIREMENTS.md

**Severity:** MEDIUM  
**Affected stories:** US-A4, US-U5  
**Status:** RESOLVED — Rewrite card UI fully implemented in `web/app.js` (line 4725): before/after diff, keyword pill badges with rank numbers, weak-evidence `⚠` badge, collapsible rationale, and Submit-All blocking until all cards actioned

**Description:**  
US-A4 defines the full rewrite review card UI: before/after diff, keyword pill badges, collapsible rationale,
weak-evidence `⚠` badge, sticky summary bar, Submit All blocked until every card is actioned. This is
the primary user interaction surface for the rewrite feature.

REQUIREMENTS.md §1 and §7 reference the rewrite review step but provide no UI specification. The web UI
work (Phase 5 of rewrite-feature.md) has not started.

**Recommended resolution:**  
- Add a `### Rewrite Review UI` subsection to REQUIREMENTS.md §7 (Workflow & User Experience) specifying the card layout, diff colour scheme, pill badge format, summary bar behaviour, and block-on-incomplete logic
- This spec is a prerequisite before Phase 5 begins

---

## GAP-07: Bullet Reordering in Content Customisation — Not Specified

**Severity:** MEDIUM  
**Affected stories:** US-A3, US-R2  
**Status:** RESOLVED — Up/down controls in reorder modal; `/api/proposed-bullet-order` endpoint returns relevance-ranked order from job keywords; modal shows `✨ Use Suggested Order` button when job analysis is available; `_applyBulletOrder()` re-sorts list; user override via Save still takes precedence (`web/app.js`, `scripts/web_app.py`)

**Description:**  
US-A3 and US-R2 both require that bullet ordering within an experience entry can be changed by the user
and that the system proposes reordered bullets (most job-relevant first). Neither the system-proposed
reordering logic nor the UI control for user override is specified in REQUIREMENTS.md.

**Recommended resolution:**  
- Add bullet reordering specification to REQUIREMENTS.md §1 (Customization Workflow) and §7 (UI)
- Specify that the orchestrator proposes bullet order by relevance score, and the UI provides up/down controls per bullet (drag-and-drop as enhancement)

---

## GAP-08: Spell/Grammar Check — API Endpoint and UI Not Yet Planned

**Severity:** MEDIUM  
**Affected stories:** US-A4b, US-R7  
**Status:** RESOLVED — `SpellChecker` class implemented; `/api/spell-check-sections`, `/api/spell-check`, `/api/spell-check-complete` endpoints all present in `web_app.py` (lines 3134–3230); `custom_dictionary.json` read/write in place

**Description:**  
The Spell & Grammar Check is now fully specified in REQUIREMENTS.md §6 and user stories US-A4b and US-R7,
but it is not included in any implementation phase in `tasks/rewrite-feature.md`. The required API endpoint
(`/api/spell-check`), the `language-tool-python` integration, and the web UI panel are all absent.

**Recommended resolution:**  
- Add a Phase 4b or Phase 7 section to `tasks/rewrite-feature.md` covering:
  - Install / start LanguageTool local server
  - `cv_orchestrator.run_spell_check(cv_data, custom_dict)` → returns flagged items list
  - `/api/spell-check` endpoint in `web_app.py`
  - Web UI spell check panel (flag list, Accept/Reject/Edit/Add-to-Dict controls)
  - `custom_dictionary.json` read/write + deduplication
  - `spell_audit` written to session and `metadata.json`

---

## GAP-09: Action Verb Detection in Bullets — Spec Location Mismatch

**Severity:** LOW  
**Affected stories:** US-M2  
**Status:** RESOLVED — Action verb validation, filler phrase detection, and CAR structure detection specified in `PROJECT_SPECIFICATION.md` § 5.x.6; implementation cross-referenced to `llm_client.py` line 366 and `conversation_manager.py` line 892

**Description:**  
US-M2 acceptance criterion: "System warns if a bullet lacks an action verb (per Phase 2.4 refactor)."
This refers to logic in `tasks/rewrite-feature.md` but the validation rule itself is not in REQUIREMENTS.md.
If the rewrite-feature spec changes, this acceptance criterion could become orphaned.

**Recommended resolution:**  
- Add a brief "Action verb validation" bullet to REQUIREMENTS.md §6 (Technical Implementation Details) or the new Post-Generation Validation section (GAP-04), referencing it as a warn-level check
- Alternatively, add it to US-H6's validation checklist (which already covers generation output quality)

---

## GAP-10: Keyword Synonym / Acronym Grouping — Underspecified

**Severity:** LOW  
**Affected stories:** US-R1  
**Status:** PARTIAL — Synonym map implemented (`synonym_map.json`, `canonical_skill_name()` in `cv_orchestrator.py`, `/api/canonical-skill` endpoint); grouping algorithm choice (curated map vs. LLM fallback) not formally specified in REQUIREMENTS.md

**Description:**  
US-R1 requires that synonyms ("ML" and "Machine Learning") be grouped rather than counted as separate
keywords. REQUIREMENTS.md §1 mentions synonym grouping but does not specify the mechanism:
pre-defined synonym table, embedding similarity, or LLM call.

**Recommended resolution:**  
- Add a `Keyword normalisation` paragraph to REQUIREMENTS.md §1 specifying the approach:
  suggested: a curated synonym map in `config.yaml` + LLM fallback for unrecognised pairs

---

## GAP-11: Skills Deduplication and Canonical Forms — Not Specified

**Severity:** LOW  
**Affected stories:** US-R5  
**Status:** PARTIAL — `canonical_skill_name()` in `cv_orchestrator.py` normalises skill lookups via synonym map; formal `aliases` array schema per skill entry in `Master_CV_Data.json` not specified; deduplication rule on write-back not specified in REQUIREMENTS.md

**Description:**  
US-R5 requires that skills with the same underlying meaning appear as one canonical entry, not three
(e.g., "Python", "Python 3", "Python (pandas, scikit-learn)" → one entry). The deduplication and
canonical-form selection rule is not specified.

**Recommended resolution:**  
- Add a `Skills deduplication` rule to REQUIREMENTS.md §3 (Master Data Schema) specifying that each unique skill has one canonical `name` and optional `aliases` array; aliases are shown in parentheses on output but only one entry per canonical skill is emitted

---

## GAP-12: "Candidate to Confirm" Marking in Generated Output — Underspecified

**Severity:** LOW  
**Affected stories:** US-R5, US-A4  
**Status:** RESOLVED — Decision recorded in `PROJECT_SPECIFICATION.md` § 5.x.7: HTML/PDF output adds `*` footnote for weak-evidence skills; ATS DOCX omits mark for clean machine parsing

**Description:**  
If the user accepts a `skill_add` proposal flagged as weak-evidence, the generated CV should mark that
skill visually (asterisk or footnote) to remind the candidate to be prepared to discuss it in interview.
This marking behaviour is described in US-R5 but not in REQUIREMENTS.md or the template spec.

**Recommended resolution:**  
- Decide whether to mark weak-evidence skills in the generated output (both HTML and ATS DOCX) or just warn during review
- Add the decision to REQUIREMENTS.md §1 and update the template spec accordingly
- Most pragmatic: mark in HTML/PDF with a footnote; omit mark in ATS DOCX (clean for ATS parsing)

---

## GAP-13: Approved Additional Skills Write-Back to Master Data — Partially Resolved

**Severity:** MEDIUM  
**Affected stories:** US-R5, US-A11  
**Status:** RESOLVED — `_compile_harvest_candidates()` implemented (`web_app.py` line 3670); `/api/harvest` and `/api/harvest-apply` endpoints present; git commit on apply implemented (line 3640); deduplication rule on near-duplicate skill still unspecified in REQUIREMENTS.md

**Description:**  
US-R5 requires approved additional skills to be written back to `Master_CV_Data.json`. US-A11 now
specifies the session harvest flow that includes skills as a candidate write-back type. However the
following remain unspecified:
- The deduplication rule when a near-duplicate skill already exists in master data
- The exact fields written per skill (`name`, `display_name`, `aliases`, `evidence_experience_id`)
- How `cv_orchestrator.py` compiles harvest candidates and stages the skill write-back

**Recommended resolution:**  
- Add a `Skill Approval Write-Back` paragraph to REQUIREMENTS.md §1 (Customisation Workflow) specifying:
  - Written fields: `name`, `display_name`, `aliases` (job's phrasing), `evidence_experience_id`
  - Deduplication: check against existing canonical names and aliases before writing; warn if near-duplicate found
- Implement `cv_orchestrator.compile_harvest_candidates()` to gather all session improvements
- Cross-reference with GAP-11 (canonical form and aliases) so deduplication rules are consistent

---

## GAP-14: Workflow Progress Indicator — Not Specified, Not Implemented

**Severity:** HIGH  
**Affected stories:** US-U1  
**Status:** RESOLVED — `workflow-steps` div with named stage chips implemented in `web/index.html` (line 80); `.step.active`, `.step.completed`, `.step.upcoming` visual states in `web/styles.css` (lines 52–56); state transitions managed in `web/ui-core.js` (line 469); back-navigation via `handleStepClick()` preserves approved content

**Description:**  
US-U1 requires a persistent, visible workflow progress indicator showing named stages (e.g., Job Input →
Analysis → Review → Generate → Layout → Finalise) with clear visual distinction between completed,
active, and upcoming stages. Additional requirements:
- Back-navigation must preserve previously approved content; any destructive nav requires explicit confirmation
- Returning to a saved session must immediately show the last active stage with populated data
- Stage indicator must update without a full page reload

`web/index.html` has no workflow stage indicator component. REQUIREMENTS.md has no UI specification for
this element. This is the primary orientation mechanism for a multi-step workflow.

**Recommended resolution:**  
- Add a `### Workflow Progress Indicator` subsection to REQUIREMENTS.md §7 (Workflow & User Experience)
  specifying: stage list, active/completed/pending visual states, back-nav confirmation trigger rules
- Implement as a persistent header or sidebar component in `web/index.html` driven by session phase state
- Cross-reference phase state in `conversation_manager.py` as the source of truth for current stage

---

## GAP-15: Accessibility Baseline — Not Specified Anywhere

**Severity:** HIGH  
**Affected stories:** US-U7  
**Status:** OPEN — Some ARIA attributes present (`aria-label`, `aria-modal`, `aria-labelledby`, `aria-describedby` on modals); `web/styles.css` has `outline: none` on multiple focusable elements (lines 176, 213, 353, 717) violating WCAG focus indicator requirement; no focus-trap on modals; no comprehensive accessibility audit performed

**Description:**  
US-U7 defines a full accessibility baseline required for the web UI:
- All interactive elements must have a visible, styled focus indicator (no global `outline: none`)
- Modal dialogs must trap focus while open and restore focus to the opener on close
- Icon-only buttons must have `aria-label` or `title` attributes
- Status information (accept/reject) must not be conveyed by colour alone — must also have text label or icon
- Tab order must be logical and match visual reading order
- Form validation errors must be associated with inputs via `aria-describedby`

No accessibility requirements exist anywhere in the current specification or implementation. All web UI
work currently in progress (Phase 5+ of rewrite-feature.md) could be built without these requirements
and require retrofit.

**Recommended resolution:**  
- Add an `### Accessibility Requirements` subsection to REQUIREMENTS.md §7 or a standalone §8, listing
  the US-U7 criteria as minimum implementation requirements for all UI components
- Include as a checklist item in the Phase 5 (web UI) implementation plan in `tasks/rewrite-feature.md`
- Run axe or Lighthouse accessibility audit before marking any Phase 5 task complete

---

## GAP-16: UX Evaluation Stories — No Implementation Specs in REQUIREMENTS.md

**Severity:** MEDIUM  
**Affected stories:** US-U2, US-U3, US-U4, US-U5, US-U6, US-U8  
**Status:** RESOLVED — US-U2–U8 acceptance criteria transcribed to `PROJECT_SPECIFICATION.md` §§ 7.2–7.8 (Job Input UX, Analysis Readability, Review Tables, Rewrite Presentation, Generation Feedback, Accessibility, Responsive Performance)

**Description:**  
The UX expert stories define concrete acceptance criteria for every major UI surface, but none of their
requirements are reflected in REQUIREMENTS.md or the Phase 5 implementation plan:

| Story | Requirement with no spec |
|-------|--------------------------|
| US-U2 | Protected-site contextual guidance; fetch spinner within 300 ms; inline-editable extracted fields |
| US-U3 | Analysis chunked into ≥4 distinct visual sections; keyword rank visualisation; mismatch above the fold |
| US-U4 | Bulk accept/reject for tables >8 rows; inline row expansion without navigation; reorder controls without hover |
| US-U5 | Inline red/green diff for rewrites (not side-by-side boxes); edit path without destroying diff view |
| US-U6 | Step-labelled generation progress; inline PDF preview iframe; multiple version labels |
| US-U8 | Layout functional at 1280×800; skeleton placeholders for async content; ≤2 s shell load |

**Recommended resolution:**  
- For each story, add a corresponding `### UI: {Component}` subsection to REQUIREMENTS.md §7 lifting
  the acceptance criteria into the spec (they are already written — this is transcription work)
- Prioritise US-U3 (analysis readability), US-U5 (rewrite diff), and US-U4 (review tables) as these
  are prerequisites for Phase 5 implementation work already in progress

---

## GAP-17: Persuasion Artefacts — Not Defined Anywhere

**Severity:** MEDIUM  
**Affected stories:** US-P3, US-P4, US-P6  
**Status:** RESOLVED — `LLMClient.check_strong_action_verb()` implemented (`llm_client.py` line 366); filler/passive phrase detection integrated in `conversation_manager.py` (line 892) as per-bullet persuasion checks; config-driven verb/phrase lists in place

**Description:**  
Three artefacts are referenced by persuasion expert stories but do not exist anywhere in the project:

1. **Strong action verb list** (US-P4) — US-P4 acceptance criterion: *"Every proposed bullet begins with a verb from an approved strong-action-verb list."* No such list is defined. Required fields: verb stem, category (leadership, technical, delivery, analysis), minimum seniority level.

2. **Filler phrase / weak language list** (US-P3, US-P4) — US-P3 requires flagging summaries with more than one generic filler phrase; US-P4 requires flagging bullets with passive or weak constructions. Phrases to include: "results-driven", "responsible for", "helped to", "assisted with", "was involved in", "passionate about", "team player", "detail-oriented". No list is defined.

3. **CAR (Challenge-Action-Result) structure detection** (US-P3) — US-P3 requires the system to identify bullets that already contain challenge language and propose CAR restructuring. No detection logic or prompt specification exists.

**Recommended resolution:**  
- Add a `strong_action_verbs` list to `config.yaml` (or a standalone `config/persuasion_rules.yaml`) with ~60 approved verbs grouped by category
- Add a `weak_phrases` list to the same config file covering the filler/passive constructions above
- Add a `### Persuasion Quality Checks` subsection to REQUIREMENTS.md §1 or §6 specifying:
  - Action verb validation: run on every proposed bullet before presenting for review
  - Filler phrase detection: run on summary and cover letter; flag if count > 1
  - CAR detection: LLM prompt that identifies challenge clause presence in a bullet and proposes restructuring if found
- All three checks are warn-level (surfaced for user decision), not hard-fail

---

## GAP-18: Workflow Stage Re-run — Not Specified, Not Implemented

**Severity:** HIGH
**Affected stories:** US-A12, US-U1, US-A6
**Status:** RESOLVED — `conversation_manager.back_to_phase()` (line 998) and `conversation_manager.re_run_phase()` (line 1025) implemented; `/api/back-to-phase` and `/api/re-run-phase` endpoints exposed in `web_app.py` (lines 2444, 2461); downstream context passed to re-run LLM calls via `_build_downstream_context()`; re-run controls accessible via workflow step chips

**Description:**
US-A12 requires that users can re-run any completed earlier workflow stage (e.g., re-trigger job analysis
after proceeding to customisations) without silently discarding downstream approved decisions. This is
distinct from US-A6 (post-generation iterative refinement) and US-U1 (general back-navigation safety):
US-A12 specifically addresses *intentional re-processing* of a step — for example, re-running the LLM
analysis when the user suspects it was incomplete or used wrong clarification answers.

Current gaps:

- `conversation_manager.py` only advances phases forward; no `re_run_phase()` or `back_to_phase()` logic
  exists that preserves downstream state.
- The progress indicator in `web/index.html` does not expose a re-run affordance on completed stages.
- No spec for how a re-run LLM call should receive downstream approved decisions as context.
- No spec for diff-highlighting which items changed as a result of the re-run vs. items unaffected.
- Overlaps with GAP-02 (back-transition logic) but is broader: GAP-02 covers post-generation re-entry;
  GAP-18 covers re-running any step at any point in the workflow, including mid-workflow.

**Recommended resolution:**

- Add `### Workflow Stage Re-run` subsection to REQUIREMENTS.md §7 specifying:
  - Which stages support re-run (all completed stages)
  - Confirmation dialogue content: affected downstream stages listed, preservation guarantee stated
  - LLM re-run context: must include original job text, current clarification answers, and a compact
    summary of all downstream approved decisions
  - Diff highlighting: after re-run, items that changed vs. prior run are flagged; unchanged items
    retain approved state without requiring re-confirmation
- Implement `conversation_manager.re_run_phase(phase_name)` that:
  - Saves current downstream state as a checkpoint before re-running
  - Resets only the target phase and marks downstream phases as "needs review" (not "approved")
  - Provides rollback if user cancels after seeing re-run results
- Add re-run controls to the progress indicator in `web/index.html` (visible on completed stage chips)
- Amend the `/api/analyze` endpoint (and equivalent phase endpoints) to accept optional
  `downstream_context` payload when called as a re-run
- Session audit log must record each re-run event: phase name, timestamp, changed item count

---

## GAP-19: Master CV Editor — No Structured Pre-Workflow Editing UI

**Severity:** HIGH
**Affected stories:** US-A10, US-A11
**Status:** OPEN — `tab-editor` (CV Editor) disabled 2026-03-16; it edited a session-scoped copy of CV data, not `Master_CV_Data.json`; `tab-master` (Master CV tab) partially covers achievements and summaries only; no UI covers personal info, experiences, skills, education, or publications in the master file

**Description:**
The app has no pre-workflow entry point for creating or maintaining `Master_CV_Data.json`. The full
JSON schema includes: `personal_info`, `professional_summaries`, `experience` (each with `achievements`
array), `skills` (with proficiency, tags, domains), `education`, `publications`, and `certifications`.

The current state:

- **CV Editor tab** (now hidden): edited a session-scoped copy (`/api/cv-data`) with a simplified schema; changes were ephemeral and did not write back to `Master_CV_Data.json`
- **Master CV tab**: covers only `selected_achievements` and `professional_summaries` via `/api/master-data/overview`; does not cover experiences, skills, education, publications, or personal info

This means users have no in-app way to add a new job, update skills, or correct contact details. They
must manually edit the JSON file in a text editor, which is error-prone and incompatible with
non-technical users.

**Recommended resolution:**
Implement a **Master CV app mode** as a distinct UI context (not a tab in the job-application workflow),
with sections covering:

1. **Personal Info** — name, title, contact details, languages
2. **Experience** — add/edit/delete experience entries; per-entry: title, company, location, dates, employment type, tags, importance; nested achievement bullets (add/edit/delete/reorder)
3. **Skills** — add/edit/delete with proficiency level, domain tags, aliases
4. **Education** — degree, institution, dates, relevant coursework
5. **Publications** — title, authors, venue, year, URL, importance flag
6. **Certifications** — name, issuer, date, URL
7. **Professional Summaries** — keyed summary variants (already partially implemented)

UX requirements:

- Structured form fields (not raw JSON editing) for all sections
- Per-section save with optimistic UI; full-file backup before any write
- Import path: upload existing CV (PDF/DOCX/JSON) and parse into structured fields for review (overlap with GAP-01 NL/document ingestion path)
- Export: download current `Master_CV_Data.json`
- Preview: render a "full unfiltered CV" from master data to verify completeness
- Git commit on save (same pattern as harvest apply)

**Relationship to other gaps:**

- GAP-01 covers the NL update and document ingestion path into master data — complement, not duplicate
- GAP-11 (skills deduplication) and GAP-13 (skill write-back) should route through this editor's save logic
- The existing Master CV tab (`tab-master`) should be merged into or replaced by this new mode
