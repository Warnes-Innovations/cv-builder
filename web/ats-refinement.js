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
 *   - globalThis.stateManager from state-manager.js (accessed via globalThis throughout)
 */

function _dispatchAtsScoreUpdated() {
  document.dispatchEvent(new CustomEvent('ats-score-updated'));
}

function _safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function _coerceObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function _formatDateLabel(value) {
  const text = _safeText(value);
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-');
    return `${month}/${day}/${year}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return text;
}

function _getPageLengthLabel() {
  const generationState = _coerceObject(globalThis.stateManager?.getGenerationState?.());
  const exact = Number(generationState.pageCountExact);
  if (Number.isFinite(exact) && exact > 0) {
    return `Length ${exact} page${exact === 1 ? '' : 's'}`;
  }

  const estimate = Number(generationState.pageCountEstimate);
  if (Number.isFinite(estimate) && estimate > 0) {
    return `Length ${estimate.toFixed(1)} pages est`;
  }

  return '';
}

function _getJobSummaryLabel() {
  const intake = _coerceObject(window._statusIntake);
  const analysis = _coerceObject(globalThis.stateManager?.getTabData?.('analysis'));
  const positionFallback = _safeText(document.getElementById('position-title')?.textContent || '');

  const role = _safeText(
    intake.role
      || analysis.job_title
      || analysis.title
      || analysis.position_name
      || ''
  );
  const company = _safeText(intake.company || analysis.company_name || analysis.company || '');
  const dateApplied = _formatDateLabel(
    intake.date_applied
      || analysis.date_applied
      || analysis.application_date
      || ''
  );

  const primary = role && company
    ? `${role} @ ${company}`
    : (role || company || positionFallback);
  if (!primary) return '';
  if (!dateApplied) return primary;
  return `${primary} (${dateApplied})`;
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
  const pageLengthLabel = _getPageLengthLabel();
  const jobSummaryLabel = _getJobSummaryLabel();

  if (!hasScore) {
    header.style.display = 'none';
    summary.style.display = 'none';
    summaryLine.textContent = '';
    summaryDetail.textContent = '';
    return;
  }

  header.style.display = 'flex';

  const summaryContent = formatAtsScoreSummary(score);
  const lineParts = [summaryContent.line, pageLengthLabel].filter(Boolean);
  const detailParts = [jobSummaryLabel, summaryContent.detail].filter(Boolean);

  if (lineParts.length === 0 && detailParts.length === 0 && keywords.length === 0) {
    summary.style.display = 'none';
    summaryLine.textContent = '';
    summaryDetail.textContent = '';
    return;
  }

  summaryLine.textContent = lineParts.join(' • ');
  summaryDetail.textContent = detailParts.join(' • ');
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
  const sessionId = globalThis.stateManager?.getSessionId?.();
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
      globalThis.stateManager?.setAtsScore?.(data.ats_score);
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

function _refreshSummaryFromState() {
  const score = globalThis.stateManager?.getAtsScore?.();
  if (score && typeof score.overall === 'number') {
    _updateAtsSummary(score);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('cvbuilder:generation-state-changed', () => {
    _refreshSummaryFromState();
  });
}

if (typeof document !== 'undefined') {
  const positionTitleEl = document.getElementById('position-title');
  if (positionTitleEl && typeof MutationObserver !== 'undefined') {
    const titleObserver = new MutationObserver(() => {
      _refreshSummaryFromState();
    });
    titleObserver.observe(positionTitleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
}

// ── ES module exports ──────────────────────────────────────────────────────
export { updateAtsBadge, refreshAtsScore, scheduleAtsRefresh, formatAtsScoreSummary };
