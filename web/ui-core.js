// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * ui-core.js
 * Core UI routing, tab management, modal management, and page initialization.
 * Entry point for the application - loads on DOMContentLoaded.
 */

import { getLogger } from './logger.js';
const log = getLogger('ui-core');

import { escapeHtml } from './utils.js';
import { StorageKeys, apiCall, fetchStatus, fetchSettings, updateSettings } from './api-client.js';
import {
  getWorkflowStepForPhase,
  initializeState,
  loadStateFromLocalStorage,
  stateManager,
} from './state-manager.js';

// ─────────────────────────────────────────────────────────────────────────
// Accessibility: Focus Management for Modals
// ─────────────────────────────────────────────────────────────────────────

/** Stores the element that opened the current modal (for focus restoration on close). */
let _focusedElementBeforeModal = null;

/** Stores the current keydown listener for focus trap (to enable cleanup). */
let _currentFocusTrapListener = null;
let _settingsData = null;
const RETRY_POLICY_STORAGE_KEY = 'cv-builder-retry-policy';

function _getRetryPolicyFromStorage() {
  const defaults = {
    baseMs: 1500,
    capMs: 60000,
    maxAttempts: 6,
    autoRetry: true,
  };
  try {
    const raw = localStorage.getItem(RETRY_POLICY_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      baseMs: Math.max(200, Number(parsed.baseMs || defaults.baseMs)),
      capMs: Math.max(1000, Number(parsed.capMs || defaults.capMs)),
      maxAttempts: Math.max(1, Number(parsed.maxAttempts || defaults.maxAttempts)),
      autoRetry: parsed.autoRetry !== false,
    };
  } catch {
    return defaults;
  }
}

function _saveRetryPolicyToStorage(policy) {
  try {
    localStorage.setItem(RETRY_POLICY_STORAGE_KEY, JSON.stringify(policy));
  } catch (error) {
    log.warn('Could not save retry policy preference:', error);
  }
}

function _settingsSourceLabel(meta, key, runtimeOverrides = null) {
  if (runtimeOverrides && key in runtimeOverrides) {
    return 'Source: runtime selection';
  }
  const source = meta?.sources?.[key] || 'default';
  const envKey = meta?.env_keys?.[key] || null;
  if (source === 'env') return `Source: environment variable (${envKey || 'locked'})`;
  if (source === 'dotenv') return `Source: .env (${envKey || 'locked'})`;
  if (source === 'config') return 'Source: config.yaml';
  return 'Source: built-in default';
}

function _renderSettingsSources(meta, runtimeOverrides = null) {
  const sourceTargets = [
    'llm.default_provider',
    'llm.default_model',
    'llm.request_timeout_seconds',
    'llm.temperature',
    'generation.max_skills',
    'generation.max_achievements',
    'generation.max_publications',
    'generation.skills_section_title',
    'generation.formats.ats_docx',
    'generation.formats.human_pdf',
    'generation.formats.human_docx',
  ];
  sourceTargets.forEach((key) => {
    const el = document.getElementById(`source-${key}`);
    if (!el) return;
    el.textContent = _settingsSourceLabel(meta, key, runtimeOverrides);
    const runtimeKey = runtimeOverrides && key in runtimeOverrides;
    const isLocked = Boolean(meta?.locked?.[key]);
    el.style.color = runtimeKey ? '#1e40af' : (isLocked ? '#b45309' : '#64748b');
  });
}

function _setSettingsStatus(message, kind = 'info') {
  const el = document.getElementById('settings-status-msg');
  if (!el) return;
  el.style.display = '';
  if (kind === 'success') {
    el.style.background = '#ecfdf5';
    el.style.border = '1px solid #86efac';
    el.style.color = '#166534';
  } else if (kind === 'error') {
    el.style.background = '#fef2f2';
    el.style.border = '1px solid #fecaca';
    el.style.color = '#991b1b';
  } else {
    el.style.background = '#eff6ff';
    el.style.border = '1px solid #bfdbfe';
    el.style.color = '#1e40af';
  }
  el.textContent = message;
}

function _collectSettingsPayloadFromForm() {
  return {
    llm: {
      default_provider: document.getElementById('settings-llm-default-provider')?.value?.trim() || null,
      default_model: document.getElementById('settings-llm-default-model')?.value?.trim() || null,
      request_timeout_seconds: Number(document.getElementById('settings-llm-request-timeout')?.value || 120),
      temperature: Number(document.getElementById('settings-llm-temperature')?.value || 0.7),
    },
    generation: {
      max_skills: Number(document.getElementById('settings-gen-max-skills')?.value || 20),
      max_achievements: Number(document.getElementById('settings-gen-max-achievements')?.value || 5),
      max_publications: Number(document.getElementById('settings-gen-max-publications')?.value || 10),
      skills_section_title: document.getElementById('settings-gen-skills-title')?.value?.trim() || 'Skills',
      formats: {
        ats_docx: Boolean(document.getElementById('settings-format-ats-docx')?.checked),
        human_pdf: Boolean(document.getElementById('settings-format-human-pdf')?.checked),
        human_docx: Boolean(document.getElementById('settings-format-human-docx')?.checked),
      },
    },
  };
}

function _collectRetryPolicyFromForm() {
  return {
    baseMs: Number(document.getElementById('settings-retry-base-ms')?.value || 1500),
    capMs: Number(document.getElementById('settings-retry-cap-ms')?.value || 60000),
    maxAttempts: Number(document.getElementById('settings-retry-max-attempts')?.value || 6),
    autoRetry: Boolean(document.getElementById('settings-retry-auto')?.checked),
  };
}

function _renderSettingsToForm(payload) {
  const settings = payload?.settings || {};
  const llm = settings.llm || {};
  const generation = settings.generation || {};
  const formats = generation.formats || {};
  const runtimeProvider = payload?.runtime?.llm?.provider || null;
  const runtimeModel = payload?.runtime?.llm?.model || null;
  const runtimeOverrides = {};
  if (runtimeProvider) runtimeOverrides['llm.default_provider'] = runtimeProvider;
  if (runtimeModel) runtimeOverrides['llm.default_model'] = runtimeModel;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };
  const setChecked = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
  };

  setValue('settings-llm-default-provider', runtimeProvider || llm.default_provider || '');
  setValue('settings-llm-default-model', runtimeModel || llm.default_model || '');
  setValue('settings-llm-request-timeout', llm.request_timeout_seconds ?? 120);
  setValue('settings-llm-temperature', llm.temperature ?? 0.7);

  setValue('settings-gen-max-skills', generation.max_skills ?? 20);
  setValue('settings-gen-max-achievements', generation.max_achievements ?? 5);
  setValue('settings-gen-max-publications', generation.max_publications ?? 10);
  setValue('settings-gen-skills-title', generation.skills_section_title || 'Skills');

  setChecked('settings-format-ats-docx', formats.ats_docx);
  setChecked('settings-format-human-pdf', formats.human_pdf);
  setChecked('settings-format-human-docx', formats.human_docx);

  const retryPolicy = _getRetryPolicyFromStorage();
  setValue('settings-retry-base-ms', retryPolicy.baseMs);
  setValue('settings-retry-cap-ms', retryPolicy.capMs);
  setValue('settings-retry-max-attempts', retryPolicy.maxAttempts);
  setChecked('settings-retry-auto', retryPolicy.autoRetry);

  _renderSettingsSources(payload.meta || {}, runtimeOverrides);

  const pathEl = document.getElementById('settings-config-path');
  if (pathEl) {
    pathEl.textContent = payload?.meta?.config_path
      ? `Config file: ${payload.meta.config_path}`
      : '';
  }
}

