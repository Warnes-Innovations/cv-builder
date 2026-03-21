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
    <div id="ats-score-badge" style="display:none">
      <span id="ats-score-value"></span>
    </div>`
}

const mockStateManager = { getSessionId: vi.fn(), setAtsScore: vi.fn() }

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
  vi.stubGlobal('stateManager', mockStateManager)
  vi.stubGlobal('fetch', vi.fn())
  mockStateManager.getSessionId.mockReturnValue('sess-123')
  mockStateManager.setAtsScore.mockReset()
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
  })

  it('hides badge when overall is not a number', () => {
    updateAtsBadge({ overall: 'N/A' })
    expect(document.getElementById('ats-score-badge').style.display).toBe('none')
  })

  it('shows badge and sets percentage text', () => {
    updateAtsBadge({ overall: 82, basis: 'review_checkpoint' })
    expect(document.getElementById('ats-score-badge').style.display).toBe('flex')
    expect(document.getElementById('ats-score-value').textContent).toBe('82%')
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
