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

| Phase | Title | Status | Commit |
|-------|-------|--------|--------|
| 0 | Update CLAUDE.md + copilot-instructions.md | ✅ Complete | `9b92e0e` |
| 1 | Test fixes + metadata audit trail + startup config validation | ✅ Complete | _pending_ |
| 2 | Workflow progress indicator (8-step bar, back-nav, single-session lock) | ✅ Complete | _pending_ |
| 3 | Analysis display upgrade | ✅ Complete | _pending_ |
| 4 | Rewrite review UI polish | 🔲 Pending | — |
| 5 | Publications block + Human DOCX | 🔲 Pending | — |
| 6 | Spell/grammar check | 🔲 Pending | — |
| 7 | ATS validation report + page count | 🔲 Pending | — |
| 8 | Phase re-entry / iterative refinement | 🔲 Pending | — |
| 9 | Skills canonicalisation + bullet reordering | 🔲 Pending | — |
| 10 | Persuasion checks + loading state | 🔲 Pending | — |
| 11 | Finalise & archive + master data harvest | 🔲 Pending | — |
| 12 | Natural-language layout instructions | 🔲 Pending | — |
| 13 | Master data management + accessibility baseline | 🔲 Pending | — |
| 14 | Cover letter generation | 🔲 Pending | — |
| 15 | Interview screening question responses | 🔲 Pending | — |

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

**Status**: 🔲 Pending

### Planned Changes
- `computeWordDiff(original, proposed)` LCS word-level diff
- Inline `<del>`/`<ins>` diff replacing side-by-side layout
- Ranked keyword pills with weight badge
- Sticky tally bar at top

---

## Phase 5 — Publications Template Block + Human DOCX

**Status**: 🔲 Pending (blocked on Q1, Q2 above)

### Planned Changes
- `rank_publications_for_job()` in `llm_client.py`
- Selected Publications DataTable panel in Customisation step
- Publications Jinja2 block in `cv-template.html`
- `docxtpl`-based `_generate_human_docx()` replacing current stub
- Certifications section in both templates
- `/api/publication-recommendations` GET endpoint
- Venue validation warnings

---

## Phase 6 — Spell/Grammar Check

**Status**: 🔲 Pending (blocked on Q3 above)

### Planned Changes
- `scripts/utils/spell_checker.py` (new, wraps `language-tool-python`)
- Context-aware suppression (sentence fragments in bullet context)
- Custom dictionary from master CV skill names
- `/api/spell-check` + `/api/custom-dictionary` endpoints
- Zero-flag fast-path (auto-advance)
- `spell_audit[]` in `metadata.json`

---

## Phases 7–15 — Planned

See the approved plan in `.claude/plans/virtual-wibbling-metcalfe.md` for full
specifications of Phases 7–15. Design decisions and implementation notes will be
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

_Last updated by agent: 2026-03-11 (Phase 3 complete)_
