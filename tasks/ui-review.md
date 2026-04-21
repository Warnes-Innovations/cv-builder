# CV Builder UI Review

**Related backlog docs:** [tasks/gaps.md](gaps.md), [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)

**GAP-19 cross-reference:** see [GAP-19 in tasks/gaps.md](gaps.md#gap-19-structured-master-cv-editor) for the canonical gap definition and [Phase 16 in IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md#phase-16--master-cv-editor-gap-19) for the active execution plan.

**Date:** 2026-04-20
**Review basis:** Full 17-persona source-verified review + independent heuristic evaluation (2026-04-20). All persona review files re-generated from current source code.
**Rollup inputs:** tasks/review-status/applicant.md, tasks/review-status/first-time-user.md, tasks/review-status/returning-user.md, tasks/review-status/power-user.md, tasks/review-status/ux-expert.md, tasks/review-status/accessibility-specialist.md, tasks/review-status/resume-expert.md, tasks/review-status/hiring-manager.md, tasks/review-status/hr-ats.md, tasks/review-status/persuasion-expert.md, tasks/review-status/recruiter-ops.md, tasks/review-status/master-cv-curator.md, tasks/review-status/trust-compliance.md, tasks/review-status/graphical-designer.md, tasks/review-status/backend-developer.md, tasks/review-status/frontend-developer.md, tasks/review-status/ci-cd-engineer.md, plus independent heuristic UX evaluation (Nielsen 10 + 8 UX dimensions).

---

## Executive Summary

The April 2026 review finds a substantially more capable application than the March review — the backend stages, ATS scoring, layout freshness tracking, and session governance are all real and working. The most severe remaining gaps cluster into four categories: **(1) critical onboarding failures** for first-time users (no master CV wizard, raw FileNotFoundError, no welcome screen); **(2) broken or missing interactions** in the current implementation (non-functional undo, cover letter hardwired opening, missing keyboard navigation, spell-check audit write-back, certifications API gap); **(3) product-language and information-architecture problems** that make the capable backend invisible to users (staged generation indistinguishable in the UI, triple-layer navigation overload, no inline help or ATS explanation); and **(4) technical quality gaps** in the engineering substrate (duplicated backend helpers, unsafe frontend modal HTML sinks, PR CI breadth that is materially narrower than the mainline suite).

**New gaps identified this review cycle:** 47 new GAPs (GAP-25 through GAP-71) added to `tasks/gaps.md`.

---

## Persona Story Tally (2026-04-20)

| Persona | Stories | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl |
| ------- | ------- | ------- | --------- | ------ | ---------- |
| Applicant (US-A) | 12 | 6 | 5 | 1 | 0 |
| First-Time User (US-F) | 4 | 1 | 2 | 1 | 0 |
| Returning User (US-S) | 9 | 5 | 4 | 0 | 0 |
| Power User (US-W) | 5 | 0 | 5 | 0 | 0 |
| UX Expert (US-U) | 9 | 3 | 5 | 1 | 0 |
| Accessibility (US-X) | 3 | 0 | 2 | 1 | 0 |
| Resume Expert (US-R) | 7 | 3 | 3 | 1 | 0 |
| Hiring Manager (US-M) | 7 | 3 | 2 | 2 | 0 |
| HR / ATS (US-H) | 8 | 3 | 3 | 2 | 0 |
| Persuasion Expert (US-P) | 6 | 2 | 3 | 1 | 0 |
| Recruiter-Ops (US-O) | 8 | 4 | 4 | 0 | 0 |
| Master CV Curator (US-M) | 4 | 3 | 1 | 0 | 0 |
| Trust / Compliance (US-C) | 3 | 1 | 2 | 0 | 0 |
| Graphical Designer (US-G) | 3 | 1 | 2 | 0 | 0 |

---

## Cross-Persona Read

- **Strongest implemented areas:** session governance and harvest/apply boundaries (Master CV Curator); ATS scoring infrastructure (HR/ATS, Applicant); review table interactions (Experience, Skills, Achievements, Publications); LLM busy overlay and progress feedback.
- **Most damaging UX gaps:** no master CV onboarding for first-time users; non-functional `undoInstruction()`; keyboard navigation blocked on step pills and tabs; spell-check audit write-back unreliable; pre-job master-data editing unreachable.
- **Critical bugs in current code:** cover letter opening hardwired as "Dear [name],"; certifications missing from `/api/master-data/full`; `post_analysis_answers` vs `clarification_answers` key mismatch; `showAlertModal` defined in two modules.
- **Product-language and IA problems:** staged preview/layout/finalise vocabulary inconsistent; "Harvest," "ATS," "Customise" undefined for new users; three-layer navigation (8-step bar + 20-tab bar + chat panel) creates triple navigation overload.

---

## Persona Matrix

| Persona | Overall read | Main takeaway |
| ------- | ----------- | ------------- |
| Applicant | ⚠️ Partial | Core customisation strong; generation staging, queued status, and key mismatch still incomplete. |
| First-time user | ❌ Critical gaps | No master CV onboarding — raw FileNotFoundError. No welcome screen or app explanation. Spell Check auto-advances silently to Generate. |
| Returning user | ⚠️ Partial | Session recovery works; restored-decision summary and "Move to Trash" label still weak. |
| Power user | ⚠️ Partial | Chat interface supports NL commands; no keyboard shortcuts, no bulk accept/reject anywhere. |
| UX expert | ⚠️ Partial | Step pills and back-navigation exist; keyboard-only blocked on divs; undo is a stub; no sequential review flow. |
| Accessibility specialist | ⚠️ Partial | Modal focus management strong; step pills and tabs not keyboard-reachable; confirmDialog missing ARIA. |
| Resume expert | ⚠️ Partial | Publications and bullet reordering are strong; spell-check audit write-back has key mismatch; synonym map not surfaced in UI. |
| Hiring manager | ⚠️ Partial | Role relevance and publication curation credible; publications heading degrades; venue-missing publications silent. |
| HR / ATS | ⚠️ Partial | ATS infrastructure real; skill-type classification purely heuristic; ATS results not written to metadata.json; no date-overlap detection. |
| Persuasion expert | ⚠️ Partial | Rewrite checks real but advisory; cover letter opening hardwired "Dear [name],"; word count ceiling wrong. |
| Recruiter-Ops | ⚠️ Partial | Finalise and archive usable; cover letter/screening DOCX excluded from File Review and Finalise package view. |
| Master CV curator | ✅ Strong | Phase enforcement and harvest/apply boundaries correct; certifications API bug; pre-job edit window unreachable from UI. |
| Trust / compliance | ⚠️ Partial | Review provenance substantial; persuasion warning can be bypassed; no LLM data-transmission disclosure. |
| Graphical designer | ✅ Mostly | Visual hierarchy serviceable; font size label in CSS px not pt; button class inconsistency (Bootstrap vs action-btn). |

---

## Technical Persona Read

| Persona | Overall read | Main takeaway |
| ------- | ----------- | ------------- |
| Backend developer | ⚠️ Strong local architecture with targeted debt | The Flask/Blueprint/session split is sound for a single-user local app, but `web_app.py` still reaches into route internals, duplicates helpers, and has several untested security/performance edge paths. |
| Frontend developer | ⚠️ Mature modularization with transitional seams | The frontend is well covered by tests and more modular than before, but it still depends on global exports, layered `window.fetch` monkey patches, and unsafe modal `innerHTML` sinks. |
| CI/CD engineer | ❌ Useful foundation, incomplete protection | CI runs CodeQL, JS tests, and harness tests, but PRs and `devel` do not receive the full regression suite, and there is no lint/typecheck gate. |

---

## Technical Gaps (Architecture, Security, CI)

The three technical personas added 22 source-backed engineering gaps spanning backend architecture, frontend security/maintainability, and CI/CD coverage. These do not replace the product and UX gaps above; they explain why several defects are recurring.

### Highest-priority technical additions

1. **GAP-61: Frontend modal HTML injection risk** — `ui-core.js` and `ui-helpers.js` both render modal bodies with unsanitized `innerHTML`, and `job-input.js` passes interpolated error/help strings into those helpers.
2. **GAP-66: PR CI does not run the broader Python regression suite** — the reduced PR workflow omits the wider non-UI test suite that only runs in the full `main` workflow.
3. **GAP-67: Full regression workflow does not protect the active development branch** — full integration triggers on `main` only, not `devel`.
4. **GAP-68: No lint/typecheck gate in GitHub Actions** — CodeQL and tests exist, but there is no `ruff`, `mypy`, or frontend build-verification job.
5. **GAP-50/GAP-52: Backend helper duplication and route-internal coupling** — `web_app.py` still duplicates utility logic and imports private helpers from route modules.

### Remaining technical backlog themes

- Backend: GAP-50 through GAP-60 cover duplicated helpers, CLI/web concern mixing, session-scan caching, explicit CORS hardening, session-ID entropy, and missing security-path tests.
- Frontend: GAP-62 through GAP-65 cover fetch-interceptor consolidation, retirement of `globalThis` state mirroring, bundling `app.js` into the module graph, and security regression coverage for modal rendering.
- CI/CD: GAP-69 through GAP-71 cover workflow deduplication, coverage/artifact publication, and CI/local environment parity.

---

## Heuristic Evaluation Summary (Nielsen 10)

| Heuristic | Severity | Top Finding |
| --------- | -------- | ----------- |
| H1 Visibility of status | 🟠 Major | 409-Conflict auto-retry disappears without confirming which operation succeeded |
| H2 Match with real world | 🟡 Minor | "Harvest" has no CV-industry precedent; "Experience Bullets" tab conflates experiences and achievements |
| H3 User control and freedom | 🟠 Major | Customise stage has 6 sub-tabs with no "Next →", no per-tab completion, no visible exit path |
| H4 Consistency and standards | 🟠 Major | `showAlertModal` defined in both `ui-core.js` and `ui-helpers.js`; same action button in chat panel AND inline tab content |
| H5 Error prevention | 🟠 Major | "Take Over" ownership conflict proceeds without warning unsaved work in other tab may be lost |
| H6 Recognition not recall | 🟠 Major | Customise stage 6 sub-tabs have no completion indicators; future steps have no tooltip/description |
| H7 Flexibility and efficiency | 🟡 Minor | No keyboard shortcuts; no bulk accept/reject; publications tab always visible even with no publications |
| H8 Aesthetic and minimalist | 🟠 Major | 20-tab bar with up to 7 simultaneous tabs; 40% of screen given to chat panel for mostly button-driven interactions |
| H9 Error recognition and recovery | 🟠 Major | LLM errors invisible when chat panel is collapsed; raw `data.error` strings with no remediation guidance |
| H10 Help and documentation | 🔴 Critical | No inline help, no tooltips, no onboarding, no ATS score explanation, no first-run guidance anywhere in the app |

---

## Top Gaps (New and Updated — 2026-04-20)

The following gaps are either new (introduced this review cycle) or have been substantially updated with new evidence. For the complete list of all 71 current gaps, see [tasks/gaps.md](gaps.md).

### CRITICAL

1. **GAP-36: No master CV onboarding** — First-time user with no `Master_CV_Data.json` receives a raw `FileNotFoundError` from `cv_orchestrator.py:130–133`. No UI intercepts it, no onboarding redirect, no creation wizard. All three creation paths (LinkedIn, resume, manual) are absent. `(first-time-user.md)`

2. **GAP-41: Pre-job master-data editing has no UI entry point** — Backend correctly permits master-data writes in `phase == init`, but the Master CV tab is only exposed in the `finalise` stage (`ui-core.js:358 STAGE_TABS`). Users who want to update their master CV before job analysis have no path to do so. `(master-cv-curator.md)`

3. **GAP-30: Cover letter opening hardwired "Dear [name],"** — The cover letter prompt hardwires "Dear [name]," preventing any pattern-interrupt opening, blocking persuasion story acceptance criteria for cover letters. `(persuasion-expert.md)`

4. **GAP-49: Spell-check auto-advances into generation without confirmation** — After `submitSpellCheckDecisions()` completes, the frontend immediately triggers `generate_cv` with no user prompt, no summary of what will be generated, and no indication of expected duration. Users lose all remaining opportunity to make changes without warning. `(first-time-user.md, heuristic H3)`

5. **GAP-20 (ongoing): Staged generation not story-complete** — Backend exposes preview → layout confirmation → final generation as distinct stages, but the frontend still presents them with overlapping labels and collapses layout confirmation into a single action. `(applicant.md, ux-expert.md)`

### HIGH

1. **GAP-25: `undoInstruction()` is a non-functional stub** — `layout-instruction.js:855–865` implements undo by posting a chat message ("I want to undo...") instead of rolling back to a prior layout snapshot. The Undo button exists but does not undo. `(ux-expert.md)`

2. **GAP-42: `GET /api/master-data/full` omits certifications** — `master_data_routes.py:284–302` does not include `certifications` in its response. `master-cv.js:60` reads `fullData.certifications || []`, so the Certifications section always renders empty regardless of stored data. `(master-cv-curator.md)`

3. **GAP-08 (strengthened): Spell-audit write-back unreliable** — `spell_check.audit` and `spell_audit` are used as state keys in different parts of the code. Accepted spell corrections may not propagate to generated CV text. `(resume-expert.md)`

4. **GAP-28: Publications heading (CLOSED)** — Fixed 2026-04-21. Template now renders **"Selected Publications"** when a subset is shown, **"Publications"** when all publications are included. Count suffix never appears in generated documents. `(hiring-manager.md)`

5. **GAP-29: Venue-missing publications render silently** — `.pub-venue-warn` CSS class is defined but dead — no code adds it when a venue is missing, so incomplete publication records render without any warning. `(hiring-manager.md)`

6. **GAP-32: ATS score and validation_results not written to metadata.json** — `cv_orchestrator.py:1878` does not persist `ats_score` and `validation_results` to `metadata.json` at generation time, breaking the audit trail for ATS compliance. `(hr-ats.md)` (extends GAP-04)

7. **GAP-33: No employment date overlap detection** — No code detects overlapping date ranges across experience entries. Fabricated or erroneous overlaps pass silently to the generated CV. `(hr-ats.md)`

8. **GAP-39: Cover letter and screening DOCX excluded from File Review and Finalise package view** — Cover letter and screening question DOCX files are generated but not surfaced in the File Review tab or the final package summary, making the package appear incomplete. `(recruiter-ops.md)`

9. **GAP-40: No submission readiness checklist in Finalise** — No checklist confirms all required package components (CV formats, cover letter, screening questions) are present, current, and ATS-compliant before archiving. `(recruiter-ops.md)`

10. **GAP-45: Persuasion warning acknowledgement can be bypassed** — The "Acknowledged" button for persuasion warnings lives inside the collapsed warning panel (`rewrite-review.js:85,92–96`). Users can submit all rewrite decisions without ever reading a single warning. `(trust-compliance.md)`

11. **GAP-37: No welcome screen or app-purpose statement** — First visit to the app shows "Select a Session" (`session-manager.js:204–219`), which is technical architecture copy, not user orientation. There is no "what is this app?" framing anywhere. `(first-time-user.md)`

12. **GAP-48: Duplicate `showAlertModal` definitions** — Both `ui-core.js` and `ui-helpers.js` define `showAlertModal` / `closeAlertModal`; `ui-helpers.js` explicitly notes the duplication in a comment. The active implementation depends on module-load order. `(heuristic H4)`

### MEDIUM

1. **GAP-26: Session restore message shows raw Python phase strings** — `session-manager.js:608` renders raw enum values ("customization", "rewrite_review") instead of human-friendly labels ("Customise", "Rewrites"). `(ux-expert.md)`

2. **GAP-31: Cover letter word count ceiling 400 vs story spec 300** — The backend uses a 400-word ceiling; the persuasion story spec requires ≤300 words for optimal recruiter review. `(persuasion-expert.md)`

3. **GAP-38: "Delete" session button label misleads** — The session delete button soft-deletes to Trash, but the label says "Delete." Users expect permanent deletion; the actual behavior is reversible. The label should read "Move to Trash." `(returning-user.md)`

4. **GAP-43: `master_data_routes._save_master` has no schema validation** — The routes module version of `_save_master` backs up and writes without running `validate_master_data_file`. A malformed write could produce an invalid master file without triggering the validation-and-restore safety net that `web_app.py`'s helper provides. `(master-cv-curator.md)`

5. **GAP-46: No in-app disclosure of LLM data transmission** — No notice informs users that CV content and job descriptions are transmitted to the configured external LLM provider. The localhost URL implies data stays local. `(trust-compliance.md)`

6. **GAP-47: Font size control labeled in CSS px, not typographic pt** — The layout tab uses "Base font size (px)" label; graphic designers think in typographic points (pt). A 12px default looks like a tiny font to designers expecting 12pt. `(graphical-designer.md)`

---

## Ongoing Gaps (Confirmed Continuing — 2026-04-20)

The following gaps from the March review were confirmed as still open in the April review:

| GAP | Status | Brief |
| --- | ------ | ----- |
| GAP-01 | OPEN | NL master-data update and document ingestion unimplemented |
| GAP-02 | PARTIAL | Layout-only refinement routing incomplete |
| GAP-03 | PARTIAL | Finalise missing Drive sync and keyword-match score card |
| GAP-04 | PARTIAL | ATS validation not auto-triggered post-generation (strengthened by GAP-32) |
| GAP-05 | PARTIAL | Page-count thresholds not enforced through layout review |
| GAP-06 | PARTIAL | Rewrite review has no sequential "Approve & Next" flow |
| GAP-07 | PARTIAL | Row-level reorder only for bullets; not for experience/achievement/skill rows |
| GAP-08 | PARTIAL | Spell audit write-back unreliable (strengthened by spell_check.audit key mismatch) |
| GAP-09 | PARTIAL | Bullet quality checks advisory only; no minimum bullet count |
| GAP-10 | PARTIAL | Keyword weighting and synonym map not visible in UI |
| GAP-11 | PARTIAL | Hard/soft skill classification missing |
| GAP-14 | PARTIAL | Session restore context weak; rerun affordance hover-only |
| GAP-15 | PARTIAL | Keyboard/ARIA coverage incomplete (step pills, tabs, confirmDialog, message input) |
| GAP-16 | PARTIAL | Navigation IA overload: triple-layer navigation system |
| GAP-17 | PARTIAL | Persuasion checks advisory; cover letter narrative not enforced |
| GAP-18 | PARTIAL | Rerun affordance not visible without hover |
| GAP-19 | PARTIAL | Master CV editor depth, history, and preview incomplete |
| GAP-20 | PARTIAL | Staged generation not story-complete in UI |
| GAP-21 | PARTIAL | ATS score visible but score explanation absent |
| GAP-22 | OPEN | Hard/soft skill typing in ATS DOCX missing |
| GAP-23 | OPEN | Intake metadata confirmation and clarification-answer key mismatch |
| GAP-24 | OPEN | Publication final rendering and heading persistence |

---

## Recommended Focus Order

### Tier 1 — Fix Now (CRITICAL bugs blocking adoption)

1. **GAP-36:** Add master CV onboarding — intercept missing `Master_CV_Data.json` before the raw exception propagates; add a creation wizard with at least one import path.
2. **GAP-49:** Gate spell-check completion with an explicit "Proceed to Generate?" confirmation step that summarizes what will be generated.
3. **GAP-30:** Remove the hardwired "Dear [name]," opener from the cover letter prompt and implement the configurable pattern-interrupt opening.
4. **GAP-41:** Expose the Master CV tab (or a dedicated "Edit Master CV" link) in the `job` stage so users can update their profile before job analysis.
5. **GAP-37:** Add a first-visit welcome screen that explains the app's purpose, prerequisites, and first step.

### Tier 2 — Fix Soon (HIGH bugs)

1. **GAP-25:** Fix `undoInstruction()` to roll back to a prior layout snapshot rather than posting a chat message.
2. **GAP-42:** Add `certifications` to the `GET /api/master-data/full` response.
3. **GAP-28/GAP-29:** Fix publications heading rendering and activate the `.pub-venue-warn` CSS class.
4. **GAP-32:** Persist `ats_score` and `validation_results` to `metadata.json` at generation time.
5. **GAP-48:** Eliminate the duplicate `showAlertModal` definition — one canonical version in `ui-core.js`.
6. **GAP-39:** Surface cover letter and screening DOCX in File Review and Finalise package view.
7. **GAP-45:** Gate rewrite submission on persuasion warning acknowledgement.

### Tier 3 — Polish (MEDIUM)

1. **GAP-26:** Replace raw phase strings in session restore messages with human-friendly labels.
2. **GAP-46:** Add a first-session LLM data-transmission disclosure.
3. **GAP-43:** Add schema validation to `master_data_routes._save_master`.
4. **GAP-38:** Rename session "Delete" button to "Move to Trash."
5. **GAP-47:** Display font size in pt equivalent alongside the CSS px label.
6. **GAP-31:** Reduce cover letter word count ceiling from 400 to 300.
