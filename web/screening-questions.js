// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/screening-questions.js
 * Screening questions tab: parse, search, generate, save responses.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, showAlertModal
 */

// ── Module-level state ────────────────────────────────────────────────────────

/** Per-question draft state: { format, experienceIndices, responseText, topicTag, priorResponse } */
const _screeningState = {};

// ── Populate screening tab ────────────────────────────────────────────────────

async function populateScreeningTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:20px 10px;">
      <h2 style="font-size:1.3em;font-weight:700;margin-bottom:8px;">📋 Screening Questions</h2>
      <p class="sc-intro">Paste one or more screening questions below — one per line, or separated by blank lines. Click <strong>Parse Questions</strong> to generate tailored draft responses.</p>
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:20px;">
        <textarea id="sc-input" rows="6" style="flex:1;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.93em;resize:vertical;" placeholder="Paste screening questions here…&#10;&#10;E.g.&#10;Describe a time you led a cross-functional project.&#10;&#10;How do you handle tight deadlines?"></textarea>
        <button class="btn btn-primary" onclick="parseScreeningQuestions()">Parse Questions</button>
      </div>
      <div id="sc-questions-container"></div>
      <div class="sc-save-bar" id="sc-save-bar" style="display:none;">
        <button class="btn btn-success" id="sc-save-btn" onclick="saveScreeningResponses()">💾 Save All Responses</button>
      </div>
    </div>`;
}

// ── Parse questions ───────────────────────────────────────────────────────────

function parseScreeningQuestions() {
  const raw = (document.getElementById('sc-input')?.value || '').trim();
  if (!raw) { showAlertModal('⚠️ No Input', 'Please paste at least one screening question first.'); return; }

  // Split on blank lines (preferred) or numbered list patterns; filter empty results
  let questions = raw.split(/\n\s*\n+/).map(q => q.trim()).filter(Boolean);
  if (questions.length === 1) {
    // Try numbered patterns like "1. " or "1) " or "Q1:" without requiring space after
    const numbered = raw.split(/\n(?=\d+[.\)]\s*(?=[A-Z])|Q\d+[:\.]?\s*(?=[A-Z]))/)
      .map(q => q.trim())
      .filter(Boolean);
    if (numbered.length > 1) questions = numbered;
  }
  if (questions.length === 1) {
    // Last resort: split on any single newline if we still have just one "question"
    const singleLine = raw.split(/\n+/).map(q => q.trim()).filter(q => q.length > 0);
    if (singleLine.length > 1) questions = singleLine;
  }

  const container = document.getElementById('sc-questions-container');
  container.innerHTML = questions.map((q, i) => renderQuestionBlock(q, i)).join('');
  document.getElementById('sc-save-bar').style.display = questions.length ? '' : 'none';

  // Kick off searches in parallel
  questions.forEach((q, i) => searchForQuestion(q, i));
}

// ── Render question block ─────────────────────────────────────────────────────

function renderQuestionBlock(question, idx) {
  return `
    <div class="sc-question-block" id="sc-block-${idx}" data-question="${escapeHtml(question)}">
      <div class="sc-question-header">
        <span class="sc-question-num">${idx + 1}</span>
        <span>${escapeHtml(question)}</span>
      </div>
      <div class="sc-question-body">
        <div id="sc-prior-${idx}"><em style="color:#94a3b8;font-size:0.87em;">Searching response library…</em></div>
        <div id="sc-exp-${idx}"></div>
        <div class="sc-format-row" id="sc-fmt-${idx}">
          <span style="font-size:0.85em;font-weight:600;color:#374151;align-self:center;">Format:</span>
          ${['direct','star','technical'].map(f => `
            <button class="sc-format-btn${f === 'direct' ? ' active' : ''}" data-fmt="${f}" onclick="selectFormat(${idx},'${f}',this)">${_fmtLabel(f)}</button>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" id="sc-gen-btn-${idx}" onclick="generateScreeningResponse(${idx})">✨ Generate Draft</button>
        <div id="sc-result-${idx}" style="margin-top:12px;"></div>
        <div class="sc-topic-row" id="sc-topic-row-${idx}" style="display:none;">
          <label for="sc-topic-${idx}">Topic tag:</label>
          <input class="sc-topic-input" id="sc-topic-${idx}" type="text" placeholder="e.g. leadership, cross-functional, deadline-management">
        </div>
      </div>
    </div>`;
}

function _fmtLabel(fmt) {
  return { direct: 'Direct/Concise (150–200w)', star: 'STAR (250–350w)', technical: 'Technical Detail (400–500w)' }[fmt] || fmt;
}

// ── Format selection ──────────────────────────────────────────────────────────

function selectFormat(idx, fmt, btn) {
  document.querySelectorAll(`#sc-fmt-${idx} .sc-format-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!_screeningState[idx]) _screeningState[idx] = {};
  _screeningState[idx].format = fmt;
}

function _getSelectedFormat(idx) {
  const active = document.querySelector(`#sc-fmt-${idx} .sc-format-btn.active`);
  return active ? active.getAttribute('data-fmt') : 'direct';
}

// ── Search for prior responses ────────────────────────────────────────────────

async function searchForQuestion(question, idx) {
  try {
    const res  = await fetch('/api/screening/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!data.ok) { document.getElementById(`sc-prior-${idx}`).innerHTML = ''; return; }

    // Render prior match
    const priorEl = document.getElementById(`sc-prior-${idx}`);
    if (data.prior) {
      const p = data.prior;
      priorEl.innerHTML = `
        <div class="sc-prior-match">
          <strong>📚 Similar prior response found</strong> — ${escapeHtml(p.company || '')} (${escapeHtml(p.date || '')})<br>
          <em style="color:#78350f;">"${escapeHtml((p.question || '').substring(0, 120))}…"</em>
          <div style="margin-top:6px;">
            <label style="font-size:0.85em;">
              <input type="checkbox" id="sc-use-prior-${idx}" onchange="togglePriorUse(${idx})"> Use as starting point
            </label>
          </div>
        </div>`;
      if (!_screeningState[idx]) _screeningState[idx] = {};
      _screeningState[idx].priorResponse = p.response_text || '';
    } else {
      priorEl.innerHTML = '';
    }

    // Render experience cards
    const expEl = document.getElementById(`sc-exp-${idx}`);
    if (data.experiences && data.experiences.length) {
      const cards = data.experiences.map(e => `
        <label class="sc-exp-card">
          <input type="checkbox" data-idx="${e.idx}" checked onchange="updateExpSelection(${idx})">
          <div style="flex:1;">
            <strong>${escapeHtml(e.title)}</strong> · ${escapeHtml(e.company)}
            <span class="sc-score-badge">${Math.round(e.score * 100)}% match</span>
            <div style="color:#64748b;margin-top:2px;">${escapeHtml(e.summary)}</div>
          </div>
        </label>`).join('');
      expEl.innerHTML = `<p style="font-size:0.85em;font-weight:600;color:#374151;margin-bottom:6px;">Relevant experience:</p>
        <div class="sc-exp-list">${cards}</div>`;
      if (!_screeningState[idx]) _screeningState[idx] = {};
      _screeningState[idx].experienceIndices = data.experiences.map(e => e.idx);
    } else {
      expEl.innerHTML = '';
    }
  } catch (_) {
    document.getElementById(`sc-prior-${idx}`).innerHTML = '';
  }
}

// ── Toggle prior use ──────────────────────────────────────────────────────────

function togglePriorUse(idx) {
  const cb = document.getElementById(`sc-use-prior-${idx}`);
  if (!_screeningState[idx]) _screeningState[idx] = {};
  _screeningState[idx].usePrior = cb?.checked ?? false;
}

function updateExpSelection(idx) {
  const block     = document.getElementById(`sc-block-${idx}`);
  const checked   = Array.from(block.querySelectorAll('input[type=checkbox][data-idx]'))
    .filter(cb => cb.checked)
    .map(cb => parseInt(cb.getAttribute('data-idx'), 10));
  if (!_screeningState[idx]) _screeningState[idx] = {};
  _screeningState[idx].experienceIndices = checked;
}

// ── Generate screening response ───────────────────────────────────────────────

async function generateScreeningResponse(idx) {
  const btn      = document.getElementById(`sc-gen-btn-${idx}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating…'; }

  const question = document.getElementById(`sc-block-${idx}`)?.dataset.question || '';
  const state    = _screeningState[idx] || {};
  const fmt      = _getSelectedFormat(idx);
  const prior    = (state.usePrior && state.priorResponse) ? state.priorResponse : '';
  const expIdx   = state.experienceIndices ?? [];

  try {
    const res  = await fetch('/api/screening/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        question,
        format:              fmt,
        experience_indices:  expIdx,
        prior_response:      prior,
      }),
    });
    const data = await res.json();
    if (!data.ok) { showAlertModal('❌ Error', data.error || 'Generation failed.'); return; }

    if (!_screeningState[idx]) _screeningState[idx] = {};
    _screeningState[idx].responseText = data.text;
    _screeningState[idx].format       = fmt;

    document.getElementById(`sc-result-${idx}`).innerHTML = `
      <textarea class="sc-response-textarea" id="sc-text-${idx}" rows="7"
        oninput="_screeningState[${idx}] = _screeningState[${idx}] || {}; _screeningState[${idx}].responseText = this.value;"
      >${escapeHtml(data.text)}</textarea>`;
    document.getElementById(`sc-topic-row-${idx}`).style.display = '';
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Draft'; }
  }
}

// ── Save responses ────────────────────────────────────────────────────────────

async function saveScreeningResponses() {
  const btn = document.getElementById('sc-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }

  const responses = [];
  document.querySelectorAll('.sc-question-block').forEach((block, i) => {
    const qEl    = block.querySelector('.sc-question-header span:last-child');
    const textEl = document.getElementById(`sc-text-${i}`);
    const topicEl = document.getElementById(`sc-topic-${i}`);
    if (!textEl) return; // not yet generated — skip

    const question     = qEl ? qEl.textContent.trim() : '';
    const responseText = (_screeningState[i]?.responseText) || textEl.value || '';
    const fmt          = _getSelectedFormat(i);
    const topicTag     = topicEl ? topicEl.value.trim() : '';

    responses.push({ question, topic_tag: topicTag, format: fmt, response_text: responseText });
  });

  if (!responses.length) {
    showAlertModal('⚠️ Nothing to Save', 'Please generate at least one response before saving.');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save All Responses'; }
    return;
  }

  try {
    const res  = await fetch('/api/screening/save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ responses }),
    });
    const data = await res.json();
    if (data.ok) {
      showAlertModal('✅ Saved', `${data.count} response${data.count !== 1 ? 's' : ''} saved as <strong>${escapeHtml(data.filename)}</strong> and added to your response library.`);
    } else {
      showAlertModal('❌ Save Failed', data.error || 'Could not save responses.');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to contact server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save All Responses'; }
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  _screeningState,
  populateScreeningTab,
  parseScreeningQuestions,
  renderQuestionBlock,
  _fmtLabel,
  selectFormat,
  _getSelectedFormat,
  searchForQuestion,
  togglePriorUse,
  updateExpSelection,
  generateScreeningResponse,
  saveScreeningResponses,
};
