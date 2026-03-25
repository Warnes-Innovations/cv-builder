# CV Builder UI Review

**Related backlog docs:** [tasks/gaps.md](gaps.md), [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)

**GAP-19 cross-reference:** see [GAP-19 in tasks/gaps.md](gaps.md#gap-19-structured-master-cv-editor) for the canonical gap definition and [Phase 16 in IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md#phase-16--master-cv-editor-gap-19) for the active execution plan.

**Date:** 2026-03-25
**Review basis:** refreshed source-verified persona review files dated 2026-03-25, including a terminology/layout refresh against the staged generation contract
**Rollup inputs:** tasks/review-status/applicant.md, tasks/review-status/first-time-user.md, tasks/review-status/returning-user.md, tasks/review-status/power-user.md, tasks/review-status/ux-expert.md, tasks/review-status/accessibility-specialist.md, tasks/review-status/resume-expert.md, tasks/review-status/hiring-manager.md, tasks/review-status/hr-ats.md, tasks/review-status/persuasion-expert.md, tasks/review-status/recruiter-ops.md, tasks/review-status/master-cv-curator.md, tasks/review-status/trust-compliance.md, tasks/review-status/graphical-designer.md

## Summary

The strongest remaining UX problem is no longer missing infrastructure. It is product language. The backend now exposes a staged preview, layout confirmation, and final-generation contract, but the frontend still presents `Generate`, `Generated CV`, `Layout Review`, `File Review`, and `Finalise` as overlapping concepts. Users can reach the right outputs, but the app does not make it immediately clear what artifact they are viewing, whether it is current, or what action comes next.

## Cross-Persona Read

- Strongest implemented area: session-backed preview/layout APIs and final-file generation are real and distinct on the backend.
- Most damaging UX gap: the frontend still collapses those backend stages into unclear labels and a single `Complete Layout Review` action.
- Highest trust gap: the layout freshness spec exists, but the UI does not surface current versus outdated preview or final-file state.
- Highest terminology gap: the product mixes `Customise`, `Customisations`, `customization`, `Layout Review`, `Layout`, `Finalise`, and `Done` across different surfaces for the same workflow.

## Persona Matrix

| Persona | Overall read | Main takeaway |
| ------- | ------------ | ------------- |
| Applicant | ⚠️ Partial | Rewrite review is strong, but staged generation and story-complete master-data maintenance are still incomplete. |
| First-time user | ⚠️ Partial | Workflow is navigable, but onboarding and phase expectations are still under-explained. |
| Returning user | ⚠️ Partial | Session recovery works, but restored-context summaries and change visibility are still weak. |
| Power user | ⚠️ Partial | Multi-session use is viable, but bulk actions and rapid review remain limited. |
| UX expert | ⚠️ Partial | Core shell and review surfaces are real, but preview/versioning and layout-review UX remain unfinished. |
| Accessibility specialist | ⚠️ Partial | Modal focus handling is good; workflow-step semantics and dense review controls still need work. |
| Resume expert | ⚠️ Partial | Publication review and content ordering are meaningful strengths; summary, spell, and evidence semantics are still weak. |
| Hiring manager | ⚠️ Partial | Role relevance and publication curation are credible, but page-one governance and artifact confidence still lag. |
| HR / ATS | ⚠️ Partial | ATS output and validation exist, but score visibility, exact semantics, and hard/soft skill typing are still missing. |
| Persuasion expert | ⚠️ Partial | Rewrite and cover-letter checks are real, but broader narrative consistency is not enforced. |
| Recruiter ops | ⚠️ Partial | Finalise and package handling are usable, but final review remains too path-oriented and not visual enough. |
| Master CV curator | ✅ Strong | Session-only customization and explicit harvest/apply boundaries are implemented correctly. |
| Trust / compliance | ⚠️ Partial | Review provenance is substantial, but re-approval and warning visibility are still incomplete. |
| Graphical designer | ⚠️ Partial | Visual hierarchy is serviceable, but final artifact preview and stronger zoning remain open. |

## Top Gaps

1. **GAP-20:** the user-facing staged `HTML preview -> layout confirmation -> final generation` flow is still not story-complete, even though the APIs exist. See [GAP-20 in tasks/gaps.md](gaps.md#gap-20-staged-html-preview-layout-review-and-final-generation-workflow).
2. **GAP-14:** workflow orientation remains weak because step labels, tab labels, action buttons, and session-phase text describe the same states differently.
3. **GAP-20 plus the layout freshness spec:** preview and final-file staleness are specified but still not implemented in the UI. See [tasks/layout-stale-ui-spec.md](layout-stale-ui-spec.md).
4. **GAP-16:** output review information architecture still makes artifacts harder to trust than they should be because preview and final-file surfaces are named too loosely.
5. **GAP-18 / GAP-02:** rerun and restore context remain too phase-centric and not artifact-centric.
6. **GAP-22:** ATS document semantics still fall short of the stricter story contract. See [GAP-22 in tasks/gaps.md](gaps.md#gap-22-ats-document-structure-and-skill-type-semantics).
7. **GAP-21:** users still do not get a visible ATS score plus keyword-level reasoning model. See [GAP-21 in tasks/gaps.md](gaps.md#gap-21-ats-match-score-and-keyword-visibility).
8. **GAP-19 / GAP-24:** master-data maintenance has a real foundation now, but editing depth, history/review tooling, and final publication rendering still trail the stronger mid-workflow review surfaces. See [GAP-19 in tasks/gaps.md](gaps.md#gap-19-structured-master-cv-editor) and [Phase 16 in IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md#phase-16--master-cv-editor-gap-19).

## Recommended Focus Order

1. Make preview, layout confirmation, final file generation, and finalise visibly separate user actions with one consistent vocabulary across the step bar, tabs, buttons, and session chips.
2. Implement the layout freshness model from tasks/layout-stale-ui-spec.md so users can immediately see when preview or final files are outdated.
3. Surface generation substate in the workflow and restore UI: preview ready, layout confirmed, and final files generated.
4. Rename `Generated CV` and related helper text so preview versus final output is explicit.
5. After stage language is stable, tighten `File Review` and `Finalise` around the same artifact vocabulary.
