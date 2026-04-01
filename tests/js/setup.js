// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/setup.js
 * Global vitest setup: runs before every test file.
 *
 * Provides a working in-memory localStorage stub.
 * jsdom's built-in localStorage is unreliable in some worker
 * configurations and causes "localStorage.setItem is not a function"
 * errors in modules that call stateManager helpers.  Individual test
 * files that need precise control (e.g. state-manager.test.js) call
 * vi.stubGlobal('localStorage', ...) in their own beforeEach and
 * override this stub for those tests.
 *
 * console.warn / console.error suppression is handled at the runner
 * level via onConsoleLog in vitest.config.mjs, which intercepts output
 * even from loglevel's pre-bound console references.
 */

import { vi, beforeEach } from 'vitest';

// ── 1. localStorage stub ──────────────────────────────────────────────────────

function createLocalStorageMock() {
  let store = {};
  return {
    getItem:    (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear:      () => { store = {}; },
    key:        (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

// Re-stub in beforeEach so it survives vi.unstubAllGlobals() calls in
// individual test files (e.g. ui-helpers.test.js afterEach).  State is
// cleared between tests to prevent leakage.
const _lsMock = createLocalStorageMock();

beforeEach(() => {
  _lsMock.clear();
  vi.stubGlobal('localStorage', _lsMock);
});
