<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# Trust & Compliance Review Status

**Last Updated:** 2026-04-20 17:30 ET
**Persona:** Trust & Compliance reviewer — approval integrity, content provenance, weak-evidence warnings, user trust in workflow and generated materials
**Executive Summary:** Core approval integrity is strong: rewrite review enforces explicit per-item decisions, harvest write-back is phase-gated server-side, and a timestamped backup precedes every master-data write. Four gaps reduce the current pass rate: persuasion warnings are collapsed by default and can be bypassed without acknowledgement (HIGH); zero-rewrite and zero-flag stages auto-advance silently without user confirmation (MEDIUM); there is no in-app disclosure that CV content is transmitted to external LLM APIs (MEDIUM); and customise-stage decisions are not gated before the Generate action (MEDIUM).

---

## Application Evaluation

### US-C1 — Transparent AI Suggestions

**Criteria 1: Proposed rewrites are visibly presented as suggestions.**

✅ **Pass** — The Rewrites tab renders a panel headed "✏️ Review Text Improvements" with explicit messaging: "Look over each suggestion… accept, edit, or reject each one before continuing to spell check" (`web/rewrite-review.js:64`). Each card shows original and proposed text with an LCS word-level inline diff.

**Criteria 2: Weak-evidence or confirm-first cases are clearly flagged.**

⚠️ **Partial** — The persuasion-warning system (Phase 10) is implemented. `web/rewrite-review.js:46–58` fetches `persuasion_warnings` from `/api/rewrites`, groups them by type, and renders a red collapsible banner at the top of the panel. `conversation_manager.py:980–1064` defines `run_persuasion_checks`, applying 8 heuristic checks (strong action verb, passive voice, word count, result clause, named institution, CAR structure, summary generic phrases). **Gap**: the warning detail section is collapsed by default (`rewrite-review.js:85` `style="display:none"`), and the "✓ Acknowledged" button lives inside the collapsed panel (`rewrite-review.js:92–96`). A user can submit rewrite decisions without ever expanding the warning. Individual cards carry no inline severity badge distinguishing `warn` vs `info`.

**Criteria 3: The UI does not blur approved output with proposed changes.**

✅ **Pass** — Session state separates `pending_rewrites`, `approved_rewrites`, and `rewrite_audit` (`conversation_manager.py:74–77`). The customization stage never auto-promotes any pending rewrite. The tally bar tracks accepted / rejected / pending independently (`rewrite-review.js:338–358`). The `submit-rewrites-btn` is rendered `disabled` on mount (`rewrite-review.js:125`) and stays disabled while `pending > 0` (`rewrite-review.js:358`).

**Acceptance Criterion — AI-proposed content is reviewable before acceptance.**

✅ **Pass** — Every rewrite card exposes explicit accept / edit / reject controls. `submitRewriteDecisions` is blocked by the button-disabled guard.

**Acceptance Criterion — Higher-risk suggestions receive stronger visual signalling.**

⚠️ **Partial** — A red banner aggregates counts by type. The severity field (`warn` | `info`) from `run_persuasion_checks` is stored but is not rendered as a per-card badge or visual distinction at the card level.

---

### US-C2 — User Approval Integrity

**Criteria 1: Review-required stages block progression until decisions are made.**

⚠️ **Partial** — Rewrite review: submit button is blocked while any pending item remains (`rewrite-review.js:358`). **Gap**: when zero rewrites exist, the workflow auto-advances directly to `generate_cv` without showing the Rewrites tab at all (`current-implemented-workflow.md` §Rewrite Review). The user never sees a confirmation that the review stage was evaluated cleanly.

Spell check: a similar fast-path exists — if no flags are returned, the frontend auto-continues to generate (`current-implemented-workflow.md` §Spell Check, note 1).

Customise stage: experience/skill/achievement decisions are not gated. The Generate button (`app.js:117`) checks `userSelections` for already-submitted decisions but does not block if the user has never opened the decision panels.

