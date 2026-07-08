// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * Harvest tab: LLM-scored grouped view of master-CV improvement candidates.
 *
 * Public exports:
 *   populateHarvestTab()        — called by review-table-base.js on tab switch
 *   applyHarvestSelections()    — called by inline onclick on the Apply button
 *   refreshHarvestAnalysis()    — called by inline onclick on the Refresh button
 */

import { getLogger } from './logger.js';
import { disclosureKey, StorageKeys } from './api-client.js';
import { esc, renderProposalRow, attachProposalRowListeners } from './proposal-review.js';

const log = getLogger('harvest');

// ── Display config ────────────────────────────────────────────────────────────

/**
 * Merged display type config.
 * new_skill and skill_gap_confirmed both map to the 'skill' display group.
 */
const HARVEST_TYPE_CONFIG = {
  improved_bullet:     { label: 'Experience Bullets',     icon: '✏️',  sort: 1, displayType: 'improved_bullet'     },
  new_skill:           { label: 'Skills',                 icon: '🛠️',  sort: 2, displayType: 'skill'               },
  skill_gap_confirmed: { label: 'Skills',                 icon: '🛠️',  sort: 2, displayType: 'skill'               },
  summary_variant:     { label: 'Professional Summary',   icon: '📝',  sort: 3, displayType: 'summary_variant'     },
  skill_type_update:   { label: 'Skill Classification',   icon: '🏷️',  sort: 4, displayType: 'skill_type_update'  },
};

const HARVEST_TYPE_DESCRIPTIONS = {
  improved_bullet:      'Rewritten achievement bullets you approved in the Rewrites step. Promoting updates the bullet text in your master CV.',
  skill:                'Skills absent from your master CV — either added (🆕 Added) during the Skills Review or confirmed when asked (✅ Confirmed). Promoting adds them to your skills section.',
  summary_variant:      'A rewritten version of your professional summary. Promoting stores it as a named variant in your master CV.',
  skill_type_update:    'Hard/soft skill classifications you changed during this session. Promoting persists the new type so it is not re-classified on every application.',
};

const HARVEST_SOURCE_BADGE = {
  new_skill:           '<span style="font-size:0.75em;background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 6px;margin-left:6px;white-space:nowrap;">🆕 Added</span>',
  skill_gap_confirmed: '<span style="font-size:0.75em;background:#dcfce7;color:#166534;border-radius:4px;padding:1px 6px;margin-left:6px;white-space:nowrap;">✅ Confirmed</span>',
  skill_type_update:   '<span style="font-size:0.75em;background:#fef9c3;color:#854d0e;border-radius:4px;padding:1px 6px;margin-left:6px;white-space:nowrap;">🏷️ Reclassified</span>',
};

const REC_CONFIG = {
  promote: { label: 'Promote',      icon: '⬆️',  color: '#166534', bg: '#f0fdf4', sort: 0 },
  skip:    { label: 'Skip',         icon: '⏭️',  color: '#9a3412', bg: '#fff7ed', sort: 1 },
  null:    { label: 'Unanalyzed',   icon: '❓',  color: '#4b5563', bg: '#f9fafb', sort: 2 },
};

const CONF_CONFIG = {
  high:   { label: 'High',   color: '#15803d', bg: '#f0fdf4', sort: 0 },
  medium: { label: 'Medium', color: '#b45309', bg: '#fffbeb', sort: 1 },
  low:    { label: 'Low',    color: '#b91c1c', bg: '#fef2f2', sort: 2 },
  null:   { label: '',       color: '#6b7280', bg: '#f9fafb', sort: 3 },
};

// ── Grouping ──────────────────────────────────────────────────────────────────

function getDisplayType(candidate) {
  return HARVEST_TYPE_CONFIG[candidate.type]?.displayType ?? candidate.type;
}

/**
 * Group enriched candidates into a nested structure:
 *   { displayType → { rec → { confidence → [candidate, …] } } }
 */
