// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/message-queue.js
 * Conversation message appending, loading messages, and the pre-DOM buffer
 * queue that holds messages emitted before #conversation exists.
 *
 * DEPENDENCIES:
 *   - cleanJsonResponse, escapeHtml from utils.js
 *   - sendMessage from message-dispatch.js (on globalThis, for inline buttons)
 */

import { getLogger } from './logger.js';
import { cleanJsonResponse, escapeHtml } from './utils.js';
const log = getLogger('message-queue');

// Buffer for messages emitted before the #conversation div exists.
// Flushed at the start of init() once the DOM is fully ready.
const _messageQueue = [];

function _flushMessageQueue() {
  while (_messageQueue.length) {
    const { type, text } = _messageQueue.shift();
    appendMessage(type, text);
  }
}

function appendLoadingMessage(text) {
  const conversation = document.getElementById('conversation');
  const message = document.createElement('div');
  message.className = 'message system';
  const content = document.createElement('div');
  content.className = 'content loading-message';
  content.innerHTML = `<div class="loading-spinner"></div><span>${text}</span>`;
  message.appendChild(content);
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function removeLoadingMessage(messageElement) {
  if (messageElement && messageElement.parentNode) {
    messageElement.parentNode.removeChild(messageElement);
  }
}

/** Restores a previously-saved message whose content is already HTML (saved via innerHTML). */
function appendMessageHtml(type, html) {
  const conversation = document.getElementById('conversation');
  const message = document.createElement('div');
  message.className = `message ${type}`;
  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = html;
  message.appendChild(content);
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
}

// ---------------------------------------------------------------------------
// Collapsible long-content helper
// ---------------------------------------------------------------------------

const COLLAPSE_LINE_THRESHOLD = 8;  // lines before collapsing
const COLLAPSE_CHAR_THRESHOLD = 480; // chars before collapsing

/**
 * Wrap rendered HTML in a collapsible container when the content exceeds the
 * threshold, showing the first few lines with a toggle button.
 */
function _makeCollapsibleContent(html, textStr) {
  const lines = textStr.split('\n');
  if (lines.length <= COLLAPSE_LINE_THRESHOLD && textStr.length <= COLLAPSE_CHAR_THRESHOLD) {
    return { html, collapsible: false };
  }

  // Build preview: first COLLAPSE_LINE_THRESHOLD lines worth of escaped text
  const previewLines = lines.slice(0, COLLAPSE_LINE_THRESHOLD);
  const previewHtml = escapeHtml(previewLines.join('\n'))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  const overflow = lines.length - COLLAPSE_LINE_THRESHOLD;
  const id = `collapsible-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const wrapped = `
    <div class="msg-preview" id="${id}-preview">${previewHtml}</div>
    <div class="msg-full" id="${id}-full" style="display:none">${html}</div>
    <button class="msg-toggle-btn" onclick="(function(btn){
      var p=document.getElementById('${id}-preview'),
          f=document.getElementById('${id}-full');
      if(f.style.display==='none'){
        p.style.display='none'; f.style.display='block'; btn.textContent='Show less';
      } else {
        p.style.display=''; f.style.display='none'; btn.textContent='Show ${overflow} more line${overflow === 1 ? '' : 's'}…';
      }
    })(this)" type="button">Show ${overflow} more line${overflow === 1 ? '' : 's'}…</button>`;

  return { html: wrapped, collapsible: true };
}

function appendMessage(type, text) {
  const conversation = document.getElementById('conversation');
  if (!conversation) {
    // DOM not ready yet — buffer until _flushMessageQueue() is called from init()
    _messageQueue.push({ type, text });
    return null;
  }
  const message = document.createElement('div');
  message.className = `message ${type}`;
  const content = document.createElement('div');
  content.className = 'content';

  // Simple markdown rendering: convert **text** to <strong> and preserve newlines
  const textStr = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  const renderedHtml = escapeHtml(textStr)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  // Apply collapsible wrapper for long user/assistant messages
  if (type === 'user' || type === 'assistant') {
    const { html, collapsible } = _makeCollapsibleContent(renderedHtml, textStr);
    content.innerHTML = html;
    if (collapsible) content.classList.add('collapsible-msg');
  } else {
    content.innerHTML = renderedHtml;
  }
  message.appendChild(content);

  // Check if message ends with response options like (yes/no/maybe)
  const optionsMatch = textStr.match(/\(([^)]+\/[^)]+)\)\s*$/);
  if (optionsMatch && type === 'assistant') {
    const options = optionsMatch[1].split('/').map(opt => opt.trim());
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;';
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.className = 'action-btn';
      btn.style.cssText = 'padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;';
      btn.onclick = () => {
        document.getElementById('message-input').value = option;
        if (typeof sendMessage === 'function') sendMessage();
      };
      buttonContainer.appendChild(btn);
    });
    message.appendChild(buttonContainer);
  }

  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

