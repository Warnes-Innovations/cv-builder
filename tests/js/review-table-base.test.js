// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/review-table-base.test.js
 * Unit tests for web/review-table-base.js — tab switching, analysis tab,
 * customization response, review sub-tab coordination, page-estimate widget,
 * and inclusion counts.
 * (populateReviewTab / loadTabContent are orchestration-heavy and rely on
 *  globalThis delegations that are validated via integration tests.)
 */
import {
  userSelections,
  updateInclusionCounts,
  switchTab,
  loadTabContent,
  populateAnalysisTab,
  handleCustomizationResponse,
  showTableBasedReview,
  populateReviewTab,
  switchReviewSubtab,
  _loadReviewPane,
  _updatePageEstimate,
  bulkAction,
  undoBulkAction,
} from '../../web/review-table-base.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

// ── DOM + global stubs ────────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = ''
  global.localStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  initializeState()
  window.pendingRecommendations = null
  window._savedDecisions = null
  window._reviewPaneLoaded = null
  window._activeReviewPane = 'experiences'
  window._masterSkills = []
  stateManager.setIsReconnecting(false)
  stateManager.setCurrentTab('job')
  stateManager.setPhase('init')
  // Function stubs
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('saveTabData', vi.fn())
  vi.stubGlobal('cleanJsonResponse', s => s)
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('extractFirstJsonObject', vi.fn(() => null))
  vi.stubGlobal('updateActionButtons', vi.fn())
  vi.stubGlobal('getStageForTab', vi.fn(() => null))
  vi.stubGlobal('updateTabBarForStage', vi.fn())
  vi.stubGlobal('populateJobTab', vi.fn())
  vi.stubGlobal('populateQuestionsTab', vi.fn())
  vi.stubGlobal('buildAchievementsEditor', vi.fn())
  vi.stubGlobal('renderRewritePanel', vi.fn())
  vi.stubGlobal('populateCVEditorTab', vi.fn())
  vi.stubGlobal('populateCVTab', vi.fn())
  vi.stubGlobal('populateDownloadTab', vi.fn())
  vi.stubGlobal('populateSpellCheckTab', vi.fn())
  vi.stubGlobal('initiateLayoutInstructions', vi.fn())
  vi.stubGlobal('populateFinaliseTab', vi.fn())
  vi.stubGlobal('populateMasterTab', vi.fn())
  vi.stubGlobal('populateCoverLetterTab', vi.fn())
  vi.stubGlobal('populateScreeningTab', vi.fn())
  vi.stubGlobal('buildExperienceReviewTable', vi.fn())
  vi.stubGlobal('buildSkillsReviewTable', vi.fn())
  vi.stubGlobal('buildAchievementsReviewTable', vi.fn())
  vi.stubGlobal('buildSummaryFocusSection', vi.fn())
  vi.stubGlobal('buildPublicationsReviewTable', vi.fn())
  vi.stubGlobal('fetchStatus', vi.fn(async () => ({ max_skills: 20 })))
  vi.stubGlobal('apiCall', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.pendingRecommendations
  delete window._savedDecisions
  delete window._reviewPaneLoaded
  delete window._activeReviewPane
  delete window._masterSkills
  delete window._rewritePanelCache
})

// ── userSelections ────────────────────────────────────────────────────────

describe('userSelections', () => {
  it('is an object with experiences and skills keys', () => {
    expect(userSelections).toHaveProperty('experiences')
    expect(userSelections).toHaveProperty('skills')
    expect(typeof userSelections.experiences).toBe('object')
    expect(typeof userSelections.skills).toBe('object')
  })
})

// ── updateInclusionCounts ─────────────────────────────────────────────────

