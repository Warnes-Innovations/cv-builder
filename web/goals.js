// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/goals.js — Generation Goals configuration tab.
 *
 * Allows the user to set document-length and character-count constraints that
 * are injected into every LLM prompt and used to control the final PDF length.
 *
 * Fields:
 *   max_pdf_pages  — target page count for the human-readable PDF
 *   max_ats_pages  — target page count for the ATS plain-text output
 *   max_ats_chars  — maximum characters (including spaces) for ATS text
 *
 * DEPENDENCIES (available on globalThis via main.js):
 *   apiCall (api-client.js)
 */

import { getLogger } from './logger.js';

const log = getLogger('goals');

const GOALS_DEFAULTS = {
  max_pdf_pages: 2,
  max_ats_pages: 1,
  max_ats_chars: 5000,
};

/**
 * Render the Generation Goals tab and pre-populate with any saved values.
 * Called by loadTabContent('goals') in review-table-base.js.
 */
export async function populateGoalsTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <div class="goals-panel" style="max-width:640px;margin:0 auto;padding:28px 24px">
      <h2 style="margin-top:0;margin-bottom:8px">🎯 Generation Goals</h2>
      <p style="color:var(--text-secondary,#555);margin-bottom:28px;line-height:1.5">
        Set length and character-count constraints for the generated CV.
        These values guide the AI during every editing and review stage,
        and control the final document length.
      </p>

      <div class="goals-field" style="margin-bottom:22px">
        <label for="goals-max-pdf-pages"
               style="display:block;font-weight:600;margin-bottom:4px">
          Maximum PDF page length
        </label>
        <p style="font-size:0.875rem;color:var(--text-secondary,#555);margin:0 0 8px">
          Target number of pages for the human-readable PDF output (e.g. 1–3).
        </p>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="goals-max-pdf-pages"
                 min="1" max="10" step="1"
                 value="${GOALS_DEFAULTS.max_pdf_pages}"
                 style="width:90px;padding:6px 10px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:1rem">
          <span style="color:var(--text-secondary,#555)">pages</span>
        </div>
      </div>

      <div class="goals-field" style="margin-bottom:22px">
        <label for="goals-max-ats-pages"
               style="display:block;font-weight:600;margin-bottom:4px">
          Maximum ATS plain-text page length
        </label>
        <p style="font-size:0.875rem;color:var(--text-secondary,#555);margin:0 0 8px">
          Target number of pages for the ATS-optimised plain-text output (typically 1–2).
        </p>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="goals-max-ats-pages"
                 min="1" max="5" step="1"
                 value="${GOALS_DEFAULTS.max_ats_pages}"
                 style="width:90px;padding:6px 10px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:1rem">
          <span style="color:var(--text-secondary,#555)">pages</span>
        </div>
      </div>

      <div class="goals-field" style="margin-bottom:32px">
        <label for="goals-max-ats-chars"
               style="display:block;font-weight:600;margin-bottom:4px">
          Maximum ATS character count (including spaces)
        </label>
        <p style="font-size:0.875rem;color:var(--text-secondary,#555);margin:0 0 8px">
          Maximum number of characters in the ATS plain-text output (e.g. 3 000–7 000).
        </p>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="goals-max-ats-chars"
                 min="500" max="20000" step="100"
                 value="${GOALS_DEFAULTS.max_ats_chars}"
                 style="width:110px;padding:6px 10px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:1rem">
          <span style="color:var(--text-secondary,#555)">characters</span>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:14px">
        <button id="save-goals-btn"
                onclick="saveGenerationGoals()"
                class="btn-primary"
                style="padding:8px 22px;font-size:0.95rem">
          Save Goals
        </button>
        <span id="goals-status"
              style="font-size:0.875rem;transition:color 0.2s"></span>
      </div>
    </div>
  `;

  // Restore saved goals from the backend session state.
  await _loadGoalsFromStatus();
}

/**
 * Fetch current generation goals from the session and populate the form inputs.
 * @private
 */
async function _loadGoalsFromStatus() {
  try {
    const data = await apiCall('GET', '/api/status');
    const goals = data?.generation_goals;
    if (!goals) return;

    const pdfInput  = document.getElementById('goals-max-pdf-pages');
    const atsInput  = document.getElementById('goals-max-ats-pages');
    const charInput = document.getElementById('goals-max-ats-chars');

    if (pdfInput  && goals.max_pdf_pages != null) pdfInput.value  = goals.max_pdf_pages;
    if (atsInput  && goals.max_ats_pages != null) atsInput.value  = goals.max_ats_pages;
    if (charInput && goals.max_ats_chars != null) charInput.value = goals.max_ats_chars;
  } catch (err) {
    log.warn('Failed to load generation goals from backend:', err);
  }
}

/**
 * Read the form inputs, validate, and POST to /api/generation-goals.
 * Exposed on globalThis so the inline onclick="saveGenerationGoals()" works.
 */
export async function saveGenerationGoals() {
  const statusEl  = document.getElementById('goals-status');
  const pdfInput  = document.getElementById('goals-max-pdf-pages');
  const atsInput  = document.getElementById('goals-max-ats-pages');
  const charInput = document.getElementById('goals-max-ats-chars');

  const pdfVal  = parseInt(pdfInput?.value,  10);
  const atsVal  = parseInt(atsInput?.value,  10);
  const charVal = parseInt(charInput?.value, 10);

  // Basic validation
  if (!pdfVal  || pdfVal  < 1 || pdfVal  > 10)  { _setStatus(statusEl, '⚠️ PDF pages must be 1–10.',         'warn'); return; }
  if (!atsVal  || atsVal  < 1 || atsVal  > 5)   { _setStatus(statusEl, '⚠️ ATS pages must be 1–5.',          'warn'); return; }
  if (!charVal || charVal < 500 || charVal > 20000) { _setStatus(statusEl, '⚠️ Characters must be 500–20 000.', 'warn'); return; }

  _setStatus(statusEl, 'Saving…', 'info');

  try {
    await apiCall('POST', '/api/generation-goals', {
      max_pdf_pages: pdfVal,
      max_ats_pages: atsVal,
      max_ats_chars: charVal,
    });
    _setStatus(statusEl, '✓ Saved', 'ok');
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    log.error('Failed to save generation goals:', err);
    _setStatus(statusEl, 'Save failed. Please try again.', 'error');
  }
}

/** @private */
function _setStatus(el, message, level) {
  if (!el) return;
  const colours = {
    ok:    'var(--success,#2e7d32)',
    error: 'var(--danger,#c62828)',
    warn:  'var(--warning,#e65100)',
    info:  'var(--text-secondary,#555)',
  };
  el.style.color  = colours[level] || colours.info;
  el.textContent  = message;
}
