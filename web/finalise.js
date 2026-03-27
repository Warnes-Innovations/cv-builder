// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/finalise.js
 * Finalise & archive tab: finalise application, harvest candidates,
 * apply selected updates to master CV data.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, _renderConsistencyReport
 */

import { getLogger } from './logger.js';
import { formatAtsScoreSummary } from './ats-refinement.js';
const log = getLogger('finalise');

function _renderFinaliseAtsItems(score, atsKeywords) {
  if (!score || typeof score.overall !== 'number') {
    return `<li>ATS keywords tracked: ${atsKeywords.length}</li>`;
  }

  const summary = formatAtsScoreSummary(score);
  const hardScore = typeof score.hard_requirement_score === 'number'
    ? `${Math.round(score.hard_requirement_score)}%`
    : 'n/a';
  const softScore = typeof score.soft_requirement_score === 'number'
    ? `${Math.round(score.soft_requirement_score)}%`
    : 'n/a';

  return [
    `<li>ATS score: <strong>${summary.overall}%</strong> <span style="color:#475569;">(hard ${hardScore} • soft ${softScore})</span></li>`,
    `<li>ATS coverage: ${escapeHtml(summary.line)}</li>`,
    `<li>ATS detail: ${escapeHtml(summary.detail)}</li>`,
  ].join('');
}

// ── Populate finalise tab ─────────────────────────────────────────────────────

async function populateFinaliseTab() {
  const content = document.getElementById('document-content');

  // Fetch current status to get generated files and job analysis for consistency check
  let generated  = null;
  let statusData = null;
  try {
    const res  = await fetch('/api/status');
    statusData = await res.json();
    generated  = statusData.generated_files || null;
  } catch (err) { log.warn('Failed to fetch status for finalise tab:', err); }

  if (!generated || !generated.output_dir) {
    content.innerHTML = `
      <h1>✅ Finalise Application</h1>
      <div class="empty-state">
        <div class="icon">📂</div>
        <h3>No CV Generated Yet</h3>
        <p>Please generate a CV first before finalising.</p>
      </div>`;
    return;
  }

  const files = generated.files || [];

  let html = `
    <h1>✅ Finalise Application</h1>
    <p style="color:#6b7280;margin-bottom:24px;">
      Archive this application to your CV history, update the response library, and optionally
      write any improvements back to Master CV Data.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
      <h3 style="margin:0 0 10px;">📂 Generated Files</h3>
      <ul style="margin:0;padding-left:20px;line-height:1.8;">
        ${files.map(f => `<li><code style="font-size:0.9em;">${escapeHtml(f)}</code></li>`).join('') || '<li>(none)</li>'}
      </ul>
      <p style="margin:8px 0 0;font-size:0.85em;color:#166534;">Output dir: <code>${escapeHtml(generated.output_dir)}</code></p>
    </div>

    <div id="consistency-report"></div>

    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;">📋 Application Status</h3>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;" for="finalise-status">Status</label>
        <select id="finalise-status" style="width:220px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95em;">
          <option value="draft">Draft — not yet sent</option>
          <option value="ready" selected>Ready to send</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;" for="finalise-notes">Notes</label>
        <textarea id="finalise-notes" rows="4"
          style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;
                 font-size:0.92em;resize:vertical;box-sizing:border-box;"
          placeholder="Recruiter name, salary info, follow-up date, interview notes…"></textarea>
      </div>

      <button id="finalise-btn" onclick="finaliseApplication()"
        style="background:#059669;color:#fff;border:none;border-radius:6px;
               padding:10px 24px;font-size:1em;font-weight:600;cursor:pointer;">
        ✅ Finalise &amp; Archive
      </button>
    </div>

    <div id="finalise-result" style="display:none;"></div>
    <div id="harvest-section" style="display:none;"></div>
  `;

  content.innerHTML = html;
  if (statusData) _renderConsistencyReport(statusData);
}

// ── Finalise application ──────────────────────────────────────────────────────

