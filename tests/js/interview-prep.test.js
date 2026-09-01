// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/interview-prep.test.js
 * Unit tests for web/interview-prep.js — state management, question generation
 * (fetch mock), and rendering of interview-prep questions.
 */
import {
  _interviewPrepQuestions,
  _interviewPrepVisible,
  _resetInterviewPrepState,
  generateInterviewPrep,
  _renderQuestions,
  updateInterviewPrepHint,
} from '../../web/interview-prep.js'

beforeEach(() => {
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('showAlertModal', vi.fn())
  vi.stubGlobal('appendMessage', vi.fn())
  globalThis.fetch = vi.fn()
  localStorage.clear()

  _resetInterviewPrepState()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function _mountedContainer(questions = []) {
  document.body.innerHTML = '<div id="ip-questions-container"></div>'
  _renderQuestions(questions)
}

// ── state reset ───────────────────────────────────────────────────────────────

describe('_resetInterviewPrepState', () => {
  it('clears questions and visible flag', async () => {
    _mountedContainer([])
    document.body.innerHTML += '<button id="ip-generate-btn">gen</button><span id="ip-status"></span>'
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, questions: [{ question: 'Q1', rationale: '', hint: '' }] }),
    })
    await generateInterviewPrep()
    expect(_interviewPrepQuestions).toHaveLength(1)
    expect(_interviewPrepVisible).toBe(true)

    _resetInterviewPrepState()
    expect(_interviewPrepQuestions).toHaveLength(0)
    expect(_interviewPrepVisible).toBe(false)
  })
})

// ── updateInterviewPrepHint ───────────────────────────────────────────────────

describe('updateInterviewPrepHint', () => {
  it('stores an edited hint on the matching question', () => {
    _interviewPrepQuestions.length = 0
    _interviewPrepQuestions.push({ question: 'Q1', hint: '' })
    updateInterviewPrepHint(0, 'story about X')
    expect(_interviewPrepQuestions[0].hint).toBe('story about X')
  })

  it('ignores out-of-range indices', () => {
    _interviewPrepQuestions.length = 0
    _interviewPrepQuestions.push({ question: 'Q1' })
    updateInterviewPrepHint(5, 'nope')
    expect(_interviewPrepQuestions[0]).not.toHaveProperty('hint', 'nope')
  })
})

// ── _renderQuestions ──────────────────────────────────────────────────────────

describe('_renderQuestions', () => {
  it('renders an empty prompt when no questions', () => {
    _mountedContainer([])
    expect(document.getElementById('ip-questions-container').innerHTML).toContain('Generate Interview Prep')
  })

  it('renders each question with rationale and hint textarea', () => {
    _mountedContainer([
      { question: 'Tell me about yourself', rationale: 'probes fit', hint: 'open with summary' },
    ])
    const html = document.getElementById('ip-questions-container').innerHTML
    expect(html).toContain('Tell me about yourself')
    expect(html).toContain('probes fit')
    expect(html).toContain('open with summary')
  })
})

// ── generateInterviewPrep ─────────────────────────────────────────────────────

describe('generateInterviewPrep', () => {
  it('renders questions and stores them in state on success', async () => {
    _mountedContainer([])
    document.body.innerHTML += '<button id="ip-generate-btn">gen</button><span id="ip-status"></span>'
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        questions: [
          { question: 'Q1', rationale: 'R1', hint: 'H1' },
          { question: 'Q2', rationale: 'R2', hint: 'H2' },
        ],
      }),
    })

    await generateInterviewPrep()

    expect(_interviewPrepQuestions).toHaveLength(2)
    expect(_interviewPrepVisible).toBe(true)
    expect(document.getElementById('ip-questions-container').innerHTML).toContain('Q1')
    expect(document.getElementById('ip-questions-container').innerHTML).toContain('Q2')
  })

  it('shows an error modal when the backend reports failure', async () => {
    _mountedContainer([])
    document.body.innerHTML += '<button id="ip-generate-btn">gen</button><span id="ip-status"></span>'
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: 'LLM request failed' }),
    })

    await generateInterviewPrep()

    expect(showAlertModal).toHaveBeenCalled()
    expect(_interviewPrepQuestions).toHaveLength(0)
  })

  it('shows an error modal on network failure', async () => {
    _mountedContainer([])
    document.body.innerHTML += '<button id="ip-generate-btn">gen</button><span id="ip-status"></span>'
    fetch.mockRejectedValue(new Error('boom'))

    await generateInterviewPrep()

    expect(showAlertModal).toHaveBeenCalled()
  })
})
