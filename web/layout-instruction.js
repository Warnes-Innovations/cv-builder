/**
 * layout-instruction.js
 * Frontend UI for natural-language layout instruction workflow.
 * Handles instruction submission, preview updates, and instruction history.
 */

import { apiCall } from './api-client.js';
import { stateManager } from './state-manager.js';

/**
 * Initialize layout instruction UI and event handlers.
 * Called when layout tab is activated.
 */
function initiateLayoutInstructions() {
  const instructionTab = document.getElementById('document-content');
  if (!instructionTab) return;

  // Create two-column layout if it doesn't exist
  if (!instructionTab.querySelector('.layout-instruction-panel')) {
    instructionTab.innerHTML = `
      <div class="layout-instruction-panel">
        <div class="layout-preview-pane">
          <h3>Current Layout Preview</h3>
          <div class="preview-iframe-container">
            <iframe id="layout-preview" class="layout-preview-iframe" title="CV Layout Preview"></iframe>
          </div>
        </div>

        <div class="layout-input-pane">
          <h3>Layout Instructions</h3>
          <p class="layout-scope-label">💡 Layout changes only — approved text is never modified</p>

          <textarea
            id="instruction-input"
            class="layout-instruction-textarea"
            placeholder="e.g., Move Publications section after Skills&#10;or: Make the Summary section smaller&#10;or: Keep the Genentech entry on one page"
            rows="8"></textarea>

          <button id="apply-instruction-btn" class="btn btn-primary layout-action-btn">
            Apply Instruction
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
            Proceed to Final Generation
          </button>
        </div>
      </div>
    `;

    // Wire up event listeners
    setupLayoutInstructionListeners();
  }

  // Load and display current HTML preview via the staged generation contract.
  // /api/cv/generate-preview generates fresh HTML and stores it in session state.
  // Fall back to the legacy /api/layout-html endpoint if the session has no
  // customization data yet (e.g. session restored after full generation).
  const cachedHtml = window.tabData?.cv?.['*.html'] || '';
  if (cachedHtml) {
    displayLayoutPreview(cachedHtml);
  } else {
    _fetchAndDisplayLayoutPreview();
  }

  // Restore any prior instructions from session
  restoreInstructionHistory();
}

/**
 * Set up event listeners for layout instruction UI.
 */
function setupLayoutInstructionListeners() {
  const applyBtn = document.getElementById('apply-instruction-btn');
  const proceedBtn = document.getElementById('proceed-to-finalise-btn');
  const instructionInput = document.getElementById('instruction-input');
  const historyToggle = document.querySelector('.history-toggle');

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

  if (proceedBtn) {
    proceedBtn.addEventListener('click', completeLayoutReview);
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
 * Submit layout instruction to backend for processing.
 *
 * Uses POST /api/cv/layout-refine (staged generation contract) when a
 * session-stored preview is available.  Falls back to the legacy
 * POST /api/layout-instruction endpoint (which requires the HTML in the
 * request body) when no session preview exists.
 */
async function submitLayoutInstruction(instructionText) {
  const currentHtml = window.tabData?.cv?.['*.html'] || '';
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
        let errorHtml = `⚠️ Error: ${htmlEscape(response.error)} — ${htmlEscape(response.details || '')}`;
        if (response.raw_response !== undefined) {
          errorHtml += `<br><details style="margin-top:6px"><summary style="cursor:pointer;font-size:0.85em;color:#64748b">Raw LLM response</summary><pre style="font-size:0.75em;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-top:4px">${htmlEscape(response.raw_response || '(empty)')}</pre></details>`;
        }
        appendMessageHtml('system', errorHtml);
      }
      return;
    }

    // Update preview with new HTML
    const newHtml = response.html;
    displayLayoutPreview(newHtml);

    // Update state
    window.tabData.cv['*.html'] = newHtml;

    // Add to instruction history
    const instruction = {
      timestamp: new Date().toLocaleTimeString(),
      instruction_text: instructionText,
      change_summary: response.summary,
      confirmation: true
    };
    addToInstructionHistory(instruction);

    // Show confirmation
    showConfirmationMessage(`✅ ${response.summary}`);

    // Clear input and show proceed button
    document.getElementById('instruction-input').value = '';
    document.getElementById('proceed-to-finalise-btn').style.display = 'block';

  } catch (error) {
    appendMessage('system', `❌ Failed to apply layout instruction: ${error.message}`);
  } finally {
    showProcessing(false);
  }
}

