// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/review-table-base.js
 * Tab switching, analysis tab, customization response handler, review-pane
 * coordination, and the page-estimate widget.
 *
 * Dependencies (all resolved through globalThis at runtime):
 *   appendMessage, saveTabData, cleanJsonResponse, escapeHtml,
 *   getStageForTab, updateTabBarForStage, updateActionButtons,
 *   populateJobTab, populateQuestionsTab, buildAchievementsEditor,
 *   renderRewritePanel, populateCVEditorTab,
 *   populateDownloadTab, populateSpellCheckTab, initiateLayoutInstructions,
 *   populateFinaliseTab, populateMasterTab, populateCoverLetterTab,
 *   populateScreeningTab, extractFirstJsonObject,
 *   fetchStatus, apiCall,
 *   buildExperienceReviewTable, buildSkillsReviewTable,
 *   buildAchievementsReviewTable, buildSummaryFocusSection,
 *   buildPublicationsReviewTable, getExperienceDetails,
 *   getExperienceRecommendation, achievementDecisions
 */

import { getLogger } from './logger.js';
const log = getLogger('review-table-base');

import { stateManager } from './state-manager.js';

// ── Module-level state ────────────────────────────────────────────────────

let userSelections = {
  experiences: {},  // exp_id -> 'emphasize'|'include'|'de-emphasize'|'exclude'
  skills: {}        // skill_name -> 'emphasize'|'include'|'de-emphasize'|'exclude'
};
let pageEstimateTimer = null;
let pageEstimateRequestId = 0;

// Draft input cache – preserves user-typed values across tab switches
const _draftInputs = {};

function _saveDraftInputsForTab(tabName) {
  if (!tabName) return;
  const content = document.getElementById('document-content');
  if (!content) return;
  const saved = {};
  content.querySelectorAll('textarea, input, select').forEach(el => {
    if (!el.id || el.type === 'file') return;
    saved[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
  });
  if (Object.keys(saved).length > 0) {
    _draftInputs[tabName] = saved;
  }
}

function _restoreDraftInputsForTab(tabName) {
  const cached = _draftInputs[tabName];
  if (!cached) return;
  Object.entries(cached).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el || el.readOnly || el.disabled || el.type === 'file') return;
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = value;
    } else {
      el.value = value;
    }
  });
}

function ensureTabDataState() {
  return stateManager.getAllTabData();
}

function isReconnectInProgress() {
  return stateManager.isReconnecting();
}

// ── Inclusion counts ──────────────────────────────────────────────────────

function updateInclusionCounts() {
  try {
    const expDecs = (window._savedDecisions && window._savedDecisions.experience_decisions) || userSelections.experiences || {};
    const skillDecs = (window._savedDecisions && window._savedDecisions.skill_decisions) || userSelections.skills || {};
    const achDecs = (window._savedDecisions && window._savedDecisions.achievement_decisions) || window.achievementDecisions || {};

    const expIncluded = Object.values(expDecs).filter(v => v !== 'exclude').length;
    const skillIncluded = Object.values(skillDecs).filter(v => v !== 'exclude').length;
    const achIncluded = Object.values(achDecs).filter(v => v !== 'exclude').length;

    const expTab = document.getElementById('tab-exp-review');
    const skillTab = document.getElementById('tab-skills-review');
    const achTab = document.getElementById('tab-achievements-review');

    if (expTab) expTab.textContent = `📊 Experiences${expIncluded ? ' (' + expIncluded + ')' : ''}`;
    if (skillTab) skillTab.textContent = `🛠️ Skills${skillIncluded ? ' (' + skillIncluded + ')' : ''}`;
    if (achTab) achTab.textContent = `🏆 Achievements${achIncluded ? ' (' + achIncluded + ')' : ''}`;
  } catch (e) { log.warn('Failed to update inclusion counts:', e); }
}

// ── Tab switching ─────────────────────────────────────────────────────────

// Tracks which customise-stage sub-tabs have been viewed this session (GAP-269).
const _visitedCustomiseTabs = new Set();
const _CUSTOMISE_TABS = new Set(['goals', 'questions', 'exp-review', 'ach-editor', 'skills-review', 'achievements-review', 'tagline-review', 'summary-review', 'publications-review', 'ats-score']);

