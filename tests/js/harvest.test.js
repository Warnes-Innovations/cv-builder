// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/harvest.test.js
 * Unit tests for web/harvest.js's applyHarvestSelections() — the canonical
 * implementation (web/finalise.js used to carry a divergent duplicate that
 * was never actually reachable in production, since both files' Apply
 * buttons share the same onclick="applyHarvestSelections()" and window
 * resolution always picked this module's version; the duplicate was removed
 * rather than kept in sync, and these tests were ported from the removed
 * describe block in tests/js/finalise.test.js to match this module's real
 * behavior — notably the confirm-modal step and no per-item diff rendering).
 */
import { applyHarvestSelections } from '../../web/harvest.js'

beforeEach(() => {
  vi.stubGlobal('showConfirmModal', vi.fn().mockResolvedValue(true))
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function setupHarvestDOM(checked = true) {
  document.body.innerHTML = `
    <button id="harvest-apply-btn">✅ Apply Selected to Master CV</button>
    <input type="checkbox" id="harvest-chk-item-1" data-harvest-id="item-1" ${checked ? 'checked' : ''} />
    <input type="checkbox" id="harvest-chk-item-2" data-harvest-id="item-2" ${checked ? 'checked' : ''} />
    <div id="harvest-row-item-1"></div>
    <div id="harvest-row-item-2"></div>
    <div id="harvest-result"></div>`
}

describe('applyHarvestSelections', () => {
  it('shows a warning and makes no request when nothing is selected', async () => {
    setupHarvestDOM(false)
    await applyHarvestSelections()
    expect(document.getElementById('harvest-result').innerHTML).toContain('No items selected')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('does nothing (no fetch) when the confirm dialog is declined', async () => {
    setupHarvestDOM(true)
    vi.stubGlobal('showConfirmModal', vi.fn().mockResolvedValue(false))

    await applyHarvestSelections()

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('posts to /api/harvest/apply with the selected ids after confirming', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, written_count: 2 }),
    })

    await applyHarvestSelections()

    expect(globalThis.showConfirmModal).toHaveBeenCalled()
    const call = globalThis.fetch.mock.calls[0]
    expect(call[0]).toBe('/api/harvest/apply')
    const body = JSON.parse(call[1].body)
    expect(body.selected_ids).toContain('item-1')
    expect(body.selected_ids).toContain('item-2')
  })

  it('shows success with written_count and commit hash', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, written_count: 2, commit_hash: 'abc1234' }),
    })

    await applyHarvestSelections()

    const result = document.getElementById('harvest-result')
    expect(result.innerHTML).toContain('2 items written to master CV')
    expect(result.innerHTML).toContain('abc1234')
  })

  it('disables and unchecks checkboxes for applied items on success', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, written_count: 2 }),
    })

    await applyHarvestSelections()

    const cb1 = document.getElementById('harvest-chk-item-1')
    expect(cb1.disabled).toBe(true)
    expect(cb1.checked).toBe(false)
    expect(document.getElementById('harvest-row-item-1').style.opacity).toBe('0.45')
  })

  it('shows error on API failure (ok: false)', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, error: 'Write failed' }),
    })

    await applyHarvestSelections()

    expect(document.getElementById('harvest-result').innerHTML).toContain('Write failed')
  })

  it('shows error on network failure', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))

    await applyHarvestSelections()

    expect(document.getElementById('harvest-result').innerHTML).toContain('Network down')
  })

  it('re-enables the button after an API error', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, error: 'Error' }),
    })

    await applyHarvestSelections()

    const btn = document.getElementById('harvest-apply-btn')
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('✅ Apply Selected to Master CV')
  })

  it('shows a git warning when git_error is present', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, written_count: 1, git_error: 'Not a git repo' }),
    })

    await applyHarvestSelections()

    expect(document.getElementById('harvest-result').innerHTML).toContain('Not a git repo')
  })
})
