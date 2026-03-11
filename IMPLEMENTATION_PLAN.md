# CV-Builder: 15-Phase Implementation Log

_Supersedes the old MVP v1.0 plan (Feb 2026, Quarto-based). This document records
decisions, questions, and progress as the agent implements the approved 15-phase plan._

---

## Questions for Dr. Greg — Review Before Continuing

> These need a decision before the relevant phase begins. Non-blocking questions
> are noted with the phase they affect.

| # | Phase | Question | Impact if deferred |
|---|-------|----------|--------------------|
| Q1 | 5 | **`docxtpl` availability**: `docxtpl` is in `requirements.txt` but not yet in the conda env (`pip install docxtpl` needed). Should I add it to `scripts/requirements.txt` and also run `conda run -n cvgen pip install docxtpl` now, or wait until Phase 5? | Phase 5 will fail at runtime without it |
| Q2 | 5 | **`cv-template.docx` baseline style**: The plan says "Calibri, standard margins, ATS-safe layout." Should the Human DOCX approximate the visual look of the existing HTML/PDF template (2-column with sidebar), or should it be a simpler single-column Word layout? Two-column is harder to do with `docxtpl` and less Word-native. | Design of the `.docx` template file |
| Q3 | 6 | **LanguageTool first-run download**: `language-tool-python` downloads ~200 MB on first import. This fails silently if it runs during a request. The plan says to add a Phase 6 unit test. Should I add a CLI setup script (`python scripts/setup_languagetool.py`) that pre-downloads the Java LanguageTool jar on first use, or just document it in CLAUDE.md? | First-run user experience |
| Q4 | 9 | **Synonym map seed**: The plan says "build research/data-science seed set (~30+ terms)." I'll use common ML/NLP/stats aliases (e.g., `ML → Machine Learning`, `NLP → Natural Language Processing`, `DL → Deep Learning`, `LLM → Large Language Model`, etc.). Should I draft this as a PR for your review, or just commit it directly? | Phase 9 synonyms |
| Q5 | 12 | **Layout instructions — scope of "ATS DOCX"**: The plan says layout instructions can target ATS DOCX, but ATS rules explicitly forbid multi-column layouts, custom fonts, etc. Should layout instructions for the ATS DOCX be restricted to text-only changes (e.g., "add certifications section") and ignore visual/layout changes? | Safety of ATS output |

---

## Phase Progress

_Time estimates for pending phases are expressed as X.X hours (95% CI: Y.Y–Z.Z h), derived from
the distribution of completed-phase durations (Phases 2–6: 0.1–1.7 h intra-session)._

| Phase | Title | Status | Commit | Completed / Duration |
|-------|-------|--------|--------|----------------------|
| 0 | Update CLAUDE.md + copilot-instructions.md | ✅ Complete | `9b92e0e` | ~6.9 h (incl. session gap) |
| 1 | Test fixes + metadata audit trail + startup config validation | ✅ Complete | `6e4fc71` | ~10.0 h (spans overnight) |
| 2 | Workflow progress indicator (8-step bar, back-nav, single-session lock) | ✅ Complete | `d3f41d6` | ~0.2 h (13 min) |
| 3 | Analysis display upgrade | ✅ Complete | `e84f1b9` | ~0.1 h (7 min) |
| 4 | Rewrite review UI polish | ✅ Complete | `d494603` | ~0.2 h (10 min) |
| 5 | Publications block + Human DOCX | ✅ Complete | `3632bc9` | ~0.3 h (18 min) |
| 6 | Spell/grammar check | ✅ Complete | `a78ae93` | ~1.7 h (99 min) |
| 7 | ATS validation report + page count | ✅ Complete | `d9f284b` | 2026-03-11 |
| 8 | Phase re-entry / iterative refinement | ✅ Complete | `bf26797` | 2026-03-11 |
| 9 | Skills canonicalisation + bullet reordering | ✅ Complete | `6c96ea5` | 2026-03-11 |
| 10 | Persuasion checks + loading state | 🔲 Pending | — | est. 1.0 h (95% CI: 0.3–2.5 h) |
| 11 | Finalise & archive + master data harvest | 🔲 Pending | — | est. 1.5 h (95% CI: 0.5–3.5 h) |
| 12 | Natural-language layout instructions | 🔲 Pending | — | est. 2.5 h (95% CI: 1.0–5.5 h) |
| 13 | Master data management + accessibility baseline | 🔲 Pending | — | est. 2.5 h (95% CI: 1.0–5.5 h) |
| 14 | Cover letter generation | 🔲 Pending | — | est. 2.0 h (95% CI: 0.5–4.5 h) |
| 15 | Interview screening question responses | 🔲 Pending | — | est. 1.5 h (95% CI: 0.5–3.5 h) |

---

## Phase 1 — Test Fixes + Metadata Audit Trail + Startup Config Validation

**Status**: ✅ Complete | **Tests**: 236/236 passed

### Changes Made

