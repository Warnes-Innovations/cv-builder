// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * achievements-review.js
 * ES module — Achievements review table, achievements editor, and AI rewrite modal.
 *
 * Dependencies resolved through globalThis at runtime:
 *   - pendingRecommendations        (window)
 *   - achievementDecisions          (window — also initialised here)
 *   - _achievementsOrdered          (window — also initialised here)
 *   - _suggestedAchsOrdered         (window)
 *   - _savedDecisions               (window)
 *   - achievementEdits              (window)
 *   - userSelections                (window)
 *   - getAchievementRecommendation  (globalThis function)
 *   - getAchievementConfidence      (globalThis function)
 *   - getAchievementReasoning       (globalThis function)
 *   - escapeHtml                    (globalThis function)
 *   - handleAchievementAction       (globalThis / this module)
 *   - bulkAchievementAction         (globalThis / this module)
 *   - moveAchievementRow            (globalThis / this module)
 *   - moveSuggestedAchievementRow   (globalThis / this module)
 *   - saveTopLevelAchievementField  (globalThis / this module)
 *   - saveSuggestedAchievementField (globalThis / this module)
 *   - aiRewriteTopLevelAchievement  (globalThis / this module)
 *   - aiRewriteSuggestedAchievement (globalThis / this module)
 *   - deleteTopLevelAchievement     (globalThis / this module)
 *   - deleteSuggestedAchievement    (globalThis / this module)
 *   - showToast                     (globalThis function)
 *   - scheduleAtsRefresh            (globalThis function)
 *   - updateInclusionCounts         (globalThis function)
 *   - switchTab                     (globalThis function)
 *   - confirmDialog                 (globalThis function)
 *   - closeAlertModal               (globalThis function)
 *   - setInitialFocus               (globalThis function)
 *   - trapFocus                     (globalThis function)
 *   - _focusedElementBeforeModal    (globalThis)
 *   - CSS.escape                    (browser built-in)
 */

import { stateManager } from './state-manager.js';
import { eyeSlashIcon } from './review-icons.js';

// Module-level state
let _rewriteSuggestionHistory = [];
let _lastRewriteLogId = null;
// Callbacks for the active rewrite modal: { experienceIndex, onAccept }
let _rewriteCallbacks = null;

function _normalizeAchievementEditEntry(entry) {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return {
      text: String(entry.text ?? entry.description ?? entry.content ?? ''),
      hidden: Boolean(entry.hidden),
    };
  }
  return {
    text: String(entry ?? ''),
    hidden: false,
  };
}

function _normalizeAchievementEditList(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(_normalizeAchievementEditEntry);
}

function _achievementEntryText(entry) {
  return _normalizeAchievementEditEntry(entry).text;
}

function _achievementEntryHidden(entry) {
  return _normalizeAchievementEditEntry(entry).hidden;
}

window.achievementDecisions = {};
window._achievementsOrdered = null;

// Small fetch helper with timeout to avoid leaving loaders visible on hanging requests
async function fetchJsonWithTimeout(url, opts = {}, timeout = 7000) {
  const controller = new AbortController();
  const signal = controller.signal;
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, Object.assign({}, opts, { signal }));
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function buildAchievementsReviewTable() {
  const container = document.getElementById('achievements-table-container');
  if (!container) return;

  container.innerHTML = '<p style="padding:20px;text-align:center;color:#6b7280;">Loading achievements…</p>';

  // Prefer session-aware status data so review-time overlays are reflected.
  let allAchievements = [];
  try {
    const res = await fetchJsonWithTimeout('/api/status', {}, 7000);
    if (!res.ok) throw new Error('status not ok');
    const statusData = await res.json();
    allAchievements = statusData.all_achievements || [];
  } catch (err) {
    // Secondary fallback: raw master fields.
    try {
      const res2 = await fetchJsonWithTimeout('/api/master-fields', {}, 7000);
      if (!res2.ok) throw new Error('master-fields not ok');
      const masterData = await res2.json();
      allAchievements = masterData.selected_achievements || [];
    } catch (err2) {
      container.innerHTML = '<p style="color:#ef4444;padding:20px;">Failed to load achievements.</p>';
      return;
    }
  }

  if (allAchievements.length === 0) {
    container.innerHTML = '<p style="padding:20px;color:#6b7280;">No key achievements found in master CV data.</p>';
    return;
  }

  const data = window.pendingRecommendations || {};
  const recommendedSet = new Set(data.recommended_achievements || []);

  // Sort: recommended first, then by importance descending (only on first load)
  if (!window._achievementsOrdered) {
    allAchievements = [...allAchievements].sort((a, b) => {
      const aRec = recommendedSet.has(a.id) ? 1 : 0;
      const bRec = recommendedSet.has(b.id) ? 1 : 0;
      if (bRec !== aRec) return bRec - aRec;
      return (b.importance || 0) - (a.importance || 0);
    });
    window._achievementsOrdered = allAchievements;
  }

  // Initialise decisions
  window.achievementDecisions = {};
  window._achievementsOrdered.forEach(ach => {
    const rec = getAchievementRecommendation(ach.id, data);
    let defaultAction = 'include';
    if (rec === 'Emphasize')         defaultAction = 'emphasize';
    else if (rec === 'Include')      defaultAction = 'include';
    else if (rec === 'De-emphasize') defaultAction = 'de-emphasize';
    else if (rec === 'Omit')         defaultAction = 'exclude';
    window.achievementDecisions[ach.id] = defaultAction;
  });
  // Apply any previously saved user decisions over the LLM defaults
  const savedAchDecs = window._savedDecisions?.achievement_decisions || {};
  if (Object.keys(savedAchDecs).length > 0) Object.assign(window.achievementDecisions, savedAchDecs);

  // Also handle AI-suggested achievements — assign stable IDs once on first load
  // so that reorder / delete operations never need to remap decision keys.
  if (!window._suggestedAchsOrdered) {
    let counter = 0;
    window._suggestedAchsOrdered = (data.suggested_achievements || []).map(s => {
      const item = Object.assign({}, s);
      item._suggId = `sugg::${counter++}`;
      return item;
    });
  }
  window._suggestedAchsOrdered.forEach(s => {
    if (!(s._suggId in window.achievementDecisions)) window.achievementDecisions[s._suggId] = 'include';
  });

  _renderAchievementsReviewTable(container);
}

