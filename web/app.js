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

async function init() {
  // Initialize abort controller to null (set to new AbortController by setLoading(true))
  window._currentAbortController = null;

  // Flush any messages that were queued before DOMContentLoaded (defensive — should be empty in practice).
  _flushMessageQueue();

  // Show loading message
  appendMessage('system', '🔄 Connecting to CV Builder...');

  const hasActiveSession = await ensureSessionContext();
  if (!hasActiveSession) {
    setupEventListeners();
    return;
  }

  // Restore session state first
  await restoreSession();

  // Restore ATS badge from cached score (if any)
  updateAtsBadge(stateManager.getAtsScore());

  // Initialize the rest
  await fetchStatus();
  if (currentTab === 'job') await populateJobTab();
  setupEventListeners();

  // Set up periodic state saving
  setInterval(saveTabData, 5000); // Save every 5 seconds

  // Save state before page unload
  window.addEventListener('beforeunload', () => {
    saveTabData();
    if (sessionId) {
      localStorage.setItem(StorageKeys.SESSION_ID, sessionId);
    }
  });

  // Auto-analyze job if loaded but not analyzed (only if not reconnecting)
  if (!isReconnecting) {
    const status = await getStatus();
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
  document.getElementById('layout-btn').addEventListener('click', completeLayoutReview);
  document.getElementById('finalise-action-btn').addEventListener('click', () => switchTab('finalise'));
  document.getElementById('reset-btn').addEventListener('click', resetSession);
}

// CJS export shim — no-op in browsers (module is undefined).
// Re-exports from canonical module files so existing tests continue to pass.
// NOTE: require() on ES-module files works only under Vitest's transform pipeline.
//       Do not run these tests with plain Node.js (no bundler/transform).
if (typeof module !== 'undefined') {
  /* eslint-disable global-require */
  const _sm  = require('./session-manager.js');
  const _ja  = require('./job-analysis.js');
  const _ach = require('./achievements-review.js');
  const _ws  = require('./workflow-steps.js');
  /* eslint-enable global-require */
  module.exports = {
    buildSessionSwitcherLabel:                   _sm.buildSessionSwitcherLabel,
    getActiveSessionOwnershipMeta:               _sm.getActiveSessionOwnershipMeta,
    extractStructuredQuestionsFromAssistantText: _ja.extractStructuredQuestionsFromAssistantText,
    saveSuggestedAchievementField:               _ach.saveSuggestedAchievementField,
    moveSuggestedAchievementRow:                 _ach.moveSuggestedAchievementRow,
    deleteSuggestedAchievement:                  _ach.deleteSuggestedAchievement,
    showBulletReorder:                           _ws.showBulletReorder,
    init,
    setupEventListeners,
  };
}
