---
name: e2e-browser-test
description: End-to-end browser test of the cv-builder web UI using Claude in Chrome
---

# CV-Builder End-to-End Browser Test

## Purpose
Exercise the full cv-builder workflow — every tab in the workflow tab bar, in order, from job
input through post-generation features (Master CV, Cover Letter, Screening, Interview Prep,
Thank You, Harvest) — using a real browser session, reporting pass/fail for each acceptance
criterion. This is a behavioural test — it drives the actual UI, not the API directly.

Two parts: **Part 1** is one linear pass as a generic applicant. **Part 2** re-visits the app as
several other personas (first-time user, returning user, accessibility specialist, power user,
HR/ATS reviewer) to exercise perspective-specific behavior that can only be verified live — session
state, keyboard-only operation, keyboard shortcuts, and the real downloaded file's content.

## Prerequisites (verify before starting)

1. cv-builder server is running at http://127.0.0.1:5001 (port comes from `config.yaml`'s
   `web.port`; confirm the actual port there before starting if it's ever been changed).
   Start with: conda activate cvgen && python scripts/web_app.py --llm-provider github
   Confirm: a tab is open at http://127.0.0.1:5001 or navigate there now.
2. No active session in another tab — a 409 conflict will block the test.
3. Sample job description is available at sample_job_description.txt in the project root.

## Tools Required

This command requires the Claude in Chrome tool (browser control) and the Filesystem tool
(to read the sample job file and save screenshots/the report). Both must be enabled in Claude's
tool settings before invoking.

## Browser Configuration

Do NOT use Arc (the system default browser). Use the Chrome application with the Warnes Innovations profile:
- Profile: Warnes Innovations (greg@warnes-innovations.com)
- This profile has the Claude in Chrome extension installed and authorized

Before running the test:
1. Open Google Chrome (not Arc) — e.g. via Spotlight: "Google Chrome"
2. Ensure the Warnes Innovations profile is active (top-right profile avatar)
3. Call switch_browser to connect to this Chrome instance
4. Then open a new tab and navigate to http://127.0.0.1:5001

If the browser switches back to Arc at any point, use switch_browser again to reattach to Chrome.

---

## Test Execution Plan

