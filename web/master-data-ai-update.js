// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * "Update via AI" panel (GAP-01): natural-language instruction or
 * document-ingestion updates to Master_CV_Data.json, proposed by an LLM,
 * reviewed as a diff, and written only on explicit confirmation.
 *
 * Rendered inside the Master CV tab (see web/master-cv.js), collapsed by
 * default. Reuses web/proposal-review.js's row renderer for the diff review
 * list rather than forking a third copy of that UI (harvest.js and
 * layout-instruction.js's renderContentProposals already exist).
 *
 * Public exports (assigned to window by web/src/main.js's bundle):
 *   renderMasterDataAiUpdatePanel()
 *   toggleMasterDataAiPanel()
 *   setMasterDataAiMode(mode)
 *   handleMasterDataAiFileUpload(event)
 *   submitMasterDataAiPropose()
 *   discardMasterDataAiProposal()
 *   confirmMasterDataAiUpdate()
 *
 * Keyboard: Ctrl/Cmd+Enter on either input textarea submits "Propose Update"
 * (wired locally via onkeydown, not keyboard-shortcuts.js's global
 * _TAB_ACTION_BTN map — the Master CV tab has several independent forms with
 * no single primary action, so claiming this panel as *the* tab-wide
 * Ctrl+Enter target would be misleading/regress the tab's other save
 * actions; a local, scoped shortcut is the correct fit here instead).
 */

import { getLogger } from './logger.js';
import { esc, renderProposalRow, attachProposalRowListeners } from './proposal-review.js';

const log = getLogger('master-data-ai-update');

// ── State ─────────────────────────────────────────────────────────────────────
// Closure-scoped, consistent with how harvest.js manages its own local state —
// this panel doesn't need to participate in state-manager.js's globals.

let _mduMode = 'nl_instruction';           // 'nl_instruction' | 'document_ingestion'
let _mduPendingProposal = null;            // { proposalId, source, changes }
let _mduPriorClarifications = [];          // [{question, answer}, ...]

function _mduResetState() {
  _mduMode = 'nl_instruction';
  _mduPendingProposal = null;
  _mduPriorClarifications = [];
}

// ── Panel shell ───────────────────────────────────────────────────────────────

function renderMasterDataAiUpdatePanel() {
  // Reset module state on every fresh render (not just page load) — the DOM
  // this function returns always depicts the nl_instruction/no-proposal
  // default, so any carried-over state from a prior render (e.g. the user
  // switched tabs mid-proposal and populateMasterTab() re-rendered this
  // panel) must be discarded to avoid the two going out of sync.
  _mduResetState();
  return `
    <div id="mdu-panel" style="margin:16px 0;border:1px solid var(--cv-border);border-radius:8px;overflow:hidden;">
      <button type="button" id="mdu-toggle-btn" onclick="toggleMasterDataAiPanel()"
        aria-expanded="false" aria-controls="mdu-panel-body"
        style="width:100%;text-align:left;background:var(--cv-bg-light);border:none;padding:12px 16px;font-size:0.95em;font-weight:700;color:var(--cv-text-primary);cursor:pointer;display:flex;align-items:center;gap:8px;">
        <span id="mdu-toggle-icon">▸</span> 🤖 Update via AI
      </button>
      <div id="mdu-panel-body" style="display:none;padding:16px;">
        <p style="font-size:0.85em;color:var(--cv-text-secondary);margin:0 0 14px;">
          Prefer plain English, or have an old CV or LinkedIn export? Describe a change or paste/upload a
          document and AI will draft it for you to review — nothing is saved until you confirm.
        </p>

        <div role="tablist" aria-label="Update method" style="display:flex;gap:6px;margin-bottom:12px;">
          <button type="button" id="mdu-mode-nl_instruction-btn" role="tab" aria-selected="true"
            onclick="setMasterDataAiMode('nl_instruction')"
            style="padding:6px 14px;font-size:0.85em;border-radius:6px 6px 0 0;border:1px solid var(--cv-border);border-bottom:none;background:var(--cv-white);color:var(--cv-text-primary);font-weight:600;cursor:pointer;">
            Describe a change
          </button>
          <button type="button" id="mdu-mode-document_ingestion-btn" role="tab" aria-selected="false"
            onclick="setMasterDataAiMode('document_ingestion')"
            style="padding:6px 14px;font-size:0.85em;border-radius:6px 6px 0 0;border:1px solid var(--cv-border);border-bottom:none;background:var(--cv-bg-subtle);color:var(--cv-text-secondary);cursor:pointer;">
            Paste or upload a document
          </button>
        </div>

        <div id="mdu-nl_instruction-input-area">
          <label for="mdu-nl-textarea" style="font-size:0.82em;font-weight:600;color:var(--cv-text-muted);display:block;margin-bottom:4px;">
            Describe the change
          </label>
          <textarea id="mdu-nl-textarea" rows="3" maxlength="4000"
            placeholder="e.g. &quot;I just finished a project at Acme using Kubernetes — add it to that role's achievements.&quot;"
            onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();submitMasterDataAiPropose();}"
            style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--cv-border);border-radius:4px;font-size:0.88em;resize:vertical;"></textarea>
        </div>

        <div id="mdu-document_ingestion-input-area" style="display:none;">
          <label for="mdu-doc-textarea" style="font-size:0.82em;font-weight:600;color:var(--cv-text-muted);display:block;margin-bottom:4px;">
            Paste document text, or upload a file
          </label>
          <textarea id="mdu-doc-textarea" rows="4" maxlength="60000"
            placeholder="Paste an old CV or LinkedIn export..."
            onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();submitMasterDataAiPropose();}"
            style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--cv-border);border-radius:4px;font-size:0.88em;resize:vertical;margin-bottom:8px;"></textarea>
          <input type="file" id="mdu-doc-file-input" accept=".txt,.md,.rst,.html,.htm,.pdf,.docx,.rtf"
            onchange="handleMasterDataAiFileUpload(event)" aria-describedby="mdu-upload-disclosure"
            style="font-size:0.82em;">
          <p id="mdu-upload-disclosure" style="font-size:0.78em;color:var(--cv-text-secondary);margin:6px 0 0;">
            This document will be sent to your configured AI provider — see the data handling badge above.
            An old CV or LinkedIn export can carry more personal information than a job description.
          </p>
        </div>

        <div style="display:flex;gap:8px;align-items:center;margin-top:12px;">
          <button type="button" id="mdu-propose-btn" onclick="submitMasterDataAiPropose()"
            style="padding:8px 18px;font-size:0.88em;font-weight:600;cursor:pointer;background:var(--cv-accent);color:var(--cv-white);border:none;border-radius:6px;">
            Propose Update
          </button>
          <button type="button" id="mdu-discard-btn" onclick="discardMasterDataAiProposal()" style="display:none;padding:8px 14px;font-size:0.85em;cursor:pointer;background:var(--cv-white);color:var(--cv-text-secondary);border:1px solid var(--cv-border);border-radius:6px;">
            Discard
          </button>
        </div>

        <div id="mdu-status" role="status" aria-live="polite" style="margin-top:10px;font-size:0.85em;color:var(--cv-text-secondary);"></div>
        <div id="mdu-clarification-container"></div>
        <div id="mdu-review-area" style="margin-top:12px;"></div>
        <div id="mdu-result" style="margin-top:12px;"></div>
      </div>
    </div>`;
}

function renderMasterDataAiUpdateDisabledNote() {
  return `
    <div style="margin:16px 0;padding:10px 14px;background:var(--cv-bg-subtle);border:1px solid var(--cv-border);border-radius:6px;font-size:0.85em;color:var(--cv-text-secondary);">
      🤖 Update via AI is available before analysis starts or during refinement.
    </div>`;
}

// ── Panel expand/collapse + mode toggle ──────────────────────────────────────

function toggleMasterDataAiPanel() {
  const body = document.getElementById('mdu-panel-body');
  const btn = document.getElementById('mdu-toggle-btn');
  const icon = document.getElementById('mdu-toggle-icon');
  if (!body || !btn) return;
  const expanded = body.style.display !== 'none';
  body.style.display = expanded ? 'none' : 'block';
  btn.setAttribute('aria-expanded', String(!expanded));
  if (icon) icon.textContent = expanded ? '▸' : '▾';
}

function setMasterDataAiMode(mode) {
  _mduMode = mode;
  for (const m of ['nl_instruction', 'document_ingestion']) {
    const btn = document.getElementById(`mdu-mode-${m}-btn`);
    const area = document.getElementById(`mdu-${m}-input-area`);
    const active = m === mode;
    if (btn) {
      btn.setAttribute('aria-selected', String(active));
      btn.style.background = active ? 'var(--cv-white)' : 'var(--cv-bg-subtle)';
      btn.style.color = active ? 'var(--cv-text-primary)' : 'var(--cv-text-secondary)';
      btn.style.fontWeight = active ? '600' : '400';
    }
    if (area) area.style.display = active ? 'block' : 'none';
  }
}

// ── Document upload ───────────────────────────────────────────────────────────

async function handleMasterDataAiFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('mdu-status');
  if (statusEl) statusEl.textContent = `Reading ${file.name}…`;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/upload-file', { method: 'POST', body: formData });
    const data = await resp.json();
    if (!resp.ok || data.error) {
      throw new Error(data.message || data.error || `Server error ${resp.status}`);
    }
    const textarea = document.getElementById('mdu-doc-textarea');
    if (textarea) textarea.value = data.text;
    if (statusEl) statusEl.textContent = `Loaded ${data.content_length.toLocaleString()} characters from "${data.filename}".`;
  } catch (err) {
    log.error('handleMasterDataAiFileUpload: failed', err);
    if (statusEl) statusEl.textContent = `Error reading file: ${err.message}`;
  }
}