async function reloadSettingsModal() {
  try {
    _setSettingsStatus('Loading settings...', 'info');
    const result = await fetchSettings();
    _renderSettingsToForm(result);
    _setSettingsStatus('Settings loaded.', 'success');
  } catch (error) {
    _setSettingsStatus(`Failed to load settings: ${error.message || error}`, 'error');
  }
}

async function saveSettingsModal() {
  const saveBtn = document.getElementById('settings-save-btn');
  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    _setSettingsStatus('Saving settings...', 'info');
    const payload = _collectSettingsPayloadFromForm();
    const result = await updateSettings(payload);
    _saveRetryPolicyToStorage(_collectRetryPolicyFromForm());
    _settingsData = result;
    _renderSettingsToForm(result);
    _setSettingsStatus('Settings saved successfully.', 'success');
  } catch (error) {
    _setSettingsStatus(`Failed to save settings: ${error.message || error}`, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  }
}

async function openSettingsModal() {
  const overlay = document.getElementById('settings-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('settings-modal-overlay');
  trapFocus('settings-modal-overlay');
  await reloadSettingsModal();
}

function closeSettingsModal() {
  const overlay = document.getElementById('settings-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  restoreFocus();
}

/**
 * Get all focusable elements within a container.
 * @param {HTMLElement} container - The modal or container element
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getFocusableElements(container) {
  const focusableSelectors = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'textarea:not([disabled])', 'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Set initial focus to the first focusable element in a modal.
 * Prioritizes elements with id="[modalId]-focus-target" if present.
 * @param {string} modalId - ID of the modal
 */
function setInitialFocus(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Try to focus an explicit target (e.g., input field with class/id)
  const focusTarget = modal.querySelector('[data-focus-target="true"]') ||
                      modal.querySelector('input[type="text"]') ||
                      modal.querySelector('button');

  if (focusTarget) {
    // Small delay to ensure modal render + actual display
    setTimeout(() => focusTarget.focus(), 50);
  }
}

/**
 * Trap focus within a modal using Tab/Shift+Tab.
 * Prevents user tabbing to elements outside the modal.
 * @param {string} modalId - ID of the modal
 */
function trapFocus(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Remove any previous trap listener
  if (_currentFocusTrapListener) {
    document.removeEventListener('keydown', _currentFocusTrapListener);
  }

  const focusableElements = getFocusableElements(modal);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  _currentFocusTrapListener = (e) => {
    if (e.key !== 'Tab') return;

    const isShift = e.shiftKey;
    const activeEl = document.activeElement;

    if (isShift) {
      // Shift+Tab from first element → focus last element
      if (activeEl === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab from last element → focus first element
      if (activeEl === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  document.addEventListener('keydown', _currentFocusTrapListener);
}

/**
 * Restore focus to the element that opened the modal.
 */
function restoreFocus() {
  if (_focusedElementBeforeModal && typeof _focusedElementBeforeModal.focus === 'function') {
    _focusedElementBeforeModal.focus();
  }
  _focusedElementBeforeModal = null;

  // Clean up focus trap listener
  if (_currentFocusTrapListener) {
    document.removeEventListener('keydown', _currentFocusTrapListener);
    _currentFocusTrapListener = null;
  }
}

/** Maps each workflow stage (top bar) to the tabs shown in the second nav bar. */
const STAGE_TABS = {
  job:            ['job', 'master'],
  analysis:       ['analysis', 'questions'],
  customizations: ['exp-review', 'ach-editor', 'skills-review', 'achievements-review', 'summary-review', 'publications-review', 'ats-score'],
  rewrite:        ['rewrite'],
  spell:          ['spell'],
  generate:       ['generate'],
  layout:         ['layout'],
  finalise:       ['download', 'finalise', 'master', 'cover-letter', 'screening'],
};

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
    let shouldShowBanner = true;
    try {
      const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      const url = new URL(rawUrl, window.location.origin);
      shouldShowBanner = url.pathname !== '/api/sessions/claim' && url.pathname !== '/api/sessions/takeover';
    } catch (_) {
      shouldShowBanner = true;
    }
    if (resp.status === 409 && shouldShowBanner) {
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
    const savedTab = stateManager.getCurrentTab() || localStorage.getItem(StorageKeys.CURRENT_TAB) || 'job';
    updateTabBarForStage(getStageForTab(savedTab) || getWorkflowStepForPhase(stateManager.getPhase()));
    switchTab(savedTab);

    log.info('✅ Application initialized');
  } catch (error) {
    log.error('Initialization error:', error);
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

    // Add arrow key navigation for tabs (WCAG 2.1 AA Tabs pattern)
    tab.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const tabs = Array.from(document.querySelectorAll('.tab:not([style*="display: none"])'));
        const currentIndex = tabs.indexOf(e.target);

        let nextTab;
        if (e.key === 'ArrowLeft' || e.key === 'Home') {
          nextTab = e.key === 'Home' ? tabs[0] : tabs[(currentIndex - 1 + tabs.length) % tabs.length];
        } else {
          nextTab = e.key === 'End' ? tabs[tabs.length - 1] : tabs[(currentIndex + 1) % tabs.length];
        }

        if (nextTab) {
          nextTab.focus();
          nextTab.click(); // Activate the tab
        }
      }
    });
  });

  // Message input (Enter key to send)
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (typeof globalThis.sendMessage === 'function') {
          globalThis.sendMessage();
        }
      }
    });
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

function getVisibleStage() {
  const activeTab = stateManager.getCurrentTab();
  return getStageForTab(activeTab) || getWorkflowStepForPhase(stateManager.getPhase());
}

/**
 * Show/hide the scroll arrow buttons based on whether the tab bar is scrollable.
 */
