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

// ── Build review table (fetch + initialise) ────────────────────────────────

async function buildSkillsReviewTable() {
  const data = window.pendingRecommendations;
  const container = document.getElementById('skills-table-container');

  // Build skill-type lookup from job analysis (available in tabData.analysis)
  const jobAnalysis = tabData.analysis || {};
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
    console.error('Error fetching all skills:', error);
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
    const ja = tabData.analysis || {};
    hardSkillSet = new Set((ja.required_skills     || []).map(s => s.toLowerCase()));
    softSkillSet = new Set((ja.nice_to_have_skills || []).map(s => s.toLowerCase()));
  }

  if ($.fn.DataTable.isDataTable('#skills-review-table')) {
    $('#skills-review-table').DataTable().destroy();
  }

  const skills = window._skillsOrdered || [];
  let tableHTML = `
    <table id="skills-review-table" class="review-table">
      <thead>
        <tr>
          <th>Skill</th>
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

    tableHTML += `
      <tr data-skill="${skillNameEsc}" style="${rowStyle}">
        <td><strong>${skillNameEsc}</strong>${skillTypeBadge}${newBadge}</td>
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
          />` : '<span style="color:#9ca3af;">—</span>'}
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
    console.error('Error submitting skill decisions:', error);
    showToast('Failed to save decisions. Please try again.', 'error');
  }
}

// ── Exports ───────────────────────────────────────────────────────────────

export {
  buildSkillsReviewTable,
  _renderSkillsTable,
  moveSkillRow,
  handleSkillsResponse,
  submitSkillDecisions,
};
