// State variables are declared in state-manager.js (loaded before this file)
window.postAnalysisQuestions = [];
window.questionAnswers = {};

// ---------------------------------------------------------------------------
// API response validators (DTO mirrors of Python dataclasses in web_app.py).
//
// Each function checks that required fields are present in an API response and
// logs a console.warn if any are missing or have an unexpected type.  Validators
// return the original data object unchanged so they can be used inline.
//
// Update both this file and the Python dataclasses in web_app.py together
// whenever adding or removing response fields.
// ---------------------------------------------------------------------------

/** Validate GET /api/status response. */
function parseStatusResponse(data) {
  const required = [
    'phase', 'llm_provider', 'job_description',
    'post_analysis_questions', 'post_analysis_answers',
    'all_experience_ids', 'all_skills', 'all_achievements',
    'professional_summaries', 'copilot_auth', 'iterating',
    'experience_decisions', 'skill_decisions',
    'achievement_decisions', 'publication_decisions',
    'extra_skills', 'session_file',
  ];
  const missing = required.filter(k => !(k in data));
  if (missing.length) {
    console.warn('[parseStatusResponse] Missing fields:', missing, data);
  }
  if ('post_analysis_questions' in data && !Array.isArray(data.post_analysis_questions)) {
    console.warn('[parseStatusResponse] post_analysis_questions should be an array:', data.post_analysis_questions);
  }
  if ('all_experience_ids' in data && !Array.isArray(data.all_experience_ids)) {
    console.warn('[parseStatusResponse] all_experience_ids should be an array:', data.all_experience_ids);
  }
  return data;
}

/** Validate GET /api/sessions response. */
function parseSessionListResponse(data) {
  if (!Array.isArray(data.sessions)) {
    console.warn('[parseSessionListResponse] sessions should be an array:', data);
  } else {
    const itemRequired = ['path', 'position_name', 'timestamp', 'phase', 'has_job', 'has_analysis', 'has_customizations'];
    data.sessions.forEach((s, i) => {
      const missing = itemRequired.filter(k => !(k in s));
      if (missing.length) console.warn(`[parseSessionListResponse] sessions[${i}] missing fields:`, missing, s);
    });
  }
  return data;
}

/** Validate GET /api/rewrites response. */
function parseRewritesResponse(data) {
  const required = ['ok', 'rewrites', 'persuasion_warnings', 'phase'];
  const missing = required.filter(k => !(k in data));
  if (missing.length) console.warn('[parseRewritesResponse] Missing fields:', missing, data);
  if ('rewrites' in data && !Array.isArray(data.rewrites)) {
    console.warn('[parseRewritesResponse] rewrites should be an array:', data.rewrites);
  }
  return data;
}

/** Validate POST /api/message and POST /api/action responses. */
function parseMessageResponse(data) {
  if (!data.ok && !data.error) {
    console.warn('[parseMessageResponse] Response has neither ok nor error:', data);
  }
  return data;
}

// Global fetch interceptor — shows amber banner on 409 Conflict; auto-retries after countdown.
const _conflictRetryQueue = [];
let   _conflictTimerId     = null;
let   _conflictCountdown   = 0;

(function() {
  const _origFetch = window.fetch;
  window.fetch = async function(...args) {
    const resp = await _origFetch.apply(this, args);
    if (resp.status === 409) {
      showSessionConflictBanner();
      const shouldRetry = await new Promise(resolve => _conflictRetryQueue.push(resolve));
      if (shouldRetry) return _origFetch.apply(this, args);
    }
    return resp;
  };
})();

async function restoreSession() {
  try {
    isReconnecting = true;
    
    // Try to get session ID from localStorage
    const storedSessionId = localStorage.getItem('cv-builder-session-id');
    if (storedSessionId) {
      sessionId = storedSessionId;
    } else {
      // Generate new session ID
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cv-builder-session-id', sessionId);
    }
    
    // Try to restore conversation history from backend
    const historyRes = await fetch('/api/history');
    if (historyRes.ok) {
      const historyData = await historyRes.json();
      
      // Always restore from the server session file (authoritative history source).
      if (historyData.history && historyData.history.length > 0) {
        const conversation = document.getElementById('conversation');
        conversation.innerHTML = ''; // Clear any loading messages
        
        historyData.history.forEach(msg => {
          if (msg.role === 'user') {
            appendMessage('user', msg.content);
          } else if (msg.role === 'assistant') {
            appendMessage('assistant', msg.content);
          }
        });
        
        appendMessage('system', '🔄 Session restored from server.');
        console.log(`Restored ${historyData.history.length} messages from backend`);
      }
      
      // Update phase
      if (historyData.phase) {
        lastKnownPhase = historyData.phase;
      }
    }
    
    // Try to restore backend state.
    // Returns true when server had live session data (in memory or loaded from disk).
    const serverHasData = await restoreBackendState();

    // Restore UI-only prefs (activeReviewPane) from localStorage.
    // When the server already has core data, skip restoring tabData/interactiveState/
    // pendingRecommendations from localStorage — server is authoritative for those.
    restoreTabData({ uiPrefsOnly: serverHasData });

    isReconnecting = false;
    
  } catch (error) {
    console.warn('Session restoration failed:', error);
    appendMessage('system', `⚠️ Could not restore previous session. Starting fresh. (${error.message})`);
    isReconnecting = false;
  }
}

async function restoreBackendState() {
  // Returns true if the server had any live session data (in memory or loaded from disk).
  // Callers use this to decide whether localStorage core fields should be skipped.
  try {
    const statusRes = await fetch('/api/status');
    if (!statusRes.ok) return false;
    const statusData = parseStatusResponse(await statusRes.json());

    let serverHasData = false;

    // If backend has live state, restore it into tabData
    if (statusData.job_analysis) {
      tabData.analysis = statusData.job_analysis;
      serverHasData = true;
      console.log('Restored analysis data from backend memory');
    }
    if (statusData.customizations) {
      tabData.customizations = statusData.customizations;
      window.pendingRecommendations = statusData.customizations;
      serverHasData = true;
      console.log('Restored customizations data from backend memory');
    }
    if (statusData.generated_files) {
      tabData.cv = statusData.generated_files;
      serverHasData = true;
      console.log('Restored CV data from backend memory');
    }

    // If backend has no active session (cold start after server restart),
    // try to auto-load the most recent session from disk.
    if (!statusData.position_name && !statusData.job_analysis) {
      const storedPath = localStorage.getItem(StorageKeys.SESSION_PATH);
      if (storedPath) {
        const loaded = await loadSessionFile(storedPath);
        if (loaded) return true;
      }
    }

    return serverHasData;
  } catch (error) {
    console.warn('Failed to restore backend state:', error);
    return false;
  }
}

async function loadSessionFile(path) {
  try {
    appendMessage('system', '🔄 Restoring session from file...');
    const res = await fetch('/api/load-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (!res.ok) {
      const err = await res.json();
      appendMessage('system', `❌ Failed to restore session: ${err.error}`);
      return false;
    }
    const data = await res.json();

    // Persist the loaded path so auto-reload can find it after the next server restart
    localStorage.setItem(StorageKeys.SESSION_PATH, data.session_file || path);

    // Reload conversation history and status from the freshly-loaded backend
    const historyRes = await fetch('/api/history');
    if (historyRes.ok) {
      const historyData = await historyRes.json();
      const conv = document.getElementById('conversation');
      conv.innerHTML = '';
      (historyData.history || []).forEach(msg => {
        if (msg.role !== 'system') appendMessage(msg.role, msg.content);
      });
    } else {
      appendMessage('system', '⚠ Could not restore conversation history.');
    }

    await fetchStatus();
    await populateJobTab();
    appendMessage('system', `✅ Session restored: ${data.position_name || 'Unnamed'} (${data.phase || PHASES.INIT})`);
    return true;
  } catch (err) {
    appendMessage('system', `❌ Error restoring session: ${err.message}`);
    return false;
  }
}

// ── LLM abort helper ──────────────────────────────────────────────────────
// Wraps fetch() and automatically attaches the current AbortController signal.
function llmFetch(url, options = {}) {
  if (window._currentAbortController) {
    options.signal = window._currentAbortController.signal;
  }
  return fetch(url, options);
}

function abortCurrentRequest() {
  if (window._currentAbortController) {
    window._currentAbortController.abort();
    window._currentAbortController = null;
    setLoading(false);
    appendMessage('system', '⏹ Request stopped.');
  }
}

// ── LLM status bar ────────────────────────────────────────────────────────
function _updateLLMStatusBar(loading) {
  const bar       = document.getElementById('llm-status-bar');
  const thinking  = document.getElementById('llm-thinking');
  const abortBtn  = document.getElementById('llm-abort-btn');
  if (!bar) return;
  if (loading) {
    bar.style.display    = 'flex';
    if (thinking) thinking.style.display = 'flex';
    if (abortBtn) abortBtn.style.display  = '';
  } else {
    if (thinking) thinking.style.display = 'none';
    if (abortBtn) abortBtn.style.display  = 'none';
    // Refresh token count (non-blocking); hides bar if fetch fails
    _refreshContextStats();
  }
}

async function _refreshContextStats() {
  const bar      = document.getElementById('llm-status-bar');
  const tokenEl  = document.getElementById('llm-token-count');
  if (!bar || !tokenEl) return;
  try {
    const res  = await fetch('/api/context-stats');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok) return;
    const est    = data.estimated_tokens || 0;
    const win    = data.context_window   || 128_000;
    const exact  = data.token_source === 'exact';
    const pct    = Math.round((est / win) * 100);
    const estStr = est >= 1000 ? `${(est / 1000).toFixed(1)}K` : `${est}`;
    const winStr = win >= 1000 ? `${Math.round(win / 1000)}K`  : `${win}`;
    tokenEl.textContent  = `${exact ? '' : '~'}${estStr} / ${winStr} (${pct}%)`;
    bar.style.display    = 'flex';
  } catch (_) { /* silently ignore */ }
}

// ── Sessions modal ────────────────────────────────────────────────────────
async function openSessionsModal() {
  const overlay = document.getElementById('sessions-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  await _renderSessionsModalBody();
  _refreshTrashBadge();
}

function closeSessionsModal() {
  const overlay = document.getElementById('sessions-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function _renderSessionsModalBody() {
  const body = document.getElementById('sessions-modal-body');
  if (!body) return;
  body.innerHTML = '<p style="padding:24px;text-align:center;color:#6b7280;">Loading sessions…</p>';
  let sessions = [];
  try {
    const res = await fetch('/api/sessions');
    const data = parseSessionListResponse(await res.json());
    sessions = data.sessions || [];
  } catch (e) {
    body.innerHTML = `<p style="padding:20px;color:#ef4444;">Could not load sessions: ${escapeHtml(e.message)}</p>`;
    return;
  }
  if (sessions.length === 0) {
    body.innerHTML = '<p style="padding:24px;text-align:center;color:#6b7280;">No saved sessions found.</p>';
    return;
  }

  function fmtDate(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ts.slice(0, 10); }
  }

  let html = '<table style="width:100%;border-collapse:collapse;">';
  sessions.forEach((s, i) => {
    const ts = fmtDate(s.timestamp);
    const indicators = [
      s.has_job          ? '📋' : '',
      s.has_analysis     ? '🔍' : '',
      s.has_customizations ? '⚙️' : '',
    ].filter(Boolean).join(' ');
    const ep = escapeHtml(s.path); // HTML-safe for attributes; dataset read-back is decoded by browser
    html += `
      <tr style="border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <td style="padding:12px 16px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span id="sm-name-${i}" style="font-weight:600;color:#1e293b;">${escapeHtml(s.position_name || 'Untitled')}</span>
            <button data-sm-action="rename" data-sm-path="${ep}" data-sm-idx="${i}" title="Rename"
              style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:0.85em;padding:1px 3px;">✏️</button>
          </div>
          <div id="sm-rename-${i}" style="display:none;align-items:center;gap:4px;margin-top:4px;">
            <input id="sm-input-${i}" type="text" value="${escapeHtml(s.position_name || '')}"
              class="sm-key-input" data-sm-path="${ep}" data-sm-idx="${i}"
              style="border:1px solid #3b82f6;border-radius:4px;padding:3px 8px;font-size:13px;flex:1;">
            <button data-sm-action="submit-rename" data-sm-path="${ep}" data-sm-idx="${i}"
              style="background:#3b82f6;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:12px;cursor:pointer;">✓</button>
            <button data-sm-action="cancel-rename" data-sm-idx="${i}"
              style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:4px;padding:3px 8px;font-size:12px;cursor:pointer;">✕</button>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${ts ? ts + ' · ' : ''}${indicators} ${escapeHtml(s.phase || '')}</div>
        </td>
        <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">
          <div style="display:flex;gap:6px;">
            <button data-sm-action="load" data-sm-path="${ep}"
              style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;">Load</button>
            <button data-sm-action="delete" data-sm-path="${ep}"
              style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;" title="Delete session">🗑</button>
          </div>
        </td>
      </tr>`;
  });
  html += '</table>';
  // Wrap in a single-use div so listeners are destroyed when the div is replaced on the next render
  const smWrapper = document.createElement('div');
  smWrapper.innerHTML = html;
  body.innerHTML = '';
  body.appendChild(smWrapper);
  // Wire up session-modal action buttons via event delegation (avoids inline onclick with path data)
  smWrapper.addEventListener('click', e => {
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
  });
  smWrapper.querySelectorAll('.sm-key-input').forEach(input => {
    input.addEventListener('keydown', e => {
      const path = input.dataset.smPath;
      const idx  = parseInt(input.dataset.smIdx, 10);
      if (e.key === 'Enter') submitSessionModalRename(path, idx);
      else if (e.key === 'Escape') cancelSessionModalRename(idx);
    });
  });
}

async function loadSessionAndCloseModal(path) {
  closeSessionsModal();
  await loadSessionFile(path);
}

async function newSessionFromModal() {
  closeSessionsModal();
  await resetSession();
}

function startSessionModalRename(path, idx) {
  const form = document.getElementById(`sm-rename-${idx}`);
  if (form) form.style.display = 'flex';
  const input = document.getElementById(`sm-input-${idx}`);
  if (input) { input.focus(); input.select(); }
}
function cancelSessionModalRename(idx) {
  const form = document.getElementById(`sm-rename-${idx}`);
  if (form) form.style.display = 'none';
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
      alert(`Rename failed: ${data.error}`);
    }
  } catch (e) { alert(`Rename error: ${e.message}`); }
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
      alert(`Failed to move session to Trash: ${data.error || 'Unknown error'}`);
    }
  } catch (e) { alert(`Error: ${e.message}`); }
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

  body.innerHTML = '<p style="padding:24px;text-align:center;color:#6b7280;">Loading trash…</p>';

  // Swap footer buttons
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
    const ep = escapeHtml(s.path); // HTML-safe for attributes; dataset read-back is decoded by browser
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
  // Wrap in a single-use div so listeners are destroyed when the div is replaced on the next render
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
    else alert(`Restore failed: ${data.error || 'Unknown error'}`);
  } catch (e) { alert(`Error: ${e.message}`); }
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
    else alert(`Delete failed: ${data.error || 'Unknown error'}`);
  } catch (e) { alert(`Error: ${e.message}`); }
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
    else alert(`Failed to empty trash: ${data.error || 'Unknown error'}`);
  } catch (e) { alert(`Error: ${e.message}`); }
}

// Rename current session from the position-bar pencil button
async function promptRenameCurrentSession() {
  const current = (document.getElementById('position-title')?.textContent || '').trim();
  const newName = prompt('Rename session:', current);
  if (!newName || !newName.trim() || newName.trim() === current) return;
  try {
    const res  = await fetch('/api/rename-current-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName.trim() }),
    });
    const data = await res.json();
    if (data.ok) await fetchStatus();
    else alert(`Rename failed: ${data.error}`);
  } catch (e) { alert(`Rename error: ${e.message}`); }
}

function saveTabData() {
  try {
    // Conversation history is NOT stored in localStorage — the server session file
    // (saved by ConversationManager._save_session) is authoritative.  Restore is
    // always done from /api/history on page load to keep the two in sync.
    localStorage.setItem('cv-builder-tab-data', JSON.stringify({
      tabData: tabData,
      currentTab: currentTab,
      pendingRecommendations: window.pendingRecommendations || null,
      interactiveState: interactiveState,
      activeReviewPane: window._activeReviewPane || 'experiences',
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to save tab data:', error);
  }
}

function restoreTabData({ uiPrefsOnly = false } = {}) {
  // uiPrefsOnly: when true, only restore UI preferences (activeReviewPane) and skip
  // core session data (tabData, interactiveState, pendingRecommendations) because
  // the server is the authoritative source for those fields.
  try {
    const saved = localStorage.getItem('cv-builder-tab-data');
    if (saved) {
      const data = JSON.parse(saved);

      // Only restore if data is recent (within 24 hours)
      const age = Date.now() - (data.timestamp || 0);
      if (age < 24 * 60 * 60 * 1000) {
        if (!uiPrefsOnly) {
          if (data.tabData) {
            tabData = { ...tabData, ...data.tabData };
          }
          if (data.pendingRecommendations) {
            window.pendingRecommendations = data.pendingRecommendations;
          }
          if (data.interactiveState) {
            interactiveState = { ...interactiveState, ...data.interactiveState };
          }
        }
        // Always restore UI-only preferences regardless of server state
        if (data.activeReviewPane) {
          window._activeReviewPane = data.activeReviewPane;
        }

        console.log(`Restored tab data from localStorage (uiPrefsOnly=${uiPrefsOnly})`);
      } else {
        // Clear old data
        localStorage.removeItem('cv-builder-tab-data');
      }
    }
  } catch (error) {
    console.warn('Failed to restore tab data:', error);
  }
}

async function init() {
  // Initialize abort controller to null (set to new AbortController by setLoading(true))
  window._currentAbortController = null;

  // Flush any messages that were queued before DOMContentLoaded (defensive — should be empty in practice).
  _flushMessageQueue();

  // Show loading message
  appendMessage('system', '🔄 Connecting to CV Builder...');
  
  // Restore session state first
  await restoreSession();
  
  // Initialize the rest
  await fetchStatus();
  await populateJobTab();
  setupEventListeners();
  
  // Set up periodic state saving
  setInterval(saveTabData, 5000); // Save every 5 seconds
  
  // Save state before page unload
  window.addEventListener('beforeunload', () => {
    saveTabData();
    if (sessionId) {
      localStorage.setItem('cv-builder-session-id', sessionId);
    }
  });
  
  // Auto-analyze job if loaded but not analyzed (only if not reconnecting)
  if (!isReconnecting) {
    const status = await getStatus();
    if (!status._error && status.job_description && !status.job_analysis) {
      appendMessage('system', 'Auto-analyzing loaded job description...');
      await analyzeJob();
      
      // Don't auto-recommend - let user answer questions first
      // User will type "proceed" when ready for recommendations
    } else if (status.job_analysis) {
      console.log('Job analysis already complete, skipping auto-analysis');
    }
  } else {
    console.log('Reconnecting to existing session, skipping auto-analysis');
  }
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Message sending
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Action buttons
  document.getElementById('analyze-btn').addEventListener('click', analyzeJob);
  document.getElementById('recommend-btn').addEventListener('click', () => sendAction('recommend_customizations'));
  document.getElementById('generate-btn').addEventListener('click', async () => {
    // Check if we need to sync review decisions to backend before generating CV
    if (userSelections && (Object.keys(userSelections.experiences).length > 0 || Object.keys(userSelections.skills).length > 0)) {
      appendMessage('system', 'Applying your review decisions...');
      // Decisions were already submitted via submitExperienceDecisions/submitSkillDecisions
      // Backend has them in conversation.state['experience_decisions'] and ['skill_decisions']
    }
    await fetchAndReviewRewrites();
  });
  document.getElementById('reset-btn').addEventListener('click', resetSession);
}

function showAlertModal(title, message) {
  document.getElementById('alert-modal-title').textContent = title;
  document.getElementById('alert-modal-message').innerHTML = message.replace(/\n/g, '<br>');
  document.getElementById('alert-modal-overlay').style.display = 'block';
}

function closeAlertModal() {
  document.getElementById('alert-modal-overlay').style.display = 'none';
}

function toggleChat() {
  const chatArea = document.getElementById('chat-area');
  const viewerArea = document.getElementById('viewer-area');
  const toggleBtn = document.getElementById('toggle-chat');
  
  if (chatArea.classList.contains('collapsed')) {
    chatArea.classList.remove('collapsed');
    viewerArea.classList.remove('expanded');
    toggleBtn.textContent = '◀';
  } else {
    chatArea.classList.add('collapsed');
    viewerArea.classList.add('expanded');
    toggleBtn.textContent = '▶';
  }
}

function normalizeText(text) {
  return text
    .trim()  // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')  // Collapse internal whitespace
    .trim();
}

function switchTab(tab) {
  // Sync second-bar visibility to this tab's stage
  if (typeof getStageForTab === 'function' && typeof updateTabBarForStage === 'function') {
    const tabStage = getStageForTab(tab);
    if (tabStage) {
      currentStage = tabStage;
      updateTabBarForStage(tabStage);
    }
  }

  // Update active tab and ARIA state
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
  }
  currentTab = tab;

  // All tabs except 'cv' use full-width layout (no paper-sized centering)
  const content = document.getElementById('document-content');
  content.classList.toggle('full-width', tab !== 'cv');

  // Load content for tab
  loadTabContent(tab);
}

async function loadTabContent(tab) {
  const content = document.getElementById('document-content');
  
  switch (tab) {
    case 'job':
      await populateJobTab();
      break;
    case 'analysis':
      if (tabData.analysis) {
        populateAnalysisTab(tabData.analysis);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><h3>Job Analysis</h3><p>Click "Analyze Job" to generate analysis</p></div>';
      }
      break;
    case 'questions':
      populateQuestionsTab();
      break;
    case 'customizations':
      if (tabData.customizations) {
        await populateCustomizationsTabWithReview(tabData.customizations);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">⚙️</div><h3>Customizations</h3><p>Click "Recommend Customizations" to generate recommendations</p></div>';
      }
      break;
    case 'editor':
      await populateCVEditorTab();
      break;
    case 'cv':
      if (tabData.cv) {
        populateCVTab(tabData.cv);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Generated CV</h3><p>Generate CV to see preview</p></div>';
      }
      break;
    case 'download':
      if (tabData.cv && Object.keys(tabData.cv).length > 0) {
        await populateDownloadTab(tabData.cv);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">⬇️</div><h3>Download</h3><p>Generate CV to enable downloads</p></div>';
      }
      break;
    case 'spell':
      await populateSpellCheckTab();
      break;
    case 'layout':
      initiateLayoutInstructions();
      break;
    case 'finalise':
      await populateFinaliseTab();
      break;
    case 'master':
      await populateMasterTab();
      break;
    case 'cover-letter':
      await populateCoverLetterTab();
      break;
    case 'screening':
      await populateScreeningTab();
      break;
  }
}

async function populateJobTab() {
  const content = document.getElementById('document-content');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    if (data.job_description_text) {
      const jobText = data.job_description_text;
      const lines = jobText.split('\n');
      let html = '<h1>' + escapeHtml(lines[0]) + '</h1>';
      if (lines[1]) html += '<h2>' + escapeHtml(lines[1]) + '</h2>';

      html += '<div style="white-space: pre-wrap; line-height: 1.6; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">' + escapeHtml(jobText) + '</div>';

      // Add action button to replace/edit job description
      html += '<div style="margin-top:20px;"><button onclick="showLoadJobPanel()" class="btn-secondary">📥 Load Different Job</button></div>';
      content.innerHTML = html;
    } else {
      await showLoadJobPanel();
      return;
    }
  } catch (error) {
    console.error('Error loading job description:', error);
    await showLoadJobPanel();
  }
}

// ── Unified Load Job panel ──────────────────────────────────────────────────────

async function showLoadJobPanel() {
  // Don't switch tabs if we're already on the job tab to avoid infinite loop
  if (currentTab !== 'job') {
    switchTab('job');
  }
  
  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading…</p></div>';

  let items = [];
  try {
    const res = await fetch('/api/load-items');
    if (res.ok) ({ items } = await res.json());
  } catch (e) { /* server offline — show empty table */ }

  // Update the step-job pill to reflect no-job state while panel is open
  const stepJob = document.getElementById('step-job');
  stepJob.classList.remove('completed');
  stepJob.classList.add('active');

  function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ts.slice(0, 10); }
  }

  function phaseLabel(phase) {
    const map = { [PHASES.INIT]: '📋 Init', [PHASES.JOB_ANALYSIS]: '🔍 Analysis', [PHASES.CUSTOMIZATION]: '⚙️ Custom.', [PHASES.GENERATION]: '📄 Generate', [PHASES.REFINEMENT]: '✅ Done' };
    return map[phase] || (phase || '—');
  }

  const rows = items.map(item => {
    const typeBadge = item.kind === 'session'
      ? '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;">💾 Session</span>'
      : '<span style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;">📄 File</span>';
    const escapedItem = JSON.stringify(item).replace(/"/g, '&quot;');
    
    // Add delete button for sessions only
    const deleteButton = item.kind === 'session'
      ? `<button data-delete-session="${escapeHtml(item.path)}" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;" title="Delete session">🗑️</button>`
      : '<span style="color:#9ca3af;">—</span>';
    
    return `<tr class="load-item-row" data-item="${escapedItem}" onclick="loadItemFromRow(this)" style="cursor:pointer;">
      <td style="padding:10px 12px;">${typeBadge}</td>
      <td style="padding:10px 12px;font-weight:500;">${item.label}</td>
      <td style="padding:10px 12px;font-size:13px;color:#64748b;">${fmtDate(item.timestamp)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#64748b;">${item.kind === 'session' ? phaseLabel(item.phase) : '—'}</td>
      <td style="padding:10px 12px;text-align:center;" onclick="event.stopPropagation()">${deleteButton}</td>
    </tr>`;
  }).join('');

  const tableBody = rows ||
    '<tr><td colspan="5" style="padding:20px;text-align:center;color:#64748b;font-style:italic;">No saved sessions or job files found.</td></tr>';

  content.innerHTML = `
    <div style="max-width:820px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:6px;">📥 Load Job</h1>
      <p style="color:#64748b;margin-bottom:20px;">Resume a session, open a server-side file, or add a new job description below.</p>

      <!-- Unified table of sessions + server files -->
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:13px;color:#475569;display:flex;align-items:center;justify-content:space-between;">
          <span>Saved Sessions &amp; Job Files</span>
          <button onclick="showLoadJobPanel()" style="background:none;border:none;color:#3b82f6;cursor:pointer;font-size:12px;" title="Refresh list">↻ Refresh</button>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0;background:#fafafa;">
              <th style="text-align:left;padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;width:100px;">Type</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;">Name</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;width:120px;">Date</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;width:120px;">Progress</th>
              <th style="text-align:center;padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;width:80px;">Actions</th>
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>

      <!-- Add new job description -->
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:visible;">
        <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:13px;color:#475569;">Add New Job Description</div>
        <div style="padding:20px;">

          <div class="input-method-tabs" style="margin-top:0;">
            <button class="input-tab active" onclick="switchInputMethod('paste')">📝 Paste Text</button>
            <button class="input-tab" onclick="switchInputMethod('url')">🔗 From URL</button>
            <button class="input-tab" onclick="switchInputMethod('file')">📁 Upload File</button>
          </div>

          <!-- Paste -->
          <div class="input-method active" id="paste-method">
            <textarea id="job-text-input" placeholder="Paste the job description here…" rows="12"
              aria-describedby="paste-error"
              onblur="_validatePasteField()"
              style="width:100%;font-family:inherit;font-size:14px;padding:12px;border:1px solid #d1d5db;border-radius:6px;resize:vertical;margin-top:8px;"></textarea>
            <span id="paste-error" class="field-error" aria-live="polite"></span>
            <div style="margin-top:10px;display:flex;gap:12px;">
              <button onclick="submitJobText()" class="btn-primary">Submit Job Description</button>
              <button onclick="clearJobInput()" class="btn-secondary">Clear</button>
            </div>
          </div>

          <!-- URL -->
          <div class="input-method" id="url-method">
            <p style="margin:8px 0 10px;">Enter a URL to automatically extract the job description:</p>
            <input type="url" id="job-url-input" placeholder="https://company.com/job-posting"
              aria-describedby="url-error"
              onblur="_validateURLField()"
              style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:6px;" />
            <span id="url-error" class="field-error" aria-live="polite"></span>
            <div style="margin-top:10px;display:flex;gap:12px;">
              <button onclick="fetchJobFromURL()" class="btn-primary">Fetch Job Description</button>
              <button onclick="clearURLInput()" class="btn-secondary">Clear</button>
            </div>
            <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:6px;padding:10px;">
                <div style="font-weight:600;color:#0369a1;margin-bottom:4px;">✅ Works well with:</div>
                <ul style="margin:0;padding-left:16px;color:#0369a1;line-height:1.7;"><li>Company career pages</li><li>AngelList, RemoteOK</li><li>Government &amp; university sites</li></ul>
              </div>
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px;">
                <div style="font-weight:600;color:#92400e;margin-bottom:4px;">⚠️ Copy manually from:</div>
                <ul style="margin:0;padding-left:16px;color:#92400e;line-height:1.7;"><li><strong>LinkedIn</strong> (login required)</li><li><strong>Indeed</strong> (anti-bot)</li><li><strong>Glassdoor</strong> (auth required)</li></ul>
              </div>
            </div>
          </div>

          <!-- File Upload -->
          <div class="input-method" id="file-method">
            <div id="file-drop-zone"
                 ondragover="event.preventDefault(); this.classList.add('drag-over')"
                 ondragleave="this.classList.remove('drag-over')"
                 ondrop="handleFileDrop(event)"
                 onclick="document.getElementById('job-file-input').click()"
                 style="border:2px dashed #d1d5db;border-radius:8px;padding:32px 16px;text-align:center;cursor:pointer;transition:background 0.2s,border-color 0.2s;margin:8px 0;">
              <div style="font-size:2rem;margin-bottom:8px;">📄</div>
              <div style="font-weight:600;margin-bottom:4px;">Drop a file here, or click to browse</div>
              <div style="font-size:0.85rem;color:#64748b;">.txt &nbsp;·&nbsp; .md &nbsp;·&nbsp; .html &nbsp;·&nbsp; .pdf &nbsp;·&nbsp; .docx &nbsp;·&nbsp; .rtf</div>
            </div>
            <input type="file" id="job-file-input" style="display:none"
                   accept=".txt,.md,.rst,.text,.html,.htm,.pdf,.docx,.doc,.rtf"
                   aria-describedby="file-upload-error"
                   onchange="handleFileSelected(this.files[0])">
            <div id="file-selected-info" style="display:none;margin:8px 0;">
              <span id="file-selected-name" style="font-weight:600;"></span>
              <span id="file-selected-size" style="color:#64748b;margin-left:8px;"></span>
              <button onclick="clearSelectedFile()" style="margin-left:8px;background:none;border:none;cursor:pointer;color:#64748b;">✕</button>
            </div>
            <div id="file-upload-error" style="display:none;color:#c0392b;margin:8px 0;font-size:0.85rem;"></div>
            <div id="file-size-warning" style="display:none;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:0.85rem;"></div>
            <div style="display:flex;gap:8px;margin-top:4px;align-items:center;">
              <button id="file-upload-btn" onclick="uploadJobFile()" class="btn-primary" style="display:none;">📤 Use This File</button>
              <div id="file-upload-spinner" style="display:none;font-size:0.85rem;color:#64748b;">⏳ Parsing…</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
  // Wire up session delete buttons via event delegation (data-delete-session avoids onclick path injection)
  content.querySelector('tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-delete-session]');
    if (!btn) return;
    e.stopPropagation();
    deleteSession(btn.dataset.deleteSession, e);
  });
}

function loadItemFromRow(row) {
  document.querySelectorAll('.load-item-row').forEach(r => r.style.background = '');
  row.style.background = '#eff6ff';
  const item = JSON.parse(row.dataset.item.replace(/&quot;/g, '"'));
  if (item.kind === 'session') {
    loadSessionFile(item.path);
  } else {
    _loadServerJobFile(item.filename, item.label);
  }
}

async function _loadServerJobFile(filename, label) {
  appendMessage('system', `📄 Loading job file: ${label || filename}…`);
  setLoading(true);
  try {
    const res = await fetch('/api/load-job-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    const data = await res.json();
    if (data.error) {
      appendRetryMessage(`❌ ${data.error}`, () => _loadServerJobFile(filename, label));
    } else {
      tabData.job = data.job_text;
      saveTabData();
      appendMessage('assistant', `✅ Job description loaded from "${label || filename}". You can now analyze it.`);
      await populateJobTab();
      await fetchStatus();
    }
  } catch (e) {
    appendRetryMessage(`❌ Network error: ${e.message}`, () => _loadServerJobFile(filename, label));
  } finally {
    setLoading(false);
  }
}

// backward-compat shim (called from a few places)
function showJobInput() { showLoadJobPanel(); }

async function deleteSession(sessionId, event) {
  event.stopPropagation(); // Prevent row click
  
  const confirmed = await confirmDialog(
    'Are you sure you want to delete this session?\n\nThis action cannot be undone.',
    { confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true }
  );
  if (!confirmed) return;
  
  try {
    const res = await fetch('/api/delete-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: sessionId })
    });
    
    const data = await res.json();
    if (data.success) {
      // Refresh the load job panel to show updated list
      showLoadJobPanel();
      console.log('Session deleted successfully');
    } else {
      alert(`Failed to delete session: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    alert('Failed to delete session. Please try again.');
  }
}

