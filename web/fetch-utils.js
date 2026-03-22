// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/fetch-utils.js
 * Global fetch interceptor, 409-conflict retry queue, LLM status bar, and
 * the setLoading helper that drives buttons/progress bar/abort controller.
 *
 * DEPENDENCIES: ui-core.js exports (trapFocus etc.) available on globalThis.
 *               setLoading calls _updateLLMStatusBar (defined here) and
 *               appendMessage (defined in message-queue.js, on globalThis).
 */

// ---------------------------------------------------------------------------
// 409 Conflict retry queue
// ---------------------------------------------------------------------------

const _conflictRetryQueue = [];
let   _conflictTimerId    = null;
let   _conflictCountdown  = 0;

/** Return true if this request should be intercepted by the 409 handler. */
function _shouldHandleBusyConflict(args) {
  try {
    const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (!rawUrl) return true;
    const url = new URL(rawUrl, window.location.origin);
    return url.pathname !== '/api/sessions/claim' && url.pathname !== '/api/sessions/takeover';
  } catch (_) {
    return true;
  }
}

// Global fetch interceptor — shows amber banner on 409 Conflict; auto-retries after countdown.
(function () {
  const _origFetch = window.fetch;
  window.fetch = async function (...args) {
    const resp = await _origFetch.apply(this, args);
    if (resp.status === 409 && _shouldHandleBusyConflict(args)) {
      showSessionConflictBanner();
      const shouldRetry = await new Promise(resolve => _conflictRetryQueue.push(resolve));
      if (shouldRetry) return _origFetch.apply(this, args);
    }
    return resp;
  };
}());

function showSessionConflictBanner() {
  const banner      = document.getElementById('session-conflict-banner');
  const bannerText  = document.getElementById('conflict-banner-text');
  const countdownEl = document.getElementById('conflict-countdown');
  if (!banner) return;
  banner.style.display = 'block';
  if (_conflictTimerId) { clearInterval(_conflictTimerId); _conflictTimerId = null; }
  _conflictCountdown = 30;
  if (bannerText)  bannerText.textContent  = '⚠ Another operation is in progress. Auto-retrying in ';
  if (countdownEl) countdownEl.textContent = `${_conflictCountdown}s…`;
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

// ---------------------------------------------------------------------------
// LLM fetch wrapper (attaches abort signal)
// ---------------------------------------------------------------------------

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
    if (typeof appendMessage === 'function') appendMessage('system', '⏹ Request stopped.');
  }
}

// ---------------------------------------------------------------------------
// LLM status bar
// ---------------------------------------------------------------------------

let _llmElapsedTimer = null;
let _llmStartTime    = null;

function _updateLLMStatusBar(loading, label) {
  const bar       = document.getElementById('llm-status-bar');
  const thinking  = document.getElementById('llm-thinking');
  const abortBtn  = document.getElementById('llm-abort-btn');
  const stepLabel = document.getElementById('llm-step-label');
  const elapsedEl = document.getElementById('llm-elapsed');
  if (!bar) return;
  if (loading) {
    bar.style.display = 'flex';
    if (thinking)  thinking.style.display  = 'flex';
    if (abortBtn)  abortBtn.style.display  = '';
    if (stepLabel) stepLabel.textContent   = label || 'Reasoning…';
    if (elapsedEl) elapsedEl.textContent   = '';
    _llmStartTime = Date.now();
    clearInterval(_llmElapsedTimer);
    _llmElapsedTimer = setInterval(() => {
      if (!elapsedEl) return;
      const secs = Math.floor((Date.now() - _llmStartTime) / 1000);
      if (secs >= 3) elapsedEl.textContent = ` · ${secs}s`;
    }, 1000);
  } else {
    clearInterval(_llmElapsedTimer);
    _llmElapsedTimer = null;
    _llmStartTime    = null;
    if (thinking)  thinking.style.display  = 'none';
    if (abortBtn)  abortBtn.style.display  = 'none';
    if (stepLabel) stepLabel.textContent   = 'Reasoning…';
    if (elapsedEl) elapsedEl.textContent   = '';
    _refreshContextStats();
  }
}

async function _refreshContextStats() {
  const bar     = document.getElementById('llm-status-bar');
  const tokenEl = document.getElementById('llm-token-count');
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
    tokenEl.textContent = `${exact ? '' : '~'}${estStr} / ${winStr} (${pct}%)`;
    bar.style.display   = 'flex';
  } catch (_) { /* silently ignore */ }
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function setLoading(loading, label) {
  if (typeof stateManager !== 'undefined' && stateManager?.setLoading) {
    stateManager.setLoading(loading);
  } else {
    globalThis.isLoading = loading;
  }

  if (loading) {
    window._currentAbortController = new AbortController();
  } else {
    window._currentAbortController = null;
  }

  _updateLLMStatusBar(loading, label);

  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = loading);

  let bar = document.getElementById('loading-progress-bar');
  if (loading) {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'loading-progress-bar';
      document.body.prepend(bar);
    }
    requestAnimationFrame(() => { bar.style.width = '70%'; });
    if (label) bar.title = label;
  } else {
    if (bar) {
      bar.style.width = '100%';
      setTimeout(() => bar.remove(), 400);
    }
  }

  document.querySelectorAll('.step.active').forEach(el => {
    el.classList.toggle('loading-step', loading);
  });
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  showSessionConflictBanner, conflictRetryNow, conflictDismiss,
  llmFetch, abortCurrentRequest,
  _updateLLMStatusBar, _refreshContextStats,
  setLoading,
};
