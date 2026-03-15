/**
 * tests/js/api-client.test.js
 * Unit tests for web/api-client.js — StorageKeys constants and apiCall().
 */
const { StorageKeys, apiCall } = require('../../web/api-client.js')

// ── StorageKeys ───────────────────────────────────────────────────────────────

describe('StorageKeys', () => {
  it('defines SESSION_ID', () => {
    expect(StorageKeys.SESSION_ID).toBe('cv-builder-session-id')
  })
  it('defines SESSION_PATH', () => {
    expect(StorageKeys.SESSION_PATH).toBe('cv-builder-session-path')
  })
  it('defines TAB_DATA', () => {
    expect(StorageKeys.TAB_DATA).toBe('cv-builder-tab-data')
  })
  it('defines CURRENT_TAB', () => {
    expect(StorageKeys.CURRENT_TAB).toBe('cv-builder-current-tab')
  })
  it('defines CHAT_COLLAPSED', () => {
    expect(StorageKeys.CHAT_COLLAPSED).toBe('cv-builder-chat-collapsed')
  })
  it('has exactly 5 keys', () => {
    expect(Object.keys(StorageKeys)).toHaveLength(5)
  })
  it('all values are strings', () => {
    Object.values(StorageKeys).forEach(v => expect(typeof v).toBe('string'))
  })
})

// ── apiCall ───────────────────────────────────────────────────────────────────

describe('apiCall', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on a successful GET', async () => {
    fetch.mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ status: 'ok' }),
    })
    const result = await apiCall('GET', '/api/status')
    expect(result).toEqual({ status: 'ok' })
  })

  it('calls fetch with the correct method and endpoint', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiCall('GET', '/api/history')
    expect(fetch).toHaveBeenCalledWith(
      '/api/history',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('sends Content-Type application/json header', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiCall('GET', '/api/status')
    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('serializes body for POST requests', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiCall('POST', '/api/job', { job_description: 'test role' })
    const [, opts] = fetch.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual({ job_description: 'test role' })
  })

  it('does not attach a body for GET requests', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    await apiCall('GET', '/api/status')
    const [, opts] = fetch.mock.calls[0]
    expect(opts.body).toBeUndefined()
  })

  it('throws "Session already active" on 409 Conflict', async () => {
    fetch.mockResolvedValue({ status: 409, ok: false })
    await expect(apiCall('POST', '/api/action', {}))
      .rejects.toThrow('Session already active in another tab')
  })

  it('throws with JSON error message on non-ok response', async () => {
    fetch.mockResolvedValue({
      ok:         false,
      status:     400,
      statusText: 'Bad Request',
      json:       async () => ({ error: 'Missing model' }),
    })
    await expect(apiCall('POST', '/api/model', {}))
      .rejects.toThrow('400: Missing model')
  })

  it('falls back to statusText when error body is not JSON', async () => {
    fetch.mockResolvedValue({
      ok:         false,
      status:     500,
      statusText: 'Internal Server Error',
      json:       async () => { throw new SyntaxError('not json') },
    })
    await expect(apiCall('GET', '/api/status'))
      .rejects.toThrow('500: Internal Server Error')
  })

  it('re-throws network errors', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiCall('GET', '/api/status'))
      .rejects.toThrow('Failed to fetch')
  })
})
