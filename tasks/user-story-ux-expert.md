# User Story: UI/UX Expert Perspective
**Persona:** A senior interaction designer / usability specialist evaluating the web application's workflow and interface  
**Scope:** All user-facing screens, interactions, flows, and feedback mechanisms in the web UI  
**Format:** Evaluation criteria presented as acceptance tests, with specific failure modes to guard against

---

## US-U1: Workflow Orientation and Progress Visibility

**As a** UI/UX expert,  
**I want to** verify that users always know where they are in the workflow, what they have completed, and what comes next —  
**So that** cognitive load is minimised and users never feel lost or uncertain about the application state.

**Evaluation Criteria:**
1. **Step indicator** — A persistent, visible progress indicator must show the named workflow stages (e.g., Job Input → Analysis → Review → Generate) and which stage is active. Stage labels must be meaningful, not numeric-only.
2. **Completed state signalling** — Completed steps must be visually distinct from the active step and upcoming steps. Checkmarks, filled indicators, or greyed-out labels all acceptable; no distinction is not acceptable.
3. **Back-navigation safety** — Users must be able to return to a previous step without losing work done in subsequent steps, unless leaving would genuinely invalidate downstream state (in which case a clear warning is required before proceeding).
4. **Session restoration context** — When a user returns to a persisted session, the UI must orient them immediately: which job, which stage, and when it was last active.

**Failure Modes to Guard Against:**
- Linear "next/back" buttons with no state labels, leaving users uncertain of their position.
- Back navigation that silently discards approved content.
- Returning to a session shows a blank state instead of last-known stage with populated data.
- Progress indicator only updating after a full page reload.

**Acceptance Criteria:**
- Stage indicator present and accurate on every step view; active stage is unambiguous.
- Back navigation preserves previously approved content; any destructive action requires an explicit confirmation dialogue.
- Returning to a saved session lands the user on their last active step with previously entered/approved data intact.
- Stage indicator updates without requiring a page reload.

---

## US-U2: Job Input and URL Ingestion UX

**As a** UI/UX expert,  
**I want to** verify that the job input step presents clear, low-friction paths for both URL and paste-text entry —  
**So that** users complete this step in under 30 seconds regardless of input method.

**Evaluation Criteria:**
1. **Input mode clarity** — URL entry and text paste must be clearly differentiated as separate, equal-weight options (tabs, radio selectors, or labelled panels — not nested or hidden).
2. **Protected-site guidance** — When a URL is detected as a protected site (LinkedIn, Indeed, Glassdoor), the fallback instruction must be contextual, specific, and immediately visible — not a generic error message.
3. **Fetch feedback** — URL fetching must show a loading indicator. A blank wait with no feedback is unacceptable; failure must surface a clear error with recovery action.
4. **Confirmation editability** — Extracted fields (company name, role title, date) must be inline-editable in the confirmation step, not requiring the user to restart.
5. **Character-count guidance** — Paste-text path should indicate minimum expected input length so users know whether a truncated paste will succeed.

**Failure Modes to Guard Against:**
- URL input field and text area presented simultaneously with no clear hierarchy, causing user confusion.
- Protected-site error shown as a raw status code or generic "fetch failed" with no recovery path.
- Fetch takes more than 3 seconds with no spinner or progress indication.
- Correcting an extracted field (e.g., wrong company name) requires starting the step over.

**Acceptance Criteria:**
- URL and paste-text modes are clearly delineated; the active mode state is visually obvious.
- Protected-site detection triggers an inline, contextual copy-paste instruction with the specific site name.
- Fetch loading state (spinner or progress bar) appears within 300 ms of submission.
- Extracted fields are editable in-place at the confirmation UI; editing does not restart the workflow.
- Paste area shows a minimum character guidance hint.

---

## US-U3: Analysis Results Readability

**As a** UI/UX expert,  
**I want to** verify that the LLM analysis output is presented in a scannable, hierarchically organised layout —  
**So that** a user can absorb the key findings in under 2 minutes without reading every word.

**Evaluation Criteria:**
1. **Chunking** — Required qualifications, preferred qualifications, keywords, domain focus, and role-type must each occupy a distinct visual chunk (card, panel, or collapsible section), not one undifferentiated text block.
2. **Keyword visualisation** — Ranked keywords benefit from a visual weight signal (font size, badge, ordered list with rank numbers) rather than a flat comma-separated list.
3. **Mismatch prominence** — Apparent mismatches between job requirements and master CV data must be visually prominent (e.g., amber/red callout) and not buried at the bottom of the analysis.
4. **Clarifying question flow** — Clarifying questions must be presented one group at a time (not as a wall of questions), with answer options as buttons or dropdowns — never a free-text box unless unavoidable.
5. **Analysis duration feedback** — If analysis takes more than 3 seconds, an informative loading message (not just a spinner) should indicate that thinking is occurring and give an approximate wait time.

