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
 *   pdf_pages_enabled    — whether the PDF page goal is active
 *   max_pdf_pages_mode   — 'combined' | 'split'
 *   max_pdf_pages        — combined total PDF page goal (mode=combined)
 *   max_pdf_resume_pages — resume-portion page goal (mode=split)
 *   max_pdf_cv_pages     — CV/publications portion page goal (mode=split)
 *   ats_pages_enabled    — whether the ATS page goal is active
 *   max_ats_pages        — target page count for ATS plain-text output
 *   ats_chars_enabled    — whether the ATS character limit is active (default false)
 *   max_ats_chars        — maximum characters (including spaces) for ATS text
 *
 * Each goal has a checkbox to enable or disable it; disabled goals are not
 * sent to the backend and are not injected into prompts.
 *
 * DEPENDENCIES (available on globalThis via main.js):
 *   apiCall (api-client.js)
 */

import { getLogger } from './logger.js';

const log = getLogger('goals');

const GOALS_DEFAULTS = {
  pdf_pages_enabled:    true,
  max_pdf_pages_mode:   'combined',
  max_pdf_pages:        2,
  max_pdf_resume_pages: 2,
  max_pdf_cv_pages:     1,
  ats_pages_enabled:    true,
  max_ats_pages:        1,
  ats_chars_enabled:    false,
  max_ats_chars:        5000,
};

/** Shared inline styles */
const S = {
  section:    'margin-bottom:20px;border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:16px',
  header:     'display:flex;align-items:center;gap:10px;margin-bottom:12px',
  checkbox:   'width:16px;height:16px;cursor:pointer;flex-shrink:0',
  label:      'font-weight:600;font-size:1rem;cursor:pointer;margin:0',
  hint:       'font-size:0.875rem;color:var(--text-secondary,#555);margin:0 0 8px',
  numInput:   'padding:6px 10px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:1rem',
  row:        'display:flex;align-items:center;gap:8px',
  muted:      'color:var(--text-secondary,#555)',
  radioLabel: 'display:flex;align-items:flex-start;gap:8px;cursor:pointer',
  radioInput: 'margin-top:3px',
};

