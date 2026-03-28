<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# SpecStory History Audit

**Updated:** 2026-03-27 14:18 EDT

**Executive Summary:** This refresh re-audits the 66 transcript sessions under `.specstory/history` against the current `cv-builder` workspace and current planning documents. The repo still shows a clear split between shipped architectural foundations and a smaller set of user-facing workflow gaps that remain actively open, especially staged generation, ATS visibility, intake confirmation, spell-audit consistency, and publication/output completion.

## Contents

- [Scope](#scope)
- [Headline Findings](#headline-findings)
- [Workstream Audit](#workstream-audit)
- [Repo-Backed Open Backlog](#repo-backed-open-backlog)
- [Administrative And Informational Sessions](#administrative-and-informational-sessions)
- [Bottom Line](#bottom-line)

## Scope

This audit reviews the session transcripts under `.specstory/history`, groups them into substantive workstreams, and compares transcript claims with the current workspace state.

Primary source sets used for status decisions:

- `.specstory/history/*.md`
- `/tmp/specstory_audit_input.json` regenerated on 2026-03-27 via `scripts/extract_specstory_audit.py`
- `IMPLEMENTATION_PLAN.md`
- `tasks/gaps.md`
- `tasks/ui-gap-implementation-plan.md`
- current source in `scripts/`, `web/`, and `tests/`
- current git worktree state

Status labels used here:

- `Closed`: implemented or otherwise completed in the current workspace state
- `Open`: not complete, still partially implemented, or still tracked as a live gap
- `Not Auditable Here`: the transcript targeted code or data outside the accessible workspace, or completion depends on user approval or external data review rather than repository implementation alone

## Headline Findings

The transcript history still reads best as a set of recurring workstreams rather than 66 isolated sessions. The strongest shipped foundations remain real in the repository today: multi-session infrastructure, phase re-entry scaffolding, layout-review plumbing, prompt and job-analysis refactors, session restore logic, and the source-backed UI review and gap-analysis corpus.

The remaining open work is now concentrated and repo-backed rather than speculative. Current planning artifacts still explicitly keep staged generation UX, ATS score visibility, ATS document semantics, intake confirmation, spell-audit consistency, workflow orientation, publication persistence, and Master CV completion on the backlog.

This refresh now changes three interpretations from the 2026-03-26 checkpoint:

- The spell-check workstream remains open, but no longer because preview still reads the wrong state key. Current code already prefers canonical `state['spell_audit']` for preview generation, and final generation uses the confirmed preview artifact. The remaining gap is broader end-to-end write-back proof and coverage.
- The issue-triage and worktree stream should not be treated as open merely because worktrees exist. The current repo does show active salvage worktrees, but the open verdict is warranted by ongoing issue-driven backlog and active salvage branches, not by worktree existence alone.
- The stale `BUG-SpellAuditPreviewMismatch` planning note has now been corrected to match the code and regression coverage.

Finally, the recurring SpecStory audit workflow itself is now a maintained repo capability: the extractor, tests, and repo-local prompt all exist and are usable, so transcript archaeology has been partially operationalized.

## Workstream Audit

| Workstream | Source Session Transcripts | Transcript Evidence: PRs / commits / issues | Current Repo Verdict | Remaining Work |
| --- | --- | --- | --- | --- |
| Bootstrap, shared instructions, and symlink/setup integration | `2026-02-19_02-06-11Z-applying-user-copilot-instructions.md`, `2026-02-19_15-34-05Z-updating-symlink-script-for-copilot-integration.md` | Transcript goal was to apply Copilot instructions and wire shared prompt/config discovery. Current repo and shared config still expose the linked prompt and setup flow. | `Closed` | None for the original integration request. |
| Manual Master CV data review and correction against `~/CV` | `2026-02-19_02-50-16Z-review-and-correct-master-cv-data-file.md` | Transcript depended on reviewing live CV materials and presenting corrections one-by-one for approval. | `Not Auditable Here` | Completion still depends on user-approved data review against live files under `~/CV`. |
| Early customization-table UI polish | `2026-03-10_19-19-54Z-1-configure-both-data.md` | Requested: show all rows, use full width in the Customizations tab, and sort included skills to the top. | `Open` | The broader customization-shell ergonomics remain incomplete under current workflow and UX gaps. No current source or tracked validation proves these exact requests are fully closed. |
| User-story and planning expansion for stage re-entry and UX review coverage | `2026-03-10_19-50-58Z-1-add-user-story.md`, `2026-03-11_20-45-20Z-please-review-the-user.md`, `2026-03-19_16-29-58Z-context-from-my-ide.md` | This stream produced planning and review artifacts rather than direct product code. Current repo still contains refreshed `tasks/ui-review.md`, `tasks/gaps.md`, and an active `IMPLEMENTATION_PLAN.md`. | `Closed` | None for the planning and review request itself. The resulting backlog remains open separately. |
| Phase 12 natural-language layout instructions, rewrite-to-layout handoff, and phase re-entry foundation | `2026-03-11_15-59-03Z-continue-and-include-a.md`, `2026-03-11_15-59-23Z-this-session-is-being.md`, `2026-03-11_19-41-19Z-when-refactoring-it-appears.md`, `2026-03-11_20-27-56Z-this-session-is-being.md`, `2026-03-11_20-36-32Z-please-proceed-with-implementing.md` | Transcript references include commits such as `d9f284b`, `bf26797`, and `6c96ea5`. Current code still exposes layout review and re-entry primitives. | `Open` | The foundation is real, but `GAP-20`, `GAP-02`, and `GAP-18` remain partially open. Remaining work is the user-facing staged-generation contract, layout-only refinement UX, changed-item highlighting, and stale/current preview signaling. |
| Spell-check stage introduction and workflow insertion | Primarily the 2026-03-11 continuation stream, plus later workflow docs | Transcript evidence described a dedicated `spell_check` phase and related endpoints. Current workflow docs still place spell check in the main path. | `Open` | `GAP-08` remains partial, but the canonical preview/final spell-audit state flow is already implemented. Remaining work is broader end-to-end write-back proof, stronger coverage across more content shapes, and any remaining quality-gate behavior beyond the canonical preview/final path. |
| Session deletion, restore, startup, coverage, and conversation-history fixes | `2026-03-11_21-25-58Z-this-session-is-being.md`, `2026-03-19_14-06-00Z-this-session-is-being.md`, `2026-03-19_13-43-16Z-when-the-app-starts.md` | Transcripts described `start.sh`, restore fixes, rewrite-panel restore state, and `achievement_edits` status coverage. Current source still contains those artifacts and paths. | `Closed` | The specific restore and startup fixes named in the transcripts appear implemented. |
| Multi-session architecture and ownership model | `2026-03-19_14-06-00Z-this-session-is-being.md`, `2026-03-20_01-18-26Z-this-session-is-being.md`, `2026-03-18_19-52-07Z.md` | Current repo contains `SessionRegistry`, owner tokens, and dedicated session routes. | `Closed` | The architecture request itself is complete. Remaining UX around restore and orientation is tracked separately under workflow gaps, not as missing session infrastructure. |
| Publications recommendation fixes and end-to-end publication handling | `2026-03-11_20-10-35Z-in-testing-the-web.md` | Transcript requested publication-table layout fixes, confidence/reasoning consistency, included-vs-excluded clarity, and recovery from overlarge prompt paths. | `Open` | Publication review foundations exist, but `GAP-24` remains open. Remaining work is persistence, omission rules when nothing is selected, final rendering details, and validation of first-author and metadata behavior. |
| LLM job-analysis refactor, formal title extraction, and use of `nice_to_have_requirements` and `culture_indicators` | `2026-03-18_13-43-32Z-this-session-is-being.md` | Transcript asked for provider-independent prompt logic and better title extraction. Current `scripts/utils/llm_client.py` still contains the refactored analysis surface and richer fields. | `Closed` | None for the core refactor request. |
| `/cvUiReview`, persona review, and source-verified gap documentation | `2026-03-13_18-01-26Z-this-session-is-being.md`, `2026-03-18_18-13-17Z-there-are-currently-multiple.md`, `2026-03-19_16-09-58Z-does-the-cv-ui.md` | Transcript described source-first review runs and refreshed review artifacts. Current repo still contains `tasks/ui-review.md` and `tasks/review-status/*.md`. | `Closed` | None for the review-generation request itself. The findings remain active backlog items. |
| Start-new-session bugs and intake/loading-state polish | `2026-03-18_16-53-20Z-bugs-start-new-session.md` | Requested: clear job description on new session and show the job-description stage while analysis runs. | `Open` | These still align with the open intake and orientation backlog under `GAP-23` and `GAP-14`. |
| Navigation harmonization across workflow chips, tabs, and buttons | `2026-03-18_18-13-17Z-there-are-currently-multiple.md`, `2026-03-16_17-35-38Z-this-image-shows-the.md`, `2026-03-16_17-55-37Z-when-the-user-completes.md`, `2026-03-16_18-02-30Z-when-the-user-has.md` | Transcript stream focused on reducing navigation layers and improving automatic workflow progression. | `Open` | `GAP-14` and `GAP-16` remain partial and high priority. Remaining work is simpler navigation, aligned terminology, and more predictable rerun and auto-advance affordances. |
| Worktree cleanup for stale hidden Claude worktrees | `2026-03-19_23-23-52Z-can-we-clean-up.md` | Transcript explicitly removed `agent-a884263a` and `agent-abf1cee8` and deleted their branches. | `Closed` | That targeted cleanup is complete. Current salvage worktrees are separate later work and do not reopen this historical cleanup task. |
| Busy-status indicator and UI hardening | `2026-03-20_19-21-19Z-summarize-your-analysis-and.md` and related commits | Current repo history and source still reflect the busy-status and UI hardening workstream. | `Closed` | None for the originally referenced request. |
| Achievements tab stuck on `Loading achievements...` | `2026-03-20_19-27-14Z-the-achievements-are-not.md` | Transcript investigation began, but the session did not provide a verified closeout. | `Open` | Reproduce and verify the loader completion path in the live UI, then add a regression test when the root cause is fixed. |
| Issue-driven salvage and worktree follow-on stream | `2026-03-21_02-22-01Z.md`, `2026-03-21_14-15-53Z-continue-the-work-specified.md`, `2026-03-21_14-52-57Z-this-session-is-being.md`, `2026-03-21_17-10-47Z-please-continue-the-work.md`, `2026-03-21_18-03-41Z-continue-this-work-in.md`, `2026-03-21_18-06-53Z-continue-this-work-there.md`, `2026-03-21_18-13-55Z.md` | Transcript explicitly names `gh-35`, `gh-36`, merge rescue, and follow-on work. Current git worktree state still shows active salvage issue61-related worktrees: `salvage/ats-skills-title-wip-20260326`, `salvage/hide-only-bullets-wip-20260326`, `salvage/issue61-layout-wip-20260326`, and `salvage/copilot-update-skills-header-title-wip-20260326`. | `Open` | `gh-35`-style fixes appear to have landed, but the follow-on issue stream is still active. Remaining work is to merge, close, or retire the surviving issue-driven branches based on issue-backed backlog rather than using worktree existence alone as the closure test. |
| Authorization and tooling permissions | `2026-03-20_22-56-56Z-authorized-grep.md`, `2026-03-21_18-13-55Z.md`, `2026-03-18_13-58-35Z-is-the-onebyone-mcp.md`, `2026-03-18_14-51-28Z-follow-instructions-in-onebyone.md` | Current shared config and prompt stack still document OBO and tool authorization setup. | `Closed` | None for the underlying permissions and tooling request itself. |
| `plan-mcpOboServer.prompt.md` implementation request | `2026-03-15_00-47-28Z-please-read-and-implemente.md` | The exact prompt file named in the transcript is still not present in the current workspace snapshot. | `Not Auditable Here` | If needed, audit this via git history or another repo snapshot that includes the source prompt. |
| any-llm `copilot_sdk` provider fixes | `2026-03-12_17-59-18Z-this-session-is-being.md` | Transcript targeted another repository not present in this workspace. | `Not Auditable Here` | Audit must be done in the `any-llm` repository itself. |
| Recurring SpecStory audit workflow operationalization | `2026-03-26_...` follow-on work summarized in the current repo state and prompt set | Current repo now includes the maintained extractor `scripts/extract_specstory_audit.py`, focused tests, and a repo-local `.github/prompts/specstoryAudit.prompt.md`. | `Closed` | The workflow exists and is usable. Future work is to keep the dated audit output refreshed, not to re-invent the audit machinery. |

## Repo-Backed Open Backlog

The following open workstreams are explicitly confirmed by current planning docs and source, not just by transcript history:

| Gap / Plan Item | Current Source Confirmation |
| --- | --- |
| `GAP-19` Master CV editor completion | `IMPLEMENTATION_PLAN.md` still states Phase 16 is only partially implemented. |
| `GAP-20` staged preview, layout review, and final generation UX | `tasks/gaps.md` marks it partial, and `tasks/ui-gap-implementation-plan.md` still treats the frontend contract as incomplete. |
| `GAP-21` ATS match score visibility | `tasks/gaps.md` still marks it open. |
| `GAP-22` ATS document semantics and skill typing | `tasks/gaps.md` still marks it open. |
| `GAP-23` intake confirmation and clarification defaults | `tasks/gaps.md` still marks it open. |
| `GAP-08` spell-check completion and write-back consistency | `tasks/gaps.md` still marks it partial. |
| Spell-check end-to-end write-back proof | `tasks/gaps.md` still marks `GAP-08` partial, and the refreshed plan now treats the remaining work as stronger coverage and broader write-back proof rather than a live canonical-state mismatch. |
| `GAP-14` and `GAP-16` workflow orientation and broader UX cleanup | `tasks/gaps.md` still marks both partial and active. |
| `GAP-24` publication persistence and final rendering | `tasks/gaps.md` still marks it open. |

These open items should now be driven primarily from the maintained plan and gap documents, not from repeated transcript archaeology.

## Administrative And Informational Sessions

These sessions were primarily operational, informational, or command-wrapper interactions rather than durable implementation tasks. They remain useful provenance, but they do not need separate open or closed code-audit treatment beyond the workstreams above.

| Session Transcript | Notes |
| --- | --- |
| `2026-03-09_23-38-15Z-help.md` | `help` request |
| `2026-03-11_18-19-54Z-please-restart-the-web.md` | operational restart request |
| `2026-03-11_20-40-59Z-pleases-configure-the-vs.md` | test-tool and environment configuration request |
| `2026-03-13_17-12-40Z-the-web-ui-now.md` | design and diagnostic question about duplicate progress bars |
| `2026-03-13_18-00-48Z-using-the-information-in.md` | content-generation request from CV data rather than app implementation |
| `2026-03-15_01-23-09Z-what-is-the-status.md` | project-status question |
| `2026-03-15_02-52-02Z.md` | review invocation |
| `2026-03-18_14-43-23Z-unknown-skill-obo.md` | local command error transcript |
| `2026-03-19_16-50-17Z-code-review-guidelines-hash.md` | code-review guidance paste |
| `2026-03-20_00-53-21Z-please-review-files-modified.md` | review request feeding later implementation |
| `2026-03-20_20-55-47Z-define-iife-in-this.md` | explanatory question |
| `2026-03-20_20-57-42Z.md` | skill and prompt creation command |
| `2026-03-21_03-50-00Z-review-changed-files-in.md` | review request |
| `2026-03-21_15-01-38Z-what-open-source-software.md` | informational question |

## Bottom Line

The repository has already absorbed a large amount of the March transcript work, and the main architectural requests are now real in code. The still-open items are no longer vague session remnants; they are current backlog items confirmed by the maintained gap and implementation documents.

The repo is now in a better position than it was on 2026-03-26 because the audit process itself has been operationalized. The cleanest next step is to use this dated audit as a checkpoint and drive the remaining open work from repo-backed backlog items and active issue streams rather than from more transcript archaeology.
