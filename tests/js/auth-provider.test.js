/**
 * tests/js/auth-provider.test.js
 * Unit tests for web/auth-provider.js
 */
import {
  formatProviderLabel,
  updateAuthBadge,
  closeCopilotAuthModal,
} from '../../web/auth-provider.js'

// ── DOM helpers ───────────────────────────────────────────────────────────

function buildAuthBadge() {
  document.body.innerHTML = `
    <div id="copilot-auth-badge">
      <span id="auth-badge-icon"></span>
      <span id="auth-badge-label"></span>
    </div>`
}

function buildAuthModal() {
  document.body.innerHTML += `
    <div id="auth-modal-overlay">
      <span id="auth-user-code"></span>
      <a id="auth-verify-link" href="#"></a>
      <span id="auth-status-msg"></span>
      <button id="auth-open-btn"></button>
    </div>`
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
  vi.stubGlobal('restoreFocus', vi.fn())
  vi.stubGlobal('setInitialFocus', vi.fn())
  vi.stubGlobal('trapFocus', vi.fn())
  vi.stubGlobal('confirmDialog', vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ── formatProviderLabel ───────────────────────────────────────────────────

describe('formatProviderLabel', () => {
  it('returns "Provider" for null/undefined', () => {
    expect(formatProviderLabel(null)).toBe('Provider')
    expect(formatProviderLabel(undefined)).toBe('Provider')
  })

  it('returns known alias "OpenAI" for "openai"', () => {
    expect(formatProviderLabel('openai')).toBe('OpenAI')
  })

  it('returns known alias for "copilot-oauth"', () => {
    expect(formatProviderLabel('copilot-oauth')).toBe('Copilot OAuth')
  })

  it('title-cases hyphen-separated words', () => {
    expect(formatProviderLabel('my-custom-provider')).toBe('My Custom Provider')
  })

  it('title-cases underscore-separated words', () => {
    expect(formatProviderLabel('anthropic_claude')).toBe('Anthropic Claude')
  })

  it('handles a single word', () => {
    expect(formatProviderLabel('claude')).toBe('Claude')
  })
})

// ── updateAuthBadge ───────────────────────────────────────────────────────

describe('updateAuthBadge', () => {
  beforeEach(buildAuthBadge)

  it('does nothing when badge element is absent', () => {
    document.body.innerHTML = ''
    expect(() => updateAuthBadge({ authenticated: true })).not.toThrow()
  })

  it('adds "authenticated" class and checkmark for authenticated state', () => {
    updateAuthBadge({ authenticated: true })
    const badge = document.getElementById('copilot-auth-badge')
    expect(badge.classList.contains('authenticated')).toBe(true)
    expect(document.getElementById('auth-badge-icon').textContent).toBe('\u2713')
    expect(document.getElementById('auth-badge-label').textContent).toBe('Copilot ready')
  })

  it('adds "polling" class while waiting for approval', () => {
    updateAuthBadge({ authenticated: false, polling: true })
    expect(document.getElementById('copilot-auth-badge').classList.contains('polling')).toBe(true)
    expect(document.getElementById('auth-badge-label').textContent).toMatch(/waiting/i)
  })

  it('adds "unauthenticated" class when not authenticated', () => {
    updateAuthBadge({ authenticated: false })
    expect(document.getElementById('copilot-auth-badge').classList.contains('unauthenticated')).toBe(true)
  })

  it('shows provider label for non-Copilot providers', () => {
    updateAuthBadge({}, 'openai')
    expect(document.getElementById('copilot-auth-badge').classList.contains('authenticated')).toBe(true)
    expect(document.getElementById('auth-badge-label').textContent).toContain('OpenAI')
  })

  it('removes all state classes before applying new one', () => {
    const badge = document.getElementById('copilot-auth-badge')
    badge.classList.add('authenticated')
    updateAuthBadge({ authenticated: false })
    expect(badge.classList.contains('authenticated')).toBe(false)
    expect(badge.classList.contains('unauthenticated')).toBe(true)
  })
})

// ── closeCopilotAuthModal ─────────────────────────────────────────────────

describe('closeCopilotAuthModal', () => {
  beforeEach(buildAuthModal)

  it('removes the "visible" class from the auth modal overlay', () => {
    const overlay = document.getElementById('auth-modal-overlay')
    overlay.classList.add('visible')
    closeCopilotAuthModal()
    expect(overlay.classList.contains('visible')).toBe(false)
  })

  it('calls restoreFocus', () => {
    closeCopilotAuthModal()
    expect(globalThis.restoreFocus).toHaveBeenCalled()
  })
})