/**
 * Fetch the CV HTML preview via the staged generation contract.
 *
 * First tries POST /api/cv/generate-preview (renders fresh HTML from current
 * session state and stores it).  Falls back to GET /api/layout-html (legacy
 * endpoint that reads the most recent HTML file from disk) when the session
 * does not yet have customization data.
 */
async function _fetchAndDisplayLayoutPreview() {
  // Try staged generation endpoint first
  try {
    const data = await apiCall('POST', '/api/cv/generate-preview', {});
    if (data.ok && data.html) {
      displayLayoutPreview(data.html);
      if (!window.tabData) window.tabData = {};
      if (!window.tabData.cv || typeof window.tabData.cv !== 'object') {
        window.tabData.cv = {};
      }
      window.tabData.cv['*.html'] = data.html;
      return;
    }
  } catch (_e) {
    // fall through to legacy endpoint
  }

  // Legacy fallback: load HTML from the output directory on disk
  try {
    const data = await apiCall('GET', '/api/layout-html');
    if (data.ok && data.html) {
      displayLayoutPreview(data.html);
      if (!window.tabData) window.tabData = {};
      if (!window.tabData.cv || typeof window.tabData.cv !== 'object') {
        window.tabData.cv = {};
      }
      window.tabData.cv['*.html'] = data.html;
    } else {
      console.warn('Layout preview not available:', data.error || 'no HTML returned');
    }
  } catch (err) {
    console.warn('Could not load layout preview:', err);
  }
}

/**
 * Display HTML preview in iframe.
 */
function displayLayoutPreview(html) {
  const preview = document.getElementById('layout-preview');
  if (!preview) return;

  preview.onload = () => fitLayoutPreviewToPane(preview);

  // Set iframe content safely
  const doc = preview.contentDocument || preview.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
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

  window.layoutInstructions.push(instruction);
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
      <div class="instruction-text">${htmlEscape(instruction.instruction_text || '')}</div>
      <div class="instruction-summary"><em>${htmlEscape(instruction.change_summary || '')}</em></div>
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
function restoreInstructionHistory() {
  renderInstructionHistory();

  // Show proceed button if any instructions applied
  const instructions = window.layoutInstructions || [];
  if (instructions.length > 0) {
    document.getElementById('proceed-to-finalise-btn').style.display = 'block';
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

/**
 * Complete layout review: confirm layout via staged generation contract,
 * trigger final PDF/DOCX generation from the confirmed HTML, then advance
 * the conversation phase via the legacy /api/layout-complete endpoint.
 */
async function completeLayoutReview() {
  try {
    showProcessing(true);

    // Confirm layout and generate final outputs when staged flow is active (GAP-20).
    const genState = stateManager?.getGenerationState?.() || {};
    if (genState.previewAvailable || genState.phase === 'layout_review') {
      try {
        await apiCall('POST', '/api/cv/confirm-layout', {});
      } catch (_e) {
        // non-fatal: continue to final generation attempt
      }

      // Produce final PDF/DOCX from the confirmed HTML.
      try {
        const finalRes = await apiCall('POST', '/api/cv/generate-final', {});
        if (finalRes && finalRes.ok && finalRes.outputs) {
          if (!window.tabData) window.tabData = {};
          window.tabData.cv = finalRes.outputs;
          stateManager?.setGenerationState?.({ phase: 'final_complete' });
        }
      } catch (_e) {
        // non-fatal: legacy outputs remain available for download
      }

      // Refresh ATS badge after final generation (GAP-21).
      if (typeof scheduleAtsRefresh === 'function') {
        scheduleAtsRefresh('post_generation');
      }
    }

    const response = await apiCall('POST', '/api/layout-complete', {
      layout_instructions: window.layoutInstructions || []
    });

    if (!response.ok) {
      appendMessage('system', `❌ Error: ${response.error}`);
      return;
    }

    appendMessage('assistant', '✅ Layout confirmed and final output generated.');

    // Update phase and switch to download/generation tab
    stateManager.setPhase('refinement');
    switchTab('download');

  } catch (error) {
    appendMessage('system', `❌ Failed to complete layout review: ${error.message}`);
  } finally {
    showProcessing(false);
  }
}

// ── ES module exports ──────────────────────────────────────────────────────
export {
  initiateLayoutInstructions,
  completeLayoutReview,
  // helpers exported for unit tests
  showProcessing,
  showConfirmationMessage,
  renderInstructionHistory,
  addToInstructionHistory,
  undoInstruction,
};