function groupCandidates(enriched) {
  const groups = {};
  for (const c of enriched) {
    const dt   = getDisplayType(c);
    const rec  = c.recommendation ?? 'null';
    const conf = c.confidence     ?? 'null';
    if (!groups[dt])                groups[dt]       = {};
    if (!groups[dt][rec])           groups[dt][rec]  = {};
    if (!groups[dt][rec][conf])     groups[dt][rec][conf] = [];
    groups[dt][rec][conf].push(c);
  }
  return groups;
}

function sortedKeys(obj, configMap) {
  return Object.keys(obj).sort((a, b) => {
    const sa = configMap[a]?.sort ?? 99;
    const sb = configMap[b]?.sort ?? 99;
    return sa - sb;
  });
}

// ── Pre-check logic ───────────────────────────────────────────────────────────
// All harvest items start unchecked — master CV updates are opt-in only (US-A11).
// Groups with high/medium confidence promotions are expanded so candidates are
// prominent, but no checkbox is pre-selected.

function shouldPreCheck(_candidate) {
  return false;
}

// ── Collapse default logic ────────────────────────────────────────────────────

function typeGroupExpanded(dtCandidates) {
  return dtCandidates.some(c => c.recommendation === 'promote' &&
    (c.confidence === 'high' || c.confidence === 'medium'));
}

function recGroupExpanded(rec, confCandidates) {
  if (rec !== 'promote') return false;
  return confCandidates.some(c => c.confidence === 'high' || c.confidence === 'medium');
}

