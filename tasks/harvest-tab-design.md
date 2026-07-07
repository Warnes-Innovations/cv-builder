# Harvest Improvements Tab — Design Proposal

**Author:** Copilot (with UX review)  
**Date:** 2026-05-21  
**Status:** Draft — for user review  
**Related files:** `web/finalise.js`, `scripts/routes/generation_routes.py`, `web/harvest.js` (to be created)

---

## 1. Overview

The **Harvest Improvements** tab (`🌾 Harvest`) is the final step in the post-layout workflow.
Its purpose is to let you selectively promote the best content produced during this job application
back to `Master_CV_Data.json`, permanently improving your master CV for future applications.

### What gets harvested?

The backend already compiles four candidate types from the session:

| Candidate type         | Display label        | Source badge    | What it represents |
|------------------------|----------------------|-----------------|--------------------|
| `improved_bullet`      | Experience Bullets   | —               | Rewritten achievement bullets you approved in the Rewrites step |
| `new_skill`            | Skills               | 🆕 Added        | Skills proactively added during the Skills Review step |
| `skill_gap_confirmed`  | Skills               | ✅ Confirmed    | Skills confirmed when the AI asked clarifying questions |
| `summary_variant`      | Professional Summary | —               | A rewritten summary you approved in the Rewrites step |

> `new_skill` and `skill_gap_confirmed` are merged into one **Skills** group. Each item shows a source badge (`🆕 Added` or `✅ Confirmed`) so the provenance remains visible. The LLM is told the source in its evaluation context.

### Current state vs. proposed state

| Dimension         | Current (Finalise tab placeholder) | Proposed |
|-------------------|------------------------------------|----------|
| LLM analysis      | None — static rationale strings    | Full LLM recommendation per item (promote / skip, confidence, reasoning) |
| LLM trigger       | N/A                                | **Auto on tab load**; cached in session; Re-run button available |
| Layout            | Flat checkbox table                | 3-level collapsible tree |
| Grouping          | None                               | Info type → Recommendation → Confidence |
| Skill sub-types   | Separate rows                      | **Merged into one Skills group** with `🆕 Added` / `✅ Confirmed` source badge |
| Before/After view | Single column (proposed only)      | Side-by-side before/after |
| Default selection | None pre-checked                   | Promote + **High or Medium** confidence pre-checked |
| Default expansion | All visible                        | Promote + High/Medium expanded; Skip + Low collapsed |
| Reasoning         | Static one-liner                   | LLM reasoning, expandable per item |

---

## 2. New Backend Endpoint — `POST /api/harvest/analyze`

### Purpose

Takes the candidate list produced by `/api/harvest/candidates` and runs an LLM evaluation to
produce a `recommendation`, `confidence`, and `reasoning` for each item.

### Request

```json
{
  "session_id": "<uuid>"
}
```

No body payload for the candidates — the backend re-derives them from session state, same as `/api/harvest/candidates`.

### Response

```json
{
  "ok": true,
  "analyses": [
    {
      "id": "rewrite_exp_google_1",
      "recommendation": "promote",
      "confidence": "high",
      "reasoning": "The rewrite adds a quantified outcome ($2M savings) and two high-frequency ATS keywords (Python, MLOps) missing from the original. The improvement is job-neutral and generalises well beyond this application."
    },
    {
      "id": "skill_TensorFlow",
      "recommendation": "skip",
      "confidence": "medium",
      "reasoning": "TensorFlow was added specifically to match this job description but does not appear elsewhere in your approved bullets. Promoting it could overstate existing proficiency."
    }
  ]
}
```

### LLM prompt strategy

The system prompt provides:
- Full job description and job analysis
- The master CV's relevant section (current value of each candidate's field)
- The proposed value
- The candidate type and how it was generated

Evaluation criteria by type:

| Type                  | Promote when…                                                                    | Skip when…                                                      |
|-----------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------|
| `improved_bullet`     | Adds metrics, specificity, or ATS keywords that apply to many job types          | Rewrites feel job-specific or degrade readability               |
| `new_skill`           | Skill appears across approved bullets and/or you actively use it                | Skill appears only in this one job's description; no evidence   |
| `skill_gap_confirmed` | You explicitly confirmed you have the skill; it's absent from master             | Confirmation was tentative or skill overlaps with existing one  |
| `summary_variant`     | Summary is clearly stronger (more specific, better structured) than existing     | Very similar to existing or too tailored to this company        |

