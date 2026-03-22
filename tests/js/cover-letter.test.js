// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/cover-letter.test.js
 * Unit tests for web/cover-letter.js — validation, company detection,
 * consistency report, save & generate (fetch mocks).
 */
import {
  COVER_LETTER_TONES,
  _validateCoverLetter,
  _getCompanyNameForCL,
  _renderConsistencyReport,
  saveCoverLetter,
  generateCoverLetter,
} from '../../web/cover-letter.js'

// ── Global stubs ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('showAlertModal', vi.fn())
  vi.stubGlobal('tabData', { cv: '', job: '' })
  vi.stubGlobal('pendingRecommendations', null)
  vi.stubGlobal('_lastAnalysisData', null)
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// ── COVER_LETTER_TONES ────────────────────────────────────────────────────────

describe('COVER_LETTER_TONES', () => {
  it('has at least 3 entries', () => {
    expect(COVER_LETTER_TONES.length).toBeGreaterThanOrEqual(3)
  })

  it('each entry has value and label', () => {
    for (const t of COVER_LETTER_TONES) {
      expect(t).toHaveProperty('value')
      expect(t).toHaveProperty('label')
    }
  })
})

// ── _getCompanyNameForCL ──────────────────────────────────────────────────────

describe('_getCompanyNameForCL', () => {
  it('returns company_name from _lastAnalysisData if present', () => {
    vi.stubGlobal('_lastAnalysisData', { company_name: 'Acme Corp' })
    expect(_getCompanyNameForCL()).toBe('Acme Corp')
  })

  it('falls back to .company if company_name absent', () => {
    vi.stubGlobal('_lastAnalysisData', { company: 'Beta Ltd' })
    expect(_getCompanyNameForCL()).toBe('Beta Ltd')
  })

  it('falls back to first line of tabData.job', () => {
    vi.stubGlobal('tabData', { job: 'Gamma Inc\nSoftware Engineer role' })
    expect(_getCompanyNameForCL()).toBe('Gamma Inc')
  })

  it('returns empty string when no data', () => {
    expect(_getCompanyNameForCL()).toBe('')
  })
})

// ── _validateCoverLetter ──────────────────────────────────────────────────────

function setupValidationDom() {
  document.body.innerHTML = `
    <div id="cl-validation-panel" style="display:none;">
      <div id="cl-checks-container"></div>
    </div>`
}

describe('_validateCoverLetter — opening check', () => {
  beforeEach(setupValidationDom)

  it('marks generic opener as fail', () => {
    _validateCoverLetter('Dear Hiring Manager,\n\nI am writing to apply.\n\nLook forward to hearing from you.')
    const container = document.getElementById('cl-checks-container')
    expect(container.innerHTML).toContain('Opening salutation')
    expect(container.innerHTML).toContain('fail')
  })

  it('passes a personalised opener', () => {
    const letter = 'Dear Dr. Smith,\n\nI am excited to apply for the role at Acme Corp.\n\nLook forward to an interview.'
    _validateCoverLetter(letter)
    const container = document.getElementById('cl-checks-container')
    const firstCheck = container.querySelector('.pass')
    expect(firstCheck).not.toBeNull()
  })
})

describe('_validateCoverLetter — word count', () => {
  beforeEach(setupValidationDom)

  it('flags too-short letter', () => {
    // ~30 words
    const short = 'Dear Dr. Smith,\n\nI want the job.\n\nPlease interview me.'
    _validateCoverLetter(short)
    const container = document.getElementById('cl-checks-container')
    expect(container.innerHTML).toContain('Word count')
    expect(container.innerHTML).toContain('too short')
  })

  it('passes letter within 250-400 words', () => {
    // build ~300-word letter (4 words/phrase × 65 copies = 260 body words + header/footer ≈ 269 total)
    const para = Array(65).fill('Experienced professional delivering results.').join(' ')
    const letter = `Dear Dr. Smith,\n\n${para}\n\nI look forward to an interview.`
    _validateCoverLetter(letter)
    const container = document.getElementById('cl-checks-container')
    expect(container.innerHTML).toContain('within target range')
  })
})

describe('_validateCoverLetter — call-to-action', () => {
  beforeEach(setupValidationDom)

  it('detects "look forward to" as CTA', () => {
    const para = Array(50).fill('Strong background in software engineering.').join(' ')
    const letter = `Dear Dr. Smith,\n\n${para}\n\nI look forward to discussing this role with you.`
    _validateCoverLetter(letter)
    const container = document.getElementById('cl-checks-container')
    expect(container.innerHTML).toContain('Call-to-action closing')
    expect(container.innerHTML).not.toContain('No call-to-action')
  })

  it('fails when no CTA pattern found', () => {
    const para = Array(50).fill('Strong background in software engineering.').join(' ')
    const letter = `Dear Dr. Smith,\n\n${para}\n\nThank you.`
    _validateCoverLetter(letter)
    const container = document.getElementById('cl-checks-container')
    expect(container.innerHTML).toContain('No call-to-action')
  })
})

