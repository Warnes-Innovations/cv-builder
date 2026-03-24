// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/skills-review.js
 * Skills-review table: fetch, render, row-reorder, and submit decisions.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   userSelections, pendingRecommendations, _savedDecisions, _skillsOrdered,
 *   _newSkillsFromLLM, tabData, parseStatusResponse,
 *   getSkillRecommendation, getSkillConfidence, getSkillReasoning,
 *   escapeHtml, handleActionClick, bulkAction, _updatePageEstimate,
 *   updateInclusionCounts, switchTab,
 *   showAlertModal, showToast, scheduleAtsRefresh,
 *   $, $.fn.DataTable (jQuery + DataTables)
 */

import { getLogger } from './logger.js';
const log = getLogger('skills-review');

import { stateManager } from './state-manager.js';

// ── Years-from-experience helpers ─────────────────────────────────────────

function _parseYearFromStr(str) {
  if (!str) return null;
  const s = String(str).toLowerCase().trim();
  if (['current', 'present', 'now', 'ongoing'].includes(s)) return new Date().getFullYear();
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Given a list of experience IDs and the full experiences array, return
 * the total years of experience (sum of duration of matched entries).
 * Returns null if no matching entries found.
 */
function _computeYearsFromIds(ids, allExperiences) {
  const idSet = new Set((ids || []).map(x => String(x).trim()).filter(Boolean));
  if (idSet.size === 0) return null;
  let total = 0;
  const currentYear = new Date().getFullYear();
  for (const exp of (allExperiences || [])) {
    if (!exp || typeof exp !== 'object') continue;
    const expId = String(exp.id || '').trim();
    if (!idSet.has(expId)) continue;
    const startYear = _parseYearFromStr(exp.start_date || exp.start);
    const endYear   = _parseYearFromStr(exp.end_date   || exp.end) ?? currentYear;
    total += startYear == null ? 1 : Math.max(1, endYear - startYear + 1);
  }
  return total > 0 ? total : null;
}

async function saveSkillGroupOverride(skillName, groupName) {
  const normalizedGroup = groupName == null ? null : String(groupName).trim() || null;
  const sk = (window._skillsOrdered || []).find(s => (typeof s === 'string' ? s : s.name || s) === skillName);
  if (sk && typeof sk === 'object') sk.group = normalizedGroup || '';

  const response = await fetch('/api/review-skill-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skill: skillName, group: normalizedGroup }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save skill group');
  }

  return response;
}

async function saveSkillCategoryOverride(skillName, categoryName) {
  const normalizedCategory = categoryName == null ? null : String(categoryName).trim() || null;
  const sk = (window._skillsOrdered || []).find(s => (typeof s === 'string' ? s : s.name || s) === skillName);
  if (sk && typeof sk === 'object') {
    if (normalizedCategory) sk.category = normalizedCategory;
    else delete sk.category;
  }

  const response = await fetch('/api/review-skill-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skill: skillName, category: normalizedCategory }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save skill category');
  }

  return response;
}

async function renameSkillCategory(oldCategory, newCategory) {
  const normalizedOld = String(oldCategory || '').trim();
  const normalizedNew = String(newCategory || '').trim();

  const response = await fetch('/api/review-skill-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'rename',
      old_category: normalizedOld,
      new_category: normalizedNew,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to rename skill category');
  }

  return response;
}

async function saveSkillCategoryOrder(orderedCategories) {
  const normalizedOrder = Array.from(new Set(
    (orderedCategories || [])
      .map(category => String(category || '').trim())
      .filter(Boolean),
  ));

  const response = await fetch('/api/review-skill-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reorder',
      ordered_categories: normalizedOrder,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save skill category order');
  }

  return response;
}

function _normalizeSkillSubskills(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(
    rawValues
      .map(item => String(item || '').trim())
      .filter(Boolean),
  ));
}