function updateTabScrollButtons() {
  const tabBar  = document.getElementById('tab-bar');
  const leftBtn = document.getElementById('tab-scroll-left');
  const rightBtn = document.getElementById('tab-scroll-right');
  if (!tabBar || !leftBtn || !rightBtn) return;
  leftBtn.style.display  = tabBar.scrollLeft > 0 ? '' : 'none';
  rightBtn.style.display = tabBar.scrollLeft < tabBar.scrollWidth - tabBar.clientWidth - 1 ? '' : 'none';
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
  // Reset scroll position to show active tab, then refresh arrow visibility
  const tabBar = document.getElementById('tab-bar');
  if (tabBar) tabBar.scrollLeft = 0;
  updateTabScrollButtons();
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
        if (typeof populateAnalysisTab === 'function' && stateManager.getTabData('analysis')) {
          populateAnalysisTab(stateManager.getTabData('analysis'));
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">No analysis data yet. Submit a job description to begin.</p>';
        }
        break;

      case 'generate':
        if (typeof populateCVTab === 'function' && stateManager.getTabData('cv')) {
          populateCVTab(stateManager.getTabData('cv'));
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV to see preview.</p>';
        }
        break;

      case 'download':
        if (typeof populateDownloadTab === 'function' && stateManager.getTabData('cv')) {
          await populateDownloadTab(stateManager.getTabData('cv'));
        } else {
          content.innerHTML = '<p style="padding: 20px; color: #666;">Generate a CV first to download.</p>';
        }
        break;

      default:
        content.innerHTML = '<p style="padding: 20px; color: #999;">Unknown tab.</p>';
    }
  } catch (error) {
    log.error(`Error loading tab ${tab}:`, error);
    const errorMessage = document.createElement('p');
    errorMessage.style.cssText = 'padding: 20px; color: #c41e3a;';
    errorMessage.textContent = `Error loading content: ${error.message}`;
    content.appendChild(errorMessage);
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
      log.warn('Could not save chat state');
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
    // Save focus before opening modal
    _focusedElementBeforeModal = document.activeElement;

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Set initial focus and trap focus within modal
    setInitialFocus(modalId);
    trapFocus(modalId);
  }
}

/**
 * Close a modal by ID.
 * @param {string} modalId - ID of modal element
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (modal.dataset.dismissDisabled === '1') return;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    // Restore body scroll
    if (!document.querySelector('[role="dialog"].visible')) {
      document.body.style.overflow = '';
    }
    // Restore focus
    restoreFocus();
  }
}

/**
 * Close all open modals.
 */
function closeAllModals() {
  document.querySelectorAll('[role="dialog"]').forEach(modal => {
    if (modal.dataset.dismissDisabled === '1') return;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    if (modal.style.display && modal.style.display !== 'none') {
      modal.style.display = 'none';
    }
  });
  document.body.style.overflow = '';
  // Restore focus
  restoreFocus();
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

// ── Model selector ────────────────────────────────────────────────────────────

let _modelData = null; // cached from last loadModelSelector() call
let _modelDataTable = null;
let _selectedModelProviders = new Set();
let _modelSelectorLoading = false;   // guard: loadModelSelector() in flight
let _catalogRefreshing = false;      // guard: _refreshModelCatalogForSelection() in flight
let _catalogRefreshPending = false;  // queue one rerun when toggles happen mid-refresh
let _showFullModelCatalog = false;
let _copilotAuthPollTimer = null;
let _modelWizardStep = 1;
let _modelWizardSelectedProvider = null;


function _getModelPrefsFromStorage() {
  try {
    const saved = localStorage.getItem(StorageKeys.TAB_DATA);
    return saved ? (JSON.parse(saved) || {}) : {};
  } catch {
    return {};
  }
}

function _saveModelPrefsToStorage(patch) {
  try {
    const parsed = _getModelPrefsFromStorage();
    localStorage.setItem(StorageKeys.TAB_DATA, JSON.stringify({ ...parsed, ...patch }));
  } catch (e) {
    log.warn('Failed to persist model preferences locally:', e);
  }
}

function _appendRecentModel(provider, model) {
  if (!provider || !model) return;
  const parsed = _getModelPrefsFromStorage();
  const existing = Array.isArray(parsed.recentModels) ? parsed.recentModels : [];
  const filtered = existing.filter((item) => !(item.provider === provider && item.model === model));
  filtered.unshift({ provider, model });
  _saveModelPrefsToStorage({ recentModels: filtered.slice(0, 6) });
}

function _updateLlmStatusPill(kind, text, icon = '', tooltip = '') {
  const pill = document.getElementById('llm-status-pill');
  const label = document.getElementById('llm-status-label');
  const iconEl = document.getElementById('llm-status-icon');
  if (!pill || !label) return;

  const aliases = {
    authenticated: 'connected',
    unauthenticated: 'unconfigured',
    polling: 'connecting',
  };
  const normalizedKind = aliases[kind] || kind || 'unconfigured';
  const defaultTooltip = {
    unconfigured: 'No provider/model is configured yet.',
    configured: 'Provider/model is configured. Connectivity not yet verified.',
    connecting: 'Testing or connecting to the selected provider.',
    connected: 'Provider responded successfully to a live request.',
    'auth-required': 'Authentication is required. Check API key or sign in.',
    'rate-limited': 'Rate limit reached. Wait before retrying requests.',
    unavailable: 'Provider is temporarily unavailable or unreachable.',
    error: 'Connection failed. Open model settings for details.',
  };
  pill.classList.remove('authenticated', 'unauthenticated', 'polling', 'unconfigured', 'configured', 'connecting', 'connected', 'auth-required', 'rate-limited', 'unavailable', 'error');
  if (normalizedKind) pill.classList.add(normalizedKind);
  label.textContent = text;
  const iconByKind = {
    unconfigured: '○',
    configured: '◔',
    connecting: '⧗',
    connected: '✓',
    'auth-required': '🔑',
    'rate-limited': '⏳',
    unavailable: '☁',
    error: '⚠',
  };
  const iconText = icon || iconByKind[normalizedKind] || '⚠';
  if (iconEl) iconEl.textContent = iconText;
  const tooltipText = tooltip || defaultTooltip[normalizedKind] || '';
  pill.title = tooltipText;
  if (iconEl) iconEl.title = tooltipText;
  label.title = tooltipText;
}

async function loadModelSelector() {
  if (_modelSelectorLoading) return;
  _modelSelectorLoading = true;
  try {
    _modelData = await apiCall('GET', '/api/model');
    // If backend didn't return a persistent selection, prefer a locally-saved choice
    try {
      const saved = localStorage.getItem(StorageKeys.TAB_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && !(_modelData && _modelData.provider) && parsed.currentModelProvider) {
          _modelData = _modelData || {};
          _modelData.provider = parsed.currentModelProvider;
        }
        if (parsed && !(_modelData && _modelData.model) && parsed.currentModelName) {
          _modelData = _modelData || {};
          _modelData.model = parsed.currentModelName;
        }
      }
    } catch (e) {
      log.warn('Could not read saved model from localStorage:', e);
    }
    const label = document.getElementById('model-current-label');
    if (label) {
      const prov  = _modelData.provider;
      const model = _modelData.model || '—';
      label.textContent = prov ? `${prov} · ${model}` : model;
    }
    if (_modelData && _modelData.provider) {
      _selectedModelProviders = new Set([_modelData.provider]);
      _updateLlmStatusPill('configured', `${_modelData.provider} configured`);
    } else {
      _updateLlmStatusPill('unconfigured', 'Not configured');
    }
  } catch (e) {
    log.warn('Could not load model list:', e);
  } finally {
    _modelSelectorLoading = false;
  }
}