function _renderAchievementsReviewTable(container) {
  if (!container) container = document.getElementById('achievements-table-container');
  if (!container) return;

  const data = window.pendingRecommendations || {};
  const orderedAchs  = window._achievementsOrdered || [];
  const suggestedAchs = window._suggestedAchsOrdered || [];

  // Build filter + table HTML
  let html = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
      <input type="text" id="ach-review-filter"
        placeholder="Filter achievements…"
        oninput="_filterAchievementsTable(this.value)"
        style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9em;">
      <span id="ach-review-count" style="font-size:0.85em;color:#6b7280;white-space:nowrap;">${orderedAchs.length + suggestedAchs.length} achievements</span>
    </div>
    <table id="achievements-review-table" class="review-table" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th>Achievement</th>
          <th>Recommendation</th>
          <th>Confidence</th>
          <th>Reasoning</th>
          <th>Selection</th>
        </tr>
      </thead>
      <tbody>
  `;

  orderedAchs.forEach((ach, rowIdx) => {
    const id             = ach.id || ach.title || '';
    const title          = ach.title || id;
    const desc           = ach.description || '';
    const recommendation = getAchievementRecommendation(id, data);
    const confidence     = getAchievementConfidence(id, data, ach.importance);
    const reasoning      = getAchievementReasoning(id, data, ach);
    const defaultAction  = window.achievementDecisions[id] || 'include';
    const confidenceBadge = `<span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>`;
    const isFirst = rowIdx === 0;
    const isLast  = rowIdx === orderedAchs.length - 1;

    html += `
      <tr data-ach-id="${escapeHtml(id)}">
        <td style="min-width:220px;">
          <input id="ach-title-${escapeHtml(id)}"
            type="text" value="${escapeHtml(title)}"
            style="width:100%;font-weight:600;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:0.9em;box-sizing:border-box;"
            onblur="saveTopLevelAchievementField('${escapeHtml(id)}', 'title', this.value)"
            aria-label="Achievement title">
          <textarea id="ach-desc-${escapeHtml(id)}"
            rows="2"
            style="width:100%;margin-top:4px;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:0.85em;resize:vertical;box-sizing:border-box;"
            onblur="saveTopLevelAchievementField('${escapeHtml(id)}', 'description', this.value)"
            aria-label="Achievement description"
          >${escapeHtml(desc)}</textarea>
        </td>
        <td><strong>${escapeHtml(recommendation)}</strong></td>
        <td>${confidenceBadge}</td>
        <td style="max-width:200px;"><small>${escapeHtml(reasoning)}</small></td>
        <td class="action-btns" style="white-space:nowrap;">
          <button class="icon-btn ${defaultAction === 'emphasize'    ? 'active' : ''}" data-action="emphasize"    aria-label="Emphasize ${escapeHtml(title)}"    title="Emphasize — feature prominently"  style="color:#10b981;">➕</button>
          <button class="icon-btn ${defaultAction === 'include'      ? 'active' : ''}" data-action="include"      aria-label="Include ${escapeHtml(title)}"      title="Include — standard treatment">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" aria-label="De-emphasize ${escapeHtml(title)}" title="De-emphasize — brief mention only"  style="color:#f59e0b;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude'      ? 'active' : ''}" data-action="exclude"      aria-label="Exclude ${escapeHtml(title)}"      title="Exclude — omit from CV"            style="color:#ef4444;">${eyeSlashIcon()}</button>
          <button class="icon-btn" aria-label="AI rewrite ${escapeHtml(title)}" title="AI rewrite description" onclick="aiRewriteTopLevelAchievement('${escapeHtml(id)}')">✨</button>
          <button class="icon-btn" aria-label="Move ${escapeHtml(title)} earlier" title="Move up"   ${isFirst ? 'disabled' : ''} onclick="moveAchievementRow('${escapeHtml(id)}',-1)">↑</button>
          <button class="icon-btn" aria-label="Move ${escapeHtml(title)} later"   title="Move down" ${isLast  ? 'disabled' : ''} onclick="moveAchievementRow('${escapeHtml(id)}',+1)">↓</button>
          <button class="icon-btn" aria-label="Delete ${escapeHtml(title)}" title="Delete achievement" onclick="deleteTopLevelAchievement('${escapeHtml(id)}')" style="color:#ef4444;">🗑</button>
        </td>
      </tr>
    `;
  });

  // AI-suggested achievements — full editing/control parity with user achievements
  suggestedAchs.forEach((sugg, rowIdx) => {
    const suggId      = sugg._suggId;
    const confRaw     = (sugg.confidence || 'Medium').toLowerCase();
    const confLevel   = confRaw.includes('high') ? 'high' : confRaw.includes('low') ? 'low' : 'medium';
    const confText    = sugg.confidence || 'Medium';
    const defaultAction = window.achievementDecisions[suggId] || 'include';
    const isFirst     = rowIdx === 0;
    const isLast      = rowIdx === suggestedAchs.length - 1;

    html += `
      <tr data-ach-id="${escapeHtml(suggId)}" style="background:#fefce8;">
        <td style="min-width:220px;">
          <span style="display:inline-block;background:#f59e0b;color:#fff;font-size:0.7em;font-weight:700;padding:1px 6px;border-radius:10px;margin-bottom:4px;vertical-align:middle;">⭐ AI Suggested</span>
          <input id="ach-title-${escapeHtml(suggId)}"
            type="text" value="${escapeHtml(sugg.title || '')}"
            style="width:100%;font-weight:600;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:0.9em;box-sizing:border-box;"
            onblur="saveSuggestedAchievementField('${escapeHtml(suggId)}', 'title', this.value)"
            aria-label="Achievement title">
          <textarea id="ach-desc-${escapeHtml(suggId)}"
            rows="2"
            style="width:100%;margin-top:4px;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:0.85em;resize:vertical;box-sizing:border-box;"
            onblur="saveSuggestedAchievementField('${escapeHtml(suggId)}', 'description', this.value)"
            aria-label="Achievement description"
          >${escapeHtml(sugg.description || '')}</textarea>
          ${sugg.experience_id ? `<small style="color:#9ca3af;">Experience: ${escapeHtml(sugg.experience_id)}</small>` : ''}
        </td>
        <td><strong>Add New</strong></td>
        <td><span class="confidence-badge confidence-${confLevel}">${escapeHtml(confText)}</span></td>
        <td style="max-width:200px;"><small>${escapeHtml(sugg.rationale || '')}</small></td>
        <td class="action-btns" style="white-space:nowrap;">
          <button class="icon-btn ${defaultAction === 'emphasize'    ? 'active' : ''}" data-action="emphasize"    aria-label="Emphasize"    title="Emphasize — feature prominently"  style="color:#10b981;">➕</button>
          <button class="icon-btn ${defaultAction === 'include'      ? 'active' : ''}" data-action="include"      aria-label="Include"      title="Include — add to CV">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" aria-label="De-emphasize" title="De-emphasize — brief mention only"  style="color:#f59e0b;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude'      ? 'active' : ''}" data-action="exclude"      aria-label="Exclude"      title="Skip — do not add"                 style="color:#ef4444;">${eyeSlashIcon()}</button>
          <button class="icon-btn" aria-label="AI rewrite" title="AI rewrite description" onclick="aiRewriteSuggestedAchievement('${escapeHtml(suggId)}')">✨</button>
          <button class="icon-btn" aria-label="Move earlier" title="Move up"   ${isFirst ? 'disabled' : ''} onclick="moveSuggestedAchievementRow('${escapeHtml(suggId)}',-1)">↑</button>
          <button class="icon-btn" aria-label="Move later"   title="Move down" ${isLast  ? 'disabled' : ''} onclick="moveSuggestedAchievementRow('${escapeHtml(suggId)}',+1)">↓</button>
          <button class="icon-btn" aria-label="Remove suggestion" title="Remove suggestion" onclick="deleteSuggestedAchievement('${escapeHtml(suggId)}')" style="color:#ef4444;">🗑</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  // Bulk toolbar above the filter row
  const achToolbar = document.createElement('div');
  achToolbar.className = 'bulk-toolbar';
  achToolbar.innerHTML = `
    <span>Bulk:</span>
    <button class="bulk-btn bulk-recommended" onclick="bulkAchievementAction('recommended')" title="Set all to the LLM recommendation">✨ Accept All Recommended</button>
    <button class="bulk-btn bulk-emphasize"   onclick="bulkAchievementAction('emphasize')">➕ Emphasize All</button>
    <button class="bulk-btn bulk-include"     onclick="bulkAchievementAction('include')">✓ Include All</button>
    <button class="bulk-btn bulk-exclude"     onclick="bulkAchievementAction('exclude')">${eyeSlashIcon()} Exclude All</button>
  `;
  container.insertBefore(achToolbar, container.firstChild);

  // Delegated click handler for decision buttons
  container.querySelector('tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr[data-ach-id]');
    if (!tr) return;
    const action = btn.dataset.action;
    if (action) handleAchievementAction(tr.dataset.achId, action);
  });
}

