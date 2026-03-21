/**
 * tests/js/publications-review.test.js
 * Unit tests for web/publications-review.js — filter, toggle, submit.
 * (buildPublicationsReviewTable requires complex fetch + DOM construction
 *  and is covered by integration tests.)
 */
import {
  filterPublicationsTable,
  handlePubAction,
  submitPublicationDecisions,
} from '../../web/publications-review.js'

// ── Global stubs ──────────────────────────────────────────────────────────

beforeEach(() => {
  window.publicationDecisions = {}
  window._savedDecisions = null

  vi.stubGlobal('escapeHtml', s => String(s ?? ''))
  vi.stubGlobal('showToast', vi.fn())
  vi.stubGlobal('fetchAndReviewRewrites', vi.fn(async () => {}))
  // CSS.escape not available in jsdom — always stub
  vi.stubGlobal('CSS', { escape: s => String(s) })

  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.publicationDecisions
  delete window._savedDecisions
})

// ── filterPublicationsTable ───────────────────────────────────────────────

describe('filterPublicationsTable', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table id="publications-review-table">
        <tbody>
          <tr><td>Machine Learning paper</td></tr>
          <tr><td>Docker containers</td></tr>
          <tr class="pub-divider-row"><td>divider</td></tr>
        </tbody>
      </table>`
  })

  it('shows all rows when query is empty', () => {
    filterPublicationsTable('')
    const rows = document.querySelectorAll('#publications-review-table tbody tr:not(.pub-divider-row)')
    rows.forEach(r => expect(r.style.display).toBe(''))
  })

  it('hides rows not matching the query', () => {
    filterPublicationsTable('docker')
    const rows = document.querySelectorAll('#publications-review-table tbody tr:not(.pub-divider-row)')
    expect(rows[0].style.display).toBe('none')   // Machine Learning
    expect(rows[1].style.display).toBe('')        // Docker
  })

  it('is case-insensitive', () => {
    filterPublicationsTable('MACHINE')
    const rows = document.querySelectorAll('#publications-review-table tbody tr:not(.pub-divider-row)')
    expect(rows[0].style.display).toBe('')
    expect(rows[1].style.display).toBe('none')
  })

  it('does not hide .pub-divider-row rows', () => {
    filterPublicationsTable('xyz')
    const divider = document.querySelector('.pub-divider-row')
    expect(divider.style.display).toBe('')
  })
})

// ── handlePubAction ───────────────────────────────────────────────────────

describe('handlePubAction', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table><tbody>
        <tr data-cite-key="smith2020">
          <td class="action-btns">
            <button class="icon-btn" data-action="accept">✓</button>
            <button class="icon-btn active" data-action="reject">✗</button>
          </td>
        </tr>
      </tbody></table>`
    window.publicationDecisions = { smith2020: false }
  })

  it('stores accept=true in publicationDecisions', () => {
    handlePubAction('smith2020', true)
    expect(window.publicationDecisions['smith2020']).toBe(true)
  })

  it('stores accept=false in publicationDecisions', () => {
    window.publicationDecisions['smith2020'] = true
    handlePubAction('smith2020', false)
    expect(window.publicationDecisions['smith2020']).toBe(false)
  })

  it('sets active class on the matching action button', () => {
    handlePubAction('smith2020', true)
    const acceptBtn = document.querySelector('[data-action="accept"]')
    expect(acceptBtn.classList.contains('active')).toBe(true)
  })

  it('removes active class from the other button', () => {
    handlePubAction('smith2020', true)
    const rejectBtn = document.querySelector('[data-action="reject"]')
    expect(rejectBtn.classList.contains('active')).toBe(false)
  })

  it('does not throw when row is absent', () => {
    expect(() => handlePubAction('nonexistent', true)).not.toThrow()
  })
})

// ── submitPublicationDecisions ────────────────────────────────────────────

describe('submitPublicationDecisions', () => {
  it('shows error toast when no decisions', async () => {
    window.publicationDecisions = {}
    await submitPublicationDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('posts to /api/review-decisions on submit', async () => {
    window.publicationDecisions = { smith2020: true, jones2019: false }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitPublicationDecisions()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/review-decisions', expect.objectContaining({
      method: 'POST',
    }))
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.type).toBe('publications')
  })

  it('shows accepted/rejected counts in toast', async () => {
    window.publicationDecisions = { a: true, b: true, c: false }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitPublicationDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('2 kept'))
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('1 excluded'))
  })

  it('calls fetchAndReviewRewrites on success', async () => {
    window.publicationDecisions = { a: true }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    await submitPublicationDecisions()
    expect(globalThis.fetchAndReviewRewrites).toHaveBeenCalled()
  })

  it('shows error toast on API failure', async () => {
    window.publicationDecisions = { a: true }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })
    await submitPublicationDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Server error'), 'error')
  })

  it('shows error toast on network failure', async () => {
    window.publicationDecisions = { a: true }
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    await submitPublicationDecisions()
    expect(globalThis.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error')
  })
})