async function saveSkillQualifierOverride(skillName, qualifiers) {
  const normalizedSkill = String(skillName || '').trim();
  if (!normalizedSkill) throw new Error('Skill name is required');

  const normalizedProficiency = String(qualifiers?.proficiency || '').trim();
  const normalizedSubskills = _normalizeSkillSubskills(qualifiers?.subskills);
  const normalizedParenthetical = String(qualifiers?.parenthetical || '').trim();

  const sk = (window._skillsOrdered || []).find(s => (typeof s === 'string' ? s : s.name || s) === normalizedSkill);
  if (sk && typeof sk === 'object') {
    if (normalizedProficiency) sk.proficiency = normalizedProficiency;
    else delete sk.proficiency;

    if (normalizedSubskills.length > 0) sk.subskills = normalizedSubskills;
    else delete sk.subskills;

    if (normalizedParenthetical) sk.parenthetical = normalizedParenthetical;
    else delete sk.parenthetical;
  }

  const response = await fetch('/api/review-skill-qualifiers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skill: normalizedSkill,
      proficiency: normalizedProficiency,
      subskills: normalizedSubskills,
      parenthetical: normalizedParenthetical,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save skill qualifiers');
  }

  return response;
}

function _effectiveSkillCategory(skill) {
  if (!skill || typeof skill === 'string') return '';
  return String(skill.category || '').trim() || 'General';
}

function _syncSkillCategoryOrder() {
  const skills = Array.isArray(window._skillsOrdered) ? window._skillsOrdered : [];
  const ordered = [];
  for (const skill of skills) {
    const category = _effectiveSkillCategory(skill);
    if (category && !ordered.includes(category)) ordered.push(category);
  }
  window._skillCategoryOrder = ordered;
  return ordered;
}

function _renameSkillCategoryLocally(oldCategory, newCategory) {
  const normalizedOld = String(oldCategory || '').trim();
  const normalizedNew = String(newCategory || '').trim();
  if (!normalizedOld || !normalizedNew) return;

  for (const skill of (window._skillsOrdered || [])) {
    if (!skill || typeof skill !== 'object') continue;
    if (_effectiveSkillCategory(skill) === normalizedOld) {
      skill.category = normalizedNew;
    }
  }

  const currentOrder = Array.isArray(window._skillCategoryOrder)
    ? window._skillCategoryOrder
    : _syncSkillCategoryOrder();
  window._skillCategoryOrder = currentOrder.map(category => (
    category === normalizedOld ? normalizedNew : category
  )).filter((category, index, arr) => category && arr.indexOf(category) === index);
}

function _moveSkillCategoryLocally(categoryName, direction) {
  const normalizedCategory = String(categoryName || '').trim();
  const order = Array.isArray(window._skillCategoryOrder)
    ? [...window._skillCategoryOrder]
    : _syncSkillCategoryOrder();
  const index = order.indexOf(normalizedCategory);
  if (index < 0) return null;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= order.length) return null;
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  window._skillCategoryOrder = order;
  return order;
}