function bulkAchievementAction(action) {
  const data = window.pendingRecommendations || {};
  document.querySelectorAll('#achievements-review-table tbody tr[data-ach-id]').forEach(row => {
    if (row.style.display === 'none') return;   // respect filter
    const achId = row.dataset.achId;
    if (!achId) return;
    let resolvedAction = action;
    if (action === 'recommended') {
      if (achId.startsWith('sugg::')) {
        resolvedAction = 'include'; // AI-suggested items default to include when accepting all
      } else {
        const rec = getAchievementRecommendation(achId, data);
        if (rec === 'Emphasize')         resolvedAction = 'emphasize';
        else if (rec === 'Include')      resolvedAction = 'include';
        else if (rec === 'De-emphasize') resolvedAction = 'de-emphasize';
        else                             resolvedAction = 'exclude';
      }
    }
    handleAchievementAction(achId, resolvedAction);
  });
}

function handleAchievementAction(achId, action) {
  window.achievementDecisions[achId] = action;
  const row = document.querySelector(`tr[data-ach-id="${CSS.escape(achId)}"]`);
  if (!row) return;
  row.querySelectorAll('.icon-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = row.querySelector(`[data-action="${action}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

async function submitAchievementDecisions() {
  /* duckflow:
   *   id: achievements_ui_submit_live
   *   kind: ui
   *   timestamp: '2026-03-25T21:39:48Z'
   *   status: live
   *   handles:
   *   - ui:achievements-review.submit
   *   calls:
   *   - POST /api/review-decisions
   *   - POST /api/cv/layout-estimate
   *   reads:
   *   - window:achievementDecisions
   *   - window:_suggestedAchsOrdered
   *   writes:
   *   - request:POST /api/review-decisions.decisions
   *   - request:POST /api/review-decisions.accepted_suggestions
   *   - window:_savedDecisions.achievement_decisions
   *   - window:_savedDecisions.accepted_suggested_achievements
   *   notes: Persists achievement inclusion decisions and the accepted AI-suggested achievements that should remain session-only until an explicit harvest step.
   */
  const allDecisions = window.achievementDecisions || {};
  // Separate existing achievements from AI-suggested ones
  const decisions = {};
  const suggestedDecisions = {};
  for (const [k, v] of Object.entries(allDecisions)) {
    if (k.startsWith('sugg::')) suggestedDecisions[k] = v;
    else decisions[k] = v;
  }
  const count = Object.keys(allDecisions).length;
  if (count === 0) return;
  // Resolve suggested achievement objects that were accepted
  const suggestedAchs = window._suggestedAchsOrdered || [];
  const acceptedSuggestions = suggestedAchs
    .filter(s => {
      const action = suggestedDecisions[s._suggId];
      return action === 'include' || action === 'emphasize';
    })
    .map(s => ({ title: s.title, description: s.description, experience_id: s.experience_id, rationale: s.rationale }));
  try {
    const response = await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'achievements', decisions, accepted_suggestions: acceptedSuggestions })
    });
    if (response.ok) {
      stateManager.markContentChanged();
      showToast(`Achievement selections saved (${count} items)`);
      scheduleAtsRefresh();
      // Persist locally so the review UI immediately reflects saved choices
      window._savedDecisions = window._savedDecisions || {};
      window._savedDecisions.achievement_decisions = decisions;
      if (acceptedSuggestions && acceptedSuggestions.length > 0) {
        window._savedDecisions.accepted_suggested_achievements = acceptedSuggestions;
      }
      if (typeof updateInclusionCounts === 'function') updateInclusionCounts();
      switchTab('summary-review');
    } else {
      const err = await response.json();
      showToast(`Error: ${err.error || 'Failed to save selections'}`, 'error');
    }
  } catch (e) {
    showToast('Failed to save achievement selections. Please try again.', 'error');
  }
}

