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
 *   - showAlertModal (ui-helpers.js)
 *   - tabData, currentTab, PHASES (window globals)
 *
 * GAP-23 intake confirmation:
 *   showIntakeConfirmation() — called after any job-text submission.  Fetches
 *   /api/intake-metadata, renders an editable company/role/date form, and on
 *   confirm calls /api/confirm-intake (which saves the session) before
 *   triggering analyzeJob().
 *   Prior-session clarification defaults are fetched from
 *   /api/prior-clarifications and noted in the confirmation panel.
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

  const stepJob = document.getElementById('step-job');
  if (stepJob) {
    stepJob.classList.remove('completed');
    stepJob.classList.add('active');
  }

  content.innerHTML = `
    <div style="max-width:820px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:6px;">📥 Add Job Description</h1>

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
}

// backward-compat shim
function showJobInput() { showLoadJobPanel(); }

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
      appendMessage('assistant', `✅ Job description loaded from "${data.filename}" (${data.content_length.toLocaleString()} chars).`);
      await showIntakeConfirmation();
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
   *   timestamp: '2026-03-27T18:03:00Z'
   *   status: live
   *   handles:
   *   - ui:job-input.submit-text
   *   calls:
   *   - POST /api/job
   *   - showIntakeConfirmation
   *   reads:
   *   - dom:#job-text-input.value
   *   writes:
   *   - request:POST /api/job.job_text
   *   - tab:job
   *   - ui:workflow.job
   *   notes: Submits pasted job text to the backend, caches the same text in tab state, then shows the GAP-23 intake confirmation form instead of triggering analysis immediately.
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
      setLoading(false);
      await showIntakeConfirmation();
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
      appendMessage('assistant', `✅ ${data.message}! Fetched ${data.content_length || 'content'} characters.`);
      await showIntakeConfirmation();
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

// ---------------------------------------------------------------------------
// Intake confirmation (GAP-23)
// ---------------------------------------------------------------------------

/**
 * Show an editable intake-confirmation form after job text is stored.
 *
 * Fetches /api/intake-metadata (regex-extracted company/role/date) and
 * optionally /api/prior-clarifications to note prior session defaults.
 * The user may correct the extracted values then click "Confirm & Start
 * Analysis" (→ confirmIntakeAndAnalyze) or "Skip" (→ skipIntakeConfirmation).
 *
 * duckflow:
 *   id: intake_confirm_show_live
 *   kind: ui
 *   timestamp: '2026-03-27T18:03:00Z'
 *   status: live
 *   calls:
 *   - GET /api/intake-metadata
 *   - GET /api/prior-clarifications
 *   writes:
 *   - dom:#document-content
 *   notes: Renders editable confirmation form; confirm path calls confirmIntakeAndAnalyze().
 */
async function showIntakeConfirmation() {
  let meta = { role: null, company: null, date_applied: null };
  try {
    const res = await fetch('/api/intake-metadata');
    if (res.ok) meta = await res.json();
  } catch (err) {
    log.warn('intake-metadata fetch failed:', err);
  }

  let priorHtml = '';
  try {
    const priorRes = await fetch('/api/prior-clarifications');
    if (priorRes.ok) {
      const priorData = await priorRes.json();
      if (priorData.found && priorData.matches && priorData.matches.length > 0) {
        const m     = priorData.matches[0];
        const label = escapeHtml(m.role || m.position_name || '');
        priorHtml = `<div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:6px;padding:12px;margin-top:12px;font-size:13px;">
          <strong>💡 Prior session found</strong> for a similar role ("${label}") — your previous clarification answers will be pre-loaded when analysis runs.
        </div>`;
      }
    }
  } catch (_) {}

  const today      = new Date().toISOString().slice(0, 10);
  const roleVal    = escapeHtml(meta.role         || '');
  const companyVal = escapeHtml(meta.company      || '');
  const dateVal    = escapeHtml(meta.date_applied || today);

  const content = document.getElementById('document-content');
  if (!content) { await analyzeJob(); return; }

  content.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:4px;">✅ Job Description Received</h2>
      <p style="color:#64748b;margin-bottom:20px;">Confirm or correct the extracted details before analysis begins.</p>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px;background:#f8fafc;">
        <div style="margin-bottom:14px;">
          <label style="display:block;font-weight:600;font-size:13px;color:#374151;margin-bottom:4px;" for="intake-role">Role Title</label>
          <input type="text" id="intake-role" value="${roleVal}"
            placeholder="e.g. Senior Software Engineer"
            style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-weight:600;font-size:13px;color:#374151;margin-bottom:4px;" for="intake-company">Company</label>
          <input type="text" id="intake-company" value="${companyVal}"
            placeholder="e.g. Acme Corp"
            style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-weight:600;font-size:13px;color:#374151;margin-bottom:4px;" for="intake-date">Date Applied</label>
          <input type="date" id="intake-date" value="${dateVal}"
            style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </div>
        ${priorHtml}
        <div style="display:flex;gap:12px;margin-top:18px;">
          <button id="intake-confirm-btn" class="btn-primary" onclick="confirmIntakeAndAnalyze()">Confirm &amp; Start Analysis</button>
          <button class="btn-secondary" onclick="skipIntakeConfirmation()">Skip</button>
        </div>
      </div>
    </div>`;
}

/**
 * Called when the user clicks "Confirm & Start Analysis".
 *
 * duckflow:
 *   id: intake_confirm_submit_live
 *   kind: ui
 *   timestamp: '2026-03-27T18:03:00Z'
 *   status: live
 *   handles:
 *   - ui:intake-confirm.click
 *   calls:
 *   - POST /api/confirm-intake
 *   - analyzeJob
 *   reads:
 *   - dom:#intake-role.value
 *   - dom:#intake-company.value
 *   - dom:#intake-date.value
 *   writes:
 *   - state:intake
 *   - state:position_name
 *   - session:saved
 */
async function confirmIntakeAndAnalyze() {
  const btn = document.getElementById('intake-confirm-btn');
  if (btn) btn.disabled = true;

  const role        = (document.getElementById('intake-role')?.value    || '').trim();
  const company     = (document.getElementById('intake-company')?.value || '').trim();
  const dateApplied = (document.getElementById('intake-date')?.value    || '').trim();

  try {
    setLoading(true, 'Saving intake details…');
    const res = await fetch('/api/confirm-intake', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role, company, date_applied: dateApplied }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      log.warn('confirm-intake error (continuing):', data.error);
    }
  } catch (err) {
    log.warn('confirm-intake failed (continuing):', err);
  }

  setLoading(false);
  await analyzeJob();
}

/**
 * Called when the user clicks "Skip" on the intake confirmation form.
 * Proceeds directly to analysis without persisting intake metadata.
 */
async function skipIntakeConfirmation() {
  await analyzeJob();
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  populateJobTab,
  showLoadJobPanel,
  showJobInput,
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
  showIntakeConfirmation,
  confirmIntakeAndAnalyze,
  skipIntakeConfirmation,
};
