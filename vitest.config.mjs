// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

import { defineConfig } from 'vitest/config'
import { mkdirSync } from 'node:fs'

mkdirSync(new URL('./coverage/.tmp/', import.meta.url), { recursive: true })

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals:     true,
    include:     ['tests/js/**/*.test.js'],
    // Suppress console.warn / console.error output from production code during
    // tests.  loglevel (used throughout the app) binds to the original console
    // methods at logger-creation time, so vi.spyOn can't intercept those calls
    // after the loggers are created.  onConsoleLog runs at the vitest-runner
    // level and reliably captures all console output regardless of binding.
    onConsoleLog(_log, type) {
      if (type === 'stderr') return false;
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./tests/js/setup.js'],
    coverage: {
      provider:  'v8',
      include:   ['web/*.js'],
      exclude:   ['web/app.js', 'web/ui-core.js', 'web/layout-instruction.js'],
      // Regression guard, not a target: set below the measured baseline so
      // `npm run test:js:cover` fails if overall coverage drops, without
      // blocking on today's existing gaps. Measured 2026-09-11 on vitest
      // 5.0.0: statements 44.2, branches 34.3, functions 48.8, lines 49.5.
      //
      // The ~5-point margin is wider than it looks like it needs to be, and
      // deliberately so. Repeated runs against a FIXED package-lock.json vary
      // by only ~0.05, but re-resolving the lockfile moved the same unchanged
      // tree by ~3 points (lines 52.3 -> 49.5) — the v8 denominator depends on
      // the transitive versions of vite/jsdom/ast-v8-to-istanbul, not just on
      // our own code. A 1-point margin would turn an ordinary `npm update`
      // into a failing build with no coverage regression behind it.
      //
      // These numbers are NOT comparable to the ones here before 2026-09-11
      // (74/64/68/74, measured 77/67.9/71.3/77). Nothing about the tests or
      // web/*.js changed: vitest 5 removed the legacy v8-to-istanbul
      // converter and always uses AST-aware remapping, which counts a
      // smaller, more honest denominator. Verified by flipping
      // `experimentalAstAwareRemapping` on vitest 3.2.4, which reproduced the
      // same drop (77.1 -> 42.0) with an unchanged tree.
      //
      // So: do NOT "restore" the old thresholds, and do not read the drop as
      // a coverage regression to be hunted down — the earlier figures were
      // inflated by the old converter. Re-measure before changing these.
      //
      // CI's `npm run test:js` does not run coverage, so CI cannot catch a
      // break in this guard; it only bites someone who opts into :cover.
      thresholds: {
        statements: 39,
        branches:   29,
        functions:  43,
        lines:      44,
      },
    },
  },
})