// ── Propose ───────────────────────────────────────────────────────────────────

function _mduEndpointForMode(mode) {
  return mode === 'nl_instruction' ? '/api/master-data/nl-update/propose' : '/api/master-data/ingest-document/propose';
}

function _mduInputForMode(mode) {
  const el = document.getElementById(mode === 'nl_instruction' ? 'mdu-nl-textarea' : 'mdu-doc-textarea');
  return el ? el.value.trim() : '';
}

async function submitMasterDataAiPropose() {
  const input = _mduInputForMode(_mduMode);
  const statusEl = document.getElementById('mdu-status');
  const reviewArea = document.getElementById('mdu-review-area');
  const resultEl = document.getElementById('mdu-result');
  const proposeBtn = document.getElementById('mdu-propose-btn');

  if (!input) {
    if (statusEl) statusEl.textContent = _mduMode === 'nl_instruction'
      ? 'Please describe the change first.'
      : 'Please paste or upload document text first.';
    return;
  }

  if (reviewArea) reviewArea.innerHTML = '';
  if (resultEl) resultEl.innerHTML = '';
  document.getElementById('mdu-clarification-container').innerHTML = '';
  if (proposeBtn) { proposeBtn.disabled = true; proposeBtn.textContent = 'Analyzing…'; }
  if (statusEl) statusEl.textContent = 'Analyzing…';

  try {
    const body = { prior_clarifications: _mduPriorClarifications };
    body[_mduMode === 'nl_instruction' ? 'instruction' : 'text'] = input;
    const resp = await fetch(_mduEndpointForMode(_mduMode), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();

    if (!resp.ok || data.ok === false) {
      if (statusEl) statusEl.textContent = `Error: ${esc(data.error || 'Unknown error')}`;
      return;
    }

    if (data.requires_clarification) {
      if (statusEl) statusEl.textContent = '';
      _mduShowClarificationDialog(data.clarification_question, input);
      return;
    }

    _mduPriorClarifications = [];
    const changes = data.changes || [];
    if (statusEl) statusEl.textContent = '';

    if (changes.length === 0) {
      if (reviewArea) reviewArea.innerHTML = `<p style="font-size:0.85em;color:var(--cv-text-secondary);">No changes could be proposed from that — try adding more detail.</p>`;
      return;
    }

    _mduPendingProposal = { proposalId: data.proposal_id, source: _mduMode, changes };
    _mduRenderReviewArea();
  } catch (err) {
    log.error('submitMasterDataAiPropose: failed', err);
    if (statusEl) statusEl.textContent = `Network error: ${esc(err.message)}`;
  } finally {
    if (proposeBtn) { proposeBtn.disabled = false; proposeBtn.textContent = 'Propose Update'; }
  }
}

function discardMasterDataAiProposal() {
  _mduPendingProposal = null;
  _mduPriorClarifications = [];
  document.getElementById('mdu-review-area').innerHTML = '';
  document.getElementById('mdu-result').innerHTML = '';
  document.getElementById('mdu-discard-btn').style.display = 'none';
  const statusEl = document.getElementById('mdu-status');
  if (statusEl) statusEl.textContent = 'Discarded.';
}

// ── Clarification dialog ──────────────────────────────────────────────────────
// Modeled on showClarificationDialog() in web/layout-instruction.js, not a
// literal copy-paste port: that version hard-codes its mount point and uses
// non-namespaced element ids (layout-clarification-*), which would collide
// with this panel's own ids if both tabs are present in the DOM at once
// (CSS-hidden tabs aren't unmounted). This version mounts into the panel's
// own #mdu-clarification-container and uses an mdu-* id namespace throughout.

function _mduShowClarificationDialog(question, originalInstruction) {
  const container = document.getElementById('mdu-clarification-container');
  if (!container) {
    log.warn('_mduShowClarificationDialog: #mdu-clarification-container not found');
    return;
  }

  const originatingBtn = document.getElementById('mdu-propose-btn');

  const panel = document.createElement('div');
  panel.id = 'mdu-clarification-panel';
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'background:var(--cv-warn-bg);border:1px solid var(--cv-warn-light);border-radius:8px;padding:14px;margin-top:10px;';
  panel.innerHTML = `
    <p style="margin:0 0 6px;font-size:0.85em;color:var(--cv-warn-text);font-weight:600;">
      <span aria-hidden="true">❓</span> Almost there — a bit more detail would help:
    </p>
    <p style="margin:0 0 10px;font-size:0.88em;color:var(--cv-warn-text);">${esc(question)}</p>
    <label for="mdu-clarification-input" style="font-size:0.85em;font-weight:600;color:var(--cv-text-muted);display:block;margin-bottom:4px;">
      Your clarification:
    </label>
    <textarea id="mdu-clarification-input" rows="2"
      style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--cv-warn-light);border-radius:4px;font-size:0.88em;resize:vertical;"
      aria-label="Clarification for master data update">${esc(originalInstruction)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button type="button" id="mdu-clarification-submit"
        style="background:var(--cv-warn);color:var(--cv-white);border:none;border-radius:4px;padding:6px 14px;font-size:0.85em;cursor:pointer;font-weight:600;">
        Submit clarification
      </button>
      <button type="button" id="mdu-clarification-cancel"
        style="background:none;border:1px solid var(--cv-warn);color:var(--cv-warn-text);border-radius:4px;padding:6px 14px;font-size:0.85em;cursor:pointer;">
        Cancel
      </button>
    </div>`;

  container.innerHTML = '';
  container.appendChild(panel);

  const clarInput = panel.querySelector('#mdu-clarification-input');
  const submitBtn = panel.querySelector('#mdu-clarification-submit');
  const cancelBtn = panel.querySelector('#mdu-clarification-cancel');

  clarInput.focus();
  clarInput.setSelectionRange(clarInput.value.length, clarInput.value.length);

  const closeAndRestoreFocus = () => {
    panel.remove();
    if (originatingBtn) originatingBtn.focus();
  };

  submitBtn.addEventListener('click', () => {
    const refined = clarInput.value.trim();
    if (refined) {
      _mduPriorClarifications = [..._mduPriorClarifications, { question, answer: refined }];
      const inputEl = document.getElementById(_mduMode === 'nl_instruction' ? 'mdu-nl-textarea' : 'mdu-doc-textarea');
      if (inputEl) inputEl.value = refined;
    }
    closeAndRestoreFocus();
    if (refined) submitMasterDataAiPropose();
  });
  cancelBtn.addEventListener('click', closeAndRestoreFocus);
  clarInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitBtn.click(); }
    if (e.key === 'Escape') cancelBtn.click();
  });
}

