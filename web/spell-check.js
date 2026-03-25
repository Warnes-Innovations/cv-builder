// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/spell-check.js
 * Spell & grammar check tab: fetch sections, render suggestions,
 * apply/dismiss corrections, submit audit.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, appendLoadingMessage, removeLoadingMessage, appendMessage,
 *   showAlertModal, showConfirmModal, setLoading, fetchStatus, sendAction,
 *   scheduleAtsRefresh, CSS
 */

import { getLogger } from './logger.js';
const log = getLogger('spell-check');

import { stateManager } from './state-manager.js';

// Module-level state
let spellAudit = [];

// ── Populate spell-check tab ──────────────────────────────────────────────────

async function populateSpellCheckTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = `
    <h1>🔤 Spell &amp; Grammar Check</h1>
    <p style="color:#6b7280;margin-bottom:24px;">Checking CV sections for spelling and grammar issues…</p>
    <div id="spell-loading" style="text-align:center;padding:40px;">
      <div class="loading-spinner"></div>
      <p style="color:#6b7280;margin-top:12px;">Running LanguageTool checks…</p>
    </div>
    <div id="spell-results" style="display:none;"></div>
  `;
  spellAudit = [];
  window._spellSugMap = {};

  try {
    // Fetch sections to check
    const sectionsRes = await fetch('/api/spell-check-sections');
    const sectionsData = await sectionsRes.json();
    if (!sectionsData.ok) {
      document.getElementById('spell-loading').innerHTML = `<p class="error-message">Failed to load sections: ${sectionsData.error || 'Unknown error'}</p>`;
      return;
    }

    const sections = sectionsData.sections || [];
    if (sections.length === 0) {
      // Fast-path: no sections to check — advance phase immediately
      await completeSpellCheckFastPath('No CV sections available to check.');
      return;
    }

    // Check each section
    const flaggedSections = [];
    const aggregateStats = sectionsData.aggregate_stats || {};
    let incorrectWords = 0;
    let grammarIssues = 0;
    let customDictSize = sectionsData.custom_dict_size || 0;
    for (const section of sections) {
      const res  = await fetch('/api/spell-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: section.text, context: section.context })
      });
      const data = await res.json();
      if (data.stats) {
        if (data.custom_dict_size) customDictSize = data.custom_dict_size;
        incorrectWords += data.stats.unknown_word_count || 0;
        grammarIssues += data.stats.grammar_issue_count || 0;
      }
      if (data.ok && data.suggestions && data.suggestions.length > 0) {
        flaggedSections.push({ section, suggestions: data.suggestions });
      }
    }

    document.getElementById('spell-loading').style.display = 'none';

    if (flaggedSections.length === 0) {
      // Zero-flag fast-path
      await completeSpellCheckFastPath(
        'Spell check passed — no issues found.',
        buildSpellStatsSummary({
          total_sections: sections.length,
          total_words: aggregateStats.word_count || 0,
          unique_words: aggregateStats.unique_words || 0,
          custom_dict_words: aggregateStats.custom_dict_words || 0,
          incorrect_words: incorrectWords,
          grammar_issues: grammarIssues,
        }),
        customDictSize,
      );
      return;
    }

    // Render suggestions panel
    renderSpellSuggestions(flaggedSections, sections.length, {
      total_sections: sections.length,
      total_words: aggregateStats.word_count || 0,
      unique_words: aggregateStats.unique_words || 0,
      custom_dict_words: aggregateStats.custom_dict_words || 0,
      incorrect_words: incorrectWords,
      grammar_issues: grammarIssues,
    }, customDictSize);

  } catch (err) {
    log.error('Spell check error:', err);
    document.getElementById('spell-loading').innerHTML = `<p style="color:#ef4444;padding:20px;">Spell check failed: ${err.message}</p>`;
  }
}

// ── Fast-path (no issues) ─────────────────────────────────────────────────────

