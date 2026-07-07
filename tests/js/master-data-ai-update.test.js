// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * tests/js/master-data-ai-update.test.js
 * Unit tests for web/master-data-ai-update.js — the GAP-01 "Update via AI"
 * panel (natural-language / document-ingestion master-data updates).
 */

import {
  renderMasterDataAiUpdatePanel,
  renderMasterDataAiUpdateDisabledNote,
  toggleMasterDataAiPanel,
  setMasterDataAiMode,
  handleMasterDataAiFileUpload,
  submitMasterDataAiPropose,
  discardMasterDataAiProposal,
  selectMasterDataAiNonFlagged,
  confirmMasterDataAiUpdate,
} from '../../web/master-data-ai-update.js'

// ---------------------------------------------------------------------------
// Permanent global stubs
// ---------------------------------------------------------------------------

let showConfirmModalMock = vi.fn(async () => true)
vi.stubGlobal('showConfirmModal', (...args) => showConfirmModalMock(...args))

beforeEach(() => {
  document.body.innerHTML = `<div id="host">${renderMasterDataAiUpdatePanel()}</div>`
  showConfirmModalMock = vi.fn(async () => true)
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.stubGlobal('showConfirmModal', (...args) => showConfirmModalMock(...args))
})

function mockFetchOnce(status, jsonBody) {
  fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => jsonBody,
  })
}

// ── Panel shell ───────────────────────────────────────────────────────────────

describe('renderMasterDataAiUpdatePanel', () => {
  it('starts collapsed', () => {
    const body = document.getElementById('mdu-panel-body')
    expect(body.style.display).toBe('none')
    expect(document.getElementById('mdu-toggle-btn').getAttribute('aria-expanded')).toBe('false')
  })

  it('renders both mode tabs, NL selected by default', () => {
    expect(document.getElementById('mdu-mode-nl_instruction-btn').getAttribute('aria-selected')).toBe('true')
    expect(document.getElementById('mdu-mode-document_ingestion-btn').getAttribute('aria-selected')).toBe('false')
    expect(document.getElementById('mdu-document_ingestion-input-area').style.display).toBe('none')
  })

  it('associates the upload disclosure with the file input via aria-describedby', () => {
    const fileInput = document.getElementById('mdu-doc-file-input')
    expect(fileInput.getAttribute('aria-describedby')).toBe('mdu-upload-disclosure')
    expect(document.getElementById('mdu-upload-disclosure')).not.toBeNull()
  })

  it('Confirm and Write does not exist until a proposal is rendered (no premature button)', () => {
    expect(document.getElementById('mdu-confirm-btn')).toBeNull()
  })
})

describe('renderMasterDataAiUpdateDisabledNote', () => {
  it('renders an explanatory note, not a silently empty string', () => {
    const html = renderMasterDataAiUpdateDisabledNote()
    expect(html).toContain('Update via AI')
    expect(html.trim().length).toBeGreaterThan(0)
  })
})

// ── Expand/collapse + mode toggle ────────────────────────────────────────────

describe('toggleMasterDataAiPanel', () => {
  it('expands then collapses on repeated calls', () => {
    toggleMasterDataAiPanel()
    expect(document.getElementById('mdu-panel-body').style.display).toBe('block')
    expect(document.getElementById('mdu-toggle-btn').getAttribute('aria-expanded')).toBe('true')

    toggleMasterDataAiPanel()
    expect(document.getElementById('mdu-panel-body').style.display).toBe('none')
    expect(document.getElementById('mdu-toggle-btn').getAttribute('aria-expanded')).toBe('false')
  })
})

describe('setMasterDataAiMode', () => {
  it('switches the visible input area and aria-selected state', () => {
    setMasterDataAiMode('document_ingestion')
    expect(document.getElementById('mdu-document_ingestion-input-area').style.display).toBe('block')
    expect(document.getElementById('mdu-nl_instruction-input-area').style.display).toBe('none')
    expect(document.getElementById('mdu-mode-document_ingestion-btn').getAttribute('aria-selected')).toBe('true')
    expect(document.getElementById('mdu-mode-nl_instruction-btn').getAttribute('aria-selected')).toBe('false')

    setMasterDataAiMode('nl_instruction')
    expect(document.getElementById('mdu-nl_instruction-input-area').style.display).toBe('block')
  })
})

// ── File upload ───────────────────────────────────────────────────────────────

