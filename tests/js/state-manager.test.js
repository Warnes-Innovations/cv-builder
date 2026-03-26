// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/state-manager.test.js
 * Unit tests for web/state-manager.js — state mutations and localStorage persistence.
 *
 * state-manager.js depends on two globals defined by api-client.js in the browser:
 *   - StorageKeys (used everywhere)
 *   - apiCall     (used in restoreSession / restoreBackendState)
 * We set those on globalThis before requiring the module.
 *
 * jsdom's localStorage is unreliable in CJS test files; we substitute a simple
 * in-memory mock via vi.stubGlobal so all Storage calls are fully controlled.
 */

// ── localStorage mock ─────────────────────────────────────────────────────────

function createLocalStorageMock() {
  let store = {}
  return {
    getItem:    (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem:    (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear:      () => { store = {} },
    key:        (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
    _reset:     () => { store = {} },
  }
}

const lsMock = createLocalStorageMock()
const cryptoMock = {
  randomUUID: vi.fn(() => 'fixed-uuid-1234'),
  getRandomValues: vi.fn(bytes => bytes.fill(0xab)),
}

let stateManager, initializeState, loadStateFromLocalStorage, saveStateToLocalStorage, clearState
let StorageKeys

beforeAll(async () => {
  // Stub localStorage before any module code runs
  vi.stubGlobal('localStorage', lsMock)
  vi.stubGlobal('crypto', cryptoMock)

  // 1. Load api-client exports and expose globals (mirrors browser load order)
  const apiClient = await import('../../web/api-client.js')
  StorageKeys = apiClient.StorageKeys
  globalThis.StorageKeys = StorageKeys

  // 2. Stub apiCall (used inside restoreSession / restoreBackendState)
  globalThis.apiCall = vi.fn().mockResolvedValue({ messages: [], phase: 'init' })

  // 3. Now load state-manager (it references StorageKeys + apiCall at call time)
  const sm = await import('../../web/state-manager.js')
  stateManager              = sm.stateManager
  initializeState           = sm.initializeState
  loadStateFromLocalStorage = sm.loadStateFromLocalStorage
  saveStateToLocalStorage   = sm.saveStateToLocalStorage
  clearState                = sm.clearState
})

beforeEach(() => {
  lsMock._reset()
  cryptoMock.randomUUID.mockClear()
  cryptoMock.randomUUID.mockReturnValue('fixed-uuid-1234')
  cryptoMock.getRandomValues.mockClear()
  initializeState()
})

// ── initializeState ───────────────────────────────────────────────────────────

describe('initializeState', () => {
  it('resets currentTab to "job"', () => {
    stateManager.setCurrentTab('analysis')
    initializeState()
    expect(stateManager.getCurrentTab()).toBe('job')
  })

  it('resets isLoading to false', () => {
    stateManager.setLoading(true)
    initializeState()
    expect(stateManager.isLoading()).toBe(false)
  })

  it('creates a session ID when none exists', () => {
    localStorage.clear()
    initializeState()
    expect(localStorage.getItem(StorageKeys.SESSION_ID)).toBeTruthy()
  })

  it('uses crypto.randomUUID for new session IDs when available', () => {
    localStorage.clear()

    initializeState()

    expect(cryptoMock.randomUUID).toHaveBeenCalled()
    expect(localStorage.getItem(StorageKeys.SESSION_ID)).toBe('session-fixed-uuid-1234')
  })

  it('falls back to timestamp plus random suffix when Web Crypto is unavailable', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890)
    const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

    localStorage.clear()
    vi.stubGlobal('crypto', undefined)

    try {
      initializeState()

      expect(localStorage.getItem(StorageKeys.SESSION_ID)).toMatch(/^session-[a-z0-9]+-[a-z0-9]+$/)
      expect(mathRandomSpy).toHaveBeenCalled()
    } finally {
      dateNowSpy.mockRestore()
      mathRandomSpy.mockRestore()
      vi.stubGlobal('crypto', cryptoMock)
    }
  })

  it('reuses an existing session ID from localStorage', () => {
    localStorage.setItem(StorageKeys.SESSION_ID, 'my-existing-session')
    initializeState()
    expect(stateManager.getSessionId()).toBe('my-existing-session')
  })

  it('resets tabData for all tabs to null', () => {
    stateManager.setTabData('analysis', { foo: 'bar' })
    initializeState()
    expect(stateManager.getTabData('analysis')).toBeNull()
    expect(stateManager.getTabData('customizations')).toBeNull()
    expect(stateManager.getTabData('cv')).toBeNull()
  })

  it('resets phase to "init"', () => {
    stateManager.setPhase('generation')
    initializeState()
    expect(stateManager.getPhase()).toBe('init')
  })
})

// ── tab state ─────────────────────────────────────────────────────────────────

describe('stateManager tab state', () => {
  it('setCurrentTab / getCurrentTab round-trips', () => {
    stateManager.setCurrentTab('rewrites')
    expect(stateManager.getCurrentTab()).toBe('rewrites')
  })

  it('mirrors currentTab onto globalThis for legacy modules', () => {
    stateManager.setCurrentTab('analysis')
    expect(globalThis.currentTab).toBe('analysis')
  })

  it('derives the current workflow step from phase', () => {
    stateManager.setPhase('job_analysis')
    expect(stateManager.getCurrentStage()).toBe('analysis')
  })

  it('mirrors the derived workflow step onto globalThis for legacy modules', () => {
    stateManager.setPhase('layout_review')
    expect(globalThis.currentStage).toBe('layout')
  })

  it('setCurrentTab persists the value to localStorage', () => {
    stateManager.setCurrentTab('analysis')
    const saved = JSON.parse(localStorage.getItem(StorageKeys.TAB_DATA))
    expect(saved.currentTab).toBe('analysis')
  })

  it('setTabData / getTabData round-trips', () => {
    const data = { score: 95, keywords: ['Python'] }
    stateManager.setTabData('analysis', data)
    expect(stateManager.getTabData('analysis')).toEqual(data)
  })

  it('getAllTabData returns a snapshot of canonical tab state', () => {
    stateManager.setTabData('analysis', { score: 95 })
    stateManager.setTabData('job', 'job text')

    expect(stateManager.getAllTabData()).toEqual({
      analysis: { score: 95 },
      customizations: null,
      cv: null,
      job: 'job text',
    })
  })

  it('getTabData returns null for an unset tab', () => {
    expect(stateManager.getTabData('cv')).toBeNull()
  })

  it('setTabData persists to localStorage', () => {
    stateManager.setTabData('analysis', { result: 'ok' })
    const saved = JSON.parse(localStorage.getItem(StorageKeys.TAB_DATA))
    expect(saved.tabData.analysis).toEqual({ result: 'ok' })
  })

  it('mirrors tabData onto globalThis for legacy modules', () => {
    stateManager.setTabData('analysis', { result: 'ok' })
    expect(globalThis.tabData.analysis).toEqual({ result: 'ok' })
  })
})

// ── loading state ─────────────────────────────────────────────────────────────

describe('stateManager loading state', () => {
  it('isLoading() returns false initially', () => {
    expect(stateManager.isLoading()).toBe(false)
  })

  it('setLoading(true) / isLoading() round-trips', () => {
    stateManager.setLoading(true)
    expect(stateManager.isLoading()).toBe(true)
  })

  it('setLoading(false) clears loading flag', () => {
    stateManager.setLoading(true)
    stateManager.setLoading(false)
    expect(stateManager.isLoading()).toBe(false)
  })
})

// ── interactive state ─────────────────────────────────────────────────────────

describe('stateManager interactive state', () => {
  it('setInteractiveState merges onto existing state', () => {
    stateManager.setInteractiveState({ isReviewing: true, type: 'skills' })
    const s = stateManager.getInteractiveState()
    expect(s.isReviewing).toBe(true)
    expect(s.type).toBe('skills')
    expect(s.currentIndex).toBe(0) // untouched default
  })

  it('setInteractiveState persists to localStorage', () => {
    stateManager.setInteractiveState({ isReviewing: true })
    const saved = JSON.parse(localStorage.getItem(StorageKeys.TAB_DATA))
    expect(saved.interactiveState.isReviewing).toBe(true)
  })
})

// ── phase tracking ────────────────────────────────────────────────────────────

describe('stateManager phase tracking', () => {
  it('setPhase / getPhase round-trips', () => {
    stateManager.setPhase('customisation')
    expect(stateManager.getPhase()).toBe('customisation')
  })

  it('setPhase persists to localStorage', () => {
    stateManager.setPhase('generation')
    const saved = JSON.parse(localStorage.getItem(StorageKeys.TAB_DATA))
    expect(saved.lastKnownPhase).toBe('generation')
  })
})

// ── layout freshness ───────────────────────────────────────────────────────

describe('stateManager layout freshness', () => {
  it('starts with no visible layout freshness chip before preview generation', () => {
    expect(stateManager.getLayoutFreshness()).toMatchObject({
      showChip: false,
      isStale: false,
    })
  })

  it('marks preview generation as fresh at the current content revision', () => {
    stateManager.markContentChanged()
    stateManager.markPreviewGenerated()

    expect(stateManager.getGenerationState()).toMatchObject({
      previewAvailable: true,
      phase: 'layout_review',
      lastPreviewContentRevision: 1,
    })
    expect(stateManager.getLayoutFreshness()).toMatchObject({
      showChip: true,
      label: 'Layout current',
      isStale: false,
    })
  })

  it('marks layout stale after content changes following preview generation', () => {
    stateManager.markPreviewGenerated()
    stateManager.markContentChanged()

    expect(stateManager.getLayoutFreshness()).toMatchObject({
      showChip: true,
      label: 'Layout outdated',
      isStale: true,
      isCritical: false,
    })
  })

  it('marks final outputs as critically stale after later content changes', () => {
    stateManager.markPreviewGenerated()
    stateManager.markLayoutConfirmed()
    stateManager.markFinalGenerated('2026-03-25T12:00:00')
    stateManager.markContentChanged()

    expect(stateManager.getLayoutFreshness()).toMatchObject({
      label: 'Files outdated',
      isStale: true,
      isCritical: true,
    })
  })

  it('persists revision-backed generation freshness state to localStorage', () => {
    stateManager.markPreviewGenerated()
    stateManager.markContentChanged()

    const saved = JSON.parse(localStorage.getItem(StorageKeys.TAB_DATA))
    expect(saved.generationState).toMatchObject({
      previewAvailable: true,
      contentRevision: 1,
      lastPreviewContentRevision: 0,
    })
  })
})

// ── pending recommendations ───────────────────────────────────────────────────

describe('stateManager pending recommendations', () => {
  it('setPendingRecommendations / getPendingRecommendations round-trips', () => {
    const recs = { skills: ['Python'], experiences: [] }
    stateManager.setPendingRecommendations(recs)
    expect(stateManager.getPendingRecommendations()).toEqual(recs)
  })

  it('getPendingRecommendations returns null when unset', () => {
    window.pendingRecommendations = undefined
    expect(stateManager.getPendingRecommendations()).toBeNull()
  })
})

// ── loadStateFromLocalStorage ─────────────────────────────────────────────────

describe('loadStateFromLocalStorage', () => {
  it('returns false when nothing is stored', () => {
    lsMock._reset()
    expect(loadStateFromLocalStorage()).toBe(false)
  })

  it('returns false for stale data (>24 h old)', () => {
    const stale = JSON.stringify({
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
      tabData: {},
    })
    localStorage.setItem(StorageKeys.TAB_DATA, stale)
    expect(loadStateFromLocalStorage()).toBe(false)
  })

  it('removes stale data entry from localStorage', () => {
    const stale = JSON.stringify({
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
      tabData: {},
    })
    localStorage.setItem(StorageKeys.TAB_DATA, stale)
    loadStateFromLocalStorage()
    expect(localStorage.getItem(StorageKeys.TAB_DATA)).toBeNull()
  })

  it('returns true and restores tabData for recent data', () => {
    const fresh = JSON.stringify({
      timestamp:    Date.now(),
      tabData:      { analysis: { score: 80 } },
      interactiveState: {},
      lastKnownPhase: 'job_analysis',
      currentTab: 'analysis',
    })
    localStorage.setItem(StorageKeys.TAB_DATA, fresh)
    const result = loadStateFromLocalStorage()
    expect(result).toBe(true)
    expect(stateManager.getTabData('analysis')).toEqual({ score: 80 })
    expect(globalThis.tabData.analysis).toEqual({ score: 80 })
    expect(stateManager.getCurrentStage()).toBe('analysis')
    expect(stateManager.getCurrentTab()).toBe('analysis')
  })

  it('restores phase from saved data', () => {
    const fresh = JSON.stringify({
      timestamp:      Date.now(),
      tabData:        {},
      lastKnownPhase: 'rewrites',
    })
    localStorage.setItem(StorageKeys.TAB_DATA, fresh)
    loadStateFromLocalStorage()
    expect(stateManager.getPhase()).toBe('rewrites')
  })

  it('handles corrupt JSON gracefully (returns false)', () => {
    localStorage.setItem(StorageKeys.TAB_DATA, 'not-json{{{')
    expect(loadStateFromLocalStorage()).toBe(false)
  })
})

// ── clearState ────────────────────────────────────────────────────────────────

describe('clearState', () => {
  it('removes TAB_DATA from localStorage', () => {
    saveStateToLocalStorage()
    clearState()
    expect(localStorage.getItem(StorageKeys.TAB_DATA)).toBeNull()
  })

  it('removes SESSION_ID and all other keys from localStorage', () => {
    saveStateToLocalStorage()
    clearState()
    // clearState calls initializeState (sets keys) then removes ALL keys
    expect(localStorage.getItem(StorageKeys.SESSION_ID)).toBeNull()
    expect(localStorage.getItem(StorageKeys.TAB_DATA)).toBeNull()
  })

  it('resets currentTab back to "job"', () => {
    stateManager.setCurrentTab('rewrites')
    clearState()
    expect(stateManager.getCurrentTab()).toBe('job')
  })
})
