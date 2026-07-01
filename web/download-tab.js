// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/download-tab.js
 * File Review tab: ATS validation, generated-file downloads, persuasion check,
 * and refinement shortcuts.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, backToPhase
 */

import { getLogger } from './logger.js';
const log = getLogger('download-tab');

import { stateManager } from './state-manager.js';

function _collectDownloadableFiles(cvData = {}) {
  const seen = new Set();
  const files = [];
  const rawFiles = Array.isArray(cvData.files) ? cvData.files : [];
  const candidateFiles = [
    ...rawFiles,
    cvData.final_html,
    cvData.final_pdf,
    cvData.html,
    cvData.pdf,
    cvData.docx,
    cvData.ats_docx,
  ].filter(Boolean);

  for (const filename of candidateFiles) {
    if (seen.has(filename)) continue;
    seen.add(filename);

    let icon = '📁';
    let description = 'Generated file';
    let format = 'other';

    if (filename.endsWith('.pdf')) {
      icon = filename.includes('ATS') ? '🤖' : '📄';
      description = filename.includes('ATS')
        ? 'ATS-optimised PDF — machine-readable for automated screening'
        : 'Human-readable PDF — for human reviewers and printing';
      format = 'pdf';
    } else if (filename.endsWith('.docx')) {
      icon = '📝';
      if (filename.startsWith('CoverLetter_')) {
        description = 'Cover letter — Word document for the application';
      } else if (filename.startsWith('Screening_')) {
        description = 'Screening question responses — Word document';
      } else {
        description = filename.includes('ATS')
          ? 'ATS-optimised Word document — keyword-optimised for job applications'
          : 'Human-readable Word document — editable format';
      }
      format = 'docx';
    } else if (filename.endsWith('.html')) {
      icon = '🌐';
      const isPreview = /preview/i.test(filename);
      description = isPreview
        ? 'Layout preview — intermediate working file, not for submission'
        : 'HTML format with embedded JSON-LD structured data';
      format = isPreview ? 'preview' : 'html';
    } else if (filename === 'job_description.txt') {
      icon = '📋';
      description = 'Original job description reference';
    }

    files.push({ filename, description, icon, format });
  }

  return files;
}

function _renderValidationSummary(checks, summary, pageCount, atsError) {
  let html = '';

  if (pageCount !== null) {
    const pageWarning = pageCount < 1.5 || pageCount > 3;
    html += `<div style="display:inline-flex;align-items:center;gap:8px;
              background:${pageWarning ? '#fef9c3' : '#f0fdf4'};
              border:1px solid ${pageWarning ? '#fde047' : '#bbf7d0'};
              border-radius:8px;padding:8px 14px;margin-bottom:16px;">
      <span style="font-size:1.3em;">📄</span>
      <strong>${pageCount} page${pageCount !== 1 ? 's' : ''}</strong>
      ${pageWarning
        ? '<span style="color:#d97706;font-size:0.88em;">⚠ Senior candidate target is 2–3 pages</span>'
        : '<span style="color:#166534;font-size:0.88em;">✓ Good length</span>'}
    </div>`;
  }

  if (atsError) {
    html += `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <strong>⚠ ATS validation error:</strong> ${escapeHtml(atsError)}
    </div>`;
    return html;
  }

  if (!checks.length) {
    return html;
  }

  const keywordFail = checks.some((check) => check.name === 'ats_keyword_presence' && check.status === 'fail');
  const statusColour = summary.fail > 0 ? '#dc2626' : summary.warn > 0 ? '#d97706' : '#166534';
  const statusIcon = summary.fail > 0 ? '❌' : summary.warn > 0 ? '⚠' : '✅';

  html += `
    <details open style="margin-bottom:20px;">
      <summary style="cursor:pointer;font-weight:700;font-size:1em;padding:8px 0;color:${statusColour};">
        ${statusIcon} ATS Report — ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail
      </summary>
      <table class="review-table" style="margin-top:10px;font-size:0.87em;">
        <thead><tr><th>Check</th><th>Format</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>`;

  for (const check of checks) {
    const background = check.status === 'pass' ? '#f0fdf4' : check.status === 'warn' ? '#fef9c3' : '#fee2e2';
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠' : '❌';
    const formatBadge = `<span style="font-size:11px;background:#e0e7ff;color:#3730a3;border-radius:6px;padding:1px 5px;">${escapeHtml(check.format)}</span>`;

    html += `<tr style="background:${background};">
      <td style="font-weight:600;">${escapeHtml(check.label)}</td>
      <td>${formatBadge}</td>
      <td style="text-align:center;">${icon}</td>
      <td><small>${escapeHtml(check.detail)}</small></td>
    </tr>`;
  }

  html += '</tbody></table></details>';

  if (summary.fail > 0) {
    html += `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px 16px;margin-bottom:20px;">
      <strong>❌ Fix required:</strong> Some checks failed. Blocked formats are greyed out below.
      ${keywordFail
        ? '<br><strong>ATS keyword failure blocks all downloads</strong> — re-run customisations to improve keyword coverage.'
        : ''}
    </div>`;
  }

  return html;
}