describe('handleMasterDataAiFileUpload', () => {
  it('posts to /api/upload-file and fills the document textarea on success', async () => {
    mockFetchOnce(200, { ok: true, text: 'extracted resume text', filename: 'old-cv.pdf', content_length: 21 })
    const file = new File(['dummy'], 'old-cv.pdf', { type: 'application/pdf' })
    const event = { target: { files: [file] } }

    await handleMasterDataAiFileUpload(event)

    expect(fetch).toHaveBeenCalledWith('/api/upload-file', expect.objectContaining({ method: 'POST' }))
    expect(document.getElementById('mdu-doc-textarea').value).toBe('extracted resume text')
    expect(document.getElementById('mdu-status').textContent).toContain('old-cv.pdf')
  })

  it('shows an error message on upload failure without throwing', async () => {
    mockFetchOnce(400, { error: 'Unsupported file type' })
    const file = new File(['dummy'], 'bad.xyz')
    await expect(handleMasterDataAiFileUpload({ target: { files: [file] } })).resolves.not.toThrow()
    expect(document.getElementById('mdu-status').textContent).toContain('Unsupported file type')
  })

  it('does nothing when no file is selected', async () => {
    await handleMasterDataAiFileUpload({ target: { files: [] } })
    expect(fetch).not.toHaveBeenCalled()
  })
})

// ── Propose ───────────────────────────────────────────────────────────────────

describe('submitMasterDataAiPropose', () => {
  it('shows a validation message instead of calling the API when input is empty', async () => {
    await submitMasterDataAiPropose()
    expect(fetch).not.toHaveBeenCalled()
    expect(document.getElementById('mdu-status').textContent).toContain('describe the change')
  })

  it('posts to the nl-update propose endpoint for the default mode', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add K8s to Acme role'
    mockFetchOnce(200, { ok: true, changes: [], error: null })
    await submitMasterDataAiPropose()
    expect(fetch).toHaveBeenCalledWith('/api/master-data/nl-update/propose', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('add K8s to Acme role'),
    }))
  })

  it('posts to the ingest-document propose endpoint when in document mode', async () => {
    setMasterDataAiMode('document_ingestion')
    document.getElementById('mdu-doc-textarea').value = 'pasted resume text'
    mockFetchOnce(200, { ok: true, changes: [], error: null })
    await submitMasterDataAiPropose()
    expect(fetch).toHaveBeenCalledWith('/api/master-data/ingest-document/propose', expect.objectContaining({
      body: expect.stringContaining('pasted resume text'),
    }))
  })

  it('shows empty-state copy when propose returns zero changes', async () => {
    document.getElementById('mdu-nl-textarea').value = 'something vague'
    mockFetchOnce(200, { ok: true, changes: [], error: null })
    await submitMasterDataAiPropose()
    expect(document.getElementById('mdu-review-area').textContent).toContain('No changes could be proposed')
  })

  it('renders the review area with proposed changes, unchecked by default, confirm disabled', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add K8s to Acme role'
    mockFetchOnce(200, {
      ok: true,
      proposal_id: 'mdup_123',
      changes: [
        { id: 'mdu_1', section: 'experience', op: 'add', label: 'New achievement', proposed: { text: 'Delivered K8s pipeline' }, rationale: 'matched Acme' },
      ],
    })
    await submitMasterDataAiPropose()

    const checkbox = document.getElementById('mdu-chk-mdu_1')
    expect(checkbox).not.toBeNull()
    expect(checkbox.checked).toBe(false)
    expect(document.getElementById('mdu-confirm-btn').disabled).toBe(true)
    expect(document.getElementById('mdu-discard-btn').style.display).not.toBe('none')
  })

  it('enables Confirm and Write only once at least one row is checked', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add two things'
    mockFetchOnce(200, {
      ok: true,
      proposal_id: 'mdup_123',
      changes: [
        { id: 'mdu_1', section: 'skills', op: 'add', label: 'A', proposed: { name: 'Rust' } },
        { id: 'mdu_2', section: 'skills', op: 'add', label: 'B', proposed: { name: 'Go' } },
      ],
    })
    await submitMasterDataAiPropose()

    const confirmBtn = document.getElementById('mdu-confirm-btn')
    expect(confirmBtn.disabled).toBe(true)

    document.getElementById('mdu-chk-mdu_1').checked = true
    document.getElementById('mdu-chk-mdu_1').dispatchEvent(new Event('change'))
    expect(confirmBtn.disabled).toBe(false)

    document.getElementById('mdu-chk-mdu_1').checked = false
    document.getElementById('mdu-chk-mdu_1').dispatchEvent(new Event('change'))
    expect(confirmBtn.disabled).toBe(true)
  })

  it('renders duplicate/persuasion flags with distinct amber banners in the review row', async () => {
    document.getElementById('mdu-nl-textarea').value = 'extract skills'
    mockFetchOnce(200, {
      ok: true,
      proposal_id: 'mdup_123',
      changes: [
        { id: 'mdu_1', section: 'skills', op: 'add', label: 'Dup', proposed: { name: 'Python' }, possible_duplicate_of: 'exp_005' },
        { id: 'mdu_2', section: 'experience', op: 'add', label: 'Weak', proposed: { text: 'Helped with stuff' }, persuasion_flags: ['no_strong_verb'] },
      ],
    })
    await submitMasterDataAiPropose()

    expect(document.getElementById('mdu-row-mdu_1').textContent).toContain('possible duplicate of exp_005')
    expect(document.getElementById('mdu-row-mdu_2').textContent).toContain('quality advisory')
    // Accessible name includes the flag, not just the label (committee round-3 fix).
    expect(document.getElementById('mdu-chk-mdu_1').getAttribute('aria-label')).toContain('possible duplicate of exp_005')
  })

  it('"Select all non-flagged" checks unflagged rows and leaves flagged rows unchecked', async () => {
    document.getElementById('mdu-nl-textarea').value = 'extract several things'
    mockFetchOnce(200, {
      ok: true,
      proposal_id: 'mdup_123',
      changes: [
        { id: 'mdu_clean', section: 'skills', op: 'add', label: 'Clean', proposed: { name: 'Rust' } },
        { id: 'mdu_dup', section: 'skills', op: 'add', label: 'Dup', proposed: { name: 'Python' }, possible_duplicate_of: 'existing' },
      ],
    })
    await submitMasterDataAiPropose()

    selectMasterDataAiNonFlagged()

    expect(document.getElementById('mdu-chk-mdu_clean').checked).toBe(true)
    expect(document.getElementById('mdu-chk-mdu_dup').checked).toBe(false)
    expect(document.getElementById('mdu-confirm-btn').disabled).toBe(false)
  })

  it('shows the clarification dialog instead of a diff when requires_clarification is true', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add a thing'
    mockFetchOnce(200, { ok: true, requires_clarification: true, clarification_question: 'Which role?', confidence: 0.5 })
    await submitMasterDataAiPropose()

    const panel = document.getElementById('mdu-clarification-panel')
    expect(panel).not.toBeNull()
    expect(panel.textContent).toContain('Which role?')
    expect(panel.getAttribute('role')).toBe('alert')
    // Pre-filled with the original instruction.
    expect(document.getElementById('mdu-clarification-input').value).toBe('add a thing')
  })

  it('clarification dialog mounts into its own container, not a shared/hard-coded one', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add a thing'
    mockFetchOnce(200, { ok: true, requires_clarification: true, clarification_question: 'Which role?', confidence: 0.5 })
    await submitMasterDataAiPropose()

    expect(document.getElementById('mdu-clarification-container').contains(
      document.getElementById('mdu-clarification-panel'),
    )).toBe(true)
  })

  it('returns focus to the propose button when the clarification dialog is cancelled', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add a thing'
    mockFetchOnce(200, { ok: true, requires_clarification: true, clarification_question: 'Which role?', confidence: 0.5 })
    await submitMasterDataAiPropose()

    document.getElementById('mdu-clarification-cancel').click()
    expect(document.getElementById('mdu-clarification-panel')).toBeNull()
    expect(document.activeElement).toBe(document.getElementById('mdu-propose-btn'))
  })

  it('shows a server error message without throwing', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add a thing'
    mockFetchOnce(503, { ok: false, error: 'No LLM configured' })
    await submitMasterDataAiPropose()
    expect(document.getElementById('mdu-status').textContent).toContain('No LLM configured')
  })

  it('shows a network error message without throwing', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add a thing'
    fetch.mockRejectedValueOnce(new Error('network down'))
    await expect(submitMasterDataAiPropose()).resolves.not.toThrow()
    expect(document.getElementById('mdu-status').textContent).toContain('network down')
  })
})

