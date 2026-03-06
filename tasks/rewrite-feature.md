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

- [ ] 1.1.1 Add `propose_rewrites(content: Dict, job_analysis: Dict) -> List[Dict]` as an `@abstractmethod`
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
- [ ] 1.1.2 Add `apply_rewrite_constraints(original: str, proposed: str) -> bool` as a static
      helper that returns `False` (invalid) if the proposed text removes any number, date, or
      company name that appears in the original.

### 1.2 `OpenAIClient` implementation

- [ ] 1.2.1 Write the prompt: supply `original` text blocks by type, job keywords, and the
      constraint rules (preserve metrics/dates/company names; only substitute terminology)
- [ ] 1.2.2 Parse JSON response into the schema; validate each item with `apply_rewrite_constraints`
- [ ] 1.2.3 Fall back to empty list (with warning) on parse failure — never raise
- [ ] 1.2.4 Add unit test covering: (a) a bullet rewrite with keyword substitution, (b) a
      skill_add with evidence, (c) a constraint violation that is filtered out

### 1.3 `AnthropicClient` implementation

- [ ] 1.3.1 Implement `propose_rewrites` using the same prompt strategy as 1.2.1
- [ ] 1.3.2 Parse and validate with `apply_rewrite_constraints`

### 1.4 `GeminiClient` implementation

- [ ] 1.4.1 Implement `propose_rewrites` — note Gemini-specific message format (see existing
      `recommend_customizations` in this class for the pattern)
- [ ] 1.4.2 Parse and validate with `apply_rewrite_constraints`

### 1.5 Stub implementations (local / copilot fallbacks)

- [ ] 1.5.1 Add `propose_rewrites` returning `[]` to any provider classes that do not have full
      LLM capability (local stub, copilot-oauth stub if present) so the abstract contract is satisfied

---

## Phase 2 — Orchestrator: rewrite pipeline

### 2.1 New method `propose_rewrites`

- [ ] 2.1.1 Add `CVOrchestrator.propose_rewrites(content: Dict, job_analysis: Dict) -> List[Dict]`
      that delegates to `self.llm.propose_rewrites(...)` when an LLM client is available and
      returns `[]` when no LLM (graceful degradation with a logged warning)

### 2.2 New method `apply_approved_rewrites`

- [ ] 2.2.1 Add `CVOrchestrator.apply_approved_rewrites(content: Dict, approved: List[Dict]) -> Dict`
- [ ] 2.2.2 Resolve each approved item's `location` path to the correct nested field in `content`
      (e.g. `"exp_001.achievements[2]"` → `content['experiences'][idx]['achievements'][2]['text']`)
- [ ] 2.2.3 For `skill_rename`: update the matching skill's display name in-place
- [ ] 2.2.4 For `skill_add`: append a new skill entry, flagging `candidate_to_confirm: True` when
      `evidence_strength == "weak"`
- [ ] 2.2.5 Guard: call `apply_rewrite_constraints(original, proposed)` before applying; skip and
      log any item that fails the constraint check
- [ ] 2.2.6 Add unit tests: bullet apply, skill rename, skill add (strong), skill add (weak flag),
      constraint violation skip

### 2.3 Refactor `_enhance_summary_for_ats` (line ~1055)

- [ ] 2.3.1 Remove the "append tacked-on sentence" mutation
- [ ] 2.3.2 When LLM is present: log a note that rewrites are handled upstream via `apply_approved_rewrites`; return `summary` unchanged
- [ ] 2.3.3 When no LLM: log a keyword-gap warning listing missing keywords; return `summary` unchanged

### 2.4 Refactor `_enhance_achievement_for_ats` (line ~1109)

- [ ] 2.4.1 Remove silent `"Successfully "` prefix injection
- [ ] 2.4.2 Replace with a logged warning when the bullet lacks a strong action verb; do not modify the text

### 2.5 Refactor `_optimize_skills_for_ats` (line ~1080)

- [ ] 2.5.1 Keep score-based ordering/selection logic
- [ ] 2.5.2 Remove any implicit renaming — terminology changes must come only from `apply_approved_rewrites`

### 2.6 Update `generate_cv` signature

- [ ] 2.6.1 Add parameter `approved_rewrites: List[Dict] = None` to `generate_cv()`
- [ ] 2.6.2 After `_select_content_hybrid`, call `apply_approved_rewrites(selected_content, approved_rewrites or [])`
- [ ] 2.6.3 Pass the resulting modified content to all downstream renderers (ATS DOCX, human PDF)
- [ ] 2.6.4 Include `approved_rewrites` in the metadata dict written to `metadata.json`

---

## Phase 3 — Conversation state: `rewrite_review` phase

### 3.1 State schema

- [ ] 3.1.1 Add `'rewrite_review'` to the phase comment (line ~34):
      `# init, job_analysis, customization, rewrite_review, generation, refinement`
- [ ] 3.1.2 Add state keys to `__init__`:
      ```python
      'pending_rewrites': None,   # List[Dict] from propose_rewrites
      'approved_rewrites': [],    # List[Dict] user-accepted or user-edited
      'rewrite_audit': [],        # full record: proposal + outcome for metadata
      ```

### 3.2 Action handler

- [ ] 3.2.1 Handle `action == "submit_rewrites"` in `_execute_action` (or add a new
      `submit_rewrite_decisions(decisions: List[Dict])` method called from there)
- [ ] 3.2.2 Each decision: `{"id": str, "outcome": "accept"|"reject"|"edit", "final_text": str|None}`
- [ ] 3.2.3 Build `approved_rewrites` (outcome != "reject") and `rewrite_audit` (all decisions)
- [ ] 3.2.4 Advance phase to `'generation'`
- [ ] 3.2.5 Call `_save_session()` so the approval record is persisted

### 3.3 System prompt update

- [ ] 3.3.1 Add `rewrite_review` case to `_build_system_prompt` describing the review context
      (user is reviewing before/after diffs; LLM should help clarify rationale if asked)

---

## Phase 4 — API: new endpoints in `web_app.py`

### 4.1 `GET /api/rewrites`

- [ ] 4.1.1 Retrieve `conversation.state['customizations_content']` and `'job_analysis'`
- [ ] 4.1.2 Call `orchestrator.propose_rewrites(content, job_analysis)` and store in
      `conversation.state['pending_rewrites']`
- [ ] 4.1.3 Advance phase to `'rewrite_review'` and save session
- [ ] 4.1.4 Return `{"ok": true, "rewrites": [...], "phase": "rewrite_review"}`
- [ ] 4.1.5 Return `{"ok": true, "rewrites": [], "phase": "generation"}` (skip step) when no
      LLM client is configured, so frontend can fall through gracefully

### 4.2 `POST /api/rewrites/approve`

- [ ] 4.2.1 Accept `{"decisions": [...]}`
- [ ] 4.2.2 Call `conversation.submit_rewrite_decisions(decisions)`
- [ ] 4.2.3 Return `{"ok": true, "approved_count": N, "rejected_count": M, "phase": "generation"}`

### 4.3 Update `generate_cv` call site

- [ ] 4.3.1 Wherever `orchestrator.generate_cv(...)` is called in `web_app.py`, pass
      `approved_rewrites=conversation.state.get('approved_rewrites', [])`

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

## Completion Checklist

- [ ] All unit tests pass: `python run_tests.py --categories unit component`
- [ ] Full test suite passes: `python run_tests.py`
- [ ] Code review applied (`#code-review` skill) for all modified files
- [ ] No new unused imports introduced
- [ ] `REQUIREMENTS.md` traceability: every item in §Customization Workflow step 5 has an
      implementing task above