function confTierExpanded(rec, conf) {
  return rec === 'promote' && (conf === 'high' || conf === 'medium');
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderConfidenceBadge(conf) {
  const cfg = CONF_CONFIG[conf] ?? CONF_CONFIG['null'];
  if (!cfg.label) return '';
  return `<span style="font-size:0.7em;font-weight:600;border-radius:4px;padding:1px 6px;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}30;white-space:nowrap;">${esc(cfg.label)}</span>`;
}

function renderRecommendationBadge(rec) {
  const cfg = REC_CONFIG[rec] ?? REC_CONFIG['null'];
  return `<span style="font-size:0.75em;font-weight:600;border-radius:4px;padding:2px 8px;background:${cfg.bg};color:${cfg.color};white-space:nowrap;">${cfg.icon} ${esc(cfg.label)}</span>`;
}

function renderProvenanceBadge(c) {
  if (c.type !== 'improved_bullet' && c.type !== 'summary_variant') return '';
  if (c.outcome === 'edit') {
    return '<span style="font-size:0.72em;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;white-space:nowrap;border:1px solid #fcd34d;" title="You edited this rewrite before accepting it">✏️ User-edited</span>';
  }
  return '<span style="font-size:0.72em;background:#ede9fe;color:#5b21b6;border-radius:4px;padding:1px 6px;white-space:nowrap;border:1px solid #c4b5fd;" title="Accepted as-is from AI suggestion">🤖 AI accepted</span>';
}

function renderCandidateRow(c, idx) {
  const typeCfg   = HARVEST_TYPE_CONFIG[c.type] ?? {};
  const sourceBadge    = HARVEST_SOURCE_BADGE[c.type] ?? '';
  const provenanceBadge = renderProvenanceBadge(c);
  const recBadge  = c.recommendation ? renderRecommendationBadge(c.recommendation) : '';
  const confBadge = c.confidence ? renderConfidenceBadge(c.confidence) : '';
  const hasReasoning = c.analysisAvailable && c.reasoning;

  return renderProposalRow({
    id:              c.id,
    typeLabel:       typeCfg.label ?? c.type,
    sourceBadgeHtml: sourceBadge + provenanceBadge,
    label:           c.label,
    original:        c.original,
    proposed:        c.proposed,
    detailText:      hasReasoning ? c.reasoning : null,
    badgesHtml:       `${recBadge}${confBadge}`,
    checked:         shouldPreCheck(c),
  }, {
    idPrefix:         'harvest',
    checkboxDataAttr: 'harvest-id',
  });
}

function renderConfidenceTier(rec, conf, candidates) {
  const cfg      = CONF_CONFIG[conf] ?? CONF_CONFIG['null'];
  const expanded = confTierExpanded(rec, conf);
  const tierId   = `harvest-conf-${rec}-${conf}-${Date.now()}`;
  const count    = candidates.length;

  if (!cfg.label) {
    // No-analysis tier — render rows directly without a sub-header
    return candidates.map((c, i) => renderCandidateRow(c, i)).join('');
  }

  const toggleIcon = expanded ? '▾' : '▸';
  const headerHtml = `
    <tr class="harvest-conf-header" style="cursor:pointer;background:#fafafa;" onclick="toggleHarvestSection('${tierId}')">
      <td colspan="2" style="padding:6px 12px 6px 36px;font-size:0.8em;color:${cfg.color};font-weight:600;">
        <span id="${tierId}-icon">${toggleIcon}</span>
        ${esc(cfg.label)} confidence
        <span style="font-size:0.85em;font-weight:400;color:#9ca3af;margin-left:6px;">(${count})</span>
      </td>
    </tr>
    <tbody id="${tierId}" style="${expanded ? '' : 'display:none;'}">
      ${candidates.map((c, i) => renderCandidateRow(c, i)).join('')}
    </tbody>`;
  return headerHtml;
}

function renderRecGroup(dt, rec, confMap) {
  const cfg = REC_CONFIG[rec] ?? REC_CONFIG['null'];
  const allCands = Object.values(confMap).flat();
  const expanded = recGroupExpanded(rec, allCands);
  const groupId  = `harvest-rec-${dt}-${rec}-${Date.now()}`;
  const count    = allCands.length;

  const confs    = sortedKeys(confMap, CONF_CONFIG);
  const hasMultipleConfs = confs.length > 1 || (confs.length === 1 && CONF_CONFIG[confs[0]]?.label);

  const innerRows = confs.map(conf => renderConfidenceTier(rec, conf, confMap[conf])).join('');

  const toggleIcon = expanded ? '▾' : '▸';
  return `
    <tr class="harvest-rec-header" style="cursor:pointer;background:${cfg.bg};" onclick="toggleHarvestSection('${groupId}')">
      <td colspan="2" style="padding:8px 12px 8px 24px;font-size:0.85em;color:${cfg.color};font-weight:700;">
        <span id="${groupId}-icon">${toggleIcon}</span>
        ${cfg.icon} ${esc(cfg.label)}
        <span style="font-size:0.85em;font-weight:400;color:#9ca3af;margin-left:6px;">(${count})</span>
      </td>
    </tr>
    <tbody id="${groupId}" style="${expanded ? '' : 'display:none;'}">
      ${hasMultipleConfs ? innerRows : allCands.map((c, i) => renderCandidateRow(c, i)).join('')}
    </tbody>`;
}

function renderTypeGroup(dt, recMap, allDtCandidates) {
  const cfg      = HARVEST_TYPE_CONFIG[dt] ?? { label: dt, icon: '📋', sort: 99 };
  const expanded = typeGroupExpanded(allDtCandidates);
  const groupId  = `harvest-type-${dt}-${Date.now()}`;
  const count    = allDtCandidates.length;
  const desc     = HARVEST_TYPE_DESCRIPTIONS[dt] ?? '';

  const recs        = sortedKeys(recMap, REC_CONFIG);
  const hasMultipleRecs = recs.length > 1;

  const innerHtml = recs.map(rec => {
    if (!hasMultipleRecs) {
      // Suppress the rec-level header; render confidence tiers directly
      const confMap  = recMap[rec];
      const confs    = sortedKeys(confMap, CONF_CONFIG);
      const hasConfs = confs.length > 1 || (confs.length === 1 && CONF_CONFIG[confs[0]]?.label);
      return hasConfs
        ? confs.map(conf => renderConfidenceTier(rec, conf, confMap[conf])).join('')
        : confMap[confs[0]].map((c, i) => renderCandidateRow(c, i)).join('');
    }
    return renderRecGroup(dt, rec, recMap[rec]);
  }).join('');

  const toggleIcon = expanded ? '▾' : '▸';
  return `
    <div class="harvest-type-section" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="background:#f8fafc;padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;"
           onclick="toggleHarvestSection('${groupId}')">
        <span style="font-size:1.25em;">${cfg.icon}</span>
        <div style="flex:1;">
          <div style="font-weight:700;color:#0f172a;font-size:0.95em;">
            <span id="${groupId}-icon">${toggleIcon}</span>
            ${esc(cfg.label)}
            <span style="font-size:0.82em;font-weight:400;color:#94a3b8;margin-left:6px;">(${count})</span>
          </div>
          ${desc ? `<div style="font-size:0.78em;color:#64748b;margin-top:2px;">${esc(desc)}</div>` : ''}
        </div>
      </div>
      <div id="${groupId}" style="${expanded ? '' : 'display:none;'}">
        <table style="width:100%;border-collapse:collapse;">
          ${innerHtml}
        </table>
      </div>
    </div>`;
}

function renderHarvestTabHtml(enriched, analysisOk, analysisError) {
  const groups = groupCandidates(enriched);
  const dtKeys = sortedKeys(groups, Object.fromEntries(
    Object.entries(HARVEST_TYPE_CONFIG).map(([k, v]) => [v.displayType, v])
  ));

  const totalCount = enriched.length;

  const analysisWarning = !analysisOk
    ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:0.87em;color:#92400e;">
        ⚠️ AI analysis unavailable${analysisError ? `: ${esc(analysisError)}` : ''}. Checkboxes are unchecked — review manually.
        <button onclick="refreshHarvestAnalysis()" style="margin-left:10px;font-size:0.85em;padding:2px 10px;border:1px solid #d97706;border-radius:4px;background:white;color:#b45309;cursor:pointer;">Retry analysis</button>
      </div>`
    : '';

  const sectionsHtml = dtKeys.map(dt => {
    const recMap      = groups[dt];
    const allDtCands  = Object.values(recMap).flatMap(confMap => Object.values(confMap).flat());
    return renderTypeGroup(dt, recMap, allDtCands);
  }).join('');

  return `
    <h1>🌾 Update Master CV</h1>
    <p style="color:#6b7280;margin-bottom:8px;">
      Review AI-scored candidates for promotion to your master CV.
      Check the items you want to apply (${totalCount} candidate${totalCount === 1 ? '' : 's'} found).
    </p>
    ${analysisWarning}
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
      <button id="harvest-apply-btn" onclick="applyHarvestSelections()"
        style="padding:10px 24px;font-size:1em;font-weight:600;cursor:pointer;background:#16a34a;color:white;border:none;border-radius:6px;">
        ✅ Apply Selected to Master CV
      </button>
      <button onclick="refreshHarvestAnalysis()"
        style="padding:10px 18px;font-size:0.9em;cursor:pointer;background:white;color:#475569;border:1px solid #cbd5e1;border-radius:6px;">
        🔄 Re-analyse
      </button>
      <span style="font-size:0.85em;color:#94a3b8;">
        ${totalCount} candidate${totalCount !== 1 ? 's' : ''}
      </span>
    </div>
    ${sectionsHtml}
    <div id="harvest-result" style="margin-top:20px;"></div>`;
}

function renderEmptyStateHtml() {
  return `
    <h1>🌾 Update Master CV</h1>
    <p style="color:#6b7280;">No harvest candidates found for this session.</p>
    <p style="color:#94a3b8;font-size:0.9em;">
      Candidates are generated from approved rewrites, skills added during review,
      and summary variants created during the session.
    </p>`;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchCandidates() {
  const res  = await fetch('/api/harvest/candidates');
  const data = await res.json();
  return data;
}

async function fetchAnalysis(forceRefresh = false) {
  // GAP-374: fire LLM disclosure on first use per provider
  try {
    const provider = JSON.parse(localStorage.getItem(StorageKeys.TAB_DATA) || '{}').currentModelProvider || null;
    const key = disclosureKey(provider);
    if (!localStorage.getItem(key)) {
      const label = provider ? ` (${provider})` : '';
      if (typeof appendMessage === 'function') {
        appendMessage('system', `ℹ️ Content you submit is sent to the configured AI Model provider${label} for analysis. Review your provider's data policy for details.`);
      }
      localStorage.setItem(key, '1');
    }
  } catch (_) { /* non-fatal */ }

  const res  = await fetch('/api/harvest/analyze', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ force_refresh: forceRefresh }),
  });
  const data = await res.json();
  return data;
}

