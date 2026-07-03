<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Heuristic UX Evaluation

**Last Updated:** 2026-06-30 09:00 ET

**Reviewer:** Senior UX / Interaction Design Expert (cycle 8)

**Scope:** Full source read of `web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, plus targeted reads of `web/finalise.js`, `web/layout-instruction.js`, `web/ats-modals.js`, `web/interview-prep.js`, `web/thank-you.js`, `web/session-manager.js`, and `web/review-table-base.js`.

**Executive Summary:** CV Builder is a technically sophisticated single-user tool with solid feedback loops (LLM busy overlay with elapsed timer, ATS score badge, layout freshness chip, toast notifications). Recent fixes addressed several gaps: the "? Help" button provides a clear path back to onboarding (GAP-247), brand name is now "CV Builder" in the key surfaces (GAP-251), Layout Review auto-confirms when no instructions are added (GAP-249), the ATS score grade legend is inline (GAP-234), and the Finalise notes textarea is pre-populated with a character counter (GAP-235/236). Despite these improvements, three structural issues persist: a triple-layer navigation model (workflow pills + secondary tabs + chat action buttons) that competes without a clear mental model; two permanent placeholder steps (Interview Prep, Thank You) that are present in the workflow nav but deliver no functional content; and error messages that surface raw technical state to end-users across dozens of codepaths without actionable recovery guidance.

---

## Nielsen's 10 Heuristics

---

### H1: Visibility of System Status — 🟡 Minor

**Finding:** LLM call status is well communicated: the busy overlay (`#llm-busy-overlay`) shows a spinner, elapsed time (`#llm-busy-elapsed`), step label (`#llm-busy-label`), and a slow-mode badge with a "■ Stop" button. The ATS score badge auto-refreshes and changes color threshold. The layout freshness chip uses tone (fresh/stale/critical) with a CSS pulse animation on state changes. However, several gaps remain:

1. The LLM status pill in the header shows "⚠ Not ready" / "Not configured" on first load with no inline path to fix it — the user must know to click the same pill to open the wizard.
2. The raw `llm-token-count` metric (index.html:171) appears in the conversation header without explanation, creating status noise for non-technical users.
3. While an LLM call is in-flight, only the chat panel is overlaid; the viewer-area tabs remain fully clickable, and their stale state is not communicated.
4. Workflow step pills (Analysis, Customise, Rewrites…) show state (completed/active/upcoming/stale) via color class only — no text label describes what each state means unless the user hovers (tooltip-only, inaccessible on touch).

**Evidence:**

- `web/index.html:55–62` — `#llm-status-pill` initializes as `unauthenticated`/`Not ready`; no inline CTA text
- `web/index.html:171` — `#llm-token-count` in conversation header, no label, developer metric
- `web/styles.css:150–168` — step states use color alone (.active/.completed/.stale/.stale-critical/.upcoming)
- `web/layout-instruction.js:1254–1270` — freshness check only, no mid-flight status on viewer area

---

### H2: Match Between System and the Real World — 🟠 Major

**Finding:** Several elements use internal/technical language that does not map to a user's mental model:

1. Phase names leak into the UI: "Layout Review" vs "File Review" vs "Generated Files" — three tabs covering roughly the same artifact pipeline, named from an internal generation-pipeline perspective rather than the user's job-application perspective.
2. The workflow has 12 steps including "Harvest" — a term with no obvious meaning to a first-time user and no in-situ explanation.
3. The `#position-bar` shows nothing until a session is active; the UI shows empty `position-title` and `position-company` divs, giving no prompt about what belongs there.
4. The onboarding modal mentions `Master_CV_Data.json` and a filesystem path — appropriate for technical users, but a barrier for less technical ones.
5. "Customise" (British English) appears as a step name on what is otherwise an American-English interface ("Achievements", "Finalise").

**Evidence:**

- `web/index.html:134–136` — "Layout Review" → "Download" → "Cover Letter" as sequential steps; users likely think of "Download" as an endpoint, not a review step
- `web/index.html:146` — step label "Harvest" with 🌾 emoji, no tooltip explaining what harvesting means in context
- `web/index.html:39–41` — `#position-title` and `#position-company` are empty until session active; no placeholder text
- `web/index.html:330–387` — onboarding modal mentions `Master_CV_Data.json` path in monospace filesystem syntax

