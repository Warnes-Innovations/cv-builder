// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/spell-check.test.js
 * Unit tests for web/spell-check.js — stats summary, dismiss, add-word, submit.
 * (populateSpellCheckTab / renderSpellSuggestions require complex DOM + fetch
 *  chains and are covered by integration tests.)
 */
import {
  populateSpellCheckTab,
  renderSpellCheckZeroState,
  submitEmptySpellCheck,
  buildSpellStatsSummary,
  dismissSpellSuggestion,
  addSpellWord,
  submitSpellCheckDecisions,
} from '../../web/spell-check.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  window._spellSugMap = {}

  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('appendLoadingMessage', vi.fn(() => 'msg-id'))
  vi.stubGlobal('removeLoadingMessage', vi.fn())
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('showAlertModal', vi.fn())
  vi.stubGlobal('showConfirmModal', vi.fn(async () => true))
  vi.stubGlobal('setLoading', vi.fn())
  vi.stubGlobal('fetchStatus', vi.fn(async () => {}))
  vi.stubGlobal('sendAction', vi.fn(async () => {}))
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  vi.stubGlobal('CSS', { escape: s => String(s) })

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window._spellSugMap
  document.body.innerHTML = ''
})

// ── buildSpellStatsSummary ────────────────────────────────────────────────

describe('buildSpellStatsSummary', () => {
  it('returns a joined string of stats', () => {
    const result = buildSpellStatsSummary({
      total_sections: 5, total_words: 1200, unique_words: 400,
      custom_dict_words: 10, incorrect_words: 2, grammar_issues: 1,
    })
    expect(result).toContain('5 sections checked')
    expect(result).toContain('1,200 words')
    expect(result).toContain('400 unique')
    expect(result).toContain('10 custom dictionary matches')
    expect(result).toContain('2 unknown/incorrect')
    expect(result).toContain('1 grammar issue')
  })

  it('handles empty stats object', () => {
    const result = buildSpellStatsSummary({})
    expect(result).toContain('0 sections checked')
    expect(result).toContain('0 words')
  })

  it('uses singular for 1 section', () => {
    const result = buildSpellStatsSummary({ total_sections: 1 })
    expect(result).toContain('1 section checked')
    expect(result).not.toContain('1 sections')
  })

  it('uses singular for 1 grammar issue', () => {
    const result = buildSpellStatsSummary({ grammar_issues: 1 })
    expect(result).toContain('1 grammar issue')
    expect(result).not.toContain('1 grammar issues')
  })

  it('uses singular for 1 custom dictionary match', () => {
    const result = buildSpellStatsSummary({ custom_dict_words: 1 })
    expect(result).toContain('1 custom dictionary match')
    expect(result).not.toContain('1 custom dictionary matches')
  })
})

// ── dismissSpellSuggestion ────────────────────────────────────────────────

describe('dismissSpellSuggestion', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sug_intro_0" style="opacity:1;"></div>'
    window._spellSugMap['intro_0'] = {
      outcome: 'pending', final: 'teh', original: 'teh',
    }
  })

  it('sets outcome to reject', () => {
    dismissSpellSuggestion('sug_intro_0', 'intro', 0, 'teh')
    expect(window._spellSugMap['intro_0'].outcome).toBe('reject')
  })

  it('sets final to the supplied word', () => {
    dismissSpellSuggestion('sug_intro_0', 'intro', 0, 'teh')
    expect(window._spellSugMap['intro_0'].final).toBe('teh')
  })

  it('sets element opacity to 0.4', () => {
    dismissSpellSuggestion('sug_intro_0', 'intro', 0, 'teh')
    expect(document.getElementById('sug_intro_0').style.opacity).toBe('0.4')
  })

  it('does not throw when entry is absent', () => {
    expect(() => dismissSpellSuggestion('sug_intro_0', 'intro', 99, 'word')).not.toThrow()
  })

  it('does not throw when DOM element is absent', () => {
    window._spellSugMap['intro_0'] = { outcome: 'pending', final: 'teh' }
    document.body.innerHTML = ''
    expect(() => dismissSpellSuggestion('missing-id', 'intro', 0, 'word')).not.toThrow()
  })
})

// ── addSpellWord ──────────────────────────────────────────────────────────