// ── Review area (proposal rows) ───────────────────────────────────────────────

function _mduChangeDisplayText(change) {
  const proposed = change.proposed;
  if (typeof proposed === 'string') return proposed;
  if (proposed && typeof proposed === 'object') {
    if ('text' in proposed) return proposed.text;
    if ('name' in proposed) return proposed.name;
    return JSON.stringify(proposed);
  }
  return '';
}

function _mduFlagHtml(change) {
  if (change.possible_duplicate_of) {
    return `<div style="margin-bottom:6px;padding:6px 8px;background:var(--cv-warn-bg);border:1px solid var(--cv-warn-border);border-radius:4px;font-size:0.8em;color:var(--cv-warn-text);">
      ⚠ possible duplicate of ${esc(change.possible_duplicate_of)}
    </div>`;
  }
  if (change.persuasion_flags && change.persuasion_flags.length) {
    return `<div style="margin-bottom:6px;padding:6px 8px;background:var(--cv-warn-bg);border:1px solid var(--cv-warn-border);border-radius:4px;font-size:0.8em;color:var(--cv-warn-text);">
      ⚠ quality advisory: ${esc(change.persuasion_flags.join(', '))}
    </div>`;
  }
  return '';
}

function _mduAriaSuffix(change) {
  const parts = [];
  if (change.possible_duplicate_of) parts.push(`possible duplicate of ${change.possible_duplicate_of}`);
  if (change.persuasion_flags && change.persuasion_flags.length) parts.push(`quality advisory: ${change.persuasion_flags.join(', ')}`);
  return parts.length ? `, ${parts.join(', ')}` : '';
}

