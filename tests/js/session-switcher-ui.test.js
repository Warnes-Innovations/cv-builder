// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/session-switcher-ui.test.js
 * Unit tests for web/session-switcher-ui.js — render helpers, modal open/close,
 * rename/delete actions, trash view, conflict banner, retry/dismiss.
 */
import {
  _conflictRetryQueue,
  _renderActiveSessionRows,
  _renderSavedSessionRows,
  _renderSessionSwitcherSections,
  _updateSessionSwitcherHeader,
  showOwnershipConflictDialog,
  closeOwnershipConflictDialog,
  openSessionsModal,
  closeSessionsModal,
  _renderSessionsModalBody,
  loadSessionAndCloseModal,
  newSessionFromModal,
  startSessionModalRename,
  cancelSessionModalRename,
  submitSessionModalRename,
  _deleteSessionFromModal,
  _refreshTrashBadge,
  openTrashView,
  closeTrashView,
  _renderTrashView,
  restoreFromTrash,
  deleteForever,
  emptyTrash,
  showSessionConflictBanner,
  conflictRetryNow,
  conflictDismiss,
} from '../../web/session-switcher-ui.js'

// ── Global stubs ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('CSS', { escape: s => s })
  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('formatSessionPhaseLabel', s => s || 'unknown')
  vi.stubGlobal('formatSessionTimestamp', s => s || '')
  vi.stubGlobal('buildSessionSwitcherLabel', () => 'Test Job')
  vi.stubGlobal('getActiveSessionOwnershipMeta', (_s, _opts) => ({ isCurrent: false, className: 'other', label: 'Other' }))
  vi.stubGlobal('_getCurrentSessionIdValue', () => 'sess-1')
  vi.stubGlobal('parseSessionListResponse', d => d)
  vi.stubGlobal('loadSessionFile', vi.fn())
  vi.stubGlobal('createNewSessionAndNavigate', vi.fn())
  vi.stubGlobal('fetchStatus', vi.fn())
  vi.stubGlobal('setInitialFocus', vi.fn())
  vi.stubGlobal('trapFocus', vi.fn())
  vi.stubGlobal('restoreFocus', vi.fn())
  vi.stubGlobal('confirmDialog', vi.fn().mockResolvedValue(true))
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// ── _renderActiveSessionRows ──────────────────────────────────────────────────

describe('_renderActiveSessionRows', () => {
  it('returns empty message when no sessions', () => {
    expect(_renderActiveSessionRows([])).toContain('No active in-memory sessions')
  })

  it('renders a row per session', () => {
    const html = _renderActiveSessionRows([
      { session_id: 's1', position_name: 'Engineer', phase: 'analysis', created: '', last_modified: '' },
      { session_id: 's2', position_name: 'Manager',  phase: 'rewrite',  created: '', last_modified: '' },
    ])
    expect(html).toContain('Engineer')
    expect(html).toContain('Manager')
  })

  it('marks current session as non-linkable', () => {
    vi.stubGlobal('getActiveSessionOwnershipMeta', () => ({ isCurrent: true, className: 'current', label: 'Current' }))
    const html = _renderActiveSessionRows([
      { session_id: 'sess-1', position_name: 'My Job', phase: 'analysis', created: '', last_modified: '' },
    ])
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('Current')
  })
})

// ── _renderSavedSessionRows ───────────────────────────────────────────────────

describe('_renderSavedSessionRows', () => {
  it('returns empty message when no sessions', () => {
    expect(_renderSavedSessionRows([])).toContain('No saved sessions found')
  })

  it('parses and displays creation date from session directory name', () => {
    const formatter = vi.fn(s => `FMT:${s || ''}`)
    vi.stubGlobal('formatSessionTimestamp', formatter)

    const html = _renderSavedSessionRows([
      {
        path: '/tmp/sessions/session_20260331_082933/session.json',
        position_name: 'Saved Job',
        phase: 'rewrite',
        timestamp: '',
      },
    ])

    expect(formatter).toHaveBeenCalledWith('2026-03-31T08:29:33Z')
    expect(html).toContain('Created FMT:2026-03-31T08:29:33Z')
  })

  it('renders rename/delete buttons when includeManagement=true', () => {
    const html = _renderSavedSessionRows(
      [{ path: '/tmp/s.json', position_name: 'Saved Job', phase: 'rewrite', timestamp: '' }],
      { includeManagement: true }
    )
    expect(html).toContain('data-sm-action="rename"')
    expect(html).toContain('data-sm-action="delete"')
  })

  it('omits management buttons when includeManagement=false', () => {
    const html = _renderSavedSessionRows(
      [{ path: '/tmp/s.json', position_name: 'Saved Job', phase: 'rewrite', timestamp: '' }],
      { includeManagement: false }
    )
    expect(html).not.toContain('data-sm-action="rename"')
  })
})

