<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# CV Builder UI Redesign Proposal

**Status:** Revised Draft — post persona review
**Date:** 2026-06-15
**Author:** Greg Warnes / Claude Code
**Related:** [tasks/gaps.md](gaps.md), [tasks/ui-review.md](ui-review.md), [tasks/persona-redesign-review.md](persona-redesign-review.md)

> **Revision notes (2026-06-15):** Incorporates the five cross-persona themes from the persona review synthesis:
> Theme 1 — hover-only → focus-triggered controls (Sections 8, 9, 16);
> Theme 2 — "Accept all" gating (Section 8);
> Theme 3 — word-level diff in Proposed row (Section 6);
> Theme 4 — explicit Save + app-level undo (Sections 12, 17);
> Theme 5 — Smart/Manual auto-tab-switch (Section 2).
> Additional changes: settings bar validation badge + preview/final label (Section 5),
> non-colour state indicators (Section 10), prefers-reduced-motion spec (Section 7),
> session-restore banner (Section 2), spell-check severity ordering (Section 13),
> resolved open design questions (Section 15).

---

## 1. Overview & Design Goals

### Problem with the Current Design

The current UI uses a **tab-per-section model**: the right panel exposes 26 viewer tabs (Job, Analysis, Experience, Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score, Rewrites, Spell Check, Layout Review, Generated Files, Master CV, Cover Letter, Screening, Interview Prep, etc.). Users must navigate between tabs to review and edit each section, with no persistent view of the final output.

Key pain points:

- **Context switching** — editing bullets in the Bullets tab gives no sense of how they appear in the actual document
- **No sense of the whole** — the resume only becomes visible at the Layout Review stage
- **Fragmented workflow** — suggestions (rewrites), spell corrections, inclusion decisions, and ordering are handled in separate tabs with separate UIs
- **Master CV gate** — the Master CV tab is only accessible in the `finalise` stage (GAP-41), even though users may need to update it at any time
- **Clarification questions buried** — questions surface in chat only, not adjacent to the analysis data they relate to

### Design Thesis

> **The document is the UI.**

All editing, review, suggestion-acceptance, and ordering happens *in place* within a live view of the document being worked on. The left pane handles conversation and command input; the right pane is a context-aware document viewer that automatically shows the most relevant document and always permits direct editing.

### Primary Goals

| Goal | Current | Proposed |
|------|---------|----------|
| See final output while editing | ❌ Only at layout stage | ✅ CV always visible |
| Edit elements in-place | ❌ DataTable per tab | ✅ Inline on the rendered document |
| Understand include/exclude decisions in context | ❌ Checkbox in table, separate from output | ✅ Ghost items inline within section |
| Act on AI suggestions without tab-switching | ❌ Rewrite Review tab, separate from output | ✅ Inline accept/decline on each element |
| Access Master CV at any time | ❌ Locked to finalise stage | ✅ Always-present tab |
| Clarify analysis questions near the relevant data | ❌ Chat only | ✅ Embedded inline in Analysis view |

---

## 2. Layout Architecture

```
┌────────────────────────┬────────────────────────────────────────────┐
│  LEFT PANE (~35%)      │  RIGHT PANE: Document Viewer (~65%)        │
│  Agent Chat & Input    │                                            │
│                        │  ┌──────────────────────────────────────┐  │
│  ┌──────────────────┐  │  │ [Master CV][Job][Analysis][CV]       │  │
│  │ Conversation     │  │  │ [Cover Letter][Screening][Prep] ...  │  │
│  │ history          │  │  │  ← document tabs (auto-switch)       │  │
│  │                  │  │  ├──────────────────────────────────────┤  │
│  │  Agent messages  │  │  │                                      │  │
│  │  and responses   │  │  │  Active document rendered here       │  │
│  │  scroll here     │  │  │  controls on hover or focus          │  │
│  │                  │  │  │  (for editable documents)            │  │
│  └──────────────────┘  │  │                                      │  │
│  ┌──────────────────┐  │  └──────────────────────────────────────┘  │
│  │ Input field      │  │                                            │
│  │ + action buttons │  │                                            │
│  └──────────────────┘  │                                            │
└────────────────────────┴────────────────────────────────────────────┘
```

**Core design principle:** The left pane is for interaction (chat, commands, agent responses, action buttons). The right pane is a document viewer — it renders whichever document is most relevant to the current workflow phase and permits direct editing within that document.

### Document Tabs

| Tab | Content | When auto-shown |
|-----|---------|-----------------|
| **Master CV** | Master CV data editor (structured, always editable) | Before job intake; any time |
| **Job** | Raw job description with keyword highlighting | Job intake phase |
| **Analysis** | Job analysis with embedded clarification questions | Job analysis phase |
| **CV** | Live HTML-rendered resume with inline controls | Customisation, rewrite, spell check, layout |
| **Cover Letter** | Generated cover letter (editable in-place) | Cover letter phase |
| **Screening** | Screening question responses (editable) | Screening phase |
| **Interview Prep** | Interview prep materials | Interview prep phase |
| **Thank You** | Thank-you letter draft | Thank-you phase |

