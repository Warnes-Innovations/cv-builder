// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/job-input.test.js
 * Unit tests for web/job-input.js — field-error helpers, validation, file selection.
 * (showLoadJobPanel / populateJobTab are orchestration-heavy and covered by
 *  integration tests.)
 */
import {
  _showFieldError,
  _clearFieldError,
  PASTE_MIN_CHARS,
  _updatePasteCharCount,
  _validatePasteField,
  _validateURLField,
  clearJobInput,
  clearURLInput,
  handleFileSelected,
  clearSelectedFile,
  showIntakeConfirmation,
  confirmIntakeAndAnalyze,
  skipIntakeConfirmation,
} from '../../web/job-input.js'

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildPasteMethod() {
  document.body.innerHTML = `
    <textarea id="job-text-input"></textarea>
    <div id="paste-char-count"></div>
    <span id="paste-error" class="field-error"></span>`
}

function buildUrlMethod() {
  document.body.innerHTML = `
    <input id="job-url-input" type="url" value="">
    <span id="url-error" class="field-error"></span>`
}

function buildFileMethod() {
  document.body.innerHTML = `
    <input type="file" id="job-file-input" value="">
    <div id="file-selected-info" style="display:none"></div>
    <span id="file-selected-name"></span>
    <span id="file-selected-size"></span>
    <button id="file-upload-btn" style="display:none"></button>
    <div id="file-upload-error" style="display:none"></div>
    <div id="file-size-warning" style="display:none"></div>`
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── _showFieldError / _clearFieldError ────────────────────────────────────

describe('_showFieldError', () => {
  beforeEach(buildPasteMethod)

  it('sets error text and adds visible class to span', () => {
    _showFieldError('job-text-input', 'paste-error', 'Too short')
    const span = document.getElementById('paste-error')
    expect(span.textContent).toBe('Too short')
    expect(span.classList.contains('visible')).toBe(true)
  })

  it('marks input as invalid', () => {
    _showFieldError('job-text-input', 'paste-error', 'Error')
    const inp = document.getElementById('job-text-input')
    expect(inp.classList.contains('field-invalid')).toBe(true)
    expect(inp.getAttribute('aria-invalid')).toBe('true')
  })

  it('does not throw when elements are absent', () => {
    expect(() => _showFieldError('missing-input', 'missing-error', 'Oops')).not.toThrow()
  })
})

describe('_clearFieldError', () => {
  beforeEach(buildPasteMethod)

  it('clears text and removes visible class', () => {
    const span = document.getElementById('paste-error')
    span.textContent = 'Existing error'
    span.classList.add('visible')
    _clearFieldError('job-text-input', 'paste-error')
    expect(span.textContent).toBe('')
    expect(span.classList.contains('visible')).toBe(false)
  })

  it('marks input as valid', () => {
    const inp = document.getElementById('job-text-input')
    inp.classList.add('field-invalid')
    inp.setAttribute('aria-invalid', 'true')
    _clearFieldError('job-text-input', 'paste-error')
    expect(inp.classList.contains('field-invalid')).toBe(false)
    expect(inp.getAttribute('aria-invalid')).toBe('false')
  })
})

// ── PASTE_MIN_CHARS ───────────────────────────────────────────────────────

describe('PASTE_MIN_CHARS', () => {
  it('is a positive integer', () => {
    expect(typeof PASTE_MIN_CHARS).toBe('number')
    expect(PASTE_MIN_CHARS).toBeGreaterThan(0)
  })
})

// ── _updatePasteCharCount ─────────────────────────────────────────────────

describe('_updatePasteCharCount', () => {
  beforeEach(buildPasteMethod)

  it('clears count when input is empty', () => {
    document.getElementById('job-text-input').value = ''
    _updatePasteCharCount()
    expect(document.getElementById('paste-char-count').textContent).toBe('')
  })

  it('shows red count when below minimum', () => {
    document.getElementById('job-text-input').value = 'short'
    _updatePasteCharCount()
    const el = document.getElementById('paste-char-count')
    // jsdom normalizes hex to rgb(); check it's a red-family color and has text
    expect(el.style.color).toContain('239')   // R channel of #ef4444
    expect(el.textContent).toContain('5')
  })

  it('shows green count when at or above minimum', () => {
    document.getElementById('job-text-input').value = 'x'.repeat(PASTE_MIN_CHARS)
    _updatePasteCharCount()
    // jsdom normalizes #16a34a → rgb(22, 163, 74)
    expect(document.getElementById('paste-char-count').style.color).toContain('163')
  })

  it('does not throw when count element is absent', () => {
    document.body.innerHTML = '<textarea id="job-text-input">hello</textarea>'
    expect(() => _updatePasteCharCount()).not.toThrow()
  })
})

// ── _validatePasteField ───────────────────────────────────────────────────

describe('_validatePasteField', () => {
  beforeEach(buildPasteMethod)

  it('shows error when text is non-empty but below minimum', () => {
    document.getElementById('job-text-input').value = 'hi'
    _validatePasteField()
    expect(document.getElementById('paste-error').classList.contains('visible')).toBe(true)
  })

  it('clears error when text is at or above minimum', () => {
    const inp = document.getElementById('job-text-input')
    inp.value = 'x'.repeat(PASTE_MIN_CHARS)
    document.getElementById('paste-error').classList.add('visible')
    _validatePasteField()
    expect(document.getElementById('paste-error').classList.contains('visible')).toBe(false)
  })

  it('clears error when input is empty', () => {
    document.getElementById('job-text-input').value = ''
    _validatePasteField()
    expect(document.getElementById('paste-error').classList.contains('visible')).toBe(false)
  })
})

// ── _validateURLField ─────────────────────────────────────────────────────

describe('_validateURLField', () => {
  beforeEach(buildUrlMethod)

  it('does nothing when field is empty', () => {
    _validateURLField()
    expect(document.getElementById('url-error').classList.contains('visible')).toBe(false)
  })

  it('shows error for a non-URL string', () => {
    document.getElementById('job-url-input').value = 'not a url'
    _validateURLField()
    expect(document.getElementById('url-error').classList.contains('visible')).toBe(true)
  })

  it('clears error for a valid https URL', () => {
    document.getElementById('job-url-input').value = 'https://example.com/job'
    document.getElementById('url-error').classList.add('visible')
    _validateURLField()
    expect(document.getElementById('url-error').classList.contains('visible')).toBe(false)
  })

  it('shows error for a non-http/https protocol', () => {
    document.getElementById('job-url-input').value = 'ftp://files.example.com/job'
    _validateURLField()
    expect(document.getElementById('url-error').classList.contains('visible')).toBe(true)
  })
})

// ── clearJobInput / clearURLInput ─────────────────────────────────────────

describe('clearJobInput', () => {
  it('clears the job text input', () => {
    document.body.innerHTML = '<textarea id="job-text-input">some text</textarea>'
    clearJobInput()
    expect(document.getElementById('job-text-input').value).toBe('')
  })

  it('does not throw when element is absent', () => {
    document.body.innerHTML = ''
    expect(() => clearJobInput()).not.toThrow()
  })
})

describe('clearURLInput', () => {
  it('clears the URL input', () => {
    document.body.innerHTML = '<input id="job-url-input" value="https://example.com">'
    clearURLInput()
    expect(document.getElementById('job-url-input').value).toBe('')
  })
})

// ── handleFileSelected ────────────────────────────────────────────────────

describe('handleFileSelected', () => {
  beforeEach(buildFileMethod)

  it('does nothing for null', () => {
    handleFileSelected(null)
    expect(document.getElementById('file-selected-info').style.display).toBe('none')
  })

  it('shows error for unsupported file type', () => {
    const file = new File(['data'], 'script.exe', { type: 'application/octet-stream' })
    handleFileSelected(file)
    expect(document.getElementById('file-upload-error').style.display).toBe('block')
    expect(document.getElementById('file-upload-btn').style.display).toBe('none')
  })

  it('shows selected info for a valid text file', () => {
    const file = new File(['job text content'], 'job.txt', { type: 'text/plain' })
    handleFileSelected(file)
    expect(document.getElementById('file-selected-info').style.display).toBe('block')
    expect(document.getElementById('file-selected-name').textContent).toBe('job.txt')
    expect(document.getElementById('file-upload-btn').style.display).toBe('inline-block')
  })
})

// ── clearSelectedFile ─────────────────────────────────────────────────────

describe('clearSelectedFile', () => {
  beforeEach(buildFileMethod)

  it('hides file info elements and clears error', () => {
    document.getElementById('file-selected-info').style.display = 'block'
    document.getElementById('file-upload-btn').style.display = 'inline-block'
    document.getElementById('file-upload-error').style.display = 'block'
    clearSelectedFile()
    expect(document.getElementById('file-selected-info').style.display).toBe('none')
    expect(document.getElementById('file-upload-btn').style.display).toBe('none')
    expect(document.getElementById('file-upload-error').style.display).toBe('none')
  })
})

// ── showIntakeConfirmation ────────────────────────────────────────────────

describe('showIntakeConfirmation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
    vi.stubGlobal('escapeHtml', s => String(s ?? ''))
    vi.stubGlobal('analyzeJob', vi.fn().mockResolvedValue(undefined))
    vi.stubGlobal('setLoading', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders role/company/date fields from extracted metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
      if (url.includes('intake-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ role: 'Data Scientist', company: 'Acme', date_applied: '2026-03-27' }) })
      }
      // prior-clarifications
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ found: false, matches: [] }) })
    }))

    await showIntakeConfirmation()

    expect(document.getElementById('intake-role').value).toBe('Data Scientist')
    expect(document.getElementById('intake-company').value).toBe('Acme')
    expect(document.getElementById('intake-date').value).toBe('2026-03-27')
  })

  it('shows prior-session note when a match is found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
      if (url.includes('intake-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ role: 'Engineer', company: 'Corp', date_applied: '2026-03-27' }) })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ found: true, matches: [{ role: 'Engineer', position_name: 'Engineer at Corp', answers: { q1: 'a1' } }] }),
      })
    }))

    await showIntakeConfirmation()

    const content = document.getElementById('document-content').innerHTML
    expect(content).toContain('Prior session found')
  })

  it('omits prior-session note when no matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
      if (url.includes('intake-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ role: 'PM', company: 'Co', date_applied: '2026-03-27' }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ found: false, matches: [] }) })
    }))

    await showIntakeConfirmation()

    expect(document.getElementById('document-content').innerHTML).not.toContain('Prior session found')
  })

  it('falls back to analyzeJob() when document-content is absent', async () => {
    document.body.innerHTML = ''
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ role: null, company: null, date_applied: null }) }))

    await showIntakeConfirmation()

    expect(window.analyzeJob).toHaveBeenCalledOnce()
  })

  it('renders the Confirm and Skip buttons', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ role: 'Dev', company: 'Co', date_applied: '2026-03-27', found: false, matches: [] }) })
    ))

    await showIntakeConfirmation()

    const content = document.getElementById('document-content').innerHTML
    expect(content).toContain('intake-confirm-btn')
    expect(content).toContain('Skip')
  })
})

