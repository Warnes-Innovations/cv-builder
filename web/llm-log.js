// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/llm-log.js
 * Fetches raw LLM interaction log entries from /api/llm-log and displays
 * them in the Conversation panel as collapsible transcript entries.
 *
 * Each LLM call shows:
 *   - Header: timestamp and message-count summary
 *   - Prompt section: all messages sent (role-prefixed), collapsible when long
 *   - Response section: raw LLM response, collapsible when long
 *
 * DEPENDENCIES (globalThis):
 *   - appendMessageHtml  (message-queue.js)
 *   - getSessionIdFromURL (api-client.js)
 */

import { getLogger } from './logger.js';
import { escapeHtml } from './utils.js';
import { getSessionIdFromURL } from './api-client.js';

const log = getLogger('llm-log');

// Cursor tracks the next index to fetch from /api/llm-log.
// Increment after each successful fetch by `total` returned from the server.
let _llmLogCursor = 0;

/** Reset the cursor to 0 (call when a new session is loaded). */
function resetLlmLogCursor() {
  _llmLogCursor = 0;
}

// ---------------------------------------------------------------------------
// Collapsible HTML builder (mirrors _makeCollapsibleContent in message-queue.js)
// ---------------------------------------------------------------------------

const _LOG_COLLAPSE_LINES = 8;
const _LOG_COLLAPSE_CHARS = 480;

/**
 * Wrap `text` in a collapsible <pre> block when it exceeds the threshold.
 * Returns an HTML string ready for insertion via innerHTML.
 */
function _collapsiblePre(text) {
  const escaped = escapeHtml(text);
  const lines   = text.split('\n');

  if (lines.length <= _LOG_COLLAPSE_LINES && text.length <= _LOG_COLLAPSE_CHARS) {
    return `<pre class="llm-log-text">${escaped}</pre>`;
  }

  const previewText = lines.slice(0, _LOG_COLLAPSE_LINES).join('\n');
  const overflow    = lines.length - _LOG_COLLAPSE_LINES;
  const id          = `llmlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const label       = `Show ${overflow} more line${overflow === 1 ? '' : 's'}…`;

  return `
    <pre class="llm-log-text msg-preview" id="${id}-preview">${escapeHtml(previewText)}…</pre>
    <pre class="llm-log-text msg-full"    id="${id}-full" style="display:none">${escaped}</pre>
    <button class="msg-toggle-btn" type="button"
      onclick="(function(btn){
        var p=document.getElementById('${id}-preview'),
            f=document.getElementById('${id}-full');
        if(f.style.display==='none'){
          p.style.display='none'; f.style.display='block'; btn.textContent='Show less';
        } else {
          p.style.display=''; f.style.display='none'; btn.textContent='${label}';
        }
      })(this)">${label}</button>`;
}

// ---------------------------------------------------------------------------
// Render one interaction into the conversation panel
// ---------------------------------------------------------------------------

function _renderInteraction(ix) {
  const conversation = document.getElementById('conversation');
  if (!conversation) return;

  const ts = ix.timestamp
    ? new Date(ix.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  const msgs     = Array.isArray(ix.messages) ? ix.messages : [];
  const msgCount = msgs.length;

  // Build formatted prompt text: each message on its own labelled block
  const promptText = msgs
    .map(m => `[${(m.role || 'unknown').toUpperCase()}]\n${m.content || ''}`)
    .join('\n\n──────────\n\n');

  const responseText = typeof ix.response === 'string' ? ix.response : '';

  const html = `
    <div class="llm-log-header">
      <span class="llm-log-icon">🤖</span>
      <span class="llm-log-label">AI Model Interaction</span>
      <span class="llm-log-meta">${msgCount} message${msgCount === 1 ? '' : 's'}</span>
      ${ts ? `<span class="llm-log-ts">${escapeHtml(ts)}</span>` : ''}
    </div>
    <div class="llm-log-section">
      <div class="llm-log-section-label">Prompt</div>
      ${_collapsiblePre(promptText)}
    </div>
    <div class="llm-log-section">
      <div class="llm-log-section-label">Response</div>
      ${_collapsiblePre(responseText)}
    </div>`;

  const message = document.createElement('div');
  message.className = 'message llm-raw';
  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = html;
  message.appendChild(content);
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch LLM interaction log entries added since the last call and display
 * each one in the Conversation panel.  Safe to call after every backend
 * operation that may trigger LLM calls.
 */
async function fetchAndDisplayLlmLog() {
  const sessionId = getSessionIdFromURL();
  if (!sessionId) return;

  try {
    const res = await fetch(
      `/api/llm-log?session_id=${encodeURIComponent(sessionId)}&since=${_llmLogCursor}`,
    );
    if (!res.ok) {
      log.warn('llm-log fetch failed', res.status);
      return;
    }
    const data         = await res.json();
    const interactions = Array.isArray(data.interactions) ? data.interactions : [];

    for (const ix of interactions) {
      _renderInteraction(ix);
    }

    // Advance cursor to the new total so the next call fetches only new entries.
    if (typeof data.total === 'number') {
      _llmLogCursor = data.total;
    }
  } catch (err) {
    log.error('fetchAndDisplayLlmLog error:', err);
  }
}

export { fetchAndDisplayLlmLog, resetLlmLogCursor };
