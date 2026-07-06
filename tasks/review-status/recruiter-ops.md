<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Recruiter/Ops Review Status

**Last Updated:** 2026-07-06 14:30 ET

**Executive Summary:** Source-verified recruiter/ops persona review against US-O1 (submission readiness), US-O2 (metadata & tracking), and US-O3 (file naming & package hygiene). All three story items have meaningful partial implementations but each carries one or more gaps that limit recruiter confidence at the point of final package handoff. Nine additional gaps proposed.

---

## Application Evaluation

### US-O1: Submission Readiness Clarity

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Final outputs clearly visible and distinguishable | ✅ Pass | `web/final-generate.js:28–68` — `_fileLabel()`, `_fileIcon()`, `_fileDescription()` distinguish ATS-PDF, Human-PDF, ATS-Word, Human-Word, HTML with separate icons (🤖/📄/📝/🌐) and prose descriptions |
| UI makes clear which files are available and current | ⚠️ Partial | "Generated Files" tab (`web/final-generate.js:102–201`) shows files immediately after generation and displays the output directory path. However, `download-tab.js:381` (File Review tab) contains an inline advisory note that splits file-currency context across two tabs; a user who downloads from the Generated Files tab before visiting File Review has no ATS validation feedback |
| Finalise/archive clearly separated from earlier preview steps | ⚠️ Partial | The "Finalise" tab (`web/index.html:227`) has `style="display:none"` and is absent from `STAGE_TABS` (`web/ui-core.js:353–366`). Finalise content is reached only via `finalise-action-btn` (`index.html:198`) labeled "📦 Package Application Files" — a label that does not signal archive or final checkpoint. Functionality is fully implemented (`web/finalise.js:52–138`) but the entry point is ambiguous. |
| Final-stage UI supports confident readiness determination | ⚠️ Partial | `web/finalise.js:163–214` renders a 7-item readiness checklist (PDF/DOCX/HTML presence, cover letter, screening Q&A, ATS validation, layout freshness) with ❌/⚠ icons. No readiness signal is visible before entering the Finalise tab. |

**Gap:** The Finalise tab is hidden (`index.html:227 style="display:none"`) and absent from `STAGE_TABS`. The `finalise-action-btn` label "Package Application Files" does not communicate archiving to a recruiter who expects a clear "Archive Application" action.

---

### US-O2: Application Metadata and Tracking

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Status values understandable and actionable | ⚠️ Partial | Backend accepts 8 values: `draft`, `ready`, `sent`, `queued`, `interview`, `rejected`, `accepted`, `parked` (`generation_routes.py:2169`; `session_routes.py:721`). Finalise tab default is `queued` with tooltip "will apply soon" (`finalise.js:102`). Sessions list renders color-coded badges (`session-switcher-ui.js:372–384`). Gap: "queued" is pipeline jargon not universally intuitive to recruiters; "parked" is similarly informal. |
| Notes captured at point of finalisation | ✅ Pass | `web/finalise.js:113–120` — textarea with 2000-char limit and live counter. Notes saved to `metadata.json` via `POST /api/finalise` (`generation_routes.py:2166–2167`). Notes also editable inline in session list (`session-switcher-ui.js:401–415`). |
| Archive behavior preserves context for follow-up | ✅ Pass | `generation_routes.py:2183–2190` writes `finalised_at`, `clarification_answers`, `spell_audit`, `layout_instructions`, `validation_results`, and `ats_score` to `metadata.json`. Git commit is made at archive time (`generation_routes.py:2219–2231`). |
| Finalise flow supports practical tracking metadata | ✅ Pass | Status + Notes form at `web/finalise.js:96–128`. `_restoreFinaliseMeta()` (line 141) pre-populates from saved metadata on re-visit. |
| Workflow makes clear when metadata becomes part of the archive | ⚠️ Partial | The green confirmation panel (`finalise.js:324–335`) lists "Status", "Approved rewrites", ATS score, and "Git commit" after archiving. However, no pre-action summary shows what will be committed before clicking "Finalise & Archive." |

---

