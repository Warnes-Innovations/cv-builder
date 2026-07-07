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

const _STEP_ORDER = [
  'job', 'analysis', 'customizations', 'rewrite', 'spell', 'layout',
  'download', 'cover_letter', 'screening', 'interview_prep', 'thank_you', 'finalise', 'harvest',
];
const _STEP_DISPLAY = {
  job:            'Job Input',
  analysis:       'Job Analysis',
  customizations: 'Customise',
  rewrite:        'Rewrite Review',
  spell:          'Spell Check',
  layout:         'Layout Review',
  download:       'File Review',
  cover_letter:   'Cover Letter',
  screening:      'Screening',
  interview_prep: 'Interview Prep',
  thank_you:      'Thank You',
  finalise:       'Finalise',
  harvest:        'Update Master CV',
};
const _ACTION_LABELS = {
  recommend_customizations: 'Selecting experiences & skills…',
  generate_cv: 'Generating CV…',
};

const _NAV_TAB_LABELS = {
  download: '⬇️ File Review',
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
      customizations: 'goals',
      rewrite:        'rewrite',
      spell:          'spell',
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
  if (typeof trapFocus === 'function') trapFocus('rerun-confirm-overlay');
  document.getElementById('rerun-proceed-btn').focus();

  const close = () => { overlay.remove(); restoreFocus(); };
  document.getElementById('rerun-cancel-btn').addEventListener('click', close);
  document.getElementById('rerun-proceed-btn').addEventListener('click', () => { close(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

function confirmReRunPhase(step) {
  _showReRunConfirmModal(step, 'rerun', () => backToPhase(step));
}

// ── View-cursor indicator ─────────────────────────────────────────────────────

const _STEP_DESCRIPTIONS = {
  job:            'Paste a job description to start tailoring your CV.',
  analysis:       'Extracts job title, required skills, and ATS keywords from the job description.',
  customizations: 'Select which experiences and skills to include — tailors content to this role.',
  rewrite:        'Review and approve AI-proposed rewrites of your experience bullet points.',
  spell:          'Review spelling and grammar before generating the final document.',
  layout:         'Adjust margins, fonts, and column balance, then generate your final CV files.',
  download:       'Download your tailored CV as PDF and DOCX.',
  cover_letter:   'Generate a tailored cover letter for this application.',
  screening:      'Prepare written answers for screening questions.',
  interview_prep: 'Prepare talking points and stories for your interview.',
  thank_you:      'Draft a thank-you note to send after the interview.',
  harvest:        'Save refined bullets, new skills, and summary variants back to your Master CV for future applications.',
};

/**
 * Return a tooltip string for a step pill based on its combined state.
 * Locked steps (neither active nor completed) show their description and an unlock hint.
 */
function _getStepTooltip(step, isActive, isViewing, isBrowsingAway, isCompleted, isStale, isStaleCritical) {
  const desc = _STEP_DESCRIPTIONS[step] || '';
  if (isStaleCritical) return (isViewing ? 'Critical changes — review required. Click ↻ to rerun.' : 'Critical changes — review required.') + (desc ? ' · ' + desc : '');
  if (isStale)         return (isViewing ? 'Results may be outdated. Click ↻ to rerun.'           : 'Results may be outdated.')           + (desc ? ' · ' + desc : '');
  if (isBrowsingAway)  return 'Active step — click to return' + (desc ? ' · ' + desc : '');
  if (isActive && isViewing)    return desc ? 'Current step · ' + desc : 'Current step';
  if (isCompleted && isViewing) return desc ? desc + ' · Click ↻ to rerun from here' : 'Click ↻ to rerun from here';
  if (isCompleted)              return desc ? desc + ' · Click to view' : 'Click to view';
  return desc ? desc + ' · Unlocks as you complete earlier steps.' : '';
}

/**
 * Sync the blue ring (view cursor) and amber pulsing ring (browsing-away)
 * to the currently visible tab. Called after every tab switch and status update.
 * @param {string} tabName - The currently visible tab id (e.g. 'analysis', 'exp-review')
 */
function _updateViewingIndicator(tabName) {
  const tabToStep = {
    'job':           'job',
    'analysis':      'analysis',
    'questions':     'analysis',
    'exp-review':    'customizations',
    'rewrite':       'rewrite',
    'spell':         'spell',
    'layout':        'layout',
    'final_generate':'download',
    'download':      'download',
    'cover-letter':  'cover_letter',
    'screening':     'screening',
    'interview-prep':'interview_prep',
    'thank-you':     'thank_you',
    'harvest':       'harvest',
  };
  const viewedStep = tabToStep[tabName] || null;

  let activeStep = null;
  _STEP_ORDER.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (el && el.classList.contains('active')) activeStep = step;
  });

  _STEP_ORDER.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;

    const isViewing      = step === viewedStep;
    const isActive       = step === activeStep;
    const isBrowsingAway = isActive && !!viewedStep && viewedStep !== activeStep;
    const isCompleted    = el.classList.contains('completed');
    const isStale        = el.classList.contains('stale');
    const isStaleCritical = el.classList.contains('stale-critical');

    el.classList.toggle('viewing',       isViewing);
    el.classList.toggle('browsing-away', isBrowsingAway);

    const tooltipText = _getStepTooltip(step, isActive, isViewing, isBrowsingAway, isCompleted, isStale, isStaleCritical);
    if (tooltipText) {
      el.setAttribute('data-bs-toggle',    'tooltip');
      el.setAttribute('data-bs-placement', 'bottom');
      el.setAttribute('data-bs-title',     tooltipText);
      if (typeof bootstrap !== 'undefined') {
        const tip = bootstrap.Tooltip.getInstance(el);
        if (tip) tip.setContent({ '.tooltip-inner': tooltipText });
        else     new bootstrap.Tooltip(el);
      }
    } else {
      el.removeAttribute('data-bs-toggle');
      el.removeAttribute('data-bs-title');
      if (typeof bootstrap !== 'undefined') {
        const tip = bootstrap.Tooltip.getInstance(el);
        if (tip) tip.dispose();
      }
    }
  });
}

