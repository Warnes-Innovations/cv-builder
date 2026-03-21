/**
 * tests/js/workflow-steps.test.js
 * Unit tests for web/workflow-steps.js — constants, bullet reorder DOM,
 * highlight changed items, markChanged, backToPhase, reRunPhase.
 */
import {
  _STEP_ORDER,
  _STEP_DISPLAY,
  _ACTION_LABELS,
  _markChanged,
  _highlightChangedItems,
  _applyBulletOrder,
  moveBullet,
  _updateBulletArrows,
  backToPhase,
  reRunPhase,
} from '../../web/workflow-steps.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('appendLoadingMessage', vi.fn(() => 'msg'))
  vi.stubGlobal('removeLoadingMessage', vi.fn())
  vi.stubGlobal('appendRetryMessage', vi.fn())
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('setLoading', vi.fn())
  vi.stubGlobal('fetchStatus', vi.fn(async () => {}))
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('CSS', { escape: s => String(s) })
  vi.stubGlobal('trapFocus', vi.fn())
  vi.stubGlobal('restoreFocus', vi.fn())
  vi.stubGlobal('_focusedElementBeforeModal', null)

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// ── Constants ─────────────────────────────────────────────────────────────

describe('_STEP_ORDER', () => {
  it('has 8 steps in the correct order', () => {
    expect(_STEP_ORDER).toEqual([
      'job', 'analysis', 'customizations', 'rewrite', 'spell',
      'generate', 'layout', 'finalise',
    ])
  })
})

describe('_STEP_DISPLAY', () => {
  it('has an entry for every step in _STEP_ORDER', () => {
    _STEP_ORDER.forEach(step => {
      expect(_STEP_DISPLAY).toHaveProperty(step)
    })
  })
})

describe('_ACTION_LABELS', () => {
  it('contains recommend_customizations', () => {
    expect(_ACTION_LABELS).toHaveProperty('recommend_customizations')
  })

  it('contains generate_cv', () => {
    expect(_ACTION_LABELS).toHaveProperty('generate_cv')
  })
})

// ── _markChanged ──────────────────────────────────────────────────────────

describe('_markChanged', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('sets data-changed attribute immediately', () => {
    document.body.innerHTML = '<div id="rw-card-test"></div>'
    const el = document.getElementById('rw-card-test')
    _markChanged(el)
    expect(el.getAttribute('data-changed')).toBe('true')
  })

  it('removes data-changed after 2500ms', () => {
    document.body.innerHTML = '<div id="rw-card-test"></div>'
    const el = document.getElementById('rw-card-test')
    _markChanged(el)
    vi.advanceTimersByTime(2500)
    expect(el.getAttribute('data-changed')).toBeNull()
  })
})

// ── _highlightChangedItems — rewrite step ─────────────────────────────────

describe('_highlightChangedItems (rewrite step)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('marks a new rewrite card as changed', () => {
    document.body.innerHTML = '<div id="rw-card-rw1"></div>'
    const priorOutput = { pending_rewrites: [] }
    const newOutput   = { pending_rewrites: [{ id: 'rw1', proposed: 'New text' }] }
    _highlightChangedItems('rewrite', priorOutput, newOutput)
    const el = document.getElementById('rw-card-rw1')
    expect(el.getAttribute('data-changed')).toBe('true')
  })

  it('marks a rewrite card as changed when proposed text changes', () => {
    document.body.innerHTML = '<div id="rw-card-rw1"></div>'
    const priorOutput = { pending_rewrites: [{ id: 'rw1', proposed: 'Old text' }] }
    const newOutput   = { pending_rewrites: [{ id: 'rw1', proposed: 'New text' }] }
    _highlightChangedItems('rewrite', priorOutput, newOutput)
    expect(document.getElementById('rw-card-rw1').getAttribute('data-changed')).toBe('true')
  })

  it('does not mark unchanged rewrite cards', () => {
    document.body.innerHTML = '<div id="rw-card-rw1"></div>'
    const priorOutput = { pending_rewrites: [{ id: 'rw1', proposed: 'Same text' }] }
    const newOutput   = { pending_rewrites: [{ id: 'rw1', proposed: 'Same text' }] }
    _highlightChangedItems('rewrite', priorOutput, newOutput)
    expect(document.getElementById('rw-card-rw1').getAttribute('data-changed')).toBeNull()
  })

  it('does nothing for analysis step (no per-entity targeting)', () => {
    document.body.innerHTML = '<div id="rw-card-rw1"></div>'
    expect(() => _highlightChangedItems('analysis', {}, {})).not.toThrow()
  })
})

// ── _applyBulletOrder ─────────────────────────────────────────────────────

