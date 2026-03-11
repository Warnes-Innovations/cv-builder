/**
 * ui-core.js
 * Core UI routing, tab management, modal management, and page initialization.
 * Entry point for the application - loads on DOMContentLoaded.
 */

// StorageKeys is defined in api-client.js (loaded before this file)

/**
 * Global fetch interceptor — shows amber banner on 409 Conflict (session already active).
 */
(function() {
  const _origFetch = window.fetch;
  window.fetch = async function(...args) {
    const resp = await _origFetch.apply(this, args);
    if (resp.status === 409) {
      showSessionConflictBanner();
    }
    return resp;
  };
})();

/**
 * Initialize the application on DOM ready.
 * Sets up event listeners, restores session, and loads initial tab.
 */
async function initialize() {
  try {
    // Initialize state
    if (typeof initializeState === 'function') {
      initializeState();
    }

    // Try to restore prior session
    if (typeof restoreSession === 'function') {
      await restoreSession();
    }

    // Set up event listeners
    setupEventListeners();

    // Restore tab data from localStorage
    if (typeof loadStateFromLocalStorage === 'function') {
      loadStateFromLocalStorage();
    }

    // Load initial tab content
    const savedTab = localStorage.getItem(StorageKeys.CURRENT_TAB) || 'job';
    switchTab(savedTab);

    console.log('✅ Application initialized');
  } catch (error) {
    console.error('Initialization error:', error);
    appendMessage('system', `⚠️ Failed to initialize: ${error.message}`);
  }
}

/**
 * Set up all global event listeners.
 */
function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.id.replace('tab-', '');
      switchTab(tabName);
    });
  });

  // Message input (Enter key to send)
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (typeof sendMessage === 'function') {
          sendMessage();
        }
      }
    });
  }

  // Chat toggle button
  const toggleBtn = document.querySelector('.toggle-chat');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleChat);
  }

  // Modal close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Close modals on background click
  document.querySelectorAll('[role="dialog"]').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

/**
 * Switch to a specific tab and load its content.
 * @param {string} tab - Tab name (job, analysis, customizations, cv, download)
 */
function switchTab(tab) {
  // Update active tab button
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabBtn = document.getElementById(`tab-${tab}`);
  if (tabBtn) {
    tabBtn.classList.add('active');
  }

  // Update current tab state via stateManager
  try {
    if (typeof stateManager !== 'undefined' && stateManager.setCurrentTab) {
      stateManager.setCurrentTab(tab);
    } else {
      // Fallback: direct localStorage if stateManager not available
      localStorage.setItem(StorageKeys.CURRENT_TAB, tab);
    }
  } catch (e) {
    console.warn('Could not save current tab to localStorage');
  }

  // Adjust layout for CV tab (paper-sized) vs. others (full-width)
  const content = document.getElementById('document-content');
  if (content) {
    content.classList.toggle('full-width', tab !== 'cv');
  }

  // Load content for the tab
  loadTabContent(tab);
}

/**
 * Load content for a specific tab.
 * Routes to appropriate rendering function based on tab.
 * @param {string} tab - Tab name
 */
async function loadTabContent(tab) {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = ''; // Clear previous content

  try {
    switch (tab) {
      case 'job':
        if (typeof populateJobTab === 'function') {
          await populateJobTab();
        }
        break;

      case 'analysis':
        if (typeof populateAnalysisTab === 'function' && tabData.analysis) {
          populateAnalysisTab(tabData.analysis);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">No analysis data yet. Submit a job description to begin.</p>';
        }
        break;

      case 'customizations':
        if (typeof populateCustomizationsTab === 'function' && tabData.customizations) {
          populateCustomizationsTab(tabData.customizations);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Run analysis first to see customization recommendations.</p>';
        }
        break;

      case 'cv':
        if (typeof populateCVTab === 'function' && tabData.cv) {
          populateCVTab(tabData.cv);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV to see preview.</p>';
        }
        break;

      case 'download':
        if (typeof populateDownloadTab === 'function' && tabData.cv) {
          await populateDownloadTab(tabData.cv);
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV first to download.</p>';
        }
        break;

      default:
        content.innerHTML = '<p style="padding: 20px; color: #999;">Unknown tab.</p>';
    }
  } catch (error) {
    console.error(`Error loading tab ${tab}:`, error);
    content.innerHTML = `<p style="padding: 20px; color: #c41e3a;">Error loading content: ${error.message}</p>`;
  }
}

/**
 * Toggle collapsible chat panel (interaction area).
 */
