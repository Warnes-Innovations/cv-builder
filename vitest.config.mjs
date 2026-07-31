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
      // Regression guard, not a target: set a few points below the actual
      // measured baseline (statements/lines 77%, branches 67.9%, functions
      // 71.3% as of 2026-07-08) so `npm run test:js:cover` fails if overall
      // coverage drops, without blocking on today's existing gaps. CI's
      // default `npm run test:js` does not run coverage and is unaffected —
      // this only bites when someone opts into the :cover script.
      thresholds: {
        statements: 74,
        branches:   64,
        functions:  68,
        lines:      74,
      },
    },
  },
})
