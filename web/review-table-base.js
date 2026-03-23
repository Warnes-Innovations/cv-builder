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
 *   renderRewritePanel, populateCVEditorTab, populateCVTab,
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

function switchTab(tab) {
  // Sync second-bar visibility to this tab's stage
  if (typeof getStageForTab === 'function' && typeof updateTabBarForStage === 'function') {
    const tabStage = getStageForTab(tab);
    if (tabStage) {
      stateManager.setCurrentStage(tabStage);
      updateTabBarForStage(tabStage);
      updateActionButtons(tabStage);
    }
  }

  // Update active tab and ARIA state
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
  }
  stateManager.setCurrentTab(tab);

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
      // Legacy: redirect to new flat tab structure
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
    case 'summary-review':
      await populateReviewTab('summary');
      break;
    case 'publications-review':
      await populateReviewTab('publications');
      break;
    case 'rewrite':
      if (window._rewritePanelCache) {
        renderRewritePanel(
          window._rewritePanelCache.rewrites,
          window._rewritePanelCache.warnings,
        );
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">✏️</div><h3>Rewrites</h3><p>Complete customizations to reach this step</p></div>';
      }
      break;
    case 'editor':
      await populateCVEditorTab();
      break;
    case 'generate':
      if (tabData.cv) {
        populateCVTab(tabData.cv);
      } else {
        content.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Generated CV</h3><p>Generate CV to see preview</p></div>';
      }
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
}

// ── Analysis tab ──────────────────────────────────────────────────────────