---

### H3: User Control and Freedom — 🟡 Minor

**Finding:** Back-navigation via clicking completed workflow step pills is implemented. The "■ Stop" button on the LLM busy overlay allows aborting requests. Modal ESC closes work. Session switching is accessible via the header. However:

1. The workflow is primarily linear: there is no documented undo for decisions made in Experiences, Skills, Achievements, or Summary tabs. Users who accidentally remove an experience and proceed have no evident recovery path.
2. The "Don't show this again" checkbox on the welcome modal is respected — but the "? Help" button (GAP-247) correctly reopens it unconditionally via `showWelcomeModal()`. This is good, but the checkbox label implies the modal is dismissed forever, when the "? Help" button contradicts that expectation.
3. Two steps in the workflow nav — Interview Prep (🎤) and Thank You (🙏) — render only a placeholder with "coming soon" content. Users who navigate to them cannot go forward in the workflow from within those tabs; the only option is the "Proceed to…" button which links to the next placeholder. There is no "Back" affordance within those tabs.
4. The collapse button for the chat panel (◀) persists state but does not show a clear expand affordance when fully collapsed (only a 50px-wide strip with the toggle button).

**Evidence:**

- `web/interview-prep.js:22–39` — placeholder content, no back-nav, `handleStepClick('thank_you')` as the only action
- `web/index.html:157` — toggle-chat button at rest is `◀` and collapses to 50px; collapsed state has `aria-label="Expand chat panel"` but visually is just a strip
- `web/index.html:391` — "Don't show this again" checkbox wording conflicts with "? Help" button semantics
- `web/session-manager.js:219–241` — `showWelcomeModal()` ignores localStorage flag (correct behavior)

---

### H4: Consistency and Standards — 🟡 Minor

**Finding:** Significant improvements: "CV Builder" is now unified in the `<h1>`, `<title>`, and onboarding modal heading (GAP-251). However, residual inconsistencies remain:

1. **Dual `setupEventListeners` functions:** `app.js:105` and `ui-core.js:519` each define `setupEventListeners()`. The app.js version guards with `_listenersRegistered` but the ui-core version has no such guard. Both are called from `init()` and `initialize()` respectively. This creates a risk of double-listener binding that could fire events twice.
2. **Action button terminology:** Primary buttons use mixed action language — "Review Rewrites" (verb-noun), "Continue to Spell Check →" (direction), "Confirm Layout" (imperative), "Package Application Files" (noun phrase). No consistent pattern.
3. **Error message format:** Some errors use `❌ Failed to…` prefix, others use `⚠️ Could not…`, others are raw technical strings (`error.message`).
4. **"Finalise" (British) vs "Finalize" (American):** Both spellings appear in different surfaces.
5. **Tab label "File Review" vs step label "Download":** The workflow pill says "Download" but the tab bar shows "File Review" — two names for the same concept.

**Evidence:**

- `web/app.js:105–107` — `_listenersRegistered` guard; `web/ui-core.js:519` — no guard
- `web/index.html:193–198` — action button labels in .actions div show mixed verb/noun patterns
- `web/index.html:136` and `web/index.html:226` — "Download" (step pill) vs "File Review" (tab label)
- `web/finalise.js:113` — "Finalise & Archive" button; `web/ui-core.js:682` — "Error loading content" (American)

---

### H5: Error Prevention — 🟢 Good

**Finding:** Multiple good error-prevention mechanisms are in place:

1. The LLM model wizard (4-step) keeps users from proceeding without a provider, key, and passing connection test.
2. Phase enforcement on the backend prevents out-of-order generation.
3. The layout freshness chip and stale-step indicators prevent users from finalizing from stale content.
4. The `confirmDialog()` function uses a custom modal rather than browser `confirm()`, preventing dialog suppression.
5. Session ownership conflict detection (amber banner + conflict modal) prevents dual-write corruption.
6. The `layout-instruction.js:1256–1270` auto-confirm path silently skips the redundant confirm click when no instructions were added (GAP-249) — elegant error prevention.
7. Persuasion warnings are surfaced during rewrite review.