// ── Re-run phase ──────────────────────────────────────────────────────────────

/**
 * Show an amend-clarifications modal before re-running the analysis phase.
 * Calls onProceed() if the user confirms (with or without updating answers).
 */
async function _showAnalysisClarificationAmendModal(onProceed) {
  const questions = window.postAnalysisQuestions || [];
  const answers   = window.questionAnswers || {};

  // No prior questions — skip the modal and proceed directly.
  if (!questions.length) { await onProceed(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'clar-amend-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';

  const formRows = questions.map((q, i) => {
    const qtype  = q.type || `clarification_${i + 1}`;
    const qtext  = escapeHtml(q.question || '');
    const curAns = escapeHtml(answers[qtype] || '');
    const choices = Array.isArray(q.choices) ? q.choices : [];

    if (choices.length) {
      const radios = choices.map(c => `
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;cursor:pointer;">
          <input type="radio" name="clar-${escapeHtml(qtype)}" value="${escapeHtml(c)}"
            ${answers[qtype] === c ? 'checked' : ''} style="flex-shrink:0;">
          <span style="font-size:0.9em;">${escapeHtml(c)}</span>
        </label>`).join('');
      return `
        <div style="margin-bottom:14px;">
          <label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:6px;">${qtext}</label>
          ${radios}
        </div>`;
    }
    return `
      <div style="margin-bottom:14px;">
        <label for="clar-ans-${escapeHtml(qtype)}" style="font-weight:600;font-size:0.9em;display:block;margin-bottom:4px;">${qtext}</label>
        <textarea id="clar-ans-${escapeHtml(qtype)}" name="clar-${escapeHtml(qtype)}" rows="2"
          style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9em;resize:vertical;"
        >${curAns}</textarea>
      </div>`;
  }).join('');

  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="clar-amend-title"
         style="background:#fff;border-radius:10px;padding:24px 28px;max-width:500px;width:94%;
                box-shadow:0 20px 60px rgba(0,0,0,0.3);margin:20px auto;">
      <h3 id="clar-amend-title" style="margin:0 0 6px;font-size:1.1em;color:#1e293b;">↻ Amend Clarification Answers</h3>
      <p style="margin:0 0 16px;font-size:0.85em;color:#6b7280;">
        Update your answers before rerunning analysis, or keep them as-is.
      </p>
      <form id="clar-amend-form" onsubmit="return false;">
        ${formRows}
      </form>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;">
        <button id="clar-amend-cancel" class="btn-secondary">Cancel</button>
        <button id="clar-amend-keep"   class="btn-secondary">Keep Existing Answers</button>
        <button id="clar-amend-save"   class="btn-primary">Update &amp; Rerun</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  if (typeof _focusedElementBeforeModal !== 'undefined') window._focusedElementBeforeModal = document.activeElement;
  if (typeof trapFocus === 'function') trapFocus('clar-amend-overlay');
  overlay.querySelector('#clar-amend-save').focus();

  function closeModal() {
    overlay.remove();
    if (typeof restoreFocus === 'function') restoreFocus();
  }

  overlay.querySelector('#clar-amend-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  overlay.querySelector('#clar-amend-keep').addEventListener('click', () => {
    closeModal();
    onProceed();
  });

  overlay.querySelector('#clar-amend-save').addEventListener('click', async () => {
    const form    = document.getElementById('clar-amend-form');
    const updated = {};
    questions.forEach((q, i) => {
      const qtype = q.type || `clarification_${i + 1}`;
      const el    = form.querySelector(`[name="clar-${qtype}"]`);
      if (!el) return;
      if (el.type === 'radio') {
        const checked = form.querySelector(`[name="clar-${qtype}"]:checked`);
        if (checked) updated[qtype] = checked.value;
      } else {
        const val = el.value.trim();
        if (val) updated[qtype] = val;
      }
    });

    closeModal();
    try {
      await fetch('/api/post-analysis-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, answers: updated }),
      });
      window.questionAnswers = updated;
    } catch (_e) { /* silent — proceed with whatever the backend already has */ }
    await onProceed();
  });
}