function switchInputMethod(method) {
  // Update tab appearance
  document.querySelectorAll('.input-tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  
  // Show/hide method panels
  document.querySelectorAll('.input-method').forEach(panel => panel.classList.remove('active'));
  document.getElementById(method + '-method').classList.add('active');
}

// ── File Upload helpers ──────────────────────────────────────────────────

let _pendingUploadFile = null;

function handleFileDrop(event) {
  event.preventDefault();
  document.getElementById('file-drop-zone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file) handleFileSelected(file);
}

function handleFileSelected(file) {
  if (!file) return;

  const sizeMb  = (file.size / (1024 * 1024)).toFixed(1);
  const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${(file.size / 1024).toFixed(1)} KB`;
  const errEl   = document.getElementById('file-upload-error');
  const warnEl  = document.getElementById('file-size-warning');

  // Validate file type by MIME prefix and extension fallback
  const allowedMimes = ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/html'];
  const allowedExts  = ['.pdf', '.doc', '.docx', '.txt', '.html', '.htm'];
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const mimeOk = allowedMimes.some(m => file.type.startsWith(m)) || file.type === '';
  const extOk  = allowedExts.includes(ext);
  if (!mimeOk && !extOk) {
    errEl.textContent   = `Unsupported file type "${ext || file.type}". Supported formats: PDF, Word (.doc/.docx), plain text, HTML.`;
    errEl.style.display = 'block';
    if (warnEl) warnEl.style.display = 'none';
    document.getElementById('file-upload-btn').style.display = 'none';
    return;
  }

  // Block files over 20 MB
  if (file.size > 20 * 1024 * 1024) {
    errEl.textContent   = `File is too large (${sizeMb} MB). Maximum allowed size is 20 MB.`;
    errEl.style.display = 'block';
    if (warnEl) warnEl.style.display = 'none';
    document.getElementById('file-upload-btn').style.display = 'none';
    return;
  }

  _pendingUploadFile = file;
  document.getElementById('file-selected-name').textContent  = file.name;
  document.getElementById('file-selected-size').textContent  = `(${sizeStr})`;
  document.getElementById('file-selected-info').style.display = 'block';
  document.getElementById('file-upload-btn').style.display    = 'inline-block';
  errEl.style.display = 'none';

  // Warn for files over 5 MB (may be slow to parse)
  if (warnEl) {
    if (file.size > 5 * 1024 * 1024) {
      warnEl.textContent   = `⚠ Large file (${sizeMb} MB) — parsing may take a moment.`;
      warnEl.style.display = 'block';
    } else {
      warnEl.style.display = 'none';
    }
  }
}

function clearSelectedFile() {
  _pendingUploadFile = null;
  document.getElementById('job-file-input').value = '';
  document.getElementById('file-selected-info').style.display = 'none';
  document.getElementById('file-upload-btn').style.display   = 'none';
  document.getElementById('file-upload-error').style.display = 'none';
  const warn = document.getElementById('file-size-warning');
  if (warn) warn.style.display = 'none';
}

function _showFieldError(inputId, errorId, msg) {
  const inp  = document.getElementById(inputId);
  const span = document.getElementById(errorId);
  if (span)  { span.textContent = msg; span.classList.add('visible'); }
  if (inp)   { inp.classList.add('field-invalid'); }
}

function _clearFieldError(inputId, errorId) {
  const inp  = document.getElementById(inputId);
  const span = document.getElementById(errorId);
  if (span)  { span.textContent = ''; span.classList.remove('visible'); }
  if (inp)   { inp.classList.remove('field-invalid'); }
}

function _validatePasteField() {
  const val = (document.getElementById('job-text-input')?.value || '').trim();
  if (val.length > 0 && val.length < 50) {
    _showFieldError('job-text-input', 'paste-error', 'Job description is too short — please paste at least 50 characters.');
  } else {
    _clearFieldError('job-text-input', 'paste-error');
  }
}

function _validateURLField() {
  const val = (document.getElementById('job-url-input')?.value || '').trim();
  if (!val) { _clearFieldError('job-url-input', 'url-error'); return; }
  try {
    const u = new URL(val);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Protocol not http/https');
    _clearFieldError('job-url-input', 'url-error');
  } catch {
    _showFieldError('job-url-input', 'url-error', 'Please enter a valid URL starting with https:// or http://');
  }
}

async function uploadJobFile() {
  if (!_pendingUploadFile) return;

  const errEl      = document.getElementById('file-upload-error');
  const spinner    = document.getElementById('file-upload-spinner');
  const uploadBtn  = document.getElementById('file-upload-btn');

  errEl.style.display    = 'none';
  spinner.style.display  = 'inline';
  uploadBtn.disabled     = true;

  try {
    const formData = new FormData();
    formData.append('file', _pendingUploadFile);

    const resp = await fetch('/api/upload-file', { method: 'POST', body: formData });
    const data = await resp.json();

    if (!resp.ok || data.error) {
      throw new Error(data.message || data.error || `Server error ${resp.status}`);
    }

    // Feed extracted text into the job API (same path as paste-text)
    const jobResp = await fetch('/api/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_text: data.text })
    });
    const jobData = await jobResp.json();
    if (!jobResp.ok) throw new Error(jobData.error || 'Failed to process job description');

    if (jobData.error) {
      appendMessage('system', 'Error: ' + jobData.error);
    } else {
      tabData.job = data.text;
      saveTabData();
      appendMessage('assistant', `✅ Job description loaded from "${data.filename}" (${data.content_length.toLocaleString()} chars). You can now analyze it.`);
      await populateJobTab();
      await fetchStatus();
    }
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  } finally {
    spinner.style.display = 'none';
    uploadBtn.disabled    = false;
  }
}

async function submitJobText() {
  const textInput = document.getElementById('job-text-input');
  const jobText = textInput.value.trim();

  if (!jobText) {
    _showFieldError('job-text-input', 'paste-error', 'Please enter a job description before submitting.');
    textInput.focus();
    return;
  }
  if (jobText.length < 50) {
    _showFieldError('job-text-input', 'paste-error', 'Job description is too short — please paste at least 50 characters.');
    textInput.focus();
    return;
  }
  _clearFieldError('job-text-input', 'paste-error');
  
  setLoading(true);
  appendMessage('user', 'Submitting job description...');
  
  try {
    const response = await fetch('/api/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_text: jobText })
    });
    
    const data = await response.json();
    
    if (data.error) {
      _showFieldError('job-text-input', 'paste-error', data.error);
      appendRetryMessage('❌ Error: ' + data.error, submitJobText);
    } else {
      _clearFieldError('job-text-input', 'paste-error');
      tabData.job = jobText;
      saveTabData();
      appendMessage('assistant', '✅ Job description submitted successfully.');
      await populateJobTab(); // Refresh the tab
      await fetchStatus(); // Update workflow status
      setLoading(false);
      await analyzeJob(); // Auto-trigger analysis
      return;
    }
  } catch (error) {
    console.error('Error submitting job:', error);
    appendRetryMessage('❌ Error submitting job description: ' + error.message, submitJobText);
  }

  setLoading(false);
}

async function fetchJobFromURL() {
  const urlInput = document.getElementById('job-url-input');
  const url = urlInput.value.trim();

  if (!url) {
    _showFieldError('job-url-input', 'url-error', 'Please enter a URL before fetching.');
    urlInput.focus();
    return;
  }
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    _clearFieldError('job-url-input', 'url-error');
  } catch {
    _showFieldError('job-url-input', 'url-error', 'Please enter a valid URL starting with https:// or http://');
    urlInput.focus();
    return;
  }
  
  setLoading(true);
  appendMessage('user', `Fetching job description from URL: ${url}`);
  
  try {
    const response = await fetch('/api/fetch-job-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });
    
    const data = await response.json();
    
    if (data.error) {
      // Handle different types of errors with helpful guidance
      let errorMessage = data.error;
      let helpMessage = data.message || '';
      
      if (data.protected_site) {
        // Special handling for protected sites like LinkedIn
        errorMessage = `${data.site_name} Protection Detected`;
        helpMessage = data.message;
        
        if (data.instructions && data.instructions.length > 0) {
          helpMessage += '\n\nHow to proceed:\n' + data.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
        }
        
        // Show special modal for protected sites
        showProtectedSiteModal(data.site_name, data.message, data.instructions);
      } else if (data.instructions) {
        // General error with instructions
        helpMessage += '\n\nSuggested solutions:\n' + data.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
        showAlertModal('URL Fetch Error', `${errorMessage}\n\n${helpMessage}`);
      } else {
        // Simple error
        _showFieldError('job-url-input', 'url-error', errorMessage);
        showAlertModal('Error', `${errorMessage}${helpMessage ? '\n\n' + helpMessage : ''}`);
      }

      appendMessage('system', `❌ ${errorMessage}: ${data.message || 'Please try manual input.'}`);
    } else {
      tabData.job = data.job_text;
      saveTabData();
      appendMessage('assistant', `✅ ${data.message}! Fetched ${data.content_length || 'content'} characters. You can now analyze it.`);
      await populateJobTab(); // Refresh the tab
      await fetchStatus(); // Update workflow status
    }
  } catch (error) {
    console.error('Error fetching URL:', error);
    _showFieldError('job-url-input', 'url-error', `Network error: ${error.message}`);
    appendRetryMessage(`Network error occurred: ${error.message}. Please check your connection or try manual input.`, fetchJobFromURL);
    showAlertModal('Network Error', 'Unable to connect to the server. Please try again or use the \"Paste Text\" option to input the job description manually.');
  }
  
  setLoading(false);
}

function showProtectedSiteModal(siteName, message, instructions) {
  let instructionsList = '';
  if (instructions && instructions.length > 0) {
    instructionsList = '<ol style=\"margin: 16px 0; padding-left: 20px;\">' + 
                      instructions.map(inst => `<li style=\"margin: 8px 0;\">${inst}</li>`).join('') + 
                      '</ol>';
  }
  
  const safeName = escapeHtml(siteName);
  const safeMessage = escapeHtml(message);
  const modalContent = `
    <div style=\"text-align: center; margin-bottom: 16px;\">
      🔒 <strong>${safeName} requires manual input</strong>
    </div>
    <p>${safeMessage}</p>
    ${instructionsList}
    <div style=\"margin-top: 20px; padding: 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px;\">
      <strong>💡 Tip:</strong> After copying the job description, click the \"Paste Text\" tab above to submit it directly.
    </div>
  `;

  showAlertModal(`${safeName} Input Required`, modalContent);
}

function clearJobInput() {
  document.getElementById('job-text-input').value = '';
}

function clearURLInput() {
  document.getElementById('job-url-input').value = '';
}

// ---------------------------------------------------------------------------
// sendMessage() dispatch table
//
// Each handler: { test(text) → bool, handle(text) → Promise<void> }
// Handlers are checked in order; first match wins and sendMessage() returns.
// To add a new message type: append a new entry here — no changes to
// sendMessage() itself required.
// ---------------------------------------------------------------------------

/** Branch: default LLM message — POST to /api/message and display the response. */
async function _handleLLMMessage(text) {
  setLoading(true);
  try {
    const res = await llmFetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = parseMessageResponse(await res.json());

    if (data.error) {
      const errorMsg = data.error.toString();
      // Suppress CV-data echoes that the LLM sometimes includes in error messages
      if (errorMsg.includes('personal_info') ||
          errorMsg.includes('experience":') ||
          errorMsg.includes('"name":') ||
          errorMsg.match(/^\s*["'{]/)) {
        console.warn('Backend error was CV data echo, suppressing:', errorMsg);
      } else {
        appendRetryMessage('❌ Error: ' + errorMsg, () => {
          document.getElementById('message-input').value = text;
          sendMessage();
        });
        console.error('Server error:', data.error);
      }
    } else if (data.response) {
      try {
        const cleanResponse = data.response;
        // Check if response embeds customization JSON
        const jsonMatch = cleanResponse.match(/\{[\s\S]*?"recommended_experiences"[\s\S]*?\}/);
        if (jsonMatch) {
          const textBeforeJson = cleanResponse.substring(0, jsonMatch.index).trim();
          if (textBeforeJson && !textBeforeJson.includes('{"action":')) {
            const filteredLines = textBeforeJson.split('\n')
              .filter(line => {
                const t = line.trim();
                return t.length > 0 && !t.startsWith('"') &&
                       !t.includes('personal_info') && !t.includes('experience') && !t.includes('}: {');
              })
              .join('\n');
            if (filteredLines.trim().length > 0) appendMessage('assistant', filteredLines);
          }
          await handleCustomizationResponse(jsonMatch[0]);
        } else {
          // Regular conversation — filter CV data echoes before display
          const filteredResponse = cleanResponse.split('\n')
            .filter(line => {
              const t = line.trim();
              return t.length > 0 && !t.startsWith('"') &&
                     !t.includes('personal_info') && !t.includes('experience":') &&
                     !t.includes('education":') && !t.includes('skills":') &&
                     !t.includes('publications":') &&
                     !t.match(/^\s*"[a-z_]+":\s*[{\[]/) &&
                     !t.match(/^\s*\{[\s\S]*"[a-z_]+"/);
            })
            .join('\n');
          if (filteredResponse.trim().length > 0) {
            appendMessage('assistant', filteredResponse);
          } else {
            console.warn('LLM response contained only CV data echoes, nothing to display');
          }
        }
      } catch (err) {
        console.error('Error processing message response:', err, data.response);
        appendMessage('system', `⚠️ I encountered an issue processing that response: ${err.message}. The conversation has been saved.`);
      }
    }
  } catch (error) {
    console.error('=== MESSAGE ERROR ===', error.name, error.message, error.stack);
    if (error.name === 'AbortError') {
      // user clicked Stop — message already shown in abortCurrentRequest()
    } else if (error instanceof TypeError) {
      appendRetryMessage(`⚠️ Cannot reach the server — is it still running? (${error.message})`, () => {
        document.getElementById('message-input').value = text; sendMessage();
      });
    } else if (error instanceof SyntaxError) {
      appendRetryMessage(`⚠️ The server returned an unexpected response: ${error.message}`, () => {
        document.getElementById('message-input').value = text; sendMessage();
      });
    } else {
      appendRetryMessage('⚠️ ' + error.message, () => {
        document.getElementById('message-input').value = text; sendMessage();
      });
    }
  }
  setLoading(false);
  await fetchStatus();
}

// Handlers checked in order; first matching test() wins.
const _messageHandlers = [
  {
    // "review" / "review recommendations" — show table-based review
    test: t => t.toLowerCase().includes('review recommendations') || t.toLowerCase() === 'review',
    handle: async () => showTableBasedReview(),
  },
  {
    // Interactive experience review in progress
    test: () => window.waitingForExperienceResponse,
    handle: async t => handleExperienceResponse(t),
  },
  {
    // Interactive skills review in progress
    test: () => window.waitingForSkillsResponse,
    handle: async t => handleSkillsResponse(t),
  },
  {
    // Post-analysis question response — local handler + backend save.
    // Falls through to LLM if question was NOT handled locally (questionHandled === false).
    test: () => window.waitingForQuestionResponse,
    handle: async t => {
      const questionHandled = handleQuestionResponse(t);
      setLoading(true);
      try {
        const res = await llmFetch('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: t }),
        });
        const data = parseMessageResponse(await res.json());
        if (data.error) {
          console.error('Backend error saving question response:', data.error);
        } else if (data.response && !questionHandled) {
          appendMessage('assistant', data.response);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('=== QUESTION RESPONSE SAVE ERROR ===', err);
      }
      setLoading(false);
      if (!questionHandled) await _handleLLMMessage(t);
    },
  },
  {
    // "proceed" — go to customizations or show recommendations
    test: t => t.toLowerCase() === 'proceed',
    handle: async () => window.pendingRecommendations
      ? showTableBasedReview()
      : sendAction('recommend_customizations'),
  },
  {
    // Default: general LLM conversation
    test: () => true,
    handle: _handleLLMMessage,
  },
];

async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = normalizeText(input.value);
  if (!text || isLoading) return;

  appendMessage('user', text);
  input.value = '';

  for (const handler of _messageHandlers) {
    if (handler.test(text)) {
      await handler.handle(text);
      return;
    }
  }
}

async function analyzeJob() {
  if (isLoading) return;
  
  const loadingMsg = appendLoadingMessage('Analyzing job description...');
  setLoading(true);
  
  try {
    const res = await llmFetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze_job' })
    });
    const data = parseMessageResponse(await res.json());

    removeLoadingMessage(loadingMsg);

    if (data.error) {
      appendRetryMessage('❌ Error: ' + data.error, analyzeJob);
    } else {
      const result = data.result;
      // Backend returns a string on success, or {text, context_data} on fallback
      const analysisText = typeof result === 'string' ? result : (result && result.text) || null;
      const analysisData = typeof result === 'object' && result !== null
        ? (result.context_data?.job_analysis ?? result)
        : result;
      const structuredQuestions = (typeof result === 'object' && result !== null)
        ? result.context_data?.post_analysis_questions
        : null;

      if (analysisText) appendMessage('assistant', analysisText);
      appendFormattedAnalysis(analysisData);
      switchTab('analysis');
      populateAnalysisTab(analysisData);

      // Await post-analysis questions while still loading to prevent
      // user input race conditions during the LLM question-generation call.
      await askPostAnalysisQuestions(analysisData, structuredQuestions);
    }
  } catch (error) {
    console.error('=== ANALYZE JOB ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    console.error('========================');
    removeLoadingMessage(loadingMsg);
    if (error.name !== 'AbortError') {
      appendRetryMessage('❌ Error: ' + error.message, analyzeJob);
    }
  }

  setLoading(false);
  await fetchStatus();
}

// ---------------------------------------------------------------------------
// Recommendation helpers
//
// Canonical shape (set by llm_client.py → recommend_customizations):
//   data.experience_recommendations: [{id, recommendation, confidence, reasoning}]
//   data.skill_recommendations:      [{skill, recommendation, confidence, reasoning}]
//   data.recommended_experiences:    [id, ...]    ← backwards-compat flat list (Python populates)
//   data.omitted_experiences:        [id, ...]    ← backwards-compat flat list
//   data.recommended_skills:         [skill, ...] ← backwards-compat flat list
//
// If canonical arrays are absent (old session data), fall back to flat lists.
// console.warn is emitted on first miss per lookup to aid schema-drift debugging.
// ---------------------------------------------------------------------------

/** Look up a single experience entry in experience_recommendations. */
function _findExpRec(expId, data) {
  if (!Array.isArray(data.experience_recommendations)) {
    console.warn('[recommendation] experience_recommendations missing; using flat-list fallback for', expId);
    return null;
  }
  return data.experience_recommendations.find(r => r.id === expId || r.experience_id === expId) || null;
}

/** Look up a single skill entry in skill_recommendations. */
function _findSkillRec(skill, data) {
  if (!Array.isArray(data.skill_recommendations)) {
    console.warn('[recommendation] skill_recommendations missing; using flat-list fallback for', skill);
    return null;
  }
  return data.skill_recommendations.find(r => r.skill === skill || r.name === skill) || null;
}

/** Parse a raw confidence string to a {level, text} object, or null if unrecognised. */
function _parseConfidence(conf) {
  const c = (conf || '').toLowerCase();
  if (c.includes('very high')) return { level: 'very-high', text: 'Very High Confidence' };
  if (c.includes('very low'))  return { level: 'very-low',  text: 'Very Low Confidence'  };
  if (c.includes('high'))      return { level: 'high',      text: 'High Confidence'      };
  if (c.includes('medium'))    return { level: 'medium',    text: 'Medium Confidence'    };
  if (c.includes('low'))       return { level: 'low',       text: 'Low Confidence'       };
  return null;
}

function getExperienceRecommendation(expId, data) {
  const rec = _findExpRec(expId, data);
  if (rec && rec.recommendation) return rec.recommendation;
  // Backwards-compat flat-list fallback (omitted_experiences takes priority over recommended_experiences)
  if (data.omitted_experiences     && data.omitted_experiences.includes(expId))     return 'Omit';
  if (data.recommended_experiences && data.recommended_experiences.includes(expId)) return 'Emphasize';
  return 'Include';
}

function getConfidenceLevel(expId, data) {
  const rec = _findExpRec(expId, data);
  return (rec && _parseConfidence(rec.confidence)) || { level: 'medium', text: 'Medium Confidence' };
}

function getExperienceReasoning(expId, data) {
  const rec = _findExpRec(expId, data);
  return (rec && rec.reasoning) || 'This experience was selected based on its relevance to the position requirements.';
}

function getSkillRecommendation(skill, data) {
  const rec = _findSkillRec(skill, data);
  if (rec && rec.recommendation) return rec.recommendation;
  if (data.recommended_skills && data.recommended_skills.includes(skill)) return 'Include';
  return 'Omit';
}

function getSkillConfidence(skill, data) {
  const rec = _findSkillRec(skill, data);
  if (rec) {
    const parsed = _parseConfidence(rec.confidence);
    if (parsed) return parsed;
  }
  if (data.recommended_skills && data.recommended_skills.includes(skill)) {
    return { level: 'medium', text: 'Medium Confidence' };
  }
  return { level: 'low', text: 'Low Confidence' };
}

function getSkillReasoning(skill, data) {
  const rec = _findSkillRec(skill, data);
  if (rec && rec.reasoning) return rec.reasoning;
  if (data.recommended_skills && data.recommended_skills.includes(skill)) {
    return 'This skill was identified as relevant to the position requirements.';
  }
  return 'This skill was not specifically mentioned in the job requirements.';
}

// ==== Achievement Recommendation Helpers ====

function getAchievementRecommendation(achId, data) {
  if (data.achievement_recommendations && Array.isArray(data.achievement_recommendations)) {
    const rec = data.achievement_recommendations.find(r => r.id === achId);
    if (rec && rec.recommendation) return rec.recommendation;
  }
  // Fallback: if in recommended_achievements list, default Include; otherwise De-emphasize
  if (data.recommended_achievements && data.recommended_achievements.includes(achId)) {
    return 'Include';
  }
  return 'De-emphasize';
}

function getAchievementConfidence(achId, data, achImportance) {
  if (data.achievement_recommendations && Array.isArray(data.achievement_recommendations)) {
    const rec = data.achievement_recommendations.find(r => r.id === achId);
    if (rec && rec.confidence) {
      const conf = rec.confidence.toLowerCase();
      if (conf.includes('very high')) return { level: 'very-high', text: 'Very High' };
      if (conf.includes('high'))      return { level: 'high',      text: 'High' };
      if (conf.includes('medium'))    return { level: 'medium',    text: 'Medium' };
      if (conf.includes('very low'))  return { level: 'very-low',  text: 'Very Low' };
      if (conf.includes('low'))       return { level: 'low',       text: 'Low' };
    }
  }
  // Derive from importance score (1-10)
  const imp = achImportance || 5;
  if (imp >= 9) return { level: 'very-high', text: 'Very High' };
  if (imp >= 7) return { level: 'high',      text: 'High' };
  if (imp >= 5) return { level: 'medium',    text: 'Medium' };
  if (imp >= 3) return { level: 'low',       text: 'Low' };
  return { level: 'very-low', text: 'Very Low' };
}

function getAchievementReasoning(achId, data, ach) {
  if (data.achievement_recommendations && Array.isArray(data.achievement_recommendations)) {
    const rec = data.achievement_recommendations.find(r => r.id === achId);
    if (rec && rec.reasoning) return rec.reasoning;
  }
  // Derive from achievement metadata
  const relevantFor = (ach.relevant_for || []).join(', ');
  if (data.recommended_achievements && data.recommended_achievements.includes(achId)) {
    return relevantFor
      ? `Recommended for this role. Relevant for: ${relevantFor}.`
      : 'Recommended by AI as relevant to this role.';
  }
  return relevantFor
    ? `Relevant for: ${relevantFor}. Not specifically highlighted for this role.`
    : 'Not specifically highlighted for this role based on job requirements.';
}

function buildFallbackPostAnalysisQuestions(data) {
  const questions = [];

  if (data.role_level) {
    questions.push({
      question: `This role appears to be at ${data.role_level} level. Should I emphasize your most senior experiences or include a broader range to show career progression?`,
      type: 'experience_level',
      choices: ['Emphasize most senior', 'Broader career progression', 'Let you decide based on analysis'],
    });
  }

  if (data.required_skills && data.required_skills.some(skill =>
      skill.toLowerCase().includes('leadership') ||
      skill.toLowerCase().includes('management') ||
      skill.toLowerCase().includes('team'))) {
    questions.push({
      question: 'This role has leadership components. Would you prefer me to emphasize your management experience or focus more on your technical contributions?',
      type: 'leadership_focus',
      choices: ['Emphasize management', 'Focus on technical', 'Balance both equally'],
    });
  }

  if (data.domain) {
    questions.push({
      question: `The role is in ${data.domain}. Do you have particular projects or achievements in this domain that you'd like me to highlight?`,
      type: 'domain_expertise',
      choices: ['Highlight domain-specific achievements', 'Use all available experience', 'Prioritize most recent work'],
    });
  }

  if (data.company) {
    questions.push({
      question: `For ${data.company}, would you like me to tailor emphasis toward their culture and values? If so, what should I prioritize?`,
      type: 'company_culture',
      choices: ['Research-driven / academic', 'Industry / commercial impact', 'Innovation / startup', 'Use cultural indicators from job description'],
    });
  }

  return questions;
}

async function persistPostAnalysisState() {
  try {
    if (!Array.isArray(window.postAnalysisQuestions)) {
      window.postAnalysisQuestions = [];
    }
    if (!window.questionAnswers || typeof window.questionAnswers !== 'object') {
      window.questionAnswers = {};
    }

    await fetch('/api/post-analysis-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: window.postAnalysisQuestions,
        answers: window.questionAnswers
      })
    });
  } catch (error) {
    console.warn('Failed to persist post-analysis state:', error);
  }
}

function normalizePostAnalysisQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions
    .filter(q => q && typeof q.question === 'string' && q.question.trim())
    .map((q, idx) => ({
      question: q.question.trim(),
      type: (q.type || `clarification_${idx + 1}`).toString(),
      choices: Array.isArray(q.choices) ? q.choices : [],
    }));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderQuestionMarkdown(markdownText) {
  const safe = escapeHtml(markdownText || '');
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function mergePostAnalysisQuestions(existingQuestions, incomingQuestions) {
  const existing = normalizePostAnalysisQuestions(existingQuestions);
  const incoming = normalizePostAnalysisQuestions(incomingQuestions);

  const merged = [...existing];
  const seenByQuestion = new Set(
    existing.map(q => q.question.toLowerCase().replace(/\s+/g, ' ').trim())
  );
  const usedTypes = new Set(existing.map(q => q.type));

  incoming.forEach((q, idx) => {
    const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seenByQuestion.has(key)) return;

    let type = q.type || `clarification_${merged.length + idx + 1}`;
    if (usedTypes.has(type)) {
      type = `${type}_${merged.length + idx + 1}`;
    }

    merged.push({
      question: q.question,
      type,
      choices: Array.isArray(q.choices) ? q.choices : [],
    });
    seenByQuestion.add(key);
    usedTypes.add(type);
  });

  return merged;
}

async function fetchPostAnalysisQuestionsFromApi(analysisData) {
  try {
    const res = await fetch('/api/post-analysis-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: analysisData })
    });
    if (!res.ok) return [];
    const payload = await res.json();
    return normalizePostAnalysisQuestions(payload.questions);
  } catch (apiError) {
    console.warn('Failed to fetch post-analysis questions:', apiError);
    return [];
  }
}

