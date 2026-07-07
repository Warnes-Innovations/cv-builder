// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * layout-instruction.js
 * Frontend UI for natural-language layout instruction workflow.
 * Handles instruction submission, preview updates, and instruction history.
 */

import { getLogger } from './logger.js';
const log = getLogger('layout-instruction');

import { apiCall } from './api-client.js';
import { scheduleAtsRefresh } from './ats-refinement.js';
import { appendMessage, appendMessageHtml } from './message-queue.js';
import { switchTab } from './review-table-base.js';
import { stateManager, GENERATION_STATE_EVENT, GENERATION_PHASES } from './state-manager.js';
import { escapeHtml } from './utils.js';
import { confirmReRunPhase } from './workflow-steps.js';

let dismissedStaleCalloutRevision = null;

/**
 * Convert a CSS pixel value to its typographic point equivalent.
 * Assumes the standard screen resolution convention: 96 px/in, 72 pt/in,
 * so 1px = 0.75 pt.
 * @param {number} px
 * @returns {number} pt value rounded to one decimal place
 */
export function pxToPt(px) {
  return Math.round(px * 0.75 * 10) / 10;
}

function coerceBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  if (value == null) return defaultValue;
  return Boolean(value);
}

// Undo stack — each entry is { html, instructions } snapshotted before a
// layout instruction is applied.  Cap at 20 entries to bound memory.
const _layoutUndoStack = [];
const _UNDO_STACK_MAX = 20;

function getCvArtifacts() {
  return stateManager.getTabData('cv') || {};
}

function updateCvArtifacts(nextCvArtifacts) {
  stateManager.setTabData('cv', nextCvArtifacts);
}

function setPreviewHtml(html) {
  updateCvArtifacts({ ...getCvArtifacts(), '*.html': html });
}

function getPreviewOutputs() {
  return stateManager?.getGenerationState?.()?.previewOutputs || null;
}

function getPreviewOutputUrl(renderer) {
  const sessionId = stateManager?.getSessionId?.();
  const suffix = sessionId
    ? `?session_id=${encodeURIComponent(sessionId)}`
    : '';
  return `/api/cv/preview-output/${encodeURIComponent(renderer)}${suffix}`;
}

function renderPreviewOutputStatus(previewOutputs = null) {
  const container = document.getElementById('preview-output-status');
  if (!container) return;

  const pdfs = previewOutputs?.pdfs || {};
  const rendererOrder = ['chrome', 'weasyprint'];
  const availableRenderers = rendererOrder.filter((rendererKey) => rendererKey in pdfs);

  if (availableRenderers.length === 0) {
    container.innerHTML = `
      <div class="preview-output-empty">
        Preview PDFs will appear here after the current layout is rendered.
      </div>
    `;
    return;
  }

  const rendererLabels = {
    chrome: 'Chrome',
    weasyprint: 'WeasyPrint',
  };

  container.innerHTML = availableRenderers.map((rendererKey) => {
    const renderer = pdfs[rendererKey] || {};
    const ok = Boolean(renderer.ok);
    const detail = renderer.renderer_detail || renderer.error || 'No detail available';
    const rendererLabel = rendererLabels[rendererKey] || rendererKey;
    const badgeMarkup = ok
      ? `<a class="preview-output-badge preview-output-badge-link is-ready" href="${getPreviewOutputUrl(rendererKey)}" target="_blank" rel="noopener">${rendererLabel} Ready</a>`
      : `<span class="preview-output-badge is-failed">${rendererLabel} Failed</span>`;
    const htmlFallback = ok ? '' : `<div style="margin-top:6px;font-size:0.82em;color:#6b7280;">
      <a href="${getPreviewOutputUrl('html')}" target="_blank" rel="noopener" style="color:var(--cv-accent);">View HTML preview</a> — open the HTML source in your browser as a fallback.
    </div>`;

    return `
      <div class="preview-output-row ${ok ? 'is-ready' : 'is-failed'}">
        <div class="preview-output-copy">
          <div class="preview-output-title-row">
            ${badgeMarkup}
          </div>
          <div class="preview-output-detail">${escapeHtml(detail)}</div>
          ${htmlFallback}
        </div>
      </div>
    `;
  }).join('');
}

function appendLayoutSafetyAlert(safetyAlert) {
  if (!safetyAlert?.flagged) {
    return;
  }

  const issues = (safetyAlert.issues || [])
    .map(issue => {
      const text = typeof issue === 'string'
        ? issue
        : (issue?.detail || issue?.issue || JSON.stringify(issue));
      return `<li>${escapeHtml(text)}</li>`;
    })
    .join('');

  appendMessageHtml(
    'system',
    `<strong>⚠️ Layout safety sanitization applied.</strong><br>${escapeHtml(safetyAlert.message || 'Potential prompt payloads or unsafe HTML were removed before applying the change.')}<br><ul style="margin:6px 0 0 18px">${issues}</ul>`,
  );
}

function normalizeLayoutInstruction(instruction = {}) {
  return {
    timestamp: instruction.timestamp || '',
    instruction_text: instruction.instruction_text || instruction.instruction || '',
    change_summary: instruction.change_summary || instruction.summary || '',
    confirmation: instruction.confirmation !== false,
  };
}

function getCurrentContentRevision() {
  return stateManager.getGenerationState().contentRevision ?? 0;
}