// Checks that are advisory only — they warn but never block the download button.
// Only genuinely critical failures (file not found, PDF unreadable, broken output)
// should prevent a user from downloading.
const _NON_BLOCKING_CHECKS = new Set([
  'cv_page_count',               // advisory: page length outside ideal range
  'pdf_us_letter',               // advisory: page size
  'docx_zero_shapes',            // advisory: ATS formatting hint
  'docx_standard_headings',      // advisory: ATS heading text
  'docx_heading1_present',       // advisory: ATS heading style
  'docx_date_format_consistent', // advisory: date format consistency
  'docx_publications_heading',   // advisory: publications heading text
  'html_jsonld_valid_person',    // advisory: JSON-LD schema type
  'html_jsonld_knows_about',     // advisory: JSON-LD skills population
]);

function _renderDownloadGrid(files, checks, summary, generatedAt = null, generationRun = null) {
  const keywordFail = checks.some((check) => check.name === 'ats_keyword_presence' && check.status === 'fail');
  const isCriticalFail = (check) => check.status === 'fail' && !_NON_BLOCKING_CHECKS.has(check.name);
  const blockDocx = keywordFail || checks.some((check) => check.format === 'docx' && isCriticalFail(check));
  const blockHtml = keywordFail || checks.some((check) => check.format === 'html' && isCriticalFail(check));
  const blockPdf  = keywordFail || checks.some((check) => check.format === 'pdf'  && isCriticalFail(check));

  let generatedLabel = '';
  if (generatedAt) {
    try {
      const d = new Date(generatedAt);
      const dateStr = d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
      generatedLabel = (generationRun && generationRun > 1)
        ? `Run #${generationRun} — ${dateStr}`
        : dateStr;
    } catch (_) { /* ignore */ }
  }

  let html = '<div class="download-section"><div class="download-grid">';
  if (!files.length) {
    html += '<p>No downloadable files found. Please try generating your CV again.</p>';
    html += '</div></div>';
    return html;
  }

  for (const file of files) {
    const blocked = (file.format === 'docx' && blockDocx)
      || (file.format === 'html' && blockHtml)
      || (file.format === 'pdf' && blockPdf);
    const blockedStyle = blocked
      ? 'cursor:not-allowed;opacity:0.4;background:#9ca3af;border-color:#9ca3af;'
      : '';
    const blockedMessage = blocked
      ? '<div style="font-size:0.78em;color:#dc2626;margin-top:4px;">⛔ Blocked — output file could not be generated</div>'
      : '';
    const timestampLine = generatedLabel
      ? `<div style="font-size:0.75em;color:#9ca3af;margin-top:3px;">Generated ${generatedLabel}</div>`
      : '<div style="font-size:0.75em;color:#c0c4cc;margin-top:3px;">Not yet generated</div>';

    const previewBadge = file.format === 'preview'
      ? '<span style="display:inline-block;margin-left:6px;font-size:0.75em;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:1px 5px;vertical-align:middle;">Working file — not for submission</span>'
      : '';

    html += `
      <div class="download-item" style="${blocked ? 'opacity:0.75;' : ''}${file.format === 'preview' ? 'border-style:dashed;' : ''}">
        <div class="download-icon">${file.icon}</div>
        <div class="download-info">
          <div class="download-name">${escapeHtml(file.filename)}${previewBadge}</div>
          <div class="download-description">${escapeHtml(file.description)}</div>
          ${timestampLine}
          ${blockedMessage}
        </div>
        ${blocked
          ? `<button class="btn-download" disabled style="${blockedStyle}">Blocked</button>`
          : (() => {
              const _sid = typeof getSessionIdFromURL === 'function' ? getSessionIdFromURL() : null;
              const _sp  = _sid ? `?session_id=${encodeURIComponent(_sid)}` : '';
              return `<a href="/api/download/${encodeURIComponent(file.filename)}${_sp}"
                class="btn-download download-link" download="${escapeHtml(file.filename)}"
                style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">Download</a>`;
            })()}
      </div>`;
  }

  html += '</div></div>';
  if (summary.fail > 0 && files.length) {
    html += '<p style="margin-top:12px;color:#6b7280;font-size:0.88em;">Blocked formats reflect ATS validation failures for the corresponding output types.</p>';
  }
  return html;
}

function _renderRefinementPanel() {
  return `<div style="margin-top:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;
            border-radius:8px;">
    <div style="font-weight:600;margin-bottom:10px;color:#374151;">↻ Iterative Refinement</div>
    <div style="font-size:0.9em;color:#6b7280;margin-bottom:12px;">
      Go back to refine an earlier step — all prior decisions and approvals are preserved.
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn-secondary" onclick="backToPhase('customizations')" title="Return to Customisations step">
        ↻ Refine Customisations
      </button>
      <button class="btn-secondary" onclick="backToPhase('rewrite')" title="Return to Rewrite Review step">
        ↻ Refine Rewrites
      </button>
      <button class="btn-secondary" onclick="backToPhase('analysis')" title="Return to Analysis step">
        ↻ Re-analyse Job
      </button>
    </div>
  </div>`;
}

async function _fetchPersuasionHtml() {
  try {
    const response = await fetch('/api/persuasion-check');
    const data = await response.json();
    if (!response.ok || !data.ok) {
      return '';
    }

    const summary = data.summary || { flagged: 0, strong_count: 0, total_bullets: 0 };
    const findings = Array.isArray(data.findings) ? data.findings : [];
    const scoreColor = summary.flagged === 0 ? '#10b981' : summary.flagged <= 3 ? '#f59e0b' : '#ef4444';
    const scoreLabel = summary.flagged === 0
      ? 'Excellent'
      : summary.flagged <= 3
        ? 'Good — minor improvements possible'
        : 'Needs attention';

    let html = `<div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="padding:14px 16px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;cursor:pointer;"
           onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <div>
          <span style="font-weight:600;color:#1f2937;">💪 Bullet Persuasiveness</span>
          <span style="margin-left:12px;background:${scoreColor};color:#fff;border-radius:4px;padding:2px 8px;font-size:0.8em;">${scoreLabel}</span>
        </div>
        <div style="font-size:0.85em;color:#6b7280;">
          ${summary.strong_count}/${summary.total_bullets} strong · ${summary.flagged} flagged · click to ${summary.flagged > 0 ? 'expand' : 'collapse'}
        </div>
      </div>`;

    if (findings.length > 0) {
      html += `<div style="padding:12px 16px;display:${summary.flagged <= 3 ? 'block' : 'none'};">`;
      for (const finding of findings) {
        const severity = finding.severity === 'warning'
          ? { background: '#fff7ed', border: '#f59e0b', label: '⚠ Warning' }
          : { background: '#f0f9ff', border: '#3b82f6', label: 'ℹ Info' };
        const truncatedText = finding.text && finding.text.length > 120
          ? `${finding.text.slice(0, 120)}…`
          : finding.text || '';
        html += `<div style="margin-bottom:12px;padding:10px 12px;background:${severity.background};border-left:3px solid ${severity.border};border-radius:0 6px 6px 0;">
          <div style="font-size:0.8em;color:#6b7280;margin-bottom:4px;">
            <span style="background:${severity.border};color:#fff;border-radius:3px;padding:1px 6px;font-size:0.9em;">${severity.label}</span>
            Bullet ${(finding.bullet_index ?? 0) + 1}${finding.exp_id ? ` · ${escapeHtml(finding.exp_id)}` : ''}
          </div>
          <div style="font-size:0.9em;color:#374151;margin-bottom:6px;">"${escapeHtml(truncatedText)}"</div>
          <ul style="margin:0;padding-left:18px;">`;
        for (const issue of finding.issues || []) {
          html += `<li style="font-size:0.85em;color:#6b7280;margin-bottom:2px;">${escapeHtml(issue.suggestion)}</li>`;
        }
        html += '</ul></div>';
      }
      html += '</div>';
    } else {
      html += '<div style="padding:12px 16px;color:#10b981;font-size:0.9em;">All bullets meet persuasiveness criteria.</div>';
    }

    html += '</div>';
    return html;
  } catch (error) {
    log.warn('Persuasion check failed:', error);
    return '';
  }
}

async function populateDownloadTab(cvData) {
  stateManager.setTabData('cv', cvData);

  const content = document.getElementById('document-content');
  if (!content) return;

  if (!cvData || (typeof cvData === 'object' && Object.keys(cvData).length === 0)) {
    content.innerHTML = '<h1>⬇️ Download Generated Files</h1><div class="empty-state"><div class="icon">⬇️</div><h3>No Files Available</h3><p>Generate a CV first to see download options.</p></div>';
    return;
  }

  content.innerHTML = '<h1>⬇️ Download Generated Files</h1><p style="color:#6b7280;margin-bottom:16px;">Running ATS validation…</p>';

  let checks = [];
  let pageCount = null;
  let summary = { pass: 0, warn: 0, fail: 0 };
  let atsError = null;
  try {
    const response = await fetch('/api/ats-validate');
    const data = await response.json();
    if (data.ok) {
      checks = data.checks || [];
      pageCount = data.page_count ?? null;
      summary = data.summary || summary;
    } else {
      atsError = data.error || 'Validation failed';
    }
  } catch (error) {
    atsError = `Network error: ${error.message}`;
  }

  const files = _collectDownloadableFiles(cvData);
  let html = '<h1>⬇️ File Review</h1>';
  html += '<p style="font-size:0.83em;color:#94a3b8;margin-bottom:16px;padding:8px 12px;background:#f8fafc;border-radius:6px;border-left:3px solid #e2e8f0;">✅ <em>This is the <strong>completeness check</strong> step — ATS validation runs here and you can archive the application. To download files immediately after generation, use the <strong>Generated Files</strong> tab.</em></p>';
  html += _renderValidationSummary(checks, summary, pageCount, atsError);

  const summaryWarnings = (cvData.metadata?.summary_warnings || []);
  if (summaryWarnings.length) {
    html += `<div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <strong>⚠ Professional Summary quality notices (${summaryWarnings.length}):</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;">
        ${summaryWarnings.map(w => `<li style="font-size:0.9em;">${escapeHtml(w)}</li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:0.87em;color:#78350f;">These are advisory warnings — review the Summary tab if you wish to update the summary before submitting.</p>
    </div>`;
  }

  const longBulletWarnings = (cvData.metadata?.long_bullet_warnings || []);
  if (longBulletWarnings.length) {
    html += `<div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <strong>⚠ Long bullet points detected (${longBulletWarnings.length}) — may exceed 2 lines:</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;list-style:none;">
        ${longBulletWarnings.map(w => `<li style="font-size:0.85em;margin-bottom:4px;"><strong>${escapeHtml(w.company)} · ${escapeHtml(w.title)}</strong> (${w.char_count} chars)<br><span style="color:#6b7280;">"${escapeHtml(w.bullet_text)}"</span></li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:0.87em;color:#78350f;">Consider shortening these bullets — aim for ≤200 characters each for clean 2-line rendering in the DOCX.</p>
    </div>`;
  }

  const sparseExpWarnings = (cvData.metadata?.sparse_experience_warnings || []);
  if (sparseExpWarnings.length) {
    html += `<div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <strong>⚠ Sparse experience entries (${sparseExpWarnings.length}) — fewer than 2 bullets:</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;list-style:none;">
        ${sparseExpWarnings.map(w => `<li style="font-size:0.85em;margin-bottom:2px;"><strong>${escapeHtml(w.company)} · ${escapeHtml(w.title)}</strong> — ${w.bullet_count === 0 ? 'no bullets selected' : '1 bullet selected'}</li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:0.87em;color:#78350f;">Include at least 2 bullets per role to demonstrate impact. Return to the Experience tab to add more.</p>
    </div>`;
  }

  const yearOnlyDateWarnings = (cvData.metadata?.year_only_date_warnings || []);
  if (yearOnlyDateWarnings.length) {
    html += `<div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <strong>⚠ Year-only dates detected (${yearOnlyDateWarnings.length}) — month/year format recommended:</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;list-style:none;">
        ${yearOnlyDateWarnings.map(w => `<li style="font-size:0.85em;margin-bottom:2px;"><strong>${escapeHtml(w.company)} · ${escapeHtml(w.title)}</strong> — ${w.field === 'start_date' ? 'start' : 'end'} date is "${escapeHtml(w.date_value)}"</li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:0.87em;color:#78350f;">Year-only dates reduce chronological precision. Update to Month YYYY format (e.g. "Jan 2020") in the Master CV for best ATS compatibility.</p>
    </div>`;
  }

  const rewriteAuditMismatches = (cvData.metadata?.rewrite_audit_mismatches || []);
  if (rewriteAuditMismatches.length) {
    html += `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <strong>⚠ Rewrite content mismatch (${rewriteAuditMismatches.length}) — accepted rewrites not found in generated text:</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;list-style:none;">
        ${rewriteAuditMismatches.map(m => `<li style="font-size:0.85em;margin-bottom:6px;"><strong>${escapeHtml(m.location || m.type)}</strong><br><span style="color:#374151;">Expected: <em>"${escapeHtml((m.expected || '').slice(0, 120))}${(m.expected || '').length > 120 ? '…' : ''}"</em></span><br><span style="color:#9ca3af;">Actual: <em>"${escapeHtml((m.actual || '').slice(0, 120))}${(m.actual || '').length > 120 ? '…' : ''}"</em></span></li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:0.87em;color:#7f1d1d;">These accepted rewrites may not have been applied. Re-generate the CV or check the rewrite review step.</p>
    </div>`;
  }

  const overlapWarnings = (cvData.date_overlap_warnings || []);
  if (overlapWarnings.length) {
    html += `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <strong>⚠ Employment date overlaps detected (${overlapWarnings.length}):</strong>
      <ul style="margin:8px 0 0 0;padding-left:18px;">
        ${overlapWarnings.map(w => `<li><strong>${escapeHtml(w.entry_a)}</strong> overlaps with <strong>${escapeHtml(w.entry_b)}</strong><br><small style="color:#92400e;">${escapeHtml(w.overlap_description)}</small></li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:0.87em;color:#78350f;">Review these entries in the Experience tab before submitting your application.</p>
    </div>`;
  }

  const generatedAt = cvData.metadata?.generation_date ?? null;
  const generationRun = cvData.metadata?.generation_run ?? null;
  html += _renderDownloadGrid(files, checks, summary, generatedAt, generationRun);

  if (cvData.output_dir) {
    html += `<div style="margin-top:20px;padding:12px;background:#f1f5f9;border-radius:6px;font-size:14px;color:#64748b;">
      <strong>Output Directory:</strong> ${escapeHtml(cvData.output_dir)}
    </div>`;
  }

  content.innerHTML = `${html}<p style="color:#6b7280;margin-top:16px;font-size:0.9em;">Analysing bullet persuasiveness…</p>`;
  html += await _fetchPersuasionHtml();
  html += _renderRefinementPanel();
  html += `<div class="nav-buttons nav-end" style="margin-top:16px;">
    <button class="continue-btn" onclick="handleStepClick('cover_letter')">
      📩 Proceed to Cover Letter →
    </button>
  </div>`;
  content.innerHTML = html;
}

export { populateDownloadTab };