async function appendFollowUpPostAnalysisQuestions() {
  if (!tabData.analysis) return 0;

  let analysisData;
  try {
    const cleanAnalysis = cleanJsonResponse(tabData.analysis);
    analysisData = typeof cleanAnalysis === 'string'
      ? JSON.parse(cleanAnalysis)
      : cleanAnalysis;
  } catch (parseError) {
    console.warn('Skipping follow-up questions due to invalid analysis payload:', parseError);
    return 0;
  }

  const followUps = await fetchPostAnalysisQuestionsFromApi(analysisData);
  if (followUps.length === 0) return 0;

  const beforeCount = Array.isArray(window.postAnalysisQuestions)
    ? window.postAnalysisQuestions.length
    : 0;

  window.postAnalysisQuestions = mergePostAnalysisQuestions(
    window.postAnalysisQuestions,
    followUps
  );

  const added = window.postAnalysisQuestions.length - beforeCount;
  if (added > 0) {
    await persistPostAnalysisState();
  }
  return added;
}

async function askPostAnalysisQuestions(analysisResult, preferredQuestions = null) {
  try {
    const cleanResult = cleanJsonResponse(analysisResult);
    const data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;

    window.postAnalysisQuestions = mergePostAnalysisQuestions([], preferredQuestions);

    if (window.postAnalysisQuestions.length === 0) {
      window.postAnalysisQuestions = await fetchPostAnalysisQuestionsFromApi(data);
    }

    if (window.postAnalysisQuestions.length === 0) {
      window.postAnalysisQuestions = buildFallbackPostAnalysisQuestions(data);
    }

    if (!window.questionAnswers || typeof window.questionAnswers !== 'object') {
      window.questionAnswers = {};
    }
    await persistPostAnalysisState();

    if (window.postAnalysisQuestions.length > 0) {
      renderQuestionsPanel();
      switchTab('questions');
    } else {
      appendMessage('assistant', 'Analysis complete! Click "Recommend Customizations" when ready.');
    }
  } catch (e) {
    console.error('Error parsing analysis for questions:', e);
    appendMessage('assistant', 'Analysis complete! Click "Recommend Customizations" when ready.');
  }
}

function populateQuestionsTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  if (!tabData.analysis) {
    content.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>No Questions Yet</h3><p>Run "Analyze Job" first to generate clarifying questions.</p></div>';
    return;
  }

  const hasQuestions = Array.isArray(window.postAnalysisQuestions) && window.postAnalysisQuestions.length > 0;
  if (!hasQuestions) {
    content.innerHTML = '<div class="empty-state"><div class="icon">✅</div><h3>Questions Complete</h3><p>No pending clarifying questions. Click "Recommend Customizations" when ready.</p></div>';
    return;
  }

  content.innerHTML = '<div class="analysis-page"><div class="analysis-section"><h2>💬 Clarifying Questions</h2><p style="color:#64748b; margin: 0;">Please answer each question to improve recommendation quality.</p></div></div>';
  renderQuestionsPanel();
}

// Renders all clarifying questions as a panel. Each question shows chip buttons,
// a textarea (pre-filled with any saved answer), a Draft button, and an answered
// badge when a response has already been submitted.
function renderQuestionsPanel() {
  const qs = window.postAnalysisQuestions || [];
  if (qs.length === 0) return;

  const content = document.getElementById('document-content');
  if (!content) return;

  // Remove any existing questions panel before re-rendering.
  const existing = content.querySelector('.questions-panel');
  if (existing) existing.remove();

  const total = qs.length;
  const existingAnswers = (window.questionAnswers && typeof window.questionAnswers === 'object')
    ? window.questionAnswers
    : {};
  let panelHtml = `<div class="questions-panel" id="questions-panel">
    <h2>💬 A few quick questions</h2>
    <p class="q-progress" id="q-progress">Please answer all ${total} question${total > 1 ? 's' : ''} before proceeding.</p>`;

  qs.forEach((q, idx) => {
    const savedAnswer = (existingAnswers[q.type] || '').toString();
    const isAnswered  = savedAnswer.trim().length > 0;
    const renderedQuestion = renderQuestionMarkdown(q.question);
    const chips = (q.choices || []).map((c, ci) =>
      `<button class="q-chip" data-qidx="${idx}" data-cidx="${ci}" onclick="selectQChip(this, ${idx})">${escapeHtml(c)}</button>`
    ).join('');
    panelHtml += `
      <div class="question-item${isAnswered ? ' answered' : ''}" id="q-item-${idx}">
        <div class="q-header">
          <div class="q-text">${idx + 1}. ${renderedQuestion}</div>
          ${isAnswered ? '<span class="q-answered-badge">✓ Answered</span>' : ''}
        </div>
        ${chips ? `<div class="q-chips">${chips}</div>` : ''}
        <div class="q-answer-row">
          <textarea class="q-input" id="q-input-${idx}" placeholder="Your answer…" oninput="updateQProgress()">${escapeHtml(savedAnswer)}</textarea>
          <button class="q-draft-btn" id="q-draft-btn-${idx}" onclick="draftQuestionResponse(${idx})" title="Generate a draft answer using AI">✨ Draft</button>
        </div>
      </div>`;
  });

  panelHtml += `<button class="questions-submit-btn" id="q-submit-btn" onclick="submitAllAnswers()" disabled>Submit Answers</button></div>`;

  // Append to the analysis content.
  content.insertAdjacentHTML('beforeend', panelHtml);

  // Restore chip selection for any question whose saved answer matches a chip label.
  qs.forEach((q, idx) => {
    const saved = (existingAnswers[q.type] || '').toString().trim();
    if (!saved) return;
    const item = document.getElementById(`q-item-${idx}`);
    if (!item) return;
    item.querySelectorAll('.q-chip').forEach(chip => {
      if ((chip.textContent || '').trim() === saved) {
        chip.classList.add('selected');
      }
    });
  });

  updateQProgress();
}

// Calls the LLM to generate a draft answer for question at index idx,
// then populates the textarea so the user can review / edit before submitting.
async function draftQuestionResponse(idx) {
  const qs = window.postAnalysisQuestions || [];
  const q  = qs[idx];
  if (!q) return;

  const btn = document.getElementById(`q-draft-btn-${idx}`);
  const ta  = document.getElementById(`q-input-${idx}`);
  if (!btn || !ta) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="display:inline-block;width:11px;height:11px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;"></span>';

  try {
    let analysisPayload = null;
    if (tabData.analysis) {
      try {
        const cleaned = cleanJsonResponse(tabData.analysis);
        analysisPayload = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
      } catch (_) { /* use null */ }
    }

    const res = await fetch('/api/post-analysis-draft-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.question, question_type: q.type, analysis: analysisPayload }),
    });
    const data = await res.json();
    if (data.ok && data.text) {
      ta.value = data.text;
      updateQProgress();
      // Clear any chip selection since the draft may differ from preset options.
      const item = document.getElementById(`q-item-${idx}`);
      if (item) item.querySelectorAll('.q-chip').forEach(c => c.classList.remove('selected'));
      showDraftError(idx, null);
      appendMessage('assistant', `✨ Draft answer for Q${idx + 1}:\n\n${data.text}\n\nReview and edit in the field below before submitting.`);
    } else {
      console.warn('Draft generation failed:', data.error);
      showDraftError(idx, data.error || 'Draft failed — please try again.');
    }
  } catch (err) {
    console.error('Draft fetch error:', err);
    showDraftError(idx, 'Network error — please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Draft';
  }
}

// Handles chip selection: marks chip as selected, populates the text area.
function selectQChip(btn, qIdx) {
  // Deselect sibling chips.
  const panel = document.getElementById(`q-item-${qIdx}`);
  if (panel) {
    panel.querySelectorAll('.q-chip').forEach(c => c.classList.remove('selected'));
  }
  btn.classList.add('selected');
  const textarea = document.getElementById(`q-input-${qIdx}`);
  if (textarea) {
    textarea.value = btn.textContent;
    updateQProgress();
  }
}

// Updates the progress label and enables/disables the Submit button.
function updateQProgress() {
  const qs = window.postAnalysisQuestions || [];
  const answered = qs.filter((_, idx) => {
    const ta = document.getElementById(`q-input-${idx}`);
    return ta && ta.value.trim().length > 0;
  }).length;
  const progressEl = document.getElementById('q-progress');
  if (progressEl) {
    progressEl.textContent = `Answered ${answered} of ${qs.length}`;
  }
  const submitBtn = document.getElementById('q-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = answered < qs.length;
  }
}

// Collects all answers, persists them, and re-renders the panel so all
// questions and answers remain visible at all times.
async function submitAllAnswers() {
  const qs = window.postAnalysisQuestions || [];
  qs.forEach((q, idx) => {
    const ta = document.getElementById(`q-input-${idx}`);
    if (ta && ta.value.trim()) {
      window.questionAnswers[q.type] = ta.value.trim();
    }
  });
  await persistPostAnalysisState();

  const btn = document.getElementById('q-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Processing…';
  }

  try {
    appendMessage('assistant', `✓ Thank you! ${qs.length} answer${qs.length > 1 ? 's' : ''} saved. Click "Recommend Customizations" when ready.`);
    // Always re-render so all questions + answers remain visible.
    switchTab('questions');
  } finally {
    // btn may be detached after switchTab re-renders — that is harmless.
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Submit Answers';
    }
  }
}

// Shows (or clears) an inline error message beneath the Draft button for question idx.
function showDraftError(idx, message) {
  const row = document.querySelector(`#q-item-${idx} .q-answer-row`);
  if (!row) return;
  let errEl = document.getElementById(`q-draft-err-${idx}`);
  if (!message) {
    if (errEl) errEl.remove();
    return;
  }
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = `q-draft-err-${idx}`;
    errEl.className = 'q-draft-error';
    row.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = `⚠ ${message}`;
}

// Legacy compatibility: keep these stubs so existing callers do not break.
function showNextQuestion() { renderQuestionsPanel(); }

function handleQuestionResponse(message) {
  if (!window.postAnalysisQuestions || window.postAnalysisQuestions.length === 0) return false;
  if (!window.waitingForQuestionResponse) return false;
  // Legacy path: record answer for the current question index (used by chat input).
  const idx = window.currentQuestionIndex || 0;
  const q = window.postAnalysisQuestions[idx];
  if (!q) return false;
  window.questionAnswers[q.type] = message;
  window.waitingForQuestionResponse = false;
  window.currentQuestionIndex = idx + 1;
  persistPostAnalysisState();
  renderQuestionsPanel();
  return true;
}

function finishPostAnalysisQuestions() {
  window.waitingForQuestionResponse = false;
  appendMessage('assistant', 'Thank you for those insights! Click "Recommend Customizations" when you\'re ready.');
}

async function getStatus() {
  try {
    const res = await fetch('/api/status');
    return parseStatusResponse(await res.json());
  } catch (error) {
    console.error('Error fetching status:', error);
    return { _error: true };
  }
}

function cleanJsonResponse(text) {
  if (typeof text !== 'string') return text;
  
  // Remove markdown code fences first
  text = text.replace(/^```json\s*/gm, '').replace(/\s*```$/gm, '');
  
  // Try to find a complete JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return match[0].trim();
  }
  
  // If no JSON object found, return as-is (not JSON)
  return text;
}

function populateAnalysisTab(result) {
  const content = document.getElementById('document-content');
  try {
    // Store for persistence
    tabData.analysis = result;
    saveTabData();

    const cleanResult = cleanJsonResponse(result);
    const data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;

    // ── Section 1: Role & Domain card ────────────────────────────────────
    let html = '<div class="analysis-page">';
    html += '<div class="analysis-role-card">';
    html += `<h1>${data.title || 'Role'}</h1>`;
    if (data.company) html += `<p class="company">🏢 ${data.company}</p>`;
    html += '<div class="meta">';
    if (data.domain)     html += `<span class="meta-chip">🔬 ${data.domain}</span>`;
    if (data.role_level) html += `<span class="meta-chip">📊 ${data.role_level}</span>`;
    if (data.suggested_summary) html += `<span class="meta-chip">💬 ${data.suggested_summary}</span>`;
    html += '</div></div>';

    // ── Mismatch callout (computed from master skills) ────────────────────
    const requiredSkills = Array.isArray(data.required_skills) ? data.required_skills : [];
    const masterSkills = window._masterSkills || [];
    if (requiredSkills.length > 0 && masterSkills.length > 0) {
      const missing = requiredSkills.filter(skill =>
        !masterSkills.some(ms => ms.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms))
      );
      if (missing.length > 0) {
        html += `<div class="mismatch-callout">⚠ <strong>${missing.length} required skill${missing.length > 1 ? 's' : ''} not found in your master CV:</strong> ${missing.join(', ')}</div>`;
      }
    }

    // ── Section 2: Required Skills grid ──────────────────────────────────
    if (requiredSkills.length > 0) {
      html += '<div class="analysis-section"><h2>🎯 Required Skills</h2><div class="skill-grid">';
      requiredSkills.forEach(skill => {
        const isMissing = masterSkills.length > 0 && !masterSkills.some(
          ms => ms.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms)
        );
        html += `<span class="skill-badge${isMissing ? ' missing' : ''}" title="${isMissing ? 'Not in master CV' : 'Found in master CV'}">${skill}</span>`;
      });
      html += '</div></div>';
    }

    // ── Section 3: Preferred / Nice-to-Have list ─────────────────────────
    const preferred = [
      ...(Array.isArray(data.preferred_skills) ? data.preferred_skills : []),
      ...(Array.isArray(data.nice_to_have_requirements) ? data.nice_to_have_requirements : []),
    ];
    if (preferred.length > 0) {
      html += '<div class="analysis-section"><h2>⭐ Preferred / Nice-to-Have</h2><ul class="preferred-list">';
      preferred.forEach(item => { html += `<li>${item}</li>`; });
      html += '</ul></div>';
    }

    // ── Section 4: ATS Keywords with rank badges ──────────────────────────
    const atsKws = Array.isArray(data.ats_keywords) ? data.ats_keywords : [];
    if (atsKws.length > 0) {
      html += '<div class="analysis-section"><h2>🔑 ATS Keywords <small style="font-weight:400;color:#64748b;font-size:12px;">(higher rank = higher priority)</small></h2><div class="kw-badges">';
      atsKws.forEach((kw, idx) => {
        html += `<span class="kw-badge"><span class="kw-rank">#${idx + 1}</span>${kw}</span>`;
      });
      html += '</div></div>';
    }

    // ── Culture indicators (optional) ────────────────────────────────────
    const culture = Array.isArray(data.culture_indicators) ? data.culture_indicators : [];
    if (culture.length > 0) {
      html += '<div class="analysis-section"><h2>🏢 Culture Indicators</h2><ul class="preferred-list">';
      culture.forEach(c => { html += `<li>${c}</li>`; });
      html += '</ul></div>';
    }

    // ── Must-have requirements ────────────────────────────────────────────
    const mustHave = Array.isArray(data.must_have_requirements) ? data.must_have_requirements : [];
    if (mustHave.length > 0) {
      html += '<div class="analysis-section"><h2>✅ Must-Have Requirements</h2><ul class="preferred-list">';
      mustHave.forEach(r => { html += `<li>${r}</li>`; });
      html += '</ul></div>';
    }

    html += '</div>'; // .analysis-page
    content.innerHTML = html;
  } catch (e) {
    console.error('Analysis parsing error:', e, 'Original result:', result);
    content.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Analysis Error</h3><p>Could not parse analysis results: ${escapeHtml(e.message)}</p><details><summary>Debug Info</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details></div>`;
  }
}

async function handleCustomizationResponse(response) {
  try {
    const cleanResult = cleanJsonResponse(response);
    
    // Try to parse as JSON
    let data;
    if (typeof cleanResult === 'string') {
      // Check if it looks like JSON
      if (cleanResult.trim().startsWith('{') && cleanResult.trim().endsWith('}')) {
        try {
          data = JSON.parse(cleanResult);
        } catch (parseError) {
          // Not valid JSON, treat as text
          console.log('Not JSON, displaying as text:', parseError);
          appendMessage('assistant', response);
          return;
        }
      } else {
        // Doesn't look like JSON, treat as text
        appendMessage('assistant', response);
        return;
      }
    } else {
      data = cleanResult;
    }
    
    if (data && (data.recommended_experiences || data.recommended_skills)) {
      // Store for persistence
      tabData.customizations = data;
      window.pendingRecommendations = data;
      saveTabData();
      
      if (!isReconnecting) {
        appendMessage('assistant', '✅ Customizations generated! Please review the **Experiences** and **Skills** in the **Customizations** tab. Select your preferences using the action buttons, then submit your decisions.');
        
        // Switch to customizations tab to show the full view
        switchTab('customizations');
        
        // Populate with interactive review tables
        await populateCustomizationsTabWithReview(data);
      }
    } else {
      if (!isReconnecting) {
        appendMessage('assistant', response);
      }
    }
  } catch (e) {
    console.error('Customization response error:', e);
    if (!isReconnecting) {
      appendMessage('assistant', response);
    }
  }
}

async function reviewRecommendationsInteractively(data) {
  if (data.recommended_experiences && data.recommended_experiences.length > 0) {
    appendMessage('assistant', `I have ${data.recommended_experiences.length} experience recommendations. Let me walk through the top ones with confidence levels and reasoning:`);
    
    for (let i = 0; i < Math.min(3, data.recommended_experiences.length); i++) {
      const expId = data.recommended_experiences[i];
      const confidence = getConfidenceLevel(expId, data);
      const reasoning = getExperienceReasoning(expId, data);
      
      appendMessage('assistant', `${i + 1}. **Experience ${expId}** (${confidence.text})\n\n**Why I recommend this:** ${reasoning}\n\nShould I include this prominent experience in your customized CV?`);
      
      // Add a small delay between recommendations
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    if (data.recommended_experiences.length > 3) {
      appendMessage('assistant', `I have ${data.recommended_experiences.length - 3} more experience recommendations with varying confidence levels. Type "show more" to review them, or "continue" to move to skill recommendations.`);
    }
  }
  
  if (data.recommended_skills && data.recommended_skills.length > 0) {
    appendMessage('assistant', `\n**Key Skills Strategy:**`);
    
    const topSkills = data.recommended_skills.slice(0, 3);
    topSkills.forEach((skill, index) => {
      const confidence = getSkillConfidence(skill, data);
      const reasoning = getSkillReasoning(skill, data);
      
      appendMessage('assistant', `• **${skill}** (${confidence.text}): ${reasoning}`);
    });
    
    if (data.recommended_skills.length > 3) {
      const remaining = data.recommended_skills.slice(3).join(', ');
      appendMessage('assistant', `Additional skills to consider: ${remaining}`);
    }
    
    appendMessage('assistant', 'Does this skill emphasis strategy align with how you want to position yourself for this role?');
  }
  
  appendMessage('assistant', 'You can:\n• Ask questions about any recommendation\n• Request changes to the strategy\n• Type "generate cv" when ready to proceed\n• Say "explain [experience/skill]" for more details');
}

async function startInteractiveReview() {
  if (!window.pendingRecommendations) {
    appendMessage('assistant', 'No recommendations to review. Please generate customizations first.');
    return;
  }
  
  const data = window.pendingRecommendations;
  interactiveState.isReviewing = true;
  interactiveState.currentIndex = 0;
  interactiveState.data = data;
  
  // Fetch ALL experiences from backend to review
  try {
    const statusRes = await fetch('/api/status');
    const statusData = parseStatusResponse(await statusRes.json());
    
    // Get all experience IDs from master CV data
    if (statusData.all_experience_ids && statusData.all_experience_ids.length > 0) {
      interactiveState.allExperiences = statusData.all_experience_ids;
      interactiveState.recommendedSet = new Set(data.recommended_experiences || []);
      
      // Store user's explicit exclusions (check both title and ID)
      interactiveState.userExclusions = new Set();
    } else {
      // Fallback to just recommended if we can't get all
      interactiveState.allExperiences = data.recommended_experiences || [];
      interactiveState.recommendedSet = new Set(data.recommended_experiences || []);
      interactiveState.userExclusions = new Set();
    }
  } catch (error) {
    console.warn('Could not fetch full experience list:', error);
    interactiveState.allExperiences = data.recommended_experiences || [];
    interactiveState.recommendedSet = new Set(data.recommended_experiences || []);
    interactiveState.userExclusions = new Set();
  }
  
  if (interactiveState.allExperiences && interactiveState.allExperiences.length > 0) {
    interactiveState.type = 'experiences';
    const totalCount = interactiveState.allExperiences.length;
    const excludedCount = Array.from(interactiveState.allExperiences).filter(exp =>
      Array.from(interactiveState.userExclusions).some(excl => exp.toLowerCase().includes(excl.toLowerCase()))
    ).length;
    appendMessage('assistant', `Great! I'll walk you through all ${totalCount} experience entries${excludedCount > 0 ? ` (skipping ${excludedCount} you explicitly excluded)` : ''}. I'll ask about them one at a time.`);
    setTimeout(() => showNextExperience(), 800);
  } else if (data.recommended_skills && data.recommended_skills.length > 0) {
    interactiveState.type = 'skills';
    appendMessage('assistant', 'Let me walk you through the skill recommendations.');
    setTimeout(() => showSkillsSummary(), 800);
  } else {
    appendMessage('assistant', 'No experiences or skills to review. Please generate customization recommendations first.');
  }
}

async function showNextExperience() {
  const data = interactiveState.data;
  const experiences = interactiveState.allExperiences || data.recommended_experiences;
  const index = interactiveState.currentIndex;
  
  // Find next experience that isn't user-excluded
  let currentExp = null;
  let currentIndex = index;
  while (currentIndex < experiences.length) {
    const exp = experiences[currentIndex];
    const isExcluded = Array.from(interactiveState.userExclusions || []).some(excl => 
      exp.toLowerCase().includes(excl.toLowerCase())
    );
    
    if (!isExcluded) {
      currentExp = exp;
      break;
    }
    currentIndex++;
  }
  
  // Update index for next iteration
  interactiveState.currentIndex = currentIndex + 1;
  
  if (!currentExp) {
    // No more experiences, move to skills
    if (data.recommended_skills && data.recommended_skills.length > 0) {
      appendMessage('assistant', 'Great! Now let me tell you about the skill recommendations.');
      setTimeout(() => showSkillsSummary(), 800);
    } else {
      finishInteractiveReview();
    }
    return;
  }
  
  const expId = currentExp;
  const isRecommended = (interactiveState.recommendedSet || new Set()).has(expId);
  const confidence = getConfidenceLevel(expId, data);
  const reasoning = getExperienceReasoning(expId, data);
  
  // Try to get real experience details
  const details = await getExperienceDetails(expId);
  
  let message = `**Experience ${currentIndex + 1}/${experiences.length}: ${expId}** `;
  message += isRecommended ? `(${confidence.text})\n\n` : `(Not Recommended)\n\n`;
  
  if (details) {
    message += `**${details.title}** at **${details.company}**\n`;
    if (details.duration) {
      message += `${details.duration}\n`;
    }
    message += `\n`;
    if (details.summary) {
      message += `${details.summary}\n\n`;
    }
    if (details.key_achievements && details.key_achievements.length > 0) {
      message += `**Key Achievement:** ${details.key_achievements[0]}\n\n`;
    }
  } else {
    message += `*Experience details not found in CV data*\n\n`;
  }
  
  if (isRecommended) {
    message += `**Why I recommend including this:** ${reasoning}\n\n`;
    message += `Should I include this experience prominently in your CV? (yes/no/maybe)`;
  } else {
    message += `**Why I suggest excluding this:** This experience doesn't align strongly with the job requirements for ${data.job_analysis?.title || 'this position'}.\n\n`;
    message += `Do you want to include this anyway? (yes/no/maybe)`;
  }
  
  appendMessage('assistant', message);
  
  // Set up to wait for user response
  window.waitingForExperienceResponse = true;
}

async function showSkillsSummary() {
  interactiveState.type = 'skills';
  const skills = interactiveState.data.recommended_skills;
  
  let message = '**Skills Strategy:**\n\n';
  
  skills.slice(0, 5).forEach((skill, index) => {
    const confidence = getSkillConfidence(skill, interactiveState.data);
    const reasoning = getSkillReasoning(skill, interactiveState.data);
    message += `• **${skill}** (${confidence.text}): ${reasoning}\n\n`;
  });
  
  if (skills.length > 5) {
    const remaining = skills.slice(5).join(', ');
    message += `**Additional skills to consider:** ${remaining}\\n\\n`;
  }
  
  message += 'Does this skills strategy look good to you? (yes/no/modify)';
  
  appendMessage('assistant', message);
  window.waitingForSkillsResponse = true;
}

function finishInteractiveReview() {
  interactiveState.isReviewing = false;
  appendMessage('assistant', 'Perfect! I\'ve walked through all the recommendations with you. When you\'re ready, type \"generate cv\" to create your customized CV, or ask me to modify any recommendations.');
}

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

async function handleSkillsResponse(message) {
  window.waitingForSkillsResponse = false;
  const response = message.toLowerCase();
  
  if (response.includes('yes')) {
    appendMessage('assistant', 'Excellent! I\'ll use this skills strategy in your CV.');
  } else if (response.includes('no') || response.includes('modify')) {
    appendMessage('assistant', 'I understand. What changes would you like me to make to the skills emphasis?');
  } else {
    appendMessage('assistant', 'I\'ll note your feedback on the skills strategy.');
  }
  
  finishInteractiveReview();
}

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

// ==== CV Editor Functions ====

let cvEditorData = {
  personal_info: {},
  summary: '',
  experiences: [],
  skills: []
};
let _cvEditorLoading = false;

async function populateCVEditorTab() {
  if (_cvEditorLoading) return;
  _cvEditorLoading = true;

  // Reset to defaults so stale data doesn't persist if the fetch fails or is slow
  cvEditorData = { personal_info: {}, summary: '', experiences: [], skills: [] };

  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading CV Editor…</p></div>';

  try {
    const res = await fetch('/api/cv-data');
    if (res.ok) {
      const data = await res.json();
      cvEditorData = {
        personal_info: data.personal_info || {},
        summary: data.summary || '',
        experiences: data.experiences || [],
        skills: data.skills || []
      };
    } else {
      throw new Error('Failed to load CV data');
    }
  } catch (error) {
    console.error('Error loading CV data:', error);
    cvEditorData = {
      personal_info: { name: '', email: '', phone: '', location: '' },
      summary: '',
      experiences: [],
      skills: []
    };
  } finally {
    _cvEditorLoading = false;
  }
  renderCVEditor();
}

