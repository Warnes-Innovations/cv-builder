// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/achievements-review.test.js
 * Unit tests for web/achievements-review.js — pure helpers, row-reorder,
 * field-edit, and submit decisions.
 * (buildAchievementsReviewTable / _renderAchievementsReviewTable / buildAchievementsEditor
 *  require complex DOM + fetch chains and are covered by integration tests.)
 */
import {
  fetchJsonWithTimeout,
  handleAchievementAction,
  bulkAchievementAction,
  submitAchievementDecisions,
  moveAchievementRow,
  updateAchievementText,
  moveAchievement,
  deleteAchievement,
  addAchievementRow,
  saveSuggestedAchievementField,
  moveSuggestedAchievementRow,
  deleteSuggestedAchievement,
  saveAchievementEditsAndContinue,
} from '../../web/achievements-review.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  window.achievementDecisions = {}
  window._achievementsOrdered = null
  window._suggestedAchsOrdered = null
  window._savedDecisions = null
  window.pendingRecommendations = null
  window.achievementEdits = {}

  vi.stubGlobal('showToast', vi.fn())
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  vi.stubGlobal('updateInclusionCounts', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('getAchievementRecommendation', vi.fn(() => 'Include'))
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('_renderAchievementsReviewTable', vi.fn())
  vi.stubGlobal('renderAchievementEditorRows', vi.fn())
  vi.stubGlobal('confirmDialog', vi.fn(async () => true))
  vi.stubGlobal('closeAlertModal', vi.fn())
  // CSS.escape may not be available or reliable in jsdom — always stub
  vi.stubGlobal('CSS', { escape: s => String(s) })

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.achievementDecisions
  delete window._achievementsOrdered
  delete window._suggestedAchsOrdered
  delete window._savedDecisions
  delete window.pendingRecommendations
  delete window.achievementEdits
})

// ── fetchJsonWithTimeout ──────────────────────────────────────────────────

describe('fetchJsonWithTimeout', () => {
  it('returns the fetch response on success', async () => {
    const mockResp = { ok: true, json: async () => ({}) }
    globalThis.fetch = vi.fn().mockResolvedValue(mockResp)
    const result = await fetchJsonWithTimeout('/api/test')
    expect(result).toBe(mockResp)
  })

  it('throws when fetch throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await expect(fetchJsonWithTimeout('/api/test')).rejects.toThrow('network')
  })
})

// ── handleAchievementAction ───────────────────────────────────────────────

describe('handleAchievementAction', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table><tbody>
        <tr data-ach-id="ach-1">
          <td><button class="icon-btn" data-action="include">✓</button></td>
          <td><button class="icon-btn" data-action="exclude">✗</button></td>
        </tr>
      </tbody></table>`
  })

  it('stores the action in achievementDecisions', () => {
    handleAchievementAction('ach-1', 'include')
    expect(window.achievementDecisions['ach-1']).toBe('include')
  })

  it('sets active class on the selected button', () => {
    handleAchievementAction('ach-1', 'include')
    const btn = document.querySelector('[data-action="include"]')
    expect(btn.classList.contains('active')).toBe(true)
  })

  it('removes active class from other buttons', () => {
    const excludeBtn = document.querySelector('[data-action="exclude"]')
    excludeBtn.classList.add('active')
    handleAchievementAction('ach-1', 'include')
    expect(excludeBtn.classList.contains('active')).toBe(false)
  })

  it('does not throw when row is absent', () => {
    expect(() => handleAchievementAction('missing-id', 'include')).not.toThrow()
  })
})

// ── bulkAchievementAction ─────────────────────────────────────────────────

describe('bulkAchievementAction', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table id="achievements-review-table">
        <tbody>
          <tr data-ach-id="ach-1"><td><button class="icon-btn" data-action="include">✓</button><button class="icon-btn" data-action="exclude">✗</button></td></tr>
          <tr data-ach-id="ach-2"><td><button class="icon-btn" data-action="include">✓</button><button class="icon-btn" data-action="exclude">✗</button></td></tr>
          <tr data-ach-id="ach-3" style="display:none;"><td></td></tr>
        </tbody>
      </table>`
    window.pendingRecommendations = {}
    window.achievementDecisions = { 'ach-1': 'include', 'ach-2': 'include', 'ach-3': 'include' }
  })

  it('sets all visible rows to the given action', () => {
    bulkAchievementAction('exclude')
    expect(window.achievementDecisions['ach-1']).toBe('exclude')
    expect(window.achievementDecisions['ach-2']).toBe('exclude')
  })

  it('skips hidden rows', () => {
    bulkAchievementAction('exclude')
    // ach-3 is display:none — should not be changed
    expect(window.achievementDecisions['ach-3']).toBe('include')
  })
})