function _providerStageLabel(provider, capableSet) {
  const isCapable = capableSet.has(provider);
  return isCapable ? 'list_models' : 'fallback';
}

function _providerDisplayLabel(provider) {
  const deprecated = {
    'copilot-oauth': 'Copilot OAuth (deprecated)',
    copilot: 'Copilot (deprecated)',
    github: 'GitHub Models (deprecated)',
    'copilot-sdk': 'Copilot SDK (recommended)',
  };
  if (deprecated[provider]) return deprecated[provider];
  return provider;
}

function _getQuickModelCandidates(rows) {
  const parsed = _getModelPrefsFromStorage();
  const recents = Array.isArray(parsed.recentModels) ? parsed.recentModels : [];
  const ranked = [];

  for (const recent of recents) {
    const hit = rows.find((row) => row.provider === recent.provider && row.model === recent.model);
    if (hit) ranked.push(hit);
  }

  const popular = [...rows]
    .sort((a, b) => {
      const am = Number(a.copilot_multiplier ?? 999);
      const bm = Number(b.copilot_multiplier ?? 999);
      if (am !== bm) return am - bm;
      const ac = Number(a.context_window || 0);
      const bc = Number(b.context_window || 0);
      return bc - ac;
    });

  for (const item of popular) {
    if (!ranked.some((r) => r.provider === item.provider && r.model === item.model)) {
      ranked.push(item);
    }
  }

  return ranked.slice(0, 8);
}

function _renderQuickModelList(rows) {
  const quickEl = document.getElementById('model-quick-list');
  if (!quickEl) return;
  quickEl.innerHTML = '';

  const candidates = _getQuickModelCandidates(rows || []);
  for (const item of candidates) {
    const isActive = item.provider === _modelData?.provider && item.model === _modelData?.model;
    const button = document.createElement('button');
    button.className = 'header-pill-btn';
    button.style.padding = '5px 10px';
    button.style.fontSize = '0.82em';
    button.style.background = isActive ? '#dbeafe' : '#f8fafc';
    button.style.color = isActive ? '#1e3a8a' : '#334155';
    button.style.borderColor = isActive ? '#93c5fd' : '#cbd5e1';
    button.title = `${item.provider} · ${item.model}`;
    button.textContent = `${item.provider} · ${item.model}`;
    button.addEventListener('click', async () => {
      await setModel(item.model, item.provider);
    });
    quickEl.appendChild(button);
  }
}

function _syncCatalogVisibility() {
  const wrap = document.getElementById('model-full-table-wrap');
  const search = document.getElementById('model-global-search');
  const toggle = document.getElementById('model-show-all-btn');
  if (wrap) wrap.style.display = _showFullModelCatalog ? '' : 'none';
  if (search) search.style.display = _showFullModelCatalog ? '' : 'none';
  if (toggle) toggle.textContent = _showFullModelCatalog ? 'Hide Full Catalog' : 'Show Full Catalog';
}

function toggleModelCatalogVisibility() {
  _showFullModelCatalog = !_showFullModelCatalog;
  _syncCatalogVisibility();
}

