// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/summary-review.js
 * Summary-focus selection: AI generation, stored variants, submit decision.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   pendingRecommendations, selectedSummaryKey, _aiGeneratedSummary,
 *   escapeHtml, showToast, switchTab, setLoading
 */

// ── Build summary-focus section ─────────────────────────────────────────────

/**
 * duckflow: {
 *   "id": "summary_ui_build",
 *   "kind": "ui",
 *   "status": "shared",
 *   "handles": ["ui:summary-review.build"],
 *   "calls": ["GET /api/master-fields", "GET /api/status", "ui:summary-review.generate"],
 *   "reads": [
 *     "window:pendingRecommendations",
 *     "response:GET /api/master-fields.professional_summaries",
 *     "response:GET /api/status.professional_summaries",
 *     "state:session_summaries.ai_generated"
 *   ],
 *   "writes": ["dom:#summary-focus-container", "window:selectedSummaryKey"],
 *   "notes": "Builds the summary review UI from master variants plus session overrides and seeds the selected key."
 * }
 */

async function buildSummaryFocusSection() {
  const container = document.getElementById('summary-focus-container');
  if (!container) return;

  const data = window.pendingRecommendations;

  // ── Load all known summaries (master base + session overrides) ───────────
  // Fetch master fields and status in parallel; session summaries overwrite master variants.
  let professionalSummaries = {};
  const [mfResult, statusResult] = await Promise.allSettled([
    fetch('/api/master-fields').then(r => r.json()),
    fetch('/api/status').then(r => r.json()),
  ]);
  if (mfResult.status === 'fulfilled' && mfResult.value && mfResult.value.ok) {
    Object.assign(professionalSummaries, mfResult.value.professional_summaries || {});
  }
  if (statusResult.status === 'fulfilled' && statusResult.value) {
    // Session summaries (e.g. ai_generated) overwrite master variants
    Object.assign(professionalSummaries, statusResult.value.professional_summaries || {});
  }

  // ── Suggested content reordering ─────────────────────────────────────────
  const reorderingText = (data && data.suggested_content_reordering) || '';
  const reorderingHTML = reorderingText
    ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:16px;">
        <strong style="color:#1e40af;">📋 Suggested Content Order:</strong>
        <p style="margin:6px 0 0;color:#1e3a8a;font-size:0.9em;white-space:pre-line;">${escapeHtml(reorderingText)}</p>
       </div>`
    : '';

  // ── Render skeleton while we generate ────────────────────────────────────
  container.innerHTML = `
    ${reorderingHTML}
    <div id="ai-summary-panel" style="border:1px solid #d1fae5;border-radius:8px;padding:16px;margin-bottom:20px;background:#f0fdf4;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <strong style="color:#065f46;">AI-Generated Summary</strong>
        <span id="ai-summary-status" style="font-size:0.8em;color:#6b7280;">Generating…</span>
      </div>
      <div id="ai-summary-text" style="font-size:0.9em;color:#374151;line-height:1.6;min-height:60px;white-space:pre-wrap;">
        <em style="color:#9ca3af;">Generating a tailored summary for this application…</em>
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:0.85em;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Request changes (optional):</label>
        <textarea id="summary-refinement-input" rows="2"
          placeholder="e.g. 'Make it more concise', 'Emphasise my leadership experience', 'Use a more formal tone'…"
          style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #d1d5db;border-radius:4px;font-size:0.85em;resize:vertical;"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
          <button id="ai-regenerate-btn" class="submit-btn" style="font-size:0.85em;padding:6px 14px;"
            onclick="regenerateAISummary()">Regenerate</button>
          <button class="submit-btn" style="font-size:0.85em;padding:6px 14px;background:#10b981;"
            onclick="useAISummary()">Use This Summary</button>
        </div>
      </div>
    </div>
    <div id="summary-stored-section">
      <details style="margin-bottom:8px;">
        <summary style="cursor:pointer;font-size:0.85em;color:#6b7280;user-select:none;">
          Use a stored summary variant instead
        </summary>
        <div id="summary-radios" style="margin-top:10px;"></div>
        <div style="margin-top:8px;">
          <button class="submit-btn" style="font-size:0.85em;padding:6px 14px;"
            onclick="submitSummaryFocusDecision()">Use Selected Stored Summary</button>
        </div>
      </details>
    </div>
    <div class="nav-buttons" style="margin-top:16px;">
      <button class="back-btn" onclick="switchTab('achievements-review')">← Back to Achievements</button>
      <button class="continue-btn" onclick="submitSummaryFocusDecision()">Continue to Publications →</button>
    </div>`;

  // Render stored summaries in the collapsible section
  _renderStoredSummaryRadios(professionalSummaries);

  // ── Auto-generate or load cached AI summary ───────────────────────────────
  const cachedSummary = professionalSummaries['ai_generated'] || '';
  if (cachedSummary) {
    _showAISummary(cachedSummary, '(cached — click Regenerate to refresh)');
    window.selectedSummaryKey = 'ai_generated';
    await saveSummaryFocusToBackend('ai_generated');
  } else {
    await _callGenerateSummary(null, null);
  }
}

// ── Render stored summary radio buttons ─────────────────────────────────────

function _renderStoredSummaryRadios(professionalSummaries) {
  const radiosContainer = document.getElementById('summary-radios');
  if (!radiosContainer) return;
  const masterKeys = Object.keys(professionalSummaries).filter(k => k !== 'ai_generated');
  if (masterKeys.length === 0) {
    radiosContainer.innerHTML = '<p style="color:#9ca3af;font-size:0.85em;">No stored summaries available.</p>';
    return;
  }
  const currentKey = window.selectedSummaryKey || '';
  radiosContainer.innerHTML = masterKeys.map(key => {
    const preview = (professionalSummaries[key] || '').slice(0, 200);
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const checked = key === currentKey ? 'checked' : '';
    return `
      <label style="display:block;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer;${checked ? 'border-color:#10b981;background:#f0fdf4;' : ''}">
        <input type="radio" name="summary_key" value="${escapeHtml(key)}" ${checked}
          onchange="selectSummaryKey('${escapeHtml(key)}')" style="margin-right:8px;">
        <strong>${escapeHtml(label)}</strong>
        <p style="margin:6px 0 0;font-size:0.85em;color:#6b7280;">${escapeHtml(preview)}${preview.length === 200 ? '…' : ''}</p>
      </label>`;
  }).join('');
}

// ── Show AI-generated summary ────────────────────────────────────────────────

function _showAISummary(text, statusLabel) {
  const textEl   = document.getElementById('ai-summary-text');
  const statusEl = document.getElementById('ai-summary-status');
  if (textEl)   textEl.textContent = text;
  if (statusEl) statusEl.textContent = statusLabel || '';
  window._aiGeneratedSummary = text;
}

// ── Call generate-summary API ────────────────────────────────────────────────

/**
 * duckflow: {
 *   "id": "summary_ui_generate",
 *   "kind": "ui",
 *   "status": "shared",
 *   "handles": ["ui:summary-review.generate"],
 *   "calls": ["POST /api/generate-summary", "ui:summary-review.persist"],
 *   "reads": ["response:POST /api/generate-summary.summary", "window:_aiGeneratedSummary"],
 *   "writes": ["dom:#ai-summary-text", "dom:#ai-summary-status", "window:_aiGeneratedSummary", "window:selectedSummaryKey"],
 *   "notes": "Requests a generated or refined summary, updates the local UI, and persists the selected summary key."
 * }
 */

async function _callGenerateSummary(refinementPrompt, previousSummary) {
  const btn      = document.getElementById('ai-regenerate-btn');
  const statusEl = document.getElementById('ai-summary-status');
  const textEl   = document.getElementById('ai-summary-text');
  if (btn)      btn.disabled = true;
  if (statusEl) statusEl.textContent = 'Generating…';
  // Show a prominent spinner inside the summary text area while waiting
  if (textEl)   textEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:#6b7280;padding:8px 0;"><div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div><em>Generating a tailored summary…</em></div>';

  // Use the global LLM status bar for visibility
  setLoading(true, 'Generating summary…');

  try {
    const body = {};
    if (refinementPrompt) body.refinement_prompt = refinementPrompt;
    if (previousSummary)  body.previous_summary  = previousSummary;

    const res  = await fetch('/api/generate-summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (data.ok) {
      _showAISummary(data.summary, '✓ generated');
      window.selectedSummaryKey = 'ai_generated';
      await saveSummaryFocusToBackend('ai_generated');
    } else {
      if (statusEl) statusEl.textContent = '⚠ error';
      if (textEl)   textEl.innerHTML = `<span style="color:#ef4444;">${escapeHtml(data.error || 'Generation failed.')}</span>`;
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = '⚠ network error';
    if (textEl)   textEl.innerHTML = '<span style="color:#ef4444;">Network error — please try again.</span>';
  } finally {
    if (btn) btn.disabled = false;
    setLoading(false);
  }
}

// ── Regenerate / use AI summary ──────────────────────────────────────────────

async function regenerateAISummary() {
  const input   = document.getElementById('summary-refinement-input');
  const prompt  = input ? input.value.trim() : '';
  const current = window._aiGeneratedSummary || '';
  await _callGenerateSummary(prompt || null, current || null);
}

async function useAISummary() {
  window.selectedSummaryKey = 'ai_generated';
  await saveSummaryFocusToBackend('ai_generated');
  showToast('AI-generated summary selected for your CV');
}

// ── Select stored summary key ────────────────────────────────────────────────

function selectSummaryKey(key) {
  window.selectedSummaryKey = key;
  document.querySelectorAll('#summary-radios label').forEach(label => {
    const radio = label.querySelector('input[type=radio]');
    const isSelected = radio && radio.value === key;
    label.style.borderColor = isSelected ? '#10b981' : '#e5e7eb';
    label.style.background  = isSelected ? '#f0fdf4' : '';
  });
}

// ── Save / submit ────────────────────────────────────────────────────────────

/**
 * duckflow: {
 *   "id": "summary_ui_persist",
 *   "kind": "ui",
 *   "status": "shared",
 *   "handles": ["ui:summary-review.persist"],
 *   "calls": ["POST /api/review-decisions"],
 *   "reads": ["window:selectedSummaryKey"],
 *   "writes": ["request:POST /api/review-decisions.summary_focus"],
 *   "notes": "Persists only the selected summary key so backend state can resolve the active summary variant later."
 * }
 */

async function saveSummaryFocusToBackend(key) {
  try {
    await fetch('/api/review-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'summary_focus', decisions: key })
    });
  } catch (e) { /* silent */ }
}

async function submitSummaryFocusDecision() {
  const key = window.selectedSummaryKey;
  if (!key) return;
  await saveSummaryFocusToBackend(key);
  showToast(`Summary selection saved: "${key.replace(/_/g, ' ')}"`);
  switchTab('publications-review');
}

// ── Exports ──────────────────────────────────────────────────────────────────

export {
  buildSummaryFocusSection,
  _renderStoredSummaryRadios,
  _showAISummary,
  _callGenerateSummary,
  regenerateAISummary,
  useAISummary,
  selectSummaryKey,
  saveSummaryFocusToBackend,
  submitSummaryFocusDecision,
};
