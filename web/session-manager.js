// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/session-manager.js
 * Session lifecycle: create, claim, restore, save, load.
 * Also owns formatSessionPhaseLabel and related session-label helpers.
 *
 * DEPENDENCIES (all on globalThis at runtime):
 *   - createSession, fetchStatus (api-client.js)
 *   - getSessionIdFromURL, getOwnerToken, StorageKeys, getScopedTabDataStorageKey (state-manager.js)
 *   - appendMessage, appendRetryMessage (message-queue.js)
 *   - parseStatusResponse, parseRewritesResponse (validators.js)
 *   - refreshAtsScore (ats-refinement.js)
 *   - updateInclusionCounts (review-table-base.js, Tier 4)
 *   - switchTab (review-table-base.js, Tier 4)
 *   - renderRewritePanel (rewrite-review.js, Tier 6)
 *   - showOwnershipConflictDialog, openSessionsModal (session-switcher-ui.js, Tier 7)
 *   - updateActionButtons (ui-helpers.js)
 *   - updatePositionTitle (session-actions.js)
 *   - escapeHtml, SESSION_PHASE_LABELS_SHORT (utils.js)
 *   - sessionId, tabData, isReconnecting, lastKnownPhase, interactiveState,
 *     rewriteDecisions, PHASES (window globals)
 */

import { getLogger } from './logger.js';
const log = getLogger('session-manager');

import { SESSION_PHASE_LABELS_SHORT } from './utils.js';
import { PHASES, stateManager } from './state-manager.js';

// ---------------------------------------------------------------------------
// Session phase labels (abbreviated form — for compact session-switcher UI)
// Full-length labels live in utils.js SESSION_PHASE_LABELS.
// ---------------------------------------------------------------------------

function formatSessionPhaseLabel(phase) {
  if (!phase) return 'init';
  return SESSION_PHASE_LABELS_SHORT[phase] || String(phase).replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Current session identity helpers
// ---------------------------------------------------------------------------

function _getCurrentSessionIdValue() {
  if (typeof getSessionIdFromURL === 'function') {
    return getSessionIdFromURL();
  }
  try {
    return new URLSearchParams(window.location.search).get('session');
  } catch (_) {
    return null;
  }
}

function _getCurrentOwnerTokenValue() {
  if (typeof getOwnerToken === 'function') {
    return getOwnerToken();
  }
  try {
    return sessionStorage.getItem('cv-builder-owner-token');
  } catch (_) {
    return null;
  }
}

function buildSessionSwitcherLabel(status = {}) {
  const positionName = (status.position_name || '').toString().trim();
  const phase = formatSessionPhaseLabel(status.phase);
  if (positionName) {
    return `${positionName} · ${phase}`;
  }
  return _getCurrentSessionIdValue() ? `Session · ${phase}` : '📂 Sessions';
}

function getActiveSessionOwnershipMeta(session, {
  currentSessionId = _getCurrentSessionIdValue(),
} = {}) {
  if (!session || typeof session !== 'object') {
    return { label: 'Unknown', className: 'session-status-unclaimed', isCurrent: false };
  }

  const isCurrentSession = Boolean(currentSessionId) && session.session_id === currentSessionId;
  const sameOwner = Boolean(session.owned_by_requester);

  if (isCurrentSession && sameOwner) {
    return { label: 'Current tab', className: 'session-status-current', isCurrent: true };
  }
  if (sameOwner) {
    return { label: 'Owned by this tab', className: 'session-status-current', isCurrent: false };
  }
  if (session.claimed) {
    return { label: 'Owned by another tab', className: 'session-status-owned', isCurrent: false };
  }
  return { label: 'Unclaimed', className: 'session-status-unclaimed', isCurrent: false };
}

function formatSessionTimestamp(timestamp, { includeTime = true } = {}) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
  } catch (_) {
    return String(timestamp).replace('T', ' ').slice(0, includeTime ? 16 : 10);
  }
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

async function createNewSessionAndNavigate() {
  const data = await createSession();
  if (!data.session_id) throw new Error('Failed to create session');
  window.location.assign(data.redirect_url || `/?session=${data.session_id}`);
}

async function createNewSessionInNewTab() {
  const data = await createSession();
  if (!data.session_id) throw new Error('Failed to create session');
  window.open(data.redirect_url || `/?session=${data.session_id}`, '_blank', 'noopener');
}

