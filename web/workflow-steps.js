// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/workflow-steps.js
 * Workflow progress bar, phase re-run/back-nav, and bullet reorder modal.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   PHASES, escapeHtml,
 *   appendLoadingMessage, removeLoadingMessage, appendRetryMessage, appendMessage,
 *   setLoading, fetchStatus, switchTab, sendAction,
 *   showLoadJobPanel, updateActionButtons, updateTabBarForStage,
 *   trapFocus, restoreFocus, _focusedElementBeforeModal,
 *   postAnalysisQuestions, questionAnswers, CSS
 */

import { getLogger } from './logger.js';
const log = getLogger('workflow-steps');

import { stateManager, GENERATION_STATE_EVENT } from './state-manager.js';

function _findExperienceRecommendationRecord(expId) {
  const data = globalThis.window?.pendingRecommendations;
  if (!data || !Array.isArray(data.experience_recommendations)) return null;
  return data.experience_recommendations.find((rec) => String(rec?.id || rec?.experience_id || '') === String(expId)) || null;
}

// ── Step-order constants ─────────────────────────────────────────────────────

const _STEP_ORDER = ['job', 'analysis', 'customizations', 'rewrite', 'spell', 'generate', 'layout', 'finalise'];
const _STEP_DISPLAY = {
  job: 'Job Input', analysis: 'Job Analysis', customizations: 'Customisations',
  rewrite: 'Rewrite Review', spell: 'Spell Check', generate: 'Generate CV',
  layout: 'Layout Review', finalise: 'Finalise',
};
const _ACTION_LABELS = {
  recommend_customizations: 'Selecting experiences & skills…',
  generate_cv: 'Generating CV…',
};

const _NAV_TAB_LABELS = {
  generate: '📄 Generated CV',
  download: '⬇️ File Review',
  finalise: '✅ Finalise',
};

function applyLayoutFreshnessNavigationState() {
  const freshness = stateManager.getLayoutFreshness();
  const generationState = stateManager.getGenerationState();
  const layoutStep = document.getElementById('step-layout');

  if (layoutStep) {
    layoutStep.classList.remove('stale', 'stale-critical');
    const rerun = layoutStep.querySelector('.step-rerun')?.outerHTML || '';
    const refineBadge = layoutStep.querySelector('.step-inline-badge')?.outerHTML || '';
    const staleBadge = freshness.isStale
      ? ' <span class="step-inline-badge step-stale-badge">Outdated</span>'
      : '';
    if (freshness.isStale) {
      layoutStep.classList.add('stale');
      if (freshness.isCritical) layoutStep.classList.add('stale-critical');
    }
    layoutStep.innerHTML = `🎨 Layout Review${staleBadge}${refineBadge ? ` ${refineBadge}` : ''}${rerun ? ` ${rerun}` : ''}`;
  }

  const showDownstreamBadge = freshness.isStale && Boolean(
    generationState.finalGeneratedAt || generationState.phase === 'final_complete'
  );
  Object.entries(_NAV_TAB_LABELS).forEach(([tab, label]) => {
    const tabEl = document.getElementById(`tab-${tab}`);
    if (!tabEl) return;
    tabEl.classList.remove('tab-stale', 'tab-stale-critical');
    if (showDownstreamBadge) {
      tabEl.classList.add('tab-stale');
      if (freshness.isCritical) tabEl.classList.add('tab-stale-critical');
      tabEl.innerHTML = `${label} <span class="tab-stale-badge">Outdated</span>`;
    } else {
      tabEl.textContent = label;
    }
  });
}

// ── Back to phase ─────────────────────────────────────────────────────────────