async function reRunPhase(step) {
  // Intercept analysis reruns to let the user amend prior clarification answers.
  if (step === 'analysis') {
    await _showAnalysisClarificationAmendModal(() => _executeReRunPhase('analysis'));
    return;
  }
  await _executeReRunPhase(step);
}

async function _executeReRunPhase(step) {
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

    const changeInfo = (data.prior_output && data.new_output)
      ? _countChangedItems(step, data.prior_output, data.new_output)
      : null;
    const changedSuffix = changeInfo
      ? ` (${changeInfo.changed} of ${changeInfo.total} items changed)`
      : '';
    appendMessage('assistant', `✅ ${step} re-run complete. Review the updated results — changed items are highlighted${changedSuffix}.`);
    await fetchStatus();

    // Clear per-phase caches so back-navigation fetches fresh results
    if (step === 'spell')   window._spellCheckCache  = null;
    if (step === 'rewrite') window._rewritePanelCache = null;

    // Navigate to the step's viewer tab
    const tabMap = {
      analysis:       'analysis',
      customizations: 'goals',
      rewrite:        'rewrite',
      spell:          'spell',
    };
    if (tabMap[step]) switchTab(tabMap[step]);

    // Clear previous run change markers and reset any active filter before re-marking.
    document.querySelectorAll('.rw-new-item').forEach(el => el.classList.remove('rw-new-item'));
    document.getElementById('rw-changed-filter-btn')?.remove();
    document.getElementById('rewrite-cards')?.classList.remove('filter-changed-only');
    document.querySelectorAll('.cust-changed-filter-btn').forEach(el => el.remove());
    document.getElementById('experience-review-table')?.classList.remove('filter-cust-changed');
    document.getElementById('skills-review-table')?.classList.remove('filter-cust-changed');

    // Mark changed DOM elements after the tab has rendered.
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
 * Count how many items changed between prior and new re-run outputs without
 * touching the DOM — used to include a count in the assistant message before
 * the 300ms-deferred DOM highlight pass runs.
 * Returns {changed, total} or null when the step has no per-entity comparison.
 */
function _countChangedItems(step, priorOutput, newOutput) {
  if (!priorOutput || !newOutput) return null;

  if (step === 'rewrite') {
    const priorIds = new Set((priorOutput.pending_rewrites || []).map(r => String(r.id)));
    const newItems = newOutput.pending_rewrites || [];
    const changed = newItems.filter(item => {
      const id = String(item.id || '');
      const prior = (priorOutput.pending_rewrites || []).find(r => String(r.id) === id);
      return !priorIds.has(id) || (prior && prior.proposed !== item.proposed);
    }).length;
    return { changed, total: newItems.length };
  }

  if (step === 'customizations') {
    const priorExpIds = new Set(
      (priorOutput.customizations?.experience_recommendations || []).map(r => String(r.id))
    );
    const newExpRecs = newOutput.customizations?.experience_recommendations || [];
    const changedExp = newExpRecs.filter(rec => {
      const id = String(rec.id || '');
      const prior = (priorOutput.customizations?.experience_recommendations || [])
        .find(r => String(r.id) === id);
      return !priorExpIds.has(id) || (prior && prior.recommendation !== rec.recommendation);
    }).length;

    const priorSkills = new Set(
      (priorOutput.customizations?.skill_recommendations || []).map(r => (r.skill || '').toLowerCase())
    );
    const newSkillRecs = newOutput.customizations?.skill_recommendations || [];
    const changedSkills = newSkillRecs.filter(rec => {
      const name = (rec.skill || '').toLowerCase();
      const prior = (priorOutput.customizations?.skill_recommendations || [])
        .find(r => (r.skill || '').toLowerCase() === name);
      return !priorSkills.has(name) || (prior && prior.recommendation !== rec.recommendation);
    }).length;

    return {
      changed: changedExp + changedSkills,
      total:   newExpRecs.length + newSkillRecs.length,
    };
  }

  return null;
}

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
    // Offer a filter toggle when some (but not all) cards changed.
    setTimeout(() => {
      const allCards     = document.querySelectorAll('#rewrite-cards .rewrite-card');
      const changedCards = document.querySelectorAll('#rewrite-cards .rw-new-item');
      if (changedCards.length > 0 && changedCards.length < allCards.length) {
        _injectRewriteFilterToggle(changedCards.length);
      }
    }, 0);
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

    // Offer a filter toggle when some (but not all) rows changed.
    setTimeout(() => {
      const expChanged   = document.querySelectorAll('tr[data-exp-id].rw-new-item').length;
      const skillChanged = document.querySelectorAll('tr[data-skill].rw-new-item').length;
      _injectCustomizationsFilterToggle(expChanged, skillChanged);
    }, 0);
    return;
  }
}

