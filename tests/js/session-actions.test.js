// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/session-actions.test.js
 * Unit tests for web/session-actions.js helpers and orchestration branches.
 */
import {
  updatePositionTitle,
  _ACTION_LABELS,
  sendAction,
  saveSession,
  resetSession,
} from '../../web/session-actions.js'
import { StorageKeys } from '../../web/api-client.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildPositionTitle() {
  document.body.innerHTML = `
    <div id="position-title"></div>
    <button id="rename-session-btn" style="display:none"></button>`
}

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
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('localStorage', makeStorageMock())
  initializeState()
  stateManager.setLoading(false)
  stateManager.setTabData('analysis', null)
  stateManager.setTabData('customizations', null)
  stateManager.setTabData('cv', null)
  vi.stubGlobal('cleanJsonResponse', s => s)
  vi.stubGlobal('normalizePositionLabel', (title, company) => {
    if (!title) return 'Professional Role'
    return company ? `${title} at ${company}` : title
  })
  vi.stubGlobal('extractTitleAndCompanyFromJobText', text => {
    const parts = text.split(' at ')
    return { title: parts[0] || '', company: parts[1] || '' }
  })
  vi.stubGlobal('_updateSessionSwitcherHeader', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── updatePositionTitle ───────────────────────────────────────────────────

describe('updatePositionTitle', () => {
  beforeEach(buildPositionTitle)

  it('does nothing when position-title element is absent', () => {
    document.body.innerHTML = ''
    expect(() => updatePositionTitle({ position_name: 'Engineer' })).not.toThrow()
  })

  it('sets label from position_name when present', () => {
    updatePositionTitle({ position_name: 'Senior Data Scientist' })
    expect(document.getElementById('position-title').textContent).toBe('Senior Data Scientist')
  })

  it('sets document title with position name', () => {
    updatePositionTitle({ position_name: 'Engineer' })
    expect(document.title).toContain('Engineer')
  })

  it('falls back to browser title when label is empty', () => {
    updatePositionTitle({})
    expect(document.title).toBe('CV Generator — Professional Web UI')
  })

  it('shows rename button when a label is set', () => {
    updatePositionTitle({ position_name: 'Manager' })
    expect(document.getElementById('rename-session-btn').style.display).toBe('')
  })

  it('hides rename button when label is empty', () => {
    updatePositionTitle({})
    expect(document.getElementById('rename-session-btn').style.display).toBe('none')
  })

  it('calls _updateSessionSwitcherHeader with label and phase', () => {
    updatePositionTitle({ position_name: 'Analyst', phase: 'customization' })
    expect(globalThis._updateSessionSwitcherHeader).toHaveBeenCalledWith({
      position_name: 'Analyst',
      phase: 'customization',
    })
  })

  it('parses label from job_analysis when position_name is empty', () => {
    updatePositionTitle({
      position_name: '',
      job_analysis: JSON.stringify({ title: 'Dev', company: 'Acme' }),
    })
    expect(document.getElementById('position-title').textContent).toContain('Dev')
  })

  it('parses label from job_description_text as last resort', () => {
    updatePositionTitle({ position_name: '', job_description_text: 'Engineer at BigCo' })
    expect(document.getElementById('position-title').textContent).not.toBe('')
  })
})

// ── _ACTION_LABELS ────────────────────────────────────────────────────────

describe('_ACTION_LABELS', () => {
  it('has a label for analyze_job', () => {
    expect(_ACTION_LABELS.analyze_job).toBeTruthy()
  })

  it('has a label for recommend_customizations', () => {
    expect(_ACTION_LABELS.recommend_customizations).toBeTruthy()
  })

  it('has a label for generate_cv', () => {
    expect(_ACTION_LABELS.generate_cv).toBeTruthy()
  })
})

// ── sendAction ────────────────────────────────────────────────────────────

describe('sendAction', () => {
  beforeEach(() => {
    stateManager.setLoading(false)
    stateManager.setTabData('cv', null)
    globalThis.window.questionAnswers = { focus: 'platform leadership' }
    vi.stubGlobal('appendLoadingMessage', vi.fn(() => ({ id: 'loading' })))
    vi.stubGlobal('removeLoadingMessage', vi.fn())
    vi.stubGlobal('appendMessage', vi.fn())
    vi.stubGlobal('appendRetryMessage', vi.fn())
    vi.stubGlobal('setLoading', vi.fn())
    vi.stubGlobal('llmFetch', vi.fn())
    vi.stubGlobal('parseMessageResponse', vi.fn(value => value))
    vi.stubGlobal('parseStatusResponse', vi.fn(value => value))
    vi.stubGlobal('handleCustomizationResponse', vi.fn(async () => {}))
    vi.stubGlobal('refreshAtsScore', vi.fn())
    vi.stubGlobal('switchTab', vi.fn())
    vi.stubGlobal('fetchStatus', vi.fn(async () => {}))
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    delete globalThis.window.questionAnswers
    delete globalThis.fetch
    vi.useRealTimers()
  })

  it('returns immediately when a request is already in flight', async () => {
    stateManager.setLoading(true)

    await sendAction('analyze_job')

    expect(llmFetch).not.toHaveBeenCalled()
    expect(appendLoadingMessage).not.toHaveBeenCalled()
  })

  it('forwards question answers for recommend_customizations and handles the result', async () => {
    llmFetch.mockResolvedValue({
      json: async () => ({
        result: {
          context_data: {
            customizations: { approved_skills: ['Python'] },
          },
        },
      }),
    })

    await sendAction('recommend_customizations')

    expect(llmFetch).toHaveBeenCalledWith('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'recommend_customizations',
        user_preferences: { focus: 'platform leadership' },
      }),
    })
    expect(handleCustomizationResponse).toHaveBeenCalledWith({ approved_skills: ['Python'] })
    expect(removeLoadingMessage).toHaveBeenCalledWith({ id: 'loading' })
    expect(setLoading).toHaveBeenNthCalledWith(1, true, _ACTION_LABELS.recommend_customizations)
    expect(setLoading).toHaveBeenLastCalledWith(false)
    expect(fetchStatus).toHaveBeenCalled()
  })

  it('shows a retry message when the API returns an error payload', async () => {
    llmFetch.mockResolvedValue({
      json: async () => ({ error: 'backend exploded' }),
    })

    await sendAction('analyze_job')

    expect(appendRetryMessage).toHaveBeenCalledWith(
      '❌ Error: backend exploded',
      expect.any(Function),
    )
    expect(fetchStatus).toHaveBeenCalled()
  })

  it('surfaces non-abort fetch failures through the retry message path', async () => {
    llmFetch.mockRejectedValue(new Error('network down'))

    await sendAction('analyze_job')

    expect(appendRetryMessage).toHaveBeenCalledWith(
      '❌ Error: network down',
      expect.any(Function),
    )
    expect(setLoading).toHaveBeenLastCalledWith(false)
    expect(fetchStatus).toHaveBeenCalled()
  })

  it('polls generation progress, stores CV results, and switches to layout', async () => {
    vi.useFakeTimers()
    const generationContent = { textContent: '' }

    appendMessage.mockImplementation((_role, message) => {
      if (message.startsWith('⏳ Generating CV files')) {
        return { querySelector: vi.fn(() => generationContent) }
      }
      return undefined
    })

    llmFetch.mockResolvedValue({
      json: async () => ({
        result: { ats_docx: '/tmp/cv-ats.docx', human_pdf: '/tmp/cv.pdf' },
      }),
    })
    fetch.mockResolvedValue({
      json: async () => ({
        generation_progress: [
          { step: 'ats_docx', status: 'complete', elapsed_ms: 110 },
          { step: 'html', status: 'complete', elapsed_ms: 220 },
        ],
      }),
    })

    const actionPromise = sendAction('generate_cv')
    await vi.advanceTimersByTimeAsync(500)
    await actionPromise

    expect(fetch).toHaveBeenCalledWith('/api/status')
    expect(parseStatusResponse).toHaveBeenCalled()
    expect(generationContent.textContent).toContain('Generating CV:')
    expect(generationContent.textContent).toContain('ats docx')
    expect(generationContent.textContent).toContain('(110ms)')
    expect(appendMessage).toHaveBeenCalledWith(
      'assistant',
      'CV generated successfully! Review your layout below.',
    )
    expect(stateManager.getTabData('cv')).toEqual({
      ats_docx: '/tmp/cv-ats.docx',
      human_pdf: '/tmp/cv.pdf',
    })
    expect(refreshAtsScore).toHaveBeenCalledWith('post_generation')
    expect(switchTab).toHaveBeenCalledWith('layout')
    expect(fetchStatus).toHaveBeenCalled()
  })

  it('keeps polling after transient status fetch failures during generate_cv', async () => {
    vi.useFakeTimers()

    appendMessage.mockImplementation((_role, message) => {
      if (message.startsWith('⏳ Generating CV files')) {
        return { querySelector: vi.fn(() => ({ textContent: '' })) }
      }
      return undefined
    })

    llmFetch.mockResolvedValue({
      json: async () => ({
        result: { human_docx: '/tmp/cv-human.docx' },
      }),
    })
    fetch
      .mockRejectedValueOnce(new Error('temporary status failure'))
      .mockResolvedValueOnce({
        json: async () => ({
          generation_progress: [
            { step: 'human_docx', status: 'complete', elapsed_ms: 330 },
          ],
        }),
      })

    const actionPromise = sendAction('generate_cv')
    await vi.advanceTimersByTimeAsync(1000)
    await actionPromise

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(appendRetryMessage).not.toHaveBeenCalled()
    expect(stateManager.getTabData('cv')).toEqual({ human_docx: '/tmp/cv-human.docx' })
    expect(switchTab).toHaveBeenCalledWith('layout')
    expect(fetchStatus).toHaveBeenCalled()
  })
})