async function backToPhase(step, feedback) {
  try {
    const body = feedback ? {phase: step, feedback} : {phase: step};
    const res  = await fetch('/api/back-to-phase', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Could not navigate back: ' + (data.error || 'Unknown error'), () => backToPhase(step, feedback));
      return;
    }
    appendMessage('assistant', `↻ Navigating back to ${step}. Prior decisions and approvals are preserved.`);
    if (feedback) appendMessage('system', `Refinement feedback queued: "${feedback}"`);
    await fetchStatus();

    // Switch to the appropriate viewer tab
    const tabMap = {
      job:            null,
      analysis:       'analysis',
      customizations: 'exp-review',
      rewrite:        'rewrite',
      spell:          'spell',
      generate:       'generate',
    };
    const resolvedTab = tabMap[step] || tabMap[data.phase] || null;
    if (resolvedTab) switchTab(resolvedTab);
  } catch (err) {
    appendRetryMessage('⚠ Network error in backToPhase: ' + err.message, () => backToPhase(step));
  }
}

// ── Re-run confirm modal ──────────────────────────────────────────────────────

/**
 * Show a downstream-aware confirmation modal before re-running or back-navigating.
 * @param {string}   step      - The target step key
 * @param {'rerun'|'back-nav'} mode
 * @param {Function} onConfirm - Called if the user clicks Proceed
 */
