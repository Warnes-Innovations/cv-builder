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

// Module-level state
let rewriteDecisions = {};
let _rewritePanelCache = null;
let persuasionWarningsAcknowledged = false;

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

    if (rewrites.length === 0 || data.phase === PHASES.GENERATION) {
      // No rewrites — go straight to generation
      await sendAction('generate_cv');
      return;
    }

    // Show persuasion warnings first (Phase 10)
    persuasionWarningsAcknowledged = warnings.length === 0;  // Mark acknowledged if no warnings
    if (warnings.length > 0) {
      const msg = `⚠️ **${warnings.length}** persuasion check${warnings.length > 1 ? 's' : ''} flagged. Review these before submitting.`;
      appendMessage('assistant', msg);
    }

    // Show rewrite review panel
    rewriteDecisions = {};
    renderRewritePanel(rewrites, warnings);  // Pass warnings to panel
    switchTab('rewrite');
    const n = rewrites.length;
    appendMessage('assistant', `✏️ I found **${n}** text improvement${n > 1 ? 's' : ''} to review. Look over each suggestion in the **Rewrites** tab, then accept, edit, or reject each one before generating your CV.`);
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('❌ Error: ' + err.message, fetchAndReviewRewrites);
  }
}

function renderRewritePanel(rewrites, warnings = []) {
  _rewritePanelCache = { rewrites, warnings };
  const content = document.getElementById('document-content');

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
        <div id="warnings-detail" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #fecaca;">
          ${warnings.map(w => `
            <div style="padding:8px;margin-bottom:8px;background:#fff7ed;border-left:3px solid #f97316;border-radius:4px;font-size:0.9em;">
              <strong>${w.flag_type.replace(/_/g, ' ')}</strong> at ${w.location}<br>
              <span style="color:#7c2d12;">${w.details}</span>
            </div>
          `).join('')}
          <button style="margin-top:10px;padding:8px 12px;background:#991b1b;color:white;border:none;border-radius:4px;cursor:pointer;" onclick="persuasionWarningsAcknowledged = true; this.parentElement.parentElement.style.opacity = '0.6';">
            ✓ Acknowledged
          </button>
        </div>
      </div>
    `;
  }

  content.innerHTML = warningsHtml + `
    <div id="rewrite-panel">
      <h1>✏️ Review Text Improvements</h1>
      <p style="color:#6b7280;margin-bottom:20px;">
        Review each suggested text improvement. Accept, edit, or reject all suggestions before proceeding to CV generation.
      </p>
      <div class="rewrite-tally-bar" id="rewrite-tally">
        <span class="tally-accepted">✓ Accepted: <strong id="tally-accepted">0</strong></span>
        <span class="tally-rejected">✗ Rejected: <strong id="tally-rejected">0</strong></span>
        <span class="tally-pending">⏳ Pending: <strong id="tally-pending">${rewrites.length}</strong></span>
        <button class="submit-rewrites-btn" id="submit-rewrites-btn" disabled
                onclick="submitRewriteDecisions()">Submit All Decisions</button>
      </div>
      <div id="rewrite-cards">
        ${rewrites.map(r => renderRewriteCard(r)).join('')}
      </div>
    </div>
  `;
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

function renderRewriteCard(r) {
  const isWeakSkillAdd = r.type === 'skill_add' && r.evidence_strength === 'weak';
  const weakBadge     = isWeakSkillAdd
    ? `<span class="weak-badge">⚠ Candidate to confirm</span>`
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
        ${weakBadge}
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
        <div class="rewrite-actions">
          <button class="rw-btn accept" id="rw-accept-${cardId}" onclick="applyRewriteAction('${cardId}', 'accept')">✓ Accept</button>
          <button class="rw-btn edit"   id="rw-edit-${cardId}"   onclick="applyRewriteAction('${cardId}', 'edit')">✎ Edit</button>
          <button class="rw-btn reject" id="rw-reject-${cardId}" onclick="applyRewriteAction('${cardId}', 'reject')">✗ Reject</button>
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
    document.getElementById(`rw-${a}-${id}`)?.classList.remove('active');
  });

  if (outcome === 'edit') {
    // Hide the inline diff; show the editable textarea in its place.
    const currentText = afterEl.querySelector(`#rw-after-text-${id}`)?.textContent
                     ?? rewriteDecisions[id]?.final_text
                     ?? '';
    if (diffEl) diffEl.style.display = 'none';
    afterEl.style.display = 'block';
    afterEl.innerHTML = `
      <textarea id="rw-textarea-${id}">${escapeHtml(currentText)}</textarea>
      <button class="rw-save-edit-btn" style="margin-top:6px"
              onclick="saveRewriteEdit('${id}')">Save</button>
    `;
    document.getElementById(`rw-edit-${id}`)?.classList.add('active');
    // Decision is recorded only when the user clicks Save
  } else {
    // Restore the after-text span if we previously entered edit mode
    const textarea = afterEl.querySelector('textarea');
    if (textarea) {
      const txt = textarea.value;
      afterEl.innerHTML = `<span id="rw-after-text-${id}">${escapeHtml(txt)}</span>`;
    }
    // Re-show the inline diff panel; hide the edit area.
    if (diffEl) diffEl.style.display = '';
    afterEl.style.display = 'none';

    rewriteDecisions[id] = { outcome, final_text: null };
    card.classList.add(outcome === 'accept' ? 'accepted' : 'rejected');
    document.getElementById(`rw-${outcome}-${id}`)?.classList.add('active');
    updateRewriteTally();
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

  // Regenerate the inline diff against the original text and re-show it.
  if (diffEl) {
    const original = diffEl.dataset.original || '';
    diffEl.innerHTML = renderDiffHtml(computeWordDiff(original, editedText));
    diffEl.style.display = '';
  }

  rewriteDecisions[id] = { outcome: 'edit', final_text: editedText };
  card.classList.remove('rejected');
  card.classList.add('accepted');
  ['accept', 'reject'].forEach(a => document.getElementById(`rw-${a}-${id}`)?.classList.remove('active'));
  document.getElementById(`rw-edit-${id}`)?.classList.add('active');
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

  document.getElementById('tally-accepted').textContent = accepted;
  document.getElementById('tally-rejected').textContent = rejected;
  document.getElementById('tally-pending').textContent  = pending;

  const submitBtn = document.getElementById('submit-rewrites-btn');
  if (submitBtn) submitBtn.disabled = (pending > 0);
}

async function submitRewriteDecisions() {
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
export {
  rewriteDecisions,
  _rewritePanelCache,
  persuasionWarningsAcknowledged,
  fetchAndReviewRewrites,
  renderRewritePanel,
  computeWordDiff,
  renderDiffHtml,
  renderRewriteCard,
  applyRewriteAction,
  saveRewriteEdit,
  updateRewriteTally,
  submitRewriteDecisions,
};
