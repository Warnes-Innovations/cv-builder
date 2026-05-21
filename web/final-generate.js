// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/final-generate.js
 * "Generate" step (step 8 of 9): shows download links for the final generated
 * files (PDF, ATS DOCX, human DOCX) and a "Proceed to Finalise →" button that
 * advances the workflow to the refinement (Finalise) step.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   apiCall, appendMessage, escapeHtml, stateManager, switchTab
 */

import { getLogger } from './logger.js';
const log = getLogger('final-generate');

import { stateManager } from './state-manager.js';

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

  let html = '<h1>📄 Generated Files</h1>';
  html += '<p style="color:#475569;margin-bottom:20px;">Your final CV files have been generated. Download them below, then proceed to the Finalise step.</p>';

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
        ✅ Proceed to Finalise →
      </button>
    </div>`;

  content.innerHTML = html;
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
      throw new Error(res?.error || 'Failed to advance to Finalise step.');
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