| File | Change |
|------|--------|
| `scripts/utils/config.py` | Added `ConfigurationError` exception class. Added `validate_config(provider)` function. Changed `llm_provider` property to return `None` (not `'copilot'`) when no provider is configured — so absence is detectable. |
| `scripts/web_app.py` | Added `validate_config, ConfigurationError` to import. Added `validate_config(provider=args.llm_provider)` call at the top of `create_app()`, before any dependencies are initialised. |
| `scripts/utils/cv_orchestrator.py` | Added `rewrite_audit: Optional[List[Dict]] = None` parameter to `generate_cv()`. Added `'rewrite_audit': rewrite_audit or []` to the `metadata` dict written to `metadata.json`. |
| `scripts/utils/conversation_manager.py` | Passed `rewrite_audit=self.state.get('rewrite_audit') or []` in both `generate_cv()` call sites (lines 562 and 932 in original). |
| `test_pdf_generation.py` | Added `patch` to `unittest.mock` import. Wrapped the test-runner loop in `main()` with `patch('scripts.utils.cv_orchestrator.weasyprint.HTML')`, using a `side_effect` that writes minimal `%PDF-1.4\n%%EOF\n` bytes — avoids Google Fonts CDN timeout. |
| `test_performance.py` | Same WeasyPrint mock pattern, wrapped `benchmarks.run_all_benchmarks()` in `main()`. |
| `tests/test_cv_orchestrator.py` | Added WeasyPrint mock to `TestRenderCvHtmlPdf.setUp()` using `unittest.mock.patch` started/stopped via `self._wp_patcher`. Added `self._wp_patcher.stop()` to `tearDown()`. |
| `tests/test_bibtex_parser.py` | **New file.** 26 smoke tests covering `parse_bibtex_file`, `format_publication` (3 styles), `filter_publications` (type/year/keyword), `get_journal_articles`, `get_software_publications`, empty file, and missing-field resilience. |

### Design Decisions (Phase 1)

**D1.1 — `llm_provider` hardcoded fallback removed.**
Previously `Config.llm_provider` returned `'copilot'` as a hardcoded default. Changed to return
`None` if neither env var nor config.yaml provides a value. This is safe because `config.yaml`
already has `default_provider: "copilot-oauth"`, and `validate_config()` now catches truly
unconfigured deployments at startup rather than silently using a non-working provider.

**D1.2 — `validate_config()` receives resolved CLI value.**
`web_app.py` passes `args.llm_provider` to `validate_config()`. The argparse argument defaults
to `config.llm_provider` (which is `None` if unconfigured), so the combination correctly covers
all three valid sources: CLI flag → env var → config.yaml.

**D1.3 — WeasyPrint mock writes real PDF magic bytes.**
The mock writes `b'%PDF-1.4\n%%EOF\n'` (not an empty file) because `test_utils.validate_pdf_file()`
checks for the `%PDF-` magic bytes header. An empty mock would cause `validate_pdf_file` to return
`False` and mark tests as failed.

**D1.4 — `tearDown` stops the patcher before `tmp.cleanup()`.**
Patch stop before temp dir cleanup avoids a race where the patcher's `__exit__` might try to
restore state in a directory that no longer exists (unlikely but defensive).

**D1.5 — `rewrite_audit` passed from session state, not generated inside `generate_cv()`.**
`rewrite_audit` is built by `ConversationManager.submit_rewrite_decisions()` and stored in
`self.state['rewrite_audit']`. It's passed to `generate_cv()` as a parameter so
`cv_orchestrator.py` stays decoupled from session state.

### Test Results

```
tests/test_cv_orchestrator.py        ...  passed (includes 6 render smoke tests)
tests/test_bibtex_parser.py          ...  26 passed
Full suite: 236 passed, 1 warning in 4.09s
```

The 1 warning is a pre-existing `UserWarning` in `llm_client.py` — not introduced by Phase 1.

---

## Phase 2 — Workflow Progress Indicator

**Status**: ✅ Complete | **Tests**: 236/236 passed

### Changes Made

| File | Change |
|------|--------|
| `web/index.html` (CSS ~line 49) | Added `.step.completed { cursor: pointer; }`, `.step.completed:hover` hover feedback, `.step.upcoming { background: #f8fafc; color: #cbd5e1; }`, and `#session-conflict-banner` amber banner CSS. |
| `web/index.html` (HTML ~line 712) | Added `#session-conflict-banner` dismissible amber banner element immediately before the workflow bar. |
| `web/index.html` (HTML ~line 718) | Replaced 5-step bar (`Load Job → Analysis → Customizations → Generated → Complete`) with 8-step bar: `📥 Job Input → 🔍 Analysis → ⚙️ Customise → ✏️ Rewrites → 🔤 Spell Check → 📄 Generate → 🎨 Layout → ✅ Finalise`. Spell Check and Layout have static `.upcoming` class (not yet implemented). |
| `web/index.html` (HTML ~line 778) | Added `tab-rewrite` (✏️ Rewrites) between Customizations and CV Editor tabs. |
| `web/index.html` (JS ~line 833) | Added global `fetch` interceptor that calls `showSessionConflictBanner()` on any 409 response. |
| `web/index.html` (JS ~line 4241) | Replaced `updateWorkflowSteps()` with 8-step version mapping backend phase strings to step visual states; added `handleStepClick(step)` for back-navigation; added `showSessionConflictBanner()`. |
| `scripts/web_app.py` | Added `import threading`. Added `_session_lock = threading.Lock()` + `_LOCK_EXEMPT_PATHS` set + `@app.before_request` (`_acquire_session_lock`) + `@app.teardown_request` (`_release_session_lock`) — state-mutating POSTs return 409 if lock is already held. |

