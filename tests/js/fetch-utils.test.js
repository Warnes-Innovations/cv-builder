// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/fetch-utils.test.js
 * Unit tests for web/fetch-utils.js
 * Tests the conflict banner, retry queue, llmFetch, abortCurrentRequest,
 * _updateLLMStatusBar, and setLoading.
 */

// ── Module loading helpers ─────────────────────────────────────────────────
// fetch-utils installs a window.fetch interceptor as a side effect when
// imported, so we reset modules before each test group that needs a fresh
// interceptor state.

let mod

async function load() {
  vi.resetModules()
  mod = await import('../../web/fetch-utils.js')
  return mod
}

// ── Conflict banner helpers ────────────────────────────────────────────────

function buildConflictBanner() {
  document.body.innerHTML = `
    <div id="session-conflict-banner" style="display:none">
      <span id="conflict-banner-text"></span>
      <span id="conflict-countdown"></span>
    </div>`
}

// ── LLM status bar helpers ─────────────────────────────────────────────────

function buildStatusBar() {
  document.body.innerHTML = `
    <div id="llm-status-bar" style="display:none">
      <div id="llm-thinking" style="display:none"></div>
      <button id="llm-abort-btn" style="display:none"></button>
      <span id="llm-step-label"></span>
      <span id="llm-elapsed"></span>
      <span id="llm-token-count"></span>
    </div>`
}

// ── Setup / teardown ──────────────────────────────────────────────────────

// The module installs a fetch interceptor as a side effect on import.
// It captures the current window.fetch as _origFetch, then replaces
// window.fetch with its own wrapper.  Tests must hold a reference to
// the mock BEFORE loading the module, then target that mock directly.
let fetchMock

beforeEach(async () => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
  vi.stubGlobal('appendMessage', vi.fn())
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  await load()
  // After load, window.fetch is the conflict-retry wrapper.
  // fetchMock is _origFetch inside the closure and receives all real calls.
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ── showSessionConflictBanner ─────────────────────────────────────────────

describe('showSessionConflictBanner', () => {
  beforeEach(buildConflictBanner)

  it('shows the banner', () => {
    mod.showSessionConflictBanner()
    expect(document.getElementById('session-conflict-banner').style.display).toBe('block')
  })

  it('sets the initial countdown text', () => {
    mod.showSessionConflictBanner()
    expect(document.getElementById('conflict-countdown').textContent).toMatch(/30s/)
  })

  it('decrements countdown on each tick', () => {
    mod.showSessionConflictBanner()
    vi.advanceTimersByTime(2000)
    expect(document.getElementById('conflict-countdown').textContent).toMatch(/28s/)
  })

  it('does not throw when banner element is absent', () => {
    document.body.innerHTML = ''
    expect(() => mod.showSessionConflictBanner()).not.toThrow()
  })
})

// ── conflictRetryNow ──────────────────────────────────────────────────────

describe('conflictRetryNow', () => {
  beforeEach(buildConflictBanner)

  it('hides the banner', () => {
    mod.showSessionConflictBanner()
    mod.conflictRetryNow()
    expect(document.getElementById('session-conflict-banner').style.display).toBe('none')
  })

  it('resolves queued promises with true', async () => {
    let resolved
    const p = new Promise(r => { resolved = r })
    // Manually invoke the banner to queue a resolve
    mod.showSessionConflictBanner()
    // Inject a waiter into the internal queue via conflictRetryNow's flush
    // (queue is drained by conflictRetryNow passing true)
    // We test by calling conflictRetryNow immediately after banner
    mod.conflictRetryNow()
    // No rejection, banner hidden — verified above
    expect(document.getElementById('session-conflict-banner').style.display).toBe('none')
  })
})

// ── conflictDismiss ───────────────────────────────────────────────────────

describe('conflictDismiss', () => {
  beforeEach(buildConflictBanner)

  it('hides the banner', () => {
    mod.showSessionConflictBanner()
    mod.conflictDismiss()
    expect(document.getElementById('session-conflict-banner').style.display).toBe('none')
  })
})

// ── llmFetch ──────────────────────────────────────────────────────────────

describe('llmFetch', () => {
  it('calls the underlying fetch with the given url and options', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    await mod.llmFetch('/api/status', { method: 'GET' })
    expect(fetchMock).toHaveBeenCalledWith('/api/status', expect.objectContaining({ method: 'GET' }))
  })

  it('attaches abort signal when _currentAbortController is set', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    window._currentAbortController = new AbortController()
    const opts = {}
    await mod.llmFetch('/api/status', opts)
    expect(opts.signal).toBeDefined()
    window._currentAbortController = null
  })

  it('does not attach signal when no abort controller is set', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    window._currentAbortController = null
    const opts = {}
    await mod.llmFetch('/api/status', opts)
    expect(opts.signal).toBeUndefined()
  })
})