**Criteria 2: Acceptance, rejection, and edit paths remain distinguishable.**

✅ **Pass** — Three distinct rewrite actions: accept (green), reject (red), edit (opens textarea). Card class names reflect state (`.accepted` / `.rejected`, `rewrite-review.js:301–307`). Active buttons receive the `.active` class.

**Criteria 3: The UI does not silently auto-accept items expected to be user-controlled.**

⚠️ **Partial** — When rewrites exist, no item is auto-accepted. When zero rewrites exist the workflow treats absence as implicitly accepted and advances silently. Same applies to the zero-flags spell-check path.

**Acceptance Criterion — Approval-dependent stages enforce explicit decision-making.**

⚠️ **Partial** — Satisfied for non-empty rewrite review. Not satisfied for: (a) empty rewrite review fast-path, (b) empty spell-check fast-path, (c) Customise stage with no decision gating.

---

### US-C3 — Provenance and Audit Cues

**Criteria 1: Diff-like review is available where text is being changed.**

✅ **Pass** — `computeWordDiff` (`rewrite-review.js:196–259`) implements a full LCS word-level diff, tokenising by whitespace and producing `unchanged` / `removed` / `added` tokens. Removed tokens render as red strikethrough, added tokens as green. Diffs regenerate live when a user edits a card.

**Criteria 2: The UI retains or exposes rationale where promised.**

✅ **Pass** — Each rewrite proposal carries a `rationale` field. `rewrite_audit` in session state (`conversation_manager.py:920`) stores every proposal merged with its outcome and `final` text. The harvest candidate table (`finalise.js:276`) renders `c.rationale` in a dedicated column for every candidate.

**Criteria 3: Finalisation and harvest flows remain traceable to reviewed changes.**

✅ **Pass** — `_compile_harvest_candidates` (`generation_routes.py:897`) sources candidates exclusively from `conversation.state['approved_rewrites']`. Harvest apply (`generation_routes.py:1961–1978`) creates a git commit with message `"chore: Update master CV data from {company}_{role}_{date} session"`. `_save_master` (`web_app.py:1166–1188`) creates a timestamped backup before overwriting and restores it if post-write schema validation fails.

---

## Generated Materials Evaluation

Generated output files (HTML, PDF, DOCX) do not embed provenance metadata — session ID, LLM provider, model, date, or rewrite-audit summary — in the file itself. Users cannot verify after the fact which session or model produced a given file from the artifact alone. This is an expected limitation of the single-user local architecture but is not disclosed anywhere in the UI.

The harvest rationale column (`finalise.js:276`) renders LLM-generated text without attribution. No label indicates that rationale is AI-inferred rather than factually sourced. Users evaluating candidates in the harvest table cannot distinguish the basis of the rationale.

---

## Additional Story Gaps / Proposed Story Items

**GAP-T1 (HIGH) — Persuasion warning acknowledgement can be bypassed**
Warning detail is collapsed by default (`rewrite-review.js:85`, `style="display:none"`). The "✓ Acknowledged" button is inside the collapsed section (`rewrite-review.js:92–96`). Users can submit rewrite decisions without ever reading or expanding the warning.
*Proposed US-C4*: The Submit button must remain disabled until each `warn`-severity persuasion warning has been individually acknowledged via the button inside the expanded panel.

**GAP-T2 (MEDIUM) — Silent auto-advance through empty review stages**
Zero-rewrite and zero-flag paths advance without any user-visible confirmation that the stage was evaluated. Users cannot distinguish "nothing needed review" from "review was skipped."
*Proposed US-C5*: When a review stage produces zero items, display an explicit confirmation screen with a summary ("0 rewrites required" / "0 spell flags found") before advancing.

**GAP-T3 (MEDIUM) — No in-app disclosure that CV content is transmitted to external LLM APIs**
The application sends the user's full CV data and job description to third-party LLM providers. There is no in-app notice or one-time acknowledgement of this data flow. The localhost URL and file-path settings imply local storage, but the transmission path is invisible.
*Proposed US-C6*: First session creation must show a one-time disclosure ("Your job description and CV excerpts are sent to the configured LLM provider for analysis") with an explicit acknowledgement checkbox before proceeding.

