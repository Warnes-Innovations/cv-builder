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

let dismissedStaleCalloutRevision = null;

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

    return `
      <div class="preview-output-row ${ok ? 'is-ready' : 'is-failed'}">
        <div class="preview-output-copy">
          <div class="preview-output-title-row">
            ${badgeMarkup}
          </div>
          <div class="preview-output-detail">${escapeHtml(detail)}</div>
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
    .map(issue => `<li>${escapeHtml(issue)}</li>`)
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
  container.innerHTML = `
    <div class="layout-preview-status-card ${freshness.tone}">
      <div class="layout-preview-status-header">
        ${buildLayoutFreshnessChipMarkup(freshness)}
        <span class="layout-preview-status-stage">${escapeHtml(stageLabel)}</span>
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
  const confirmBtn = document.getElementById('confirm-layout-btn');
  const finalBtn = document.getElementById('proceed-to-finalise-btn');

  renderLayoutPreviewStatus();
  renderLayoutStaleCallout();

  if (confirmBtn) {
    confirmBtn.style.display = generationState.previewAvailable && !freshness.isStale && !generationState.layoutConfirmed
      ? 'block'
      : 'none';
  }

  if (finalBtn) {
    finalBtn.style.display = generationState.previewAvailable
      && !freshness.isStale
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
            <iframe id="layout-preview" class="layout-preview-iframe" title="CV Layout Preview" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe>
          </div>
        </div>

        <div class="layout-input-pane">
          <h3>Layout Review</h3>
          <p class="layout-scope-label">💡 Layout changes only — approved text is never modified</p>

          <div id="layout-stale-callout" class="layout-stale-callout" style="display:none;">
            <h4>Layout preview is out of date</h4>
            <p>You changed CV content after the current preview was generated. Regenerate the preview before trusting page count, layout feedback, or final files.</p>
            <div class="layout-stale-callout-actions">
              <button id="regenerate-layout-preview-btn" class="btn btn-warning layout-action-btn">Regenerate preview</button>
              <button id="dismiss-layout-stale-btn" class="btn btn-secondary layout-action-btn">Keep reviewing current preview</button>
            </div>
          </div>

          <div class="preview-output-card">
            <div class="preview-output-card-header">
              <h4>Preview PDFs</h4>
              <span class="preview-output-card-note">Chrome and WeasyPrint render in parallel</span>
            </div>
            <div id="preview-output-status" class="preview-output-status"></div>
          </div>

          <div class="layout-settings-row" style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <label for="base-font-size-input" style="font-size:0.85em; font-weight:600; color:#475569; white-space:nowrap;">Base font size (px):</label>
            <input
              id="base-font-size-input"
              type="number"
              min="6" max="16" step="0.5"
              value="13"
              style="width:60px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9em;"
              title="Controls the root font size for the CV. All rem-based sizes scale with this value."
            />
            <label for="page-margin-input" style="font-size:0.85em; font-weight:600; color:#475569; white-space:nowrap; margin-left:8px;">Page margin (in):</label>
            <input
              id="page-margin-input"
              type="number"
              min="0.5" max="1.5" step="0.05"
              value="0.5"
              style="width:72px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9em;"
              title="Controls the print page margins for all PDF pages."
            />
            <button id="apply-layout-settings-btn" class="btn btn-secondary" style="padding:3px 10px; font-size:0.85em;">Apply</button>
            <span id="layout-settings-status" style="font-size:0.8em; color:#64748b;"></span>
          </div>

          <textarea
            id="instruction-input"
            class="layout-instruction-textarea"
            placeholder="e.g., Move Publications section after Skills&#10;or: Make the Summary section smaller&#10;or: Keep the Genentech entry on one page"
            rows="8"></textarea>

          <button id="apply-instruction-btn" class="btn btn-primary layout-action-btn">
            Apply Layout Changes
          </button>

          <button id="confirm-layout-btn" class="btn btn-success layout-action-btn" style="display:none;">
            Confirm Layout
          </button>

          <div id="processing-indicator" class="processing-indicator" style="display: none;">
            <div class="spinner"></div>
            <p>Applying instruction...</p>
          </div>

          <div id="confirmation-message" class="confirmation-message" style="display: none;"></div>

          <div class="layout-history-section">
            <h4>
              <span class="history-toggle">▼</span>
              Instruction History (<span id="instruction-count">0</span>)
            </h4>
            <div id="instruction-history" class="instruction-history-list"></div>
          </div>

          <button id="proceed-to-finalise-btn" class="btn btn-success layout-action-btn" style="display: none;">
            Generate Final Files
          </button>
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
    if (input) input.value = parseFloat(savedFontSize) || 13;
  }
  const savedPageMargin = stateManager?.getSessionState?.()?.page_margin;
  if (savedPageMargin) {
    const input = document.getElementById('page-margin-input');
    if (input) input.value = parseFloat(savedPageMargin) || 0.5;
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

  if (applySettingsBtn && fontSizeInput && pageMarginInput) {
    applySettingsBtn.addEventListener('click', () => applyLayoutSettings(fontSizeInput.value, pageMarginInput.value));
    fontSizeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyLayoutSettings(fontSizeInput.value, pageMarginInput.value);
    });
    pageMarginInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyLayoutSettings(fontSizeInput.value, pageMarginInput.value);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const instruction = instructionInput.value.trim();
      if (!instruction) {
        appendMessage('system', '⚠️ Please enter a layout instruction before submitting.');
        return;
      }
      submitLayoutInstruction(instruction);
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
}