function formatGenerationTimestamp(timestamp) {
  if (!timestamp) return '';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function buildLayoutFreshnessChipMarkup(freshness) {
  if (!freshness?.showChip) return '';
  const icon = freshness.isCritical ? '↻' : (freshness.isStale ? '!' : '✓');
  return `<span class="layout-freshness-chip ${freshness.tone} layout-pane-freshness-chip"
    aria-label="${escapeHtml(freshness.ariaLabel || '')}">
    <span class="layout-freshness-icon" aria-hidden="true">${icon}</span>
    <span class="layout-freshness-label">${escapeHtml(freshness.label || '')}</span>
  </span>`;
}

function renderLayoutPreviewStatus() {
  const container = document.getElementById('layout-preview-status');
  if (!container) return;
  const freshness = stateManager.getLayoutFreshness();
  const generationState = stateManager.getGenerationState();
  if (!generationState.previewAvailable) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  const lastPreviewRevision = Number.isFinite(generationState.lastPreviewContentRevision)
    ? generationState.lastPreviewContentRevision : null;
  const currentRevision = Number.isFinite(generationState.contentRevision)
    ? generationState.contentRevision : null;
  const pendingRevisionCount = lastPreviewRevision !== null && currentRevision !== null
    ? Math.max(0, currentRevision - lastPreviewRevision) : 0;
  const timestampLabel = formatGenerationTimestamp(generationState.previewGeneratedAt);
  const detailLines = [];
  if (timestampLabel) detailLines.push(`Preview generated ${timestampLabel}`);
  if (generationState.layoutConfirmed && generationState.confirmedAt) {
    const confirmedLabel = formatGenerationTimestamp(generationState.confirmedAt);
    if (confirmedLabel) detailLines.push(`Layout confirmed ${confirmedLabel}`);
  }
  if (freshness.isStale) {
    if (pendingRevisionCount > 0) {
      detailLines.push(`${pendingRevisionCount} content change${pendingRevisionCount === 1 ? '' : 's'} since this preview`);
    } else {
      detailLines.push('Content changed after this preview was generated');
    }
  } else if (generationState.layoutConfirmed || generationState.phase === 'confirmed') {
    detailLines.push('Confirmed preview matches the latest approved content');
  } else {
    detailLines.push('Preview matches the latest approved content');
  }
  const stageLabel = generationState.layoutConfirmed || generationState.phase === 'confirmed'
    ? 'Ready for final files' : 'Ready for layout review';
  // Page count badge: shown when a page count is available from the preview
  const pc = generationState.pageCountExact ?? generationState.pageCountEstimate;
  let pageCountBadge = '';
  if (pc !== null && pc !== undefined) {
    const pcLabel  = generationState.pageCountExact !== null ? `${pc} page${pc !== 1 ? 's' : ''}` : `~${pc} page${pc !== 1 ? 's' : ''}`;
    const pcWarn   = generationState.pageWarning;
    pageCountBadge = `<span class="layout-page-count-badge${pcWarn ? ' warn' : ''}" title="${pcWarn ? 'Page count outside recommended range' : 'Page count within range'}">${pcWarn ? '⚠ ' : '📄 '}${escapeHtml(pcLabel)}</span>`;
  }
  container.innerHTML = `
    <div class="layout-preview-status-card ${freshness.tone}">
      <div class="layout-preview-status-header">
        ${buildLayoutFreshnessChipMarkup(freshness)}
        <span class="layout-preview-status-stage">${escapeHtml(stageLabel)}</span>
        ${pageCountBadge}
      </div>
      <div class="layout-preview-status-details">
        ${detailLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
      </div>
    </div>`;
  container.style.display = 'block';
}

function renderLayoutStaleCallout() {
  const callout = document.getElementById('layout-stale-callout');
  if (!callout) return;

  const freshness = stateManager.getLayoutFreshness();
  const contentRevision = getCurrentContentRevision();
  const isDismissed = dismissedStaleCalloutRevision === contentRevision;

  if (!freshness.isStale || isDismissed) {
    if (!freshness.isStale) dismissedStaleCalloutRevision = null;
    callout.style.display = 'none';
    return;
  }

  callout.style.display = 'block';
}

function refreshLayoutReviewState() {
  const freshness = stateManager.getLayoutFreshness();
  const generationState = stateManager.getGenerationState();
  const confirmBtn  = document.getElementById('confirm-layout-btn');
  const finalBtn = document.getElementById('proceed-to-finalise-btn');

  renderLayoutPreviewStatus();
  renderLayoutStaleCallout();
  renderDirtyPhasesCallout();

  const dirtyPhases = stateManager.getDirtyPhases();
  const hasDirty = dirtyPhases.length > 0;

  const showConfirm = generationState.previewAvailable && !freshness.isStale && !generationState.layoutConfirmed && !hasDirty
    ? 'block'
    : 'none';

  if (confirmBtn)  confirmBtn.style.display  = showConfirm;
  const hintEl = document.getElementById('layout-two-step-hint');
  if (hintEl) hintEl.style.display = showConfirm;

  // Update sub-step indicator (GAP-364)
  const subEl = document.getElementById('layout-substep-indicator');
  if (subEl) {
    const layoutConfirmed = generationState.layoutConfirmed || generationState.phase === 'confirmed';
    let substepText, substepStep;
    if (!generationState.previewAvailable) {
      substepText = 'Generate preview to start reviewing the layout'; substepStep = 1;
    } else if (layoutConfirmed) {
      substepText = 'Layout confirmed — generate final files to continue'; substepStep = 3;
    } else {
      substepText = 'Review the preview, then confirm layout when satisfied'; substepStep = 2;
    }
    subEl.innerHTML = `<span class="layout-substep-step">Step ${substepStep} of 3</span> <span class="layout-substep-label">${escapeHtml(substepText)}</span>`;
    subEl.style.display = 'flex';
  }

  if (finalBtn) {
    finalBtn.style.display = generationState.previewAvailable
      && !freshness.isStale
      && !hasDirty
      && (generationState.layoutConfirmed || generationState.phase === 'confirmed')
      ? 'block'
      : 'none';
  }
}

/**
 * Initialize layout instruction UI and event handlers.
 * Called when layout tab is activated.
 */
async function initiateLayoutInstructions() {
  const instructionTab = document.getElementById('document-content');
  if (!instructionTab) return;

  // Create two-column layout if it doesn't exist
  if (!instructionTab.querySelector('.layout-instruction-panel')) {
    instructionTab.innerHTML = `
      <div class="layout-instruction-panel">
        <div class="layout-preview-pane">
          <h3>Current Layout Preview</h3>
          <div id="layout-preview-status" class="layout-preview-status" style="display:none;"></div>
          <div class="preview-iframe-container">
            <div id="preview-loading-overlay" class="preview-loading-overlay" style="display:none;">
              <div class="spinner"></div>
              <p class="preview-loading-label">Rendering preview…</p>
              <p id="preview-loading-log" class="preview-loading-log"></p>
            </div>
            <iframe id="layout-preview" class="layout-preview-iframe" title="CV Layout Preview" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe>
          </div>
        </div>

        <div class="layout-input-pane">
          <h3>Layout Review</h3>
          <div id="layout-substep-indicator" class="layout-substep-indicator" aria-live="polite" style="display:none;"></div>
          <p class="layout-scope-label">💡 Describe a layout change (spacing, margins, column widths, section order). Text content is finalised — content edits are not applied here.</p>
          <div id="layout-page-estimate" style="display:none;margin-bottom:10px;"></div>

          <div id="layout-stale-callout" class="layout-stale-callout" style="display:none;">
            <h4>Layout preview is out of date</h4>
            <p>You changed CV content after the current preview was generated. Regenerate the preview before trusting page count, layout feedback, or final files.</p>
            <div class="layout-stale-callout-actions">
              <button id="regenerate-layout-preview-btn" class="btn-warning layout-action-btn">Regenerate preview</button>
              <button id="dismiss-layout-stale-btn" class="btn-secondary layout-action-btn">Keep reviewing current preview</button>
            </div>
          </div>

          <div class="preview-output-card">
            <div class="preview-output-card-header">
              <h4>Preview PDFs</h4>
              <span class="preview-output-card-note">Chrome and WeasyPrint render in parallel</span>
            </div>
            <div id="preview-output-status" class="preview-output-status"></div>
          </div>

          <div class="layout-settings-row" style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:14px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <label for="base-font-size-input" style="font-size:0.85em; font-weight:600; color:#475569; white-space:nowrap;">Base font size:</label>
            <input
              id="base-font-size-input"
              type="number"
              min="6" max="16" step="0.5"
              value="13"
              style="width:60px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9em;"
              title="Controls the root font size for the CV. All rem-based sizes scale with this value."
            />
            <span id="font-size-pt-display" style="font-size:0.82em; color:#64748b; white-space:nowrap;">px&nbsp;(9.8&nbsp;pt)</span>
            <label for="page-margin-input" style="font-size:0.85em; font-weight:600; color:#475569; white-space:nowrap; margin-left:8px;">Page margin (in):</label>
            <input
              id="page-margin-input"
              type="number"
              min="0.5" max="1.5" step="0.05"
              value="0.5"
              style="width:72px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9em;"
              title="Controls the print page margins for all PDF pages."
            />
            <label for="publications-start-new-page-input" style="display:inline-flex; align-items:center; gap:6px; font-size:0.83em; color:#334155; margin-left:8px;">
              <input id="publications-start-new-page-input" type="checkbox" />
              Start Publications on new page
            </label>
            <label for="skills-show-experience-select" style="font-size:0.85em; font-weight:600; color:#475569; white-space:nowrap; margin-left:8px;">Skill experience level:</label>
            <select
              id="skills-show-experience-select"
              style="padding:3px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9em;"
              title="Controls whether years of experience are shown next to each skill."
            >
              <option value="individual">Individual setting</option>
              <option value="always">Always</option>
              <option value="never">Never</option>
            </select>
            <button id="apply-layout-settings-btn" class="btn-secondary" style="padding:3px 10px; font-size:0.85em;">Apply</button>
            <span id="layout-settings-status" style="font-size:0.8em; color:#64748b;"></span>
          </div>

          <textarea
            id="instruction-input"
            class="layout-instruction-textarea"
            placeholder="e.g., Move Publications section after Skills&#10;or: Shorten the second bullet under Genentech to focus on impact&#10;or: Keep the Genentech entry on one page"
            rows="6"></textarea>

          <button id="apply-instruction-btn" class="btn-primary layout-action-btn">
            Apply
          </button>

          <button id="confirm-layout-btn" class="continue-btn layout-action-btn" style="display:none;">
            Confirm Layout
          </button>

          <p id="layout-two-step-hint" style="display:none;font-size:0.82em;color:#6b7280;margin:6px 0 2px;">
            Once the preview looks right, confirm the layout — then generate your final submission files.
          </p>

          <div id="processing-indicator" class="processing-indicator" style="display: none;">
            <div class="spinner"></div>
            <p id="processing-indicator-label">Applying instruction...</p>
            <ol class="cv-gen-step-list" id="cv-gen-step-list" aria-label="Generation progress" style="display:none;">
              <li class="cv-gen-step is-pending" data-step="0">Rendering HTML</li>
              <li class="cv-gen-step is-pending" data-step="1">Generating PDF</li>
              <li class="cv-gen-step is-pending" data-step="2">Building DOCX files</li>
            </ol>
          </div>

          <div id="confirmation-message" class="confirmation-message" style="display: none;"></div>

          <div class="layout-history-section">
            <h4>
              <span class="history-toggle">▼</span>
              Instruction History (<span id="instruction-count">0</span>)
            </h4>
            <div id="instruction-history" class="instruction-history-list"></div>
          </div>

          <button id="proceed-to-finalise-btn" class="continue-btn layout-action-btn" style="display: none;">
            Generate Final Files
          </button>

          <div id="content-proposal-processing" class="processing-indicator" style="display:none;">
            <div class="spinner"></div>
            <p>Generating content proposals…</p>
          </div>
          <div id="content-proposals-panel" style="display:none;"></div>
          <button id="apply-content-changes-btn" class="btn-warning layout-action-btn" style="display:none;">
            Apply Approved Changes
          </button>

          <div id="dirty-phases-callout" class="dirty-phases-callout" style="display:none;">
            <h4>⚠ Content Changed — Re-run Required</h4>
            <p>Text edits have been staged. The current preview no longer reflects the updated content.</p>
            <div class="layout-stale-callout-actions">
              <button id="return-to-earliest-dirty-btn" class="btn-warning layout-action-btn">↻ Return to Generate CV</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire up event listeners
    setupLayoutInstructionListeners();
  }

  // Restore saved font size from session state if available
  const savedFontSize = stateManager?.getSessionState?.()?.base_font_size;
  if (savedFontSize) {
    const input = document.getElementById('base-font-size-input');
    if (input) {
      const px = parseFloat(savedFontSize) || 13;
      input.value = px;
      const ptDisplay = document.getElementById('font-size-pt-display');
      if (ptDisplay) ptDisplay.textContent = `px\u00a0(${pxToPt(px)}\u00a0pt)`;
    }
  }
  const savedPageMargin = stateManager?.getSessionState?.()?.page_margin;
  if (savedPageMargin) {
    const input = document.getElementById('page-margin-input');
    if (input) input.value = parseFloat(savedPageMargin) || 0.5;
  }
  const publicationsStartInput = document.getElementById('publications-start-new-page-input');
  if (publicationsStartInput) {
    const sessionState = stateManager?.getSessionState?.() || {};
    const customizationState = stateManager?.getTabData?.('customizations') || {};
    const savedPublicationsStart =
      sessionState.publications_start_new_page
      ?? sessionState?.customizations?.publications_start_new_page
      ?? customizationState.publications_start_new_page
      ?? customizationState.publications_page_break
      ?? customizationState.start_publications_on_new_page
      ?? false;
    publicationsStartInput.checked = coerceBoolean(savedPublicationsStart, false);
  }
  const skillsShowExperienceSelect = document.getElementById('skills-show-experience-select');
  if (skillsShowExperienceSelect) {
    const sessionState = stateManager?.getSessionState?.() || {};
    const customizationState = stateManager?.getTabData?.('customizations') || {};
    const savedSkillsExp =
      sessionState.skills_show_experience
      ?? sessionState?.customizations?.skills_show_experience
      ?? customizationState.skills_show_experience
      ?? 'individual';
    const valid = ['always', 'never', 'individual'];
    skillsShowExperienceSelect.value = valid.includes(savedSkillsExp) ? savedSkillsExp : 'individual';
  }

  renderPreviewOutputStatus(getPreviewOutputs());

  // Load and display current HTML preview via the staged generation contract.
  // /api/cv/generate-preview generates fresh HTML and stores it in session state.
  // Fall back to the legacy /api/layout-html endpoint if the session has no
  // customization data yet (e.g. session restored after full generation).
  const cachedHtml = getCvArtifacts()['*.html'] || '';
  if (cachedHtml) {
    displayLayoutPreview(cachedHtml);
  } else {
    _fetchAndDisplayLayoutPreview();
  }

  // Restore any prior instructions from session
  await restoreInstructionHistory();
  refreshLayoutReviewState();

  // Show a proactive page-length estimate so users can adjust content before generating
  _fetchPageEstimate();
}

const _POSITION_STYLE_LABELS = {
  industry:   '🏢 Industry CV',
  academic:   '🎓 Academic CV',
  government: '🏛️ Government CV',
};

async function _fetchPageEstimate() {
  const banner = document.getElementById('layout-page-estimate');
  if (!banner) return;
  try {
    const res = await fetch('/api/estimate-pages');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok || !data.estimated_pages) return;
    const pages = data.estimated_pages;
    const isWarn = data.page_length_warning ?? (pages > 3);
    const styleKey = _POSITION_STYLE_LABELS[data.position_style] ? data.position_style : 'industry';
    const isOverride = !!data.position_style_is_override;
    const noUpperLimit = styleKey === 'academic' || styleKey === 'government';
    const styleLabel = _POSITION_STYLE_LABELS[styleKey];
    let msg;
    if (isWarn) {
      msg = pages < 2
        ? `⚠ Estimated ~${pages} pages — CV appears very short. Consider adding more content.`
        : `⚠ Estimated ~${pages} pages — industry target is 2–3 pages. Consider reducing selected bullet points before generating.`;
    } else {
      msg = noUpperLimit
        ? `✓ Estimated ~${pages} pages — ${styleLabel}s have no upper page limit.`
        : `✓ Estimated ~${pages} pages — within the 2–3 page target.`;
    }
    const sourceLabel = isOverride ? 'set manually' : 'detected from job description';
    banner.style.display = 'block';
    banner.innerHTML =
      `<div class="position-style-row">` +
        `<span class="position-style-badge position-style-badge--${styleKey}">${styleLabel}</span>` +
        `<span class="position-style-source">${sourceLabel}</span>` +
        `<button class="position-style-change-btn" type="button" aria-label="Change position style">✏ Change</button>` +
      `</div>` +
      `<div class="position-style-picker" style="display:none">` +
        Object.entries(_POSITION_STYLE_LABELS).map(([k, v]) =>
          `<button class="position-style-option${k === styleKey ? ' active' : ''}" data-style="${k}" type="button">${v}</button>`
        ).join('') +
        `<button class="position-style-option position-style-option--clear" data-style="" type="button">↩ Auto-detect</button>` +
      `</div>` +
      `<div class="page-estimate-msg ${isWarn ? 'warn' : 'ok'}">${msg}</div>`;

    const changeBtn = banner.querySelector('.position-style-change-btn');
    const picker    = banner.querySelector('.position-style-picker');
    changeBtn.addEventListener('click', () => {
      picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
    });
    picker.querySelectorAll('.position-style-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const chosen = btn.dataset.style;
        try {
          await fetch('/api/session/position-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ style: chosen }),
          });
        } catch (_) { /* non-critical */ }
        await _fetchPageEstimate();
      });
    });
  } catch (_) { /* silent — non-critical */ }
}

/**
 * Set up event listeners for layout instruction UI.
 */
function setupLayoutInstructionListeners() {
  const applyBtn          = document.getElementById('apply-instruction-btn');
  const confirmBtn        = document.getElementById('confirm-layout-btn');
  const proceedBtn        = document.getElementById('proceed-to-finalise-btn');
  const regenerateBtn     = document.getElementById('regenerate-layout-preview-btn');
  const dismissCalloutBtn = document.getElementById('dismiss-layout-stale-btn');
  const instructionInput  = document.getElementById('instruction-input');
  const historyToggle     = document.querySelector('.history-toggle');
  const applySettingsBtn  = document.getElementById('apply-layout-settings-btn');
  const fontSizeInput     = document.getElementById('base-font-size-input');
  const pageMarginInput   = document.getElementById('page-margin-input');
  const publicationsStartInput = document.getElementById('publications-start-new-page-input');
  const skillsShowExperienceSelect = document.getElementById('skills-show-experience-select');

  if (applySettingsBtn && fontSizeInput && pageMarginInput && publicationsStartInput) {
    applySettingsBtn.addEventListener(
      'click',
      () => applyLayoutSettings(
        fontSizeInput.value,
        pageMarginInput.value,
        publicationsStartInput.checked,
        skillsShowExperienceSelect?.value || 'individual',
      ),
    );
    fontSizeInput.addEventListener('input', () => {
      const ptDisplay = document.getElementById('font-size-pt-display');
      if (ptDisplay) {
        const px = parseFloat(fontSizeInput.value);
        ptDisplay.textContent = isNaN(px) ? 'px' : `px\u00a0(${pxToPt(px)}\u00a0pt)`;
      }
    });
    fontSizeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyLayoutSettings(
          fontSizeInput.value,
          pageMarginInput.value,
          publicationsStartInput.checked,
          skillsShowExperienceSelect?.value || 'individual',
        );
      }
    });
    pageMarginInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyLayoutSettings(
          fontSizeInput.value,
          pageMarginInput.value,
          publicationsStartInput.checked,
          skillsShowExperienceSelect?.value || 'individual',
        );
      }
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const instruction = instructionInput.value.trim();
      if (!instruction) {
        appendMessage('system', '⚠️ Please enter an instruction before submitting.');
        return;
      }
      submitSmartInstruction(instruction);
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmLayoutReview);
  }

  if (proceedBtn) {
    proceedBtn.addEventListener('click', generateFinalOutputs);
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', handleRegeneratePreviewAction);
  }

  if (dismissCalloutBtn) {
    dismissCalloutBtn.addEventListener('click', () => {
      dismissedStaleCalloutRevision = getCurrentContentRevision();
      renderLayoutStaleCallout();
    });
  }

  if (historyToggle) {
    historyToggle.addEventListener('click', (e) => {
      e.target.textContent = e.target.textContent === '▼' ? '▶' : '▼';
      const historyList = document.getElementById('instruction-history');
      if (historyList) {
        historyList.classList.toggle('collapsed');
      }
    });
  }

  // Allow Enter key to submit in textarea (Shift+Enter for new line)
  if (instructionInput) {
    instructionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        applyBtn?.click();
      }
    });
  }

  // Content proposal and dirty-phase buttons
  const applyContentChangesBtn = document.getElementById('apply-content-changes-btn');
  const returnToDirtyBtn       = document.getElementById('return-to-earliest-dirty-btn');

  if (applyContentChangesBtn) {
    applyContentChangesBtn.addEventListener('click', applyAcceptedProposals);
  }

  if (returnToDirtyBtn) {
    returnToDirtyBtn.addEventListener('click', () => {
      const step = stateManager.getEarliestDirtyStep() || 'generate';
      confirmReRunPhase(step);
    });
  }
}

/**
 * Save layout display settings to session state, then re-render the preview.
 */
async function applyLayoutSettings(fontSizeValue, pageMarginValue, publicationsStartNewPage = false, skillsShowExperience = 'individual') {
  const statusEl = document.getElementById('layout-settings-status');
  const parsedFontSize = parseFloat(fontSizeValue);
  const parsedPageMargin = parseFloat(pageMarginValue);
  if (isNaN(parsedFontSize) || parsedFontSize < 6 || parsedFontSize > 16) {
    if (statusEl) statusEl.textContent = '⚠️ Font must be 6–16';
    return;
  }
  if (isNaN(parsedPageMargin) || parsedPageMargin < 0.5 || parsedPageMargin > 1.5) {
    if (statusEl) statusEl.textContent = '⚠️ Margin must be 0.5–1.5';
    return;
  }
  try {
    if (statusEl) statusEl.textContent = 'Saving…';
    const saveRes = await apiCall('POST', '/api/layout-settings', {
      base_font_size: `${parsedFontSize}px`,
      page_margin: `${parsedPageMargin}in`,
      publications_start_new_page: Boolean(publicationsStartNewPage),
      skills_show_experience: skillsShowExperience,
    });
    if (!saveRes.ok) throw new Error(saveRes.error || 'save failed');

    if (statusEl) statusEl.textContent = 'Re-rendering…';
    const previewRes = await apiCall('POST', '/api/cv/generate-preview', { content_revision: getCurrentContentRevision() });
    if (previewRes.ok && previewRes.html) {
      displayLayoutPreview(previewRes.html);
      setPreviewHtml(previewRes.html);
      dismissedStaleCalloutRevision = null;
      stateManager?.markPreviewGenerated?.({
        previewAvailable: true,
        previewOutputs: previewRes.preview_outputs || null,
        pageCountEstimate: previewRes.page_count_estimate ?? null,
        pageCountExact: previewRes.page_count_exact ?? null,
        pageCountConfidence: previewRes.page_count_confidence ?? null,
        pageCountSource: previewRes.page_count_source || null,
        pageWarning: Boolean(previewRes.page_length_warning),
        previewGeneratedAt: previewRes.preview_generated_at || new Date().toISOString(),
        previewRequestId: previewRes.preview_request_id || null,
      });
      renderPreviewOutputStatus(previewRes.preview_outputs || null);
      refreshLayoutReviewState();
      (previewRes.content_warnings || []).forEach(w => {
        if (typeof showToast === 'function') showToast(w.message, 'warning', 8000);
      });
    }
    if (statusEl) { statusEl.textContent = '✅ Applied'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ Failed to apply — try again or refresh.`;
    appendMessage('system', `❌ Could not apply the instruction. Try rephrasing it or refresh the page if the problem persists.`);
  }
}

/**
 * Submit an instruction through the unified smart-instruction endpoint.
 * The backend classifies the instruction as layout or content and delegates
 * to the appropriate handler. The response is routed accordingly here.
 */
async function submitSmartInstruction(instructionText) {
  const currentHtml = getCvArtifacts()['*.html'] || '';
  // Snapshot state for undo before applying.
  _layoutUndoStack.push({
    html: currentHtml,
    instructions: (window.layoutInstructions || []).map(i => ({ ...i })),
  });
  if (_layoutUndoStack.length > _UNDO_STACK_MAX) {
    _layoutUndoStack.shift();
  }

  try {
    showProcessing(true);
    const response = await apiCall('POST', '/api/cv/smart-instruction', { instruction: instructionText });

    if (!response.ok) {
      if (response.error === 'clarify') {
        showClarificationDialog(response.question, instructionText);
      } else {
        appendLayoutSafetyAlert(response.safety_alert);
        let errorHtml = `⚠️ Error: ${escapeHtml(response.error)} — ${escapeHtml(response.details || '')}`;
        if (response.raw_response !== undefined) {
          errorHtml += `<br><details style="margin-top:6px"><summary style="cursor:pointer;font-size:0.85em;color:#64748b">Raw LLM response</summary><pre style="font-size:0.75em;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-top:4px">${escapeHtml(response.raw_response || '(empty)')}</pre></details>`;
        }
        appendMessageHtml('system', errorHtml);
      }
      return;
    }

    const instructionType = response.instruction_type || 'layout';

    if (instructionType === 'content') {
      // Content path: render proposals for review
      const proposals = response.proposals || [];
      if (proposals.length === 0) {
        appendMessage('system', '⚠️ No content proposals were generated. Try rephrasing your instruction.');
      } else {
        renderContentProposals(proposals);
        const panel = document.getElementById('content-proposals-panel');
        if (panel) panel.style.display = 'block';
      }
      document.getElementById('instruction-input').value = '';
      return;
    }

    // Layout path: update preview
    const newHtml = response.html;
    displayLayoutPreview(newHtml);
    appendLayoutSafetyAlert(response.safety_alert);
    setPreviewHtml(newHtml);
    dismissedStaleCalloutRevision = null;
    stateManager?.markPreviewGenerated?.({
      previewAvailable: true,
      previewOutputs: response.preview_outputs || null,
      layoutConfirmed: false,
      pageCountEstimate: response.page_count_estimate ?? null,
      pageCountExact: response.page_count_exact ?? null,
      pageCountConfidence: response.page_count_confidence ?? null,
      pageCountSource: response.page_count_source || null,
      pageWarning: Boolean(response.page_length_warning),
      previewGeneratedAt: response.preview_generated_at || new Date().toISOString(),
      previewRequestId: response.preview_request_id || null,
    });
    renderPreviewOutputStatus(response.preview_outputs || null);

    const instruction = {
      timestamp: new Date().toLocaleTimeString(),
      instruction_text: instructionText,
      change_summary: response.summary,
      confirmation: true,
    };
    addToInstructionHistory(instruction);
    showConfirmationMessage(`${response.safety_alert?.flagged ? '⚠️ ' : '✅ '}${response.summary}`);
    document.getElementById('instruction-input').value = '';
    refreshLayoutReviewState();

  } catch (error) {
    appendMessage('system', `❌ Could not apply the instruction. Try rephrasing it, or click "Regenerate Preview" to reset the preview and try again.`);
  } finally {
    showProcessing(false);
  }
}

/**
 * Submit layout instruction to backend for processing.
 *
 * Uses POST /api/cv/layout-refine (staged generation contract) when a
 * session-stored preview is available.  Falls back to the legacy
 * POST /api/layout-instruction endpoint (which requires the HTML in the
 * request body) when no session preview exists.
 */
async function submitLayoutInstruction(instructionText) {
  /* duckflow:
   *   id: layout_ui_refine_live
   *   kind: ui
   *   timestamp: '2026-03-26T00:24:00Z'
   *   status: live
   *   handles:
   *   - ui:layout.submit-instruction
   *   calls:
   *   - POST /api/cv/layout-refine
   *   - POST /api/layout-instruction
   *   reads:
   *   - dom:#instruction-input.value
   *   - state:generation_state.previewAvailable
   *   - state:generation_state.phase
   *   - window:layoutInstructions
   *   writes:
   *   - request:POST /api/cv/layout-refine.instruction
   *   - dom:#layout-preview
   *   - window:layoutInstructions
   *   - state:generation_state.preview_outputs
   *   notes: Submits a natural-language layout instruction against the staged preview when available, then refreshes the preview and local instruction history from the returned HTML.
   */
  const currentHtml = getCvArtifacts()['*.html'] || '';
  const priorInstructions = window.layoutInstructions || [];

  // Snapshot state before applying so Undo can restore it.
  _layoutUndoStack.push({
    html: currentHtml,
    instructions: (window.layoutInstructions || []).map(i => ({ ...i })),
  });
  if (_layoutUndoStack.length > _UNDO_STACK_MAX) {
    _layoutUndoStack.shift();
  }

  try {
    showProcessing(true);

    // Prefer the session-backed endpoint; it manages HTML server-side.
    let response;
    const genState = stateManager?.getGenerationState?.() || {};
    const useSessionEndpoint = genState.previewAvailable || genState.phase === 'layout_review';

    if (useSessionEndpoint) {
      response = await apiCall('POST', '/api/cv/layout-refine', {
        instruction: instructionText,
        content_revision: getCurrentContentRevision(),
      });
    } else {
      response = await apiCall('POST', '/api/layout-instruction', {
        instruction: instructionText,
        current_html: currentHtml,
        prior_instructions: priorInstructions,
      });
    }

    if (!response.ok) {
      if (response.error === 'clarify') {
        showClarificationDialog(response.question, instructionText);
      } else {
        appendLayoutSafetyAlert(response.safety_alert);
        let errorHtml = `⚠️ Error: ${escapeHtml(response.error)} — ${escapeHtml(response.details || '')}`;
        if (response.raw_response !== undefined) {
          errorHtml += `<br><details style="margin-top:6px"><summary style="cursor:pointer;font-size:0.85em;color:#64748b">Raw LLM response</summary><pre style="font-size:0.75em;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-top:4px">${escapeHtml(response.raw_response || '(empty)')}</pre></details>`;
        }
        appendMessageHtml('system', errorHtml);
      }
      return;
    }

    // Update preview with new HTML
    const newHtml = response.html;
    displayLayoutPreview(newHtml);

    appendLayoutSafetyAlert(response.safety_alert);

    // Update state
    setPreviewHtml(newHtml);
    dismissedStaleCalloutRevision = null;
    stateManager?.markPreviewGenerated?.({
      previewAvailable: true,
      previewOutputs: response.preview_outputs || null,
      layoutConfirmed: false,
      pageCountEstimate: response.page_count_estimate ?? null,
      pageCountExact: response.page_count_exact ?? null,
      pageCountConfidence: response.page_count_confidence ?? null,
      pageCountSource: response.page_count_source || null,
      pageWarning: Boolean(response.page_length_warning),
      previewGeneratedAt: response.preview_generated_at || new Date().toISOString(),
      previewRequestId: response.preview_request_id || null,
    });
    renderPreviewOutputStatus(response.preview_outputs || null);

    // Add to instruction history
    const instruction = {
      timestamp: new Date().toLocaleTimeString(),
      instruction_text: instructionText,
      change_summary: response.summary,
      confirmation: true
    };
    addToInstructionHistory(instruction);

    // Show confirmation
    showConfirmationMessage(`${response.safety_alert?.flagged ? '⚠️ ' : '✅ '}${response.summary}`);

    // Clear input and refresh the staged controls.
    document.getElementById('instruction-input').value = '';
    refreshLayoutReviewState();

  } catch (error) {
    appendMessage('system', `❌ Could not apply the layout instruction. Try rephrasing it, or click "Regenerate Preview" to reset and try again.`);
  } finally {
    showProcessing(false);
  }
}

/**
 * Build the markPreviewGenerated payload from a /api/cv/generate-preview response.
 * @param {Object} data - Response from the generate-preview endpoint.
 * @returns {Object} Payload suitable for stateManager.markPreviewGenerated().
 */
function _buildPreviewPayload(data) {
  return {
    previewAvailable:    true,
    previewOutputs:      data.preview_outputs      || null,
    pageCountEstimate:   data.page_count_estimate  ?? null,
    pageCountExact:      data.page_count_exact      ?? null,
    pageCountConfidence: data.page_count_confidence ?? null,
    pageCountSource:     data.page_count_source     || null,
    pageWarning:         Boolean(data.page_length_warning),
    previewGeneratedAt:  data.preview_generated_at  || new Date().toISOString(),
    previewRequestId:    data.preview_request_id    || null,
  };
}

/**
 * Fetch the CV HTML preview via the staged generation contract.
 *
 * Strategy depends on the current generation state:
 *
 * - phase is not confirmed/final_complete:
 *   Always calls POST /api/cv/generate-preview, which stores preview_html in
 *   generation_state (required for confirm-layout) and calls markPreviewGenerated.
 *   This bootstraps the staged state even after legacy generate_cv actions that
 *   write files to disk without populating generation_state.preview_html.
 *   Falls back to GET /api/layout-html (passive, no state change) when
 *   generate-preview is unavailable (e.g. session has no job_analysis yet).
 *
 * - phase is confirmed/final_complete (passive restore):
 *   Reads HTML from disk via GET /api/layout-html without touching session state.
 */
async function _fetchAndDisplayLayoutPreview() {
  const genState    = stateManager?.getGenerationState?.() || {};
  const isConfirmed = genState.phase === GENERATION_PHASES.CONFIRMED
                   || genState.phase === GENERATION_PHASES.FINAL_COMPLETE;

  showPreviewLoading(true, isConfirmed ? 'Loading saved layout…' : 'Generating preview…');
  try {
    // Fresh-render path: always populate generation_state.preview_html on the backend
    // so that confirm-layout succeeds. Covers both the normal staged path and the
    // legacy generate_cv path that does not call generate-preview itself.
    if (!isConfirmed) {
      try {
        const data = await apiCall('POST', '/api/cv/generate-preview', {});
        if (data.ok && data.html) {
          displayLayoutPreview(data.html);
          setPreviewHtml(data.html);
          dismissedStaleCalloutRevision = null;
          stateManager?.markPreviewGenerated?.(_buildPreviewPayload(data));
          renderPreviewOutputStatus(data.preview_outputs || null);
          refreshLayoutReviewState();
          (data.content_warnings || []).forEach(w => {
            if (typeof showToast === 'function') showToast(w.message, 'warning', 8000);
          });
          return;
        }
      } catch (_e) {
        // fall through to legacy disk read
      }
    }

    // Passive restore path: load stored HTML from disk without touching generation state.
    // Used for confirmed/final_complete layouts, or as fallback when generate-preview
    // is unavailable (e.g. session has no job_analysis yet).
    try {
      showPreviewLoading(true, 'Loading stored layout…');
      const data = await apiCall('GET', '/api/layout-html');
      if (data.ok && data.html) {
        displayLayoutPreview(data.html);
        setPreviewHtml(data.html);
        refreshLayoutReviewState();
        return;
      }
      log.warn('Layout preview not available:', data.error || 'no HTML returned');
    } catch (_e) {
      // no preview available
    }
  } finally {
    showPreviewLoading(false);
  }
}

/**
 * Display HTML preview in iframe.
 */
function displayLayoutPreview(html) {
  const preview = document.getElementById('layout-preview');
  if (!preview) return;

  showPreviewLoading(false);
  preview.onload = () => fitLayoutPreviewToPane(preview);
  preview.setAttribute('sandbox', 'allow-same-origin');
  preview.setAttribute('referrerpolicy', 'no-referrer');
  preview.srcdoc = html;

  const doc = preview.contentDocument || preview.contentWindow?.document;
  if (doc?.readyState === 'complete') {
    fitLayoutPreviewToPane(preview);
  }
}

/**
 * Scale the preview so an entire CV page width fits within the preview pane.
 */
function fitLayoutPreviewToPane(preview) {
  const doc = preview?.contentDocument || preview?.contentWindow?.document;
  const container = preview?.closest('.preview-iframe-container');
  if (!doc || !container) return;

  const pageContainer = doc.querySelector('.page-container') || doc.body;
  if (!pageContainer) return;

  const containerWidth = Math.max(container.clientWidth - 24, 1);
  const contentWidth = Math.max(
    Math.ceil(pageContainer.scrollWidth || 0),
    Math.ceil(pageContainer.getBoundingClientRect().width || 0),
    1
  );
  const scale = Math.min(1, containerWidth / contentWidth);

  doc.documentElement.style.background = '#f8fafc';
  doc.body.style.margin = '0';
  doc.body.style.padding = '0';
  doc.body.style.background = '#f8fafc';
  doc.body.style.overflowX = 'auto';

  pageContainer.style.zoom = `${scale}`;
  pageContainer.style.transform = '';
  pageContainer.style.transformOrigin = '';
  pageContainer.style.margin = '12px';
  preview.style.minWidth = '';
}

/**
 * Add instruction to history panel.
 */
function addToInstructionHistory(instruction) {
  // Initialize global instruction list if needed
  if (!window.layoutInstructions) {
    window.layoutInstructions = [];
  }

  window.layoutInstructions.push(normalizeLayoutInstruction(instruction));
  renderInstructionHistory();
}

/**
 * Render instruction history from current state without mutating it.
 */
function renderInstructionHistory() {
  const historyList = document.getElementById('instruction-history');
  if (!historyList) return;

  const instructions = window.layoutInstructions || [];
  historyList.innerHTML = '';
  const lastIdx = instructions.length - 1;
  instructions.forEach((instruction, index) => {
    const entry = document.createElement('div');
    entry.className = 'instruction-history-entry';
    const isLast = index === lastIdx;
    const undoHtml = isLast
      ? `<button class="action-btn-sm" onclick="undoInstruction(${index})">↩ Undo</button>`
      : `<button class="action-btn-sm" disabled title="Undo is sequential — undo the most recent instruction first"
           style="opacity:0.3;cursor:not-allowed;">↩ Undo</button>`;
    entry.innerHTML = `
      <div class="instruction-time">${instruction.timestamp || ''}</div>
      <div class="instruction-text">${escapeHtml(instruction.instruction_text || '')}</div>
      <div class="instruction-summary"><em>${escapeHtml(instruction.change_summary || '')}</em></div>
      ${undoHtml}
    `;
    historyList.appendChild(entry);
  });

  // Update count
  document.getElementById('instruction-count').textContent = (window.layoutInstructions || []).length;
}

/**
 * Restore instruction history from session state.
 */
async function loadLayoutInstructionHistory() {
  try {
    const response = await apiCall('GET', '/api/layout-history');
    if (!response?.instructions || !Array.isArray(response.instructions)) {
      return window.layoutInstructions || [];
    }

    return response.instructions.map((instruction) => normalizeLayoutInstruction(instruction));
  } catch (_error) {
    return window.layoutInstructions || [];
  }
}

async function restoreInstructionHistory() {
  window.layoutInstructions = await loadLayoutInstructionHistory();
  renderInstructionHistory();
  refreshLayoutReviewState();
}

async function handleRegeneratePreviewAction() {
  try {
    showProcessing(true);
    await _fetchAndDisplayLayoutPreview();
    showConfirmationMessage('✅ Preview regenerated from the latest content.');
  } catch (error) {
    appendMessage('system', `❌ Could not regenerate the preview. Check that your session is active and try again. If the problem persists, reload the page.`);
    showPreviewLoading(false);
  } finally {
    showProcessing(false);
  }
}

/**
 * Show processing spinner (right-pane indicator for layout-instruction apply).
 */
function showProcessing(show, label) {
  const indicator = document.getElementById('processing-indicator');
  if (!indicator) return;
  indicator.style.display = show ? 'block' : 'none';
  const labelEl  = document.getElementById('processing-indicator-label');
  const stepList = document.getElementById('cv-gen-step-list');
  // Ensure step list is hidden and label is visible for non-generation calls
  if (stepList) stepList.style.display = 'none';
  if (labelEl)  labelEl.style.display  = '';
  if (show && label) {
    if (labelEl) labelEl.textContent = label;
  } else if (!show) {
    if (labelEl) labelEl.textContent = 'Applying instruction...';
  }
}

/**
 * Show generation step checklist inside #processing-indicator.
 * @param {number} activeIdx - 0-based index of the currently active step;
 *   pass -1 or >= 3 to mark all steps complete.
 */
function _showGenStepProgress(activeIdx) {
  const indicator = document.getElementById('processing-indicator');
  const stepList  = document.getElementById('cv-gen-step-list');
  const labelEl   = document.getElementById('processing-indicator-label');
  if (!indicator || !stepList) return;
  indicator.style.display = 'block';
  if (labelEl) labelEl.style.display = 'none';
  stepList.style.display = 'block';
  stepList.querySelectorAll('.cv-gen-step').forEach((step, i) => {
    step.className = 'cv-gen-step';
    if (i < activeIdx || activeIdx < 0)  step.classList.add('is-complete');
    else if (i === activeIdx)            step.classList.add('is-active');
    else                                 step.classList.add('is-pending');
  });
}

/**
 * Show or hide the preview-area loading overlay.
 * @param {boolean} show
 * @param {string} [logText] Optional status line shown below the spinner.
 */
function showPreviewLoading(show, logText = '') {
  const overlay = document.getElementById('preview-loading-overlay');
  if (!overlay) return;
  overlay.style.display = show ? 'flex' : 'none';
  const logEl = document.getElementById('preview-loading-log');
  if (logEl) logEl.textContent = logText;
}

/**
 * Show confirmation message.
 */
function showConfirmationMessage(message) {
  const element = document.getElementById('confirmation-message');
  if (!element) return;

  element.textContent = message;
  element.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    element.style.display = 'none';
  }, 3000);
}