describe('discardMasterDataAiProposal', () => {
  it('clears the review area and hides the discard button', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add a thing'
    mockFetchOnce(200, {
      ok: true, proposal_id: 'mdup_1',
      changes: [{ id: 'mdu_1', section: 'skills', op: 'add', label: 'A', proposed: { name: 'Rust' } }],
    })
    await submitMasterDataAiPropose()
    expect(document.getElementById('mdu-review-area').innerHTML).not.toBe('')

    discardMasterDataAiProposal()
    expect(document.getElementById('mdu-review-area').innerHTML).toBe('')
    expect(document.getElementById('mdu-discard-btn').style.display).toBe('none')
  })
})

// ── Confirm and write ─────────────────────────────────────────────────────────

async function proposeOneChange() {
  document.getElementById('mdu-nl-textarea').value = 'add K8s to Acme role'
  mockFetchOnce(200, {
    ok: true,
    proposal_id: 'mdup_123',
    changes: [{ id: 'mdu_1', section: 'experience', op: 'add', label: 'New achievement', proposed: { text: 'Delivered K8s pipeline' }, rationale: 'matched Acme', source: 'nl_instruction' }],
  })
  await submitMasterDataAiPropose()
  document.getElementById('mdu-chk-mdu_1').checked = true
  document.getElementById('mdu-chk-mdu_1').dispatchEvent(new Event('change'))
}

