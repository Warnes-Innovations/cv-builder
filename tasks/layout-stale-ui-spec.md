<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Layout Staleness UI Specification

**Last Updated:** 2026-03-25

## Purpose

This specification defines how the web UI must communicate that a previously
generated layout preview or final output is stale after upstream content edits.

The design is intentionally mapped to the currently implemented state model:

1. Main workflow phase in `stateManager.getPhase()` / backend `state['phase']`
2. Staged generation substate in
   `stateManager.getGenerationState()` / backend `state['generation_state']`

This spec does not introduce a second independent workflow model.

## Source State Model

### Authoritative main phase values

The primary workflow uses these backend-aligned phase values:

1. `init`
2. `job_analysis`
3. `customization`
4. `rewrite_review`
5. `spell_check`
6. `generation`
7. `layout_review`
8. `refinement`

### Authoritative staged-generation values

The layout/output freshness model derives from `generationState`:

1. `phase`
2. `previewAvailable`
3. `layoutConfirmed`
4. `finalGeneratedAt`
5. `pageCountEstimate`
6. `pageCountExact`
7. `pageCountConfidence`
8. `pageWarning`
9. `layoutInstructionsCount`

The currently implemented staged-generation `phase` values are:

1. `idle`
2. `layout_review`
3. `confirmed`
4. `final_complete`

## Freshness Definition

### Fresh

Fresh means the latest accepted content decisions are reflected in the current
layout preview and final outputs.

The UI treats layout as fresh when either:

1. `generationState.previewAvailable` is `false`
2. No content-changing action has happened since the last preview/final render

### Stale

Stale means at least one upstream content-changing action occurred after the
most recent layout preview or final output was generated.

Examples of stale-triggering actions:

1. Experience include/exclude/emphasize decision changes
2. Experience bullet edits
3. Skill include/exclude/emphasize decision changes
4. Achievement decision or text changes
5. Summary selection changes
6. Publication decision changes
7. Accepted rewrite changes
8. Accepted spell-check changes when they affect rendered text
9. Any server-side rerun that changes rendered content before finalisation

### Not stale

These actions do not mark layout stale by themselves:

1. Opening a prior tab without editing
2. Viewing ATS report
3. Opening Job Analysis modal
4. Switching tabs inside the same phase
5. Refreshing ATS score only

## Derived UI Flag

Add a derived client-side selector named `isLayoutStale`.

The selector should evaluate to `true` when all of the following hold:

1. `generationState.previewAvailable === true`
2. The user has made at least one stale-triggering content change since the
   most recent preview generation or final generation

Recommended implementation note:

1. Track a monotonic content revision stamp for session-backed content changes
2. Track `lastPreviewContentRevision`
3. Track `lastFinalContentRevision`
4. Compute staleness from revision comparison instead of ad hoc booleans

That keeps the stale signal deterministic across restore/reconnect flows.

## Top-Level Status Chip

### Placement

Render the stale chip in the position bar action cluster adjacent to ATS, but
not inside the ATS badge.

Placement order:

1. ATS score badge and summary
2. Layout freshness chip
3. ATS Report button
4. Job Analysis button

### Component behavior

The chip must be a button, not passive text.

Click behavior:

1. Switch to the `layout` tab
2. If current phase is earlier than `layout_review`, do not force phase
   mutation
3. Show the inline layout stale callout at the top of the Layout Review tab

### Labels

Use exactly these labels:

1. Fresh preview state: `Layout current`
2. Stale preview state: `Layout outdated`
3. Final output stale state after final generation: `Files outdated`

### Assistive text

Use these `aria-label` patterns:

1. `Layout current. Preview matches latest content.`
2. `Layout outdated. Activate to review and regenerate preview.`
3. `Files outdated. Activate to review layout and regenerate outputs.`

### Callout Visual Treatment

Use existing palette families already present in the app.

Fresh chip:

1. Background: `#ecfdf5`
2. Border: `#86efac`
3. Text/icon: `#166534`
4. Icon: `✓`

Stale chip:

1. Background: `#fffbeb`
2. Border: `#fcd34d`
3. Text/icon: `#92400e`
4. Icon: `!`

Critical stale after final generation:

1. Background: `#fef2f2`
2. Border: `#fca5a5`
3. Text/icon: `#b91c1c`
4. Icon: `↻`

### Motion

Allowed motion is subtle only:

1. On transition to stale: 1 soft pulse over 1.2s
2. No infinite blinking
3. No bounce animation

## Workflow Step Treatment

### Layout step warning state

When `isLayoutStale === true`, decorate the `Layout` workflow step with a
warning affordance even if the current main phase is not `layout_review`.

Required behavior:

1. Preserve the existing active/completed/upcoming state logic
2. Add a stale modifier class on top of existing state
3. Show a small warning dot or badge on the `Layout` step label

