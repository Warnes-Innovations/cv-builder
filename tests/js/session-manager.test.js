// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/session-manager.test.js
 * Unit tests for web/session-manager.js — pure helper functions only.
 * (restoreSession / restoreBackendState / loadSessionFile are orchestration-heavy
 *  and covered by integration tests.)
 */
import {
  formatSessionPhaseLabel,
  _getCurrentSessionIdValue,
  _getCurrentOwnerTokenValue,
  buildSessionSwitcherLabel,
  getActiveSessionOwnershipMeta,
  formatSessionTimestamp,
  _claimCurrentSession,
  showSessionsLandingPanel,
  ensureSessionContext,
  saveTabData,
  restoreTabData,
} from '../../web/session-manager.js'
import { SESSION_PHASE_LABELS } from '../../web/utils.js'

function makeStorageMock() {
  const store = new Map()
  return {
    getItem: vi.fn(key => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn(key => {
      store.delete(key)
    }),
  }
}

// ── formatSessionPhaseLabel ───────────────────────────────────────────────

describe('formatSessionPhaseLabel', () => {
  it('returns "init" for null/undefined', () => {
    expect(formatSessionPhaseLabel(null)).toBe('init')
    expect(formatSessionPhaseLabel(undefined)).toBe('init')
  })

  it('returns "init" for empty string', () => {
    expect(formatSessionPhaseLabel('')).toBe('init')
  })

  it('maps known phases', () => {
    expect(formatSessionPhaseLabel('job_analysis')).toBe('Analysis')
    expect(formatSessionPhaseLabel('customization')).toBe('Custom')
    expect(formatSessionPhaseLabel('rewrite_review')).toBe('Rewrite')
    expect(formatSessionPhaseLabel('refinement')).toBe('Done')
  })

  it('converts unknown phases by replacing underscores with spaces', () => {
    expect(formatSessionPhaseLabel('some_custom_phase')).toBe('some custom phase')
  })
})

// ── SESSION_PHASE_LABELS ──────────────────────────────────────────────────

describe('SESSION_PHASE_LABELS', () => {
  it('contains entries for all standard phases', () => {
    const required = ['init', 'job_analysis', 'customization', 'rewrite_review',
                      'spell_check', 'generation', 'layout_review', 'refinement']
    required.forEach(phase => {
      expect(SESSION_PHASE_LABELS[phase]).toBeTruthy()
    })
  })
})

// ── _getCurrentSessionIdValue ─────────────────────────────────────────────

describe('_getCurrentSessionIdValue', () => {
  beforeEach(() => {
    vi.stubGlobal('getSessionIdFromURL', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses getSessionIdFromURL when available', () => {
    vi.stubGlobal('getSessionIdFromURL', vi.fn(() => 'sess-from-fn'))
    expect(_getCurrentSessionIdValue()).toBe('sess-from-fn')
  })

  it('falls back to URLSearchParams when getSessionIdFromURL is absent', () => {
    // jsdom sets window.location.search; can't assign directly in strict mode,
    // but we can stub getSessionIdFromURL to return null and read via URL parsing.
    // Since jsdom URL has no session param by default, expect null.
    expect(_getCurrentSessionIdValue()).toBeNull()
  })
})

// ── _getCurrentOwnerTokenValue ────────────────────────────────────────────

describe('_getCurrentOwnerTokenValue', () => {
  beforeEach(() => {
    vi.stubGlobal('getOwnerToken', undefined)
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('uses getOwnerToken when available', () => {
    vi.stubGlobal('getOwnerToken', vi.fn(() => 'tok-123'))
    expect(_getCurrentOwnerTokenValue()).toBe('tok-123')
  })

  it('falls back to sessionStorage when getOwnerToken is absent', () => {
    sessionStorage.setItem('cv-builder-owner-token', 'stored-tok')
    expect(_getCurrentOwnerTokenValue()).toBe('stored-tok')
  })

  it('returns null when neither source has a value', () => {
    expect(_getCurrentOwnerTokenValue()).toBeNull()
  })
})

// ── buildSessionSwitcherLabel ─────────────────────────────────────────────

describe('buildSessionSwitcherLabel', () => {
  beforeEach(() => {
    vi.stubGlobal('getSessionIdFromURL', vi.fn(() => null))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns "📂 Sessions" when no session and no position_name', () => {
    expect(buildSessionSwitcherLabel({})).toBe('📂 Sessions')
  })

  it('returns "Session · <phase>" when session exists but no position_name', () => {
    vi.stubGlobal('getSessionIdFromURL', vi.fn(() => 'sess-1'))
    expect(buildSessionSwitcherLabel({ phase: 'init' })).toBe('Session · Init')
  })

  it('returns "positionName · <phase>" when position_name is set', () => {
    expect(buildSessionSwitcherLabel({ position_name: 'Engineer', phase: 'customization' }))
      .toBe('Engineer · Custom')
  })
})

// ── getActiveSessionOwnershipMeta ─────────────────────────────────────────

describe('getActiveSessionOwnershipMeta', () => {
  it('returns Unknown for null/non-object session', () => {
    expect(getActiveSessionOwnershipMeta(null).label).toBe('Unknown')
    expect(getActiveSessionOwnershipMeta('bad').label).toBe('Unknown')
  })

  it('returns "Current tab" when session is current and owned by requester', () => {
    const meta = getActiveSessionOwnershipMeta(
      { session_id: 'abc', owned_by_requester: true },
      { currentSessionId: 'abc' }
    )
    expect(meta.label).toBe('Current tab')
    expect(meta.isCurrent).toBe(true)
    expect(meta.className).toBe('session-status-current')
  })

  it('returns "Owned by this tab" when owned by requester but different session', () => {
    const meta = getActiveSessionOwnershipMeta(
      { session_id: 'other', owned_by_requester: true },
      { currentSessionId: 'abc' }
    )
    expect(meta.label).toBe('Owned by this tab')
    expect(meta.isCurrent).toBe(false)
  })

  it('returns "Owned by another tab" when claimed by someone else', () => {
    const meta = getActiveSessionOwnershipMeta(
      { session_id: 'other', owned_by_requester: false, claimed: true },
      { currentSessionId: 'abc' }
    )
    expect(meta.label).toBe('Owned by another tab')
    expect(meta.className).toBe('session-status-owned')
  })

  it('returns "Unclaimed" when not claimed', () => {
    const meta = getActiveSessionOwnershipMeta(
      { session_id: 'other', owned_by_requester: false, claimed: false },
      { currentSessionId: 'abc' }
    )
    expect(meta.label).toBe('Unclaimed')
    expect(meta.className).toBe('session-status-unclaimed')
  })
})

// ── formatSessionTimestamp ────────────────────────────────────────────────

describe('formatSessionTimestamp', () => {
  it('returns "—" for null/undefined', () => {
    expect(formatSessionTimestamp(null)).toBe('—')
    expect(formatSessionTimestamp(undefined)).toBe('—')
    expect(formatSessionTimestamp('')).toBe('—')
  })

  it('returns a formatted string for a valid ISO date', () => {
    const result = formatSessionTimestamp('2026-01-15T10:30:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toBe('—')
  })

  it('omits time when includeTime is false', () => {
    const withTime    = formatSessionTimestamp('2026-01-15T10:30:00Z', { includeTime: true })
    const withoutTime = formatSessionTimestamp('2026-01-15T10:30:00Z', { includeTime: false })
    expect(withoutTime.length).toBeLessThanOrEqual(withTime.length)
  })

  it('falls back gracefully for unparseable input', () => {
    // A string that Date() can't parse — but it should not throw
    const result = formatSessionTimestamp('not-a-date')
    expect(typeof result).toBe('string')
  })
})

// ── _claimCurrentSession / ensureSessionContext ──────────────────────────

describe('_claimCurrentSession', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
    vi.stubGlobal('getOwnerToken', vi.fn(() => 'owner-123'))
    vi.stubGlobal('showOwnershipConflictDialog', vi.fn())
    vi.stubGlobal('openSessionsModal', vi.fn())
    vi.stubGlobal('escapeHtml', s => String(s ?? ''))
    vi.stubGlobal('updateActionButtons', vi.fn())
    vi.stubGlobal('updatePositionTitle', vi.fn())
    globalThis.currentTab = 'analysis'
    globalThis.currentStage = 'analysis'
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    delete globalThis.currentTab
    delete globalThis.currentStage
  })

  it('returns true when the claim succeeds', async () => {
    fetch.mockResolvedValue({ ok: true })

    await expect(_claimCurrentSession('sess-1')).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/sessions/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'sess-1',
        owner_token: 'owner-123',
      }),
    })
  })

  it('takes over the session after a conflict when the user chooses takeover', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'session_owned' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
    showOwnershipConflictDialog.mockResolvedValue('takeover')

    await expect(_claimCurrentSession('sess-2')).resolves.toBe(true)
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/sessions/takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'sess-2',
        owner_token: 'owner-123',
      }),
    })
  })

  it('opens the landing panel when the user declines takeover', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'session_owned' }),
    })
    showOwnershipConflictDialog.mockResolvedValue('different')

    await expect(_claimCurrentSession('sess-3')).resolves.toBe(false)
    expect(openSessionsModal).toHaveBeenCalled()
    expect(document.getElementById('document-content').textContent).toContain(
      'Select a different session or create a new one.',
    )
  })

  it('shows the landing panel when the session no longer exists', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'missing' }),
    })

    await expect(_claimCurrentSession('sess-4')).resolves.toBe(false)
    expect(openSessionsModal).toHaveBeenCalled()
    expect(document.getElementById('document-content').textContent).toContain(
      'That session is no longer active.',
    )
  })

  it('throws a generic error for non-conflict failures', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    })

    await expect(_claimCurrentSession('sess-5')).rejects.toThrow('boom')
  })
})

