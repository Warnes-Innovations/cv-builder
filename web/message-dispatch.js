// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/message-dispatch.js
 * Chat message dispatch: sendMessage, intake confirmation card,
 * prior-clarification preload.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - parseMessageResponse (validators.js)
 *   - setLoading, llmFetch (fetch-utils.js)
 *   - appendMessage, appendRetryMessage, appendRawHtml (message-queue.js)
 *   - normalizeText, escapeHtml (utils.js)
 *   - fetchStatus (api-client.js)
 *   - analyzeJob (job-analysis.js)
 *   - sendAction (session-actions.js)
 *   - showTableBasedReview (review-table-base.js, Tier 4)
 *   - handleExperienceResponse (experience-review.js, Tier 5)
 *   - handleSkillsResponse (skills-review.js, Tier 5)
 *   - handleQuestionResponse (questions-panel.js)
 *   - extractFirstJsonObject, handleCustomizationResponse (app.js orchestrator)
 *   - isLoading, questionAnswers, pendingRecommendations (window globals)
 */

import { getLogger } from './logger.js';
const log = getLogger('message-dispatch');

import { stateManager } from './state-manager.js';
import { getSessionIdFromURL } from './api-client.js';

let _pendingPostIntakeContinuation = null;
const RETRY_POLICY_STORAGE_KEY = 'cv-builder-retry-policy';
let _retryAttemptCount = 0;
let _retryTimer = null;
let _retryInterval = null;

function _clearRetryTimers() {
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  if (_retryInterval) {
    clearInterval(_retryInterval);
    _retryInterval = null;
  }
}

function _getRetryPolicy() {
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

function _calculateRetryDelayMs(kind, error) {
  const policy = _getRetryPolicy();
  const exp = Math.min(policy.capMs, policy.baseMs * (2 ** _retryAttemptCount));
  const jitter = Math.round(exp * (0.1 + Math.random() * 0.15));
  let delayMs = Math.min(policy.capMs, exp + jitter);

  if (kind === 'rate-limited') {
    const retryAfterSec = Number(error?.retryAfterSec || 0);
    if (retryAfterSec > 0) {
      delayMs = Math.max(delayMs, retryAfterSec * 1000);
    }
  }
  return delayMs;
}

function _scheduleRetry(text, derived, error) {
  _clearRetryTimers();
  const policy = _getRetryPolicy();

  // Client errors (4xx) and auth failures are not transient; do not auto-retry.
  const NON_RETRYABLE = new Set(['client-error', 'auth-required']);
  const canAutoRetry = policy.autoRetry
    && _retryAttemptCount < policy.maxAttempts
    && !NON_RETRYABLE.has(derived.kind);

  const delayMs = _calculateRetryDelayMs(derived.kind, error);
  const totalSeconds = Math.max(1, Math.ceil(delayMs / 1000));

  const retryAction = () => {
    const input = document.getElementById('message-input');
    if (input) input.value = text;
    sendMessage();
  };

  let retryMessage;
  const cancelFn = canAutoRetry ? () => {
    _clearRetryTimers();
    if (retryMessage) retryMessage.remove();
  } : null;

  retryMessage = appendRetryMessage(
    `⚠️ ${error.message}`,
    () => {
      _clearRetryTimers();
      _retryAttemptCount += 1;
      retryAction();
    },
    canAutoRetry ? `Retry in ${totalSeconds}s` : 'Retry',
    cancelFn,
  );

  if (!canAutoRetry) return;

  const retryBtn = retryMessage?.querySelector('button');
  let remaining = totalSeconds;
  if (retryBtn) {
    retryBtn.textContent = `Retry in ${remaining}s`;
    if (derived.kind === 'rate-limited') {
      retryBtn.disabled = true;
      retryBtn.style.opacity = '0.7';
      retryBtn.style.cursor = 'not-allowed';
    }
  }

  _retryInterval = setInterval(() => {
    remaining -= 1;
    if (retryBtn && remaining > 0) {
      retryBtn.textContent = `Retry in ${remaining}s`;
    }
    if (remaining <= 0) {
      if (retryBtn) {
        retryBtn.textContent = 'Retry Now';
        retryBtn.disabled = false;
        retryBtn.style.opacity = '';
        retryBtn.style.cursor = '';
      }
      clearInterval(_retryInterval);
      _retryInterval = null;
    }
  }, 1000);

  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    _retryAttemptCount += 1;
    retryMessage?.remove();
    retryAction();
  }, delayMs);
}