/** Inject "Show only changed (N)" filter buttons into the experience and/or skills toolbar. */
function _injectCustomizationsFilterToggle(expCount, skillChanged) {
  _injectTableFilterBtn('experience-review-table', 'experience-table-container', expCount);
  _injectTableFilterBtn('skills-review-table',     'skills-table-container',     skillChanged);
}

function _injectTableFilterBtn(tableId, containerId, count) {
  if (count === 0) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const toolbar = container.querySelector('.bulk-toolbar');
  if (!toolbar || toolbar.querySelector('.cust-changed-filter-btn')) return;

  const table     = document.getElementById(tableId);
  const selector  = tableId === 'experience-review-table' ? 'tr[data-exp-id]' : 'tr[data-skill]';
  const allCount  = table ? table.querySelectorAll(selector).length : 0;
  if (allCount > 0 && count >= allCount) return; // all rows changed — filter adds no value

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bulk-btn cust-changed-filter-btn';
  btn.setAttribute('aria-pressed', 'false');
  btn.textContent = `⬡ Changed (${count})`;
  btn.title = 'Show only rows that changed in this re-run';
  btn.addEventListener('click', () => {
    const active = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!active));
    btn.textContent = !active ? '✕ Show all' : `⬡ Changed (${count})`;
    table?.classList.toggle('filter-cust-changed', !active);
  });
  toolbar.appendChild(btn);
}