function renderCVEditor() {
  const content = document.getElementById('document-content');
  
  const html = `
    <div class="editor-container">
      <h1 style="font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 24px;">CV Editor</h1>
      
      <!-- Personal Information -->
      <div class="editor-section">
        <div class="editor-section-header">
          📝 Personal Information
        </div>
        <div class="editor-section-content">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="edit-name">Full Name</label>
              <input type="text" id="edit-name" class="form-input" value="${escapeHtml(cvEditorData.personal_info.name || '')}" oninput="updatePersonalInfo('name', this.value)">
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-email">Email</label>
              <input type="email" id="edit-email" class="form-input" value="${escapeHtml(cvEditorData.personal_info.email || '')}" oninput="updatePersonalInfo('email', this.value)">
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-phone">Phone</label>
              <input type="tel" id="edit-phone" class="form-input" value="${escapeHtml(cvEditorData.personal_info.phone || '')}" oninput="updatePersonalInfo('phone', this.value)">
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-location">Location</label>
              <input type="text" id="edit-location" class="form-input" value="${escapeHtml(cvEditorData.personal_info.location || '')}" oninput="updatePersonalInfo('location', this.value)">
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="editor-section">
        <div class="editor-section-header">
          📋 Professional Summary
        </div>
        <div class="editor-section-content">
          <div class="form-group">
            <label class="form-label" for="edit-summary">Summary (max 500 characters)</label>
            <textarea id="edit-summary" class="form-input form-textarea" oninput="updateSummary(this.value)" placeholder="Write a compelling professional summary...">${escapeHtml(cvEditorData.summary)}</textarea>
            <div class="char-counter" id="summary-counter">${cvEditorData.summary.length}/500</div>
          </div>
        </div>
      </div>

      <!-- Experiences -->
      <div class="editor-section">
        <div class="editor-section-header">
          💼 Work Experience
          <button class="add-achievement" onclick="addNewExperience()">+ Add Experience</button>
        </div>
        <div class="editor-section-content">
          <div id="experiences-container">
            ${renderExperienceCards()}
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="editor-section">
        <div class="editor-section-header">
          🛠️ Skills
        </div>
        <div class="editor-section-content">
          <div class="skills-container" id="skills-container">
            ${renderSkillChips()}
          </div>
          <div class="add-skill-form">
            <div class="form-group" style="margin-bottom: 0; flex: 1;">
              <input type="text" id="new-skill-input" class="form-input" placeholder="Add a new skill..." onkeypress="if(event.key==='Enter') addSkill()">
            </div>
            <button class="add-skill-btn" onclick="addSkill()">Add Skill</button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="editor-actions">
        <button class="editor-btn secondary" onclick="resetCVEditor()">Reset Changes</button>
        <button class="editor-btn" onclick="saveCVChanges()">Save Changes</button>
        <button class="editor-btn" onclick="previewCV()">Preview CV</button>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  updateCharCounter();
}

function renderExperienceCards() {
  return cvEditorData.experiences.map((exp, index) => `
    <div class="experience-card" id="exp-${index}">
      <div class="experience-card-header" onclick="toggleExperienceCard(${index})">
        <span>${escapeHtml(exp.title || 'Untitled Position')} at ${escapeHtml(exp.company || 'Company')}</span>
        <div>
          <button class="remove-achievement" onclick="removeExperience(${index}); event.stopPropagation();" title="Remove Experience">×</button>
        </div>
      </div>
      <div class="experience-card-content">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Job Title</label>
            <input type="text" class="form-input" value="${escapeHtml(exp.title || '')}" oninput="updateExperience(${index}, 'title', this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">Company</label>
            <input type="text" class="form-input" value="${escapeHtml(exp.company || '')}" oninput="updateExperience(${index}, 'company', this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="month" class="form-input" value="${exp.start_date || ''}" oninput="updateExperience(${index}, 'start_date', this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input type="month" class="form-input" value="${exp.end_date || ''}" oninput="updateExperience(${index}, 'end_date', this.value)">
            <label style="display: flex; align-items: center; margin-top: 4px; font-size: 14px;">
              <input type="checkbox" ${exp.current ? 'checked' : ''} onchange="updateExperience(${index}, 'current', this.checked)" style="margin-right: 6px;"> Current position
            </label>
          </div>
          <div class="form-group form-grid-full">
            <label class="form-label">Location</label>
            <input type="text" class="form-input" value="${escapeHtml(exp.location || '')}" oninput="updateExperience(${index}, 'location', this.value)" placeholder="City, State/Country">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Key Achievements</label>
          <div class="achievements-list">
            ${(exp.achievements || []).map((achievement, achIndex) => `
              <div class="achievement-item">
                <textarea class="form-input form-textarea" oninput="updateAchievement(${index}, ${achIndex}, this.value)" placeholder="Describe a key achievement..." rows="2">${escapeHtml(achievement)}</textarea>
                <button class="remove-achievement" onclick="removeAchievement(${index}, ${achIndex})">×</button>
              </div>
            `).join('')}
          </div>
          <button class="add-achievement" onclick="addAchievement(${index})">+ Add Achievement</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderSkillChips() {
  return cvEditorData.skills.map((skill, index) => `
    <div class="skill-chip">
      ${escapeHtml(skill)}
      <button class="remove-skill" onclick="removeSkill(${index})" title="Remove skill">×</button>
    </div>
  `).join('');
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updatePersonalInfo(field, value) {
  cvEditorData.personal_info[field] = value;
}

function updateSummary(value) {
  cvEditorData.summary = value;
  updateCharCounter();
}

function updateCharCounter() {
  const counter = document.getElementById('summary-counter');
  if (counter) {
    const length = cvEditorData.summary.length;
    counter.textContent = `${length}/500`;
    counter.classList.toggle('over-limit', length > 500);
  }
}

function updateExperience(index, field, value) {
  if (!cvEditorData.experiences[index]) return;
  cvEditorData.experiences[index][field] = value;
  
  // Update the card header if title or company changed
  if (field === 'title' || field === 'company') {
    const header = document.querySelector(`#exp-${index} .experience-card-header span`);
    if (header) {
      const exp = cvEditorData.experiences[index];
      header.textContent = `${exp.title || 'Untitled Position'} at ${exp.company || 'Company'}`;
    }
  }
}

function updateAchievement(expIndex, achIndex, value) {
  if (!cvEditorData.experiences[expIndex] || !cvEditorData.experiences[expIndex].achievements) return;
  cvEditorData.experiences[expIndex].achievements[achIndex] = value;
}

function addAchievement(expIndex) {
  if (!cvEditorData.experiences[expIndex]) return;
  if (!cvEditorData.experiences[expIndex].achievements) {
    cvEditorData.experiences[expIndex].achievements = [];
  }
  cvEditorData.experiences[expIndex].achievements.push('');
  
  // Re-render the experience card
  document.getElementById('experiences-container').innerHTML = renderExperienceCards();
}

function removeAchievement(expIndex, achIndex) {
  if (!cvEditorData.experiences[expIndex] || !cvEditorData.experiences[expIndex].achievements) return;
  cvEditorData.experiences[expIndex].achievements.splice(achIndex, 1);
  
  // Re-render the experience card
  document.getElementById('experiences-container').innerHTML = renderExperienceCards();
}

function addNewExperience() {
  const newExp = {
    title: '',
    company: '',
    start_date: '',
    end_date: '',
    current: false,
    location: '',
    achievements: ['']
  };
  cvEditorData.experiences.push(newExp);
  
  // Re-render experiences
  document.getElementById('experiences-container').innerHTML = renderExperienceCards();
  
  // Expand the new card
  const newIndex = cvEditorData.experiences.length - 1;
  const newCard = document.getElementById(`exp-${newIndex}`);
  if (newCard) {
    newCard.scrollIntoView({ behavior: 'smooth' });
  }
}

async function removeExperience(index) {
  if (await confirmDialog('Are you sure you want to remove this experience?', { confirmLabel: 'Remove', danger: true })) {
    cvEditorData.experiences.splice(index, 1);
    document.getElementById('experiences-container').innerHTML = renderExperienceCards();
  }
}

function toggleExperienceCard(index) {
  const card = document.getElementById(`exp-${index}`);
  if (card) {
    card.classList.toggle('collapsed');
  }
}

function addSkill() {
  const input = document.getElementById('new-skill-input');
  const skill = input.value.trim();
  if (skill && !cvEditorData.skills.includes(skill)) {
    cvEditorData.skills.push(skill);
    input.value = '';
    document.getElementById('skills-container').innerHTML = renderSkillChips();
  }
}

function removeSkill(index) {
  cvEditorData.skills.splice(index, 1);
  document.getElementById('skills-container').innerHTML = renderSkillChips();
}

async function saveCVChanges() {
  try {
    const res = await fetch('/api/cv-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cvEditorData)
    });
    
    if (res.ok) {
      alert('CV changes saved successfully!');
    } else {
      throw new Error('Failed to save CV changes');
    }
  } catch (error) {
    console.error('Error saving CV changes:', error);
    alert('Failed to save CV changes. Please try again.');
  }
}

async function resetCVEditor() {
  if (await confirmDialog('Are you sure you want to reset all changes? This will reload the original CV data.', { confirmLabel: 'Reset', danger: true })) {
    await populateCVEditorTab();
  }
}

function previewCV() {
  // Switch to the CV tab to show preview
  switchTab('cv');
  // Optionally trigger CV generation with current editor data
  // This would require backend integration
}

// ==== Table-Based Review Functions ====

let userSelections = {
  experiences: {},  // exp_id -> 'emphasize'|'include'|'de-emphasize'|'exclude'
  skills: {}        // skill_name -> 'emphasize'|'include'|'de-emphasize'|'exclude'
};

async function showTableBasedReview() {
  if (!window.pendingRecommendations) {
    appendMessage('assistant', 'No recommendations to review. Please generate customizations first.');
    return;
  }
  
  // Switch to customizations tab and populate it with review tables
  await populateCustomizationsTabWithReview(window.pendingRecommendations);
  switchTab('customizations');
  
  // Inform user in conversation
  appendMessage('assistant', '✅ Customizations generated! Please review the **Experiences** and **Skills** in the **Customizations** tab. Select your preferences using the action buttons, then submit your decisions.');
}

async function populateCustomizationsTabWithReview(data) {
  const content = document.getElementById('document-content');

  // Build the shell with sub-tabs; individual sections are loaded lazily as tabs are clicked
  let html = `
    <h1>⚙️ Review Customization Recommendations</h1>
    <p style="color:#6b7280;margin-bottom:16px;">Review the AI's recommendations. Use the action buttons to adjust each item, then save your decisions before generating the CV.</p>

    <!-- Page-count estimator (updated live as selections change) -->
    <div id="page-estimate-widget" class="page-estimate ok">
      <span id="pe-icon">📄</span>
      <span id="pe-label">Estimated length: calculating…</span>
      <div class="pe-bar"><div class="pe-fill" id="pe-fill" style="width:0%;background:#86efac;"></div></div>
    </div>

    <!-- Generation Settings -->
    <details id="generation-settings-panel" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#f8fafc;">
      <summary style="cursor:pointer;font-weight:600;color:#374151;user-select:none;">⚙️ Generation Settings</summary>
      <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
        <label for="max-skills-input" style="font-size:0.9em;color:#4b5563;white-space:nowrap;">Max skills in CV:</label>
        <input type="range" id="max-skills-input" min="1" max="60" step="1" value="20"
          style="flex:1;accent-color:#3b82f6;">
        <span id="max-skills-value" style="font-weight:600;color:#1e293b;min-width:2em;text-align:right;">20</span>
        <span style="font-size:0.85em;color:#9ca3af;">(default: 20)</span>
      </div>
    </details>

    <!-- Sub-tab bar -->
    <div class="review-subtabs" id="review-subtab-bar">
      <button class="review-subtab active" data-pane="experiences"   onclick="switchReviewSubtab('experiences')">📊 Experiences</button>
      <button class="review-subtab"         data-pane="skills"        onclick="switchReviewSubtab('skills')">🛠️ Skills</button>
      <button class="review-subtab"         data-pane="achievements"  onclick="switchReviewSubtab('achievements')">🏆 Achievements</button>
      <button class="review-subtab"         data-pane="summary"       onclick="switchReviewSubtab('summary')">📝 Summary</button>
      <button class="review-subtab"         data-pane="publications"  onclick="switchReviewSubtab('publications')">📄 Publications</button>
    </div>

    <!-- Pane: Experiences -->
    <div id="review-pane-experiences" class="review-pane" style="display:block;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Sorted by date (most recent first). Click action buttons to override recommendations.</p>
      <div id="experience-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="submit-btn" onclick="submitExperienceDecisions()">Save Experience Decisions</button>
      </div>
    </div>

    <!-- Pane: Skills -->
    <div id="review-pane-skills" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Sorted by relevance. Select how to feature each skill.</p>
      <div id="skills-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="submit-btn" onclick="submitSkillDecisions()">Save Skill Decisions</button>
      </div>
    </div>

    <!-- Pane: Achievements -->
    <div id="review-pane-achievements" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Select how to feature each key achievement. AI recommendations are pre-selected.</p>
      <div id="achievements-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="submit-btn" onclick="submitAchievementDecisions()">Save Achievement Decisions</button>
      </div>
    </div>

    <!-- Pane: Summary -->
    <div id="review-pane-summary" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Select which professional summary to use. The AI's recommendation is pre-selected.</p>
      <div id="summary-focus-container"></div>
    </div>

    <!-- Pane: Publications -->
    <div id="review-pane-publications" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">All publications ranked by relevance. Accept or reject each for your CV.</p>
      <div id="publications-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="submit-btn" onclick="submitPublicationDecisions()">Save Publication Decisions</button>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // Sync max-skills slider with current session value
  (async () => {
    const status = await getStatus();
    const currentMax = status.max_skills || 20;
    const slider = document.getElementById('max-skills-input');
    const label  = document.getElementById('max-skills-value');
    if (slider) {
      slider.value = currentMax;
      if (label) label.textContent = currentMax;
      slider.addEventListener('input', () => {
        if (label) label.textContent = slider.value;
      });
      slider.addEventListener('change', async () => {
        const v = parseInt(slider.value, 10);
        if (label) label.textContent = v;
        try {
          await apiCall('POST', '/api/generation-settings', { max_skills: v });
        } catch (e) {
          console.warn('Failed to save max_skills setting:', e);
        }
      });
    }
  })();

  // Track which panes have been loaded to avoid re-fetching
  window._reviewPaneLoaded = {};

  // Restore previously active pane (defaults to 'experiences' on first visit)
  await switchReviewSubtab(window._activeReviewPane || 'experiences');
}

// Track which pane is currently active
window._activeReviewPane = 'experiences';

async function switchReviewSubtab(pane) {
  // Update button states
  document.querySelectorAll('.review-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pane === pane);
  });

  // Hide all panes, show the selected one
  document.querySelectorAll('.review-pane').forEach(p => p.style.display = 'none');
  const target = document.getElementById(`review-pane-${pane}`);
  if (target) target.style.display = 'block';

  window._activeReviewPane = pane;

  // Lazy-load pane content on first visit
  if (!window._reviewPaneLoaded || !window._reviewPaneLoaded[pane]) {
    await _loadReviewPane(pane);
  }
}

async function _loadReviewPane(pane) {
  if (!window._reviewPaneLoaded) window._reviewPaneLoaded = {};
  window._reviewPaneLoaded[pane] = true;
  switch (pane) {
    case 'experiences':   await buildExperienceReviewTable();  break;
    case 'skills':        await buildSkillsReviewTable();       break;
    case 'achievements':  await buildAchievementsReviewTable(); break;
    case 'summary':       await buildSummaryFocusSection();     break;
    case 'publications':  await buildPublicationsReviewTable(); break;
  }
}

async function buildExperienceReviewTable() {
  const data = window.pendingRecommendations;
  const container = document.getElementById('experience-table-container');
  
  // Get all experiences with details
  let allExperienceIds = [];
  try {
    const statusRes = await fetch('/api/status');
    const statusData = parseStatusResponse(await statusRes.json());
    allExperienceIds = statusData.all_experience_ids || data.recommended_experiences || [];
  } catch (error) {
    allExperienceIds = data.recommended_experiences || [];
  }
  
  const recommendedSet = new Set(data.recommended_experiences || []);
  
  // Fetch all experience details and sort by start date (most recent first)
  const experiencesWithDetails = [];
  for (const expId of allExperienceIds) {
    const details = await getExperienceDetails(expId);
    experiencesWithDetails.push({ id: expId, details });
  }
  
  // Sort by start date (most recent first)
  experiencesWithDetails.sort((a, b) => {
    const aStart = a.details?.start_date || '0';
    const bStart = b.details?.start_date || '0';
    return bStart.localeCompare(aStart);
  });
  
  // Build table HTML
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
  
  for (const { id: expId, details } of experiencesWithDetails) {
    const isRecommended = recommendedSet.has(expId);
    const recommendation = getExperienceRecommendation(expId, data);
    const confidence = getConfidenceLevel(expId, data);
    const reasoning = getExperienceReasoning(expId, data);
    
    const title = details ? details.title : expId;
    const company = details ? details.company : '';
    const startDate = details?.start_date || '';
    const endDate = details?.end_date || 'present';
    const duration = startDate && endDate ? `${startDate} - ${endDate}` : (details?.duration || '');
    
    // Determine default action based on LLM recommendation level
    let defaultAction = 'exclude';
    if (recommendation === 'Emphasize') {
      defaultAction = 'emphasize';
    } else if (recommendation === 'Include') {
      defaultAction = 'include';
    } else if (recommendation === 'De-emphasize') {
      defaultAction = 'de-emphasize';
    } else if (recommendation === 'Omit') {
      defaultAction = 'exclude';
    } else if (isRecommended) {
      // Fallback for backwards compatibility with old format
      defaultAction = 'include';
    }
    
    // Store default selection
    userSelections.experiences[expId] = (window._savedDecisions?.experience_decisions || {})[expId] || defaultAction;
    
    // Prepare display text - show the actual LLM recommendation
    const recommendationText = recommendation || "Include";
    const confidenceBadge = `<span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>`;
    const reasoningText = reasoning || "This experience was selected based on its relevance to the position requirements.";
    
    tableHTML += `
      <tr data-exp-id="${expId}" data-start-date="${startDate}">
        <td>
          <strong>${title}</strong><br>
          <span style="color: #6b7280;">${company}</span>
        </td>
        <td style="white-space: nowrap;">${duration}</td>
        <td><strong>${recommendationText}</strong></td>
        <td>${confidenceBadge}</td>
        <td style="max-width: 300px;"><small>${reasoningText}</small></td>
        <td class="action-btns">
          <button class="icon-btn ${defaultAction === 'emphasize' ? 'active' : ''}" data-action="emphasize" title="Emphasize - Feature prominently with full details" style="color: #10b981; font-size: 1.5em;">➕</button>
          <button class="icon-btn ${defaultAction === 'include' ? 'active' : ''}" data-action="include" title="Include - Standard treatment" style="font-size: 1.3em;">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" title="De-emphasize - Brief mention only" style="color: #f59e0b; font-size: 1.5em;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude' ? 'active' : ''}" data-action="exclude" title="Exclude - Omit from CV" style="color: #ef4444; font-size: 1.3em;">✗</button>
          <button class="icon-btn" data-action="reorder" title="Reorder bullet points for this experience" style="color:#6366f1;font-size:1.1em;">↕</button>
        </td>
      </tr>
    `;
  }
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;

  // Delegated click handler for experience action buttons (data-exp-id on <tr> avoids onclick injection)
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
    } else if (action) {
      handleActionClick(expId, action, 'experience');
    }
  });

  // Bulk toolbar (injected before DataTable initialises so it sits above the search box)
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

  // Initialize DataTable
  $('#experience-review-table').DataTable({
    paging: false,
    order: [[1, 'desc']], // Sort by dates column (most recent first)
    language: {
      search: "Filter experiences:"
    }
  });
  _updatePageEstimate();
}

async function buildSkillsReviewTable() {
  const data = window.pendingRecommendations;
  const container = document.getElementById('skills-table-container');

  // Get all skills from the API status
  let allSkills = [];
  try {
    const statusRes = await fetch('/api/status');
    const statusData = parseStatusResponse(await statusRes.json());
    allSkills = statusData.all_skills || [];
  } catch (error) {
    console.error('Error fetching all skills:', error);
    // Fallback to just recommended skills
    allSkills = data.recommended_skills || [];
  }

  // Detect skills recommended by LLM that aren't in master CV and prepend them
  const masterSkillNames = new Set(allSkills.map(s => (typeof s === 'string' ? s : s.name || s)));
  const newSkills = (data.recommended_skills || []).filter(s => !masterSkillNames.has(s));
  window._newSkillsFromLLM = newSkills;  // track for submitSkillDecisions
  if (newSkills.length > 0) {
    allSkills = [...newSkills.map(s => ({ name: s, _isNew: true })), ...allSkills];
  }

  // If we got no skills, show a message
  if (allSkills.length === 0) {
    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #6b7280;">No skills found in master CV data.</p>';
    return;
  }

  // Sort skills: Emphasize > Include > De-emphasize > Omit (new skills stay at top)
  const recommendationOrder = { 'Emphasize': 0, 'Include': 1, 'De-emphasize': 2, 'Omit': 3 };
  const masterSkills = allSkills.filter(s => !s._isNew);
  const sortedMaster = masterSkills.slice().sort((a, b) => {
    const aName = typeof a === 'string' ? a : a.name || a;
    const bName = typeof b === 'string' ? b : b.name || b;
    const aOrder = recommendationOrder[getSkillRecommendation(aName, data)] ?? 3;
    const bOrder = recommendationOrder[getSkillRecommendation(bName, data)] ?? 3;
    return aOrder - bOrder;
  });
  allSkills = [...allSkills.filter(s => s._isNew), ...sortedMaster];

  const recommendedSet = new Set(data.recommended_skills || []);
  
  let tableHTML = `
    <table id="skills-review-table" class="review-table">
      <thead>
        <tr>
          <th>Skill</th>
          <th>Recommendation</th>
          <th>Confidence</th>
          <th>Reasoning</th>
          <th>Your Selection</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  for (const skill of allSkills) {
    const skillName = typeof skill === 'string' ? skill : skill.name || skill;
    const isNew = skill._isNew === true;
    const isRecommended = recommendedSet.has(skillName);
    const recommendation = getSkillRecommendation(skillName, data);
    const confidence = getSkillConfidence(skillName, data);
    const reasoning = getSkillReasoning(skillName, data);

    // Determine default action based on LLM recommendation level
    let defaultAction = 'exclude';
    if (recommendation === 'Emphasize') {
      defaultAction = 'emphasize';
    } else if (recommendation === 'Include') {
      defaultAction = 'include';
    } else if (recommendation === 'De-emphasize') {
      defaultAction = 'de-emphasize';
    } else if (recommendation === 'Omit') {
      defaultAction = 'exclude';
    } else if (isRecommended || isNew) {
      // LLM-suggested skill (including new ones not yet in CV) — default include
      defaultAction = 'include';
    }

    // Store default selection
    userSelections.skills[skillName] = (window._savedDecisions?.skill_decisions || {})[skillName] || defaultAction;

    // Prepare display text
    const newBadge = isNew
      ? '<span title="This skill was suggested by the AI but is not yet in your CV profile. If included, it will be added to your generated CV." style="margin-left:6px;font-size:10px;color:#dc7900;border:1px solid #dc7900;border-radius:3px;padding:1px 5px;cursor:help;">⚠ Not in CV profile</span>'
      : '';
    const recommendationText = recommendation || (isNew ? 'Include (AI suggested)' : 'Omit');
    const confidenceBadge = `<span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>`;
    const reasoningText = reasoning || (isNew ? 'Recommended by AI based on job requirements but not currently in your master CV.' : 'This skill was not specifically mentioned in the job requirements.');
    const rowStyle = isNew ? 'background:#fffbeb;' : '';

    tableHTML += `
      <tr data-skill="${escapeHtml(skillName)}" style="${rowStyle}">
        <td><strong>${escapeHtml(skillName)}</strong>${newBadge}</td>
        <td><strong>${escapeHtml(recommendationText)}</strong></td>
        <td>${confidenceBadge}</td>
        <td style="max-width: 300px;"><small>${escapeHtml(reasoningText)}</small></td>
        <td class="action-btns">
          <button class="icon-btn ${defaultAction === 'emphasize' ? 'active' : ''}" data-action="emphasize" title="Emphasize - Feature prominently" style="color: #10b981; font-size: 1.5em;">➕</button>
          <button class="icon-btn ${defaultAction === 'include' ? 'active' : ''}" data-action="include" title="Include - Standard listing" style="font-size: 1.3em;">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" title="De-emphasize - Brief mention" style="color: #f59e0b; font-size: 1.5em;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude' ? 'active' : ''}" data-action="exclude" title="Exclude - Omit from CV" style="color: #ef4444; font-size: 1.3em;">✗</button>
        </td>
      </tr>
    `;
  }
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;

  // Delegated click handler for skill action buttons (data-skill on <tr> avoids onclick injection)
  container.querySelector('#skills-review-table tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const tr = btn.closest('tr[data-skill]');
    if (!tr) return;
    const action = btn.dataset.action;
    if (action) handleActionClick(tr.dataset.skill, action, 'skill');
  });

  // Bulk toolbar
  const skillToolbar = document.createElement('div');
  skillToolbar.className = 'bulk-toolbar';
  skillToolbar.innerHTML = `
    <span>Bulk:</span>
    <button class="bulk-btn bulk-recommended" onclick="bulkAction('recommended','skill')" title="Set all to the LLM recommendation">✨ Accept All Recommended</button>
    <button class="bulk-btn bulk-emphasize"   onclick="bulkAction('emphasize','skill')">➕ Emphasize All</button>
    <button class="bulk-btn bulk-include"     onclick="bulkAction('include','skill')">✓ Include All</button>
    <button class="bulk-btn bulk-exclude"     onclick="bulkAction('exclude','skill')">✗ Exclude All</button>
  `;
  container.insertBefore(skillToolbar, container.firstChild);

  // Initialize DataTable
  $('#skills-review-table').DataTable({
    paging: false,
    language: {
      search: "Filter skills:"
    }
  });
  _updatePageEstimate();
}

// ==== Achievements Review ====

window.achievementDecisions = {};

async function buildAchievementsReviewTable() {
  const container = document.getElementById('achievements-table-container');
  if (!container) return;

  container.innerHTML = '<p style="padding:20px;text-align:center;color:#6b7280;">Loading achievements…</p>';

  // Fetch achievements directly from the master fields endpoint (robust fallback)
  let allAchievements = [];
  try {
    const res = await fetch('/api/master-fields');
    const masterData = await res.json();
    allAchievements = masterData.selected_achievements || [];
  } catch (err) {
    // Secondary fallback: /api/status
    try {
      const res2 = await fetch('/api/status');
      const statusData = await res2.json();
      allAchievements = statusData.all_achievements || [];
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

  // Sort: recommended first, then by importance descending
  allAchievements = [...allAchievements].sort((a, b) => {
    const aRec = recommendedSet.has(a.id) ? 1 : 0;
    const bRec = recommendedSet.has(b.id) ? 1 : 0;
    if (bRec !== aRec) return bRec - aRec;
    return (b.importance || 0) - (a.importance || 0);
  });

  // Initialise decisions
  window.achievementDecisions = {};
  allAchievements.forEach(ach => {
    const rec = getAchievementRecommendation(ach.id, data);
    let defaultAction = 'include';
    if (rec === 'Emphasize')    defaultAction = 'emphasize';
    else if (rec === 'Include') defaultAction = 'include';
    else if (rec === 'De-emphasize') defaultAction = 'de-emphasize';
    else if (rec === 'Omit')    defaultAction = 'exclude';
    window.achievementDecisions[ach.id] = defaultAction;
  });
  // Apply any previously saved user decisions over the LLM defaults
  const savedAchDecs = window._savedDecisions?.achievement_decisions || {};
  if (Object.keys(savedAchDecs).length > 0) Object.assign(window.achievementDecisions, savedAchDecs);

  let tableHTML = `
    <table id="achievements-review-table" class="review-table">
      <thead>
        <tr>
          <th>Achievement</th>
          <th>Recommendation</th>
          <th>Confidence</th>
          <th>Reasoning</th>
          <th>Your Selection</th>
        </tr>
      </thead>
      <tbody>
  `;

  allAchievements.forEach(ach => {
    const id            = ach.id || ach.title || '';
    const title         = ach.title || id;
    const desc          = ach.description || '';
    const recommendation = getAchievementRecommendation(id, data);
    const confidence    = getAchievementConfidence(id, data, ach.importance);
    const reasoning     = getAchievementReasoning(id, data, ach);
    const defaultAction = window.achievementDecisions[id];
    const confidenceBadge = `<span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>`;

    tableHTML += `
      <tr data-ach-id="${escapeHtml(id)}">
        <td>
          <strong>${escapeHtml(title)}</strong>
          ${desc ? `<br><small style="color:#6b7280;">${escapeHtml(desc.slice(0, 120))}${desc.length > 120 ? '…' : ''}</small>` : ''}
        </td>
        <td><strong>${escapeHtml(recommendation)}</strong></td>
        <td>${confidenceBadge}</td>
        <td style="max-width:280px;"><small>${escapeHtml(reasoning)}</small></td>
        <td class="action-btns">
          <button class="icon-btn ${defaultAction === 'emphasize'    ? 'active' : ''}" data-action="emphasize"    title="Emphasize — feature prominently"  style="color:#10b981;font-size:1.5em;">➕</button>
          <button class="icon-btn ${defaultAction === 'include'      ? 'active' : ''}" data-action="include"      title="Include — standard treatment"      style="font-size:1.3em;">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" title="De-emphasize — brief mention only"  style="color:#f59e0b;font-size:1.5em;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude'      ? 'active' : ''}" data-action="exclude"      title="Exclude — omit from CV"            style="color:#ef4444;font-size:1.3em;">✗</button>
        </td>
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  container.innerHTML = tableHTML;
  // Delegated click handler for achievement action buttons (data-ach-id on <tr> avoids onclick injection)
  container.querySelector('tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const tr = btn.closest('tr[data-ach-id]');
    if (!tr) return;
    const action = btn.dataset.action;
    if (action) handleAchievementAction(tr.dataset.achId, action);
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
  const decisions = window.achievementDecisions;
  const count = Object.keys(decisions).length;
  if (count === 0) return;
  try {
    const response = await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'achievements', decisions })
    });
    if (response.ok) {
      showAlertModal('✅ Achievement Selections Saved', `Saved selections for ${count} achievements.`);
    } else {
      const err = await response.json();
      showAlertModal('❌ Error', `Failed to save: ${err.error || 'Unknown error'}`);
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save achievement selections.');
  }
}

// ==== Summary Focus Section ====

async function buildSummaryFocusSection() {
  const container = document.getElementById('summary-focus-container');
  if (!container) return;

  const data = window.pendingRecommendations;

  let professionalSummaries = {};
  try {
    const res = await fetch('/api/master-fields');
    const masterData = await res.json();
    professionalSummaries = masterData.professional_summaries || {};
  } catch (err) {
    // fallback to status endpoint
    try {
      const res2 = await fetch('/api/status');
      const statusData = await res2.json();
      professionalSummaries = statusData.professional_summaries || {};
    } catch (err2) {
      container.innerHTML = '<p style="color:#ef4444;">Failed to load professional summaries.</p>';
      return;
    }
  }

  const summaryKeys = Object.keys(professionalSummaries);
  if (summaryKeys.length === 0) {
    container.innerHTML = '<p style="color:#6b7280;font-size:0.9em;">No professional summaries configured in master CV data.</p>';
    return;
  }

  // The LLM's summary_focus may be a free-text description rather than a key.
  // Show it as guidance, and let the user pick a key.
  const llmSummaryText = data.summary_focus || '';
  const llmGuidanceHTML = llmSummaryText
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;margin-bottom:16px;">
        <strong style="color:#166534;">💡 AI Recommendation:</strong>
        <p style="margin:6px 0 0;color:#166534;font-size:0.9em;">${escapeHtml(llmSummaryText)}</p>
       </div>`
    : '';

  // Suggested content reordering
  const reorderingText = data.suggested_content_reordering || '';
  const reorderingHTML = reorderingText
    ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:16px;">
        <strong style="color:#1e40af;">📋 Suggested Content Order:</strong>
        <p style="margin:6px 0 0;color:#1e3a8a;font-size:0.9em;white-space:pre-line;">${escapeHtml(reorderingText)}</p>
       </div>`
    : '';

  // Default: pick key closest to llmSummaryText or 'default'; honour any previously saved choice
  const llmDefaultKey = summaryKeys.find(k => llmSummaryText.toLowerCase().includes(k.replace(/_/g, ' '))) || 'default';
  const defaultKey = window._savedDecisions?.summary_focus_override || window.selectedSummaryKey || llmDefaultKey;
  window.selectedSummaryKey = defaultKey;

  let radiosHTML = summaryKeys.map(key => {
    const preview = (professionalSummaries[key] || '').slice(0, 180);
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const checked = key === defaultKey ? 'checked' : '';
    return `
      <label style="display:block;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer;${checked ? 'border-color:#10b981;background:#f0fdf4;' : ''}">
        <input type="radio" name="summary_key" value="${escapeHtml(key)}" ${checked}
          onchange="selectSummaryKey('${escapeHtml(key)}')" style="margin-right:8px;">
        <strong>${escapeHtml(label)}</strong>
        <p style="margin:6px 0 0;font-size:0.85em;color:#6b7280;">${escapeHtml(preview)}${preview.length === 180 ? '…' : ''}</p>
      </label>`;
  }).join('');

  container.innerHTML = `
    ${llmGuidanceHTML}
    ${reorderingHTML}
    <div id="summary-radios">${radiosHTML}</div>
    <div style="margin-top:12px;">
      <button class="submit-btn" onclick="submitSummaryFocusDecision()">Save Summary Selection</button>
    </div>
  `;

  // Pre-save the default so Generate CV picks it up even without explicit user click
  await saveSummaryFocusToBackend(defaultKey);
}

function selectSummaryKey(key) {
  window.selectedSummaryKey = key;
  // Update visual selection
  document.querySelectorAll('#summary-radios label').forEach(label => {
    const radio = label.querySelector('input[type=radio]');
    const isSelected = radio && radio.value === key;
    label.style.borderColor = isSelected ? '#10b981' : '#e5e7eb';
    label.style.background  = isSelected ? '#f0fdf4' : '';
  });
}

async function saveSummaryFocusToBackend(key) {
  try {
    await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'summary_focus', decisions: key })
    });
  } catch (e) { /* silent */ }
}

async function submitSummaryFocusDecision() {
  const key = window.selectedSummaryKey;
  if (!key) return;
  await saveSummaryFocusToBackend(key);
  showAlertModal('✅ Summary Selection Saved', `Selected summary: <strong>${key.replace(/_/g, ' ')}</strong>`);
}

// Track publication accept/reject decisions: cite_key → true (accept) | false (reject)
window.publicationDecisions = {};

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
    // totalCount already set from API response above
  } catch (err) {
    console.error('Error fetching publication recommendations:', err);
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
          <button class="icon-btn${isAccepted ? ' active' : ''}" data-action="accept" title="Include in CV"
              style="color:#10b981;font-size:1.3em;" id="pub-accept-${rank}">✓</button>
          <button class="icon-btn${!isAccepted ? ' active' : ''}" data-action="reject" title="Exclude from CV"
              style="color:#ef4444;font-size:1.3em;" id="pub-reject-${rank}">✗</button>
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

function filterPublicationsTable(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#publications-review-table tbody tr:not(.pub-divider-row)').forEach(row => {
    row.style.display = q === '' || row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

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

async function submitPublicationDecisions() {
  const decisions = window.publicationDecisions || {};
  const count = Object.keys(decisions).length;
  if (count === 0) {
    showAlertModal('No Publications', 'No publication decisions to save.');
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
      const accepted = Object.values(window.publicationDecisions).filter(Boolean).length;
      const rejected = count - accepted;
      showAlertModal(
        '✅ Publication Selections Saved',
        `Kept <strong>${accepted}</strong> publication${accepted !== 1 ? 's' : ''}; excluded <strong>${rejected}</strong>.<br><br>These selections will be applied when generating your CV.`
      );
    } else {
      const err = await response.json();
      showAlertModal('❌ Error', `Failed to save publication selections: ${err.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Error saving publication decisions:', err);
    showAlertModal('❌ Error', 'Failed to save publication selections. Please try again.');
  }
}

function handleActionClick(itemId, action, type) {
  // Remove active class from all buttons in this row
  const row = type === 'experience' 
    ? document.querySelector(`tr[data-exp-id="${itemId}"]`)
    : document.querySelector(`tr[data-skill="${itemId}"]`);
  
  const buttons = row.querySelectorAll('.icon-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Add active class to clicked button
  const clickedBtn = row.querySelector(`[data-action="${action}"]`);
  clickedBtn.classList.add('active');
  
  // Store selection
  if (type === 'experience') {
    userSelections.experiences[itemId] = action;
  } else {
    userSelections.skills[itemId] = action;
  }
  _updatePageEstimate();
}

/**
 * Apply a bulk action to all visible (DataTable-filtered) rows in one table.
 * action: 'emphasize' | 'include' | 'de-emphasize' | 'exclude' | 'recommended'
 * type:   'experience' | 'skill'
 */
function bulkAction(action, type) {
  const tableId  = type === 'experience' ? '#experience-review-table' : '#skills-review-table';
  const data     = window.pendingRecommendations || {};
  const dt       = $.fn.DataTable.isDataTable(tableId) ? $(tableId).DataTable() : null;

  // Iterate only the rows that DataTable currently shows (respects search filter)
  const rows = dt
    ? dt.rows({ search: 'applied' }).nodes().toArray()
    : Array.from(document.querySelectorAll(`${tableId} tbody tr`));

  rows.forEach(row => {
    const expId    = row.dataset.expId;
    const skillId  = row.dataset.skill;
    const itemId   = expId || skillId;
    if (!itemId) return;

    let resolvedAction = action;
    if (action === 'recommended') {
      resolvedAction = type === 'experience'
        ? _resolvedExpAction(itemId, data)
        : _resolvedSkillAction(itemId, data);
    }

    // Update button states
    row.querySelectorAll('.icon-btn').forEach(btn => btn.classList.remove('active'));
    const target = row.querySelector(`[data-action="${resolvedAction}"]`);
    if (target) target.classList.add('active');

    // Store selection
    if (type === 'experience') {
      userSelections.experiences[itemId] = resolvedAction;
    } else {
      userSelections.skills[itemId] = resolvedAction;
    }
  });
  _updatePageEstimate();
}

function _resolvedExpAction(expId, data) {
  const rec = getExperienceRecommendation(expId, data);
  if (rec === 'Emphasize')    return 'emphasize';
  if (rec === 'Include')      return 'include';
  if (rec === 'De-emphasize') return 'de-emphasize';
  return 'exclude';
}

function _resolvedSkillAction(skillName, data) {
  const rec = getSkillRecommendation(skillName, data);
  if (rec === 'Emphasize')    return 'emphasize';
  if (rec === 'Include')      return 'include';
  if (rec === 'De-emphasize') return 'de-emphasize';
  return 'exclude';
}

/**
 * Heuristic page-count estimator.
 * Updates the #page-estimate-widget banner whenever selections change.
 *
 * Character budget assumptions (2-column CV, ~A4):
 *   Header/contact:           ~300 chars
 *   Summary section:          ~500 chars
 *   Per emphasize experience: ~1200 chars (title + company + 5 bullets)
 *   Per include experience:   ~800 chars  (title + company + 3 bullets)
 *   Per de-emphasize exp:     ~300 chars  (title + company only)
 *   Per skill (any active):   ~25 chars
 *   Fixed overhead (sections, margins): ~200 chars
 *   Chars per page: ~3200
 */
function _updatePageEstimate() {
  const widget = document.getElementById('page-estimate-widget');
  if (!widget) return;

  const CHARS_PER_PAGE = 3200;
  const CHARS_HEADER   = 300;
  const CHARS_SUMMARY  = 500;
  const CHARS_EXP      = { emphasize: 1200, include: 800, 'de-emphasize': 300 };
  const CHARS_SKILL    = 25;
  const CHARS_OVERHEAD = 200;

  let total = CHARS_HEADER + CHARS_SUMMARY + CHARS_OVERHEAD;

  const expSels = userSelections.experiences || {};
  for (const action of Object.values(expSels)) {
    total += CHARS_EXP[action] || 0;
  }

  const skillSels = userSelections.skills || {};
  const activeSkills = Object.values(skillSels).filter(a => a !== 'exclude').length;
  total += activeSkills * CHARS_SKILL;

  const pages = total / CHARS_PER_PAGE;
  const pct   = Math.min(100, (pages / 3) * 100); // bar maxes at 3 pages

  const label  = document.getElementById('pe-label');
  const fill   = document.getElementById('pe-fill');
  const icon   = document.getElementById('pe-icon');

  const expCount   = Object.values(expSels).filter(a => a !== 'exclude').length;
  const totalExp   = Object.keys(expSels).length;

  let cls, colour, msg;
  if (pages < 1.8) {
    cls = 'ok';   colour = '#22c55e';
    msg = `≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Looking good — may have room to add more.`;
    icon.textContent = '📄';
  } else if (pages <= 2.3) {
    cls = 'ok';   colour = '#22c55e';
    msg = `≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Ideal length.`;
    icon.textContent = '✅';
  } else if (pages <= 2.8) {
    cls = 'warn'; colour = '#f59e0b';
    msg = `⚠️ ≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Getting long \u2014 consider de-emphasising older roles.`;
    icon.textContent = '⚠️';
  } else {
    cls = 'over'; colour = '#ef4444';
    msg = `🚨 ≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Likely too long \u2014 exclude or de-emphasise some entries.`;
    icon.textContent = '🚨';
  }

  widget.className = `page-estimate ${cls}`;
  if (label) label.textContent = msg;
  if (fill)  { fill.style.width = `${pct}%`; fill.style.background = colour; }
}

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
      const result = await response.json();
      showAlertModal('✅ Experience Decisions Submitted', `Submitted decisions for ${count} experiences. ${result.message || 'Saved successfully!'}<br><br><strong>Next:</strong> Submit your skill decisions below.`);
    } else {
      const error = await response.json();
      showAlertModal('❌ Error', `Error submitting decisions: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error submitting experience decisions:', error);
    showAlertModal('❌ Error', 'Failed to submit decisions. Please try again.');
  }
}

async function submitSkillDecisions() {
  const decisions = userSelections.skills;
  const count = Object.keys(decisions).length;
  
  if (count === 0) {
    showAlertModal('No Selections', 'Please select actions for at least one skill before submitting.');
    return;
  }
  
  try {
    // Extra skills: LLM-suggested skills not in master CV that the user chose to include/emphasize
    const extraSkills = (window._newSkillsFromLLM || []).filter(s => {
      const d = decisions[s];
      return d === 'include' || d === 'emphasize';
    });

    const response = await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'skills',
        decisions: decisions,
        extra_skills: extraSkills
      })
    });

    if (response.ok) {
      const result = await response.json();
      const extraNote = extraSkills.length > 0 ? `<br><small style="color:#dc7900;">⚠ ${extraSkills.length} AI-suggested skill(s) not in your CV profile will be added to this generated CV only.</small>` : '';
      showAlertModal('✅ Skill Decisions Submitted', `Submitted decisions for ${count} skills. ${result.message || 'Saved successfully!'}${extraNote}<br><br><strong>You can now click "Generate CV" to create your customized CV.</strong>`);
      
      // Add confirmation message to conversation
      if (Object.keys(userSelections.experiences).length > 0 && Object.keys(userSelections.skills).length > 0) {
        appendMessage('assistant', '✅ All decisions recorded! You can now click "Generate CV" to create your customized CV, or adjust your selections in the Customizations tab.');
      }
    } else {
      const error = await response.json();
      showAlertModal('❌ Error', `Error submitting decisions: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error submitting skill decisions:', error);
    showAlertModal('❌ Error', 'Failed to submit decisions. Please try again.');
  }
}

// ==== End Table-Based Review Functions ====

async function populateCustomizationsTab(data) {
  // Store for persistence
  tabData.customizations = data;
  
  const content = document.getElementById('document-content');
  let html = '<h1>⚙️ Recommended Customizations</h1>';
  
  if (data.recommended_experiences && data.recommended_experiences.length > 0) {
    html += '<h2>📊 Recommended Experiences</h2>';
    
    // Fetch details for each experience
    for (const exp of data.recommended_experiences) {
      const confidence = getConfidenceLevel(exp, data);
      const reasoning = getExperienceReasoning(exp, data);
      const details = await getExperienceDetails(exp);
      
      html += `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 12px 0; padding: 16px; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #1f2937;">${exp}</h3>
            <span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>
          </div>`;
      
      if (details) {
        // Build duration from dates
        let duration = '';
        if (details.start_date || details.end_date) {
          duration = `${details.start_date || ''} - ${details.end_date || 'Present'}`;
        }
        
        html += `
          <div style="margin: 8px 0; padding: 12px; background: #f8f9fa; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; color: #2563eb;">${details.title || 'Position Title'}</h4>
            <p style="margin: 4px 0; color: #6b7280;"><strong>${details.company || 'Company'}</strong>${duration ? ' • ' + duration : ''}</p>`;
        
        if (details.achievements && details.achievements.length > 0) {
          html += '<p style="margin: 8px 0; color: #374151;"><strong>Key Achievements:</strong></p><ul style="margin: 4px 0; color: #6b7280;">';
          details.achievements.slice(0, 3).forEach(achievement => {
            const text = achievement.text || achievement;
            html += `<li>${text}</li>`;
          });
          html += '</ul>';
        }
        html += '</div>';
      } else {
        html += '<p style="margin: 8px 0; color: #6b7280; font-style: italic;">Experience details not found in master CV data</p>';
      }
      
      html += `
          <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <strong>Why this experience:</strong> ${reasoning}
          </div>
        </div>
      `;
    }
  }
  
  if (data.recommended_skills && data.recommended_skills.length > 0) {
    html += '<h2>🛠️ Recommended Skills to Emphasize</h2>';
    
    data.recommended_skills.forEach((skill, index) => {
      const confidence = getSkillConfidence(skill, data);
      const reasoning = getSkillReasoning(skill, data);
      
      html += `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 12px 0; padding: 16px; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0; color: #1f2937;">${skill}</h4>
            <span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>
          </div>
          <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
            <strong>Strategic value:</strong> ${reasoning}
          </div>
        </div>
      `;
    });
  }
  
  if (data.reasoning) {
    html += '<h2>💡 Overall Strategy</h2>';
    html += `<div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">${data.reasoning}</div>`;
  }
  
  content.innerHTML = html;
}

function populateCVTab(cvData) {
  // Store for persistence
  tabData.cv = cvData;
  
  const content = document.getElementById('document-content');
  let html = '<h1>📄 Generated CV Preview</h1>';
  
  if (typeof cvData === 'string') {
    html += `<div style="white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 20px; border-radius: 8px;">${cvData}</div>`;
  } else {
    html += '<p>CV generated successfully. Download options available in the Download tab.</p>';
  }
  
  content.innerHTML = html;
}

async function populateDownloadTab(cvData) {
  // Store for persistence
  tabData.cv = cvData;

  const content = document.getElementById('document-content');
  let html = '<h1>⬇️ Download Generated Files</h1>';

  if (!cvData || (typeof cvData === 'object' && Object.keys(cvData).length === 0)) {
    html += '<div class="empty-state"><div class="icon">⬇️</div><h3>No Files Available</h3><p>Generate a CV first to see download options.</p></div>';
    content.innerHTML = html;
    return;
  }

  content.innerHTML = html + '<p style="color:#6b7280;margin-bottom:16px;">Running ATS validation…</p>';

  // ── Fetch ATS validation ────────────────────────────────────────────────
  let checks = [], pageCount = null, atsSummary = {pass:0,warn:0,fail:0};
  let atsError = null;
  try {
    const atsRes  = await fetch('/api/ats-validate');
    const atsData = await atsRes.json();
    if (atsData.ok) {
      checks     = atsData.checks     || [];
      pageCount  = atsData.page_count ?? null;
      atsSummary = atsData.summary    || atsSummary;
    } else {
      atsError = atsData.error || 'Validation failed';
    }
  } catch (err) {
    atsError = `Network error: ${err.message}`;
  }

  // ── Determine which formats are blocked ─────────────────────────────────
  // Per spec:
  //   - DOCX-specific failures → block DOCX downloads
  //   - HTML/JSON-LD failures  → block HTML downloads
  //   - PDF failures           → block PDF downloads
  //   - ats_keyword_presence fail (format='all') → block ALL downloads
  const keywordFail = checks.some(c => c.name === 'ats_keyword_presence' && c.status === 'fail');
  const blockDocx   = keywordFail || checks.some(c => c.format === 'docx' && c.status === 'fail');
  const blockHtml   = keywordFail || checks.some(c => c.format === 'html' && c.status === 'fail');
  const blockPdf    = keywordFail || checks.some(c => c.format === 'pdf'  && c.status === 'fail');
  const anyFail     = atsSummary.fail > 0;

  // ── Collect files ────────────────────────────────────────────────────────
  const files = [];
  if (typeof cvData === 'object' && cvData.files && Array.isArray(cvData.files)) {
    for (const filename of cvData.files) {
      let icon, description, fmt;
      if (filename.endsWith('.pdf')) {
        icon = filename.includes('ATS') ? '🤖' : '📄';
        description = filename.includes('ATS')
          ? 'ATS-optimised PDF — machine-readable for automated screening'
          : 'Human-readable PDF — for human reviewers and printing';
        fmt = 'pdf';
      } else if (filename.endsWith('.docx')) {
        icon = '📝';
        description = filename.includes('ATS')
          ? 'ATS-optimised Word document — keyword-optimised for job applications'
          : 'Human-readable Word document — editable format';
        fmt = 'docx';
      } else if (filename.endsWith('.html')) {
        icon = '🌐';
        description = 'HTML format with embedded JSON-LD structured data';
        fmt = 'html';
      } else if (filename === 'job_description.txt') {
        icon = '📋'; description = 'Original job description reference'; fmt = 'other';
      } else {
        icon = '📁'; description = 'Generated file'; fmt = 'other';
      }
      files.push({ filename, description, icon, fmt });
    }
  }

  // ── Build HTML ───────────────────────────────────────────────────────────
  let out = '<h1>⬇️ Download Generated Files</h1>';

  // Page count badge
  if (pageCount !== null) {
    const pageBad = pageCount < 1.5 || pageCount > 3;
    out += `<div style="display:inline-flex;align-items:center;gap:8px;
              background:${pageBad ? '#fef9c3' : '#f0fdf4'};
              border:1px solid ${pageBad ? '#fde047' : '#bbf7d0'};
              border-radius:8px;padding:8px 14px;margin-bottom:16px;">
      <span style="font-size:1.3em;">📄</span>
      <strong>${pageCount} page${pageCount !== 1 ? 's' : ''}</strong>
      ${pageBad ? `<span style="color:#d97706;font-size:0.88em;">⚠ Senior candidate target is 2–3 pages</span>` : '<span style="color:#166534;font-size:0.88em;">✓ Good length</span>'}
    </div>`;
  }

  // ATS validation panel
  if (atsError) {
    out += `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <strong>⚠ ATS validation error:</strong> ${escapeHtml(atsError)}
    </div>`;
  } else if (checks.length > 0) {
    const statusColour  = atsSummary.fail > 0 ? '#dc2626' : atsSummary.warn > 0 ? '#d97706' : '#166534';
    const statusIcon    = atsSummary.fail > 0 ? '❌' : atsSummary.warn > 0 ? '⚠' : '✅';
    out += `
      <details open style="margin-bottom:20px;">
        <summary style="cursor:pointer;font-weight:700;font-size:1em;padding:8px 0;color:${statusColour};">
          ${statusIcon} ATS Report — ${atsSummary.pass} pass, ${atsSummary.warn} warn, ${atsSummary.fail} fail
        </summary>
        <table class="review-table" style="margin-top:10px;font-size:0.87em;">
          <thead><tr><th>Check</th><th>Format</th><th>Status</th><th>Detail</th></tr></thead>
          <tbody>`;
    for (const chk of checks) {
      const bg   = chk.status === 'pass' ? '#f0fdf4' : chk.status === 'warn' ? '#fef9c3' : '#fee2e2';
      const icon = chk.status === 'pass' ? '✅' : chk.status === 'warn' ? '⚠' : '❌';
      const fmtBadge = `<span style="font-size:11px;background:#e0e7ff;color:#3730a3;border-radius:6px;padding:1px 5px;">${escapeHtml(chk.format)}</span>`;
      out += `<tr style="background:${bg};">
        <td style="font-weight:600;">${escapeHtml(chk.label)}</td>
        <td>${fmtBadge}</td>
        <td style="text-align:center;">${icon}</td>
        <td><small>${escapeHtml(chk.detail)}</small></td>
      </tr>`;
    }
    out += `</tbody></table></details>`;

    if (anyFail) {
      out += `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px 16px;margin-bottom:20px;">
        <strong>❌ Fix required:</strong> Some checks failed. Blocked formats are greyed out below.
        ${keywordFail ? '<br><strong>ATS keyword failure blocks all downloads</strong> — re-run customisations to improve keyword coverage.' : ''}
      </div>`;
    }
  }

  // Download buttons
  out += '<div class="download-section"><div class="download-grid">';
  if (files.length === 0) {
    out += '<p>No downloadable files found. Please try generating your CV again.</p>';
  } else {
    for (const file of files) {
      const blocked = (file.fmt === 'docx' && blockDocx) ||
                      (file.fmt === 'html' && blockHtml) ||
                      (file.fmt === 'pdf'  && blockPdf);
      const btnStyle = blocked
        ? 'cursor:not-allowed;opacity:0.4;background:#9ca3af;border-color:#9ca3af;'
        : '';
      const blockedMsg = blocked
        ? '<div style="font-size:0.78em;color:#dc2626;margin-top:4px;">⛔ Blocked — fix ATS failures first</div>'
        : '';
      out += `
        <div class="download-item" style="${blocked ? 'opacity:0.75;' : ''}">
          <div class="download-icon">${file.icon}</div>
          <div class="download-info">
            <div class="download-name">${escapeHtml(file.filename)}</div>
            <div class="download-description">${escapeHtml(file.description)}</div>
            ${blockedMsg}
          </div>
          ${blocked
            ? `<button class="btn-download" disabled style="${btnStyle}">Blocked</button>`
            : `<a href="/api/download/${encodeURIComponent(file.filename)}"
                  class="download-link" download="${escapeHtml(file.filename)}">
                 <button class="btn-download">Download</button>
               </a>`
          }
        </div>`;
    }
  }
  out += '</div></div>';

  if (cvData.output_dir) {
    out += `<div style="margin-top:20px;padding:12px;background:#f1f5f9;border-radius:6px;font-size:14px;color:#64748b;">
      <strong>Output Directory:</strong> ${escapeHtml(cvData.output_dir)}
    </div>`;
  }

  // ── Persuasion analysis ────────────────────────────────────────────────
  // Show interim loading indicator while fetching
  content.innerHTML = out + '<p style="color:#6b7280;margin-top:16px;font-size:0.9em;">Analysing bullet persuasiveness…</p>';
  let persuasionHtml = '';
  try {
    const pRes  = await fetch('/api/persuasion-check');
    const pData = await pRes.json();
    if (pRes.ok && pData.ok) {
      const ps = pData.summary;
      const scoreColor = ps.flagged === 0 ? '#10b981' : ps.flagged <= 3 ? '#f59e0b' : '#ef4444';
      const scoreLabel = ps.flagged === 0 ? 'Excellent' : ps.flagged <= 3 ? 'Good — minor improvements possible' : 'Needs attention';
      persuasionHtml += `<div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="padding:14px 16px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;cursor:pointer;"
             onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div>
            <span style="font-weight:600;color:#1f2937;">💪 Bullet Persuasiveness</span>
            <span style="margin-left:12px;background:${scoreColor};color:#fff;border-radius:4px;padding:2px 8px;font-size:0.8em;">${scoreLabel}</span>
          </div>
          <div style="font-size:0.85em;color:#6b7280;">
            ${ps.strong_count}/${ps.total_bullets} strong · ${ps.flagged} flagged · click to ${ps.flagged>0?'expand':'collapse'}
          </div>
        </div>`;
      if (pData.findings.length > 0) {
        persuasionHtml += `<div style="padding:12px 16px;display:${ps.flagged<=3?'block':'none'};">`;
        for (const f of pData.findings) {
          const sev = f.severity === 'warning' ? {bg:'#fff7ed',border:'#f59e0b',label:'⚠ Warning'} : {bg:'#f0f9ff',border:'#3b82f6',label:'ℹ Info'};
          persuasionHtml += `<div style="margin-bottom:12px;padding:10px 12px;background:${sev.bg};border-left:3px solid ${sev.border};border-radius:0 6px 6px 0;">
            <div style="font-size:0.8em;color:#6b7280;margin-bottom:4px;">
              <span style="background:${sev.border};color:#fff;border-radius:3px;padding:1px 6px;font-size:0.9em;">${sev.label}</span>
              Bullet ${f.bullet_index + 1}${f.exp_id ? ' · ' + escapeHtml(f.exp_id) : ''}
            </div>
            <div style="font-size:0.9em;color:#374151;margin-bottom:6px;">"${escapeHtml(f.text.length > 120 ? f.text.slice(0,120)+'…' : f.text)}"</div>
            <ul style="margin:0;padding-left:18px;">`;
          for (const issue of f.issues) {
            persuasionHtml += `<li style="font-size:0.85em;color:#6b7280;margin-bottom:2px;">${escapeHtml(issue.suggestion)}</li>`;
          }
          persuasionHtml += `</ul></div>`;
        }
        persuasionHtml += `</div>`;
      } else {
        persuasionHtml += `<div style="padding:12px 16px;color:#10b981;font-size:0.9em;">All bullets meet persuasiveness criteria.</div>`;
      }
      persuasionHtml += `</div>`;
    }
  } catch (e) { /* persuasion check is best-effort */ }

  // Append persuasion panel to main output
  out += persuasionHtml;

  // ── Refine buttons ────────────────────────────────────────────────────
  out += `<div style="margin-top:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;
            border-radius:8px;">
    <div style="font-weight:600;margin-bottom:10px;color:#374151;">↻ Iterative Refinement</div>
    <div style="font-size:0.9em;color:#6b7280;margin-bottom:12px;">
      Go back to refine an earlier step — all prior decisions and approvals are preserved.
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn-secondary" onclick="backToPhase('customizations')" title="Return to Customisations step">
        ↻ Refine Customisations
      </button>
      <button class="btn-secondary" onclick="backToPhase('rewrite')" title="Return to Rewrite Review step">
        ↻ Refine Rewrites
      </button>
      <button class="btn-secondary" onclick="backToPhase('analysis')" title="Return to Analysis step">
        ↻ Re-analyse Job
      </button>
    </div>
  </div>`;

  content.innerHTML = out;
}

// ==== Rewrite Review Functions ====

let rewriteDecisions = {};  // { id: { outcome: 'accept'|'reject'|'edit', final_text: null|string } }
let persuasionWarningsAcknowledged = false;  // Phase 10: track if user reviewed warnings

async function fetchAndReviewRewrites() {
  const loadingMsg = appendLoadingMessage('Checking for text improvements...');
  setLoading(true);
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
    switchTab('customizations');
    const n = rewrites.length;
    appendMessage('assistant', `✏️ I found **${n}** text improvement${n > 1 ? 's' : ''} to review. Look over each suggestion in the **Customizations** tab, then accept, edit, or reject each one before generating your CV.`);
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('❌ Error: ' + err.message, fetchAndReviewRewrites);
  }
}

function renderRewritePanel(rewrites, warnings = []) {
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
  setLoading(true);
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
    switchTab('spell');
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('❌ Error: ' + err.message, submitRewriteDecisions);
  }
}

// ==== End Rewrite Review Functions ====

// ==== Finalise & Harvest Functions ====

async function populateFinaliseTab() {
  const content = document.getElementById('document-content');

  // Fetch current status to get generated files and job analysis for consistency check
  let generated  = null;
  let statusData = null;
  try {
    const res  = await fetch('/api/status');
    statusData = await res.json();
    generated  = statusData.generated_files || null;
  } catch (err) { console.warn('Failed to fetch status for finalise tab:', err); }

  if (!generated || !generated.output_dir) {
    content.innerHTML = `
      <h1>✅ Finalise Application</h1>
      <div class="empty-state">
        <div class="icon">📂</div>
        <h3>No CV Generated Yet</h3>
        <p>Please generate a CV first before finalising.</p>
      </div>`;
    return;
  }

  const files = generated.files || [];

  let html = `
    <h1>✅ Finalise Application</h1>
    <p style="color:#6b7280;margin-bottom:24px;">
      Archive this application to your CV history, update the response library, and optionally
      write any improvements back to Master CV Data.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
      <h3 style="margin:0 0 10px;">📂 Generated Files</h3>
      <ul style="margin:0;padding-left:20px;line-height:1.8;">
        ${files.map(f => `<li><code style="font-size:0.9em;">${escapeHtml(f)}</code></li>`).join('') || '<li>(none)</li>'}
      </ul>
      <p style="margin:8px 0 0;font-size:0.85em;color:#166534;">Output dir: <code>${escapeHtml(generated.output_dir)}</code></p>
    </div>

    <div id="consistency-report"></div>

    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;">📋 Application Status</h3>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;" for="finalise-status">Status</label>
        <select id="finalise-status" style="width:220px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95em;">
          <option value="draft">Draft — not yet sent</option>
          <option value="ready" selected>Ready to send</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;" for="finalise-notes">Notes</label>
        <textarea id="finalise-notes" rows="4"
          style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;
                 font-size:0.92em;resize:vertical;box-sizing:border-box;"
          placeholder="Recruiter name, salary info, follow-up date, interview notes…"></textarea>
      </div>

      <button id="finalise-btn" onclick="finaliseApplication()"
        style="background:#059669;color:#fff;border:none;border-radius:6px;
               padding:10px 24px;font-size:1em;font-weight:600;cursor:pointer;">
        ✅ Finalise &amp; Archive
      </button>
    </div>

    <div id="finalise-result" style="display:none;"></div>
    <div id="harvest-section" style="display:none;"></div>
  `;

  content.innerHTML = html;
  if (statusData) _renderConsistencyReport(statusData);
}

async function finaliseApplication() {
  const btn    = document.getElementById('finalise-btn');
  const result = document.getElementById('finalise-result');
  const status = document.getElementById('finalise-status').value;
  const notes  = document.getElementById('finalise-notes').value;

  btn.disabled    = true;
  btn.textContent = '⏳ Finalising…';
  result.style.display = 'none';
  result.innerHTML     = '';

  try {
    const res  = await fetch('/api/finalise', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, notes }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      result.style.display = 'block';
      result.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
        padding:14px 18px;color:#991b1b;">
        <strong>❌ Error:</strong> ${escapeHtml(data.error || 'Finalise failed')}
      </div>`;
      btn.disabled    = false;
      btn.textContent = '✅ Finalise & Archive';
      return;
    }

    const summary = data.summary || {};
    const hash    = data.commit_hash ? `<code style="font-size:0.85em;">${escapeHtml(data.commit_hash)}</code>` : '(no commit)';
    const gitWarn = data.git_error
      ? `<p style="color:#d97706;font-size:0.87em;margin-top:8px;">⚠ Git: ${escapeHtml(data.git_error)}</p>`
      : '';
    const approvedCount = summary.approved_rewrites ?? 0;
    const atsCount      = (summary.ats_keywords || []).length;

    result.style.display = 'block';
    result.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <strong>✅ Application archived!</strong>
        <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;font-size:0.92em;">
          <li>Status: <strong>${escapeHtml(status)}</strong></li>
          <li>Approved rewrites: ${approvedCount}</li>
          <li>ATS keywords tracked: ${atsCount}</li>
          <li>Git commit: ${hash}</li>
        </ul>
        ${gitWarn}
      </div>`;

    btn.textContent = '✅ Archived';

    // Show harvest section
    await showHarvestSection();
  } catch (err) {
    result.style.display = 'block';
    result.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
      padding:14px 18px;color:#991b1b;">
      <strong>❌ Network error:</strong> ${escapeHtml(err.message)}
    </div>`;
    btn.disabled    = false;
    btn.textContent = '✅ Finalise & Archive';
  }
}

async function showHarvestSection() {
  const section = document.getElementById('harvest-section');
  section.style.display = 'block';
  section.innerHTML = `
    <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
    <p style="color:#6b7280;margin-bottom:16px;">Loading improvement candidates from this session…</p>
    <div style="text-align:center;padding:24px;"><div class="loading-spinner"></div></div>`;

  try {
    const res  = await fetch('/api/harvest/candidates');
    const data = await res.json();

    if (!data.ok) {
      section.innerHTML = `
        <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
          padding:12px 16px;color:#991b1b;">
          ❌ ${escapeHtml(data.error || 'Failed to load candidates')}
        </div>`;
      return;
    }

    const candidates = data.candidates || [];

    if (candidates.length === 0) {
      section.innerHTML = `
        <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
        <div class="empty-state" style="padding:24px 0;">
          <div class="icon">📋</div>
          <h3>No Update Candidates</h3>
          <p>Nothing from this session warrants writing back to the master CV.</p>
        </div>`;
      return;
    }

    const typeIcons = {
      improved_bullet:    '✏️',
      new_skill:          '🛠',
      summary_variant:    '📝',
      skill_gap_confirmed:'✅',
    };

    let html = `
      <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
      <p style="color:#6b7280;margin-bottom:16px;">
        Select improvements from this session to write back to <code>Master_CV_Data.json</code>.
        No items are pre-selected — choose only what you want to keep.
      </p>
      <table class="review-table" style="margin-bottom:16px;">
        <thead>
          <tr>
            <th style="width:36px;text-align:center;">Include</th>
            <th>Type</th>
            <th>Change</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>`;

    for (const c of candidates) {
      const icon     = typeIcons[c.type] || '📌';
      const original = c.original && c.original !== '(not in master data)'
        ? `<div style="font-size:0.82em;color:#6b7280;margin-top:4px;margin-bottom:2px;
               text-decoration:line-through;">${escapeHtml(c.original)}</div>`
        : '';
      html += `
        <tr id="harvest-row-${escapeHtml(c.id)}">
          <td style="text-align:center;">
            <input type="checkbox" id="harvest-chk-${escapeHtml(c.id)}"
              data-harvest-id="${escapeHtml(c.id)}" style="width:16px;height:16px;cursor:pointer;">
          </td>
          <td>
            <span title="${escapeHtml(c.type)}">${icon}</span>
            <span style="font-size:0.85em;color:#475569;margin-left:4px;">${escapeHtml(c.type.replace(/_/g,' '))}</span>
          </td>
          <td>
            <div style="font-weight:500;">${escapeHtml(c.label)}</div>
            ${original}
            <div style="font-size:0.88em;color:#1e293b;margin-top:2px;">${escapeHtml(c.proposed)}</div>
          </td>
          <td style="font-size:0.85em;color:#64748b;">${escapeHtml(c.rationale)}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>
      <div style="display:flex;gap:12px;align-items:center;">
        <button onclick="applyHarvestSelections()"
          style="background:#0ea5e9;color:#fff;border:none;border-radius:6px;
                 padding:10px 24px;font-size:1em;font-weight:600;cursor:pointer;" id="harvest-apply-btn">
          📥 Apply Selected Updates
        </button>
        <button onclick="document.getElementById('harvest-section').style.display='none'"
          style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:6px;
                 padding:10px 20px;font-size:0.95em;cursor:pointer;">
          Skip
        </button>
      </div>
      <div id="harvest-result" style="margin-top:16px;"></div>`;

    section.innerHTML = html;
  } catch (err) {
    section.innerHTML = `
      <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
        padding:12px 16px;color:#991b1b;">
        ❌ Network error: ${escapeHtml(err.message)}
      </div>`;
  }
}

async function applyHarvestSelections() {
  const checkboxes   = document.querySelectorAll('input[data-harvest-id]:checked');
  const selectedIds  = Array.from(checkboxes).map(cb => cb.dataset.harvestId);
  const resultDiv    = document.getElementById('harvest-result');
  const applyBtn     = document.getElementById('harvest-apply-btn');

  if (selectedIds.length === 0) {
    resultDiv.innerHTML = `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;
      padding:10px 16px;color:#92400e;">No items selected. Tick the checkboxes for changes you want to keep.</div>`;
    return;
  }

  applyBtn.disabled    = true;
  applyBtn.textContent = '⏳ Applying…';
  resultDiv.innerHTML  = '';

  try {
    const res  = await fetch('/api/harvest/apply', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ selected_ids: selectedIds }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      resultDiv.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
        padding:12px 16px;color:#991b1b;">
        ❌ ${escapeHtml(data.error || 'Apply failed')}
      </div>`;
      applyBtn.disabled    = false;
      applyBtn.textContent = '📥 Apply Selected Updates';
      return;
    }

    const count    = data.written_count ?? 0;
    const hash     = data.commit_hash
      ? `<code style="font-size:0.85em;">${escapeHtml(data.commit_hash)}</code>`
      : '(no commit)';
    const gitWarn  = data.git_error
      ? `<p style="color:#d97706;font-size:0.87em;margin-top:8px;">⚠ Git: ${escapeHtml(data.git_error)}</p>`
      : '';
    const diffRows = (data.diff_summary || []).map(d =>
      `<li>${d.applied ? '✅' : '⚠'} ${escapeHtml(d.label)}${d.applied ? '' : ' (no match found)'}</li>`
    ).join('');

    resultDiv.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;">
        <strong>✅ ${count} item${count !== 1 ? 's' : ''} written to master CV data.</strong>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:0.9em;line-height:1.8;">${diffRows}</ul>
        <p style="margin:8px 0 0;font-size:0.87em;color:#166534;">Git commit: ${hash}</p>
        ${gitWarn}
      </div>`;

    applyBtn.disabled    = false;
    applyBtn.textContent = '✅ Applied';
    applyBtn.style.background = '#059669';
  } catch (err) {
    resultDiv.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
      padding:12px 16px;color:#991b1b;">
      ❌ Network error: ${escapeHtml(err.message)}
    </div>`;
    applyBtn.disabled    = false;
    applyBtn.textContent = '📥 Apply Selected Updates';
  }
}

// ==== End Finalise & Harvest Functions ====

// ==== Spell Check Functions ====

// Audit log for the current spell-check session: [{context_type, location, original, suggestion, rule, outcome, final}]
let spellAudit = [];

async function populateSpellCheckTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = `
    <h1>🔤 Spell &amp; Grammar Check</h1>
    <p style="color:#6b7280;margin-bottom:24px;">Checking CV sections for spelling and grammar issues…</p>
    <div id="spell-loading" style="text-align:center;padding:40px;">
      <div class="loading-spinner"></div>
      <p style="color:#6b7280;margin-top:12px;">Running LanguageTool checks…</p>
    </div>
    <div id="spell-results" style="display:none;"></div>
  `;
  spellAudit = [];

  try {
    // Fetch sections to check
    const sectionsRes = await fetch('/api/spell-check-sections');
    const sectionsData = await sectionsRes.json();
    if (!sectionsData.ok) {
      document.getElementById('spell-loading').innerHTML = `<p class="error-message">Failed to load sections: ${sectionsData.error || 'Unknown error'}</p>`;
      return;
    }

    const sections = sectionsData.sections || [];
    if (sections.length === 0) {
      // Fast-path: no sections to check — advance phase immediately
      await completeSpellCheckFastPath('No CV sections available to check.');
      return;
    }

    // Check each section
    const flaggedSections = [];
    for (const section of sections) {
      const res  = await fetch('/api/spell-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: section.text, context: section.context })
      });
      const data = await res.json();
      if (data.ok && data.suggestions && data.suggestions.length > 0) {
        flaggedSections.push({ section, suggestions: data.suggestions });
      }
    }

    document.getElementById('spell-loading').style.display = 'none';

    if (flaggedSections.length === 0) {
      // Zero-flag fast-path
      await completeSpellCheckFastPath(`Spell check passed — ${sections.length} section${sections.length !== 1 ? 's' : ''} checked, no issues found.`);
      return;
    }

    // Render suggestions panel
    renderSpellSuggestions(flaggedSections, sections.length);

  } catch (err) {
    console.error('Spell check error:', err);
    document.getElementById('spell-loading').innerHTML = `<p style="color:#ef4444;padding:20px;">Spell check failed: ${err.message}</p>`;
  }
}

async function completeSpellCheckFastPath(message) {
  // Save empty audit and advance to generation
  const res  = await fetch('/api/spell-check-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spell_audit: [] })
  });
  const data = await res.json();
  const content = document.getElementById('document-content');
  content.innerHTML = `
    <div style="text-align:center;padding:60px 20px;">
      <div style="font-size:3em;margin-bottom:16px;">✅</div>
      <h2 style="color:#166534;">${message}</h2>
      <p style="color:#6b7280;margin:16px 0 24px;">Advancing to CV generation…</p>
    </div>
  `;
  // Refresh status then navigate to CV tab and generate
  await fetchStatus();
  await sendAction('generate_cv');
}

function renderSpellSuggestions(flaggedSections, totalSections) {
  const results = document.getElementById('spell-results');
  results.style.display = '';

  let html = `
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <strong>⚠ ${flaggedSections.reduce((t, f) => t + f.suggestions.length, 0)} issue${flaggedSections.reduce((t, f) => t + f.suggestions.length, 0) !== 1 ? 's' : ''}</strong> found
      across ${flaggedSections.length} of ${totalSections} section${totalSections !== 1 ? 's' : ''}.
      Review each suggestion below, then click <strong>Done</strong>.
    </div>
  `;

  flaggedSections.forEach(({ section, suggestions }) => {
    html += `<div class="review-section" style="margin-bottom:24px;">
      <h3 style="font-size:1em;font-weight:700;color:#374151;margin-bottom:12px;">${escapeHtml(section.label)}</h3>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:10px;font-size:0.9em;white-space:pre-wrap;">${escapeHtml(section.text)}</div>
    `;
    suggestions.forEach((sug, idx) => {
      const sugId = `sug_${section.id}_${idx}`;
      const reps = sug.replacements || [];
      html += `
        <div class="spell-suggestion" id="${sugId}" data-section-id="${escapeHtml(section.id)}" data-idx="${idx}"
             style="border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:8px;background:#fff;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <div style="flex:1;">
              <div style="font-size:0.88em;color:#6b7280;margin-bottom:4px;">
                <span style="background:#fee2e2;color:#dc2626;border-radius:4px;padding:1px 6px;font-weight:600;">${escapeHtml(sug.flagged)}</span>
                <span style="margin-left:8px;">${escapeHtml(sug.message)}</span>
              </div>
              <div style="font-style:italic;font-size:0.85em;color:#374151;margin-bottom:8px;">${escapeHtml(sug.snippet)}</div>
              ${reps.length > 0 ? `
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                <span style="font-size:0.82em;color:#6b7280;align-self:center;">Suggestions:</span>
                ${reps.map((r, ri) => `<button class="rewrite-keyword" onclick="applySpellReplacement('${escapeHtml(section.id)}', ${idx}, ${ri})"
                  style="cursor:pointer;border:1px solid #3b82f6;background:#dbeafe;">${escapeHtml(r)}</button>`).join('')}
              </div>` : ''}
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="icon-btn" onclick="dismissSpellSuggestion('${escapeHtml(sugId)}', '${escapeHtml(section.id)}', ${idx}, '${escapeHtml(sug.flagged)}')"
                    title="Ignore this suggestion">Ignore</button>
                <button class="icon-btn" onclick="addSpellWord('${escapeHtml(sug.flagged)}', '${escapeHtml(sugId)}')"
                    title="Add to custom dictionary">Add to Dictionary</button>
              </div>
            </div>
          </div>
        </div>
      `;
      // Register in audit as pending
      if (!window._spellSugMap) window._spellSugMap = {};
      window._spellSugMap[`${section.id}_${idx}`] = {
        context_type: section.context,
        location:     section.label,
        original:     sug.flagged,
        suggestion:   (reps[0] || ''),
        rule:         sug.rule_id || '',
        outcome:      'pending',
        final:        sug.flagged,
      };
    });
    html += '</div>';
  });

  html += `
    <div class="nav-buttons" style="margin:24px 0;">
      <button class="submit-btn" onclick="submitSpellCheckDecisions()">Done — Generate CV</button>
    </div>
  `;
  results.innerHTML = html;
}

function applySpellReplacement(sectionId, idx, repIdx) {
  const key  = `${sectionId}_${idx}`;
  const entry = (window._spellSugMap || {})[key];
  if (!entry) return;
  // The replacements list is not directly accessible here — read from DOM suggestion
  const sugEl = document.querySelector(`.spell-suggestion[data-section-id="${CSS.escape(sectionId)}"][data-idx="${idx}"]`);
  if (!sugEl) return;
  const buttons = sugEl.querySelectorAll('.rewrite-keyword');
  const rep = buttons[repIdx] ? buttons[repIdx].textContent.trim() : '';
  entry.outcome = 'accept';
  entry.final   = rep;
  // Visual feedback: strike the flagged word, show replacement
  const flaggedSpan = sugEl.querySelector('span[style*="background:#fee2e2"]');
  if (flaggedSpan) {
    flaggedSpan.outerHTML = `<del style="color:#dc2626;">${escapeHtml(entry.original)}</del> → <ins style="color:#166534;text-decoration:none;">${escapeHtml(rep)}</ins>`;
  }
  sugEl.style.opacity = '0.5';
}

function dismissSpellSuggestion(sugId, sectionId, idx, word) {
  const key   = `${sectionId}_${idx}`;
  const entry = (window._spellSugMap || {})[key];
  if (entry) { entry.outcome = 'reject'; entry.final = word; }
  const el = document.getElementById(sugId);
  if (el) el.style.opacity = '0.4';
}

async function addSpellWord(word, sugId) {
  try {
    const res = await fetch('/api/custom-dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    const data = await res.json();
    if (data.ok) {
      const el = document.getElementById(sugId);
      if (el) {
        el.style.opacity = '0.4';
        const msg = document.createElement('div');
        msg.style.cssText = 'color:#166534;font-size:0.85em;margin-top:4px;';
        msg.textContent = `"${word}" added to dictionary.`;
        el.appendChild(msg);
      }
      // Also record in audit
      const parts = sugId.replace(/^sug_/, '').split('_');
      const idx = parseInt(parts.pop(), 10);
      const sectionId = parts.join('_');
      const key = `${sectionId}_${idx}`;
      const entry = (window._spellSugMap || {})[key];
      if (entry) { entry.outcome = 'add_dict'; entry.final = word; }
    }
  } catch (err) {
    console.error('Error adding to dictionary:', err);
  }
}

async function submitSpellCheckDecisions() {
  // Collect audit from _spellSugMap
  const audit = Object.values(window._spellSugMap || {}).filter(e => e.outcome !== 'pending');
  // Remaining 'pending' items are implicitly accepted as-is
  Object.values(window._spellSugMap || {}).forEach(e => {
    if (e.outcome === 'pending') { e.outcome = 'ignore'; audit.push(e); }
  });
  spellAudit = audit;

  const loadingMsg = appendLoadingMessage('Saving spell check decisions…');
  setLoading(true);
  try {
    const res  = await fetch('/api/spell-check-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spell_audit: spellAudit })
    });
    const data = await res.json();
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    if (!res.ok) {
      showAlertModal('❌ Error', `Failed to save spell check: ${data.error || 'Unknown error'}`);
      return;
    }
    appendMessage('assistant', `✅ Spell check complete — ${spellAudit.length} item${spellAudit.length !== 1 ? 's' : ''} reviewed. Generating your CV…`);
    await fetchStatus();
    await sendAction('generate_cv');
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    showAlertModal('❌ Error', `Spell check error: ${err.message}`);
  }
}

// ==== End Spell Check Functions ====

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

async function sendAction(action) {
  if (isLoading) return;
  
  const loadingMsg = appendLoadingMessage(`Executing ${action}...`);
  setLoading(true);
  
  try {
    // Include user preferences if available and action is recommend_customizations
    const payload = { action };
    if (action === 'recommend_customizations' && window.questionAnswers) {
      payload.user_preferences = window.questionAnswers;
    }
    
    const res = await llmFetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = parseMessageResponse(await res.json());

    removeLoadingMessage(loadingMsg);

    if (data.error) {
      appendRetryMessage('❌ Error: ' + data.error, () => sendAction(action));
    } else {
      // Handle different action types
      if (action === 'recommend_customizations') {
        // data.result is {text, context_data: {customizations: {...}}} — unwrap to the actual recommendations
        const customizationData = data.result?.context_data?.customizations ?? data.result;
        await handleCustomizationResponse(customizationData);
      } else if (action === 'generate_cv') {
        // Show generation progress (Phase 10)
        const generationMsg = appendMessage('assistant', '⏳ Generating CV files (ATS DOCX → HTML → Human DOCX)...');

        // Poll for progress updates
        let progressPoled = false;
        for (let i = 0; i < 120; i++) {  // poll for up to 2 minutes
          await new Promise(r => setTimeout(r, 500));  // 500ms interval

          try {
            const statusRes = await fetch('/api/status');
            const statusData = parseStatusResponse(await statusRes.json());
            const progress = statusData.generation_progress || [];

            if (progress.length > 0) {
              progressPoled = true;
              const steps = progress.map(p =>
                `${p.status === 'complete' ? '✓' : '⏳'} ${p.step.replace(/_/g, ' ')} ${p.elapsed_ms ? `(${p.elapsed_ms}ms)` : ''}`
              ).join(' • ');

              // Update message
              if (generationMsg) {
                generationMsg.querySelector('.content').textContent = `Generating CV: ${steps}`;
              }
            }

            // Check if generation complete
            if (progress.every(p => p.status === 'complete') && progress.length > 0) {
              break;
            }
          } catch (e) {
            // Polling error, continue
          }
        }

        appendMessage('assistant', 'CV generated successfully! Review your layout below.');
        tabData.cv = data.result;
        populateCVTab(data.result);
        switchTab('layout');
      } else {
        appendMessage('assistant', data.result);
      }
    }
  } catch (error) {
    console.error('=== SEND ACTION ERROR ===');
    console.error('Action:', action);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    console.error('========================');
    removeLoadingMessage(loadingMsg);
    if (error.name !== 'AbortError') {
      appendRetryMessage('❌ Error: ' + error.message, () => sendAction(action));
    }
  }
  
  setLoading(false);
  await fetchStatus();
}

async function saveSession() {
  try {
    const res = await fetch('/api/save', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      if (data.session_file) {
        localStorage.setItem(StorageKeys.SESSION_PATH, data.session_file);
      }
      appendMessage('system', 'Session saved successfully.');
    } else {
      appendRetryMessage('❌ Error saving session: ' + data.error, saveSession);
    }
  } catch (error) {
    console.error('=== SAVE SESSION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    console.error('=========================');
    appendRetryMessage('❌ Error: ' + error.message, saveSession);
  }
}

async function resetSession() {
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    // Clear all frontend state
    clearState();
    userSelections = { experiences: {}, skills: {} };
    window.postAnalysisQuestions = [];
    window.questionAnswers = {};
    window.pendingRecommendations = null;
    window._savedDecisions = {};
    window._newSkillsFromLLM = [];
    // Clear conversation and job content
    document.getElementById('conversation').innerHTML = '';
    await fetchStatus();
    await showLoadJobPanel();
  } catch (error) {
    console.error('=== RESET SESSION ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    console.error('==========================');
    appendMessage('system', 'Error: ' + error.message);
  }
}

function appendLoadingMessage(text) {
  const conversation = document.getElementById('conversation');
  const message = document.createElement('div');
  message.className = 'message system';
  const content = document.createElement('div');
  content.className = 'content loading-message';
  content.innerHTML = `<div class="loading-spinner"></div><span>${text}</span>`;
  message.appendChild(content);
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function removeLoadingMessage(messageElement) {
  if (messageElement && messageElement.parentNode) {
    messageElement.parentNode.removeChild(messageElement);
  }
}

// Restores a previously-saved message whose content is already HTML (saved via innerHTML).
function appendMessageHtml(type, html) {
  const conversation = document.getElementById('conversation');
  const message = document.createElement('div');
  message.className = `message ${type}`;
  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = html;
  message.appendChild(content);
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
}

// Buffer for messages emitted before the #conversation div exists.
// Flushed at the start of init() once the DOM is fully ready.
const _messageQueue = [];

function _flushMessageQueue() {
  while (_messageQueue.length) {
    const { type, text } = _messageQueue.shift();
    appendMessage(type, text);
  }
}

function appendMessage(type, text) {
  const conversation = document.getElementById('conversation');
  if (!conversation) {
    // DOM not ready yet — buffer until _flushMessageQueue() is called from init()
    _messageQueue.push({ type, text });
    return null;
  }
  const message = document.createElement('div');
  message.className = `message ${type}`;
  const content = document.createElement('div');
  content.className = 'content';
  
  // Simple markdown rendering: convert **text** to <strong> and preserve newlines
  const textStr = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  let html = textStr
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.+?)\*/g, '<em>$1</em>')              // Italic
    .replace(/\n/g, '<br>');                           // Newlines
  
  content.innerHTML = html;
  message.appendChild(content);
  
  // Check if message ends with response options like (yes/no/maybe)
  const optionsMatch = textStr.match(/\(([^)]+\/[^)]+)\)\s*$/);  // Match (option1/option2/option3)
  if (optionsMatch && type === 'assistant') {
    const options = optionsMatch[1].split('/').map(opt => opt.trim());
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;';
    
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.className = 'action-btn';
      btn.style.cssText = 'padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;';
      btn.onclick = () => {
        document.getElementById('message-input').value = option;
        sendMessage();
      };
      buttonContainer.appendChild(btn);
    });
    
    message.appendChild(buttonContainer);
  }
  
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
}

/**
 * Appends a system error message to the conversation with an optional Retry button.
 * @param {string} text      - Error message text (supports **bold** markdown)
 * @param {Function} [retryFn]    - Called when Retry is clicked; omit for non-retryable errors
 * @param {string} [retryLabel]  - Retry button label (default 'Retry')
 */
function appendRetryMessage(text, retryFn, retryLabel = 'Retry') {
  const conversation = document.getElementById('conversation');
  const message = document.createElement('div');
  message.className = 'message system';
  const content = document.createElement('div');
  content.className = 'content';
  // Escape first to prevent HTML injection, then apply safe markdown substitutions.
  content.innerHTML = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  message.appendChild(content);
  if (typeof retryFn === 'function') {
    const btn = document.createElement('button');
    btn.textContent = retryLabel;
    btn.style.cssText = 'margin-top:8px;padding:6px 14px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;display:block;';
    btn.onclick = () => { message.remove(); retryFn(); };
    message.appendChild(btn);
  }
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function appendFormattedAnalysis(result) {
  try {
    // Clean up JSON response more thoroughly
    const cleanResult = cleanJsonResponse(result);
    const data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;
    
    if (data && typeof data === 'object' && (data.title || data.required_skills)) {
      const conversation = document.getElementById('conversation');
      const message = document.createElement('div');
      message.className = 'message assistant';
      const content = document.createElement('div');
      content.className = 'content job-analysis';
      
      let html = '<h3>📋 Job Analysis Complete</h3>';
      
      if (data.title) html += `<p><strong>Position:</strong> ${data.title} at ${data.company || 'Company'}</p>`;
      if (data.domain) html += `<p><strong>Domain:</strong> ${data.domain}</p>`;
      
      if (data.required_skills && data.required_skills.length > 0) {
        html += '<h4>🎯 Required Skills:</h4><ul>';
        data.required_skills.forEach(skill => html += `<li>${skill}</li>`);
        html += '</ul>';
      }

      if (data.preferred_skills && data.preferred_skills.length > 0) {
        html += '<h4>⭐ Preferred Skills:</h4><ul>';
        data.preferred_skills.forEach(skill => html += `<li>${skill}</li>`);
        html += '</ul>';
      }

      if (data.nice_to_have_requirements && data.nice_to_have_requirements.length > 0) {
        html += '<h4>✨ Nice to Have:</h4><ul>';
        data.nice_to_have_requirements.forEach(req => html += `<li>${req}</li>`);
        html += '</ul>';
      }

      if (data.ats_keywords && data.ats_keywords.length > 0) {
        html += '<h4>🔑 ATS Keywords:</h4>';
        html += '<p style="line-height: 2;">';
        data.ats_keywords.forEach(kw => html += `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:4px;padding:2px 8px;margin:2px;font-size:0.85em;">${kw}</span>`);
        html += '</p>';
      }
      
      content.innerHTML = html;
      message.appendChild(content);
      conversation.appendChild(message);
      conversation.scrollTop = conversation.scrollHeight;
    } else {
      appendMessage('assistant', result);
    }
  } catch (e) {
    console.error('Analysis display error:', e);
    appendMessage('assistant', result);
  }
}

function appendFormattedResponse(response) {
  try {
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    if (data && typeof data === 'object' && (data.title || data.required_skills)) {
      appendFormattedAnalysis(response);
    } else {
      appendMessage('assistant', response);
    }
  } catch (e) {
    appendMessage('assistant', response);
  }
}

function setLoading(loading, label) {
  isLoading = loading;

  // Create / clear the AbortController for the in-flight LLM request
  if (loading) {
    window._currentAbortController = new AbortController();
  } else {
    window._currentAbortController = null;
  }

  // Drive the LLM status bar
  _updateLLMStatusBar(loading);

  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = loading);

  // Progress bar
  let bar = document.getElementById('loading-progress-bar');
  if (loading) {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'loading-progress-bar';
      document.body.prepend(bar);
    }
    // Animate to 70% to indicate in-progress (completing in fetchStatus)
    requestAnimationFrame(() => { bar.style.width = '70%'; });
    if (label) bar.title = label;
  } else {
    if (bar) {
      bar.style.width = '100%';
      setTimeout(() => bar.remove(), 400);
    }
  }

  // Pulse the active workflow step
  document.querySelectorAll('.step.active').forEach(el => {
    el.classList.toggle('loading-step', loading);
  });
}