async function completeSpellCheckFastPath(message, statsLine = '', customDictSize = 0) {
  // Save empty audit and advance to generation
  const res  = await fetch('/api/spell-check-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spell_audit: [] })
  });
  const data = await res.json();
  const content = document.getElementById('document-content');
  const statsParts = [];
  if (statsLine) statsParts.push(`<p style="color:#6b7280;font-size:0.95em;margin:8px 0 0;">${escapeHtml(statsLine)}</p>`);
  if (customDictSize > 0) statsParts.push(`<p style="color:#6b7280;font-size:0.9em;margin:4px 0 0;">Custom dictionary: ${customDictSize.toLocaleString()} word${customDictSize !== 1 ? 's' : ''}</p>`);
  content.innerHTML = `
    <div style="text-align:center;padding:60px 20px;">
      <div style="font-size:3em;margin-bottom:16px;">✅</div>
      <h2 style="color:#166534;">${escapeHtml(message)}</h2>
      ${statsParts.join('\n')}
      <p style="color:#6b7280;margin:16px 0 24px;">Advancing to CV generation…</p>
    </div>
  `;
  // Refresh status then navigate to CV tab and generate
  await fetchStatus();
  await sendAction('generate_cv');
}

// ── Stats summary ─────────────────────────────────────────────────────────────

function buildSpellStatsSummary(stats = {}) {
  return [
    `${(stats.total_sections || 0).toLocaleString()} section${stats.total_sections === 1 ? '' : 's'} checked`,
    `${(stats.total_words || 0).toLocaleString()} words`,
    `${(stats.unique_words || 0).toLocaleString()} unique`,
    `${(stats.custom_dict_words || 0).toLocaleString()} custom dictionary match${stats.custom_dict_words === 1 ? '' : 'es'}`,
    `${(stats.incorrect_words || 0).toLocaleString()} unknown/incorrect`,
    `${(stats.grammar_issues || 0).toLocaleString()} grammar issue${stats.grammar_issues === 1 ? '' : 's'}`,
  ].join(' · ');
}

// ── Render suggestions panel ──────────────────────────────────────────────────

function renderSpellSuggestions(flaggedSections, totalSections, stats = {}, customDictSize = 0) {
  const results = document.getElementById('spell-results');
  results.style.display = '';
  const statsLine = buildSpellStatsSummary(stats);

  let html = `
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <strong>⚠ ${flaggedSections.reduce((t, f) => t + f.suggestions.length, 0)} issue${flaggedSections.reduce((t, f) => t + f.suggestions.length, 0) !== 1 ? 's' : ''}</strong> found
      across ${flaggedSections.length} of ${totalSections} section${totalSections !== 1 ? 's' : ''}.
      Review each suggestion below, then click <strong>Done</strong>.
      <div style="margin-top:8px;font-size:0.92em;color:#6b7280;">${escapeHtml(statsLine)}</div>
      ${customDictSize > 0 ? `<div style="margin-top:4px;font-size:0.88em;color:#6b7280;">Custom dictionary size: ${customDictSize.toLocaleString()} word${customDictSize !== 1 ? 's' : ''}</div>` : ''}
    </div>
  `;

  flaggedSections.forEach(({ section, suggestions }) => {
    html += `<div class="review-section" style="margin-bottom:24px;">
      <h3 style="font-size:1em;font-weight:700;color:#374151;margin-bottom:12px;">${escapeHtml(section.label)}</h3>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:10px;font-size:0.9em;white-space:pre-wrap;">${escapeHtml(section.text)}</div>
    `;
    suggestions.forEach((sug, idx) => {
      const sugId = `sug_${section.id}_${idx}`;
      const reps = sug.replacements || [];
      html += `
        <div class="spell-suggestion" id="${sugId}" data-section-id="${escapeHtml(section.id)}" data-idx="${idx}"
             style="border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:8px;background:#fff;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <div style="flex:1;">
              <div style="font-size:0.88em;color:#6b7280;margin-bottom:4px;">
                <span style="background:#fee2e2;color:#dc2626;border-radius:4px;padding:1px 6px;font-weight:600;">${escapeHtml(sug.flagged)}</span>
                <span style="margin-left:8px;">${escapeHtml(sug.message)}</span>
              </div>
              <div style="font-style:italic;font-size:0.85em;color:#374151;margin-bottom:8px;">${escapeHtml(sug.snippet)}</div>
              ${reps.length > 0 ? `
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                <span style="font-size:0.82em;color:#6b7280;align-self:center;">Suggestions:</span>
                ${reps.map((r, ri) => `<button class="rewrite-keyword" onclick="applySpellReplacement('${escapeHtml(section.id)}', ${idx}, ${ri})"
                  style="cursor:pointer;border:1px solid #3b82f6;background:#dbeafe;">${escapeHtml(r)}</button>`).join('')}
              </div>` : ''}
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <input type="text" id="edit_${sugId}"
                  placeholder="Type custom correction…"
                  value="${escapeHtml(reps[0] || '')}"
                  style="flex:1;font-size:0.88em;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;"
                  onkeydown="if(event.key==='Enter'){event.preventDefault();applyCustomSpellCorrection('${escapeHtml(section.id)}',${idx});}">
                <button class="icon-btn" onclick="applyCustomSpellCorrection('${escapeHtml(section.id)}',${idx})" title="Apply custom correction">Apply</button>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="icon-btn" onclick="dismissSpellSuggestion('${escapeHtml(sugId)}', '${escapeHtml(section.id)}', ${idx}, '${escapeHtml(sug.flagged)}')"
                    title="Ignore this suggestion">Ignore</button>
                <button class="icon-btn" onclick="addSpellWord('${escapeHtml(sug.flagged)}', '${escapeHtml(sugId)}')"
                    title="Add to custom dictionary">Add to Dictionary</button>
              </div>
            </div>
          </div>
        </div>
      `;
      // Register in audit as pending
      if (!window._spellSugMap) window._spellSugMap = {};
      window._spellSugMap[`${section.id}_${idx}`] = {
        section_id:    section.id,
        context_type: section.context,
        location:     section.label,
        original:     sug.flagged,
        suggestion:   (reps[0] || ''),
        offset:       sug.offset,
        length:       sug.length,
        rule:         sug.rule_id || '',
        outcome:      'pending',
        final:        sug.flagged,
      };
    });
    html += '</div>';
  });

  html += `
    <div class="nav-buttons" style="margin:24px 0;">
      <button class="submit-btn" onclick="submitSpellCheckDecisions()">Done — Generate CV</button>
    </div>
  `;
  results.innerHTML = html;
}

