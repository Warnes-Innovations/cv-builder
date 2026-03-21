# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

> **Full project reference is in `.github/copilot-instructions.md`** — read that first.
> It contains: commands, architecture, configuration schema, API routes, output formats,
> patterns, gotchas, slash commands, and /obo session management.

## Master Data Contract Maintenance

When app changes modify the `Master_CV_Data.json` structure, update these files in the same change:

- `MASTER_CV_DATA_SPECIFICATION.md`
- `scripts/utils/master_data_validator.py`
- `schemas/master_cv_data.schema.json`