function moveAchievementRow(achId, direction) {
  const arr = window._achievementsOrdered;
  if (!arr) return;
  const idx = arr.findIndex(a => a.id === achId);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  window._achievementsOrdered = arr;
  _renderAchievementsReviewTable(document.getElementById('achievements-table-container'));
}

// ==== Achievements Editor Tab ====

/**
 * Build the per-experience achievements editor tab.
 * Each experience gets a collapsible card with its achievements listed.
 * Each achievement supports: inline edit, reorder (↑↓), delete, and LLM rewrite.
 */
async function buildAchievementsEditor() {
  const container = document.getElementById('document-content');
  if (!container) return;

  container.innerHTML = '<p style="padding:20px;text-align:center;color:#6b7280;">Loading experience bullets editor…</p>';

  // Fetch experiences + their achievements from master fields
  let experiences = [];
  try {
    const res = await fetch('/api/master-fields');
    const data = await res.json();
    experiences = data.experiences || [];
  } catch (_) {}

  if (experiences.length === 0) {
    container.innerHTML = '<p style="padding:20px;color:#6b7280;">No experiences found in master CV.</p>';
    return;
  }

  // Initialise edits store — keyed by experience index, value is array of { text, hidden }
  window.achievementEdits = window.achievementEdits || {};
  experiences.forEach((exp, expIdx) => {
    if (!window.achievementEdits[expIdx]) {
      window.achievementEdits[expIdx] = (exp.key_achievements || exp.achievements || []).map(a =>
        _normalizeAchievementEditEntry(
          typeof a === 'string' ? a : (a && (a.text || a.description || a.content || '')) || ''
        )
      );
    } else {
      window.achievementEdits[expIdx] = _normalizeAchievementEditList(window.achievementEdits[expIdx]);
    }
  });

  let html = `
    <div style="padding:16px;">
      <h2 style="margin:0 0 4px;">✏️ Experience Bullets</h2>
      <p style="color:#6b7280;margin:0 0 16px;font-size:0.9em;">
        Edit, reorder, delete, or AI-rewrite individual experience bullets per role.
        Changes are saved automatically and used during CV generation.
      </p>
  `;

  // Filter out experiences that user marked as excluded (persisted decisions)
  const expDecisions = (window._savedDecisions && window._savedDecisions.experience_decisions) || userSelections.experiences || {};
  experiences.forEach((exp, expIdx) => {
    const expId = exp.id || exp.experience_id || `exp::${expIdx}`;
    const decision = expDecisions[expId];
    if (decision === 'exclude') return; // omit excluded experiences from editor
    const title    = escapeHtml(exp.title || exp.position || `Experience ${expIdx + 1}`);
    const company  = escapeHtml(exp.company || exp.organization || '');
    const achCount = window.achievementEdits[expIdx].length;

    html += `
      <details open style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <summary style="padding:12px 16px;background:#f9fafb;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:8px;">
          <span style="flex:1;">${title}${company ? ` <span style="font-weight:400;color:#6b7280;">@ ${company}</span>` : ''}</span>
          <span style="font-size:0.8em;color:#9ca3af;">${achCount} bullet${achCount !== 1 ? 's' : ''}</span>
        </summary>
        <div style="padding:12px 16px;" id="ach-editor-exp-${expIdx}">
          <div id="ach-list-${expIdx}"></div>
          <button class="btn-secondary" style="margin-top:8px;font-size:0.85em;"
            onclick="addAchievementRow(${expIdx})">+ Add Bullet</button>
        </div>
      </details>
    `;
  });

  html += `
    <div style="margin-top:20px;display:flex;gap:12px;align-items:center;">
      <button class="back-btn" onclick="switchTab('exp-review')">← Back to Experiences</button>
      <button class="continue-btn" onclick="saveAchievementEditsAndContinue()">Save &amp; Continue to Skills →</button>
    </div>
    </div>
  `;

  container.innerHTML = html;

  // Render achievement rows for each experience
  experiences.forEach((_, expIdx) => renderAchievementEditorRows(expIdx));
}

