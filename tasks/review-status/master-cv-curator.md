<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Master-Cv-Curator Review Status

**Last Updated:** 2026-07-07 20:18 ET

**Executive Summary:** This file captures the source-verified persona review snapshot separately from the story specification so sub-agents can work in parallel safely.

## Application Evaluation

### Verification of the 7 flagged recent changes (cycles 102/103) in `web/master-cv.js`

#### 1. Duplicate `id` fix on publication modal heading — ✅ Pass

`web/master-cv.js:354-361` now shows a single element id and a matching `aria-labelledby`:
```
354  <div id="master-pub-modal-overlay" ... aria-labelledby="pub-modal-title-heading" ...>
358    <div class="modal-header">
359      <h2 id="pub-modal-title-heading">Add Publication</h2>
```
No duplicate `id` attribute remains. Heading text is updated correctly by both entry points:
- `showAddPublicationModal()` — `web/master-cv.js:1564`: `document.getElementById('pub-modal-title-heading').textContent = 'Add Publication';`
- `editMasterPublication()` — `web/master-cv.js:1598`: `document.getElementById('pub-modal-title-heading').textContent = 'Edit Publication';`

Confirmed working as intended.

#### 2. Backup restore auto-refresh — ✅ Pass

`restoreBackup()`, `web/master-cv.js:2710-2733`, calls `await populateMasterTab();` at line 2725 immediately after a successful `/api/master-data/restore` response, before showing the "Restored" alert. This replaces the older "please reload the tab" pattern — the visible data is refreshed in place. `undoMasterDataChange()` (line 2743-2777, calls `populateMasterTab()` at 2769) and `redoMasterDataChange()` (2779-2802, calls it at 2794) follow the same pattern.

#### 3. Phase-lock banner label fix — ✅ Pass

`web/master-cv.js:102-110`:
```
108  Master CV editing is only available before job analysis begins or during the
     Refinement stage. The current stage is <strong>${escapeHtml((typeof SESSION_PHASE_LABELS !== 'undefined' && SESSION_PHASE_LABELS[currentPhase]) || currentPhase || 'unknown')}</strong>.
```
`SESSION_PHASE_LABELS` is defined at `web/utils.js:262-272` and maps `refinement` → `'Finalise'` (and all other phases to human labels, e.g. `job_analysis` → `'Job Analysis'`). The banner falls back to the raw phase value if the map lookup is falsy, and to `'unknown'` if `currentPhase` itself is empty — both fallbacks match the described behavior. Confirmed: a user mid-application will see "The current stage is **Finalise**", not the raw enum `refinement`.

#### 4. `domain_relevance` field added to Experience modal — ✅ Pass

- Field present in the modal markup: `web/master-cv.js:621-626` (`#exp-domain-relevance-input`, label "Domain Relevance (comma-separated)").
- Populated on edit, mirroring `tags`: `web/master-cv.js:2134-2135`.
- Cleared/reset in `showAddExperienceModal()`: `web/master-cv.js:2038`.
- Parsed identically to `tags` on save (comma-split/trim/filter) in `saveMasterExperience()`: `web/master-cv.js:2159, 2170`.
- Backend round-trip confirmed in `scripts/routes/master_data_routes.py`: accepted on `add` (line 1007: `'domain_relevance': exp_data.get('domain_relevance') or []`) and on `update` (lines 1032-1034, alongside `tags`).

Full round trip (UI → POST `/api/master-data/experience` → JSON field → re-populated on next edit) verified end-to-end.

#### 5. Multi-line BibTeX "extra field" fix + save-confirmation guard — ✅ Pass