**Auto-switching — Smart / Manual mode (Theme 5):**

The viewer supports two modes, selectable in Settings:

| Mode | Behaviour |
|------|-----------|
| **Smart** (default for new users) | Switches to the most relevant tab as the workflow advances. Before switching, a 1-second notification appears: *"Switching to CV view for Customisation phase ✕ Stay here."* Auto-switch is suppressed if the user has unsaved edits in the current tab. |
| **Manual** (default for returning users who have set a preference) | No automatic switching. The breadcrumb in the left-pane chat header always shows the recommended tab: *"Suggested: CV ▶"* — but the pane does not switch without explicit user action. |

The active tab is always remembered and restored on session reload. When a session is restored, a collapsible **session-restore banner** appears briefly at the top of the right pane:

> *"Session restored: 4 of 7 experiences selected · 12 skills · 3 pending rewrites · 2 clarification questions open."*

The banner auto-hides after 10 seconds or on dismiss.

### Workflow Step Pills

Move from the current horizontal step header to a **compact sticky top bar** with full phase names (not abbreviated) — never collapsed by default. A returning user must be able to see their workflow position at a glance without hovering or toggling. Example:

```
[Job Input] → [Analysis] → [Customise ●] → [Rewrites] → [Spell] → [Layout] → [Download]
```

The active step is visually distinguished (filled circle, bold label). Completed steps show a checkmark. The bar is always visible; it does not collapse.

---

## 3. Job Description View

- Job description text rendered with **keyword highlighting** — terms matching the CV's skills and extracted requirements are highlighted in amber; missing required terms highlighted in red
- Sticky mini-header shows: job title, company, ATS match score badge
- Scrollable; no truncation

---

## 4. Analysis View

- Displays structured job analysis: extracted requirements (must-have vs. nice-to-have), keyword map, ATS score breakdown, identified gaps
- **Clarification questions embedded inline** — each open question appears adjacent to the analysis section it relates to, not only in the chat:
  - Example: a question about "years of ML experience" appears within the Requirements section, next to the "Machine Learning" requirement row
  - Answering a question inline posts the answer to the left-pane chat and immediately updates the analysis state
- Analysis sections are collapsible (see Section 6 for the universal expand/collapse model)

---

## 5. CV View — Settings Bar

A **sticky settings bar** appears above the rendered resume, always visible while scrolling:

```
┌─────────────────────────────────────────────────────────────────┐
│  Length: [● Combined pages ○ Resume+Bib pages ○ Characters]     │
│  Style:  [Sidebar ▾]   ATS Score: 87%   Pages: ~2.1            │
│  [↺ Regenerate Preview]                                         │
└─────────────────────────────────────────────────────────────────┘
```

| Control | Options / Behaviour |
|---------|---------------------|
| **Length** | Radio: Combined pages · Resume + Bibliography pages · Character count. Updates the page-count/char-count indicator live. |
| **Style** | Dropdown: Sidebar (human-readable) · Plain/ATS · [additional registered styles]. Switching style triggers a preview regeneration. Active style is always shown in the label (e.g. "Style: ATS Plain ▾"). Download filenames include the style (`resume_ATS.pdf`, `resume_Sidebar.pdf`). |
| **ATS Score** | Live badge (green/amber/red). Label: "ATS: 87% (current CV)". Click opens ATS detail overlay showing matched/missing keywords. |
| **Pages** | Estimated page count with mini page-stack icon. Colour is based on the user's **target page length** (configured per-session or globally in settings): green when within target, amber when 10–25% over target, red when > 25% over target. Target defaults are position-type-aware when a position type is set (see [#126](https://github.com/Warnes-Innovations/cv-builder/issues/126)). Tooltip shows: "~2.1 pages · Target: 2 pages · 5% over target." |
| **Layout status** | Badge: "🔄 Preview — confirm to finalise" when layout is unconfirmed; "✅ Layout confirmed — ready to download" when confirmed. Clicking "🔄" opens the layout confirmation flow. |
| **Validation** | Badge: "✓ Valid" / "⚠ 3 issues" / "✗ 1 error". Updates live as the user edits. Click opens the full 17-check ATS validation report. |
| **Regenerate** | Re-renders the preview with current selections. |
| **Undo / Redo** | Undo (Ctrl+Z) / Redo (Ctrl+Y) buttons for session-scoped edits. Shows count of undo steps available. See Section 17. |

---

## 6. Universal Expand / Collapse Model

Every document in the right pane follows a **consistent two-state model** for sections and their contained elements. A single ▶/▼ toggle on the left of each section header controls the state.

### Section States

| State | What is shown |
|-------|--------------|
| **Collapsed** (default) | Section heading + a one-line summary badge: e.g. `"3 of 7 bullets included • 2 pending suggestions"` or `"Skills: Python, R, SQL +4 more"` |
| **Expanded** | Full section content — all included elements in final rendering order, plus excluded/hidden elements in ghost style (see Section 9) |

### Element States