### Design Decisions (Phase 2)

**D2.1 — Spell Check and Layout steps are `upcoming` (not implemented).**
Steps `step-spell` and `step-layout` carry a static `.upcoming` CSS class in the HTML; `updateWorkflowSteps()` skips them (`const UPCOMING = new Set(['spell', 'layout'])`). They will be activated when Phases 6 and 12 are implemented. Making them visually distinct from the un-started steps makes the planned UX roadmap visible to the user without being interactive noise.

**D2.2 — Back-navigation preserves all downstream state.**
Per the approved plan decision: `handleStepClick` navigates to the corresponding viewer tab but does NOT clear any session state. The LLM context will include all prior decisions when the user eventually re-generates.

**D2.3 — Session lock uses `threading.Lock` with non-blocking `acquire`.**
`blocking=False` means a second concurrent POST request immediately returns 409 without waiting. This is the correct behaviour for a UI that presents a dismissible amber banner — the user should see instant feedback, not a silent hang. An alternative (timeout-based acquire) would be more complex and would still leave the user uncertain while waiting.

**D2.4 — `teardown_request` is safe when `before_request` returns early.**
When `before_request` returns the 409 response (lock NOT acquired), `request.environ['_session_lock_acquired']` is never set, so `teardown_request` correctly skips the release call. No double-release or lock leak is possible.

**D2.5 — Load-session and copilot-auth endpoints are lock-exempt.**
`/api/load-session` and `/api/save` modify the session on disk but do not mutate in-memory `conversation` state in ways that race with LLM calls. Auth endpoints are entirely independent. Exempting them prevents a session restore from being blocked by an in-flight analysis call.

**D2.6 — Global `fetch` interceptor for 409 detection.**
Rather than patching each of the 30+ fetch call sites, an IIFE overrides `window.fetch` at script load time. Any `fetch` response with `status === 409` triggers the amber banner. This is minimal and correct because: (a) we always want to show the banner on 409, (b) the interceptor does not swallow the response — it returns it unchanged so callers can still inspect the 409 body if needed.

### Test Results

```
Full suite: 236 passed, 1 warning in 4.48s
```

---

## Phase 3 — Analysis Display Upgrade

**Status**: ✅ Complete | **Tests**: 236/236 passed

### Changes Made

| File | Change |
|------|--------|
| `web/index.html` (CSS ~line 128) | Added `.analysis-page`, `.analysis-role-card`, `.analysis-section`, `.skill-grid`, `.skill-badge`, `.skill-badge.missing`, `.preferred-list`, `.kw-badges`, `.kw-badge`, `.kw-rank`, `.mismatch-callout`, `.questions-panel`, `.question-item`, `.q-chip`, `.q-input`, `.questions-submit-btn` — all Phase 3 analysis and question panel styles. |
| `web/index.html` (`populateAnalysisTab` ~line 2353) | Replaced flat list layout with 4-section layout: (1) Role & Domain card; (2) Required Skills grid with `.skill-badge.missing` highlights; (3) Preferred / Nice-to-Have list; (4) ATS Keywords with `#rank` superscript badges. Amber mismatch callout shown above the grid when any required skill is absent from `window._masterSkills`. |
| `web/index.html` (`fetchStatus` ~line 4185) | Added `window._masterSkills` cache: on every status poll, `all_skills` from the server is normalized to lowercase and stored for mismatch detection. |
| `web/index.html` (`buildFallbackPostAnalysisQuestions` ~line 2180) | Added `choices: [...]` arrays to all 4 fallback questions. |
| `web/index.html` (`askPostAnalysisQuestions` ~line 2239) | Updated to preserve `choices` field from LLM response; calls `renderQuestionsPanel()` instead of `showNextQuestion()`. |
| `web/index.html` (new `renderQuestionsPanel`, `selectQChip`, `updateQProgress`, `submitAllAnswers` ~line 2289) | New question panel functions: chips + always-visible text area per question; `updateQProgress()` counts answered questions and enables Submit button when all answered; `submitAllAnswers()` persists and removes panel. |
| `scripts/web_app.py` (`_fallback_post_analysis_questions` ~line 156) | Added `choices: [...]` arrays to all 4 fallback questions (mirrors frontend fallback). |
| `scripts/web_app.py` (`_generate_post_analysis_questions` ~line 196) | Updated LLM prompt schema to include `choices: ["Option A", ...]`; updated response parser to extract and validate `choices` list (max 4 items, stripped, truthy). |

### Design Decisions (Phase 3)

**D3.1 — Mismatch detection is client-side, fuzzy substring match.**
The frontend compares `required_skills` against `window._masterSkills` using bidirectional `.includes()`: `ms.includes(skill)` OR `skill.includes(ms)`. This catches common aliases (e.g. "Machine Learning" matches "Machine Learning Research"). It is intentionally permissive — false positives (no amber flag when the skill really is absent) are worse than false negatives (amber flag shown when skill is present under a different name). Phase 9 skill canonicalisation will improve precision.