/** Apply data-changed attribute and a persistent rw-new-item class for the show-changed filter. */
function _markChanged(el) {
  el.setAttribute('data-changed', 'true');
  el.classList.add('rw-new-item');
  // Remove the animation attribute after it completes; the class persists for filtering.
  setTimeout(() => el.removeAttribute('data-changed'), 2500);
}

/** Inject a "Show only changed (N)" toggle button into the rewrite tally bar after a re-run. */
function _injectRewriteFilterToggle(count) {
  const tally = document.getElementById('rewrite-tally');
  if (!tally || document.getElementById('rw-changed-filter-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'rw-changed-filter-btn';
  btn.className = 'rw-bulk-btn';
  btn.setAttribute('aria-pressed', 'false');
  btn.textContent = `⬡ Changed (${count})`;
  btn.title = 'Show only items that changed in this re-run';
  btn.addEventListener('click', () => {
    const active = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!active));
    btn.textContent = !active ? '✕ Show all' : `⬡ Changed (${count})`;
    document.getElementById('rewrite-cards')?.classList.toggle('filter-changed-only', !active);
  });
  const submitBtn = tally.querySelector('#submit-rewrites-btn');
  submitBtn ? tally.insertBefore(btn, submitBtn) : tally.appendChild(btn);
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

  // Save focus origin for restoration on close (GAP-176)
  if (typeof _focusedElementBeforeModal !== 'undefined') {
    _focusedElementBeforeModal = document.activeElement;
  }

  // Build modal content
  const modal = document.createElement('div');
  modal.id = 'bullet-reorder-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'bullet-reorder-title');
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
          <h3 id="bullet-reorder-title" style="margin:0;color:#1f2937;">↕ Reorder Bullets</h3>
          <div style="color:#6b7280;font-size:0.9em;margin-top:4px;">${expTitle}</div>
        </div>
        <button aria-label="Close reorder dialog"
          onclick="restoreFocus();document.getElementById('bullet-reorder-modal').remove()"
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
        <button class="btn-primary"   onclick="saveBulletOrder('${expId}');restoreFocus()">Save Order</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  if (typeof trapFocus === 'function') trapFocus('bullet-reorder-modal');
  if (typeof setInitialFocus === 'function') setInitialFocus('bullet-reorder-modal');

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      restoreFocus();
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

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
        <button title="Move up" aria-label="Move bullet up"
          onclick="moveBullet(this,-1)"
          style="background:none;border:1px solid #d1d5db;border-radius:3px;
                 cursor:pointer;padding:1px 5px;line-height:1.2;font-size:0.9em;">↑</button>
        <button title="Move down" aria-label="Move bullet down"
          onclick="moveBullet(this,+1)"
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
    restoreFocus();
    document.getElementById('bullet-reorder-modal')?.remove();
  } catch(e) {
    appendRetryMessage('⚠ Network error resetting bullet order: ' + e.message, () => resetBulletOrder(expId));
  }
}

// ── Forward-skip phase watermark (GAP-101) ────────────────────────────────────

// Backend phase ordering (matches conversation_manager.py _PHASE_ORDER).
const _PHASE_PROGRESSION = [
  'init', 'job_analysis', 'customization', 'rewrite_review',
  'spell_check', 'generation', 'layout_review', 'final_generation', 'refinement',
];

