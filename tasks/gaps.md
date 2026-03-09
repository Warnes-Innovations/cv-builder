# Gaps Analysis: User Stories vs. Specifications & Implementation

**Generated:** 2026-03-06  
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
**Status:** Session-harvest path now specified in US-A11; NL update and document ingestion path (US-A10) still not specified, not implemented

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
**Status:** Partially specified in REQUIREMENTS.md §1 (iterative step 8), not implemented in `conversation_manager.py`

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
**Status:** Mentioned as acceptance criteria in US-A9; REQUIREMENTS.md §2 briefly mentions Drive integration; no implementation

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
**Status:** Mentioned in US-H6 acceptance criteria; not in REQUIREMENTS.md; not implemented

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
**Status:** Not in REQUIREMENTS.md; not implemented

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
**Status:** Card UI behaviour is in US-A4; UX presentation criteria in US-U5; not in REQUIREMENTS.md or PROJECT_SPECIFICATION.md; Phase 5 (web UI) not started

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
**Status:** Mentioned in US-A3 ("drag-and-drop or up/down controls"); not in REQUIREMENTS.md; not implemented in web UI

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
**Status:** Spec section exists (REQUIREMENTS.md §6); `rewrite-feature.md` Phases 4–6 do not include it; no implementation

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
**Status:** Specified in `tasks/rewrite-feature.md` §2.4 (`_enhance_achievement_for_ats`); not in REQUIREMENTS.md

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
**Status:** Mentioned in REQUIREMENTS.md §1 ("group synonyms"); no algorithm specified; not implemented

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
**Status:** Not in REQUIREMENTS.md; not specifically implemented

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
**Status:** Behaviour described in US-R5 (asterisk + footnote); not in REQUIREMENTS.md; partial in rewrite-feature.md

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
**Status:** Write-back path now specified in US-A11 (Session Harvest); deduplication rules, written field schema, and `finalise()` implementation still needed

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
**Status:** Not in REQUIREMENTS.md; not implemented in `web/index.html`

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
**Status:** Not in REQUIREMENTS.md, PROJECT_SPECIFICATION.md, or any implementation file

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
**Status:** Evaluation criteria exist in user stories; no corresponding REQUIREMENTS.md spec sections; no implementation

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
**Status:** Required by persuasion expert acceptance criteria; not in REQUIREMENTS.md, config.yaml, or any implementation file

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