describe('updateInclusionCounts', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="tab-exp-review">📊 Experiences</button>
      <button id="tab-skills-review">🛠️ Skills</button>
      <button id="tab-achievements-review">🏆 Achievements</button>`
  })

  it('does not throw when no decisions exist', () => {
    expect(() => updateInclusionCounts()).not.toThrow()
  })

  it('updates tab text with counts from _savedDecisions', () => {
    window._savedDecisions = {
      experience_decisions: { e1: 'include', e2: 'emphasize', e3: 'exclude' },
      skill_decisions: { s1: 'include' },
      achievement_decisions: {},
    }
    updateInclusionCounts()
    expect(document.getElementById('tab-exp-review').textContent).toContain('(2)')
    expect(document.getElementById('tab-skills-review').textContent).toContain('(1)')
    expect(document.getElementById('tab-achievements-review').textContent).not.toContain('(')
  })

  it('omits count suffix when count is zero', () => {
    window._savedDecisions = {
      experience_decisions: { e1: 'exclude' },
      skill_decisions: {},
      achievement_decisions: {},
    }
    updateInclusionCounts()
    expect(document.getElementById('tab-exp-review').textContent).not.toContain('(')
  })

  it('does not throw when tab elements are absent', () => {
    document.body.innerHTML = ''
    expect(() => updateInclusionCounts()).not.toThrow()
  })
})

// ── switchTab ─────────────────────────────────────────────────────────────

describe('switchTab', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button class="tab" id="tab-job" aria-selected="true">Job</button>
      <button class="tab" id="tab-analysis" aria-selected="false">Analysis</button>
      <div id="document-content" class="full-width"></div>`
    stateManager.setTabData('analysis', null)
  })

  it('sets active class on the selected tab', () => {
    switchTab('analysis')
    expect(document.getElementById('tab-analysis').classList.contains('active')).toBe(true)
  })

  it('removes active class from other tabs', () => {
    document.getElementById('tab-job').classList.add('active')
    switchTab('analysis')
    expect(document.getElementById('tab-job').classList.contains('active')).toBe(false)
  })

  it('sets aria-selected="true" on the active tab', () => {
    switchTab('analysis')
    expect(document.getElementById('tab-analysis').getAttribute('aria-selected')).toBe('true')
  })

  it('updates canonical currentTab state', () => {
    switchTab('analysis')
    expect(stateManager.getCurrentTab()).toBe('analysis')
  })

  it('updates stage-scoped chrome without requiring a mutable currentStage setter', () => {
    globalThis.getStageForTab.mockReturnValue('layout')

    expect(() => switchTab('analysis')).not.toThrow()
    expect(globalThis.updateTabBarForStage).toHaveBeenCalledWith('layout')
    expect(globalThis.updateActionButtons).toHaveBeenCalledWith('layout')
  })

  it('announces a single combined stage + tab message (GAP-16 Part A) instead of two separate live-region writes', () => {
    vi.useFakeTimers()
    document.body.innerHTML += '<div id="workflow-stage-announcer"></div>'
    globalThis.getStageForTab.mockReturnValue('job')

    switchTab('analysis')
    vi.advanceTimersByTime(60)

    expect(document.getElementById('workflow-stage-announcer').textContent).toBe('Now viewing: Job Input — Analysis')
    vi.useRealTimers()
  })

  it('falls back to a tab-only announcement when no stage is resolved for the tab', () => {
    vi.useFakeTimers()
    document.body.innerHTML += '<div id="workflow-stage-announcer"></div>'
    globalThis.getStageForTab.mockReturnValue(null)

    switchTab('analysis')
    vi.advanceTimersByTime(60)

    expect(document.getElementById('workflow-stage-announcer').textContent).toBe('Now viewing: Analysis')
    vi.useRealTimers()
  })

  it('notifies the early preview panel of the target tab (GAP-16 Part B)', () => {
    vi.stubGlobal('toggleEarlyPreviewPanel', vi.fn())

    switchTab('analysis')

    expect(globalThis.toggleEarlyPreviewPanel).toHaveBeenCalledWith('analysis')
  })

  it('adds full-width class for non-generate tabs', () => {
    switchTab('analysis')
    expect(document.getElementById('document-content').classList.contains('full-width')).toBe(true)
  })

  it('removes full-width class for generate tab', () => {
    document.getElementById('document-content').classList.add('full-width')
    stateManager.setTabData('cv', { some: 'data' })
    switchTab('generate')
    expect(document.getElementById('document-content').classList.contains('full-width')).toBe(false)
  })

  it('re-renders the rewrite panel from the shared window cache', () => {
    document.body.innerHTML = `
      <button class="tab" id="tab-job" aria-selected="true">Job</button>
      <button class="tab" id="tab-rewrite" aria-selected="false">Rewrites</button>
      <div id="document-content" class="full-width"></div>`
    window._rewritePanelCache = {
      rewrites: [{ id: 'rw-1', original: 'old', proposed: 'new' }],
      warnings: [],
    }

    switchTab('rewrite')

    expect(globalThis.renderRewritePanel).toHaveBeenCalledWith(
      window._rewritePanelCache.rewrites,
      window._rewritePanelCache.warnings,
    )
  })

  it('does not fail when tabData has not been initialized yet', async () => {
    await expect(loadTabContent('download')).resolves.toBeUndefined()
    expect(document.getElementById('document-content').innerHTML).toContain('Download')
  })

  it('renders a thrown error as text, not HTML (ported from ui-core.test.js — see web/ui-core.js header comment)', async () => {
    vi.stubGlobal(
      'populateJobTab',
      vi.fn(async () => {
        throw new Error('<img src=x onerror=alert(1)>')
      }),
    )

    await loadTabContent('job')

    const content = document.getElementById('document-content')
    expect(content.innerHTML).not.toContain('<img src=x onerror=alert(1)>')
    expect(content.textContent).toContain('Error loading content: <img src=x onerror=alert(1)>')
    expect(content.querySelector('img')).toBeNull()
  })
})

