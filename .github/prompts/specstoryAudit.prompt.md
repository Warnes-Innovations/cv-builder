---
name: specstoryAudit
description: Audit SpecStory transcript history against the current repo and refresh the durable audit output.
argument-hint: Optional focus, transcript subset, or whether to refresh the OBO queue
---
Run the recurring SpecStory history audit workflow for this repository.

1. Start with the normal preflight: identify the applicable sections from `.github/copilot-instructions.md` and the skills you will use.
2. Use the maintained extractor instead of ad hoc scratch code. Run it with the `cvgen` environment:
   `conda run -n cvgen python scripts/extract_specstory_audit.py --output /tmp/specstory_audit_input.json`
3. Read `/tmp/specstory_audit_input.json`, then inspect the relevant `.specstory/history/*.md` transcripts and current repo source/docs to group the sessions into substantive workstreams rather than a flat per-file list.
4. Create or update a dated audit under `tasks/specstory-history-audit-YYYY-MM-DD.md` unless the user requested a different target file.
5. For each substantive workstream, capture:
   - source transcript files
   - transcript evidence such as PRs, commits, or issue references
   - current repo verdict: `Closed`, `Open`, or `Not Auditable Here`
   - remaining work when the item is still open
6. Distinguish transcript-only work from repo-backed backlog by cross-checking current planning docs, tests, git state, and live source files.
7. If the user asks to operationalize the results, convert open items into an OBO session using the OBO tools. Present the current item summary before asking the user to approve, skip, block, or continue.
8. Validate any new or updated maintained artifacts you changed as part of the audit workflow. Do not write to `Master_CV_Data.json` or `publications.bib` during this process.

Keep the final output concise but durable: the audit document should be detailed enough to serve as a backlog checkpoint without rereading the full transcript archive.