| State | What is shown |
|-------|--------------|
| **Collapsed** (default) | Final/current text rendered as it will appear in the output. Tier-2 toolbar visible on hover or keyboard focus (see Section 9). High-severity flags (passive voice, missing result clause) show a small ⚠ badge inline with the text so they are visible without expanding. |
| **Expanded** | Multi-row detail panel (grows in-place, no modal): |
| | **Original** — text from Master CV as imported, read-only. Labelled "(from Master CV — read only)". |
| | **Current** — the version active in this session. Editable via explicit ✏️ Edit button (see Section 12). |
| | **Proposed** — LLM-suggested rewrite (if generated). Displayed with **word-level diff** (Theme 3): removed words in red strikethrough, added words in green underline, against the Current text. Editable before accepting. |
| | **Model recommendation** — badge: `Emphasize` · `Include` · `De-emphasize` · `Exclude`, with one-sentence rationale. |
| | **ATS comments** — keyword match notes, missing terms, density issues. Keywords grouped by canonical term (e.g. **Machine Learning** [ML, ML Ops]). Missing hard-requirement terms shown with a suggested insertion point. |
| | **Persuasion comments** — the eight persuasion checks rendered as prose: "Strong verb ✓ · Passive voice ⚠ · Result clause ✓ · Word count ✓". Issues weighted by persuasive impact (passive voice and missing result clause first). |

Expanding an element keeps it **in-place within the section** — no modal, no side panel. The element card grows vertically. The panel is `max-height: 60vh; overflow-y: auto` so it does not push the rest of the resume off-screen on small viewports. Collapsing restores the single-line rendered view.

Expanded element panel state **persists across document tab switches** within the same session (stored in session state). A dot indicator on the section summary badge shows "N elements expanded" so users can see at a glance that panels are open.

All text fields in the expanded element panel are edited via explicit **Save / Cancel** buttons (see Section 12 and Section 17 — not blur-save).

---

## 7. Workflow Integration — Contextual Highlighting

As the workflow phase advances, the right pane's CV view provides visual cues:

- The **section currently being worked on** receives a blue left-border accent and a subtle background tint
- **Sections not currently active** are at normal opacity — still readable, still editable, just not emphasised
- The left-pane chat header shows a breadcrumb: `Phase: Customisation › Experience`
- When the agent posts a message that references a specific element, the right pane **scrolls** to that element and highlights it

**Motion sensitivity (prefers-reduced-motion):** All animations (flash highlights, scroll animations, border transitions) must respect `prefers-reduced-motion: reduce`. Under reduced motion: scroll is instant (no smooth scroll), highlights are a static 2-second coloured background (no pulse or flash), and border transitions are instant. CSS:

```css
@media (prefers-reduced-motion: reduce) {
  .cv-element-highlight { animation: none; background-color: #fffacd; }
  html { scroll-behavior: auto; }
}
```

---

## 8. Section-Level Controls — Three-Tier Model (Theme 1)

Controls use a **three-tier visibility model** so all actions are reachable by mouse, keyboard, and touch without relying solely on hover.

### Tier 1 — Always visible (no hover required)

These appear permanently in the section header:

| Control | Action |
|---------|--------|
| **▶/▼** | Expand / collapse section (keyboard: Enter or Space when header is focused) |
| **(+N hidden)** badge | Count of excluded elements; click to reveal ghost items inline |
| **N pending** badge | Count of elements with unresolved suggestions; click to jump to first pending element |

### Tier 2 — Visible on hover OR keyboard focus (`:hover`, `:focus-within`)

These appear when the mouse enters the section header or it receives keyboard focus:

| Control | Action |
|---------|--------|
| **✨ Suggest section** | Trigger LLM include/exclude/reorder suggestions for all elements in this section |
| **↕ Reorder** | Enter drag-to-reorder mode (keyboard: use ↑↓ per-element buttons in Tier 2 below) |

### Section-level "Accept all" — gated (Theme 2)

The **Accept all** and **Decline all** buttons appear in the section header but are **disabled** (greyed out with tooltip "Review at least one suggestion first") until the user has explicitly expanded and acted on at least one pending element in the section. Once the gate is cleared, the buttons become active and show a count:

> "✅ Accept all 5 remaining · ❌ Decline all 5 remaining"

This preserves the protection against blind bulk-acceptance while keeping the batch workflow available.

---

## 9. Element-Level Controls — Three-Tier Model (Theme 1)

Each element container has `tabindex="0"` and `role="article"`, making it keyboard-focusable. Controls are split across three tiers:

### Tier 1 — Always visible

These appear permanently in the collapsed element view, requiring no hover:

| Control | Condition | Action |
|---------|-----------|--------|
| **⚠ badge** | High-severity persuasion flag (passive voice, missing result clause) | Visible in collapsed view; click to expand element and see full persuasion comments |
| **⊙ Pending** badge | Element has unresolved suggestion | Visible in collapsed view; amber colour + text label (not colour-only) |

### Tier 2 — Visible on hover OR keyboard focus

Rendered at 30% opacity at rest; full opacity on `:hover` or `:focus-within` on the element container. Keyboard users reach these by tabbing to the element, then tabbing through the toolbar buttons.

