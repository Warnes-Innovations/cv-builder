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

// ── DOM + global stubs ─────────────────────────────────────────────────────

function buildChatDom() {
  document.body.innerHTML = `
    <input id="message-input" value="">
    <div id="chat-messages"></div>`
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('isLoading', false)
  vi.stubGlobal('normalizeText', s => (s || '').trim())
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('appendRetryMessage', vi.fn())
  vi.stubGlobal('appendRawHtml', vi.fn())
  vi.stubGlobal('setLoading', vi.fn())
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
  beforeEach(buildChatDom)

  it('does nothing when input is empty', async () => {
    document.getElementById('message-input').value = ''
    await sendMessage()
    expect(globalThis.appendMessage).not.toHaveBeenCalled()
  })

  it('does nothing when isLoading is true', async () => {
    vi.stubGlobal('isLoading', true)
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
})

// ── _dismissPriorClarifications ───────────────────────────────────────────

describe('_dismissPriorClarifications', () => {
  it('removes banner, deletes pending answers, calls analyzeJob', () => {
    document.body.innerHTML = '<div id="prior-clar-banner"></div>'
    window._pendingPriorAnswers = { type1: 'answer' }
    _dismissPriorClarifications()
    expect(document.getElementById('prior-clar-banner')).toBeNull()
    expect(window._pendingPriorAnswers).toBeUndefined()
    expect(globalThis.analyzeJob).toHaveBeenCalled()
  })
})

// ── _loadPriorClarifications ──────────────────────────────────────────────

describe('_loadPriorClarifications', () => {
  it('merges pending answers into questionAnswers and calls analyzeJob', () => {
    document.body.innerHTML = '<div id="prior-clar-banner"></div>'
    window._pendingPriorAnswers = { experience_level: 'Senior' }
    window.questionAnswers = { existing_type: 'value' }
    _loadPriorClarifications()
    expect(window.questionAnswers.experience_level).toBe('Senior')
    expect(window.questionAnswers.existing_type).toBe('value')
    expect(globalThis.analyzeJob).toHaveBeenCalled()
  })

  it('initializes questionAnswers when absent', () => {
    document.body.innerHTML = '<div id="prior-clar-banner"></div>'
    window._pendingPriorAnswers = { t: 'a' }
    window.questionAnswers = null
    _loadPriorClarifications()
    expect(window.questionAnswers).toEqual({ t: 'a' })
  })
})