// Minimum highestPhase index required for each step to be forward-skippable.
const _STEP_FWD_PHASE_MIN = {
  analysis:       1,   // job_analysis
  customizations: 2,   // customization
  rewrite:        3,   // rewrite_review
  spell:          4,   // spell_check
  layout:         5,   // generation
  download:       7,   // final_generation
  cover_letter:   7,
  screening:      7,
  interview_prep: 7,
  thank_you:      7,
  finalise:       7,
  harvest:        7,
};

// ── Workflow step bar ─────────────────────────────────────────────────────────

function updateWorkflowSteps(status) {
  // 12-step workflow bar: Job Input → Analysis → Customise → Rewrites →
  //   Spell Check → Layout Review → Download → Cover Letter → Screening →
  //   Interview Prep → Thank You → Harvest
  //
  const UPCOMING = new Set();

  // Steps that support LLM re-execution via /api/re-run-phase
  const RE_RUN_STEPS = new Set(['analysis', 'customizations', 'rewrite', 'spell', 'layout']);

  // Base label for each step (used when injecting ↻ button)
  const STEP_LABELS = {
    job:            '📥 Job Input',
    analysis:       '🔍 Analysis',
    customizations: '⚙️ Customise',
    rewrite:        '✏️ Rewrites',
    spell:          '🔤 Spell Check',
    layout:         '🎨 Layout Review',
    download:       '⬇️ Download Files',
    cover_letter:   '📩 Cover Letter',
    screening:      '📋 Screening',
    interview_prep: '🎤 Interview Prep',
    thank_you:      '🙏 Thank You',
    finalise:       '✅ Finalise',
    harvest:        '🌾 Update Master CV',
  };

  // Determine which steps are done based on session state fields.
  const phase = status.phase || '';
  // All post-layout phases unlock simultaneously once layout is confirmed.
  const postLayout = phase === PHASES.FINAL_GENERATION || phase === PHASES.REFINEMENT;
  const done = {
    job:            !!status.job_description,
    analysis:       !!status.job_analysis,
    customizations: !!status.customizations,
    rewrite:        phase !== PHASES.REWRITE_REVIEW && (!!status.customizations),
    spell:          phase === PHASES.GENERATION || phase === PHASES.LAYOUT_REVIEW ||
                    phase === PHASES.FINAL_GENERATION || phase === PHASES.REFINEMENT,
    layout:         postLayout,
    download:       postLayout,
    cover_letter:   postLayout,
    screening:      postLayout,
    interview_prep: postLayout,
    thank_you:      postLayout,
    finalise:       postLayout,
    harvest:        postLayout,
  };

  // Forward-skip watermark (GAP-101): steps previously reached but not currently
  // "done" according to the current phase are still navigable with a confirmation.
  const highestPhaseIdx = _PHASE_PROGRESSION.indexOf(status.highest_phase || '');
  const currentPhaseIdx = _PHASE_PROGRESSION.indexOf(phase);

  // Determine the active step from the backend phase string.
  const phaseToStep = {
    'init':             'job',
    'job_analysis':     'analysis',
    'customization':    'customizations',
    'rewrite_review':   'rewrite',
    'spell_check':      'spell',
    'generation':       'layout',
    'layout_review':    'layout',
    'final_generation': 'download',
    'refinement':       'download',
  };
  const activeStep = phaseToStep[phase] || 'job';

  // Resolve the reentry step for the "Refining" badge
  const _phaseToStep2 = Object.assign({'init': 'job'}, phaseToStep);
  const reentryStep = status.iterating
    ? (_phaseToStep2[status.reentry_phase] || status.reentry_phase || null)
    : null;

  const stepIds = [
    'job', 'analysis', 'customizations', 'rewrite', 'spell', 'layout',
    'download', 'cover_letter', 'screening', 'interview_prep', 'thank_you', 'finalise', 'harvest',
  ];
  const staleSteps = new Set(status.stale_steps || []);
  stateManager.setStaleSteps(staleSteps);
  stepIds.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;
    // Upcoming steps are fixed — never change their class.
    if (UPCOMING.has(step)) return;
    el.classList.remove('active', 'completed', 'clickable', 'upcoming', 'stale', 'forward-skip');

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
      // Add ↻ re-run button for steps that support LLM re-execution
      if (RE_RUN_STEPS.has(step)) {
        const rerunLabel = _STEP_DISPLAY[step] || step;
        label += ` <button class="step-rerun" aria-label="Re-run ${rerunLabel}"
          title="Re-run ${step} with updated inputs"
          onclick="event.stopPropagation();confirmReRunPhase('${step}')"
          style="font-size:0.8em;opacity:0.55;transition:opacity 0.15s;margin-left:2px;cursor:pointer;background:none;border:none;padding:0;color:inherit;line-height:1;">↻</button>`;
      }
    } else if (highestPhaseIdx >= 0 && (_STEP_FWD_PHASE_MIN[step] ?? Infinity) <= highestPhaseIdx
               && highestPhaseIdx > currentPhaseIdx) {
      // Forward-skip: step was completed in a prior iteration but is ahead of current phase.
      el.classList.add('forward-skip', 'clickable');
      label += ' <span class="step-inline-badge step-fwd-badge" title="Previously completed — click to jump ahead">⏩</span>';
    }

    // Apply stale class for steps downstream of a re-run
    if (staleSteps.has(step)) el.classList.add('stale');

    // Append sr-only state description for screen reader users
    const isStale         = staleSteps.has(step);
    const isStaleCritical = el.classList.contains('stale-critical');
    const isActive        = el.classList.contains('active');
    const isCompleted     = el.classList.contains('completed');
    const isFwdSkip       = el.classList.contains('forward-skip');
    const srState = isStaleCritical ? ' (critical — review required)'
      : isStale     ? ' (stale — results may be outdated)'
      : isActive    ? ' (current step)'
      : isCompleted ? ' (completed)'
      : isFwdSkip   ? ' (previously completed — click to jump ahead)'
      : '';
    if (srState) label += `<span class="sr-only">${srState}</span>`;

    el.innerHTML = label;
  });

  applyLayoutFreshnessNavigationState();

  // Show ↻ icons via CSS :hover on the parent .completed step
  // (inject a <style> only once)
  if (!document.getElementById('step-rerun-style')) {
    const s = document.createElement('style');
    s.id = 'step-rerun-style';
    s.textContent = '.step.completed:hover .step-rerun, .step.completed:focus-within .step-rerun { opacity: 1 !important; } .step-rerun:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; opacity: 1 !important; }';
    document.head.appendChild(s);
  }

  // Sync second-bar tab visibility and action buttons to the active workflow step
  if (typeof updateTabBarForStage === 'function') {
    updateTabBarForStage(activeStep);
  }
  updateActionButtons(activeStep);

  // Sync view-cursor ring to the currently visible tab
  _updateViewingIndicator(stateManager.getCurrentTab());
}