/**
 * Appends a system error message with an optional Retry button.
 * @param {string}   text       - Error message text (supports **bold** markdown)
 * @param {Function} [retryFn]  - Called when Retry is clicked; omit for non-retryable errors
 * @param {string}   [retryLabel] - Retry button label (default 'Retry')
 */
function appendRetryMessage(text, retryFn, retryLabel = 'Retry', cancelFn = null) {
  const conversation = document.getElementById('conversation');
  const message = document.createElement('div');
  message.className = 'message system';
  const content = document.createElement('div');
  content.className = 'content';
  const escaped = escapeHtml(text);
  content.innerHTML = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  message.appendChild(content);
  if (typeof retryFn === 'function') {
    const btn = document.createElement('button');
    btn.textContent = retryLabel;
    btn.style.cssText = 'margin-top:8px;padding:6px 14px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;display:inline-block;margin-right:8px;';
    btn.onclick = () => { message.remove(); retryFn(); };
    message.appendChild(btn);
  }
  if (typeof cancelFn === 'function') {
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Stop retries';
    cancelBtn.style.cssText = 'margin-top:8px;padding:6px 14px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;display:inline-block;';
    cancelBtn.onclick = () => { message.remove(); cancelFn(); };
    message.appendChild(cancelBtn);
  }
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function appendFormattedAnalysis(result) {
  try {
    const cleanResult = cleanJsonResponse(result);
    const data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;

    if (data && typeof data === 'object' && (data.title || data.required_skills)) {
      const conversation = document.getElementById('conversation');
      const message = document.createElement('div');
      message.className = 'message assistant';
      const content = document.createElement('div');
      content.className = 'content job-analysis';

      let html = '<h3>📋 Job Analysis Complete</h3>';
      if (data.title)  html += `<p><strong>Position:</strong> ${data.title} at ${data.company || 'Company'}</p>`;
      if (data.domain) html += `<p><strong>Domain:</strong> ${data.domain}</p>`;

      if (data.required_skills?.length) {
        html += '<h4>🎯 Required Skills:</h4><ul>';
        data.required_skills.forEach(s => { html += `<li>${s}</li>`; });
        html += '</ul>';
      }
      if (data.preferred_skills?.length) {
        html += '<h4>⭐ Preferred Skills:</h4><ul>';
        data.preferred_skills.forEach(s => { html += `<li>${s}</li>`; });
        html += '</ul>';
      }
      if (data.nice_to_have_requirements?.length) {
        html += '<h4>✨ Nice to Have:</h4><ul>';
        data.nice_to_have_requirements.forEach(r => { html += `<li>${r}</li>`; });
        html += '</ul>';
      }
      if (data.ats_keywords?.length) {
        html += '<h4>🔑 ATS Keywords:</h4><p style="line-height: 2;">';
        data.ats_keywords.forEach(kw => {
          html += `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:4px;padding:2px 8px;margin:2px;font-size:0.85em;">${kw}</span>`;
        });
        html += '</p>';
      }

      content.innerHTML = html;
      message.appendChild(content);
      conversation.appendChild(message);
      conversation.scrollTop = conversation.scrollHeight;
    } else {
      appendMessage('assistant', result);
    }
  } catch (e) {
    log.error('Analysis display error:', e);
    appendMessage('assistant', result);
  }
}

function appendFormattedResponse(response) {
  try {
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    if (data && typeof data === 'object' && (data.title || data.required_skills)) {
      appendFormattedAnalysis(response);
    } else {
      appendMessage('assistant', response);
    }
  } catch (e) {
    appendMessage('assistant', response);
  }
}

// appendRawHtml is needed by message-dispatch; defined here since it uses the
// conversation element pattern.
function appendRawHtml(html) {
  const conversation = document.getElementById('conversation');
  if (!conversation) return;
  conversation.insertAdjacentHTML('beforeend', html);
  conversation.scrollTop = conversation.scrollHeight;
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  _messageQueue, _flushMessageQueue,
  appendLoadingMessage, removeLoadingMessage,
  appendMessageHtml, appendMessage,
  appendRetryMessage,
  appendFormattedAnalysis, appendFormattedResponse,
  appendRawHtml,
};
