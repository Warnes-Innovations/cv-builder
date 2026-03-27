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

// ── Build publications review table ─────────────────────────────────────────

async function buildPublicationsReviewTable() {
  const container = document.getElementById('publications-table-container');
  // In the new sub-tab layout, we use the pane wrapper instead of the old section
  const section   = document.getElementById('publications-review-section') ||
                    document.getElementById('review-pane-publications');
  const pubTabBtn = document.querySelector('.review-subtab[data-pane="publications"]');
  if (!container) return;

  container.innerHTML = '<p style="padding: 20px; text-align: center; color: #6b7280;">Loading publication recommendations…</p>';

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

  let tableHTML = `
    <p style="color:#6b7280;font-size:0.9em;margin-bottom:12px;">${contextNote}</p>
    <div style="margin-bottom:10px;">
      <label style="font-size:0.9em;color:#374151;">Filter publications:
        <input type="search" id="pub-filter-input" placeholder="Type to filter…"
          style="margin-left:8px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:0.9em;"
          oninput="filterPublicationsTable(this.value)">
      </label>
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
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  container.innerHTML = tableHTML;
  // Delegated click handler for publication action buttons (data-cite-key on <tr> avoids onclick injection)
  container.querySelector('#publications-review-table tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const tr = btn.closest('tr[data-cite-key]');
    if (!tr) return;
    const action = btn.dataset.action;
    if      (action === 'accept') handlePubAction(tr.dataset.citeKey, true);
    else if (action === 'reject') handlePubAction(tr.dataset.citeKey, false);
  });
}

// ── Filter table ─────────────────────────────────────────────────────────────

function filterPublicationsTable(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#publications-review-table tbody tr:not(.pub-divider-row)').forEach(row => {
    row.style.display = q === '' || row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
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
  filterPublicationsTable,
  handlePubAction,
  submitPublicationDecisions,
};