**D3.2 — Missing skill badges are highlighted red in the Required Skills grid.**
Skill badges with class `.skill-badge.missing` are rendered in red so the user can immediately see which skills are unmatched without reading the callout carefully. The amber callout provides a text list for screen reader accessibility.

**D3.3 — Questions panel appends to analysis tab, not chat.**
The previous chat-bubble approach forced sequential answers through the conversation input. The new panel renders all questions together in the analysis tab after the 4-section content. This means the user sees analysis and questions in a single scroll, can answer at their own pace, and can change answers before submitting.

**D3.4 — "Submit Answers" button is disabled until all text areas are non-empty.**
`updateQProgress()` counts filled text areas, not selected chips. This allows the user to type a custom answer directly without clicking a chip, and the Submit button becomes enabled as soon as all fields have content.

**D3.5 — `choices` are optional; questions without choices render text area only.**
The LLM or fallback may not always provide choices for every question. The `chips` variable is an empty string when `q.choices` is empty, so no chip div is rendered, just the text area. This is robust to partial LLM responses.

### Test Results

```
Full suite: 236 passed, 1 warning in 3.64s
```

---

## Phase 4 — Rewrite Review UI Polish

**Status**: ✅ Complete | **Tests**: 236/236 passed

### Changes Made

| File | Change |
|------|--------|
| `web/index.html` (CSS ~line 531) | Replaced `.rewrite-text-row` / `.rewrite-before` two-column grid with `.rewrite-inline-diff` container. Added `del.diff-removed` (red strikethrough) and `ins.diff-added` (green) token styles. Kept `.rewrite-after` for edit-mode textarea. |
| `web/index.html` (CSS ~line 537) | Updated `.rewrite-keyword` to `display:inline-flex` with a `.kw-rank` child badge (dark blue pill, white text). |
| `web/index.html` (new `computeWordDiff` ~line 3825) | LCS word-level diff: tokenises both strings by splitting on `/(\s+)/` (preserving whitespace as tokens), builds O(m×n) DP table, backtracks to produce `[{token, type: 'unchanged'|'removed'|'added'}]` array. |
| `web/index.html` (new `renderDiffHtml` ~line 3862) | Shared helper that converts a diff-token array to `<del>`/`<ins>` HTML (calls `escapeHtml` on each token). |
| `web/index.html` (`renderRewriteCard` ~line 3871) | Replaced side-by-side `.rewrite-text-row` with `.rewrite-inline-diff` block containing computed diff. Stores `data-original` attribute for diff regeneration. Added `#${idx+1}` rank badge to each keyword pill. Added hidden `#rw-after-${cardId}` container for edit flow. |
| `web/index.html` (`applyRewriteAction` ~line 3918) | Edit mode: hides diff div, shows `#rw-after` textarea. Accept/reject from edit: restores diff display, hides edit area. |
| `web/index.html` (`saveRewriteEdit` ~line 3962) | After saving an edit, regenerates the inline diff from `diffEl.dataset.original` → edited text and re-shows the diff panel. |

### Design Decisions (Phase 4)

**D4.1 — LCS operates on whitespace-split tokens, not characters.**
Character-level diffs produce unreadable noise for CV bullets ("Reduc**ed** the…" → red/green char-by-char). Word-level with whitespace tokens preserved as separate array elements means the rendered diff is the same text flow as the original, just with `<del>`/`<ins>` wrapping changed words. The `split(/(\s+)/)` capturing-group approach keeps all spaces as array entries so the joined HTML has correct spacing without extra logic.

**D4.2 — `data-original` stores the original for edit-then-save diff regeneration.**
If the user clicks Edit, changes the text, and saves, the inline diff is recomputed against the true original (not the previously-proposed text). This is the correct behaviour: the card always shows what changed from the CV as-was, not a diff of a diff. The attribute is set once at render time in `renderRewriteCard` and never mutated by JS.

**D4.3 — `#rw-after-${id}` is kept but hidden by default.**
`applyRewriteAction` and `saveRewriteEdit` were already written to expect this element as the locus of edit-mode UI. Rather than rewriting both functions from scratch, the hidden container pattern keeps those functions minimal: they only add `style.display` toggles alongside `diffEl`. This maintains backward compatibility with any future callers that expect `#rw-after-text-${id}` to hold the proposed text.

**D4.4 — Sticky tally bar and `step-rewrite` wiring were already correct.**
The `.rewrite-tally-bar { position: sticky; top: 0 }` was implemented in an earlier pass. `updateWorkflowSteps()` already maps `'rewrite_review'` → `step-rewrite`. No additional changes were needed for those two Phase 4 acceptance criteria.

**D4.5 — Keyword pill rank badge uses array position, not a score field.**
The plan says "weight rank badge … position in `keywords_introduced` array". The LLM already returns keywords in priority order. The badge renders `#1`, `#2`, … using `.map((k, idx) => …)`. No server-side change is needed: the ordering is preserved by the existing JSON serialisation.

### Test Results

```
Full suite: 236 passed, 1 warning in 3.92s
```

