// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/session-switcher-ui.js
 * Session management modal, trash view, ownership conflict dialog,
 * and session-conflict retry banner.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, parseSessionListResponse, formatSessionPhaseLabel,
 *   formatSessionTimestamp, buildSessionSwitcherLabel,
 *   getActiveSessionOwnershipMeta, _getCurrentSessionIdValue,
 *   loadSessionFile, createNewSessionAndNavigate, fetchStatus,
 *   setInitialFocus, trapFocus, restoreFocus, confirmDialog
 */

// ── Module-level state ────────────────────────────────────────────────────────

const _conflictRetryQueue = [];
let _conflictTimerId  = null;
let _conflictCountdown = 0;

// ── Sort state & session cache ────────────────────────────────────────────────
const _SM_STORAGE_KEY = 'cv_sm_sort_key';
const _SM_STORAGE_DIR = 'cv_sm_sort_dir';

let _smSortKey = (() => { try { return localStorage.getItem(_SM_STORAGE_KEY) || 'lastModified'; } catch (_) { return 'lastModified'; } })();
let _smSortDir = (() => { try { return localStorage.getItem(_SM_STORAGE_DIR) || 'desc';         } catch (_) { return 'desc';         } })();

let _smActiveCache = [];
let _smSavedCache  = [];

// ── Render helpers ────────────────────────────────────────────────────────────

function _renderActiveSessionRows(activeSessions) {
  if (!activeSessions.length) {
    return '<p class="session-switcher-empty">No active in-memory sessions.</p>';
  }

  const currentSessionId = _getCurrentSessionIdValue();

  return `<div class="session-switcher-list">${activeSessions.map(session => {
    const ownership = getActiveSessionOwnershipMeta(session, { currentSessionId });
    const openHref = `/?session=${encodeURIComponent(session.session_id || '')}`;
    const actionHtml = ownership.isCurrent
      ? '<span class="session-switcher-btn" aria-disabled="true">Current</span>'
      : `<a class="session-switcher-link" href="${openHref}">Open</a>`;
    return `
      <div class="session-switcher-row">
        <div class="session-switcher-row-main">
          <div class="session-switcher-row-title">
            <strong>${escapeHtml(session.position_name || 'Untitled')}</strong>
            <span class="session-status-pill ${ownership.className}"><span class="session-status-dot"></span>${escapeHtml(ownership.label)}</span>
          </div>
          <div class="session-switcher-row-meta">
            ${escapeHtml(formatSessionPhaseLabel(session.phase))} · Created ${escapeHtml(formatSessionTimestamp(session.created))} · Last modified ${escapeHtml(formatSessionTimestamp(session.last_modified))}
          </div>
        </div>
        <div class="session-switcher-actions">${actionHtml}</div>
      </div>`;
  }).join('')}</div>`;
}