function _mduRenderReviewArea() {
  const reviewArea = document.getElementById('mdu-review-area');
  const discardBtn = document.getElementById('mdu-discard-btn');
  if (!reviewArea || !_mduPendingProposal) return;

  const changes = _mduPendingProposal.changes;
  const rowsHtml = changes.map((c) => renderProposalRow({
    id: c.id,
    typeLabel: c.section,
    label: c.label,
    proposed: _mduChangeDisplayText(c),
    detailText: c.rationale,
    flagHtml: _mduFlagHtml(c),
    checked: false,
  }, {
    idPrefix: 'mdu',
    checkboxDataAttr: 'mdu-id',
    ariaLabelSuffix: _mduAriaSuffix(c),
  })).join('');

  const flaggedCount = changes.filter(c => c.possible_duplicate_of || (c.persuasion_flags && c.persuasion_flags.length)).length;

  reviewArea.innerHTML = `
    <div role="group" aria-label="Proposed changes, ${changes.length} items, 0 selected" id="mdu-row-group">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:0.85em;color:var(--cv-text-secondary);">${changes.length} proposed change${changes.length === 1 ? '' : 's'}</span>
        <button type="button" onclick="selectMasterDataAiNonFlagged()" style="font-size:0.8em;padding:4px 10px;border:1px solid var(--cv-border);border-radius:4px;background:var(--cv-white);color:var(--cv-text-primary);cursor:pointer;">
          Select all non-flagged
        </button>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    </div>
    <div id="mdu-selection-live" aria-live="polite" class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;"></div>
    <button type="button" id="mdu-confirm-btn" onclick="confirmMasterDataAiUpdate()" disabled
      style="margin-top:10px;padding:9px 20px;font-size:0.9em;font-weight:600;cursor:not-allowed;background:var(--cv-slate-300);color:var(--cv-white);border:none;border-radius:6px;">
      Confirm and Write
    </button>
    ${flaggedCount ? `<p style="font-size:0.78em;color:var(--cv-warn-text);margin-top:6px;">${flaggedCount} item${flaggedCount === 1 ? '' : 's'} flagged for review above.</p>` : ''}`;

  if (discardBtn) discardBtn.style.display = 'inline-block';

  const container = document.getElementById('mdu-review-area');
  attachProposalRowListeners(container, 'mdu');
  container.querySelectorAll('input[data-mdu-id]').forEach((cb) => {
    cb.addEventListener('change', _mduUpdateConfirmButtonState);
  });
  _mduUpdateConfirmButtonState();
}