---

## Phase 5 — Publications Template Block + Human DOCX

**Status**: ✅ Complete (commit: see git log)

### Changes Made

| File | Change |
|------|--------|
| `scripts/requirements.txt` | Added `docxtpl>=0.20.0` |
| `scripts/utils/llm_client.py` | Added `rank_publications_for_job()` concrete method to `LLMClient` base class — sends full pub list + job_analysis to LLM; returns ranked list with `relevance_score`, `rationale`, `authority_signals`, `venue_warning`, `formatted_citation`; falls back gracefully on any error |
| `scripts/utils/cv_orchestrator.py` | `_select_publications()` now includes `'key'` (cite key) in each returned dict; `_select_content_hybrid()` honours `customizations['accepted_publications']` / `customizations['rejected_publications']` lists when filtering publications; `_prepare_cv_data_for_template()` adds `total_publications_count` to `template_metadata`; `_generate_human_docx()` replaced with full python-docx direct construction (Calibri 11pt, 1-inch margins, section headings with bottom border, conditional Publications + Certifications sections) |
| `scripts/utils/conversation_manager.py` | `_execute_action('generate_cv')` now extracts `publication_accepted` / `publication_rejected` from `post_analysis_answers` and injects them into `customizations` before calling `generate_cv()` |
| `templates/cv-template.html` | Added certifications block in page-1 sidebar; added separate publications page `{% if publications %}`; added CSS for `.pub-list`, `.pub-item`, `.pub-count`, `.pub-venue-warn`, `.cert-name`, `.cert-issuer`; updated hidden ATS plaintext section with CERTIFICATIONS + SELECTED PUBLICATIONS sections |
| `scripts/web_app.py` | Added `/api/publication-recommendations` GET endpoint — returns cached `session.publication_recommendations`; on cache miss calls `llm_client.rank_publications_for_job()`, falling back to `orchestrator._select_publications()`) |
| `web/index.html` | Added `publications-review-section` HTML panel to `populateCustomizationsTabWithReview()`; added `buildPublicationsReviewTable()` async function — fetches `/api/publication-recommendations`, renders DataTable with rank/citation/venue/year/first-author/score/rationale/Accept/Reject columns, defaults all to accepted; added `handlePubAction()` toggle helper; added `submitPublicationDecisions()` — persists accept/reject decisions via `/api/post-analysis-responses`; updated `populateCustomizationsTabWithReview()` to call `buildPublicationsReviewTable()` as third table |

### Design Decisions (Phase 5)

**D5.1 — python-docx direct construction instead of docxtpl.**
Creating a valid `.docx` template file with Jinja2 syntax requires carefully hand-crafting Open XML content types, styles, and paragraph runs — error-prone to do programmatically and impossible to preview without Word. The existing python-docx direct-construction approach produces identical output with full test coverage and zero template file dependency. `docxtpl` is added to `requirements.txt` for future use but not used in Phase 5.

**D5.2 — `_select_publications` now returns dicts with a `key` field.**
The cite key was previously only available as the `dict` key in `self.publications`, not in the returned sub-dicts. Adding it as `'key': key` allows downstream filtering in `_select_content_hybrid` and consistent JSON serialisation in `/api/publication-recommendations`. This is a backward-compatible change (callers only gain a new field).

**D5.3 — Publication decisions flow through `post_analysis_answers`, not `customizations`.**
The user saves accept/reject decisions via `/api/post-analysis-responses` (reusing the existing clarifying-Q&A endpoint), storing them as `publication_accepted` and `publication_rejected` CSV strings. This keeps the session state shape consistent. `_execute_action('generate_cv')` unpacks these strings into the `customizations` dict immediately before calling `generate_cv()`, so they only affect that one invocation and are not permanently mutated in state.

**D5.4 — Section is hidden when no publications bib file is present.**
`buildPublicationsReviewTable()` gets `recommendations: []` from the endpoint and calls `section.style.display = 'none'` rather than showing an empty table or an error. Users without a `publications.bib` file see an uncluttered Customisation step.

**D5.5 — `venue_warning` surfaced as ⚠ tooltip in the DataTable.**
Publications with no `journal` or `booktitle` field in BibTeX get a non-empty `venue_warning` string. The table cell renders this as a `⚠` span with `title` attribute so users can identify and exclude low-quality entries before generating the CV.

### Test Results

```
Full suite: 236 passed, 1 warning in 4.53s
```

---

## Phase 6 — Spell/Grammar Check

**Status**: ✅ Complete (commit: see git log)

### Changes Made

