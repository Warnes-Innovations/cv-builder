/**
 * tests/js/layout-instruction.test.js
 *
 * Regression tests for layout-instruction.js.
 *
 * Issue: initiateLayoutInstructions() was targeting #tab-layout (the small
 * tab button in the navigation bar) instead of #document-content (the viewer
 * panel).  This caused the layout panel to be injected into the tab button,
 * making the preview appear far too narrow.
 */

const fs   = require('fs')
const path = require('path')

const SCRIPT_PATH = path.resolve(__dirname, '../../web/layout-instruction.js')
const SCRIPT_CODE = fs.readFileSync(SCRIPT_PATH, 'utf-8')

// ── helpers ───────────────────────────────────────────────────────────────────

function stubGlobals() {
  window.appendMessage     = vi.fn()
  window.appendMessageHtml = vi.fn()
  window.htmlEscape        = (s) => String(s ?? '')
  window.apiCall           = vi.fn().mockResolvedValue({ ok: false, error: 'stub' })
  window.stateManager      = { getGenerationState: vi.fn(() => ({})), setPhase: vi.fn() }
  window.switchTab         = vi.fn()
  window.tabData           = {}
  window.layoutInstructions = []
}

/** Minimal DOM with every element ID that layout-instruction.js references. */
function buildDom() {
  document.body.innerHTML = `
    <div id="tab-layout" class="tab">Layout</div>
    <div id="document-content"></div>
    <div id="conversation"></div>
  `
}

// ── static analysis ───────────────────────────────────────────────────────────

describe('layout-instruction.js — source code', () => {
  // Isolate the initiateLayoutInstructions function body for targeted checks.
  const fnStart = SCRIPT_CODE.indexOf('function initiateLayoutInstructions()')
  const fnEnd   = SCRIPT_CODE.indexOf('\nfunction ', fnStart + 1)
  const fnBody  = SCRIPT_CODE.slice(fnStart, fnEnd === -1 ? undefined : fnEnd)

  it('uses getElementById("document-content") as the panel container', () => {
    expect(fnBody).toContain("getElementById('document-content')")
  })

  it('does NOT use getElementById("tab-layout") as the panel container', () => {
    // The first getElementById call inside initiateLayoutInstructions must
    // resolve to "document-content", not "tab-layout".
    const firstCall = fnBody.match(/getElementById\('([^']+)'\)/)
    expect(firstCall).not.toBeNull()
    expect(firstCall[1]).toBe('document-content')
  })
})

// ── behavioural ───────────────────────────────────────────────────────────────

describe('initiateLayoutInstructions() — DOM behaviour', () => {
  beforeEach(() => {
    vi.resetModules()
    buildDom()
    stubGlobals()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Load the script and expose initiateLayoutInstructions via window. */
  function loadAndExpose() {
    // Append an assignment so the function survives eval()'s strict-mode scope.
    // window is accessible inside eval because it is a jsdom global.
    eval(SCRIPT_CODE + '\nwindow.__initiateLayoutInstructions = initiateLayoutInstructions') // eslint-disable-line no-eval
    return window.__initiateLayoutInstructions
  }

  it('injects .layout-instruction-panel into #document-content', () => {
    const fn = loadAndExpose()
    fn()

    const panel = document.getElementById('document-content')
      .querySelector('.layout-instruction-panel')
    expect(panel).not.toBeNull()
  })

  it('does NOT inject .layout-instruction-panel into the #tab-layout button', () => {
    const fn = loadAndExpose()
    fn()

    const panel = document.getElementById('tab-layout')
      .querySelector('.layout-instruction-panel')
    expect(panel).toBeNull()
  })

  it('does not reinitialise the panel on repeated calls', () => {
    const fn = loadAndExpose()
    fn()
    fn()

    const panels = document.getElementById('document-content')
      .querySelectorAll('.layout-instruction-panel')
    expect(panels.length).toBe(1)
  })
})
