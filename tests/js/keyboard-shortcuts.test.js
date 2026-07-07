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

import { initKeyboardShortcuts } from '../../web/keyboard-shortcuts.js'

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