**Failure Modes to Guard Against:**
- Full analysis output as a single scrolling text block with prose paragraphs.
- Keywords listed alphabetically with no visual rank differentiation.
- Mismatch callouts placed below the fold with no above-fold summary.
- Clarifying questions presented all at once as a long form.

**Acceptance Criteria:**
- Analysis result has at minimum 4 visually distinct sections (required quals, preferred quals, keywords, role/domain inference).
- Keywords displayed with visual rank signal (not flat comma list).
- Mismatch callouts visible above the fold; if more than 3 mismatches, a summary count appears above the fold with expandable detail below.
- Clarifying questions are presented in logical groups of ≤3 questions per screen/step; each group can be answered and confirmed before the next group appears.
- Loading state for analysis includes a label (e.g., "Analysing job description against your CV…") and an estimated duration.

---

## US-U4: Review Table Interaction Quality

**As a** UI/UX expert,  
**I want to** verify that the review tables for Experiences, Achievements, and Skills are efficient and unambiguous to interact with —  
**So that** a user can review and approve or reject a full set of recommendations in under 5 minutes without misclicks or confusion.

**Evaluation Criteria:**
1. **Toggle affordance clarity** — Accept/reject toggles must be visually obvious (not small checkboxes buried in a row). Their current state must be unambiguous at a glance.
2. **Drag / reorder usability** — If reordering is supported via up/down buttons or drag-and-drop, the controls must be discoverable without hover, keyboard-accessible, and should provide immediate visual feedback of the new order.
3. **Row density** — Tables should show enough content per row (experience title, role, date, relevance score, first bullet) that users can make accept/reject decisions without expanding every row. But not so dense that the table is illegible.
4. **Bulk actions** — For tables with more than 8 rows, a "Select All / Deselect All" control should be available.
5. **Inline expansion** — Bullet lists and proposed rewrites should expand inline per row, not navigate away from the table. Navigation away and back resets scroll position (failure mode).
6. **Relevance score meaning** — Scores (e.g., 0–100 or letter grade) must be visibly labelled and interpretable without a legend hidden elsewhere.

**Failure Modes to Guard Against:**
- Small checkboxes as accept/reject with no visual state change beyond the checkbox itself.
- Reorder controls only visible on hover (inaccessible, hard to discover).
- Expanding a row to review bullets navigates away and loses scroll position on return.
- Relevance score shown as a raw number (0–1 float) with no label or scale explanation.
- No bulk accept/reject on large skill tables.

**Acceptance Criteria:**
- Accept/reject state is legible from ≥60 cm viewing distance (sufficient contrast and size for toggle/badge).
- Reorder controls (up/down or drag handle) visible without hover; keyboard navigation supported.
- Bullet expansion is in-place (no page navigation), with smooth expand animation.
- Relevance scores labelled with scale (e.g., "Relevance: 92 / 100") or letter grade with legend.
- Bulk accept/deselect control present when table row count > 8.

---

## US-U5: Rewrite Review Presentation

**As a** UI/UX expert,  
**I want to** verify that proposed rewrites are presented as unambiguous diff views — showing what changed, not just what the new version is —  
**So that** users can evaluate a rewrite in seconds without having to compare the old and new text in their head.

**Evaluation Criteria:**
1. **Inline diff** — Removals shown in red strikethrough, additions shown in green, unchanged text intact. Not "original text in one box, new text in another box" — that requires working memory to compare.
2. **Accept / Reject / Edit controls** — Per-rewrite controls must be collocated with the diff, not in a separate panel. Accept should be the primary (visually prominent) action.
3. **Reason visibility** — The LLM's reason for the proposal should be accessible (tooltip, expandable, or inline note) without requiring a separate review panel.
4. **Edit path** — Users must be able to directly edit the proposed text before accepting. The edit path must not destroy the diff view or force acceptance of the LLM version first.
5. **Batch review efficiency** — When multiple rewrites exist, a "review next → " flow allows keyboard-driven progression without scrolling. Alternatively, a single-page review table showing all diffs simultaneously with compact toggle controls.

**Failure Modes to Guard Against:**
- Side-by-side text boxes that require cognitive comparison with no visual diff highlighting.
- Accept/Reject buttons far from the text they govern (requires scroll to act).
- No way to edit the proposed text — only accept as-is or reject entirely.
- Reason/rationale completely hidden unless user opens a separate panel.

