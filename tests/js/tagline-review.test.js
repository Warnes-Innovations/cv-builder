// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/tagline-review.test.js
 * Unit tests for web/tagline-review.js — buildTaglineReviewSection,
 * onTaglineInputChange, resetTaglineToProposed, confirmTagline, taglineContinue.
 * (Full DOM rendering of buildTaglineReviewSection is integration-tested here
 *  through fetch-mock composition rather than a running server.)
 */
import {
  buildTaglineReviewSection,
  onTaglineInputChange,
  resetTaglineToProposed,
  confirmTagline,
  taglineContinue,
} from '../../web/tagline-review.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

function createLocalStorageMock() {
  let store = {}
  return {
    getItem:    key        => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem:    (key, val) => { store[key] = String(val) },
    removeItem: key        => { delete store[key] },
    clear:      ()         => { store = {} },
  }
}

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock())
  vi.stubGlobal('escapeHtml',   s => String(s ?? ''))
  vi.stubGlobal('showToast',    vi.fn())
  vi.stubGlobal('switchTab',    vi.fn())
  globalThis.fetch = vi.fn()
  initializeState()

  delete window._proposedTagline
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  delete window._proposedTagline
})

// ── Helpers ───────────────────────────────────────────────────────────────

function makeStatusResponse(overrides = {}) {
  return {
    tagline_override:     overrides.tagline_override     ?? null,
    decisions_confirmed:  overrides.decisions_confirmed  ?? {},
    customizations:       overrides.customizations       ?? {},
  }
}

function mockFetchStatus(statusObj) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok:   true,
    json: async () => statusObj,
  })
}

// ── buildTaglineReviewSection ─────────────────────────────────────────────

describe('buildTaglineReviewSection', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tagline-review-container"></div>'
  })

  it('does nothing when container is absent', async () => {
    document.body.innerHTML = ''
    await expect(buildTaglineReviewSection()).resolves.toBeUndefined()
  })

  it('renders an input with the proposed tagline when no override present', async () => {
    mockFetchStatus(makeStatusResponse({
      customizations: { applicant_tagline: 'Senior Data Scientist' },
    }))

    await buildTaglineReviewSection()

    const input = document.getElementById('tagline-input')
    expect(input).not.toBeNull()
    expect(input.value).toBe('Senior Data Scientist')
  })

  it('prefers confirmed tagline_override over proposed tagline', async () => {
    mockFetchStatus(makeStatusResponse({
      tagline_override:    'Confirmed Tagline',
      customizations:      { applicant_tagline: 'AI Proposed Tagline' },
      decisions_confirmed: { tagline: true },
    }))

    await buildTaglineReviewSection()

    const input = document.getElementById('tagline-input')
    expect(input.value).toBe('Confirmed Tagline')
  })

  it('shows "✓ Confirmed" status when already confirmed', async () => {
    mockFetchStatus(makeStatusResponse({
      tagline_override:    'My Tagline',
      decisions_confirmed: { tagline: true },
    }))

    await buildTaglineReviewSection()

    const status = document.getElementById('tagline-confirm-status')
    expect(status.textContent).toContain('✓ Confirmed')
  })

  it('shows "Requires your confirmation" when not yet confirmed', async () => {
    mockFetchStatus(makeStatusResponse({
      customizations: { applicant_tagline: 'Proposed Tagline' },
    }))

    await buildTaglineReviewSection()

    const status = document.getElementById('tagline-confirm-status')
    expect(status.textContent).toContain('Requires your confirmation')
  })

  it('continue button has opacity 0.5 and not-allowed cursor when unconfirmed', async () => {
    mockFetchStatus(makeStatusResponse({
      customizations: { applicant_tagline: 'Some Tagline' },
    }))

    await buildTaglineReviewSection()

    const continueBtn = document.getElementById('tagline-continue-btn')
    expect(continueBtn.style.opacity).toBe('0.5')
    expect(continueBtn.style.cursor).toBe('not-allowed')
  })

  it('continue button has no opacity restriction when already confirmed', async () => {
    mockFetchStatus(makeStatusResponse({
      tagline_override:    'My Tagline',
      decisions_confirmed: { tagline: true },
    }))

    await buildTaglineReviewSection()

    const continueBtn = document.getElementById('tagline-continue-btn')
    expect(continueBtn.style.opacity).toBe('')
    expect(continueBtn.style.cursor).toBe('')
  })

  it('shows "Use this" button when proposed differs from confirmed override', async () => {
    mockFetchStatus(makeStatusResponse({
      tagline_override:    'Old Confirmed',
      decisions_confirmed: { tagline: true },
      customizations:      { applicant_tagline: 'New AI Proposed' },
    }))

    await buildTaglineReviewSection()

    expect(document.body.textContent).toContain('Use this')
  })

  it('does not show "Use this" button when proposed matches override', async () => {
    mockFetchStatus(makeStatusResponse({
      tagline_override:    'Same Tagline',
      decisions_confirmed: { tagline: true },
      customizations:      { applicant_tagline: 'Same Tagline' },
    }))

    await buildTaglineReviewSection()

    expect(document.body.textContent).not.toContain('Use this')
  })

  it('does not show "Use this" when there is no proposed tagline', async () => {
    mockFetchStatus(makeStatusResponse({ customizations: {} }))

    await buildTaglineReviewSection()

    expect(document.body.textContent).not.toContain('Use this')
  })

  it('stores proposed tagline in window._proposedTagline', async () => {
    mockFetchStatus(makeStatusResponse({
      customizations: { applicant_tagline: 'Stored Proposed' },
    }))

    await buildTaglineReviewSection()

    expect(window._proposedTagline).toBe('Stored Proposed')
  })

  it('renders gracefully when fetch fails (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))

    await expect(buildTaglineReviewSection()).resolves.toBeUndefined()

    // Container should still have rendered (with empty input)
    const input = document.getElementById('tagline-input')
    expect(input).not.toBeNull()
    expect(input.value).toBe('')
  })

  it('renders gracefully when fetch returns non-ok status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

    await expect(buildTaglineReviewSection()).resolves.toBeUndefined()

    const input = document.getElementById('tagline-input')
    expect(input).not.toBeNull()
  })
})