// _renderAuthStep — called by _setModelWizardStep when entering Step 2.
// Renders provider-specific content into #model-auth-step-content and shows
// the appropriate sub-panel (key input, device-flow, CLI notice, or none).
async function _renderAuthStep(provider) {
  const content    = document.getElementById('model-auth-step-content');
  const keyPanel   = document.getElementById('model-auth-key-panel');
  const devPanel   = document.getElementById('model-auth-device-panel');
  const keyInput   = document.getElementById('model-auth-key-input');
  const keyStatus  = document.getElementById('model-auth-key-status');

  if (!content) return;

  // Reset sub-panels
  if (keyPanel)  keyPanel.style.display  = 'none';
  if (devPanel)  devPanel.style.display  = 'none';
  if (keyInput)  keyInput.value = '';
  if (keyStatus) keyStatus.textContent = '';

  if (!provider) {
    content.innerHTML = '<p style="color:#64748b;">Select a provider in Step 1 first.</p>';
    return;
  }

  let credData = null;
  try {
    const resp = await fetch('/api/settings/credentials/status');
    if (resp.ok) {
      const data = await resp.json();
      credData = (data.providers || {})[provider] || null;
    }
  } catch { /* non-fatal */ }

  const authType   = credData?.auth_type  || 'api_key';
  const label      = credData?.label      || provider;
  const helpText   = credData?.help_text  || '';
  const getKeyUrl  = credData?.get_key_url || '';
  const isSet      = credData?.is_set     || false;
  const source     = credData?.source     || 'unset';
  const envVar     = credData?.env_var    || null;
  const isLocked   = credData?.locked     || false;

  const isSetBadge = isSet
    ? '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#d1fae5;color:#065f46;font-size:0.8em;font-weight:600;">&#10003; Key saved</span>'
    : '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:0.8em;font-weight:600;">Not configured</span>';

  // Source label + ⓘ tooltip — mirrors the settings dialog pattern.
  let sourceLabel = '';
  let tooltipText = '';
  if (source === 'env') {
    sourceLabel = `Source: environment variable (${envVar || 'locked'})`;
    tooltipText = `Currently loaded from the ${envVar} environment variable. ` +
      `To change it permanently, update your shell config (e.g. ~/.zshrc) and restart the server. ` +
      `You can still save a value below — it takes effect immediately but will be overridden by the environment variable on next restart.`;
  } else if (source === 'dotenv') {
    sourceLabel = `Source: .env file (${envVar || 'locked'})`;
    tooltipText = `Currently loaded from ${envVar} in your .env file. ` +
      `To change it permanently, edit the .env file in the project directory and restart the server. ` +
      `You can still save a value below — it takes effect immediately but will be overridden by .env on next restart.`;
  } else if (source === 'config') {
    sourceLabel = 'Source: config.yaml';
    tooltipText = 'Stored in config.yaml. Update it using the input below.';
  }

  const infoIcon = tooltipText
    ? ` <button type="button" title="${escapeHtml(tooltipText)}" aria-label="Where is this key stored?" ` +
      `style="background:none;border:none;cursor:help;color:#64748b;font-size:0.85em;padding:0 2px;vertical-align:middle;line-height:1;">ⓘ</button>`
    : '';

  const sourceLabelHtml = sourceLabel
    ? `<span style="margin-left:10px;font-size:0.8em;color:${isLocked ? '#b45309' : '#64748b'};">${escapeHtml(sourceLabel)}${infoIcon}</span>`
    : '';

  // Amber warning when a locked source exists — input remains enabled so the
  // user can save a session/config override, but the precedence rule is clear.
  const sourceDesc = source === 'env' ? 'environment variable' : '.env file';
  const sourceRef  = envVar
    ? `${sourceDesc} <code>${escapeHtml(envVar)}</code>`
    : sourceDesc;
  const lockedWarnHtml = isLocked
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px 12px;margin:8px 0;font-size:0.85em;color:#92400e;">` +
      `⚠ This key is loaded from the <strong>${sourceRef}</strong>. ` +
      `Any value saved below takes effect immediately for the current session, but will be ` +
      `<strong>overridden by the ${sourceDesc} when the server restarts or reloads</strong>.</div>`
    : '';

  const getKeyLink = getKeyUrl
    ? `<a href="${escapeHtml(getKeyUrl)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">Get your key &#8599;</a>`
    : '';

  content.innerHTML =
    `<div style="margin-bottom:10px;">` +
    `  <strong>${escapeHtml(label)}</strong> ${isSetBadge}${sourceLabelHtml}` +
    (getKeyLink ? `  <span style="margin-left:10px;">${getKeyLink}</span>` : '') +
    `</div>` +
    (helpText ? `<p style="font-size:0.85em;color:#475569;margin:0 0 12px;">${escapeHtml(helpText)}</p>` : '') +
    lockedWarnHtml;

  if (authType === 'api_key') {
    if (keyPanel) {
      keyPanel.style.display = '';
      if (keyInput) {
        // Always enable input — user can save a new value even when env/dotenv is the current
        // source. The warning banner above communicates the restart-precedence behaviour.
        keyInput.disabled = false;
        keyInput.style.opacity = '';
        keyInput.placeholder = isSet ? 'Enter new key to replace the saved one' : 'Paste your API key here';
        keyInput.dataset.provider = provider;
      }
    }
  } else if (authType === 'device_flow') {
    if (devPanel) {
      devPanel.style.display = '';
      await _refreshCopilotAuthStatus();
    }
  } else if (authType === 'cli') {
    content.innerHTML +=
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;font-size:0.88em;">` +
      `<p style="margin:0 0 6px;">Run this command in a terminal, then return here and click <strong>Next</strong>:</p>` +
      `<code style="font-size:1em;">gh auth login</code></div>`;
  } else {
    content.innerHTML +=
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:0.88em;color:#475569;">` +
      `No authentication required for this provider.</div>`;
  }
}

async function _refreshCopilotAuthStatus() {
  const statusEl = document.getElementById('model-auth-status');
  const startBtn  = document.getElementById('model-auth-start-btn');
  const logoutBtn = document.getElementById('model-auth-logout-btn');
  const codeEl    = document.getElementById('model-auth-code');
  const linkEl    = document.getElementById('model-auth-link');
  if (!statusEl) return;

  if (codeEl)  codeEl.textContent = '';
  if (linkEl)  linkEl.style.display = 'none';

  try {
    const st = await fetch('/api/copilot-auth/status').then((res) => res.json());
    if (st.authenticated) {
      statusEl.textContent = 'Authenticated with GitHub Copilot.';
      if (startBtn) startBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = '';
      _updateLlmStatusPill('authenticated', 'Copilot ready');
    } else if (st.polling) {
      statusEl.textContent = 'Waiting for device approval…';
      if (startBtn) startBtn.style.display = '';
      if (logoutBtn) logoutBtn.style.display = 'none';
      _updateLlmStatusPill('polling', 'Copilot auth pending', '⧗');
    } else {
      statusEl.textContent = 'Not authenticated. Start sign-in to enable Copilot OAuth.';
      if (startBtn) startBtn.style.display = '';
      if (logoutBtn) logoutBtn.style.display = 'none';
      _updateLlmStatusPill('unauthenticated', 'Copilot not authenticated');
    }
  } catch {
    statusEl.textContent = 'Unable to load auth status.';
  }
}

async function saveProviderApiKey() {
  const keyInput  = document.getElementById('model-auth-key-input');
  const keyStatus = document.getElementById('model-auth-key-status');
  const provider  = keyInput?.dataset?.provider || _modelWizardSelectedProvider;
  const value     = (keyInput?.value || '').trim();

  if (!value) {
    if (keyStatus) { keyStatus.textContent = 'Please enter a key value.'; keyStatus.style.color = '#b91c1c'; }
    return;
  }
  if (!provider) {
    if (keyStatus) { keyStatus.textContent = 'No provider selected.'; keyStatus.style.color = '#b91c1c'; }
    return;
  }

  if (keyStatus) { keyStatus.textContent = 'Saving…'; keyStatus.style.color = '#475569'; }
  try {
    await apiCall('POST', '/api/settings/credentials', { provider, key_value: value });
    if (keyInput)  keyInput.value = '';
    if (keyStatus) {
      keyStatus.textContent = 'Key saved successfully.';
      keyStatus.style.color = '#065f46';
    }
    // Re-render badge to show key is now set
    await _renderAuthStep(provider);
  } catch (e) {
    if (keyStatus) { keyStatus.textContent = `Error: ${e.message || e}`; keyStatus.style.color = '#b91c1c'; }
  }
}

function toggleApiKeyVisibility() {
  const input  = document.getElementById('model-auth-key-input');
  const toggle = document.getElementById('model-auth-key-toggle');
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  if (toggle) toggle.textContent = isHidden ? '🙈' : '👁';
}

