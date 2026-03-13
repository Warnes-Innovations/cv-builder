/**
 * ui-core.js
 * Core UI routing, tab management, modal management, and page initialization.
 * Entry point for the application - loads on DOMContentLoaded.
 */

// StorageKeys is defined in api-client.js (loaded before this file)

/** Maps each workflow stage (top bar) to the tabs shown in the second nav bar. */
const STAGE_TABS = {
  job:            ['job'],
  analysis:       ['analysis', 'questions'],
  customizations: ['customizations', 'editor'],
  rewrite:        ['rewrite'],
  spell:          ['spell'],
  generate:       ['cv'],
  layout:         ['layout'],
  finalise:       ['download', 'finalise', 'master', 'cover-letter', 'screening'],
};

/** Currently active stage — drives second-bar tab visibility. */
let currentStage = 'job';

/**
 * Custom confirm dialog — returns a Promise<boolean>.
 * Replaces browser confirm() which can be silently suppressed once the user
 * checks "Prevent this page from creating additional dialogs".
 *
 * Usage:  if (await confirmDialog('Are you sure?')) { ... }
 */
function confirmDialog(message, { confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise(resolve => {
    // Reuse or create the shared overlay element
    let overlay = document.getElementById('confirm-dialog-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-dialog-overlay';
      overlay.style.cssText =
        'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:9999;' +
        'align-items:center; justify-content:center;';
      overlay.innerHTML =
        '<div id="confirm-dialog-box" style="background:#fff; border-radius:8px; padding:24px 28px;' +
        'max-width:400px; width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.18); font-family:inherit;">' +
        '<p id="confirm-dialog-msg" style="margin:0 0 20px; font-size:0.95em; color:#1e293b; white-space:pre-wrap;"></p>' +
        '<div style="display:flex; gap:8px; justify-content:flex-end;">' +
        '<button id="confirm-dialog-cancel" style="padding:6px 16px; border:1px solid #cbd5e1;' +
        'border-radius:5px; background:#f8fafc; cursor:pointer; color:#475569;"></button>' +
        '<button id="confirm-dialog-ok" style="padding:6px 16px; border:none;' +
        'border-radius:5px; cursor:pointer; color:#fff; font-weight:600;"></button>' +
        '</div></div>';
      document.body.appendChild(overlay);
    }

    const okBtn     = document.getElementById('confirm-dialog-ok');
    const cancelBtn = document.getElementById('confirm-dialog-cancel');
    const msgEl     = document.getElementById('confirm-dialog-msg');

    msgEl.textContent          = message;
    okBtn.textContent          = confirmLabel;
    cancelBtn.textContent      = cancelLabel;
    okBtn.style.background     = danger ? '#dc2626' : '#3b82f6';

    overlay.style.display = 'flex';

    const finish = (result) => {
      overlay.style.display = 'none';
      // Remove listeners to avoid stacking handlers
      okBtn.replaceWith(okBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      resolve(result);
    };

    // Rebind cloned buttons
    document.getElementById('confirm-dialog-ok').addEventListener('click',     () => finish(true),  { once: true });
    document.getElementById('confirm-dialog-cancel').addEventListener('click', () => finish(false), { once: true });
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); }, { once: true });
  });
}

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
 * Return the stage that owns a given tab, or null if unmapped.
 * @param {string} tab
 * @returns {string|null}
 */
function getStageForTab(tab) {
  for (const [stage, tabs] of Object.entries(STAGE_TABS)) {
    if (tabs.includes(tab)) return stage;
  }
  return null;
}

/**
 * Show only the tabs that belong to the given stage in the second nav bar.
 * @param {string} stage - Key from STAGE_TABS
 */
function updateTabBarForStage(stage) {
  const stageTabs = STAGE_TABS[stage] || [];
  document.querySelectorAll('.tab').forEach(tab => {
    tab.style.display = stageTabs.includes(tab.dataset.tab) ? '' : 'none';
  });
}

/**
 * Activate a workflow stage: update second-bar visibility and navigate to the
 * first (or already-active) tab within that stage.
 * @param {string} stage - Key from STAGE_TABS
 */