// ── onTaglineInputChange ──────────────────────────────────────────────────

describe('onTaglineInputChange', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="tagline-confirm-status"><span style="color:#065f46;">✓ Confirmed</span></span>
      <span id="tagline-confirmed-badge" style="display:'';">Saved ✓</span>
      <button id="tagline-continue-btn" style="opacity:'';cursor:'';">Continue</button>`
  })

  it('hides the confirmed badge', () => {
    onTaglineInputChange()
    expect(document.getElementById('tagline-confirmed-badge').style.display).toBe('none')
  })

  it('updates status span to "Requires your confirmation"', () => {
    onTaglineInputChange()
    const status = document.getElementById('tagline-confirm-status')
    expect(status.textContent).toContain('Requires your confirmation')
  })

  it('sets continue button opacity to 0.5', () => {
    onTaglineInputChange()
    expect(document.getElementById('tagline-continue-btn').style.opacity).toBe('0.5')
  })

  it('sets continue button cursor to not-allowed', () => {
    onTaglineInputChange()
    expect(document.getElementById('tagline-continue-btn').style.cursor).toBe('not-allowed')
  })

  it('sets continue button title to confirmation reminder', () => {
    onTaglineInputChange()
    expect(document.getElementById('tagline-continue-btn').title).toBe(
      'Please confirm the tagline before continuing'
    )
  })

  it('does not throw when DOM elements are absent', () => {
    document.body.innerHTML = ''
    expect(() => onTaglineInputChange()).not.toThrow()
  })
})

// ── resetTaglineToProposed ────────────────────────────────────────────────

describe('resetTaglineToProposed', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="tagline-input" value="Current Value" />
      <span id="tagline-confirm-status"></span>
      <span id="tagline-confirmed-badge"></span>
      <button id="tagline-continue-btn"></button>`
  })

  it('resets input value to window._proposedTagline', () => {
    window._proposedTagline = 'AI Proposed Text'
    resetTaglineToProposed()
    expect(document.getElementById('tagline-input').value).toBe('AI Proposed Text')
  })

  it('calls onTaglineInputChange side effects (badge hidden)', () => {
    window._proposedTagline = 'AI Proposed'
    document.getElementById('tagline-confirmed-badge').style.display = ''
    resetTaglineToProposed()
    expect(document.getElementById('tagline-confirmed-badge').style.display).toBe('none')
  })

  it('does nothing when input element is absent', () => {
    window._proposedTagline = 'Some Tagline'
    document.body.innerHTML = ''
    expect(() => resetTaglineToProposed()).not.toThrow()
  })

  it('does nothing when _proposedTagline is empty string', () => {
    window._proposedTagline = ''
    const input = document.getElementById('tagline-input')
    input.value = 'Keep This'
    resetTaglineToProposed()
    expect(input.value).toBe('Keep This')
  })

  it('does nothing when _proposedTagline is undefined', () => {
    delete window._proposedTagline
    const input = document.getElementById('tagline-input')
    input.value = 'Keep This'
    resetTaglineToProposed()
    expect(input.value).toBe('Keep This')
  })
})