async function startCopilotAuthFromWizard() {
  const statusEl = document.getElementById('model-auth-status');
  const codeEl = document.getElementById('model-auth-code');
  const linkEl = document.getElementById('model-auth-link');
  if (!statusEl || !codeEl || !linkEl) return;

  _showModelWizardBusy('Starting GitHub device authorization...');
  try {
    const flowRes = await fetch('/api/copilot-auth/start', { method: 'POST' });
    if (!flowRes.ok) throw new Error(await flowRes.text());
    const flow = await flowRes.json();

    codeEl.textContent = flow.user_code || '';
    linkEl.href = flow.verification_uri || 'https://github.com/login/device';
    linkEl.style.display = '';
    statusEl.textContent = 'Open GitHub, enter the code, then return here.';
    window.open(linkEl.href, '_blank');

    await fetch('/api/copilot-auth/poll', { method: 'POST' });
    _updateLlmStatusPill('polling', 'Copilot auth pending', '⧗');
    if (_copilotAuthPollTimer) clearInterval(_copilotAuthPollTimer);
    _copilotAuthPollTimer = setInterval(async () => {
      try {
        const st = await fetch('/api/copilot-auth/status').then((res) => res.json());
        if (st.authenticated) {
          clearInterval(_copilotAuthPollTimer);
          _copilotAuthPollTimer = null;
          await _refreshCopilotAuthStatus();
        }
      } catch {
        // keep polling silently until close
      }
    }, 5000);
  } catch (error) {
    statusEl.textContent = `Auth start failed: ${error.message || error}`;
  } finally {
    _hideModelWizardBusy();
  }
}

async function logoutCopilotAuthFromWizard() {
  await fetch('/api/copilot-auth/logout', { method: 'POST' });
  await _refreshCopilotAuthStatus();
}

function _wireGlobalModelSearch() {
  const input = document.getElementById('model-global-search');
  if (!input) return;
  input.oninput = () => {
    if (_modelDataTable && typeof _modelDataTable.search === 'function') {
      _modelDataTable.search(input.value || '').draw();
    }
  };
}

function _renderProviderSelector() {
  const listEl = document.getElementById('model-provider-list');
  if (!listEl || !_modelData) return;

  const providers = Array.isArray(_modelData.providers)
    ? _modelData.providers
    : Array.from(new Set((_modelData.all_models || []).map(r => r.provider).filter(Boolean))).sort();
  const capableSet = new Set(_modelData.list_models_capable || []);

  if (!_modelWizardSelectedProvider) {
    _modelWizardSelectedProvider = _modelData.provider || providers[0] || null;
  }
  if (_modelWizardSelectedProvider) {
    _selectedModelProviders = new Set([_modelWizardSelectedProvider]);
  }

  // Dispose any existing BS5 popovers before clearing the list.
  listEl.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
    window.bootstrap?.Popover?.getInstance(el)?.dispose();
  });

  listEl.innerHTML = '';
  providers.forEach(provider => {
    const checked = provider === _modelWizardSelectedProvider;
    const sourceLabel = _providerStageLabel(provider, capableSet);
    const info = getProviderInfo(provider);

    const label = document.createElement('label');
    label.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 8px; border:1px solid #cbd5e1; border-radius:999px; font-size:0.82em; background:#fff; cursor:pointer;';
    label.innerHTML =
      `<input type="radio" name="model-provider-choice" value="${escapeHtml(provider)}" ${checked ? 'checked' : ''} style="margin:0;" />` +
      `<span>${escapeHtml(_providerDisplayLabel(provider))}</span>` +
      `<span style="color:#64748b; font-size:0.8em;">(${escapeHtml(sourceLabel)})</span>`;

    // Append a ⓘ button wired to a BS5 HTML popover so links inside are clickable.
    if (info) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Provider info');
      btn.setAttribute('data-bs-toggle', 'popover');
      btn.setAttribute('data-bs-trigger', 'click');
      btn.setAttribute('data-bs-placement', 'right');
      btn.setAttribute('data-bs-html', 'true');
      btn.setAttribute('data-bs-container', 'body');
      btn.setAttribute('data-bs-content', providerInfoPopoverContent(info));
      btn.style.cssText = 'background:none;border:none;cursor:pointer;color:#64748b;font-size:0.9em;padding:0 1px;line-height:1;vertical-align:middle;';
      btn.textContent = 'ⓘ';
      // Prevent the radio-label click from propagating to the radio button.
      btn.addEventListener('click', e => e.stopPropagation());
      label.appendChild(btn);

      // Initialise after append — BS5 must find the element in the DOM.
      requestAnimationFrame(() => {
        if (window.bootstrap?.Popover) {
          new window.bootstrap.Popover(btn, { sanitize: false });
        }
      });
    }

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (!checkbox.checked) return;
      _modelWizardSelectedProvider = provider;
      _selectedModelProviders = new Set([provider]);
      _updateModelWizardNav();
    });

    listEl.appendChild(label);
  });

  _updateModelWizardNav();
}

function _showModelWizardBusy(message) {
  const overlay = document.getElementById('model-wizard-busy-overlay');
  const messageEl = document.getElementById('model-wizard-busy-message');
  if (messageEl) messageEl.textContent = message || 'Working...';
  if (overlay) overlay.style.display = 'flex';
}

function _hideModelWizardBusy() {
  const overlay = document.getElementById('model-wizard-busy-overlay');
  if (overlay) overlay.style.display = 'none';
}

function _setModelWizardStep(step) {
  _modelWizardStep = [1, 2, 3, 4].includes(step) ? step : 1;
  const panes = {
    1: document.getElementById('model-step-provider'),
    2: document.getElementById('model-step-auth'),
    3: document.getElementById('model-step-models'),
    4: document.getElementById('model-step-success'),
  };
  Object.entries(panes).forEach(([num, el]) => {
    if (el) el.style.display = Number(num) === _modelWizardStep ? '' : 'none';
  });
  if (_modelWizardStep === 2) {
    _renderAuthStep(_modelWizardSelectedProvider);
  }
  _updateModelWizardNav();
}

function _updateModelWizardProgressBar() {
  [1, 2, 3, 4].forEach((stepNum) => {
    const stepEl = document.getElementById(`model-progress-step-${stepNum}`);
    if (!stepEl) return;
    const badgeEl = stepEl.querySelector('.model-progress-badge');
    stepEl.classList.remove('is-active', 'is-complete', 'is-upcoming');
    if (stepNum < _modelWizardStep) {
      stepEl.classList.add('is-complete');
      stepEl.setAttribute('aria-current', 'false');
      if (badgeEl) badgeEl.textContent = '✓';
    } else if (stepNum === _modelWizardStep) {
      stepEl.classList.add('is-active');
      stepEl.setAttribute('aria-current', 'step');
      if (badgeEl) badgeEl.textContent = String(stepNum);
    } else {
      stepEl.classList.add('is-upcoming');
      stepEl.setAttribute('aria-current', 'false');
      if (badgeEl) badgeEl.textContent = String(stepNum);
    }
  });
}