// ── submitAchievementDecisions ────────────────────────────────────────────

describe('submitAchievementDecisions', () => {
  it('does nothing when achievementDecisions is empty', async () => {
    window.achievementDecisions = {}
    await submitAchievementDecisions()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('saves decisions and switches tab on success', async () => {
    window.achievementDecisions = { 'ach-1': 'include', 'ach-2': 'emphasize' }
    window._suggestedAchsOrdered = []
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitAchievementDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('2 items'))
    expect(globalThis.scheduleAtsRefresh).toHaveBeenCalled()
    expect(globalThis.switchTab).toHaveBeenCalledWith('summary-review')
  })

  it('stores decisions in _savedDecisions', async () => {
    window.achievementDecisions = { 'ach-1': 'include' }
    window._suggestedAchsOrdered = []
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitAchievementDecisions()
    expect(window._savedDecisions.achievement_decisions).toEqual({ 'ach-1': 'include' })
  })

  it('separates suggested decisions from master decisions', async () => {
    window.achievementDecisions = { 'ach-1': 'include', 'sugg::0': 'include' }
    window._suggestedAchsOrdered = [
      { _suggId: 'sugg::0', title: 'Test', description: 'Desc' }
    ]
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitAchievementDecisions()
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.decisions).not.toHaveProperty('sugg::0')
    expect(body.accepted_suggestions).toHaveLength(1)
  })

  it('shows error toast on API error', async () => {
    window.achievementDecisions = { 'ach-1': 'include' }
    window._suggestedAchsOrdered = []
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })
    await submitAchievementDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Server error'), 'error')
  })
})

// ── moveAchievementRow ────────────────────────────────────────────────────