/**
 * Save layout display settings to session state, then re-render the preview.
 */
async function applyLayoutSettings(fontSizeValue, pageMarginValue) {
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
    });
    if (!saveRes.ok) throw new Error(saveRes.error || 'save failed');

    if (statusEl) statusEl.textContent = 'Re-rendering…';
    const previewRes = await apiCall('POST', '/api/cv/generate-preview', {});
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
    }
    if (statusEl) { statusEl.textContent = '✅ Applied'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ ${err.message}`;
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

  try {
    showProcessing(true);

    // Prefer the session-backed endpoint; it manages HTML server-side.
    let response;
    const genState = stateManager?.getGenerationState?.() || {};
    const useSessionEndpoint = genState.previewAvailable || genState.phase === 'layout_review';

    if (useSessionEndpoint) {
      response = await apiCall('POST', '/api/cv/layout-refine', {
        instruction: instructionText,
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
    appendMessage('system', `❌ Failed to apply layout instruction: ${error.message}`);
  } finally {
    showProcessing(false);
  }
}

/**
 * Fetch the CV HTML preview via the staged generation contract.
 *
 * Strategy depends on the current generation state:
 *
 * - previewAvailable=true AND phase is not confirmed/final_complete:
 *   Fresh render via POST /api/cv/generate-preview (calls markPreviewGenerated).
 *   Falls back to GET /api/layout-html (passive, no state change).
 *
 * - previewAvailable=false OR phase is confirmed/final_complete (passive restore):
 *   Tries GET /api/layout-html first (no state change).
 *   Only falls back to POST /api/cv/generate-preview as recovery when layout-html
 *   fails (e.g. HTML file missing after server restart), and only when not confirmed.
 *   Recovery calls markPreviewGenerated, transitioning phase to layout_review.
 */
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

async function _fetchAndDisplayLayoutPreview() {
  const genState    = stateManager?.getGenerationState?.() || {};
  const isConfirmed = genState.phase === GENERATION_PHASES.CONFIRMED
                   || genState.phase === GENERATION_PHASES.FINAL_COMPLETE;

  // Fresh-render path: backend has a live preview ready and layout is not yet confirmed.
  if (genState.previewAvailable && !isConfirmed) {
    try {
      const data = await apiCall('POST', '/api/cv/generate-preview', {});
      if (data.ok && data.html) {
        displayLayoutPreview(data.html);
        setPreviewHtml(data.html);
        dismissedStaleCalloutRevision = null;
        stateManager?.markPreviewGenerated?.(_buildPreviewPayload(data));
        renderPreviewOutputStatus(data.preview_outputs || null);
        refreshLayoutReviewState();
        return;
      }
    } catch (_e) {
      // fall through to legacy disk read
    }
  }

  // Passive restore path: load stored HTML from disk without touching generation state.
  // Used when previewAvailable=false (idle/confirmed) or as fresh-render fallback.
  try {
    const data = await apiCall('GET', '/api/layout-html');
    if (data.ok && data.html) {
      displayLayoutPreview(data.html);
      setPreviewHtml(data.html);
      refreshLayoutReviewState();
      return;
    }
    log.warn('Layout preview not available:', data.error || 'no HTML returned');
  } catch (_e) {
    // fall through to recovery
  }

  // Recovery path: disk HTML is missing and layout is not yet confirmed.
  // Generate a fresh preview to avoid an empty layout pane.
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
      }
    } catch (err) {
      log.warn('Could not load layout preview:', err);
    }
  }
}

/**
 * Display HTML preview in iframe.
 */
function displayLayoutPreview(html) {
  const preview = document.getElementById('layout-preview');
  if (!preview) return;

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

  historyList.innerHTML = '';
  (window.layoutInstructions || []).forEach((instruction, index) => {
    const entry = document.createElement('div');
    entry.className = 'instruction-history-entry';
    entry.innerHTML = `
      <div class="instruction-time">${instruction.timestamp || ''}</div>
      <div class="instruction-text">${escapeHtml(instruction.instruction_text || '')}</div>
      <div class="instruction-summary"><em>${escapeHtml(instruction.change_summary || '')}</em></div>
      <button class="btn btn-small" onclick="undoInstruction(${index})">
        Undo
      </button>
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
    appendMessage('system', `❌ Failed to regenerate preview: ${error.message}`);
  } finally {
    showProcessing(false);
  }
}