// ── _renderSessionSwitcherSections ────────────────────────────────────────────

describe('_renderSessionSwitcherSections', () => {
  it('renders both Active and Saved sections', () => {
    const html = _renderSessionSwitcherSections([], [])
    expect(html).toContain('Active Sessions')
    expect(html).toContain('Saved Sessions')
  })

  it('shows management note when includeSavedManagement=true', () => {
    const html = _renderSessionSwitcherSections([], [], { includeSavedManagement: true })
    expect(html).toContain('rename')
  })
})

// ── _updateSessionSwitcherHeader ──────────────────────────────────────────────

describe('_updateSessionSwitcherHeader', () => {
  it('sets switcher label text', () => {
    document.body.innerHTML = `
      <span id="session-switcher-label"></span>
      <button id="session-switcher-btn"></button>
      <span id="header-session-name"></span>`
    _updateSessionSwitcherHeader({})
    expect(document.getElementById('session-switcher-label').textContent).toBe('Test Job')
  })

  it('sets session-active class when session exists', () => {
    document.body.innerHTML = `
      <span id="session-switcher-label"></span>
      <button id="session-switcher-btn"></button>
      <span id="header-session-name"></span>`
    _updateSessionSwitcherHeader({})
    expect(document.getElementById('session-switcher-btn').classList.contains('is-session-active')).toBe(true)
  })
})

// ── showOwnershipConflictDialog ───────────────────────────────────────────────

describe('showOwnershipConflictDialog', () => {
  function setupOwnershipDom() {
    document.body.innerHTML = `
      <div id="ownership-conflict-overlay" style="display:none;">
        <p id="ownership-conflict-message"></p>
        <button id="ownership-load-different-btn"></button>
        <button id="ownership-new-session-btn"></button>
        <button id="ownership-takeover-btn"></button>
      </div>`
  }

  it('shows overlay', async () => {
    setupOwnershipDom()
    const p = showOwnershipConflictDialog('Test conflict')
    document.getElementById('ownership-load-different-btn').onclick()
    await p
    // overlay should have been shown (display=flex) then hidden by cleanup
    expect(document.getElementById('ownership-conflict-overlay').style.display).toBe('none')
  })

  it('resolves with "different" when load-different clicked', async () => {
    setupOwnershipDom()
    const p = showOwnershipConflictDialog()
    document.getElementById('ownership-load-different-btn').click()
    expect(await p).toBe('different')
  })

  it('resolves with "new" when new-session clicked', async () => {
    setupOwnershipDom()
    const p = showOwnershipConflictDialog()
    document.getElementById('ownership-new-session-btn').click()
    expect(await p).toBe('new')
  })

  it('resolves with "takeover" when takeover clicked', async () => {
    setupOwnershipDom()
    const p = showOwnershipConflictDialog()
    document.getElementById('ownership-takeover-btn').click()
    expect(await p).toBe('takeover')
  })

  it('resolves "different" immediately when overlay elements absent', async () => {
    const result = await showOwnershipConflictDialog()
    expect(result).toBe('different')
  })
})

// ── closeOwnershipConflictDialog ──────────────────────────────────────────────

describe('closeOwnershipConflictDialog', () => {
  it('hides overlay when present', () => {
    document.body.innerHTML = '<div id="ownership-conflict-overlay" style="display:flex;"></div>'
    closeOwnershipConflictDialog()
    expect(document.getElementById('ownership-conflict-overlay').style.display).toBe('none')
  })

  it('does not throw when overlay absent', () => {
    expect(() => closeOwnershipConflictDialog()).not.toThrow()
  })
})

// ── openSessionsModal / closeSessionsModal ────────────────────────────────────

describe('openSessionsModal / closeSessionsModal', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sessions-modal-overlay" style="display:none;">
        <div id="sessions-modal-body"></div>
      </div>`
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ sessions: [] }),
    })
  })

  it('shows overlay on open', async () => {
    await openSessionsModal()
    expect(document.getElementById('sessions-modal-overlay').style.display).toBe('flex')
  })

  it('calls trapFocus', async () => {
    await openSessionsModal()
    expect(globalThis.trapFocus).toHaveBeenCalledWith('sessions-modal-overlay')
  })

  it('hides overlay on close', async () => {
    await openSessionsModal()
    closeSessionsModal()
    expect(document.getElementById('sessions-modal-overlay').style.display).toBe('none')
  })

  it('calls restoreFocus on close', async () => {
    await openSessionsModal()
    closeSessionsModal()
    expect(globalThis.restoreFocus).toHaveBeenCalled()
  })
})

// ── startSessionModalRename / cancelSessionModalRename ────────────────────────

describe('startSessionModalRename / cancelSessionModalRename', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sm-rename-0" style="display:none;">
        <input id="sm-input-0" value="Old Name" />
      </div>`
  })

  it('shows rename form on start', () => {
    startSessionModalRename('/tmp/s.json', 0)
    expect(document.getElementById('sm-rename-0').style.display).toBe('flex')
  })

  it('hides rename form on cancel', () => {
    startSessionModalRename('/tmp/s.json', 0)
    cancelSessionModalRename(0)
    expect(document.getElementById('sm-rename-0').style.display).toBe('none')
  })
})

