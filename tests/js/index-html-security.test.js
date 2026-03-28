// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/index-html-security.test.js
 * Regression tests for CDN script integrity attributes in the HTML entry points.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expectedScripts = [
  {
    src: 'https://code.jquery.com/jquery-3.7.1.min.js',
    integrity: 'sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs',
  },
  {
    src: 'https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js',
    integrity: 'sha384-cjmdOgDzOE22dUheI5E6Gzd3upfmReW8N1y/4jwKQE50KYcvFKZJA9JxWgQOzqwQ',
  },
]

function readHtml(relativePath) {
  return readFileSync(resolve(import.meta.dirname, '..', '..', relativePath), 'utf8')
}

describe('CDN script integrity', () => {
  for (const htmlPath of ['index.html', 'web/index.html']) {
    it(`${htmlPath} pins CDN scripts with SRI`, () => {
      const html = readHtml(htmlPath)

      for (const script of expectedScripts) {
        expect(html).toContain(`src="${script.src}"`)
        expect(html).toContain(`integrity="${script.integrity}"`)
        expect(html).toContain('crossorigin="anonymous"')
      }
    })
  }
})