// ── Apply / dismiss corrections ───────────────────────────────────────────────

function applyCustomSpellCorrection(sectionId, idx) {
  const key    = `${sectionId}_${idx}`;
  const entry  = (window._spellSugMap || {})[key];
  if (!entry) return;
  const input  = document.getElementById(`edit_sug_${sectionId}_${idx}`);
  const custom = input ? input.value.trim() : '';
  if (!custom) return;
  entry.outcome = 'accept';
  entry.final   = custom;
  const sugEl = document.querySelector(`.spell-suggestion[data-section-id="${CSS.escape(sectionId)}"][data-idx="${idx}"]`);
  if (!sugEl) return;
  const flaggedSpan = sugEl.querySelector('span[style*="background:#fee2e2"]');
  if (flaggedSpan) {
    flaggedSpan.outerHTML = `<del style="color:#dc2626;">${escapeHtml(entry.original)}</del> → <ins style="color:#166534;text-decoration:none;">${escapeHtml(custom)}</ins>`;
  }
  sugEl.style.opacity = '0.5';
}

function applySpellReplacement(sectionId, idx, repIdx) {
  const key  = `${sectionId}_${idx}`;
  const entry = (window._spellSugMap || {})[key];
  if (!entry) return;
  // The replacements list is not directly accessible here — read from DOM suggestion
  const sugEl = document.querySelector(`.spell-suggestion[data-section-id="${CSS.escape(sectionId)}"][data-idx="${idx}"]`);
  if (!sugEl) return;
  const buttons = sugEl.querySelectorAll('.rewrite-keyword');
  const rep = buttons[repIdx] ? buttons[repIdx].textContent.trim() : '';
  entry.outcome = 'accept';
  entry.final   = rep;
  // Visual feedback: strike the flagged word, show replacement
  const flaggedSpan = sugEl.querySelector('span[style*="background:#fee2e2"]');
  if (flaggedSpan) {
    flaggedSpan.outerHTML = `<del style="color:#dc2626;">${escapeHtml(entry.original)}</del> → <ins style="color:#166534;text-decoration:none;">${escapeHtml(rep)}</ins>`;
  }
  sugEl.style.opacity = '0.5';
}