/**
 * Show inline clarification panel when LLM needs more info.
 * Replaces window.prompt() with an accessible inline form.
 */
function showClarificationDialog(question, originalInstruction) {
  const inputEl = document.getElementById('instruction-input');
  const container = inputEl ? inputEl.closest('div') || inputEl.parentNode : null;
  if (!container) return;

  const existingPanel = document.getElementById('layout-clarification-panel');
  if (existingPanel) existingPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'layout-clarification-panel';
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px;margin-top:10px;';
  panel.innerHTML = `
    <p style="margin:0 0 8px;font-size:0.9em;color:#92400e;font-weight:600;">
      <span aria-hidden="true">❓</span> Clarification needed
    </p>
    <p style="margin:0 0 10px;font-size:0.88em;color:#78350f;">${escapeHtml(question)}</p>
    <label for="layout-clarification-input" style="font-size:0.85em;font-weight:600;color:#374151;display:block;margin-bottom:4px;">
      Your clarification:
    </label>
    <textarea id="layout-clarification-input" rows="2"
      style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #fde047;border-radius:4px;font-size:0.88em;resize:vertical;"
      aria-label="Clarification for layout instruction">${escapeHtml(originalInstruction)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button id="layout-clarification-submit"
        style="background:#d97706;color:#fff;border:none;border-radius:4px;padding:6px 14px;font-size:0.85em;cursor:pointer;font-weight:600;">
        Submit clarification
      </button>
      <button id="layout-clarification-cancel"
        style="background:none;border:1px solid #d97706;color:#92400e;border-radius:4px;padding:6px 14px;font-size:0.85em;cursor:pointer;">
        Cancel
      </button>
    </div>`;

  container.appendChild(panel);

  const clarInput  = panel.querySelector('#layout-clarification-input');
  const submitBtn  = panel.querySelector('#layout-clarification-submit');
  const cancelBtn  = panel.querySelector('#layout-clarification-cancel');

  clarInput.focus();
  clarInput.setSelectionRange(clarInput.value.length, clarInput.value.length);

  submitBtn.addEventListener('click', () => {
    const clarified = clarInput.value.trim();
    panel.remove();
    if (clarified && clarified !== originalInstruction) {
      submitLayoutInstruction(clarified);
    }
  });
  cancelBtn.addEventListener('click', () => panel.remove());
  clarInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitBtn.click(); }
    if (e.key === 'Escape') cancelBtn.click();
  });
}

