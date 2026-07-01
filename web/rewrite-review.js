// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/rewrite-review.js
 * Rewrite review panel: fetch rewrites, render cards with word-diff,
 * accept/edit/reject decisions, submit.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   appendLoadingMessage, removeLoadingMessage, appendRetryMessage, appendMessage,
 *   setLoading, sendAction, switchTab, scheduleAtsRefresh,
 *   escapeHtml, parseRewritesResponse, PHASES
 */

import { stateManager } from './state-manager.js';

// Module-level state
let rewriteDecisions = {};
let _rewritePanelCache = null;
let persuasionWarningsAcknowledged = false;
let _warningsByRewriteId = {};  // Map from rewrite id → warning list (Path 1)

function syncRewriteGlobals() {
  if (typeof window === 'undefined') {
    return;
  }
  window.rewriteDecisions = rewriteDecisions;
  window._rewritePanelCache = _rewritePanelCache;
  window.acceptAllRewrites = acceptAllRewrites;
  window.rejectAllRewrites = rejectAllRewrites;
}

function _decisionsKey() {
  try {
    const sid = new URLSearchParams(window.location.search).get('session');
    return sid ? `rw_decisions_${sid}` : null;
  } catch (_) { return null; }
}

function _persistDecisions() {
  const key = _decisionsKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(rewriteDecisions)); } catch (_) {}
}

// Fallback audit from the last /api/rewrites response — used for cold-restore (GAP-186).
let _backendRewriteAudit = [];

function _restoreDecisions() {
  const key = _decisionsKey();
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      Object.assign(rewriteDecisions, saved);
      syncRewriteGlobals();
      return;
    }
  } catch (_) {}

  // Cold-restore fallback: seed decisions from backend rewrite_audit when
  // localStorage has nothing (different device, incognito, cleared storage).
  if (_backendRewriteAudit.length > 0) {
    for (const entry of _backendRewriteAudit) {
      const id = entry.id;
      if (!id || !entry.outcome) continue;
      rewriteDecisions[id] = {
        outcome: entry.outcome,
        final_text: entry.outcome === 'edit' ? (entry.final ?? null) : null,
      };
    }
    if (Object.keys(rewriteDecisions).length > 0) {
      syncRewriteGlobals();
      _persistDecisions();
    }
  }
}

function _clearPersistedDecisions() {
  const key = _decisionsKey();
  if (!key) return;
  try { localStorage.removeItem(key); } catch (_) {}
}

// ── Rewrite snapshot (changed-item highlighting) ────────────────────────────
function _snapshotKey() {
  try {
    const sid = new URLSearchParams(window.location.search).get('session');
    return sid ? `rw_snapshot_${sid}` : null;
  } catch (_) { return null; }
}

function _saveRewriteSnapshot(rewrites) {
  const key = _snapshotKey();
  if (!key) return;
  const map = {};
  for (const r of rewrites) {
    const cardId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    map[cardId] = r.proposed || '';
  }
  try { localStorage.setItem(key, JSON.stringify(map)); } catch (_) {}
}

function _getRewriteSnapshot() {
  const key = _snapshotKey();
  if (!key) return null;
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
}

function _clearRewriteSnapshot() {
  const key = _snapshotKey();
  if (!key) return;
  try { localStorage.removeItem(key); } catch (_) {}
}

