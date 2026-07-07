// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/session-actions.js
 * Session-level dispatch (sendAction), save, and position title updates.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - stateManager (state-manager.js — isLoading()/setTabData())
 *   - userSelections (window global from app)
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

import { getLogger } from './logger.js';
const log = getLogger('session-actions');

import { StorageKeys } from './api-client.js';
import { stateManager } from './state-manager.js';

/** Maps action identifiers to human-readable LLM status bar labels. */
const _ACTION_LABELS = {
  analyze_job:              'Analysing job description…',
  recommend_customizations: 'Generating customisation recommendations…',
  generate_cv:              'Generating CV files…',
};

async function sendAction(action) {
  if (stateManager.isLoading()) return;

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
            const total = progress.length;
            const doneCount = progress.filter(p => p.status === 'complete').length;
            const active = progress.find(p => p.status !== 'complete');
            const stepLabel = active
              ? `${active.step.replace(/_/g, ' ')} (${doneCount + 1} of ${total})`
              : `${total} of ${total} complete`;
            if (typeof _updateLLMStatusBar === 'function') {
              _updateLLMStatusBar(true, `Generating CV: ${stepLabel}…`);
            }
            const steps = progress.map(p =>
              `${p.status === 'complete' ? '✓' : '⏳'} ${p.step.replace(/_/g, ' ')} ${p.elapsed_ms ? `(${p.elapsed_ms}ms)` : ''}`
            ).join(' • ');
            if (generationMsg) generationMsg.querySelector('.content').textContent = `Generating CV: ${steps}`;
          }
          if (progress.every(p => p.status === 'complete') && progress.length > 0) break;
        } catch (_e) { /* polling error — continue */ }
      }
      appendMessage('assistant', 'CV generated successfully! Review your layout below.');
      stateManager.setTabData('cv', data.result);
      refreshAtsScore('post_generation');
      switchTab('layout');
    } else {
      appendMessage('assistant', data.result);
    }
  } catch (error) {
    log.error('=== SEND ACTION ERROR ===', action, error);
    removeLoadingMessage(loadingMsg);
    if (error.name !== 'AbortError') {
      appendRetryMessage('❌ Error: ' + error.message, () => sendAction(action));
    }
  }

  setLoading(false);
  await fetchStatus();
  if (typeof fetchAndDisplayLlmLog === 'function') fetchAndDisplayLlmLog();
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
    log.error('=== SAVE SESSION ERROR ===', error);
    appendRetryMessage('❌ Error: ' + error.message, saveSession);
  }
}

/** Return "Last edited Xm/Xh/Xd ago" for a session's last_modified ISO string.
 *  Returns '' when the session is actively in use (< 5 min) or very old (> 14 days). */
function _formatSessionAge(isoStr) {
  if (!isoStr) return '';
  const then = new Date(isoStr);
  if (isNaN(then)) return '';
  const diffMins = Math.floor((Date.now() - then.getTime()) / 60_000);
  if (diffMins < 5)    return '';   // actively in use — don't clutter the bar
  if (diffMins < 60)   return `Last edited ${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24)      return `Last edited ${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1)     return 'Last edited yesterday';
  if (diffD < 14)      return `Last edited ${diffD}d ago`;
  return '';   // older sessions show no indicator
}

function _formatBarDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-');
    return `${month}/${day}/${year}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return text;
}

function updatePositionTitle(status = {}) {
  const positionEl = document.getElementById('position-title');
  if (!positionEl) return;

  const fallbackBrowserTitle = 'CV Builder — Professional Web UI';
  let label = (status.position_name || '').toString().trim();
  let company = '';
  let dateApplied = '';

  if (!label && status.job_analysis) {
    try {
      const analysis = typeof status.job_analysis === 'string'
        ? JSON.parse(cleanJsonResponse(status.job_analysis))
        : status.job_analysis;
      const title = analysis?.job_title || analysis?.title || analysis?.position_name || '';
      label = normalizePositionLabel(title, analysis?.company);
      company = (analysis?.company_name || analysis?.company || '').trim();
      dateApplied = _formatBarDate(analysis?.date_applied || analysis?.application_date || '');
    } catch (error) {
      log.warn('Failed to parse job_analysis for title:', error);
    }
  }

  if (!label && status.job_description_text) {
    const parsed = extractTitleAndCompanyFromJobText(status.job_description_text);
    label = normalizePositionLabel(parsed.title, parsed.company);
    if (!company) company = (parsed.company || '').trim();
  }

  positionEl.textContent = label;
  document.title = label ? `${label} — CV Builder` : fallbackBrowserTitle;

  const positionCompanyEl = document.getElementById('position-company');
  if (positionCompanyEl) {
    const intake = window._statusIntake || {};
    const finalCompany = (intake.company || '').trim() || company;
    const finalDate = dateApplied || _formatBarDate(intake.date_applied || '');
    const subtitle = [finalCompany, finalDate].filter(Boolean).join('  ·  ');
    positionCompanyEl.textContent = subtitle;
    positionCompanyEl.style.display = subtitle ? '' : 'none';
  }

  const renameBtn = document.getElementById('rename-session-btn');
  if (renameBtn) renameBtn.style.display = label ? '' : 'none';
  if (typeof _updateSessionSwitcherHeader === 'function') {
    _updateSessionSwitcherHeader({ position_name: label, phase: status.phase || null });
  }

  // Session age indicator — "Last edited Xh ago" when returning to a session
  let ageEl = document.getElementById('position-session-age');
  if (!ageEl && positionCompanyEl?.parentElement) {
    ageEl = document.createElement('div');
    ageEl.id = 'position-session-age';
    ageEl.className = 'position-subtitle position-session-age';
    positionCompanyEl.parentElement.appendChild(ageEl);
  }
  if (ageEl) {
    const ageText = _formatSessionAge(status.session_last_modified);
    ageEl.textContent = ageText;
    ageEl.style.display = ageText ? '' : 'none';
  }
}

// ── ES module exports ──────────────────────────────────────────────────────
export { sendAction, saveSession, updatePositionTitle, _formatSessionAge, _ACTION_LABELS };