describe('_validateCoverLetter — does nothing on empty text', () => {
  it('returns early without throwing', () => {
    document.body.innerHTML = `
      <div id="cl-validation-panel"><div id="cl-checks-container"></div></div>`
    expect(() => _validateCoverLetter('')).not.toThrow()
    expect(document.getElementById('cl-checks-container').innerHTML).toBe('')
  })
})

// ── _renderConsistencyReport ──────────────────────────────────────────────────

describe('_renderConsistencyReport', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="consistency-report"></div>'
  })

  it('clears panel when no company/title/keywords', () => {
    _renderConsistencyReport({ job_analysis: {} })
    expect(document.getElementById('consistency-report').innerHTML).toBe('')
  })

  it('renders company name check when company present', () => {
    vi.stubGlobal('tabData', { cv: '<p>Acme Corp is great</p>' })
    _renderConsistencyReport({ job_analysis: { company: 'Acme Corp' } })
    const html = document.getElementById('consistency-report').innerHTML
    expect(html).toContain('Company name')
    expect(html).toContain('Acme Corp')
  })

  it('renders job title check', () => {
    vi.stubGlobal('tabData', { cv: '<p>Senior Engineer role</p>' })
    _renderConsistencyReport({ job_analysis: { title: 'Senior Engineer' } })
    const html = document.getElementById('consistency-report').innerHTML
    expect(html).toContain('Job title')
  })

  it('renders ATS keywords check', () => {
    vi.stubGlobal('tabData', { cv: '<p>Python Django</p>' })
    _renderConsistencyReport({ job_analysis: { ats_keywords: ['Python', 'Django', 'Kubernetes'] } })
    const html = document.getElementById('consistency-report').innerHTML
    expect(html).toContain('ATS keywords')
  })

  it('renders date format check', () => {
    vi.stubGlobal('tabData', { cv: '<p>Jan 2020</p>' })
    _renderConsistencyReport({ job_analysis: { company: 'Acme' } })
    const html = document.getElementById('consistency-report').innerHTML
    expect(html).toContain('Date formats')
  })

  it('does nothing when panel element absent', () => {
    document.body.innerHTML = ''
    expect(() => _renderConsistencyReport({ job_analysis: { company: 'X' } })).not.toThrow()
  })
})

// ── saveCoverLetter ───────────────────────────────────────────────────────────

describe('saveCoverLetter', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="cl-letter-textarea">My amazing cover letter text here yes it is.</textarea>
      <button id="cl-save-btn">💾 Save Cover Letter</button>`
  })

  it('posts to /api/cover-letter/save', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, filename: 'cover_letter.txt' }),
    })
    await saveCoverLetter()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cover-letter/save', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('shows alert on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, filename: 'cover_letter.txt' }),
    })
    await saveCoverLetter()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('✅ Saved', expect.stringContaining('cover_letter.txt'))
  })

  it('shows error alert on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: 'Disk full' }),
    })
    await saveCoverLetter()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('❌ Save Failed', expect.stringContaining('Disk full'))
  })

  it('shows alert on empty textarea', async () => {
    document.getElementById('cl-letter-textarea').value = '   '
    await saveCoverLetter()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('⚠️ Empty Letter', expect.any(String))
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

// ── generateCoverLetter ───────────────────────────────────────────────────────

describe('generateCoverLetter', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="cl-generate-btn">✨ Generate Cover Letter</button>
      <select id="cl-tone-select"><option value="startup/tech">Startup</option></select>
      <input id="cl-hiring-manager" value="" />
      <textarea id="cl-company-address"></textarea>
      <input id="cl-highlight" value="" />
      <div id="cl-result-section" style="display:none;">
        <textarea id="cl-letter-textarea"></textarea>
        <div id="cl-validation-panel" style="display:none;">
          <div id="cl-checks-container"></div>
        </div>
      </div>`
  })

  it('posts to /api/cover-letter/generate', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, text: 'Dear Dr. Smith,\n...' }),
    })
    await generateCoverLetter()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cover-letter/generate', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('shows result section on success', async () => {
    const text = Array(60).fill('word').join(' ')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, text }),
    })
    await generateCoverLetter()
    expect(document.getElementById('cl-result-section').style.display).toBe('block')
  })

  it('shows alert on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: false, error: 'LLM timeout' }),
    })
    await generateCoverLetter()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('❌ Generation Failed', expect.stringContaining('LLM timeout'))
  })

  it('restores button text after call', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, text: 'Hello world' }),
    })
    await generateCoverLetter()
    expect(document.getElementById('cl-generate-btn').textContent).toBe('✨ Generate Cover Letter')
  })
})