**Acceptance Criteria:**
- All rewrite proposals display inline diff with red/strikethrough removals and green additions.
- Accept, Reject, and Edit controls appear within the same row/card as the diff — not in a separate panel.
- LLM rewrite reason is visible within one click or hover (not a full modal navigation).
- Edit mode allows free-text editing of the proposed text and preserves the original for comparison.
- A keyboard shortcut or sequential navigation control (e.g., "Approve & Next") is present when more than 3 rewrites exist.

---

## US-U6: Generation and Output State Feedback

**As a** UI/UX expert,  
**I want to** verify that the document generation step provides clear progress feedback and presents the output in a usable, actionable form —  
**So that** users are never uncertain whether generation has succeeded, and can immediately act on the result.

**Evaluation Criteria:**
1. **Generation progress feedback** — Multi-step generation (HTML render → PDF conversion) must show step-by-step progress, not just a spinner. Each step should be labelled and show completion state.
2. **Output preview** — The generated CV must be previewable in-browser (actual rendered output, not a file path link) before downloading.
3. **Download options** — At minimum: PDF download. HTML download and copy-to-clipboard of plain text should be offered as secondary options.
4. **Error recovery** — If generation fails (WeasyPrint error, Chrome headless unavailable, etc.), the error message must explain what failed and offer a fallback path (e.g., "Download HTML instead").
5. **Output filename** — Generated filename must include applicant name, role, and date (e.g., `Warnes-DataScientist-Acme-2026-03-06.pdf`), not a generic filename.
6. **Version label** — If the user has generated multiple versions in a session, the UI must distinguish them (version number, timestamp, or label) so the most recent is unambiguous.

**Failure Modes to Guard Against:**
- Spinner with no labels running for >10 seconds with no intermediate feedback.
- Generated output only accessible via a raw file path, not an in-browser preview.
- Generic filename (`cv_output.pdf`) with no job or date context.
- Generation failure shows a raw stack trace or `500 Internal Server Error` with no user-interpretable message.
- Multiple prior versions not distinguished; user downloads an old version.

**Acceptance Criteria:**
- Generation progress is step-labelled; each completed step shows a checkmark before the next begins.
- Generated CV rendered inline (iframe or embedded PDF) with a prominently placed download button.
- Download filename follows the `CV_{Company}_{Role}_{Date}` convention (ATS DOCX adds `_ATS` suffix).
- Generation error surfaces a user-readable message with at least one fallback or recovery action.
- When multiple versions exist in a session, they are listed with timestamps and a "current" label on the most recent.

---

## US-U7: Accessibility and Keyboard Navigation

**As a** UI/UX expert,  
**I want to** verify that all core workflows are operable without a mouse and meet basic accessibility standards —  
**So that** the application is usable by keyboard-preferring power users and does not create barriers for users with accessibility needs.

**Evaluation Criteria:**
1. **Focus management** — After a modal opens, focus moves to the first interactive element inside. After a modal closes, focus returns to the element that opened it.
2. **Focus visibility** — All interactive elements must have a visible focus ring when navigated by keyboard (not removed via `outline: none` without a styled replacement).
3. **Table keyboard navigation** — Accept/reject toggles and reorder controls in review tables must be operable by keyboard alone (Space/Enter to toggle, arrow keys or keyboard shortcut to reorder).
4. **ARIA labels** — Icon-only buttons (e.g., up/down reorder icons, X close buttons) must have `aria-label` attributes with descriptive text.
5. **Colour-independence** — No information conveyed by colour alone. Status indicators (accept = green, reject = red) must also have a text label or icon.
6. **Error messages** — Form validation errors must be associated with their input via `aria-describedby` and announced to screen readers on appearance.

**Failure Modes to Guard Against:**
- `outline: none` applied globally to remove default browser focus rings with no styled replacement.
- Modal opened without moving focus inside it (screen readers miss modal content).
- Icon-only buttons with no tooltip or ARIA label.
- Status distinguishable only by colour (e.g., accepted = green background, rejected = red background, no label or icon).
- Keyboard-trapped UI elements or tab order that skips interactive elements.

**Acceptance Criteria:**
- All interactive elements have a visible, styled focus indicator.
- Modals trap focus while open and restore focus on close.
- All icon-only controls have `aria-label` or `title` attributes with descriptive text.
- Accept/reject status communicated by both colour and a text label or icon (not colour alone).
- Tab order is logical and matches visual reading order; no elements skipped.