describe('moveAchievementRow', () => {
  beforeEach(() => {
    window._achievementsOrdered = [
      { id: 'a1' }, { id: 'a2' }, { id: 'a3' }
    ]
  })

  it('does nothing when _achievementsOrdered is null', () => {
    window._achievementsOrdered = null
    expect(() => moveAchievementRow('a1', -1)).not.toThrow()
  })

  it('does nothing when achId is not found', () => {
    moveAchievementRow('unknown', 1)
    expect(window._achievementsOrdered.map(a => a.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('moves a row up', () => {
    moveAchievementRow('a2', -1)
    expect(window._achievementsOrdered.map(a => a.id)).toEqual(['a2', 'a1', 'a3'])
  })

  it('moves a row down', () => {
    moveAchievementRow('a2', 1)
    expect(window._achievementsOrdered.map(a => a.id)).toEqual(['a1', 'a3', 'a2'])
  })

  it('does not move beyond bounds', () => {
    moveAchievementRow('a1', -1)
    expect(window._achievementsOrdered.map(a => a.id)).toEqual(['a1', 'a2', 'a3'])
  })
})

// ── updateAchievementText ─────────────────────────────────────────────────

describe('updateAchievementText', () => {
  it('updates the stored text', () => {
    window.achievementEdits = { 0: ['old text', 'second'] }
    updateAchievementText(0, 0, 'new text')
    expect(window.achievementEdits[0][0]).toBe('new text')
  })

  it('does not throw for missing expIdx', () => {
    window.achievementEdits = {}
    expect(() => updateAchievementText(99, 0, 'value')).not.toThrow()
  })
})

// ── moveAchievement ───────────────────────────────────────────────────────

describe('moveAchievement', () => {
  beforeEach(() => {
    window.achievementEdits = { 0: ['a', 'b', 'c'] }
    document.body.innerHTML = `
      <textarea id="ach-text-0-0">a</textarea>
      <textarea id="ach-text-0-1">b</textarea>`
  })

  it('does nothing when achIdx out of bounds', () => {
    moveAchievement(0, 2, 1)
    expect(window.achievementEdits[0]).toEqual(['a', 'b', 'c'])
  })

  it('swaps adjacent items', () => {
    moveAchievement(0, 0, 1)
    expect(window.achievementEdits[0]).toEqual(['b', 'a', 'c'])
  })
})

// ── deleteAchievement ─────────────────────────────────────────────────────

describe('deleteAchievement', () => {
  it('removes the item at achIdx', () => {
    window.achievementEdits = { 0: ['a', 'b', 'c'] }
    deleteAchievement(0, 1)
    expect(window.achievementEdits[0]).toEqual(['a', 'c'])
  })

  it('does not throw for missing expIdx', () => {
    window.achievementEdits = {}
    expect(() => deleteAchievement(99, 0)).not.toThrow()
  })
})

// ── addAchievementRow ─────────────────────────────────────────────────────

describe('addAchievementRow', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ach-list-0"></div>'
    window.achievementEdits = { 0: ['a'] }
  })

  it('appends an empty string', () => {
    addAchievementRow(0)
    expect(window.achievementEdits[0]).toEqual(['a', ''])
  })

  it('initialises edits array if absent', () => {
    window.achievementEdits = {}
    addAchievementRow(0)
    expect(window.achievementEdits[0]).toEqual([''])
  })
})

// ── saveSuggestedAchievementField ─────────────────────────────────────────

describe('saveSuggestedAchievementField', () => {
  it('updates the field in _suggestedAchsOrdered', () => {
    window._suggestedAchsOrdered = [{ _suggId: 'sugg::0', title: 'Old', description: '' }]
    saveSuggestedAchievementField('sugg::0', 'title', 'New Title')
    expect(window._suggestedAchsOrdered[0].title).toBe('New Title')
  })

  it('does not throw when suggId is not found', () => {
    window._suggestedAchsOrdered = []
    expect(() => saveSuggestedAchievementField('missing', 'title', 'x')).not.toThrow()
  })
})

// ── moveSuggestedAchievementRow ───────────────────────────────────────────

describe('moveSuggestedAchievementRow', () => {
  beforeEach(() => {
    window._suggestedAchsOrdered = [
      { _suggId: 'sugg::0' }, { _suggId: 'sugg::1' }, { _suggId: 'sugg::2' }
    ]
  })

  it('does nothing when _suggestedAchsOrdered is null', () => {
    window._suggestedAchsOrdered = null
    expect(() => moveSuggestedAchievementRow('sugg::0', 1)).not.toThrow()
  })

  it('moves a suggestion down', () => {
    moveSuggestedAchievementRow('sugg::0', 1)
    expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::1', 'sugg::0', 'sugg::2'])
  })

  it('does not move beyond bounds', () => {
    moveSuggestedAchievementRow('sugg::2', 1)
    expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::0', 'sugg::1', 'sugg::2'])
  })
})

// ── deleteSuggestedAchievement ────────────────────────────────────────────

describe('deleteSuggestedAchievement', () => {
  beforeEach(() => {
    window._suggestedAchsOrdered = [
      { _suggId: 'sugg::0' }, { _suggId: 'sugg::1' }
    ]
    window.achievementDecisions = { 'sugg::0': 'include', 'sugg::1': 'exclude' }
  })

  it('removes the suggestion when confirmed', async () => {
    await deleteSuggestedAchievement('sugg::0')
    expect(window._suggestedAchsOrdered.map(s => s._suggId)).toEqual(['sugg::1'])
    expect(window.achievementDecisions).not.toHaveProperty('sugg::0')
  })

  it('does nothing when confirmation is declined', async () => {
    vi.stubGlobal('confirmDialog', vi.fn(async () => false))
    await deleteSuggestedAchievement('sugg::0')
    expect(window._suggestedAchsOrdered).toHaveLength(2)
  })
})

// ── saveAchievementEditsAndContinue ───────────────────────────────────────

describe('saveAchievementEditsAndContinue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.achievementEdits = { 0: ['bullet 1', 'bullet 2'] }
  })

  it('calls switchTab on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveAchievementEditsAndContinue()
    expect(globalThis.switchTab).toHaveBeenCalledWith('skills-review')
  })

  it('shows toast on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await saveAchievementEditsAndContinue()
    expect(globalThis.showToast).toHaveBeenCalledWith('Achievement edits saved.')
  })

  it('shows error toast on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Save failed' }),
    })
    await saveAchievementEditsAndContinue()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Save failed'), 'error')
  })

  it('shows error toast on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await saveAchievementEditsAndContinue()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error')
  })
})
