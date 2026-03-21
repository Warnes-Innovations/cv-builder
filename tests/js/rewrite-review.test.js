/**
 * tests/js/rewrite-review.test.js
 * Unit tests for web/rewrite-review.js — pure helpers and DOM-driven functions.
 * (fetchAndReviewRewrites / renderRewritePanel require complex DOM+fetch chains
 *  and are covered by integration tests.)
 */
import {
  computeWordDiff,
  renderDiffHtml,
  applyRewriteAction,
  saveRewriteEdit,
  updateRewriteTally,
  submitRewriteDecisions,
} from '../../web/rewrite-review.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  // CSS.escape may not be available or reliable in jsdom — always stub
  vi.stubGlobal('CSS', { escape: s => String(s) })
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('appendLoadingMessage', vi.fn(() => 'loading-handle'))
  vi.stubGlobal('removeLoadingMessage', vi.fn())
  vi.stubGlobal('appendRetryMessage', vi.fn())
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('setLoading', vi.fn())
  vi.stubGlobal('sendAction', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  vi.stubGlobal('parseRewritesResponse', d => d)
  vi.stubGlobal('PHASES', { GENERATION: 'generation' })

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// ── computeWordDiff ───────────────────────────────────────────────────────

describe('computeWordDiff', () => {
  it('returns a single empty-string unchanged token for two empty strings', () => {
    const result = computeWordDiff('', '')
    // tokenize('') returns [''] — one empty string token
    expect(result).toEqual([{ token: '', type: 'unchanged' }])
  })

  it('returns only added tokens for the non-empty side when original is empty', () => {
    const result = computeWordDiff('', 'hello world')
    // tokenize('') produces [''] — the empty token LCS-matches as removed;
    // all non-empty tokens from the proposed side are 'added'
    const addedTokens = result.filter(t => t.type === 'added').map(t => t.token)
    expect(addedTokens).toContain('hello')
    expect(addedTokens).toContain('world')
    // The reconstructed text contains 'hello world'
    const text = result.map(t => t.token).join('')
    expect(text).toContain('hello')
    expect(text).toContain('world')
  })

  it('returns only removed tokens for the non-empty side when proposed is empty', () => {
    const result = computeWordDiff('hello world', '')
    // tokenize('') produces [''] — the empty token LCS-matches as added;
    // all non-empty tokens from the original side are 'removed'
    const removedTokens = result.filter(t => t.type === 'removed').map(t => t.token)
    expect(removedTokens).toContain('hello')
    expect(removedTokens).toContain('world')
    const text = result.map(t => t.token).join('')
    expect(text).toContain('hello')
    expect(text).toContain('world')
  })

  it('returns all unchanged tokens for identical strings', () => {
    const result = computeWordDiff('foo bar baz', 'foo bar baz')
    expect(result.every(t => t.type === 'unchanged')).toBe(true)
    expect(result.map(t => t.token).join('')).toBe('foo bar baz')
  })

  it('handles a simple one-word change', () => {
    const result = computeWordDiff('old', 'new')
    const removed = result.filter(t => t.type === 'removed')
    const added   = result.filter(t => t.type === 'added')
    expect(removed.some(t => t.token === 'old')).toBe(true)
    expect(added.some(t => t.token === 'new')).toBe(true)
  })

  it('handles a multi-word swap preserving unchanged context', () => {
    const result = computeWordDiff('the quick brown fox', 'the slow brown fox')
    const unchanged = result.filter(t => t.type === 'unchanged').map(t => t.token)
    expect(unchanged).toContain('the')
    expect(unchanged).toContain('brown')
    expect(unchanged).toContain('fox')
    const removed = result.filter(t => t.type === 'removed').map(t => t.token)
    const added   = result.filter(t => t.type === 'added').map(t => t.token)
    expect(removed).toContain('quick')
    expect(added).toContain('slow')
  })
})

// ── renderDiffHtml ────────────────────────────────────────────────────────

describe('renderDiffHtml', () => {
  it('wraps removed tokens in <del class="diff-removed">', () => {
    const html = renderDiffHtml([{ token: 'old', type: 'removed' }])
    expect(html).toContain('<del class="diff-removed">old</del>')
  })

  it('wraps added tokens in <ins class="diff-added">', () => {
    const html = renderDiffHtml([{ token: 'new', type: 'added' }])
    expect(html).toContain('<ins class="diff-added">new</ins>')
  })

  it('leaves unchanged tokens as plain escaped text', () => {
    const html = renderDiffHtml([{ token: 'same', type: 'unchanged' }])
    expect(html).toBe('same')
    expect(html).not.toContain('<del')
    expect(html).not.toContain('<ins')
  })

  it('escapes HTML in token content', () => {
    // escapeHtml is stubbed to pass through; real HTML is passed unchanged in tests.
    // Override stub to simulate actual escaping for this test.
    vi.stubGlobal('escapeHtml', s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    const html = renderDiffHtml([{ token: '<b>', type: 'unchanged' }])
    expect(html).toBe('&lt;b&gt;')
  })
})

// ── applyRewriteAction ────────────────────────────────────────────────────

describe('applyRewriteAction', () => {
  // Import the live rewriteDecisions object via a re-import trick:
  // We test side-effects by reading rewriteDecisions from the module.
  // Since the module exports the binding, we need to import it separately.
  let mod

  beforeEach(async () => {
    // Re-import to get a fresh reference each time
    mod = await import('../../web/rewrite-review.js')

    document.body.innerHTML = `
      <div class="rewrite-card" id="rw-card-test1">
        <div id="rw-diff-test1" data-original="old text">old text</div>
        <div id="rw-after-test1" style="display:none">
          <span id="rw-after-text-test1">new text</span>
        </div>
        <button id="rw-accept-test1"></button>
        <button id="rw-edit-test1"></button>
        <button id="rw-reject-test1"></button>
        <strong id="tally-accepted">0</strong>
        <strong id="tally-rejected">0</strong>
        <strong id="tally-pending">0</strong>
      </div>
    `
    // Reset module-level rewriteDecisions by calling applyRewriteAction will update it
  })

  it('stores { outcome: accept, final_text: null } in rewriteDecisions on accept', () => {
    applyRewriteAction('test1', 'accept')
    expect(mod.rewriteDecisions['test1']).toEqual({ outcome: 'accept', final_text: null })
  })

  it('stores { outcome: reject, final_text: null } in rewriteDecisions on reject', () => {
    applyRewriteAction('test1', 'reject')
    expect(mod.rewriteDecisions['test1']).toEqual({ outcome: 'reject', final_text: null })
  })

  it('adds accepted class to card on accept', () => {
    applyRewriteAction('test1', 'accept')
    const card = document.getElementById('rw-card-test1')
    expect(card.classList.contains('accepted')).toBe(true)
  })

  it('adds rejected class to card on reject', () => {
    applyRewriteAction('test1', 'reject')
    const card = document.getElementById('rw-card-test1')
    expect(card.classList.contains('rejected')).toBe(true)
  })

  it('on edit: shows the textarea and hides the diff', () => {
    applyRewriteAction('test1', 'edit')
    const afterEl = document.getElementById('rw-after-test1')
    const diffEl  = document.getElementById('rw-diff-test1')
    expect(afterEl.style.display).toBe('block')
    expect(diffEl.style.display).toBe('none')
  })

  it('does not throw when card is absent', () => {
    expect(() => applyRewriteAction('nonexistent-id', 'accept')).not.toThrow()
  })
})

// ── saveRewriteEdit ───────────────────────────────────────────────────────

describe('saveRewriteEdit', () => {
  let mod

  beforeEach(async () => {
    mod = await import('../../web/rewrite-review.js')

    document.body.innerHTML = `
      <div class="rewrite-card" id="rw-card-edit1">
        <div id="rw-diff-edit1" data-original="original text">original text</div>
        <div id="rw-after-edit1" style="display:block">
          <textarea id="rw-textarea-edit1">edited text</textarea>
        </div>
        <button id="rw-accept-edit1"></button>
        <button id="rw-edit-edit1"></button>
        <button id="rw-reject-edit1"></button>
        <strong id="tally-accepted">0</strong>
        <strong id="tally-rejected">0</strong>
        <strong id="tally-pending">0</strong>
      </div>
    `
  })

  it('stores { outcome: edit, final_text: <value> } in rewriteDecisions', () => {
    saveRewriteEdit('edit1')
    expect(mod.rewriteDecisions['edit1']).toEqual({ outcome: 'edit', final_text: 'edited text' })
  })

  it('adds accepted class to card', () => {
    saveRewriteEdit('edit1')
    const card = document.getElementById('rw-card-edit1')
    expect(card.classList.contains('accepted')).toBe(true)
  })

  it('does not throw when card is absent', () => {
    expect(() => saveRewriteEdit('nonexistent-id')).not.toThrow()
  })
})

// ── updateRewriteTally ────────────────────────────────────────────────────

describe('updateRewriteTally', () => {
  let mod

  beforeEach(async () => {
    mod = await import('../../web/rewrite-review.js')
  })

  function setupTallyDOM(cardIds) {
    const cards = cardIds.map(id => `
      <div class="rewrite-card" id="rw-card-${id}"></div>
    `).join('')
    document.body.innerHTML = `
      ${cards}
      <strong id="tally-accepted">0</strong>
      <strong id="tally-rejected">0</strong>
      <strong id="tally-pending">0</strong>
      <button id="submit-rewrites-btn" disabled></button>
    `
  }

  it('counts pending correctly when no decisions made', () => {
    setupTallyDOM(['a', 'b', 'c'])
    // Clear any prior decisions
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    updateRewriteTally()
    expect(document.getElementById('tally-pending').textContent).toBe('3')
    expect(document.getElementById('tally-accepted').textContent).toBe('0')
    expect(document.getElementById('tally-rejected').textContent).toBe('0')
  })

  it('counts accepted and rejected correctly', () => {
    setupTallyDOM(['x', 'y', 'z'])
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['x'] = { outcome: 'accept', final_text: null }
    mod.rewriteDecisions['y'] = { outcome: 'reject', final_text: null }
    updateRewriteTally()
    expect(document.getElementById('tally-accepted').textContent).toBe('1')
    expect(document.getElementById('tally-rejected').textContent).toBe('1')
    expect(document.getElementById('tally-pending').textContent).toBe('1')
  })

  it('enables submit button when no pending cards remain', () => {
    setupTallyDOM(['p', 'q'])
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['p'] = { outcome: 'accept', final_text: null }
    mod.rewriteDecisions['q'] = { outcome: 'reject', final_text: null }
    updateRewriteTally()
    const btn = document.getElementById('submit-rewrites-btn')
    expect(btn.disabled).toBe(false)
  })

  it('disables submit button when there are pending cards', () => {
    setupTallyDOM(['r', 's'])
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['r'] = { outcome: 'accept', final_text: null }
    // 's' has no decision — still pending
    updateRewriteTally()
    const btn = document.getElementById('submit-rewrites-btn')
    expect(btn.disabled).toBe(true)
  })

  it('counts edit outcome as accepted', () => {
    setupTallyDOM(['e1'])
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['e1'] = { outcome: 'edit', final_text: 'some text' }
    updateRewriteTally()
    expect(document.getElementById('tally-accepted').textContent).toBe('1')
    expect(document.getElementById('tally-pending').textContent).toBe('0')
  })
})

// ── submitRewriteDecisions (mock fetch) ───────────────────────────────────

describe('submitRewriteDecisions', () => {
  let mod

  beforeEach(async () => {
    mod = await import('../../web/rewrite-review.js')
    // Set up minimal DOM for the function
    document.body.innerHTML = ''
  })

  it('calls POST /api/rewrites/approve', async () => {
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['id1'] = { outcome: 'accept', final_text: null }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ approved_count: 1, rejected_count: 0 }),
    })

    await submitRewriteDecisions()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/rewrites/approve',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls appendMessage on success', async () => {
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['id1'] = { outcome: 'accept', final_text: null }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ approved_count: 1, rejected_count: 0 }),
    })

    await submitRewriteDecisions()
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('1 accepted'))
  })

  it('calls switchTab("spell") on success', async () => {
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['id1'] = { outcome: 'reject', final_text: null }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ approved_count: 0, rejected_count: 1 }),
    })

    await submitRewriteDecisions()
    expect(globalThis.switchTab).toHaveBeenCalledWith('spell')
  })

  it('shows error via appendRetryMessage on API failure', async () => {
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['id1'] = { outcome: 'accept', final_text: null }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })

    await submitRewriteDecisions()
    expect(globalThis.appendRetryMessage).toHaveBeenCalledWith(
      expect.stringContaining('Server error'),
      expect.any(Function)
    )
  })

  it('shows error via appendRetryMessage on network failure', async () => {
    Object.keys(mod.rewriteDecisions).forEach(k => delete mod.rewriteDecisions[k])
    mod.rewriteDecisions['id1'] = { outcome: 'accept', final_text: null }

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    await submitRewriteDecisions()
    expect(globalThis.appendRetryMessage).toHaveBeenCalledWith(
      expect.stringContaining('network down'),
      expect.any(Function)
    )
  })
})