---

## US-U9: HTML Layout Review Interaction Quality

**As a** UI/UX expert,  
**I want to** verify that the HTML layout review step — where the user issues natural-language instructions to adjust section order, page breaks, and spacing — is clear, low-friction, and unambiguous about what is happening —  
**So that** users can confidently reshape their CV layout without fear of breaking approved content or losing their work.

**Evaluation Criteria:**
1. **Instruction field clarity** — The Layout Instructions text field must be clearly labelled with its scope. Users must understand that instructions affect structure and presentation only, not approved text. A brief placeholder or hint (e.g., "e.g. Move Publications after Skills; keep Genentech entry on one page") aids discoverability.
2. **Processing feedback** — After submitting an instruction, the UI must show a processing indicator and then refresh the preview. A blank wait or a full-page reload is not acceptable.
3. **Change attribution** — After an instruction is applied, the UI should display a brief confirmation of what was changed (e.g., "Publications section moved after Skills"), not just silently update the preview.
4. **Clarification handling** — If the LLM cannot confidently apply an instruction, it must ask a clarifying question inline — not silently apply a guess or display an error.
5. **Instruction history** — A visible log of applied instructions in this session allows the user to review what has been changed before proceeding. Each entry in the log has an **Undo** action.
6. **Single proceed action** — The button to advance to PDF/ATS generation should be a single, clearly labelled **Proceed to Final Generation** — equally usable whether the user made zero or many layout changes. No "Skip" vs. "Confirm" ambiguity.
7. **Content safety assurance** — The UI must communicate clearly (label, notice, or tooltip) that applying layout instructions cannot alter approved rewrite text.

**Failure Modes to Guard Against:**
- Instruction submitted, preview unchanged, no feedback — user does not know if it worked.
- LLM silently applies a wrong interpretation of an ambiguous instruction.
- No history of applied instructions — user cannot review or undo individual steps before proceeding.
- Proceed button labelled differently depending on whether changes were made, causing confusion.
- User afraid to use the tool because they don't know if it will alter their approved text.

**Acceptance Criteria:**
- Layout Instructions field has a visible placeholder example and a scope label ("Affects layout only — approved text is never changed").
- A processing indicator appears within 300 ms of instruction submission; preview updates on completion.
- A brief confirmation of the applied change is shown after each instruction (inline or in the instruction history).
- Ambiguous instructions surface a clarifying prompt rather than a silent guess or error.
- An instruction history panel is present showing all applied instructions with individual Undo controls.
- A single **Proceed to Final Generation** button advances the workflow regardless of whether any instructions were applied.

---

## US-U8: Responsive Behaviour and Loading Performance

**As a** UI/UX expert,  
**I want to** verify that the application performs acceptably on common screen sizes and loads within user tolerance thresholds —  
**So that** the experience does not degrade on laptop screens and does not punish users on slower local connections.

**Evaluation Criteria:**
1. **Minimum viable layout — 1280 × 800** — The primary workflow must be fully operable at 1280 × 800 without horizontal scrolling. Review tables may scroll horizontally within a defined container, but the page structure must not break.
2. **Column collapsing in tables** — Review tables must not render empty or overflow at 1280 × 800. Lower-priority columns (e.g., internal IDs, raw score floats) should be hidden or collapsed at smaller widths.
3. **Initial page load — ≤2 s locally** — The application shell (HTML + CSS + base JS) must render within 2 seconds on localhost. LLM-dependent content may load asynchronously after shell render.
4. **No layout shift during async loads** — Content areas that await LLM responses should reserve space (skeleton screens, minimum-height placeholders) to prevent layout shift when content arrives.
5. **Long table scroll performance** — Tables with 20+ rows (skills table) must not exhibit scroll jank. Virtual scrolling or CSS containment may be appropriate.

**Failure Modes to Guard Against:**
- Review table overflows the viewport horizontally at 1280 × 800, causing full-page horizontal scroll.
- Page blank-whites for >2 seconds on first load while loading LLM-independent UI chrome.
- Content areas collapsing to zero height and jumping on LLM response arrival (cumulative layout shift).
- Skills table with 30+ rows causing scroll performance degradation in Chrome/Firefox.

**Acceptance Criteria:**
- Core workflow navigable without horizontal scroll at 1280 × 800 (tested via browser DevTools viewport resize).
- Table columns designated as "collapsible at ≤1400 px" are defined in component config and documented.
- Application shell renders in ≤2 s on localhost with no external blocking resources.
- Async content areas have skeleton placeholders that match the approximate dimensions of the arriving content.
