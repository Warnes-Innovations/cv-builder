// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/ui-core.test.js
 * Focused regression tests for web/ui-core.js event wiring.
 */

vi.mock('../../web/api-client.js', () => ({
  StorageKeys: { TAB_DATA: 'tabData' },
  apiCall: vi.fn(),
  fetchStatus: vi.fn(),
  askPostAnalysisQuestions: vi.fn(),
  sendMessage: vi.fn(),
}))

import { apiCall } from '../../web/api-client.js'

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
  apiCall.mockReset()
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

describe('loadTabContent', () => {
  it('renders thrown error text without interpreting it as HTML', async () => {
    document.body.innerHTML = '<div id="document-content"></div>'
    vi.stubGlobal(
      'populateJobTab',
      vi.fn(async () => {
        throw new Error('<img src=x onerror=alert(1)>')
      }),
    )

    await mod.loadTabContent('job')

    const content = document.getElementById('document-content')
    expect(content.innerHTML).not.toContain('<img src=x onerror=alert(1)>')
    expect(content.textContent).toContain('Error loading content: <img src=x onerror=alert(1)>')
    expect(content.querySelector('img')).toBeNull()
  })
})

describe('openModelModal', () => {
  function buildModelFixture() {
    document.body.innerHTML = `
      <div id="model-modal-overlay" style="display:none">
        <div id="model-provider-list"></div>
        <table id="model-table">
          <thead id="model-table-head"></thead>
          <tbody id="model-table-body"></tbody>
        </table>
        <div id="model-test-status"></div>
      </div>
      <div id="model-current-label"></div>`
  }

  function makeWrapper(target) {
    const elements = Array.isArray(target)
      ? target
      : target == null
        ? []
        : [target]

    return {
      length: elements.length,
      append(child) {
        const childElement = child?.el ?? child?.elements?.[0] ?? child
        elements.forEach(element => element.appendChild(childElement))
        return this
      },
      find(selector) {
        return makeWrapper(elements.flatMap(element => Array.from(element.querySelectorAll(selector))))
      },
      eq(index) {
        return makeWrapper(elements[index] ?? null)
      },
      off() {
        return this
      },
      on() {
        return this
      },
      text() {
        return elements[0]?.textContent ?? ''
      },
      DataTable(options) {
        options.initComplete.call({ api: () => dataTableApi })
        return { destroy: vi.fn() }
      },
      el: elements[0] ?? null,
      elements,
    }
  }

  let dataTableApi

  it('creates filter inputs without parsing placeholder text as HTML', async () => {
    buildModelFixture()

    const hostileHeader = document.createElement('th')
    hostileHeader.textContent = 'bad" onfocus="alert(1)'
    const otherHeaders = ['Model', 'Context', '$/1M in', '$/1M out', 'Copilot', 'Source', 'Notes']
      .map(text => {
        const th = document.createElement('th')
        th.textContent = text
        return th
      })
    const headers = [hostileHeader, ...otherHeaders]

    dataTableApi = {
      columns() {
        return {
          every(callback) {
            headers.forEach((_, index) => callback.call({}, index))
          },
        }
      },
      column(index) {
        return {
          header() {
            return headers[index]
          },
          search(value) {
            if (value === undefined) return ''
            return { draw() {} }
          },
        }
      },
    }

    const dollar = vi.fn((selector, attrs) => {
      if (selector instanceof HTMLElement) {
        return makeWrapper(selector)
      }
      if (typeof selector === 'string' && selector.startsWith('<')) {
        const tagMatch = selector.match(/^<([a-z0-9-]+)/i)
        const element = document.createElement(tagMatch[1])
        if (attrs && typeof attrs === 'object') {
          Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'text') {
              element.textContent = value
            } else {
              element.setAttribute(key, value)
            }
          })
        } else {
          const template = document.createElement('template')
          template.innerHTML = selector.trim()
          return makeWrapper(template.content.firstElementChild)
        }
        return makeWrapper(element)
      }
      return makeWrapper(Array.from(document.querySelectorAll(selector)))
    })
    dollar.fn = { DataTable: { isDataTable: vi.fn(() => false) } }

    vi.stubGlobal('$', dollar)
    apiCall.mockImplementation(async (_method, url) => {
      if (url === '/api/model') {
        return {
          provider: 'github',
          model: 'gpt-5.4',
          providers: ['github'],
          all_models: [{ provider: 'github', model: 'gpt-5.4', source: 'list_models' }],
          list_models_capable: ['github'],
        }
      }
      if (url.startsWith('/api/model-catalog')) {
        return {
          providers: ['github'],
          all_models: [{ provider: 'github', model: 'gpt-5.4', source: 'list_models' }],
          list_models_capable: ['github'],
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    await mod.openModelModal()

    const input = document.querySelector('tr.model-filter-row input')
    expect(input).not.toBeNull()
    expect(input.getAttribute('placeholder')).toBe('bad" onfocus="alert(1)')
    expect(input.getAttribute('onfocus')).toBeNull()
  })
})