| Button | Keyboard shortcut | Action |
|--------|------------------|--------|
| **▶/▼** | Enter / Space | Expand / collapse element detail panel |
| **✗ / ✓** | Alt+X | Exclude (if included) or Include (if excluded) |
| **↑** | Alt+↑ | Move element up within section |
| **↓** | Alt+↓ | Move element down within section |

After ↑ or ↓, an `aria-live="assertive"` region announces: *"Moved up. Item 2 of 7."*

### Tier 3 — Visible only in expanded element panel

These appear inside the expanded detail panel, which is always persistent (never hover-gated):

| Button | Keyboard shortcut | Action |
|--------|------------------|--------|
| **✏️ Edit** | Alt+E | Open edit mode on Current text field |
| **✨ Suggest** | — | Generate LLM suggestion for this element |
| **✅ Accept** | Alt+A | Accept pending suggestion |
| **✏️ Accept & Edit** | — | Accept suggestion, then open it in edit mode before saving |
| **❌ Decline** | Alt+D | Decline pending suggestion |
| **🔄 Retry** | — | Retry suggestion generation |

Keyboard shortcuts are scoped to the element that currently has focus — Alt+A does not fire globally.

A **keyboard shortcut help overlay** is available at any time via the **?** key (or the ⌨ icon in the settings bar). See Section 16 for the full shortcut table.

---

## 10. Visual States for Elements

Every state uses **both colour and a non-colour indicator** (icon, label, or border pattern) so colour-blind users and screen reader users can distinguish states without relying on colour alone.

| State | Colour | Non-colour indicator | Screen reader announcement |
|-------|--------|---------------------|---------------------------|
| **Active / Included** | Normal | No badge | — |
| **Excluded / Hidden** | Muted gray, 50% opacity | Strikethrough text + dashed left border + "excluded" label | "Excluded" in `aria-label` |
| **Has pending suggestion** | Amber left border + amber background tint | "⊙ Pending suggestion" text badge (Tier 1, always visible) | `aria-label` includes "Pending suggestion" |
| **Suggestion accepted** | 500ms green border flash | "✓ Accepted" badge fades out over 1s | Live region: "Accepted. Bullet N updated." |
| **Suggestion declined** | 300ms red border flash | "✗ Declined" badge fades out over 1s | Live region: "Declined. Suggestion removed." |
| **Workflow focus** | Blue left-border accent + blue background tint | Section badge labelled "Current focus" | — |
| **Just moved / reordered** | 300ms yellow fade | "↕ Moved" badge fades out | Live region: "Moved up. Item N of M." |
| **In edit mode** | Visible input border | Textarea cursor + "Editing" label above field | Focus moves to textarea; `aria-label="Editing: [field name]"` |
| **Saved / confirmed** | Green checkmark fades | "✓ Saved" text fades out | Live region: "Saved." |
| **High-severity flag** | — | ⚠ badge inline in collapsed text (always visible, no hover) | `aria-label` includes "Warning: [flag name]" |

All flash/fade animations respect `prefers-reduced-motion` (see Section 7).

---

## 11. Hidden Element Reveal Pattern

- Each section header shows a **(+N hidden)** badge when excluded elements exist
- Clicking the badge — or activating "Show hidden" from the section hover toolbar — reveals ghost-style excluded items **inline** within the section, in their last-known position
- Ghost elements show all element toolbar buttons, but the ✓/✗ button shows **"Include"** rather than "Exclude"
- Ghost elements cannot be reordered until included
- Clicking "Show hidden" again collapses them back out of view

---

## 12. In-Place Editing Across All Documents (Theme 4)

Wherever content appears in the right pane, it is editable in-place. All editable fields use native `<textarea>` elements (not `contenteditable`) for predictable keyboard behaviour, reliable Ctrl+Z within the field, and clean plaintext output to the session state.

| Document | Editable fields | Save model |
|----------|----------------|------------|
| **CV** | Bullet text, summary, tagline, user-defined section headings, skills list items | Explicit Save (see below) |
| **Cover Letter** | All paragraph text, salutation, sign-off | Explicit Save |
| **Screening** | Response text for each question | Explicit Save |
| **Master CV** | All fields (name, contact, experience entries, skills, achievements, publications, summary variants) | Explicit Save + phase check + timestamped backup |
| **Analysis** | Clarification question answer fields only | Posts to chat immediately on submit; no separate save step |

### Explicit Save model (replaces blur-save)

When the user clicks ✏️ Edit on an element (Tier 3 control, Section 9):

1. The Current text field opens as a `<textarea>` with the cursor at end of text
2. An **"Editing" label** appears above the field (`aria-label="Editing: [field name]"`)
3. Two buttons appear below: **Save** (Ctrl+Enter) and **Cancel** (Escape)
4. Typing does **not** update session state — state is only written on explicit **Save**
5. On Save: the new text is pushed to the app-level undo stack, session state is updated, the textarea collapses back to rendered text, and a "✓ Saved" badge fades out
6. On Cancel: textarea collapses with no state change; undo stack is not modified