export async function populateGoalsTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <div class="goals-panel" style="max-width:640px;margin:0 auto;padding:28px 24px">
      <h2 style="margin-top:0;margin-bottom:8px">🎯 Generation Goals</h2>
      <p style="${S.muted};margin-bottom:24px;line-height:1.5">
        Set optional length constraints for the generated CV.
        Check each goal you want to enforce; unchecked goals are ignored.
        These guide the AI at every editing stage and control the final document length.
      </p>

      <!-- ── PDF Page Length ──────────────────────────────────────────── -->
      <div class="goals-section" style="${S.section}">
        <div style="${S.header}">
          <input type="checkbox" id="goals-pdf-enabled"
                 onchange="goalsToggleSection('pdf')"
                 checked style="${S.checkbox}">
          <label for="goals-pdf-enabled" style="${S.label}">PDF Page Length</label>
        </div>
        <div id="goals-pdf-body">
          <p style="${S.hint}">
            Target page count for the human-readable PDF (e.g. 1–3).
          </p>
          <div style="display:flex;flex-direction:column;gap:12px">

            <!-- ── Single total option ───────────────────────────── -->
            <div>
              <label style="${S.radioLabel}">
                <input type="radio" name="goals-pdf-mode" value="combined"
                       id="goals-pdf-mode-combined"
                       onchange="goalsUpdatePdfMode()" checked
                       style="${S.radioInput}">
                <span>
                  <strong>Single total</strong>
                  <span style="display:block;font-size:0.875rem;${S.muted};margin-top:2px">
                    One page goal covering the entire document, including
                    publications and citations.
                  </span>
                </span>
              </label>
              <div id="goals-pdf-combined"
                   style="padding-left:24px;margin-top:8px;${S.row}">
                <input type="number" id="goals-max-pdf-pages"
                       min="1" max="10" step="1"
                       value="${GOALS_DEFAULTS.max_pdf_pages}"
                       style="width:90px;${S.numInput}">
                <span style="${S.muted}">pages total</span>
              </div>
            </div>

            <!-- ── Split portions option ─────────────────────────── -->
            <div>
              <label style="${S.radioLabel}">
                <input type="radio" name="goals-pdf-mode" value="split"
                       id="goals-pdf-mode-split"
                       onchange="goalsUpdatePdfMode()"
                       style="${S.radioInput}">
                <span>
                  <strong>Split portions</strong>
                  <span style="display:block;font-size:0.875rem;${S.muted};margin-top:2px">
                    Separate page goals for the resume portion (experience, skills)
                    and the CV/publications portion (citations, publications).
                  </span>
                </span>
              </label>
              <div id="goals-pdf-split"
                   style="padding-left:24px;margin-top:8px;display:none;flex-direction:column;gap:8px">
                <div style="${S.row}">
                  <label style="min-width:185px;font-size:0.9rem">Resume portion:</label>
                  <input type="number" id="goals-max-pdf-resume-pages"
                         min="1" max="10" step="1"
                         value="${GOALS_DEFAULTS.max_pdf_resume_pages}"
                         style="width:90px;${S.numInput}">
                  <span style="${S.muted}">pages</span>
                </div>
                <div style="${S.row}">
                  <label style="min-width:185px;font-size:0.9rem">CV / Publications portion:</label>
                  <input type="number" id="goals-max-pdf-cv-pages"
                         min="1" max="10" step="1"
                         value="${GOALS_DEFAULTS.max_pdf_cv_pages}"
                         style="width:90px;${S.numInput}">
                  <span style="${S.muted}">pages</span>
                </div>
              </div>
            </div>

          </div><!-- end mode options column -->
        </div><!-- end goals-pdf-body -->
      </div><!-- end PDF section -->

      <!-- ── ATS Plain-Text Page Length ───────────────────────────────── -->
      <div class="goals-section" style="${S.section}">
        <div style="${S.header}">
          <input type="checkbox" id="goals-ats-pages-enabled"
                 onchange="goalsToggleSection('ats-pages')"
                 checked style="${S.checkbox}">
          <label for="goals-ats-pages-enabled" style="${S.label}">ATS Plain-Text Page Length</label>
        </div>
        <div id="goals-ats-pages-body">
          <p style="${S.hint}">
            Target number of pages for the ATS-optimised plain-text output (typically 1–2).
          </p>
          <div style="${S.row}">
            <input type="number" id="goals-max-ats-pages"
                   min="1" max="5" step="1"
                   value="${GOALS_DEFAULTS.max_ats_pages}"
                   style="width:90px;${S.numInput}">
            <span style="${S.muted}">pages</span>
          </div>
        </div>
      </div>

      <!-- ── ATS Character Count (disabled by default) ────────────────── -->
      <div class="goals-section" style="${S.section};margin-bottom:28px">
        <div style="${S.header}">
          <input type="checkbox" id="goals-ats-chars-enabled"
                 onchange="goalsToggleSection('ats-chars')"
                 style="${S.checkbox}">
          <label for="goals-ats-chars-enabled" style="${S.label}">ATS Character Count Limit</label>
          <span style="font-size:0.8rem;${S.muted};font-style:italic">(optional — uncommon)</span>
        </div>
        <div id="goals-ats-chars-body" style="opacity:0.4;pointer-events:none">
          <p style="${S.hint}">
            Maximum characters (including spaces) in the ATS plain-text output.
          </p>
          <div style="${S.row}">
            <input type="number" id="goals-max-ats-chars"
                   min="500" max="20000" step="100"
                   value="${GOALS_DEFAULTS.max_ats_chars}"
                   style="width:110px;${S.numInput}">
            <span style="${S.muted}">characters</span>
          </div>
        </div>
      </div>

      <!-- ── Generation Settings ──────────────────────────────────────────── -->
      <div class="goals-section" style="${S.section};margin-bottom:28px">
        <div style="${S.header}">
          <span style="font-size:1.1rem">⚙️</span>
          <span style="${S.label}">Generation Settings</span>
        </div>
        <p style="${S.hint}">
          Controls the shape of the generated CV — applied during customization and rewrite steps.
        </p>

        <div style="display:flex;flex-direction:column;gap:14px">
          <!-- Max skills -->
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <label for="goals-max-skills-input" style="font-size:0.9rem;color:#4b5563;white-space:nowrap;min-width:160px">
              Max skills in CV:
            </label>
            <input type="range" id="goals-max-skills-input" min="1" max="60" step="1" value="20"
                   oninput="document.getElementById('goals-max-skills-value').textContent=this.value"
                   onchange="goalsAutoSaveSettings()"
                   style="flex:1;min-width:120px;accent-color:#3b82f6">
            <span id="goals-max-skills-value" style="font-weight:600;color:#1e293b;min-width:2em;text-align:right">20</span>
            <span style="font-size:0.82em;${S.muted}">(default: 20)</span>
          </div>

          <!-- Skills section title -->
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <label for="goals-skills-title-select" style="font-size:0.9rem;color:#4b5563;white-space:nowrap;min-width:160px">
              Skills section title:
            </label>
            <select id="goals-skills-title-select"
                    onchange="goalsOnSkillsTitleSelect()"
                    style="font-size:0.9em;border:1px solid #d1d5db;border-radius:4px;padding:4px 8px;color:#1e293b">
              <option value="Skills">Skills</option>
              <option value="Technical Skills">Technical Skills</option>
              <option value="Key Skills">Key Skills</option>
              <option value="Core Skills">Core Skills</option>
              <option value="__custom__">Custom…</option>
            </select>
            <input type="text" id="goals-skills-title-custom" placeholder="Enter custom title"
                   onchange="goalsAutoSaveSettings()"
                   style="display:none;font-size:0.9em;border:1px solid #d1d5db;border-radius:4px;padding:4px 8px;color:#1e293b;min-width:160px">
          </div>
        </div>
        <span id="goals-settings-status" style="display:block;margin-top:8px;font-size:0.82rem;transition:color 0.2s"></span>
      </div>

      <div style="${S.row};gap:14px">
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
 * Toggle the enabled/disabled appearance of a goal section.
 * Exported so the inline onchange="goalsToggleSection(...)" handlers work.
 */