async function _parseApiJsonResponse(response, endpoint) {
  const status = Number(response?.status || 0);
  const statusText = response?.statusText || 'Unknown Status';
  const contentType = (response?.headers?.get('content-type') || '').toLowerCase();
  const raw = await response.text();

  if (!response.ok) {
    let detail = statusText;
    if (contentType.includes('application/json')) {
      try {
        const payload = JSON.parse(raw || '{}');
        detail = payload?.error || payload?.message || detail;
      } catch {
        // Keep fallback detail if malformed JSON error payload.
      }
    } else if ((raw || '').trim().startsWith('<')) {
      detail = 'server returned HTML instead of JSON (possible session redirect or backend error)';
    } else if ((raw || '').trim()) {
      detail = raw.trim().slice(0, 220);
    }
    const error = new Error(`${status}: ${detail}`);
    error.status = status;
    error.retryAfterSec = Number(response?.headers?.get('retry-after') || 0);
    throw error;
  }

  if (!contentType.includes('application/json')) {
    const snippet = (raw || '').trim().slice(0, 80);
    throw new SyntaxError(
      `Expected JSON from ${endpoint}, got ${contentType || 'unknown content type'}${snippet ? `: ${snippet}` : ''}`,
    );
  }

  try {
    return parseMessageResponse(JSON.parse(raw || '{}'));
  } catch (error) {
    throw new SyntaxError(`Invalid JSON from ${endpoint}: ${error.message}`);
  }
}

function _setLiveLlmState(kind, text, icon = '', tooltip = '') {
  if (typeof _updateLlmStatusPill === 'function') {
    _updateLlmStatusPill(kind, text, icon, tooltip);
  }
}

function _deriveErrorState(error) {
  const message = String(error?.message || error || 'Unknown error');
  const lower = message.toLowerCase();
  const status = Number(error?.status || 0);

  if (status === 401 || status === 403 || message.startsWith('401:') || message.startsWith('403:') || lower.includes('auth')) {
    return {
      kind: 'auth-required',
      text: 'Authentication required',
      icon: '🔑',
      tooltip: 'Authentication failed. Check API key/token or sign in again.',
    };
  }

  if (status === 429 || message.startsWith('429:') || lower.includes('rate limit')) {
    return {
      kind: 'rate-limited',
      text: 'Rate limited',
      icon: '⏳',
      tooltip: 'Provider rate limit reached. Wait briefly and retry.',
    };
  }

  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.startsWith('502:') ||
    message.startsWith('503:') ||
    message.startsWith('504:') ||
    lower.includes('timeout') ||
    lower.includes('unavailable') ||
    lower.includes('cannot reach')
  ) {
    return {
      kind: 'unavailable',
      text: 'Provider unavailable',
      icon: '☁',
      tooltip: 'Provider is currently unavailable or unreachable. Retry soon.',
    };
  }

  // 4xx client errors are not transient — retrying will not fix them.
  if (status >= 400 && status < 500) {
    return {
      kind: 'client-error',
      text: 'Request error',
      icon: '⚠',
      tooltip: message,
    };
  }

  return {
    kind: 'error',
    text: 'Connection failed',
    icon: '⚠',
    tooltip: message,
  };
}

// ---------------------------------------------------------------------------
// Default LLM message handler
// ---------------------------------------------------------------------------

