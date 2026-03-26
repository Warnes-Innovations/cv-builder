// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/layout-instruction-runtime.test.js
 * Runtime-style coverage for layout review wiring using the real message queue.
 */

vi.mock('../../web/logger.js', () => ({
  getLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}))

vi.mock('../../web/api-client.js', () => ({
  apiCall: vi.fn(),
}))

vi.mock('../../web/review-table-base.js', () => ({
  switchTab: vi.fn(),
}))

vi.mock('../../web/ats-refinement.js', () => ({
  scheduleAtsRefresh: vi.fn(),
}))

vi.mock('../../web/state-manager.js', () => ({
  GENERATION_STATE_EVENT: 'generation-state-changed',
  stateManager: {
    getTabData: vi.fn(() => ({})),
    setTabData: vi.fn(),
    getGenerationState: vi.fn(() => ({ previewAvailable: false, phase: 'layout_review' })),
    getLayoutFreshness: vi.fn(() => ({ isStale: false })),
    getSessionId: vi.fn(() => 'session-123'),
    markPreviewGenerated: vi.fn(),
  },
}))

let mod
let apiCall

beforeEach(async () => {
  vi.resetModules()
  document.body.innerHTML = `
    <div id="conversation"></div>
    <iframe id="layout-preview"></iframe>
    <div id="preview-output-status"></div>
    <div id="confirmation-message"></div>
    <div id="processing-indicator"></div>
    <textarea id="instruction-input"></textarea>
    <div id="layout-stale-callout"></div>
  `
  apiCall = (await import('../../web/api-client.js')).apiCall
  apiCall.mockReset()
  mod = await import('../../web/layout-instruction.js')
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('layout review runtime wiring', () => {
  it('renders the safety alert into the conversation using the real message queue', async () => {
    apiCall.mockResolvedValue({
      ok: true,
      html: '<html><body><h1>Preview</h1></body></html>',
      summary: 'Moved skills section',
      safety_alert: {
        flagged: true,
        message: 'Safety processing sanitized prompt-like or unsafe material before applying the layout change.',
        issues: ['Removed prompt-like instruction fragment.'],
      },
    })

    await mod.submitLayoutInstruction('Move skills lower')

    const conversation = document.getElementById('conversation')
    expect(conversation.textContent).toContain('Layout safety sanitization applied.')
    expect(conversation.textContent).toContain('Removed prompt-like instruction fragment.')
    expect(conversation.innerHTML).not.toContain('<script')
  })
})