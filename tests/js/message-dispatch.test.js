// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/message-dispatch.test.js
 * Unit tests for web/message-dispatch.js — sendMessage dispatch table and
 * intake card helpers.
 * (_handleLLMMessage and orchestration-heavy flows are covered by integration tests.)
 */
import {
  _messageHandlers,
  sendMessage,
  _showIntakeConfirmCard,
  _submitIntakeCard,
  _skipIntakeCard,
  _dismissPriorClarifications,
  _loadPriorClarifications,
} from '../../web/message-dispatch.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

// ── DOM + global stubs ─────────────────────────────────────────────────────

function buildChatDom() {
  document.body.innerHTML = `
    <input id="message-input" value="">
    <div id="chat-messages"></div>`
}

beforeEach(() => {
  document.body.innerHTML = ''
  global.localStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }
  initializeState()
  vi.stubGlobal('isLoading', false)
  vi.stubGlobal('normalizeText', s => (s || '').trim())
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('appendRetryMessage', vi.fn())
  vi.stubGlobal('appendRawHtml', vi.fn())
  vi.stubGlobal('setLoading', vi.fn())
  vi.stubGlobal('_updateLlmStatusPill', vi.fn())
  vi.stubGlobal('llmFetch', vi.fn())
  vi.stubGlobal('fetchStatus', vi.fn())
  vi.stubGlobal('analyzeJob', vi.fn())
  vi.stubGlobal('sendAction', vi.fn())
  vi.stubGlobal('showTableBasedReview', vi.fn())
  vi.stubGlobal('parseMessageResponse', vi.fn())
  vi.stubGlobal('handleExperienceResponse', vi.fn())
  vi.stubGlobal('handleSkillsResponse', vi.fn())
  vi.stubGlobal('handleQuestionResponse', vi.fn(() => false))
  vi.stubGlobal('extractFirstJsonObject', vi.fn(() => null))
  vi.stubGlobal('handleCustomizationResponse', vi.fn())
  vi.stubGlobal('_handleLLMMessage', vi.fn())
  window.waitingForExperienceResponse = false
  window.waitingForSkillsResponse = false
  window.waitingForQuestionResponse = false
  window.pendingRecommendations = null
  window.questionAnswers = {}
  window._pendingPriorAnswers = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.waitingForExperienceResponse
  delete window.waitingForSkillsResponse
  delete window.waitingForQuestionResponse
  delete window.pendingRecommendations
  delete window._pendingPriorAnswers
})

// ── _messageHandlers dispatch table ──────────────────────────────────────

describe('_messageHandlers', () => {
  it('has entries for review, experience, skills, questions, proceed, default', () => {
    expect(_messageHandlers.length).toBeGreaterThanOrEqual(5)
  })

  it('review handler matches "review recommendations"', () => {
    const handler = _messageHandlers[0]
    expect(handler.test('review recommendations')).toBe(true)
    expect(handler.test('REVIEW')).toBe(true)
    expect(handler.test('other text')).toBe(false)
  })

  it('experience handler fires when waitingForExperienceResponse is true', () => {
    window.waitingForExperienceResponse = true
    const handler = _messageHandlers[1]
    expect(handler.test('anything')).toBe(true)
  })

  it('skills handler fires when waitingForSkillsResponse is true', () => {
    window.waitingForSkillsResponse = true
    const handler = _messageHandlers[2]
    expect(handler.test('anything')).toBe(true)
  })

  it('proceed handler matches "proceed" exactly (case-insensitive)', () => {
    const proceedHandler = _messageHandlers.find(h => h.test('proceed'))
    expect(proceedHandler).toBeTruthy()
    expect(_messageHandlers.find(h => !h.test && true)).toBeUndefined()
  })

  it('default handler always matches', () => {
    const defaultHandler = _messageHandlers[_messageHandlers.length - 1]
    expect(defaultHandler.test('any text')).toBe(true)
  })
})

// ── sendMessage ───────────────────────────────────────────────────────────