- Escaping on populate (`editMasterPublication()`, `web/master-cv.js:1585-1596`): embedded newlines in a field value are escaped to literal `\n` so each field renders as one line in the textarea, with an explicit comment explaining the original bug this fixes (GAP-347 reference in-code).
- Unescaping on save (`saveMasterPublication()`, `web/master-cv.js:1630-1641`): `v.replace(/\\n/g, '\n')` reverses the escaping before writing to `fields[k]`.
- Save-confirmation guard: `_pubModalOriginalExtraKeys` is captured at modal-open time (`showAddPublicationModal()` line 1552 → `[]`; `editMasterPublication()` line 1592 → keys of all non-hardcoded fields). On save, `droppedKeys` is computed as `_pubModalOriginalExtraKeys.filter((k) => !(k in fields))` (line 1646) — this only fires for keys that were present at open and are now **absent** from the final `fields` object. Purely additive edits (new fields only) or renames where the new key ends up present leave `droppedKeys` correctly reflecting only genuinely-missing original keys. Confirmed the guard triggers **only** when a previously-present key is now missing from the new fields dict; purely additive edits produce an empty `droppedKeys` array and skip the confirm dialog entirely (line 1647 `if (droppedKeys.length > 0)`).

Backend `bibtex_parser.py` confirms fields legitimately round-trip: `_entry_to_publication()` (`scripts/utils/bibtex_parser.py:99-132`) denylists only `{"ID", "ENTRYTYPE"}` when building the `fields` dict (lines 103-107) — every other BibTeX field, known or custom, is preserved. `serialize_bibtex_entry()` (lines 500-536) writes `author`/`editor` first, then `_STANDARD_FIELD_ORDER` fields, then — critically — any remaining custom fields sorted alphabetically (lines 531-533). No field-name allowlist causes silent field loss anywhere in parse/serialize; the only thing `_append_field` drops is an **empty-valued** field (lines 539-543), which is expected/desirable BibTeX hygiene, not a data-loss bug.

#### 6. Summary variant label title-casing — ✅ Pass

`_renderSummariesList()`, `web/master-cv.js:1818-1846`: `prettyLabel` (line 1831) title-cases the key (e.g. `ml_engineering` → `Ml Engineering`) and is used as the primary heading (line 1835), with the raw key shown as a smaller parenthetical (`<span style="font-weight:400;color:#9ca3af;...">(${keyEsc})</span>`). In-code comment explicitly documents the intent and notes the deliberate absence of a separate display-name field (referencing GAP-371) pending a fuller fix.

Minor note: "Ml Engineering" is a slightly awkward title-case artifact (naive `\b\w` capitalization does not special-case acronyms like "ML"). Not a functional bug, but worth flagging as a cosmetic follow-up — see Additional Issues below.

#### 7. Achievement bullet editor in Experience modal — ✅ Pass (GAP-310's claim it doesn't exist is incorrect)

Confirmed a complete, functional CRUD editor for achievements inside the Experience modal:
- Container markup: `web/master-cv.js:627-636` (`#exp-achievements-editor-list`, add input, "+ Add" button).
- Render: `_renderExpAchievementsEditor()` (`web/master-cv.js:2059-2074`) — renders each achievement as a text input plus ↑ / ↓ / 🗑️ controls, with boundary buttons correctly disabled at the first/last item (`idx === 0` / `idx === lastIdx`).
- Add: `_addExpAchievement()` (2091-2099).
- Reorder: `_moveExpAchievement()` (2101-2108) — uses splice to move an item by `delta`.
- Delete: `_deleteExpAchievement()` (2110-2114).
- Sync-before-mutate: `_syncExpAchievementsFromInputs()` (2079-2089) — reads any in-progress (un-blurred) text edits out of the DOM before any reorder/delete/save rebuilds the list, preventing silent loss of an uncommitted edit.
- Populated from existing data on edit: `editMasterExperience()`, line 2138: `_masterExpModalAchievements = JSON.parse(JSON.stringify(exp.achievements || []));` (deep-copied working buffer, not a live reference).
- Persisted on save: `saveMasterExperience()`, line 2171, includes `achievements: _masterExpModalAchievements` in the POST body; backend accepts and validates it (`scripts/routes/master_data_routes.py:961-966`: must be a list of strings/dicts) and persists on both `add` (line 1008) and `update` (lines 1030-1031).