/**
 * Undo the last layout instruction by restoring the previous snapshot.
 * The index parameter is accepted for backward compatibility but is ignored —
 * the undo stack always restores the most recent pre-instruction state.
 */
function undoInstruction(_index) {
  if (_layoutUndoStack.length === 0) {
    appendMessage('system', 'ℹ️ Nothing to undo.');
    return;
  }

  const snapshot = _layoutUndoStack.pop();
  window.layoutInstructions = snapshot.instructions;

  displayLayoutPreview(snapshot.html);
  setPreviewHtml(snapshot.html);
  renderInstructionHistory();
  appendMessage('system', '↩️ Last layout instruction undone.');
}

window.addEventListener('resize', () => {
  const preview = document.getElementById('layout-preview');
  if (preview) {
    fitLayoutPreviewToPane(preview);
  }
});

async function confirmLayoutReview() {
  try {
    showProcessing(true);

    const freshness = stateManager.getLayoutFreshness();
    if (freshness.isStale) {
      throw new Error('Preview is outdated. Regenerate the preview before confirming layout.');
    }

    const confirmRes = await apiCall('POST', '/api/cv/confirm-layout', { content_revision: getCurrentContentRevision() });
    if (!confirmRes?.ok) {
      throw new Error(confirmRes?.error || 'Failed to confirm layout.');
    }

    stateManager.markLayoutConfirmed({
      confirmedAt: confirmRes.confirmed_at || new Date().toISOString(),
    });
    showConfirmationMessage('✅ Layout confirmed. Generate final files when you are ready.');
    appendMessage('assistant', '✅ Layout confirmed. Review the preview if needed, then generate the final files.');
    refreshLayoutReviewState();
  } catch (error) {
    appendMessage('system', `❌ Could not confirm the layout. Try clicking Confirm again. If the problem persists, reload the page.`);
  } finally {
    showProcessing(false);
  }
}

