// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/download-tab.test.js
 *
 * Regression coverage for a crash found during the cvUiReview committee
 * pass (cycle 103): _renderDownloadGrid() referenced `blockingFails`, a
 * variable only declared in the sibling function _renderValidationSummary(),
 * throwing `ReferenceError: blockingFails is not defined` whenever any
 * generated file existed -- i.e. in the normal case, breaking the entire
 * File Review tab (the file grid, "Skip to Finalise" button, and everything
 * below it never reached the DOM). No test file existed for download-tab.js
 * before this, which is exactly why the bug shipped undetected.
 */

const escapeHtmlImpl = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

vi.stubGlobal('escapeHtml', escapeHtmlImpl)
vi.stubGlobal('getSessionIdFromURL', () => null)

const { _renderDownloadGrid, _NON_BLOCKING_CHECKS } = await import('../../web/download-tab.js')

function makeFile(overrides = {}) {
  return {
    format: 'pdf',
    filename: 'CV.pdf',
    description: 'Final PDF',
    icon: '📄',
    ...overrides,
  }
}

describe('_renderDownloadGrid', () => {
  it('does not throw when a file exists and no checks are blocking', () => {
    expect(() => _renderDownloadGrid([makeFile()], [], { pass: 1, warn: 0, fail: 0 })).not.toThrow()
  })

  it('renders the file grid instead of crashing before it (regression for the blockingFails bug)', () => {
    const html = _renderDownloadGrid([makeFile()], [], { pass: 1, warn: 0, fail: 0 })
    expect(html).toContain('CV.pdf')
    expect(html).toContain('Download')
  })

  it('does not show the "blocked formats" notice when nothing is blocked', () => {
    const html = _renderDownloadGrid([makeFile()], [], { pass: 1, warn: 0, fail: 0 })
    expect(html).not.toContain('Blocked formats reflect ATS validation failures')
  })

  it('shows the "blocked formats" notice and disables the download when a blocking check fails for that format', () => {
    const checks = [{ name: 'ats_keyword_presence', status: 'fail', format: 'pdf' }]
    const html = _renderDownloadGrid([makeFile({ format: 'pdf' })], checks, { pass: 0, warn: 0, fail: 1 })
    expect(html).toContain('Blocked formats reflect ATS validation failures')
    expect(html).toContain('Blocked')
    expect(html).not.toContain('href="/api/download/CV.pdf"')
  })

  it('does not show the notice when a check fails for a different, non-blocking category', () => {
    // A check whose name is in _NON_BLOCKING_CHECKS (an advisory-only check) must not
    // trigger the "blocked formats" notice, since nothing is actually blocked.
    const advisoryName = [..._NON_BLOCKING_CHECKS][0]
    const checks = [{ name: advisoryName, status: 'fail', format: 'pdf' }]
    const html = _renderDownloadGrid([makeFile({ format: 'pdf' })], checks, { pass: 0, warn: 0, fail: 1 })
    expect(html).toContain(`href="/api/download/${encodeURIComponent('CV.pdf')}"`)
    expect(html).not.toContain('Blocked formats reflect ATS validation failures')
  })

  it('renders the empty-state message and returns early when there are no files', () => {
    const html = _renderDownloadGrid([], [], { pass: 0, warn: 0, fail: 0 })
    expect(html).toContain('No downloadable files found')
  })
})