function _updateVisitedTabIndicators() {
  _visitedCustomiseTabs.forEach(name => {
    const el = document.getElementById(`tab-${name}`);
    if (el) el.classList.add('tab--visited');
  });
}

function switchTab(tab) {
  // Save unsaved user input from the tab we are leaving
  _saveDraftInputsForTab(stateManager.getCurrentTab());

  // Sync second-bar visibility to this tab's stage
  if (typeof getStageForTab === 'function' && typeof updateTabBarForStage === 'function') {
    const tabStage = getStageForTab(tab);
    if (tabStage) {
      updateTabBarForStage(tabStage);
      updateActionButtons(tabStage);
    }
  }
  // Always update workflow clickable state using current phase
  if (typeof stateManager?.getPhase === 'function' && typeof updateWorkflowStepsClickable === 'function') {
    updateWorkflowStepsClickable(stateManager.getPhase());
  }

  // Update active tab, ARIA state, and roving tabindex (WCAG 2.1 tablist pattern)
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    activeTab.setAttribute('tabindex', '0');
    const tabpanel = document.getElementById('document-content');
    if (tabpanel) tabpanel.setAttribute('aria-labelledby', `tab-${tab}`);
  }
  stateManager.setCurrentTab(tab);

  // Mark this tab as visited and refresh the visited indicators (GAP-269)
  if (_CUSTOMISE_TABS.has(tab)) {
    _visitedCustomiseTabs.add(tab);
    _updateVisitedTabIndicators();
  }

  // Announce the tab change to screen readers (GAP-73)
  const announcer = document.getElementById('workflow-stage-announcer');
  if (announcer && activeTab) {
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = `Now viewing: ${activeTab.textContent.trim()}`; }, 50);
  }

  // Sync view-cursor ring to the newly visible tab
  if (typeof _updateViewingIndicator === 'function') _updateViewingIndicator(tab);

  // All tabs except 'cv' use full-width layout (no paper-sized centering)
  const content = document.getElementById('document-content');
  content.classList.toggle('full-width', tab !== 'generate');

  // Load content for tab
  loadTabContent(tab);
}

async function loadTabContent(tab) {
  const content = document.getElementById('document-content');
  const tabData = ensureTabDataState();

  switch (tab) {
    case 'job':
      await populateJobTab();
      break;
    case 'goals':
      if (typeof populateGoalsTab === 'function') await populateGoalsTab();
      break;
    case 'analysis':
      if (tabData.analysis) {
        populateAnalysisTab(tabData.analysis);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><h3>Job Analysis</h3><p>Click "Analyze Job" to generate analysis</p></div>';
      }
      break;
    case 'questions':
      populateQuestionsTab();
      break;
    case 'customizations':
      switchTab('exp-review');
      return;
    case 'exp-review':
      await populateReviewTab('experiences');
      break;
    case 'ach-editor':
      await buildAchievementsEditor();
      break;
    case 'skills-review':
      await populateReviewTab('skills');
      break;
    case 'achievements-review':
      await populateReviewTab('achievements');
      break;
    case 'tagline-review':
      await populateTaglineReviewTab();
      break;
    case 'summary-review':
      await populateReviewTab('summary');
      break;
    case 'publications-review':
      await populateReviewTab('publications');
      break;
    case 'ats-score':
      if (typeof populateAtsScoreTab === 'function') await populateAtsScoreTab();
      break;
    case 'rewrite':
      if (window._rewritePanelCache) {
        renderRewritePanel(
          window._rewritePanelCache.rewrites,
          window._rewritePanelCache.warnings,
        );
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">✏️</div><h3>Rewrites</h3><p>Loading rewrites…</p></div>';
        try {
          const data = await apiCall('GET', '/api/rewrites');
          if (data.rewrites) {
            renderRewritePanel(data.rewrites, data.persuasion_warnings || []);
          } else {
            content.innerHTML = '<div class="empty-state"><div class="icon">✏️</div><h3>Rewrites</h3><p>Complete customizations to reach this step</p></div>';
          }
        } catch (e) {
          content.innerHTML = '<div class="empty-state"><div class="icon">✏️</div><h3>Rewrites</h3><p>Complete customizations to reach this step</p></div>';
        }
      }
      break;
    case 'editor':
      await populateCVEditorTab();
      break;
    case 'download':
      if (tabData.cv && Object.keys(tabData.cv).length > 0) {
        await populateDownloadTab(tabData.cv);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">⬇️</div><h3>Download</h3><p>Generate CV to enable downloads</p></div>';
      }
      break;
    case 'spell':
      await populateSpellCheckTab();
      break;
    case 'layout':
      initiateLayoutInstructions();
      break;
    case 'finalise':
      await populateFinaliseTab();
      break;
    case 'harvest':
      if (typeof populateHarvestTab === 'function') await populateHarvestTab();
      break;
    case 'interview-prep':
      if (typeof populateInterviewPrepTab === 'function') await populateInterviewPrepTab();
      break;
    case 'thank-you':
      if (typeof populateThankYouTab === 'function') await populateThankYouTab();
      break;
    case 'master':
      await populateMasterTab();
      break;
    case 'cover-letter':
      await populateCoverLetterTab();
      break;
    case 'screening':
      await populateScreeningTab();
      break;
  }

  // Restore unsaved user input for the newly loaded tab
  _restoreDraftInputsForTab(tab);
}

