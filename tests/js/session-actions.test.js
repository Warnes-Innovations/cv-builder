// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/session-actions.test.js
 * Unit tests for web/session-actions.js — updatePositionTitle and _ACTION_LABELS.
 * (sendAction / saveSession / resetSession are orchestration-heavy; covered by
 *  integration tests against the running server.)
 */
import { updatePositionTitle, _ACTION_LABELS } from '../../web/session-actions.js'

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildPositionTitle() {
  document.body.innerHTML = `
    <div id="position-title"></div>
    <button id="rename-session-btn" style="display:none"></button>`
}

beforeEach(() => {
  document.body.innerHTML = ''
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