function toggleChat() {
  const interactionArea = document.querySelector('.interaction-area');
  const viewerArea = document.querySelector('.viewer-area');

  if (interactionArea) {
    const isCollapsed = interactionArea.classList.toggle('collapsed');
    if (viewerArea) {
      viewerArea.style.flex = isCollapsed ? '1 1 100%' : '0 1 60%';
    }
    try {
      localStorage.setItem(StorageKeys.CHAT_COLLAPSED, isCollapsed);
    } catch (e) {
      console.warn('Could not save chat state');
    }
  }
}

/**
 * Open a modal by ID.
 * @param {string} modalId - ID of modal element
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    // Lock body scroll
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close a modal by ID.
 * @param {string} modalId - ID of modal element
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    // Restore body scroll
    if (!document.querySelector('[role="dialog"].visible')) {
      document.body.style.overflow = '';
    }
  }
}

/**
 * Close all open modals.
 */
function closeAllModals() {
  document.querySelectorAll('[role="dialog"]').forEach(modal => {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.style.overflow = '';
}

/**
 * Show session conflict warning banner (multiple tabs active).
 */
function showSessionConflictBanner() {
  const banner = document.getElementById('session-conflict-banner');
  if (banner) {
    banner.style.display = 'block';
  }
}

/**
 * Display an alert modal with title and message.
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 */
function showAlertModal(title, message) {
  const modal = document.getElementById('alert-modal');
  if (!modal) {
    // Create alert modal if it doesn't exist
    const newModal = document.createElement('div');
    newModal.id = 'alert-modal';
    newModal.setAttribute('role', 'dialog');
    newModal.innerHTML = `
      <div class="modal-overlay alert-modal-overlay" style="display: none;">
        <div class="modal-content alert-modal">
          <h2 id="alert-title"></h2>
          <p id="alert-message"></p>
          <button onclick="closeAlertModal()" class="modal-btn">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(newModal);
  }

  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-message').innerHTML = message;
  openModal('alert-modal');
}

/**
 * Close the alert modal.
 */
function closeAlertModal() {
  closeModal('alert-modal');
}

/**
 * Route message responses to appropriate handlers based on workflow phase.
 * @param {string} phase - Current workflow phase
 * @param {object} response - Server response
 */
async function displayMessage(phase, response) {
  try {
    switch (phase) {
      case 'job_input':
        if (response.error) {
          appendMessage('system', `Error: ${response.error}`);
        } else if (response.job_analysis) {
          // Analysis ready
          tabData.analysis = response.job_analysis;
          appendMessage('assistant', `Analysis complete! I'll now show you the job analysis and post-analysis questions.`);
          switchTab('analysis');
          if (typeof populateAnalysisTab === 'function') {
            populateAnalysisTab(response.job_analysis);
          }
          if (typeof askPostAnalysisQuestions === 'function') {
            await askPostAnalysisQuestions(response.job_analysis);
          }
        }
        break;

      case 'customization_selection':
        if (response.customizations) {
          tabData.customizations = response.customizations;
          window.pendingRecommendations = response.customizations;
          switchTab('customizations');
          if (typeof populateCustomizationsTab === 'function') {
            populateCustomizationsTab(response.customizations);
          }
        }
        break;

      case 'rewrite_review':
        if (response.rewrites) {
          switchTab('rewrites');
          if (typeof fetchAndReviewRewrites === 'function') {
            await fetchAndReviewRewrites();
          }
        }
        break;

      case 'generation':
        if (response.generated_files) {
          tabData.cv = response.generated_files;
          switchTab('download');
          if (typeof populateDownloadTab === 'function') {
            await populateDownloadTab(response.generated_files);
          }
        }
        break;

      default:
        // Regular conversation message
        if (response.message || response.response) {
          appendMessage('assistant', response.message || response.response);
        }
    }
  } catch (error) {
    console.error('Error displaying message:', error);
    appendMessage('system', `Error processing response: ${error.message}`);
  }
}

/**
 * Update visual workflow indicator (progress bar, breadcrumb).
 * @param {object} status - Status object from server
 */
function updatePhaseIndicator(status) {
  if (!status.phase) return;

  const sessionNameEl = document.getElementById('header-session-name');
  if (sessionNameEl) {
    sessionNameEl.textContent = status.position_name || '';
  }

  const phases = ['job_input', 'analysis', 'customization', 'rewrite_review', 'generation', 'refinement'];
  const phaseIndex = phases.indexOf(status.phase);

  document.querySelectorAll('.step').forEach((step, idx) => {
    step.classList.remove('active', 'completed', 'upcoming');

    if (idx < phaseIndex) {
      step.classList.add('completed');
    } else if (idx === phaseIndex) {
      step.classList.add('active');
    } else {
      step.classList.add('upcoming');
    }
  });
}

/**
 * Handle click on a workflow step indicator.
 * Job step always opens the load-job panel; other steps navigate to their tab if completed/active.
 * @param {string} step - Step name matching step-{name} element IDs
 */
