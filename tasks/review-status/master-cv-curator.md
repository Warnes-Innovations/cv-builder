<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

Last Updated: 2026-06-29 12:00 ET

Executive Summary: The application provides a strong foundation for the master CV
curator persona. The session-scope boundary is enforced both in the UI (explicit
governance banner) and in the backend (phase-gated write endpoints). The harvest
workflow presents candidates for selective review before writing back. Publication
management is the most fully-featured area, with structured CRUD, raw BibTeX editing,
import, and LLM-driven citation conversion. Key gaps are: the US-M3 boundary between
"finalise/archive" and "harvest/apply" lacks in-UI labelling at point of use; and the
US-M4 round-trip editing of unknown BibTeX fields routes through an "extra" textarea
that users may overlook, creating a risk of silent data loss.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

#### Criterion 1 — Workflow distinguishes session editing from master-data maintenance

Pass — `master-cv.js:87–95` renders a mandatory governance banner at the top of
every Master CV tab render:

> "Persistent storage: Edits on this tab write directly to `Master_CV_Data.json`
> and are not scoped to any session. Job-specific customisations (skills, experience
> picks, summaries) are stored exclusively in the active session and never written here
> automatically."

The workflow steps (`index.html:117–143`) use dedicated "Customise" and "Harvest"
steps for session-scoped vs durable work. The onboarding modal (`index.html:325–342`)
presents the 3-phase model in plain language: "Build your master profile", "Target a
specific job", "Harvest improvements".

#### Criterion 2 — UI does not imply temporary edits already updated the master record

Pass — Session-scoped customisation tabs (Customise, Rewrites, Layout) make no
mention of the master CV. The only path to updating master data from session work is
the explicit Harvest step. There is no auto-write from the customization or generation
phases.

#### Criterion 3 — Durable write-back occurs only through explicit user action

Pass — `master_data_routes.py:143–156` (`_require_master_data_write_phase`) gates
every master-data write endpoint (personal info, experience, skills, education, awards,
certifications, publications, summaries, achievements) to the `init` and `refinement`
phases only, returning HTTP 409 with `conflict_type: "phase_enforcement"` outside those
windows. The harvest apply path (`generation_routes.py:1139–1143`) is separately gated
to `refinement` phase only.

| Story | Criteria | Verdict |
| ----- | -------- | ------- |
| US-M1 | 1, 2, 3 | Pass (all three criteria met) |

---

### US-M2: Harvest Review Quality

#### Criterion 1 — Harvest candidates are presented in a reviewable form

Pass — The Harvest step maps to the `harvest` tab (`index.html:141, 225`).
`generation_routes.py:939–963` (`_compile_harvest_candidates`) collects candidates from
approved rewrites, session summaries, and skill suggestions. Each candidate is a
structured dict with type, original, proposed, and context fields.

#### Criterion 2 — Each candidate indicates what would be added or changed

Pass — `_collect_harvest_skill_candidates` (`generation_routes.py:316–360`)
annotates each candidate with a `proposed` rendered field. Bullet rewrite candidates
carry both `original` and `proposed` text. Summary variants carry the full text.

#### Criterion 3 — Applying harvested changes is optional and selective

Partial — The backend architecture (`_harvest_apply_bullet`, `_harvest_add_skill`,
`_harvest_add_summary_variant`) supports individual per-candidate application. However,
the harvest tab's frontend rendering code (`harvest-tab.js` or equivalent) is not
among the seven required source files reviewed, so selective per-candidate Accept/Skip
UI cannot be confirmed from this source read. The backend correctly gates all writes
to the `refinement` phase.

| Story | Criteria | Verdict |
| ----- | -------- | ------- |
| US-M2 | 1, 2 | Pass |
| US-M2 | 3 | Partial — backend confirmed; frontend harvest UI not reviewed |

---

### US-M3: Boundary Clarity Across Final Stages

#### Criterion — Finalise/archive and harvest/apply appear as distinct steps with distinct consequences