// ── confirmTagline ────────────────────────────────────────────────────────

describe('confirmTagline', () => {
  let markContentChangedSpy

  beforeEach(() => {
    document.body.innerHTML = `
      <input id="tagline-input" value="Senior Data Scientist" />
      <button id="tagline-confirm-btn">✓ Confirm</button>
      <span  id="tagline-confirmed-badge" style="display:none;">Saved ✓</span>
      <span  id="tagline-confirm-status"></span>
      <button id="tagline-continue-btn" style="opacity:0.5;cursor:not-allowed;">Continue</button>`

    markContentChangedSpy = vi.spyOn(stateManager, 'markContentChanged')
  })

  afterEach(() => {
    markContentChangedSpy.mockRestore()
  })

  it('calls fetch POST /api/review-decisions with correct body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await confirmTagline()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/review-decisions',
      expect.objectContaining({
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'tagline', decisions: 'Senior Data Scientist' }),
      })
    )
  })

  it('shows the confirmed badge on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await confirmTagline()

    expect(document.getElementById('tagline-confirmed-badge').style.display).toBe('')
  })

  it('updates status span to "✓ Confirmed" on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await confirmTagline()

    expect(document.getElementById('tagline-confirm-status').textContent).toContain('✓ Confirmed')
  })

  it('enables the continue button on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await confirmTagline()

    const btn = document.getElementById('tagline-continue-btn')
    expect(btn.style.opacity).toBe('')
    expect(btn.style.cursor).toBe('')
    expect(btn.title).toBe('')
  })

  it('calls stateManager.markContentChanged on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await confirmTagline()

    expect(markContentChangedSpy).toHaveBeenCalled()
  })

  it('shows success toast on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await confirmTagline()

    expect(globalThis.showToast).toHaveBeenCalledWith('Tagline confirmed.')
  })

  it('shows error toast and does not POST when tagline is empty', async () => {
    document.getElementById('tagline-input').value = '   '
    globalThis.fetch = vi.fn()

    await confirmTagline()

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(globalThis.showToast).toHaveBeenCalledWith(
      'Please enter a tagline before confirming.', 'error'
    )
  })

  it('shows error toast on API error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok:   false,
      json: async () => ({ error: 'Session expired' }),
      statusText: 'Bad Request',
    })

    await confirmTagline()

    expect(globalThis.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Session expired'), 'error'
    )
  })

  it('shows error toast when API returns ok:false with no error field', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok:         false,
      json:       async () => ({}),
      statusText: 'Internal Server Error',
    })

    await confirmTagline()

    expect(globalThis.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Internal Server Error'), 'error'
    )
  })

  it('shows error toast on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))

    await confirmTagline()

    expect(globalThis.showToast).toHaveBeenCalledWith(
      'Network error saving tagline.', 'error'
    )
  })

  it('re-enables confirm button after API error (finally block)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({}), statusText: 'Error',
    })

    await confirmTagline()

    expect(document.getElementById('tagline-confirm-btn').disabled).toBe(false)
  })

  it('re-enables confirm button after network error (finally block)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('net'))

    await confirmTagline()

    expect(document.getElementById('tagline-confirm-btn').disabled).toBe(false)
  })

  it('does nothing when input element is absent', async () => {
    document.body.innerHTML = ''
    await expect(confirmTagline()).resolves.toBeUndefined()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

// ── taglineContinue ───────────────────────────────────────────────────────

describe('taglineContinue', () => {
  it('calls switchTab("summary-review") when tagline is confirmed', async () => {
    document.body.innerHTML = `
      <button id="tagline-continue-btn" style="opacity:'';cursor:'';">Continue</button>`

    await taglineContinue()

    expect(globalThis.switchTab).toHaveBeenCalledWith('summary-review')
  })

  it('shows toast and does NOT switch tab when cursor is not-allowed', async () => {
    document.body.innerHTML = `
      <button id="tagline-continue-btn" style="cursor:not-allowed;">Continue</button>`

    await taglineContinue()

    expect(globalThis.showToast).toHaveBeenCalledWith(
      'Please confirm the tagline before continuing.', 'error'
    )
    expect(globalThis.switchTab).not.toHaveBeenCalled()
  })

  it('calls switchTab when continue button is absent (no DOM guard)', async () => {
    document.body.innerHTML = ''

    await taglineContinue()

    // No button → cursor check is skipped → proceeds to switchTab
    expect(globalThis.switchTab).toHaveBeenCalledWith('summary-review')
  })
})
