<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

<!-- markdownlint-disable MD032 -->

# Frontend Developer Review Status

**Last Updated:** 2026-04-20

**Reviewer Persona:** Expert Front-End Developer

**Scope:** JavaScript/HTML/CSS frontend — architecture, design, implementation, performance, accessibility, test coverage

**Executive Summary:** The frontend has evolved into a recognizably modular application: `state-manager.js`, `api-client.js`, `fetch-utils.js`, and the per-surface modules under `web/` split responsibilities better than a typical legacy-script UI. Test breadth is also strong: the `tests/js/` suite covers most feature modules directly. The main technical liabilities are not missing features but engineering-contract problems: unsafe modal HTML rendering, stacked global `window.fetch` monkey patches, and a still-transitional architecture that relies on globals exported from an IIFE bundle into an unbundled `app.js` orchestrator.

---

## 1. Architecture & Module Design

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Module decomposition | ✅ Pass | `web/app.js:7`; `web/state-manager.js:1-120`; `web/api-client.js:1-170`; `web/fetch-utils.js:1-220` | Core concerns are separated into state, API, fetch/loading, and surface modules rather than one monolithic script. |
| Transitional legacy/global architecture | ⚠️ Partial | `web/app.js:7`; `scripts/build.mjs:11-39` | The bundle explicitly exports module functions onto globals for `app.js`, which keeps the system working but preserves implicit cross-file coupling. |
| Global compatibility layer | ⚠️ Partial | `web/state-manager.js:210-264` | `installLegacyStateGlobals()` mirrors module state onto `globalThis`, which helps migration but creates a dual state contract. |
| Bundle strategy | ⚠️ Partial | `scripts/build.mjs:11-39` | The IIFE build is pragmatic for a gradual migration, but it keeps tree-shaking and import-boundary enforcement weaker than a single ESM entrypoint. |
| Module-level test coverage | ✅ Pass | `tests/js/` directory | The JS test suite covers most high-value modules individually, including `api-client`, `fetch-utils`, `state-manager`, `ui-core`, `ui-helpers`, and workflow tabs. |

---

## 2. State Management

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Centralized workflow state | ✅ Pass | `web/state-manager.js:17-119` | Phase-to-step mapping, generation-state modeling, and layout freshness calculations are all centralized and readable. |
| Durable local persistence | ✅ Pass | `web/app.js:74-81`; `web/state-manager.js:210-264` | Periodic save plus unload save protect in-browser state well for a single-user local app. |
| Explicit generation-state model | ✅ Pass | `web/state-manager.js:48-84` | `GENERATION_PHASES` and `createDefaultGenerationState()` give the staged generation flow a clearer contract than ad hoc flags. |
| State mutation discipline | ⚠️ Partial | `web/state-manager.js:210-264`; `web/review-table-base.js:26-33` | The app has a central manager, but legacy globals like `userSelections`, `window._savedDecisions`, and `globalThis.currentTab` still bypass a single-source-of-truth model. |

---

## 3. API Client Layer

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Session-aware request injection | ✅ Pass | `web/api-client.js:47-126` | `session_id` and `owner_token` propagation is centralized and consistent. |
| Error normalization | ✅ Pass | `web/api-client.js:136-173` | Non-OK responses are converted into informative errors and 409 conflicts get explicit messaging. |
| Fetch interception architecture | ⚠️ Partial | `web/api-client.js:139`; `web/fetch-utils.js:40`; `tests/js/api-client.test.js:204-214`; `tests/js/fetch-utils.test.js:15-16,53-65` | Both `api-client.js` and `fetch-utils.js` replace `window.fetch`. The test suite compensates for that layering, which is a sign the production contract is order-sensitive. |
| Retry controls | ✅ Pass | `web/message-dispatch.js:32-139`; `web/ui-core.js:27-54` | The user-configurable retry policy is a strong operational detail for a local LLM-driven UI. |

---

## 4. UI Component Quality

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Job input surface | ✅ Pass | `web/job-input.js:31-240` | Good source-specific UX: paste, URL, and file upload are each handled with clear validation and fallback guidance. |
| Layout review surface | ✅ Pass | `web/layout-instruction.js:1-240` | Layout freshness, preview-output state, and stale-callout logic are well structured. |
| Modal safety | ❌ Fail | `web/ui-core.js:729-749`; `web/ui-helpers.js:28-49`; `web/job-input.js:482-529` | Alert and confirm helpers write message HTML through `innerHTML` without sanitization. Several call sites pass interpolated error/help content into those helpers. |
| Finalise view | ⚠️ Partial | `web/finalise.js:38-77` | The tab is functionally straightforward, but still relies on direct string-template HTML assembly and does not distinguish richer artifact types in its file summary. |
| Message rendering discipline | ✅ Pass | `web/message-queue.js:101-135` | Standard chat messages are escaped before markdown-like decoration, which is the correct default. |