function populateAnalysisTab(result) {
  const content = document.getElementById('document-content');
  try {
    const cleanResult = cleanJsonResponse(result);
    const data = typeof cleanResult === 'string' ? JSON.parse(cleanResult) : cleanResult;

    // Persist only after the analysis payload has been validated.
    stateManager.setTabData('analysis', result);
    saveTabData();

    // ── Section 1: Role & Domain card ────────────────────────────────────
    let html = '<div class="analysis-page">';
    html += '<div class="analysis-role-card">';
    html += `<h1>${data.title || 'Role'}</h1>`;
    if (data.company) html += `<p class="company">🏢 ${data.company}</p>`;
    html += '<div class="meta">';
    if (data.domain)     html += `<span class="meta-chip">🔬 ${data.domain}</span>`;
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

    // ── Section 4: ATS Keywords with rank badges ──────────────────────────
    const atsKws = Array.isArray(data.ats_keywords) ? data.ats_keywords : [];
    if (atsKws.length > 0) {
      html += '<div class="analysis-section"><h2>🔑 ATS Keywords <small style="font-weight:400;color:#64748b;font-size:12px;">(higher rank = higher priority)</small></h2><div class="kw-badges">';
      atsKws.forEach((kw, idx) => {
        html += `<span class="kw-badge"><span class="kw-rank">#${idx + 1}</span>${kw}</span>`;
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
      // Store for persistence
      stateManager.setTabData('customizations', data);
      window.pendingRecommendations = data;
      saveTabData();

      if (!isReconnectInProgress()) {
        appendMessage('assistant', '✅ Customizations generated! Please review the **Experiences** and **Skills** in the **Customizations** tab. Select your preferences using the action buttons, then submit your decisions.');

        // Switch to the experiences review tab.
        switchTab('exp-review');
      }
    } else {
      if (!isReconnectInProgress()) {
        appendMessage('assistant', response);
      }
    }
  } catch (e) {
    log.error('Customization response error:', e);
    if (!isReconnectInProgress()) {
      appendMessage('assistant', response);
    }
  }
}

// ── Review tab (flat, one pane per top-level tab) ─────────────────────────

async function showTableBasedReview() {
  if (!window.pendingRecommendations) {
    appendMessage('assistant', 'No recommendations to review. Please generate customizations first.');
    return;
  }

  // Switch to the experiences review tab.
  switchTab('exp-review');

  // Inform user in conversation
  appendMessage('assistant', '✅ Customizations generated! Please review the **Experiences** and **Skills** tabs. Select your preferences using the action buttons, then submit your decisions.');
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
    <details id="generation-settings-panel" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#f8fafc;">
      <summary style="cursor:pointer;font-weight:600;color:#374151;user-select:none;">⚙️ Generation Settings</summary>
      <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
        <label for="max-skills-input" style="font-size:0.9em;color:#4b5563;white-space:nowrap;">Max skills in CV:</label>
        <input type="range" id="max-skills-input" min="1" max="60" step="1" value="20" style="flex:1;accent-color:#3b82f6;">
        <span id="max-skills-value" style="font-weight:600;color:#1e293b;min-width:2em;text-align:right;">20</span>
        <span style="font-size:0.85em;color:#9ca3af;">(default: 20)</span>
      </div>
    </details>
  ` : (cfg.title ? `<h2 style="margin:0 0 12px;">${cfg.title}</h2>` : '');

  const navBack = {
    skills:       `<button class="back-btn" onclick="switchTab('ach-editor')">← Back to Experience Bullets</button>`,
    achievements: `<button class="back-btn" onclick="switchTab('skills-review')">← Back to Skills</button>`,
    publications: `<button class="back-btn" onclick="switchTab('summary-review')">← Back to Summary</button>`,
  };
  const navContinue = {
    experiences:  `<button class="continue-btn" onclick="submitExperienceDecisions()">Continue to Experience Bullets →</button>`,
    skills:       `<button class="continue-btn" onclick="submitSkillDecisions()">Continue to Achievements →</button>`,
    achievements: `<button class="continue-btn" onclick="submitAchievementDecisions()">Continue to Summary →</button>`,
    publications: `<button class="continue-btn" onclick="submitPublicationDecisions()">Continue to Rewrite →</button>`,
  };
  // Summary nav is rendered inside buildSummaryFocusSection
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

  // Sync slider for experiences tab
  if (pane === 'experiences') {
    (async () => {
      const status = await fetchStatus();
      const currentMax = status.max_skills || 20;
      const slider = document.getElementById('max-skills-input');
      const label  = document.getElementById('max-skills-value');
      if (slider) {
        slider.value = currentMax;
        if (label) label.textContent = currentMax;
        slider.addEventListener('input', () => { if (label) label.textContent = slider.value; });
        slider.addEventListener('change', async () => {
          const v = parseInt(slider.value, 10);
          if (label) label.textContent = v;
          try { await apiCall('POST', '/api/generation-settings', { max_skills: v }); }
          catch (e) { log.warn('Failed to save max_skills setting:', e); }
        });
      }
    })();
  }

  window._activeReviewPane = pane;
  switch (pane) {
    case 'experiences':  await buildExperienceReviewTable(); _updatePageEstimate(); break;
    case 'skills':       await buildSkillsReviewTable();     break;
    case 'achievements': await buildAchievementsReviewTable(); break;
    case 'summary':      await buildSummaryFocusSection();   break;
    case 'publications': await buildPublicationsReviewTable(); break;
  }
}

// ── Legacy sub-tab approach (kept for backward compat) ────────────────────

async function populateCustomizationsTabWithReview(data) {
  const content = document.getElementById('document-content');

  // Build the shell with sub-tabs; individual sections are loaded lazily as tabs are clicked
  let html = `
    <h1>⚙️ Review Customization Recommendations</h1>
    <p style="color:#6b7280;margin-bottom:16px;">Review the AI's recommendations. Use the action buttons to adjust each item, then save your decisions before generating the CV.</p>

    <!-- Page-count estimator (updated live as selections change) -->
    <div id="page-estimate-widget" class="page-estimate ok">
      <span id="pe-icon">📄</span>
      <span id="pe-label">Estimated length: calculating…</span>
      <div class="pe-bar"><div class="pe-fill" id="pe-fill" style="width:0%;background:#86efac;"></div></div>
    </div>

    <!-- Generation Settings -->
    <details id="generation-settings-panel" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#f8fafc;">
      <summary style="cursor:pointer;font-weight:600;color:#374151;user-select:none;">⚙️ Generation Settings</summary>
      <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
        <label for="max-skills-input" style="font-size:0.9em;color:#4b5563;white-space:nowrap;">Max skills in CV:</label>
        <input type="range" id="max-skills-input" min="1" max="60" step="1" value="20"
          style="flex:1;accent-color:#3b82f6;">
        <span id="max-skills-value" style="font-weight:600;color:#1e293b;min-width:2em;text-align:right;">20</span>
        <span style="font-size:0.85em;color:#9ca3af;">(default: 20)</span>
      </div>
    </details>

    <!-- Sub-tab bar -->
    <div class="review-subtabs" id="review-subtab-bar">
      <button class="review-subtab active" data-pane="experiences"   onclick="switchReviewSubtab('experiences')">📊 Experiences</button>
      <button class="review-subtab"         data-pane="skills"        onclick="switchReviewSubtab('skills')">🛠️ Skills</button>
      <button class="review-subtab"         data-pane="achievements"  onclick="switchReviewSubtab('achievements')">🏆 Achievements</button>
      <button class="review-subtab"         data-pane="summary"       onclick="switchReviewSubtab('summary')">📝 Summary</button>
      <button class="review-subtab"         data-pane="publications"  onclick="switchReviewSubtab('publications')">📄 Publications</button>
    </div>

    <!-- Pane: Experiences -->
    <div id="review-pane-experiences" class="review-pane" style="display:block;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Sorted by date (most recent first). Click action buttons to override recommendations.</p>
      <div id="experience-table-container"></div>
      <div class="nav-buttons nav-end" style="margin:16px 0;">
        <button class="continue-btn" onclick="submitExperienceDecisions()">Continue to Experience Bullets →</button>
      </div>
    </div>

    <!-- Pane: Skills -->
    <div id="review-pane-skills" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Sorted by relevance. Select how to feature each skill.</p>
      <div id="skills-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="back-btn" onclick="switchReviewSubtab('experiences')">← Back to Experiences</button>
        <button class="continue-btn" onclick="submitSkillDecisions()">Continue to Achievements →</button>
      </div>
    </div>

    <!-- Pane: Achievements -->
    <div id="review-pane-achievements" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Select how to feature each key achievement. AI recommendations are pre-selected.</p>
      <div id="achievements-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="back-btn" onclick="switchReviewSubtab('skills')">← Back to Skills</button>
        <button class="continue-btn" onclick="submitAchievementDecisions()">Continue to Summary →</button>
      </div>
    </div>

    <!-- Pane: Summary -->
    <div id="review-pane-summary" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">Select which professional summary to use. The AI's recommendation is pre-selected.</p>
      <div id="summary-focus-container"></div>
    </div>

    <!-- Pane: Publications -->
    <div id="review-pane-publications" class="review-pane" style="display:none;">
      <p style="color:#6b7280;font-size:0.95em;margin-bottom:16px;">All publications ranked by relevance. Accept or reject each for your CV.</p>
      <div id="publications-table-container"></div>
      <div class="nav-buttons" style="margin:16px 0;">
        <button class="back-btn" onclick="switchReviewSubtab('summary')">← Back to Summary</button>
        <button class="continue-btn" onclick="submitPublicationDecisions()">Continue to Rewrite →</button>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // Sync max-skills slider with current session value
  (async () => {
    const status = await fetchStatus();
    const currentMax = status.max_skills || 20;
    const slider = document.getElementById('max-skills-input');
    const label  = document.getElementById('max-skills-value');
    if (slider) {
      slider.value = currentMax;
      if (label) label.textContent = currentMax;
      slider.addEventListener('input', () => {
        if (label) label.textContent = slider.value;
      });
      slider.addEventListener('change', async () => {
        const v = parseInt(slider.value, 10);
        if (label) label.textContent = v;
        try {
          await apiCall('POST', '/api/generation-settings', { max_skills: v });
        } catch (e) {
          log.warn('Failed to save max_skills setting:', e);
        }
      });
    }
  })();

  // Track which panes have been loaded to avoid re-fetching
  window._reviewPaneLoaded = {};

  // Restore previously active pane (defaults to 'experiences' on first visit)
  await switchReviewSubtab(window._activeReviewPane || 'experiences');
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

  const CHARS_PER_PAGE = 3200;
  const CHARS_HEADER   = 300;
  const CHARS_SUMMARY  = 500;
  const CHARS_EXP      = { emphasize: 1200, include: 800, 'de-emphasize': 300 };
  const CHARS_SKILL    = 25;
  const CHARS_OVERHEAD = 200;

  let total = CHARS_HEADER + CHARS_SUMMARY + CHARS_OVERHEAD;

  const expSels = userSelections.experiences || {};
  for (const action of Object.values(expSels)) {
    total += CHARS_EXP[action] || 0;
  }

  const skillSels = userSelections.skills || {};
  const activeSkills = Object.values(skillSels).filter(a => a !== 'exclude').length;
  total += activeSkills * CHARS_SKILL;

  const pages = total / CHARS_PER_PAGE;
  const pct   = Math.min(100, (pages / 3) * 100); // bar maxes at 3 pages

  const label  = document.getElementById('pe-label');
  const fill   = document.getElementById('pe-fill');
  const icon   = document.getElementById('pe-icon');

  const expCount   = Object.values(expSels).filter(a => a !== 'exclude').length;
  const totalExp   = Object.keys(expSels).length;

  let cls, colour, msg;
  if (pages < 1.8) {
    cls = 'ok';   colour = '#22c55e';
    msg = `≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Looking good — may have room to add more.`;
    icon.textContent = '📄';
  } else if (pages <= 2.3) {
    cls = 'ok';   colour = '#22c55e';
    msg = `≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Ideal length.`;
    icon.textContent = '✅';
  } else if (pages <= 2.8) {
    cls = 'warn'; colour = '#f59e0b';
    msg = `⚠️ ≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Getting long \u2014 consider de-emphasising older roles.`;
    icon.textContent = '⚠️';
  } else {
    cls = 'over'; colour = '#ef4444';
    msg = `🚨 ≈${pages.toFixed(1)} pages \u2014 ${expCount} of ${totalExp} experiences, ${activeSkills} skills. Likely too long \u2014 exclude or de-emphasise some entries.`;
    icon.textContent = '🚨';
  }

  widget.className = `page-estimate ${cls}`;
  if (label) label.textContent = msg;
  if (fill)  { fill.style.width = `${pct}%`; fill.style.background = colour; }
}

// ── Shared action click handlers (experience + skills tables) ────────────

function handleActionClick(itemId, action, type) {
  // Remove active class from all buttons in this row
  const row = type === 'experience'
    ? document.querySelector(`tr[data-exp-id="${itemId}"]`)
    : document.querySelector(`tr[data-skill="${itemId}"]`);

  const buttons = row.querySelectorAll('.icon-btn');
  buttons.forEach(btn => btn.classList.remove('active'));

  // Add active class to clicked button
  const clickedBtn = row.querySelector(`[data-action="${action}"]`);
  clickedBtn.classList.add('active');

  // Store selection
  if (type === 'experience') {
    userSelections.experiences[itemId] = action;
  } else {
    userSelections.skills[itemId] = action;
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
    row.querySelectorAll('.icon-btn').forEach(btn => btn.classList.remove('active'));
    const target = row.querySelector(`[data-action="${resolvedAction}"]`);
    if (target) target.classList.add('active');

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
  populateCustomizationsTabWithReview,
  switchReviewSubtab,
  _loadReviewPane,
  _updatePageEstimate,
  handleActionClick,
  bulkAction,
  _resolvedExpAction,
  _resolvedSkillAction,
};
