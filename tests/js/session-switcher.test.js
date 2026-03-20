/**
 * Focused regression tests for session switcher helpers in web/app.js.
 */

const { formatSessionPhaseLabel } = require('../../web/utils');

describe('session switcher helpers', () => {
  let app
  let originalFetch

  function loadApp() {
    app = require('../../web/app.js')
    return app
  }

  beforeEach(() => {
    vi.resetModules()
    window.history.replaceState({}, '', 'http://localhost/')
    sessionStorage.clear()
    originalFetch = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn())
    loadApp()
  })

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch
      window.fetch = originalFetch
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('formats workflow phases for display', () => {
    expect(formatSessionPhaseLabel('rewrite_review')).toBe('rewrite')
    expect(formatSessionPhaseLabel('layout_review')).toBe('layout review')
    expect(formatSessionPhaseLabel('custom_phase')).toBe('custom phase')
  })

  it('builds a header label from position name and phase', () => {
    expect(app.buildSessionSwitcherLabel({
      position_name: 'Senior Data Scientist',
      phase: 'generation',
    })).toBe('Senior Data Scientist · generation')
  })

  it('falls back to the default sessions label when no session is active', () => {
    expect(app.buildSessionSwitcherLabel({})).toBe('📂 Sessions')
  })

  it('marks the current session as owned by the current tab', () => {
    const meta = app.getActiveSessionOwnershipMeta(
      { session_id: 'sess-1', owned_by_requester: true, claimed: true },
      { currentSessionId: 'sess-1' },
    )

    expect(meta).toEqual({
      label: 'Current tab',
      className: 'session-status-current',
      isCurrent: true,
    })
  })

  it('marks foreign owned sessions distinctly', () => {
    const meta = app.getActiveSessionOwnershipMeta(
      { session_id: 'sess-2', owned_by_requester: false, claimed: true },
      { currentSessionId: 'sess-1' },
    )

    expect(meta).toEqual({
      label: 'Owned by another tab',
      className: 'session-status-owned',
      isCurrent: false,
    })
  })

  it('marks unclaimed sessions as available', () => {
    const meta = app.getActiveSessionOwnershipMeta(
      { session_id: 'sess-3', owned_by_requester: false, claimed: false },
      { currentSessionId: 'sess-1' },
    )

    expect(meta).toEqual({
      label: 'Unclaimed',
      className: 'session-status-unclaimed',
      isCurrent: false,
    })
  })
})
