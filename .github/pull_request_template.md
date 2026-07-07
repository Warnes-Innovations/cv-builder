## Summary

<!-- One or two sentences: what does this PR do and why? -->

## Changes

<!-- Bullet list of what changed -->

- 

## Testing

- [ ] All Python tests pass (`python -m pytest tests/ --ignore=tests/ui/ -q --tb=short`)
- [ ] All JS tests pass (`npm run test:js`)
- [ ] JS bundle rebuilt if JS/CSS changed (`npm run build`)
- [ ] No duplicate helper definitions (`npm run lint:duplication`)

## Data-contract checklist

If this PR changes the structure of `Master_CV_Data.json`:

- [ ] `MASTER_CV_DATA_SPECIFICATION.md` updated
- [ ] `scripts/utils/master_data_validator.py` updated
- [ ] `schemas/master_cv_data.schema.json` updated

*(Leave unchecked and strike through if not applicable.)*

## Related gaps / issues

<!-- e.g. Resolves GAP-123 or Fixes #42 -->