// ── populateAnalysisTab ───────────────────────────────────────────────────

describe('populateAnalysisTab', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
    stateManager.setTabData('analysis', null)
  })

  it('renders role title from analysis data', () => {
    populateAnalysisTab({ title: 'Software Engineer', required_skills: [] })
    expect(document.getElementById('document-content').innerHTML).toContain('Software Engineer')
  })

  it('renders company name when present', () => {
    populateAnalysisTab({ title: 'Dev', company: 'Acme Corp', required_skills: [] })
    expect(document.getElementById('document-content').innerHTML).toContain('Acme Corp')
  })

  it('renders required skills grid', () => {
    populateAnalysisTab({ title: 'Dev', required_skills: ['Python', 'Docker'] })
    const html = document.getElementById('document-content').innerHTML
    expect(html).toContain('Python')
    expect(html).toContain('Docker')
  })

  it('renders ATS keywords with rank badges', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await populateAnalysisTab({ title: 'Dev', required_skills: [], ats_keywords: ['ML', 'NLP'] })
    const html = document.getElementById('document-content').innerHTML
    expect(html).toContain('#1')
    expect(html).toContain('ML')
  })

  it('calls saveTabData', () => {
    populateAnalysisTab({ title: 'Dev', required_skills: [] })
    expect(globalThis.saveTabData).toHaveBeenCalled()
  })

  it('stores result in tabData.analysis', () => {
    const result = { title: 'Dev', required_skills: [] }
    populateAnalysisTab(result)
    expect(stateManager.getTabData('analysis')).toBe(result)
  })

  it('does not persist invalid analysis state', () => {
    const previous = { title: 'Existing', required_skills: [] }
    stateManager.setTabData('analysis', previous)
    globalThis.saveTabData.mockClear()

    vi.stubGlobal('cleanJsonResponse', () => { throw new Error('bad JSON') })

    populateAnalysisTab('unparseable')

    expect(stateManager.getTabData('analysis')).toBe(previous)
    expect(globalThis.saveTabData).not.toHaveBeenCalled()
  })

  it('renders error state when data is unparseable', () => {
    vi.stubGlobal('cleanJsonResponse', () => { throw new Error('bad JSON') })
    populateAnalysisTab('unparseable')
    expect(document.getElementById('document-content').innerHTML).toContain('Analysis Error')
  })

  it('marks missing skills when _masterSkills is set', () => {
    window._masterSkills = ['python']
    populateAnalysisTab({ title: 'Dev', required_skills: ['Python', 'Cobol'] })
    const html = document.getElementById('document-content').innerHTML
    // Python is in masterSkills (case-insensitive), Cobol is missing
    expect(html).toContain('missing')
  })
})

