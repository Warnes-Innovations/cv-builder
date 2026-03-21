// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/experience-review.js
 * Experience-review table: fetch, render, row-reorder, and submit decisions.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   userSelections, pendingRecommendations, _savedDecisions, _experiencesOrdered,
 *   parseStatusResponse, getExperienceRecommendation, getConfidenceLevel,
 *   getExperienceReasoning, escapeHtml, showBulletReorder,
 *   handleActionClick, bulkAction, _updatePageEstimate,
 *   updateInclusionCounts, switchTab,
 *   showAlertModal, showToast, scheduleAtsRefresh,
 *   $, $.fn.DataTable (jQuery + DataTables)
 */

// ── Experience details fetch ───────────────────────────────────────────────

async function getExperienceDetails(expId) {
  try {
    const res = await fetch('/api/experience-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experience_id: expId })
    });

    if (res.ok) {
      const data = await res.json();
      return data.experience || null;
    } else {
      console.warn('Could not fetch experience details for', expId);
      return null;
    }
  } catch (error) {
    console.warn('Error fetching experience details:', error);
    return null;
  }
}

// ── Build review table (fetch + initialise) ────────────────────────────────

async function buildExperienceReviewTable() {
  const data = window.pendingRecommendations;
  const container = document.getElementById('experience-table-container');
  if (!container) return;

  container.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading experience recommendations…</p></div>';

  let allExperienceIds = [];
  try {
    const statusRes = await fetch('/api/status');
    const statusData = parseStatusResponse(await statusRes.json());
    allExperienceIds = statusData.all_experience_ids || data.recommended_experiences || [];
  } catch (error) {
    allExperienceIds = data.recommended_experiences || [];
  }

  const recommendedSet = new Set(data.recommended_experiences || []);

  // Fetch all experience details
  const experiencesWithDetails = [];
  for (const expId of allExperienceIds) {
    const details = await getExperienceDetails(expId);
    experiencesWithDetails.push({ id: expId, details });
  }

  // On first load: sort by start date (most recent first); on re-render preserve user order
  if (!window._experiencesOrdered) {
    experiencesWithDetails.sort((a, b) => {
      const aStart = a.details?.start_date || '0';
      const bStart = b.details?.start_date || '0';
      return bStart.localeCompare(aStart);
    });
    window._experiencesOrdered = experiencesWithDetails;
  } else {
    // Merge any newly discovered experiences into the cached order
    const knownIds = new Set(window._experiencesOrdered.map(e => e.id));
    for (const exp of experiencesWithDetails) {
      if (!knownIds.has(exp.id)) window._experiencesOrdered.push(exp);
    }
  }

  // Initialise saved decisions
  const savedExpDecs = window._savedDecisions?.experience_decisions || {};
  for (const { id: expId } of window._experiencesOrdered) {
    const recommendation = getExperienceRecommendation(expId, data);
    const isRecommended  = recommendedSet.has(expId);
    let defaultAction = 'exclude';
    if      (recommendation === 'Emphasize')    defaultAction = 'emphasize';
    else if (recommendation === 'Include')      defaultAction = 'include';
    else if (recommendation === 'De-emphasize') defaultAction = 'de-emphasize';
    else if (recommendation === 'Omit')         defaultAction = 'exclude';
    else if (isRecommended)                     defaultAction = 'include';
    userSelections.experiences[expId] = savedExpDecs[expId] || defaultAction;
  }

  _renderExperienceTable(container, recommendedSet, data);
}

// ── Render table HTML ──────────────────────────────────────────────────────