**GAP-T4 (MEDIUM) — Customise stage decisions not gated before Generate**
A user can reach the Generate step without visiting or deciding on any item in the Customise stage. The customizations used for generation may not reflect any user intent.
*Proposed US-C7*: The Generate action must require that at least one explicit decision has been submitted from the Customise stage, or show a blocking warning that no customisation decisions were made.

**GAP-T5 (LOW) — Harvest rationale column is AI-generated but unlabelled**
Rationale in the harvest table (`finalise.js:276`) is LLM-produced and displayed without attribution or caveat.
*Proposed US-C8*: Harvest candidate rationale fields must carry a visible "(AI-generated)" annotation.

**GAP-T6 (LOW) — Session data retention not disclosed**
Sessions accumulate indefinitely in `~/CV/files/sessions`. There is no in-app guidance on retention, how to delete sessions, or what happens to files after in-memory eviction.
*Proposed US-C9*: The Sessions panel must include a note explaining where session files are stored and how to permanently delete them.

---

**Reviewed against:**
- `web/index.html` (lines 1–550+)
- `web/app.js` (all 136 lines)
- `web/ui-core.js` (lines 1–430)
- `web/state-manager.js` (lines 1–400)
- `web/rewrite-review.js` (lines 1–430)
- `web/finalise.js` (lines 1–430)
- `web/master-cv.js` (lines 1–200)
- `web/session-actions.js` (lines 1–150)
- `scripts/web_app.py` (lines 1–300, 1150–1260)
- `scripts/utils/conversation_manager.py` (lines 60–120, 880–1064)
- `scripts/routes/generation_routes.py` (lines 1–120, 897–980, 1093–1120, 1860–1980)
- `tasks/current-implemented-workflow.md` (all)
- `tasks/user-story-trust-compliance.md` (all)

| Story | ✅ Pass | ⚠️ Partial | ❌ Fail | 🔲 Not Impl | — N/A |
|-------|---------|-----------|--------|------------|-------|
| US-C1 Transparent AI Suggestions | 3 | 2 | 0 | 0 | 0 |
| US-C2 User Approval Integrity     | 1 | 3 | 0 | 0 | 0 |
| US-C3 Provenance and Audit Cues   | 3 | 0 | 0 | 0 | 0 |

**Tally: 7 ✅ Pass · 5 ⚠️ Partial · 0 ❌ Fail · 0 🔲 Not Implemented · 0 — N/A**

**Key evidence references:**
- `web/rewrite-review.js:125` — `submit-rewrites-btn` rendered `disabled` on mount
- `web/rewrite-review.js:358` — button re-enabled only when `pending === 0`
- `web/rewrite-review.js:85–96` — persuasion warning detail collapsed by default; "Acknowledged" button inside collapsed section
- `web/rewrite-review.js:46–58` — `persuasion_warnings` fetched from `/api/rewrites`
- `conversation_manager.py:74–77` — `pending_rewrites`, `approved_rewrites`, `rewrite_audit` kept separate
- `conversation_manager.py:920` — `rewrite_audit` stores full proposal + outcome
- `generation_routes.py:897` — `_compile_harvest_candidates` sources from `approved_rewrites` only
- `generation_routes.py:1097–1107` — harvest write-back blocked server-side outside refinement phase
- `web_app.py:1166–1188` — `_save_master` creates timestamped backup, validates schema, restores on failure
- `master-cv.js:70–76` — persistent governance banner on Master CV tab
- `web/index.html:48–56` — active LLM provider/model visible in header pill at all times
- `ui-core.js:79–91` — `_settingsSourceLabel` renders config source per setting

**Evidence standard:** Every conclusion is supported by file:line citations from direct source inspection. No conclusion depends on prior review documents or untested assertions.
