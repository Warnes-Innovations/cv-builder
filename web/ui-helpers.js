// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/ui-helpers.js
 * Lightweight DOM helpers: toasts, alert/confirm modals, chat toggle, and
 * workflow-stage action-button management.
 *
 * NOTE: showAlertModal / closeAlertModal are also defined in ui-core.js
 * (the bundled version that includes focus-trap behaviour).  This file
 * provides the app.js-side versions that call trapFocus / restoreFocus
 * (exported from ui-core.js and available on globalThis after the bundle
 * is loaded).
 *
 * DEPENDENCIES: ui-core.js exports (trapFocus, restoreFocus, setInitialFocus)
 *               available on globalThis at runtime.
 */

// ---------------------------------------------------------------------------
// Alert modal (informational — single OK button)
// ---------------------------------------------------------------------------

function showAlertModal(title, message) {
  document.getElementById('alert-modal-title').textContent = title;
  document.getElementById('alert-modal-message').innerHTML = message.replace(/\n/g, '<br>');
  document.getElementById('alert-modal-overlay').style.display = 'block';
  if (typeof setInitialFocus === 'function') setInitialFocus('alert-modal-overlay');
  if (typeof trapFocus === 'function') trapFocus('alert-modal-overlay');
}

function closeAlertModal() {
  document.getElementById('alert-modal-overlay').style.display = 'none';
  if (typeof restoreFocus === 'function') restoreFocus();
}

// ---------------------------------------------------------------------------
// Confirm modal (returns a Promise that resolves to true/false)
// ---------------------------------------------------------------------------

let _confirmResolve = null;

function showConfirmModal(title, message, okLabel = 'OK') {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').innerHTML = message.replace(/\n/g, '<br>');
  const okBtn = document.getElementById('confirm-modal-ok');
  if (okBtn) okBtn.textContent = okLabel;
  document.getElementById('confirm-modal-overlay').style.display = 'block';
  return new Promise(resolve => { _confirmResolve = resolve; });
}

function closeConfirmModal(result) {
  document.getElementById('confirm-modal-overlay').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add('toast-show'); }); });
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

// ---------------------------------------------------------------------------
// Chat panel toggle
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Workflow-stage primary action buttons
// ---------------------------------------------------------------------------

/** All stage-specific primary action button IDs (excludes reset which is always visible). */
const _STAGE_BUTTONS = [
  'analyze-btn', 'recommend-btn', 'generate-btn',
  'rewrite-btn', 'spell-btn', 'generate-proceed-btn',
  'layout-btn', 'finalise-action-btn',
];

/** Maps each workflow stage to its one primary action button. */
const _STAGE_BUTTON_MAP = {
  job:            'analyze-btn',
  analysis:       'recommend-btn',
  customizations: 'generate-btn',
  rewrite:        'rewrite-btn',
  spell:          'spell-btn',
  generate:       'generate-proceed-btn',
  layout:         'layout-btn',
  finalise:       'finalise-action-btn',
};

/**
 * Show only the primary action button for the given workflow stage.
 * Reset is always visible.  All other stage buttons are hidden.
 */
function updateActionButtons(stage) {
  const activeId = _STAGE_BUTTON_MAP[stage] || null;
  _STAGE_BUTTONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === activeId) ? '' : 'none';
  });
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  showAlertModal, closeAlertModal,
  showConfirmModal, closeConfirmModal,
  showToast,
  toggleChat,
  updateActionButtons,
};
