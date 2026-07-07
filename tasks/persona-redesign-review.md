<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV Builder UI Redesign — Persona Review

**Design doc reviewed:** [tasks/ui-redesign-proposal.md](ui-redesign-proposal.md)
**Original review date:** 2026-06-13
**Updated:** 2026-06-15 — reflects revised proposal post Theme 1–5 resolution and three targeted design changes:
  - **(A)** Undo history now stored in session JSON file (persists across browser sessions), 2 MB cap, 80% amber warning, FIFO eviction + toast at 100% — §17
  - **(B)** Page count badge thresholds driven by user-configured position-style target (not fixed values) — §5
  - **(C)** Position target style presets (industry, academic, medical_clinical, government, industry_research) with per-preset publication handling fields — GH #126

**Personas:** 14 (all active personas)
**Related:** [tasks/gaps.md](gaps.md), [tasks/ui-review.md](ui-review.md), [GH #126](https://github.com/Warnes-Innovations/cv-builder/issues/126)

---

## Applicant

### What the proposed design gets right

- **Live context preservation** — Seeing the CV rendered throughout the workflow (not just at Layout Review) closes the gap between editing suggestions in isolation and understanding their impact on the actual document.
- **Inline decision-making** — Element hover toolbars with accept/reject/edit buttons eliminate the mental context-switching burden of jumping between a Rewrite Review tab and the final output. Focus-triggered controls (Theme 1) make these accessible to keyboard users and discoverable for all users.
- **Ghost elements and inclusion visibility** — Excluded items shown inline with strikethrough and reduced opacity make it clear what's *not* going into the CV during customisation.
- **Embedded clarification questions** — Questions paired with the analysis data they relate to, rather than buried in conversation history, is a major usability win.
- **Always-available Master CV tab** — Updating baseline data at any moment rather than being forced to wait until the end of a session removes a significant workflow friction.
- **Consistent section/element expansion model** — The two-state collapse/expand pattern is predictable and reduces overwhelm when facing 20+ experience bullets or 30+ skills.
- **(A) Persistent undo across browser sessions** — The undo stack now survives browser closes/reopens by storing to the session JSON file, eliminating the frustration of losing edit history when switching workstations or resuming a session the next day.

### Concerns or regressions vs current design

- **Performance and interactivity risk** — Real-time rendering of the full CV with inline hover toolbars, contenteditable fields, and inline spell-check underlines may lag as the CV grows. No performance baseline is proposed. (Mitigated by Theme 4 replacement of contenteditable with native `<textarea>`, but full-document rendering stress-test still needed.)
- **Conflation of editing surfaces** — Master CV (requires explicit Save) vs. CV session (immediate) have different interaction models living in the same right pane. The current separation, while fragmented, makes these boundaries explicit.
- **Word-level diff context** — The LCS word-level diff (Theme 3) has been added to the Proposed row: removed text in red strikethrough, added text in green underline. This preserves the visual diff that helps judge rewrite magnitude at a glance. *(Resolved.)*
- **Workflow progression feedback** — The proposal now pins workflow step pills to a sticky header with full phase names (not abbreviated). *(Resolved.)*

### Suggested enhancements

- **(B) Page count badge target awareness** — The green/amber/red thresholds on the page count badge now reflect the user's position-style target (e.g. 2 pages for industry). Tooltip shows: "~2.1 pages · Target: 2 pages · 5% over target." Suggest adding a "targets per style" help tooltip explaining how industry/academic/medical/government defaults differ.
- **(C) Position-style preset extensibility for publications** — The forthcoming preset system (industry, academic, medical_clinical, government) includes publication handling. An `industry_research` sub-preset allows up to 3 most-relevant publications. Clarify in UI whether users can customize these presets after selection, or if presets are read-only defaults.
- **(A) Validate undo stack serialization overhead** — With the undo stack now persisting to the session JSON file, confirm that the 2 MB cap and FIFO eviction at 100% does not create a "lost work" scenario where old edits are silently discarded. Consider a "Undo history about to be trimmed" modal instead of a one-time toast.
- **Test page-count badge across multiple position-type workflows** — Ensure the dynamic target thresholds update correctly when the user switches position types mid-session or revisits a prior job with a different target.
- **(C) Clarify publication citation style per preset** — Change C specifies citation style (APA/Vancouver/etc.) per publication preset, but does not clarify whether users see the active citation style in the settings bar or only in the expanded publication element.

---

## First-Time User

### What the proposed design gets right

- **Live document context during editing** — Users will finally see how their edits appear in the actual CV rather than working blind in isolated tabs.
- **Inline suggestion acceptance** — Instead of toggling between "Rewrites" and "Generated CV" tabs, users see pending suggestions (amber border) in-place and can accept/decline/regenerate without leaving context.
- **Master CV always accessible** — Removing the finalise-stage lock lets users update master data at any time.
- **Collapsible expand/collapse model** — The two-state pattern is consistent across sections and elements; users learn it once and apply it everywhere.
- **Ghost items clarify inclusion decisions** — Showing strikethrough/muted excluded items within the section makes include/exclude visible in context.
- **Embedded clarification questions** — Moving questions from chat-only to adjacent-to-data solves the "buried in chat" problem.
- **Keyboard accessibility removes hover discovery barrier (Theme 1)** — All element controls are reachable via Tab+Enter/Space and Alt+key shortcuts, not hidden behind mouse hover. This is critical for first-time users who cannot rely on prior knowledge that hovering is meaningful.

### Concerns or regressions vs current design

- **Toolbar proliferation risks cognitive overwhelm** — Even with the three-tier visibility model, the Tier 2 toolbar still shows 4 buttons on every element focus. A first-time user encountering this on their first bullet point may freeze. Secondary buttons are hidden until expand, which helps, but real user testing at typical laptop viewport (1366×768) is required.
- **No persistent help entry point after setup** — The proposal mentions a **?** keyboard shortcut for help and a persistent keyboard shortcut overlay, but does not specify onboarding flow or how a confused first-time user discovers the **?** key without hints.
- **Settings bar competes for cognitive real estate** — The sticky settings bar occupies ~80px of the viewport. On a laptop (768px height), this is ~10% of vertical space. Testing at 1366×768 is required to confirm legibility of the CV below.
- **Expand/collapse state persistence in multi-tab navigation** — A first-time user expands several bullets to understand the detail panel, switches to Job tab for comparison, then returns to CV. All their expansions persist (which is good), but a new user may be disoriented by controls still being "open" after context-switching without an explicit close action.

### Suggested enhancements

- **Add guided onboarding highlighting on first session** — On the first CV view, lightly highlight (3–4px yellow border) the first element's Tier 2 toolbar with a popover: *"Click to expand for details, or press Enter. Press ? for keyboard shortcuts."* Fade this after 10 seconds or on first interaction.
- **Implement progressive disclosure for keyboard help** — The **?** overlay should appear automatically on first CV view load (collapsible). After dismissal, it reappears only if requested. Include a "Don't show again" checkbox for returning users.
- **Add a collapsible "Newbie tips" banner in the settings bar** — A toggle: `[💡 Tips]` in the sticky settings bar. When expanded, shows rotating mini-tips: *"Pro tip: Press Alt+X to exclude. Press Alt+A to accept."* Keeps help discoverable without overwhelming.
- **(A) Define Master CV edit safety for first-time users** — When a first-time user opens the Master CV tab, show a brief inline warning: *"Edits here update your permanent CV record. Session changes are separate. [Learn more]"* Clarifies the two-phase save model before they accidentally overwrite source data.
- **(C) Add position-style guidance for first-time target setup** — When a first-time user configures a position type for the first time, show: *"'Industry' preset: 2-page target, publications omitted, ATS Plain style. You can adjust each setting individually."* Makes preset logic transparent so they understand the page-count badge *target* vs. current value.
- **(B) Add page-count badge explanation with visual indicator** — When the page-count badge first appears in the settings bar, highlight it and show a popover: *"~2.1 pages · Target: 2 pages (from Industry preset) · 5% over target. Click for details."* This clarifies that the target is configurable and user-driven, not hard-coded.

---

## UX Expert

### What the proposed design gets right

- **Document-centric paradigm** — Shifting from 26 scattered tabs to "document is the UI" directly addresses the context-switching pain point and "no sense of the whole."
- **In-place element editing and control discovery** — The dual expand/collapse model (section-level summary badges + element-level three-tier toolbars with focus-triggered Tier 2 controls) is elegant and fixes the current DataTable fragmentation while remaining keyboard-accessible.
- **Ghost items for inclusion decisions** — Rendering excluded elements inline with muted/strikethrough and explicit labels (not colour-only) provides context the current tables lack and ensures colour-blind users understand state.
- **Inline spell check with severity ordering** — Moving spell-check corrections from a separate tab into inline underlines with priority-ordered popovers (proper nouns first, then spelling, then grammar, then style) eliminates the risk of burying critical name typos below stylistic suggestions.
- **Clarification questions embedded in Analysis view** — Placing questions adjacent to the requirements they relate to, with inline answer fields that post to chat, eliminates the chat-only burial problem while maintaining agent reasoning integrity.
- **Always-available Master CV tab with phase-gated Save** — Lifting the finalise-stage gate respects user autonomy while `_require_master_data_write_phase` and timestamped backups prevent accidental overwrites during active job customisation.
- **(A) Persistent undo stack surviving browser close** — The app-level undo stack stored in session JSON with 2 MB cap (amber at 80%, FIFO eviction + toast at 100%) makes editing feel safe and reversible across browser restarts, a significant improvement over unreliable contenteditable undo.

### Concerns or regressions vs current design

- **(B) Page-count badge thresholds now position-dependent** — When targets vary by preset (industry: 2 pages, academic: unlimited, medical_clinical: 3 pages), the colour-coded badge becomes context-sensitive. Risk: users switching position types mid-session may be confused if the badge suddenly changes colour despite the same page count.
- **(C) Publication handling presets add complexity without discoverability** — Position style presets introduce six new fields per preset (include/exclude, max_count, selection strategy, publication types, citation style, format). If not surfaced prominently in the Settings modal, users may never discover that their position type carries publication recommendations, leading to poor defaults.
- **Three-tier control visibility requires onboarding** — The Tier 1/2/3 model (always visible → focus/hover → expanded only) is more accessible but cognitively heavier than a single "always visible" toolbar. First-time users must learn when controls appear and why.
- **Explicit Save button adds a click vs. blur-save** — The shift from blur-implicit-persist to explicit Save (Ctrl+Enter) is safer but introduces cognitive friction for users accustomed to "type and move on." The Save/Cancel buttons below every field may add visual noise.

### Suggested enhancements

- **(B) Surface position-type target in the Settings bar prominently** — When the user selects a position type (industry, academic, etc.), the page-count badge tooltip auto-updates to show: *"~2.1 pages · Target: 2 pages (industry preset) · 5% over target."* Add a "View position presets" link opening a read-only card showing all preset thresholds.
- **(C) Add a "Publication Strategy" expandable card in Settings** — Below the existing Style/Length/ATS controls, show: *"Position: Industry · Publications: excluded. Click to edit or switch position preset."* Expands to show the full publication handling config (citation style, format, selection strategy) without requiring a separate modal.
- **(A) Confirm undo stack size limits are transparent to the user** — The amber badge at 80% and the one-time "history full" toast are good. Consider adding a "Clear older edits to reclaim space" option in the Settings modal so users with long sessions can proactively manage history without hitting the silent FIFO eviction.
- **(A) Provide "Undo Tip" affordance on first edit** — On first Save in a session, display a 3-second inline tip: *"Tip: Press Ctrl+Z to undo. Your edit history persists across browser sessions."* Keep the ? key shortcut help discoverable but make Ctrl+Z awareness more prominent upfront.
- **(C) Specify publication-preset interaction with existing CV data** — Clarify: when a user switches position type, does the publication section auto-update to match the new preset, or does it require manual review? Proposal: show a "Recommended: [preset]" badge if the current publication selection does not match the active preset, with an "Apply preset" button.
- **(A/B/C) Add a "Workspace state" indicator in the sticky step bar** — A small badge showing "Session restored · Undo: 7 steps · Position: Industry · Target: 2 pages" summarizes the most critical context state in one glance, reducing the need to dig through Settings.

---

## Accessibility Specialist

### What the proposed design gets right

- **Document-centric layout reduces tab-switching cognitive load** — Fewer navigation context switches benefit users with cognitive or motor disabilities.
- **Inline editing preserves focus locality** — Keeps edits in-place, reducing the burden on users with short-term memory challenges.
- **Clarification questions embedded inline** — Eliminates the need to context-switch between chat and structured data for screen reader users.
- **Explicit keyboard alternative for drag-to-reorder** — ↑↓ buttons directly address GAP-120 and GAP-72.
- **Consistent expand/collapse model** — A single ▶/▼ toggle pattern makes expand/collapse semantics predictable for screen readers.
- **Master CV always accessible** — Removes the barrier preventing keyboard users from reaching critical data-entry in earlier phases.
- **Three-tier control visibility (Theme 1)** — Hover-only toolbars replaced with focus-triggered disclosure; Tier 2 buttons reveal on `:focus-within` in addition to `:hover`, making them reachable via Tab navigation.
- **(B) Page count badge with target context** — Colour-coded warnings (green, amber, red) paired with a tooltip showing both target page count and percentage over, supporting users with colour-blindness and magnification.

### Concerns or regressions vs current design

- **(A) Undo persistence warning badge at 80% — amber colour alone insufficient** — The amber badge on "↩ Undo (147) ⚠" uses colour as the only indicator of storage pressure. Users with colour-blindness or low-vision settings will not perceive the warning. Badge must include a text label or icon (e.g., "⚠ 80% full") alongside the colour to meet WCAG 2.1 SC 1.4.11 (non-colour contrast).
- **(C) Position style preset selector keyboard navigation unspecified** — The presets interface (GH #126) for configuring publication handling, citation styles, and format filters is not documented as keyboard-operable. If presets are presented as radio buttons or dropdown selections, Tab and arrow-key navigation must be specified to ensure keyboard-only users can configure targets.
- **(A) Undo stack persistence announcement gap** — When undo/redo stack persists across browser close (stored in session JSON), users are not notified that a new session restores historical undo state. Screen reader users may not realize their last edits have an undo path available, creating a false sense of irreversible change.

### Suggested enhancements

- **(A) Replace 80% amber badge with dual-indicator label** — Change the Undo button tooltip and on-hover text to: "↩ Undo (147) — History 80% full ⚠". The text "80% full" with the ⚠ icon serves as a non-colour indicator; users with colour-blindness will see and hear the warning. At 100% (FIFO eviction), the toast notification must be specific and persistent: "Undo history is full. Oldest entries discarded. Consider saving your work." Delivered via `aria-live="assertive"` region, not just a visual toast.
- **(C) Document position style preset selector as keyboard-navigable form** — Spec the presets widget (GH #126) as a `<fieldset>` with radio buttons or combobox for "Publication handling: [Include • Exclude]", "Max publication count: [∞ • 5 • 10]", "Citation style: [APA • Chicago • Custom]". Each option carries an explicit label; Tab navigates between fields, arrow keys navigate within radio groups. Focused control shows a visible focus ring. Form layout must work under 1× character zoom (WCAG 2.1 SC 1.4.10) for screen magnification users.
- **(A) Announce persistent undo stack on session restore** — When a session is restored (session-restore banner), append: "↩ Undo history restored: {N} steps available." The banner's live region (preferably `aria-live="polite"`) announces this so screen reader users immediately know undo is available.
- **(A) Make FIFO eviction transparent with a live-region notice** — When the undo stack reaches 100% and begins discarding entries, a durable toast (not auto-hide) announces: "⚠ Undo history capacity reached. Earlier edits are no longer recoverable. [Dismiss]" The notification persists until explicitly dismissed.
- **(B) Page count badge tooltip format for accessibility** — Ensure the tooltip ("~2.1 pages · Target: 2 pages · 5% over target") is announced by screen readers. The tooltip should be triggered on focus as well as hover, and its content should be available via `aria-describedby` on the badge button.
- **(C) Presets persistence confirmation for low-vision users** — When a user configures presets (publication inclusion, citation style, page target), display a brief confirmation message that reads aloud: "Position style preset saved: Include publications, APA style, 2-page target." This confirms the choice and allows users on screen readers to verify their input.

---

## Graphical Designer

### What the proposed design gets right

- **"The document is the UI" thesis** — Editing in-place within the live preview eliminates context-switching and preserves the WYSIWYG promise throughout customisation.
- **Inline controls over separate tabs** — Hover toolbars and inline element-expand replace fragmented tab-per-section navigation, concentrating all actions near the elements they affect.
- **Ghost-item visibility pattern** — Strikethrough/50% opacity/dashed border excluded items create coherent inline visual contrast.
- **Collapsible sections with summary badges** — Creates scannability for dense documents without expanding everything on first load.
- **Sticky settings bar** — Consolidating Length, Style, ATS Score, and Regenerate eliminates hunting for controls across modals.
- **Analysis clarification questions embedded inline** — Creates stronger context and avoids the chat/viewer toggle.
- **(A) Undo persistence eliminates anxiety about experimentation** — Undo stack survives browser close; the 2 MB cap with visual indicators (amber badge at 80%, toast at 100% with graceful FIFO eviction) means layout designers can iterate and revert freely without losing work across sessions.
- **(B) Page count badge reflecting user targets makes layout decisions data-driven** — When the badge shows "~2.1 pages · Target: 2 pages · 5% over target," the designer has objective feedback on whether a layout choice is within acceptable bounds rather than using subjective judgment.
- **(C) Position-type presets reduce layout surprises across preset switches** — The academic preset (multi-page, full publication format) vs. industry preset (2-page, publications omitted or abbreviated) are now front-and-center at the settings bar, so switching presets happens with full visibility of how page count will shift.

### Concerns or regressions vs current design

- **Inline hover toolbars risk visual clutter and accidental activation** — 10+ buttons on every hover over 30+ bullets creates cognitive overload and UI flicker. Reducing to 3–4 core visible actions with a "more" menu is needed.
- **Pending-suggestion amber boxes may conflict with CV's visual hierarchy** — Amber borders on a professional resume appear as editorial artifacts rather than integrated guidance. A softer background tint would be less disruptive.
- **(A) Undo history visual indicators could clutter the settings bar during rapid iteration** — If a user is rapidly undoing/redoing layout changes over many sessions, the amber warning badge and FIFO-eviction toast notifications may create visual noise. Consider whether toast severity/frequency can be tuned for power users.
- **(B) Page target thresholds may not align with design intent** — If the target is 2 pages and the designer wants to push to 2.3 pages for visual balance, the red badge triggers. Thresholds should be user-configurable or position-preset-specific.
- **(C) Industry vs. academic preset switch creates layout reflow** — Switching from academic (full publications section, multi-page) to industry (publications omitted entirely) causes dramatic vertical whitespace changes. No preview-of-preset-change is documented, so designers may discover layout breakage after committing the switch.

### Suggested enhancements

- **Reduce the default element hover toolbar to 3 core buttons** — Keep ▼ (expand), ✗ (exclude), ↑↓ (reorder) always visible; tuck ✓, ✏️, ✨, ✅, ❌, 🔄 into a three-dot menu.
- **Apply a subtle background tint instead of amber border** — 10–15% amber background fill behind pending elements + a small 6px amber dot to the left. Less graphic competition with CV typography.
- **(A) Add a "pause undo history" toggle for long editing sessions** — If the 2 MB cap is approaching, users can opt to freeze the stack and start fresh, reducing session bloat while keeping active undo/redo available.
- **(B) Make page-count threshold colours configurable per-preset** — In position-type preset settings, expose: "Target page length: [2 pages]. Warn when: [10% over ○ 20% over ○ 30% over]". Industry presets default to 10%, academic to 20%.
- **(B) Add a "Target vs. Actual" mini chart in the settings bar** — A small bar-chart icon showing the target (blue) vs. current (green/amber/red) page count side-by-side. Clicking opens a detailed page-break visualiser.
- **(C) Add a preset-switch preview modal** — Before switching between industry/academic presets, show a side-by-side layout preview: "Switching to Academic (full publications, 3.2 pages estimated) — current layout shows 2.1 pages." Offer "Preview" and "Apply" buttons.

---

## Resume Expert

### What the proposed design gets right

- **Eliminates context-switching penalty** — Editing bullets while seeing live output directly addresses the fundamental pain point.
- **Clarification questions embedded in Analysis view** — Reduces friction of bouncing between chat and analysis data.
- **Expanded element panel with original/current/proposed comparison + word-level diff** — All three versions of content in one place with LCS diff highlighting is critical for resume strategy decisions. *(Theme 3 resolved.)*
- **Ghost item reveal pattern** — Prevents the dangerous situation where a user forgets they excluded a strong bullet.
- **Section-level bulk accept gated by prior review** — Makes it possible to act on suggestions quickly while protecting against blind acceptance of LLM batch suggestions. *(Theme 2 resolved.)*
- **Always-accessible Master CV tab** — Allows users to correct source data mid-session.
- **(A) Undo persists to session file** — Edits survive browser close, with clear storage limits and user warnings. Gives resume experts confidence to iterate without fear of lost work.
- **(B) Page count badge uses configurable targets** — Tooltip context ("~2.1 pages · Target: 2 pages · 5% over target") directly addresses the academic-CV pain point of rigid page expectations across disciplines.

### Concerns or regressions vs current design

- **Bulk-accept safety risk** — "Accept all" in Experience or Skills with one click is dangerous; although gated (Theme 2), a user could expand one low-priority element then bulk-accept the rest. Monitor user behavior.
- **Formatting preservation during in-place editing unclear** — If a user deletes a line break or removes parenthetical context, will formatting break? Current implementation enforces constraints via review UI, not in-place editing.
- **Missing severity sort in spell-check** — Resolved by §13 severity ordering (proper nouns > spelling > grammar > style). *(Resolved.)*
- **ATS comments row lacks synonym grouping context** — Resolved by §6 (keywords grouped by canonical term). *(Resolved.)*
- **(C) Publication handling fields may be insufficient for academic conventions** — The preset structure covers selection and citation format, but conflates several distinct academic scenarios: book authors vs. book editors, conference papers vs. conference abstracts, journal articles vs. letters-to-editor. No explicit distinction between "peer-reviewed" and "non-peer-reviewed" publication types. The `most_relevant` selection strategy is undefined — relevance to whom? (LLM keyword match vs. citation impact). ATS warning for suppressed publications does not address strategic omission risk (e.g., suppressing patents while JD emphasizes innovation).

### Suggested enhancements

- **Add a confirmation modal for "Accept all" actions** — "Accept all N suggestions in [Section]?" with options to "Review each," "Accept all," or "Cancel."
- **Validate in-place edits against resume conventions** — Real-time or on-blur: line-length warning (70–85 chars ideal), fragment check, keyword consistency check; non-blocking warnings only.
- **(A) Export undo stack to JSON before eviction** — Complement the amber badge with a Settings option to export the full undo stack to a timestamped JSON file before FIFO eviction begins. Also add a "Clear undo history now" button to free space proactively.
- **(B) Extend page-count target configuration to publication-aware thresholds** — Allow configurable targets per document type (e.g., "CV: 3 pages, Bibliography: 2 pages separately"). A `target_publications_separate` boolean in the preset signals whether publications are counted in the main page total or submitted separately.
- **(C) Expand publication preset schema to cover academic taxonomy** — Add boolean flags within each preset: `distinguish_peer_review`, `include_book_editors`, `include_conference_abstracts`, `include_letters_to_editor`. Refine `selection` to add `most_recent_peer_reviewed` strategy. Clarify `heading` variants: "Peer-Reviewed Publications" (when `distinguish_peer_review: true`) and "Other Publications" as split headings. Audit that citation style options cover IEEE, Harvard, Chicago, ACS. Expand `include_metrics` to explicit sub-flags: `h_index`, `citation_count_per_publication`, `journal_impact_factor`, `preprint_server`.
- **(C) Warn when `most_relevant` selection is applied without user review** — Add note: "⚠ Most relevant selections are AI-generated and should be reviewed before acceptance. Selection is based on JD keyword overlap, not citation impact."

---

## Hiring Manager

### What the proposed design gets right

- **Live preview throughout customisation** — Users see immediately when a rewritten bullet becomes too long, when a skill disrupts visual balance, or when section headings are malformed.
- **In-place inline editing preserves document integrity** — Users can evaluate edits against the rendered resume context in real-time.
- **Ghost-style hidden elements solve a credibility risk** — Catches the silent failure of submitting incomplete job entries with only 1 accepted bullet.
- **Sticky settings bar for output control** — Length/Style/ATS/Pages controls always accessible without tab-switching.
- **Embedded clarification questions** — Reduces ambiguity and keeps analysis rationale transparent.
- **Element expansion panels provide rich decision context** — Original, Current, Proposed (with word-level diff), Model recommendation, ATS comments, and Persuasion comments in one view.
- **(A) Undo persists to session file** — The 2 MB capped undo stack that survives browser close eliminates the anxiety of accidental edits that cannot be recovered. Returning to a session fully restores the undo/redo state, turning mistakes into reversible moments rather than starting-over events.
- **(B) Page-count badge uses user-configured targets** — Target-aware colour thresholds (green ≤target, amber 10–25% over, red >25%) make the concept of "appropriate length" context-sensitive: academic roles expect longer (3–4 pages), industry roles expect shorter (~1–2 pages). The tooltip teaches users the relationship between their choices and hiring manager expectations in real-time.
- **(C) Position style presets drive strategy coherence** — Presets (industry, academic, medical_clinical, government) encode not just page targets but bullet style, summary voice, publication handling, and ATS mode as a single decision. The `industry_research` sub-preset that highlights 3 most-relevant publications in abbreviated format is particularly strong for researchers interviewing outside academia.

### Concerns or regressions vs current design

- **Inline editing risks accidental quality degradation** — All CV content editable in-place can introduce formatting errors (stray newlines, copy-paste artifacts) that are not visible until Download. Even with undo, a user may not notice they've introduced a subtle error until the CV is already submitted.
- **No mention of final validation gates before export** — The current design fires validation warnings at the Download tab. The proposal does not specify whether these gates remain or move elsewhere.
- **Master CV always-present may create version-control confusion** — If Master CV edits are not reversible via session undo, accidental writes could damage the shared source-of-truth with no recovery path. (Note: Master CV uses separate timestamped file backup, not session undo stack.)
- **(A) 2 MB undo stack size cap is unclear in practical terms** — How many typical edits does 2 MB represent? Will users hit the limit during a long customisation session? At what point does FIFO eviction risk losing critical recovery points?
- **(C) Publication filtering logic is not transparent** — The `industry_research` sub-preset that "selects" 3 most-relevant publications is a black box. A hiring manager cannot see what criteria the system is using to rank relevance (citation count? date? keyword match against the JD?). This interaction with prior user inclusion decisions is also unclear.

### Suggested enhancements

- **Add a pre-Download validation checklist modal** — Before Download: confirm page count against target, persuasion warnings acknowledged, no pending inline saves, spell-check resolved, ATS validation passing. Make the target and actual page count explicit in the checklist.
- **(A) Provide transparent undo stack monitoring** — Add a session stats panel accessible via tooltip on the Undo button showing: "Undo history: 47 edits · 1.2 MB / 2 MB · est. 80 more edits available." Teaches users how full the stack is in concrete terms.
- **(A) Add an archival/snapshot feature for long sessions** — If a session is approaching the undo limit, offer an explicit "Save checkpoint" button that marks the current CV state and clears the undo stack, preserving both the CV and a dated snapshot for rollback.
- **(B) Expose position-type detection and default-target editing** — Add a "Position type" setting in the Analysis view that shows the detected role category and current target page count. Allow one-click adjustment of the target for the current session.
- **(B) Refine amber/red thresholds proportionally** — For academic positions (target 3–4), amber threshold should be 3.5–4 pages; for industry (target 1–2), amber at 1.2–1.5× target. Make the thresholds proportional to the target, not absolute.
- **(C) Clarify publication selection criteria with transparency mode** — Add a collapsible "How publications are selected" section explaining the ranking logic: "Ranked by (1) keyword match vs. job description, (2) recency, (3) citation impact." Add a "Publication ranking" view in the Analysis tab.
- **(C) Allow manual override of preset publication choices** — Provide an "Edit publication selection" button listing all available publications ranked, with checkboxes for hand-tuning which ones appear.

---

## HR / ATS Specialist

### What the proposed design gets right

- **ATS Score badge and drill-down in settings bar** — Constant compliance visibility eliminates the current "Compute ATS Score" empty-state button users overlook.
- **Keyword highlighting in Job view** — Amber highlighting for matched terms and red for missing required keywords teaches users what gaps remain before customisation begins.
- **ATS comments in expanded element panel** — Users making editorial decisions see ATS impact alongside persuasion and model recommendation in one place.
- **Plain/ATS style option in settings bar** — Toggle between human-readable (Sidebar) and ATS-safe layout; makes the tradeoff visible.
- **Hard-requirement keyword coverage now visible inline** — Summary badges ("3 of 7 bullets included") let users scan inclusion rate per section.
- **Master CV always accessible** — Enables mid-session skill updates and consistent skill classification.
- **(A/B) Undo persistence + configurable page-count targets** — Enables error recovery and makes ATS page-count expectations concrete rather than abstract.
- **(C) Position-style presets reduce ATS compliance friction** — Selecting an industry-standard preset auto-configures per-preset ATS mode (keywords/methods/clinical), publication filtering, and target page length. Per-preset publication handling closes a critical ATS gap: a warning badge fires if the preset suppresses publication types but the job description explicitly mentions peer-reviewed work.

### Concerns or regressions vs current design

- **Inline editing risks ATS-safe formatting** — If ATS DOCX generation doesn't re-normalize edited text (stripping bold/italic, standardizing line breaks), inline edits could corrupt ATS parsing.
- **ATS validation gate missing in proposed workflow** — The current File Review tab enforces a 17-check validation report. The proposal does not detail how the validation report integrates or gates downloads.
- **(C) Position-style preset selection is a critical ATS compliance decision** — Choosing the wrong preset (e.g. selecting "Academic CV" for an industry tech role) may suppress essential keywords or change parsing rules. No guided selection workflow is proposed, and users unfamiliar with the ATS implications may pick based on visual preference rather than job fit.
- **(C) Per-preset ATS modes lack explicit guidance on when each is appropriate** — A user may not understand that "clinical ATS mode" expects structured terminology (diagnosis codes, clinical outcomes) that would be inappropriate for a software engineering role.
- **(C) Publication-suppression warnings only fire post-hoc** — The warning badge appears after a preset is selected and the job description is analysed. An earlier "preview what this preset will do" step would prevent surprises.

### Suggested enhancements

- **Add an "ATS Safe Editing" toggle in the settings bar** — When enabled, contenteditable fields strip formatting on blur and the settings bar shows: "Inline edits will be normalized for ATS compliance."
- **Embed ATS validation status in the settings bar** — A "Validation Status" badge (green ✓ / amber ⚠ / red ✗) that updates live; displays count of failing checks. Clicking opens the full 17-check report.
- **Add a "Hard Requirements Coverage" widget to the Analysis view** — **Hard Required Keywords: N / M**, with red warning if < 100%. Each unmatched keyword links to the relevant section.
- **Clarify the ATS DOCX export path from inline edits** — Document a clear rule: all text re-normalized (formatting stripped, line breaks standardized) before export; validation check compares ATS DOCX text to session state.
- **(C) Position-style preset selection should include a "Preview & Compare" step** — Before committing to a preset, show side-by-side comparison of how the current CV would render under candidate presets (page count, keyword emphasis, publication inclusion). Tooltip on each preset: "2-page tech resume — ATS mode: keywords-focused · Suppresses: preprints, non-peer-reviewed · Target: 2 pages."
- **(B) Extend the page-count badge tooltip to surface the preset's role** — Add an italicized line: "Target set by [Preset name] position style." This reminds users that the 2-page target comes from an active choice, not a hard rule, and can be overridden.
- **(C) Add an "ATS Mode" mini-card in the Settings bar** — Display the active position-style preset's ATS mode (keywords / methods / clinical) with a one-line explanation. Link to a help page clarifying when each mode is appropriate.
- **(C) Implement the publications-suppression ATS warning as a "pre-submit" check** — During job analysis, if the JD mentions "published research" or "peer-reviewed contributions" and the active preset suppresses journal articles, show an amber banner in the Analysis view with a one-click "Suggest alternative presets" button.

---

## Master CV Curator

### What the proposed design gets right

- **Always-accessible Master CV tab** — Directly addresses GAP-41. No longer locked to `finalise` stage; the first document tab and available at any time.
- **Unified in-place editing with explicit Master CV save gates** — Session documents update immediately; Master CV changes require explicit "Save" confirmation. Prevents accidental writes to the permanent record.
- **Expanded element panel with "Original" row** — Shows Original (read-only, from Master CV), Current (session), and Proposed (LLM) with data lineage crystal clear in a single visual context.
- **Ghost-style excluded items inline** — Preserves the "document-is-the-UI" principle while maintaining the visual boundary between included and excluded content.
- **Contextual highlighting** — Blue left-border accent on the active section, paired with chat breadcrumb, reinforces which part is under focus.
- **Inline spell check** — Keeps the "document is the UI" philosophy intact and eliminates tab-switching for closely related editing.

### Concerns or regressions vs current design

- **(C) Master CV publication type tagging burden falls on curator** — Position target style presets (GH #126) require Master CV publications to carry per-publication type tags (journal_articles, book_chapters, conference_proceedings, preprints, technical_reports, patents) so that type filters can work correctly. The proposal does not specify when/how the curator adds these tags. Retrofitting existing entries with type metadata requires either manual curation, heuristic inference from BibTeX entry types + validation UI, or LLM-assisted tagging. None of these paths are specified.
- **(C) `most_relevant` LLM publication selection lacks curator review checkpoint** — If the Master CV is updated mid-session and the LLM's relevance ranking changes, the session's publication selection may become stale or inaccurate. No "re-rank publications" step is specified before finalisation.
- **(A) Separate undo path for Master CV (file backup vs. session undo) may confuse users** — Session edits use Ctrl+Z (in-memory undo stack); Master CV saves use timestamped file backups (a separate restore path). The proposal does not clarify how a curator discovers and uses the file backup restore path, or whether they should see the two mechanisms as distinct.
- **Proposed → Current → Session state coupling unclear** — When a user expands an element and accepts a suggestion, does this promote to Current immediately, or only after a Save? The proposal doesn't clarify when Proposed suggestions are formally captured.
- **Loss of explicit harvest/archive boundary** — The proposal does not clarify whether the two-phase harvest workflow (1. Finalise & Archive, 2. Optional: Update Master CV) is preserved or merged into the unified document viewer.

### Suggested enhancements

- **(C) Define Master CV publication type tagging workflow** — Before or during Master CV curation, the curator should have a clear path to tag each publication with its type. Propose: (1) BibTeX entry-type inference (journal → journal_article, inproceedings → conference_proceedings, etc.) as a default suggestion, (2) a dropdown selector in the Master CV publication CRUD view to override inferred types, (3) a validation warning before save if any publication lacks a type tag.
- **(C) Show publication type coverage in the Master CV summary badge** — When the Master CV Publications section is collapsed, display: "Publications: 12 entries · 10 journal_articles, 2 conference_proceedings." This signals to the curator whether type tagging is complete before a session begins.
- **(C) Add a "Re-rank publications for this job" flow in session customisation** — When the curator has updated Master CV publications since session start, offer a "Re-compute publication relevance for current job?" button in the CV view settings bar. This prevents stale relevance rankings from being locked in before session finalisation.
- **(C) Require explicit publication selection confirmation before finalisation** — At the Finalise step, display a "Publications to include" summary card: "Industry Research preset: 3 of 12 publications selected. Venues: 2 journal articles, 1 conference paper." Users must explicitly click "Confirm publication selection" to proceed.
- **(A) Clarify and consolidate the Master CV undo mechanism** — Document explicitly: "Master CV saves use timestamped file backups stored in `.cv_backup/` directory. These are separate from session undo. To revert a Master CV change: click the Master CV tab, expand an element, and use 'Restore from backup' in the expanded panel." Alternatively, integrate file backups into the app-level undo stack so Ctrl+Z works consistently.
- **(A) Add a "Master CV dirty state" badge and confirmation before archiving** — If the Master CV tab has unsaved changes when the user proceeds to Finalise, show: "⚠ Master CV has unsaved changes. Archive anyway?" Prevents accidental loss of mid-session Master CV edits.

---

## Persuasion Expert

### What the proposed design gets right

- **Live document context during editing** — Users see immediate impact of framing decisions on the rendered resume, directly supporting persuasive-intent evaluation.
- **Inline "Persuasion comments" row in expanded element panels** — Currently surfaced only in the separate Rewrite Review tab; inline placement is a major discoverability upgrade.
- **Model recommendation badges integrated into element expansion** — Consolidates Emphasize/Include/De-emphasize/Exclude signals adjacent to persuasion and ATS feedback.
- **(A) Iterative in-place editing enabled by session undo persistence** — Undo stack survives browser close (2 MB cap, amber warning at 80%, FIFO eviction + toast at 100%), directly lowering the friction to iterate boldly on rewrite suggestions without fear of unrecoverable loss.
- **Contextual highlighting of the active workflow section** — Keeps persuasive framing decisions anchored to intent.
- **Master CV always accessible** — Allows strong framing decisions to flow back to the master record rather than being one-off session edits.
- **(B) Page count warnings informed by position targets** — Colour thresholds on the page-count badge now driven by user-configured position-type targets (industry, academic, medical_clinical, government presets), making it clear when length choices conflict with role expectations.

### Concerns or regressions vs current design

- **(C) Position style presets may not align persuasive strategy to target genre** — Presets set `bullet_style` (impact vs. detail) and `summary_style` (career vs. statement) globally per position, but do not explicitly map to persuasion intent. An "impact" preset may omit methodological detail that peer-reviewed research audiences expect; a "statement" summary may lack the career-narrative coherence that industry hiring managers seek.
- **(C) Publication handling per preset risks strategic incoherence** — If an academic preset excludes publications but the role's JD emphasizes peer-reviewed work, the ATS warning fires — but the persuasion frame (research leadership vs. practical impact) may already be misaligned. The warning flags ATS gaps, not persuasion gaps.
- **Ghost-style excluded elements may undermine persuasion coherence** — A user might include a mediocre bullet without checking persuasion comments. Proposal does not specify whether ghost elements trigger warnings.
- **High-priority persuasion flags only visible on expand** — A critical persuasion issue (passive voice, absent result clause) does not surface in the collapsed view unless explicitly specified, so most users skip past weak-verb bullets without noticing.
- **No explicit gating of submission on persuasion acknowledgement** — Current design gates "Submit All Decisions" on `persuasionWarningsAcknowledged`. The proposed design does not specify whether a phase-exit gate remains.

### Suggested enhancements

- **(C) Clarify persuasive intent alignment for position-style presets** — Document the persuasion strategy per preset: *Industry preset: lead with business impact, minimize methodology detail, emphasise results and scale.* *Academic preset: establish research rigor, include methodological depth, frame contributions to peer scholarship.* *Medical/Clinical preset: prioritise patient outcomes and regulatory compliance.* *Government preset: emphasise mission alignment and security/compliance rigor.* Provide a settings option to override preset-chosen `bullet_style` / `summary_style` per job.
- **Surface high-priority persuasion flags in collapsed element view** — A small ⚠ badge appears next to the collapsed element text when passive voice, hedging language, missing result clause, or weak verb is detected. Clicking expands the element to see the full persuasion comments.
- **Explicit persuasion gate at phase-exit** — "Submitting this phase requires addressing all ⚠️ Persuasion flags or explicitly acknowledging them as reviewed. Proceed without review?"
- **Persuasion comment prioritisation by impact** — Weight passive voice, hedging, absent result clause, and weak verb above structural notes (word count, CAR pattern). Specification: the first three checks appear first in the prose; word-count and CAR notes follow.
- **(C) Publication inclusion warnings tied to persuasion narrative** — When a preset excludes publications but the JD emphasizes peer-reviewed work, the warning should state: "Publications are excluded in this preset, but the role lists peer-reviewed work as a requirement. Include publications to support research-focused narrative?"
- **(A) Session undo encourages iterative reframing** — Document that the 2 MB session-persisted undo stack is designed to reduce the friction cost of experimental rewrites. Users can confidently try bold rephrasing, accept suggestions, and undo if the result feels inauthentic.

---

## Power User

### What the proposed design gets right

- **(A) Persistent session undo history across browser close/reopen** — Undo stack is stored in the session JSON file, not browser memory. Power users processing 50+ sessions no longer lose their undo history on browser restart. Configurable via `undo_history_max_bytes` in `config.yaml`.
- **Persistent resume visibility** — Editing while seeing the actual document eliminates the current workflow where edits happen blind until Layout Review.
- **In-place element controls eliminate tab churn** — Hover toolbars and expand panels (now focus-triggered, not hover-only) replace the DataTable-per-tab model.
- **Section-level batch controls** — "Accept all" (gated behind ≥1 element review), "Decline all," and "Suggest section" provide the bulk-review path currently missing.
- **Inline editing across all document types** — No intermediate "save to DataTable" step; changes are session-immediate.
- **Auto-tab switching with Smart/Manual override** — Smart mode auto-switches; Manual mode keeps keyboard-driven workflows uninterrupted. Power users can disable auto-switch entirely.
- **Ghost-style excluded elements stay visible** — Power users can see at a glance what's been ruled out without a filter toggle hunt.
- **(B/C) Configurable position-style presets with target-aware page count badge** — Page count badge colours are now driven by user-configured position targets. Tooltip shows the target and over/under status. Presets include per-preset publication handling and bullet/summary style variations.

### Concerns or regressions vs current design

- **(A) Undo history size may grow unexpectedly on high-volume sessions** — A power user processing many sessions might not realize when the oldest edits start getting silently evicted. The amber warning at 80% helps, but FIFO eviction without explicit user consent could cause surprise data loss if a user assumes "undo deep into my history" is always safe.
- **(A) 2 MB cap may be too tight for advanced power users** — Rapid-fire "Accept all" across 10+ sections could burn through 2 MB in 20–30 operations. For a power user processing 50+ sessions, the effective undo depth per session may be shallow.
- **(B/C) Page count target presets may not match all job types** — The five named presets (industry, academic, medical_clinical, government, industry_research) cover common cases, but niche domains (startup pitch, nonprofit, consulting boutique) might not map cleanly. A power user with a diverse portfolio needs custom targets.
- **(C) Preset position-style switching requires manual selection** — A power user switching targets 10+ times per session must open the settings dropdown each time. No keyboard shortcut to cycle through presets.

### Suggested enhancements

- **(A) Expose `undo_history_max_bytes` in Settings UI, not just config.yaml** — Power users processing 50+ sessions should be able to adjust the undo cap per-session without editing YAML. A "Undo history budget" slider in Settings (500 KB – 5 MB) lets users trade off undo depth vs. session file size. Show live estimate: "Undo stack: 1.2 MB / 2 MB (~150 edits)."
- **(A) Add a "Bulk undo" confirmation for high-volume changes** — When a power user clicks "Accept all 50 items in Experience," show a brief confirmation: "Accept all 50? You can undo this as one action."
- **(B/C) Support custom page-count targets alongside presets** — Allow power users to define a personal "default" target that applies across all sessions unless overridden. A "New preset" button in Settings lets users save custom targets keyed on job category or company tier.
- **(C) Add a keyboard shortcut to cycle through position-style presets** — Bind Alt+S (or Shift+Alt+S) to open a mini preset-picker dropdown. Select with arrow keys, Enter to apply.
- **(B/C) Display "Preset: [name]" label in page-count badge tooltip** — Tooltip becomes "~2.1 pages · Target: 2 pages (industry preset) · 5% over target" so the user knows which preset is active and can override it.
- **(A) Warn before clearing redo stack on undo-history overflow** — Currently the redo stack is silently cleared when the 2 MB limit is first hit. Add a one-time toast: "Undo history is full. Redo history has been cleared to reclaim space."
- **(A) Provide a "Session undo summary" in post-archive review** — After a session is finalised/archived, show: "Session history: 347 edits, undo depth 12, undo stack 1.8 MB." Power users can estimate whether their undo budget was adequate.

---

## Recruiter-Ops

### What the proposed design gets right

- **Live document visibility** — Rendering the CV throughout customisation eliminates the context-switching cost of flipping between Bullets, Summary, and Skills tabs.
- **Section-level batch controls** — "Suggest section," "Accept all," "Decline all" directly address high-volume throughput.
- **Ghost-style excluded items inline** — No navigation step needed to see which bullets or skills were excluded.
- **Master CV always accessible** — Recruiters often need to update contact info or add a new skill mid-workflow.
- **Contextual auto-tab-switching (Smart/Manual mode)** — Smart mode keeps focus aligned with the current task; Manual mode preserves recruiter control.
- **Embedded clarification questions** — Keeps context near data, reducing the need to scroll back in chat history.

### Concerns or regressions vs current design

- **(A) 2 MB per-session undo cap across 20+ active sessions = 40 MB+ undo storage** — For a recruiter managing 20 concurrent applications, this is non-trivial disk usage. No guidance is given on where session files are stored (local, cloud, shared network drive) or whether recruiters will hit this cap in day-to-day high-volume workflows.
- **(A) FIFO eviction creates silent history loss** — When the 100% threshold is hit, oldest entries are silently dropped with only a toast notification. A recruiter who performs 150+ edits in a long session may not notice that early edits are no longer undoable.
- **(B) Target per-session but preset-configurable** — If a recruiter is toggling between multiple position styles (industry vs. government, entry-level vs. senior), switching presets triggers re-evaluation which may re-flag already-approved bullets.
- **(C) Preset selection at job intake adds friction to high-volume intake** — Selecting a preset from a 4-item list may seem trivial, but high-volume recruiters often batch intake many similar positions. A "default preset" global setting would eliminate per-job selection for 80% of applications.
- **(C) LLM-inferred preset reliability unspecified** — If the LLM infers a preset and is wrong, downstream include/exclude suggestions will be off-target. No fallback or "I disagree with the inferred preset" affordance is mentioned.
- **(C) Preset switching triggers re-evaluation that may conflict with prior decisions** — If a recruiter manually excludes a publication and then switches presets, does the re-evaluation override the manual exclusion?

### Suggested enhancements

- **(A) Expose a "Session undo info" detail card** — In the CV settings bar, display undo stack size in real time: "↩ Undo (87 edits / 1.2 MB of 2 MB)". Allow recruiters to manually "Clear old undo history" to free space without losing work.
- **(A) Add a "session storage alert" to daily-use workflows** — When a session hits 80% undo capacity, the amber warning should also include a suggestion: "Undo history is 80% full. Archive this job to reclaim space, or clear old edits."
- **(B/C) Add a global "default preset" setting** — Reduce per-job intake friction for high-volume recruiting by allowing a recruiter to set a site-wide default preset (e.g. "industry" for 80% of our placements). On job intake, the preset is auto-selected unless the user changes it.
- **(B/C) Show preset and target on the session-restore banner** — When a recruiter reopens a session, the banner should display: *"Session restored: 4 of 7 experiences selected · Position style: Industry (2-page target) · 3 pending rewrites."*
- **(C) Add a "Preset mismatch" detection warning** — If the LLM infers a preset that differs from the one selected at job intake, display: "⚠ Inferred preset differs: AI suggests 'Academic' but you selected 'Industry'. Review and choose." Include a quick "Adopt inferred" button.
- **(C) Make preset switching non-destructive** — When a recruiter switches presets, display a summary modal: *"Switching from Industry to Government preset will re-evaluate: publication handling, ATS mode, page target. Review the N affected bullets before confirming?"* Include "Confirm & re-evaluate" and "Cancel" buttons.

---

## Returning User

### What the proposed design gets right

- **(A) Persistent full undo history waiting on return** — Undo stack stored in session JSON survives browser close/reopen. When a returning user resumes, the complete edit history is fully available. Ctrl+Z reverts immediately from the first keystroke. This is a major win vs. the current "one-shot" session restore with no recovery path for prior decisions.
- **Session-restore banner with decision summary** — On re-entry, a collapsible banner summarizes prior work: "Session restored: 4 of 7 experiences selected · 12 skills · 3 pending rewrites · 2 clarification questions open." Auto-hides after 10 seconds.
- **Auto-tab-switching to working context** — Smart mode (default for new users) switches to the most relevant document tab as workflow phase advances. Returning users with Manual mode set see a breadcrumb suggestion but control navigation.
- **(C) Position preset restored on session reload** — Named presets (industry, academic, medical_clinical, government) are stored per-session and auto-restored on browser reopen, so colour thresholds on the page-count badge remain consistent across sessions.
- **(B) Page-count badge targets user preferences** — Colour thresholds (green/amber/red) are not hard-coded but driven by the session's position-style target page count. No surprise colour shifts between sessions.
- **Live document-as-UI eliminates session reorientation** — Returning users see their CV immediately on resume, with prior inline decisions (exclusions, reorders) preserved as ghost items and summary badges.
- **Clarification questions history embedded** — Analysis view collapsible "Answered" section shows prior responses (with "Clear and re-answer" option).

### Concerns or regressions vs current design

- **(A) Undo history size warning may appear on return** — If a session had heavy editing and undo stack reached 80%, an amber warning badge appears on Undo button on re-entry. Users may be confused by the warning and think their session is degraded. Tooltip should be prominent: "Undo history 80% full; oldest entries will be discarded when limit is reached."
- **(C) Position preset restoration correctness unspecified** — The preset is stored and restored, but edge case remains: if a user changed position type in a different tool or manually edited config between sessions, does the preset mismatch get flagged? No validation rule is documented.
- **Expand/collapse state on browser close** — The proposal states expanded panels persist across tab switches, but if a user closes the browser mid-edit with panels open, are expansions restored? Unexpected re-entry to an expanded panel might disrupt reading flow.
- **No explicit "resume job?" confirmation** — A returning user with multiple sessions might accidentally resume the wrong session. A session-list step before restoring would reduce this friction.

### Suggested enhancements

- **(A) Surface undo stack size threshold proactively** — Before the session reaches 80%, show a non-intrusive info banner: "You've made 120 edits in this session. Undo history is 45% full." Let users decide if they want to archive or accept the 2 MB cap.
- **(C) Validate position preset on session restore** — On restore, check that the stored preset matches the current position type in the session. If mismatch: show a banner "Position type changed. Page-count targets updated from {old} to {new}. [Review targets]". Auto-restore but signal the change.
- **(A) Remember expanded-panel state explicitly in session snapshot** — When a session is saved, also store which element panels were expanded. On restore, silently re-expand them only if the user was in active edit mode. Add a subtle indicator: "Resuming edit of Bullet 3 (expand panel open)."
- **Add a session-resume multi-pick flow** — If a user has multiple queued sessions, show a card-style list on session load: "Continue with: [Job Title] in [Position] (last edited 2 hours ago) | Start new job | Browse archived sessions."
- **(B/C) Clarify target page count interaction with preset** — Document explicitly: preset sets default page target; if user manually adjusts target in this session, the adjustment persists for this session only. On next session with same preset, default target is restored. Example: "Industry preset defaults to 2 pages. You adjusted to 2.5 pages (shown: 📌 Target: 2.5 for this session)."
- **(A) Add a "session timeline" widget in the restore banner** — Hover-accessible timeline of major checkpoints: "✓ Job intake (18:30) → ⊙ Customisation (19:15) → ⊙ Rewrites pending (20:00) → ▶ Now (20:47)." Lets returning users see how much work was done since the last edit.

---

## Trust & Compliance

### What the proposed design gets right

- **(A) Timestamped undo entries provide an audit trail** — Every edit, accept, decline, include/exclude, and move operation is logged to the session file with a timestamp and operation path (`{ "op": "edit", "path": "experience[2].bullets[0].current", "prev": "...", "ts": 1749945600 }`). This creates a complete audit trail that survives browser close. Master CV saves use a separate file-level timestamped snapshot strategy.
- **Expanded element panel retains original/current/proposed three-row audit trail** — All three versions surfaced side-by-side during inline editing; provenance of every edit is visible at the moment of decision.
- **Inline suggestion acceptance with mandatory decision visibility** — Amber border boxes on each element force users to encounter suggestions in context, reducing the risk of accidental bulk acceptance.
- **Ghost item reveal pattern provides explicit inclusion/exclusion audit** — Strikethrough/50% opacity excluded items with traceability are a substantial improvement over exclusion decisions made in separate tabs.
- **Master CV always-accessible tab** — Permanent access to the authoritative source improves trust.
- **Clarification questions embedded inline** — Users cannot accidentally ignore AI-derived questions before generating rewrites.
- **(B) Page count badge colour-coded by position-type targets** — Colour thresholds are now driven by user-configured target page counts per position style, making page count compliance transparent and role-appropriate.

### Concerns or regressions vs current design

- **(A) FIFO undo eviction without visibility of dropped entries is a compliance risk** — When the 2 MB undo stack fills, oldest entries are silently dropped via FIFO eviction with only a toast notification. A user has no way to know which specific operations were evicted. For regulated contexts (CVs for legal/HR use), this silent data loss could be problematic.
- **(A) Undo stack cleared on archive/finalise without user confirmation** — The session undo stack is cleared when the job is archived or finalised, with no explicit warning or recovery path. A user who finalises prematurely cannot undo their last round of decisions.
- **(C) Position target style presets suppress publications without user confirmation** — Named presets can include per-preset publication handling that excludes publication types. If a preset selects "exclude all peer-reviewed publications" but the job description mentions "proven peer-review background," the CV could inadvertently misrepresent the candidate's qualifications.
- **(C) `most_relevant` LLM publication selection applied without user review** — Position target style presets can apply selection strategies like `most_relevant` without requiring explicit user confirmation. An LLM-chosen subset of publications may silently exclude important works.
- **Section-level bulk "Accept all" removes per-item review requirement** — Although now gated (Theme 2), a user could expand a single low-priority element and then bulk-accept the rest without reading them.
- **In-place editing without phase-level confirmation** — Element-level save without a final review step is weaker than the current master CV save gate. Users may inadvertently edit a bullet and have the change persist without a final review.

### Suggested enhancements

- **(A) Log specific undo entries dropped during FIFO eviction** — Instead of silently dropping oldest entries, maintain a parallel "evicted_entries" log listing what was removed: `[{ "op": "edit", "path": "...", "ts": ..., "evicted_at": ... }]`. Show this log in a "Recently evicted" section of the Undo modal, giving users transparency into what they've permanently lost.
- **(A) Gate undo stack clearance on archive behind explicit confirmation** — Before finalising, show a modal: "About to finalise this session. After finalisation, the undo history will be cleared and cannot be recovered. Continue?" This is a non-undoable action and deserves explicit acknowledgement, particularly for users working under compliance constraints.
- **(C) Require explicit user confirmation before applying publication-filtering presets** — When a user selects a position target style preset with publication-handling rules, show a review step: "**[Preset Name]** will exclude peer-reviewed publications. Your CV lists 7 peer-reviewed papers. Continue?" Never silently apply publication suppression.
- **(C) Surface LLM publication selection with before/after comparison** — When a preset's `most_relevant` strategy auto-selects publications, display: "Selecting 4 of 12 publications by relevance to this role. Keep all · Apply selection." Show current vs. proposed side-by-side with relevance scores for each.
- **Extend ATS validation gate to include publication misrepresentation** — If a preset suppresses publications but the job mentions "peer-review experience" as a required keyword, the ATS validation badge should flag this: "⚠ 1 issue: Publications suppressed but role requires peer-review evidence."
- **(A) Preserve undo history as a downloadable audit log on archive** — When a session is archived, export the full undo_stack as a JSON file alongside the session directory. This allows users to reconstruct edit history for compliance reviews, even though in-app undo is no longer available after finalisation.
- **Add a "Session audit" review before Download** — Display a timeline of all major decisions (sections selected, suggestions accepted, publications included) before Download. Timestamps tie back to the undo entry timestamps for full traceability.

---

## Synthesis

### Resolution Status: Cross-Persona Themes 1–5

All five cross-persona themes from the original review have been addressed in the revised design proposal (§2, §6–§9, §12, §16, §17):

| Theme | Original concern | Resolution |
|-------|-----------------|------------|
| **Theme 1:** Hover-only controls inaccessible | 5 personas | ✅ Resolved — Three-tier control model (§8, §9): Tier 2 revealed on `:focus-within`; Tier 3 always in expanded panel. Full keyboard binding table (§16). ARIA spec with `role="toolbar"`, `aria-live`, `aria-expanded`. GAP-120 and GAP-72 resolved at design level. |
| **Theme 2:** Bulk "Accept All" compliance risk | 4 personas | ✅ Resolved — Accept all gated behind ≥1 explicit element review per section. Count badge shows remaining: "Accept all 5 remaining." |
| **Theme 3:** Missing word-level diff | 2 personas | ✅ Resolved — LCS word-diff in Proposed row: removed text in red strikethrough, added text in green underline (§6). |
| **Theme 4:** Undefined undo / contenteditable fragility | 5 personas | ✅ Resolved — Native `<textarea>` replaces contenteditable; app-level undo stack in session JSON; explicit Save/Cancel pattern (§12, §17). |
| **Theme 5:** Auto-tab-switch needs user control | 4 personas | ✅ Resolved — Smart/Manual mode toggle (§2); Smart suppresses on unsaved edits; breadcrumb shows recommended tab; Manual never auto-switches. |

### New Cross-Persona Concerns Introduced by Design Changes A/B/C

Three new design changes (A: session-persisted undo; B: target-aware page count; C: position style presets) introduced a second tier of cross-persona concerns, each raised independently by multiple personas:

#### New Theme 6: FIFO Undo Eviction Transparency (Change A)
**Raised by:** Trust & Compliance, Power User, Recruiter-Ops, Returning User (4 of 14 personas)

When the 2 MB undo stack fills, oldest entries are silently dropped via FIFO eviction. A one-time toast is the only notification, and users have no visibility into *which* operations were evicted. For high-volume users (50+ sessions) or compliance contexts, this creates unacceptable silent data loss.

**Recommendation:** Log evicted entries to a parallel "evicted_entries" array in the session file. Show a "Recently evicted" section in the Undo modal. Gate undo stack clearance on archive/finalise behind an explicit confirmation modal. Offer a "Clear older edits to reclaim space" option as a proactive alternative to hitting the cap.

#### New Theme 7: Position Style Preset Suppresses Publications Without Confirmation (Change C)
**Raised by:** Trust & Compliance, Resume Expert, HR/ATS Specialist, Master CV Curator (4 of 14 personas)

Named presets can apply publication-suppression rules and `most_relevant` LLM selection silently, without user confirmation. If the preset excludes peer-reviewed publications but the JD requires them, the ATS warning fires *after* the preset is applied — too late. The `most_relevant` LLM selection is a black box (relevance to whom? citation impact? keyword match?).

**Recommendation:** Require explicit confirmation before applying any publication-filtering preset ("This preset will exclude 7 peer-reviewed papers. Continue?"). Implement a "preview what this preset will do" step before commit. Surface LLM publication selection with a before/after comparison and relevance scores. Add a "Suggest alternative presets" button when the ATS warning fires for suppressed publications.

#### New Theme 8: Publication Type Taxonomy Gaps in Preset Schema (Change C)
**Raised by:** Resume Expert, Master CV Curator (2 of 14 personas, but high severity for academic users)

The current `types` field in the preset schema (journal_articles, book_chapters, conference_proceedings, preprints, technical_reports, patents) conflates several distinct academic publication categories: book authors vs. book editors, conference full papers vs. conference abstracts, journal articles vs. letters-to-editor, peer-reviewed vs. non-peer-reviewed. Master CV publications also need per-entry type tagging before type filters can work; the tagging workflow is not specified.

**Recommendation:** Expand the types schema with: `distinguish_peer_review`, `include_book_editors`, `include_conference_abstracts`, `include_letters_to_editor`. Add `most_recent_peer_reviewed` as a selection strategy option. Specify a publication type tagging workflow for the Master CV curator (BibTeX-type inference + validation warning before save). Add an `industry_research` publication heading variant for abbreviated highlights.

#### New Theme 9: Undo Cap May Be Too Tight for High-Volume Users (Change A)
**Raised by:** Power User, Recruiter-Ops (2 of 14 personas)

A 2 MB per-session cap with FIFO eviction may be too restrictive for users processing 50+ sessions or performing rapid Accept-all operations across large Experience sections. 20 concurrent sessions at 2 MB each = 40 MB undo storage; for network-backed deployments this may be unacceptable. No guidance is given on storage location or on configuring the cap for different deployment contexts.

**Recommendation:** Expose `undo_history_max_bytes` in the Settings UI (not only `config.yaml`). Provide a "Undo history budget" control (500 KB – 5 MB slider). Show live estimate: "Undo stack: 1.2 MB / 2 MB (~150 edits)." Add per-session "compact stack" option to clear history without losing current CV state.

---

### Updated Top 5 Recommended Enhancements

All five original enhancements have been implemented in the revised design. The following updated list reflects both implementation status and priorities introduced by changes A/B/C:

**1. ✅ Keyboard-Accessible Focus-Triggered Controls (Theme 1 — Implemented, §8, §9, §16)**
Three-tier control model; Tier 2 revealed on `:focus-within` and `:hover`; full keyboard binding table; ARIA spec with `role="toolbar"`, `aria-live="assertive"`. GAP-120 and GAP-72 resolved. *No further work needed at design level.*

**2. ✅ Word-Level Diff in the Proposed Row (Theme 3 — Implemented, §6)**
LCS-based word-level diff rendering in the Proposed row in every expanded element panel. Removed text in red strikethrough; added text in green underline. *No further work needed at design level.*

**3. ✅ Gate "Accept All" Behind at Least One Element Review (Theme 2 — Implemented, §8)**
Section-level "Accept all" disabled until at least one element has been explicitly acted upon. Count badge shows remaining. *No further work needed at design level.*

**4. ✅ Explicit Save Button with App-Level Undo Stack (Theme 4 — Implemented, §12, §17)**
Native `<textarea>` replaces contenteditable; explicit Save/Cancel buttons appear on typing; app-level undo stack in session JSON file, 2 MB cap, amber at 80%, FIFO eviction + toast at 100%. *Design complete; Themes 6 and 9 (above) add refinements.*

**5. ✅ "View Mode" Toggle: Smart vs. Manual Auto-Tab-Switching (Theme 5 — Implemented, §2)**
Smart (auto-switch, suppressed on unsaved edits) vs. Manual (user controls tab). Breadcrumb shows recommended tab. Default Smart for new users. *No further work needed at design level.*

**6. 🆕 FIFO Eviction Transparency + Proactive History Management (New Theme 6)**
Evicted entry log, explicit archive-confirmation modal, "Clear older edits" Settings option. Priority: **HIGH** — affects all user types, compliance contexts, and high-volume workflows.

**7. 🆕 Explicit Publication-Preset Confirmation Flow (New Theme 7)**
"Preview what this preset will do" step before commit; confirmation modal before publication suppression; before/after comparison for `most_relevant` LLM selection. Priority: **HIGH** — affects trust and academic/research users significantly.

---

*End of persona review. Original review date 2026-06-13; revised 2026-06-15 to reflect design changes A (session-persisted undo), B (target-aware page count badge), and C (position style presets with publication handling — GH #126).*