export function goalsToggleSection(section) {
  const MAP = {
    'pdf':       { cb: 'goals-pdf-enabled',       body: 'goals-pdf-body'       },
    'ats-pages': { cb: 'goals-ats-pages-enabled', body: 'goals-ats-pages-body' },
    'ats-chars': { cb: 'goals-ats-chars-enabled', body: 'goals-ats-chars-body' },
  };
  const sel = MAP[section];
  if (!sel) return;
  const cb   = document.getElementById(sel.cb);
  const body = document.getElementById(sel.body);
  if (!cb || !body) return;
  body.style.opacity       = cb.checked ? '1'    : '0.4';
  body.style.pointerEvents = cb.checked ? 'auto' : 'none';
}

/**
 * Show/hide combined vs split PDF page inputs when the mode radio changes.
 * Exported so the inline onchange="goalsUpdatePdfMode()" handler works.
 */
export function goalsUpdatePdfMode() {
  const combinedRadio = document.getElementById('goals-pdf-mode-combined');
  const isCombined    = combinedRadio?.checked ?? true;
  const combinedDiv   = document.getElementById('goals-pdf-combined');
  const splitDiv      = document.getElementById('goals-pdf-split');
  if (combinedDiv) combinedDiv.style.display = isCombined ? 'flex'   : 'none';
  if (splitDiv)    splitDiv.style.display    = isCombined ? 'none'   : 'flex';
}

/**
 * Fetch current generation goals from the session and populate the form inputs.
 * @private
 */
