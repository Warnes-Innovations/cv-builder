// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/questions-panel.test.js
 * Unit tests for web/questions-panel.js — pure helpers and DOM-bound functions.
 * askPostAnalysisQuestions is covered by the regression suite at the bottom of
 * this file; draftQuestionResponse is orchestration-heavy and covered by
 * integration tests.
 */
import {
  renderQuestionMarkdown,
  populateQuestionsTab,
  renderQuestionsPanel,
  selectQChip,
  onQInputChange,
  updateQProgress,
  showDraftError,
  showNextQuestion,
  handleQuestionResponse,
  finishPostAnalysisQuestions,
  askPostAnalysisQuestions,
} from '../../web/questions-panel.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

function createLocalStorageMock() {
  let store = {}
  return {
    getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: key => { delete store[key] },
    clear: () => { store = {} },
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildContent() {
  document.body.innerHTML = '<div id="document-content"></div>'
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('localStorage', createLocalStorageMock())
  window.postAnalysisQuestions = []
  window.questionAnswers = {}
  initializeState()
  stateManager.setTabData('analysis', null)
  window.waitingForQuestionResponse = false
  window.currentQuestionIndex = 0
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('cleanJsonResponse', s => s)
  vi.stubGlobal('mergePostAnalysisQuestions', vi.fn((a, b) => b || []))
  vi.stubGlobal('normalizePostAnalysisQuestions', vi.fn(a => Array.isArray(a) ? a : []))
  vi.stubGlobal('buildFallbackPostAnalysisQuestions', vi.fn(() => []))
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('sendAction', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('fetchStatus', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.postAnalysisQuestions
  delete window.questionAnswers
  delete window.waitingForQuestionResponse
  delete window.currentQuestionIndex
})

// ── renderQuestionMarkdown ────────────────────────────────────────────────

describe('renderQuestionMarkdown', () => {
  it('returns empty string for null/undefined', () => {
    expect(renderQuestionMarkdown(null)).toBe('')
    expect(renderQuestionMarkdown(undefined)).toBe('')
  })

  it('renders **bold** as <strong>', () => {
    expect(renderQuestionMarkdown('**hello**')).toContain('<strong>hello</strong>')
  })

  it('renders *italic* as <em>', () => {
    expect(renderQuestionMarkdown('*world*')).toContain('<em>world</em>')
  })

  it('renders `code` as <code>', () => {
    expect(renderQuestionMarkdown('`snippet`')).toContain('<code>snippet</code>')
  })

  it('converts newlines to <br>', () => {
    expect(renderQuestionMarkdown('line1\nline2')).toContain('<br>')
  })

  it('returns plain text unchanged (after escapeHtml passthrough)', () => {
    expect(renderQuestionMarkdown('plain text')).toBe('plain text')
  })
})

// ── populateQuestionsTab ──────────────────────────────────────────────────

describe('populateQuestionsTab', () => {
  beforeEach(buildContent)

  it('shows empty state when no analysis data', () => {
    stateManager.setTabData('analysis', null)
    populateQuestionsTab()
    expect(document.getElementById('document-content').innerHTML).toContain('No Questions Yet')
  })

  it('shows complete state when analysis exists but no questions', () => {
    stateManager.setTabData('analysis', {})
    window.postAnalysisQuestions = []
    populateQuestionsTab()
    expect(document.getElementById('document-content').innerHTML).toContain('Questions Complete')
  })

  it('renders questions panel when questions exist', () => {
    stateManager.setTabData('analysis', {})
    window.postAnalysisQuestions = [
      { type: 't1', question: 'Q1?', choices: [] },
    ]
    populateQuestionsTab()
    expect(document.getElementById('document-content').innerHTML).toContain('questions-panel')
  })
})

// ── renderQuestionsPanel ──────────────────────────────────────────────────

describe('renderQuestionsPanel', () => {
  beforeEach(buildContent)

  it('does nothing when postAnalysisQuestions is empty', () => {
    window.postAnalysisQuestions = []
    renderQuestionsPanel()
    expect(document.getElementById('document-content').innerHTML).toBe('')
  })

  it('renders one item per question', () => {
    window.postAnalysisQuestions = [
      { type: 't1', question: 'Q1?', choices: [] },
      { type: 't2', question: 'Q2?', choices: [] },
    ]
    renderQuestionsPanel()
    const items = document.querySelectorAll('.question-item')
    expect(items).toHaveLength(2)
  })

  it('renders chip buttons for each choice', () => {
    window.postAnalysisQuestions = [
      { type: 't1', question: 'Q1?', choices: ['A', 'B'] },
    ]
    renderQuestionsPanel()
    expect(document.querySelectorAll('.q-chip')).toHaveLength(2)
  })

  it('pre-fills textarea with saved answer', () => {
    window.postAnalysisQuestions = [{ type: 't1', question: 'Q?', choices: [] }]
    window.questionAnswers = { t1: 'My answer' }
    renderQuestionsPanel()
    expect(document.getElementById('q-input-0').value).toBe('My answer')
  })

  it('removes previous panel before re-rendering', () => {
    window.postAnalysisQuestions = [{ type: 't1', question: 'Q?', choices: [] }]
    renderQuestionsPanel()
    renderQuestionsPanel()
    expect(document.querySelectorAll('.questions-panel')).toHaveLength(1)
  })
})

// ── updateQProgress ───────────────────────────────────────────────────────

describe('updateQProgress', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="document-content"></div>
      <p id="q-progress"></p>
      <button id="q-submit-btn" disabled></button>`
    window.postAnalysisQuestions = [
      { type: 't1', question: 'Q1?', choices: [] },
      { type: 't2', question: 'Q2?', choices: [] },
    ]
  })

  it('updates progress text', () => {
    document.body.innerHTML += '<textarea id="q-input-0">answer</textarea><textarea id="q-input-1"></textarea>'
    updateQProgress()
    expect(document.getElementById('q-progress').textContent).toContain('1')
    expect(document.getElementById('q-progress').textContent).toContain('2')
  })

  it('enables submit button when all questions answered', () => {
    document.body.innerHTML += '<textarea id="q-input-0">a1</textarea><textarea id="q-input-1">a2</textarea>'
    updateQProgress()
    expect(document.getElementById('q-submit-btn').disabled).toBe(false)
  })

  it('keeps submit disabled when not all answered', () => {
    document.body.innerHTML += '<textarea id="q-input-0"></textarea><textarea id="q-input-1"></textarea>'
    updateQProgress()
    expect(document.getElementById('q-submit-btn').disabled).toBe(true)
  })
})

// ── selectQChip ───────────────────────────────────────────────────────────

describe('selectQChip', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="q-item-0">
        <button class="q-chip">Option A</button>
        <button class="q-chip selected">Option B</button>
        <textarea id="q-input-0"></textarea>
      </div>
      <p id="q-progress"></p>
      <button id="q-submit-btn" disabled></button>`
    window.postAnalysisQuestions = [{ type: 't1', question: 'Q?', choices: [] }]
  })

  it('deselects sibling chips and selects the clicked one', () => {
    const chips = document.querySelectorAll('.q-chip')
    selectQChip(chips[0], 0)
    expect(chips[0].classList.contains('selected')).toBe(true)
    expect(chips[1].classList.contains('selected')).toBe(false)
  })

  it('sets textarea value to chip text', () => {
    const chip = document.querySelector('.q-chip')
    selectQChip(chip, 0)
    expect(document.getElementById('q-input-0').value).toBe('Option A')
  })

  it('saves chip text to window.questionAnswers for the matching question type', () => {
    window.questionAnswers = {}
    const chip = document.querySelector('.q-chip')
    selectQChip(chip, 0)
    expect(window.questionAnswers['t1']).toBe('Option A')
  })

  it('updates window.questionAnswers so answers survive tab navigation', () => {
    window.questionAnswers = {}
    const chips = document.querySelectorAll('.q-chip')
    // Select first chip, then switch to second — final state should reflect last selection
    selectQChip(chips[0], 0)
    expect(window.questionAnswers['t1']).toBe('Option A')
    selectQChip(chips[1], 0)
    expect(window.questionAnswers['t1']).toBe('Option B')
  })
})