// ── saveSession ───────────────────────────────────────────────────────────

describe('saveSession', () => {
  beforeEach(() => {
    vi.stubGlobal('appendMessage', vi.fn())
    vi.stubGlobal('appendRetryMessage', vi.fn())
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    delete globalThis.fetch
  })

  it('stores the session path and reports success', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ ok: true, session_file: '/tmp/session.json' }),
    })

    await saveSession()

    expect(fetch).toHaveBeenCalledWith('/api/save', { method: 'POST' })
    expect(localStorage.setItem).toHaveBeenCalledWith(StorageKeys.SESSION_PATH, '/tmp/session.json')
    expect(appendMessage).toHaveBeenCalledWith('system', 'Session saved successfully.')
  })

  it('shows a retry message when saving fails', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ ok: false, error: 'disk full' }),
    })

    await saveSession()

    expect(appendRetryMessage).toHaveBeenCalledWith(
      '❌ Error saving session: disk full',
      saveSession,
    )
  })
})

// ── resetSession ──────────────────────────────────────────────────────────

describe('resetSession', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="conversation">existing content</div>'
    vi.stubGlobal('fetchStatus', vi.fn(async () => {}))
    vi.stubGlobal('showLoadJobPanel', vi.fn(async () => {}))
    vi.stubGlobal('clearJobInput', vi.fn())
    vi.stubGlobal('clearURLInput', vi.fn())
    vi.stubGlobal('_clearFieldError', vi.fn())
    vi.stubGlobal('_updatePasteCharCount', vi.fn())
    vi.stubGlobal('appendMessage', vi.fn())
    globalThis.fetch = vi.fn()
    globalThis.userSelections = { experiences: { old: true }, skills: { old: true } }
    globalThis.window.postAnalysisQuestions = ['q1']
    globalThis.window.questionAnswers = { focus: 'old' }
    globalThis.window.pendingRecommendations = { skills: ['Python'] }
    globalThis.window._savedDecisions = { skills: { Python: 'keep' } }
    globalThis.window._newSkillsFromLLM = ['FastAPI']
    globalThis.window._activeReviewPane = 'skills'
    vi.stubGlobal('_pendingUploadFile', { name: 'job.txt' })
  })

  afterEach(() => {
    delete globalThis.fetch
    delete globalThis.userSelections
    delete globalThis.window.postAnalysisQuestions
    delete globalThis.window.questionAnswers
    delete globalThis.window.pendingRecommendations
    delete globalThis.window._savedDecisions
    delete globalThis.window._newSkillsFromLLM
    delete globalThis.window._activeReviewPane
  })

  it('clears session state and restores the job-loading UI on success', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    await resetSession()

    expect(fetch).toHaveBeenCalledWith('/api/reset', { method: 'POST' })
    expect(globalThis.userSelections).toEqual({ experiences: {}, skills: {} })
    expect(globalThis.window.postAnalysisQuestions).toEqual([])
    expect(globalThis.window.questionAnswers).toEqual({})
    expect(globalThis.window.pendingRecommendations).toBeNull()
    expect(globalThis.window._savedDecisions).toEqual({})
    expect(globalThis.window._newSkillsFromLLM).toEqual([])
    expect(globalThis.window._activeReviewPane).toBe('experiences')
    expect(globalThis._pendingUploadFile).toBeNull()
    expect(document.getElementById('conversation').innerHTML).toBe('')
    expect(fetchStatus).toHaveBeenCalled()
    expect(showLoadJobPanel).toHaveBeenCalled()
    expect(clearJobInput).toHaveBeenCalled()
    expect(clearURLInput).toHaveBeenCalled()
    expect(_clearFieldError).toHaveBeenCalledTimes(2)
    expect(_updatePasteCharCount).toHaveBeenCalled()
  })

  it('reports reset failures through the system message path', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'reset failed badly' }),
    })

    await resetSession()

    expect(appendMessage).toHaveBeenCalledWith('system', 'Error: reset failed badly')
  })
})