function _showReRunConfirmModal(step, mode, onConfirm) {
  const stepIdx    = _STEP_ORDER.indexOf(step);
  // Only show downstream stages that have actually been completed
  const downstream = _STEP_ORDER.slice(stepIdx + 1).filter(s => {
    const el = document.getElementById(`step-${s}`);
    return el && el.classList.contains('completed');
  });
  const stepLabel  = _STEP_DISPLAY[step] || step;

  const title = mode === 'rerun'
    ? `↻ Re-run ${stepLabel}?`
    : `← Navigate back to ${stepLabel}?`;
  const bodyText = mode === 'rerun'
    ? 'The following stages will see updated inputs and may show changed recommendations:'
    : 'You are navigating back past the following completed stages:';
  const note = 'All existing approvals and rewrites are preserved as context.';

  const listHtml = downstream
    .map(s => `<li style="padding:2px 0;">${_STEP_DISPLAY[s] || s}</li>`)
    .join('');

  const overlay = document.createElement('div');
  overlay.id = 'rerun-confirm-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:10000;display:flex;align-items:center;justify-content:center;`;
  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="rerun-confirm-title"
         style="background:#fff;border-radius:10px;padding:24px 28px;max-width:440px;
                width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <h3 id="rerun-confirm-title" style="margin:0 0 10px;font-size:1.1em;color:#1e293b;">
        ${escapeHtml(title)}</h3>
      <p style="margin:0 0 8px;font-size:0.9em;color:#475569;">${escapeHtml(bodyText)}</p>
      <ul style="margin:0 0 12px;padding-left:20px;font-size:0.9em;color:#374151;">${listHtml}</ul>
      <p style="margin:0 0 18px;font-size:0.85em;color:#6b7280;">${escapeHtml(note)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="rerun-cancel-btn" class="btn-secondary">Cancel</button>
        <button id="rerun-proceed-btn" class="btn-primary">Proceed</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  _focusedElementBeforeModal = document.activeElement;
  trapFocus('rerun-confirm-overlay');
  document.getElementById('rerun-proceed-btn').focus();

  const close = () => { overlay.remove(); restoreFocus(); };
  document.getElementById('rerun-cancel-btn').addEventListener('click', close);
  document.getElementById('rerun-proceed-btn').addEventListener('click', () => { close(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

function confirmReRunPhase(step) {
  _showReRunConfirmModal(step, 'rerun', () => reRunPhase(step));
}

// ── Re-run phase ──────────────────────────────────────────────────────────────

async function reRunPhase(step) {
  const loadingMsg = appendLoadingMessage(`↻ Re-running ${step}…`);
  setLoading(true, `Re-running ${step}…`);
  try {
    const res  = await fetch('/api/re-run-phase', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({phase: step}),
    });
    const data = await res.json();
    removeLoadingMessage(loadingMsg);
    setLoading(false);

    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Re-run failed: ' + (data.error || 'Unknown error'), () => reRunPhase(step));
      return;
    }

    appendMessage('assistant', `✅ ${step} re-run complete. Review the updated results — changed items are highlighted.`);
    await fetchStatus();

    // Navigate to the step's viewer tab
    const tabMap = {
      analysis:       'analysis',
      customizations: 'exp-review',
      rewrite:        'rewrite',
      spell:          'spell',
      generate:       'generate',
    };
    if (tabMap[step]) switchTab(tabMap[step]);

    // Compute changed-item IDs from prior vs new output and highlight them.
    if (data.prior_output && data.new_output) {
      setTimeout(() => _highlightChangedItems(step, data.prior_output, data.new_output), 300);
    }

  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    appendRetryMessage('⚠ Network error in reRunPhase: ' + err.message, () => reRunPhase(step));
  }
}

// ── Highlight changed items ───────────────────────────────────────────────────

/**
 * Compare prior and new re-run outputs; mark DOM elements for changed entities.
 *
 * Strategies by step:
 *   rewrite        — compare rewrite IDs; mark rw-card-<id>
 *   customizations — compare experience IDs; mark tr[data-exp-id] and tr[data-skill]
 *   analysis       — no per-entity DOM targeting; skip
 */
function _highlightChangedItems(step, priorOutput, newOutput) {
  if (step === 'rewrite') {
    const priorIds = new Set((priorOutput.pending_rewrites || []).map(r => String(r.id)));
    const newItems  = newOutput.pending_rewrites  || [];
    for (const item of newItems) {
      const id      = String(item.id || '');
      const cardId  = id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const el      = document.getElementById(`rw-card-${cardId}`);
      if (!el) continue;
      const isNew     = !priorIds.has(id);
      const priorItem = (priorOutput.pending_rewrites || []).find(r => String(r.id) === id);
      const changed   = isNew || (priorItem && priorItem.proposed !== item.proposed);
      if (changed) _markChanged(el);
    }
    return;
  }

  if (step === 'customizations') {
    const priorExpIds = new Set(
      (priorOutput.customizations?.experience_recommendations || []).map(r => String(r.id))
    );
    const newExpRecs  = newOutput.customizations?.experience_recommendations || [];
    for (const rec of newExpRecs) {
      const id   = String(rec.id || '');
      const el   = document.querySelector(`tr[data-exp-id="${CSS.escape(id)}"]`);
      if (!el) continue;
      const prior = (priorOutput.customizations?.experience_recommendations || []).find(r => String(r.id) === id);
      if (!priorExpIds.has(id) || (prior && prior.recommendation !== rec.recommendation)) {
        _markChanged(el);
      }
    }

    const priorSkills = new Set(
      (priorOutput.customizations?.skill_recommendations || []).map(r => (r.skill || '').toLowerCase())
    );
    const newSkillRecs = newOutput.customizations?.skill_recommendations || [];
    for (const rec of newSkillRecs) {
      const name = (rec.skill || '').toLowerCase();
      const el   = document.querySelector(`tr[data-skill="${CSS.escape(name)}"]`);
      if (!el) continue;
      const prior = (priorOutput.customizations?.skill_recommendations || []).find(
        r => (r.skill || '').toLowerCase() === name
      );
      if (!priorSkills.has(name) || (prior && prior.recommendation !== rec.recommendation)) {
        _markChanged(el);
      }
    }
    return;
  }
}

/** Apply data-changed attribute and trigger highlight animation on an element. */
function _markChanged(el) {
  el.setAttribute('data-changed', 'true');
  // Remove the attribute after the animation completes so it can be re-triggered on a second rerun.
  setTimeout(() => el.removeAttribute('data-changed'), 2500);
}

// ── Bullet reorder modal ──────────────────────────────────────────────────────

async function showBulletReorder(expId, expTitle) {
  // Fetch achievements (required) and suggested order (best-effort).
  let achievements = [];
  let proposedOrder = null;
  let hasJobAnalysis = false;
  let proposedReasoning = '';
  let proposedAtsImpact = '';
  let proposedPageImpact = '';
  try {
    const detailsRes = await fetch('/api/experience-details', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({experience_id: expId}),
    });
    if (!detailsRes.ok) {
      let detailsErr = `HTTP ${detailsRes.status}`;
      try {
        const payload = await detailsRes.json();
        detailsErr = payload.error || payload.message || detailsErr;
      } catch (_) { /* keep status-based error */ }
      throw new Error(detailsErr);
    }

    const detailsData = await detailsRes.json();
    achievements  = (detailsData.experience && detailsData.experience.achievements) || [];

    const recRecord = _findExperienceRecommendationRecord(expId);
    const llmBulletOrder = recRecord && typeof recRecord.bullet_order === 'object'
      ? recRecord.bullet_order
      : null;
    if (Array.isArray(llmBulletOrder?.order) && llmBulletOrder.order.length > 1) {
      proposedOrder = llmBulletOrder.order;
      hasJobAnalysis = true;
      proposedReasoning = String(llmBulletOrder.reasoning || '').trim();
      proposedAtsImpact = String(llmBulletOrder.ats_impact || '').trim();
      proposedPageImpact = String(llmBulletOrder.page_length_impact || '').trim();
    }

    // Suggested order is optional; failures should not block opening the modal.
    if (!proposedOrder) {
      try {
        const proposedRes = await fetch(`/api/proposed-bullet-order?experience_id=${encodeURIComponent(expId)}`);
        if (proposedRes.ok) {
          const proposedData = await proposedRes.json();
          proposedOrder = proposedData.proposed_order || null;
          hasJobAnalysis = proposedData.has_job_analysis || false;
        } else {
          log.warn('Could not load suggested bullet order:', proposedRes.status);
        }
      } catch (e) {
        log.warn('Could not load suggested bullet order:', e);
      }
    }
  } catch (e) {
    const errorText = e.message === 'Failed to fetch'
      ? 'Failed to fetch (server unavailable).'
      : e.message;
    appendRetryMessage('⚠ Could not load bullets: ' + errorText, () => showBulletReorder(expId, expTitle));
    return;
  }
  if (!achievements.length) {
    appendMessage('system', 'No bullet points found for this experience.');
    return;
  }

  // Build modal content
  const modal = document.createElement('div');
  modal.id = 'bullet-reorder-modal';
  modal.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);
    z-index:9999;display:flex;align-items:center;justify-content:center;`;

  const suggestedBtn = hasJobAnalysis
    ? `<button class="btn-secondary" id="use-llm-order-btn" title="Apply job-relevance ranking from your job analysis"
         style="color:#6366f1;border-color:#6366f1;">✨ Use Suggested Order</button>`
    : '';
  const suggestionMeta = proposedReasoning || proposedAtsImpact || proposedPageImpact
    ? `<div id="bullet-order-ai-note" style="font-size:0.82em;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:10px 12px;margin-bottom:12px;">
        ${proposedReasoning ? `<div><strong>AI rationale:</strong> ${escapeHtml(proposedReasoning)}</div>` : ''}
        ${proposedAtsImpact ? `<div><strong>ATS impact:</strong> ${escapeHtml(proposedAtsImpact)}</div>` : ''}
        ${proposedPageImpact ? `<div><strong>Page length impact:</strong> ${escapeHtml(proposedPageImpact)}</div>` : ''}
      </div>`
    : '';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:24px;max-width:640px;width:92%;
                max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <h3 style="margin:0;color:#1f2937;">↕ Reorder Bullets</h3>
          <div style="color:#6b7280;font-size:0.9em;margin-top:4px;">${expTitle}</div>
        </div>
        <button onclick="document.getElementById('bullet-reorder-modal').remove()"
          style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#6b7280;">✕</button>
      </div>
      <div style="font-size:0.85em;color:#6b7280;margin-bottom:12px;">
        Use ↑ ↓ to reorder. Bullets higher in the list appear first on your CV.
        The most relevant bullet will be auto-ranked highest if you reset.
      </div>
      ${suggestionMeta}
      <ol id="bullet-reorder-list" style="padding:0;margin:0;list-style:none;">
      </ol>
      <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
        ${suggestedBtn}
        <button class="btn-secondary" onclick="resetBulletOrder('${expId}')">↺ Reset to Auto</button>
        <button class="btn-primary"   onclick="saveBulletOrder('${expId}')">Save Order</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Populate list items
  const list = document.getElementById('bullet-reorder-list');
  achievements.forEach((ach, idx) => {
    const text = (typeof ach === 'object' ? (ach.text || '') : String(ach));
    const li = document.createElement('li');
    li.dataset.origIndex = idx;
    li.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:8px;margin-bottom:6px;
      background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;`;
    li.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;">
        <button title="Move up"   onclick="moveBullet(this,-1)"
          style="background:none;border:1px solid #d1d5db;border-radius:3px;
                 cursor:pointer;padding:1px 5px;line-height:1.2;font-size:0.9em;">↑</button>
        <button title="Move down" onclick="moveBullet(this,+1)"
          style="background:none;border:1px solid #d1d5db;border-radius:3px;
                 cursor:pointer;padding:1px 5px;line-height:1.2;font-size:0.9em;">↓</button>
      </div>
      <span style="flex:1;font-size:0.9em;">${text}</span>`;
    list.appendChild(li);
  });
  _updateBulletArrows();

  // Wire up "Use Suggested Order" button if job analysis is available
  if (hasJobAnalysis && proposedOrder) {
    document.getElementById('use-llm-order-btn')?.addEventListener('click', () => {
      _applyBulletOrder(proposedOrder);
    });
  }
}

function _applyBulletOrder(order) {
  const list = document.getElementById('bullet-reorder-list');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('li'));
  // Build a map from origIndex → li element
  const byOrig = {};
  items.forEach(li => { byOrig[parseInt(li.dataset.origIndex, 10)] = li; });
  // Re-append in proposed order, then any not listed
  const listed = new Set(order.map(Number));
  order.forEach(idx => { if (byOrig[idx]) list.appendChild(byOrig[idx]); });
  items.forEach(li => {
    if (!listed.has(parseInt(li.dataset.origIndex, 10))) list.appendChild(li);
  });
  _updateBulletArrows();
}

function moveBullet(btn, direction) {
  const li   = btn.closest('li');
  const list = li.parentNode;
  if (direction === -1 && li.previousElementSibling) {
    list.insertBefore(li, li.previousElementSibling);
  } else if (direction === +1 && li.nextElementSibling) {
    list.insertBefore(li.nextElementSibling, li);
  }
  _updateBulletArrows();
}

function _updateBulletArrows() {
  const list = document.getElementById('bullet-reorder-list');
  if (!list) return;
  const items = list.querySelectorAll('li');
  items.forEach((li, idx) => {
    const [upBtn, downBtn] = li.querySelectorAll('button');
    upBtn.disabled   = idx === 0;
    downBtn.disabled = idx === items.length - 1;
    upBtn.style.opacity   = upBtn.disabled   ? '0.3' : '1';
    downBtn.style.opacity = downBtn.disabled ? '0.3' : '1';
  });
}

async function saveBulletOrder(expId) {
  const list  = document.getElementById('bullet-reorder-list');
  const items = list ? list.querySelectorAll('li') : [];
  const order = Array.from(items).map(li => parseInt(li.dataset.origIndex, 10));
  try {
    const res  = await fetch('/api/reorder-bullets', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({experience_id: expId, order}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Could not save bullet order: ' + (data.error||'Unknown'), () => saveBulletOrder(expId));
      return;
    }
    appendMessage('assistant', '↕ Bullet order saved. It will apply when you generate the CV.');
    document.getElementById('bullet-reorder-modal')?.remove();
  } catch(e) {
    appendRetryMessage('⚠ Network error saving bullet order: ' + e.message, () => saveBulletOrder(expId));
  }
}

async function resetBulletOrder(expId) {
  try {
    const res  = await fetch('/api/reorder-bullets', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({experience_id: expId, order: []}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appendRetryMessage('⚠ Could not reset bullet order: ' + (data.error||'Unknown'), () => resetBulletOrder(expId));
      return;
    }
    appendMessage('assistant', '↺ Bullet order reset. Relevance-based ordering will apply.');
    document.getElementById('bullet-reorder-modal')?.remove();
  } catch(e) {
    appendRetryMessage('⚠ Network error resetting bullet order: ' + e.message, () => resetBulletOrder(expId));
  }
}

// ── Workflow step bar ─────────────────────────────────────────────────────────

function updateWorkflowSteps(status) {
  // 8-step workflow bar: Job Input → Analysis → Customise → Rewrites →
  //                      Spell Check → Generate → Layout (upcoming) → Finalise
  //
  const UPCOMING = new Set();

  // Steps that support LLM re-execution via /api/re-run-phase
  const RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite', 'spell', 'generate']);

  // Base label for each step (used when injecting ↻ button)
  const STEP_LABELS = {
    job:            '📥 Job Input',
    analysis:       '🔍 Analysis',
    customizations: '⚙️ Customise',
    rewrite:        '✏️ Rewrites',
    spell:          '🔤 Spell Check',
    generate:       '📄 Generate',
    layout:         '🎨 Layout Review',
    finalise:       '✅ Finalise',
  };

  // Determine which steps are done based on session state fields.
  const phase = status.phase || '';
  const done = {
    job:            !!status.job_description,
    analysis:       !!status.job_analysis,
    customizations: !!status.customizations,
    rewrite:        phase !== PHASES.REWRITE_REVIEW && (!!status.customizations),
    spell:          phase === PHASES.GENERATION || phase === PHASES.REFINEMENT,
    generate:       !!status.generated_files,
    layout:         phase === PHASES.REFINEMENT && !!status.generated_files,
    finalise:       phase === PHASES.REFINEMENT && !!status.generated_files,
  };

  // Determine the active step from the backend phase string.
  const phaseToStep = {
    'init':          'job',
    'job_analysis':  'analysis',
    'customization': 'customizations',
    'rewrite_review':'rewrite',
    'spell_check':   'spell',
    'generation':    'generate',
    'layout_review': 'layout',
    'refinement':    'finalise',
  };
  const activeStep = phaseToStep[phase] || 'job';

  // Resolve the reentry step for the "Refining" badge
  const _phaseToStep2 = Object.assign({'init': 'job'}, phaseToStep);
  const reentryStep = status.iterating
    ? (_phaseToStep2[status.reentry_phase] || status.reentry_phase || null)
    : null;

  const stepIds = ['job', 'analysis', 'customizations', 'rewrite', 'spell', 'generate', 'layout', 'finalise'];
  stepIds.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;
    // Upcoming steps are fixed — never change their class.
    if (UPCOMING.has(step)) return;
    el.classList.remove('active', 'completed', 'clickable', 'upcoming');

    let label = STEP_LABELS[step] || step;

    if (step === activeStep) {
      el.classList.add('active');
      // "↻ Refining" badge shown on the active step when iterating
      if (status.iterating && reentryStep === step) {
        label += ' <span class="step-inline-badge">↻ Refining</span>';
      }
    } else if (done[step]) {
      el.classList.add('completed');
      // Completed steps are clickable for back-navigation.
      el.classList.add('clickable');
      // Add ↻ re-run icon for steps that support LLM re-execution
      if (RE_RUN_STEPS.has(step)) {
        label += ` <span class="step-rerun" title="Re-run ${step} with updated inputs"
          onclick="event.stopPropagation();confirmReRunPhase('${step}')"
          style="font-size:0.8em;opacity:0;transition:opacity 0.15s;margin-left:2px;cursor:pointer;">↻</span>`;
      }
    }

    el.innerHTML = label;
  });

  applyLayoutFreshnessNavigationState();

  // Show ↻ icons via CSS :hover on the parent .completed step
  // (inject a <style> only once)
  if (!document.getElementById('step-rerun-style')) {
    const s = document.createElement('style');
    s.id = 'step-rerun-style';
    s.textContent = '.step.completed:hover .step-rerun { opacity: 1 !important; }';
    document.head.appendChild(s);
  }

  // Sync second-bar tab visibility and action buttons to the active workflow step
  if (typeof updateTabBarForStage === 'function') {
    updateTabBarForStage(activeStep);
  }
  updateActionButtons(activeStep);
}

if (typeof window !== 'undefined') {
  window.addEventListener(GENERATION_STATE_EVENT, applyLayoutFreshnessNavigationState);
}

// ── Step click (back-nav) ─────────────────────────────────────────────────────

// Back-navigation: clicking a completed workflow step navigates to its viewer tab.
// Clicking the job step always opens the load-job panel.
function handleStepClick(step) {
  const el = document.getElementById(`step-${step}`);
  if (!el) return;

  // Job step: show job content if a job is loaded, otherwise open the load panel.
  if (step === 'job') {
    if (el.classList.contains('completed')) {
      // Show confirmation if any downstream stages are completed
      const hasCompletedDownstream = _STEP_ORDER.slice(1).some(s => {
        const sEl = document.getElementById(`step-${s}`);
        return sEl && sEl.classList.contains('completed');
      });
      if (hasCompletedDownstream) {
        _showReRunConfirmModal('job', 'back-nav', () => switchTab('job'));
      } else {
        switchTab('job');
      }
    } else {
      showLoadJobPanel();
    }
    return;
  }

  // Only navigate if the step is completed (back-nav) or active.
  if (!el.classList.contains('completed') && !el.classList.contains('active')) return;

  const hasUnansweredPostAnalysisQuestions = () => {
    const qs = Array.isArray(window.postAnalysisQuestions) ? window.postAnalysisQuestions : [];
    if (qs.length === 0) return false;
    const answers = (window.questionAnswers && typeof window.questionAnswers === 'object')
      ? window.questionAnswers
      : {};
    return qs.some(q => {
      const value = answers[q.type];
      return !value || !String(value).trim();
    });
  };

  const stepToTab = {
    analysis:       hasUnansweredPostAnalysisQuestions() ? 'questions' : 'analysis',
    customizations: 'exp-review',
    rewrite:        'rewrite',
    spell:          'spell',
    generate:       'generate',
    layout:         'layout',
    finalise:       'finalise',
  };
  const tabName = stepToTab[step];
  if (tabName) {
    const visibleStage = typeof getVisibleStage === 'function'
      ? getVisibleStage()
      : stateManager.getCurrentStage();
    const currentIdx = _STEP_ORDER.indexOf(visibleStage);
    const targetIdx  = _STEP_ORDER.indexOf(step);
    const navigatingBack = targetIdx < currentIdx && el.classList.contains('completed');

    if (navigatingBack) {
      _showReRunConfirmModal(step, 'back-nav', () => {
        if (typeof updateTabBarForStage === 'function') updateTabBarForStage(step);
        switchTab(tabName);
      });
      return;
    }

    if (typeof updateTabBarForStage === 'function') {
      updateTabBarForStage(step);
    }
    switchTab(tabName);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  _STEP_ORDER,
  _STEP_DISPLAY,
  _ACTION_LABELS,
  backToPhase,
  _showReRunConfirmModal,
  confirmReRunPhase,
  reRunPhase,
  _highlightChangedItems,
  _markChanged,
  applyLayoutFreshnessNavigationState,
  showBulletReorder,
  _applyBulletOrder,
  moveBullet,
  _updateBulletArrows,
  saveBulletOrder,
  resetBulletOrder,
  updateWorkflowSteps,
  handleStepClick,
};
