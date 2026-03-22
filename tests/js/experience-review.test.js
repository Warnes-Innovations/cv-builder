// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/experience-review.test.js
 * Unit tests for web/experience-review.js — pure helpers and DOM logic.
 * (buildExperienceReviewTable / _renderExperienceTable require jQuery/DataTables
 *  and are covered by integration tests.)
 */
import {
  getExperienceDetails,
  moveExperienceRow,
  handleExperienceResponse,
  submitExperienceDecisions,
} from '../../web/experience-review.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  window.pendingRecommendations = null
  window._experiencesOrdered = null
  window._savedDecisions = null
  window.userSelections = { experiences: {}, skills: {} }
  window.waitingForExperienceResponse = false

  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('showAlertModal', vi.fn())
  vi.stubGlobal('showToast', vi.fn())
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  vi.stubGlobal('updateInclusionCounts', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('showNextExperience', vi.fn())
  vi.stubGlobal('_updatePageEstimate', vi.fn())
  vi.stubGlobal('$', vi.fn(() => ({ DataTable: vi.fn() })))

  // Mock fetch globally
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.pendingRecommendations
  delete window._experiencesOrdered
  delete window._savedDecisions
  delete window.userSelections
  delete window.waitingForExperienceResponse
})

// ── getExperienceDetails ──────────────────────────────────────────────────

describe('getExperienceDetails', () => {
  it('returns experience data on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ experience: { title: 'Engineer', company: 'Acme' } }),
    })
    const result = await getExperienceDetails('exp-1')
    expect(result).toEqual({ title: 'Engineer', company: 'Acme' })
  })

  it('returns null when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })
    const result = await getExperienceDetails('exp-1')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    const result = await getExperienceDetails('exp-1')
    expect(result).toBeNull()
  })
})

// ── moveExperienceRow ─────────────────────────────────────────────────────

describe('moveExperienceRow', () => {
  beforeEach(() => {
    window._experiencesOrdered = [
      { id: 'e1', details: {} },
      { id: 'e2', details: {} },
      { id: 'e3', details: {} },
    ]
    // Suppress the fire-and-forget fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    // Stub _renderExperienceTable (in same module — stub via globalThis)
    vi.stubGlobal('_renderExperienceTable', vi.fn())
    // Need $ stub for DataTable checks inside _renderExperienceTable
    const dtFn = vi.fn()
    dtFn.isDataTable = vi.fn(() => false)
    vi.stubGlobal('$', vi.fn(() => ({ DataTable: dtFn })))
  })

  it('does nothing when _experiencesOrdered is null', () => {
    window._experiencesOrdered = null
    expect(() => moveExperienceRow('e1', -1)).not.toThrow()
  })

  it('does nothing when expId is not found', () => {
    moveExperienceRow('unknown', 1)
    expect(window._experiencesOrdered.map(e => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('does nothing when move would go out of bounds (up from first)', () => {
    moveExperienceRow('e1', -1)
    expect(window._experiencesOrdered.map(e => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('does nothing when move would go out of bounds (down from last)', () => {
    moveExperienceRow('e3', 1)
    expect(window._experiencesOrdered.map(e => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('moves a row up when direction is -1', () => {
    moveExperienceRow('e2', -1)
    expect(window._experiencesOrdered.map(e => e.id)).toEqual(['e2', 'e1', 'e3'])
  })

  it('moves a row down when direction is +1', () => {
    moveExperienceRow('e2', 1)
    expect(window._experiencesOrdered.map(e => e.id)).toEqual(['e1', 'e3', 'e2'])
  })

  it('fires a backend reorder request', async () => {
    moveExperienceRow('e2', -1)
    // Fire-and-forget: fetch is called at least once for the reorder
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/reorder-rows', expect.objectContaining({
      method: 'POST',
    }))
  })
})

// ── handleExperienceResponse ──────────────────────────────────────────────

describe('handleExperienceResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets waitingForExperienceResponse to false', async () => {
    window.waitingForExperienceResponse = true
    handleExperienceResponse('yes')
    expect(window.waitingForExperienceResponse).toBe(false)
  })

  it('sends "include prominently" message for "yes"', () => {
    handleExperienceResponse('yes')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('prominently'))
  })

  it('sends "exclude" message for "no"', () => {
    handleExperienceResponse('no')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('exclude'))
  })

  it('sends "less emphasis" message for "maybe"', () => {
    handleExperienceResponse('maybe')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('emphasis'))
  })

  it('calls showNextExperience after 800ms timeout', () => {
    handleExperienceResponse('yes')
    vi.advanceTimersByTime(800)
    expect(globalThis.showNextExperience).toHaveBeenCalled()
  })
})

// ── submitExperienceDecisions ─────────────────────────────────────────────

describe('submitExperienceDecisions', () => {
  it('shows alert when no decisions', async () => {
    window.userSelections.experiences = {}
    await submitExperienceDecisions()
    expect(globalThis.showAlertModal).toHaveBeenCalledWith('No Selections', expect.any(String))
  })

  it('saves decisions and switches tab on success', async () => {
    window.userSelections.experiences = { e1: 'include', e2: 'emphasize' }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitExperienceDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('2 items'))
    expect(globalThis.scheduleAtsRefresh).toHaveBeenCalled()
    expect(globalThis.switchTab).toHaveBeenCalledWith('ach-editor')
  })

  it('stores decisions in _savedDecisions', async () => {
    window.userSelections.experiences = { e1: 'include' }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitExperienceDecisions()
    expect(window._savedDecisions.experience_decisions).toEqual({ e1: 'include' })
  })

  it('shows error toast when API returns non-ok', async () => {
    window.userSelections.experiences = { e1: 'include' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })
    await submitExperienceDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Server error'), 'error')
  })

  it('shows error toast on network failure', async () => {
    window.userSelections.experiences = { e1: 'include' }
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await submitExperienceDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error')
  })
})