// ---------------------------------------------------------------------------
// Session claim / ownership
// ---------------------------------------------------------------------------

async function _claimCurrentSession(sessionIdToClaim) {
  const res = await fetch('/api/sessions/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionIdToClaim,
      owner_token: getOwnerToken(),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data.ok !== false) return true;

  if (res.status === 409 && data.error === 'session_owned') {
    const action = await showOwnershipConflictDialog(
      'This session is currently claimed by another browser tab. You can take it over, start a new session, or load a different one.'
    );
    if (action === 'new') {
      await createNewSessionAndNavigate();
      return false;
    }
    if (action !== 'takeover') {
      showSessionsLandingPanel('Select a different session or create a new one.');
      openSessionsModal();
      return false;
    }

    const takeoverRes = await fetch('/api/sessions/takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionIdToClaim,
        owner_token: getOwnerToken(),
      }),
    });
    const takeoverData = await takeoverRes.json().catch(() => ({}));
    if (!takeoverRes.ok) {
      throw new Error(takeoverData.error || 'Failed to take over session');
    }
    return true;
  }

  if (res.status === 404 || data.error === 'session_not_found') {
    showSessionsLandingPanel('That session is no longer active. Load it from disk or create a new one.');
    openSessionsModal();
    return false;
  }

  throw new Error(data.error || `Failed to claim session (${res.status})`);
}

// ---------------------------------------------------------------------------
// Session navigation from landing page
// ---------------------------------------------------------------------------

async function openSavedSessionFromLanding(path) {
  try {
    await loadSessionFile(path);
  } catch (error) {
    appendMessage('system', `❌ Could not load session: ${error.message}`);
  }
}

function openActiveSessionFromLanding(sessionIdToOpen) {
  if (!sessionIdToOpen) return;
  window.location.assign(`/?session=${encodeURIComponent(sessionIdToOpen)}`);
}