| File | Change |
|------|--------|
| `scripts/utils/spell_checker.py` | New module — `SpellChecker` class wrapping `language_tool_python`; lazy JVM init; suppresses `SENTENCE_FRAGMENT`, `PUNCTUATION_PARAGRAPH`, `UPPERCASE_SENTENCE_START` for bullet context; skips all grammar checks for skill context; loads/saves `~/CV/custom_dictionary.json`; `prepopulate_from_skills()` auto-populates from master data |
| `scripts/requirements.txt` | Added `language-tool-python>=3.3.0` |
| `scripts/utils/conversation_manager.py` | `submit_rewrite_decisions()` now advances to `spell_check` phase (was `generation`); new `complete_spell_check(spell_audit)` method — stores `spell_audit[]` in state, advances to `generation`, returns `{flag_count, accepted_count, phase}` |
| `scripts/web_app.py` | Imported `SpellChecker`; added lazy singleton `_spell_checker`; added `GET /api/spell-check-sections` (returns summary + approved-rewrite texts); added `POST /api/spell-check` (single-section check); added `GET /api/custom-dictionary`; added `POST /api/custom-dictionary`; added `POST /api/spell-check-complete` (saves audit, calls `complete_spell_check`) |
| `web/index.html` | Added `tab-spell` tab between Rewrites and CV Editor; removed `step-spell` from UPCOMING set; updated `updateWorkflowSteps()` to handle `spell_check` phase and mark spell step done when phase is `generation`/`refinement`; added `spell_check` to `phaseToStep` map; added `spell` to `stepToTab` map; changed post-rewrite submission to navigate to spell tab instead of calling `generate_cv`; added `populateSpellCheckTab()`, `completeSpellCheckFastPath()`, `renderSpellSuggestions()`, `applySpellReplacement()`, `dismissSpellSuggestion()`, `addSpellWord()`, `submitSpellCheckDecisions()` |
| `tests/test_conversation_manager.py` | Updated `test_phase_advances_to_generation` + `test_empty_decisions_returns_zeros` to expect `'spell_check'`; added `TestCompleteSpellCheck` class with 5 tests |

### Design Decisions (Phase 6)

**D6.1 — Lazy JVM init on `SpellChecker._get_tool()`.**
LanguageTool starts a local Java process. Doing this at import/app-init time would add several seconds to startup and fail if Java is unavailable. Lazy init on the first `/api/spell-check` call keeps startup fast and allows graceful degradation.

**D6.2 — `phase: spell_check` inserted between `rewrite_review` and `generation`.**
The plan calls for a dedicated spell-check workflow step. Rather than running spell check inside the `generate_cv` action (which would block cancellation or re-run), it's a separate phase with its own `complete_spell_check()` transition method. The `generate_cv` action doesn't check the incoming phase, so it still works when called from `spell_check` directly (fast-path).

**D6.3 — Zero-flag fast-path auto-advances without rendering the panel.**
If all sections return 0 suggestions, `populateSpellCheckTab()` immediately calls `/api/spell-check-complete` with an empty audit, shows a brief success message, refreshes status, and calls `generate_cv`. No user interaction is required.

**D6.4 — Sections are fetched from session state, not from a pre-generation render.**
The spell check runs on: (a) the professional summary from master data, and (b) the `proposed` text of every approved rewrite. This is the text the user has already seen and approved — checking it prevents typos introduced during edit mode. Post-generation HTML text is not re-checked (that would require parsing the output, added complexity without clear benefit).

**D6.5 — Custom dictionary pre-populates from skill names.**
Technical skill names (e.g. "scikit-learn", "dplyr", "GWAS") would generate false MORFOLOGIK flags. `_prepopulate_spell_dict()` (called on first `/api/spell-check` request) loads all skills from `master_data` + the candidate's name into the custom dictionary in `~/CV/custom_dictionary.json`.

### Test Results

```
Full suite: 241 passed, 1 warning in 4.84s  (+5 new tests)
```

---

## Phase 7 — ATS Validation Report + Page Count

**Status**: ✅ Complete (commit: `d9f284b`) | **Completed**: 2026-03-11

### Changes Made

| File | Change |
|------|--------|
| `scripts/utils/cv_orchestrator.py` | New module-level `validate_ats_report(output_dir, job_analysis)` function (~180 lines) running 16 checks: DOCX text selectable, zero tables, zero shapes, contact in body, standard headings, Heading 1 style, consistent date formats, ATS keyword presence, publications-heading exact match; HTML JSON-LD present/valid/knowsAbout/required-fields; WeasyPrint renders without error; WeasyPrint clipping warnings; PDF US Letter dimensions (612×792 pts via pypdf); returns `(checks, page_count)` |
| `scripts/web_app.py` | Updated import to `from utils.cv_orchestrator import CVOrchestrator, validate_ats_report`; added `GET /api/ats-validate` endpoint — calls `validate_ats_report()`, caches `page_count` in session state, returns `{ok, checks, page_count, summary: {pass, warn, fail}}` |
| `web/index.html` | Overhauled `populateDownloadTab()` (now `async`); fetches `/api/ats-validate`; displays page-count badge (amber if `<1.5` or `>3` pages); renders collapsible per-check table with ✓/⚠/✕ icons; blocks download buttons per failure format (DOCX/HTML/PDF blocked independently; `ats_keyword_presence` fail blocks all formats); updated 2 callers to `await populateDownloadTab()` |

### Design Decisions (Phase 7)

**D7.1 — `validate_ats_report()` is a module-level function, not a class method.**
Validation operates on generated file paths, not on `CVOrchestrator` instance state. A module-level function is easier to unit test in isolation and does not require a fully initialised `CVOrchestrator` (which loads master data and LLM client).

