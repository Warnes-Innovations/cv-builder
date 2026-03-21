/**
 * tests/js/summary-review.test.js
 * Unit tests for web/summary-review.js — stored radios, key selection, save/submit.
 * (buildSummaryFocusSection / _callGenerateSummary require heavy DOM + fetch
 *  chains and are covered by integration tests.)
 */
import {
  _renderStoredSummaryRadios,
  _showAISummary,
  selectSummaryKey,
  saveSummaryFocusToBackend,
  submitSummaryFocusDecision,
  regenerateAISummary,
  useAISummary,
} from '../../web/summary-review.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  window.selectedSummaryKey = null
  window._aiGeneratedSummary = null

  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('showToast', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('setLoading', vi.fn())

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.selectedSummaryKey
  delete window._aiGeneratedSummary
})

// ── _renderStoredSummaryRadios ────────────────────────────────────────────

describe('_renderStoredSummaryRadios', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="summary-radios"></div>'
  })

  it('shows "no stored summaries" when only ai_generated key present', () => {
    _renderStoredSummaryRadios({ ai_generated: 'Some AI text' })
    expect(document.getElementById('summary-radios').textContent).toContain('No stored summaries')
  })

  it('renders a radio for each non-ai_generated key', () => {
    _renderStoredSummaryRadios({ default: 'Default text', focused: 'Focused text', ai_generated: 'AI' })
    const radios = document.querySelectorAll('input[type=radio]')
    expect(radios).toHaveLength(2)
  })

  it('marks the current key as checked', () => {
    window.selectedSummaryKey = 'focused'
    _renderStoredSummaryRadios({ default: 'Default', focused: 'Focused' })
    const checked = document.querySelector('input[type=radio][value="focused"]')
    expect(checked.checked).toBe(true)
  })

  it('truncates preview to 200 chars with ellipsis', () => {
    const longText = 'x'.repeat(250)
    _renderStoredSummaryRadios({ long_summary: longText })
    expect(document.getElementById('summary-radios').textContent).toContain('…')
  })

  it('does not add ellipsis for short text', () => {
    _renderStoredSummaryRadios({ short: 'Brief text' })
    expect(document.getElementById('summary-radios').textContent).not.toContain('…')
  })

  it('does nothing when container is absent', () => {
    document.body.innerHTML = ''
    expect(() => _renderStoredSummaryRadios({ key: 'text' })).not.toThrow()
  })
})

// ── _showAISummary ────────────────────────────────────────────────────────

describe('_showAISummary', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ai-summary-text"></div>
      <span id="ai-summary-status"></span>`
  })

  it('sets textContent of ai-summary-text', () => {
    _showAISummary('My generated summary', '')
    expect(document.getElementById('ai-summary-text').textContent).toBe('My generated summary')
  })

  it('sets textContent of ai-summary-status', () => {
    _showAISummary('text', '✓ generated')
    expect(document.getElementById('ai-summary-status').textContent).toBe('✓ generated')
  })

  it('stores text in window._aiGeneratedSummary', () => {
    _showAISummary('stored text', '')
    expect(window._aiGeneratedSummary).toBe('stored text')
  })

  it('does not throw when elements are absent', () => {
    document.body.innerHTML = ''
    expect(() => _showAISummary('text', 'label')).not.toThrow()
  })
})

// ── selectSummaryKey ──────────────────────────────────────────────────────

describe('selectSummaryKey', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="summary-radios">
        <label>
          <input type="radio" name="summary_key" value="default">Default
        </label>
        <label>
          <input type="radio" name="summary_key" value="focused">Focused
        </label>
      </div>`
  })

  it('sets selectedSummaryKey on window', () => {
    selectSummaryKey('focused')
    expect(window.selectedSummaryKey).toBe('focused')
  })

  it('applies highlight style to the selected label', () => {
    selectSummaryKey('focused')
    const labels = document.querySelectorAll('#summary-radios label')
    const focusedLabel = [...labels].find(l => l.querySelector('[value="focused"]'))
    expect(focusedLabel.style.borderColor).toContain('16, 185, 129')   // #10b981 → rgb
    expect(focusedLabel.style.background).toContain('240, 253, 244')   // #f0fdf4 → rgb
  })

  it('removes highlight from previously-selected label', () => {
    selectSummaryKey('default')
    selectSummaryKey('focused')
    const labels = document.querySelectorAll('#summary-radios label')
    const defaultLabel = [...labels].find(l => l.querySelector('[value="default"]'))
    expect(defaultLabel.style.borderColor).toContain('229, 231, 235')   // #e5e7eb → rgb
    expect(defaultLabel.style.background).toBe('')
  })
})

// ── saveSummaryFocusToBackend ─────────────────────────────────────────────

describe('saveSummaryFocusToBackend', () => {
  it('posts to /api/review-decisions with the key', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveSummaryFocusToBackend('ai_generated')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/review-decisions', expect.objectContaining({
      method: 'POST',
    }))
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.type).toBe('summary_focus')
    expect(body.decisions).toBe('ai_generated')
  })

  it('does not throw on network error (silent fail)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await expect(saveSummaryFocusToBackend('key')).resolves.toBeUndefined()
  })
})

// ── submitSummaryFocusDecision ────────────────────────────────────────────

describe('submitSummaryFocusDecision', () => {
  it('does nothing when selectedSummaryKey is not set', async () => {
    window.selectedSummaryKey = null
    await submitSummaryFocusDecision()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('saves to backend and shows toast', async () => {
    window.selectedSummaryKey = 'default'
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSummaryFocusDecision()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('default'))
  })

  it('switches to publications-review tab', async () => {
    window.selectedSummaryKey = 'focused'
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSummaryFocusDecision()
    expect(globalThis.switchTab).toHaveBeenCalledWith('publications-review')
  })

  it('replaces underscores in key for toast message', async () => {
    window.selectedSummaryKey = 'ai_generated'
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitSummaryFocusDecision()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('ai generated'))
  })
})

// ── useAISummary ──────────────────────────────────────────────────────────

describe('useAISummary', () => {
  it('sets selectedSummaryKey to ai_generated', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await useAISummary()
    expect(window.selectedSummaryKey).toBe('ai_generated')
  })

  it('shows confirmation toast', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await useAISummary()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('AI-generated'))
  })
})

// ── regenerateAISummary ───────────────────────────────────────────────────

describe('regenerateAISummary', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="ai-regenerate-btn"></button>
      <span id="ai-summary-status"></span>
      <div id="ai-summary-text"></div>`
    window._aiGeneratedSummary = 'Previous summary'
  })

  it('calls fetch /api/generate-summary', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, summary: 'New summary' })
    })
    await regenerateAISummary()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/generate-summary', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('passes refinement prompt from textarea', async () => {
    document.body.innerHTML += '<textarea id="summary-refinement-input">Make it shorter</textarea>'
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, summary: 'Shorter' })
    })
    await regenerateAISummary()
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.refinement_prompt).toBe('Make it shorter')
  })
})
