# Phase 0 Contract Definition

**Date:** 2026-03-19
**Status:** Draft
**Scope:** Staged generation, ATS score schema, skill typing, rerun diffing

This document defines the contracts that Phase 1 and Phase 2 work must implement and satisfy.
It is the stable reference for all workstreams during Phase 0 and Phase 1.

---

## 1. Staged Generation State

### 1.1 Session State Fields

These fields are added to the session state managed by `ConversationManager` and persisted to the session JSON file.

```python
# New fields in session_data (nested under a "generation" key)
{
    "generation": {
        # Phase tracking
        "phase": "idle" | "preview" | "layout_review" | "confirmed" | "final_complete",

        # Preview artifact
        "preview_html": str | None,              # Full rendered HTML string
        "preview_generated_at": str | None,      # ISO-8601 timestamp
        "preview_request_id": str | None,        # UUID for cache-busting

        # Layout instructions history
        "layout_instructions": [                 # Ordered list of all instructions given
            {
                "id": str,                       # UUID
                "text": str,
                "submitted_at": str,             # ISO-8601 timestamp
                "applied": bool
            }
        ],

        # Confirmation
        "layout_confirmed": bool,                # True after user confirms layout
        "confirmed_at": str | None,              # ISO-8601 timestamp of confirmation
        "confirmed_preview_hash": str | None,    # SHA-256 of confirmed HTML (integrity)

        # Final generation
        "final_generated_at": str | None,        # ISO-8601 timestamp
        "final_output_paths": {                  # Paths to generated files
            "html": str | None,
            "pdf": str | None,
            "ats_docx": str | None,
            "human_docx": str | None
        },

        # Page-length warnings
        "page_count_estimate": int | None,
        "page_length_warning": bool
    }
}
```

### 1.2 Phase Transition Rules

```
idle       → preview         : POST /api/cv/generate-preview (triggers preview generation)
preview    → layout_review   : automatic after preview generation succeeds
layout_review → preview      : POST /api/cv/layout-refine (adds instruction, regenerates)
layout_review → confirmed    : POST /api/cv/confirm-layout
confirmed  → final_complete  : POST /api/cv/generate-final
```

Any phase may return to `idle` via session reset.
`layout_review` is a state within the preview/layout loop — transitioning from `preview` to `layout_review` happens implicitly when any layout instruction has been applied.

### 1.3 New Backend Endpoints

All endpoints require `session_id` in the JSON body.

#### `POST /api/cv/generate-preview`
- **Purpose:** Generate an HTML preview using current CV content and layout instructions.
- **Body:** `{ "session_id": str, "layout_instructions": str | None }`
- **Success response:** `{ "html": str, "preview_request_id": str, "page_count_estimate": int, "page_length_warning": bool }`
- **Side effects:** Stores preview HTML in session state; sets `generation.phase = "layout_review"`.
- **Errors:** 400 if no CV data; 500 on generation failure.

#### `POST /api/cv/layout-refine`
- **Purpose:** Add a layout instruction and regenerate preview.
- **Body:** `{ "session_id": str, "instruction": str }`
- **Success response:** Same shape as `generate-preview`.
- **Side effects:** Appends to `generation.layout_instructions`; regenerates preview HTML.
- **Errors:** 400 if `generation.phase` not in `["preview", "layout_review"]`.

#### `POST /api/cv/confirm-layout`
- **Purpose:** Lock the current preview as the confirmed layout for final generation.
- **Body:** `{ "session_id": str }`
- **Success response:** `{ "confirmed": true, "confirmed_at": str, "hash": str }`
- **Side effects:** Sets `generation.layout_confirmed = true`, records confirmation timestamp and hash.
- **Errors:** 400 if no preview exists; 400 if already confirmed.

#### `POST /api/cv/generate-final`
- **Purpose:** Generate final output files (PDF, DOCX) from the confirmed HTML preview.
- **Body:** `{ "session_id": str, "formats": ["pdf", "ats_docx", "human_docx"] | None }`
- **Success response:** `{ "outputs": { "pdf": str, "ats_docx": str, "human_docx": str }, "generated_at": str }`
- **Side effects:** Sets `generation.phase = "final_complete"`, stores output paths.
- **Errors:** 400 if `generation.layout_confirmed != true`.

#### `GET /api/cv/generation-state`
- **Purpose:** Return the current generation phase and metadata.
- **Query params:** `session_id=<uuid>`
- **Success response:** The full `generation` state dict (minus the raw HTML; use a separate flag instead).
- **Note:** Expose `preview_available: bool` rather than the full HTML string in state queries.

---

## 2. ATS Score Schema

### 2.1 Scoring Model