async function _handleLLMMessage(text) {
  _clearRetryTimers();
  setLoading(true, 'Thinking…');
  _setLiveLlmState('connecting', 'Connecting…', '⧗', 'Sending request to provider.');
  let terminalState = null;
  try {
    const res = await llmFetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await _parseApiJsonResponse(res, '/api/message');

    if (data.error) {
      const errorMsg = data.error.toString();
      const derived = _deriveErrorState(new Error(errorMsg));
      _setLiveLlmState(derived.kind, derived.text, derived.icon, derived.tooltip);
      _scheduleRetry(text, derived, new Error(errorMsg));
      terminalState = derived;
      log.error('Server error:', data.error);
    } else if (data.response) {
      try {
        const cleanResponse = data.response;
        const parsedCustomization = extractFirstJsonObject(cleanResponse);
        if (parsedCustomization && (parsedCustomization.recommended_experiences || parsedCustomization.recommended_skills)) {
          const jsonStart = cleanResponse.indexOf('{');
          const textBeforeJson = jsonStart > 0 ? cleanResponse.substring(0, jsonStart).trim() : '';
          if (textBeforeJson && !textBeforeJson.includes('{"action":')) {
            appendMessage('assistant', textBeforeJson);
          }
          await handleCustomizationResponse(parsedCustomization);
        } else {
          if (cleanResponse.trim().length > 0) {
            appendMessage('assistant', cleanResponse);
          }
        }
      } catch (err) {
        log.error('Error processing message response:', err, data.response);
        const derived = _deriveErrorState(err);
        _setLiveLlmState(derived.kind, derived.text, derived.icon, derived.tooltip);
        appendMessage('system', `⚠️ I encountered an issue processing that response: ${err.message}. The conversation has been saved.`);
        terminalState = derived;
      }
      const connectedState = { kind: 'connected', text: 'Connected', icon: '✓', tooltip: 'Provider responded successfully to a live request.' };
      _setLiveLlmState(connectedState.kind, connectedState.text, connectedState.icon, connectedState.tooltip);
      terminalState = connectedState;
      _retryAttemptCount = 0;
    }
  } catch (error) {
    log.error('=== MESSAGE ERROR ===', error.name, error.message, error.stack);
    if (error.name === 'AbortError') {
      // User clicked Stop — message already shown by abortCurrentRequest().
      setLoading(false);
      return;
    }
    const derived = _deriveErrorState(error);
    _setLiveLlmState(derived.kind, derived.text, derived.icon, derived.tooltip);
    _scheduleRetry(text, derived, error);
    terminalState = derived;
  }
  setLoading(false);
  await fetchStatus();
  if (terminalState) {
    _setLiveLlmState(terminalState.kind, terminalState.text, terminalState.icon, terminalState.tooltip);
  }
}

// ---------------------------------------------------------------------------
// Message dispatch table
// ---------------------------------------------------------------------------

// Handlers checked in order; first matching test() wins.
const _messageHandlers = [
  {
    test: t => t.toLowerCase().includes('review recommendations') || t.toLowerCase() === 'review',
    handle: async () => showTableBasedReview(),
  },
  {
    test: () => window.waitingForExperienceResponse,
    handle: async t => handleExperienceResponse(t),
  },
  {
    test: () => window.waitingForSkillsResponse,
    handle: async t => handleSkillsResponse(t),
  },
  {
    // Post-analysis question response — local handler + backend save.
    test: () => window.waitingForQuestionResponse,
    handle: async t => {
      const questionHandled = handleQuestionResponse(t);
      setLoading(true, 'Thinking…');
      try {
        const res = await llmFetch('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: t }),
        });
        const data = await _parseApiJsonResponse(res, '/api/message');
        if (data.error) {
          log.error('Backend error saving question response:', data.error);
        } else if (data.response && !questionHandled) {
          appendMessage('assistant', data.response);
        }
      } catch (err) {
        if (err.name !== 'AbortError') log.error('=== QUESTION RESPONSE SAVE ERROR ===', err);
      }
      setLoading(false);
      if (!questionHandled) await _handleLLMMessage(t);
    },
  },
  {
    test: t => t.toLowerCase() === 'proceed',
    handle: async () => window.pendingRecommendations
      ? showTableBasedReview()
      : sendAction('recommend_customizations'),
  },
  {
    test: () => true,
    handle: _handleLLMMessage,
  },
];