Minor weaknesses:

- The `finalise-notes` textarea has a 2000-character cap, but the counter only changes color at 1600 and 1800 — no warning before the user hits the wall.
- Experience/skill decisions are not validated before the "Continue to Spell Check" transition; a user could proceed with every experience removed.

**Evidence:**

- `web/layout-instruction.js:1259–1270` — auto-confirm when `window.layoutInstructions.length === 0`
- `web/finalise.js:103–108` — character counter with 1600/1800 thresholds, no proactive warning below 1600
- `web/ui-core.js:372–443` — `confirmDialog()` custom implementation

---

### H6: Recognition Rather Than Recall — 🟡 Minor

**Finding:** The secondary tab bar is contextual — it shows only the tabs relevant to the current workflow stage (via `STAGE_TABS` mapping in `ui-core.js:350–363`). This reduces cognitive load significantly. However:

1. The `Customise` step in the workflow bar expands to 10 sub-tabs (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score). Users must recall which sub-tabs they have already acted on — there is no completion indicator on individual tabs.
2. The action button row at the bottom of the chat panel shows only one primary button at a time, but the chat conversation also references actions by name (e.g., "analyze job"). Users must remember that these chat words correspond to the primary buttons.
3. The "Master CV" tab is always accessible in the job stage but not in other stages — the `STAGE_TABS` mapping only includes it under `job`. Users in later stages who want to reference their master CV must navigate back.
4. The sessions panel shows a "Recent" strip, which supports recognition — well done.

**Evidence:**

- `web/ui-core.js:350–363` — `STAGE_TABS` mapping; `customizations` maps to 10 tabs
- `web/ui-core.js:350–352` — `job` includes `master` tab; no other stage does
- `web/index.html:185` — placeholder text in `message-input` says "Type a message (e.g., 'analyze job')" — recall dependent

---

### H7: Flexibility and Efficiency of Use — 🟡 Minor

**Finding:** Power users can type commands in the chat input and the system handles them. The session switcher supports quick switching. The workflow step pills serve as back-navigation shortcuts. However:

1. No keyboard shortcut system exists for primary workflow actions. Users must click through the interface for every step.
2. The chat input `Enter` key fires `sendMessage()` — consistent and efficient. But there is no Shift+Enter for multi-line input (the listener is on `keypress` with `e.key === 'Enter'` only).
3. All secondary tabs within a stage are visible at once (when stage is active), but the tab bar overflows with scroll arrows for stages with many tabs. On the Customise stage with 10 tabs, users on narrow screens must scroll the tab bar to find the tab they want.
4. The cover letter and screening responses are accessible as post-download workflow steps, which means users cannot start a cover letter until they have gone through all prior steps. There is no way to jump ahead.
5. There is no keyboard shortcut or quick-access to the ATS Report or Job Analysis modals, even though users frequently refer back to these.

**Evidence:**

- `web/ui-core.js:558–566` — `keypress` Enter listener, no Shift+Enter guard
- `web/index.html:206–236` — 24 total tabs in the tab bar; on `customizations` stage 10 are visible simultaneously
- `web/ui-core.js:350–363` — stage ordering requires passing through `download` before `cover_letter` is accessible

---

### H8: Aesthetic and Minimalist Design — 🟠 Major

**Finding:** The overall visual language is clean and professional (Slate/Blue palette, consistent card styling, good use of whitespace). However, the layout has significant visual density problems:

