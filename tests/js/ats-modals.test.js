// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

import fs from 'node:fs'
import path from 'node:path'

function loadAtsModals() {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'web/ats-modals.js'),
    'utf8',
  )
  return new Function(
    `${source}
    return {
      openAtsReportModal,
      closeAtsReportModal,
      _renderAtsReport,
      openJobAnalysisModal,
      closeJobAnalysisModal,
      _renderAnalysisIntoEl,
      populateAtsScoreTab,
    };
  `,
  )()
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
  window.tabData = {}

  vi.stubGlobal('escapeHtml', value => String(value ?? ''))
  vi.stubGlobal('stateManager', {
    getAtsScore: vi.fn(() => null),
    setAtsScore: vi.fn(),
    getSessionId: vi.fn(() => 'session-123'),
  })
  vi.stubGlobal('updateAtsBadge', vi.fn())
  vi.stubGlobal('refreshAtsScore', vi.fn(async () => {}))
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  delete window.tabData
})

describe('openAtsReportModal', () => {
  it('renders cached ATS score without fetching', async () => {
    stateManager.getAtsScore.mockReturnValue({
      overall: 81,
      hard_requirement_score: 90,
      soft_requirement_score: 70,
      basis: 'review_checkpoint',
      keyword_status: [{ keyword: 'python', found: true }],
    })
    const mod = loadAtsModals()

    await mod.openAtsReportModal()

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
            { keyword: 'python', found: true, rank: 1 },
            { keyword: 'aws', found: false },
          ],
          section_scores: { summary: 88, skills: 70 },
        },
      }),
    })
    const mod = loadAtsModals()

    await mod.openAtsReportModal()

    expect(fetch).toHaveBeenCalledWith('/api/cv/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'session-123',
        basis: 'review_checkpoint',
      }),
    })
    expect(stateManager.setAtsScore).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 76 }),
    )
    expect(updateAtsBadge).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 76 }),
    )
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('Missing keywords (1)')
    expect(document.getElementById('ats-report-modal-body').textContent).toContain('summary')
  })

  it('renders a backend error message when ATS fetch fails logically', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ ok: false, error: 'scoring unavailable' }),
    })
    const mod = loadAtsModals()

    await mod.openAtsReportModal()

    expect(document.getElementById('ats-report-modal-body').textContent).toContain(
      'Could not load ATS report: scoring unavailable',
    )
  })
})

describe('_renderAtsReport', () => {
  it('renders score, keywords, section scores, and basis text', () => {
    const mod = loadAtsModals()
    const html = mod._renderAtsReport({
      overall: 49,
      hard_requirement_score: 44,
      soft_requirement_score: 51,
      basis: 'post_generation',
      keyword_status: [
        { term: 'python', found: true, rank: 1 },
        { term: 'kubernetes', found: false },
      ],
      section_scores: { summary: 60, experience: 42 },
    })

    expect(html).toContain('49%')
    expect(html).toContain('Basis: post_generation')
    expect(html).toContain('python')
    expect(html).toContain('Missing keywords (1)')
    expect(html).toContain('experience')
  })
})

describe('job analysis modal rendering', () => {
  it('renders analysis content from window.tabData.analysis', () => {
    window.tabData.analysis = {
      job_title: 'Staff Data Scientist',
      company: 'Example Co',
      domain: 'healthcare',
      required_skills: ['Python', 'Leadership'],
      preferred_skills: ['AWS'],
      ats_keywords: ['python', 'llm'],
      must_have_requirements: ['Lead teams'],
      culture_indicators: ['collaborative'],
      missing_required: ['Leadership'],
    }
    const mod = loadAtsModals()

    mod.openJobAnalysisModal()

    const bodyText = document.getElementById('job-analysis-modal-body').textContent
    expect(document.getElementById('job-analysis-modal-overlay').style.display).toBe('flex')
    expect(bodyText).toContain('Staff Data Scientist')
    expect(bodyText).toContain('Missing required skills')
    expect(bodyText).toContain('AWS')
    expect(bodyText).toContain('collaborative')
  })

  it('shows an empty-state message when no analysis is available', () => {
    const mod = loadAtsModals()

    mod.openJobAnalysisModal()

    expect(document.getElementById('job-analysis-modal-body').textContent).toContain(
      'No job analysis available. Run job analysis first.',
    )
  })
})

describe('populateAtsScoreTab', () => {
  it('renders cached ATS content into the document tab', async () => {
    stateManager.getAtsScore.mockReturnValue({ overall: 91, basis: 'review' })
    const mod = loadAtsModals()

    await mod.populateAtsScoreTab()

    expect(document.getElementById('document-content').textContent).toContain('91%')
  })

  it('renders an empty state when no ATS score is cached', async () => {
    const mod = loadAtsModals()

    await mod.populateAtsScoreTab()

    expect(document.getElementById('document-content').textContent).toContain('Compute ATS Score')
  })
})

describe('ats-score-updated event handling', () => {
  it('shows and hides shortcut buttons based on badge visibility', () => {
    loadAtsModals()
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