### US-O3: File Naming and Package Hygiene

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Generated files use job-relevant naming | ✅ Pass | `cv_orchestrator.py:1449–1452` — filename pattern `CV_{Company}_{Role}_{YYYY-MM-DD}.{ext}`; directory name `{Company}_{RoleSlug}_{YYYY-MM-DD}` (`cv_orchestrator.py:2068–2077`). ATS DOCX/PDF variants carry an `ATS` prefix inferred at rendering. |
| File review surfaces outputs in a manageable way | ⚠️ Partial | `download-tab.js:22–78` (`_collectDownloadableFiles()`) deduplicates and categorises files with clear description text. Gap: the File Review tab h1 reads "⬇️ Download Generated Files" (`download-tab.js:355,380`) while the step nav labels it "File Review" — terminology mismatch across surfaces. |
| Multiple generation passes do not obscure current output | ✅ Pass | `cv_orchestrator.py:2079–2088` increments `generation_run` counter. `download-tab.js:171–179` renders a "Run #N — {date}" timestamp. `state-manager.js:141–177` emits "Files outdated" / "Layout outdated" / "Layout current" freshness chips. |

---

## Generated Materials Evaluation

### File Format Completeness

Three formats are produced: Human PDF, ATS DOCX, and Human HTML (with embedded JSON-LD). Format selection is configurable in Settings (`ui-core.js:136–143`). Cover letter and screening Q&A are generated as DOCX (`download-tab.js:51–58`). All formats include descriptive labels distinguishing human-readable vs. ATS-optimised variants — appropriate for a recruiter audience.

**Gap (professional suitability):** The HTML file is described as "HTML format with embedded JSON-LD structured data" (`download-tab.js:64`). This is developer language; a recruiter reviewer has no context for "JSON-LD structured data." Final HTML files also lack the "Working file — not for submission" advisory that preview HTML files carry (`download-tab.js:205–206`), meaning a recruiter could accidentally submit the HTML file.

### Readiness Checklist Completeness

The `_renderReadinessChecklist()` at `web/finalise.js:163–214` gates on PDF, DOCX, and HTML presence (required, ❌); cover letter, screening Q&A, ATS validation, and layout freshness (advisory, ⚠). This is a solid recruiter-facing gate. However, the checklist is only visible inside the Finalise tab, which is reached via an ambiguously-labeled button, so a recruiter who archives without reviewing the checklist has no confirmation that all required files exist.

### ATS Score Traceability

ATS score is persisted to `metadata.json` at archival (`generation_routes.py:2188–2190`) and displayed in the session list as a color-coded percentage badge (`session-switcher-ui.js:424–430`). This supports cross-application comparison — a genuine ops strength for a recruiter managing multiple sessions.

---

## Terminology Review

| Term | Location | Issue |
|------|----------|-------|
| "Package Application Files" | `index.html:198` | Sounds like zipping files, not archiving. Recruiter expects "Archive Application" or "Finalise & Archive." |
| "Finalise" tab | `index.html:227` | Hidden (`style="display:none"`) — recruiter never sees this label; entry is only via the mislabeled action button. |
| "File Review" (step nav) vs "Download Generated Files" (tab h1) | `index.html:136`; `download-tab.js:355,380` | Same tab has two different names on two surfaces. |
| "queued — will apply soon" | `finalise.js:102` | "Queued" is internal pipeline metaphor; recruiter idiom is "Ready to Send" or "Pending Submission." |
| "Parked — on hold" | `finalise.js:109`; `session-switcher-ui.js:375` | "Parked" is informal jargon; "On Hold" or "Deferred" is more universally understood in recruiting. |
| "HTML format with embedded JSON-LD structured data" | `download-tab.js:64` | Developer language; should say "Web page format — not for direct submission" for a recruiter audience. |
| "Harvest" (step nav and tab) | `index.html:146,233` | Agricultural metaphor; "Save Improvements to Profile" is more self-explanatory. |
| "Layout current / Layout outdated / Files outdated" | `state-manager.js:150,163,170` | Internal pipeline terminology; recruiter cannot act on "Layout outdated" without knowing what to do next. |
| "Rewrite audit log" | `download-tab.js:473`; `finalise.js:219` | "Audit log" is compliance language; "Change history" or "Edit summary" is more intuitive. |

---

## Additional Story Gaps / Proposed Story Items

**US-O4: Finalise Tab Discoverability**
The archive flow is reachable only via "Package Application Files" (`index.html:198`). The Finalise tab is hidden (`index.html:227 style="display:none"`) and absent from `STAGE_TABS` (`ui-core.js:353–366`). Proposed: rename the button to "Archive Application" / "Finalise & Archive," and either expose the Finalise tab in the workflow nav or integrate the checklist directly into the File Review tab.

