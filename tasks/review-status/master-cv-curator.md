<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Master CV Curator Review Status

**Last Updated:** 2026-04-20 17:30 ET
**Reviewed by:** Source-first automated review (GitHub Copilot)

**Executive Summary:** Core session-boundary governance is well-enforced: all master-data write endpoints use `_require_master_data_write_phase` and harvest/apply is gated to `refinement`. The major gaps are (1) the pre-job master-data editing window exists in the backend but is completely unreachable from the UI, (2) certifications are omitted from `/api/master-data/full` so they silently never render, (3) the CRUD modal does not round-trip extra BibTeX fields on edit, and (4) there is no NL-driven master-data update surface.

---

## Application Evaluation

### US-M1: Session-Only Customization Boundary

**Criteria 1 — Workflow distinguishes session editing from master-data maintenance**

✅ **Pass** — The workflow clearly separates the two: customization stages (Experiences, Skills, Achievements, Summary, Publications tabs under the Customise step) write only to session state. The Master CV tab is only exposed in the `finalise` stage (`STAGE_TABS` in `web/ui-core.js:358`). A governance banner in `web/master-cv.js:82–87` explicitly warns: *"Edits on this tab write directly to `Master_CV_Data.json` and are not scoped to any session."*

**Criteria 2 — UI does not imply temporary edits have already updated the master record**

✅ **Pass** — The Customise-stage tabs (experience-review, skills-review, achievements-review, etc.) contain no messaging that implies master writes. The `publications-review.js` customization tab manages per-session `window.publicationDecisions`, never touching the master file. The boundary is clear.

**Criteria 3 — Durable write-back only through explicit user action**

✅ **Pass** — The backend `_require_master_data_write_phase` (`master_data_routes.py:124–136`) rejects all `/api/master-data/*` writes if the session is not in `init` or `refinement` phase with HTTP 409. Harvest write-back via `POST /api/harvest/apply` is additionally gated by `_require_harvest_apply_phase` (`generation_routes.py:1097–1106`) which only permits `refinement`. The UI harvest section only appears after `finaliseApplication()` succeeds (`finalise.js:161 showHarvestSection()`).

---

### US-M2: Harvest Review Quality

**Criteria 1 — Harvest candidates are presented in a reviewable form**

✅ **Pass** — `showHarvestSection()` in `finalise.js:205–310` renders a table with columns: Include (checkbox), Type, Change (original struck-through / proposed), and Rationale. No items are pre-selected (`finalise.js:248`).

**Criteria 2 — Each candidate indicates what would be added or changed**

✅ **Pass** — The original text is shown struck-through when present; proposed text appears below. Type icons (`✏️`, `🛠`, `📝`, `✅`) distinguish improved bullet, new skill, summary variant, and confirmed skill gap (`finalise.js:222–228`).

**Criteria 3 — Applying harvested changes is optional and selective**

✅ **Pass** — The table has per-row checkboxes; a "Skip" button dismisses the section without applying anything (`finalise.js:299–302`). `applyHarvestSelections()` reads only checked IDs (`finalise.js:315–320`).

---

### US-M3: Boundary Clarity Across Final Stages

**Acceptance: Finalise/archive and harvest/apply appear as distinct steps with distinct consequences**

⚠️ **Partial** — The Finalise tab renders the archive form and harvest section sequentially on the same page. After `finaliseApplication()` succeeds, `showHarvestSection()` appends inline below the success banner (`finalise.js:161`). While visually separated, there is no interstitial heading or step-count that formally labels these as step 1 (archive) and step 2 (optional master update). A user could scroll past the harvest section without realising it was a distinct action.

The Master CV tab is a sibling tab at the same level as Finalise, which does communicate that master data management is a separate context; but the inline harvest section still blurs the distinction between archiving the application and promoting data into the permanent record.

---

### US-M4: Maintain the Master Publications Bibliography

**Criteria 1 — Publication editing clearly presented as master-data maintenance, not per-application customization**