describe('confirmMasterDataAiUpdate', () => {
  it('shows a confirmation dialog with AI-provenance-specific copy, not the harvest copy verbatim', async () => {
    await proposeOneChange()
    mockFetchOnce(200, { ok: true, written_count: 1, diff_summary: [], commit_hash: 'abc1234' })

    await confirmMasterDataAiUpdate()

    expect(showConfirmModalMock).toHaveBeenCalledWith(
      expect.stringContaining('Write'),
      expect.stringContaining('proposed by AI'),
    )
  })

  it('does nothing if the user cancels the confirm dialog', async () => {
    await proposeOneChange()
    showConfirmModalMock = vi.fn(async () => false)

    await confirmMasterDataAiUpdate()

    expect(fetch).not.toHaveBeenCalledWith('/api/master-data/confirm-update', expect.anything())
  })

  it('posts confirm-update with only the checked ids and renders success + provenance', async () => {
    await proposeOneChange()
    mockFetchOnce(200, {
      ok: true, written_count: 1, commit_hash: 'abc1234', git_error: null, push_error: null,
      diff_summary: [{ id: 'mdu_1', applied: true, label: 'New achievement' }],
    })

    await confirmMasterDataAiUpdate()

    const [, options] = fetch.mock.calls.at(-1)
    expect(JSON.parse(options.body)).toEqual({ proposal_id: 'mdup_123', selected_ids: ['mdu_1'] })

    const resultEl = document.getElementById('mdu-result')
    expect(resultEl.textContent).toContain('1 item')
    expect(resultEl.textContent).toContain('abc1234')
    expect(resultEl.textContent).toContain('matched Acme') // rationale surfaced, not just commit_hash
  })

  it('surfaces git_error/push_error warnings without failing the whole confirm', async () => {
    await proposeOneChange()
    mockFetchOnce(200, {
      ok: true, written_count: 1, commit_hash: null,
      git_error: { message: 'Git commit failed.' }, push_error: null,
      diff_summary: [{ id: 'mdu_1', applied: true, label: 'New achievement' }],
    })

    await confirmMasterDataAiUpdate()
    expect(document.getElementById('mdu-result').textContent).toContain('Git commit skipped')
  })

  it('two-phase staleness: writes nothing, deselects stale rows, and requires an explicit resubmit', async () => {
    document.getElementById('mdu-nl-textarea').value = 'add two things'
    mockFetchOnce(200, {
      ok: true,
      proposal_id: 'mdup_1',
      changes: [
        { id: 'mdu_valid', section: 'skills', op: 'add', label: 'Valid', proposed: { name: 'Rust' } },
        { id: 'mdu_stale', section: 'experience', op: 'add', label: 'Stale', proposed: { text: 'x' } },
      ],
    })
    await submitMasterDataAiPropose()
    document.getElementById('mdu-chk-mdu_valid').checked = true
    document.getElementById('mdu-chk-mdu_stale').checked = true
    document.getElementById('mdu-chk-mdu_valid').dispatchEvent(new Event('change'))

    mockFetchOnce(200, {
      ok: false,
      stale_changes: [{ id: 'mdu_stale', label: 'Stale', reason: 'target no longer exists' }],
      applicable_changes: [{ id: 'mdu_valid', label: 'Valid' }],
    })

    await confirmMasterDataAiUpdate()

    // Nothing written this call — no success banner, an explanatory one instead.
    const resultEl = document.getElementById('mdu-result')
    expect(resultEl.textContent).toContain('Nothing was written')
    expect(resultEl.textContent).toContain('target no longer exists')

    // Stale row auto-deselected and disabled; valid row untouched.
    expect(document.getElementById('mdu-chk-mdu_stale').checked).toBe(false)
    expect(document.getElementById('mdu-chk-mdu_stale').disabled).toBe(true)
    expect(document.getElementById('mdu-chk-mdu_valid').checked).toBe(true)

    // Live region announces the change for screen-reader users.
    expect(document.getElementById('mdu-selection-live').textContent).toContain('no longer valid')

    // A second explicit confirm (not automatic) applies the reduced set.
    fetch.mockClear()
    mockFetchOnce(200, { ok: true, written_count: 1, commit_hash: 'def5678', diff_summary: [] })
    await confirmMasterDataAiUpdate()
    const [, options] = fetch.mock.calls.at(-1)
    expect(JSON.parse(options.body).selected_ids).toEqual(['mdu_valid'])
  })

  it('shows a network error message without throwing', async () => {
    await proposeOneChange()
    fetch.mockRejectedValueOnce(new Error('offline'))
    await expect(confirmMasterDataAiUpdate()).resolves.not.toThrow()
    expect(document.getElementById('mdu-result').textContent).toContain('offline')
  })
})