**US-O5: Readiness Summary Before Archive**
The readiness checklist (`finalise.js:163–214`) renders only after the user enters the Finalise tab. No pre-entry signal indicates package readiness. Proposed: surface a compact readiness badge (e.g., "3/3 required files ready ✅") in the position bar or File Review tab before the user reaches the Finalise step.

**US-O6: HTML File Classification for Non-Submission**
Final HTML files (`final-generate.js`, `download-tab.js`) lack the "Working file — not for submission" advisory that preview HTML files carry (`download-tab.js:205–206`). Proposed: label final HTML files as "Reference only — not for direct submission" to prevent recruiter confusion.

**US-O7: Status Value Plain-Language Alignment**
Status values `queued` and `parked` (`generation_routes.py:2169`) use informal jargon. Proposed: add display-label mapping that surfaces "Ready to Apply" instead of "Queued" and "On Hold" instead of "Parked" on all recruiter-facing surfaces, while preserving the internal key values.

**US-O8: Cross-Session Comparison and Filtering**
The session list (`session-switcher-ui.js`) shows ATS score, status, and company per session, but has no column sorting by ATS score or filter by status. A recruiter managing 10+ applications cannot easily identify the strongest packages. Proposed: add column-sort for ATS score and a status-filter dropdown in the sessions modal.

**US-O9: Archive Confirmation Pre-flight**
Clicking "Finalise & Archive" immediately fires `POST /api/finalise` and commits to git (`generation_routes.py:2219`). There is no pre-action confirmation dialog. Proposed: add a confirmation dialog showing status, notes, and the files list before archival.

**US-O10: Timestamp Accuracy in Sessions List**
Session rows display `lastModified` from in-memory state (`session-switcher-ui.js:333`), which reflects the session creation or last-save time — not the finalisation date. A recruiter tracking "applied on" dates sees the wrong timestamp. Proposed: expose `finalised_at` from `metadata.json` as the primary date displayed for completed/sent sessions.

**US-O11: Deliverable File List in Archive Confirmation**
The post-archive confirmation (`finalise.js:326–335`) lists status, approved rewrites, ATS score, and git hash, but does not enumerate which files were archived. Proposed: include the `files[]` list from `summary.files` in the confirmation panel so the recruiter can verify what was committed.

**US-O12: Notes Placeholder Guidance Alignment**
The Finalise tab notes placeholder reads "Recruiter name, salary info, follow-up date, interview notes…" (`finalise.js:119`). The sessions list inline notes editor shows only "e.g., Interviewed 2025-03-10, awaiting callback" (`session-switcher-ui.js:408`). Proposed: align both placeholders so the recruiter understands they are the same persistent field.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py (route registration lines 1090–1098), scripts/routes/generation_routes.py, scripts/routes/session_routes.py, web/finalise.js, web/download-tab.js, web/final-generate.js, web/session-switcher-ui.js, scripts/utils/cv_orchestrator.py

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-O1 | 1 | 3 | 0 | 0 | 0 |
| US-O2 | 3 | 2 | 0 | 0 | 0 |
| US-O3 | 2 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- US-O1 file visibility: `_fileLabel()/_fileIcon()/_fileDescription()` → `web/final-generate.js:28–68`
- US-O1 finalise hidden: `tab-finalise style="display:none"` → `web/index.html:227`; absent from `STAGE_TABS` → `web/ui-core.js:353–366`
- US-O1 readiness checklist: `_renderReadinessChecklist()` → `web/finalise.js:163–214`
- US-O2 status values: backend validation → `scripts/routes/generation_routes.py:2169`; server list → `scripts/routes/session_routes.py:721`
- US-O2 metadata archive: writes to metadata.json → `scripts/routes/generation_routes.py:2181–2190`
- US-O2 notes capture: textarea + counter → `web/finalise.js:113–120`
- US-O3 file naming: `CV_{Company}_{Role}_{date}` → `scripts/utils/cv_orchestrator.py:1449–1452`
- US-O3 generation counter: `generation_run` increment → `scripts/utils/cv_orchestrator.py:2079–2088`
- US-O3 h1 mismatch: "File Review" nav vs "Download Generated Files" h1 → `web/download-tab.js:355,380`
- Terminology button label: "Package Application Files" → `web/index.html:198`
- Terminology HTML description: "JSON-LD structured data" → `web/download-tab.js:64`

**Evidence standard:** Every conclusion supported by file:line evidence.
