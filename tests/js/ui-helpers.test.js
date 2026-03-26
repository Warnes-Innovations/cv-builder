// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/ui-helpers.test.js
 * Unit tests for web/ui-helpers.js — toast, modals, toggleChat, updateActionButtons.
 */
import {
  showToast,
  showAlertModal, closeAlertModal,
  showConfirmModal, closeConfirmModal,
  toggleChat,
  updateActionButtons,
} from '../../web/ui-helpers.js'
import { stateManager } from '../../web/state-manager.js'

// ── DOM fixture helpers ───────────────────────────────────────────────────

function buildAlertModal() {
  document.body.innerHTML += `
    <div id="alert-modal-overlay" style="display:none">
      <div id="alert-modal-title"></div>
      <div id="alert-modal-message"></div>
    </div>`
}

function buildConfirmModal() {
  document.body.innerHTML += `
    <div id="confirm-modal-overlay" style="display:none">
      <div id="confirm-modal-title"></div>
      <div id="confirm-modal-message"></div>
      <button id="confirm-modal-ok">OK</button>
    </div>`
}

function buildToastContainer() {
  document.body.innerHTML += `<div id="toast-container"></div>`
}

function buildChatLayout() {
  document.body.innerHTML += `
    <div id="chat-area"></div>
    <div id="viewer-area"></div>
    <button id="toggle-chat">◀</button>`
}

function buildActionButtons() {
  const ids = [
    'analyze-btn', 'recommend-btn', 'generate-btn',
    'rewrite-btn', 'spell-btn', 'generate-proceed-btn',
    'layout-btn', 'finalise-action-btn',
  ]
  document.body.innerHTML += '<button id="layout-freshness-chip" style="display:none"></button>'
  document.body.innerHTML += ids.map(id => `<button id="${id}"></button>`).join('')
}

