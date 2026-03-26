// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/integration-harness-security.test.js
 * Regression tests for error handling in the static integration harness server.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('integration harness error handling', () => {
  it('returns a generic 500 body instead of String(e)', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '..', '..', 'web', 'tests', 'integration', 'run_integration.js'),
      'utf8',
    )

    expect(source).toContain("res.end('Internal server error')")
    expect(source).not.toContain('res.end(String(e))')
  })
})
