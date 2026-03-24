// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/ats-refinement.js
 * ATS score badge display and debounced refresh scheduling.
 *
 * DEPENDENCIES:
 *   - stateManager from state-manager.js (on globalThis)
 */

function _dispatchAtsScoreUpdated() {
  document.dispatchEvent(new CustomEvent('ats-score-updated'));
}

function _keywordCount(keywords, type, statuses = ['matched', 'partial']) {
  return keywords.filter(keyword => keyword.type === type && statuses.includes(keyword.status)).length;
}

function _buildSummaryDetail(score, keywords) {
  const missingHard = keywords
    .filter(keyword => keyword.type === 'hard' && keyword.status === 'missing')
    .map(keyword => keyword.keyword)
    .filter(Boolean);

  if (missingHard.length > 0) {
    const preview = missingHard.slice(0, 2).join(', ');
    const suffix = missingHard.length > 2 ? ` +${missingHard.length - 2} more` : '';
    return `Missing hard: ${preview}${suffix}`;
  }

  const exact = keywords.filter(keyword => keyword.match_type === 'exact').length;
  const partial = keywords.filter(keyword => keyword.match_type === 'partial').length;
  const topSections = Object.entries(score.section_scores || {})
    .filter(([, value]) => typeof value === 'number' && value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([section, value]) => `${section} ${Math.round(value)}%`);

  if (topSections.length > 0) {
    return `Top sections: ${topSections.join(' • ')}`;
  }

  if (exact > 0 || partial > 0) {
    return `Match quality: ${exact} exact • ${partial} partial`;
  }

  return `Basis: ${score.basis || 'review'}`;
}

function formatAtsScoreSummary(score) {
  const keywords = Array.isArray(score?.keyword_status) ? score.keyword_status : [];
  const overall = typeof score?.overall === 'number' ? Math.round(score.overall) : null;

  if (overall === null) {
    return { overall: null, line: '', detail: '', keywords };
  }

  if (keywords.length === 0) {
    return {
      overall,
      line: `Overall ${overall}%`,
      detail: `Basis: ${score.basis || 'review'}`,
      keywords,
    };
  }

  const hardTotal = keywords.filter(keyword => keyword.type === 'hard').length;
  const softTotal = keywords.filter(keyword => keyword.type === 'soft').length;
  const bonusTotal = keywords.filter(keyword => keyword.type === 'bonus').length;
  const summaryParts = [];

  if (hardTotal > 0) {
    summaryParts.push(`Hard ${_keywordCount(keywords, 'hard')}/${hardTotal}`);
  }
  if (softTotal > 0) {
    summaryParts.push(`Soft ${_keywordCount(keywords, 'soft')}/${softTotal}`);
  }
  if (bonusTotal > 0) {
    summaryParts.push(`Bonus ${_keywordCount(keywords, 'bonus')}/${bonusTotal}`);
  }

  return {
    overall,
    line: summaryParts.join(' • ') || `Overall ${overall}%`,
    detail: _buildSummaryDetail(score, keywords),
    keywords,
  };
}

function _updateAtsSummary(score) {
  const header = document.getElementById('ats-score-header');
  const summary = document.getElementById('ats-score-summary');
  const summaryLine = document.getElementById('ats-score-summary-line');
  const summaryDetail = document.getElementById('ats-score-summary-detail');

  if (!header || !summary || !summaryLine || !summaryDetail) return;

  const keywords = Array.isArray(score?.keyword_status) ? score.keyword_status : [];
  const hasScore = score && typeof score.overall === 'number';

  if (!hasScore) {
    header.style.display = 'none';
    summary.style.display = 'none';
    summaryLine.textContent = '';
    summaryDetail.textContent = '';
    return;
  }

  header.style.display = 'flex';

  if (keywords.length === 0) {
    summary.style.display = 'none';
    summaryLine.textContent = '';
    summaryDetail.textContent = '';
    return;
  }

  const summaryContent = formatAtsScoreSummary(score);
  summaryLine.textContent = summaryContent.line;
  summaryDetail.textContent = summaryContent.detail;
  summary.style.display = 'flex';
}

function updateAtsBadge(score) {
  _updateAtsSummary(score);

  const badge   = document.getElementById('ats-score-badge');
  const valueEl = document.getElementById('ats-score-value');
  if (!badge || !valueEl) {
    _dispatchAtsScoreUpdated();
    return;
  }

  if (!score || typeof score.overall !== 'number') {
    badge.style.display = 'none';
    _dispatchAtsScoreUpdated();
    return;
  }

  const overall = Math.round(score.overall);
  valueEl.textContent = `${overall}%`;
  badge.style.display = 'flex';

  badge.classList.remove('score-high', 'score-medium', 'score-low');
  if (overall >= 75) {
    badge.classList.add('score-high');
  } else if (overall >= 50) {
    badge.classList.add('score-medium');
  } else {
    badge.classList.add('score-low');
  }

  badge.setAttribute('aria-label', `ATS match score: ${overall}% (${score.basis || 'review'})`);
  _dispatchAtsScoreUpdated();
}

/**
 * Fetch ATS score from backend and update badge + stateManager.
 * Safe to call at any phase — does nothing when no session/analysis available.
 *
 * @param {string} [basis]  "analysis" | "review_checkpoint" | "post_generation"
 */
async function refreshAtsScore(basis = 'review_checkpoint') {
  const sessionId = stateManager.getSessionId();
  if (!sessionId) return;
  try {
    const res = await fetch('/api/cv/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, basis }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && data.ats_score) {
      stateManager.setAtsScore(data.ats_score);
      updateAtsBadge(data.ats_score);
    }
  } catch (_e) {
    // Non-fatal — badge stays hidden or shows stale value
  }
}

/** Debounced: defers refresh 600ms after the last call. */
let _atsRefreshTimer = null;
function scheduleAtsRefresh(basis = 'review_checkpoint') {
  clearTimeout(_atsRefreshTimer);
  _atsRefreshTimer = setTimeout(() => refreshAtsScore(basis), 600);
}

// ── ES module exports ──────────────────────────────────────────────────────
export { updateAtsBadge, refreshAtsScore, scheduleAtsRefresh, formatAtsScoreSummary };
