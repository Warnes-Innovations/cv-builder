# Rewrite Feature Implementation

**Feature:** LLM-driven text rewrite proposals with user approval gate  
**Requirement source:** REQUIREMENTS.md §Keyword Optimization Strategy, §Customization Workflow, §Workflow step 5  
**Status:** Not started  

---

## Prompt

You are implementing a new feature in the `cv-builder` project. The feature allows the LLM to propose
targeted text rewrites—of the professional summary, experience bullet points, and skills list—so that
the generated CV uses the exact terminology from the target job description. All proposed changes must
be shown to the user as before/after diffs and require explicit accept / edit / reject approval before
any rewritten text enters a generated file.

The key files are:
- `scripts/utils/llm_client.py` — LLM provider abstraction (OpenAI, Anthropic, Gemini, Copilot stubs)
- `scripts/utils/cv_orchestrator.py` — content selection and document generation
- `scripts/utils/conversation_manager.py` — session state and phase management
- `scripts/web_app.py` — Flask API endpoints
- `web/index.html` — single-page web UI

Before starting any phase, read the corresponding source file(s) in full so you understand the existing
patterns. Follow the project conventions:
- Minimal, surgical changes — do not refactor unrelated code
- Preserve all existing API routes and state keys
- Run `python run_tests.py --categories unit component` after each phase
- Apply the `#code-review` skill before marking any phase complete

Work through the numbered tasks below in order. Mark each item `[x]` when complete.
Use the hierarchical number (e.g. `1.2.3`) when reporting progress.

---

## Phase 1 — LLM Layer: `propose_rewrites` method

### 1.1 Abstract base class (`LLMClient`)

- [x] 1.1.1 Add `propose_rewrites(content: Dict, job_analysis: Dict) -> List[Dict]` as an `@abstractmethod`
      with full docstring specifying the return schema:
      ```
      {
        "id":                  str,   # unique within this proposal batch
        "type":                "summary" | "bullet" | "skill_rename" | "skill_add",
        "location":            str,   # e.g. "summary", "exp_001.achievements[2]", "skills.core[1]"
        "original":            str,
        "proposed":            str,
        "keywords_introduced": List[str],
        "evidence":            str,   # skill_add only — comma-sep experience IDs
        "evidence_strength":   "strong" | "weak",  # skill_add only
        "rationale":           str
      }
      ```
- [x] 1.1.2 Add `apply_rewrite_constraints(original: str, proposed: str) -> bool` as a static
      helper that returns `False` (invalid) if the proposed text removes any number, date, or
      company name that appears in the original.

### 1.2 `OpenAIClient` implementation

- [x] 1.2.1 Write the prompt: supply `original` text blocks by type, job keywords, and the
      constraint rules (preserve metrics/dates/company names; only substitute terminology)
- [x] 1.2.2 Parse JSON response into the schema; validate each item with `apply_rewrite_constraints`
- [x] 1.2.3 Fall back to empty list (with warning) on parse failure — never raise
- [x] 1.2.4 Add unit test covering: (a) a bullet rewrite with keyword substitution, (b) a
      skill_add with evidence, (c) a constraint violation that is filtered out

### 1.3 `AnthropicClient` implementation

- [x] 1.3.1 Implement `propose_rewrites` using the same prompt strategy as 1.2.1
- [x] 1.3.2 Parse and validate with `apply_rewrite_constraints`

### 1.4 `GeminiClient` implementation

- [x] 1.4.1 Implement `propose_rewrites` — note Gemini-specific message format (see existing
      `recommend_customizations` in this class for the pattern)
- [x] 1.4.2 Parse and validate with `apply_rewrite_constraints`

### 1.5 Stub implementations (local / copilot fallbacks)

- [x] 1.5.1 Add `propose_rewrites` returning `[]` to any provider classes that do not have full
      LLM capability (local stub, copilot-oauth stub if present) so the abstract contract is satisfied

---

## Phase 2 — Orchestrator: rewrite pipeline

### 2.1 New method `propose_rewrites`

