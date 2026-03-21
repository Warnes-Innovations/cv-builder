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
  addToInstructionHistory,
  undoInstruction,
} from '../../web/layout-instruction.js'

vi.mock('../../web/api-client.js', () => ({ apiCall: vi.fn() }))
vi.mock('../../web/state-manager.js', () => ({
  stateManager: { getGenerationState: vi.fn(() => ({})), setPhase: vi.fn() },
}))

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <div id="processing-indicator" style="display:none"></div>
    <div id="confirmation-message" style="display:none"></div>
    <div id="instruction-history"></div>
    <span id="instruction-count">0</span>
    <button id="proceed-to-finalise-btn" style="display:none"></button>`
}

beforeEach(() => {
  buildDom()
  window.layoutInstructions = []
  vi.useFakeTimers()
  vi.stubGlobal('htmlEscape', s => s)
  vi.stubGlobal('appendMessage', vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete window.layoutInstructions
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