// ── submitSessionModalRename ──────────────────────────────────────────────────

describe('submitSessionModalRename', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="sm-input-0" value="New Name" />
      <div id="sm-rename-0" style="display:flex;"></div>
      <strong id="sm-name-0">Old Name</strong>`
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true }),
    })
  })

  it('posts to /api/rename-session', async () => {
    await submitSessionModalRename('/tmp/s.json', 0)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/rename-session', expect.objectContaining({ method: 'POST' }))
  })

  it('updates name element on success', async () => {
    await submitSessionModalRename('/tmp/s.json', 0)
    expect(document.getElementById('sm-name-0').textContent).toBe('New Name')
  })
})

// ── _refreshTrashBadge ────────────────────────────────────────────────────────

describe('_refreshTrashBadge', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="sessions-trash-btn">🗑 Trash</button>'
  })

  it('shows count when trash has items', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ items: [{ path: 'a' }, { path: 'b' }] }),
    })
    await _refreshTrashBadge()
    expect(document.getElementById('sessions-trash-btn').textContent).toBe('🗑 Trash (2)')
  })

  it('shows plain label when trash empty', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ items: [] }),
    })
    await _refreshTrashBadge()
    expect(document.getElementById('sessions-trash-btn').textContent).toBe('🗑 Trash')
  })
})

// ── restoreFromTrash ──────────────────────────────────────────────────────────

describe('restoreFromTrash', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sessions-modal-body"></div><button id="sessions-trash-btn">🗑 Trash</button>'
  })

  it('posts to /api/trash/restore', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, items: [] }),
    })
    await restoreFromTrash('/tmp/s.json')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/trash/restore', expect.objectContaining({ method: 'POST' }))
  })
})

// ── deleteForever ─────────────────────────────────────────────────────────────

describe('deleteForever', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sessions-modal-body"></div><button id="sessions-trash-btn">🗑 Trash</button>'
  })

  it('does not call fetch when user cancels', async () => {
    vi.stubGlobal('confirmDialog', vi.fn().mockResolvedValue(false))
    await deleteForever('/tmp/s.json')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('posts to /api/trash/delete on confirm', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, items: [] }),
    })
    await deleteForever('/tmp/s.json')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/trash/delete', expect.objectContaining({ method: 'POST' }))
  })
})

// ── emptyTrash ────────────────────────────────────────────────────────────────

describe('emptyTrash', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sessions-modal-body"></div><button id="sessions-trash-btn">🗑 Trash</button>'
  })

  it('does not call fetch when user cancels', async () => {
    vi.stubGlobal('confirmDialog', vi.fn().mockResolvedValue(false))
    await emptyTrash()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('posts to /api/trash/empty on confirm', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, items: [] }),
    })
    await emptyTrash()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/trash/empty', expect.objectContaining({ method: 'POST' }))
  })
})

// ── showSessionConflictBanner / conflictRetryNow / conflictDismiss ────────────

describe('showSessionConflictBanner', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="session-conflict-banner" style="display:none;">
        <span id="conflict-banner-text"></span>
        <span id="conflict-countdown"></span>
      </div>`
  })

  afterEach(() => {
    // Always dismiss to clear any interval
    conflictDismiss()
  })

  it('shows banner', () => {
    showSessionConflictBanner()
    expect(document.getElementById('session-conflict-banner').style.display).toBe('block')
  })

  it('sets countdown text', () => {
    showSessionConflictBanner()
    expect(document.getElementById('conflict-countdown').textContent).toContain('30s')
  })
})

describe('conflictRetryNow', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="session-conflict-banner" style="display:block;"></div>'
  })

  it('hides banner', () => {
    conflictRetryNow()
    expect(document.getElementById('session-conflict-banner').style.display).toBe('none')
  })

  it('drains retry queue with true', () => {
    const cb = vi.fn()
    _conflictRetryQueue.push(cb)
    conflictRetryNow()
    expect(cb).toHaveBeenCalledWith(true)
    expect(_conflictRetryQueue.length).toBe(0)
  })
})

describe('conflictDismiss', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="session-conflict-banner" style="display:block;"></div>'
  })

  it('hides banner', () => {
    conflictDismiss()
    expect(document.getElementById('session-conflict-banner').style.display).toBe('none')
  })

  it('drains retry queue with false', () => {
    const cb = vi.fn()
    _conflictRetryQueue.push(cb)
    conflictDismiss()
    expect(cb).toHaveBeenCalledWith(false)
    expect(_conflictRetryQueue.length).toBe(0)
  })
})
