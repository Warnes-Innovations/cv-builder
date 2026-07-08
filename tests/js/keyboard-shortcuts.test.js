// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/keyboard-shortcuts.test.js
 * Covers the Ctrl+Z / Ctrl+Shift+Z Master CV undo/redo scoping added for
 * GAP-19 16.8 — must only fire when the Master CV modal is open, no nested
 * sub-modal (e.g. backup history) is stacked on top, and focus isn't in a
 * text field (native browser text-undo must keep working there).
 */

import { initKeyboardShortcuts, showKeyboardShortcutsPanel } from '../../web/keyboard-shortcuts.js'

let undoMock
let redoMock

beforeEach(() => {
  document.body.innerHTML = ''
  undoMock = vi.fn()
  redoMock = vi.fn()
  vi.stubGlobal('undoMasterDataChange', undoMock)
  vi.stubGlobal('redoMasterDataChange', redoMock)
  initKeyboardShortcuts()
})

afterEach(() => {
  document.body.innerHTML = ''
})

function fireCtrlZ({ shift = false } = {}) {
  const evt = new KeyboardEvent('keydown', {
    key: shift ? 'Z' : 'z',
    ctrlKey: true,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(evt)
}

function buildMasterModal(display = 'flex') {
  const overlay = document.createElement('div')
  overlay.id = 'master-cv-modal-overlay'
  overlay.style.display = display
  document.body.appendChild(overlay)
  return overlay
}

describe('Ctrl+Z / Ctrl+Shift+Z master-cv undo/redo scoping', () => {
  it('does nothing when the Master CV modal is not present at all', () => {
    fireCtrlZ()
    expect(undoMock).not.toHaveBeenCalled()
  })

  it('does nothing when the Master CV modal element exists but is hidden', () => {
    buildMasterModal('none')
    fireCtrlZ()
    expect(undoMock).not.toHaveBeenCalled()
  })

  it('calls undoMasterDataChange when the modal is open and focus is not in a text field', () => {
    buildMasterModal()
    fireCtrlZ()
    expect(undoMock).toHaveBeenCalledTimes(1)
    expect(redoMock).not.toHaveBeenCalled()
  })

  it('calls redoMasterDataChange on Ctrl+Shift+Z', () => {
    buildMasterModal()
    fireCtrlZ({ shift: true })
    expect(redoMock).toHaveBeenCalledTimes(1)
    expect(undoMock).not.toHaveBeenCalled()
  })

  it('does not fire when focus is in a text field (native undo must win)', () => {
    buildMasterModal()
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    fireCtrlZ()

    expect(undoMock).not.toHaveBeenCalled()
  })

  it('does not fire when a nested backup-history modal is stacked on top', () => {
    buildMasterModal()
    const backupOverlay = document.createElement('div')
    backupOverlay.id = 'backup-history-overlay'
    document.body.appendChild(backupOverlay)

    fireCtrlZ()

    expect(undoMock).not.toHaveBeenCalled()
  })
})

describe('showKeyboardShortcutsPanel Getting Started entry point (GAP-385)', () => {
  let welcomeMock

  beforeEach(() => {
    document.body.innerHTML = ''
    welcomeMock = vi.fn()
    vi.stubGlobal('showWelcomeModal', welcomeMock)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('showWelcomeModal', undefined)
  })

  it('renders a Getting Started Guide button in the panel', () => {
    showKeyboardShortcutsPanel()
    const btn = document.getElementById('kb-shortcuts-getting-started')
    expect(btn).not.toBeNull()
    showKeyboardShortcutsPanel() // close it (toggle) to avoid leaking into other tests
  })

  it('calls showWelcomeModal and closes the panel when clicked', () => {
    showKeyboardShortcutsPanel()
    const btn = document.getElementById('kb-shortcuts-getting-started')
    btn.click()
    expect(welcomeMock).toHaveBeenCalledTimes(1)
    expect(document.getElementById('kb-shortcuts-panel')).toBeNull()
  })
})

describe('showKeyboardShortcutsPanel focus management (GAP-384/385 cycle-105)', () => {
  let pushMock, trapMock, initMock, restoreMock

  beforeEach(() => {
    document.body.innerHTML = ''
    pushMock    = vi.fn()
    trapMock    = vi.fn()
    initMock    = vi.fn()
    restoreMock = vi.fn()
    vi.stubGlobal('pushFocusStack', pushMock)
    vi.stubGlobal('trapFocus', trapMock)
    vi.stubGlobal('setInitialFocus', initMock)
    vi.stubGlobal('restoreFocus', restoreMock)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('pushFocusStack', undefined)
    vi.stubGlobal('trapFocus', undefined)
    vi.stubGlobal('setInitialFocus', undefined)
    vi.stubGlobal('restoreFocus', undefined)
  })

  it('pushes onto the shared focus stack and traps focus when opened', () => {
    showKeyboardShortcutsPanel()
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(initMock).toHaveBeenCalledWith('kb-shortcuts-panel')
    expect(trapMock).toHaveBeenCalledWith('kb-shortcuts-panel')
    showKeyboardShortcutsPanel() // close it (toggle) to avoid leaking into other tests
  })

  it('restores focus when closed via the ✕ button', () => {
    showKeyboardShortcutsPanel()
    document.getElementById('kb-shortcuts-close').click()
    expect(restoreMock).toHaveBeenCalledTimes(1)
    expect(document.getElementById('kb-shortcuts-panel')).toBeNull()
  })

  it('restores focus and closes when Escape is pressed, despite the panel\'s own text promising it', () => {
    showKeyboardShortcutsPanel()
    const panel = document.getElementById('kb-shortcuts-panel')
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(restoreMock).toHaveBeenCalledTimes(1)
    expect(document.getElementById('kb-shortcuts-panel')).toBeNull()
  })

  it('restores focus when toggled closed via a second call (the ? shortcut path)', () => {
    showKeyboardShortcutsPanel()
    showKeyboardShortcutsPanel()
    expect(restoreMock).toHaveBeenCalledTimes(1)
    expect(document.getElementById('kb-shortcuts-panel')).toBeNull()
  })
})
