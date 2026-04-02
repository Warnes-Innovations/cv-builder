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
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

import { apiCall, fetchSettings, updateSettings } from '../../web/api-client.js'

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
  fetchSettings.mockReset()
  updateSettings.mockReset()
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
        <div id="model-step-provider"></div>
        <div id="model-step-models"></div>
        <div id="model-models-loading"></div>
        <div id="model-provider-list"></div>
        <div id="model-quick-list"></div>
        <span id="model-wizard-step-label"></span>
        <button id="model-wizard-back-btn"></button>
        <button id="model-wizard-next-btn"></button>
        <button id="model-show-all-btn"></button>
        <input id="model-global-search" />
        <div id="model-auth-panel"></div>
        <div id="model-auth-status"></div>
        <button id="model-auth-start-btn"></button>
        <button id="model-auth-logout-btn"></button>
        <span id="model-auth-code"></span>
        <a id="model-auth-link" href="#"></a>
        <div id="model-full-table-wrap"></div>
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
    await mod.nextWizardStep()

    const input = document.querySelector('tr.model-filter-row input')
    expect(input).not.toBeNull()
    expect(input.getAttribute('placeholder')).toBe('bad" onfocus="alert(1)')
    expect(input.getAttribute('onfocus')).toBeNull()
  })
  it('escapes model notes before rendering table cells', async () => {
    buildModelFixture()

    const headers = ['Provider', 'Model', 'Context', '$/1M in', '$/1M out', 'Copilot', 'Source', 'Notes']
      .map(text => {
        const th = document.createElement('th')
        th.textContent = text
        return th
      })

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
          all_models: [{
            provider: 'github',
            model: 'gpt-5.4',
            source: 'list_models',
            notes: '<img src=x onerror=alert(1)>',
          }],
          list_models_capable: ['github'],
        }
      }
      if (url.startsWith('/api/model-catalog')) {
        return {
          providers: ['github'],
          all_models: [{
            provider: 'github',
            model: 'gpt-5.4',
            source: 'list_models',
            notes: '<img src=x onerror=alert(1)>',
          }],
          list_models_capable: ['github'],
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    await mod.openModelModal()
    await mod.nextWizardStep()

    const notesCell = document.querySelector('#model-table-body tr td:last-child')
    expect(notesCell).not.toBeNull()
    expect(notesCell.querySelector('img')).toBeNull()
    expect(notesCell.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('toggles full catalog visibility in wizard mode', async () => {
    buildModelFixture()

    const headers = ['Provider', 'Model', 'Context', '$/1M in', '$/1M out', 'Copilot', 'Source', 'Notes']
      .map(text => {
        const th = document.createElement('th')
        th.textContent = text
        return th
      })

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
      search() {
        return { draw() {} }
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ authenticated: false }) }))
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
    await mod.nextWizardStep()
    expect(document.getElementById('model-full-table-wrap').style.display).toBe('none')

    mod.toggleModelCatalogVisibility()
    expect(document.getElementById('model-full-table-wrap').style.display).toBe('')
  })
})

describe('settings modal', () => {
  function buildSettingsFixture() {
    document.body.innerHTML = `
      <div id="settings-modal-overlay" style="display:none">
        <div id="settings-status-msg" style="display:none"></div>
        <input id="settings-llm-default-provider" />
        <input id="settings-llm-default-model" />
        <input id="settings-llm-request-timeout" />
        <input id="settings-llm-temperature" />
        <input id="settings-gen-max-skills" />
        <input id="settings-gen-max-achievements" />
        <input id="settings-gen-max-publications" />
        <input id="settings-gen-skills-title" />
        <input id="settings-format-ats-docx" type="checkbox" />
        <input id="settings-format-human-pdf" type="checkbox" />
        <input id="settings-format-human-docx" type="checkbox" />
        <span id="settings-config-path"></span>
        <span id="source-llm.default_provider"></span>
        <span id="source-llm.default_model"></span>
        <span id="source-llm.request_timeout_seconds"></span>
        <span id="source-llm.temperature"></span>
        <span id="source-generation.max_skills"></span>
        <span id="source-generation.max_achievements"></span>
        <span id="source-generation.max_publications"></span>
        <span id="source-generation.skills_section_title"></span>
        <span id="source-generation.formats.ats_docx"></span>
        <span id="source-generation.formats.human_pdf"></span>
        <span id="source-generation.formats.human_docx"></span>
        <button id="settings-save-btn">Save Settings</button>
      </div>`
  }

  it('loads settings into the modal fields', async () => {
    buildSettingsFixture()
    fetchSettings.mockResolvedValue({
      ok: true,
      settings: {
        llm: {
          default_provider: 'github',
          default_model: 'gpt-4o',
          request_timeout_seconds: 180,
          temperature: 0.5,
        },
        generation: {
          max_skills: 25,
          max_achievements: 6,
          max_publications: 11,
          skills_section_title: 'Skills',
          formats: { ats_docx: true, human_pdf: false, human_docx: true },
        },
      },
      meta: {
        sources: { 'llm.default_provider': 'config' },
        locked: { 'llm.default_provider': false },
        config_path: '/tmp/config.yaml',
      },
    })

    await mod.openSettingsModal()

    expect(document.getElementById('settings-llm-default-provider').value).toBe('github')
    expect(document.getElementById('settings-llm-request-timeout').value).toBe('180')
    expect(document.getElementById('settings-format-human-pdf').checked).toBe(false)
    expect(document.getElementById('settings-config-path').textContent).toContain('/tmp/config.yaml')
  })

  it('submits updated settings payload', async () => {
    buildSettingsFixture()
    fetchSettings.mockResolvedValue({
      ok: true,
      settings: {
        llm: {
          default_provider: 'github',
          default_model: '',
          request_timeout_seconds: 120,
          temperature: 0.7,
        },
        generation: {
          max_skills: 20,
          max_achievements: 5,
          max_publications: 10,
          skills_section_title: 'Skills',
          formats: { ats_docx: true, human_pdf: true, human_docx: true },
        },
      },
      meta: { sources: {}, locked: {} },
    })
    updateSettings.mockResolvedValue({ ok: true, settings: { llm: {}, generation: { formats: {} } }, meta: { sources: {}, locked: {} } })

    await mod.openSettingsModal()

    document.getElementById('settings-llm-default-provider').value = 'anthropic'
    document.getElementById('settings-llm-request-timeout').value = '240'
    document.getElementById('settings-format-human-pdf').checked = false

    await mod.saveSettingsModal()

    expect(updateSettings).toHaveBeenCalledTimes(1)
    expect(updateSettings.mock.calls[0][0].llm.default_provider).toBe('anthropic')
    expect(updateSettings.mock.calls[0][0].llm.request_timeout_seconds).toBe(240)
    expect(updateSettings.mock.calls[0][0].generation.formats.human_pdf).toBe(false)
  })
})