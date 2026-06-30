// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/final-generate.js
 * Final generation step: shows download links for the generated files
 * (PDF, ATS DOCX, human DOCX) and a "Proceed to Download Review →" button
 * that advances the workflow to the download step.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   apiCall, appendMessage, escapeHtml, stateManager, switchTab
 */

import { getLogger } from './logger.js';
const log = getLogger('final-generate');

import { stateManager } from './state-manager.js';

// ── Preview state ─────────────────────────────────────────────────────────────

let _previewOpen = true;

// ── File type helpers ─────────────────────────────────────────────────────────

function _fileLabel(filename) {
  if (!filename) return '';
  const base = filename.split('/').pop();
  if (base.endsWith('.pdf') && base.toLowerCase().includes('ats'))
    return 'ATS PDF';
  if (base.endsWith('.pdf'))
    return 'Human PDF';
  if (base.endsWith('.docx') && base.toLowerCase().includes('ats'))
    return 'ATS Word';
  if (base.endsWith('.docx'))
    return 'Human Word';
  if (base.endsWith('.html'))
    return 'HTML';
  return base;
}

function _fileIcon(filename) {
  if (!filename) return '📁';
  const f = filename.toLowerCase();
  if (f.endsWith('.pdf'))  return f.includes('ats') ? '🤖' : '📄';
  if (f.endsWith('.docx')) return '📝';
  if (f.endsWith('.html')) return '🌐';
  return '📁';
}

function _fileDescription(filename) {
  if (!filename) return '';
  const f = filename.toLowerCase();
  if (f.endsWith('.pdf') && f.includes('ats'))
    return 'ATS-optimised PDF — machine-readable for automated screening';
  if (f.endsWith('.pdf'))
    return 'Human-readable PDF — for human reviewers and printing';
  if (f.endsWith('.docx') && f.includes('ats'))
    return 'ATS Word document — keyword-optimised for job applications';
  if (f.endsWith('.docx'))
    return 'Human-readable Word document — editable format';
  if (f.endsWith('.html'))
    return 'HTML format with embedded JSON-LD structured data';
  return 'Generated file';
}

function _htmlPreviewFile(files) {
  // Prefer human-readable HTML (CV_*.html, not ATS)
  const human = files.find(f => f.endsWith('.html') && !f.toLowerCase().includes('ats'));
  return human || files.find(f => f.endsWith('.html')) || null;
}

function _renderPreviewPane(htmlFile) {
  if (!htmlFile) return '';
  const base = htmlFile.split('/').pop();
  const src = `/api/download/${encodeURIComponent(base)}`;
  return `
    <div id="final-preview-pane" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;${_previewOpen ? '' : 'display:none;'}">
      <div style="padding:10px 16px;background:#f1f5f9;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:0.9em;font-weight:600;color:#1e293b;">🌐 HTML Preview</span>
        <span style="font-size:0.8em;color:#64748b;flex:1;">${escapeHtml(base)}</span>
        <button type="button" id="final-preview-close-btn"
                style="font-size:0.8em;padding:3px 10px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;cursor:pointer;color:#475569;"
                aria-label="Hide preview">Hide</button>
      </div>
      <div style="position:relative;width:100%;padding-top:56.25%;background:#f8fafc;">
        <iframe id="final-cv-preview"
                src="${src}"
                title="Final CV HTML Preview"
                sandbox="allow-same-origin"
                referrerpolicy="no-referrer"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
                aria-label="Final generated CV preview"></iframe>
      </div>
    </div>`;
}

// ── Tab renderer ─────────────────────────────────────────────────────────────

/**
 * Populate the "Generate" (final_generate) tab content.
 * Shows download links for all final-generated files and a "Proceed to Finalise" button.
 * @param {Object} cvData - CV data object from stateManager.getTabData('cv')
 */