// ── confirmIntakeAndAnalyze ───────────────────────────────────────────────

describe('confirmIntakeAndAnalyze', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="intake-confirm-btn">Confirm</button>
      <input id="intake-role" value="Data Scientist">
      <input id="intake-company" value="Acme">
      <input id="intake-date" value="2026-03-27">`
    vi.stubGlobal('analyzeJob', vi.fn().mockResolvedValue(undefined))
    vi.stubGlobal('setLoading', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts confirm-intake and then calls analyzeJob', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }))

    await confirmIntakeAndAnalyze()

    const calls = window.fetch.mock.calls
    const confirmCall = calls.find(([url]) => url.includes('confirm-intake'))
    expect(confirmCall).toBeDefined()
    const body = JSON.parse(confirmCall[1].body)
    expect(body.role).toBe('Data Scientist')
    expect(body.company).toBe('Acme')
    expect(body.date_applied).toBe('2026-03-27')
    expect(window.analyzeJob).toHaveBeenCalledOnce()
  })

  it('disables the confirm button immediately', async () => {
    const btn = document.getElementById('intake-confirm-btn')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }))

    confirmIntakeAndAnalyze()  // do not await — check synchronously

    expect(btn.disabled).toBe(true)
  })

  it('still calls analyzeJob even when confirm-intake request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    await confirmIntakeAndAnalyze()

    expect(window.analyzeJob).toHaveBeenCalledOnce()
  })
})

// ── skipIntakeConfirmation ────────────────────────────────────────────────

describe('skipIntakeConfirmation', () => {
  beforeEach(() => {
    vi.stubGlobal('analyzeJob', vi.fn().mockResolvedValue(undefined))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls analyzeJob directly without any fetch', async () => {
    vi.stubGlobal('fetch', vi.fn())

    await skipIntakeConfirmation()

    expect(window.analyzeJob).toHaveBeenCalledOnce()
    expect(window.fetch).not.toHaveBeenCalled()
  })
})