async function fetchAndReviewRewrites() {
  const loadingMsg = appendLoadingMessage('Checking for text improvements...');
  setLoading(true, 'Reviewing rewrites…');
  try {
    const res = await fetch('/api/rewrites');
    const data = parseRewritesResponse(await res.json());
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    if (!res.ok) {
      appendRetryMessage('❌ Error checking rewrites: ' + (data.error || 'Unknown error'), fetchAndReviewRewrites);
      return;
    }
    const rewrites = data.rewrites || [];
    const warnings = data.persuasion_warnings || [];  // Phase 10
    _backendRewriteAudit = data.rewrite_audit || [];

    // Show persuasion warnings first (Phase 10)
    persuasionWarningsAcknowledged = warnings.length === 0;  // Mark acknowledged if no warnings
    if (warnings.length > 0) {
      const msg = `⚠️ **${warnings.length}** persuasion check${warnings.length > 1 ? 's' : ''} flagged. Review these before submitting.`;
      appendMessage('assistant', msg);
    }

    // Show rewrite review panel
    rewriteDecisions = {};
    syncRewriteGlobals();
    renderRewritePanel(rewrites, warnings);  // Pass warnings to panel
    switchTab('rewrite');
    const n = rewrites.length;
    if (n === 0) {
      appendMessage('assistant', '✏️ No rewrite suggestions were needed — your selected content already uses the job\'s terminology well. The **Rewrites** tab is still available so you can confirm and continue to **Spell Check** when ready.');
    } else {
      appendMessage('assistant', `✏️ You've confirmed your experience, skill, and achievement selections. Here are the AI's **${n}** text improvement suggestion${n > 1 ? 's' : ''} for the included bullets — each one introduces job-relevant keywords while preserving your facts. Review each suggestion in the **Rewrites** tab, then accept, edit, or reject before continuing to spell check.`);
    }
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('❌ Error: ' + err.message, fetchAndReviewRewrites);
  }
}

function _renderRewriteAuditLog() {
  if (!_backendRewriteAudit || _backendRewriteAudit.length === 0) return '';

  const OUTCOME_ICON = { accept: '✅', reject: '❌', edit: '✏️' };
  const OUTCOME_LABEL = { accept: 'Accepted', reject: 'Rejected', edit: 'Edited' };

  const rows = _backendRewriteAudit.map(entry => {
    const icon  = OUTCOME_ICON[entry.outcome] || '❓';
    const label = OUTCOME_LABEL[entry.outcome] || entry.outcome;
    const loc   = escapeHtml(entry.location || entry.field || '');
    const orig  = escapeHtml(entry.original || '');
    const prop  = escapeHtml(entry.proposed || '');
    const fin   = entry.outcome === 'edit' && entry.final
      ? `<div style="margin-top:4px;color:#1d4ed8;font-size:0.85em;">Final: ${escapeHtml(entry.final)}</div>`
      : '';
    return `
      <div style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:0.88em;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span title="${label}">${icon}</span>
          <strong style="color:#374151;">${label}</strong>
          ${loc ? `<span style="color:#9ca3af;font-size:0.85em;">— ${loc}</span>` : ''}
        </div>
        <div style="color:#6b7280;text-decoration:line-through;font-size:0.85em;">${orig}</div>
        <div style="color:#374151;font-size:0.85em;">${prop}</div>
        ${fin}
      </div>`;
  }).join('');

  return `
    <details style="margin-top:24px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
      <summary style="cursor:pointer;font-weight:600;color:#374151;list-style:none;display:flex;align-items:center;gap:8px;">
        <span>📋</span>
        <span>Rewrite Audit Log (${_backendRewriteAudit.length} decision${_backendRewriteAudit.length === 1 ? '' : 's'})</span>
        <span style="margin-left:auto;color:#9ca3af;font-size:0.85em;">▼ show</span>
      </summary>
      <div style="margin-top:12px;">${rows}</div>
    </details>`;
}