- [x] 2.1.1 Add `CVOrchestrator.propose_rewrites(content: Dict, job_analysis: Dict) -> List[Dict]`
      that delegates to `self.llm.propose_rewrites(...)` when an LLM client is available and
      returns `[]` when no LLM (graceful degradation with a logged warning)

### 2.2 New method `apply_approved_rewrites`

- [x] 2.2.1 Add `CVOrchestrator.apply_approved_rewrites(content: Dict, approved: List[Dict]) -> Dict`
- [x] 2.2.2 Resolve each approved item's `location` path to the correct nested field in `content`
      (e.g. `"exp_001.achievements[2]"` → `content['experiences'][idx]['achievements'][2]['text']`)
- [x] 2.2.3 For `skill_rename`: update the matching skill's display name in-place
- [x] 2.2.4 For `skill_add`: append a new skill entry, flagging `candidate_to_confirm: True` when
      `evidence_strength == "weak"`
- [x] 2.2.5 Guard: call `apply_rewrite_constraints(original, proposed)` before applying; skip and
      log any item that fails the constraint check
- [x] 2.2.6 Add unit tests: bullet apply, skill rename, skill add (strong), skill add (weak flag),
      constraint violation skip

### 2.3 Refactor `_enhance_summary_for_ats` (line ~1055)

- [x] 2.3.1 Remove the "append tacked-on sentence" mutation
- [x] 2.3.2 When LLM is present: log a note that rewrites are handled upstream via `apply_approved_rewrites`; return `summary` unchanged
- [x] 2.3.3 When no LLM: log a keyword-gap warning listing missing keywords; return `summary` unchanged

### 2.4 Refactor `_enhance_achievement_for_ats` (line ~1109)

- [x] 2.4.1 Remove silent `"Successfully "` prefix injection
- [x] 2.4.2 Replace with a logged warning when the bullet lacks a strong action verb; do not modify the text

### 2.5 Refactor `_optimize_skills_for_ats` (line ~1080)

- [x] 2.5.1 Keep score-based ordering/selection logic
- [x] 2.5.2 Remove any implicit renaming — terminology changes must come only from `apply_approved_rewrites`

### 2.6 Update `generate_cv` signature

- [x] 2.6.1 Add parameter `approved_rewrites: List[Dict] = None` to `generate_cv()`
- [x] 2.6.2 After `_select_content_hybrid`, call `apply_approved_rewrites(selected_content, approved_rewrites or [])`
- [x] 2.6.3 Pass the resulting modified content to all downstream renderers (ATS DOCX, human PDF)
- [x] 2.6.4 Include `approved_rewrites` in the metadata dict written to `metadata.json`

---

## Phase 3 — Conversation state: `rewrite_review` phase

### 3.1 State schema

- [x] 3.1.1 Add `'rewrite_review'` to the phase comment (line ~34):
      `# init, job_analysis, customization, rewrite_review, generation, refinement`
- [x] 3.1.2 Add state keys to `__init__`:
      ```python
      'pending_rewrites': None,   # List[Dict] from propose_rewrites
      'approved_rewrites': [],    # List[Dict] user-accepted or user-edited
      'rewrite_audit': [],        # full record: proposal + outcome for metadata
      ```

### 3.2 Action handler

- [x] 3.2.1 Handle `action == "submit_rewrites"` in `_execute_action` (or add a new
      `submit_rewrite_decisions(decisions: List[Dict])` method called from there)
- [x] 3.2.2 Each decision: `{"id": str, "outcome": "accept"|"reject"|"edit", "final_text": str|None}`
- [x] 3.2.3 Build `approved_rewrites` (outcome != "reject") and `rewrite_audit` (all decisions)
- [x] 3.2.4 Advance phase to `'generation'`
- [x] 3.2.5 Call `_save_session()` so the approval record is persisted

### 3.3 System prompt update

- [x] 3.3.1 Add `rewrite_review` case to `_build_system_prompt` describing the review context
      (user is reviewing before/after diffs; LLM should help clarify rationale if asked)

---

## Phase 4 — API: new endpoints in `web_app.py`

### 4.1 `GET /api/rewrites`