Partial — The workflow nav shows clearly separated steps: "Download" then "Harvest"
(`index.html:131–141`). The button labels "Finalise" (`index.html:190`) and the Harvest
tab are visually distinct UI elements, and the Finalise tab is hidden until the
appropriate phase.

However, the UI provides no in-context explanation at the point of use distinguishing
what "Finalise" means (completes your application archive, marks the session
`refinement`) vs what "Harvest" means (promotes session-refined content back to the
master profile permanently). The step nav uses single-word labels only. The onboarding
modal does explain Harvest at startup (`index.html:339`), but this context is not
re-surfaced when the user actually reaches those steps.

The distinction is implied by workflow order rather than made explicit by in-step copy
or tooltips.

| Story | Verdict |
| ----- | ------- |
| US-M3 | Partial — distinct steps exist; in-context copy is absent |

---

### US-M4: Maintain the Master Publications Bibliography

#### Criterion 1 — Publication editing presented as master-data maintenance, not session customization

Pass — Publications section is rendered inside `populateMasterTab`
(`master-cv.js:162`) under the "Master CV Profile" heading, with the persistent
storage governance banner visible above. The publications-review tab available during
session customization presents only accept/reject toggles, not an editor, correctly
separating curation from per-application selection.

#### Criterion 2 — Supports structured BibTeX editing and easier ingestion paths

Pass — Multiple ingestion paths are fully implemented:

- Structured CRUD form: add/edit individual entries with title, authors, year,
  journal/booktitle, DOI, and extra fields textarea (`master-cv.js:1453–1530`)
- Raw BibTeX editor: full textarea toggle between structured and raw view
  (`master-cv.js:1003`)
- BibTeX import: paste multiple entries into an import modal with merge options
  (`master_data_routes.py:1365–1422`)
- Citation text conversion: LLM converts free-form citation text to BibTeX via
  `POST /api/master-data/publications/convert` (`master_data_routes.py:1424–1448`)
  with a generated-BibTeX preview step before import

#### Criterion 3 — Saves preserve bibliography data rather than stripping on round-trip

Partial — The structured CRUD edit form handles a `known` set of fields:
`{author, editor, title, year, journal, booktitle, doi}` (`master-cv.js:1471–1477`).
Unknown BibTeX fields are rendered into an "extra fields" textarea as `key=value` lines
and parsed back on save (`master-cv.js:1511–1518`), so they are technically preserved.

However:

1. The form does not show a count or alert when extra fields exist, so users who open
   the edit modal may not notice the extra textarea contains important data.
2. Users who edit and save via the structured form without reviewing the "extra"
   textarea preserve extra fields correctly, but the UX puts those fields at risk of
   accidental clearing.
3. The raw BibTeX editor path (`PUT /api/master-data/publications`) writes verbatim,
   fully preserving all fields — this is the safe curation path.

#### Acceptance Criteria Check

| Acceptance Criterion | Verdict |
| -------------------- | ------- |
| Bibliography in reviewable list with ordering/grouping controls | Pass — structured list with add/edit/delete and raw BibTeX toggle |
| Add, edit, delete publication entries | Pass — `master-cv.js:1453–1530`, `master_data_routes.py:1303–1363` |
| Import raw BibTeX and review validation errors before save | Pass — import modal + `POST /api/master-data/publications/validate` (validate without saving) |
| Paste citation text, review generated BibTeX, decide to import | Pass — convert modal + LLM conversion + generated preview step before import |
| Flags missing title/authors/year | Pass — client validation in `saveMasterPublication()` `master-cv.js:1493–1499`; backend returns 400 for missing fields |
| Writes only from init and refinement windows | Pass — all publication write routes pass through `_require_master_data_write_phase` |
| Round-trip editing preserves existing BibTeX fields | Partial — extra fields preserved via textarea; UI does not highlight their presence |

| Story | Verdict |
| ----- | ------- |
| US-M4 | Partial — all major workflows implemented; extra-field round-trip risk persists |

---