---

## 5. Performance

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Debounce / pacing strategy | ✅ Pass | `web/fetch-utils.js:96-150`; `web/message-dispatch.js:32-139` | Busy overlays, retry pacing, and other user-visible async behavior are handled thoughtfully. |
| Autosave frequency | ✅ Pass | `web/app.js:74-81` | A 5-second autosave interval is acceptable for a single-tab local tool. |
| Render strategy | ⚠️ Partial | `web/job-input.js:99-204`; `web/finalise.js:55-115`; `web/layout-instruction.js:240-260` | Large surfaces are assembled with raw HTML strings and full `innerHTML` replacement, which is simple but limits incremental rendering and fine-grained updates. |
| Build/runtime coupling | ⚠️ Partial | `web/app.js:7`; `scripts/build.mjs:11-39` | The global-export bundle pattern is more of a maintainability/performance ceiling issue than a current bottleneck. |

---

## 6. Accessibility

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Tab semantics | ✅ Pass | `web/index.html:180-200` | The primary tab bar uses `role="tablist"`, `role="tab"`, and `aria-controls`. |
| Modal baseline semantics | ✅ Pass | `web/index.html:251-274` | Several top-level modals include `role="dialog"` and `aria-modal="true"`. |
| Existing accessibility backlog | ⚠️ Partial | `web/index.html:149`; `web/ui-core.js:368-390` | The current code confirms previously identified gaps around the chat input label and `confirmDialog()` behavior, but I did not find a separate new top-tier accessibility defect beyond those already tracked. |

---

## 7. Test Coverage

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Module breadth | ✅ Pass | `tests/js/` directory | Coverage breadth is unusually good for a browser UI of this size. |
| API/state infrastructure tests | ✅ Pass | `tests/js/api-client.test.js`; `tests/js/state-manager.test.js`; `tests/js/fetch-utils.test.js` | The core plumbing is directly exercised. |
| Security regression coverage | ⚠️ Partial | `tests/js/ui-helpers.test.js:75-123` | The modal helper tests assert current `innerHTML` behavior, but there is no security-focused regression test that fails on injected HTML. |
| Architecture regression coverage | ⚠️ Partial | `tests/js/api-client.test.js:204-214`; `tests/js/fetch-utils.test.js:15-16,53-65` | The suite acknowledges fetch-wrapper layering, but it tests around the coupling rather than eliminating it. |

---

## 8. Findings Summary

| ID | Severity | Area | Finding | Evidence |
|----|----------|------|---------|----------|
| F-01 | HIGH | Security | Alert and confirm modal helpers render unsanitized HTML through `innerHTML`; user-visible error/help text can flow into those sinks | `web/ui-core.js:729-749`; `web/ui-helpers.js:28-49`; `web/job-input.js:482-529` |
| F-02 | MEDIUM | Architecture | Two separate modules monkey-patch `window.fetch`, creating an order-sensitive interception contract | `web/api-client.js:139`; `web/fetch-utils.js:40`; `tests/js/api-client.test.js:204-214`; `tests/js/fetch-utils.test.js:15-16,53-65` |
| F-03 | MEDIUM | State Management | `state-manager.js` still mirrors canonical state onto `globalThis`, so module state and global mutable state coexist | `web/state-manager.js:210-264` |
| F-04 | MEDIUM | Architecture | The build keeps `app.js` outside the module graph and depends on globals exported from an IIFE bundle | `web/app.js:7`; `scripts/build.mjs:11-39` |
| F-05 | LOW | Test Coverage | `ui-helpers` tests encode current `innerHTML` behavior but do not include an escaping/sanitization regression check | `tests/js/ui-helpers.test.js:75-123` |

---

## 9. Proposed New Story Items / Gaps

| GAP ID | Area | Description | Rationale |
|--------|------|-------------|-----------|
| GAP-61 | Security | Sanitize or eliminate HTML injection in alert/confirm modal message rendering paths | Addresses F-01 |
| GAP-62 | Frontend Architecture | Consolidate `window.fetch` interception into one request pipeline owned by a single module | Addresses F-02 |
| GAP-63 | State Management | Remove `globalThis` legacy state mirroring once remaining consumers are migrated to module imports | Addresses F-03 |
| GAP-64 | Build Architecture | Move `app.js` into the main bundled entrypoint so the frontend no longer depends on globally exported module functions | Addresses F-04 |
| GAP-65 | Test Coverage | Add security regression tests that fail if modal helpers render unescaped HTML into dialog bodies | Addresses F-05 |