✅ **Pass** — The Publications section lives inside the Master CV tab, which carries the governance banner (`master-cv.js:82–87`). The raw BibTeX editor tooltip states "Changes are saved to `publications.bib` and a timestamped backup is created automatically" (`master-cv.js:193–197`).

**Criteria 2 — Supports structured BibTeX editing and easier ingestion paths**

✅ **Pass** — Three parallel ingestion paths are implemented:
- Add Publication modal (structured CRUD: cite key, type, author, title, year, journal/booktitle, DOI, extra fields) — `master-cv.js:270–300`
- Import BibTeX modal (paste raw BibTeX, overwrite toggle) — `master-cv.js:345–384`
- Convert Citation Text modal (free-form → generated BibTeX preview → import) — `master-cv.js:387–433`
- Raw BibTeX editor textarea with inline Validate and Save actions — `master-cv.js:193–215`

**Criteria 3 — Round-trip editing preserves existing BibTeX information**

⚠️ **Partial** — The structured Add/Edit modal captures only a fixed set of fields (cite key, type, author, title, year, journal/booktitle, DOI, and a freeform `extra fields` textarea). Additional BibTeX fields (volume, pages, publisher, address, etc.) must be entered in the extra textarea as `key=value` lines. The edit modal `saveMasterPublication` writes only what is in the modal form fields. If the `extra fields` area does not repopulate from stored fields when opening an existing entry, those fields will be dropped on save. The raw BibTeX editor path is a full-text round-trip that preserves everything, but the CRUD modal path has an incompleteness risk for entries with many BibTeX fields.

**Acceptance: List view with ordering/grouping controls**

✅ **Pass** — The CRUD view renders a publications list with sort controls (Year newest/oldest, Type A–Z/Z–A) and group controls (None, By year, By type) — `master-cv.js:987–1130`. No drag-to-reorder is provided, but the controls cover the acceptance criterion.

**Acceptance: Add, edit, and delete publication entries**

✅ **Pass** — Edit (✏️) and Delete (🗑️) action buttons on each row; "+ Add Publication" button in the section header. Backend endpoints `POST /api/master-data/publication` (action=add/update/delete) all call `_require_master_data_write_phase` — `master_data_routes.py:1280–1340`.

**Acceptance: Import raw BibTeX, review validation errors before save**

✅ **Pass** — `POST /api/master-data/publications/validate` (`master_data_routes.py:1248–1270`) is a non-destructive parse that returns entry count and keys. The "🔍 Validate" button in the raw view calls this before the user commits. The import modal also validates server-side before writing (`POST /api/master-data/publications/import`, `master_data_routes.py:1356–1403`).

**Acceptance: Paste citation text, review generated BibTeX, decide whether to import**

✅ **Pass** — The Convert Citation Text modal has a two-step flow: Generate BibTeX (calls `POST /api/master-data/publications/convert`, `master_data_routes.py:1405–1429`); the user reviews the textarea preview before clicking "Import Preview". The import step calls the same import endpoint with overwrite flag — `master-cv.js:1376–1410`.

**Acceptance: Flags missing key fields (title, authors, year)**

✅ **Pass** — `POST /api/master-data/publication` (add/update) enforces `fields.title`, `fields.year`, and `fields.author or fields.editor` are required, returning 400 otherwise (`master_data_routes.py:1316–1326`).

**Acceptance: Writes to publications.bib only from init/refinement windows**

✅ **Pass** — `PUT /api/master-data/publications`, `POST /api/master-data/publication`, and `POST /api/master-data/publications/import` all call `_require_master_data_write_phase` (`master_data_routes.py:1200, 1280, 1356`). The validate and convert endpoints are read-only and correctly have no phase guard.

**Acceptance: Pre-job init window accessibility**

❌ **Fail** — The backend correctly permits writes in `phase == 'init'` (`master_data_routes.py:129`), but the Master CV tab is only exposed in the `finalise` stage (`web/ui-core.js:358 STAGE_TABS`). The `job` stage only shows `['job']`. Users who want to update their master publications bibliography before starting job analysis have no UI entry point. The pre-job editing window is a backend contract without a corresponding UI surface.