This is a real, working feature — the prior gap report (GAP-310) claiming it doesn't exist was incorrect, and this review independently re-confirms it functions end-to-end (render → add/reorder/delete → sync → save → backend validate/persist → repopulate on next edit).

---

### US-M1: Session-Only Customization Boundary

| # | Criterion (abbreviated) | Status | Notes / File:Line |
|---|--------------------------|--------|--------------------|
| 1 | Workflow distinguishes session editing from master-data maintenance | ✅ Pass | Architecturally real: `scripts/utils/session_data_view.py:7` docstring — "Read-only view that overlays session state onto master CV data." `conversation_manager.py:120-125` explicitly comments session-only state fields (`achievement_overrides`, `removed_achievement_ids`, `skill_group_overrides`, etc.). Enforced at the route layer via `_require_master_data_write_phase()` (`scripts/routes/master_data_routes.py:208-221`), gating all master-data writes to `init`/`refinement` phases only — 17+ call sites in that file. |
| 2 | UI does not imply temporary edits already updated the master record | ⚠️ Partial | The one comprehensive, correctly-worded governance statement lives only on the Master CV tab (`master-cv.js:148-156`, "Persistent storage — this tab only..."). During the actual editing surfaces where session-only decisions are made — customization, rewrite_review (`web/rewrite-review.js:283-290` intro copy has no session-scope disclaimer at all) — there is **no reminder at the point of editing**. `web/skills-review.js:626-631,724,917` does carry good "Session-Only Skills" framing for one specific sub-feature (ad hoc skill add), but achievements/bullet rewrites/summary-variant choice carry no such copy in `app.js` or `ui-core.js` (confirmed zero grep hits for session/persistence boundary language in either file). A curator who never opens the Master CV tab could plausibly (and incorrectly) believe their in-session rewrite choices are already permanent. |
| 3 | Durable write-back occurs only through explicit user action | ✅ Pass | Harvest apply (`scripts/routes/generation_routes.py:2315` `harvest_apply()`) requires an explicit POST with named `selected_ids` (line 2327-2336: empty selection → `written_count: 0`, no-op). Client additionally requires a confirm dialog before the POST fires (`web/harvest.js:482-489`). All Master CV tab structured edits are one-field-at-a-time explicit Save actions (per-modal `save*()` functions throughout `master-cv.js`). |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Session edits silently promoted to master data | ✅ Not present — phase gate + explicit selected_ids requirement (see above) |
| No reminder that in-session choices are non-durable, at the point of editing | ❌ Present — see criterion 2 above; this is a real, evidence-backed gap |

---

### US-M2: Harvest Review Quality

| # | Criterion (abbreviated) | Status | Notes / File:Line |
|---|--------------------------|--------|--------------------|
| 1 | Harvest candidates presented in reviewable form | ✅ Pass | `renderHarvestTabHtml()` (`web/harvest.js:262`) groups candidates by type → recommendation → confidence via `groupCandidates()` (line 72) and `HARVEST_TYPE_CONFIG` (line 28). |
| 2 | Each candidate indicates what would be added/changed | ✅ Pass | `renderCandidateRow()` (`web/harvest.js:140`) delegates to `renderProposalRow()` (`web/proposal-review.js:62-117`), which renders explicit "Before" (`item.original`, lines 100-102) and "After" (`item.proposed`, lines 103-107) blocks — a genuine diff, not just a bare label. |
| 3 | Applying harvested changes is optional and selective | ✅ Pass | `shouldPreCheck()` (`web/harvest.js:99`, comment at 95: "All harvest items start unchecked — master CV updates are opt-in only (US-A11)") always returns `false`. `applyHarvestSelections()` (line 471) only submits `input[data-harvest-id]:checked` (line 472) as `selected_ids`. Backend `harvest_apply()` only writes the named IDs (`generation_routes.py:2348-2380`). |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| All-or-nothing apply (no selective acceptance) | ✅ Not present — per-item checkbox + selected_ids POST |
| Candidate shown with no preview of resulting change | ✅ Not present — Before/After rendered per item |

