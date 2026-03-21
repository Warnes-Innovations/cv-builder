// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/screening-questions.test.js
 * Unit tests for web/screening-questions.js — format helpers, DOM interactions,
 * question parsing, state management, save (fetch mock).
 */
import {
  _screeningState,
  _fmtLabel,
  selectFormat,
  _getSelectedFormat,
  parseScreeningQuestions,
  togglePriorUse,
  updateExpSelection,
  saveScreeningResponses,
} from '../../web/screening-questions.js'

// ── Global stubs ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('showAlertModal', vi.fn())
  globalThis.fetch = vi.fn()

  // Reset _screeningState between tests
  Object.keys(_screeningState).forEach(k => delete _screeningState[k])
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// ── _fmtLabel ─────────────────────────────────────────────────────────────────

describe('_fmtLabel', () => {
  it('returns label for direct', () => {
    expect(_fmtLabel('direct')).toContain('Direct')
  })

  it('returns label for star', () => {
    expect(_fmtLabel('star')).toContain('STAR')
  })

  it('returns label for technical', () => {
    expect(_fmtLabel('technical')).toContain('Technical')
  })

  it('returns format string as fallback for unknown', () => {
    expect(_fmtLabel('unknown')).toBe('unknown')
  })
})

// ── selectFormat / _getSelectedFormat ────────────────────────────────────────

describe('selectFormat and _getSelectedFormat', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sc-fmt-0">
        <button class="sc-format-btn active" data-fmt="direct">Direct</button>
        <button class="sc-format-btn" data-fmt="star">STAR</button>
        <button class="sc-format-btn" data-fmt="technical">Technical</button>
      </div>`
  })

  it('_getSelectedFormat returns active button format', () => {
    expect(_getSelectedFormat(0)).toBe('direct')
  })

  it('selectFormat switches active class and updates state', () => {
    const starBtn = document.querySelector('[data-fmt="star"]')
    selectFormat(0, 'star', starBtn)
    expect(starBtn.classList.contains('active')).toBe(true)
    expect(document.querySelector('[data-fmt="direct"]').classList.contains('active')).toBe(false)
    expect(_screeningState[0].format).toBe('star')
  })

  it('_getSelectedFormat returns "direct" when no active button', () => {
    document.body.innerHTML = '<div id="sc-fmt-0"></div>'
    expect(_getSelectedFormat(0)).toBe('direct')
  })
})

// ── parseScreeningQuestions ───────────────────────────────────────────────────

describe('parseScreeningQuestions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="sc-input"></textarea>
      <div id="sc-questions-container"></div>
      <div class="sc-save-bar" id="sc-save-bar" style="display:none;"></div>`
    // Stub searchForQuestion to avoid fetch calls
    vi.stubGlobal('searchForQuestion', vi.fn())
    // Prevent actual DOM search calls
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) })
  })

  it('does nothing and shows alert when input empty', () => {
    document.getElementById('sc-input').value = ''
    parseScreeningQuestions()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('⚠️ No Input', expect.any(String))
  })

  it('splits on blank lines into multiple questions', () => {
    document.getElementById('sc-input').value = 'Question one\n\nQuestion two\n\nQuestion three'
    parseScreeningQuestions()
    const blocks = document.querySelectorAll('.sc-question-block')
    expect(blocks.length).toBe(3)
  })

  it('shows save bar when questions parsed', () => {
    document.getElementById('sc-input').value = 'What is your greatest strength?\n\nDescribe a challenge.'
    parseScreeningQuestions()
    expect(document.getElementById('sc-save-bar').style.display).not.toBe('none')
  })

  it('splits numbered list when single-block input', () => {
    document.getElementById('sc-input').value = '1. Question one\n2. Question two\n3. Question three'
    parseScreeningQuestions()
    // May fall through to newline splitting — just verify > 1 block
    const blocks = document.querySelectorAll('.sc-question-block')
    expect(blocks.length).toBeGreaterThan(1)
  })
})

// ── togglePriorUse ────────────────────────────────────────────────────────────

describe('togglePriorUse', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input type="checkbox" id="sc-use-prior-0" checked />'
  })

  it('sets usePrior true when checkbox checked', () => {
    togglePriorUse(0)
    expect(_screeningState[0].usePrior).toBe(true)
  })

  it('sets usePrior false when checkbox unchecked', () => {
    document.getElementById('sc-use-prior-0').checked = false
    togglePriorUse(0)
    expect(_screeningState[0].usePrior).toBe(false)
  })
})

// ── updateExpSelection ────────────────────────────────────────────────────────

describe('updateExpSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sc-block-0">
        <input type="checkbox" data-idx="2" checked />
        <input type="checkbox" data-idx="5" checked />
        <input type="checkbox" data-idx="8" />
      </div>`
  })

  it('collects checked experience indices into state', () => {
    updateExpSelection(0)
    expect(_screeningState[0].experienceIndices).toEqual([2, 5])
  })

  it('returns empty array when none checked', () => {
    document.querySelectorAll('input[data-idx]').forEach(cb => { cb.checked = false })
    updateExpSelection(0)
    expect(_screeningState[0].experienceIndices).toEqual([])
  })
})

// ── saveScreeningResponses ────────────────────────────────────────────────────

describe('saveScreeningResponses', () => {
  beforeEach(() => {
    // Simulate one generated question block
    document.body.innerHTML = `
      <button id="sc-save-btn">💾 Save All Responses</button>
      <div class="sc-question-block" id="sc-block-0">
        <div class="sc-question-header"><span class="sc-question-num">1</span><span>Describe your leadership style.</span></div>
        <div id="sc-fmt-0">
          <button class="sc-format-btn active" data-fmt="star">STAR</button>
        </div>
        <textarea id="sc-text-0">I lead by example…</textarea>
        <input id="sc-topic-0" type="text" value="leadership" />
      </div>`
    _screeningState[0] = { responseText: 'I lead by example…', format: 'star' }
  })

  it('posts to /api/screening/save', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, count: 1, filename: 'screening_2026.json' }),
    })
    await saveScreeningResponses()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/screening/save', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('shows success alert with count and filename', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, count: 1, filename: 'screening_2026.json' }),
    })
    await saveScreeningResponses()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('✅ Saved', expect.stringContaining('screening_2026.json'))
  })

  it('shows error on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: 'Disk error' }),
    })
    await saveScreeningResponses()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('❌ Save Failed', expect.stringContaining('Disk error'))
  })

  it('shows alert when no responses generated yet', async () => {
    document.body.innerHTML = `
      <button id="sc-save-btn">💾 Save All Responses</button>
      <div class="sc-question-block" id="sc-block-0">
        <div class="sc-question-header"><span>Q1</span><span>What drives you?</span></div>
        <div id="sc-fmt-0"><button class="sc-format-btn active" data-fmt="direct">Direct</button></div>
        <!-- no textarea — not yet generated -->
      </div>`
    await saveScreeningResponses()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('⚠️ Nothing to Save', expect.any(String))
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('restores button text after save', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, count: 1, filename: 'f.json' }),
    })
    await saveScreeningResponses()
    expect(document.getElementById('sc-save-btn').textContent).toBe('💾 Save All Responses')
  })
})
