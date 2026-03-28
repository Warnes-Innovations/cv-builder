<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# SpecStory History Audit

**Date:** 2026-03-26 EDT

## Scope

This audit reviews the session transcripts under `.specstory/history`, inventories the main tasks/goals/issues worked in those sessions, and compares the transcript claims with the current workspace state.

Primary source sets used for status decisions:

- `.specstory/history/*.md`
- `IMPLEMENTATION_PLAN.md`
- `tasks/gaps.md`
- `tasks/ui-gap-implementation-plan.md`
- `tasks/current-implemented-workflow.md`
- current source in `scripts/`, `web/`, and `tests/`
- current git state for worktrees and recent commits

Status labels used here:

- `Closed`: implemented or otherwise completed in the current workspace state
- `Open`: not complete, still partially implemented, or still tracked as a live gap
- `Not Auditable Here`: the transcript targeted code or data outside the accessible workspace, or completion depends on user approval/data review rather than repository implementation alone

## Headline Findings

The transcript history is best understood as a set of recurring workstreams rather than 66 unrelated tasks. Most of the major backend foundations are now in place: multi-session support, phase re-entry, staged generation scaffolding, session restore logic, prompt/job-analysis refactors, and the main UI-review documentation set are all present in source.

The largest still-open items are also explicit in the repository today: staged generation UX completion, ATS score visibility, intake confirmation/default reuse, spell-audit consistency, broader workflow UX cleanup, and the Phase 16 Master CV governance/editor backlog.

## Workstream Audit