/**
 * Render the editable achievement rows for one experience.
 */
function renderAchievementEditorRows(expIdx) {
  const listEl = document.getElementById(`ach-list-${expIdx}`);
  if (!listEl) return;
  const achs = _normalizeAchievementEditList(window.achievementEdits[expIdx] || []);
  window.achievementEdits[expIdx] = achs;

  if (achs.length === 0) {
    listEl.innerHTML = '<p style="color:#9ca3af;font-size:0.85em;padding:4px 0;">No experience bullets yet.</p>';
    return;
  }

  listEl.innerHTML = achs.map((entry, achIdx) => {
    const text = _achievementEntryText(entry);
    const hidden = _achievementEntryHidden(entry);
    return `
    <div id="ach-row-${expIdx}-${achIdx}" class="${hidden ? 'achievement-row-hidden' : ''}" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <div style="display:flex;flex-direction:column;gap:2px;padding-top:4px;">
        <button class="icon-btn" title="Move up"   onclick="moveAchievement(${expIdx},${achIdx},-1)">▲</button>
        <button class="icon-btn" title="Move down" onclick="moveAchievement(${expIdx},${achIdx},+1)">▼</button>
      </div>
      <textarea id="ach-text-${expIdx}-${achIdx}"
        rows="2"
        style="flex:1;padding:6px 8px;border:1px solid ${hidden ? '#f59e0b' : '#d1d5db'};border-radius:6px;font-size:0.9em;resize:vertical;${hidden ? 'background:#fffbeb;color:#92400e;' : ''}"
        onchange="updateAchievementText(${expIdx},${achIdx},this.value)"
        onblur="updateAchievementText(${expIdx},${achIdx},this.value)"
      >${escapeHtml(text)}</textarea>
      <div style="display:flex;flex-direction:column;gap:4px;padding-top:2px;">
        <button class="icon-btn ${hidden ? 'active' : ''}" title="${hidden ? 'Show bullet in generated CV' : 'Hide bullet from generated CV'}"
          onclick="toggleAchievementHidden(${expIdx},${achIdx})"
          style="color:${hidden ? '#b45309' : '#64748b'};">${eyeSlashIcon()}</button>
        <button class="icon-btn" title="Ask AI to rewrite"
          onclick="rewriteAchievementWithLLM(${expIdx},${achIdx})"
          >✨</button>
        <button class="icon-btn" title="Delete"
          onclick="deleteAchievement(${expIdx},${achIdx})"
          style="color:#ef4444;">🗑</button>
      </div>
    </div>
  `;
  }).join('');
}