function _updateModelWizardNav() {
  const stepLabel  = document.getElementById('model-wizard-step-label');
  const backBtn    = document.getElementById('model-wizard-back-btn');
  const nextBtn    = document.getElementById('model-wizard-next-btn');
  const testBtn    = document.getElementById('model-test-btn');
  const refreshBtn = document.getElementById('pricing-refresh-btn');
  const footer     = document.querySelector('.model-wizard-footer');

  _updateModelWizardProgressBar();

  if (stepLabel) {
    const labels = {
      1: 'Step 1 of 4: Choose provider',
      2: 'Step 2 of 4: Set up authentication',
      3: 'Step 3 of 4: Choose model and test connection',
      4: 'Step 4 of 4: Complete',
    };
    stepLabel.textContent = labels[_modelWizardStep] || '';
  }

  if (backBtn) {
    backBtn.disabled = _modelWizardStep === 1;
    backBtn.style.display = _modelWizardStep === 4 ? 'none' : '';
  }
  // Next button: visible on steps 1 and 2
  if (nextBtn) {
    nextBtn.style.display = (_modelWizardStep === 1 || _modelWizardStep === 2) ? '' : 'none';
    nextBtn.disabled = _modelWizardStep === 1 && !_modelWizardSelectedProvider;
    nextBtn.textContent = _modelWizardStep === 2 ? 'Next' : 'Next';
  }
  if (testBtn)    testBtn.style.display    = _modelWizardStep === 3 ? '' : 'none';
  if (refreshBtn) refreshBtn.style.display = _modelWizardStep === 3 ? '' : 'none';
  if (footer) footer.style.justifyContent  = _modelWizardStep === 4 ? 'center' : 'space-between';
}

async function _loadModelsForSelectedProvider() {
  if (!_modelWizardSelectedProvider) return false;

  const loadingEl = document.getElementById('model-models-loading');
  if (loadingEl) {
    loadingEl.style.display = '';
    loadingEl.style.color = '#475569';
    loadingEl.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:6px;"></span>Loading models for selected provider...';
  }

  _showModelWizardBusy('Querying available models...');
  try {
    _selectedModelProviders = new Set([_modelWizardSelectedProvider]);
    _modelData.provider = _modelWizardSelectedProvider;
    await _refreshModelCatalogForSelection();
    if (loadingEl) {
      loadingEl.style.display = 'none';
      loadingEl.textContent = '';
    }
    return true;
  } catch (error) {
    log.warn('Could not load models for selected provider:', error);
    if (loadingEl) {
      loadingEl.style.display = '';
      loadingEl.textContent = 'Failed to load models for selected provider.';
      loadingEl.style.color = '#b91c1c';
    }
    return false;
  } finally {
    _hideModelWizardBusy();
  }
}

async function nextWizardStep() {
  if (_modelWizardStep === 1) {
    if (!_modelWizardSelectedProvider) return;
    _setModelWizardStep(2);
    return;
  }
  if (_modelWizardStep === 2) {
    const loaded = await _loadModelsForSelectedProvider();
    if (!loaded) return;
    _setModelWizardStep(3);
  }
}

function previousWizardStep() {
  if (_modelWizardStep === 2) { _setModelWizardStep(1); return; }
  if (_modelWizardStep === 3) { _setModelWizardStep(2); return; }
  if (_modelWizardStep === 4) { _setModelWizardStep(3); }
}

async function _refreshModelCatalogForSelection() {
  if (!_modelData) return;
  if (_catalogRefreshing) {
    _catalogRefreshPending = true;
    return;
  }
  _catalogRefreshing = true;

  try {
    const selected = Array.from(_selectedModelProviders);
    if (!selected.length) {
      _selectedModelProviders = new Set([_modelData.provider]);
    }

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
    log.warn('Could not refresh model catalog for selected providers:', error);
  } finally {
    _catalogRefreshing = false;
  }

  _renderProviderSelector();
  _buildModelTable();

  if (_catalogRefreshPending) {
    _catalogRefreshPending = false;
    await _refreshModelCatalogForSelection();
  }
}

async function openModelModal() {
  const overlay = document.getElementById('model-modal-overlay');
  if (!overlay) return;

  if (!_modelData) {
    await loadModelSelector();
  }
  await loadProviderInfo();
  if (!_modelWizardSelectedProvider) {
    _modelWizardSelectedProvider = _modelData?.provider || null;
  }
  const successSummary = document.getElementById('model-success-summary');
  if (successSummary) {
    successSummary.textContent = 'Provider and model are configured and the connection check succeeded.';
  }
  _renderProviderSelector();
  _syncCatalogVisibility();
  _wireGlobalModelSearch();
  _setModelWizardStep(1);
  _hideModelWizardBusy();
  overlay.style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('model-modal-overlay');
  trapFocus('model-modal-overlay');
}

