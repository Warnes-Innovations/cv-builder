// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/session-actions.js
 * Session-level dispatch (sendAction), save/reset, and position title updates.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - isLoading, tabData, userSelections (state globals from state-manager + app)
 *   - appendLoadingMessage, removeLoadingMessage, appendMessage, appendRetryMessage
 *   - setLoading, llmFetch (fetch-utils.js)
 *   - parseMessageResponse, parseStatusResponse (validators.js)
 *   - handleCustomizationResponse (review-table-base.js, Tier 4)
 *   - refreshAtsScore, switchTab, fetchStatus (globalThis)
 *   - clearState, StorageKeys (state-manager.js / api-client.js)
 *   - showLoadJobPanel, clearJobInput, clearURLInput, _clearFieldError,
 *     _updatePasteCharCount (job-input.js, Tier 3)
 *   - normalizePositionLabel, extractTitleAndCompanyFromJobText,
 *     cleanJsonResponse (utils.js)
 *   - _updateSessionSwitcherHeader (session-switcher-ui.js, Tier 7)
 */

/** Maps action identifiers to human-readable LLM status bar labels. */
const _ACTION_LABELS = {
  analyze_job:              'Analysing job description…',
  recommend_customizations: 'Generating customisation recommendations…',
  generate_cv:              'Generating CV files…',
};

async function sendAction(action) {
  if (isLoading) return;

  const loadingMsg = appendLoadingMessage(`Executing ${action}...`);
  setLoading(true, _ACTION_LABELS[action] || `${action.replace(/_/g, ' ')}…`);

  try {
    const payload = { action };
    if (action === 'recommend_customizations' && window.questionAnswers) {
      payload.user_preferences = window.questionAnswers;
    }

    const res = await llmFetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = parseMessageResponse(await res.json());

    removeLoadingMessage(loadingMsg);

    if (data.error) {
      appendRetryMessage('❌ Error: ' + data.error, () => sendAction(action));
    } else if (action === 'recommend_customizations') {
      const customizationData = data.result?.context_data?.customizations ?? data.result;
      await handleCustomizationResponse(customizationData);
    } else if (action === 'generate_cv') {
      const generationMsg = appendMessage('assistant', '⏳ Generating CV files (ATS DOCX → HTML → Human DOCX)...');
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
          const statusRes  = await fetch('/api/status');
          const statusData = parseStatusResponse(await statusRes.json());
          const progress   = statusData.generation_progress || [];
          if (progress.length > 0) {
            const steps = progress.map(p =>
              `${p.status === 'complete' ? '✓' : '⏳'} ${p.step.replace(/_/g, ' ')} ${p.elapsed_ms ? `(${p.elapsed_ms}ms)` : ''}`
            ).join(' • ');
            if (generationMsg) generationMsg.querySelector('.content').textContent = `Generating CV: ${steps}`;
          }
          if (progress.every(p => p.status === 'complete') && progress.length > 0) break;
        } catch (_e) { /* polling error — continue */ }
      }
      appendMessage('assistant', 'CV generated successfully! Review your layout below.');
      tabData.cv = data.result;
      refreshAtsScore('post_generation');
      switchTab('layout');
    } else {
      appendMessage('assistant', data.result);
    }
  } catch (error) {
    console.error('=== SEND ACTION ERROR ===', action, error);
    removeLoadingMessage(loadingMsg);
    if (error.name !== 'AbortError') {
      appendRetryMessage('❌ Error: ' + error.message, () => sendAction(action));
    }
  }

  setLoading(false);
  await fetchStatus();
}

async function saveSession() {
  try {
    const res  = await fetch('/api/save', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      if (data.session_file) localStorage.setItem(StorageKeys.SESSION_PATH, data.session_file);
      appendMessage('system', 'Session saved successfully.');
    } else {
      appendRetryMessage('❌ Error saving session: ' + data.error, saveSession);
    }
  } catch (error) {
    console.error('=== SAVE SESSION ERROR ===', error);
    appendRetryMessage('❌ Error: ' + error.message, saveSession);
  }
}

async function resetSession() {
  try {
    const res  = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Reset failed (${res.status})`);

    clearState();
    userSelections = { experiences: {}, skills: {} };
    window.postAnalysisQuestions = [];
    window.questionAnswers       = {};
    window.pendingRecommendations = null;
    window._savedDecisions       = {};
    window._newSkillsFromLLM     = [];
    window._activeReviewPane     = 'experiences';
    if (typeof _pendingUploadFile !== 'undefined') _pendingUploadFile = null;

    document.getElementById('conversation').innerHTML = '';
    await fetchStatus();
    await showLoadJobPanel();
    clearJobInput();
    clearURLInput();
    _clearFieldError('job-text-input', 'paste-error');
    _clearFieldError('job-url-input', 'url-error');
    _updatePasteCharCount();
  } catch (error) {
    console.error('=== RESET SESSION ERROR ===', error);
    appendMessage('system', 'Error: ' + error.message);
  }
}

function updatePositionTitle(status = {}) {
  const positionEl = document.getElementById('position-title');
  if (!positionEl) return;

  const fallbackBrowserTitle = 'CV Generator — Professional Web UI';
  let label = (status.position_name || '').toString().trim();

  if (!label && status.job_analysis) {
    try {
      const analysis = typeof status.job_analysis === 'string'
        ? JSON.parse(cleanJsonResponse(status.job_analysis))
        : status.job_analysis;
      label = normalizePositionLabel(analysis?.title, analysis?.company);
    } catch (error) {
      console.warn('Failed to parse job_analysis for title:', error);
    }
  }

  if (!label && status.job_description_text) {
    const parsed = extractTitleAndCompanyFromJobText(status.job_description_text);
    label = normalizePositionLabel(parsed.title, parsed.company);
  }

  positionEl.textContent = label;
  document.title = label ? `${label} — AI CV Customizer` : fallbackBrowserTitle;
  const renameBtn = document.getElementById('rename-session-btn');
  if (renameBtn) renameBtn.style.display = label ? '' : 'none';
  if (typeof _updateSessionSwitcherHeader === 'function') {
    _updateSessionSwitcherHeader({ position_name: label, phase: status.phase || null });
  }
}

// ── ES module exports ──────────────────────────────────────────────────────
export { sendAction, saveSession, resetSession, updatePositionTitle, _ACTION_LABELS };