// ── onQInputChange ────────────────────────────────────────────────────────

describe('onQInputChange', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="q-item-0">
        <textarea id="q-input-0">Typed answer</textarea>
      </div>
      <p id="q-progress"></p>
      <button id="q-submit-btn" disabled></button>`
    window.postAnalysisQuestions = [{ type: 't1', question: 'Q?', choices: [] }]
    window.questionAnswers = {}
  })

  it('saves textarea value to window.questionAnswers for the matching question type', () => {
    onQInputChange(0)
    expect(window.questionAnswers['t1']).toBe('Typed answer')
  })

  it('updates the progress display', () => {
    onQInputChange(0)
    const progressEl = document.getElementById('q-progress')
    expect(progressEl.textContent).toContain('1')
  })

  it('does nothing when question index is out of range', () => {
    expect(() => onQInputChange(99)).not.toThrow()
    expect(window.questionAnswers).toEqual({})
  })
})

// ── showDraftError ────────────────────────────────────────────────────────

describe('showDraftError', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="q-item-0">
        <div class="q-answer-row"></div>
      </div>`
  })

  it('inserts an error element with the message', () => {
    showDraftError(0, 'Draft failed')
    expect(document.getElementById('q-draft-err-0').textContent).toContain('Draft failed')
  })

  it('removes error element when message is null', () => {
    showDraftError(0, 'Error first')
    showDraftError(0, null)
    expect(document.getElementById('q-draft-err-0')).toBeNull()
  })

  it('does not throw when item is absent', () => {
    expect(() => showDraftError(99, 'Error')).not.toThrow()
  })
})

