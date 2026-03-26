// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/message-queue.test.js
 * Unit tests for web/message-queue.js
 */
import {
  _messageQueue, _flushMessageQueue,
  appendLoadingMessage, removeLoadingMessage,
  appendMessageHtml, appendMessage,
  appendRetryMessage, appendFormattedAnalysis, appendFormattedResponse,
  appendRawHtml,
} from '../../web/message-queue.js'

// ── DOM fixture helpers ───────────────────────────────────────────────────

function buildConversation() {
  document.body.innerHTML = '<div id="conversation"></div>'
}

function conv() {
  return document.getElementById('conversation')
}

beforeEach(() => {
  document.body.innerHTML = ''
  // Clear the module-level queue between tests
  _messageQueue.length = 0
  vi.stubGlobal('sendMessage', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── appendLoadingMessage ──────────────────────────────────────────────────

describe('appendLoadingMessage', () => {
  beforeEach(buildConversation)

  it('appends a loading message element', () => {
    appendLoadingMessage('Processing…')
    expect(conv().children).toHaveLength(1)
    expect(conv().firstElementChild.classList.contains('system')).toBe(true)
  })

  it('includes the text', () => {
    appendLoadingMessage('Analyzing job')
    expect(conv().textContent).toContain('Analyzing job')
  })

  it('returns the message element', () => {
    const el = appendLoadingMessage('x')
    expect(el).not.toBeNull()
    expect(el.parentNode).toBe(conv())
  })
})

// ── removeLoadingMessage ──────────────────────────────────────────────────

describe('removeLoadingMessage', () => {
  beforeEach(buildConversation)

  it('removes the element from the DOM', () => {
    const el = appendLoadingMessage('Loading…')
    removeLoadingMessage(el)
    expect(conv().children).toHaveLength(0)
  })

  it('does nothing when passed null', () => {
    expect(() => removeLoadingMessage(null)).not.toThrow()
  })
})

// ── appendMessageHtml ─────────────────────────────────────────────────────

describe('appendMessageHtml', () => {
  beforeEach(buildConversation)

  it('appends a message with the given HTML content', () => {
    appendMessageHtml('assistant', '<strong>Hello</strong>')
    expect(conv().querySelector('.message.assistant .content').innerHTML).toBe('<strong>Hello</strong>')
  })
})

// ── appendMessage ─────────────────────────────────────────────────────────

describe('appendMessage', () => {
  it('buffers the message when #conversation is absent', () => {
    document.body.innerHTML = ''
    appendMessage('system', 'buffered')
    expect(_messageQueue).toHaveLength(1)
    expect(_messageQueue[0]).toEqual({ type: 'system', text: 'buffered' })
  })

  it('returns null when buffering', () => {
    document.body.innerHTML = ''
    expect(appendMessage('system', 'x')).toBeNull()
  })

  it('appends a message element to #conversation', () => {
    buildConversation()
    appendMessage('assistant', 'Hello')
    expect(conv().children).toHaveLength(1)
    expect(conv().firstElementChild.classList.contains('assistant')).toBe(true)
  })

  it('renders **bold** markdown', () => {
    buildConversation()
    appendMessage('assistant', '**bold text**')
    expect(conv().querySelector('.content').innerHTML).toContain('<strong>bold text</strong>')
  })

  it('renders *italic* markdown', () => {
    buildConversation()
    appendMessage('assistant', '*italic*')
    expect(conv().querySelector('.content').innerHTML).toContain('<em>italic</em>')
  })

  it('escapes html while preserving markdown formatting', () => {
    buildConversation()
    appendMessage('assistant', '**safe** <img src=x onerror=alert(1)>')
    const content = conv().querySelector('.content')
    expect(content.innerHTML).toContain('<strong>safe</strong>')
    expect(content.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(content.querySelector('img')).toBeNull()
  })

  it('converts newlines to <br>', () => {
    buildConversation()
    appendMessage('assistant', 'line1\nline2')
    expect(conv().querySelector('.content').innerHTML).toContain('<br>')
  })

  it('stringifies non-string input', () => {
    buildConversation()
    appendMessage('assistant', { key: 'value' })
    expect(conv().querySelector('.content').textContent).toContain('key')
  })

  it('adds option buttons for assistant messages ending with (a/b/c)', () => {
    buildConversation()
    appendMessage('assistant', 'Pick one (yes/no/maybe)')
    const buttons = conv().querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0].textContent).toBe('yes')
    expect(buttons[2].textContent).toBe('maybe')
  })

  it('does not add option buttons for non-assistant messages', () => {
    buildConversation()
    appendMessage('system', 'Pick one (yes/no)')
    expect(conv().querySelectorAll('button')).toHaveLength(0)
  })
})

// ── _flushMessageQueue ────────────────────────────────────────────────────

describe('_flushMessageQueue', () => {
  it('flushes buffered messages once conversation exists', () => {
    document.body.innerHTML = ''
    appendMessage('system', 'msg1')
    appendMessage('system', 'msg2')
    expect(_messageQueue).toHaveLength(2)

    buildConversation()
    _flushMessageQueue()

    expect(_messageQueue).toHaveLength(0)
    expect(conv().children).toHaveLength(2)
  })
})

// ── appendRetryMessage ────────────────────────────────────────────────────

describe('appendRetryMessage', () => {
  beforeEach(buildConversation)

  it('appends a system message', () => {
    appendRetryMessage('Error occurred')
    expect(conv().querySelector('.message.system')).not.toBeNull()
  })

  it('adds a Retry button when retryFn is provided', () => {
    appendRetryMessage('Error', vi.fn())
    expect(conv().querySelector('button')).not.toBeNull()
    expect(conv().querySelector('button').textContent).toBe('Retry')
  })

  it('uses custom retry label', () => {
    appendRetryMessage('Error', vi.fn(), 'Try Again')
    expect(conv().querySelector('button').textContent).toBe('Try Again')
  })

  it('does not add a button when no retryFn given', () => {
    appendRetryMessage('Error')
    expect(conv().querySelector('button')).toBeNull()
  })

  it('calls retryFn and removes message when retry is clicked', () => {
    const fn = vi.fn()
    appendRetryMessage('Error', fn)
    conv().querySelector('button').click()
    expect(fn).toHaveBeenCalled()
    expect(conv().querySelector('.message')).toBeNull()
  })
})

// ── appendFormattedAnalysis ───────────────────────────────────────────────

describe('appendFormattedAnalysis', () => {
  beforeEach(buildConversation)

  it('renders structured analysis when data has title and required_skills', () => {
    const data = JSON.stringify({
      title: 'Data Scientist',
      company: 'Acme',
      domain: 'pharma',
      required_skills: ['Python', 'R'],
      preferred_skills: [],
      nice_to_have_requirements: [],
      ats_keywords: ['statistics'],
    })
    appendFormattedAnalysis(data)
    const content = conv().querySelector('.job-analysis')
    expect(content).not.toBeNull()
    expect(content.textContent).toContain('Data Scientist')
    expect(content.textContent).toContain('Python')
    expect(content.textContent).toContain('statistics')
  })

  it('falls back to appendMessage for non-structured data', () => {
    appendFormattedAnalysis('plain text response')
    expect(conv().querySelector('.message.assistant')).not.toBeNull()
    expect(conv().textContent).toContain('plain text response')
  })

  it('falls back to appendMessage on JSON parse error', () => {
    appendFormattedAnalysis('not json {{{')
    expect(conv().querySelector('.message.assistant')).not.toBeNull()
  })
})

// ── appendFormattedResponse ───────────────────────────────────────────────

describe('appendFormattedResponse', () => {
  beforeEach(buildConversation)

  it('dispatches to appendFormattedAnalysis for structured data', () => {
    const data = JSON.stringify({ title: 'Engineer', required_skills: ['JS'] })
    appendFormattedResponse(data)
    expect(conv().querySelector('.job-analysis')).not.toBeNull()
  })

  it('falls back to appendMessage for plain strings', () => {
    appendFormattedResponse('hello')
    expect(conv().querySelector('.message.assistant')).not.toBeNull()
  })
})

// ── appendRawHtml ─────────────────────────────────────────────────────────

describe('appendRawHtml', () => {
  beforeEach(buildConversation)

  it('inserts raw HTML into the conversation', () => {
    appendRawHtml('<div class="custom">injected</div>')
    expect(conv().querySelector('.custom')).not.toBeNull()
    expect(conv().querySelector('.custom').textContent).toBe('injected')
  })

  it('does not throw when conversation is absent', () => {
    document.body.innerHTML = ''
    expect(() => appendRawHtml('<div>x</div>')).not.toThrow()
  })
})