1. **Triple navigation system:** Workflow step pills (12 items) + secondary tab bar (up to 10 items per stage) + chat action buttons (up to 8 buttons) creates three competing navigation structures. A user at the Customise stage has 12 workflow pills, 10 tabs, and potentially 3 action buttons visible simultaneously.
2. **Fixed 40% chat width:** The chat panel takes 40% of the screen at all times, even when users are doing deep review work in the viewer area (experience review, spell check, rewrite decisions). The ◀ collapse is available but not discoverable.
3. **Header density:** The header contains a logo, app name, session name, six control items (Sessions, New Session, LLM model/status pill, Non-confidential badge, Connection test badge, Help, Settings) — 7–8 interactive elements. On a 1280px monitor this is manageable, but many items have small target sizes.
4. **Workflow pills at 32px gap with 12 items scroll horizontally** on screens below ~1400px, hiding the tail of the workflow from immediate view.
5. **The position bar row** can contain: position title, rename button, company subtitle, ATS score badge, ATS score summary, layout freshness chip, a divider, Master CV button, ATS Report button, and Job Analysis button — 9 potential elements on one bar.

**Evidence:**

- `web/styles.css:148–149` — `.workflow-steps { gap: 32px; overflow-x: auto; }` — horizontal scroll on narrow viewports
- `web/styles.css:330` — `.main-container` height `calc(100vh - 210px)` with the 210px consumed by header + position bar + workflow nav
- `web/index.html:44–70` — header right zone: 5 pill buttons plus 2 badges
- `web/index.html:89–110` — position-bar-actions: ATS badge, ATS summary, freshness chip, divider, 3 action buttons

---

### H9: Help Users Recognise, Diagnose, and Recover from Errors — 🟠 Major

**Finding:** Error output is inconsistent across the application. Many errors are dumped directly to the chat conversation as system messages with raw `error.message` values, providing no guidance for recovery:

- `web/layout-instruction.js:734` — `❌ Failed to apply instruction: ${error.message}` — raw JS error
- `web/layout-instruction.js:1289` — `❌ Failed to generate final files: ${error.message}` — no suggested recovery
- `web/layout-instruction.js:858` — `❌ Failed to apply layout instruction: ${error.message}`
- `web/job-analysis.js:161` — appends a retry message via `appendRetryMessage` — a positive exception

The chat interface is also used for both user communication and system status — users see `⚠️ Could not establish a session`, `🔄 Connecting...`, and `✅ Connection successful.` mixed with their actual CV workflow conversation history. After a long session these system messages pollute the conversation and make the workflow harder to follow.

Some specific recoverable errors have good UX: the `api-client.js:175` extracts error messages from JSON, and the LLM retry policy with exponential backoff is configurable. But end-users have no awareness these retries are happening.

**Evidence:**

- `web/app.js:51–72` — connection messages appended to conversation using `appendMessage('system', ...)`, same stream as conversation
- `web/layout-instruction.js:681,734,813,858,1069,1224,1289,1335,1346` — 9 error paths with raw error.message
- `web/job-analysis.js:161` — positive example using `appendRetryMessage`
- `web/harvest.js:519` — `.error-message` CSS class used for errors in viewer content area (better pattern)

---

### H10: Help and Documentation — 🟡 Minor

**Finding:** GAP-247 resolved: The "? Help" button (index.html:63–66) with `aria-label="Help — reopen getting started guide"` is correctly placed in the header and calls `showWelcomeModal()` unconditionally. This adequately addresses the original gap — users can always reopen the 3-step workflow overview. The onboarding modal itself is well-structured with numbered steps, conditional sections (profile present/empty/missing), and clear prerequisites.

Remaining gaps:

1. The "? Help" button opens the onboarding modal, which describes the *overall* workflow but provides no contextual help for the *current step* a user is on. If a user is confused about what "Harvest" does at step 12, the Help button returns them to step 1's overview.
2. There is no inline help or tooltip on any of the 10 Customise sub-tabs explaining what each one does (Goals, Questions, Achievements, Tagline, Summary, Publications are not self-explanatory in context).
3. The model wizard footer shows "Loading pricing info…" (`#pricing-updated-label`) but no explanation of what the pricing table means for users' costs.
4. Settings fields (`Default Provider`, `Temperature`, `Request Timeout`) have no help text; only a source label (e.g., "Source: config.yaml").
5. The `Non-confidential` badge (index.html:59) has a tooltip explaining data retention but is only exposed on hover, inaccessible on touch.

**Evidence:**