function extractTitleAndCompanyFromJobText(jobText) {
  if (!jobText || typeof jobText !== 'string') {
    return { title: '', company: '' };
  }

  const lines = jobText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { title: '', company: '' };
  }

  const firstLine = lines[0] || '';
  const secondLine = lines[1] || '';
  const atMatch = firstLine.match(/^(.+?)\s+at\s+(.+)$/i);

  if (atMatch) {
    return {
      title: atMatch[1].trim(),
      company: atMatch[2].trim()
    };
  }

  return {
    title: firstLine,
    company: secondLine
  };
}

function normalizePositionLabel(title, company) {
  const cleanTitle = (title || '').toString().trim();
  const cleanCompany = (company || '').toString().trim();

  if (cleanTitle && cleanCompany) {
    return `${cleanTitle} at ${cleanCompany}`;
  }
  return cleanTitle || cleanCompany || '';
}

function updatePositionTitle(status = {}) {
  const positionEl = document.getElementById('position-title');
  if (!positionEl) return;

  const fallbackBrowserTitle = 'CV Generator — Professional Web UI';
  let label = (status.position_name || '').toString().trim();

  if (!label && status.job_analysis) {
    try {
      const analysis = typeof status.job_analysis === 'string'
        ? JSON.parse(cleanJsonResponse(status.job_analysis))
        : status.job_analysis;
      label = normalizePositionLabel(analysis?.title, analysis?.company);
    } catch (error) {
      console.warn('Failed to parse job_analysis for title:', error);
    }
  }

  if (!label && status.job_description_text) {
    const parsed = extractTitleAndCompanyFromJobText(status.job_description_text);
    label = normalizePositionLabel(parsed.title, parsed.company);
  }

  positionEl.textContent = label;
  document.title = label ? `${label} — AI CV Customizer` : fallbackBrowserTitle;
  // Show rename pencil when a session is loaded
  const renameBtn = document.getElementById('rename-session-btn');
  if (renameBtn) renameBtn.style.display = label ? '' : 'none';
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = parseStatusResponse(await res.json());

    if (Array.isArray(data.post_analysis_questions)) {
      window.postAnalysisQuestions = data.post_analysis_questions;
    }
    if (data.post_analysis_answers && typeof data.post_analysis_answers === 'object') {
      window.questionAnswers = data.post_analysis_answers;
    }
    if (typeof data.llm_provider === 'string' && data.llm_provider) {
      window.currentProvider = data.llm_provider;
    }
    // Cache master CV skills for mismatch detection in populateAnalysisTab.
    if (Array.isArray(data.all_skills)) {
      window._masterSkills = data.all_skills.map(s => (typeof s === 'string' ? s : (s.name || s.skill || '')).toLowerCase());
    }

    // Cache saved review decisions so build functions can restore user choices
    window._savedDecisions = {
      experience_decisions:   data.experience_decisions   || {},
      skill_decisions:        data.skill_decisions        || {},
      achievement_decisions:  data.achievement_decisions  || {},
      publication_decisions:  data.publication_decisions  || {},
      summary_focus_override: data.summary_focus_override || null,
      extra_skills:           data.extra_skills           || [],
    };
    if (Object.keys(window._savedDecisions.experience_decisions).length > 0) {
      userSelections.experiences = { ...window._savedDecisions.experience_decisions };
    }
    if (Object.keys(window._savedDecisions.skill_decisions).length > 0) {
      userSelections.skills = { ...window._savedDecisions.skill_decisions };
    }
    if (window._savedDecisions.summary_focus_override) {
      window.selectedSummaryKey = window._savedDecisions.summary_focus_override;
    }
    if (window._savedDecisions.extra_skills.length > 0) {
      window._newSkillsFromLLM = window._savedDecisions.extra_skills;
    }

    updatePositionTitle(data);
    updateWorkflowSteps(data);
    if (data.copilot_auth) updateAuthBadge(data.copilot_auth, data.llm_provider);
  } catch (error) {
    console.error('Error fetching status:', error);
  }
}

