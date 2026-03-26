// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/layout-instruction.test.js
 * Unit tests for web/layout-instruction.js helper functions.
 * (initiateLayoutInstructions and completeLayoutReview are orchestration-heavy
 *  and covered by integration tests.)
 */
import {
  showProcessing,
  showConfirmationMessage,
  renderInstructionHistory,
  renderPreviewOutputStatus,
  addToInstructionHistory,
  undoInstruction,
  completeLayoutReview,
  generateFinalOutputs,
  loadLayoutInstructionHistory,
} from '../../web/layout-instruction.js'
import { apiCall } from '../../web/api-client.js'
import { stateManager } from '../../web/state-manager.js'

vi.mock('../../web/api-client.js', () => ({ apiCall: vi.fn() }))
vi.mock('../../web/state-manager.js', () => ({
  GENERATION_STATE_EVENT: 'generation-state-change',
  stateManager: {
    getGenerationState: vi.fn(() => ({})),
    getLayoutFreshness: vi.fn(() => ({ isStale: false })),
    getSessionId: vi.fn(() => 'session-123'),
    setGenerationState: vi.fn(),
    markPreviewGenerated: vi.fn(),
    markLayoutConfirmed: vi.fn(),
    markFinalGenerated: vi.fn(),
    setPhase: vi.fn(),
    getTabData: vi.fn(() => ({})),
    setTabData: vi.fn(),
  },
}))

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <div id="processing-indicator" style="display:none"></div>
    <div id="confirmation-message" style="display:none"></div>
    <div id="layout-stale-callout" style="display:none"></div>
    <div id="instruction-history"></div>
    <div id="preview-output-status"></div>
    <span id="instruction-count">0</span>
    <button id="confirm-layout-btn" style="display:none"></button>
    <button id="proceed-to-finalise-btn" style="display:none"></button>`
}

beforeEach(() => {
  buildDom()
  window.layoutInstructions = []
  vi.useFakeTimers()
  vi.stubGlobal('htmlEscape', s => s)
  vi.stubGlobal('appendMessage', vi.fn())
  vi.stubGlobal('switchTab', vi.fn())
  vi.stubGlobal('scheduleAtsRefresh', vi.fn())
  apiCall.mockReset()
  stateManager.getGenerationState.mockReset()
  stateManager.getGenerationState.mockReturnValue({})
  stateManager.getLayoutFreshness.mockReset()
  stateManager.getLayoutFreshness.mockReturnValue({ isStale: false })
  stateManager.setGenerationState.mockReset()
  stateManager.markPreviewGenerated.mockReset()
  stateManager.markLayoutConfirmed.mockReset()
  stateManager.markFinalGenerated.mockReset()
  stateManager.setPhase.mockReset()
  stateManager.getTabData.mockReset()
  stateManager.getTabData.mockReturnValue({})
  stateManager.setTabData.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete window.layoutInstructions
})

describe('staged layout regressions', () => {
  it('reloads layout instruction history from the backend', async () => {
    apiCall.mockResolvedValueOnce({
      instructions: [
        {
          timestamp: '12:01',
          instruction: 'Move Publications',
          summary: 'Moved publications section',
        },
      ],
    })

    const instructions = await loadLayoutInstructionHistory()

    expect(apiCall).toHaveBeenCalledWith('GET', '/api/layout-history')
    expect(instructions).toEqual([
      {
        timestamp: '12:01',
        instruction_text: 'Move Publications',
        change_summary: 'Moved publications section',
        confirmation: true,
      },
    ])
  })

  it('confirms layout without generating final files immediately', async () => {
    apiCall.mockResolvedValueOnce({ ok: true })

    stateManager.getGenerationState.mockReturnValue({ phase: 'layout_review', previewAvailable: true, layoutConfirmed: false })

    await completeLayoutReview()

    expect(apiCall).toHaveBeenCalledWith('POST', '/api/cv/confirm-layout', {})
    expect(apiCall).not.toHaveBeenCalledWith('POST', '/api/cv/generate-final', {})
    expect(apiCall).not.toHaveBeenCalledWith('POST', '/api/layout-complete', expect.anything())
    expect(stateManager.markLayoutConfirmed).toHaveBeenCalled()
  })

  it('does not report success when staged final generation fails', async () => {
    apiCall.mockResolvedValueOnce({ ok: false, error: 'Final generation failed' })

    stateManager.getGenerationState.mockReturnValue({ phase: 'confirmed', previewAvailable: true, layoutConfirmed: true })

    await generateFinalOutputs()

    expect(apiCall).toHaveBeenCalledWith('POST', '/api/cv/generate-final', {})
    expect(apiCall).not.toHaveBeenCalledWith('POST', '/api/layout-complete', expect.anything())
    expect(globalThis.appendMessage).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('Final generation failed')
    )
    expect(stateManager.setPhase).not.toHaveBeenCalled()
    expect(globalThis.switchTab).not.toHaveBeenCalled()
  })
})

// ── showProcessing ────────────────────────────────────────────────────────

describe('showProcessing', () => {
  it('shows the processing indicator', () => {
    showProcessing(true)
    expect(document.getElementById('processing-indicator').style.display).toBe('block')
  })

  it('hides the processing indicator', () => {
    document.getElementById('processing-indicator').style.display = 'block'
    showProcessing(false)
    expect(document.getElementById('processing-indicator').style.display).toBe('none')
  })

  it('does not throw when element is absent', () => {
    document.body.innerHTML = ''
    expect(() => showProcessing(true)).not.toThrow()
  })
})

// ── showConfirmationMessage ───────────────────────────────────────────────

describe('showConfirmationMessage', () => {
  it('sets message text and shows the element', () => {
    showConfirmationMessage('✅ Done')
    const el = document.getElementById('confirmation-message')
    expect(el.textContent).toBe('✅ Done')
    expect(el.style.display).toBe('block')
  })

  it('auto-hides after 3 seconds', () => {
    showConfirmationMessage('Test')
    vi.advanceTimersByTime(3000)
    expect(document.getElementById('confirmation-message').style.display).toBe('none')
  })

  it('does not throw when element is absent', () => {
    document.body.innerHTML = ''
    expect(() => showConfirmationMessage('x')).not.toThrow()
  })
})

// ── renderInstructionHistory ──────────────────────────────────────────────

describe('renderInstructionHistory', () => {
  it('renders nothing for an empty list', () => {
    renderInstructionHistory()
    expect(document.getElementById('instruction-history').innerHTML).toBe('')
    expect(document.getElementById('instruction-count').textContent).toBe('0')
  })

  it('renders one entry per instruction', () => {
    window.layoutInstructions = [
      { timestamp: '12:00', instruction_text: 'Move Publications', change_summary: 'Moved' },
      { timestamp: '12:01', instruction_text: 'Shrink Summary', change_summary: 'Shrunk' },
    ]
    renderInstructionHistory()
    const entries = document.querySelectorAll('.instruction-history-entry')
    expect(entries).toHaveLength(2)
    expect(document.getElementById('instruction-count').textContent).toBe('2')
  })

  it('uses htmlEscape on instruction text', () => {
    const escapeSpy = vi.fn(s => s)
    vi.stubGlobal('htmlEscape', escapeSpy)
    window.layoutInstructions = [
      { timestamp: '', instruction_text: 'Test <b>bold</b>', change_summary: '' },
    ]
    renderInstructionHistory()
    expect(escapeSpy).toHaveBeenCalledWith('Test <b>bold</b>')
  })

  it('does not throw when elements are absent', () => {
    document.body.innerHTML = ''
    window.layoutInstructions = [{ instruction_text: 'x', change_summary: 'y' }]
    expect(() => renderInstructionHistory()).not.toThrow()
  })
})

// ── renderPreviewOutputStatus ────────────────────────────────────────────

describe('renderPreviewOutputStatus', () => {
  it('shows an empty message when no renderer outputs exist', () => {
    renderPreviewOutputStatus(null)

    expect(document.getElementById('preview-output-status').textContent)
      .toContain('Preview PDFs will appear here')
  })

  it('renders status and link for successful renderer output', () => {
    renderPreviewOutputStatus({
      pdfs: {
        chrome: {
          ok: true,
          renderer_detail: 'chrome-bin',
        },
      },
    })

    const container = document.getElementById('preview-output-status')
    expect(container.textContent).toContain('Chrome Ready')
    expect(container.querySelector('.preview-output-badge-link').getAttribute('href'))
      .toBe('/api/cv/preview-output/chrome?session_id=session-123')
    expect(container.querySelector('.preview-output-link')).toBeNull()
  })

  it('renders failure detail when a renderer output is unavailable', () => {
    renderPreviewOutputStatus({
      pdfs: {
        weasyprint: {
          ok: false,
          error: 'renderer unavailable',
        },
      },
    })

    const container = document.getElementById('preview-output-status')
    expect(container.textContent).toContain('WeasyPrint Failed')
    expect(container.textContent).toContain('renderer unavailable')
    expect(container.querySelector('.preview-output-badge-link')).toBeNull()
    expect(container.querySelector('.preview-output-link')).toBeNull()
  })
})

// ── addToInstructionHistory ───────────────────────────────────────────────

describe('addToInstructionHistory', () => {
  it('initializes window.layoutInstructions if absent', () => {
    delete window.layoutInstructions
    addToInstructionHistory({ timestamp: 't', instruction_text: 'x', change_summary: 'y' })
    expect(window.layoutInstructions).toHaveLength(1)
  })

  it('appends entry to the list', () => {
    addToInstructionHistory({ timestamp: '1', instruction_text: 'A', change_summary: 'SA' })
    addToInstructionHistory({ timestamp: '2', instruction_text: 'B', change_summary: 'SB' })
    expect(window.layoutInstructions).toHaveLength(2)
  })

  it('updates the DOM count', () => {
    addToInstructionHistory({ timestamp: '', instruction_text: 'X', change_summary: '' })
    expect(document.getElementById('instruction-count').textContent).toBe('1')
  })
})

// ── undoInstruction ───────────────────────────────────────────────────────

describe('undoInstruction', () => {
  beforeEach(() => {
    window.layoutInstructions = [
      { timestamp: '', instruction_text: 'A', change_summary: '' },
      { timestamp: '', instruction_text: 'B', change_summary: '' },
    ]
  })

  it('removes the entry at the given index', () => {
    undoInstruction(0)
    expect(window.layoutInstructions).toHaveLength(1)
    expect(window.layoutInstructions[0].instruction_text).toBe('B')
  })

  it('calls appendMessage with a system message', () => {
    undoInstruction(0)
    expect(globalThis.appendMessage).toHaveBeenCalledWith('system', expect.stringContaining('Undo'))
  })

  it('does nothing for an out-of-range index', () => {
    undoInstruction(99)
    expect(window.layoutInstructions).toHaveLength(2)
  })

  it('does nothing when layoutInstructions is absent', () => {
    delete window.layoutInstructions
    expect(() => undoInstruction(0)).not.toThrow()
  })

  it('updates the DOM count after removal', () => {
    undoInstruction(1)
    expect(document.getElementById('instruction-count').textContent).toBe('1')
  })
})