function _mduUpdateConfirmButtonState() {
  const checked = document.querySelectorAll('input[data-mdu-id]:checked');
  const confirmBtn = document.getElementById('mdu-confirm-btn');
  const group = document.getElementById('mdu-row-group');
  const liveEl = document.getElementById('mdu-selection-live');
  const total = document.querySelectorAll('input[data-mdu-id]').length;
  if (confirmBtn) {
    confirmBtn.disabled = checked.length === 0;
    confirmBtn.style.cursor = checked.length === 0 ? 'not-allowed' : 'pointer';
    confirmBtn.style.background = checked.length === 0 ? 'var(--cv-slate-300)' : 'var(--cv-success-md)';
  }
  if (group) group.setAttribute('aria-label', `Proposed changes, ${total} items, ${checked.length} selected`);
  if (liveEl) liveEl.textContent = `${checked.length} of ${total} selected`;
}

function selectMasterDataAiNonFlagged() {
  if (!_mduPendingProposal) return;
  const flaggedIds = new Set(
    _mduPendingProposal.changes
      .filter(c => c.possible_duplicate_of || (c.persuasion_flags && c.persuasion_flags.length))
      .map(c => c.id),
  );
  document.querySelectorAll('input[data-mdu-id]').forEach((cb) => {
    if (!flaggedIds.has(cb.dataset.mduId)) cb.checked = true;
  });
  _mduUpdateConfirmButtonState();
}