Work through each phase below in order — the phase order matches the tab bar's left-to-right
order (`web/index.html`'s `#tab-bar`). After each step, note PASS / FAIL / PARTIAL / N/A and the
evidence. Produce a markdown report at the end saved to tasks/e2e-test-report-<YYYYMMDD>.md.

The `Finalise` tab is conditionally hidden (`style="display:none"` by default) and only appears
after specific workflow states are reached — see Phase 19. If its tab is not visible when you
reach that phase, mark it N/A and continue — do not treat it as FAIL.

The `CV Editor` tab is also hidden by the same `style="display:none"`, but unlike Finalise it is
**permanently disabled** (`web/index.html`: "CV Editor tab disabled: session-copy editing
superseded by Master CV app mode (GAP-19)") — no code path ever unhides it. It has no phase
number and no report row; do not expect it to appear at any point in this test.

This test has two parts. **Part 1** (Phases 0-27) is a single linear pass through the workflow
as one generic applicant — one job description, one set of decisions, every tab visited once.
**Part 2** (Phases P1-P5) re-visits the app as several other personas, exercising interactions
that genuinely differ by perspective and can only be verified live (not by reading source code):
first-time vs. returning user session state, keyboard-only navigation, keyboard shortcuts, and
inspecting the actual downloaded file rather than trusting the in-app score panel. Static,
non-interactive persona concerns (tone, persuasion quality, ATS keyword strategy, compliance
language, etc.) are already covered by the separate `/cvUiReview` command and are out of scope
here — don't duplicate that analysis.

---

## Part 1 — Primary Applicant Journey

---

### Phase 0 — App Load

Steps:
1. Navigate to http://127.0.0.1:5001.
2. Wait for the page to fully load (workflow tab bar visible).

Checks:
- [ ] Page title contains "CV" or "cv-builder"
- [ ] Tab bar (`#tab-bar`) is visible with 23 visible tabs (25 `data-tab` entries exist in
      `web/index.html`; `CV Editor` and `Finalise` are hidden by default — see note above).
      If the count differs, that's itself a finding — don't just note "close enough" and move on.
- [ ] Job tab (`#tab-job`) is active
- [ ] No error banners or 409 conflict warnings visible
- [ ] LLM provider name shown in the header

---

### Phase 1 — Job Input (`#tab-job`, US-A1)

Steps:
1. Read sample_job_description.txt using the Filesystem tool.
2. Locate the job description text area on the page.
3. Paste the full job description text into the text area.
4. Click the Submit or Analyze button.

Checks:
- [ ] Text area accepts the pasted content without truncation
- [ ] Submit button is active after text is entered
- [ ] A loading indicator appears within 2 seconds of clicking Submit
- [ ] No JavaScript console errors on submission

Expected outcome: System transitions to the Analysis tab.

---

### Phase 2 — Job Analysis Display (`#tab-analysis`, US-A2)

Steps:
1. Wait for analysis to complete (up to 30 s — LLM call).
2. Navigate to the Analysis tab if not already active.
3. Inspect the displayed analysis content.

Checks:
- [ ] Analysis tab is active or highlighted
- [ ] Required qualifications section is visible and non-empty
- [ ] Preferred qualifications section is visible and non-empty
- [ ] Keywords section shows at least 5 keywords
- [ ] Domain / role type classification is shown
- [ ] No raw JSON or stack traces visible on the page

---

### Phase 3 — Generation Goals (`#tab-goals`)

Steps:
1. Navigate to the Goals tab.
2. Toggle the PDF page-count goal on/off using its checkbox; note the mode switches
   between "combined" and "split" page targets.
3. Toggle the ATS plain-text page/character goals on/off.
4. Leave goals at sensible defaults and proceed.

Checks:
- [ ] PDF page goal checkbox and page-count field(s) are visible and interactive
- [ ] Switching pdf page mode (combined vs split) changes the visible fields
- [ ] ATS page/character goal checkboxes are visible and interactive
- [ ] Disabling a goal removes/greys its associated input field
- [ ] No error navigating away after changes

---

### Phase 4 — Clarifying Questions (`#tab-questions`, US-A2 continued)

Steps:
1. Navigate to the Questions tab. If no clarifying questions were generated, a proceed/confirm
   affordance should be shown instead — treat that as the expected alternate path, not a failure.
2. If questions are present, answer them using available options:
   - For publication questions: choose include relevant publications
   - For leadership vs IC questions: choose Balanced or both
   - For any skill gap questions: choose Note the gap or equivalent
3. Submit or confirm the answers (or click the proceed confirmation if no questions were shown).

Checks:
- [ ] At least one clarifying question is presented, OR a proceed confirmation is shown if none
      apply — a tab with neither (a dead end) is a FAIL
- [ ] Question controls are interactive (buttons or dropdowns respond to clicks)
- [ ] Answers are accepted without error
- [ ] System advances to the Experiences tab (or next unlocked tab) after all questions are answered

---

### Phase 5 — Experience Review (`#tab-exp-review`, US-A3)

Steps:
1. Navigate to the Experiences tab.
2. Accept at least 3 experiences using the checkboxes or toggles; reject at least 1.
3. Click Confirm or Proceed.

Checks:
- [ ] Experiences table visible with rows showing relevance scores
- [ ] Accept/reject controls are functional on every row
- [ ] Proceed button becomes active after selections are made
- [ ] No error on proceeding

---

### Phase 6 — Experience Bullets (`#tab-ach-editor`)

Steps:
1. Navigate to the Experience Bullets tab.
2. Open the bullet editor for one accepted experience.
3. Edit or reorder at least one bullet; save the change.

Checks:
- [ ] Bullet list is visible for each accepted experience
- [ ] Edit control opens a pre-filled text area
- [ ] Save persists the edit (re-open or re-render shows the new text)
- [ ] Reorder controls (if present) update bullet order without error

---

### Phase 7 — Skills Review (`#tab-skills-review`, US-A3)

Steps:
1. Navigate to the Skills tab.
2. Accept at least 5 skills; reject at least 1.
3. If category reorder controls are present, move one category up or down.
4. Click Confirm or Proceed.

Checks:
- [ ] Skills table/list visible with at least 5 skills
- [ ] Accept/reject controls are functional
- [ ] Category move-up/move-down controls (if present) work and are keyboard-accessible
- [ ] Proceed button becomes active after selections are made

---

### Phase 8 — Achievements Review (`#tab-achievements-review`, US-A3)

Steps:
1. Navigate to the Achievements tab.
2. Accept at least 3 achievements; reject at least 1.
3. Click Confirm or Proceed.

Checks:
- [ ] Achievements table visible with at least 3 rows
- [ ] Accept/reject controls are functional
- [ ] Proceed button becomes active after selections are made
- [ ] No error on proceeding

---

### Phase 9 — Tagline Review (`#tab-tagline-review`)

Steps:
1. Navigate to the Tagline tab.
2. Edit the proposed tagline text.
3. Click Reset to Proposed, then confirm the tagline.

Checks:
- [ ] Proposed tagline is shown and editable
- [ ] Reset-to-proposed control restores the original AI suggestion
- [ ] Confirm/Continue advances the workflow without error

---

### Phase 10 — Summary Review (`#tab-summary-review`)

Steps:
1. Navigate to the Summary tab.
2. Inspect the AI-generated professional summary and its specificity badge.
3. Click Regenerate; wait for a new summary to appear.
4. Select "Use AI Summary" (or the stored/manual alternative) and proceed.

Checks:
- [ ] AI summary text is shown with a specificity indicator/badge
- [ ] Regenerate produces a new summary without error (may take up to 30 s)
- [ ] Selecting a summary option and proceeding advances the workflow

---

### Phase 11 — Publications Review (`#tab-publications-review`)

Steps:
1. Navigate to the Publications tab.
2. Filter the publications table using the search box.
3. Accept at least 1 publication, reject at least 1, and reorder one row.
4. Submit publication decisions.

Checks:
- [ ] Publications table is populated (or empty-state message shown if no publications.bib)
- [ ] Filter box narrows visible rows
- [ ] Accept/reject controls and row move (up/down) controls work
- [ ] Bulk accept/reject action (if present) applies to all visible rows
- [ ] Submit completes without error

---

### Phase 12 — ATS Score (`#tab-ats-score`)

Steps:
1. Navigate to the ATS Score tab.
2. Inspect the score badge and summary line.

Checks:
- [ ] Score badge shows a numeric percentage
- [ ] Summary line explains matched/partial/missing keyword counts
- [ ] No error/placeholder state shown if analysis has already completed

---

### Phase 13 — Rewrite Review (`#tab-rewrite`, US-R3)

Steps:
1. Navigate to the Rewrites tab.
2. Accept the first 3 rewrite cards.
3. Edit the next card if present: click Edit, change one word, click Save.
4. Reject the next card if present.
5. Click Submit All Decisions when all cards are actioned.

Checks:
- [ ] At least 1 rewrite card is visible
- [ ] Each card shows original and proposed text
- [ ] Accept turns the card green
- [ ] Edit opens a pre-filled text area
- [ ] Reject dims the card
- [ ] Submit is disabled while any card is pending; enabled when all are actioned
- [ ] No error on Submit

---

### Phase 14 — Spell Check (`#tab-spell`, US-A4b)

Steps:
1. Navigate to the Spell Check tab.
2. Accept or ignore each flag shown.
3. Proceed to layout/generation.

Checks:
- [ ] Spell check panel is accessible
- [ ] Flags, if present, show suggested corrections
- [ ] Proceeding works without error

If no flags are present, mark N/A for the flag-specific checks and continue. If the Spell Check
tab itself is not visible in the tab bar (the whole step was skipped, not just empty of flags),
mark the entire phase N/A — do not treat a missing tab as FAIL.

---

### Phase 15 — Layout Review (`#tab-layout`)

Steps:
1. Navigate to the Layout Review tab (may auto-activate after spell check).
2. Wait for the initial layout preview to render.
3. Enter a natural-language layout instruction (e.g. "make the summary shorter") and submit it.
4. Wait for the preview to update; if a clarifying question dialog appears, answer it.
5. Click Confirm Layout.

Checks:
- [ ] Initial preview renders with a visible layout-freshness indicator
- [ ] Natural-language instruction is accepted and produces an updated preview (up to 30 s)
- [ ] Clarification dialog (if triggered) is answerable and does not dead-end the flow
- [ ] Confirm Layout advances to the Generated Files tab without error

---

### Phase 16 — CV Generation / Generated Files (`#tab-final_generate`, US-A5)

Steps:
1. Wait for generation to complete (up to 90 s — document rendering).
2. Inspect the results panel.

Checks:
- [ ] Generation progress indicators appear for each format
- [ ] ATS DOCX download link appears after generation
- [ ] PDF download link appears after generation
- [ ] Human DOCX download link appears after generation
- [ ] ATS validation report is shown with pass/warn/fail indicators
- [ ] No generation errors or stack traces visible
- [ ] Session saved indicator appears

---

### Phase 17 — ATS Validation Report Detail (US-H6)

Steps:
1. Inspect the ATS validation report on the Generated Files tab.

Checks:
- [ ] Report shows at least 8 validation checks
- [ ] Each check has a clear status: pass, warn, or fail
- [ ] No structural checks show fail (no tables, no text boxes, contact in body)
- [ ] Keyword match check is present

---

### Phase 18 — File Review (`#tab-download`)

Steps:
1. Navigate to the File Review tab.
2. Confirm all generated files are listed (ATS DOCX, PDF, human DOCX, and cover
   letter/screening DOCX if those were generated).
3. Click a download link and confirm the browser initiates a download (or the file opens).

Checks:
- [ ] File grid lists every format actually generated
- [ ] Cover letter / screening DOCX appear here if generated in Phases 20/22
- [ ] Download link triggers a download / file open with no error

---

### Phase 19 — Finalise (`#tab-finalise`, conditionally hidden)

Steps:
1. Check whether the Finalise tab is visible in the tab bar.
2. If visible, navigate to it and complete the finalise action.

Checks:
- [ ] If hidden: mark N/A and continue (this is expected default state)
- [ ] If visible: finalise completes without error and shows a restored-decisions summary

---

### Phase 20 — Master CV (`#tab-master`)

Steps:
1. Navigate to the Master CV tab (or open it via the header "Master CV" quick-access button).
2. Inspect personal info, experiences, skills, and education sections.
3. Edit one field (e.g. a skill or achievement) and save.

Checks:
- [ ] All master-data sections render without error
- [ ] Edit-and-save persists the change (re-render or reload shows the new value)
- [ ] A "last saved change" notice appears after saving
- [ ] Opening via the header quick-access button behaves the same as the tab

---

### Phase 21 — Cover Letter (`#tab-cover-letter`)

Steps:
1. Navigate to the Cover Letter tab.
2. Enter optional company context.
3. Click Generate; wait for the cover letter to be produced (up to 30 s).
4. Save the cover letter.

Checks:
- [ ] Generate produces cover letter text without error
- [ ] Company context is reflected in the generated text
- [ ] Consistency report (if shown) does not flag unresolved contradictions
- [ ] Save persists without error; file appears in File Review (Phase 18) on next visit

---

### Phase 22 — Screening Questions (`#tab-screening`)

Steps:
1. Navigate to the Screening tab.
2. Paste 1-2 sample screening questions into the input.
3. Select a response format for each question.
4. Generate responses.

Checks:
- [ ] Questions are parsed into individual blocks
- [ ] Format selector changes the requested response style
- [ ] Generated responses appear for each question without error
- [ ] "Search for question" (if used) returns a reasonable result or a clear no-match state

---

### Phase 23 — Interview Prep (`#tab-interview-prep`)

Steps:
1. Navigate to the Interview Prep tab.
2. Wait for content to populate.

Checks:
- [ ] Interview prep content renders without error
- [ ] Content references the analyzed job (not generic placeholder text)

---

### Phase 24 — Thank You (`#tab-thank-you`)

Steps:
1. Navigate to the Thank You tab.
2. Wait for content to populate.

Checks:
- [ ] Thank-you note content renders without error
- [ ] Content references the analyzed job/company (not generic placeholder text)

---

### Phase 25 — Harvest (`#tab-harvest`)

Steps:
1. Navigate to the Harvest tab.
2. Inspect grouped candidates (by type and confidence tier).
3. Promote at least one candidate to the Master CV; reject at least one.

Checks:
- [ ] Candidates are grouped and each shows a source/confidence badge
- [ ] Promote action updates Master CV data (spot-check via Phase 20 Master CV tab)
- [ ] Reject action dismisses the candidate without error
- [ ] Reclassified items (e.g. skill_type_update) show a "Reclassified" badge

---

### Phase 26 — Session Persistence (US-A6)

Steps:
1. Hard-refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux).
2. Wait for page to reload.

Checks:
- [ ] Session state is restored (position name, company, or analysis visible)
- [ ] Workflow tab bar reflects the correct active tab, not reset to Job
- [ ] Generated file links are still accessible

---

### Phase 27 — Error Handling (US-U8)

Steps:
1. Reset the session (click Reset if available) to get a clean state.
2. Attempt to proceed past job input without entering any text.
3. Try submitting an invalid URL: not-a-url

Checks:
- [ ] Empty submission shows a clear, user-readable error message
- [ ] Invalid URL shows an actionable error, not a raw Python exception
- [ ] App recovers and remains usable after both error attempts

---

## Part 2 — Persona Passes (multi-perspective)

Run these after Part 1 completes — several depend on the session and generated files Part 1
created. Each pass targets one persona from `tasks/user-story-*.md` and tests only what genuinely
requires live interaction to verify.

---

### Phase P1 — First-Time User (`user-story-first-time-user.md`)

Steps:
1. Open a new Incognito/Guest Chrome window (or clear the site's localStorage and cookies for
   127.0.0.1 via devtools, then reload) so no prior session exists.
2. Navigate to http://127.0.0.1:5001.

Checks:
- [ ] No prior-session resume dialog or session switcher is offered
- [ ] Any first-run onboarding/walkthrough hint appears (if the app has one) and is dismissible
- [ ] Job tab starts empty — no leftover text, analysis, or decisions from Part 1's session
- [ ] Keyboard-shortcut help panel (`?`) explains itself understandably with zero prior context

---

### Phase P2 — Returning User (`user-story-returning-user.md`)

Steps:
1. Close the Incognito window from Phase P1; return to the normal profile/tab still holding
   Part 1's session.
2. Hard-refresh the page.
3. If a session-switcher/resume dialog appears, select the session created in Part 1.

Checks:
- [ ] The session created in Part 1 is offered by name/company/date, not just a generic ID
- [ ] Resuming restores the exact tab position and prior decisions (spot-check 2-3 accepted items)
- [ ] Generated file links from Part 1 (Phase 16/18) are still valid and downloadable
- [ ] No duplicate/orphaned session is created by the refresh itself

---

### Phase P3 — Accessibility Specialist, keyboard-only (`user-story-accessibility-specialist.md`)

For this entire phase, do not click anything — use only Tab, Shift+Tab, Enter, Space, and Arrow
keys, plus the documented shortcuts from `web/keyboard-shortcuts.js`.

Steps:
1. From the Job tab, Tab through the visible controls; confirm a visible focus outline follows
   each stop (per `web/styles.css` `:focus-visible` rules).
2. On a review tab with cards (e.g. Rewrites or Spell Check), use `↑`/`↓` to move between cards
   and `A`/`R` to accept/reject the focused card without clicking.
3. Press `?` to open the keyboard-shortcut help panel; confirm it's reachable and dismissible
   (Tab to its close button, Enter/Space to close) without a mouse.
4. Open any modal reached during Part 1 (e.g. Master CV or Bullet Reorder) using only the
   keyboard; confirm focus is trapped inside it and Escape closes it, returning focus to the
   control that opened it.
5. Use `read_console_messages` and inspect the DOM for `aria-live` regions during an async
   operation (e.g. Generate); confirm status text actually changes inside them, not just visually.

Checks:
- [ ] Every interactive control reachable by Tab shows a visible focus indicator
- [ ] `A`/`R`/`↑`/`↓` shortcuts work on review-card tabs exactly as documented
- [ ] `?` panel is fully keyboard-operable
- [ ] Modal focus trap holds (Tab doesn't escape the modal) and Escape + focus-restore both work
- [ ] `aria-live` regions' text content changes during async waits, not only visual-only indicators

---

### Phase P4 — Power User, keyboard shortcuts & bulk actions (`user-story-power-user.md`)

Note on granularity: `Ctrl+Shift+R` keys off the coarse step-progress bar (`#step-job`,
`#step-analysis`, `#step-customizations`, `#step-rewrite`, `#step-spell`, `#step-layout`,
`#step-download`, `#step-cover_letter`, `#step-screening`, `#step-interview_prep`, ... —
`web/index.html`), which is coarser than the ~25 content tabs the rest of this test is built
around. Several tabs share one step (e.g. Tagline/Summary/Publications all fall under the
`customizations` step) — "current phase" below means the active step, not the active tab.

Steps:
1. On any tab with a primary action button, press `Ctrl+Enter` and confirm it triggers that
   button rather than requiring a click. Also confirm it fires even while focus is inside a text
   field on that tab (e.g. an edit textarea) — this is intentional, matching Enter's existing
   behavior in the main send-box (the `e.ctrlKey && e.key === 'Enter'` branch at the top of
   `_onKeyDown()` in `web/keyboard-shortcuts.js`), not a bug if it does.
2. On a completed step, press `Ctrl+Shift+R` and confirm the re-run-phase confirmation dialog
   appears (`confirmReRunPhase`), including while focus is inside a text field — this shortcut
   (the `e.ctrlKey && e.shiftKey && e.key === 'R'` branch, also in `_onKeyDown()`) never checks
   `_inTextInput()`.
3. On the Publications tab, use the bulk accept/reject action (`bulkPubAction`) instead of
   actioning rows one by one.
4. Click into any text field, then press `?`, `A`/`R`, or the arrow keys and confirm none of
   *those* fire — single-key shortcuts are the only ones gated by the `_inTextInput()` check in
   `_onKeyDown()` (`web/keyboard-shortcuts.js`).

Checks:
- [ ] `Ctrl+Enter` fires the current tab's primary action, including from inside a text field
- [ ] `Ctrl+Shift+R` opens a confirmation before re-running a step (not silent, not destructive
      without confirmation), including from inside a text field
- [ ] Bulk accept/reject on Publications applies to all currently visible rows in one action
- [ ] Single-key shortcuts (`?`, `A`, `R`, arrows) do NOT fire while focus is inside a text input
      or while a modal is open — unlike `Ctrl+Enter`/`Ctrl+Shift+R`, which are input-agnostic

---

### Phase P5 — HR/ATS Reviewer, real file inspection (`user-story-hr-ats.md`)

The in-app ATS Score/Validation panels (Phases 12 and 17) reflect what the app *claims* about
its own output. This phase verifies the claim against the actual downloaded artifact.

Steps:
1. From the File Review tab (Phase 18), download the ATS DOCX file to disk (note the download
   path Chrome reports).
2. Using the Bash tool, inspect the file directly, e.g.:
   `python3 -c "from docx import Document; d = Document('<path>'); [print(p.text) for p in d.paragraphs]; print('tables:', len(d.tables))"`
3. Compare the extracted text/structure against what the in-app ATS report claimed.

Checks:
- [ ] `len(d.tables) == 0` — no tables in the ATS docx (matches the in-app "no tables" claim)
- [ ] Extracted paragraph text contains the candidate's contact info in the body (not header/footer)
- [ ] Extracted text contains a representative sample of the keywords the in-app report claimed
      were matched
- [ ] No extraction errors (corrupt file, unreadable structure)
- [ ] Any discrepancy between the in-app claim and the actual file content is logged as a FAIL,
      even if the in-app panel itself showed all-pass

---

## Report Format

Produce this table after completing all phases:

### E2E Test Report
Date: <date>
LLM Provider: <provider observed in header>
Job: sample_job_description.txt
Screenshots: tasks/e2e-screenshots/<date>/

| Phase | Description                  | Status          | Notes |
|-------|-------------------------------|------------------|-------|
| 0     | App load                      | PASS/FAIL/N/A    |       |
| 1     | Job input                     | PASS/FAIL/N/A    |       |
| 2     | Analysis display               | PASS/FAIL/N/A    |       |
| 3     | Generation goals                | PASS/FAIL/N/A    |       |
| 4     | Clarifying questions           | PASS/FAIL/N/A    |       |
| 5     | Experience review               | PASS/FAIL/N/A    |       |
| 6     | Experience bullets              | PASS/FAIL/N/A    |       |
| 7     | Skills review                   | PASS/FAIL/N/A    |       |
| 8     | Achievements review             | PASS/FAIL/N/A    |       |
| 9     | Tagline review                  | PASS/FAIL/N/A    |       |
| 10    | Summary review                  | PASS/FAIL/N/A    |       |
| 11    | Publications review             | PASS/FAIL/N/A    |       |
| 12    | ATS score                       | PASS/FAIL/N/A    |       |
| 13    | Rewrite review                  | PASS/FAIL/N/A    |       |
| 14    | Spell check                     | PASS/FAIL/N/A    |       |
| 15    | Layout review                   | PASS/FAIL/N/A    |       |
| 16    | CV generation / generated files | PASS/FAIL/N/A    |       |
| 17    | ATS validation report detail     | PASS/FAIL/N/A    |       |
| 18    | File review                     | PASS/FAIL/N/A    |       |
| 19    | Finalise (conditional)          | PASS/FAIL/N/A    |       |
| 20    | Master CV                       | PASS/FAIL/N/A    |       |
| 21    | Cover letter                    | PASS/FAIL/N/A    |       |
| 22    | Screening questions             | PASS/FAIL/N/A    |       |
| 23    | Interview prep                  | PASS/FAIL/N/A    |       |
| 24    | Thank you                       | PASS/FAIL/N/A    |       |
| 25    | Harvest                         | PASS/FAIL/N/A    |       |
| 26    | Session persistence             | PASS/FAIL/N/A    |       |
| 27    | Error handling                  | PASS/FAIL/N/A    |       |
| P1    | First-time user                 | PASS/FAIL/N/A    |       |
| P2    | Returning user                  | PASS/FAIL/N/A    |       |
| P3    | Accessibility (keyboard-only)   | PASS/FAIL/N/A    |       |
| P4    | Power user (shortcuts/bulk)     | PASS/FAIL/N/A    |       |
| P5    | HR/ATS (real file inspection)   | PASS/FAIL/N/A    |       |

### Failures requiring attention
For every FAIL or PARTIAL item, list: phase number, what was expected, what actually happened,
and the screenshot filename (see below) that shows it.

### Console errors observed
List any JavaScript console errors seen during the test, with the phase during which they occurred.

---

## Guidance for the Testing Agent

- Use find to locate elements before clicking them; never click speculatively.
- Wait for async operations: after clicking Analyze, Generate, or a Layout instruction, poll with
  get_page_text or read_page until the expected content appears. Budget 30 s for LLM analysis/
  generation calls (summary, cover letter, screening, layout instructions), 90 s for full CV
  generation/rendering.
- On any FAIL or PARTIAL: before moving to the next phase, take a screenshot with the computer
  screenshot action and save it to `tasks/e2e-screenshots/<YYYYMMDD>/phase-<N>-<slug>.png`
  (create the directory if it doesn't exist). Reference that exact filename in the report's
  "Failures requiring attention" section — a failure entry without a screenshot filename is
  incomplete.
- Do not abort on a single failure — mark it FAIL and continue to the next phase.
- Respect the single-session lock: if a 409 appears, click Reset or wait 30 s before retrying.
  Do not open a second tab *on the same session* (same profile/cookie jar) — the 409 is a
  per-session-ID ownership claim (`sessions_claim`/`sessions_takeover` in
  `scripts/routes/session_routes.py`), not a whole-server lock. Phase
  P1's Incognito window is fine specifically because Incognito shares no cookies/localStorage
  with the main profile, so it gets its own fresh session ID and can't collide.
- Use read_console_messages after each major action to catch silent JavaScript errors.
- If the tab bar layout changes (tabs added, removed, or renamed) between runs of this test,
  update the phase list above to match before reporting — a stale phase list should itself be
  logged as a finding, not silently worked around.