function _buildSkillCategoryManagerHtml() {
  const categories = Array.isArray(window._skillCategoryOrder)
    ? window._skillCategoryOrder
    : _syncSkillCategoryOrder();
  if (categories.length === 0) return '';

  return `
    <div class="skill-category-manager" style="margin:0 0 12px;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;">
      <div style="font-weight:600;margin-bottom:8px;">Category Layout</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${categories.map((category, index) => `
          <div class="skill-category-manager-row" data-category="${escapeHtml(category)}" style="display:flex;gap:8px;align-items:center;">
            <input
              type="text"
              class="skill-category-manager-input"
              value="${escapeHtml(category)}"
              aria-label="Rename skill category ${escapeHtml(category)}"
              style="flex:1;min-width:0;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;"
            />
            <button class="icon-btn" data-action="category-up" data-category="${escapeHtml(category)}" title="Move category up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon-btn" data-action="category-down" data-category="${escapeHtml(category)}" title="Move category down" ${index === categories.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Build review table (fetch + initialise) ────────────────────────────────

async function buildSkillsReviewTable() {
  const data = window.pendingRecommendations;
  const container = document.getElementById('skills-table-container');

  // Build skill-type lookup from job analysis (available in tabData.analysis)
  const jobAnalysis = stateManager.getTabData('analysis') || {};
  const hardSkillSet = new Set((jobAnalysis.required_skills    || []).map(s => s.toLowerCase()));
  const softSkillSet = new Set((jobAnalysis.nice_to_have_skills || []).map(s => s.toLowerCase()));

  // Get all skills from the API status
  let allSkills = [];
  try {
    const statusRes = await fetch('/api/status');
    const statusData = parseStatusResponse(await statusRes.json());
    allSkills = statusData.all_skills || [];
    window._allExperiences = statusData.all_experiences || [];
  } catch (error) {
    log.error('Error fetching all skills:', error);
    // Fallback to just recommended skills
    allSkills = data.recommended_skills || [];
    window._allExperiences = [];
  }

  // Detect skills recommended by LLM that aren't in master CV and prepend them
  const masterSkillNames = new Set(allSkills.map(s => (typeof s === 'string' ? s : s.name || s)));
  const newSkills = (data.recommended_skills || []).filter(s => !masterSkillNames.has(s));
  window._newSkillsFromLLM = newSkills;
  if (newSkills.length > 0) {
    allSkills = [...newSkills.map(s => ({ name: s, _isNew: true })), ...allSkills];
  }

  if (allSkills.length === 0) {
    container.innerHTML = '<p style="padding:20px;text-align:center;color:#6b7280;">No skills found in master CV data.</p>';
    return;
  }

  // On first load: sort by recommendation; preserve user order on re-render
  if (!window._skillsOrdered) {
    const recommendationOrder = { 'Emphasize': 0, 'Include': 1, 'De-emphasize': 2, 'Omit': 3 };
    const masterSkills  = allSkills.filter(s => !s._isNew);
    const sortedMaster  = masterSkills.slice().sort((a, b) => {
      const aName  = typeof a === 'string' ? a : a.name || a;
      const bName  = typeof b === 'string' ? b : b.name || b;
      const aOrder = recommendationOrder[getSkillRecommendation(aName, data)] ?? 3;
      const bOrder = recommendationOrder[getSkillRecommendation(bName, data)] ?? 3;
      return aOrder - bOrder;
    });
    window._skillsOrdered = [...allSkills.filter(s => s._isNew), ...sortedMaster];
  } else {
    const knownNames = new Set(window._skillsOrdered.map(s => (typeof s === 'string' ? s : s.name || s)));
    for (const sk of allSkills) {
      const nm = typeof sk === 'string' ? sk : sk.name || sk;
      if (!knownNames.has(nm)) window._skillsOrdered.push(sk);
    }
  }

  const recommendedSet = new Set(data.recommended_skills || []);

  // Initialise saved decisions
  const savedSkillDecs = window._savedDecisions?.skill_decisions || {};
  for (const skill of window._skillsOrdered) {
    const skillName     = typeof skill === 'string' ? skill : skill.name || skill;
    const isNew         = (skill._isNew === true);
    const isRecommended = recommendedSet.has(skillName);
    const recommendation = getSkillRecommendation(skillName, data);
    let defaultAction = 'exclude';
    if      (recommendation === 'Emphasize')    defaultAction = 'emphasize';
    else if (recommendation === 'Include')      defaultAction = 'include';
    else if (recommendation === 'De-emphasize') defaultAction = 'de-emphasize';
    else if (recommendation === 'Omit')         defaultAction = 'exclude';
    else if (isRecommended || isNew)            defaultAction = 'include';
    userSelections.skills[skillName] = savedSkillDecs[skillName] || defaultAction;
  }

  _renderSkillsTable(container, recommendedSet, data, hardSkillSet, softSkillSet);
}

// ── Render table HTML ──────────────────────────────────────────────────────

function _renderSkillsTable(container, recommendedSet, data, hardSkillSet, softSkillSet) {
  if (!container) container = document.getElementById('skills-table-container');
  if (!container) return;
  if (!recommendedSet) recommendedSet = new Set((window.pendingRecommendations?.recommended_skills) || []);
  if (!data) data = window.pendingRecommendations;
  if (!hardSkillSet) {
    const ja = stateManager.getTabData('analysis') || {};
    hardSkillSet = new Set((ja.required_skills     || []).map(s => s.toLowerCase()));
    softSkillSet = new Set((ja.nice_to_have_skills || []).map(s => s.toLowerCase()));
  }

  if ($.fn.DataTable.isDataTable('#skills-review-table')) {
    $('#skills-review-table').DataTable().destroy();
  }

  const skills = window._skillsOrdered || [];
  const categorySuggestions = Array.from(new Set(
    skills
      .map(skill => (typeof skill === 'object' && skill.category ? String(skill.category).trim() : ''))
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));
  _syncSkillCategoryOrder();
  const categoryListId = 'skill-category-suggestions';
  let tableHTML = `
    ${_buildSkillCategoryManagerHtml()}
    <datalist id="${categoryListId}">
      ${categorySuggestions.map(category => `<option value="${escapeHtml(category)}"></option>`).join('')}
    </datalist>
    <table id="skills-review-table" class="review-table">
      <thead>
        <tr>
          <th>Skill</th>
          <th>Category</th>
          <th>Group</th>
          <th>Proficiency</th>
          <th>Sub-skills</th>
          <th>Parenthetical</th>
          <th>Recommendation</th>
          <th>Confidence</th>
          <th>Reasoning</th>
          <th>Matched Experiences</th>
          <th>Your Selection</th>
        </tr>
      </thead>
      <tbody>
  `;

  const allExperiences = Array.isArray(window._allExperiences) ? window._allExperiences : [];
  const savedMatches = (window._savedDecisions && window._savedDecisions.extra_skill_matches) || {};

  const parseMatchInput = (raw) => {
    return String(raw || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const deriveMatches = (skillName) => {
    const needle = skillName.toLowerCase();
    const ids = [];
    allExperiences.forEach((exp) => {
      if (!exp || typeof exp !== 'object') return;
      const ach = Array.isArray(exp.achievements) ? exp.achievements.join(' ') : '';
      const haystack = [exp.title || '', exp.company || '', ach].join(' ').toLowerCase();
      if (haystack.includes(needle) && exp.id) ids.push(exp.id);
    });
    return ids;
  };

  skills.forEach((skill, rowIdx) => {
    const skillName      = typeof skill === 'string' ? skill : skill.name || skill;
    const isNew          = (skill._isNew === true);
    const isRecommended  = recommendedSet.has(skillName);
    const recommendation = getSkillRecommendation(skillName, data);
    const confidence     = getSkillConfidence(skillName, data);
    const reasoning      = getSkillReasoning(skillName, data);
    const defaultAction  = userSelections.skills[skillName] || 'include';
    const isFirst        = rowIdx === 0;
    const isLast         = rowIdx === skills.length - 1;
    const skillNameEsc   = escapeHtml(skillName);

    const groupKey = typeof skill === 'object' ? (skill.group || '') : '';
    const categoryKey = typeof skill === 'object' ? (skill.category || '') : '';
    const proficiencyKey = typeof skill === 'object' ? String(skill.proficiency || '').trim() : '';
    const subskills = typeof skill === 'object'
      ? Array.isArray(skill.subskills)
        ? skill.subskills
        : Array.isArray(skill.sub_skills)
          ? skill.sub_skills
          : []
      : [];
    const parentheticalKey = typeof skill === 'object' ? String(skill.parenthetical || '').trim() : '';

    const newBadge = isNew
      ? '<span title="AI suggested — not yet in CV profile" style="margin-left:6px;font-size:10px;color:#dc7900;border:1px solid #dc7900;border-radius:3px;padding:1px 5px;cursor:help;">⚠ Not in CV profile</span>'
      : '';
    const skillNameLower  = skillName.toLowerCase();
    const skillTypeBadge  = hardSkillSet.has(skillNameLower)
      ? '<span title="Required by job description" style="margin-left:5px;font-size:10px;font-weight:600;color:#1d4ed8;background:#dbeafe;border-radius:3px;padding:1px 5px;">Hard</span>'
      : softSkillSet?.has(skillNameLower)
        ? '<span title="Nice-to-have per job description" style="margin-left:5px;font-size:10px;font-weight:600;color:#6b21a8;background:#f3e8ff;border-radius:3px;padding:1px 5px;">Soft</span>'
        : '';
    const recommendationText = recommendation || (isNew ? 'Include (AI suggested)' : 'Omit');
    const confidenceBadge    = `<span class="confidence-badge confidence-${confidence.level}">${confidence.text}</span>`;
    const reasoningText      = reasoning || (isNew ? 'Recommended by AI based on job requirements but not currently in your master CV.' : 'This skill was not specifically mentioned in the job requirements.');
    const rowStyle           = isNew ? 'background:#fffbeb;' : '';
    const defaultMatches = isNew ? (savedMatches[skillName] || deriveMatches(skillName)) : [];
    const matchValue = defaultMatches.join(', ');
    const matchHelp = isNew
      ? 'Comma-separated experience IDs. Auto-derived; you can edit before submit.'
      : 'Only used for AI-suggested skills.';
    const derivedYears = isNew ? _computeYearsFromIds(defaultMatches, allExperiences) : null;
    const yearsHint = derivedYears != null
      ? `~${derivedYears} yr${derivedYears === 1 ? '' : 's'}`
      : (isNew ? 'no match' : '');

    tableHTML += `
      <tr data-skill="${skillNameEsc}" style="${rowStyle}">
        <td><strong>${skillNameEsc}</strong>${skillTypeBadge}${newBadge}</td>
        <td style="min-width:140px;">
          <input type="text" class="skill-category-input" data-skill="${skillNameEsc}"
            value="${escapeHtml(categoryKey)}"
            list="${categoryListId}"
            placeholder="e.g. Programming"
            title="Session-only category label used when grouping skills in the generated CV"
            style="width:100%;font-size:0.8em;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;"/>
        </td>
        <td style="min-width:100px;">
          <input type="text" class="skill-group-input" data-skill="${skillNameEsc}"
            value="${escapeHtml(groupKey)}"
            placeholder="e.g. c_family"
            title="Skills with the same group key render as one comma-separated bullet"
            style="width:100%;font-size:0.8em;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;"/>
        </td>
        <td style="min-width:120px;">
          <select class="skill-proficiency-input" data-skill="${skillNameEsc}"
            title="Session-only proficiency label used when rendering inline skill bullets"
            style="width:100%;font-size:0.8em;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;">
            <option value="" ${!proficiencyKey ? 'selected' : ''}>None</option>
            <option value="beginner" ${proficiencyKey === 'beginner' ? 'selected' : ''}>Beginner</option>
            <option value="familiar" ${proficiencyKey === 'familiar' ? 'selected' : ''}>Familiar</option>
            <option value="intermediate" ${proficiencyKey === 'intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="advanced" ${proficiencyKey === 'advanced' ? 'selected' : ''}>Advanced</option>
            <option value="expert" ${proficiencyKey === 'expert' ? 'selected' : ''}>Expert</option>
          </select>
        </td>
        <td style="min-width:180px;">
          <input type="text" class="skill-subskills-input" data-skill="${skillNameEsc}"
            value="${escapeHtml(subskills.join(', '))}"
            placeholder="e.g. Pandas, NumPy"
            title="Comma-separated sub-skills used in inline skill bullets"
            style="width:100%;font-size:0.8em;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;"/>
        </td>
        <td style="min-width:180px;">
          <input type="text" class="skill-parenthetical-input" data-skill="${skillNameEsc}"
            value="${escapeHtml(parentheticalKey)}"
            placeholder="Optional inline note"
            title="Free-form parenthetical override for the rendered inline skill label"
            style="width:100%;font-size:0.8em;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;"/>
        </td>
        <td><strong>${escapeHtml(recommendationText)}</strong></td>
        <td>${confidenceBadge}</td>
        <td style="max-width:300px;"><small>${escapeHtml(reasoningText)}</small></td>
        <td style="min-width:260px;">
          ${isNew ? `<input
            type="text"
            class="skill-match-input"
            data-skill="${skillNameEsc}"
            value="${escapeHtml(matchValue)}"
            placeholder="exp_1, exp_2"
            title="${escapeHtml(matchHelp)}"
            style="width:100%;font-size:0.85em;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;"
          /><span class="derived-years-hint" data-skill="${skillNameEsc}" title="Estimated years derived from matched experience entries" style="display:inline-block;margin-top:4px;font-size:0.8em;color:#6b7280;">${escapeHtml(yearsHint)}</span>` : '<span style="color:#9ca3af;">—</span>'}
        </td>
        <td class="action-btns" style="white-space:nowrap;">
          <button class="icon-btn ${defaultAction === 'emphasize'    ? 'active' : ''}" data-action="emphasize"    aria-label="Emphasize ${skillNameEsc}"    title="Emphasize — feature prominently" style="color:#10b981;font-size:1.5em;">➕</button>
          <button class="icon-btn ${defaultAction === 'include'      ? 'active' : ''}" data-action="include"      aria-label="Include ${skillNameEsc}"      title="Include — standard listing"      style="font-size:1.3em;">✓</button>
          <button class="icon-btn ${defaultAction === 'de-emphasize' ? 'active' : ''}" data-action="de-emphasize" aria-label="De-emphasize ${skillNameEsc}" title="De-emphasize — brief mention"    style="color:#f59e0b;font-size:1.5em;">➖</button>
          <button class="icon-btn ${defaultAction === 'exclude'      ? 'active' : ''}" data-action="exclude"      aria-label="Exclude ${skillNameEsc}"      title="Exclude — omit from CV"          style="color:#ef4444;font-size:1.3em;">✗</button>
          <button class="icon-btn" data-action="row-up"   aria-label="Move ${skillNameEsc} earlier" title="Move up"   ${isFirst ? 'disabled' : ''} style="font-size:1.0em;padding:2px 5px;">↑</button>
          <button class="icon-btn" data-action="row-down" aria-label="Move ${skillNameEsc} later"   title="Move down" ${isLast  ? 'disabled' : ''} style="font-size:1.0em;padding:2px 5px;">↓</button>
        </td>
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  container.innerHTML = tableHTML;

  // Save group key for this session when user finishes editing
  container.querySelector('.skill-category-manager')?.addEventListener('change', e => {
    const categoryManagerInput = e.target.closest('.skill-category-manager-input');
    if (categoryManagerInput) {
      const managerRow = categoryManagerInput.closest('.skill-category-manager-row');
      const oldCategory = managerRow?.dataset.category || '';
      const newCategory = categoryManagerInput.value.trim();
      if (!oldCategory || !newCategory || oldCategory === newCategory) {
        if (managerRow) categoryManagerInput.value = oldCategory;
        return;
      }
      _renameSkillCategoryLocally(oldCategory, newCategory);
      renameSkillCategory(oldCategory, newCategory)
        .then(() => _renderSkillsTable(container, recommendedSet, data, hardSkillSet, softSkillSet))
        .catch(() => {
          _renameSkillCategoryLocally(newCategory, oldCategory);
          if (managerRow) categoryManagerInput.value = oldCategory;
          showToast('Failed to rename skill category.', 'error');
        });
    }
  });

  container.querySelector('#skills-review-table tbody')?.addEventListener('change', e => {
    const categoryInput = e.target.closest('.skill-category-input');
    if (categoryInput) {
      const skillName = categoryInput.dataset.skill;
      const newCategory = categoryInput.value.trim();
      saveSkillCategoryOverride(skillName, newCategory).catch(() => {
        showToast('Failed to save skill category.', 'error');
      });
      return;
    }

    const input = e.target.closest('.skill-group-input');
    if (input) {
      const skillName = input.dataset.skill;
      const newGroup = input.value.trim();
      saveSkillGroupOverride(skillName, newGroup).catch(() => {
        showToast('Failed to save skill group.', 'error');
      });
      return;
    }

    const qualifierInput = e.target.closest('.skill-proficiency-input, .skill-subskills-input, .skill-parenthetical-input');
    if (!qualifierInput) return;
    const skillName = qualifierInput.dataset.skill;
    const row = qualifierInput.closest('tr[data-skill]');
    if (!skillName || !row) return;
    const proficiency = row.querySelector('.skill-proficiency-input')?.value || '';
    const subskillsValue = row.querySelector('.skill-subskills-input')?.value || '';
    const parenthetical = row.querySelector('.skill-parenthetical-input')?.value || '';
    saveSkillQualifierOverride(skillName, {
      proficiency,
      subskills: subskillsValue,
      parenthetical,
    }).catch(() => {
      showToast('Failed to save skill qualifiers.', 'error');
    });
  });

  // Update derived-years hint live as user edits the experience match input
  container.querySelector('#skills-review-table tbody')?.addEventListener('input', e => {
    const input = e.target.closest('.skill-match-input');
    if (!input) return;
    const skillName = input.dataset.skill;
    const ids = input.value.split(',').map(x => x.trim()).filter(Boolean);
    const years = _computeYearsFromIds(ids, allExperiences);
    const hint = years != null ? `~${years} yr${years === 1 ? '' : 's'}` : 'no match';
    const span = container.querySelector(`.derived-years-hint[data-skill="${CSS.escape(skillName)}"]`);
    if (span) span.textContent = hint;
  });

  container.querySelector('#skills-review-table tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    const tr = btn.closest('tr[data-skill]');
    if (!tr) return;
    const skillName = tr.dataset.skill;
    const action    = btn.dataset.action;
    if (action === 'row-up') {
      e.stopPropagation();
      moveSkillRow(skillName, -1);
    } else if (action === 'row-down') {
      e.stopPropagation();
      moveSkillRow(skillName, +1);
    } else if (action) {
      handleActionClick(skillName, action, 'skill');
    }
  });

  container.querySelector('.skill-category-manager')?.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn[data-action^="category-"]');
    if (!btn) return;
    const categoryName = btn.dataset.category || '';
    const direction = btn.dataset.action === 'category-up' ? -1 : 1;
    const updatedOrder = _moveSkillCategoryLocally(categoryName, direction);
    if (!updatedOrder) return;
    saveSkillCategoryOrder(updatedOrder)
      .then(() => _renderSkillsTable(container, recommendedSet, data, hardSkillSet, softSkillSet))
      .catch(() => {
        _moveSkillCategoryLocally(categoryName, -direction);
        showToast('Failed to save skill category order.', 'error');
      });
  });

  const skillToolbar = document.createElement('div');
  skillToolbar.className = 'bulk-toolbar';
  skillToolbar.innerHTML = `
    <span>Bulk:</span>
    <button class="bulk-btn bulk-recommended" onclick="bulkAction('recommended','skill')" title="Set all to the LLM recommendation">✨ Accept All Recommended</button>
    <button class="bulk-btn bulk-emphasize"   onclick="bulkAction('emphasize','skill')">➕ Emphasize All</button>
    <button class="bulk-btn bulk-include"     onclick="bulkAction('include','skill')">✓ Include All</button>
    <button class="bulk-btn bulk-exclude"     onclick="bulkAction('exclude','skill')">✗ Exclude All</button>
  `;
  container.insertBefore(skillToolbar, container.firstChild);

  $('#skills-review-table').DataTable({
    paging: false,
    order: [],
    language: { search: 'Filter skills:' }
  });
  _updatePageEstimate();
}

// ── Row reorder ────────────────────────────────────────────────────────────

function moveSkillRow(skillName, direction) {
  const arr = window._skillsOrdered;
  if (!arr) return;
  const idx = arr.findIndex(s => (typeof s === 'string' ? s : s.name || s) === skillName);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  window._skillsOrdered = arr;
  _renderSkillsTable(null, null, null, null, null);
  fetch('/api/reorder-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'skill', ordered_ids: arr.map(s => (typeof s === 'string' ? s : s.name || s)) })
  }).catch(() => {});
}

// ── Legacy interactive-mode response handler ───────────────────────────────

async function handleSkillsResponse(message) {
  window.waitingForSkillsResponse = false;
  const response = message.toLowerCase();

  if (response.includes('yes')) {
    appendMessage('assistant', 'Excellent! I\'ll use this skills strategy in your CV.');
  } else if (response.includes('no') || response.includes('modify')) {
    appendMessage('assistant', 'I understand. What changes would you like me to make to the skills emphasis?');
  } else {
    appendMessage('assistant', 'I\'ll note your feedback on the skills strategy.');
  }

  finishInteractiveReview();
}

// ── Submit decisions ───────────────────────────────────────────────────────

async function submitSkillDecisions() {
  const decisions = userSelections.skills;
  const count = Object.keys(decisions).length;

  if (count === 0) {
    showAlertModal('No Selections', 'Please select actions for at least one skill before submitting.');
    return;
  }

  try {
    // Extra skills: LLM-suggested skills not in master CV that the user chose to include/emphasize
    const extraSkills = (window._newSkillsFromLLM || []).filter(s => {
      const d = decisions[s];
      return d === 'include' || d === 'emphasize';
    });

    const matchInputs = Array.from(document.querySelectorAll('.skill-match-input'));
    const allowed = new Set((window._allExperiences || []).map(e => e.id).filter(Boolean));
    const extraSkillMatches = {};
    for (const input of matchInputs) {
      const skillName = input.dataset.skill;
      if (!skillName || !extraSkills.includes(skillName)) continue;
      const ids = String(input.value || '')
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x && allowed.has(x));
      if (ids.length > 0) extraSkillMatches[skillName] = ids;
    }

    const response = await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'skills',
        decisions: decisions,
        extra_skills: extraSkills,
        extra_skill_matches: extraSkillMatches,
      })
    });

    if (response.ok) {
      const extraNote = extraSkills.length > 0 ? ` (${extraSkills.length} AI-suggested skill(s) added for this CV only)` : '';
      showToast(`Skill decisions saved (${count} items)${extraNote}`);
      scheduleAtsRefresh();
      // Persist saved decisions locally so the UI reflects them immediately
      window._savedDecisions = window._savedDecisions || {};
      window._savedDecisions.skill_decisions = decisions;
      if (!window._savedDecisions.extra_skills) window._savedDecisions.extra_skills = [];
      if (extraSkills.length > 0) window._savedDecisions.extra_skills = extraSkills;
      window._savedDecisions.extra_skill_matches = extraSkillMatches;
      userSelections.skills = { ...decisions };
      if (typeof updateInclusionCounts === 'function') updateInclusionCounts();
      switchTab('achievements-review');
    } else {
      const error = await response.json();
      showToast(`Error: ${error.error || 'Failed to save decisions'}`, 'error');
    }
  } catch (error) {
    log.error('Error submitting skill decisions:', error);
    showToast('Failed to save decisions. Please try again.', 'error');
  }
}

// ── Exports ───────────────────────────────────────────────────────────────

export {
  _parseYearFromStr,
  _computeYearsFromIds,
  saveSkillGroupOverride,
  saveSkillCategoryOverride,
  renameSkillCategory,
  saveSkillCategoryOrder,
  saveSkillQualifierOverride,
  buildSkillsReviewTable,
  _renderSkillsTable,
  moveSkillRow,
  handleSkillsResponse,
  submitSkillDecisions,
};