// ── Review tab (flat, one pane per top-level tab) ─────────────────────────

async function showTableBasedReview() {
  if (!window.pendingRecommendations) {
    appendMessage('assistant', 'No recommendations to review. Please generate customizations first.');
    return;
  }

  switchTab('exp-review');
  appendMessage('assistant', '✅ Customizations generated! Please review each section in the **Customizations** tab — Experiences, Achievements, Skills, Summary, and Publications. Select your preferences using the action buttons, then submit your decisions.');
}

// ── Analysis tab ──────────────────────────────────────────────────────────

// Cached synonym map: alias (lower) → canonical, and canonical (lower) → [aliases]
let _synonymMapCache = null;
async function _loadSynonymMap() {
  if (_synonymMapCache) return _synonymMapCache;
  try {
    const sessionId = stateManager.getSessionId && stateManager.getSessionId();
    const url = sessionId ? `/api/synonym-map?session_id=${encodeURIComponent(sessionId)}` : '/api/synonym-map';
    const res  = await fetch(url);
    if (!res.ok) return (_synonymMapCache = {});
    const raw  = await res.json();
    const aliasToCanon = {};
    const canonToAliases = {};
    Object.entries(raw).forEach(([alias, canon]) => {
      aliasToCanon[alias.toLowerCase()] = canon;
      const cl = canon.toLowerCase();
      (canonToAliases[cl] = canonToAliases[cl] || []).push(alias);
    });
    _synonymMapCache = { aliasToCanon, canonToAliases };
  } catch (_) { _synonymMapCache = {}; }
  return _synonymMapCache;
}

function _kwSynonymAnnotation(kw, synMap) {
  if (!synMap || (!synMap.aliasToCanon && !synMap.canonToAliases)) return '';
  const kl = kw.toLowerCase();
  // Is kw an alias? Show canonical form.
  if (synMap.aliasToCanon[kl]) return ` = ${synMap.aliasToCanon[kl]}`;
  // Is kw a canonical form? Show aliases.
  const aliases = synMap.canonToAliases && synMap.canonToAliases[kl];
  if (aliases && aliases.length) return ` (${aliases.join(', ')})`;
  return '';
}

