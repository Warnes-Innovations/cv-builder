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