function handleStepClick(step) {
  const el = document.getElementById(`step-${step}`);
  if (!el) return;

  if (step === 'job') { showLoadJobPanel(); return; }

  if (!el.classList.contains('completed') && !el.classList.contains('active')) return;

  const stepToTab = {
    analysis:       'analysis',
    customizations: 'customizations',
    rewrite:        'rewrite',
    spell:          'spell',
    generate:       'cv',
    finalise:       'download',
  };
  const tabName = stepToTab[step];
  if (tabName) switchTab(tabName);
}

/**
 * Enable/disable controls based on workflow state.
 * @param {boolean} enabled - True to enable controls
 */
function setControlsEnabled(enabled) {
  document.querySelectorAll('button, input, textarea').forEach(el => {
    el.disabled = !enabled;
  });
}

// ── Model selector ────────────────────────────────────────────────────────────

let _modelData = null; // cached from last loadModelSelector() call

async function loadModelSelector() {
  try {
    _modelData = await apiCall('GET', '/api/model');
    const label = document.getElementById('model-current-label');
    if (label) {
      const prov  = _modelData.provider;
      const model = _modelData.model || '—';
      label.textContent = prov ? `${prov} · ${model}` : model;
    }
  } catch (e) {
    console.warn('Could not load model list:', e);
  }
}

function openModelModal() {
  const overlay = document.getElementById('model-modal-overlay');
  if (!overlay) return;
  _buildModelTable();
  overlay.style.display = 'flex';
}