if (typeof window !== 'undefined') {
  window.addEventListener(GENERATION_STATE_EVENT, applyLayoutFreshnessNavigationState);
  window.addEventListener(GENERATION_STATE_EVENT, applyDirtyPhaseNavigationState);
}

/**
 * Mark or unmark workflow step pills as stale based on dirty phases set by
 * layout-phase content edits (POST /api/cv/apply-content-changes).
 *
 * Only affects steps listed in stateManager.getDirtyPhases() that are NOT
 * already handled by applyLayoutFreshnessNavigationState (i.e. not 'layout').
 */
function applyDirtyPhaseNavigationState() {
  const dirtyPhases = stateManager.getDirtyPhases();
  const stepsToClear = [];    // steps we manage here (not 'layout')

  stepsToClear.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;

    const isDirty = dirtyPhases.includes(step);
    el.classList.toggle('stale', isDirty);

    // Preserve existing rerun button markup, update text + badge
    const rerunHtml = el.querySelector('.step-rerun')?.outerHTML || '';
    const label     = _STEP_DISPLAY[step] || step;
    const badge     = isDirty
      ? ' <span class="step-inline-badge step-stale-badge">Content changed</span>'
      : '';
    el.innerHTML = `${label}${badge}${rerunHtml ? ` ${rerunHtml}` : ''}`;
  });
}

