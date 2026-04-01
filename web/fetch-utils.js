// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/fetch-utils.js
 * Global fetch interceptor, 409-conflict retry queue, LLM busy overlay, and
 * the setLoading helper that drives buttons/progress bar/abort controller.
 *
 * DEPENDENCIES: ui-core.js exports (trapFocus etc.) available on globalThis.
 *               setLoading calls _updateLLMOverlay (defined here) and
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
// LLM busy overlay
// ---------------------------------------------------------------------------

let _llmElapsedTimer = null;
let _llmStartTime    = null;

function _updateLLMOverlay(loading, label) {
  const overlay  = document.getElementById('llm-busy-overlay');
  const labelEl  = document.getElementById('llm-busy-label');
  const elapsed  = document.getElementById('llm-busy-elapsed');
  if (!overlay) return;

  if (loading) {
    overlay.classList.add('visible');
    overlay.classList.remove('slow');
    if (labelEl) labelEl.textContent = label || 'Reasoning…';
    if (elapsed)  elapsed.textContent = '0:00';

    _llmStartTime = Date.now();
    clearInterval(_llmElapsedTimer);
    _llmElapsedTimer = setInterval(() => {
      const secs = Math.floor((Date.now() - _llmStartTime) / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      if (elapsed) elapsed.textContent = `${mm}:${ss}`;
      if (secs >= 30 && !overlay.classList.contains('slow')) {
        overlay.classList.add('slow');
      }
    }, 1000);
  } else {
    clearInterval(_llmElapsedTimer);
    _llmElapsedTimer = null;
    _llmStartTime    = null;
    overlay.classList.remove('visible', 'slow');
    if (labelEl) labelEl.textContent = 'Reasoning…';
    if (elapsed)  elapsed.textContent = '0:00';
    _refreshContextStats();
  }
}

// Backward compatibility for tests/imports that still reference the old name.
function _updateLLMStatusBar(loading, label) {
  _updateLLMOverlay(loading, label);

  const bar = document.getElementById('llm-status-bar');
  const thinking = document.getElementById('llm-thinking');
  const stepLabel = document.getElementById('llm-step-label');
  const abortBtn = document.getElementById('llm-abort-btn');
  if (!bar) return;

  if (loading) {
    bar.style.display = 'flex';
    if (thinking) thinking.style.display = 'flex';
    if (stepLabel) stepLabel.textContent = label || 'Reasoning…';
    if (abortBtn) {
      abortBtn.style.display = '';
      abortBtn.disabled = false;
    }
  } else {
    if (thinking) thinking.style.display = 'none';
    if (abortBtn) abortBtn.style.display = 'none';
    bar.style.display = 'none';
  }
}

async function _refreshContextStats() {
  const tokenEl = document.getElementById('llm-token-count');
  if (!tokenEl) return;
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
    // Expand chat panel if collapsed
    const chatArea = document.getElementById('chat-area');
    const viewerArea = document.getElementById('viewer-area');
    const toggleBtn = document.getElementById('toggle-chat');
    if (chatArea?.classList.contains('collapsed')) {
      chatArea.classList.remove('collapsed');
      viewerArea?.classList.remove('expanded');
      if (toggleBtn) toggleBtn.textContent = '◀';
    }
  } else {
    window._currentAbortController = null;
  }

  _updateLLMStatusBar(loading, label);

  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = loading);
  const stopBtn = document.getElementById('llm-busy-stop');
  if (stopBtn) stopBtn.disabled = false;

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
  _updateLLMStatusBar,
  _updateLLMOverlay, _refreshContextStats,
  setLoading,
};