function switchStage(stage) {
  currentStage = stage;
  updateTabBarForStage(stage);
  const stageTabs = STAGE_TABS[stage] || [];
  if (stageTabs.length === 0) return;
  // Prefer whichever tab within this stage is already active; else use first
  const activeTab = document.querySelector('.tab.active');
  const activeTabName = activeTab ? activeTab.dataset.tab : null;
  const target = (activeTabName && stageTabs.includes(activeTabName))
    ? activeTabName
    : stageTabs[0];
  switchTab(target);
}

/**
 * Switch to a specific tab and load its content.
 * @param {string} tab - Tab name (job, analysis, customizations, cv, download)
 */
function switchTab(tab) {
  // Sync second-bar visibility to this tab's stage (without recursing into switchStage)
  const tabStage = getStageForTab(tab);
  if (tabStage && tabStage !== currentStage) {
    currentStage = tabStage;
    updateTabBarForStage(tabStage);
  }

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

  if (step === 'job') {
    if (el.classList.contains('completed')) {
      switchStage('job');
    } else {
      showLoadJobPanel();
    }
    return;
  }

  if (!el.classList.contains('completed') && !el.classList.contains('active')) return;

  if (STAGE_TABS[step]) switchStage(step);
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
let _modelDataTable = null;
let _selectedModelProviders = new Set();

async function loadModelSelector() {
  try {
    _modelData = await apiCall('GET', '/api/model');
    const label = document.getElementById('model-current-label');
    if (label) {
      const prov  = _modelData.provider;
      const model = _modelData.model || '—';
      label.textContent = prov ? `${prov} · ${model}` : model;
    }
    if (_modelData && _modelData.provider) {
      _selectedModelProviders = new Set([_modelData.provider]);
    }
  } catch (e) {
    console.warn('Could not load model list:', e);
  }
}

function _providerStageLabel(provider, capableSet) {
  const isCapable = capableSet.has(provider);
  return isCapable ? 'list_models' : 'fallback';
}

function _renderProviderSelector() {
  const listEl = document.getElementById('model-provider-list');
  if (!listEl || !_modelData) return;

  const providers = Array.isArray(_modelData.providers)
    ? _modelData.providers
    : Array.from(new Set((_modelData.all_models || []).map(r => r.provider).filter(Boolean))).sort();
  const capableSet = new Set(_modelData.list_models_capable || []);

  if (_selectedModelProviders.size === 0 && _modelData.provider) {
    _selectedModelProviders.add(_modelData.provider);
  }

  listEl.innerHTML = '';
  providers.forEach(provider => {
    const checked = _selectedModelProviders.has(provider);
    const sourceLabel = _providerStageLabel(provider, capableSet);

    const label = document.createElement('label');
    label.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:999px; font-size:0.82em; background:#fff; cursor:pointer;';
    label.innerHTML =
      `<input type="checkbox" value="${escapeHtml(provider)}" ${checked ? 'checked' : ''} style="margin:0;" />` +
      `<span>${escapeHtml(provider)}</span>` +
      `<span style="color:#64748b; font-size:0.8em;">(${escapeHtml(sourceLabel)})</span>`;

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', async (event) => {
      if (event.target.checked) {
        _selectedModelProviders.add(provider);
      } else {
        _selectedModelProviders.delete(provider);
      }
      if (_selectedModelProviders.size === 0 && _modelData.provider) {
        _selectedModelProviders.add(_modelData.provider);
        event.target.checked = true;
      }
      await _refreshModelCatalogForSelection();
    });

    listEl.appendChild(label);
  });
}

async function _refreshModelCatalogForSelection() {
  if (!_modelData) return;

  const selected = Array.from(_selectedModelProviders);
  if (!selected.length) {
    _selectedModelProviders = new Set([_modelData.provider]);
  }

  try {
    const providersParam = encodeURIComponent(Array.from(_selectedModelProviders).join(','));
    const catalog = await apiCall('GET', `/api/model-catalog?providers=${providersParam}`);
    _modelData.all_models = catalog.all_models || [];
    _modelData.pricing_updated_at = catalog.pricing_updated_at || _modelData.pricing_updated_at;
    _modelData.pricing_source = catalog.pricing_source || _modelData.pricing_source;
    if (Array.isArray(catalog.providers) && catalog.providers.length) {
      _modelData.providers = catalog.providers;
    }
    if (Array.isArray(catalog.list_models_capable)) {
      _modelData.list_models_capable = catalog.list_models_capable;
    }
  } catch (error) {
    console.warn('Could not refresh model catalog for selected providers:', error);
  }

  _buildModelTable();
}