async function finaliseApplication() {
  /* duckflow:
   *   id: finalise_ui_submit_live
   *   kind: ui
   *   timestamp: '2026-03-25T21:39:48Z'
   *   status: live
   *   handles:
   *   - ui:finalise.submit
   *   calls:
   *   - POST /api/finalise
   *   reads:
   *   - dom:#finalise-status.value
   *   - dom:#finalise-notes.value
   *   writes:
   *   - request:POST /api/finalise.status
   *   - request:POST /api/finalise.notes
   *   - dom:#finalise-result
   *   notes: Submits final application status and notes so backend metadata, archive state, and optional git finalization can be written from the current session.
   */
  const btn    = document.getElementById('finalise-btn');
  const result = document.getElementById('finalise-result');
  const status = document.getElementById('finalise-status').value;
  const notes  = document.getElementById('finalise-notes').value;

  btn.disabled    = true;
  btn.textContent = '⏳ Finalising…';
  result.style.display = 'none';
  result.innerHTML     = '';

  try {
    const res  = await fetch('/api/finalise', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, notes }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      result.style.display = 'block';
      result.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
        padding:14px 18px;color:#991b1b;">
        <strong>❌ Error:</strong> ${escapeHtml(data.error || 'Finalise failed')}
      </div>`;
      btn.disabled    = false;
      btn.textContent = '✅ Finalise & Archive';
      return;
    }

    const summary = data.summary || {};
    const hash    = data.commit_hash ? `<code style="font-size:0.85em;">${escapeHtml(data.commit_hash)}</code>` : '(no commit)';
    const gitWarn = data.git_error
      ? `<p style="color:#d97706;font-size:0.87em;margin-top:8px;">⚠ Git: ${escapeHtml(data.git_error)}</p>`
      : '';
    const approvedCount = summary.approved_rewrites ?? 0;
    const atsKeywords   = summary.ats_keywords || [];
    const atsScore      = summary.ats_score || null;

    result.style.display = 'block';
    result.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <strong>✅ Application archived!</strong>
        <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;font-size:0.92em;">
          <li>Status: <strong>${escapeHtml(status)}</strong></li>
          <li>Approved rewrites: ${approvedCount}</li>
          ${_renderFinaliseAtsItems(atsScore, atsKeywords)}
          <li>Git commit: ${hash}</li>
        </ul>
        ${gitWarn}
      </div>`;

    btn.textContent = '✅ Archived';

    // Show harvest section
    await showHarvestSection();
  } catch (err) {
    result.style.display = 'block';
    result.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
      padding:14px 18px;color:#991b1b;">
      <strong>❌ Network error:</strong> ${escapeHtml(err.message)}
    </div>`;
    btn.disabled    = false;
    btn.textContent = '✅ Finalise & Archive';
  }
}

// ── Show harvest section ──────────────────────────────────────────────────────

async function showHarvestSection() {
  const section = document.getElementById('harvest-section');
  section.style.display = 'block';
  section.innerHTML = `
    <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
    <p style="color:#6b7280;margin-bottom:16px;">Loading improvement candidates from this session…</p>
    <div style="text-align:center;padding:24px;"><div class="loading-spinner"></div></div>`;

  try {
    const res  = await fetch('/api/harvest/candidates');
    const data = await res.json();

    if (!data.ok) {
      section.innerHTML = `
        <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
          padding:12px 16px;color:#991b1b;">
          ❌ ${escapeHtml(data.error || 'Failed to load candidates')}
        </div>`;
      return;
    }

    const candidates = data.candidates || [];

    if (candidates.length === 0) {
      section.innerHTML = `
        <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
        <div class="empty-state" style="padding:24px 0;">
          <div class="icon">📋</div>
          <h3>No Update Candidates</h3>
          <p>Nothing from this session warrants writing back to the master CV.</p>
        </div>`;
      return;
    }

    const typeIcons = {
      improved_bullet:    '✏️',
      new_skill:          '🛠',
      summary_variant:    '📝',
      skill_gap_confirmed:'✅',
    };

    let html = `
      <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
      <p style="color:#6b7280;margin-bottom:16px;">
        Select improvements from this session to write back to <code>Master_CV_Data.json</code>.
        No items are pre-selected — choose only what you want to keep.
      </p>
      <table class="review-table" style="margin-bottom:16px;">
        <thead>
          <tr>
            <th style="width:36px;text-align:center;">Include</th>
            <th>Type</th>
            <th>Change</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>`;

    for (const c of candidates) {
      const icon     = typeIcons[c.type] || '📌';
      const original = c.original && c.original !== '(not in master data)'
        ? `<div style="font-size:0.82em;color:#6b7280;margin-top:4px;margin-bottom:2px;
               text-decoration:line-through;">${escapeHtml(c.original)}</div>`
        : '';
      html += `
        <tr id="harvest-row-${escapeHtml(c.id)}">
          <td style="text-align:center;">
            <input type="checkbox" id="harvest-chk-${escapeHtml(c.id)}"
              data-harvest-id="${escapeHtml(c.id)}" style="width:16px;height:16px;cursor:pointer;">
          </td>
          <td>
            <span title="${escapeHtml(c.type)}">${icon}</span>
            <span style="font-size:0.85em;color:#475569;margin-left:4px;">${escapeHtml(c.type.replace(/_/g,' '))}</span>
          </td>
          <td>
            <div style="font-weight:500;">${escapeHtml(c.label)}</div>
            ${original}
            <div style="font-size:0.88em;color:#1e293b;margin-top:2px;">${escapeHtml(c.proposed)}</div>
          </td>
          <td style="font-size:0.85em;color:#64748b;">${escapeHtml(c.rationale)}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>
      <div style="display:flex;gap:12px;align-items:center;">
        <button onclick="applyHarvestSelections()"
          style="background:#0ea5e9;color:#fff;border:none;border-radius:6px;
                 padding:10px 24px;font-size:1em;font-weight:600;cursor:pointer;" id="harvest-apply-btn">
          📥 Apply Selected Updates
        </button>
        <button onclick="document.getElementById('harvest-section').style.display='none'"
          style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:6px;
                 padding:10px 20px;font-size:0.95em;cursor:pointer;">
          Skip
        </button>
      </div>
      <div id="harvest-result" style="margin-top:16px;"></div>`;

    section.innerHTML = html;
  } catch (err) {
    section.innerHTML = `
      <h2 style="margin-top:0;">📥 Update Master CV Data</h2>
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
        padding:12px 16px;color:#991b1b;">
        ❌ Network error: ${escapeHtml(err.message)}
      </div>`;
  }
}