function closeModelModal() {
  const overlay = document.getElementById('model-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function _buildModelTable() {
  const tbody = document.getElementById('model-table-body');
  const thead = document.getElementById('model-table-head');
  if (!tbody || !_modelData) return;

  const currentProvider = _modelData.provider;
  const currentModel    = _modelData.model;

  // Fixed 7-column headers — no dynamic rebuilding needed
  if (thead) {
    const thS = 'padding:10px 14px; white-space:nowrap;';
    thead.querySelector('tr').innerHTML =
      `<th style="${thS}">Provider</th>` +
      `<th style="${thS}">Model</th>` +
      `<th style="${thS} text-align:right;">Context</th>` +
      `<th style="${thS} text-align:right;" title="USD per 1M input tokens (direct API billing)">$/1M in</th>` +
      `<th style="${thS} text-align:right;" title="USD per 1M output tokens (direct API billing)">$/1M out</th>` +
      `<th style="${thS} text-align:right;" title="GitHub Copilot premium-request multiplier (0 = free for paid subscribers)">Copilot &times;</th>` +
      `<th style="${thS}">Notes</th>`;
  }

  // Prefer cross-provider list; fall back to current-provider available list
  const rows = (_modelData.all_models && _modelData.all_models.length)
    ? _modelData.all_models.filter(r => r.model)
    : (_modelData.available || []).map(r =>
        typeof r === 'object'
          ? { ...r, provider: currentProvider }
          : { model: r, provider: currentProvider }
      );

  tbody.innerHTML = '';
  const tdBase  = 'padding:9px 14px; border-bottom:1px solid #e2e8f0;';
  const fmtCost = v => (v != null) ? '$' + Number(v).toFixed(v < 1 ? 3 : 2) : '—';
  const fmtMult = v => {
    if (v == null) return '—';
    if (v === 0)   return '<span style="color:#16a34a; font-weight:600;">free</span>';
    return Number(v).toFixed(v % 1 === 0 ? 0 : 2) + '&times;';
  };

  rows.forEach(item => {
    const provider   = item.provider || currentProvider;
    const m          = item.model;
    const ctx        = item.context_window ? Number(item.context_window).toLocaleString() : '—';
    const notes      = item.notes || '';
    const isSelected = (provider === currentProvider && m === currentModel);

    const tr = document.createElement('tr');
    tr.style.cssText = isSelected
      ? 'background:#eff6ff; font-weight:600; cursor:pointer;'
      : 'cursor:pointer;';
    tr.addEventListener('mouseover', () => { if (!isSelected) tr.style.background = '#f8fafc'; });
    tr.addEventListener('mouseout',  () => { if (!isSelected) tr.style.background = ''; });

    tr.innerHTML =
      `<td style="${tdBase} color:#64748b; white-space:nowrap;">${provider}</td>` +
      `<td style="${tdBase}">${m}` +
        (isSelected ? ' <span style="color:#3b82f6; font-size:0.75em;">&#10003; active</span>' : '') +
      `</td>` +
      `<td style="${tdBase} white-space:nowrap; text-align:right; font-variant-numeric:tabular-nums;">${ctx}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_input)}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_output)}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtMult(item.copilot_multiplier)}</td>` +
      `<td style="${tdBase} color:#64748b;">${notes}</td>`;
    tr.addEventListener('click', () => setModel(m, provider));
    tbody.appendChild(tr);
  });

  // Update pricing freshness footer
  _updatePricingFooter();
}

async function setModel(model, provider) {
  if (!model) return;
  try {
    const payload = provider ? { model, provider } : { model };
    await apiCall('POST', '/api/model', payload);
    if (_modelData) {
      _modelData.model    = model;
      if (provider) _modelData.provider = provider;
    }
    const label = document.getElementById('model-current-label');
    if (label) {
      const prov = (_modelData && _modelData.provider) || provider;
      label.textContent  = prov ? `${prov} · ${model}` : model;
    }
    closeModelModal();
    // Fire-and-forget connection test so the user sees a status badge quickly
    testCurrentModel();
  } catch (e) {
    console.error('Failed to switch model:', e);
  }
}

async function testCurrentModel() {
  // Update both the header badge and the modal status line
  const badge  = document.getElementById('model-test-badge');
  const status = document.getElementById('model-test-status');
  const btn    = document.getElementById('model-test-btn');

  const SPIN = '⏳';
  const OK   = '✅';
  const FAIL = '❌';

  const setRunning = () => {
    if (badge)  { badge.textContent  = SPIN; badge.style.display  = ''; badge.title  = 'Testing…'; }
    if (status) { status.innerHTML   = `${SPIN} Testing connection…`; status.style.display = ''; }
    if (btn)    { btn.disabled = true; btn.textContent = '⏳ Testing…'; }
  };

  const setOk = (latencyMs) => {
    const tip = `Connected — ${latencyMs}ms`;
    if (badge)  { badge.textContent  = OK;  badge.style.display  = ''; badge.title  = tip; }
    if (status) { status.innerHTML   = `${OK} ${tip}`; status.style.color = '#16a34a'; status.style.display = ''; }
    if (btn)    { btn.disabled = false; btn.innerHTML = '&#10003; Test connection'; }
    // Auto-clear the badge after 30 s so it doesn't linger forever
    setTimeout(() => {
      if (badge  && badge.textContent  === OK)  badge.style.display  = 'none';
      if (status && status.textContent.includes(tip)) status.style.display = 'none';
    }, 30_000);
  };

  const setFail = (errMsg) => {
    if (badge)  { badge.textContent  = FAIL; badge.style.display  = ''; badge.title  = errMsg; }
    if (status) {
      status.innerHTML   = `${FAIL} <span title="${errMsg.replace(/"/g, '&quot;')}" style="cursor:help; text-decoration:underline dotted;">Connection failed</span>`;
      status.style.color = '#dc2626';
      status.style.display = '';
    }
    if (btn)    { btn.disabled = false; btn.innerHTML = '&#10003; Test connection'; }
  };

  setRunning();
  try {
    const result = await apiCall('POST', '/api/model/test');
    if (result.ok) {
      setOk(result.latency_ms);
    } else {
      setFail(result.error || 'Unknown error');
    }
  } catch (e) {
    setFail(e.message || String(e));
  }
}

function _updatePricingFooter() {
  const el = document.getElementById('pricing-updated-label');
  if (!el || !_modelData) return;
  const ts     = _modelData.pricing_updated_at;
  const source = _modelData.pricing_source;

  const sourceLabel = (source === 'openrouter')
    ? '<a href="https://openrouter.ai" target="_blank" rel="noopener" ' +
      'style="color:inherit; text-decoration:underline dotted;">OpenRouter</a>'
    : 'static baseline (March 2026)';

  if (!ts) { el.innerHTML = `Prices: ${sourceLabel}`; return; }
  try {
    const d   = new Date(ts);
    const now = new Date();
    const h   = Math.round((now - d) / 3_600_000);
    const age = h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
    el.innerHTML = `Prices via ${sourceLabel} &middot; updated ${age}`;
  } catch { el.innerHTML = `Prices: ${sourceLabel}`; }
}

async function refreshModelPricing() {
  const btn = document.getElementById('pricing-refresh-btn');
  const lbl = document.getElementById('pricing-updated-label');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing…'; }
  try {
    await apiCall('POST', '/api/model-pricing/refresh');
    // Re-fetch model data so the table gets fresh prices
    _modelData = await apiCall('GET', '/api/model');
    _buildModelTable();
  } catch (e) {
    if (lbl) lbl.textContent = 'Refresh failed';
    console.error('Pricing refresh failed:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh prices'; }
  }
}

// Initialize on page load — delegates to app.js init() which is loaded after this file
document.addEventListener('DOMContentLoaded', () => {
  loadModelSelector();
  if (typeof init === 'function') init();
});