async function populateAnalysisTab(result) {
  const content = document.getElementById('document-content');
  try {
    // result may already be a parsed object (e.g. coming from stateManager) or a
    // raw JSON string.  cleanJsonResponse only handles strings, so skip it when
    // the value is already an object to avoid "cleaned.replace is not a function".
    let data;
    if (result !== null && typeof result === 'object') {
      data = result;
    } else {
      const cleanResult = cleanJsonResponse(result);
      data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;
    }

    // Persist only after the analysis payload has been validated.
    stateManager.setTabData('analysis', result);
    saveTabData();

    // ── Section 1: Role & Domain card ────────────────────────────────────
    let html = '<div class="analysis-page">';
    html += '<div class="analysis-role-card">';
    html += `<h1>${data.title || 'Role'}</h1>`;
    if (data.company) html += `<p class="company">🏢 ${data.company}</p>`;
    html += '<div class="meta">';
    if (data.domain) {
      const conf = data.domain_confidence;
      let confLabel = '';
      let confTitle = '';
      if (typeof conf === 'number') {
        if (conf >= 0.8) { confLabel = ''; confTitle = `Domain confidence: High (${Math.round(conf * 100)}%)`; }
        else if (conf >= 0.6) { confLabel = ' ⚠'; confTitle = `Domain confidence: Medium (${Math.round(conf * 100)}%) — verify this is correct`; }
        else { confLabel = ' ⚠'; confTitle = `Domain confidence: Low (${Math.round(conf * 100)}%) — the JD spans multiple domains; consider overriding`; }
      }
      html += `<span class="meta-chip" title="${escapeHtml(confTitle || 'Inferred technical domain')}">🔬 ${escapeHtml(data.domain)}${confLabel}</span>`;
    }
    if (data.role_level) html += `<span class="meta-chip">📊 ${data.role_level}</span>`;
    if (data.suggested_summary) html += `<span class="meta-chip">💬 ${data.suggested_summary}</span>`;
    html += '</div></div>';

    // ── Mismatch callout (computed from master skills) ────────────────────
    const requiredSkills = Array.isArray(data.required_skills) ? data.required_skills : [];
    const masterSkills = window._masterSkills || [];
    if (requiredSkills.length > 0 && masterSkills.length > 0) {
      const missing = requiredSkills.filter(skill =>
        !masterSkills.some(ms => ms.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms))
      );
      if (missing.length > 0) {
        html += `<div class="mismatch-callout">⚠ <strong>${missing.length} required skill${missing.length > 1 ? 's' : ''} not found in your master CV:</strong> ${missing.join(', ')}</div>`;
      }
    }

    // ── Section 2: Required Skills grid ──────────────────────────────────
    if (requiredSkills.length > 0) {
      html += '<div class="analysis-section"><h2>🎯 Required Skills</h2><div class="skill-grid">';
      requiredSkills.forEach(skill => {
        const isMissing = masterSkills.length > 0 && !masterSkills.some(
          ms => ms.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms)
        );
        html += `<span class="skill-badge${isMissing ? ' missing' : ''}" title="${isMissing ? 'Not in master CV' : 'Found in master CV'}">${skill}${isMissing ? '<span class="sr-only"> (not in master CV)</span>' : ''}</span>`;
      });
      html += '</div></div>';
    }

    // ── Section 3: Preferred / Nice-to-Have list ─────────────────────────
    const preferred = [
      ...(Array.isArray(data.preferred_skills) ? data.preferred_skills : []),
      ...(Array.isArray(data.nice_to_have_requirements) ? data.nice_to_have_requirements : []),
    ];
    if (preferred.length > 0) {
      html += '<div class="analysis-section"><h2>⭐ Preferred / Nice-to-Have</h2><ul class="preferred-list">';
      preferred.forEach(item => { html += `<li>${item}</li>`; });
      html += '</ul></div>';
    }

    // ── Section 4: ATS Keywords with rank badges and synonym annotations ──
    const atsKws = Array.isArray(data.ats_keywords) ? data.ats_keywords : [];
    if (atsKws.length > 0) {
      const synMap = await _loadSynonymMap();
      html += '<div class="analysis-section"><h2>🔑 ATS Keywords <small style="font-weight:400;color:#64748b;font-size:12px;">(higher rank = higher priority)</small></h2><div class="kw-badges">';
      atsKws.forEach((kw, idx) => {
        const annotation = _kwSynonymAnnotation(kw, synMap);
        const titleAttr  = annotation ? ` title="Synonym: ${escapeHtml(kw + annotation)}"` : '';
        const annotHtml  = annotation ? `<span style="font-size:10px;color:#64748b;margin-left:3px;">${escapeHtml(annotation)}</span>` : '';
        html += `<span class="kw-badge"${titleAttr}><span class="kw-rank">#${idx + 1}</span>${escapeHtml(kw)}${annotHtml}</span>`;
      });
      html += '</div></div>';
    }

    // ── Culture indicators (optional) ────────────────────────────────────
    const culture = Array.isArray(data.culture_indicators) ? data.culture_indicators : [];
    if (culture.length > 0) {
      html += '<div class="analysis-section"><h2>🏢 Culture Indicators</h2><ul class="preferred-list">';
      culture.forEach(c => { html += `<li>${c}</li>`; });
      html += '</ul></div>';
    }

    // ── Must-have requirements ────────────────────────────────────────────
    const mustHave = Array.isArray(data.must_have_requirements) ? data.must_have_requirements : [];
    if (mustHave.length > 0) {
      html += '<div class="analysis-section"><h2>✅ Must-Have Requirements</h2><ul class="preferred-list">';
      mustHave.forEach(r => { html += `<li>${r}</li>`; });
      html += '</ul></div>';
    }

    html += '<div class="nav-buttons nav-end"><button class="continue-btn" onclick="sendAction(\u0027recommend_customizations\u0027)">Continue to Customizations →</button></div>';
    html += '</div>'; // .analysis-page
    content.innerHTML = html;
  } catch (e) {
    log.error('Analysis parsing error:', e, 'Original result:', result);
    content.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Analysis Error</h3><p>Could not parse analysis results: ${escapeHtml(e.message)}</p><details><summary>Debug Info</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details></div>`;
  }
}

// ── Customization response handler ────────────────────────────────────────

async function handleCustomizationResponse(response) {
  try {
    // Accept a pre-parsed object or a raw string (parse at boundary).
    const data = (response !== null && typeof response === 'object')
      ? response
      : extractFirstJsonObject(response);
    if (!data) {
      appendMessage('assistant', typeof response === 'string' ? response : '');
      return;
    }

    if (data && (data.recommended_experiences || data.recommended_skills)) {
      stateManager.setTabData('customizations', data);
      window.pendingRecommendations = data;
      saveTabData();

      if (!isReconnectInProgress()) {
        appendMessage('assistant', '✅ Customizations generated! Please review each section in the **Customizations** tab — Experiences, Achievements, Skills, Summary, and Publications. Select your preferences using the action buttons, then submit your decisions.');
        switchTab('exp-review');
      }
    } else if (!isReconnectInProgress()) {
      appendMessage('assistant', response);
    }
  } catch (e) {
    log.error('Customization response error:', e);
    if (!isReconnectInProgress()) {
      appendMessage('assistant', response);
    }
  }
}

/**
 * Sync the skills-title select/custom-input controls to a given title value,
 * and attach change listeners so updates are saved via the API.
 * duckflow:
 *   id: generation_settings.web_review_table_base.L330
 *   kind: ui
 *   timestamp: '2026-03-27T01:23:28Z'
 *   status: live
 *   handles:
 *   - ui:generation-settings.sync-skills-title
 *   calls:
 *   - POST /api/generation-settings
 *   reads:
 *   - response:GET /api/status.skills_section_title
 *   writes:
 *   - request:POST /api/generation-settings.skills_section_title
 *   notes: Keeps the UI skills-title controls in sync with status data and persists title changes back to the session settings route.
 */
function _syncSkillsTitleControls(currentTitle) {
  const knownOptions = ['Skills', 'Technical Skills', 'Key Skills', 'Core Skills'];
  const sel  = document.getElementById('skills-title-select');
  const cust = document.getElementById('skills-title-custom');
  if (!sel) return;

  const isKnown = knownOptions.includes(currentTitle);
  if (isKnown) {
    sel.value = currentTitle;
    if (cust) cust.style.display = 'none';
  } else {
    sel.value = '__custom__';
    if (cust) {
      cust.style.display = '';
      cust.value = currentTitle;
    }
  }

  const saveTitle = async (title) => {
    try { await apiCall('POST', '/api/generation-settings', { skills_section_title: title }); }
    catch (e) { log.warn('Failed to save skills_section_title setting:', e); }
  };

  sel.addEventListener('change', () => {
    if (sel.value === '__custom__') {
      if (cust) { cust.style.display = ''; cust.focus(); }
    } else {
      if (cust) cust.style.display = 'none';
      saveTitle(sel.value);
    }
  });

  if (cust) {
    cust.addEventListener('change', () => {
      const v = cust.value.trim();
      if (v) saveTitle(v);
    });
  }
}

/**
 * Renders one of the 5 review panes as a top-level tab.
 * Replaces the old sub-tab approach with a flat single-level tab structure.
 */
async function populateReviewTab(pane) {
  const content = document.getElementById('document-content');
  const customizations = stateManager.getTabData('customizations');

  if (!window.pendingRecommendations || !customizations) {
    content.innerHTML = '<div class="empty-state"><div class="icon">⚙️</div><h3>Review Customizations</h3><p>Click "Recommend Customizations" to generate recommendations.</p></div>';
    return;
  }

  const paneConfig = {
    experiences:   { title: '', desc: 'Sorted by date (most recent first). Click action buttons to override recommendations.',         container: 'experience-table-container'   },
    skills:        { title: '🛠️ Skills',           desc: 'Sorted by relevance. Select how to feature each skill.',                             container: 'skills-table-container'       },
    achievements:  { title: '🏆 Achievements',      desc: 'Select how to feature each key achievement. AI recommendations are pre-selected.',  container: 'achievements-table-container'  },
    summary:       { title: '📝 Professional Summary', desc: 'Select which professional summary to use. The AI\'s recommendation is pre-selected.', container: 'summary-focus-container'    },
    publications:  { title: '📄 Publications',      desc: 'All publications ranked by relevance. Accept or reject each for your CV.',          container: 'publications-table-container' },
  };
  const cfg = paneConfig[pane] || {};

  const headerHtml = pane === 'experiences' ? `
    <h1>⚙️ Review Customization Recommendations</h1>
    <p style="color:#6b7280;margin-bottom:16px;">Review the AI's recommendations. Use the action buttons to adjust each item, then save your decisions before generating the CV.</p>
    <div id="page-estimate-widget" class="page-estimate ok">
      <span id="pe-icon">📄</span>
      <span id="pe-label">Estimated length: calculating…</span>
      <div class="pe-bar"><div class="pe-fill" id="pe-fill" style="width:0%;background:#86efac;"></div></div>
    </div>
  ` : (cfg.title ? `<h2 style="margin:0 0 12px;">${cfg.title}</h2>` : '');

  const navBack = {
    skills:       `<button class="back-btn" onclick="switchTab('ach-editor')">← Back to Experience Bullets</button>`,
    achievements: `<button class="back-btn" onclick="switchTab('skills-review')">← Back to Skills</button>`,
    publications: `<button class="back-btn" onclick="switchTab('summary-review')">← Back to Summary</button>`,
  };
  const navContinue = {
    experiences:  `<button class="continue-btn" onclick="submitExperienceDecisions()">Continue to Experience Bullets →</button>`,
    skills:       `<button class="continue-btn" onclick="submitSkillDecisions()">Continue to Achievements →</button>`,
    achievements: `<button class="continue-btn" onclick="submitAchievementDecisions()">Continue to Tagline →</button>`,
    publications: `<button class="continue-btn" onclick="submitPublicationDecisions()">Continue to Rewrite →</button>`,
  };
  const navHtml = pane === 'summary' ? '' : `
    <div class="nav-buttons${pane === 'experiences' ? ' nav-end' : ''}" style="margin:16px 0;">
      ${navBack[pane] || ''}
      ${navContinue[pane] || ''}
    </div>`;

  content.innerHTML = `
    ${headerHtml}
    ${cfg.desc ? `<p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">${escapeHtml(cfg.desc)}</p>` : ''}
    <div id="${cfg.container}"></div>
    ${navHtml}
  `;

  window._activeReviewPane = pane;
  switch (pane) {
    case 'experiences':
      await buildExperienceReviewTable();
      _updatePageEstimate();
      break;
    case 'skills':
      await buildSkillsReviewTable();
      break;
    case 'achievements':
      await buildAchievementsReviewTable();
      break;
    case 'summary':
      await buildSummaryFocusSection();
      break;
    case 'publications':
      await buildPublicationsReviewTable();
      break;
  }
}

// Track which pane is currently active
window._activeReviewPane = 'experiences';

async function switchReviewSubtab(pane) {
  // Update button states
  document.querySelectorAll('.review-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pane === pane);
  });

  // Hide all panes, show the selected one
  document.querySelectorAll('.review-pane').forEach(p => p.style.display = 'none');
  const target = document.getElementById(`review-pane-${pane}`);
  if (target) target.style.display = 'block';

  window._activeReviewPane = pane;

  // Lazy-load pane content on first visit
  if (!window._reviewPaneLoaded || !window._reviewPaneLoaded[pane]) {
    await _loadReviewPane(pane);
  }
}

async function _loadReviewPane(pane) {
  if (!window._reviewPaneLoaded) window._reviewPaneLoaded = {};
  try {
    switch (pane) {
      case 'experiences':   await buildExperienceReviewTable();  break;
      case 'skills':        await buildSkillsReviewTable();       break;
      case 'achievements':  await buildAchievementsReviewTable(); break;
      case 'summary':       await buildSummaryFocusSection();     break;
      case 'publications':  await buildPublicationsReviewTable(); break;
      default: return;
    }
    window._reviewPaneLoaded[pane] = true;
  } catch (error) {
    delete window._reviewPaneLoaded[pane];
    throw error;
  }
}

// ── Page-estimate widget ──────────────────────────────────────────────────

function _updatePageEstimate() {
  const widget = document.getElementById('page-estimate-widget');
  if (!widget) return;

  const label = document.getElementById('pe-label');
  const fill = document.getElementById('pe-fill');
  const icon = document.getElementById('pe-icon');

  if (label) label.textContent = 'Updating server layout estimate…';
  if (fill) fill.style.width = '0%';
  if (icon) icon.textContent = '⏳';

  const payload = {
    experience_decisions: {
      ...((window._savedDecisions && window._savedDecisions.experience_decisions) || {}),
      ...(userSelections.experiences || {}),
    },
    skill_decisions: {
      ...((window._savedDecisions && window._savedDecisions.skill_decisions) || {}),
      ...(userSelections.skills || {}),
    },
    achievement_decisions: (
      (window._savedDecisions && window._savedDecisions.achievement_decisions)
      || window.achievementDecisions
      || {}
    ),
    publication_decisions: (
      (window._savedDecisions && window._savedDecisions.publication_decisions)
      || window.publicationDecisions
      || {}
    ),
    summary_focus_override: window.selectedSummaryKey || null,
  };

  const requestId = ++pageEstimateRequestId;
  clearTimeout(pageEstimateTimer);
  pageEstimateTimer = setTimeout(async () => {
    try {
      const response = await apiCall('POST', '/api/cv/layout-estimate', payload);
      if (!response.ok) throw new Error(response.error || 'estimate failed');
      if (requestId !== pageEstimateRequestId) return;

      const pages = Number(response.page_count_estimate || 0);
      const pct = Math.min(100, (pages / 3) * 100);
      const confidence = Number(response.page_count_confidence || 0);

      let cls = 'ok';
      let colour = '#22c55e';
      let iconText = response.page_count_exact != null ? '✅' : '📄';
      if (response.page_length_warning) {
        cls = pages > 3 ? 'over' : 'warn';
        colour = pages > 3 ? '#ef4444' : '#f59e0b';
        iconText = pages > 3 ? '🚨' : '⚠️';
      }

      const sourceLabel = response.page_count_exact != null
        ? `Exact: ${response.page_count_exact} page${response.page_count_exact === 1 ? '' : 's'}`
        : `Estimated: ${pages.toFixed(1)} pages`;
      const confidenceLabel = response.page_count_exact != null
        ? ''
        : ` (${Math.round(confidence * 100)}% confidence)`;
      const contributorText = Array.isArray(response.contributors) && response.contributors.length > 0
        ? ` ${response.contributors[0]}.`
        : '';
      const recheckText = response.page_count_needs_exact_recheck && response.page_count_exact == null
        ? ' Exact recheck recommended.'
        : '';

      widget.className = `page-estimate ${cls}`;
      if (label) {
        label.textContent = `${sourceLabel}${confidenceLabel}.${contributorText}${recheckText}`.trim();
      }
      if (fill) {
        fill.style.width = `${pct}%`;
        fill.style.background = colour;
      }
      if (icon) icon.textContent = iconText;

      stateManager.setGenerationState({
        pageCountEstimate: response.page_count_estimate ?? null,
        pageCountExact: response.page_count_exact ?? null,
        pageCountConfidence: response.page_count_confidence ?? null,
        pageCountSource: response.page_count_source || null,
        pageNeedsExactRecheck: Boolean(response.page_count_needs_exact_recheck),
        pageWarning: Boolean(response.page_length_warning),
      });
    } catch (error) {
      if (requestId !== pageEstimateRequestId) return;
      widget.className = 'page-estimate warn';
      if (label) label.textContent = `Layout estimate unavailable: ${error.message}`;
      if (fill) {
        fill.style.width = '0%';
        fill.style.background = '#f59e0b';
      }
      if (icon) icon.textContent = '⚠️';
    }
  }, 250);
}

// ── Shared action click handlers (experience + skills tables) ────────────

function handleActionClick(itemId, action, type) {
  // Remove active class from all buttons in this row
  const row = type === 'experience'
    ? document.querySelector(`tr[data-exp-id="${itemId}"]`)
    : document.querySelector(`tr[data-skill="${itemId}"]`);

  const buttons = row.querySelectorAll('.icon-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
  });

  // Add active class to clicked button
  const clickedBtn = row.querySelector(`[data-action="${action}"]`);
  clickedBtn.classList.add('active');
  if (clickedBtn.hasAttribute('aria-pressed')) clickedBtn.setAttribute('aria-pressed', 'true');

  // Store selection and record explicit review
  if (type === 'experience') {
    userSelections.experiences[itemId] = action;
    window._explicitlyReviewed = window._explicitlyReviewed || { experiences: new Set(), skills: new Set() };
    window._explicitlyReviewed.experiences.add(itemId);
  } else {
    userSelections.skills[itemId] = action;
    window._explicitlyReviewed = window._explicitlyReviewed || { experiences: new Set(), skills: new Set() };
    window._explicitlyReviewed.skills.add(itemId);
  }
  _updatePageEstimate();
}

/**
 * Apply a bulk action to all visible (DataTable-filtered) rows in one table.
 * action: 'emphasize' | 'include' | 'de-emphasize' | 'exclude' | 'recommended'
 * type:   'experience' | 'skill'
 */
function bulkAction(action, type) {
  const tableId  = type === 'experience' ? '#experience-review-table' : '#skills-review-table';
  const data     = window.pendingRecommendations || {};
  const dt       = $.fn.DataTable.isDataTable(tableId) ? $(tableId).DataTable() : null;

  // Iterate only the rows that DataTable currently shows (respects search filter)
  const rows = dt
    ? dt.rows({ search: 'applied' }).nodes().toArray()
    : Array.from(document.querySelectorAll(`${tableId} tbody tr`));

  rows.forEach(row => {
    const expId    = row.dataset.expId;
    const skillId  = row.dataset.skill;
    const itemId   = expId || skillId;
    if (!itemId) return;

    let resolvedAction = action;
    if (action === 'recommended') {
      resolvedAction = type === 'experience'
        ? _resolvedExpAction(itemId, data)
        : _resolvedSkillAction(itemId, data);
    }

    // Update button states
    row.querySelectorAll('.icon-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
    });
    const target = row.querySelector(`[data-action="${resolvedAction}"]`);
    if (target) {
      target.classList.add('active');
      if (target.hasAttribute('aria-pressed')) target.setAttribute('aria-pressed', 'true');
    }

    // Store selection
    if (type === 'experience') {
      userSelections.experiences[itemId] = resolvedAction;
    } else {
      userSelections.skills[itemId] = resolvedAction;
    }
  });
  _updatePageEstimate();
}

function _resolvedExpAction(expId, data) {
  const rec = getExperienceRecommendation(expId, data);
  if (rec === 'Emphasize')    return 'emphasize';
  if (rec === 'Include')      return 'include';
  if (rec === 'De-emphasize') return 'de-emphasize';
  return 'exclude';
}

function _resolvedSkillAction(skillName, data) {
  const rec = getSkillRecommendation(skillName, data);
  if (rec === 'Emphasize')    return 'emphasize';
  if (rec === 'Include')      return 'include';
  if (rec === 'De-emphasize') return 'de-emphasize';
  return 'exclude';
}

// ── Tagline review tab ────────────────────────────────────────────────────

async function populateTaglineReviewTab() {
  const content = document.getElementById('document-content');
  if (!content) return;
  content.innerHTML = `
    <h2 style="margin:0 0 16px;">🏷️ Applicant Tagline</h2>
    <div id="tagline-review-container"></div>
  `;
  if (typeof buildTaglineReviewSection === 'function') {
    await buildTaglineReviewSection();
  }
}

// ── Exports ───────────────────────────────────────────────────────────────

export {
  userSelections,
  updateInclusionCounts,
  switchTab,
  loadTabContent,
  populateAnalysisTab,
  handleCustomizationResponse,
  showTableBasedReview,
  populateReviewTab,
  populateTaglineReviewTab,
  switchReviewSubtab,
  _loadReviewPane,
  _updatePageEstimate,
  handleActionClick,
  bulkAction,
  _resolvedExpAction,
  _resolvedSkillAction,
};
