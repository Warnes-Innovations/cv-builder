/**
 * tests/js/finalise.test.js
 * Unit tests for web/finalise.js — finaliseApplication and applyHarvestSelections
 * (fetch mocks + DOM).
 */
import {
  finaliseApplication,
  applyHarvestSelections,
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
    <button id="finalise-btn">✅ Finalise &amp; Archive</button>
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
    expect(result.innerHTML).toContain('archived')
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

// ── applyHarvestSelections ────────────────────────────────────────────────────

function setupHarvestDOM(checked = true) {
  document.body.innerHTML = `
    <button id="harvest-apply-btn">📥 Apply Selected Updates</button>
    <input type="checkbox" data-harvest-id="item-1" ${checked ? 'checked' : ''} />
    <input type="checkbox" data-harvest-id="item-2" ${checked ? 'checked' : ''} />
    <div id="harvest-result"></div>`
}

describe('applyHarvestSelections', () => {
  it('shows warning when nothing selected', async () => {
    setupHarvestDOM(false)
    await applyHarvestSelections()
    const result = document.getElementById('harvest-result')
    expect(result.innerHTML).toContain('No items selected')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('posts to /api/harvest/apply with selected ids', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, written_count: 2, diff_summary: [] }),
    })
    await applyHarvestSelections()
    const call = globalThis.fetch.mock.calls[0]
    expect(call[0]).toBe('/api/harvest/apply')
    const body = JSON.parse(call[1].body)
    expect(body.selected_ids).toContain('item-1')
    expect(body.selected_ids).toContain('item-2')
  })

  it('shows success with written_count', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, written_count: 2, diff_summary: [
        { label: 'Bullet A', applied: true },
        { label: 'Bullet B', applied: false },
      ] }),
    })
    await applyHarvestSelections()
    const result = document.getElementById('harvest-result')
    expect(result.innerHTML).toContain('2 items written')
    expect(result.innerHTML).toContain('Bullet A')
    expect(result.innerHTML).toContain('no match found')
  })

  it('shows error on API failure', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: 'Write failed' }),
    })
    await applyHarvestSelections()
    const result = document.getElementById('harvest-result')
    expect(result.innerHTML).toContain('Write failed')
  })

  it('shows error on network failure', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    await applyHarvestSelections()
    const result = document.getElementById('harvest-result')
    expect(result.innerHTML).toContain('Network down')
  })

  it('re-enables button after API error', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: 'Error' }),
    })
    await applyHarvestSelections()
    expect(document.getElementById('harvest-apply-btn').disabled).toBe(false)
  })

  it('shows git warning when git_error present', async () => {
    setupHarvestDOM(true)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, written_count: 1, diff_summary: [], git_error: 'Not a git repo' }),
    })
    await applyHarvestSelections()
    const result = document.getElementById('harvest-result')
    expect(result.innerHTML).toContain('Not a git repo')
  })
})
