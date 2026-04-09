# Structured JSON Output for LLM Calls

**Branch:** `feat/structured-json-output`
**Created:** 2026-04-07
**OBO Session:** `.github/obo_sessions/session_20260407_210222.json`

## Background

All LLM calls in cv-builder already request JSON via prompt text ("Return ONLY a JSON
object — no prose, no markdown fences.") and rely on a bracket-scan fallback in
`_parse_json_response()` to rescue fence-wrapped responses. Three problems were
identified:

1. `cv_orchestrator.py` uses bare `json.loads()` for the layout-instruction response —
   no fallback, crashes on markdown fences.
2. No native API-level JSON mode is engaged for providers that support it (OpenAI,
   GitHub Models).
3. No runtime schema validation — dropped fields surface as `KeyError` or silent
   wrong-behaviour downstream.
4. Clarifying questions are parsed with a fragile `re.split()` on numbered list text.

## Decisions (all approved)

| # | Decision |
|---|---|
| 1 | Fix layout parser bug immediately (`try/except` + `_parse_json_response` fallback) |
| 2 | Hybrid JSON enforcement: native `json_mode` where supported, prompt-only elsewhere |
| 3 | Expose via `json_mode: bool = False` param on `chat()` |
| 4 | Pydantic v2 schemas for 3 heavy calls; plain dicts for lightweight calls; self-repair on `ValidationError` (1 retry) |
| 5 | Clarifying questions: `{"questions": [...]}` JSON array — drop `re.split` |
| 6 | Inline `reasoning` field added to job-analysis and publication-ranking schemas |
| 7 | Phased rollout |

## Implementation Phases

### Phase 1 — Bug Fix

**File:** `scripts/utils/cv_orchestrator.py` (around `apply_layout_instruction`)

**Change:** The layout-instruction response parser currently does:
```python
result = json.loads(response)
```
Replace with:
```python
try:
    result = json.loads(response)
except json.JSONDecodeError:
    result = self._parse_json_response(response)
```

**Test:** Add a test in `tests/test_cv_orchestrator.py` with a markdown-fenced layout
response to verify the fallback fires and returns the parsed dict.

### Phase 2 — `json_mode` Param on `chat()`

**Files:**
- `scripts/utils/llm_client.py` — add `json_mode: bool = False` to `LLMClient.chat()`
  and all provider `chat()` implementations
- `OpenAIClient.chat()` — pass `response_format={"type": "json_object"}` when
  `json_mode=True`
- `GitHubModelsClient.chat()` — same
- `AnthropicClient`, `GeminiClient`, local providers — silently ignore `json_mode`
- Update ~8 call sites inside `LLMClient` that use JSON prompts to pass
  `json_mode=True`

### Phase 3 — Pydantic Schemas + Self-Repair

**New file:** `scripts/utils/llm_response_models.py`

Models:
- `JobAnalysisResponse` — `title`, `company`, `domain`, `role_level`,
  `required_skills`, `preferred_skills`, `must_have_requirements`,
  `nice_to_have_requirements`, `culture_indicators`, `ats_keywords`, `reasoning`
- `CustomizationResult` — formalise existing structure with Pydantic
- `PublicationRanking` — `cite_key`, `relevance_score`, `confidence`, `rationale`,
  `is_first_author`, `authority_signals`, `reasoning`

Self-repair pattern (applied in each of the 3 heavy callers):
```python
try:
    return Model.model_validate(data)
except ValidationError as e:
    missing = [".".join(str(loc) for loc in err["loc"]) for err in e.errors()]
    repair_prompt = (
        f"Your previous response was missing required fields: {missing}. "
        "Return a corrected JSON object with all fields present."
    )
    repaired = self._parse_json_response(self.chat([...repair_messages...]))
    return Model.model_validate(repaired)  # raises if still invalid
```

### Phase 4 — Clarifying Questions JSON

**File:** `scripts/utils/conversation_manager.py`

**Change:** Replace `re.split(r'(?m)^\s*\d+\.\s+', response)` with a structured
sub-prompt that requests `{"questions": ["Q1", "Q2", ...]}` and parses with
`_parse_json_response(response)["questions"]`. This sub-call passes `json_mode=True`.

## Test Commands

```bash
# Phase 1
conda run -n cvgen python -m pytest tests/test_cv_orchestrator.py -q --tb=short \
    > /tmp/phase1.txt 2>&1 && head -30 /tmp/phase1.txt

# Phase 2
conda run -n cvgen python -m pytest tests/test_llm_client.py -q --tb=short \
    > /tmp/phase2.txt 2>&1 && head -30 /tmp/phase2.txt

# Full suite
conda run -n cvgen python -m pytest tests/ -q --tb=short \
    > /tmp/full.txt 2>&1 && tail -20 /tmp/full.txt
```