// ── Copilot Auth ──────────────────────────────────────────────────────────

let _authPollTimer = null;

function formatProviderLabel(provider) {
  if (!provider || typeof provider !== 'string') return 'Provider';
  const aliases = {
    openai: 'OpenAI',
    'copilot-oauth': 'Copilot OAuth',
  };
  if (aliases[provider]) return aliases[provider];
  return provider
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function updateAuthBadge(authStatus, provider = null) {
  const badge = document.getElementById('copilot-auth-badge');
  const icon  = document.getElementById('auth-badge-icon');
  const label = document.getElementById('auth-badge-label');
  if (!badge) return;

  const activeProvider = provider || window.currentProvider || null;
  const isCopilotOAuth = activeProvider === 'copilot-oauth';

  // For non-Copilot providers, show provider status text instead of Copilot auth state.
  if (activeProvider && !isCopilotOAuth) {
    badge.classList.remove('authenticated', 'unauthenticated', 'polling');
    badge.classList.add('authenticated');
    icon.textContent  = '\u2713';
    label.textContent = `${formatProviderLabel(activeProvider)} Provider Active`;
    return;
  }

  badge.classList.remove('authenticated', 'unauthenticated', 'polling');
  if (authStatus.authenticated) {
    badge.classList.add('authenticated');
    icon.textContent  = '\u2713';
    label.textContent = 'Copilot ready';
  } else if (authStatus.polling) {
    badge.classList.add('polling');
    icon.textContent  = '\u29D7';
    label.textContent = 'Waiting for approval…';
  } else {
    badge.classList.add('unauthenticated');
    icon.innerHTML  = '&#x26A0;';
    label.textContent = 'Not authenticated';
  }
}

async function openCopilotAuthModal() {
  // If already authenticated, let user log out instead
  const statusRes = await fetch('/api/copilot-auth/status').then(r => r.json()).catch(() => ({}));
  if (statusRes.authenticated) {
    if (await confirmDialog('You are already authenticated with GitHub Copilot. Log out?', { confirmLabel: 'Log out', danger: true })) {
      await fetch('/api/copilot-auth/logout', { method: 'POST' });
      updateAuthBadge({ authenticated: false });
    }
    return;
  }

  // Start device flow
  const flowRes = await fetch('/api/copilot-auth/start', { method: 'POST' });
  if (!flowRes.ok) {
    alert('Failed to start auth flow: ' + (await flowRes.text()));
    return;
  }
  const flow = await flowRes.json();

  // Show modal
  document.getElementById('auth-user-code').textContent   = flow.user_code;
  document.getElementById('auth-verify-link').href         = flow.verification_uri || 'https://github.com/login/device';
  document.getElementById('auth-verify-link').textContent  = flow.verification_uri || 'github.com/login/device';
  document.getElementById('auth-status-msg').textContent   = 'Waiting for you to enter the code at GitHub…';
  document.getElementById('auth-modal-overlay').classList.add('visible');

  // Kick off server-side polling
  await fetch('/api/copilot-auth/poll', { method: 'POST' });
  updateAuthBadge({ authenticated: false, polling: true });

  // Client-side status polling
  _authPollTimer = setInterval(async () => {
    const st = await fetch('/api/copilot-auth/status').then(r => r.json()).catch(() => ({}));
    updateAuthBadge(st);
    if (st.authenticated) {
      clearInterval(_authPollTimer);
      document.getElementById('auth-status-msg').textContent = '\u2713 Authenticated! Closing…';
      document.getElementById('auth-open-btn').disabled = true;
      setTimeout(closeCopilotAuthModal, 1200);
    } else if (st.error) {
      clearInterval(_authPollTimer);
      document.getElementById('auth-status-msg').textContent = '\u274C ' + st.error;
      updateAuthBadge({ authenticated: false });
    }
  }, 5000);
}

function openAuthGitHub() {
  const link = document.getElementById('auth-verify-link');
  window.open(link.href, '_blank');
}

function closeCopilotAuthModal() {
  document.getElementById('auth-modal-overlay').classList.remove('visible');
  if (_authPollTimer) { clearInterval(_authPollTimer); _authPollTimer = null; }
}

// ==== Phase Re-entry / Iterative Refinement ====

/**
 * Navigate back to a prior workflow step without clearing downstream state.
 * Called by "Refine" buttons in Download tab and ↻ workflow-step icons.
 */
async function backToPhase(step) {
  try {
    const res  = await fetch('/api/back-to-phase', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({phase: step}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Could not navigate back: ' + (data.error || 'Unknown error'), () => backToPhase(step));
      return;
    }
    appendMessage('assistant', `↻ Navigating back to ${step}. Prior decisions and approvals are preserved.`);
    await fetchStatus();

    // Switch to the appropriate viewer tab
    const tabMap = {
      job:            null,
      analysis:       'analysis',
      customizations: 'customizations',
      rewrite:        'rewrite',
      spell:          'spell',
      generate:       'cv',
    };
    const resolvedTab = tabMap[step] || tabMap[data.phase] || null;
    if (resolvedTab) switchTab(resolvedTab);
  } catch (err) {
    appendRetryMessage('⚠ Network error in backToPhase: ' + err.message, () => backToPhase(step));
  }
}

/**
 * Re-run the LLM call for a phase with downstream context included.
 * Shows a confirmation popover before proceeding.
 */
function confirmReRunPhase(step) {
  const label = {
    analysis:       'Job Analysis',
    customizations: 'Customisations',
    rewrite:        'Rewrite Review',
  }[step] || step;

  if (!confirm(
    `Re-run ${label} using updated inputs?\n\n` +
    `Prior approvals will be preserved and included as context.`
  )) return;

  reRunPhase(step);
}

async function reRunPhase(step) {
  const loadingMsg = appendLoadingMessage(`↻ Re-running ${step}…`);
  setLoading(true);
  try {
    const res  = await fetch('/api/re-run-phase', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({phase: step}),
    });
    const data = await res.json();
    removeLoadingMessage(loadingMsg);
    setLoading(false);

    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Re-run failed: ' + (data.error || 'Unknown error'), () => reRunPhase(step));
      return;
    }

    appendMessage('assistant', `✅ ${step} re-run complete. Review the updated results — changed items are highlighted.`);
    await fetchStatus();

    // Navigate to the step's viewer tab
    const tabMap = {
      analysis:       'analysis',
      customizations: 'customizations',
      rewrite:        'rewrite',
    };
    if (tabMap[step]) switchTab(tabMap[step]);

  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('⚠ Network error in reRunPhase: ' + err.message, () => reRunPhase(step));
  }
}