async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = normalizeText(input.value);
  if (!text || stateManager.isLoading()) return;

  if (!getSessionIdFromURL()) {
    appendMessage('system', '⚠️ No active session. Create or load a session before sending messages.');
    return;
  }

  appendMessage('user', text);
  input.value = '';

  for (const handler of _messageHandlers) {
    if (handler.test(text)) {
      await handler.handle(text);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Intake confirmation card (GAP-23)
// ---------------------------------------------------------------------------

async function _showIntakeConfirmCard(continuation = null) {
  if (typeof continuation === 'function') {
    _pendingPostIntakeContinuation = continuation;
  }

  let extracted = {role: '', company: '', date_applied: ''};
  try {
    const res  = await llmFetch('/api/intake-metadata');
    const data = await res.json();
    if (data.confirmed) {
      await _proceedAfterIntake(continuation);
      return;
    }
    extracted = data;
  } catch (_e) { /* fall through with empty defaults */ }

  const today = extracted.date_applied || new Date().toISOString().slice(0, 10);
  const cardHtml = `
    <div class="intake-confirm-card" id="intake-confirm-card" role="form" aria-label="Confirm job details">
      <h3>📋 Confirm job details</h3>
      <p>Review the extracted details before analysis begins. Edit any field if needed.</p>
      <div class="intake-field-row">
        <label for="intake-role-input">Role / Job Title</label>
        <input id="intake-role-input" type="text" value="${escapeHtml(extracted.role || '')}"
               placeholder="e.g. Senior Software Engineer" autocomplete="off">
      </div>
      <div class="intake-field-row">
        <label for="intake-company-input">Company</label>
        <input id="intake-company-input" type="text" value="${escapeHtml(extracted.company || '')}"
               placeholder="e.g. Acme Corp" autocomplete="off">
      </div>
      <div class="intake-field-row">
        <label for="intake-date-input">Date Applied</label>
        <input id="intake-date-input" type="date" value="${escapeHtml(today)}">
      </div>
      <div class="intake-actions">
        <button class="btn-secondary" onclick="_skipIntakeCard()" type="button">Skip</button>
        <button class="btn-primary"   onclick="_submitIntakeCard()" type="button" id="intake-confirm-btn">Confirm &amp; Continue</button>
      </div>
    </div>`;
  appendRawHtml(cardHtml);

  const roleInput = document.getElementById('intake-role-input');
  if (roleInput && !roleInput.value.trim()) roleInput.focus();
}

async function _submitIntakeCard(continuation = null) {
  const role         = (document.getElementById('intake-role-input')?.value    || '').trim();
  const company      = (document.getElementById('intake-company-input')?.value || '').trim();
  const date_applied = (document.getElementById('intake-date-input')?.value    || '').trim();

  const btn = document.getElementById('intake-confirm-btn');
  if (btn) btn.disabled = true;

  try {
    await llmFetch('/api/confirm-intake', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({role, company, date_applied}),
    });
  } catch (_e) { /* non-fatal */ }

  document.getElementById('intake-confirm-card')?.remove();
  await _proceedAfterIntake(continuation);
}

async function _skipIntakeCard(continuation = null) {
  document.getElementById('intake-confirm-card')?.remove();
  await _proceedAfterIntake(continuation);
}

async function _proceedAfterIntake(continuation = null) {
  const effectiveContinuation =
    (typeof continuation === 'function' && continuation)
    || _pendingPostIntakeContinuation
    || (async () => analyzeJob());

  try {
    const res  = await llmFetch('/api/prior-clarifications');
    const data = await res.json();
    if (data.found && data.matches && data.matches.length > 0) {
      const best = data.matches[0];
      _pendingPostIntakeContinuation = effectiveContinuation;
      await _offerPriorClarifications(best);
      return;
    }
  } catch (_e) { /* fall through */ }

  _pendingPostIntakeContinuation = null;
  await effectiveContinuation();
}

async function _offerPriorClarifications(match) {
  const roleName = escapeHtml(match.role || match.position_name || 'a similar role');
  const bannerHtml = `
    <div class="prior-clarifications-banner" id="prior-clar-banner" role="status">
      <div class="pcb-text">
        💡 Found prior answers from <span class="pcb-role">${roleName}</span>.
        Load them as defaults for the clarification questions?
      </div>
      <button class="btn-secondary" onclick="_dismissPriorClarifications()" type="button">No thanks</button>
      <button class="btn-primary"   onclick="_loadPriorClarifications()" type="button" id="pcb-load-btn">Load defaults</button>
    </div>`;
  appendRawHtml(bannerHtml);

  window._pendingPriorAnswers = match.answers || {};
}

async function _dismissPriorClarifications() {
  document.getElementById('prior-clar-banner')?.remove();
  delete window._pendingPriorAnswers;
  const continuation = _pendingPostIntakeContinuation || (async () => analyzeJob());
  _pendingPostIntakeContinuation = null;
  await continuation();
}

async function _loadPriorClarifications() {
  document.getElementById('prior-clar-banner')?.remove();
  const answers = window._pendingPriorAnswers || {};
  delete window._pendingPriorAnswers;
  if (typeof questionAnswers === 'object' && questionAnswers !== null) {
    Object.assign(questionAnswers, answers);
  } else {
    window.questionAnswers = Object.assign({}, answers);
  }
  const continuation = _pendingPostIntakeContinuation || (async () => analyzeJob());
  _pendingPostIntakeContinuation = null;
  await continuation();
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  _handleLLMMessage,
  _messageHandlers,
  sendMessage,
  _showIntakeConfirmCard,
  _submitIntakeCard,
  _skipIntakeCard,
  _proceedAfterIntake,
  _offerPriorClarifications,
  _dismissPriorClarifications,
  _loadPriorClarifications,
};
