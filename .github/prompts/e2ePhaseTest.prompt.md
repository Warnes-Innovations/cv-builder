---
name: e2ePhaseTest
description: Re-test one or more cv-builder UI phases after a targeted code change. Faster than the full e2e suite.
argument-hint: Phase number (0-10), name (e.g. "rewrite"), or range (e.g. "3-5"). Omit to be prompted.
---

# CV-Builder Phase Re-Test

Run a targeted re-test of one or more workflow phases against a running cv-builder server.
Use this when you have just changed a specific area and want quick confirmation without a full e2e run.
For a full regression run, use the `cv-e2e-tester` agent instead.

## Phase Reference

| # | Name                   | Key user story |
|---|------------------------|----------------|
| 0 | App load               | —              |
| 1 | Job input              | US-A1          |
| 2 | Analysis display       | US-A2          |
| 3 | Clarifying questions   | US-A2          |
| 4 | Customization review   | US-A3          |
| 5 | Rewrite review         | US-R3          |
| 6 | Spell check            | US-A4b         |
| 7 | CV generation          | US-A5          |
| 8 | ATS validation report  | US-H6          |
| 9 | Session persistence    | US-A6          |
| 10 | Error handling        | US-U8          |

## Instructions

1. Identify the target phase(s) from the argument provided after `/e2ePhaseTest`.
   - Accept a single number (`5`), a phase name (`rewrite`), or a range (`3-5`).
   - If no argument was given, ask the user which phase(s) to test before proceeding.
2. Check the prerequisite workflow state: some phases require prior phases to have completed
   (e.g., Phase 5 requires the session to be past the analysis step). Note any prerequisites
   and confirm with the user that the app is in the right state, or navigate there using the browser.
3. Call `read_file` on `.claude/commands/e2e-browser-test.md` and read the relevant phase
   section(s) before executing anything. Do not rely on memorised phase steps — use the live file.
   Then execute the steps and checks exactly as written. Do not invent or omit checks.
4. Report results inline after each phase: **PASS** / **FAIL** / **PARTIAL** with brief evidence
   (element found, text visible, interaction succeeded, etc.).
5. If a phase fails or is PARTIAL, capture a screenshot before moving on.
6. Do NOT run phases outside the requested range — stop cleanly after the last requested phase.
7. Append results to `tasks/e2e-test-report-YYYYMMDD.md` if that file already exists for today;
   otherwise note the results inline and let the user decide whether to save them.

## Tools required

The following VS Code browser tools must be active before invoking `/e2ePhaseTest`:
`open_browser_page`, `navigate_page`, `read_page`, `click_element`, `type_in_page`,
`screenshot_page`. These run in VS Code's Playwright context — no Chrome profile setup needed.

## Server assumption

Assume the server is running at `http://127.0.0.1:5000`.
If the page is not reachable, stop immediately and report:
> Server not responding. Start with: `conda activate cvgen && python scripts/web_app.py --llm-provider github`

Do not attempt to start the server yourself.

## Full phase details

`.claude/commands/e2e-browser-test.md` is the authoritative step-by-step checklist for every phase.
Read the relevant section(s) from that file before executing.
