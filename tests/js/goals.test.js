// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/goals.test.js
 * Unit tests for web/goals.js — saveGenerationGoals() validation and its
 * success/failure return value, which the Previous/Next bar's Next relies on
 * to decide whether to leave the Goals tab.
 */
import { saveGenerationGoals } from '../../web/goals.js'

function buildGoalsForm({ pdfPages = '2', atsPages = '2' } = {}) {
  document.body.innerHTML = `
    <input type="checkbox" id="goals-pdf-enabled" checked />
    <input type="radio" name="goals-pdf-mode" value="combined" checked />
    <input type="number" id="goals-max-pdf-pages" value="${pdfPages}" />
    <input type="checkbox" id="goals-ats-pages-enabled" checked />
    <input type="number" id="goals-max-ats-pages" value="${atsPages}" />
    <input type="checkbox" id="goals-ats-chars-enabled" />
    <div id="goals-status"></div>`
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('apiCall', vi.fn().mockResolvedValue({ ok: true }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveGenerationGoals', () => {
  it('returns true without saving when the Goals form is not on the page', async () => {
    expect(await saveGenerationGoals()).toBe(true)
    expect(globalThis.apiCall).not.toHaveBeenCalled()
  })

  it('saves valid goals and returns true', async () => {
    buildGoalsForm()
    expect(await saveGenerationGoals()).toBe(true)
    expect(globalThis.apiCall).toHaveBeenCalledWith('POST', '/api/generation-goals',
      expect.objectContaining({ max_pdf_pages: 2, max_ats_pages: 2 }))
  })

  it('returns false and does not save when validation fails', async () => {
    buildGoalsForm({ pdfPages: '0' })
    expect(await saveGenerationGoals()).toBe(false)
    expect(globalThis.apiCall).not.toHaveBeenCalled()
    expect(document.getElementById('goals-status').textContent).toMatch(/PDF pages must be 1–10/)
  })

  it('returns false when the save request fails', async () => {
    buildGoalsForm()
    globalThis.apiCall.mockRejectedValue(new Error('network'))
    expect(await saveGenerationGoals()).toBe(false)
    expect(document.getElementById('goals-status').textContent).toMatch(/Save failed/)
  })
})
