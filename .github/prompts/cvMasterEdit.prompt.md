---
mode: agent
description: >
  Master CV data editing workflow via cv-builder MCP.
  Read and update sections of Master_CV_Data.json.
---

# Master CV Data Editing Workflow

Use the **cv-master-editor** agent to drive this workflow.

## Phase requirement

Master data editing is only permitted during `init` or `refinement` phase.

- **Init** (new session, no job submitted): use `session_new()`.
- **Refinement** (after CV generation): load the session that completed generation.

## Read-then-edit pattern

Always read the current section **before** proposing edits:

```
master_data_read(session_id, section="<section>")
```

## Update pattern

```
master_data_update_section(
  session_id = "<id>",
  section    = "<section_name>",
  data       = "<valid JSON string of new section value>"
)
```

## Common editing tasks

| Task | Section | Notes |
|------|---------|-------|
| Update contact info | `contact` | Name, email, phone, LinkedIn |
| Add/edit a job role | `experience` | Preserve all existing fields; add new bullets |
| Add a skill | `skills` | May be list or category dict; preserve existing format |
| Add an achievement | `achievements` | Keep concise, quantified bullets |
| Add a summary variant | `summary_variants` | Key = variant name; value = text |
| Update keywords | `keywords` | Flat list of ATS keyword strings |

## JSON compliance (CRITICAL)

Before calling `master_data_update_section`:
1. Validate your JSON is syntactically correct.
2. Preserve all existing required fields — do not accidentally remove data.
3. For `skills`, preserve the current format (list vs. category dict) unless the
   user explicitly requests a format change.

## Publications

BibTeX publications are stored separately.  Use `publications_read()` to view
the raw BibTeX.  Direct editing of `publications.bib` is handled outside this
workflow (edit the file directly, then restart the session).
