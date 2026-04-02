// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

// Orchestrator entry-point — all module functions are exposed as globals by bundle.js.
// Note: app.js is a plain legacy script (not bundled). loglevel is available
// via globalThis.loglevel (set by bundle.js which includes web/logger.js).
const _appLog = (typeof loglevel !== 'undefined') ? loglevel.getLogger('app') : console;
// This file contains only init() and top-level event-wiring (≤ 300 lines).

let _listenersRegistered = false;

function _setConnectionMessage(messageNode, text, kind = 'info') {
  if (!messageNode) return;
  const content = messageNode.querySelector('.content');
  if (!content) return;
  content.textContent = text;
  content.style.display = 'inline-block';
  content.style.padding = '6px 10px';
  content.style.borderRadius = '999px';
  content.style.fontWeight = '600';
  content.style.fontSize = '0.88em';
  content.style.border = '1px solid #cbd5e1';
  if (kind === 'success') {
    content.style.color = '#166534';
    content.style.background = '#ecfdf5';
    content.style.borderColor = '#86efac';
  } else if (kind === 'error') {
    content.style.color = '#b91c1c';
    content.style.background = '#fef2f2';
    content.style.borderColor = '#fecaca';
  } else {
    content.style.color = '#1e40af';
    content.style.background = '#eff6ff';
    content.style.borderColor = '#bfdbfe';
  }
}

async function init() {
  // Initialize abort controller to null (set to new AbortController by setLoading(true))
  window._currentAbortController = null;

  // Flush any messages that were queued before DOMContentLoaded (defensive — should be empty in practice).
  _flushMessageQueue();

  const hasActiveSession = await ensureSessionContext();
  if (!hasActiveSession) {
    const failedMessage = appendMessage('system', '⚠️ Could not establish a session. Create or load a session to continue.');
    _setConnectionMessage(failedMessage, '⚠️ Could not establish a session. Create or load a session to continue.', 'error');
    setupEventListeners();
    return;
  }

  // Restore session state first
  await restoreSession();

  // Show connection status after restoreSession so it is not removed by history restore.
  const connectionMessage = appendMessage('system', '🔄 Connecting to CV Builder...');
  _setConnectionMessage(connectionMessage, '🔄 Connecting to CV Builder...', 'info');

  // Restore ATS badge from cached score (if any)
  updateAtsBadge(stateManager.getAtsScore());

  // Initialize the rest
  await fetchStatus();
  const connectedMessage = appendMessage('system', '✅ Connection successful.');
  _setConnectionMessage(connectedMessage, '✅ Connection successful.', 'success');
  if (stateManager.getCurrentTab() === 'job') await populateJobTab();
  setupEventListeners();

  // Set up periodic state saving
  setInterval(saveTabData, 5000); // Save every 5 seconds

  // Save state before page unload
  window.addEventListener('beforeunload', () => {
    saveTabData();
    const activeSessionId = stateManager.getSessionId();
    if (activeSessionId) {
      localStorage.setItem(StorageKeys.SESSION_ID, activeSessionId);
    }
  });

  // Auto-analyze job if loaded but not analyzed (only if not reconnecting)
  if (!stateManager.isReconnecting()) {
    const status = await fetchStatus();
    if (!status._error && status.job_description && !status.job_analysis) {
      appendMessage('system', 'Auto-analyzing loaded job description...');
      await analyzeJob();

      // Don't auto-recommend - let user answer questions first
      // User will type "proceed" when ready for recommendations
    } else if (status.job_analysis) {
      _appLog.info('Job analysis already complete, skipping auto-analysis');
    }
  } else {
    _appLog.info('Reconnecting to existing session, skipping auto-analysis');
  }
}

function setupEventListeners() {
  if (_listenersRegistered) return;
  _listenersRegistered = true;

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Message sending
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Action buttons — one per workflow stage
  document.getElementById('analyze-btn').addEventListener('click', analyzeJob);
  document.getElementById('recommend-btn').addEventListener('click', () => sendAction('recommend_customizations'));
  document.getElementById('generate-btn').addEventListener('click', async () => {
    // Check if we need to sync review decisions to backend before generating CV
    if (userSelections && (Object.keys(userSelections.experiences).length > 0 || Object.keys(userSelections.skills).length > 0)) {
      appendMessage('system', 'Applying your review decisions...');
      // Decisions were already submitted via submitExperienceDecisions/submitSkillDecisions
      // Backend has them in conversation.state['experience_decisions'] and ['skill_decisions']
    }
    await fetchAndReviewRewrites();
  });
  document.getElementById('rewrite-btn').addEventListener('click', submitRewriteDecisions);
  document.getElementById('spell-btn').addEventListener('click', submitSpellCheckDecisions);
  document.getElementById('generate-proceed-btn').addEventListener('click', () => switchTab('layout'));
  document.getElementById('layout-btn').addEventListener('click', handleLayoutPrimaryAction);
  document.getElementById('finalise-action-btn').addEventListener('click', () => switchTab('finalise'));
}

// Tests now import helper functions from their canonical ES modules directly.