// ── handleCustomizationResponse ───────────────────────────────────────────

describe('handleCustomizationResponse', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button class="tab" id="tab-exp-review"></button>
      <div id="document-content" class="full-width"></div>`
    stateManager.setTabData('customizations', null)
    window.pendingRecommendations = null
    stateManager.setIsReconnecting(false)
    // populateReviewTab needs pendingRecommendations set; just let it no-op via DOM
  })

  it('stores pendingRecommendations when recommendations present', async () => {
    const data = { recommended_experiences: ['e1'], recommended_skills: ['Python'] }
    vi.stubGlobal('extractFirstJsonObject', vi.fn(() => data))
    await handleCustomizationResponse(JSON.stringify(data))
    expect(window.pendingRecommendations).toBe(data)
  })

  it('calls saveTabData when recommendations present', async () => {
    const data = { recommended_experiences: ['e1'] }
    await handleCustomizationResponse(data)
    expect(globalThis.saveTabData).toHaveBeenCalled()
  })

  it('calls appendMessage with empty string when data is null', async () => {
    vi.stubGlobal('extractFirstJsonObject', vi.fn(() => null))
    await handleCustomizationResponse(null)
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', '')
  })

  it('calls appendMessage with raw response when no recommendations', async () => {
    const data = { something_else: true }
    await handleCustomizationResponse(data)
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', data)
  })

  it('does not call appendMessage when isReconnecting', async () => {
    stateManager.setIsReconnecting(true)
    const data = { something_else: true }
    await handleCustomizationResponse(data)
    expect(globalThis.appendMessage).not.toHaveBeenCalled()
  })
})

// ── showTableBasedReview ──────────────────────────────────────────────────

describe('showTableBasedReview', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button class="tab" id="tab-exp-review"></button>
      <div id="document-content" class="full-width"></div>`
    stateManager.setTabData('customizations', null)
  })

  it('calls appendMessage with "No recommendations" when pendingRecommendations is null', async () => {
    window.pendingRecommendations = null
    await showTableBasedReview()
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('No recommendations'))
  })

  it('calls appendMessage with confirmation when recommendations exist', async () => {
    window.pendingRecommendations = { recommended_experiences: ['e1'] }
    await showTableBasedReview()
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('Customizations generated'))
  })
})

// ── populateReviewTab (GAP-394) ───────────────────────────────────────────

describe('populateReviewTab', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
    window.pendingRecommendations = { recommended_experiences: ['e1'] }
    stateManager.setTabData('customizations', { experience_recommendations: [] })
  })

  it('reminds the user changes are session-only, not saved to Master CV data (GAP-394)', async () => {
    await populateReviewTab('experiences')
    const html = document.getElementById('document-content').innerHTML
    expect(html).toContain('this application only')
    expect(html).toContain('Update Master CV')
  })
})

// ── switchReviewSubtab ────────────────────────────────────────────────────