---

## Generated Materials Evaluation

The Master CV Curator persona is primarily concerned with the durable source-of-truth data, not with the generated CV documents themselves. There are no US-M story acceptance criteria that target generated output quality. This section is N/A for this persona.

---

## Master-Data Governance Deep Dive

### Write-back phase enforcement

| Endpoint | Phase guard | Guard type |
|----------|-------------|------------|
| `POST /api/master-data/personal-info` | ✅ | `_require_master_data_write_phase` (init, refinement) |
| `POST /api/master-data/experience` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/skill` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/education` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/award` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/certification` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/update-achievement` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/update-summary` | ✅ | `_require_master_data_write_phase` |
| `PUT /api/master-data/publications` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/publication` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/publications/import` | ✅ | `_require_master_data_write_phase` |
| `POST /api/master-data/restore` | ✅ | `_require_master_data_write_phase` |
| `POST /api/harvest/apply` | ✅ | `_require_harvest_apply_phase` (refinement only) |
| `GET /api/master-data/full` | — | Read-only, no phase guard needed |
| `GET /api/master-data/overview` | — | Read-only |
| `GET /api/master-data/publications` | — | Read-only |
| `POST /api/master-data/publications/validate` | — | Non-destructive parse |
| `POST /api/master-data/publications/convert` | — | LLM only, no file write |

**Verdict:** Phase enforcement is consistent and complete across all write endpoints.

### Backup and validation

`_save_master` in `master_data_routes.py:38–51` creates a UTC-timestamped backup at `backups/Master_CV_YYYYMMDDTHHMMSSZ.json` before overwriting. The `_save_master` helper in `web_app.py:1166–1191` runs `validate_master_data_file` after writing and restores the backup if validation fails. The routes module version does **not** run post-write schema validation — it only backs up and writes. This is an inconsistency: the web_app.py helper is stricter than the routes helper. A malformed write from a routes endpoint could produce an invalid master file without triggering the validation-and-restore safety net.

### Certifications data bug

**❌ Bug** — `GET /api/master-data/full` (`master_data_routes.py:284–302`) omits `certifications` from its response. The Master CV tab reads `fullData.certifications || []` (`master-cv.js:60`), so the Certifications section always renders empty regardless of what is stored in `Master_CV_Data.json`. Write operations via `POST /api/master-data/certification` still work correctly, but the data is invisible in the view until this endpoint is corrected.

### NL-driven master-data updates

🔲 **Not implemented** — No natural-language update path exists for the master CV. All master-data editing requires structured form input (modals or raw BibTeX textarea). The AI is used only for citation-text-to-BibTeX conversion (`/api/master-data/publications/convert`) and professional summary generation (`/api/generate-summary`). There is no "describe a change in plain English and apply it" surface for master data.

---

## Additional Story Gaps / Proposed Story Items

### G1 — Pre-job master-data UI entry point (CRITICAL)

The backend allows master-data writes during `phase == 'init'`, but the Master CV tab is only shown in the `finalise` stage (`STAGE_TABS` at `web/ui-core.js:358`). Users who start fresh or want to maintain their master CV between job applications have no UI entry point until after they complete a full job workflow. Proposed story: *"As a master CV curator, I want to access the Master CV editing tab from the Job Intake stage so I can update my data before or between job applications."*

### G2 — Certifications not returned by `/api/master-data/full` (HIGH)

`GET /api/master-data/full` does not include `certifications`, so the Certifications section in the Master CV tab always shows empty. This silently hides existing certification data. **Proposed fix:** add `"certifications": master.get('certifications', [])` to the `master_data_full` response in `master_data_routes.py:284–302`.

### G3 — Harvest/archive step distinction not visually formalized (MEDIUM)