The LLM returns **only a JSON array** (no prose), one entry per input candidate.

---

## 3. UI Layout

### 3.1 Page structure

```
┌────────────────────────────────────────────────────────────────────┐
│  🌾 Harvest Improvements                                            │
│  AI-reviewed suggestions for promoting this session's best          │
│  content to your master CV.                                         │
│                                                                     │
│  [  ↻ Re-run AI Analysis  ]   [ Summary: 4 selected / 9 total ]   │
│                                                                     │
│  ── LOADING / READY STATE ─────────────────────────────────────── │
│                                                                     │
│  ▼ 📝 Professional Summary  (1 item)                               │
│    ▼ ✅ Promote  (1)                                               │
│      ▼ 🟢 High confidence  (1)                — DEFAULT EXPANDED  │
│        ┌─ [✓] Summary variant ──────────────────────────────────┐  │
│        │  BEFORE  │  AFTER                                       │  │
│        │  [old]   │  [new ✨]                                    │  │
│        │  Reasoning ▼                                            │  │
│        └───────────────────────────────────────────────────────┘  │
│                                                                     │
│  ▶ 🛠 Skills  (3 items)                        — DEFAULT COLLAPSED │
│  ▶ ✏️ Experience Bullets  (4 items)             — DEFAULT COLLAPSED │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ⚠ This will write to Master_CV_Data.json (irreversible).    │  │
│  │  [ 📥 Apply 4 Selected →  ]   [ Deselect All ]               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Group levels

**Level 1 — Info type header** (always visible, always toggleable)

```
▼ ✏️ Experience Bullets   (3 promote • 1 skip • 4 total)
```

Clicking the header row collapses/expands the entire info-type group.
A brief one-line description appears below the header when expanded.

**Level 2 — Recommendation sub-header** (inside the type group)

```
  ▼ ✅ Promote (3)
  ▶ 🚫 Skip (1)
```

Recommendation sub-headers are collapsible independently.
Default: `✅ Promote` groups expanded when they contain `High` or `Medium` confidence items.
Default: `🚫 Skip` groups always collapsed.

**Level 3 — Confidence tier** (inside a recommendation sub-group)

```
  ▼ 🟢 High confidence (2)    ← default expanded for Promote
  ▼ 🟡 Medium confidence (1)  ← default expanded for Promote
  ▶ 🔴 Low confidence (0)     ← hidden when empty; collapsed for Promote, always collapsed for Skip
```

Items live inside the confidence tier.

### 3.3 Group descriptions

Each info-type group shows a one-liner description when expanded:

| Group                | Description |
|----------------------|-------------|
| Experience Bullets   | Rewritten achievement bullets from the Rewrites step that you approved. Promoting these updates the bullet text in your master CV. |
| Skills               | Skills that are new to your master CV — either proactively added (`🆕 Added`) during the Skills Review or confirmed when asked (`✅ Confirmed`). Promoting adds them to your skills section. |
| Professional Summary | A rewritten version of your professional summary. Promoting stores it as a named variant in your master CV. |

### 3.4 Per-item card

```
┌──────────────────────────────────────────────────────────────────────┐
│  [✓]  Experience Bullet — Google / Senior Data Scientist   [promote] [high] │
│                                                                       │
│  BEFORE (Master CV)              │  AFTER (Proposed)                 │
│  ─────────────────────────────   │  ──────────────────────────────── │
│  Led model deployment            │  Led model deployment, reducing    │
│  initiatives.                    │  inference latency by 40% and      │
│                                  │  saving $2M annually. ✨           │
│                                                                       │
│  ▶ Reasoning                                                          │
└──────────────────────────────────────────────────────────────────────┘
```

**Reasoning panel (collapsed by default):**

```
▼ Reasoning
  Adds a quantified outcome ($2M) and two job-neutral ATS keywords (Python,
  MLOps). The original lacked measurable impact. This applies broadly across
  data science roles, not just this application.