- [x] 4.1.1 Retrieve `orchestrator.master_data` (CV content) and `conversation.state['job_analysis']`
- [x] 4.1.2 Call `orchestrator.propose_rewrites(content, job_analysis)` and store in
      `conversation.state['pending_rewrites']`
- [x] 4.1.3 Advance phase to `'rewrite_review'` and save session
- [x] 4.1.4 Return `{"ok": true, "rewrites": [...], "phase": "rewrite_review"}`
- [x] 4.1.5 Return `{"ok": true, "rewrites": [], "phase": "generation"}` (skip step) when no
      LLM client is configured, so frontend can fall through gracefully

### 4.2 `POST /api/rewrites/approve`

- [x] 4.2.1 Accept `{"decisions": [...]}`
- [x] 4.2.2 Call `conversation.submit_rewrite_decisions(decisions)`
- [x] 4.2.3 Return `{"ok": true, "approved_count": N, "rejected_count": M, "phase": "generation"}`

### 4.3 Update `generate_cv` call site

- [x] 4.3.1 Both `orchestrator.generate_cv(...)` call sites in `conversation_manager.py`
      (`_execute_action` and `run_automated`) updated to pass
      `approved_rewrites=self.state.get('approved_rewrites') or []`

---

## Phase 5 — Web UI: rewrite review panel in `web/index.html`

### 5.1 Phase-gating update

- [ ] 5.1.1 Add `'rewrite_review'` to the phase checks on lines ~844 and ~857 so the UI
      recognises the new phase correctly (alongside `'customization'` and `'generation'`)

### 5.2 Rewrite review panel

- [ ] 5.2.1 After the customization recommendations table is confirmed, fetch `GET /api/rewrites`
- [ ] 5.2.2 If `rewrites` is empty, skip silently to generation step
- [ ] 5.2.3 Render one card per proposal showing:
      - Before text (greyed / strikethrough style)
      - After text (highlighted)
      - Keywords introduced (pill badges)
      - Collapsible rationale + evidence line
      - Three action buttons: **Accept** / **Edit** / **Reject**
- [ ] 5.2.4 For `skill_add` with `evidence_strength == "weak"`, show a "⚠ Candidate to confirm"
      badge prominently on the card
- [ ] 5.2.5 **Edit** action replaces the "After" text with an inline `<textarea>` pre-filled with
      `proposed`; saving updates the local decision to `{outcome: "edit", final_text: <edited>}`
- [ ] 5.2.6 Tally accepted / rejected counts in a sticky summary bar at the top of the panel
- [ ] 5.2.7 **Submit All Decisions** button posts to `POST /api/rewrites/approve` and transitions to
      the generation step
- [ ] 5.2.8 Disable Submit until every card has been actioned (no unreviewed cards remaining)

---

## Phase 6 — Metadata audit trail

### 6.1 `metadata.json` schema update

- [ ] 6.1.1 Add `rewrite_audit` array to the metadata dict written during/after generation:
      ```json
      "rewrite_audit": [
        {
          "id": "summary",
          "type": "summary",
          "original": "...",
          "proposed": "...",
          "final": "...",
          "outcome": "accept|reject|edit",
          "keywords_introduced": ["MLOps"]
        }
      ]
      ```
- [ ] 6.1.2 Verify the audit is written even when `approved_rewrites` is empty (empty array, not absent)

### 6.2 Session restore

- [ ] 6.2.1 Verify that loading a saved session via `POST /api/load-session` correctly restores
      `pending_rewrites`, `approved_rewrites`, and `rewrite_audit` state keys without error

---

## Phase 7 — Spell & Grammar Check

**Requirement source:** `REQUIREMENTS.md §6 Spell & Grammar Check`, US-A4b, US-R7  
**Dependency:** Phase 3 must be complete (conversation state phases) and Phase 4 must be complete (`web_app.py` endpoint patterns)

### 7.1 Backend: LanguageTool integration

- [ ] 7.1.1 Install `language-tool-python` and verify local LanguageTool server starts correctly
- [ ] 7.1.2 Add `check_spelling_grammar(text_fields: List[Dict], custom_words: List[str]) -> List[Dict]` to
      `cv_orchestrator.py`. Each `text_field` is `{id, text, context_type}` where `context_type` is one of
      `summary | bullet | skill_name | cover_letter | screening_response`.