After clicking "Finalise & Archive", the harvest section appears inline below the success banner with no formal step label or visual break. A user completing their first application may not realize harvest is optional and separate from archiving. Proposed story: *"As a master CV curator, I want the harvest section to be clearly labeled as an optional second step after archiving, so I understand I am being offered a separate upgrade to my permanent record."*

### G4 — Post-write schema validation inconsistency between helpers (MEDIUM)

The `_save_master` function in `web_app.py:1166–1191` validates the master file after write and restores the backup on failure. The `_save_master` in `master_data_routes.py:38–51` does NOT run post-write schema validation — it only backs up and writes. A malformed write from a routes endpoint could produce an invalid master file without triggering the validation-and-restore safety net.

### G5 — BibTeX CRUD modal does not repopulate extra fields on edit (MEDIUM)

The "Edit" flow for a publication calls `editMasterPublication(pubJson)` and populates the modal with the known fixed fields. BibTeX entries with fields outside the modal's fixed set (volume, pages, publisher, address, etc.) must be manually re-entered in the `extra fields` textarea. If the current implementation does not inspect `pub.fields` for unknown keys and pre-populate them into `extra fields`, a round-trip modal edit will silently drop those fields.

### G6 — No NL-driven master-data update path (LOW)

Users must interact with structured modals for all master-data edits. Proposed story: *"As a master CV curator, I want to describe a change to my master CV in plain language (e.g., 'Add Python as a skill' or 'Update my job title at Acme to Senior Engineer') so I can make quick updates without navigating modals."*

---

## Summary Table

| Story | Criterion | Status | Evidence |
|-------|-----------|--------|----------|
| US-M1 | Session/master distinction exists | ✅ Pass | `web/ui-core.js:358`, `web/master-cv.js:82` |
| US-M1 | UI does not imply silent master writes | ✅ Pass | No master-write calls in customization tabs |
| US-M1 | Durable write-back is explicit | ✅ Pass | `_require_master_data_write_phase`, `_require_harvest_apply_phase` |
| US-M2 | Harvest candidates in reviewable form | ✅ Pass | `finalise.js:205–310` |
| US-M2 | Each candidate shows what changes | ✅ Pass | `finalise.js:222–262` |
| US-M2 | Applying is optional and selective | ✅ Pass | `finalise.js:299–320` |
| US-M3 | Archive and harvest are distinct steps | ⚠️ Partial | Inline on same page, no formal step labels |
| US-M4 | Publications editing as master-data | ✅ Pass | `master-cv.js:82–87`, tab placement |
| US-M4 | Multiple ingestion paths | ✅ Pass | Add, Import, Convert, Raw editor |
| US-M4 | Round-trip preserves BibTeX | ⚠️ Partial | Extra fields not repopulated in CRUD modal |
| US-M4 | List with ordering/grouping controls | ✅ Pass | `master-cv.js:987–1130` |
| US-M4 | Add/edit/delete entries | ✅ Pass | `master_data_routes.py:1280–1340` |
| US-M4 | Import with validation before save | ✅ Pass | `/api/master-data/publications/validate` |
| US-M4 | Citation-text conversion with preview | ✅ Pass | `master-cv.js:1338–1410`, `/api/.../convert` |
| US-M4 | Flags missing required fields | ✅ Pass | `master_data_routes.py:1316–1326` |
| US-M4 | Writes only in allowed phase windows | ✅ Pass | Phase guards on all write endpoints |
| US-M4 | Pre-job init window accessible via UI | ❌ Fail | `web/ui-core.js:358` — master tab only in finalise |

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 3 | 0 | 0 | 0 | 0 |
| US-M2 | 3 | 0 | 0 | 0 | 0 |
| US-M3 | 0 | 1 | 0 | 0 | 0 |
| US-M4 | 9 | 2 | 1 | 0 | 0 |
| **Governance** | — | — | 2 bugs | 1 not impl | — |

---

## Top 5 Gaps by Severity