```

**New item (no master CV value):**

```
│  BEFORE (Master CV)              │  AFTER (Proposed)
│  (Not currently in master CV)    │  TensorFlow · Proficient  🆕
```

**Checkbox behaviour:**
- Pre-checked: `promote` + `high` or `medium` confidence
- Pre-unchecked: `promote + low`, all `skip` items
- Checking/unchecking a single item updates the running "X selected" summary in the page header

**Badge colours:**

| Recommendation | Badge colour | Icon |
|----------------|-------------|------|
| promote        | Green        | ✅   |
| skip           | Red-muted    | 🚫   |

| Confidence | Badge colour | Icon |
|------------|-------------|------|
| high       | Green        | 🟢   |
| medium     | Amber        | 🟡   |
| low        | Red          | 🔴   |

---

## 4. Interaction & State Flow

```
Tab opened
    │
    ▼
GET /api/harvest/candidates  ──► 0 candidates? → Empty state ("Nothing to harvest")
    │
    ▼
POST /api/harvest/analyze  (LLM call, shows spinner)
    │
    ├── LLM error → show "Analysis unavailable" banner; fall back to
    │   candidates-only view with no pre-checks and no recommendations
    │
    ▼
Render grouped tree (with pre-checks for promote+high/medium)
    │
    ├── User checks/unchecks items
    ├── User expands/collapses groups
    │
    ▼
Click "Apply Selected →"
    │
    ▼
Confirmation modal:
  "Apply X changes to Master_CV_Data.json?
   This cannot be undone from the app.
   A backup will be written to ~/CV/backups/ first."
    │
    ▼
POST /api/harvest/apply  { selected_ids: [...] }
    │
    ▼
Success panel: "X items written. Backup saved to ~/CV/backups/…"
Apply button → "✅ Applied" (disabled)
```

### 4.1 Loading state

Analysis runs **automatically on tab load** if no cached result exists.
While waiting for `POST /api/harvest/analyze`:

```
🌾 Analyzing X candidates with AI…
[━━━━━━━━░░░░░░░░░░░░]
This takes a few seconds.
```

The analysis result is **cached in `conversation.state['harvest_analysis']`** so revisiting the tab does not re-run the LLM.
A `↻ Re-run AI Analysis` button at the top lets the user force a fresh analysis (clears the cache key first).

### 4.2 Fallback (no LLM analysis)

If the LLM call fails:
- Show all candidates in a flat list (current flat-table design)
- No pre-checks; user must manually select
- Banner: "⚠ AI analysis unavailable — please review and select manually."

### 4.3 Empty state

If no candidates exist:

```
🌾  Nothing to Harvest

Your master CV already reflects the best choices from this session,
or no improvements were produced. Review the Rewrites and Skills steps
if you expected changes here.
```

---

## 5. API Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/harvest/candidates` | Compile candidates from session (existing) |
| `POST` | `/api/harvest/analyze`   | **NEW** — LLM recommendation per candidate |
| `POST` | `/api/harvest/apply`     | Write selected candidates to master (existing) |

### Backup requirement

Before `POST /api/harvest/apply` writes to `Master_CV_Data.json`, the backend must:
1. Copy the current file to `~/CV/backups/Master_CV_Data_<timestamp>.json`
2. Include the backup path in the response so the UI can display it

This is consistent with the CRITICAL data protection rule in `copilot-instructions.md`.

---

## 6. UX Review Notes

### 6.1 Three-level grouping — complexity concern

**Concern:** Three levels of nesting (type → recommendation → confidence) risks visual overload,
particularly when there are only 4–8 candidates. The user could spend more time scanning the
structure than the content.

**Resolution:**
- Empty tiers are hidden (e.g., "Low confidence" row suppressed if zero items).
- When a type group contains only one recommendation tier (e.g., all items are "Promote"),
  the recommendation sub-header is suppressed — the confidence tier becomes level 2.
- The default collapse state means the user sees only the type-level summary on load, with
  `Promote / High` groups auto-opened as the "opinionated recommendation" path.

**Net result:** The common case (a few high-confidence promotions + some skips) renders as 1–3
expanded item cards with the rest hidden behind one click.

### 6.2 Reasoning as expandable panel, not tooltip

Tooltips are unreliable on touch devices and truncate long reasoning.  
An expandable `▶ Reasoning` row (similar to the detail row in the Skills Review table) is preferred.
Reasoning is collapsed by default to preserve reading flow; the user reveals it when they want
to understand a borderline recommendation.

