// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

import {
  openAtsReportModal,
  closeAtsReportModal,
  _renderAtsReport,
  openJobAnalysisModal,
  closeJobAnalysisModal,
  _renderAnalysisIntoEl,
  populateAtsScoreTab,
} from '../../web/ats-modals.js'
import { initializeState, stateManager } from '../../web/state-manager.js'

function createLocalStorageMock() {
  let store = {}
  return {
    getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: key => { delete store[key] },
    clear: () => { store = {} },
  }
}

function buildDom() {
  document.body.innerHTML = `
    <div id="ats-report-modal-overlay" style="display:none">
      <div id="ats-report-modal-body"></div>
    </div>
    <div id="job-analysis-modal-overlay" style="display:none">
      <div id="job-analysis-modal-body"></div>
    </div>
    <div id="document-content"></div>
    <span id="ats-score-badge" style="display:none"></span>
    <button id="ats-report-btn" style="display:none"></button>
    <button id="job-analysis-btn" style="display:none"></button>
  `
}

beforeEach(() => {
  buildDom()
  vi.stubGlobal('localStorage', createLocalStorageMock())
  initializeState()
  stateManager.clearAtsScore()
  stateManager.setTabData('analysis', null)

  vi.stubGlobal('escapeHtml', value => String(value ?? ''))
  vi.stubGlobal('refreshAtsScore', vi.fn(async () => {}))
  globalThis.fetch = vi.fn()
  stateManager.setSessionId('session-123')
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('openAtsReportModal', () => {
  it('renders cached ATS score without fetching', async () => {
    stateManager.setAtsScore({
      overall: 81,
      hard_requirement_score: 90,
      soft_requirement_score: 70,
      basis: 'review_checkpoint',
      keyword_status: [
        { keyword: 'python', type: 'hard', status: 'matched', match_type: 'exact' },
      ],
    })

    await openAtsReportModal()

    expect(fetch).not.toHaveBeenCalled()
    expect(document.getElementById('ats-report-modal-overlay').style.display).toBe('flex')
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('81%')
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('python')
  })

  it('fetches, caches, and renders ATS score when none is cached', async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        ok: true,
        ats_score: {
          overall: 76,
          hard_requirement_score: 82,
          soft_requirement_score: 61,
          basis: 'review_checkpoint',
          keyword_status: [
            { keyword: 'python', type: 'hard', status: 'matched', match_type: 'exact' },
            { keyword: 'aws', type: 'hard', status: 'missing' },
          ],
          section_scores: { summary: 88, skills: 70 },
        },
      }),
    })

    await openAtsReportModal()

    expect(fetch).toHaveBeenCalledWith('/api/cv/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'session-123',
        basis: 'review_checkpoint',
      }),
    })
    expect(stateManager.getAtsScore()).toEqual(expect.objectContaining({ overall: 76 }))
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('Hard Requirements')
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('aws')
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('summary')
  })

  it('renders a backend error message when ATS fetch fails logically', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ ok: false, error: 'scoring unavailable' }),
    })

    await openAtsReportModal()

    expect(document.getElementById('ats-report-modal-body').textContent).toContain(
      'Could not load ATS report: scoring unavailable',
    )
  })
})

describe('_renderAtsReport', () => {
  it('renders score, keywords, section scores, and basis text', () => {
    const html = _renderAtsReport({
      overall: 49,
      hard_requirement_score: 44,
      soft_requirement_score: 51,
      basis: 'post_generation',
      keyword_status: [
        { keyword: 'python', type: 'hard', status: 'matched', match_type: 'exact' },
        { keyword: 'kubernetes', type: 'soft', status: 'missing' },
      ],
      section_scores: { summary: 60, experience: 42 },
    })

    expect(html).toContain('49%')
    expect(html).toContain('Basis: post_generation')
    expect(html).toContain('python')
    expect(html).toContain('Preferred Skills')
    expect(html).toContain('kubernetes')
    expect(html).toContain('experience')
  })
})

describe('job analysis modal rendering', () => {
  it('renders analysis content from window.tabData.analysis', () => {
    stateManager.setTabData('analysis', {
      job_title: 'Staff Data Scientist',
      company: 'Example Co',
      domain: 'healthcare',
      required_skills: ['Python', 'Leadership'],
      preferred_skills: ['AWS'],
      ats_keywords: ['python', 'llm'],
      must_have_requirements: ['Lead teams'],
      culture_indicators: ['collaborative'],
      missing_required: ['Leadership'],
    })

    openJobAnalysisModal()

    const bodyText = document.getElementById('job-analysis-modal-body').textContent
    expect(document.getElementById('job-analysis-modal-overlay').style.display).toBe('flex')
    expect(bodyText).toContain('Staff Data Scientist')
    expect(bodyText).toContain('Missing required skills')
    expect(bodyText).toContain('AWS')
    expect(bodyText).toContain('collaborative')
  })

  it('shows an empty-state message when no analysis is available', () => {
    openJobAnalysisModal()

    expect(document.getElementById('job-analysis-modal-body').textContent).toContain(
      'No job analysis available. Run job analysis first.',
    )
  })
})

describe('populateAtsScoreTab', () => {
  it('renders cached ATS content into the document tab', async () => {
    stateManager.setAtsScore({ overall: 91, basis: 'review' })

    await populateAtsScoreTab()

    expect(document.getElementById('document-content').textContent).toContain('91%')
  })

  it('renders an empty state when no ATS score is cached', async () => {
    await populateAtsScoreTab()

    expect(document.getElementById('document-content').textContent).toContain('Compute ATS Score')
  })
})

describe('ats-score-updated event handling', () => {
  it('shows and hides shortcut buttons based on badge visibility', () => {
    const badge = document.getElementById('ats-score-badge')
    const reportBtn = document.getElementById('ats-report-btn')
    const analysisBtn = document.getElementById('job-analysis-btn')

    badge.style.display = 'inline-block'
    document.dispatchEvent(new Event('ats-score-updated'))
    expect(reportBtn.style.display).toBe('inline-block')
    expect(analysisBtn.style.display).toBe('inline-block')

    badge.style.display = 'none'
    document.dispatchEvent(new Event('ats-score-updated'))
    expect(reportBtn.style.display).toBe('none')
    expect(analysisBtn.style.display).toBe('none')
  })
})
