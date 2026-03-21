/**
 * tests/js/session-manager.test.js
 * Unit tests for web/session-manager.js — pure helper functions only.
 * (restoreSession / restoreBackendState / loadSessionFile are orchestration-heavy
 *  and covered by integration tests.)
 */
import {
  SESSION_PHASE_LABELS,
  formatSessionPhaseLabel,
  _getCurrentSessionIdValue,
  _getCurrentOwnerTokenValue,
  buildSessionSwitcherLabel,
  getActiveSessionOwnershipMeta,
  formatSessionTimestamp,
} from '../../web/session-manager.js'

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
    expect(formatSessionPhaseLabel('customization')).toBe('Custom.')
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
      .toBe('Engineer · Custom.')
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