// ── Confirm and write ─────────────────────────────────────────────────────────

async function confirmMasterDataAiUpdate() {
  if (!_mduPendingProposal) return;
  const selectedIds = Array.from(document.querySelectorAll('input[data-mdu-id]:checked')).map(cb => cb.dataset.mduId);
  if (selectedIds.length === 0) return;

  const sourceLabel = _mduPendingProposal.source === 'nl_instruction' ? 'your instruction' : 'the uploaded document';
  const confirmed = await (typeof showConfirmModal === 'function'
    ? showConfirmModal(
        `Write ${selectedIds.length} change${selectedIds.length === 1 ? '' : 's'} to Master CV?`,
        `These ${selectedIds.length} change${selectedIds.length === 1 ? '' : 's'} were proposed by AI from ${sourceLabel} and have not been previously reviewed. ` +
        `Confirming will permanently write them to Master_CV_Data.json. A backup will be created first — see 🕐 Backups above to restore it if needed.`,
      )
    : Promise.resolve(window.confirm(`Write ${selectedIds.length} change(s) to Master CV? This will permanently write changes to Master_CV_Data.json.`)));

  if (!confirmed) return;

  const confirmBtn = document.getElementById('mdu-confirm-btn');
  const resultEl = document.getElementById('mdu-result');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Writing…'; }

  try {
    const resp = await fetch('/api/master-data/confirm-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal_id: _mduPendingProposal.proposalId, selected_ids: selectedIds }),
    });
    const data = await resp.json();

    if (data.ok === false && data.stale_changes) {
      _mduHandleStaleChanges(data.stale_changes, data.applicable_changes);
      return;
    }
    if (!data.ok) {
      if (resultEl) resultEl.innerHTML = `<p class="error-message">Confirm failed: ${esc(data.error || 'Unknown error')}</p>`;
      return;
    }

    const changesById = Object.fromEntries(_mduPendingProposal.changes.map(c => [c.id, c]));
    const writtenLines = (data.diff_summary || [])
      .filter(d => d.applied)
      .map(d => `<li>${esc(d.label || d.id)}${changesById[d.id]?.rationale ? ` — ${esc(changesById[d.id].rationale)}` : ''}</li>`)
      .join('');

    const commitInfo = data.commit_hash ? ` (commit ${esc(data.commit_hash)})` : '';
    const gitWarning = data.git_error
      ? `<p style="color:var(--cv-warn-text);font-size:0.87em;">⚠️ Git commit skipped: ${esc(data.git_error?.message || data.git_error)}</p>`
      : '';
    const pushWarning = data.push_error
      ? `<p style="color:var(--cv-warn-text);font-size:0.87em;">⚠️ Git push skipped: ${esc(data.push_error)}</p>`
      : '';

    if (resultEl) {
      resultEl.innerHTML = `
        <div style="background:var(--cv-success-bg);border:1px solid var(--cv-success-border);border-radius:6px;padding:12px 16px;">
          <p style="color:var(--cv-success-text);font-weight:600;margin:0 0 6px;">
            ✅ ${data.written_count} item${data.written_count === 1 ? '' : 's'} written to master CV${commitInfo}.
          </p>
          ${writtenLines ? `<ul style="font-size:0.82em;color:var(--cv-text-muted);margin:4px 0 0;padding-left:18px;">${writtenLines}</ul>` : ''}
          ${gitWarning}${pushWarning}
        </div>`;
    }

    document.getElementById('mdu-review-area').innerHTML = '';
    document.getElementById('mdu-discard-btn').style.display = 'none';
    _mduPendingProposal = null;
    _mduPriorClarifications = [];
  } catch (err) {
    log.error('confirmMasterDataAiUpdate: failed', err);
    if (resultEl) resultEl.innerHTML = `<p class="error-message">Network error: ${esc(err.message)}</p>`;
  } finally {
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm and Write'; }
  }
}