Label text remains `🎨 Layout`.

Supplementary badge text:

1. Desktop: `Outdated`
2. Narrow viewports: icon only

Step stale colors:

1. Background tint: `#fffbeb`
2. Border/accent: `#f59e0b`
3. Text: `#92400e`

## Layout Review Tab Inline Callout

When the user opens the Layout Review tab while `isLayoutStale === true`, show a
callout above the preview.

### Copy

Title:

`Layout preview is out of date`

Body:

`You changed CV content after the current preview was generated. Regenerate the preview before trusting page count, layout feedback, or final files.`

Primary action:

`Regenerate preview`

Secondary action:

`Keep reviewing current preview`

### Visual treatment

1. Background: `#fffbeb`
2. Border-left: `4px solid #f59e0b`
3. Body text: `#78350f`

## Downstream Tab Treatment

When `isLayoutStale === true` and the user has already produced final files,
the downstream tabs should also signal stale state.

Apply a subtle stale label to:

1. `Generated CV`
2. `File Review`
3. `Finalise`

Use suffix text:

1. `Outdated`

Do not rename the tabs themselves.

## State Transition Rules

### Transition: no preview yet

Input state:

1. `generationState.previewAvailable === false`

UI state:

1. No stale chip
2. No layout warning marker
3. No downstream outdated badges

### Transition: preview generated

Trigger:

1. `POST /api/cv/generate-preview` succeeds

Required state update:

1. `generationState.phase = 'layout_review'`
2. `generationState.previewAvailable = true`
3. `generationState.layoutConfirmed = false`
4. `isLayoutStale = false`

### Transition: layout instruction applied

Trigger:

1. `POST /api/cv/layout-refine` succeeds

Required state update:

1. Keep `generationState.phase = 'layout_review'`
2. Keep `previewAvailable = true`
3. Keep `layoutConfirmed = false`
4. Reset staleness to `false`

### Transition: layout confirmed

Trigger:

1. `POST /api/cv/confirm-layout` succeeds

Required state update:

1. `generationState.phase = 'confirmed'`
2. `generationState.layoutConfirmed = true`
3. `isLayoutStale = false`

### Transition: final files generated

Trigger:

1. `POST /api/cv/generate-final` succeeds

Required state update:

1. `generationState.phase = 'final_complete'`
2. `generationState.finalGeneratedAt = <timestamp>`
3. `isLayoutStale = false`

### Transition: user edits upstream content after preview or final

Trigger examples:

1. Save achievement edits
2. Submit skill decisions
3. Submit rewrite decisions
4. Submit spell-check changes affecting content

Required state update:

1. Do not mutate main phase automatically
2. Do not delete existing preview/final artifacts automatically
3. Set `isLayoutStale = true`
4. If `generationState.phase === 'final_complete'`, use the critical stale
   presentation `Files outdated`

### Transition: user revisits Layout and regenerates preview

Trigger:

1. User clicks stale chip or opens `Layout`
2. User triggers preview regeneration

Required state update:

1. `generationState.phase = 'layout_review'`
2. `generationState.previewAvailable = true`
3. `generationState.layoutConfirmed = false`
4. `isLayoutStale = false`
5. Clear downstream outdated badges until a new upstream content change occurs

## Phase and Generation-State Matrix

| Main phase | Generation phase | Derived stale | Top-level label | Layout step marker | Downstream marker |
| --- | --- | --- | --- | --- | --- |
| `init` to `spell_check` | `idle` | false | none | no | no |
| `generation` | `idle` | false | none | no | no |
| `layout_review` | `layout_review` | false | `Layout current` | normal | no |
| `layout_review` | `layout_review` | true | `Layout outdated` | warning | optional |
| `refinement` | `confirmed` | false | `Layout current` | normal | no |
| `refinement` | `final_complete` | false | `Layout current` | normal | no |
| `customization` to `refinement` | `layout_review` or `confirmed` or `final_complete` | true | `Layout outdated` or `Files outdated` | warning | yes when final files exist |

## Non-Goals

This spec does not require:

1. Automatic preview regeneration on every edit
2. Automatic final regeneration on every edit
3. Destructive deletion of prior outputs
4. Forced navigation to Layout after every content change

## Acceptance Criteria

1. After any content edit made after preview generation, the top bar shows a
   stale chip without requiring a page reload.
2. Clicking the stale chip takes the user to the Layout Review tab.
3. The Layout workflow step visibly indicates staleness while preserving
   existing step completion semantics.
4. If final files already exist, File Review and Finalise also show outdated
   state.
5. Regenerating the preview clears stale indicators until the next content
   change.
6. Restoring a session reproduces stale state correctly from persisted
   revision/freshness data.
