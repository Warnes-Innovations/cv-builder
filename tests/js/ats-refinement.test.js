// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/ats-refinement.test.js
 * Unit tests for web/ats-refinement.js
 */
import { updateAtsBadge, refreshAtsScore, scheduleAtsRefresh } from '../../web/ats-refinement.js'

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildAtsBadge() {
  document.body.innerHTML = `
    <div id="ats-score-header" style="display:none">
      <div id="ats-score-badge" style="display:none">
        <span id="ats-score-value"></span>
      </div>
      <div id="ats-score-summary" style="display:none">
        <div id="ats-score-summary-line"></div>
        <div id="ats-score-summary-detail"></div>
      </div>
    </div>`
}

const mockStateManager = {
  getSessionId: vi.fn(),
  setAtsScore: vi.fn(),
  getAtsScore: vi.fn(),
  getGenerationState: vi.fn(),
  getTabData: vi.fn(),
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
  vi.stubGlobal('stateManager', mockStateManager)
  vi.stubGlobal('fetch', vi.fn())
  mockStateManager.getSessionId.mockReturnValue('sess-123')
  mockStateManager.setAtsScore.mockReset()
  mockStateManager.getAtsScore.mockReset()
  mockStateManager.getAtsScore.mockReturnValue(null)
  mockStateManager.getGenerationState.mockReset()
  mockStateManager.getGenerationState.mockReturnValue({
    pageCountEstimate: null,
    pageCountExact: null,
  })
  mockStateManager.getTabData.mockReset()
  mockStateManager.getTabData.mockReturnValue({})
  window._statusIntake = {}
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ── updateAtsBadge ────────────────────────────────────────────────────────

describe('updateAtsBadge', () => {
  beforeEach(buildAtsBadge)

  it('hides badge when score is null', () => {
    updateAtsBadge(null)
    expect(document.getElementById('ats-score-badge').style.display).toBe('none')
    expect(document.getElementById('ats-score-header').style.display).toBe('none')
  })

  it('hides badge when overall is not a number', () => {
    updateAtsBadge({ overall: 'N/A' })
    expect(document.getElementById('ats-score-badge').style.display).toBe('none')
  })

  it('shows badge and sets percentage text', () => {
    updateAtsBadge({ overall: 82, basis: 'review_checkpoint' })
    expect(document.getElementById('ats-score-badge').style.display).toBe('flex')
    expect(document.getElementById('ats-score-header').style.display).toBe('flex')
    expect(document.getElementById('ats-score-value').textContent).toBe('82%')
  })

  it('renders hard soft and bonus keyword summary when keyword status is present', () => {
    updateAtsBadge({
      overall: 82,
      keyword_status: [
        { keyword: 'Python', type: 'hard', status: 'matched', match_type: 'exact' },
        { keyword: 'SQL', type: 'hard', status: 'missing' },
        { keyword: 'Leadership', type: 'soft', status: 'partial', match_type: 'partial' },
        { keyword: 'Genomics', type: 'bonus', status: 'matched', match_type: 'exact' },
      ],
    })

    expect(document.getElementById('ats-score-summary').style.display).toBe('flex')
    expect(document.getElementById('ats-score-summary-line').textContent)
      .toBe('Hard 1/2 • Soft 1/1 • Bonus 1/1')
    expect(document.getElementById('ats-score-summary-detail').textContent)
      .toBe('Missing hard: SQL')
  })

  it('falls back to top sections when there are no missing hard keywords', () => {
    updateAtsBadge({
      overall: 82,
      section_scores: { skills: 80, experience: 55, summary: 25 },
      keyword_status: [
        { keyword: 'Python', type: 'hard', status: 'matched', match_type: 'exact' },
        { keyword: 'Leadership', type: 'soft', status: 'partial', match_type: 'partial' },
      ],
    })

    expect(document.getElementById('ats-score-summary-detail').textContent)
      .toBe('Top sections: skills 80% • experience 55%')
  })

  it('shows page length estimate and job details in the summary row', () => {
    mockStateManager.getGenerationState.mockReturnValue({ pageCountEstimate: 2.3 })
    window._statusIntake = {
      role: 'Senior R Package Developer',
      company: 'Genentech',
      date_applied: '2026-03-31',
    }

    updateAtsBadge({
      overall: 82,
      keyword_status: [
        { keyword: 'Python', type: 'hard', status: 'matched', match_type: 'exact' },
        { keyword: 'SQL', type: 'hard', status: 'missing' },
      ],
    })

    expect(document.getElementById('ats-score-summary-line').textContent)
      .toBe('Hard 1/2 • Length 2.3 pages est')
    expect(document.getElementById('ats-score-summary-detail').textContent)
      .toBe('Senior R Package Developer @ Genentech (03/31/2026) • Missing hard: SQL')
  })

  it('refreshes summary context when generation state changes', () => {
    mockStateManager.getAtsScore.mockReturnValue({
      overall: 74,
      keyword_status: [
        { keyword: 'Python', type: 'hard', status: 'matched', match_type: 'exact' },
      ],
    })
    mockStateManager.getGenerationState.mockReturnValue({ pageCountEstimate: null })

    updateAtsBadge(mockStateManager.getAtsScore())
    expect(document.getElementById('ats-score-summary-line').textContent)
      .toBe('Hard 1/1')

    mockStateManager.getGenerationState.mockReturnValue({ pageCountExact: 3 })
    window.dispatchEvent(new CustomEvent('cvbuilder:generation-state-changed'))

    expect(document.getElementById('ats-score-summary-line').textContent)
      .toBe('Hard 1/1 • Length 3 pages')
  })

  it('adds score-high class for score >= 75', () => {
    updateAtsBadge({ overall: 80 })
    expect(document.getElementById('ats-score-badge').classList.contains('score-high')).toBe(true)
  })

  it('adds score-medium class for 50 <= score < 75', () => {
    updateAtsBadge({ overall: 60 })
    expect(document.getElementById('ats-score-badge').classList.contains('score-medium')).toBe(true)
  })

  it('adds score-low class for score < 50', () => {
    updateAtsBadge({ overall: 30 })
    expect(document.getElementById('ats-score-badge').classList.contains('score-low')).toBe(true)
  })

  it('removes previous score class before adding new one', () => {
    document.getElementById('ats-score-badge').classList.add('score-high')
    updateAtsBadge({ overall: 30 })
    const badge = document.getElementById('ats-score-badge')
    expect(badge.classList.contains('score-high')).toBe(false)
    expect(badge.classList.contains('score-low')).toBe(true)
  })

  it('sets aria-label with score and basis', () => {
    updateAtsBadge({ overall: 72, basis: 'analysis' })
    expect(document.getElementById('ats-score-badge').getAttribute('aria-label'))
      .toContain('72%')
  })

  it('dispatches an ats-score-updated event after rendering', () => {
    const handler = vi.fn()
    document.addEventListener('ats-score-updated', handler)

    updateAtsBadge({ overall: 72, basis: 'analysis' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not throw when elements are absent', () => {
    document.body.innerHTML = ''
    expect(() => updateAtsBadge({ overall: 80 })).not.toThrow()
  })
})

// ── refreshAtsScore ───────────────────────────────────────────────────────

describe('refreshAtsScore', () => {
  beforeEach(buildAtsBadge)

  it('does nothing when session id is absent', async () => {
    mockStateManager.getSessionId.mockReturnValue(null)
    await refreshAtsScore()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('calls /api/cv/ats-score with session_id and basis', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ats_score: { overall: 78, basis: 'analysis' } }),
    })
    await refreshAtsScore('analysis')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/cv/ats-score',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body).toEqual({ session_id: 'sess-123', basis: 'analysis' })
  })

  it('updates badge and stateManager on success', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ats_score: { overall: 85 } }),
    })
    await refreshAtsScore()
    expect(mockStateManager.setAtsScore).toHaveBeenCalledWith({ overall: 85 })
    expect(document.getElementById('ats-score-value').textContent).toBe('85%')
  })

  it('does not throw on network error', async () => {
    globalThis.fetch.mockRejectedValue(new Error('network'))
    await expect(refreshAtsScore()).resolves.not.toThrow()
  })

  it('does nothing when response is not ok', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false })
    await refreshAtsScore()
    expect(mockStateManager.setAtsScore).not.toHaveBeenCalled()
  })
})

// ── scheduleAtsRefresh ────────────────────────────────────────────────────

describe('scheduleAtsRefresh', () => {
  beforeEach(buildAtsBadge)

  it('defers the fetch by 600ms', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ats_score: { overall: 70 } }),
    })
    scheduleAtsRefresh()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    await Promise.resolve() // flush microtasks
    expect(globalThis.fetch).toHaveBeenCalled()
  })

  it('debounces rapid calls — only one fetch fires', () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ats_score: { overall: 70 } }),
    })
    scheduleAtsRefresh()
    scheduleAtsRefresh()
    scheduleAtsRefresh()
    vi.advanceTimersByTime(600)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
