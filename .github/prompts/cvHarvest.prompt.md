---
mode: agent
description: >
  Harvest workflow: after generating a CV, apply AI-generated improvements
  back to Master_CV_Data.json (bullets, skills, summary variants).
---

# Harvest Workflow

After a CV generation cycle, useful improvements discovered by the AI can be
permanently harvested back into `Master_CV_Data.json`.

## Prerequisites

- An existing session in `refinement` phase (CV has been generated).
- User has reviewed and approved which harvested items to accept.

## What can be harvested

| Item type | Source state key | Target master section |
|-----------|------------------|-----------------------|
| Improved bullets | `accepted_rewrites` | `experience[*].bullets` |
| New skills | `extra_skills` | `skills` |
| Summary variant | `session_summaries.ai_recommended` | `summary_variants` |
| New keywords | Job analysis keywords | `keywords` |

## Harvest workflow steps

### 1. Load session in refinement phase

```
session_load(session_file=<path>)
session_status(session_id=<id>)  →  confirm phase == "refinement"
```

### 2. Review approved rewrites

```
get_pending_rewrites(session_id)  →  review list of approved rewrites
```

Present to user for final confirmation before writing to master.

### 3. Read current master sections

```
master_data_read(session_id, section="experience")
master_data_read(session_id, section="skills")
master_data_read(session_id, section="summary_variants")
```

### 4. Merge and update each section

For each approved improvement:
1. Merge the change into the existing section data (in memory).
2. Validate the merged JSON.
3. Call `master_data_update_section(session_id, section, data=<merged json>)`.

### 5. Confirm

```
master_data_read(session_id, section=<updated section>)
```

Verify the update was applied correctly.

## Harvest guardrails

- **Never overwrite** existing bullets without explicit user confirmation.
- **Additive only** by default: append new skills, add new summary variants.
- **Destructive changes** (removing a skill, removing a bullet) require explicit
  user request AND confirmation.