function showSessionsLandingPanel(message = '') {
  stateManager.setCurrentTab('job');
  stateManager.setPhase(PHASES.INIT);
  updateActionButtons('job');
  updatePositionTitle({});

  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <div class="session-switcher-landing-shell">
      <div class="session-switcher-landing-header">
        <div class="session-switcher-landing-copy">
          <h2>Select a Session</h2>
          <p>Each browser tab now works against its own URL-scoped session.</p>
        </div>
        <div class="session-switcher-landing-actions">
          <button class="action-btn" onclick="createNewSessionInNewTab()">＋ New Session in New Tab</button>
        </div>
      </div>
      ${message ? `<p style="margin-bottom:20px;color:#b45309;font-weight:600;">${escapeHtml(message)}</p>` : ''}
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
        <button class="action-btn primary" onclick="createNewSessionAndNavigate()">+ New Session</button>
      </div>
    </div>
  `;
}

function _restoreTabForPhase(sessionPhase) {
  const phaseTabMap = {
    [PHASES.INIT]: 'job',
    [PHASES.JOB_ANALYSIS]: 'analysis',
    [PHASES.CUSTOMIZATION]: 'exp-review',
    [PHASES.REWRITE_REVIEW]: 'rewrite',
    [PHASES.SPELL_CHECK]: 'spell',
    [PHASES.GENERATION]: 'generate',
    [PHASES.LAYOUT_REVIEW]: 'layout',
    [PHASES.REFINEMENT]: 'finalise',
  };
  const targetTab = phaseTabMap[sessionPhase] || 'job';

  if (typeof switchTab === 'function') {
    switchTab(targetTab);
  } else {
    stateManager.setCurrentTab(targetTab);
  }
}

// ---------------------------------------------------------------------------
// Session context / restore
// ---------------------------------------------------------------------------

async function ensureSessionContext() {
  const urlSessionId = getSessionIdFromURL();
  if (!urlSessionId) {
    showSessionsLandingPanel();
    openSessionsModal();
    return false;
  }

  stateManager.setSessionId(urlSessionId);
  return _claimCurrentSession(urlSessionId);
}

async function restoreSession() {
  try {
    stateManager.setIsReconnecting(true);

    const storedSessionId = getSessionIdFromURL() || localStorage.getItem(StorageKeys.SESSION_ID);
    if (!storedSessionId) {
      stateManager.setIsReconnecting(false);
      return;
    }
    stateManager.setSessionId(storedSessionId);

    // Try to restore conversation history from backend
    const historyRes = await fetch('/api/history');
    if (historyRes.ok) {
      const historyData = await historyRes.json();

      // Always restore from the server session file (authoritative history source).
      if (historyData.history && historyData.history.length > 0) {
        const conversation = document.getElementById('conversation');
        conversation.innerHTML = ''; // Clear any loading messages

        historyData.history.forEach(msg => {
          if (msg.role === 'user') {
            appendMessage('user', msg.content);
          } else if (msg.role === 'assistant') {
            appendMessage('assistant', msg.content);
          }
        });

        appendMessage('system', '🔄 Session restored from server.');
        log.info(`Restored ${historyData.history.length} messages from backend`);
      }

      // Update phase
      if (historyData.phase) {
        stateManager.setPhase(historyData.phase);
      }
    }

    // Try to restore backend state.
    // Returns true when server had live session data (in memory or loaded from disk).
    const serverHasData = await restoreBackendState();

    // Restore UI-only prefs (activeReviewPane) from localStorage.
    restoreTabData({ uiPrefsOnly: serverHasData });

    stateManager.setIsReconnecting(false);

  } catch (error) {
    log.warn('Session restoration failed:', error);
    appendMessage('system', `⚠️ Could not restore previous session. Starting fresh. (${error.message})`);
    stateManager.setIsReconnecting(false);
  }
}

function _hydrateStatusDerivedState(statusData) {
  window.achievementEdits = {};
  try {
    if (statusData.achievement_edits && Object.keys(statusData.achievement_edits).length > 0) {
      for (const [k, v] of Object.entries(statusData.achievement_edits)) {
        const idx = parseInt(k, 10);
        const rawItems = Array.isArray(v) ? v : [v];
        window.achievementEdits[idx] = rawItems.map(item => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return {
              text: String(item.text ?? item.description ?? item.content ?? ''),
              hidden: Boolean(item.hidden),
            };
          }
          return {
            text: String(item ?? ''),
            hidden: false,
          };
        });
      }
    }
  } catch (_e) { /* non-fatal */ }

  window._savedDecisions = {
    experience_decisions: statusData.experience_decisions || {},
    skill_decisions:      statusData.skill_decisions      || {},
    achievement_decisions:statusData.achievement_decisions || {},
    publication_decisions:statusData.publication_decisions || {},
    summary_focus_override: statusData.summary_focus_override || null,
    extra_skills:           statusData.extra_skills || [],
    extra_skill_matches:    statusData.extra_skill_matches || {},
  };
  window._allExperiences = statusData.all_experiences || [];
  window.selectedSummaryKey = statusData.summary_focus_override || statusData.selected_summary_key || null;
  window._newSkillsFromLLM = statusData.new_skills_from_llm || [];
  window.postAnalysisQuestions = Array.isArray(statusData.post_analysis_questions)
    ? statusData.post_analysis_questions
    : [];
  window.questionAnswers = (statusData.post_analysis_answers && typeof statusData.post_analysis_answers === 'object')
    ? statusData.post_analysis_answers
    : {};
}

function _hydrateStatusTabState(statusData) {
  const hasAnalysis = statusData.job_analysis !== undefined && statusData.job_analysis !== null;
  const hasCustomizations = statusData.customizations !== undefined && statusData.customizations !== null;
  const hasGeneratedFiles = statusData.generated_files !== undefined && statusData.generated_files !== null;

  stateManager.setTabData('analysis', hasAnalysis ? statusData.job_analysis : null);
  stateManager.setTabData('customizations', hasCustomizations ? statusData.customizations : null);
  stateManager.setTabData('cv', hasGeneratedFiles ? statusData.generated_files : null);
  window.pendingRecommendations = hasCustomizations ? statusData.customizations : null;

  if (hasAnalysis) {
    refreshAtsScore('analysis');
  }

  return hasAnalysis || hasCustomizations || hasGeneratedFiles;
}

async function restoreBackendState() {
  // Returns true if the server had any live session data.
  try {
    const statusRes = await fetch('/api/status');
    if (!statusRes.ok) return false;
    const statusData = parseStatusResponse(await statusRes.json());

    _hydrateStatusDerivedState(statusData);

    let serverHasData = _hydrateStatusTabState(statusData);

    if (statusData.job_analysis !== undefined && statusData.job_analysis !== null) {
      log.info('Restored analysis data from backend memory');
    }
    if (statusData.customizations !== undefined && statusData.customizations !== null) {
      log.info('Restored customizations data from backend memory');
    }
    if (statusData.generated_files !== undefined && statusData.generated_files !== null) {
      log.info('Restored CV data from backend memory');
    }

    try {
      const generationRes = await fetch('/api/cv/generation-state');
      if (generationRes.ok) {
        const generationData = await generationRes.json();
        if (generationData?.ok) {
          const hasCachedAtsScore = Boolean(generationData.ats_score);
          const hasPersistedGenerationData = Boolean(
            generationData.preview_available
              || generationData.final_generated_at
              || hasCachedAtsScore
          );

          stateManager.setGenerationState({
            phase: generationData.phase || 'idle',
            previewAvailable: Boolean(generationData.preview_available),
            previewOutputs: generationData.preview_outputs || null,
            layoutConfirmed: Boolean(generationData.layout_confirmed),
            pageCountEstimate: generationData.page_count_estimate ?? null,
            pageCountExact: generationData.page_count_exact ?? null,
            pageCountConfidence: generationData.page_count_confidence ?? null,
            pageCountSource: generationData.page_count_source || null,
            pageNeedsExactRecheck: Boolean(
              generationData.page_count_needs_exact_recheck,
            ),
            pageWarning: Boolean(generationData.page_length_warning),
            layoutInstructionsCount: generationData.layout_instructions_count || 0,
            finalGeneratedAt: generationData.final_generated_at || null,
          });

          if (hasCachedAtsScore) {
            stateManager.setAtsScore(generationData.ats_score);
          } else {
            stateManager.clearAtsScore();
          }

          if (hasPersistedGenerationData) {
            serverHasData = true;
          }
        }
      }
    } catch (_e) { /* non-fatal */ }

    _restoreTabForPhase(statusData.phase || PHASES.INIT);

    if (typeof updateInclusionCounts === 'function') updateInclusionCounts();

    if (!statusData.position_name && !statusData.job_analysis) {
      const storedPath = localStorage.getItem(StorageKeys.SESSION_PATH);
      if (storedPath) {
        const loaded = await loadSessionFile(storedPath);
        if (loaded) return true;
      }
    }

    return serverHasData;
  } catch (error) {
    log.warn('Failed to restore backend state:', error);
    return false;
  }
}

async function loadSessionFile(path) {
  try {
    appendMessage('system', '🔄 Restoring session from file...');
    const res = await fetch('/api/load-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (!res.ok) {
      const err = await res.json();
      appendMessage('system', `❌ Failed to restore session: ${err.error}`);
      return false;
    }
    const data = await res.json();

    if (data.redirect_url && getSessionIdFromURL() !== data.session_id) {
      window.location.assign(data.redirect_url);
      return true;
    }

    localStorage.setItem(StorageKeys.SESSION_PATH, data.session_file || path);

    // Reset session-scoped suggestion state
    window._suggestedAchsOrdered = null;

    // Reload conversation history from the freshly-loaded backend
    const historyRes = await fetch('/api/history');
    if (historyRes.ok) {
      const historyData = await historyRes.json();
      const conv = document.getElementById('conversation');
      conv.innerHTML = '';
      (historyData.history || []).forEach(msg => {
        if (msg.role !== 'system') appendMessage(msg.role, msg.content);
      });
    } else {
      appendMessage('system', '⚠ Could not restore conversation history.');
    }

    await fetchStatus();

    // Rehydrate tabData and switch to the correct tab for the restored phase
    const sessionPhase = data.phase || PHASES.INIT;
    const phaseTabMap = {
      [PHASES.INIT]:           'job',
      [PHASES.JOB_ANALYSIS]:   'analysis',
      [PHASES.CUSTOMIZATION]:  'exp-review',
      [PHASES.REWRITE_REVIEW]: 'rewrite',
      [PHASES.SPELL_CHECK]:    'spell',
      [PHASES.GENERATION]:     'generate',
      [PHASES.LAYOUT_REVIEW]:  'layout',
      [PHASES.REFINEMENT]:     'finalise',
    };
    const targetTab = phaseTabMap[sessionPhase] || 'job';

    const customizationPhases = [
      PHASES.CUSTOMIZATION, PHASES.REWRITE_REVIEW, PHASES.SPELL_CHECK,
      PHASES.GENERATION, PHASES.LAYOUT_REVIEW, PHASES.REFINEMENT,
    ];
    if (customizationPhases.includes(sessionPhase)) {
      try {
        const s2 = await fetch('/api/status');
        const sd = parseStatusResponse(await s2.json());
        _hydrateStatusDerivedState(sd);
        _hydrateStatusTabState(sd);
      } catch (_) { /* non-fatal */ }
    }

    // For rewrite_review phase, pre-populate the rewrite panel cache
    if (sessionPhase === PHASES.REWRITE_REVIEW) {
      try {
        const rr = await fetch('/api/rewrites');
        if (rr.ok) {
          const rd = parseRewritesResponse(await rr.json());
          const rewrites = rd.rewrites || [];
          const warnings = rd.persuasion_warnings || [];
          rewriteDecisions = {};
          renderRewritePanel(rewrites, warnings);
        }
      } catch (_) { /* non-fatal */ }
    }

    switchTab(targetTab);
    appendMessage('system', `✅ Session restored: ${data.position_name || 'Unnamed'} (${data.phase || PHASES.INIT})`);
    return true;
  } catch (err) {
    appendMessage('system', `❌ Error restoring session: ${err.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rename / tab data persistence
// ---------------------------------------------------------------------------

async function promptRenameCurrentSession() {
  const current = (document.getElementById('position-title')?.textContent || '').trim();
  const newName = prompt('Rename session:', current);
  if (!newName || !newName.trim() || newName.trim() === current) return;
  try {
    const res  = await fetch('/api/rename-current-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName.trim() }),
    });
    const data = await res.json();
    if (data.ok) await fetchStatus();
    else alert(`Rename failed: ${data.error}`);
  } catch (e) { alert(`Rename error: ${e.message}`); }
}

function saveTabData() {
  try {
    localStorage.setItem(getScopedTabDataStorageKey(stateManager.getSessionId()), JSON.stringify({
      tabData: stateManager.getAllTabData(),
      currentTab: stateManager.getCurrentTab(),
      pendingRecommendations: window.pendingRecommendations || null,
      interactiveState: stateManager.getInteractiveState(),
      activeReviewPane: window._activeReviewPane || 'experiences',
      timestamp: Date.now()
    }));
  } catch (error) {
    log.warn('Failed to save tab data:', error);
  }
}

function restoreTabData({ uiPrefsOnly = false } = {}) {
  try {
    const saved = localStorage.getItem(getScopedTabDataStorageKey(stateManager.getSessionId()));
    if (saved) {
      const data = JSON.parse(saved);

      const age = Date.now() - (data.timestamp || 0);
      if (age < 24 * 60 * 60 * 1000) {
        if (!uiPrefsOnly) {
          if (data.tabData) {
            Object.entries(data.tabData).forEach(([tab, value]) => {
              stateManager.setTabData(tab, value);
            });
          }
          if (data.pendingRecommendations) {
            window.pendingRecommendations = data.pendingRecommendations;
          }
          if (data.interactiveState) {
            stateManager.setInteractiveState(data.interactiveState);
          }
        }
        if (data.activeReviewPane) {
          window._activeReviewPane = data.activeReviewPane;
        }

        log.info(`Restored tab data from localStorage (uiPrefsOnly=${uiPrefsOnly})`);
      } else {
        localStorage.removeItem(getScopedTabDataStorageKey(stateManager.getSessionId()));
      }
    }
  } catch (error) {
    log.warn('Failed to restore tab data:', error);
  }
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  formatSessionPhaseLabel,
  _getCurrentSessionIdValue,
  _getCurrentOwnerTokenValue,
  buildSessionSwitcherLabel,
  getActiveSessionOwnershipMeta,
  formatSessionTimestamp,
  createNewSessionAndNavigate,
  createNewSessionInNewTab,
  _claimCurrentSession,
  openSavedSessionFromLanding,
  openActiveSessionFromLanding,
  showSessionsLandingPanel,
  ensureSessionContext,
  restoreSession,
  restoreBackendState,
  loadSessionFile,
  promptRenameCurrentSession,
  saveTabData,
  restoreTabData,
};
