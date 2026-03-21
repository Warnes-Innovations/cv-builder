// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * ats-modals.js
 * ATS Report and Job Analysis modal dialogs + ATS Score tab renderer.
 *
 * DEPENDENCIES:
 * - app.js (for stateManager, tabData, htmlEscape / escapeHtml, populateAnalysisTab)
 * - index.html modal overlays: #ats-report-modal-overlay, #job-analysis-modal-overlay
 */

// ---------------------------------------------------------------------------
// ATS Report Modal
// ---------------------------------------------------------------------------

/**
 * Open the ATS Report modal. Renders the cached ATS score from state, or
 * fetches a fresh score if none is cached.
 */
async function openAtsReportModal() {
  document.getElementById('ats-report-modal-overlay').style.display = 'flex';
  const body = document.getElementById('ats-report-modal-body');

  const cached = stateManager?.getAtsScore?.();
  if (cached) {
    body.innerHTML = _renderAtsReport(cached);
    return;
  }

  body.innerHTML = '<p style="padding:24px;text-align:center;color:#6b7280;">Fetching ATS score…</p>';
  try {
    const sessionId = stateManager?.getSessionId?.();
    const res = await fetch('/api/cv/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, basis: 'review_checkpoint' }),
    });
    const data = await res.json();
    if (data.ok && data.ats_score) {
      stateManager?.setAtsScore?.(data.ats_score);
      if (typeof updateAtsBadge === 'function') updateAtsBadge(data.ats_score);
      body.innerHTML = _renderAtsReport(data.ats_score);
    } else {
      body.innerHTML = `<p style="padding:24px;color:#ef4444;">Could not load ATS report: ${escapeHtml(data.error || 'unknown error')}</p>`;
    }
  } catch (e) {
    body.innerHTML = `<p style="padding:24px;color:#ef4444;">Error: ${escapeHtml(e.message)}</p>`;
  }
}

function closeAtsReportModal() {
  document.getElementById('ats-report-modal-overlay').style.display = 'none';
}

/**
 * Render an ATS score object into HTML for the modal body.
 */
