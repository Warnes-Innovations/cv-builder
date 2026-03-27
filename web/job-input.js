// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/job-input.js
 * Job description input panel: paste, URL fetch, file upload, load-items table.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - escapeHtml (utils.js)
 *   - appendMessage, appendRetryMessage (message-queue.js)
 *   - setLoading (fetch-utils.js)
 *   - saveTabData (session-manager.js)
 *   - switchTab (review-table-base.js, Tier 4)
 *   - analyzeJob (job-analysis.js)
 *   - fetchStatus (api-client.js)
 *   - confirmDialog (ui-core.js)
 *   - showAlertModal (ui-helpers.js)
 *   - loadSessionFile (session-manager.js)
 *   - tabData, currentTab, PHASES (window globals)
 */

import { getLogger } from './logger.js';
const log = getLogger('job-input');

import { PHASES, stateManager } from './state-manager.js';

// ---------------------------------------------------------------------------
// Job tab display
// ---------------------------------------------------------------------------

async function populateJobTab() {
  const content = document.getElementById('document-content');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.job_description_text) {
      const jobText = data.job_description_text;
      const positionName = data.position_name || null;
      const lines = jobText.split('\n');
      const h1 = positionName || lines[0];
      let html = '<h1>' + escapeHtml(h1) + '</h1>';
      if (!positionName && lines[1]) html += '<h2>' + escapeHtml(lines[1]) + '</h2>';

      html += '<div style="white-space: pre-wrap; line-height: 1.6; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">' + escapeHtml(jobText) + '</div>';
      html += '<div style="margin-top:20px;"><button onclick="showLoadJobPanel()" class="btn-secondary">📥 Load Different Job</button></div>';
      content.innerHTML = html;
    } else {
      await showLoadJobPanel();
      return;
    }
  } catch (error) {
    log.error('Error loading job description:', error);
    await showLoadJobPanel();
  }
}

// ---------------------------------------------------------------------------
// Load-job panel (sessions + server files table + input methods)
// ---------------------------------------------------------------------------

async function showLoadJobPanel() {
  if (stateManager.getCurrentTab() !== 'job') {
    switchTab('job');
  }

  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading…</p></div>';

  let items = [];
  try {
    const res = await fetch('/api/load-items');
    if (res.ok) ({ items } = await res.json());
  } catch (e) { /* server offline — show empty table */ }

  const stepJob = document.getElementById('step-job');
  if (stepJob) {
    stepJob.classList.remove('completed');
    stepJob.classList.add('active');
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ts.slice(0, 10); }
  }

  function phaseLabel(phase) {
    const map = {
      [PHASES.INIT]: '📋 Init', [PHASES.JOB_ANALYSIS]: '🔍 Analysis',
      [PHASES.CUSTOMIZATION]: '⚙️ Custom.', [PHASES.GENERATION]: '📄 Generate',
      [PHASES.REFINEMENT]: '✅ Done',
    };
    return map[phase] || (phase || '—');
  }

  const rows = items.map(item => {
    const typeBadge = item.kind === 'session'
      ? '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;">💾 Session</span>'
      : '<span style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;">📄 File</span>';
    const escapedItem = JSON.stringify(item).replace(/"/g, '&quot;');

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

      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:visible;">
        <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:13px;color:#475569;">Add New Job Description</div>
        <div style="padding:20px;">

          <div class="input-method-tabs" style="margin-top:0;">
            <button class="input-tab active" onclick="switchInputMethod('paste')">📝 Paste Text</button>
            <button class="input-tab" onclick="switchInputMethod('url')">🔗 From URL</button>
            <button class="input-tab" onclick="switchInputMethod('file')">📁 Upload File</button>
          </div>

          <div class="input-method active" id="paste-method">
            <textarea id="job-text-input" placeholder="Paste the job description here…" rows="12"
              aria-required="true"
              aria-describedby="paste-char-count paste-error"
              onblur="_validatePasteField()" oninput="_updatePasteCharCount()"
              style="width:100%;font-family:inherit;font-size:14px;padding:12px;border:1px solid #d1d5db;border-radius:6px;resize:vertical;margin-top:8px;"></textarea>
            <div id="paste-char-count" aria-live="polite"
              style="font-size:12px;color:#94a3b8;margin-top:4px;min-height:18px;"></div>
            <span id="paste-error" class="field-error" aria-live="polite"></span>
            <div style="margin-top:10px;display:flex;gap:12px;">
              <button onclick="submitJobText()" class="btn-primary">Submit Job Description</button>
              <button onclick="clearJobInput()" class="btn-secondary">Clear</button>
            </div>
          </div>

          <div class="input-method" id="url-method">
            <p style="margin:8px 0 10px;">Enter a URL to automatically extract the job description:</p>
            <input type="url" id="job-url-input" placeholder="https://company.com/job-posting"
              aria-required="true"
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
  // Wire up session delete buttons via event delegation
  content.querySelector('tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-delete-session]');
    if (!btn) return;
    e.stopPropagation();
    deleteSession(btn.dataset.deleteSession, e);
  });
}