async function _loadGoalsFromStatus() {
  try {
    const data  = await apiCall('GET', '/api/status');
    const goals = data?.generation_goals;
    if (!goals) return;

    // ── Enabled checkboxes ────────────────────────────────────────────────────
    const pdfEnabledCb      = document.getElementById('goals-pdf-enabled');
    const atsPageEnabledCb  = document.getElementById('goals-ats-pages-enabled');
    const atsCharsEnabledCb = document.getElementById('goals-ats-chars-enabled');

    if (pdfEnabledCb      && goals.pdf_pages_enabled  != null) pdfEnabledCb.checked      = goals.pdf_pages_enabled;
    if (atsPageEnabledCb  && goals.ats_pages_enabled  != null) atsPageEnabledCb.checked  = goals.ats_pages_enabled;
    if (atsCharsEnabledCb && goals.ats_chars_enabled  != null) atsCharsEnabledCb.checked = goals.ats_chars_enabled;

    goalsToggleSection('pdf');
    goalsToggleSection('ats-pages');
    goalsToggleSection('ats-chars');

    // ── PDF mode radio ────────────────────────────────────────────────────────
    if (goals.max_pdf_pages_mode) {
      const radio = document.querySelector(
        `input[name="goals-pdf-mode"][value="${goals.max_pdf_pages_mode}"]`);
      if (radio) radio.checked = true;
      goalsUpdatePdfMode();
    }

    // ── Numeric values ────────────────────────────────────────────────────────
    const pdfInput        = document.getElementById('goals-max-pdf-pages');
    const pdfResumeInput  = document.getElementById('goals-max-pdf-resume-pages');
    const pdfCvInput      = document.getElementById('goals-max-pdf-cv-pages');
    const atsPageInput    = document.getElementById('goals-max-ats-pages');
    const atsCharInput    = document.getElementById('goals-max-ats-chars');

    if (pdfInput       && goals.max_pdf_pages         != null) pdfInput.value       = goals.max_pdf_pages;
    if (pdfResumeInput && goals.max_pdf_resume_pages  != null) pdfResumeInput.value = goals.max_pdf_resume_pages;
    if (pdfCvInput     && goals.max_pdf_cv_pages      != null) pdfCvInput.value     = goals.max_pdf_cv_pages;
    if (atsPageInput   && goals.max_ats_pages         != null) atsPageInput.value   = goals.max_ats_pages;
    if (atsCharInput   && goals.max_ats_chars         != null) atsCharInput.value   = goals.max_ats_chars;

    // ── Generation Settings ───────────────────────────────────────────────────
    const maxSkillsSlider = document.getElementById('goals-max-skills-input');
    const maxSkillsLabel  = document.getElementById('goals-max-skills-value');
    if (maxSkillsSlider && data.max_skills != null) {
      maxSkillsSlider.value = data.max_skills;
      if (maxSkillsLabel) maxSkillsLabel.textContent = data.max_skills;
    }
    const knownTitles = ['Skills', 'Technical Skills', 'Key Skills', 'Core Skills'];
    const currentTitle = data.skills_section_title || 'Skills';
    const titleSelect  = document.getElementById('goals-skills-title-select');
    const titleCustom  = document.getElementById('goals-skills-title-custom');
    if (titleSelect) {
      const isKnown = knownTitles.includes(currentTitle);
      titleSelect.value = isKnown ? currentTitle : '__custom__';
      if (titleCustom) {
        titleCustom.style.display = isKnown ? 'none' : '';
        if (!isKnown) titleCustom.value = currentTitle;
      }
    }
  } catch (err) {
    log.warn('Failed to load generation goals from backend:', err);
  }
}

/**
 * Read the form inputs, validate, and POST to /api/generation-goals.
 * Exposed on globalThis so the inline onclick="saveGenerationGoals()" works.
 */