// ==== End Phase Re-entry Functions ====

// ==== Phase 9: Bullet Reorder Functions ====

async function showBulletReorder(expId, expTitle) {
  // Fetch current achievements for this experience
  let achievements = [];
  try {
    const res  = await fetch('/api/experience-details', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({experience_id: expId}),
    });
    const data = await res.json();
    achievements = (data.experience && data.experience.achievements) || [];
  } catch (e) {
    appendRetryMessage('⚠ Could not load bullets: ' + e.message, () => showBulletReorder(expId, expTitle));
    return;
  }
  if (!achievements.length) {
    appendMessage('system', 'No bullet points found for this experience.');
    return;
  }

  // Build modal content
  const modal = document.createElement('div');
  modal.id = 'bullet-reorder-modal';
  modal.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);
    z-index:9999;display:flex;align-items:center;justify-content:center;`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:24px;max-width:640px;width:92%;
                max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <h3 style="margin:0;color:#1f2937;">↕ Reorder Bullets</h3>
          <div style="color:#6b7280;font-size:0.9em;margin-top:4px;">${expTitle}</div>
        </div>
        <button onclick="document.getElementById('bullet-reorder-modal').remove()"
          style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#6b7280;">✕</button>
      </div>
      <div style="font-size:0.85em;color:#6b7280;margin-bottom:12px;">
        Use ↑ ↓ to reorder. Bullets higher in the list appear first on your CV.
        The most relevant bullet will be auto-ranked highest if you reset.
      </div>
      <ol id="bullet-reorder-list" style="padding:0;margin:0;list-style:none;">
      </ol>
      <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
        <button class="btn-secondary" onclick="resetBulletOrder('${expId}')">↺ Reset to Auto</button>
        <button class="btn-primary"   onclick="saveBulletOrder('${expId}')">Save Order</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Populate list items
  const list = document.getElementById('bullet-reorder-list');
  achievements.forEach((ach, idx) => {
    const text = (typeof ach === 'object' ? (ach.text || '') : String(ach));
    const li = document.createElement('li');
    li.dataset.origIndex = idx;
    li.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:8px;margin-bottom:6px;
      background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;`;
    li.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;">
        <button title="Move up"   onclick="moveBullet(this,-1)"
          style="background:none;border:1px solid #d1d5db;border-radius:3px;
                 cursor:pointer;padding:1px 5px;line-height:1.2;font-size:0.9em;">↑</button>
        <button title="Move down" onclick="moveBullet(this,+1)"
          style="background:none;border:1px solid #d1d5db;border-radius:3px;
                 cursor:pointer;padding:1px 5px;line-height:1.2;font-size:0.9em;">↓</button>
      </div>
      <span style="flex:1;font-size:0.9em;">${text}</span>`;
    list.appendChild(li);
  });
  _updateBulletArrows();
}

function moveBullet(btn, direction) {
  const li   = btn.closest('li');
  const list = li.parentNode;
  if (direction === -1 && li.previousElementSibling) {
    list.insertBefore(li, li.previousElementSibling);
  } else if (direction === +1 && li.nextElementSibling) {
    list.insertBefore(li.nextElementSibling, li);
  }
  _updateBulletArrows();
}

function _updateBulletArrows() {
  const list = document.getElementById('bullet-reorder-list');
  if (!list) return;
  const items = list.querySelectorAll('li');
  items.forEach((li, idx) => {
    const [upBtn, downBtn] = li.querySelectorAll('button');
    upBtn.disabled   = idx === 0;
    downBtn.disabled = idx === items.length - 1;
    upBtn.style.opacity   = upBtn.disabled   ? '0.3' : '1';
    downBtn.style.opacity = downBtn.disabled ? '0.3' : '1';
  });
}

async function saveBulletOrder(expId) {
  const list  = document.getElementById('bullet-reorder-list');
  const items = list ? list.querySelectorAll('li') : [];
  const order = Array.from(items).map(li => parseInt(li.dataset.origIndex, 10));
  try {
    const res  = await fetch('/api/reorder-bullets', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({experience_id: expId, order}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Could not save bullet order: ' + (data.error||'Unknown'), () => saveBulletOrder(expId));
      return;
    }
    appendMessage('assistant', '↕ Bullet order saved. It will apply when you generate the CV.');
    document.getElementById('bullet-reorder-modal')?.remove();
  } catch(e) {
    appendRetryMessage('⚠ Network error saving bullet order: ' + e.message, () => saveBulletOrder(expId));
  }
}

async function resetBulletOrder(expId) {
  try {
    const res  = await fetch('/api/reorder-bullets', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({experience_id: expId, order: []}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Could not reset bullet order: ' + (data.error||'Unknown'), () => resetBulletOrder(expId));
      return;
    }
    appendMessage('assistant', '↺ Bullet order reset. Relevance-based ordering will apply.');
    document.getElementById('bullet-reorder-modal')?.remove();
  } catch(e) {
    appendRetryMessage('⚠ Network error resetting bullet order: ' + e.message, () => resetBulletOrder(expId));
  }
}

// ==== End Bullet Reorder Functions ====

function updateWorkflowSteps(status) {
  // 8-step workflow bar: Job Input → Analysis → Customise → Rewrites →
  //                      Spell Check → Generate → Layout (upcoming) → Finalise
  //
  const UPCOMING = new Set();

  // Steps that support LLM re-execution via /api/re-run-phase
  const RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite']);

  // Base label for each step (used when injecting ↻ button)
  const STEP_LABELS = {
    job:            '📥 Job Input',
    analysis:       '🔍 Analysis',
    customizations: '⚙️ Customise',
    rewrite:        '✏️ Rewrites',
    spell:          '🔤 Spell Check',
    generate:       '📄 Generate',
    layout:         '🎨 Layout',
    finalise:       '✅ Finalise',
  };

  // Determine which steps are done based on session state fields.
  const phase = status.phase || '';
  const done = {
    job:            !!status.job_description,
    analysis:       !!status.job_analysis,
    customizations: !!status.customizations,
    rewrite:        phase !== PHASES.REWRITE_REVIEW && (!!status.customizations),
    spell:          phase === PHASES.GENERATION || phase === PHASES.REFINEMENT,
    generate:       !!status.generated_files,
    layout:         phase === PHASES.REFINEMENT && !!status.generated_files,
    finalise:       phase === PHASES.REFINEMENT && !!status.generated_files,
  };

  // Determine the active step from the backend phase string.
  const phaseToStep = {
    'init':          'job',
    'job_analysis':  'analysis',
    'customization': 'customizations',
    'rewrite_review':'rewrite',
    'spell_check':   'spell',
    'generation':    'generate',
    'layout_review': 'layout',
    'refinement':    'finalise',
  };
  const activeStep = phaseToStep[phase] || 'job';

  // Resolve the reentry step for the "Refining" badge
  const _phaseToStep2 = Object.assign({'init': 'job'}, phaseToStep);
  const reentryStep = status.iterating
    ? (_phaseToStep2[status.reentry_phase] || status.reentry_phase || null)
    : null;

  const stepIds = ['job', 'analysis', 'customizations', 'rewrite', 'spell', 'generate', 'layout', 'finalise'];
  stepIds.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;
    // Upcoming steps are fixed — never change their class.
    if (UPCOMING.has(step)) return;
    el.classList.remove('active', 'completed', 'clickable', 'upcoming');

    let label = STEP_LABELS[step] || step;

    if (step === activeStep) {
      el.classList.add('active');
      // "↻ Refining" badge shown on the active step when iterating
      if (status.iterating && reentryStep === step) {
        label += ' <span style="font-size:0.75em;background:#fef9c3;color:#92400e;' +
                 'border-radius:6px;padding:1px 5px;vertical-align:middle;">↻ Refining</span>';
      }
    } else if (done[step]) {
      el.classList.add('completed');
      // Completed steps are clickable for back-navigation.
      el.classList.add('clickable');
      // Add ↻ re-run icon for steps that support LLM re-execution
      if (RE_RUN_STEPS.has(step)) {
        label += ` <span class="step-rerun" title="Re-run ${step} with updated inputs"
          onclick="event.stopPropagation();confirmReRunPhase('${step}')"
          style="font-size:0.8em;opacity:0;transition:opacity 0.15s;margin-left:2px;cursor:pointer;">↻</span>`;
      }
    }

    el.innerHTML = label;
  });

  // Show ↻ icons via CSS :hover on the parent .completed step
  // (inject a <style> only once)
  if (!document.getElementById('step-rerun-style')) {
    const s = document.createElement('style');
    s.id = 'step-rerun-style';
    s.textContent = '.step.completed:hover .step-rerun { opacity: 1 !important; }';
    document.head.appendChild(s);
  }
}

// Back-navigation: clicking a completed workflow step navigates to its viewer tab.
// Clicking the job step always opens the load-job panel.
function handleStepClick(step) {
  const el = document.getElementById(`step-${step}`);
  if (!el) return;

  // Job step: show job content if a job is loaded, otherwise open the load panel.
  if (step === 'job') {
    if (el.classList.contains('completed')) {
      switchTab('job');
    } else {
      showLoadJobPanel();
    }
    return;
  }

  // Only navigate if the step is completed (back-nav) or active.
  if (!el.classList.contains('completed') && !el.classList.contains('active')) return;

  const hasUnansweredPostAnalysisQuestions = () => {
    const qs = Array.isArray(window.postAnalysisQuestions) ? window.postAnalysisQuestions : [];
    if (qs.length === 0) return false;
    const answers = (window.questionAnswers && typeof window.questionAnswers === 'object')
      ? window.questionAnswers
      : {};
    return qs.some(q => {
      const value = answers[q.type];
      return !value || !String(value).trim();
    });
  };

  const stepToTab = {
    analysis:       hasUnansweredPostAnalysisQuestions() ? 'questions' : 'analysis',
    customizations: 'customizations',
    rewrite:        'rewrite',
    spell:          'spell',
    generate:       'cv',
    layout:         'layout',
    finalise:       'finalise',
  };
  const tabName = stepToTab[step];
  if (tabName) switchTab(tabName);
}

// Show/hide the 409 session-conflict banner.
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

// ==== Master CV Management Tab ====

async function populateMasterTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading master CV data…</p></div>';

  let overview = {};
  let achievements = [];
  let summaries = {};

  try {
    const [ovRes, mfRes] = await Promise.all([
      fetch('/api/master-data/overview'),
      fetch('/api/master-fields'),
    ]);
    overview     = (await ovRes.json()) || {};
    const mf     = (await mfRes.json()) || {};
    achievements = mf.selected_achievements || [];
    summaries    = mf.professional_summaries || {};
  } catch (err) {
    content.innerHTML = '<p style="color:#ef4444;padding:20px;">Failed to load master CV data.</p>';
    return;
  }

  content.innerHTML = `
    <h1>📚 Master CV Profile</h1>
    <p style="color:#6b7280;margin-bottom:20px;">
      This is your persistent master CV profile. Changes here update
      <code>Master_CV_Data.json</code> directly and persist across all sessions.
    </p>

    <!-- Profile overview card -->
    <div class="master-profile-card">
      <div class="master-profile-name">${escapeHtml(overview.name || 'Your Profile')}</div>
      ${overview.headline ? `<div class="master-profile-headline">${escapeHtml(overview.headline)}</div>` : ''}
      ${overview.email    ? `<div class="master-profile-email">✉️ ${escapeHtml(overview.email)}</div>` : ''}
      <div class="master-stats">
        <div class="master-stat"><span class="master-stat-value">${overview.experience_count ?? '—'}</span><span class="master-stat-label">Experiences</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.skill_count ?? '—'}</span><span class="master-stat-label">Skills</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.achievement_count ?? '—'}</span><span class="master-stat-label">Achievements</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.summary_count ?? '—'}</span><span class="master-stat-label">Summaries</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.education_count ?? '—'}</span><span class="master-stat-label">Education</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.publication_count ?? '—'}</span><span class="master-stat-label">Publications</span></div>
      </div>
    </div>

    <!-- Selected Achievements section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>🏆 Selected Achievements</h2>
        <button class="action-btn" onclick="showAddAchievementModal()" aria-label="Add new achievement to master CV">
          + Add Achievement
        </button>
      </div>
      <p style="color:#6b7280;font-size:0.9em;margin-bottom:12px;">
        These are cross-role highlights shown in the Achievements review during customisation.
        The Harvest feature (Finalise tab) can add new ones from your current session.
      </p>
      <div id="master-achievements-container">
        ${_renderAchievementsTable(achievements)}
      </div>
    </div>

    <!-- Professional Summaries section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>📝 Professional Summaries</h2>
        <button class="action-btn" onclick="showAddSummaryModal()" aria-label="Add new professional summary variant">
          + Add Summary
        </button>
      </div>
      <p style="color:#6b7280;font-size:0.9em;margin-bottom:12px;">
        Named summary variants let you tailor your professional statement for different role types
        without regenerating from scratch. The AI will recommend the most relevant variant
        during the Summary Focus step.
      </p>
      <div id="master-summaries-container">
        ${_renderSummariesList(summaries)}
      </div>
    </div>

    <!-- Edit modals (hidden) -->
    <div id="master-ach-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-ach-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeMasterAchModal()">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h2 id="master-ach-modal-title">Achievement</h2>
          <button onclick="closeMasterAchModal()" aria-label="Close achievement editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <input type="hidden" id="ach-modal-id" />
          <div style="margin-bottom:14px;">
            <label for="ach-modal-title-input" style="display:block;font-weight:600;margin-bottom:4px;">Title <span aria-hidden="true">*</span></label>
            <input type="text" id="ach-modal-title-input" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. Led 3× revenue growth initiative" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="ach-modal-desc-input" style="display:block;font-weight:600;margin-bottom:4px;">Description</label>
            <textarea id="ach-modal-desc-input" class="edit-input" rows="3" style="width:100%;resize:vertical;"
                placeholder="Optional detail or metric"></textarea>
          </div>
          <div style="margin-bottom:14px;">
            <label for="ach-modal-relevant-input" style="display:block;font-weight:600;margin-bottom:4px;">Relevant for (comma-separated roles/domains)</label>
            <input type="text" id="ach-modal-relevant-input" class="edit-input" style="width:100%;"
                placeholder="e.g. leadership, ML engineering, data science" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="ach-modal-importance-input" style="display:block;font-weight:600;margin-bottom:4px;">Importance (1–10)</label>
            <input type="number" id="ach-modal-importance-input" class="edit-input" style="width:80px;"
                min="1" max="10" value="7" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeMasterAchModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterAchievement()">Save</button>
        </div>
      </div>
    </div>

    <div id="master-sum-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-sum-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeMasterSumModal()">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h2 id="master-sum-modal-title">Professional Summary</h2>
          <button onclick="closeMasterSumModal()" aria-label="Close summary editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="margin-bottom:14px;">
            <label for="sum-modal-key-input" style="display:block;font-weight:600;margin-bottom:4px;">Key/name <span aria-hidden="true">*</span></label>
            <input type="text" id="sum-modal-key-input" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. ml_engineering or leadership" />
            <p style="font-size:0.82em;color:#6b7280;margin:4px 0 0;">Use lowercase_underscore — this is the key used internally and shown in the Summary Focus step.</p>
          </div>
          <div style="margin-bottom:14px;">
            <label for="sum-modal-text-input" style="display:block;font-weight:600;margin-bottom:4px;">Summary text <span aria-hidden="true">*</span></label>
            <textarea id="sum-modal-text-input" class="edit-input" rows="5" style="width:100%;resize:vertical;" aria-required="true"
                placeholder="Write your professional summary variant here…"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeMasterSumModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterSummary()">Save</button>
        </div>
      </div>
    </div>
  `;
}

function _renderAchievementsTable(achievements) {
  if (!achievements.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No selected achievements yet. Use the Harvest feature to add achievements from a completed session, or click "+ Add Achievement" above.</p>';
  }
  let rows = achievements.map(ach => {
    const id      = escapeHtml(ach.id || '');
    const title   = escapeHtml(ach.title || '');
    const desc    = escapeHtml((ach.description || '').slice(0, 100));
    const imp     = ach.importance ?? '—';
    const relFor  = escapeHtml((ach.relevant_for || []).join(', '));
    return `
      <tr>
        <td><strong>${title}</strong>${desc ? `<br><small style="color:#6b7280;">${desc}${(ach.description||'').length > 100 ? '…' : ''}</small>` : ''}</td>
        <td style="text-align:center;">${imp}</td>
        <td style="font-size:0.85em;color:#475569;">${relFor || '—'}</td>
        <td class="action-btns">
          <button class="icon-btn" onclick="editMasterAchievement(${escapeHtml(JSON.stringify({id: ach.id||'', title: ach.title||'', description: ach.description||'', relevant_for: ach.relevant_for||[], importance: ach.importance||7}))})"
              aria-label="Edit achievement: ${title}" title="Edit">✏️</button>
        </td>
      </tr>`;
  }).join('');
  return `
    <table class="review-table" style="width:100%;">
      <thead>
        <tr>
          <th>Achievement</th>
          <th style="width:60px;text-align:center;">Importance</th>
          <th>Relevant for</th>
          <th style="width:60px;">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function _renderSummariesList(summaries) {
  const keys = Object.keys(summaries);
  if (!keys.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No professional summary variants yet. Click "+ Add Summary" above to create your first one.</p>';
  }
  return keys.map(key => {
    const text    = typeof summaries[key] === 'string' ? summaries[key] : JSON.stringify(summaries[key]);
    const preview = escapeHtml(text.slice(0, 200));
    const keyEsc  = escapeHtml(key);
    return `
      <div class="master-summary-card">
        <div class="master-summary-header">
          <span class="master-summary-key">${keyEsc}</span>
          <button class="icon-btn" onclick="editMasterSummary(${escapeHtml(JSON.stringify({key, text}))})"
              aria-label="Edit summary: ${keyEsc}" title="Edit">✏️</button>
        </div>
        <div class="master-summary-preview">${preview}${text.length > 200 ? '…' : ''}</div>
      </div>`;
  }).join('');
}

function showAddAchievementModal() {
  document.getElementById('ach-modal-id').value            = '';
  document.getElementById('ach-modal-title-input').value   = '';
  document.getElementById('ach-modal-desc-input').value    = '';
  document.getElementById('ach-modal-relevant-input').value = '';
  document.getElementById('ach-modal-importance-input').value = '7';
  document.getElementById('master-ach-modal-title').textContent = 'Add Achievement';
  document.getElementById('master-ach-modal-overlay').style.display = 'flex';
  document.getElementById('ach-modal-title-input').focus();
}

function editMasterAchievement(ach) {
  document.getElementById('ach-modal-id').value              = ach.id || '';
  document.getElementById('ach-modal-title-input').value     = ach.title || '';
  document.getElementById('ach-modal-desc-input').value      = ach.description || '';
  document.getElementById('ach-modal-relevant-input').value  = (ach.relevant_for || []).join(', ');
  document.getElementById('ach-modal-importance-input').value = ach.importance || 7;
  document.getElementById('master-ach-modal-title').textContent = 'Edit Achievement';
  document.getElementById('master-ach-modal-overlay').style.display = 'flex';
  document.getElementById('ach-modal-title-input').focus();
}

function closeMasterAchModal() {
  document.getElementById('master-ach-modal-overlay').style.display = 'none';
}

