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

function _formatDuration(secs) {
  if (secs == null || secs < 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

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

    <div id="readiness-checklist"></div>
    <div id="consistency-report"></div>
    <div id="rewrite-audit-log"></div>

    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;">📋 Application Status</h3>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;" for="finalise-status">Status</label>
        <select id="finalise-status" style="width:220px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95em;">
          <option value="draft">Draft — not yet sent</option>
          <option value="ready" selected>Ready to send</option>
          <option value="sent">Sent</option>
          <option value="interview">Interview scheduled</option>
          <option value="rejected">Rejected</option>
          <option value="accepted">Accepted</option>
        </select>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;" for="finalise-notes">Notes</label>
        <textarea id="finalise-notes" rows="4" maxlength="2000"
          oninput="document.getElementById('finalise-notes-counter').textContent=this.value.length+' / 2000';document.getElementById('finalise-notes-counter').style.color=this.value.length>1800?'#dc2626':this.value.length>1600?'#d97706':'#6b7280'"
          style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;
                 font-size:0.92em;resize:vertical;box-sizing:border-box;"
          placeholder="Recruiter name, salary info, follow-up date, interview notes…"></textarea>
        <div id="finalise-notes-counter" aria-live="polite" style="text-align:right;font-size:0.8em;color:#6b7280;margin-top:2px;">0 / 2000</div>
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
  _renderReadinessChecklist(files, statusData);
  if (statusData) _renderConsistencyReport(statusData);
  _renderRewriteAuditLog();
  _restoreFinaliseMeta();
}

async function _restoreFinaliseMeta() {
  try {
    const res = await fetch('/api/finalise-meta');
    if (!res.ok) return;
    const data = await res.json();
    const statusEl = document.getElementById('finalise-status');
    const notesEl  = document.getElementById('finalise-notes');
    if (statusEl && data.application_status) statusEl.value = data.application_status;
    if (notesEl  && data.notes) {
      notesEl.value = data.notes;
      const counter = document.getElementById('finalise-notes-counter');
      if (counter) {
        const len = data.notes.length;
        counter.textContent = `${len} / 2000`;
        counter.style.color = len > 1800 ? '#dc2626' : len > 1600 ? '#d97706' : '#6b7280';
      }
    }
  } catch (_) {}
}

// ── Submission readiness checklist ────────────────────────────────────────────

function _renderReadinessChecklist(files, statusData) {
  const el = document.getElementById('readiness-checklist');
  if (!el) return;

  const fileSet = new Set((files || []).map(f => (f || '').toLowerCase()));
  const hasPdf  = [...fileSet].some(f => f.endsWith('.pdf') && !f.includes('coverletter') && !f.includes('cover_letter'));
  const hasDocx = [...fileSet].some(f => f.endsWith('.docx') && !f.includes('coverletter') && !f.includes('cover_letter') && !f.includes('screening'));
  const hasHtml = [...fileSet].some(f => f.endsWith('.html'));
  const hasCl   = [...fileSet].some(f => f.includes('coverletter') || f.includes('cover_letter'));
  const hasScr  = [...fileSet].some(f => f.includes('screening'));

  const atsChecks  = statusData?.ats_checks || [];
  const atsFails   = (atsChecks).filter(c => c.status === 'fail' || c.status === 'error').length;
  const atsScanned = atsChecks.length > 0;

  const layoutFresh = statusData?.layout_freshness !== 'stale';

  const items = [
    { ok: hasPdf,   label: 'CV PDF generated',        warn: false },
    { ok: hasDocx,  label: 'CV DOCX generated',       warn: false },
    { ok: hasHtml,  label: 'CV HTML generated',       warn: false },
    { ok: hasCl,    label: 'Cover letter generated',  warn: true  },
    { ok: hasScr,   label: 'Screening Q&A generated', warn: true  },
    { ok: atsScanned && atsFails === 0, warn: true,
      label: atsScanned
        ? (atsFails > 0 ? `ATS validation — ${atsFails} issue${atsFails !== 1 ? 's' : ''} found` : 'ATS validation passed')
        : 'ATS validation not yet run' },
    { ok: layoutFresh, warn: true, label: 'Layout is current (not stale)' },
  ];

  const rows = items.map(({ ok, label, warn }) => {
    const icon  = ok ? '✅' : (warn ? '⚠' : '❌');
    const color = ok ? '#065f46' : (warn ? '#92400e' : '#991b1b');
    const bg    = ok ? '#f0fdf4' : (warn ? '#fffbeb' : '#fef2f2');
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:${bg};border-radius:6px;margin-bottom:6px;">
      <span aria-hidden="true" style="font-size:1.1em;">${icon}</span>
      <span style="color:${color};font-size:0.92em;">${escapeHtml(label)}</span>
    </div>`;
  }).join('');

  const allRequired = hasPdf && hasDocx && hasHtml;
  const headerColor = allRequired ? '#065f46' : '#92400e';
  el.innerHTML = `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px;color:${headerColor};">📋 Submission Readiness</h3>
      ${rows}
      <p style="margin:10px 0 0;font-size:0.82em;color:#64748b;">
        ⚠ items are optional — they warn but do not block archiving.
        ❌ items must be resolved before submitting.
      </p>
    </div>`;
}

// ── Rewrite audit log ─────────────────────────────────────────────────────────

async function _renderRewriteAuditLog() {
  const el = document.getElementById('rewrite-audit-log');
  if (!el) return;
  try {
    const res  = await fetch('/api/rewrites');
    if (!res.ok) return;
    const data = await res.json();
    const audit = data.rewrite_audit || [];
    if (audit.length === 0) return;
    const rows = audit.map(entry => {
      const outcome = entry.outcome || entry.decision || '—';
      const icon = outcome === 'accepted' ? '✅' : outcome === 'edited' ? '✏️' : outcome === 'rejected' ? '❌' : '—';
      const original  = escapeHtml((entry.original_text || entry.original || '').slice(0, 120));
      const final     = escapeHtml((entry.final_text || entry.rewritten || entry.suggested || '').slice(0, 120));
      const field     = escapeHtml(entry.field || entry.type || '—');
      return `<tr>
        <td style="padding:6px 8px;font-size:0.8em;color:#6b7280;">${field}</td>
        <td style="padding:6px 8px;font-size:0.8em;color:#374151;">${original}${original.length === 120 ? '…' : ''}</td>
        <td style="padding:6px 8px;font-size:0.8em;color:#374151;">${final}${final.length === 120 ? '…' : ''}</td>
        <td style="padding:6px 8px;font-size:0.8em;text-align:center;">${icon} ${escapeHtml(outcome)}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <details style="margin-bottom:24px;">
        <summary style="cursor:pointer;font-weight:600;font-size:0.95em;padding:10px 0;color:#374151;user-select:none;">
          📋 Rewrite audit log (${audit.length} decision${audit.length !== 1 ? 's' : ''})
        </summary>
        <div style="overflow-x:auto;margin-top:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85em;">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                <th style="padding:8px;text-align:left;color:#374151;font-weight:600;">Field</th>
                <th style="padding:8px;text-align:left;color:#374151;font-weight:600;">Original</th>
                <th style="padding:8px;text-align:left;color:#374151;font-weight:600;">Final</th>
                <th style="padding:8px;text-align:center;color:#374151;font-weight:600;">Outcome</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
  } catch { /* non-fatal */ }
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
    const durationSecs  = summary.session_duration_secs;
    const durationStr   = durationSecs != null ? _formatDuration(durationSecs) : null;

    result.style.display = 'block';
    result.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <strong>✅ Application archived!</strong>
        <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;font-size:0.92em;">
          <li>Status: <strong>${escapeHtml(status)}</strong></li>
          <li>Approved rewrites: ${approvedCount}</li>
          ${_renderFinaliseAtsItems(atsScore, atsKeywords)}
          ${durationStr ? `<li>Session duration: ${escapeHtml(durationStr)}</li>` : ''}
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

// applyHarvestSelections() (bound via the button's onclick above) lives in
// web/harvest.js, not here — this file used to carry its own divergent
// duplicate (different confirm/message copy, no confirm-modal step), but
// since both files render a button with the same onclick and window resolves
// bare identifiers at click time, harvest.js's version was always the one
// actually invoked in production regardless; this copy was unreachable dead
// code. Removed; see web/harvest.js.

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  populateFinaliseTab,
  finaliseApplication,
  showHarvestSection,
  _renderReadinessChecklist,
};