// ── Step navigation helper ────────────────────────────────────────────────────

function _doStepNavigate(step) {
  const stepToTab = {
    analysis:       'analysis',
    customizations: 'goals',
    rewrite:        'rewrite',
    spell:          'spell',
    layout:         'layout',
    download:       'final_generate',
    cover_letter:   'cover-letter',
    screening:      'screening',
    interview_prep: 'interview-prep',
    thank_you:      'thank-you',
    finalise:       'finalise',
    harvest:        'harvest',
  };
  const tabName = stepToTab[step];
  if (!tabName) return;
  if (typeof updateTabBarForStage === 'function') updateTabBarForStage(step);
  switchTab(tabName);
}

// ── Step click (back-nav) ─────────────────────────────────────────────────────

// Back-navigation: clicking a completed workflow step navigates to its viewer tab.
// Clicking the job step always opens the load-job panel.
function handleStepClick(step) {
  const el = document.getElementById(`step-${step}`);
  if (!el) return;

  // Job step: show job content if a job is loaded, otherwise open the load panel.
  if (step === 'job') {
    if (el.classList.contains('completed') || el.classList.contains('active')) {
      switchTab('job');
    } else {
      showLoadJobPanel();
    }
    return;
  }

  // Forward-skip: previously reached stage that is ahead of current phase.
  if (el.classList.contains('forward-skip')) {
    const label = _STEP_DISPLAY[step] || step;
    if (typeof confirmDialog === 'function') {
      confirmDialog(
        `Jump ahead to ${label}?\n\nIntermediate stages may need re-running if you make changes here.`,
        { confirmLabel: 'Jump ahead', cancelLabel: 'Stay here' }
      ).then(confirmed => { if (confirmed) _doStepNavigate(step); });
    } else {
      _doStepNavigate(step);
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
    customizations: 'goals',
    rewrite:        'rewrite',
    spell:          'spell',
    layout:         'layout',
    download:       'final_generate',
    cover_letter:   'cover-letter',
    screening:      'screening',
    interview_prep: 'interview-prep',
    thank_you:      'thank-you',
    finalise:       'finalise',
    harvest:        'harvest',
  };
  const tabName = stepToTab[step];
  if (!tabName) return;

  const doNavigate = () => {
    if (typeof updateTabBarForStage === 'function') updateTabBarForStage(step);
    switchTab(tabName);
  };

  // Show a downstream-awareness dialog when back-navigating to a completed step
  // that has downstream completed steps (not when the step is active).
  if (el.classList.contains('completed') && !el.classList.contains('active')) {
    const stepIdx = _STEP_ORDER.indexOf(step);
    const hasDownstreamCompleted = _STEP_ORDER.slice(stepIdx + 1).some(s => {
      const downstream = document.getElementById(`step-${s}`);
      return downstream && downstream.classList.contains('completed');
    });
    if (hasDownstreamCompleted) {
      _showReRunConfirmModal(step, 'back-nav', doNavigate);
      return;
    }
  }

  doNavigate();
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  _STEP_ORDER,
  _STEP_DISPLAY,
  _ACTION_LABELS,
  _STEP_DESCRIPTIONS,
  backToPhase,
  _showReRunConfirmModal,
  _showAnalysisClarificationAmendModal,
  confirmReRunPhase,
  reRunPhase,
  _executeReRunPhase,
  _getStepTooltip,
  _updateViewingIndicator,
  _highlightChangedItems,
  _markChanged,
  _injectCustomizationsFilterToggle,
  _injectTableFilterBtn,
  applyLayoutFreshnessNavigationState,
  applyDirtyPhaseNavigationState,
  showBulletReorder,
  _applyBulletOrder,
  moveBullet,
  _updateBulletArrows,
  saveBulletOrder,
  resetBulletOrder,
  updateWorkflowSteps,
  handleStepClick,
};
