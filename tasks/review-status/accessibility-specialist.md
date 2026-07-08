<!--
  Copyright (C) 2026 Gregory R. Warnes
  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of CV-Builder.
  For commercial licensing, contact greg@warnes-innovations.com
-->

# Accessibility Specialist Review Status

**Last Updated:** 2026-07-07 22:05 ET

**Executive Summary:** GAP-384 is **PARTIALLY RESOLVED** and GAP-385 is **RESOLVED with a caveat**. GAP-384's literal claim checks out — `_focusedElementBeforeModal` is genuinely gone (zero references left in source) and `master-cv.js` (20 sites), `workflow-steps.js` (4 sites — actually 3 confirmed + 1 comment), and `achievements-review.js` (1 site) now call the shared `pushFocusStack()`/`restoreFocus()` pair. But the shared `_focusStack` primitive those fixes depend on is still broken by four sibling bugs the fix cycle did not touch, so the underlying symptom — "closing a modal doesn't return focus to its trigger" — is still reproducible today through common flows: (1) `showAlertModal()` in `web/ui-helpers.js:31-46` pushes to the stack **twice** per call but `closeAlertModal()` only pops once, leaking one stale entry per alert shown across 100+ call sites app-wide (86 in `master-cv.js` alone); (2) three nested modals inside `master-cv.js` itself — Backup History, Full Data Preview, and Import Review — call `restoreFocus()` on close without ever calling `pushFocusStack()` on open, so closing them steals the parent Master-CV-modal's own saved trigger, leaving the Master CV modal's own eventual close unable to restore focus at all; (3) the onboarding/welcome modal (`web/session-manager.js`) has the identical push/restore mismatch. GAP-385's new "🚀 Getting Started Guide" button is genuinely wired and does open the welcome modal, but the panel it lives in (`showKeyboardShortcutsPanel()`) has **no focus management at all** — no push, no trap, no `setInitialFocus`, and Escape does not close it despite the panel's own help text claiming otherwise — so the very flow GAP-385 completes (Help → Shortcuts panel → Getting Started → onboarding modal → close) ends with focus dropped to `<body>`, not returned anywhere useful.

## Application Evaluation

### GAP-384 / GAP-385 Verification (primary focus of this pass)