- [ ] 7.1.3 Suppress LanguageTool rule IDs `SENTENCE_FRAGMENT` and `MISSING_VERB` for `bullet` and
      `skill_name` context types.
- [ ] 7.1.4 Pre-load words from `custom_dictionary.json` as LanguageTool disabled-words before each check.
- [ ] 7.1.5 Return results as a list of:
      ```json
      {
        "id":          "<unique flag id>",
        "context_type": "bullet",
        "location":    "exp_001.achievements[2]",
        "original":    "Leveraged synergetic algorithms",
        "suggestion":  "Leveraged synergistic algorithms",
        "rule":        "SPELLING",
        "offset":      27,
        "length":      10
      }
      ```

### 7.2 Custom dictionary management

- [ ] 7.2.1 On first run, create `~/CV/custom_dictionary.json` pre-populated with the candidate's name,
      and all technical terms and company names present in `Master_CV_Data.json`.
- [ ] 7.2.2 Add helper `add_to_custom_dictionary(word: str)` that appends to `custom_dictionary.json`
      and invalidates the LanguageTool disabled-words cache for the current session.

### 7.3 Conversation state: `spell_review` phase

- [ ] 7.3.1 Add `spell_review` as a new phase in `conversation_manager.py`, entered after `rewrite_review`
      is complete and before CV generation.
- [ ] 7.3.2 State schema additions:
      ```json
      {
        "pending_flags":   [],
        "resolved_flags":  [],
        "spell_audit":     []
      }
      ```
- [ ] 7.3.3 Action handler: accept flag → apply correction to in-memory content; reject → mark resolved,
      no change; edit → store user's custom text; add-to-dictionary → call `add_to_custom_dictionary`,
      mark resolved. In all cases append a `spell_audit` record.

### 7.4 API: new endpoints in `web_app.py`

- [ ] 7.4.1 `GET /api/spell-check` — run the checker on current session content; return `pending_flags`.
      Only callable when `phase == "spell_review"`.
- [ ] 7.4.2 `POST /api/spell-check/resolve` — body `{flag_id, action, custom_text?}` where action is one of
      `accept | reject | edit | add_to_dictionary`. Returns updated flag list.
- [ ] 7.4.3 `GET /api/spell-check/dictionary` — return current entries in `custom_dictionary.json`.

### 7.5 Web UI: spell-check review panel in `web/index.html`

- [ ] 7.5.1 Add phase gate: show spell-check panel only when `phase == "spell_review"`.
- [ ] 7.5.2 Panel displays one flag at a time (or a scrollable list), showing `original` text with the
      flagged span highlighted, `suggestion`, and four action buttons: Accept / Reject / Edit / Add to Dictionary.
- [ ] 7.5.3 "Edit" button opens an inline textarea pre-filled with `original`; user saves their own correction.
- [ ] 7.5.4 "Accept All" button is enabled only after every flag has been individually viewed.
- [ ] 7.5.5 Progress indicator: "3 of 12 flags remaining".

### 7.6 Metadata audit trail

- [ ] 7.6.1 After phase completes, write `spell_audit` array to `metadata.json` alongside `rewrite_audit`.
      Each record: `{context_type, location, original, suggestion, rule, outcome, final}`.
- [ ] 7.6.2 Verify audit is written even when there are zero flags (empty array, not absent).
- [ ] 7.6.3 Verify session restore (`POST /api/load-session`) correctly restores `pending_flags`,
      `resolved_flags`, and `spell_audit`.

---

## Completion Checklist

- [ ] All unit tests pass: `python run_tests.py --categories unit component`
- [ ] Full test suite passes: `python run_tests.py`
- [ ] Code review applied (`#code-review` skill) for all modified files
- [ ] No new unused imports introduced
- [ ] `REQUIREMENTS.md` traceability: every item in §Customization Workflow step 5 has an
      implementing task above
- [ ] `REQUIREMENTS.md §6 Spell & Grammar Check` traceability: every requirement has an
      implementing task in Phase 7 above
