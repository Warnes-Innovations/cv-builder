// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/session-manager.test.js
 * Unit tests for web/session-manager.js helpers and session restore flows.
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
  createNewSessionAndNavigate,
  restoreSession,
  loadSessionFile,
  saveTabData,
  restoreTabData,
  restoreBackendState,
} from '../../web/session-manager.js'
import { SESSION_PHASE_LABELS } from '../../web/utils.js'
import { stateManager } from '../../web/state-manager.js'

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
    const withTime = formatSessionTimestamp('2026-01-15T10:30:00Z', { includeTime: true })
    const withoutTime = formatSessionTimestamp('2026-01-15T10:30:00Z', { includeTime: false })
    expect(withoutTime.length).toBeLessThanOrEqual(withTime.length)
  })

  it('falls back gracefully for unparseable input', () => {
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
    vi.stubGlobal('localStorage', makeStorageMock())
    stateManager.setCurrentTab('analysis')
    stateManager.setPhase('job_analysis')
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('returns true when the claim succeeds', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

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
    stateManager.setCurrentTab('analysis')
    stateManager.setPhase('job_analysis')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    delete globalThis.sessionId
  })

  it('renders the landing panel and resets the current tab to job', () => {
    showSessionsLandingPanel('Pick a session first')

    expect(stateManager.getCurrentTab()).toBe('job')
    expect(stateManager.getCurrentStage()).toBe('job')
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
    stateManager.setSessionId('sess-1')
    stateManager.setTabData('analysis', { score: 42 })
    stateManager.setTabData('customizations', null)
    stateManager.setTabData('cv', null)
    stateManager.setCurrentTab('analysis')
    stateManager.setInteractiveState({ expanded: true })
    globalThis.window.pendingRecommendations = { skills: ['Python'] }
    globalThis.window._activeReviewPane = 'skills'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete globalThis.window.pendingRecommendations
    delete globalThis.window._activeReviewPane
  })

  it('saves scoped tab data to localStorage', () => {
    saveTabData()

    const saved = JSON.parse(localStorage.getItem('scoped-tab-data'))
    expect(saved.tabData).toEqual({
      analysis: { score: 42 },
      customizations: null,
      cv: null,
    })
    expect(saved.currentTab).toBe('analysis')
    expect(saved.pendingRecommendations).toEqual({ skills: ['Python'] })
    expect(saved.interactiveState).toMatchObject({ expanded: true })
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

    expect(stateManager.getTabData('analysis')).toEqual({ score: 42 })
    expect(stateManager.getTabData('cv')).toEqual({ files: ['cv.pdf'] })
    expect(globalThis.window.pendingRecommendations).toEqual({
      achievements: ['A'],
    })
    expect(stateManager.getInteractiveState()).toMatchObject({
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

    expect(stateManager.getTabData('analysis')).toEqual({ score: 42 })
    expect(globalThis.tabData).toEqual({
      analysis: { score: 42 },
      customizations: null,
      cv: null,
    })
    expect(globalThis.window.pendingRecommendations).toEqual({
      skills: ['Python'],
    })
    expect(globalThis.interactiveState).toMatchObject({ expanded: true })
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
    expect(stateManager.getTabData('analysis')).toEqual({ score: 42 })
  })
})

// ── createNewSessionAndNavigate ──────────────────────────────────────────

describe('createNewSessionAndNavigate', () => {
  beforeEach(() => {
    vi.stubGlobal('createSession', vi.fn())
  })

  it('throws when the new session response omits a session id', async () => {
    createSession.mockResolvedValue({ redirect_url: '/?session=missing' })

    await expect(createNewSessionAndNavigate()).rejects.toThrow('Failed to create session')
  })
})

// ── restoreBackendState ───────────────────────────────────────────────────

describe('restoreBackendState', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('parseStatusResponse', vi.fn(data => data))
    vi.stubGlobal('refreshAtsScore', vi.fn())
    vi.stubGlobal('updateInclusionCounts', vi.fn())
    vi.stubGlobal('StorageKeys', { SESSION_PATH: 'session_path' })
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    window.pendingRecommendations = null
    window._savedDecisions = {}
    window._allExperiences = []
    window._newSkillsFromLLM = []
    window.selectedSummaryKey = null
    window.postAnalysisQuestions = []
    window.questionAnswers = {}
    stateManager.setTabData('analysis', null)
    stateManager.setTabData('customizations', null)
    stateManager.setTabData('cv', null)
    stateManager.resetGenerationState()
    stateManager.clearAtsScore()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('syncs staged generation state and cached ATS score from backend', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job_analysis: { job_title: 'Engineer' },
          customizations: { approved_skills: [] },
          generated_files: { output_dir: '/tmp/out' },
          position_name: 'Engineer',
          post_analysis_questions: [{ type: 'clarification_1', question: 'Need more detail?' }],
          post_analysis_answers: { clarification_1: 'Yes.' },
          achievement_edits: {},
          experience_decisions: {},
          skill_decisions: {},
          achievement_decisions: {},
          publication_decisions: {},
          summary_focus_override: 'targeted',
          extra_skills: [],
          extra_skill_matches: {},
          all_experiences: [],
          selected_summary_key: null,
          new_skills_from_llm: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          phase: 'layout_review',
          preview_available: true,
          preview_outputs: {
            pdfs: {
              chrome: { ok: true, pdf: '/tmp/chrome.pdf' },
              weasyprint: { ok: true, pdf: '/tmp/weasyprint.pdf' },
            },
          },
          layout_confirmed: false,
          page_count_estimate: 2,
          page_length_warning: true,
          layout_instructions_count: 3,
          final_generated_at: null,
          ats_score: { overall: 88, basis: 'review_checkpoint' },
        }),
      })

    const restored = await restoreBackendState()

    expect(restored).toBe(true)
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/api/status')
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/api/cv/generation-state')
    expect(globalThis.refreshAtsScore).toHaveBeenCalledWith('analysis')
    expect(window.postAnalysisQuestions).toEqual([{ type: 'clarification_1', question: 'Need more detail?' }])
    expect(window.questionAnswers).toEqual({ clarification_1: 'Yes.' })
    expect(window.selectedSummaryKey).toBe('targeted')
    expect(stateManager.getGenerationState()).toMatchObject({
      phase: 'layout_review',
      previewAvailable: true,
      previewOutputs: {
        pdfs: {
          chrome: { ok: true, pdf: '/tmp/chrome.pdf' },
          weasyprint: { ok: true, pdf: '/tmp/weasyprint.pdf' },
        },
      },
      layoutConfirmed: false,
      pageCountEstimate: 2,
      pageCountExact: null,
      pageCountConfidence: null,
      pageCountSource: null,
      pageNeedsExactRecheck: false,
      pageWarning: true,
      layoutInstructionsCount: 3,
    })
    expect(stateManager.getAtsScore()).toEqual({ overall: 88, basis: 'review_checkpoint' })
  })

  it('clears stale staged generation state and ATS score when backend has none', async () => {
    stateManager.setGenerationState({
      phase: 'layout_review',
      previewAvailable: true,
      layoutConfirmed: true,
      pageCountEstimate: 3,
      pageWarning: true,
      layoutInstructionsCount: 4,
      finalGeneratedAt: '2026-03-23T10:00:00Z',
    })
    stateManager.setAtsScore({ overall: 91, basis: 'stale_cache' })

    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job_analysis: null,
          customizations: null,
          generated_files: null,
          position_name: null,
          achievement_edits: {},
          experience_decisions: {},
          skill_decisions: {},
          achievement_decisions: {},
          publication_decisions: {},
          summary_focus_override: null,
          extra_skills: [],
          extra_skill_matches: {},
          all_experiences: [],
          selected_summary_key: null,
          new_skills_from_llm: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          phase: 'idle',
          preview_available: false,
          layout_confirmed: false,
          page_count_estimate: null,
          page_length_warning: false,
          layout_instructions_count: 0,
          final_generated_at: null,
        }),
      })

    const restored = await restoreBackendState()

    expect(restored).toBe(false)
    expect(stateManager.getGenerationState()).toMatchObject({
      phase: 'idle',
      previewAvailable: false,
      previewOutputs: null,
      layoutConfirmed: false,
      pageCountEstimate: null,
      pageCountExact: null,
      pageCountConfidence: null,
      pageCountSource: null,
      pageNeedsExactRecheck: false,
      pageWarning: false,
      layoutInstructionsCount: 0,
      finalGeneratedAt: null,
    })
    expect(stateManager.getAtsScore()).toBeNull()
  })

  it('clears stale achievement edits when backend status has none', async () => {
    window.achievementEdits = { 0: ['Stale bullet'] }

    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job_analysis: { job_title: 'Engineer' },
          customizations: null,
          generated_files: null,
          position_name: 'Engineer',
          achievement_edits: {},
          experience_decisions: {},
          skill_decisions: {},
          achievement_decisions: {},
          publication_decisions: {},
          summary_focus_override: null,
          extra_skills: [],
          extra_skill_matches: {},
          all_experiences: [],
          selected_summary_key: null,
          new_skills_from_llm: [],
          post_analysis_questions: [],
          post_analysis_answers: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          phase: 'idle',
          preview_available: false,
          layout_confirmed: false,
          page_count_estimate: null,
          page_length_warning: false,
          layout_instructions_count: 0,
          final_generated_at: null,
        }),
      })

    const restored = await restoreBackendState()

    expect(restored).toBe(true)
    expect(window.achievementEdits).toEqual({})
  })

  it('clears stale tab data and pending recommendations when backend status omits them', async () => {
    stateManager.setTabData('analysis', { title: 'Stale analysis' })
    stateManager.setTabData('customizations', { approved_skills: ['Stale skill'] })
    stateManager.setTabData('cv', { files: ['stale.pdf'] })
    window.pendingRecommendations = { approved_skills: ['Stale skill'] }

    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job_analysis: null,
          customizations: null,
          generated_files: null,
          position_name: 'Engineer',
          achievement_edits: {},
          experience_decisions: {},
          skill_decisions: {},
          achievement_decisions: {},
          publication_decisions: {},
          summary_focus_override: null,
          extra_skills: [],
          extra_skill_matches: {},
          all_experiences: [],
          selected_summary_key: null,
          new_skills_from_llm: [],
          post_analysis_questions: [],
          post_analysis_answers: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          phase: 'idle',
          preview_available: false,
          layout_confirmed: false,
          page_count_estimate: null,
          page_length_warning: false,
          layout_instructions_count: 0,
          final_generated_at: null,
        }),
      })

    const restored = await restoreBackendState()

    expect(restored).toBe(false)
    expect(stateManager.getTabData('analysis')).toBeNull()
    expect(stateManager.getTabData('customizations')).toBeNull()
    expect(stateManager.getTabData('cv')).toBeNull()
    expect(window.pendingRecommendations).toBeNull()
  })
})