function _renderExperienceTable(container, recommendedSet, data) {
  if (!container) container = document.getElementById('experience-table-container');
  if (!container) return;
  if (!recommendedSet) recommendedSet = new Set((window.pendingRecommendations?.recommended_experiences) || []);
  if (!data) data = window.pendingRecommendations;

  // Destroy any existing DataTable before rebuilding
  if ($.fn.DataTable.isDataTable('#experience-review-table')) {
    $('#experience-review-table').DataTable().destroy();
  }

  const exps = window._experiencesOrdered || [];
  let tableHTML = `
    <table id="experience-review-table" class="review-table">
      <thead>
        <tr>
          <th>Experience</th>
          <th>Dates</th>
          <th>Recommendation</th>
          <th>Confidence</th>
          <th>Reasoning</th>
          <th>Your Selection</th>
        </tr>
      </thead>
      <tbody>
  `;

  exps.forEach(({ id: expId, details }, rowIdx) => {
    const recommendation    = getExperienceRecommendation(expId, data);
    const confidence        = getConfidenceLevel(expId, data);
    const reasoning         = getExperienceReasoning(expId, data);
    const title             = details ? details.title   : expId;
    const company           = details ? details.company : '';
    const startDate         = details?.start_date || '';
    const endDate           = details?.end_date   || 'present';
    const duration          = startDate ? `${startDate} - ${endDate}` : (details?.duration || '');
    const defaultAction     = userSelections.experiences[expId] || 'include';
    const recommendationText = recommendation || 'Include';
    const confidenceBadge   = `<span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>`;
    const reasoningText     = reasoning || 'This experience was selected based on its relevance to the position requirements.';
    const isFirst           = rowIdx === 0;
    const isLast            = rowIdx === exps.length - 1;
    const titleEsc          = escapeHtml(title);

    tableHTML += `
      <tr data-exp-id="${expId}" data-start-date="${startDate}">
        <td>
          <strong>${titleEsc}</strong><br>
          <span style="color:#6b7280;">${escapeHtml(company)}</span>
        </td>
        <td style="white-space:nowrap;">${escapeHtml(duration)}</td>
        <td><strong>${escapeHtml(recommendationText)}</strong></td>
        <td>${confidenceBadge}</td>
        <td style="max-width:300px;"><small>${escapeHtml(reasoningText)}</small></td>
        <td class="action-btns" style="white-space:nowrap;">
          <button class="icon-btn ${defaultAction === 'emphasize'    ? 'active' : ''}" data-action="emphasize"    aria-label="Emphasize ${titleEsc}"       title="Emphasize — feature prominently" style="color:#10b981;font-size:1.5em;">➕</button>
          <button class="icon-btn ${defaultAction === 'include'      ? 'active' : ''}" data-action="include"      aria-label="Include ${titleEsc}"         title="Include — standard treatment"    style="font-size:1.3em;">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" aria-label="De-emphasize ${titleEsc}"    title="De-emphasize — brief mention"    style="color:#f59e0b;font-size:1.5em;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude'      ? 'active' : ''}" data-action="exclude"      aria-label="Exclude ${titleEsc}"         title="Exclude — omit from CV"          style="color:#ef4444;font-size:1.3em;">✗</button>
          <button class="icon-btn" data-action="reorder" aria-label="Reorder bullets for ${titleEsc}" title="Reorder bullet points" style="color:#6366f1;font-size:1.1em;">↕</button>
          <button class="icon-btn" data-action="row-up"   aria-label="Move ${titleEsc} earlier in CV" title="Move up in CV"   ${isFirst ? 'disabled' : ''} style="font-size:1.0em;padding:2px 5px;">↑</button>
          <button class="icon-btn" data-action="row-down" aria-label="Move ${titleEsc} later in CV"   title="Move down in CV" ${isLast  ? 'disabled' : ''} style="font-size:1.0em;padding:2px 5px;">↓</button>
        </td>
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  container.innerHTML = tableHTML;

  // Delegated click handler
  container.querySelector('#experience-review-table tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const tr = btn.closest('tr[data-exp-id]');
    if (!tr) return;
    const expId  = tr.dataset.expId;
    const action = btn.dataset.action;
    if (action === 'reorder') {
      e.stopPropagation();
      const titleEl = tr.querySelector('strong');
      showBulletReorder(expId, titleEl ? titleEl.textContent : '');
    } else if (action === 'row-up') {
      e.stopPropagation();
      moveExperienceRow(expId, -1);
    } else if (action === 'row-down') {
      e.stopPropagation();
      moveExperienceRow(expId, +1);
    } else if (action) {
      handleActionClick(expId, action, 'experience');
    }
  });

  // Bulk toolbar
  const expToolbar = document.createElement('div');
  expToolbar.className = 'bulk-toolbar';
  expToolbar.innerHTML = `
    <span>Bulk:</span>
    <button class="bulk-btn bulk-recommended" onclick="bulkAction('recommended','experience')" title="Set all to the LLM recommendation">✨ Accept All Recommended</button>
    <button class="bulk-btn bulk-emphasize"   onclick="bulkAction('emphasize','experience')">➕ Emphasize All</button>
    <button class="bulk-btn bulk-include"     onclick="bulkAction('include','experience')">✓ Include All</button>
    <button class="bulk-btn bulk-exclude"     onclick="bulkAction('exclude','experience')">✗ Exclude All</button>
  `;
  container.insertBefore(expToolbar, container.firstChild);

  // Initialize DataTable with no auto-sort (rows stay in user-specified order)
  $('#experience-review-table').DataTable({
    paging: false,
    order: [],
    language: { search: 'Filter experiences:' }
  });
  _updatePageEstimate();
}

// ── Row reorder ────────────────────────────────────────────────────────────

function moveExperienceRow(expId, direction) {
  const arr = window._experiencesOrdered;
  if (!arr) return;
  const idx = arr.findIndex(e => e.id === expId);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  window._experiencesOrdered = arr;
  _renderExperienceTable(null, null, null);
  // Persist the new order to the backend (fire-and-forget; no UI block)
  fetch('/api/reorder-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'experience', ordered_ids: arr.map(e => e.id) })
  }).catch(() => {});
}

// ── Legacy interactive-mode response handler ───────────────────────────────

async function handleExperienceResponse(message) {
  window.waitingForExperienceResponse = false;
  const response = message.toLowerCase();

  if (response.includes('yes')) {
    appendMessage('assistant', 'Great! I\'ll include this experience prominently.');
  } else if (response.includes('no')) {
    appendMessage('assistant', 'Understood. I\'ll exclude this experience from the final CV.');
  } else if (response.includes('maybe')) {
    appendMessage('assistant', 'I\'ll include it but with less emphasis.');
  } else {
    appendMessage('assistant', 'I\'ll note your feedback on this experience.');
  }

  // Move to next experience (currentIndex already incremented in showNextExperience)
  setTimeout(() => showNextExperience(), 800);
}

// ── Submit decisions ───────────────────────────────────────────────────────

async function submitExperienceDecisions() {
  const decisions = userSelections.experiences;
  const count = Object.keys(decisions).length;

  if (count === 0) {
    showAlertModal('No Selections', 'Please select actions for at least one experience before submitting.');
    return;
  }

  try {
    const response = await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'experiences',
        decisions: decisions
      })
    });

    if (response.ok) {
      showToast(`Experience decisions saved (${count} items)`);
      scheduleAtsRefresh();
      // Persist saved decisions locally so the UI reflects them immediately
      window._savedDecisions = window._savedDecisions || {};
      window._savedDecisions.experience_decisions = decisions;
      userSelections.experiences = { ...decisions };
      if (typeof updateInclusionCounts === 'function') updateInclusionCounts();
      switchTab('ach-editor');
    } else {
      const error = await response.json();
      showToast(`Error: ${error.error || 'Failed to save decisions'}`, 'error');
    }
  } catch (error) {
    console.error('Error submitting experience decisions:', error);
    showToast('Failed to save decisions. Please try again.', 'error');
  }
}

// ── Exports ───────────────────────────────────────────────────────────────

export {
  getExperienceDetails,
  buildExperienceReviewTable,
  _renderExperienceTable,
  moveExperienceRow,
  handleExperienceResponse,
  submitExperienceDecisions,
};