async function generateFinalOutputs() {
  /* duckflow:
   *   id: layout_ui_generate_final_live
   *   kind: ui
   *   timestamp: '2026-03-26T00:24:00Z'
   *   status: live
   *   handles:
   *   - ui:layout.generate-final
   *   calls:
   *   - POST /api/cv/generate-final
   *   - POST /api/layout-complete
   *   reads:
   *   - state:generation_state.layoutConfirmed
   *   - state:generation_state.phase
   *   - state:layout_freshness
   *   writes:
   *   - tab:cvArtifacts
   *   - state:generation_state.final_generated_at
   *   - ui:workflow.refinement
   *   notes: Generates the final human-readable outputs from the confirmed preview and advances the UI into file review/finalise with the new artifact set.
   */
  let _stepTimer = null;
  let _genStepIdx = 0;
  try {
    _showGenStepProgress(0);   // step 0 active, steps 1-2 pending
    _stepTimer = setInterval(() => {
      _genStepIdx++;
      if (_genStepIdx < 3) _showGenStepProgress(_genStepIdx);
      else clearInterval(_stepTimer);
    }, 2500);

    const freshness = stateManager.getLayoutFreshness();
    const generationState = stateManager.getGenerationState();
    if (freshness.isStale) {
      throw new Error('Preview is outdated. Regenerate the preview before generating final files.');
    }
    if (!generationState.layoutConfirmed && generationState.phase !== 'confirmed') {
      const hasInstructions = (window.layoutInstructions || []).length > 0;
      if (hasInstructions) {
        throw new Error('Confirm layout before generating final files.');
      }
      // No instructions added — auto-confirm so users aren't blocked by a redundant click.
      const confirmRes = await apiCall('POST', '/api/cv/confirm-layout', { content_revision: getCurrentContentRevision() });
      if (!confirmRes?.ok) {
        throw new Error(confirmRes?.error || 'Failed to auto-confirm layout.');
      }
      stateManager.markLayoutConfirmed({ confirmedAt: confirmRes.confirmed_at || new Date().toISOString() });
    }

    const finalRes = await apiCall('POST', '/api/cv/generate-final', {});
    if (!finalRes?.ok || !finalRes.outputs) {
      throw new Error(finalRes?.error || 'Failed to generate final CV output.');
    }

    updateCvArtifacts(finalRes.outputs);
    stateManager.markFinalGenerated(finalRes.generated_at || null, {
      pageCountEstimate: finalRes.page_count_estimate ?? null,
      pageCountExact: finalRes.page_count_exact ?? null,
    });

    scheduleAtsRefresh('post_generation');

    stateManager.setPhase('final_generation');
    switchTab('final_generate');
    appendMessage('assistant', '✅ Final files generated from the confirmed layout.');
  } catch (error) {
    appendMessage('system', `❌ Could not generate final files. Try clicking Generate again. If layout confirmation is needed first, click Confirm Layout, then try again.`);
  } finally {
    if (_stepTimer) clearInterval(_stepTimer);
    showProcessing(false);
  }
}