beforeEach(() => {
  document.body.innerHTML = ''
  stateManager.resetGenerationState()
  // Stub focus-trap globals so showAlertModal doesn't throw
  vi.stubGlobal('setInitialFocus', vi.fn())
  vi.stubGlobal('trapFocus', vi.fn())
  vi.stubGlobal('restoreFocus', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── showAlertModal / closeAlertModal ──────────────────────────────────────

describe('showAlertModal', () => {
  beforeEach(buildAlertModal)

  it('sets the modal title', () => {
    showAlertModal('Error', 'Something went wrong')
    expect(document.getElementById('alert-modal-title').textContent).toBe('Error')
  })

  it('converts newlines to <br> in the message', () => {
    showAlertModal('T', 'line1\nline2')
    expect(document.getElementById('alert-modal-message').innerHTML).toBe('line1<br>line2')
  })

  it('makes the overlay visible', () => {
    showAlertModal('T', 'M')
    expect(document.getElementById('alert-modal-overlay').style.display).toBe('block')
  })

  it('calls setInitialFocus and trapFocus', () => {
    showAlertModal('T', 'M')
    expect(globalThis.setInitialFocus).toHaveBeenCalledWith('alert-modal-overlay')
    expect(globalThis.trapFocus).toHaveBeenCalledWith('alert-modal-overlay')
  })
})

describe('closeAlertModal', () => {
  beforeEach(buildAlertModal)

  it('hides the overlay', () => {
    document.getElementById('alert-modal-overlay').style.display = 'block'
    closeAlertModal()
    expect(document.getElementById('alert-modal-overlay').style.display).toBe('none')
  })

  it('calls restoreFocus', () => {
    closeAlertModal()
    expect(globalThis.restoreFocus).toHaveBeenCalled()
  })
})

// ── showConfirmModal / closeConfirmModal ──────────────────────────────────

describe('showConfirmModal', () => {
  beforeEach(buildConfirmModal)

  it('sets title and message', () => {
    showConfirmModal('Confirm?', 'Are you sure?')
    expect(document.getElementById('confirm-modal-title').textContent).toBe('Confirm?')
    expect(document.getElementById('confirm-modal-message').innerHTML).toBe('Are you sure?')
  })

  it('sets custom ok button label', () => {
    showConfirmModal('T', 'M', 'Delete')
    expect(document.getElementById('confirm-modal-ok').textContent).toBe('Delete')
  })

  it('returns a Promise', () => {
    const result = showConfirmModal('T', 'M')
    expect(result).toBeInstanceOf(Promise)
    // close to avoid leaking the promise
    closeConfirmModal(false)
  })

  it('makes the overlay visible', () => {
    showConfirmModal('T', 'M')
    expect(document.getElementById('confirm-modal-overlay').style.display).toBe('block')
    closeConfirmModal(false)
  })
})

describe('closeConfirmModal', () => {
  beforeEach(buildConfirmModal)

  it('resolves the promise with the given result', async () => {
    const promise = showConfirmModal('T', 'M')
    closeConfirmModal(true)
    expect(await promise).toBe(true)
  })

  it('resolves with false when cancelled', async () => {
    const promise = showConfirmModal('T', 'M')
    closeConfirmModal(false)
    expect(await promise).toBe(false)
  })

  it('hides the overlay', () => {
    showConfirmModal('T', 'M')
    closeConfirmModal(false)
    expect(document.getElementById('confirm-modal-overlay').style.display).toBe('none')
  })
})

// ── showToast ─────────────────────────────────────────────────────────────

describe('showToast', () => {
  beforeEach(buildToastContainer)

  it('appends a toast element', () => {
    showToast('Hello')
    expect(document.getElementById('toast-container').children).toHaveLength(1)
  })

  it('applies the correct type class', () => {
    showToast('Oops', 'error')
    const toast = document.getElementById('toast-container').firstElementChild
    expect(toast.classList.contains('toast-error')).toBe(true)
  })

  it('sets the toast text', () => {
    showToast('saved!')
    const toast = document.getElementById('toast-container').firstElementChild
    expect(toast.textContent).toBe('saved!')
  })

  it('does not throw when toast-container is absent', () => {
    document.body.innerHTML = ''
    expect(() => showToast('hi')).not.toThrow()
  })
})

// ── toggleChat ────────────────────────────────────────────────────────────

describe('toggleChat', () => {
  beforeEach(buildChatLayout)

  it('collapses chat area when not collapsed', () => {
    toggleChat()
    expect(document.getElementById('chat-area').classList.contains('collapsed')).toBe(true)
    expect(document.getElementById('viewer-area').classList.contains('expanded')).toBe(true)
    expect(document.getElementById('toggle-chat').textContent).toBe('▶')
  })

  it('expands chat area when already collapsed', () => {
    document.getElementById('chat-area').classList.add('collapsed')
    document.getElementById('viewer-area').classList.add('expanded')
    toggleChat()
    expect(document.getElementById('chat-area').classList.contains('collapsed')).toBe(false)
    expect(document.getElementById('viewer-area').classList.contains('expanded')).toBe(false)
    expect(document.getElementById('toggle-chat').textContent).toBe('◀')
  })

  it('toggles back to original state on double call', () => {
    toggleChat()
    toggleChat()
    expect(document.getElementById('chat-area').classList.contains('collapsed')).toBe(false)
  })
})

// ── updateActionButtons ───────────────────────────────────────────────────

describe('updateActionButtons', () => {
  beforeEach(buildActionButtons)

  it('shows only the analyze button in job stage', () => {
    updateActionButtons('job')
    expect(document.getElementById('analyze-btn').style.display).toBe('')
    expect(document.getElementById('recommend-btn').style.display).toBe('none')
    expect(document.getElementById('rewrite-btn').style.display).toBe('none')
  })

  it('shows only the recommend button in analysis stage', () => {
    updateActionButtons('analysis')
    expect(document.getElementById('recommend-btn').style.display).toBe('')
    expect(document.getElementById('analyze-btn').style.display).toBe('none')
  })

  it('shows only the rewrite button in rewrite stage', () => {
    updateActionButtons('rewrite')
    expect(document.getElementById('rewrite-btn').style.display).toBe('')
    expect(document.getElementById('spell-btn').style.display).toBe('none')
  })

  it('labels the layout action as confirm when preview is current and unconfirmed', () => {
    stateManager.markPreviewGenerated()
    updateActionButtons('layout')

    expect(document.getElementById('layout-btn').textContent).toBe('✅ Confirm Layout')
    expect(document.getElementById('layout-freshness-chip').style.display).toBe('')
  })

  it('labels the layout action as generate final after confirmation', () => {
    stateManager.markPreviewGenerated()
    stateManager.markLayoutConfirmed()
    updateActionButtons('layout')

    expect(document.getElementById('layout-btn').textContent).toBe('⬇️ Generate Final Files')
  })

  it('labels the layout action as regenerate preview when content is stale', () => {
    stateManager.markPreviewGenerated()
    stateManager.markContentChanged()
    updateActionButtons('layout')

    expect(document.getElementById('layout-btn').textContent).toBe('↻ Regenerate Preview')
    expect(document.getElementById('layout-freshness-chip').textContent).toContain('Layout outdated')
  })

  it('hides all action buttons for an unknown stage', () => {
    updateActionButtons('unknown')
    const ids = ['analyze-btn', 'recommend-btn', 'generate-btn', 'rewrite-btn',
                 'spell-btn', 'generate-proceed-btn', 'layout-btn', 'finalise-action-btn']
    ids.forEach(id => {
      expect(document.getElementById(id).style.display).toBe('none')
    })
  })
})