function closeModelModal() {
  const overlay = document.getElementById('model-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  _setModelWizardStep(1);
  _hideModelWizardBusy();
  if (_copilotAuthPollTimer) {
    clearInterval(_copilotAuthPollTimer);
    _copilotAuthPollTimer = null;
  }
  restoreFocus();
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
    try {
      _modelDataTable = $('#model-table').DataTable();
      _modelDataTable.destroy();
    } catch (e) {
      log.warn('DataTable.destroy() failed (table may already be torn down):', e);
    } finally {
      _modelDataTable = null;
    }
  }

  // Prefer cross-provider list; fall back to current-provider available list
  let rows = (_modelData.all_models && _modelData.all_models.length)
    ? _modelData.all_models.filter(r => r.model)
    : (_modelData.available || []).map(r =>
        typeof r === 'object'
          ? { ...r, provider: currentProvider }
          : { model: r, provider: currentProvider }
      );

  _renderQuickModelList(rows);
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
      `<td style="${tdBase} color:#64748b; white-space:nowrap;">${escapeHtml(_providerDisplayLabel(provider))}</td>` +
      `<td style="${tdBase}">${escapeHtml(m)}</td>` +
      `<td style="${tdBase} white-space:nowrap; text-align:right; font-variant-numeric:tabular-nums;">${ctx}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_input)}${fmtPriceHint(priceSource)}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtCost(item.cost_output)}${fmtPriceHint(priceSource)}</td>` +
      `<td style="${tdBase} text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap;">${fmtMult(item.copilot_multiplier)}</td>` +
      `<td style="${tdBase} white-space:nowrap;">${fmtSource(source)}</td>` +
      `<td style="${tdBase} color:#64748b;">${escapeHtml(notes)}</td>`;
    tbody.appendChild(tr);
  });

  // Rebind row click using delegation so sorting/filter redraws still work.
  tbody.onclick = async (event) => {
    const tr = event.target.closest('tr');
    if (!tr) return;
    const provider = tr.getAttribute('data-provider');
    const model = tr.getAttribute('data-model');
    if (!model) return;

    // Immediate feedback while the API call is in-flight
    tr.style.cssText = 'background:#fef3c7; cursor:wait; opacity:0.85;';
    const modelCell = tr.cells && tr.cells[1];
    if (modelCell) {
      modelCell.innerHTML =
        `<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:6px;"></span>${escapeHtml(model)}`;
    }
    const status = document.getElementById('model-test-status');
    if (status) {
      status.style.display = '';
      status.style.color   = '#92400e';
      status.innerHTML     =
        `<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:6px;"></span> Switching to ${escapeHtml(model)}\u2026`;
    }

    await setModel(model, provider);
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
            const $input = $('<input>', {
              type: 'text',
              placeholder: title,
              style: 'width:100%; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.82em;',
            });
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
  _showModelWizardBusy(`Applying model ${model}...`);
  try {
    const payload = provider ? { model, provider } : { model };
    await apiCall('POST', '/api/model', payload);
    if (_modelData) {
      _modelData.model = model;
      if (provider) _modelData.provider = provider;
    }
    const effectiveProvider = (_modelData && _modelData.provider) || provider;
    const label = document.getElementById('model-current-label');
    if (label) {
      label.textContent = effectiveProvider ? `${effectiveProvider} · ${model}` : model;
    }
    _appendRecentModel(effectiveProvider, model);
    _syncModelTableSelection();
    _renderQuickModelList((_modelData && _modelData.all_models) || []);
    _updateLlmStatusPill('configured', `${effectiveProvider || 'Provider'} configured`);

    _saveModelPrefsToStorage({
      currentModelProvider: effectiveProvider || null,
      currentModelName: model || null,
    });
    await _refreshCopilotAuthStatus();
    await testCurrentModel();
  } catch (e) {
    log.error('Failed to switch model:', e);
    const msg = e.message || String(e);
    _syncModelTableSelection();
    const status = document.getElementById('model-test-status');
    if (status) {
      status.style.display = '';
      status.style.color = '#dc2626';
      status.textContent = `❌ ${msg}`;
    }
    if (typeof appendMessage === 'function') {
      appendMessage('system', `❌ Model switch failed: ${msg}`);
    }
  } finally {
    _hideModelWizardBusy();
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
    _updateLlmStatusPill('connecting', 'Connecting…', '⧗');
  };

  const setOk = (latencyMs) => {
    const tip = `Connected — ${latencyMs}ms`;
    if (badge)  { badge.textContent  = OK;  badge.style.display  = ''; badge.title  = tip; }
    if (status) { status.innerHTML   = `${OK} ${tip}`; status.style.color = '#16a34a'; status.style.display = ''; }
    if (btn)    { btn.disabled = false; btn.innerHTML = '&#10003; Test connection'; }
    _updateLlmStatusPill('connected', `Healthy (${latencyMs}ms)`, '✓');
    const successSummary = document.getElementById('model-success-summary');
    if (successSummary) {
      successSummary.textContent = `Connection verified in ${latencyMs}ms. You can close the wizard and continue.`;
    }
    _setModelWizardStep(4);
  };

  const setFail = (errMsg) => {
    if (badge)  { badge.textContent  = FAIL; badge.style.display  = ''; badge.title  = errMsg; }
    if (status) {
      status.innerHTML   = `${FAIL} <span title="${errMsg.replace(/"/g, '&quot;')}" style="cursor:help; text-decoration:underline dotted;">Connection failed</span>`;
      status.style.color = '#dc2626';
      status.style.display = '';
    }
    if (btn)    { btn.disabled = false; btn.innerHTML = '&#10003; Test connection'; }
    _updateLlmStatusPill('error', 'Connection failed', '⚠', errMsg);
    if (_modelWizardStep === 3) {
      _setModelWizardStep(2);
    }
  };

  setRunning();
  _showModelWizardBusy('Testing model connection...');
  try {
    const result = await apiCall('POST', '/api/model/test');
    if (result.ok) {
      setOk(result.latency_ms);
      return true;
    }
    setFail(result.error || 'Unknown error');
    return false;
  } catch (e) {
    setFail(e.message || String(e));
    return false;
  } finally {
    _hideModelWizardBusy();
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
  _showModelWizardBusy('Refreshing model pricing...');
  try {
    await apiCall('POST', '/api/model-pricing/refresh');
    // Re-fetch model data so the table gets fresh prices
    _modelData = await apiCall('GET', '/api/model');
    _buildModelTable();
  } catch (e) {
    if (lbl) lbl.textContent = 'Refresh failed';
    log.error('Pricing refresh failed:', e);
  } finally {
    _hideModelWizardBusy();
    if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh prices'; }
  }
}

// Initialize on page load — delegates to app.js init() which is loaded after this file
document.addEventListener('DOMContentLoaded', () => {
  loadModelSelector();

  // Wire up tab scroll arrow buttons
  const tabBar   = document.getElementById('tab-bar');
  const leftBtn  = document.getElementById('tab-scroll-left');
  const rightBtn = document.getElementById('tab-scroll-right');
  if (tabBar && leftBtn && rightBtn) {
    leftBtn.addEventListener('click',  () => { tabBar.scrollBy({ left: -160, behavior: 'smooth' }); });
    rightBtn.addEventListener('click', () => { tabBar.scrollBy({ left:  160, behavior: 'smooth' }); });
    tabBar.addEventListener('scroll', updateTabScrollButtons);
    new ResizeObserver(updateTabScrollButtons).observe(tabBar);
  }

  // Show only the Job tab until fetchStatus resolves the actual stage
  updateTabBarForStage('job');

  if (typeof init === 'function') init();
});

// ── ES module exports ──────────────────────────────────────────────────────
export {
  // Focus / accessibility
  setInitialFocus, trapFocus, restoreFocus,
  // Dialogs & modals
  confirmDialog, openModal, closeModal, closeAllModals,
  showSessionConflictBanner, showAlertModal, closeAlertModal,
  // Tab & stage management
  setupEventListeners, getStageForTab, getVisibleStage, updateTabBarForStage, loadTabContent,
  // Chat
  toggleChat,
  // Phase / status
  initialize,
  // Model selector
  loadModelSelector, openModelModal, closeModelModal, setModel, testCurrentModel, refreshModelPricing,
  toggleModelCatalogVisibility, startCopilotAuthFromWizard, logoutCopilotAuthFromWizard,
  nextWizardStep, previousWizardStep,
  saveProviderApiKey, toggleApiKeyVisibility,
  _updateLlmStatusPill,
  // Settings modal
  openSettingsModal, closeSettingsModal, saveSettingsModal, reloadSettingsModal,
};