function renderRewritePanel(rewrites, warnings = []) {
  _rewritePanelCache = { rewrites, warnings };
  // Build per-card warning index for Path 1 badges
  _warningsByRewriteId = {};
  for (const w of warnings) {
    if (!_warningsByRewriteId[w.id]) _warningsByRewriteId[w.id] = [];
    _warningsByRewriteId[w.id].push(w);
  }
  syncRewriteGlobals();
  const content = document.getElementById('document-content');
  const hasRewrites = rewrites.length > 0;

  // Build persuasion warnings section (Phase 10)
  let warningsHtml = '';
  if (warnings.length > 0) {
    const warningsByType = {};
    warnings.forEach(w => {
      if (!warningsByType[w.flag_type]) warningsByType[w.flag_type] = 0;
      warningsByType[w.flag_type]++;
    });
    const warningCounts = Object.entries(warningsByType)
      .map(([type, count]) => `${count} ${type.replace(/_/g, ' ')}`)
      .join(', ');

    warningsHtml = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer;" onclick="this.parentElement.querySelector('#warnings-detail').style.display = this.parentElement.querySelector('#warnings-detail').style.display === 'none' ? 'block' : 'none';">
          <span style="font-size:20px;">⚠️</span>
          <strong style="color:#991b1b;">Persuasion checks: ${warningCounts}</strong>
          <span style="margin-left:auto;color:#7f1d1d;">▼</span>
        </div>
        <div id="warnings-detail" style="display:block;margin-top:10px;padding-top:10px;border-top:1px solid #fecaca;">
          ${warnings.map(w => `
            <div style="padding:8px;margin-bottom:8px;background:#fff7ed;border-left:3px solid #f97316;border-radius:4px;font-size:0.9em;">
              <strong>${w.flag_type.replace(/_/g, ' ')}</strong> at ${w.location}<br>
              <span style="color:#7c2d12;">${w.details}</span>
            </div>
          `).join('')}
          <button style="margin-top:10px;padding:8px 12px;background:#991b1b;color:white;border:none;border-radius:4px;cursor:pointer;" onclick="setPersuasionWarningsAcknowledged(true); this.parentElement.parentElement.style.opacity = '0.6'; updateRewriteTally();">
            ✓ Acknowledged
          </button>
        </div>
      </div>
    `;
  }

  // Compute per-card change status relative to previous render's snapshot.
  const prevSnapshot = _getRewriteSnapshot();
  const changeStatusMap = {};
  if (prevSnapshot) {
    for (const r of rewrites) {
      const cardId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      if (!(cardId in prevSnapshot)) {
        changeStatusMap[cardId] = 'new';
      } else if (prevSnapshot[cardId] !== (r.proposed || '')) {
        changeStatusMap[cardId] = 'updated';
      }
    }
  }
  // Save current rewrites as snapshot for next render comparison.
  _saveRewriteSnapshot(rewrites);

  content.innerHTML = warningsHtml + `
    <div id="rewrite-panel">
      <h1>✏️ Review Text Improvements</h1>
      <p style="color:#6b7280;margin-bottom:20px;">
        ${hasRewrites
    ? 'Review each suggested text improvement. Accept, edit, or reject all suggestions before proceeding to spell check.'
    : 'No text improvements were suggested for this CV. Continue when you are ready to move to spell check.'}
      </p>
      <div class="rewrite-tally-bar" id="rewrite-tally" ${hasRewrites ? '' : 'style="display:none"'}>
        <span class="tally-accepted">✓ Accepted: <strong id="tally-accepted">0</strong></span>
        <span class="tally-rejected">✗ Rejected: <strong id="tally-rejected">0</strong></span>
        <span class="tally-pending">⏳ Pending: <strong id="tally-pending">${rewrites.length}</strong></span>
        <button class="rw-bulk-btn" onclick="acceptAllRewrites()" title="Accept all pending suggestions">✓ Accept All</button>
        <button class="rw-bulk-btn rw-bulk-reject" onclick="rejectAllRewrites()" title="Reject all pending suggestions">✗ Reject All</button>
        <button class="submit-rewrites-btn" id="submit-rewrites-btn" disabled
                onclick="submitRewriteDecisions()">Submit All Decisions</button>
      </div>
      <div id="rewrite-cards">
        ${hasRewrites
    ? rewrites.map(r => {
        const cardId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        return renderRewriteCard(r, _warningsByRewriteId[r.id] || [], changeStatusMap[cardId] || null);
      }).join('')
    : `
          <div class="empty-state" style="margin-top:24px;">
            <div class="icon">✏️</div>
            <h3>No Rewrite Suggestions</h3>
            <p>This draft already passes the rewrite stage without suggested wording changes.</p>
            <button class="submit-btn" id="submit-rewrites-btn" onclick="submitRewriteDecisions()">Continue to Spell Check</button>
          </div>
        `}
      </div>
    </div>
    ${_renderRewriteAuditLog()}
  `;

  // Restore decisions persisted from a previous page load (GAP-166).
  _restoreDecisions();
  // Re-apply any decisions made before the last tab navigation.
  if (Object.keys(rewriteDecisions).length > 0) {
    for (const [id, dec] of Object.entries(rewriteDecisions)) {
      if (!dec || !dec.outcome) continue;
      if (dec.outcome === 'edit' && dec.final_text != null) {
        // Enter edit mode, inject the saved text, then save so the card
        // shows as accepted with the correct diff rendered.
        applyRewriteAction(id, 'edit');
        const ta = document.getElementById(`rw-textarea-${id}`);
        if (ta) {
          ta.value = dec.final_text;
          saveRewriteEdit(id);
        }
      } else {
        applyRewriteAction(id, dec.outcome);
      }
    }
    updateRewriteTally();
  }
}

/**
 * computeWordDiff(original, proposed) — LCS word-level diff.
 *
 * Tokenises both strings by splitting on whitespace boundaries while
 * preserving the whitespace tokens so the rendered diff has the same
 * spacing as the source text.  Returns an array of
 * {token: string, type: 'unchanged'|'removed'|'added'}.
 */
function computeWordDiff(original, proposed) {
  // Split on whitespace but keep the separators as tokens.
  function tokenize(str) { return (str || '').split(/(\s+)/); }

  const a = tokenize(original);
  const b = tokenize(proposed);
  const m = a.length;
  const n = b.length;

  // Build LCS DP table (O(m*n) — acceptable for CV bullet lengths).
  const dp = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce the diff sequence.
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({token: a[i - 1], type: 'unchanged'});
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({token: b[j - 1], type: 'added'});
      j--;
    } else {
      result.unshift({token: a[i - 1], type: 'removed'});
      i--;
    }
  }
  return result;
}

/** Render a {token, type} diff array into an HTML string. */
function renderDiffHtml(tokens) {
  return tokens.map(t => {
    if (t.type === 'removed') return `<del class="diff-removed">${escapeHtml(t.token)}</del>`;
    if (t.type === 'added')   return `<ins class="diff-added">${escapeHtml(t.token)}</ins>`;
    return escapeHtml(t.token);
  }).join('');
}

function renderRewriteCard(r, cardWarnings = [], changeStatus = null) {
  const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
  const weakBadge     = isWeakSkillAdd
    ? `<span class="weak-badge">⚠ Candidate to confirm</span>`
    : '';
  const changeBadge   = changeStatus === 'new'
    ? `<span class="rw-change-badge rw-change-new" aria-label="New suggestion not in previous run">🆕 New</span>`
    : changeStatus === 'updated'
      ? `<span class="rw-change-badge rw-change-updated" aria-label="Suggestion changed since previous run">↻ Updated</span>`
      : '';
  // Keyword pills with position-based rank badge (#1, #2, …)
  const keywordPills  = (r.keywords_introduced || [])
    .map((k, idx) => `<span class="rewrite-keyword"><span class="kw-rank">#${idx + 1}</span>${escapeHtml(k)}</span>`)
    .join('');
  const typeLabel = (r.type || 'rewrite').replace(/_/g, ' ');
  // Sanitize ID: keep only alphanumeric, underscore, and hyphen so it is
  // safe as both an HTML attribute value and a JS string literal in onclick.
  const cardId    = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Compute word-level diff for the inline display.
  const diffTokens = computeWordDiff(r.original || '', r.proposed || '');
  const diffHtml   = renderDiffHtml(diffTokens);

  return `
    <div class="rewrite-card" id="rw-card-${cardId}">
      <div class="rewrite-card-header">
        <span class="rewrite-card-type">${escapeHtml(typeLabel)}</span>
        <span class="rewrite-card-title">${escapeHtml(r.location || r.id)}</span>
        ${weakBadge}${changeBadge}
        <span id="rw-decision-badge-${cardId}" aria-live="polite" style="display:none;font-size:0.78em;font-weight:600;padding:1px 7px;border-radius:9px;margin-left:auto;"></span>
      </div>
      <div class="rewrite-card-body">
        <div class="rewrite-inline-diff" id="rw-diff-${cardId}"
             data-original="${escapeHtml(r.original || '')}">${diffHtml}</div>
        <div class="rewrite-after" id="rw-after-${cardId}" style="display:none">
          <span id="rw-after-text-${cardId}">${escapeHtml(r.proposed || '')}</span>
        </div>
        ${keywordPills ? `<div class="rewrite-keywords">${keywordPills}</div>` : ''}
        ${r.rationale ? `
        <details class="rewrite-rationale">
          <summary>Rationale &amp; Evidence</summary>
          <p style="margin:6px 0 0;">${escapeHtml(r.rationale)}</p>
          ${r.evidence ? `<p style="color:#9ca3af;font-size:0.85em;margin:4px 0 0;">${escapeHtml(r.evidence)}</p>` : ''}
        </details>` : ''}
        ${cardWarnings.length > 0 ? `
        <div class="rewrite-persuasion-badges">
          ${cardWarnings.map(w => `<span class="persuasion-badge persuasion-badge--${w.severity}" title="${escapeHtml(w.details)}">⚠ ${escapeHtml(w.flag_type.replace(/_/g, ' '))}</span>`).join('')}
        </div>` : ''}
        <div class="rewrite-actions">
          <a class="rw-back-link" href="#" onclick="event.preventDefault(); switchTab('customizations')" title="Go back to Customise to reconsider whether to include this content">↩ Reconsider inclusion</a>
          <button class="rw-btn accept" id="rw-accept-${cardId}" aria-pressed="false" onclick="applyRewriteAction('${cardId}', 'accept')">✓ Accept</button>
          <button class="rw-btn edit"   id="rw-edit-${cardId}"   aria-pressed="false" onclick="applyRewriteAction('${cardId}', 'edit')">✎ Edit</button>
          <button class="rw-btn reject" id="rw-reject-${cardId}" aria-pressed="false" onclick="applyRewriteAction('${cardId}', 'reject')">✗ Reject</button>
        </div>
      </div>
    </div>`;
}

function applyRewriteAction(id, outcome) {
  const card    = document.getElementById(`rw-card-${id}`);
  const afterEl = document.getElementById(`rw-after-${id}`);
  const diffEl  = document.getElementById(`rw-diff-${id}`);
  if (!card || !afterEl) return;

  // Clear any previous outcome styling
  card.classList.remove('accepted', 'rejected');
  ['accept', 'edit', 'reject'].forEach(a => {
    const btn = document.getElementById(`rw-${a}-${id}`);
    btn?.classList.remove('active');
    if (btn) btn.setAttribute('aria-pressed', 'false');
  });
  const _decisionBadge = document.getElementById(`rw-decision-badge-${id}`);
  if (_decisionBadge) _decisionBadge.style.display = 'none';

  if (outcome === 'edit') {
    // Keep the inline diff visible as a reference; show the editable textarea below it.
    const currentText = afterEl.querySelector(`#rw-after-text-${id}`)?.textContent
                     ?? rewriteDecisions[id]?.final_text
                     ?? '';
    if (diffEl) {
      diffEl.style.display = '';
      diffEl.style.opacity = '0.55';
      diffEl.style.borderLeft = '3px solid #93c5fd';
    }
    afterEl.style.display = 'block';
    afterEl.innerHTML = `
      <div style="font-size:0.78em;color:#6b7280;margin-bottom:4px;">✎ Your edit (AI suggestion shown above for reference):</div>
      <textarea id="rw-textarea-${id}">${escapeHtml(currentText)}</textarea>
      <button class="rw-save-edit-btn" style="margin-top:6px"
              onclick="saveRewriteEdit('${id}')">Save</button>
    `;
    const editBtn = document.getElementById(`rw-edit-${id}`);
    editBtn?.classList.add('active');
    if (editBtn) editBtn.setAttribute('aria-pressed', 'true');
    // Decision is recorded only when the user clicks Save
  } else {
    // Restore the after-text span if we previously entered edit mode
    const textarea = afterEl.querySelector('textarea');
    if (textarea) {
      const txt = textarea.value;
      afterEl.innerHTML = `<span id="rw-after-text-${id}">${escapeHtml(txt)}</span>`;
    }
    // Re-show the inline diff panel at full opacity; hide the edit area.
    if (diffEl) { diffEl.style.display = ''; diffEl.style.opacity = ''; diffEl.style.borderLeft = ''; }
    afterEl.style.display = 'none';

    rewriteDecisions[id] = { outcome, final_text: null };
    _persistDecisions();
    card.classList.add(outcome === 'accept' ? 'accepted' : 'rejected');
    const activeBtn = document.getElementById(`rw-${outcome}-${id}`);
    activeBtn?.classList.add('active');
    if (activeBtn) activeBtn.setAttribute('aria-pressed', 'true');
    const decBadge = document.getElementById(`rw-decision-badge-${id}`);
    if (decBadge) {
      decBadge.textContent = outcome === 'accept' ? '✓ Accepted' : '✗ Rejected';
      decBadge.style.display = '';
      decBadge.style.background = outcome === 'accept' ? '#bbf7d0' : '#fecaca';
      decBadge.style.color      = outcome === 'accept' ? '#065f46' : '#991b1b';
    }
    syncRewriteGlobals();
    updateRewriteTally();
    _scrollToNextPendingRewrite(id);
  }
}

function _scrollToNextPendingRewrite(afterId) {
  const allCards = document.querySelectorAll('[id^="rw-card-"]');
  let found = false;
  for (const card of allCards) {
    const id = card.id.replace('rw-card-', '');
    if (id === afterId) { found = true; continue; }
    if (!found) continue;
    if (!rewriteDecisions[id]) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }
}

function saveRewriteEdit(id) {
  const textarea   = document.getElementById(`rw-textarea-${id}`);
  const editedText = textarea ? textarea.value : '';
  const afterEl    = document.getElementById(`rw-after-${id}`);
  const diffEl     = document.getElementById(`rw-diff-${id}`);
  const card       = document.getElementById(`rw-card-${id}`);
  if (!afterEl || !card) return;

  // Replace textarea with final span (hidden — preserves text for future edits).
  afterEl.innerHTML = `<span id="rw-after-text-${id}">${escapeHtml(editedText)}</span>`;
  afterEl.style.display = 'none';

  // Regenerate the inline diff against the original text and re-show it (full opacity).
  if (diffEl) {
    const original = diffEl.dataset.original || '';
    diffEl.innerHTML = renderDiffHtml(computeWordDiff(original, editedText));
    diffEl.style.display = '';
    diffEl.style.opacity = '';
    diffEl.style.borderLeft = '';
  }

  rewriteDecisions[id] = { outcome: 'edit', final_text: editedText };
  _persistDecisions();
  card.classList.remove('rejected');
  card.classList.add('accepted');
  ['accept', 'reject'].forEach(a => {
    const btn = document.getElementById(`rw-${a}-${id}`);
    btn?.classList.remove('active');
    if (btn) btn.setAttribute('aria-pressed', 'false');
  });
  const saveEditBtn = document.getElementById(`rw-edit-${id}`);
  saveEditBtn?.classList.add('active');
  if (saveEditBtn) saveEditBtn.setAttribute('aria-pressed', 'true');
  const editDecBadge = document.getElementById(`rw-decision-badge-${id}`);
  if (editDecBadge) {
    editDecBadge.textContent = '✓ Accepted (edited)';
    editDecBadge.style.display = '';
    editDecBadge.style.background = '#bbf7d0';
    editDecBadge.style.color      = '#065f46';
  }
  syncRewriteGlobals();
  updateRewriteTally();
}

function updateRewriteTally() {
  const cards = document.querySelectorAll('.rewrite-card');
  let accepted = 0, rejected = 0, pending = 0;
  cards.forEach(card => {
    const id  = card.id.replace('rw-card-', '');
    const dec = rewriteDecisions[id];
    if      (!dec)                                           pending++;
    else if (dec.outcome === 'accept' || dec.outcome === 'edit') accepted++;
    else                                                     rejected++;
  });

  const acceptedEl = document.getElementById('tally-accepted');
  const rejectedEl = document.getElementById('tally-rejected');
  const pendingEl = document.getElementById('tally-pending');

  if (acceptedEl) acceptedEl.textContent = accepted;
  if (rejectedEl) rejectedEl.textContent = rejected;
  if (pendingEl) pendingEl.textContent  = pending;

  const submitBtn = document.getElementById('submit-rewrites-btn');
  if (submitBtn) {
    const needsAck = !persuasionWarningsAcknowledged;
    submitBtn.disabled = (pending > 0) || needsAck;
    submitBtn.title = needsAck
      ? 'Acknowledge the persuasion warnings above before submitting'
      : '';
  }
}

async function submitRewriteDecisions() {
  if (!persuasionWarningsAcknowledged) {
    const proceed = await showConfirmModal(
      '⚠️ Persuasion Checks',
      'There are unacknowledged persuasion warnings. It is recommended you review and acknowledge them first.\n\nProceed anyway?',
      'Submit Anyway'
    );
    if (!proceed) return;
  }
  /* duckflow:
   *   id: rewrite_ui_submit_live
   *   kind: ui
   *   timestamp: '2026-03-25T21:39:48Z'
   *   status: live
   *   handles:
   *   - ui:rewrite-review.submit
   *   calls:
   *   - POST /api/rewrites/approve
   *   - POST /api/cv/layout-estimate
   *   reads:
   *   - window:rewriteDecisions
   *   writes:
   *   - request:POST /api/rewrites/approve.decisions
   *   notes: Submits the final per-rewrite outcomes and edited text so backend state can persist approved rewrites and the full rewrite audit before spell-check.
   */
  const decisions = Object.entries(rewriteDecisions).map(([id, dec]) => ({
    id,
    outcome:    dec.outcome,
    final_text: dec.final_text ?? null
  }));

  const loadingMsg = appendLoadingMessage('Submitting rewrite decisions...');
  setLoading(true, 'Submitting rewrite decisions…');
  try {
    const res = await fetch('/api/rewrites/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions })
    });
    const data = await res.json();
    removeLoadingMessage(loadingMsg);
    setLoading(false);

    if (!res.ok) {
      appendRetryMessage('❌ Error: ' + (data.error || 'Failed to submit rewrite decisions'), submitRewriteDecisions);
      return;
    }

    const accepted = data.approved_count || 0;
    const rejected = data.rejected_count || 0;
    stateManager.markContentChanged();
    _clearPersistedDecisions();
    _clearRewriteSnapshot();
    appendMessage('assistant', `✅ Rewrite decisions recorded: ${accepted} accepted, ${rejected} rejected. Starting spell check…`);
    scheduleAtsRefresh('review_checkpoint');
    switchTab('spell');
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('❌ Error: ' + err.message, submitRewriteDecisions);
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────
function setPersuasionWarningsAcknowledged(value) {
  persuasionWarningsAcknowledged = value;
}

/** Bulk-accept all pending rewrite cards. */
function acceptAllRewrites() {
  document.querySelectorAll('.rewrite-card').forEach(card => {
    const id = card.id.replace('rw-card-', '');
    if (!rewriteDecisions[id]) applyRewriteAction(id, 'accept');
  });
  updateRewriteTally();
}

/** Bulk-reject all pending rewrite cards. */
function rejectAllRewrites() {
  document.querySelectorAll('.rewrite-card').forEach(card => {
    const id = card.id.replace('rw-card-', '');
    if (!rewriteDecisions[id]) applyRewriteAction(id, 'reject');
  });
  updateRewriteTally();
}

export {
  rewriteDecisions,
  _rewritePanelCache,
  persuasionWarningsAcknowledged,
  setPersuasionWarningsAcknowledged,
  fetchAndReviewRewrites,
  renderRewritePanel,
  computeWordDiff,
  renderDiffHtml,
  renderRewriteCard,
  applyRewriteAction,
  saveRewriteEdit,
  updateRewriteTally,
  submitRewriteDecisions,
  acceptAllRewrites,
  rejectAllRewrites,
};

syncRewriteGlobals();
