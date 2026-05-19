// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/tagline-review.js
 * Applicant tagline (headline) review: display AI-proposed tagline,
 * allow editing, require explicit user confirmation before continuing.
 *
 * The tagline is the one-line professional identity shown under the
 * applicant's name on the CV.  It is NOT the same as the job title —
 * it describes the applicant (e.g. "Senior Data Scientist specialising
 * in biostatistics and ML"), not the role being applied for.
 *
 * User MUST click "Confirm Tagline" before generation is allowed.
 * The confirmed text is stored via POST /api/review-decisions (type: 'tagline').
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, showToast, switchTab, stateManager
 */

import { stateManager } from './state-manager.js';

// ── Build tagline-review section ─────────────────────────────────────────────

/**
 * duckflow:
 *   id: tagline_ui_build
 *   kind: ui
 *   timestamp: "2026-05-28T00:00:00Z"
 *   status: live
 *   handles: ["ui:tagline-review.build"]
 *   reads:
 *     - "window:pendingRecommendations"
 *     - "response:GET /api/status.tagline_override"
 *     - "response:GET /api/status.decisions_confirmed"
 *   writes: ["dom:#tagline-review-container"]
 *   notes: "Renders proposed tagline (from LLM customizations) with an editable input and confirm button."
 */
async function buildTaglineReviewSection() {
  const container = document.getElementById('tagline-review-container');
  if (!container) return;

  // Fetch current status to get tagline_override + proposed tagline
  let proposedTagline  = '';
  let confirmedTagline = '';
  let alreadyConfirmed = false;

  try {
    const res    = await fetch('/api/status');
    const status = res.ok ? await res.json() : {};

    // tagline_override is the user-confirmed value (may be null)
    confirmedTagline = status.tagline_override || '';
    alreadyConfirmed = !!(status.decisions_confirmed && status.decisions_confirmed.tagline);

    // Proposed tagline from the LLM recommendations
    const customizations = status.customizations || {};
    proposedTagline = customizations.applicant_tagline || '';
  } catch (_e) {
    // Network failure — leave fields empty, user can still type manually
  }

  const initial   = confirmedTagline || proposedTagline;
  const statusMsg = alreadyConfirmed
    ? '<span style="color:#065f46;font-weight:600;">✓ Confirmed</span>'
    : '<span style="color:#92400e;">Requires your confirmation before generating</span>';

  container.innerHTML = `
    <div style="margin-bottom:16px;">
      <p style="color:#374151;font-size:0.95em;line-height:1.6;margin:0 0 8px;">
        The <strong>tagline</strong> appears directly under your name on the CV.
        It should describe <em>who you are</em> as a professional — not the job title you are applying for.
      </p>
      <p style="color:#6b7280;font-size:0.85em;margin:0;">
        Example: <em>"Senior Data Scientist specialising in biostatistics and machine learning"</em>
      </p>
    </div>

    <div style="border:1px solid #d1fae5;border-radius:8px;padding:16px;margin-bottom:20px;background:#f0fdf4;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <strong style="color:#065f46;">Applicant Tagline</strong>
        <span id="tagline-confirm-status" style="font-size:0.85em;">${statusMsg}</span>
      </div>

      <label style="font-size:0.85em;font-weight:600;color:#374151;display:block;margin-bottom:4px;"
             for="tagline-input">
        Edit tagline (required):
      </label>
      <input id="tagline-input" type="text"
        value="${escapeHtml(initial)}"
        placeholder="e.g. Senior Data Scientist specialising in biostatistics and ML"
        style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:0.95em;"
        oninput="onTaglineInputChange()" />

      ${proposedTagline && proposedTagline !== confirmedTagline ? `
      <p style="margin:6px 0 0;font-size:0.8em;color:#6b7280;">
        AI proposed: <em>${escapeHtml(proposedTagline)}</em>
        <button onclick="resetTaglineToProposed()" style="background:none;border:none;cursor:pointer;color:#2563eb;font-size:0.8em;padding:0 4px;text-decoration:underline;">Use this</button>
      </p>` : ''}

      <div style="margin-top:12px;">
        <button id="tagline-confirm-btn" class="submit-btn" style="font-size:0.9em;padding:8px 20px;background:#10b981;"
          onclick="confirmTagline()">
          ✓ Confirm Tagline
        </button>
        ${alreadyConfirmed ? '<span id="tagline-confirmed-badge" style="margin-left:10px;font-size:0.85em;color:#065f46;">Saved ✓</span>' : '<span id="tagline-confirmed-badge" style="display:none;margin-left:10px;font-size:0.85em;color:#065f46;">Saved ✓</span>'}
      </div>
    </div>

    <div class="nav-buttons" style="margin-top:16px;">
      <button class="back-btn" onclick="switchTab('achievements-review')">← Back to Achievements</button>
      <button id="tagline-continue-btn" class="continue-btn"
        style="${alreadyConfirmed ? '' : 'opacity:0.5;cursor:not-allowed;'}"
        onclick="taglineContinue()"
        ${alreadyConfirmed ? '' : 'title="Please confirm the tagline before continuing"'}>
        Continue to Summary →
      </button>
    </div>`;

  // Expose proposed tagline for the reset button
  window._proposedTagline = proposedTagline;
}

// ── Input change handler ─────────────────────────────────────────────────────

function onTaglineInputChange() {
  // When user edits the text, un-confirm the previous save so they must re-confirm
  const badge      = document.getElementById('tagline-confirmed-badge');
  const statusSpan = document.getElementById('tagline-confirm-status');
  if (badge)      badge.style.display = 'none';
  if (statusSpan) statusSpan.innerHTML = '<span style="color:#92400e;">Requires your confirmation before generating</span>';
  const continueBtn = document.getElementById('tagline-continue-btn');
  if (continueBtn) {
    continueBtn.style.opacity       = '0.5';
    continueBtn.style.cursor        = 'not-allowed';
    continueBtn.title               = 'Please confirm the tagline before continuing';
  }
}

// ── Reset to AI-proposed tagline ─────────────────────────────────────────────

function resetTaglineToProposed() {
  const input = document.getElementById('tagline-input');
  if (input && window._proposedTagline) {
    input.value = window._proposedTagline;
    onTaglineInputChange();
  }
}

// ── Confirm and persist tagline ──────────────────────────────────────────────

/**
 * duckflow:
 *   id: tagline_ui_confirm
 *   kind: ui
 *   timestamp: "2026-05-28T00:00:00Z"
 *   status: live
 *   handles: ["ui:tagline-review.confirm"]
 *   calls: ["POST /api/review-decisions"]
 *   reads: ["dom:#tagline-input"]
 *   writes:
 *     - "request:POST /api/review-decisions.type=tagline"
 *     - "request:POST /api/review-decisions.decisions"
 *   notes: "POSTs the confirmed tagline text; enables the continue button on success."
 */
async function confirmTagline() {
  const input = document.getElementById('tagline-input');
  if (!input) return;

  const taglineText = input.value.trim();
  if (!taglineText) {
    showToast('Please enter a tagline before confirming.', 'error');
    return;
  }

  const btn = document.getElementById('tagline-confirm-btn');
  if (btn) btn.disabled = true;

  try {
    const response = await fetch('/api/review-decisions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'tagline', decisions: taglineText }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      showToast(`Failed to save tagline: ${err.error || response.statusText}`, 'error');
      return;
    }

    // Update UI to show confirmed state
    const badge      = document.getElementById('tagline-confirmed-badge');
    const statusSpan = document.getElementById('tagline-confirm-status');
    if (badge)      { badge.style.display = ''; }
    if (statusSpan) { statusSpan.innerHTML = '<span style="color:#065f46;font-weight:600;">✓ Confirmed</span>'; }

    const continueBtn = document.getElementById('tagline-continue-btn');
    if (continueBtn) {
      continueBtn.style.opacity = '';
      continueBtn.style.cursor  = '';
      continueBtn.title         = '';
    }

    stateManager.markContentChanged();
    showToast('Tagline confirmed.');
  } catch (e) {
    showToast('Network error saving tagline.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Continue navigation ──────────────────────────────────────────────────────

async function taglineContinue() {
  // Guard: must be confirmed before proceeding
  const continueBtn = document.getElementById('tagline-continue-btn');
  if (continueBtn && continueBtn.style.cursor === 'not-allowed') {
    showToast('Please confirm the tagline before continuing.', 'error');
    return;
  }
  switchTab('summary-review');
}

// ── Exports ──────────────────────────────────────────────────────────────────

export {
  buildTaglineReviewSection,
  onTaglineInputChange,
  resetTaglineToProposed,
  confirmTagline,
  taglineContinue,
};
