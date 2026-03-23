# CV Builder UI Review

**Date:** 2026-03-23
**Review basis:** refreshed source-verified persona review files dated 2026-03-23
**Rollup inputs:** tasks/review-status/applicant.md, tasks/review-status/first-time-user.md, tasks/review-status/returning-user.md, tasks/review-status/power-user.md, tasks/review-status/ux-expert.md, tasks/review-status/accessibility-specialist.md, tasks/review-status/resume-expert.md, tasks/review-status/hiring-manager.md, tasks/review-status/hr-ats.md, tasks/review-status/persuasion-expert.md, tasks/review-status/recruiter-ops.md, tasks/review-status/master-cv-curator.md, tasks/review-status/trust-compliance.md, tasks/review-status/graphical-designer.md

## Summary

The refreshed 14-persona set confirms that the product is materially further along than the older normalized snapshots suggested. Core workflow state, rewrite review, publication curation, cover-letter scaffolding, ATS artifact generation, session recovery, finalise/archive, and master-data governance boundaries are all real. The main problem is no longer total absence of capability; it is story-completeness. Several high-value surfaces stop one stage short of the behavior the stories promise.

## Cross-Persona Read

- Strongest implemented areas: rewrite approval and audit capture, publication triage, session-vs-master governance, cover-letter validation, finalise/archive scaffolding, and ATS artifact generation plus validation.
- Most consistent partials across personas: workflow orientation, analysis/clarification UX, review ergonomics, accessibility coverage, rerun/re-entry, and recruiter-facing package readiness.
- Largest remaining holes: staged `HTML preview -> layout review -> final generation`, ATS score visibility plus skill semantics, intake confirmation/default reuse, spell-check write-back, and richer final artifact preview.

## Persona Matrix

| Persona | Overall read | Main takeaway |
| ------- | ------------ | ------------- |
| Applicant | ⚠️ Partial | Rewrite review is strong, but staged generation and master-data maintenance are still incomplete. |
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

1. **GAP-20:** staged `HTML preview -> layout review -> final generation` is still not story-complete.
2. **GAP-22:** ATS document semantics still fall short of the stricter story contract.
3. **GAP-23:** job-intake confirmation and clarification defaults are still missing.
4. **GAP-21:** users still do not get a visible ATS score plus keyword-level reasoning model.
5. **GAP-08:** spell review exists, but accepted corrections are not yet a dependable last-mile write-back path.
6. **GAP-18 / GAP-02:** rerun and re-entry exist, but not with the clarity and completeness the stories require.
7. **GAP-16 / GAP-15:** dense review ergonomics, responsive behavior, and full keyboard/accessibility coverage remain open.
8. **GAP-19 / GAP-24:** master-data editing depth and final publication rendering still trail the stronger mid-workflow review surfaces.

## Recommended Focus Order

1. Finish the staged generation contract so preview, layout iteration, and final generation are distinct and dependable.
2. Tighten ATS semantics, scoring visibility, and skill classification so the generated outputs match the HR/ATS stories.
3. Add intake confirmation, default reuse, and stronger rerun context so the workflow is dependable for both first-time and returning users.
4. Complete spell-check write-back and richer artifact review so the last-mile quality gate is trustworthy.
5. Improve review ergonomics, accessibility, and visual preview once the workflow contract is stable.
