// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/interview-prep.js
 * Interview Preparation phase — generate, render, and edit AI interview questions.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, showAlertModal, handleStepClick, appendMessage
 */

import { maybeShowLlmDisclosure } from './api-client.js';
import { getLogger } from './logger.js';
const log = getLogger('interview-prep');

// ── Module-level state (survives tab navigation) ──────────────────────────────

let _interviewPrepQuestions = [];
let _interviewPrepVisible   = false;

function _resetInterviewPrepState() {
  _interviewPrepQuestions = [];
  _interviewPrepVisible   = false;
}

// ── Populate Interview Prep tab ────────────────────────────────────────────────

async function populateInterviewPrepTab() {
  const content = document.getElementById('document-content');
  if (!content) return;

  content.innerHTML = `
    <div style="max-width:860px;margin:0 auto;padding:24px 16px;">
      <h2 style="font-size:1.3em;font-weight:700;margin-bottom:8px;">🎤 Interview Preparation</h2>
      <p style="color:#6b7280;margin-bottom:20px;">
        AI-generated interview questions, why each one matters, and how to answer it —
        tailored to this job and your CV. Generate, then edit or add notes before your interview.
      </p>

      <div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;">
        <button class="btn-primary" id="ip-generate-btn" onclick="generateInterviewPrep()">
          ✨ Generate Interview Prep
        </button>
        <span id="ip-status" style="color:#94a3b8;font-size:0.85em;"></span>
      </div>

      <div id="ip-questions-container"></div>

      <div class="nav-buttons nav-end" style="margin-top:28px;">
        <button class="continue-btn" onclick="handleStepClick('thank_you')">
          Proceed to Thank You Letter →
        </button>
      </div>
    </div>`;

  // Restore previously generated questions across tab navigation.
  if (_interviewPrepVisible && _interviewPrepQuestions.length) {
    _renderQuestions(_interviewPrepQuestions);
  }
  log.debug('Interview prep tab rendered');
}

// ── Generate interview prep ────────────────────────────────────────────────────

async function generateInterviewPrep() {
  /* duckflow:
   *   id: interview_prep_ui_generate_live
   *   kind: ui
   *   timestamp: '2026-08-29T00:00:00Z'
   *   status: live
   *   handles:
   *   - ui:interview-prep.generate
   *   calls:
   *   - POST /api/interview-prep/generate
   *   writes:
   *   - request:POST /api/interview-prep/generate
   *   - window:_interviewPrepQuestions
   *   - dom:#ip-questions-container
   *   notes: Requests 10 tailored interview-prep questions from the backend, then renders them with editable hint/note fields.
   */
  maybeShowLlmDisclosure(); // GAP-374: fire disclosure on first LLM use per provider

  const btn    = document.getElementById('ip-generate-btn');
  const status = document.getElementById('ip-status');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating interview prep…'; }
  if (status) status.textContent = '';

  try {
    const res  = await fetch('/api/interview-prep/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    });
    const data = await res.json();
    if (!data.ok) {
      showAlertModal('❌ Generation Failed', data.error || 'Could not generate interview prep.');
      log.warn('interview prep generate failed', data.error);
      return;
    }

    _interviewPrepQuestions = Array.isArray(data.questions) ? data.questions : [];
    _interviewPrepVisible   = true;
    _renderQuestions(_interviewPrepQuestions);
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Interview Prep'; }
  }
}

function _renderQuestions(questions) {
  const container = document.getElementById('ip-questions-container');
  if (!container) return;
  if (!questions.length) {
    container.innerHTML = '<p style="color:#6b7280;">No questions generated yet — click <strong>Generate Interview Prep</strong> to begin.</p>';
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:0.9em;color:#374151;font-weight:600;">${questions.length} tailored questions</span>
      <button class="action-btn" onclick="generateInterviewPrep()" title="Regenerate questions">🔄 Regenerate</button>
    </div>
    ${questions.map((q, i) => `
      <div class="sc-question-block" id="ip-q-${i}" style="margin-bottom:14px;">
        <div class="sc-question-header">
          <span class="sc-question-num">${i + 1}</span>
          <span>${escapeHtml(q.question)}</span>
        </div>
        <div class="sc-question-body">
          <div style="margin-bottom:8px;">
            <span style="font-size:0.82em;font-weight:600;color:#374151;">Why it matters:</span>
            <div style="color:#475569;font-size:0.9em;margin-top:2px;">${escapeHtml(q.rationale || '')}</div>
          </div>
          <div style="margin-bottom:8px;">
            <span style="font-size:0.82em;font-weight:600;color:#374151;">Preparation hint:</span>
            <textarea class="sc-response-textarea" id="ip-hint-${i}" rows="2" style="margin-top:4px;"
              oninput="updateInterviewPrepHint(${i}, this.value)"
              placeholder="Add your preparation notes or a STAR story here…">${escapeHtml(q.hint || '')}</textarea>
          </div>
        </div>
      </div>`).join('')}`;
}

// ── Exports ───────────────────────────────────────────────────────────────────

function updateInterviewPrepHint(index, value) {
  if (!Number.isInteger(index) || index < 0 || index >= _interviewPrepQuestions.length) return;
  _interviewPrepQuestions[index] = _interviewPrepQuestions[index] || {};
  _interviewPrepQuestions[index].hint = value || '';
}

export {
  _interviewPrepQuestions,
  _interviewPrepVisible,
  _resetInterviewPrepState,
  populateInterviewPrepTab,
  generateInterviewPrep,
  _renderQuestions,
  updateInterviewPrepHint,
};