async function handleLayoutPrimaryAction() {
  const freshness = stateManager.getLayoutFreshness();
  const generationState = stateManager.getGenerationState();
  if (freshness.isStale) return handleRegeneratePreviewAction();
  if (generationState.layoutConfirmed || generationState.phase === 'confirmed') {
    return generateFinalOutputs();
  }
  return confirmLayoutReview();
}

async function completeLayoutReview() {
  return handleLayoutPrimaryAction();
}

if (typeof window !== 'undefined') {
  window.addEventListener(GENERATION_STATE_EVENT, refreshLayoutReviewState);
}

// ── Content proposal functions ────────────────────────────────────────────────

/**
 * Submit a natural-language content edit request to the backend and render proposals.
 */
async function submitContentProposal() {
  const input      = document.getElementById('instruction-input');
  const processing = document.getElementById('content-proposal-processing');
  const panel      = document.getElementById('content-proposals-panel');

  const instruction = input?.value.trim();
  if (!instruction) {
    appendMessage('system', '⚠️ Please describe the content change you want before submitting.');
    return;
  }

  if (processing) processing.style.display = 'flex';
  if (panel)       panel.style.display = 'none';

  try {
    const res = await apiCall('POST', '/api/cv/propose-content-change', { instruction });
    if (!res?.ok) {
      appendMessage('system', `❌ Could not generate content proposals. Try rephrasing your instruction or check the session is still active.`);
      return;
    }
    const proposals = res.proposals || [];
    if (proposals.length === 0) {
      appendMessage('system', '⚠️ No proposals were generated. Try rephrasing your instruction.');
      return;
    }
    renderContentProposals(proposals);
    if (panel) panel.style.display = 'block';
  } catch (err) {
    appendMessage('system', `❌ Could not submit the content proposal. Check your connection and try again.`);
  } finally {
    if (processing) processing.style.display = 'none';
  }
}