async function populateFinalGenerateTab(cvData = {}) {
  const content = document.getElementById('document-content');
  if (!content) return;

  // Collect candidate files, deduplicate
  const seen = new Set();
  const candidates = [
    cvData.final_html,
    cvData.final_pdf,
    cvData.html,
    cvData.pdf,
    cvData.docx,
    cvData.ats_docx,
    cvData.human_docx,
    ...(Array.isArray(cvData.files) ? cvData.files : []),
  ].filter(Boolean);

  const files = [];
  for (const filename of candidates) {
    if (seen.has(filename)) continue;
    seen.add(filename);
    if (filename.endsWith('.txt') || filename === 'job_description.txt') continue;
    files.push(filename);
  }

  const htmlPreviewFile = _htmlPreviewFile(files);

  let html = '<h1>📄 Generated Files</h1>';
  html += '<p style="color:#475569;margin-bottom:20px;">Your final CV files have been generated. Download them below, then proceed to the Finalise step.</p>';

  if (htmlPreviewFile) {
    const showHide = _previewOpen ? 'Hide preview' : 'Show preview';
    html += `<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px;">
      <button type="button" id="final-preview-toggle-btn"
              style="font-size:0.85em;padding:5px 14px;border:1px solid #3b82f6;border-radius:6px;background:${_previewOpen ? '#eff6ff' : '#fff'};color:#3b82f6;cursor:pointer;font-weight:600;"
              aria-expanded="${_previewOpen}"
              aria-controls="final-preview-pane">
        🌐 ${showHide}
      </button>
      <span style="font-size:0.8em;color:#94a3b8;">In-browser HTML preview</span>
    </div>`;
    html += _renderPreviewPane(htmlPreviewFile);
  }

  if (files.length === 0) {
    html += '<p style="color:#9ca3af;padding:16px;">No files generated yet.</p>';
  } else {
    html += '<div style="display:grid;gap:12px;margin-bottom:28px;">';
    for (const filename of files) {
      const base   = filename.split('/').pop();
      const icon   = _fileIcon(filename);
      const label  = _fileLabel(filename);
      const desc   = _fileDescription(filename);
      html += `
        <div style="display:flex;align-items:center;gap:14px;
                    background:#f8fafc;border:1px solid #e2e8f0;
                    border-radius:8px;padding:14px 18px;">
          <span style="font-size:1.8em;">${icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.95em;color:#1e293b;">${escapeHtml(label)}</div>
            <div style="font-size:0.83em;color:#64748b;margin-top:2px;">${escapeHtml(desc)}</div>
          </div>
          <a href="/api/download/${encodeURIComponent(base)}"
             download="${escapeHtml(base)}"
             style="display:inline-flex;align-items:center;gap:6px;
                    background:#3b82f6;color:#fff;
                    padding:7px 16px;border-radius:6px;
                    font-size:0.88em;font-weight:600;text-decoration:none;
                    white-space:nowrap;">
            ⬇️ Download
          </a>
        </div>`;
    }
    html += '</div>';
  }

  if (cvData.output_dir) {
    html += `<div style="margin-bottom:24px;padding:10px 14px;
                          background:#f1f5f9;border-radius:6px;
                          font-size:13px;color:#64748b;">
      <strong>Output directory:</strong> ${escapeHtml(cvData.output_dir)}
    </div>`;
  }

  html += `
    <div class="nav-buttons nav-end" style="margin-top:24px;">
      <button class="continue-btn" id="final-generate-continue-btn"
              onclick="finalGenerationComplete()"
              style="font-size:1em;padding:10px 24px;">
        ✅ Proceed to Download Review →
      </button>
    </div>`;

  content.innerHTML = html;

  // Wire up preview toggle
  if (htmlPreviewFile) {
    const toggleBtn  = content.querySelector('#final-preview-toggle-btn');
    const closeBtn   = content.querySelector('#final-preview-close-btn');
    const previewPane = content.querySelector('#final-preview-pane');

    const setPreviewOpen = (open) => {
      _previewOpen = open;
      if (previewPane) previewPane.style.display = open ? '' : 'none';
      if (toggleBtn) {
        toggleBtn.textContent = open ? '🌐 Hide preview' : '🌐 Show preview';
        toggleBtn.setAttribute('aria-expanded', String(open));
        toggleBtn.style.background = open ? '#eff6ff' : '#fff';
      }
    };

    toggleBtn?.addEventListener('click', () => setPreviewOpen(!_previewOpen));
    closeBtn?.addEventListener('click',  () => setPreviewOpen(false));
  }
}

// ── Phase transition ──────────────────────────────────────────────────────────

/**
 * Advance workflow from final_generation → refinement.
 * Calls POST /api/final-generation-complete, updates frontend phase, and
 * switches to the download tab.
 */
async function finalGenerationComplete() {
  try {
    const res = await apiCall('POST', '/api/final-generation-complete', {});
    if (!res?.ok) {
      throw new Error(res?.error || 'Failed to advance to File Review step.');
    }
    stateManager.setPhase('refinement');
    switchTab('download');
    appendMessage('assistant', '✅ Files generated. You can now finalise your application.');
  } catch (err) {
    log.error('finalGenerationComplete error:', err);
    appendMessage('system', `❌ ${err.message}`);
  }
}

export { populateFinalGenerateTab, finalGenerationComplete };