- `web/index.html:63–66` — "? Help" button, `onclick="showWelcomeModal()"` — adequate for H10
- `web/session-manager.js:219–241` — `showWelcomeModal()` shows stage-appropriate content (present/empty/missing) — good contextual adaptation at entry, but not mid-workflow
- `web/index.html:537–544` — model table with 8 columns including Copilot multiplier; no legend for non-technical users
- `web/index.html:594–614` — settings fields have source labels but no `<label>` tooltips or help text

---

## Additional UX Dimensions

### Cognitive Load

Assessment: High

The application requires simultaneous attention to: (a) the workflow step pill showing current phase, (b) the secondary tab bar showing available content panels, (c) the chat conversation for AI guidance, and (d) the viewer content area for reviewing decisions. Users must track which decisions they have made (no completion indicators on sub-tabs), and the document header can show up to 9 elements. The LLM-generated conversation messages are contextually dense and not scannable.

Mitigation present: contextual tab-bar filtering reduces visible tabs to stage-relevant ones. The LLM busy overlay replaces the action area during processing.

### Visual Hierarchy

Assessment: Adequate with exceptions

The palette creates clear separation between primary surfaces (dark header, white body, light-gray tabs). The ATS score badge uses font-weight and color-coded thresholds clearly. The action button row uses `.action-btn.primary` (blue) and `.action-btn.secondary` (gray) distinction. However, the workflow pills and the tab bar use similar visual weight, creating competition between the two navigation levels. The position bar (between header and workflow) reads as a status bar but contains interactive buttons — the mixed affordance is not visually distinct.

### Information Architecture

Assessment: Major gap

The information architecture has two navigation layers (workflow steps + tabs) that model the same information from different angles: workflow steps reflect the backend `Phase` enum, while tabs reflect available data panels for a given phase. These are not fully correlated. For example: during the Customise stage, 10 tabs are shown, but the workflow bar shows only one step ("Customise"). Users have no map between the two. Additionally, 12 workflow steps are shown including two unimplemented stubs (Interview Prep, Thank You), misrepresenting the actual functional scope of the tool.

Evidence: `web/state-manager.js:35–45` — `PHASE_TO_STEP` maps 9 backend phases to 8 workflow steps, but the UI shows 12 steps (cover_letter, screening, interview_prep, thank_you, harvest are post-download).

### Workflow Momentum

Assessment: Good, with friction at gates

The auto-analyze on load (app.js:90–98) reduces setup friction. The Layout Review auto-confirm (GAP-249, layout-instruction.js:1264–1270) eliminates a redundant gate. Primary action buttons advance the workflow without needing to understand the underlying phase model. Momentum breaks at: (a) the LLM configuration wall before first use — the status pill is a 1-click entry but unadvertised; (b) the 10-tab Customise stage where "done" is ambiguous; (c) the Interview Prep and Thank You stubs which dead-end the workflow.

### Feedback Loops

Assessment: Good

- LLM busy overlay with elapsed timer and slow-mode badge: excellent
- ATS score badge auto-updates after generation: good
- Layout freshness chip with CSS pulse on stale transition: good
- Toast notifications for per-item saves (achievements, skills): good
- Session conflict banner: good
- `workflow-stage-announcer` aria-live region for screen readers: good
- Character counter on finalise-notes: good (GAP-235/236)

Gap: no feedback when a tab's content becomes stale (e.g., after re-running a phase, the user is not told that the Analysis tab now shows new data).

### Error Recovery

Assessment: Minor gaps

The "■ Stop" button aborts LLM requests. Session conflict resolution has three options (Load Different / New Session / Take Over). The retry policy is configurable (auto-backoff). However, most error messages in the chat stream (`appendMessage('system', '❌ ...')`) do not offer a recovery action button. The `appendRetryMessage` pattern used in `job-analysis.js` should be the standard but is not consistently applied.

### Affordance Clarity

Assessment: Minor gaps

- Completed workflow steps show a "re-run" sub-button (`.step-rerun`) that is `opacity: 0` at rest and only appears on hover (workflow-steps.js:762). This creates a hidden affordance that keyboard/touch users may never discover.
- The chat collapse button (◀) is a small 34px-wide strip when expanded, easy to overlook.
- The tab-scroll arrows (`tab-scroll-left`, `tab-scroll-right`) are hidden until the bar overflows — correct behavior, but on a narrow viewport they can appear unexpectedly.
- Many modal close buttons use `&times;` without a visible label, relying entirely on the `aria-label` for accessibility.