/**
 * Render a list of content proposals as reviewable cards inside #content-proposals-panel.
 * @param {Array<{id, type, location, original, proposed, reason}>} proposals
 */
function renderContentProposals(proposals) {
  const panel = document.getElementById('content-proposals-panel');
  if (!panel) return;

  const applyBtn = document.getElementById('apply-content-changes-btn');

  panel.innerHTML = `
    <p class="content-proposals-heading">${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} — approve the changes you want to apply:</p>
    ${proposals.map((p, i) => `
      <div class="content-proposal-card" data-proposal-id="${escapeHtml(p.id)}" data-proposal-index="${i}">
        <div class="proposal-meta">
          <span class="proposal-type-badge">${p.type === 'summary' ? 'Summary' : 'Bullet'}</span>
          <span class="proposal-location">${escapeHtml(p.location)}</span>
        </div>
        <div class="proposal-diff">
          <div class="proposal-original"><strong>Before:</strong> ${escapeHtml(p.original)}</div>
          <div class="proposal-proposed"><strong>After:</strong> ${escapeHtml(p.proposed)}</div>
        </div>
        ${p.reason ? `<div class="proposal-reason"><em>${escapeHtml(p.reason)}</em></div>` : ''}
        <div class="proposal-actions">
          <label class="proposal-approve-label">
            <input type="checkbox" class="proposal-approve-checkbox" checked>
            Approve this change
          </label>
        </div>
      </div>`).join('')}
  `;

  // Store proposals for later retrieval
  panel.dataset.proposals = JSON.stringify(proposals);

  if (applyBtn) applyBtn.style.display = 'block';
}