For **Master CV fields**, Save additionally:
- Runs `_require_master_data_write_phase` (blocks write if a job customisation is active, showing: *"Cannot edit master data while a job customisation is active. Archive the job first."*)
- Creates a timestamped backup of `Master_CV_Data.json` before writing
- Runs schema validation before write
- Shows a dirty indicator (red dot on the Master CV tab) until saved; "Unsaved changes" tooltip on the tab

A **"Review-only mode"** toggle is available in the settings bar. When enabled, all ✏️ Edit buttons are hidden and `<textarea>` fields are non-interactive, so users can scan without accidentally triggering edits.

---

## 13. Spell Check Integration

Spell and grammar issues are surfaced **inline** on the CV view rather than in a separate tab. The dedicated Spell Check workflow step now routes to the CV view with issues highlighted, rather than a separate tab.

- Flagged text is underlined — red for spelling errors, blue dashes for grammar/style
- Clicking the underline (or pressing Enter when the underlined text is focused) shows an inline popover: correction options + "Ignore" + "Ignore all"
- Accepting a correction pushes the change to the app-level undo stack and updates the element text in-place
- The settings bar shows a **"Spell: N issues"** badge (red if any spelling errors, amber if grammar-only). The badge counts down as issues are resolved.

**Severity ordering:** Issues are surfaced in this priority order, not document order:

1. Spelling errors in proper nouns (company names, degree names, technology names)
2. All other spelling errors
3. Grammar / sentence structure issues in bullet text
4. Style suggestions (comma placement, word choice)

This ensures a missed name typo is never buried below a comma suggestion.

**ATS safety:** Spell-check underlines and popover HTML are never included in DOCX or PDF export. All markup is stripped at generation time.

---

## 14. Current Design vs. Proposed Design — Comparison

| Aspect | Current Design | Proposed Design |
|--------|---------------|-----------------|
| Right pane | 26 tabs, one section per tab | Document viewer with 7 document tabs |
| Resume visibility | Only visible in Layout Review tab | Visible throughout CV phase |
| Element editing | DataTable per section tab | Three-tier toolbar + expand panel, in-place |
| Suggestion workflow | Rewrite Review tab (before/after cards) | Inline per-element; word-level diff in expand panel |
| Excluded items | Not visible in review tables | Ghost items revealed on demand within section |
| Workflow context | Step pills in header bar | Sticky step bar (full names) + auto-tab-switching |
| Spell check | Separate Spell Check tab | Inline underline; severity-ordered; routes through CV view |
| Master CV access | Locked to finalise stage (GAP-41) | Always-available tab; phase-gated Save |
| Clarification questions | Chat only | Embedded in Analysis view; answers post to chat |
| Section overview | No summary; must expand tab | Collapsed summary badge (counts + pending) |
| Element detail | No original/proposed comparison | Expand panel: Original / Current / Proposed (word diff) / Recommendation / ATS / Persuasion |
| Settings | Scattered (model selector, settings modal) | Sticky settings bar: length, style, ATS score, validation, layout status, undo |
| Keyboard access | Hover-only controls (GAP-120, GAP-72) | Three-tier model; all controls focus-triggered; keyboard shortcuts |
| Undo | No app-level undo; contenteditable Ctrl+Z unreliable | App-level undo stack; explicit Save; Ctrl+Z / Ctrl+Y |
| Auto-tab switching | N/A (tab-per-section) | Smart / Manual mode; suppressed on unsaved edits |
| Bulk accept | No section-level bulk action | Accept all gated — requires ≥1 element reviewed first |
| Session restore | Confirmation message only | Session-restore banner with decision summary |
| Animations | No reduced-motion support | `prefers-reduced-motion` respected throughout |

---

## 15. Resolved Design Questions

Previously open; resolved by persona review recommendations.

1. **Tab bar overflow** — Overflow tabs appear behind a "More ▾" button with `aria-label="Show more documents"`. Clicking opens a keyboard-navigable dropdown (arrow keys, Enter to select). The active tab is always in the visible bar, never in the overflow.

2. **Simultaneous CV + Job view** — Not implemented in the initial redesign. The Analysis view already embeds inline context from the job. A future enhancement could offer a sub-split, but the tab model is sufficient for v1.

3. **Element expand persistence** — Expanded element panels **persist across document tab switches** within the same session (stored in session state). Panels do not collapse on tab-away. A dot indicator on section summary badges shows how many elements are currently expanded. See Section 6.

4. **Mobile / narrow window** — Below 900px viewport width, the split pane stacks vertically: left pane (chat) above, right pane (document viewer) below. A toggle button switches between panes to recover vertical space. Not a priority for v1 (local desktop app), but the CSS grid must not break at narrow widths.

5. **Undo** — Resolved via app-level undo stack (Section 17). Native `<textarea>` elements replace `contenteditable`. Ctrl+Z within an open textarea reverts within the field (browser-native, reliable for `<textarea>`); Ctrl+Z after Save reverts the last committed edit via the app undo stack.

6. **Drag-to-reorder accessibility** — Keyboard reorder via ↑/↓ Tier 2 buttons (Section 9) is the **primary** reorder interface. Drag-to-reorder is an enhancement for mouse users. After each ↑/↓ key press, `aria-live="assertive"` announces the new position. Drag-and-drop is never the only path to any action.

