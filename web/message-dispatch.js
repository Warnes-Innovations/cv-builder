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

let _pendingPostIntakeContinuation = null;

// ---------------------------------------------------------------------------
// Default LLM message handler
// ---------------------------------------------------------------------------

async function _handleLLMMessage(text) {
  setLoading(true, 'Thinking…');
  try {
    const res = await llmFetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = parseMessageResponse(await res.json());

    if (data.error) {
      const errorMsg = data.error.toString();
      appendRetryMessage('❌ Error: ' + errorMsg, () => {
        document.getElementById('message-input').value = text;
        sendMessage();
      });
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
        appendMessage('system', `⚠️ I encountered an issue processing that response: ${err.message}. The conversation has been saved.`);
      }
    }
  } catch (error) {
    log.error('=== MESSAGE ERROR ===', error.name, error.message, error.stack);
    if (error.name === 'AbortError') {
      // user clicked Stop — message already shown in abortCurrentRequest()
    } else if (error instanceof TypeError) {
      appendRetryMessage(`⚠️ Cannot reach the server — is it still running? (${error.message})`, () => {
        document.getElementById('message-input').value = text; sendMessage();
      });
    } else if (error instanceof SyntaxError) {
      appendRetryMessage(`⚠️ The server returned an unexpected response: ${error.message}`, () => {
        document.getElementById('message-input').value = text; sendMessage();
      });
    } else {
      appendRetryMessage('⚠️ ' + error.message, () => {
        document.getElementById('message-input').value = text; sendMessage();
      });
    }
  }
  setLoading(false);
  await fetchStatus();
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
        const data = parseMessageResponse(await res.json());
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