// ── Apply harvest selections ──────────────────────────────────────────────────

async function applyHarvestSelections() {
  const checkboxes   = document.querySelectorAll('input[data-harvest-id]:checked');
  const selectedIds  = Array.from(checkboxes).map(cb => cb.dataset.harvestId);
  const resultDiv    = document.getElementById('harvest-result');
  const applyBtn     = document.getElementById('harvest-apply-btn');

  if (selectedIds.length === 0) {
    resultDiv.innerHTML = `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;
      padding:10px 16px;color:#92400e;">No items selected. Tick the checkboxes for changes you want to keep.</div>`;
    return;
  }

  applyBtn.disabled    = true;
  applyBtn.textContent = '⏳ Applying…';
  resultDiv.innerHTML  = '';

  try {
    const res  = await fetch('/api/harvest/apply', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ selected_ids: selectedIds }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      resultDiv.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
        padding:12px 16px;color:#991b1b;">
        ❌ ${escapeHtml(data.error || 'Apply failed')}
      </div>`;
      applyBtn.disabled    = false;
      applyBtn.textContent = '📥 Apply Selected Updates';
      return;
    }

    const count    = data.written_count ?? 0;
    const hash     = data.commit_hash
      ? `<code style="font-size:0.85em;">${escapeHtml(data.commit_hash)}</code>`
      : '(no commit)';
    const gitWarn  = data.git_error
      ? `<p style="color:#d97706;font-size:0.87em;margin-top:8px;">⚠ Git: ${escapeHtml(data.git_error)}</p>`
      : '';
    const diffRows = (data.diff_summary || []).map(d =>
      `<li>${d.applied ? '✅' : '⚠'} ${escapeHtml(d.label)}${d.applied ? '' : ' (no match found)'}</li>`
    ).join('');

    resultDiv.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;">
        <strong>✅ ${count} item${count !== 1 ? 's' : ''} written to master CV data.</strong>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:0.9em;line-height:1.8;">${diffRows}</ul>
        <p style="margin:8px 0 0;font-size:0.87em;color:#166534;">Git commit: ${hash}</p>
        ${gitWarn}
      </div>`;

    applyBtn.disabled    = false;
    applyBtn.textContent = '✅ Applied';
    applyBtn.style.background = '#059669';
  } catch (err) {
    resultDiv.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
      padding:12px 16px;color:#991b1b;">
      ❌ Network error: ${escapeHtml(err.message)}
    </div>`;
    applyBtn.disabled    = false;
    applyBtn.textContent = '📥 Apply Selected Updates';
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  populateFinaliseTab,
  finaliseApplication,
  showHarvestSection,
  applyHarvestSelections,
};