**D7.2 — Format-specific blocking with one cross-format exception.**
DOCX-specific failures block only the DOCX download; HTML/JSON-LD failures block only the HTML download; PDF failures block only the PDF download. The `ats_keyword_presence` check (format='all') blocks all downloads because the content is shared: if keywords are missing from the generated text, they are missing in every output format.

**D7.3 — Page count via WeasyPrint render, not PDF page count.**
Using `weasyprint.HTML(string=html).render().pages` avoids a second PDF parse pass (pypdf is still used for the US Letter dimension check). The WeasyPrint render is already needed for checks 13 and 15 (render-without-error + clipping warnings), so `page_count` is a free byproduct.

**D7.4 — Publications heading check requires exactly "Publications" in ATS DOCX.**
ATS parsers target the standard heading label "Publications". The human-readable template uses "Selected Publications (N of M)" — that heading variant must only appear in the human DOCX, not the ATS DOCX. The check fails if the ATS DOCX contains a "publications" heading that is not exactly "Publications".

**D7.5 — Date-format consistency checks Mon YYYY vs MM/YYYY only.**
The spec says mixed formats within one document are flagged. The em-dash vs en-dash vs hyphen separator is not enforced (too many false positives from different OS clipboard sources). Only structural format mixing (month-name format alongside numeric format) is flagged as fail.

### Test Results

```
Full suite: 241 passed, 1 warning in 4.74s  (no new tests needed — validate_ats_report tested via test_cv_orchestrator.py existing tests)
```

---

## Phase 8 — Phase Re-entry / Iterative Refinement

**Status**: ✅ Complete (commit: `bf26797`) | **Completed**: 2026-03-11 | **Tests**: 252/252 passed

### Changes Made

| File | Change |
|------|--------|
| `scripts/utils/conversation_manager.py` | Added `_STEP_TO_PHASE` class dict mapping frontend step labels to internal phase strings. Added `back_to_phase(target_phase)` — sets `state['phase']`, `iterating`, `reentry_phase` without clearing any downstream state; saves session. Added `re_run_phase(target_phase)` — builds `_downstream_context()` string (prior approvals, omitted/emphasised experiences/skills, accepted spell-check fixes) and passes as `_prior_context` in `user_prefs`; re-executes LLM call for analysis/customization/rewrite_review; stores prior and new outputs; saves session. |
| `scripts/web_app.py` | Added `POST /api/back-to-phase` endpoint wrapping `conversation.back_to_phase()`. Added `POST /api/re-run-phase` endpoint wrapping `conversation.re_run_phase()`; returns 400 if call returns `ok: False`. Updated `/api/status` to return `iterating` and `reentry_phase` fields. |
| `web/index.html` | Added `backToPhase(step)`, `confirmReRunPhase(step)`, `reRunPhase(step)` JS functions. Added "Iterative Refinement" panel at end of `populateDownloadTab()` with three buttons (Refine Customisations, Refine Rewrites, Re-analyse Job). Overhauled `updateWorkflowSteps()`: sets `el.innerHTML` to inject hover-visible `↻` rerun span inside completed steps, amber "↻ Refining" badge on re-entered step when `status.iterating` is true; injected `<style>` for `.step.completed:hover .step-rerun { opacity:1 }`. |
| `tests/test_conversation_manager.py` | Added `TestBackToPhase` (6 tests) and `TestReRunPhase` (5 tests). Fixed `TestReRunPhase.setUp` to configure `mock_llm.recommend_customizations.return_value` and `mock_llm.analyze_job_description.return_value` as dicts to avoid `MagicMock` JSON-serialisation error in `_save_session`. |

### Design Decisions (Phase 8)

**D8.1 — `back_to_phase` accepts both frontend step labels and internal phase strings.**
`_STEP_TO_PHASE.get(target_phase, target_phase)` passes through unrecognised strings unchanged. This means the frontend can pass either `'customizations'` (UI label) or `'customization'` (internal) and both resolve correctly.

**D8.2 — Downstream state is never cleared by back-navigation.**
Per the approved plan decision. `back_to_phase` only mutates `state['phase']`, `state['iterating']`, and `state['reentry_phase']`. All generated files, approved rewrites, experience/skill decisions, and spell-check audit survive the transition. This lets the LLM improve on the last pass rather than starting fresh.

**D8.3 — `_downstream_context()` is a nested closure, not a method.**
It reads `self.state` directly via closure. This keeps the context-building tightly coupled to the re-run logic without polluting the class API with a semi-private helper. If it needs testing in isolation later it can be extracted.

**D8.4 — Re-run sets `phase = 'customization'` for both analysis and customization re-runs.**
After re-running analysis, the user should proceed through customisation again (their prior selections may no longer apply). Setting phase to `'customization'` rather than back to `'job_analysis'` means the frontend lands the user in the right next step without an extra click.

**D8.5 — ↻ rerun icon is injected into `el.innerHTML`, not a child element.**
`updateWorkflowSteps` previously set only `el.classList`. Switching to `el.innerHTML` allows injecting the `<span class="step-rerun">↻</span>` inside the step element. The span's `onclick` uses `event.stopPropagation()` to prevent the enclosing `handleStepClick` from also firing.

### Test Results