function updateAchievementText(expIdx, achIdx, value) {
  if (!window.achievementEdits[expIdx]) return;
  const existing = _normalizeAchievementEditEntry(window.achievementEdits[expIdx][achIdx]);
  existing.text = value;
  window.achievementEdits[expIdx][achIdx] = existing;
}

function toggleAchievementHidden(expIdx, achIdx) {
  if (!window.achievementEdits[expIdx]) return;
  const existing = _normalizeAchievementEditEntry(window.achievementEdits[expIdx][achIdx]);
  existing.hidden = !existing.hidden;
  window.achievementEdits[expIdx][achIdx] = existing;
  renderAchievementEditorRows(expIdx);
}

function moveAchievement(expIdx, achIdx, dir) {
  const achs = window.achievementEdits[expIdx];
  if (!achs) return;
  const newIdx = achIdx + dir;
  if (newIdx < 0 || newIdx >= achs.length) return;
  // Flush current textarea value before moving
  const ta = document.getElementById(`ach-text-${expIdx}-${achIdx}`);
  if (ta) updateAchievementText(expIdx, achIdx, ta.value);
  [achs[achIdx], achs[newIdx]] = [achs[newIdx], achs[achIdx]];
  renderAchievementEditorRows(expIdx);
}

async function deleteAchievement(expIdx, achIdx) {
  const achs = window.achievementEdits[expIdx];
  if (!achs) return;
  const confirmed = await confirmDialog(
    'Delete this bullet from this session? Hidden bullets remain available for later harvest, but delete removes the edited row entirely.',
    { confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true },
  );
  if (!confirmed) return;
  achs.splice(achIdx, 1);
  renderAchievementEditorRows(expIdx);
}

function addAchievementRow(expIdx) {
  if (!window.achievementEdits[expIdx]) window.achievementEdits[expIdx] = [];
  window.achievementEdits[expIdx].push({ text: '', hidden: false });
  renderAchievementEditorRows(expIdx);
  // Focus the new textarea
  const newIdx = window.achievementEdits[expIdx].length - 1;
  const ta = document.getElementById(`ach-text-${expIdx}-${newIdx}`);
  if (ta) ta.focus();
}

async function rewriteAchievementWithLLM(expIdx, achIdx) {
  const ta = document.getElementById(`ach-text-${expIdx}-${achIdx}`);
  if (!ta) return;
  const originalText = ta.value.trim();
  if (!originalText) { showToast('Please enter a bullet first.', 'error'); return; }

  _rewriteSuggestionHistory = [];
  _lastRewriteLogId = null;
  _openRewriteModal(originalText, '', null, {
    experienceIndex: expIdx,
    achievementIndex: achIdx,
    onAccept: async (suggestion) => {
      updateAchievementText(expIdx, achIdx, suggestion);
      if (ta) ta.value = suggestion;
      _recordRewriteOutcome('accepted', suggestion);
      showToast('Bullet updated.');
    },
  });
  await _runRewrite(originalText);
}

async function aiRewriteTopLevelAchievement(achId) {
  const ach = (window._achievementsOrdered || []).find(a => a.id === achId);
  if (!ach) return;
  const originalText = ach.description || '';
  if (!originalText) { showToast('Please enter a description first.', 'error'); return; }

  _rewriteSuggestionHistory = [];
  _lastRewriteLogId = null;
  _openRewriteModal(originalText, '', null, {
    experienceIndex: null,
    onAccept: async (suggestion) => {
      await saveTopLevelAchievementField(achId, 'description', suggestion);
      const descEl = document.getElementById(`ach-desc-${CSS.escape(achId)}`);
      if (descEl) descEl.value = suggestion;
      _recordRewriteOutcome('accepted', suggestion);
      showToast('Achievement updated.');
    },
  });
  await _runRewrite(originalText);
}

