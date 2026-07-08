// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/finalise.test.js
 * Unit tests for web/finalise.js — finaliseApplication (fetch mocks + DOM).
 * (applyHarvestSelections lives in web/harvest.js — see tests/js/harvest.test.js.)
 */
import {
  finaliseApplication,
  showHarvestSection,
} from '../../web/finalise.js'

// ── Global stubs ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('_renderConsistencyReport', vi.fn())
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// ── finaliseApplication ───────────────────────────────────────────────────────

function setupFinaliseDOM() {
  document.body.innerHTML = `
    <button id="finalise-btn">✅ Finalise Application</button>
    <select id="finalise-status"><option value="ready" selected>Ready to send</option></select>
    <textarea id="finalise-notes">Some notes</textarea>
    <div id="finalise-result" style="display:none;"></div>
    <div id="harvest-section" style="display:none;"></div>`
}

describe('finaliseApplication', () => {
  beforeEach(setupFinaliseDOM)

  it('posts to /api/finalise', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, summary: {}, commit_hash: 'abc123' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false, error: 'No candidates' }) })
    await finaliseApplication()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/finalise', expect.objectContaining({ method: 'POST' }))
  })

  it('shows success result on ok response', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, summary: { approved_rewrites: 3 }, commit_hash: 'abc123' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false }) })
    await finaliseApplication()
    const result = document.getElementById('finalise-result')
    expect(result.style.display).toBe('block')
    expect(result.innerHTML).toContain('finalised')
  })

  it('does not use "Archive"/"archived" as a competing verb for the same action (GAP-388)', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, summary: {}, commit_hash: 'abc123' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false }) })
    await finaliseApplication()
    expect(document.getElementById('finalise-result').innerHTML).not.toMatch(/archiv/i)
    expect(document.getElementById('finalise-btn').textContent).not.toMatch(/archiv/i)
  })

  it('renders ATS score reasoning when finalise returns cached ATS details', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          summary: {
            approved_rewrites: 1,
            ats_keywords: ['Python', 'SQL'],
            ats_score: {
              overall: 82,
              hard_requirement_score: 100,
              soft_requirement_score: 60,
              basis: 'post_generation',
              keyword_status: [
                { keyword: 'Python', type: 'hard', status: 'matched', match_type: 'exact' },
                { keyword: 'SQL', type: 'hard', status: 'missing' },
              ],
              section_scores: {},
            },
          },
          commit_hash: 'abc123',
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false }) })

    await finaliseApplication()

    const result = document.getElementById('finalise-result')
    expect(result.innerHTML).toContain('ATS score: <strong>82%</strong>')
    expect(result.innerHTML).toContain('ATS coverage: Hard 1/2')
    expect(result.innerHTML).toContain('ATS detail: Missing hard')
  })

  it('shows commit hash in result', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, summary: {}, commit_hash: 'deadbeef' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false }) })
    await finaliseApplication()
    expect(document.getElementById('finalise-result').innerHTML).toContain('deadbeef')
  })

  it('shows error on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false, json: async () => ({ ok: false, error: 'Archive failed' }),
    })
    await finaliseApplication()
    const result = document.getElementById('finalise-result')
    expect(result.style.display).toBe('block')
    expect(result.innerHTML).toContain('Archive failed')
  })

  it('shows error on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
    await finaliseApplication()
    const result = document.getElementById('finalise-result')
    expect(result.style.display).toBe('block')
    expect(result.innerHTML).toContain('Network error')
  })

  it('re-enables button after API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false, json: async () => ({ ok: false, error: 'Failed' }),
    })
    await finaliseApplication()
    expect(document.getElementById('finalise-btn').disabled).toBe(false)
  })

  it('sends status and notes in request body', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, summary: {}, commit_hash: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false }) })
    await finaliseApplication()
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.status).toBe('ready')
    expect(body.notes).toBe('Some notes')
  })
})

// ── showHarvestSection (GAP-389) ──────────────────────────────────────────────
// Verifies the Finalise tab's embedded panel links to the dedicated Update
// Master CV tab instead of re-rendering its own duplicate candidates table
// (the prior implementation fully duplicated web/harvest.js's render logic).

describe('showHarvestSection', () => {
  beforeEach(setupFinaliseDOM)

  it('shows a count and a link to the dedicated harvest tab when candidates exist', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, candidates: [{ id: 'c1' }, { id: 'c2' }] }),
    })
    await showHarvestSection()
    const html = document.getElementById('harvest-section').innerHTML
    expect(html).toContain('2 improvements')
    expect(html).toContain("switchTab('harvest')")
  })

  it('does not render a duplicate candidates table or checkboxes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, candidates: [{ id: 'c1' }] }),
    })
    await showHarvestSection()
    const html = document.getElementById('harvest-section').innerHTML
    expect(html).not.toContain('harvest-chk-')
    expect(html).not.toContain('harvest-apply-btn')
  })

  it('shows empty-state message when there are no candidates', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, candidates: [] }),
    })
    await showHarvestSection()
    expect(document.getElementById('harvest-section').innerHTML).toContain('No Update Candidates')
  })

  it('shows an error message when the fetch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: false, error: 'boom' }),
    })
    await showHarvestSection()
    expect(document.getElementById('harvest-section').innerHTML).toContain('boom')
  })
})
