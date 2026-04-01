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
    },
  },
})