/**
 * Collect approved proposals and POST them to /api/cv/apply-content-changes.
 * Updates dirty-phase state and shows the return callout.
 */
async function applyAcceptedProposals() {
  const panel    = document.getElementById('content-proposals-panel');
  const applyBtn = document.getElementById('apply-content-changes-btn');

  const allProposals = JSON.parse(panel?.dataset.proposals || '[]');
  const checkboxes   = panel?.querySelectorAll('.proposal-approve-checkbox') || [];

  const accepted = allProposals.filter((_, i) => checkboxes[i]?.checked);
  if (accepted.length === 0) {
    appendMessage('system', '⚠️ No proposals approved. Tick at least one change to apply.');
    return;
  }

  if (applyBtn) applyBtn.disabled = true;

  try {
    const res = await apiCall('POST', '/api/cv/apply-content-changes', { accepted });
    if (!res?.ok) {
      appendMessage('system', `❌ Failed to apply content changes: ${res?.error || 'Unknown error'}`);
      return;
    }

    stateManager.setDirtyPhases(
      res.dirty_phases || ['generate', 'layout'],
      res.earliest_dirty_step || 'generate',
    );

    appendMessage('assistant', `✅ ${res.applied_count} content change${res.applied_count !== 1 ? 's' : ''} staged. Return to Generate CV to apply them.`);

    // Clear the proposal panel
    if (panel) { panel.innerHTML = ''; panel.style.display = 'none'; panel.dataset.proposals = '[]'; }
    if (applyBtn) applyBtn.style.display = 'none';

    refreshLayoutReviewState();
  } catch (err) {
    appendMessage('system', `❌ Could not apply content changes. Check your connection and try again.`);
  } finally {
    if (applyBtn) applyBtn.disabled = false;
  }
}

/**
 * Show or hide the dirty-phases callout based on stateManager.getDirtyPhases().
 */
function renderDirtyPhasesCallout() {
  const callout = document.getElementById('dirty-phases-callout');
  if (!callout) return;
  const dirty = stateManager.getDirtyPhases();
  callout.style.display = dirty.length > 0 ? 'block' : 'none';
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  initiateLayoutInstructions,
  completeLayoutReview,
  confirmLayoutReview,
  generateFinalOutputs,
  handleLayoutPrimaryAction,
  loadLayoutInstructionHistory,
  renderPreviewOutputStatus,
  renderLayoutPreviewStatus,
  displayLayoutPreview,
  submitLayoutInstruction,
  submitSmartInstruction,
  // helpers exported for unit tests
  showProcessing,
  _showGenStepProgress,
  showConfirmationMessage,
  renderInstructionHistory,
  addToInstructionHistory,
  undoInstruction,
  // content proposal
  submitContentProposal,
  renderContentProposals,
  applyAcceptedProposals,
  renderDirtyPhasesCallout,
};
