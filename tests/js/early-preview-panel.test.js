// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

vi.mock('../../web/api-client.js', () => ({
  apiCall: vi.fn(),
  StorageKeys: { EARLY_PREVIEW_COLLAPSED: 'cv-builder-early-preview-collapsed' },
}))

vi.mock('../../web/state-manager.js', () => ({
  stateManager: {
    getLayoutFreshness: vi.fn(() => ({ isStale: false })),
  },
}))

const PANEL_HTML = `
  <div id="early-preview-panel" style="display:none;">
    <div class="early-preview-header">
      <span class="early-preview-title">CV Preview</span>
      <span id="early-preview-status-note" role="status"></span>
      <button type="button" id="early-preview-toggle-btn" aria-label="Toggle CV preview" aria-expanded="true">Hide</button>
    </div>
    <div id="early-preview-body"></div>
  </div>
`

let mod
let apiCall
let stateManager

beforeEach(async () => {
  vi.resetModules()
  localStorage.clear()
  document.body.innerHTML = PANEL_HTML
  apiCall = (await import('../../web/api-client.js')).apiCall
  stateManager = (await import('../../web/state-manager.js')).stateManager
  apiCall.mockReset()
  stateManager.getLayoutFreshness.mockReset().mockReturnValue({ isStale: false })
  mod = await import('../../web/early-preview-panel.js')
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('toggleEarlyPreviewPanel — scope gating', () => {
  it('shows the panel and fetches for an in-scope tab', async () => {
    apiCall.mockResolvedValue({ ok: true, html: '<html><body>CV</body></html>' })

    await mod.toggleEarlyPreviewPanel('rewrite')

    expect(document.getElementById('early-preview-panel').style.display).toBe('block')
    expect(apiCall).toHaveBeenCalledWith('GET', '/api/layout-html')
  })

  it('hides the panel and does not fetch for an out-of-scope tab', async () => {
    await mod.toggleEarlyPreviewPanel('layout')

    expect(document.getElementById('early-preview-panel').style.display).toBe('none')
    expect(apiCall).not.toHaveBeenCalled()
  })

  it('does not throw when the panel element is absent', async () => {
    document.body.innerHTML = ''
    await expect(mod.toggleEarlyPreviewPanel('rewrite')).resolves.not.toThrow()
  })
})

describe('toggleEarlyPreviewPanel — body states', () => {
  it('renders an empty-state message when no preview exists yet (404)', async () => {
    apiCall.mockRejectedValue(new Error('404: Not found'))

    await mod.toggleEarlyPreviewPanel('spell')

    const body = document.getElementById('early-preview-body')
    expect(body.querySelector('.early-preview-empty')).toBeTruthy()
    expect(body.textContent).toContain('No CV preview yet')
  })

  it('renders a sandboxed iframe with content when a fresh preview exists', async () => {
    apiCall.mockResolvedValue({ ok: true, html: '<html><body><h1>My CV</h1></body></html>' })
    stateManager.getLayoutFreshness.mockReturnValue({ isStale: false })

    await mod.toggleEarlyPreviewPanel('rewrite')

    const iframe = document.getElementById('early-preview-iframe')
    expect(iframe).toBeTruthy()
    expect(iframe.srcdoc).toContain('<h1>My CV</h1>')
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin')
    expect(iframe.classList.contains('early-preview-iframe-stale')).toBe(false)
    expect(document.getElementById('early-preview-status-note').textContent).toBe('')
  })

  it('renders the stale note and dimmed class when the preview is stale', async () => {
    apiCall.mockResolvedValue({ ok: true, html: '<html><body><h1>My CV</h1></body></html>' })
    stateManager.getLayoutFreshness.mockReturnValue({ isStale: true })

    await mod.toggleEarlyPreviewPanel('rewrite')

    const iframe = document.getElementById('early-preview-iframe')
    expect(iframe.classList.contains('early-preview-iframe-stale')).toBe(true)
    expect(document.getElementById('early-preview-status-note').textContent).toContain('Layout Review')
  })
})

describe('initEarlyPreviewPanel — collapse toggle', () => {
  it('toggles aria-expanded and label text when the toggle button is clicked', async () => {
    apiCall.mockResolvedValue({ ok: true, html: '<html><body>CV</body></html>' })
    mod.initEarlyPreviewPanel()

    const btn = document.getElementById('early-preview-toggle-btn')
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(btn.textContent).toBe('Hide')

    btn.click()
    await Promise.resolve()

    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.textContent).toBe('Show')
  })

  it('persists collapse state via localStorage', async () => {
    apiCall.mockResolvedValue({ ok: true, html: '<html><body>CV</body></html>' })
    mod.initEarlyPreviewPanel()

    document.getElementById('early-preview-toggle-btn').click()
    await Promise.resolve()

    expect(localStorage.getItem('cv-builder-early-preview-collapsed')).toBe('true')
  })
})

describe('mutation-boundary safety', () => {
  it('never calls the mutating generate-preview or smart-instruction endpoints', async () => {
    apiCall.mockResolvedValue({ ok: true, html: '<html><body>CV</body></html>' })

    await mod.toggleEarlyPreviewPanel('rewrite')
    mod.initEarlyPreviewPanel()
    document.getElementById('early-preview-toggle-btn').click()
    await Promise.resolve()

    for (const call of apiCall.mock.calls) {
      expect(call[1]).not.toBe('/api/cv/generate-preview')
      expect(call[1]).not.toBe('/api/cv/smart-instruction')
    }
  })
})