export async function saveGenerationGoals() {
  const statusEl = document.getElementById('goals-status');

  // ── Read enabled flags ──────────────────────────────────────────────────────
  const pdfEnabled      = document.getElementById('goals-pdf-enabled')?.checked      ?? true;
  const atsPageEnabled  = document.getElementById('goals-ats-pages-enabled')?.checked ?? true;
  const atsCharsEnabled = document.getElementById('goals-ats-chars-enabled')?.checked ?? false;

  // ── Read PDF mode and values ────────────────────────────────────────────────
  const pdfMode        = document.querySelector('input[name="goals-pdf-mode"]:checked')?.value ?? 'combined';
  const pdfPages       = parseInt(document.getElementById('goals-max-pdf-pages')?.value,        10);
  const pdfResumePages = parseInt(document.getElementById('goals-max-pdf-resume-pages')?.value, 10);
  const pdfCvPages     = parseInt(document.getElementById('goals-max-pdf-cv-pages')?.value,     10);
  const atsPages       = parseInt(document.getElementById('goals-max-ats-pages')?.value,        10);
  const atsChars       = parseInt(document.getElementById('goals-max-ats-chars')?.value,        10);

  // ── Validate only enabled fields ────────────────────────────────────────────
  if (pdfEnabled) {
    if (pdfMode === 'combined') {
      if (!pdfPages || pdfPages < 1 || pdfPages > 10) {
        _setStatus(statusEl, '⚠️ PDF pages must be 1–10.', 'warn'); return;
      }
    } else {
      if (!pdfResumePages || pdfResumePages < 1 || pdfResumePages > 10) {
        _setStatus(statusEl, '⚠️ Resume portion pages must be 1–10.', 'warn'); return;
      }
      if (!pdfCvPages || pdfCvPages < 1 || pdfCvPages > 10) {
        _setStatus(statusEl, '⚠️ CV / Publications portion pages must be 1–10.', 'warn'); return;
      }
    }
  }
  if (atsPageEnabled  && (!atsPages  || atsPages  < 1  || atsPages  > 5))     { _setStatus(statusEl, '⚠️ ATS pages must be 1–5.',          'warn'); return; }
  if (atsCharsEnabled && (!atsChars  || atsChars  < 500 || atsChars > 20000)) { _setStatus(statusEl, '⚠️ Characters must be 500–20 000.', 'warn'); return; }

  // ── Build payload (include enabled flags + active values only) ──────────────
  const payload = {
    pdf_pages_enabled:  pdfEnabled,
    ats_pages_enabled:  atsPageEnabled,
    ats_chars_enabled:  atsCharsEnabled,
    max_pdf_pages_mode: pdfMode,
  };

  if (pdfEnabled) {
    if (pdfMode === 'combined') {
      payload.max_pdf_pages = pdfPages;
    } else {
      payload.max_pdf_resume_pages = pdfResumePages;
      payload.max_pdf_cv_pages     = pdfCvPages;
    }
  }
  if (atsPageEnabled)  payload.max_ats_pages = atsPages;
  if (atsCharsEnabled) payload.max_ats_chars = atsChars;

  _setStatus(statusEl, 'Saving…', 'info');

  try {
    await apiCall('POST', '/api/generation-goals', payload);
    _setStatus(statusEl, '✓ Saved', 'ok');
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  } catch (err) {
    log.error('Failed to save generation goals:', err);
    _setStatus(statusEl, 'Save failed. Please try again.', 'error');
  }
}

/**
 * Show/hide the custom-title input when the skills-title select changes.
 * Exported so the inline onchange="goalsOnSkillsTitleSelect()" handler works.
 */
export function goalsOnSkillsTitleSelect() {
  const sel    = document.getElementById('goals-skills-title-select');
  const custom = document.getElementById('goals-skills-title-custom');
  if (!sel) return;
  if (sel.value === '__custom__') {
    if (custom) { custom.style.display = ''; custom.focus(); }
  } else {
    if (custom) custom.style.display = 'none';
    goalsAutoSaveSettings();
  }
}

/**
 * Auto-save the generation settings (max_skills + skills_section_title)
 * via POST /api/generation-settings without blocking.
 * Exported so inline onchange="goalsAutoSaveSettings()" handlers work.
 */
export async function goalsAutoSaveSettings() {
  const statusEl = document.getElementById('goals-settings-status');
  const slider   = document.getElementById('goals-max-skills-input');
  const sel      = document.getElementById('goals-skills-title-select');
  const custom   = document.getElementById('goals-skills-title-custom');

  const maxSkills = slider ? parseInt(slider.value, 10) : null;
  const title     = sel?.value === '__custom__'
    ? (custom?.value?.trim() || null)
    : (sel?.value || null);

  if (!maxSkills && !title) return;

  const payload = {};
  if (maxSkills && maxSkills >= 1) payload.max_skills          = maxSkills;
  if (title)                       payload.skills_section_title = title;

  _setStatus(statusEl, 'Saving…', 'info');
  try {
    await apiCall('POST', '/api/generation-settings', payload);
    _setStatus(statusEl, '✓ Saved', 'ok');
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
  } catch (err) {
    log.warn('Failed to save generation settings:', err);
    _setStatus(statusEl, 'Save failed', 'error');
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
