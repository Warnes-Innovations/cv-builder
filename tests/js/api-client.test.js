// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/api-client.test.js
 * Unit tests for web/api-client.js — StorageKeys constants and apiCall().
 */
let apiClient
let fetchMock

async function loadApiClient() {
  vi.resetModules()
  apiClient = await import('../../web/api-client.js')
  return apiClient
}

// ── StorageKeys ───────────────────────────────────────────────────────────────

describe('StorageKeys', () => {
  beforeEach(async () => {
    await loadApiClient()
  })

  it('defines SESSION_ID', () => {
    expect(apiClient.StorageKeys.SESSION_ID).toBe('cv-builder-session-id')
  })
  it('defines SESSION_PATH', () => {
    expect(apiClient.StorageKeys.SESSION_PATH).toBe('cv-builder-session-path')
  })
  it('defines TAB_DATA', () => {
    expect(apiClient.StorageKeys.TAB_DATA).toBe('cv-builder-tab-data')
  })
  it('defines CURRENT_TAB', () => {
    expect(apiClient.StorageKeys.CURRENT_TAB).toBe('cv-builder-current-tab')
  })
  it('defines CHAT_COLLAPSED', () => {
    expect(apiClient.StorageKeys.CHAT_COLLAPSED).toBe('cv-builder-chat-collapsed')
  })
  it('defines LLM_DISCLOSURE_SHOWN', () => {
    expect(apiClient.StorageKeys.LLM_DISCLOSURE_SHOWN).toBe('cv-builder-llm-disclosure-shown')
  })
  it('has exactly 6 keys', () => {
    expect(Object.keys(apiClient.StorageKeys)).toHaveLength(6)
  })
  it('all values are strings', () => {
    Object.values(apiClient.StorageKeys).forEach(v => expect(typeof v).toBe('string'))
  })
})

// ── apiCall ───────────────────────────────────────────────────────────────────

describe('apiCall', () => {
  let fetchMock

  beforeEach(async () => {
    window.history.replaceState({}, '', 'http://localhost/')
    sessionStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock
    await loadApiClient()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on a successful GET', async () => {
    fetchMock.mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ status: 'ok' }),
    })
    const result = await apiClient.apiCall('GET', '/api/status')
    expect(result).toEqual({ status: 'ok' })
  })

  it('calls fetch with the correct method and endpoint', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiClient.apiCall('GET', '/api/history')
    const calledUrl = new URL(fetchMock.mock.calls[0][0])
    expect(calledUrl.origin + calledUrl.pathname).toBe('http://localhost/api/history')
    expect(calledUrl.searchParams.get('owner_token')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('updates the auth badge and current provider when fetching status', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        llm_provider: 'copilot-sdk',
        copilot_auth: { authenticated: true },
      }),
    })
    const updateAuthBadge = vi.fn()
    vi.stubGlobal('updateAuthBadge', updateAuthBadge)

    const status = await apiClient.fetchStatus()

    expect(status.llm_provider).toBe('copilot-sdk')
    expect(globalThis.currentProvider).toBe('copilot-sdk')
    expect(updateAuthBadge).toHaveBeenCalledWith({ authenticated: true }, 'copilot-sdk')
  })

  it('sends Content-Type application/json header', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiClient.apiCall('GET', '/api/status')
    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('serializes body for POST requests', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiClient.apiCall('POST', '/api/job', { job_description: 'test role' })
    const [, opts] = fetchMock.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual({ job_description: 'test role' })
  })

  it('does not attach a body for GET requests', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiClient.apiCall('GET', '/api/status')
    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.body).toBeUndefined()
  })

  it('throws "Session already active" on 409 Conflict', async () => {
    fetchMock.mockResolvedValue({ status: 409, ok: false })
    await expect(apiClient.apiCall('POST', '/api/action', {}))
      .rejects.toThrow('Session already active in another tab')
  })

  it('throws with JSON error message on non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok:         false,
      status:     400,
      statusText: 'Bad Request',
      json:       async () => ({ error: 'Missing model' }),
    })
    await expect(apiClient.apiCall('POST', '/api/model', {}))
      .rejects.toThrow('400: Missing model')
  })

  it('falls back to statusText when error body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok:         false,
      status:     500,
      statusText: 'Internal Server Error',
      json:       async () => { throw new SyntaxError('not json') },
    })
    await expect(apiClient.apiCall('GET', '/api/status'))
      .rejects.toThrow('500: Internal Server Error')
  })

  it('re-throws network errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiClient.apiCall('GET', '/api/status'))
      .rejects.toThrow('Failed to fetch')
  })

  it('reads the current session id from the URL', () => {
    window.history.replaceState({}, '', 'http://localhost/?session=abc12345')
    expect(apiClient.getSessionIdFromURL()).toBe('abc12345')
  })

  it('creates and reuses a tab-local owner token', () => {
    const first = apiClient.getOwnerToken()
    const second = apiClient.getOwnerToken()
    expect(first).toBeTruthy()
    expect(second).toBe(first)
  })

  it('injects session_id and owner_token into GET requests when the URL is session-scoped', async () => {
    window.history.replaceState({}, '', 'http://localhost/?session=session42')
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    await apiClient.apiCall('GET', '/api/status')

    const calledUrl = new URL(fetchMock.mock.calls[0][0])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(calledUrl.searchParams.get('session_id')).toBe('session42')
    expect(calledUrl.searchParams.get('owner_token')).toBeTruthy()
  })

  it('injects session_id and owner_token into POST requests when the URL is session-scoped', async () => {
    window.history.replaceState({}, '', 'http://localhost/?session=session42')
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    await apiClient.apiCall('POST', '/api/action', { action: 'analyze_job' })

    const [, opts] = fetchMock.mock.calls[0]
    const payload = JSON.parse(opts.body)
    expect(payload.action).toBe('analyze_job')
    expect(payload.session_id).toBe('session42')
    expect(payload.owner_token).toBeTruthy()
  })

  it('uses the original fetch implementation after later wrappers replace window.fetch', async () => {
    const nativeFetch = fetchMock
    nativeFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    const firstWrapper = vi.fn((...args) => apiClient.sessionAwareFetch(...args))
    const secondWrapper = vi.fn((...args) => window.fetch(...args))

    window.fetch = firstWrapper
    window.fetch = secondWrapper

    const result = await apiClient.sessionAwareFetch('/api/status', { method: 'GET' })

    expect(result.ok).toBe(true)
    expect(firstWrapper).not.toHaveBeenCalled()
    expect(secondWrapper).not.toHaveBeenCalled()
    expect(nativeFetch).toHaveBeenCalledTimes(1)
    const calledUrl = new URL(nativeFetch.mock.calls[0][0])
    expect(calledUrl.origin + calledUrl.pathname).toBe('http://localhost/api/status')
    expect(calledUrl.searchParams.get('owner_token')).toBeTruthy()
    expect(nativeFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