// ---------------------------------------------------------------------------
// Load item from row / server file
// ---------------------------------------------------------------------------

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
  setLoading(true, `Loading job file…`);
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
      stateManager.setTabData('job', data.job_text);
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

// backward-compat shim
function showJobInput() { showLoadJobPanel(); }

// ---------------------------------------------------------------------------
// Session delete from load panel
// ---------------------------------------------------------------------------

async function deleteSession(sessionId, event) {
  event.stopPropagation();

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
      showLoadJobPanel();
      log.info('Session deleted successfully');
    } else {
      alert(`Failed to delete session: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error('Error deleting session:', error);
    alert('Failed to delete session. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Input method switching
// ---------------------------------------------------------------------------

function switchInputMethod(method) {
  document.querySelectorAll('.input-tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');

  document.querySelectorAll('.input-method').forEach(panel => panel.classList.remove('active'));
  document.getElementById(method + '-method').classList.add('active');
}

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

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
      stateManager.setTabData('job', data.text);
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

// ---------------------------------------------------------------------------
// Paste text submission
// ---------------------------------------------------------------------------

const PASTE_MIN_CHARS = 200;

function _updatePasteCharCount() {
  const val = (document.getElementById('job-text-input')?.value || '').trim();
  const countEl = document.getElementById('paste-char-count');
  if (!countEl) return;
  const n = val.length;
  if (n === 0) {
    countEl.style.color = '#94a3b8';
    countEl.textContent = '';
  } else if (n < PASTE_MIN_CHARS) {
    countEl.style.color = '#ef4444';
    countEl.textContent = `${n} / ${PASTE_MIN_CHARS} minimum — Too short, aim for at least ${PASTE_MIN_CHARS} characters`;
  } else {
    countEl.style.color = '#16a34a';
    countEl.textContent = `${n} / ${PASTE_MIN_CHARS} minimum ✓`;
  }
}

function _validatePasteField() {
  const val = (document.getElementById('job-text-input')?.value || '').trim();
  _updatePasteCharCount();
  if (val.length > 0 && val.length < PASTE_MIN_CHARS) {
    _showFieldError('job-text-input', 'paste-error', `Job description is too short — please paste at least ${PASTE_MIN_CHARS} characters.`);
  } else {
    _clearFieldError('job-text-input', 'paste-error');
  }
}

async function submitJobText() {
  /* duckflow:
   *   id: job_ui_submit_live
   *   kind: ui
   *   timestamp: '2026-03-25T21:39:48Z'
   *   status: live
   *   handles:
   *   - ui:job-input.submit-text
   *   calls:
   *   - POST /api/job
   *   - POST /api/action
   *   reads:
   *   - dom:#job-text-input.value
   *   writes:
   *   - request:POST /api/job.job_text
   *   - tab:job
   *   - ui:workflow.job
   *   notes: Submits pasted job text to the backend, caches the same text in tab state, and then starts job analysis through the normal action flow.
   */
  const textInput = document.getElementById('job-text-input');
  const jobText = textInput.value.trim();

  if (!jobText) {
    _showFieldError('job-text-input', 'paste-error', 'Please enter a job description before submitting.');
    textInput.focus();
    return;
  }
  if (jobText.length < PASTE_MIN_CHARS) {
    _showFieldError('job-text-input', 'paste-error', `Job description is too short — please paste at least ${PASTE_MIN_CHARS} characters.`);
    textInput.focus();
    return;
  }
  _clearFieldError('job-text-input', 'paste-error');

  setLoading(true, 'Analysing job description…');
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
      stateManager.setTabData('job', jobText);
      saveTabData();
      appendMessage('assistant', '✅ Job description submitted successfully.');

      if (typeof updateTabBarForStage === 'function') {
        updateTabBarForStage('job');
      }
      switchTab('job');

      await populateJobTab();
      setLoading(false);
      await analyzeJob();
      return;
    }
  } catch (error) {
    log.error('Error submitting job:', error);
    appendRetryMessage('❌ Error submitting job description: ' + error.message, submitJobText);
  }

  setLoading(false);
}

// ---------------------------------------------------------------------------
// URL fetch
// ---------------------------------------------------------------------------

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

  setLoading(true, 'Fetching job from URL…');
  appendMessage('user', `Fetching job description from URL: ${url}`);

  try {
    const response = await fetch('/api/fetch-job-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });

    const data = await response.json();

    if (data.error) {
      let errorMessage = data.error;
      let helpMessage = data.message || '';

      if (data.protected_site) {
        errorMessage = `${data.site_name} Protection Detected`;
        helpMessage = data.message;

        if (data.instructions && data.instructions.length > 0) {
          helpMessage += '\n\nHow to proceed:\n' + data.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
        }

        showProtectedSiteModal(data.site_name, data.message, data.instructions);
      } else if (data.instructions) {
        helpMessage += '\n\nSuggested solutions:\n' + data.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');
        showAlertModal('URL Fetch Error', `${errorMessage}\n\n${helpMessage}`);
      } else {
        _showFieldError('job-url-input', 'url-error', errorMessage);
        showAlertModal('Error', `${errorMessage}${helpMessage ? '\n\n' + helpMessage : ''}`);
      }

      appendMessage('system', `❌ ${errorMessage}: ${data.message || 'Please try manual input.'}`);
    } else {
      stateManager.setTabData('job', data.job_text);
      saveTabData();
      appendMessage('assistant', `✅ ${data.message}! Fetched ${data.content_length || 'content'} characters. You can now analyze it.`);
      await populateJobTab();
      await fetchStatus();
    }
  } catch (error) {
    log.error('Error fetching URL:', error);
    _showFieldError('job-url-input', 'url-error', `Network error: ${error.message}`);
    appendRetryMessage(`Network error occurred: ${error.message}. Please check your connection or try manual input.`, fetchJobFromURL);
    showAlertModal('Network Error', 'Unable to connect to the server. Please try again or use the "Paste Text" option to input the job description manually.');
  }

  setLoading(false);
}

function showProtectedSiteModal(siteName, message, instructions) {
  let instructionsList = '';
  if (instructions && instructions.length > 0) {
    instructionsList = '<ol style="margin: 16px 0; padding-left: 20px;">' +
                      instructions.map(inst => `<li style="margin: 8px 0;">${inst}</li>`).join('') +
                      '</ol>';
  }

  const safeName = escapeHtml(siteName);
  const safeMessage = escapeHtml(message);
  const modalContent = `
    <div style="text-align: center; margin-bottom: 16px;">
      🔒 <strong>${safeName} requires manual input</strong>
    </div>
    <p>${safeMessage}</p>
    ${instructionsList}
    <div style="margin-top: 20px; padding: 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px;">
      <strong>💡 Tip:</strong> After copying the job description, click the "Paste Text" tab above to submit it directly.
    </div>
  `;

  showAlertModal(`${safeName} Input Required`, modalContent);
}

// ---------------------------------------------------------------------------
// Clear helpers
// ---------------------------------------------------------------------------

function clearJobInput() {
  const el = document.getElementById('job-text-input');
  if (el) el.value = '';
}

function clearURLInput() {
  const el = document.getElementById('job-url-input');
  if (el) el.value = '';
}

// ---------------------------------------------------------------------------
// Field error helpers
// ---------------------------------------------------------------------------

function _showFieldError(inputId, errorId, msg) {
  const inp  = document.getElementById(inputId);
  const span = document.getElementById(errorId);
  if (span)  { span.textContent = msg; span.classList.add('visible'); }
  if (inp)   {
    inp.classList.add('field-invalid');
    inp.setAttribute('aria-invalid', 'true');
  }
}

function _clearFieldError(inputId, errorId) {
  const inp  = document.getElementById(inputId);
  const span = document.getElementById(errorId);
  if (span)  { span.textContent = ''; span.classList.remove('visible'); }
  if (inp)   {
    inp.classList.remove('field-invalid');
    inp.setAttribute('aria-invalid', 'false');
  }
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  populateJobTab,
  showLoadJobPanel,
  loadItemFromRow,
  _loadServerJobFile,
  showJobInput,
  deleteSession,
  switchInputMethod,
  _pendingUploadFile,
  handleFileDrop,
  handleFileSelected,
  clearSelectedFile,
  uploadJobFile,
  PASTE_MIN_CHARS,
  _updatePasteCharCount,
  _validatePasteField,
  submitJobText,
  _validateURLField,
  fetchJobFromURL,
  showProtectedSiteModal,
  clearJobInput,
  clearURLInput,
  _showFieldError,
  _clearFieldError,
};