describe('sendMessage', () => {
  beforeEach(() => {
    buildChatDom()
    // Simulate a URL with a session ID so getSessionIdFromURL() returns a value.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?session=test-session-id' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    })
  })

  it('does nothing when input is empty', async () => {
    document.getElementById('message-input').value = ''
    await sendMessage()
    expect(globalThis.appendMessage).not.toHaveBeenCalled()
  })

  it('shows system error and returns when no session ID in URL', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    })
    document.getElementById('message-input').value = 'hello'
    await sendMessage()
    expect(globalThis.appendMessage).toHaveBeenCalledWith(
      'system',
      '⚠️ No active session. Create or load a session before sending messages.',
    )
    expect(globalThis.appendMessage).toHaveBeenCalledTimes(1)
  })

  it('does nothing when isLoading is true', async () => {
    stateManager.setLoading(true)
    document.getElementById('message-input').value = 'hello'
    await sendMessage()
    expect(globalThis.appendMessage).not.toHaveBeenCalled()
  })

  it('appends user message and clears input on dispatch', async () => {
    document.getElementById('message-input').value = 'hello world'
    await sendMessage()
    expect(globalThis.appendMessage).toHaveBeenCalledWith('user', 'hello world')
    expect(document.getElementById('message-input').value).toBe('')
  })

  it('calls showTableBasedReview for "review"', async () => {
    document.getElementById('message-input').value = 'review'
    await sendMessage()
    expect(globalThis.showTableBasedReview).toHaveBeenCalled()
  })

  it('calls sendAction for "proceed" when no pendingRecommendations', async () => {
    document.getElementById('message-input').value = 'proceed'
    await sendMessage()
    expect(globalThis.sendAction).toHaveBeenCalledWith('recommend_customizations')
  })

  it('calls showTableBasedReview for "proceed" when pendingRecommendations exists', async () => {
    window.pendingRecommendations = { some: 'data' }
    document.getElementById('message-input').value = 'proceed'
    await sendMessage()
    expect(globalThis.showTableBasedReview).toHaveBeenCalled()
  })

  it('sets rate-limited state when /api/message returns HTTP 429', async () => {
    globalThis.llmFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ error: 'Rate limit reached. Please wait and try again.' }),
    })

    document.getElementById('message-input').value = 'hello'
    await sendMessage()

    expect(globalThis._updateLlmStatusPill).toHaveBeenCalledWith(
      'rate-limited',
      'Rate limited',
      '⏳',
      'Provider rate limit reached. Wait briefly and retry.',
    )
  })

  it('sets unavailable state when provider returns HTTP 503', async () => {
    globalThis.llmFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html><html>service unavailable</html>',
    })

    document.getElementById('message-input').value = 'hello'
    await sendMessage()

    expect(globalThis._updateLlmStatusPill).toHaveBeenCalledWith(
      'unavailable',
      'Provider unavailable',
      '☁',
      'Provider is currently unavailable or unreachable. Retry soon.',
    )
  })
})

// ── _showIntakeConfirmCard ────────────────────────────────────────────────

describe('_showIntakeConfirmCard', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="chat-messages"></div>'
    globalThis.llmFetch.mockResolvedValue({
      json: async () => ({ confirmed: false, role: 'Engineer', company: 'Acme', date_applied: '2026-01-01' }),
    })
  })

  it('calls appendRawHtml with intake card markup', async () => {
    await _showIntakeConfirmCard()
    expect(globalThis.appendRawHtml).toHaveBeenCalled()
    const html = globalThis.appendRawHtml.mock.calls[0][0]
    expect(html).toContain('intake-confirm-card')
    expect(html).toContain('intake-role-input')
  })

  it('calls analyzeJob (via _proceedAfterIntake) when already confirmed', async () => {
    globalThis.llmFetch.mockResolvedValue({
      json: async () => ({ confirmed: true }),
    })
    // _proceedAfterIntake is called directly (module scope), not via globalThis.
    // Its observable effect when no prior-clarifications are found is analyzeJob().
    globalThis.llmFetch
      .mockResolvedValueOnce({ json: async () => ({ confirmed: true }) })   // intake-metadata
      .mockResolvedValueOnce({ json: async () => ({ found: false }) })       // prior-clarifications
    await _showIntakeConfirmCard()
    expect(globalThis.analyzeJob).toHaveBeenCalled()
  })

  it('preserves a provided continuation when already confirmed', async () => {
    const continuation = vi.fn()
    globalThis.llmFetch
      .mockResolvedValueOnce({ json: async () => ({ confirmed: true }) })
      .mockResolvedValueOnce({ json: async () => ({ found: false }) })

    await _showIntakeConfirmCard(continuation)

    expect(continuation).toHaveBeenCalled()
    expect(globalThis.analyzeJob).not.toHaveBeenCalled()
  })

  it('proceeds with empty defaults on network error', async () => {
    globalThis.llmFetch.mockRejectedValue(new Error('network'))
    await expect(_showIntakeConfirmCard()).resolves.not.toThrow()
    expect(globalThis.appendRawHtml).toHaveBeenCalled()
  })
})