function _openRewriteModal(originalText, currentInstructions, currentSuggestion, callbacks) {
  _rewriteCallbacks = callbacks;

  const suggestedHtml = currentSuggestion != null
    ? `<p id="ach-rewrite-suggestion" style="margin:4px 0 0;min-height:2.4em;">${escapeHtml(currentSuggestion)}</p>`
    : `<p id="ach-rewrite-suggestion" style="margin:4px 0 0;min-height:2.4em;color:#9ca3af;font-style:italic;">⏳ Generating…</p>`;

  document.getElementById('alert-modal-title').textContent = '✨ AI Rewrite';
  document.getElementById('alert-modal-message').innerHTML = `
    <div style="margin-bottom:10px;">
      <strong>Original:</strong>
      <p style="color:#6b7280;margin:4px 0 0;font-style:italic;font-size:0.92em;">${escapeHtml(originalText)}</p>
    </div>
    <div style="margin-bottom:12px;">
      <strong>Suggested:</strong>
      ${suggestedHtml}
    </div>
    <div style="margin-bottom:16px;">
      <label for="ach-rewrite-instructions" style="font-weight:600;font-size:0.92em;display:block;margin-bottom:4px;">Instructions <span style="font-weight:400;color:#6b7280;">(optional)</span></label>
      <textarea id="ach-rewrite-instructions"
        rows="2"
        placeholder="e.g. make it more concise, emphasise leadership, add a metric"
        style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9em;resize:vertical;"
      >${escapeHtml(currentInstructions)}</textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn-secondary" id="ach-rewrite-reject-btn" onclick="_recordRewriteOutcome('rejected'); closeAlertModal()">Reject</button>
      <button class="btn-secondary" id="ach-rewrite-generate-btn">Generate</button>
      <button class="continue-btn"  id="ach-rewrite-accept-btn">Accept</button>
    </div>`;

  document.getElementById('alert-modal-overlay').style.display = 'block';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('alert-modal-overlay');
  trapFocus('alert-modal-overlay');

  document.getElementById('ach-rewrite-generate-btn').onclick = () => _runRewrite(originalText);

  _updateRewriteAcceptBtn(currentSuggestion);
}

function _updateRewriteAcceptBtn(suggestion) {
  const acceptBtn = document.getElementById('ach-rewrite-accept-btn');
  if (!acceptBtn) return;
  acceptBtn.disabled = suggestion == null;
  acceptBtn.onclick = suggestion == null ? null : async () => {
    await _rewriteCallbacks.onAccept(suggestion);
    closeAlertModal();
  };
}