| Workstream | Source Session Transcripts | Transcript Evidence: PRs / commits / issues | Current Code Verdict | Remaining Work |
| --- | --- | --- | --- | --- |
| Bootstrap, shared instructions, and symlink/setup integration | `2026-02-19_02-06-11Z-applying-user-copilot-instructions.md`, `2026-02-19_15-34-05Z-updating-symlink-script-for-copilot-integration.md` | Transcript goal was to apply Copilot instructions and wire shared prompt/config discovery. Current `vscode-config/README.md` states shared prompts are mirrored and `setup-symlinks.sh` remains as a compatibility wrapper delegating to `setup.sh`. | `Closed` | None for the originally requested integration. Future config work is separate. |
| Manual Master CV data review and correction against `~/CV` | `2026-02-19_02-50-16Z-review-and-correct-master-cv-data-file.md` | Transcript says the work depended on reviewing local CV materials and presenting corrections one-by-one for approval. No repository artifact establishes that the review was fully completed. | `Not Auditable Here` | Completion requires user-approved data review against live files under `~/CV`, not just source inspection. |
| Early customization-table UI polish | `2026-03-10_19-19-54Z-1-configure-both-data.md` | Requested: show all rows, use full width in Customizations tab, sort included skills to the top. | `Open` | The current repo still treats broader workflow UX as incomplete, and the refreshed gap docs keep major customization-shell ergonomics open under `GAP-16`. The transcript does not point to a closing commit or test proving these exact UI requests landed. |
| User-story and planning expansion for going back to earlier stages and UX review coverage | `2026-03-10_19-50-58Z-1-add-user-story.md`, `2026-03-11_20-45-20Z-please-review-the-user.md`, `2026-03-19_16-29-58Z-context-from-my-ide.md` | This stream produced planning and review artifacts rather than production code. The current repo contains refreshed `tasks/ui-review.md`, `tasks/gaps.md`, and an active `IMPLEMENTATION_PLAN.md`. | `Closed` | None for the documentation/planning request itself. The resulting implementation backlog remains open separately. |
| Phase 12 natural-language layout instructions, rewrite-to-layout handoff, and phase re-entry foundation | `2026-03-11_15-59-03Z-continue-and-include-a.md`, `2026-03-11_15-59-23Z-this-session-is-being.md`, `2026-03-11_19-41-19Z-when-refactoring-it-appears.md`, `2026-03-11_20-27-56Z-this-session-is-being.md`, `2026-03-11_20-36-32Z-please-proceed-with-implementing.md` | Transcript references include commits `d9f284b`, `bf26797`, `6c96ea5`. Current code contains `layout_review`, `complete_layout_review()`, `back_to_phase()`, and `re_run_phase()`. | `Open` | The foundation is present, but the repo still tracks `GAP-20` and `GAP-02` as partial. Remaining work is to finish the user-facing staged-generation contract, layout-only refinement UX, changed-item highlighting, and stale/current preview signaling. |
| Spell-check stage introduction and workflow insertion | Primarily the 2026-03-11 continuation stream, plus later workflow docs | Transcript evidence explicitly described the inserted `spell_check` phase and related endpoints. Current workflow docs show `rewrite_review -> spell_check -> generation -> layout_review -> refinement`. | `Open` | `tasks/gaps.md` still marks `GAP-08` partial, and `tasks/ui-gap-implementation-plan.md` reopens spell-audit consistency via GitHub issue `#49`. Remaining work: enforce explicit resolution, keep preview/final spell-audit sources consistent, and prove accepted corrections write back into generated output. |
| Session deletion, restore, startup, coverage, and conversation-history fixes | `2026-03-11_21-25-58Z-this-session-is-being.md`, `2026-03-19_14-06-00Z-this-session-is-being.md`, `2026-03-19_13-43-16Z-when-the-app-starts.md` | Transcript says `start.sh` was created, restore bugs were fixed, `_rewritePanelCache` was populated on restore, and `achievement_edits` was added to `/api/status`. Current repo has `start.sh`, `_rewritePanelCache` in `web/rewrite-review.js`, `loadSessionFile()` in `web/session-manager.js`, and `achievement_edits` in `scripts/routes/status_routes.py`. | `Closed` | The specific restore/startup bugs named in the transcripts appear implemented. Wider workflow UX issues still exist separately. |
| Multi-session architecture and ownership model | `2026-03-19_14-06-00Z-this-session-is-being.md`, `2026-03-20_01-18-26Z-this-session-is-being.md`, `2026-03-18_19-52-07Z.md` | The repo now contains `SessionRegistry`, per-session ownership tokens, and dedicated session routes. Current code exposes `/api/sessions/new`, `/api/sessions/claim`, `/api/sessions/takeover`, and owner-token validation. | `Closed` | The architecture request itself is complete. Open UX around session restore/orientation is captured under `GAP-14`, not the registry implementation. |
| Publications recommendation fixes and overly large follow-up prompt handling | `2026-03-11_20-10-35Z-in-testing-the-web.md` | Requested: confidence/reasoning consistency, publication-table layout fixes, clarity on included vs non-included pubs, and resolution of a 413 token-limit follow-up failure. | `Open` | Publication review foundations exist, but `tasks/gaps.md` still keeps publication end-to-end completion open under `GAP-24`. The transcript does not provide a verified closeout for the 413-path or all UI details. |
| LLM job-analysis refactor, formal title extraction, and use of `nice_to_have_requirements` / `culture_indicators` | `2026-03-18_13-43-32Z-this-session-is-being.md` | Transcript asks for provider-independent prompt logic and better title extraction. Current `scripts/utils/llm_client.py` includes `analyze_job_description()`, explicit recruiter-boilerplate avoidance, and fields for `nice_to_have_requirements` and `culture_indicators`. | `Closed` | The one unresolved transcript question about switching `escapeHtml` to `he.js` was design discussion, not unfinished implementation. |
| `/cvUiReview`, persona review, and source-verified gap documentation | `2026-03-13_18-01-26Z-this-session-is-being.md`, `2026-03-18_18-13-17Z-there-are-currently-multiple.md`, `2026-03-19_16-09-58Z-does-the-cv-ui.md` | Transcript says the review was re-run source-first with sub-agents and assembled into updated review artifacts. Current repo has `tasks/ui-review.md` and the full `tasks/review-status/*.md` set. | `Closed` | None for the review-generation task itself. The findings it produced remain active backlog items. |
| Start-new-session bugs and analysis/loading-state polish | `2026-03-18_16-53-20Z-bugs-start-new-session.md` | Requested: clear job description on new session and show the job-description stage while analysis runs. | `Open` | These are not explicitly closed in the current plan docs, and they fit the still-open intake/workflow issues under `GAP-23` and `GAP-14`. |
| Navigation harmonization across workflow chips, tabs, and buttons | `2026-03-18_18-13-17Z-there-are-currently-multiple.md`, `2026-03-16_17-35-38Z-this-image-shows-the.md`, `2026-03-16_17-55-37Z-when-the-user-completes.md`, `2026-03-16_18-02-30Z-when-the-user-has.md` | Transcript stream focused on flattening/reducing navigation layers and auto-advancing after decisions. | `Open` | `GAP-14` and `GAP-16` remain partial and high priority. Remaining work: simplify the navigation model, align stage/tab terminology, and complete predictable auto-advance and rerun affordances. |
| Worktree cleanup for stale hidden Claude worktrees | `2026-03-19_23-23-52Z-can-we-clean-up.md` | Transcript explicitly removed `agent-a884263a` and `agent-abf1cee8`, then deleted their branches. | `Closed` | That targeted cleanup is complete. The repo still has other active worktrees and `worktree-gh-issues` / `worktree-obo-items` branches, but those belong to later issue-stream work rather than this cleanup task. |
| Busy-status indicator and UI hardening | `2026-03-20_19-21-19Z-summarize-your-analysis-and.md`, recent commit history | Current git log includes PR merge `#66` and recent hardening commits such as `e07befe` and `c46ab30`. | `Closed` | None for the busy-status request referenced by merged PR `#66`. |
| Achievements tab stuck on "Loading achievements..." | `2026-03-20_19-27-14Z-the-achievements-are-not.md` | Transcript investigation began but did not provide a verified fix. Current code still contains the loading path in `web/achievements-review.js`, but there is no matching transcript closeout or issue-closure artifact for this bug. | `Open` | Reproduce and verify the loader completion path in the live UI, then add a regression test once the root cause is fixed. |
| Issue-triage / OBO worktree stream: gh-35, gh-36, merge rescue, and follow-on issue queue | `2026-03-21_02-22-01Z.md`, `2026-03-21_14-15-53Z-continue-the-work-specified.md`, `2026-03-21_14-52-57Z-this-session-is-being.md`, `2026-03-21_17-10-47Z-please-continue-the-work.md`, `2026-03-21_18-03-41Z-continue-this-work-in.md`, `2026-03-21_18-06-53Z-continue-this-work-there.md`, `2026-03-21_18-13-55Z.md` | Transcript explicitly names issue `gh-35`, issue `gh-36`, merge commit `9b74e87`, and continuing OBO work in `worktree-obo-items`. Current code shows the gh-35 years hint in `web/skills-review.js`, but current git state still contains `worktree-gh-issues` and `worktree-obo-items` branches. | `Open` | `gh-35` appears implemented, but the overall workstream is still open. Remaining work: decide whether the leftover worktree branches should be merged or deleted, verify which queued OBO issues remain unresolved, and close out the surviving issue backlog in tracked docs or issues. |
| Authorization and tooling permissions (`grep`, `git *`, OBO MCP availability) | `2026-03-20_22-56-56Z-authorized-grep.md`, `2026-03-21_18-13-55Z.md`, `2026-03-18_13-58-35Z-is-the-onebyone-mcp.md`, `2026-03-18_14-51-28Z-follow-instructions-in-onebyone.md` | Current `vscode-config/mcp.json`, `claude-settings.json`, and `README.md` clearly document `obo-mcp`, `/obo`, and shared prompt/skill setup. | `Closed` | None for the permission/configuration request itself. |
| `plan-mcpOboServer.prompt.md` implementation request | `2026-03-15_00-47-28Z-please-read-and-implemente.md` | The exact prompt file named in the transcript is not present in the current `vscode-config` workspace. The delivered OBO infrastructure exists via `mcp.json`, shared prompts, and skills, but the specific source artifact cannot be inspected now. | `Not Auditable Here` | If needed, locate the historical prompt in git history or another repo snapshot, then compare its requested behavior against the current `obo-mcp` config and shared `/obo` prompt/skill stack. |
| any-llm `copilot_sdk` provider fixes | `2026-03-12_17-59-18Z-this-session-is-being.md` | Transcript targeted another repository (`any-llm`) that is not present in the current workspace. | `Not Auditable Here` | Audit must be done in the `any-llm` repo itself. |