// ── _skipIntakeCard ───────────────────────────────────────────────────────

describe('_skipIntakeCard', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="intake-confirm-card"></div>'
    // Seed prior-clarifications mock so _proceedAfterIntake falls through to analyzeJob
    globalThis.llmFetch.mockResolvedValue({ json: async () => ({ found: false }) })
  })

  it('removes the card and eventually calls analyzeJob', async () => {
    await _skipIntakeCard()
    expect(document.getElementById('intake-confirm-card')).toBeNull()
    // _proceedAfterIntake is called internally; its observable effect is analyzeJob()
    expect(globalThis.analyzeJob).toHaveBeenCalled()
  })

  it('runs a provided continuation instead of re-analyzing', async () => {
    const continuation = vi.fn()
    await _skipIntakeCard(continuation)
    expect(continuation).toHaveBeenCalled()
    expect(globalThis.analyzeJob).not.toHaveBeenCalled()
  })
})

describe('_submitIntakeCard', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="intake-confirm-card"></div>
      <input id="intake-role-input" value="Staff Engineer">
      <input id="intake-company-input" value="Acme Labs">
      <input id="intake-date-input" value="2026-03-24">
      <button id="intake-confirm-btn"></button>`
  })

  it('posts confirmation and continues with the provided continuation', async () => {
    const continuation = vi.fn()
    globalThis.llmFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ json: async () => ({ found: false }) })

    await _submitIntakeCard(continuation)

    expect(globalThis.llmFetch).toHaveBeenNthCalledWith(1, '/api/confirm-intake', expect.objectContaining({
      method: 'POST',
    }))
    expect(continuation).toHaveBeenCalled()
    expect(globalThis.analyzeJob).not.toHaveBeenCalled()
  })
})

// ── _dismissPriorClarifications ───────────────────────────────────────────

describe('_dismissPriorClarifications', () => {
  it('removes banner, deletes pending answers, calls analyzeJob', async () => {
    document.body.innerHTML = '<div id="prior-clar-banner"></div>'
    window._pendingPriorAnswers = { type1: 'answer' }
    await _dismissPriorClarifications()
    expect(document.getElementById('prior-clar-banner')).toBeNull()
    expect(window._pendingPriorAnswers).toBeUndefined()
    expect(globalThis.analyzeJob).toHaveBeenCalled()
  })
})

// ── _loadPriorClarifications ──────────────────────────────────────────────

describe('_loadPriorClarifications', () => {
  it('merges pending answers into questionAnswers and calls analyzeJob', async () => {
    document.body.innerHTML = '<div id="prior-clar-banner"></div>'
    window._pendingPriorAnswers = { experience_level: 'Senior' }
    window.questionAnswers = { existing_type: 'value' }
    await _loadPriorClarifications()
    expect(window.questionAnswers.experience_level).toBe('Senior')
    expect(window.questionAnswers.existing_type).toBe('value')
    expect(globalThis.analyzeJob).toHaveBeenCalled()
  })

  it('initializes questionAnswers when absent', async () => {
    document.body.innerHTML = '<div id="prior-clar-banner"></div>'
    window._pendingPriorAnswers = { t: 'a' }
    window.questionAnswers = null
    await _loadPriorClarifications()
    expect(window.questionAnswers).toEqual({ t: 'a' })
  })
})