describe('_applyBulletOrder', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ol id="bullet-reorder-list">
        <li data-orig-index="0"><button></button><button></button><span>Bullet A</span></li>
        <li data-orig-index="1"><button></button><button></button><span>Bullet B</span></li>
        <li data-orig-index="2"><button></button><button></button><span>Bullet C</span></li>
      </ol>`
  })

  it('reorders items to match the provided order', () => {
    _applyBulletOrder([2, 0, 1])
    const items = document.querySelectorAll('#bullet-reorder-list li')
    expect(items[0].dataset.origIndex).toBe('2')
    expect(items[1].dataset.origIndex).toBe('0')
    expect(items[2].dataset.origIndex).toBe('1')
  })

  it('appends unlisted items at the end', () => {
    _applyBulletOrder([1])
    const items = document.querySelectorAll('#bullet-reorder-list li')
    expect(items[0].dataset.origIndex).toBe('1')
    // 0 and 2 appended after, in original DOM order
    const remaining = [items[1].dataset.origIndex, items[2].dataset.origIndex].sort()
    expect(remaining).toEqual(['0', '2'])
  })

  it('does nothing when list is absent', () => {
    document.body.innerHTML = ''
    expect(() => _applyBulletOrder([0, 1])).not.toThrow()
  })
})

// ── moveBullet ────────────────────────────────────────────────────────────

describe('moveBullet', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ol id="bullet-reorder-list">
        <li data-orig-index="0">
          <button title="Move up">↑</button>
          <button title="Move down">↓</button>
          <span>A</span>
        </li>
        <li data-orig-index="1">
          <button title="Move up">↑</button>
          <button title="Move down">↓</button>
          <span>B</span>
        </li>
        <li data-orig-index="2">
          <button title="Move up">↑</button>
          <button title="Move down">↓</button>
          <span>C</span>
        </li>
      </ol>`
  })

  it('moves item up when direction is -1', () => {
    const upBtn = document.querySelector('li[data-orig-index="1"] button[title="Move up"]')
    moveBullet(upBtn, -1)
    const items = document.querySelectorAll('#bullet-reorder-list li')
    expect(items[0].dataset.origIndex).toBe('1')
    expect(items[1].dataset.origIndex).toBe('0')
  })

  it('moves item down when direction is +1', () => {
    const downBtn = document.querySelector('li[data-orig-index="1"] button[title="Move down"]')
    moveBullet(downBtn, +1)
    const items = document.querySelectorAll('#bullet-reorder-list li')
    expect(items[1].dataset.origIndex).toBe('2')
    expect(items[2].dataset.origIndex).toBe('1')
  })

  it('does not move first item up', () => {
    const upBtn = document.querySelector('li[data-orig-index="0"] button[title="Move up"]')
    moveBullet(upBtn, -1)
    const items = document.querySelectorAll('#bullet-reorder-list li')
    expect(items[0].dataset.origIndex).toBe('0')
  })

  it('does not move last item down', () => {
    const downBtn = document.querySelector('li[data-orig-index="2"] button[title="Move down"]')
    moveBullet(downBtn, +1)
    const items = document.querySelectorAll('#bullet-reorder-list li')
    expect(items[2].dataset.origIndex).toBe('2')
  })
})

// ── _updateBulletArrows ───────────────────────────────────────────────────

describe('_updateBulletArrows', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ol id="bullet-reorder-list">
        <li><button>↑</button><button>↓</button></li>
        <li><button>↑</button><button>↓</button></li>
        <li><button>↑</button><button>↓</button></li>
      </ol>`
  })

  it('disables up button on first item', () => {
    _updateBulletArrows()
    const firstUpBtn = document.querySelectorAll('li')[0].querySelectorAll('button')[0]
    expect(firstUpBtn.disabled).toBe(true)
  })

  it('disables down button on last item', () => {
    _updateBulletArrows()
    const items = document.querySelectorAll('li')
    const lastDownBtn = items[items.length - 1].querySelectorAll('button')[1]
    expect(lastDownBtn.disabled).toBe(true)
  })

  it('does not disable middle item buttons', () => {
    _updateBulletArrows()
    const middleItem = document.querySelectorAll('li')[1]
    const [upBtn, downBtn] = middleItem.querySelectorAll('button')
    expect(upBtn.disabled).toBe(false)
    expect(downBtn.disabled).toBe(false)
  })

  it('does nothing when list is absent', () => {
    document.body.innerHTML = ''
    expect(() => _updateBulletArrows()).not.toThrow()
  })
})

// ── backToPhase ───────────────────────────────────────────────────────────

describe('backToPhase', () => {
  it('posts to /api/back-to-phase', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, phase: 'customization' })
    })
    await backToPhase('customizations')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/back-to-phase', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('appends message on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, phase: 'customization' })
    })
    await backToPhase('customizations')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('customizations'))
  })

  it('calls appendRetryMessage on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: 'Not allowed' })
    })
    await backToPhase('customizations')
    expect(globalThis.appendRetryMessage).toHaveBeenCalled()
  })

  it('calls appendRetryMessage on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await backToPhase('customizations')
    expect(globalThis.appendRetryMessage).toHaveBeenCalled()
  })

  it('switches to the appropriate tab on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, phase: 'customization' })
    })
    await backToPhase('analysis')
    expect(globalThis.switchTab).toHaveBeenCalledWith('analysis')
  })
})

// ── reRunPhase ────────────────────────────────────────────────────────────

describe('reRunPhase', () => {
  it('posts to /api/re-run-phase', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true })
    })
    await reRunPhase('analysis')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/re-run-phase', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('appends success message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true })
    })
    await reRunPhase('analysis')
    expect(globalThis.appendMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('re-run complete'))
  })

  it('switches to appropriate tab on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true })
    })
    await reRunPhase('rewrite')
    expect(globalThis.switchTab).toHaveBeenCalledWith('rewrite')
  })

  it('calls appendRetryMessage on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, error: 'Failed' })
    })
    await reRunPhase('analysis')
    expect(globalThis.appendRetryMessage).toHaveBeenCalled()
  })

  it('calls appendRetryMessage on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await reRunPhase('analysis')
    expect(globalThis.appendRetryMessage).toHaveBeenCalled()
  })
})