describe('addSpellWord', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sug_intro_0"></div>'
    window._spellSugMap['intro_0'] = {
      outcome: 'pending', final: 'teh', original: 'teh',
    }
  })

  it('posts to /api/custom-dictionary', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) })
    await addSpellWord('teh', 'sug_intro_0')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/custom-dictionary', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('sets outcome to add_dict on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) })
    await addSpellWord('teh', 'sug_intro_0')
    expect(window._spellSugMap['intro_0'].outcome).toBe('add_dict')
  })

  it('sets element opacity to 0.4 on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) })
    await addSpellWord('teh', 'sug_intro_0')
    expect(document.getElementById('sug_intro_0').style.opacity).toBe('0.4')
  })

  it('appends confirmation text to element', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) })
    await addSpellWord('teh', 'sug_intro_0')
    expect(document.getElementById('sug_intro_0').textContent).toContain('added to dictionary')
  })

  it('does not modify entry when API returns ok:false', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: false }) })
    await addSpellWord('teh', 'sug_intro_0')
    expect(window._spellSugMap['intro_0'].outcome).toBe('pending')
  })

  it('does not throw on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await expect(addSpellWord('teh', 'sug_intro_0')).resolves.toBeUndefined()
  })
})

// ── submitSpellCheckDecisions ─────────────────────────────────────────────

describe('submitSpellCheckDecisions', () => {
  it('calls fetch /api/spell-check-complete', async () => {
    window._spellSugMap = {}   // no pending items
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true }),
    })
    await submitSpellCheckDecisions()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/spell-check-complete', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('calls sendAction generate_cv on success', async () => {
    window._spellSugMap = {}
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true }),
    })
    await submitSpellCheckDecisions()
    expect(globalThis.sendAction).toHaveBeenCalledWith('generate_cv')
  })

  it('shows alert on API error', async () => {
    window._spellSugMap = {}
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ error: 'Save failed' }),
    })
    await submitSpellCheckDecisions()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Save failed'))
  })

  it('shows alert on network failure', async () => {
    window._spellSugMap = {}
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await submitSpellCheckDecisions()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('network'))
  })

  it('prompts confirmation when there are pending items', async () => {
    window._spellSugMap = {
      'intro_0': { outcome: 'pending', final: 'teh' },
    }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true }),
    })
    await submitSpellCheckDecisions()
    expect(globalThis.showConfirmModal).toHaveBeenCalled()
  })

  it('aborts when confirmation is declined', async () => {
    window._spellSugMap = {
      'intro_0': { outcome: 'pending', final: 'teh' },
    }
    vi.stubGlobal('showConfirmModal', vi.fn(async () => false))
    await submitSpellCheckDecisions()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('auto-ignores pending items after confirmation', async () => {
    window._spellSugMap = {
      'intro_0': { outcome: 'pending', final: 'teh' },
    }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true }),
    })
    await submitSpellCheckDecisions()
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    const ignoredItem = body.spell_audit.find(e => e.final === 'teh')
    expect(ignoredItem.outcome).toBe('ignore')
  })
})

describe('renderSpellCheckZeroState', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
  })

  it('renders an explicit continue button instead of auto-generating', () => {
    renderSpellCheckZeroState('Spell check passed — no issues found.')

    expect(document.getElementById('document-content').textContent).toContain('Continue to Generate CV')
    expect(globalThis.sendAction).not.toHaveBeenCalled()
  })
})

describe('submitEmptySpellCheck', () => {
  it('persists an empty audit and then generates', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    await submitEmptySpellCheck()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/spell-check-complete', expect.objectContaining({
      method: 'POST',
    }))
    expect(globalThis.sendAction).toHaveBeenCalledWith('generate_cv')
  })
})

describe('populateSpellCheckTab', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
  })

  it('renders a zero-state review panel when there are no sections', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, sections: [] }),
    })

    await populateSpellCheckTab()

    expect(globalThis.sendAction).not.toHaveBeenCalled()
    expect(document.getElementById('document-content').textContent).toContain('No CV sections are available to check.')
    expect(document.getElementById('document-content').textContent).toContain('Continue to Generate CV')
  })

  it('renders a zero-state review panel when checks find no issues', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sections: [{ id: 'summary', label: 'Summary', text: 'Clean text', context: 'summary' }],
          aggregate_stats: { word_count: 2, unique_words: 2, custom_dict_words: 0 },
          custom_dict_size: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, suggestions: [], stats: { unknown_word_count: 0, grammar_issue_count: 0 } }),
      })

    await populateSpellCheckTab()

    expect(globalThis.sendAction).not.toHaveBeenCalled()
    expect(document.getElementById('document-content').textContent).toContain('Spell check passed — no issues found.')
    expect(document.getElementById('document-content').textContent).toContain('Continue to Generate CV')
  })
})