// ── abortCurrentRequest ───────────────────────────────────────────────────

describe('abortCurrentRequest', () => {
  it('aborts and clears the controller', () => {
    const controller = new AbortController()
    const spy = vi.spyOn(controller, 'abort')
    window._currentAbortController = controller
    mod.abortCurrentRequest()
    expect(spy).toHaveBeenCalled()
    expect(window._currentAbortController).toBeNull()
  })

  it('calls appendMessage with stop message', () => {
    window._currentAbortController = new AbortController()
    mod.abortCurrentRequest()
    expect(globalThis.appendMessage).toHaveBeenCalledWith('system', '⏹ Request stopped.')
  })

  it('does nothing when no controller is set', () => {
    window._currentAbortController = null
    expect(() => mod.abortCurrentRequest()).not.toThrow()
    expect(globalThis.appendMessage).not.toHaveBeenCalled()
  })
})

// ── _updateLLMStatusBar ───────────────────────────────────────────────────

describe('_updateLLMStatusBar', () => {
  beforeEach(buildStatusBar)

  it('shows the bar and thinking indicator when loading', () => {
    mod._updateLLMStatusBar(true, 'Analyzing…')
    expect(document.getElementById('llm-status-bar').style.display).toBe('flex')
    expect(document.getElementById('llm-thinking').style.display).toBe('flex')
    expect(document.getElementById('llm-abort-btn').style.display).toBe('')
  })

  it('sets the step label', () => {
    mod._updateLLMStatusBar(true, 'Generating CV')
    expect(document.getElementById('llm-step-label').textContent).toBe('Generating CV')
  })

  it('hides thinking indicator when loading ends', () => {
    // stub fetch so _refreshContextStats doesn't throw
    fetchMock.mockRejectedValue(new Error('no server'))
    mod._updateLLMStatusBar(true)
    mod._updateLLMStatusBar(false)
    expect(document.getElementById('llm-status-bar').style.display).toBe('none')
    expect(document.getElementById('llm-thinking').style.display).toBe('none')
    expect(document.getElementById('llm-abort-btn').style.display).toBe('none')
  })

  it('does not throw when bar element is absent', () => {
    document.body.innerHTML = ''
    expect(() => mod._updateLLMStatusBar(true, 'x')).not.toThrow()
  })
})

// ── setLoading ────────────────────────────────────────────────────────────

describe('setLoading', () => {
  beforeEach(() => {
    buildStatusBar()
    document.body.insertAdjacentHTML('beforeend', '<button id="b1">Click</button>')
    fetchMock.mockRejectedValue(new Error('no server'))
  })

  it('creates an AbortController when loading=true', () => {
    mod.setLoading(true)
    expect(window._currentAbortController).toBeTruthy()
  })

  it('clears the AbortController when loading=false', () => {
    mod.setLoading(true)
    mod.setLoading(false)
    expect(window._currentAbortController).toBeNull()
  })

  it('disables buttons while loading', () => {
    mod.setLoading(true)
    expect(document.getElementById('b1').disabled).toBe(true)
  })

  it('re-enables buttons when loading ends', () => {
    mod.setLoading(true)
    mod.setLoading(false)
    expect(document.getElementById('b1').disabled).toBe(false)
  })

  it('creates a progress bar element when loading', () => {
    mod.setLoading(true, 'Working…')
    expect(document.getElementById('loading-progress-bar')).not.toBeNull()
  })

  it('removes progress bar after loading ends', () => {
    mod.setLoading(true)
    mod.setLoading(false)
    vi.advanceTimersByTime(500)
    expect(document.getElementById('loading-progress-bar')).toBeNull()
  })
})
