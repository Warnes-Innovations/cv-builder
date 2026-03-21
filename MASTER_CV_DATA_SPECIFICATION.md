# Master_CV_Data.json Specification

**Last Updated:** 2026-03-20 23:40 EDT

**Executive Summary:** This document specifies the effective schema of `Master_CV_Data.json` and the Python contracts that read, normalize, validate, and persist it in this repository. It reflects both the current live file shape and compatibility paths in code (including legacy formats).

## Contents
- [1. Scope and Source of Truth](#1-scope-and-source-of-truth)
- [2. File Location Resolution](#2-file-location-resolution)
- [3. Top-Level Schema](#3-top-level-schema)
- [4. Section Schemas](#4-section-schemas)
- [5. Compatibility and Normalization Rules](#5-compatibility-and-normalization-rules)
- [6. Python Read Contracts](#6-python-read-contracts)
- [7. Python Write Contracts](#7-python-write-contracts)
- [8. Validation Rules Enforced in API Layer](#8-validation-rules-enforced-in-api-layer)
- [9. Persistence and Git Side Effects](#9-persistence-and-git-side-effects)
- [10. Known Gaps and Risks](#10-known-gaps-and-risks)
- [11. Source Citations (Line-Level)](#11-source-citations-line-level)
- [12. Machine-Readable Schema Artifact](#12-machine-readable-schema-artifact)

## 1. Scope and Source of Truth

- Primary source file: `~/CV/Master_CV_Data.json`
- On this machine, `~/CV` is a symlink to Google Drive:
  - `/Users/warnes/CV -> /Users/warnes/Library/CloudStorage/GoogleDrive-greg@warnes.net/My Drive/CV`
- This spec covers:
  - Current observed file structure
  - Effective contract enforced by `scripts/web_app.py`, `scripts/utils/cv_orchestrator.py`, `scripts/utils/llm_client.py`, and `scripts/generate_cv.py`

## 2. File Location Resolution

Master data path is resolved in this precedence order:

1. Environment variable `CV_MASTER_DATA_PATH`
2. `config.yaml` key `data.master_cv`
3. Fallback default `Master_CV_Data.json` in current working directory

Path expansion:

- `~` paths from `config.yaml` are expanded by `Config._expand_paths()`.

## 3. Top-Level Schema

Current observed top-level keys in live data:

- `personal_info` (object)
- `professional_summaries` (object)
- `experience` (array)
- `selected_achievements` (array)
- `skills` (object)
- `education` (array)
- `awards` (array)
- `publications_file` (string)
- `patents_file` (string)

Top-level structural constraints currently enforced before most writes:

- `personal_info` must be object (if present)
- `experience`, `education`, `awards`, `selected_achievements` must be arrays (if present)
- `skills` must be array or object (if present)
- `professional_summaries` must be object or array (if present)

## 4. Section Schemas

### 4.1 `personal_info`

Observed fields:

- `name`: string
- `title`: string
- `contact`: object
- `languages`: array

`personal_info.contact` observed fields:

- `email`: string
- `phone`: string
- `address`: object
- `linkedin`: string
- `website`: string

`personal_info.contact.address` observed fields:

- `street`: string
- `city`: string
- `state`: string
- `zip`: string
- `display`: string

### 4.2 `professional_summaries`

Observed shape:

- Object mapping summary key -> summary text string
- Example keys in current data: `default`, `data_science_leadership`, `biostatistics_ic`, `ml_engineering`

Compatibility:

- Some write code accepts list-form summaries and may coerce list -> dict in some routes.

### 4.3 `experience` (array of objects)

Observed item fields:

- `id`: string
- `comment`: string
- `title`: string
- `company`: string
- `location`: object (`city`, `state`)
- `start_date`: string
- `end_date`: string
- `employment_type`: string
- `tags`: array
- `audience`: array
- `domain_relevance`: array
- `importance`: number
- `achievements`: array

Observed `experience[].achievements[]` object fields:

- `id`: string
- `text`: string
- `keywords`: array
- `metrics`: array
- `tags`: array
- `importance`: number
- `relevant_for`: array

Compatibility:

- Some code accepts either `experience` or legacy `experiences` key.
- Achievement items may be string or object in some code paths.

### 4.4 `selected_achievements` (array of objects)

Observed item fields:

- `id`: string
- `title`: string
- `description`: string
- `keywords`: array
- `metrics`: array
- `importance`: number
- `relevant_for`: array
- `show_for_roles`: array

### 4.5 `skills`

Supported shapes in code:

1. Flat list (legacy):
   - string entries and/or object entries
2. Categorized object (current observed shape):
   - key: category slug
   - value can be:
     - list of skills, or
     - object with:
       - `category`: display name
       - `skills`: list of skills

Current observed shape is categorized object with values as:

- `{ "category": string, "skills": [...] }`

Current observed categories include:

- `core_expertise`
- `scientific_bioinformatics`
- `advanced_modeling`
- `programming_frameworks`
- `infrastructure_cloud`

### 4.6 `education` (array of objects)

Observed item fields:

- `degree`: string
- `field`: string
- `institution`: string
- `location`: object (`city`, `state`)
- `start_year`: number
- `end_year`: number
- `relevant_for`: array

### 4.7 `awards` (array of objects)

Observed item fields:

- `title`: string
- `year`: number
- `description`: string
- `relevant_for`: array

### 4.8 Additional top-level file references

- `publications_file`: string
- `patents_file`: string

These are not currently included in the editable payload returned by `/api/master-data/full`.

## 5. Compatibility and Normalization Rules

### 5.1 Experience key compatibility

- Read and write paths commonly prefer `experience`.
- Some routes tolerate legacy `experiences` and normalize to `experience` on save.

### 5.2 Skills compatibility

- Core logic reads both list and dict forms.
- Dict form supports either list values or object values with nested `skills` list.
- Selection logic often normalizes to skill objects with at least `name`.

### 5.3 Professional summaries compatibility

- Most modern reads expect dict form.
- Some routes accept list form and coerce to dict for updates.
- Harvest apply may write back as list, depending on existing value.

## 6. Python Read Contracts

### 6.1 Configuration and loading

- `scripts/utils/config.py`
  - `Config.master_cv_path` resolves path with env override support.
- `scripts/utils/cv_orchestrator.py`
  - `_load_master_data()` loads JSON on orchestrator initialization.

### 6.2 Web/API read usage

- `scripts/web_app.py`
  - `/api/master-fields` re-reads from disk and returns:
    - `selected_achievements`
    - `professional_summaries`
    - `experiences`
  - `/api/master-data/overview` computes counts and profile summary.
  - `/api/master-data/full` returns editable sections for UI.

### 6.3 Selection and generation reads

- `scripts/utils/cv_orchestrator.py`
  - Reads `experience`, `selected_achievements`, `skills`, `professional_summaries`, `education`, `awards`, `personal_info`.
  - Flattens and normalizes skills from both list/dict formats.
  - Applies summary overlay rules with session summaries.
- `scripts/utils/llm_client.py`
  - Builds prompts from `experience`, `selected_achievements`, `skills`, `personal_info`.
- `scripts/generate_cv.py` (legacy path)
  - Reads master data directly and assumes certain list/object forms.

## 7. Python Write Contracts

### 7.1 Master-data editor endpoints (`scripts/web_app.py`)

Routes writing to master data:

- `/api/master-data/update-achievement`
- `/api/master-data/update-summary`
- `/api/master-data/personal-info`
- `/api/master-data/experience`
- `/api/master-data/skill`
- `/api/master-data/education`
- `/api/master-data/award`

These routes use helper functions:

- `_load_master(master_data_path)`
- `_save_master(master, master_path)`

### 7.2 Harvest write-back route

- `/api/harvest/apply`
  - Applies selected candidates:
    - improved bullets
    - new skills / confirmed skill gaps
    - summary variant
  - Uses helper functions:
    - `_harvest_apply_bullet`
    - `_harvest_add_skill`
    - `_harvest_add_summary_variant`

Important behavioral difference:

- This route currently writes JSON directly with `json.dump(...)` instead of `_save_master(...)`.

## 8. Validation Rules Enforced in API Layer

Examples of input validation from master-data routes:

- Achievement:
  - `id` required
  - `importance` integer 1..10
  - `relevant_for` list of strings (or comma-separated string converted to list)
- Summary:
  - `key` required
  - `text` required unless deleting
- Personal info:
  - email must contain `@`
  - `linkedin` and `website` must start with `http://` or `https://`
- Experience:
  - `action` in `add|update|delete`
  - title and company required for add/update
  - `importance` integer 1..10
  - `employment_type` in allowed set
  - extracted start/end year must be chronological
- Education:
  - year bounds 1900..2100
  - chronological year checks
  - index bounds checks for update/delete
- Award:
  - year bounds 1900..2100
  - index bounds checks for update/delete
- Global persistence guard:
  - `_validate_master_for_persistence(...)` enforces top-level shape constraints

## 9. Persistence and Git Side Effects

### 9.1 `_save_master(...)` behavior

For routes using `_save_master(...)`:

1. Validate top-level structure
2. Create timestamped backup in sibling `backups/` directory (when target exists)
3. Write JSON with indent=2
4. Run git add for the master file in its containing repo/folder

### 9.2 `/api/harvest/apply` behavior

For harvest apply route:

1. Loads master from disk
2. Applies selected candidate mutations
3. Writes JSON directly (indent=2)
4. Reloads in-memory orchestrator copy
5. Attempts `git add` + `git commit` in project repo

This route does not currently use `_save_master(...)` backup + validation flow.

## 10. Known Gaps and Risks

1. Dual summary representation: object and list are both accepted in different paths, which can cause shape drift.
2. Harvest path bypasses `_save_master(...)`, so backup creation and pre-write schema validation are not consistently applied.
3. Legacy key compatibility (`experiences` vs `experience`) remains necessary but increases contract complexity.
4. `scripts/generate_cv.py` follows older assumptions and may diverge from web app semantics.

## 11. Source Citations (Line-Level)

### 11.1 Config and path resolution

- `scripts/utils/config.py:50-57` (`~` expansion for `data.master_cv`, `data.publications`, `data.output_dir`)
- `scripts/utils/config.py:97-99` (`CV_MASTER_DATA_PATH` override, then `data.master_cv`, then default)

### 11.2 Core master data load and consumption

- `scripts/utils/cv_orchestrator.py:65-74` (`_load_master_data` reads `Master_CV_Data.json`)
- `scripts/utils/cv_orchestrator.py:1632-1656` (`experience`, `selected_achievements`, and `skills` list/dict normalization)
- `scripts/utils/cv_orchestrator.py:1921-1925` (summary overlay: master + session summaries)
- `scripts/utils/cv_orchestrator.py:1944-1953` (selected content assembled from master sections)
- `scripts/utils/llm_client.py:524-558` (`personal_info`, `experience`, and `skills` data consumed for summary prompts)
- `scripts/generate_cv.py:31-34` (legacy direct JSON load)
- `scripts/generate_cv.py:68-78` (legacy summary and experience assumptions)
- `scripts/generate_cv.py:109-127` (legacy skills and selected achievements assumptions)

### 11.3 Master-data API reads and editor payloads

- `scripts/web_app.py:827-855` (`/api/master-data/overview` count logic and profile projection)
- `scripts/web_app.py:962-978` (`/api/master-data/full` editable payload and legacy `experiences` fallback)

### 11.4 Master-data API writes and validation

- `scripts/web_app.py:859-919` (`/api/master-data/update-achievement` validation + upsert/delete)
- `scripts/web_app.py:921-960` (`/api/master-data/update-summary`, including list->dict coercion)
- `scripts/web_app.py:982-1022` (`/api/master-data/personal-info` validation + nested contact/address updates)
- `scripts/web_app.py:1024-1129` (`/api/master-data/experience` validation, `experiences` normalization, add/update/delete)
- `scripts/web_app.py:1131-1242` (`/api/master-data/skill` list/dict compatibility and category operations)
- `scripts/web_app.py:1244-1325` (`/api/master-data/education` year/index validation and persistence)
- `scripts/web_app.py:1327-1385` (`/api/master-data/award` year/index validation and persistence)

### 11.5 Persistence guards and side effects

- `scripts/web_app.py:5518-5522` (`_load_master`)
- `scripts/web_app.py:5536-5557` (`_validate_master_for_persistence` top-level shape checks)
- `scripts/web_app.py:5560-5579` (`_save_master`: validate, backup, write, git add)

### 11.6 Harvest-specific write path differences

- `scripts/web_app.py:5307-5319` (`/api/harvest/apply` route)
- `scripts/web_app.py:5334-5371` (harvest loads and directly writes JSON)
- `scripts/web_app.py:5376-5381` (harvest commit message setup)
- `scripts/web_app.py:5666-5683` (`_harvest_apply_bullet`: supports `experience` and `experiences`, bullet string/object)
- `scripts/web_app.py:5686-5713` (`_harvest_add_skill`: list/dict handling and `Other` fallback)

### 11.7 Observed live data shape (current file snapshot)

- `~/CV/Master_CV_Data.json:2,24,31,558,611,933,973,988,989` (top-level keys in current file)
- `~/CV/Master_CV_Data.json:5,8,18` (`personal_info.contact.address` and `languages`)
- `~/CV/Master_CV_Data.json:40,43,45` (`experience` entries with `employment_type`, `domain_relevance`, `achievements`)
- `~/CV/Master_CV_Data.json:566,567` (`selected_achievements` fields including `show_for_roles`)
- `~/CV/Master_CV_Data.json:613,614,667,668` (`skills` category object shape with nested `skills` list)

## 12. Machine-Readable Schema Artifact

The companion JSON Schema draft is stored at:

- `schemas/master_cv_data.schema.json`

This schema encodes the compatibility rules described in this document, including:

- `skills` as either list or categorized object
- `professional_summaries` as object or legacy list
- `experience` plus legacy `experiences`
- flexible string-or-object forms for multiple nested list fields
