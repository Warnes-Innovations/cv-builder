// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/publications-review.js
 * Publications review table: fetch, render, toggle accept/reject, submit decisions.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   publicationDecisions, _savedDecisions,
 *   escapeHtml, showToast, fetchAndReviewRewrites, CSS
 */

import { getLogger } from './logger.js';
const log = getLogger('publications-review');

import { stateManager } from './state-manager.js';
import { eyeSlashIcon } from './review-icons.js';

// Track publication accept/reject decisions: cite_key → true (accept) | false (reject)
window.publicationDecisions = {};
// Ordered list of publication objects; mutated by movePubRow()
window._publicationsOrdered = [];

// ── Build publications review table ─────────────────────────────────────────

async function buildPublicationsReviewTable() {
  const container = document.getElementById('publications-table-container');
  // In the new sub-tab layout, we use the pane wrapper instead of the old section
  const section   = document.getElementById('publications-review-section') ||
                    document.getElementById('review-pane-publications');
  const pubTabBtn = document.querySelector('.review-subtab[data-pane="publications"]');
  if (!container) return;

  container.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:20px;color:#6b7280;"><div class="loading-spinner" style="width:20px;height:20px;border-width:2px;flex-shrink:0;"></div><span>Loading publication recommendations\u2026</span></div>';

  let recommendations = [];
  let totalCount = 0;
  try {
    const res  = await fetch('/api/publication-recommendations');
    const data = await res.json();
    if (!data.ok) { container.innerHTML = `<p class="error-message">${escapeHtml(data.error || 'Failed to load publications.')}</p>`; return; }
    recommendations = data.recommendations || [];
    totalCount = data.total_count || recommendations.length;
  } catch (err) {
    log.error('Error fetching publication recommendations:', err);
    container.innerHTML = '<p style="color: #ef4444; padding: 20px;">Failed to load publication recommendations.</p>';
    return;
  }

  if (recommendations.length === 0) {
    // No publications — hide the pane and disable the tab button
    if (section) section.style.display = 'none';
    if (pubTabBtn) pubTabBtn.style.display = 'none';
    container.innerHTML = '<p style="padding:20px;color:#6b7280;">No publications found.</p>';
    return;
  }

  // Show section and tab button
  if (pubTabBtn) pubTabBtn.style.display = '';

  // Update heading count (handle both pane approach and legacy section approach)
  const heading = section ? section.querySelector('h2') : null;
  if (heading) {
    heading.textContent = `📄 Selected Publications`;
  }

  // Count recommended vs total
  const recommendedCount = recommendations.filter(p => p.is_recommended !== false).length;
  const contextNote = `<strong>${recommendedCount}</strong> of <strong>${totalCount}</strong> publications recommended for this role. ` +
    `Recommended publications (top) are pre-selected for inclusion; others (below the divider) are pre-excluded. Adjust using the toggles.`;

  // Initialise decisions — recommended=accept, not-recommended=reject by default
  window.publicationDecisions = {};
  recommendations.forEach(pub => {
    window.publicationDecisions[pub.cite_key] = pub.is_recommended !== false;
  });
  // Apply any previously saved user decisions over the API defaults
  const savedPubDecs = window._savedDecisions?.publication_decisions || {};
  if (Object.keys(savedPubDecs).length > 0) Object.assign(window.publicationDecisions, savedPubDecs);

  // Seed the ordered list for reorder controls
  window._publicationsOrdered = [...recommendations];

  let tableHTML = `
    <p style="color:#6b7280;font-size:0.9em;margin-bottom:12px;">${contextNote}</p>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
      <label style="font-size:0.9em;color:#374151;">Filter publications:
        <input type="search" id="pub-filter-input" placeholder="Type to filter…"
          style="margin-left:8px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:0.9em;"
          oninput="filterPublicationsTable(this.value)">
      </label>
      <span style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <span style="font-size:0.82em;color:#6b7280;">Bulk:</span>
        <button class="action-btn secondary" style="font-size:0.8em;padding:4px 10px;"
          onclick="bulkPubAction('recommended')" title="Accept all recommended and reject the rest">Accept Recommended</button>
        <button class="action-btn secondary" style="font-size:0.8em;padding:4px 10px;"
          onclick="bulkPubAction('accept-all')" title="Accept all publications">Accept All</button>
        <button class="action-btn secondary" style="font-size:0.8em;padding:4px 10px;"
          onclick="bulkPubAction('reject-all')" title="Reject all publications">Reject All</button>
      </span>
    </div>
    <table id="publications-review-table" class="review-table">
      <thead>
        <tr>
          <th style="width:40px;">Rank</th>
          <th>Citation</th>
          <th>Year</th>
          <th style="width:36px;text-align:center;" title="First author">1st★</th>
          <th style="width:50px;">Score</th>
          <th style="width:80px;">Confidence</th>
          <th>Reasoning</th>
          <th style="width:80px;">Include?</th>
          <th style="width:56px;text-align:center;">Order</th>
        </tr>
      </thead>
      <tbody>
  `;

  let dividerInserted = false;
  recommendations.forEach((pub, idx) => {
    // Insert a section divider before the first non-recommended publication
    if (!dividerInserted && pub.is_recommended === false) {
      dividerInserted = true;
      const dividerStyle = 'background:#f3f4f6;border-top:2px solid #d1d5db;padding:0;';
      tableHTML += `
        <tr class="pub-divider-row">
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}color:#6b7280;font-size:0.82em;font-style:italic;padding:6px 12px;text-align:center;">
            — Publications below were not recommended for this role (pre-excluded) —
          </td>
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}"></td>
          <td style="${dividerStyle}"></td>
        </tr>
      `;
    }

    const rank       = idx + 1;
    const citation   = pub.formatted_citation || [pub.title, pub.venue, pub.year].filter(Boolean).join('. ');
    const year       = pub.year || '—';
    const firstAuth  = pub.is_first_author ? '<span style="color:#10b981;font-weight:700;" title="First author">★</span>' : '<span style="color:#d1d5db;">☆</span>';
    const score      = pub.relevance_score ? pub.relevance_score : '—';
    const confidence = pub.confidence || '';
    const confColor  = confidence === 'High' ? '#10b981' : confidence === 'Low' ? '#ef4444' : '#f59e0b';
    const confBadge  = confidence ? `<span style="font-size:11px;color:${confColor};font-weight:600;">${escapeHtml(confidence)}</span>` : '';
    const reasoning  = pub.rationale ? `<small>${escapeHtml(pub.rationale)}</small>` : '';
    const venueWarn  = pub.venue_warning ? ` <span title="${escapeHtml(pub.venue_warning)}" style="color:#dc7900;cursor:help;">⚠</span>` : '';
    const citeKey    = pub.cite_key || '';
    const isAccepted = window.publicationDecisions[citeKey] !== false;
    const rowStyle   = pub.is_recommended === false ? 'opacity:0.7;' : '';

    const isFirst = idx === 0;
    const isLast  = idx === recommendations.length - 1;
    tableHTML += `
      <tr data-cite-key="${escapeHtml(citeKey)}" style="${rowStyle}">
        <td style="text-align:center;font-weight:700;">${rank}</td>
        <td style="font-size:0.87em;">${escapeHtml(citation)}${venueWarn}</td>
        <td style="text-align:center;">${year}</td>
        <td style="text-align:center;">${firstAuth}</td>
        <td style="text-align:center;">${score !== '—' ? `<strong>${score}</strong>/10` : '—'}</td>
        <td style="text-align:center;">${confBadge}</td>
        <td>${reasoning}</td>
        <td class="action-btns">
            <button class="icon-btn${isAccepted ? ' active' : ''}" data-action="accept" aria-label="Include publication ${escapeHtml(citeKey)}" title="Include in CV"
              style="color:#10b981;" id="pub-accept-${rank}">✓</button>
            <button class="icon-btn${!isAccepted ? ' active' : ''}" data-action="reject" aria-label="Exclude publication ${escapeHtml(citeKey)}" title="Exclude from CV"
              style="color:#ef4444;" id="pub-reject-${rank}">${eyeSlashIcon()}</button>
        </td>
        <td style="text-align:center;white-space:nowrap;">
          <button class="icon-btn" data-action="pub-up" data-cite-key="${escapeHtml(citeKey)}"
            aria-label="Move publication up" title="Move up" ${isFirst ? 'disabled style="opacity:0.3;"' : ''}>↑</button>
          <button class="icon-btn" data-action="pub-down" data-cite-key="${escapeHtml(citeKey)}"
            aria-label="Move publication down" title="Move down" ${isLast ? 'disabled style="opacity:0.3;"' : ''}>↓</button>
        </td>
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  container.innerHTML = tableHTML;
  // Delegated click handler for publication action buttons (data-cite-key on <tr> avoids onclick injection)
  container.querySelector('#publications-review-table tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn || btn.disabled) return;
    const tr = btn.closest('tr[data-cite-key]');
    if (!tr) return;
    const action = btn.dataset.action;
    if      (action === 'accept')   handlePubAction(tr.dataset.citeKey, true);
    else if (action === 'reject')   handlePubAction(tr.dataset.citeKey, false);
    else if (action === 'pub-up')   movePubRow(btn.dataset.citeKey, -1);
    else if (action === 'pub-down') movePubRow(btn.dataset.citeKey, +1);
  });
}

// ── Filter table ─────────────────────────────────────────────────────────────

function filterPublicationsTable(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#publications-review-table tbody tr:not(.pub-divider-row)').forEach(row => {
    row.style.display = q === '' || row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── Reorder rows ────────────────────────────────────────────────────────────

function movePubRow(citeKey, direction) {
  const arr = window._publicationsOrdered;
  if (!arr || !arr.length) return;
  const idx = arr.findIndex(p => p.cite_key === citeKey);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  _rebuildPubTableBody(arr);
  // Persist order to backend (fire-and-forget)
  fetch('/api/reorder-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'publication', ordered_ids: arr.map(p => p.cite_key) }),
  }).catch(() => {});
}

function _rebuildPubTableBody(recommendations) {
  const tbody = document.querySelector('#publications-review-table tbody');
  if (!tbody) return;
  let html = '';
  let dividerInserted = false;
  recommendations.forEach((pub, idx) => {
    if (!dividerInserted && pub.is_recommended === false) {
      dividerInserted = true;
      const ds = 'background:#f3f4f6;border-top:2px solid #d1d5db;padding:0;';
      html += `<tr class="pub-divider-row"><td style="${ds}"></td><td style="${ds}color:#6b7280;font-size:0.82em;font-style:italic;padding:6px 12px;text-align:center;">— Publications below were not recommended for this role (pre-excluded) —</td><td style="${ds}"></td><td style="${ds}"></td><td style="${ds}"></td><td style="${ds}"></td><td style="${ds}"></td><td style="${ds}"></td><td style="${ds}"></td></tr>`;
    }
    const rank       = idx + 1;
    const citeKey    = pub.cite_key || '';
    const citation   = pub.formatted_citation || [pub.title, pub.venue, pub.year].filter(Boolean).join('. ');
    const year       = pub.year || '—';
    const firstAuth  = pub.is_first_author ? '<span style="color:#10b981;font-weight:700;" title="First author">★</span>' : '<span style="color:#d1d5db;">☆</span>';
    const score      = pub.relevance_score ? pub.relevance_score : '—';
    const confidence = pub.confidence || '';
    const confColor  = confidence === 'High' ? '#10b981' : confidence === 'Low' ? '#ef4444' : '#f59e0b';
    const confBadge  = confidence ? `<span style="font-size:11px;color:${confColor};font-weight:600;">${escapeHtml(confidence)}</span>` : '';
    const reasoning  = pub.rationale ? `<small>${escapeHtml(pub.rationale)}</small>` : '';
    const venueWarn  = pub.venue_warning ? ` <span title="${escapeHtml(pub.venue_warning)}" style="color:#dc7900;cursor:help;">⚠</span>` : '';
    const isAccepted = window.publicationDecisions[citeKey] !== false;
    const rowStyle   = pub.is_recommended === false ? 'opacity:0.7;' : '';
    const isFirst    = idx === 0;
    const isLast     = idx === recommendations.length - 1;
    html += `<tr data-cite-key="${escapeHtml(citeKey)}" style="${rowStyle}">
      <td style="text-align:center;font-weight:700;">${rank}</td>
      <td style="font-size:0.87em;">${escapeHtml(citation)}${venueWarn}</td>
      <td style="text-align:center;">${year}</td>
      <td style="text-align:center;">${firstAuth}</td>
      <td style="text-align:center;">${score !== '—' ? `<strong>${score}</strong>/10` : '—'}</td>
      <td style="text-align:center;">${confBadge}</td>
      <td>${reasoning}</td>
      <td class="action-btns">
        <button class="icon-btn${isAccepted ? ' active' : ''}" data-action="accept" aria-label="Include publication ${escapeHtml(citeKey)}" title="Include in CV" style="color:#10b981;" id="pub-accept-${rank}">✓</button>
        <button class="icon-btn${!isAccepted ? ' active' : ''}" data-action="reject" aria-label="Exclude publication ${escapeHtml(citeKey)}" title="Exclude from CV" style="color:#ef4444;" id="pub-reject-${rank}">${eyeSlashIcon()}</button>
      </td>
      <td style="text-align:center;white-space:nowrap;">
        <button class="icon-btn" data-action="pub-up" data-cite-key="${escapeHtml(citeKey)}" aria-label="Move publication up" title="Move up" ${isFirst ? 'disabled style="opacity:0.3;"' : ''}>↑</button>
        <button class="icon-btn" data-action="pub-down" data-cite-key="${escapeHtml(citeKey)}" aria-label="Move publication down" title="Move down" ${isLast ? 'disabled style="opacity:0.3;"' : ''}>↓</button>
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
  // Re-apply any active filter
  const filterVal = document.getElementById('pub-filter-input')?.value || '';
  if (filterVal) filterPublicationsTable(filterVal);
}

// ── Toggle accept / reject ───────────────────────────────────────────────────

function handlePubAction(citeKey, accept) {
  window.publicationDecisions[citeKey] = accept;
  // update button active states in the row
  const row = document.querySelector(`tr[data-cite-key="${CSS.escape(citeKey)}"]`);
  if (!row) return;
  row.querySelectorAll('.icon-btn').forEach(btn => btn.classList.remove('active'));
  const action = accept ? 'accept' : 'reject';
  const btn = row.querySelector(`[data-action="${action}"]`);
  if (btn) btn.classList.add('active');
}

// ── Bulk actions ─────────────────────────────────────────────────────────────

function bulkPubAction(mode) {
  const pubs = window._publicationsOrdered || [];
  if (!pubs.length) return;

  pubs.forEach(pub => {
    const citeKey = pub.cite_key;
    let accept;
    if (mode === 'recommended') {
      accept = pub.is_recommended !== false;
    } else if (mode === 'accept-all') {
      accept = true;
    } else {
      accept = false;
    }
    window.publicationDecisions[citeKey] = accept;
    // Update button states in the DOM
    const row = document.querySelector(`tr[data-cite-key="${CSS.escape(citeKey)}"]`);
    if (!row) return;
    row.querySelectorAll('.icon-btn[data-action="accept"],[data-action="reject"]').forEach(btn => btn.classList.remove('active'));
    const target = row.querySelector(`[data-action="${accept ? 'accept' : 'reject'}"]`);
    if (target) target.classList.add('active');
  });

  const accepted = Object.values(window.publicationDecisions).filter(Boolean).length;
  showToast(`Bulk action applied: ${accepted} accepted, ${pubs.length - accepted} excluded`);
}

// ── Submit decisions ─────────────────────────────────────────────────────────

async function submitPublicationDecisions() {
  /* duckflow:
   *   id: publications_ui_submit_live
   *   kind: ui
   *   timestamp: '2026-03-25T21:39:48Z'
   *   status: live
   *   handles:
   *   - ui:publications-review.submit
   *   calls:
   *   - POST /api/review-decisions
   *   - GET /api/rewrites
   *   reads:
   *   - window:publicationDecisions
   *   writes:
   *   - request:POST /api/review-decisions.decisions
   *   notes: Persists publication include/exclude decisions before the rewrite stage derives downstream content proposals from the accepted publication set.
   */
  const decisions = window.publicationDecisions || {};
  const count = Object.keys(decisions).length;
  if (count === 0) {
    showToast('No publication decisions to save.', 'error');
    return;
  }

  // Persist as a structured answer in session state
  try {
    const response = await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'publications', decisions: window.publicationDecisions })
    });

    if (response.ok) {
      stateManager.markContentChanged();
      const accepted = Object.values(window.publicationDecisions).filter(Boolean).length;
      const rejected = count - accepted;
      showToast(`Publication selections saved: ${accepted} kept, ${rejected} excluded`);
      await fetchAndReviewRewrites();
    } else {
      const err = await response.json();
      showToast(`Error: ${err.error || 'Failed to save publication selections'}`, 'error');
    }
  } catch (err) {
    log.error('Error saving publication decisions:', err);
    showToast('Failed to save publication selections. Please try again.', 'error');
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

export {
  buildPublicationsReviewTable,
  bulkPubAction,
  filterPublicationsTable,
  handlePubAction,
  submitPublicationDecisions,
};