async function saveMasterAchievement() {
  const id = document.getElementById('ach-modal-id').value.trim() ||
             'sa_' + Date.now();
  const title       = document.getElementById('ach-modal-title-input').value.trim();
  const description = document.getElementById('ach-modal-desc-input').value.trim();
  const relevantRaw = document.getElementById('ach-modal-relevant-input').value;
  const importance  = parseInt(document.getElementById('ach-modal-importance-input').value, 10) || 7;

  if (!title) {
    showAlertModal('⚠️ Validation', 'Title is required.');
    return;
  }
  const relevant_for = relevantRaw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = await fetch('/api/master-data/update-achievement', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, title, description, relevant_for, importance }),
    });
    const data = await res.json();
    if (data.ok) {
      closeMasterAchModal();
      showAlertModal('✅ Saved', `Achievement "${title}" ${data.action}.`);
      await populateMasterTab();  // refresh
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save achievement');
  }
}

function showAddSummaryModal() {
  document.getElementById('sum-modal-key-input').value  = '';
  document.getElementById('sum-modal-text-input').value = '';
  document.getElementById('master-sum-modal-title').textContent = 'Add Professional Summary';
  document.getElementById('master-sum-modal-overlay').style.display = 'flex';
  document.getElementById('sum-modal-key-input').focus();
}

function editMasterSummary(obj) {
  document.getElementById('sum-modal-key-input').value  = obj.key  || '';
  document.getElementById('sum-modal-text-input').value = obj.text || '';
  document.getElementById('master-sum-modal-title').textContent = 'Edit Professional Summary';
  document.getElementById('master-sum-modal-overlay').style.display = 'flex';
  document.getElementById('sum-modal-key-input').focus();
}

function closeMasterSumModal() {
  document.getElementById('master-sum-modal-overlay').style.display = 'none';
}

async function saveMasterSummary() {
  const key  = document.getElementById('sum-modal-key-input').value.trim();
  const text = document.getElementById('sum-modal-text-input').value.trim();
  if (!key || !text) {
    showAlertModal('⚠️ Validation', 'Both Key and Summary text are required.');
    return;
  }
  try {
    const res = await fetch('/api/master-data/update-summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, text }),
    });
    const data = await res.json();
    if (data.ok) {
      closeMasterSumModal();
      showAlertModal('✅ Saved', `Summary "${key}" ${data.action}.`);
      await populateMasterTab();  // refresh
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save summary');
  }
}

// ==== End Master CV Management Tab ====

// ==== Cover Letter Tab (Phase 14) ====

const COVER_LETTER_TONES = [
  { value: 'startup/tech',   label: 'Startup / Tech'    },
  { value: 'pharma/biotech', label: 'Pharma / Biotech'  },
  { value: 'academia',       label: 'Academia'           },
  { value: 'financial',      label: 'Financial Services' },
  { value: 'leadership',     label: 'Leadership / Exec'  },
];

let _coverLetterPriorSessions = [];

async function populateCoverLetterTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading cover letter…</p></div>';

  // Fetch prior sessions with cover letters
  try {
    const res  = await fetch('/api/cover-letter/prior');
    const data = await res.json();
    _coverLetterPriorSessions = (data.sessions || []);
  } catch (_) {
    _coverLetterPriorSessions = [];
  }

  const toneOptions = COVER_LETTER_TONES.map(t =>
    `<option value="${t.value}">${escapeHtml(t.label)}</option>`
  ).join('');

  const priorSection = _coverLetterPriorSessions.length ? `
    <div class="cl-prior-section">
      <h3>📋 Prior Cover Letters</h3>
      <p style="color:#6b7280;font-size:0.85em;margin-bottom:10px;">
        Select a prior letter to use as a starting point.
      </p>
      <div id="cl-prior-list">
        ${_coverLetterPriorSessions.map((s, i) => `
          <div class="cl-prior-card" id="cl-prior-${i}">
            <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="cl-prior" value="${i}" style="margin-top:3px;" />
              <div>
                <strong>${escapeHtml(s.role || 'Role')} at ${escapeHtml(s.company || 'Company')}</strong>
                <span style="color:#94a3b8;font-size:0.82em;margin-left:6px;">${escapeHtml(s.date || '')}</span>
                ${s.tone ? `<span class="cl-tone-badge">${escapeHtml(s.tone)}</span>` : ''}
                <p style="color:#64748b;font-size:0.85em;margin:4px 0 0;">${escapeHtml((s.preview || '').slice(0, 120))}…</p>
              </div>
            </label>
          </div>`).join('')}
      </div>
    </div>` : '';

  content.innerHTML = `
    <h1>📩 Cover Letter</h1>
    <p style="color:#6b7280;margin-bottom:20px;">
      Generate a tailored cover letter for this application using your CV content
      and job analysis as context.
    </p>

    ${priorSection}

    <div class="cl-form-section">
      <h3>Generation Options</h3>
      <div class="cl-form-grid">
        <div class="cl-form-field">
          <label for="cl-tone-select">Tone / Industry</label>
          <select id="cl-tone-select" class="edit-input">${toneOptions}</select>
        </div>
        <div class="cl-form-field">
          <label for="cl-hiring-manager">Hiring Manager Name/Title <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
          <input type="text" id="cl-hiring-manager" class="edit-input"
              placeholder="e.g. Dr. Jane Smith, Head of Data Science" />
        </div>
      </div>
      <div class="cl-form-field" style="margin-top:12px;">
        <label for="cl-company-address">Company Address <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
        <textarea id="cl-company-address" class="edit-input" rows="2"
            style="resize:vertical;"
            placeholder="e.g. Acme Corp, 123 Main St, Boston MA 02134"></textarea>
      </div>
      <div class="cl-form-field" style="margin-top:12px;">
        <label for="cl-highlight">Specific achievement or project to highlight <span style="color:#94a3b8;font-weight:400;">(optional)</span></label>
        <input type="text" id="cl-highlight" class="edit-input"
            placeholder="e.g. Led the migration to Kubernetes saving 30% infra cost" />
      </div>
      <div style="margin-top:16px;">
        <button class="action-btn primary" id="cl-generate-btn" onclick="generateCoverLetter()">
          ✨ Generate Cover Letter
        </button>
      </div>
    </div>

    <div id="cl-result-section" style="display:none;margin-top:24px;">
      <div class="cl-result-header">
        <h3>Generated Cover Letter</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="action-btn" onclick="generateCoverLetter()" title="Regenerate">🔄 Regenerate</button>
          <button class="action-btn primary" onclick="saveCoverLetter()" id="cl-save-btn">💾 Save Cover Letter</button>
        </div>
      </div>
      <p style="color:#6b7280;font-size:0.85em;margin-bottom:8px;">
        Edit the text below before saving.
      </p>
      <textarea id="cl-letter-textarea" class="cl-letter-textarea" rows="22"
          aria-label="Cover letter text — edit as needed"
          oninput="_debouncedValidateCL()"></textarea>
      <div id="cl-validation-panel" class="cl-validation-panel" style="display:none;">
        <h4>📊 Quality Checks</h4>
        <div id="cl-checks-container"></div>
      </div>
    </div>
  `;
}

async function generateCoverLetter() {
  const btn = document.getElementById('cl-generate-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';

  const tone           = (document.getElementById('cl-tone-select')    || {}).value || 'startup/tech';
  const hiring_manager = (document.getElementById('cl-hiring-manager') || {}).value || '';
  const company_address = (document.getElementById('cl-company-address') || {}).value || '';
  const highlight      = (document.getElementById('cl-highlight')       || {}).value || '';

  // Check for prior letter selection
  let reuse_body = '';
  const checkedPrior = document.querySelector('input[name="cl-prior"]:checked');
  if (checkedPrior) {
    const idx = parseInt(checkedPrior.value, 10);
    reuse_body = (_coverLetterPriorSessions[idx] || {}).full_text || '';
  }

  try {
    const res  = await fetch('/api/cover-letter/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tone, hiring_manager, company_address, highlight, reuse_body }),
    });
    const data = await res.json();

    if (data.ok) {
      const resultSection = document.getElementById('cl-result-section');
      const textarea      = document.getElementById('cl-letter-textarea');
      if (resultSection) resultSection.style.display = 'block';
      if (textarea) {
        textarea.value = data.text;
        _validateCoverLetter(textarea.value);
      }
    } else {
      showAlertModal('❌ Generation Failed', data.error || 'LLM did not return a cover letter.');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) {
      btn.disabled    = false;
      btn.textContent = '✨ Generate Cover Letter';
    }
  }
}

async function saveCoverLetter() {
  const textarea = document.getElementById('cl-letter-textarea');
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) {
    showAlertModal('⚠️ Empty Letter', 'Please generate or type a cover letter before saving.');
    return;
  }

  const btn = document.getElementById('cl-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }

  try {
    const res  = await fetch('/api/cover-letter/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const data = await res.json();

    if (data.ok) {
      showAlertModal('✅ Saved', `Cover letter saved as <strong>${escapeHtml(data.filename)}</strong> in your application folder.`);
    } else {
      showAlertModal('❌ Save Failed', data.error || 'Could not save cover letter.');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Cover Letter'; }
  }
}

// ==== End Cover Letter Tab ====

// ==== Cross-Document Consistency Report ====

/**
 * Build and render the cross-document consistency report in the Finalise tab.
 * Checks company name, job title, ATS keywords, and date formatting across
 * the CV (tabData.cv) and cover letter (#cl-letter-textarea).
 */
function _renderConsistencyReport(statusData) {
  const panel = document.getElementById('consistency-report');
  if (!panel) return;

  const analysis    = statusData.job_analysis || {};
  const company     = (analysis.company  || '').trim();
  const jobTitle    = (analysis.title    || '').trim();
  const atsKeywords = (analysis.ats_keywords || []).filter(Boolean).slice(0, 8);

  // Strip HTML tags from CV content for text search
  const cvHtml = (typeof tabData !== 'undefined' && tabData.cv) ? tabData.cv : '';
  const cvText = cvHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();

  // Get cover letter text if present
  const clEl   = document.getElementById('cl-letter-textarea');
  const clRaw  = clEl ? clEl.value : '';
  const clText = clRaw.toLowerCase();
  const hasCL  = clRaw.trim().length > 50;

  if (!company && !jobTitle && !atsKeywords.length) {
    panel.innerHTML = '';
    return;
  }

  const checks = [];

  // ── 1. Company name ──────────────────────────────────────────────
  if (company) {
    const compLc = company.toLowerCase();
    const inCV   = cvText.includes(compLc);
    const inCL   = hasCL && clText.includes(compLc);
    const missing = [];
    if (!inCV)          missing.push('CV');
    if (hasCL && !inCL) missing.push('cover letter');
    const status = missing.length === 0 ? 'pass' : missing.length < 2 && hasCL ? 'warn' : 'fail';
    checks.push({
      status,
      label:  'Company name',
      detail: status === 'pass'
        ? `\u201c${escapeHtml(company)}\u201d found in all documents.`
        : `\u201c${escapeHtml(company)}\u201d missing from: ${missing.join(', ')}.`,
    });
  }

  // ── 2. Job title ─────────────────────────────────────────────────
  if (jobTitle) {
    const titleLc   = jobTitle.toLowerCase();
    const titleCore = titleLc.replace(/^(senior|junior|lead|principal|staff|associate)\s+/, '');
    const inCV      = cvText.includes(titleLc) || cvText.includes(titleCore);
    const inCL      = hasCL && (clText.includes(titleLc) || clText.includes(titleCore));
    const missing   = [];
    if (!inCV)          missing.push('CV');
    if (hasCL && !inCL) missing.push('cover letter');
    const status = missing.length === 0 ? 'pass' : missing.length < 2 && hasCL ? 'warn' : 'fail';
    checks.push({
      status,
      label:  'Job title',
      detail: status === 'pass'
        ? `\u201c${escapeHtml(jobTitle)}\u201d found in all documents.`
        : `\u201c${escapeHtml(jobTitle)}\u201d missing from: ${missing.join(', ')}.`,
    });
  }

  // ── 3. ATS keywords (top 8) ──────────────────────────────────────
  if (atsKeywords.length) {
    const missingCV = atsKeywords.filter(kw => !cvText.includes(kw.toLowerCase()));
    const missingCL = hasCL ? atsKeywords.filter(kw => !clText.includes(kw.toLowerCase())) : [];
    const totalMissing = new Set([...missingCV, ...missingCL]).size;
    const status = totalMissing === 0 ? 'pass' : totalMissing <= 3 ? 'warn' : 'fail';
    const parts  = [];
    if (missingCV.length) parts.push(`Missing from CV: ${missingCV.map(k => `<em>${escapeHtml(k)}</em>`).join(', ')}`);
    if (missingCL.length) parts.push(`Missing from cover letter: ${missingCL.map(k => `<em>${escapeHtml(k)}</em>`).join(', ')}`);
    checks.push({
      status,
      label:  `ATS keywords (${atsKeywords.length} checked)`,
      detail: parts.length ? parts.join('. ') + '.' : `All ${atsKeywords.length} keywords present in documents.`,
    });
  }

  // ── 4. Date format consistency (CV) ──────────────────────────────
  if (cvText) {
    const hasWritten = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b/i.test(cvText);
    const hasISO     = /\b\d{4}-\d{2}\b/.test(cvText);
    const hasSlash   = /\b\d{1,2}\/\d{4}\b/.test(cvText);
    const formatCount = [hasWritten, hasISO, hasSlash].filter(Boolean).length;
    checks.push({
      status: formatCount <= 1 ? 'pass' : 'warn',
      label:  'Date formats (CV)',
      detail: formatCount <= 1
        ? 'Consistent date format throughout CV.'
        : 'Mixed date formats detected (e.g. \u201cJan 2020\u201d and \u201c2020-01\u201d) \u2014 standardise for a polished look.',
    });
  }

  // ── Render ────────────────────────────────────────────────────────
  const icons = { pass: '\u2705', warn: '\u26a0\ufe0f', fail: '\u274c' };
  const overallFail   = checks.some(c => c.status === 'fail');
  const overallWarn   = checks.some(c => c.status === 'warn');
  const overallStatus = overallFail ? 'fail' : overallWarn ? 'warn' : 'pass';
  const overallMsg    = overallFail
    ? 'Issues found \u2014 review before sending'
    : overallWarn ? 'Minor inconsistencies detected' : 'All checks passed';

  panel.innerHTML = `
    <div class="consistency-report">
      <div class="cr-header">
        <h3 style="margin:0;font-size:1em;">${icons[overallStatus]} Cross-Document Consistency</h3>
        <span class="cr-badge cr-${overallStatus}">${escapeHtml(overallMsg)}</span>
      </div>
      <p style="color:#6b7280;font-size:0.83em;margin:0 0 12px;">
        Checks company name, job title, ATS keywords, and date formatting across CV and cover letter.
      </p>
      <div class="cr-checks">
        ${checks.map(c => `
          <div class="cr-check cr-${c.status}">
            <span class="cr-icon">${icons[c.status]}</span>
            <span class="cr-label">${escapeHtml(c.label)}</span>
            <span class="cr-detail">${c.detail}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ==== End Cross-Document Consistency Report ====

let _clValidateTimer = null;
function _debouncedValidateCL() {
  clearTimeout(_clValidateTimer);
  _clValidateTimer = setTimeout(() => {
    const ta = document.getElementById('cl-letter-textarea');
    if (ta) _validateCoverLetter(ta.value);
  }, 600);
}

/**
 * Client-side cover letter quality checks.
 * 4 rules: opening, company name, word count (250-400), call-to-action.
 */
function _validateCoverLetter(text) {
  const panel     = document.getElementById('cl-validation-panel');
  const container = document.getElementById('cl-checks-container');
  if (!panel || !container || !text.trim()) return;

  // ── Rule 1: Opening pattern ────────────────────────────────────
  const firstLine = (text.split('\n').find(l => l.trim()) || '').trim().toLowerCase();
  const genericOpenings = [
    /^dear hiring manager/,
    /^dear sir or madam/,
    /^to whom it may concern/,
    /^dear recruiter/,
    /^dear human resources/,
    /^dear hr/,
  ];
  const genericOpening = genericOpenings.some(re => re.test(firstLine));
  const openingCheck = {
    pass: !genericOpening,
    label: 'Opening salutation',
    detail: genericOpening
      ? 'Uses a generic opener (“Dear Hiring Manager” etc.) — personalise with a name or role.'
      : 'Personalised opener — good.',
  };

  // ── Rule 2: Company-specific reference ────────────────────────
  const companyName = _getCompanyNameForCL();
  let companyCheck;
  if (!companyName) {
    companyCheck = { warn: true, label: 'Company reference', detail: 'Company name not detected from job description — verify manually.' };
  } else {
    const mentions = (text.toLowerCase().match(new RegExp(companyName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    companyCheck = {
      pass: mentions >= 2,
      warn: mentions === 1,
      label: 'Company reference',
      detail: mentions === 0
        ? `“${escapeHtml(companyName)}” not mentioned — add specific references.`
        : mentions === 1
          ? `“${escapeHtml(companyName)}” mentioned once — a second specific reference strengthens the letter.`
          : `“${escapeHtml(companyName)}” mentioned ${mentions} times — good specificity.`,
    };
  }

  // ── Rule 3: Word count (250-400) ──────────────────────────────
  const words    = text.trim().split(/\s+/).filter(Boolean).length;
  const wcPct    = Math.min(100, (words / 400) * 100);
  const wcColour = words < 200 ? '#ef4444' : words <= 250 ? '#f59e0b' : words <= 400 ? '#22c55e' : words <= 450 ? '#f59e0b' : '#ef4444';
  const wcStatus = words >= 250 && words <= 400 ? 'pass' : words >= 200 && words <= 450 ? 'warn' : 'fail';
  const wcBar    = `<span class="cl-wc-bar"><span class="cl-wc-fill" style="width:${wcPct}%;background:${wcColour};"></span></span>`;
  const wordCountCheck = {
    [wcStatus]: true,
    label: 'Word count (250–400)',
    detail: `${words} words ${wcBar} — ${ words < 250 ? 'too short; aim for at least 250.' : words > 400 ? 'too long; trim to 400 words.' : 'within target range.' }`,
  };

  // ── Rule 4: Call-to-action closing ────────────────────────────
  const lastPara = text.split(/\n{2,}/).filter(p => p.trim()).slice(-1)[0] || '';
  const ctaPatterns = [
    /interview/i, /discuss/i, /opportunity to (speak|talk|meet|connect)/i,
    /hear from you/i, /look forward to/i, /welcome the chance/i,
    /available (for|to)/i, /contact me/i,
  ];
  const hasCta = ctaPatterns.some(re => re.test(lastPara));
  const ctaCheck = {
    pass: hasCta,
    label: 'Call-to-action closing',
    detail: hasCta
      ? 'Closing paragraph contains a call-to-action — good.'
      : 'No call-to-action found in the closing paragraph — add an interview request or follow-up offer.',
  };

  // ── Render ─────────────────────────────────────────────────────
  const checks = [openingCheck, companyCheck, wordCountCheck, ctaCheck];
  container.innerHTML = checks.map(c => {
    const state = c.pass ? 'pass' : c.warn ? 'warn' : 'fail';
    return `<div class="cl-check ${state}">
      <span class="cc-icon"></span>
      <span class="cc-label">${escapeHtml(c.label)}</span>
      <span class="cc-detail">${c.detail}</span>
    </div>`;
  }).join('');

  panel.style.display = 'block';
}

function _getCompanyNameForCL() {
  // Try analysis data first, then fall back to job description first line
  const analysis = window._lastAnalysisData || (window.pendingRecommendations && window.pendingRecommendations.job_analysis);
  if (analysis && analysis.company_name) return analysis.company_name;
  if (analysis && analysis.company)      return analysis.company;
  // Fall back: first non-empty line of job description in tabData
  const jd = (typeof tabData !== 'undefined' && tabData.job) ? tabData.job : '';
  const firstLine = jd.split('\n').find(l => l.trim());
  return firstLine ? firstLine.trim().slice(0, 60) : '';
}

// ==== Screening Tab ====

/** Per-question draft state: { format, experienceIndices, responseText, topicTag, priorResponse } */
const _screeningState = {};

async function populateScreeningTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:20px 10px;">
      <h2 style="font-size:1.3em;font-weight:700;margin-bottom:8px;">📋 Screening Questions</h2>
      <p class="sc-intro">Paste one or more screening questions below — one per line, or separated by blank lines. Click <strong>Parse Questions</strong> to generate tailored draft responses.</p>
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:20px;">
        <textarea id="sc-input" rows="6" style="flex:1;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.93em;resize:vertical;" placeholder="Paste screening questions here…&#10;&#10;E.g.&#10;Describe a time you led a cross-functional project.&#10;&#10;How do you handle tight deadlines?"></textarea>
        <button class="btn btn-primary" onclick="parseScreeningQuestions()">Parse Questions</button>
      </div>
      <div id="sc-questions-container"></div>
      <div class="sc-save-bar" id="sc-save-bar" style="display:none;">
        <button class="btn btn-success" id="sc-save-btn" onclick="saveScreeningResponses()">💾 Save All Responses</button>
      </div>
    </div>`;
}

function parseScreeningQuestions() {
  const raw = (document.getElementById('sc-input')?.value || '').trim();
  if (!raw) { showAlertModal('⚠️ No Input', 'Please paste at least one screening question first.'); return; }

  // Split on double-newline or numbered list patterns; fall back to single lines
  let questions = raw.split(/\n\s*\n+/).map(q => q.trim()).filter(Boolean);
  if (questions.length === 1) {
    // Try splitting on numbered lines like "1. " or "Q1: " etc.
    const numbered = raw.split(/\n(?=\d+[\.\)]\s|\bQ\d+[:\.\s])/).map(q => q.trim()).filter(Boolean);
    if (numbered.length > 1) questions = numbered;
  }

  const container = document.getElementById('sc-questions-container');
  container.innerHTML = questions.map((q, i) => renderQuestionBlock(q, i)).join('');
  document.getElementById('sc-save-bar').style.display = questions.length ? '' : 'none';

  // Kick off searches in parallel
  questions.forEach((q, i) => searchForQuestion(q, i));
}

function renderQuestionBlock(question, idx) {
  return `
    <div class="sc-question-block" id="sc-block-${idx}" data-question="${escapeHtml(question)}">
      <div class="sc-question-header">
        <span class="sc-question-num">${idx + 1}</span>
        <span>${escapeHtml(question)}</span>
      </div>
      <div class="sc-question-body">
        <div id="sc-prior-${idx}"><em style="color:#94a3b8;font-size:0.87em;">Searching response library…</em></div>
        <div id="sc-exp-${idx}"></div>
        <div class="sc-format-row" id="sc-fmt-${idx}">
          <span style="font-size:0.85em;font-weight:600;color:#374151;align-self:center;">Format:</span>
          ${['direct','star','technical'].map(f => `
            <button class="sc-format-btn${f === 'direct' ? ' active' : ''}" data-fmt="${f}" onclick="selectFormat(${idx},'${f}',this)">${_fmtLabel(f)}</button>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" id="sc-gen-btn-${idx}" onclick="generateScreeningResponse(${idx})">✨ Generate Draft</button>
        <div id="sc-result-${idx}" style="margin-top:12px;"></div>
        <div class="sc-topic-row" id="sc-topic-row-${idx}" style="display:none;">
          <label for="sc-topic-${idx}">Topic tag:</label>
          <input class="sc-topic-input" id="sc-topic-${idx}" type="text" placeholder="e.g. leadership, cross-functional, deadline-management">
        </div>
      </div>
    </div>`;
}

function _fmtLabel(fmt) {
  return { direct: 'Direct/Concise (150–200w)', star: 'STAR (250–350w)', technical: 'Technical Detail (400–500w)' }[fmt] || fmt;
}

function selectFormat(idx, fmt, btn) {
  document.querySelectorAll(`#sc-fmt-${idx} .sc-format-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!_screeningState[idx]) _screeningState[idx] = {};
  _screeningState[idx].format = fmt;
}

function _getSelectedFormat(idx) {
  const active = document.querySelector(`#sc-fmt-${idx} .sc-format-btn.active`);
  return active ? active.getAttribute('data-fmt') : 'direct';
}

async function searchForQuestion(question, idx) {
  try {
    const res  = await fetch('/api/screening/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!data.ok) { document.getElementById(`sc-prior-${idx}`).innerHTML = ''; return; }

    // Render prior match
    const priorEl = document.getElementById(`sc-prior-${idx}`);
    if (data.prior) {
      const p = data.prior;
      priorEl.innerHTML = `
        <div class="sc-prior-match">
          <strong>📚 Similar prior response found</strong> — ${escapeHtml(p.company || '')} (${escapeHtml(p.date || '')})<br>
          <em style="color:#78350f;">"${escapeHtml((p.question || '').substring(0, 120))}…"</em>
          <div style="margin-top:6px;">
            <label style="font-size:0.85em;">
              <input type="checkbox" id="sc-use-prior-${idx}" onchange="togglePriorUse(${idx})"> Use as starting point
            </label>
          </div>
        </div>`;
      if (!_screeningState[idx]) _screeningState[idx] = {};
      _screeningState[idx].priorResponse = p.response_text || '';
    } else {
      priorEl.innerHTML = '';
    }

    // Render experience cards
    const expEl = document.getElementById(`sc-exp-${idx}`);
    if (data.experiences && data.experiences.length) {
      const cards = data.experiences.map(e => `
        <label class="sc-exp-card">
          <input type="checkbox" data-idx="${e.idx}" checked onchange="updateExpSelection(${idx})">
          <div style="flex:1;">
            <strong>${escapeHtml(e.title)}</strong> · ${escapeHtml(e.company)}
            <span class="sc-score-badge">${Math.round(e.score * 100)}% match</span>
            <div style="color:#64748b;margin-top:2px;">${escapeHtml(e.summary)}</div>
          </div>
        </label>`).join('');
      expEl.innerHTML = `<p style="font-size:0.85em;font-weight:600;color:#374151;margin-bottom:6px;">Relevant experience:</p>
        <div class="sc-exp-list">${cards}</div>`;
      if (!_screeningState[idx]) _screeningState[idx] = {};
      _screeningState[idx].experienceIndices = data.experiences.map(e => e.idx);
    } else {
      expEl.innerHTML = '';
    }
  } catch (_) {
    document.getElementById(`sc-prior-${idx}`).innerHTML = '';
  }
}

function togglePriorUse(idx) {
  const cb = document.getElementById(`sc-use-prior-${idx}`);
  if (!_screeningState[idx]) _screeningState[idx] = {};
  _screeningState[idx].usePrior = cb?.checked ?? false;
}

function updateExpSelection(idx) {
  const block     = document.getElementById(`sc-block-${idx}`);
  const checked   = Array.from(block.querySelectorAll('input[type=checkbox][data-idx]'))
    .filter(cb => cb.checked)
    .map(cb => parseInt(cb.getAttribute('data-idx'), 10));
  if (!_screeningState[idx]) _screeningState[idx] = {};
  _screeningState[idx].experienceIndices = checked;
}

async function generateScreeningResponse(idx) {
  const btn      = document.getElementById(`sc-gen-btn-${idx}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating…'; }

  const question = document.getElementById(`sc-block-${idx}`)?.dataset.question || '';
  const state    = _screeningState[idx] || {};
  const fmt      = _getSelectedFormat(idx);
  const prior    = (state.usePrior && state.priorResponse) ? state.priorResponse : '';
  const expIdx   = state.experienceIndices ?? [];

  try {
    const res  = await fetch('/api/screening/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        question,
        format:              fmt,
        experience_indices:  expIdx,
        prior_response:      prior,
      }),
    });
    const data = await res.json();
    if (!data.ok) { showAlertModal('❌ Error', data.error || 'Generation failed.'); return; }

    if (!_screeningState[idx]) _screeningState[idx] = {};
    _screeningState[idx].responseText = data.text;
    _screeningState[idx].format       = fmt;

    document.getElementById(`sc-result-${idx}`).innerHTML = `
      <textarea class="sc-response-textarea" id="sc-text-${idx}" rows="7"
        oninput="_screeningState[${idx}] = _screeningState[${idx}] || {}; _screeningState[${idx}].responseText = this.value;"
      >${escapeHtml(data.text)}</textarea>`;
    document.getElementById(`sc-topic-row-${idx}`).style.display = '';
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Draft'; }
  }
}

async function saveScreeningResponses() {
  const btn = document.getElementById('sc-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }

  const responses = [];
  document.querySelectorAll('.sc-question-block').forEach((block, i) => {
    const qEl    = block.querySelector('.sc-question-header span:last-child');
    const textEl = document.getElementById(`sc-text-${i}`);
    const topicEl = document.getElementById(`sc-topic-${i}`);
    if (!textEl) return; // not yet generated — skip

    const question     = qEl ? qEl.textContent.trim() : '';
    const responseText = (_screeningState[i]?.responseText) || textEl.value || '';
    const fmt          = _getSelectedFormat(i);
    const topicTag     = topicEl ? topicEl.value.trim() : '';

    responses.push({ question, topic_tag: topicTag, format: fmt, response_text: responseText });
  });

  if (!responses.length) {
    showAlertModal('⚠️ Nothing to Save', 'Please generate at least one response before saving.');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save All Responses'; }
    return;
  }

  try {
    const res  = await fetch('/api/screening/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ responses }),
    });
    const data = await res.json();
    if (data.ok) {
      showAlertModal('✅ Saved', `${data.count} response${data.count !== 1 ? 's' : ''} saved as <strong>${escapeHtml(data.filename)}</strong> and added to your response library.`);
    } else {
      showAlertModal('❌ Save Failed', data.error || 'Could not save responses.');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save All Responses'; }
  }
}

// ==== End Screening Tab ====