function _renderAtsReport(score) {
  const overall = Math.round(score.overall ?? 0);
  const hard = Math.round(score.hard_requirement_score ?? 0);
  const soft = Math.round(score.soft_requirement_score ?? 0);

  const scoreColor = overall >= 75 ? '#10b981' : overall >= 50 ? '#f59e0b' : '#ef4444';

  const keywords = score.keyword_status || [];
  const matchedKw = keywords.filter(k => k.found);
  const missingKw = keywords.filter(k => !k.found);

  const kwHtml = keywords.length === 0 ? '' : `
    <div style="margin-top:16px;">
      <h4 style="margin:0 0 8px;font-size:1rem;color:#334155;">Keywords</h4>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${keywords.map(k => `
          <span style="padding:2px 8px;border-radius:12px;font-size:0.85em;
            background:${k.found ? '#dcfce7' : '#fee2e2'};
            color:${k.found ? '#166534' : '#991b1b'};">
            ${escapeHtml(k.keyword || k.term || '')}${k.rank ? ` #${k.rank}` : ''}
          </span>`).join('')}
      </div>
    </div>`;

  const sectionScores = score.section_scores || {};
  const sectHtml = Object.keys(sectionScores).length === 0 ? '' : `
    <div style="margin-top:16px;">
      <h4 style="margin:0 0 8px;font-size:1rem;color:#334155;">Section Scores</h4>
      <table style="width:100%;border-collapse:collapse;font-size:0.9em;">
        ${Object.entries(sectionScores).map(([sec, val]) => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 8px;text-transform:capitalize;color:#475569;">${escapeHtml(sec)}</td>
            <td style="padding:4px 8px;font-weight:600;color:#1e293b;">${Math.round(val)}%</td>
          </tr>`).join('')}
      </table>
    </div>`;

  return `
    <div style="padding:20px;">
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:20px;">
        <div style="font-size:2.4em;font-weight:700;color:${scoreColor};">${overall}%</div>
        <div>
          <div style="font-size:0.9em;color:#475569;">Hard requirements: <strong>${hard}%</strong></div>
          <div style="font-size:0.9em;color:#475569;">Preferred skills: <strong>${soft}%</strong></div>
          <div style="font-size:0.75em;color:#94a3b8;margin-top:2px;">Basis: ${escapeHtml(score.basis || 'review')}</div>
        </div>
      </div>
      ${kwHtml}
      ${sectHtml}
      ${missingKw.length > 0 ? `
        <div style="margin-top:16px;padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;">
          <strong style="color:#9a3412;">Missing keywords (${missingKw.length}):</strong>
          <span style="color:#7c2d12;font-size:0.9em;"> ${missingKw.map(k => escapeHtml(k.keyword || k.term || '')).join(', ')}</span>
        </div>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// Job Analysis Modal
// ---------------------------------------------------------------------------

/**
 * Open the Job Analysis modal. Reuses tabData.analysis if available.
 */
function openJobAnalysisModal() {
  document.getElementById('job-analysis-modal-overlay').style.display = 'flex';
  const body = document.getElementById('job-analysis-modal-body');

  const analysis = window.tabData?.analysis;
  if (analysis) {
    // Render into a temp div using populateAnalysisTab's output pattern
    const tmp = document.createElement('div');
    tmp.style.padding = '20px';
    body.innerHTML = '';
    body.appendChild(tmp);
    // populateAnalysisTab writes to #document-content; use a shim
    _renderAnalysisIntoEl(tmp, analysis);
  } else {
    body.innerHTML = '<p style="padding:24px;text-align:center;color:#6b7280;">No job analysis available. Run job analysis first.</p>';
  }
}

function closeJobAnalysisModal() {
  document.getElementById('job-analysis-modal-overlay').style.display = 'none';
}

/**
 * Render job analysis data into an arbitrary container element.
 * Mirrors the structure from populateAnalysisTab in app.js.
 */
function _renderAnalysisIntoEl(el, result) {
  if (!result) {
    el.innerHTML = '<p style="color:#6b7280;">No analysis data.</p>';
    return;
  }

  const req = result.required_skills || [];
  const pref = result.preferred_skills || result.nice_to_have || [];
  const keywords = result.ats_keywords || [];
  const culture = result.culture_indicators || [];
  const mustHave = result.must_have_requirements || [];
  const missing = result.missing_required || [];

  el.innerHTML = `
    <div style="font-size:0.95em;line-height:1.6;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:14px;">
        <div style="font-size:1.1em;font-weight:700;color:#1e293b;">${escapeHtml(result.job_title || result.title || 'Role')}</div>
        ${result.company ? `<div style="color:#475569;">${escapeHtml(result.company)}</div>` : ''}
        ${result.domain ? `<span style="display:inline-block;margin-top:6px;padding:2px 8px;background:#dbeafe;color:#1e40af;border-radius:10px;font-size:0.8em;">${escapeHtml(result.domain)}</span>` : ''}
      </div>

      ${missing.length > 0 ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 14px;margin-bottom:14px;">
          <strong style="color:#9a3412;">⚠ Missing required skills:</strong>
          <div style="color:#7c2d12;margin-top:4px;">${missing.map(s => escapeHtml(s)).join(' · ')}</div>
        </div>` : ''}

      ${req.length > 0 ? `
        <div style="margin-bottom:14px;">
          <h4 style="margin:0 0 8px;font-size:0.95em;text-transform:uppercase;letter-spacing:.5px;color:#334155;">Required Skills</h4>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${req.map(s => `<span style="padding:2px 10px;border-radius:12px;background:${missing.includes(s)?'#fee2e2':'#dcfce7'};color:${missing.includes(s)?'#991b1b':'#166534'};font-size:0.85em;">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>` : ''}

      ${pref.length > 0 ? `
        <div style="margin-bottom:14px;">
          <h4 style="margin:0 0 8px;font-size:0.95em;text-transform:uppercase;letter-spacing:.5px;color:#334155;">Preferred / Nice-to-have</h4>
          <ul style="margin:0;padding-left:18px;color:#475569;">${pref.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>` : ''}

      ${keywords.length > 0 ? `
        <div style="margin-bottom:14px;">
          <h4 style="margin:0 0 8px;font-size:0.95em;text-transform:uppercase;letter-spacing:.5px;color:#334155;">ATS Keywords</h4>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${keywords.map((k, i) => `<span style="padding:2px 8px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-size:0.82em;">${i < 5 ? `<strong>#${i+1}</strong> ` : ''}${escapeHtml(typeof k === 'string' ? k : k.keyword || k.term || '')}</span>`).join('')}
          </div>
        </div>` : ''}

      ${mustHave.length > 0 ? `
        <div style="margin-bottom:14px;">
          <h4 style="margin:0 0 8px;font-size:0.95em;text-transform:uppercase;letter-spacing:.5px;color:#334155;">Must-have Requirements</h4>
          <ul style="margin:0;padding-left:18px;color:#475569;">${mustHave.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>` : ''}

      ${culture.length > 0 ? `
        <div>
          <h4 style="margin:0 0 8px;font-size:0.95em;text-transform:uppercase;letter-spacing:.5px;color:#334155;">Culture Indicators</h4>
          <ul style="margin:0;padding-left:18px;color:#475569;">${culture.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// ATS Score Tab (in customize phase)
// ---------------------------------------------------------------------------

/**
 * Populate the ATS Score tab content area.
 * Called by app.js switchTab when case 'ats-score' is selected.
 */
async function populateAtsScoreTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  const cached = stateManager?.getAtsScore?.();
  if (cached) {
    content.innerHTML = `<div style="max-width:680px;margin:0 auto;">${_renderAtsReport(cached)}</div>`;
    return;
  }

  content.innerHTML = '<div class="empty-state"><div class="icon">📊</div><h3>ATS Score</h3><p>Complete job analysis and skills review to see your ATS score</p><button class="btn btn-primary" onclick="refreshAtsScore(\'review_checkpoint\').then(()=>populateAtsScoreTab())">Compute ATS Score</button></div>';
}

// ---------------------------------------------------------------------------
// Show/hide the modal shortcut buttons when ATS badge becomes visible
// ---------------------------------------------------------------------------

/**
 * Show or hide the ATS Report and Job Analysis shortcut buttons.
 * Driven by the 'ats-score-updated' custom event dispatched by app.js
 * whenever updateAtsBadge() runs. No monkey-patching required.
 */
document.addEventListener('ats-score-updated', () => {
  const badge = document.getElementById('ats-score-badge');
  const visible = badge && badge.style.display !== 'none';
  const reportBtn = document.getElementById('ats-report-btn');
  const analysisBtn = document.getElementById('job-analysis-btn');
  if (reportBtn) reportBtn.style.display = visible ? 'inline-block' : 'none';
  if (analysisBtn) analysisBtn.style.display = visible ? 'inline-block' : 'none';
});
