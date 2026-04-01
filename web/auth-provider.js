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
  const badge = document.getElementById('copilot-auth-badge');
  const icon  = document.getElementById('auth-badge-icon');
  const label = document.getElementById('auth-badge-label');
  if (!badge) return;

  const activeProvider = provider || window.currentProvider || null;
  const isCopilotOAuth = activeProvider === 'copilot-oauth';

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
    icon.innerHTML    = '&#x26A0;';
    label.textContent = 'Not authenticated';
  }
}

async function openCopilotAuthModal() {
  const statusRes = await fetch('/api/copilot-auth/status').then(r => r.json()).catch(() => ({}));
  if (statusRes.authenticated) {
    if (await confirmDialog('You are already authenticated with GitHub Copilot. Log out?', { confirmLabel: 'Log out', danger: true })) {
      await fetch('/api/copilot-auth/logout', { method: 'POST' });
      updateAuthBadge({ authenticated: false });
    }
    return;
  }

  const flowRes = await fetch('/api/copilot-auth/start', { method: 'POST' });
  if (!flowRes.ok) {
    alert('Failed to start auth flow: ' + (await flowRes.text()));
    return;
  }
  const flow = await flowRes.json();

  document.getElementById('auth-user-code').textContent   = flow.user_code;
  document.getElementById('auth-verify-link').href         = flow.verification_uri || 'https://github.com/login/device';
  document.getElementById('auth-verify-link').textContent  = flow.verification_uri || 'github.com/login/device';
  document.getElementById('auth-status-msg').textContent   = 'Waiting for you to enter the code at GitHub…';
  document.getElementById('auth-modal-overlay').classList.add('visible');
  if (typeof setInitialFocus === 'function') setInitialFocus('auth-modal-overlay');
  if (typeof trapFocus === 'function') trapFocus('auth-modal-overlay');

  await fetch('/api/copilot-auth/poll', { method: 'POST' });
  updateAuthBadge({ authenticated: false, polling: true });

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
  if (typeof restoreFocus === 'function') restoreFocus();
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  formatProviderLabel, updateAuthBadge,
  openCopilotAuthModal, closeCopilotAuthModal, openAuthGitHub,
};