describe('showSessionsLandingPanel and ensureSessionContext', () => {
  beforeEach(() => {
    const storage = makeStorageMock()
    document.body.innerHTML = '<div id="document-content"></div>'
    vi.stubGlobal('escapeHtml', s => String(s ?? ''))
    vi.stubGlobal('updateActionButtons', vi.fn())
    vi.stubGlobal('updatePositionTitle', vi.fn())
    vi.stubGlobal('openSessionsModal', vi.fn())
    vi.stubGlobal('getSessionIdFromURL', vi.fn(() => null))
    vi.stubGlobal('StorageKeys', { SESSION_ID: 'session-id-key' })
    vi.stubGlobal('localStorage', storage)
    globalThis.currentTab = 'analysis'
    globalThis.currentStage = 'analysis'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    delete globalThis.currentTab
    delete globalThis.currentStage
    delete globalThis.sessionId
  })

  it('renders the landing panel and resets the current tab to job', () => {
    showSessionsLandingPanel('Pick a session first')

    expect(globalThis.currentTab).toBe('job')
    expect(globalThis.currentStage).toBe('job')
    expect(document.getElementById('document-content').textContent).toContain(
      'Select a Session',
    )
    expect(document.getElementById('document-content').textContent).toContain(
      'Pick a session first',
    )
  })

  it('shows the landing panel and returns false when no session is in the URL', async () => {
    await expect(ensureSessionContext()).resolves.toBe(false)
    expect(openSessionsModal).toHaveBeenCalled()
    expect(document.getElementById('document-content').textContent).toContain(
      'Select a Session',
    )
  })
})