| Claim | Status | Evidence |
|---|---|---|
| GAP-384: dead `_focusedElementBeforeModal` variable removed | ✅ **Confirmed** | `grep -rn "_focusedElementBeforeModal" web/ scripts/` returns zero production hits (one harmless leftover stub in a test's `beforeEach`, `tests/js/bullet-reorder-fallback.test.js:35`, which is never read by the code under test). |
| GAP-384: `master-cv.js` uses shared `pushFocusStack()` (claimed 20 sites) | ✅ **Confirmed** | `grep -c "pushFocusStack("` → 20 hits (lines 1372,1444,1566,1600,1856,1870,1919,1929,1984,2043,2140,2243,2280,2379,2395,2478,2492,2570,2582,3045), each paired with a `trapFocus()` call at the same site and a `restoreFocus()` in the matching close function. |
| GAP-384: `workflow-steps.js` uses shared helpers (claimed 4 sites) | ✅ **Confirmed** | `pushFocusStack()` at lines 180, 362, 735 (3 functional call sites; the 4th grep hit is the doc-comment at line 16). All three are correctly paired with `restoreFocus()`. |
| GAP-384: `achievements-review.js` uses shared helper (claimed 1 site) | ✅ **Confirmed** | `pushFocusStack(document.activeElement)` at `web/achievements-review.js:807` inside `_openRewriteModal()`, correctly paired with the shared `closeAlertModal()` (which calls `restoreFocus()`). |
| GAP-384: underlying symptom ("focus not restored on modal close") actually gone | ❌ **Still reproducible** | See "New/lingering focus-stack regressions" below — 3 distinct, still-open code paths reintroduce exactly this symptom. |
| GAP-385: "? Help" button → keyboard-shortcuts panel → path back to onboarding | ✅ **Confirmed present and wired** | `web/app.js:167-175` rewires `#help-btn` to `showKeyboardShortcutsPanel()`. `web/keyboard-shortcuts.js:225-227` adds `<button id="kb-shortcuts-getting-started">🚀 Getting Started Guide</button>`; its click handler (`:245-248`) does `panel.remove(); if (typeof showWelcomeModal === 'function') showWelcomeModal();`. `showWelcomeModal` is defined and exported from `web/session-manager.js:228-251,1013` and correctly re-enters onboarding (re-checks master-CV-status, re-picks the right section) rather than just replaying a static "Step 1" screen. |
| GAP-385: resulting flow is itself accessible | ❌ **Not fully** | `showKeyboardShortcutsPanel()` declares `role="dialog" aria-modal="true"` (`keyboard-shortcuts.js:203-205`) but never calls `pushFocusStack`, `trapFocus`, or `setInitialFocus` — opening it does not move focus in, and nothing traps Tab inside it. Its own displayed help text says `Esc: Close modals / this panel` (`:222`), but Escape does not close it (see finding below) — a broken promise to both sighted and screen-reader users. |

### New/Lingering Focus-Stack Regressions (not caused by GAP-384/385 directly, but corrupt the same shared primitive those fixes depend on)

**1. `showAlertModal()` double-pushes onto the shared stack — `web/ui-helpers.js:31-46`.**

```js
31 function showAlertModal(title, message) {
32   // Push to shared focus stack so restoreFocus() works correctly when stacked with other modals (GAP-305).
33   if (typeof pushFocusStack === 'function') pushFocusStack();
...
43   if (typeof pushFocusStack === 'function') pushFocusStack(document.activeElement);
44   if (typeof setInitialFocus === 'function') setInitialFocus('alert-modal-overlay');
45   if (typeof trapFocus === 'function') trapFocus('alert-modal-overlay');
46 }
```

Two `pushFocusStack()` calls fire per invocation (both push `document.activeElement`, since `pushFocusStack()` with no argument still defaults to it), but `closeAlertModal()` (`:48-51`) calls `restoreFocus()` only once. Traced via `git log -p`: this is a merge artifact — the merge commit `eaa6bd2` explicitly notes "ui-helpers.js: kept HEAD's pushFocusStack() call in showAlertModal," layering HEAD's fix on top of an already-fixed devel version instead of reconciling them. `showAlertModal` is called from 8+ files and ~100 sites (`grep -rc "showAlertModal(" web/*.js`: 86 in `master-cv.js` alone, plus `cover-letter.js`, `job-input.js`, `screening-questions.js`, `spell-check.js`, `experience-review.js`, `skills-review.js`). Concrete reproduction using a real call site (`master-cv.js:1600-1621`, the Publication modal): open "Edit Publication" (pushes trigger `T`), leave the Cite Key field blank, click Save → `saveMasterPublication()` calls `showAlertModal('⚠️ Validation', 'Cite key is required.')` **without closing the Publication modal** (both push the Save button `S` twice, stack `[...,T,S,S]`), dismiss the alert (`closeAlertModal()` pops once → correctly focuses `S`, stack `[...,T,S]`), then Cancel the still-open Publication modal (`closePublicationModal()` → `restoreFocus()` pops the leftover `S` — now hidden inside the just-closed modal — instead of `T`). This is the exact "closing a modal restores focus to the triggering control" failure the story guards against, reachable through the single most common master-CV editing pattern (validate → alert → cancel).

**2. Three nested modals inside `master-cv.js` call `restoreFocus()` without ever calling `pushFocusStack()`.**

Cross-check: `master-cv.js` has 23 `trapFocus()` calls but only 20 `pushFocusStack()` calls — the 3-call gap is these three functions, all opened via buttons living inside the already-open Master CV modal (`master-cv.js:124,127`, plus the import-file flow):

- `openBackupHistoryModal()` (`:2651-2673`) and `restoreBackup()` (`:2710-2724`) — `trapFocus('backup-history-overlay')` at `:2669` with no matching push; close handler at `:2670` and `restoreBackup()` at `:2724` both call `restoreFocus()`.
- `openFullDataPreviewModal()` (`:2826-2848`) — same pattern, `trapFocus` at `:2844`, `restoreFocus()` at `:2845`, no push.
- `_showMasterCvImportPreviewModal()` (`:2917-2961`) and `confirmMasterCvImport()` (`:2963-2973`) — `trapFocus` at `:2956`, `restoreFocus()` at `:2957` and `:2973`, no push. `confirmMasterCvImport()` additionally calls `showAlertModal()` right after its own `restoreFocus()`, compounding with regression #1.

Because `openMasterCvModal()` (`:3042-3052`) does correctly `pushFocusStack(document.activeElement)` at `:3045` when the outer modal opens, the sequence is: open Master CV modal (push outer trigger `M`, stack `[...,M]`) → open Backup History from inside it (no push) → close Backup History (`restoreFocus()` pops `M`, wrongly focusing the Master-CV-modal's own trigger while that modal is still open and visible) → close Master CV modal (`restoreFocus()` pops an empty/wrong stack, so focus is not restored at all). This is a second, independent, concrete reproduction of the same failure mode, inside one of the very files GAP-384 targeted.

**3. The onboarding/welcome modal has the identical gap — `web/session-manager.js`.**
`_openOnboardingFocusTrap()` (`:213-222`) calls `setInitialFocus`/`trapFocus` but never `pushFocusStack`; `closeWelcomeModal()` (`:257-...`, `restoreFocus()` at `:270`) pops the shared stack regardless. This directly undercuts GAP-385: in the new "Getting Started Guide" flow, the keyboard-shortcuts panel never pushed anything either (finding above), so by the time the user closes the onboarding modal opened via that button, `_focusStack` is likely empty — `restoreFocus()`'s `pop()` returns `undefined`, the guard no-ops, and focus is simply lost (falls back to `<body>`), reproducing the story's "Escape or close actions leaving focus lost" failure mode in the exact new path this fix cycle introduced.

**4. `closeAllModals()` (`web/ui-core.js:661-673`) is not stack-aware for concurrent dialogs.** It iterates every `[role="dialog"]` and hides them all, but calls `restoreFocus()` exactly once regardless of how many were actually open — if two modals were stacked (each having legitimately pushed), only one `_focusStack` entry gets popped and the other is orphaned for a later, unrelated close to consume. Lower severity/narrower blast radius than 1–3 above (only exercised when multiple independently-pushed modals are open simultaneously and something forces them all shut, e.g. session logout), but the same class of bug.

**5. `showKeyboardShortcutsPanel()` (`web/keyboard-shortcuts.js:197-249`) declares itself a modal but implements none of the required behavior.** No `pushFocusStack`/`setInitialFocus`/`trapFocus` call anywhere in the function (confirmed via targeted grep — the only matches for those names in the whole file are the doc comment). Escape does not close it: the global Escape handler is `web/ui-core.js:514-519` → `closeAllModals()`, which only hides elements whose `style.display` is a truthy non-`'none'` value; this panel's `Object.assign(panel.style, {...})` never sets `display` at all, so `modal.style.display` is `''` (falsy) and the `if` guard in `closeAllModals()` skips it — it sets `aria-hidden="true"` on a panel that remains **visually on screen**, and additionally still calls the shared `restoreFocus()`, again popping an entry (if any) that doesn't belong to this panel. The only real way to close the panel is clicking its own `✕` or the new Getting-Started button, both of which call `panel.remove()` directly — functionally fine, but contradicts the dialog semantics (`aria-modal="true"`) and the panel's own on-screen "Esc" hint.

### US-X1: Workflow Navigation Accessibility

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Workflow-step elements reachable/operable by keyboard | ✅ Pass | `web/ui-core.js:1802-1876` `updateWorkflowStepsClickable()` dynamically sets `role="button"`, `tabindex="0"`, and an Enter/Space keydown handler on every step id in `sequentialSteps` (`:1804-1811`) and `postLayoutSteps` (`:1813-1820`) once reachable, and correctly reverts (`_makeStepInert`, `:1857-1866`) otherwise. All 13 step ids (`job` through `harvest`, including `finalise` at `:1819`) are now covered — a prior review's finding that `step-finalise` was omitted from these arrays no longer reproduces; it is present and correctly wired today. |
| 2 | Stage tabs expose correct tab semantics, selected state, panel association | ✅ Pass | `web/index.html:215-241` — `role="tablist"` on `#tab-bar`, every `.tab` has `role="tab"`, `aria-selected`, `aria-controls="document-content"`. `web/ui-core.js:450-497` implements the full WCAG roving-tabindex + Arrow/Home/End keyboard pattern. |
| 3 | Active/completed states conveyed by more than colour alone | ✅ Pass | `web/workflow-steps.js:1054-1066` appends an `sr-only` textual state suffix ("(current step)", "(completed)", "(stale — results may be outdated)", "(previously completed — click to jump ahead)") to every step label in addition to CSS classes/colour. |
| 4 | Stage/tab changes announced or programmatically determinable | ✅ Pass | `web/index.html:153-154` `#workflow-stage-announcer` (`aria-live="polite" aria-atomic="true"`, visually hidden). Populated on every stage/tab change. |

### US-X2: Modal and Dialog Accessibility

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Opening a modal moves focus into it | ⚠️ Partial | Every `role="dialog"` overlay backed by `ui-core.js`'s `openModal()`/the `master-cv.js`/`workflow-steps.js`/`achievements-review.js` show-functions correctly calls `setInitialFocus()`. **Exception:** `showKeyboardShortcutsPanel()` (`keyboard-shortcuts.js:197`) never does, despite declaring `aria-modal="true"` (finding #5 above). |
| 2 | Focus is trapped inside the modal while open | ⚠️ Partial | `trapFocus()` mechanism (`ui-core.js:309-340`) is sound and is invoked by all "real" modals, including the 3 nested `master-cv.js` dialogs (backup history, data preview, import review) — but those 3 never paired it with `pushFocusStack`, so the trap listener and the focus-restore stack fall out of sync (finding #2 above). `showKeyboardShortcutsPanel()` has no trap at all. |
| 3 | Closing a modal restores focus to the triggering control | ❌ **Fail** | See "New/Lingering Focus-Stack Regressions" #1–3 above — three independent, concretely reproducible code paths (validation-alert-while-a-modal-is-open; any of the three master-cv.js nested modals; the onboarding modal reopened via GAP-385's new button) leave focus lost or misdirected on close. |
| 4 | Dialog title/purpose programmatically exposed | ✅ Pass | All `role="dialog"` overlays in `index.html` declare `aria-modal="true"` + `aria-labelledby` pointing at a real heading id; the 3 ad-hoc `master-cv.js` overlays (backup history, data preview, import review) and `keyboard-shortcuts.js`'s panel also set `aria-labelledby`/`aria-label` correctly even though their focus handling is incomplete. |

**Failure Modes Guarded Against:**

| Failure mode | Present? |
|---|---|
| Modal opens visually while focus stays behind it | ⚠️ Present for one dialog — the keyboard-shortcuts panel |
| Escape/close actions leaving focus lost | ❌ **Present** — 3 reproducible paths (see above) |
| Multiple dialogs lacking accessible labels | ✅ Not present |

### US-X3: Forms, Errors, and Review Controls

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Validation errors exposed via accessible associations | ✅ Pass | `web/job-input.js:150-171` — `job-text-input`/`job-url-input` both carry `aria-describedby` pointing to `<span class="field-error" aria-live="polite">` spans; `_showFieldError()`/`_clearFieldError()` (`:590-608`) toggle `aria-invalid` in sync with the visible message. |
| 2 | Icon-only controls have descriptive labels | ⚠️ Partial | The large majority of icon-only controls carry `aria-label` (reorder ↑/↓ and delete 🗑 buttons across `master-cv.js`, `achievements-review.js`, `workflow-steps.js`'s bullet-reorder dialog all confirmed labelled). **One still-open gap:** the "clear selected file" `✕` button in `web/job-input.js:206` (`<button onclick="clearSelectedFile()" ...>✕</button>`) has no `aria-label` and no `title` — unchanged from the prior review pass. |
| 3 | Inline edit/review actions have clear, visible focus targets | ✅ Pass | Broad `:focus-visible`/`:focus` coverage confirmed in `web/styles.css` (`.step`, `.tab`, `.icon-btn`, `.action-btn`, form inputs, etc., lines 295,386,417,452,525,660,679,681,749,763,816,976,1430,1516,1576,1667,1725). No `outline:none`/`outline:0` anywhere in the stylesheet. |
| 4 | Error/status messages exposed to assistive tech | ✅ Pass | `#session-conflict-banner` is `role="alert"` (`index.html:120`); `#llm-busy-label` is `role="status" aria-live="polite"` (`:170`); per-field errors use `aria-live="polite"` spans (criterion 1). |

**Failure Modes Guarded Against:**

| Failure mode | Present? |
|---|---|
| Validation errors shown only visually | ✅ Not present |
| Reorder/close buttons without labels | ⚠️ One instance — `job-input.js:206` clear-file button (unchanged from prior pass) |
| Focus outline removed without replacement | ✅ Not present |

## Generated Materials Evaluation

**N/A for this pass.** This review's required reading (`web/index.html`, `web/app.js`, `web/ui-core.js`, `web/state-manager.js`, `web/styles.css`, `scripts/web_app.py`, `scripts/utils/conversation_manager.py`, plus the master-cv/workflow-steps/achievements-review/keyboard-shortcuts files specific to GAP-384/385) covers only the web application shell and the two named GAP fixes — none of it touches generated-document rendering (`scripts/utils/cv_orchestrator.py` and its templates), which is where generated-materials accessibility (contrast, heading structure, reading order) would need to be assessed.

## Additional Story Gaps / Proposed Story Items

- **US-X2 needs an explicit "single shared focus-stack, no exceptions" acceptance criterion**, and it needs to cover *nested* modals specifically, not just top-level ones. GAP-384's fix converted every top-level `master-cv.js`/`workflow-steps.js`/`achievements-review.js` modal-open function correctly, but missed that the same file has three modals nested *inside* an already-open modal (Backup History, Data Preview, Import Review) which follow a different, hand-rolled `create-overlay + local close() closure` pattern that never calls `pushFocusStack`. Recommend an explicit line item: "Every function that calls `trapFocus()` must have a corresponding `pushFocusStack()` call in the same function, checked by a grep-count parity test (`trapFocus(` count == `pushFocusStack(` count per file) rather than spot-checking a subset of call sites."
- **Recommend a genuine regression test for `showAlertModal`/`closeAlertModal` push/pop parity** — a single small unit test asserting that `_focusStack.length` returns to its pre-call value after `showAlertModal()` + `closeAlertModal()` would have caught the double-push merge artifact immediately, and would guard against it recurring on the next merge.
- **`showKeyboardShortcutsPanel()` should either drop its `role="dialog" aria-modal="true"` semantics (if it's meant to be a lightweight non-modal popover) or actually implement modal behavior (push/trap/initial-focus, and make Escape genuinely close it via the same code path its own on-screen text promises).** Currently it claims to be a modal to assistive tech while behaving like neither a modal nor a well-behaved popover.
- Two prior-review findings were re-verified and are now resolved, unrelated to GAP-384/385: (a) `step-finalise` now appears in `updateWorkflowStepsClickable()`'s arrays (`ui-core.js:1819`) and is keyboard-reachable; (b) `#document-content` now has `tabindex="-1"` (`index.html:260`), so the skip-link target is programmatically focusable. Noting these so a future pass doesn't re-flag them.

---

**Reviewed against:** web/index.html, web/app.js, web/ui-core.js, web/state-manager.js, web/styles.css, scripts/web_app.py, scripts/utils/conversation_manager.py, web/master-cv.js, web/workflow-steps.js, web/achievements-review.js, web/keyboard-shortcuts.js, web/ui-helpers.js, web/session-manager.js, web/job-input.js

| Story | ✅ | ⚠️ | ❌ | 🔲 | — |
|---|---|---|---|---|---|
| US-X1 | 4 | 0 | 0 | 0 | 0 |
| US-X2 | 1 | 2 | 1 | 0 | 0 |
| US-X3 | 3 | 1 | 0 | 0 | 0 |

**Key evidence references:**
- GAP-384 dead-variable removal: confirmed via `grep -rn "_focusedElementBeforeModal" web/ scripts/` (zero production hits).
- GAP-384 shared-helper adoption: `web/master-cv.js` (20 `pushFocusStack(` sites), `web/workflow-steps.js` (3 sites: lines 180, 362, 735), `web/achievements-review.js` (1 site: line 807).
- GAP-384 residual regression #1 (double-push): `web/ui-helpers.js:31-46` (`showAlertModal`/`closeAlertModal`), traced to merge commit `eaa6bd2`.
- GAP-384 residual regression #2 (orphaned nested modals): `web/master-cv.js:2651-2673` (`openBackupHistoryModal`/`restoreBackup`), `:2826-2848` (`openFullDataPreviewModal`), `:2917-2973` (`_showMasterCvImportPreviewModal`/`confirmMasterCvImport`).
- GAP-384 residual regression #3 (onboarding modal): `web/session-manager.js:213-222` (`_openOnboardingFocusTrap`) vs. `:270` (`closeWelcomeModal`'s `restoreFocus()`).
- GAP-385 button wiring: `web/app.js:167-175`, `web/keyboard-shortcuts.js:225-227,245-248`, `web/session-manager.js:228-251`.
- GAP-385 residual regression (panel has no focus management, broken Escape): `web/keyboard-shortcuts.js:197-249` vs. `web/ui-core.js:514-519,661-673`.
- US-X3 #2: unlabelled close button, unchanged — `web/job-input.js:206`.