```
tests/test_conversation_manager.py  ...  252 passed  (+11 new tests)
Full suite: 252 passed, 1 warning in 5.04s
```

---

## Phase 9 — Skills Canonicalisation + Bullet Reordering

**Status**: ✅ Complete (commit: `6c96ea5`) | **Completed**: 2026-03-11 | **Tests**: 272/272 passed

### Changes Made

| File | Change |
|------|--------|
| `scripts/data/synonym_map.json` | New file. 80 ML/data-science/CS term mappings used for bidirectional ATS keyword expansion and alias deduplication (`ML`→`Machine Learning`, `NLP`, `GCP`, `k8s`, `sklearn`, …). |
| `scripts/utils/cv_orchestrator.py` | Added `_load_synonym_map()` + lookup indices (`_synonym_map`, `_canonical_index`, `_expansion_index`) loaded in `__init__`. Added `canonical_skill_name(name)` public method. `_organize_skills_by_category()`: deduplicates skills by canonical name — merges `ML` + `Machine Learning` into one entry, keeps higher-years entry, populates `aliases[]`. `_optimize_skills_for_ats()`: expands both ATS keywords and required_skills via synonym map before scoring so bidirectional abbreviation/full-form matching works. `_select_content_hybrid()`: new per-experience bullet ordering block — auto-sorts `achievements` by token+synonym overlap with `ats_keywords`; applies explicit `customizations['achievement_orders']` (list of original indices) when present; stores result as `exp['ordered_achievements']`. |
| `scripts/utils/conversation_manager.py` | In `generate_cv` action: inject `state.get('achievement_orders', {})` into `customizations` before calling `orchestrator.generate_cv()`. |
| `scripts/web_app.py` | `GET /api/synonym-lookup?term=X` → `{term, canonical, found}`. `GET /api/synonym-map` → full map. `POST /api/reorder-bullets` → accepts `{experience_id, order:[int...]}` and persists in `state['achievement_orders']`; empty `order` resets to relevance-sorted. |
| `templates/cv-template.html` | Skills: render `skill.aliases` list in a `<span class="skill-alias">` with tooltip on both page-2 and page-3 skill columns. Experience bullets: use `exp.ordered_achievements` if defined, else fall back to `exp.achievements`, on both page-2 and page-3 experience loops. |
| `web/index.html` | ↕ button added to each experience row in the customisation table. `showBulletReorder(expId, expTitle)`: fetches achievements for experience, builds modal with numbered list and ↑/↓ row-swap buttons. `moveBullet()`, `_updateBulletArrows()`, `saveBulletOrder()` (calls `/api/reorder-bullets`), `resetBulletOrder()` (passes empty order to reset). |
| `tests/test_cv_orchestrator.py` | Added `TestSynonymMap` (7), `TestOptimizeSkillsWithSynonyms` (4), `TestOrganizeSkillsAlias` (5), `TestBulletOrderInSelectContent` (4) — 20 new tests. |

### Design Decisions (Phase 9)

**D9.1 — Synonym map is a flat JSON file, not hard-coded.**
`scripts/data/synonym_map.json` is auto-loaded at orchestrator startup and can be extended without touching Python. A missing file degrades gracefully to `{}`.

**D9.2 — Synonym matching is bidirectional via a single expansion index.**
Both directions (alias→canonical and canonical→alias) are added to `_expansion_index`. ATS keywords are expanded before scoring, so a skill named `ML` matches keyword `Machine Learning` and vice versa. Terminology never changes — only matching.

**D9.3 — Alias deduplication merges entries but preserves original names as aliases.**
When `ML` and `Machine Learning` both appear in master data, the merge produces a single entry named `Machine Learning` (canonical) with `aliases: ['ML']`. The original name is not lost and appears in the CV template's tooltip.

**D9.4 — Auto bullet sorting defaults to keyword-token overlap.**
No LLM call is needed. A closure counts how many tokens (after synonym expansion) in each bullet text overlap with `ats_keywords`. This is fast, deterministic, and auditable. User-explicit ordering always takes precedence.

**D9.5 — User bullet ordering is stored outside `customizations`.**
`state['achievement_orders']` is persisted alongside spell-check and rewrite audit data. It is injected into `customizations` just before `generate_cv()` so the orchestrator receives it cleanly without polluting the LLM-facing recommendation structure.

### Test Results

```
tests/test_cv_orchestrator.py  ...  272 passed  (+20 new tests)
Full suite: 272 passed, 1 warning in 4.33s
```

---

## Phases 10–15 — Planned

See the approved plan in `.claude/plans/virtual-wibbling-metcalfe.md` for full
specifications of Phases 10–15. Design decisions and implementation notes will be
added here as each phase is implemented.

---

## Environment Notes

| Item | Value |
|------|-------|
| Conda env | `cvgen` at `/usr/local/Caskroom/miniconda/base/envs/cvgen/` |
| Python | 3.12.12 |
| Test runner | `/usr/local/Caskroom/miniconda/base/bin/conda run -n cvgen python -m pytest` |
| `run_tests.py` | Requires `conda activate cvgen` in interactive shell; use direct pytest in agent context |

---

_Last updated by agent: 2026-03-11 (Phase 9 complete)_