---

## 16. Keyboard Navigation & Accessibility Specification

### Focus order

```
[Workflow step bar pills] → [Left pane: chat messages] → [Left pane: input field]
→ [Right pane: document tabs] → [Right pane: section headers (Tier 1 controls)]
→ [Right pane: elements within section] → [Right pane: element Tier 2 toolbar]
→ [Right pane: expanded panel Tier 3 controls]
```

Tab order follows visual left-to-right, top-to-bottom reading order. The workflow step bar, document tabs, section headers, and element containers all carry `tabindex="0"`. No `tabindex` values > 0 are used.

### Keyboard shortcuts (global scope)

| Key | Action |
|-----|--------|
| **?** | Open keyboard shortcut help overlay |
| **Ctrl+Z** | Undo last committed edit (app undo stack) |
| **Ctrl+Y** | Redo |
| **Ctrl+/** | Toggle Review-only mode (lock/unlock all editing) |

### Keyboard shortcuts (element-scoped — fire on focused element container)

| Key | Action |
|-----|--------|
| **Enter / Space** | Expand / collapse element detail panel |
| **Alt+X** | Toggle include / exclude |
| **Alt+↑** | Move element up within section |
| **Alt+↓** | Move element down within section |
| **Alt+E** | Open edit mode on Current text field (opens Tier 3 panel if not already open) |
| **Alt+A** | Accept pending suggestion |
| **Alt+D** | Decline pending suggestion |
| **Ctrl+Enter** | Save edit (when in edit mode) |
| **Escape** | Cancel edit / collapse expanded panel |

### ARIA requirements

- Each element container: `role="article"`, `tabindex="0"`, `aria-label="[element type]: [text]. [state flags]"` (e.g. `"Bullet: Led migration of pipeline to AWS. Pending suggestion."`)
- Each section header: `role="heading"` at appropriate level, `aria-expanded`, `tabindex="0"`
- Section Tier 2 toolbar: `role="toolbar"`, `aria-label="[Section name] controls"`
- Element Tier 2 toolbar: `role="toolbar"`, `aria-label="Element controls"`
- Document tabs: `role="tablist"` / `role="tab"` / `aria-selected` / `tabindex` (ARIA tabs pattern)
- Live region for action feedback: `<div role="status" aria-live="assertive" aria-atomic="true" class="sr-only">` — updated after every user action that changes element state
- Expanded element panel: `role="region"`, `aria-label="[element text] — details"`

### Resolves

- GAP-120 (Tab `<div>` elements keyboard-inaccessible) — all interactive containers carry `tabindex="0"` and keyboard event handlers
- GAP-72 (Workflow step pills have no `tabindex`) — step pills carry `tabindex="0"` and Enter/Space activation

---

## 17. Undo & Edit History (Theme 4)

### App-level undo stack

An **undo stack is stored in the session JSON file** for each job, persisting across browser sessions. Closing and reopening the browser (or switching to a different computer using the same session directory) fully restores the undo/redo stack. The stack is separate from and does not interact with browser `Ctrl+Z` on `<textarea>` fields (which only reverts within the currently open field before Save).

### Entry format: diff-based, not snapshots

Every stack entry stores only the **minimal diff needed to reverse the operation** — never a full document or section snapshot. This keeps entries small (typically 100–400 bytes each) and makes the step count the meaningful unit of undo depth.

| Operation | Entry format |
|-----------|-------------|
| Save on a Current text field | `{ "op": "edit", "path": "experience[2].bullets[0].current", "prev": "old text", "ts": 1749945600 }` |
| Accept suggestion | `{ "op": "accept", "path": "experience[2].bullets[0]", "prev_current": "old current", "prev_proposed": "proposed text", "ts": ... }` |
| Decline suggestion | `{ "op": "decline", "path": "experience[2].bullets[0]", "prev_proposed": "proposed text", "ts": ... }` |
| Include / exclude toggle | `{ "op": "toggle", "path": "experience[2].bullets[0]", "prev": false, "ts": ... }` |
| Move up / down | `{ "op": "move", "path": "experience[2].bullets", "elem": "bullets[2]", "prev_index": 2, "ts": ... }` |
| Accept all (section) | `{ "op": "accept_all", "path": "experience[2]", "ts": ..., "entries": [ { "elem": "bullets[0]", "prev_current": "...", "prev_proposed": "..." }, ... ] }` — one compound entry containing per-element diffs; counts as **1 undo step** |

`accept_all` is a compound entry that stores per-element diffs rather than a full section snapshot. A single "Accept all 12 bullets" push costs roughly 12 × 300 bytes = 3.6 KB, compared to a full section snapshot that might be 20–50 KB.

The stack is stored in the session file under `undo_stack` and `redo_stack` keys.

### Undo / Redo controls

- **Ctrl+Z** — undo the most recent stack entry; announce via live region: *"Undone: edit to Bullet 3."*
- **Ctrl+Y** — redo the most recently undone entry
- **Undo / Redo buttons** in the settings bar (Section 5) show the count of available steps: "↩ Undo (47)" / "↪ Redo (3)"

### Stack size limit and user warning

The primary limit is a **step count**, making the undo depth immediately interpretable ("I can undo 500 things"). A secondary byte cap acts as a safety floor against pathologically large entries.

| Limit | Default | Config key |
|-------|---------|------------|
| Primary: max steps | **500 steps** | `undo_history_max_steps` |
| Secondary: max bytes | **2 MB** | `undo_history_max_bytes` |

Whichever limit is hit first triggers eviction. At typical entry sizes (100–400 bytes), the 500-step limit is almost always the binding constraint; the 2 MB byte floor is a backstop for compound `accept_all` entries across very large sections.

At 500 steps the limit is generous enough that normal sessions will not approach it, so no in-app warning is shown as the stack fills. When the limit is reached, the oldest entry is silently dropped via FIFO to make room. The redo stack is cleared when the limit is first hit.

The 2 MB secondary byte cap triggers a one-time toast if hit before the step limit — this signals a pathologically large single entry (e.g. an `accept_all` across an unusually large section): "An unusually large edit has filled your undo history. Older edits have been dropped to make room."

Whenever either cap triggers eviction, the backend **logs a warning** to the application log:

```
WARN [undo] session=<session_id> cap=steps limit=500 evicted=1 remaining=499
WARN [undo] session=<session_id> cap=bytes limit=2097152 entry_size=<n> evicted=1
```

This makes capacity issues visible in logs for diagnosis without surfacing them to the user in normal operation.

Both limits can be adjusted in `config.yaml`. Defaults are chosen to cover typical long sessions (500 steps ≈ several hours of active editing) while staying well within typical session file size budgets.

### Stack boundaries

- The undo stack **persists across browser sessions** — it is stored in the session JSON file on disk, not in browser memory
- Returning to a session fully restores the undo/redo state as of the last browser close; the session-restore banner announces the available step count: "↩ Undo history restored: 47 steps available."
- Master CV saves are **not** on the session undo stack; they are reverted via the timestamped file backup (a separate restore path accessible from the Master CV tab)
- After a session is archived / finalised, the undo stack is cleared and the `undo_stack` key is removed from the session file to reclaim space

### Revert to session start

A **"Revert CV to session start"** button is available in a "Danger zone" section of the Settings modal. It restores the CV to the state it was in when the user entered the Customisation phase (stored as a snapshot in the session file). This is a non-undoable destructive action and requires explicit confirmation: *"Revert all CV changes? This cannot be undone. The undo history will also be cleared."*

---

## 18. Automatic Error Reporting

When an unhandled error occurs, the application automatically emails the developer a report containing enough context to reproduce and fix the issue. No user action is required.

### Trigger conditions

| Source | Trigger |
|--------|---------|
| Backend (Python) | Any unhandled exception that produces a 5xx HTTP response |
| Backend (Python) | Any unhandled exception in a background task or LLM call |
| Frontend (JavaScript) | `window.onerror` / `unhandledrejection` events — POSTed to `/api/error-report`, which routes through the same email pipeline |

Errors that are caught and handled gracefully (e.g. LLM timeout retried successfully) do not trigger a report.

### Error dump (full reproduction package)

When an error fires, the application writes a **dump archive** to disk containing everything needed to reproduce the error exactly. This is enabled by default and controlled by `error_reporting.create_dump`.

The dump is a zip file saved to `error_reporting.dump_dir` (default: `~/CV/cv-builder/error_dumps/`), named `cv-builder-error-<timestamp>-<fingerprint>.zip`.

Contents of the zip:

| File | Contents |
|------|----------|
| `report.json` | Structured metadata: timestamp, session ID, phase, user action, exception type + message, fingerprint |
| `traceback.txt` | Full Python traceback (or JS stack trace for frontend errors) |
| `session.json` | **Complete** session file as it existed at the moment of the error — includes all CV content, undo stack, LLM conversation history, and workflow state |
| `request.json` | HTTP method, endpoint, full request body, and relevant headers |
| `conversation.json` | Full LLM message history for the in-flight LLM call, if the error occurred during one |
| `config.yaml` | Active configuration with all secret fields (`api_keys.*`, `smtp.username`, `smtp.password`) replaced by `"<redacted>"` |
| `pip_freeze.txt` | Output of `pip freeze` at runtime — exact installed package versions |
| `environment.json` | Python version, platform, git commit hash / `git describe` output |

The dump provides a complete, self-contained reproduction package: given the dump, a developer can restore the exact session state, replay the exact request, and reproduce the error deterministically.

### Email report contents

The email body is a concise summary that references the dump file for full detail:

```
Subject: [cv-builder] ERROR — <ExceptionType>: <short message> (<session_id>)

Timestamp:      2026-06-16 14:32:07 UTC
Session ID:     abc123
Workflow phase: customisation
User action:    POST /api/session/abc123/accept-suggestion (element: experience[2].bullets[0])

Exception
---------
<ExceptionType>: <full message>

Traceback (most recent call last):
  File "...", line N, in ...
    ...

Session state summary
---------------------
Phase:            customisation
Elements total:   47
Elements decided: 12
Pending rewrites: 3
Undo stack depth: 31 steps

Dump
----
~/CV/cv-builder/error_dumps/cv-builder-error-20260616T143207-a3f9c1.zip
(full session state, request, LLM conversation, config, pip freeze)
```

The email always includes the traceback and structural session summary. The dump file path is always included in the email body. If `error_reporting.email_attach_dump` is `true`, the zip is also attached directly to the email (disabled by default as dumps may be large).

### Deduplication

Errors are fingerprinted by hashing the exception type + normalized traceback (file paths stripped to relative, line numbers included). If the same fingerprint has been reported within the `rate_limit_minutes` window, the report is suppressed and a single line is written to the application log instead:

```
WARN [error_reporting] duplicate suppressed: <fingerprint> (3 occurrences in last 60 min)
```

### Configuration

New `error_reporting` section in `config.yaml` (sibling of `logging`):

```yaml
error_reporting:
  enabled: true
  developer_email: greg@warnes-innovations.com
  smtp:
    host: localhost
    port: 25
    use_tls: false
    username: ""
    password: ""
  rate_limit_minutes: 60          # min interval between reports for the same error fingerprint
  create_dump: true               # write full reproduction zip to dump_dir on each error
  dump_dir: ~/CV/cv-builder/error_dumps
  email_attach_dump: false        # attach the dump zip to the email (may be large)
```

When `enabled: false`, errors are still logged at ERROR level but no email is sent. This allows the email pipeline to be disabled in development without changing any other behaviour.

### Logging

Every triggered report (sent or suppressed) is logged:

```
INFO  [error_reporting] dump written: ~/CV/cv-builder/error_dumps/cv-builder-error-20260616T143207-a3f9c1.zip
INFO  [error_reporting] report sent: <fingerprint> → greg@warnes-innovations.com
WARN  [error_reporting] duplicate suppressed: <fingerprint> (N occurrences in last 60 min)
ERROR [error_reporting] dump failed: <reason>
ERROR [error_reporting] failed to send report: <smtp error>
```

If the SMTP send itself fails, the failure is logged at ERROR level but does not propagate — a reporting failure must never cause a secondary error or affect the user response.

### Developer tools

Three scripts in `scripts/dev/` support working with error dumps.

---

#### `scripts/dev/error_replay.py <dump.zip>`

Restores the app to the exact state captured in a dump so the error can be reproduced interactively.

Steps performed:

1. Extracts the dump zip to a temp directory
2. Compares `pip_freeze.txt` against the current environment; prints a diff and warns if packages differ (does not auto-install — environment management is left to the developer)
3. Copies `session.json` into the configured `session_dir` under a replay-prefixed name (e.g. `replay-<fingerprint>-<timestamp>/session.json`) so it does not overwrite live sessions
4. Prints the original failing request for manual replay:

   ```text
   Replay session loaded: replay-a3f9c1-20260616T150000
   Start the app, then reproduce with:
     curl -X POST http://127.0.0.1:5001/api/session/replay-a3f9c1-20260616T150000/accept-suggestion \
          -H 'Content-Type: application/json' \
          -d '{"element_path": "experience[2].bullets[0]", "op": "accept"}'
   ```

5. Optionally launches the app automatically (`--launch`) and opens the session in the browser

```text
usage: error_replay.py [-h] [--launch] [--port PORT] dump_zip
```

---

#### `scripts/dev/error_dump_show.py <dump.zip>`

Pretty-prints the contents of a dump without manual unzipping. Useful for triaging a dump received by email.

Output sections (each collapsible with `--section`):

- Summary: timestamp, session ID, phase, user action, exception type + message
- Traceback
- Session state summary (counts, phase, undo depth)
- Request details
- LLM conversation (last N turns, default 5; `--all-turns` for full history)
- Environment diff vs. current environment (highlights any package version mismatches)

```text
usage: error_dump_show.py [-h] [--section {summary,traceback,session,request,llm,env}]
                           [--all-turns] dump_zip
```

---

#### `scripts/dev/error_dump_clean.py`

Removes old dump files to prevent unbounded growth of `dump_dir`.

Behaviour:

- Default: delete dumps older than 30 days
- `--keep-last N`: always keep the N most recent dumps regardless of age
- `--dry-run`: print what would be deleted without deleting anything
- `--fingerprint FP`: delete all dumps matching a specific error fingerprint (useful after a bug is fixed)

```text
usage: error_dump_clean.py [-h] [--days DAYS] [--keep-last N]
                            [--fingerprint FP] [--dry-run]
```

A cron-style auto-cleanup can be enabled in `config.yaml`:

```yaml
error_reporting:
  dump_retention_days: 30   # 0 = keep forever; auto-cleanup runs at app startup
```

When `dump_retention_days > 0`, the app deletes dumps older than that threshold each time it starts, equivalent to running `error_dump_clean.py --days N` automatically. The cleanup result is logged:

```text
INFO  [error_reporting] dump cleanup: deleted 3 dumps older than 30 days, 2 remaining
```