### 6.3 Pre-checked items and confirmation bias

Pre-checking `promote + high` items nudges the user toward the LLM's recommendation.  
This is intentional — the workflow goal is efficiency — but it could cause uncritical promotion
of LLM suggestions.

**Mitigation:**
- The selection count is shown prominently: "4 of 9 selected"
- The confirmation modal names the count and asks explicitly
- The backup note in the modal reinforces that the action modifies persistent data

### 6.4 Before/After layout on small viewports

A two-column before/after layout breaks below ~600 px.

**Resolution:** Stack before/after vertically on small viewports using a responsive CSS rule:

```css
@media (max-width: 600px) {
  .harvest-before-after { flex-direction: column; }
}
```

Before (faded) appears above After (highlighted).

### 6.5 Skill rendering — proposed value is a formatted string

The current `_render_harvest_skill()` returns a formatted string such as
`"TensorFlow · Proficient · [Machine Learning]"`.  
This is human-readable but loses the structured data.

**Resolution:** For the Before/After display, render the raw `name · level · [category]`
string as-is (it is already human-readable). If the user later needs to see the full skill
object, that is accessible via the master CV editor.

### 6.6 LLM latency

The analyze endpoint makes one LLM call. For 8–12 candidates, this typically takes 3–8 seconds.  
A progress spinner with "Analyzing N candidates…" text is sufficient; a per-item streaming
approach would add implementation complexity without meaningful UX benefit at this scale.

The result must be cached in the session so that clicking away and returning to the tab
does not re-run the LLM.

---

## 7. Implementation Roadmap

### Phase A — Core (required for bug fix 2)

1. **`web/harvest.js`** — new module, `populateHarvestTab()` exported
2. **`web/review-table-base.js`** — wire `case 'harvest': await populateHarvestTab()`
3. **`web/src/main.js`** — import and spread `Harvest` onto `globalThis`
4. **`POST /api/harvest/analyze`** — new route in `generation_routes.py`

### Phase B — Backup safety (required before Phase A ships)

5. **`POST /api/harvest/apply`** — add pre-write backup step:  
   Copy `Master_CV_Data.json` → `~/CV/backups/Master_CV_Data_<timestamp>.json`  
   Return `backup_path` in response.

### Phase C — Polish

6. LLM analysis result cache in session state key `harvest_analysis`  
7. "Re-run AI Analysis" button clears cache and re-calls Phase A step 4  
8. Responsive CSS for small viewports  
9. Collapse-state persistence via `sessionStorage` so expand/collapse survives tab switches

### Out of scope for now

- Streaming LLM analysis (overkill at this scale)
- Per-item undo after apply (would require a full audit log; use the backup instead)
- Sorting within a confidence tier

---

## 8. Decisions (Resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Auto-analyze on tab load or on demand? | **Auto** — runs immediately on tab load; cached in `harvest_analysis` session key |
| 2 | `skill_gap_confirmed` separate or merged into Skills? | **Merge with badge** — single Skills group; source shown via `🆕 Added` / `✅ Confirmed` badge per item |
| 3 | Confidence threshold for pre-check | **high + medium** — both tiers pre-checked for promote |
| 4 | "Select All Promotions" bulk action? | **No** — deliberate per-item review |
| 5 | Reasoning collapse granularity | **Per-item** |
| 6 | Default expansion | promote + high/medium → expanded; promote+low and all skip → collapsed |
| 1 | Should the harvest analysis run automatically on tab load, or on demand? | Auto (like spell check) vs. on-demand button | **Auto** — consistent with other AI-driven tabs |
| 2 | Should all pre-checked (promote+high) items be expanded by default, or just the group? | All items expanded vs. group expanded (items inside are individually visible) | **Group expanded, items visible** |
| 3 | Confidence threshold for pre-check: just `high`, or `high + medium`? | high only vs. high+medium | **high only** — reduces accidental promotions |
| 4 | Should the page include a "Select All Promotions" bulk action? | Yes vs. No | **No** — forces deliberate review per item |
| 5 | Should reasoning be collapsed per-item or per-group? | Per-item vs. per-group toggle | **Per-item** — granular control |
| 6 | Should `skill_gap_confirmed` items be treated as "New Skills" visually, or kept separate? | Merge into "New Skills" group vs. separate | **Separate** — different evidence basis |