// ── showNextQuestion (shim) ───────────────────────────────────────────────

describe('showNextQuestion', () => {
  it('calls renderQuestionsPanel (no throw even with empty state)', () => {
    buildContent()
    window.postAnalysisQuestions = []
    expect(() => showNextQuestion()).not.toThrow()
  })
})

// ── handleQuestionResponse ────────────────────────────────────────────────

describe('handleQuestionResponse', () => {
  beforeEach(buildContent)

  it('returns false when no questions exist', () => {
    window.postAnalysisQuestions = []
    expect(handleQuestionResponse('answer')).toBe(false)
  })

  it('returns false when not waiting for a question response', () => {
    window.postAnalysisQuestions = [{ type: 't1', question: 'Q?', choices: [] }]
    window.waitingForQuestionResponse = false
    expect(handleQuestionResponse('answer')).toBe(false)
  })

  it('records answer and returns true when waiting', () => {
    window.postAnalysisQuestions = [{ type: 't1', question: 'Q?', choices: [] }]
    window.waitingForQuestionResponse = true
    window.currentQuestionIndex = 0
    const result = handleQuestionResponse('My answer')
    expect(result).toBe(true)
    expect(window.questionAnswers.t1).toBe('My answer')
    expect(window.waitingForQuestionResponse).toBe(false)
    expect(window.currentQuestionIndex).toBe(1)
  })
})

// ── finishPostAnalysisQuestions ───────────────────────────────────────────

describe('finishPostAnalysisQuestions', () => {
  it('sets waitingForQuestionResponse to false and appends a message', () => {
    window.waitingForQuestionResponse = true
    finishPostAnalysisQuestions()
    expect(window.waitingForQuestionResponse).toBe(false)
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('Thank you'))
  })
})

// ── askPostAnalysisQuestions — object-argument regression ─────────────────
//
// Regression test: when analyzeJob passes an analysis *object* (not a string),
// askPostAnalysisQuestions must not throw and must render the questions panel.
// Previously, the function called cleanJsonResponse(object) which invoked
// .replace() on a non-string and threw a TypeError, causing the catch-all to
// suppress the panel and fall through to "Click Recommend Customizations".

describe('askPostAnalysisQuestions', () => {
  const analysisObj = { job_title: 'Engineer', company_name: 'Acme Corp' }
  const sampleQuestions = [{ type: 'clarification_1', question: 'Q1?', choices: [] }]

  beforeEach(() => {
    buildContent()
    window.questionAnswers = {}
    // Override cleanJsonResponse with a strict version that throws on non-strings,
    // matching real runtime behaviour and proving the fix is necessary.
    vi.stubGlobal('cleanJsonResponse', s => {
      if (typeof s !== 'string') throw new TypeError('cleanJsonResponse called with non-string')
      return s
    })
    vi.stubGlobal('mergePostAnalysisQuestions', vi.fn((_a, b) => (Array.isArray(b) ? b : [])))
    vi.stubGlobal('buildFallbackPostAnalysisQuestions', vi.fn(() => []))
    vi.stubGlobal('persistPostAnalysisState', vi.fn().mockResolvedValue(undefined))
    vi.stubGlobal('switchTab', vi.fn())
  })

  it('renders the questions panel when passed an analysis object with preferred questions', async () => {
    await askPostAnalysisQuestions(analysisObj, sampleQuestions)

    expect(globalThis.switchTab).toHaveBeenCalledWith('questions')
    expect(document.querySelector('.questions-panel')).not.toBeNull()
    // Must NOT have shown the error fallback message
    expect(globalThis.appendMessage).not.toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('Click "Recommend Customizations"'),
    )
  })

  it('calls sendAction when no questions can be found at all', async () => {
    vi.stubGlobal('mergePostAnalysisQuestions', vi.fn(() => []))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    await askPostAnalysisQuestions(analysisObj, null)

    expect(globalThis.sendAction).toHaveBeenCalledWith('recommend_customizations')
  })
})