### Terminology Clarity

Assessment: Minor gaps

- "Harvest" — unclear to new users
- "Customise" vs "Customize" — mixed
- "Finalise" / "Finalize" — mixed
- "ATS" — acronym never expanded in the UI (though the ATS Report modal title is "📊 ATS Report")
- "Layout Review" and "Layout current" — "layout" in CV context could mean document layout or section layout; the intended meaning (PDF/DOCX rendering) is only clear from context
- "Spell Check" step label vs "Spell & grammar check" step title attribute on index.html:132 — two descriptions for one step

---

## Top 5 UX Issues by Impact

### 1. Triple Navigation System Creates Orientation Confusion

Impact: Very High — likely cause of abandonment during first sessions

The application presents three simultaneous navigation systems: 12 workflow step pills in the top nav bar, up to 10 secondary tabs in the viewer area, and contextual action buttons in the chat panel. There is no visible hierarchy between them. During the Customise stage, a user sees 12 workflow pills, 10 tabs, and chat action buttons — with no mapping explaining how these relate. Users must develop their own mental model to navigate.

Evidence:

- `web/index.html:122–148` — 12 workflow step pills
- `web/index.html:207–234` — 24 tab elements (10 visible during Customise)
- `web/ui-core.js:350–363` — `STAGE_TABS` mapping is code-only; not surfaced to users
- `web/index.html:190–198` — action buttons in .actions div, separate from both navigation layers

---

### 2. Two Unimplemented Workflow Steps Misrepresent Functional Scope

Impact: High — user trust and workflow momentum

The workflow navigation permanently shows "🎤 Interview Prep" and "🙏 Thank You" as steps. Both resolve to placeholder content ("coming soon") with no functional capability. A user who completes their CV and proceeds through Download → Cover Letter → Screening → Interview Prep hits a dead-end with "AI-generated interview preparation based on this job and your CV is coming soon." The "Proceed to Thank You Letter →" button leads to another placeholder. This is a broken promise: the workflow implies the tool does more than it does.

Evidence:

- `web/interview-prep.js:9` — "Interview Preparation phase — placeholder content with navigation"
- `web/thank-you.js:9` — "Thank You Letter phase — placeholder content with navigation"
- `web/index.html:142–144` — both steps present in the main workflow nav
- `web/ui-core.js:358–362` — both stages mapped in `STAGE_TABS` with real tab IDs

---

### 3. Error Messages in Chat Stream Lack Recovery Guidance

Impact: High — failed task recovery leads to session abandonment

Across 9+ error codepaths in `layout-instruction.js` alone, errors are appended to the conversation as system messages with raw `error.message` values. There is no inline "Try Again" button, no explanation of why the error occurred in user terms, and no distinction between transient (network) errors and persistent (state) errors. The chat conversation serves as both AI dialogue and system error log — errors from hours ago remain visible and mix with workflow guidance.

Evidence:

- `web/layout-instruction.js:734,858,1069,1224,1289,1335,1346` — 7 error paths with no recovery action
- `web/app.js:51,63,71` — connection status appended to same conversation stream as AI responses
- `web/job-analysis.js:161` — positive counter-example: `appendRetryMessage` provides an inline retry button

---

### 4. LLM Configuration Entry Point Is Invisible to New Users

Impact: High — blocks all core functionality until resolved

First-time users must configure an LLM provider before anything works. The only entry points are: (a) the `model-selector-btn` pill in the header showing "LLM: Loading… ⚠ Not ready", or (b) the onboarding modal's prerequisite note saying "use the ⚙ LLM button in the header". The pill label is "Loading…" followed by "⚠ Not ready" — which reads as a loading state, not a call-to-action. A first-time user may wait for "Not ready" to resolve on its own. There is no inline CTA ("Click here to configure your LLM provider") and no blocking interstitial until the LLM is ready.

Evidence:

- `web/index.html:51–62` — `model-selector-btn` with initial labels "Loading…" and "⚠ Not ready"
- `web/index.html:350–357` — onboarding modal prerequisite note is text-only with no button to trigger the wizard
- `web/ui-core.js:827–868` — `_updateLlmStatusPill()` sets `unconfigured`→`Not configured`, no CTA affordance
- `web/app.js:41–103` — `init()` does not gate on LLM being configured

---

### 5. Customise Stage Has No Completion Visibility Across 10 Sub-Tabs

Impact: Medium-High — users cannot tell when they are done customising

The Customise workflow stage maps to 10 secondary tabs (Goals, Questions, Experiences, Experience Bullets, Skills, Achievements, Tagline, Summary, Publications, ATS Score). Each tab contains decisions — keep/remove items, fill in answers, write custom bullets. There is no completion indicator on any tab, no summary of what was reviewed vs skipped, and no gating that prevents the user from clicking "Recommend Customizations" or advancing without having reviewed all tabs. Users with incomplete decisions proceed silently.

Evidence:

- `web/ui-core.js:353` — `customizations` stage maps to 10 tabs, none have completion badges
- `web/styles.css:629–655` — `.tab.active` uses blue bottom border and color; no completed/incomplete state variant defined
- `web/app.js:122–130` — `generate-btn` click handler calls `fetchAndReviewRewrites()` with no completion check for all 10 tabs
- `web/state-manager.js:88–122` — `experience_decisions`, `skill_decisions`, `achievement_decisions`, `publication_decisions` tracked but not surfaced in the tab bar

---

## Recent Changes Evaluation

### GAP-247: "? Help" button (index.html:63–66)

Verdict: Adequately addresses H10 for mid-session re-access.

The button is correctly placed in the header, has a clear `aria-label`, and calls `showWelcomeModal()` unconditionally (bypassing the "don't show" flag). The modal content adapts to Master CV presence state. The gap that remains: the Help button returns users to step-1 onboarding regardless of where they are in the workflow. Contextual help per step would be significantly more useful but is out of scope for this fix.

### GAP-251: "CV Builder" brand unification

Verdict: Resolved for primary surfaces.

The `<title>` (index.html:13), `<h1>` (index.html:40), and onboarding modal title (index.html:327) all read "CV Builder". Spot-checking settings modal (`<h2>⚙️ Settings`) and model wizard (`<h2>LLM Configuration Wizard`) shows no orphaned brand references. Minor residual: the document `<title>` is "CV Builder — Professional Web UI" — the "Professional Web UI" suffix is unnecessary implementation jargon.

### GAP-249: Layout Review auto-confirm when no instructions added

Verdict: Eliminates the friction correctly.

`layout-instruction.js:1259–1270` checks `window.layoutInstructions.length === 0` and auto-calls `/api/cv/confirm-layout` silently. Users who just want to generate final files without layout changes are no longer blocked by a redundant "Confirm Layout" click. The implementation is clean. One edge risk: the auto-confirm does not inform the user it occurred — the transition to final generation happens without acknowledgment that layout was implicitly confirmed. A single toast ("Layout confirmed automatically — no changes requested") would improve H1.

### GAP-234: ATS score grade legend in `_renderAtsReport()`

Verdict: Adequately addresses the unlabelled-score issue.

`ats-modals.js:204–208` renders an inline legend: `● ≥75% Strong match   ● 50–74% Partial match   ● <50% Low match` immediately beneath the score, using the same colored dots as the score value. The thresholds are the same as the badge color logic (`scoreColor` at line 174), ensuring consistency. The legend text size (`font-size: 0.75em; color: #94a3b8`) is small — borderline accessible at contrast ratio — but functionally present.

### GAP-235/236: Finalise notes pre-populated and character counter

Verdict: Fully resolved.

`finalise.js:129–146` (`_restoreFinaliseMeta`) fetches saved meta from `/api/finalise-meta` and populates both the status select and notes textarea. The counter at `finalise.js:103–108` uses inline `oninput` to update `#finalise-notes-counter` with `length / 2000` and color-shifts at 1600 (amber) and 1800 (red). Both behaviors work as described.