async function openModelModal() {
  const overlay = document.getElementById('model-modal-overlay');
  if (!overlay) return;

  if (!_modelData) {
    await loadModelSelector();
  }
  _renderProviderSelector();
  await _refreshModelCatalogForSelection();
  overlay.style.display = 'flex';
}

function closeModelModal() {
  const overlay = document.getElementById('model-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function _applyModelRowVisualState(tr, isActive) {
  tr.classList.toggle('model-row-active', isActive);
  tr.style.cssText = isActive
    ? 'background:#eff6ff; font-weight:600; cursor:pointer;'
    : 'cursor:pointer;';

  const model = tr.getAttribute('data-model') || '';
  const modelCell = tr.cells && tr.cells[1];
  if (modelCell) {
    modelCell.innerHTML = `${escapeHtml(model)}` +
      (isActive ? ' <span style="color:#3b82f6; font-size:0.75em;">&#10003; active</span>' : '');
  }
}

function _syncModelTableSelection() {
  const tbody = document.getElementById('model-table-body');
  if (!tbody || !_modelData) return;

  const activeProvider = _modelData.provider;
  const activeModel = _modelData.model;
  tbody.querySelectorAll('tr').forEach(tr => {
    const isActive = (
      tr.getAttribute('data-provider') === activeProvider &&
      tr.getAttribute('data-model') === activeModel
    );
    _applyModelRowVisualState(tr, isActive);
  });
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
    thead.innerHTML =
      `<tr style="background:#f1f5f9; text-align:left;">` +
        `<th style="${thS}">Provider</th>` +
        `<th style="${thS}">Model</th>` +
        `<th style="${thS} text-align:right;">Context</th>` +
        `<th style="${thS} text-align:right;" title="USD per 1M input tokens (direct API billing)">$/1M in</th>` +
        `<th style="${thS} text-align:right;" title="USD per 1M output tokens (direct API billing)">$/1M out</th>` +
        `<th style="${thS} text-align:right;" title="GitHub Copilot premium-request multiplier (0 = free for paid subscribers)">Copilot</th>` +
        `<th style="${thS}">Source</th>` +
        `<th style="${thS}">Notes</th>` +
      `</tr>`;
  }

  // Tear down any existing DataTable before rebuilding rows.
  if (window.$ && $.fn && $.fn.DataTable && $.fn.DataTable.isDataTable('#model-table')) {
    _modelDataTable = $('#model-table').DataTable();
    _modelDataTable.destroy();
    _modelDataTable = null;
  }

  // Prefer cross-provider list; fall back to current-provider available list
  let rows = (_modelData.all_models && _modelData.all_models.length)
    ? _modelData.all_models.filter(r => r.model)
    : (_modelData.available || []).map(r =>
        typeof r === 'object'
          ? { ...r, provider: currentProvider }
          : { model: r, provider: currentProvider }
      );

  tbody.innerHTML = '';
  const tdBase  = 'padding:9px 14px; border-bottom:1px solid #e2e8f0;';
  const fmtCost = v => (v != null) ? '$' + Number(v).toFixed(v < 1 ? 3 : 2) : '—';
  const fmtPriceHint = source => {
    if (source === 'runtime_cache') {
      return '<span title="Price from runtime cache" style="margin-left:6px; display:inline-block; padding:1px 5px; border-radius:999px; background:#ecfeff; color:#0f766e; font-size:0.72em; font-weight:600; vertical-align:middle;">cache</span>';
    }
    return '<span title="Price from static baseline" style="margin-left:6px; display:inline-block; padding:1px 5px; border-radius:999px; background:#f8fafc; color:#64748b; font-size:0.72em; font-weight:600; vertical-align:middle;">static</span>';
  };
  const fmtSource = s => {
    if (s === 'list_models') {
      return '<span style="display:inline-block; padding:2px 6px; border-radius:999px; background:#ecfeff; color:#0f766e; font-size:0.78em; font-weight:600;">list_models</span>';
    }
    return '<span style="display:inline-block; padding:2px 6px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:0.78em; font-weight:600;">fallback_static</span>';
  };
  const fmtMult = v => {
    if (v == null) return '—';
    if (v === 0)   return '<span style="color:#16a34a; font-weight:600;">free</span>';
    return Number(v).toFixed(v % 1 === 0 ? 0 : 2) + '&times;';
  };

  rows.forEach(item => {
    const provider   = item.provider || currentProvider;
    const m          = item.model;
    const ctx        = item.context_window ? Number(item.context_window).toLocaleString() : '—';
    const source     = item.source || 'fallback_static';
    const priceSource = item.price_source || 'static_baseline';
    const notes      = item.notes || '';
    const isSelected = (provider === currentProvider && m === currentModel);

    const tr = document.createElement('tr');
    tr.setAttribute('data-provider', provider);
    tr.setAttribute('data-model', m);
    _applyModelRowVisualState(tr, isSelected);
    tr.addEventListener('mouseover', () => {
      if (!tr.classList.contains('model-row-active')) tr.style.background = '#f8fafc';
    });
    tr.addEventListener('mouseout', () => {
      if (!tr.classList.contains('model-row-active')) tr.style.background = '';
    });

    tr.innerHTML =
      `<td style="${tdBase} color:#64748b; white-space:nowrap;">${escapeHtml(provider)}</td>` +
      `<td style="${tdBase}">${escapeHtml(m)}</td>` +
      `<td style="${tdBase} white-space:nowrap; text-align:right; font-variant-numeric:tabular-nums;">${ctx}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_input)}${fmtPriceHint(priceSource)}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_output)}${fmtPriceHint(priceSource)}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtMult(item.copilot_multiplier)}</td>` +
      `<td style="${tdBase} white-space:nowrap;">${fmtSource(source)}</td>` +
      `<td style="${tdBase} color:#64748b;">${notes}</td>`;
    tbody.appendChild(tr);
  });

  // Rebind row click using delegation so sorting/filter redraws still work.
  tbody.onclick = (event) => {
    const tr = event.target.closest('tr');
    if (!tr) return;
    const provider = tr.getAttribute('data-provider');
    const model = tr.getAttribute('data-model');
    if (!model) return;
    setModel(model, provider);
  };

  // Enhance with DataTables for sorting/searching; keep paging disabled.
  if (window.$ && $.fn && $.fn.DataTable) {
    _modelDataTable = $('#model-table').DataTable({
      paging: false,
      searching: true,
      info: false,
      orderCellsTop: true,
      order: [[0, 'asc'], [1, 'asc']],
      autoWidth: false,
      language: { search: 'Filter:' },
      initComplete: function() {
        const api = this.api();
        const $thead = $('#model-table thead');
        const hasFilterRow = $thead.find('tr.model-filter-row').length > 0;
        if (!hasFilterRow) {
          const $filterRow = $('<tr class="model-filter-row"></tr>');
          api.columns().every(function(colIdx) {
            const title = $(api.column(colIdx).header()).text().trim();
            const $th = $('<th style="padding:6px 10px; background:#f8fafc; border-top:1px solid #e2e8f0;"></th>');
            const $input = $(`<input type="text" placeholder="${title}" style="width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82em;" />`);
            $th.append($input);
            $filterRow.append($th);
          });
          $thead.append($filterRow);
        }

        api.columns().every(function(colIdx) {
          const $input = $('#model-table thead tr.model-filter-row th').eq(colIdx).find('input');
          if (!$input.length) return;
          $input.off('click.modelFilter keyup.modelFilter change.modelFilter');
          $input.on('click.modelFilter', function(event) { event.stopPropagation(); });
          $input.on('keyup.modelFilter change.modelFilter', function() {
            const value = this.value;
            if (api.column(colIdx).search() !== value) {
              api.column(colIdx).search(value).draw();
            }
          });
        });
      },
    });
  }

  _syncModelTableSelection();

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
    _syncModelTableSelection();
    // Keep the modal open so the user can click "Test connection"
    // Fire-and-forget connection test so the result appears immediately
    testCurrentModel();
  } catch (e) {
    console.error('Failed to switch model:', e);
    const msg = e.message || String(e);
    const status = document.getElementById('model-test-status');
    if (status) {
      status.style.display = '';
      status.style.color = '#dc2626';
      status.textContent = `❌ ${msg}`;
    }
    if (typeof appendMessage === 'function') {
      appendMessage('system', `❌ Model switch failed: ${msg}`);
    }
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
