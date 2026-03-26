// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/ui-core.test.js
 * Focused regression tests for web/ui-core.js event wiring.
 */

let mod

async function loadModule() {
  vi.resetModules()
  mod = await import('../../web/ui-core.js')
  return mod
}

function buildFixture() {
  document.body.innerHTML = `
    <div class="interaction-area" id="chat-area"></div>
    <div class="viewer-area" id="viewer-area"></div>
    <button class="toggle-chat" id="toggle-chat">◀</button>
    <input id="message-input" />`
}

beforeEach(async () => {
  document.body.innerHTML = ''
  vi.stubGlobal('sendMessage', vi.fn())
  await loadModule()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('setupEventListeners', () => {
  it('does not bind the chat toggle button directly', () => {
    buildFixture()

    mod.setupEventListeners()
    document.getElementById('toggle-chat').click()

    expect(document.getElementById('chat-area').classList.contains('collapsed')).toBe(false)
    expect(document.getElementById('viewer-area').style.flex).toBe('')
    expect(document.getElementById('toggle-chat').textContent).toBe('◀')
  })
})