function dismissSpellSuggestion(sugId, sectionId, idx, word) {
  const key   = `${sectionId}_${idx}`;
  const entry = (window._spellSugMap || {})[key];
  if (entry) { entry.outcome = 'reject'; entry.final = word; }
  const el = document.getElementById(sugId);
  if (el) el.style.opacity = '0.4';
}

async function addSpellWord(word, sugId) {
  try {
    const res = await fetch('/api/custom-dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    const data = await res.json();
    if (data.ok) {
      const el = document.getElementById(sugId);
      if (el) {
        el.style.opacity = '0.4';
        const msg = document.createElement('div');
        msg.style.cssText = 'color:#166534;font-size:0.85em;margin-top:4px;';
        msg.textContent = `"${word}" added to dictionary.`;
        el.appendChild(msg);
      }
      // Also record in audit
      const parts = sugId.replace(/^sug_/, '').split('_');
      const idx = parseInt(parts.pop(), 10);
      const sectionId = parts.join('_');
      const key = `${sectionId}_${idx}`;
      const entry = (window._spellSugMap || {})[key];
      if (entry) { entry.outcome = 'add_dict'; entry.final = word; }
    }
  } catch (err) {
    log.error('Error adding to dictionary:', err);
  }
}

// ── Submit audit ──────────────────────────────────────────────────────────────

async function submitSpellCheckDecisions() {
  /* duckflow: {
   *   "id": "spell_ui_submit_live",
   *   "kind": "ui",
   *   "timestamp": "2026-03-25T21:39:48Z",
   *   "status": "live",
   *   "handles": ["ui:spell-check.submit"],
   *   "calls": ["POST /api/spell-check-complete", "POST /api/action"],
   *   "reads": ["window:_spellSugMap"],
   *   "writes": ["request:POST /api/spell-check-complete.spell_audit", "window:spellAudit"],
   *   "notes": "Collapses reviewed spell suggestions into the canonical spell audit, persists that audit in session state, and then triggers generation using the corrected content."
  * }
  */
  // Count items still marked 'pending' (not explicitly reviewed)
  const pendingEntries = Object.values(window._spellSugMap || {}).filter(e => e.outcome === 'pending');
  if (pendingEntries.length > 0) {
    const n = pendingEntries.length;
    const confirmed = await showConfirmModal(
      '⚠ Unreviewed Issues',
      `${n} issue${n !== 1 ? 's have' : ' has'} not been reviewed and will be ignored.\nProceed anyway?`,
      'Proceed'
    );
    if (!confirmed) return;
  }

  // Collect audit from _spellSugMap
  const audit = Object.values(window._spellSugMap || {}).filter(e => e.outcome !== 'pending');
  // Remaining 'pending' items are explicitly auto-ignored after confirmation above
  Object.values(window._spellSugMap || {}).forEach(e => {
    if (e.outcome === 'pending') { e.outcome = 'ignore'; audit.push(e); }
  });
  spellAudit = audit;

  const loadingMsg = appendLoadingMessage('Saving spell check decisions…');
  setLoading(true, 'Saving spell-check decisions…');
  try {
    const res  = await fetch('/api/spell-check-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spell_audit: spellAudit })
    });
    const data = await res.json();
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    if (!res.ok) {
      showAlertModal('❌ Error', `Failed to save spell check: ${data.error || 'Unknown error'}`);
      return;
    }
    stateManager.markContentChanged();
    appendMessage('assistant', `✅ Spell check complete — ${spellAudit.length} item${spellAudit.length !== 1 ? 's' : ''} reviewed. Generating your CV…`);
    scheduleAtsRefresh('review_checkpoint');
    await fetchStatus();
    await sendAction('generate_cv');
  } catch (err) {
    removeLoadingMessage(loadingMsg);
    setLoading(false);
    showAlertModal('❌ Error', `Spell check error: ${err.message}`);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  spellAudit,
  populateSpellCheckTab,
  completeSpellCheckFastPath,
  buildSpellStatsSummary,
  renderSpellSuggestions,
  applyCustomSpellCorrection,
  applySpellReplacement,
  dismissSpellSuggestion,
  addSpellWord,
  submitSpellCheckDecisions,
};