**Terminology note:** the nav tab label reads "🌾 Update Master CV" (`index.html:241`) but the panel content itself is headed "🌾 Harvest Improvements" (`web/harvest.js:284`) — internal jargon ("harvest") leaks into user-visible copy inconsistently with the (better) nav label. See Additional Issues.

---

### US-M3: Boundary Clarity Across Final Stages

| # | Criterion | Status | Notes / File:Line |
|---|-----------|--------|--------------------|
| 1 | Finalise/archive and harvest/apply appear as distinct steps with distinct consequences | ⚠️ Partial | Distinct at the structural level: separate tabs (`index.html:151` `step-finalise` vs `:153` `step-harvest`), separate endpoints (`POST /api/finalise` in `finalise.js:296` vs `POST /api/harvest/apply` in `generation_routes.py:2315`), and separate phase gates (`_require_harvest_apply_phase()`, `generation_routes.py:1309-1318`, restricts to `refinement` only). **However**, `web/finalise.js` auto-invokes `showHarvestSection()` (line 342) immediately after a successful finalise, injecting a harvest-apply mini-panel into the *same* Finalise-tab view (`<div id="harvest-section">`, line 132) using the same `applyHarvestSelections()` machinery. This visually chains the two actions together on one screen even though they remain logically/API-wise distinct, which works against the acceptance criterion's intent that they be presented as clearly separate steps. |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Finalise/archive silently also writes master data | ✅ Not present — separate endpoint, separate phase gate, requires its own selected_ids |
| Two distinct actions visually merged into one confusing screen | ❌ Present — see above; Finalise tab auto-shows a harvest panel immediately after archiving |
| Stale/ambiguous button label on the Finalise action | ❌ Present — `index.html:205` raw markup still reads "📦 Package Application Files"; only corrected at runtime to "📦 Archive Application" by `app.js:156-161` (a JS patch citing GAP-325, not a source-of-truth fix in the HTML itself) |

---

### US-M4: Maintain the Master Publications Bibliography