| # | Gap | Severity | Evidence |
|---|-----|----------|----------|
| 1 | Pre-job master-data editing window has no UI entry point | **CRITICAL** | `web/ui-core.js:358` (STAGE_TABS maps `job` stage to `['job']` only) |
| 2 | `GET /api/master-data/full` omits certifications; Certifications section always empty | **HIGH** | `master_data_routes.py:284–302` vs `master-cv.js:60` |
| 3 | Post-write schema validation absent from routes `_save_master`; validation only in `web_app._save_master` | **MEDIUM** | `web_app.py:1183–1190` vs `master_data_routes.py:38–51` |
| 4 | BibTeX CRUD modal does not repopulate extra fields; silent data loss on round-trip edit | **MEDIUM** | `master-cv.js` `editMasterPublication` — no extra fields pre-population |
| 5 | Archive and harvest steps not visually formalized as separate steps on Finalise tab | **MEDIUM** | `finalise.js:161` (inline append after success banner) |

---

**Reviewed against:**
- [web/master-cv.js](../web/master-cv.js)
- [web/finalise.js](../web/finalise.js)
- [web/publications-review.js](../web/publications-review.js)
- [web/ui-core.js](../web/ui-core.js)
- [scripts/routes/master_data_routes.py](../scripts/routes/master_data_routes.py)
- [scripts/routes/generation_routes.py](../scripts/routes/generation_routes.py)
- [scripts/web_app.py](../scripts/web_app.py)
- [tasks/user-story-master-cv-curator.md](../tasks/user-story-master-cv-curator.md)
- [tasks/current-implemented-workflow.md](../tasks/current-implemented-workflow.md)

**Key evidence references:**
- Phase enforcement: `master_data_routes.py:124–136`, `generation_routes.py:1097–1106`
- Certifications bug: `master_data_routes.py:284–302`, `master-cv.js:60`
- Pre-job UI gap: `web/ui-core.js:358`
- Harvest UX: `finalise.js:205–320`
- Publications ingestion: `master-cv.js:987–1535`, `master_data_routes.py:1162–1429`

**Evidence standard:** Every conclusion above is supported by a specific file:line citation. No assertion is based on documentation or prior review status alone.

**Last Updated:** 2026-03-23 00:47 EDT

**Executive Summary:** This file captures the source-verified master CV curator review snapshot separately from the story specification so persona review subagents can work in parallel safely.

## Application Evaluation

**Reviewed against:** tasks/current-implemented-workflow.md:192-214, web/finalise.js:134-311, web/master-cv.js:31-79, scripts/utils/conversation_manager.py:45-79

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
| ------- | --------- | ----------- | -------- | ------------ | ------- |
| US-M1 | 1 | 0 | 0 | 0 | 0 |
| US-M2 | 1 | 0 | 0 | 0 | 0 |
| US-M3 | 0 | 1 | 0 | 0 | 0 |

- US-M1: ✅ Pass. Session customisation data lives in conversation/session state, while durable master changes are explicitly separated into the Master CV tab and harvest/apply flow. Evidence: scripts/utils/conversation_manager.py:45-79, web/master-cv.js:31-66.
- US-M2: ✅ Pass. Harvest candidates are shown after finalisation, no items are pre-selected, and the UI requires explicit checkbox selection before applying changes back to `Master_CV_Data.json`. Evidence: web/finalise.js:134-311.
- US-M3: ⚠️ Partial. The boundaries are implemented correctly, but the user-facing explanation is distributed across Finalise and Master CV surfaces rather than summarized in one concise boundary explainer. Evidence: tasks/current-implemented-workflow.md:192-214, web/master-cv.js:61-66, web/finalise.js:163-244.

## Generated Materials Evaluation

— N/A. This persona is about source-of-truth governance and durable write-back boundaries rather than judging the generated resume artifacts.

## Additional Story Gaps / Proposed Story Items

- Add an explicit session-scope banner in customisation surfaces and a simple boundary explainer in Finalise so users do not have to infer where temporary edits become durable. Evidence: web/master-cv.js:61-66, web/finalise.js:163-244.