## Repo-Backed Open Backlog Confirmed By Current Source

The following open workstreams are not just transcript leftovers. They are still explicitly open in the repository today:

| Gap / Plan Item | Current Source Confirmation |
| --- | --- |
| `GAP-19` Master CV editor completion | `IMPLEMENTATION_PLAN.md` states Phase 16 remains partially implemented. |
| `GAP-20` staged preview / layout / final generation UX | `tasks/gaps.md` marks it partial; `tasks/ui-gap-implementation-plan.md` still treats the frontend contract as incomplete. |
| `GAP-21` ATS score visibility | `tasks/gaps.md` marks it open. |
| `GAP-22` ATS document semantics and skill typing | `tasks/gaps.md` marks it open. |
| `GAP-23` intake confirmation and clarification defaults | `tasks/gaps.md` marks it open. |
| `GAP-08` spell-check completion and write-back consistency | `tasks/gaps.md` marks it partial; `tasks/ui-gap-implementation-plan.md` reopens issue `#49`. |
| `GAP-14` and `GAP-16` workflow orientation and broader UX cleanup | `tasks/gaps.md` marks both partial and still active. |
| `GAP-24` publication persistence and final rendering | `tasks/gaps.md` marks it open. |

## Administrative And Informational Sessions

These sessions were primarily operational, informational, or command-wrapper interactions rather than durable implementation tasks. They still matter as provenance, but they do not need open/closed code audit treatment beyond the related workstreams above.