| # | Acceptance Criterion | Status | Notes / File:Line |
|---|-----------------------|--------|--------------------|
| 1 | Reviewable list view with ordering/grouping controls | ✅ Pass | `_renderPublicationsCrudList()` (`web/master-cv.js:1213-1289`) provides Sort (`year_desc/asc`, `type_asc/desc` — `_comparePublications()`, lines 1182-1201) and Group (`none/year/type` — `_groupPublicationLabel()`, lines 1203-1211) controls, rendered as `<select>` dropdowns (lines 1220-1234). |
| 2 | Add/edit/delete publication entries from Master CV surface | ✅ Pass | `showAddPublicationModal()` (1550), `editMasterPublication()` (1571), `saveMasterPublication()` (1610) → `POST /api/master-data/publication` (`master_data_routes.py:1826-1892`, action add/update); `deleteMasterPublication()` (1675) → same route, action=delete (routes.py:1856-1865). |
| 3 | Import raw BibTeX + review validation errors | ✅ Pass | `showImportPublicationsModal()`/`importPublicationsBib()` (1367-1436) → `POST /api/master-data/publications/import` (`master_data_routes.py:1895-1994`); per-entry required-field validation with `invalid_keys`/`skipped_keys` surfaced back to the UI (routes.py:1930-1948; rendered in `web/master-cv.js:1413-1419`). Separate `POST /api/master-data/publications/validate` (routes.py:1797-1824) lets the curator validate raw BibTeX text without saving (`validatePublicationsBib()`, master-cv.js:1292-1323). |
| 4 | Paste citation text (non-BibTeX), review generated BibTeX, decide to import | ✅ Pass | `showConvertPublicationsModal()`/`convertPublicationText()` (1438-1490) → `POST /api/master-data/publications/convert` (routes.py:1996-2020, LLM-driven, no persistence) producing a preview in `#master-pub-convert-output`; `importConvertedPublicationText()` (1492-1546) is a separate explicit action that imports the (possibly user-edited) preview via the same import endpoint used in criterion 3. |
| 5 | Flags missing key fields (title/authors/year) instead of silently accepting | ✅ Pass | Single-entry add/update: `master_data_routes.py:1874-1879` — 400 error if `fields.title`, `fields.year`, or `fields.author`/`fields.editor` missing. Bulk import: per-entry `missing_fields` check (routes.py:1930-1948) rejects (does not silently accept) entries missing title/year/author-or-editor, reporting counts + `invalid_keys` back to the client. |
| 6 | Writes to `publications.bib` only from `init`/`refinement` windows, never customization/generation | ✅ Pass | Phase gate present on all mutating routes: PUT `/api/master-data/publications` (routes.py:1752-1754), POST `/api/master-data/publication` (routes.py:1831-1833), POST `/api/master-data/publications/import` (routes.py:1900-1902) — all call `_require_master_data_write_phase()`. GET `/publications` and POST `/publications/validate` and `/publications/convert` correctly have **no** gate, but those three routes perform no writes to `publications.bib` or `orchestrator.publications` (confirmed by reading each route body — validate/convert only parse/LLM-transform text and return it; they never call `bib_path.write_text` or mutate `orchestrator.publications`). |
| 7 | Round-trip editing preserves existing BibTeX info rather than dropping unrelated fields | ✅ Pass | See item 5 in the 7-point verification above: `_entry_to_publication()` denylists only bibtexparser's own `{"ID","ENTRYTYPE"}` keys (`bibtex_parser.py:103-107`); `serialize_bibtex_entry()` explicitly re-emits any field not in `_STANDARD_FIELD_ORDER` (lines 531-533, sorted alphabetically). No allowlist-driven field loss exists in parse/serialize. The historical multi-line-value truncation bug (item 5 above) is independently fixed at the UI layer (`master-cv.js` escape/unescape). |

**Failure Modes Present**

| Failure mode | Present? |
|--------------|----------|
| Publications section is presented ambiguously as per-application customization rather than master-data maintenance | ✅ Not present — lives entirely under the "📚 Master CV Profile" heading (`master-cv.js:112-114`), phase-gated identically to every other master-data section |
| Round-trip editing silently drops unrelated BibTeX fields | ✅ Not present (now fixed) — see item 7 above |
| Incomplete entries silently accepted | ✅ Not present — required-field validation on both single-entry and bulk-import paths |

---

## Generated Materials Evaluation

N/A — this persona's scope (Master CV data maintenance) does not produce generated CV/cover-letter output artifacts; those are evaluated by other personas. The one "generated material" in this persona's scope, converted BibTeX from citation text (`convertPublicationText()`), is reviewed as part of US-M4 criterion 4 above (it is explicitly presented as a preview requiring a separate import action, not auto-applied).

---

## Additional Story Gaps / Proposed Story Items

1. **No point-of-editing session-scope reminder (US-M1 gap).** The excellent governance banner on the Master CV tab (`master-cv.js:148-156`) is not visible from the customization/rewrite_review/skills stages where the session-scoped decisions actually happen. A curator who works entirely within the customization flow and never opens the Master CV tab has no in-context signal that their choices are temporary. Propose a new/refined acceptance criterion under US-M1: "A brief, consistent session-scope reminder appears on every stage where session-only edits are made (customization, rewrite_review, skills selection), not only on the Master CV tab."

2. **Finalise tab visually chains into Harvest (US-M3 partial).** `finalise.js`'s `showHarvestSection()` auto-appends a harvest-apply panel into the Finalise tab immediately after archiving. Recommend either: (a) explicitly document this as intended progressive-disclosure UX in the story (if so, US-M3's "distinct steps" language should be refined to say "distinct actions, which may be sequenced together on one screen" rather than implying separate screens), or (b) split them into a required navigation step (e.g., a "Continue to Update Master CV" button rather than auto-injection) if true separation is the intended design.