describe('switchReviewSubtab', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button class="review-subtab active" data-pane="experiences">Exp</button>
      <button class="review-subtab" data-pane="skills">Skills</button>
      <div id="review-pane-experiences" class="review-pane" style="display:block;"></div>
      <div id="review-pane-skills" class="review-pane" style="display:none;"></div>`
    window._reviewPaneLoaded = { experiences: true, skills: true }
  })

  it('activates the clicked sub-tab button', async () => {
    await switchReviewSubtab('skills')
    const btn = document.querySelector('[data-pane="skills"]')
    expect(btn.classList.contains('active')).toBe(true)
  })

  it('deactivates the previously active button', async () => {
    await switchReviewSubtab('skills')
    const btn = document.querySelector('[data-pane="experiences"]')
    expect(btn.classList.contains('active')).toBe(false)
  })

  it('shows the target pane and hides others', async () => {
    await switchReviewSubtab('skills')
    expect(document.getElementById('review-pane-skills').style.display).toBe('block')
    expect(document.getElementById('review-pane-experiences').style.display).toBe('none')
  })

  it('updates _activeReviewPane', async () => {
    await switchReviewSubtab('skills')
    expect(window._activeReviewPane).toBe('skills')
  })

  it('calls build function on first visit to pane', async () => {
    window._reviewPaneLoaded = {}
    await switchReviewSubtab('skills')
    expect(globalThis.buildSkillsReviewTable).toHaveBeenCalled()
  })

  it('retries pane load after a first failure', async () => {
    window._reviewPaneLoaded = {}
    globalThis.buildSkillsReviewTable
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined)

    await expect(switchReviewSubtab('skills')).rejects.toThrow('temporary failure')
    expect(window._reviewPaneLoaded.skills).toBeUndefined()

    await switchReviewSubtab('skills')
    expect(globalThis.buildSkillsReviewTable).toHaveBeenCalledTimes(2)
    expect(window._reviewPaneLoaded.skills).toBe(true)
  })

  it('does not re-call build function on repeat visit', async () => {
    window._reviewPaneLoaded = { skills: true }
    await switchReviewSubtab('skills')
    expect(globalThis.buildSkillsReviewTable).not.toHaveBeenCalled()
  })
})

// ── _loadReviewPane ───────────────────────────────────────────────────────

describe('_loadReviewPane', () => {
  beforeEach(() => {
    window._reviewPaneLoaded = {}
  })

  it('calls buildExperienceReviewTable for "experiences"', async () => {
    await _loadReviewPane('experiences')
    expect(globalThis.buildExperienceReviewTable).toHaveBeenCalled()
  })

  it('calls buildSkillsReviewTable for "skills"', async () => {
    await _loadReviewPane('skills')
    expect(globalThis.buildSkillsReviewTable).toHaveBeenCalled()
  })

  it('calls buildAchievementsReviewTable for "achievements"', async () => {
    await _loadReviewPane('achievements')
    expect(globalThis.buildAchievementsReviewTable).toHaveBeenCalled()
  })

  it('calls buildSummaryFocusSection for "summary"', async () => {
    await _loadReviewPane('summary')
    expect(globalThis.buildSummaryFocusSection).toHaveBeenCalled()
  })

  it('calls buildPublicationsReviewTable for "publications"', async () => {
    await _loadReviewPane('publications')
    expect(globalThis.buildPublicationsReviewTable).toHaveBeenCalled()
  })

  it('marks the pane as loaded', async () => {
    await _loadReviewPane('skills')
    expect(window._reviewPaneLoaded.skills).toBe(true)
  })

  it('does not mark pane as loaded when the builder fails', async () => {
    globalThis.buildSkillsReviewTable.mockRejectedValueOnce(new Error('boom'))

    await expect(_loadReviewPane('skills')).rejects.toThrow('boom')
    expect(window._reviewPaneLoaded.skills).toBeUndefined()
  })
})

// ── _updatePageEstimate ───────────────────────────────────────────────────

describe('_updatePageEstimate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div id="page-estimate-widget" class="page-estimate ok">
        <span id="pe-icon">📄</span>
        <span id="pe-label"></span>
        <div class="pe-bar"><div id="pe-fill" style="width:0%"></div></div>
      </div>`
    // Reset userSelections
    userSelections.experiences = {}
    userSelections.skills = {}
    globalThis.apiCall.mockResolvedValue({
      ok: true,
      page_count_estimate: 2.4,
      page_count_exact: null,
      page_count_confidence: 0.72,
      page_count_source: 'delta-estimate',
      page_count_needs_exact_recheck: false,
      page_length_warning: false,
      contributors: ['skills column pressure changed'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when widget element is absent', () => {
    document.body.innerHTML = ''
    expect(() => _updatePageEstimate()).not.toThrow()
  })

  it('updates label text', () => {
    _updatePageEstimate()
    return vi.runAllTimersAsync().then(() => {
      expect(document.getElementById('pe-label').textContent).toContain('Estimated: 2.4 pages')
    })
  })

  it('adds "ok" class for short estimated length', () => {
    _updatePageEstimate()
    return vi.runAllTimersAsync().then(() => {
      expect(document.getElementById('page-estimate-widget').className).toContain('ok')
    })
  })

  it('adds "over" class when server warns the estimate is too long', () => {
    globalThis.apiCall.mockResolvedValueOnce({
      ok: true,
      page_count_estimate: 3.4,
      page_count_exact: null,
      page_count_confidence: 0.61,
      page_count_source: 'delta-estimate',
      page_count_needs_exact_recheck: true,
      page_length_warning: true,
      contributors: ['experience/publications column pressure changed'],
    })
    _updatePageEstimate()
    return vi.runAllTimersAsync().then(() => {
      const cls = document.getElementById('page-estimate-widget').className
      expect(cls).toContain('over')
    })
  })

  it('updates pe-fill width', () => {
    _updatePageEstimate()
    return vi.runAllTimersAsync().then(() => {
      const fill = document.getElementById('pe-fill')
      expect(fill.style.width).toMatch(/\d+(\.\d+)?%/)
    })
  })

  it('sends current experience and skill decisions to the server', () => {
    userSelections.skills = { s1: 'include', s2: 'exclude', s3: 'emphasize' }
    userSelections.experiences = { e1: 'include' }
    _updatePageEstimate()
    return vi.runAllTimersAsync().then(() => {
      expect(globalThis.apiCall).toHaveBeenCalledWith(
        'POST',
        '/api/cv/layout-estimate',
        expect.objectContaining({
          experience_decisions: { e1: 'include' },
          skill_decisions: { s1: 'include', s2: 'exclude', s3: 'emphasize' },
        }),
      )
    })
  })
})