| Session Transcript | Notes |
| --- | --- |
| `2026-03-09_23-38-15Z-help.md` | `help` request |
| `2026-03-11_18-19-54Z-please-restart-the-web.md` | operational restart request |
| `2026-03-11_20-40-59Z-pleases-configure-the-vs.md` | test tool/environment configuration request |
| `2026-03-13_17-12-40Z-the-web-ui-now.md` | design/diagnostic question about duplicate progress bars |
| `2026-03-13_18-00-48Z-using-the-information-in.md` | content-generation request from CV data, not app implementation |
| `2026-03-15_01-23-09Z-what-is-the-status.md` | project-status question |
| `2026-03-15_02-52-02Z.md` | `/review` invocation |
| `2026-03-18_14-43-23Z-unknown-skill-obo.md` | local command error transcript |
| `2026-03-19_16-50-17Z-code-review-guidelines-hash.md` | code-review guidance paste |
| `2026-03-20_00-53-21Z-please-review-files-modified.md` | review request feeding later implementation |
| `2026-03-20_20-55-47Z-define-iife-in-this.md` | explanatory question |
| `2026-03-20_20-57-42Z.md` | skill/prompt creation command |
| `2026-03-21_03-50-00Z-review-changed-files-in.md` | review request |
| `2026-03-21_15-01-38Z-what-open-source-software.md` | informational question |

## Session Coverage Map

Every session transcript under `.specstory/history` falls into one of the buckets below.

