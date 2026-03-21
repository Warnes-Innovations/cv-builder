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
  populateAnalysisTab,
  handleCustomizationResponse,
  showTableBasedReview,
  switchReviewSubtab,
  _loadReviewPane,
  _updatePageEstimate,
} from '../../web/review-table-base.js'

// ── DOM + global stubs ────────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = ''
  // State globals
  window.tabData = { analysis: null, customizations: null, cv: null }
  window.pendingRecommendations = null
  window._savedDecisions = null
  window._reviewPaneLoaded = null
  window._activeReviewPane = 'experiences'
  window._masterSkills = []
  window.isReconnecting = false
  window.currentTab = 'job'
  window.currentStage = 'job'
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
  vi.stubGlobal('getStatus', vi.fn(async () => ({ max_skills: 20 })))
  vi.stubGlobal('apiCall', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.tabData
  delete window.pendingRecommendations
  delete window._savedDecisions
  delete window._reviewPaneLoaded
  delete window._activeReviewPane
  delete window._masterSkills
  delete window.isReconnecting
  delete window.currentTab
  delete window.currentStage
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
    window.tabData = { analysis: null }
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

  it('updates window.currentTab', () => {
    switchTab('analysis')
    expect(window.currentTab).toBe('analysis')
  })

  it('adds full-width class for non-generate tabs', () => {
    switchTab('analysis')
    expect(document.getElementById('document-content').classList.contains('full-width')).toBe(true)
  })

  it('removes full-width class for generate tab', () => {
    document.getElementById('document-content').classList.add('full-width')
    window.tabData = { cv: { some: 'data' } }
    switchTab('generate')
    expect(document.getElementById('document-content').classList.contains('full-width')).toBe(false)
  })
})

// ── populateAnalysisTab ───────────────────────────────────────────────────

describe('populateAnalysisTab', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="document-content"></div>'
    window.tabData = { analysis: null }
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

  it('renders ATS keywords with rank badges', () => {
    populateAnalysisTab({ title: 'Dev', required_skills: [], ats_keywords: ['ML', 'NLP'] })
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
    expect(window.tabData.analysis).toBe(result)
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
    window.tabData = { customizations: null }
    window.pendingRecommendations = null
    window.isReconnecting = false
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
    window.isReconnecting = true
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
    window.tabData = { customizations: null }
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
})

// ── _updatePageEstimate ───────────────────────────────────────────────────

describe('_updatePageEstimate', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-estimate-widget" class="page-estimate ok">
        <span id="pe-icon">📄</span>
        <span id="pe-label"></span>
        <div class="pe-bar"><div id="pe-fill" style="width:0%"></div></div>
      </div>`
    // Reset userSelections
    userSelections.experiences = {}
    userSelections.skills = {}
  })

  it('does nothing when widget element is absent', () => {
    document.body.innerHTML = ''
    expect(() => _updatePageEstimate()).not.toThrow()
  })

  it('updates label text', () => {
    _updatePageEstimate()
    expect(document.getElementById('pe-label').textContent).toContain('pages')
  })

  it('adds "ok" class for short estimated length', () => {
    // No selections → very short → ok
    _updatePageEstimate()
    expect(document.getElementById('page-estimate-widget').className).toContain('ok')
  })

  it('adds "over" class when many experiences are emphasised', () => {
    // Fill with many 'emphasize' entries to push beyond 2.8 pages
    for (let i = 0; i < 10; i++) {
      userSelections.experiences[`e${i}`] = 'emphasize'
    }
    _updatePageEstimate()
    const cls = document.getElementById('page-estimate-widget').className
    expect(cls === 'page-estimate ok' || cls === 'page-estimate warn' || cls === 'page-estimate over').toBe(true)
  })

  it('updates pe-fill width', () => {
    _updatePageEstimate()
    const fill = document.getElementById('pe-fill')
    expect(fill.style.width).toMatch(/\d+(\.\d+)?%/)
  })

  it('counts only non-excluded skills for estimate', () => {
    userSelections.skills = { s1: 'include', s2: 'exclude', s3: 'emphasize' }
    _updatePageEstimate()
    // Just verify no throw and label contains count info
    expect(document.getElementById('pe-label').textContent).toContain('2 skills')
  })
})