// ── bulkAction + undoBulkAction ───────────────────────────────────────────

function _makeExpTable(entries) {
  const tbody = document.createElement('tbody')
  entries.forEach(({ id, action }) => {
    const tr = document.createElement('tr')
    tr.dataset.expId = id
    const btn = document.createElement('button')
    btn.className = 'icon-btn active'
    btn.dataset.action = action
    btn.setAttribute('aria-pressed', 'true')
    tr.appendChild(btn)
    tbody.appendChild(tr)
  })
  const table = document.createElement('table')
  table.id = 'experience-review-table'
  table.appendChild(tbody)
  return table
}

describe('bulkAction snapshot and undoBulkAction', () => {
  function _resetDOM() {
    document.body.innerHTML = ''
    const table = _makeExpTable([
      { id: 'e1', action: 'include' },
      { id: 'e2', action: 'emphasize' },
    ])
    const toolbar = document.createElement('div')
    toolbar.id = 'exp-bulk-toolbar'
    const undoBtn = document.createElement('button')
    undoBtn.className = 'bulk-undo-btn'
    undoBtn.style.display = 'none'
    toolbar.appendChild(undoBtn)
    document.body.appendChild(toolbar)
    document.body.appendChild(table)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    userSelections.experiences = { e1: 'include', e2: 'emphasize' }
    userSelections.skills = {}
    window.pendingRecommendations = {}
    vi.stubGlobal('$', () => ({ DataTable: () => null }))
    Object.assign($, { fn: { DataTable: { isDataTable: () => false } } })
    _resetDOM()
  })

  afterEach(() => {
    // Clear any lingering snapshot so module state doesn't leak between tests
    undoBulkAction('experience')
    undoBulkAction('skill')
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('bulkAction snapshots selections before applying changes', () => {
    bulkAction('exclude', 'experience')
    // After bulk: both should be exclude
    expect(userSelections.experiences.e1).toBe('exclude')
    expect(userSelections.experiences.e2).toBe('exclude')
  })

  it('bulkAction shows the undo button', () => {
    bulkAction('exclude', 'experience')
    const undoBtn = document.getElementById('exp-bulk-toolbar').querySelector('.bulk-undo-btn')
    expect(undoBtn.style.display).toBe('')
  })

  it('undoBulkAction restores previous selections', () => {
    bulkAction('exclude', 'experience')
    undoBulkAction('experience')
    expect(userSelections.experiences.e1).toBe('include')
    expect(userSelections.experiences.e2).toBe('emphasize')
  })

  it('undoBulkAction hides the undo button', () => {
    bulkAction('exclude', 'experience')
    undoBulkAction('experience')
    const undoBtn = document.getElementById('exp-bulk-toolbar').querySelector('.bulk-undo-btn')
    expect(undoBtn.style.display).toBe('none')
  })

  it('undoBulkAction is a no-op when called with wrong type', () => {
    bulkAction('exclude', 'experience')
    const before = { ...userSelections.experiences }
    undoBulkAction('skill')
    expect(userSelections.experiences).toEqual(before)
  })

  it('undoBulkAction is a no-op when no snapshot exists', () => {
    userSelections.experiences = { e1: 'exclude' }
    undoBulkAction('experience')
    expect(userSelections.experiences.e1).toBe('exclude')
  })

  it('undoBulkAction re-applies button active state for restored rows', () => {
    const rows = document.querySelectorAll('#experience-review-table tbody tr')
    // Simulate: after bulk exclude, both buttons show 'exclude'
    rows.forEach(row => {
      row.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'))
      const excBtn = document.createElement('button')
      excBtn.className = 'icon-btn active'
      excBtn.dataset.action = 'exclude'
      row.appendChild(excBtn)
    })
    bulkAction('exclude', 'experience')
    undoBulkAction('experience')
    // Each row should now have original action button re-activated
    const row1 = document.querySelector('tr[data-exp-id="e1"]')
    const restored = row1.querySelector('[data-action="include"]')
    expect(restored?.classList.contains('active')).toBe(true)
  })

  it('skill bulkAction hides the experience undo button (cross-tab clobber fix)', () => {
    // Wire up a skill toolbar so _setBulkUndoVisible can find it
    const skillToolbar = document.createElement('div')
    skillToolbar.id = 'skill-bulk-toolbar'
    const skillUndoBtn = document.createElement('button')
    skillUndoBtn.className = 'bulk-undo-btn'
    skillUndoBtn.style.display = 'none'
    skillToolbar.appendChild(skillUndoBtn)
    document.body.appendChild(skillToolbar)

    // Experience bulk action shows exp undo button
    bulkAction('exclude', 'experience')
    const expUndoBtn = document.getElementById('exp-bulk-toolbar').querySelector('.bulk-undo-btn')
    expect(expUndoBtn.style.display).toBe('')

    // Skill bulk action should hide exp undo button
    bulkAction('exclude', 'skill')
    expect(expUndoBtn.style.display).toBe('none')
  })

  it('undoBulkAction clears bulk-applied state for rows that had no prior selection', () => {
    // e1 and e2 have prior selections; e3 has none
    userSelections.experiences = { e1: 'include', e2: 'emphasize' }
    const tbody = document.querySelector('#experience-review-table tbody')
    const row3 = document.createElement('tr')
    row3.dataset.expId = 'e3'
    const excBtn = document.createElement('button')
    excBtn.className = 'icon-btn'
    excBtn.dataset.action = 'exclude'
    row3.appendChild(excBtn)
    tbody.appendChild(row3)

    // Bulk exclude applies to e3 (no prior selection)
    bulkAction('exclude', 'experience')
    expect(userSelections.experiences.e3).toBe('exclude')

    // Undo: e3 should be cleared (no prior selection)
    undoBulkAction('experience')
    expect(userSelections.experiences.e3).toBeUndefined()
    expect(excBtn.classList.contains('active')).toBe(false)
  })
})