async function _recordRewriteOutcome(outcome, acceptedText) {
  if (!_lastRewriteLogId) return;
  const logId = _lastRewriteLogId;
  _lastRewriteLogId = null;
  const body = { log_id: logId, outcome };
  if (acceptedText != null) body.accepted_text = acceptedText;
  try {
    await fetch('/api/rewrite-achievement-outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (_) { /* fire-and-forget — don't disrupt the UI */ }
}

async function _runRewrite(originalText) {
  const instructionsEl = document.getElementById('ach-rewrite-instructions');
  const userInstructions = instructionsEl ? instructionsEl.value.trim() : '';

  const generateBtn  = document.getElementById('ach-rewrite-generate-btn');
  const acceptBtn    = document.getElementById('ach-rewrite-accept-btn');
  const rejectBtn    = document.getElementById('ach-rewrite-reject-btn');
  const suggestionEl = document.getElementById('ach-rewrite-suggestion');

  // Capture the current suggestion as a prior attempt before overwriting
  if (suggestionEl) {
    const prev = suggestionEl.textContent.trim();
    if (prev && prev !== 'Generating…' && !prev.startsWith('Error:') && !_rewriteSuggestionHistory.includes(prev)) {
      _rewriteSuggestionHistory.push(prev);
    }
  }

  if (generateBtn) { generateBtn.disabled = true; generateBtn.innerHTML = '<span class="btn-spinner"></span>Generating\u2026'; }
  if (acceptBtn)   { acceptBtn.disabled = true; }
  if (suggestionEl) { suggestionEl.style.color = '#9ca3af'; suggestionEl.style.fontStyle = 'italic'; suggestionEl.textContent = 'Generating…'; }

  try {
    const res = await fetch('/api/rewrite-achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievement_text:     originalText,
        experience_index:     _rewriteCallbacks?.experienceIndex ?? null,
        achievement_index:    _rewriteCallbacks?.achievementIndex ?? null,
        user_instructions:    userInstructions,
        previous_suggestions: _rewriteSuggestionHistory,
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Rewrite failed');

    const rewritten = data.rewritten || '';
    _lastRewriteLogId = data.log_id || null;
    if (suggestionEl) {
      suggestionEl.style.color = '';
      suggestionEl.style.fontStyle = '';
      suggestionEl.textContent = rewritten;
    }
    _updateRewriteAcceptBtn(rewritten);
  } catch (err) {
    if (suggestionEl) { suggestionEl.style.color = '#ef4444'; suggestionEl.style.fontStyle = ''; suggestionEl.textContent = `Error: ${err.message}`; }
    showToast(`AI rewrite failed: ${err.message}`, 'error');
  } finally {
    if (generateBtn) { generateBtn.disabled = false; generateBtn.textContent = 'Generate'; }
    if (rejectBtn)   { rejectBtn.disabled = false; }
  }
}

/**
 * Save a single field of a top-level achievement in session state and update the local cache.
 */
async function saveTopLevelAchievementField(achId, field, value) {
  const ach = (window._achievementsOrdered || []).find(a => a.id === achId);
  const previous = ach ? ach[field] : undefined;
  if (ach) ach[field] = value;
  try {
    const res = await fetch('/api/review-achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: achId, field, value }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
  } catch (err) {
    // Roll back the optimistic update
    if (ach && previous !== undefined) ach[field] = previous;
    const el = document.getElementById(field === 'title' ? `ach-title-${CSS.escape(achId)}` : `ach-desc-${CSS.escape(achId)}`);
    if (el) el.value = previous ?? '';
    showToast(`Failed to save achievement: ${err.message}`, 'error');
  }
}

/**
 * Hide a top-level achievement for this session after confirmation.
 */
async function deleteTopLevelAchievement(achId) {
  const confirmed = await confirmDialog(
    'Hide this achievement for this CV only? You can restore it by starting over or changing the session selections.',
    { confirmLabel: 'Hide', cancelLabel: 'Cancel', danger: true },
  );
  if (!confirmed) return;
  try {
    const res = await fetch('/api/review-achievement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: achId, action: 'delete' }),
    });
    const data = await res.json();
    if (data.ok) {
      window._achievementsOrdered = (window._achievementsOrdered || []).filter(a => a.id !== achId);
      delete window.achievementDecisions[achId];
      _renderAchievementsReviewTable();
      showToast('Achievement hidden for this session.');
    } else {
      showToast(data.error || 'Delete failed.', 'error');
    }
  } catch (_) {
    showToast('Failed to delete achievement.', 'error');
  }
}

/**
 * Save an edited field on an AI-suggested achievement (in-memory only;
 * suggestions are not persisted to the server until accepted).
 */
function saveSuggestedAchievementField(suggId, field, value) {
  const sugg = (window._suggestedAchsOrdered || []).find(s => s._suggId === suggId);
  if (sugg) sugg[field] = value;
}

/**
 * Open the AI rewrite modal for a suggested achievement description.
 */
async function aiRewriteSuggestedAchievement(suggId) {
  const sugg = (window._suggestedAchsOrdered || []).find(s => s._suggId === suggId);
  if (!sugg) return;
  const originalText = sugg.description || '';
  if (!originalText) { showToast('Please enter a description first.', 'error'); return; }

  _rewriteSuggestionHistory = [];
  _lastRewriteLogId = null;
  _openRewriteModal(originalText, '', null, {
    experienceIndex: null,
    onAccept: async (suggestion) => {
      saveSuggestedAchievementField(suggId, 'description', suggestion);
      const descEl = document.getElementById(`ach-desc-${suggId}`);
      if (descEl) descEl.value = suggestion;
      _recordRewriteOutcome('accepted', suggestion);
      showToast('Achievement updated.');
    },
  });
  await _runRewrite(originalText);
}

/**
 * Move a suggested achievement up or down within the display order.
 * Stable IDs mean no decision remapping is needed.
 */
function moveSuggestedAchievementRow(suggId, direction) {
  const arr = window._suggestedAchsOrdered;
  if (!arr) return;
  const idx = arr.findIndex(s => s._suggId === suggId);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  _renderAchievementsReviewTable(document.getElementById('achievements-table-container'));
}

/**
 * Remove a suggested achievement from the list after confirmation.
 * Stable IDs mean no other decision keys need remapping.
 */
async function deleteSuggestedAchievement(suggId) {
  const confirmed = await confirmDialog('Remove this AI suggestion?', { confirmLabel: 'Remove', danger: true });
  if (!confirmed) return;
  window._suggestedAchsOrdered = (window._suggestedAchsOrdered || []).filter(s => s._suggId !== suggId);
  delete window.achievementDecisions[suggId];
  _renderAchievementsReviewTable(document.getElementById('achievements-table-container'));
}

async function saveAchievementEditsAndContinue() {
  try {
    // Flush any currently-focused textareas
    document.querySelectorAll('[id^="ach-text-"]').forEach(ta => {
      const parts = ta.id.split('-');
      if (parts.length >= 4) {
        const expIdx = parseInt(parts[2]);
        const achIdx = parseInt(parts[3]);
        if (!isNaN(expIdx) && !isNaN(achIdx) && window.achievementEdits[expIdx]) {
          updateAchievementText(expIdx, achIdx, ta.value);
        }
      }
    });

    const res = await fetch('/api/save-achievement-edits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edits: window.achievementEdits })
    });
    if (!res.ok) {
      const err = await res.json();
      showToast(`Error saving: ${err.error || 'Unknown error'}`, 'error');
      return;
    }
    stateManager.markContentChanged();
    showToast('Achievement edits saved.');
    switchTab('skills-review');
  } catch (e) {
    showToast('Failed to save achievement edits.', 'error');
  }
}

export {
  fetchJsonWithTimeout,
  buildAchievementsReviewTable,
  _renderAchievementsReviewTable,
  bulkAchievementAction,
  handleAchievementAction,
  submitAchievementDecisions,
  moveAchievementRow,
  buildAchievementsEditor,
  renderAchievementEditorRows,
  updateAchievementText,
  toggleAchievementHidden,
  moveAchievement,
  deleteAchievement,
  addAchievementRow,
  rewriteAchievementWithLLM,
  aiRewriteTopLevelAchievement,
  _openRewriteModal,
  _updateRewriteAcceptBtn,
  _recordRewriteOutcome,
  _runRewrite,
  saveTopLevelAchievementField,
  deleteTopLevelAchievement,
  saveSuggestedAchievementField,
  aiRewriteSuggestedAchievement,
  moveSuggestedAchievementRow,
  deleteSuggestedAchievement,
  saveAchievementEditsAndContinue,
};