3. **Stale HTML label vs. runtime JS patch (US-M3).** `index.html:205` still hardcodes "📦 Package Application Files"; the clearer "📦 Archive Application" label only exists as a JS-applied override in `app.js:156-161`. This is fragile — recommend fixing the label at the HTML source of truth rather than relying on a JS patch, and add this "runtime-patched label instead of source-fixed label" pattern to the review checklist as a general anti-pattern (a JS load failure/race would silently regress the UX back to the confusing original label).

4. **Terminology inconsistency: "Harvest" jargon leaks into user-visible copy** (US-M2). Nav label "Update Master CV" (clear) vs. in-panel heading "🌾 Harvest Improvements" (jargon) — recommend a consistent single term across nav and panel content. Suggest auditing all remaining user-visible "harvest" strings in `harvest.js` (e.g. lines 284, 309) for consistency with the nav label.

5. **Title-case artifact on summary variant labels** (cosmetic, item 6 above). `_renderSummariesList()`'s naive `\b\w` title-casing produces "Ml Engineering" for `ml_engineering` rather than "ML Engineering". Low priority, but a curator maintaining domain-specific summary variants (ML, AI, IT, HR, etc.) will see this regularly. Consider a small acronym exception list, or defer to the GAP-371 "add a display-name field" fix already referenced in-code, which would let the curator set the exact label they want.

6. **No explicit story criterion for the achievement-bullet editor** (item 7 above) even though it is a core structured-editing surface for this persona. Recommend adding an explicit US-M4 (or new US-M5) criterion: "The curator can add, reorder, and delete individual achievement bullets within a work-experience entry from the Master CV tab" — since this functionality exists and works, but currently has no acceptance criterion covering it, meaning a future regression here would not be caught by story-driven review.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/master-cv.js, scripts/routes/master_data_routes.py (plus, for cross-referenced evidence: web/harvest.js, web/proposal-review.js, web/finalise.js, web/skills-review.js, web/rewrite-review.js, web/utils.js, web/workflow-steps.js, scripts/routes/generation_routes.py, scripts/utils/bibtex_parser.py, scripts/utils/session_data_view.py)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-M1 | 2 | 1 | 0 | 0 | 0 |
| US-M2 | 3 | 0 | 0 | 0 | 0 |
| US-M3 | 0 | 1 | 0 | 0 | 0 |
| US-M4 | 7 | 0 | 0 | 0 | 0 |

**Key evidence references:**
- US-M1: Session/master overlay architecture → scripts/utils/session_data_view.py:7; phase gate → scripts/routes/master_data_routes.py:208-221
- US-M1: Missing point-of-editing session reminder → no hits in web/app.js, web/ui-core.js; web/rewrite-review.js:283-290 (no disclaimer)
- US-M2: Per-item selective apply → web/harvest.js:95-99, 471-499; scripts/routes/generation_routes.py:2315-2380
- US-M3: Finalise/Harvest structurally distinct but visually chained → web/finalise.js:296, 342, 132; scripts/routes/generation_routes.py:1309-1318
- US-M3: Stale label → web/index.html:205 vs web/app.js:156-161
- US-M4: Publications CRUD + sort/group → web/master-cv.js:1182-1289
- US-M4: Field preservation on round-trip → scripts/utils/bibtex_parser.py:99-132, 500-536
- Recent-fix verification 1–7: all confirmed ✅ Pass, see "Verification of the 7 flagged recent changes" section above with full file:line evidence.

**Evidence standard:**
- Every conclusion above is supported by a repository-relative file path plus line number(s), independently re-derived by reading the current source (not by trusting prior gap/review documents, which were explicitly excluded from this review per instructions).
- Cite all supporting references using repository-relative paths plus line numbers wherever available.