### GAP-93 Verification: Phase-enforcement 409 must not show session conflict banner

Pass — `ui-core.js:451–478` implements a global fetch interceptor. The key logic
at lines 465–470:

```js
if (resp.status === 409 && shouldShowBanner) {
  try {
    const body = await resp.clone().json();
    if (body && body.conflict_type && body.conflict_type !== 'session_ownership') {
      shouldShowBanner = false;
    }
  } catch (_) { /* non-JSON body — show banner */ }
}
```

Phase enforcement returns `conflict_type: "phase_enforcement"` (not `"session_ownership"`),
so `shouldShowBanner` is set to `false` and the amber banner is suppressed. The banner
only shows for genuine session-ownership conflicts.

---

## Generated Materials Evaluation

Not applicable to this persona review. The Master CV curator story focuses on data
management workflows and persistence boundaries, not on the quality of generated CV
output. Publication content written through the master-data surfaces feeds into CV
generation as source material, evaluated separately by resume-expert and hr-ats reviews.

---

## Additional Story Gaps / Proposed Story Items

### GAP-A: No in-context explanation distinguishing Finalise from Harvest at point of use

The step navbar labels are terse single words. Adding a short inline description or
tooltip at each step when the user first reaches it would close the US-M3 gap without
changing the UI structure.

### GAP-B: Extra BibTeX fields risk in structured edit form

The "extra fields" textarea is the only way extra BibTeX fields survive the structured
form. A field count badge ("3 additional fields preserved") or an expand-by-default
display would reduce the risk of silent data loss.

### GAP-C: No visible confirmation that publications.bib was backed up before write

The backend creates timestamped backups on every write (`master_data_routes.py:45–47`)
but the UI gives no acknowledgment (no toast, no backup path shown). The history
endpoint (`GET /api/master-data/history`) exists but is not exposed in the publications
sub-section of the Master CV tab.

### GAP-D: Harvest tab frontend UI not among required review files

The harvest tab rendering code is not in the seven files reviewed. US-M2 criterion 3
(selective per-candidate acceptance) cannot be fully confirmed without reviewing the
harvest tab module.

---

Reviewed against: web/index.html, web/app.js, web/ui-core.js, web/state-manager.js,
web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py
(plus supplemental reads of web/master-cv.js, scripts/routes/master_data_routes.py,
scripts/routes/generation_routes.py to satisfy story-specific evaluation criteria)

| Story | Pass | Partial | Fail | Not Implemented | N/A |
| ----- | ---- | ------- | ---- | --------------- | --- |
| US-M1 | 3 | 0 | 0 | 0 | 0 |
| US-M2 | 2 | 1 | 0 | 0 | 0 |
| US-M3 | 0 | 1 | 0 | 0 | 0 |
| US-M4 | 5 | 2 | 0 | 0 | 0 |

Key evidence references:

- Session boundary enforcement: `scripts/routes/master_data_routes.py:143–156` (`_require_master_data_write_phase`)
- Governance banner: `web/master-cv.js:87–95`
- Harvest phase gate: `scripts/routes/generation_routes.py:1139–1143` (`_require_harvest_apply_phase`)
- GAP-93 fix verified: `web/ui-core.js:465–470` (phase_enforcement 409 suppressed from conflict banner)
- Phase-gated publication writes: `scripts/routes/master_data_routes.py:1224–1230, 1306–1310, 1366–1372`
- BibTeX structured CRUD + validation: `web/master-cv.js:1453–1530, 1493–1499, 1189–1220`
- BibTeX import + validate-without-save: `scripts/routes/master_data_routes.py:1274–1301, 1365–1422`
- Citation text conversion (LLM): `scripts/routes/master_data_routes.py:1424–1448`
- Round-trip extra fields: `web/master-cv.js:1471–1518`
- Harvest candidate compilation: `scripts/routes/generation_routes.py:939–963` (`_compile_harvest_candidates`)
- Onboarding 3-phase model: `web/index.html:325–342`