/**
 * Show processing spinner.
 */
function showProcessing(show) {
  const indicator = document.getElementById('processing-indicator');
  if (indicator) {
    indicator.style.display = show ? 'block' : 'none';
  }
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
 * Show inline clarification dialog when LLM needs more info.
 */
function showClarificationDialog(question, originalInstruction) {
  const response = prompt(
    `The system needs clarification:\n\n${question}\n\nYour original: "${originalInstruction}"\n\nPlease clarify:`,
    originalInstruction
  );

  if (response && response !== originalInstruction) {
    submitLayoutInstruction(response);
  }
}

/**
 * Undo a specific instruction (regenerate from prior step).
 */
function undoInstruction(index) {
  if (!window.layoutInstructions || index < 0 || index >= window.layoutInstructions.length) {
    return;
  }

  window.layoutInstructions.splice(index, 1);

  // Regenerate preview from HTML at this point
  // (simplified: in production, would re-apply all prior instructions)
  appendMessage('system', '🔄 Undo not yet implemented — would regenerate from prior state');

  // Update history display
  const historyList = document.getElementById('instruction-history');
  if (historyList) {
    renderInstructionHistory();
  }
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

    const confirmRes = await apiCall('POST', '/api/cv/confirm-layout', {});
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
    appendMessage('system', `❌ Failed to confirm layout: ${error.message}`);
  } finally {
    showProcessing(false);
  }
}

async function advanceLayoutToRefinement() {
  let layoutInstructions = window.layoutInstructions || [];
  if (layoutInstructions.length === 0) {
    layoutInstructions = await loadLayoutInstructionHistory();
    window.layoutInstructions = layoutInstructions;
    renderInstructionHistory();
  }

  const response = await apiCall('POST', '/api/layout-complete', {
    layout_instructions: layoutInstructions,
  });
  if (!response.ok) {
    throw new Error(response.error || 'Failed to advance to final review.');
  }

  stateManager.setPhase('refinement');
  switchTab('download');
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
  try {
    showProcessing(true);

    const freshness = stateManager.getLayoutFreshness();
    const generationState = stateManager.getGenerationState();
    if (freshness.isStale) {
      throw new Error('Preview is outdated. Regenerate the preview before generating final files.');
    }
    if (!generationState.layoutConfirmed && generationState.phase !== 'confirmed') {
      throw new Error('Confirm layout before generating final files.');
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

    await advanceLayoutToRefinement();
    appendMessage('assistant', '✅ Final files generated from the confirmed layout.');
  } catch (error) {
    appendMessage('system', `❌ Failed to generate final files: ${error.message}`);
  } finally {
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
  // helpers exported for unit tests
  showProcessing,
  showConfirmationMessage,
  renderInstructionHistory,
  addToInstructionHistory,
  undoInstruction,
};