```python
{
    "ats_score": {
        "overall": float,              # 0–100
        "hard_requirement_score": float,  # 0–100; weighted by hard requirements
        "soft_requirement_score": float,  # 0–100; bonus criteria

        "keyword_status": [            # One entry per keyword from job analysis
            {
                "keyword": str,
                "type": "hard" | "soft" | "bonus",
                "status": "matched" | "missing" | "partial",
                "matched_in_sections": [str],  # e.g. ["skills", "experience.0"]
                "match_type": "exact" | "synonym" | "semantic"
            }
        ],

        "section_scores": {            # Per-section contribution
            "skills": float,
            "experience": float,
            "education": float,
            "summary": float
        },

        "computed_at": str,            # ISO-8601
        "basis": "analysis" | "review_checkpoint" | "post_generation"
    }
}
```

### 2.2 Refresh Triggers

The ATS score is recomputed:
1. After analysis completes
2. After a debounced burst of review decisions (500ms idle window)
3. After rerun completion for affected stages
4. After layout confirmation
5. After final generation completes

The score is NOT recomputed on every individual UI interaction during review.

### 2.3 UI Placement

The ATS score summary is rendered on the same DOM row as `div.position-bar`, at the right end.

```html
<div class="position-bar-row">
    <div id="position-bar" class="position-bar">...</div>
    <div id="ats-score-badge" class="ats-score-badge" aria-label="ATS match score">
        <span class="ats-score-value">--</span>
        <span class="ats-score-label">ATS</span>
    </div>
</div>
```

The badge degrades to hidden (`display: none`) when no score is available, without disrupting layout.

---

## 3. Skill Type Schema

### 3.1 Skill Object

Skills stored in session data and master CV data gain an optional `skill_type` field:

```python
{
    "name": str,
    "skill_type": "hard" | "soft" | None,  # None = unclassified
    "proficiency": str | None,
    "years": int | None,
    "approved": bool
}
```

`skill_type` is set:
- During job analysis (inferred from job requirements)
- During ATS scoring (validated against job's hard/soft categorization)
- May be manually overridden in the review UI

### 3.2 Compatibility

The existing `skills` field in master data can be:
- A flat list of strings (legacy): treated as name-only, `skill_type = None`
- A category dict (existing structured form): categories implied by key names
- A list of skill objects (new): full schema as above

All three forms remain valid; the system reads all three and normalizes on write.

---

## 4. Rerun Diff Contract

### 4.1 Reviewable Entity Identity

Each reviewable entity (rewrite, achievement bullet, skill, publication, etc.) carries a stable `id` field. Identity is based on:
- For rewrites: `section_id + bullet_index + content_hash`
- For skills: `skill_name` (normalized lowercase)
- For publications: `bibtex_key`
- For experiences: `company + role + start_date`

### 4.2 Changed-Item Detection

On rerun, entities are compared to the stored review state by their stable id. An entity is marked "changed" if:
- It is new (not in previous review state)
- Its generated content differs from the previously reviewed content
- Its recommendation status changed

Only "changed" entities require explicit re-review. Unchanged approved entities carry forward their prior decision.

### 4.3 UI Indicator

Changed entities after rerun are marked with a `data-changed="true"` attribute and styled with a highlight class. This is purely additive and does not affect sort order.

---

## 5. Files Impacted Per Workstream

### Workstream 1: Staged Generation (Phase 1)

| File | Change Type |
|---|---|
| `scripts/web_app.py` | Add 4 new routes; no destructive changes to existing routes |
| `scripts/utils/cv_orchestrator.py` | Add `generate_preview()` and `generate_final_from_confirmed()` methods |
| `scripts/utils/conversation_manager.py` | Add generation state fields to session dict |
| `web/state-manager.js` | Add generation state getters/setters |
| `web/app.js` | Add preview pane rendering and staged workflow transitions |
| `web/layout-instruction.js` | Wire existing layout instruction flow to new `/api/cv/layout-refine` endpoint |
| `web/index.html` / `web/styles.css` | Add preview pane container and ATS score badge skeleton |

### Workstream 2: ATS Scoring (Phase 2)

| File | Change Type |
|---|---|
| `scripts/utils/scoring.py` | Add/extend ATS scoring model |
| `scripts/web_app.py` | Add `/api/cv/ats-score` refresh endpoint |
| `web/state-manager.js` | Add ATS score state management |
| `web/app.js` | Add ATS score display and debounced refresh |
| `web/styles.css` | Style `ats-score-badge` |

---

## Open Questions (tracked for /obo review)

1. Should the confirmed HTML preview become the canonical source for BOTH PDF and ATS DOCX generation, or only PDF/layout-sensitive outputs?
   - **Current lean:** Yes for PDF; ATS DOCX should still be generated from structured data to preserve accessibility — but the confirmed layout should inform ATS formatting choices.

2. Should `generate-preview` reuse the existing layout-instruction flow unchanged or replace it?
   - **Current lean:** Wire the existing layout system to the new endpoints rather than replace it, to preserve user-visible behavior during Phase 1.

3. How are prior layout instructions carried across reruns?
   - **Current lean:** Layout instructions are session-scoped and persist; a rerun of the generation phase presents all prior instructions as the starting context but allows adding more.

4. Is Google Drive sync in scope for the finalise slice?
   - **Current lean:** Deferred; out of scope for Phase 1–4.