// ── restoreSession / loadSessionFile ─────────────────────────────────────

      describe('restoreSession', () => {
        beforeEach(() => {
          const storage = makeStorageMock()
          document.body.innerHTML = '<div id="conversation">placeholder</div>'
          vi.stubGlobal('StorageKeys', {
            SESSION_ID: 'session-id-key',
            SESSION_PATH: 'session-path-key',
          })
          vi.stubGlobal('localStorage', storage)
          vi.stubGlobal('getSessionIdFromURL', vi.fn(() => null))
          vi.stubGlobal('getScopedTabDataStorageKey', vi.fn(sessionId => `scoped-${sessionId}`))
          vi.stubGlobal('appendMessage', vi.fn())
          vi.stubGlobal('parseStatusResponse', vi.fn(value => value))
          vi.stubGlobal('parseRewritesResponse', vi.fn(value => value))
          vi.stubGlobal('refreshAtsScore', vi.fn())
          vi.stubGlobal('updateInclusionCounts', vi.fn())
          vi.stubGlobal('fetchStatus', vi.fn(async () => {}))
          vi.stubGlobal('renderRewritePanel', vi.fn())
          vi.stubGlobal('switchTab', vi.fn())
          vi.stubGlobal('PHASES', {
            INIT: 'init',
            JOB_ANALYSIS: 'job_analysis',
            CUSTOMIZATION: 'customization',
            REWRITE_REVIEW: 'rewrite_review',
            SPELL_CHECK: 'spell_check',
            GENERATION: 'generation',
            LAYOUT_REVIEW: 'layout_review',
            REFINEMENT: 'refinement',
          })
          globalThis.fetch = vi.fn()
          globalThis.sessionId = null
          globalThis.tabData = {}
          globalThis.interactiveState = { expanded: true }
          globalThis.window.pendingRecommendations = null
          globalThis.window._activeReviewPane = 'experiences'
          globalThis.isReconnecting = false
          globalThis.lastKnownPhase = null
          globalThis.rewriteDecisions = { stale: true }
        })

        afterEach(() => {
          vi.unstubAllGlobals()
          document.body.innerHTML = ''
          delete globalThis.fetch
          delete globalThis.tabData
          delete globalThis.interactiveState
          delete globalThis.window.pendingRecommendations
          delete globalThis.window._activeReviewPane
          delete globalThis.window.achievementEdits
          delete globalThis.window._savedDecisions
          delete globalThis.window._allExperiences
          delete globalThis.window.selectedSummaryKey
          delete globalThis.window._newSkillsFromLLM
          delete globalThis.isReconnecting
          delete globalThis.lastKnownPhase
          delete globalThis.rewriteDecisions
          delete globalThis.sessionId
        })

        it('returns without fetching when there is no stored session id', async () => {
          await restoreSession()

          expect(fetch).not.toHaveBeenCalled()
          expect(globalThis.isReconnecting).toBe(false)
        })

        it('restores history, backend state, and UI-only preferences for a live session', async () => {
          getSessionIdFromURL.mockReturnValue('sess-1')
          localStorage.setItem(
            'scoped-sess-1',
            JSON.stringify({
              activeReviewPane: 'skills',
              timestamp: Date.now(),
            }),
          )
          fetch
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                history: [
                  { role: 'user', content: 'Job text' },
                  { role: 'assistant', content: 'Analysis reply' },
                ],
                phase: 'customization',
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                position_name: 'Staff Data Scientist',
                phase: 'customization',
                job_analysis: { title: 'Staff Data Scientist' },
                customizations: { approved_skills: ['Python'] },
                generated_files: { files: ['cv.pdf'] },
                post_analysis_questions: [{ type: 'clarification_1', question: 'Need more detail?' }],
                post_analysis_answers: { clarification_1: 'Use the architect framing.' },
                experience_decisions: { exp_1: 'keep' },
                skill_decisions: { Python: 'keep' },
                achievement_decisions: {},
                publication_decisions: {},
                summary_focus_override: 'targeted',
                extra_skills: ['Leadership'],
                extra_skill_matches: { Leadership: ['exp_1'] },
                achievement_edits: { '0': ['Edited bullet'] },
                all_experiences: [{ id: 'exp_1' }],
                new_skills_from_llm: ['FastAPI'],
                selected_summary_key: null,
              }),
            })

          await restoreSession()

          expect(localStorage.setItem).toHaveBeenCalledWith('cv-builder-session-id', 'sess-1')
          expect(appendMessage).toHaveBeenCalledWith('user', 'Job text')
          expect(appendMessage).toHaveBeenCalledWith('assistant', 'Analysis reply')
          expect(appendMessage).toHaveBeenCalledWith('system', '🔄 Session restored from server.')
          expect(stateManager.getPhase()).toBe('customization')
          expect(stateManager.getTabData('analysis')).toEqual({ title: 'Staff Data Scientist' })
          expect(stateManager.getTabData('customizations')).toEqual({ approved_skills: ['Python'] })
          expect(stateManager.getTabData('cv')).toEqual({ files: ['cv.pdf'] })
          expect(globalThis.window.pendingRecommendations).toEqual({ approved_skills: ['Python'] })
          expect(globalThis.window._activeReviewPane).toBe('skills')
          expect(globalThis.window.achievementEdits[0]).toEqual(['Edited bullet'])
          expect(globalThis.window.postAnalysisQuestions).toEqual([{ type: 'clarification_1', question: 'Need more detail?' }])
          expect(globalThis.window.questionAnswers).toEqual({ clarification_1: 'Use the architect framing.' })
          expect(globalThis.window.selectedSummaryKey).toBe('targeted')
          expect(globalThis.window._savedDecisions.extra_skills).toEqual(['Leadership'])
          expect(refreshAtsScore).toHaveBeenCalledWith('analysis')
          expect(updateInclusionCounts).toHaveBeenCalled()
          expect(globalThis.isReconnecting).toBe(false)
        })

        it('surfaces restoration failures and clears reconnecting state', async () => {
          getSessionIdFromURL.mockReturnValue('sess-1')
          fetch.mockRejectedValue(new Error('offline'))

          await restoreSession()

          expect(appendMessage).toHaveBeenCalledWith(
            'system',
            '⚠️ Could not restore previous session. Starting fresh. (offline)',
          )
          expect(globalThis.isReconnecting).toBe(false)
        })
      })

      describe('loadSessionFile', () => {
        beforeEach(() => {
          const storage = makeStorageMock()
          document.body.innerHTML = '<div id="conversation">stale content</div>'
          vi.stubGlobal('StorageKeys', {
            SESSION_ID: 'session-id-key',
            SESSION_PATH: 'session-path-key',
          })
          vi.stubGlobal('localStorage', storage)
          vi.stubGlobal('getSessionIdFromURL', vi.fn(() => 'sess-1'))
          vi.stubGlobal('appendMessage', vi.fn())
          vi.stubGlobal('fetchStatus', vi.fn(async () => {}))
          vi.stubGlobal('parseStatusResponse', vi.fn(value => value))
          vi.stubGlobal('parseRewritesResponse', vi.fn(value => value))
          vi.stubGlobal('renderRewritePanel', vi.fn())
          vi.stubGlobal('switchTab', vi.fn())
          vi.stubGlobal('PHASES', {
            INIT: 'init',
            JOB_ANALYSIS: 'job_analysis',
            CUSTOMIZATION: 'customization',
            REWRITE_REVIEW: 'rewrite_review',
            SPELL_CHECK: 'spell_check',
            GENERATION: 'generation',
            LAYOUT_REVIEW: 'layout_review',
            REFINEMENT: 'refinement',
          })
          globalThis.fetch = vi.fn()
          globalThis.tabData = {}
          stateManager.setTabData('analysis', null)
          stateManager.setTabData('customizations', null)
          stateManager.setTabData('cv', null)
          globalThis.window.pendingRecommendations = null
          globalThis.rewriteDecisions = { stale: true }
        })

        afterEach(() => {
          vi.unstubAllGlobals()
          document.body.innerHTML = ''
          delete globalThis.fetch
          delete globalThis.tabData
          delete globalThis.window.pendingRecommendations
          delete globalThis.window.achievementEdits
          delete globalThis.rewriteDecisions
        })

        it('rehydrates rewrite-review state when the loaded session stays on the same URL session', async () => {
          fetch
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                ok: true,
                session_id: 'sess-1',
                redirect_url: '/?session=sess-1',
                session_file: '/tmp/session.json',
                position_name: 'Restored Session',
                phase: 'rewrite_review',
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                history: [
                  { role: 'user', content: 'Restored user message' },
                  { role: 'assistant', content: 'Restored assistant message' },
                  { role: 'system', content: 'ignore me' },
                ],
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                customizations: { approved_skills: ['Python'] },
                job_analysis: { title: 'Restored Session' },
                generated_files: { files: ['cv.pdf'] },
                post_analysis_questions: [{ type: 'clarification_1', question: 'Need more detail?' }],
                post_analysis_answers: { clarification_1: 'Use the architect framing.' },
                summary_focus_override: 'targeted',
                achievement_edits: { '0': ['Edited bullet'] },
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                rewrites: [{ id: 'rw1' }],
                persuasion_warnings: [{ severity: 'warn' }],
              }),
            })

          await expect(loadSessionFile('/tmp/session.json')).resolves.toBe(true)

          expect(localStorage.setItem).toHaveBeenCalledWith('session-path-key', '/tmp/session.json')
          expect(appendMessage).toHaveBeenCalledWith('system', '🔄 Restoring session from file...')
          expect(appendMessage).toHaveBeenCalledWith('user', 'Restored user message')
          expect(appendMessage).toHaveBeenCalledWith('assistant', 'Restored assistant message')
          expect(fetchStatus).toHaveBeenCalled()
          expect(stateManager.getTabData('customizations')).toEqual({ approved_skills: ['Python'] })
          expect(stateManager.getTabData('analysis')).toEqual({ title: 'Restored Session' })
          expect(stateManager.getTabData('cv')).toEqual({ files: ['cv.pdf'] })
          expect(globalThis.window.pendingRecommendations).toEqual({ approved_skills: ['Python'] })
          expect(globalThis.window.achievementEdits[0]).toEqual(['Edited bullet'])
          expect(globalThis.window.postAnalysisQuestions).toEqual([{ type: 'clarification_1', question: 'Need more detail?' }])
          expect(globalThis.window.questionAnswers).toEqual({ clarification_1: 'Use the architect framing.' })
          expect(globalThis.window.selectedSummaryKey).toBe('targeted')
          expect(globalThis.rewriteDecisions).toEqual({})
          expect(renderRewritePanel).toHaveBeenCalledWith(
            [{ id: 'rw1' }],
            [{ severity: 'warn' }],
          )
          expect(switchTab).toHaveBeenCalledWith('rewrite')
          expect(appendMessage).toHaveBeenCalledWith(
            'system',
            '✅ Session restored: Restored Session (rewrite_review)',
          )
        })

        it('clears stale restored tab data when the loaded session status omits them', async () => {
          stateManager.setTabData('analysis', { title: 'Stale analysis' })
          stateManager.setTabData('customizations', { approved_skills: ['Stale skill'] })
          stateManager.setTabData('cv', { files: ['stale.pdf'] })
          globalThis.window.pendingRecommendations = { approved_skills: ['Stale skill'] }

          fetch
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                ok: true,
                session_id: 'sess-1',
                redirect_url: '/?session=sess-1',
                session_file: '/tmp/session.json',
                position_name: 'Restored Session',
                phase: 'rewrite_review',
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                history: [],
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                customizations: null,
                job_analysis: null,
                generated_files: null,
                post_analysis_questions: [],
                post_analysis_answers: {},
                summary_focus_override: null,
                achievement_edits: {},
              }),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                rewrites: [],
                persuasion_warnings: [],
              }),
            })

          await expect(loadSessionFile('/tmp/session.json')).resolves.toBe(true)

          expect(stateManager.getTabData('analysis')).toBeNull()
          expect(stateManager.getTabData('customizations')).toBeNull()
          expect(stateManager.getTabData('cv')).toBeNull()
          expect(globalThis.window.pendingRecommendations).toBeNull()
        })
      })