function _renderSavedSessionRows(savedSessions, { includeManagement = false } = {}) {
  if (!savedSessions.length) {
    return '<p class="session-switcher-empty">No saved sessions found.</p>';
  }

  function _createdIsoFromSessionPath(sessionPath) {
    if (!sessionPath) return '';
    const pathText = String(sessionPath);
    const parts = pathText.split(/[\\/]/).filter(Boolean);
    if (parts.length < 2) return '';

    const dirName = parts[parts.length - 2];
    const match = dirName.match(/(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
    if (!match) return '';

    const [, year, month, day, hour, minute, second] = match;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  return `<div class="session-switcher-list">${savedSessions.map((session, index) => {
    const escapedPath = escapeHtml(session.path || '');
    const createdIso = _createdIsoFromSessionPath(session.path);
    const createdLabel = createdIso ? formatSessionTimestamp(createdIso) : '—';
    const savedLabel = formatSessionTimestamp(session.timestamp);
    const savedMeta = savedLabel === '—' ? '' : ` · Saved ${escapeHtml(savedLabel)}`;
    const managementHtml = includeManagement
      ? `
        <button data-sm-action="rename" data-sm-path="${escapedPath}" data-sm-idx="${index}" class="session-switcher-btn" title="Rename session">Rename</button>
        <button data-sm-action="delete" data-sm-path="${escapedPath}" class="session-switcher-btn danger" title="Move session to Trash">Move to Trash</button>`
      : '';

    return `
      <div class="session-switcher-row">
        <div class="session-switcher-row-main">
          <div class="session-switcher-row-title">
            <strong id="sm-name-${index}">${escapeHtml(session.position_name || 'Untitled')}</strong>
            <span class="session-status-pill session-status-saved"><span class="session-status-dot"></span>Saved</span>
          </div>
          <div id="sm-rename-${index}" style="display:none;align-items:center;gap:6px;margin:8px 0 4px;">
            <input id="sm-input-${index}" type="text" value="${escapeHtml(session.position_name || '')}" class="sm-key-input" data-sm-path="${escapedPath}" data-sm-idx="${index}" style="border:1px solid #3b82f6;border-radius:6px;padding:6px 10px;font-size:13px;flex:1;min-width:0;">
            <button data-sm-action="submit-rename" data-sm-path="${escapedPath}" data-sm-idx="${index}" class="session-switcher-btn">Save</button>
            <button data-sm-action="cancel-rename" data-sm-idx="${index}" class="session-switcher-btn">Cancel</button>
          </div>
          <div class="session-switcher-row-meta">
            ${escapeHtml(formatSessionPhaseLabel(session.phase))} · Created ${escapeHtml(createdLabel)}${savedMeta}
          </div>
        </div>
        <div class="session-switcher-actions">
          <button data-sm-action="load" data-sm-path="${escapedPath}" class="session-switcher-link">Load</button>
          ${managementHtml}
        </div>
      </div>`;
  }).join('')}</div>`;
}

function _renderSessionSwitcherSections(activeSessions, savedSessions, { includeSavedManagement = false } = {}) {
  const savedSectionNote = includeSavedManagement
    ? 'Load from disk, rename, or move saved work to Trash.'
    : 'Load saved work from disk.';

  return `
    <div class="session-switcher-sections">
      <section class="session-switcher-section">
        <div class="session-switcher-section-header">
          <h3>Active Sessions</h3>
          <span class="session-switcher-section-note">In-memory sessions that can be opened directly.</span>
        </div>
        ${_renderActiveSessionRows(activeSessions)}
      </section>
      <section class="session-switcher-section">
        <div class="session-switcher-section-header">
          <h3>Saved Sessions</h3>
          <span class="session-switcher-section-note">${savedSectionNote}</span>
        </div>
        ${_renderSavedSessionRows(savedSessions, { includeManagement: includeSavedManagement })}
      </section>
    </div>`;
}

function _updateSessionSwitcherHeader(status = {}) {
  const label = buildSessionSwitcherLabel(status);
  const switcherLabelEl = document.getElementById('session-switcher-label');
  const switcherBtn = document.getElementById('session-switcher-btn');
  const subtitleEl = document.getElementById('header-session-name');
  const hasSession = Boolean(_getCurrentSessionIdValue());

  if (switcherLabelEl) switcherLabelEl.textContent = label;
  if (switcherBtn) switcherBtn.classList.toggle('is-session-active', hasSession);
  if (subtitleEl) {
    subtitleEl.textContent = hasSession ? `Current session: ${label}` : 'Select or create a session';
  }
}

// ── Ownership conflict dialog ─────────────────────────────────────────────────

function showOwnershipConflictDialog(message = 'This session is currently claimed by another browser tab.') {
  return new Promise(resolve => {
    const overlay = document.getElementById('ownership-conflict-overlay');
    const messageEl = document.getElementById('ownership-conflict-message');
    const loadDifferentBtn = document.getElementById('ownership-load-different-btn');
    const newSessionBtn = document.getElementById('ownership-new-session-btn');
    const takeoverBtn = document.getElementById('ownership-takeover-btn');
    if (!overlay || !messageEl || !loadDifferentBtn || !newSessionBtn || !takeoverBtn) {
      resolve('different');
      return;
    }

    const cleanup = (choice) => {
      overlay.style.display = 'none';
      restoreFocus();
      loadDifferentBtn.onclick = null;
      newSessionBtn.onclick = null;
      takeoverBtn.onclick = null;
      resolve(choice);
    };

    messageEl.textContent = message;
    overlay.style.display = 'flex';
    window._focusedElementBeforeModal = document.activeElement;
    setInitialFocus('ownership-conflict-overlay');
    trapFocus('ownership-conflict-overlay');

    loadDifferentBtn.onclick = () => cleanup('different');
    newSessionBtn.onclick = () => cleanup('new');
    takeoverBtn.onclick = () => cleanup('takeover');
  });
}

function closeOwnershipConflictDialog(choice = 'different') {
  const overlay = document.getElementById('ownership-conflict-overlay');
  if (overlay) overlay.style.display = 'none';
  restoreFocus();
  const loadDifferentBtn = document.getElementById('ownership-load-different-btn');
  if (loadDifferentBtn && typeof loadDifferentBtn.onclick === 'function') {
    loadDifferentBtn.onclick();
    return;
  }
  return choice;
}

// ── Session file-browser table helpers ───────────────────────────────────────

function _setSmSort(key) {
  if (_smSortKey === key) {
    _smSortDir = _smSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _smSortKey = key;
    _smSortDir = key === 'lastModified' ? 'desc' : 'asc';
  }
  try {
    localStorage.setItem(_SM_STORAGE_KEY, _smSortKey);
    localStorage.setItem(_SM_STORAGE_DIR, _smSortDir);
  } catch (_) { /* storage unavailable */ }
  _renderSessionTableFromCache();
}

function _createdIsoFromSessionPath(sessionPath) {
  if (!sessionPath) return '';
  const pathText = String(sessionPath);
  const parts    = pathText.split(/[\\/]/).filter(Boolean);
  if (parts.length < 2) return '';
  const dirName  = parts[parts.length - 2];
  const match    = dirName.match(/(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
  if (!match) return '';
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

function _normalizeSessionsForTable(activeSessions, savedSessions) {
  const currentSessionId = _getCurrentSessionIdValue();
  const rows = [];

  for (const s of activeSessions) {
    const ownership = getActiveSessionOwnershipMeta(s, { currentSessionId });
    rows.push({
      type:         'active',
      name:          s.position_name || 'Untitled',
      phase:         s.phase         || '',
      lastModified:  s.last_modified  ? new Date(s.last_modified) : null,
      created:       s.created        ? new Date(s.created)       : null,
      ownership,
      sessionId:     s.session_id,
      path:          null,
      idx:           null,
    });
  }

  savedSessions.forEach((s, idx) => {
    const createdIso = _createdIsoFromSessionPath(s.path);
    rows.push({
      type:         'saved',
      name:          s.position_name || 'Untitled',
      phase:         s.phase         || '',
      lastModified:  s.timestamp  ? new Date(s.timestamp)  : null,
      created:       createdIso   ? new Date(createdIso)   : null,
      ownership:     null,
      sessionId:     null,
      path:          s.path,
      idx,
    });
  });

  return rows;
}

function _sortSessionRows(rows, key, dir) {
  return [...rows].sort((a, b) => {
    let av, bv;
    switch (key) {
      case 'name':
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      case 'status': {
        const rank = r => r.type === 'active' ? (r.ownership?.isCurrent ? 0 : 1) : 2;
        av = rank(a); bv = rank(b);
        return dir === 'asc' ? av - bv : bv - av;
      }
      case 'phase':
        av = (a.phase || '').toLowerCase();
        bv = (b.phase || '').toLowerCase();
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      case 'lastModified':
      default:
        av = a.lastModified ? a.lastModified.getTime() : 0;
        bv = b.lastModified ? b.lastModified.getTime() : 0;
        return dir === 'asc' ? av - bv : bv - av;
    }
  });
}

function _renderSessionTableHeader() {
  const cols = [
    { key: 'name',         label: 'Name'     },
    { key: 'status',       label: 'Status'   },
    { key: 'phase',        label: 'Phase'    },
    { key: 'lastModified', label: 'Modified' },
  ];
  const cells = cols.map(({ key, label }) => {
    const active = _smSortKey === key;
    const icon   = active ? (_smSortDir === 'asc' ? '\u25b2' : '\u25bc') : '\u21c5';
    return `<span class="sm-th${active ? ' sm-th-sorted' : ''}" data-sm-sort="${key}" role="button" tabindex="0" title="Sort by ${label}">${escapeHtml(label)} <span class="sm-sort-icon${active ? ' sm-sort-active' : ''}">${icon}</span></span>`;
  });
  return `<div class="sm-thead">${cells.join('')}<span class="sm-th sm-th-actions">Actions</span></div>`;
}

function _fmtDateCompact(d) {
  if (!d) return '\u2014';
  try {
    return d.toLocaleString('en-US', {
      month: 'numeric', day: 'numeric', year: '2-digit',
      hour: 'numeric', minute: '2-digit',
    });
  } catch (_) { return '\u2014'; }
}

function _renderSessionTableRow(row) {
  const phaseLabel = escapeHtml(formatSessionPhaseLabel(row.phase));
  const modLabel   = escapeHtml(_fmtDateCompact(row.lastModified));

  const statusPill = row.type === 'active'
    ? `<span class="session-status-pill ${row.ownership.className}"><span class="session-status-dot"></span>${escapeHtml(row.ownership.label)}</span>`
    : `<span class="session-status-pill session-status-saved"><span class="session-status-dot"></span>Saved</span>`;

  let actionHtml;
  if (row.type === 'active') {
    const href = `/?session=${encodeURIComponent(row.sessionId || '')}`;
    actionHtml = row.ownership.isCurrent
      ? '<span class="sm-btn sm-btn-disabled" aria-disabled="true">Current</span>'
      : `<a class="sm-btn sm-btn-open" href="${href}">Open</a>`;
  } else {
    const ep  = escapeHtml(row.path || '');
    const idx = row.idx;
    actionHtml =
      `<button data-sm-action="load"   data-sm-path="${ep}" class="sm-btn sm-btn-open sm-btn-icon" title="Load session"><i class="fa-solid fa-folder-open" aria-hidden="true"></i></button>` +
      `<button data-sm-action="rename" data-sm-path="${ep}" data-sm-idx="${idx}" class="sm-btn sm-btn-icon" title="Rename session"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button>` +
      `<button data-sm-action="delete" data-sm-path="${ep}" class="sm-btn sm-btn-danger sm-btn-icon" title="Move to Trash"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>`;
  }

  const rowClass = (row.type === 'active' && row.ownership.isCurrent) ? 'sm-tr sm-tr-current' : 'sm-tr';

  const nameCell = row.type === 'saved'
    ? `<span id="sm-name-${row.idx}">${escapeHtml(row.name)}</span>` +
      `<span id="sm-rename-${row.idx}" style="display:none;align-items:center;gap:4px;margin-top:3px;">` +
        `<input id="sm-input-${row.idx}" type="text" value="${escapeHtml(row.name)}" class="sm-key-input"` +
          ` data-sm-path="${escapeHtml(row.path || '')}" data-sm-idx="${row.idx}"` +
          ` style="border:1px solid #3b82f6;border-radius:4px;padding:3px 8px;font-size:12px;flex:1;min-width:60px;">` +
        `<button data-sm-action="submit-rename" data-sm-path="${escapeHtml(row.path || '')}" data-sm-idx="${row.idx}" class="sm-btn" title="Save">\u2713</button>` +
        `<button data-sm-action="cancel-rename" data-sm-idx="${row.idx}" class="sm-btn" title="Cancel">\u2715</button>` +
      `</span>`
    : `<span>${escapeHtml(row.name)}</span>`;

  return `<div class="${rowClass}">` +
    `<span class="sm-td sm-td-name">${nameCell}</span>` +
    `<span class="sm-td sm-td-status">${statusPill}</span>` +
    `<span class="sm-td sm-td-phase">${phaseLabel}</span>` +
    `<span class="sm-td sm-td-date">${modLabel}</span>` +
    `<span class="sm-td sm-td-actions">${actionHtml}</span>` +
    `</div>`;
}

function _renderRecentsStrip(recentRows) {
  if (!recentRows.length) return '';
  const items = recentRows.map(row => {
    const label    = escapeHtml(row.name);
    const dotClass = row.type === 'active'
      ? (row.ownership.isCurrent ? 'sm-recent-dot-current' : 'sm-recent-dot-other')
      : 'sm-recent-dot-saved';
    const dot = `<span class="sm-recent-dot ${dotClass}"></span>`;
    if (row.type === 'active') {
      const href  = `/?session=${encodeURIComponent(row.sessionId || '')}`;
      const extra = row.ownership.isCurrent ? ' sm-recent-current' : '';
      return `<a class="sm-recent-item${extra}" href="${href}">${dot}${label}</a>`;
    }
    return `<button class="sm-recent-item" data-sm-action="load" data-sm-path="${escapeHtml(row.path || '')}">${dot}${label}</button>`;
  }).join('');
  return `<div class="sm-recents"><div class="sm-recents-label">Recent</div><div class="sm-recents-list">${items}</div></div>`;
}

function _renderSessionTableFromCache() {
  const body = document.getElementById('sessions-modal-body');
  if (!body) return;

  const rows   = _normalizeSessionsForTable(_smActiveCache, _smSavedCache);
  const byDate = _sortSessionRows(rows, 'lastModified', 'desc');
  const sorted = _sortSessionRows(rows, _smSortKey, _smSortDir);

  if (sorted.length === 0) {
    body.innerHTML = '<p class="session-switcher-empty" style="padding:24px 16px;">No sessions found. Create one to get started.</p>';
    return;
  }

  const parts = [
    _smActiveCache.length ? `${_smActiveCache.length} active` : '',
    _smSavedCache.length  ? `${_smSavedCache.length} saved`   : '',
  ].filter(Boolean);

  body.innerHTML =
    _renderRecentsStrip(byDate.slice(0, 5)) +
    `<div class="sm-table-wrap">` +
      `<div class="sm-table-info">${parts.join(' \u00b7 ')}</div>` +
      _renderSessionTableHeader() +
      `<div class="sm-tbody">${sorted.map(_renderSessionTableRow).join('')}</div>` +
    `</div>`;
}

function _handleSessionModalClick(e) {
  const sortBtn = e.target.closest('[data-sm-sort]');
  if (sortBtn) { _setSmSort(sortBtn.dataset.smSort); return; }

  const btn = e.target.closest('[data-sm-action]');
  if (!btn) return;
  const path   = btn.dataset.smPath;
  const idx    = parseInt(btn.dataset.smIdx ?? '-1', 10);
  const action = btn.dataset.smAction;
  if      (action === 'rename')        startSessionModalRename(path, idx);
  else if (action === 'submit-rename') submitSessionModalRename(path, idx);
  else if (action === 'cancel-rename') cancelSessionModalRename(idx);
  else if (action === 'load')          loadSessionAndCloseModal(path);
  else if (action === 'delete')        _deleteSessionFromModal(path, e);
}

function _handleSessionModalKeydown(e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-sm-sort]')) {
    e.preventDefault();
    _setSmSort(e.target.closest('[data-sm-sort]').dataset.smSort);
    return;
  }
  const input = e.target.closest('.sm-key-input');
  if (!input) return;
  const path = input.dataset.smPath;
  const idx  = parseInt(input.dataset.smIdx, 10);
  if      (e.key === 'Enter')  submitSessionModalRename(path, idx);
  else if (e.key === 'Escape') cancelSessionModalRename(idx);
}

// ── Sessions modal ────────────────────────────────────────────────────────────

async function openSessionsModal({ required = false } = {}) {
  const overlay = document.getElementById('sessions-modal-overlay');
  if (!overlay) return;
  overlay.dataset.dismissDisabled = required ? '1' : '';
  const closeX      = document.getElementById('sessions-modal-close-x');
  const closeFooter = document.getElementById('sessions-modal-close-footer');
  if (closeX)      closeX.style.display      = required ? 'none' : '';
  if (closeFooter) closeFooter.style.display = required ? 'none' : '';
  overlay.style.display = 'flex';
  window._focusedElementBeforeModal = document.activeElement;
  await _renderSessionsModalBody();
  _refreshTrashBadge();
  trapFocus('sessions-modal-overlay');
  setInitialFocus('sessions-modal-overlay');
}

function closeSessionsModal() {
  const overlay = document.getElementById('sessions-modal-overlay');
  if (!overlay) return;
  if (overlay.dataset.dismissDisabled === '1') return;
  overlay.style.display = 'none';
  restoreFocus();
}

async function _renderSessionsModalBody() {
  const body = document.getElementById('sessions-modal-body');
  if (!body) return;
  body.innerHTML = '<div style="padding:24px;display:flex;align-items:center;justify-content:center;gap:10px;color:#6b7280;"><span class="loading-spinner"></span> Loading sessions\u2026</div>';
  try {
    const [activeRes, savedRes] = await Promise.all([
      fetch('/api/sessions/active'),
      fetch('/api/sessions'),
    ]);
    _smActiveCache = activeRes.ok ? ((await activeRes.json()).sessions || []) : [];
    const savedData = savedRes.ok ? parseSessionListResponse(await savedRes.json()) : { sessions: [] };
    _smSavedCache   = savedData.sessions || [];
  } catch (e) {
    body.innerHTML = `<p style="padding:20px;color:#ef4444;">Could not load sessions: ${escapeHtml(e.message)}</p>`;
    return;
  }
  // Wire event delegation once; persists across re-renders since body element is stable
  if (!body._smListenerAttached) {
    body._smListenerAttached = true;
    body.addEventListener('click',   _handleSessionModalClick);
    body.addEventListener('keydown', _handleSessionModalKeydown);
  }
  _renderSessionTableFromCache();
}

async function loadSessionAndCloseModal(path) {
  // Clear dismissDisabled so loading a session always closes the modal,
  // even when it was opened in required (startup) mode.
  const overlay = document.getElementById('sessions-modal-overlay');
  if (overlay) overlay.dataset.dismissDisabled = '';
  closeSessionsModal();
  await loadSessionFile(path);
}

async function newSessionFromModal() {
  closeSessionsModal();
  await createNewSessionAndNavigate();
}

function startSessionModalRename(path, idx) {
  const nameEl = document.getElementById(`sm-name-${idx}`);
  const form   = document.getElementById(`sm-rename-${idx}`);
  if (nameEl) nameEl.style.display = 'none';
  if (form)   form.style.display   = 'flex';
  const input = document.getElementById(`sm-input-${idx}`);
  if (input) { input.focus(); input.select(); }
}

function cancelSessionModalRename(idx) {
  const nameEl = document.getElementById(`sm-name-${idx}`);
  const form   = document.getElementById(`sm-rename-${idx}`);
  if (form)   form.style.display   = 'none';
  if (nameEl) nameEl.style.display = '';
}

async function submitSessionModalRename(path, idx) {
  const input = document.getElementById(`sm-input-${idx}`);
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) return;
  try {
    const res  = await fetch('/api/rename-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, new_name: newName }),
    });
    const data = await res.json();
    if (data.ok) {
      const nameEl = document.getElementById(`sm-name-${idx}`);
      if (nameEl) nameEl.textContent = newName;
      cancelSessionModalRename(idx);
      await fetchStatus();
    } else {
      if (typeof showToast === 'function') showToast(`Rename failed: ${data.error}`, 'error');
    }
  } catch (e) { if (typeof showToast === 'function') showToast(`Rename error: ${e.message}`, 'error'); }
}

async function _deleteSessionFromModal(path, event) {
  event.stopPropagation();
  try {
    const res  = await fetch('/api/delete-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (data.success) {
      await _renderSessionsModalBody();
      await _refreshTrashBadge();
    } else {
      if (typeof showToast === 'function') showToast(`Failed to move session to Trash: ${data.error || 'Unknown error'}`, 'error');
    }
  } catch (e) { if (typeof showToast === 'function') showToast(`Error: ${e.message}`, 'error'); }
}

// ── Trash badge ───────────────────────────────────────────────────────────────

async function _refreshTrashBadge() {
  const btn = document.getElementById('sessions-trash-btn');
  if (!btn) return;
  try {
    const res  = await fetch('/api/trash');
    const data = await res.json();
    const n = (data.items || []).length;
    btn.textContent = n > 0 ? `🗑 Trash (${n})` : '🗑 Trash';
  } catch (_) { /* ignore */ }
}

// ── Trash view (inline in sessions modal) ────────────────────────────────────

async function openTrashView() {
  const body   = document.getElementById('sessions-modal-body');
  const footer = document.querySelector('#sessions-modal-overlay .modal-footer');
  if (!body) return;

  body.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:24px;color:#6b7280;"><div class="loading-spinner" style="width:20px;height:20px;border-width:2px;flex-shrink:0;"></div><span>Loading trash…</span></div>';

  if (footer) {
    footer.innerHTML = `
      <button class="action-btn" onclick="emptyTrash()"
        style="background:#fee2e2;color:#dc2626;border-color:#fecaca;">Empty Trash</button>
      <button class="action-btn" onclick="closeTrashView()">← Back</button>`;
  }

  await _renderTrashView();
}

function closeTrashView() {
  const footer = document.querySelector('#sessions-modal-overlay .modal-footer');
  if (footer) {
    footer.innerHTML = `
      <button class="action-btn" onclick="newSessionFromModal()"
        style="background:#10b981;color:#fff;border-color:#10b981;">＋ New Session</button>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="sessions-trash-btn" class="action-btn"
          onclick="openTrashView()"
          style="background:#f1f5f9;color:#64748b;border-color:#e2e8f0;">🗑 Trash</button>
        <button class="action-btn" onclick="closeSessionsModal()">Close</button>
      </div>`;
  }
  _renderSessionsModalBody();
  _refreshTrashBadge();
}

async function _renderTrashView() {
  const body = document.getElementById('sessions-modal-body');
  if (!body) return;
  let items = [];
  try {
    const res  = await fetch('/api/trash');
    const data = await res.json();
    items = data.items || [];
  } catch (e) {
    body.innerHTML = `<p style="padding:20px;color:#ef4444;">Could not load trash: ${escapeHtml(e.message)}</p>`;
    return;
  }
  if (items.length === 0) {
    body.innerHTML = '<p style="padding:24px;text-align:center;color:#6b7280;">Trash is empty.</p>';
    return;
  }

  function fmtDate(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ts.slice(0, 10); }
  }

  let html = '<table style="width:100%;border-collapse:collapse;">';
  items.forEach(s => {
    const ep = escapeHtml(s.path);
    html += `
      <tr style="border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <td style="padding:12px 16px;">
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(s.position_name || 'Untitled')}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${fmtDate(s.timestamp)}${s.phase ? ' · ' + escapeHtml(s.phase) : ''}</div>
        </td>
        <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">
          <div style="display:flex;gap:6px;">
            <button data-trash-action="restore" data-trash-path="${ep}"
              style="background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;">Restore</button>
            <button data-trash-action="delete-forever" data-trash-path="${ep}"
              style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;" title="Delete permanently">✕</button>
          </div>
        </td>
      </tr>`;
  });
  html += '</table>';
  const trashWrapper = document.createElement('div');
  trashWrapper.innerHTML = html;
  body.innerHTML = '';
  body.appendChild(trashWrapper);
  // Wire up trash action buttons via event delegation
  trashWrapper.addEventListener('click', e => {
    const btn = e.target.closest('[data-trash-action]');
    if (!btn) return;
    const path   = btn.dataset.trashPath;
    const action = btn.dataset.trashAction;
    if      (action === 'restore')        restoreFromTrash(path);
    else if (action === 'delete-forever') deleteForever(path);
  });
}

async function restoreFromTrash(path) {
  try {
    const res  = await fetch('/api/trash/restore', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (data.success) { await _renderTrashView(); await _refreshTrashBadge(); }
    else if (typeof showToast === 'function') showToast(`Restore failed: ${data.error || 'Unknown error'}`, 'error');
  } catch (e) { if (typeof showToast === 'function') showToast(`Error: ${e.message}`, 'error'); }
}

async function deleteForever(path) {
  const confirmed = await confirmDialog(
    'Permanently delete this session? This cannot be undone.',
    { confirmLabel: 'Delete Forever', cancelLabel: 'Cancel', danger: true }
  );
  if (!confirmed) return;
  try {
    const res  = await fetch('/api/trash/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (data.success) { await _renderTrashView(); await _refreshTrashBadge(); }
    else if (typeof showToast === 'function') showToast(`Delete failed: ${data.error || 'Unknown error'}`, 'error');
  } catch (e) { if (typeof showToast === 'function') showToast(`Error: ${e.message}`, 'error'); }
}

async function emptyTrash() {
  const confirmed = await confirmDialog(
    'Permanently delete all items in Trash? This cannot be undone.',
    { confirmLabel: 'Empty Trash', cancelLabel: 'Cancel', danger: true }
  );
  if (!confirmed) return;
  try {
    const res  = await fetch('/api/trash/empty', { method: 'POST' });
    const data = await res.json();
    if (data.success) { await _renderTrashView(); await _refreshTrashBadge(); }
    else if (typeof showToast === 'function') showToast(`Failed to empty trash: ${data.error || 'Unknown error'}`, 'error');
  } catch (e) { if (typeof showToast === 'function') showToast(`Error: ${e.message}`, 'error'); }
}

// ── Session conflict banner ───────────────────────────────────────────────────

function showSessionConflictBanner() {
  const banner      = document.getElementById('session-conflict-banner');
  const bannerText  = document.getElementById('conflict-banner-text');
  const countdownEl = document.getElementById('conflict-countdown');
  if (!banner) return;
  banner.style.display = 'block';
  if (_conflictTimerId) { clearInterval(_conflictTimerId); _conflictTimerId = null; }
  _conflictCountdown = 30;
  if (bannerText)   bannerText.textContent = '⚠ Another operation is in progress. Auto-retrying in ';
  if (countdownEl)  countdownEl.textContent = `${_conflictCountdown}s…`;
  _conflictTimerId = setInterval(() => {
    _conflictCountdown--;
    if (_conflictCountdown <= 0) {
      clearInterval(_conflictTimerId); _conflictTimerId = null;
      conflictRetryNow();
    } else {
      if (countdownEl) countdownEl.textContent = `${_conflictCountdown}s…`;
    }
  }, 1000);
}

function conflictRetryNow() {
  if (_conflictTimerId) { clearInterval(_conflictTimerId); _conflictTimerId = null; }
  const banner = document.getElementById('session-conflict-banner');
  if (banner) banner.style.display = 'none';
  while (_conflictRetryQueue.length) _conflictRetryQueue.shift()(true);
}

function conflictDismiss() {
  if (_conflictTimerId) { clearInterval(_conflictTimerId); _conflictTimerId = null; }
  const banner = document.getElementById('session-conflict-banner');
  if (banner) banner.style.display = 'none';
  while (_conflictRetryQueue.length) _conflictRetryQueue.shift()(false);
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  _conflictRetryQueue,
  _renderActiveSessionRows,
  _renderSavedSessionRows,
  _renderSessionSwitcherSections,
  _updateSessionSwitcherHeader,
  showOwnershipConflictDialog,
  closeOwnershipConflictDialog,
  openSessionsModal,
  closeSessionsModal,
  _renderSessionsModalBody,
  loadSessionAndCloseModal,
  newSessionFromModal,
  startSessionModalRename,
  cancelSessionModalRename,
  submitSessionModalRename,
  _deleteSessionFromModal,
  _refreshTrashBadge,
  openTrashView,
  closeTrashView,
  _renderTrashView,
  restoreFromTrash,
  deleteForever,
  emptyTrash,
  showSessionConflictBanner,
  conflictRetryNow,
  conflictDismiss,
};