// ── saveTabData / restoreTabData ─────────────────────────────────────────

describe('saveTabData and restoreTabData', () => {
  beforeEach(() => {
    const storage = makeStorageMock()
    vi.stubGlobal('getScopedTabDataStorageKey', vi.fn(() => 'scoped-tab-data'))
    vi.stubGlobal('localStorage', storage)
    globalThis.sessionId = 'sess-1'
    globalThis.tabData = { analysis: { score: 42 } }
    globalThis.currentTab = 'analysis'
    globalThis.interactiveState = { expanded: true }
    globalThis.window.pendingRecommendations = { skills: ['Python'] }
    globalThis.window._activeReviewPane = 'skills'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete globalThis.sessionId
    delete globalThis.tabData
    delete globalThis.currentTab
    delete globalThis.interactiveState
    delete globalThis.window.pendingRecommendations
    delete globalThis.window._activeReviewPane
  })

  it('saves scoped tab data to localStorage', () => {
    saveTabData()

    const saved = JSON.parse(localStorage.getItem('scoped-tab-data'))
    expect(saved.tabData).toEqual({ analysis: { score: 42 } })
    expect(saved.currentTab).toBe('analysis')
    expect(saved.pendingRecommendations).toEqual({ skills: ['Python'] })
    expect(saved.interactiveState).toEqual({ expanded: true })
    expect(saved.activeReviewPane).toBe('skills')
  })

  it('restores recent tab data and merges it into globals', () => {
    localStorage.setItem(
      'scoped-tab-data',
      JSON.stringify({
        tabData: { cv: { files: ['cv.pdf'] } },
        pendingRecommendations: { achievements: ['A'] },
        interactiveState: { expanded: false, selected: 'x' },
        activeReviewPane: 'achievements',
        timestamp: Date.now(),
      }),
    )

    restoreTabData()

    expect(globalThis.tabData).toEqual({
      analysis: { score: 42 },
      cv: { files: ['cv.pdf'] },
    })
    expect(globalThis.window.pendingRecommendations).toEqual({
      achievements: ['A'],
    })
    expect(globalThis.interactiveState).toEqual({
      expanded: false,
      selected: 'x',
    })
    expect(globalThis.window._activeReviewPane).toBe('achievements')
  })

  it('restores only UI preferences when uiPrefsOnly is true', () => {
    localStorage.setItem(
      'scoped-tab-data',
      JSON.stringify({
        tabData: { cv: { files: ['cv.pdf'] } },
        pendingRecommendations: { achievements: ['A'] },
        interactiveState: { expanded: false },
        activeReviewPane: 'achievements',
        timestamp: Date.now(),
      }),
    )

    restoreTabData({ uiPrefsOnly: true })

    expect(globalThis.tabData).toEqual({ analysis: { score: 42 } })
    expect(globalThis.window.pendingRecommendations).toEqual({
      skills: ['Python'],
    })
    expect(globalThis.interactiveState).toEqual({ expanded: true })
    expect(globalThis.window._activeReviewPane).toBe('achievements')
  })

  it('drops stale saved tab data older than 24 hours', () => {
    localStorage.setItem(
      'scoped-tab-data',
      JSON.stringify({
        tabData: { cv: { files: ['old.pdf'] } },
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
      }),
    )

    restoreTabData()

    expect(localStorage.getItem('scoped-tab-data')).toBeNull()
    expect(globalThis.tabData).toEqual({ analysis: { score: 42 } })
  })
})
