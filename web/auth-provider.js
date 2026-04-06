// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/auth-provider.js
 * Copilot / GitHub OAuth auth flow, badge updates, and provider label formatting.
 *
 * DEPENDENCIES:
 *   - confirmDialog from ui-core.js (on globalThis)
 *   - setInitialFocus, trapFocus, restoreFocus from ui-core.js (on globalThis)
 *   - updateAuthBadge (self-reference; exported to globalThis)
 */

let _authPollTimer = null;

function formatProviderLabel(provider) {
  if (!provider || typeof provider !== 'string') return 'Provider';
  const aliases = {
    openai: 'OpenAI',
    'copilot-oauth': 'Copilot OAuth (deprecated)',
    copilot: 'Copilot (deprecated)',
    github: 'GitHub Models (deprecated)',
    'copilot-sdk': 'Copilot SDK (recommended)',
  };
  if (aliases[provider]) return aliases[provider];
  return provider
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function updateAuthBadge(authStatus, provider = null) {
  const legacyBadge = document.getElementById('copilot-auth-badge');
  const legacyIcon  = document.getElementById('auth-badge-icon');
  const legacyLabel = document.getElementById('auth-badge-label');

  const pill = document.getElementById('llm-status-pill');
  const pillIcon = document.getElementById('llm-status-icon');
  const pillLabel = document.getElementById('llm-status-label');

  const applyState = (kind, text, iconText) => {
    if (legacyBadge && legacyIcon && legacyLabel) {
      legacyBadge.classList.remove('authenticated', 'unauthenticated', 'polling');
      legacyBadge.classList.add(kind);
      if (kind === 'connected' || kind === 'configured') legacyBadge.classList.add('authenticated');
      if (kind === 'connecting') legacyBadge.classList.add('polling');
      if (kind === 'unconfigured' || kind === 'auth-required' || kind === 'rate-limited' || kind === 'unavailable' || kind === 'error') legacyBadge.classList.add('unauthenticated');
      legacyIcon.textContent = iconText;
      legacyLabel.textContent = text;
    }
    if (pill && pillIcon && pillLabel) {
      pill.classList.remove('authenticated', 'unauthenticated', 'polling', 'unconfigured', 'configured', 'connecting', 'connected', 'auth-required', 'rate-limited', 'unavailable', 'error');
      pill.classList.add(kind);
      if (kind === 'connected' || kind === 'configured') pill.classList.add('authenticated');
      if (kind === 'connecting') pill.classList.add('polling');
      if (kind === 'unconfigured' || kind === 'auth-required' || kind === 'rate-limited' || kind === 'unavailable' || kind === 'error') pill.classList.add('unauthenticated');
      pillIcon.textContent = iconText;
      pillLabel.textContent = text;
      const tooltipMap = {
        unconfigured: 'No provider/model is configured yet.',
        configured: 'Provider/model is configured. Connectivity not yet verified.',
        connecting: 'Testing or connecting to the selected provider.',
        connected: 'Provider responded successfully to a live request.',
        'auth-required': 'Authentication is required. Check API key or sign in.',
        'rate-limited': 'Rate limit reached. Wait before retrying requests.',
        unavailable: 'Provider is temporarily unavailable or unreachable.',
        error: 'Connection failed. Open model settings for details.',
      };
      const tip = tooltipMap[kind] || '';
      pill.title = tip;
      pillIcon.title = tip;
      pillLabel.title = tip;
    }
  };

  const activeProvider = provider || window.currentProvider || null;
  const isCopilotOAuth = activeProvider === 'copilot-oauth';

  if (activeProvider && !isCopilotOAuth) {
    applyState('configured', `${formatProviderLabel(activeProvider)} configured`, '◔');
    return;
  }

  if (authStatus.authenticated) {
    applyState('connected', 'Copilot ready', '✓');
  } else if (authStatus.polling) {
    applyState('connecting', 'Waiting for approval…', '⧗');
  } else {
    applyState('auth-required', 'Not authenticated', '🔑');
  }
}

function closeCopilotAuthModal() {
  if (_authPollTimer) { clearInterval(_authPollTimer); _authPollTimer = null; }
  if (typeof closeModelModal === 'function') {
    closeModelModal();
    return;
  }
  const legacyOverlay = document.getElementById('auth-modal-overlay');
  if (legacyOverlay) legacyOverlay.classList.remove('visible');
  if (typeof restoreFocus === 'function') restoreFocus();
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  formatProviderLabel, updateAuthBadge,
  closeCopilotAuthModal,
};
