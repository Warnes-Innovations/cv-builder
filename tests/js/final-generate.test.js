// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/final-generate.test.js
 *
 * Regression coverage: populateFinalGenerateTab()'s HTML preview iframe and
 * its plain download links built /api/download/<file> URLs with no
 * session_id query param, unlike every other download-link call site in the
 * app (web/download-tab.js, web/review-table-base.js), which all include it
 * via getSessionIdFromURL(). The backend's session resolver requires
 * session_id and 400s without it ("session_id is required"), which broke the
 * in-browser HTML preview and would have broken the Download links too in
 * any multi-session context. No test file existed for final-generate.js
 * before this, which is exactly why the bug shipped undetected.
 */

import { populateFinalGenerateTab } from '../../web/final-generate.js'
import { stateManager } from '../../web/state-manager.js'

vi.stubGlobal('escapeHtml', s => String(s ?? ''))

beforeEach(() => {
  document.body.innerHTML = '<div id="document-content"></div>'
  stateManager.resetGenerationState()
})

describe('populateFinalGenerateTab session_id in download URLs (regression)', () => {
  it('includes session_id in the HTML preview iframe src when a session is present in the URL', async () => {
    vi.stubGlobal('getSessionIdFromURL', () => 'abc123')
    await populateFinalGenerateTab({ files: ['CV_Acme_Engineer_2026-01-01.html'] })
    const iframe = document.getElementById('final-cv-preview')
    expect(iframe).not.toBeNull()
    expect(iframe.src).toContain('/api/download/CV_Acme_Engineer_2026-01-01.html?session_id=abc123')
  })

  it('includes session_id in the plain Download link href', async () => {
    vi.stubGlobal('getSessionIdFromURL', () => 'abc123')
    await populateFinalGenerateTab({ files: ['CV_Acme_Engineer_2026-01-01.html'] })
    const link = document.querySelector('a[download]')
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toContain('?session_id=abc123')
  })

  it('omits the session_id param cleanly (no dangling "?") when no session is present', async () => {
    vi.stubGlobal('getSessionIdFromURL', () => null)
    await populateFinalGenerateTab({ files: ['CV_Acme_Engineer_2026-01-01.html'] })
    const iframe = document.getElementById('final-cv-preview')
    expect(iframe.src.endsWith('CV_Acme_Engineer_2026-01-01.html')).toBe(true)
    const link = document.querySelector('a[download]')
    expect(link.getAttribute('href').endsWith('CV_Acme_Engineer_2026-01-01.html')).toBe(true)
  })
})