function _mduHandleStaleChanges(staleChanges, applicableChanges) {
  const resultEl = document.getElementById('mdu-result');
  const staleIds = new Set(staleChanges.map(s => s.id));

  document.querySelectorAll('input[data-mdu-id]').forEach((cb) => {
    if (staleIds.has(cb.dataset.mduId)) {
      cb.checked = false;
      cb.disabled = true;
      const row = document.getElementById(`mdu-row-${cb.dataset.mduId}`);
      if (row) row.style.opacity = '0.5';
    }
  });
  _mduUpdateConfirmButtonState();

  const liveEl = document.getElementById('mdu-selection-live');
  const summary = `${staleChanges.length} item${staleChanges.length === 1 ? ' is' : 's are'} no longer valid and ${staleChanges.length === 1 ? 'was' : 'were'} deselected; review and confirm again.`;
  if (liveEl) liveEl.textContent = summary;

  const staleList = staleChanges.map(s => `<li>${esc(s.label || s.id)} — ${esc(s.reason)}</li>`).join('');
  if (resultEl) {
    resultEl.innerHTML = `
      <div style="background:var(--cv-bg-subtle);border:1px solid var(--cv-slate-300);border-radius:6px;padding:12px 16px;">
        <p style="color:var(--cv-text-muted);font-weight:600;margin:0 0 6px;">Nothing was written — ${summary}</p>
        <ul style="font-size:0.82em;color:var(--cv-text-muted);margin:4px 0 0;padding-left:18px;">${staleList}</ul>
        <p style="font-size:0.82em;color:var(--cv-text-secondary);margin-top:8px;">${applicableChanges.length} item${applicableChanges.length === 1 ? '' : 's'} ${applicableChanges.length === 1 ? 'is' : 'are'} still valid — click "Confirm and Write" again to apply just those.</p>
      </div>`;
  }
}

// Note: no client-side "resume an in-progress proposal" affordance — the
// panel resets its state on every render (see _mduResetState, called from
// renderMasterDataAiUpdatePanel), and pending proposals live server-side
// keyed by proposal_id with their own TTL (see master_data_routes.py).
// Resuming would require a session-status-driven check for an existing
// pending proposal before the panel first renders; tracked as a known v1
// limitation, not silently absent.

export {
  renderMasterDataAiUpdatePanel,
  renderMasterDataAiUpdateDisabledNote,
  toggleMasterDataAiPanel,
  setMasterDataAiMode,
  handleMasterDataAiFileUpload,
  submitMasterDataAiPropose,
  discardMasterDataAiProposal,
  selectMasterDataAiNonFlagged,
  confirmMasterDataAiUpdate,
};