| Bucket | Session Transcripts |
| --- | --- |
| Bootstrap / setup | `2026-02-19_02-06-11Z-applying-user-copilot-instructions.md`, `2026-02-19_15-34-05Z-updating-symlink-script-for-copilot-integration.md` |
| Manual master-data review | `2026-02-19_02-50-16Z-review-and-correct-master-cv-data-file.md` |
| Early UI polish and planning | `2026-03-10_19-19-54Z-1-configure-both-data.md`, `2026-03-10_19-50-58Z-1-add-user-story.md` |
| Phase 12 / layout / rewrite / spell / re-entry stream | `2026-03-11_15-59-03Z-continue-and-include-a.md`, `2026-03-11_15-59-23Z-this-session-is-being.md`, `2026-03-11_19-41-19Z-when-refactoring-it-appears.md`, `2026-03-11_20-10-35Z-in-testing-the-web.md`, `2026-03-11_20-27-56Z-this-session-is-being.md`, `2026-03-11_20-36-32Z-please-proceed-with-implementing.md`, `2026-03-11_20-45-20Z-please-review-the-user.md`, `2026-03-11_21-25-58Z-this-session-is-being.md` |
| Cross-repo `any-llm` provider stream | `2026-03-12_17-59-18Z-this-session-is-being.md` |
| Session/customization bugfix stream | `2026-03-12_18-36-19Z-i-get-this-erorr.md`, `2026-03-12_18-54-53Z-after-i-answer-clairification.md`, `2026-03-15_01-40-49Z-i-am-testing-the.md`, `2026-03-18_16-53-20Z-bugs-start-new-session.md`, `2026-03-19_13-43-16Z-when-the-app-starts.md`, `2026-03-19_14-06-00Z-this-session-is-being.md`, `2026-03-20_01-18-26Z-this-session-is-being.md` |
| UI review / personas / navigation analysis | `2026-03-13_18-01-26Z-this-session-is-being.md`, `2026-03-16_17-35-38Z-this-image-shows-the.md`, `2026-03-16_17-55-37Z-when-the-user-completes.md`, `2026-03-16_17-59-25Z-the-current-app-uses.md`, `2026-03-16_18-02-30Z-when-the-user-has.md`, `2026-03-18_18-13-17Z-there-are-currently-multiple.md`, `2026-03-19_16-09-58Z-does-the-cv-ui.md`, `2026-03-19_16-29-58Z-context-from-my-ide.md` |
| Prompt engineering / job-analysis refactor | `2026-03-18_13-43-32Z-this-session-is-being.md` |
| OBO availability / OneByOne config stream | `2026-03-18_13-58-35Z-is-the-onebyone-mcp.md`, `2026-03-18_14-43-23Z-unknown-skill-obo.md`, `2026-03-18_14-51-28Z-follow-instructions-in-onebyone.md`, `2026-03-15_00-47-28Z-please-read-and-implemente.md` |
| Multi-session planning stream | `2026-03-18_19-52-07Z.md` |
| Worktree cleanup and misc operational requests | `2026-03-19_23-23-52Z-can-we-clean-up.md`, `2026-03-20_22-56-56Z-authorized-grep.md`, `2026-03-21_18-13-55Z.md` |
| UI gap implementation / worktree merge / OBO issue stream | `2026-03-20_00-53-21Z-please-review-files-modified.md`, `2026-03-20_01-21-23Z-please-proceed-with-the.md`, `2026-03-20_16-46-13Z-you-are-working-in.md`, `2026-03-20_17-08-28Z-this-session-is-being.md`, `2026-03-20_19-21-19Z-summarize-your-analysis-and.md`, `2026-03-20_19-27-14Z-the-achievements-are-not.md`, `2026-03-21_02-22-01Z.md`, `2026-03-21_14-15-53Z-continue-the-work-specified.md`, `2026-03-21_14-52-57Z-this-session-is-being.md`, `2026-03-21_17-10-47Z-please-continue-the-work.md`, `2026-03-21_18-03-41Z-continue-this-work-in.md`, `2026-03-21_18-06-53Z-continue-this-work-there.md` |

## Bottom Line

The repository has already absorbed a large amount of the March session work. The major architectural requests are now real in code. The still-open items are no longer vague transcript remnants; they are active backlog items confirmed by the current plan and gap documents.

The cleanest next step is to treat this audit as a checkpoint and drive the remaining open items from the repo-backed backlog rather than from more transcript archaeology.