// ── Toggle helpers (called by inline onclick) ─────────────────────────────────

function toggleHarvestSection(id) {
  const el   = document.getElementById(id);
  const icon = document.getElementById(`${id}-icon`);
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? '' : 'none';
  if (icon) icon.textContent = hidden ? '▾' : '▸';
}

// ── Main entry points ─────────────────────────────────────────────────────────

async function populateHarvestTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <h1>🌾 Update Master CV</h1>
    <div style="text-align:center;padding:40px;">
      <div class="loading-spinner"></div>
      <p style="color:#6b7280;margin-top:12px;">Loading candidates and running AI analysis…</p>
    </div>`;

  let candidates = [];
  let analysisOk = false;
  let analyses   = [];
  let analysisError = null;

  try {
    const candData = await fetchCandidates();
    if (!candData.ok) {
      content.innerHTML = `<h1>🌾 Update Master CV</h1><p class="error-message">Failed to load candidates: ${esc(candData.error || 'Unknown error')}</p>`;
      return;
    }
    candidates = candData.candidates || [];
  } catch (err) {
    log.error('populateHarvestTab: candidates fetch failed', err);
    content.innerHTML = `<h1>🌾 Update Master CV</h1><p class="error-message">Network error loading candidates.</p>`;
    return;
  }

  if (candidates.length === 0) {
    content.innerHTML = renderEmptyStateHtml();
    return;
  }

  try {
    const analysisData = await fetchAnalysis(false);
    if (analysisData.ok) {
      analysisOk = true;
      analyses   = analysisData.analyses || [];
    } else {
      analysisError = analysisData.error || 'Analysis failed';
      log.warn('populateHarvestTab: analysis not ok', analysisError);
    }
  } catch (err) {
    log.error('populateHarvestTab: analysis fetch failed', err);
    analysisError = err.message;
  }

  const analysesById = Object.fromEntries(analyses.map(a => [a.id, a]));
  const enriched = candidates.map(c => ({
    ...c,
    recommendation:    analysesById[c.id]?.recommendation ?? null,
    confidence:        analysesById[c.id]?.confidence     ?? null,
    reasoning:         analysesById[c.id]?.reasoning      ?? null,
    analysisAvailable: analysisOk,
  }));

  content.innerHTML = renderHarvestTabHtml(enriched, analysisOk, analysisError);
  attachProposalRowListeners(content, 'harvest');
}

async function refreshHarvestAnalysis() {
  const content = document.getElementById('document-content');
  if (!content) return;

  // Show spinner inline while re-fetching
  const applyBtn = document.getElementById('harvest-apply-btn');
  if (applyBtn) applyBtn.disabled = true;

  // Re-run full populate with force refresh
  try {
    const candData = await fetchCandidates();
    const candidates = (candData.ok && candData.candidates) ? candData.candidates : [];

    if (candidates.length === 0) {
      content.innerHTML = renderEmptyStateHtml();
      return;
    }

    let analysisOk = false;
    let analyses   = [];
    let analysisError = null;
    try {
      const analysisData = await fetchAnalysis(true);
      if (analysisData.ok) {
        analysisOk = true;
        analyses   = analysisData.analyses || [];
      } else {
        analysisError = analysisData.error || 'Analysis failed';
      }
    } catch (err) {
      analysisError = err.message;
    }

    const analysesById = Object.fromEntries(analyses.map(a => [a.id, a]));
    const enriched = candidates.map(c => ({
      ...c,
      recommendation:    analysesById[c.id]?.recommendation ?? null,
      confidence:        analysesById[c.id]?.confidence     ?? null,
      reasoning:         analysesById[c.id]?.reasoning      ?? null,
      analysisAvailable: analysisOk,
    }));

    content.innerHTML = renderHarvestTabHtml(enriched, analysisOk, analysisError);
    attachProposalRowListeners(content, 'harvest');
  } catch (err) {
    log.error('refreshHarvestAnalysis: failed', err);
  }
}

async function applyHarvestSelections() {
  const checkboxes  = document.querySelectorAll('input[data-harvest-id]:checked');
  const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.harvestId);
  const resultDiv   = document.getElementById('harvest-result');
  const applyBtn    = document.getElementById('harvest-apply-btn');

  if (selectedIds.length === 0) {
    if (resultDiv) resultDiv.innerHTML = '<p style="color:#b45309;">No items selected.</p>';
    return;
  }

  const confirmed = await (typeof showConfirmModal === 'function'
    ? showConfirmModal(
        `Promote ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''} to master CV?`,
        'This will permanently write changes to your Master_CV_Data.json. A backup will be created first.',
      )
    : Promise.resolve(window.confirm(`Promote ${selectedIds.length} item(s) to master CV?\n\nThis will permanently write changes to your Master_CV_Data.json.`)));

  if (!confirmed) return;

  if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = 'Applying…'; }
  if (resultDiv) resultDiv.innerHTML = '';

  try {
    const res  = await fetch('/api/harvest/apply', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ selected_ids: selectedIds }),
    });
    const data = await res.json();

    if (!data.ok) {
      if (resultDiv) resultDiv.innerHTML = `<p class="error-message">Apply failed: ${esc(data.error || 'Unknown error')}</p>`;
      return;
    }

    const writtenCount = data.written_count ?? 0;
    const commitHash   = data.commit_hash   ? ` (commit ${esc(data.commit_hash)})` : '';
    const backupNote   = data.backup_path   ? ` Backup saved to <code>${esc(data.backup_path)}</code>.` : '';
    const gitWarning   = data.git_error
      ? `<p style="color:#b45309;font-size:0.87em;">⚠️ Git commit skipped: ${esc(data.git_error?.message || data.git_error)}</p>`
      : '';

    if (resultDiv) {
      resultDiv.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:12px 16px;">
          <p style="color:#166534;font-weight:600;margin:0 0 4px;">
            ✅ ${writtenCount} item${writtenCount !== 1 ? 's' : ''} written to master CV${commitHash}.
          </p>
          ${backupNote ? `<p style="font-size:0.82em;color:#6b7280;margin:4px 0 0;">${backupNote}</p>` : ''}
          ${gitWarning}
        </div>`;
    }

    // Disable checkboxes for applied items
    for (const id of selectedIds) {
      const cb = document.getElementById(`harvest-chk-${id}`);
      if (cb) { cb.disabled = true; cb.checked = false; }
      const row = document.getElementById(`harvest-row-${id}`);
      if (row) row.style.opacity = '0.45';
    }
  } catch (err) {
    log.error('applyHarvestSelections: failed', err);
    if (resultDiv) resultDiv.innerHTML = `<p class="error-message">Network error: ${esc(err.message)}</p>`;
  } finally {
    if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = '✅ Apply Selected to Master CV'; }
  }
}

export { populateHarvestTab, applyHarvestSelections, refreshHarvestAnalysis, toggleHarvestSection };
