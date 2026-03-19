---
name: e2e-browser-test
description: End-to-end browser test of the cv-builder web UI using Claude in Chrome
---

# CV-Builder End-to-End Browser Test

## Purpose
Exercise the full cv-builder workflow from job input through CV generation using a real browser
session, reporting pass/fail for each acceptance criterion. This is a behavioural test — it drives
the actual UI, not the API directly.

## Prerequisites (verify before starting)

1. cv-builder server is running at http://127.0.0.1:5001
   Start with: conda activate cvgen && python scripts/web_app.py --llm-provider github
   Confirm: a tab is open at http://127.0.0.1:5000 or navigate there now.
2. No active session in another tab — a 409 conflict will block the test.
3. Sample job description is available at sample_job_description.txt in the project root.

## Tools Required

This command requires the Claude in Chrome tool (browser control) and the Filesystem tool
(to read the sample job file). Both must be enabled in Claude's tool settings before invoking.

## Browser Configuration

Do NOT use Arc (the system default browser). Use the Chrome application with the Warnes Innovations profile:
- Profile: Warnes Innovations (greg@warnes-innovations.com)
- This profile has the Claude in Chrome extension installed and authorized

Before running the test:
1. Open Google Chrome (not Arc) — e.g. via Spotlight: "Google Chrome"
2. Ensure the Warnes Innovations profile is active (top-right profile avatar)
3. Call switch_browser to connect to this Chrome instance
4. Then open a new tab and navigate to http://127.0.0.1:5000

If the browser switches back to Arc at any point, use switch_browser again to reattach to Chrome.

---

## Test Execution Plan

Work through each phase below in order. After each step, note PASS / FAIL / PARTIAL and the
evidence. Produce a markdown report at the end saved to tasks/e2e-test-report-<YYYYMMDD>.md.

---

### Phase 0 — App Load

Steps:
1. Navigate to http://127.0.0.1:5000.
2. Wait for the page to fully load (workflow progress bar visible).

Checks:
- [ ] Page title contains "CV" or "cv-builder"
- [ ] Workflow progress bar is visible with at least 6 steps
- [ ] Job Description tab (or first tab) is active
- [ ] No error banners or 409 conflict warnings visible
- [ ] LLM provider name shown in the header

---

### Phase 1 — Job Input (US-A1)

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

Expected outcome: System transitions to the Analysis phase.

---

### Phase 2 — Job Analysis Display (US-A2)

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
- [ ] At least one clarifying question is presented, or a proceed confirmation
- [ ] No raw JSON or stack traces visible on the page

---

### Phase 3 — Clarifying Questions (US-A2 continued)

Steps:
1. Answer clarifying questions using available options:
   - For publication questions: choose include relevant publications
   - For leadership vs IC questions: choose Balanced or both
   - For any skill gap questions: choose Note the gap or equivalent
2. Submit or confirm the answers.

Checks:
- [ ] Question controls are interactive (buttons or dropdowns respond to clicks)
- [ ] Answers are accepted without error
- [ ] System advances to the Customization phase after all questions are answered

---

### Phase 4 — Customization Review (US-A3)

Steps:
1. Navigate to the Customization tab.
2. Accept at least 3 experiences, 5 skills, and 3 achievements using the checkboxes or toggles.
3. Reject at least 1 item from each table.
4. Click Confirm or Proceed.

Checks:
- [ ] Experiences table visible with at least 3 rows showing relevance scores
- [ ] Skills table visible with at least 5 skills
- [ ] Achievements table visible with at least 3 rows
- [ ] Accept/reject controls are functional on all tables
- [ ] Proceed button becomes active after selections are made
- [ ] No error on proceeding

---

### Phase 5 — Rewrite Review (US-R3)

Steps:
1. Navigate to the Rewrite tab (may appear after Customization).
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

### Phase 6 — Spell Check (US-A4b)

Steps:
1. Navigate to the Spell Check tab or panel if visible.
2. Accept or ignore each flag shown.
3. Proceed to generation.

Checks:
- [ ] Spell check panel is accessible
- [ ] Flags, if present, show suggested corrections
- [ ] Proceeding to generation works without error

If no separate spell check step is visible, mark N/A and continue.

---

### Phase 7 — CV Generation (US-A5)

Steps:
1. Click Generate CV or navigate to the Generation tab.
2. Wait for generation to complete (up to 90 s — document rendering).
3. Inspect the results panel.

Checks:
- [ ] Generation progress indicators appear for each format
- [ ] ATS DOCX download link appears after generation
- [ ] PDF download link appears after generation
- [ ] Human DOCX download link appears after generation
- [ ] ATS validation report is shown with pass/warn/fail indicators
- [ ] No generation errors or stack traces visible
- [ ] Session saved indicator appears

---

### Phase 8 — ATS Validation Report (US-H6)

Steps:
1. Inspect the ATS validation report on the Generation tab.

Checks:
- [ ] Report shows at least 8 validation checks
- [ ] Each check has a clear status: pass, warn, or fail
- [ ] No structural checks show fail (no tables, no text boxes, contact in body)
- [ ] Keyword match check is present

---

### Phase 9 — Session Persistence (US-A6)

Steps:
1. Hard-refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux).
2. Wait for page to reload.

Checks:
- [ ] Session state is restored (position name, company, or analysis visible)
- [ ] Workflow step indicator reflects the correct phase, not reset to step 1
- [ ] Generated file links are still accessible

---

### Phase 10 — Error Handling (US-U8)

Steps:
1. Reset the session (click Reset if available) to get a clean state.
2. Attempt to proceed past job input without entering any text.
3. Try submitting an invalid URL: not-a-url

Checks:
- [ ] Empty submission shows a clear, user-readable error message
- [ ] Invalid URL shows an actionable error, not a raw Python exception
- [ ] App recovers and remains usable after both error attempts

---

## Report Format

Produce this table after completing all phases:

### E2E Test Report
Date: <date>
LLM Provider: <provider observed in header>
Job: sample_job_description.txt

| Phase | Description           | Status      | Notes |
|-------|-----------------------|-------------|-------|
| 0     | App load              | PASS/FAIL   |       |
| 1     | Job input             | PASS/FAIL   |       |
| 2     | Analysis display      | PASS/FAIL   |       |
| 3     | Clarifying questions  | PASS/FAIL   |       |
| 4     | Customization review  | PASS/FAIL   |       |
| 5     | Rewrite review        | PASS/FAIL   |       |
| 6     | Spell check           | PASS/FAIL   |       |
| 7     | CV generation         | PASS/FAIL   |       |
| 8     | ATS validation report | PASS/FAIL   |       |
| 9     | Session persistence   | PASS/FAIL   |       |
| 10    | Error handling        | PASS/FAIL   |       |

### Failures requiring attention
List any FAIL or PARTIAL items with detail.

### Console errors observed
List any JavaScript console errors seen during the test.

---

## Guidance for the Testing Agent

- Use find to locate elements before clicking them; never click speculatively.
- Wait for async operations: after clicking Analyze or Generate, poll with get_page_text or
  read_page until the expected content appears. Budget 30 s for LLM analysis, 90 s for generation.
- Capture evidence of failures with a screenshot using the computer screenshot action before
  moving on to the next phase.
- Do not abort on a single failure — mark it FAIL and continue to the next phase.
- Respect the single-session lock: if a 409 appears, click Reset or wait 30 s before retrying.
  Do not open a second browser tab.
- Use read_console_messages after each major action to catch silent JavaScript errors.
